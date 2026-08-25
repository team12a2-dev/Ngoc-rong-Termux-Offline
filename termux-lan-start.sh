#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# Giữ CPU/network hoạt động trong lúc chạy server nếu Termux có lệnh này.
if command -v termux-wake-lock >/dev/null 2>&1; then
  termux-wake-lock >/dev/null 2>&1 || true
fi

export NRO_LAN_MODE=1
exec "$ROOT/nro.sh" lan
