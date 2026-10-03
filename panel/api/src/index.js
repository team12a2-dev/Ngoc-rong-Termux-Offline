import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import authRoutes from './routes/auth.js';
import serverRoutes from './routes/servers.js';
import accountRoutes from './routes/accounts.js';
import auditRoutes from './routes/audit.js';
import playerRoutes from './routes/players.js';
import giftcodeRoutes from './routes/giftcodes.js';
import shopRoutes from './routes/shops.js';
import clanRoutes from './routes/clans.js';
import rankingRoutes from './routes/rankings.js';
import economyRoutes from './routes/economy.js';
import configRoutes from './routes/config.js';
import pluginRoutes from './routes/plugins.js';
import setupRoutes from './routes/setup.js';
import alertRoutes from './routes/alerts.js';
import backupRoutes from './routes/backups.js';
import assetRoutes from './routes/assets.js';
import itemRoutes from './routes/items.js';
import runtimeRoutes from './routes/runtime.js';
import dropConfigRoutes from './routes/dropConfig.js';
import usableItemRoutes from './routes/usableItems.js';
import bossConfigRoutes from './routes/bossConfig.js';
import eventRoutes from './routes/events.js';
import rechargePromotionRoutes from './routes/rechargePromotions.js';
import godSpinRoutes from './routes/godSpin.js';
import quickImportRoutes from './routes/quickImport.js';
import mapRoutes from './routes/maps.js';
import badgesRoutes from './routes/badges.js';
import toolPartRoutes from './routes/toolPart.js';
import serverLaunchRoutes from './routes/serverLaunches.js';

import { authMiddleware, getMe, getJwtSecret } from './middleware/auth.js';
import { getMetrics, getOnlinePlayers } from './services/agent.js';
import { verifyGameDb } from './db.js';
import { startAlertMonitor } from './services/alertMonitor.js';
import { startMaintenanceScheduler } from './services/maintenanceScheduler.js';
import { getDefaultServerId } from './services/serverRegistry.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_DIST = path.resolve(__dirname, '../../web/dist');

const app = express();
const port = Number(process.env.PORT || 3001);
const bindHost = process.env.PANEL_BIND_HOST || '0.0.0.0';
const server = createServer(app);

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[unhandledRejection]', reason);
});

app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

app.get('/api/v1/system/health', async (_req, res) => {
  try {
    const db = await verifyGameDb();
    res.json({ ok: true, service: 'nro-panel-api', version: '1.0.0', database: db.database });
  } catch (e) {
    res.json({ ok: true, service: 'nro-panel-api', version: '1.0.0', database: null, dbError: e.message });
  }
});

app.use('/api/v1/setup', setupRoutes);
app.use('/api/v1/auth', authRoutes);
app.get('/api/v1/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await getMe(req.user.id);
    res.json({ ok: true, data: user || req.user });
  } catch {
    res.json({ ok: true, data: req.user });
  }
});
app.use('/api/v1/servers', serverRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1/players', playerRoutes);
app.use('/api/v1/giftcodes', giftcodeRoutes);
app.use('/api/v1/shops', shopRoutes);
app.use('/api/v1/clans', clanRoutes);
app.use('/api/v1/rankings', rankingRoutes);
app.use('/api/v1/economy', economyRoutes);
app.use('/api/v1/config', configRoutes);
app.use('/api/v1/plugins', pluginRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/backups', backupRoutes);
app.use('/api/v1/assets', assetRoutes);
app.use('/api/v1/items', itemRoutes);
app.use('/api/v1/runtime', runtimeRoutes);
app.use('/api/v1/drop-config', dropConfigRoutes);
app.use('/api/v1/usable-items', usableItemRoutes);
app.use('/api/v1/boss-config', bossConfigRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/recharge-promotions', rechargePromotionRoutes);
app.use('/api/v1/god-spin', godSpinRoutes);
app.use('/api/v1/quick-import', quickImportRoutes);
app.use('/api/v1/maps', mapRoutes);
app.use('/api/v1/badges', badgesRoutes);
app.use('/api/v1/tool-part', toolPartRoutes);
app.use('/api/v1/server-launches', serverLaunchRoutes);

// Serve the production React panel from the same origin as the API.
// This keeps relative /api and /ws URLs working on localhost and LAN devices.
app.use(express.static(WEB_DIST, {
  etag: true,
  lastModified: true,
  maxAge: 0,
  setHeaders: (res, filePath) => {
    // index.html quyết định bundle/chức năng panel; không được giữ bản cũ sau update.
    res.setHeader('Cache-Control', filePath.endsWith('index.html') ? 'no-store, no-cache, must-revalidate' : 'no-cache');
  },
}));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/ws/')) return next();
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(WEB_DIST, 'index.html'), (err) => {
    if (err) next(err);
  });
});

