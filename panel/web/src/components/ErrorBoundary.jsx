import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI Exception caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0f1419',
          color: '#e7ecf3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'Segoe UI, system-ui, sans-serif'
        }}>
          <div style={{
            maxWidth: '680px',
            width: '100%',
            backgroundColor: '#1a2332',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '32px' }}>⚠️</span>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#f87171' }}>
                Đã xảy ra lỗi giao diện (UI Render Error)
              </h2>
            </div>
            <p style={{ color: '#8b9cb3', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Một lỗi không mong muốn đã làm gián đoạn hiển thị của trang. Bạn có thể nhấn <strong>Tải lại trang</strong> hoặc sao chép mã lỗi bên dưới để báo cáo.
            </p>
            <div style={{
              backgroundColor: '#0b0f15',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #2d3a4f',
              color: '#ef4444',
              fontFamily: 'Consolas, monospace',
              fontSize: '0.9rem',
              overflowX: 'auto',
              marginBottom: '20px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              {this.state.error?.toString() || 'Unknown Error'}
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                🔄 Tải lại trang
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  backgroundColor: 'transparent',
                  color: '#e7ecf3',
                  border: '1px solid #2d3a4f',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  cursor: 'pointer'
                }}
              >
                Thử khôi phục (Reset)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
