import { useEffect, useState } from 'react';
import { api } from '../api';
import PageHeader from '../components/PageHeader';

const ACTION_LABELS = {
  'account.ban': 'Ban account',
  'account.unban': 'Unban account',
  'account.edit': 'Sửa account',
  'giftcode.create': 'Tạo giftcode',
  'giftcode.update': 'Sửa giftcode',
  'giftcode.delete': 'Xóa giftcode',
  'giftcode.reload': 'Reload giftcode',
  'shop.item.update': 'Sửa shop item',
  'shop.reload': 'Reload shop',
  'config.save': 'Lưu config',
  'config.rollback': 'Rollback config',
  'plugin.execute': 'Chạy plugin',
  'player.kick': 'Kick player',
  'player.create': 'Tạo nhân vật',
  'player.delete': 'Xóa nhân vật',
  'player.currency.online': 'Cộng vàng/ngọc online',
  'player.currency.db': 'Cộng vàng/ngọc DB',
  'server.broadcast': 'Broadcast toàn server',

};

export default function LogsPage() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api('/audit-logs')
      .then((res) => setRows(res.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter.trim()
    ? rows.filter((r) =>
        (r.action || '').includes(filter) ||
        String(r.target || '').includes(filter) ||
        String(r.user_id || '').includes(filter)
      )
    : rows;

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Lịch sử mọi thao tác ghi trên panel — ai làm gì, lúc nào, đối tượng nào."
      />

      <div className="row filters">
        <input
          placeholder="Lọc theo action, target, user..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <span className="muted">{filtered.length} / {rows.length} bản ghi</span>
      </div>

      {loading ? (
        <p className="muted">Đang tải...</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state">Không có log nào.</div>
      ) : (
        <table>
          <thead><tr><th>ID</th><th>Hành động</th><th>Đối tượng</th><th>User</th><th>Thời gian</th></tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>
                  <span title={r.action}>{ACTION_LABELS[r.action] || r.action}</span>
                </td>
                <td><code>{r.target || '—'}</code></td>
                <td>{r.user_id ?? '—'}</td>
                <td>{r.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