app.use((err, _req, res, _next) => {
  console.error('[express-error]', err);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ ok: false, error: 'Dung lượng payload quá lớn (Payload Too Large).' });
  }
  res.status(err.status || 500).json({ ok: false, error: err.message || 'Lỗi hệ thống nội bộ' });
});

// WebSocket metrics stream
const wss = new WebSocketServer({ server, path: '/ws/metrics' });
const intervalMs = Number(process.env.METRICS_INTERVAL_MS || 5000);
const playersEveryN = Math.max(1, Number(process.env.PLAYERS_POLL_EVERY_N || 2));

wss.on('connection', (ws, req) => {
  ws.on('error', (err) => {
    console.error('[WebSocket Error]', err?.message || err);
  });

  let token = null;
  let currentServerId = null;

  try {
    const host = req.headers.host || '127.0.0.1';
    const parsedUrl = new URL(req.url, `http://${host}`);
    token = parsedUrl.searchParams.get('token');
    currentServerId = parsedUrl.searchParams.get('serverId');
  } catch (err) {
    console.error('[WebSocket URL parse error]', err?.message || err);
  }

  if (!token) {
    ws.close(4001, 'Unauthorized');
    return;
  }
  try {
    jwt.verify(token, getJwtSecret());
  } catch {
    ws.close(4001, 'Unauthorized');
    return;
  }

  let timer = null;
  let tick = 0;
  let lastPlayers = [];
  let isPushing = false;

  async function pushMetrics() {
    if (ws.readyState !== ws.OPEN || isPushing) return;
    isPushing = true;
    try {
      tick += 1;
      const sid = Number(currentServerId || await getDefaultServerId());
      let metrics = null;
      let agentError = null;
      try {
        metrics = await getMetrics(sid);
      } catch (e) {
        agentError = e.message || 'Agent unreachable';
      }
      if (tick % playersEveryN === 0) {
        const playersRes = await getOnlinePlayers(sid).catch(() => null);
        lastPlayers = playersRes?.data ?? lastPlayers;
      }
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'metrics',
          serverId: sid,
          data: metrics?.data ?? null,
          players: lastPlayers,
          agentOnline: Boolean(metrics?.data),
          agentError,
        }));
      }
    } catch (e) {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(JSON.stringify({ type: 'error', error: e.message }));
        } catch {}
      }
    } finally {
      isPushing = false;
    }
  }

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ping') {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } else if (msg.type === 'change-server' && msg.serverId) {
        currentServerId = msg.serverId;
        tick = 0;
        pushMetrics();
      }
    } catch {}
  });

  pushMetrics();
  timer = setInterval(pushMetrics, intervalMs);

  ws.on('close', () => {
    if (timer) clearInterval(timer);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} dang duoc su dung. Panel API co the da chay.`);
    console.error('Chay panel\\stop-panel.bat roi thu lai, hoac chi mo http://localhost:5173');
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});

server.listen(port, bindHost, () => {
  console.log(`NRO Panel listening on http://${bindHost}:${port}`);
  startAlertMonitor();
  startMaintenanceScheduler();
});
