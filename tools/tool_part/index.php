<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tool Đổi ID & Tạo Ô Part + Flag Bag NRO (An Toàn)</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-body: #0a0e17;
            --bg-card: rgba(18, 25, 41, 0.85);
            --bg-card-hover: rgba(24, 34, 56, 0.95);
            --border-card: rgba(255, 255, 255, 0.08);
            
            --primary: #f59e0b;
            --primary-hover: #fbbf24;
            --primary-glow: rgba(245, 158, 11, 0.3);
            
            --secondary: #38bdf8;
            --accent: #10b981;
            --danger: #ef4444;

            --text-main: #f3f4f6;
            --text-muted: #9ca3af;
            --text-subtle: #6b7280;

            --radius-sm: 8px;
            --radius-md: 12px;
            --radius-lg: 16px;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Outfit', sans-serif;
            background: var(--bg-body);
            background-image: 
                radial-gradient(at 0% 0%, rgba(245, 158, 11, 0.08) 0px, transparent 50%),
                radial-gradient(at 100% 100%, rgba(56, 189, 248, 0.07) 0px, transparent 50%),
                radial-gradient(at 50% 50%, rgba(16, 185, 129, 0.04) 0px, transparent 50%);
            color: var(--text-main);
            min-height: 100vh;
            padding: 24px 16px 60px;
        }

        .container {
            max-width: 1360px;
            margin: 0 auto;
        }

        /* HEADER */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
            padding: 20px 24px;
            background: var(--bg-card);
            border: 1px solid var(--border-card);
            border-radius: var(--radius-lg);
            backdrop-filter: blur(16px);
            margin-bottom: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .header-icon {
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #f59e0b, #ef4444);
            border-radius: var(--radius-md);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 26px;
            box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
        }

        .header-title {
            font-size: 1.35rem;
            font-weight: 700;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .header-badge {
            font-size: 0.75rem;
            padding: 3px 8px;
            background: rgba(16, 185, 129, 0.2);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.4);
            border-radius: 20px;
            font-weight: 600;
        }

        .header-subtitle {
            font-size: 0.85rem;
            color: var(--text-muted);
            margin-top: 2px;
        }

        .safe-banner {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(16, 185, 129, 0.12);
            border: 1px solid rgba(16, 185, 129, 0.35);
            padding: 8px 14px;
            border-radius: var(--radius-md);
            font-size: 0.85rem;
            color: #a7f3d0;
        }

        /* TABS NAVIGATION */
        .tabs-nav {
            display: flex;
            gap: 8px;
            background: rgba(18, 25, 41, 0.6);
            padding: 6px;
            border-radius: var(--radius-lg);
            border: 1px solid var(--border-card);
            margin-bottom: 20px;
            overflow-x: auto;
        }

        .tab-btn {
            background: transparent;
            border: none;
            color: var(--text-muted);
            padding: 12px 22px;
            border-radius: var(--radius-md);
            cursor: pointer;
            font-size: 0.95rem;
            font-weight: 600;
            font-family: inherit;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
            white-space: nowrap;
        }

        .tab-btn:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.05);
        }

        .tab-btn.active {
            color: #fff;
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(239, 68, 68, 0.25));
            border: 1px solid rgba(245, 158, 11, 0.5);
            box-shadow: 0 4px 15px rgba(245, 158, 11, 0.2);
        }

        /* TAB PANELS */
        .tab-pane {
            display: none;
            animation: fadeIn 0.25s ease;
        }

        .tab-pane.active {
            display: block;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* CARD */
        .card {
            background: var(--bg-card);
            border: 1px solid var(--border-card);
            border-radius: var(--radius-lg);
            padding: 24px;
            backdrop-filter: blur(16px);
            margin-bottom: 24px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 18px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--border-card);
        }

        .card-title {
            font-size: 1.15rem;
            font-weight: 700;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .card-desc {
            font-size: 0.85rem;
            color: var(--text-muted);
            margin-top: 4px;
        }

        /* TWO COLUMNS EDITOR */
        .editor-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }

        @media (max-width: 900px) {
            .editor-grid {
                grid-template-columns: 1fr;
            }
        }

        .editor-panel {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .editor-panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.9rem;
            font-weight: 600;
            color: #d1d5db;
        }

        .editor-textarea {
            width: 100%;
            height: 330px;
            background: #080c14;
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: var(--radius-sm);
            color: #f3f4f6;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.82rem;
            line-height: 1.5;
            padding: 12px 14px;
            resize: vertical;
            white-space: pre;
            overflow-x: auto;
            transition: border-color 0.2s, box-shadow 0.2s;
        }

        .editor-textarea:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px var(--primary-glow);
        }

        .editor-textarea.output {
            background: #060910;
            border-color: rgba(56, 189, 248, 0.25);
            color: #38bdf8;
        }

        /* CONTROLS BAR */
        .controls-bar {
            background: rgba(10, 14, 23, 0.7);
            border: 1px solid var(--border-card);
            border-radius: var(--radius-md);
            padding: 16px 20px;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 18px;
            margin-bottom: 20px;
        }

        .ctrl-group {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .ctrl-label {
            font-size: 0.85rem;
            font-weight: 600;
            color: #e5e7eb;
            white-space: nowrap;
        }

        .form-control {
            background: #080c14;
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #fff;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.95rem;
            font-weight: 600;
            padding: 8px 14px;
            border-radius: var(--radius-sm);
            width: 140px;
            transition: all 0.2s;
        }

        .form-control:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px var(--primary-glow);
        }

        .form-control.wide {
            width: 220px;
        }

        .select-control {
            background: #080c14;
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #fff;
            font-family: inherit;
            font-size: 0.9rem;
            padding: 8px 12px;
            border-radius: var(--radius-sm);
        }

        /* BUTTONS */
        .btn {
            font-family: inherit;
            font-size: 0.9rem;
            font-weight: 600;
            padding: 10px 20px;
            border-radius: var(--radius-sm);
            border: none;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
            text-decoration: none;
        }

        .btn-primary {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: #000;
            font-weight: 700;
            box-shadow: 0 4px 15px rgba(245, 158, 11, 0.35);
        }

        .btn-primary:hover {
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            transform: translateY(-1px);
        }

        .btn-success {
            background: linear-gradient(135deg, #10b981, #059669);
            color: #fff;
            font-weight: 700;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        }

        .btn-success:hover {
            background: linear-gradient(135deg, #34d399, #10b981);
            transform: translateY(-1px);
        }

        .btn-secondary {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid var(--border-card);
            color: #fff;
        }

        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        .btn-sm {
            padding: 6px 12px;
            font-size: 0.8rem;
        }

        /* BADGES */
        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
        }

        .badge-head {
            background: rgba(56, 189, 248, 0.15);
            color: #38bdf8;
            border: 1px solid rgba(56, 189, 248, 0.3);
        }

        .badge-body {
            background: rgba(16, 185, 129, 0.15);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .badge-leg {
            background: rgba(245, 158, 11, 0.15);
            color: #fbbf24;
            border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .badge-flag {
            background: rgba(168, 85, 247, 0.15);
            color: #c084fc;
            border: 1px solid rgba(168, 85, 247, 0.3);
        }

        .badge-info {
            background: rgba(99, 102, 241, 0.15);
            color: #a5b4fc;
            border: 1px solid rgba(99, 102, 241, 0.3);
        }

        /* TABLE PREVIEW */
        .table-responsive {
            overflow-x: auto;
            border-radius: var(--radius-sm);
            border: 1px solid var(--border-card);
            background: rgba(10, 14, 23, 0.7);
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            font-size: 0.85rem;
        }

        .data-table th {
            background: rgba(255, 255, 255, 0.04);
            color: var(--text-muted);
            padding: 10px 14px;
            font-weight: 600;
            border-bottom: 1px solid var(--border-card);
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.5px;
        }

        .data-table td {
            padding: 8px 14px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
            color: #d1d5db;
        }

        .code-snippet {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: #94a3b8;
            max-width: 450px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            display: inline-block;
        }

        /* TOAST */
        .toast-container {
            position: fixed;
            top: 24px;
            right: 24px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .toast {
            padding: 12px 18px;
            border-radius: var(--radius-sm);
            font-size: 0.85rem;
            font-weight: 500;
            color: #fff;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            animation: slideInRight 0.3s ease;
            max-width: 420px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .toast-success {
            background: #065f46;
            border: 1px solid #059669;
        }

        .toast-error {
            background: #991b1b;
            border: 1px solid #dc2626;
        }

        .toast-info {
            background: #1e3a8a;
            border: 1px solid #2563eb;
        }

        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    </style>
</head>
<body>

<div class="container">
    <!-- HEADER -->
    <header class="header">
        <div class="header-left">
            <div class="header-icon">⚡</div>
            <div>
                <div class="header-title">
                    Tool Đổi ID & Tạo Ô NRO (Part & Flag Bag)
                    <span class="header-badge">Chế Độ An Toàn 100%</span>
                </div>
                <div class="header-subtitle">Áp dụng cho cả <strong>Part</strong> và <strong>Flag_Bag</strong> (Cờ đeo lưng). Tự nhận diện ID đầu ➔ Đổi ID mới trả về kết quả đúng y bản gốc!</div>
            </div>
        </div>

        <div class="safe-banner">
            <span>🛡️</span>
            <div>
                <strong>Tuyệt đối không can thiệp Database</strong> khi Đổi ID! Dữ liệu xử lý trực tiếp trên trình duyệt.
            </div>
        </div>
    </header>

    <!-- TABS -->
    <div class="tabs-nav">
        <button class="tab-btn active" onclick="switchTab('tab-change-text')">🔄 Đổi ID Hàng Loạt (Part & Flag Bag)</button>
        <button class="tab-btn" onclick="switchTab('tab-create-auto')">➕ Tạo Ô Tự Động (Part & Flag Bag)</button>
        <button class="tab-btn" onclick="switchTab('tab-db-view')">📋 Xem & Tra Cứu DB XAMPP</button>
    </div>

    <!-- ================= TAB 1: ĐỔI ID BẰNG CÁCH DÁN TEXT ================= -->
    <div id="tab-change-text" class="tab-pane active">
        <div class="card">
            <div class="card-header">
                <div>
                    <div class="card-title">🔄 Đổi ID Hàng Loạt Từ Dữ Liệu Dán (Part / Flag_Bag)</div>
                    <div class="card-desc">Dán các dòng dữ liệu (từ phpMyAdmin / bảng / text) vào khung bên trái. Tool tự động bắt ID đầu tiên, loại bảng và sinh kết quả mới bên phải.</div>
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button class="btn btn-sm btn-secondary" onclick="loadFlagBagSample()">🎒 Dán mẫu Flag_Bag (149..181)</button>
                    <button class="btn btn-sm btn-secondary" onclick="loadPartSample()">🥋 Dán mẫu Part (1954..1956)</button>
                    <button class="btn btn-sm btn-secondary" onclick="clearTextConverter()">🧹 Xóa trắng</button>
                </div>
            </div>

            <!-- CONTROLS BAR -->
            <div class="controls-bar">
                <div class="ctrl-group">
                    <span class="ctrl-label">🔍 ID đầu tiên phát hiện:</span>
                    <span id="detectedFirstId" style="font-family: 'JetBrains Mono'; font-size: 1.15rem; font-weight: bold; color: var(--primary);">--</span>
                    <span id="detectedTypeBadge" class="badge badge-flag" style="display: none;">Flag_Bag</span>
                    <span id="detectedCountBadge" class="badge badge-info">0 dòng</span>
                </div>

                <div style="height: 24px; width: 1px; background: rgba(255,255,255,0.15); margin: 0 4px;"></div>

                <div class="ctrl-group">
                    <span class="ctrl-label">🎯 Nhập ID MỚI muốn đổi thành:</span>
                    <input type="number" id="targetNewStartId" class="form-control" value="200" placeholder="VD: 200 hoặc 1880" oninput="doTransformText()">
                </div>

                <div style="margin-left: auto;">
                    <button class="btn btn-primary" onclick="doTransformText()">⚡ Tiến Hành Đổi ID Ngay</button>
                </div>
            </div>

            <!-- TWO EDITORS -->
            <div class="editor-grid">
                <!-- INPUT PANEL -->
                <div class="editor-panel">
                    <div class="editor-panel-header">
                        <span>📥 DÁN DỮ LIỆU GỐC VÀO ĐÂY (PART HOẶC FLAG_BAG):</span>
                        <small style="color: var(--text-muted);">Giữ nguyên tab và khoảng trắng</small>
                    </div>
                    <textarea id="rawInputText" class="editor-textarea" placeholder="Dán các dòng dữ liệu vào đây...
Ví dụ Flag_Bag:
149	14987,14988,14990,14991,14992	Đeo lưng Kẹo Noel	-1	-1	14532
150	14635,14636,14637,14638,14639,14640...	Bóng sinh nhật NRO	-1	-1	14646

Hoặc ví dụ Part:
1954	0	[[2955,0,0],[2955,0,0],[2955,0,0]]
1955	1	[[2955,0,0],[16661,-1,1],...]
1956	2	[[16667,7,7],[16662,1,7],...]" oninput="handleInputPaste()"></textarea>
                </div>

                <!-- OUTPUT PANEL -->
                <div class="editor-panel">
                    <div class="editor-panel-header">
                        <span style="color: #38bdf8;">📤 KẾT QUẢ ĐÃ ĐỔI ID MỚI (TRẢ LẠI ĐÚNG ĐỊNH DẠNG):</span>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-sm btn-success" onclick="copyResultText()">📋 Sao Chép Kết Quả</button>
                            <button class="btn btn-sm btn-secondary" onclick="copyResultSql()">💾 Sao Chép SQL INSERT</button>
                        </div>
                    </div>
                    <textarea id="outputResultText" class="editor-textarea output" readonly placeholder="Kết quả sau khi đổi ID sẽ xuất hiện ở đây..."></textarea>
                </div>
            </div>

            <!-- PREVIEW COMPARISON TABLE -->
            <div id="tablePreviewContainer" style="display: none; margin-top: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h4 style="color: #fff; font-size: 0.95rem;">Bảng So Sánh Chi Tiết (Trước ➔ Sau):</h4>
                    <span id="previewSummaryBadge" class="badge badge-head">0 ô</span>
                </div>
                <div class="table-responsive" style="max-height: 280px;">
                    <table class="data-table" id="previewDataTable">
                        <thead>
                            <tr>
                                <th style="width: 50px;">#</th>
                                <th style="width: 110px;">ID Cũ</th>
                                <th style="width: 220px;" id="thColumnDesc">Tên / Phân Loại</th>
                                <th style="width: 50px; text-align: center;"></th>
                                <th style="width: 110px;">ID MỚI</th>
                                <th>Chi Tiết Dữ Liệu</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- ================= TAB 2: TẠO Ô TỰ ĐỘNG ================= -->
    <div id="tab-create-auto" class="tab-pane">
        <div class="card">
            <div class="card-header">
                <div>
                    <div class="card-title">➕ Tạo Ô Tự Động (Part & Flag_Bag)</div>
                    <div class="card-desc">Nhập ID bắt đầu và số ô muốn tạo. Tool sẽ sinh dữ liệu và bạn có thể copy hoặc nạp vào DB.</div>
                </div>
                <div class="ctrl-group">
                    <span class="ctrl-label">Bảng cần tạo:</span>
                    <select id="createTargetTable" class="select-control" onchange="toggleCreateTableFields()">
                        <option value="flag_bag">🎒 Bảng Flag_Bag (Cờ đeo lưng)</option>
                        <option value="part">🥋 Bảng Part (Đầu / Áo / Quần)</option>
                    </select>
                </div>
            </div>

            <div class="controls-bar" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                <div class="ctrl-group">
                    <span class="ctrl-label">Từ ID bắt đầu:</span>
                    <input type="number" id="createStartId" class="form-control" value="182" oninput="syncCreateSlots()">
                </div>

                <div class="ctrl-group">
                    <span class="ctrl-label">Số ô muốn tạo:</span>
                    <input type="number" id="createSlotCount" class="form-control" value="5" min="1" max="500" oninput="syncCreateSlots()">
                </div>

                <div class="ctrl-group">
                    <span class="ctrl-label">Đến ID:</span>
                    <input type="number" id="createEndId" class="form-control" value="186" oninput="syncCreateSlotsFromEnd()">
                </div>

                <!-- Part specific rule -->
                <div class="ctrl-group" id="partRuleWrap" style="display: none;">
                    <span class="ctrl-label">Quy tắc Type:</span>
                    <select id="createTypeRule" class="select-control" onchange="generateAutoCreateSlots()">
                        <option value="cycle">🔄 Tuần hoàn 0 (Đầu) ➔ 1 (Áo) ➔ 2 (Quần)</option>
                        <option value="0">Tất cả là Type 0 (Đầu)</option>
                        <option value="1">Tất cả là Type 1 (Áo)</option>
                        <option value="2">Tất cả là Type 2 (Quần)</option>
                    </select>
                </div>

                <!-- Flag bag specific rule -->
                <div class="ctrl-group" id="flagRuleWrap">
                    <span class="ctrl-label">Tên mẫu:</span>
                    <input type="text" id="createFlagName" class="form-control wide" value="Cờ đeo lưng mới" oninput="generateAutoCreateSlots()">
                </div>
            </div>

            <!-- RESULT OF AUTO CREATE -->
            <div class="editor-grid">
                <div class="editor-panel">
                    <div class="editor-panel-header">
                        <span style="color: #38bdf8;">📋 DỮ LIỆU ĐÃ TỰ ĐỘNG SINH:</span>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-sm btn-success" onclick="copyAutoCreateText()">📋 Sao Chép Text</button>
                            <button class="btn btn-sm btn-secondary" onclick="copyAutoCreateSql()">💾 Sao Chép SQL</button>
                        </div>
                    </div>
                    <textarea id="autoCreateOutputText" class="editor-textarea output" readonly></textarea>
                </div>

                <div class="editor-panel">
                    <div class="editor-panel-header">
                        <span>⚡ TÙY CHỌN NẠP VÀO XAMPP (NẾU MUỐN):</span>
                    </div>
                    <div style="background: rgba(10, 14, 23, 0.7); border: 1px solid var(--border-card); border-radius: var(--radius-sm); padding: 16px; height: 330px; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <p style="font-size: 0.85rem; color: #d1d5db; line-height: 1.5; margin-bottom: 12px;">
                                Bạn có thể sao chép phần text hoặc SQL ở bên trái để dán vào phpMyAdmin. 
                                Hoặc nếu muốn nạp trực tiếp vào MySQL của XAMPP, hãy bấm nút bên dưới:
                            </p>
                            <div style="margin-bottom: 12px;">
                                <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #f59e0b; cursor: pointer;">
                                    <input type="checkbox" id="overwriteDbCheck" style="accent-color: var(--primary);"> 
                                    Nếu ID đã có trong DB thì ghi đè (thay thế)
                                </label>
                            </div>
                        </div>
                        <button class="btn btn-primary" style="width: 100%; justify-content: center;" onclick="insertAutoSlotsToDb()">
                            📥 Nạp Trực Tiếp <span id="autoSlotCountBadge">5</span> Ô Vào Database XAMPP
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- ================= TAB 3: XEM DB XAMPP ================= -->
    <div id="tab-db-view" class="tab-pane">
        <div class="card">
            <div class="card-header">
                <div>
                    <div class="card-title">📋 Tra Cứu Dữ Liệu Database XAMPP</div>
                    <div class="card-desc">Xem và đối chiếu danh sách part hoặc flag_bag hiện có trên database ngocrong</div>
                </div>
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <select id="dbSelectTable" class="select-control" onchange="loadDbRecords(1)">
                        <option value="flag_bag">🎒 Bảng flag_bag</option>
                        <option value="part">🥋 Bảng part</option>
                    </select>
                    <input type="text" id="dbSearchInput" class="form-control wide" placeholder="Tìm ID hoặc dải (VD: 140-185)..." onkeydown="if(event.key==='Enter') loadDbRecords(1)">
                    <button class="btn btn-sm btn-secondary" onclick="loadDbRecords(1)">🔎 Tìm</button>
                    <button class="btn btn-sm btn-secondary" onclick="document.getElementById('dbSearchInput').value=''; loadDbRecords(1);">🔄 Tải lại</button>
                </div>
            </div>

            <div class="table-responsive">
                <table class="data-table" id="dbRecordsTable">
                    <thead id="dbRecordsThead"></thead>
                    <tbody id="dbRecordsTableBody">
                        <tr><td colspan="5" style="text-align: center; padding: 25px; color: var(--text-muted);">Đang tải dữ liệu từ DB...</td></tr>
                    </tbody>
                </table>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; font-size: 0.85rem; color: var(--text-muted);">
                <div id="dbPaginationInfo">Trang 1</div>
                <div style="display: flex; gap: 8px;" id="dbPaginationBtns"></div>
            </div>
        </div>
    </div>
</div>

<!-- TOAST NOTIFICATION CONTAINER -->
<div class="toast-container" id="toastContainer"></div>

<script>
    // State
    let parsedItems = []; // [{id, restText, rawLine, nameOrType, detail}]
    let detectedTable = 'flag_bag'; // 'flag_bag' or 'part' or 'generic'
    let autoCreatedItems = [];

    // Samples provided by user
    const SAMPLE_FLAG_BAG = `149\t14987,14988,14990,14991,14992\tĐeo lưng Kẹo Noel\t-1\t-1\t14532
150\t14635,14636,14637,14638,14639,14640,14641,14642,14643,14644,14645\tBóng sinh nhật NRO\t-1\t-1\t14646
151\t13127,13128,13129,13130,13131,13132,13133,13134\tĐuôi rắn xanh\t-1\t-1\t14656
152\t13135,13136,13137,13138,13139,13140,13141,13142\tĐuôi rắn rực lửa\t-1\t-1\t14651
153\t13143,13144,13145,13146,13147,13148,13149,13150\tRìu Sơn Tinh\t-1\t-1\t15001
154\t16831,16832,16833,16834\tGiáo Thủy Tinh\t-1\t-1\t14993
155\t16217,16218,16219,16220,16221,16222\tĐeo lưng bạch tuộc Xanh cáu kỉnh\t-1\t-1\t15331
156\t16175,16176,16177,16178,16179,16180\tĐeo lưng bạch tuộc Hồng\t-1\t-1\t15334
157\t15336,15335\tĐeo lưng bạch tuộc Vàng\t-1\t-1\t15337
158\t15339,15338\tĐeo lưng bạch tuộc Xanh\t-1\t-1\t15340
159\t15394,15395,15396,15397,15398,15399,15400,15401,15402,15403,15404,15405,15406,15407,15408,15409,15410\tBông cúc\t-1\t-1\t15411
160\t15486,15487,15488,15489,15490,15491,15492,15493,15494\tĐeo lưng ẩm thực\t-1\t-1\t15495
161\t15623,15624,15625,15626,15627,15628,15629,15630,15631,15632,15633,15634,15635,15636,15637,15638,15639,15640,15641,15642\tCờ Quả Cầu Pokemon\t-1\t-1\t15685
162\t15804,15805,15806,15807,15808,15809\tLồng đèn 2 lon\t-1\t-1\t15803
163\t15845,15846,15847,15848,15849,15850,15851,15852,15853,15854,15855,15856,15857,15858,15859\tThùng rác\t-1\t-1\t15860
164\t16133,16134,16135,16136\tĐeo lưng Cú con cưng\t-1\t-1\t16137
165\t16140,16141,16142,16143\tBó Hoa Hồng 2 Mới\t-1\t-1\t16144
166\t16175,16176,16177,16178,16179,16180\tCánh thiên thần sa ngã\t-1\t-1\t16174
167\t16217,16218,16219,16220,16221,16222\tCánh thiên thần sa ngã (Đệ)\t-1\t-1\t16223
168\t16326,16326\tBa lô ngọc rồng\t-1\t-1\t16327
169\t16400,16401,16402,16403\tĐeo lưng bông tuyết\t-1\t-1\t16404
170\t16532,16533,16534,16535,16536,16537,16538,16539\tĐeo lưng lồng đèn Tết\t-1\t-1\t16540
171\t16550,16551,16552,16553,16554,16555,16556,16557,16558,16559,16560,16561,16562,16563,16564,16565,16566,16567,16568,16569,16570,16571\tPháo hoa NRO\t-1\t-1\t16572
172\t16573,16574,16575,16576\tĐeo lưng Mãi Dell thành công\t-1\t-1\t16577
173\t16675,16676,16677,16678,16679,16680,16681,16682,16683,16684,16685,16686,16687,16688,16689,16690,16691,16692,16693,16694,16695,16696,16697,16698,16699\tĐeo lưng Bao lì xì\t-1\t-1\t16700
174\t16711,16712,16713,16714\tBư tập tạ\t-1\t-1\t16715
175\t16716,16717,16718,16719\tCờ đeo lưng cớt hồng\t-1\t-1\t16720
176\t16754,16755,16756,16757\tYêu quái núi lãng lãng\t-1\t-1\t16758
177\t16831,16832,16833,16834\tCánh hào khí\t-1\t-1\t16835
178\t16931,16932,16933,16934\tBóng WC 2026\t-1\t-1\t16935
179\t16982,16983,16984,16985,16986,16987\tCờ đeo lưng sao may mắn\t-1\t-1\t16981
180\t17054,17055,17056,17057,17058,17059,17060,17061,17062,17063,17064,17065,17066,17067,17068,17069,17070,17071,17072,17073,17074,17075,17076,17077,17078,17079,17080,17081,17082,17083,17084,17085,17086,17087\tCờ Vạn Hoa Đồng\t-1\t-1\t17088
181\t17089,17090,17091,17092\tCờ World Cup 2026\t-1\t-1\t17093`;

    const SAMPLE_PART = `1954\t0\t[[2955,0,0],[2955,0,0],[2955,0,0]]
1955\t1\t[[2955,0,0],[16661,-1,1],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0]]
1956\t2\t[[16667,7,7],[16662,1,7],[16663,-1,-5],[16664,1,-7],[16665,-2,-8],[16666,-1,-7],[16667,-1,-4],[16665,-6,2],[16663,-7,-2],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0]]`;

    document.addEventListener('DOMContentLoaded', () => {
        // Load default sample Flag Bag as requested by user
        loadFlagBagSample();
        generateAutoCreateSlots();
    });

    // Tab Switcher
    function switchTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        
        event.currentTarget.classList.add('active');
        document.getElementById(tabId).classList.add('active');

        if (tabId === 'tab-db-view') {
            loadDbRecords(1);
        }
    }

    // Toast
    function showToast(msg, type = 'info') {
        const container = document.getElementById('toastContainer');
        const t = document.createElement('div');
        t.className = `toast toast-${type}`;
        t.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> <div>${msg}</div>`;
        container.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0';
            t.style.transform = 'translateY(-10px)';
            setTimeout(() => t.remove(), 300);
        }, 3500);
    }

    // ================= TAB 1: PARSING & TRANSFORMING =================

    function loadFlagBagSample() {
        document.getElementById('rawInputText').value = SAMPLE_FLAG_BAG;
        document.getElementById('targetNewStartId').value = 182;
        handleInputPaste();
    }

    function loadPartSample() {
        document.getElementById('rawInputText').value = SAMPLE_PART;
        document.getElementById('targetNewStartId').value = 1880;
        handleInputPaste();
    }

    function clearTextConverter() {
        document.getElementById('rawInputText').value = '';
        document.getElementById('outputResultText').value = '';
        document.getElementById('detectedFirstId').innerText = '--';
        document.getElementById('detectedTypeBadge').style.display = 'none';
        document.getElementById('detectedCountBadge').innerText = '0 dòng';
        document.getElementById('tablePreviewContainer').style.display = 'none';
        parsedItems = [];
    }

    // Universal Line Parser that guarantees 100% data preservation
    function handleInputPaste() {
        const raw = document.getElementById('rawInputText').value;
        const lines = raw.split(/\r?\n/);
        parsedItems = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            // Find where the ID starts and where it ends
            // Line format: {optional_whitespace}{ID}{whitespace_or_tab}{REST_OF_LINE}
            const match = line.match(/^(\s*)(\d+)(\t|\s+)(.*)$/);
            if (match) {
                const prefixWs = match[1];
                const oldId = parseInt(match[2]);
                const separator = match[3];
                const restOfLine = match[4];

                // Auto detect what kind of record this is for preview
                let nameOrType = '';
                let detail = restOfLine;
                let isFlag = false;
                let isPart = false;

                // Check tab split
                const tabParts = restOfLine.split('\t');
                if (tabParts.length >= 2) {
                    // Could be flag_bag: [0]=icon_data, [1]=NAME, [2]=gold, [3]=gem, [4]=icon_id
                    if (tabParts.length >= 4) {
                        nameOrType = tabParts[1]; // NAME
                        detail = `Icons: ${tabParts[0].substring(0, 30)}... | IconID: ${tabParts[tabParts.length-1]}`;
                        isFlag = true;
                    } else if (tabParts[0] === '0' || tabParts[0] === '1' || tabParts[0] === '2') {
                        // Part: [0]=TYPE, [1]=DATA
                        nameOrType = tabParts[0] === '0' ? 'Đầu (0)' : (tabParts[0] === '1' ? 'Áo (1)' : 'Quần (2)');
                        detail = tabParts[1];
                        isPart = true;
                    }
                } else {
                    // Space separated check
                    const spParts = restOfLine.match(/^(\d+)\s+(.*)$/);
                    if (spParts && (spParts[1] === '0' || spParts[1] === '1' || spParts[1] === '2')) {
                        nameOrType = spParts[1] === '0' ? 'Đầu (0)' : (spParts[1] === '1' ? 'Áo (1)' : 'Quần (2)');
                        detail = spParts[2];
                        isPart = true;
                    }
                }

                parsedItems.push({
                    oldId: oldId,
                    prefixWs: prefixWs,
                    separator: separator,
                    restOfLine: restOfLine,
                    rawLine: line,
                    nameOrType: nameOrType || 'Dữ liệu',
                    detail: detail,
                    isFlag: isFlag,
                    isPart: isPart,
                    tabParts: tabParts
                });
            }
        }

        const badgeType = document.getElementById('detectedTypeBadge');
        if (parsedItems.length > 0) {
            const firstId = parsedItems[0].oldId;
            document.getElementById('detectedFirstId').innerText = firstId;
            document.getElementById('detectedCountBadge').innerText = `${parsedItems.length} dòng`;

            // Detect table kind
            const flagCount = parsedItems.filter(p => p.isFlag).length;
            const partCount = parsedItems.filter(p => p.isPart).length;

            if (flagCount > partCount) {
                detectedTable = 'flag_bag';
                badgeType.innerText = '🎒 Flag_Bag';
                badgeType.className = 'badge badge-flag';
                badgeType.style.display = 'inline-block';
                document.getElementById('thColumnDesc').innerText = 'Tên Cờ (Flag_Bag)';
            } else if (partCount > 0) {
                detectedTable = 'part';
                badgeType.innerText = '🥋 Part';
                badgeType.className = 'badge badge-head';
                badgeType.style.display = 'inline-block';
                document.getElementById('thColumnDesc').innerText = 'Loại Part (Head/Body/Leg)';
            } else {
                detectedTable = 'generic';
                badgeType.innerText = '🌐 Bảng chung';
                badgeType.className = 'badge badge-info';
                badgeType.style.display = 'inline-block';
                document.getElementById('thColumnDesc').innerText = 'Phân loại';
            }
        } else {
            document.getElementById('detectedFirstId').innerText = '--';
            document.getElementById('detectedCountBadge').innerText = '0 dòng';
            badgeType.style.display = 'none';
        }

        doTransformText();
    }

    function doTransformText() {
        if (parsedItems.length === 0) {
            document.getElementById('outputResultText').value = '';
            document.getElementById('tablePreviewContainer').style.display = 'none';
            return;
        }

        const newStartId = parseInt(document.getElementById('targetNewStartId').value);
        if (isNaN(newStartId)) {
            document.getElementById('outputResultText').value = '⚠️ Vui lòng nhập ID MỚI muốn đổi thành!';
            return;
        }

        const resultLines = [];
        const tbody = document.querySelector('#previewDataTable tbody');
        tbody.innerHTML = '';

        parsedItems.forEach((item, index) => {
            const newId = newStartId + index;

            // Reconstruct the exact line: prefixWs + newId + separator + restOfLine
            // 100% bit-exact preservation of rest of the line!
            const newLine = `${item.prefixWs}${newId}${item.separator}${item.restOfLine}`;
            resultLines.push(newLine);

            // Table row preview
            const tr = document.createElement('tr');
            let badgeClass = item.isFlag ? 'badge-flag' : (item.isPart ? (item.nameOrType.includes('Đầu') ? 'badge-head' : (item.nameOrType.includes('Áo') ? 'badge-body' : 'badge-leg')) : 'badge-info');

            tr.innerHTML = `
                <td style="color: var(--text-muted);">${index + 1}</td>
                <td style="font-family: 'JetBrains Mono'; font-weight: 600; color: #fff;">${item.oldId}</td>
                <td><span class="badge ${badgeClass}">${item.nameOrType}</span></td>
                <td style="text-align: center; color: var(--primary); font-weight: bold;">➔</td>
                <td style="font-family: 'JetBrains Mono'; font-weight: 700; color: #38bdf8;">${newId}</td>
                <td><span class="code-snippet" title="${item.detail.replace(/"/g, '&quot;')}">${item.detail}</span></td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('outputResultText').value = resultLines.join('\n');
        document.getElementById('tablePreviewContainer').style.display = 'block';
        document.getElementById('previewSummaryBadge').innerText = `${parsedItems.length} ô (Từ ${newStartId} đến ${newStartId + parsedItems.length - 1})`;
    }

    async function copyResultText() {
        const text = document.getElementById('outputResultText').value;
        if (!text || text.startsWith('⚠️')) {
            showToast('Chưa có kết quả để sao chép!', 'error');
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
            showToast(`Đã sao chép ${parsedItems.length} dòng kết quả vào Clipboard!`, 'success');
        } catch (e) {
            const el = document.getElementById('outputResultText');
            el.select();
            document.execCommand('copy');
            showToast('Đã sao chép kết quả vào Clipboard!', 'success');
        }
    }

    async function copyResultSql() {
        if (parsedItems.length === 0) {
            showToast('Chưa có dữ liệu để xuất SQL!', 'error');
            return;
        }
        const newStartId = parseInt(document.getElementById('targetNewStartId').value);
        if (isNaN(newStartId)) return;

        let sql = '';
        if (detectedTable === 'flag_bag') {
            const values = parsedItems.map((item, idx) => {
                const newId = newStartId + idx;
                const p = item.tabParts;
                // schema: id, icon_data, NAME, gold, gem, icon_id
                const iconData = (p[0] || '').replace(/'/g, "''");
                const name = (p[1] || 'flag_bag').replace(/'/g, "''");
                const gold = p[2] || -1;
                const gem = p[3] || -1;
                const iconId = p[4] || 0;
                return `(${newId}, '${iconData}', '${name}', ${gold}, ${gem}, ${iconId})`;
            });
            sql = `INSERT INTO \`flag_bag\` (\`id\`, \`icon_data\`, \`NAME\`, \`gold\`, \`gem\`, \`icon_id\`) VALUES\n` + values.join(',\n') + ';';
        } else if (detectedTable === 'part') {
            const values = parsedItems.map((item, idx) => {
                const newId = newStartId + idx;
                const p = item.tabParts;
                const type = p[0] || 0;
                const data = (p.slice(1).join('\t') || '').replace(/'/g, "''");
                return `(${newId}, ${type}, '${data}')`;
            });
            sql = `INSERT INTO \`part\` (\`id\`, \`TYPE\`, \`DATA\`) VALUES\n` + values.join(',\n') + ';';
        } else {
            showToast('Đã sao chép text dạng tab (khuyên dùng để dán vào phpMyAdmin)!', 'info');
            copyResultText();
            return;
        }

        try {
            await navigator.clipboard.writeText(sql);
            showToast(`Đã sao chép câu lệnh INSERT INTO \`${detectedTable}\` vào Clipboard!`, 'success');
        } catch (e) {
            showToast('Không thể sao chép SQL tự động!', 'error');
        }
    }

    // ================= TAB 2: TẠO Ô TỰ ĐỘNG =================

    function toggleCreateTableFields() {
        const table = document.getElementById('createTargetTable').value;
        const isPart = table === 'part';
        document.getElementById('partRuleWrap').style.display = isPart ? 'flex' : 'none';
        document.getElementById('flagRuleWrap').style.display = isPart ? 'none' : 'flex';
        
        if (isPart) {
            document.getElementById('createStartId').value = 1700;
        } else {
            document.getElementById('createStartId').value = 182;
        }
        syncCreateSlots();
    }

    function syncCreateSlots() {
        const start = parseInt(document.getElementById('createStartId').value) || 0;
        const count = parseInt(document.getElementById('createSlotCount').value) || 1;
        document.getElementById('createEndId').value = start + count - 1;
        document.getElementById('autoSlotCountBadge').innerText = count;
        generateAutoCreateSlots();
    }

    function syncCreateSlotsFromEnd() {
        const start = parseInt(document.getElementById('createStartId').value) || 0;
        const end = parseInt(document.getElementById('createEndId').value) || 0;
        if (end >= start) {
            const count = end - start + 1;
            document.getElementById('createSlotCount').value = count;
            document.getElementById('autoSlotCountBadge').innerText = count;
        }
        generateAutoCreateSlots();
    }

    function generateAutoCreateSlots() {
        const table = document.getElementById('createTargetTable').value;
        const start = parseInt(document.getElementById('createStartId').value) || 0;
        const count = parseInt(document.getElementById('createSlotCount').value) || 1;

        autoCreatedItems = [];
        const lines = [];

        if (table === 'flag_bag') {
            const baseName = document.getElementById('createFlagName').value.trim() || 'Cờ đeo lưng';
            for (let i = 0; i < count; i++) {
                const id = start + i;
                const name = count > 1 ? `${baseName} #${id}` : baseName;
                const iconData = '0, 0';
                const gold = -1;
                const gem = -1;
                const iconId = 0;

                autoCreatedItems.push({ id, icon_data: iconData, name, gold, gem, icon_id: iconId });
                lines.push(`${id}\t${iconData}\t${name}\t${gold}\t${gem}\t${iconId}`);
            }
        } else {
            const rule = document.getElementById('createTypeRule').value;
            const tplHead = '[[2955,0,0],[2955,0,0],[2955,0,0]]';
            const tplBody = '[[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0]]';
            const tplLeg = '[[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0]]';

            for (let i = 0; i < count; i++) {
                const id = start + i;
                let type = rule === 'cycle' ? (i % 3) : parseInt(rule);
                let data = type === 0 ? tplHead : (type === 1 ? tplBody : tplLeg);

                autoCreatedItems.push({ id, type, data });
                lines.push(`${id}\t${type}\t${data}`);
            }
        }

        document.getElementById('autoCreateOutputText').value = lines.join('\n');
    }

    async function copyAutoCreateText() {
        const text = document.getElementById('autoCreateOutputText').value;
        try {
            await navigator.clipboard.writeText(text);
            showToast(`Đã sao chép ${autoCreatedItems.length} dòng tự động vào Clipboard!`, 'success');
        } catch (e) {
            showToast('Đã chọn text để copy!', 'info');
        }
    }

    async function copyAutoCreateSql() {
        if (autoCreatedItems.length === 0) return;
        const table = document.getElementById('createTargetTable').value;
        let sql = '';

        if (table === 'flag_bag') {
            const values = autoCreatedItems.map(item => `(${item.id}, '${item.icon_data}', '${item.name}', ${item.gold}, ${item.gem}, ${item.icon_id})`);
            sql = `INSERT INTO \`flag_bag\` (\`id\`, \`icon_data\`, \`NAME\`, \`gold\`, \`gem\`, \`icon_id\`) VALUES\n` + values.join(',\n') + ';';
        } else {
            const values = autoCreatedItems.map(item => `(${item.id}, ${item.type}, '${item.data}')`);
            sql = `INSERT INTO \`part\` (\`id\`, \`TYPE\`, \`DATA\`) VALUES\n` + values.join(',\n') + ';';
        }

        try {
            await navigator.clipboard.writeText(sql);
            showToast('Đã sao chép lệnh INSERT SQL vào Clipboard!', 'success');
        } catch (e) {
            showToast('Không thể copy tự động!', 'error');
        }
    }

    async function insertAutoSlotsToDb() {
        if (autoCreatedItems.length === 0) return;
        const table = document.getElementById('createTargetTable').value;
        const overwrite = document.getElementById('overwriteDbCheck').checked;
        const count = autoCreatedItems.length;

        if (!confirm(`Xác nhận nạp ${count} ô vào bảng \`${table}\` trong Database XAMPP?`)) {
            return;
        }

        try {
            const res = await fetch('api.php?action=execute_create', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    table: table,
                    items: autoCreatedItems,
                    on_conflict: overwrite ? 'overwrite' : 'skip'
                })
            });
            const data = await res.json();
            if (data.success) {
                showToast(data.message, 'success');
            } else {
                showToast(data.error, 'error');
            }
        } catch (e) {
            showToast('Lỗi nạp DB: ' + e.message, 'error');
        }
    }

    // ================= TAB 3: XEM DB XAMPP =================
    async function loadDbRecords(page = 1) {
        const table = document.getElementById('dbSelectTable').value;
        const search = document.getElementById('dbSearchInput').value.trim();
        const thead = document.getElementById('dbRecordsThead');
        const tbody = document.getElementById('dbRecordsTableBody');

        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 25px; color: var(--text-muted);">Đang tải dữ liệu từ database...</td></tr>`;

        if (table === 'flag_bag') {
            thead.innerHTML = `
                <tr>
                    <th style="width: 80px;">ID</th>
                    <th style="width: 220px;">Tên Cờ (NAME)</th>
                    <th>Icon Data</th>
                    <th style="width: 90px;">Icon ID</th>
                    <th style="width: 100px; text-align: right;">Thao Tác</th>
                </tr>
            `;
        } else {
            thead.innerHTML = `
                <tr>
                    <th style="width: 80px;">ID</th>
                    <th style="width: 130px;">Loại (Type)</th>
                    <th>Dữ Liệu (Data)</th>
                    <th style="width: 100px; text-align: right;">Thao Tác</th>
                </tr>
            `;
        }

        try {
            const params = new URLSearchParams({
                action: 'list_records',
                table: table,
                page: page,
                limit: 30,
                search: search
            });
            const res = await fetch(`api.php?${params}`);
            const data = await res.json();

            if (!data.success || !data.data || data.data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: var(--text-muted);">Không tìm thấy bản ghi nào!</td></tr>`;
                return;
            }

            tbody.innerHTML = '';
            data.data.forEach(r => {
                const tr = document.createElement('tr');
                if (table === 'flag_bag') {
                    const rowText = `${r.id}\t${r.icon_data}\t${r.NAME}\t${r.gold}\t${r.gem}\t${r.icon_id}`;
                    tr.innerHTML = `
                        <td style="font-family: 'JetBrains Mono'; font-weight: bold; color: #fff;">${r.id}</td>
                        <td style="font-weight: 600; color: #c084fc;">${r.NAME}</td>
                        <td><span class="code-snippet" title="${r.icon_data}">${r.icon_data}</span></td>
                        <td><span class="badge badge-info">${r.icon_id}</span></td>
                        <td style="text-align: right;">
                            <button class="btn btn-sm btn-secondary" onclick="sendRowToChangeTab(\`${encodeURIComponent(rowText)}\`)">Dán vào Tool</button>
                        </td>
                    `;
                } else {
                    const type = parseInt(r.TYPE);
                    let typeBadge = type === 0 ? 'badge-head' : (type === 1 ? 'badge-body' : 'badge-leg');
                    let typeName = type === 0 ? 'Đầu (0)' : (type === 1 ? 'Áo (1)' : 'Quần (2)');
                    const rowText = `${r.id}\t${r.TYPE}\t${r.DATA}`;

                    tr.innerHTML = `
                        <td style="font-family: 'JetBrains Mono'; font-weight: bold; color: #fff;">${r.id}</td>
                        <td><span class="badge ${typeBadge}">${typeName}</span></td>
                        <td><span class="code-snippet" title="${r.DATA.replace(/"/g, '&quot;')}">${r.DATA}</span></td>
                        <td style="text-align: right;">
                            <button class="btn btn-sm btn-secondary" onclick="sendRowToChangeTab(\`${encodeURIComponent(rowText)}\`)">Dán vào Tool</button>
                        </td>
                    `;
                }
                tbody.appendChild(tr);
            });

            document.getElementById('dbPaginationInfo').innerText = `Trang ${data.pagination.page} / ${data.pagination.total_pages} (Tổng ${Number(data.pagination.total).toLocaleString()} ô)`;
            const btnContainer = document.getElementById('dbPaginationBtns');
            btnContainer.innerHTML = '';
            if (data.pagination.page > 1) {
                btnContainer.innerHTML += `<button class="btn btn-sm btn-secondary" onclick="loadDbRecords(${data.pagination.page - 1})">« Trước</button>`;
            }
            if (data.pagination.page < data.pagination.total_pages) {
                btnContainer.innerHTML += `<button class="btn btn-sm btn-secondary" onclick="loadDbRecords(${data.pagination.page + 1})">Sau »</button>`;
            }
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="5" style="color: var(--danger); text-align: center;">Lỗi tải: ${e.message}</td></tr>`;
        }
    }

    function sendRowToChangeTab(encText) {
        const line = decodeURIComponent(encText);
        const cur = document.getElementById('rawInputText').value.trim();
        document.getElementById('rawInputText').value = cur ? cur + '\n' + line : line;
        switchTab('tab-change-text');
        handleInputPaste();
        showToast('Đã thêm dòng dữ liệu vào ô dán!', 'success');
    }
</script>

</body>
</html>
