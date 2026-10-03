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

  // 3. Phân tích trong cặp ngoặc nhọn hoặc mảng ngoài cùng
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

  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const candidate = trimmed.substring(firstBracket, lastBracket + 1);
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
 * DeepSeek Local Reasoning Rule-Based Engine (dùng khi không có API Key hoặc offline)
 */
export function localReasonItemOptions(item, theme = 'vip') {
  const name = String(item.name || '').toLowerCase();
  const id = Number(item.tempId || item.id || 0);
  const type = Number(item.type ?? -1);
  const options = [];
  let reasoning = '';
  let durationMode = 'permanent';
  let chancePermanent = 100;
  let minDays = 1;
  let maxDays = 7;

  // 1. Vàng rơi / Thỏi vàng
  if (id === 190 || id === 188 || id === 189 || name.includes('vàng') && !name.includes('cải trang')) {
    return {
      options: [],
      reasoning: 'Vật phẩm tiền tệ/Vàng (Item #190) không cần option chỉ số, người chơi nhận sẽ tự động cộng vào túi vàng.',
      durationMode: 'permanent',
      chancePermanent: 100,
    };
  }

  // 2. Ngọc Rồng (1 - 7 sao thường hoặc sao đen)
  if ((id >= 14 && id <= 20) || (id >= 372 && id <= 378) || name.includes('ngọc rồng')) {
    return {
      options: [{ id: 30, param: 0 }],
      reasoning: 'Ngọc rồng là vật phẩm ước điều ước quý giá, gán option 30 (Không thể GD) để đảm bảo giá trị ingame.',
      durationMode: 'permanent',
      chancePermanent: 100,
    };
  }

  // 3. Cải trang / Trang bị VIP / Áo / Quần / Găng / Giày / Rada
  const isCosmetic = type === 5 || name.includes('cải trang') || name.includes('trang phục') || name.includes('pan') || name.includes('goku') || name.includes('vegeta') || name.includes('yardrat') || name.includes('whis') || name.includes('beerus');
  const isEquip = (type >= 0 && type <= 4) || name.includes('áo') || name.includes('quần') || name.includes('găng') || name.includes('giày') || name.includes('rada') || name.includes('nhẫn') || name.includes('bông tai');

  if (isCosmetic || isEquip) {
    if (theme === 'super_vip' || name.includes('vip') || name.includes('vô cực') || name.includes('hủy diệt') || name.includes('thiên sứ')) {
      options.push(
        { id: 50, min: 25, max: 45, param: 25 }, // Sức đánh %
        { id: 77, min: 25, max: 45, param: 25 }, // HP %
        { id: 103, min: 25, max: 45, param: 25 }, // KI %
        { id: 14, min: 10, max: 25, param: 10 }, // Chí mạng %
        { id: 47, min: 1000, max: 4000, param: 1000 } // Giáp
      );
      if (name.includes('chưởng') || name.includes('biến')) {
        options.push({ id: 3, min: 5, max: 15, param: 5 }); // Biến sát thương chưởng thành KI
      }
      chancePermanent = 15;
      minDays = 3;
      maxDays = 15;
      durationMode = 'chance_permanent';
      reasoning = `Trang bị/Cải trang Siêu Cấp (${item.name}): Gán full 5 dòng chỉ số VIP ngẫu nhiên cực khủng [25~45% Sức đánh/HP/KI, 10~25% Chí mạng, 1000~4000 Giáp], thiết lập tỷ lệ 15% ra Vĩnh viễn (hoặc 3~15 ngày).`;
    } else if (name.includes('yardrat') || name.includes('dịch chuyển')) {
      options.push(
        { id: 50, min: 15, max: 30, param: 15 },
        { id: 77, min: 15, max: 30, param: 15 },
        { id: 103, min: 15, max: 30, param: 15 },
        { id: 114, min: 1, max: 1, param: 1 } // Dịch chuyển tức thời
      );
      chancePermanent = 20;
      minDays = 3;
      maxDays = 10;
      durationMode = 'chance_permanent';
      reasoning = `Cải trang Yardrat đặc biệt: Gán chỉ số cân bằng [15~30% SD/HP/KI] kèm hiệu ứng Dịch chuyển tức thời, 20% ra vĩnh viễn.`;
    } else {
      // Standard VIP
      options.push(
        { id: 50, min: 15, max: 30, param: 15 },
        { id: 77, min: 15, max: 30, param: 15 },
        { id: 14, min: 5, max: 15, param: 5 },
        { id: 47, min: 500, max: 2000, param: 500 }
      );
      chancePermanent = 10;
      minDays = 1;
      maxDays = 7;
      durationMode = 'chance_permanent';
      reasoning = `Trang phục/Trang bị tiêu chuẩn (${item.name}): Tự động gán bộ 4 chỉ số cơ bản chiến đấu [15~30% SD/HP, 5~15% Chí mạng, 500~2000 Giáp], 10% ra Vĩnh viễn (hoặc 1~7 ngày).`;
    }

    if (durationMode === 'chance_permanent') {
      options.push({
        id: 93,
        min: minDays,
        max: maxDays,
        chancePermanent,
        param: minDays,
      });
    }

    return {
      options,
      reasoning,
      durationMode,
      chancePermanent,
      minDays,
      maxDays,
    };
  }

  // 4. Thuốc / Thần dược / Tiêu hao (Cuồng nộ, Bổ huyết, Bổ khí, Giáp Xên...)
  if (name.includes('cuồng nộ') || name.includes('bổ huyết') || name.includes('bổ khí') || name.includes('giáp xên') || name.includes('ẩn danh')) {
    options.push({ id: 30, param: 0 }); // Không thể gd
    return {
      options,
      reasoning: `Vật phẩm tiêu hao/bùa dược (${item.name}): Tự động gán option bảo vệ kinh tế (Không thể giao dịch).`,
      durationMode: 'permanent',
      chancePermanent: 100,
    };
  }

  // 5. Default fallback
  options.push(
    { id: 50, min: 10, max: 25, param: 10 },
    { id: 77, min: 10, max: 25, param: 10 }
  );
  return {
    options,
    reasoning: `Vật phẩm thông thường (${item.name}): Gán chỉ số buff nhẹ [10~25% SD/HP].`,
    durationMode: 'permanent',
    chancePermanent: 100,
  };
}

