#!/usr/bin/env bash
# ========================================================================
# TOOL SETUP SERVER NGỌC RỒNG ONLINE — 1-CLICK ALL-IN-ONE (Linux / Termux)
# ========================================================================
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║ TOOL TỰ ĐỘNG KIỂM TRA & SETUP SERVER NGỌC RỒNG ONLINE (1-CLICK)            ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

if [ -f "$SCRIPT_DIR/nro.sh" ]; then
    chmod +x "$SCRIPT_DIR/nro.sh"
    echo "[*] Chạy quy trình chẩn đoán & setup tự động qua nro.sh..."
    exec "$SCRIPT_DIR/nro.sh" setup
else
    echo "[!] Không tìm thấy nro.sh trong thư mục dự án."
    exit 1
fi
