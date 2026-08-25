#!/usr/bin/env bash
set -Eeuo pipefail

INSTALL_DIR="${NRO_INSTALL_DIR:-$HOME/ngocrong-termux}"
ARCHIVE="${NRO_ARCHIVE:-$HOME/ngocrong-termux-runtime.tar.gz}"
RELEASE_URL="${NRO_RELEASE_URL:-https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/releases/download/termux-runtime-2026.08.25/ngocrong-termux-runtime.tar.gz}"
MAX_ATTEMPTS="${NRO_DOWNLOAD_ATTEMPTS:-8}"
INSTALL_LOG="${NRO_INSTALL_LOG:-$HOME/.ngocrong-termux-install.log}"

source_ready() {
  [ -f "$INSTALL_DIR/nro.sh" ] && [ -f "$INSTALL_DIR/data/map/tile_set_info" ]
}

download_runtime() {
  mkdir -p "$(dirname "$ARCHIVE")" "$(dirname "$INSTALL_LOG")"

  for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
    echo "Đang tải gói runtime (lần $attempt/$MAX_ATTEMPTS)..."
    : > "$INSTALL_LOG"

    if curl --http1.1 -fL -C - --retry 3 --retry-all-errors --retry-delay 5 \
        --connect-timeout 30 --max-time 7200 --progress-bar \
        -o "$ARCHIVE" "$RELEASE_URL" >"$INSTALL_LOG" 2>&1 \
        && test -s "$ARCHIVE" \
        && tar -tzf "$ARCHIVE" >/dev/null 2>&1; then
      echo "Tải gói runtime thành công."
      return 0
    fi

    if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
      echo "Kết nối bị ngắt; file đã tải được giữ lại để tiếp tục. Thử lại sau 5 giây."
      sleep 5
    fi
  done

  echo "Không tải được gói runtime hoàn chỉnh."
  echo "Log chi tiết: $INSTALL_LOG"
  tail -n 15 "$INSTALL_LOG" 2>/dev/null || true
  exit 1
}

if ! source_ready; then
  echo "Đang tải gói runtime trực tiếp; không dùng Git và không tải Git history."
  download_runtime
  mkdir -p "$INSTALL_DIR"
  echo "Đang giải nén source/runtime..."
  tar -xzf "$ARCHIVE" --strip-components=1 -C "$INSTALL_DIR"
else
  echo "Source/runtime đã có sẵn, bỏ qua tải lại."
fi

cd "$INSTALL_DIR"
chmod +x ./*.sh
echo "Đã có đủ source. Bắt đầu setup server tự động..."
./nro.sh setup
