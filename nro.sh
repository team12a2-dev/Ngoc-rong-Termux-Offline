#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
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
PANEL_ROOT="$ROOT/panel"
PANEL_API_ROOT="$PANEL_ROOT/api"
PANEL_WEB_ROOT="$PANEL_ROOT/web"
PANEL_PID="$STATE_DIR/panel.pid"
PANEL_LOG="$STATE_DIR/panel.log"
PANEL_PORT="${NRO_PANEL_PORT:-3001}"
PANEL_ADMIN_PASSWORD_FILE="$STATE_DIR/panel-admin-password"
BACKUP_SCRIPT="$ROOT/backup-database.sh"
BACKUP_JOB_ID="${NRO_BACKUP_JOB_ID:-1001}"
BACKUP_PERIOD_MS="${NRO_BACKUP_PERIOD_MS:-86400000}"

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

lan_addresses() {
  local out=""
  if command -v ip >/dev/null 2>&1; then
    out="$(ip -o -4 addr show scope global 2>/dev/null | awk '{split($4,a,"/"); print a[1]}' | paste -sd ' ' -)"
  fi
  if [ -z "$out" ] && command -v ifconfig >/dev/null 2>&1; then
    out="$(ifconfig 2>/dev/null | awk '/inet / && $2 !~ /^127\\./ {print $2}' | paste -sd ' ' -)"
  fi
  printf '%s' "${out:-không phát hiện}"
}

configure_lan() {
  ensure_layout
  local lan_ip="${NRO_LAN_IP:-}"
  if [ -z "$lan_ip" ]; then
    lan_ip="$(lan_addresses | awk '{print $1}')"
  fi
  [ -n "$lan_ip" ] && [ "$lan_ip" != "không phát hiện" ] || die "Không phát hiện IP LAN. Hãy kết nối Android và máy khách vào cùng Wi-Fi rồi thử lại, hoặc dùng NRO_LAN_IP=192.168.x.x."
  case "$lan_ip" in
    *[!0-9.]*) die "NRO_LAN_IP không phải IPv4 hợp lệ: $lan_ip" ;;
  esac
  update_config "server.listen.host" "${NRO_GAME_LISTEN_HOST:-0.0.0.0}"
  update_config "server.ip" "$lan_ip"
  update_config "server.sv1" "NRO LAN:$lan_ip:$GAME_PORT:0,0,0"
  export NRO_GAME_LISTEN_HOST="${NRO_GAME_LISTEN_HOST:-0.0.0.0}"
  export NRO_PANEL_BIND="${NRO_PANEL_BIND:-0.0.0.0}"
  say "Đã cấu hình LAN: client dùng $lan_ip:$GAME_PORT; socket bind $NRO_GAME_LISTEN_HOST"
}

termux_keep_awake() {
  if command -v termux-wake-lock >/dev/null 2>&1; then
    termux-wake-lock >/dev/null 2>&1 || true
    say "Đã bật Termux wake lock để hạn chế Android ngủ tiến trình."
  fi
}

print_endpoints() {
  local game_advertised="$(prop server.ip)"
  local game_bind="${NRO_GAME_LISTEN_HOST:-0.0.0.0}"
  local panel_bind="${NRO_PANEL_BIND:-${PANEL_BIND_HOST:-0.0.0.0}}"
  local lan
  lan="$(lan_addresses)"
  say "Endpoint dịch vụ"
  printf '%s\n' "  Game server listen : $game_bind:$GAME_PORT (mọi interface)"
  printf '%s\n' "  Game address/client: ${game_advertised:-127.0.0.1}:$GAME_PORT"
  printf '%s\n' "  Panel web listen   : $panel_bind:$PANEL_PORT"
  printf '%s\n' "  Panel URL local    : http://127.0.0.1:$PANEL_PORT"
  printf '%s\n' "  Địa chỉ LAN        : $lan"
  if [ "$lan" != "không phát hiện" ]; then
    local address
    for address in $lan; do
      printf '%s\n' "  Panel URL LAN      : http://$address:$PANEL_PORT"
      printf '%s\n' "  Game endpoint LAN  : $address:$GAME_PORT"
    done
  fi
  printf '%s\n' "  Game log            : $SERVER_LOG"
  printf '%s\n' "  Panel log           : $PANEL_LOG"
}

need_termux() {
  command -v pkg >/dev/null 2>&1 || die "Không tìm thấy pkg. Hãy chạy script này trong Termux chính thức."
}

