import { useEffect, useState, useMemo } from 'react';
import { api, getServerId } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';
import ItemIcon from '../components/ItemIcon';
import BadgeEffectPreview from '../components/BadgeEffectPreview';
import { OptionEditor, formatOptionLabel, loadOptionCatalog } from '../components/OptionEditor';

const EMPTY_STUDIO_FORM = {
  id: '',
  name: '',
  idEffect: '',
  idItem: '',
  options: [],
  // Sprite custom upload
  spriteSource: 'catalog', // 'catalog' | 'upload'
  spriteBase64: '',
  spriteLayout: {
    frameCount: 4,
    cols: 4,
    rows: 1,
    frameWidth: 50,
    frameHeight: 25,
  },
  // Task config
  taskConfig: {
    enabled: false,
    name: '',
    maxCount: 100,
  },
};

const STUDIO_PRESETS = [
  {
    name: '👑 Top 1 Chiến Thần',
    idEffect: 222,
    idItem: 1293,
    options: [
      { id: 50, param: 20 }, // Sức đánh +20%
      { id: 77, param: 20 }, // HP +20%
      { id: 103, param: 20 }, // KI +20%
      { id: 14, param: 10 }, // Chí mạng +10%
    ],
  },
  {
    name: '💎 Đại Gia Server',
    idEffect: 218,
    idItem: 1289,
    options: [
      { id: 50, param: 15 },
      { id: 77, param: 15 },
      { id: 103, param: 15 },
      { id: 108, param: 10 }, // Né đòn +10%
    ],
  },
  {
    name: '🛡️ Bất Tử Chi Thân',
    idEffect: 221,
    idItem: 1292,
    options: [
      { id: 47, param: 500 }, // Giáp +500
      { id: 77, param: 30 }, // HP +30%
      { id: 94, param: 15 }, // Giáp %
    ],
  },
  {
    name: '🎯 Trùm Săn Boss',
    idEffect: 220,
    idItem: 1291,
    options: [
      { id: 50, param: 25 }, // Sức đánh +25%
      { id: 5, param: 15 }, // % Sát thương quái/boss
      { id: 14, param: 15 }, // Chí mạng +15%
    ],
  },
  {
    name: '⚡ Fan Cứng NRO',
    idEffect: 228,
    idItem: 1299,
    options: [
      { id: 50, param: 5 },
      { id: 77, param: 5 },
      { id: 103, param: 5 },
      { id: 114, param: 20 },
    ],
  },
  {
    name: '🐉 Trùm Ước Rồng',
    idEffect: 219,
    idItem: 1290,
    options: [
      { id: 77, param: 10 },
      { id: 103, param: 10 },
      { id: 108, param: 5 },
    ],
  },
  {
    name: '🌟 KOL VIP Pro',
    idEffect: 226,
    idItem: 1297,
    options: [
      { id: 50, param: 15 },
      { id: 77, param: 15 },
      { id: 103, param: 15 },
      { id: 14, param: 5 },
    ],
  },
];

const QUICK_STAT_BUTTONS = [
  { label: '⚔️ Sức đánh +15%', id: 50, param: 15 },
  { label: '⚔️ Sức đánh +25%', id: 50, param: 25 },
  { label: '❤️ HP +20%', id: 77, param: 20 },
  { label: '❤️ HP +30%', id: 77, param: 30 },
  { label: '💙 KI +20%', id: 103, param: 20 },
  { label: '💥 Chí mạng +10%', id: 14, param: 10 },
  { label: '🛡️ Giáp +500', id: 47, param: 500 },
  { label: '🛡️ Giáp +20%', id: 94, param: 20 },
  { label: '💨 Né đòn +15%', id: 108, param: 15 },
  { label: '🎯 ST Boss +20%', id: 5, param: 20 },
  { label: '⚡ Tốc độ +30%', id: 114, param: 30 },
  { label: '🩸 Hút máu 10%', id: 95, param: 10 },
];

