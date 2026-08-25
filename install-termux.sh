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
  mkdir -p "$(dirname "$INSTALL_DIR")"
}

clone_repository() {
  prepare_directory
  [ -d "$INSTALL_DIR/.git" ] && return 0

  for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
    echo "Chuẩn bị Git partial clone (lần $attempt/$MAX_ATTEMPTS)..."
    : > "$INSTALL_LOG"
    if GIT_TERMINAL_PROMPT=0 git -c http.version=HTTP/1.1 \
        -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=120 \
        clone --depth 1 --filter=blob:none --no-checkout --no-tags \
        --single-branch --branch "$BRANCH" --quiet "$REPO_URL" "$INSTALL_DIR" \
        >"$INSTALL_LOG" 2>&1; then
      return 0
    fi

    if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
      echo "Kết nối bị ngắt; giữ lại phần đã nhận và thử lại sau 5 giây."
      sleep 5
    fi
  done

  echo "Không tạo được Git partial clone. Log: $INSTALL_LOG"
  tail -n 12 "$INSTALL_LOG" 2>/dev/null || true
  exit 1
}

checkout_repository() {
  for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
    echo "Đang tải file source/runtime (lần $attempt/$MAX_ATTEMPTS)..."
    : > "$INSTALL_LOG"
    if GIT_TERMINAL_PROMPT=0 git -C "$INSTALL_DIR" \
        -c http.version=HTTP/1.1 \
        -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=120 \
        fetch --depth 1 --filter=blob:none --no-tags --quiet origin \
        "refs/heads/$BRANCH:refs/remotes/origin/$BRANCH" \
        >"$INSTALL_LOG" 2>&1 \
        && git -C "$INSTALL_DIR" checkout -q -B "$BRANCH" "origin/$BRANCH" \
        && git -C "$INSTALL_DIR" reset --hard -q "origin/$BRANCH"; then
      return 0
    fi

    if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
      echo "Mạng bị ngắt; các object đã nhận được giữ lại. Thử lại sau 5 giây."
      sleep 5
    fi
  done

  echo "Không tải đủ source/runtime. Log: $INSTALL_LOG"
  tail -n 12 "$INSTALL_LOG" 2>/dev/null || true
  exit 1
}

echo "Thư mục cài đặt: $INSTALL_DIR"
echo "Bước 1/2: tải metadata Git tối thiểu trước."
clone_repository
echo "Bước 2/2: tải file cần cho server; log Git được lưu riêng."
checkout_repository

cd "$INSTALL_DIR"
chmod +x ./*.sh
echo "Đã tải source. Bắt đầu setup server tự động..."
./nro.sh setup
