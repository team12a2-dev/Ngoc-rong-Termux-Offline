#!/usr/bin/env bash
set -Eeuo pipefail

INSTALL_DIR="${NRO_INSTALL_DIR:-$HOME/ngocrong-termux}"
ARCHIVE="${NRO_ARCHIVE:-$HOME/ngocrong-termux-runtime.tar.gz}"
RELEASE_URL="${NRO_RELEASE_URL:-https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/releases/download/termux-runtime-2026.08.25/ngocrong-termux-runtime.tar.gz}"
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

  if [ -f "$ARCHIVE" ] && gzip -t "$ARCHIVE" >/dev/null 2>&1; then
    echo "Gói runtime đã tải đủ, bỏ qua tải lại."
    return 0
  fi

  for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
    echo "Đang tải một file runtime trực tiếp (lần $attempt/$MAX_ATTEMPTS)..."
    : > "$INSTALL_LOG"

    if curl --http1.1 -fL -C - --retry 3 --retry-all-errors --retry-delay 5 \
        --connect-timeout 30 --max-time 7200 --progress-bar \
        -o "$ARCHIVE" "$RELEASE_URL" 2>"$INSTALL_LOG" \
        && gzip -t "$ARCHIVE" >/dev/null 2>&1; then
      echo "Tải runtime thành công."
      return 0
    fi

    if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
      echo "Kết nối bị ngắt; giữ file đã tải để tiếp tục sau 5 giây."
      sleep 5
    fi
  done

  echo "Không tải được file runtime hoàn chỉnh."
  echo "Log chi tiết: $INSTALL_LOG"
  tail -n 15 "$INSTALL_LOG" 2>/dev/null || true
  exit 1
}

if ! source_ready; then
  echo "Cài đặt trực tiếp; không dùng Git, không chia file và không tạo khóa SSH."
  download_runtime
  echo "Đang giải nén source/runtime..."
  tar -xzf "$ARCHIVE" --strip-components=1 -C "$INSTALL_DIR"
  rm -rf "$INSTALL_DIR/.git"
else
  echo "Source/runtime đã có sẵn, bỏ qua tải lại."
fi

cd "$INSTALL_DIR"
chmod +x ./*.sh
echo "Đã có đủ source. Bắt đầu setup server tự động..."
./nro.sh setup
