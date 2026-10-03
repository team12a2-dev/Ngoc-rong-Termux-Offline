import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import JSZip from 'jszip';
import { apiGet, apiPost, apiDelete } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';

// Preset chuẩn kích thước NRO (1x)
const NRO_PRESETS = [
  { label: '16 × 16 (Đậu thần, capsule, ngọc, đá)', w: 16, h: 16 },
  { label: '20 × 20 (Phụ kiện nhỏ, bùa, sách skill)', w: 20, h: 20 },
  { label: '24 × 24 (Trang bị chuẩn: Áo, Quần, Găng, Giày)', w: 24, h: 24 },
  { label: '28 × 28 (Vũ khí, pet mini, item VIP)', w: 28, h: 28 },
  { label: '30 × 30 (Cờ bang hội, hiệu ứng ô)', w: 30, h: 30 },
  { label: '32 × 32 (Avatar, cờ bang lớn, icon boss)', w: 32, h: 32 },
  { label: '36 × 36 (Icon kỹ năng đặc biệt)', w: 36, h: 36 },
  { label: '40 × 40 (Sprite boss mini, đồ họa lớn)', w: 40, h: 40 },
  { label: '48 × 48 (Hiệu ứng chưởng, aura)', w: 48, h: 48 },
  { label: '64 × 64 (Icon siêu to, banner decor)', w: 64, h: 64 },
];

/** Auto trim transparent borders from canvas */
function getCanvasTrimBounds(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha > 5) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX === -1) return { x: 0, y: 0, w, h }; // empty or fully transparent
  return {
    x: minX,
    y: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
  };
}

