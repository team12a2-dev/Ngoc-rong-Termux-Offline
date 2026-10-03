import { useEffect, useState, useMemo, useCallback, useDeferredValue } from 'react';
import { api } from '../api';
import PageHeader from '../components/PageHeader';
import PageFeedback, { useFeedback } from '../components/PageFeedback';

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

const PREVIEW_PAGE_SIZE = 40;

export default function ToolPartPage() {
  const { feedback, setSuccess, setError, clearFeedback } = useFeedback();
  const [activeTab, setActiveTab] = useState('transform');

  // DB Stats
  const [stats, setStats] = useState({
    totalParts: 0,
    minPartId: 0,
    maxPartId: 0,
    totalFlagBag: 0,
    minFlagBagId: 0,
    maxFlagBagId: 0,
  });

  // Tab 1: Transform State
  const [rawInput, setRawInput] = useState('');
  const [targetStartId, setTargetStartId] = useState(182);
  const [previewPage, setPreviewPage] = useState(1);
  const [overwriteDbOnInsert, setOverwriteDbOnInsert] = useState(false);
  const [insertingDb, setInsertingDb] = useState(false);

  // Defer rawInput to prevent typing lag
  const deferredRawInput = useDeferredValue(rawInput);
  const deferredTargetStartId = useDeferredValue(targetStartId);

  // Tab 2: Auto Create State
  const [autoTable, setAutoTable] = useState('flag_bag');
  const [autoStartId, setAutoStartId] = useState(182);
  const [autoSlotCount, setAutoSlotCount] = useState(5);
  const [autoTypeRule, setAutoTypeRule] = useState('cycle');
  const [autoFlagName, setAutoFlagName] = useState('Cờ đeo lưng mới');
  const [autoOverwriteDb, setAutoOverwriteDb] = useState(false);
  const [autoInsertingDb, setAutoInsertingDb] = useState(false);

  // Tab 3: DB Lookup State
  const [dbTable, setDbTable] = useState('flag_bag');
  const [dbSearch, setDbSearch] = useState('');
  const [dbPage, setDbPage] = useState(1);
  const [dbData, setDbData] = useState([]);
  const [dbPagination, setDbPagination] = useState({ page: 1, limit: 30, total: 0, totalPages: 1 });
  const [dbLoading, setDbLoading] = useState(false);
  const [selectedDbRows, setSelectedDbRows] = useState(new Set());

  // Fetch stats on mount
  const fetchStats = useCallback(async () => {
    try {
      const res = await api('/tool-part/stats');
      if (res?.data) {
        setStats(res.data);
      }
    } catch (e) {
      console.warn('[ToolPart] Load stats failed:', e.message);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Load sample on mount
  useEffect(() => {
    setRawInput(SAMPLE_FLAG_BAG);
    setTargetStartId(182);
  }, []);

  // FAST Line Parser
  const parsedItems = useMemo(() => {
    if (!deferredRawInput.trim()) return [];
    const lines = deferredRawInput.split('\n');
    const results = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].replace(/\r$/, '');
      if (!line.trim()) continue;

      // Fast ID extraction without complex regex
      const firstTab = line.indexOf('\t');
      const firstSpace = line.search(/\s/);
      let sepIdx = -1;
      if (firstTab !== -1 && (firstSpace === -1 || firstTab <= firstSpace)) {
        sepIdx = firstTab;
      } else {
        sepIdx = firstSpace;
      }

      if (sepIdx > 0) {
        const idPart = line.slice(0, sepIdx).trim();
        const oldId = parseInt(idPart, 10);
        if (!isNaN(oldId)) {
          const sepChar = line[sepIdx];
          const restOfLine = line.slice(sepIdx + 1);

          let nameOrType = '';
          let detail = restOfLine;
          let isFlag = false;
          let isPart = false;

          const tabParts = restOfLine.split('\t');
          if (tabParts.length >= 2) {
            if (tabParts.length >= 4) {
              nameOrType = tabParts[1];
              detail = `Icons: ${tabParts[0].slice(0, 30)}... | IconID: ${tabParts[tabParts.length - 1]}`;
              isFlag = true;
            } else if (tabParts[0] === '0' || tabParts[0] === '1' || tabParts[0] === '2') {
              nameOrType = tabParts[0] === '0' ? 'Đầu (0)' : (tabParts[0] === '1' ? 'Áo (1)' : 'Quần (2)');
              detail = tabParts[1];
              isPart = true;
            }
          } else {
            const spParts = restOfLine.match(/^(\d+)\s+(.*)$/);
            if (spParts && (spParts[1] === '0' || spParts[1] === '1' || spParts[1] === '2')) {
              nameOrType = spParts[1] === '0' ? 'Đầu (0)' : (spParts[1] === '1' ? 'Áo (1)' : 'Quần (2)');
              detail = spParts[2];
              isPart = true;
            }
          }

          results.push({
            oldId,
            separator: sepChar,
            restOfLine,
            nameOrType: nameOrType || 'Dữ liệu',
            detail,
            isFlag,
            isPart,
            tabParts,
          });
        }
      }
    }
    return results;
  }, [deferredRawInput]);

  // Detected Type & First ID
  const detectedInfo = useMemo(() => {
    if (parsedItems.length === 0) {
      return { firstId: null, tableType: 'unknown', label: 'Chưa có dữ liệu', count: 0 };
    }
    const firstId = parsedItems[0].oldId;
    let flagCount = 0;
    let partCount = 0;
    for (let i = 0; i < Math.min(parsedItems.length, 50); i++) {
      if (parsedItems[i].isFlag) flagCount++;
      if (parsedItems[i].isPart) partCount++;
    }

    let tableType = 'generic';
    let label = '🌐 Bảng chung';
    if (flagCount > partCount) {
      tableType = 'flag_bag';
      label = '🎒 Flag_Bag (Cờ đeo lưng)';
    } else if (partCount > 0) {
      tableType = 'part';
      label = '🥋 Part (Đầu/Áo/Quần)';
    }

    return { firstId, tableType, label, count: parsedItems.length };
  }, [parsedItems]);

  // Instant Output Text Generation (Sub-millisecond)
  const transformedResult = useMemo(() => {
    if (parsedItems.length === 0 || isNaN(deferredTargetStartId)) {
      return { text: '', totalRows: 0, itemsForDb: [] };
    }

    const lines = new Array(parsedItems.length);
    const itemsForDb = [];
    const isFlag = detectedInfo.tableType === 'flag_bag';
    const isPart = detectedInfo.tableType === 'part';

    for (let i = 0; i < parsedItems.length; i++) {
      const item = parsedItems[i];
      const newId = deferredTargetStartId + i;
      lines[i] = `${newId}${item.separator}${item.restOfLine}`;

      if (isFlag) {
        const p = item.tabParts;
        itemsForDb.push({
          id: newId,
          icon_data: p[0] || '0, 0',
          name: p[1] || 'flag_bag',
          gold: parseInt(p[2] || -1, 10),
          gem: parseInt(p[3] || -1, 10),
          icon_id: parseInt(p[4] || 0, 10),
        });
      } else if (isPart) {
        const p = item.tabParts;
        const type = parseInt(p[0] || 0, 10);
        const data = p.slice(1).join('\t') || item.detail;
        itemsForDb.push({
          id: newId,
          type,
          data,
        });
      }
    }

    return { text: lines.join('\n'), totalRows: parsedItems.length, itemsForDb };
  }, [parsedItems, deferredTargetStartId, detectedInfo.tableType]);

  // Paginated Preview Rows (Prevents rendering 2,000 DOM nodes)
  const previewSlice = useMemo(() => {
    if (parsedItems.length === 0 || isNaN(deferredTargetStartId)) return [];
    const startIdx = (previewPage - 1) * PREVIEW_PAGE_SIZE;
    const endIdx = Math.min(startIdx + PREVIEW_PAGE_SIZE, parsedItems.length);
    const slice = [];

    for (let i = startIdx; i < endIdx; i++) {
      const item = parsedItems[i];
      const newId = deferredTargetStartId + i;
      slice.push({
        stt: i + 1,
        oldId: item.oldId,
        newId,
        nameOrType: item.nameOrType,
        detail: item.detail,
        isFlag: item.isFlag,
      });
    }
    return slice;
  }, [parsedItems, deferredTargetStartId, previewPage]);

  const totalPreviewPages = Math.ceil(parsedItems.length / PREVIEW_PAGE_SIZE) || 1;

  // Copy Clipboard Helper
  const copyToClipboard = async (text, successMsg) => {
    if (!text) {
      setError('Chưa có nội dung để sao chép!');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setSuccess(successMsg);
    } catch {
      setError('Không thể tự động sao chép vào bộ nhớ đệm!');
    }
  };

  // Generate SQL INSERT for Tab 1
  const getTransformSql = () => {
    if (parsedItems.length === 0 || isNaN(targetStartId)) return '';
    if (detectedInfo.tableType === 'flag_bag') {
      const values = parsedItems.map((item, idx) => {
        const newId = targetStartId + idx;
        const p = item.tabParts;
        const iconData = (p[0] || '').replace(/'/g, "''");
        const name = (p[1] || 'flag_bag').replace(/'/g, "''");
        const gold = p[2] || -1;
        const gem = p[3] || -1;
        const iconId = p[4] || 0;
        return `(${newId}, '${iconData}', '${name}', ${gold}, ${gem}, ${iconId})`;
      });
      return `INSERT INTO \`flag_bag\` (\`id\`, \`icon_data\`, \`NAME\`, \`gold\`, \`gem\`, \`icon_id\`) VALUES\n${values.join(',\n')};`;
    }
    if (detectedInfo.tableType === 'part') {
      const values = parsedItems.map((item, idx) => {
        const newId = targetStartId + idx;
        const p = item.tabParts;
        const type = p[0] || 0;
        const data = (p.slice(1).join('\t') || '').replace(/'/g, "''");
        return `(${newId}, ${type}, '${data}')`;
      });
      return `INSERT INTO \`part\` (\`id\`, \`TYPE\`, \`DATA\`) VALUES\n${values.join(',\n')};`;
    }
    return transformedResult.text;
  };

  // Insert Tab 1 results into Server DB
  const handleInsertTransformToDb = async () => {
    if (transformedResult.itemsForDb.length === 0) {
      setError('Không có dữ liệu hợp lệ để nạp vào DB!');
      return;
    }
    if (!window.confirm(`Xác nhận nạp siêu tốc ${transformedResult.itemsForDb.length} ô vào bảng \`${detectedInfo.tableType}\` trên Server hiện tại?`)) {
      return;
    }

    setInsertingDb(true);
    clearFeedback();
    try {
      const res = await api('/tool-part/insert-batch', {
        method: 'POST',
        body: JSON.stringify({
          table: detectedInfo.tableType,
          items: transformedResult.itemsForDb,
          onConflict: overwriteDbOnInsert ? 'overwrite' : 'skip',
        }),
      });
      if (res?.data) {
        setSuccess(res.data.message);
        fetchStats();
      }
    } catch (e) {
      setError(`Lỗi khi nạp vào DB: ${e.message}`);
    } finally {
      setInsertingDb(false);
    }
  };

  // ================= TAB 2: AUTO CREATE =================
  const autoCreatedSlots = useMemo(() => {
    const count = Math.max(1, parseInt(autoSlotCount, 10) || 1);
    const start = parseInt(autoStartId, 10) || 0;
    const lines = [];
    const items = [];

    if (autoTable === 'flag_bag') {
      const baseName = autoFlagName.trim() || 'Cờ đeo lưng';
      for (let i = 0; i < count; i++) {
        const id = start + i;
        const name = count > 1 ? `${baseName} #${id}` : baseName;
        const iconData = '0, 0';
        const gold = -1;
        const gem = -1;
        const iconId = 0;
        items.push({ id, icon_data: iconData, name, gold, gem, icon_id: iconId });
        lines.push(`${id}\t${iconData}\t${name}\t${gold}\t${gem}\t${iconId}`);
      }
    } else {
      const tplHead = '[[2955,0,0],[2955,0,0],[2955,0,0]]';
      const tplBody = '[[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0]]';
      const tplLeg = '[[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0],[2955,0,0]]';

      for (let i = 0; i < count; i++) {
        const id = start + i;
        const type = autoTypeRule === 'cycle' ? (i % 3) : parseInt(autoTypeRule, 10);
        const data = type === 0 ? tplHead : (type === 1 ? tplBody : tplLeg);
        items.push({ id, type, data });
        lines.push(`${id}\t${type}\t${data}`);
      }
    }

    return { linesText: lines.join('\n'), items, count };
  }, [autoTable, autoStartId, autoSlotCount, autoTypeRule, autoFlagName]);

  const getAutoCreateSql = () => {
    if (autoCreatedSlots.items.length === 0) return '';
    if (autoTable === 'flag_bag') {
      const values = autoCreatedSlots.items.map(
        (item) => `(${item.id}, '${item.icon_data}', '${item.name.replace(/'/g, "''")}', ${item.gold}, ${item.gem}, ${item.icon_id})`
      );
      return `INSERT INTO \`flag_bag\` (\`id\`, \`icon_data\`, \`NAME\`, \`gold\`, \`gem\`, \`icon_id\`) VALUES\n${values.join(',\n')};`;
    }
    const values = autoCreatedSlots.items.map(
      (item) => `(${item.id}, ${item.type}, '${item.data.replace(/'/g, "''")}')`
    );
    return `INSERT INTO \`part\` (\`id\`, \`TYPE\`, \`DATA\`) VALUES\n${values.join(',\n')};`;
  };

  const handleInsertAutoToDb = async () => {
    if (autoCreatedSlots.items.length === 0) return;
    if (!window.confirm(`Xác nhận nạp ${autoCreatedSlots.count} ô vào bảng \`${autoTable}\` trên Server hiện tại?`)) {
      return;
    }

    setAutoInsertingDb(true);
    clearFeedback();
    try {
      const res = await api('/tool-part/insert-batch', {
        method: 'POST',
        body: JSON.stringify({
          table: autoTable,
          items: autoCreatedSlots.items,
          onConflict: autoOverwriteDb ? 'overwrite' : 'skip',
        }),
      });
      if (res?.data) {
        setSuccess(res.data.message);
        fetchStats();
      }
    } catch (e) {
      setError(`Lỗi nạp DB: ${e.message}`);
    } finally {
      setAutoInsertingDb(false);
    }
  };

  // ================= TAB 3: DB LOOKUP =================
  const loadDbRecords = useCallback(async (page = 1) => {
    setDbLoading(true);
    setSelectedDbRows(new Set());
    try {
      const params = new URLSearchParams({
        table: dbTable,
        page: String(page),
        limit: '30',
        search: dbSearch.trim(),
      });
      const res = await api(`/tool-part/records?${params.toString()}`);
      if (res?.data) {
        setDbData(res.data.records || []);
        setDbPagination(res.data.pagination || { page: 1, limit: 30, total: 0, totalPages: 1 });
        setDbPage(page);
      }
    } catch (e) {
      setError(`Lỗi tra cứu DB: ${e.message}`);
    } finally {
      setDbLoading(false);
    }
  }, [dbTable, dbSearch, setError]);

  useEffect(() => {
    if (activeTab === 'db-lookup') {
      loadDbRecords(1);
    }
  }, [activeTab, dbTable, loadDbRecords]);

  // Send Single Row to Tab 1
  const sendRowToTab1 = (row) => {
    let line = '';
    if (dbTable === 'flag_bag') {
      line = `${row.id}\t${row.icon_data}\t${row.NAME}\t${row.gold}\t${row.gem}\t${row.icon_id}`;
    } else {
      line = `${row.id}\t${row.TYPE}\t${row.DATA}`;
    }
    const current = rawInput.trim();
    setRawInput(current ? `${current}\n${line}` : line);
    setActiveTab('transform');
    setSuccess(`Đã chuyển ID ${row.id} sang Tab Đổi ID!`);
  };

  // Send Selected Rows to Tab 1
  const sendSelectedRowsToTab1 = () => {
    if (selectedDbRows.size === 0) {
      setError('Vui lòng tích chọn ít nhất 1 dòng để chuyển!');
      return;
    }
    const selectedRows = dbData.filter((r) => selectedDbRows.has(r.id));
    const lines = selectedRows.map((r) => {
      if (dbTable === 'flag_bag') {
        return `${r.id}\t${r.icon_data}\t${r.NAME}\t${r.gold}\t${r.gem}\t${r.icon_id}`;
      }
      return `${r.id}\t${r.TYPE}\t${r.DATA}`;
    });

    const current = rawInput.trim();
    setRawInput(current ? `${current}\n${lines.join('\n')}` : lines.join('\n'));
    setActiveTab('transform');
    setSuccess(`Đã chuyển ${selectedRows.length} dòng được chọn sang Tab Đổi ID!`);
  };

  const toggleSelectRow = (id) => {
    setSelectedDbRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllDb = () => {
    if (selectedDbRows.size === dbData.length && dbData.length > 0) {
      setSelectedDbRows(new Set());
    } else {
      setSelectedDbRows(new Set(dbData.map((r) => r.id)));
    }
  };

  return (
    <div className="tool-part-page" style={{ paddingBottom: '40px' }}>
      <PageHeader
        title="Tool Đổi ID & Tạo Ô Part + Cờ (Flag Bag)"
        subtitle="Hỗ trợ đổi ID hàng loạt không can thiệp DB, tạo ô tự động và tra cứu nhanh bảng Part & Flag Bag"
      />

      <PageFeedback feedback={feedback} />

      {/* STATS CHIPS BAR */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <div className="card" style={{ padding: '14px 18px', background: 'rgba(26, 35, 50, 0.75)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.8rem', color: '#93c5fd', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
            🥋 Bảng Part (Đầu / Áo / Quần)
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '6px' }}>
            <span style={{ fontSize: '1.45rem', fontWeight: 700, color: '#fff', fontFamily: 'JetBrains Mono, monospace' }}>
              {stats.totalParts.toLocaleString()} <span style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 400 }}>ô</span>
            </span>
            <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace' }}>
              (Max ID: <strong>{stats.maxPartId}</strong>)
            </span>
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px', background: 'rgba(26, 35, 50, 0.75)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.8rem', color: '#c084fc', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
            🎒 Bảng Flag_Bag (Cờ Đeo Lưng)
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '6px' }}>
            <span style={{ fontSize: '1.45rem', fontWeight: 700, color: '#fff', fontFamily: 'JetBrains Mono, monospace' }}>
              {stats.totalFlagBag.toLocaleString()} <span style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 400 }}>ô</span>
            </span>
            <span style={{ fontSize: '0.8rem', color: '#e879f9', fontFamily: 'JetBrains Mono, monospace' }}>
              (Max ID: <strong>{stats.maxFlagBagId}</strong>)
            </span>
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.8rem' }}>⚡</span>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#34d399' }}>Xử Lý Siêu Tốc & An Toàn</div>
            <div style={{ fontSize: '0.78rem', color: '#a7f3d0' }}>
              Thuật toán xử lý tức thì hàng ngàn dòng, không gây giật lag trình duyệt.
            </div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          background: 'rgba(15, 20, 28, 0.7)',
          padding: '6px',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          marginBottom: '20px',
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          className={`btn ${activeTab === 'transform' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '10px 18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setActiveTab('transform')}
        >
          <span>🔄</span> Đổi ID Hàng Loạt (Part & Flag Bag)
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'auto-create' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '10px 18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setActiveTab('auto-create')}
        >
          <span>➕</span> Tạo Ô Tự Động (Part & Flag Bag)
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'db-lookup' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '10px 18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setActiveTab('db-lookup')}
        >
          <span>📋</span> Tra Cứu Dữ Liệu DB Server
        </button>
      </div>

      {/* ================= TAB 1: TRANSFORM ================= */}
      {activeTab === 'transform' && (
        <div className="card" style={{ padding: '22px', background: 'var(--card-glass)', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🔄</span> Đổi ID Hàng Loạt Từ Dữ Liệu Dán (Part / Flag_Bag)
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--muted)' }}>
                Dán dữ liệu từ phpMyAdmin / bảng text vào khung bên trái. Tool tự động bắt ID đầu tiên, phân loại bảng và sinh kết quả chuẩn 100%.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  setRawInput(SAMPLE_FLAG_BAG);
                  setTargetStartId(182);
                  setPreviewPage(1);
                  setSuccess('Đã dán mẫu Flag_Bag (ID 149..181)!');
                }}
              >
                🎒 Dán mẫu Flag_Bag (149..181)
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  setRawInput(SAMPLE_PART);
                  setTargetStartId(1880);
                  setPreviewPage(1);
                  setSuccess('Đã dán mẫu Part (ID 1954..1956)!');
                }}
              >
                🥋 Dán mẫu Part (1954..1956)
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  setRawInput('');
                  setTargetStartId(200);
                  setPreviewPage(1);
                  clearFeedback();
                }}
              >
                🧹 Xóa trắng
              </button>
            </div>
          </div>

          {/* CONTROLS BAR */}
          <div
            style={{
              background: 'rgba(11, 16, 26, 0.85)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '14px 18px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: '#d1d5db', fontWeight: 600 }}>🔍 ID đầu tiên phát hiện:</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.15rem', fontWeight: 700, color: '#f59e0b' }}>
                {detectedInfo.firstId !== null ? detectedInfo.firstId : '--'}
              </span>
              {detectedInfo.tableType !== 'unknown' && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: detectedInfo.tableType === 'flag_bag' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                    color: detectedInfo.tableType === 'flag_bag' ? '#c084fc' : '#38bdf8',
                    border: `1px solid ${detectedInfo.tableType === 'flag_bag' ? 'rgba(168, 85, 247, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`,
                    fontWeight: 600,
                  }}
                >
                  {detectedInfo.label}
                </span>
              )}
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: 'rgba(99, 102, 241, 0.2)',
                  color: '#a5b4fc',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  fontWeight: 600,
                }}
              >
                {detectedInfo.count.toLocaleString()} dòng
              </span>
            </div>

            <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.12)', margin: '0 4px' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <label htmlFor="targetStartIdInput" style={{ fontSize: '0.85rem', color: '#e5e7eb', fontWeight: 600 }}>
                🎯 Nhập ID MỚI muốn đổi thành:
              </label>
              <input
                id="targetStartIdInput"
                type="number"
                className="form-control"
                style={{
                  width: '130px',
                  background: '#070b12',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  color: '#fff',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  padding: '6px 12px',
                  borderRadius: '6px',
                }}
                value={targetStartId}
                onChange={(e) => {
                  setTargetStartId(parseInt(e.target.value, 10) || 0);
                  setPreviewPage(1);
                }}
              />
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                title="Lấy Max ID + 1 từ Server DB"
                onClick={() => {
                  if (detectedInfo.tableType === 'part') {
                    setTargetStartId(stats.maxPartId + 1);
                  } else if (detectedInfo.tableType === 'flag_bag') {
                    setTargetStartId(stats.maxFlagBagId + 1);
                  }
                }}
              >
                Gợi ý Max+1
              </button>
            </div>
          </div>

          {/* TWO TEXTAREAS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '18px',
              marginBottom: '18px',
            }}
          >
            {/* Input Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem', fontWeight: 600, color: '#9ca3af' }}>
                <span>📥 DÁN DỮ LIỆU GỐC VÀO ĐÂY:</span>
                <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Giữ nguyên tab và khoảng trắng</span>
              </div>
              <textarea
                value={rawInput}
                onChange={(e) => {
                  setRawInput(e.target.value);
                  setPreviewPage(1);
                }}
                placeholder="Dán các dòng dữ liệu vào đây..."
                rows={12}
                style={{
                  width: '100%',
                  background: '#080c14',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  color: '#f3f4f6',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.82rem',
                  lineHeight: 1.5,
                  padding: '12px 14px',
                  resize: 'vertical',
                  whiteSpace: 'pre',
                  overflowX: 'auto',
                }}
              />
            </div>

            {/* Output Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem', fontWeight: 600, color: '#38bdf8' }}>
                <span>📤 KẾT QUẢ ĐÃ ĐỔI ID MỚI:</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    onClick={() => copyToClipboard(transformedResult.text, `Đã sao chép ${parsedItems.length} dòng kết quả vào Clipboard!`)}
                  >
                    📋 Sao Chép Text
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    onClick={() => copyToClipboard(getTransformSql(), `Đã sao chép câu lệnh INSERT SQL vào Clipboard!`)}
                  >
                    💾 Sao Chép SQL
                  </button>
                </div>
              </div>
              <textarea
                value={transformedResult.text}
                readOnly
                placeholder="Kết quả sau khi đổi ID sẽ xuất hiện ở đây..."
                rows={12}
                style={{
                  width: '100%',
                  background: '#05080f',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '8px',
                  color: '#38bdf8',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.82rem',
                  lineHeight: 1.5,
                  padding: '12px 14px',
                  resize: 'vertical',
                  whiteSpace: 'pre',
                  overflowX: 'auto',
                }}
              />
            </div>
          </div>

          {/* ACTIONS & DIRECT DB INSERT BAR */}
          {transformedResult.totalRows > 0 && detectedInfo.tableType !== 'generic' && (
            <div
              style={{
                background: 'rgba(26, 35, 50, 0.6)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '10px',
                padding: '12px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '0.88rem', color: '#e5e7eb', fontWeight: 600 }}>
                  ⚡ Nạp trực tiếp {transformedResult.totalRows.toLocaleString()} ô vào Server DB:
                </span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#f59e0b', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={overwriteDbOnInsert}
                    onChange={(e) => setOverwriteDbOnInsert(e.target.checked)}
                    style={{ accentColor: '#f59e0b' }}
                  />
                  Ghi đè nếu ID đã tồn tại
                </label>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={insertingDb}
                onClick={handleInsertTransformToDb}
                style={{ padding: '8px 18px', fontWeight: 700 }}
              >
                {insertingDb ? '⏳ Đang nạp vào DB...' : `📥 Nạp ${transformedResult.totalRows.toLocaleString()} ô vào Server DB`}
              </button>
            </div>
          )}

          {/* TABLE PREVIEW COMPARISON (PAGINATED FOR MAXIMUM PERFORMANCE) */}
          {previewSlice.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, color: '#fff', fontSize: '0.95rem' }}>
                  Bảng So Sánh Chi Tiết (Trước ➔ Sau):
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'rgba(56, 189, 248, 0.2)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      fontWeight: 600,
                    }}
                  >
                    Tổng {transformedResult.totalRows.toLocaleString()} ô (Từ ID {targetStartId} đến {targetStartId + transformedResult.totalRows - 1})
                  </span>
                  {totalPreviewPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        disabled={previewPage <= 1}
                        onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                        style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                      >
                        «
                      </button>
                      <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                        {previewPage} / {totalPreviewPages}
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        disabled={previewPage >= totalPreviewPages}
                        onClick={() => setPreviewPage((p) => Math.min(totalPreviewPages, p + 1))}
                        style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                      >
                        »
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px', maxHeight: '320px', background: '#090d16' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.04)', color: '#9ca3af', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '8px 12px', width: '50px' }}>#</th>
                      <th style={{ padding: '8px 12px', width: '110px' }}>ID Cũ</th>
                      <th style={{ padding: '8px 12px', width: '220px' }}>Tên / Phân Loại</th>
                      <th style={{ padding: '8px 12px', width: '40px', textAlign: 'center' }}></th>
                      <th style={{ padding: '8px 12px', width: '110px' }}>ID MỚI</th>
                      <th style={{ padding: '8px 12px' }}>Chi Tiết Dữ Liệu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewSlice.map((row) => (
                      <tr key={row.stt} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '8px 12px', color: '#6b7280' }}>{row.stt}</td>
                        <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#fff' }}>
                          {row.oldId}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: row.isFlag ? 'rgba(168, 85, 247, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                              color: row.isFlag ? '#c084fc' : '#38bdf8',
                              border: `1px solid ${row.isFlag ? 'rgba(168, 85, 247, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`,
                            }}
                          >
                            {row.nameOrType}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#f59e0b', fontWeight: 'bold' }}>➔</td>
                        <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#38bdf8' }}>
                          {row.newId}
                        </td>
                        <td style={{ padding: '8px 12px', maxWidth: '450px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem' }} title={row.detail}>
                          {row.detail}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: AUTO CREATE ================= */}
      {activeTab === 'auto-create' && (
        <div className="card" style={{ padding: '22px', background: 'var(--card-glass)', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>➕</span> Tạo Ô Tự Động (Part & Flag_Bag)
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--muted)' }}>
                Nhập ID bắt đầu và số lượng ô cần tạo. Tool sẽ sinh cấu trúc dữ liệu chuẩn để copy hoặc nạp thẳng vào DB Server.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: '#d1d5db', fontWeight: 600 }}>Bảng cần tạo:</span>
              <select
                className="form-control"
                style={{ background: '#080c14', color: '#fff', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                value={autoTable}
                onChange={(e) => {
                  const t = e.target.value;
                  setAutoTable(t);
                  if (t === 'part') {
                    setAutoStartId(stats.maxPartId > 0 ? stats.maxPartId + 1 : 1700);
                  } else {
                    setAutoStartId(stats.maxFlagBagId > 0 ? stats.maxFlagBagId + 1 : 182);
                  }
                }}
              >
                <option value="flag_bag">🎒 Bảng Flag_Bag (Cờ đeo lưng)</option>
                <option value="part">🥋 Bảng Part (Đầu / Áo / Quần)</option>
              </select>
            </div>
          </div>

          {/* AUTO CREATE CONTROLS */}
          <div
            style={{
              background: 'rgba(11, 16, 26, 0.85)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '16px 20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <div>
              <label htmlFor="autoStartIdInput" style={{ display: 'block', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '6px', fontWeight: 600 }}>
                Từ ID bắt đầu:
              </label>
              <input
                id="autoStartIdInput"
                type="number"
                className="form-control"
                style={{ width: '100%', background: '#070b12', color: '#fff', fontFamily: 'JetBrains Mono, monospace', padding: '6px 10px', borderRadius: '6px' }}
                value={autoStartId}
                onChange={(e) => setAutoStartId(parseInt(e.target.value, 10) || 0)}
              />
            </div>

            <div>
              <label htmlFor="autoSlotCountInput" style={{ display: 'block', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '6px', fontWeight: 600 }}>
                Số ô muốn tạo:
              </label>
              <input
                id="autoSlotCountInput"
                type="number"
                min="1"
                max="5000"
                className="form-control"
                style={{ width: '100%', background: '#070b12', color: '#fff', fontFamily: 'JetBrains Mono, monospace', padding: '6px 10px', borderRadius: '6px' }}
                value={autoSlotCount}
                onChange={(e) => setAutoSlotCount(parseInt(e.target.value, 10) || 1)}
              />
            </div>

            <div>
              <label htmlFor="autoEndIdInput" style={{ display: 'block', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '6px', fontWeight: 600 }}>
                Đến ID (tự tính):
              </label>
              <input
                id="autoEndIdInput"
                type="number"
                readOnly
                className="form-control"
                style={{ width: '100%', background: '#070b12', color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, padding: '6px 10px', borderRadius: '6px' }}
                value={autoStartId + autoSlotCount - 1}
              />
            </div>

            {autoTable === 'part' ? (
              <div>
                <label htmlFor="autoTypeRuleSelect" style={{ display: 'block', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '6px', fontWeight: 600 }}>
                  Quy tắc Type Part:
                </label>
                <select
                  id="autoTypeRuleSelect"
                  className="form-control"
                  style={{ width: '100%', background: '#070b12', color: '#fff', padding: '6px 10px', borderRadius: '6px' }}
                  value={autoTypeRule}
                  onChange={(e) => setAutoTypeRule(e.target.value)}
                >
                  <option value="cycle">🔄 Tuần hoàn 0 (Đầu) ➔ 1 (Áo) ➔ 2 (Quần)</option>
                  <option value="0">Tất cả Type 0 (Đầu)</option>
                  <option value="1">Tất cả Type 1 (Áo)</option>
                  <option value="2">Tất cả Type 2 (Quần)</option>
                </select>
              </div>
            ) : (
              <div>
                <label htmlFor="autoFlagNameInput" style={{ display: 'block', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '6px', fontWeight: 600 }}>
                  Tên mẫu Flag_Bag:
                </label>
                <input
                  id="autoFlagNameInput"
                  type="text"
                  className="form-control"
                  style={{ width: '100%', background: '#070b12', color: '#fff', padding: '6px 10px', borderRadius: '6px' }}
                  value={autoFlagName}
                  onChange={(e) => setAutoFlagName(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* AUTO CREATE RESULT */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem', fontWeight: 600, color: '#38bdf8' }}>
                <span>📋 DỮ LIỆU ĐÃ TỰ ĐỘNG SINH ({autoCreatedSlots.count.toLocaleString()} Ô):</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    onClick={() => copyToClipboard(autoCreatedSlots.linesText, `Đã sao chép ${autoCreatedSlots.count} dòng text vào Clipboard!`)}
                  >
                    📋 Sao Chép Text
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    onClick={() => copyToClipboard(getAutoCreateSql(), `Đã sao chép câu lệnh INSERT SQL vào Clipboard!`)}
                  >
                    💾 Sao Chép SQL
                  </button>
                </div>
              </div>
              <textarea
                value={autoCreatedSlots.linesText}
                readOnly
                rows={10}
                style={{
                  width: '100%',
                  background: '#05080f',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '8px',
                  color: '#38bdf8',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.82rem',
                  lineHeight: 1.5,
                  padding: '12px 14px',
                  resize: 'vertical',
                  whiteSpace: 'pre',
                  overflowX: 'auto',
                }}
              />
            </div>

            <div style={{ background: 'rgba(11, 16, 26, 0.85)', border: '1px solid var(--border)', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ margin: '0 0 10px', color: '#fff', fontSize: '0.95rem' }}>
                  ⚡ Nạp siêu tốc vào Database Server
                </h4>
                <p style={{ fontSize: '0.84rem', color: '#d1d5db', lineHeight: 1.5, margin: '0 0 14px' }}>
                  Bạn có thể sao chép phần text hoặc SQL để nạp thủ công. Hoặc bấm nút bên dưới để Panel nạp siêu tốc trực tiếp vào database server:
                </p>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: '#f59e0b', cursor: 'pointer', marginBottom: '14px' }}>
                  <input
                    type="checkbox"
                    checked={autoOverwriteDb}
                    onChange={(e) => setAutoOverwriteDb(e.target.checked)}
                    style={{ accentColor: '#f59e0b' }}
                  />
                  Nếu ID đã có trong DB thì ghi đè (thay thế)
                </label>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                disabled={autoInsertingDb}
                onClick={handleInsertAutoToDb}
                style={{ width: '100%', justifyContent: 'center', padding: '10px 20px', fontWeight: 700 }}
              >
                {autoInsertingDb ? '⏳ Đang nạp vào DB...' : `📥 Nạp ${autoCreatedSlots.count.toLocaleString()} Ô Vào Database Server`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: DB LOOKUP ================= */}
      {activeTab === 'db-lookup' && (
        <div className="card" style={{ padding: '22px', background: 'var(--card-glass)', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📋</span> Tra Cứu & Lấy Dữ Liệu Từ Database Server
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--muted)' }}>
                Xem danh sách part hoặc flag_bag hiện có trên database và 1-click đưa sang Tool Đổi ID.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                className="form-control"
                style={{ background: '#080c14', color: '#fff', padding: '6px 12px', borderRadius: '6px' }}
                value={dbTable}
                onChange={(e) => setDbTable(e.target.value)}
              >
                <option value="flag_bag">🎒 Bảng flag_bag</option>
                <option value="part">🥋 Bảng part</option>
              </select>

              <input
                type="text"
                className="form-control"
                style={{ width: '220px', background: '#080c14', color: '#fff', padding: '6px 12px', borderRadius: '6px' }}
                placeholder="Tìm ID hoặc dải (VD: 140-185)..."
                value={dbSearch}
                onChange={(e) => setDbSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadDbRecords(1);
                }}
              />

              <button type="button" className="btn btn-sm btn-primary" onClick={() => loadDbRecords(1)}>
                🔎 Tìm
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  setDbSearch('');
                  loadDbRecords(1);
                }}
              >
                🔄 Tải lại
              </button>
              {selectedDbRows.size > 0 && (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
                  onClick={sendSelectedRowsToTab1}
                >
                  🚀 Đưa {selectedDbRows.size} dòng đã chọn sang Tool Đổi ID
                </button>
              )}
            </div>
          </div>

          {/* TABLE OF DB RECORDS */}
          <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px', background: '#090d16' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', color: '#9ca3af', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedDbRows.size === dbData.length && dbData.length > 0}
                      onChange={toggleSelectAllDb}
                      style={{ accentColor: '#3b82f6' }}
                    />
                  </th>
                  <th style={{ padding: '10px 12px', width: '80px' }}>ID</th>
                  {dbTable === 'flag_bag' ? (
                    <>
                      <th style={{ padding: '10px 12px', width: '220px' }}>Tên Cờ (NAME)</th>
                      <th style={{ padding: '10px 12px' }}>Icon Data</th>
                      <th style={{ padding: '10px 12px', width: '90px' }}>Icon ID</th>
                    </>
                  ) : (
                    <>
                      <th style={{ padding: '10px 12px', width: '130px' }}>Loại (Type)</th>
                      <th style={{ padding: '10px 12px' }}>Dữ Liệu Khung Hình (DATA)</th>
                    </>
                  )}
                  <th style={{ padding: '10px 12px', width: '120px', textAlign: 'right' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {dbLoading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                      ⏳ Đang tải dữ liệu từ server database...
                    </td>
                  </tr>
                ) : dbData.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                      Không tìm thấy bản ghi nào khớp với điều kiện tìm kiếm!
                    </td>
                  </tr>
                ) : (
                  dbData.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedDbRows.has(row.id)}
                          onChange={() => toggleSelectRow(row.id)}
                          style={{ accentColor: '#3b82f6' }}
                        />
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#fff' }}>
                        {row.id}
                      </td>
                      {dbTable === 'flag_bag' ? (
                        <>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#c084fc' }}>{row.NAME}</td>
                          <td style={{ padding: '8px 12px', maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem' }} title={row.icon_data}>
                            {row.icon_data}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ padding: '2px 6px', background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                              {row.icon_id}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '8px 12px' }}>
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: row.TYPE === 0 ? 'rgba(56, 189, 248, 0.2)' : row.TYPE === 1 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                color: row.TYPE === 0 ? '#38bdf8' : row.TYPE === 1 ? '#34d399' : '#fbbf24',
                              }}
                            >
                              {row.TYPE === 0 ? 'Đầu (0)' : row.TYPE === 1 ? 'Áo (1)' : 'Quần (2)'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem' }} title={row.DATA}>
                            {row.DATA}
                          </td>
                        </>
                      )}
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          onClick={() => sendRowToTab1(row)}
                        >
                          Dán vào Tool
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '0.85rem', color: 'var(--muted)' }}>
            <div>
              Trang {dbPagination.page} / {dbPagination.totalPages} (Tổng {Number(dbPagination.total).toLocaleString()} ô)
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={dbPage <= 1 || dbLoading}
                onClick={() => loadDbRecords(dbPage - 1)}
              >
                « Trước
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={dbPage >= dbPagination.totalPages || dbLoading}
                onClick={() => loadDbRecords(dbPage + 1)}
              >
                Sau »
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
