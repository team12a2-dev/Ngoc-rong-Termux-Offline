import { useEffect, useState, useMemo, useRef } from 'react';
import JSZip from 'jszip';
import { api, getServerId } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';
import ItemIcon from '../components/ItemIcon';

const SAMPLE_PICCOLO = `2033	5	3	Cải trang chú hề Picolo	Hề Hước : Tăng 5% né cho người xung quanh	1	17121	2006	0	0	0	0	2006	2007	2008
2006	0	[[17094,3,2],[17095,3,3],[2955,0,0]]
2007	1	[[17096,0,0],[17097,0,-1],[17098,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[17099,1,-1],[17100,0,0],[17101,0,0],[17102,0,0],[17103,0,0],[17104,0,-1],[17105,0,0],[17106,0,0],[17107,0,0],[2955,0,0]]
2008	2	[[17108,9,7],[17109,-1,-1],[17110,0,0],[17111,0,-5],[17112,-1,-6],[17113,0,-6],[17114,0,-6],[17115,1,1],[17116,0,0],[17117,0,0],[17118,0,-1],[17119,-1,0],[17120,-1,-1],[2955,0,0]]
2006	17122`;

const SAMPLE_FLAG_BAG = `301	14250,13996,13997,13998,13999,14000	Lưỡi hái Hoàng Kim	-1	-1	14010`;

function parsePartFrames(dataStr) {
  if (!dataStr) return [];
  try {
    const parsed = typeof dataStr === 'string' ? JSON.parse(dataStr.replace(/\\"/g, '"')) : dataStr;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => {
        if (Array.isArray(item)) {
          return { icon: Number(item[0]), dx: Number(item[1] || 0), dy: Number(item[2] || 0) };
        }
        if (typeof item === 'string') {
          const match = item.match(/\[?(\d+)[,\s]+(-?\d+)[,\s]+(-?\d+)\]?/);
          if (match) {
            return { icon: Number(match[1]), dx: Number(match[2]), dy: Number(match[3]) };
          }
        }
        return null;
      }).filter(Boolean);
    }
  } catch {
    const matches = [...String(dataStr).matchAll(/\[(\d+)[,\s]+(-?\d+)[,\s]+(-?\d+)\]/g)];
    return matches.map((m) => ({ icon: Number(m[1]), dx: Number(m[2]), dy: Number(m[3]) }));
  }
  return [];
}

/** Resize an Image object to all 4 zoom levels using HTML5 Canvas */
async function generateZoomsFromImage(img, sourceZoom = 4, smooth = false) {
  const baseW = img.naturalWidth || img.width;
  const baseH = img.naturalHeight || img.height;

  const unitW = baseW / sourceZoom;
  const unitH = baseH / sourceZoom;

  const renderZoom = (zoomLevel) => {
    const targetW = Math.max(1, Math.round(unitW * zoomLevel));
    const targetH = Math.max(1, Math.round(unitH * zoomLevel));
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = smooth;
    if (smooth) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetW, targetH);
    return {
      dataUrl: canvas.toDataURL('image/png'),
      w: targetW,
      h: targetH,
    };
  };

  return {
    x4: renderZoom(4),
    x3: renderZoom(3),
    x2: renderZoom(2),
    x1: renderZoom(1),
  };
}

/** Recursively read files from dragged directory entries */
async function scanFilesFromEntry(entry) {
  if (entry.isFile) {
    return new Promise((resolve) => {
      entry.file((file) => resolve([file]));
    });
  }
  if (entry.isDirectory) {
    const dirReader = entry.createReader();
    const readAllEntries = async () => {
      const all = [];
      let batch;
      do {
        batch = await new Promise((resolve) => {
          dirReader.readEntries((results) => resolve(results || []), () => resolve([]));
        });
        all.push(...batch);
      } while (batch.length > 0);
      return all;
    };
    const entries = await readAllEntries();
    const subFiles = await Promise.all(entries.map((e) => scanFilesFromEntry(e)));
    return subFiles.flat();
  }
  return [];
}

