const fs = require('fs');
const path = require('path');

const targetPage = path.resolve(__dirname, 'pages/MapEditorPage.jsx');
let content = fs.readFileSync(targetPage, 'utf8');

// 1. UPDATE autoTileMatrix TO SUPPORT TILESET 31 (MAP 161 MASTERPIECE TILES)
const oldAutoTileStart = "    if (tileId === 2) { // Namec Tileset";
const newAutoTileTile31 = `    if (tileId === 31) {
      // NGUYÊN MẪU MAP 161: BÌA RỪNG NGUYÊN THỦY (33 TILES SYSTEM)
      t = {
        topLeft: 1,
        topMid: 2,
        topRight: 3,
        wallLeft: 30, // Vỏ thân cây
        core: 2,
        wallRight: 30,
        botLeft: 31,
        botRight: 33,
        botMid: 32,
        thinBridgeLeft: 1,
        thinBridgeMid: 2,
        thinBridgeRight: 3,
        singleTile: 2,
      };
    } else if (tileId === 2) { // Namec Tileset`;

if (content.includes(oldAutoTileStart)) {
  content = content.replace(oldAutoTileStart, newAutoTileTile31);
}

// 2. UPDATE applyDeepSeekBlueprintToMap TO APPLY MAP 161 MULTI-LAYER TREE ARCHITECTURE
const oldApplyStart = `  // Chuyển đổi Blueprint JSON từ DeepSeek thành Ma Trận Map Chuẩn NRO
  const applyDeepSeekBlueprintToMap = useCallback((blueprint, targetMap) => {`;

