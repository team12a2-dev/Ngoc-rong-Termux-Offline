#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_DIR="${NRO_STATE_DIR:-$ROOT/.runtime}"
DB_DIR="${NRO_DB_DIR:-${PREFIX:-$HOME}/var/lib/mysql}"
DB_RUN_DIR="${NRO_DB_RUN_DIR:-${PREFIX:-$HOME}/var/run/mysqld}"
DB_SOCKET="${NRO_DB_SOCKET:-$DB_RUN_DIR/mysqld.sock}"
DB_PID="${NRO_DB_PID:-$DB_RUN_DIR/mysqld.pid}"
DB_LOG="${NRO_DB_LOG:-$STATE_DIR/mariadb.log}"
SERVER_PID="$STATE_DIR/server.pid"
SERVER_LOG="$STATE_DIR/server.log"
CONFIG="$ROOT/Config.properties"
SQL_FILE="$ROOT/sql/ngocrong.sql"
CLASS_DIR="$STATE_DIR/classes"
SOURCE_LIST="$STATE_DIR/sources.txt"

DB_NAME="${NRO_DB_NAME:-ngocrong}"
DB_USER="${NRO_DB_USER:-ngocrong}"
DB_HOST="${NRO_DB_HOST:-127.0.0.1}"
DB_PORT="${NRO_DB_PORT:-3306}"
GAME_PORT="${NRO_GAME_PORT:-14445}"

say() { printf '\n[NRO] %s\n' "$*"; }
warn() { printf '\n[NRO][WARN] %s\n' "$*" >&2; }
die() { printf '\n[NRO][ERROR] %s\n' "$*" >&2; exit 1; }

prop() {
  local key="$1"
  awk -F= -v k="$key" '$1 == k {sub(/^[^=]*=/, ""); print; exit}' "$CONFIG" 2>/dev/null || true
}

need_termux() {
  command -v pkg >/dev/null 2>&1 || die "Không tìm thấy pkg. Hãy chạy script này trong Termux chính thức."
}

install_dependencies() {
  need_termux
  say "Cài các gói nền tảng Termux: Git, OpenJDK 17 và MariaDB"
  pkg update -y
  pkg install -y git openjdk-17 mariadb
  command -v java >/dev/null 2>&1 || die "Cài Java thất bại."
  command -v javac >/dev/null 2>&1 || die "Không tìm thấy javac sau khi cài OpenJDK 17."
  command -v mariadb >/dev/null 2>&1 || die "Cài MariaDB client thất bại."
  command -v mariadbd >/dev/null 2>&1 || command -v mysqld >/dev/null 2>&1 || die "Không tìm thấy MariaDB server."
}

ensure_layout() {
  mkdir -p "$STATE_DIR" "$CLASS_DIR" "$DB_RUN_DIR"
  if [ ! -f "$CONFIG" ]; then
    [ -f "$ROOT/Config.properties.example" ] || die "Thiếu Config.properties.example trong thư mục dự án."
    cp "$ROOT/Config.properties.example" "$CONFIG"
  fi
  [ -f "$SQL_FILE" ] || die "Thiếu sql/ngocrong.sql trong thư mục dự án."
  case "$DB_NAME" in *[!a-zA-Z0-9_]*|'') die "NRO_DB_NAME chỉ được chứa chữ, số và dấu gạch dưới.";; esac
  case "$DB_USER" in *[!a-zA-Z0-9_]*|'') die "NRO_DB_USER chỉ được chứa chữ, số và dấu gạch dưới.";; esac
}

init_database() {
  ensure_layout
  if [ ! -d "$DB_DIR/mysql" ]; then
    say "Khởi tạo data directory MariaDB tại $DB_DIR"
    mkdir -p "$DB_DIR"
    if command -v mariadb-install-db >/dev/null 2>&1; then
      mariadb-install-db --datadir="$DB_DIR" --auth-root-authentication-method=normal
    else
      mysql_install_db --datadir="$DB_DIR"
    fi
  fi
}

mysql_alive() {
  mariadb-admin --protocol=socket --socket="$DB_SOCKET" -uroot ping >/dev/null 2>&1
}

