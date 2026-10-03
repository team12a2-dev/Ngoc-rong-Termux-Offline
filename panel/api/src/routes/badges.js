import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { query, exec, withTransaction } from '../db.js';
import { getDefaultServerId } from '../services/serverRegistry.js';
import { auditLog } from '../services/audit.js';
import { enrichOption, OPTION_CATEGORIES } from '../services/itemOptionCatalog.js';
import { getGameDataPath } from '../services/gameAssets.js';

const router = Router();
router.use(authMiddleware);

function serverIdFrom(req) {
  return Number(req.body?.serverId || req.query?.serverId || 0);
}

async function resolvedServerId(requested) {
  return Number(requested || await getDefaultServerId());
}

function parseJsonSafe(val, fallback = []) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

/**
 * Sinh file nhị phân DataEffect chuẩn NRO
 */
function generateDataEffectBinary({ smallImages, frames, animSequence }) {
  const chunks = [];
  
  // 1. numSmallImage
  const b1 = Buffer.alloc(1);
  b1.writeUInt8(smallImages.length, 0);
  chunks.push(b1);

  // 2. smallImages (id, x, y, w, h)
  for (const sm of smallImages) {
    const b = Buffer.alloc(5);
    b.writeUInt8(sm.id, 0);
    b.writeUInt8(sm.x, 1);
    b.writeUInt8(sm.y, 2);
    b.writeUInt8(sm.w, 3);
    b.writeUInt8(sm.h, 4);
    chunks.push(b);
  }

  // 3. numFrame
  const b2 = Buffer.alloc(2);
  b2.writeInt16BE(frames.length, 0);
  chunks.push(b2);

  // 4. frames
  for (const f of frames) {
    const bParts = Buffer.alloc(1);
    bParts.writeUInt8(f.length, 0);
    chunks.push(bParts);
    for (const part of f) {
      const b = Buffer.alloc(5);
      b.writeInt16BE(part.dx, 0);
      b.writeInt16BE(part.dy, 2);
      b.writeUInt8(part.idImg, 4);
      chunks.push(b);
    }
  }

  // 5. animSequence
  const bSeq = Buffer.alloc(2);
  bSeq.writeInt16BE(animSequence.length, 0);
  chunks.push(bSeq);
  for (const seq of animSequence) {
    const b = Buffer.alloc(2);
    b.writeInt16BE(seq, 0);
    chunks.push(b);
  }

  return Buffer.concat(chunks);
}

