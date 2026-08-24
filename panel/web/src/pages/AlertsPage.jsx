import { useEffect, useState } from 'react';
import { api, getServerId } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';

const RULE_TYPES = [
  { id: 'cpu_high', label: 'CPU cao', hint: 'Ngưỡng % CPU process (vd: 80)' },
  { id: 'ram_high', label: 'RAM JVM cao', hint: 'Ngưỡng GB RAM JVM (vd: 4)' },
  { id: 'online_low', label: 'Online thấp', hint: 'Cảnh báo khi online ≤ ngưỡng' },
  { id: 'agent_down', label: 'Agent down', hint: 'Không cần ngưỡng — báo khi agent không phản hồi' },
];

export default function AlertsPage() {
  const [rules, setRules] = useState([]);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({
    name: '', rule_type: 'cpu_high', threshold: 80, webhook_url: '', enabled: true,
  });
  const fb = useFeedback();

  async function load() {
    const sid = getServerId();
    const [r, h] = await Promise.all([
      api(`/alerts/rules?serverId=${sid}`),
      api('/alerts/history'),
    ]);
    setRules(r.data || []);
    setHistory(h.data || []);
  }

  useEffect(() => { load().catch((e) => fb.error(e.message)); }, []);

  async function create(e) {
    e.preventDefault();
    try {
      await api('/alerts/rules', {
        method: 'POST',
        body: JSON.stringify({ ...form, server_id: getServerId() }),
      });
      fb.success('Đã tạo rule alert');
      setForm({ name: '', rule_type: 'cpu_high', threshold: 80, webhook_url: '', enabled: true });
      load();
    } catch (err) {
      fb.error(err.message);
    }
  }

  async function toggleRule(rule) {
    try {
      await api(`/alerts/rules/${rule.id}`, {
        method: 'PUT',
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      load();
    } catch (e) {
      fb.error(e.message);
    }
  }

  async function remove(id) {
    if (!confirm('Xóa rule này?')) return;
    await api(`/alerts/rules/${id}`, { method: 'DELETE' });
    fb.success('Đã xóa rule');
    load();
  }

  async function testCheck() {
    try {
      await api(`/alerts/check/${getServerId()}`, { method: 'POST', body: '{}' });
      fb.success('Đã chạy kiểm tra alert — xem lịch sử bên dưới');
      load();
    } catch (e) {
      fb.error(e.message);
    }
  }

  const selectedType = RULE_TYPES.find((t) => t.id === form.rule_type);

  return (
    <div>
      <PageHeader
        title="Alerts (Telegram)"
        description="Cảnh báo tự động khi CPU/RAM cao, online thấp hoặc agent down — gửi qua Telegram webhook."
        actions={<button className="btn" onClick={testCheck}>Test check ngay</button>}
      />

      <div className="help-box">
        <h4>Thiết lập Telegram</h4>
        <ul>
          <li>Tạo bot qua @BotFather, lấy token.</li>
          <li>Webhook URL: <code>https://api.telegram.org/bot&lt;TOKEN&gt;/sendMessage?chat_id=&lt;CHAT_ID&gt;</code></li>
          <li>Monitor tự chạy mỗi 60 giây trên Panel API.</li>
        </ul>
      </div>

      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      <form className="control-card section" onSubmit={create}>
        <h3>Tạo rule mới</h3>
        <div className="form-grid">
          <label className="field">
            Tên rule
            <input placeholder="VD: CPU cao ban đêm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label className="field">
            Loại
            <select value={form.rule_type} onChange={(e) => setForm({ ...form, rule_type: e.target.value })}>
              {RULE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          {form.rule_type !== 'agent_down' && (
            <label className="field">
              Ngưỡng
              <input type="number" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })} />
            </label>
          )}
        </div>
        {selectedType && <p className="muted">{selectedType.hint}</p>}
        <label className="field" style={{ marginTop: 8 }}>
          Telegram webhook URL
          <input placeholder="https://api.telegram.org/bot.../sendMessage?chat_id=..." value={form.webhook_url} onChange={(e) => setForm({ ...form, webhook_url: e.target.value })} />
        </label>
        <button className="btn primary" type="submit" style={{ marginTop: 10 }}>Tạo rule</button>
      </form>

      <table>
        <thead><tr><th>ID</th><th>Tên</th><th>Loại</th><th>Ngưỡng</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.name}</td>
              <td>{RULE_TYPES.find((t) => t.id === r.rule_type)?.label || r.rule_type}</td>
              <td>{r.rule_type === 'agent_down' ? '—' : r.threshold}</td>
              <td>
                <button type="button" className={`badge ${r.enabled ? 'ok' : 'bad'}`} onClick={() => toggleRule(r)}>
                  {r.enabled ? 'Đang bật' : 'Đã tắt'}
                </button>
              </td>
              <td><button className="btn danger sm" onClick={() => remove(r.id)}>Xóa</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="card section">
        <h3>Lịch sử alert ({history.length})</h3>
        {history.length === 0 ? (
          <p className="muted">Chưa có alert nào được gửi.</p>
        ) : (
          <ul className="info-list">
            {history.slice(0, 30).map((h) => (
              <li key={h.id}><span>{h.created_at}</span><strong>{h.message}</strong></li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
