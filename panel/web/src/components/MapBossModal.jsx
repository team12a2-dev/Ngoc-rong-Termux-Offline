import { useState, useEffect, useMemo, useRef } from 'react';
import { apiGet, apiPost, apiDelete, getServerId } from '../api';
import ItemIcon from './ItemIcon';

const BUILTIN_BOSS_PRESETS = [
  { id: -1, name: 'Boss Test (-1)', desc: 'Boss thử nghiệm hệ thống' },
  { id: -20, name: 'Kuku (-20)', desc: 'Thuộc hạ Fide - Hành tinh Xayda' },
  { id: -21, name: 'Mập Đầu Đinh (-21)', desc: 'Thuộc hạ Fide - Hành tinh Namếc' },
  { id: -22, name: 'Rambo (-22)', desc: 'Thuộc hạ Fide - Hành tinh Trái Đất' },
  { id: -27, name: 'Tiểu Đội Trưởng Ginyu (-27)', desc: 'Thủ lĩnh Biệt đội sát thủ' },
  { id: -23, name: 'Số 4 Guldo (-23)', desc: 'Biệt đội sát thủ' },
  { id: -24, name: 'Số 3 Recoome (-24)', desc: 'Biệt đội sát thủ' },
  { id: -25, name: 'Số 2 Burter (-25)', desc: 'Biệt đội sát thủ' },
  { id: -26, name: 'Số 1 Jeice (-26)', desc: 'Biệt đội sát thủ' },
  { id: -315, name: 'Tiểu Đội Trưởng Namec (-315)', desc: 'Ginyu hành tinh Namek' },
  { id: -28, name: 'Fide Đại Ca (-28)', desc: 'Bạo chúa Frieza hình thái' },
  { id: -29, name: 'Cooler (-29)', desc: 'Đại vương Cooler' },
  { id: -30, name: 'Android 19 (-30)', desc: 'Người máy sát thủ 19' },
  { id: -31, name: 'Dr. Kore (-31)', desc: 'Tiến sĩ Gero' },
  { id: -32, name: 'Android 13 (-32)', desc: 'Người máy sát thủ 13' },
  { id: -33, name: 'Android 14 (-33)', desc: 'Người máy sát thủ 14' },
  { id: -34, name: 'Android 15 (-34)', desc: 'Người máy sát thủ 15' },
  { id: -35, name: 'Pic (-35)', desc: 'Sát thủ Hắc Ám Pic' },
  { id: -36, name: 'Poc (-36)', desc: 'Sát thủ Hắc Ám Poc' },
  { id: -37, name: 'King Kong (-37)', desc: 'Quái vật King Kong' },
  { id: -100, name: 'Xên Bọ Hung Cấp 1 (-100)', desc: 'Thể sơ cấp Cell' },
  { id: -101, name: 'Siêu Bọ Hung Hoàn Thiện (-101)', desc: 'Perfect Cell' },
  { id: -102, name: 'Xên Con 1 (-102)', desc: 'Cell Jr 1' },
  { id: -103, name: 'Xên Con 2 (-103)', desc: 'Cell Jr 2' },
  { id: -1822, name: 'Broly Thường (-1822)', desc: 'Siêu Saiyan huyền thoại' },
  { id: -82282, name: 'Super Broly (-82282)', desc: 'Broly sức mạnh bộc phát tối thượng' },
  { id: -203, name: 'Black Goku (-203)', desc: 'Bản thể bóng tối Goku Black' },
  { id: -203999, name: 'Cumber Tà Ác (-203999)', desc: 'Saiyan Tà Ác Cumber' },
  { id: -236, name: 'Ma Bư Mập 12h (-236)', desc: 'Majin Buu béo' },
  { id: -800, name: 'Thỏ Đại Ca (-800)', desc: 'Boss Mini Thỏ biến củ cà rốt' },
  { id: -77, name: 'Sói Héc Quyn (-77)', desc: 'Dã thú hoang dã hung tợn' },
  { id: -78, name: 'Ố Đồ 1 (-78)', desc: 'Mini Boss Ố Đồ' },
  { id: -79, name: 'Virus Mini (-79)', desc: 'Bệnh dịch tí hon gây độc' },
  { id: -799, name: 'Mặt Trời Tí Hon (-799)', desc: 'Quả cầu lửa mini' },
  { id: -4, name: 'Trung Úy Trắng (-4)', desc: 'Chỉ huy Doanh Trại Độc Nhãn' },
  { id: -5, name: 'Trung Úy Thép (-5)', desc: 'Cơ bắp kim loại Red Ribbon' },
  { id: -6, name: 'Trung Úy Xanh Lơ (-6)', desc: 'Sĩ quan Red Ribbon' },
  { id: -7, name: 'Ninja Áo Tím (-7)', desc: 'Ninja phân thân Doanh trại' },
  { id: -8, name: 'Robot Vệ Sĩ (-8)', desc: 'Robot bảo vệ căn cứ Red Ribbon' },
  { id: -15, name: 'Ăn Trộm (-15)', desc: 'Boss móc túi nhặt vàng người chơi' },
  { id: -16, name: 'Rồng Nhí (-16)', desc: 'Rồng con mini' },
];

