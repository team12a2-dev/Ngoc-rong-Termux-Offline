# NRO Control Panel — Thiết kế hệ thống

> Panel quản lý server game **mới**, tách biệt hoàn toàn panel web cũ (`adminpanel` trong DB).
> Tài liệu này là **nguồn sự thật (source of truth)** cho mọi triển khai.

## Mục tiêu

- Kiểm soát toàn bộ game server từ một giao diện web
- Realtime metrics, quản lý player/account, boss, config, economy
- Phân quyền RBAC + audit log đầy đủ
- Setup nhanh (Docker / wizard), dễ tùy chỉnh (plugin JSON)

## Kiến trúc tổng quan

```
Admin Browser
    ↓ HTTPS
Panel Web (React)  ←→  Panel API (Node.js)  ←→  Redis
                              ↓                        ↓
                         Game MySQL              cache/pubsub
                              ↓
                         Panel Agent (Java :9090, localhost)
                              ↓
                         Game Server Core
```

### Thành phần

| Thành phần | Path | Vai trò |
|------------|------|---------|
| Game Agent | `src/nro/models/server/panel/` | HTTP API nhúng JVM, thao tác runtime |
| Legacy bridge | `PanelCommandService.java` | Fallback `panel_cmd.txt` |
| Panel API | `panel/api/` | Auth, RBAC, proxy agent, DB CRUD |
| Panel Web | `panel/web/` | Dashboard + quản lý |
| Panel DB schema | `panel/sql/panel_schema.sql` | Bảng `panel_*` |
| Plugins | `panel/plugins/*.json` | Action tùy chỉnh |
| Docker | `panel/docker/` | Compose setup |

## Mapping Agent → Java hiện có

| Endpoint | Code game |
|----------|-----------|
| `GET /metrics` | `ServerManager`, `Client`, `SessionManager`, RAM/CPU |
| `GET /players` | `Client.gI().getPlayers()` |
| `POST /kick` | `Client.gI().kickSession()` |
| `POST /buff-vnd` | `PlayerDAO.addVnd()` |
| `POST /buff-item` | `ItemService` + `InventoryService` |
| `POST /maintenance` | `Maintenance.gI()` |
| `POST /config/admin-mode` | `PanelActions.setAdminMode()` |
| `POST /config/exp` | `Manager.RATE_EXP_SERVER` |
| `POST /reload/shop` | `ShopDAO.getShops()` |
| `POST /reload/giftcode` | `GiftCodeManager.loadGiftCodeFromDB()` |
| `POST /reload/boss-spawn` | `BossSpawnConfig.reload()` |
| `POST /boss/spawn` | `BossManager.createBoss()` |
| `POST /broadcast` | `Service.sendThongBaoAllPlayer()` |

## Lộ trình triển khai

| Phase | Nội dung | Trạng thái |
|-------|----------|------------|
| P0 | Panel Agent Java + config + PanelActions | ✅ |
| P1 | Panel API auth + dashboard + players online | ✅ MVP |
| P1 | Panel Web login + dashboard realtime | ✅ MVP |
| P2 | Account/Player DB, buff offline | ✅ |
| P3 | Maintenance scheduler, config editor | ✅ |
| P4 | Boss monitor, spawn editor | ✅ |
| P5 | Giftcode, shop editor, payments | ✅ |
| P6 | Multi-server, alerts, backup | ✅ |
| P7 | Plugin engine đầy đủ | ✅ |

## RBAC

| Permission | Owner | Admin | Mod | Support | Viewer |
|------------|:-----:|:-----:|:---:|:-------:|:------:|
| dashboard.view | ✓ | ✓ | ✓ | ✓ | ✓ |
| player.kick | ✓ | ✓ | ✓ | ✓ | ✗ |
| player.buff | ✓ | ✓ | ✗ | ✓ | ✗ |
| account.ban | ✓ | ✓ | ✓ | ✗ | ✗ |
| server.maint | ✓ | ✓ | ✗ | ✗ | ✗ |
| server.config | ✓ | ✓ | ✗ | ✗ | ✗ |
| boss.control | ✓ | ✓ | ✗ | ✗ | ✗ |
| giftcode.manage | ✓ | ✓ | ✗ | ✗ | ✗ |

## Config game server

Thêm vào `Config.properties`:

```properties
panel.agent.enabled=true
panel.agent.host=127.0.0.1
panel.agent.port=9090
panel.agent.key=change-me-in-production
```

## Tài liệu liên quan

- [API.md](./API.md) — Catalog endpoint đầy đủ
- [SETUP.md](./SETUP.md) — Hướng dẫn cài đặt
- [../plugins/README.md](../plugins/README.md) — Plugin manifest

## Boss Management — cấu hình boss không sửa file thủ công

Trang `Boss Management` cho phép cấu hình theo từng `bossId` âm. Admin chọn các map được phép, khoảng khu, chế độ `random` hoặc `fixed`, tỷ lệ spawn, khoảng respawn, số boss active tối đa và danh sách item rơi. Khi bấm **Lưu & áp dụng**, panel ghi dữ liệu vào các bảng `panel_boss_configs` và `panel_boss_drop_items`, sinh file runtime `boss_panel.json`, gọi agent reload và ghi audit log.

Cơ chế runtime có các lớp bảo vệ sau:

| Lớp | Logic |
|---|---|
| Map | Boss chỉ được chọn trong danh sách map của rule; nếu nhiều map, runtime xáo trộn danh sách để phân bố tự nhiên. |
| Khu | Chỉ xét khu trong khoảng min–max và bỏ qua khu đang có boss; `random` chọn ngẫu nhiên một khu trống, nên một map có thể có nhiều boss ở nhiều khu khác nhau. |
| Tỷ lệ | Khi cooldown hợp lệ, runtime roll tỷ lệ spawn. Nếu trượt, tạo thời điểm retry ngẫu nhiên để không roll liên tục mỗi tick. |
| Respawn | Khoảng min–max được roll theo từng chu kỳ của boss, không dùng một thời gian cố định cho mọi lần. |
| Active limit | Đếm boss cùng `bossId` đang hoạt động trên toàn bộ registry, tránh vượt quá giới hạn cấu hình. |
| Drop | Mỗi item rơi được roll độc lập, có tỷ lệ, số lượng min–max và option `id:param`; drop được đặt tại khu boss chết và gắn cho người hạ boss. |
| Đồng bộ | Lưu cấu hình sinh file runtime, gọi reload và giữ cache cũ nếu reload lỗi; mọi thay đổi đều có audit log. |

Trước khi dùng trang này ở môi trường mới, chạy migration `panel/sql/migrations/005_boss_control.sql` trên database panel. Schema cài mới đã được cập nhật tương ứng trong `panel/sql/panel_schema.sql`.

Các endpoint chính là `GET /api/v1/boss-config`, `GET /api/v1/boss-config/catalog`, `GET /api/v1/boss-config/item-templates`, `POST /api/v1/boss-config`, `DELETE /api/v1/boss-config/:bossId`, `POST /api/v1/boss-config/reload` và `POST /api/v1/boss-config/spawn-at`. Tất cả đều yêu cầu permission `boss.control`.

## Quy tắc phát triển

1. Mọi thao tác ghi (POST/PUT/DELETE) phải qua Panel API và ghi audit log
2. Agent chỉ bind localhost; Panel API là cổng duy nhất ra ngoài
3. Player data JSON: Phase 2 read-only, edit có backup snapshot
4. Giữ `PanelCommandService` làm fallback ít nhất 2 tháng
5. Không dùng bảng `adminpanel` cũ
