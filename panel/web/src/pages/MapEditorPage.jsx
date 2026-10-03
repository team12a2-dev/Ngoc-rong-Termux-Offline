import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { apiGet, apiPut, apiPost, apiDelete } from '../api';

const PLANET_OPTIONS = [
  { id: 0, name: 'Trái Đất', color: '#10b981', badge: 'earth' },
  { id: 1, name: 'Namếc', color: '#06b6d4', badge: 'namec' },
  { id: 2, name: 'Xayda', color: '#f59e0b', badge: 'xayda' },
  { id: 3, name: 'Khác / Vũ trụ', color: '#8b5cf6', badge: 'other' },
];

const MAP_TYPE_OPTIONS = [
  { id: 0, name: 'Bản đồ thường (Normal)' },
  { id: 1, name: 'Nhà / Offline' },
  { id: 2, name: 'Doanh trại' },
  { id: 3, name: 'Black Ball War' },
  { id: 4, name: 'Bản đồ kho báu' },
  { id: 5, name: 'Ma Bưu' },
  { id: 6, name: 'Con đường rắn độc' },
  { id: 7, name: 'Khí Gas Hủy Diệt' },
  { id: 8, name: 'Tây Karin' },
  { id: 9, name: 'Ma Bưu 14h' },
];

const KNOWN_TILE_SETS = [
  { id: 1, name: 'Trái Đất Đồng Bằng', desc: 'Mặt cỏ xanh, khúc gỗ, cầu tre, xương hóa thạch, khối đất nâu', tiles: 40, tag: 'earth' },
  { id: 2, name: 'Namếc', desc: 'Đất xanh lam, cỏ lục lam, vách đá tím nhạt Namec', tiles: 36, tag: 'namec' },
  { id: 3, name: 'Xayda', desc: 'Vách đá đỏ sẫm, đất cằn cỗi hoang mạc Xayda', tiles: 54, tag: 'xayda' },
  { id: 4, name: 'Địa Ngục & Núi Lửa', desc: 'Đất đá dung nham, đá đen, nền lửa rực', tiles: 20, tag: 'other' },
  { id: 5, name: 'Đại Hội Võ Thuật', desc: 'Sàn gạch thi đấu, cột đá hoa cương, bậc thang võ đài', tiles: 38, tag: 'earth' },
  { id: 6, name: 'Thành Phố / Đô Thị', desc: 'Vỉa hè, mặt đường nhựa, tòa nhà cao tầng', tiles: 33, tag: 'earth' },
  { id: 7, name: 'Căn Cứ RRR / Kim Loại', desc: 'Sàn thép, tường sắt, đường ống công nghệ', tiles: 33, tag: 'earth' },
  { id: 8, name: 'Sa Mạc Cát Vàng', desc: 'Đụn cát, xương rồng, tảng đá sa mạc', tiles: 44, tag: 'earth' },
  { id: 9, name: 'Đảo Rùa & Bờ Biển', desc: 'Bờ cát trắng, nước biển xanh, rạn san hô', tiles: 26, tag: 'earth' },
  { id: 10, name: 'Rừng Nhiệt Đới', desc: 'Cây leo rậm rạp, thảm thực vật nhiệt đới', tiles: 29, tag: 'earth' },
  { id: 11, name: 'Hang Động Âm U', desc: 'Nhũ đá, tường đá ngầm, hầm mỏ', tiles: 23, tag: 'other' },
  { id: 12, name: 'Tháp Karin & Thánh Địa', desc: 'Tháp thần Karin, cột mây trắng thiên giới', tiles: 35, tag: 'earth' },
  { id: 13, name: 'Phụ Bản Doanh Trại 1', desc: 'Tường gỗ công sự, rào thép gai', tiles: 4, tag: 'other' },
  { id: 14, name: 'Phụ Bản Doanh Trại 2', desc: 'Lô cốt, tường chắn phòng thủ', tiles: 6, tag: 'other' },
  { id: 15, name: 'Phụ Bản Kho Báu', desc: 'Hang ngầm đáy biển, rương vàng', tiles: 11, tag: 'other' },
  { id: 16, name: 'Phụ Bản Con Đường Rắn', desc: 'Thân rắn thần cuộn khúc trên mây', tiles: 8, tag: 'other' },
  { id: 17, name: 'Cung Điện Kami / Thần Vũ Trụ', desc: 'Gạch lát hoa cương vàng kim thiên đình', tiles: 36, tag: 'other' },
  { id: 18, name: 'Hành Tinh Yardrat', desc: 'Đá tím lấp lánh, cỏ phát quang', tiles: 23, tag: 'other' },
  { id: 19, name: 'Hành Tinh Kaio', desc: 'Đồng cỏ xanh mượt, đường nhựa nhỏ', tiles: 28, tag: 'other' },
  { id: 20, name: 'Tàu Vũ Trụ Fide', desc: 'Khoang tàu kim loại trắng xám hiện đại', tiles: 38, tag: 'other' },
  { id: 21, name: 'Phòng Tập Thời Gian', desc: 'Khoảng không trắng vô tận, đồng hồ cát', tiles: 18, tag: 'other' },
  { id: 22, name: 'Thánh Địa Kaio', desc: 'Mặt đất cổ kính của các vị thần tối cao', tiles: 17, tag: 'other' },
  { id: 23, name: 'Đảo Băng Tuyết', desc: 'Băng giá vĩnh cửu, cột băng trong suốt', tiles: 23, tag: 'other' },
  { id: 24, name: 'Chiến Trường Tương Lai', desc: 'Đống đổ nát, bê tông vỡ, cốt thép', tiles: 22, tag: 'earth' },
  { id: 25, name: 'Thung Lũng Chết', desc: 'Hẻm núi sâu, đá sắc nhọn', tiles: 22, tag: 'other' },
  { id: 26, name: 'Phụ Bản Khí Gas Hủy Diệt', desc: 'Ống dẫn khí, kim loại phong tỏa', tiles: 8, tag: 'other' },
  { id: 27, name: 'Đảo Rồng', desc: 'Đá rêu phong, cây cổ thụ nghìn năm', tiles: 16, tag: 'other' },
  { id: 28, name: 'Hành Tinh Ngục Tù', desc: 'Chuỗi xích khổng lồ, đất đá bị giam cầm', tiles: 35, tag: 'other' },
  { id: 29, name: 'Cung Điện Beerus', desc: 'Cây thần khổng lồ, thảm cỏ tím vũ trụ', tiles: 37, tag: 'other' },
  { id: 30, name: 'Vũ Trụ 6 / Champa', desc: 'Đất đá màu cam vàng rực rỡ', tiles: 30, tag: 'other' },
  { id: 31, name: 'Rừng Rậm Đa Tầng (Map 161)', desc: 'Thân cây đại thụ, 4 tầng tán lá rậm rạp, thảm rêu', tiles: 33, tag: 'earth' },
  { id: 32, name: 'Rừng Sâu Bí Ẩn', desc: 'Cây cổ thụ tăm tối, đầm lầy ma quái', tiles: 33, tag: 'earth' },
  { id: 33, name: 'Mỏ Quặng Năng Lượng', desc: 'Pha lê phát sáng, vách đá quặng', tiles: 23, tag: 'other' },
  { id: 34, name: 'Vùng Đất Bị Nguyền Rủa', desc: 'Đất xám tro tàn, cành cây khô khốc', tiles: 23, tag: 'other' },
  { id: 35, name: 'Khu Di Tích Cổ Đại', desc: 'Phù điêu khắc đá cổ xưa, bia đá', tiles: 23, tag: 'other' },
  { id: 36, name: 'Đỉnh Núi Tuyết Trắng', desc: 'Tuyết phủ dày đặc, vách đá băng xanh', tiles: 26, tag: 'other' },
  { id: 37, name: 'Đền Thần Cổ Kính', desc: 'Kiến trúc đền đá cổ đại, mái ngói cong', tiles: 22, tag: 'other' },
  { id: 38, name: 'Tường Thành Cổ & Sa Mạc', desc: 'Tường thành đất nung, cổng thành cổ tích', tiles: 36, tag: 'other' },
  { id: 39, name: 'Hang Động & Rừng Rậm Huyền Bí', desc: 'Vách đá rêu phong, tán cây rừng cổ đại', tiles: 21, tag: 'other' },
  { id: 40, name: 'Bờ Biển Hoàng Hôn & Băng Đảo', desc: 'Đá bờ biển, rạn đá san hô, nền tuyết trắng', tiles: 31, tag: 'other' },
  { id: 41, name: 'Kiến Trúc Nhà Cổ & Mái Ngói & Nền Đá', desc: 'Mái ngói cổ truyền, cột gỗ, tường gạch nung, cửa nhà, nền hoa văn', tiles: 52, tag: 'earth' },
  { id: 42, name: 'Vách Núi & Thác Nước & Rêu Xanh', desc: 'Vách núi dốc, dòng nước chảy, vách thác nước, mỏm đá rêu phong', tiles: 50, tag: 'earth' },
];

export const PRESET_BACKGROUND_SETS = [
  {
    bgId: 0,
    name: 'Làng Aru & Rừng Xanh',
    desc: 'Bầu trời xanh trong, đồi cỏ hoa lá, núi mờ phía xa của Trái Đất',
    planetId: 0,
    tag: 'Trái Đất',
    layers: [
      { layer: 0, fileName: 'b00.png', url: '/api/v1/assets/bg/b00.png' },
      { layer: 1, fileName: 'b01.png', url: '/api/v1/assets/bg/b01.png' },
      { layer: 2, fileName: 'b02.png', url: '/api/v1/assets/bg/b02.png' },
      { layer: 3, fileName: 'b03.png', url: '/api/v1/assets/bg/b03.png' },
    ],
  },
  {
    bgId: 1,
    name: 'Đồi Hoa Cúc & Vách Đá',
    desc: 'Vách đá dốc màu tím hồng, thung lũng hoa cúc rực rỡ',
    planetId: 0,
    tag: 'Trái Đất',
    layers: [
      { layer: 0, fileName: 'b10.png', url: '/api/v1/assets/bg/b10.png' },
      { layer: 1, fileName: 'b11.png', url: '/api/v1/assets/bg/b11.png' },
      { layer: 2, fileName: 'b12.png', url: '/api/v1/assets/bg/b12.png' },
      { layer: 3, fileName: 'b13.png', url: '/api/v1/assets/bg/b13.png' },
    ],
  },
  {
    bgId: 2,
    name: 'Thảo Nguyên & Đảo Bay Namếc',
    desc: 'Bầu trời xanh ngọc bích, các cụm đảo bay và nấm khổng lồ',
    planetId: 1,
    tag: 'Namếc',
    layers: [
      { layer: 0, fileName: 'b20.png', url: '/api/v1/assets/bg/b20.png' },
      { layer: 1, fileName: 'b21.png', url: '/api/v1/assets/bg/b21.png' },
      { layer: 2, fileName: 'b22.png', url: '/api/v1/assets/bg/b22.png' },
      { layer: 3, fileName: 'b23.png', url: '/api/v1/assets/bg/b23.png' },
      { layer: 4, fileName: 'b24.png', url: '/api/v1/assets/bg/b24.png' },
    ],
  },
  {
    bgId: 3,
    name: 'Thành Phố Đô Thị',
    desc: 'Tòa nhà cao tầng, đường cao tốc và ánh đèn đô thị hiện đại',
    planetId: 0,
    tag: 'Trái Đất',
    layers: [
      { layer: 0, fileName: 'b30.png', url: '/api/v1/assets/bg/b30.png' },
      { layer: 1, fileName: 'b31.png', url: '/api/v1/assets/bg/b31.png' },
      { layer: 2, fileName: 'b32.png', url: '/api/v1/assets/bg/b32.png' },
    ],
  },
  {
    bgId: 4,
    name: 'Sa Mạc & Cồn Cát Vàng',
    desc: 'Cồn cát vàng trải dài, núi đá sa thạch và ánh nắng gay gắt',
    planetId: 0,
    tag: 'Sa Mạc',
    layers: [
      { layer: 0, fileName: 'b40.png', url: '/api/v1/assets/bg/b40.png' },
      { layer: 1, fileName: 'b41.png', url: '/api/v1/assets/bg/b41.png' },
      { layer: 2, fileName: 'b42.png', url: '/api/v1/assets/bg/b42.png' },
      { layer: 3, fileName: 'b43.png', url: '/api/v1/assets/bg/b43.png' },
    ],
  },
  {
    bgId: 5,
    name: 'Quần Đảo & Bờ Biển Xanh',
    desc: 'Đại dương trong vắt, bãi cát trắng và rạn san hô',
    planetId: 0,
    tag: 'Biển Đảo',
    layers: [
      { layer: 0, fileName: 'b50.png', url: '/api/v1/assets/bg/b50.png' },
      { layer: 1, fileName: 'b51.png', url: '/api/v1/assets/bg/b51.png' },
      { layer: 2, fileName: 'b52.png', url: '/api/v1/assets/bg/b52.png' },
      { layer: 3, fileName: 'b53.png', url: '/api/v1/assets/bg/b53.png' },
    ],
  },
  {
    bgId: 6,
    name: 'Núi Băng Tuyết Nam Cực',
    desc: 'Băng giá vĩnh cửu, đỉnh núi tuyết phủ trắng xóa và gió tuyết',
    planetId: 0,
    tag: 'Băng Tuyết',
    layers: [
      { layer: 0, fileName: 'b60.png', url: '/api/v1/assets/bg/b60.png' },
      { layer: 1, fileName: 'b61.png', url: '/api/v1/assets/bg/b61.png' },
      { layer: 2, fileName: 'b62.png', url: '/api/v1/assets/bg/b62.png' },
      { layer: 3, fileName: 'b63.png', url: '/api/v1/assets/bg/b63.png' },
      { layer: 4, fileName: 'b64.png', url: '/api/v1/assets/bg/b64.png' },
    ],
  },
  {
    bgId: 7,
    name: 'Địa Ngục & Núi Lửa Dung Nham',
    desc: 'Bầu trời đỏ rực, dòng nham thạch sôi sục và vách đá quỷ',
    planetId: 2,
    tag: 'Địa Ngục',
    layers: [
      { layer: 0, fileName: 'b70.png', url: '/api/v1/assets/bg/b70.png' },
      { layer: 1, fileName: 'b71.png', url: '/api/v1/assets/bg/b71.png' },
      { layer: 2, fileName: 'b72.png', url: '/api/v1/assets/bg/b72.png' },
      { layer: 3, fileName: 'b73.png', url: '/api/v1/assets/bg/b73.png' },
    ],
  },
  {
    bgId: 8,
    name: 'Thánh Địa Kaio & Thần Điện',
    desc: 'Bầu trời tiên cảnh thanh bình, mây trắng bồng bềnh',
    planetId: 0,
    tag: 'Thần Giới',
    layers: [
      { layer: 0, fileName: 'b80.png', url: '/api/v1/assets/bg/b80.png' },
      { layer: 1, fileName: 'b81.png', url: '/api/v1/assets/bg/b81.png' },
      { layer: 2, fileName: 'b82.png', url: '/api/v1/assets/bg/b82.png' },
      { layer: 3, fileName: 'b83.png', url: '/api/v1/assets/bg/b83.png' },
    ],
  },
  {
    bgId: 9,
    name: 'Hành Tinh Xayda Hoang Tàn',
    desc: 'Đất đỏ cằn cỗi, bầu trời u ám và hẻm vực hiểm trở',
    planetId: 2,
    tag: 'Xayda',
    layers: [
      { layer: 0, fileName: 'b90.png', url: '/api/v1/assets/bg/b90.png' },
      { layer: 1, fileName: 'b91.png', url: '/api/v1/assets/bg/b91.png' },
      { layer: 2, fileName: 'b92.png', url: '/api/v1/assets/bg/b92.png' },
      { layer: 3, fileName: 'b93.png', url: '/api/v1/assets/bg/b93.png' },
    ],
  },
  {
    bgId: 10,
    name: 'Vũ Trụ Không Gian & Tinh Vân',
    desc: 'Vũ trụ huyền bí sâu thẳm với ngàn vì sao và dải ngân hà',
    planetId: 3,
    tag: 'Vũ Trụ',
    layers: [
      { layer: 0, fileName: 'b100.png', url: '/api/v1/assets/bg/b100.png' },
      { layer: 1, fileName: 'b101.png', url: '/api/v1/assets/bg/b101.png' },
    ],
  },
  {
    bgId: 11,
    name: 'Hang Động & Vách Đá Ngầm',
    desc: 'Hang đá tối tăm, thạch nhũ rủ xuống và vòm hang hiểm trở',
    planetId: 0,
    tag: 'Hang Động',
    layers: [
      { layer: 0, fileName: 'b110.png', url: '/api/v1/assets/bg/b110.png' },
      { layer: 1, fileName: 'b111.png', url: '/api/v1/assets/bg/b111.png' },
      { layer: 2, fileName: 'b112.png', url: '/api/v1/assets/bg/b112.png' },
      { layer: 3, fileName: 'b113.png', url: '/api/v1/assets/bg/b113.png' },
    ],
  },
  {
    bgId: 12,
    name: 'Võ Đài Thi Đấu Đại Hội',
    desc: 'Bầu trời rộng lớn trên sàn đấu võ thuật đỉnh cao',
    planetId: 0,
    tag: 'Võ Đài',
    layers: [
      { layer: 0, fileName: 'b120.png', url: '/api/v1/assets/bg/b120.png' },
    ],
  },
  {
    bgId: 13,
    name: 'Tháp Karin & Cung Điện Kami',
    desc: 'Tầng mây cao vút giữa trời đất nhìn xuống trần gian',
    planetId: 0,
    tag: 'Trái Đất',
    layers: [
      { layer: 0, fileName: 'b130.png', url: '/api/v1/assets/bg/b130.png' },
      { layer: 1, fileName: 'b131.png', url: '/api/v1/assets/bg/b131.png' },
    ],
  },
  {
    bgId: 14,
    name: 'Rừng Đại Thụ Nguyên Sinh',
    desc: 'Cây cổ thụ nghìn năm khổng lồ, thảm thực vật rậm rạp',
    planetId: 0,
    tag: 'Rừng Rậm',
    layers: [
      { layer: 0, fileName: 'b140.png', url: '/api/v1/assets/bg/b140.png' },
      { layer: 1, fileName: 'b141.png', url: '/api/v1/assets/bg/b141.png' },
      { layer: 2, fileName: 'b142.png', url: '/api/v1/assets/bg/b142.png' },
    ],
  },
  {
    bgId: 15,
    name: 'Hành Tinh Fide / Thao Trường',
    desc: 'Bầu trời rực lửa thao trường chiến binh',
    planetId: 0,
    tag: 'Fide',
    layers: [
      { layer: 0, fileName: 'b150.png', url: '/api/v1/assets/bg/b150.png' },
      { layer: 1, fileName: 'b151.png', url: '/api/v1/assets/bg/b151.png' },
    ],
  },
  {
    bgId: 16,
    name: 'Hành Tinh Bill (Thần Hủy Diệt)',
    desc: 'Bầu trời đêm huyền ảo tím huyền bí của Thần Hủy Diệt Beerus',
    planetId: 0,
    tag: 'Thần Giới',
    layers: [
      { layer: 0, fileName: 'b160.png', url: '/api/v1/assets/bg/b160.png' },
      { layer: 1, fileName: 'b161.png', url: '/api/v1/assets/bg/b161.png' },
      { layer: 2, fileName: 'b162.png', url: '/api/v1/assets/bg/b162.png' },
      { layer: 3, fileName: 'b163.png', url: '/api/v1/assets/bg/b163.png' },
    ],
  },
  {
    bgId: 17,
    name: 'Hành Tinh Ngục Tù (Prison Planet)',
    desc: 'Bầu trời u ám với dây xích phong ấn khổng lồ của Hành tinh ngục tù',
    planetId: 0,
    tag: 'Ngục Tù',
    layers: [
      { layer: 0, fileName: 'b170.png', url: '/api/v1/assets/bg/b170.png' },
      { layer: 1, fileName: 'b171.png', url: '/api/v1/assets/bg/b171.png' },
      { layer: 2, fileName: 'b172.png', url: '/api/v1/assets/bg/b172.png' },
      { layer: 3, fileName: 'b173.png', url: '/api/v1/assets/bg/b173.png' },
    ],
  },
  {
    bgId: 18,
    name: 'Rừng Nguyên Thủy & Làng Plant',
    desc: 'Cảnh rừng đại ngàn hoang sơ thời tiền sử của tộc Plant',
    planetId: 1,
    tag: 'Plant',
    layers: [
      { layer: 0, fileName: 'b180.png', url: '/api/v1/assets/bg/b180.png' },
      { layer: 1, fileName: 'b181.png', url: '/api/v1/assets/bg/b181.png' },
      { layer: 2, fileName: 'b182.png', url: '/api/v1/assets/bg/b182.png' },
      { layer: 3, fileName: 'b183.png', url: '/api/v1/assets/bg/b183.png' },
    ],
  },
];

export default function MapEditorPage() {
  // Master state
  const [maps, setMaps] = useState([]);
  const [summary, setSummary] = useState({ total: 0, totalMobs: 0, totalNpcs: 0, totalWaypoints: 0 });
  const [metaOptions, setMetaOptions] = useState({ mobTemplates: [], npcTemplates: [], maps: [], itemBgTemplates: [] });
  const [selectedMapId, setSelectedMapId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Layout expansion states (Expand viewport & theater mode)
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightInspectorCollapsed, setRightInspectorCollapsed] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [planetFilter, setPlanetFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Active Map Data for Editing
  const [currentMap, setCurrentMap] = useState(null);
  const [originalMap, setOriginalMap] = useState(null);
  const [activeTab, setActiveTab] = useState('layout'); // layout | waypoints | mobs | npcs | dimensions | general | tools

  // Visual Canvas States
  const [zoomLevel, setZoomLevel] = useState(0.5);
  const [showGrid, setShowGrid] = useState(true);
  const [showMapBackground, setShowMapBackground] = useState(true);
  const [showTerrain, setShowTerrain] = useState(true);
  const [showBgItems, setShowBgItems] = useState(true);
  const [showWaypoints, setShowWaypoints] = useState(true);
  const [showMobs, setShowMobs] = useState(true);
  const [showNpcs, setShowNpcs] = useState(true);
  const [showEffects, setShowEffects] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [bgOpacity, setBgOpacity] = useState(0.9);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, tileX: 0, tileY: 0 });
  const [activeTool, setActiveTool] = useState('select'); // select | paint-tile | erase-tile | line-tile | rect-tile | platform-tile | fill-tile | pipette-tile | add-bg-item | add-mob | add-npc | add-waypoint | add-effect
  const [brushSize, setBrushSize] = useState(1); // 1, 2, 3, 4, 5
  const [rectMode, setRectMode] = useState('filled'); // 'filled' | 'hollow'
  const [platformThickness, setPlatformThickness] = useState(2); // 1, 2, 3
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [dragDrawStart, setDragDrawStart] = useState(null);
  const [historyStack, setHistoryStack] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // AI Auto-Map Generator & DeepSeek States
  const [showAiMapModal, setShowAiMapModal] = useState(false);
  const [deepseekApiKey, setDeepseekApiKey] = useState(() => localStorage.getItem('nro_deepseek_api_key') || '');
  const [deepseekModel, setDeepseekModel] = useState('deepseek-chat');
  const [deepseekPrompt, setDeepseekPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [aiModeTab, setAiModeTab] = useState('vision'); // 'vision' | 'deepseek' | 'procedural'

  // AI Vision & Image Layout Recognition States
  const [showVisionModal, setShowVisionModal] = useState(false);
  const [visionImage, setVisionImage] = useState(null); // base64 string / data url
  const [visionFileName, setVisionFileName] = useState('');
  const [visionProcessing, setVisionProcessing] = useState(false);
  const [visionMode, setVisionMode] = useState('cv'); // 'cv' (Fast Computer Vision) | 'ai' (Cloud AI Vision)
  const [visionProvider, setVisionProvider] = useState('gemini'); // 'gemini' | 'openai' | 'openrouter'
  const [visionApiKey, setVisionApiKey] = useState(() => localStorage.getItem('nro_vision_api_key') || '');
  const [visionModel, setVisionModel] = useState('');
  const [visionThreshold, setVisionThreshold] = useState(0.48); // 0.20 to 0.80
  const [visionTileId, setVisionTileId] = useState(1);
  const [visionGridW, setVisionGridW] = useState(60);
  const [visionGridH, setVisionGridH] = useState(20);
  const [visionAutoDetectMobs, setVisionAutoDetectMobs] = useState(true);
  const [visionAutoDetectDecor, setVisionAutoDetectDecor] = useState(true);
  const [visionAutoTiling, setVisionAutoTiling] = useState(true);
  const [visionDetectedPlan, setVisionDetectedPlan] = useState(null);
  const [isDraggingOverVision, setIsDraggingOverVision] = useState(false);
  const visionPreviewCanvasRef = useRef(null);

  // Reference Blueprint Trace Overlay States (Lồng ảnh mẫu soi đồ họa khớp lưới)
  const [showOverlayImage, setShowOverlayImage] = useState(false);
  const [overlayImageUrl, setOverlayImageUrl] = useState(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.55); // 0.10 to 1.0
  const [overlayLayer, setOverlayLayer] = useState('under'); // 'under' (dưới gạch) | 'over' (trên gạch)
  const [overlayFitMode, setOverlayFitMode] = useState('stretch'); // 'stretch' (khớp lưới 100%) | 'contain' | 'original'
  const [overlayOffsetX, setOverlayOffsetX] = useState(0);
  const [overlayOffsetY, setOverlayOffsetY] = useState(0);
  const [showOverlaySettings, setShowOverlaySettings] = useState(false);

  const [aiMapForm, setAiMapForm] = useState({
    preset: 'forest_multi_tier', // forest_multi_tier (Map 161) | earth_plains | namec_floating | xayda_badlands | hell_volcano | martial_arena | custom
    groundHeightPercent: 68,
    roughness: 'medium', // 'flat' | 'smooth' | 'medium' | 'rugged'
    floatingIslands: 3, // 0, 1, 2, 3, 4, 5
    decorDensity: 'medium', // 'none' | 'low' | 'medium' | 'high'
    mobDensity: 'medium', // 'none' | 'light' | 'medium' | 'dense'
    mobLevel: 10,
    mobTempId: 0,
    autoWaypoints: true,
    autoNpc: true,
    clearExisting: true,
  });
  const [aiPreviewStats, setAiPreviewStats] = useState(null);
  const [customBeffInput, setCustomBeffInput] = useState('');
  const [tilesetImg, setTilesetImg] = useState(null);
  const [selectedTileIndex, setSelectedTileIndex] = useState(1);
  const [tilePalette, setTilePalette] = useState([]);
  const [isPaintingTerrain, setIsPaintingTerrain] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const terrainCanvasRef = useRef(null);

  // Selected item template for placement & size scaling
  const [selectedBgTempId, setSelectedBgTempId] = useState('0');
  const [bgItemPlacementMode, setBgItemPlacementMode] = useState('grid'); // 'grid' | 'free'
  const [bgItemPlacementLayer, setBgItemPlacementLayer] = useState(1); // 1: L1 Mặt đất (Trên gạch), 3: L3 Dưới gạch, 2: L2 Tiền cảnh, 4: L4 Nền xa Parallax
  const [bgItemScale, setBgItemScale] = useState(1.0); // 0.25 to 3.0
  const [bgItemCustomWidth, setBgItemCustomWidth] = useState('');
  const [bgItemCustomHeight, setBgItemCustomHeight] = useState('');
  const [bgItemFlipX, setBgItemFlipX] = useState(false);
  const [selectedBgItemIdx, setSelectedBgItemIdx] = useState(null);
  const [bgSearchText, setBgSearchText] = useState('');
  const [catalogLayerFilter, setCatalogLayerFilter] = useState('all'); // 'all' | 'ground' | 'parallax'

  // Dragging state on canvas
  const [draggingItem, setDraggingItem] = useState(null); // { type: 'bgItem'|'mob'|'npc'|'waypoint', index: number }

  // Modals & Tools
  const [showBgCatalogModal, setShowBgCatalogModal] = useState(false);
  const [showUploadItemBgModal, setShowUploadItemBgModal] = useState(false);
  const [uploadItemBgForm, setUploadItemBgForm] = useState({ layer: 1, dx: 0, dy: 0, imageBase64: '', previewUrl: '' });
  const [isUploadingItemBg, setIsUploadingItemBg] = useState(false);
  const [showCloneBgItemsModal, setShowCloneBgItemsModal] = useState(false);
  const [cloneSourceMapId, setCloneSourceMapId] = useState('');
  const [isCloningBgItems, setIsCloningBgItems] = useState(false);
  const [showBgSceneryCatalogModal, setShowBgSceneryCatalogModal] = useState(false);
  const [bgSceneryList, setBgSceneryList] = useState(PRESET_BACKGROUND_SETS);
  const [bgDecorFiles, setBgDecorFiles] = useState([]);
  const [bgScenerySearch, setBgScenerySearch] = useState('');
  const [bgSceneryPlanetFilter, setBgSceneryPlanetFilter] = useState('all');
  const [showBgCustomizer, setShowBgCustomizer] = useState(false);
  const [bgCustomConfig, setBgCustomConfig] = useState({
    layers: {
      0: { enabled: true, heightScale: 1.0, bottomOffset: 0, opacity: 1.0 },
      1: { enabled: true, heightScale: 1.0, bottomOffset: 0, opacity: 1.0 },
      2: { enabled: true, heightScale: 1.0, bottomOffset: 0, opacity: 1.0 },
      3: { enabled: true, heightScale: 1.0, bottomOffset: 0, opacity: 1.0 },
      4: { enabled: true, heightScale: 1.0, bottomOffset: 0, opacity: 1.0 },
    },
    decor: {
      sun: null, // null | 'sun0.png' | 'sun1.png' ...
      cloud: true,
      fog: null, // null | 'fog0.png' | 'fog1.png'
      weather: null, // null | 'mua.png' | 'tuyet.png' | 'lacay.png' | 'fire1.png'
    },
  });
  const [showUploadBgModal, setShowUploadBgModal] = useState(false);
  const [uploadBgForm, setUploadBgForm] = useState({
    bgId: 17,
    name: 'Phông Nền Mới',
    planetId: 0,
    tag: 'Tùy Chỉnh',
    layers: [
      { layer: 0, label: 'Lớp 0 (Cận cảnh / Chân đồi sát đất)', file: null, preview: '' },
      { layer: 1, label: 'Lớp 1 (Cảnh gần / Đồi cây)', file: null, preview: '' },
      { layer: 2, label: 'Lớp 2 (Cảnh trung / Dãy núi)', file: null, preview: '' },
      { layer: 3, label: 'Lớp 3 (Cảnh xa nhất / Chân trời)', file: null, preview: '' },
    ],
  });
  const [uploadingBg, setUploadingBg] = useState(false);
  const [showTileCatalogModal, setShowTileCatalogModal] = useState(false);
  const [tileCatalogSearch, setTileCatalogSearch] = useState('');
  const [showNewMapModal, setShowNewMapModal] = useState(false);
  const [newMapForm, setNewMapForm] = useState({
    id: '',
    name: '',
    planetId: 0,
    type: 0,
    creationMode: 'ai', // 'ai' | 'clone' | 'blank'
    cloneFromId: '',
    tmw: 60,
    tmh: 20,
    tileId: 1,
    masterZoom: 'x4',
    preset: 'forest_multi_tier',
    deepseekPrompt: '',
    groundHeightPercent: 68,
    roughness: 'medium',
    floatingIslands: 2,
    mobDensity: 'medium',
    mobLevel: 10,
    decorDensity: 'medium',
    autoWaypoints: true,
    autoNpc: true,
  });
  const [showHealthCheckModal, setShowHealthCheckModal] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSqlText, setExportSqlText] = useState('');

  // Batch Mob Spawner Form State
  const [batchMobForm, setBatchMobForm] = useState({
    mobTempId: 0,
    mobLevel: 1,
    mobHp: 100,
    percentDame: 10,
    mobDame: 10,
    count: 4,
    minX: 200,
    maxX: 1200,
    fixedY: 400,
  });

  // Drop System States
  const [dropFilterMob, setDropFilterMob] = useState('all');
  const [showItemCatalogModal, setShowItemCatalogModal] = useState(false);
  const [itemSearchText, setItemSearchText] = useState('');
  const [itemPickerTargetIndex, setItemPickerTargetIndex] = useState(null);

  const canvasContainerRef = useRef(null);
  const boardRef = useRef(null);

  // Exact Board Coordinate Calculation
  const getBoardCoordinates = useCallback((e) => {
    if (!boardRef.current || !currentMap) return { x: 0, y: 0, tileX: 0, tileY: 0 };
    const rect = boardRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left) / zoomLevel;
    const rawY = (e.clientY - rect.top) / zoomLevel;
    const pxw = currentMap.pxw || 1440;
    const pxh = currentMap.pxh || 480;
    const tmw = currentMap.tmw || Math.ceil(pxw / 24) || 60;
    const tmh = currentMap.tmh || Math.ceil(pxh / 24) || 20;
    const x = Math.max(0, Math.min(pxw, Math.round(rawX)));
    const y = Math.max(0, Math.min(pxh, Math.round(rawY)));
    const tileX = Math.max(0, Math.min(tmw - 1, Math.floor(rawX / 24)));
    const tileY = Math.max(0, Math.min(tmh - 1, Math.floor(rawY / 24)));
    return { x, y, tileX, tileY };
  }, [currentMap, zoomLevel]);

  // Fit to screen calculation
  const handleFitToScreen = useCallback(() => {
    if (!currentMap || !canvasContainerRef.current) return;
    const container = canvasContainerRef.current;
    const padding = 32;
    const availW = container.clientWidth - padding;
    const availH = container.clientHeight - padding;
    const pxw = currentMap.pxw || 1440;
    const pxh = currentMap.pxh || 480;
    if (availW <= 0 || availH <= 0 || pxw <= 0 || pxh <= 0) return;
    const scaleX = availW / pxw;
    const scaleY = availH / pxh;
    const bestScale = Math.min(scaleX, scaleY, 1.5);
    const rounded = Math.max(0.1, Number(bestScale.toFixed(2)));
    setZoomLevel(rounded);
  }, [currentMap?.pxw, currentMap?.pxh]);

  // 1. Tải ảnh texture Tileset khi chọn map / đổi tileId
  useEffect(() => {
    if (!currentMap?.tileId && currentMap?.tileId !== 0) return;
    const tid = currentMap.tileId || 1;
    const img = new Image();
    img.src = `/api/v1/assets/tile-set/${tid}.png?v=${Date.now()}`;
    img.onload = () => {
      setTilesetImg(img);
      const count = Math.max(1, Math.floor(img.naturalHeight / 24));
      const indices = Array.from({ length: count }, (_, i) => i + 1);
      setTilePalette(indices);
    };
    img.onerror = () => {
      setTilesetImg(null);
      setTilePalette(Array.from({ length: 30 }, (_, i) => i + 1));
    };
  }, [currentMap?.tileId]);

  // Đặt / vẽ 1 ô gạch vào ma trận
  const paintTileAt = useCallback((tileX, tileY, tileValue) => {
    if (!currentMap) return;
    const w = currentMap.tmw || 60;
    const h = currentMap.tmh || 20;
    if (tileX < 0 || tileX >= w || tileY < 0 || tileY >= h) return;
    const idx = tileY * w + tileX;
    const matrix = [...(currentMap.tileMatrix || [])];
    while (matrix.length < w * h) matrix.push(0);
    if (matrix[idx] === tileValue) return;
    matrix[idx] = tileValue;
    setCurrentMap((prev) => ({ ...prev, tileMatrix: matrix }));
  }, [currentMap]);

  // Đổ màu / Đổ gạch flood fill
  const floodFillTerrain = useCallback((startX, startY, fillVal) => {
    if (!currentMap) return;
    const w = currentMap.tmw || 60;
    const h = currentMap.tmh || 20;
    if (startX < 0 || startX >= w || startY < 0 || startY >= h) return;
    const matrix = [...(currentMap.tileMatrix || [])];
    while (matrix.length < w * h) matrix.push(0);
    const targetVal = matrix[startY * w + startX] ?? 0;
    if (targetVal === fillVal) return;

    const queue = [[startX, startY]];
    const visited = new Uint8Array(w * h);
    visited[startY * w + startX] = 1;

    while (queue.length > 0) {
      const [cx, cy] = queue.pop();
      const idx = cy * w + cx;
      matrix[idx] = fillVal;

      const neighbors = [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1],
      ];
      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const nIdx = ny * w + nx;
          if (!visited[nIdx] && matrix[nIdx] === targetVal) {
            visited[nIdx] = 1;
            queue.push([nx, ny]);
          }
        }
      }
    }
    setCurrentMap((prev) => ({ ...prev, tileMatrix: matrix }));
  }, [currentMap]);


  // Record history snapshot for Undo / Redo
  const recordHistory = useCallback((mapState) => {
    if (!mapState) return;
    const snapshot = {
      tileMatrix: [...(mapState.tileMatrix || [])],
      bgItems: JSON.parse(JSON.stringify(mapState.bgItems || [])),
      mobs: JSON.parse(JSON.stringify(mapState.mobs || [])),
      npcs: JSON.parse(JSON.stringify(mapState.npcs || [])),
      waypoints: JSON.parse(JSON.stringify(mapState.waypoints || [])),
      effects: JSON.parse(JSON.stringify(mapState.effects || { effs: [], beffs: [] })),
    };
    setHistoryStack((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      const updated = [...sliced, snapshot];
      if (updated.length > 30) updated.shift();
      return updated;
    });
    setHistoryIndex((prev) => Math.min(29, prev + 1));
  }, [historyIndex]);

  // Undo Action
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0 || !historyStack[historyIndex - 1]) return;
    const targetIdx = historyIndex - 1;
    const snapshot = historyStack[targetIdx];
    setCurrentMap((prev) => ({
      ...prev,
      tileMatrix: [...snapshot.tileMatrix],
      bgItems: JSON.parse(JSON.stringify(snapshot.bgItems)),
      mobs: JSON.parse(JSON.stringify(snapshot.mobs)),
      npcs: JSON.parse(JSON.stringify(snapshot.npcs)),
      waypoints: JSON.parse(JSON.stringify(snapshot.waypoints)),
      effects: JSON.parse(JSON.stringify(snapshot.effects)),
    }));
    setHistoryIndex(targetIdx);
  }, [historyIndex, historyStack]);

  // Redo Action
  const handleRedo = useCallback(() => {
    if (historyIndex >= historyStack.length - 1 || !historyStack[historyIndex + 1]) return;
    const targetIdx = historyIndex + 1;
    const snapshot = historyStack[targetIdx];
    setCurrentMap((prev) => ({
      ...prev,
      tileMatrix: [...snapshot.tileMatrix],
      bgItems: JSON.parse(JSON.stringify(snapshot.bgItems)),
      mobs: JSON.parse(JSON.stringify(snapshot.mobs)),
      npcs: JSON.parse(JSON.stringify(snapshot.npcs)),
      waypoints: JSON.parse(JSON.stringify(snapshot.waypoints)),
      effects: JSON.parse(JSON.stringify(snapshot.effects)),
    }));
    setHistoryIndex(targetIdx);
  }, [historyIndex, historyStack]);

  // Đặt / vẽ mảng ô gạch theo kích thước cọ Brush Size (1x1 .. 5x5)
  const paintTileBlock = useCallback((centerTileX, centerTileY, tileValue, size = 1) => {
    if (!currentMap) return;
    const w = currentMap.tmw || 60;
    const h = currentMap.tmh || 20;
    const half = Math.floor(size / 2);
    const startX = centerTileX - half;
    const endX = startX + size - 1;
    const startY = centerTileY - half;
    const endY = startY + size - 1;

    setCurrentMap((prev) => {
      const matrix = [...(prev.tileMatrix || [])];
      while (matrix.length < w * h) matrix.push(0);
      let changed = false;
      for (let cy = startY; cy <= endY; cy++) {
        if (cy < 0 || cy >= h) continue;
        for (let cx = startX; cx <= endX; cx++) {
          if (cx < 0 || cx >= w) continue;
          const idx = cy * w + cx;
          if (matrix[idx] !== tileValue) {
            matrix[idx] = tileValue;
            changed = true;
          }
        }
      }
      return changed ? { ...prev, tileMatrix: matrix } : prev;
    });
  }, [currentMap]);

  // Bresenham line algorithm for Line Tool
  const getLineCells = useCallback((x0, y0, x1, y1) => {
    const cells = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let currX = x0;
    let currY = y0;

    while (true) {
      cells.push([currX, currY]);
      if (currX === x1 && currY === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        currX += sx;
      }
      if (e2 < dx) {
        err += dx;
        currY += sy;
      }
    }
    return cells;
  }, []);

  // Rectangle cells calculation
  const getRectCells = useCallback((x0, y0, x1, y1, mode = 'filled') => {
    const cells = [];
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);

    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) {
        if (mode === 'filled' || cx === minX || cx === maxX || cy === minY || cy === maxY) {
          cells.push([cx, cy]);
        }
      }
    }
    return cells;
  }, []);

  // Platform cells calculation
  const getPlatformCells = useCallback((x0, x1, y, thickness = 2, topVal = 1, bodyVal = 4) => {
    const cells = [];
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    for (let cx = minX; cx <= maxX; cx++) {
      cells.push({ x: cx, y, val: topVal });
      for (let t = 1; t < thickness; t++) {
        cells.push({ x: cx, y: y + t, val: bodyVal });
      }
    }
    return cells;
  }, []);

  // Smart Auto-Tiling Engine: Tự động gọt viền, mép đồi, vách đứng, lõi đất và đáy đảo bay
    // Smart Auto-Tiling Engine: Tự động gọt viền, mép đồi, vách đứng, lõi đất và đáy đảo bay
  const autoTileMatrix = useCallback((matrix, tmw, tmh, tileId = 1) => {
    if (!matrix || matrix.length === 0) return [];
    const isSolid = (cx, cy) => {
      if (cx < 0 || cx >= tmw || cy < 0 || cy >= tmh) return false;
      return (matrix[cy * tmw + cx] || 0) > 0;
    };

    // Mapping tiles theo TileSet chuẩn NRO
    let t = {
      topLeft: 21,
      topMid: 23,
      topRight: 24,
      wallLeft: 16,
      core: 13,
      wallRight: 17,
      botLeft: 18,
      botRight: 20,
      botMid: 19,
      thinBridgeLeft: 4,
      thinBridgeMid: 5,
      thinBridgeRight: 7,
      singleTile: 23,
    };

    if (tileId === 1) { // Trái Đất (Earth)
      t = { topLeft: 21, topMid: 23, topRight: 24, wallLeft: 16, core: 13, wallRight: 17, botLeft: 18, botRight: 20, botMid: 19, thinBridgeLeft: 4, thinBridgeMid: 5, thinBridgeRight: 7, singleTile: 23 };
    } else if (tileId === 2) { // Namec Tileset
      t = { topLeft: 1, topMid: 2, topRight: 3, wallLeft: 4, core: 5, wallRight: 6, botLeft: 7, botRight: 8, botMid: 5, thinBridgeLeft: 1, thinBridgeMid: 2, thinBridgeRight: 3, singleTile: 2 };
    } else if (tileId === 3) { // Xayda Tileset
      t = { topLeft: 1, topMid: 2, topRight: 3, wallLeft: 4, core: 6, wallRight: 7, botLeft: 8, botRight: 9, botMid: 6, thinBridgeLeft: 1, thinBridgeMid: 2, thinBridgeRight: 3, singleTile: 2 };
    } else if (tileId === 4 || tileId === 7) { // Hell / Cave Tileset
      t = { topLeft: 1, topMid: 2, topRight: 3, wallLeft: 4, core: 5, wallRight: 6, botLeft: 7, botRight: 8, botMid: 5, thinBridgeLeft: 1, thinBridgeMid: 2, thinBridgeRight: 3, singleTile: 2 };
    } else if (tileId === 5 || tileId === 6) { // Arena / Kami Palace
      t = { topLeft: 1, topMid: 1, topRight: 1, wallLeft: 2, core: 3, wallRight: 2, botLeft: 3, botRight: 3, botMid: 3, thinBridgeLeft: 1, thinBridgeMid: 1, thinBridgeRight: 1, singleTile: 1 };
    } else if (tileId === 31) { // Rừng nguyên thủy (Map 161 Masterpiece)
      t = { topLeft: 1, topMid: 2, topRight: 3, wallLeft: 4, core: 5, wallRight: 6, botLeft: 31, botRight: 33, botMid: 32, thinBridgeLeft: 1, thinBridgeMid: 2, thinBridgeRight: 3, singleTile: 2 };
    }

    const result = [...matrix];

    for (let cy = 0; cy < tmh; cy++) {
      for (let cx = 0; cx < tmw; cx++) {
        const idx = cy * tmw + cx;
        if (!isSolid(cx, cy)) continue;

        const up = isSolid(cx, cy - 1);
        const down = isSolid(cx, cy + 1);
        const left = isSolid(cx - 1, cy);
        const right = isSolid(cx + 1, cy);

        // Single isolated tile
        if (!up && !down && !left && !right) {
          result[idx] = t.singleTile;
          continue;
        }

        // 1-tile thin horizontal bridge
        if (!up && !down) {
          if (!left && right) result[idx] = t.thinBridgeLeft;
          else if (left && !right) result[idx] = t.thinBridgeRight;
          else result[idx] = t.thinBridgeMid;
          continue;
        }

        // 1-tile thin vertical column
        if (!left && !right) {
          if (!up && down) result[idx] = t.topMid;
          else if (up && !down) result[idx] = t.botMid;
          else result[idx] = t.wallLeft;
          continue;
        }

        if (!up) {
          // Top Surface
          if (!left && right) result[idx] = t.topLeft;
          else if (left && !right) result[idx] = t.topRight;
          else result[idx] = t.topMid;
        } else if (!down) {
          // Bottom Underside (Floating island bottom / Ceiling arch)
          if (!left && right) result[idx] = t.botLeft;
          else if (left && !right) result[idx] = t.botRight;
          else result[idx] = t.botMid;
        } else {
          // Underground / Wall
          if (!left && right) result[idx] = t.wallLeft;
          else if (left && !right) result[idx] = t.wallRight;
          else result[idx] = t.core;
        }
      }
    }
    return result;
  }, []);

  // Action: Tự động gọt viền & làm đẹp toàn bộ map hiện tại
  const handleAutoTileCurrentMap = useCallback(() => {
    if (!currentMap) return;
    recordHistory(currentMap);
    const tmw = currentMap.tmw || 60;
    const tmh = currentMap.tmh || 20;
    const refined = autoTileMatrix(currentMap.tileMatrix || [], tmw, tmh, currentMap.tileId || 1);
    setCurrentMap((prev) => ({ ...prev, tileMatrix: refined }));
    setSuccessMsg('🪄 Đã tự động xếp gạch, gọt góc và bo viền chuẩn đẹp cho toàn bộ bản đồ!');
  }, [currentMap, autoTileMatrix, recordHistory]);

  // AI Procedural Level Designer: Thuật toán sinh thiết kế bản đồ độc lập 100% từ số học
  const generateAiMapPlan = useCallback((map, form, meta) => {
    const tmw = map.tmw || 60;
    const tmh = map.tmh || 20;
    const pxw = tmw * 24;
    const pxh = tmh * 24;
    const tileMatrix = new Array(tmw * tmh).fill(0);
    const bgItems = [];
    const mobs = [];
    const waypoints = [];
    const npcs = [];
    const walkableSurfaces = [];

    const preset = form.preset || 'earth_plains';
    const seed = form.seed || Math.floor(Math.random() * 999999);

    // Pseudorandom generator using seed
    const pseudoRandom = (offset = 0) => {
      const x = Math.sin(seed * 12.9898 + offset * 78.233) * 43758.5453;
      return x - Math.floor(x);
    };

    // Layered harmonic wave noise
    const layeredNoise = (x, freq1 = 0.08, freq2 = 0.18, freq3 = 0.35) => {
      const n1 = Math.sin((x + (seed % 100)) * freq1);
      const n2 = Math.cos((x * 1.3 + (seed % 200)) * freq2) * 0.5;
      const n3 = Math.sin((x * 2.1 + (seed % 300)) * freq3) * 0.25;
      return (n1 + n2 + n3) / 1.75;
    };

    let tileId = 1;
    let mobCandIds = [1, 2, 3, 4, 5, 6];
    let decorCandIds = [0, 1, 2, 3, 4, 11, 12, 13, 20, 21];
    let defaultNpcId = 0; // Gohan

    if (preset === 'forest_multi_tier') {
      // NGUYÊN MẪU MAP 161: BÌA RỪNG NGUYÊN THỦY ĐA TẦNG
      tileId = 31;
      mobCandIds = [80, 81];
      decorCandIds = [52, 90];
      defaultNpcId = 0;
    } else if (preset === 'namec_floating') {
      tileId = 2;
      mobCandIds = [7, 8, 9, 10, 11];
      decorCandIds = [30, 31, 32, 35, 40, 42, 45, 50];
      defaultNpcId = 14; // Guru
    } else if (preset === 'xayda_badlands') {
      tileId = 3;
      mobCandIds = [13, 14, 15, 16, 17];
      decorCandIds = [60, 61, 62, 65, 70, 72, 75];
      defaultNpcId = 15; // BaDa
    } else if (preset === 'hell_volcano') {
      tileId = 4;
      mobCandIds = [25, 26, 27, 28, 29];
      decorCandIds = [80, 81, 85, 90, 95];
      defaultNpcId = 12; // Quy Lao / Yama
    } else if (preset === 'martial_arena') {
      tileId = 5;
      mobCandIds = [0]; // Moc nhan
      decorCandIds = [1, 5, 10, 15];
      defaultNpcId = 7; // Trong tai
    }

    if (Number(form.mobTempId) > 0) {
      mobCandIds = [Number(form.mobTempId)];
    }

    const groundPct = Number(form.groundHeightPercent) || 65;
    const baseGroundRow = Math.max(5, Math.min(tmh - 3, Math.round(tmh * (1 - groundPct / 100))));
    const groundY = new Array(tmw).fill(baseGroundRow);

    // 1. TOPOLOGY GENERATION ENGINE (THIẾT KẾ ĐỊA HÌNH ĐỘC LẬP THEO KIẾN TRÚC)
    if (preset === 'forest_multi_tier') {
      // KIẾN TRÚC MASTERPIECE MAP 161: BÌA RỪNG NGUYÊN THỦY 33-TILES CHUẨN ĐẸP 100%
      const groundBaseRow = Math.max(8, tmh - 5);
      // Sàn đáy ngầm (Ground Base) với hoa văn vỏ gỗ & lõi ngầm
      for (let c = 0; c < tmw; c++) {
        groundY[c] = groundBaseRow;
        walkableSurfaces.push({ col: c, row: groundBaseRow, x: c * 24, y: groundBaseRow * 24, type: 'ground' });

        if (groundBaseRow - 1 >= 0) {
          tileMatrix[(groundBaseRow - 1) * tmw + c] = (c % 5 === 0 ? 10 : (c % 7 === 0 ? 12 : 8));
        }
        tileMatrix[groundBaseRow * tmw + c] = (c === 0 ? 1 : (c === tmw - 1 ? 3 : 2));

        for (let r = groundBaseRow + 1; r < tmh; r++) {
          if (r === groundBaseRow + 1) {
            tileMatrix[r * tmw + c] = (c % 7 === 3 ? 4 : (c % 7 === 5 ? 5 : (c % 11 === 6 ? 6 : 2)));
          } else {
            tileMatrix[r * tmw + c] = (r === tmh - 1 ? 32 : 2);
          }
        }
      }

      // Các tầng cành cây to lơ lửng (Canopy Branches)
      const layerRows = [
        Math.max(4, Math.floor(tmh * 0.16)),
        Math.max(7, Math.floor(tmh * 0.35)),
        Math.max(10, Math.floor(tmh * 0.55)),
        Math.max(13, Math.floor(tmh * 0.75)),
      ];

      const leafTiles = [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 27, 28, 29];
      const barkTiles = [8, 8, 10, 8, 11, 12, 13, 12, 11, 8];

      layerRows.forEach((rowY, lIdx) => {
        const branchCount = 2;
        const segmentW = Math.floor(tmw / branchCount);
        for (let b = 0; b < branchCount; b++) {
          const bLen = Math.max(10, Math.min(26, Math.floor(segmentW * 0.75 + pseudoRandom(lIdx * 10 + b) * 8)));
          const startC = Math.max(2, Math.min(tmw - bLen - 2, b * segmentW + ((lIdx % 2 === 0) ? 3 : 8)));
          const endC = startC + bLen - 1;

          // 1. Tán lá xum xuê (rowY - 2)
          if (rowY - 2 >= 0) {
            for (let c = startC; c <= endC; c++) {
              const idx = (rowY - 2) * tmw + c;
              if (tileMatrix[idx] === 0) {
                tileMatrix[idx] = leafTiles[(c * 7 + rowY * 13) % leafTiles.length];
              }
            }
          }

          // 2. Mép vỏ cây trên (rowY - 1)
          if (rowY - 1 >= 0) {
            for (let c = startC; c <= endC; c++) {
              const idx = (rowY - 1) * tmw + c;
              if (tileMatrix[idx] === 0) {
                if (c === startC) tileMatrix[idx] = 7;
                else if (c === endC) tileMatrix[idx] = 9;
                else tileMatrix[idx] = barkTiles[(c + rowY) % barkTiles.length];
              }
            }
          }

          // 3. Mặt gỗ cành cây (rowY)
          for (let c = startC; c <= endC; c++) {
            const idx = rowY * tmw + c;
            if (c === startC) tileMatrix[idx] = 1;
            else if (c === endC) tileMatrix[idx] = 3;
            else {
              if (c % 7 === 3) tileMatrix[idx] = 4;
              else if (c % 7 === 5) tileMatrix[idx] = 5;
              else if (c % 11 === 6) tileMatrix[idx] = 6;
              else tileMatrix[idx] = 2;
            }
            walkableSurfaces.push({ col: c, row: rowY, x: c * 24, y: rowY * 24, type: 'canopy' });
          }

          // 4. Vỏ đáy dưới cành (rowY + 1)
          if (rowY + 1 < tmh) {
            for (let c = startC; c <= endC; c++) {
              const idx = (rowY + 1) * tmw + c;
              if (tileMatrix[idx] === 0) {
                if (c === startC) tileMatrix[idx] = 31;
                else if (c === endC) tileMatrix[idx] = 33;
                else tileMatrix[idx] = 32;
              }
            }
          }
        }
      });

      // 2 Thân cây cổ thụ đại ngàn nối suốt từ đáy lên tầng ngọn (Tile 30)
      const trunk1 = Math.max(6, Math.floor(tmw * 0.32));
      const trunk2 = Math.max(trunk1 + 10, Math.floor(tmw * 0.68));
      [trunk1, trunk2].forEach((tCol) => {
        const trunkW = 4;
        const topY = layerRows[0];
        const botY = groundBaseRow;
        for (let r = topY; r <= botY; r++) {
          for (let tc = tCol; tc < tCol + trunkW && tc < tmw; tc++) {
            tileMatrix[r * tmw + tc] = 30; // Tile 30 chuẩn vỏ thân cây Map 161
          }
        }
        walkableSurfaces.push({ col: tCol, row: topY, x: tCol * 24, y: topY * 24, type: 'trunk_top' });
      });

    } else if (preset === 'martial_arena') {
      // KIẾN TRÚC VÕ ĐÀI HOÀNG GIA (ĐỐI XỨNG, CÓ BỆ ĐÀI VÀ KHÁN ĐÀI 2 CÁNH)
      const arenaW = Math.min(tmw - 10, Math.max(20, Math.floor(tmw * 0.65)));
      const startC = Math.floor((tmw - arenaW) / 2);
      const endC = startC + arenaW - 1;
      const arenaRow = baseGroundRow - 2;

      for (let c = 0; c < tmw; c++) {
        let y = baseGroundRow;
        if (c >= startC && c <= endC) {
          y = arenaRow; // Sàn đấu chính nâng cao
        } else if (c === startC - 1 || c === startC - 2 || c === endC + 1 || c === endC + 2) {
          y = baseGroundRow - 1; // Bậc tam cấp 2 bên
        }
        groundY[c] = y;
        walkableSurfaces.push({ col: c, row: y, x: c * 24, y: y * 24, type: 'ground' });
        for (let r = y; r < tmh; r++) {
          tileMatrix[r * tmw + c] = 1;
        }
      }

      // Khán đài / Trụ đài danh dự 2 bên cánh
      const pillar1 = startC + 3;
      const pillar2 = endC - 3;
      for (let r = arenaRow - 4; r < arenaRow; r++) {
        tileMatrix[r * tmw + pillar1] = 1;
        tileMatrix[r * tmw + pillar2] = 1;
      }
      walkableSurfaces.push({ col: pillar1, row: arenaRow - 4, x: pillar1 * 24, y: (arenaRow - 4) * 24, type: 'pillar' });
      walkableSurfaces.push({ col: pillar2, row: arenaRow - 4, x: pillar2 * 24, y: (arenaRow - 4) * 24, type: 'pillar' });

    } else if (preset === 'hell_volcano') {
      // KIẾN TRÚC HANG ĐỘNG MÁI VÒM & NÚI LỬA NGẦM (CÓ TRẦN ĐÁ, HẺM NÚI & TRỤ ĐÁ)
      const ceilingMax = Math.max(2, Math.floor(tmh * 0.25));
      for (let c = 0; c < tmw; c++) {
        // Trần hang động ngầm lồi lõm
        const ceilY = Math.max(1, Math.min(ceilingMax, Math.round(2 + layeredNoise(c, 0.12, 0.25) * 1.8)));
        for (let r = 0; r <= ceilY; r++) {
          tileMatrix[r * tmw + c] = 1;
        }

        // Sàn hang động gập ghềnh
        const roughAmp = form.roughness === 'rugged' ? 3.5 : (form.roughness === 'smooth' ? 1.2 : 2.2);
        const y = Math.max(ceilY + 4, Math.min(tmh - 2, Math.round(baseGroundRow + layeredNoise(c, 0.1, 0.2) * roughAmp)));
        groundY[c] = y;
        walkableSurfaces.push({ col: c, row: y, x: c * 24, y: y * 24, type: 'ground' });

        for (let r = y; r < tmh; r++) {
          tileMatrix[r * tmw + c] = 1;
        }
      }

      // 1-2 Trụ thạch nhũ kết nối trần và sàn
      const pillarCount = Math.floor(pseudoRandom(1) * 2) + 1;
      for (let p = 0; p < pillarCount; p++) {
        const pCol = Math.floor((tmw / (pillarCount + 1)) * (p + 1) + (pseudoRandom(p + 10) * 6 - 3));
        const startR = 0;
        const endR = groundY[pCol] || baseGroundRow;
        for (let r = startR; r <= endR; r++) {
          tileMatrix[r * tmw + pCol] = 1;
        }
      }

    } else if (preset === 'xayda_badlands') {
      // KIẾN TRÚC HẺM NÚI ĐÁ VỰC SÂU (CHASM & CANYON VỚI CẦU ĐÁ TỰ NHIÊN)
      const chasmWidth = Math.max(6, Math.min(14, Math.floor(tmw * 0.2)));
      const chasmCenter = Math.floor(tmw / 2 + (pseudoRandom(2) * 8 - 4));
      const chasmStart = chasmCenter - Math.floor(chasmWidth / 2);
      const chasmEnd = chasmStart + chasmWidth;

      for (let c = 0; c < tmw; c++) {
        let y = baseGroundRow;
        const isChasm = c >= chasmStart && c <= chasmEnd;

        if (isChasm) {
          y = tmh - 1; // Vực sâu thẳm
        } else {
          // Bờ vực dốc đứng
          const distToChasm = Math.min(Math.abs(c - chasmStart), Math.abs(c - chasmEnd));
          const cliffBoost = distToChasm < 4 ? -2 : (layeredNoise(c, 0.09, 0.22) * 2.5);
          y = Math.max(4, Math.min(tmh - 3, Math.round(baseGroundRow + cliffBoost)));
          walkableSurfaces.push({ col: c, row: y, x: c * 24, y: y * 24, type: 'ground' });
        }
        groundY[c] = y;

        for (let r = y; r < tmh; r++) {
          tileMatrix[r * tmw + c] = 1;
        }
      }

      // Cầu đá tự nhiên hoặc chuỗi bệ đá nhô ra bắc qua vực
      const bridgeRow = Math.max(3, baseGroundRow - 2);
      for (let c = chasmStart - 1; c <= chasmEnd + 1; c++) {
        tileMatrix[bridgeRow * tmw + c] = 1;
        if (bridgeRow + 1 < tmh && c % 3 === 0) {
          tileMatrix[(bridgeRow + 1) * tmw + c] = 1; // Chân cầu đá
        }
        walkableSurfaces.push({ col: c, row: bridgeRow, x: c * 24, y: bridgeRow * 24, type: 'bridge' });
      }

    } else {
      // KIẾN TRÚC TỰ NHIÊN (ĐỒI DỐC BẬC THANG, THUNG LŨNG & BÌNH NGUYÊN)
      let amp = 2.0;
      if (form.roughness === 'flat') amp = 0;
      else if (form.roughness === 'smooth') amp = 1.2;
      else if (form.roughness === 'rugged') amp = 3.6;

      for (let c = 0; c < tmw; c++) {
        let y = baseGroundRow;
        if (form.roughness !== 'flat') {
          // Multi-octave natural terrain wave
          const wave = layeredNoise(c, 0.08, 0.19, 0.38) * amp;
          // Ghềnh đá bậc thang tự nhiên (Terrace snapping)
          let stepped = Math.round(baseGroundRow + wave);
          if (c % 8 >= 2 && c % 8 <= 6) {
            stepped = Math.round(baseGroundRow + Math.round(wave * 0.7)); // Ghềnh phẳng
          }
          y = Math.max(4, Math.min(tmh - 2, stepped));
        }
        groundY[c] = y;
        walkableSurfaces.push({ col: c, row: y, x: c * 24, y: y * 24, type: 'ground' });

        for (let r = y; r < tmh; r++) {
          tileMatrix[r * tmw + c] = 1;
        }
      }
    }

    // 2. PROCEDURAL ORGANIC FLOATING ISLANDS (QUẦN ĐẢO NỔI ĐA TẦNG V-SHAPE)
    const islandCount = Math.max(0, Math.min(5, Number(form.floatingIslands || 0)));
    if (islandCount > 0 && preset !== 'martial_arena') {
      const sectionW = Math.floor(tmw / (islandCount + 1));

      for (let i = 0; i < islandCount; i++) {
        const centerCol = sectionW * (i + 1) + Math.floor(pseudoRandom(i * 7) * 6 - 3);
        const islandWidth = Math.max(5, Math.min(14, Math.floor(7 + pseudoRandom(i * 13) * 6)));
        const startCol = Math.max(2, Math.min(tmw - islandWidth - 2, Math.floor(centerCol - islandWidth / 2)));
        const endCol = startCol + islandWidth - 1;

        // Bố trí so le hình nấc thang parkour (Z-pattern)
        const heightPattern = (i % 2 === 0) ? (baseGroundRow - 4) : (baseGroundRow - 7);
        const islandRow = Math.max(2, Math.min(baseGroundRow - 3, heightPattern + Math.floor(pseudoRandom(i * 19) * 2)));

        for (let c = startCol; c <= endCol; c++) {
          const distFromCenter = Math.abs(c - (startCol + endCol) / 2);
          const maxDepth = Math.max(1, Math.floor(3 - (distFromCenter / (islandWidth / 2)) * 2)); // Đáy thuôn nhọn V-shape hình bát úp

          for (let d = 0; d < maxDepth; d++) {
            const r = islandRow + d;
            if (r < tmh) {
              tileMatrix[r * tmw + c] = 1;
            }
          }
          walkableSurfaces.push({ col: c, row: islandRow, x: c * 24, y: islandRow * 24, type: 'island' });
        }
      }
    }

    // 3. SMART WAYPOINTS AUTO-CONNECTOR (ĐẶT CHUẨN TIẾP ĐẤT TRÁI - PHẢI)
    if (form.autoWaypoints) {
      const leftCol = Math.min(2, tmw - 1);
      const leftGroundY = groundY[leftCol] || baseGroundRow;
      const leftTarget = meta.maps?.find((m) => m.id === (map.id > 0 ? map.id - 1 : 1)) || meta.maps?.[0] || { id: 0, name: 'Làng Aru' };
      waypoints.push({
        id: Date.now() + 1,
        name: `Về: ${leftTarget.name}`,
        minX: 0,
        minY: Math.max(0, (leftGroundY - 3) * 24),
        maxX: 48,
        maxY: Math.min(pxh, (leftGroundY + 1) * 24),
        isEnter: false,
        isOffline: false,
        goMap: leftTarget.id,
        goMapName: leftTarget.name,
        goX: 100,
        goY: 384,
      });

      const rightCol = Math.max(0, tmw - 3);
      const rightGroundY = groundY[rightCol] || baseGroundRow;
      const rightTarget = meta.maps?.find((m) => m.id === (map.id + 1)) || meta.maps?.[1] || { id: 1, name: 'Đồi hoa cúc' };
      waypoints.push({
        id: Date.now() + 2,
        name: `Sang: ${rightTarget.name}`,
        minX: Math.max(0, pxw - 48),
        minY: Math.max(0, (rightGroundY - 3) * 24),
        maxX: pxw,
        maxY: Math.min(pxh, (rightGroundY + 1) * 24),
        isEnter: false,
        isOffline: false,
        goMap: rightTarget.id,
        goMapName: rightTarget.name,
        goX: 100,
        goY: 384,
      });
    }

    // 4. SMART MOB SPAWNER (PHÂN BỔ BẦY ĐÀN THEO GHỀNH ĐÁ & ĐẢO BAY)
    if (form.mobDensity !== 'none') {
      let mobCount = 6;
      if (form.mobDensity === 'light') mobCount = 4;
      else if (form.mobDensity === 'medium') mobCount = 8;
      else if (form.mobDensity === 'dense') mobCount = 14;

      const lvl = Math.max(1, Number(form.mobLevel || 10));
      const baseHp = lvl * 250;
      const pDame = 10;
      const dame = Math.max(5, Math.round((baseHp * pDame) / 100));

      const usableSurfaces = walkableSurfaces.filter((s) => s.x > 120 && s.x < pxw - 120);
      if (usableSurfaces.length > 0) {
        const step = Math.max(1, Math.floor(usableSurfaces.length / mobCount));

        for (let m = 0; m < mobCount; m++) {
          const pickIdx = Math.min(usableSurfaces.length - 1, m * step + Math.floor(pseudoRandom(m * 31) * (step || 1)));
          const spot = usableSurfaces[pickIdx] || usableSurfaces[0];
          if (!spot) continue;

          const mobTempId = mobCandIds[m % mobCandIds.length];
          const template = meta.mobTemplates?.find((t) => t.id === mobTempId) || { name: `Quái #${mobTempId}` };

          mobs.push({
            id: Date.now() + 100 + m,
            mobTempId,
            mobName: template.name,
            mobLevel: lvl,
            mobHp: baseHp,
            percentDame: pDame,
            mobDame: dame,
            mobX: spot.x + 12,
            mobY: spot.y, // Sát mặt sàn chuẩn xác 100%
          });
        }
      }
    }

    // 5. SMART DECOR OBJECTS (GẮN CÂY CỐI & TẢNG ĐÁ SÁT MẶT CỎ)
    if (form.decorDensity !== 'none') {
      let decorCount = 8;
      if (form.decorDensity === 'low') decorCount = 5;
      else if (form.decorDensity === 'medium') decorCount = 10;
      else if (form.decorDensity === 'high') decorCount = 18;

      const groundSurfaces = walkableSurfaces.filter((s) => (s.type === 'ground' || s.type === 'island') && s.x > 60 && s.x < pxw - 60);
      if (groundSurfaces.length > 0) {
        const dStep = Math.max(1, Math.floor(groundSurfaces.length / decorCount));

        for (let d = 0; d < decorCount; d++) {
          const spot = groundSurfaces[Math.min(groundSurfaces.length - 1, d * dStep + Math.floor(pseudoRandom(d * 47) * (dStep || 1)))];
          if (!spot) continue;
          const bgTempId = decorCandIds[d % decorCandIds.length];
          const tmpl = metaOptions?.itemBgTemplates?.find((b) => Number(b.id) === Number(bgTempId));
          const imageId = tmpl ? tmpl.imageId : bgTempId;
          const layer = tmpl ? tmpl.layer : ((d % 3 === 0) ? 2 : 1);
          const dx = tmpl ? tmpl.dx : 0;
          const dy = tmpl ? tmpl.dy : 0;
          bgItems.push({
            id: Date.now() + 300 + d,
            bgTempId,
            imageId,
            layer,
            dx,
            dy,
            x: spot.col,
            y: Math.max(0, spot.row - 2),
            px: spot.x + dx,
            py: Math.max(0, (spot.row - 2) * 24) + dy,
            imageUrl: tmpl ? tmpl.url : `/api/v1/assets/item-bg/${imageId}.png`,
          });
        }
      }
    }

    // 6. NPC AUTO-PLACER (ĐỨNG Ở VỊ TRÍ ĐẮC ĐỊA GẦN LỐI VÀO HOẶC TRUNG TÂM)
    if (form.autoNpc) {
      const startSpot = walkableSurfaces.find((s) => s.col >= 4 && s.col <= 9) || walkableSurfaces[0];
      if (startSpot) {
        const npcTmpl = meta.npcTemplates?.find((n) => n.id === defaultNpcId) || meta.npcTemplates?.[0] || { id: defaultNpcId, name: 'Trưởng Lão', avatar: 349 };
        npcs.push({
          id: Date.now() + 500,
          npcTempId: npcTmpl.id,
          npcName: npcTmpl.name,
          avatar: npcTmpl.avatar || 349,
          npcX: startSpot.x + 12,
          npcY: startSpot.y,
        });
      }
    }

    // 7. ÁP DỤNG THUẬT TOÁN AUTO-TILING ĐỂ GỌT VIỀN TOÀN DIỆN CHUẨN ĐẸP 100%
    const polishedTiles = autoTileMatrix(tileMatrix, tmw, tmh, tileId);

    return {
      tileId,
      tileMatrix: polishedTiles,
      bgItems,
      mobs,
      waypoints,
      npcs,
      effects: { effs: [], beffs: [] },
      seed,
    };
  }, [autoTileMatrix]);

  // Lưu DeepSeek API Key vào localStorage
  const handleSaveDeepSeekApiKey = (key) => {
    setDeepseekApiKey(key);
    localStorage.setItem('nro_deepseek_api_key', key.trim());
    setSuccessMsg('🔑 Đã lưu DeepSeek API Key an toàn vào trình duyệt!');
  };

  // Chuyển đổi Blueprint JSON từ DeepSeek thành Ma Trận Map Chuẩn NRO
  const applyDeepSeekBlueprintToMap = useCallback((blueprint, targetMap) => {
    const tmw = targetMap.tmw || 80;
    const tmh = targetMap.tmh || 40;
    const pxw = tmw * 24;
    const pxh = tmh * 24;
    const tileMatrix = new Array(tmw * tmh).fill(0);
    const walkableSurfaces = [];
    const isForest161 = (targetMap.preset === 'forest_multi_tier' || blueprint.tileId === 31 || targetMap.tileId === 31);
    const tileId = blueprint.tileId || (isForest161 ? 31 : (targetMap.tileId || 1));

    // Helper: Vẽ một nhánh cành cây chuẩn Map 161 với đầy đủ 4 tầng (Lá, Vỏ trên, Mặt sàn, Đáy cành)
    const render161Branch = (row, startCol, endCol) => {
      const len = endCol - startCol + 1;
      if (len < 2) return;

      // 1. Tán lá xum xuê (row - 2)
      if (row - 2 >= 0) {
        const leafTiles = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 27];
        for (let c = startCol; c <= endCol; c++) {
          const idx = (row - 2) * tmw + c;
          if (tileMatrix[idx] === 0) {
            tileMatrix[idx] = leafTiles[(c * 7 + row * 13) % leafTiles.length];
          }
        }
      }

      // 2. Mép vỏ cây trên (row - 1)
      if (row - 1 >= 0) {
        const barkTiles = [8, 8, 10, 8, 11, 12, 13, 12, 11];
        for (let c = startCol; c <= endCol; c++) {
          const idx = (row - 1) * tmw + c;
          if (tileMatrix[idx] === 0) {
            if (c === startCol) tileMatrix[idx] = 7;
            else if (c === endCol) tileMatrix[idx] = 9;
            else tileMatrix[idx] = barkTiles[(c + row) % barkTiles.length];
          }
        }
      }

      // 3. Mặt gỗ cành cây để đi lại (row)
      for (let c = startCol; c <= endCol; c++) {
        const idx = row * tmw + c;
        if (c === startCol) tileMatrix[idx] = 1;
        else if (c === endCol) tileMatrix[idx] = 3;
        else {
          if (c % 7 === 3) tileMatrix[idx] = 4;
          else if (c % 7 === 5) tileMatrix[idx] = 5;
          else if (c % 11 === 6) tileMatrix[idx] = 6;
          else tileMatrix[idx] = 2;
        }
        walkableSurfaces.push({ col: c, row, x: c * 24, y: row * 24, type: 'canopy' });
      }

      // 4. Vỏ đáy dưới cành (row + 1)
      if (row + 1 < tmh) {
        for (let c = startCol; c <= endCol; c++) {
          const idx = (row + 1) * tmw + c;
          if (tileMatrix[idx] === 0) {
            if (c === startCol) tileMatrix[idx] = 31;
            else if (c === endCol) tileMatrix[idx] = 33;
            else tileMatrix[idx] = 32;
          }
        }
      }
    };

    // 1. Render Platforms từ Blueprint của DeepSeek
    if (Array.isArray(blueprint.platforms) && blueprint.platforms.length > 0) {
      blueprint.platforms.forEach((p) => {
        const row = Math.max(0, Math.min(tmh - 1, Number(p.row) || 0));
        const startCol = Math.max(0, Math.min(tmw - 1, Number(p.startCol) || 0));
        const endCol = Math.max(startCol, Math.min(tmw - 1, Number(p.endCol) || (tmw - 1)));
        const thickness = Math.max(1, Math.min(10, Number(p.thickness) || 2));

        if (isForest161 && p.type !== 'ground') {
          render161Branch(row, startCol, endCol);
        } else {
          for (let r = row; r < row + thickness && r < tmh; r++) {
            for (let c = startCol; c <= endCol; c++) {
              tileMatrix[r * tmw + c] = 1;
            }
          }
          for (let c = startCol; c <= endCol; c++) {
            walkableSurfaces.push({ col: c, row, x: c * 24, y: row * 24, type: p.type || 'ground' });
          }
        }
      });
    }

    // 2. Render Vertical Pillars (Thân cây đại thụ / Trụ thạch nhũ)
    if (Array.isArray(blueprint.pillars) && blueprint.pillars.length > 0) {
      blueprint.pillars.forEach((p) => {
        const col = Math.max(0, Math.min(tmw - 1, Number(p.col) || 0));
        const width = Math.max(1, Math.min(8, Number(p.width) || 4));
        const topRow = Math.max(0, Math.min(tmh - 1, Number(p.topRow) || 0));
        const botRow = Math.max(topRow, Math.min(tmh - 1, Number(p.botRow) || (tmh - 1)));

        for (let r = topRow; r <= botRow; r++) {
          for (let c = col; c < col + width && c < tmw; c++) {
            if (isForest161) {
              tileMatrix[r * tmw + c] = 30; // Tile 30 chuẩn vỏ thân cây Map 161
            } else {
              tileMatrix[r * tmw + c] = 1;
            }
          }
        }
      });
    }

    // 3. Fallback Ground & Branches nếu DeepSeek trả về chưa đủ
    if (tileMatrix.filter((t) => t > 0).length < 20) {
      const gRow = Math.max(5, tmh - 5);
      for (let c = 0; c < tmw; c++) {
        for (let r = gRow; r < tmh; r++) {
          tileMatrix[r * tmw + c] = isForest161 ? 2 : 1;
        }
        walkableSurfaces.push({ col: c, row: gRow, x: c * 24, y: gRow * 24, type: 'ground' });
      }
      if (isForest161) {
        render161Branch(Math.floor(tmh * 0.35), 5, Math.floor(tmw * 0.45));
        render161Branch(Math.floor(tmh * 0.6), Math.floor(tmw * 0.4), tmw - 8);
      }
    }

    // 4. Phân bổ Quái Vật (Mobs) theo các tầng cành cây
    const mobs = [];
    if (Array.isArray(blueprint.mobs) && blueprint.mobs.length > 0) {
      blueprint.mobs.forEach((m, idx) => {
        const col = Math.max(1, Math.min(tmw - 2, Number(m.col) || 10));
        const row = Math.max(1, Math.min(tmh - 1, Number(m.row) || 20));
        const mobTempId = Number(m.mobTempId) || (isForest161 ? (idx % 2 === 0 ? 80 : 81) : 1);
        const lvl = Math.max(1, Number(m.level) || 10);
        const hp = lvl * 250;
        const dame = Math.max(5, Math.round((hp * 10) / 100));
        const template = metaOptions?.mobTemplates?.find((t) => t.id === mobTempId) || { name: 'Quái #' + mobTempId };

        mobs.push({
          id: Date.now() + 100 + idx,
          mobTempId,
          mobName: template.name,
          mobLevel: lvl,
          mobHp: hp,
          percentDame: 10,
          mobDame: dame,
          mobX: col * 24 + 12,
          mobY: row * 24,
        });
      });
    }

    // 5. Cổng dịch chuyển Waypoints (Tiếp đất hoàn hảo)
    const waypoints = [];
    const leftSurface = walkableSurfaces.find((s) => s.col <= 5) || { col: 1, row: Math.max(0, tmh - 5) };
    const rightSurface = walkableSurfaces.slice().reverse().find((s) => s.col >= tmw - 6) || { col: tmw - 2, row: Math.max(0, tmh - 5) };

    const leftTarget = metaOptions?.maps?.find((m) => m.id === (targetMap.id > 0 ? targetMap.id - 1 : 1)) || metaOptions?.maps?.[0] || { id: 0, name: 'Làng Aru' };
    waypoints.push({
      id: Date.now() + 1,
      name: 'Về: ' + leftTarget.name,
      minX: 0,
      minY: Math.max(0, (leftSurface.row - 3) * 24),
      maxX: 48,
      maxY: Math.min(pxh, (leftSurface.row + 1) * 24),
      isEnter: false,
      isOffline: false,
      goMap: leftTarget.id,
      goMapName: leftTarget.name,
      goX: 100,
      goY: 384,
    });

    const rightTarget = metaOptions?.maps?.find((m) => m.id === (targetMap.id + 1)) || metaOptions?.maps?.[1] || { id: 1, name: 'Đồi hoa cúc' };
    waypoints.push({
      id: Date.now() + 2,
      name: 'Sang: ' + rightTarget.name,
      minX: Math.max(0, pxw - 48),
      minY: Math.max(0, (rightSurface.row - 3) * 24),
      maxX: pxw,
      maxY: Math.min(pxh, (rightSurface.row + 1) * 24),
      isEnter: false,
      isOffline: false,
      goMap: rightTarget.id,
      goMapName: rightTarget.name,
      goX: 100,
      goY: 384,
    });

    // 6. Vật thể trang trí Decor (BgItems)
    const bgItems = [];
    if (Array.isArray(blueprint.bgItems) && blueprint.bgItems.length > 0) {
      blueprint.bgItems.forEach((b, idx) => {
        const col = Math.max(0, Math.min(tmw - 1, Number(b.col) || 5));
        const row = Math.max(0, Math.min(tmh - 1, Number(b.row) || 10));
        const bgTempId = Number(b.bgTempId) || (isForest161 ? (idx % 2 === 0 ? 52 : 90) : 0);
        const tmpl = metaOptions?.itemBgTemplates?.find((t) => Number(t.id) === bgTempId);
        const imageId = tmpl ? tmpl.imageId : bgTempId;
        const layer = tmpl ? tmpl.layer : ((idx % 3 === 0) ? 2 : 1);
        const dx = tmpl ? tmpl.dx : 0;
        const dy = tmpl ? tmpl.dy : 0;
        bgItems.push({
          id: Date.now() + 300 + idx,
          bgTempId,
          imageId,
          layer,
          dx,
          dy,
          x: col,
          y: row,
          px: col * 24 + dx,
          py: row * 24 + dy,
          imageUrl: tmpl ? tmpl.url : `/api/v1/assets/item-bg/${imageId}.png`,
        });
      });
    } else if (isForest161) {
      // Tự động gắn Nấm khổng lồ (52) và Cổ thụ (90) kiểu Map 161
      const sampleSurfaces = walkableSurfaces.filter((s) => s.type === 'canopy');
      sampleSurfaces.slice(0, 10).forEach((s, idx) => {
        const bgTempId = idx % 2 === 0 ? 52 : 90;
        const tmpl = metaOptions?.itemBgTemplates?.find((t) => Number(t.id) === bgTempId);
        const imageId = tmpl ? tmpl.imageId : bgTempId;
        const layer = tmpl ? tmpl.layer : ((idx % 3 === 0) ? 2 : 1);
        const dx = tmpl ? tmpl.dx : 0;
        const dy = tmpl ? tmpl.dy : 0;
        bgItems.push({
          id: Date.now() + 300 + idx,
          bgTempId,
          imageId,
          layer,
          dx,
          dy,
          x: s.col,
          y: Math.max(0, s.row - 2),
          px: s.col * 24 + dx,
          py: Math.max(0, (s.row - 2) * 24) + dy,
          imageUrl: tmpl ? tmpl.url : `/api/v1/assets/item-bg/${imageId}.png`,
        });
      });
    }

    // 7. Auto-Tiling hoàn thiện nếu không phải Forest161 (vì Forest161 đã được gọt viền đa tầng trực tiếp chuẩn 100%)
    const refinedTiles = isForest161 ? tileMatrix : autoTileMatrix(tileMatrix, tmw, tmh, tileId);

    return {
      tileId,
      tileMatrix: refinedTiles,
      mobs,
      waypoints,
      bgItems,
      npcs: [],
      effects: { effs: [], beffs: [] },
      mapName: blueprint.mapName || targetMap.name,
      concept: blueprint.concept || '',
    };
  }, [autoTileMatrix, metaOptions]);

  // Handler: Gọi DeepSeek AI để thiết kế Map
  const handleGenerateWithDeepSeek = async (isNewMapModal = false) => {
    const key = deepseekApiKey.trim();
    if (!key) {
      setErrorMsg('Vui lòng nhập DeepSeek API Key để kết nối với AI thật!');
      setShowApiKeyInput(true);
      return;
    }

    const target = isNewMapModal ? newMapForm : currentMap;
    if (!target) return;

    setAiGenerating(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const prompt = isNewMapModal ? (newMapForm.deepseekPrompt || '') : deepseekPrompt;
      const res = await apiPost('/api/v1/maps/ai-deepseek', {
        prompt,
        apiKey: key,
        model: deepseekModel,
        tmw: target.tmw || 80,
        tmh: target.tmh || 40,
        preset: target.preset || 'forest_multi_tier',
        mobLevel: target.mobLevel || 10,
        tileId: target.tileId || (target.preset === 'forest_multi_tier' ? 31 : 1),
      });

      if (!res.ok || !res.data) {
        throw new Error(res.error || 'DeepSeek không trả về dữ liệu thiết kế map.');
      }

      const plan = applyDeepSeekBlueprintToMap(res.data, target);

      if (isNewMapModal) {
        setNewMapForm((prev) => ({
          ...prev,
          name: plan.mapName || prev.name,
          tileId: plan.tileId,
          tileMatrix: plan.tileMatrix,
          mobs: plan.mobs,
          waypoints: plan.waypoints,
          bgItems: plan.bgItems,
        }));
        setSuccessMsg('✨ DeepSeek AI đã hoàn tất nghiên cứu & thiết kế: "' + plan.mapName + '" (' + (plan.concept || 'Kiến trúc đa tầng kiểu Map 161') + ')');
      } else {
        recordHistory(currentMap);
        setAiPreviewStats({
          tileCount: plan.tileMatrix.filter((t) => t > 0).length,
          mobCount: plan.mobs.length,
          bgItemCount: plan.bgItems.length,
          waypointCount: plan.waypoints.length,
          npcCount: 0,
          plan,
          concept: plan.concept,
        });
        setSuccessMsg('✨ DeepSeek AI đã thiết kế xong! Hãy xem trước và bấm "Áp Dụng Bản Đồ Này".');
      }
    } catch (err) {
      setErrorMsg('Lỗi khi gọi DeepSeek AI: ' + err.message);
    } finally {
      setAiGenerating(false);
    }
  };

  // AI Generator Preview Handler
  const handleAiGeneratePreview = useCallback(() => {
    if (!currentMap) return;
    const plan = generateAiMapPlan(currentMap, aiMapForm, metaOptions);
    const activeTiles = plan.tileMatrix.filter((t) => t > 0).length;
    setAiPreviewStats({
      tileCount: activeTiles,
      mobCount: plan.mobs.length,
      bgItemCount: plan.bgItems.length,
      waypointCount: plan.waypoints.length,
      npcCount: plan.npcs.length,
      plan,
    });
  }, [currentMap, aiMapForm, metaOptions, generateAiMapPlan]);

  // AI Generator Apply Handler
  const handleAiApplyToMap = useCallback(() => {
    if (!currentMap) return;
    recordHistory(currentMap);
    const plan = aiPreviewStats?.plan || generateAiMapPlan(currentMap, aiMapForm, metaOptions);

    let updatedTileId = currentMap.tileId || 1;
    if (aiMapForm.preset === 'namec_floating') updatedTileId = 2;
    else if (aiMapForm.preset === 'xayda_badlands') updatedTileId = 3;
    else if (aiMapForm.preset === 'hell_volcano') updatedTileId = 4;
    else if (aiMapForm.preset === 'martial_arena') updatedTileId = 5;

    const updated = {
      ...currentMap,
      tileId: updatedTileId,
      tileMatrix: plan.tileMatrix,
      bgItems: plan.bgItems,
      mobs: plan.mobs,
      waypoints: plan.waypoints,
      npcs: plan.npcs,
    };
    setCurrentMap(updated);
    setShowAiMapModal(false);
    setSuccessMsg('✨ Đã sinh bản đồ tự động bằng AI thành công! Hãy kiểm tra và lưu lại.');
  }, [currentMap, aiPreviewStats, aiMapForm, metaOptions, generateAiMapPlan, recordHistory]);

  // ==========================================
  // AI VISION & COMPUTER VISION MAP SCANNER ENGINE
  // ==========================================

  // Lưu Vision API Key vào localStorage
  const handleSaveVisionApiKey = useCallback((key) => {
    setVisionApiKey(key);
    localStorage.setItem('nro_vision_api_key', key.trim());
    setSuccessMsg('🔑 Đã lưu Vision API Key an toàn vào trình duyệt!');
  }, []);

  // Global Clipboard Paste Listener (Ctrl + V) để dán ảnh map nhanh từ bất cứ đâu
  useEffect(() => {
    const handleGlobalPaste = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        return;
      }
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const base64Data = ev.target?.result;
              if (base64Data) {
                setVisionImage(base64Data);
                setVisionFileName('anh_chup_clipboard_' + Date.now() + '.png');
                setShowVisionModal(true);
                setSuccessMsg('📋 Đã nhận ảnh chụp bản đồ từ Clipboard! Đang tự động phân tích bố cục...');
                // Auto trigger processing
                setTimeout(() => {
                  processImageWithCV(base64Data);
                }, 100);
              }
            };
            reader.readAsDataURL(blob);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  // Thuật toán Computer Vision phân tích ảnh chụp bản đồ NRO & bóc tách bố cục siêu tốc
  const processImageWithCV = useCallback((
    imgSrc,
    customW = visionGridW,
    customH = visionGridH,
    threshold = visionThreshold,
    tileId = visionTileId,
    autoTiling = visionAutoTiling,
    detectMobs = visionAutoDetectMobs,
    detectDecor = visionAutoDetectDecor
  ) => {
    if (!imgSrc) return;
    setVisionProcessing(true);
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imgSrc;
    img.onload = () => {
      try {
        const offCanvas = document.createElement('canvas');
        const tmw = Math.max(20, Math.min(200, Number(customW) || 60));
        const tmh = Math.max(10, Math.min(100, Number(customH) || 20));
        offCanvas.width = img.naturalWidth || 1200;
        offCanvas.height = img.naturalHeight || 600;
        const ctx = offCanvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Không thể khởi tạo 2D Context');
        ctx.drawImage(img, 0, 0, offCanvas.width, offCanvas.height);

        const imgW = offCanvas.width;
        const imgH = offCanvas.height;
        const cellW = imgW / tmw;
        const cellH = imgH / tmh;

        const solidMask = new Array(tmw * tmh).fill(0);

        // 1. Quét màu & texture từng ô lưới (Precision Texture & Color Ratio Segmentation)
        for (let r = 0; r < tmh; r++) {
          for (let c = 0; c < tmw; c++) {
            const startX = Math.floor(c * cellW);
            const startY = Math.floor(r * cellH);
            const sampleW = Math.max(1, Math.floor(cellW));
            const sampleH = Math.max(1, Math.floor(cellH));

            const imgData = ctx.getImageData(startX, startY, sampleW, sampleH).data;
            let sumR = 0, sumG = 0, sumB = 0, count = 0;
            let pixelLums = [];

            for (let p = 0; p < imgData.length; p += 4) {
              const pr = imgData[p];
              const pg = imgData[p + 1];
              const pb = imgData[p + 2];
              const pa = imgData[p + 3];
              if (pa > 30) {
                sumR += pr;
                sumG += pg;
                sumB += pb;
                count++;
                // Perceived luminance for texture standard deviation
                const lum = 0.299 * pr + 0.587 * pg + 0.114 * pb;
                pixelLums.push(lum);
              }
            }

            const avgR = count > 0 ? sumR / count : 0;
            const avgG = count > 0 ? sumG / count : 0;
            const avgB = count > 0 ? sumB / count : 0;

            // Tính độ lệch chuẩn vân bề mặt (Texture Standard Deviation)
            let stdDev = 0;
            if (count > 1) {
              const meanLum = pixelLums.reduce((a, b) => a + b, 0) / count;
              const variance = pixelLums.reduce((a, b) => a + Math.pow(b - meanLum, 2), 0) / count;
              stdDev = Math.sqrt(variance);
            }

            const safeB = Math.max(1, avgB);
            const safeG = Math.max(1, avgG);
            const rbRatio = avgR / safeB;
            const rgRatio = avgR / safeG;

            // ĐẶC TRƯNG 1: Lớp Cỏ / Rêu Xanh Ngọc trên viền sàn (Teal/Cyan/Green Grass Top)
            // Màu cỏ trong game: R: 40-110, G: 140-220, B: 130-200 (G và B vượt trội hoàn toàn so với R)
            const isGrassTop = (avgG > 100 && avgB > 90 && (avgG > avgR + 15 || avgB > avgR + 10)) ||
                               (avgG > 120 && avgG > avgR + 25);

            // ĐẶC TRƯNG 2: Khối Đá / Đất Nâu NRO (Rock / Dirt Textured Core)
            // Khối đá có vân đốm đậm/nhạt rõ rệt (stdDev cao >= 10), R trong khoảng 100-195, G 60-145, B 50-135.
            // QUAN TRỌNG: Trong khối đá, tỷ lệ R/B chỉ từ 1.2 đến 2.6 (luôn có sắc tố xanh lam của đá).
            const isRockTexture = (stdDev >= 9.5) &&
                                  (avgR >= 85 && avgR <= 205) &&
                                  (avgG >= 50 && avgG <= 155) &&
                                  (avgB >= 45 && avgB <= 145) &&
                                  (rbRatio <= 2.8);

            // ĐẶC TRƯNG 3: Bầu Trời Hoàng Hôn / Đỏ / Cam (Sunset Sky Gradient)
            // Bầu trời hoàng hôn: R cực cao (> 160-255), G trung bình (30-140), nhưng B RẤT THẤP (< 55).
            // Tỷ lệ R/B > 3.0 (hoặc stdDev rất mịn < 8).
            const isSunsetSky = (rbRatio > 3.0 && avgR > 150 && stdDev < 14) ||
                                (avgR > 200 && avgG > 75 && avgB < 65 && stdDev < 14) ||
                                (avgR > 130 && avgG < 65 && avgB < 65 && stdDev < 10);

            // ĐẶC TRƯNG 4: Bầu Trời Xanh Dương / Tím
            const isBlueSky = (avgB > avgG + 15 && avgB > 120 && stdDev < 8);

            let isSolid = false;

            if (isGrassTop) {
              isSolid = true;
            } else if (isRockTexture && !isSunsetSky && !isBlueSky) {
              isSolid = true;
            } else if (!isSunsetSky && !isBlueSky && stdDev > 16 && avgR > 70 && avgR < 210) {
              isSolid = true;
            }

            // Điều chỉnh theo ngưỡng nhạy (Threshold)
            if (isSolid && threshold <= 0.65) {
              solidMask[r * tmw + c] = 1;
            } else if (!isSolid && threshold < 0.35 && stdDev > 12 && !isSunsetSky) {
              solidMask[r * tmw + c] = 1;
            } else if (isSolid && threshold > 0.65) {
              if (isGrassTop || (isRockTexture && stdDev > 14)) {
                solidMask[r * tmw + c] = 1;
              }
            }
          }
        }

        // 2. Bộ Lọc Làm Sạch & Lấp Lỗ Hổng Địa Hình (Morphological Cleaning)
        const cleanedMask = [...solidMask];
        for (let r = 1; r < tmh - 1; r++) {
          for (let c = 1; c < tmw - 1; c++) {
            const idx = r * tmw + c;
            const neighbors = cleanedMask[(r - 1) * tmw + c] +
                              cleanedMask[(r + 1) * tmw + c] +
                              cleanedMask[r * tmw + (c - 1)] +
                              cleanedMask[r * tmw + (c + 1)];

            // Lấp lỗ hổng 1-ô bên trong khối đất đặc
            if (cleanedMask[idx] === 0 && neighbors >= 3) {
              solidMask[idx] = 1;
            }
            // Xóa bụi hạt nhiễu 1-ô lơ lửng đơn độc
            if (cleanedMask[idx] === 1 && neighbors === 0) {
              solidMask[idx] = 0;
            }
          }
        }

        // 3. Phân Nhóm Các Tầng Địa Hình (Platform Segmentation)
        const walkableSurfaces = [];
        const platforms = [];
        let currPlat = null;

        for (let r = 0; r < tmh; r++) {
          for (let c = 0; c < tmw; c++) {
            const isSolid = solidMask[r * tmw + c] === 1;
            const isAboveEmpty = r === 0 || solidMask[(r - 1) * tmw + c] === 0;

            if (isSolid && isAboveEmpty) {
              walkableSurfaces.push({ col: c, row: r, x: c * 24, y: r * 24 });
              if (!currPlat || currPlat.row !== r || currPlat.endCol !== c - 1) {
                if (currPlat) platforms.push(currPlat);
                currPlat = {
                  row: r,
                  startCol: c,
                  endCol: c,
                  length: 1,
                  type: r >= tmh - 5 ? 'ground' : 'floating_island',
                };
              } else {
                currPlat.endCol = c;
                currPlat.length++;
              }
            }
          }
          if (currPlat) {
            platforms.push(currPlat);
            currPlat = null;
          }
        }

        // 4. Nhận Diện & Bố Trí Quái Vật (Mob Spawner Detection)
        const detectedMobs = [];
        if (detectMobs && platforms.length > 0) {
          const eligiblePlatforms = platforms.filter((p) => p.length >= 2 && p.startCol >= 1 && p.endCol < tmw - 1);
          let mIdx = 0;
          eligiblePlatforms.forEach((p) => {
            const midCol = Math.floor((p.startCol + p.endCol) / 2);
            let mobTempId = 1 + (mIdx % 6);
            if (tileId === 31) mobTempId = (mIdx % 2 === 0 ? 80 : 81);
            else if (tileId === 2) mobTempId = 7 + (mIdx % 5);
            else if (tileId === 3) mobTempId = 13 + (mIdx % 5);

            const tmpl = metaOptions?.mobTemplates?.find((t) => t.id === mobTempId) || { name: `Quái #${mobTempId}` };
            detectedMobs.push({
              id: Date.now() + 100 + mIdx,
              mobTempId,
              mobName: tmpl.name,
              mobLevel: 10,
              mobHp: 2500,
              percentDame: 10,
              mobDame: 250,
              mobX: midCol * 24 + 12,
              mobY: p.row * 24,
            });
            mIdx++;
          });
        }

        // 5. Nhận Diện & Bố Trí Cây Cối / Vật Thể Decor (bgItems)
        const detectedBgItems = [];
        if (detectDecor && platforms.length > 0) {
          platforms.forEach((p, pIdx) => {
            if (p.length >= 3) {
              const decorCol = p.startCol + Math.min(1, Math.floor(p.length / 3));
              let bgTempId = (pIdx % 3 === 0 ? 11 : 0);
              if (tileId === 31) bgTempId = (pIdx % 2 === 0 ? 52 : 90);
              else if (tileId === 2) bgTempId = 30 + (pIdx % 5);
              else if (tileId === 3) bgTempId = 60 + (pIdx % 5);

              const tmpl = metaOptions?.itemBgTemplates?.find((t) => Number(t.id) === Number(bgTempId));
              const imageId = tmpl ? tmpl.imageId : bgTempId;
              const dx = tmpl ? tmpl.dx : 0;
              const dy = tmpl ? tmpl.dy : 0;

              detectedBgItems.push({
                id: Date.now() + 300 + pIdx,
                bgTempId,
                imageId,
                layer: 1,
                dx,
                dy,
                x: decorCol,
                y: Math.max(0, p.row - 2),
                px: decorCol * 24 + dx,
                py: Math.max(0, (p.row - 2) * 24) + dy,
                imageUrl: tmpl ? tmpl.url : `/api/v1/assets/item-bg/${imageId}.png`,
              });
            }
          });
        }

        // 6. Tự Động Định Vị Cổng Kết Nối Waypoints (Trái - Phải)
        const detectedWaypoints = [];
        const leftSurface = walkableSurfaces.find((s) => s.col <= 5) || { col: 1, row: Math.max(0, tmh - 4) };
        const rightSurface = walkableSurfaces.slice().reverse().find((s) => s.col >= tmw - 6) || { col: tmw - 2, row: Math.max(0, tmh - 4) };

        const leftTarget = metaOptions?.maps?.find((m) => m.id === (currentMap?.id > 0 ? currentMap.id - 1 : 1)) || metaOptions?.maps?.[0] || { id: 0, name: 'Làng Aru' };
        detectedWaypoints.push({
          id: Date.now() + 1,
          name: `Về: ${leftTarget.name}`,
          minX: 0,
          minY: Math.max(0, (leftSurface.row - 3) * 24),
          maxX: 48,
          maxY: Math.min(tmh * 24, (leftSurface.row + 1) * 24),
          isEnter: false,
          isOffline: false,
          goMap: leftTarget.id,
          goMapName: leftTarget.name,
          goX: 100,
          goY: 384,
        });

        const rightTarget = metaOptions?.maps?.find((m) => m.id === ((currentMap?.id || 0) + 1)) || metaOptions?.maps?.[1] || { id: 1, name: 'Đồi hoa cúc' };
        detectedWaypoints.push({
          id: Date.now() + 2,
          name: `Sang: ${rightTarget.name}`,
          minX: Math.max(0, (tmw - 2) * 24),
          minY: Math.max(0, (rightSurface.row - 3) * 24),
          maxX: tmw * 24,
          maxY: Math.min(tmh * 24, (rightSurface.row + 1) * 24),
          isEnter: false,
          isOffline: false,
          goMap: rightTarget.id,
          goMapName: rightTarget.name,
          goX: 100,
          goY: 384,
        });

        // 7. Áp Dụng Thuật Toán Smart Auto-Tiling để gọt góc chuẩn Tileset NRO
        const polishedTiles = autoTiling ? autoTileMatrix(solidMask, tmw, tmh, tileId) : solidMask;

        const resultPlan = {
          tmw,
          tmh,
          tileId,
          tileMatrix: polishedTiles,
          solidMask,
          platforms,
          mobs: detectedMobs,
          bgItems: detectedBgItems,
          waypoints: detectedWaypoints,
          npcs: [],
          stats: {
            tileCount: polishedTiles.filter((t) => t > 0).length,
            platformCount: platforms.length,
            mobCount: detectedMobs.length,
            bgItemCount: detectedBgItems.length,
            waypointCount: detectedWaypoints.length,
          },
        };

        setVisionDetectedPlan(resultPlan);
        setSuccessMsg(`✨ Đã nhận diện thành công: ${resultPlan.stats.platformCount} tầng sàn/đảo bay, ${resultPlan.stats.tileCount} ô gạch, ${resultPlan.stats.mobCount} quái!`);
      } catch (err) {
        console.error('Vision processing error:', err);
        setErrorMsg('Lỗi xử lý ảnh: ' + err.message);
      } finally {
        setVisionProcessing(false);
      }
    };
    img.onerror = () => {
      setVisionProcessing(false);
      setErrorMsg('Không thể tải hoặc đọc tệp ảnh.');
    };
  }, [autoTileMatrix, metaOptions, currentMap, visionGridW, visionGridH, visionThreshold, visionTileId, visionAutoTiling, visionAutoDetectMobs, visionAutoDetectDecor]);

  // Xử lý gọi Cloud AI Vision (Gemini / OpenAI / OpenRouter)
  const processImageWithAI = useCallback(async () => {
    if (!visionImage) {
      setErrorMsg('Vui lòng chọn hoặc dán ảnh bản đồ trước.');
      return;
    }
    const key = visionApiKey.trim();
    if (!key) {
      setErrorMsg('Vui lòng nhập API Key để kết nối với Cloud AI Vision.');
      return;
    }

    setVisionProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await apiPost('/api/v1/maps/ai-vision-recognize', {
        imageBase64: visionImage,
        apiKey: key,
        provider: visionProvider,
        model: visionModel,
        tmw: visionGridW,
        tmh: visionGridH,
        tileId: visionTileId,
        mobLevel: 10,
      });

      if (!res.ok || !res.data) {
        throw new Error(res.error || 'AI Vision không trả về dữ liệu bố cục map hợp lệ.');
      }

      const plan = applyDeepSeekBlueprintToMap(res.data, {
        tmw: visionGridW,
        tmh: visionGridH,
        tileId: visionTileId,
        name: res.data.mapName || 'Bản Đồ Quét Từ Ảnh',
      });

      const resultPlan = {
        tmw: visionGridW,
        tmh: visionGridH,
        tileId: plan.tileId,
        tileMatrix: plan.tileMatrix,
        mobs: plan.mobs,
        bgItems: plan.bgItems,
        waypoints: plan.waypoints,
        npcs: plan.npcs,
        mapName: plan.mapName,
        concept: plan.concept,
        stats: {
          tileCount: plan.tileMatrix.filter((t) => t > 0).length,
          platformCount: res.data.platforms?.length || 0,
          mobCount: plan.mobs.length,
          bgItemCount: plan.bgItems.length,
          waypointCount: plan.waypoints.length,
        },
      };

      setVisionDetectedPlan(resultPlan);
      setSuccessMsg(`✨ AI Vision đã hoàn tất phân tích: "${plan.mapName}" (${resultPlan.stats.tileCount} ô gạch, ${resultPlan.stats.mobCount} quái)!`);
    } catch (err) {
      setErrorMsg('Lỗi khi gọi AI Vision: ' + err.message);
    } finally {
      setVisionProcessing(false);
    }
  }, [visionImage, visionApiKey, visionProvider, visionModel, visionGridW, visionGridH, visionTileId, applyDeepSeekBlueprintToMap]);

  // Xử lý khi người dùng tải tệp ảnh lên
  const handleVisionImageUpload = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result;
      if (base64) {
        setVisionImage(base64);
        setVisionFileName(file.name);
        // Tự động suy đoán kích thước lưới dựa trên tỷ lệ ảnh nếu ảnh lớn
        const testImg = new Image();
        testImg.src = base64;
        testImg.onload = () => {
          const ratio = testImg.naturalWidth / testImg.naturalHeight;
          if (ratio > 2.5) {
            setVisionGridW(80);
            setVisionGridH(24);
          } else if (ratio > 1.8) {
            setVisionGridW(60);
            setVisionGridH(20);
          }
          processImageWithCV(base64, ratio > 2.5 ? 80 : 60, ratio > 2.5 ? 24 : 20);
        };
      }
    };
    reader.readAsDataURL(file);
  }, [processImageWithCV]);

  // Vẽ Canvas Xem Trước Bản Đồ Nhận Diện (Live Dual Preview Canvas)
  useEffect(() => {
    if (!visionPreviewCanvasRef.current || !visionDetectedPlan) return;
    const canvas = visionPreviewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tmw = visionDetectedPlan.tmw || 60;
    const tmh = visionDetectedPlan.tmh || 20;
    const pxw = tmw * 24;
    const pxh = tmh * 24;

    canvas.width = pxw;
    canvas.height = pxh;

    // 1. Phông nền Bầu Trời (Sky Gradient)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, pxh);
    if (visionDetectedPlan.tileId === 31) { // Sunset Forest (Đỏ Hoàng Hôn Map 161)
      skyGrad.addColorStop(0, '#781212');
      skyGrad.addColorStop(0.3, '#c22d23');
      skyGrad.addColorStop(0.7, '#e86a17');
      skyGrad.addColorStop(1, '#faa634');
    } else if (visionDetectedPlan.tileId === 2) { // Namec Teal
      skyGrad.addColorStop(0, '#0f3a40');
      skyGrad.addColorStop(1, '#0e7490');
    } else if (visionDetectedPlan.tileId === 3) { // Xayda Dark
      skyGrad.addColorStop(0, '#381c07');
      skyGrad.addColorStop(1, '#78350f');
    } else { // Earth Blue
      skyGrad.addColorStop(0, '#1e3a8a');
      skyGrad.addColorStop(0.6, '#38bdf8');
      skyGrad.addColorStop(1, '#bae6fd');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, pxw, pxh);

    // 2. Vẽ Địa Hình Gạch (Tiles)
    const matrix = visionDetectedPlan.tileMatrix || [];
    for (let r = 0; r < tmh; r++) {
      for (let c = 0; c < tmw; c++) {
        const val = matrix[r * tmw + c] || 0;
        if (val > 0) {
          const x = c * 24;
          const y = r * 24;
          if (tilesetImg) {
            const sx = 0;
            const sy = (val - 1) * 24;
            ctx.drawImage(tilesetImg, sx, sy, 24, 24, x, y, 24, 24);
          } else {
            // Fallback render gạch màu sinh động
            const isTop = (r === 0 || matrix[(r - 1) * tmw + c] === 0);
            if (isTop) {
              ctx.fillStyle = visionDetectedPlan.tileId === 31 ? '#38bdf8' : '#22c55e';
              ctx.fillRect(x, y, 24, 6);
              ctx.fillStyle = '#92400e';
              ctx.fillRect(x, y + 6, 24, 18);
            } else {
              ctx.fillStyle = '#78350f';
              ctx.fillRect(x, y, 24, 24);
            }
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.strokeRect(x, y, 24, 24);
          }
        }
      }
    }

    // 3. Vẽ Cây cối / Decor
    if (Array.isArray(visionDetectedPlan.bgItems)) {
      visionDetectedPlan.bgItems.forEach((b) => {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
        ctx.beginPath();
        ctx.arc(b.px + 12, b.py + 12, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#065f46';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('🌳', b.px + 4, b.py + 16);
      });
    }

    // 4. Vẽ Quái vật (Mobs)
    if (Array.isArray(visionDetectedPlan.mobs)) {
      visionDetectedPlan.mobs.forEach((m) => {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.beginPath();
        ctx.arc(m.mobX, m.mobY - 8, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('👾', m.mobX - 6, m.mobY - 2);
      });
    }

    // 5. Vẽ Cổng Dịch Chuyển (Waypoints)
    if (Array.isArray(visionDetectedPlan.waypoints)) {
      visionDetectedPlan.waypoints.forEach((w) => {
        ctx.fillStyle = 'rgba(6, 182, 212, 0.35)';
        ctx.fillRect(w.minX, w.minY, w.maxX - w.minX, w.maxY - w.minY);
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(w.minX, w.minY, w.maxX - w.minX, w.maxY - w.minY);
        ctx.setLineDash([]);
        ctx.fillStyle = '#06b6d4';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('🌀 CỔNG', w.minX + 4, w.minY + 20);
      });
    }

    // 6. Vẽ Lưới toạ độ nhẹ (Grid overlay)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= tmw; c++) {
      ctx.beginPath();
      ctx.moveTo(c * 24, 0);
      ctx.lineTo(c * 24, pxh);
      ctx.stroke();
    }
    for (let r = 0; r <= tmh; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * 24);
      ctx.lineTo(pxw, r * 24);
      ctx.stroke();
    }
  }, [visionDetectedPlan, tilesetImg]);

  // Áp dụng bố cục vừa nhận diện vào Bản Đồ Đang Chỉnh Sửa
  const handleVisionApplyToCurrentMap = useCallback(() => {
    if (!currentMap || !visionDetectedPlan) return;
    recordHistory(currentMap);

    const updated = {
      ...currentMap,
      tmw: visionDetectedPlan.tmw || currentMap.tmw,
      tmh: visionDetectedPlan.tmh || currentMap.tmh,
      pxw: (visionDetectedPlan.tmw || currentMap.tmw) * 24,
      pxh: (visionDetectedPlan.tmh || currentMap.tmh) * 24,
      tileId: visionDetectedPlan.tileId || currentMap.tileId || 1,
      tileMatrix: visionDetectedPlan.tileMatrix || currentMap.tileMatrix,
      bgItems: visionDetectedPlan.bgItems || currentMap.bgItems || [],
      mobs: visionDetectedPlan.mobs || currentMap.mobs || [],
      waypoints: visionDetectedPlan.waypoints || currentMap.waypoints || [],
      npcs: visionDetectedPlan.npcs || currentMap.npcs || [],
    };

    setCurrentMap(updated);
    setShowVisionModal(false);
    setSuccessMsg(`🚀 Đã áp dụng bố cục ảnh vào Map [${currentMap.id}] ${currentMap.name} thành công!`);
  }, [currentMap, visionDetectedPlan, recordHistory]);

  // Tạo một bản đồ mới hoàn toàn từ bố cục ảnh nhận diện
  const handleVisionCreateNewMap = useCallback(() => {
    if (!visionDetectedPlan) return;
    const newId = (maps.reduce((max, m) => Math.max(max, m.id), 0) + 1).toString();
    setNewMapForm({
      id: newId,
      name: visionDetectedPlan.mapName || 'Map Nhận Diện Từ Ảnh ' + newId,
      planetId: visionDetectedPlan.planetId || 0,
      type: 0,
      creationMode: 'blank',
      cloneFromId: '',
      tmw: visionDetectedPlan.tmw || 60,
      tmh: visionDetectedPlan.tmh || 20,
      tileId: visionDetectedPlan.tileId || 1,
      preset: 'forest_multi_tier',
      deepseekPrompt: '',
      groundHeightPercent: 68,
      roughness: 'medium',
      floatingIslands: 2,
      mobDensity: 'medium',
      mobLevel: 10,
      decorDensity: 'medium',
      autoWaypoints: true,
      autoNpc: true,
    });
    setShowVisionModal(false);
    setShowNewMapModal(true);
    setSuccessMsg('✨ Đã chuẩn bị cấu hình Map mới từ ảnh nhận diện!');
  }, [visionDetectedPlan, maps]);

  // Xóa toàn bộ gạch trên bản đồ
  const handleClearAllTerrain = useCallback(() => {
    if (!currentMap) return;
    if (!window.confirm('Bạn có chắc muốn xóa sạch toàn bộ ô gạch địa hình trên bản đồ này?')) return;
    recordHistory(currentMap);
    const w = currentMap.tmw || 60;
    const h = currentMap.tmh || 20;
    const matrix = new Array(w * h).fill(0);
    setCurrentMap((prev) => ({ ...prev, tileMatrix: matrix }));
  }, [currentMap, recordHistory]);


  // Toggle Fullscreen (Browser Native Fullscreen + Theater Mode)
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        const pageEl = document.querySelector('.map-editor-page') || document.documentElement;
        if (pageEl.requestFullscreen) {
          await pageEl.requestFullscreen();
        } else if (pageEl.webkitRequestFullscreen) {
          await pageEl.webkitRequestFullscreen();
        }
        setTheaterMode(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
        setTheaterMode(false);
      }
    } catch (err) {
      setTheaterMode((prev) => !prev);
    }
  }, []);

  // Listen to browser fullscreen change event
  useEffect(() => {
    const handleFullscreenChange = () => {
      setTheaterMode(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Hotkeys: F, Esc, B, E, L, R, P, G, I, V, 1..5, Undo / Redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => { });
        }
        setTheaterMode(false);
      } else if (e.key === 'b' || e.key === 'B') {
        setActiveTool('paint-tile');
      } else if (e.key === 'e' || e.key === 'E') {
        setActiveTool('erase-tile');
      } else if (e.key === 'l' || e.key === 'L') {
        setActiveTool('line-tile');
      } else if (e.key === 'r' || e.key === 'R') {
        setActiveTool('rect-tile');
      } else if (e.key === 'p' || e.key === 'P') {
        setActiveTool('platform-tile');
      } else if (e.key === 'g' || e.key === 'G') {
        setShowGrid((prev) => !prev);
      } else if (e.key === 'i' || e.key === 'I') {
        setActiveTool('pipette-tile');
      } else if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
      } else if (['1', '2', '3', '4', '5'].includes(e.key)) {
        setBrushSize(Number(e.key));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen, handleUndo, handleRedo]);

  // Drop System Helpers & Memoized Selectors
  const uniqueMobsOnMap = useMemo(() => {
    if (!currentMap?.mobs) return [];
    const mobIds = Array.from(new Set(currentMap.mobs.map((m) => m.mobTempId)));
    return mobIds.map((tid) => {
      const info = (metaOptions.mobTemplates || []).find((m) => m.id === tid);
      return {
        id: tid,
        name: info ? info.name : `Quái #${tid}`,
      };
    });
  }, [currentMap?.mobs, metaOptions.mobTemplates]);

  // Background Scenic Layers calculation with Customizer overrides
  const bgLayersList = useMemo(() => {
    if (!currentMap) return [];
    const rawBgId = currentMap.bgId;
    const bgId = (rawBgId !== undefined && rawBgId !== null && Number(rawBgId) >= 0)
      ? Number(rawBgId)
      : 0;

    const pxh = currentMap.pxh || 480;
    const isFullScale = bgId >= 15 || bgCustomConfig.isFullScale;

    const layerConfigs = [
      { layer: 0, height: isFullScale ? pxh : Math.max(180, Math.round(pxh * 0.48)), bottom: isFullScale ? 0 : Math.round(pxh * 0.22) },
      { layer: 1, height: isFullScale ? pxh : Math.max(160, Math.round(pxh * 0.42)), bottom: isFullScale ? 0 : Math.round(pxh * 0.14) },
      { layer: 2, height: isFullScale ? pxh : Math.max(170, Math.round(pxh * 0.44)), bottom: isFullScale ? 0 : Math.round(pxh * 0.05) },
      { layer: 3, height: isFullScale ? pxh : Math.max(140, Math.round(pxh * 0.34)), bottom: 0 },
      { layer: 4, height: isFullScale ? pxh : Math.max(120, Math.round(pxh * 0.30)), bottom: 0 },
    ];

    const list = [];
    for (let l = 0; l <= 4; l++) {
      const fileName = `b${bgId}${l}.png`;
      const baseConf = layerConfigs[l] || { layer: l, height: isFullScale ? pxh : Math.round(pxh * 0.35), bottom: 0 };
      const custom = bgCustomConfig.layers?.[l] || { enabled: true, heightScale: 1.0, bottomOffset: 0, opacity: 1.0 };
      
      if (custom.enabled !== false) {
        list.push({
          layer: l,
          fileName,
          url: `/api/v1/assets/bg/${fileName}`,
          height: isFullScale ? pxh : Math.round(baseConf.height * (custom.heightScale || 1.0)),
          bottom: isFullScale ? 0 : Math.max(0, baseConf.bottom + (custom.bottomOffset || 0)),
          opacity: (bgOpacity ?? 0.9) * (custom.opacity ?? 1.0),
          isFullScale,
        });
      }
    }
    return list;
  }, [currentMap?.bgId, currentMap?.pxh, bgCustomConfig.layers, bgCustomConfig.isFullScale, bgOpacity]);

  const filteredDropItems = useMemo(() => {
    const items = currentMap?.dropConfig?.items || [];
    return items
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => {
        if (dropFilterMob === 'all') return true;
        return item.mobTempId === Number(dropFilterMob);
      });
  }, [currentMap?.dropConfig?.items, dropFilterMob]);

  const filteredItemTemplates = useMemo(() => {
    const list = metaOptions.itemTemplates || [];
    if (!itemSearchText) return list;
    const q = itemSearchText.toLowerCase().trim();
    return list.filter((it) => String(it.id).includes(q) || (it.name && it.name.toLowerCase().includes(q)));
  }, [metaOptions.itemTemplates, itemSearchText]);

  const updateDropConfigField = (field, value) => {
    if (!currentMap) return;
    const currentDrops = currentMap.dropConfig || {
      enabled: true,
      goldEnabled: false,
      goldChancePercent: 10,
      goldMin: 100,
      goldMax: 1000,
      activationEnabled: false,
      activationChancePercent: 0.1,
      items: [],
    };
    setCurrentMap({
      ...currentMap,
      dropConfig: { ...currentDrops, [field]: value },
    });
  };

  const handleAddDropItem = (mobTempId = -1) => {
    if (!currentMap) return;
    const currentDrops = currentMap.dropConfig || {
      enabled: true,
      goldEnabled: false,
      goldChancePercent: 10,
      goldMin: 100,
      goldMax: 1000,
      activationEnabled: false,
      activationChancePercent: 0.1,
      items: [],
    };
    const defaultItem = (metaOptions.itemTemplates && metaOptions.itemTemplates[0]) || { id: 190, name: 'Vàng' };
    const newItem = {
      id: Date.now(),
      tempId: defaultItem.id,
      itemName: defaultItem.name,
      iconId: defaultItem.icon_id,
      mobTempId: Number(mobTempId),
      chancePercent: 5.0,
      quantityMin: 1,
      quantityMax: 1,
      spreadCountMin: 1,
      spreadCountMax: 1,
      spreadDistance: 25,
      playerLevelMin: 0,
      playerLevelMax: 19,
      timeStartMin: 0,
      timeEndMin: 1440,
      enabled: true,
      options: [],
    };
    setCurrentMap({
      ...currentMap,
      dropConfig: {
        ...currentDrops,
        items: [...(currentDrops.items || []), newItem],
      },
    });
  };

  const handleUpdateDropItem = (itemIdx, patch) => {
    if (!currentMap || !currentMap.dropConfig?.items) return;
    const items = [...currentMap.dropConfig.items];
    if (items[itemIdx]) {
      items[itemIdx] = { ...items[itemIdx], ...patch };
      setCurrentMap({
        ...currentMap,
        dropConfig: { ...currentMap.dropConfig, items },
      });
    }
  };

  const handleRemoveDropItem = (itemIdx) => {
    if (!currentMap || !currentMap.dropConfig?.items) return;
    const items = currentMap.dropConfig.items.filter((_, idx) => idx !== itemIdx);
    setCurrentMap({
      ...currentMap,
      dropConfig: { ...currentMap.dropConfig, items },
    });
  };

  const handleAddDropOption = (itemIdx) => {
    if (!currentMap || !currentMap.dropConfig?.items) return;
    const items = [...currentMap.dropConfig.items];
    if (items[itemIdx]) {
      const options = [...(items[itemIdx].options || [])];
      const defaultOption = (metaOptions.itemOptionTemplates && metaOptions.itemOptionTemplates[0]) || { id: 50, name: 'Sức đánh' };
      options.push({ id: defaultOption.id, param: 10 });
      items[itemIdx] = { ...items[itemIdx], options };
      setCurrentMap({
        ...currentMap,
        dropConfig: { ...currentMap.dropConfig, items },
      });
    }
  };

  const handleUpdateDropOption = (itemIdx, optionIdx, patch) => {
    if (!currentMap || !currentMap.dropConfig?.items) return;
    const items = [...currentMap.dropConfig.items];
    if (items[itemIdx] && items[itemIdx].options) {
      const options = [...items[itemIdx].options];
      if (options[optionIdx]) {
        options[optionIdx] = { ...options[optionIdx], ...patch };
        items[itemIdx] = { ...items[itemIdx], options };
        setCurrentMap({
          ...currentMap,
          dropConfig: { ...currentMap.dropConfig, items },
        });
      }
    }
  };

  const handleRemoveDropOption = (itemIdx, optionIdx) => {
    if (!currentMap || !currentMap.dropConfig?.items) return;
    const items = [...currentMap.dropConfig.items];
    if (items[itemIdx] && items[itemIdx].options) {
      const options = items[itemIdx].options.filter((_, idx) => idx !== optionIdx);
      items[itemIdx] = { ...items[itemIdx], options };
      setCurrentMap({
        ...currentMap,
        dropConfig: { ...currentMap.dropConfig, items },
      });
    }
  };

  // Map Effects (eff_map) Helpers
  const handleAddEffect = (defaultId = null) => {
    if (!currentMap) return;
    const effects = currentMap.effects || { effs: [], beffs: [] };
    const firstEff = (metaOptions.effectsCatalog && metaOptions.effectsCatalog[0])?.id ?? 0;
    const effId = defaultId !== null ? Number(defaultId) : firstEff;
    const newEffs = [...(effects.effs || []), {
      id: Date.now(),
      effId,
      layer: 1,
      x: Math.round((currentMap.pxw || 1440) / 2),
      y: Math.round((currentMap.pxh || 480) * 0.7),
      loop: -1,
      delay: 0,
      extra: '',
    }];
    setCurrentMap({
      ...currentMap,
      effects: { ...effects, effs: newEffs },
    });
  };

  const handleUpdateEffect = (idx, changes) => {
    if (!currentMap) return;
    const effects = currentMap.effects || { effs: [], beffs: [] };
    const effs = [...(effects.effs || [])];
    if (effs[idx]) {
      effs[idx] = { ...effs[idx], ...changes };
      setCurrentMap({
        ...currentMap,
        effects: { ...effects, effs },
      });
    }
  };

  const handleDeleteEffect = (idx) => {
    if (!currentMap) return;
    const effects = currentMap.effects || { effs: [], beffs: [] };
    const effs = (effects.effs || []).filter((_, i) => i !== idx);
    setCurrentMap({
      ...currentMap,
      effects: { ...effects, effs },
    });
  };

  const handleDuplicateEffect = (idx) => {
    if (!currentMap) return;
    const effects = currentMap.effects || { effs: [], beffs: [] };
    const src = (effects.effs || [])[idx];
    if (!src) return;
    const newEffs = [...(effects.effs || []), {
      ...src,
      id: Date.now(),
      x: Math.min(currentMap.pxw || 1440, (src.x || 0) + 30),
      y: Math.min(currentMap.pxh || 480, (src.y || 0) + 10),
    }];
    setCurrentMap({
      ...currentMap,
      effects: { ...effects, effs: newEffs },
    });
  };

  const handleToggleAmbientEffect = (beffId) => {
    if (!currentMap) return;
    const id = Number(beffId);
    if (!Number.isFinite(id)) return;
    const effects = currentMap.effects || { effs: [], beffs: [] };
    const beffs = [...(effects.beffs || [])];
    const existingIdx = beffs.findIndex((b) => Number(b.beffId ?? b.val ?? b) === id);
    if (existingIdx >= 0) {
      beffs.splice(existingIdx, 1);
    } else {
      beffs.push({ id: Date.now(), beffId: id, val: String(id) });
    }
    setCurrentMap({
      ...currentMap,
      effects: { ...effects, beffs },
    });
  };

  const handleSetAtmosphereWeather = (weatherType) => {
    if (!currentMap) return;
    const effects = currentMap.effects || { effs: [], beffs: [] };
    const weatherIds = [0, 12, 11, 1, 2, 5, 6, 7, 15, 4, 9, 10, 3, 8];
    let beffs = (effects.beffs || []).filter((b) => !weatherIds.includes(Number(b.beffId ?? b.val ?? b)));

    let targetBeff = null;
    if (weatherType === 'mua.png') targetBeff = 0;
    else if (weatherType === 'tuyet.png') targetBeff = 11;
    else if (weatherType === 'lacay.png') targetBeff = 1;
    else if (weatherType === 'hoadao') targetBeff = 15;
    else if (weatherType === 'sao.png') targetBeff = 4;
    else if (weatherType === 'fire1.png') targetBeff = 9;
    else if (weatherType === 'samchep') targetBeff = 3;
    else if (weatherType === 'phithuyen') targetBeff = 8;

    if (targetBeff !== null) {
      beffs.push({ id: Date.now(), beffId: targetBeff, val: String(targetBeff) });
    }

    setBgCustomConfig((prev) => ({
      ...prev,
      decor: { ...prev.decor, weather: weatherType || null },
    }));

    setCurrentMap({
      ...currentMap,
      effects: { ...effects, beffs },
    });
  };

  const handleSetAtmosphereCloud = (enable) => {
    if (!currentMap) return;
    const effects = currentMap.effects || { effs: [], beffs: [] };
    let beffs = [...(effects.beffs || [])];
    const idx = beffs.findIndex((b) => Number(b.beffId ?? b.val ?? b) === 13);
    if (enable) {
      if (idx < 0) beffs.push({ id: Date.now(), beffId: 13, val: '13' });
    } else {
      if (idx >= 0) beffs.splice(idx, 1);
    }
    setBgCustomConfig((prev) => ({
      ...prev,
      decor: { ...prev.decor, cloud: enable },
    }));
    setCurrentMap({
      ...currentMap,
      effects: { ...effects, beffs },
    });
  };

  const handleSetAtmosphereFog = (fogVal) => {
    if (!currentMap) return;
    const effects = currentMap.effects || { effs: [], beffs: [] };
    let beffs = [...(effects.beffs || [])];
    const idx = beffs.findIndex((b) => Number(b.beffId ?? b.val ?? b) === 14);
    if (fogVal) {
      if (idx < 0) beffs.push({ id: Date.now(), beffId: 14, val: '14' });
    } else {
      if (idx >= 0) beffs.splice(idx, 1);
    }
    setBgCustomConfig((prev) => ({
      ...prev,
      decor: { ...prev.decor, fog: fogVal || null },
    }));
    setCurrentMap({
      ...currentMap,
      effects: { ...effects, beffs },
    });
  };

  // 2. Vẽ ma trận địa hình Tile Map lên Canvas
  useEffect(() => {
    if (!terrainCanvasRef.current || !currentMap) return;
    const canvas = terrainCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const w = currentMap.tmw || 60;
    const h = currentMap.tmh || 20;

    canvas.width = w * 24;
    canvas.height = h * 24;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!showTerrain) return;

    const matrix = currentMap.tileMatrix || [];

    if (tilesetImg) {
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          const idx = r * w + c;
          const tileVal = matrix[idx];
          if (tileVal > 0) {
            const srcY = (tileVal - 1) * 24;
            ctx.drawImage(tilesetImg, 0, srcY, 24, 24, c * 24, r * 24, 24, 24);
          }
        }
      }
    } else {
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          const idx = r * w + c;
          const tileVal = matrix[idx];
          if (tileVal > 0) {
            ctx.fillStyle = '#3f6212';
            ctx.fillRect(c * 24, r * 24, 24, 24);
            ctx.strokeStyle = '#65a30d';
            ctx.strokeRect(c * 24, r * 24, 24, 24);
          }
        }
      }
    }
  }, [currentMap?.tileMatrix, currentMap?.tmw, currentMap?.tmh, currentMap?.tileId, showTerrain, tilesetImg]);

  // 1. Fetch metadata, initial map list and background catalog
  const fetchBgSceneryList = useCallback(async () => {
    try {
      const res = await apiGet('/api/v1/assets/map-backgrounds');
      if (res.ok && res.data && Array.isArray(res.data.backgrounds) && res.data.backgrounds.length > 0) {
        setBgSceneryList(res.data.backgrounds);
        setBgDecorFiles(res.data.decorFiles || []);
      }
    } catch (err) {
      console.warn('Không thể nạp danh sách background catalog từ API, dùng presets:', err.message);
    }
  }, []);

  useEffect(() => {
    if (showBgSceneryCatalogModal) {
      fetchBgSceneryList();
    }
  }, [showBgSceneryCatalogModal, fetchBgSceneryList]);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [metaRes, listRes, bgRes] = await Promise.all([
        apiGet('/api/v1/maps/meta/options'),
        apiGet('/api/v1/maps'),
        apiGet('/api/v1/assets/map-backgrounds').catch(() => ({ ok: false })),
      ]);

      if (metaRes.ok) setMetaOptions(metaRes.data);
      if (bgRes?.ok && bgRes.data && Array.isArray(bgRes.data.backgrounds) && bgRes.data.backgrounds.length > 0) {
        setBgSceneryList(bgRes.data.backgrounds);
        setBgDecorFiles(bgRes.data.decorFiles || []);
      }
      if (listRes.ok) {
        setMaps(listRes.data || []);
        if (listRes.summary) setSummary(listRes.summary);
        if (listRes.data && listRes.data.length > 0 && selectedMapId === null) {
          setSelectedMapId(listRes.data[0].id);
        }
      }
    } catch (err) {
      setErrorMsg('Không thể tải dữ liệu bản đồ: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedMapId]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // 2. Fetch detail when selectedMapId changes
  const fetchMapDetail = useCallback(async (mapId) => {
    if (mapId === null || mapId === undefined) return;
    setLoadingDetail(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiGet(`/api/v1/maps/${mapId}`);
      if (res.ok && res.data) {
        setCurrentMap(res.data);
        setOriginalMap(JSON.parse(JSON.stringify(res.data)));

        // Đồng bộ hiệu ứng môi trường (Atmosphere FX / beffs) vào cấu hình xem trước
        const beffs = res.data.effects?.beffs || [];
        const hasCloud = beffs.some((b) => Number(b.beffId ?? b.val ?? b) === 13);
        const hasFog = beffs.some((b) => Number(b.beffId ?? b.val ?? b) === 14);
        const weatherBeff = beffs.find((b) => [0, 12, 11, 1, 2, 5, 6, 7, 15, 4, 9, 10, 3, 8].includes(Number(b.beffId ?? b.val ?? b)));
        const weatherId = weatherBeff ? Number(weatherBeff.beffId ?? weatherBeff.val ?? weatherBeff) : null;
        let weather = null;
        if (weatherId === 0 || weatherId === 12) weather = 'mua.png';
        else if (weatherId === 11) weather = 'tuyet.png';
        else if ([1, 2, 5, 6, 7].includes(weatherId)) weather = 'lacay.png';
        else if (weatherId === 4) weather = 'sao.png';
        else if (weatherId === 9 || weatherId === 10) weather = 'fire1.png';
        else if (weatherId === 15) weather = 'hoadao';
        else if (weatherId === 3) weather = 'samchep';
        else if (weatherId === 8) weather = 'phithuyen';

        setBgCustomConfig((prev) => ({
          ...prev,
          decor: {
            ...prev.decor,
            cloud: hasCloud,
            fog: hasFog ? 'fog0.png' : null,
            weather,
          },
        }));
      } else {
        setErrorMsg(res.error || 'Lỗi khi tải chi tiết map');
      }
    } catch (err) {
      setErrorMsg('Không thể tải chi tiết map: ' + err.message);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedMapId !== null) {
      fetchMapDetail(selectedMapId);
    }
  }, [selectedMapId, fetchMapDetail]);

  const lastAutoFitMapIdRef = useRef(null);

  // Auto-fit ONLY when a completely different map is loaded
  useEffect(() => {
    if (currentMap?.id !== undefined && currentMap.id !== lastAutoFitMapIdRef.current) {
      lastAutoFitMapIdRef.current = currentMap.id;
      const timer = setTimeout(() => {
        handleFitToScreen();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentMap?.id, handleFitToScreen]);

  // Filtered map list
  const filteredMaps = useMemo(() => {
    return maps.filter((m) => {
      const matchSearch = searchQuery === '' ||
        String(m.id).includes(searchQuery) ||
        (m.name ? m.name.toLowerCase().includes(searchQuery.toLowerCase()) : false);
      const matchPlanet = planetFilter === 'all' || m.planetId === Number(planetFilter);
      const matchType = typeFilter === 'all' || m.type === Number(typeFilter);
      return matchSearch && matchPlanet && matchType;
    });
  }, [maps, searchQuery, planetFilter, typeFilter]);

  // Filtered BG Item Templates
  const filteredBgTemplates = useMemo(() => {
    let list = metaOptions.itemBgTemplates || [];
    if (catalogLayerFilter === 'ground') {
      list = list.filter((t) => Number(t.layer) === 1 || Number(t.layer) === 2);
    } else if (catalogLayerFilter === 'parallax') {
      list = list.filter((t) => Number(t.layer) === 4);
    }
    if (!bgSearchText) return list;
    const q = bgSearchText.trim().toLowerCase();
    return list.filter((t) => {
      const idStr = String(t.id).toLowerCase();
      const imgStr = String(t.imageId !== undefined ? t.imageId : t.id).toLowerCase();
      return idStr.includes(q) || imgStr.includes(q);
    });
  }, [metaOptions.itemBgTemplates, bgSearchText, catalogLayerFilter]);

  // Upload Custom item_bg_temp
  const handleUploadItemBg = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!uploadItemBgForm.imageBase64) {
      setErrorMsg('Vui lòng chọn một file ảnh PNG để tải lên');
      return;
    }
    setIsUploadingItemBg(true);
    try {
      const res = await apiPost('/api/v1/assets/item-bg/upload', {
        image: uploadItemBgForm.imageBase64,
        layer: uploadItemBgForm.layer,
        dx: uploadItemBgForm.dx,
        dy: uploadItemBgForm.dy,
      });
      if (res && res.ok && res.data) {
        const newTmpl = res.data;
        const updatedTemplates = [newTmpl, ...(metaOptions.itemBgTemplates || [])];
        setMetaOptions((prev) => ({ ...prev, itemBgTemplates: updatedTemplates }));
        setSelectedBgTempId(String(newTmpl.id));
        setActiveTool('add-bg-item');
        setShowUploadItemBgModal(false);
        setShowBgCatalogModal(false);
        setUploadItemBgForm({ layer: 1, dx: 0, dy: 0, imageBase64: '', previewUrl: '' });
        setSuccessMsg(`✨ Đã thêm thành công vật thể nền #${newTmpl.id} (Lớp L${newTmpl.layer})! Nhấp lên canvas để đặt vật thể.`);
      } else {
        setErrorMsg(res?.error || 'Tải lên vật thể nền thất bại');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi khi tải lên vật thể nền');
    } finally {
      setIsUploadingItemBg(false);
    }
  };

  // Chuyển đổi tầng layer của vật thể nền an toàn và giữ nguyên toạ độ hiển thị
  const switchItemLayer = (idx, newLayer) => {
    if (!currentMap?.bgItems || !currentMap.bgItems[idx]) return;
    const targetLayer = Number(newLayer);
    const updated = [...currentMap.bgItems];
    const curItem = updated[idx];
    const curTmpl = (metaOptions.itemBgTemplates || []).find((t) => Number(t.id) === Number(curItem.bgTempId));
    const imgId = curItem.imageId ?? (curTmpl ? curTmpl.imageId : curItem.bgTempId);

    const match = (metaOptions.itemBgTemplates || []).find(
      (t) => (Number(t.imageId) === Number(imgId) || Number(t.id) === Number(imgId)) && Number(t.layer) === targetLayer
    );

    const curPx = curItem.px ?? (curItem.x * 24 + (curItem.dx || 0));
    const curPy = curItem.py ?? (curItem.y * 24 + (curItem.dy || 0));
    const newDx = match ? (match.dx || 0) : (curItem.dx || 0);
    const newDy = match ? (match.dy || 0) : (curItem.dy || 0);
    const newX = Math.max(0, Math.round((curPx - newDx) / 24));
    const newY = Math.max(0, Math.round((curPy - newDy) / 24));

    updated[idx] = {
      ...curItem,
      bgTempId: match ? match.id : curItem.bgTempId,
      imageId: imgId,
      layer: targetLayer,
      dx: newDx,
      dy: newDy,
      x: newX,
      y: newY,
      px: newX * 24 + newDx,
      py: newY * 24 + newDy,
    };
    setCurrentMap({ ...currentMap, bgItems: updated });
  };

  // Clone BgItems từ bản đồ khác
  const handleCloneBgItems = async () => {
    if (!cloneSourceMapId) {
      setErrorMsg('Vui lòng chọn một bản đồ nguồn để sao chép');
      return;
    }
    setIsCloningBgItems(true);
    try {
      const res = await apiGet(`/api/v1/maps/${cloneSourceMapId}`);
      if (res && res.ok && res.data) {
        const sourceMap = res.data;
        const sourceItems = sourceMap.bgItems || [];
        if (sourceItems.length === 0) {
          setErrorMsg(`Bản đồ #${cloneSourceMapId} (${sourceMap.name}) không có vật thể nền nào.`);
          return;
        }
        const cloned = sourceItems.map((item, idx) => ({
          ...item,
          id: Date.now() + idx,
        }));
        setCurrentMap((prev) => ({ ...prev, bgItems: cloned }));
        setShowCloneBgItemsModal(false);
        setSuccessMsg(`✨ Đã sao chép thành công ${cloned.length} vật thể nền từ Map #${cloneSourceMapId} (${sourceMap.name})! Nhớ bấm Lưu Bản Đồ.`);
      } else {
        setErrorMsg('Không thể tải dữ liệu bản đồ nguồn');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi khi sao chép vật thể nền');
    } finally {
      setIsCloningBgItems(false);
    }
  };

  // Save changes (DB + binary layout files)
  const handleSaveMap = async () => {
    if (!currentMap) return;
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const mapNameToSend = (currentMap.name && String(currentMap.name).trim())
        ? String(currentMap.name).trim()
        : (originalMap?.name || `Bản đồ ${currentMap.id}`);

      const res = await apiPut(`/api/v1/maps/${currentMap.id}`, {
        name: mapNameToSend,
        zones: currentMap.zones,
        maxPlayer: currentMap.maxPlayer,
        type: currentMap.type,
        planetId: currentMap.planetId,
        bgType: currentMap.bgType,
        tileId: currentMap.tileId,
        bgId: currentMap.bgId,
        isMapDouble: currentMap.isMapDouble,
        masterZoom: 'x4',
        waypoints: currentMap.waypoints || [],
        mobs: currentMap.mobs || [],
        npcs: currentMap.npcs || [],
        bgItems: currentMap.bgItems || [],
        effects: currentMap.effects || { effs: [], beffs: [] },
        tileMatrix: currentMap.tileMatrix,
        tmw: currentMap.tmw,
        tmh: currentMap.tmh,
        dropConfig: currentMap.dropConfig,
      });

      if (res.ok) {
        setSuccessMsg(res.message || '✨ Đã lưu thành công (Mặc định X4 Master -> Tự động đồng bộ X3, X2, X1)!');
        setOriginalMap(JSON.parse(JSON.stringify(currentMap)));
        // Refresh list summary
        const listRes = await apiGet('/api/v1/maps');
        if (listRes.ok) {
          setMaps(listRes.data || []);
          if (listRes.summary) setSummary(listRes.summary);
        }
      } else {
        setErrorMsg(res.error || 'Lỗi khi lưu cấu hình map');
      }
    } catch (err) {
      setErrorMsg('Không thể lưu map: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Create new map
  const handleCreateMap = async (e) => {
    e.preventDefault();
    const id = Number(newMapForm.id);
    if (!Number.isFinite(id) || id < 0) {
      setErrorMsg('Map ID phải là số nguyên dương hợp lệ');
      return;
    }

    try {
      let payload = { ...newMapForm };

      if (newMapForm.creationMode === 'ai') {
        const dummyMap = {
          id,
          name: newMapForm.name || `Bản đồ ${id}`,
          planetId: newMapForm.planetId,
          type: newMapForm.type,
          tmw: Number(newMapForm.tmw) || 60,
          tmh: Number(newMapForm.tmh) || 20,
          tileId: newMapForm.preset === 'namec_floating' ? 2 : (newMapForm.preset === 'xayda_badlands' ? 3 : (newMapForm.preset === 'hell_volcano' ? 4 : (newMapForm.preset === 'martial_arena' ? 5 : 1))),
        };

        const plan = generateAiMapPlan(dummyMap, newMapForm, metaOptions);
        payload = {
          ...payload,
          tileId: dummyMap.tileId,
          tileMatrix: plan.tileMatrix,
          bgItems: plan.bgItems,
          mobs: plan.mobs,
          waypoints: plan.waypoints,
          npcs: plan.npcs,
        };
      }

      const res = await apiPost('/api/v1/maps', payload);
      if (res.ok) {
        setShowNewMapModal(false);
        setSuccessMsg(res.message || '✨ Đã tạo map mới thành công!');
        await fetchInitialData();
        setSelectedMapId(id);
      } else {
        setErrorMsg(res.error || 'Lỗi khi tạo map');
      }
    } catch (err) {
      setErrorMsg('Không thể tạo map: ' + err.message);
    }
  };

  // Delete map (Supports deleting current map or a specific map from sidebar)
  const handleDeleteMap = async (targetId = null, targetName = '') => {
    const id = targetId !== null ? targetId : currentMap?.id;
    const name = targetName || (id === currentMap?.id ? currentMap?.name : '') || `Map #${id}`;
    if (id === undefined || id === null) return;
    if (!window.confirm(`⚠️ BẠN CÓ CHẮC MUỐN XOÁ VĨNH VIỄN BẢN ĐỒ:\n[ID: ${id}] ${name}\n\nThao tác này sẽ xoá cấu hình database (quái, npc, waypoint, drop) và các file dữ liệu map!`)) {
      return;
    }
    try {
      const res = await apiDelete(`/api/v1/maps/${id}`);
      if (res.ok) {
        setSuccessMsg(res.message || `Đã xoá bản đồ [${id}] ${name} thành công!`);
        if (selectedMapId === id || currentMap?.id === id) {
          setSelectedMapId(null);
          setCurrentMap(null);
        }
        await fetchInitialData();
      } else {
        setErrorMsg(res.error || 'Lỗi khi xoá map');
      }
    } catch (err) {
      setErrorMsg('Không thể xoá map: ' + err.message);
    }
  };

  // Run Health Check / Integrity Validation
  const handleRunHealthCheck = async () => {
    setShowHealthCheckModal(true);
    setHealthLoading(true);
    try {
      const res = await apiGet('/api/v1/maps/system/validate-all');
      if (res.ok) {
        setHealthData(res.data);
      } else {
        setErrorMsg(res.error || 'Lỗi khi kiểm tra tính toàn vẹn');
      }
    } catch (err) {
      setErrorMsg('Lỗi kiểm tra: ' + err.message);
    } finally {
      setHealthLoading(false);
    }
  };

  // Export SQL
  const handleExportSql = async () => {
    if (!currentMap) return;
    try {
      const res = await apiGet(`/api/v1/maps/${currentMap.id}/export-sql`);
      if (res.ok && res.data) {
        setExportSqlText(res.data.sql);
        setShowExportModal(true);
      } else {
        setErrorMsg(res.error || 'Lỗi khi xuất SQL');
      }
    } catch (err) {
      setErrorMsg('Không thể xuất SQL: ' + err.message);
    }
  };

  // Batch mob spawner execute
  const handleExecuteBatchSpawner = () => {
    if (!currentMap) return;
    const { mobTempId, mobLevel, mobHp, percentDame, mobDame, count, minX, maxX, fixedY } = batchMobForm;
    const mobInfo = (metaOptions?.mobTemplates || []).find((m) => m.id === Number(mobTempId));
    const mobName = mobInfo ? mobInfo.name : `Quái #${mobTempId}`;
    const defaultHp = mobInfo ? mobInfo.hp : mobHp;
    const pDame = Number(percentDame) || (mobInfo ? (mobInfo.percent_dame ?? 10) : 10);
    const hp = Number(mobHp) || defaultHp;
    const finalDame = Number(mobDame) || Math.max(1, Math.round((hp * pDame) / 100));

    const numCount = Math.max(1, Number(count));
    const startX = Math.min(Number(minX), Number(maxX));
    const endX = Math.max(Number(minX), Number(maxX));
    const step = numCount > 1 ? (endX - startX) / (numCount - 1) : 0;

    const newMobs = [...(currentMap.mobs || [])];
    for (let i = 0; i < numCount; i++) {
      const x = Math.round(startX + i * step);
      newMobs.push({
        id: Date.now() + i,
        mobTempId: Number(mobTempId),
        mobName,
        mobLevel: Number(mobLevel),
        mobHp: hp,
        percentDame: pDame,
        mobDame: finalDame,
        mobX: x,
        mobY: Number(fixedY),
      });
    }

    setCurrentMap({
      ...currentMap,
      mobs: newMobs,
    });
    setSuccessMsg(`Đã tạo thành công ${numCount} quái [${mobName}] (HP: ${hp.toLocaleString()}, Dame: ${finalDame.toLocaleString()}) rải từ X=${startX} đến X=${endX}`);
  };

  // Canvas Mouse Wheel Zoom (Ctrl/Cmd + Wheel to zoom)
  const handleCanvasWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.05 : -0.05;
      setZoomLevel((z) => Math.min(2.5, Math.max(0.08, Number((z + delta).toFixed(2)))));
    }
  };

  // Canvas Mouse Down Handler (Painting / Panning / Shapes / Placing)
  const handleCanvasMouseDown = (e) => {
    if (!currentMap) return;

    // Chuột giữa (Middle click) hoặc giữ Space/Shift -> Bắt đầu Pan di chuyển khung nhìn
    if (e.button === 1 || e.shiftKey) {
      e.preventDefault();
      setIsPanning(true);
      if (canvasContainerRef.current) {
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          scrollLeft: canvasContainerRef.current.scrollLeft,
          scrollTop: canvasContainerRef.current.scrollTop,
        };
      }
      return;
    }

    const { x, y, tileX, tileY } = getBoardCoordinates(e);

    // Shape Tools (Line, Rect, Platform)
    if (e.button === 0 && (activeTool === 'line-tile' || activeTool === 'rect-tile' || activeTool === 'platform-tile')) {
      e.preventDefault();
      recordHistory(currentMap);
      setDragDrawStart({ tileX, tileY, x, y });
      setIsDrawingShape(true);
      return;
    }

    // Chuột phải: Xóa gạch nhanh khi ở công cụ gạch
    if (e.button === 2) {
      e.preventDefault();
      if (activeTool === 'paint-tile' || activeTool === 'erase-tile' || activeTool === 'fill-tile' || activeTool === 'line-tile' || activeTool === 'rect-tile') {
        recordHistory(currentMap);
        paintTileBlock(tileX, tileY, 0, brushSize);
        setIsPaintingTerrain(true);
        return;
      }
    }

    // Chuột trái
    if (e.button === 0) {
      if (activeTool === 'paint-tile') {
        recordHistory(currentMap);
        paintTileBlock(tileX, tileY, selectedTileIndex, brushSize);
        setIsPaintingTerrain(true);
      } else if (activeTool === 'erase-tile') {
        recordHistory(currentMap);
        paintTileBlock(tileX, tileY, 0, brushSize);
        setIsPaintingTerrain(true);
      } else if (activeTool === 'fill-tile') {
        recordHistory(currentMap);
        floodFillTerrain(tileX, tileY, selectedTileIndex);
      } else if (activeTool === 'pipette-tile') {
        const val = (currentMap.tileMatrix || [])[tileY * (currentMap.tmw || 60) + tileX] || 0;
        setSelectedTileIndex(val > 0 ? val : 1);
        setActiveTool('paint-tile');
      }
    }
  };

  // Canvas Mouse Move Coordinate Reader & Drag Paint
  const handleCanvasMouseMove = (e) => {
    if (isPanning && canvasContainerRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      canvasContainerRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
      canvasContainerRef.current.scrollTop = panStartRef.current.scrollTop - dy;
      return;
    }

    if (!currentMap) return;

    const { x, y, tileX, tileY } = getBoardCoordinates(e);
    setMousePos({ x, y, tileX, tileY });

    if (isPaintingTerrain) {
      if (activeTool === 'paint-tile') {
        paintTileBlock(tileX, tileY, selectedTileIndex, brushSize);
      } else if (activeTool === 'erase-tile') {
        paintTileBlock(tileX, tileY, 0, brushSize);
      }
      return;
    }

    // Handle Dragging
    if (draggingItem && currentMap) {
      if (draggingItem.type === 'bgItem') {
        const updated = [...(currentMap.bgItems || [])];
        if (updated[draggingItem.index]) {
          const it = updated[draggingItem.index];
          const itemDx = it.dx || 0;
          const itemDy = it.dy || 0;
          const targetTileX = bgItemPlacementMode === 'free'
            ? Math.max(0, Math.min((currentMap.tmw || 60) - 1, Math.round((x - itemDx) / 24)))
            : tileX;
          const targetTileY = bgItemPlacementMode === 'free'
            ? Math.max(0, Math.min((currentMap.tmh || 20) - 1, Math.round((y - itemDy) / 24)))
            : tileY;
          updated[draggingItem.index] = {
            ...it,
            x: targetTileX,
            y: targetTileY,
            px: targetTileX * 24 + itemDx,
            py: targetTileY * 24 + itemDy,
          };
          setCurrentMap({ ...currentMap, bgItems: updated });
        }
      } else if (draggingItem.type === 'mob') {
        const updated = [...currentMap.mobs];
        if (updated[draggingItem.index]) {
          updated[draggingItem.index] = {
            ...updated[draggingItem.index],
            mobX: Math.max(0, Math.min(currentMap.pxw, x)),
            mobY: Math.max(0, Math.min(currentMap.pxh, y)),
          };
          setCurrentMap({ ...currentMap, mobs: updated });
        }
      } else if (draggingItem.type === 'npc') {
        const updated = [...currentMap.npcs];
        if (updated[draggingItem.index]) {
          updated[draggingItem.index] = {
            ...updated[draggingItem.index],
            npcX: Math.max(0, Math.min(currentMap.pxw, x)),
            npcY: Math.max(0, Math.min(currentMap.pxh, y)),
          };
          setCurrentMap({ ...currentMap, npcs: updated });
        }
      } else if (draggingItem.type === 'waypoint') {
        const updated = [...currentMap.waypoints];
        if (updated[draggingItem.index]) {
          const wp = updated[draggingItem.index];
          const w = Math.max(24, wp.maxX - wp.minX);
          const h = Math.max(24, wp.maxY - wp.minY);
          updated[draggingItem.index] = {
            ...wp,
            minX: Math.max(0, Math.min(currentMap.pxw - w, x)),
            minY: Math.max(0, Math.min(currentMap.pxh - h, y)),
            maxX: Math.max(0, Math.min(currentMap.pxw - w, x)) + w,
            maxY: Math.max(0, Math.min(currentMap.pxh - h, y)) + h,
          };
          setCurrentMap({ ...currentMap, waypoints: updated });
        }
      } else if (draggingItem.type === 'effect') {
        const effects = currentMap.effects || { effs: [], beffs: [] };
        const updated = [...(effects.effs || [])];
        if (updated[draggingItem.index]) {
          updated[draggingItem.index] = {
            ...updated[draggingItem.index],
            x: Math.max(0, Math.min(currentMap.pxw || 1440, x)),
            y: Math.max(0, Math.min(currentMap.pxh || 480, y)),
          };
          setCurrentMap({ ...currentMap, effects: { ...effects, effs: updated } });
        }
      }
    }
  };

  const handleCanvasMouseUp = () => {
    if (isDrawingShape && dragDrawStart && currentMap) {
      const { tileX, tileY } = mousePos;
      const w = currentMap.tmw || 60;
      const h = currentMap.tmh || 20;
      const matrix = [...(currentMap.tileMatrix || [])];
      while (matrix.length < w * h) matrix.push(0);

      if (activeTool === 'line-tile') {
        const cells = getLineCells(dragDrawStart.tileX, dragDrawStart.tileY, tileX, tileY);
        const half = Math.floor(brushSize / 2);
        cells.forEach(([cx, cy]) => {
          for (let dy = -half; dy <= half + (brushSize % 2 === 0 ? 1 : 0); dy++) {
            for (let dx = -half; dx <= half + (brushSize % 2 === 0 ? 1 : 0); dx++) {
              const nx = cx + dx;
              const ny = cy + dy;
              if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                matrix[ny * w + nx] = selectedTileIndex;
              }
            }
          }
        });
      } else if (activeTool === 'rect-tile') {
        const cells = getRectCells(dragDrawStart.tileX, dragDrawStart.tileY, tileX, tileY, rectMode);
        cells.forEach(([cx, cy]) => {
          if (cx >= 0 && cx < w && cy >= 0 && cy < h) {
            matrix[cy * w + cx] = selectedTileIndex;
          }
        });
      } else if (activeTool === 'platform-tile') {
        const cells = getPlatformCells(dragDrawStart.tileX, tileX, dragDrawStart.tileY, platformThickness, selectedTileIndex, Math.min(selectedTileIndex + 3, 30));
        cells.forEach(({ x: cx, y: cy, val }) => {
          if (cx >= 0 && cx < w && cy >= 0 && cy < h) {
            matrix[cy * w + cx] = val;
          }
        });
      }

      setCurrentMap({ ...currentMap, tileMatrix: matrix });
      setIsDrawingShape(false);
      setDragDrawStart(null);
    }

    if (draggingItem) setDraggingItem(null);
    if (isPaintingTerrain) setIsPaintingTerrain(false);
    if (isPanning) setIsPanning(false);
  };

  // Canvas Click Action
  const handleCanvasClick = (e) => {
    if (draggingItem || isPaintingTerrain) return;
    if (!currentMap) return;

    const { x, y, tileX, tileY } = getBoardCoordinates(e);

    if (activeTool === 'add-bg-item') {
      const meta = metaOptions.itemBgTemplates?.find((b) => String(b.id) === String(selectedBgTempId));
      const imageId = meta ? meta.imageId : Number(selectedBgTempId);
      const chosenLayer = bgItemPlacementLayer !== undefined ? Number(bgItemPlacementLayer) : (meta ? Number(meta.layer) : 1);
      const matchTmpl = (metaOptions.itemBgTemplates || []).find(
        (t) => (Number(t.imageId) === Number(imageId) || Number(t.id) === Number(imageId)) && Number(t.layer) === chosenLayer
      );
      const layer = chosenLayer;
      const defaultDx = matchTmpl ? (matchTmpl.dx || 0) : (meta ? (meta.dx || 0) : 0);
      const defaultDy = matchTmpl ? (matchTmpl.dy || 0) : (meta ? (meta.dy || 0) : 0);
      const bgTempId = matchTmpl ? matchTmpl.id : Number(selectedBgTempId);

      let finalX, finalY, finalPx, finalPy;
      if (bgItemPlacementMode === 'free') {
        finalX = Math.max(0, Math.min((currentMap.tmw || 60) - 1, Math.round((x - defaultDx) / 24)));
        finalY = Math.max(0, Math.min((currentMap.tmh || 20) - 1, Math.round((y - defaultDy) / 24)));
        finalPx = finalX * 24 + defaultDx;
        finalPy = finalY * 24 + defaultDy;
      } else {
        finalX = tileX;
        finalY = tileY;
        finalPx = tileX * 24 + defaultDx;
        finalPy = tileY * 24 + defaultDy;
      }

      const newBgItems = [...(currentMap.bgItems || []), {
        id: Date.now(),
        bgTempId,
        imageId,
        layer,
        dx: defaultDx,
        dy: defaultDy,
        x: finalX,
        y: finalY,
        px: finalPx,
        py: finalPy,
        imageUrl: meta ? meta.url : `/api/v1/assets/item-bg/${imageId}.png`,
        scale: bgItemScale || 1.0,
        width: bgItemCustomWidth ? Number(bgItemCustomWidth) : undefined,
        height: bgItemCustomHeight ? Number(bgItemCustomHeight) : undefined,
        flipX: Boolean(bgItemFlipX),
      }];
      setCurrentMap({ ...currentMap, bgItems: newBgItems });
      setSelectedBgItemIdx(newBgItems.length - 1);
      setActiveTab('layout');
    } else if (activeTool === 'add-effect') {
      const effects = currentMap.effects || { effs: [], beffs: [] };
      const defaultEff = (metaOptions.effectsCatalog && metaOptions.effectsCatalog[0])?.id ?? 0;
      const newEffs = [...(effects.effs || []), {
        id: Date.now(),
        effId: defaultEff,
        layer: 1,
        x,
        y,
        loop: -1,
        delay: 0,
        extra: '',
      }];
      setCurrentMap({ ...currentMap, effects: { ...effects, effs: newEffs } });
      setActiveTab('effects');
    } else if (activeTool === 'add-mob') {
      const defaultMob = (metaOptions?.mobTemplates && metaOptions.mobTemplates[0]) || { id: 0, name: 'Mộc nhân', hp: 100, percent_dame: 10 };
      const hp = defaultMob.hp || 100;
      const pDame = defaultMob.percent_dame ?? 10;
      const dame = Math.max(1, Math.round((hp * pDame) / 100));
      const newMobs = [...(currentMap.mobs || []), {
        id: Date.now(),
        mobTempId: defaultMob.id,
        mobName: defaultMob.name,
        mobLevel: 1,
        mobHp: hp,
        percentDame: pDame,
        mobDame: dame,
        mobX: x,
        mobY: y,
      }];
      setCurrentMap({ ...currentMap, mobs: newMobs });
      setActiveTab('mobs');
    } else if (activeTool === 'add-npc') {
      const defaultNpc = (metaOptions?.npcTemplates && metaOptions.npcTemplates[0]) || { id: 0, name: 'Ông Gôhan', avatar: 349 };
      const newNpcs = [...(currentMap.npcs || []), {
        id: Date.now(),
        npcTempId: defaultNpc.id,
        npcName: defaultNpc.name,
        avatar: defaultNpc.avatar,
        npcX: x,
        npcY: y,
      }];
      setCurrentMap({ ...currentMap, npcs: newNpcs });
      setActiveTab('npcs');
    } else if (activeTool === 'add-waypoint') {
      const targetMap = (metaOptions?.maps || []).find((m) => m.id !== currentMap.id) || { id: 0, name: 'Làng Aru' };
      const newWps = [...(currentMap.waypoints || []), {
        id: Date.now(),
        name: targetMap.name,
        minX: x,
        minY: y,
        maxX: Math.min(currentMap.pxw, x + 48),
        maxY: Math.min(currentMap.pxh, y + 48),
        isEnter: false,
        isOffline: false,
        goMap: targetMap.id,
        goMapName: targetMap.name,
        goX: 100,
        goY: 384,
      }];
      setCurrentMap({ ...currentMap, waypoints: newWps });
      setActiveTab('waypoints');
    }
  };

  const getPlanetMeta = (planetId) => {
    return PLANET_OPTIONS.find((p) => p.id === planetId) || PLANET_OPTIONS[3];
  };

  const hasUnsavedChanges = useMemo(() => {
    if (!currentMap || !originalMap) return false;
    return JSON.stringify(currentMap) !== JSON.stringify(originalMap);
  }, [currentMap, originalMap]);

  return (
    <div className={`map-editor-page ${theaterMode ? 'theater-mode' : ''}`} onMouseUp={handleCanvasMouseUp}>
      {/* 1. TOP HEADER BAR */}
      <header className="map-editor-header">
        <div className="map-editor-title-group">
          <div className="map-editor-icon-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
          </div>
          <div>
            <h1>Studio Tùy Chỉnh & Bố Cục Bản Đồ (Map & Layout Studio)</h1>
            <p className="map-editor-subtitle">
              Bao quát {summary?.total || 0} map • {summary?.totalMobs || 0} quái • {summary?.totalNpcs || 0} NPCs • {summary?.totalWaypoints || 0} cổng dịch chuyển • 450+ mẫu vật thể nền
            </p>
          </div>
          <div className="x4-engine-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '4px 10px', borderRadius: '20px', marginLeft: '12px' }}>
            <span style={{ fontSize: '14px' }}>🎯</span>
            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>X4 Master UHD Engine (x4 → x3, x2, x1)</span>
          </div>
        </div>

        <div className="map-editor-header-actions">
          <button
            type="button"
            className="btn btn-ai-vision"
            onClick={() => setShowVisionModal(true)}
            title="Nhận diện bố cục map từ ảnh chụp bằng AI Vision & Computer Vision (Hỗ trợ kéo thả ảnh / Dán ảnh bằng Ctrl+V)"
          >
            <span className="btn-icon">📷</span> AI Nhận Diện Bố Cục Ảnh
          </button>
          <button
            type="button"
            className="btn btn-ai-magic"
            onClick={() => {
              handleAiGeneratePreview();
              setShowAiMapModal(true);
            }}
            title="Tự động vẽ bản đồ thông minh bằng AI (Tạo địa hình, quái, cổng, đảo bay, vật thể decor)"
          >
            <span className="btn-icon">✨</span> AI Tự Động Vẽ Map
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Hoàn tác thao tác vẽ gần nhất (Phím tắt: Ctrl+Z)"
          >
            ↶ Hoàn tác
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleRedo}
            disabled={historyIndex >= historyStack.length - 1}
            title="Làm lại thao tác vừa hoàn tác (Phím tắt: Ctrl+Y)"
          >
            ↷ Làm lại
          </button>
          <button
            type="button"
            className={`btn ${theaterMode ? 'btn-accent' : 'btn-outline'}`}
            onClick={() => setTheaterMode(!theaterMode)}
            title="Mở rộng không gian hiển thị toàn màn hình"
          >
            <span className="btn-icon">⛶</span> {theaterMode ? 'Thu nhỏ Studio' : 'Phóng Toàn Màn Hình'}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleRunHealthCheck}
            title="Quét phát hiện lỗi toàn bộ map"
          >
            <span className="btn-icon">🩺</span> Kiểm tra Map
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setNewMapForm({
                id: (maps.reduce((max, m) => Math.max(max, m.id), 0) + 1).toString(),
                name: '',
                planetId: 0,
                type: 0,
                cloneFromId: selectedMapId !== null ? selectedMapId.toString() : '',
              });
              setShowNewMapModal(true);
            }}
          >
            <span className="btn-icon">➕</span> Thêm Map Mới
          </button>
        </div>
      </header>

      {/* ALERT BANNERS */}
      {errorMsg && (
        <div className="map-editor-alert error">
          <span className="alert-icon">⚠️</span>
          <span>{errorMsg}</span>
          <button type="button" className="alert-close" onClick={() => setErrorMsg('')}>×</button>
        </div>
      )}
      {successMsg && (
        <div className="map-editor-alert success">
          <span className="alert-icon">✅</span>
          <span>{successMsg}</span>
          <button type="button" className="alert-close" onClick={() => setSuccessMsg('')}>×</button>
        </div>
      )}

      {/* 2. THREE-PANEL STUDIO WORKSPACE */}
      <div
        className={`map-editor-workspace ${leftSidebarCollapsed ? 'left-collapsed' : ''} ${rightInspectorCollapsed ? 'right-collapsed' : ''}`}
      >
        {/* PANEL A: MAP LIST & EXPLORER (LEFT) */}
        {!leftSidebarCollapsed ? (
          <aside className="map-sidebar">
            <div className="sidebar-collapse-header">
              <span className="sidebar-section-title">🗺️ Danh Sách Map ({filteredMaps.length})</span>
              <button
                type="button"
                className="btn-collapse-sidebar"
                onClick={() => setLeftSidebarCollapsed(true)}
                title="Thu gọn danh sách map để mở rộng màn hình"
              >
                ◀
              </button>
            </div>

            <div className="map-sidebar-search">
              <input
                type="text"
                placeholder="🔍 Tìm theo Tên hoặc ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="map-search-input"
              />
            </div>

            <div className="map-sidebar-filters">
              <div className="planet-filter-group">
                <button
                  type="button"
                  className={`planet-chip ${planetFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setPlanetFilter('all')}
                >
                  Tất cả
                </button>
                {PLANET_OPTIONS.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className={`planet-chip ${planetFilter === String(p.id) ? 'active' : ''} planet-${p.badge}`}
                    onClick={() => setPlanetFilter(String(p.id))}
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              <div className="type-filter-row">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="map-type-select"
                >
                  <option value="all">Mọi loại bản đồ</option>
                  {MAP_TYPE_OPTIONS.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="map-list-scroll">
              {loading ? (
                <div className="map-list-loading">
                  <span className="ui-spinner" />
                  <p>Đang tải danh sách map...</p>
                </div>
              ) : filteredMaps.length === 0 ? (
                <div className="map-list-empty">Không tìm thấy bản đồ nào phù hợp</div>
              ) : (
                filteredMaps.map((m) => {
                  const planet = getPlanetMeta(m.planetId);
                  const isSelected = selectedMapId === m.id;
                  return (
                    <div
                      key={m.id}
                      className={`map-card ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => setSelectedMapId(m.id)}
                    >
                      <div className="map-card-header">
                        <span className="map-id-badge">ID {m.id}</span>
                        <span className="map-name" title={m.name}>{m.name}</span>
                        <span
                          className="map-planet-tag"
                          style={{ backgroundColor: `${planet.color}22`, color: planet.color, borderColor: `${planet.color}55` }}
                        >
                          {planet.name}
                        </span>
                        <button
                          type="button"
                          className="btn-card-delete-quick"
                          title={`Xoá bản đồ [${m.id}] ${m.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMap(m.id, m.name);
                          }}
                        >
                          🗑️
                        </button>
                      </div>

                      <div className="map-card-stats">
                        <span className="stat-pill" title="Số lượng quái">👾 {m.mobCount} quái</span>
                        <span className="stat-pill" title="Số lượng NPC">👤 {m.npcCount} NPC</span>
                        <span className="stat-pill" title="Cổng dịch chuyển">🌀 {m.waypointCount} wp</span>
                        <span className="stat-pill dim" title="Kích thước thực tế">📏 {m.pxw}x{m.pxh}px</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        ) : (
          <div className="collapsed-bar left-bar" onClick={() => setLeftSidebarCollapsed(false)} title="Mở danh sách Map">
            <span>▶ Danh Sách Bản Đồ</span>
          </div>
        )}

        {/* PANEL B: VISUAL 2D MAP CANVAS (CENTER) */}
        <main className="map-canvas-container">
          {loadingDetail || !currentMap ? (
            <div className="canvas-loading-state">
              <span className="ui-spinner" />
              <p>Đang tải bản đồ tương tác...</p>
            </div>
          ) : (
            <>
              {/* CANVAS TOOLBAR */}
              <div className="canvas-toolbar">
                <div className="tool-group">
                  <span className="toolbar-label">Công cụ:</span>
                  <button
                    type="button"
                    className={`tool-btn ${activeTool === 'select' ? 'active' : ''}`}
                    onClick={() => setActiveTool('select')}
                    title="Chế độ Xem & Kéo thả vị trí"
                  >
                    🖐️ Kéo Thả
                  </button>
                  <button
                    type="button"
                    className={`tool-btn ${(activeTool === 'paint-tile' || activeTool === 'erase-tile' || activeTool === 'line-tile' || activeTool === 'rect-tile' || activeTool === 'platform-tile' || activeTool === 'fill-tile' || activeTool === 'pipette-tile') ? 'active' : ''}`}
                    onClick={() => setActiveTool((activeTool === 'paint-tile' || activeTool === 'erase-tile' || activeTool === 'line-tile' || activeTool === 'rect-tile' || activeTool === 'platform-tile' || activeTool === 'fill-tile' || activeTool === 'pipette-tile') ? 'select' : 'paint-tile')}
                    title="Bật/Tắt Bảng Gạch Tileset để chỉnh sửa địa hình theo ô lưới (Phím tắt: B)"
                  >
                    🧱 Vẽ Gạch (Tileset)
                  </button>
                  <button
                    type="button"
                    className={`tool-btn ${activeTool === 'add-bg-item' ? 'active' : ''}`}
                    onClick={() => setActiveTool('add-bg-item')}
                    title="Click vào bản đồ để đặt vật thể Decor / Nhà / Cây"
                  >
                    🏛️ Đặt Vật Thể
                  </button>
                  <button
                    type="button"
                    className={`tool-btn ${activeTool === 'add-mob' ? 'active' : ''}`}
                    onClick={() => setActiveTool('add-mob')}
                    title="Click vào bản đồ để thêm Quái"
                  >
                    👾 Đặt Quái
                  </button>
                  <button
                    type="button"
                    className={`tool-btn ${activeTool === 'add-npc' ? 'active' : ''}`}
                    onClick={() => setActiveTool('add-npc')}
                    title="Click vào bản đồ để thêm NPC"
                  >
                    👤 Đặt NPC
                  </button>
                  <button
                    type="button"
                    className={`tool-btn ${activeTool === 'add-waypoint' ? 'active' : ''}`}
                    onClick={() => setActiveTool('add-waypoint')}
                    title="Click vào bản đồ để tạo Cổng dịch chuyển"
                  >
                    🌀 Tạo Cổng
                  </button>
                  <button
                    type="button"
                    className={`tool-btn ${activeTool === 'add-effect' ? 'active' : ''}`}
                    onClick={() => setActiveTool('add-effect')}
                    title="Click vào bản đồ để tạo điểm Hiệu Ứng (Point Effect)"
                  >
                    ✨ Đặt Effect
                  </button>
                </div>

                <div className="tool-group layers">
                  <span className="toolbar-label">Lớp:</span>
                  <button
                    type="button"
                    className={`layer-toggle ${showGrid ? 'active' : ''}`}
                    onClick={() => setShowGrid(!showGrid)}
                    title="Bật/Tắt Lưới toạ độ Tile 24px (Phím tắt: G)"
                  >
                    🔲 Lưới
                  </button>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                    <button
                      type="button"
                      className={`layer-toggle ${showMapBackground ? 'active' : ''}`}
                      onClick={() => setShowMapBackground(!showMapBackground)}
                      title="Bật/Tắt Hiển thị Phông Nền Cảnh Quan (Bầu trời, đồi núi, mây, mặt trời)"
                    >
                      🌄 Phông nền (Set #{currentMap.bgId ?? 0})
                    </button>
                    <button
                      type="button"
                      className="btn-settings-mini"
                      onClick={() => setShowBgSceneryCatalogModal(true)}
                      title="Mở Thư Viện 15+ Bộ Phông Nền (data/bg)"
                      style={{ background: 'rgba(56, 189, 248, 0.2)', border: '1px solid #38bdf8', color: '#38bdf8' }}
                    >
                      🔍 Đổi
                    </button>
                    <button
                      type="button"
                      className="btn-settings-mini"
                      onClick={() => {
                        setRightInspectorCollapsed(false);
                        setActiveTab('background');
                      }}
                      title="Mở Bảng Tùy Chỉnh Chi Tiết Phông Nền (data/bg)"
                      style={{ background: 'rgba(148, 163, 184, 0.2)' }}
                    >
                      ⚙️
                    </button>
                  </div>
                  <button
                    type="button"
                    className={`layer-toggle ${showTerrain ? 'active' : ''}`}
                    onClick={() => setShowTerrain(!showTerrain)}
                    title="Bật/Tắt Vẽ Địa Hình Gạch từ data/map/tile_map_data"
                  >
                    🧱 Địa hình ({currentMap.tileMatrix?.filter((t) => t > 0).length || 0} gạch)
                  </button>
                  <button
                    type="button"
                    className={`layer-toggle ${showBgItems ? 'active' : ''}`}
                    onClick={() => setShowBgItems(!showBgItems)}
                    title="Bật/Tắt Vật thể Nền / Decor"
                  >
                    🏛️ Vật thể ({currentMap.bgItems?.length || 0})
                  </button>
                  <button
                    type="button"
                    className={`layer-toggle ${showWaypoints ? 'active' : ''}`}
                    onClick={() => setShowWaypoints(!showWaypoints)}
                    title="Bật/Tắt Waypoints"
                  >
                    🌀 Cổng ({currentMap.waypoints?.length || 0})
                  </button>
                  <button
                    type="button"
                    className={`layer-toggle ${showMobs ? 'active' : ''}`}
                    onClick={() => setShowMobs(!showMobs)}
                    title="Bật/Tắt Quái vật"
                  >
                    👾 Quái ({currentMap.mobs?.length || 0})
                  </button>
                  <button
                    type="button"
                    className={`layer-toggle ${showNpcs ? 'active' : ''}`}
                    onClick={() => setShowNpcs(!showNpcs)}
                    title="Bật/Tắt NPCs"
                  >
                    👤 NPCs ({currentMap.npcs?.length || 0})
                  </button>
                  <button
                    type="button"
                    className={`layer-toggle ${showEffects ? 'active' : ''}`}
                    onClick={() => setShowEffects(!showEffects)}
                    title="Bật/Tắt Hiệu ứng Bản Đồ (eff_map & beff)"
                  >
                    ✨ Hiệu ứng ({(currentMap.effects?.effs?.length || 0) + (currentMap.effects?.beffs?.length || 0)})
                  </button>
                  <button
                    type="button"
                    className={`layer-toggle layer-overlay-toggle ${showOverlayImage && overlayImageUrl ? 'active' : ''}`}
                    onClick={() => {
                      if (!overlayImageUrl) {
                        setShowOverlaySettings(true);
                      } else {
                        setShowOverlayImage(!showOverlayImage);
                      }
                    }}
                    title="Bật/Tắt Lồng Ảnh Mẫu Soi Đồ Họa Khớp Lưới 24px (Trace Blueprint Overlay)"
                  >
                    🖼️ Soi Ảnh Mẫu {overlayImageUrl ? (showOverlayImage ? '🟢 BẬT' : '⚪ TẮT') : ''}
                  </button>
                  {overlayImageUrl && (
                    <button
                      type="button"
                      className={`btn-settings-mini ${showOverlaySettings ? 'active' : ''}`}
                      onClick={() => setShowOverlaySettings(!showOverlaySettings)}
                      title="Cài đặt độ mờ & vị trí lớp ảnh mẫu soi đồ họa"
                    >
                      ⚙️
                    </button>
                  )}
                </div>

                {/* OPACITY SLIDER & FIT VIEW BUTTONS */}
                <div className="tool-group zoom-and-view">
                  <div className="opacity-control-group" title="Độ mờ của vật thể nền">
                    <span className="opacity-label">Độ mờ nền:</span>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={bgOpacity}
                      onChange={(e) => setBgOpacity(Number(e.target.value))}
                      className="opacity-slider"
                    />
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm btn-outline btn-fit-view"
                    onClick={handleFitToScreen}
                    title="Tự động thu phóng vừa khít khung màn hình để thấy toàn bộ bản đồ"
                  >
                    🔍 Vừa Màn Hình
                  </button>

                  <button
                    type="button"
                    className="zoom-btn"
                    onClick={() => setZoomLevel((z) => Math.max(0.08, Number((z - 0.1).toFixed(2))))}
                    title="Thu nhỏ"
                  >
                    −
                  </button>
                  <span className="zoom-indicator">{Math.round(zoomLevel * 100)}%</span>
                  <button
                    type="button"
                    className="zoom-btn"
                    onClick={() => setZoomLevel((z) => Math.min(2.5, Number((z + 0.1).toFixed(2))))}
                    title="Phóng to"
                  >
                    +
                  </button>

                  <button
                    type="button"
                    className={`btn btn-sm ${theaterMode ? 'btn-accent' : 'btn-outline'}`}
                    onClick={toggleFullscreen}
                    title="Phóng to toàn màn hình trình duyệt (Phím tắt: F hoặc Esc)"
                  >
                    ⛶ {theaterMode ? 'Thu nhỏ' : 'Toàn màn hình'}
                  </button>
                </div>
              </div>

              {/* TILESET PALETTE TOOLBAR (KHI BẬT CÔNG CỤ VẼ GẠCH) */}
              {(activeTool === 'paint-tile' || activeTool === 'erase-tile' || activeTool === 'line-tile' || activeTool === 'rect-tile' || activeTool === 'platform-tile' || activeTool === 'fill-tile' || activeTool === 'pipette-tile') && (
                <div className="active-tileset-bar">
                  <div className="tileset-bar-header">
                    <div className="tileset-tools-group">
                      <label className="toolbar-label" htmlFor="tileset-select">Bộ TileSet:</label>
                      <select
                        id="tileset-select"
                        className="tileset-select-input"
                        value={currentMap.tileId || 1}
                        onChange={(e) => {
                          const newTid = Number(e.target.value);
                          setCurrentMap((prev) => ({ ...prev, tileId: newTid }));
                        }}
                        title="Chọn bộ TileSet (1 đến 42) theo data/tile"
                      >
                        {KNOWN_TILE_SETS.map((t) => (
                          <option key={t.id} value={t.id}>
                            TileSet #{t.id} - {t.name} ({t.tiles} ô)
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        className={`btn-tool ${activeTool === 'paint-tile' ? 'active' : ''}`}
                        onClick={() => setActiveTool('paint-tile')}
                        title="Bút vẽ gạch tự do (Phím tắt: B)"
                      >
                        🖌️ Bút Vẽ
                      </button>
                      <button
                        type="button"
                        className={`btn-tool ${activeTool === 'erase-tile' ? 'active' : ''}`}
                        onClick={() => setActiveTool('erase-tile')}
                        title="Tẩy gạch (Phím tắt: E hoặc Chuột phải)"
                      >
                        🧹 Tẩy Gạch
                      </button>
                      <button
                        type="button"
                        className={`btn-tool ${activeTool === 'line-tile' ? 'active' : ''}`}
                        onClick={() => setActiveTool('line-tile')}
                        title="Kéo vẽ đường thẳng / mặt đất dốc (Phím tắt: L)"
                      >
                        📏 Kẻ Đường
                      </button>
                      <button
                        type="button"
                        className={`btn-tool ${activeTool === 'rect-tile' ? 'active' : ''}`}
                        onClick={() => setActiveTool('rect-tile')}
                        title="Kéo vẽ khối chữ nhật / vách đất (Phím tắt: R)"
                      >
                        ⬛ Khối Hộp
                      </button>
                      <button
                        type="button"
                        className={`btn-tool ${activeTool === 'platform-tile' ? 'active' : ''}`}
                        onClick={() => setActiveTool('platform-tile')}
                        title="Kéo 1 đường ngang tạo đảo bay / sàn đứng có nóc và thân (Phím tắt: P)"
                      >
                        🏝️ Đảo Bay/Sàn
                      </button>
                      <button
                        type="button"
                        className={`btn-tool ${activeTool === 'fill-tile' ? 'active' : ''}`}
                        onClick={() => setActiveTool('fill-tile')}
                        title="Đổ đầy vùng gạch liên thông (Phím tắt: G)"
                      >
                        🪣 Đổ Đầy
                      </button>
                      <button
                        type="button"
                        className={`btn-tool ${activeTool === 'pipette-tile' ? 'active' : ''}`}
                        onClick={() => setActiveTool('pipette-tile')}
                        title="Hút mẫu gạch từ bản đồ (Phím tắt: I)"
                      >
                        💧 Hút Gạch
                      </button>

                      {/* BRUSH SIZE SELECTOR */}
                      <div className="brush-size-group" title="Kích thước đầu cọ vẽ / tẩy (Phím 1, 2, 3, 4, 5)">
                        <span className="toolbar-label">Cỡ cọ:</span>
                        {[1, 2, 3, 4, 5].map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            className={`brush-size-btn ${brushSize === sz ? 'active' : ''}`}
                            onClick={() => setBrushSize(sz)}
                          >
                            {sz}x
                          </button>
                        ))}
                      </div>

                      {/* RECT MODE SELECTOR */}
                      {activeTool === 'rect-tile' && (
                        <div className="rect-mode-group">
                          <span className="toolbar-label">Kiểu hộp:</span>
                          <button
                            type="button"
                            className={`brush-size-btn ${rectMode === 'filled' ? 'active' : ''}`}
                            onClick={() => setRectMode('filled')}
                          >
                            Đặc
                          </button>
                          <button
                            type="button"
                            className={`brush-size-btn ${rectMode === 'hollow' ? 'active' : ''}`}
                            onClick={() => setRectMode('hollow')}
                          >
                            Viền
                          </button>
                        </div>
                      )}

                      {/* PLATFORM THICKNESS SELECTOR */}
                      {activeTool === 'platform-tile' && (
                        <div className="platform-thick-group">
                          <span className="toolbar-label">Độ dày sàn:</span>
                          {[1, 2, 3].map((tk) => (
                            <button
                              key={tk}
                              type="button"
                              className={`brush-size-btn ${platformThickness === tk ? 'active' : ''}`}
                              onClick={() => setPlatformThickness(tk)}
                            >
                              {tk} tầng
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        className="btn-tool btn-auto-tile"
                        onClick={handleAutoTileCurrentMap}
                        title="Tự động nhận diện cạnh, gọt góc, bo viền trái/phải/dưới chuẩn đẹp cho địa hình"
                      >
                        🪄 Tự Động Gọt Viền (Auto-Tile)
                      </button>
                      <button
                        type="button"
                        className="btn-tool"
                        onClick={handleClearAllTerrain}
                        title="Xóa sạch toàn bộ gạch trên bản đồ này"
                      >
                        🗑️ Xóa Sạch Gạch
                      </button>
                      <button
                        type="button"
                        className="btn-tool btn-change-tileset"
                        onClick={() => setShowTileCatalogModal(true)}
                        title="Xem và đổi bộ gạch từ thư viện 42 Set Gạch"
                        style={{ background: 'linear-gradient(135deg, #0284c7, #2563eb)', color: '#fff', fontWeight: 'bold' }}
                      >
                        🎨 Đổi Set Gạch (Set #{currentMap?.tileId || 1})
                      </button>
                    </div>

                    <div className="tileset-tools-group">
                      <span className="toolbar-label">Đang chọn:</span>
                      <div
                        className={`tile-palette-swatch active ${selectedTileIndex === 0 ? 'swatch-empty' : ''}`}
                        style={{ width: '30px', height: '30px' }}
                      >
                        {selectedTileIndex === 0 ? (
                          <span>✕</span>
                        ) : (
                          <div
                            className="tile-swatch-canvas-preview"
                            style={{
                              backgroundImage: `url(/api/v1/assets/tile-set/${currentMap.tileId || 1}.png?v=3)`,
                              backgroundPosition: `0 -${(selectedTileIndex - 1) * 24}px`,
                            }}
                          />
                        )}
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#38bdf8' }}>
                        #{selectedTileIndex} ({
                          selectedTileIndex === 0
                            ? 'Ô Rỗng'
                            : (currentMap.tileId === 1
                                ? (selectedTileIndex >= 4 && selectedTileIndex <= 7 ? `Khúc Cây #${selectedTileIndex}`
                                  : selectedTileIndex >= 8 && selectedTileIndex <= 11 ? `Cầu Gỗ #${selectedTileIndex}`
                                  : selectedTileIndex === 12 ? 'Xương Hóa Thạch'
                                  : selectedTileIndex >= 13 && selectedTileIndex <= 20 ? `Khối Đất #${selectedTileIndex}`
                                  : selectedTileIndex >= 21 && selectedTileIndex <= 27 ? `Mặt Cỏ #${selectedTileIndex}`
                                  : `Gạch #${selectedTileIndex}`)
                                : currentMap.tileId === 31
                                ? (selectedTileIndex >= 1 && selectedTileIndex <= 3 ? `Mặt Cỏ Tán #${selectedTileIndex}`
                                  : selectedTileIndex >= 4 && selectedTileIndex <= 6 ? `Thân Tán #${selectedTileIndex}`
                                  : selectedTileIndex >= 7 && selectedTileIndex <= 9 ? `Lá Treo #${selectedTileIndex}`
                                  : selectedTileIndex === 30 ? `Thân Cây Khổng Lồ`
                                  : selectedTileIndex >= 31 && selectedTileIndex <= 33 ? `Đáy Tán #${selectedTileIndex}`
                                  : `Lá Decor #${selectedTileIndex}`)
                                : `Gạch #${selectedTileIndex}`)
                        })
                      </span>
                    </div>
                  </div>

                  {/* BẢNG CHỌN TOÀN BỘ CÁC Ô GẠCH TRONG TILESET */}
                  <div className="tileset-palette-scroll-box">
                    {/* Ô 0: Xóa / Không khí */}
                    <div
                      className={`tile-palette-swatch swatch-empty ${selectedTileIndex === 0 ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedTileIndex(0);
                        setActiveTool('erase-tile');
                      }}
                      title="Ô trống / Không khí (Số 0)"
                    >
                      ✕
                    </div>

                    {/* Các ô gạch từ 1 đến N */}
                    {tilePalette.map((tileIdx) => {
                      const tileName = currentMap.tileId === 1
                        ? (tileIdx >= 4 && tileIdx <= 7 ? `Khúc Gỗ Cây #${tileIdx}`
                          : tileIdx >= 8 && tileIdx <= 11 ? `Cầu Gỗ/Thang #${tileIdx}`
                          : tileIdx === 12 ? 'Xương Khủng Long #12'
                          : tileIdx >= 13 && tileIdx <= 20 ? `Khối Đất #${tileIdx}`
                          : tileIdx >= 21 && tileIdx <= 27 ? `Mặt Cỏ #${tileIdx}`
                          : `Gạch #${tileIdx}`)
                        : currentMap.tileId === 31
                        ? (tileIdx >= 1 && tileIdx <= 3 ? `Mặt Cỏ Tán #${tileIdx}`
                          : tileIdx >= 4 && tileIdx <= 6 ? `Thân Tán #${tileIdx}`
                          : tileIdx >= 7 && tileIdx <= 9 ? `Lá Treo #${tileIdx}`
                          : tileIdx === 30 ? `Thân Cây Khổng Lồ`
                          : tileIdx >= 31 && tileIdx <= 33 ? `Đáy Tán #${tileIdx}`
                          : `Lá Rừng Decor #${tileIdx}`)
                        : `Ô Gạch #${tileIdx}`;

                      return (
                        <div
                          key={tileIdx}
                          className={`tile-palette-swatch ${selectedTileIndex === tileIdx && activeTool === 'paint-tile' ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedTileIndex(tileIdx);
                            setActiveTool('paint-tile');
                          }}
                          title={`#${tileIdx}: ${tileName}`}
                        >
                          <div
                            className="tile-swatch-canvas-preview"
                            style={{
                              backgroundImage: `url(/api/v1/assets/tile-set/${currentMap.tileId || 1}.png?v=3)`,
                              backgroundPosition: `0 -${(tileIdx - 1) * 24}px`,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ACTIVE ITEM SELECTION & SIZE CONTROLS TOOLBAR */}
              {activeTool === 'add-bg-item' && (() => {
                const meta = metaOptions.itemBgTemplates?.find((b) => String(b.id) === String(selectedBgTempId));
                const imageId = meta ? meta.imageId : selectedBgTempId;
                return (
                  <div className="active-bg-tool-bar">
                    <div className="bg-tool-left">
                      <span className="tool-bar-label">Vật thể:</span>
                      <div className="selected-item-preview">
                        <img
                          src={meta?.url || `/api/v1/assets/item-bg/${imageId}.png`}
                          alt={`Item ${selectedBgTempId}`}
                          style={{
                            transform: `scale(${bgItemScale || 1}) ${bgItemFlipX ? 'scaleX(-1)' : ''}`,
                            transformOrigin: 'center center',
                          }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <strong>Mẫu #{selectedBgTempId} {meta ? `(Img:${meta.imageId} L${meta.layer})` : ''}</strong>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => setShowBgCatalogModal(true)}
                      >
                        🖼️ Đổi Mẫu (450+ Mẫu)
                      </button>
                    </div>

                    <div className="bg-tool-size-controls">
                      {/* PLACEMENT SNAP MODE TOGGLE (LƯỚI VS TỰ DO) */}
                      <div className="bg-placement-mode-toggle-group" title="Chế độ đặt vật thể: Khớp vào ô lưới 24px hoặc đặt tự do từng pixel">
                        <button
                          type="button"
                          className={`btn-placement-mode ${bgItemPlacementMode === 'grid' ? 'active' : ''}`}
                          onClick={() => setBgItemPlacementMode('grid')}
                          title="Ghim dính vào ô lưới 24px (Snap to Grid)"
                        >
                          🔲 Theo Lưới (24px)
                        </button>
                        <button
                          type="button"
                          className={`btn-placement-mode ${bgItemPlacementMode === 'free' ? 'active' : ''}`}
                          onClick={() => setBgItemPlacementMode('free')}
                          title="Đặt tự do chính xác từng Pixel (Free Pixel Placement)"
                        >
                          🎯 Tự Do (Pixel)
                        </button>
                      </div>

                      {/* PLACEMENT LAYER TOGGLE (TRÊN GẠCH VS DƯỚI GẠCH VS TIỀN CẢNH) */}
                      <div className="bg-placement-layer-group" style={{ display: 'flex', gap: '3px' }} title="Chọn tầng lớp hiển thị của vật thể khi click đặt">
                        <button
                          type="button"
                          className={`btn btn-xs ${Number(bgItemPlacementLayer) === 1 ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => setBgItemPlacementLayer(1)}
                          title="Đặt trên mặt đất gạch (L1 - Sau nhân vật)"
                        >
                          🌲 Trên gạch (L1)
                        </button>
                        <button
                          type="button"
                          className={`btn btn-xs ${Number(bgItemPlacementLayer) === 3 ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => setBgItemPlacementLayer(3)}
                          title="Lùi ra sau lớp gạch vẽ (L3 - Dưới gạch)"
                        >
                          🧱 Dưới gạch (L3)
                        </button>
                        <button
                          type="button"
                          className={`btn btn-xs ${Number(bgItemPlacementLayer) === 2 ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => setBgItemPlacementLayer(2)}
                          title="Đè lên trước cả gạch & nhân vật (L2 - Tiền cảnh)"
                        >
                          👑 Tiền cảnh (L2)
                        </button>
                        <button
                          type="button"
                          className={`btn btn-xs ${Number(bgItemPlacementLayer) === 4 ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => setBgItemPlacementLayer(4)}
                          title="Nền xa Parallax trôi theo camera (L4)"
                        >
                          🌌 Nền xa (L4)
                        </button>
                      </div>

                      {/* SCALE SLIDER & DISPLAY */}
                      <div className="bg-scale-control-group">
                        <span className="control-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Tỉ lệ:
                          <input
                            type="number"
                            min="1"
                            max="5000"
                            step="5"
                            value={Math.round((bgItemScale || 1) * 100)}
                            onChange={(e) => {
                              const p = Number(e.target.value);
                              if (p > 0) setBgItemScale(Math.round(p) / 100);
                            }}
                            className="bg-dim-input"
                            style={{ width: '56px', height: '22px', padding: '1px 4px', textAlign: 'center', fontSize: '0.78rem' }}
                          />
                          % (<strong>{(bgItemScale || 1).toFixed(2)}x</strong>)
                        </span>
                        <input
                          type="range"
                          min="0.1"
                          max="10.0"
                          step="0.05"
                          value={Math.min(10.0, Math.max(0.1, bgItemScale || 1.0))}
                          onChange={(e) => setBgItemScale(Number(e.target.value))}
                          className="bg-scale-slider"
                          title="Kéo để thu nhỏ hoặc phóng to kích thước vật thể (0.1x đến 10x hoặc nhập % tự do)"
                        />
                      </div>

                      {/* QUICK PRESETS */}
                      <div className="bg-scale-presets">
                        {[
                          { label: '0.5x', val: 0.5 },
                          { label: '1.0x', val: 1.0 },
                          { label: '2.0x', val: 2.0 },
                          { label: '3.0x', val: 3.0 },
                          { label: '5.0x', val: 5.0 },
                          { label: '8.0x', val: 8.0 },
                        ].map((pr) => (
                          <button
                            key={pr.label}
                            type="button"
                            className={`btn-scale-preset ${Math.abs((bgItemScale || 1) - pr.val) < 0.02 ? 'active' : ''}`}
                            onClick={() => setBgItemScale(pr.val)}
                          >
                            {pr.label}
                          </button>
                        ))}
                      </div>

                      {/* FLIP HORIZONTAL */}
                      <button
                        type="button"
                        className={`btn-tool-flip ${bgItemFlipX ? 'active' : ''}`}
                        onClick={() => setBgItemFlipX(!bgItemFlipX)}
                        title="Lật ngang hình ảnh vật thể (Đối xứng gương)"
                      >
                        ⇄ Lật Ngang
                      </button>

                      {/* CUSTOM PIXEL DIMENSIONS */}
                      <div className="bg-custom-px-group" title="Tùy chỉnh kích thước cố định theo Pixel (Để trống nếu dùng theo tỉ lệ %)">
                        <span className="px-dim-label">Kích thước px:</span>
                        <input
                          type="number"
                          placeholder="W (px)"
                          value={bgItemCustomWidth}
                          onChange={(e) => setBgItemCustomWidth(e.target.value)}
                          className="bg-dim-input"
                        />
                        <span>×</span>
                        <input
                          type="number"
                          placeholder="H (px)"
                          value={bgItemCustomHeight}
                          onChange={(e) => setBgItemCustomHeight(e.target.value)}
                          className="bg-dim-input"
                        />
                        {(bgItemCustomWidth || bgItemCustomHeight || bgItemScale !== 1.0 || bgItemFlipX) && (
                          <button
                            type="button"
                            className="btn-reset-dim"
                            onClick={() => {
                              setBgItemScale(1.0);
                              setBgItemCustomWidth('');
                              setBgItemCustomHeight('');
                              setBgItemFlipX(false);
                            }}
                            title="Đặt lại kích thước gốc 1.0x"
                          >
                            ↺ Đặt lại
                          </button>
                        )}
                      </div>
                    </div>

                    <span className="tool-tip-text">👉 Click vào map để đặt</span>
                  </div>
                );
              })()}

              {/* TRACE BLUEPRINT OVERLAY CONTROL BAR (LỒNG ẢNH MẪU SOI ĐỒ HỌA KHỚP LƯỚI) */}
              {(showOverlaySettings || (showOverlayImage && overlayImageUrl)) && (
                <div className="active-trace-overlay-bar">
                  <div className="overlay-bar-left">
                    <span className="overlay-bar-badge">🖼️ Lớp Soi Ảnh Mẫu (Trace Overlay):</span>

                    {!overlayImageUrl ? (
                      <div className="overlay-no-image-hint">
                        <label className="btn btn-sm btn-primary">
                          <span>📁 Chọn Ảnh Mẫu</span>
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                const r = new FileReader();
                                r.onload = (ev) => {
                                  setOverlayImageUrl(ev.target?.result);
                                  setShowOverlayImage(true);
                                  setShowOverlaySettings(true);
                                  setSuccessMsg('🖼️ Đã nạp ảnh mẫu soi đồ họa! Ảnh tự động căn khớp 100% với lưới gạch để bạn vẽ.');
                                };
                                r.readAsDataURL(f);
                              }
                            }}
                          />
                        </label>
                        <span className="overlay-paste-hint">hoặc nhấn <strong>Ctrl + V</strong> để dán ảnh chụp</span>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={`btn-overlay-toggle-eye ${showOverlayImage ? 'active' : ''}`}
                          onClick={() => setShowOverlayImage(!showOverlayImage)}
                          title={showOverlayImage ? 'Tạm ẩn ảnh mẫu' : 'Bật hiển thị ảnh mẫu'}
                        >
                          {showOverlayImage ? '👁️ Đang Hiện' : '🕶️ Đang Ẩn'}
                        </button>

                        <div className="overlay-opacity-control">
                          <span>Độ mờ: <strong>{Math.round(overlayOpacity * 100)}%</strong></span>
                          <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.05"
                            value={overlayOpacity}
                            onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                            className="overlay-slider"
                          />
                        </div>

                        <div className="overlay-layer-toggle-group">
                          <button
                            type="button"
                            className={`btn-overlay-layer ${overlayLayer === 'under' ? 'active' : ''}`}
                            onClick={() => setOverlayLayer('under')}
                            title="Đặt ảnh mẫu nằm DƯỚI gạch để vừa nhìn mẫu vừa vẽ gạch đè lên"
                          >
                            ⬇️ Dưới Gạch (Vẽ Đè Lên)
                          </button>
                          <button
                            type="button"
                            className={`btn-overlay-layer ${overlayLayer === 'over' ? 'active' : ''}`}
                            onClick={() => setOverlayLayer('over')}
                            title="Đặt ảnh mẫu MỜ ĐÈ LÊN TRÊN gạch để kiểm tra độ khớp"
                          >
                            ⬆️ Đè Lên Gạch (Soi Đối Chiếu)
                          </button>
                        </div>

                        <div className="overlay-fit-group">
                          <button
                            type="button"
                            className={`btn-overlay-fit ${overlayFitMode === 'stretch' ? 'active' : ''}`}
                            onClick={() => setOverlayFitMode('stretch')}
                            title="Kéo giãn khớp 100% kích thước bản đồ pxw x pxh"
                          >
                            📐 Khớp Lưới 100%
                          </button>
                          <button
                            type="button"
                            className={`btn-overlay-fit ${overlayFitMode === 'contain' ? 'active' : ''}`}
                            onClick={() => setOverlayFitMode('contain')}
                            title="Giữ đúng tỷ lệ ảnh gốc"
                          >
                            🖼️ Tỷ Lệ Gốc
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="overlay-bar-right">
                    {overlayImageUrl && (
                      <label className="btn btn-sm btn-outline">
                        <span>🔄 Đổi Ảnh</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              const r = new FileReader();
                              r.onload = (ev) => {
                                setOverlayImageUrl(ev.target?.result);
                                setShowOverlayImage(true);
                              };
                              r.readAsDataURL(f);
                            }
                          }}
                        />
                      </label>
                    )}
                    {overlayImageUrl && (
                      <button
                        type="button"
                        className="btn btn-sm btn-danger-outline"
                        onClick={() => {
                          setOverlayImageUrl(null);
                          setShowOverlayImage(false);
                          setShowOverlaySettings(false);
                          setSuccessMsg('Đã xóa lớp ảnh mẫu soi đồ họa.');
                        }}
                        title="Xóa lớp ảnh mẫu này"
                      >
                        ✕ Xóa Ảnh Mẫu
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-overlay-close"
                      onClick={() => setShowOverlaySettings(false)}
                      title="Thu gọn thanh cài đặt ảnh mẫu"
                    >
                      ▲
                    </button>
                  </div>
                </div>
              )}

              {/* CANVAS SCROLL WORKSPACE */}
              <div
                className="canvas-scroll-viewport"
                ref={canvasContainerRef}
                onMouseMove={handleCanvasMouseMove}
                onMouseDown={handleCanvasMouseDown}
                onMouseUp={handleCanvasMouseUp}
                onWheel={handleCanvasWheel}
                onContextMenu={(e) => e.preventDefault()}
              >
                <div
                  ref={boardRef}
                  className={`canvas-world-board ${showGrid ? 'with-grid' : ''}`}
                  style={{
                    width: `${currentMap.pxw}px`,
                    height: `${currentMap.pxh}px`,
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'top left',
                  }}
                  onClick={handleCanvasClick}
                >
                  {/* TILE MAP BACKGROUND BLUEPRINT */}
                  <div className="canvas-grid-underlay" />

                  {/* -1. MAP SCENIC BACKGROUND (PHÔNG NỀN TRỜI, MÂY, NÚI, ĐỒI b00..b14) */}
                  {showMapBackground && (
                    <div
                      className={`canvas-map-scenic-bg planet-${currentMap.planetId ?? 0}`}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        overflow: 'hidden',
                        pointerEvents: 'none',
                        zIndex: 0,
                      }}
                    >
                      {/* BẦU TRỜI & GRADIENT THEO HÀNH TINH / BỘ PHÔNG */}
                      <div
                        className="scenic-sky-gradient"
                        style={currentMap.bgId === 17 ? {
                          background: 'linear-gradient(180deg, #0d061a 0%, #1e0b36 30%, #360f42 60%, #4a154b 100%)',
                        } : (currentMap.bgId === 16 ? {
                          background: 'linear-gradient(180deg, #10002b 0%, #240046 35%, #3c096c 70%, #5a189a 100%)',
                        } : undefined)}
                      />

                      {/* MẶT TRỜI / HÀNH TINH / MẶT TRĂNG (SUN) */}
                      {bgCustomConfig.decor?.sun !== 'none' && (
                        <div
                          className="scenic-sun"
                          style={{
                            backgroundImage: bgCustomConfig.decor?.sun
                              ? `url(/api/v1/assets/bg/${bgCustomConfig.decor.sun})`
                              : `url(/api/v1/assets/bg/sun${currentMap.planetId ?? 0}.png), url(/api/v1/assets/bg/sun0.png)`,
                          }}
                        />
                      )}

                      {/* MÂY TRÔI (CLOUDS) */}
                      {bgCustomConfig.decor?.cloud !== false && (
                        <>
                          <div className="scenic-clouds layer-cloud-0" />
                          <div className="scenic-clouds layer-cloud-1" />
                        </>
                      )}

                      {/* SƯƠNG MÙ (FOG) */}
                      {bgCustomConfig.decor?.fog && (
                        <div
                          className="scenic-fog-layer"
                          style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundImage: `url(/api/v1/assets/bg/${bgCustomConfig.decor.fog})`,
                            backgroundRepeat: 'repeat-x',
                            backgroundPosition: 'bottom center',
                            opacity: 0.65,
                            zIndex: 4,
                          }}
                        />
                      )}

                      {/* THỜI TIẾT ĐẶC BIỆT (MƯA / TUYẾT / LÁ BAY / LỬA) */}
                      {bgCustomConfig.decor?.weather && (
                        <div
                          className="scenic-weather-layer"
                          style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundImage: `url(/api/v1/assets/bg/${bgCustomConfig.decor.weather})`,
                            backgroundRepeat: 'repeat',
                            opacity: 0.75,
                            zIndex: 6,
                          }}
                        />
                      )}

                      {/* CÁC LỚP PHÔNG CẢNH NỀN TỪ data/bg/b{bgId}{layer}.png */}
                      {bgLayersList.map((layerObj) => (
                        <div
                          key={`scenic-layer-${layerObj.layer}`}
                          className={`scenic-strip-layer scenic-layer-${layerObj.layer}`}
                          style={{
                            backgroundImage: `url(${layerObj.url})`,
                            height: `${layerObj.height || 100}px`,
                            bottom: `${layerObj.bottom || 0}px`,
                            zIndex: layerObj.layer + 1,
                            opacity: layerObj.opacity ?? bgOpacity,
                            backgroundSize: layerObj.isFullScale ? '100% 100%' : 'auto 100%',
                            backgroundRepeat: layerObj.isFullScale ? 'no-repeat' : 'repeat-x',
                            backgroundPosition: layerObj.isFullScale ? 'center bottom' : 'bottom left',
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* TRACE BLUEPRINT IMAGE OVERLAY (LỒNG ẢNH MẪU SOI ĐỒ HỌA KHỚP LƯỚI) */}
                  {showOverlayImage && overlayImageUrl && (
                    <div
                      className={`canvas-blueprint-trace-overlay layer-${overlayLayer}`}
                      style={{
                        position: 'absolute',
                        left: `${overlayOffsetX}px`,
                        top: `${overlayOffsetY}px`,
                        width: overlayFitMode === 'stretch' ? `${currentMap.pxw}px` : '100%',
                        height: overlayFitMode === 'stretch' ? `${currentMap.pxh}px` : '100%',
                        zIndex: overlayLayer === 'over' ? 20 : 0,
                        opacity: overlayOpacity,
                        pointerEvents: 'none',
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={overlayImageUrl}
                        alt="Trace Blueprint Overlay"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: overlayFitMode === 'stretch' ? 'fill' : (overlayFitMode === 'contain' ? 'contain' : 'none'),
                          imageRendering: 'pixelated',
                        }}
                      />
                    </div>
                  )}

                  {/* 0. TERRAIN TILES LAYER (Ma trận ô gạch từ data/map/tile_map_data) */}
                  <canvas
                    ref={terrainCanvasRef}
                    className="canvas-terrain-layer"
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      pointerEvents: 'none',
                      zIndex: 10,
                      imageRendering: 'pixelated',
                    }}
                  />

                  {/* GHOST CURSOR KHI VẼ / TẨY GẠCH */}
                  {(activeTool === 'paint-tile' || activeTool === 'erase-tile' || activeTool === 'line-tile' || activeTool === 'rect-tile' || activeTool === 'platform-tile' || activeTool === 'fill-tile' || activeTool === 'pipette-tile') && (
                    <div
                      className={`tile-brush-ghost ${activeTool === 'erase-tile' ? 'erase-mode' : ''}`}
                      style={{
                        left: `${(mousePos.tileX - Math.floor(brushSize / 2)) * 24}px`,
                        top: `${(mousePos.tileY - Math.floor(brushSize / 2)) * 24}px`,
                        width: `${brushSize * 24}px`,
                        height: `${brushSize * 24}px`,
                        backgroundImage: activeTool === 'paint-tile' && selectedTileIndex > 0 ? `url(/api/v1/assets/tile-set/${currentMap.tileId || 1}.png?v=3)` : 'none',
                        backgroundPosition: `0 -${(selectedTileIndex - 1) * 24}px`,
                        pointerEvents: 'none',
                      }}
                    />
                  )}

                  {/* SHAPE DRAWING LIVE PREVIEW GHOST OVERLAY */}
                  {isDrawingShape && dragDrawStart && (
                    <div
                      className="shape-drawing-ghost"
                      style={{
                        position: 'absolute',
                        left: `${Math.min(dragDrawStart.tileX, mousePos.tileX) * 24}px`,
                        top: `${activeTool === 'platform-tile' ? (dragDrawStart.tileY * 24) : (Math.min(dragDrawStart.tileY, mousePos.tileY) * 24)}px`,
                        width: `${(Math.abs(mousePos.tileX - dragDrawStart.tileX) + 1) * 24}px`,
                        height: `${activeTool === 'platform-tile' ? (platformThickness * 24) : ((Math.abs(mousePos.tileY - dragDrawStart.tileY) + 1) * 24)}px`,
                        pointerEvents: 'none',
                        border: '2px dashed #38bdf8',
                        backgroundColor: 'rgba(56, 189, 248, 0.25)',
                        zIndex: 25,
                      }}
                    >
                      <span className="shape-ghost-badge">
                        {activeTool === 'line-tile' ? '📏 Đường thẳng' : (activeTool === 'rect-tile' ? `⬛ Hộp (${rectMode === 'filled' ? 'Đặc' : 'Viền'})` : `🏝️ Sàn Đảo (${platformThickness} tầng)`)}
                      </span>
                    </div>
                  )}

                  {/* PLACEMENT GHOST FOR BG ITEM WITH REAL-TIME SCALING & PLACEMENT MODE */}
                  {activeTool === 'add-bg-item' && (() => {
                    const meta = metaOptions.itemBgTemplates?.find((b) => String(b.id) === String(selectedBgTempId));
                    const imageId = meta ? meta.imageId : selectedBgTempId;
                    const dx = meta ? (meta.dx || 0) : 0;
                    const dy = meta ? (meta.dy || 0) : 0;
                    let ghostLeft, ghostTop;
                    if (bgItemPlacementMode === 'free') {
                      const snapTileX = Math.max(0, Math.min((currentMap.tmw || 60) - 1, Math.round((mousePos.x - dx) / 24)));
                      const snapTileY = Math.max(0, Math.min((currentMap.tmh || 20) - 1, Math.round((mousePos.y - dy) / 24)));
                      ghostLeft = snapTileX * 24 + dx;
                      ghostTop = snapTileY * 24 + dy;
                    } else {
                      ghostLeft = mousePos.tileX * 24 + dx;
                      ghostTop = mousePos.tileY * 24 + dy;
                    }

                    return (
                      <div
                        className={`bg-item-placement-ghost mode-${bgItemPlacementMode}`}
                        style={{
                          position: 'absolute',
                          left: `${ghostLeft}px`,
                          top: `${ghostTop}px`,
                          pointerEvents: 'none',
                          opacity: 0.85,
                          zIndex: 25,
                        }}
                      >
                        <div
                          className="bg-ghost-img-wrap"
                          style={{
                            zoom: bgItemCustomWidth ? 1 : (bgItemScale || 1.0) * 0.25,
                            transform: bgItemFlipX ? 'scaleX(-1)' : 'none',
                          }}
                        >
                          <img
                            src={meta?.url || `/api/v1/assets/item-bg/${imageId}.png`}
                            alt="Placement Ghost"
                            style={{
                              width: bgItemCustomWidth ? `${bgItemCustomWidth}px` : undefined,
                              height: bgItemCustomHeight ? `${bgItemCustomHeight}px` : undefined,
                            }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                        <div className="bg-ghost-badge">
                          <span>
                            #{selectedBgTempId} • {bgItemPlacementMode === 'free' ? `🎯 Tự do (${ghostLeft}, ${ghostTop}px)` : `🔲 Lưới (${mousePos.tileX}, ${mousePos.tileY})`} • {Math.round((bgItemScale || 1) * 100)}%
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 1. BACKGROUND ITEMS (DECOR / NHÀ / CÂY) LAYER */}
                  {showBgItems && (currentMap.bgItems || []).map((it, idx) => {
                    const itemDx = it.dx || 0;
                    const itemDy = it.dy || 0;
                    const layerNum = Number(it.layer ?? 1);
                    const isLayer4 = layerNum === 4;
                    const itemPx = it.px ?? (it.x * 24 + itemDx);
                    const itemPy = it.py ?? (it.y * 24 + itemDy);

                    // Tính toán zIndex chuẩn xác: L4 nền xa & L3 dưới gạch nằm SAU gạch vẽ (zIndex < 10)
                    let computedZIndex;
                    if (layerNum === 4) {
                      computedZIndex = 4 + (idx * 0.01);
                    } else if (layerNum === 3) {
                      computedZIndex = 6 + (idx * 0.01);
                    } else if (layerNum === 2) {
                      computedZIndex = 35 + idx;
                    } else {
                      computedZIndex = 15 + idx;
                    }

                    return (
                      <div
                        key={`bg-item-${idx}`}
                        className={`canvas-bg-item-marker ${selectedBgItemIdx === idx ? 'selected' : ''} ${isLayer4 ? 'is-parallax-layer4' : ''} ${layerNum === 3 ? 'is-behind-tiles-layer3' : ''}`}
                        style={{
                          left: `${itemPx}px`,
                          top: `${itemPy}px`,
                          zIndex: computedZIndex,
                          opacity: bgOpacity,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBgItemIdx(idx);
                          setActiveTab('layout');
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setSelectedBgItemIdx(idx);
                          setDraggingItem({ type: 'bgItem', index: idx });
                        }}
                        title={`Vật thể nền Template #${it.bgTempId} (Ảnh #${it.imageId ?? it.bgTempId} • Lớp ${it.layer ?? 1} • dx:${itemDx}, dy:${itemDy})\nKích thước in-game: ${Math.round((it.scale || 1) * 100)}% (${it.width ? `W:${it.width}px ` : ''}${it.height ? `H:${it.height}px` : ''})\nÔ Tile: (${it.x}, ${it.y}) • Render In-Game: (${itemPx}, ${itemPy}px)${isLayer4 ? '\n⚠️ CẢNH BÁO: Lớp 4 (Parallax) trong game sẽ lệch +100px và trôi theo camera! Bấm vào để đổi sang Lớp 1.' : ''}`}
                      >
                        <div
                          className="bg-item-img-wrap"
                          style={{
                            zoom: it.width ? 1 : (it.scale || 1.0) * 0.25,
                            transform: it.flipX ? 'scaleX(-1)' : 'none',
                          }}
                        >
                          <img
                            src={it.imageUrl || `/api/v1/assets/item-bg/${it.imageId ?? it.bgTempId}.png`}
                            alt={`BG Item ${it.bgTempId}`}
                            draggable={false}
                            style={{
                              width: it.width ? `${it.width}px` : undefined,
                              height: it.height ? `${it.height}px` : undefined,
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                        {showLabels && (
                          <div className="bg-item-label">
                            <span>#{it.bgTempId} {isLayer4 ? '🟣 L4 (Parallax)' : `L${it.layer ?? 1}`} ({it.x}, {it.y})</span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* 2. WAYPOINTS LAYER */}
                  {showWaypoints && (currentMap.waypoints || []).map((wp, idx) => {
                    const width = Math.max(24, wp.maxX - wp.minX);
                    const height = Math.max(24, wp.maxY - wp.minY);
                    return (
                      <div
                        key={`wp-${idx}`}
                        className="canvas-waypoint-box"
                        style={{
                          left: `${wp.minX}px`,
                          top: `${wp.minY}px`,
                          width: `${width}px`,
                          height: `${height}px`,
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDraggingItem({ type: 'waypoint', index: idx });
                        }}
                        title={`Waypoint: ${wp.name} -> Map [${wp.goMap}] (Go: ${wp.goX}, ${wp.goY})\nKéo thả để di chuyển`}
                      >
                        <div className="waypoint-glow" />
                        <div className="waypoint-badge">
                          <span className="waypoint-icon">🌀</span>
                          {showLabels && <span className="waypoint-name">{wp.name || `Map ${wp.goMap}`}</span>}
                        </div>
                        <div className="waypoint-coords">({wp.minX}, {wp.minY})</div>
                      </div>
                    );
                  })}

                  {/* 3. MOBS (QUÁI) LAYER */}
                  {showMobs && (currentMap.mobs || []).map((mob, idx) => (
                    <div
                      key={`mob-${idx}`}
                      className="canvas-mob-marker"
                      style={{
                        left: `${mob.mobX}px`,
                        top: `${mob.mobY}px`,
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggingItem({ type: 'mob', index: idx });
                      }}
                      title={`Quái: ${mob.mobName || 'Mob #' + mob.mobTempId} (Lv.${mob.mobLevel}, HP: ${mob.mobHp.toLocaleString()})\nTọa độ: (${mob.mobX}, ${mob.mobY})\nKéo thả để chỉnh vị trí`}
                    >
                      <div className="mob-sprite-wrap">
                        <img
                          src={`/api/v1/assets/mob/${mob.mobTempId}.png`}
                          alt={`Mob ${mob.mobTempId}`}
                          className="mob-sprite-img"
                          draggable={false}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = e.target.parentElement.querySelector('.fallback-pin');
                            if (fallback) fallback.style.display = 'block';
                          }}
                        />
                        <div className="mob-icon-pin fallback-pin" style={{ display: 'none' }}>👾</div>
                      </div>
                      {showLabels && (
                        <div className="mob-floating-label">
                          <span className="mob-title">{mob.mobName || `Mob #${mob.mobTempId}`}</span>
                          <span className="mob-sub">Lv.{mob.mobLevel} • {mob.mobHp > 1000 ? (mob.mobHp / 1000).toFixed(0) + 'k' : mob.mobHp} HP • ⚔️ {mob.mobDame || Math.max(1, Math.round(((mob.mobHp || 100) * (mob.percentDame || 10)) / 100))} Dame</span>
                          <span className="mob-xy">({mob.mobX}, {mob.mobY})</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* 4. NPCS LAYER */}
                  {showNpcs && (currentMap.npcs || []).map((npc, idx) => (
                    <div
                      key={`npc-${idx}`}
                      className="canvas-npc-marker"
                      style={{
                        left: `${npc.npcX}px`,
                        top: `${npc.npcY}px`,
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggingItem({ type: 'npc', index: idx });
                      }}
                      title={`NPC: ${npc.npcName || 'NPC #' + npc.npcTempId} (Avatar: #${npc.avatar || 0})\nTọa độ: (${npc.npcX}, ${npc.npcY})\nKéo thả để chỉnh vị trí`}
                    >
                      <div className="npc-sprite-wrap">
                        <img
                          src={npc.avatar > 0 ? `/api/v1/assets/icons/x4/${npc.avatar}.png` : (npc.head > 0 ? `/api/v1/assets/icons/x4/${npc.head}.png` : '')}
                          alt={`NPC ${npc.npcTempId}`}
                          className="npc-sprite-img"
                          draggable={false}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = e.target.parentElement.querySelector('.fallback-pin');
                            if (fallback) fallback.style.display = 'block';
                          }}
                        />
                        <div className="npc-icon-pin fallback-pin" style={{ display: (npc.avatar > 0 || npc.head > 0) ? 'none' : 'block' }}>👤</div>
                      </div>
                      {showLabels && (
                        <div className="npc-floating-label">
                          <span className="npc-title">{npc.npcName || `NPC #${npc.npcTempId}`}</span>
                          <span className="npc-xy">({npc.npcX}, {npc.npcY})</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* 5. MAP EFFECTS (EFF_MAP) LAYER */}
                  {showEffects && (
                    <>
                      {/* AMBIENT BACKGROUND EFFECTS OVERLAY BADGES */}
                      {(currentMap.effects?.beffs || []).length > 0 && (
                        <div className="canvas-ambient-effects-badge-bar">
                          {(currentMap.effects?.beffs || []).map((b, bIdx) => {
                            const bId = Number(b.beffId ?? b.val ?? b);
                            const preset = (metaOptions.ambientEffects || []).find((p) => p.id === bId);
                            return (
                              <span key={bIdx} className="ambient-badge" title={preset?.desc || `Ambient Effect #${bId}`}>
                                <span className="badge-icon">{preset?.icon || '✨'}</span>
                                <span className="badge-text">{preset?.name || `Môi trường #${bId}`}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* POINT EFFECTS (EFF) MARKERS */}
                      {(currentMap.effects?.effs || []).map((eff, idx) => (
                        <div
                          key={`eff-${idx}`}
                          className="canvas-effect-marker"
                          style={{
                            left: `${eff.x}px`,
                            top: `${eff.y}px`,
                            zIndex: eff.layer ? (eff.layer * 2 + 1) : 3,
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setDraggingItem({ type: 'effect', index: idx });
                          }}
                          title={`Hiệu ứng: Effect #${eff.effId} (Lớp ${eff.layer || 1}, Loop: ${eff.loop ?? -1}, Delay: ${eff.delay ?? 0}ms)\nTọa độ: (${eff.x}, ${eff.y})\nKéo thả để chỉnh vị trí`}
                        >
                          <div className="effect-sprite-wrap">
                            <div className="effect-glow-ring" />
                            <img
                              src={`/api/v1/assets/effect/${eff.effId}.png`}
                              alt={`Effect ${eff.effId}`}
                              className="effect-sprite-img"
                              draggable={false}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                const fallback = e.target.parentElement.querySelector('.fallback-pin');
                                if (fallback) fallback.style.display = 'block';
                              }}
                            />
                            <div className="effect-icon-pin fallback-pin" style={{ display: 'none' }}>✨</div>
                          </div>
                          {showLabels && (
                            <div className="effect-floating-label">
                              <span className="effect-title">✨ Eff #{eff.effId} (L{eff.layer || 1})</span>
                              <span className="effect-xy">({eff.x}, {eff.y})</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* CANVAS STATUS BAR */}
              <div className="canvas-status-bar">
                <div className="status-coord-readout">
                  <span className="coord-chip">📍 Con trỏ: <strong>X={mousePos.x}, Y={mousePos.y}</strong></span>
                  <span className="coord-chip">🧱 Ô Tile: <strong>Cột={mousePos.tileX}, Hàng={mousePos.tileY}</strong></span>
                  <span className="coord-chip dim">Kích thước toàn bản đồ: {currentMap.pxw} × {currentMap.pxh} px ({currentMap.tmw} × {currentMap.tmh} ô gạch)</span>
                </div>
                <div className="status-help-tip">
                  💡 <em>Kéo thả trực tiếp mọi vật thể/quái/NPC/cổng trên bản đồ</em>
                </div>
              </div>
            </>
          )}
        </main>

        {/* PANEL C: INSPECTOR & SETUP TABS (RIGHT) */}
        {!rightInspectorCollapsed ? (
          <aside className="map-inspector">
            {currentMap && (
              <>
                {/* INSPECTOR HEADER & TABS */}
                <div className="inspector-header">
                  <div className="inspector-map-title">
                    <h2>[ID: {currentMap.id}] {currentMap.name}</h2>
                    <div className="title-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger btn-delete-map-head"
                        onClick={() => handleDeleteMap(currentMap.id, currentMap.name)}
                        title={`Xoá vĩnh viễn Bản đồ [${currentMap.id}] ${currentMap.name}`}
                      >
                        🗑️ Xoá Map
                      </button>
                      {hasUnsavedChanges && <span className="unsaved-badge">Chưa lưu</span>}
                      <button
                        type="button"
                        className="btn-collapse-inspector"
                        onClick={() => setRightInspectorCollapsed(true)}
                        title="Thu gọn bảng chỉnh sửa"
                      >
                        ▶
                      </button>
                    </div>
                  </div>

                  <div className="inspector-nav-tabs">
                    <button
                      type="button"
                      className={`tab-btn ${activeTab === 'background' ? 'active' : ''}`}
                      onClick={() => setActiveTab('background')}
                      style={{ fontWeight: 'bold', color: activeTab === 'background' ? '#38bdf8' : '#e2e8f0' }}
                    >
                      🌄 Phông Nền (Set #{currentMap.bgId ?? 0})
                    </button>
                    <button
                      type="button"
                      className={`tab-btn ${activeTab === 'layout' ? 'active' : ''}`}
                      onClick={() => setActiveTab('layout')}
                    >
                      🏛️ Vật Thể ({currentMap.bgItems?.length || 0})
                    </button>
                    <button
                      type="button"
                      className={`tab-btn ${activeTab === 'dimensions' ? 'active' : ''}`}
                      onClick={() => setActiveTab('dimensions')}
                    >
                      📐 Kích thước
                    </button>
                    <button
                      type="button"
                      className={`tab-btn ${activeTab === 'waypoints' ? 'active' : ''}`}
                      onClick={() => setActiveTab('waypoints')}
                    >
                      🌀 Cổng ({currentMap.waypoints?.length || 0})
                    </button>
                    <button
                      type="button"
                      className={`tab-btn ${activeTab === 'mobs' ? 'active' : ''}`}
                      onClick={() => setActiveTab('mobs')}
                    >
                      👾 Quái ({currentMap.mobs?.length || 0})
                    </button>
                    <button
                      type="button"
                      className={`tab-btn ${activeTab === 'drops' ? 'active' : ''}`}
                      onClick={() => setActiveTab('drops')}
                    >
                      🎁 Rơi Đồ ({currentMap.dropConfig?.items?.length || 0})
                    </button>
                    <button
                      type="button"
                      className={`tab-btn ${activeTab === 'npcs' ? 'active' : ''}`}
                      onClick={() => setActiveTab('npcs')}
                    >
                      👤 NPCs ({currentMap.npcs?.length || 0})
                    </button>
                    <button
                      type="button"
                      className={`tab-btn ${activeTab === 'effects' ? 'active' : ''}`}
                      onClick={() => setActiveTab('effects')}
                    >
                      ✨ Hiệu ứng ({(currentMap.effects?.effs?.length || 0) + (currentMap.effects?.beffs?.length || 0)})
                    </button>
                    <button
                      type="button"
                      className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
                      onClick={() => setActiveTab('general')}
                    >
                      ⚙️ Chung
                    </button>
                    <button
                      type="button"
                      className={`tab-btn ${activeTab === 'tools' ? 'active' : ''}`}
                      onClick={() => setActiveTab('tools')}
                    >
                      🛠️ Tiện ích
                    </button>
                  </div>
                </div>

                {/* INSPECTOR TAB CONTENT */}
                <div className="inspector-tab-body">
                  {/* TAB MỚI: PHÔNG NỀN BẢN ĐỒ ĐA TẦNG (DATA/BG) */}
                  {activeTab === 'background' && (
                    <div className="tab-pane background-pane" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {/* BANNER HÀNH ĐỘNG CHÍNH */}
                      <div className="layout-tool-banner" style={{
                        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(15, 23, 42, 0.8))',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: '10px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}>
                        <div className="layout-tool-info">
                          <h4 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            🌄 Phông Nền Đa Tầng (<code>data/bg</code>)
                          </h4>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                            Bầu trời, dãy núi xa, đồi cây, thảm thực vật & phụ kiện môi trường
                          </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => setShowBgSceneryCatalogModal(true)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px' }}
                          >
                            <span>🔍 Thư Viện 15+ Bộ Nền</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setUploadBgForm({
                                bgId: Math.max(17, (bgSceneryList.reduce((max, b) => Math.max(max, b.bgId), 0) + 1)),
                                name: 'Bộ Phông Nền Mới',
                                planetId: currentMap?.planetId ?? 0,
                                tag: 'Tùy Chỉnh',
                                layers: [
                                  { layer: 0, label: 'Lớp 0 (Cận cảnh / Chân đồi sát đất)', file: null, preview: '' },
                                  { layer: 1, label: 'Lớp 1 (Cảnh gần / Đồi cây)', file: null, preview: '' },
                                  { layer: 2, label: 'Lớp 2 (Cảnh trung / Dãy núi)', file: null, preview: '' },
                                  { layer: 3, label: 'Lớp 3 (Cảnh xa nhất / Chân trời)', file: null, preview: '' },
                                ],
                              });
                              setShowUploadBgModal(true);
                            }}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px' }}
                          >
                            <span>➕ Tải Lên Bộ Mới</span>
                          </button>
                        </div>
                      </div>

                      {/* CÀI ĐẶT NHANH BG ID & BG TYPE */}
                      <div style={{
                        background: 'rgba(30, 41, 59, 0.6)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}>
                        <div className="form-row" style={{ margin: 0 }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label>Background ID (bgId):</label>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <input
                                type="number"
                                min="0"
                                value={currentMap.bgId ?? 0}
                                onChange={(e) => setCurrentMap({ ...currentMap, bgId: Number(e.target.value) })}
                                className="form-input"
                              />
                              <button
                                type="button"
                                className="btn btn-sm btn-outline"
                                onClick={() => setShowBgSceneryCatalogModal(true)}
                                title="Mở danh sách chọn nhanh"
                              >
                                🔍
                              </button>
                            </div>
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label>Kiểu Cuộn (bgType):</label>
                            <select
                              value={currentMap.bgType ?? 0}
                              onChange={(e) => setCurrentMap({ ...currentMap, bgType: Number(e.target.value) })}
                              className="form-select"
                            >
                              <option value={0}>0 - Parallax Theo Camera (Mặc định)</option>
                              <option value={1}>1 - Cố Định Chân Trời (Đáy)</option>
                              <option value={2}>2 - Bản Đồ Trong Nhà / Hang Tối</option>
                              <option value={3}>3 - Không Gian Vũ Trụ</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* BẢNG ĐIỀU KHIỂN CHI TIẾT 5 LỚP LAYER */}
                      <div style={{
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '0.85rem', color: '#38bdf8' }}>
                            🎨 Tinh Chỉnh 5 Lớp Layer (Set #{currentMap.bgId ?? 0})
                          </strong>
                          <button
                            type="button"
                            className="btn btn-xs btn-outline"
                            onClick={() => {
                              setBgCustomConfig({
                                layers: {
                                  0: { enabled: true, heightScale: 1.0, bottomOffset: 0, opacity: 1.0 },
                                  1: { enabled: true, heightScale: 1.0, bottomOffset: 0, opacity: 1.0 },
                                  2: { enabled: true, heightScale: 1.0, bottomOffset: 0, opacity: 1.0 },
                                  3: { enabled: true, heightScale: 1.0, bottomOffset: 0, opacity: 1.0 },
                                  4: { enabled: true, heightScale: 1.0, bottomOffset: 0, opacity: 1.0 },
                                },
                                decor: { sun: null, cloud: true, fog: null, weather: null },
                              });
                              setSuccessMsg('Đã khôi phục cài đặt phông nền mặc định!');
                            }}
                            style={{ fontSize: '0.7rem' }}
                          >
                            🔄 Reset Mặc Định
                          </button>
                        </div>

                        <div className="bg-layers-tuning-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {[0, 1, 2, 3, 4].map((layerIdx) => {
                            const layerConfig = bgCustomConfig.layers?.[layerIdx] || { enabled: true, heightScale: 1.0, bottomOffset: 0, opacity: 1.0 };
                            const fileName = `b${currentMap.bgId ?? 0}${layerIdx}.png`;
                            const layerTitles = [
                              'Lớp 0 (Bầu trời xa nhất)',
                              'Lớp 1 (Dãy núi / Cảnh xa)',
                              'Lớp 2 (Đồi cây / Cảnh trung)',
                              'Lớp 3 (Cận cảnh / Thảm thực vật)',
                              'Lớp 4 (Tiền cảnh / Sát mặt đất)',
                            ];

                            return (
                              <div
                                key={layerIdx}
                                style={{
                                  background: layerConfig.enabled ? 'rgba(30, 41, 59, 0.7)' : 'rgba(15, 23, 42, 0.4)',
                                  border: '1px solid rgba(148, 163, 184, 0.15)',
                                  borderRadius: '6px',
                                  padding: '8px 10px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '6px',
                                  opacity: layerConfig.enabled ? 1 : 0.6,
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <input
                                      type="checkbox"
                                      checked={layerConfig.enabled !== false}
                                      onChange={(e) => {
                                        setBgCustomConfig((prev) => ({
                                          ...prev,
                                          layers: {
                                            ...prev.layers,
                                            [layerIdx]: { ...layerConfig, enabled: e.target.checked },
                                          },
                                        }));
                                      }}
                                      title="Bật/Tắt hiển thị lớp này"
                                    />
                                    <strong style={{ fontSize: '0.8rem', color: '#f8fafc' }}>
                                      {layerTitles[layerIdx]}
                                    </strong>
                                    <code style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: '3px' }}>
                                      {fileName}
                                    </code>
                                  </div>
                                  <div style={{ width: '32px', height: '20px', background: 'rgba(0,0,0,0.5)', borderRadius: '3px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <img
                                      src={`/api/v1/assets/bg/${fileName}`}
                                      alt={fileName}
                                      style={{ height: '100%', objectFit: 'cover' }}
                                      onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                  </div>
                                </div>

                                {layerConfig.enabled && (
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '2px' }}>
                                    <div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '2px' }}>
                                        <span>Cao:</span>
                                        <strong>{Math.round((layerConfig.heightScale || 1.0) * 100)}%</strong>
                                      </div>
                                      <input
                                        type="range"
                                        min="0.4"
                                        max="2.0"
                                        step="0.05"
                                        value={layerConfig.heightScale || 1.0}
                                        onChange={(e) => {
                                          const val = Number(e.target.value);
                                          setBgCustomConfig((prev) => ({
                                            ...prev,
                                            layers: {
                                              ...prev.layers,
                                              [layerIdx]: { ...layerConfig, heightScale: val },
                                            },
                                          }));
                                        }}
                                        style={{ width: '100%', height: '4px' }}
                                      />
                                    </div>

                                    <div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '2px' }}>
                                        <span>Đáy:</span>
                                        <strong>{layerConfig.bottomOffset || 0}px</strong>
                                      </div>
                                      <input
                                        type="range"
                                        min="-60"
                                        max="150"
                                        step="5"
                                        value={layerConfig.bottomOffset || 0}
                                        onChange={(e) => {
                                          const val = Number(e.target.value);
                                          setBgCustomConfig((prev) => ({
                                            ...prev,
                                            layers: {
                                              ...prev.layers,
                                              [layerIdx]: { ...layerConfig, bottomOffset: val },
                                            },
                                          }));
                                        }}
                                        style={{ width: '100%', height: '4px' }}
                                      />
                                    </div>

                                    <div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '2px' }}>
                                        <span>Mờ:</span>
                                        <strong>{Math.round((layerConfig.opacity ?? 1.0) * 100)}%</strong>
                                      </div>
                                      <input
                                        type="range"
                                        min="0.1"
                                        max="1.0"
                                        step="0.05"
                                        value={layerConfig.opacity ?? 1.0}
                                        onChange={(e) => {
                                          const val = Number(e.target.value);
                                          setBgCustomConfig((prev) => ({
                                            ...prev,
                                            layers: {
                                              ...prev.layers,
                                              [layerIdx]: { ...layerConfig, opacity: val },
                                            },
                                          }));
                                        }}
                                        style={{ width: '100%', height: '4px' }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* PHỤ KIỆN MÔI TRƯỜNG NỀN (ATMOSPHERE FX & BEFF) */}
                        {(() => {
                          const beffs = currentMap?.effects?.beffs || [];
                          const hasCloud = beffs.some((b) => Number(b.beffId ?? b.val ?? b) === 13);
                          const hasFog = beffs.some((b) => Number(b.beffId ?? b.val ?? b) === 14);
                          const weatherBeff = beffs.find((b) => [0, 12, 11, 1, 2, 5, 6, 7, 15, 4, 9, 10, 3, 8].includes(Number(b.beffId ?? b.val ?? b)));
                          const weatherId = weatherBeff ? Number(weatherBeff.beffId ?? weatherBeff.val ?? weatherBeff) : null;
                          let currentVal = '';
                          if (weatherId === 0 || weatherId === 12) currentVal = 'mua.png';
                          else if (weatherId === 11) currentVal = 'tuyet.png';
                          else if ([1, 2, 5, 6, 7].includes(weatherId)) currentVal = 'lacay.png';
                          else if (weatherId === 15) currentVal = 'hoadao';
                          else if (weatherId === 4) currentVal = 'sao.png';
                          else if (weatherId === 9 || weatherId === 10) currentVal = 'fire1.png';
                          else if (weatherId === 3) currentVal = 'samchep';
                          else if (weatherId === 8) currentVal = 'phithuyen';

                          return (
                            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(148, 163, 184, 0.15)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <strong style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>
                                  🌤️ Phụ Kiện Môi Trường Nền (Atmosphere FX):
                                </strong>
                                <span style={{ fontSize: '0.68rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                                  ⚡ Ghi vào eff_map
                                </span>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                  <label style={{ fontSize: '0.72rem' }}>☀️ Mặt Trời / Hành Tinh:</label>
                                  <select
                                    value={bgCustomConfig.decor?.sun ?? ''}
                                    onChange={(e) => {
                                      const val = e.target.value || null;
                                      setBgCustomConfig((prev) => ({
                                        ...prev,
                                        decor: { ...prev.decor, sun: val },
                                      }));
                                    }}
                                    className="form-select form-select-sm"
                                  >
                                    <option value="">(Tự động theo bgId)</option>
                                    <option value="none">❌ Không hiển thị</option>
                                    {Array.from({ length: 16 }, (_, i) => `sun${i}.png`).map((s) => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                </div>

                                <div className="form-group" style={{ margin: 0 }}>
                                  <label style={{ fontSize: '0.72rem' }}>☁️ Mây Trôi Bầu Trời (beff 13):</label>
                                  <select
                                    value={hasCloud ? 'true' : 'false'}
                                    onChange={(e) => handleSetAtmosphereCloud(e.target.value === 'true')}
                                    className="form-select form-select-sm"
                                  >
                                    <option value="true">🟢 Bật mây trôi (beff 13)</option>
                                    <option value="false">❌ Tắt mây trôi</option>
                                  </select>
                                </div>

                                <div className="form-group" style={{ margin: 0 }}>
                                  <label style={{ fontSize: '0.72rem' }}>🌫️ Dải Sương Mù (beff 14):</label>
                                  <select
                                    value={hasFog ? 'fog0.png' : ''}
                                    onChange={(e) => handleSetAtmosphereFog(e.target.value)}
                                    className="form-select form-select-sm"
                                  >
                                    <option value="">❌ Không có sương mù</option>
                                    <option value="fog0.png">🌫️ Sương mù mờ ảo (beff 14)</option>
                                  </select>
                                </div>

                                <div className="form-group" style={{ margin: 0 }}>
                                  <label style={{ fontSize: '0.72rem' }}>❄️ Thời Tiết / Rơi Rụng (beff):</label>
                                  <select
                                    value={currentVal}
                                    onChange={(e) => handleSetAtmosphereWeather(e.target.value)}
                                    className="form-select form-select-sm"
                                  >
                                    <option value="">❌ Không có</option>
                                    <option value="mua.png">🌧️ Mưa rơi ngoài trời (beff 0)</option>
                                    <option value="tuyet.png">❄️ Tuyết rơi rải rác (beff 11)</option>
                                    <option value="lacay.png">🍂 Lá cây bay lượn (beff 1)</option>
                                    <option value="hoadao">🌸 Cánh hoa đào bay (beff 15)</option>
                                    <option value="sao.png">✨ Bầu trời ngàn sao (beff 4)</option>
                                    <option value="fire1.png">🌟 Đom đóm / Đốm sáng (beff 9)</option>
                                    <option value="samchep">⚡ Sấm chớp rạch trời (beff 3)</option>
                                    <option value="phithuyen">🚀 Phi thuyền bay ngang (beff 8)</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* TAB: BỐ CỤC VẬT THỂ NỀN (LAYOUT & ITEM_BG_TEMP) */}
                  {activeTab === 'layout' && (
                    <div className="tab-pane layout-pane">
                      <div className="layout-tool-banner">
                        <div className="layout-tool-info">
                          <h4>🎨 Kho Vật Thể & Phong Cảnh Nền ({metaOptions.itemBgTemplates?.length || 600}+ Mẫu)</h4>
                          <p>Bố cục nhà cửa, cây cối, ngọn núi xa, mây trời từ <code>item_bg_temp</code> (tự động đồng bộ vào game)</p>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => setShowCloneBgItemsModal(true)}
                            title="Sao chép toàn bộ phong cảnh vật thể từ một map khác sang map này"
                          >
                            📋 Sao Chép Cảnh...
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => setShowBgCatalogModal(true)}
                          >
                            🖼️ Kho Ảnh & Tải Lên
                          </button>
                        </div>
                      </div>

                      <div className="pane-header-actions">
                        <h3>Vật Thể Đã Đặt ({currentMap.bgItems?.length || 0})</h3>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => {
                            const meta = metaOptions.itemBgTemplates?.find((b) => String(b.id) === String(selectedBgTempId));
                            const imageId = meta ? meta.imageId : Number(selectedBgTempId);
                            const layer = meta ? meta.layer : 1;
                            const dx = meta ? meta.dx : 0;
                            const dy = meta ? meta.dy : 0;
                            const newBgItems = [...(currentMap.bgItems || []), {
                              id: Date.now(),
                              bgTempId: Number(selectedBgTempId),
                              imageId,
                              layer,
                              dx,
                              dy,
                              x: 10,
                              y: 10,
                              px: 240 + dx,
                              py: 240 + dy,
                              imageUrl: meta ? meta.url : `/api/v1/assets/item-bg/${imageId}.png`,
                            }];
                            setCurrentMap({ ...currentMap, bgItems: newBgItems });
                          }}
                        >
                          ➕ Thêm #{selectedBgTempId}
                        </button>
                      </div>

                      <div className="items-accordion-list bg-items-list">
                        {(currentMap.bgItems || []).map((it, idx) => (
                          <div key={idx} className="item-card-editor bg-item-card">
                            <div className="bg-item-header">
                              <span className="item-index">#{idx + 1}</span>
                              <div className="bg-item-thumb">
                                <img
                                  src={it.imageUrl || `/api/v1/assets/item-bg/${it.imageId ?? it.bgTempId}.png`}
                                  alt={`Item ${it.bgTempId}`}
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              </div>
                              <div className="bg-item-inputs">
                                <label>Mẫu #{it.bgTempId} {it.layer ? `(Lớp ${it.layer})` : ''}:</label>
                                <input
                                  type="text"
                                  value={it.bgTempId}
                                  onChange={(e) => {
                                    const updated = [...currentMap.bgItems];
                                    const tempId = e.target.value;
                                    const meta = metaOptions.itemBgTemplates?.find((b) => String(b.id) === String(tempId));
                                    updated[idx] = {
                                      ...updated[idx],
                                      bgTempId: tempId,
                                      imageId: meta ? meta.imageId : tempId,
                                      layer: meta ? meta.layer : 1,
                                      dx: meta ? meta.dx : 0,
                                      dy: meta ? meta.dy : 0,
                                      imageUrl: meta ? meta.url : `/api/v1/assets/item-bg/${tempId}.png`,
                                    };
                                    setCurrentMap({ ...currentMap, bgItems: updated });
                                  }}
                                  className="item-id-input"
                                  title="Template ID trong bg_item_template"
                                />
                              </div>
                              <button
                                type="button"
                                className="btn-item-delete"
                                onClick={() => {
                                  const updated = currentMap.bgItems.filter((_, i) => i !== idx);
                                  setCurrentMap({ ...currentMap, bgItems: updated });
                                }}
                                title="Xoá vật thể này"
                              >
                                ✕
                              </button>
                            </div>

                            <div className="form-row">
                              <div className="form-group">
                                <label>Cột Tile (X):</label>
                                <input
                                  type="number"
                                  value={it.x}
                                  onChange={(e) => {
                                    const updated = [...currentMap.bgItems];
                                    const tileX = Number(e.target.value);
                                    updated[idx] = { ...updated[idx], x: tileX, px: tileX * 24 + (updated[idx].dx || 0) };
                                    setCurrentMap({ ...currentMap, bgItems: updated });
                                  }}
                                  className="form-input"
                                />
                              </div>
                              <div className="form-group">
                                <label>Hàng Tile (Y):</label>
                                <input
                                  type="number"
                                  value={it.y}
                                  onChange={(e) => {
                                    const updated = [...currentMap.bgItems];
                                    const tileY = Number(e.target.value);
                                    updated[idx] = { ...updated[idx], y: tileY, py: tileY * 24 + (updated[idx].dy || 0) };
                                    setCurrentMap({ ...currentMap, bgItems: updated });
                                  }}
                                  className="form-input"
                                />
                              </div>
                              <div className="form-group">
                                <label>Pixel X (px):</label>
                                <input
                                  type="number"
                                  value={it.px ?? (it.x * 24 + (it.dx || 0))}
                                  onChange={(e) => {
                                    const updated = [...currentMap.bgItems];
                                    const pX = Number(e.target.value);
                                    const dx = updated[idx].dx || 0;
                                    const newX = Math.round((pX - dx) / 24);
                                    updated[idx] = { ...updated[idx], x: newX, px: newX * 24 + dx };
                                    setCurrentMap({ ...currentMap, bgItems: updated });
                                  }}
                                  className="form-input"
                                  title="Toạ độ pixel thực tế sẽ render trong game (tự động khớp theo dx)"
                                />
                              </div>
                              <div className="form-group">
                                <label>Pixel Y (px):</label>
                                <input
                                  type="number"
                                  value={it.py ?? (it.y * 24 + (it.dy || 0))}
                                  onChange={(e) => {
                                    const updated = [...currentMap.bgItems];
                                    const pY = Number(e.target.value);
                                    const dy = updated[idx].dy || 0;
                                    const newY = Math.round((pY - dy) / 24);
                                    updated[idx] = { ...updated[idx], y: newY, py: newY * 24 + dy };
                                    setCurrentMap({ ...currentMap, bgItems: updated });
                                  }}
                                  className="form-input"
                                  title="Toạ độ pixel thực tế sẽ render trong game (tự động khớp theo dy)"
                                />
                              </div>
                              <div className="form-group">
                                <label>Lớp (Layer):</label>
                                <select
                                  value={it.layer ?? 1}
                                  onChange={(e) => switchItemLayer(idx, Number(e.target.value))}
                                  className="form-select"
                                >
                                  <option value={3}>🧱 L3 (Dưới gạch vẽ - Hậu cảnh cố định)</option>
                                  <option value={4}>🌌 L4 (Dưới gạch vẽ - Nền xa Parallax)</option>
                                  <option value={1}>🌲 L1 (Mặt đất - Đè trên gạch, sau nhân vật)</option>
                                  <option value={2}>👑 L2 (Tiền cảnh - Đè trước cả gạch & nhân vật)</option>
                                </select>
                              </div>
                            </div>

                            {Number(it.layer) === 4 && (
                              <div className="bg-layer-warning-banner">
                                <strong>⚠️ Vật thể đang ở Lớp 4 (Parallax nền xa)</strong>
                                Trong Game Client, vật thể Lớp 4 sẽ bị lệch thêm +100px toạ độ X và trôi theo góc nhìn camera.
                                <div style={{ marginTop: '4px' }}>
                                  <button
                                    type="button"
                                    className="btn-switch-layer1"
                                    onClick={() => switchItemLayer(idx, 1)}
                                  >
                                    🌲 Chuyển thành Lớp 1 (Mặt đất cố định không trôi)
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Z-ORDER LAYER & DEPTH STACKING CONTROLS */}
                            <div className="bg-item-order-controls" style={{
                              background: 'rgba(15, 23, 42, 0.75)',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              border: '1px solid rgba(148, 163, 184, 0.25)',
                              margin: '6px 0 10px',
                            }}>
                              {/* HÀNG 1: CHUYỂN TẦNG SÂU (DƯỚI GẠCH / TRÊN GẠCH / TIỀN CẢNH) */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.73rem', color: '#38bdf8', fontWeight: 600, marginRight: 'auto' }}>
                                  Tầng lớp:
                                </span>
                                {[
                                  { l: 3, label: '🧱 Dưới gạch (L3)', title: 'Lùi vật thể ra sau lớp gạch vẽ' },
                                  { l: 1, label: '🌲 Trên gạch (L1)', title: 'Đặt vật thể trên mặt gạch (Sau nhân vật)' },
                                  { l: 2, label: '👑 Tiền cảnh (L2)', title: 'Đè lên trước cả gạch & nhân vật' },
                                  { l: 4, label: '🌌 Nền xa (L4)', title: 'Nền xa Parallax trôi theo camera' },
                                ].map((btn) => (
                                  <button
                                    key={btn.l}
                                    type="button"
                                    className={`btn btn-xs ${Number(it.layer ?? 1) === btn.l ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => switchItemLayer(idx, btn.l)}
                                    title={btn.title}
                                    style={{ fontSize: '0.71rem', padding: '2px 5px' }}
                                  >
                                    {btn.label}
                                  </button>
                                ))}
                              </div>

                              {/* HÀNG 2: THỨ TỰ XẾP CHỒNG (Z-ORDER REORDERING) */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '0.73rem', color: '#94a3b8', fontWeight: 600, marginRight: 'auto' }}>
                                  Thứ tự xếp:
                                </span>
                                <button
                                  type="button"
                                  className="btn btn-xs btn-outline"
                                  disabled={idx === 0}
                                  onClick={() => {
                                    const updated = [...currentMap.bgItems];
                                    const [item] = updated.splice(idx, 1);
                                    updated.unshift(item);
                                    setCurrentMap({ ...currentMap, bgItems: updated });
                                    setSelectedBgItemIdx(0);
                                  }}
                                  title="Đưa xuống dưới cùng (Thụt ra sau tất cả vật thể khác)"
                                  style={{ fontSize: '0.71rem', padding: '2px 6px' }}
                                >
                                  🔚 Dưới cùng
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-xs btn-outline"
                                  disabled={idx === 0}
                                  onClick={() => {
                                    const updated = [...currentMap.bgItems];
                                    const temp = updated[idx];
                                    updated[idx] = updated[idx - 1];
                                    updated[idx - 1] = temp;
                                    setCurrentMap({ ...currentMap, bgItems: updated });
                                    setSelectedBgItemIdx(idx - 1);
                                  }}
                                  title="Lùi về sau 1 lớp (Thụt xuống dưới vật thể liền trước)"
                                  style={{ fontSize: '0.71rem', padding: '2px 6px' }}
                                >
                                  ⬇️ Lùi sau
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-xs btn-outline"
                                  disabled={idx === (currentMap.bgItems.length - 1)}
                                  onClick={() => {
                                    const updated = [...currentMap.bgItems];
                                    const temp = updated[idx];
                                    updated[idx] = updated[idx + 1];
                                    updated[idx + 1] = temp;
                                    setCurrentMap({ ...currentMap, bgItems: updated });
                                    setSelectedBgItemIdx(idx + 1);
                                  }}
                                  title="Tiến lên trước 1 lớp (Đè lên vật thể liền sau)"
                                  style={{ fontSize: '0.71rem', padding: '2px 6px' }}
                                >
                                  ⬆️ Tiến trước
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-xs btn-outline"
                                  disabled={idx === (currentMap.bgItems.length - 1)}
                                  onClick={() => {
                                    const updated = [...currentMap.bgItems];
                                    const [item] = updated.splice(idx, 1);
                                    updated.push(item);
                                    setCurrentMap({ ...currentMap, bgItems: updated });
                                    setSelectedBgItemIdx(updated.length - 1);
                                  }}
                                  title="Đưa lên trên cùng (Đè lên trên tất cả vật thể khác)"
                                  style={{ fontSize: '0.71rem', padding: '2px 6px' }}
                                >
                                  🔝 Trên cùng
                                </button>
                              </div>
                            </div>

                            {/* SIZE & SCALE ADJUSTMENT CONTROLS */}
                            <div className="bg-item-size-editor">
                              <div className="size-editor-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                                  🔍 Tỉ lệ:
                                  <input
                                    type="number"
                                    min="1"
                                    max="5000"
                                    step="5"
                                    value={Math.round((it.scale || 1) * 100)}
                                    onChange={(e) => {
                                      const updated = [...currentMap.bgItems];
                                      const newPercent = Number(e.target.value);
                                      if (newPercent > 0) {
                                        updated[idx] = { ...updated[idx], scale: Math.round(newPercent) / 100 };
                                        setCurrentMap({ ...currentMap, bgItems: updated });
                                      }
                                    }}
                                    className="form-input form-input-sm"
                                    style={{ width: '66px', height: '24px', padding: '2px 4px', fontSize: '0.78rem', textAlign: 'center' }}
                                  />
                                  % (<strong>{(it.scale || 1).toFixed(2)}x</strong>)
                                </label>
                                <button
                                  type="button"
                                  className={`btn-card-flip ${it.flipX ? 'active' : ''}`}
                                  onClick={() => {
                                    const updated = [...currentMap.bgItems];
                                    updated[idx] = { ...updated[idx], flipX: !updated[idx].flipX };
                                    setCurrentMap({ ...currentMap, bgItems: updated });
                                  }}
                                  title="Lật ngang (Đối xứng gương)"
                                  style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                                >
                                  ⇄ Lật ngang
                                </button>
                              </div>

                              <input
                                type="range"
                                min="0.1"
                                max="10.0"
                                step="0.05"
                                value={Math.min(10.0, Math.max(0.1, it.scale || 1.0))}
                                onChange={(e) => {
                                  const updated = [...currentMap.bgItems];
                                  updated[idx] = { ...updated[idx], scale: Number(e.target.value) };
                                  setCurrentMap({ ...currentMap, bgItems: updated });
                                }}
                                className="bg-card-scale-slider"
                                title="Kéo để thu nhỏ hoặc phóng to (0.1x đến 10x hoặc nhập % tự do)"
                              />

                              <div className="size-presets-mini-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '4px 0' }}>
                                {[0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 5.0, 8.0].map((sc) => (
                                  <button
                                    key={sc}
                                    type="button"
                                    className={`btn-size-chip ${Math.abs((it.scale || 1) - sc) < 0.02 ? 'active' : ''}`}
                                    onClick={() => {
                                      const updated = [...currentMap.bgItems];
                                      updated[idx] = { ...updated[idx], scale: sc };
                                      setCurrentMap({ ...currentMap, bgItems: updated });
                                    }}
                                  >
                                    {sc}x
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  className="btn-size-chip"
                                  onClick={() => {
                                    const updated = [...currentMap.bgItems];
                                    updated[idx] = {
                                      ...updated[idx],
                                      width: currentMap.pxw || 1440,
                                      height: currentMap.pxh || 696,
                                      x: 0,
                                      y: 0,
                                      px: 0,
                                      py: 0,
                                    };
                                    setCurrentMap({ ...currentMap, bgItems: updated });
                                  }}
                                  title="Kéo giãn kích thước vật thể bao trọn 100% diện tích bản đồ"
                                  style={{ color: '#38bdf8', fontWeight: 'bold' }}
                                >
                                  📐 Khớp Full Map ({currentMap.pxw || 1440}×{currentMap.pxh || 696})
                                </button>
                              </div>

                              <div className="custom-px-row" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                                <span className="custom-px-label" style={{ fontSize: '0.74rem' }}>Cố định px:</span>
                                <input
                                  type="number"
                                  placeholder="W"
                                  value={it.width || ''}
                                  onChange={(e) => {
                                    const updated = [...currentMap.bgItems];
                                    const val = e.target.value ? Number(e.target.value) : undefined;
                                    updated[idx] = { ...updated[idx], width: val };
                                    setCurrentMap({ ...currentMap, bgItems: updated });
                                  }}
                                  className="form-input form-input-sm"
                                  style={{ width: '58px' }}
                                  title="Chiều rộng pixel (để trống nếu dùng theo tỉ lệ %)"
                                />
                                <span>×</span>
                                <input
                                  type="number"
                                  placeholder="H"
                                  value={it.height || ''}
                                  onChange={(e) => {
                                    const updated = [...currentMap.bgItems];
                                    const val = e.target.value ? Number(e.target.value) : undefined;
                                    updated[idx] = { ...updated[idx], height: val };
                                    setCurrentMap({ ...currentMap, bgItems: updated });
                                  }}
                                  className="form-input form-input-sm"
                                  style={{ width: '58px' }}
                                  title="Chiều cao pixel (để trống nếu dùng theo tỉ lệ %)"
                                />
                                {(it.width || it.height) && (
                                  <button
                                    type="button"
                                    className="btn btn-xs btn-outline"
                                    onClick={() => {
                                      const updated = [...currentMap.bgItems];
                                      updated[idx] = { ...updated[idx], width: undefined, height: undefined };
                                      setCurrentMap({ ...currentMap, bgItems: updated });
                                    }}
                                    title="Xoá cố định px, trở về tỉ lệ %"
                                  >
                                    ↺
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline btn-dup-item"
                                  onClick={() => {
                                    const newItem = JSON.parse(JSON.stringify(it));
                                    newItem.id = Date.now();
                                    newItem.x = Math.min((currentMap.tmw || 60) - 1, (newItem.x || 0) + 2);
                                    newItem.px = newItem.x * 24 + (newItem.dx || 0);
                                    const updated = [...currentMap.bgItems, newItem];
                                    setCurrentMap({ ...currentMap, bgItems: updated });
                                    setSelectedBgItemIdx(updated.length - 1);
                                  }}
                                  title="Nhân bản vật thể này với cùng kích thước"
                                  style={{ marginLeft: 'auto' }}
                                >
                                  📋 Nhân bản
                                </button>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '6px', lineHeight: 1.4, background: 'rgba(15, 23, 42, 0.4)', padding: '4px 8px', borderRadius: '4px' }}>
                                ℹ️ <em>Game Client luôn vẽ vật thể theo kích thước gốc (1.0x) của ảnh PNG. Tỉ lệ scale/px ở đây dùng để căn chỉnh phối cảnh trong Editor.</em>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB: KÍCH THƯỚC MAP & TILE DATA */}
                  {activeTab === 'dimensions' && (
                    <div className="tab-pane dimensions-pane">
                      <div className="form-group">
                        <label>Chiều Rộng Bản Đồ (Số Cột Ô Tile):</label>
                        <input
                          type="number"
                          min="10"
                          max="250"
                          value={currentMap.tmw}
                          onChange={(e) => {
                            const tmw = Math.max(10, Number(e.target.value));
                            setCurrentMap({ ...currentMap, tmw, pxw: tmw * 24 });
                          }}
                          className="form-input"
                        />
                        <small className="help-text">Tương đương <strong>{currentMap.tmw * 24} Pixel</strong> chiều rộng</small>
                      </div>

                      <div className="form-group">
                        <label>Chiều Cao Bản Đồ (Số Hàng Ô Tile):</label>
                        <input
                          type="number"
                          min="5"
                          max="250"
                          value={currentMap.tmh}
                          onChange={(e) => {
                            const tmh = Math.max(5, Number(e.target.value));
                            setCurrentMap({ ...currentMap, tmh, pxh: tmh * 24 });
                          }}
                          className="form-input"
                        />
                        <small className="help-text">Tương đương <strong>{currentMap.tmh * 24} Pixel</strong> chiều cao</small>
                      </div>

                      <div className="map-meta-info-box">
                        <h4>💾 Lưu Trữ Dữ Liệu Tile Map</h4>
                        <p>File Nhị Phân: <code>data/map/tile_map_data/{currentMap.id}</code></p>
                        <p>Hệ thống tự động cập nhật lại ma trận binary của file này khi bạn bấm lưu.</p>
                      </div>
                    </div>
                  )}

                  {/* TAB: THÔNG TIN CHUNG */}
                  {activeTab === 'general' && (
                    <div className="tab-pane general-pane">
                      <div className="form-group">
                        <label>Tên Bản Đồ:</label>
                        <input
                          type="text"
                          value={currentMap.name || ''}
                          onChange={(e) => setCurrentMap({ ...currentMap, name: e.target.value })}
                          className="form-input"
                          placeholder={`Bản đồ ${currentMap.id}`}
                        />
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Hành Tinh:</label>
                          <select
                            value={currentMap.planetId}
                            onChange={(e) => setCurrentMap({ ...currentMap, planetId: Number(e.target.value) })}
                            className="form-select"
                          >
                            {PLANET_OPTIONS.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Loại Bản Đồ:</label>
                          <select
                            value={currentMap.type}
                            onChange={(e) => setCurrentMap({ ...currentMap, type: Number(e.target.value) })}
                            className="form-select"
                          >
                            {MAP_TYPE_OPTIONS.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Số Khu Vực (Zones):</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={currentMap.zones}
                            onChange={(e) => setCurrentMap({ ...currentMap, zones: Number(e.target.value) })}
                            className="form-input"
                          />
                        </div>

                        <div className="form-group">
                          <label>Max Người / Khu:</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={currentMap.maxPlayer}
                            onChange={(e) => setCurrentMap({ ...currentMap, maxPlayer: Number(e.target.value) })}
                            className="form-input"
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <label style={{ margin: 0 }}>Tile ID (Set Gạch):</label>
                            <button
                              type="button"
                              className="btn btn-xs btn-outline"
                              onClick={() => setShowTileCatalogModal(true)}
                              style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                            >
                              🔍 42 Set Mẫu
                            </button>
                          </div>
                          <input
                            type="number"
                            value={currentMap.tileId}
                            onChange={(e) => setCurrentMap({ ...currentMap, tileId: Number(e.target.value) })}
                            className="form-input"
                          />
                        </div>

                        <div className="form-group">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <label style={{ margin: 0 }}>Background ID (Phông Nền):</label>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                type="button"
                                className="btn btn-xs btn-outline"
                                onClick={() => setShowBgSceneryCatalogModal(true)}
                                style={{ padding: '2px 6px', fontSize: '0.72rem' }}
                                title="Xem trước và chọn từ danh sách 15+ bộ phông nền có sẵn"
                              >
                                🔍 Thư Viện
                              </button>
                              <button
                                type="button"
                                className="btn btn-xs btn-secondary"
                                onClick={() => {
                                  setUploadBgForm({
                                    bgId: Math.max(17, (bgSceneryList.reduce((max, b) => Math.max(max, b.bgId), 0) + 1)),
                                    name: 'Bộ Phông Nền Mới',
                                    planetId: currentMap.planetId ?? 0,
                                    tag: 'Tùy Chỉnh',
                                    layers: [
                                      { layer: 0, label: 'Lớp 0 (Cận cảnh / Chân đồi sát đất)', file: null, preview: '' },
                                      { layer: 1, label: 'Lớp 1 (Cảnh gần / Đồi cây)', file: null, preview: '' },
                                      { layer: 2, label: 'Lớp 2 (Cảnh trung / Dãy núi)', file: null, preview: '' },
                                      { layer: 3, label: 'Lớp 3 (Cảnh xa nhất / Chân trời)', file: null, preview: '' },
                                    ],
                                  });
                                  setShowUploadBgModal(true);
                                }}
                                style={{ padding: '2px 6px', fontSize: '0.72rem' }}
                                title="Tải ảnh lên và tạo bộ Background mới vào data/bg"
                              >
                                ➕ Thêm Mới
                              </button>
                            </div>
                          </div>
                          <input
                            type="number"
                            min="0"
                            value={currentMap.bgId}
                            onChange={(e) => setCurrentMap({ ...currentMap, bgId: Number(e.target.value) })}
                            className="form-input"
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Background Type (Kiểu Cuộn):</label>
                          <select
                            value={currentMap.bgType ?? 0}
                            onChange={(e) => setCurrentMap({ ...currentMap, bgType: Number(e.target.value) })}
                            className="form-select"
                          >
                            <option value={0}>0 - Cuộn Parallax Theo Camera (Mặc Định)</option>
                            <option value={1}>1 - Cố Định Chân Trời (Đáy Đất)</option>
                            <option value={2}>2 - Bản Đồ Trong Nhà / Hang Động (Tối)</option>
                            <option value={3}>3 - Bản Đồ Vũ Trụ / Không Trọng Lực</option>
                          </select>
                        </div>

                        <div className="form-group checkbox-group">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={currentMap.isMapDouble}
                              onChange={(e) => setCurrentMap({ ...currentMap, isMapDouble: e.target.checked })}
                            />
                            <span>Bản đồ Đôi (is_map_double)</span>
                          </label>
                        </div>
                      </div>

                      {/* NÚT BẬT / TẮT BẢNG TÙY CHỈNH BACKGROUND CHI TIẾT */}
                      <div className="bg-customizer-toggle-wrap" style={{ marginTop: '8px', marginBottom: '8px' }}>
                        <button
                          type="button"
                          className={`btn btn-sm btn-block ${showBgCustomizer ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => setShowBgCustomizer((prev) => !prev)}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px' }}
                        >
                          <span>🎛️ Tùy Chỉnh Layer & Hiệu Ứng Phông Nền</span>
                          <span>{showBgCustomizer ? '▲ Thu Gọn' : '▼ Mở Rộng'}</span>
                        </button>
                      </div>

                      {/* BẢNG TÙY CHỈNH CHI TIẾT (BACKGROUND CUSTOMIZER) */}
                      {showBgCustomizer && (
                        <div className="bg-customizer-card" style={{
                          background: 'rgba(15, 23, 42, 0.75)',
                          border: '1px solid rgba(56, 189, 248, 0.25)',
                          borderRadius: '8px',
                          padding: '12px',
                          marginBottom: '12px',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#38bdf8' }}>
                              🎨 Chi Tiết 5 Lớp Phông Nền (Set #{currentMap.bgId ?? 0})
                            </strong>
                            <button
                              type="button"
                              className="btn btn-xs btn-outline"
                              onClick={() => {
                                setBgCustomConfig({
                                  layers: {
                                    0: { enabled: true, heightScale: 1.0, bottomOffset: 0, opacity: 1.0 },
                                    1: { enabled: true, heightScale: 1.0, bottomOffset: 0, opacity: 1.0 },
                                    2: { enabled: true, heightScale: 1.0, bottomOffset: 0, opacity: 1.0 },
                                    3: { enabled: true, heightScale: 1.0, bottomOffset: 0, opacity: 1.0 },
                                    4: { enabled: true, heightScale: 1.0, bottomOffset: 0, opacity: 1.0 },
                                  },
                                  decor: { sun: null, cloud: true, fog: null, weather: null },
                                });
                                setSuccessMsg('Đã khôi phục cài đặt phông nền mặc định!');
                              }}
                              style={{ fontSize: '0.7rem' }}
                            >
                              🔄 Mặc Định
                            </button>
                          </div>

                          {/* DANH SÁCH 5 LỚP LAYER */}
                          <div className="bg-layers-tuning-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[0, 1, 2, 3, 4].map((layerIdx) => {
                              const layerConfig = bgCustomConfig.layers?.[layerIdx] || { enabled: true, heightScale: 1.0, bottomOffset: 0, opacity: 1.0 };
                              const fileName = `b${currentMap.bgId ?? 0}${layerIdx}.png`;
                              const layerTitles = [
                                'Lớp 0 (Bầu trời xa nhất)',
                                'Lớp 1 (Dãy núi / Cảnh xa)',
                                'Lớp 2 (Đồi cây / Cảnh trung)',
                                'Lớp 3 (Cận cảnh / Thảm thực vật)',
                                'Lớp 4 (Tiền cảnh / Sát mặt đất)',
                              ];

                              return (
                                <div
                                  key={layerIdx}
                                  style={{
                                    background: layerConfig.enabled ? 'rgba(30, 41, 59, 0.7)' : 'rgba(15, 23, 42, 0.4)',
                                    border: '1px solid rgba(148, 163, 184, 0.15)',
                                    borderRadius: '6px',
                                    padding: '8px 10px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    opacity: layerConfig.enabled ? 1 : 0.6,
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <input
                                        type="checkbox"
                                        checked={layerConfig.enabled !== false}
                                        onChange={(e) => {
                                          setBgCustomConfig((prev) => ({
                                            ...prev,
                                            layers: {
                                              ...prev.layers,
                                              [layerIdx]: { ...layerConfig, enabled: e.target.checked },
                                            },
                                          }));
                                        }}
                                        title="Bật/Tắt hiển thị lớp này"
                                      />
                                      <strong style={{ fontSize: '0.8rem', color: '#f8fafc' }}>
                                        {layerTitles[layerIdx]}
                                      </strong>
                                      <code style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: '3px' }}>
                                        {fileName}
                                      </code>
                                    </div>
                                    <div style={{ width: '32px', height: '20px', background: 'rgba(0,0,0,0.5)', borderRadius: '3px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <img
                                        src={`/api/v1/assets/bg/${fileName}`}
                                        alt={fileName}
                                        style={{ height: '100%', objectFit: 'cover' }}
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                      />
                                    </div>
                                  </div>

                                  {layerConfig.enabled && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '2px' }}>
                                      <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '2px' }}>
                                          <span>Cao:</span>
                                          <strong>{Math.round((layerConfig.heightScale || 1.0) * 100)}%</strong>
                                        </div>
                                        <input
                                          type="range"
                                          min="0.4"
                                          max="2.0"
                                          step="0.05"
                                          value={layerConfig.heightScale || 1.0}
                                          onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setBgCustomConfig((prev) => ({
                                              ...prev,
                                              layers: {
                                                ...prev.layers,
                                                [layerIdx]: { ...layerConfig, heightScale: val },
                                              },
                                            }));
                                          }}
                                          style={{ width: '100%', height: '4px' }}
                                        />
                                      </div>

                                      <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '2px' }}>
                                          <span>Đáy:</span>
                                          <strong>{layerConfig.bottomOffset || 0}px</strong>
                                        </div>
                                        <input
                                          type="range"
                                          min="-60"
                                          max="150"
                                          step="5"
                                          value={layerConfig.bottomOffset || 0}
                                          onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setBgCustomConfig((prev) => ({
                                              ...prev,
                                              layers: {
                                                ...prev.layers,
                                                [layerIdx]: { ...layerConfig, bottomOffset: val },
                                              },
                                            }));
                                          }}
                                          style={{ width: '100%', height: '4px' }}
                                        />
                                      </div>

                                      <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '2px' }}>
                                          <span>Mờ:</span>
                                          <strong>{Math.round((layerConfig.opacity ?? 1.0) * 100)}%</strong>
                                        </div>
                                        <input
                                          type="range"
                                          min="0.1"
                                          max="1.0"
                                          step="0.05"
                                          value={layerConfig.opacity ?? 1.0}
                                          onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setBgCustomConfig((prev) => ({
                                              ...prev,
                                              layers: {
                                                ...prev.layers,
                                                [layerIdx]: { ...layerConfig, opacity: val },
                                              },
                                            }));
                                          }}
                                          style={{ width: '100%', height: '4px' }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* BỘ CHỌN PHỤ KIỆN MÔI TRƯỜNG & KHÔNG GIAN NỀN */}
                          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(148, 163, 184, 0.15)' }}>
                            <strong style={{ fontSize: '0.8rem', color: '#e2e8f0', display: 'block', marginBottom: '8px' }}>
                              🌤️ Phụ Kiện Môi Trường Nền (Scenery Atmosphere FX):
                            </strong>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              {/* 1. Mặt trời / Hành tinh */}
                              <div className="form-group" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.72rem' }}>☀️ Mặt Trời / Hành Tinh:</label>
                                <select
                                  value={bgCustomConfig.decor?.sun ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value || null;
                                    setBgCustomConfig((prev) => ({
                                      ...prev,
                                      decor: { ...prev.decor, sun: val },
                                    }));
                                  }}
                                  className="form-select form-select-sm"
                                >
                                  <option value="">(Tự động theo Hành Tinh)</option>
                                  <option value="none">❌ Không hiển thị</option>
                                  {Array.from({ length: 16 }, (_, i) => `sun${i}.png`).map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                              </div>

                              {/* 2. Mây trôi */}
                              <div className="form-group" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.72rem' }}>☁️ Mây Trôi Bầu Trời:</label>
                                <select
                                  value={bgCustomConfig.decor?.cloud !== false ? 'true' : 'false'}
                                  onChange={(e) => {
                                    const val = e.target.value === 'true';
                                    setBgCustomConfig((prev) => ({
                                      ...prev,
                                      decor: { ...prev.decor, cloud: val },
                                    }));
                                  }}
                                  className="form-select form-select-sm"
                                >
                                  <option value="true">🟢 Bật mây trôi (cl0, cl1)</option>
                                  <option value="false">❌ Tắt mây trôi</option>
                                </select>
                              </div>

                              {/* 3. Sương mù */}
                              <div className="form-group" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.72rem' }}>🌫️ Dải Sương Mù:</label>
                                <select
                                  value={bgCustomConfig.decor?.fog ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value || null;
                                    setBgCustomConfig((prev) => ({
                                      ...prev,
                                      decor: { ...prev.decor, fog: val },
                                    }));
                                  }}
                                  className="form-select form-select-sm"
                                >
                                  <option value="">❌ Không có sương mù</option>
                                  <option value="fog0.png">🌫️ Sương mù nhẹ (fog0.png)</option>
                                  <option value="fog1.png">🌫️ Sương mù dày (fog1.png)</option>
                                </select>
                              </div>

                              {/* 4. Thời tiết đặc biệt */}
                              <div className="form-group" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.72rem' }}>❄️ Thời Tiết / Hiệu Ứng Nền:</label>
                                <select
                                  value={bgCustomConfig.decor?.weather ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value || null;
                                    setBgCustomConfig((prev) => ({
                                      ...prev,
                                      decor: { ...prev.decor, weather: val },
                                    }));
                                  }}
                                  className="form-select form-select-sm"
                                >
                                  <option value="">❌ Không có</option>
                                  <option value="mua.png">🌧️ Mưa rơi (mua.png)</option>
                                  <option value="mua1.png">🌧️ Mưa phùn (mua1.png)</option>
                                  <option value="mua2.png">🌧️ Mưa bão (mua2.png)</option>
                                  <option value="tuyet.png">❄️ Tuyết rơi (tuyet.png)</option>
                                  <option value="lacay.png">🍂 Lá cây bay (lacay.png)</option>
                                  <option value="fire1.png">🔥 Đốm lửa bay (fire1.png)</option>
                                  <option value="sao.png">✨ Bầu trời ngàn sao (sao.png)</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: CỔNG DỊCH CHUYỂN (WAYPOINTS) */}
                  {activeTab === 'waypoints' && (
                    <div className="tab-pane waypoints-pane">
                      <div className="pane-header-actions">
                        <h3>Danh Sách Cổng ({currentMap.waypoints?.length || 0})</h3>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            const targetMap = (metaOptions?.maps || []).find((m) => m.id !== currentMap.id) || { id: 0, name: 'Làng Aru' };
                            const newWps = [...(currentMap.waypoints || []), {
                              id: Date.now(),
                              name: targetMap.name,
                              minX: 0,
                              minY: 360,
                              maxX: 48,
                              maxY: 432,
                              isEnter: false,
                              isOffline: false,
                              goMap: targetMap.id,
                              goMapName: targetMap.name,
                              goX: 100,
                              goY: 384,
                            }];
                            setCurrentMap({ ...currentMap, waypoints: newWps });
                          }}
                        >
                          ➕ Thêm Cổng
                        </button>
                      </div>

                      <div className="items-accordion-list">
                        {(currentMap.waypoints || []).map((wp, idx) => (
                          <div key={idx} className="item-card-editor waypoint-item">
                            <div className="item-card-header">
                              <span className="item-index">#{idx + 1}</span>
                              <input
                                type="text"
                                value={wp.name}
                                placeholder="Tên điểm đến..."
                                onChange={(e) => {
                                  const wps = [...currentMap.waypoints];
                                  wps[idx] = { ...wps[idx], name: e.target.value };
                                  setCurrentMap({ ...currentMap, waypoints: wps });
                                }}
                                className="item-name-input"
                              />
                              <button
                                type="button"
                                className="btn-item-delete"
                                onClick={() => {
                                  const wps = currentMap.waypoints.filter((_, i) => i !== idx);
                                  setCurrentMap({ ...currentMap, waypoints: wps });
                                }}
                                title="Xoá waypoint này"
                              >
                                ✕
                              </button>
                            </div>

                            <div className="form-group">
                              <label>Bản đồ đích đến (goMap):</label>
                              <select
                                value={wp.goMap}
                                onChange={(e) => {
                                  const mapId = Number(e.target.value);
                                  const target = (metaOptions?.maps || []).find((m) => m.id === mapId);
                                  const wps = [...currentMap.waypoints];
                                  wps[idx] = {
                                    ...wps[idx],
                                    goMap: mapId,
                                    goMapName: target ? target.name : `Map ${mapId}`,
                                    name: wp.name ? wp.name : (target ? target.name : `Map ${mapId}`),
                                  };
                                  setCurrentMap({ ...currentMap, waypoints: wps });
                                }}
                                className="form-select"
                              >
                                {(metaOptions?.maps || []).map((m) => (
                                  <option key={m.id} value={m.id}>[{m.id}] {m.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="form-row-coords">
                              <div className="coord-box">
                                <label>Vùng kích hoạt (minX, minY → maxX, maxY):</label>
                                <div className="coords-quad-inputs">
                                  <input
                                    type="number"
                                    value={wp.minX}
                                    placeholder="minX"
                                    onChange={(e) => {
                                      const wps = [...currentMap.waypoints];
                                      wps[idx] = { ...wps[idx], minX: Number(e.target.value) };
                                      setCurrentMap({ ...currentMap, waypoints: wps });
                                    }}
                                  />
                                  <input
                                    type="number"
                                    value={wp.minY}
                                    placeholder="minY"
                                    onChange={(e) => {
                                      const wps = [...currentMap.waypoints];
                                      wps[idx] = { ...wps[idx], minY: Number(e.target.value) };
                                      setCurrentMap({ ...currentMap, waypoints: wps });
                                    }}
                                  />
                                  <span>→</span>
                                  <input
                                    type="number"
                                    value={wp.maxX}
                                    placeholder="maxX"
                                    onChange={(e) => {
                                      const wps = [...currentMap.waypoints];
                                      wps[idx] = { ...wps[idx], maxX: Number(e.target.value) };
                                      setCurrentMap({ ...currentMap, waypoints: wps });
                                    }}
                                  />
                                  <input
                                    type="number"
                                    value={wp.maxY}
                                    placeholder="maxY"
                                    onChange={(e) => {
                                      const wps = [...currentMap.waypoints];
                                      wps[idx] = { ...wps[idx], maxY: Number(e.target.value) };
                                      setCurrentMap({ ...currentMap, waypoints: wps });
                                    }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="form-row">
                              <div className="form-group">
                                <label>Spawn X tại Map Đích (goX):</label>
                                <input
                                  type="number"
                                  value={wp.goX}
                                  onChange={(e) => {
                                    const wps = [...currentMap.waypoints];
                                    wps[idx] = { ...wps[idx], goX: Number(e.target.value) };
                                    setCurrentMap({ ...currentMap, waypoints: wps });
                                  }}
                                  className="form-input"
                                />
                              </div>
                              <div className="form-group">
                                <label>Spawn Y tại Map Đích (goY):</label>
                                <input
                                  type="number"
                                  value={wp.goY}
                                  onChange={(e) => {
                                    const wps = [...currentMap.waypoints];
                                    wps[idx] = { ...wps[idx], goY: Number(e.target.value) };
                                    setCurrentMap({ ...currentMap, waypoints: wps });
                                  }}
                                  className="form-input"
                                />
                              </div>
                            </div>

                            <div className="form-row checkbox-row">
                              <label className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={wp.isEnter}
                                  onChange={(e) => {
                                    const wps = [...currentMap.waypoints];
                                    wps[idx] = { ...wps[idx], isEnter: e.target.checked };
                                    setCurrentMap({ ...currentMap, waypoints: wps });
                                  }}
                                />
                                <span>Phải bấm vào mới vào (isEnter)</span>
                              </label>
                              <label className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={wp.isOffline}
                                  onChange={(e) => {
                                    const wps = [...currentMap.waypoints];
                                    wps[idx] = { ...wps[idx], isOffline: e.target.checked };
                                    setCurrentMap({ ...currentMap, waypoints: wps });
                                  }}
                                />
                                <span>Map Offline</span>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB: QUÁI VẬT (MOBS) & BATCH SPAWNER */}
                  {activeTab === 'mobs' && (
                    <div className="tab-pane mobs-pane">
                      <div className="batch-mob-box">
                        <div className="batch-mob-header">
                          <h4>⚡ Rải Quái Hàng Loạt (Batch Spawner)</h4>
                        </div>
                        <div className="batch-mob-grid">
                          <div className="form-group">
                            <label>Chọn Loại Quái:</label>
                            <select
                              value={batchMobForm.mobTempId}
                              onChange={(e) => {
                                const tid = Number(e.target.value);
                                const info = (metaOptions?.mobTemplates || []).find((m) => m.id === tid);
                                const hp = info ? info.hp : batchMobForm.mobHp;
                                const pDame = info ? (info.percent_dame ?? 10) : (batchMobForm.percentDame || 10);
                                const dame = Math.max(1, Math.round((hp * pDame) / 100));
                                setBatchMobForm({
                                  ...batchMobForm,
                                  mobTempId: tid,
                                  mobHp: hp,
                                  percentDame: pDame,
                                  mobDame: dame,
                                });
                              }}
                              className="form-select"
                            >
                              {(metaOptions?.mobTemplates || []).map((m) => (
                                <option key={m.id} value={m.id}>[{m.id}] {m.name} (HP: {m.hp.toLocaleString()}, {m.percent_dame || 10}% Dame)</option>
                              ))}
                            </select>
                          </div>

                          <div className="form-group">
                            <label>Số Lượng Con:</label>
                            <input
                              type="number"
                              min="1"
                              max="30"
                              value={batchMobForm.count}
                              onChange={(e) => setBatchMobForm({ ...batchMobForm, count: Number(e.target.value) })}
                              className="form-input"
                            />
                          </div>

                          <div className="form-group">
                            <label>Cấp độ (Level):</label>
                            <input
                              type="number"
                              min="1"
                              value={batchMobForm.mobLevel}
                              onChange={(e) => setBatchMobForm({ ...batchMobForm, mobLevel: Number(e.target.value) })}
                              className="form-input"
                            />
                          </div>

                          <div className="form-group">
                            <label>Máu Quái (HP):</label>
                            <input
                              type="number"
                              min="1"
                              value={batchMobForm.mobHp}
                              onChange={(e) => {
                                const hp = Number(e.target.value);
                                const pDame = batchMobForm.percentDame || 10;
                                const dame = Math.max(1, Math.round((hp * pDame) / 100));
                                setBatchMobForm({ ...batchMobForm, mobHp: hp, mobDame: dame });
                              }}
                              className="form-input"
                            />
                          </div>

                          <div className="form-group">
                            <label>⚔️ Sát Thương (Dame):</label>
                            <input
                              type="number"
                              min="1"
                              value={batchMobForm.mobDame || Math.max(1, Math.round((batchMobForm.mobHp * (batchMobForm.percentDame || 10)) / 100))}
                              onChange={(e) => {
                                const dame = Math.max(1, Number(e.target.value));
                                const pDame = batchMobForm.mobHp > 0 ? Math.max(1, Math.round((dame / batchMobForm.mobHp) * 100)) : 10;
                                setBatchMobForm({ ...batchMobForm, mobDame: dame, percentDame: pDame });
                              }}
                              className="form-input"
                            />
                          </div>

                          <div className="form-group">
                            <label>% Sát Thương (% Dame):</label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={batchMobForm.percentDame || 10}
                              onChange={(e) => {
                                const pDame = Math.max(1, Number(e.target.value));
                                const dame = Math.max(1, Math.round((batchMobForm.mobHp * pDame) / 100));
                                setBatchMobForm({ ...batchMobForm, percentDame: pDame, mobDame: dame });
                              }}
                              className="form-input"
                            />
                          </div>

                          <div className="form-group">
                            <label>Dải Tọa độ X (Từ → Đến):</label>
                            <div className="range-inputs">
                              <input
                                type="number"
                                value={batchMobForm.minX}
                                onChange={(e) => setBatchMobForm({ ...batchMobForm, minX: Number(e.target.value) })}
                              />
                              <span>→</span>
                              <input
                                type="number"
                                value={batchMobForm.maxX}
                                onChange={(e) => setBatchMobForm({ ...batchMobForm, maxX: Number(e.target.value) })}
                              />
                            </div>
                          </div>

                          <div className="form-group">
                            <label>Tọa độ Mặt Đất (Y):</label>
                            <input
                              type="number"
                              value={batchMobForm.fixedY}
                              onChange={(e) => setBatchMobForm({ ...batchMobForm, fixedY: Number(e.target.value) })}
                              className="form-input"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn-block btn-accent"
                          onClick={handleExecuteBatchSpawner}
                        >
                          🚀 Rải đều {batchMobForm.count} quái vào bản đồ
                        </button>
                      </div>

                      <div className="pane-header-actions">
                        <h3>Danh Sách Quái ({currentMap.mobs?.length || 0})</h3>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            const defaultMob = (metaOptions?.mobTemplates && metaOptions.mobTemplates[0]) || { id: 0, name: 'Mộc nhân', hp: 100, percent_dame: 10 };
                            const hp = defaultMob.hp || 100;
                            const pDame = defaultMob.percent_dame ?? 10;
                            const dame = Math.max(1, Math.round((hp * pDame) / 100));
                            const newMobs = [...(currentMap.mobs || []), {
                              id: Date.now(),
                              mobTempId: defaultMob.id,
                              mobName: defaultMob.name,
                              mobLevel: 1,
                              mobHp: hp,
                              percentDame: pDame,
                              mobDame: dame,
                              mobX: Math.round(currentMap.pxw / 2),
                              mobY: Math.round(currentMap.pxh * 0.8),
                            }];
                            setCurrentMap({ ...currentMap, mobs: newMobs });
                          }}
                        >
                          ➕ Thêm 1 Quái
                        </button>
                      </div>

                      <div className="items-accordion-list">
                        {(currentMap.mobs || []).map((mob, idx) => (
                          <div key={idx} className="item-card-editor mob-item">
                            <div className="item-card-header">
                              <span className="item-index">#{idx + 1}</span>
                              <div className="card-sprite-thumb">
                                <img
                                  src={`/api/v1/assets/mob/${mob.mobTempId}.png`}
                                  alt={`Mob ${mob.mobTempId}`}
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              </div>
                              <select
                                value={mob.mobTempId}
                                onChange={(e) => {
                                  const tid = Number(e.target.value);
                                  const info = (metaOptions?.mobTemplates || []).find((m) => m.id === tid);
                                  const hp = info ? info.hp : mob.mobHp;
                                  const pDame = info ? (info.percent_dame ?? 10) : (mob.percentDame || 10);
                                  const dame = Math.max(1, Math.round((hp * pDame) / 100));
                                  const mobs = [...currentMap.mobs];
                                  mobs[idx] = {
                                    ...mobs[idx],
                                    mobTempId: tid,
                                    mobName: info ? info.name : `Quái #${tid}`,
                                    mobHp: hp,
                                    percentDame: pDame,
                                    mobDame: dame,
                                  };
                                  setCurrentMap({ ...currentMap, mobs });
                                }}
                                className="item-name-select"
                              >
                                {(metaOptions?.mobTemplates || []).map((m) => (
                                  <option key={m.id} value={m.id}>[{m.id}] {m.name}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="btn-item-delete"
                                onClick={() => {
                                  const mobs = currentMap.mobs.filter((_, i) => i !== idx);
                                  setCurrentMap({ ...currentMap, mobs });
                                }}
                                title="Xoá quái này"
                              >
                                ✕
                              </button>
                            </div>

                            <div className="form-row">
                              <div className="form-group">
                                <label>Cấp độ (Level):</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={mob.mobLevel}
                                  onChange={(e) => {
                                    const mobs = [...currentMap.mobs];
                                    mobs[idx] = { ...mobs[idx], mobLevel: Number(e.target.value) };
                                    setCurrentMap({ ...currentMap, mobs });
                                  }}
                                  className="form-input"
                                />
                              </div>
                              <div className="form-group">
                                <label>Máu (Max HP):</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={mob.mobHp}
                                  onChange={(e) => {
                                    const hp = Math.max(1, Number(e.target.value));
                                    const mobs = [...currentMap.mobs];
                                    const pDame = mobs[idx].percentDame || 10;
                                    const dame = Math.max(1, Math.round((hp * pDame) / 100));
                                    mobs[idx] = { ...mobs[idx], mobHp: hp, mobDame: dame };
                                    setCurrentMap({ ...currentMap, mobs });
                                  }}
                                  className="form-input"
                                />
                              </div>
                            </div>

                            <div className="form-row">
                              <div className="form-group">
                                <label>⚔️ Sát thương (Dame):</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={mob.mobDame !== undefined ? mob.mobDame : Math.max(1, Math.round(((mob.mobHp || 100) * (mob.percentDame || 10)) / 100))}
                                  onChange={(e) => {
                                    const dame = Math.max(1, Number(e.target.value));
                                    const mobs = [...currentMap.mobs];
                                    const pDame = mob.mobHp > 0 ? Math.max(1, Math.round((dame / mob.mobHp) * 100)) : (mob.percentDame || 10);
                                    mobs[idx] = { ...mobs[idx], mobDame: dame, percentDame: pDame };
                                    setCurrentMap({ ...currentMap, mobs });
                                  }}
                                  className="form-input"
                                />
                              </div>
                              <div className="form-group">
                                <label>% Sát thương (% Dame):</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="100"
                                  value={mob.percentDame !== undefined ? mob.percentDame : 10}
                                  onChange={(e) => {
                                    const pDame = Math.max(1, Number(e.target.value));
                                    const mobs = [...currentMap.mobs];
                                    const dame = Math.max(1, Math.round(((mob.mobHp || 100) * pDame) / 100));
                                    mobs[idx] = { ...mobs[idx], percentDame: pDame, mobDame: dame };
                                    setCurrentMap({ ...currentMap, mobs });
                                  }}
                                  className="form-input"
                                />
                              </div>
                            </div>

                            <div className="form-row">
                              <div className="form-group">
                                <label>Tọa độ X:</label>
                                <input
                                  type="number"
                                  value={mob.mobX}
                                  onChange={(e) => {
                                    const mobs = [...currentMap.mobs];
                                    mobs[idx] = { ...mobs[idx], mobX: Number(e.target.value) };
                                    setCurrentMap({ ...currentMap, mobs });
                                  }}
                                  className="form-input"
                                />
                              </div>
                              <div className="form-group">
                                <label>Tọa độ Y:</label>
                                <input
                                  type="number"
                                  value={mob.mobY}
                                  onChange={(e) => {
                                    const mobs = [...currentMap.mobs];
                                    mobs[idx] = { ...mobs[idx], mobY: Number(e.target.value) };
                                    setCurrentMap({ ...currentMap, mobs });
                                  }}
                                  className="form-input"
                                />
                              </div>
                            </div>

                            {/* FOOTER: CÀI ĐẶT RƠI ĐỒ RIÊNG CHO QUÁI NÀY */}
                            <div className="mob-drop-quick-footer">
                              <div className="mob-drop-summary">
                                <span className="drop-icon">🎁</span>
                                <span>
                                  {(currentMap.dropConfig?.items || []).filter((it) => it.mobTempId === mob.mobTempId || it.mobTempId === -1).length} vật phẩm rơi (Drop)
                                </span>
                              </div>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline btn-manage-mob-drops"
                                onClick={() => {
                                  setDropFilterMob(mob.mobTempId);
                                  setActiveTab('drops');
                                }}
                                title="Xem & điều chỉnh vật phẩm rơi từ loại quái này"
                              >
                                🎁 Cài Đặt Rơi Đồ
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB: CẤU HÌNH VẬT PHẨM RƠI (DROPS) */}
                  {activeTab === 'drops' && (
                    <div className="tab-pane drops-pane">
                      <div className="pane-header-actions">
                        <h3>🎁 Cấu Hình Rơi Đồ Từ Quái & Bản Đồ</h3>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleAddDropItem(dropFilterMob === 'all' ? -1 : dropFilterMob)}
                        >
                          ➕ Thêm Vật Phẩm Rơi
                        </button>
                      </div>

                      {/* MASTER DROP SYSTEM TOGGLE & GOLD / ACTIVATION CONFIG */}
                      <div className="drop-global-card">
                        <div className="drop-global-header">
                          <label className="checkbox-label font-bold">
                            <input
                              type="checkbox"
                              checked={currentMap.dropConfig?.enabled !== false}
                              onChange={(e) => updateDropConfigField('enabled', e.target.checked)}
                            />
                            <span>⚡ Bật Hệ Thống Rơi Đồ (Drop System) Cho Map Này</span>
                          </label>
                        </div>

                        <div className="drop-special-grid">
                          {/* RƠI VÀNG */}
                          <div className="drop-sub-card">
                            <div className="drop-sub-title">
                              <label className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={Boolean(currentMap.dropConfig?.goldEnabled)}
                                  onChange={(e) => updateDropConfigField('goldEnabled', e.target.checked)}
                                />
                                <strong>💰 Rơi Vàng (Gold Drop)</strong>
                              </label>
                            </div>
                            {currentMap.dropConfig?.goldEnabled && (
                              <div className="drop-sub-fields">
                                <div className="form-group">
                                  <label>Tỉ lệ rơi (%):</label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    value={currentMap.dropConfig?.goldChancePercent ?? 10}
                                    onChange={(e) => updateDropConfigField('goldChancePercent', Number(e.target.value))}
                                    className="form-input form-input-sm"
                                  />
                                </div>
                                <div className="form-group">
                                  <label>Lượng Vàng (Min → Max):</label>
                                  <div className="range-inputs">
                                    <input
                                      type="number"
                                      min="1"
                                      value={currentMap.dropConfig?.goldMin ?? 100}
                                      onChange={(e) => updateDropConfigField('goldMin', Number(e.target.value))}
                                      className="form-input form-input-sm"
                                      placeholder="Min"
                                    />
                                    <span>→</span>
                                    <input
                                      type="number"
                                      min="1"
                                      value={currentMap.dropConfig?.goldMax ?? 1000}
                                      onChange={(e) => updateDropConfigField('goldMax', Number(e.target.value))}
                                      className="form-input form-input-sm"
                                      placeholder="Max"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* RƠI TRANG BỊ KÍCH HOẠT */}
                          <div className="drop-sub-card">
                            <div className="drop-sub-title">
                              <label className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={Boolean(currentMap.dropConfig?.activationEnabled)}
                                  onChange={(e) => updateDropConfigField('activationEnabled', e.target.checked)}
                                />
                                <strong>⚡ Rơi Set Kích Hoạt (Activation)</strong>
                              </label>
                            </div>
                            {currentMap.dropConfig?.activationEnabled && (
                              <div className="drop-sub-fields">
                                <div className="form-group">
                                  <label>Tỉ lệ rơi kích hoạt (%):</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={currentMap.dropConfig?.activationChancePercent ?? 0.1}
                                    onChange={(e) => updateDropConfigField('activationChancePercent', Number(e.target.value))}
                                    className="form-input form-input-sm"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* BỘ LỌC THEO QUÁI */}
                      <div className="drop-filter-bar">
                        <span className="filter-label">Lọc theo quái:</span>
                        <button
                          type="button"
                          className={`filter-chip ${dropFilterMob === 'all' ? 'active' : ''}`}
                          onClick={() => setDropFilterMob('all')}
                        >
                          Tất cả ({currentMap.dropConfig?.items?.length || 0})
                        </button>
                        <button
                          type="button"
                          className={`filter-chip ${dropFilterMob === -1 ? 'active' : ''}`}
                          onClick={() => setDropFilterMob(-1)}
                        >
                          🌍 Toàn map ({(currentMap.dropConfig?.items || []).filter((it) => it.mobTempId === -1).length})
                        </button>
                        {uniqueMobsOnMap.map((mobTemp) => {
                          const count = (currentMap.dropConfig?.items || []).filter((it) => it.mobTempId === mobTemp.id).length;
                          return (
                            <button
                              key={mobTemp.id}
                              type="button"
                              className={`filter-chip ${dropFilterMob === mobTemp.id ? 'active' : ''}`}
                              onClick={() => setDropFilterMob(mobTemp.id)}
                            >
                              👾 [{mobTemp.id}] {mobTemp.name} ({count})
                            </button>
                          );
                        })}
                      </div>

                      {/* DANH SÁCH CÁC THẺ ITEM DROPS */}
                      <div className="items-accordion-list drop-items-list">
                        {filteredDropItems.length === 0 ? (
                          <div className="empty-drop-list">
                            <span className="empty-icon">🎁</span>
                            <p>Chưa có cấu hình vật phẩm rơi nào {dropFilterMob !== 'all' ? 'cho loại quái này' : 'trên map này'}.</p>
                            <button
                              type="button"
                              className="btn btn-sm btn-accent"
                              onClick={() => handleAddDropItem(dropFilterMob === 'all' ? -1 : dropFilterMob)}
                            >
                              ➕ Thêm Vật Phẩm Rơi Ngay
                            </button>
                          </div>
                        ) : (
                          filteredDropItems.map(({ item: dropItem, originalIndex: itemIdx }) => {
                            const itemInfo = (metaOptions.itemTemplates || []).find((it) => it.id === dropItem.tempId) || {
                              id: dropItem.tempId,
                              name: dropItem.itemName || `Vật phẩm #${dropItem.tempId}`,
                              icon_id: dropItem.iconId,
                            };
                            const iconId = itemInfo.icon_id || dropItem.iconId;

                            return (
                              <div key={itemIdx} className={`item-card-editor drop-item-card ${!dropItem.enabled ? 'disabled' : ''}`}>
                                <div className="item-card-header">
                                  <span className="item-index">#{itemIdx + 1}</span>

                                  <div
                                    className="card-sprite-thumb item-thumb"
                                    onClick={() => {
                                      setItemPickerTargetIndex(itemIdx);
                                      setShowItemCatalogModal(true);
                                    }}
                                    title="Nhấn để đổi vật phẩm từ kho"
                                  >
                                    <img
                                      src={iconId ? `/api/v1/assets/icons/${iconId}.png` : ''}
                                      alt={`Item ${dropItem.tempId}`}
                                      onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                    {!iconId && <span className="item-placeholder-icon">📦</span>}
                                  </div>

                                  <div className="drop-item-main-info">
                                    <div className="drop-item-title-row">
                                      <strong className="drop-item-name">[{dropItem.tempId}] {itemInfo.name}</strong>
                                      <button
                                        type="button"
                                        className="btn btn-xs btn-outline"
                                        onClick={() => {
                                          setItemPickerTargetIndex(itemIdx);
                                          setShowItemCatalogModal(true);
                                        }}
                                      >
                                        🔍 Đổi Item
                                      </button>
                                    </div>
                                    <span className="drop-item-sub">
                                      {dropItem.mobTempId < 0 ? '🌍 Tất cả quái trên map' : `👾 Quái: ${(metaOptions.mobTemplates || []).find((m) => m.id === dropItem.mobTempId)?.name || `Mob #${dropItem.mobTempId}`}`}
                                    </span>
                                  </div>

                                  <div className="drop-item-header-controls">
                                    <label className="switch-toggle" title="Bật/Tắt Drop này">
                                      <input
                                        type="checkbox"
                                        checked={dropItem.enabled !== false}
                                        onChange={(e) => handleUpdateDropItem(itemIdx, { enabled: e.target.checked })}
                                      />
                                      <span className="slider round"></span>
                                    </label>
                                    <button
                                      type="button"
                                      className="btn-item-delete"
                                      onClick={() => handleRemoveDropItem(itemIdx)}
                                      title="Xoá Drop này"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>

                                {/* HÀNG 1: QUÁI ÁP DỤNG & TỈ LỆ RƠI (%) */}
                                <div className="form-row">
                                  <div className="form-group">
                                    <label>🎯 Áp dụng cho Quái:</label>
                                    <select
                                      value={dropItem.mobTempId}
                                      onChange={(e) => handleUpdateDropItem(itemIdx, { mobTempId: Number(e.target.value) })}
                                      className="form-select"
                                    >
                                      <option value="-1">🌍 Tất cả quái trên bản đồ</option>
                                      {(metaOptions.mobTemplates || []).map((m) => (
                                        <option key={m.id} value={m.id}>
                                          [{m.id}] {m.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="form-group">
                                    <label>🎲 Tỉ lệ rơi (%):</label>
                                    <div className="chance-input-wrap">
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0.0001"
                                        max="100"
                                        value={dropItem.chancePercent}
                                        onChange={(e) => handleUpdateDropItem(itemIdx, { chancePercent: Math.max(0, Number(e.target.value)) })}
                                        className="form-input"
                                      />
                                      <span className="input-suffix">%</span>
                                    </div>
                                  </div>
                                </div>

                                {/* HÀNG 2: SỐ LƯỢNG RƠI & LEVEL NGƯỜI CHƠI */}
                                <div className="form-row">
                                  <div className="form-group">
                                    <label>🔢 Số lượng rơi (Min → Max):</label>
                                    <div className="range-inputs">
                                      <input
                                        type="number"
                                        min="1"
                                        value={dropItem.quantityMin || 1}
                                        onChange={(e) => {
                                          const qMin = Math.max(1, Number(e.target.value));
                                          handleUpdateDropItem(itemIdx, {
                                            quantityMin: qMin,
                                            quantityMax: Math.max(qMin, dropItem.quantityMax || qMin),
                                          });
                                        }}
                                        className="form-input"
                                        placeholder="Min"
                                      />
                                      <span>→</span>
                                      <input
                                        type="number"
                                        min="1"
                                        value={dropItem.quantityMax || 1}
                                        onChange={(e) => handleUpdateDropItem(itemIdx, { quantityMax: Math.max(1, Number(e.target.value)) })}
                                        className="form-input"
                                        placeholder="Max"
                                      />
                                    </div>
                                  </div>

                                  <div className="form-group">
                                    <label>🛡️ Cấp độ Player (Min → Max):</label>
                                    <div className="range-inputs">
                                      <input
                                        type="number"
                                        min="0"
                                        max="19"
                                        value={dropItem.playerLevelMin ?? 0}
                                        onChange={(e) => handleUpdateDropItem(itemIdx, { playerLevelMin: Math.max(0, Number(e.target.value)) })}
                                        className="form-input"
                                        placeholder="Lv 0"
                                      />
                                      <span>→</span>
                                      <input
                                        type="number"
                                        min="0"
                                        max="19"
                                        value={dropItem.playerLevelMax ?? 19}
                                        onChange={(e) => handleUpdateDropItem(itemIdx, { playerLevelMax: Math.min(19, Number(e.target.value)) })}
                                        className="form-input"
                                        placeholder="Lv 19"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* HÀNG 3: TÙY CHỈNH RẢI HÀNG DÀI (SPREAD DROP) */}
                                <div className="form-row spread-drop-row">
                                  <div className="form-group">
                                    <div className="spread-label-wrap">
                                      <label>↔️ Rải hàng dài (Số bọc Min → Max):</label>
                                      {((dropItem.spreadCountMax || 1) > 1 || (dropItem.spreadCountMin || 1) > 1) && (
                                        <span className="badge-spread-active">Đang rải</span>
                                      )}
                                    </div>
                                    <div className="range-inputs">
                                      <input
                                        type="number"
                                        min="1"
                                        value={dropItem.spreadCountMin || 1}
                                        onChange={(e) => {
                                          const sMin = Math.max(1, Number(e.target.value));
                                          handleUpdateDropItem(itemIdx, {
                                            spreadCountMin: sMin,
                                            spreadCountMax: Math.max(sMin, dropItem.spreadCountMax || sMin),
                                          });
                                        }}
                                        className="form-input"
                                        placeholder="Min bọc"
                                        title="Số lượng bọc rải tối thiểu khi rơi"
                                      />
                                      <span>→</span>
                                      <input
                                        type="number"
                                        min="1"
                                        value={dropItem.spreadCountMax || 1}
                                        onChange={(e) => handleUpdateDropItem(itemIdx, { spreadCountMax: Math.max(1, Number(e.target.value)) })}
                                        className="form-input"
                                        placeholder="Max bọc"
                                        title="Số lượng bọc rải tối đa khi rơi"
                                      />
                                    </div>
                                  </div>

                                  <div className="form-group">
                                    <label>📏 Khoảng cách rải (px):</label>
                                    <div className="distance-input-wrap">
                                      <input
                                        type="number"
                                        min="5"
                                        max="500"
                                        value={dropItem.spreadDistance ?? 25}
                                        onChange={(e) => handleUpdateDropItem(itemIdx, { spreadDistance: Math.max(5, Number(e.target.value)) })}
                                        className="form-input"
                                        placeholder="25"
                                        title="Khoảng cách pixel giữa các bọc rải trên mặt đất"
                                      />
                                      <span className="input-suffix">px</span>
                                    </div>
                                  </div>
                                </div>

                                {((dropItem.spreadCountMax || 1) > 1 || (dropItem.spreadCountMin || 1) > 1) && (
                                  <div className="spread-preview-tip">
                                    ✨ Sẽ rải <strong>{dropItem.spreadCountMin || 1}{(dropItem.spreadCountMax || 1) > (dropItem.spreadCountMin || 1) ? ` ~ ${dropItem.spreadCountMax}` : ''} bọc</strong> thành hàng dài trên sàn đất (bước {dropItem.spreadDistance ?? 25}px)
                                  </div>
                                )}

                                {/* HÀNG 4: KHUNG GIỜ RƠI ĐỒ (EVENT / GIỜ VÀNG) */}
                                <div className="form-group">
                                  <label>⏰ Khung giờ rơi đồ (Giờ bắt đầu → Kết thúc):</label>
                                  <div className="time-window-row">
                                    <input
                                      type="time"
                                      value={`${String(Math.floor((dropItem.timeStartMin ?? 0) / 60)).padStart(2, '0')}:${String((dropItem.timeStartMin ?? 0) % 60).padStart(2, '0')}`}
                                      onChange={(e) => {
                                        const [h, m] = e.target.value.split(':').map(Number);
                                        handleUpdateDropItem(itemIdx, { timeStartMin: (h * 60) + (m || 0) });
                                      }}
                                      className="form-input time-input"
                                    />
                                    <span>đến</span>
                                    <input
                                      type="time"
                                      value={`${String(Math.min(23, Math.floor((dropItem.timeEndMin ?? 1440) / 60))).padStart(2, '0')}:${String((dropItem.timeEndMin ?? 1440) % 60).padStart(2, '0')}`}
                                      onChange={(e) => {
                                        const [h, m] = e.target.value.split(':').map(Number);
                                        handleUpdateDropItem(itemIdx, { timeEndMin: (h * 60) + (m || 0) });
                                      }}
                                      className="form-input time-input"
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-outline"
                                      onClick={() => handleUpdateDropItem(itemIdx, { timeStartMin: 0, timeEndMin: 1440 })}
                                      title="Đặt lại cả ngày (00:00 -> 24:00)"
                                    >
                                      Cả ngày
                                    </button>
                                  </div>
                                </div>

                                {/* HÀNG 4: DANH SÁCH CHỈ SỐ OPTIONS CỦA VẬT PHẨM RƠI */}
                                <div className="drop-options-section">
                                  <div className="options-section-header">
                                    <span className="options-title">💎 Chỉ Số Option ({dropItem.options?.length || 0})</span>
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-secondary"
                                      onClick={() => handleAddDropOption(itemIdx)}
                                    >
                                      ➕ Thêm Option
                                    </button>
                                  </div>

                                  {(!dropItem.options || dropItem.options.length === 0) ? (
                                    <div className="no-options-tip">Không có option đặc biệt (mặc định theo item template)</div>
                                  ) : (
                                    <div className="drop-options-list">
                                      {dropItem.options.map((opt, optIdx) => (
                                        <div key={optIdx} className="drop-option-row">
                                          <select
                                            value={opt.id}
                                            onChange={(e) => handleUpdateDropOption(itemIdx, optIdx, { id: Number(e.target.value) })}
                                            className="form-select option-select"
                                          >
                                            {(metaOptions.itemOptionTemplates || []).map((o) => (
                                              <option key={o.id} value={o.id}>
                                                [{o.id}] {o.name}
                                              </option>
                                            ))}
                                          </select>
                                          <div className="option-param-wrap">
                                            <label>Giá trị (Param):</label>
                                            <input
                                              type="number"
                                              value={opt.param}
                                              onChange={(e) => handleUpdateDropOption(itemIdx, optIdx, { param: Number(e.target.value) })}
                                              className="form-input param-input"
                                            />
                                          </div>
                                          <button
                                            type="button"
                                            className="btn-opt-delete"
                                            onClick={() => handleRemoveDropOption(itemIdx, optIdx)}
                                            title="Xoá option này"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB: NPCS */}
                  {activeTab === 'npcs' && (
                    <div className="tab-pane npcs-pane">
                      <div className="pane-header-actions">
                        <h3>Danh Sách NPCs ({currentMap.npcs?.length || 0})</h3>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            const defaultNpc = (metaOptions?.npcTemplates && metaOptions.npcTemplates[0]) || { id: 0, name: 'Ông Gôhan', avatar: 349 };
                            const newNpcs = [...(currentMap.npcs || []), {
                              id: Date.now(),
                              npcTempId: defaultNpc.id,
                              npcName: defaultNpc.name,
                              avatar: defaultNpc.avatar,
                              npcX: Math.round(currentMap.pxw / 2),
                              npcY: Math.round(currentMap.pxh * 0.8),
                            }];
                            setCurrentMap({ ...currentMap, npcs: newNpcs });
                          }}
                        >
                          ➕ Thêm 1 NPC
                        </button>
                      </div>

                      <div className="items-accordion-list">
                        {(currentMap.npcs || []).map((npc, idx) => (
                          <div key={idx} className="item-card-editor npc-item">
                            <div className="item-card-header">
                              <span className="item-index">#{idx + 1}</span>
                              <div className="card-sprite-thumb">
                                <img
                                  src={npc.avatar > 0 ? `/api/v1/assets/icons/x4/${npc.avatar}.png` : (npc.head > 0 ? `/api/v1/assets/icons/x4/${npc.head}.png` : '')}
                                  alt={`NPC ${npc.npcTempId}`}
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              </div>
                              <select
                                value={npc.npcTempId}
                                onChange={(e) => {
                                  const tid = Number(e.target.value);
                                  const info = (metaOptions?.npcTemplates || []).find((n) => n.id === tid);
                                  const npcs = [...currentMap.npcs];
                                  npcs[idx] = {
                                    ...npcs[idx],
                                    npcTempId: tid,
                                    npcName: info ? info.name : `NPC #${tid}`,
                                    avatar: info ? info.avatar : 0,
                                    head: info ? info.head : 0,
                                  };
                                  setCurrentMap({ ...currentMap, npcs });
                                }}
                                className="item-name-select"
                              >
                                {(metaOptions?.npcTemplates || []).map((n) => (
                                  <option key={n.id} value={n.id}>[{n.id}] {n.name}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="btn-item-delete"
                                onClick={() => {
                                  const npcs = currentMap.npcs.filter((_, i) => i !== idx);
                                  setCurrentMap({ ...currentMap, npcs });
                                }}
                                title="Xoá NPC này"
                              >
                                ✕
                              </button>
                            </div>

                            <div className="form-row">
                              <div className="form-group">
                                <label>Tọa độ X:</label>
                                <input
                                  type="number"
                                  value={npc.npcX}
                                  onChange={(e) => {
                                    const npcs = [...currentMap.npcs];
                                    npcs[idx] = { ...npcs[idx], npcX: Number(e.target.value) };
                                    setCurrentMap({ ...currentMap, npcs });
                                  }}
                                  className="form-input"
                                />
                              </div>
                              <div className="form-group">
                                <label>Tọa độ Y:</label>
                                <input
                                  type="number"
                                  value={npc.npcY}
                                  onChange={(e) => {
                                    const npcs = [...currentMap.npcs];
                                    npcs[idx] = { ...npcs[idx], npcY: Number(e.target.value) };
                                    setCurrentMap({ ...currentMap, npcs });
                                  }}
                                  className="form-input"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB: QUẢN LÝ HIỆU ỨNG (MAP EFFECTS - EFF_MAP) */}
                  {activeTab === 'effects' && (
                    <div className="tab-pane effects-pane">
                      <div className="pane-header-actions">
                        <h3>✨ Hiệu Ứng Bản Đồ (Map Effects - <code>data/map/eff_map</code>)</h3>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleAddEffect()}
                        >
                          ➕ Thêm Hiệu Ứng Điểm (eff)
                        </button>
                      </div>

                      {/* SECTION 1: HIỆU ỨNG MÔI TRƯỜNG / THỜI TIẾT TOÀN MAP (BEFF) */}
                      <div className="effects-ambient-section">
                        <div className="section-title-wrap">
                          <h4>🌧️ Hiệu Ứng Môi Trường & Thời Tiết (<code>beff</code>)</h4>
                          <span className="section-desc">Phủ hiệu ứng hạt lên toàn bộ không gian bản đồ</span>
                        </div>

                        <div className="ambient-presets-grid">
                          {(metaOptions.ambientEffects || [
                            { id: 13, name: 'Mưa rào', icon: '🌧️', desc: 'Hạt mưa rơi' },
                            { id: 14, name: 'Lá rơi', icon: '🍂', desc: 'Lá cây bay chao liệng' },
                            { id: 15, name: 'Tuyết rơi', icon: '❄️', desc: 'Bông tuyết trắng' },
                            { id: 16, name: 'Đom đóm', icon: '✨', desc: 'Hạt sáng lấp lánh' },
                            { id: 17, name: 'Hoa đào rơi', icon: '🌸', desc: 'Cánh hoa đào bay' },
                            { id: 18, name: 'Sấm chớp', icon: '⚡', desc: 'Chớp rạch bầu trời' },
                            { id: 19, name: 'Khói sương', icon: '💨', desc: 'Sương mù ma quái' },
                          ]).map((p) => {
                            const isSelected = (currentMap.effects?.beffs || []).some(
                              (b) => Number(b.beffId ?? b.val ?? b) === p.id
                            );
                            return (
                              <button
                                key={p.id}
                                type="button"
                                className={`ambient-preset-btn ${isSelected ? 'active' : ''}`}
                                onClick={() => handleToggleAmbientEffect(p.id)}
                                title={p.desc}
                              >
                                <span className="preset-icon">{p.icon}</span>
                                <span className="preset-name">{p.name}</span>
                                <span className="preset-id">ID: {p.id}</span>
                                {isSelected && <span className="preset-check">✓</span>}
                              </button>
                            );
                          })}
                        </div>

                        {/* THÊM BEFF CUSTOM ID */}
                        <div className="ambient-custom-add-row">
                          <input
                            type="number"
                            min="1"
                            placeholder="Nhập ID hiệu ứng môi trường khác..."
                            value={customBeffInput}
                            onChange={(e) => setCustomBeffInput(e.target.value)}
                            className="form-input form-input-sm"
                          />
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => {
                              if (customBeffInput) {
                                handleToggleAmbientEffect(customBeffInput);
                                setCustomBeffInput('');
                              }
                            }}
                          >
                            ➕ Thêm ID
                          </button>
                        </div>

                        {/* DANH SÁCH CÁC BEFF ĐANG BẬT */}
                        {(currentMap.effects?.beffs || []).length > 0 && (
                          <div className="active-beff-list">
                            <span className="active-beff-label">Đang áp dụng:</span>
                            {(currentMap.effects?.beffs || []).map((b, bIdx) => {
                              const bId = Number(b.beffId ?? b.val ?? b);
                              const p = (metaOptions.ambientEffects || []).find((x) => x.id === bId);
                              return (
                                <span key={bIdx} className="active-beff-chip">
                                  <span>{p?.icon || '✨'} {p?.name || `Hiệu ứng #${bId}`} [ID: {bId}]</span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAmbientEffect(bId)}
                                    title="Tắt hiệu ứng này"
                                  >
                                    ✕
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* SECTION 2: DANH SÁCH ĐIỂM HIỆU ỨNG TẠI TỌA ĐỘ (EFF) */}
                      <div className="effects-points-section">
                        <div className="section-title-wrap">
                          <h4>📍 Điểm Hiệu Ứng Theo Vị Trí (<code>eff</code>) — {currentMap.effects?.effs?.length || 0} điểm</h4>
                          <span className="section-desc">Gán hiệu ứng động (Lửa, thác nước, luồng sáng, đốm sao...) vào tọa độ X/Y cụ thể</span>
                        </div>

                        {(!currentMap.effects?.effs || currentMap.effects.effs.length === 0) ? (
                          <div className="empty-drop-list">
                            <span className="empty-icon">✨</span>
                            <p>Bản đồ này chưa có điểm hiệu ứng (Point Effect) nào.</p>
                            <button
                              type="button"
                              className="btn btn-sm btn-accent"
                              onClick={() => handleAddEffect()}
                            >
                              ➕ Thêm Điểm Hiệu Ứng Đầu Tiên
                            </button>
                          </div>
                        ) : (
                          <div className="items-accordion-list effect-items-list">
                            {currentMap.effects.effs.map((eff, idx) => (
                              <div key={idx} className="item-card-editor effect-item-card">
                                <div className="item-card-header">
                                  <span className="item-index">#{idx + 1}</span>
                                  <div className="card-sprite-thumb effect-thumb">
                                    <img
                                      src={`/api/v1/assets/effect/${eff.effId}.png`}
                                      alt={`Effect ${eff.effId}`}
                                      onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                    <span className="fallback-eff-icon">✨</span>
                                  </div>

                                  <div className="effect-id-input-wrap">
                                    <label>Effect ID:</label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={eff.effId}
                                      onChange={(e) => handleUpdateEffect(idx, { effId: Number(e.target.value) })}
                                      className="form-input form-input-sm eff-id-input"
                                    />
                                  </div>

                                  <div className="item-card-actions">
                                    <button
                                      type="button"
                                      className="btn-item-action"
                                      onClick={() => handleDuplicateEffect(idx)}
                                      title="Nhân bản hiệu ứng này"
                                    >
                                      📋
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-item-delete"
                                      onClick={() => handleDeleteEffect(idx)}
                                      title="Xoá hiệu ứng này"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>

                                <div className="form-row">
                                  <div className="form-group">
                                    <label>Lớp Hiển Thị (Layer):</label>
                                    <select
                                      value={eff.layer || 1}
                                      onChange={(e) => handleUpdateEffect(idx, { layer: Number(e.target.value) })}
                                      className="form-select"
                                    >
                                      <option value={1}>Lớp 1 (Phía sau nhân vật / Dưới đất)</option>
                                      <option value={2}>Lớp 2 (Cùng tầng nhân vật)</option>
                                      <option value={3}>Lớp 3 (Phía trước nhân vật / Trên trời)</option>
                                    </select>
                                  </div>

                                  <div className="form-group">
                                    <label>Lặp Lại (Loop):</label>
                                    <select
                                      value={eff.loop !== undefined ? eff.loop : -1}
                                      onChange={(e) => handleUpdateEffect(idx, { loop: Number(e.target.value) })}
                                      className="form-select"
                                    >
                                      <option value={-1}>-1 (Lặp vô hạn / Vĩnh cửu)</option>
                                      <option value={1}>1 lần</option>
                                      <option value={2}>2 lần</option>
                                      <option value={3}>3 lần</option>
                                      <option value={5}>5 lần</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="form-row">
                                  <div className="form-group">
                                    <label>Tọa độ X (px):</label>
                                    <input
                                      type="number"
                                      value={eff.x}
                                      onChange={(e) => handleUpdateEffect(idx, { x: Number(e.target.value) })}
                                      className="form-input"
                                    />
                                  </div>
                                  <div className="form-group">
                                    <label>Tọa độ Y (px):</label>
                                    <input
                                      type="number"
                                      value={eff.y}
                                      onChange={(e) => handleUpdateEffect(idx, { y: Number(e.target.value) })}
                                      className="form-input"
                                    />
                                  </div>
                                </div>

                                <div className="form-row">
                                  <div className="form-group">
                                    <label>Độ trễ lặp (Delay ms):</label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="10"
                                      value={eff.delay || 0}
                                      onChange={(e) => handleUpdateEffect(idx, { delay: Number(e.target.value) })}
                                      className="form-input"
                                      placeholder="0"
                                    />
                                  </div>
                                  <div className="form-group">
                                    <label>Thông số mở rộng (Extra):</label>
                                    <input
                                      type="text"
                                      value={eff.extra || ''}
                                      onChange={(e) => handleUpdateEffect(idx, { extra: e.target.value })}
                                      className="form-input"
                                      placeholder="VD: 0.55.90"
                                    />
                                  </div>
                                </div>

                                <div className="effect-card-footer">
                                  <span className="effect-status-chip">
                                    📍 Vị trí: ({eff.x}, {eff.y}) • Lớp {eff.layer || 1}
                                  </span>
                                  <span className="effect-drag-hint">
                                    💡 Kéo thả trực tiếp trên bản đồ
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB: TIỆN ÍCH & XUẤT SQL */}
                  {activeTab === 'tools' && (
                    <div className="tab-pane tools-pane">
                      <div className="tool-card">
                        <h4>📋 Xuất Câu Lệnh SQL</h4>
                        <p>Xuất câu lệnh `INSERT ... ON DUPLICATE KEY UPDATE` cho bản đồ này để backup hoặc dán vào MySQL.</p>
                        <button
                          type="button"
                          className="btn btn-outline btn-block"
                          onClick={handleExportSql}
                        >
                          📄 Xuất SQL cho Map [{currentMap.id}]
                        </button>
                      </div>

                      <div className="tool-card">
                        <h4>📑 Nhân Bản Map (Clone)</h4>
                        <p>Tạo một bản sao cấu hình của map này (kèm cả file nhị phân layout và tile map) sang một ID mới.</p>
                        <button
                          type="button"
                          className="btn btn-outline btn-block"
                          onClick={() => {
                            setNewMapForm({
                              id: (maps.reduce((max, m) => Math.max(max, m.id), 0) + 1).toString(),
                              name: `${currentMap.name} (Copy)`,
                              planetId: currentMap.planetId,
                              type: currentMap.type,
                              cloneFromId: currentMap.id.toString(),
                            });
                            setShowNewMapModal(true);
                          }}
                        >
                          🧬 Nhân bản sang Map ID mới
                        </button>
                      </div>

                      <div className="tool-card danger">
                        <h4>⚠️ Xoá Bản Đồ</h4>
                        <p>Xoá vĩnh viễn cấu hình Map này khỏi bảng `map_template` và file binary `item_bg_map_data`.</p>
                        <button
                          type="button"
                          className="btn btn-danger btn-block"
                          onClick={handleDeleteMap}
                        >
                          🗑️ Xoá Map [{currentMap.id}] {currentMap.name}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* INSPECTOR FOOTER SAVE & DELETE ACTION */}
                <div className="inspector-footer">
                  <button
                    type="button"
                    className="btn btn-danger btn-delete-footer"
                    onClick={() => handleDeleteMap(currentMap.id, currentMap.name)}
                    disabled={saving}
                    title={`Xoá vĩnh viễn bản đồ [${currentMap.id}] ${currentMap.name}`}
                  >
                    🗑️ Xoá Map
                  </button>
                  <div className="footer-right-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="x4-sync-indicator" title="Mặc định sử dụng độ phân giải X4 Master UHD (96x96px) và tự động đồng bộ xuống X3 (72px), X2 (48px), X1 (24px)" style={{ fontSize: '11px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>🎯</span>
                      <span>X4 Master Sync</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => {
                        if (originalMap) {
                          setCurrentMap(JSON.parse(JSON.stringify(originalMap)));
                          setSuccessMsg('Đã khôi phục cấu hình chưa lưu');
                        }
                      }}
                      disabled={!hasUnsavedChanges || saving}
                    >
                      Khôi phục
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSaveMap}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <span className="ui-spinner sm" /> Đang lưu & đồng bộ X4→X1...
                        </>
                      ) : (
                        <>
                          💾 Lưu Thay Đổi Map (X4 UHD)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </aside>
        ) : (
          <div className="collapsed-bar right-bar" onClick={() => setRightInspectorCollapsed(false)} title="Mở bảng chỉnh sửa">
            <span>◀ Bảng Chỉnh Sửa Thuộc Tính</span>
          </div>
        )}
      </div>

      {/* MODAL: THƯ VIỆN 450+ ẢNH VẬT THỂ NỀN (ITEM_BG_TEMP PALETTE CATALOG) */}
      {showBgCatalogModal && (
        <div className="modal-overlay" onClick={() => setShowBgCatalogModal(false)}>
          <div className="modal-box catalog-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🖼️ Kho Ảnh Vật Thể Bố Cục Nền (<code>data/item_bg_temp</code>)</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={() => setShowUploadItemBgModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  📤 Tải Lên Mẫu Mới
                </button>
                <button type="button" className="modal-close" onClick={() => setShowBgCatalogModal(false)}>×</button>
              </div>
            </div>
            <div className="catalog-search-bar">
              <input
                type="text"
                placeholder="🔍 Tìm kiếm mẫu vật thể theo ID (vd: 0, 1, 89, 100, 350)..."
                value={bgSearchText}
                onChange={(e) => setBgSearchText(e.target.value)}
                className="catalog-search-input"
                autoFocus
              />
              <span className="catalog-count-badge">Tổng {filteredBgTemplates.length} mẫu</span>
            </div>

            <div className="catalog-layer-filter-tabs">
              <button
                type="button"
                className={`catalog-layer-tab-btn ${catalogLayerFilter === 'all' ? 'active' : ''}`}
                onClick={() => setCatalogLayerFilter('all')}
              >
                Tất cả mẫu ({metaOptions.itemBgTemplates?.length || 0})
              </button>
              <button
                type="button"
                className={`catalog-layer-tab-btn ${catalogLayerFilter === 'ground' ? 'active' : ''}`}
                onClick={() => setCatalogLayerFilter('ground')}
              >
                🟢 L1/L2 Mặt đất cố định (Khuyên dùng)
              </button>
              <button
                type="button"
                className={`catalog-layer-tab-btn ${catalogLayerFilter === 'parallax' ? 'active' : ''}`}
                onClick={() => setCatalogLayerFilter('parallax')}
              >
                🟣 L4 Cuộn cảnh xa (Parallax)
              </button>
            </div>

            <div className="modal-body catalog-grid-body">
              <div className="catalog-items-grid">
                {filteredBgTemplates.map((t) => {
                  const isSelected = String(selectedBgTempId) === String(t.id);
                  const isL4 = Number(t.layer) === 4;
                  return (
                    <div
                      key={t.id}
                      className={`catalog-card ${isSelected ? 'selected' : ''} ${isL4 ? 'is-l4-card' : ''}`}
                      onClick={() => {
                        setSelectedBgTempId(t.id);
                        setActiveTool('add-bg-item');
                        setShowBgCatalogModal(false);
                      }}
                      title={`Mẫu Template ID: ${t.id}\nẢnh: ${t.imageId ?? t.id}.png\nLớp: ${isL4 ? 'L4 (Parallax cuộn xa theo camera)' : `L${t.layer ?? 1} (Mặt đất cố định)`}\nĐộ lệch: dx=${t.dx ?? 0}, dy=${t.dy ?? 0}\nClick để ghim lên bản đồ`}
                    >
                      <div className="catalog-card-img-wrap">
                        <img
                          src={t.url}
                          alt={`Template ${t.id}`}
                          loading="lazy"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                      <div className="catalog-card-meta">
                        <strong className="catalog-card-id">#{t.id}</strong>
                        {t.imageId !== undefined && (
                          <span className={`catalog-card-sub ${isL4 ? 'text-purple' : 'text-cyan'}`}>
                            {isL4 ? '🟣 L4' : `🟢 L${t.layer || 1}`} Img:{t.imageId}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={() => setShowBgCatalogModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TẢI LÊN MẪU VẬT THỂ / PHONG CẢNH NỀN MỚI (ITEM_BG_TEMP UPLOAD) */}
      {showUploadItemBgModal && (
        <div className="modal-overlay" onClick={() => !isUploadingItemBg && setShowUploadItemBgModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                📤 Tải Lên Vật Thể / Nền Mới (<code>item_bg_temp</code>)
              </h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => !isUploadingItemBg && setShowUploadItemBgModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleUploadItemBg}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', padding: '10px 12px', fontSize: '0.82rem', color: '#93c5fd' }}>
                  💡 <strong>Đặc điểm:</strong> Ảnh tải lên đây sẽ được lưu vào <code>data/item_bg_temp/x4/</code> và Server sẽ <strong>tự động truyền file ảnh qua mạng</strong> tới Client game (gói tin -32) khi người chơi vào map!
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                    Chọn file ảnh PNG:
                  </label>
                  <input
                    type="file"
                    accept="image/png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          setUploadItemBgForm((prev) => ({
                            ...prev,
                            imageBase64: reader.result,
                            previewUrl: reader.result,
                          }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="form-input"
                    required
                  />
                </div>

                {uploadItemBgForm.previewUrl && (
                  <div style={{
                    maxHeight: '160px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    borderRadius: '6px',
                    border: '1px dashed rgba(148, 163, 184, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px',
                  }}>
                    <img
                      src={uploadItemBgForm.previewUrl}
                      alt="Preview"
                      style={{ maxHeight: '140px', maxWidth: '100%', objectFit: 'contain' }}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                    Tầng hiển thị (Layer):
                  </label>
                  <select
                    value={uploadItemBgForm.layer}
                    onChange={(e) => setUploadItemBgForm((prev) => ({ ...prev, layer: Number(e.target.value) }))}
                    className="form-select"
                  >
                    <option value={4}>🟣 Lớp 4 (Parallax - Cuộn cảnh xa theo camera: Bầu trời, Ngọn núi, Mây)</option>
                    <option value={3}>🔵 Lớp 3 (Hậu cảnh xa: Đền đài, Lâu đài xa)</option>
                    <option value={1}>🟢 Lớp 1 (Mặt đất cố định: Nhà cửa, Cây cối, Cột đá - Sau nhân vật)</option>
                    <option value={2}>🟡 Lớp 2 (Tiền cảnh: Bụi cỏ, Cổng vòm - Trước mặt nhân vật)</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Độ lệch ngang (dx):</label>
                    <input
                      type="number"
                      value={uploadItemBgForm.dx}
                      onChange={(e) => setUploadItemBgForm((prev) => ({ ...prev, dx: Number(e.target.value) }))}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Độ lệch dọc (dy):</label>
                    <input
                      type="number"
                      value={uploadItemBgForm.dy}
                      onChange={(e) => setUploadItemBgForm((prev) => ({ ...prev, dy: Number(e.target.value) }))}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => !isUploadingItemBg && setShowUploadItemBgModal(false)}
                  disabled={isUploadingItemBg}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUploadingItemBg || !uploadItemBgForm.imageBase64}
                >
                  {isUploadingItemBg ? '⏳ Đang tải lên...' : '🚀 Tải Lên & Đăng Ký Vào Game'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SAO CHÉP BỐ CỤC NỀN TỪ MAP KHÁC (CLONE BG ITEMS) */}
      {showCloneBgItemsModal && (
        <div className="modal-overlay" onClick={() => !isCloningBgItems && setShowCloneBgItemsModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                📋 Sao Chép Bố Cục Nền Từ Bản Đồ Khác
              </h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => !isCloningBgItems && setShowCloneBgItemsModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
                Hệ thống sẽ lấy toàn bộ danh sách cây cối, nhà cửa, ngọn núi từ bản đồ được chọn và áp dụng vào bản đồ hiện tại (<strong>#{currentMap?.id} - {currentMap?.name}</strong>).
              </p>
              <div className="form-group">
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Chọn bản đồ nguồn:
                </label>
                <select
                  value={cloneSourceMapId}
                  onChange={(e) => setCloneSourceMapId(e.target.value)}
                  className="form-select"
                >
                  <option value="">-- Chọn bản đồ mẫu --</option>
                  {(maps || []).map((m) => (
                    <option key={m.id} value={m.id}>
                      #{m.id} - {m.name} ({m.bgItemCount || 0} vật thể)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => !isCloningBgItems && setShowCloneBgItemsModal(false)}
                disabled={isCloningBgItems}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={handleCloneBgItems}
                disabled={isCloningBgItems || !cloneSourceMapId}
              >
                {isCloningBgItems ? '⏳ Đang sao chép...' : '✨ Áp Dụng Sao Chép'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: THƯ VIỆN 42 BỘ GẠCH TILESET (1..42) */}
      {showTileCatalogModal && (
        <div className="modal-overlay" onClick={() => setShowTileCatalogModal(false)}>
          <div className="modal-box catalog-modal tileset-catalog-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '960px', maxHeight: '88vh' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🎨 Thư Viện 42 Bộ Gạch Địa Hình (<code>data/tile</code>)
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                  Chọn bộ gạch để áp dụng vào bản đồ hiện tại (Set đang dùng: <strong>Set #{currentMap?.tileId || 1}</strong>)
                </p>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowTileCatalogModal(false)}>×</button>
            </div>

            <div className="catalog-search-bar">
              <input
                type="text"
                placeholder="🔍 Tìm theo ID hoặc tên (vd: 41, 42, mái ngói, thác nước, rừng, namec, xayda)..."
                value={tileCatalogSearch}
                onChange={(e) => setTileCatalogSearch(e.target.value)}
                className="catalog-search-input"
                autoFocus
              />
              <span className="catalog-count-badge">Tổng 42 Bộ Gạch</span>
            </div>

            <div className="modal-body catalog-grid-body" style={{ maxHeight: '62vh' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                {KNOWN_TILE_SETS.filter((t) => {
                  if (!tileCatalogSearch.trim()) return true;
                  const q = tileCatalogSearch.trim().toLowerCase();
                  return String(t.id).includes(q)
                    || t.name.toLowerCase().includes(q)
                    || t.desc.toLowerCase().includes(q)
                    || t.tag.toLowerCase().includes(q);
                }).map((t) => {
                  const isCurrent = Number(currentMap?.tileId || 1) === t.id;
                  return (
                    <div
                      key={t.id}
                      className={`tileset-catalog-card ${isCurrent ? 'selected' : ''}`}
                      onClick={() => {
                        if (currentMap) {
                          setCurrentMap({ ...currentMap, tileId: t.id });
                        }
                        setShowTileCatalogModal(false);
                        setSuccessMsg(`✨ Đã chuyển sang Set Gạch #${t.id}: ${t.name} (${t.tiles} ô gạch)!`);
                      }}
                      style={{
                        background: isCurrent ? 'rgba(14, 165, 233, 0.15)' : 'rgba(15, 23, 42, 0.75)',
                        border: isCurrent ? '2px solid #38bdf8' : '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: '10px',
                        padding: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: isCurrent ? '#0284c7' : '#334155',
                            color: '#fff',
                          }}>
                            #{t.id}
                          </span>
                          <strong style={{ fontSize: '0.9rem', color: '#f8fafc' }}>{t.name}</strong>
                        </div>
                        <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 'bold' }}>
                          {t.tiles} ô gạch
                        </span>
                      </div>

                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', lineHeight: '1.3' }}>
                        {t.desc}
                      </p>

                      {/* Mini preview strip of first 8 tiles */}
                      <div style={{
                        display: 'flex',
                        gap: '3px',
                        background: 'rgba(0, 0, 0, 0.4)',
                        padding: '6px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        alignItems: 'center',
                      }}>
                        {Array.from({ length: Math.min(8, t.tiles) }, (_, i) => i + 1).map((tileNum) => (
                          <div
                            key={tileNum}
                            style={{
                              width: '24px',
                              height: '24px',
                              flexShrink: 0,
                              backgroundImage: `url(/api/v1/assets/tile-set/${t.id}.png?v=4)`,
                              backgroundPosition: `0 -${(tileNum - 1) * 24}px`,
                              backgroundRepeat: 'no-repeat',
                              borderRadius: '2px',
                              border: '1px solid rgba(255,255,255,0.1)',
                            }}
                            title={`Tile #${tileNum}`}
                          />
                        ))}
                        {t.tiles > 8 && (
                          <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '4px' }}>
                            +{t.tiles - 8}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: isCurrent ? '#38bdf8' : '#60a5fa' }}>
                          {isCurrent ? '✓ Đang Sử Dụng' : '👉 Chọn Set Này'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={() => setShowTileCatalogModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: THƯ VIỆN PHÔNG NỀN ĐA TẦNG (BACKGROUND SCENERY CATALOG) */}
      {showBgSceneryCatalogModal && (
        <div className="modal-overlay" onClick={() => setShowBgSceneryCatalogModal(false)}>
          <div className="modal-box catalog-modal bg-scenery-catalog-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1080px', maxHeight: '90vh' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🖼️ Thư Viện Phông Nền Đa Tầng (<code>data/bg</code>)
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                    Xem trước và áp dụng bộ phông nền cho Map đang mở (Đang dùng: <strong>Set #{currentMap?.bgId ?? 0}</strong>)
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => {
                    setUploadBgForm({
                      bgId: Math.max(17, (bgSceneryList.reduce((max, b) => Math.max(max, b.bgId), 0) + 1)),
                      name: 'Bộ Phông Nền Mới',
                      planetId: currentMap?.planetId ?? 0,
                      tag: 'Tùy Chỉnh',
                      layers: [
                        { layer: 0, label: 'Lớp 0 (Cận cảnh / Chân đồi sát đất)', file: null, preview: '' },
                        { layer: 1, label: 'Lớp 1 (Cảnh gần / Đồi cây)', file: null, preview: '' },
                        { layer: 2, label: 'Lớp 2 (Cảnh trung / Dãy núi)', file: null, preview: '' },
                        { layer: 3, label: 'Lớp 3 (Cảnh xa nhất / Chân trời)', file: null, preview: '' },
                      ],
                    });
                    setShowUploadBgModal(true);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>➕ Tải Lên Bộ Mới</span>
                </button>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowBgSceneryCatalogModal(false)}>×</button>
            </div>

            {/* SEARCH BAR & PLANET FILTER TABS */}
            <div className="catalog-search-bar" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="🔍 Tìm theo ID hoặc tên (vd: 0, 1, 2, làng aru, namếc, xayda, núi tuyết, địa ngục, vũ trụ)..."
                value={bgScenerySearch}
                onChange={(e) => setBgScenerySearch(e.target.value)}
                className="catalog-search-input"
                style={{ flex: 1, minWidth: '240px' }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '4px' }}>
                {[
                  { id: 'all', label: 'Tất Cả' },
                  { id: '0', label: 'Trái Đất' },
                  { id: '1', label: 'Namếc' },
                  { id: '2', label: 'Xayda / Địa Ngục' },
                  { id: '3', label: 'Vũ Trụ / Khác' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`btn btn-xs ${bgSceneryPlanetFilter === p.id ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setBgSceneryPlanetFilter(p.id)}
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <span className="catalog-count-badge">Tổng {bgSceneryList.length} Bộ Nền</span>
            </div>

            {/* GRID DANH SÁCH CÁC BỘ BACKGROUND */}
            <div className="modal-body catalog-grid-body" style={{ maxHeight: '64vh', padding: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                {bgSceneryList.filter((b) => {
                  if (bgSceneryPlanetFilter !== 'all') {
                    if (bgSceneryPlanetFilter === '2' && b.planetId !== 2 && !b.tag?.includes('Địa Ngục')) return false;
                    else if (bgSceneryPlanetFilter === '3' && b.planetId !== 3 && b.planetId !== 0 && b.planetId !== 1 && b.planetId !== 2) return false;
                    else if (bgSceneryPlanetFilter === '0' && b.planetId !== 0) return false;
                    else if (bgSceneryPlanetFilter === '1' && b.planetId !== 1) return false;
                  }
                  if (!bgScenerySearch.trim()) return true;
                  const q = bgScenerySearch.trim().toLowerCase();
                  return String(b.bgId).includes(q)
                    || (b.name && b.name.toLowerCase().includes(q))
                    || (b.desc && b.desc.toLowerCase().includes(q))
                    || (b.tag && b.tag.toLowerCase().includes(q));
                }).map((b) => {
                  const isCurrent = Number(currentMap?.bgId ?? 0) === b.bgId;
                  return (
                    <div
                      key={b.bgId}
                      className={`bg-scenery-catalog-card ${isCurrent ? 'selected' : ''}`}
                      onClick={() => {
                        if (currentMap) {
                          setCurrentMap({ ...currentMap, bgId: b.bgId });
                        }
                        setShowBgSceneryCatalogModal(false);
                        setSuccessMsg(`✨ Đã chuyển sang Bộ Phông Nền #${b.bgId}: ${b.name}!`);
                      }}
                      style={{
                        background: isCurrent ? 'rgba(14, 165, 233, 0.15)' : 'rgba(15, 23, 42, 0.85)',
                        border: isCurrent ? '2px solid #38bdf8' : '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: '10px',
                        padding: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        boxShadow: isCurrent ? '0 0 16px rgba(56, 189, 248, 0.25)' : 'none',
                      }}
                    >
                      {/* CARD HEADER */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: isCurrent ? '#0284c7' : '#334155',
                            color: '#fff',
                          }}>
                            Set #{b.bgId}
                          </span>
                          <strong style={{ fontSize: '0.92rem', color: '#f8fafc' }}>{b.name}</strong>
                        </div>
                        <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 'bold' }}>
                          {b.layers?.length || 0} Lớp Layer
                        </span>
                      </div>

                      {/* MULTI-LAYER LIVE MINI PREVIEW VIEWPORT */}
                      <div style={{
                        position: 'relative',
                        height: '120px',
                        width: '100%',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        background: b.planetId === 1 ? 'linear-gradient(to bottom, #0f3a40, #0e7490)' : (b.planetId === 2 ? 'linear-gradient(to bottom, #381c07, #78350f)' : 'linear-gradient(to bottom, #1e3a8a, #38bdf8)'),
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}>
                        {/* Sun */}
                        <div style={{
                          position: 'absolute',
                          top: '10px',
                          right: '16px',
                          width: '28px',
                          height: '28px',
                          backgroundImage: `url(/api/v1/assets/bg/sun${b.planetId ?? 0}.png), url(/api/v1/assets/bg/sun0.png)`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          opacity: 0.9,
                        }} />

                        {/* Clouds */}
                        <div style={{
                          position: 'absolute',
                          top: '20px',
                          left: 0,
                          right: 0,
                          height: '18px',
                          backgroundImage: 'url(/api/v1/assets/bg/cl0.png)',
                          backgroundSize: 'auto 18px',
                          backgroundRepeat: 'repeat-x',
                          opacity: 0.6,
                        }} />

                        {/* Stacked background layers b{bgId}{layer}.png */}
                        {(b.layers || []).map((layerObj) => {
                          const miniHeights = [55, 45, 42, 35, 30];
                          const miniBottoms = [22, 12, 4, 0, 0];
                          const h = miniHeights[layerObj.layer] || 35;
                          const bot = miniBottoms[layerObj.layer] || 0;

                          return (
                            <div
                              key={layerObj.layer}
                              style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                bottom: `${bot}px`,
                                height: `${h}px`,
                                backgroundImage: `url(${layerObj.url})`,
                                backgroundRepeat: 'repeat-x',
                                backgroundPosition: 'bottom left',
                                backgroundSize: 'auto 100%',
                                imageRendering: 'pixelated',
                                zIndex: layerObj.layer + 1,
                              }}
                            />
                          );
                        })}
                      </div>

                      {/* DESCRIPTION & LAYER CHIPS */}
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', lineHeight: '1.3' }}>
                        {b.desc}
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '4px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {(b.layers || []).map((l) => (
                            <span key={l.layer} style={{ fontSize: '0.68rem', background: 'rgba(0,0,0,0.4)', padding: '1px 5px', borderRadius: '3px', color: '#cbd5e1' }}>
                              L{l.layer}: <code>{l.fileName}</code>
                            </span>
                          ))}
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: isCurrent ? '#38bdf8' : '#60a5fa' }}>
                          {isCurrent ? '✓ Đang Dùng' : '👉 Chọn Nền Này'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={() => setShowBgSceneryCatalogModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TẢI LÊN / TẠO BỘ BACKGROUND MỚI (UPLOAD BG MODAL) */}
      {showUploadBgModal && (
        <div className="modal-overlay" onClick={() => setShowUploadBgModal(false)}>
          <div className="modal-box catalog-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ➕ Thêm / Tải Lên Bộ Phông Nền Mới (<code>data/bg</code>)
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                  Tải các ảnh dải PNG lên máy chủ để tạo bộ phông <code>b{uploadBgForm.bgId}0.png</code> .. <code>b{uploadBgForm.bgId}3.png</code>
                </p>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowUploadBgModal(false)}>×</button>
            </div>

            <div className="modal-body" style={{ maxHeight: '70vh', padding: '16px' }}>
              {/* LƯU Ý KỸ THUẬT QUAN TRỌNG CỦA GAME NRO */}
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                <strong style={{ color: '#38bdf8', display: 'block', marginBottom: '4px' }}>
                  📌 Quy Tắc Kỹ Thuật Quan Trọng Của Engine Game NRO:
                </strong>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  <li><strong>Background ID:</strong> Bắt buộc dùng <strong>ID từ 17 trở lên</strong> (ID 0 - 16 là các map mặc định của game, trong đó ID 15 là Địa Ngục / Võ Đài Bà Hạt Mít).</li>
                  <li><strong>Quy cách ảnh:</strong> Engine Client NRO cuộn lặp dải ngang (repeat-x). Mỗi layer nên là ảnh dải ngang có chiều cao từ <strong>40px đến 100px</strong> (nền PNG trong suốt). <em>Không upload ảnh full màn hình (như 1440x696) vì sẽ bị tràn màn hình và lệch tọa độ Y trong game.</em></li>
                  <li><strong>Thứ tự Layer:</strong> <code>b0</code> là Cận cảnh sát đất $\rightarrow$ <code>b3</code> là Chân trời xa nhất.</li>
                </ul>
              </div>

              {/* FORM THÔNG TIN BỘ PHÔNG NỀN */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Background ID (Khuyên dùng &ge; 17):</label>
                  <input
                    type="number"
                    min="17"
                    value={uploadBgForm.bgId}
                    onChange={(e) => setUploadBgForm({ ...uploadBgForm, bgId: Number(e.target.value) })}
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>Tên Bộ Phông Nền:</label>
                  <input
                    type="text"
                    value={uploadBgForm.name}
                    onChange={(e) => setUploadBgForm({ ...uploadBgForm, name: e.target.value })}
                    placeholder="VD: Rừng Cây Hoàng Hôn, Hang Quỷ Tối..."
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>Hành Tinh Gợi Ý:</label>
                  <select
                    value={uploadBgForm.planetId}
                    onChange={(e) => setUploadBgForm({ ...uploadBgForm, planetId: Number(e.target.value) })}
                    className="form-select"
                  >
                    <option value={0}>Trái Đất</option>
                    <option value={1}>Namếc</option>
                    <option value={2}>Xayda / Địa Ngục</option>
                    <option value={3}>Vũ Trụ</option>
                  </select>
                </div>
              </div>

              {/* 5 Ô TẢI ẢNH CHO 5 LAYER */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <strong style={{ fontSize: '0.85rem', color: '#38bdf8' }}>
                  📁 Tải Lên Các Tệp Ảnh Dải Cho Từng Layer (Định dạng PNG trong suốt):
                </strong>

                {uploadBgForm.layers.map((l, idx) => {
                  const targetFileName = `b${uploadBgForm.bgId}${l.layer}.png`;

                  return (
                    <div
                      key={l.layer}
                      style={{
                        background: 'rgba(30, 41, 59, 0.6)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        display: 'grid',
                        gridTemplateColumns: '220px 1fr 140px',
                        gap: '12px',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '0.82rem', color: '#f8fafc', display: 'block' }}>
                          {l.label}
                        </strong>
                        <code style={{ fontSize: '0.72rem', color: '#38bdf8' }}>
                          {targetFileName}
                        </code>
                      </div>

                      <div>
                        <input
                          type="file"
                          accept="image/png,image/webp,image/jpeg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const base64 = ev.target?.result;
                              const updatedLayers = [...uploadBgForm.layers];
                              updatedLayers[idx] = {
                                ...updatedLayers[idx],
                                file,
                                preview: base64,
                              };
                              setUploadBgForm({ ...uploadBgForm, layers: updatedLayers });
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="form-input form-input-sm"
                          style={{ fontSize: '0.78rem' }}
                        />
                      </div>

                      <div style={{
                        height: '40px',
                        background: 'rgba(0, 0, 0, 0.5)',
                        borderRadius: '4px',
                        border: '1px dashed rgba(148, 163, 184, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}>
                        {l.preview ? (
                          <img
                            src={l.preview}
                            alt={`Preview ${l.layer}`}
                            style={{ height: '100%', width: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Chưa chọn ảnh</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowUploadBgModal(false)}
                disabled={uploadingBg}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={async () => {
                  const validLayers = uploadBgForm.layers.filter((l) => l.preview);
                  if (validLayers.length === 0) {
                    setErrorMsg('Vui lòng chọn ít nhất 1 ảnh layer để tải lên.');
                    return;
                  }
                  setUploadingBg(true);
                  setErrorMsg('');
                  setSuccessMsg('');
                  try {
                    const payload = {
                      bgId: uploadBgForm.bgId,
                      layers: validLayers.map((l) => ({
                        layer: l.layer,
                        image: l.preview,
                      })),
                    };
                    const res = await apiPost('/api/v1/assets/map-backgrounds/upload', payload);
                    if (res.ok) {
                      setSuccessMsg(`🎉 Đã tải lên và tạo thành công Bộ Phông Nền #${uploadBgForm.bgId} vào data/bg!`);
                      await fetchBgSceneryList();
                      if (currentMap) {
                        setCurrentMap({ ...currentMap, bgId: uploadBgForm.bgId });
                      }
                      setShowUploadBgModal(false);
                      setShowBgSceneryCatalogModal(false);
                    } else {
                      setErrorMsg(res.error || 'Lỗi khi tải ảnh background lên máy chủ.');
                    }
                  } catch (err) {
                    setErrorMsg('Lỗi khi tải ảnh: ' + err.message);
                  } finally {
                    setUploadingBg(false);
                  }
                }}
                disabled={uploadingBg}
              >
                {uploadingBg ? '⏳ Đang Lưu Vào data/bg...' : '💾 Lưu Vào data/bg & Áp Dụng Ngay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: THÊM BẢN ĐỒ MỚI (AI / CLONE / BLANK) */}
      {showNewMapModal && (
        <div className="modal-overlay" onClick={() => setShowNewMapModal(false)}>
          <div className="modal-box map-modal new-map-enhanced-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="new-map-modal-title">
                <span className="title-icon">✨</span>
                <div>
                  <h3>Khởi Tạo Bản Đồ Mới</h3>
                  <p className="subtitle">Lựa chọn vẽ map tự động bằng AI, sao chép hoặc tạo map trống tùy chỉnh</p>
                </div>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowNewMapModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateMap}>
              <div className="modal-body new-map-modal-body">
                {/* BANNER X4 MASTER RESOLUTION PIPELINE */}
                <div className="x4-master-pipeline-banner" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.12))', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '22px' }}>🎯</span>
                  <div>
                    <strong style={{ color: '#10b981', display: 'block', fontSize: '13px' }}>Độ phân giải mặc định: X4 Master UHD (96x96 px)</strong>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Bản đồ sẽ được khởi tạo với độ nét gốc X4 cao nhất, sau đó hệ thống tự động Area Downsampling sắc nét sang X3 (72px), X2 (48px), X1 (24px)</span>
                  </div>
                </div>

                {/* 1. CREATION MODE TABS */}
                <div className="creation-mode-tabs">
                  <button
                    type="button"
                    className={`creation-tab-btn ${newMapForm.creationMode === 'ai' ? 'active' : ''}`}
                    onClick={() => setNewMapForm({ ...newMapForm, creationMode: 'ai' })}
                  >
                    <span className="tab-icon">✨</span>
                    <strong>Tự Động Bằng AI</strong>
                    <small>Sinh địa hình chuẩn đẹp, quái, decor & cổng</small>
                  </button>
                  <button
                    type="button"
                    className={`creation-tab-btn ${newMapForm.creationMode === 'clone' ? 'active' : ''}`}
                    onClick={() => setNewMapForm({ ...newMapForm, creationMode: 'clone' })}
                  >
                    <span className="tab-icon">🧬</span>
                    <strong>Sao Chép Bản Đồ</strong>
                    <small>Nhân bản từ map mẫu đã có</small>
                  </button>
                  <button
                    type="button"
                    className={`creation-tab-btn ${newMapForm.creationMode === 'blank' ? 'active' : ''}`}
                    onClick={() => setNewMapForm({ ...newMapForm, creationMode: 'blank' })}
                  >
                    <span className="tab-icon">📄</span>
                    <strong>Tạo Map Trống</strong>
                    <small>Vẽ thủ công từ đầu</small>
                  </button>
                  <button
                    type="button"
                    className="creation-tab-btn"
                    onClick={() => {
                      setShowNewMapModal(false);
                      setShowVisionModal(true);
                    }}
                  >
                    <span className="tab-icon">📷</span>
                    <strong>Nhận Diện Từ Ảnh</strong>
                    <small>Quét & vẽ lại từ ảnh chụp</small>
                  </button>
                </div>

                {/* 2. COMMON METADATA */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Map ID (Số nguyên duy nhất):</label>
                    <input
                      type="number"
                      required
                      value={newMapForm.id}
                      onChange={(e) => setNewMapForm({ ...newMapForm, id: e.target.value })}
                      className="form-input"
                      placeholder="VD: 186"
                    />
                  </div>
                  <div className="form-group flex-2">
                    <label>Tên Bản Đồ:</label>
                    <input
                      type="text"
                      required
                      value={newMapForm.name}
                      onChange={(e) => setNewMapForm({ ...newMapForm, name: e.target.value })}
                      className="form-input"
                      placeholder="VD: Thánh địa Thần Linh"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Hành Tinh:</label>
                    <select
                      value={newMapForm.planetId}
                      onChange={(e) => {
                        const pId = Number(e.target.value);
                        let preset = newMapForm.preset;
                        if (pId === 0) preset = 'earth_plains';
                        else if (pId === 1) preset = 'namec_floating';
                        else if (pId === 2) preset = 'xayda_badlands';
                        setNewMapForm({ ...newMapForm, planetId: pId, preset });
                      }}
                      className="form-select"
                    >
                      {PLANET_OPTIONS.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Loại Bản Đồ:</label>
                    <select
                      value={newMapForm.type}
                      onChange={(e) => setNewMapForm({ ...newMapForm, type: Number(e.target.value) })}
                      className="form-select"
                    >
                      {MAP_TYPE_OPTIONS.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. MODE-SPECIFIC OPTIONS */}
                {newMapForm.creationMode === 'ai' && (
                  <div className="mode-detail-box ai-detail-box">
                    <div className="detail-box-header">
                      <span>✨ Cấu Hình Trí Tuệ Nhân Tạo AI:</span>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Chủ đề sinh map:</label>
                        <select
                          value={newMapForm.preset}
                          onChange={(e) => setNewMapForm({ ...newMapForm, preset: e.target.value })}
                          className="form-select"
                        >
                          <option value="earth_plains">🌲 Trái Đất - Đồi cỏ & Rừng cây</option>
                          <option value="namec_floating">🌊 Namếc - Thảo nguyên & Đảo bay</option>
                          <option value="xayda_badlands">🪐 Xayda - Cao nguyên đá dốc</option>
                          <option value="hell_volcano">🌋 Địa Ngục / Núi Lửa Hang Quỷ</option>
                          <option value="martial_arena">🏟️ Võ Đài Thi Đấu Đại Hội</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Độ uốn lượn địa hình:</label>
                        <select
                          value={newMapForm.roughness}
                          onChange={(e) => setNewMapForm({ ...newMapForm, roughness: e.target.value })}
                          className="form-select"
                        >
                          <option value="smooth">Đồi dốc thoai thoải (Mượt mà)</option>
                          <option value="medium">Nhấp nhô tự nhiên</option>
                          <option value="rugged">Vách đá hiểm trở</option>
                          <option value="flat">Phẳng hoàn toàn</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Đảo bay: <strong>{newMapForm.floatingIslands} đảo</strong></label>
                        <input
                          type="range"
                          min="0"
                          max="4"
                          value={newMapForm.floatingIslands}
                          onChange={(e) => setNewMapForm({ ...newMapForm, floatingIslands: Number(e.target.value) })}
                          className="ai-slider"
                        />
                      </div>
                      <div className="form-group">
                        <label>Quái vật: <strong>Level {newMapForm.mobLevel}</strong> ({newMapForm.mobDensity})</label>
                        <select
                          value={newMapForm.mobDensity}
                          onChange={(e) => setNewMapForm({ ...newMapForm, mobDensity: e.target.value })}
                          className="form-select"
                        >
                          <option value="light">Thưa (~4 quái)</option>
                          <option value="medium">Vừa phải (~8 quái)</option>
                          <option value="dense">Dày đặc (~14 quái)</option>
                          <option value="none">Không sinh quái</option>
                        </select>
                      </div>
                    </div>

                    <div className="ai-checkbox-mini">
                      <label>
                        <input
                          type="checkbox"
                          checked={newMapForm.autoWaypoints}
                          onChange={(e) => setNewMapForm({ ...newMapForm, autoWaypoints: e.target.checked })}
                        />
                        <span>Tự động tạo Cổng Vào (trái) và Cổng Ra (phải) sát mặt đất</span>
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={newMapForm.autoNpc}
                          onChange={(e) => setNewMapForm({ ...newMapForm, autoNpc: e.target.checked })}
                        />
                        <span>Tự động đặt NPC Trưởng Lão hướng dẫn</span>
                      </label>
                    </div>
                  </div>
                )}

                {newMapForm.creationMode === 'clone' && (
                  <div className="mode-detail-box">
                    <div className="form-group">
                      <label>Chọn Bản Đồ Gốc để nhân bản:</label>
                      <select
                        value={newMapForm.cloneFromId}
                        onChange={(e) => setNewMapForm({ ...newMapForm, cloneFromId: e.target.value })}
                        className="form-select"
                        required
                      >
                        <option value="">-- Chọn map mẫu cần sao chép --</option>
                        {(metaOptions?.maps || []).map((m) => (
                          <option key={m.id} value={m.id}>[{m.id}] {m.name} ({m.pxw}x{m.pxh}px)</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {newMapForm.creationMode === 'blank' && (
                  <div className="mode-detail-box">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Số Cột (Tile W - 24px/ô):</label>
                        <input
                          type="number"
                          min="20"
                          max="250"
                          value={newMapForm.tmw}
                          onChange={(e) => setNewMapForm({ ...newMapForm, tmw: Number(e.target.value) })}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Số Hàng (Tile H - 24px/ô):</label>
                        <input
                          type="number"
                          min="10"
                          max="250"
                          value={newMapForm.tmh}
                          onChange={(e) => setNewMapForm({ ...newMapForm, tmh: Number(e.target.value) })}
                          className="form-input"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowNewMapModal(false)}>
                  Hủy
                </button>
                <button type="submit" className={`btn ${newMapForm.creationMode === 'ai' ? 'btn-ai-magic' : 'btn-primary'}`}>
                  {newMapForm.creationMode === 'ai' ? '✨ Tạo Bản Đồ Bằng AI' : (newMapForm.creationMode === 'clone' ? '🧬 Nhân Bản Map' : '📄 Tạo Map Trống')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: HEALTH CHECK & INTEGRITY VALIDATOR */}
      {showHealthCheckModal && (
        <div className="modal-overlay" onClick={() => setShowHealthCheckModal(false)}>
          <div className="modal-box validator-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🩺 Kết Quả Kiểm Tra Tính Toàn Vẹn Hệ Thống Map</h3>
              <button type="button" className="modal-close" onClick={() => setShowHealthCheckModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {healthLoading ? (
                <div className="health-loading">
                  <span className="ui-spinner" />
                  <p>Đang quét và phân tích toàn bộ cấu hình map trong CSDL...</p>
                </div>
              ) : healthData ? (
                <div>
                  <div className="health-summary-cards">
                    <div className="health-card">
                      <span className="health-num">{healthData.totalMaps}</span>
                      <span className="health-label">Tổng số Map</span>
                    </div>
                    <div className={`health-card ${healthData.errorCount > 0 ? 'danger' : 'success'}`}>
                      <span className="health-num">{healthData.errorCount}</span>
                      <span className="health-label">Lỗi Nghiêm Trọng (Broken)</span>
                    </div>
                    <div className={`health-card ${healthData.warningCount > 0 ? 'warning' : 'success'}`}>
                      <span className="health-num">{healthData.warningCount}</span>
                      <span className="health-label">Cảnh Báo Vượt Biên</span>
                    </div>
                  </div>

                  {healthData.issues.length === 0 ? (
                    <div className="health-all-good">
                      <span className="big-icon">🎉</span>
                      <h4>Tuyệt vời! Toàn bộ hệ thống bản đồ đều chuẩn xác.</h4>
                      <p>Không phát hiện waypoint chết hoặc quái/NPC bị bay ra ngoài bản đồ.</p>
                    </div>
                  ) : (
                    <div className="health-issues-list">
                      <h4>Danh sách phát hiện ({healthData.issues.length}):</h4>
                      {healthData.issues.map((issue, idx) => (
                        <div key={idx} className={`issue-row ${issue.severity}`}>
                          <div className="issue-badge">{issue.severity === 'error' ? 'LỖI' : 'CẢNH BÁO'}</div>
                          <div className="issue-content">
                            <strong>Map [{issue.mapId}] {issue.mapName}</strong> — <span>{issue.element}</span>
                            <p>{issue.message}</p>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => {
                              setSelectedMapId(issue.mapId);
                              setShowHealthCheckModal(false);
                            }}
                          >
                            Đến Sửa
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={() => setShowHealthCheckModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EXPORT SQL */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-box export-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📄 Câu Lệnh SQL Export</h3>
              <button type="button" className="modal-close" onClick={() => setShowExportModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <textarea
                readOnly
                value={exportSqlText}
                className="sql-export-textarea"
                rows={12}
                onClick={(e) => e.target.select()}
              />
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  navigator.clipboard.writeText(exportSqlText);
                  alert('Đã copy câu lệnh SQL vào clipboard!');
                }}
              >
                📋 Sao chép vào Clipboard
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setShowExportModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ITEM TEMPLATES PICKER (CHỌN VẬT PHẨM TỪ KHO) */}
      {showItemCatalogModal && (
        <div className="modal-overlay" onClick={() => setShowItemCatalogModal(false)}>
          <div className="modal-box catalog-modal item-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📦 Kho Vật Phẩm (Item Templates)</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  setShowItemCatalogModal(false);
                  setItemPickerTargetIndex(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="catalog-search-bar">
              <input
                type="text"
                placeholder="🔍 Tìm kiếm vật phẩm theo Tên hoặc ID (vd: 190, Vàng, Sao, Bông tai, Giáp, Đậu)..."
                value={itemSearchText}
                onChange={(e) => setItemSearchText(e.target.value)}
                className="catalog-search-input"
                autoFocus
              />
              <span className="catalog-count-badge">Tổng {filteredItemTemplates.length} vật phẩm</span>
            </div>
            <div className="modal-body catalog-grid-body">
              <div className="catalog-items-grid item-templates-grid">
                {filteredItemTemplates.slice(0, 150).map((it) => (
                  <div
                    key={it.id}
                    className="catalog-card item-card"
                    onClick={() => {
                      if (itemPickerTargetIndex !== null) {
                        handleUpdateDropItem(itemPickerTargetIndex, {
                          tempId: it.id,
                          itemName: it.name,
                          iconId: it.icon_id,
                        });
                      } else {
                        handleAddDropItem(dropFilterMob === 'all' ? -1 : dropFilterMob);
                      }
                      setShowItemCatalogModal(false);
                      setItemPickerTargetIndex(null);
                    }}
                    title={`[${it.id}] ${it.name}`}
                  >
                    <div className="catalog-card-img-wrap">
                      <img
                        src={`/api/v1/assets/icons/${it.icon_id}.png`}
                        alt={it.name}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                    <span className="catalog-card-name">{it.name}</span>
                    <span className="catalog-card-id">ID: {it.id}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setShowItemCatalogModal(false);
                  setItemPickerTargetIndex(null);
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: AI AUTO-MAP GENERATOR (TRÌNH TẠO MAP TỰ ĐỘNG THÔNG MINH & DEEPSEEK) */}
      {showAiMapModal && (
        <div className="modal-overlay" onClick={() => setShowAiMapModal(false)}>
          <div className="modal-box ai-map-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header ai-modal-header">
              <div className="ai-modal-title-group">
                <span className="ai-badge-icon">✨</span>
                <div>
                  <h3>Trình Tạo Bản Đồ Thông Minh AI (DeepSeek & Map 161 Studio)</h3>
                  <p className="ai-modal-subtitle">Tích hợp AI DeepSeek & Thuật toán huấn luyện theo nguyên mẫu Masterpiece Map 161 (Bìa Rừng Nguyên Thủy)</p>
                </div>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowAiMapModal(false)}>×</button>
            </div>

            {/* TAB CHUYỂN ĐỔI CHẾ ĐỘ: DEEPSEEK AI VS THUẬT TOÁN MAP 161 */}
            <div className="ai-modal-tabs">
              <button
                type="button"
                className={'ai-mode-tab-btn ' + (aiModeTab === 'deepseek' ? 'active' : '')}
                onClick={() => setAiModeTab('deepseek')}
              >
                <span className="tab-icon">🤖</span>
                <div className="tab-text">
                  <strong>DeepSeek AI Studio</strong>
                  <span>Giao tiếp bằng ngôn ngữ tự nhiên, AI tự nghiên cứu & vẽ</span>
                </div>
              </button>
              <button
                type="button"
                className={'ai-mode-tab-btn ' + (aiModeTab === 'procedural' ? 'active' : '')}
                onClick={() => setAiModeTab('procedural')}
              >
                <span className="tab-icon">🌳</span>
                <div className="tab-text">
                  <strong>Động Cơ Nguyên Mẫu Map 161</strong>
                  <span>Thuật toán tạo hình rừng đa tầng, cành cây & vách đá</span>
                </div>
              </button>
            </div>

            <div className="modal-body ai-modal-body">
              {/* PHẦN 1: DEEPSEEK AI STUDIO VIEW */}
              {aiModeTab === 'deepseek' && (
                <div className="deepseek-studio-view">
                  <div className="deepseek-key-card">
                    <div className="key-header">
                      <div className="key-title">
                        <span className="key-icon">🔑</span>
                        <strong>Cấu Hình Kết Nối DeepSeek API:</strong>
                      </div>
                      <span className={'key-status-badge ' + (deepseekApiKey ? 'connected' : 'empty')}>
                        {deepseekApiKey ? '🟢 Đã Sẵn Sàng' : '🔴 Chưa Có API Key'}
                      </span>
                    </div>
                    <div className="key-inputs-row">
                      <input
                        type="password"
                        placeholder="Dán DeepSeek API Key của bạn vào đây (vd: sk-086...)"
                        value={deepseekApiKey}
                        onChange={(e) => handleSaveDeepSeekApiKey(e.target.value)}
                        className="form-input deepseek-key-input"
                      />
                      <select
                        value={deepseekModel}
                        onChange={(e) => setDeepseekModel(e.target.value)}
                        className="form-select deepseek-model-select"
                      >
                        <option value="deepseek-chat">deepseek-chat (Nhanh & Tối Ưu)</option>
                        <option value="deepseek-reasoner">deepseek-reasoner (R1 Tư Duy Sâu)</option>
                      </select>
                    </div>
                    <p className="key-hint">💡 API Key được lưu an toàn trên trình duyệt của bạn và dùng để gửi yêu cầu phân tích kiến trúc NRO trực tiếp tới máy chủ DeepSeek.</p>
                  </div>

                  <div className="deepseek-prompt-section">
                    <label className="ai-section-title">✍️ Nhập Yêu Cầu Thiết Kế Bản Đồ Cho DeepSeek AI:</label>
                    <textarea
                      rows={4}
                      placeholder="VD: Hãy thiết kế một bản đồ rừng đại thụ đa tầng hoành tráng theo phong cách Map 161, có 4 tầng cành cây to lơ lửng, 2 thân cây to nối xuyên các tầng, có quái Khủng Long tuần tra trên cành, 2 cổng kết nối tiếp đất chuẩn đẹp..."
                      value={deepseekPrompt}
                      onChange={(e) => setDeepseekPrompt(e.target.value)}
                      className="form-textarea deepseek-prompt-area"
                    />

                    <div className="deepseek-prompt-tags">
                      <span className="tags-label">Gợi ý nhanh theo phong cách:</span>
                      <button
                        type="button"
                        className="prompt-pill"
                        onClick={() => setDeepseekPrompt('Thiết kế bản đồ Bìa Rừng Nguyên Thủy đa tầng kiểu Map 161, 4 tầng cành cây to treo lơ lửng, 2 thân cây đại thụ kết nối, quái Khủng Long & Dị Thú canh gác, decor nấm khổng lồ')}
                      >
                        🌳 Chuẩn Bìa Rừng Map 161
                      </button>
                      <button
                        type="button"
                        className="prompt-pill"
                        onClick={() => setDeepseekPrompt('Thiết kế mê cung hang động dung nham ngầm đa tầng có trần đá thạch nhũ, các trụ đá kết nối, cầu đá bắc qua vực nham thạch, quái bóng tối hung hãn')}
                      >
                        🌋 Hang Động Dung Nham
                      </button>
                      <button
                        type="button"
                        className="prompt-pill"
                        onClick={() => setDeepseekPrompt('Thiết kế thung lũng hẻm núi đá Xayda hiểm trở có vực sâu ở giữa, cầu đá tự nhiên bắc ngang, các mỏm đá nhô ra làm lối vượt vực, quái Khỉ Đột')}
                      >
                        🪐 Hẻm Núi Vực Sâu Xayda
                      </button>
                      <button
                        type="button"
                        className="prompt-pill"
                        onClick={() => setDeepseekPrompt('Thiết kế quần đảo bay lơ lửng hình bát úp thảo nguyên Namếc, các nấc thang parkour từ thấp lên cao, nấm khổng lồ, NPC Guru')}
                      >
                        🌊 Quần Đảo Bay Namếc
                      </button>
                    </div>

                    <div className="deepseek-action-bar">
                      <button
                        type="button"
                        className="btn btn-ai-deepseek-gen"
                        onClick={() => handleGenerateWithDeepSeek(false)}
                        disabled={aiGenerating}
                      >
                        {aiGenerating ? (
                          <>
                            <span className="ui-spinner" />
                            <span>🧠 DeepSeek AI Đang Nghiên Cứu Kiến Trúc & Vẽ Map...</span>
                          </>
                        ) : (
                          <>
                            <span>✨ DeepSeek AI Bắt Đầu Thiết Kế Bản Đồ</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* PHẦN 2: BỘ SINH THỦ TỤC MAP 161 & PRESETS */}
              {aiModeTab === 'procedural' && (
                <>
                  <div className="ai-section">
                    <label className="ai-section-title">🪐 Chọn Phong Cách Kiến Trúc (Presets):</label>
                    <div className="ai-preset-grid">
                      {[
                        { id: 'forest_multi_tier', name: 'Bìa Rừng Nguyên Thủy (Map 161 Blueprint)', icon: '🌳', desc: 'Kiến trúc Masterpiece Map 161: 4 tầng cành cây to, thân cây đại thụ kết nối, quái Khủng Long & Nấm' },
                        { id: 'earth_plains', name: 'Trái Đất - Đồng Bằng & Rừng Cây', icon: '🌲', desc: 'Đồi cỏ uốn lượn, ghềnh đá bậc thang, cây xanh rậm rạp, quái Khủng Long & Sói, NPC Gôhan' },
                        { id: 'namec_floating', name: 'Namếc - Thảo Nguyên & Đảo Bay', icon: '🌊', desc: 'Đất xanh ngọc, các cụm đảo bay bát úp V-shape, nấm khổng lồ, quái Ốc Sên, Guru' },
                        { id: 'xayda_badlands', name: 'Xayda - Cao Nguyên Núi Đá', icon: '🪐', desc: 'Vách đá dốc hiểm trở, hẻm vực sâu, cầu đá tự nhiên, quái Thằn Lằn & Khỉ, BaDa' },
                        { id: 'hell_volcano', name: 'Địa Ngục & Núi Lửa Hang Quỷ', icon: '🌋', desc: 'Mái vòm trần đá, nham thạch đỏ rực, trụ thạch nhũ, quái bóng tối hung hãn' },
                        { id: 'martial_arena', name: 'Võ Đài Thi Đấu Đại Hội', icon: '🏟️', desc: 'Sàn đấu phẳng rộng giữa trời, khán đài đối xứng, 2 cổng kết nối, Trọng tài' },
                      ].map((pr) => (
                        <div
                          key={pr.id}
                          className={'ai-preset-card ' + (aiMapForm.preset === pr.id ? 'active' : '')}
                          onClick={() => {
                            setAiMapForm((prev) => ({ ...prev, preset: pr.id }));
                            setTimeout(handleAiGeneratePreview, 50);
                          }}
                        >
                          <span className="preset-icon">{pr.icon}</span>
                          <div className="preset-info">
                            <strong>{pr.name}</strong>
                            <p>{pr.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div className="ai-section">
                <label className="ai-section-title">🪐 Chọn Phong Cách & Kịch Bản Môi Trường (Biome Preset):</label>
                <div className="ai-preset-grid">
                  {[
                    { id: 'earth_plains', name: 'Trái Đất - Đồng Bằng & Rừng Cây', icon: '🌲', desc: 'Đồi cỏ uốn lượn, cây xanh rậm rạp, quái Khủng Long & Sói, NPC Gôhan' },
                    { id: 'namec_floating', name: 'Namếc - Thảo Nguyên & Đảo Bay', icon: '🌊', desc: 'Đất xanh ngọc, các cụm đảo bay tầng tầng, nấm khổng lồ, quái Ốc Sên, Guru' },
                    { id: 'xayda_badlands', name: 'Xayda - Cao Nguyên Núi Đá', icon: '🪐', desc: 'Vách đá dốc hiểm trở, hẻm vực sâu, cây cằn cỗi, quái Thằn Lằn & Khỉ, BaDa' },
                    { id: 'hell_volcano', name: 'Địa Ngục & Núi Lửa Hang Quỷ', icon: '🌋', desc: 'Nham thạch đỏ rực, hang tối, quái bóng tối hung hãn cấp cao' },
                    { id: 'martial_arena', name: 'Võ Đài Thi Đấu Đại Hội', icon: '🏟️', desc: 'Sàn đấu phẳng rộng giữa trời, khán đài, cột cờ, 2 cổng đối xứng, Trọng tài' },
                    { id: 'custom', name: 'Tùy Chỉnh Tự Do (Custom)', icon: '⚙️', desc: 'Tự do tùy biến toàn bộ slider và cấu hình chi tiết theo ý muốn' },
                  ].map((pr) => (
                    <div
                      key={pr.id}
                      className={`ai-preset-card ${aiMapForm.preset === pr.id ? 'active' : ''}`}
                      onClick={() => {
                        setAiMapForm((prev) => ({ ...prev, preset: pr.id }));
                        setTimeout(handleAiGeneratePreview, 50);
                      }}
                    >
                      <span className="preset-icon">{pr.icon}</span>
                      <div className="preset-info">
                        <strong>{pr.name}</strong>
                        <p>{pr.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. PARAMETERS & SLIDERS */}
              <div className="ai-section">
                <label className="ai-section-title">🎛️ Tùy Chỉnh Tham Số Sinh Bản Đồ:</label>
                <div className="ai-controls-grid">
                  <div className="ai-control-group">
                    <label>
                      Độ cao mặt đất chính: <strong>{aiMapForm.groundHeightPercent}%</strong>
                    </label>
                    <input
                      type="range"
                      min="40"
                      max="85"
                      step="5"
                      value={aiMapForm.groundHeightPercent}
                      onChange={(e) => setAiMapForm({ ...aiMapForm, groundHeightPercent: Number(e.target.value) })}
                      className="ai-slider"
                    />
                    <div className="slider-hints">
                      <span>Đất thấp (Nhiều không gian bay)</span>
                      <span>Đất cao</span>
                    </div>
                  </div>

                  <div className="ai-control-group">
                    <label>Độ uốn lượn địa hình (Curvature / Roughness):</label>
                    <select
                      value={aiMapForm.roughness}
                      onChange={(e) => setAiMapForm({ ...aiMapForm, roughness: e.target.value })}
                      className="form-select"
                    >
                      <option value="flat">Phẳng hoàn toàn (Flat Arena)</option>
                      <option value="smooth">Đồi dốc thoai thoải (Smooth Curves)</option>
                      <option value="medium">Nhấp nhô tự nhiên (Natural Wave)</option>
                      <option value="rugged">Vách đá gồ ghề dốc đứng (Rugged Peaks)</option>
                    </select>
                  </div>

                  <div className="ai-control-group">
                    <label>
                      Số lượng Đảo Bay / Sàn Lơ Lửng: <strong>{aiMapForm.floatingIslands} đảo</strong>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="4"
                      step="1"
                      value={aiMapForm.floatingIslands}
                      onChange={(e) => setAiMapForm({ ...aiMapForm, floatingIslands: Number(e.target.value) })}
                      className="ai-slider"
                    />
                    <div className="slider-hints">
                      <span>0 (Chỉ sàn chính)</span>
                      <span>4 tầng đảo</span>
                    </div>
                  </div>

                  <div className="ai-control-group">
                    <label>Mật độ Quái Vật (Mob Spawner):</label>
                    <select
                      value={aiMapForm.mobDensity}
                      onChange={(e) => setAiMapForm({ ...aiMapForm, mobDensity: e.target.value })}
                      className="form-select"
                    >
                      <option value="none">Không sinh quái</option>
                      <option value="light">Thưa thớt (~4 quái)</option>
                      <option value="medium">Vừa phải (~8 quái)</option>
                      <option value="dense">Dày đặc (~14 quái)</option>
                    </select>
                  </div>

                  <div className="ai-control-group">
                    <label>
                      Cấp độ Quái mục tiêu: <strong>Level {aiMapForm.mobLevel}</strong> (HP ~{aiMapForm.mobLevel * 250})
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      step="1"
                      value={aiMapForm.mobLevel}
                      onChange={(e) => setAiMapForm({ ...aiMapForm, mobLevel: Number(e.target.value) })}
                      className="ai-slider"
                    />
                  </div>

                  <div className="ai-control-group">
                    <label>Mật độ Vật thể Trang trí (Decor / Cây / Đá):</label>
                    <select
                      value={aiMapForm.decorDensity}
                      onChange={(e) => setAiMapForm({ ...aiMapForm, decorDensity: e.target.value })}
                      className="form-select"
                    >
                      <option value="none">Trống trơn</option>
                      <option value="low">Ít (~5 vật thể)</option>
                      <option value="medium">Vừa phải (~12 vật thể)</option>
                      <option value="high">Rậm rạp (~20 vật thể)</option>
                    </select>
                  </div>
                </div>

                {/* CHECKBOX OPTIONS */}
                <div className="ai-checkbox-row">
                  <label className="ai-checkbox-label">
                    <input
                      type="checkbox"
                      checked={aiMapForm.autoWaypoints}
                      onChange={(e) => setAiMapForm({ ...aiMapForm, autoWaypoints: e.target.checked })}
                    />
                    <span>🌀 Tự động tạo Cổng Vào (Mép trái) & Cổng Ra (Mép phải) kết nối map liền kề</span>
                  </label>

                  <label className="ai-checkbox-label">
                    <input
                      type="checkbox"
                      checked={aiMapForm.autoNpc}
                      onChange={(e) => setAiMapForm({ ...aiMapForm, autoNpc: e.target.checked })}
                    />
                    <span>👤 Tự động đặt NPC Trưởng Lão / Hướng Dẫn an toàn gần cổng vào</span>
                  </label>
                </div>
              </div>

              {/* 3. PREVIEW & STATS BOX */}
              <div className="ai-preview-panel">
                <div className="ai-stats-header">
                  <h4>📊 Thống Kê Bản Đồ Sinh Ra (Preview):</h4>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={handleAiGeneratePreview}
                    title="Tính toán lại biến thể ngẫu nhiên mới"
                  >
                    🔄 Re-roll (Tạo Biến Thể Mới)
                  </button>
                </div>

                {aiPreviewStats ? (
                  <div className="ai-stats-cards">
                    <div className="ai-stat-pill">
                      <span className="stat-label">🧱 Ô Gạch Địa Hình:</span>
                      <strong className="stat-val">{aiPreviewStats.tileCount} ô</strong>
                    </div>
                    <div className="ai-stat-pill">
                      <span className="stat-label">👾 Quái Vật Sát Đất:</span>
                      <strong className="stat-val">{aiPreviewStats.mobCount} quái (Lvl {aiMapForm.mobLevel})</strong>
                    </div>
                    <div className="ai-stat-pill">
                      <span className="stat-label">🏛️ Vật Thể Decor:</span>
                      <strong className="stat-val">{aiPreviewStats.bgItemCount} mẫu</strong>
                    </div>
                    <div className="ai-stat-pill">
                      <span className="stat-label">🌀 Cổng Chuyển Map:</span>
                      <strong className="stat-val">{aiPreviewStats.waypointCount} cổng</strong>
                    </div>
                    <div className="ai-stat-pill">
                      <span className="stat-label">👤 NPC Bố Trí:</span>
                      <strong className="stat-val">{aiPreviewStats.npcCount} NPC</strong>
                    </div>
                  </div>
                ) : (
                  <p className="ai-no-preview">Bấm "Tạo Thử" để xem thống kê bản đồ</p>
                )}
              </div>
            </div>

            <div className="modal-footer ai-modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowAiMapModal(false)}
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAiGeneratePreview}
              >
                🎲 Tạo Thử / Re-roll
              </button>
              <button
                type="button"
                className="btn btn-primary btn-ai-apply"
                onClick={handleAiApplyToMap}
              >
                🚀 Áp Dụng Vào Bản Đồ Này
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: AI VISION & COMPUTER VISION MAP SCANNER MODAL */}
      {showVisionModal && (
        <div className="modal-overlay vision-modal-overlay" onClick={() => setShowVisionModal(false)}>
          <div className="modal-box vision-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header vision-modal-header">
              <div className="vision-modal-title-group">
                <span className="vision-badge-icon">📷</span>
                <div>
                  <h3>AI Vision Map Scanner — Nhận Diện Bố Cục Bản Đồ Từ Ảnh Chụp</h3>
                  <p className="vision-modal-subtitle">
                    Tự động nhận diện cấu trúc địa hình, tầng sàn, đảo bay, cầu thang, quái vật, cây cối & cổng dịch chuyển từ ảnh và vẽ lại chuẩn xác 100%
                  </p>
                </div>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowVisionModal(false)}>×</button>
            </div>

            {/* CHUYỂN ĐỔI CHẾ ĐỘ NHẬN DIỆN */}
            <div className="vision-mode-tabs">
              <button
                type="button"
                className={`vision-tab-btn ${visionMode === 'cv' ? 'active' : ''}`}
                onClick={() => setVisionMode('cv')}
              >
                <span className="tab-icon">⚡</span>
                <div className="tab-text">
                  <strong>Thuật Toán Computer Vision (Nhanh & Ngoại Tuyến)</strong>
                  <span>Phân tích hình học pixel, texture và phân tầng tự động (Khuyên Dùng)</span>
                </div>
              </button>
              <button
                type="button"
                className={`vision-tab-btn ${visionMode === 'ai' ? 'active' : ''}`}
                onClick={() => setVisionMode('ai')}
              >
                <span className="tab-icon">🤖</span>
                <div className="tab-text">
                  <strong>Cloud AI Vision Đa Phương Thức (Gemini / OpenAI / OpenRouter)</strong>
                  <span>Gửi ảnh tới mô hình thị giác AI để phân tích theo ngôn ngữ tự nhiên</span>
                </div>
              </button>
            </div>

            <div className="modal-body vision-modal-body">
              {/* PHẦN 1: KHU VỰC TẢI & KÉO THẢ ẢNH */}
              <div
                className={`vision-dropzone ${isDraggingOverVision ? 'dragover' : ''} ${visionImage ? 'has-image' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingOverVision(true); }}
                onDragLeave={() => setIsDraggingOverVision(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingOverVision(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleVisionImageUpload(file);
                }}
              >
                {!visionImage ? (
                  <div className="dropzone-empty-state">
                    <span className="dropzone-icon">🖼️</span>
                    <h4>Kéo thả ảnh chụp bản đồ vào đây, hoặc bấm chọn tệp</h4>
                    <p className="dropzone-hint">
                      💡 Mẹo: Bạn có thể nhấn <strong>Ctrl + V</strong> ở bất kỳ đâu trong màn hình để dán ảnh chụp màn hình ngay lập tức!
                    </p>
                    <label className="btn btn-primary btn-upload-image">
                      <span>📁 Chọn Tệp Ảnh (PNG / JPG / WebP)</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleVisionImageUpload(file);
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="dropzone-loaded-bar">
                    <div className="loaded-info">
                      <span className="loaded-badge">✅ Đã nạp ảnh:</span>
                      <strong className="loaded-filename">{visionFileName || 'map_screenshot.png'}</strong>
                    </div>
                    <div className="loaded-actions">
                      <label className="btn btn-sm btn-outline">
                        <span>🔄 Đổi Ảnh Khác</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleVisionImageUpload(file);
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => {
                          if (visionMode === 'cv') {
                            processImageWithCV(visionImage);
                          } else {
                            processImageWithAI();
                          }
                        }}
                        disabled={visionProcessing}
                      >
                        {visionProcessing ? '⏳ Đang phân tích...' : '⚡ Quét Lại Ảnh Này'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* PHẦN CẤU HÌNH CLOUD AI VISION NẾU CHỌN TAB AI */}
              {visionMode === 'ai' && (
                <div className="vision-ai-config-card">
                  <div className="key-header">
                    <div className="key-title">
                      <span className="key-icon">🔑</span>
                      <strong>Cấu Hình API Key AI Vision:</strong>
                    </div>
                    <span className={`key-status-badge ${visionApiKey ? 'connected' : 'empty'}`}>
                      {visionApiKey ? '🟢 Đã Cấu Hình Key' : '🔴 Chưa Có Key'}
                    </span>
                  </div>
                  <div className="vision-ai-inputs-grid">
                    <div className="form-group">
                      <label>Nhà cung cấp Vision AI:</label>
                      <select
                        value={visionProvider}
                        onChange={(e) => setVisionProvider(e.target.value)}
                        className="form-select"
                      >
                        <option value="gemini">Google Gemini Vision (gemini-1.5-flash / gemini-2.0-flash)</option>
                        <option value="openai">OpenAI Vision (gpt-4o-mini / gpt-4o)</option>
                        <option value="openrouter">OpenRouter Multi-modal API</option>
                      </select>
                    </div>
                    <div className="form-group flex-2">
                      <label>API Key tương ứng:</label>
                      <input
                        type="password"
                        placeholder="Dán API Key (vd: AIzaSy..., sk-proj-...)"
                        value={visionApiKey}
                        onChange={(e) => handleSaveVisionApiKey(e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Model Vision tùy chọn:</label>
                      <input
                        type="text"
                        placeholder={visionProvider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini'}
                        value={visionModel}
                        onChange={(e) => setVisionModel(e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PHẦN 2: DUAL LIVE PREVIEW (ẢNH GỐC VS BẢN ĐỒ GẠCH ĐÃ NHẬN DIỆN) */}
              {visionImage && (
                <div className="vision-dual-preview-container">
                  {/* BÊN TRÁI: ẢNH GỐC */}
                  <div className="vision-preview-card">
                    <div className="preview-card-header">
                      <span className="header-title">📷 1. Ảnh Bản Đồ Gốc (Original Image)</span>
                      <span className="header-badge">Đầu Vào</span>
                    </div>
                    <div className="preview-card-viewport original-viewport">
                      <img src={visionImage} alt="Bản đồ gốc" className="vision-original-img" />
                    </div>
                  </div>

                  {/* BÊN PHẢI: BẢN ĐỒ GẠCH ĐÃ BÓC TÁCH */}
                  <div className="vision-preview-card">
                    <div className="preview-card-header">
                      <span className="header-title">🧱 2. Bản Đồ Đã Nhận Diện & Tái Tạo (Live 2D Tilemap)</span>
                      <span className="header-badge success">
                        {visionProcessing ? '⏳ Đang quét...' : (visionDetectedPlan ? '✨ Đã Khớp Bố Cục' : 'Chờ Quét')}
                      </span>
                    </div>
                    <div className="preview-card-viewport canvas-viewport">
                      {visionProcessing ? (
                        <div className="vision-scanning-overlay">
                          <span className="ui-spinner lg" />
                          <p>Đang phân tích quang học pixel, tách nền và nhận diện các tầng sàn...</p>
                        </div>
                      ) : (
                        <canvas ref={visionPreviewCanvasRef} className="vision-live-canvas" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* PHẦN 3: BẢNG ĐIỀU KHIỂN THAM SỐ NHẬN DIỆN TỨC THÌ (REAL-TIME TUNING) */}
              {visionImage && (
                <div className="vision-tuning-section">
                  <div className="tuning-header">
                    <h4>🎛️ Tùy Chỉnh Tham Số Bóc Tách & Bộ Gạch (Real-time Tuning):</h4>
                    <small>Thay đổi thanh trượt bên dưới sẽ cập nhật lại bản vẽ xem trước tức thì</small>
                  </div>

                  <div className="vision-controls-grid">
                    {/* 1. SLIDER ĐỘ NHẠY TÁCH ĐẤT */}
                    <div className="vision-control-item">
                      <div className="control-label-row">
                        <label>Độ nhạy phân tách đất (Threshold):</label>
                        <strong>{Math.round(visionThreshold * 100)}%</strong>
                      </div>
                      <input
                        type="range"
                        min="0.20"
                        max="0.80"
                        step="0.02"
                        value={visionThreshold}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setVisionThreshold(val);
                          processImageWithCV(visionImage, visionGridW, visionGridH, val);
                        }}
                        className="vision-slider"
                      />
                      <div className="slider-hints">
                        <span>Lấy nhiều đất hơn (Thấp)</span>
                        <span>Lọc đất khắt khe (Cao)</span>
                      </div>
                    </div>

                    {/* 2. CHỌN TILESET PHÙ HỢP */}
                    <div className="vision-control-item">
                      <label>Bộ Gạch Tileset:</label>
                      <select
                        value={visionTileId}
                        onChange={(e) => {
                          const tid = Number(e.target.value);
                          setVisionTileId(tid);
                          processImageWithCV(visionImage, visionGridW, visionGridH, visionThreshold, tid);
                        }}
                        className="form-select"
                      >
                        <option value={1}>🌲 Trái Đất (Đất Nâu Cỏ Xanh - Tile 1)</option>
                        <option value={31}>🌳 Bìa Rừng Nguyên Thủy Map 161 (Vỏ Cây & Nấm - Tile 31)</option>
                        <option value={2}>🌊 Namếc (Đất Xanh Ngọc - Tile 2)</option>
                        <option value={3}>🪐 Xayda (Cao Nguyên Núi Đá - Tile 3)</option>
                        <option value={4}>🌋 Hang Động / Núi Lửa (Tile 4)</option>
                        <option value={5}>🏟️ Võ Đài Hoàng Gia (Tile 5)</option>
                      </select>
                    </div>

                    {/* 3. KÍCH THƯỚC LƯỚI TILE GRID */}
                    <div className="vision-control-item">
                      <label>Kích thước lưới (Số cột x Số hàng):</label>
                      <div className="grid-dim-row">
                        <input
                          type="number"
                          min="20"
                          max="200"
                          value={visionGridW}
                          onChange={(e) => {
                            const w = Number(e.target.value);
                            setVisionGridW(w);
                            processImageWithCV(visionImage, w, visionGridH);
                          }}
                          className="form-input form-input-sm"
                          title="Số cột (Tile Width)"
                        />
                        <span>×</span>
                        <input
                          type="number"
                          min="10"
                          max="80"
                          value={visionGridH}
                          onChange={(e) => {
                            const h = Number(e.target.value);
                            setVisionGridH(h);
                            processImageWithCV(visionImage, visionGridW, h);
                          }}
                          className="form-input form-input-sm"
                          title="Số hàng (Tile Height)"
                        />
                        <span className="dim-px-hint">= {visionGridW * 24}x{visionGridH * 24}px</span>
                      </div>
                      <div className="grid-presets-quick-row">
                        <button
                          type="button"
                          className={`btn-dim-preset ${visionGridW === 40 && visionGridH === 18 ? 'active' : ''}`}
                          onClick={() => { setVisionGridW(40); setVisionGridH(18); processImageWithCV(visionImage, 40, 18); }}
                        >
                          40×18 (Gọn)
                        </button>
                        <button
                          type="button"
                          className={`btn-dim-preset ${visionGridW === 50 && visionGridH === 20 ? 'active' : ''}`}
                          onClick={() => { setVisionGridW(50); setVisionGridH(20); processImageWithCV(visionImage, 50, 20); }}
                        >
                          50×20
                        </button>
                        <button
                          type="button"
                          className={`btn-dim-preset ${visionGridW === 60 && visionGridH === 20 ? 'active' : ''}`}
                          onClick={() => { setVisionGridW(60); setVisionGridH(20); processImageWithCV(visionImage, 60, 20); }}
                        >
                          60×20 (Chuẩn)
                        </button>
                        <button
                          type="button"
                          className={`btn-dim-preset ${visionGridW === 80 && visionGridH === 24 ? 'active' : ''}`}
                          onClick={() => { setVisionGridW(80); setVisionGridH(24); processImageWithCV(visionImage, 80, 24); }}
                        >
                          80×24 (Rộng)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* CHECKBOXES TỰ ĐỘNG */}
                  <div className="vision-checkboxes-row">
                    <label className="vision-checkbox-label">
                      <input
                        type="checkbox"
                        checked={visionAutoTiling}
                        onChange={(e) => {
                          setVisionAutoTiling(e.target.checked);
                          processImageWithCV(visionImage, visionGridW, visionGridH, visionThreshold, visionTileId, e.target.checked);
                        }}
                      />
                      <span>🪄 Tự động gọt viền, bo góc & tạo đáy đảo bay (Smart Auto-Tiling)</span>
                    </label>

                    <label className="vision-checkbox-label">
                      <input
                        type="checkbox"
                        checked={visionAutoDetectMobs}
                        onChange={(e) => {
                          setVisionAutoDetectMobs(e.target.checked);
                          processImageWithCV(visionImage, visionGridW, visionGridH, visionThreshold, visionTileId, visionAutoTiling, e.target.checked);
                        }}
                      />
                      <span>👾 Tự động nhận diện & đặt Quái vật tuần tra trên các sàn</span>
                    </label>

                    <label className="vision-checkbox-label">
                      <input
                        type="checkbox"
                        checked={visionAutoDetectDecor}
                        onChange={(e) => {
                          setVisionAutoDetectDecor(e.target.checked);
                          processImageWithCV(visionImage, visionGridW, visionGridH, visionThreshold, visionTileId, visionAutoTiling, visionAutoDetectMobs, e.target.checked);
                        }}
                      />
                      <span>🌳 Tự động gắn cây cối, nấm & vật thể decor nền</span>
                    </label>
                  </div>
                </div>
              )}

              {/* PHẦN 4: THỐNG KÊ KẾT QUẢ QUÉT */}
              {visionDetectedPlan && (
                <div className="vision-stats-summary">
                  <span className="summary-title">📊 Kết Quả Nhận Diện Bố Cục:</span>
                  <div className="summary-pills">
                    <span className="stat-pill-item">🧱 {visionDetectedPlan.stats?.tileCount || 0} ô gạch</span>
                    <span className="stat-pill-item">🏝️ {visionDetectedPlan.stats?.platformCount || 0} tầng sàn / đảo bay</span>
                    <span className="stat-pill-item">👾 {visionDetectedPlan.stats?.mobCount || 0} quái vật</span>
                    <span className="stat-pill-item">🌳 {visionDetectedPlan.stats?.bgItemCount || 0} cây decor</span>
                    <span className="stat-pill-item">🌀 {visionDetectedPlan.stats?.waypointCount || 0} cổng tiếp đất</span>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer vision-modal-footer">
              {visionImage && (
                <button
                  type="button"
                  className="btn btn-outline btn-trace-overlay-action"
                  onClick={() => {
                    setOverlayImageUrl(visionImage);
                    setShowOverlayImage(true);
                    setShowOverlaySettings(true);
                    setShowVisionModal(false);
                    setSuccessMsg('🖼️ Đã lồng ảnh mẫu soi đồ họa vào bản đồ! Ảnh đã căn khớp 100% với khung lưới 24px để bạn soi và tự vẽ chuẩn xác.');
                  }}
                  title="Lồng ảnh này trực tiếp vào bàn vẽ canvas khớp 100% với ô lưới để soi và vẽ thủ công"
                >
                  🖼️ Lồng Ảnh Vào Bản Đồ Để Soi & Tự Vẽ
                </button>
              )}
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowVisionModal(false)}
              >
                Đóng
              </button>
              {visionDetectedPlan && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleVisionCreateNewMap}
                    title="Tạo một Map ID mới hoàn toàn với bố cục ảnh này"
                  >
                    ✨ Tạo Thành Map Mới
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-vision-apply"
                    onClick={handleVisionApplyToCurrentMap}
                    title="Vẽ đè bố cục này vào bản đồ hiện tại đang mở trên canvas"
                  >
                    🚀 Áp Dụng Vào Bản Đồ Hiện Tại
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