// 1. GET /api/v1/badges - Lấy danh sách danh hiệu
router.get('/', async (req, res) => {
  try {
    const serverId = await resolvedServerId(serverIdFrom(req));
    const rows = await query('SELECT * FROM data_badges ORDER BY id ASC', [], { serverId });
    
    const optionTemplates = await query('SELECT id, NAME FROM item_option_template', [], { serverId }).catch(() => []);
    const optionMap = new Map();
    for (const opt of optionTemplates) {
      optionMap.set(opt.id, opt.NAME || `Option #${opt.id}`);
    }

    const itemTemplates = await query('SELECT id, NAME, icon_id, type FROM item_template WHERE id IN (SELECT DISTINCT idItem FROM data_badges WHERE idItem > 0)', [], { serverId }).catch(() => []);
    const itemMap = new Map();
    for (const it of itemTemplates) {
      itemMap.set(it.id, it);
    }

    const badges = rows.map((row) => {
      const rawOptions = parseJsonSafe(row.Options, []);
      const options = (Array.isArray(rawOptions) ? rawOptions : []).map((o) => {
        const optId = Number(o.id ?? o.optionId ?? 0);
        const param = Number(o.param ?? 0);
        const templateName = optionMap.get(optId) || `Option #${optId}`;
        const formattedDesc = templateName.replace(/#/g, String(param));
        return {
          id: optId,
          param,
          name: templateName,
          description: formattedDesc,
        };
      });

      const linkedItem = itemMap.get(row.idItem) || null;

      return {
        id: row.id,
        idEffect: row.idEffect,
        idItem: row.idItem,
        name: row.NAME || `Danh hiệu #${row.id}`,
        options,
        linkedItem,
      };
    });

    res.json({ ok: true, data: badges, count: badges.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 2. GET /api/v1/badges/options-catalog - Danh mục option chỉ số
router.get('/options-catalog', async (req, res) => {
  try {
    const serverId = await resolvedServerId(serverIdFrom(req));
    const rows = await query('SELECT id, NAME FROM item_option_template ORDER BY id ASC', [], { serverId });
    const catalog = rows.map(enrichOption);
    res.json({ ok: true, data: catalog, categories: OPTION_CATEGORIES });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 3. GET /api/v1/badges/items-catalog - Danh mục item template
router.get('/items-catalog', async (req, res) => {
  try {
    const serverId = await resolvedServerId(serverIdFrom(req));
    const q = String(req.query.q || '').trim();
    let sql = 'SELECT id, NAME, icon_id, type, description FROM item_template';
    const params = [];
    if (q) {
      sql += ' WHERE id = ? OR NAME LIKE ? LIMIT 100';
      params.push(isNaN(Number(q)) ? -1 : Number(q), `%${q}%`);
    } else {
      sql += ' ORDER BY id DESC LIMIT 100';
    }
    const rows = await query(sql, params, { serverId });
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 4. POST /api/v1/badges/custom-create - STUDIO TÙY CHỈNH & TẠO DANH HIỆU TOÀN DIỆN
router.post('/custom-create', requirePermission('items.manage'), async (req, res) => {
  try {
    const serverId = await resolvedServerId(serverIdFrom(req));
    const {
      id,
      name,
      idEffect,
      idItem,
      options,
      spriteBase64,
      spriteLayout, // { frameCount, cols, rows, frameWidth, frameHeight }
      taskConfig,   // { enabled, name, maxCount }
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ ok: false, error: 'Tên danh hiệu không được để trống' });
    }
    if (idEffect === undefined || isNaN(Number(idEffect))) {
      return res.status(400).json({ ok: false, error: 'ID Effect phải là số nguyên' });
    }

    const cleanName = String(name).trim();
    const cleanEffect = Number(idEffect);
    const cleanItem = Number(idItem || 0);
    const cleanOptions = Array.isArray(options)
      ? options.map((o) => ({ id: Number(o.id), param: Number(o.param || 0) }))
      : [];

    const optionsJson = JSON.stringify(cleanOptions);

    // A. Nếu có tải lên ảnh Sprite Sheet mới, ghi file vào data/effect/x4/ và sinh DataEffect
    if (spriteBase64 && String(spriteBase64).includes('base64,')) {
      const base = getGameDataPath();
      const base64Data = spriteBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Ghi ảnh vào các thư mục x4, x2, x1
      for (const z of [4, 3, 2, 1]) {
        const effDir = path.join(base, 'effect', `x${z}`);
        if (!fs.existsSync(effDir)) fs.mkdirSync(effDir, { recursive: true });
        fs.writeFileSync(path.join(effDir, `ImgEffect_${cleanEffect}.png`), buffer);
      }

      // Xử lý sinh file DataEffect nhị phân
      const frameCount = Number(spriteLayout?.frameCount || 1);
      const cols = Number(spriteLayout?.cols || frameCount);
      const rows = Number(spriteLayout?.rows || 1);
      const frameW = Number(spriteLayout?.frameWidth || 50);
      const frameH = Number(spriteLayout?.frameHeight || 25);

      const smallImages = [];
      const frames = [];
      const animSequence = [];

      let partIdx = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (partIdx >= frameCount) break;
          smallImages.push({
            id: partIdx,
            x: c * frameW,
            y: r * frameH,
            w: frameW,
            h: frameH,
          });
          frames.push([
            {
              dx: -Math.floor(frameW / 2),
              dy: -Math.floor(frameH / 2),
              idImg: partIdx,
            },
          ]);
          // Lặp lại mỗi frame 3-4 tick để hoạt ảnh mượt
          animSequence.push(partIdx, partIdx, partIdx);
          partIdx++;
        }
      }

      const effDataBuffer = generateDataEffectBinary({ smallImages, frames, animSequence });
      const effDataDir = path.join(base, 'effdata');
      if (!fs.existsSync(effDataDir)) fs.mkdirSync(effDataDir, { recursive: true });
      fs.writeFileSync(path.join(effDataDir, `DataEffect_${cleanEffect}`), effDataBuffer);
    }

    // B. Thêm hoặc Cập nhật vào data_badges
    let insertedId;
    if (id !== undefined && id !== null && !isNaN(Number(id)) && Number(id) > 0) {
      const customId = Number(id);
      const exists = await query('SELECT id FROM data_badges WHERE id = ?', [customId], { serverId });
      if (exists.length > 0) {
        await exec(
          'UPDATE data_badges SET idEffect = ?, idItem = ?, NAME = ?, Options = ? WHERE id = ?',
          [cleanEffect, cleanItem, cleanName, optionsJson, customId],
          { serverId }
        );
        insertedId = customId;
      } else {
        await exec(
          'INSERT INTO data_badges (id, idEffect, idItem, NAME, Options) VALUES (?, ?, ?, ?, ?)',
          [customId, cleanEffect, cleanItem, cleanName, optionsJson],
          { serverId }
        );
        insertedId = customId;
      }
    } else {
      const result = await exec(
        'INSERT INTO data_badges (idEffect, idItem, NAME, Options) VALUES (?, ?, ?, ?)',
        [cleanEffect, cleanItem, cleanName, optionsJson],
        { serverId }
      );
      insertedId = result.insertId;
    }

    // C. Nếu có cấu hình nhiệm vụ mở khóa danh hiệu
    if (taskConfig && taskConfig.enabled) {
      const taskName = String(taskConfig.name || `Nhiệm vụ nhận ${cleanName}`).trim();
      const maxCount = Number(taskConfig.maxCount || 100);
      const existingTask = await query('SELECT id FROM task_badges_template WHERE idbadgesReward = ?', [cleanEffect], { serverId });
      if (existingTask.length > 0) {
        await exec('UPDATE task_badges_template SET NAME = ?, maxCount = ? WHERE id = ?', [taskName, maxCount, existingTask[0].id], { serverId });
      } else {
        await exec('INSERT INTO task_badges_template (NAME, maxCount, idbadgesReward) VALUES (?, ?, ?)', [taskName, maxCount, cleanEffect], { serverId });
      }
    }

    await auditLog(req, 'BADGE_CUSTOM_SAVE', {
      id: insertedId,
      name: cleanName,
      idEffect: cleanEffect,
      idItem: cleanItem,
      optionsCount: cleanOptions.length,
    });

    res.json({
      ok: true,
      message: `Đã lưu danh hiệu "${cleanName}" (#${insertedId}) thành công! Khởi động lại Server Java để game nạp dữ liệu.`,
      data: {
        id: insertedId,
        idEffect: cleanEffect,
        idItem: cleanItem,
        name: cleanName,
        options: cleanOptions,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 5. PUT /api/v1/badges/:id - Sửa danh hiệu
router.put('/:id', requirePermission('items.manage'), async (req, res) => {
  try {
    const serverId = await resolvedServerId(serverIdFrom(req));
    const badgeId = Number(req.params.id);
    const { idEffect, idItem, name, options } = req.body;

    if (isNaN(badgeId) || badgeId <= 0) {
      return res.status(400).json({ ok: false, error: 'ID danh hiệu không hợp lệ' });
    }
    if (idEffect === undefined || isNaN(Number(idEffect))) {
      return res.status(400).json({ ok: false, error: 'ID Effect không hợp lệ' });
    }
    if (!name || !String(name).trim()) {
      return res.status(400).json({ ok: false, error: 'Tên danh hiệu không được để trống' });
    }

    const cleanName = String(name).trim();
    const cleanEffect = Number(idEffect);
    const cleanItem = Number(idItem || 0);
    const cleanOptions = Array.isArray(options)
      ? options.map((o) => ({ id: Number(o.id), param: Number(o.param || 0) }))
      : [];

    const optionsJson = JSON.stringify(cleanOptions);

    await exec(
      'UPDATE data_badges SET idEffect = ?, idItem = ?, NAME = ?, Options = ? WHERE id = ?',
      [cleanEffect, cleanItem, cleanName, optionsJson, badgeId],
      { serverId }
    );

    await auditLog(req, 'BADGE_UPDATE', { id: badgeId, name: cleanName, idEffect: cleanEffect });

    res.json({
      ok: true,
      data: {
        id: badgeId,
        idEffect: cleanEffect,
        idItem: cleanItem,
        name: cleanName,
        options: cleanOptions,
      },
      message: 'Cập nhật danh hiệu thành công!',
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 6. DELETE /api/v1/badges/:id - Xóa danh hiệu
router.delete('/:id', requirePermission('items.manage'), async (req, res) => {
  try {
    const serverId = await resolvedServerId(serverIdFrom(req));
    const badgeId = Number(req.params.id);

    if (isNaN(badgeId) || badgeId <= 0) {
      return res.status(400).json({ ok: false, error: 'ID danh hiệu không hợp lệ' });
    }

    await exec('DELETE FROM data_badges WHERE id = ?', [badgeId], { serverId });
    await auditLog(req, 'BADGE_DELETE', { id: badgeId });

    res.json({ ok: true, message: `Đã xóa danh hiệu #${badgeId}` });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 7. GET /api/v1/badges/player-search - Tìm người chơi
router.get('/player-search', async (req, res) => {
  try {
    const serverId = await resolvedServerId(serverIdFrom(req));
    const q = String(req.query.q || '').trim();

    if (!q) {
      return res.json({ ok: true, data: [] });
    }

    let sql = 'SELECT id, account_id, name, gender, dataBadges, dataTaskBadges FROM player WHERE ';
    const params = [];

    if (!isNaN(Number(q))) {
      sql += 'id = ? OR account_id = ? OR name LIKE ? LIMIT 20';
      params.push(Number(q), Number(q), `%${q}%`);
    } else {
      sql += 'name LIKE ? LIMIT 20';
      params.push(`%${q}%`);
    }

    const rows = await query(sql, params, { serverId });

    const badgeTemplates = await query('SELECT * FROM data_badges', [], { serverId }).catch(() => []);
    const badgeByEffectMap = new Map();
    for (const b of badgeTemplates) {
      badgeByEffectMap.set(b.idEffect, b);
    }

    const players = rows.map((p) => {
      const rawBadges = parseJsonSafe(p.dataBadges, []);
      const badges = (Array.isArray(rawBadges) ? rawBadges : []).map((b) => {
        const idEffect = Number(b.idBadGes ?? b.idEffect ?? -1);
        const timeofUseBadges = Number(b.timeofUseBadges ?? 0);
        const isUse = Boolean(b.isUse);
        const template = badgeByEffectMap.get(idEffect);

        const now = Date.now();
        const isExpired = timeofUseBadges > 0 && timeofUseBadges < now;
        const isPermanent = timeofUseBadges <= 0 || timeofUseBadges > now + 10 * 365 * 24 * 60 * 60 * 1000;
        const remainingDays = isPermanent ? 'Vĩnh viễn' : (isExpired ? 'Đã hết hạn' : Math.ceil((timeofUseBadges - now) / (24 * 60 * 60 * 1000)) + ' ngày');

        return {
          idBadGes: idEffect,
          timeofUseBadges,
          isUse,
          isExpired,
          isPermanent,
          remainingDays,
          name: template ? template.NAME : `Danh hiệu (Hiệu ứng #${idEffect})`,
          templateId: template ? template.id : null,
        };
      });

      return {
        id: p.id,
        account_id: p.account_id,
        name: p.name,
        gender: p.gender,
        badges,
      };
    });

    res.json({ ok: true, data: players });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 8. POST /api/v1/badges/player-grant - Cấp phát danh hiệu
router.post('/player-grant', requirePermission('players.manage'), async (req, res) => {
  try {
    const serverId = await resolvedServerId(serverIdFrom(req));
    const { playerId, idEffect, days, isUse } = req.body;

    if (!playerId || isNaN(Number(playerId))) {
      return res.status(400).json({ ok: false, error: 'Player ID không hợp lệ' });
    }
    if (idEffect === undefined || isNaN(Number(idEffect))) {
      return res.status(400).json({ ok: false, error: 'ID Effect danh hiệu không hợp lệ' });
    }

    const pId = Number(playerId);
    const effectId = Number(idEffect);
    const numDays = Number(days !== undefined ? days : 30);
    const autoEquip = Boolean(isUse);

    const players = await query('SELECT id, name, dataBadges FROM player WHERE id = ?', [pId], { serverId });
    if (players.length === 0) {
      return res.status(404).json({ ok: false, error: 'Không tìm thấy người chơi' });
    }

    const player = players[0];
    let dataBadges = parseJsonSafe(player.dataBadges, []);
    if (!Array.isArray(dataBadges)) dataBadges = [];

    const now = Date.now();
    let newExpiry;
    if (numDays === -1 || numDays >= 9999) {
      newExpiry = now + 50 * 365 * 24 * 60 * 60 * 1000;
    } else {
      newExpiry = now + numDays * 24 * 60 * 60 * 1000;
    }

    let found = false;
    for (const b of dataBadges) {
      if (b.idBadGes === effectId) {
        b.timeofUseBadges = newExpiry;
        if (autoEquip) {
          b.isUse = true;
        }
        found = true;
      } else if (autoEquip) {
        b.isUse = false;
      }
    }

    if (!found) {
      if (autoEquip) {
        for (const b of dataBadges) {
          b.isUse = false;
        }
      }
      dataBadges.push({
        idBadGes: effectId,
        timeofUseBadges: newExpiry,
        isUse: autoEquip,
      });
    }

    const updatedJson = JSON.stringify(dataBadges);
    await exec('UPDATE player SET dataBadges = ? WHERE id = ?', [updatedJson, pId], { serverId });

    await auditLog(req, 'BADGE_GRANT', {
      playerId: pId,
      playerName: player.name,
      idEffect: effectId,
      days: numDays,
      autoEquip,
    });

    res.json({
      ok: true,
      message: `Đã cấp danh hiệu #${effectId} cho người chơi ${player.name}!`,
      data: dataBadges,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 9. POST /api/v1/badges/player-revoke - Thu hồi danh hiệu
router.post('/player-revoke', requirePermission('players.manage'), async (req, res) => {
  try {
    const serverId = await resolvedServerId(serverIdFrom(req));
    const { playerId, idEffect } = req.body;

    const pId = Number(playerId);
    const effectId = Number(idEffect);

    const players = await query('SELECT id, name, dataBadges FROM player WHERE id = ?', [pId], { serverId });
    if (players.length === 0) {
      return res.status(404).json({ ok: false, error: 'Không tìm thấy người chơi' });
    }

    const player = players[0];
    let dataBadges = parseJsonSafe(player.dataBadges, []);
    if (!Array.isArray(dataBadges)) dataBadges = [];

    dataBadges = dataBadges.filter((b) => b.idBadGes !== effectId);

    const updatedJson = JSON.stringify(dataBadges);
    await exec('UPDATE player SET dataBadges = ? WHERE id = ?', [updatedJson, pId], { serverId });

    await auditLog(req, 'BADGE_REVOKE', { playerId: pId, playerName: player.name, idEffect: effectId });

    res.json({
      ok: true,
      message: `Đã thu hồi danh hiệu #${effectId} của ${player.name}`,
      data: dataBadges,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 10. POST /api/v1/badges/player-toggle - Bật/Tắt trang bị danh hiệu
router.post('/player-toggle', requirePermission('players.manage'), async (req, res) => {
  try {
    const serverId = await resolvedServerId(serverIdFrom(req));
    const { playerId, idEffect, isUse } = req.body;

    const pId = Number(playerId);
    const effectId = Number(idEffect);
    const targetState = Boolean(isUse);

    const players = await query('SELECT id, name, dataBadges FROM player WHERE id = ?', [pId], { serverId });
    if (players.length === 0) {
      return res.status(404).json({ ok: false, error: 'Không tìm thấy người chơi' });
    }

    const player = players[0];
    let dataBadges = parseJsonSafe(player.dataBadges, []);
    if (!Array.isArray(dataBadges)) dataBadges = [];

    for (const b of dataBadges) {
      if (b.idBadGes === effectId) {
        b.isUse = targetState;
      } else if (targetState) {
        b.isUse = false;
      }
    }

    const updatedJson = JSON.stringify(dataBadges);
    await exec('UPDATE player SET dataBadges = ? WHERE id = ?', [updatedJson, pId], { serverId });

    res.json({
      ok: true,
      message: `Đã ${targetState ? 'đeo' : 'tháo'} danh hiệu #${effectId} cho ${player.name}`,
      data: dataBadges,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 11. GET /api/v1/badges/tasks - Nhiệm vụ danh hiệu
router.get('/tasks', async (req, res) => {
  try {
    const serverId = await resolvedServerId(serverIdFrom(req));
    const rows = await query('SELECT * FROM task_badges_template ORDER BY id ASC', [], { serverId }).catch(() => []);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 12. POST /api/v1/badges/tasks - Thêm/sửa nhiệm vụ danh hiệu
router.post('/tasks', requirePermission('items.manage'), async (req, res) => {
  try {
    const serverId = await resolvedServerId(serverIdFrom(req));
    const { id, name, maxCount, idbadgesReward } = req.body;

    if (!name) {
      return res.status(400).json({ ok: false, error: 'Tên nhiệm vụ không được để trống' });
    }

    const cleanId = Number(id);
    const cleanName = String(name).trim();
    const cleanMax = Number(maxCount || 100);
    const cleanReward = Number(idbadgesReward || -1);

    if (cleanId > 0) {
      const exists = await query('SELECT id FROM task_badges_template WHERE id = ?', [cleanId], { serverId });
      if (exists.length > 0) {
        await exec(
          'UPDATE task_badges_template SET NAME = ?, maxCount = ?, idbadgesReward = ? WHERE id = ?',
          [cleanName, cleanMax, cleanReward, cleanId],
          { serverId }
        );
      } else {
        await exec(
          'INSERT INTO task_badges_template (id, NAME, maxCount, idbadgesReward) VALUES (?, ?, ?, ?)',
          [cleanId, cleanName, cleanMax, cleanReward],
          { serverId }
        );
      }
    } else {
      await exec(
        'INSERT INTO task_badges_template (NAME, maxCount, idbadgesReward) VALUES (?, ?, ?)',
        [cleanName, cleanMax, cleanReward],
        { serverId }
      );
    }

    res.json({ ok: true, message: 'Đã lưu nhiệm vụ danh hiệu thành công' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