start_database() {
  init_database
  if mysql_alive; then return 0; fi
  say "Khởi động MariaDB cục bộ trên socket $DB_SOCKET"
  local server_bin
  server_bin="$(command -v mariadbd || command -v mysqld)"
  rm -f "$DB_SOCKET"
  nohup "$server_bin" \
    --datadir="$DB_DIR" \
    --socket="$DB_SOCKET" \
    --pid-file="$DB_PID" \
    --port="$DB_PORT" \
    --bind-address=127.0.0.1 \
    --skip-name-resolve \
    --log-error="$DB_LOG" \
    >/dev/null 2>&1 &
  local i
  for i in $(seq 1 60); do
    if mysql_alive; then return 0; fi
    sleep 1
  done
  tail -n 80 "$DB_LOG" 2>/dev/null || true
  die "MariaDB không khởi động được."
}

sql_escape() {
  printf '%s' "$1" | sed "s/'/''/g"
}

ensure_database_user() {
  local password="${NRO_DB_PASSWORD:-}"
  if [ -z "$password" ]; then
    if [ -f "$STATE_DIR/db-password" ]; then
      password="$(cat "$STATE_DIR/db-password")"
    else
      password="nro_$(od -An -N12 -tx1 /dev/urandom | tr -d ' \n')"
      printf '%s\n' "$password" > "$STATE_DIR/db-password"
      chmod 600 "$STATE_DIR/db-password"
    fi
  else
    printf '%s\n' "$password" > "$STATE_DIR/db-password"
    chmod 600 "$STATE_DIR/db-password"
  fi

  local escaped_password
  escaped_password="$(sql_escape "$password")"
  say "Tạo/cập nhật database $DB_NAME và user nội bộ $DB_USER"
  mariadb --protocol=socket --socket="$DB_SOCKET" -uroot <<SQL
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$escaped_password';
CREATE USER IF NOT EXISTS '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$escaped_password';
ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$escaped_password';
ALTER USER '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$escaped_password';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

  update_config "database.host" "$DB_HOST"
  update_config "database.port" "$DB_PORT"
  update_config "database.name" "$DB_NAME"
  update_config "database.user" "$DB_USER"
  update_config "database.pass" "$password"
  update_config "server.port" "$GAME_PORT"
}

update_config() {
  local key="$1" value="$2" tmp
  tmp="$STATE_DIR/Config.properties.tmp"
  awk -F= -v k="$key" -v v="$value" 'BEGIN{done=0} $1==k {print k "=" v; done=1; next} {print} END{if(!done) print k "=" v}' "$CONFIG" > "$tmp"
  mv "$tmp" "$CONFIG"
}

import_database() {
  if [ -f "$STATE_DIR/sql-imported.sha256" ]; then
    say "SQL ngocrong đã được import trước đó; bỏ qua để bảo toàn dữ liệu người chơi."
    return 0
  fi
  say "Import schema và dữ liệu mẫu từ sql/ngocrong.sql"
  mariadb --protocol=socket --socket="$DB_SOCKET" -uroot "$DB_NAME" < "$SQL_FILE"
  sha256sum "$SQL_FILE" > "$STATE_DIR/sql-imported.sha256"
}

