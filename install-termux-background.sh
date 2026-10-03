#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOOT_DIR="$HOME/.termux/boot"
BOOT_FILE="$BOOT_DIR/ngocrong-lan"
SERVICE="$ROOT/termux-server-service.sh"

mkdir -p "$BOOT_DIR"
chmod +x "$SERVICE" "$ROOT/nro.sh"

cat > "$BOOT_FILE" <<EOF
#!/usr/bin/env bash
set -Eeuo pipefail
cd "$ROOT"
export NRO_LAN_MODE=1
exec "$SERVICE" start
EOF
chmod +x "$BOOT_FILE"

printf '\n[NRO] Đã cài Termux:Boot hook: %s\n' "$BOOT_FILE"
printf '%s\n' '[NRO] Cài ứng dụng Termux:Boot, sau đó khởi động lại Android để tự kiểm tra.'
printf '%s\n' '[NRO] Nếu muốn chạy ngay không cần reboot: ./termux-server-service.sh start'
