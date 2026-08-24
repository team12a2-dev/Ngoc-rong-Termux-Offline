import { useState, useEffect, useCallback } from 'react';
import { api, getServerId } from '../api';
import ItemInventoryEditor, { parseOptionsText, BODY_SLOT_LABELS } from './ItemInventoryEditor';
import { SkillEditor, TaskEditor, QuickBuffPanel, DataExplorer } from './PlayerEditors';

function fmt(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('vi-VN');
}

function fmtDate(v) {
  if (!v) return '—';
  try { return new Date(v).toLocaleString('vi-VN'); } catch { return String(v); }
}

function cloneItems(items) {
  return (items || []).map((it, i) => ({
    ...it,
    slot: it.slot ?? i,
    options: [...(it.options || [])],
  }));
}

const STAT_GROUPS = [
  {
    title: 'Sức mạnh & tiềm năng',
    fields: [
      ['limitPower', 'Giới hạn SM'],
      ['power', 'Sức mạnh'],
      ['tiemNang', 'Tiềm năng'],
      ['stamina', 'Thể lực'],
      ['maxStamina', 'Thể lực tối đa'],
    ],
  },
  {
    title: 'Chỉ số gốc',
    fields: [
      ['hpg', 'HP gốc'],
      ['mpg', 'MP/KI gốc'],
      ['dameg', 'Sức đánh gốc'],
      ['defg', 'Giáp gốc'],
      ['critg', 'Chí mạng gốc'],
      ['critdragon', 'Chí mạng rồng'],
    ],
  },
  {
    title: 'Hiện tại',
    fields: [['hp', 'HP hiện tại'], ['mp', 'MP/KI hiện tại']],
  },
];

const POINT_LABELS = {
  event_point: 'Điểm sự kiện',
  rank: 'Hạng',
  point_sukien: 'Point sự kiện',
  point_sukien1: 'Point sự kiện 1',
  point_sukien2: 'Point sự kiện 2',
  point_maydam: 'Point máy dầm',
  thachdauwhis: 'Thách đấu Whis',
  lucky_round_point: 'Lucky round',
  point_2207: 'Point 2207',
};

const QUICK_MAPS = [
  { label: 'Làng Aru', mapId: 0, x: 500, y: 432 },
  { label: 'Làng Mori', mapId: 7, x: 500, y: 432 },
  { label: 'Làng Kakarot', mapId: 14, x: 500, y: 432 },
  { label: 'Siêu thị', mapId: 45, x: 500, y: 432 },
  { label: 'Cold', mapId: 105, x: 500, y: 432 },
];

function Field({ label, value, onChange, type = 'text', readOnly, hint }) {
  return (
    <label className="field">
      <span>{label}{hint ? <small className="field-hint"> {hint}</small> : null}</span>
      <input
        type={type}
        value={value ?? ''}
        readOnly={readOnly}
        onChange={(e) => onChange?.(type === 'number' ? Number(e.target.value) : e.target.value)}
      />
    </label>
  );
}

