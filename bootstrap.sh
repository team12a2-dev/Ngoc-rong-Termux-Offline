#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

REPO_ARCHIVE_URL="${NRO_ARCHIVE_URL:-https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/archive/refs/heads/main.tar.gz}"
TARGET_DIR="${NRO_TARGET_DIR:-$HOME/ngocrong-termux}"
TMP_DIR=""

cleanup() {
  if [ -n "${TMP_DIR:-}" ] && [ -d "$TMP_DIR" ]; then
    rm -rf "$TMP_DIR"
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

TMP_DIR="$(mktemp -d)"
ARCHIVE="$TMP_DIR/ngocrong-termux.tar.gz"
EXTRACT_DIR="$TMP_DIR/extracted"
mkdir -p "$EXTRACT_DIR"

printf '%s\n' '[NRO] Đang tải bộ mã nguồn public từ GitHub...'
curl --fail --location --retry 3 --retry-delay 2 --progress-bar "$REPO_ARCHIVE_URL" -o "$ARCHIVE"
printf '%s\n' '[NRO] Đang giải nén và cập nhật mã nguồn...'
tar -xzf "$ARCHIVE" -C "$EXTRACT_DIR"
SOURCE_DIR="$(find "$EXTRACT_DIR" -mindepth 1 -maxdepth 1 -type d -print -quit)"
[ -n "$SOURCE_DIR" ] || { printf '%s\n' '[NRO][ERROR] Archive không hợp lệ.' >&2; exit 1; }
mkdir -p "$TARGET_DIR"
cp -a "$SOURCE_DIR"/. "$TARGET_DIR"/

cd "$TARGET_DIR"
exec bash nro.sh
