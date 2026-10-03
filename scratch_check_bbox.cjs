const fs = require('fs');
const { PNG } = require('./panel/api/node_modules/pngjs');

['501.png', '502.png'].forEach(file => {
  const p = 'data/item_bg_temp/x1/' + file;
  if (!fs.existsSync(p)) return;
  const data = fs.readFileSync(p);
  new PNG().parse(data, (err, png) => {
    if (err) return console.error(err);
    let minX = png.width, maxX = 0, minY = png.height, maxY = 0, nonZero = 0;
    for (let y = 0; y < png.height; y++) {
      for (let x = 0; x < png.width; x++) {
        const idx = (png.width * y + x) << 2;
        if (png.data[idx + 3] > 10) {
          nonZero++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    console.log(file + ' (' + png.width + 'x' + png.height + '): visible pixels bbox = X [' + minX + '..' + maxX + '], Y [' + minY + '..' + maxY + '], visibleCount = ' + nonZero);
  });
});