install_java() {
  mkdir -p "$STATE_DIR"
  local java_install_log="$STATE_DIR/java-install.log"
  if command -v java >/dev/null 2>&1 && command -v javac >/dev/null 2>&1; then
    say "Java/Javac đã có sẵn: $(java -version 2>&1 | head -n 1)"
    return 0
  fi

  local candidate
  # Termux mirrors may expose different JDK package names/snapshots.
  # Java 21 can compile/run this source with --release 17.
  : > "$java_install_log"
  for candidate in openjdk-21 openjdk-17 openjdk; do
    say "Thử cài package Java: $candidate"
    printf '\n===== pkg install %s =====\n' "$candidate" >> "$java_install_log"
    if pkg install -y "$candidate" >>"$java_install_log" 2>&1; then
      if command -v java >/dev/null 2>&1 && command -v javac >/dev/null 2>&1; then
        say "Đã cài Java bằng package $candidate"
        return 0
      fi
    fi
  done

  cat "$java_install_log" 2>/dev/null || true
  printf '%s\n' '[NRO][ERROR] Không tìm thấy package JDK khả dụng trong kho Termux hiện tại.' >&2
  printf '%s\n' '[NRO][ERROR] Hãy chạy: termux-change-repo rồi chọn mirror Main ổn định, sau đó pkg update -y.' >&2
  printf '%s\n' '[NRO][ERROR] Có thể kiểm tra package bằng: pkg search openjdk' >&2
  die "Cần cả java và javac để biên dịch/chạy server."
}

install_dependencies() {
  need_termux
  say "Cài các gói nền tảng Termux: Java JDK tương thích, MariaDB và Node.js cho panel"
  pkg update -y
  pkg install -y git mariadb
  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    local node_candidate
    for node_candidate in nodejs nodejs-lts; do
      say "Thử cài package Node.js: $node_candidate"
      if pkg install -y "$node_candidate"; then
        command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1 && break
      fi
    done
  fi
  install_java
  command -v mariadb >/dev/null 2>&1 || die "Cài MariaDB client thất bại."
  command -v mariadbd >/dev/null 2>&1 || command -v mysqld >/dev/null 2>&1 || die "Không tìm thấy MariaDB server."
  command -v node >/dev/null 2>&1 || warn "Không tìm thấy Node.js; panel sẽ không được khởi động."
  command -v npm >/dev/null 2>&1 || warn "Không tìm thấy npm; panel sẽ không được khởi động."
}

ensure_layout() {
  mkdir -p "$STATE_DIR" "$CLASS_DIR" "$DB_RUN_DIR"
  if [ ! -f "$CONFIG" ]; then
    [ -f "$ROOT/Config.properties.example" ] || die "Thiếu Config.properties.example trong thư mục dự án."
    cp "$ROOT/Config.properties.example" "$CONFIG"
  fi
  [ -f "$SQL_FILE" ] || die "Thiếu sql/ngocrong.sql trong thư mục dự án."
  [ -f "$ROOT/data/map/tile_set_info" ] || die "Thiếu data/map/tile_set_info; hãy cập nhật lại mã nguồn để sửa lỗi phân biệt hoa/thường trên Android."
  [ -f "$PANEL_API_ROOT/package.json" ] || die "Thiếu panel/api/package.json."
  [ -f "$PANEL_WEB_ROOT/package.json" ] || die "Thiếu panel/web/package.json."
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

  update_config "database.driver" "org.mariadb.jdbc.Driver"
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

database_has_game_data() {
  local table_count
  table_count="$(mariadb --protocol=socket --socket="$DB_SOCKET" -uroot -Nse \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB_NAME' \
     AND table_name IN ('account', 'player', 'shop', 'item_shop')" 2>/dev/null || printf '0')"
  [ "${table_count:-0}" -gt 0 ]
}

import_database() {
  if database_has_game_data; then
    say "Database game đã tồn tại; bỏ qua import seed để bảo toàn player, shop và item_shop."
    mkdir -p "$STATE_DIR"
    sha256sum "$SQL_FILE" > "$STATE_DIR/sql-imported.sha256"
    return 0
  fi
  say "Import schema và dữ liệu mẫu từ sql/ngocrong.sql"
  mariadb --protocol=socket --socket="$DB_SOCKET" -uroot "$DB_NAME" < "$SQL_FILE"
  sha256sum "$SQL_FILE" > "$STATE_DIR/sql-imported.sha256"
}

