import { useEffect, useState } from 'react';
import { api, getServerId } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';

const CATEGORY_LABELS = {
  'server-control': 'Điều khiển server',
  player: 'Player',
  economy: 'Kinh tế',
  custom: 'Tùy chỉnh',
};

export default function PluginsPage() {
  const [plugins, setPlugins] = useState([]);
  const [values, setValues] = useState({});
  const [running, setRunning] = useState(null);
  const fb = useFeedback();

  useEffect(() => {
    api('/plugins').then((res) => setPlugins(res.data || [])).catch((e) => fb.error(e.message));
  }, []);

  function setField(pluginId, name, val) {
    setValues((v) => ({ ...v, [`${pluginId}.${name}`]: val }));
  }

  async function run(plugin) {
    setRunning(plugin.id);
    const body = {};
    for (const f of plugin.fields || []) {
      body[f.name] = values[`${plugin.id}.${f.name}`] ?? f.default;
    }
    try {
      await api(`/plugins/${plugin.id}/execute`, {
        method: 'POST',
        body: JSON.stringify({ ...body, serverId: getServerId() }),
      });
      fb.success(`Plugin "${plugin.label}" đã chạy thành công`);
    } catch (e) {
      fb.error(e.message);
    } finally {
      setRunning(null);
    }
  }

  const grouped = plugins.reduce((acc, p) => {
    const cat = p.category || 'custom';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Plugins"
        description="Action tùy chỉnh định nghĩa bằng JSON trong panel/plugins/ — chạy nhiều bước agent tự động, không cần sửa code."
      />

      <div className="help-box">
        <h4>Cách dùng</h4>
        <ul>
          <li>Mỗi file .json trong <code>panel/plugins/</code> là một plugin — điền form và bấm Chạy.</li>
          <li>Plugin có thể gọi nhiều API agent liên tiếp (vd: đặt EXP + gửi broadcast).</li>
          <li>Thêm plugin mới: copy manifest mẫu từ <code>x2-exp-weekend.json</code>.</li>
        </ul>
      </div>

      <PageFeedback msg={fb.msg} type={fb.type} onDismiss={fb.clear} />

      {plugins.length === 0 ? (
        <div className="empty-state">Chưa có plugin. Thêm file JSON vào panel/plugins/</div>
      ) : (
        Object.entries(grouped).map(([cat, list]) => (
          <section key={cat} className="section">
            <h3>{CATEGORY_LABELS[cat] || cat}</h3>
            <div className="plugin-grid">
              {list.map((p) => (
                <div key={p.id} className="plugin-card">
                  <div className="plugin-category">{cat}</div>
                  <h3>{p.label}</h3>
                  <p className="muted">ID: {p.id} · {(p.steps || []).length} bước</p>
                  <div className="form-grid">
                    {(p.fields || []).map((f) => (
                      <label key={f.name} className="field">
                        {f.label || f.name}
                        <input
                          type={f.type === 'number' ? 'number' : 'text'}
                          min={f.min}
                          max={f.max}
                          defaultValue={f.default}
                          onChange={(e) => setField(p.id, f.name, f.type === 'number' ? Number(e.target.value) : e.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                  <button
                    className="btn primary"
                    style={{ marginTop: 10 }}
                    onClick={() => run(p)}
                    disabled={running === p.id}
                  >
                    {running === p.id ? 'Đang chạy...' : 'Chạy plugin'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
