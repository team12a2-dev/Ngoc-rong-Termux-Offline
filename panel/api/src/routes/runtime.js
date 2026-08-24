import { Router } from 'express';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { ROOT, loadGameConfig, getAgentConfigFromGameConfig } from '../config/loadGameConfig.js';
import { getDefaultServerId } from '../services/serverRegistry.js';
import { agentGet } from '../services/agent.js';

const router = Router();
router.use(authMiddleware);

const LOG_FILES = {
  game: path.join(ROOT, '.runtime', 'server.log'),
  panel: path.join(ROOT, '.runtime', 'panel.log'),
  mariadb: path.join(ROOT, '.runtime', 'mariadb.log'),
};

function safeLines(value, fallback = 120) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(1000, Math.max(20, Math.floor(parsed)));
}

async function tailFile(filePath, lines) {
  try {
    const stat = await fs.stat(filePath);
    const maxBytes = 1024 * 1024;
    const start = Math.max(0, stat.size - maxBytes);
    const handle = await fs.open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(Math.max(0, stat.size - start));
      if (buffer.length) await handle.read(buffer, 0, buffer.length, start);
      const all = buffer.toString('utf8').split(/\r?\n/);
      return {
        available: true,
        file: path.basename(filePath),
        sizeBytes: stat.size,
        updatedAt: stat.mtime.toISOString(),
        truncated: start > 0,
        lines: all.slice(-lines).join('\n'),
      };
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { available: false, file: path.basename(filePath), lines: '', error: 'File log chưa tồn tại' };
    }
    throw error;
  }
}

router.get('/logs', requirePermission('logs.view'), async (req, res) => {
  const source = String(req.query.source || 'game');
  const filePath = LOG_FILES[source];
  if (!filePath) return res.status(400).json({ ok: false, error: 'Nguồn log không hợp lệ' });
  try {
    const data = await tailFile(filePath, safeLines(req.query.lines));
    res.json({ ok: true, data: { source, ...data } });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/diagnostics', requirePermission('dashboard.view'), async (req, res) => {
  const config = loadGameConfig();
  const agent = getAgentConfigFromGameConfig(config);
  const serverId = Number(req.query.serverId || await getDefaultServerId());
  let agentHealth = null;
  let agentError = null;
  try {
    agentHealth = await agentGet(serverId, '/health');
  } catch (error) {
    agentError = error.message || 'Agent không phản hồi';
  }

  const files = {};
  for (const [name, filePath] of Object.entries(LOG_FILES)) {
    try {
      const stat = await fs.stat(filePath);
      files[name] = { exists: true, sizeBytes: stat.size, updatedAt: stat.mtime.toISOString() };
    } catch {
      files[name] = { exists: false, sizeBytes: 0, updatedAt: null };
    }
  }

  const memory = process.memoryUsage();
  res.json({
    ok: true,
    data: {
      serverId,
      serverName: agent.serverName,
      gamePort: agent.gamePort,
      agentUrl: agent.url,
      agentHealth: agentHealth?.data || null,
      agentOnline: Boolean(agentHealth?.data),
      agentError,
      panel: {
        pid: process.pid,
        node: process.version,
        platform: `${process.platform} ${process.arch}`,
        uptimeSeconds: Math.round(process.uptime()),
        memoryMb: Math.round(memory.rss / 1024 / 1024),
      },
      host: {
        hostname: os.hostname(),
        uptimeSeconds: Math.round(os.uptime()),
        totalMemoryMb: Math.round(os.totalmem() / 1024 / 1024),
        freeMemoryMb: Math.round(os.freemem() / 1024 / 1024),
        cpus: os.cpus().length,
      },
      logs: files,
    },
  });
});

export default router;

