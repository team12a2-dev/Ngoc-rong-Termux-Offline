# NRO Control Panel — API Reference

Base URL: `http://localhost:3001/api/v1`

## Auth

```
POST /auth/login          { username, password }
POST /auth/refresh        { refreshToken }
GET  /auth/me             Bearer JWT
```

## Servers

```
GET  /servers
POST /servers             { name, agentUrl, agentKey, gameDb... }
GET  /servers/:id/ping
GET  /servers/:id/metrics
GET  /servers/:id/metrics/history?hours=24
```

## Players Online (proxy → Agent)

```
GET  /servers/:id/players/online
GET  /servers/:id/players/online/:name
POST /servers/:id/players/online/:name/kick
POST /servers/:id/players/online/:name/buff-vnd    { amount }
POST /servers/:id/players/online/:name/buff-item   { items: [...] }
POST /servers/:id/players/online/:name/teleport    { mapId, x?, y? }
POST /servers/:id/players/kick-all
```

## Server Control

```
POST /servers/:id/maintenance    { seconds?, immediate?, cancel? }
POST /servers/:id/admin-mode     { enabled }
POST /servers/:id/exp-rate       { rate }
POST /servers/:id/broadcast      { message }
GET  /servers/:id/runtime-config
POST /servers/:id/reload/shop
POST /servers/:id/reload/giftcode
POST /servers/:id/reload/boss-spawn
```

## Boss

```
GET  /servers/:id/boss/list
POST /servers/:id/boss/spawn     { bossId }
```

## Accounts (DB)

```
GET  /accounts/search?q=
GET  /accounts/:id
POST /accounts/:id/ban
POST /accounts/:id/unban
PUT  /accounts/:id               { vnd, vip, is_admin... }
```

## Rankings (DB)

Query params chung: `limit` (1–200, mặc định 50), `q` (lọc tên/username).

```
GET  /rankings/meta
GET  /rankings/power               ?limit=&q=
GET  /rankings/nap                 ?limit=&q=
GET  /rankings/event               ?limit=&q=&metric=event_point|point_sukien|...
GET  /rankings/clan                ?limit=&q=&sort=power_point|clan_point|LEVEL
GET  /rankings/super-rank          ?limit=&q=
```

## Economy (DB)

Query params: `limit` (1–200), `q` (tìm kiếm), `status` (napthe), `credited` (payments/bank).

```
GET  /economy/meta
GET  /economy/summary
GET  /economy/transactions         ?limit=&q=
GET  /economy/napthe               ?limit=&q=&status=
GET  /economy/payments             ?limit=&q=&credited=0|1
GET  /economy/bank                 ?limit=&q=&credited=0|1
```

## Config (Agent + panel snapshots)

```
GET  /config/files?serverId=
GET  /config/files/:name?serverId=
PUT  /config/files/:name?serverId=   { content }
GET  /config/snapshots
GET  /config/snapshots/:id
POST /config/snapshots/:id/rollback?serverId=
GET  /config/maintenance-schedules?serverId=
POST /config/maintenance-schedules
```

## Drop theo Map

Yêu cầu JWT và quyền `server.config`. Tất cả tỷ lệ dùng phần trăm thực từ `0` đến `100`; `0.01` nghĩa là `0,01%`.

```
GET    /drop-config?serverId=                         → danh sách rule và item theo map
GET    /drop-config/mobs?q=&limit=                    → catalog Mob từ mob_template
GET    /drop-config/item-templates?q=&limit=         → catalog item để thêm vào rule
POST   /drop-config
       { serverId, rule: { mapId, enabled, goldEnabled,
         goldChancePercent, goldMin, goldMax,
         activationEnabled, activationChancePercent },
         items: [{ tempId, mobTempId, enabled, chancePercent,
                   quantityMin, quantityMax, options: [{ id, param }] }] }
DELETE /drop-config/:mapId?serverId=                   → xóa rule map và item con
POST   /drop-config/reload                            → yêu cầu Java Agent reload cache drop
```

Khi `POST /drop-config` thành công, API ghi `panel_map_drop_configs` và thay toàn bộ item con trong `panel_map_drop_items`, sau đó gọi Game Agent `POST /reload/drop-config`. `mobTempId = -1` áp dụng cho mọi quái; giá trị không âm chỉ áp dụng cho Mob có `Mob.tempId` tương ứng. Nếu reload runtime thất bại, dữ liệu database vẫn được giữ lại để retry.

## Audit

```
GET  /audit-logs?page=&limit=
GET  /audit-logs/export
```

## WebSocket

```
WS /ws/servers/:id/metrics    → metrics mỗi 2s
WS /ws/servers/:id/players    → danh sách online
```

## Game Agent (internal, localhost:9090)

Header bắt buộc: `X-Panel-Key: <panel.agent.key>`

```
GET  /health
GET  /metrics
GET  /players
GET  /players/{name}
POST /players/{name}/kick
POST /players/{name}/buff-vnd
POST /players/{name}/buff-item
POST /broadcast
POST /maintenance
POST /config/admin-mode
POST /config/exp
POST /reload/shop
POST /reload/giftcode
POST /reload/boss-spawn
POST /reload/drop-config
GET  /boss/list
GET  /runtime-config

```