build_server() {
  ensure_layout
  if [ "${NRO_REBUILD:-0}" != "1" ] && [ -f "$STATE_DIR/build.ok" ] && [ -f "$CLASS_DIR/nro/models/server/ServerManager.class" ]; then
    say "Đã có bản build Java; dùng NRO_REBUILD=1 nếu muốn biên dịch lại."
    return 0
  fi
  say "Biên dịch 550 tệp Java bằng JDK 17"
  find "$ROOT/src" -type f -name '*.java' -print > "$SOURCE_LIST"
  [ -s "$SOURCE_LIST" ] || die "Không có mã nguồn Java trong src/."
  local cp jar
  cp="$CLASS_DIR"
  for jar in "$ROOT"/lib/*.jar; do cp="$cp:$jar"; done
  rm -rf "$CLASS_DIR"
  mkdir -p "$CLASS_DIR"
  javac -encoding UTF-8 --release 17 -proc:none -cp "$cp" -d "$CLASS_DIR" @"$SOURCE_LIST"
  touch "$STATE_DIR/build.ok"
  say "Build Java thành công."
}

server_alive() {
  [ -f "$SERVER_PID" ] && kill -0 "$(cat "$SERVER_PID")" 2>/dev/null
}

start_server() {
  ensure_layout
  start_database
  ensure_database_user
  import_database
  build_server
  if server_alive; then
    say "Server game đang chạy với PID $(cat "$SERVER_PID")."
    return 0
  fi
  local jvm_opts cp jar
  jvm_opts="${NRO_JVM_OPTS:-}"
  if [ -z "$jvm_opts" ]; then
    jvm_opts='-server -Dfile.encoding=UTF-8 -Xms64m -Xmx1024m -XX:MaxMetaspaceSize=160m -Xss512k -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -XX:MinHeapFreeRatio=10 -XX:MaxHeapFreeRatio=30 -XX:+UseStringDeduplication -XX:+ParallelRefProcEnabled'
  fi
  cp="$CLASS_DIR"
  for jar in "$ROOT"/lib/*.jar; do cp="$cp:$jar"; done
  say "Khởi động Ngọc Rồng trên cổng $GAME_PORT"
  nohup java $jvm_opts -cp "$cp" nro.models.server.ServerManager > "$SERVER_LOG" 2>&1 &
  printf '%s\n' "$!" > "$SERVER_PID"
  sleep 3
  if ! server_alive; then
    tail -n 100 "$SERVER_LOG" 2>/dev/null || true
    rm -f "$SERVER_PID"
    die "Server game dừng ngay sau khi khởi động."
  fi
  say "Server đã chạy nền. Log: $SERVER_LOG"
}

stop_server() {
  if server_alive; then
    local pid
    pid="$(cat "$SERVER_PID")"
    kill "$pid" 2>/dev/null || true
    for _ in $(seq 1 20); do
      server_alive || break
      sleep 1
    done
    kill -9 "$pid" 2>/dev/null || true
    rm -f "$SERVER_PID"
    say "Đã dừng server game."
  else
    rm -f "$SERVER_PID"
    say "Server game không đang chạy."
  fi
}

status() {
  if server_alive; then
    say "Server game: RUNNING (PID $(cat "$SERVER_PID"))"
  else
    say "Server game: STOPPED"
  fi
  if mysql_alive; then say "MariaDB: RUNNING"; else say "MariaDB: STOPPED"; fi
}

setup() {
  ensure_layout
  install_dependencies
  init_database
  start_database
  ensure_database_user
  import_database
  build_server
  touch "$STATE_DIR/installed"
  say "Cài đặt lần đầu hoàn tất."
}

main() {
  local action="${1:-start}"
  case "$action" in
    setup)
      setup
      ;;
    start)
      [ -f "$STATE_DIR/installed" ] || setup
      start_server
      ;;
    restart)
      stop_server
      start_server
      ;;
    stop)
      stop_server
      ;;
    status)
      status
      ;;
    console)
      ensure_layout
      start_database
      ensure_database_user
      import_database
      build_server
      local cp jar
      cp="$CLASS_DIR"
      for jar in "$ROOT"/lib/*.jar; do cp="$cp:$jar"; done
      exec java -server -Dfile.encoding=UTF-8 -Xms64m -Xmx1024m -XX:MaxMetaspaceSize=160m -cp "$cp" nro.models.server.ServerManager
      ;;
    rebuild)
      NRO_REBUILD=1 build_server
      ;;
    *)
      cat <<'USAGE'
Sử dụng: ./nro.sh [setup|start|restart|stop|status|console|rebuild]

Mặc định: tự cài lần đầu nếu cần, sau đó khởi động server game.
Biến tùy chọn: NRO_DB_PASSWORD, NRO_DB_USER, NRO_DB_NAME, NRO_GAME_PORT,
NRO_JVM_OPTS, NRO_REBUILD=1.
USAGE
      exit 2
      ;;
  esac
}

main "$@"