backup_database() {
  [ -f "$BACKUP_SCRIPT" ] || die "Thiếu backup-database.sh trong thư mục dự án."
  chmod 700 "$BACKUP_SCRIPT"
  bash "$BACKUP_SCRIPT"
}

backup_schedule() {
  command -v termux-job-scheduler >/dev/null 2>&1 || die "Thiếu termux-job-scheduler. Hãy cài package termux-api và ứng dụng Termux:API."
  [ -f "$BACKUP_SCRIPT" ] || die "Thiếu backup-database.sh trong thư mục dự án."
  case "$BACKUP_PERIOD_MS" in
    ''|*[!0-9]*) die "NRO_BACKUP_PERIOD_MS phải là số nguyên dương." ;;
  esac
  [ "$BACKUP_PERIOD_MS" -ge 900000 ] || die "Chu kỳ backup tối thiểu là 900000ms (15 phút)."
  chmod 700 "$BACKUP_SCRIPT"
  termux-job-scheduler --cancel --job-id "$BACKUP_JOB_ID" >/dev/null 2>&1 || true
  termux-job-scheduler \
    --job-id "$BACKUP_JOB_ID" \
    --script "$BACKUP_SCRIPT" \
    --period-ms "$BACKUP_PERIOD_MS" \
    --network none \
    --battery-not-low false \
    --persisted true
  say "Đã lập lịch backup database mỗi $((BACKUP_PERIOD_MS / 60000)) phút (job $BACKUP_JOB_ID)."
  say "Thư mục backup: ${NRO_BACKUP_DIR:-$STATE_DIR/backups}"
}

backup_cancel() {
  command -v termux-job-scheduler >/dev/null 2>&1 || die "Thiếu termux-job-scheduler."
  termux-job-scheduler --cancel --job-id "$BACKUP_JOB_ID"
  say "Đã hủy lịch backup job $BACKUP_JOB_ID."
}

backup_status() {
  command -v termux-job-scheduler >/dev/null 2>&1 || die "Thiếu termux-job-scheduler."
  termux-job-scheduler --pending
  printf '\n[NRO] Backup files:\n'
  find "${NRO_BACKUP_DIR:-$STATE_DIR/backups}" -maxdepth 1 -type f -name '*.sql.gz' -print 2>/dev/null | sort -r | head -n 20 || true
  printf '\n[NRO] Backup log: %s\n' "${NRO_BACKUP_LOG:-$STATE_DIR/backup.log}"
}

ensure_panel_admin_password() {
  mkdir -p "$STATE_DIR"
  local password="${PANEL_ADMIN_PASSWORD:-}"
  if [ -z "$password" ]; then
    if [ -f "$PANEL_ADMIN_PASSWORD_FILE" ]; then
      password="$(cat "$PANEL_ADMIN_PASSWORD_FILE")"
    else
      password="panel_$(od -An -N12 -tx1 /dev/urandom | tr -d ' \n')"
      printf '%s\n' "$password" > "$PANEL_ADMIN_PASSWORD_FILE"
      chmod 600 "$PANEL_ADMIN_PASSWORD_FILE"
    fi
  else
    printf '%s\n' "$password" > "$PANEL_ADMIN_PASSWORD_FILE"
    chmod 600 "$PANEL_ADMIN_PASSWORD_FILE"
  fi
  PANEL_ADMIN_PASSWORD="$password"
  export PANEL_ADMIN_PASSWORD
}

panel_dependencies_ready() {
  [ -d "$PANEL_API_ROOT/node_modules" ] && [ -d "$PANEL_WEB_ROOT/node_modules" ]
}

install_panel_dependencies() {
  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    warn "Node.js/npm chưa có; bỏ qua cài panel."
    return 0
  fi
  if ! panel_dependencies_ready; then
    say "Cài dependency panel API và web bằng npm"
    (cd "$PANEL_API_ROOT" && npm install --no-audit --no-fund) || { warn "Không cài được dependency panel API."; return 0; }
    (cd "$PANEL_WEB_ROOT" && npm install --no-audit --no-fund) || { warn "Không cài được dependency panel web."; return 0; }
  else
    say "Dependency panel đã sẵn sàng."
  fi
  touch "$STATE_DIR/panel-deps.ok"
}

