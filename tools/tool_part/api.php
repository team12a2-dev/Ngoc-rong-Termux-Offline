<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';

function send_json($data) {
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function send_error($message, $code = 400) {
    http_response_code($code);
    send_json(['success' => false, 'error' => $message]);
}

try {
    switch ($action) {
        case 'get_info': {
            try {
                $pdo = get_pdo();
                $cfg = get_db_config();
                
                // Stats Part
                $totalParts = (int)$pdo->query("SELECT COUNT(*) FROM part")->fetchColumn();
                $minPartId = $totalParts > 0 ? (int)$pdo->query("SELECT MIN(id) FROM part")->fetchColumn() : 0;
                $maxPartId = $totalParts > 0 ? (int)$pdo->query("SELECT MAX(id) FROM part")->fetchColumn() : 0;
                
                // Stats Flag Bag
                $totalFlagBag = 0;
                $maxFlagBagId = 0;
                try {
                    $totalFlagBag = (int)$pdo->query("SELECT COUNT(*) FROM flag_bag")->fetchColumn();
                    $maxFlagBagId = $totalFlagBag > 0 ? (int)$pdo->query("SELECT MAX(id) FROM flag_bag")->fetchColumn() : 0;
                } catch (Exception $ex) {}

                // Item template check
                $hasItemTemplate = false;
                try {
                    $pdo->query("SELECT 1 FROM item_template LIMIT 1");
                    $hasItemTemplate = true;
                } catch (Exception $ex) {}

                send_json([
                    'success' => true,
                    'connected' => true,
                    'config' => [
                        'host' => $cfg['host'],
                        'port' => $cfg['port'],
                        'user' => $cfg['user'],
                        'dbname' => $cfg['dbname']
                    ],
                    'stats' => [
                        'total_parts' => $totalParts,
                        'min_part_id' => $minPartId,
                        'max_part_id' => $maxPartId,
                        'total_flag_bag' => $totalFlagBag,
                        'max_flag_bag_id' => $maxFlagBagId,
                        'has_item_template' => $hasItemTemplate
                    ]
                ]);
            } catch (Exception $e) {
                $cfg = get_db_config();
                send_json([
                    'success' => false,
                    'connected' => false,
                    'error' => 'Không thể kết nối MySQL: ' . $e->getMessage(),
                    'config' => [
                        'host' => $cfg['host'],
                        'port' => $cfg['port'],
                        'user' => $cfg['user'],
                        'dbname' => $cfg['dbname']
                    ]
                ]);
            }
            break;
        }

        case 'save_config': {
            $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
            $host = trim($input['host'] ?? '127.0.0.1');
            $port = (int)($input['port'] ?? 3306);
            $user = trim($input['user'] ?? 'root');
            $pass = (string)($input['pass'] ?? '');
            $dbname = trim($input['dbname'] ?? 'ngocrong');

            $testCfg = [
                'host' => $host,
                'port' => $port,
                'user' => $user,
                'pass' => $pass,
                'dbname' => $dbname
            ];

            try {
                $testPdo = get_pdo($testCfg);
                $testPdo->query("SELECT 1 FROM part LIMIT 1");
            } catch (Exception $e) {
                send_error("Kết nối thất bại với thông số đã nhập: " . $e->getMessage());
            }

            file_put_contents(__DIR__ . '/config.json', json_encode($testCfg, JSON_PRETTY_PRINT));
            send_json(['success' => true, 'message' => 'Lưu cấu hình thành công và kết nối Database OK!']);
            break;
        }

        case 'list_records':
        case 'list_parts': {
            $pdo = get_pdo();
            $table = $_GET['table'] ?? 'part';
            if ($table !== 'flag_bag') $table = 'part';

            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = max(1, min(200, (int)($_GET['limit'] ?? 50)));
            $offset = ($page - 1) * $limit;
            $search = trim($_GET['search'] ?? '');

            $where = [];
            $params = [];

            if ($search !== '') {
                if (preg_match('/^(\d+)\s*[-~]\s*(\d+)$/', $search, $m)) {
                    $start = (int)$m[1];
                    $end = (int)$m[2];
                    if ($start > $end) { $tmp = $start; $start = $end; $end = $tmp; }
                    $where[] = "id BETWEEN :s_start AND :s_end";
                    $params[':s_start'] = $start;
                    $params[':s_end'] = $end;
                } elseif (is_numeric($search)) {
                    $where[] = "id = :s_id";
                    $params[':s_id'] = (int)$search;
                } else {
                    if ($table === 'flag_bag') {
                        $where[] = "(NAME LIKE :s_text OR icon_data LIKE :s_text)";
                    } else {
                        $where[] = "DATA LIKE :s_text";
                    }
                    $params[':s_text'] = '%' . $search . '%';
                }
            }

            $whereSql = count($where) > 0 ? "WHERE " . implode(" AND ", $where) : "";

            $countStmt = $pdo->prepare("SELECT COUNT(*) FROM `$table` $whereSql");
            $countStmt->execute($params);
            $total = (int)$countStmt->fetchColumn();

            if ($table === 'flag_bag') {
                $dataStmt = $pdo->prepare("SELECT id, icon_data, NAME, gold, gem, icon_id FROM `$table` $whereSql ORDER BY id ASC LIMIT $limit OFFSET $offset");
            } else {
                $dataStmt = $pdo->prepare("SELECT id, TYPE, DATA FROM `$table` $whereSql ORDER BY id ASC LIMIT $limit OFFSET $offset");
            }
            $dataStmt->execute($params);
            $rows = $dataStmt->fetchAll();

            send_json([
                'success' => true,
                'table' => $table,
                'data' => $rows,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'total_pages' => ceil($total / $limit)
                ]
            ]);
            break;
        }

        case 'execute_create': {
            $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
            $table = $input['table'] ?? 'part';
            if ($table !== 'flag_bag') $table = 'part';

            $items = $input['items'] ?? [];
            $onConflict = $input['on_conflict'] ?? 'skip'; // skip, overwrite

            if (empty($items) || !is_array($items)) {
                send_error('Không có danh sách ô cần tạo');
            }

            $pdo = get_pdo();
            $pdo->beginTransaction();

            try {
                $inserted = 0;
                $updated = 0;
                $skipped = 0;

                if ($table === 'flag_bag') {
                    $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM `flag_bag` WHERE id = ?");
                    $insertStmt = $pdo->prepare("INSERT INTO `flag_bag` (id, icon_data, NAME, gold, gem, icon_id) VALUES (?, ?, ?, ?, ?, ?)");
                    $updateStmt = $pdo->prepare("UPDATE `flag_bag` SET icon_data = ?, NAME = ?, gold = ?, gem = ?, icon_id = ? WHERE id = ?");

                    foreach ($items as $item) {
                        $id = (int)$item['id'];
                        $iconData = (string)($item['icon_data'] ?? '0,0');
                        $name = (string)($item['name'] ?? 'flag_bag');
                        $gold = (int)($item['gold'] ?? -1);
                        $gem = (int)($item['gem'] ?? -1);
                        $iconId = (int)($item['icon_id'] ?? 0);

                        $checkStmt->execute([$id]);
                        $exists = $checkStmt->fetchColumn() > 0;

                        if ($exists) {
                            if ($onConflict === 'skip') {
                                $skipped++;
                                continue;
                            } else {
                                $updateStmt->execute([$iconData, $name, $gold, $gem, $iconId, $id]);
                                $updated++;
                            }
                        } else {
                            $insertStmt->execute([$id, $iconData, $name, $gold, $gem, $iconId]);
                            $inserted++;
                        }
                    }
                } else {
                    $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM `part` WHERE id = ?");
                    $insertStmt = $pdo->prepare("INSERT INTO `part` (id, TYPE, DATA) VALUES (?, ?, ?)");
                    $updateStmt = $pdo->prepare("UPDATE `part` SET TYPE = ?, DATA = ? WHERE id = ?");

                    foreach ($items as $item) {
                        $id = (int)$item['id'];
                        $type = (int)($item['type'] ?? 0);
                        $data = (string)($item['data'] ?? '');

                        $checkStmt->execute([$id]);
                        $exists = $checkStmt->fetchColumn() > 0;

                        if ($exists) {
                            if ($onConflict === 'skip') {
                                $skipped++;
                                continue;
                            } else {
                                $updateStmt->execute([$type, $data, $id]);
                                $updated++;
                            }
                        } else {
                            $insertStmt->execute([$id, $type, $data]);
                            $inserted++;
                        }
                    }
                }

                $pdo->commit();
                send_json([
                    'success' => true,
                    'message' => "Đã tạo thành công cho bảng $table: $inserted mới, $updated ghi đè, $skipped bỏ qua.",
                    'inserted' => $inserted,
                    'updated' => $updated,
                    'skipped' => $skipped
                ]);
            } catch (Exception $e) {
                $pdo->rollBack();
                send_error("Lỗi khi nạp vào $table: " . $e->getMessage());
            }
            break;
        }

        default:
            send_error('Hành động không hợp lệ: ' . htmlspecialchars($action));
    }
} catch (Exception $e) {
    send_error('Lỗi hệ thống: ' . $e->getMessage());
}
