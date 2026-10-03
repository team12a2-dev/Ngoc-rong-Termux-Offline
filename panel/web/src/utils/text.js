/**
 * Sửa lỗi hiển thị chuỗi UTF-8 bị giải mã nhầm theo Latin-1/Windows-1252 (Mojibake).
 * Ví dụ: "LÃ ng xÃ¬ mi" -> "Làng xì mi", "LÃ  ng" -> "Làng"
 */
export function fixMojibake(str) {
  if (!str || typeof str !== 'string') return str || '';
  
  // Kiểm tra xem chuỗi có chứa các ký tự giải mã sai điển hình của UTF-8 trong Latin-1
  if (!/[\u00C0-\u00C5\u00E0-\u00E5\u00C8-\u00CB\u00CC-\u00CF\u00D2-\u00D6\u00D9-\u00DC\u00D0\u00D1\u00DD]/.test(str)) {
    return str;
  }

  try {
    const bytes = new Uint8Array([...str].map((c) => c.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    if (decoded && !decoded.includes('\uFFFD')) {
      return decoded;
    }
  } catch {
    // ignore
  }

  return str;
}
