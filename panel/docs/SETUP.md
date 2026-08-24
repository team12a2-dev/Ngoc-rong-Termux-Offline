# NRO Control Panel — Setup

## Yêu cầu

- Java 17+ (game server)
- Node.js 18+
- MySQL / MariaDB
- Redis (optional, khuyến nghị)

## Bước 1: Cấu hình Game Server

1. Thêm vào `Config.properties`:

```properties
panel.agent.enabled=true
panel.agent.host=127.0.0.1
panel.agent.port=9090
panel.agent.key=your-secret-key-here
```

2. Build và chạy game server như bình thường.
3. Kiểm tra agent: `curl -H "X-Panel-Key: your-secret-key-here" http://127.0.0.1:9090/health`

## Bước 2: Đồng bộ Database (quan trọng)

Script tự đọc `Config.properties` ở thư mục game và sync với DB đang chạy:

```bash
cd panel/api
npm run db:sync
```

Script sẽ:
- Kết nối DB theo `database.*` trong Config.properties
- Kiểm tra bảng game (`account`, `player`, `giftcode`, `shop`...)
- Tạo bảng `panel_*` nếu chưa có
- Sync `panel_servers` + `GAME_AGENT_KEY` từ config game
- Ghi `panel/api/.env` tự động

Hoặc import tay:

```bash
mysql -u root -p ngocrong < panel/sql/panel_schema.sql
```

## Bước 3: Panel API

```bash
cd panel/api
cp .env.example .env
# Sửa .env: DB, GAME_AGENT_URL, GAME_AGENT_KEY
npm install
npm run dev
```

API chạy tại `http://localhost:3001`

## Bước 4: Panel Web

```bash
cd panel/web
npm install
npm run dev
```

Web chạy tại `http://localhost:5173`

## Bước 6: Alerts Telegram (tùy chọn)

Thêm vào `panel/api/.env`:

```env
TELEGRAM_CHAT_ID=your_chat_id
```

Webhook rule URL: `https://api.telegram.org/bot<BOT_TOKEN>`

## Bước 7: Multi-server

Thêm server tại **Servers** trong panel — mỗi server có `agent_url` + `agent_key` riêng.
Chọn server ở dropdown sidebar (áp dụng cho mọi trang).

```bash
cd panel/docker
cp .env.example .env
docker compose up -d
```

## Setup Wizard

Mở `http://localhost:5173/setup` lần đầu để:

1. Tạo tài khoản Owner
2. Kết nối Game DB
3. Cấu hình Game Agent URL + key
4. Test ping end-to-end

## Tài khoản mặc định (dev)

- User: `admin`
- Pass: `admin123` (đổi ngay sau setup)

## Troubleshooting

| Lỗi | Cách xử lý |
|-----|------------|
| Agent 401 | Kiểm tra `X-Panel-Key` khớp `Config.properties` |
| Agent connection refused | `panel.agent.enabled=true`, server đang chạy |
| DB connection fail | Kiểm tra `GAME_DB_*` trong `.env` |
| CORS | Panel web proxy qua Vite dev server |
