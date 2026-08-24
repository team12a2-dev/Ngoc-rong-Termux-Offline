import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { ItemSearchPicker, OptionEditor } from './ItemInventoryEditor';

const CLASS_LABELS = { 0: 'Trái Đất', 1: 'Namek', 2: 'Xayda' };
const VND_PRESETS = [
  { label: '10K', value: 10000 },
  { label: '50K', value: 50000 },
  { label: '100K', value: 100000 },
  { label: '500K', value: 500000 },
  { label: '1M', value: 1000000 },
  { label: '5M', value: 5000000 },
];

function MetaSearchPicker({ endpoint, onSelect, placeholder, renderItem }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return undefined; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api(`${endpoint}?q=${encodeURIComponent(q.trim())}`);
        setResults(res.data || []);
        setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q, endpoint]);

  useEffect(() => {
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="item-search" ref={wrapRef}>
      <input value={q} placeholder={placeholder} onChange={(e) => setQ(e.target.value)} onFocus={() => q.trim() && setOpen(true)} />
      {loading && <span className="item-search-hint">Đang tìm...</span>}
      {open && results.length > 0 && (
        <ul className="item-search-results">
          {results.map((it) => (
            <li key={it.id}>
              <button type="button" onClick={() => { onSelect?.(it); setQ(''); setOpen(false); }}>
                {renderItem(it)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SkillEditor({ skills, setSkills, onSave, busy }) {
  const [names, setNames] = useState({});

  useEffect(() => {
    const ids = [...new Set(skills.map((s) => s.id).filter(Boolean))];
    if (!ids.length) return;
    (async () => {
      const map = { ...names };
      for (const id of ids) {
        if (map[id]) continue;
        try {
          const res = await api(`/players/meta/skills?q=${id}`);
          const row = (res.data || []).find((r) => r.id === id);
          if (row) map[id] = row;
        } catch { /* ignore */ }
      }
      setNames(map);
    })();
  }, [skills]);

  function addSkill(row) {
    setSkills((prev) => [...prev, { id: row.id, point: 1, lastUse: 0, currLevel: 1, slot: prev.length }]);
    setNames((m) => ({ ...m, [row.id]: row }));
  }

  function patch(idx, patch) {
    setSkills((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  return (
    <div className="skill-editor">
      <p className="muted">Tìm skill theo tên → thêm vào nhân vật. Chỉnh cấp bằng nút +/− hoặc Max.</p>
      <MetaSearchPicker
        endpoint="/players/meta/skills"
        placeholder="🔍 Tìm skill theo tên hoặc ID..."
        onSelect={addSkill}
        renderItem={(it) => (
          <>
            <strong>#{it.id}</strong>
            <span>{it.name} · {CLASS_LABELS[it.nclass_id] || it.nclass_id} · max {it.max_point}</span>
          </>
        )}
      />
      <div className="skill-grid">
        {skills.map((s, idx) => {
          const meta = names[s.id];
          return (
            <div key={`skill-${idx}`} className="skill-card">
              <div className="skill-card-head">
                <strong>{meta?.name || `Skill #${s.id}`}</strong>
                <span className="muted">ID {s.id}</span>
              </div>
              <div className="skill-level-row">
                <span>Cấp / Point</span>
                <div className="stepper">
                  <button type="button" className="btn sm" onClick={() => patch(idx, { point: Math.max(0, (s.point ?? 0) - 1), currLevel: Math.max(0, (s.currLevel ?? 0) - 1) })}>−</button>
                  <strong>{s.point ?? 0}</strong>
                  <button type="button" className="btn sm" onClick={() => patch(idx, { point: (s.point ?? 0) + 1, currLevel: (s.currLevel ?? 0) + 1 })}>+</button>
                  {meta?.max_point != null && (
                    <button type="button" className="btn sm chip-btn" onClick={() => patch(idx, { point: meta.max_point, currLevel: meta.max_point })}>Max</button>
                  )}
                </div>
              </div>
              <div className="slot-actions">
                <button type="button" className="btn sm ghost" onClick={() => setSkills(skills.filter((_, i) => i !== idx))}>Xóa</button>
              </div>
            </div>
          );
        })}
      </div>
      {skills.length === 0 && <p className="muted empty-hint">Chưa có skill. Dùng ô tìm kiếm để thêm.</p>}
      <button className="btn primary" type="button" disabled={busy} onClick={onSave}>Lưu kỹ năng</button>
    </div>
  );
}

export function TaskEditor({ taskForm, setTaskForm, sideTask, onSave, busy }) {
  const [taskInfo, setTaskInfo] = useState(null);

  useEffect(() => {
    const id = taskForm.taskId ?? taskForm?.taskId;
    if (id == null || id === '') { setTaskInfo(null); return undefined; }
    let cancelled = false;
    (async () => {
      try {
        const res = await api(`/players/meta/tasks/${id}`);
        if (!cancelled) setTaskInfo(res.data);
      } catch { if (!cancelled) setTaskInfo(null); }
    })();
    return () => { cancelled = true; };
  }, [taskForm.taskId]);

  const sub = taskInfo?.subTasks?.[taskForm.taskIndex ?? 0];

  function bump(field, delta) {
    setTaskForm((f) => ({ ...f, [field]: Math.max(0, Number(f[field] ?? 0) + delta) }));
  }

  return (
    <div className="task-editor">
      <p className="muted">Chọn nhiệm vụ chính, chỉnh bước và tiến độ. Tên nhiệm vụ lấy từ database game.</p>
      <MetaSearchPicker
        endpoint="/players/meta/tasks"
        placeholder="🔍 Tìm nhiệm vụ theo tên hoặc ID..."
        onSelect={(t) => setTaskForm({ taskId: t.id, taskIndex: 0, taskCount: 0, taskLastTime: 0 })}
        renderItem={(it) => (<><strong>#{it.id}</strong><span>{it.name}</span></>)}
      />

      {taskInfo && (
        <div className="info-panel task-summary">
          <h4>NV #{taskInfo.id}: {taskInfo.name}</h4>
          {taskInfo.detail && <p className="muted task-detail">{taskInfo.detail}</p>}
          {sub && (
            <p className="muted">
              Bước {taskForm.taskIndex}: <strong>{sub.name}</strong> · cần {sub.max_count} · map {sub.map}
            </p>
          )}
        </div>
      )}

      <div className="task-controls">
        <label className="field">
          <span>Bước nhiệm vụ (index)</span>
          <div className="stepper">
            <button type="button" className="btn sm" onClick={() => bump('taskIndex', -1)}>−</button>
            <input type="number" value={taskForm.taskIndex ?? 0} onChange={(e) => setTaskForm({ ...taskForm, taskIndex: Number(e.target.value) })} />
            <button type="button" className="btn sm" onClick={() => bump('taskIndex', 1)}>+</button>
            <button type="button" className="btn sm" onClick={() => setTaskForm({ ...taskForm, taskIndex: 0 })}>Về bước 0</button>
          </div>
        </label>
        <label className="field">
          <span>Tiến độ bước (count)</span>
          <div className="stepper">
            <button type="button" className="btn sm" onClick={() => bump('taskCount', -1)}>−</button>
            <input type="number" value={taskForm.taskCount ?? 0} onChange={(e) => setTaskForm({ ...taskForm, taskCount: Number(e.target.value) })} />
            <button type="button" className="btn sm" onClick={() => bump('taskCount', 1)}>+1</button>
            {sub?.max_count != null && (
              <button type="button" className="btn sm chip-btn" onClick={() => setTaskForm({ ...taskForm, taskCount: sub.max_count })}>Hoàn thành bước</button>
            )}
          </div>
        </label>
      </div>

      <button className="btn primary" type="button" disabled={busy} onClick={onSave}>Lưu nhiệm vụ</button>

      {sideTask && (
        <div className="info-panel" style={{ marginTop: 16 }}>
          <h4>Nhiệm vụ phụ</h4>
          <SideTaskView data={sideTask} />
        </div>
      )}
    </div>
  );
}

function SideTaskView({ data }) {
  if (!data) return <p className="muted">Không có</p>;
  if (Array.isArray(data)) {
    return (
      <ul className="info-list">
        {data.map((v, i) => <li key={i}><span>Mục {i}</span><strong>{String(v)}</strong></li>)}
      </ul>
    );
  }
  if (typeof data === 'object') {
    return (
      <ul className="info-list">
        {Object.entries(data).map(([k, v]) => <li key={k}><span>{k}</span><strong>{String(v)}</strong></li>)}
      </ul>
    );
  }
  return <p>{String(data)}</p>;
}

export function QuickBuffPanel({ busy, buffVndAmount, setBuffVndAmount, onBuffVnd, onBuffItem }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [options, setOptions] = useState([]);

  return (
    <div className="quick-buff-panel">
      <div className="buff-block">
        <h4>💰 Buff VND</h4>
        <div className="preset-row">
          {VND_PRESETS.map((p) => (
            <button key={p.value} type="button" className={`btn sm chip-btn ${Number(buffVndAmount) === p.value ? 'active' : ''}`} onClick={() => setBuffVndAmount(String(p.value))}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="row buff-form">
          <label className="field">
            <span>Số VND</span>
            <input type="number" value={buffVndAmount} onChange={(e) => setBuffVndAmount(e.target.value)} placeholder="Nhập số tiền" />
          </label>
          <button className="btn primary" type="button" disabled={busy || !buffVndAmount} onClick={() => onBuffVnd(Number(buffVndAmount))}>
            Buff VND
          </button>
        </div>
      </div>

      <div className="buff-block">
        <h4>🎁 Buff Item</h4>
        <ItemSearchPicker
          placeholder="🔍 Tìm item để buff..."
          onSelect={(it) => setSelectedItem(it)}
        />
        {selectedItem && (
          <div className="selected-item-preview">
            <strong>{selectedItem.name}</strong>
            <span className="muted">ID {selectedItem.id}</span>
          </div>
        )}
        <label className="field qty-field">
          <span>Số lượng</span>
          <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value) || 1)} />
        </label>
        <OptionEditor options={options} onChange={setOptions} />
        <button
          className="btn primary"
          type="button"
          disabled={busy || !selectedItem}
          onClick={() => onBuffItem({ temp_id: selectedItem.id, quantity, options })}
        >
          Buff item{selectedItem ? `: ${selectedItem.name}` : ''}
        </button>
      </div>
    </div>
  );
}

function JsonSection({ title, data, labels }) {
  const [showRaw, setShowRaw] = useState(false);
  if (data == null) return null;

  function copyRaw() {
    navigator.clipboard?.writeText(JSON.stringify(data, null, 2));
  }

  return (
    <div className="data-section">
      <div className="section-head">
        <h4>{title}</h4>
        <div className="row">
          <button type="button" className="btn sm" onClick={() => setShowRaw(!showRaw)}>{showRaw ? 'Dễ đọc' : 'JSON'}</button>
          <button type="button" className="btn sm ghost" onClick={copyRaw}>Copy</button>
        </div>
      </div>
      {showRaw ? (
        <pre>{JSON.stringify(data, null, 2)}</pre>
      ) : (
        <DataReadable data={data} labels={labels} />
      )}
    </div>
  );
}

function DataReadable({ data, labels = {} }) {
  if (data == null) return <p className="muted">Không có dữ liệu</p>;
  if (Array.isArray(data)) {
    if (!data.length) return <p className="muted">Danh sách trống</p>;
    if (data.every((x) => typeof x !== 'object')) {
      return <ul className="info-list">{data.map((v, i) => <li key={i}><span>[{i}]</span><strong>{String(v)}</strong></li>)}</ul>;
    }
    return data.map((row, i) => (
      <div key={i} className="nested-block">
        <div className="muted">#{i}</div>
        <DataReadable data={row} labels={labels} />
      </div>
    ));
  }
  if (typeof data === 'object') {
    return (
      <ul className="info-list">
        {Object.entries(data).map(([k, v]) => (
          <li key={k}>
            <span>{labels[k] || k}</span>
            <strong>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</strong>
          </li>
        ))}
      </ul>
    );
  }
  return <p>{String(data)}</p>;
}

const STAT_LABELS = {
  limitPower: 'Giới hạn SM', power: 'Sức mạnh', tiemNang: 'Tiềm năng', stamina: 'Thể lực', maxStamina: 'TL tối đa',
  hpg: 'HP gốc', mpg: 'MP gốc', dameg: 'Sức đánh', defg: 'Giáp', critg: 'Chí mạng', critdragon: 'CM rồng', hp: 'HP', mp: 'MP',
};

const INV_LABELS = { gold: 'Vàng', gem: 'Ngọc', ruby: 'Hồng ngọc', coupon: 'Coupon', event: 'Event' };

export function DataExplorer({ player }) {
  return (
    <div className="data-explorer">
      <p className="muted">Xem dữ liệu nâng cao dạng dễ đọc. Bấm <strong>JSON</strong> nếu cần raw cho debug.</p>
      <JsonSection title="Chỉ số nhân vật" data={player.stats} labels={STAT_LABELS} />
      <JsonSection title="Túi / tiền tệ" data={player.inventory} labels={INV_LABELS} />
      <JsonSection title="Vị trí" data={player.location} labels={{ mapId: 'Map ID', x: 'X', y: 'Y' }} />
      <JsonSection title="Đệ tử (pet)" data={player.pet} />
      <JsonSection title="Nội tại (intrinsic)" data={player.data_intrinsic} />
      <JsonSection title="Nhiệm vụ phụ" data={player.data_side_task} />
      <JsonSection title="Thành tựu" data={player.data_achievement} />
    </div>
  );
}
