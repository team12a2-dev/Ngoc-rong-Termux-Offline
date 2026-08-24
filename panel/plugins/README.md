# Panel Plugins

Plugin là file JSON mô tả action tùy chỉnh. Panel Engine (Phase 7) sẽ đọc và render form tự động.

## Cấu trúc manifest

```json
{
  "id": "unique-id",
  "label": "Tên hiển thị",
  "category": "server-control",
  "roles": ["admin"],
  "fields": [
    { "name": "rate", "type": "number", "default": 2 }
  ],
  "steps": [
    { "action": "agent:POST:/config/exp", "body": { "rate": "{{rate}}" } }
  ]
}
```

## Action types (planned)

- `agent:POST:/path` — gọi Game Agent
- `db:query` — thao tác DB (Phase 5+)
- `composite` — nhiều bước tuần tự

Xem ví dụ: [x2-exp-weekend.json](./x2-exp-weekend.json)
