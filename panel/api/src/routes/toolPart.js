import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { query, exec, withTransaction } from '../db.js';
import { auditLog } from '../services/audit.js';

const router = Router();
router.use(authMiddleware);

// GET /stats - Lấy thống kê part & flag_bag
router.get('/stats', async (req, res) => {
  try {
    let totalParts = 0;
    let minPartId = 0;
    let maxPartId = 0;
    let totalFlagBag = 0;
    let minFlagBagId = 0;
    let maxFlagBagId = 0;

    try {
      const partRows = await query('SELECT COUNT(*) AS total, MIN(id) AS min_id, MAX(id) AS max_id FROM `part`');
      if (partRows && partRows.length > 0) {
        totalParts = Number(partRows[0].total || 0);
        minPartId = Number(partRows[0].min_id || 0);
        maxPartId = Number(partRows[0].max_id || 0);
      }
    } catch (e) {
      console.warn('[ToolPart] Error reading part table:', e.message);
    }

    try {
      const flagRows = await query('SELECT COUNT(*) AS total, MIN(id) AS min_id, MAX(id) AS max_id FROM `flag_bag`');
      if (flagRows && flagRows.length > 0) {
        totalFlagBag = Number(flagRows[0].total || 0);
        minFlagBagId = Number(flagRows[0].min_id || 0);
        maxFlagBagId = Number(flagRows[0].max_id || 0);
      }
    } catch (e) {
      console.warn('[ToolPart] Error reading flag_bag table:', e.message);
    }

    res.json({
      ok: true,
      data: {
        totalParts,
        minPartId,
        maxPartId,
        totalFlagBag,
        minFlagBagId,
        maxFlagBagId,
      },
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /records - Tra cứu danh sách records trong DB
router.get('/records', async (req, res) => {
  try {
    const table = req.query.table === 'flag_bag' ? 'flag_bag' : 'part';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;
    const search = String(req.query.search || '').trim();

    const whereConditions = [];
    const params = [];

    if (search !== '') {
      const rangeMatch = search.match(/^(\d+)\s*[-~]\s*(\d+)$/);
      if (rangeMatch) {
        let start = parseInt(rangeMatch[1], 10);
        let end = parseInt(rangeMatch[2], 10);
        if (start > end) {
          const tmp = start;
          start = end;
          end = tmp;
        }
        whereConditions.push('id BETWEEN ? AND ?');
        params.push(start, end);
      } else if (/^\d+$/.test(search)) {
        whereConditions.push('id = ?');
        params.push(parseInt(search, 10));
      } else {
        if (table === 'flag_bag') {
          whereConditions.push('(NAME LIKE ? OR icon_data LIKE ?)');
          params.push(`%${search}%`, `%${search}%`);
        } else {
          whereConditions.push('DATA LIKE ?');
          params.push(`%${search}%`);
        }
      }
    }

    const whereSql = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countRows = await query(`SELECT COUNT(*) AS total FROM \`${table}\` ${whereSql}`, params);
    const total = Number(countRows[0]?.total || 0);

    let rows = [];
    if (table === 'flag_bag') {
      rows = await query(
        `SELECT id, icon_data, NAME, gold, gem, icon_id FROM \`flag_bag\` ${whereSql} ORDER BY id ASC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );
    } else {
      rows = await query(
        `SELECT id, TYPE, DATA FROM \`part\` ${whereSql} ORDER BY id ASC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );
    }

    res.json({
      ok: true,
      data: {
        table,
        records: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// POST /insert-batch - Nạp danh sách ô vào database SIÊU TỐC bằng Bulk Query
router.post('/insert-batch', async (req, res) => {
  try {
    const table = req.body.table === 'flag_bag' ? 'flag_bag' : 'part';
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const onConflict = req.body.onConflict === 'overwrite' ? 'overwrite' : 'skip';

    if (items.length === 0) {
      return res.status(400).json({ ok: false, error: 'Danh sách ô nạp không được trống!' });
    }

    if (items.length > 10000) {
      return res.status(400).json({ ok: false, error: 'Mỗi lần nạp tối đa 10,000 ô để đảm bảo an toàn!' });
    }

    const result = await withTransaction(async (conn) => {
      let insertedOrUpdated = 0;
      const CHUNK_SIZE = 250;

      if (table === 'flag_bag') {
        const validItems = items
          .map((item) => {
            const id = parseInt(item.id, 10);
            if (isNaN(id)) return null;
            return {
              id,
              icon_data: String(item.icon_data ?? '0, 0'),
              name: String(item.name ?? item.NAME ?? 'flag_bag'),
              gold: parseInt(item.gold ?? -1, 10),
              gem: parseInt(item.gem ?? -1, 10),
              icon_id: parseInt(item.icon_id ?? 0, 10),
            };
          })
          .filter(Boolean);

        for (let i = 0; i < validItems.length; i += CHUNK_SIZE) {
          const chunk = validItems.slice(i, i + CHUNK_SIZE);
          const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
          const values = [];
          chunk.forEach((item) => {
            values.push(item.id, item.icon_data, item.name, item.gold, item.gem, item.icon_id);
          });

          if (onConflict === 'overwrite') {
            const sql = `
              INSERT INTO \`flag_bag\` (\`id\`, \`icon_data\`, \`NAME\`, \`gold\`, \`gem\`, \`icon_id\`)
              VALUES ${placeholders}
              ON DUPLICATE KEY UPDATE
                \`icon_data\` = VALUES(\`icon_data\`),
                \`NAME\` = VALUES(\`NAME\`),
                \`gold\` = VALUES(\`gold\`),
                \`gem\` = VALUES(\`gem\`),
                \`icon_id\` = VALUES(\`icon_id\`)
            `;
            const [res] = await conn.execute(sql, values);
            insertedOrUpdated += res.affectedRows || chunk.length;
          } else {
            const sql = `
              INSERT IGNORE INTO \`flag_bag\` (\`id\`, \`icon_data\`, \`NAME\`, \`gold\`, \`gem\`, \`icon_id\`)
              VALUES ${placeholders}
            `;
            const [res] = await conn.execute(sql, values);
            insertedOrUpdated += res.affectedRows || 0;
          }
        }
      } else {
        const validItems = items
          .map((item) => {
            const id = parseInt(item.id, 10);
            if (isNaN(id)) return null;
            return {
              id,
              type: parseInt(item.type ?? item.TYPE ?? 0, 10),
              data: String(item.data ?? item.DATA ?? ''),
            };
          })
          .filter(Boolean);

        for (let i = 0; i < validItems.length; i += CHUNK_SIZE) {
          const chunk = validItems.slice(i, i + CHUNK_SIZE);
          const placeholders = chunk.map(() => '(?, ?, ?)').join(', ');
          const values = [];
          chunk.forEach((item) => {
            values.push(item.id, item.type, item.data);
          });

          if (onConflict === 'overwrite') {
            const sql = `
              INSERT INTO \`part\` (\`id\`, \`TYPE\`, \`DATA\`)
              VALUES ${placeholders}
              ON DUPLICATE KEY UPDATE
                \`TYPE\` = VALUES(\`TYPE\`),
                \`DATA\` = VALUES(\`DATA\`)
            `;
            const [res] = await conn.execute(sql, values);
            insertedOrUpdated += res.affectedRows || chunk.length;
          } else {
            const sql = `
              INSERT IGNORE INTO \`part\` (\`id\`, \`TYPE\`, \`DATA\`)
              VALUES ${placeholders}
            `;
            const [res] = await conn.execute(sql, values);
            insertedOrUpdated += res.affectedRows || 0;
          }
        }
      }

      return { total: items.length, affected: insertedOrUpdated };
    });

    try {
      await auditLog({
        userId: req.user?.id,
        username: req.user?.username,
        action: `tool_part_batch_${table}`,
        detail: `Batch import ${items.length} items into table ${table} (mode: ${onConflict})`,
      });
    } catch (e) {
      console.warn('[ToolPart] Audit log error:', e.message);
    }

    res.json({
      ok: true,
      data: {
        table,
        message: `Đã xử lý thành công ${result.total} ô vào bảng ${table} trong tích tắc!`,
        ...result,
      },
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;
