import { query, exec } from '../db.js';
import { addItemToContainer, addInventoryCurrency, parsePlayerPower, asJson } from './playerData.js';

/**
 * Service Tạo & Trao Thưởng Tự Động cho Sự Kiện Đua TOP Server Mới
 */

/**
 * Trả về danh sách vật phẩm và số lượng hồng ngọc tương ứng theo thứ hạng và hạng mục
 */
export function buildTierRewards(rank, category = 'mission') {
  const items = [];
  let ruby = 0;

  // Helper hàm tạo Option đầy đủ cho Cải Trang Broly SSJ4
  const getBrolyOptions = (rankTier) => {
    if (rankTier === 'top1_5') {
      return [
        { id: 73, param: 0 },   // Vĩnh viễn
        { id: 50, param: 35 },  // Sức đánh +35%
        { id: 77, param: 35 },  // HP +35%
        { id: 103, param: 35 }, // KI +35%
        { id: 5, param: 15 },   // +15% sức đánh chí mạng
        { id: 14, param: 5 },   // Chí mạng +5%
        { id: 94, param: 15 },  // Giảm 15% sát thương
        { id: 95, param: 5 },   // Biến 5% tấn công thành HP
        { id: 96, param: 5 },   // Biến 5% tấn công thành KI
        { id: 3, param: 10 },   // Vô hiệu và biến 10% sát thương chưởng thành KI
        { id: 162, param: 3 },  // Cute hồi 3% KI/s bản thân và xung quanh
        { id: 116, param: 1 },  // Kháng Thái Dương Hạ San
        { id: 106, param: 1 },  // Không ảnh hưởng bởi cái lạnh
        { id: 114, param: 15 }, // +15% TĐ chạy
        { id: 101, param: 15 }, // +15% tiềm năng, sức mạnh
        { id: 100, param: 15 }, // +15% vàng từ quái
        { id: 30, param: 0 },   // Không thể giao dịch
      ];
    } else if (rankTier === 'top6_10') {
      return [
        { id: 93, param: 180 }, // HSD 180 ngày
        { id: 50, param: 28 },  // Sức đánh +28%
        { id: 77, param: 28 },  // HP +28%
        { id: 103, param: 28 }, // KI +28%
        { id: 5, param: 10 },   // +10% sức đánh chí mạng
        { id: 14, param: 4 },   // Chí mạng +4%
        { id: 94, param: 12 },  // Giảm 12% sát thương
        { id: 95, param: 4 },   // Biến 4% tấn công thành HP
        { id: 96, param: 4 },   // Biến 4% tấn công thành KI
        { id: 3, param: 8 },    // Vô hiệu và biến 8% sát thương chưởng thành KI
        { id: 162, param: 2 },  // Cute hồi 2% KI/s bản thân và xung quanh
        { id: 116, param: 1 },  // Kháng Thái Dương Hạ San
        { id: 106, param: 1 },  // Không ảnh hưởng bởi cái lạnh
        { id: 114, param: 10 }, // +10% TĐ chạy
        { id: 101, param: 10 }, // +10% tiềm năng, sức mạnh
        { id: 30, param: 0 },   // Không thể giao dịch
      ];
    } else if (rankTier === 'top11_50') {
      return [
        { id: 93, param: 90 },  // HSD 90 ngày
        { id: 50, param: 22 },  // Sức đánh +22%
        { id: 77, param: 22 },  // HP +22%
        { id: 103, param: 22 }, // KI +22%
        { id: 5, param: 8 },    // +8% sức đánh chí mạng
        { id: 14, param: 3 },   // Chí mạng +3%
        { id: 94, param: 8 },   // Giảm 8% sát thương
        { id: 95, param: 3 },   // Biến 3% tấn công thành HP
        { id: 96, param: 3 },   // Biến 3% tấn công thành KI
        { id: 3, param: 5 },    // Vô hiệu và biến 5% sát thương chưởng thành KI
        { id: 162, param: 1 },  // Cute hồi 1% KI/s bản thân và xung quanh
        { id: 114, param: 8 },  // +8% TĐ chạy
        { id: 30, param: 0 },   // Không thể giao dịch
      ];
    } else {
      // top51_100
      return [
        { id: 93, param: 30 },  // HSD 30 ngày
        { id: 50, param: 18 },  // Sức đánh +18%
        { id: 77, param: 18 },  // HP +18%
        { id: 103, param: 18 }, // KI +18%
        { id: 5, param: 5 },    // +5% sức đánh chí mạng
        { id: 14, param: 2 },   // Chí mạng +2%
        { id: 94, param: 5 },   // Giảm 5% sát thương
        { id: 95, param: 2 },   // Biến 2% tấn công thành HP
        { id: 96, param: 2 },   // Biến 2% tấn công thành KI
        { id: 30, param: 0 },   // Không thể giao dịch
      ];
    }
  };

  if (rank === 1) {
    // TOP 1
    ruby = 5000;
    // 5 Capsule kích hoạt
    items.push({
      templateId: 1655,
      quantity: 5,
      options: [{ id: 30, param: 0 }], // Không GD
    });
    // CT Broly SSJ4 Vĩnh viễn Đầy Đủ Option Huyền Thoại
    items.push({
      templateId: 1783,
      quantity: 1,
      options: getBrolyOptions('top1_5'),
    });
    // Ra Đa Ngọc Rồng VIP
    items.push({
      templateId: 1823,
      quantity: 1,
      options: [
        { id: 73, param: 0 },
        { id: 14, param: 5 },
        { id: 100, param: 15 },
        { id: 30, param: 0 },
      ],
    });
    // Giáp Luyện Tập Cấp 5
    items.push({
      templateId: 1869,
      quantity: 1,
      options: [{ id: 73, param: 0 }],
    });
    // Pet Xên Bọ Hung MAX (cho TOP Sức mạnh hoặc Nạp)
    if (category === 'power' || category === 'recharge_points') {
      items.push({
        templateId: 1874,
        quantity: 1,
        options: [
          { id: 73, param: 0 },
          { id: 50, param: 20 },
          { id: 77, param: 20 },
          { id: 103, param: 20 },
          { id: 162, param: 3 },
          { id: 30, param: 0 },
        ],
      });
    }

  } else if (rank === 2) {
    // TOP 2
    ruby = 4000;
    items.push({
      templateId: 1655,
      quantity: 4,
      options: [{ id: 30, param: 0 }],
    });
    items.push({
      templateId: 1783,
      quantity: 1,
      options: getBrolyOptions('top1_5'),
    });
    items.push({
      templateId: 1823,
      quantity: 1,
      options: [
        { id: 73, param: 0 },
        { id: 14, param: 4 },
        { id: 100, param: 10 },
        { id: 30, param: 0 },
      ],
    });
    if (category === 'power' || category === 'recharge_points') {
      items.push({
        templateId: 1874,
        quantity: 1,
        options: [
          { id: 73, param: 0 },
          { id: 50, param: 20 },
          { id: 77, param: 20 },
          { id: 103, param: 20 },
          { id: 162, param: 3 },
          { id: 30, param: 0 },
        ],
      });
    }

  } else if (rank === 3) {
    // TOP 3
    ruby = 3000;
    items.push({
      templateId: 1655,
      quantity: 3,
      options: [{ id: 30, param: 0 }],
    });
    items.push({
      templateId: 1783,
      quantity: 1,
      options: getBrolyOptions('top1_5'),
    });
    items.push({
      templateId: 1823,
      quantity: 1,
      options: [
        { id: 73, param: 0 },
        { id: 14, param: 3 },
        { id: 100, param: 10 },
        { id: 30, param: 0 },
      ],
    });

  } else if (rank >= 4 && rank <= 5) {
    // TOP 4-5
    ruby = 2000;
    items.push({
      templateId: 1655,
      quantity: 2,
      options: [{ id: 30, param: 0 }],
    });
    items.push({
      templateId: 1783,
      quantity: 1,
      options: getBrolyOptions('top1_5'),
    });
    items.push({
      templateId: 1823,
      quantity: 1,
      options: [
        { id: 73, param: 0 },
        { id: 14, param: 3 },
        { id: 100, param: 5 },
        { id: 30, param: 0 },
      ],
    });

  } else if (rank >= 6 && rank <= 10) {
    // TOP 6-10
    ruby = 1000;
    items.push({
      templateId: 1655,
      quantity: 1,
      options: [{ id: 30, param: 0 }],
    });
    // Broly SSJ4 180 ngày đầy đủ option
    items.push({
      templateId: 1783,
      quantity: 1,
      options: getBrolyOptions('top6_10'),
    });
    items.push({
      templateId: 1823,
      quantity: 1,
      options: [
        { id: 73, param: 0 },
        { id: 14, param: 2 },
        { id: 30, param: 0 },
      ],
    });

  } else if (rank >= 11 && rank <= 50) {
    // TOP 11-50
    ruby = 500;
    items.push({
      templateId: 1783,
      quantity: 1,
      options: getBrolyOptions('top11_50'),
    });
    items.push({
      templateId: 1823,
      quantity: 1,
      options: [
        { id: 73, param: 0 },
        { id: 14, param: 1 },
        { id: 30, param: 0 },
      ],
    });

  } else if (rank >= 51 && rank <= 100) {
    // TOP 51-100
    ruby = 200;
    items.push({
      templateId: 1783,
      quantity: 1,
      options: getBrolyOptions('top51_100'),
    });
    items.push({
      templateId: 1823,
      quantity: 1,
      options: [
        { id: 73, param: 0 },
        { id: 30, param: 0 },
      ],
    });
  }

  return { items, ruby };
}