export default function BadgesPage() {
  const [activeTab, setActiveTab] = useState('studio'); // 'studio' | 'list' | 'player' | 'tasks' | 'guide'
  const [badges, setBadges] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [effectsCatalog, setEffectsCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState('');
  
  // Studio Form State
  const [studioForm, setStudioForm] = useState(EMPTY_STUDIO_FORM);
  const [studioPreviewGender, setStudioPreviewGender] = useState(2); // 0: TD, 1: NM, 2: XD (Mặc định Xayda chuẩn game)
  const [busy, setBusy] = useState(false);

  // Quick grant for testing
  const [testPlayerName, setTestPlayerName] = useState('');

  // Effect Picker Modal State
  const [effectPickerOpen, setEffectPickerOpen] = useState(false);
  const [effectPickerFilter, setEffectPickerFilter] = useState('');

  // Player search & grant state
  const [playerQuery, setPlayerQuery] = useState('');
  const [playerResults, setPlayerResults] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [grantForm, setGrantForm] = useState({
    idEffect: '',
    days: '30',
    isUse: true,
  });

  // Task edit state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ id: '', name: '', maxCount: 100, idbadgesReward: '' });

  // Catalog meta for label formatting
  const [catalogMap, setCatalogMap] = useState({});

  const fb = useFeedback();

  useEffect(() => {
    loadOptionCatalog().then((cat) => {
      setCatalogMap(cat.map || {});
    }).catch(() => {});
    loadBadges();
    loadTasks();
    loadEffectsCatalog();
  }, []);

  async function loadBadges() {
    setLoading(true);
    try {
      const res = await api('/badges');
      const loaded = res.data || [];
      setBadges(loaded);

      // Auto suggest next IDs if studio form is empty
      if (!studioForm.idEffect) {
        const maxId = loaded.reduce((m, b) => Math.max(m, b.id || 0), 0);
        const maxEffect = loaded.reduce((m, b) => Math.max(m, b.idEffect || 0), 200);
        setStudioForm((prev) => ({
          ...prev,
          id: String(maxId + 1),
          idEffect: String(maxEffect + 1),
        }));
      }
    } catch (err) {
      fb.error('Không thể tải danh sách danh hiệu: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadTasks() {
    try {
      const res = await api('/badges/tasks');
      setTasks(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadEffectsCatalog() {
    try {
      const res = await api('/assets/effects-catalog');
      setEffectsCatalog(res.data || []);
    } catch (err) {
      console.error('Không tải được catalog effect:', err);
    }
  }

  const filteredBadges = useMemo(() => {
    const q = filterText.toLowerCase().trim();
    if (!q) return badges;
    return badges.filter((b) =>
      String(b.id).includes(q) ||
      String(b.idEffect).includes(q) ||
      String(b.idItem).includes(q) ||
      (b.name && b.name.toLowerCase().includes(q))
    );
  }, [badges, filterText]);

  const filteredEffects = useMemo(() => {
    const q = effectPickerFilter.toLowerCase().trim();
    if (!q) return effectsCatalog;
    return effectsCatalog.filter((e) =>
      String(e.id).includes(q) ||
      (e.fileName && e.fileName.toLowerCase().includes(q))
    );
  }, [effectsCatalog, effectPickerFilter]);

  // Calculate Power Rating for the title
  const powerScore = useMemo(() => {
    let score = 0;
    for (const opt of studioForm.options || []) {
      const p = Number(opt.param || 0);
      if (opt.id === 50) score += p * 50; // SD %
      else if (opt.id === 77 || opt.id === 103) score += p * 30; // HP/KI %
      else if (opt.id === 14) score += p * 80; // Crit %
      else if (opt.id === 47) score += p * 2; // Def point
      else if (opt.id === 94) score += p * 40; // Def %
      else if (opt.id === 108) score += p * 60; // Dodge %
      else if (opt.id === 5) score += p * 50; // Boss dmg
      else score += p * 10;
    }
    return score;
  }, [studioForm.options]);

  function applyPreset(preset) {
    setStudioForm((prev) => ({
      ...prev,
      name: preset.name.replace(/^[^\s]+\s/, ''),
      idEffect: String(preset.idEffect),
      idItem: String(preset.idItem || 0),
      options: preset.options,
    }));
    fb.success(`Đã nạp mẫu: ${preset.name}`);
  }

  function addQuickStat(stat) {
    setStudioForm((prev) => {
      const exists = prev.options.findIndex((o) => o.id === stat.id);
      let newOptions;
      if (exists >= 0) {
        newOptions = [...prev.options];
        newOptions[exists] = { id: stat.id, param: stat.param };
      } else {
        newOptions = [...prev.options, { id: stat.id, param: stat.param }];
      }
      return { ...prev, options: newOptions };
    });
    fb.success(`Đã thêm chỉ số: ${stat.label}`);
  }

  function handleFileSpriteUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      fb.error('Vui lòng chọn file ảnh PNG/JPG');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      setStudioForm((prev) => ({
        ...prev,
        spriteBase64: String(base64),
        spriteSource: 'upload',
      }));
      fb.success(`Đã tải lên ảnh "${file.name}"`);
    };
    reader.readAsDataURL(file);
  }

  function chooseEffectFromPicker(effId) {
    setStudioForm((prev) => ({
      ...prev,
      idEffect: String(effId),
      spriteSource: 'catalog',
      spriteBase64: '',
    }));
    setEffectPickerOpen(false);
    fb.success(`Đã chọn hiệu ứng Sprite #${effId}`);
  }

  function editBadgeFromList(badge) {
    setStudioForm({
      id: String(badge.id),
      name: badge.name || '',
      idEffect: String(badge.idEffect),
      idItem: String(badge.idItem || 0),
      options: (badge.options || []).map((o) => ({ id: Number(o.id), param: Number(o.param || 0) })),
      spriteSource: 'catalog',
      spriteBase64: '',
      spriteLayout: { frameCount: 4, cols: 4, rows: 1, frameWidth: 50, frameHeight: 25 },
      taskConfig: { enabled: false, name: '', maxCount: 100 },
    });
    setActiveTab('studio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fb.info(`Đang chỉnh sửa danh hiệu #${badge.id} "${badge.name}"`);
  }

  async function handleSaveStudioBadge(e) {
    e?.preventDefault();
    if (!studioForm.name.trim()) {
      fb.error('Vui lòng nhập tên danh hiệu');
      return;
    }
    if (!studioForm.idEffect || isNaN(Number(studioForm.idEffect))) {
      fb.error('ID Effect phải là số nguyên');
      return;
    }

    setBusy(true);
    try {
      const payload = {
        id: studioForm.id ? Number(studioForm.id) : undefined,
        name: studioForm.name.trim(),
        idEffect: Number(studioForm.idEffect),
        idItem: Number(studioForm.idItem || 0),
        options: studioForm.options,
        spriteBase64: studioForm.spriteSource === 'upload' ? studioForm.spriteBase64 : undefined,
        spriteLayout: studioForm.spriteSource === 'upload' ? studioForm.spriteLayout : undefined,
        taskConfig: studioForm.taskConfig.enabled ? studioForm.taskConfig : undefined,
      };

      const res = await api('/badges/custom-create', { method: 'POST', body: JSON.stringify(payload) });
      fb.success(res.message || 'Đã lưu danh hiệu thành công!');

      // If test player name provided, grant immediately
      if (testPlayerName.trim()) {
        try {
          const searchRes = await api(`/badges/player-search?q=${encodeURIComponent(testPlayerName.trim())}`);
          if (searchRes.data && searchRes.data.length > 0) {
            const p = searchRes.data[0];
            await api('/badges/player-grant', {
              method: 'POST',
              body: JSON.stringify({
                playerId: p.id,
                idEffect: Number(studioForm.idEffect),
                days: -1, // Permanent
                isUse: true,
              }),
            });
            fb.success(`Đã cấp danh hiệu vĩnh viễn cho nhân vật "${p.name}" để test!`);
          }
        } catch (grantErr) {
          console.error(grantErr);
        }
      }

      loadBadges();
      loadTasks();
    } catch (err) {
      fb.error('Lỗi lưu danh hiệu: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteBadge(badge) {
    if (!window.confirm(`Bạn có chắc muốn xóa danh hiệu #${badge.id} "${badge.name}"?`)) return;
    try {
      await api(`/badges/${badge.id}`, { method: 'DELETE' });
      fb.success(`Đã xóa danh hiệu #${badge.id}`);
      loadBadges();
    } catch (err) {
      fb.error('Lỗi xóa danh hiệu: ' + err.message);
    }
  }

  // Player search & grant
  async function handleSearchPlayer(e) {
    e?.preventDefault();
    if (!playerQuery.trim()) return;
    try {
      const res = await api(`/badges/player-search?q=${encodeURIComponent(playerQuery.trim())}`);
      setPlayerResults(res.data || []);
      if (res.data && res.data.length === 1) {
        setSelectedPlayer(res.data[0]);
      }
    } catch (err) {
      fb.error('Lỗi tìm kiếm: ' + err.message);
    }
  }

  async function handleGrantBadge(e) {
    e?.preventDefault();
    if (!selectedPlayer) return fb.error('Vui lòng chọn người chơi');
    if (!grantForm.idEffect) return fb.error('Vui lòng chọn danh hiệu');

    setBusy(true);
    try {
      const payload = {
        playerId: selectedPlayer.id,
        idEffect: Number(grantForm.idEffect),
        days: Number(grantForm.days),
        isUse: grantForm.isUse,
      };
      await api('/badges/player-grant', { method: 'POST', body: JSON.stringify(payload) });
      fb.success(`Cấp danh hiệu cho ${selectedPlayer.name} thành công!`);
      
      const res = await api(`/badges/player-search?q=${selectedPlayer.id}`);
      if (res.data && res.data.length > 0) {
        setSelectedPlayer(res.data[0]);
      }
    } catch (err) {
      fb.error('Lỗi cấp danh hiệu: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRevokeBadge(idEffect) {
    if (!selectedPlayer) return;
    if (!window.confirm(`Thu hồi danh hiệu #${idEffect} của ${selectedPlayer.name}?`)) return;
    try {
      await api('/badges/player-revoke', {
        method: 'POST',
        body: JSON.stringify({ playerId: selectedPlayer.id, idEffect }),
      });
      fb.success('Đã thu hồi danh hiệu');
      const res = await api(`/badges/player-search?q=${selectedPlayer.id}`);
      if (res.data && res.data.length > 0) {
        setSelectedPlayer(res.data[0]);
      }
    } catch (err) {
      fb.error('Lỗi: ' + err.message);
    }
  }

  async function handleToggleEquipBadge(idEffect, targetUse) {
    if (!selectedPlayer) return;
    try {
      await api('/badges/player-toggle', {
        method: 'POST',
        body: JSON.stringify({ playerId: selectedPlayer.id, idEffect, isUse: targetUse }),
      });
      fb.success(targetUse ? 'Đã kích hoạt đeo danh hiệu' : 'Đã tháo danh hiệu');
      const res = await api(`/badges/player-search?q=${selectedPlayer.id}`);
      if (res.data && res.data.length > 0) {
        setSelectedPlayer(res.data[0]);
      }
    } catch (err) {
      fb.error('Lỗi: ' + err.message);
    }
  }

  // Task submit
  async function handleSaveTask(e) {
    e?.preventDefault();
    if (!taskForm.name) return fb.error('Tên nhiệm vụ không được để trống');
    try {
      await api('/badges/tasks', { method: 'POST', body: JSON.stringify(taskForm) });
      fb.success('Lưu nhiệm vụ thành công!');
      setTaskModalOpen(false);
      loadTasks();
    } catch (err) {
      fb.error('Lỗi: ' + err.message);
    }
  }

  function exportSqlScript() {
    let sql = '-- Xuất cấu hình danh hiệu NRO (data_badges)\n';
    sql += 'TRUNCATE TABLE `data_badges`;\n';
    sql += 'INSERT INTO `data_badges` (`id`, `idEffect`, `idItem`, `NAME`, `Options`) VALUES\n';
    const lines = badges.map((b) => {
      const optJson = JSON.stringify(b.options.map((o) => ({ id: o.id, param: o.param })))
        .replace(/'/g, "\\'");
      return `(${b.id}, ${b.idEffect}, ${b.idItem || 0}, '${(b.name || '').replace(/'/g, "''")}', '${optJson}')`;
    });
    sql += lines.join(',\n') + ';\n';

    const blob = new Blob([sql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data_badges_export_${Date.now()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
    fb.success('Đã tải xuống file SQL danh hiệu');
  }

  function copyInsertSql() {
    const optJson = JSON.stringify((studioForm.options || []).map((o) => ({ id: o.id, param: o.param })))
      .replace(/'/g, "\\'");
    const sql = `INSERT INTO \`data_badges\` (\`id\`, \`idEffect\`, \`idItem\`, \`NAME\`, \`Options\`) VALUES (${studioForm.id || 'NULL'}, ${studioForm.idEffect || 0}, ${studioForm.idItem || 0}, '${(studioForm.name || 'Danh hiệu mới').replace(/'/g, "''")}', '${optJson}');`;
    navigator.clipboard.writeText(sql);
    fb.success('Đã sao chép câu lệnh SQL INSERT vào Clipboard!');
  }

  return (
    <div className="page-content badges-page">
      <PageHeader
        title="Quản Lý & Tùy Chỉnh Danh Hiệu"
        desc="Studio thiết kế danh hiệu toàn diện: Tùy biến Sprite hoạt họa, cấu hình chỉ số buff, mở khóa nhiệm vụ và cấp phát cho người chơi"
        actions={
          <div className="btn-group">
            <button type="button" className="btn sm secondary" onClick={exportSqlScript}>
              💾 Xuất SQL
            </button>
            <button
              type="button"
              className="btn sm primary"
              onClick={() => {
                const maxId = badges.reduce((m, b) => Math.max(m, b.id || 0), 0);
                const maxEffect = badges.reduce((m, b) => Math.max(m, b.idEffect || 0), 200);
                setStudioForm({
                  ...EMPTY_STUDIO_FORM,
                  id: String(maxId + 1),
                  idEffect: String(maxEffect + 1),
                });
                setActiveTab('studio');
              }}
            >
              🎨 Mở Studio Tạo Mới
            </button>
          </div>
        }
      />

      <PageFeedback feedback={fb} />

      {/* Tabs Switcher */}
      <div className="tabs-nav" style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-color, #333)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'studio' ? 'primary' : 'secondary'}`}
          onClick={() => setActiveTab('studio')}
        >
          🎨 Studio Tùy Chỉnh & Tạo Mới
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'list' ? 'primary' : 'secondary'}`}
          onClick={() => setActiveTab('list')}
        >
          🎖️ Danh Sách Danh Hiệu ({badges.length})
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'player' ? 'primary' : 'secondary'}`}
          onClick={() => setActiveTab('player')}
        >
          👤 Cấp Phát & Quản Lý Player
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'tasks' ? 'primary' : 'secondary'}`}
          onClick={() => setActiveTab('tasks')}
        >
          📜 Nhiệm Vụ Danh Hiệu ({tasks.length})
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'guide' ? 'primary' : 'secondary'}`}
          onClick={() => setActiveTab('guide')}
        >
          📖 Sổ Tay & Hướng Dẫn
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: STUDIO TÙY CHỈNH & TẠO DANH HIỆU TOÀN DIỆN                         */}
      {/* ========================================================================= */}
      {activeTab === 'studio' && (
        <div className="tab-content studio-tab">
          {/* Top Presets Quick Pick */}
          <div className="card" style={{ padding: '14px 18px', marginBottom: '20px', background: 'rgba(30, 41, 59, 0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#f39c12' }}>⚡ MẪU DANH HIỆU CÓ SẴN (PRESETS):</span>
                <span className="muted" style={{ fontSize: '12px' }}>(Bấm để nạp sẵn cấu hình mẫu)</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {STUDIO_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="btn xs secondary"
                    onClick={() => applyPreset(preset)}
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveStudioBadge}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 340px', gap: '24px', alignItems: 'start' }}>
              {/* CỘT TRÁI: FORM THIẾT LẬP CHI TIẾT */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* KHU VỰC 1: THÔNG TIN CƠ BẢN */}
                <div className="card" style={{ padding: '20px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#f39c12', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    1️⃣ Thông Tin Cơ Bản
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                    <label className="field">
                      <span>ID Danh Hiệu (Tự động hoặc tùy chọn)</span>
                      <input
                        type="number"
                        value={studioForm.id}
                        onChange={(e) => setStudioForm({ ...studioForm, id: e.target.value })}
                        placeholder="VD: 1, 2, 19..."
                      />
                    </label>

                    <label className="field">
                      <span>ID Item Đại Diện (Cửa Hàng)</span>
                      <input
                        type="number"
                        value={studioForm.idItem}
                        onChange={(e) => setStudioForm({ ...studioForm, idItem: e.target.value })}
                        placeholder="VD: 1289 (hoặc 0)"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="field">
                      <span>Tên Danh Hiệu <strong style={{ color: '#e74c3c' }}>*</strong></span>
                      <input
                        type="text"
                        value={studioForm.name}
                        onChange={(e) => setStudioForm({ ...studioForm, name: e.target.value })}
                        placeholder="VD: 👑 Bá Chủ Thế Giới, 💎 Đại Gia NRO, 🛡️ Bất Tử..."
                        required
                        style={{ fontSize: '15px', fontWeight: 'bold' }}
                      />
                    </label>
                  </div>
                </div>

                {/* KHU VỰC 2: THIẾT LẬP SPRITE & HIỆU ỨNG ĐỘNG */}
                <div className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#3498db', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      2️⃣ Tùy Chỉnh Sprite & Hoạt Ảnh Động
                    </h3>
                    <div className="btn-group">
                      <button
                        type="button"
                        className={`btn xs ${studioForm.spriteSource === 'catalog' ? 'primary' : 'secondary'}`}
                        onClick={() => setStudioForm({ ...studioForm, spriteSource: 'catalog' })}
                      >
                        Kho Sprite Có Sẵn
                      </button>
                      <button
                        type="button"
                        className={`btn xs ${studioForm.spriteSource === 'upload' ? 'primary' : 'secondary'}`}
                        onClick={() => setStudioForm({ ...studioForm, spriteSource: 'upload' })}
                      >
                        Tải Lên Ảnh Mới (.PNG)
                      </button>
                    </div>
                  </div>

                  {studioForm.spriteSource === 'catalog' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <label className="field">
                        <span>ID Hiệu Ứng Sprite (ImgEffect_ID.png) <strong style={{ color: '#e74c3c' }}>*</strong></span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="number"
                            value={studioForm.idEffect}
                            onChange={(e) => setStudioForm({ ...studioForm, idEffect: e.target.value })}
                            placeholder="VD: 218, 222, 226, 256..."
                            required
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            className="btn sm secondary"
                            onClick={() => setEffectPickerOpen(true)}
                          >
                            🖼️ Duyệt Kho Sprite ({effectsCatalog.length})
                          </button>
                        </div>
                      </label>
                      <div className="muted" style={{ fontSize: '12px' }}>
                        💡 Hệ thống sẽ tự động bóc tách các frame hoạt họa từ file <code>data/effdata/DataEffect_{studioForm.idEffect || '{ID}'}</code> và chạy động 100% như trong game.
                      </div>
                    </div>
                  ) : (
                    /* CHẾ ĐỘ UPLOAD ẢNH SPRITE SHEET MỚI */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '8px' }}>
                      <label className="field">
                        <span>Chọn File Ảnh Sprite Sheet (.PNG)</span>
                        <input
                          type="file"
                          accept="image/png, image/jpeg"
                          onChange={handleFileSpriteUpload}
                        />
                      </label>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                        <label className="field">
                          <span style={{ fontSize: '11px' }}>Số Khung Hình (Frames)</span>
                          <input
                            type="number"
                            value={studioForm.spriteLayout.frameCount}
                            onChange={(e) => setStudioForm({
                              ...studioForm,
                              spriteLayout: { ...studioForm.spriteLayout, frameCount: Number(e.target.value) },
                            })}
                          />
                        </label>
                        <label className="field">
                          <span style={{ fontSize: '11px' }}>Số Cột (Cols)</span>
                          <input
                            type="number"
                            value={studioForm.spriteLayout.cols}
                            onChange={(e) => setStudioForm({
                              ...studioForm,
                              spriteLayout: { ...studioForm.spriteLayout, cols: Number(e.target.value) },
                            })}
                          />
                        </label>
                        <label className="field">
                          <span style={{ fontSize: '11px' }}>Rộng 1 Frame (px)</span>
                          <input
                            type="number"
                            value={studioForm.spriteLayout.frameWidth}
                            onChange={(e) => setStudioForm({
                              ...studioForm,
                              spriteLayout: { ...studioForm.spriteLayout, frameWidth: Number(e.target.value) },
                            })}
                          />
                        </label>
                        <label className="field">
                          <span style={{ fontSize: '11px' }}>Cao 1 Frame (px)</span>
                          <input
                            type="number"
                            value={studioForm.spriteLayout.frameHeight}
                            onChange={(e) => setStudioForm({
                              ...studioForm,
                              spriteLayout: { ...studioForm.spriteLayout, frameHeight: Number(e.target.value) },
                            })}
                          />
                        </label>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <label className="field" style={{ flex: 1 }}>
                          <span>Gán ID Effect Cho Ảnh Mới</span>
                          <input
                            type="number"
                            value={studioForm.idEffect}
                            onChange={(e) => setStudioForm({ ...studioForm, idEffect: e.target.value })}
                            placeholder="VD: 301, 302..."
                            required
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* KHU VỰC 3: TÙY CHỈNH CHỈ SỐ BUFF THUỘC TÍNH */}
                <div className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      3️⃣ Tùy Chỉnh Chỉ Số Thuộc Tính (Buffs)
                    </h3>
                    <span className="badge sm success" style={{ fontSize: '12px', padding: '4px 10px' }}>
                      Điểm lực chiến ước tính: <strong>+{powerScore}</strong>
                    </span>
                  </div>

                  {/* Nút thêm nhanh các chỉ số phổ biến */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>
                      ⚡ Thêm Nhanh Chỉ Số Phổ Biến:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {QUICK_STAT_BUTTONS.map((stat, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="btn xs secondary"
                          onClick={() => addQuickStat(stat)}
                          style={{ fontSize: '11px' }}
                        >
                          {stat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bảng OptionEditor đầy đủ */}
                  <OptionEditor
                    options={studioForm.options}
                    onChange={(newOpts) => setStudioForm({ ...studioForm, options: newOpts })}
                  />
                </div>

                {/* KHU VỰC 4: THIẾT LẬP NHIỆM VỤ MỞ KHÓA */}
                <div className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: studioForm.taskConfig.enabled ? '14px' : '0' }}>
                    <input
                      type="checkbox"
                      id="enableTaskConfig"
                      checked={studioForm.taskConfig.enabled}
                      onChange={(e) => setStudioForm({
                        ...studioForm,
                        taskConfig: {
                          ...studioForm.taskConfig,
                          enabled: e.target.checked,
                          name: e.target.checked && !studioForm.taskConfig.name ? `Nhiệm vụ nhận ${studioForm.name || 'Danh hiệu'}` : studioForm.taskConfig.name,
                        },
                      })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="enableTaskConfig" style={{ margin: 0, cursor: 'pointer', fontWeight: 'bold', color: '#e67e22', fontSize: '14px' }}>
                      4️⃣ Tự động tạo Nhiệm Vụ Mở Khóa danh hiệu này trong game (task_badges_template)
                    </label>
                  </div>

                  {studioForm.taskConfig.enabled && (
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '6px' }}>
                      <label className="field">
                        <span>Tên Nhiệm Vụ Hiển Thị Trong Game</span>
                        <input
                          type="text"
                          value={studioForm.taskConfig.name}
                          onChange={(e) => setStudioForm({
                            ...studioForm,
                            taskConfig: { ...studioForm.taskConfig, name: e.target.value },
                          })}
                          placeholder="VD: Săn 100 Boss để nhận danh hiệu..."
                        />
                      </label>
                      <label className="field">
                        <span>Mốc Yêu Cầu (maxCount)</span>
                        <input
                          type="number"
                          value={studioForm.taskConfig.maxCount}
                          onChange={(e) => setStudioForm({
                            ...studioForm,
                            taskConfig: { ...studioForm.taskConfig, maxCount: Number(e.target.value) },
                          })}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* KHU VỰC 5: CẤP THỬ NGHIỆM CHO NGƯỜI CHƠI TEST */}
                <div className="card" style={{ padding: '16px', background: 'rgba(155, 89, 182, 0.1)', border: '1px solid rgba(155, 89, 182, 0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>🎁</span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '13px', color: '#d2b4de' }}>Cấp Ngay Cho Nhân Vật Sau Khi Lưu (Tùy chọn):</strong>
                      <div className="muted" style={{ fontSize: '11px' }}>Nhập tên nhân vật để hệ thống tự động gán danh hiệu vĩnh viễn và đeo ngay vào game.</div>
                    </div>
                    <input
                      type="text"
                      placeholder="Tên nhân vật..."
                      value={testPlayerName}
                      onChange={(e) => setTestPlayerName(e.target.value)}
                      style={{ width: '160px', padding: '6px 10px', fontSize: '13px' }}
                    />
                  </div>
                </div>

                {/* NÚT SUBMIT LƯU DANH HIỆU */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" className="btn secondary" onClick={copyInsertSql}>
                    📋 Copy Lệnh SQL INSERT
                  </button>
                  <button type="submit" className="btn primary lg" disabled={busy} style={{ minWidth: '220px', fontSize: '15px' }}>
                    {busy ? 'Đang lưu vào Server...' : '🚀 LƯU & ÁP DỤNG DANH HIỆU'}
                  </button>
                </div>
              </div>

              {/* CỘT PHẢI: KHUNG LIVE STUDIO VISUALIZER & PREVIEW */}
              <div style={{ position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="card" style={{ padding: '20px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(243, 156, 18, 0.3)' }}>
                  <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', color: '#f39c12', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>👁️</span> LIVE STUDIO VISUALIZER
                  </h4>

                  {/* Sân khấu render hoạt họa động thật */}
                  <div style={{ marginBottom: '14px' }}>
                    <BadgeEffectPreview
                      idEffect={studioForm.idEffect}
                      name={studioForm.name || 'Xem Trước Danh Hiệu'}
                      showCharacter={true}
                      gender={studioPreviewGender}
                      scale={1.5}
                      animated={true}
                    />
                  </div>

                  {/* Bộ nút đổi tộc nhân vật xem trước */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '16px' }}>
                    <button
                      type="button"
                      className={`btn xs ${studioPreviewGender === 0 ? 'primary' : 'secondary'}`}
                      onClick={() => setStudioPreviewGender(0)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '6px 4px' }}
                    >
                      <img src="/characters/traidat_head.png" alt="Trái Đất" style={{ width: '22px', height: '22px', objectFit: 'contain', imageRendering: 'pixelated' }} />
                      <span style={{ fontSize: '11px' }}>Trái Đất</span>
                    </button>
                    <button
                      type="button"
                      className={`btn xs ${studioPreviewGender === 1 ? 'primary' : 'secondary'}`}
                      onClick={() => setStudioPreviewGender(1)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '6px 4px' }}
                    >
                      <img src="/characters/namec_head.png" alt="Namec" style={{ width: '22px', height: '22px', objectFit: 'contain', imageRendering: 'pixelated' }} />
                      <span style={{ fontSize: '11px' }}>Namec</span>
                    </button>
                    <button
                      type="button"
                      className={`btn xs ${studioPreviewGender === 2 ? 'primary' : 'secondary'}`}
                      onClick={() => setStudioPreviewGender(2)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '6px 4px' }}
                    >
                      <img src="/characters/xayda_head.png" alt="Xayda" style={{ width: '22px', height: '22px', objectFit: 'contain', imageRendering: 'pixelated' }} />
                      <span style={{ fontSize: '11px' }}>Xayda</span>
                    </button>
                  </div>

                  {/* Tóm tắt thông số danh hiệu */}
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '6px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span className="muted">Tên danh hiệu:</span>
                      <strong style={{ color: '#f8fafc' }}>{studioForm.name || '(Chưa đặt)'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span className="muted">ID Effect Sprite:</span>
                      <span className="badge sm" style={{ background: '#1e293b' }}>#{studioForm.idEffect || '?'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span className="muted">ID Item Shop:</span>
                      <span className="badge sm" style={{ background: '#1e293b' }}>#{studioForm.idItem || '0'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span className="muted">Tổng số option:</span>
                      <strong>{studioForm.options.length} dòng buff</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px', marginTop: '6px' }}>
                      <span className="muted">Điểm lực chiến:</span>
                      <strong style={{ color: '#4ade80' }}>+{powerScore} pts</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DANH SÁCH DANH HIỆU TRONG DATABASE                                */}
      {/* ========================================================================= */}
      {activeTab === 'list' && (
        <div className="tab-content">
          <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
            <div className="row" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="🔍 Tìm kiếm theo tên danh hiệu, ID, ID Effect, ID Item..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                style={{ flex: 1 }}
              />
              <span className="muted" style={{ fontSize: '13px' }}>
                Hiển thị {filteredBadges.length} / {badges.length} danh hiệu
              </span>
            </div>
          </div>

          {loading ? (
            <div className="loading-state card p-4 text-center">
              <span className="ui-spinner" /> Đang tải danh sách danh hiệu...
            </div>
          ) : filteredBadges.length === 0 ? (
            <div className="card p-4 text-center muted">
              Chưa có danh hiệu nào hoặc không khớp với từ khóa tìm kiếm. Nhấn <strong>"Mở Studio Tạo Mới"</strong> để tạo danh hiệu!
            </div>
          ) : (
            <div className="badges-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {filteredBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="card badge-card"
                  style={{
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderTop: '3px solid var(--primary, #e67e22)',
                    background: 'rgba(30, 41, 59, 0.4)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <div>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span className="badge-tag" style={{ background: 'rgba(230, 126, 34, 0.2)', color: '#f39c12', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                        ID #{badge.id}
                      </span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span className="pill sm" title="ID Hiệu ứng sprite trên đầu nhân vật" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', color: '#60a5fa' }}>
                          Effect: <strong>#{badge.idEffect}</strong>
                        </span>
                        {badge.idItem > 0 && (
                          <span className="pill sm" title="ID Item đại diện trong shop" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', color: '#a78bfa' }}>
                            Item: <strong>#{badge.idItem}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* SÂN KHẤU HOẠT ẢNH ĐỘNG CANVAS */}
                    <div className="badge-effect-stage">
                      <BadgeEffectPreview
                        idEffect={badge.idEffect}
                        name={badge.name}
                        scale={1.3}
                        animated={true}
                      />
                    </div>

                    {/* Tên danh hiệu + Icon Item liên kết */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '10px 0 14px 0' }}>
                      {badge.idItem > 0 ? (
                        <ItemIcon tempId={badge.idItem} size={36} showLabel={false} />
                      ) : (
                        <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'grid', placeItems: 'center', fontSize: '18px' }}>
                          🎖️
                        </div>
                      )}
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc', fontWeight: 'bold' }}>
                          {badge.name}
                        </h3>
                        {badge.linkedItem && (
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            Vật phẩm: {badge.linkedItem.NAME}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Danh sách Options thuộc tính buff */}
                    <div className="badge-options-list" style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Chỉ số cộng thêm (Buffs):
                      </div>
                      {(!badge.options || badge.options.length === 0) ? (
                        <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>Không có chỉ số (Chỉ hiển thị trang trí)</div>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {badge.options.map((opt, idx) => (
                            <span
                              key={idx}
                              className="option-pill"
                              style={{
                                background: 'rgba(46, 204, 113, 0.12)',
                                color: '#4ade80',
                                border: '1px solid rgba(74, 222, 128, 0.25)',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '500',
                              }}
                            >
                              {opt.description || formatOptionLabel(opt.id, opt.param, catalogMap)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="card-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                    <button
                      type="button"
                      className="btn xs primary"
                      onClick={() => editBadgeFromList(badge)}
                    >
                      🎨 Chỉnh Trong Studio
                    </button>
                    <button
                      type="button"
                      className="btn xs danger"
                      onClick={() => handleDeleteBadge(badge)}
                    >
                      🗑️ Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CẤP PHÁT & QUẢN LÝ NGƯỜI CHƠI                                    */}
      {/* ========================================================================= */}
      {activeTab === 'player' && (
        <div className="tab-content">
          <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
            <form onSubmit={handleSearchPlayer} style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                placeholder="Nhập ID Người chơi, Tên nhân vật hoặc Account ID để tra cứu..."
                value={playerQuery}
                onChange={(e) => setPlayerQuery(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn primary">
                🔍 Tìm kiếm Player
              </button>
            </form>
          </div>

          {playerResults.length > 0 && (
            <div className="row" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
              {/* Danh sách người chơi tìm thấy */}
              <div className="card" style={{ padding: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0' }}>Kết quả tìm kiếm ({playerResults.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {playerResults.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPlayer(p)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '6px',
                        background: selectedPlayer?.id === p.id ? 'var(--primary, #e67e22)' : 'rgba(255,255,255,0.04)',
                        color: selectedPlayer?.id === p.id ? '#fff' : 'inherit',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong>{p.name}</strong> <span style={{ fontSize: '11px', opacity: 0.8 }}>(ID: {p.id})</span>
                      </div>
                      <span className="badge sm" style={{ background: 'rgba(0,0,0,0.3)' }}>
                        {p.badges?.length || 0} danh hiệu
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chi tiết danh hiệu của Player được chọn */}
              {selectedPlayer && (
                <div className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                    <div>
                      <h3 style={{ margin: 0, color: '#f39c12' }}>👤 {selectedPlayer.name}</h3>
                      <span className="muted" style={{ fontSize: '12px' }}>Player ID: {selectedPlayer.id} | Account ID: {selectedPlayer.account_id}</span>
                    </div>
                  </div>

                  {/* Form cấp danh hiệu nhanh */}
                  <div className="grant-box" style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '8px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#2ecc71' }}>➕ Cấp Danh Hiệu Cho Nhân Vật</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'center' }}>
                      <select
                        value={grantForm.idEffect}
                        onChange={(e) => setGrantForm({ ...grantForm, idEffect: e.target.value })}
                      >
                        <option value="">-- Chọn danh hiệu --</option>
                        {badges.map((b) => (
                          <option key={b.id} value={b.idEffect}>
                            {b.name} (Effect #{b.idEffect})
                          </option>
                        ))}
                      </select>

                      <select
                        value={grantForm.days}
                        onChange={(e) => setGrantForm({ ...grantForm, days: e.target.value })}
                      >
                        <option value="7">7 Ngày</option>
                        <option value="30">30 Ngày (1 Tháng)</option>
                        <option value="90">90 Ngày (3 Tháng)</option>
                        <option value="365">365 Ngày (1 Năm)</option>
                        <option value="-1">♾️ Vĩnh Viễn</option>
                      </select>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={grantForm.isUse}
                          onChange={(e) => setGrantForm({ ...grantForm, isUse: e.target.checked })}
                        />
                        <span>Đeo ngay</span>
                      </label>

                      <button type="button" className="btn sm primary" onClick={handleGrantBadge} disabled={busy}>
                        Cấp ngay
                      </button>
                    </div>
                  </div>

                  {/* Danh sách danh hiệu nhân vật đang sở hữu */}
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>🎖️ Danh Hiệu Đang Sở Hữu ({selectedPlayer.badges?.length || 0})</h4>
                  {(!selectedPlayer.badges || selectedPlayer.badges.length === 0) ? (
                    <div className="muted" style={{ fontStyle: 'italic', padding: '10px 0' }}>
                      Nhân vật này chưa sở hữu bất kỳ danh hiệu nào.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {selectedPlayer.badges.map((b) => (
                        <div
                          key={b.idBadGes}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 16px',
                            background: b.isUse ? 'rgba(46, 204, 113, 0.1)' : 'rgba(255,255,255,0.03)',
                            border: b.isUse ? '1px solid rgba(46, 204, 113, 0.4)' : '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: '48px', height: '48px', display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                              <BadgeEffectPreview idEffect={b.idBadGes} name={b.name} scale={1.2} animated={b.isUse} />
                            </div>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <strong style={{ fontSize: '15px' }}>{b.name}</strong>
                                <span className="badge sm" style={{ background: '#34495e', fontSize: '11px' }}>
                                  Effect #{b.idBadGes}
                                </span>
                                {b.isUse && (
                                  <span className="badge sm success" style={{ background: '#27ae60', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}>
                                    ✓ ĐANG ĐEO
                                  </span>
                                )}
                                {b.isExpired && (
                                  <span className="badge sm danger" style={{ background: '#c0392b', color: '#fff', fontSize: '11px' }}>
                                    HẾT HẠN
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
                                Thời hạn: <strong>{b.remainingDays}</strong>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            {b.isUse ? (
                              <button
                                type="button"
                                className="btn xs secondary"
                                onClick={() => handleToggleEquipBadge(b.idBadGes, false)}
                              >
                                ⏹️ Tháo ra
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn xs success"
                                onClick={() => handleToggleEquipBadge(b.idBadGes, true)}
                                disabled={b.isExpired}
                              >
                                ▶️ Đeo vào
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn xs danger"
                              onClick={() => handleRevokeBadge(b.idBadGes)}
                            >
                              🗑️ Thu hồi
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: NHIỆM VỤ DANH HIỆU (task_badges_template)                           */}
      {/* ========================================================================= */}
      {activeTab === 'tasks' && (
        <div className="tab-content">
          <div className="card" style={{ padding: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0' }}>Bảng Nhiệm Vụ Mở Khóa Danh Hiệu (task_badges_template)</h3>
              <p className="muted" style={{ margin: 0, fontSize: '13px' }}>
                Người chơi làm nhiệm vụ trong game đạt đủ mốc `maxCount` sẽ tự động nhận danh hiệu tương ứng.
              </p>
            </div>
            <button
              type="button"
              className="btn sm primary"
              onClick={() => {
                setTaskForm({ id: '', name: '', maxCount: 100, idbadgesReward: '' });
                setTaskModalOpen(true);
              }}
            >
              ➕ Thêm Nhiệm Vụ
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '12px' }}>ID</th>
                  <th style={{ padding: '12px' }}>Hiệu ứng thưởng</th>
                  <th style={{ padding: '12px' }}>Tên Nhiệm Vụ</th>
                  <th style={{ padding: '12px' }}>Số lượng yêu cầu (maxCount)</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#f39c12' }}>#{t.id}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BadgeEffectPreview idEffect={t.idbadgesReward} scale={1.0} animated={false} />
                        <span className="badge sm" style={{ background: '#1e293b' }}>
                          Effect #{t.idbadgesReward}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}><strong>{t.NAME || t.name}</strong></td>
                    <td style={{ padding: '12px' }}>{t.maxCount}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn xs secondary"
                        onClick={() => {
                          setTaskForm({
                            id: t.id,
                            name: t.NAME || t.name,
                            maxCount: t.maxCount,
                            idbadgesReward: t.idbadgesReward,
                          });
                          setTaskModalOpen(true);
                        }}
                      >
                        ✏️ Sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SỔ TAY CƠ CHẾ & HƯỚNG DẪN                                         */}
      {/* ========================================================================= */}
      {activeTab === 'guide' && (
        <div className="tab-content guide-tab">
          <div className="card" style={{ padding: '24px', lineHeight: 1.6 }}>
            <h2 style={{ color: '#f39c12', marginTop: 0 }}>📚 Sổ Tay Cơ Chế Danh Hiệu (Badges System) Trong Ngọc Rồng Online</h2>

            <div style={{ background: 'rgba(52, 152, 219, 0.1)', borderLeft: '4px solid #3498db', padding: '12px 16px', borderRadius: '4px', marginBottom: '20px' }}>
              <strong>Tổng quan kiến trúc:</strong> Hệ thống Danh hiệu bao gồm 4 phần chính:
              <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                <li><strong>Cơ sở dữ liệu:</strong> Bảng <code>data_badges</code> (lưu mẫu danh hiệu) và <code>task_badges_template</code> (nhiệm vụ mở khóa).</li>
                <li><strong>Gói tin Client - Server:</strong> Gói tin <code>Message(24)</code>, type 2, gửi ID Effect để Client vẽ ảnh sprite danh hiệu bay trên đầu nhân vật.</li>
                <li><strong>Hệ thống cộng chỉ số (Stats Buffs):</strong> Khi người chơi kích hoạt danh hiệu (<code>isUse = true</code>), hàm <code>BagesTemplate.sendListItemOption(player)</code> nạp toàn bộ Options vào <code>NPoint.java</code> để buff trực tiếp HP, KI, Sức đánh, Giáp, Chí mạng,...</li>
                <li><strong>Dữ liệu nhân vật:</strong> Cột <code>player.dataBadges</code> lưu mảng JSON danh hiệu sở hữu và thời hạn sử dụng.</li>
              </ol>
            </div>

            <h3 style={{ color: '#2ecc71', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
              1. Cấu trúc bảng <code>data_badges</code>
            </h3>
            <table className="table" style={{ width: '100%', marginBottom: '20px' }}>
              <thead>
                <tr>
                  <th>Cột</th>
                  <th>Kiểu</th>
                  <th>Ý nghĩa & Quy tắc</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>id</code></td>
                  <td>INT (PK)</td>
                  <td>Mã định danh duy nhất của mẫu danh hiệu.</td>
                </tr>
                <tr>
                  <td><code>idEffect</code></td>
                  <td>INT</td>
                  <td><strong>ID Hiệu ứng sprite trên Client:</strong> Client Ngọc Rồng sẽ vẽ icon/ảnh danh hiệu tương ứng với ID này trên đầu người chơi khi nhận gói tin Message 24.</td>
                </tr>
                <tr>
                  <td><code>idItem</code></td>
                  <td>INT</td>
                  <td>Mã ID Item đại diện trong shop danh hiệu (TabShopDanhHieu / TabShopSoHuu).</td>
                </tr>
                <tr>
                  <td><code>NAME</code></td>
                  <td>VARCHAR</td>
                  <td>Tên hiển thị của danh hiệu (ví dụ: "Đại Gia Mới Nhú", "Top 1 Chiến Thần").</td>
                </tr>
                <tr>
                  <td><code>Options</code></td>
                  <td>JSON</td>
                  <td>Danh sách chỉ số thuộc tính cộng thêm dạng mảng JSON: <code>[{`{"id": 50, "param": 15}`}, {`{"id": 77, "param": 20}`}]</code>.</td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ color: '#2ecc71', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
              2. Các Option chỉ số thông dụng (ItemOptionTemplate ID)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px', marginBottom: '20px' }}>
              <div className="card" style={{ padding: '10px' }}><strong>#50:</strong> Sức đánh +#%</div>
              <div className="card" style={{ padding: '10px' }}><strong>#77:</strong> HP +#%</div>
              <div className="card" style={{ padding: '10px' }}><strong>#103:</strong> KI +#%</div>
              <div className="card" style={{ padding: '10px' }}><strong>#14:</strong> Chí mạng +#%</div>
              <div className="card" style={{ padding: '10px' }}><strong>#47:</strong> Giáp +# (điểm cộng)</div>
              <div className="card" style={{ padding: '10px' }}><strong>#94:</strong> Giáp +#%</div>
              <div className="card" style={{ padding: '10px' }}><strong>#108:</strong> Né đòn +#%</div>
              <div className="card" style={{ padding: '10px' }}><strong>#5:</strong> Tăng #% sát thương quái/boss</div>
              <div className="card" style={{ padding: '10px' }}><strong>#114:</strong> Tốc độ di chuyển +#%</div>
              <div className="card" style={{ padding: '10px' }}><strong>#93:</strong> Hạn sử dụng # ngày (hiển thị)</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BỘ CHỌN SPRITE HIỆU ỨNG (EFFECT PICKER)                           */}
      {/* ========================================================================= */}
      {effectPickerOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div className="modal-content card" style={{ maxWidth: '750px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, color: '#f39c12' }}>🖼️ Kho Hiệu Ứng Sprite (data/effect/x4/)</h3>
              <button type="button" className="btn sm" onClick={() => setEffectPickerOpen(false)}>✕</button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <input
                type="text"
                placeholder="🔍 Tìm theo ID hiệu ứng (ví dụ: 218, 220, 226...)"
                value={effectPickerFilter}
                onChange={(e) => setEffectPickerFilter(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px', padding: '4px' }}>
              {filteredEffects.map((eff) => (
                <div
                  key={eff.id}
                  onClick={() => chooseEffectFromPicker(eff.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px 6px',
                    borderRadius: '8px',
                    background: Number(studioForm.idEffect) === eff.id ? 'rgba(230, 126, 34, 0.3)' : 'rgba(255,255,255,0.04)',
                    border: Number(studioForm.idEffect) === eff.id ? '2px solid #f39c12' : '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px' }}>
                    <BadgeEffectPreview idEffect={eff.id} scale={1.0} animated={false} />
                  </div>
                  <strong style={{ fontSize: '12px', color: '#f8fafc' }}>Effect #{eff.id}</strong>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
              <button type="button" className="btn sm secondary" onClick={() => setEffectPickerOpen(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SỬA NHIỆM VỤ DANH HIỆU */}
      {taskModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="modal-content card" style={{ maxWidth: '500px', width: '100%', padding: '24px' }}>
            <h3 style={{ margin: 0, marginBottom: '16px', color: '#f39c12' }}>
              {taskForm.id ? `✏️ Sửa Nhiệm Vụ #${taskForm.id}` : '➕ Thêm Nhiệm Vụ Mới'}
            </h3>
            <form onSubmit={handleSaveTask}>
              <div style={{ marginBottom: '12px' }}>
                <label className="field">
                  <span>Tên Nhiệm Vụ</span>
                  <input
                    type="text"
                    value={taskForm.name}
                    onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                    placeholder="VD: Săn 100 Boss..."
                    required
                  />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <label className="field">
                  <span>Mốc yêu cầu (maxCount)</span>
                  <input
                    type="number"
                    value={taskForm.maxCount}
                    onChange={(e) => setTaskForm({ ...taskForm, maxCount: e.target.value })}
                    required
                  />
                </label>
                <label className="field">
                  <span>ID Effect thưởng</span>
                  <input
                    type="number"
                    value={taskForm.idbadgesReward}
                    onChange={(e) => setTaskForm({ ...taskForm, idbadgesReward: e.target.value })}
                    placeholder="VD: 218..."
                    required
                  />
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn secondary" onClick={() => setTaskModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn primary">Lưu Nhiệm Vụ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
