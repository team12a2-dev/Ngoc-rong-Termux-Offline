# NRO Control Panel

Hệ thống quản lý server game mới — xem [docs/NRO-CONTROL-PANEL.md](./docs/NRO-CONTROL-PANEL.md).

## Quick start

### Cách 1: Chạy tất cả (game + panel)

**Lần đầu** (hoặc sau khi cập nhật code Java panel), build agent vào JAR:

```bat
build-panel.bat
```

Sau đó:

```bat
run.bat
```

Tự động: Panel API (:3001) + Panel Web (:5173) + mở trình duyệt + Game Server.

### Cách 2: Chỉ panel

```bat
panel\start-panel.bat
```

### Cách 3: Thủ công

- Web: http://localhost:5173
- API: http://localhost:3001
- Login dev: `admin` / `admin123`

## Structure

```
panel/
├── api/          Panel API (Node.js)
├── web/          Panel Web (React)
├── docs/         Design docs
├── sql/          DB schema
├── plugins/      Custom action JSON
└── docker/       Docker Compose
```

Game Agent: `src/nro/models/server/panel/`

Cursor skill: `.cursor/skills/nro-control-panel/`