/**
 * Gọi DeepSeek AI API để phân tích và sinh Option + Thời hạn cho danh sách item
 */
export async function generateGodSpinOptionsWithAI({
  items = [],
  prompt = '',
  apiKey = '',
  model = 'deepseek-chat',
  theme = 'vip',
}) {
  const trimmedKey = (apiKey || process.env.DEEPSEEK_API_KEY || '').trim();

  // Lấy danh sách item_option_template từ DB để cung cấp cho DeepSeek
  let optionTemplates = [];
  try {
    optionTemplates = await query(
      `SELECT id, NAME AS name FROM item_option_template 
       WHERE id IN (0, 3, 5, 6, 7, 14, 27, 28, 30, 47, 50, 77, 80, 81, 93, 94, 95, 96, 97, 103, 107, 108, 114, 117, 147, 148)
       ORDER BY id`
    );
  } catch (e) {
    optionTemplates = [
      { id: 0, name: 'Tấn công +# (Sức đánh)' },
      { id: 50, name: 'Sức đánh +#%' },
      { id: 14, name: 'Chí mạng +#%' },
      { id: 77, name: 'HP +#%' },
      { id: 103, name: 'KI +#%' },
      { id: 47, name: 'Giáp +# (Phòng thủ)' },
      { id: 3, name: 'Vô hiệu và biến #% sát thương chưởng thành KI' },
      { id: 95, name: 'Biến #% sát thương thành HP (Hút máu)' },
      { id: 96, name: 'Biến #% sát thương thành KI (Hút KI)' },
      { id: 97, name: 'Phản #% sát thương' },
      { id: 30, name: 'Không thể giao dịch' },
      { id: 93, name: 'Hạn sử dụng # ngày' },
      { id: 114, name: 'Dịch chuyển tức thời' },
      { id: 117, name: 'Kháng khống chế +#%' },
      { id: 107, name: 'Ép sao pha lê +# sao' },
      { id: 108, name: 'Trang bị sao pha lê +# sao' },
    ];
  }

  // Nếu không có API Key, dùng Local Reasoning Engine
  if (!trimmedKey) {
    const reasonedItems = items.map((item) => {
      const result = localReasonItemOptions(item, theme);
      return {
        tempId: Number(item.tempId || item.id),
        name: item.name,
        options: result.options,
        reasoning: result.reasoning,
        durationMode: result.durationMode,
        chancePermanent: result.chancePermanent,
        minDays: result.minDays,
        maxDays: result.maxDays,
      };
    });

    return {
      usedAi: false,
      engine: 'DeepSeek Local Rule Engine (Offline)',
      reasoningSummary: `Đã phân tích ${items.length} item theo quy chuẩn NRO Game Design (VIP/Event). Tự động phân loại chỉ số chiến đấu, phòng thủ, hiệu ứng đặc biệt và tỷ lệ Vĩnh viễn / Hạn ngày tối ưu.`,
      items: reasonedItems,
    };
  }

  // Khi có DeepSeek API Key, gọi trực tiếp DeepSeek Chat / Reasoner
  const systemPrompt = `Bạn là Chuyên gia Cân Bằng Game & Thiết Kế Vật Phẩm cao cấp của trò chơi Ngọc Rồng Online (Dragon Boy / NRO).
Nhiệm vụ của bạn là phân tích danh sách các Item trong Vòng Quay Thượng Đế (God-Spin), sau đó suy luận và gán các Option (Chỉ số) ngẫu nhiên [min ~ max] và Thời hạn (Tỷ lệ Vĩnh viễn % hoặc Hạn ngày ngẫu nhiên [minDays ~ maxDays]) sao cho cân bằng, hấp dẫn và đúng chuẩn game.

QUY TẮC THIẾT KẾ CHỈ SỐ CHO GOD-SPIN:
1. Item Vàng (#190, #457): Không gắn option chỉ số, là vật phẩm vĩnh viễn (isPermanent: true).
2. Item Ngọc Rồng (#14~#20, #372~#378): Gán option 30 (Không thể GD), vĩnh viễn.
3. Cải trang / Trang bị VIP:
   - Sức đánh: Option 50 (Sức đánh +#%), gán khoảng min ~ max, ví dụ min: 15, max: 35.
   - HP/KI: Option 77 (HP +#%), Option 103 (KI +#%), khoảng min: 15, max: 35.
   - Chí mạng: Option 14 (Chí mạng +#%), khoảng min: 5, max: 20.
   - Giáp: Option 47 (Giáp +#), khoảng min: 500, max: 2500.
   - Hiệu ứng đặc biệt nếu là đồ VIP: Option 3 (Biến sát thương chưởng thành KI, 5~15%), Option 95 (Hút HP, 5~15%), Option 97 (Phản sát thương, 5~15%).
4. QUY TẮC HẠN NGÀY & TỶ LỆ VĨNH VIỄN (Option 93):
   - Với Cải trang/Trang bị giá trị: Có thể đặt Option 93 kèm "chancePermanent" (ví dụ: chancePermanent: 10 hoặc 20, min: 1, max: 7 nghĩa là 10% ra Vĩnh viễn, 90% ra Hạn 1~7 ngày).
   - Với vật phẩm thường/tiêu hao: Vĩnh viễn (không cần Option 93).

DANH SÁCH BẢNG ITEM_OPTION_TEMPLATE ĐƯỢC PHÉP SỬ DỤNG:
${JSON.stringify(optionTemplates)}

ĐỊNH DẠNG ĐẦU RA BẮT BUỘC:
Trả về DUY NHẤT một chuỗi JSON hợp lệ theo định dạng:
{
  "reasoningSummary": "Tóm tắt ngắn gọn logic phân tích và thiết kế cho toàn bộ pool",
  "items": [
    {
      "tempId": 1858,
      "name": "Cải trang Pan VIP",
      "reasoning": "Giải thích lý do chọn các dòng chỉ số này cho item",
      "options": [
        { "id": 50, "min": 20, "max": 40, "param": 20 },
        { "id": 77, "min": 20, "max": 40, "param": 20 },
        { "id": 14, "min": 10, "max": 20, "param": 10 },
        { "id": 93, "min": 3, "max": 15, "chancePermanent": 15, "param": 3 }
      ]
    }
  ]
}`;

  const userContent = `YÊU CẦU ĐẶC BIỆT CỦA ADMIN:
"${prompt || 'Hãy tự động suy luận và gán option VIP cân bằng, có khoảng [min ~ max] ngẫu nhiên và tỷ lệ ra Vĩnh viễn phù hợp cho từng item.'}"

CHỦ ĐỀ / TONE THIẾT KẾ: ${theme}

DANH SÁCH ITEM CẦN GÁN OPTION TRONG VÒNG QUAY:
${JSON.stringify(items.map((it) => ({ tempId: it.tempId || it.id, name: it.name, quantityMin: it.quantityMin, quantityMax: it.quantityMax })))}`;

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

  if (!parsed || !Array.isArray(parsed.items)) {
    throw new Error('Không thể phân tích dữ liệu JSON từ DeepSeek AI: ' + (contentStr || reasoningStr).slice(0, 300));
  }

  return {
    usedAi: true,
    engine: `DeepSeek AI (${model})`,
    reasoningThought: reasoningStr || null,
    reasoningSummary: parsed.reasoningSummary || 'DeepSeek AI đã hoàn tất suy luận và tạo option cho toàn bộ item.',
    items: parsed.items,
  };
}
