#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_DIR="${NRO_STATE_DIR:-$ROOT/.runtime}"
SUPERVISOR_PID="$STATE_DIR/supervisor.pid"
SUPERVISOR_LOG="$STATE_DIR/supervisor.log"
STOP_MARKER="$STATE_DIR/supervisor.stop"
RUN_LOCK="$STATE_DIR/supervisor.lock"
RESTART_DELAY="${NRO_RESTART_DELAY_SEC:-10}"

mkdir -p "$STATE_DIR"

say() { printf '[NRO-SERVICE] %s\n' "$*"; }
warn() { printf '[NRO-SERVICE][WARN] %s\n' "$*" >&2; }

pid_alive() {
  [ -n "${1:-}" ] && kill -0 "$1" 2>/dev/null
}

read_pid() {
  [ -f "$SUPERVISOR_PID" ] && tr -d '[:space:]' < "$SUPERVISOR_PID" || true
}

service_alive() {
  pid_alive "$(read_pid)"
}

keep_awake() {
  if command -v termux-wake-lock >/dev/null 2>&1; then
    termux-wake-lock >/dev/null 2>&1 || true
  fi
}

run_loop() {
  # Chống hai supervisor cùng chạy nếu người dùng bấm start nhiều lần.
  if ! mkdir "$RUN_LOCK" 2>/dev/null; then
    warn "Supervisor khác đang chạy hoặc lock chưa được giải phóng."
    exit 0
  fi
  trap 'rm -rf "$RUN_LOCK"; rm -f "$SUPERVISOR_PID"' EXIT
  printf '%s\n' "$$" > "$SUPERVISOR_PID"
  rm -f "$STOP_MARKER"
  keep_awake
  say "Supervisor started (pid $$), game sẽ chạy tách khỏi terminal."

  while [ ! -f "$STOP_MARKER" ]; do
    say "Đảm bảo game server + panel đang chạy..."
    if ! (cd "$ROOT" && NRO_LAN_MODE=1 bash "$ROOT/nro.sh" lan); then
      warn "Launcher kết thúc hoặc gặp lỗi; sẽ thử khởi động lại sau ${RESTART_DELAY}s."
    else
      say "Launcher đã trả về; kiểm tra lại tiến trình sau ${RESTART_DELAY}s."
    fi
    [ -f "$STOP_MARKER" ] && break
    sleep "$RESTART_DELAY"
    keep_awake
  done
  say "Supervisor stopped."
}

start_service() {
  if service_alive; then
    say "Đang chạy với PID $(read_pid)."
    return 0
  fi
  rm -f "$STOP_MARKER"
  rm -rf "$RUN_LOCK"
  local child
  if command -v setsid >/dev/null 2>&1; then
    nohup setsid bash "$0" run >> "$SUPERVISOR_LOG" 2>&1 < /dev/null &
  else
    nohup bash "$0" run >> "$SUPERVISOR_LOG" 2>&1 < /dev/null &
  fi
  child="$!"
  printf '%s\n' "$child" > "$SUPERVISOR_PID"
  disown "$child" 2>/dev/null || true
  say "Đã tách supervisor khỏi terminal (PID $child)."
  say "Log: $SUPERVISOR_LOG"
}

stop_service() {
  touch "$STOP_MARKER"
  local pid
  pid="$(read_pid)"
  if pid_alive "$pid"; then
    kill "$pid" 2>/dev/null || true
    for _ in $(seq 1 20); do
      pid_alive "$pid" || break
      sleep 1
    done
    kill -9 "$pid" 2>/dev/null || true
  fi
  # Dừng các tiến trình con qua launcher; không xóa database.
  (cd "$ROOT" && bash "$ROOT/nro.sh" stop) >> "$SUPERVISOR_LOG" 2>&1 || true
  rm -f "$SUPERVISOR_PID" "$STOP_MARKER"
  rm -rf "$RUN_LOCK"
  if command -v termux-wake-unlock >/dev/null 2>&1; then
    termux-wake-unlock >/dev/null 2>&1 || true
  fi
  say "Đã dừng service game/panel."
}

status_service() {
  if service_alive; then
    say "Supervisor: RUNNING (PID $(read_pid))"
  else
    say "Supervisor: STOPPED"
  fi
  (cd "$ROOT" && bash "$ROOT/nro.sh" status) || true
  say "Supervisor log: $SUPERVISOR_LOG"
}

case "${1:-status}" in
  start) start_service ;;
  stop) stop_service ;;
  restart) stop_service; start_service ;;
  status) status_service ;;
  log) touch "$SUPERVISOR_LOG"; tail -n "${2:-120}" -f "$SUPERVISOR_LOG" ;;
  run) run_loop ;;
  *)
    printf '%s\n' "Usage: $0 {start|stop|restart|status|log [lines]}"
    exit 2
    ;;
esac