/** Color distance helper */
function colorDist(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

export default function IconResizerPage() {
  const [activeTab, setActiveTab] = useState('studio'); // 'studio' | 'batch' | 'explorer'
  const fb = useFeedback();

  // === STUDIO STATES ===
  const [sourceImg, setSourceImg] = useState(null);
  const [sourceInfo, setSourceInfo] = useState({ name: '', width: 0, height: 0 });
  const [targetId, setTargetId] = useState('');
  const [nextSuggestedId, setNextSuggestedId] = useState(null);
  const [inspectExisting, setInspectExisting] = useState(null);

  // Resize Configurations
  const [presetIndex, setPresetIndex] = useState(2); // Default: 24x24
  const [customW, setCustomW] = useState(24);
  const [customH, setCustomH] = useState(24);
  const [isCustomPreset, setIsCustomPreset] = useState(false);
  const [fitMode, setFitMode] = useState('contain'); // 'contain' | 'cover' | 'stretch' | 'original'
  const [pixelArt, setPixelArt] = useState(true); // Nearest neighbor (true) vs smooth (false)
  const [autoTrim, setAutoTrim] = useState(false); // Cắt viền trống

  // Manual Adjustments
  const [scalePercent, setScalePercent] = useState(100);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // Background Removal
  const [bgRemoveMode, setBgRemoveMode] = useState('none'); // 'none' | 'white' | 'black' | 'custom'
  const [customBgColor, setCustomBgColor] = useState('#ffffff');
  const [bgTolerance, setBgTolerance] = useState(30);

  // Previews Data
  const [previews, setPreviews] = useState({ x1: null, x2: null, x3: null, x4: null });
  const [previewDims, setPreviewDims] = useState({ x1: { w: 0, h: 0 }, x2: { w: 0, h: 0 }, x3: { w: 0, h: 0 }, x4: { w: 0, h: 0 } });
  const [compareId, setCompareId] = useState('100');
  const [previewBg, setPreviewBg] = useState('grid'); // 'grid' | 'dark' | 'light' | 'nro_green'

  // Loading / Saving
  const [saving, setSaving] = useState(false);

  // === BATCH RESIZE STATES ===
  const [batchFiles, setBatchFiles] = useState([]);
  const [batchTargetW, setBatchTargetW] = useState(24);
  const [batchTargetH, setBatchTargetH] = useState(24);
  const [batchFitMode, setBatchFitMode] = useState('contain');
  const [batchAutoTrim, setBatchAutoTrim] = useState(true);
  const [batchPixelArt, setBatchPixelArt] = useState(true);
  const [batchBgRemove, setBatchBgRemove] = useState('none'); // 'none' | 'white' | 'black'
  const [batchBgTol, setBatchBgTol] = useState(30);
  const [batchIdMode, setBatchIdMode] = useState('filename'); // 'filename' | 'start_id'
  const [batchStartId, setBatchStartId] = useState(20000);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null);

  // === EXPLORER STATES ===
  const [explorerList, setExplorerList] = useState([]);
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [explorerPage, setExplorerPage] = useState(1);
  const [explorerTotalPages, setExplorerTotalPages] = useState(1);
  const [explorerTotal, setExplorerTotal] = useState(0);
  const [explorerSearch, setExplorerSearch] = useState('');
  const [explorerMin, setExplorerMin] = useState('');
  const [explorerMax, setExplorerMax] = useState('');

  // Refs
  const fileInputRef = useRef(null);
  const batchFileInputRef = useRef(null);
  const batchFolderInputRef = useRef(null);

  // Load next suggested ID on mount
  const fetchNextId = useCallback(async () => {
    try {
      const res = await apiGet('/assets/icons/next-id');
      if (res?.ok && res.data?.nextId) {
        setNextSuggestedId(res.data.nextId);
        if (!targetId) {
          setTargetId(String(res.data.nextId));
        }
      }
    } catch (_) {}
  }, [targetId]);

  useEffect(() => {
    fetchNextId();
  }, [fetchNextId]);

  // Handle Preset Changes
  const handlePresetSelect = (idx) => {
    setPresetIndex(idx);
    if (idx >= 0 && idx < NRO_PRESETS.length) {
      setIsCustomPreset(false);
      setCustomW(NRO_PRESETS[idx].w);
      setCustomH(NRO_PRESETS[idx].h);
    } else {
      setIsCustomPreset(true);
    }
  };

  // Inspect existing ID to warn before overwrite
  useEffect(() => {
    const idNum = Number(targetId);
    if (!Number.isFinite(idNum) || idNum < 0) {
      setInspectExisting(null);
      return;
    }
    let cancelled = false;
    apiGet(`/assets/icons/dimensions/${idNum}`).then((res) => {
      if (cancelled) return;
      if (res?.ok && res.data?.zooms?.x4?.exists) {
        setInspectExisting(res.data.zooms);
      } else {
        setInspectExisting(null);
      }
    }).catch(() => {
      if (!cancelled) setInspectExisting(null);
    });
    return () => { cancelled = true; };
  }, [targetId]);

  // Load an image file into Studio
  const loadSourceFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setSourceImg(img);
        setSourceInfo({
          name: file.name,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
        });
        // Auto pick ID if filename is number
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        const fileNum = parseInt(nameWithoutExt, 10);
        if (!isNaN(fileNum) && fileNum >= 0) {
          setTargetId(String(fileNum));
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Load existing server icon into Studio for editing
  const loadServerIconToStudio = (idToLoad) => {
    const idNum = Number(idToLoad);
    if (!Number.isFinite(idNum) || idNum < 0) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setSourceImg(img);
      setSourceInfo({
        name: `Icon_${idNum}.png`,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      });
      setTargetId(String(idNum));
      setActiveTab('studio');
      fb.info(`Đã tải icon #${idNum} vào Studio để chỉnh sửa`);
    };
    img.onerror = () => {
      fb.error(`Không thể tải ảnh icon #${idNum} từ server`);
    };
    img.src = `/api/v1/assets/icons/raw/4/${idNum}.png?t=${Date.now()}`;
  };

  // Paste image from clipboard
  useEffect(() => {
    const handlePaste = (e) => {
      if (activeTab !== 'studio') return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            loadSourceFile(file);
            fb.success('Đã dán ảnh từ Clipboard thành công!');
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeTab]);

  // === RENDER ENGINE: TÍNH TOÁN & SINH RA 4 CẤP ĐỘ ZOOM ===
  useEffect(() => {
    if (!sourceImg) {
      setPreviews({ x1: null, x2: null, x3: null, x4: null });
      return;
    }

    try {
      const sw = sourceImg.naturalWidth || sourceImg.width;
      const sh = sourceImg.naturalHeight || sourceImg.height;

      // 1. Tạo Canvas gốc trung gian để xử lý: Auto Trim, Xóa phông, Xoay, Lật, Scale, Offset
      const intermediateCanvas = document.createElement('canvas');
      intermediateCanvas.width = sw;
      intermediateCanvas.height = sh;
      const iCtx = intermediateCanvas.getContext('2d');

      // Vẽ ảnh gốc lên
      iCtx.drawImage(sourceImg, 0, 0);

      // Xử lý xóa nền nếu có
      if (bgRemoveMode !== 'none') {
        const imgData = iCtx.getImageData(0, 0, sw, sh);
        const data = imgData.data;
        let tr = 255, tg = 255, tb = 255;
        if (bgRemoveMode === 'black') {
          tr = 0; tg = 0; tb = 0;
        } else if (bgRemoveMode === 'custom') {
          const hex = customBgColor.replace('#', '');
          tr = parseInt(hex.substring(0, 2), 16) || 0;
          tg = parseInt(hex.substring(2, 4), 16) || 0;
          tb = parseInt(hex.substring(4, 6), 16) || 0;
        }

        const tol = Number(bgTolerance) || 30;
        for (let i = 0; i < data.length; i += 4) {
          const dist = colorDist(data[i], data[i + 1], data[i + 2], tr, tg, tb);
          if (dist <= tol) {
            data[i + 3] = 0; // Transparent
          }
        }
        iCtx.putImageData(imgData, 0, 0);
      }

      // Xử lý Auto Trim viền thừa nếu bật
      let contentX = 0, contentY = 0, contentW = sw, contentH = sh;
      if (autoTrim) {
        const bounds = getCanvasTrimBounds(intermediateCanvas);
        contentX = bounds.x;
        contentY = bounds.y;
        contentW = bounds.w;
        contentH = bounds.h;
      }

      // Xác định base target 1x
      const target1xW = Math.max(1, parseInt(customW, 10) || 24);
      const target1xH = Math.max(1, parseInt(customH, 10) || 24);

      // Render từng cấp độ zoom: x1, x2, x3, x4
      const zoomResults = {};
      const dimResults = {};

      [1, 2, 3, 4].forEach((z) => {
        const zw = target1xW * z;
        const zh = target1xH * z;
        const zCanvas = document.createElement('canvas');
        zCanvas.width = zw;
        zCanvas.height = zh;
        const zCtx = zCanvas.getContext('2d');

        zCtx.imageSmoothingEnabled = !pixelArt;
        if (!pixelArt) zCtx.imageSmoothingQuality = 'high';

        zCtx.save();

        // Di chuyển tâm để hỗ trợ xoay và lật
        zCtx.translate(zw / 2 + (offsetX * z), zh / 2 + (offsetY * z));

        if (rotation !== 0) {
          zCtx.rotate((rotation * Math.PI) / 180);
        }
        if (flipH || flipV) {
          zCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        }

        // Tính toán kích thước vẽ dựa trên fitMode
        let drawW = zw;
        let drawH = zh;
        const scaleMult = (scalePercent / 100);

        if (fitMode === 'contain') {
          const ratio = Math.min(zw / contentW, zh / contentH);
          drawW = Math.max(1, Math.round(contentW * ratio * scaleMult));
          drawH = Math.max(1, Math.round(contentH * ratio * scaleMult));
        } else if (fitMode === 'cover') {
          const ratio = Math.max(zw / contentW, zh / contentH);
          drawW = Math.max(1, Math.round(contentW * ratio * scaleMult));
          drawH = Math.max(1, Math.round(contentH * ratio * scaleMult));
        } else if (fitMode === 'original') {
          drawW = Math.max(1, Math.round(contentW * (z / 4) * scaleMult));
          drawH = Math.max(1, Math.round(contentH * (z / 4) * scaleMult));
        } else {
          // stretch
          drawW = Math.round(zw * scaleMult);
          drawH = Math.round(zh * scaleMult);
        }

        zCtx.drawImage(
          intermediateCanvas,
          contentX, contentY, contentW, contentH,
          -drawW / 2, -drawH / 2, drawW, drawH
        );

        zCtx.restore();

        zoomResults[`x${z}`] = zCanvas.toDataURL('image/png');
        dimResults[`x${z}`] = { w: zw, h: zh };
      });

      setPreviews(zoomResults);
      setPreviewDims(dimResults);
    } catch (err) {
      console.error('Lỗi khi render icon preview:', err);
    }
  }, [
    sourceImg, customW, customH, fitMode, pixelArt, autoTrim,
    scalePercent, offsetX, offsetY, rotation, flipH, flipV,
    bgRemoveMode, customBgColor, bgTolerance
  ]);

  // Lưu Single Icon vào server
  const handleSaveSingle = async () => {
    const idNum = Number(targetId);
    if (!Number.isFinite(idNum) || idNum < 0) {
      fb.error('Vui lòng nhập ID icon hợp lệ (số nguyên không âm)');
      return;
    }
    if (!previews.x4 || !previews.x1) {
      fb.error('Chưa có dữ liệu ảnh để lưu');
      return;
    }

    try {
      setSaving(true);
      const res = await apiPost('/assets/icons/save-single', {
        id: idNum,
        images: previews,
      });

      if (res?.ok) {
        fb.success(`🎉 Đã lưu và đồng bộ thành công Icon #${idNum} vào 4 thư mục data/icon (x1, x2, x3, x4)!`);
        fetchNextId();
      } else {
        fb.error(res?.error || 'Lỗi khi lưu icon');
      }
    } catch (err) {
      fb.error(err.message || 'Lỗi kết nối tới máy chủ');
    } finally {
      setSaving(false);
    }
  };

  // Tải về ZIP trọn bộ 4 Zoom
  const handleDownloadZip = async () => {
    const idNum = Number(targetId) || 0;
    if (!previews.x4) return;
    try {
      const zip = new JSZip();
      for (const z of [1, 2, 3, 4]) {
        const dataUrl = previews[`x${z}`];
        if (dataUrl) {
          const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
          zip.file(`icon/x${z}/${idNum}.png`, base64Data, { base64: true });
        }
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NRO_Icon_${idNum}_all_zooms.zip`;
      a.click();
      URL.revokeObjectURL(url);
      fb.success(`Đã tải về file ZIP cho Icon #${idNum}`);
    } catch (err) {
      fb.error('Không thể tạo file zip: ' + err.message);
    }
  };

  // === BATCH PROCESSOR ENGINE ===
  const handleBatchFilesSelect = (e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    const newItems = files.map((file, idx) => {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      const parsedId = parseInt(nameWithoutExt, 10);
      return {
        id: !isNaN(parsedId) && parsedId >= 0 ? parsedId : batchStartId + idx,
        file,
        name: file.name,
        size: file.size,
        status: 'pending', // 'pending' | 'ready' | 'saved' | 'error'
        img: null,
        previews: null,
      };
    });

    setBatchFiles(newItems);
    fb.info(`Đã nạp ${newItems.length} ảnh vào hàng đợi xử lý`);

    // Load Image objects in background
    newItems.forEach((item, idx) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          setBatchFiles((prev) => {
            const next = [...prev];
            if (next[idx]) {
              next[idx].img = img;
              next[idx].origW = img.naturalWidth || img.width;
              next[idx].origH = img.naturalHeight || img.height;
            }
            return next;
          });
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(item.file);
    });
  };

  // Xử lý lưu Batch toàn bộ
  const handleRunBatch = async () => {
    if (batchFiles.length === 0) {
      fb.error('Chưa có file ảnh nào trong hàng đợi');
      return;
    }

    setBatchProcessing(true);
    setBatchProgress({ current: 0, total: batchFiles.length, text: 'Đang xử lý kích thước...' });

    const processedBatch = [];

    for (let i = 0; i < batchFiles.length; i++) {
      const item = batchFiles[i];
      setBatchProgress({ current: i + 1, total: batchFiles.length, text: `Đang xử lý ${item.name}...` });

      if (!item.img) {
        // Wait or skip if image failed
        continue;
      }

      const assignedId = batchIdMode === 'filename'
        ? (Number.isFinite(item.id) ? item.id : batchStartId + i)
        : (batchStartId + i);

      // Render 4 zoom levels
      const intermediateCanvas = document.createElement('canvas');
      intermediateCanvas.width = item.img.naturalWidth || item.img.width;
      intermediateCanvas.height = item.img.naturalHeight || item.img.height;
      const iCtx = intermediateCanvas.getContext('2d');
      iCtx.drawImage(item.img, 0, 0);

      // Background removal
      if (batchBgRemove !== 'none') {
        const imgData = iCtx.getImageData(0, 0, intermediateCanvas.width, intermediateCanvas.height);
        const data = imgData.data;
        const tr = batchBgRemove === 'white' ? 255 : 0;
        const tg = batchBgRemove === 'white' ? 255 : 0;
        const tb = batchBgRemove === 'white' ? 255 : 0;
        const tol = Number(batchBgTol) || 30;
        for (let d = 0; d < data.length; d += 4) {
          if (colorDist(data[d], data[d + 1], data[d + 2], tr, tg, tb) <= tol) {
            data[d + 3] = 0;
          }
        }
        iCtx.putImageData(imgData, 0, 0);
      }

      let contentX = 0, contentY = 0, contentW = intermediateCanvas.width, contentH = intermediateCanvas.height;
      if (batchAutoTrim) {
        const bounds = getCanvasTrimBounds(intermediateCanvas);
        contentX = bounds.x; contentY = bounds.y; contentW = bounds.w; contentH = bounds.h;
      }

      const itemPreviews = {};
      [1, 2, 3, 4].forEach((z) => {
        const zw = batchTargetW * z;
        const zh = batchTargetH * z;
        const zCanvas = document.createElement('canvas');
        zCanvas.width = zw;
        zCanvas.height = zh;
        const zCtx = zCanvas.getContext('2d');
        zCtx.imageSmoothingEnabled = !batchPixelArt;

        let drawW = zw, drawH = zh;
        if (batchFitMode === 'contain') {
          const ratio = Math.min(zw / contentW, zh / contentH);
          drawW = Math.max(1, Math.round(contentW * ratio));
          drawH = Math.max(1, Math.round(contentH * ratio));
        } else if (batchFitMode === 'cover') {
          const ratio = Math.max(zw / contentW, zh / contentH);
          drawW = Math.max(1, Math.round(contentW * ratio));
          drawH = Math.max(1, Math.round(contentH * ratio));
        }
        zCtx.drawImage(
          intermediateCanvas,
          contentX, contentY, contentW, contentH,
          (zw - drawW) / 2, (zh - drawH) / 2, drawW, drawH
        );
        itemPreviews[`x${z}`] = zCanvas.toDataURL('image/png');
      });

      processedBatch.push({
        id: assignedId,
        images: itemPreviews,
      });
    }

    // Gửi batch lên server theo từng chunk 20 items
    const CHUNK_SIZE = 20;
    let savedCount = 0;

    for (let c = 0; c < processedBatch.length; c += CHUNK_SIZE) {
      const chunk = processedBatch.slice(c, c + CHUNK_SIZE);
      setBatchProgress({
        current: c + chunk.length,
        total: processedBatch.length,
        text: `Đang lưu ${c + 1} - ${c + chunk.length} / ${processedBatch.length} vào máy chủ...`,
      });

      try {
        const res = await apiPost('/assets/icons/upload-batch', { items: chunk });
        if (res?.ok) {
          savedCount += (res.data?.savedCount || chunk.length);
        }
      } catch (err) {
        console.error('Lỗi khi lưu batch chunk:', err);
      }
    }

    setBatchProcessing(false);
    setBatchProgress(null);
    fb.success(`🎉 Đã xử lý & lưu thành công ${savedCount} icon vào 4 thư mục data/icon/x1, x2, x3, x4!`);
  };

  // Tải ZIP Batch
  const handleDownloadBatchZip = async () => {
    if (batchFiles.length === 0) return;
    try {
      setBatchProcessing(true);
      setBatchProgress({ current: 0, total: batchFiles.length, text: 'Đang đóng gói file ZIP...' });

      const zip = new JSZip();
      for (let i = 0; i < batchFiles.length; i++) {
        const item = batchFiles[i];
        if (!item.img) continue;

        const assignedId = batchIdMode === 'filename'
          ? (Number.isFinite(item.id) ? item.id : batchStartId + i)
          : (batchStartId + i);

        // Render 4 zoom
        const intermediateCanvas = document.createElement('canvas');
        intermediateCanvas.width = item.img.naturalWidth || item.img.width;
        intermediateCanvas.height = item.img.naturalHeight || item.img.height;
        const iCtx = intermediateCanvas.getContext('2d');
        iCtx.drawImage(item.img, 0, 0);

        let contentX = 0, contentY = 0, contentW = intermediateCanvas.width, contentH = intermediateCanvas.height;
        if (batchAutoTrim) {
          const bounds = getCanvasTrimBounds(intermediateCanvas);
          contentX = bounds.x; contentY = bounds.y; contentW = bounds.w; contentH = bounds.h;
        }

        for (const z of [1, 2, 3, 4]) {
          const zw = batchTargetW * z;
          const zh = batchTargetH * z;
          const zCanvas = document.createElement('canvas');
          zCanvas.width = zw;
          zCanvas.height = zh;
          const zCtx = zCanvas.getContext('2d');
          zCtx.imageSmoothingEnabled = !batchPixelArt;

          let drawW = zw, drawH = zh;
          if (batchFitMode === 'contain') {
            const ratio = Math.min(zw / contentW, zh / contentH);
            drawW = Math.max(1, Math.round(contentW * ratio));
            drawH = Math.max(1, Math.round(contentH * ratio));
          }
          zCtx.drawImage(
            intermediateCanvas,
            contentX, contentY, contentW, contentH,
            (zw - drawW) / 2, (zh - drawH) / 2, drawW, drawH
          );

          const base64 = zCanvas.toDataURL('image/png').replace(/^data:image\/\w+;base64,/, '');
          zip.file(`icon/x${z}/${assignedId}.png`, base64, { base64: true });
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NRO_Batch_Icons_${batchFiles.length}_items.zip`;
      a.click();
      URL.revokeObjectURL(url);
      fb.success('Đã xuất thành công file ZIP hàng loạt!');
    } catch (err) {
      fb.error('Lỗi khi xuất ZIP: ' + err.message);
    } finally {
      setBatchProcessing(false);
      setBatchProgress(null);
    }
  };

  // === EXPLORER LOADER ===
  const loadExplorerData = useCallback(async () => {
    setExplorerLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(explorerPage),
        limit: '36',
        search: explorerSearch,
      });
      if (explorerMin) params.append('min', explorerMin);
      if (explorerMax) params.append('max', explorerMax);

      const res = await apiGet(`/assets/icons/list?${params.toString()}`);
      if (res?.ok && res.data) {
        setExplorerList(res.data.items || []);
        setExplorerTotalPages(res.data.pagination?.totalPages || 1);
        setExplorerTotal(res.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách icon explorer:', err);
    } finally {
      setExplorerLoading(false);
    }
  }, [explorerPage, explorerSearch, explorerMin, explorerMax]);

  useEffect(() => {
    if (activeTab === 'explorer') {
      loadExplorerData();
    }
  }, [activeTab, loadExplorerData]);

  // Xóa icon từ Explorer
  const handleDeleteIcon = async (idToDelete) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa Icon #${idToDelete} khỏi cả 4 thư mục x1..x4?`)) return;
    try {
      const res = await apiDelete(`/assets/icons/${idToDelete}`);
      if (res?.ok) {
        fb.success(`Đã xóa icon #${idToDelete}`);
        loadExplorerData();
      } else {
        fb.error(res?.error || 'Không thể xóa icon');
      }
    } catch (err) {
      fb.error(err.message);
    }
  };

  return (
    <div className="page-container icon-resizer-page">
      <PageHeader
        title="Tool Điều Chỉnh Kích Thước Icon (Icon Resizer Studio)"
        subtitle="Công cụ chuyên nghiệp căn chỉnh, crop, xóa nền và quy chuẩn kích thước ảnh theo chuẩn đồ họa game Ngọc Rồng Online (data/icon/x1, x2, x3, x4)"
      />

      <PageFeedback feedback={fb} />

      {/* Tabs navigation */}
      <div className="ui-tabs" style={{ marginBottom: '1.25rem' }}>
        <button
          className={`ui-tab-btn ${activeTab === 'studio' ? 'active' : ''}`}
          onClick={() => setActiveTab('studio')}
        >
          🎨 Studio Chỉnh Sửa Đơn Lẻ
        </button>
        <button
          className={`ui-tab-btn ${activeTab === 'batch' ? 'active' : ''}`}
          onClick={() => setActiveTab('batch')}
        >
          ⚡ Xử Lý & Đồng Bộ Hàng Loạt ({batchFiles.length})
        </button>
        <button
          className={`ui-tab-btn ${activeTab === 'explorer' ? 'active' : ''}`}
          onClick={() => setActiveTab('explorer')}
        >
          📁 Quản Lý & Tra Cứu data/icon ({explorerTotal})
        </button>
      </div>

      {/* ==================== TAB 1: STUDIO ==================== */}
      {activeTab === 'studio' && (
        <div className="resizer-studio-grid" style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1.25rem', alignItems: 'start' }}>
          
          {/* CỘT TRÁI: BỘ CÔNG CỤ ĐIỀU CHỈNH */}
          <div className="ui-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* 1. Nguồn ảnh */}
            <div className="tool-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600, color: '#f8fafc' }}>1. Chọn / Tải Ảnh Vào</span>
                {sourceImg && (
                  <span style={{ fontSize: '0.8rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                    {sourceInfo.width}×{sourceInfo.height} px
                  </span>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => loadSourceFile(e.target.files?.[0])}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault(); e.stopPropagation();
                  loadSourceFile(e.dataTransfer.files?.[0]);
                }}
                style={{
                  border: '2px dashed #475569',
                  borderRadius: '8px',
                  padding: '1.25rem 1rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'rgba(30, 41, 59, 0.5)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#38bdf8'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#475569'}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📤</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9' }}>
                  {sourceInfo.name ? sourceInfo.name : 'Chọn hoặc Kéo thả ảnh vào đây'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
                  Hỗ trợ PNG, JPG, WebP hoặc <kbd style={{ background: '#334155', padding: '2px 4px', borderRadius: 3 }}>Ctrl + V</kbd> để dán ảnh
                </div>
              </div>

              {/* Hoặc nạp từ ID có sẵn */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  type="number"
                  className="ui-input"
                  placeholder="Nhập ID có sẵn..."
                  style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') loadServerIconToStudio(e.currentTarget.value);
                  }}
                  id="inputLoadServerId"
                />
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary"
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                  onClick={() => {
                    const el = document.getElementById('inputLoadServerId');
                    if (el?.value) loadServerIconToStudio(el.value);
                  }}
                >
                  Nạp Icon Cũ
                </button>
              </div>
            </div>

            {/* 2. Quy chuẩn Kích thước 1x */}
            <div className="tool-section">
              <span style={{ fontWeight: 600, color: '#f8fafc', display: 'block', marginBottom: '0.5rem' }}>
                2. Kích Thước Chuẩn Game (1x)
              </span>

              <select
                className="ui-select"
                style={{ width: '100%', marginBottom: '0.5rem' }}
                value={isCustomPreset ? -1 : presetIndex}
                onChange={(e) => handlePresetSelect(Number(e.target.value))}
              >
                {NRO_PRESETS.map((p, idx) => (
                  <option key={idx} value={idx}>{p.label}</option>
                ))}
                <option value={-1}>⚙️ Tùy chỉnh kích thước riêng (Custom W×H)</option>
              </select>

              {isCustomPreset && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Rộng 1x (px)</label>
                    <input
                      type="number"
                      className="ui-input"
                      value={customW}
                      onChange={(e) => setCustomW(Math.max(1, Number(e.target.value) || 1))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Cao 1x (px)</label>
                    <input
                      type="number"
                      className="ui-input"
                      value={customH}
                      onChange={(e) => setCustomH(Math.max(1, Number(e.target.value) || 1))}
                    />
                  </div>
                </div>
              )}

              {/* Fit Mode & Pixel Art */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Chế độ Khung</label>
                  <select
                    className="ui-select"
                    style={{ width: '100%' }}
                    value={fitMode}
                    onChange={(e) => setFitMode(e.target.value)}
                  >
                    <option value="contain">Fit Căn Giữa (Khuyên Dùng)</option>
                    <option value="cover">Fill Kín Khung (Crop)</option>
                    <option value="stretch">Kéo Dãn (Stretch)</option>
                    <option value="original">Giữ Tỉ Lệ Thô</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Thuật toán Render</label>
                  <select
                    className="ui-select"
                    style={{ width: '100%' }}
                    value={pixelArt ? 'pixel' : 'smooth'}
                    onChange={(e) => setPixelArt(e.target.value === 'pixel')}
                  >
                    <option value="pixel">Pixel Art (Nét Chuẩn NRO)</option>
                    <option value="smooth">Smooth (Làm mịn)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 3. Tự động Cắt viền & Xóa nền */}
            <div className="tool-section">
              <span style={{ fontWeight: 600, color: '#f8fafc', display: 'block', marginBottom: '0.5rem' }}>
                3. Xóa Phông & Cắt Viền Trống
              </span>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.85rem', color: '#e2e8f0' }}>
                  <input
                    type="checkbox"
                    checked={autoTrim}
                    onChange={(e) => setAutoTrim(e.target.checked)}
                  />
                  Auto Trim (Xóa viền trong suốt thừa)
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Xóa Màu Nền</label>
                  <select
                    className="ui-select"
                    style={{ width: '100%' }}
                    value={bgRemoveMode}
                    onChange={(e) => setBgRemoveMode(e.target.value)}
                  >
                    <option value="none">Không xóa nền</option>
                    <option value="white">Xóa nền trắng</option>
                    <option value="black">Xóa nền đen</option>
                    <option value="custom">Màu tự chọn...</option>
                  </select>
                </div>

                {bgRemoveMode !== 'none' && (
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Độ nhạy (Tolerance: {bgTolerance})</label>
                    <input
                      type="range"
                      min="5"
                      max="120"
                      value={bgTolerance}
                      onChange={(e) => setBgTolerance(Number(e.target.value))}
                      style={{ width: '100%', marginTop: 6 }}
                    />
                  </div>
                )}
              </div>

              {bgRemoveMode === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input
                    type="color"
                    value={customBgColor}
                    onChange={(e) => setCustomBgColor(e.target.value)}
                    style={{ width: 36, height: 28, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    className="ui-input"
                    value={customBgColor}
                    onChange={(e) => setCustomBgColor(e.target.value)}
                    style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                  />
                </div>
              )}
            </div>

            {/* 4. Tinh chỉnh Vị trí & Thu Phóng Thủ Công */}
            <div className="tool-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600, color: '#f8fafc' }}>4. Tinh Chỉnh Tọa Độ & Kích Thước</span>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.75rem' }}
                  onClick={() => {
                    setScalePercent(100);
                    setOffsetX(0);
                    setOffsetY(0);
                    setRotation(0);
                    setFlipH(false);
                    setFlipV(false);
                  }}
                >
                  Reset Về Gốc
                </button>
              </div>

              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                  <span>Phóng to / Thu nhỏ:</span>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>{scalePercent}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="300"
                  value={scalePercent}
                  onChange={(e) => setScalePercent(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                    <span>Dịch X:</span>
                    <span>{offsetX}px</span>
                  </div>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    value={offsetX}
                    onChange={(e) => setOffsetX(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                    <span>Dịch Y:</span>
                    <span>{offsetY}px</span>
                  </div>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    value={offsetY}
                    onChange={(e) => setOffsetY(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Nút Xoay / Lật */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary"
                  style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                >
                  🔄 Xoay 90°
                </button>
                <button
                  type="button"
                  className={`ui-btn ${flipH ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
                  style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                  onClick={() => setFlipH((f) => !f)}
                >
                  ↔️ Lật Ngang
                </button>
                <button
                  type="button"
                  className={`ui-btn ${flipV ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
                  style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                  onClick={() => setFlipV((f) => !f)}
                >
                  ↕️ Lật Dọc
                </button>
              </div>
            </div>

            {/* 5. Đặt ID & Lưu */}
            <div className="tool-section" style={{ background: 'rgba(56, 189, 248, 0.05)', padding: '1rem', borderRadius: 8, border: '1px solid rgba(56, 189, 248, 0.2)' }}>
              <span style={{ fontWeight: 600, color: '#38bdf8', display: 'block', marginBottom: '0.5rem' }}>
                5. Thiết Lập ID & Đồng Bộ Máy Chủ
              </span>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ID Icon Mục Tiêu</label>
                  <input
                    type="number"
                    className="ui-input"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    placeholder="VD: 15420"
                    style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1rem' }}
                  />
                </div>
                {nextSuggestedId && (
                  <button
                    type="button"
                    className="ui-btn ui-btn-secondary"
                    style={{ marginTop: 18, fontSize: '0.75rem', padding: '0.45rem 0.6rem' }}
                    onClick={() => setTargetId(String(nextSuggestedId))}
                    title="Lấy ID trống tiếp theo lớn nhất trên server"
                  >
                    💡 ID Mới (#{nextSuggestedId})
                  </button>
                )}
              </div>

              {inspectExisting && (
                <div style={{ fontSize: '0.8rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '6px 10px', borderRadius: 6, marginBottom: '0.75rem' }}>
                  ⚠️ <strong>Cảnh báo:</strong> Icon #{targetId} đã tồn tại trên server ({inspectExisting.x4?.width}×{inspectExisting.x4?.height}px). Lưu sẽ ghi đè!
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="ui-btn ui-btn-primary"
                  style={{ width: '100%', padding: '0.65rem', fontWeight: 600, fontSize: '0.95rem' }}
                  disabled={saving || !sourceImg}
                  onClick={handleSaveSingle}
                >
                  {saving ? '⏳ Đang lưu vào data/icon...' : `⚡ Lưu Trực Tiếp vào data/icon (#${targetId || 0})`}
                </button>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="ui-btn ui-btn-secondary"
                    style={{ flex: 1, fontSize: '0.8rem' }}
                    disabled={!previews.x4}
                    onClick={handleDownloadZip}
                  >
                    💾 Tải Về ZIP (x1..x4)
                  </button>
                  {previews.x4 && (
                    <a
                      href={previews.x4}
                      download={`${targetId || 'icon'}_x4.png`}
                      className="ui-btn ui-btn-secondary"
                      style={{ fontSize: '0.8rem', textDecoration: 'none', textAlign: 'center' }}
                    >
                      Tải PNG x4
                    </a>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* CỘT PHẢI: KHU VỰC XEM TRƯỚC TRỰC QUAN ĐA NỀN TẢNG */}
          <div className="ui-card" style={{ padding: '1.25rem' }}>
            
            {/* Thanh công cụ Preview */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #334155', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc' }}>
                  👁️ Xem Trước Trực Quan Cả 4 Cấp Độ Zoom
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Quy chuẩn chính xác tỉ lệ x1 (1x), x2 (2x), x3 (3x), x4 (4x) của game Ngọc Rồng
                </span>
              </div>

              {/* Nền xem trước */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Nền:</span>
                {[
                  { id: 'grid', label: '🏁 Caro' },
                  { id: 'dark', label: '⬛ Tối' },
                  { id: 'light', label: '⬜ Sáng' },
                  { id: 'nro_green', label: '🌿 Game' },
                ].map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    className={`ui-btn ${previewBg === bg.id ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
                    style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                    onClick={() => setPreviewBg(bg.id)}
                  >
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Background Style Helper */}
            {(() => {
              const bgStyle = previewBg === 'grid'
                ? {
                    backgroundImage: 'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                    backgroundSize: '16px 16px',
                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                    backgroundColor: '#0f172a',
                  }
                : previewBg === 'dark'
                ? { backgroundColor: '#020617' }
                : previewBg === 'light'
                ? { backgroundColor: '#f8fafc' }
                : { backgroundColor: '#14532d' }; // NRO green

              return (
                <div>
                  {/* Grid 4 cấp độ zoom */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    {[
                      { z: 4, name: 'x4 (Client HD / Panel)', mult: 4 },
                      { z: 3, name: 'x3 (Client Cao)', mult: 3 },
                      { z: 2, name: 'x2 (Client Trung bình)', mult: 2 },
                      { z: 1, name: 'x1 (Client Gốc / Java)', mult: 1 },
                    ].map((item) => {
                      const imgData = previews[`x${item.z}`];
                      const dim = previewDims[`x${item.z}`];

                      return (
                        <div
                          key={item.z}
                          style={{
                            background: '#0f172a',
                            borderRadius: 8,
                            padding: '0.75rem',
                            border: '1px solid #334155',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                          }}
                        >
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', marginBottom: 2 }}>
                            Thư mục x{item.z}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginBottom: '0.75rem' }}>
                            {dim.w} × {dim.h} px
                          </div>

                          {/* Khung hiển thị ảnh */}
                          <div
                            style={{
                              width: '100%',
                              height: 140,
                              borderRadius: 6,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              border: '1px solid rgba(255,255,255,0.1)',
                              ...bgStyle,
                            }}
                          >
                            {imgData ? (
                              <img
                                src={imgData}
                                alt={`x${item.z}`}
                                style={{
                                  imageRendering: pixelArt ? 'pixelated' : 'auto',
                                  maxWidth: '90%',
                                  maxHeight: '90%',
                                }}
                              />
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Chưa có ảnh</span>
                            )}
                          </div>

                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.5rem', textAlign: 'center' }}>
                            {item.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Mô phỏng Giao diện Game Thực Tế */}
                  <div style={{ background: '#0f172a', borderRadius: 8, padding: '1.25rem', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>🎮 Mô Phỏng Hiển Thị Trong Game Ngọc Rồng</span>
                      
                      {/* Input so sánh với Icon khác */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                        <span style={{ color: '#94a3b8' }}>So sánh với Icon #:</span>
                        <input
                          type="number"
                          className="ui-input"
                          value={compareId}
                          onChange={(e) => setCompareId(e.target.value)}
                          style={{ width: 70, padding: '2px 6px', fontSize: '0.8rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                      
                      {/* 1. Ô Inventory NRO kinh điển */}
                      <div style={{ background: '#1e293b', padding: '1rem', borderRadius: 8, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
                          Ô Hành Trang (Inventory Slot)
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
                          
                          {/* Item vừa tạo */}
                          <div style={{ textAlign: 'center' }}>
                            <div
                              style={{
                                width: 52,
                                height: 52,
                                background: '#3b2d1d',
                                border: '2px solid #854d0e',
                                borderRadius: 6,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: 'inset 0 0 6px rgba(0,0,0,0.8)',
                                position: 'relative',
                                margin: '0 auto',
                              }}
                            >
                              {previews.x4 && (
                                <img
                                  src={previews.x4}
                                  alt="Preview"
                                  style={{
                                    maxWidth: 44,
                                    maxHeight: 44,
                                    imageRendering: pixelArt ? 'pixelated' : 'auto',
                                  }}
                                />
                              )}
                              <span style={{ position: 'absolute', bottom: 1, right: 3, fontSize: '0.65rem', color: '#fef08a', fontWeight: 700 }}>
                                99
                              </span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#e2e8f0', marginTop: 4, display: 'block' }}>
                              Icon mới (#{targetId || '?'})
                            </span>
                          </div>

                          {/* Item so sánh */}
                          {compareId && (
                            <div style={{ textAlign: 'center' }}>
                              <div
                                style={{
                                  width: 52,
                                  height: 52,
                                  background: '#3b2d1d',
                                  border: '2px solid #854d0e',
                                  borderRadius: 6,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: 'inset 0 0 6px rgba(0,0,0,0.8)',
                                  margin: '0 auto',
                                }}
                              >
                                <img
                                  src={`/api/v1/assets/icons/raw/4/${compareId}.png`}
                                  alt="Compare"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  style={{ maxWidth: 44, maxHeight: 44, imageRendering: 'pixelated' }}
                                />
                              </div>
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4, display: 'block' }}>
                                Mẫu (#{compareId})
                              </span>
                            </div>
                          )}

                        </div>
                      </div>

                      {/* 2. Ô Cửa Hàng Shop */}
                      <div style={{ background: '#1e293b', padding: '1rem', borderRadius: 8 }}>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.75rem', textAlign: 'center' }}>
                          Khung Shop NPC NRO
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#0f172a', padding: '0.5rem', borderRadius: 6, border: '1px solid #334155' }}>
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              background: '#334155',
                              borderRadius: 4,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {previews.x4 && (
                              <img
                                src={previews.x4}
                                alt="Shop item"
                                style={{ maxWidth: 38, maxHeight: 38, imageRendering: pixelArt ? 'pixelated' : 'auto' }}
                              />
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                              Vật Phẩm Mới #{targetId || 0}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>
                              💰 50,000 Vàng
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. Ô Avatar & Cờ Bang */}
                      <div style={{ background: '#1e293b', padding: '1rem', borderRadius: 8, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
                          Avatar / Cờ Bang Hội
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                          <div
                            style={{
                              width: 50,
                              height: 50,
                              borderRadius: '50%',
                              border: '2px solid #38bdf8',
                              background: '#0f172a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                            }}
                          >
                            {previews.x4 && (
                              <img
                                src={previews.x4}
                                alt="Avatar"
                                style={{ maxWidth: '85%', maxHeight: '85%', imageRendering: pixelArt ? 'pixelated' : 'auto' }}
                              />
                            )}
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              );
            })()}

          </div>

        </div>
      )}

      {/* ==================== TAB 2: XỬ LÝ HÀNG LOẠT ==================== */}
      {activeTab === 'batch' && (
        <div className="resizer-batch-layout" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Cấu hình hàng loạt */}
          <div className="ui-card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#f8fafc' }}>
              ⚙️ Cấu Hình Quy Chuẩn Hàng Loạt
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
              
              {/* Kích thước mục tiêu 1x */}
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                  Kích thước mục tiêu 1x
                </label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="number"
                    className="ui-input"
                    value={batchTargetW}
                    onChange={(e) => setBatchTargetW(Math.max(1, Number(e.target.value) || 1))}
                    style={{ width: '50%' }}
                    placeholder="W"
                  />
                  <input
                    type="number"
                    className="ui-input"
                    value={batchTargetH}
                    onChange={(e) => setBatchTargetH(Math.max(1, Number(e.target.value) || 1))}
                    style={{ width: '50%' }}
                    placeholder="H"
                  />
                </div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2, display: 'block' }}>
                  (x4 sẽ tự nhân thành {batchTargetW * 4}×{batchTargetH * 4}px)
                </span>
              </div>

              {/* Quy tắc ID */}
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                  Quy tắc gán ID
                </label>
                <select
                  className="ui-select"
                  style={{ width: '100%', marginBottom: 4 }}
                  value={batchIdMode}
                  onChange={(e) => setBatchIdMode(e.target.value)}
                >
                  <option value="filename">Lấy theo số trong tên file (1234.png → #1234)</option>
                  <option value="start_id">Tự động tăng từ ID bắt đầu...</option>
                </select>
                {batchIdMode === 'start_id' && (
                  <input
                    type="number"
                    className="ui-input"
                    value={batchStartId}
                    onChange={(e) => setBatchStartId(Number(e.target.value) || 0)}
                    placeholder="ID bắt đầu..."
                  />
                )}
              </div>

              {/* Xóa nền & Auto Trim */}
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                  Xóa nền & Cắt viền
                </label>
                <select
                  className="ui-select"
                  style={{ width: '100%', marginBottom: 4 }}
                  value={batchBgRemove}
                  onChange={(e) => setBatchBgRemove(e.target.value)}
                >
                  <option value="none">Giữ nguyên nền gốc</option>
                  <option value="white">Tự động xóa nền trắng</option>
                  <option value="black">Tự động xóa nền đen</option>
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#e2e8f0', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={batchAutoTrim}
                    onChange={(e) => setBatchAutoTrim(e.target.checked)}
                  />
                  Auto Trim viền trong suốt
                </label>
              </div>

              {/* Thuật toán & Fit */}
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                  Thuật toán & Khung
                </label>
                <select
                  className="ui-select"
                  style={{ width: '100%', marginBottom: 4 }}
                  value={batchFitMode}
                  onChange={(e) => setBatchFitMode(e.target.value)}
                >
                  <option value="contain">Fit Căn Giữa (Khuyên Dùng)</option>
                  <option value="cover">Fill Kín Khung (Crop)</option>
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#e2e8f0', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={batchPixelArt}
                    onChange={(e) => setBatchPixelArt(e.target.checked)}
                  />
                  Pixel Art (Sắc nét NRO)
                </label>
              </div>

            </div>

            {/* Drag drop / Input buttons */}
            <input
              ref={batchFileInputRef}
              type="file"
              multiple
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleBatchFilesSelect}
            />
            <input
              ref={batchFolderInputRef}
              type="file"
              webkitdirectory=""
              directory=""
              style={{ display: 'none' }}
              onChange={handleBatchFilesSelect}
            />

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                className="ui-btn ui-btn-primary"
                onClick={() => batchFileInputRef.current?.click()}
              >
                📂 Chọn Nhiều File Ảnh
              </button>
              <button
                type="button"
                className="ui-btn ui-btn-secondary"
                onClick={() => batchFolderInputRef.current?.click()}
              >
                📁 Chọn Cả Thư Mục Ảnh
              </button>
              {batchFiles.length > 0 && (
                <>
                  <button
                    type="button"
                    className="ui-btn ui-btn-secondary"
                    style={{ color: '#f87171' }}
                    onClick={() => setBatchFiles([])}
                  >
                    🗑️ Xóa Danh Sách ({batchFiles.length})
                  </button>
                  <div style={{ flex: 1 }} />
                  <button
                    type="button"
                    className="ui-btn ui-btn-secondary"
                    disabled={batchProcessing}
                    onClick={handleDownloadBatchZip}
                  >
                    📦 Xuất Trọn Bộ File ZIP (x1..x4)
                  </button>
                  <button
                    type="button"
                    className="ui-btn ui-btn-primary"
                    style={{ background: '#10b981', borderColor: '#10b981' }}
                    disabled={batchProcessing}
                    onClick={handleRunBatch}
                  >
                    {batchProcessing ? '⏳ Đang xử lý...' : `⚡ Lưu & Đồng Bộ ${batchFiles.length} Icon Vào Máy Chủ`}
                  </button>
                </>
              )}
            </div>

            {/* Progress bar */}
            {batchProgress && (
              <div style={{ marginTop: '1rem', background: '#0f172a', padding: '0.75rem', borderRadius: 6, border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#f8fafc', marginBottom: 6 }}>
                  <span>{batchProgress.text}</span>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>{batchProgress.current} / {batchProgress.total}</span>
                </div>
                <div style={{ width: '100%', height: 8, background: '#334155', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      background: '#38bdf8',
                      width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                      transition: 'width 0.2s',
                    }}
                  />
                </div>
              </div>
            )}

          </div>

          {/* Danh sách file trong hàng đợi */}
          <div className="ui-card" style={{ padding: '1.25rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: '#f8fafc' }}>
              Danh Sách Hàng Đợi ({batchFiles.length} icon)
            </h4>

            {batchFiles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                Chưa có ảnh nào trong hàng đợi. Nhấn <strong>"Chọn Nhiều File Ảnh"</strong> hoặc <strong>"Chọn Cả Thư Mục Ảnh"</strong> ở trên để bắt đầu.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', maxHeight: 500, overflowY: 'auto' }}>
                {batchFiles.map((item, idx) => {
                  const assignedId = batchIdMode === 'filename'
                    ? (Number.isFinite(item.id) ? item.id : batchStartId + idx)
                    : (batchStartId + idx);

                  return (
                    <div
                      key={idx}
                      style={{
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: 6,
                        padding: '0.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          width: 60,
                          height: 60,
                          background: '#1e293b',
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        {item.img ? (
                          <img
                            src={item.img.src}
                            alt={item.name}
                            style={{ maxWidth: '90%', maxHeight: '90%', imageRendering: 'pixelated' }}
                          />
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Đang nạp...</span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#38bdf8' }}>
                        #{assignedId}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                        {item.name}
                      </div>
                      {item.origW && (
                        <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                          Gốc: {item.origW}×{item.origH} → x4: {batchTargetW * 4}×{batchTargetH * 4}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ==================== TAB 3: EXPLORER ==================== */}
      {activeTab === 'explorer' && (
        <div className="resizer-explorer-layout" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Thanh tìm kiếm & lọc */}
          <div className="ui-card" style={{ padding: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <input
                type="text"
                className="ui-input"
                placeholder="🔍 Tìm kiếm theo ID Icon (VD: 15400)..."
                value={explorerSearch}
                onChange={(e) => {
                  setExplorerSearch(e.target.value);
                  setExplorerPage(1);
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Dải ID:</span>
              <input
                type="number"
                className="ui-input"
                placeholder="Min"
                style={{ width: 80 }}
                value={explorerMin}
                onChange={(e) => { setExplorerMin(e.target.value); setExplorerPage(1); }}
              />
              <span>-</span>
              <input
                type="number"
                className="ui-input"
                placeholder="Max"
                style={{ width: 80 }}
                value={explorerMax}
                onChange={(e) => { setExplorerMax(e.target.value); setExplorerPage(1); }}
              />
            </div>

            <button
              type="button"
              className="ui-btn ui-btn-primary"
              onClick={loadExplorerData}
            >
              🔄 Làm mới
            </button>
          </div>

          {/* Grid hiển thị icon */}
          <div className="ui-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                Tổng cộng: <strong style={{ color: '#38bdf8' }}>{explorerTotal}</strong> icon trên máy chủ
              </span>

              {/* Phân trang */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary"
                  disabled={explorerPage <= 1}
                  onClick={() => setExplorerPage((p) => Math.max(1, p - 1))}
                  style={{ padding: '2px 8px', fontSize: '0.8rem' }}
                >
                  ◀ Trang trước
                </button>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Trang {explorerPage} / {explorerTotalPages || 1}
                </span>
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary"
                  disabled={explorerPage >= explorerTotalPages}
                  onClick={() => setExplorerPage((p) => Math.min(explorerTotalPages, p + 1))}
                  style={{ padding: '2px 8px', fontSize: '0.8rem' }}
                >
                  Trang sau ▶
                </button>
              </div>
            </div>

            {explorerLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                <span className="ui-spinner" style={{ marginRight: 8 }} /> Đang tải danh sách icon...
              </div>
            ) : explorerList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                Không tìm thấy icon nào phù hợp với bộ lọc.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0.75rem' }}>
                {explorerList.map((item) => {
                  const x4 = item.zooms?.x4;
                  const x1 = item.zooms?.x1;

                  return (
                    <div
                      key={item.id}
                      style={{
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: 8,
                        padding: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        position: 'relative',
                      }}
                    >
                      {/* ID Badge */}
                      <div style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.9rem', marginBottom: 4 }}>
                        #{item.id}
                      </div>

                      {/* Khung ảnh */}
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          background: '#1e293b',
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '0.5rem',
                          border: '1px solid rgba(255,255,255,0.05)',
                        }}
                      >
                        <img
                          src={item.url}
                          alt={`Icon ${item.id}`}
                          loading="lazy"
                          style={{ maxWidth: 56, maxHeight: 56, imageRendering: 'pixelated' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>

                      {/* Kích thước */}
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', marginBottom: '0.5rem' }}>
                        {x4?.exists && <div>x4: {x4.width}×{x4.height} px</div>}
                        {x1?.exists && <div style={{ color: '#64748b' }}>x1: {x1.width}×{x1.height} px</div>}
                      </div>

                      {/* Nút hành động */}
                      <div style={{ display: 'flex', gap: '0.25rem', width: '100%', marginTop: 'auto' }}>
                        <button
                          type="button"
                          className="ui-btn ui-btn-secondary"
                          style={{ flex: 1, padding: '2px 4px', fontSize: '0.7rem' }}
                          onClick={() => loadServerIconToStudio(item.id)}
                          title="Đưa vào Studio để căn chỉnh lại kích thước"
                        >
                          ✏️ Sửa Kích Cỡ
                        </button>
                        <button
                          type="button"
                          className="ui-btn ui-btn-secondary"
                          style={{ color: '#f87171', padding: '2px 6px', fontSize: '0.7rem' }}
                          onClick={() => handleDeleteIcon(item.id)}
                          title="Xóa icon khỏi máy chủ"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
