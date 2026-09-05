import { Router } from 'express';
import path from 'path';
import { query } from '../db.js';
import { findIconFile, getGameDataPath } from '../services/gameAssets.js';

const router = Router();

function sendIconPng(res, file) {
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.type('png');
  return res.sendFile(file);
}

/** Icon theo icon_id — data/icon/x4/{id}.png */
router.get('/icons/:id.png', (req, res) => {
  const file = findIconFile(req.params.id);
  if (!file) return res.status(404).json({ ok: false, error: 'Icon not found' });
  return sendIconPng(res, file);
});

/** Icon theo item template id — tra icon_id trong DB rồi serve PNG */
router.get('/items/:tempId/icon.png', async (req, res) => {
  try {
    const rows = await query(
      'SELECT icon_id FROM item_template WHERE id = ? LIMIT 1',
      [req.params.tempId]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Item not found' });
    const iconId = rows[0].icon_id;
    if (iconId == null || iconId < 0) {
      return res.status(404).json({ ok: false, error: 'No icon_id' });
    }
    const file = findIconFile(iconId);
    if (!file) return res.status(404).json({ ok: false, error: 'Icon file not found' });
    return sendIconPng(res, file);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** Icon cờ bang hội — clan.img_id → flag_bag.icon_id → PNG */
router.get('/clan-flags/:imgId/icon.png', async (req, res) => {
  try {
    const rows = await query(
      'SELECT icon_id FROM flag_bag WHERE id = ? LIMIT 1',
      [req.params.imgId]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Flag not found' });
    const file = findIconFile(rows[0].icon_id);
    if (!file) return res.status(404).json({ ok: false, error: 'Icon file not found' });
    return sendIconPng(res, file);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** Icon bang theo clan id */
router.get('/clans/:clanId/icon.png', async (req, res) => {
  try {
    const rows = await query('SELECT img_id FROM clan WHERE id = ? LIMIT 1', [req.params.clanId]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Clan not found' });
    const flagRows = await query(
      'SELECT icon_id FROM flag_bag WHERE id = ? LIMIT 1',
      [rows[0].img_id ?? 0]
    );
    if (!flagRows.length) return res.status(404).json({ ok: false, error: 'Flag not found' });
    const file = findIconFile(flagRows[0].icon_id);
    if (!file) return res.status(404).json({ ok: false, error: 'Icon file not found' });
    return sendIconPng(res, file);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/icons/meta', (_req, res) => {
  res.json({
    ok: true,
    data: {
      gameDataPath: getGameDataPath(),
      zoomOrder: process.env.GAME_ICON_ZOOM ? [Number(process.env.GAME_ICON_ZOOM)] : [4, 3, 2, 1],
    },
  });
});

router.get('/data/:kind/:filename', (req, res) => {
  const kind = req.params.kind === 'icon' ? 'icon' : req.params.kind === 'img_by_name' ? 'img_by_name' : null;
  const filename = req.params.filename;
  if (!kind || !/^[A-Za-z0-9_.-]+\.png$/i.test(filename)) return res.status(400).json({ ok: false, error: 'Invalid asset path' });
  return sendIconPng(res, path.join(getGameDataPath(), kind, 'x4', filename));
});

export default router;
