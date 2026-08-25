#!/usr/bin/env bash
set -Eeuo pipefail

INSTALL_DIR="${NRO_INSTALL_DIR:-$HOME/ngocrong-termux}"
REPO_URL="${NRO_REPO_URL:-https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline.git}"
BRANCH="${NRO_BRANCH:-main}"
MAX_ATTEMPTS="${NRO_DOWNLOAD_ATTEMPTS:-5}"
INSTALL_LOG="${NRO_INSTALL_LOG:-$HOME/.ngocrong-termux-install.log}"

prepare_directory() {
  if [ -e "$INSTALL_DIR" ] && [ ! -d "$INSTALL_DIR/.git" ]; then
    local backup_dir="${INSTALL_DIR}.incomplete.$(date +%Y%m%d-%H%M%S)"
    mv "$INSTALL_DIR" "$backup_dir"
    echo "Đã giữ bản cài đặt dở tại: $backup_dir"
  fi
  mkdir -p "$INSTALL_DIR"
}

setup_repository() {
  prepare_directory
  if ! git -C "$INSTALL_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git -C "$INSTALL_DIR" init -q -b "$BRANCH"
  fi
  git -C "$INSTALL_DIR" remote set-url origin "$REPO_URL" 2>/dev/null || \
    git -C "$INSTALL_DIR" remote add origin "$REPO_URL"
}

fetch_repository() {
  mkdir -p "$(dirname "$INSTALL_LOG")"
  setup_repository

  for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
    echo "Đang tải source (lần $attempt/$MAX_ATTEMPTS)..."
    : > "$INSTALL_LOG"

    if git -C "$INSTALL_DIR" \
        -c http.version=HTTP/1.1 \
        -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=120 \
        fetch --depth 1 --filter=blob:none --no-tags --quiet origin \
        "refs/heads/$BRANCH:refs/remotes/origin/$BRANCH" \
        >"$INSTALL_LOG" 2>&1 \
        && git -C "$INSTALL_DIR" checkout -q -B "$BRANCH" "origin/$BRANCH" \
        && git -C "$INSTALL_DIR" reset --hard -q "origin/$BRANCH"; then
      echo "Tải source thành công."
      return 0
    fi

    if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
      echo "Mạng bị ngắt; dữ liệu đã nhận được giữ lại. Thử lại sau 5 giây."
      sleep 5
    fi
  done

  echo "Không tải đủ source sau $MAX_ATTEMPTS lần thử."
  echo "Log chi tiết: $INSTALL_LOG"
  tail -n 12 "$INSTALL_LOG" 2>/dev/null || true
  exit 1
}

echo "Thư mục cài đặt: $INSTALL_DIR"
echo "Đang tải source tối ưu; log Git được lưu riêng."
fetch_repository

cd "$INSTALL_DIR"
chmod +x ./*.sh
echo "Đã tải source. Bắt đầu setup server tự động..."
./nro.sh setup
