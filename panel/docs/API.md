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
         items: [{ tempId, mobTempId, playerLevelMin, playerLevelMax,
                   timeStartMin, timeEndMin, enabled, chancePercent,
                   quantityMin, quantityMax, options: [{ id, param }] }] }
DELETE /drop-config/:mapId?serverId=                   → xóa rule map và item con
POST   /drop-config/reload                            → yêu cầu Java Agent reload cache drop
```

Khi `POST /drop-config` thành công, API ghi `panel_map_drop_configs` và thay toàn bộ item con trong `panel_map_drop_items`, sau đó gọi Game Agent `POST /reload/drop-config`. `mobTempId = -1` áp dụng cho mọi quái; giá trị không âm chỉ áp dụng cho Mob có `Mob.tempId` tương ứng. `playerLevelMin`/`playerLevelMax` giới hạn theo `Service.getCurrLevel(player)` trong khoảng `0–19`. `timeStartMin`/`timeEndMin` là số phút từ đầu ngày theo múi giờ của Java server; `0–1440` hoặc cùng giờ được xem là cả ngày, còn start lớn hơn end là khung qua nửa đêm. Điều kiện Mob ID, level và thời gian đều phải đúng thì item mới được roll. Nếu reload runtime thất bại, dữ liệu database vẫn được giữ lại để retry.

## Item bổ trợ

Yêu cầu JWT và quyền `server.config`. Chỉ item template có `type = 29` mới được đăng ký.

```text
GET    /usable-items?serverId=                       → danh sách item và option đã cấu hình
GET    /usable-items/options?q=&limit=               → catalog item_option_template có metadata option
GET    /usable-items/templates?q=&limit=             → catalog item type 29
POST   /usable-items
       { serverId, templateId, durationSeconds, enabled,
         options: [{ id, param }] }
DELETE /usable-items/:templateId?serverId=            → bỏ mapping, không xóa item template
POST   /usable-items/reload                          → yêu cầu Java Agent reload usable-items
```

`options` là danh sách option chỉ số gắn cho item, ví dụ `[{ "id": 47, "param": 5 }, { "id": 77, "param": 20 }]`. API xác thực item có `type = 29`, option tồn tại trong `item_option_template`, option thuộc nhóm stat mà `NPoint.addOption` đang xử lý, không trùng option trong cùng item và giới hạn tối đa 12 option. `durationSeconds` mặc định 600 giây, tối đa 30 ngày. Khi lưu, API thay toàn bộ danh sách option cũ trong `panel_usable_item_options`, sau đó gọi Java Agent reload cache. Bổ huyết chỉ là item mẫu của source, không còn là behavior key trong API.

## Tạo item hoàn chỉnh

`POST /items` và `PUT /items/:id` (JWT, quyền `giftcode.manage`) hỗ trợ ghi đồng bộ `item_template`, `part` và `head_avatar`:

```json
{
  "name": "Cải trang chú hề Picolo",
  "type": 5, "gender": 3, "level": 1, "icon_id": 17121,
  "part": 2006, "head": 2006, "body": 2007, "leg": 2008,
  "head_avatar": 17122,
  "parts": [
    { "id": 2006, "type": 0, "data": "[[17094,3,2],[17095,3,3],[2955,0,0]]" },
    { "id": 2007, "type": 1, "data": "[[17096,0,0],[17097,0,-1]]" },
    { "id": 2008, "type": 2, "data": "[[17108,9,7],[17109,-1,-1]]" }
  ]
}
```

Panel ghi dữ liệu trong cùng transaction. Nếu ID part hoặc `head_id` đã tồn tại với nội dung khác, request bị từ chối để không ghi đè item đang dùng; dữ liệu giống nhau được tái sử dụng.

Trên giao diện `/items`, khu vực **Nhập nhanh dữ liệu SQL** nhận trực tiếp một dòng `item_template` gồm 15 cột, nhiều dòng `part` gồm 3 cột và một dòng `head_avatar` gồm 2 cột, phân cách bằng Tab. Nút **Phân tích và tự điền biểu mẫu** sẽ tách dữ liệu, điền các trường item và gửi cả ba nhóm dữ liệu vào đúng bảng riêng khi lưu.

Các danh sách dữ liệu trên panel dùng `GET /items?limit=&offset=`, `GET /items/parts?limit=&offset=` và `GET /items/head-avatars?limit=&offset=`; cả ba danh sách đều phân trang 50 bản ghi/trang. Khi chuyển trang, panel chỉ tải lại phần dữ liệu của bảng tương ứng.

## Data Assets: icon và img_by_name

Trang `/data-assets` quản lý trực tiếp các file trong repository. API yêu cầu JWT và quyền `giftcode.manage`:

```text
GET    /data-assets/icons?zoom=4&limit=50&offset=0
POST   /data-assets/icons              { id, imageBase64 }
DELETE /data-assets/icons/:id
GET    /data-assets/images-by-name?limit=50&offset=0
POST   /data-assets/images-by-name     { name, n_frame, imageBase64 }
DELETE /data-assets/images-by-name/:name
```

Ảnh PNG khi ghi sẽ được resize theo `sourceZoom` rồi ghi vào đủ `data/icon/x4`, `x3`, `x2`, `x1` hoặc `data/img_by_name/x4`, `x3`, `x2`, `x1`. Ví dụ chọn ảnh nguồn x4 sẽ tạo đúng kích thước x3 bằng 3/4, x2 bằng 1/2 và x1 bằng 1/4. Panel hỗ trợ tìm kiếm theo ID/tên và nhập trực tiếp số trang. `img_by_name` đồng thời được upsert vào bảng SQL với `n_frame`. Endpoint preview công khai chỉ đọc file x4; các thao tác thay đổi vẫn yêu cầu đăng nhập và quyền panel.

## Flag bag

`POST /items/flag-bags` nhận 6 cột theo thứ tự `id`, `icon_data`, `NAME`, `gold`, `gem`, `icon_id`. Panel hỗ trợ dán trực tiếp dòng Tab-separated, ví dụ `179<Tab>16982,16983,16984,16985,16986,16987<Tab>Cờ đeo lưng sao may mắn<Tab>-1<Tab>-1<Tab>16981`. Danh sách hiện có dùng `GET /items/flag-bags?limit=&offset=` và được phân trang 50 bản ghi/trang.

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
POST /reload/usable-items
GET  /boss/list
GET  /runtime-config

```
