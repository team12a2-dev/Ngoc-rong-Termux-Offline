#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

REPO_ARCHIVE_URL="${NRO_ARCHIVE_URL:-https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/archive/refs/heads/main.tar.gz}"
TARGET_DIR="${NRO_TARGET_DIR:-$HOME/ngocrong-termux}"
TMP_ROOT="${NRO_TMP_ROOT:-$HOME/.cache/ngocrong-termux}"
TMP_DIR=""
PRESERVE_DIR=""
SOURCE_COMMIT_URL="${NRO_SOURCE_COMMIT_URL:-https://api.github.com/repos/team12a2-dev/Ngoc-rong-Termux-Offline/commits/main}"

cleanup() {
  if [ -n "${TMP_DIR:-}" ] && [ -d "$TMP_DIR" ]; then
    rm -rf "$TMP_DIR"
  fi
  if [ -n "${PRESERVE_DIR:-}" ] && [ -d "$PRESERVE_DIR" ]; then
    rm -rf "$PRESERVE_DIR"
  fi
}
trap cleanup EXIT

if ! command -v pkg >/dev/null 2>&1; then
  printf '%s\n' '[NRO][ERROR] Hãy chạy lệnh này trong Termux.' >&2
  exit 1
fi

printf '%s\n' '[NRO] Chuẩn bị công cụ tải archive public...'
pkg update -y
pkg install -y curl tar

mkdir -p "$TMP_ROOT"
if ! printf '%s\n' ok > "$TMP_ROOT/.write-test.$$" 2>/dev/null; then
  printf '%s\n' "[NRO][ERROR] Không ghi được vào thư mục tạm: $TMP_ROOT" >&2
  printf '%s\n' '[NRO][ERROR] Hãy kiểm tra quyền ghi và dung lượng bộ nhớ trong Termux.' >&2
  exit 1
fi
rm -f "$TMP_ROOT/.write-test.$$"
FREE_KB="$(df -Pk "$TMP_ROOT" | awk 'NR==2 {print $4}')"
if [[ "$FREE_KB" =~ ^[0-9]+$ ]] && [ "$FREE_KB" -lt "${NRO_MIN_FREE_KB:-131072}" ]; then
  printf '%s\n' "[NRO][ERROR] Bộ nhớ trống quá thấp: ${FREE_KB}KB tại $TMP_ROOT" >&2
  exit 1
fi
TMP_DIR="$(mktemp -d "$TMP_ROOT/bootstrap.XXXXXX")"
ARCHIVE="$TMP_DIR/ngocrong-termux.tar.gz"
EXTRACT_DIR="$TMP_DIR/extracted"
mkdir -p "$EXTRACT_DIR"

printf '%s\n' '[NRO] Đang tải bộ mã nguồn public từ GitHub...'
if ! curl --http1.1 --fail --location --retry 5 --retry-all-errors --retry-delay 3 \
  --connect-timeout 30 --max-time 7200 --progress-bar "$REPO_ARCHIVE_URL" -o "$ARCHIVE"; then
  printf '%s\n' '[NRO][ERROR] Tải archive thất bại; source chưa bị thay đổi.' >&2
  exit 1
fi
gzip -t "$ARCHIVE" || { printf '%s\n' '[NRO][ERROR] Archive tải về không hoàn chỉnh.' >&2; exit 1; }
printf '%s\n' '[NRO] Đang giải nén và cập nhật mã nguồn...'
tar -xzf "$ARCHIVE" -C "$EXTRACT_DIR"
SOURCE_DIR="$(find "$EXTRACT_DIR" -mindepth 1 -maxdepth 1 -type d -print -quit)"
[ -n "$SOURCE_DIR" ] || { printf '%s\n' '[NRO][ERROR] Archive không hợp lệ.' >&2; exit 1; }
mkdir -p "$TARGET_DIR"
PRESERVE_DIR="$(mktemp -d "$TMP_ROOT/preserve.XXXXXX")"
[ -f "$TARGET_DIR/Config.properties" ] && cp -p "$TARGET_DIR/Config.properties" "$PRESERVE_DIR/Config.properties"
[ -f "$TARGET_DIR/panel/api/.env" ] && cp -p "$TARGET_DIR/panel/api/.env" "$PRESERVE_DIR/panel-api.env"
cp -a "$SOURCE_DIR"/. "$TARGET_DIR"/
[ -f "$PRESERVE_DIR/Config.properties" ] && cp -p "$PRESERVE_DIR/Config.properties" "$TARGET_DIR/Config.properties"
[ -f "$PRESERVE_DIR/panel-api.env" ] && cp -p "$PRESERVE_DIR/panel-api.env" "$TARGET_DIR/panel/api/.env"
REMOTE_SHA="$(curl -fsSL --http1.1 --connect-timeout 10 --max-time 30 \
  -H 'Accept: application/vnd.github+json' "$SOURCE_COMMIT_URL" 2>/dev/null \
  | sed -n 's/.*"sha"[[:space:]]*:[[:space:]]*"\([0-9a-fA-F]\{40\}\)".*/\1/p' | head -n 1 || true)"
if [[ "$REMOTE_SHA" =~ ^[0-9a-fA-F]{40}$ ]]; then
  mkdir -p "$TARGET_DIR/.runtime"
  printf '%s\n' "$REMOTE_SHA" > "$TARGET_DIR/.runtime/source-commit"
fi

cd "$TARGET_DIR"
exec bash nro.sh
