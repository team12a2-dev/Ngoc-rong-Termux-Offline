const fs = require('fs');
const path = require('path');
const { PNG } = require('./panel/api/node_modules/pngjs');

function resizeNearest(srcPng, targetWidth, targetHeight) {
  const dstPng = new PNG({ width: targetWidth, height: targetHeight });
  const sw = srcPng.width;
  const sh = srcPng.height;

  for (let y = 0; y < targetHeight; y++) {
    const sy = Math.min(sh - 1, Math.floor((y * sh) / targetHeight));
    for (let x = 0; x < targetWidth; x++) {
      const sx = Math.min(sw - 1, Math.floor((x * sw) / targetWidth));
      const sIdx = (sy * sw + sx) << 2;
      const dIdx = (y * targetWidth + x) << 2;
      dstPng.data[dIdx] = srcPng.data[sIdx];
      dstPng.data[dIdx + 1] = srcPng.data[sIdx + 1];
      dstPng.data[dIdx + 2] = srcPng.data[sIdx + 2];
      dstPng.data[dIdx + 3] = srcPng.data[sIdx + 3];
    }
  }
  return dstPng;
}

async function processImage(id) {
  const srcPath = `data/item_bg_temp/x1/${id}.png`;
  if (!fs.existsSync(srcPath)) {
    console.log(`Source ${srcPath} does not exist`);
    return;
  }
  const fileData = fs.readFileSync(srcPath);
  const srcPng = PNG.sync.read(fileData);
  console.log(`Processing ${id}.png (source ${srcPng.width}x${srcPng.height})...`);

  // Target base size in 1x logic:
  const baseW = srcPng.width;
  const baseH = srcPng.height;

  const zooms = [
    { z: 1, w: baseW, h: baseH },
    { z: 2, w: baseW * 2, h: baseH * 2 },
    { z: 3, w: baseW * 3, h: baseH * 3 },
    { z: 4, w: baseW * 4, h: baseH * 4 },
  ];

  for (const item of zooms) {
    const outDir = `data/item_bg_temp/x${item.z}`;
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `${id}.png`);

    let outPng;
    if (item.w === srcPng.width && item.h === srcPng.height) {
      outPng = srcPng;
    } else {
      outPng = resizeNearest(srcPng, item.w, item.h);
    }
    const buf = PNG.sync.write(outPng);
    fs.writeFileSync(outPath, buf);
    console.log(`  -> Written x${item.z}/${id}.png (${item.w}x${item.h}, ${buf.length} bytes)`);
  }
}

async function run() {
  console.log('--- Starting multi-zoom scaling for custom backgrounds ---');
  await processImage(501);
  await processImage(502);
  console.log('--- Finished scaling ---');
}

run().catch(console.error);