export default function PlayerDetailPanel({ player, onRefresh, onMessage }) {
  const [tab, setTab] = useState('overview');
  const [statsForm, setStatsForm] = useState({});
  const [invForm, setInvForm] = useState({});
  const [locForm, setLocForm] = useState({});
  const [profileForm, setProfileForm] = useState({});
  const [pointsForm, setPointsForm] = useState({});
  const [accountForm, setAccountForm] = useState({});
  const [taskForm, setTaskForm] = useState({});
  const [skillsForm, setSkillsForm] = useState([]);
  const [itemsBody, setItemsBody] = useState([]);
  const [itemsBag, setItemsBag] = useState([]);
  const [itemsBox, setItemsBox] = useState([]);
  const [itemSubTab, setItemSubTab] = useState('body');
  const [itemNames, setItemNames] = useState({});
  const [buffVndAmount, setBuffVndAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [actionErr, setActionErr] = useState(false);

  const isBanned = Number(player?.ban) === 1;
  const isOnline = Boolean(player?.online);

  const loadItemNames = useCallback(async () => {
    try {
      const res = await api('/players/item-templates');
      setItemNames(res.map || {});
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadItemNames(); }, [loadItemNames]);

  useEffect(() => {
    if (!player) return;
    setActionMsg('');
    setActionErr(false);
    setStatsForm({ ...player.stats });
    setInvForm({ ...player.inventory });
    setLocForm({ ...player.location });
    setProfileForm({
      name: player.name,
      head: player.head,
      gender: player.gender,
      clan_id: player.clan_id,
    });
    setPointsForm({
      event_point: player.event_point,
      rank: player.rank,
      point_sukien: player.point_sukien,
      point_sukien1: player.point_sukien1,
      point_sukien2: player.point_sukien2,
      point_maydam: player.point_maydam,
      thachdauwhis: player.thachdauwhis,
      lucky_round_point: player.lucky_round_point,
      point_2207: player.point_2207,
    });
    setAccountForm({
      vnd: player.vnd,
      vip: player.vip,
      tongnap: player.tongnap,
      is_admin: player.is_admin,
    });
    setTaskForm({ ...player.task });
    setSkillsForm(cloneItems(player.skills?.map((s) => ({ ...s })) || []));
    setItemsBody(cloneItems(player.items_body));
    setItemsBag(cloneItems(player.items_bag));
    setItemsBox(cloneItems(player.items_box));
  }, [player]);

  async function save(path, body, label) {
    setBusy(true);
    setActionMsg('');
    setActionErr(false);
    try {
      const res = await api(`/players/${player.id}${path}`, {
        method: 'PUT',
        body: JSON.stringify({ ...body, serverId: getServerId() }),
      });
      const syncMsg = res.data?.apply?.message || res.data?.sync?.message;
      const syncOk = res.data?.apply?.applied || (res.data?.sync?.online && res.data?.sync?.synced);
      const msg = `${label} đã lưu.${syncMsg ? ` ${syncMsg}` : ''}`;
      setActionMsg(msg);
      setActionErr(Boolean((res.data?.apply?.online || res.data?.sync?.online) && !syncOk));
      onMessage?.(msg);
      await onRefresh?.();
    } catch (e) {
      setActionErr(true);
      setActionMsg(e.message);
      onMessage?.(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function action(path, body, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setActionMsg('');
    setActionErr(false);
    try {
      const res = await api(`/players/${player.id}${path}`, {
        method: 'POST',
        body: JSON.stringify({ serverId: getServerId(), ...body }),
      });
      const msg = res.data?.message || res.data?.data?.message || 'Thành công';
      setActionMsg(msg);
      onMessage?.(msg);
      await onRefresh?.();
    } catch (e) {
      setActionErr(true);
      setActionMsg(e.message);
      onMessage?.(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveItems(containerKey, list) {
    const payload = list.map((it, slot) => ({
      slot,
      templateId: it.empty || it.templateId === -1 ? -1 : Number(it.templateId),
      quantity: Number(it.quantity ?? 1),
      options: it.options?.length ? it.options : parseOptionsText(it.optionsText),
      createTime: it.createTime || 0,
      empty: it.empty || it.templateId === -1,
    }));
    await save(`/items/${containerKey}`, { items: payload }, `Trang bị (${containerKey})`);
  }

  const tabs = [
    ['overview', 'Tổng quan'],
    ['stats', 'Chỉ số'],
    ['inventory', 'Túi / Vàng'],
    ['items', 'Trang bị'],
    ['skills', 'Kỹ năng'],
    ['task', 'Nhiệm vụ'],
    ['points', 'Điểm / Profile'],
    ['account', 'Account'],
    ['actions', 'Hành động'],
    ['data', 'Dữ liệu'],
  ];

  if (!player) return null;

  const onlineInfo = player.online;

  return (
    <div className="card detail player-detail">
      <div className="detail-header">
        <div>
          <h3>{player.name}</h3>
          <p className="muted">
            ID {player.id} · {player.genderLabel} · Power {fmt(player.power)}
            {isOnline && <span className="badge ok" style={{ marginLeft: 8 }}>ONLINE</span>}
            {isBanned ? <span className="badge bad" style={{ marginLeft: 8 }}>BANNED</span> : null}
            {player.is_admin ? <span className="badge admin" style={{ marginLeft: 8 }}>ADMIN</span> : null}
          </p>
        </div>
        <button className="btn sm" type="button" onClick={() => onRefresh?.()}>Refresh</button>
      </div>

      {actionMsg && tab !== 'actions' && (
        <div className={`alert ${actionErr ? 'error' : ''}`} style={{ marginBottom: 10 }}>{actionMsg}</div>
      )}

      <div className="tabs">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="overview-grid">
          <p className="muted overview-note">
            Chỉnh sửa ghi vào DB. Player <strong>online</strong> → tự đồng bộ lên game sau khi lưu (hoặc bấm Đồng bộ).
          </p>
          <div className="stat-grid">
            <div className="mini-stat"><span>Power</span><strong>{fmt(player.power)}</strong></div>
            <div className="mini-stat"><span>Tiềm năng</span><strong>{fmt(player.tiemNang)}</strong></div>
            <div className="mini-stat"><span>Vàng</span><strong>{fmt(player.inventory?.gold)}</strong></div>
            <div className="mini-stat"><span>Ngọc</span><strong>{fmt(player.inventory?.gem)}</strong></div>
            <div className="mini-stat"><span>Hồng ngọc</span><strong>{fmt(player.inventory?.ruby)}</strong></div>
            <div className="mini-stat"><span>VND</span><strong>{fmt(player.vnd)}</strong></div>
            <div className="mini-stat"><span>VIP</span><strong>{player.vip ?? 0}</strong></div>
            <div className="mini-stat"><span>Map</span><strong>{player.location?.mapId}</strong></div>
            <div className="mini-stat"><span>Clan</span><strong>{player.clan_id || '—'}</strong></div>
          </div>
          <div className="info-panels">
            <div className="info-panel">
              <h4>Account</h4>
              <ul className="info-list">
                <li><span>Username</span><strong>{player.username || '—'}</strong></li>
                <li><span>Account ID</span><strong>{player.account_id}</strong></li>
                <li><span>Email</span><strong>{player.email || '—'}</strong></li>
                <li><span>IP</span><strong>{player.ip_address || '—'}</strong></li>
                <li><span>Tổng nạp</span><strong>{fmt(player.tongnap)}</strong></li>
                <li><span>Đăng nhập cuối</span><strong>{fmtDate(player.last_time_login)}</strong></li>
              </ul>
            </div>
            <div className="info-panel">
              <h4>Nhân vật</h4>
              <ul className="info-list">
                <li><span>Head</span><strong>{player.head}</strong></li>
                <li><span>Tạo lúc</span><strong>{fmtDate(player.create_time)}</strong></li>
                <li><span>Nhiệm vụ</span><strong>#{player.task?.taskId} · bước {player.task?.taskIndex}</strong></li>
                <li><span>Body items</span><strong>{player.items_body?.filter((i) => !i.empty).length ?? 0}</strong></li>
                <li><span>Bag items</span><strong>{player.items_bag?.filter((i) => !i.empty).length ?? 0}</strong></li>
                <li><span>Box items</span><strong>{player.items_box?.filter((i) => !i.empty).length ?? 0}</strong></li>
              </ul>
            </div>
            {isOnline && onlineInfo && (
              <div className="info-panel online-panel">
                <h4>Trực tuyến (game)</h4>
                <ul className="info-list">
                  <li><span>Map</span><strong>{onlineInfo.mapId ?? '—'}</strong></li>
                  <li><span>Zone</span><strong>{onlineInfo.zoneId ?? '—'}</strong></li>
                  <li><span>VND session</span><strong>{fmt(onlineInfo.vnd)}</strong></li>
                  <li><span>IP</span><strong>{onlineInfo.ip || '—'}</strong></li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'stats' && (
        <div className="stats-editor">
          {STAT_GROUPS.map((group) => (
            <div key={group.title} className="stat-group">
              <h4>{group.title}</h4>
              <div className="form-grid">
                {group.fields.map(([key, label]) => (
                  <Field
                    key={key}
                    label={label}
                    type="number"
                    value={statsForm[key] ?? player.stats?.[key]}
                    onChange={(v) => setStatsForm({ ...statsForm, [key]: v })}
                  />
                ))}
              </div>
            </div>
          ))}
          <button className="btn primary" disabled={busy} type="button" onClick={() => save('/stats', statsForm, 'Chỉ số')}>
            Lưu chỉ số
          </button>
        </div>
      )}

      {tab === 'inventory' && (
        <div className="form-grid">
          <Field label="Vàng (gold)" type="number" value={invForm.gold ?? player.inventory?.gold} onChange={(v) => setInvForm({ ...invForm, gold: v })} />
          <Field label="Ngọc xanh (gem)" type="number" value={invForm.gem ?? player.inventory?.gem} onChange={(v) => setInvForm({ ...invForm, gem: v })} />
          <Field label="Hồng ngọc (ruby)" type="number" value={invForm.ruby ?? player.inventory?.ruby} onChange={(v) => setInvForm({ ...invForm, ruby: v })} />
          <Field label="Coupon" type="number" value={invForm.coupon ?? player.inventory?.coupon} onChange={(v) => setInvForm({ ...invForm, coupon: v })} />
          <Field label="Event item" type="number" value={invForm.event ?? player.inventory?.event} onChange={(v) => setInvForm({ ...invForm, event: v })} />

          <div className="section full-width">
            <h4>Teleport / Vị trí</h4>
            <div className="quick-maps">
              {QUICK_MAPS.map((m) => (
                <button
                  key={m.mapId}
                  type="button"
                  className="btn sm"
                  onClick={() => setLocForm({ mapId: m.mapId, x: m.x, y: m.y })}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="row">
              <Field label="Map ID" type="number" value={locForm.mapId ?? player.location?.mapId} onChange={(v) => setLocForm({ ...locForm, mapId: v })} />
              <Field label="X" type="number" value={locForm.x ?? player.location?.x} onChange={(v) => setLocForm({ ...locForm, x: v })} />
              <Field label="Y" type="number" value={locForm.y ?? player.location?.y} onChange={(v) => setLocForm({ ...locForm, y: v })} />
            </div>
          </div>

          <div className="row">
            <button className="btn primary" disabled={busy} type="button" onClick={() => save('/inventory', invForm, 'Túi')}>Lưu túi</button>
            <button className="btn" disabled={busy} type="button" onClick={() => save('/location', locForm, 'Vị trí')}>Lưu vị trí / Teleport</button>
          </div>
        </div>
      )}

      {tab === 'items' && (
        <>
          <p className="muted items-intro">
            Tìm item theo <strong>tên</strong>, bấm để thêm. Sửa từng ô bằng nút <strong>Sửa</strong> — cường hóa +2…+15 chỉ một click.
          </p>
          <div className="sub-tabs">
            {[['body', 'Trang bị'], ['bag', 'Hành trang'], ['box', 'Rương đồ']].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`tab ${itemSubTab === id ? 'active' : ''}`}
                onClick={() => setItemSubTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {itemSubTab === 'body' && (
            <ItemInventoryEditor
              title="Trang bị đang mặc"
              containerKey="body"
              items={itemsBody}
              setItems={setItemsBody}
              itemNames={itemNames}
              onSave={saveItems}
              busy={busy}
              minSlots={12}
              slotLabels={BODY_SLOT_LABELS}
              fixedSlots
            />
          )}
          {itemSubTab === 'bag' && (
            <ItemInventoryEditor
              title="Hành trang"
              containerKey="bag"
              items={itemsBag}
              setItems={setItemsBag}
              itemNames={itemNames}
              onSave={saveItems}
              busy={busy}
            />
          )}
          {itemSubTab === 'box' && (
            <ItemInventoryEditor
              title="Rương đồ"
              containerKey="box"
              items={itemsBox}
              setItems={setItemsBox}
              itemNames={itemNames}
              onSave={saveItems}
              busy={busy}
            />
          )}
        </>
      )}

      {tab === 'skills' && (
        <SkillEditor
          skills={skillsForm}
          setSkills={setSkillsForm}
          busy={busy}
          onSave={() => save('/skills', { skills: skillsForm }, 'Kỹ năng')}
        />
      )}

      {tab === 'task' && (
        <TaskEditor
          taskForm={taskForm}
          setTaskForm={setTaskForm}
          sideTask={player.data_side_task}
          busy={busy}
          onSave={() => save('/task', taskForm, 'Nhiệm vụ')}
        />
      )}

      {tab === 'points' && (
        <div className="form-grid">
          {Object.keys(pointsForm).map((k) => (
            <Field key={k} label={POINT_LABELS[k] || k} type="number" value={pointsForm[k]} onChange={(v) => setPointsForm({ ...pointsForm, [k]: v })} />
          ))}
          <div className="section full-width">
            <h4>Profile nhân vật</h4>
            <div className="row">
              <Field label="Tên" value={profileForm.name ?? player.name} onChange={(v) => setProfileForm({ ...profileForm, name: v })} />
              <Field label="Head" type="number" value={profileForm.head ?? player.head} onChange={(v) => setProfileForm({ ...profileForm, head: v })} />
              <Field label="Gender (0/1/2)" type="number" value={profileForm.gender ?? player.gender} onChange={(v) => setProfileForm({ ...profileForm, gender: v })} />
              <Field label="Clan ID" type="number" value={profileForm.clan_id ?? player.clan_id} onChange={(v) => setProfileForm({ ...profileForm, clan_id: v })} />
            </div>
          </div>
          <div className="row">
            <button className="btn primary" disabled={busy} type="button" onClick={() => save('/points', pointsForm, 'Điểm')}>Lưu điểm</button>
            <button className="btn" disabled={busy} type="button" onClick={() => save('/profile', profileForm, 'Profile')}>Lưu profile</button>
          </div>
        </div>
      )}

      {tab === 'account' && (
        <div className="form-grid">
          <Field label="Username" value={player.username} readOnly />
          <Field label="Account ID" value={player.account_id} readOnly />
          <Field label="Email" value={player.email || '—'} readOnly />
          <Field label="IP đăng ký" value={player.ip_address || '—'} readOnly />
          <Field label="VND" type="number" value={accountForm.vnd ?? player.vnd} onChange={(v) => setAccountForm({ ...accountForm, vnd: v })} />
          <Field label="VIP level" type="number" value={accountForm.vip ?? player.vip} onChange={(v) => setAccountForm({ ...accountForm, vip: v })} />
          <Field label="Tổng nạp" type="number" value={accountForm.tongnap ?? player.tongnap} onChange={(v) => setAccountForm({ ...accountForm, tongnap: v })} />
          <Field label="Quyền admin (0/1)" type="number" value={accountForm.is_admin ?? player.is_admin} onChange={(v) => setAccountForm({ ...accountForm, is_admin: v })} />
          <button className="btn primary" disabled={busy} type="button" onClick={() => save('/account', accountForm, 'Account')}>Lưu account</button>
        </div>
      )}

      {tab === 'actions' && (
        <div className="actions-panel">
          <p className="muted">
            Trạng thái: {isOnline ? 'Đang online — thao tác trực tiếp trên game server' : 'Offline — kick không có tác dụng, buff ghi DB'}
          </p>
          {actionMsg && (
            <div className={`alert ${actionErr ? 'error' : ''}`} style={{ marginBottom: 10 }}>{actionMsg}</div>
          )}

          <QuickBuffPanel
            busy={busy}
            buffVndAmount={buffVndAmount}
            setBuffVndAmount={setBuffVndAmount}
            onBuffVnd={(amount) => action('/buff-vnd', { amount }, `Buff ${amount.toLocaleString('vi-VN')} VND cho ${player.name}?`)}
            onBuffItem={(payload) => action('/buff-item', payload, `Buff item #${payload.temp_id} cho ${player.name}?`)}
          />

          <div className="action-section">
            <h4>Quản lý session</h4>
            <div className="action-grid">
              <button className="btn primary" disabled={busy || !isOnline} type="button" onClick={() => action('/sync', {}, 'Đồng bộ dữ liệu DB lên game server?')}>
                Đồng bộ lên game
              </button>
              <button className="btn danger" disabled={busy} type="button" onClick={() => action('/kick', {}, `Kick ${player.name} khỏi game?`)}>
                Kick {isOnline ? '(online)' : '(thử kick)'}
              </button>
              <button className="btn danger" disabled={busy || isBanned} type="button" onClick={() => action('/ban', {}, `Ban account của ${player.name}?`)}>
                Ban account
              </button>
              <button className="btn" disabled={busy || !isBanned} type="button" onClick={() => action('/unban', {}, `Unban account của ${player.name}?`)}>
                Unban account
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'data' && <DataExplorer player={player} />}
    </div>
  );
}