const SKILL_CATALOG = [
  { id: 0, name: 'Dragon (Đấm Dragon)', type: 'physical', range: 100 },
  { id: 1, name: 'Kamejoko', type: 'energy', range: 350 },
  { id: 2, name: 'Demon (Đấm Quỷ)', type: 'physical', range: 100 },
  { id: 3, name: 'Masenko', type: 'energy', range: 350 },
  { id: 4, name: 'Galick (Đấm Galick)', type: 'physical', range: 100 },
  { id: 5, name: 'Antomic', type: 'energy', range: 350 },
  { id: 6, name: 'Thái Dương Hạ San (Choáng)', type: 'support', range: 400 },
  { id: 7, name: 'Trị Thương (Hồi Máu)', type: 'support', range: 300 },
  { id: 8, name: 'Tái Tạo Năng Lượng (Gồng KI)', type: 'buff', range: 200 },
  { id: 9, name: 'Kaioken (Tăng Công)', type: 'buff', range: 100 },
  { id: 10, name: 'Quả Cầu Kênh Khi (Genki Dama)', type: 'ultimate', range: 500 },
  { id: 11, name: 'Makankosappo (Tia Laze)', type: 'energy', range: 450 },
  { id: 12, name: 'Đẻ Trứng (Gọi Đệ Tử)', type: 'summon', range: 300 },
  { id: 13, name: 'Biến Khỉ (Hóa Khỉ Đột)', type: 'transform', range: 200 },
  { id: 14, name: 'Tự Sát (Phát Nổ)', type: 'ultimate', range: 250 },
  { id: 17, name: 'Liên Hoàn (Đấm Liên Hoàn)', type: 'physical', range: 120 },
  { id: 18, name: 'Biến Socola', type: 'crowd_control', range: 300 },
  { id: 19, name: 'Khiên Năng Lượng (Bất Tử Tạm Thời)', type: 'defense', range: 100 },
  { id: 20, name: 'Dịch Chuyển Tức Thời', type: 'mobility', range: 600 },
  { id: 21, name: 'Huýt Sáo (Tăng Máu)', type: 'buff', range: 300 },
  { id: 22, name: 'Thôi Miên (Ngủ)', type: 'crowd_control', range: 300 },
  { id: 23, name: 'Trói (Khóa Mục Tiêu)', type: 'crowd_control', range: 300 },
  { id: 24, name: 'Super Kamejoko', type: 'ultimate', range: 500 },
  { id: 25, name: 'Liên Hoàn Chưởng', type: 'energy', range: 400 },
  { id: 26, name: 'Ma Phong Ba (Bình Chứa Ma Quái)', type: 'ultimate', range: 350 },
];

const AURA_OPTIONS = [
  { id: 0, name: '0 - Không có Aura' },
  { id: 1, name: '1 - Xanh Dương (Super Saiyan Blue)' },
  { id: 2, name: '2 - Đỏ Hồng (Super Saiyan God / Rose)' },
  { id: 3, name: '3 - Vàng Kim (Super Saiyan)' },
  { id: 4, name: '4 - Tím Hắc Ám (Hakai / Zamasu)' },
  { id: 5, name: '5 - Trắng Bạc (Bản Năng Vô Cực)' },
  { id: 6, name: '6 - Xanh Lục (Broly Cuồng Nộ)' },
  { id: 7, name: '7 - Cầu Vồng Thần Thánh' },
  { id: 8, name: '8 - Tia Chớp Sấm Sét' },
  { id: 9, name: '9 - Lửa Đỏ Rực Cháy' },
  { id: 10, name: '10 - Hào Quang Tối Thượng' },
];

