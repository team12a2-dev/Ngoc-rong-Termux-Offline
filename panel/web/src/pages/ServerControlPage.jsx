import { useEffect, useMemo, useState } from 'react';
import { api, getServerId } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';

const EXP_PRESETS = [1, 2, 3, 5, 10, 20];

const STATUS_LABELS = {
  pending: 'Chờ / Lặp lại',
  started: 'Đang bảo trì',
  completed: 'Đã kết thúc',
  cancelled: 'Đã hủy',
};

const SCHEDULE_TYPES = [
  { id: 'window', label: 'Một lần', hint: 'Chọn ngày giờ bắt đầu và kết thúc cụ thể' },
  { id: 'daily', label: 'Hàng ngày', hint: 'Lặp mỗi ngày theo khung giờ cố định' },
  { id: 'weekly', label: 'Hàng tuần', hint: 'Chọn thứ trong tuần + khung giờ' },
  { id: 'cron', label: 'Cron', hint: 'Lịch nâng cao — chỉ countdown, không có giờ kết thúc tự động' },
];

const CRON_PRESETS = [
  { label: '4:00 sáng mỗi ngày', expr: '0 4 * * *' },
  { label: '19:30 mỗi ngày', expr: '30 19 * * *' },
  { label: 'Chủ nhật 3:00', expr: '0 3 * * 0' },
  { label: 'Thứ 2–6 lúc 5:00', expr: '0 5 * * 1-5' },
];

const WEEKDAYS = [
  { v: 1, l: 'T2' }, { v: 2, l: 'T3' }, { v: 3, l: 'T4' },
  { v: 4, l: 'T5' }, { v: 5, l: 'T6' }, { v: 6, l: 'T7' }, { v: 0, l: 'CN' },
];

function defaultScheduleForm(type = 'window') {
  const base = defaultWindowForm();
  return {
    ...base,
    schedule_type: type,
    daily_start_time: '04:00',
    daily_end_time: '06:00',
    repeat_days: [1, 2, 3, 4, 5],
    cron_expr: '0 4 * * *',
  };
}

function scheduleTypeLabel(type) {
  return SCHEDULE_TYPES.find((t) => t.id === type)?.label || type;
}

function scheduleSummary(s) {
  const type = s.schedule_type || (s.starts_at ? 'window' : 'cron');
  if (type === 'window') return `${fmtScheduleTime(s.starts_at)} → ${fmtScheduleTime(s.ends_at)}`;
  if (type === 'daily') return `Mỗi ngày ${s.daily_start_time} → ${s.daily_end_time}`;
  if (type === 'weekly') {
    const days = (s.repeat_days || '').split(',').map((d) => WEEKDAYS.find((w) => w.v === Number(d))?.l).filter(Boolean).join(', ');
    return `${days} · ${s.daily_start_time} → ${s.daily_end_time}`;
  }
  return s.cron_expr || '—';
}

