import { useEffect, useMemo, useState } from 'react';
import { api, getServerId } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';
import GiftcodeItemBuilder, {
  itemsToDetailJson,
  detailJsonToItems,
  previewItemsText,
} from '../components/GiftcodeItemBuilder';
import { formatLiveSync } from '../utils/liveSync';
import { useOptionMap } from '../components/OptionEditor';
import AiGiftcodeModal from '../components/AiGiftcodeModal';

function toDatetimeLocal(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 0, 0);
  return toDatetimeLocal(d);
}

function generateCode(prefix = 'NRO') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}${s}`;
}

const EXPIRY_PRESETS = [
  { label: '+7 ngày', days: 7 },
  { label: '+30 ngày', days: 30 },
  { label: '+90 ngày', days: 90 },
  { label: '+1 năm', days: 365 },
];

const COUNT_PRESETS = [1, 100, 500, 1000, 5000, 10000];

const emptyForm = () => ({
  code: generateCode(),
  count_left: 1000,
  expired: addDays(30).replace('T', ' ') + ':00',
  items: [],
});

function giftStatus(g) {
  const expired = g.expired && new Date(String(g.expired).replace(' ', 'T')) <= new Date();
  if (expired) return { key: 'expired', label: 'Hết hạn', cls: 'bad' };
  if (g.count_left <= 0) return { key: 'empty', label: 'Hết lượt', cls: 'bad' };
  if (g.count_left <= 10) return { key: 'low', label: 'Sắp hết', cls: 'admin' };
  return { key: 'active', label: 'Đang hoạt động', cls: 'ok' };
}

export default function GiftcodesPage() {
  const [rows, setRows] = useState([]);
  const [filterQ, setFilterQ] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rawDetail, setRawDetail] = useState('[]');
  const [loading, setLoading] = useState(false);
  const fb = useFeedback();
  const optionMap = useOptionMap();

  // Modals state
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    prefix: 'VIP',
    count: 50,
    count_left: 1,
    expired: addDays(30).replace('T', ' ') + ':00',
  });
  const [generatedCodes, setGeneratedCodes] = useState([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const [claimersModalOpen, setClaimersModalOpen] = useState(false);
  const [claimersData, setClaimersData] = useState({ code: '', total: 0, players: [] });
  const [claimersLoading, setClaimersLoading] = useState(false);

  // AI Modal state
  const [aiModalOpen, setAiModalOpen] = useState(false);

  function handleAiApply(data) {
    setForm({
      code: data.code || generateCode(),
      count_left: data.count_left || 1000,
      expired: (data.expired || addDays(30).replace('T', ' ') + ':00').slice(0, 19),
      items: data.items || [],
    });
    setShowAdvanced(false);
    fb.success(`Đã áp dụng ${data.items?.length || 0} vật phẩm từ AI DeepSeek vào form!`);
  }

  function handleAiSavedDirectly(data) {
    fb.success(`Đã tạo thành công giftcode ${data.code} bằng AI DeepSeek!${formatLiveSync(data.liveSync)}`);
    load();
  }

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterQ.trim()) params.set('q', filterQ.trim());
      if (filterStatus) params.set('status', filterStatus);
      const res = await api(`/giftcodes?${params}`);
      setRows(res.data || []);
    } catch (e) {
      fb.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filterStatus]);

  async function openEdit(id) {
    try {
      const res = await api(`/giftcodes/${id}`);
      const g = res.data;
      const items = detailJsonToItems(g.detailParsed || g.detail);
      setEditingId(id);
      setForm({
        code: g.code,
        count_left: g.count_left,
        expired: g.expired?.slice?.(0, 19) || g.expired,
        items,
      });
      setRawDetail(typeof g.detail === 'string' ? g.detail : JSON.stringify(g.detailParsed || [], null, 2));
      setShowAdvanced(false);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (e) {
      fb.error(e.message);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    try {
      const detailStr = showAdvanced ? rawDetail : itemsToDetailJson(form.items);
      const payload = {
        code: form.code,
        count_left: form.count_left,
        expired: form.expired,
        detail: detailStr,
        serverId: getServerId(),
      };
      if (editingId) {
        const res = await api(`/giftcodes/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
        fb.success(`Đã cập nhật giftcode ${form.code}${formatLiveSync(res.data)}`);
      } else {
        const res = await api('/giftcodes', { method: 'POST', body: JSON.stringify(payload) });
        fb.success(`Đã tạo giftcode ${form.code}${formatLiveSync(res.data)}`);
      }
      resetForm();
      load();
    } catch (err) {
      fb.error(err.message);
    }
  }

  async function handleDelete(id, code) {
    if (!window.confirm(`Xóa vĩnh viễn giftcode "${code}" khỏi Database?`)) return;
    try {
      const res = await api(`/giftcodes/${id}`, { method: 'DELETE', body: JSON.stringify({ serverId: getServerId() }) });
      fb.success(`Đã xóa giftcode ${code}${formatLiveSync(res.data)}`);
      load();
    } catch (e) {
      fb.error(e.message);
    }
  }

  async function handleClone(id) {
    try {
      const res = await api(`/giftcodes/${id}/clone`, { method: 'POST', body: JSON.stringify({ serverId: getServerId() }) });
      fb.success(`Đã nhân bản mã mới: ${res.data?.code}${formatLiveSync(res.data)}`);
      load();
    } catch (e) {
      fb.error(e.message);
    }
  }

  async function handleTopup(id, amount) {
    try {
      const res = await api(`/giftcodes/${id}/topup`, { method: 'POST', body: JSON.stringify({ amount, serverId: getServerId() }) });
      fb.success(`Đã cộng +${amount} lượt${formatLiveSync(res.data)}`);
      load();
    } catch (e) {
      fb.error(e.message);
    }
  }

  async function openClaimers(id) {
    setClaimersModalOpen(true);
    setClaimersLoading(true);
    try {
      const res = await api(`/giftcodes/${id}/claimers`);
      setClaimersData(res.data || { code: '', total: 0, players: [] });
    } catch (err) {
      fb.error(err.message);
    } finally {
      setClaimersLoading(false);
    }
  }

  async function handleBulkGenerate(e) {
    e.preventDefault();
    setBulkSubmitting(true);
    try {
      const detailStr = showAdvanced ? rawDetail : itemsToDetailJson(form.items);
      const res = await api('/giftcodes/bulk-generate', {
        method: 'POST',
        body: JSON.stringify({
          ...bulkForm,
          detail: detailStr,
          serverId: getServerId(),
        }),
      });
      setGeneratedCodes(res.data?.codes || []);
      fb.success(`Đã sinh ${res.data?.count || 0} giftcodes thành công vào Database MySQL!`);
      load();
    } catch (err) {
      fb.error(err.message);
    } finally {
      setBulkSubmitting(false);
    }
  }

  function copyAllCodes() {
    if (!generatedCodes.length) return;
    navigator.clipboard.writeText(generatedCodes.join('\n')).then(() => {
      fb.success(`Đã sao chép ${generatedCodes.length} mã code vào bộ nhớ đệm!`);
    });
  }

  function downloadCodesTxt() {
    if (!generatedCodes.length) return;
    const blob = new Blob([generatedCodes.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `giftcodes_${bulkForm.prefix}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm());
    setShowAdvanced(false);
    setRawDetail('[]');
  }

  function copyCodeText(code) {
    navigator.clipboard.writeText(code).then(() => {
      fb.success(`Đã sao chép mã "${code}"!`);
    });
  }

  // Quick Preset Handlers
  function applyPresetType(type) {
    if (type === 'tanthu') {
      setForm({
        code: generateCode('TANTHU_'),
        count_left: 10000,
        expired: addDays(30).replace('T', ' ') + ':00',
        items: [
          { id: -1, quantity: 50000000, name: 'Vàng', options: [] }, // 50 triệu vàng
          { id: -2, quantity: 5000, name: 'Ngọc xanh', options: [] }, // 5.000 ngọc xanh
          { id: 457, quantity: 50, options: [{ id: 30, param: 0 }] }, // 50 thỏi vàng
          { id: 9, quantity: 100, options: [{ id: 30, param: 0 }] }, // 100 đậu thần cấp 10
        ],
      });
      fb.success('Đã nạp mẫu: Quà Tân Thủ (50M Vàng, 5.000 Ngọc, 50 Thỏi vàng, 100 Đậu)!');
    } else if (type === 'denbu') {
      setForm({
        code: generateCode('DENBU_'),
        count_left: 5000,
        expired: addDays(7).replace('T', ' ') + ':00',
        items: [
          { id: -1, quantity: 100000000, name: 'Vàng', options: [] }, // 100 triệu vàng
          { id: -2, quantity: 10000, name: 'Ngọc xanh', options: [] }, // 10.000 ngọc xanh
          { id: -3, quantity: 5000, name: 'Hồng ngọc', options: [] }, // 5.000 hồng ngọc
          { id: 457, quantity: 100, options: [{ id: 30, param: 0 }] }, // 100 thỏi vàng
          { id: 14, quantity: 5, options: [{ id: 30, param: 0 }] }, // Ngọc rồng 1 sao
        ],
      });
      fb.success('Đã nạp mẫu: Đền Bù Bảo Trì (100M Vàng, 10k Ngọc, 5k Hồng ngọc, 100 Thỏi vàng)!');
    } else if (type === 'vip') {
      setForm({
        code: generateCode('VIP_'),
        count_left: 1,
        expired: addDays(365).replace('T', ' ') + ':00',
        items: [
          { id: -1, quantity: 500000000, name: 'Vàng', options: [] }, // 500 triệu vàng
          { id: -2, quantity: 50000, name: 'Ngọc xanh', options: [] }, // 50.000 ngọc xanh
          { id: -3, quantity: 20000, name: 'Hồng ngọc', options: [] }, // 20.000 hồng ngọc
          { id: 457, quantity: 100, options: [{ id: 30, param: 0 }] }, // 100 thỏi vàng
          { id: 545, quantity: 1, options: [{ id: 50, param: 30 }, { id: 77, param: 30 }, { id: 93, param: 30 }] },
        ],
      });
      fb.success('Đã nạp mẫu: Quà VIP Đua Top (500M Vàng, 50k Ngọc, 20k Hồng ngọc, Cải trang VIP)!');
    }
  }

  // Currency two-way sync helpers
  const currentGold = useMemo(() => {
    const item = (form.items || []).find((it) => Number(it.id) === -1);
    return item ? Number(item.quantity) || 0 : 0;
  }, [form.items]);

  const currentGem = useMemo(() => {
    const item = (form.items || []).find((it) => Number(it.id) === -2);
    return item ? Number(item.quantity) || 0 : 0;
  }, [form.items]);

  const currentRuby = useMemo(() => {
    const item = (form.items || []).find((it) => Number(it.id) === -3);
    return item ? Number(item.quantity) || 0 : 0;
  }, [form.items]);

  function setCurrencyAmount(currencyId, amount, name) {
    const numAmount = Math.max(0, Number(amount) || 0);
    const nextItems = [...(form.items || [])];
    const idx = nextItems.findIndex((it) => Number(it.id) === currencyId);

    if (numAmount <= 0) {
      if (idx >= 0) {
        nextItems.splice(idx, 1);
      }
    } else {
      if (idx >= 0) {
        nextItems[idx] = { ...nextItems[idx], quantity: numAmount };
      } else {
        nextItems.unshift({
          id: currencyId,
          name: name,
          quantity: numAmount,
          options: [],
        });
      }
    }
    setForm((p) => ({ ...p, items: nextItems }));
  }

  function addCurrencyAmount(currencyId, delta, name, maxLimit) {
    let current = 0;
    if (currencyId === -1) current = currentGold;
    else if (currencyId === -2) current = currentGem;
    else if (currencyId === -3) current = currentRuby;

    let next = current + delta;
    if (maxLimit && next > maxLimit) next = maxLimit;
    setCurrencyAmount(currencyId, next, name);
  }

  // Stats calculation
  const stats = useMemo(() => {
    let active = 0;
    let empty = 0;
    let expired = 0;
    rows.forEach((r) => {
      const st = giftStatus(r);
      if (st.key === 'active') active++;
      else if (st.key === 'empty' || st.key === 'low') empty++;
      else if (st.key === 'expired') expired++;
    });
    return { total: rows.length, active, empty, expired };
  }, [rows]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Quản Lý Giftcodes (Giftcode Studio)"
        description="Tạo và phát mã quà tặng, tích hợp AI DeepSeek tự động chọn vật phẩm, sinh mã hàng loạt và tra cứu lịch sử người nhập."
        stats={
          <>
            <span className="page-stat-pill">
              <strong>{stats.total}</strong> mã code
            </span>
            <span className="page-stat-pill ok">
              <strong>{stats.active}</strong> đang mở
            </span>
          </>
        }
        actions={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn primary"
              style={{
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                border: 'none',
                boxShadow: '0 2px 10px rgba(37, 99, 235, 0.4)',
                fontWeight: 700,
              }}
              onClick={() => setAiModalOpen(true)}
              title="Tự động tạo giftcode bằng AI DeepSeek từ mô tả"
            >
              ✨ AI Sinh Code (DeepSeek)
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setGeneratedCodes([]);
                setBulkModalOpen(true);
              }}
              title="Tạo từ 10 đến 1.000 giftcode ngẫu nhiên cùng loại quà"
            >
              📑 Sinh Hàng Loạt (Bulk)
            </button>
            <button type="button" className="btn" onClick={load}>
              🔄 Làm Mới
            </button>
          </div>
        }
      />

      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      {/* 4 KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div className="card-inner" style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '16px' }}>
          <div className="muted" style={{ fontSize: '0.85rem' }}>🎁 Tổng Số Giftcode</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#60a5fa', marginTop: '4px' }}>{stats.total}</div>
          <div className="muted" style={{ fontSize: '0.78rem', marginTop: '2px' }}>Lưu bền vững trên Database</div>
        </div>
        <div className="card-inner" style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '16px' }}>
          <div className="muted" style={{ fontSize: '0.85rem' }}>🟢 Đang Hoạt Động</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#34d399', marginTop: '4px' }}>{stats.active}</div>
          <div className="muted" style={{ fontSize: '0.78rem', marginTop: '2px' }}>Người chơi có thể nhập ngay</div>
        </div>
        <div className="card-inner" style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '12px', padding: '16px' }}>
          <div className="muted" style={{ fontSize: '0.85rem' }}>⚠️ Hết Lượt / Sắp Hết</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#facc15', marginTop: '4px' }}>{stats.empty}</div>
          <div className="muted" style={{ fontSize: '0.78rem', marginTop: '2px' }}>Cần cộng thêm lượt</div>
        </div>
        <div className="card-inner" style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '16px' }}>
          <div className="muted" style={{ fontSize: '0.85rem' }}>⏰ Đã Hết Hạn</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f87171', marginTop: '4px' }}>{stats.expired}</div>
          <div className="muted" style={{ fontSize: '0.78rem', marginTop: '2px' }}>Không thể nhập được nữa</div>
        </div>
      </div>

      {/* DANH SÁCH GIFTCODES & TÌM KIẾM */}
      <div className="card" style={{ padding: '18px', borderRadius: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Danh Sách Giftcodes</h3>
            <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd' }}>{rows.length} mã</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <input
              className="input sm"
              style={{ width: '220px' }}
              placeholder="🔍 Tìm mã code..."
              value={filterQ}
              onChange={(e) => setFilterQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
            <select className="input sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Tất cả trạng thái</option>
              <option value="active">🟢 Đang hoạt động</option>
              <option value="empty">⚠️ Hết lượt</option>
              <option value="expired">⏰ Hết hạn</option>
            </select>
            <button type="button" className="btn sm" onClick={load}>Tìm</button>
          </div>
        </div>

        {/* TABLE */}
        <div className="table-wrap card-inner" style={{ padding: 0, borderRadius: '10px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>⏳ Đang tải...</div>
          ) : rows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
              Không tìm thấy giftcode nào. Hãy tạo mã mới hoặc dùng AI sinh code ở trên!
            </div>
          ) : (
            <table className="compact" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(15, 23, 42, 0.85)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ width: '180px' }}>Mã Giftcode</th>
                  <th style={{ width: '120px' }}>Lượt Còn Lại</th>
                  <th>Vật Phẩm Quà Tặng</th>
                  <th style={{ width: '150px' }}>Hạn Sử Dụng</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Trạng Thái</th>
                  <th style={{ width: '220px', textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((g) => {
                  const st = giftStatus(g);
                  const isEditing = editingId === g.id;
                  return (
                    <tr
                      key={g.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        background: isEditing ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                      }}
                    >
                      {/* Code */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong style={{ fontSize: '1rem', color: '#60a5fa', fontFamily: 'monospace' }}>
                            {g.code}
                          </strong>
                          <button
                            type="button"
                            className="btn sm ghost"
                            style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                            onClick={() => copyCodeText(g.code)}
                            title="Sao chép mã"
                          >
                            📋
                          </button>
                        </div>
                        <span className="muted" style={{ fontSize: '0.72rem' }}>ID #{g.id}</span>
                      </td>

                      {/* Lượt */}
                      <td>
                        <strong style={{ fontSize: '0.95rem', color: g.count_left > 0 ? '#34d399' : '#ef4444' }}>
                          {Number(g.count_left || 0).toLocaleString()}
                        </strong>
                        <div style={{ display: 'flex', gap: '2px', marginTop: '2px' }}>
                          <button
                            type="button"
                            className="btn sm ghost"
                            style={{ padding: '0 4px', fontSize: '0.7rem' }}
                            onClick={() => handleTopup(g.id, 100)}
                            title="Cộng thêm 100 lượt"
                          >
                            +100
                          </button>
                          <button
                            type="button"
                            className="btn sm ghost"
                            style={{ padding: '0 4px', fontSize: '0.7rem' }}
                            onClick={() => handleTopup(g.id, 1000)}
                            title="Cộng thêm 1.000 lượt"
                          >
                            +1k
                          </button>
                        </div>
                      </td>

                      {/* Items */}
                      <td>
                        <div style={{ fontSize: '0.85rem', color: '#e2e8f0', whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                          {previewItemsText(g.detailParsed || g.detail, optionMap)}
                        </div>
                      </td>

                      {/* Expired */}
                      <td>
                        <div style={{ fontSize: '0.82rem' }}>{g.expired ? String(g.expired).slice(0, 16) : 'Vĩnh viễn'}</div>
                      </td>

                      {/* Status */}
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge sm ${st.cls}`}>{st.label}</span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '4px' }}>
                          <button
                            type="button"
                            className="btn sm ghost secondary"
                            onClick={() => openClaimers(g.id)}
                            title="Tra cứu danh sách nhân vật đã nhập mã này"
                          >
                            👥 Đã nhập
                          </button>
                          <button
                            type="button"
                            className="btn sm ghost"
                            onClick={() => openEdit(g.id)}
                            title="Sửa giftcode"
                          >
                            ✏️ Sửa
                          </button>
                          <button
                            type="button"
                            className="btn sm ghost"
                            onClick={() => handleClone(g.id)}
                            title="Nhân bản mã mới"
                          >
                            📋 Nhân bản
                          </button>
                          <button
                            type="button"
                            className="btn sm ghost danger"
                            onClick={() => handleDelete(g.id, g.code)}
                            title="Xóa giftcode"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* FORM TẠO / SỬA GIFTCODE */}
      <form className="card" onSubmit={handleSave} style={{ padding: '22px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
              {editingId ? `Chỉnh Sửa Giftcode: ${form.code}` : 'Tạo Giftcode Mới'}
            </h3>
            <p className="muted" style={{ margin: '2px 0 0 0', fontSize: '0.84rem' }}>
              Cấu hình số lượt, thời hạn và chọn danh sách vật phẩm quà tặng kèm chỉ số.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!editingId && (
              <>
                <button
                  type="button"
                  className="btn sm secondary"
                  style={{ color: '#a78bfa', borderColor: 'rgba(167, 139, 250, 0.4)' }}
                  onClick={() => setAiModalOpen(true)}
                  title="Nhập mô tả để AI DeepSeek tự động chọn vật phẩm và chỉ số"
                >
                  ✨ AI Điền Form
                </button>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => setForm((p) => ({ ...p, code: generateCode() }))}
                >
                  🎲 Đổi Mã Ngẫu Nhiên
                </button>
              </>
            )}
            {editingId && (
              <button type="button" className="btn sm ghost" onClick={resetForm}>
                ✕ Hủy Chỉnh Sửa
              </button>
            )}
          </div>
        </div>

        {/* PRESET QUICK BUTTONS */}
        {!editingId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="muted" style={{ fontSize: '0.82rem' }}>Mẫu có sẵn:</span>
            <button type="button" className="btn sm secondary" onClick={() => applyPresetType('tanthu')}>
              🎁 Quà Tân Thủ (10.000 lượt)
            </button>
            <button type="button" className="btn sm secondary" onClick={() => applyPresetType('denbu')}>
              🛡️ Đền Bù Bảo Trì (5.000 lượt)
            </button>
            <button type="button" className="btn sm secondary" onClick={() => applyPresetType('vip')}>
              👑 Quà VIP Đua Top (1 lượt)
            </button>
          </div>
        )}

        {/* BASIC FIELDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <div>
            <label className="label">Mã Code:</label>
            <input
              className="input"
              style={{ fontWeight: 700, fontFamily: 'monospace', letterSpacing: '1px' }}
              required
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase().replace(/\s+/g, '') }))}
            />
          </div>
          <div>
            <label className="label">Số Lượt Có Thể Nhập:</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="number"
                className="input"
                min={0}
                required
                value={form.count_left}
                onChange={(e) => setForm((p) => ({ ...p, count_left: Number(e.target.value) }))}
              />
              <select
                className="input"
                style={{ width: '110px' }}
                value=""
                onChange={(e) => e.target.value && setForm((p) => ({ ...p, count_left: Number(e.target.value) }))}
              >
                <option value="">Gợi ý</option>
                {COUNT_PRESETS.map((c) => (
                  <option key={c} value={c}>{c.toLocaleString()} lượt</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Hạn Sử Dụng:</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="datetime-local"
                className="input"
                value={form.expired?.slice(0, 16)}
                onChange={(e) => setForm((p) => ({ ...p, expired: e.target.value.replace('T', ' ') + ':00' }))}
              />
              <select
                className="input"
                style={{ width: '100px' }}
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    setForm((p) => ({ ...p, expired: addDays(Number(e.target.value)).replace('T', ' ') + ':00' }));
                  }
                }}
              >
                <option value="">+Ngày</option>
                {EXPIRY_PRESETS.map((ep) => (
                  <option key={ep.days} value={ep.days}>{ep.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* TIỀN TỆ TẶNG KÈM BLOCK */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            borderRadius: '12px',
            padding: '16px 18px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '1.05rem', color: '#facc15' }}>💰 Tiền Tệ Tặng Kèm (Cộng Thẳng Vào Ví Nhân Vật)</strong>
              <span className="badge sm ok">Không chiếm ô hành trang</span>
            </div>
            <span className="muted" style={{ fontSize: '0.8rem' }}>
              Người chơi nhận trực tiếp vào số dư vàng/ngọc trên người khi nhập mã
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            {/* VÀNG (GOLD) - ID: -1 */}
            <div
              style={{
                background: 'rgba(234, 179, 8, 0.05)',
                border: '1px solid rgba(234, 179, 8, 0.25)',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#fde047', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🪙</span> Vàng (Gold)
                </span>
                <span style={{ fontSize: '0.78rem', color: currentGold > 0 ? '#fde047' : '#94a3b8', fontWeight: 600 }}>
                  {currentGold > 0 ? `${currentGold.toLocaleString()} vàng` : 'Chưa tặng'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="number"
                  min={0}
                  max={2000000000}
                  className="input sm"
                  style={{ fontWeight: 700, color: '#fde047', width: '100%' }}
                  placeholder="Nhập số vàng tặng..."
                  value={currentGold || ''}
                  onChange={(e) => setCurrencyAmount(-1, Number(e.target.value), 'Vàng')}
                />
                {currentGold > 0 && (
                  <button
                    type="button"
                    className="btn sm ghost danger"
                    title="Xóa vàng (đặt về 0)"
                    onClick={() => setCurrencyAmount(-1, 0, 'Vàng')}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <button type="button" className="btn sm ghost" style={{ fontSize: '0.72rem', padding: '2px 6px' }} onClick={() => addCurrencyAmount(-1, 10000000, 'Vàng', 2000000000)}>+10Tr</button>
                <button type="button" className="btn sm ghost" style={{ fontSize: '0.72rem', padding: '2px 6px' }} onClick={() => addCurrencyAmount(-1, 50000000, 'Vàng', 2000000000)}>+50Tr</button>
                <button type="button" className="btn sm ghost" style={{ fontSize: '0.72rem', padding: '2px 6px' }} onClick={() => addCurrencyAmount(-1, 100000000, 'Vàng', 2000000000)}>+100Tr</button>
                <button type="button" className="btn sm ghost" style={{ fontSize: '0.72rem', padding: '2px 6px' }} onClick={() => addCurrencyAmount(-1, 500000000, 'Vàng', 2000000000)}>+500Tr</button>
                <button type="button" className="btn sm ghost" style={{ fontSize: '0.72rem', padding: '2px 6px', color: '#facc15', fontWeight: 700 }} onClick={() => setCurrencyAmount(-1, 2000000000, 'Vàng')}>Max 2 Tỷ</button>
              </div>
            </div>

            {/* NGỌC XANH (GEM) - ID: -2 */}
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '1.2rem' }}>💎</span> Ngọc Xanh (Gem)
                </span>
                <span style={{ fontSize: '0.78rem', color: currentGem > 0 ? '#34d399' : '#94a3b8', fontWeight: 600 }}>
                  {currentGem > 0 ? `${currentGem.toLocaleString()} ngọc` : 'Chưa tặng'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="number"
                  min={0}
                  max={200000000}
                  className="input sm"
                  style={{ fontWeight: 700, color: '#34d399', width: '100%' }}
                  placeholder="Nhập số ngọc xanh..."
                  value={currentGem || ''}
                  onChange={(e) => setCurrencyAmount(-2, Number(e.target.value), 'Ngọc xanh')}
                />
                {currentGem > 0 && (
                  <button
                    type="button"
                    className="btn sm ghost danger"
                    title="Xóa ngọc xanh (đặt về 0)"
                    onClick={() => setCurrencyAmount(-2, 0, 'Ngọc xanh')}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <button type="button" className="btn sm ghost" style={{ fontSize: '0.72rem', padding: '2px 6px' }} onClick={() => addCurrencyAmount(-2, 1000, 'Ngọc xanh', 200000000)}>+1k</button>
                <button type="button" className="btn sm ghost" style={{ fontSize: '0.72rem', padding: '2px 6px' }} onClick={() => addCurrencyAmount(-2, 5000, 'Ngọc xanh', 200000000)}>+5k</button>
                <button type="button" className="btn sm ghost" style={{ fontSize: '0.72rem', padding: '2px 6px' }} onClick={() => addCurrencyAmount(-2, 10000, 'Ngọc xanh', 200000000)}>+10k</button>
                <button type="button" className="btn sm ghost" style={{ fontSize: '0.72rem', padding: '2px 6px' }} onClick={() => addCurrencyAmount(-2, 50000, 'Ngọc xanh', 200000000)}>+50k</button>
                <button type="button" className="btn sm ghost" style={{ fontSize: '0.72rem', padding: '2px 6px', color: '#34d399', fontWeight: 700 }} onClick={() => addCurrencyAmount(-2, 100000, 'Ngọc xanh', 200000000)}>+100k</button>
              </div>
            </div>

            {/* HỒNG NGỌC (RUBY) - ID: -3 */}
            <div
              style={{
                background: 'rgba(244, 63, 94, 0.05)',
                border: '1px solid rgba(244, 63, 94, 0.25)',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#fb7185', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🔴</span> Hồng Ngọc (Ruby)
                </span>
                <span style={{ fontSize: '0.78rem', color: currentRuby > 0 ? '#fb7185' : '#94a3b8', fontWeight: 600 }}>
                  {currentRuby > 0 ? `${currentRuby.toLocaleString()} hồng ngọc` : 'Chưa tặng'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="number"
                  min={0}
                  max={200000000}
                  className="input sm"
                  style={{ fontWeight: 700, color: '#fb7185', width: '100%' }}
                  placeholder="Nhập số hồng ngọc..."
                  value={currentRuby || ''}
                  onChange={(e) => setCurrencyAmount(-3, Number(e.target.value), 'Hồng ngọc')}
                />
                {currentRuby > 0 && (
                  <button
                    type="button"
                    className="btn sm ghost danger"
                    title="Xóa hồng ngọc (đặt về 0)"
                    onClick={() => setCurrencyAmount(-3, 0, 'Hồng ngọc')}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <button type="button" className="btn sm ghost" style={{ fontSize: '0.72rem', padding: '2px 6px' }} onClick={() => addCurrencyAmount(-3, 500, 'Hồng ngọc', 200000000)}>+500</button>
                <button type="button" className="btn sm ghost" style={{ fontSize: '0.72rem', padding: '2px 6px' }} onClick={() => addCurrencyAmount(-3, 2000, 'Hồng ngọc', 200000000)}>+2k</button>
                <button type="button" className="btn sm ghost" style={{ fontSize: '0.72rem', padding: '2px 6px' }} onClick={() => addCurrencyAmount(-3, 10000, 'Hồng ngọc', 200000000)}>+10k</button>
                <button type="button" className="btn sm ghost" style={{ fontSize: '0.72rem', padding: '2px 6px' }} onClick={() => addCurrencyAmount(-3, 20000, 'Hồng ngọc', 200000000)}>+20k</button>
                <button type="button" className="btn sm ghost" style={{ fontSize: '0.72rem', padding: '2px 6px', color: '#fb7185', fontWeight: 700 }} onClick={() => addCurrencyAmount(-3, 50000, 'Hồng ngọc', 200000000)}>+50k</button>
              </div>
            </div>
          </div>
        </div>

        {/* ITEM BUILDER */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <strong style={{ fontSize: '1rem', color: '#facc15' }}>🎁 Danh Sách Trang Bị & Vật Phẩm Kèm Theo</strong>
            <button
              type="button"
              className="btn sm ghost"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? 'Chế độ Trực quan' : 'Xem JSON Nâng cao'}
            </button>
          </div>

          {showAdvanced ? (
            <div>
              <textarea
                className="input"
                rows="6"
                style={{ fontFamily: 'monospace', fontSize: '0.85rem', width: '100%' }}
                value={rawDetail}
                onChange={(e) => setRawDetail(e.target.value)}
              />
              <span className="muted" style={{ fontSize: '0.8rem' }}>
                Định dạng: <code>[{`{"id": 457, "quantity": 10, "options": [{"id": 30, "param": 0}]}`}]</code>
              </span>
            </div>
          ) : (
            <GiftcodeItemBuilder
              items={form.items}
              onChange={(nextItems) => setForm((p) => ({ ...p, items: nextItems }))}
            />
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          {editingId && (
            <button type="button" className="btn" onClick={resetForm}>
              Hủy
            </button>
          )}
          <button type="submit" className="btn primary" style={{ fontWeight: 700, padding: '10px 24px' }}>
            {editingId ? '💾 Lưu Thay Đổi Vào Database' : '➕ Tạo Mới Giftcode'}
          </button>
        </div>
      </form>

      {/* MODAL BULK GENERATOR */}
      {bulkModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content card" style={{ maxWidth: '580px', width: '95%' }}>
            <div className="modal-header">
              <h3>📑 Sinh Hàng Loạt Giftcode (Bulk Generator)</h3>
              <button type="button" className="btn sm ghost" onClick={() => setBulkModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleBulkGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                Hệ thống sẽ tạo ra danh sách mã code độc nhất ngẫu nhiên, áp dụng chung danh sách vật phẩm quà tặng hiện tại trong form.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="label">Tiền Tố (Prefix):</label>
                  <input
                    className="input"
                    required
                    value={bulkForm.prefix}
                    onChange={(e) => setBulkForm((p) => ({ ...p, prefix: e.target.value.toUpperCase() }))}
                  />
                </div>
                <div>
                  <label className="label">Số Lượng Mã Cần Sinh:</label>
                  <input
                    type="number"
                    className="input"
                    min={1}
                    max={1000}
                    required
                    value={bulkForm.count}
                    onChange={(e) => setBulkForm((p) => ({ ...p, count: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="label">Lượt Nhập Cho Mỗi Mã:</label>
                  <input
                    type="number"
                    className="input"
                    min={1}
                    required
                    value={bulkForm.count_left}
                    onChange={(e) => setBulkForm((p) => ({ ...p, count_left: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="label">Hạn Dùng:</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={bulkForm.expired?.slice(0, 16)}
                    onChange={(e) => setBulkForm((p) => ({ ...p, expired: e.target.value.replace('T', ' ') + ':00' }))}
                  />
                </div>
              </div>

              {generatedCodes.length > 0 && (
                <div className="card-inner" style={{ marginTop: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong>Đã sinh {generatedCodes.length} mã:</strong>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button type="button" className="btn sm secondary" onClick={copyAllCodes}>
                        📋 Sao Chép Hết
                      </button>
                      <button type="button" className="btn sm primary" onClick={downloadCodesTxt}>
                        💾 Tải File .TXT
                      </button>
                    </div>
                  </div>
                  <textarea
                    className="input"
                    rows="6"
                    readOnly
                    style={{ fontFamily: 'monospace', fontSize: '0.85rem', width: '100%' }}
                    value={generatedCodes.join('\n')}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn" onClick={() => setBulkModalOpen(false)}>Đóng</button>
                <button type="submit" className="btn primary" disabled={bulkSubmitting}>
                  {bulkSubmitting ? '⏳ Đang Sinh Mã...' : 'Sinh Mã Ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TRA CỨU NGƯỜI ĐÃ NHẬP CLAIMERS */}
      {claimersModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content card" style={{ maxWidth: '580px', width: '95%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>👥 Danh Sách Người Đã Nhập: {claimersData.code}</h3>
              <button type="button" className="btn sm ghost" onClick={() => setClaimersModalOpen(false)}>✕</button>
            </div>
            <div style={{ marginTop: '14px' }}>
              {claimersLoading ? (
                <p className="muted">⏳ Đang tra cứu danh sách người chơi từ Database...</p>
              ) : claimersData.players?.length === 0 ? (
                <p className="muted" style={{ textAlign: 'center', padding: '20px 0' }}>
                  Chưa có nhân vật nào nhập mã giftcode này.
                </p>
              ) : (
                <>
                  <div style={{ marginBottom: '10px', fontSize: '0.9rem' }}>
                    Tổng cộng: <strong>{claimersData.total}</strong> người chơi đã nhập.
                  </div>
                  <div className="table-wrap">
                    <table className="compact">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Tên Nhân Vật</th>
                          <th>Hành Tinh</th>
                          <th>Sức Mạnh (Power)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {claimersData.players.map((p) => (
                          <tr key={p.id}>
                            <td>#{p.id}</td>
                            <td>
                              <Link to={`/players-db?open=${p.id}`} style={{ fontWeight: 600, color: '#60a5fa' }}>
                                {p.name}
                              </Link>
                            </td>
                            <td>{p.gender === 0 ? 'Trái Đất' : p.gender === 1 ? 'Namek' : 'Xayda'}</td>
                            <td>{Number(p.power || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL AI DEEPSEEK GENERATOR */}
      <AiGiftcodeModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onApplyToForm={handleAiApply}
        onSavedDirectly={handleAiSavedDirectly}
      />
    </div>
  );
}
