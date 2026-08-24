import { useEffect, useState } from 'react';

export function useFeedback() {
  const [msg, setMsg] = useState(null);
  const [type, setType] = useState('info');

  function show(text, kind = 'info') {
    setType(kind);
    setMsg(text);
  }

  function success(text) { show(text, 'success'); }
  function error(text) { show(text, 'error'); }
  function clear() { setMsg(null); }

  return { msg, type, show, success, error, clear, setMsg };
}

export default function PageFeedback({ msg, type = 'info', onDismiss }) {
  useEffect(() => {
    if (!msg || type === 'error') return undefined;
    const t = setTimeout(() => onDismiss?.(), 5000);
    return () => clearTimeout(t);
  }, [msg, type, onDismiss]);

  if (!msg) return null;

  return (
    <div className={`alert feedback ${type}`} role="status">
      <span>{msg}</span>
      {onDismiss && (
        <button type="button" className="feedback-dismiss" onClick={onDismiss} aria-label="Đóng">×</button>
      )}
    </div>
  );
}