function toDatetimeLocalValue(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultWindowForm() {
  const start = new Date();
  start.setMinutes(start.getMinutes() + 30 - (start.getMinutes() % 30), 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 2);
  return {
    name: 'Bảo trì server',
    starts_at: toDatetimeLocalValue(start),
    ends_at: toDatetimeLocalValue(end),
    countdown_seconds: 60,
    notify_message: '',
  };
}

function fmtScheduleTime(v) {
  if (!v) return '—';
  const d = new Date(String(v).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function durationLabel(start, end) {
  const a = new Date(String(start).replace(' ', 'T'));
  const b = new Date(String(end).replace(' ', 'T'));
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return '';
  const mins = Math.round((b - a) / 60000);
  if (mins < 60) return `${mins} phút`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}p` : `${h} giờ`;
}

export default function ServerControlPage() {
  const [runtime, setRuntime] = useState(null);
  const [expRate, setExpRate] = useState(3);
  const [broadcast, setBroadcast] = useState('');
  const [broadcastType, setBroadcastType] = useState('info');
  const [broadcastBusy, setBroadcastBusy] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [maintSec, setMaintSec] = useState(60);
  const [schedules, setSchedules] = useState([]);
  const [scheduleForm, setScheduleForm] = useState(defaultScheduleForm('window'));
  const [maintBusy, setMaintBusy] = useState(null);
  const [maintCardMsg, setMaintCardMsg] = useState(null);
  const fb = useFeedback();

  const countdownActive = runtime?.maintenanceCountdownActive || (runtime?.maintenanceCountdown > 0);
  const countdownSec = runtime?.maintenanceCountdown ?? 0;

  const activeWindow = useMemo(
    () => schedules.find((s) => s.status === 'started' || (s.status === 'pending' && s.starts_at && new Date(String(s.starts_at).replace(' ', 'T')) <= new Date() && s.ends_at && new Date(String(s.ends_at).replace(' ', 'T')) >= new Date())),
    [schedules]
  );

  const nextWindow = useMemo(() => {
    const now = Date.now();
    return schedules
      .filter((s) => s.enabled && (s.status === 'pending' || !s.status) && (s.starts_at || s.schedule_type !== 'window'))
      .map((s) => {
        if (s.starts_at) {
          return { ...s, t: new Date(String(s.starts_at).replace(' ', 'T')).getTime() };
        }
        if (s.schedule_type === 'daily' || s.schedule_type === 'weekly') {
          const [h, m] = (s.daily_start_time || '04:00').split(':').map(Number);
          const d = new Date();
          d.setHours(h, m, 0, 0);
          if (d.getTime() <= now) d.setDate(d.getDate() + 1);
          return { ...s, t: d.getTime() };
        }
        return { ...s, t: now + 86400000 };
      })
      .filter((s) => s.t > now)
      .sort((a, b) => a.t - b.t)[0];
  }, [schedules]);

  async function loadRuntime() {
    try {
      const res = await api(`/servers/${getServerId()}/runtime-config`);
      const cfg = res.data || {};
      setRuntime(cfg);
      if (cfg.expRate != null) setExpRate(cfg.expRate);
      return cfg;
    } catch (e) {
      fb.error(e.message);
      return null;
    }
  }

  async function loadSchedules() {
    try {
      const res = await api(`/config/maintenance-schedules?serverId=${getServerId()}`);
      setSchedules(res.data || []);
    } catch { /* optional */ }
  }

  async function loadExtras() {
    try {
      const tpl = await api('/config/broadcast-templates');
      setTemplates(tpl.data || []);
    } catch { /* optional */ }
    await loadSchedules();
  }

  useEffect(() => { loadRuntime(); loadExtras(); }, []);

  useEffect(() => {
    if (!countdownActive && !activeWindow) return undefined;
    const t = setInterval(() => { loadRuntime(); loadSchedules(); }, 4000);
    return () => clearInterval(t);
  }, [countdownActive, activeWindow]);

  async function call(path, body, successMsg) {
    try {
      await api(`/servers/${getServerId()}${path}`, { method: 'POST', body: JSON.stringify(body) });
      fb.success(successMsg || 'Thành công');
      await loadRuntime();
    } catch (e) {
      fb.error(e.message);
    }
  }

  async function sendBroadcast() {
    const message = broadcast.trim();
    if (!message || broadcastBusy) return;
    if (!window.confirm(`Gửi thông báo [${broadcastType}] đến toàn bộ người chơi online?\\n\\n${message}`)) return;
    setBroadcastBusy(true);
    setBroadcastResult(null);
    try {
      const res = await api(`/servers/${getServerId()}/broadcast`, {
        method: 'POST',
        body: JSON.stringify({ message, type: broadcastType }),
      });
      const data = res.data || {};
      const result = data.data || data;
      setBroadcastResult({ type: 'success', text: `Đã gửi thành công đến ${result.recipients ?? 'toàn bộ'} người chơi online.` });
      fb.success(`Broadcast đã gửi (${result.recipients ?? 0} người nhận).`);
      setBroadcast('');
    } catch (e) {
      setBroadcastResult({ type: 'error', text: e.message });
      fb.error(e.message);
    } finally {
      setBroadcastBusy(false);
    }
  }

  async function maintenanceAction(body, label) {
    setMaintBusy(label);
    setMaintCardMsg(null);
    try {
      const res = await api(`/servers/${getServerId()}/maintenance`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const data = res.data || {};
      await loadRuntime();

      if (body.cancel) {
        if (data.cancelled) {
          const msg = 'Đã hủy countdown bảo trì — player nhận thông báo in-game.';
          setMaintCardMsg({ type: 'success', text: msg });
          fb.success(msg);
        } else {
          const msg = 'Không có countdown bảo trì đang chạy để hủy.';
          setMaintCardMsg({ type: 'info', text: msg });
          fb.show(msg, 'info');
        }
      } else if (body.immediate) {
        const msg = 'Lệnh bảo trì ngay đã gửi — server sẽ tắt.';
        setMaintCardMsg({ type: 'success', text: msg });
        fb.success(msg);
      } else {
        const sec = data.maintenanceCountdown ?? body.seconds;
        const msg = `Countdown bảo trì đã bắt đầu (~${sec}s). Player sẽ thấy thông báo in-game.`;
        setMaintCardMsg({ type: 'success', text: msg });
        fb.success(msg);
      }
    } catch (e) {
      setMaintCardMsg({ type: 'error', text: e.message });
      fb.error(e.message);
    } finally {
      setMaintBusy(null);
    }
  }

  async function addSchedule(e) {
    e.preventDefault();
    setMaintCardMsg(null);
    const type = scheduleForm.schedule_type;

    if (type === 'window') {
      const start = new Date(scheduleForm.starts_at);
      const end = new Date(scheduleForm.ends_at);
      if (end <= start) {
        setMaintCardMsg({ type: 'error', text: 'Thời gian kết thúc phải sau thời gian bắt đầu.' });
        return;
      }
    }

    if ((type === 'weekly') && !scheduleForm.repeat_days?.length) {
      setMaintCardMsg({ type: 'error', text: 'Chọn ít nhất một ngày trong tuần.' });
      return;
    }

    const payload = {
      name: scheduleForm.name,
      schedule_type: type,
      countdown_seconds: scheduleForm.countdown_seconds,
      notify_message: scheduleForm.notify_message,
      serverId: getServerId(),
    };

    if (type === 'window') {
      payload.starts_at = scheduleForm.starts_at.replace('T', ' ') + ':00';
      payload.ends_at = scheduleForm.ends_at.replace('T', ' ') + ':00';
    } else if (type === 'daily' || type === 'weekly') {
      payload.daily_start_time = scheduleForm.daily_start_time;
      payload.daily_end_time = scheduleForm.daily_end_time;
      if (type === 'weekly') {
        payload.repeat_days = scheduleForm.repeat_days.join(',');
      }
    } else if (type === 'cron') {
      payload.cron_expr = scheduleForm.cron_expr;
    }

    try {
      await api('/config/maintenance-schedules', { method: 'POST', body: JSON.stringify(payload) });
      const msg = `Đã thêm lịch ${scheduleTypeLabel(type)}: ${scheduleSummary({ ...payload, schedule_type: type, repeat_days: payload.repeat_days })}`;
      setMaintCardMsg({ type: 'success', text: msg });
      fb.success(msg);
      setScheduleForm(defaultScheduleForm(type));
      loadSchedules();
    } catch (err) {
      setMaintCardMsg({ type: 'error', text: err.message });
      fb.error(err.message);
    }
  }

  function toggleWeekDay(v) {
    const days = scheduleForm.repeat_days || [];
    setScheduleForm({
      ...scheduleForm,
      repeat_days: days.includes(v) ? days.filter((d) => d !== v) : [...days, v].sort(),
    });
  }

  async function toggleScheduleEnabled(s) {
    try {
      await api(`/config/maintenance-schedules/${s.id}`, {
        method: 'PUT',
        body: JSON.stringify({ enabled: !s.enabled }),
      });
      loadSchedules();
    } catch (e) {
      fb.error(e.message);
    }
  }

  async function cancelWindow(id) {
    if (!confirm('Hủy lịch bảo trì này?')) return;
    try {
      await api(`/config/maintenance-schedules/${id}`, { method: 'PUT', body: JSON.stringify({ cancel: true }) });
      fb.success('Đã hủy lịch bảo trì');
      loadSchedules();
    } catch (e) {
      fb.error(e.message);
    }
  }

  async function removeWindow(id) {
    if (!confirm('Xóa lịch bảo trì này?')) return;
    try {
      await api(`/config/maintenance-schedules/${id}`, { method: 'DELETE' });
      fb.success('Đã xóa lịch');
      loadSchedules();
    } catch (e) {
      fb.error(e.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Server Control"
        description="Điều khiển server realtime: EXP, thông báo, bảo trì, admin-only và hot reload — giá trị hiện tại được đọc từ game agent."
        actions={<button className="btn" onClick={() => { loadRuntime(); loadSchedules(); }}>Làm mới trạng thái</button>}
      />

      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      {runtime && (
        <div className="status-pills">
          <span className="status-pill">EXP <strong>x{runtime.expRate}</strong></span>
          <span className={`status-pill ${runtime.adminMode ? 'warn' : ''}`}>
            Admin-only <strong>{runtime.adminMode ? 'BẬT' : 'Tắt'}</strong>
          </span>
          <span className={`status-pill ${countdownActive || activeWindow ? 'danger' : ''}`}>
            Bảo trì <strong>{countdownActive ? `Countdown ~${countdownSec}s` : activeWindow ? 'Theo lịch' : 'Bình thường'}</strong>
          </span>
          {nextWindow && (
            <span className="status-pill warn">
              Lịch tới <strong>{fmtScheduleTime(nextWindow.starts_at)}</strong>
            </span>
          )}
          <span className="status-pill">Max player <strong>{runtime.maxPlayer}</strong></span>
        </div>
      )}

      <div className="control-grid">
        <div className="control-card">
          <h3>Tỷ lệ EXP</h3>
          <p className="card-hint">Thay đổi ngay trên server đang chạy. Dùng preset hoặc nhập số tùy ý.</p>
          <div className="preset-row">
            {EXP_PRESETS.map((r) => (
              <button key={r} type="button" className={`btn sm chip-btn ${expRate === r ? 'active' : ''}`} onClick={() => setExpRate(r)}>
                x{r}
              </button>
            ))}
          </div>
          <div className="row">
            <input type="number" min={1} max={100} value={expRate} onChange={(e) => setExpRate(Number(e.target.value))} />
            <button className="btn primary" onClick={() => call('/exp-rate', { rate: expRate }, `EXP đã đặt x${expRate}`)}>Áp dụng</button>
          </div>
        </div>

        <div className="control-card">
          <h3>Thông báo toàn server</h3>
          <p className="card-hint">Gửi tin nhắn hiển thị cho tất cả player online.</p>
          {templates.length > 0 && (
            <div className="preset-row">
              {templates.map((t) => (
                <button key={t.id} type="button" className="btn sm" onClick={() => setBroadcast(t.message || t.content || '')}>
                  {t.name || `Mẫu #${t.id}`}
                </button>
              ))}
            </div>
          )}
          <div className="row">
            <select value={broadcastType} onChange={(e) => setBroadcastType(e.target.value)} aria-label="Loại thông báo">
              <option value="info">Thông tin</option>
              <option value="warning">Cảnh báo</option>
              <option value="event">Sự kiện</option>
            </select>
            <span className="muted" style={{ marginLeft: 'auto' }}>{broadcast.length}/500 ký tự</span>
          </div>
          <textarea rows={3} maxLength={500} placeholder="Nội dung thông báo..." value={broadcast} onChange={(e) => setBroadcast(e.target.value)} />
          {broadcast.trim() && (
            <div className="help-box compact" style={{ marginTop: 8 }}>
              Preview: {broadcastType === 'warning' ? '[CẢNH BÁO] ' : broadcastType === 'event' ? '[SỰ KIỆN] ' : ''}{broadcast.trim()}
            </div>
          )}
          {broadcastResult && <div className={`alert ${broadcastResult.type === 'error' ? 'error' : ''}`} style={{ marginTop: 8 }}>{broadcastResult.text}</div>}
          <button className="btn primary" style={{ marginTop: 8 }} onClick={sendBroadcast} disabled={!broadcast.trim() || broadcastBusy}>
            {broadcastBusy ? 'Đang gửi...' : 'Gửi toàn server'}
          </button>
        </div>

        <div className={`control-card maint-card maint-card-wide ${countdownActive || activeWindow ? 'maint-active' : ''}`}>
          <h3>Bảo trì</h3>
          <p className="card-hint">
            Bảo trì ngay / countdown thủ công, hoặc lên lịch từ thời điểm bắt đầu đến thời điểm kết thúc — Panel tự kích hoạt khi đến giờ.
          </p>

          {activeWindow && (
            <div className="maint-countdown-banner">
              📅 Đang trong cửa sổ bảo trì: <strong>{fmtScheduleTime(activeWindow.starts_at)}</strong>
              {' → '}
              <strong>{fmtScheduleTime(activeWindow.ends_at)}</strong>
              {' '}({durationLabel(activeWindow.starts_at, activeWindow.ends_at)})
            </div>
          )}

          {countdownActive && (
            <div className="maint-countdown-banner">
              ⏳ Countdown đang chạy — còn khoảng <strong>{countdownSec}</strong> (tick 6s/lần). Bấm <strong>Hủy bảo trì</strong> để dừng.
            </div>
          )}

          {nextWindow && !activeWindow && (
            <div className="maint-schedule-preview">
              Lịch sắp tới: <strong>{nextWindow.name}</strong>
              {' — '}
              <span className="badge admin">{scheduleTypeLabel(nextWindow.schedule_type || 'window')}</span>
              {' '}
              {scheduleSummary(nextWindow)}
            </div>
          )}

          {maintCardMsg && (
            <div className={`alert feedback ${maintCardMsg.type}`} role="status">
              {maintCardMsg.text}
            </div>
          )}

          <div className="maint-section">
            <h4>Thao tác ngay</h4>
            <div className="row">
              <label className="field">
                Countdown (giây)
                <input type="number" min={10} value={maintSec} onChange={(e) => setMaintSec(Number(e.target.value))} disabled={!!maintBusy} />
              </label>
              <button className="btn danger" disabled={!!maintBusy || countdownActive} onClick={() => maintenanceAction({ seconds: maintSec }, 'start')}>
                {maintBusy === 'start' ? 'Đang gửi...' : 'Bắt đầu countdown'}
              </button>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn danger" disabled={!!maintBusy} onClick={() => { if (confirm('Bảo trì NGAY? Server sẽ tắt.')) maintenanceAction({ immediate: true }, 'immediate'); }}>
                {maintBusy === 'immediate' ? 'Đang gửi...' : 'Bảo trì ngay'}
              </button>
              <button className={`btn ${countdownActive ? 'primary' : ''}`} disabled={!!maintBusy} onClick={() => maintenanceAction({ cancel: true }, 'cancel')}>
                {maintBusy === 'cancel' ? 'Đang hủy...' : 'Hủy countdown'}
              </button>
            </div>
          </div>

          <div className="maint-section">
            <h4>Lên lịch bảo trì</h4>
            <div className="editor-tabs">
              {SCHEDULE_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`tab ${scheduleForm.schedule_type === t.id ? 'active' : ''}`}
                  onClick={() => setScheduleForm(defaultScheduleForm(t.id))}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="card-hint">
              {SCHEDULE_TYPES.find((t) => t.id === scheduleForm.schedule_type)?.hint}
            </p>

            <form onSubmit={addSchedule}>
              <div className="form-grid">
                <label className="field full-width">
                  Tên / ghi chú
                  <input value={scheduleForm.name} onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })} required />
                </label>

                {scheduleForm.schedule_type === 'window' && (
                  <>
                    <label className="field">
                      Bắt đầu bảo trì
                      <input type="datetime-local" value={scheduleForm.starts_at} onChange={(e) => setScheduleForm({ ...scheduleForm, starts_at: e.target.value })} required />
                    </label>
                    <label className="field">
                      Kết thúc bảo trì
                      <input type="datetime-local" value={scheduleForm.ends_at} onChange={(e) => setScheduleForm({ ...scheduleForm, ends_at: e.target.value })} required />
                    </label>
                  </>
                )}

                {(scheduleForm.schedule_type === 'daily' || scheduleForm.schedule_type === 'weekly') && (
                  <>
                    <label className="field">
                      Giờ bắt đầu
                      <input type="time" value={scheduleForm.daily_start_time} onChange={(e) => setScheduleForm({ ...scheduleForm, daily_start_time: e.target.value })} required />
                    </label>
                    <label className="field">
                      Giờ kết thúc
                      <input type="time" value={scheduleForm.daily_end_time} onChange={(e) => setScheduleForm({ ...scheduleForm, daily_end_time: e.target.value })} required />
                    </label>
                  </>
                )}

                {scheduleForm.schedule_type === 'weekly' && (
                  <div className="field full-width">
                    <span>Ngày trong tuần</span>
                    <div className="weekday-picker">
                      {WEEKDAYS.map((d) => (
                        <button
                          key={d.v}
                          type="button"
                          className={`btn sm chip-btn ${scheduleForm.repeat_days?.includes(d.v) ? 'active' : ''}`}
                          onClick={() => toggleWeekDay(d.v)}
                        >
                          {d.l}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {scheduleForm.schedule_type === 'cron' && (
                  <>
                    <label className="field full-width">
                      Cron expression
                      <input value={scheduleForm.cron_expr} onChange={(e) => setScheduleForm({ ...scheduleForm, cron_expr: e.target.value })} placeholder="0 4 * * *" required />
                    </label>
                    <div className="field full-width">
                      <span className="muted">Preset nhanh</span>
                      <div className="preset-row">
                        {CRON_PRESETS.map((p) => (
                          <button key={p.expr} type="button" className="btn sm" onClick={() => setScheduleForm({ ...scheduleForm, cron_expr: p.expr })}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <label className="field">
                  Countdown trước khi tắt (s)
                  <input type="number" min={10} value={scheduleForm.countdown_seconds} onChange={(e) => setScheduleForm({ ...scheduleForm, countdown_seconds: Number(e.target.value) })} />
                </label>
                <label className="field full-width">
                  Thông báo in-game (tùy chọn)
                  <input placeholder="Server bảo trì..." value={scheduleForm.notify_message} onChange={(e) => setScheduleForm({ ...scheduleForm, notify_message: e.target.value })} />
                </label>
              </div>

              {scheduleForm.schedule_type === 'window' && scheduleForm.starts_at && scheduleForm.ends_at && (
                <p className="muted maint-duration-preview">
                  Thời lượng: {durationLabel(scheduleForm.starts_at, scheduleForm.ends_at) || '—'}
                </p>
              )}

              <button className="btn primary sm" type="submit" style={{ marginTop: 8 }}>Thêm lịch</button>
            </form>
          </div>

          {schedules.length > 0 && (
            <div className="maint-section">
              <h4>Danh sách lịch ({schedules.length})</h4>
              <div className="maint-schedule-list">
                {schedules.map((s) => {
                  const type = s.schedule_type || (s.starts_at ? 'window' : 'cron');
                  const recurring = type === 'daily' || type === 'weekly' || type === 'cron';
                  return (
                    <div key={s.id} className={`maint-schedule-item status-${s.status}`}>
                      <div className="maint-schedule-head">
                        <strong>{s.name || `Lịch #${s.id}`}</strong>
                        <div className="row">
                          <span className="badge admin">{scheduleTypeLabel(type)}</span>
                          <span className={`badge ${s.enabled ? 'ok' : 'bad'}`}>{s.enabled ? 'Bật' : 'Tắt'}</span>
                          <span className={`badge ${s.status === 'pending' ? 'ok' : s.status === 'started' ? 'admin' : ''}`}>
                            {STATUS_LABELS[s.status] || s.status}
                          </span>
                        </div>
                      </div>
                      <div className="maint-schedule-times">{scheduleSummary(s)}</div>
                      <div className="muted">Countdown: {s.seconds || 60}s</div>
                      <div className="row" style={{ marginTop: 6 }}>
                        {recurring && (
                          <button type="button" className="btn sm" onClick={() => toggleScheduleEnabled(s)}>
                            {s.enabled ? 'Tắt lịch' : 'Bật lịch'}
                          </button>
                        )}
                        {(s.status === 'pending' || s.status === 'started') && (
                          <button type="button" className="btn sm" onClick={() => cancelWindow(s.id)}>Hủy</button>
                        )}
                        {(s.status === 'completed' || s.status === 'cancelled' || !s.enabled) && (
                          <button type="button" className="btn danger sm" onClick={() => removeWindow(s.id)}>Xóa</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="control-card">
          <h3>Chế độ Admin-only</h3>
          <p className="card-hint">Chỉ tài khoản admin mới vào được server — dùng khi test hoặc sự cố.</p>
          <div className="row">
            <button className="btn" onClick={() => call('/admin-mode', { enabled: true }, 'Đã bật admin-only')}>Bật admin-only</button>
            <button className="btn primary" onClick={() => call('/admin-mode', { enabled: false }, 'Đã tắt admin-only')}>Tắt admin-only</button>
          </div>
        </div>

        <div className="control-card">
          <h3>Hot Reload</h3>
          <p className="card-hint">Tải lại dữ liệu in-memory sau khi sửa DB hoặc file config — không cần restart server.</p>
          <div className="action-grid">
            <button className="btn" onClick={() => call('/reload/shop', {}, 'Reload shop OK')}>Reload Shop</button>
            <button className="btn" onClick={() => call('/reload/giftcode', {}, 'Reload giftcode OK')}>Reload Giftcode</button>
            <button className="btn" onClick={() => call('/reload/boss-spawn', {}, 'Reload boss spawn OK')}>Reload Boss Spawn</button>
          </div>
        </div>
      </div>
    </div>
  );
}
