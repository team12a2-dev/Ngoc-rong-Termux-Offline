#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail
umask 077

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_DIR="${NRO_STATE_DIR:-$ROOT/.runtime}"
CONFIG="$ROOT/Config.properties"
DB_RUN_DIR="${NRO_DB_RUN_DIR:-${PREFIX:-$HOME}/var/run/mysqld}"
DB_SOCKET="${NRO_DB_SOCKET:-$DB_RUN_DIR/mysqld.sock}"
BACKUP_DIR="${NRO_BACKUP_DIR:-$STATE_DIR/backups}"
LOG_FILE="${NRO_BACKUP_LOG:-$STATE_DIR/backup.log}"
BACKUP_CONFIG="${NRO_BACKUP_CONFIG:-$STATE_DIR/backup.conf}"
CONFIG_KEEP_DAYS="$(awk -F= '$1 == "NRO_BACKUP_KEEP_DAYS" {sub(/^[^=]*=/, ""); print; exit}' "$BACKUP_CONFIG" 2>/dev/null || true)"
KEEP_DAYS="${NRO_BACKUP_KEEP_DAYS:-${CONFIG_KEEP_DAYS:-7}}"

prop() {
  local key="$1"
  awk -F= -v k="$key" '$1 == k {sub(/^[^=]*=/, ""); print; exit}' "$CONFIG" 2>/dev/null || true
}

DB_NAME="${NRO_DB_NAME:-$(prop database.name)}"
DB_NAME="${DB_NAME:-ngocrong}"
LOCK_DIR="$STATE_DIR/backup.lock"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="$BACKUP_DIR/${DB_NAME}-${STAMP}.sql.gz"
TMP_FILE="$OUT_FILE.tmp.$$"

case "$DB_NAME" in
  *[!a-zA-Z0-9_]*|'')
    printf '[NRO][BACKUP][ERROR] Tên database không hợp lệ: %s\n' "$DB_NAME" >&2
    exit 1
    ;;
esac
case "$KEEP_DAYS" in
  ''|*[!0-9]*)
    printf '[NRO][BACKUP][ERROR] NRO_BACKUP_KEEP_DAYS phải là số nguyên không âm.\n' >&2
    exit 1
    ;;
esac

mkdir -p "$STATE_DIR" "$BACKUP_DIR"
exec >> "$LOG_FILE" 2>&1

cleanup() {
  rm -f "$TMP_FILE"
  rmdir "$LOCK_DIR" 2>/dev/null || true
}
trap cleanup EXIT

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  printf '[%s] Bỏ qua: một phiên backup khác đang chạy.\n' "$(date '+%F %T')"
  exit 0
fi

printf '[%s] Bắt đầu xuất database %s khi dịch vụ đang vận hành.\n' "$(date '+%F %T')" "$DB_NAME"

if ! command -v mariadb-admin >/dev/null 2>&1 || ! mariadb-admin --protocol=socket --socket="$DB_SOCKET" -uroot ping >/dev/null 2>&1; then
  printf '[%s] MariaDB chưa sẵn sàng tại socket %s; backup thất bại.\n' "$(date '+%F %T')" "$DB_SOCKET"
  exit 1
fi

if command -v mariadb-dump >/dev/null 2>&1; then
  DUMP_BIN="$(command -v mariadb-dump)"
elif command -v mysqldump >/dev/null 2>&1; then
  DUMP_BIN="$(command -v mysqldump)"
else
  printf '[%s] Không tìm thấy mariadb-dump hoặc mysqldump.\n' "$(date '+%F %T')"
  exit 1
fi

# --single-transaction giúp chụp snapshot nhất quán cho bảng InnoDB mà không dừng game.
"$DUMP_BIN" \
  --protocol=socket \
  --socket="$DB_SOCKET" \
  --single-transaction \
  --quick \
  --routines \
  --events \
  --triggers \
  --hex-blob \
  -uroot "$DB_NAME" | gzip -c > "$TMP_FILE"

test -s "$TMP_FILE"
mv -f "$TMP_FILE" "$OUT_FILE"
sha256sum "$OUT_FILE" > "$OUT_FILE.sha256"
find "$BACKUP_DIR" -maxdepth 1 -type f -name "$DB_NAME-*.sql.gz" -mtime +"$KEEP_DAYS" -delete
find "$BACKUP_DIR" -maxdepth 1 -type f -name "$DB_NAME-*.sql.gz.sha256" -mtime +"$KEEP_DAYS" -delete

printf '[%s] Backup thành công: %s (%s)\n' \
  "$(date '+%F %T')" "$OUT_FILE" "$(du -h "$OUT_FILE" | awk '{print $1}')"
printf 'BACKUP_FILE=%s\n' "$OUT_FILE"