export default function MapBossModal({
  isOpen,
  onClose,
  mapId,
  mapName,
  initialBoss,
  existingBosses = [],
  mapWidth = 2000,
  onSaveSuccess,
}) {
  const [activeTab, setActiveTab] = useState('appearance'); // appearance, location, skills, drops, rules
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Disguise Item Template Fast Search & Selection
  const [disguiseQuery, setDisguiseQuery] = useState('');
  const [disguisesList, setDisguisesList] = useState([]);
  const [loadingDisguises, setLoadingDisguises] = useState(false);
  const [selectedDisguiseItem, setSelectedDisguiseItem] = useState(null);

  // Item Search for Drops
  const [itemQuery, setItemQuery] = useState('');
  const [itemSearchResults, setItemSearchResults] = useState([]);
  const [searchingItems, setSearchingItems] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    bossId: -1001,
    isCustom: true,
    bossName: '',
    disguiseId: null,
    head: -1,
    body: -1,
    leg: -1,
    flagBag: 0,
    aura: 0,
    effFront: 0,
    hpMax: 50000000,
    dame: 25000,
    gender: 0,
    enabled: true,
    spawnX: 400,
    spawnY: 300,
    patrolMinX: 200,
    patrolMaxX: 600,
    moveSpeed: 4,
    aiBehavior: 'PATROL',
    zonePolicy: 'random',
    zoneMin: 0,
    zoneMax: 20,
    spawnChancePercent: 100,
    respawnMinSec: 300,
    respawnMaxSec: 600,
    maxActive: 1,
    spawnConditionType: 'TIMER',
    spawnConditionData: { mobTempId: -1, requiredKills: 30 },
    bossesTogether: [],
    textAppear: 'Ngươi to gan lắm mới dám xâm phạm lãnh địa của ta!',
    textChat: 'Chết đi lũ sâu bọ!',
    textDie: 'Hãy đợi đấy... ta sẽ quay lại báo thù!',
    worldNotify: true,
    worldNotifyText: '',
    skills: [],
    drops: [],
  });

  // Calculate next available custom Boss ID
  const nextCustomBossId = useMemo(() => {
    const customIds = (existingBosses || [])
      .map((b) => Number(b.bossId))
      .filter((id) => Number.isFinite(id) && id <= -1000);
    if (!customIds.length) return -1001;
    return Math.min(...customIds) - 1;
  }, [existingBosses]);

  // Load all disguise item templates on modal open
  const fetchDisguises = async (q = '') => {
    setLoadingDisguises(true);
    try {
      const serverId = getServerId();
      const res = await apiGet(`/api/v1/boss-config/disguises?q=${encodeURIComponent(q)}&limit=3000`, serverId);
      if (res?.ok) {
        setDisguisesList(res.data || []);
      }
    } catch (e) {
      console.error('Fetch disguises error:', e);
    } finally {
      setLoadingDisguises(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDisguises('');
    }
  }, [isOpen]);

  // Filtered disguises in fast selector (Search across all items)
  const filteredDisguises = useMemo(() => {
    if (!disguiseQuery.trim()) return disguisesList;
    const q = disguiseQuery.toLowerCase().trim();
    return disguisesList.filter(
      (d) => String(d.id).includes(q) || (d.name && d.name.toLowerCase().includes(q))
    );
  }, [disguisesList, disguiseQuery]);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    setSuccessMsg('');
    if (initialBoss) {
      const isCustom = (initialBoss.bossId <= -1000) || Boolean(initialBoss.disguiseId || initialBoss.bossName);
      setFormData({
        bossId: initialBoss.bossId ?? nextCustomBossId,
        isCustom,
        bossName: initialBoss.bossName || '',
        disguiseId: initialBoss.disguiseId ?? null,
        head: initialBoss.head ?? -1,
        body: initialBoss.body ?? -1,
        leg: initialBoss.leg ?? -1,
        flagBag: initialBoss.flagBag ?? 0,
        aura: initialBoss.aura ?? 0,
        effFront: initialBoss.effFront ?? 0,
        hpMax: initialBoss.hpMax ?? 50000000,
        dame: initialBoss.dame ?? 25000,
        gender: initialBoss.gender ?? 0,
        enabled: initialBoss.enabled ?? true,
        spawnX: initialBoss.spawnX ?? 400,
        spawnY: initialBoss.spawnY ?? 300,
        patrolMinX: initialBoss.patrolMinX ?? Math.max(0, (initialBoss.spawnX ?? 400) - 200),
        patrolMaxX: initialBoss.patrolMaxX ?? Math.min(mapWidth, (initialBoss.spawnX ?? 400) + 200),
        moveSpeed: initialBoss.moveSpeed ?? 4,
        aiBehavior: initialBoss.aiBehavior ?? 'PATROL',
        zonePolicy: initialBoss.zonePolicy ?? 'random',
        zoneMin: initialBoss.zoneMin ?? 0,
        zoneMax: initialBoss.zoneMax ?? 20,
        spawnChancePercent: initialBoss.spawnChancePercent ?? 100,
        respawnMinSec: initialBoss.respawnMinSec ?? 300,
        respawnMaxSec: initialBoss.respawnMaxSec ?? 600,
        maxActive: initialBoss.maxActive ?? 1,
        spawnConditionType: initialBoss.spawnConditionType ?? 'TIMER',
        spawnConditionData: initialBoss.spawnConditionData ?? { mobTempId: -1, requiredKills: 30 },
        bossesTogether: initialBoss.bossesTogether ?? [],
        textAppear: initialBoss.textAppear ?? 'Ngươi to gan lắm mới dám xâm phạm lãnh địa của ta!',
        textChat: initialBoss.textChat ?? 'Chết đi lũ sâu bọ!',
        textDie: initialBoss.textDie ?? 'Hãy đợi đấy... ta sẽ quay lại báo thù!',
        worldNotify: initialBoss.worldNotify ?? true,
        worldNotifyText: initialBoss.worldNotifyText || '',
        skills: initialBoss.skills ? [...initialBoss.skills] : [],
        drops: initialBoss.drops ? [...initialBoss.drops] : [],
      });
    } else {
      // New Boss form
      setFormData({
        bossId: nextCustomBossId,
        isCustom: true,
        bossName: 'Boss Cải Trang Mới',
        disguiseId: null,
        head: -1,
        body: -1,
        leg: -1,
        flagBag: 0,
        aura: 0,
        effFront: 0,
        hpMax: 50000000,
        dame: 25000,
        gender: 0,
        enabled: true,
        spawnX: Math.round(mapWidth / 2),
        spawnY: 300,
        patrolMinX: Math.max(0, Math.round(mapWidth / 2) - 250),
        patrolMaxX: Math.min(mapWidth, Math.round(mapWidth / 2) + 250),
        moveSpeed: 4,
        aiBehavior: 'PATROL',
        zonePolicy: 'random',
        zoneMin: 0,
        zoneMax: 20,
        spawnChancePercent: 100,
        respawnMinSec: 300,
        respawnMaxSec: 600,
        maxActive: 1,
        spawnConditionType: 'TIMER',
        spawnConditionData: { mobTempId: -1, requiredKills: 30 },
        bossesTogether: [],
        textAppear: 'Ngươi to gan lắm mới dám xâm phạm lãnh địa của ta!',
        textChat: 'Chết đi lũ sâu bọ!',
        textDie: 'Hãy đợi đấy... ta sẽ quay lại báo thù!',
        worldNotify: true,
        worldNotifyText: '',
        skills: [
          { skillId: 1, skillLevel: 7, cooldownMs: 3000, chancePercent: 40, rangeDistance: 350, triggerCondition: 'NONE' },
          { skillId: 6, skillLevel: 3, cooldownMs: 15000, chancePercent: 100, rangeDistance: 400, triggerCondition: 'HP_BELOW_50' },
        ],
        drops: [
          {
            tempId: 457,
            itemName: 'Thỏi vàng',
            enabled: true,
            chancePercent: 100,
            quantityMin: 1,
            quantityMax: 5,
            spreadCountMin: 2,
            spreadCountMax: 4,
            spreadDistance: 30,
            playerLevelMin: 0,
            playerLevelMax: 999,
            timeStartMin: 0,
            timeEndMin: 1440,
            options: [],
          },
        ],
      });
    }
  }, [isOpen, initialBoss, mapWidth, nextCustomBossId]);

  // Fast Disguise Select Handler
  const handleSelectDisguise = (disguise) => {
    if (!disguise) return;
    setSelectedDisguiseItem(disguise);

    let cleanName = (disguise.name || '').replace(/^cải\s*trang\s*/i, '').trim();
    if (cleanName) {
      cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    } else {
      cleanName = disguise.name || `Boss #${disguise.id}`;
    }

    setFormData((prev) => ({
      ...prev,
      isCustom: true,
      disguiseId: disguise.id,
      bossName: cleanName || prev.bossName,
      head: disguise.head >= 0 ? disguise.head : prev.head,
      body: disguise.body >= 0 ? disguise.body : prev.body,
      leg: disguise.leg >= 0 ? disguise.leg : prev.leg,
      gender: disguise.gender >= 0 ? disguise.gender : prev.gender,
      textAppear: `Ta là ${cleanName}! Ngươi to gan lắm mới dám xâm phạm nơi này!`,
      textChat: `Nếm thử chiêu thức của ${cleanName} này!`,
      textDie: `${cleanName} ta không thể thua dễ dàng thế này...!`,
    }));
    setSuccessMsg(`⚡ Đã chọn Cải Trang [#${disguise.id}] ${disguise.name} làm ngoại hình Boss!`);
  };

  // Search Items for Drops
  const handleSearchItems = async () => {
    if (!itemQuery.trim()) return;
    setSearchingItems(true);
    try {
      const serverId = getServerId();
      const res = await apiGet(`/api/v1/boss-config/item-templates?q=${encodeURIComponent(itemQuery)}`, serverId);
      if (res?.ok) {
        setItemSearchResults(res.data || []);
      }
    } catch (err) {
      console.error('Search item error:', err);
    } finally {
      setSearchingItems(false);
    }
  };

  const handleAddDropItem = (item) => {
    setFormData((prev) => ({
      ...prev,
      drops: [
        ...prev.drops,
        {
          tempId: item.id,
          itemName: item.name,
          enabled: true,
          chancePercent: 50,
          quantityMin: 1,
          quantityMax: 1,
          spreadCountMin: 1,
          spreadCountMax: 1,
          spreadDistance: 25,
          playerLevelMin: 0,
          playerLevelMax: 999,
          timeStartMin: 0,
          timeEndMin: 1440,
          options: [],
        },
      ],
    }));
  };

  const handleRemoveDropItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      drops: prev.drops.filter((_, i) => i !== index),
    }));
  };

  const handleAddSkill = (skillId = 0) => {
    const catalogItem = SKILL_CATALOG.find((s) => s.id === skillId) || SKILL_CATALOG[0];
    setFormData((prev) => ({
      ...prev,
      skills: [
        ...prev.skills,
        {
          skillId: catalogItem.id,
          skillLevel: 7,
          cooldownMs: 3000,
          chancePercent: 50,
          rangeDistance: catalogItem.range,
          triggerCondition: 'NONE',
        },
      ],
    }));
  };

  const handleRemoveSkill = (index) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const serverId = getServerId();
      const payload = {
        serverId: Number(serverId),
        bossId: Number(formData.bossId),
        mapId: Number(mapId),
        enabled: Boolean(formData.enabled),
        mapIds: [Number(mapId)],
        spawnX: Number(formData.spawnX),
        spawnY: Number(formData.spawnY),
        patrolMinX: Number(formData.patrolMinX),
        patrolMaxX: Number(formData.patrolMaxX),
        moveSpeed: Number(formData.moveSpeed),
        aiBehavior: formData.aiBehavior,
        zonePolicy: formData.zonePolicy,
        zoneMin: Number(formData.zoneMin),
        zoneMax: Number(formData.zoneMax),
        spawnChancePercent: Number(formData.spawnChancePercent),
        respawnMinSec: Number(formData.respawnMinSec),
        respawnMaxSec: Number(formData.respawnMaxSec),
        maxActive: Number(formData.maxActive),
        spawnConditionType: formData.spawnConditionType,
        spawnConditionData: formData.spawnConditionData,
        bossesTogether: formData.bossesTogether,
        textAppear: formData.textAppear,
        textChat: formData.textChat,
        textDie: formData.textDie,
        bossName: formData.bossName || null,
        disguiseId: formData.disguiseId || null,
        head: Number(formData.head),
        body: Number(formData.body),
        leg: Number(formData.leg),
        flagBag: Number(formData.flagBag),
        aura: Number(formData.aura),
        effFront: Number(formData.effFront),
        hpMax: Number(formData.hpMax),
        dame: Number(formData.dame),
        gender: Number(formData.gender),
        worldNotify: Boolean(formData.worldNotify),
        worldNotifyText: formData.worldNotifyText || '',
        skills: formData.skills,
        drops: formData.drops,
      };

      const res = await apiPost(`/boss-config?serverId=${serverId}`, payload);
      if (res?.ok) {
        setSuccessMsg('Đã lưu cấu hình Boss và đồng bộ Live-Sync tức thì vào Game Server!');
        if (onSaveSuccess) onSaveSuccess(payload);
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        setErrorMsg(res?.error || 'Không thể lưu cấu hình Boss');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi lưu Boss');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBoss = async () => {
    const label = formData.bossName ? `Boss #${formData.bossId} (${formData.bossName})` : `Boss #${formData.bossId}`;
    if (!window.confirm(`Bạn có chắc chắn muốn XOÁ ${label} khỏi bản đồ này và toàn bộ máy chủ?`)) return;
    setSaving(true);
    try {
      const serverId = getServerId();
      await apiDelete(`/boss-config/${formData.bossId}?serverId=${serverId}`);
      if (onSaveSuccess) onSaveSuccess({ deleted: true, bossId: Number(formData.bossId) });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi khi xóa Boss');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSpawn = async () => {
    try {
      const serverId = getServerId();
      const res = await apiPost('/api/v1/boss-config/spawn-at', {
        bossId: formData.bossId,
        mapId: Number(mapId),
        zoneId: 0,
        x: formData.spawnX,
        y: formData.spawnY,
      }, serverId);
      if (res?.ok) {
        setSuccessMsg(`Đã triệu hồi Boss #${formData.bossId} (${formData.bossName || 'Boss'}) tại Map ${mapId} Khu 0 (${formData.spawnX}, ${formData.spawnY})!`);
      } else {
        setErrorMsg(res?.error || 'Lỗi triệu hồi thử nghiệm');
      }
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="boss-modal-overlay">
      <div className="boss-modal-container">
        {/* Modal Header */}
        <div className="boss-modal-header">
          <div className="boss-modal-title">
            <span className="boss-header-icon">👹</span>
            <div>
              <h3>
                {formData.bossName ? `${formData.bossName} (${formData.bossId})` : `Quản lý Boss ID: ${formData.bossId}`}
                {formData.isCustom && <span className="custom-boss-badge">👑 Boss Cải Trang</span>}
              </h3>
              <p className="boss-header-sub">
                Bản đồ: <strong>{mapName} (#{mapId})</strong> | Tọa độ xuất hiện: ({formData.spawnX}, {formData.spawnY})
              </p>
            </div>
          </div>
          <button className="boss-close-btn" onClick={onClose} title="Đóng">✕</button>
        </div>

        {/* Modal Tabs */}
        <div className="boss-modal-tabs">
          <button
            className={`boss-tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            🎭 Chọn Cải Trang & Chỉ số
          </button>
          <button
            className={`boss-tab-btn ${activeTab === 'location' ? 'active' : ''}`}
            onClick={() => setActiveTab('location')}
          >
            📍 Vị trí & Tuần tra
          </button>
          <button
            className={`boss-tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
            onClick={() => setActiveTab('skills')}
          >
            ⚡ Kỹ năng ({formData.skills.length})
          </button>
          <button
            className={`boss-tab-btn ${activeTab === 'drops' ? 'active' : ''}`}
            onClick={() => setActiveTab('drops')}
          >
            🎁 Rơi đồ ({formData.drops.length})
          </button>
          <button
            className={`boss-tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
            onClick={() => setActiveTab('rules')}
          >
            📜 Điều kiện & Lời thoại
          </button>
        </div>

        {/* Modal Notifications */}
        {errorMsg && <div className="boss-alert boss-alert-error">⚠️ {errorMsg}</div>}
        {successMsg && <div className="boss-alert boss-alert-success">✅ {successMsg}</div>}

        {/* Tab Body */}
        <div className="boss-modal-body">
          {/* TAB 1: CHỌN CẢI TRANG TỪ ITEM TEMPLATE & CHỈ SỐ */}
          {activeTab === 'appearance' && (
            <div className="boss-tab-pane">
              {/* PRIMARY DISGUISE TEMPLATE PICKER BOX */}
              <div className="fast-disguise-selector-container">
                <div className="fast-disguise-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>⚡</span>
                    <strong>Chọn Cải Trang từ Danh Sách Item Template (Nhanh 1-Click):</strong>
                  </div>
                  <span className="disguise-count-badge">
                    {filteredDisguises.length} / {disguisesList.length} Cải trang
                  </span>
                </div>

                {/* Instant Search Bar */}
                <div className="fast-disguise-search-row">
                  <input
                    type="text"
                    className="boss-input"
                    placeholder="🔍 Gõ tìm tên Cải Trang hoặc ID (ví dụ: Goku, Broly, Zamasu, Fide, Beerus, 1087, 461...)"
                    value={disguiseQuery}
                    onChange={(e) => setDisguiseQuery(e.target.value)}
                  />
                  {disguiseQuery && (
                    <button
                      type="button"
                      className="btn-clear-search"
                      onClick={() => setDisguiseQuery('')}
                    >
                      ✕ Xóa tìm
                    </button>
                  )}
                </div>

                {/* Dropdown Select / Quick Grid */}
                <div className="fast-disguise-scroll-list">
                  {loadingDisguises ? (
                    <div className="disguise-loading-state">Đang tải danh sách Item Template Cải Trang...</div>
                  ) : !filteredDisguises.length ? (
                    <div className="disguise-empty-state">Không tìm thấy Cải Trang nào với từ khóa "{disguiseQuery}"</div>
                  ) : (
                    filteredDisguises.map((d) => {
                      const isSelected = formData.disguiseId === d.id;
                      return (
                        <div
                          key={d.id}
                          className={`fast-disguise-card ${isSelected ? 'active selected' : ''}`}
                          onClick={() => handleSelectDisguise(d)}
                        >
                          <div className="fast-disguise-icon-box">
                            <ItemIcon iconId={d.iconId} tempId={d.id} name={d.name} size={42} />
                          </div>
                          <div className="fast-disguise-main-content">
                            <div className="fast-disguise-top">
                              <span className="fast-disguise-id">#{d.id}</span>
                              <span className="fast-disguise-name" title={d.name}>{d.name}</span>
                            </div>
                            <div className="fast-disguise-parts">
                              <span>Đầu: <strong>{d.head >= 0 ? d.head : '-'}</strong></span>
                              <span>Thân: <strong>{d.body >= 0 ? d.body : '-'}</strong></span>
                              <span>Chân: <strong>{d.leg >= 0 ? d.leg : '-'}</strong></span>
                            </div>
                            {isSelected && <div className="fast-disguise-active-mark">✓ Đang Chọn</div>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* CURRENT SELECTED DISGUISE PREVIEW BANNER */}
              {formData.disguiseId && (
                <div className="selected-disguise-preview-banner">
                  <div className="preview-banner-icon">
                    <ItemIcon
                      iconId={selectedDisguiseItem?.iconId}
                      tempId={formData.disguiseId}
                      name={formData.bossName}
                      size={46}
                    />
                  </div>
                  <div className="preview-banner-info">
                    <div className="preview-banner-title">
                      Đang áp dụng: <strong>{formData.bossName}</strong> (Cải Trang #{formData.disguiseId})
                    </div>
                    <div className="preview-banner-sub">
                      Part Đầu: <code>{formData.head}</code> | Part Thân: <code>{formData.body}</code> | Part Chân: <code>{formData.leg}</code>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-clear-disguise"
                    onClick={() => setFormData((prev) => ({ ...prev, disguiseId: null }))}
                  >
                    Bỏ chọn Cải Trang
                  </button>
                </div>
              )}

              {/* Boss Identity */}
              <div className="boss-grid-2col" style={{ marginTop: '14px' }}>
                <div className="boss-field-group">
                  <label>Mã ID Boss</label>
                  <select
                    value={formData.bossId}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const preset = BUILTIN_BOSS_PRESETS.find((p) => p.id === val);
                      setFormData((prev) => ({
                        ...prev,
                        bossId: val,
                        isCustom: val <= -1000,
                        bossName: preset ? preset.name.split(' (')[0] : prev.bossName,
                      }));
                    }}
                    className="boss-input"
                  >
                    <optgroup label="👑 Boss Tùy Biến (Custom ID)">
                      <option value={formData.bossId}>
                        {formData.bossName || `Custom Boss`} ({formData.bossId})
                      </option>
                      <option value={nextCustomBossId}>
                        + Cấp ID Boss Mới Tự Động ({nextCustomBossId})
                      </option>
                    </optgroup>
                    <optgroup label="👾 Mẫu Boss Gốc Hệ Thống">
                      {BUILTIN_BOSS_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="boss-field-group">
                  <label>Tên hiển thị của Boss in-game</label>
                  <input
                    type="text"
                    className="boss-input"
                    placeholder="Ví dụ: Goku Bản Năng Vô Cực, Broly Hắc Ám..."
                    value={formData.bossName}
                    onChange={(e) => setFormData({ ...formData, bossName: e.target.value })}
                  />
                </div>
              </div>

              {/* Outfit Parts */}
              <div className="boss-section-title">👗 Ngoại Trang & Hiệu Ứng (Outfit Parts)</div>
              <div className="boss-grid-3col">
                <div className="boss-field-group">
                  <label>Part Đầu (Head)</label>
                  <input
                    type="number"
                    className="boss-input"
                    placeholder="-1 (Mặc định)"
                    value={formData.head}
                    onChange={(e) => setFormData({ ...formData, head: Number(e.target.value) })}
                  />
                </div>
                <div className="boss-field-group">
                  <label>Part Thân (Body)</label>
                  <input
                    type="number"
                    className="boss-input"
                    placeholder="-1 (Mặc định)"
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: Number(e.target.value) })}
                  />
                </div>
                <div className="boss-field-group">
                  <label>Part Chân (Leg)</label>
                  <input
                    type="number"
                    className="boss-input"
                    placeholder="-1 (Mặc định)"
                    value={formData.leg}
                    onChange={(e) => setFormData({ ...formData, leg: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="boss-grid-3col" style={{ marginTop: '10px' }}>
                <div className="boss-field-group">
                  <label>Hào Quang Aura</label>
                  <select
                    className="boss-input"
                    value={formData.aura}
                    onChange={(e) => setFormData({ ...formData, aura: Number(e.target.value) })}
                  >
                    {AURA_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="boss-field-group">
                  <label>Phụ kiện Lưng (FlagBag)</label>
                  <input
                    type="number"
                    className="boss-input"
                    placeholder="0 (Không đeo)"
                    value={formData.flagBag}
                    onChange={(e) => setFormData({ ...formData, flagBag: Number(e.target.value) })}
                  />
                </div>
                <div className="boss-field-group">
                  <label>Hiệu ứng Phía Trước (EffFront)</label>
                  <input
                    type="number"
                    className="boss-input"
                    placeholder="0 (Không có)"
                    value={formData.effFront}
                    onChange={(e) => setFormData({ ...formData, effFront: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Combat Stats */}
              <div className="boss-section-title" style={{ marginTop: '16px' }}>⚔️ Chỉ Số Chiến Đấu</div>
              <div className="boss-grid-3col">
                <div className="boss-field-group">
                  <label>HP Tối Đa (Máu)</label>
                  <input
                    type="number"
                    className="boss-input"
                    value={formData.hpMax}
                    onChange={(e) => setFormData({ ...formData, hpMax: Math.max(1, Number(e.target.value)) })}
                  />
                  <small className="boss-hint">{formData.hpMax.toLocaleString('vi-VN')} HP</small>
                </div>
                <div className="boss-field-group">
                  <label>Sát Thương Cơ Bản (Dame)</label>
                  <input
                    type="number"
                    className="boss-input"
                    value={formData.dame}
                    onChange={(e) => setFormData({ ...formData, dame: Math.max(1, Number(e.target.value)) })}
                  />
                  <small className="boss-hint">{formData.dame.toLocaleString('vi-VN')} Dame</small>
                </div>
                <div className="boss-field-group">
                  <label>Hành Tinh / Giới Tính</label>
                  <select
                    className="boss-input"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: Number(e.target.value) })}
                  >
                    <option value={0}>0 - Trái Đất</option>
                    <option value={1}>1 - Namếc</option>
                    <option value={2}>2 - Xayda</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VỊ TRÍ & TUẦN TRA */}
          {activeTab === 'location' && (
            <div className="boss-tab-pane">
              <div className="boss-grid-2col">
                <div className="boss-field-group">
                  <label>Tọa độ xuất hiện X (Spawn X)</label>
                  <input
                    type="number"
                    className="boss-input"
                    value={formData.spawnX}
                    onChange={(e) => setFormData({ ...formData, spawnX: Number(e.target.value) })}
                  />
                </div>
                <div className="boss-field-group">
                  <label>Tọa độ xuất hiện Y (Spawn Y)</label>
                  <input
                    type="number"
                    className="boss-input"
                    value={formData.spawnY}
                    onChange={(e) => setFormData({ ...formData, spawnY: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="boss-patrol-slider-box">
                <div className="boss-patrol-header">
                  <span>Phạm vi Tuần Tra / Hoạt động trong Map:</span>
                  <strong>X: {formData.patrolMinX}px ➔ {formData.patrolMaxX}px (Độ rộng: {formData.patrolMaxX - formData.patrolMinX}px)</strong>
                </div>
                <div className="boss-patrol-track-preview">
                  <div
                    className="boss-patrol-highlight"
                    style={{
                      left: `${Math.max(0, Math.min(100, (formData.patrolMinX / mapWidth) * 100))}%`,
                      width: `${Math.max(2, Math.min(100, ((formData.patrolMaxX - formData.patrolMinX) / mapWidth) * 100))}%`,
                    }}
                  />
                  <div
                    className="boss-spawn-point-marker"
                    style={{
                      left: `${Math.max(0, Math.min(100, (formData.spawnX / mapWidth) * 100))}%`,
                    }}
                    title={`Spawn Point (${formData.spawnX}px)`}
                  />
                </div>
                <div className="boss-grid-2col" style={{ marginTop: '10px' }}>
                  <div className="boss-field-group">
                    <label>Tuần tra Min X</label>
                    <input
                      type="number"
                      className="boss-input"
                      value={formData.patrolMinX}
                      onChange={(e) => setFormData({ ...formData, patrolMinX: Number(e.target.value) })}
                    />
                  </div>
                  <div className="boss-field-group">
                    <label>Tuần tra Max X</label>
                    <input
                      type="number"
                      className="boss-input"
                      value={formData.patrolMaxX}
                      onChange={(e) => setFormData({ ...formData, patrolMaxX: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="boss-grid-3col" style={{ marginTop: '14px' }}>
                <div className="boss-field-group">
                  <label>Tốc độ di chuyển</label>
                  <input
                    type="number"
                    className="boss-input"
                    value={formData.moveSpeed}
                    onChange={(e) => setFormData({ ...formData, moveSpeed: Math.max(1, Number(e.target.value)) })}
                  />
                </div>
                <div className="boss-field-group">
                  <label>Hành vi AI</label>
                  <select
                    className="boss-input"
                    value={formData.aiBehavior}
                    onChange={(e) => setFormData({ ...formData, aiBehavior: e.target.value })}
                  >
                    <option value="PATROL">Tuần tra qua lại (PATROL)</option>
                    <option value="STAND">Đứng yên tại chỗ (STAND)</option>
                    <option value="CHASE">Truy đuổi mục tiêu (CHASE)</option>
                  </select>
                </div>
                <div className="boss-field-group">
                  <label>Chính sách Khu vực (Zone)</label>
                  <select
                    className="boss-input"
                    value={formData.zonePolicy}
                    onChange={(e) => setFormData({ ...formData, zonePolicy: e.target.value })}
                  >
                    <option value="random">Ngẫu nhiên khu vực (Random)</option>
                    <option value="fixed">Cố định khu thấp nhất (Fixed)</option>
                    <option value="all">Toàn bộ khu vực (All Zones)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: KỸ NĂNG (SKILLS) */}
          {activeTab === 'skills' && (
            <div className="boss-tab-pane">
              <div className="boss-pane-toolbar">
                <div>
                  <h4>Danh sách Kỹ Năng của Boss</h4>
                  <p>Cấu hình cấp độ, thời gian hồi chiêu, tỉ lệ và tầm đánh cho từng chiêu thức.</p>
                </div>
                <button
                  type="button"
                  className="boss-btn-primary"
                  onClick={() => handleAddSkill(0)}
                >
                  + Thêm Kỹ Năng
                </button>
              </div>

              {!formData.skills.length ? (
                <div className="boss-empty-state">
                  Chưa có kỹ năng tùy chỉnh. Boss sẽ sử dụng bộ skill mặc định của template.
                </div>
              ) : (
                <div className="boss-skill-list">
                  {formData.skills.map((skill, index) => {
                    return (
                      <div key={index} className="boss-skill-card">
                        <div className="boss-skill-card-row">
                          <div style={{ flex: 2 }}>
                            <label>Kỹ năng</label>
                            <select
                              className="boss-input"
                              value={skill.skillId}
                              onChange={(e) => {
                                const newId = Number(e.target.value);
                                const cat = SKILL_CATALOG.find((s) => s.id === newId);
                                const updated = [...formData.skills];
                                updated[index].skillId = newId;
                                if (cat) updated[index].rangeDistance = cat.range;
                                setFormData({ ...formData, skills: updated });
                              }}
                            >
                              {SKILL_CATALOG.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} (Tầm {s.range}px)
                                </option>
                              ))}
                            </select>
                          </div>
                          <div style={{ flex: 1 }}>
                            <label>Cấp chiêu (Level)</label>
                            <input
                              type="number"
                              className="boss-input"
                              min="1"
                              max="10"
                              value={skill.skillLevel}
                              onChange={(e) => {
                                const updated = [...formData.skills];
                                updated[index].skillLevel = Number(e.target.value);
                                setFormData({ ...formData, skills: updated });
                              }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label>Hồi chiêu (ms)</label>
                            <input
                              type="number"
                              className="boss-input"
                              step="500"
                              value={skill.cooldownMs}
                              onChange={(e) => {
                                const updated = [...formData.skills];
                                updated[index].cooldownMs = Number(e.target.value);
                                setFormData({ ...formData, skills: updated });
                              }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label>Tỉ lệ ra chiêu (%)</label>
                            <input
                              type="number"
                              className="boss-input"
                              min="1"
                              max="100"
                              value={skill.chancePercent}
                              onChange={(e) => {
                                const updated = [...formData.skills];
                                updated[index].chancePercent = Number(e.target.value);
                                setFormData({ ...formData, skills: updated });
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            className="boss-btn-remove"
                            onClick={() => handleRemoveSkill(index)}
                            title="Xóa kỹ năng này"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: RƠI ĐỒ CHUẨN QUÁI (DROPS) */}
          {activeTab === 'drops' && (
            <div className="boss-tab-pane">
              <div className="boss-pane-toolbar">
                <div style={{ flex: 1 }}>
                  <div className="boss-search-bar">
                    <input
                      type="text"
                      className="boss-input"
                      placeholder="Tìm kiếm vật phẩm rơi theo tên hoặc ID (ví dụ: Thỏi vàng, 457, Cải trang...)"
                      value={itemQuery}
                      onChange={(e) => setItemQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchItems()}
                    />
                    <button type="button" className="boss-btn-secondary" onClick={handleSearchItems}>
                      {searchingItems ? 'Đang tìm...' : 'Tìm Item'}
                    </button>
                  </div>
                  {itemSearchResults.length > 0 && (
                    <div className="boss-search-dropdown">
                      {itemSearchResults.map((it) => (
                        <div key={it.id} className="boss-search-dropdown-item" onClick={() => handleAddDropItem(it)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ItemIcon iconId={it.icon_id || it.iconId} tempId={it.id} name={it.name} size={28} />
                            <span>#{it.id} - <strong>{it.name}</strong></span>
                          </div>
                          <span className="boss-badge">+ Thêm rơi</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {!formData.drops.length ? (
                <div className="boss-empty-state">
                  Chưa có danh sách vật phẩm rơi tùy biến. Boss sẽ rơi đồ theo helper mặc định của mã nguồn.
                </div>
              ) : (
                <div className="boss-drop-list">
                  {formData.drops.map((drop, index) => (
                    <div key={index} className="boss-drop-card">
                      <div className="boss-drop-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <ItemIcon iconId={drop.iconId} tempId={drop.tempId} name={drop.itemName} size={28} />
                          <span>Item #{drop.tempId}: <strong>{drop.itemName || `Item #${drop.tempId}`}</strong></span>
                        </div>
                        <button
                          type="button"
                          className="boss-btn-remove-sm"
                          onClick={() => handleRemoveDropItem(index)}
                        >
                          ✕ Xóa
                        </button>
                      </div>
                      <div className="boss-grid-4col" style={{ marginTop: '6px' }}>
                        <div>
                          <label>Tỉ lệ rớt (%)</label>
                          <input
                            type="number"
                            className="boss-input"
                            value={drop.chancePercent}
                            onChange={(e) => {
                              const updated = [...formData.drops];
                              updated[index].chancePercent = Number(e.target.value);
                              setFormData({ ...formData, drops: updated });
                            }}
                          />
                        </div>
                        <div>
                          <label>Số lượng (Min - Max)</label>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <input
                              type="number"
                              className="boss-input"
                              value={drop.quantityMin}
                              onChange={(e) => {
                                const updated = [...formData.drops];
                                updated[index].quantityMin = Number(e.target.value);
                                setFormData({ ...formData, drops: updated });
                              }}
                            />
                            <input
                              type="number"
                              className="boss-input"
                              value={drop.quantityMax}
                              onChange={(e) => {
                                const updated = [...formData.drops];
                                updated[index].quantityMax = Number(e.target.value);
                                setFormData({ ...formData, drops: updated });
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <label>Văng cọc đồ (Min - Max)</label>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <input
                              type="number"
                              className="boss-input"
                              value={drop.spreadCountMin}
                              onChange={(e) => {
                                const updated = [...formData.drops];
                                updated[index].spreadCountMin = Number(e.target.value);
                                setFormData({ ...formData, drops: updated });
                              }}
                            />
                            <input
                              type="number"
                              className="boss-input"
                              value={drop.spreadCountMax}
                              onChange={(e) => {
                                const updated = [...formData.drops];
                                updated[index].spreadCountMax = Number(e.target.value);
                                setFormData({ ...formData, drops: updated });
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <label>Khoảng cách văng (px)</label>
                          <input
                            type="number"
                            className="boss-input"
                            value={drop.spreadDistance}
                            onChange={(e) => {
                              const updated = [...formData.drops];
                              updated[index].spreadDistance = Number(e.target.value);
                              setFormData({ ...formData, drops: updated });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ĐIỀU KIỆN & LỜI THOẠI (RULES & DIALOGUES) */}
          {activeTab === 'rules' && (
            <div className="boss-tab-pane">
              <div className="boss-grid-2col">
                <div className="boss-field-group">
                  <label>Thời gian hồi sinh tối thiểu (Giây)</label>
                  <input
                    type="number"
                    className="boss-input"
                    value={formData.respawnMinSec}
                    onChange={(e) => setFormData({ ...formData, respawnMinSec: Number(e.target.value) })}
                  />
                </div>
                <div className="boss-field-group">
                  <label>Thời gian hồi sinh tối đa (Giây)</label>
                  <input
                    type="number"
                    className="boss-input"
                    value={formData.respawnMaxSec}
                    onChange={(e) => setFormData({ ...formData, respawnMaxSec: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="boss-section-title" style={{ marginTop: '14px' }}>📢 Thông Báo Kênh Thế Giới (World Broadcast)</div>
              <div className="boss-field-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#f8fafc', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={formData.worldNotify}
                    onChange={(e) => setFormData({ ...formData, worldNotify: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Bật thông báo trên kênh thế giới khi Boss xuất hiện (Toàn server)</span>
                </label>
              </div>
              {formData.worldNotify && (
                <div className="boss-field-group" style={{ marginTop: '8px' }}>
                  <label>Mẫu câu thông báo tùy biến (để trống = dùng mẫu mặc định)</label>
                  <input
                    type="text"
                    className="boss-input"
                    placeholder="Ví dụ: BOSS {boss} vừa xuất hiện tại {map} khu {zone}!"
                    value={formData.worldNotifyText}
                    onChange={(e) => setFormData({ ...formData, worldNotifyText: e.target.value })}
                  />
                  <small style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '4px' }}>
                    💡 <em>Biến thay thế tự động: <code>&#123;boss&#125;</code> = Tên Boss, <code>&#123;map&#125;</code> = Tên Bản đồ, <code>&#123;zone&#125;</code> = Khu vực</em>
                  </small>
                </div>
              )}

              <div className="boss-section-title" style={{ marginTop: '14px' }}>🗣️ Lời Thoại Tương Tác Của Boss</div>
              <div className="boss-field-group">
                <label>Lời thoại khi xuất hiện (Chat S)</label>
                <input
                  type="text"
                  className="boss-input"
                  value={formData.textAppear}
                  onChange={(e) => setFormData({ ...formData, textAppear: e.target.value })}
                />
              </div>
              <div className="boss-field-group" style={{ marginTop: '8px' }}>
                <label>Lời thoại khi giao chiến / tấn công (Chat M)</label>
                <input
                  type="text"
                  className="boss-input"
                  value={formData.textChat}
                  onChange={(e) => setFormData({ ...formData, textChat: e.target.value })}
                />
              </div>
              <div className="boss-field-group" style={{ marginTop: '8px' }}>
                <label>Lời thoại khi tử trận / biến mất (Chat E)</label>
                <input
                  type="text"
                  className="boss-input"
                  value={formData.textDie}
                  onChange={(e) => setFormData({ ...formData, textDie: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="boss-modal-footer">
          <div className="boss-footer-left">
            <button
              type="button"
              className="boss-btn-test"
              onClick={handleTestSpawn}
              title="Triệu hồi ngay Boss này vào Map để test in-game"
            >
              🚀 Triệu hồi thử ngay (In-Game)
            </button>
            {initialBoss && (
              <button
                type="button"
                className="boss-btn-danger"
                onClick={handleDeleteBoss}
              >
                🗑️ Xóa Boss
              </button>
            )}
          </div>
          <div className="boss-footer-right">
            <button type="button" className="boss-btn-secondary" onClick={onClose}>
              Hủy bỏ
            </button>
            <button
              type="button"
              className="boss-btn-primary"
              disabled={saving}
              onClick={handleSave}
              style={{
                background: initialBoss ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'linear-gradient(135deg, #16a34a, #15803d)',
                boxShadow: initialBoss ? '0 4px 14px rgba(37, 99, 235, 0.4)' : '0 4px 14px rgba(22, 163, 74, 0.4)',
                fontWeight: 700,
                fontSize: '0.92rem',
                padding: '10px 20px',
              }}
            >
              {saving
                ? '⏳ Đang lưu & Đồng bộ...'
                : (initialBoss ? '💾 Lưu Thay Đổi Cấu Hình Boss' : '➕ Thêm & Lưu Boss Vào Bản Đồ Này')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