const newApplyLogic = `  // Chuyển đổi Blueprint JSON từ DeepSeek thành Ma Trận Map Chuẩn NRO (Tích Hợp Nguyên Mẫu Map 161)
  const applyDeepSeekBlueprintToMap = useCallback((blueprint, targetMap) => {
    const tmw = targetMap.tmw || 80;
    const tmh = targetMap.tmh || 40;
    const pxw = tmw * 24;
    const pxh = tmh * 24;
    const tileMatrix = new Array(tmw * tmh).fill(0);
    const walkableSurfaces = [];
    const isForest161 = (targetMap.preset === 'forest_multi_tier' || blueprint.tileId === 31 || targetMap.tileId === 31);
    const tileId = blueprint.tileId || (isForest161 ? 31 : (targetMap.tileId || 1));

    // Helper: Vẽ một nhánh cành cây chuẩn Map 161 với đầy đủ 4 tầng (Lá, Vỏ trên, Mặt sàn, Đáy cành)
    const render161Branch = (row, startCol, endCol) => {
      const len = endCol - startCol + 1;
      if (len < 2) return;

      // 1. Tán lá xum xuê (row - 2)
      if (row - 2 >= 0) {
        const leafTiles = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 27];
        for (let c = startCol; c <= endCol; c++) {
          const idx = (row - 2) * tmw + c;
          if (tileMatrix[idx] === 0) {
            tileMatrix[idx] = leafTiles[(c * 7 + row * 13) % leafTiles.length];
          }
        }
      }

      // 2. Mép vỏ cây trên (row - 1)
      if (row - 1 >= 0) {
        const barkTiles = [8, 8, 10, 8, 11, 12, 13, 12, 11];
        for (let c = startCol; c <= endCol; c++) {
          const idx = (row - 1) * tmw + c;
          if (tileMatrix[idx] === 0) {
            if (c === startCol) tileMatrix[idx] = 7;
            else if (c === endCol) tileMatrix[idx] = 9;
            else tileMatrix[idx] = barkTiles[(c + row) % barkTiles.length];
          }
        }
      }

      // 3. Mặt gỗ cành cây để đi lại (row)
      for (let c = startCol; c <= endCol; c++) {
        const idx = row * tmw + c;
        if (c === startCol) tileMatrix[idx] = 1;
        else if (c === endCol) tileMatrix[idx] = 3;
        else {
          if (c % 7 === 3) tileMatrix[idx] = 4;
          else if (c % 7 === 5) tileMatrix[idx] = 5;
          else if (c % 11 === 6) tileMatrix[idx] = 6;
          else tileMatrix[idx] = 2;
        }
        walkableSurfaces.push({ col: c, row, x: c * 24, y: row * 24, type: 'canopy' });
      }

      // 4. Vỏ đáy dưới cành (row + 1)
      if (row + 1 < tmh) {
        for (let c = startCol; c <= endCol; c++) {
          const idx = (row + 1) * tmw + c;
          if (tileMatrix[idx] === 0) {
            if (c === startCol) tileMatrix[idx] = 31;
            else if (c === endCol) tileMatrix[idx] = 33;
            else tileMatrix[idx] = 32;
          }
        }
      }
    };

    // 1. Render Platforms từ Blueprint của DeepSeek
    if (Array.isArray(blueprint.platforms) && blueprint.platforms.length > 0) {
      blueprint.platforms.forEach((p) => {
        const row = Math.max(0, Math.min(tmh - 1, Number(p.row) || 0));
        const startCol = Math.max(0, Math.min(tmw - 1, Number(p.startCol) || 0));
        const endCol = Math.max(startCol, Math.min(tmw - 1, Number(p.endCol) || (tmw - 1)));
        const thickness = Math.max(1, Math.min(10, Number(p.thickness) || 2));

        if (isForest161 && p.type !== 'ground') {
          render161Branch(row, startCol, endCol);
        } else {
          for (let r = row; r < row + thickness && r < tmh; r++) {
            for (let c = startCol; c <= endCol; c++) {
              tileMatrix[r * tmw + c] = 1;
            }
          }
          for (let c = startCol; c <= endCol; c++) {
            walkableSurfaces.push({ col: c, row, x: c * 24, y: row * 24, type: p.type || 'ground' });
          }
        }
      });
    }

    // 2. Render Vertical Pillars (Thân cây đại thụ / Trụ thạch nhũ)
    if (Array.isArray(blueprint.pillars) && blueprint.pillars.length > 0) {
      blueprint.pillars.forEach((p) => {
        const col = Math.max(0, Math.min(tmw - 1, Number(p.col) || 0));
        const width = Math.max(1, Math.min(8, Number(p.width) || 4));
        const topRow = Math.max(0, Math.min(tmh - 1, Number(p.topRow) || 0));
        const botRow = Math.max(topRow, Math.min(tmh - 1, Number(p.botRow) || (tmh - 1)));

        for (let r = topRow; r <= botRow; r++) {
          for (let c = col; c < col + width && c < tmw; c++) {
            if (isForest161) {
              tileMatrix[r * tmw + c] = 30; // Tile 30 chuẩn vỏ thân cây Map 161
            } else {
              tileMatrix[r * tmw + c] = 1;
            }
          }
        }
      });
    }

    // 3. Fallback Ground & Branches nếu DeepSeek trả về chưa đủ
    if (tileMatrix.filter((t) => t > 0).length < 20) {
      const gRow = Math.max(5, tmh - 5);
      for (let c = 0; c < tmw; c++) {
        for (let r = gRow; r < tmh; r++) {
          tileMatrix[r * tmw + c] = isForest161 ? 2 : 1;
        }
        walkableSurfaces.push({ col: c, row: gRow, x: c * 24, y: gRow * 24, type: 'ground' });
      }
      if (isForest161) {
        render161Branch(Math.floor(tmh * 0.35), 5, Math.floor(tmw * 0.45));
        render161Branch(Math.floor(tmh * 0.6), Math.floor(tmw * 0.4), tmw - 8);
      }
    }

    // 4. Phân bổ Quái Vật (Mobs) theo các tầng cành cây
    const mobs = [];
    if (Array.isArray(blueprint.mobs) && blueprint.mobs.length > 0) {
      blueprint.mobs.forEach((m, idx) => {
        const col = Math.max(1, Math.min(tmw - 2, Number(m.col) || 10));
        const row = Math.max(1, Math.min(tmh - 1, Number(m.row) || 20));
        const mobTempId = Number(m.mobTempId) || (isForest161 ? (idx % 2 === 0 ? 80 : 81) : 1);
        const lvl = Math.max(1, Number(m.level) || 10);
        const hp = lvl * 250;
        const dame = Math.max(5, Math.round((hp * 10) / 100));
        const template = metaOptions?.mobTemplates?.find((t) => t.id === mobTempId) || { name: 'Quái #' + mobTempId };

        mobs.push({
          id: Date.now() + 100 + idx,
          mobTempId,
          mobName: template.name,
          mobLevel: lvl,
          mobHp: hp,
          percentDame: 10,
          mobDame: dame,
          mobX: col * 24 + 12,
          mobY: row * 24,
        });
      });
    }

    // 5. Cổng dịch chuyển Waypoints (Tiếp đất hoàn hảo)
    const waypoints = [];
    const leftSurface = walkableSurfaces.find((s) => s.col <= 5) || { col: 1, row: Math.max(0, tmh - 5) };
    const rightSurface = walkableSurfaces.slice().reverse().find((s) => s.col >= tmw - 6) || { col: tmw - 2, row: Math.max(0, tmh - 5) };

    const leftTarget = metaOptions?.maps?.find((m) => m.id === (targetMap.id > 0 ? targetMap.id - 1 : 1)) || metaOptions?.maps?.[0] || { id: 0, name: 'Làng Aru' };
    waypoints.push({
      id: Date.now() + 1,
      name: 'Về: ' + leftTarget.name,
      minX: 0,
      minY: Math.max(0, (leftSurface.row - 3) * 24),
      maxX: 48,
      maxY: Math.min(pxh, (leftSurface.row + 1) * 24),
      isEnter: false,
      isOffline: false,
      goMap: leftTarget.id,
      goMapName: leftTarget.name,
      goX: 100,
      goY: 384,
    });

    const rightTarget = metaOptions?.maps?.find((m) => m.id === (targetMap.id + 1)) || metaOptions?.maps?.[1] || { id: 1, name: 'Đồi hoa cúc' };
    waypoints.push({
      id: Date.now() + 2,
      name: 'Sang: ' + rightTarget.name,
      minX: Math.max(0, pxw - 48),
      minY: Math.max(0, (rightSurface.row - 3) * 24),
      maxX: pxw,
      maxY: Math.min(pxh, (rightSurface.row + 1) * 24),
      isEnter: false,
      isOffline: false,
      goMap: rightTarget.id,
      goMapName: rightTarget.name,
      goX: 100,
      goY: 384,
    });

    // 6. Vật thể trang trí Decor (BgItems)
    const bgItems = [];
    if (Array.isArray(blueprint.bgItems) && blueprint.bgItems.length > 0) {
      blueprint.bgItems.forEach((b, idx) => {
        const col = Math.max(0, Math.min(tmw - 1, Number(b.col) || 5));
        const row = Math.max(0, Math.min(tmh - 1, Number(b.row) || 10));
        const bgTempId = Number(b.bgTempId) || (isForest161 ? (idx % 2 === 0 ? 52 : 90) : 0);
        bgItems.push({
          id: Date.now() + 300 + idx,
          bgTempId,
          imageId: bgTempId,
          layer: (idx % 3 === 0) ? 2 : 1,
          dx: 0,
          dy: 0,
          x: col,
          y: row,
          px: col * 24,
          py: row * 24,
          imageUrl: '/api/v1/assets/item-bg/' + bgTempId + '.png',
        });
      });
    } else if (isForest161) {
      // Tự động gắn Nấm khổng lồ (52) và Cổ thụ (90) kiểu Map 161
      const sampleSurfaces = walkableSurfaces.filter((s) => s.type === 'canopy');
      sampleSurfaces.slice(0, 10).forEach((s, idx) => {
        const bgTempId = idx % 2 === 0 ? 52 : 90;
        bgItems.push({
          id: Date.now() + 300 + idx,
          bgTempId,
          imageId: bgTempId,
          layer: (idx % 3 === 0) ? 2 : 1,
          dx: 0,
          dy: 0,
          x: s.col,
          y: Math.max(0, s.row - 2),
          px: s.col * 24,
          py: Math.max(0, (s.row - 2) * 24),
          imageUrl: '/api/v1/assets/item-bg/' + bgTempId + '.png',
        });
      });
    }

    // 7. Auto-Tiling hoàn thiện nếu không phải Forest161 (vì Forest161 đã được gọt viền đa tầng trực tiếp chuẩn 100%)
    const refinedTiles = isForest161 ? tileMatrix : autoTileMatrix(tileMatrix, tmw, tmh, tileId);

    return {
      tileId,
      tileMatrix: refinedTiles,
      mobs,
      waypoints,
      bgItems,
      npcs: [],
      effects: { effs: [], beffs: [] },
      mapName: blueprint.mapName || targetMap.name,
      concept: blueprint.concept || '',
    };
  }, [autoTileMatrix, metaOptions]);`;

const applyEndMarker = "  // Handler: Gọi DeepSeek AI để thiết kế Map";
const applyStartIdx = content.indexOf(oldApplyStart);
const applyEndIdx = content.indexOf(applyEndMarker);

if (applyStartIdx !== -1 && applyEndIdx !== -1) {
  content = content.substring(0, applyStartIdx) + newApplyLogic + '\n\n' + content.substring(applyEndIdx);
  console.log('Successfully updated applyDeepSeekBlueprintToMap with Map 161 tiling!');
}

fs.writeFileSync(targetPage, content, 'utf8');
console.log('Done full Map 161 Tiling Engine update!');
`;

fs.writeFileSync('panel/web/src/apply_map161_tiling.cjs', updateScript, 'utf8');
console.log('Created apply_map161_tiling.cjs');
