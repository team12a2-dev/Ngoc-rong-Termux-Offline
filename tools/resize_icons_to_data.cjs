/**
 * Tool CLI / Script tự động điều chỉnh kích thước ảnh và đồng bộ vào data/icon (x1, x2, x3, x4)
 * Hỗ trợ tự động scale Nearest Neighbor (Pixel Art chuẩn NRO không vỡ mờ)
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('../panel/api/node_modules/pngjs');

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

/**
 * Xử lý 1 ảnh đơn lẻ
 * @param {string} inputFilePath Đường dẫn file ảnh PNG nguồn
 * @param {number} targetId ID icon muốn lưu vào data/icon
 * @param {number} base1xWidth Kích thước chiều rộng 1x (mặc định: tự suy luận từ ảnh hoặc 24px)
 * @param {number} base1xHeight Kích thước chiều cao 1x (mặc định: tự suy luận từ ảnh hoặc 24px)
 */
function processSingleIcon(inputFilePath, targetId, base1xWidth = null, base1xHeight = null) {
  if (!fs.existsSync(inputFilePath)) {
    console.error(`❌ File nguồn không tồn tại: ${inputFilePath}`);
    return false;
  }

  const fileData = fs.readFileSync(inputFilePath);
  const srcPng = PNG.sync.read(fileData);

  // Nếu không chỉ định base1x, mặc định giả sử ảnh nguồn là 4x nếu width > 60 hoặc là 1x nếu width <= 32
  let baseW = base1xWidth;
  let baseH = base1xHeight;

  if (!baseW || !baseH) {
    if (srcPng.width >= 48) {
      baseW = Math.max(1, Math.round(srcPng.width / 4));
      baseH = Math.max(1, Math.round(srcPng.height / 4));
    } else {
      baseW = srcPng.width;
      baseH = srcPng.height;
    }
  }

  const rootData = path.resolve(__dirname, '../data/icon');
  const zooms = [
    { z: 1, w: baseW, h: baseH },
    { z: 2, w: baseW * 2, h: baseH * 2 },
    { z: 3, w: baseW * 3, h: baseH * 3 },
    { z: 4, w: baseW * 4, h: baseH * 4 },
  ];

  for (const item of zooms) {
    const outDir = path.join(rootData, `x${item.z}`);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `${targetId}.png`);

    let outPng;
    if (item.w === srcPng.width && item.h === srcPng.height) {
      outPng = srcPng;
    } else {
      outPng = resizeNearest(srcPng, item.w, item.h);
    }

    const buf = PNG.sync.write(outPng);
    fs.writeFileSync(outPath, buf);
  }

  console.log(`✅ Đã đồng bộ Icon #${targetId} (1x: ${baseW}x${baseH} -> 4x: ${baseW * 4}x${baseH * 4})`);
  return true;
}

module.exports = {
  processSingleIcon,
  resizeNearest,
};

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('=== TOOL ĐIỀU CHỈNH KÍCH THƯỚC ICON NRO (CLI) ===');
    console.log('Cách dùng: node resize_icons_to_data.cjs <đường_dẫn_ảnh> <id_icon> [rộng_1x] [cao_1x]');
    console.log('Ví dụ: node resize_icons_to_data.cjs my_icon.png 15400 24 24');
    process.exit(0);
  }

  const [inputPath, iconId, w, h] = args;
  processSingleIcon(inputPath, parseInt(iconId, 10), w ? parseInt(w, 10) : null, h ? parseInt(h, 10) : null);
}
