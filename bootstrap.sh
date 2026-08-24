#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

REPO_URL="${NRO_REPO_URL:-https://github.com/team12a2-dev/ngocrong-termux-server.git}"
TARGET_DIR="${NRO_TARGET_DIR:-$HOME/ngocrong-termux}"

if ! command -v pkg >/dev/null 2>&1; then
  printf '%s\n' '[NRO][ERROR] Hãy chạy lệnh này trong Termux.' >&2
  exit 1
fi

pkg update -y
pkg install -y git
if [ -e "$TARGET_DIR/.git" ]; then
  git -C "$TARGET_DIR" pull --ff-only
else
  git clone "$REPO_URL" "$TARGET_DIR"
fi
cd "$TARGET_DIR"
exec bash nro.sh
