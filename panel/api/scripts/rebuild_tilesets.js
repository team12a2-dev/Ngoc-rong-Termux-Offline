import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

const resX4Dir = path.join(rootDir, 'data', 'res', 'x4');
const tileDir = path.join(rootDir, 'data', 'tile');

async function readPng(filePath) {
  const buf = fs.readFileSync(filePath);
  return new Promise((resolve, reject) => {
    new PNG().parse(buf, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

function scaleDown96to24(srcPng) {
  const dstPng = new PNG({ width: 24, height: 24 });
  const srcW = srcPng.width;
  const srcH = srcPng.height;

  for (let dy = 0; dy < 24; dy++) {
    for (let dx = 0; dx < 24; dx++) {
      const sx = Math.min(srcW - 1, Math.floor(dx * (srcW / 24)));
      const sy = Math.min(srcH - 1, Math.floor(dy * (srcH / 24)));

      const srcIdx = (sy * srcW + sx) * 4;
      const dstIdx = (dy * 24 + dx) * 4;

      dstPng.data[dstIdx] = srcPng.data[srcIdx];
      dstPng.data[dstIdx + 1] = srcPng.data[srcIdx + 1];
      dstPng.data[dstIdx + 2] = srcPng.data[srcIdx + 2];
      dstPng.data[dstIdx + 3] = srcPng.data[srcIdx + 3];
    }
  }
  return dstPng;
}

async function rebuildTileSet(tileId) {
  // Find all tile files for this tileId
  const prefix = `${tileId}$`;
  const matchingFiles = fs.readdirSync(resX4Dir).filter(f => f.startsWith(prefix));
  if (matchingFiles.length === 0) {
    console.log(`TileSet ${tileId}: No files in data/res/x4, keeping existing data/tile/${tileId}.png`);
    return;
  }

  // Sort by numeric index
  matchingFiles.sort((a, b) => {
    const idxA = parseInt(a.replace(prefix, ''), 10);
    const idxB = parseInt(b.replace(prefix, ''), 10);
    return idxA - idxB;
  });

  const tileCount = matchingFiles.length;
  console.log(`TileSet ${tileId}: Rebuilding from ${tileCount} res/x4 tiles...`);

  // Create vertical strip PNG: width = 24, height = tileCount * 24
  const outPng = new PNG({ width: 24, height: tileCount * 24 });

  for (let i = 0; i < tileCount; i++) {
    const file = matchingFiles[i];
    const filePath = path.join(resX4Dir, file);
    try {
      const rawPng = await readPng(filePath);
      const tile24 = scaleDown96to24(rawPng);

      // Blit into outPng at y offset = i * 24
      PNG.bitblt(tile24, outPng, 0, 0, 24, 24, 0, i * 24);
    } catch (err) {
      console.error(`Error processing ${file}:`, err.message);
    }
  }

  const outPath = path.join(tileDir, `${tileId}.png`);
  const outBuf = PNG.sync.write(outPng);
  fs.writeFileSync(outPath, outBuf);
  console.log(`TileSet ${tileId}: Successfully generated ${outPath} (${24}x${tileCount * 24})`);
}

async function main() {
  for (let tid = 1; tid <= 36; tid++) {
    await rebuildTileSet(tid);
  }
  console.log('All tilesets rebuilt successfully!');
}

main().catch(console.error);
