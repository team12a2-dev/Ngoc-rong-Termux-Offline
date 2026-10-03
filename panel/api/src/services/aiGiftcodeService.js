import { query } from '../db.js';

/**
 * Trích xuất JSON từ phản hồi dạng text hoặc markdown của LLM
 */
export function extractJsonFromText(text = '') {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();

  // 1. Thử parse trực tiếp
  try {
    return JSON.parse(trimmed);
  } catch (e) {}

  // 2. Tìm trong Markdown code block: ```json ... ``` hoặc ``` ... ```
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  let match;
  while ((match = codeBlockRegex.exec(trimmed)) !== null) {
    const blockContent = match[1].trim();
    try {
      return JSON.parse(blockContent);
    } catch (e) {
      try {
        const cleaned = blockContent.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(cleaned);
      } catch (e2) {}
    }
  }

  // 3. Phân tích trong cặp ngoặc nhọn ngoài cùng { ... }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch (e) {
      try {
        const cleaned = candidate.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(cleaned);
      } catch (e2) {}
    }
  }

  return null;
}

/**
 * Khai phá từ khóa từ prompt tiếng Việt để tìm item phù hợp trong MySQL
 */
function extractKeywords(prompt = '') {
  const p = prompt.toLowerCase();
  const keywords = new Set();

  const domainTerms = [
    'thỏi vàng', 'vàng', 'hồng ngọc', 'ngọc hồng', 'ngọc xanh', 'ngọc khóa', 'ruby',
    'thần linh', 'hủy diệt', 'thiên sứ', 'kaio', 'tân thủ', 'vip',
    'áo', 'quần', 'găng', 'giày', 'rada', 'nhẫn',
    'trái đất', 'namếc', 'namec', 'xayda', 'saiyan',
    'cải trang', 'trang phục', 'goku', 'vegeta', 'vegetto', 'vegito', 'gogeta', 'broly', 'whis', 'beerus', 'black goku',
    'bông tai', 'porata', 'đậu thần', 'ngọc rồng', 'sao', 'bùa', 'capsule', 'rada dò ngọc',
    'vệ tinh', 'danh hiệu', 'thẻ radar', 'linh hồn', 'đá nâng cấp', 'đá may mắn', 'phiếu giảm giá'
  ];

  for (const term of domainTerms) {
    if (p.includes(term)) {
      keywords.add(term);
    }
  }

  // Tách các từ riêng lẻ có nghĩa
  const words = p.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length >= 3);
  for (const w of words.slice(0, 15)) {
    keywords.add(w);
  }

  return Array.from(keywords);
}

/**
 * Tìm các item candidate từ bảng item_template dựa trên từ khóa
 */
async function fetchCandidateItems(keywords = []) {
  try {
    const results = [];
    const seenIds = new Set();

    // Luôn đưa vào một số item thông dụng và tiêu biểu
    const defaultIds = [
      457, // Thỏi vàng
      14, 15, 16, 17, 18, 19, 20, // Ngọc rồng 1-7 sao
      921, // Bông tai Porata cấp 2
      194, // Capsule kỳ bí
    ];

    if (defaultIds.length) {
      const defRows = await query(
        `SELECT id, NAME, type, gender, description, level, icon_id
         FROM item_template WHERE id IN (${defaultIds.join(',')})`
      );
      for (const r of defRows) {
        if (!seenIds.has(r.id)) {
          seenIds.add(r.id);
          results.push(r);
        }
      }
    }

    // Tìm theo từng từ khóa
    for (const kw of keywords) {
      if (results.length >= 180) break;
      const like = `%${kw}%`;
      const rows = await query(
        `SELECT id, NAME, type, gender, description, level, icon_id
         FROM item_template
         WHERE NAME LIKE ? OR description LIKE ?
         ORDER BY id ASC LIMIT 25`,
        [like, like]
      );
      for (const r of rows) {
        if (!seenIds.has(r.id) && results.length < 180) {
          seenIds.add(r.id);
          results.push(r);
        }
      }
    }

    return results;
  } catch (err) {
    console.warn('[aiGiftcodeService] fetchCandidateItems error:', err.message);
    return [];
  }
}

/**
 * Lấy toàn bộ danh sách option template từ MySQL
 */
