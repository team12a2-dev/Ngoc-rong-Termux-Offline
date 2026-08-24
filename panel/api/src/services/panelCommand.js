import fs from 'fs/promises';
import path from 'path';

function cmdFilePath() {
  if (process.env.GAME_PANEL_CMD_PATH) {
    return path.resolve(process.env.GAME_PANEL_CMD_PATH);
  }
  const serverRoot = process.env.GAME_SERVER_PATH || path.resolve(process.cwd(), '../..');
  return path.join(serverRoot, 'panel_cmd.txt');
}

export async function queuePanelCommand(line) {
  const file = cmdFilePath();
  await fs.appendFile(file, `${line}\n`, 'utf8');
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
