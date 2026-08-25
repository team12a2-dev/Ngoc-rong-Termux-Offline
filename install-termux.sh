#!/usr/bin/env bash
set -Eeuo pipefail

INSTALL_DIR="${NRO_INSTALL_DIR:-$HOME/ngocrong-termux}"
ARCHIVE="${NRO_ARCHIVE:-$HOME/ngocrong-termux-runtime.tar.gz}"
RELEASE_URL="${NRO_RELEASE_URL:-https://github.com/team12a2-dev/Ngoc-rong-Termux-Offline/releases/download/termux-runtime-2026.08.25/ngocrong-termux-runtime.tar.gz}"
MAX_ATTEMPTS="${NRO_DOWNLOAD_ATTEMPTS:-5}"
PARALLEL="${NRO_DOWNLOAD_PARALLEL:-4}"
CHUNK_SIZE="${NRO_CHUNK_SIZE:-67108864}"
INSTALL_LOG="${NRO_INSTALL_LOG:-$HOME/.ngocrong-termux-install.log}"
PART_DIR="${ARCHIVE}.parts"

source_ready() {
  [ -f "$INSTALL_DIR/nro.sh" ] && [ -f "$INSTALL_DIR/data/map/tile_set_info" ]
}

remote_size() {
  curl --http1.1 -fsSL --max-time 60 -r 0-0 -D - -o /dev/null "$RELEASE_URL" 2>/dev/null \
    | awk 'tolower($1)=="content-range:" {split($3,a,"/"); gsub(/\r/,"",a[2]); print a[2]}' | tail -1
}

download_part() {
  local index="$1" start="$2" end="$3" expected="$4"
  local part="$PART_DIR/part-$index" temp="$PART_DIR/part-$index.tmp"
  local current

  current=0
  [ -f "$part" ] && current="$(wc -c < "$part")"
  [ "$current" -eq "$expected" ] && return 0
  rm -f "$temp"

  for retry in 1 2 3 4 5; do
    if curl --http1.1 -fsSL --retry 3 --retry-all-errors --retry-delay 3 \
        --connect-timeout 30 --max-time 1800 --silent --show-error \
        -r "$start-$end" -o "$temp" "$RELEASE_URL" >>"$INSTALL_LOG" 2>&1 \
        && [ "$(wc -c < "$temp")" -eq "$expected" ]; then
      mv -f "$temp" "$part"
      return 0
    fi
    rm -f "$temp"
    sleep 2
  done
  return 1
}

download_runtime() {
  local total="$1"
  local total_parts=$(( (total + CHUNK_SIZE - 1) / CHUNK_SIZE ))
  local batch_start batch_end index start end expected
  local failed=0
  mkdir -p "$PART_DIR" "$(dirname "$INSTALL_LOG")"

  echo "Gói runtime: $((total / 1024 / 1024)) MiB; chia thành $total_parts phần, tải song song $PARALLEL luồng."
  : > "$INSTALL_LOG"

  batch_start=0
  while [ "$batch_start" -lt "$total_parts" ]; do
    batch_end=$((batch_start + PARALLEL))
    [ "$batch_end" -gt "$total_parts" ] && batch_end="$total_parts"
    local pids=()

    for ((index=batch_start; index<batch_end; index++)); do
      start=$((index * CHUNK_SIZE))
      end=$((start + CHUNK_SIZE - 1))
      [ "$end" -ge "$total" ] && end=$((total - 1))
      expected=$((end - start + 1))
      download_part "$index" "$start" "$end" "$expected" &
      pids+=("$!")
    done

    failed=0
    for pid in "${pids[@]}"; do
      wait "$pid" || failed=1
    done
    [ "$failed" -eq 0 ] || return 1

    echo "Đã tải phần $batch_end/$total_parts."
    batch_start="$batch_end"
  done

  local assembled="${ARCHIVE}.assembling"
  rm -f "$assembled"
  : > "$assembled"
  for ((index=0; index<total_parts; index++)); do
    cat "$PART_DIR/part-$index" >> "$assembled"
  done
  mv -f "$assembled" "$ARCHIVE"
  if ! gzip -t "$ARCHIVE" >/dev/null 2>&1; then
    rm -rf "$PART_DIR" "$ARCHIVE"
    return 1
  fi
  rm -rf "$PART_DIR"
}

prepare_existing_install() {
  if [ -e "$INSTALL_DIR" ] && ! source_ready; then
    local backup_dir="${INSTALL_DIR}.incomplete.$(date +%Y%m%d-%H%M%S)"
    mv "$INSTALL_DIR" "$backup_dir"
    echo "Đã giữ bản cài đặt dở tại: $backup_dir"
  fi
  mkdir -p "$INSTALL_DIR"
}

install_runtime() {
  local total
  total="$(remote_size)"
  [[ "$total" =~ ^[0-9]+$ ]] || { echo "Không lấy được kích thước gói runtime."; exit 1; }

  for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
    echo "Tải runtime (lần $attempt/$MAX_ATTEMPTS)..."
    if download_runtime "$total"; then
      return 0
    fi
    if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
      echo "Mạng bị ngắt; giữ các phần đã tải và thử lại sau 5 giây."
      sleep 5
    fi
  done

  echo "Không tải được gói runtime. Log: $INSTALL_LOG"
  tail -n 15 "$INSTALL_LOG" 2>/dev/null || true
  exit 1
}

if ! source_ready; then
  echo "Tải gói runtime trực tiếp; không dùng Git và không tạo khóa SSH."
  prepare_existing_install
  install_runtime
  echo "Đang giải nén source/runtime..."
  tar -xzf "$ARCHIVE" --strip-components=1 -C "$INSTALL_DIR"
else
  echo "Source/runtime đã có sẵn, bỏ qua tải lại."
fi

cd "$INSTALL_DIR"
chmod +x ./*.sh
echo "Đã có đủ source. Bắt đầu setup server tự động..."
./nro.sh setup