async function fetchCandidateOptions() {
  try {
    const rows = await query('SELECT id, NAME FROM item_option_template ORDER BY id ASC');
    return rows.map((r) => ({
      id: r.id,
      name: r.NAME || r.name || '',
    }));
  } catch (err) {
    console.warn('[aiGiftcodeService] fetchCandidateOptions error:', err.message);
    return [];
  }
}

/**
 * Xử lý chính: Kết nối DeepSeek AI để phân tích và suy luận sinh Giftcode
 */
export async function generateGiftcodeWithAi({
  prompt,
  code: userCode,
  prefix = 'NRO',
  count_left,
  expired,
  apiKey,
  model = 'deepseek-chat',
}) {
  const trimmedKey = (apiKey || process.env.DEEPSEEK_API_KEY || '')
    .trim()
    .replace(/^Bearer\s+/i, '')
    .replace(/^['"]|['"]$/g, '');

  if (!trimmedKey) {
    throw new Error('Vui lòng cung cấp DeepSeek API Key (hoặc cấu hình biến DEEPSEEK_API_KEY trong file .env).');
  }

  const promptText = String(prompt || '').trim();
  if (!promptText) {
    throw new Error('Vui lòng nhập mô tả yêu cầu tạo giftcode.');
  }

  // 1. Khai phá dữ liệu từ Database
  const keywords = extractKeywords(promptText);
  const [candidates, options] = await Promise.all([
    fetchCandidateItems(keywords),
    fetchCandidateOptions(),
  ]);

  // Rút gọn danh sách candidate để gửi cho AI (tiết kiệm token nhưng đầy đủ thông tin)
  const candidateItemsSummary = candidates.map((it) => ({
    id: it.id,
    name: it.NAME,
    type: it.type,
    gender: it.gender, // 0: Trái Đất, 1: Namếc, 2: Xayda, 3: Chung
    desc: it.description?.slice(0, 50) || '',
  }));

  // Lọc danh sách option template (ưu tiên các option hay dùng cho trang bị & cải trang)
  const candidateOptionsSummary = options.map((o) => ({
    id: o.id,
    template: o.name,
  }));

  // 2. Thiết lập System Prompt chuyên sâu
  const systemPrompt = `Bạn là Chuyên gia Cân Bằng Game & Thiết Kế Vật Phẩm cao cấp của trò chơi Ngọc Rồng Online (NRO / Dragon Boy).
Nhiệm vụ của bạn là đọc yêu cầu mô tả của người quản trị, phân tích cơ sở dữ liệu vật phẩm và chỉ số option của game, sau đó suy luận và sinh ra một gói Giftcode hoàn hảo.

QUY TẮC TIỀN TỆ ĐẶC BIỆT CỦA GAME (RẤT QUAN TRỌNG):
- ID = -1: VÀNG (Gold). Số lượng ví dụ: 50.000.000 đến 1.000.000.000. Không có options.
- ID = -2: NGỌC XANH (Gem). Số lượng ví dụ: 5.000 đến 100.000. Không có options.
- ID = -3: HỒNG NGỌC / NGỌC KHÓA (Ruby). Số lượng ví dụ: 5.000 đến 100.000. Không có options.
- ID = 457: THỎI VÀNG (Vật phẩm quy đổi kinh tế phổ biến).

QUY TẮC VẬT PHẨM & TRANG BỊ:
- Giới tính (gender): 0 = Trái Đất (TD), 1 = Namếc (NM), 2 = Xayda (XD), 3 = Dùng chung cho cả 3 hành tinh.
- Loại trang bị (type): 0 = Áo, 1 = Quần, 2 = Găng, 3 = Giày, 4 = Rada, 5 = Cải trang.
- Nếu người dùng yêu cầu "set đồ" (ví dụ: Set Hủy Diệt Xayda, Set Thần Linh Trái Đất), hãy tìm đủ cả 5 món: Áo, Quần, Găng, Giày, Rada tương ứng với tộc đó từ danh sách Item được cung cấp!

QUY TẮC GÁN CHỈ SỐ (OPTION TEMPLATE):
- Khi trang bị hoặc cải trang cần chỉ số, hãy tra cứu danh sách Option Template được cung cấp để gán đúng ID và giá trị param thích hợp:
  * ID 0: Tấn công +# (Sức đánh cộng thẳng)
  * ID 50: Sức đánh +#% (Sức đánh theo phần trăm)
  * ID 5: +#% sức đánh chí mạng
  * ID 14: Chí mạng +#%
  * ID 6: HP +#
  * ID 77: HP +#%
  * ID 7: KI +#
  * ID 103: KI +#%
  * ID 47: Giáp +#
  * ID 30: Không thể giao dịch (Nên tự động thêm vào các trang bị giá trị cao trong Giftcode để chống lạm phát hoặc gian lận)
  * ID 93: HSD # ngày (Nếu mô tả yêu cầu đồ có hạn ngày)
- Phân bổ chỉ số param:
  * Nếu yêu cầu "chỉ số khủng / VIP": Sức đánh +20-30%, HP +20-30%, Giáp +1000-2500, Chí mạng +10-20%.
  * Nếu yêu cầu "tân thủ": Sức đánh +5-10%, HP +5-10%, Giáp +200-500.
  * Nếu người dùng yêu cầu con số cụ thể (ví dụ: "chí mạng 50%"), hãy đặt đúng param = 50 cho option chí mạng!

ĐỊNH DẠNG ĐẦU RA BẮT BUỘC:
Trả về DUY NHẤT một chuỗi JSON hợp lệ theo cấu trúc sau (không kèm markdown thừa, không giải thích ngoài JSON):
{
  "code": "MÃ_GIFTCODE_IN_HOA",
  "count_left": 1000,
  "expired": "2030-01-01 00:00:00",
  "summary": "Tóm tắt ngắn gọn gói quà (1-2 câu)",
  "reasoning": "Giải thích chi tiết logic suy luận: tại sao chọn các ID item này từ DB, lý do gán từng option và giá trị param theo yêu cầu",
  "items": [
    {
      "id": 457,
      "name": "Thỏi vàng",
      "quantity": 50,
      "options": [
        { "id": 30, "param": 0 }
      ]
    }
  ]
}`;

  const userContent = `YÊU CẦU MÔ TẢ CỦA NGƯỜI DÙNG:
"${promptText}"

THÔNG TIN CẤU HÌNH BỔ SUNG (NẾU CÓ):
- Mã Code mong muốn: ${userCode ? userCode.toUpperCase() : 'Tự động sinh mã đẹp dựa trên tiền tố ' + prefix}
- Lượt nhập mong muốn: ${count_left != null ? count_left : 'Tự đề xuất phù hợp'}
- Hạn dùng mong muốn: ${expired || 'Tự đề xuất'}

DANH SÁCH ITEM TEMPLATE PHÙ HỢP TRONG DATABASE GAME ĐỂ LỰA CHỌN:
${JSON.stringify(candidateItemsSummary)}

DANH SÁCH BẢNG ITEM_OPTION_TEMPLATE TRONG DATABASE GAME ĐỂ GÁN CHỈ SỐ:
${JSON.stringify(candidateOptionsSummary)}

Hãy suy luận và tạo ra gói quà giftcode tối ưu nhất theo đúng định dạng JSON yêu cầu.`;

  const isReasoner = (model || '').toLowerCase().includes('reasoner') || (model || '').toLowerCase().includes('r1');

  const requestBody = {
    model: model || 'deepseek-chat',
    messages: isReasoner
      ? [
          {
            role: 'user',
            content: `${systemPrompt}\n\n---\n${userContent}\n\nLƯU Ý: Trả về DUY NHẤT một JSON hợp lệ.`,
          },
        ]
      : [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
    max_tokens: isReasoner ? 8192 : 4096,
  };

  if (!isReasoner) {
    requestBody.response_format = { type: 'json_object' };
    requestBody.temperature = 0.3;
  }

  // 3. Gọi API DeepSeek
  const fetchResponse = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${trimmedKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!fetchResponse.ok) {
    const errText = await fetchResponse.text();
    throw new Error(`DeepSeek API Error (${fetchResponse.status}): ${errText}`);
  }

  const aiData = await fetchResponse.json();
  const choice = aiData.choices?.[0];
  const contentStr = choice?.message?.content || '';
  const reasoningStr = choice?.message?.reasoning_content || '';

  let parsed = extractJsonFromText(contentStr);
  if (!parsed && reasoningStr) {
    parsed = extractJsonFromText(reasoningStr);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Không thể phân tích cấu trúc JSON từ kết quả của DeepSeek AI: ' + (contentStr || reasoningStr).slice(0, 300));
  }

  // 4. Hậu kiểm & Xác thực dữ liệu với Database thật (Post-Validation & Sanitization)
  const optionMap = Object.fromEntries(options.map((o) => [o.id, o.name]));
  const itemMap = Object.fromEntries(candidates.map((c) => [c.id, c]));

  // Lấy thêm các ID mà AI đề xuất nhưng chưa có trong candidate map
  const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
  const missingIds = rawItems.map((it) => Number(it.id)).filter((id) => id > 0 && !itemMap[id]);

  if (missingIds.length > 0) {
    try {
      const placeholders = missingIds.map(() => '?').join(',');
      const dbRows = await query(
        `SELECT id, NAME, type, gender, description, level, icon_id
         FROM item_template WHERE id IN (${placeholders})`,
        missingIds
      );
      for (const r of dbRows) {
        itemMap[r.id] = r;
      }
    } catch (e) {
      console.warn('[aiGiftcodeService] query missing items error:', e.message);
    }
  }

  const sanitizedItems = [];
  for (const it of rawItems) {
    const rawId = Number(it.id);
    if (Number.isNaN(rawId) || rawId === 0) continue;

    const quantity = Math.max(1, Math.min(2_000_000_000, Number(it.quantity) || 1));

    // Tiền tệ đặc biệt
    if (rawId === -1) {
      sanitizedItems.push({
        id: -1,
        name: 'Vàng',
        icon_id: 457,
        quantity,
        options: [],
        type: 'currency',
      });
      continue;
    }
    if (rawId === -2) {
      sanitizedItems.push({
        id: -2,
        name: 'Ngọc xanh',
        icon_id: 16,
        quantity,
        options: [],
        type: 'currency',
      });
      continue;
    }
    if (rawId === -3) {
      sanitizedItems.push({
        id: -3,
        name: 'Hồng ngọc',
        icon_id: 861,
        quantity,
        options: [],
        type: 'currency',
      });
      continue;
    }

    // Vật phẩm thường
    const dbItem = itemMap[rawId];
    if (!dbItem) {
      // Nếu ID này thực sự không có trong database, bỏ qua để tránh lỗi runtime game
      continue;
    }

    // Xử lý options
    const sanitizedOptions = [];
    if (Array.isArray(it.options)) {
      for (const opt of it.options) {
        const optId = Number(opt.id);
        const param = Number(opt.param) || 0;
        if (optionMap[optId] !== undefined) {
          const tpl = optionMap[optId] || '';
          const preview = tpl.includes('#') ? tpl.replace(/#/g, String(param)) : tpl;
          sanitizedOptions.push({
            id: optId,
            param,
            name: tpl,
            preview,
          });
        }
      }
    }

    sanitizedItems.push({
      id: rawId,
      name: dbItem.NAME || it.name || `Item #${rawId}`,
      icon_id: dbItem.icon_id ?? null,
      type: dbItem.type,
      gender: dbItem.gender,
      quantity,
      options: sanitizedOptions,
    });
  }

  // 5. Hoàn thiện mã code, hạn dùng và tổng hợp
  let finalCode = (userCode || parsed.code || `${prefix}_${Math.random().toString(36).substring(2, 8)}`)
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '');

  if (!finalCode) {
    finalCode = `${prefix}_${Date.now().toString().slice(-6)}`;
  }

  const finalCountLeft = count_left != null ? Number(count_left) : (Number(parsed.count_left) || 1000);
  const finalExpired = expired || parsed.expired || '2030-01-01 00:00:00';

  return {
    code: finalCode,
    count_left: finalCountLeft,
    expired: finalExpired,
    summary: parsed.summary || 'Gói quà do AI DeepSeek phân tích và sinh tự động',
    reasoning: parsed.reasoning || reasoningStr || 'AI đã phân tích ngữ cảnh và liên kết dữ liệu item phù hợp từ cơ sở dữ liệu.',
    items: sanitizedItems,
  };
}