/**
 * Trao thưởng tự động cho 1 người chơi
 */
export async function deliverPlayerReward(playerId, rewards) {
  const rows = await query(
    'SELECT id, name, items_bag, items_box, data_inventory FROM player WHERE id = ? LIMIT 1',
    [playerId]
  );
  if (!rows.length) {
    return { ok: false, error: 'Không tìm thấy người chơi' };
  }

  const p = rows[0];
  let currentBag = p.items_bag;
  let currentBox = p.items_box;
  let currentInv = p.data_inventory;

  // 1. Thêm từng vật phẩm vào items_bag
  for (const item of rewards.items) {
    currentBag = addItemToContainer(currentBag, item);
  }

  // 2. Thêm Hồng Ngọc (Ruby) nếu có
  if (rewards.ruby > 0) {
    const invResult = addInventoryCurrency(currentInv, { ruby: rewards.ruby });
    currentInv = invResult.serialized;
  }

  // 3. Cập nhật vào MySQL
  await exec(
    'UPDATE player SET items_bag = ?, data_inventory = ? WHERE id = ?',
    [currentBag, currentInv, playerId]
  );

  return {
    ok: true,
    playerId,
    name: p.name,
    itemsAdded: rewards.items.length,
    rubyAdded: rewards.ruby,
  };
}