setup_panel() {
  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    warn "Thiếu Node.js/npm; panel không được setup."
    return 0
  fi
  install_panel_dependencies
  if ! panel_dependencies_ready; then return 0; fi
  ensure_panel_admin_password
  export PORT="$PANEL_PORT"
  export JWT_SECRET="${JWT_SECRET:-$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')}"
  say "Đồng bộ schema và tài khoản panel với database $DB_NAME"
  (cd "$PANEL_API_ROOT" && npm run db:sync) || { warn "Panel DB sync thất bại; xem $PANEL_LOG hoặc chạy lại setup."; return 0; }
  say "Build giao diện React panel"
  (cd "$PANEL_WEB_ROOT" && npm run build) || { warn "Build panel web thất bại."; return 0; }
  [ -f "$PANEL_WEB_ROOT/dist/index.html" ] || { warn "Không thấy panel/web/dist/index.html sau build."; return 0; }
  touch "$STATE_DIR/panel-build.ok"
  say "Panel đã được setup. Tài khoản admin: admin; mật khẩu lưu tại $PANEL_ADMIN_PASSWORD_FILE"
}

panel_alive() {
  [ -f "$PANEL_PID" ] && kill -0 "$(cat "$PANEL_PID")" 2>/dev/null
}

start_panel() {
  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    warn "Node.js/npm không khả dụng; bỏ qua panel."
    return 0
  fi
  if ! panel_dependencies_ready || [ ! -f "$PANEL_API_ROOT/.env" ] || [ ! -f "$PANEL_WEB_ROOT/dist/index.html" ]; then
    setup_panel
  fi
  if ! [ -f "$PANEL_API_ROOT/.env" ] || ! [ -f "$PANEL_WEB_ROOT/dist/index.html" ]; then
    warn "Panel chưa đủ file runtime; game server vẫn tiếp tục chạy."
    return 0
  fi
  if panel_alive; then
    say "Panel web đang chạy với PID $(cat "$PANEL_PID")."
    print_endpoints
    return 0
  fi
  say "Khởi động panel web tại cổng $PANEL_PORT"
  rm -f "$PANEL_PID"
  (cd "$PANEL_API_ROOT" && PORT="$PANEL_PORT" PANEL_BIND_HOST="${NRO_PANEL_BIND:-0.0.0.0}" nohup node src/index.js > "$PANEL_LOG" 2>&1 & echo $! > "$PANEL_PID")
  local i
  for i in $(seq 1 60); do
    if panel_alive && curl -fsS --max-time 2 "http://127.0.0.1:$PANEL_PORT/api/v1/system/health" >/dev/null 2>&1; then
      say "Panel web đã READY."
      print_endpoints
      return 0
    fi
    sleep 1
  done
  tail -n 100 "$PANEL_LOG" 2>/dev/null || true
  warn "Panel chưa phản hồi; game server vẫn đang được giữ hoạt động."
}

