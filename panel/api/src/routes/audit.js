import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { query } from '../db.js';

const router = Router();
router.use(authMiddleware);

router.get('/', requirePermission('logs.view'), async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Number(req.query.limit || 50));
  const offset = (page - 1) * limit;
  try {
    const rows = await query(
      `SELECT * FROM panel_audit_logs ORDER BY id DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.json({ ok: true, data: [] });
  }
});

export default router;
