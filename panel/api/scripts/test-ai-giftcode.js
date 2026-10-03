import { extractJsonFromText } from '../src/services/aiGiftcodeService.js';

// Test 1: extractJsonFromText with markdown block
const sampleMarkdown = `
Chào bạn, sau khi phân tích database, tôi đã tạo ra giftcode cho bạn:
\`\`\`json
{
  "code": "TANTHU_PRO",
  "count_left": 500,
  "expired": "2026-12-31 23:59:59",
  "summary": "Gói quà tân thủ xịn",
  "reasoning": "Đã chọn thỏi vàng và set đồ Thần Linh Trái Đất kèm option sức đánh và hp.",
  "items": [
    {
      "id": 457,
      "name": "Thỏi vàng",
      "quantity": 50,
      "options": []
    },
    {
      "id": -3,
      "name": "Hồng ngọc",
      "quantity": 20000,
      "options": []
    },
    {
      "id": 555,
      "name": "Áo Thần Linh",
      "quantity": 1,
      "options": [
        { "id": 47, "param": 1000 },
        { "id": 50, "param": 15 },
        { "id": 30, "param": 0 }
      ]
    }
  ]
}
\`\`\`
Hy vọng bạn thích gói quà này!
`;

const parsed = extractJsonFromText(sampleMarkdown);
console.log('Parsed code:', parsed?.code);
console.log('Items count:', parsed?.items?.length);

if (parsed?.code === 'TANTHU_PRO' && parsed?.items?.length === 3) {
  console.log('TEST 1 PASSED: JSON extracted perfectly from markdown!');
} else {
  console.error('TEST 1 FAILED!');
  process.exit(1);
}

// Test 2: extractJsonFromText with raw JSON
const sampleRaw = `{"code": "VIP_999", "items": [{"id": -1, "quantity": 1000000}]}`;
const parsedRaw = extractJsonFromText(sampleRaw);
if (parsedRaw?.code === 'VIP_999') {
  console.log('TEST 2 PASSED: Raw JSON extracted perfectly!');
} else {
  console.error('TEST 2 FAILED!');
  process.exit(1);
}

console.log('ALL UNIT CHECKS PASSED!');
