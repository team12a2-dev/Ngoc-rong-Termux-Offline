import { useState } from 'react';
import { api } from '../api';

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setLoading(true);
    try {
      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username: form.username, password: form.password }),
      });
      setSuccess('Đăng ký thành công. Bạn có thể quay lại game và đăng nhập ngay.');
      setForm({ username: '', password: '', confirmPassword: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />
        <div className="login-grid" />
      </div>

      <div className="login-shell">
        <aside className="login-brand">
          <div className="login-brand-icon" aria-hidden="true">NRO</div>
          <h1>Ngọc Rồng Online</h1>
          <p>Tạo tài khoản để bắt đầu hành trình và lưu tiến trình nhân vật của bạn.</p>
          <ul className="login-features">
            <li>Đăng ký nhanh chóng</li>
            <li>Mỗi tài khoản dùng một nhân vật</li>
            <li>Quay lại game để đăng nhập</li>
          </ul>
        </aside>

        <form className="login-card" onSubmit={submit}>
          <div className="login-card-head">
            <h2>Đăng ký tài khoản</h2>
            <p>Nhập thông tin để tạo tài khoản chơi game</p>
          </div>

          {error && <div className="login-alert" role="alert"><span className="login-alert-icon">!</span>{error}</div>}
          {success && <div className="login-alert" role="status" style={{ borderColor: '#2e9b65', color: '#1d7049' }}>{success}</div>}

          <div className="login-fields">
            <label className="login-field">
              <span className="login-field-label">Tên tài khoản</span>
              <span className="login-input-wrap">
                <input value={form.username} onChange={(e) => update('username', e.target.value)} placeholder="5–20 ký tự a-z, 0-9" autoComplete="username" required maxLength={20} />
              </span>
            </label>
            <label className="login-field">
              <span className="login-field-label">Mật khẩu</span>
              <span className="login-input-wrap">
                <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Tối thiểu 6 ký tự" autoComplete="new-password" required minLength={6} />
              </span>
            </label>
            <label className="login-field">
              <span className="login-field-label">Nhập lại mật khẩu</span>
              <span className="login-input-wrap">
                <input type="password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} placeholder="Nhập lại mật khẩu" autoComplete="new-password" required minLength={6} />
              </span>
            </label>
          </div>

          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
          </button>
          <p className="login-footer">Không chia sẻ tài khoản và mật khẩu cho người khác.</p>
        </form>
      </div>
    </div>
  );
}
