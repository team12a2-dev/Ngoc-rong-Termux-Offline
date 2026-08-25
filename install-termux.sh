#!/usr/bin/env bash
set -Eeuo pipefail

INSTALL_DIR="${NRO_INSTALL_DIR:-$HOME/ngocrong-termux}"
REPO_URL="${NRO_REPO_URL:-https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline.git}"
BRANCH="${NRO_BRANCH:-main}"
MAX_ATTEMPTS="${NRO_DOWNLOAD_ATTEMPTS:-5}"

prepare_existing_dir() {
  if [ -e "$INSTALL_DIR" ] && [ ! -d "$INSTALL_DIR/.git" ]; then
    local backup_dir="${INSTALL_DIR}.incomplete.$(date +%Y%m%d-%H%M%S)"
    mv "$INSTALL_DIR" "$backup_dir"
    echo "Đã giữ bản cài đặt dở tại: $backup_dir"
  fi
}

clone_or_update() {
  if [ -d "$INSTALL_DIR/.git" ] && git -C "$INSTALL_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Phát hiện bản clone dở, tiếp tục tải từ đó..."
    git -C "$INSTALL_DIR" -c http.version=HTTP/1.1 fetch --depth 1 origin "$BRANCH"
    git -C "$INSTALL_DIR" checkout -B "$BRANCH" "origin/$BRANCH"
    git -C "$INSTALL_DIR" reset --hard "origin/$BRANCH"
    return 0
  fi

  for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
    echo "Tải source lần $attempt/$MAX_ATTEMPTS"
    if [ -d "$INSTALL_DIR/.git" ] && git -C "$INSTALL_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
      if git -C "$INSTALL_DIR" -c http.version=HTTP/1.1 fetch --depth 1 origin "$BRANCH" \
          && git -C "$INSTALL_DIR" checkout -B "$BRANCH" "origin/$BRANCH" \
          && git -C "$INSTALL_DIR" reset --hard "origin/$BRANCH"; then
        return 0
      fi
    else
      prepare_existing_dir
      if git -c http.version=HTTP/1.1 \
          -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=120 \
          clone --depth 1 --filter=blob:none --single-branch \
          --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"; then
        return 0
      fi
    fi

    if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
      echo "Kết nối bị ngắt; sẽ thử lại sau 5 giây."
      sleep 5
    fi
  done

  echo "Không tải được source. Hãy kiểm tra Wi‑Fi/4G rồi chạy lại installer."
  exit 1
}

echo "Thư mục cài đặt: $INSTALL_DIR"
echo "Đang tải bằng Git partial clone; không dùng archive tar.gz."
clone_or_update

cd "$INSTALL_DIR"
chmod +x ./*.sh
./nro.sh setup
