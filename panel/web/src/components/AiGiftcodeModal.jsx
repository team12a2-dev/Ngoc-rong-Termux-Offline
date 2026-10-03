import { useState, useEffect } from 'react';
import { api, getServerId } from '../api';
import ItemIcon from './ItemIcon';
import { formatLiveSync } from '../utils/liveSync';

const PROMPT_PRESETS = [
  {
    label: '🎁 Gói Tân Thủ Chuẩn PVE',
    prompt: 'Tạo giftcode tân thủ tặng 50 thỏi vàng, 20.000 hồng ngọc, 1 set đồ Thần Linh Trái Đất opt chuẩn PVE sức đánh 15%, hp 15%, giáp 500, không thể giao dịch.',
  },
  {
    label: '🔥 Set Hủy Diệt Xayda VIP',
    prompt: 'Set đồ Hủy Diệt Xayda full 5 món chỉ số khủng: sức đánh +25%, chí mạng +15%, HP +20%, giáp +1500, không thể giao dịch, tặng kèm 100 thỏi vàng.',
  },
  {
    label: '🏆 Quà Đua Top Chiến Binh',
    prompt: 'Quà đua top: 200 thỏi vàng, 50.000 ngọc xanh, 1 bông tai Porata cấp 2, 7 viên ngọc rồng từ 1 sao đến 7 sao.',
  },
  {
    label: '👑 Tri Ân Đại Gia & Cải Trang',
    prompt: 'Quà tri ân đặc biệt: 500 thỏi vàng, 100.000 ngọc hồng, 1 cải trang Goku vô cực chỉ số siêu vip tấn công 30% và 50 capsule kỳ bí.',
  },
  {
    label: '🌸 Sự Kiện Lễ Hội',
    prompt: 'Quà sự kiện lễ hội: 30 thỏi vàng, 15.000 ngọc xanh, cải trang nữ đẹp kèm chỉ số hồi phục HP và KI cao, kèm 100 ngọc rồng 3 sao.',
  },
];

