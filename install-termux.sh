#!/usr/bin/env bash
set -Eeuo pipefail

INSTALL_DIR="${NRO_INSTALL_DIR:-$HOME/ngocrong-termux}"
ARCHIVE="${NRO_ARCHIVE:-$HOME/ngocrong-termux-runtime.tar.gz}"
RELEASE_URL="${NRO_RELEASE_URL:-https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/archive/refs/heads/main.tar.gz}"
MAX_ATTEMPTS="${NRO_DOWNLOAD_ATTEMPTS:-8}"
INSTALL_LOG="${NRO_INSTALL_LOG:-$HOME/.ngocrong-termux-install.log}"

source_ready() {
  [ ! -d "$INSTALL_DIR/.git" ] \
    && [ -f "$INSTALL_DIR/nro.sh" ] \
    && [ -f "$INSTALL_DIR/data/map/tile_set_info" ]
}

prepare_install_dir() {
  if [ -e "$INSTALL_DIR" ] && ! source_ready; then
    local backup_dir="${INSTALL_DIR}.incomplete.$(date +%Y%m%d-%H%M%S)"
    mv "$INSTALL_DIR" "$backup_dir"
    echo "Đã giữ bản cài đặt dở tại: $backup_dir"
  fi
  mkdir -p "$INSTALL_DIR" "$(dirname "$ARCHIVE")" "$(dirname "$INSTALL_LOG")"
  # Do not use leftover files from the previous chunk downloader.
  rm -rf "${ARCHIVE}.parts" "${ARCHIVE}.assembling"
}

download_runtime() {
  prepare_install_dir
  local download_url="$RELEASE_URL"
  local temp_archive="${ARCHIVE}.download.$$"
  case "$download_url" in
    *\?*) download_url="${download_url}&nocache=$(date +%s)" ;;
    *) download_url="${download_url}?nocache=$(date +%s)" ;;
  esac

  for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
    echo "Đang tải mã nguồn panel/game mới nhất trực tiếp (lần $attempt/$MAX_ATTEMPTS)..."
    : > "$INSTALL_LOG"
    rm -f "$temp_archive"

    if curl --http1.1 -fL --retry 3 --retry-all-errors --retry-delay 5 \
        --connect-timeout 30 --max-time 7200 --progress-bar \
        -o "$temp_archive" "$download_url" 2>"$INSTALL_LOG" \
        && gzip -t "$temp_archive" >/dev/null 2>&1; then
      mv -f "$temp_archive" "$ARCHIVE"
      echo "Tải mã nguồn mới thành công."
      return 0
    fi

    rm -f "$temp_archive"
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
tar -xzf "$ARCHIVE" --strip-components=1 -C "$INSTALL_DIR"
rm -rf "$INSTALL_DIR/.git"

cd "$INSTALL_DIR"
chmod +x ./*.sh
echo "Đã có đủ source. Bắt đầu setup server tự động..."
./nro.sh setup