/**
 * Chốt và phát toàn bộ giải thưởng cho 1 hạng mục đua Top
 */
export async function distributeCategoryRewards({ serverId, launchId, category, distributedBy = null }) {
  // 1. Lấy danh sách Top xếp hạng
  let rankedPlayers = [];

  if (category === 'mission') {
    const rows = await query(`
      SELECT p.id, p.name, p.data_task
      FROM player p
      LIMIT 2000
    `);
    rankedPlayers = rows
      .map((r) => {
        let taskMainId = 0;
        let taskMainIndex = 0;
        try {
          const arr = asJson(r.data_task, []);
          if (Array.isArray(arr) && arr.length > 0) {
            taskMainId = Number(arr[0]) || 0;
            taskMainIndex = Number(arr[1]) || 0;
          }
        } catch {}
        return { id: r.id, name: r.name, score: taskMainId * 100 + taskMainIndex };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);

  } else if (category === 'power') {
    const rows = await query(`
      SELECT p.id, p.name, p.data_point
      FROM player p
      WHERE p.data_point IS NOT NULL AND p.data_point != ''
      LIMIT 2000
    `);
    rankedPlayers = rows
      .map((r) => ({
        id: r.id,
        name: r.name,
        score: parsePlayerPower(r.data_point),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);

  } else if (category === 'recharge_points') {
    const rows = await query(`
      SELECT a.id AS account_id, a.username, a.tongnap, a.event_point, p.id AS player_id, p.name AS player_name
      FROM account a
      INNER JOIN player p ON p.account_id = a.id
      ORDER BY a.tongnap DESC, a.vnd DESC
      LIMIT 500
    `);
    rankedPlayers = rows
      .map((r) => {
        const points = Number(r.event_point) > 0 ? Number(r.event_point) : Math.floor(Number(r.tongnap || 0) / 1000);
        return {
          id: r.player_id,
          name: r.player_name || r.username,
          score: points,
        };
      })
      .filter((p) => p.score >= 20)
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);
  }

  // 2. Trao giải lần lượt cho từng người trong TOP
  const distributionResults = [];
  for (let i = 0; i < rankedPlayers.length; i++) {
    const rank = i + 1;
    const player = rankedPlayers[i];
    const rewards = buildTierRewards(rank, category);

    if (rewards.items.length > 0 || rewards.ruby > 0) {
      const res = await deliverPlayerReward(player.id, rewards);
      distributionResults.push({
        rank,
        playerId: player.id,
        name: player.name,
        score: player.score,
        itemsCount: rewards.items.length,
        ruby: rewards.ruby,
        status: res.ok ? 'success' : 'failed',
        error: res.error,
      });
    }
  }

  // 3. Lưu Snapshot lịch sử trao giải
  const snapResult = await exec(
    `INSERT INTO panel_server_launch_top_snapshots
     (launch_id, server_id, race_category, snapshot_data, total_players, is_distributed, distributed_at, distributed_by)
     VALUES (?, ?, ?, ?, ?, 1, NOW(), ?)`,
    [
      launchId || 1,
      serverId || 1,
      category,
      JSON.stringify(distributionResults),
      distributionResults.length,
      distributedBy,
    ]
  );

  return {
    ok: true,
    category,
    totalRewarded: distributionResults.filter((d) => d.status === 'success').length,
    totalPlayers: distributionResults.length,
    details: distributionResults,
    snapshotId: snapResult.insertId,
  };
}
