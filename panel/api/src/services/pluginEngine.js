import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { agentGet, agentPost } from './agent.js';
import { getDefaultServerId } from './serverRegistry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = path.resolve(__dirname, '../../../plugins');

export function listPluginsFromDisk() {
  if (!fs.existsSync(PLUGINS_DIR)) return [];
  return fs.readdirSync(PLUGINS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const raw = fs.readFileSync(path.join(PLUGINS_DIR, f), 'utf8');
      return JSON.parse(raw);
    });
}

export async function executePlugin(manifest, fieldValues = {}, serverId = null) {
  const sid = serverId ?? await getDefaultServerId();
  const steps = manifest.steps || [];
  const results = [];
  for (const step of steps) {
    const action = step.action || '';
    if (action.startsWith('agent:POST:')) {
      const agentPath = action.replace('agent:POST:', '');
      const body = interpolate(step.body || {}, fieldValues);
      results.push(await agentPost(sid, agentPath, body));
    }
  }
  return results;
}

function interpolate(obj, values) {
  if (typeof obj === 'string') {
    return obj.replace(/\{\{(\w+)\}\}/g, (_, k) => String(values[k] ?? ''));
  }
  if (Array.isArray(obj)) return obj.map((v) => interpolate(v, values));
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = interpolate(v, values);
    return out;
  }
  return obj;
}
