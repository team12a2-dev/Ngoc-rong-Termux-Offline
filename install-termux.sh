#!/usr/bin/env bash
set -Eeuo pipefail

INSTALL_DIR="${NRO_INSTALL_DIR:-$HOME/ngocrong-termux}"
ARCHIVE="${NRO_ARCHIVE:-$HOME/ngocrong-termux-runtime.tar.gz}"
RELEASE_URL="${NRO_RELEASE_URL:-https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/archive/refs/heads/main.tar.gz}"
MAX_ATTEMPTS="${NRO_DOWNLOAD_ATTEMPTS:-8}"
INSTALL_LOG="${NRO_INSTALL_LOG:-$HOME/.ngocrong-termux-install.log}"
TMP_ROOT="${NRO_TMP_ROOT:-$HOME/.cache/ngocrong-termux}"
SOURCE_COMMIT_URL="${NRO_SOURCE_COMMIT_URL:-https://api.github.com/repos/team12a2-dev/Ngoc-rong-Termux-Offline/commits/main}"
DOWNLOAD_DIR=""
TEMP_ARCHIVE=""
PRESERVE_DIR=""
REMOTE_SHA=""

cleanup() {
  if [ -n "${DOWNLOAD_DIR:-}" ] && [ -d "$DOWNLOAD_DIR" ]; then
    rm -rf "$DOWNLOAD_DIR"
  fi
  if [ -n "${PRESERVE_DIR:-}" ] && [ -d "$PRESERVE_DIR" ]; then
    rm -rf "$PRESERVE_DIR"
  fi
}
trap cleanup EXIT

source_ready() {
  [ ! -d "$INSTALL_DIR/.git" ] \
    && [ -f "$INSTALL_DIR/nro.sh" ] \
    && [ -f "$INSTALL_DIR/data/map/tile_set_info" ]
}

check_storage() {
  mkdir -p "$TMP_ROOT" "$(dirname "$ARCHIVE")" "$(dirname "$INSTALL_LOG")"
  local probe="$TMP_ROOT/.write-test.$$"
  if ! printf '%s\n' ok > "$probe" 2>/dev/null; then
    echo "[NRO][ERROR] Không ghi được vào thư mục tạm: $TMP_ROOT" >&2
    echo "[NRO][ERROR] Hãy kiểm tra quyền ghi và dung lượng bộ nhớ trong Termux." >&2
    exit 1
  fi
  rm -f "$probe"
  local free_kb
  free_kb="$(df -Pk "$TMP_ROOT" | awk 'NR==2 {print $4}')"
  if [[ "$free_kb" =~ ^[0-9]+$ ]] && [ "$free_kb" -lt "${NRO_MIN_FREE_KB:-131072}" ]; then
    echo "[NRO][ERROR] Bộ nhớ trống quá thấp: ${free_kb}KB tại $TMP_ROOT" >&2
    echo "[NRO][ERROR] Cần tối thiểu khoảng 128MB trống để tải và giải nén source." >&2
    exit 1
  fi
}
prepare_install_dir() {
  check_storage
  if [ -e "$INSTALL_DIR" ] && ! source_ready; then
    local backup_dir="${INSTALL_DIR}.incomplete.$(date +%Y%m%d-%H%M%S)"
    mv "$INSTALL_DIR" "$backup_dir"
    echo "Đã giữ bản cài đặt dở tại: $backup_dir"
  fi
  mkdir -p "$INSTALL_DIR"
  # Do not use leftover files from the previous chunk downloader.
  rm -rf "${ARCHIVE}.parts" "${ARCHIVE}.assembling"
}

download_runtime() {
  prepare_install_dir
  DOWNLOAD_DIR="$(mktemp -d "$TMP_ROOT/download.XXXXXX")"
  TEMP_ARCHIVE="$DOWNLOAD_DIR/source.tar.gz"
  local download_url="$RELEASE_URL"
  case "$download_url" in
    *\?*) download_url="${download_url}&nocache=$(date +%s)" ;;
    *) download_url="${download_url}?nocache=$(date +%s)" ;;
  esac

  for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
    echo "Đang tải mã nguồn panel/game mới nhất trực tiếp (lần $attempt/$MAX_ATTEMPTS)..."
    : > "$INSTALL_LOG"
    rm -f "$TEMP_ARCHIVE"

    if curl --http1.1 -fL --retry 3 --retry-all-errors --retry-delay 5 \
        --connect-timeout 30 --max-time 7200 --progress-bar \
        -o "$TEMP_ARCHIVE" "$download_url" 2>"$INSTALL_LOG" \
        && gzip -t "$TEMP_ARCHIVE" >/dev/null 2>&1; then
      mv -f "$TEMP_ARCHIVE" "$ARCHIVE"
      echo "Tải mã nguồn mới thành công."
      return 0
    fi

    rm -f "$TEMP_ARCHIVE"
    if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
      echo "Kết nối bị ngắt; thử tải lại sau 5 giây."
      sleep 5
    fi
  done

  echo "Không tải được file runtime hoàn chỉnh."
  echo "Log chi tiết: $INSTALL_LOG"
  tail -n 15 "$INSTALL_LOG" 2>/dev/null || true
  exit 1
}

if source_ready; then
  echo "Đã phát hiện source/runtime hiện tại; cập nhật bằng archive main mới nhất."
else
  echo "Cài đặt trực tiếp; không dùng Git, không chia file và không tạo khóa SSH."
fi
download_runtime
echo "Đang giải nén source/runtime mới..."
PRESERVE_DIR="$(mktemp -d "$TMP_ROOT/preserve.XXXXXX")"
[ -f "$INSTALL_DIR/Config.properties" ] && cp -p "$INSTALL_DIR/Config.properties" "$PRESERVE_DIR/Config.properties"
[ -f "$INSTALL_DIR/panel/api/.env" ] && cp -p "$INSTALL_DIR/panel/api/.env" "$PRESERVE_DIR/panel-api.env"
tar -xzf "$ARCHIVE" --strip-components=1 -C "$INSTALL_DIR"
rm -rf "$INSTALL_DIR/.git"
[ -f "$PRESERVE_DIR/Config.properties" ] && cp -p "$PRESERVE_DIR/Config.properties" "$INSTALL_DIR/Config.properties"
[ -f "$PRESERVE_DIR/panel-api.env" ] && cp -p "$PRESERVE_DIR/panel-api.env" "$INSTALL_DIR/panel/api/.env"
REMOTE_SHA="$(curl -fsSL --http1.1 --connect-timeout 10 --max-time 30 \
  -H 'Accept: application/vnd.github+json' "$SOURCE_COMMIT_URL" 2>/dev/null \
  | sed -n 's/.*"sha"[[:space:]]*:[[:space:]]*"\([0-9a-fA-F]\{40\}\)".*/\1/p' | head -n 1 || true)"
if [[ "$REMOTE_SHA" =~ ^[0-9a-fA-F]{40}$ ]]; then
  mkdir -p "$INSTALL_DIR/.runtime"
  printf '%s\n' "$REMOTE_SHA" > "$INSTALL_DIR/.runtime/source-commit"
fi

cd "$INSTALL_DIR"
chmod +x ./*.sh
echo "Đã có đủ source. Bắt đầu setup server tự động..."
./nro.sh setup