export default function AiGiftcodeModal({ isOpen, onClose, onApplyToForm, onSavedDirectly }) {
  const [prompt, setPrompt] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('nro_deepseek_key') || '');
  const [rememberKey, setRememberKey] = useState(true);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [hasServerKey, setHasServerKey] = useState(false);
  const [model, setModel] = useState('deepseek-chat');
  const [code, setCode] = useState('');
  const [prefix, setPrefix] = useState('VIP');
  const [countLeft, setCountLeft] = useState(1000);
  const [autoSave, setAutoSave] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Kiểm tra cấu hình API Key trên server
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    api('/giftcodes/ai-config')
      .then((res) => {
        if (!cancelled && res.ok) {
          setHasServerKey(Boolean(res.data?.configured));
          if (!res.data?.configured && !apiKey) {
            setShowKeyInput(true);
          }
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleGenerate(e) {
    if (e) e.preventDefault();
    const promptText = prompt.trim();
    if (!promptText) {
      setError('Vui lòng nhập mô tả yêu cầu quà tặng cho AI.');
      return;
    }

    if (!hasServerKey && !apiKey.trim()) {
      setError('Vui lòng nhập DeepSeek API Key để sử dụng tính năng này.');
      setShowKeyInput(true);
      return;
    }

    if (rememberKey && apiKey.trim()) {
      localStorage.setItem('nro_deepseek_key', apiKey.trim());
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api('/giftcodes/ai-generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: promptText,
          code: code.trim() || undefined,
          prefix: prefix.trim() || 'NRO',
          count_left: countLeft,
          apiKey: apiKey.trim() || undefined,
          model,
          autoSave,
          serverId: getServerId(),
        }),
      });

      if (!res.ok) {
        throw new Error(res.error || 'Có lỗi xảy ra khi gọi AI DeepSeek.');
      }

      setResult(res.data);

      if (autoSave && res.data?.saved) {
        if (onSavedDirectly) {
          onSavedDirectly(res.data);
        }
      }
    } catch (err) {
      setError(err.message || 'Lỗi không xác định khi AI phân tích.');
    } finally {
      setLoading(false);
    }
  }

  // Áp dụng vào Builder ngoài màn hình chính để chỉnh sửa
  function handleApply() {
    if (!result) return;
    if (onApplyToForm) {
      onApplyToForm({
        code: result.code,
        count_left: result.count_left,
        expired: result.expired,
        items: result.items || [],
        reasoning: result.reasoning,
      });
    }
    onClose();
  }

  // Lưu trực tiếp từ kết quả preview
  async function handleSaveDirectly() {
    if (!result || !result.items) return;
    setSaving(true);
    setError(null);
    try {
      const detailPayload = result.items.map((it) => ({
        id: Number(it.id),
        quantity: Number(it.quantity) || 1,
        options: (it.options || []).map((o) => ({ id: Number(o.id), param: Number(o.param) || 0 })),
      }));

      const res = await api('/giftcodes', {
        method: 'POST',
        body: JSON.stringify({
          code: result.code,
          count_left: result.count_left,
          expired: result.expired,
          detail: JSON.stringify(detailPayload),
          serverId: getServerId(),
        }),
      });

      if (!res.ok) throw new Error(res.error || 'Không lưu được giftcode');

      if (onSavedDirectly) {
        onSavedDirectly({ ...result, liveSync: res.data?.liveSync });
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }}>
      <div
        className="modal-content card"
        style={{
          maxWidth: '820px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: '0',
        }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(147, 51, 234, 0.12))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.4rem' }}>✨</span>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>AI DeepSeek Giftcode Generator</h3>
              <span className="badge" style={{ background: '#2563eb', color: '#fff', fontSize: '0.75rem' }}>AI 2.0</span>
            </div>
            <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>
              Viết mô tả bằng tiếng Việt → AI tự động truy vấn dữ liệu DB item & option template → Gán chỉ số cân bằng chuẩn NRO
            </p>
          </div>
          <button type="button" className="btn sm ghost" onClick={onClose} style={{ fontSize: '1.2rem', lineHeight: 1 }}>
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '0.9rem',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Prompt Presets */}
          <div>
            <label className="label" style={{ fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>
              💡 Mẫu Yêu Cầu Gợi Ý (Bấm để thử nhanh):
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {PROMPT_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="btn sm ghost"
                  style={{ fontSize: '0.8rem', padding: '4px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: '16px' }}
                  onClick={() => {
                    setPrompt(p.prompt);
                    setError(null);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label className="label" style={{ fontWeight: 600 }}>
                Nhập Yêu Cầu Quà Tặng (Mô tả tự nhiên): <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <span className="muted" style={{ fontSize: '0.8rem' }}>AI sẽ tự phân tích item, hành tinh & chỉ số option</span>
            </div>
            <textarea
              rows={4}
              className="input"
              style={{ width: '100%', resize: 'vertical', fontSize: '0.95rem', lineHeight: 1.5 }}
              placeholder="VD: Tạo code tân thủ tặng 100 thỏi vàng, 50k ngọc hồng, 1 set trang bị hủy diệt cấp 7 cho tộc Xayda full chỉ số sức đánh, hp và chí mạng cao, tặng thêm cải trang Goku vô cực..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          {/* Settings Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
              background: 'rgba(255,255,255,0.02)',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border, rgba(255,255,255,0.06))',
            }}
          >
            <div>
              <label className="label" style={{ fontSize: '0.85rem' }}>AI Model:</label>
              <select className="input" value={model} onChange={(e) => setModel(e.target.value)}>
                <option value="deepseek-chat">deepseek-chat (Nhanh & Chuẩn xác)</option>
                <option value="deepseek-reasoner">deepseek-reasoner (R1 - Suy luận sâu)</option>
              </select>
            </div>

            <div>
              <label className="label" style={{ fontSize: '0.85rem' }}>Mã Code (Tùy chọn):</label>
              <input
                type="text"
                className="input"
                placeholder="Để trống AI tự đặt mã đẹp"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>

            <div>
              <label className="label" style={{ fontSize: '0.85rem' }}>Số lượt nhập (count_left):</label>
              <input
                type="number"
                min={1}
                className="input"
                value={countLeft}
                onChange={(e) => setCountLeft(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="label" style={{ fontSize: '0.85rem' }}>Tiền tố mã (Prefix):</label>
              <input
                type="text"
                className="input"
                placeholder="VD: VIP, TANTHU"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          {/* API Key Section */}
          <div style={{ fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Khóa API DeepSeek:</span>
                {hasServerKey ? (
                  <span className="badge ok" style={{ fontSize: '0.75rem' }}>✓ Đã có trong .env máy chủ</span>
                ) : (
                  <span className="badge admin" style={{ fontSize: '0.75rem' }}>Chưa cấu hình .env</span>
                )}
              </div>
              <button
                type="button"
                className="btn sm ghost"
                style={{ fontSize: '0.8rem', padding: '2px 8px' }}
                onClick={() => setShowKeyInput(!showKeyInput)}
              >
                {showKeyInput ? 'Ẩn ô nhập API Key' : 'Tùy chỉnh API Key riêng 🔑'}
              </button>
            </div>

            {showKeyInput && (
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input
                  type="password"
                  className="input"
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', opacity: 0.8 }}>
                  <input
                    type="checkbox"
                    checked={rememberKey}
                    onChange={(e) => setRememberKey(e.target.checked)}
                  />
                  Ghi nhớ API Key trên trình duyệt này (LocalStorage)
                </label>
              </div>
            )}
          </div>

          {/* Auto-save checkbox */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 0' }}>
            <input
              type="checkbox"
              checked={autoSave}
              onChange={(e) => setAutoSave(e.target.checked)}
            />
            <span style={{ fontSize: '0.9rem' }}>
              ⚡ <strong>Tự động Lưu vào Database & Reload Game ngay</strong> khi AI sinh xong (Bỏ qua bước xem trước)
            </span>
          </label>

          {/* Nút bấm Tạo */}
          <button
            type="button"
            className="btn primary"
            style={{
              padding: '12px',
              fontSize: '1rem',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              border: 'none',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
            }}
            disabled={loading}
            onClick={handleGenerate}
          >
            {loading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span className="spinner" /> 🤖 AI DeepSeek đang phân tích Database & suy luận vật phẩm...
              </span>
            ) : (
              '✨ Bắt Đầu Phân Tích & Sinh Giftcode'
            )}
          </button>

          {/* KẾT QUẢ SINH RA */}
          {result && (
            <div
              className="card-inner"
              style={{
                marginTop: '10px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                background: 'rgba(30, 41, 59, 0.7)',
                padding: '16px',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span className="muted" style={{ fontSize: '0.85rem' }}>Mã Giftcode đã tạo:</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--primary, #3b82f6)', letterSpacing: '1px' }}>
                    {result.code}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className="badge ok">Lượt: {result.count_left?.toLocaleString()}</span>
                  <span className="badge">HSD: {result.expired?.slice(0, 10)}</span>
                  {result.saved && <span className="badge ok">✓ Đã lưu Database</span>}
                </div>
              </div>

              {/* Tóm tắt */}
              <div style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
                <strong>Tóm tắt:</strong> {result.summary}
              </div>

              {/* AI Reasoning Box */}
              {result.reasoning && (
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    borderLeft: '3px solid #8b5cf6',
                    padding: '10px 14px',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    color: '#e2e8f0',
                  }}
                >
                  <strong style={{ color: '#a78bfa' }}>🧠 Suy luận của AI (Reasoning):</strong>
                  <p style={{ margin: '4px 0 0 0', whiteSpace: 'pre-line' }}>{result.reasoning}</p>
                </div>
              )}

              {/* Danh sách vật phẩm chi tiết */}
              <div>
                <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: '8px' }}>
                  🎁 Danh sách {result.items?.length || 0} vật phẩm được chọn từ Database:
                </strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(result.items || []).map((it, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ItemIcon
                          iconId={it.icon_id}
                          tempId={it.id}
                          name={it.name}
                          size={36}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                            {it.name}{' '}
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                              (ID: {it.id})
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#38bdf8' }}>
                            Số lượng: <strong>x{it.quantity?.toLocaleString()}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Options Chips */}
                      {it.options && it.options.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '60%' }}>
                          {it.options.map((opt, oIdx) => (
                            <span
                              key={oIdx}
                              className="badge"
                              style={{
                                fontSize: '0.75rem',
                                background: 'rgba(59, 130, 246, 0.15)',
                                color: '#93c5fd',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                              }}
                              title={`Option ID: ${opt.id}, Param: ${opt.param}`}
                            >
                              {opt.preview || opt.name || `#${opt.id}: ${opt.param}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons cho Kết quả */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <button
                  type="button"
                  className="btn secondary"
                  onClick={handleApply}
                  title="Đưa các vật phẩm này vào màn hình Form chính để tinh chỉnh thêm"
                >
                  📝 Đưa Vào Builder Để Chỉnh Sửa
                </button>

                {!result.saved && (
                  <button
                    type="button"
                    className="btn primary"
                    disabled={saving}
                    onClick={handleSaveDirectly}
                  >
                    {saving ? 'Đang lưu...' : '💾 Lưu Trực Tiếp Vào Database'}
                  </button>
                )}

                {result.saved && (
                  <button type="button" className="btn" onClick={onClose}>
                    Đóng
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
