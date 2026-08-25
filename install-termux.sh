#!/usr/bin/env bash
set -Eeuo pipefail

INSTALL_DIR="${NRO_INSTALL_DIR:-$HOME/ngocrong-termux}"
REPO_URL="${NRO_REPO_URL:-https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/archive/refs/heads/main.tar.gz}"
TMP_DIR="$(mktemp -d)"
ARCHIVE="$TMP_DIR/ngocrong.tar.gz"
MAX_ATTEMPTS="${NRO_DOWNLOAD_ATTEMPTS:-5}"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

mkdir -p "$INSTALL_DIR"

echo "Thư mục cài đặt: $INSTALL_DIR"
echo "Đang tải source; repository có thể lớn nên hãy giữ kết nối mạng ổn định."

DOWNLOAD_OK=0
for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  rm -f "$ARCHIVE"
  echo "Lần tải $attempt/$MAX_ATTEMPTS"

  if curl --http1.1 -fL --retry 3 --retry-all-errors --retry-delay 3 \
      --connect-timeout 20 --max-time 1800 -o "$ARCHIVE" "$REPO_URL" \
      && test -s "$ARCHIVE" \
      && tar -tzf "$ARCHIVE" >/dev/null 2>&1; then
    DOWNLOAD_OK=1
    break
  fi

  if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
    echo "Archive chưa hoàn chỉnh; sẽ tải lại sau 5 giây."
    sleep 5
  fi
done

if [ "$DOWNLOAD_OK" -ne 1 ]; then
  echo "Không tải được archive hoàn chỉnh. Hãy kiểm tra Wi‑Fi/4G rồi chạy lại installer."
  exit 1
fi

echo "Archive hợp lệ, bắt đầu giải nén..."
tar -xzf "$ARCHIVE" --strip-components=1 -C "$INSTALL_DIR"
cd "$INSTALL_DIR"
chmod +x ./*.sh

./nro.sh setup
