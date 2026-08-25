/** Column/table mapping synced with live game database (c.sql / ngocrong) */

export const GAME_TABLES = {
  account: {
    table: 'account',
    columns: [
      'id', 'username', 'password', 'email', 'create_time', 'update_time', 'ban',
      'is_admin', 'last_time_login', 'last_time_logout', 'ip_address', 'active',
      'thoi_vang', 'server_login', 'bd_player', 'vnd', 'tongnap', 'vang',
      'event_point', 'vip', 'tichdiem', 'luotquay', 'admin',
    ],
    searchable: ['username', 'id'],
  },
  player: {
    table: 'player',
    columns: [
      'id', 'account_id', 'name', 'head', 'gender', 'clan_id', 'data_inventory',
      'data_location', 'data_point', 'data_task', 'items_body', 'items_bag',
      'items_box', 'pet', 'create_time', 'event_point', 'rank',
    ],
    searchable: ['name', 'account_id', 'id'],
    /** data_point JSON: [0]=limitSM, [1]=power, [2]=potential */
    powerIndex: 1,
  },
  giftcode: {
    table: 'giftcode',
    columns: ['id', 'code', 'count_left', 'detail', 'datecreate', 'expired'],
    detailItemKey: 'id',
  },
  shop: { table: 'shop', columns: ['id', 'npc_id', 'tag_name', 'type_shop'] },
  tab_shop: { table: 'tab_shop', columns: ['id', 'shop_id', 'name'] },
  item_shop: {
    table: 'item_shop',
    columns: ['id', 'tab_id', 'temp_id', 'is_new', 'is_sell', 'cost', 'icon_spec', 'gender_override', 'type_sell', 'sort_order'],
  },
  item_shop_option: {
    table: 'item_shop_option',
    columns: ['id', 'item_shop_id', 'option_id', 'param'],
  },
  clan: {
    table: 'clan',
    columns: ['id', 'NAME', 'NAME_2', 'slogan', 'power_point', 'max_member', 'clan_point', 'LEVEL', 'members', 'create_time'],
    nameColumn: 'NAME',
  },
  history_transaction: {
    table: 'history_transaction',
    columns: ['id', 'player_1', 'player_2', 'item_player_1', 'item_player_2', 'time_tran'],
  },
  napthe: {
    table: 'napthe',
    columns: ['id', 'user_nap', 'telco', 'amount', 'status', 'created_at'],
  },
  payments: {
    table: 'payments',
    columns: ['id', 'username', 'amount', 'status', 'created_at'],
  },
  item_template: {
    table: 'item_template',
    columns: ['id', 'NAME', 'type', 'gender', 'description', 'icon_id', 'part', 'is_up_to_up', 'power_require'],
  },
};

export const REQUIRED_GAME_TABLES = [
  'account', 'player', 'giftcode', 'shop', 'tab_shop', 'item_shop', 'clan', 'mob_template',
];

export const PANEL_TABLES = [
  'panel_roles', 'panel_users', 'panel_servers', 'panel_audit_logs',
  'panel_server_metrics', 'panel_config_snapshots', 'panel_plugins',
  'panel_broadcast_templates', 'panel_maintenance_schedules',
  'panel_alert_rules', 'panel_alert_history', 'panel_backups',
  'panel_map_drop_configs', 'panel_map_drop_items', 'panel_usable_items',
];

export function parsePlayerPower(dataPoint) {
  try {
    const arr = JSON.parse(dataPoint);
    return Number(arr[1] ?? arr[11] ?? 0);
  } catch {
    return 0;
  }
}

export function parsePlayerLocation(dataLocation) {
  try {
    const arr = JSON.parse(dataLocation);
    return { mapId: arr[0], x: arr[1], y: arr[2] };
  } catch {
    return {};
  }
}