stop_panel() {
  if panel_alive; then
    local pid
    pid="$(cat "$PANEL_PID")"
    kill "$pid" 2>/dev/null || true
    for _ in $(seq 1 15); do
      panel_alive || break
      sleep 1
    done
    kill -9 "$pid" 2>/dev/null || true
    say "Đã dừng panel web."
  fi
  rm -f "$PANEL_PID"
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

server_ready() {
  [ -f "$STATE_DIR/server.ready" ]
}

wait_server_ready() {
  local max_wait=180 elapsed=0
  while [ "$elapsed" -lt "$max_wait" ]; do
    if ! server_alive; then
      tail -n 120 "$SERVER_LOG" 2>/dev/null || true
      rm -f "$SERVER_PID" "$STATE_DIR/server.ready"
      die "Server game dừng trước khi hoàn tất tải dữ liệu."
    fi
    if server_ready; then
      say "Server đã READY sau khoảng ${elapsed}s. Log: $SERVER_LOG"
      tail -n 20 "$SERVER_LOG" 2>/dev/null || true
      return 0
    fi
    if [ "$elapsed" -eq 0 ] || [ $((elapsed % 10)) -eq 0 ]; then
      say "Đang tải dữ liệu game... ${elapsed}/${max_wait}s"
      tail -n 5 "$SERVER_LOG" 2>/dev/null || true
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  tail -n 160 "$SERVER_LOG" 2>/dev/null || true
  die "Server chưa READY sau ${max_wait}s; hãy xem $SERVER_LOG"
}

start_server() {
  ensure_layout
  if [ "${NRO_LAN_MODE:-0}" = "1" ]; then
    configure_lan
  fi
  termux_keep_awake
  start_database
  ensure_database_user
  import_database
  build_server
  if server_alive; then
    if server_ready; then
      say "Server game đang READY với PID $(cat "$SERVER_PID")."
      start_panel
      return 0
    fi
    say "Server game đã có PID $(cat "$SERVER_PID"); tiếp tục chờ tải dữ liệu."
    wait_server_ready
    start_panel
    return 0
  fi
  rm -f "$STATE_DIR/server.ready"
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
  wait_server_ready
  start_panel
}

stop_server() {
  stop_panel
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
    if server_ready; then
      say "Server game: READY (PID $(cat "$SERVER_PID"))"
    else
      say "Server game: STARTING / ĐANG TẢI DỮ LIỆU (PID $(cat "$SERVER_PID"))"
    fi
  else
    say "Server game: STOPPED"
  fi
  if mysql_alive; then say "MariaDB: RUNNING"; else say "MariaDB: STOPPED"; fi
  if panel_alive; then
    if curl -fsS --max-time 2 "http://127.0.0.1:$PANEL_PORT/api/v1/system/health" >/dev/null 2>&1; then
      say "Panel web: READY (PID $(cat "$PANEL_PID"))"
    else
      say "Panel web: STARTING (PID $(cat "$PANEL_PID"))"
    fi
  else
    say "Panel web: STOPPED"
  fi
  print_endpoints
}
setup() {
  ensure_layout
  install_dependencies
  init_database
  start_database
  ensure_database_user
  import_database
  build_server
  setup_panel
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
    lan)
      [ -f "$STATE_DIR/installed" ] || setup
      NRO_LAN_MODE=1 start_server
      ;;
    background)
      [ -f "$STATE_DIR/installed" ] || setup
      exec "$ROOT/termux-server-service.sh" start
      ;;
    background-stop)
      exec "$ROOT/termux-server-service.sh" stop
      ;;
    background-restart)
      [ -f "$STATE_DIR/installed" ] || setup
      exec "$ROOT/termux-server-service.sh" restart
      ;;
    background-status)
      exec "$ROOT/termux-server-service.sh" status
      ;;
    background-log)
      exec "$ROOT/termux-server-service.sh" log "${2:-120}"
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
    panel)
      ensure_layout
      install_dependencies
      start_database
      ensure_database_user
      import_database
      setup_panel
      start_panel
      ;;
    backup)
      backup_database
      ;;
    backup-schedule)
      backup_schedule
      ;;
    backup-cancel)
      backup_cancel
      ;;
    backup-status)
      backup_status
      ;;
    *)
      cat <<'USAGE'
Sử dụng: ./nro.sh [setup|start|lan|background|background-stop|background-restart|background-status|background-log|restart|stop|status|console|rebuild|panel|backup|backup-schedule|backup-cancel|backup-status]

Mặc định: tự cài lần đầu nếu cần, sau đó khởi động game server và panel.
LAN Android: `./nro.sh lan` sẽ tự nhận IP Wi-Fi, bind game server trên 0.0.0.0 và cập nhật địa chỉ client; có thể chỉ định `NRO_LAN_IP=192.168.x.x`.
Chạy độc lập: `./nro.sh background`; dừng bằng `background-stop`, xem trạng thái bằng `background-status`, xem log bằng `background-log`.
Panel chạy cùng API tại cổng 3001 (có thể đổi bằng NRO_PANEL_PORT).
Backup database: `backup` xuất online, `backup-schedule` lập lịch, `backup-cancel` hủy lịch, `backup-status` xem lịch/file/log.
Biến tùy chọn: NRO_DB_PASSWORD, NRO_DB_USER, NRO_DB_NAME, NRO_GAME_PORT,
NRO_GAME_LISTEN_HOST, NRO_PANEL_PORT, NRO_PANEL_BIND, PANEL_ADMIN_PASSWORD,
NRO_BACKUP_DIR, NRO_BACKUP_LOG, NRO_BACKUP_KEEP_DAYS, NRO_BACKUP_JOB_ID,
NRO_BACKUP_PERIOD_MS, JWT_SECRET, NRO_JVM_OPTS, NRO_REBUILD=1, NRO_LAN_IP.
USAGE
      exit 2
      ;;
  esac
}

main "$@"