export default function QuickImportPage() {
  const [activeTab, setActiveTab] = useState('smart'); // 'smart' | 'studio' | 'icons'
  const [rawText, setRawText] = useState('');
  const [dbStats, setDbStats] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [conflictMode, setConflictMode] = useState('upsert'); // 'upsert' | 'auto_remap' | 'ignore' | 'strict'
  const [useRemappedView, setUseRemappedView] = useState(false);
  const [reloadAfter, setReloadAfter] = useState(true);
  const [busy, setBusy] = useState(false);
  const [parsing, setParsing] = useState(false);
  const fb = useFeedback();

  // Studio form states
  const [studioItem, setStudioItem] = useState({
    id: 0,
    type: 5,
    gender: 3,
    name: 'Cải trang chú hề Picolo',
    description: 'Hề Hước : Tăng 5% né cho người xung quanh',
    level: 1,
    icon_id: 17121,
    part: 2006,
    is_up_to_up: 0,
    power_require: 0,
    gold: 0,
    gem: 0,
    head: 2006,
    body: 2007,
    leg: 2008,
  });
  const [studioPartHead, setStudioPartHead] = useState({ id: 2006, data: '[[17094,3,2],[17095,3,3],[2955,0,0]]' });
  const [studioPartBody, setStudioPartBody] = useState({ id: 2007, data: '[[17096,0,0],[17097,0,-1],[17098,0,0],[2955,0,0]]' });
  const [studioPartLeg, setStudioPartLeg] = useState({ id: 2008, data: '[[17108,9,7],[17109,-1,-1],[17110,0,0],[2955,0,0]]' });
  const [studioAvatarId, setStudioAvatarId] = useState(17122);

  // Icon Sync Tool states
  const [iconQueue, setIconQueue] = useState([]);
  const [sourceZoom, setSourceZoom] = useState(4);
  const [pixelSmoothing, setPixelSmoothing] = useState(false);
  const [inspectId, setInspectId] = useState('');
  const [inspectResult, setInspectResult] = useState(null);
  const [uploadingIcons, setUploadingIcons] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // { current, total, text }
  const [dragOver, setDragOver] = useState(false);

  // Pagination for Icon Table
  const [iconPage, setIconPage] = useState(1);
  const [iconSearch, setIconSearch] = useState('');
  const PAGE_SIZE = 50;

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const zipInputRef = useRef(null);

  // Active dataset depending on Remap or Original view
  const activeData = useMemo(() => {
    if (!previewData) return null;
    if ((useRemappedView || conflictMode === 'auto_remap') && previewData.remappedData) {
      return previewData.remappedData;
    }
    return previewData;
  }, [previewData, useRemappedView, conflictMode]);

  async function loadStats() {
    try {
      const res = await api('/quick-import/stats');
      if (res.data) {
        setDbStats(res.data);
        if (studioItem.id === 0) {
          const nextItemId = res.data.item_template.nextId || 2033;
          const nextPartId = res.data.part.nextId || 2006;
          setStudioItem((prev) => ({
            ...prev,
            id: nextItemId,
            part: nextPartId,
            head: nextPartId,
            body: nextPartId + 1,
            leg: nextPartId + 2,
          }));
          setStudioPartHead((prev) => ({ ...prev, id: nextPartId }));
          setStudioPartBody((prev) => ({ ...prev, id: nextPartId + 1 }));
          setStudioPartLeg((prev) => ({ ...prev, id: nextPartId + 2 }));
        }
      }
    } catch (e) {
      fb.error(`Không tải được thống kê Database: ${e.message}`);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  async function analyzeRawText(textToAnalyze) {
    const text = textToAnalyze !== undefined ? textToAnalyze : rawText;
    if (!text.trim()) {
      setPreviewData(null);
      return;
    }
    setParsing(true);
    try {
      const res = await api('/quick-import/preview', {
        method: 'POST',
        body: JSON.stringify({ rawText: text }),
      });
      setPreviewData(res.data);
      if (res.data.summary.hasConflicts) {
        fb.info(`Phát hiện ${res.data.summary.totalConflicts} ID đã tồn tại trong Database. Bạn có thể chọn Tự Động Đổi Sang ID Mới!`);
      } else {
        fb.success(`Đã phân tích: ${res.data.summary.itemsCount} Item, ${res.data.summary.partsCount} Part, ${res.data.summary.headAvatarsCount} Avatar, ${res.data.summary.flagBagsCount} Flag Bag`);
      }
    } catch (e) {
      fb.error(`Lỗi phân tích cú pháp: ${e.message}`);
    } finally {
      setParsing(false);
    }
  }

  async function analyzeStudioData() {
    setParsing(true);
    try {
      const customData = {
        items: [studioItem],
        parts: [
          { id: studioPartHead.id, type: 0, data: studioPartHead.data },
          { id: studioPartBody.id, type: 1, data: studioPartBody.data },
          { id: studioPartLeg.id, type: 2, data: studioPartLeg.data },
        ],
        headAvatars: studioAvatarId ? [{ head_id: studioPartHead.id, avatar_id: Number(studioAvatarId) }] : [],
        flagBags: [],
        unrecognized: [],
      };
      const res = await api('/quick-import/preview', {
        method: 'POST',
        body: JSON.stringify({ customData }),
      });
      setPreviewData(res.data);
      if (res.data.summary.hasConflicts) {
        fb.info(`Phát hiện ${res.data.summary.totalConflicts} ID đã tồn tại trong DB. Có thể bật Tự Động Gán ID Mới!`);
      } else {
        fb.success(`Đã chuẩn bị bộ cải trang: Item #${studioItem.id}, 3 Part (${studioPartHead.id}, ${studioPartBody.id}, ${studioPartLeg.id})`);
      }
    } catch (e) {
      fb.error(e.message);
    } finally {
      setParsing(false);
    }
  }

  async function executeImport() {
    if (!previewData || !activeData) return;
    setBusy(true);
    try {
      const res = await api('/quick-import/execute', {
        method: 'POST',
        body: JSON.stringify({
          items: activeData.items,
          parts: activeData.parts,
          headAvatars: activeData.headAvatars,
          flagBags: activeData.flagBags,
          conflictMode,
          serverId: getServerId(),
          reloadAfter,
        }),
      });

      const { report, runtimeReload } = res.data;
      let msg = `Đã nạp thành công vào MariaDB XAMPP: ${report.itemsSaved} item, ${report.partsSaved} part, ${report.headAvatarsSaved} avatar, ${report.flagBagsSaved} cờ!`;
      if (report.remapped && Object.keys(report.remapped.partIdMap || {}).length > 0) {
        msg += ' (Đã tự động đổi sang dải ID mới)';
      }
      if (reloadAfter && runtimeReload) {
        msg += runtimeReload.success !== false ? ' (Server Java đã reload)' : ` (Reload Java: ${runtimeReload.error || 'chưa kết nối'})`;
      }
      fb.success(msg);
      await loadStats();
      if (activeTab === 'smart') {
        await analyzeRawText();
      } else {
        await analyzeStudioData();
      }
    } catch (e) {
      fb.error(`Lỗi nạp database: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  function applySample(sample) {
    setRawText(sample);
    analyzeRawText(sample);
  }

  function autoAssignNextStudioIds() {
    if (!dbStats) return;
    const nextItemId = dbStats.item_template.nextId || 2033;
    const nextPartId = dbStats.part.nextId || 2006;
    setStudioItem((prev) => ({
      ...prev,
      id: nextItemId,
      part: nextPartId,
      head: nextPartId,
      body: nextPartId + 1,
      leg: nextPartId + 2,
    }));
    setStudioPartHead((prev) => ({ ...prev, id: nextPartId }));
    setStudioPartBody((prev) => ({ ...prev, id: nextPartId + 1 }));
    setStudioPartLeg((prev) => ({ ...prev, id: nextPartId + 2 }));
    fb.success(`Đã tự động gán Item #${nextItemId}, Parts #${nextPartId}..#${nextPartId + 2}`);
  }

  // Common file parser for reading images
  async function processImageFileList(files) {
    if (!files.length) return;
    setUploadingIcons(true);
    setUploadProgress({ current: 0, total: files.length, text: 'Đang đọc & tính toán kích thước ảnh...' });

    try {
      const newItems = [];
      const imageFiles = files.filter((f) => /\.(png|jpe?g|webp)$/i.test(f.name));

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const match = file.name.match(/(\d+)/);
        const iconId = match ? Number(match[1]) : 0;

        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = objectUrl;
        }).catch(() => null);

        if (img.naturalWidth > 0) {
          const zooms = await generateZoomsFromImage(img, sourceZoom, pixelSmoothing);
          newItems.push({
            id: iconId,
            fileName: file.name,
            originalW: img.naturalWidth,
            originalH: img.naturalHeight,
            zooms,
            saved: false,
          });
        }
        URL.revokeObjectURL(objectUrl);

        if (i % 25 === 0 || i === imageFiles.length - 1) {
          setUploadProgress({
            current: i + 1,
            total: imageFiles.length,
            text: `Đang render ảnh: ${i + 1}/${imageFiles.length} (${Math.round(((i + 1) / imageFiles.length) * 100)}%)`,
          });
        }
      }

      setIconQueue((prev) => [...prev, ...newItems]);
      setIconPage(1);
      fb.success(`Đã nạp thành công ${newItems.length} ảnh và tự động tạo đủ 4 bộ tỉ lệ (x4, x3, x2, x1)!`);
    } catch (err) {
      fb.error(`Lỗi đọc thư mục/file: ${err.message}`);
    } finally {
      setUploadingIcons(false);
      setUploadProgress(null);
    }
  }

  // Handle ZIP upload
  async function handleZipSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIcons(true);
    setUploadProgress({ current: 0, total: 100, text: 'Đang giải nén tệp ZIP...' });

    try {
      const zip = await JSZip.loadAsync(file);
      const entries = [];
      zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir && /\.(png|jpe?g|webp)$/i.test(zipEntry.name)) {
          entries.push(zipEntry);
        }
      });

      setUploadProgress({ current: 0, total: entries.length, text: `Đã tìm thấy ${entries.length} ảnh trong ZIP. Đang trích xuất...` });
      const imageFiles = [];

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const blob = await entry.async('blob');
        const fileName = entry.name.split('/').pop() || entry.name;
        imageFiles.push(new File([blob], fileName, { type: 'image/png' }));
      }

      await processImageFileList(imageFiles);
    } catch (err) {
      fb.error(`Lỗi giải nén ZIP: ${err.message}`);
      setUploadingIcons(false);
      setUploadProgress(null);
    } finally {
      if (zipInputRef.current) zipInputRef.current.value = '';
    }
  }

  // Drag & drop supporting both files and entire folders
  async function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      setUploadingIcons(true);
      setUploadProgress({ current: 0, total: items.length, text: 'Đang quét toàn bộ thư mục kéo thả...' });
      const filePromises = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.webkitGetAsEntry) {
          const entry = item.webkitGetAsEntry();
          if (entry) filePromises.push(scanFilesFromEntry(entry));
        } else if (item.kind === 'file') {
          const f = item.getAsFile();
          if (f) filePromises.push(Promise.resolve([f]));
        }
      }
      const fileArrays = await Promise.all(filePromises);
      const allFiles = fileArrays.flat();
      await processImageFileList(allFiles);
    } else if (e.dataTransfer.files) {
      await processImageFileList(Array.from(e.dataTransfer.files));
    }
  }

  // Upload in chunk batches to ensure no timeouts or payload limits
  async function syncAllIconsToServer() {
    if (!iconQueue.length) return;
    setUploadingIcons(true);

    const chunkSize = 20; // 20 icons (~80 files) per batch for super fast & reliable upload
    let savedTotal = 0;
    const totalChunks = Math.ceil(iconQueue.length / chunkSize);

    try {
      for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
        const start = chunkIdx * chunkSize;
        const chunk = iconQueue.slice(start, start + chunkSize);

        const percent = Math.round(((chunkIdx + 1) / totalChunks) * 100);
        setUploadProgress({
          current: Math.min(start + chunkSize, iconQueue.length),
          total: iconQueue.length,
          text: `Đang lưu lên máy chủ: Lô ${chunkIdx + 1}/${totalChunks} (${Math.min(start + chunkSize, iconQueue.length)}/${iconQueue.length} icon - ${percent}%)...`,
        });

        const itemsPayload = chunk.map((item) => ({
          id: item.id,
          images: {
            x4: item.zooms.x4.dataUrl,
            x3: item.zooms.x3.dataUrl,
            x2: item.zooms.x2.dataUrl,
            x1: item.zooms.x1.dataUrl,
          },
        }));

        const res = await api('/assets/icons/upload-batch', {
          method: 'POST',
          body: JSON.stringify({ items: itemsPayload }),
        });

        const { savedCount, saved } = res.data || {};
        savedTotal += (savedCount || 0);

        if (saved && Array.isArray(saved)) {
          const savedIds = new Set(saved.map((s) => s.id));
          setIconQueue((prev) =>
            prev.map((item) => {
              if (savedIds.has(item.id)) {
                return { ...item, saved: true };
              }
              return item;
            })
          );
        }
      }

      fb.success(`🎉 Đã lưu & đồng bộ thành công ${savedTotal} icon (tổng cộng ${savedTotal * 4} file ảnh) vào 4 thư mục: data/icon/x4, x3, x2, x1!`);
    } catch (e) {
      fb.error(`Lỗi đồng bộ icon: ${e.message}`);
    } finally {
      setUploadingIcons(false);
      setUploadProgress(null);
    }
  }

  async function inspectIcon(idToInspect) {
    const id = idToInspect !== undefined ? idToInspect : inspectId;
    if (!id) return;
    try {
      const res = await api(`/assets/icons/inspect/${id}`);
      setInspectResult(res.data);
    } catch (e) {
      fb.error(`Lỗi tra cứu: ${e.message}`);
    }
  }

  // Filtered & Paginated icon queue
  const filteredIcons = useMemo(() => {
    if (!iconSearch.trim()) return iconQueue;
    const q = iconSearch.toLowerCase();
    return iconQueue.filter((it) => String(it.id).includes(q) || it.fileName.toLowerCase().includes(q));
  }, [iconQueue, iconSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredIcons.length / PAGE_SIZE));
  const paginatedIcons = useMemo(() => {
    const start = (iconPage - 1) * PAGE_SIZE;
    return filteredIcons.slice(start, start + PAGE_SIZE);
  }, [filteredIcons, iconPage]);

  const avatarMap = useMemo(() => {
    const map = new Map();
    if (activeData?.headAvatars) {
      for (const ha of activeData.headAvatars) {
        map.set(Number(ha.head_id), Number(ha.avatar_id));
      }
    }
    return map;
  }, [activeData]);

  return (
    <div>
      <PageHeader
        title="Nhập Nhanh Dữ Liệu Vật Phẩm & Part Studio"
        description="Tự động phân tích nạp Database ngocrong (item, part, avatar, flag) và công cụ tải cả thư mục/folder ảnh icon x4 đồng bộ sang x3, x2, x1."
        actions={
          <div className="row" style={{ gap: '0.5rem' }}>
            <button className="btn" type="button" onClick={loadStats} disabled={busy}>Làm mới chỉ số DB</button>
            <button className="btn primary" type="button" onClick={() => applySample(SAMPLE_PICCOLO)}>Nạp mẫu Cải trang Piccolo</button>
          </div>
        }
      />

      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      {/* Stats Cards */}
      {dbStats && (
        <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
          <div className="stat-card">
            <div className="stat-label">item_template</div>
            <div className="stat-value">{dbStats.item_template.total} <small style={{ fontSize: '0.8rem', opacity: 0.8 }}>(Next: #{dbStats.item_template.nextId})</small></div>
            <div className="stat-sub">Max ID: #{dbStats.item_template.maxId}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">part (Head / Body / Leg)</div>
            <div className="stat-value">{dbStats.part.total} <small style={{ fontSize: '0.8rem', opacity: 0.8 }}>(Next: #{dbStats.part.nextId})</small></div>
            <div className="stat-sub">Max ID: #{dbStats.part.maxId}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">head_avatar</div>
            <div className="stat-value">{dbStats.head_avatar.total}</div>
            <div className="stat-sub">Max Head ID: #{dbStats.head_avatar.maxHeadId}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">flag_bag (Cờ đeo lưng)</div>
            <div className="stat-value">{dbStats.flag_bag.total} <small style={{ fontSize: '0.8rem', opacity: 0.8 }}>(Next: #{dbStats.flag_bag.nextId})</small></div>
            <div className="stat-sub">Max ID: #{dbStats.flag_bag.maxId}</div>
          </div>
        </div>
      )}

      {/* Tabs navigation */}
      <div className="tab-nav" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.1))', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'smart' ? 'primary' : ''}`}
          onClick={() => { setActiveTab('smart'); if (rawText) analyzeRawText(rawText); }}
        >
          🚀 Trình Nhập Thông Minh (Dán Đa Năng)
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'studio' ? 'primary' : ''}`}
          onClick={() => { setActiveTab('studio'); analyzeStudioData(); }}
        >
          🎭 Studio Ghép Cải Trang Hoàn Chỉnh
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'icons' ? 'primary' : ''}`}
          onClick={() => setActiveTab('icons')}
        >
          📁 Tool Tải Thư Mục & Đồng Bộ Ảnh Icon ({iconQueue.length > 0 ? `${iconQueue.length} icon` : 'x4 ➔ x3, x2, x1'})
        </button>
      </div>

      {/* Tab 3: Icon Sync Tool with Folder & Zip Upload */}
      {activeTab === 'icons' && (
        <div className="card section">
          <div className="section-head">
            <div>
              <h3>Tool Tải Cả Thư Mục / File Nén & Tự Động Đồng Bộ Icon Game</h3>
              <p className="muted">
                Bạn có thể chọn <strong>tải lên cả Thư mục (Folder x4)</strong>, kéo thả thư mục hoặc file <code>.zip</code>. Hệ thống sẽ tự động nhận diện ID từ tên file và thu nhỏ đồng bộ vào 4 thư mục <code>data/icon/x4</code>, <code>x3</code>, <code>x2</code>, <code>x1</code>.
              </p>
            </div>
            <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                className="btn primary"
                type="button"
                onClick={() => folderInputRef.current?.click()}
                disabled={uploadingIcons}
              >
                📁 Tải Cả Thư Mục (Folder x4)
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => zipInputRef.current?.click()}
                disabled={uploadingIcons}
              >
                📦 Tải File Nén (.ZIP)
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingIcons}
              >
                🖼️ Chọn Từng File Ảnh
              </button>

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => processImageFileList(Array.from(e.target.files || []))}
              />
              <input
                ref={folderInputRef}
                type="file"
                webkitdirectory="true"
                directory="true"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => processImageFileList(Array.from(e.target.files || []))}
              />
              <input
                ref={zipInputRef}
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                style={{ display: 'none' }}
                onChange={handleZipSelected}
              />
            </div>
          </div>

          {/* Controls Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', background: 'rgba(0,0,0,0.25)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Tỉ lệ ảnh nguồn tải lên:
              <select value={sourceZoom} onChange={(e) => setSourceZoom(Number(e.target.value))} style={{ padding: '0.25rem 0.5rem' }}>
                <option value={4}>x4 (Chuẩn HD / Gốc)</option>
                <option value={3}>x3 (75%)</option>
                <option value={2}>x2 (50%)</option>
                <option value={1}>x1 (25%)</option>
              </select>
            </label>

            <label style={{ fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <input type="checkbox" checked={pixelSmoothing} onChange={(e) => setPixelSmoothing(e.target.checked)} />
              Khử răng cưa mịn màng (Bật nếu ảnh không phải Pixel Art)
            </label>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {iconQueue.length > 0 && (
                <>
                  <button className="btn sm" type="button" onClick={() => setIconQueue([])} disabled={uploadingIcons}>
                    Xóa danh sách
                  </button>
                  <button className="btn primary" type="button" onClick={syncAllIconsToServer} disabled={uploadingIcons}>
                    {uploadingIcons ? 'Đang lưu vào máy chủ...' : `⚡ Lưu & Đồng Bộ ${iconQueue.length} Icon vào data/icon (x4, x3, x2, x1)`}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {uploadProgress && (
            <div style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3b82f6', borderRadius: '8px', padding: '0.85rem 1.25rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <strong style={{ color: '#93c5fd', fontSize: '0.95rem' }}>{uploadProgress.text}</strong>
                <span style={{ fontWeight: 'bold', color: '#60a5fa' }}>
                  {uploadProgress.total > 0 ? `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%` : ''}
                </span>
              </div>
              <div style={{ width: '100%', height: '10px', background: 'rgba(0,0,0,0.4)', borderRadius: '5px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${uploadProgress.total > 0 ? (uploadProgress.current / uploadProgress.total) * 100 : 0}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #3b82f6, #10b981)',
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            style={{
              border: dragOver ? '2px dashed #60a5fa' : '2px dashed rgba(255,255,255,0.2)',
              borderRadius: '8px',
              padding: '2.5rem',
              textAlign: 'center',
              background: dragOver ? 'rgba(96, 165, 250, 0.15)' : 'rgba(0,0,0,0.15)',
              marginBottom: '1.5rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => folderInputRef.current?.click()}
          >
            <div style={{ fontSize: '2.8rem', marginBottom: '0.5rem' }}>📁</div>
            <strong style={{ fontSize: '1.15rem', color: '#f8fafc' }}>
              Kéo thả Thư Mục (Folder x4), File Nén (.ZIP) hoặc nhiều file ảnh PNG vào đây
            </strong>
            <p className="muted" style={{ fontSize: '0.88rem', marginTop: '0.35rem' }}>
              Nhấn vào đây để mở hộp thoại <strong>Chọn Cả Thư Mục</strong> · Tự động đọc tất cả ảnh và trích xuất ID từ tên file (vd: <code>17121.png</code>).
            </p>
          </div>

          {/* Icon Queue Preview Table */}
          {iconQueue.length > 0 && (
            <div className="table-wrap" style={{ marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.5rem 0', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
                  <strong>Danh sách {iconQueue.length} icon ({iconQueue.filter((i) => i.saved).length} đã lưu)</strong>
                  <input
                    placeholder="Tìm theo ID hoặc tên file..."
                    value={iconSearch}
                    onChange={(e) => { setIconSearch(e.target.value); setIconPage(1); }}
                    style={{ width: '220px', padding: '3px 8px', fontSize: '0.82rem' }}
                  />
                </div>

                <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                      <button className="btn sm" disabled={iconPage <= 1} onClick={() => setIconPage((p) => p - 1)}>◀ Trang trước</button>
                      <span style={{ padding: '0 4px' }}>Trang {iconPage}/{totalPages}</span>
                      <button className="btn sm" disabled={iconPage >= totalPages} onClick={() => setIconPage((p) => p + 1)}>Trang sau ▶</button>
                    </div>
                  )}
                  <button className="btn sm primary" type="button" onClick={syncAllIconsToServer} disabled={uploadingIcons}>
                    ⚡ Lưu tất cả vào Disk
                  </button>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Icon ID</th>
                    <th>Tên file</th>
                    <th>x4 (HD Gốc)</th>
                    <th>x3 (75%)</th>
                    <th>x2 (50%)</th>
                    <th>x1 (25%)</th>
                    <th>Trạng thái</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {paginatedIcons.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontWeight: 'bold', color: '#60a5fa' }}>#</span>
                          <input
                            type="number"
                            value={item.id}
                            onChange={(e) => {
                              const newId = Number(e.target.value);
                              setIconQueue((prev) =>
                                prev.map((it) => (it.fileName === item.fileName ? { ...it, id: newId } : it))
                              );
                            }}
                            style={{ width: '80px', padding: '2px 4px', fontSize: '0.85rem' }}
                          />
                        </div>
                      </td>
                      <td>
                        <small className="muted">{item.fileName}</small>
                        <br />
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{item.originalW}x{item.originalH}px</span>
                      </td>
                      <td>
                        <div style={{ textAlign: 'center' }}>
                          <img src={item.zooms.x4.dataUrl} alt="x4" style={{ maxWidth: '44px', maxHeight: '44px', objectFit: 'contain', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }} />
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{item.zooms.x4.w}x{item.zooms.x4.h}</div>
                        </div>
                      </td>
                      <td>
                        <div style={{ textAlign: 'center' }}>
                          <img src={item.zooms.x3.dataUrl} alt="x3" style={{ maxWidth: '36px', maxHeight: '36px', objectFit: 'contain', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }} />
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{item.zooms.x3.w}x{item.zooms.x3.h}</div>
                        </div>
                      </td>
                      <td>
                        <div style={{ textAlign: 'center' }}>
                          <img src={item.zooms.x2.dataUrl} alt="x2" style={{ maxWidth: '30px', maxHeight: '30px', objectFit: 'contain', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }} />
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{item.zooms.x2.w}x{item.zooms.x2.h}</div>
                        </div>
                      </td>
                      <td>
                        <div style={{ textAlign: 'center' }}>
                          <img src={item.zooms.x1.dataUrl} alt="x1" style={{ maxWidth: '24px', maxHeight: '24px', objectFit: 'contain', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }} />
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{item.zooms.x1.w}x{item.zooms.x1.h}</div>
                        </div>
                      </td>
                      <td>
                        {item.saved ? (
                          <span className="badge" style={{ background: '#10b981', color: '#fff' }}>✓ Đã đồng bộ vào Disk</span>
                        ) : (
                          <span className="badge" style={{ background: '#3b82f6', color: '#fff' }}>Sẵn sàng nạp</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn sm"
                          type="button"
                          onClick={() => setIconQueue((prev) => prev.filter((it) => it.fileName !== item.fileName))}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Quick Inspector Box */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px' }}>
            <h4 style={{ marginBottom: '0.5rem' }}>🔍 Tra Cứu Sự Tồn Tại Của Icon Trên 4 Thư Mục Server (Disk)</h4>
            <div className="row" style={{ gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input
                type="number"
                placeholder="Nhập ID icon cần kiểm tra (ví dụ: 17121, 390)..."
                value={inspectId}
                onChange={(e) => setInspectId(e.target.value)}
                style={{ width: '320px' }}
              />
              <button className="btn" type="button" onClick={() => inspectIcon()}>Kiểm tra</button>
              <button className="btn sm" type="button" onClick={() => { setInspectId('390'); inspectIcon(390); }}>Test #390 (Có sẵn)</button>
              <button className="btn sm" type="button" onClick={() => { setInspectId('17121'); inspectIcon(17121); }}>Test #17121</button>
            </div>

            {inspectResult && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginTop: '0.5rem' }}>
                {[4, 3, 2, 1].map((z) => {
                  const zInfo = inspectResult.zooms[`x${z}`];
                  return (
                    <div key={z} style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '6px', textAlign: 'center', border: zInfo.exists ? '1px solid #10b981' : '1px dashed rgba(255,255,255,0.2)' }}>
                      <strong style={{ color: zInfo.exists ? '#10b981' : '#f87171' }}>Thư mục data/icon/x{z}</strong>
                      <div style={{ marginTop: '0.35rem', minHeight: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {zInfo.exists ? (
                          <img src={`${zInfo.url}?t=${Date.now()}`} alt={`x${z}`} style={{ maxWidth: '44px', maxHeight: '44px', objectFit: 'contain' }} />
                        ) : (
                          <span className="muted" style={{ fontSize: '0.75rem' }}>Chưa có file</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                        {zInfo.exists ? `${(zInfo.size / 1024).toFixed(1)} KB` : '404 Not Found'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 1: Smart Universal Importer */}
      {activeTab === 'smart' && (
        <div className="card section">
          <div className="section-head">
            <div>
              <h3>Dán Dữ Liệu Cần Nạp</h3>
              <p className="muted">Hỗ trợ dán dữ liệu dạng Tab (từ Excel/Navicat), dấu cách, SQL <code>INSERT INTO</code> hoặc mảng JSON tọa độ.</p>
            </div>
            <div className="row" style={{ gap: '0.5rem' }}>
              <button className="btn sm" type="button" onClick={() => applySample(SAMPLE_PICCOLO)}>Mẫu Cải Trang Chú Hề</button>
              <button className="btn sm" type="button" onClick={() => applySample(SAMPLE_FLAG_BAG)}>Mẫu Flag Bag</button>
              <button className="btn sm" type="button" onClick={() => { setRawText(''); setPreviewData(null); }}>Xóa trắng</button>
            </div>
          </div>

          <textarea
            style={{
              width: '100%',
              minHeight: '160px',
              fontFamily: 'monospace',
              fontSize: '0.88rem',
              padding: '0.75rem',
              borderRadius: '6px',
              background: 'rgba(0,0,0,0.3)',
              color: '#f0f0f0',
              border: '1px solid rgba(255,255,255,0.15)',
              resize: 'vertical',
            }}
            placeholder={`Dán chuỗi dữ liệu vào đây...\nVí dụ:\n2033\t5\t3\tCải trang chú hề Picolo\tHề Hước : Tăng 5% né\t1\t17121\t2006\t0\t0\t0\t0\t2006\t2007\t2008\n2006\t0\t[[17094,3,2],[17095,3,3],[2955,0,0]]\n2007\t1\t[[17096,0,0],[17097,0,-1],[17098,0,0],[2955,0,0]]\n2008\t2\t[[17108,9,7],[17109,-1,-1],[17110,0,0],[2955,0,0]]\n2006\t17122`}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />

          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: '0.85rem' }}>Hệ thống tự động phát hiện các bảng: item_template, part (0/1/2), head_avatar, flag_bag.</span>
            <button
              className="btn primary"
              type="button"
              onClick={() => analyzeRawText()}
              disabled={parsing || !rawText.trim()}
            >
              {parsing ? 'Đang phân tích...' : '🔍 Phân Tích & Đối Chiếu Database'}
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Full Item Studio */}
      {activeTab === 'studio' && (
        <div className="card section">
          <div className="section-head">
            <div>
              <h3>Studio Thiết Kế Cải Trang & Item Hoàn Chỉnh</h3>
              <p className="muted">Tự động liên kết 1 Item Template với 3 Part (Đầu, Thân, Chân) và Avatar tương ứng.</p>
            </div>
            <button className="btn sm" type="button" onClick={autoAssignNextStudioIds}>Gán ID tiếp theo từ DB</button>
          </div>

          {/* Live visual banner */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1.5rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ textAlign: 'center' }}>
                <ItemIcon iconId={studioItem.icon_id} name={studioItem.name} size={54} showLabel />
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginTop: '2px', color: '#60a5fa' }}>Item Icon</span>
              </div>
              <div>
                <strong style={{ fontSize: '1.05rem', color: '#f8fafc' }}>{studioItem.name || 'Chưa đặt tên'}</strong>
                <div className="muted" style={{ fontSize: '0.8rem' }}>Item #{studioItem.id} · Type {studioItem.type} · Part {studioItem.part}</div>
              </div>
            </div>

            <div style={{ width: '1px', height: '48px', background: 'rgba(255,255,255,0.1)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ textAlign: 'center' }}>
                <ItemIcon iconId={studioAvatarId} isAvatar name={`Avatar #${studioAvatarId}`} size={54} showLabel />
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginTop: '2px', color: '#c084fc' }}>Avatar Icon</span>
              </div>
              <div>
                <strong style={{ color: '#c084fc' }}>Head Avatar ID: #{studioAvatarId}</strong>
                <div className="muted" style={{ fontSize: '0.8rem' }}>Gắn với Part Đầu #{studioItem.head}</div>
              </div>
            </div>
          </div>

          <div className="form-grid" style={{ marginBottom: '1.25rem' }}>
            <label className="field">ID Item<input type="number" value={studioItem.id} onChange={(e) => setStudioItem({ ...studioItem, id: Number(e.target.value) })} /></label>
            <label className="field">Tên Cải Trang / Item<input value={studioItem.name} onChange={(e) => setStudioItem({ ...studioItem, name: e.target.value })} /></label>
            <label className="field">Mô tả<input value={studioItem.description} onChange={(e) => setStudioItem({ ...studioItem, description: e.target.value })} /></label>
            <label className="field">Loại Type (5: Cải trang/Đồ)<input type="number" value={studioItem.type} onChange={(e) => setStudioItem({ ...studioItem, type: Number(e.target.value) })} /></label>
            <label className="field">Gender (0: TĐ, 1: NM, 2: XD, 3: Chung)<input type="number" min="0" max="3" value={studioItem.gender} onChange={(e) => setStudioItem({ ...studioItem, gender: Number(e.target.value) })} /></label>
            <label className="field">
              Icon ID (Túi đồ/Inventory)
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input type="number" value={studioItem.icon_id} onChange={(e) => setStudioItem({ ...studioItem, icon_id: Number(e.target.value) })} />
                <ItemIcon iconId={studioItem.icon_id} size={38} />
              </div>
            </label>
            <label className="field">Part ID (Gốc)<input type="number" value={studioItem.part} onChange={(e) => setStudioItem({ ...studioItem, part: Number(e.target.value) })} /></label>
            <label className="field">
              Head Avatar ID (Icon avatar hiển thị góc trái)
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input type="number" value={studioAvatarId} onChange={(e) => setStudioAvatarId(Number(e.target.value))} />
                <ItemIcon iconId={studioAvatarId} isAvatar size={38} />
              </div>
            </label>
            <label className="field">Head Part ID<input type="number" value={studioItem.head} onChange={(e) => { const v = Number(e.target.value); setStudioItem({ ...studioItem, head: v }); setStudioPartHead({ ...studioPartHead, id: v }); }} /></label>
            <label className="field">Body Part ID<input type="number" value={studioItem.body} onChange={(e) => { const v = Number(e.target.value); setStudioItem({ ...studioItem, body: v }); setStudioPartBody({ ...studioPartBody, id: v }); }} /></label>
            <label className="field">Leg Part ID<input type="number" value={studioItem.leg} onChange={(e) => { const v = Number(e.target.value); setStudioItem({ ...studioItem, leg: v }); setStudioPartLeg({ ...studioPartLeg, id: v }); }} /></label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div className="control-card" style={{ padding: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, color: '#60a5fa' }}>Part 0: Đầu (Head #{studioPartHead.id})</h4>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {parsePartFrames(studioPartHead.data).slice(0, 4).map((f, i) => (
                    <ItemIcon key={i} iconId={f.icon} size={28} />
                  ))}
                </div>
              </div>
              <textarea
                style={{ width: '100%', minHeight: '75px', fontFamily: 'monospace', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', color: '#fff', padding: '0.5rem', borderRadius: '4px' }}
                value={studioPartHead.data}
                onChange={(e) => setStudioPartHead({ ...studioPartHead, data: e.target.value })}
              />
            </div>
            <div className="control-card" style={{ padding: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, color: '#a78bfa' }}>Part 1: Thân (Body #{studioPartBody.id})</h4>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {parsePartFrames(studioPartBody.data).slice(0, 4).map((f, i) => (
                    <ItemIcon key={i} iconId={f.icon} size={28} />
                  ))}
                </div>
              </div>
              <textarea
                style={{ width: '100%', minHeight: '75px', fontFamily: 'monospace', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', color: '#fff', padding: '0.5rem', borderRadius: '4px' }}
                value={studioPartBody.data}
                onChange={(e) => setStudioPartBody({ ...studioPartBody, data: e.target.value })}
              />
            </div>
            <div className="control-card" style={{ padding: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, color: '#f472b6' }}>Part 2: Chân (Leg #{studioPartLeg.id})</h4>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {parsePartFrames(studioPartLeg.data).slice(0, 4).map((f, i) => (
                    <ItemIcon key={i} iconId={f.icon} size={28} />
                  ))}
                </div>
              </div>
              <textarea
                style={{ width: '100%', minHeight: '75px', fontFamily: 'monospace', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', color: '#fff', padding: '0.5rem', borderRadius: '4px' }}
                value={studioPartLeg.data}
                onChange={(e) => setStudioPartLeg({ ...studioPartLeg, data: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginTop: '1rem', textAlign: 'right' }}>
            <button className="btn primary" type="button" onClick={analyzeStudioData} disabled={parsing}>
              🔍 Phân Tích & Đối Chiếu Studio
            </button>
          </div>
        </div>
      )}

      {/* Database Verification & Execution Card */}
      {previewData && activeData && (
        <div className="card section" style={{ borderColor: 'var(--primary, #3b82f6)' }}>
          <div className="section-head">
            <div>
              <h3>Kết Quả Đối Chiếu Cơ Sở Dữ Liệu (XAMPP ngocrong)</h3>
              <p className="muted">
                Phát hiện {activeData.items.length} Item, {activeData.parts.length} Part, {activeData.headAvatars.length} Avatar, {activeData.flagBags.length} Flag Bag.
              </p>
            </div>
            <div className="row" style={{ gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                Xử lý trùng ID:
                <select
                  value={conflictMode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setConflictMode(val);
                    if (val === 'auto_remap') {
                      setUseRemappedView(true);
                      fb.success('✨ Đã bật chế độ tự động gán ID mới an toàn!');
                    } else {
                      setUseRemappedView(false);
                    }
                  }}
                  style={{ padding: '0.25rem 0.5rem', fontWeight: conflictMode === 'auto_remap' ? 'bold' : 'normal', color: conflictMode === 'auto_remap' ? '#a78bfa' : 'inherit' }}
                >
                  <option value="upsert">Ghi đè (ON DUPLICATE KEY UPDATE)</option>
                  <option value="auto_remap">✨ Tự động tạo ID mới nếu trùng (Auto Remap ID)</option>
                  <option value="ignore">Bỏ qua nếu đã tồn tại (INSERT IGNORE)</option>
                  <option value="strict">Báo lỗi nếu trùng (STRICT)</option>
                </select>
              </label>
              <label style={{ fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <input type="checkbox" checked={reloadAfter} onChange={(e) => setReloadAfter(e.target.checked)} />
                Reload Java Server
              </label>
              <button className="btn primary" type="button" onClick={executeImport} disabled={busy}>
                {busy ? 'Đang nạp vào DB...' : '💾 Nạp Ngay Vào Database (XAMPP)'}
              </button>
            </div>
          </div>

          {/* Conflict Alert & Smart Auto-Remap Banner */}
          {previewData.summary?.hasConflicts && (
            <div
              style={{
                background: conflictMode === 'auto_remap' || useRemappedView
                  ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.18), rgba(59, 130, 246, 0.18))'
                  : 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(239, 68, 68, 0.12))',
                border: conflictMode === 'auto_remap' || useRemappedView
                  ? '1px solid #8b5cf6'
                  : '1px solid #f59e0b',
                borderRadius: '8px',
                padding: '1rem 1.25rem',
                marginBottom: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>
                    {conflictMode === 'auto_remap' || useRemappedView ? '✨' : '⚠️'}
                  </span>
                  <strong style={{ fontSize: '1.02rem', color: conflictMode === 'auto_remap' || useRemappedView ? '#c084fc' : '#fbbf24' }}>
                    {conflictMode === 'auto_remap' || useRemappedView
                      ? 'Đang áp dụng: Tự Động Tăng Dải ID Mới Tiếp Theo Chưa Sử Dụng'
                      : `Phát hiện ${previewData.summary.totalConflicts} ID đã tồn tại trong Database (${previewData.summary.itemsConflicts ? `${previewData.summary.itemsConflicts} Item, ` : ''}${previewData.summary.partsConflicts ? `${previewData.summary.partsConflicts} Part, ` : ''}${previewData.summary.headAvatarsConflicts ? `${previewData.summary.headAvatarsConflicts} Avatar` : ''})`}
                  </strong>
                </div>
                <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                  {conflictMode === 'auto_remap' || useRemappedView
                    ? `Các ID trùng đã được tự động dời sang dải an toàn tiếp theo: Part #${previewData.nextSuggestedIds?.nextPartId}..., Item #${previewData.nextSuggestedIds?.nextItemId}..., Avatar #${previewData.nextSuggestedIds?.nextHeadAvatarId}...`
                    : 'Bạn có muốn hệ thống tự động tìm dải ID tiếp theo chưa được tạo để gán mới (tránh bị ghi đè lên dữ liệu cũ) không?'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {conflictMode !== 'auto_remap' && !useRemappedView ? (
                  <button
                    className="btn primary"
                    type="button"
                    onClick={() => {
                      setConflictMode('auto_remap');
                      setUseRemappedView(true);
                      fb.success('✨ Đã tự động chuyển toàn bộ sang dải ID mới an toàn!');
                    }}
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', border: 'none', fontWeight: 'bold' }}
                  >
                    ✨ Tự Động Đổi Sang ID Mới Kế Tiếp
                  </button>
                ) : (
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      setConflictMode('upsert');
                      setUseRemappedView(false);
                      fb.info('Đã chuyển về ID gốc ban đầu (Chế độ ghi đè).');
                    }}
                  >
                    🔄 Khôi Phục ID Gốc (Ghi Đè)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Preview Head Avatars */}
          {activeData.headAvatars.length > 0 && (
            <div style={{ marginBottom: '1.25rem', padding: '0.75rem', background: 'rgba(139, 92, 246, 0.08)', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
              <h4 style={{ marginBottom: '0.5rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                👤 Bảng <code>head_avatar</code> — Liên kết Avatar Icon ({activeData.headAvatars.length})
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                {activeData.headAvatars.map((ha) => (
                  <div
                    key={ha.head_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      background: 'rgba(0,0,0,0.25)',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <ItemIcon iconId={ha.avatar_id} isAvatar size={50} showLabel />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '0.95rem' }}>Head #{ha.head_id}</strong>
                        {ha.wasRemapped ? (
                          <span className="badge" style={{ background: '#8b5cf6', color: '#fff', fontSize: '0.7rem' }}>
                            Đổi mới: #{ha.head_id} (Gốc: #{ha.originalHeadId})
                          </span>
                        ) : ha.exists ? (
                          <span className="badge" style={{ background: '#f59e0b', color: '#000', fontSize: '0.7rem' }}>Đã có</span>
                        ) : (
                          <span className="badge" style={{ background: '#10b981', color: '#fff', fontSize: '0.7rem' }}>Mới</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#c084fc', marginTop: '2px' }}>
                        Avatar Icon ID: <strong>#{ha.avatar_id}</strong>
                      </div>
                      <div className="muted" style={{ fontSize: '0.75rem' }}>Hiển thị avatar góc trái khi mặc</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview Items Table */}
          {activeData.items.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📦 Bảng <code>item_template</code> ({activeData.items.length})
              </h4>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Trạng thái</th>
                      <th>ID</th>
                      <th>Icon Vật Phẩm</th>
                      <th>Avatar Icon</th>
                      <th>Tên vật phẩm</th>
                      <th>Mô tả</th>
                      <th>Type/Gender</th>
                      <th>Part / Head / Body / Leg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeData.items.map((it) => {
                      const linkedAvatar = avatarMap.get(Number(it.head));
                      return (
                        <tr key={it.id}>
                          <td>
                            {it.wasRemapped ? (
                              <span className="badge" style={{ background: '#8b5cf6', color: '#fff', fontWeight: 'bold' }}>
                                ID mới: #{it.id}
                              </span>
                            ) : it.exists ? (
                              <span className="badge" style={{ background: '#f59e0b', color: '#000', fontWeight: 'bold' }}>
                                Đã có (Ghi đè)
                              </span>
                            ) : (
                              <span className="badge" style={{ background: '#10b981', color: '#fff', fontWeight: 'bold' }}>
                                Mới
                              </span>
                            )}
                          </td>
                          <td>
                            <code>#{it.id}</code>
                            {it.wasRemapped && it.originalId !== it.id && (
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Gốc: #{it.originalId}</div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <ItemIcon iconId={it.icon_id} tempId={it.id} name={it.name} size={42} showLabel />
                            </div>
                          </td>
                          <td>
                            {linkedAvatar ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }} title={`Avatar Icon #${linkedAvatar} liên kết với Head #${it.head}`}>
                                <ItemIcon iconId={linkedAvatar} isAvatar size={42} showLabel />
                              </div>
                            ) : (
                              <span className="muted" style={{ fontSize: '0.8rem' }}>-</span>
                            )}
                          </td>
                          <td><strong>{it.name}</strong></td>
                          <td><small className="muted">{it.description}</small></td>
                          <td>{it.type} / {it.gender}</td>
                          <td>
                            <span style={{ fontSize: '0.85rem' }}>
                              Part: <strong>{it.part}</strong> | H:<strong>{it.head}</strong> B:<strong>{it.body}</strong> L:<strong>{it.leg}</strong>
                            </span>
                            {it.wasRemapped && (
                              <div style={{ fontSize: '0.7rem', color: '#c084fc' }}>⚡ Đã đồng bộ theo Part mới</div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Preview Parts Table with Visual Icon Strip */}
          {activeData.parts.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>
                🧩 Bảng <code>part</code> ({activeData.parts.length})
              </h4>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Trạng thái</th>
                      <th>Part ID</th>
                      <th>Loại</th>
                      <th>Danh sách Icon cấu thành (Frame Icons)</th>
                      <th>DATA Raw JSON</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeData.parts.map((p) => {
                      const frames = parsePartFrames(p.data);
                      return (
                        <tr key={`${p.id}-${p.type}`}>
                          <td>
                            {p.wasRemapped ? (
                              <span className="badge" style={{ background: '#8b5cf6', color: '#fff' }}>
                                ID mới: #{p.id}
                              </span>
                            ) : p.exists ? (
                              <span className="badge" style={{ background: '#f59e0b', color: '#000' }}>Đã có</span>
                            ) : (
                              <span className="badge" style={{ background: '#10b981', color: '#fff' }}>Mới</span>
                            )}
                          </td>
                          <td>
                            <code>#{p.id}</code>
                            {p.wasRemapped && p.originalId !== p.id && (
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Gốc: #{p.originalId}</div>
                            )}
                          </td>
                          <td>
                            {p.type === 0 && <span className="badge" style={{ background: '#3b82f6' }}>0 · Đầu (Head)</span>}
                            {p.type === 1 && <span className="badge" style={{ background: '#8b5cf6' }}>1 · Thân (Body)</span>}
                            {p.type === 2 && <span className="badge" style={{ background: '#ec4899' }}>2 · Chân (Leg)</span>}
                            {p.type > 2 && <span className="badge">{p.type} · Khác</span>}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '340px' }}>
                              {frames.map((f, i) => (
                                <div key={i} title={`Icon #${f.icon} (dx:${f.dx}, dy:${f.dy})`}>
                                  <ItemIcon iconId={f.icon} size={30} showLabel={false} />
                                </div>
                              ))}
                              {frames.length === 0 && <span className="muted" style={{ fontSize: '0.8rem' }}>Mảng rỗng</span>}
                            </div>
                          </td>
                          <td>
                            <code style={{ fontSize: '0.75rem', wordBreak: 'break-all', display: 'block', maxHeight: '55px', overflowY: 'auto' }}>
                              {p.data}
                            </code>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Preview Flag Bags */}
          {activeData.flagBags.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>
                🚩 Bảng <code>flag_bag</code> ({activeData.flagBags.length})
              </h4>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Trạng thái</th>
                      <th>ID</th>
                      <th>Icon Cờ</th>
                      <th>Tên cờ</th>
                      <th>Danh sách Icon Effect (icon_data)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeData.flagBags.map((fbItem) => (
                      <tr key={fbItem.id}>
                        <td>
                          {fbItem.wasRemapped ? (
                            <span className="badge" style={{ background: '#8b5cf6', color: '#fff' }}>
                              ID mới: #{fbItem.id}
                            </span>
                          ) : fbItem.exists ? (
                            <span className="badge" style={{ background: '#f59e0b', color: '#000' }}>Đã có</span>
                          ) : (
                            <span className="badge" style={{ background: '#10b981', color: '#fff' }}>Mới</span>
                          )}
                        </td>
                        <td>
                          <code>#{fbItem.id}</code>
                          {fbItem.wasRemapped && fbItem.originalId !== fbItem.id && (
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Gốc: #{fbItem.originalId}</div>
                          )}
                        </td>
                        <td>
                          <ItemIcon iconId={fbItem.icon_id} name={fbItem.name} size={42} showLabel />
                        </td>
                        <td><strong>{fbItem.name}</strong></td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                            {String(fbItem.icon_data || '').split(',').map((idStr, i) => {
                              const ic = Number(idStr.trim());
                              return ic ? <ItemIcon key={i} iconId={ic} size={28} /> : null;
                            })}
                            <code style={{ fontSize: '0.75rem', marginLeft: '6px' }}>{fbItem.icon_data}</code>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Unrecognized lines */}
          {previewData.unrecognized.length > 0 && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px' }}>
              <h4 style={{ color: '#f87171', marginBottom: '0.35rem' }}>⚠️ {previewData.unrecognized.length} dòng không nhận diện được:</h4>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#fca5a5' }}>
                {previewData.unrecognized.map((u, i) => (
                  <li key={i}>Dòng {u.lineIndex}: <code>{u.raw}</code></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
