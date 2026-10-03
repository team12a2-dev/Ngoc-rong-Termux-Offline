import { useState, useMemo, useEffect, useRef } from 'react';
import { api } from '../api';
import effectPresets from '../utils/effectDataPresets.json';

function resolveEffectUrl(idEffect) {
  if (!idEffect || isNaN(Number(idEffect))) return null;
  const configuredBase = import.meta.env.VITE_API_URL || '';
  const apiBase = configuredBase.replace(/\/+$/, '').replace(/\/api\/v1\/?$/, '');
  return `${apiBase}/api/v1/assets/effect/${idEffect}.png`;
}

function resolveIconUrl(iconId) {
  const configuredBase = import.meta.env.VITE_API_URL || '';
  const apiBase = configuredBase.replace(/\/+$/, '').replace(/\/api\/v1\/?$/, '');
  return `${apiBase}/api/v1/assets/icons/${iconId}.png`;
}

// In-memory cache for dynamically loaded effect data
const dynamicEffectCache = new Map();

// Cấu hình nhân vật thực tế trong game NRO theo Tộc
export const GAME_CHARACTER_MODELS = {
  0: {
    race: 'Trái Đất',
    name: 'Songoku (Trái Đất)',
    stageImg: '/characters/traidat_stage.png',
    headImg: '/characters/traidat_head.png',
    themeColor: '#e67e22',
  },
  1: {
    race: 'Namec',
    name: 'Piccolo (Namec)',
    stageImg: '/characters/namec_stage.png',
    headImg: '/characters/namec_head.png',
    themeColor: '#27ae60',
  },
  2: {
    race: 'Xayda',
    name: 'Ca Đích (Xayda)',
    stageImg: '/characters/xayda_stage.png',
    headImg: '/characters/xayda_head.png',
    themeColor: '#3498db',
  },
};

/**
 * Component render hiệu ứng hoạt họa NRO thực tế bằng HTML5 Canvas + Sprite Sheet Data
 */
export default function BadgeEffectPreview({
  idEffect,
  name = '',
  showCharacter = false,
  scale = 1.4,
  animated = true,
  glowColor = 'rgba(243, 156, 18, 0.8)',
  gender = 0, // 0: Trái Đất (Goku), 1: Namec (Piccolo), 2: Xayda (Vegeta)
}) {
  const canvasRef = useRef(null);
  const [effectData, setEffectData] = useState(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  const effId = Number(idEffect);

  // 1. Lấy metadata DataEffect_{id} từ presets tĩnh hoặc API
  useEffect(() => {
    if (!effId || isNaN(effId)) {
      setEffectData(null);
      return;
    }

    // Ưu tiên lấy từ preset đã nạp sẵn 151 effects
    if (effectPresets && effectPresets[effId]) {
      setEffectData(effectPresets[effId]);
      return;
    }

    if (dynamicEffectCache.has(effId)) {
      setEffectData(dynamicEffectCache.get(effId));
      return;
    }

    let cancelled = false;
    api(`/assets/effect-data/${effId}`)
      .then((res) => {
        if (!cancelled && res.ok && res.data) {
          dynamicEffectCache.set(effId, res.data);
          setEffectData(res.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEffectData(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [effId]);

  // 2. Tải hình ảnh Sprite Sheet ImgEffect_{id}.png
  useEffect(() => {
    if (!effId || isNaN(effId)) {
      setImgLoaded(false);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = resolveEffectUrl(effId);
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
      setError(false);
    };
    img.onerror = () => {
      setImgLoaded(false);
      setError(true);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [effId]);

  // 3. Vòng lặp Render Canvas Animation (Frame loop)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgLoaded || !imgRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const img = imgRef.current;
    let animFrameId;
    let lastTime = 0;
    let seqIndex = 0;

    // Tính toán tỷ lệ zoom của ảnh sprite (chuẩn x4)
    let zoomRatio = 4;
    if (effectData && effectData.smallImages && effectData.smallImages.length > 0) {
      let maxImgRight = 0;
      let maxImgBottom = 0;
      for (const sm of effectData.smallImages) {
        if (sm.x + sm.w > maxImgRight) maxImgRight = sm.x + sm.w;
        if (sm.y + sm.h > maxImgBottom) maxImgBottom = sm.y + sm.h;
      }
      if (maxImgRight > 0) {
        zoomRatio = img.naturalWidth / maxImgRight;
        if (zoomRatio < 0.5) zoomRatio = 1;
      }
    }

    const FPS = 14; // Tốc độ khung hình ~14 FPS của NRO
    const interval = 1000 / FPS;

    const render = (time) => {
      if (!lastTime) lastTime = time;
      const delta = time - lastTime;

      if (delta >= interval) {
        lastTime = time - (delta % interval);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (effectData && effectData.frames && effectData.frames.length > 0) {
          const sequence = effectData.animSequence || [];
          const frameIdx = sequence.length > 0
            ? sequence[seqIndex % sequence.length]
            : (seqIndex % effectData.frames.length);

          const frameParts = effectData.frames[frameIdx] || effectData.frames[0] || [];

          // Tọa độ tâm canvas
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2 + (showCharacter ? 2 : 0);

          // Vẽ từng mảnh ghép (parts) của frame hiện tại
          for (const part of frameParts) {
            const sm = effectData.smallImages[part.idImg];
            if (!sm) continue;

            const sx = sm.x * zoomRatio;
            const sy = sm.y * zoomRatio;
            const sw = sm.w * zoomRatio;
            const sh = sm.h * zoomRatio;

            const dx = centerX + part.dx * scale;
            const dy = centerY + part.dy * scale;
            const dw = sm.w * scale;
            const dh = sm.h * scale;

            ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
          }

          if (animated) {
            seqIndex++;
          }
        } else {
          // Fallback nếu không có metadata frames: vẽ phần đầu tiên của sprite sheet
          const firstW = Math.min(img.naturalWidth, 60 * zoomRatio);
          const firstH = Math.min(img.naturalHeight, 30 * zoomRatio);
          const drawW = (firstW / zoomRatio) * scale;
          const drawH = (firstH / zoomRatio) * scale;
          const dx = (canvas.width - drawW) / 2;
          const dy = (canvas.height - drawH) / 2;
          ctx.drawImage(img, 0, 0, firstW, firstH, dx, dy, drawW, drawH);
        }
      }

      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [effectData, imgLoaded, scale, animated, showCharacter]);

  // Tính toán kích thước canvas dựa theo bounds của danh hiệu
  const boundW = effectData?.bounds?.width || 60;
  const boundH = effectData?.bounds?.height || 30;
  const canvasWidth = Math.max(120, Math.min(220, boundW * scale + 40));
  const canvasHeight = Math.max(48, Math.min(90, boundH * scale + 20));

  const canvasStyle = {
    animation: animated ? 'nroBadgeFloat 2.2s ease-in-out infinite alternate, nroBadgeGlow 2.8s ease-in-out infinite alternate' : 'none',
    filter: animated ? `drop-shadow(0 0 8px ${glowColor}) drop-shadow(0 2px 5px rgba(0,0,0,0.8))` : 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))',
  };

  const badgeCanvasElement = (
    <div
      className="badge-canvas-wrapper"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {error ? (
        <div
          className="badge-fallback-pill"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f39c12 0%, #d35400 100%)',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '11px',
            boxShadow: '0 0 10px rgba(243, 156, 18, 0.5)',
            ...canvasStyle,
          }}
        >
          <span>👑</span>
          <span>{name || `Effect #${idEffect}`}</span>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={{
            imageRendering: 'pixelated',
            ...canvasStyle,
          }}
        />
      )}
    </div>
  );

  if (!showCharacter) {
    return badgeCanvasElement;
  }

  // Model nhân vật game thực tế theo Tộc (Trái Đất, Namec, Xayda)
  const charModel = GAME_CHARACTER_MODELS[gender] || GAME_CHARACTER_MODELS[2];

  return (
    <div
      className="badge-character-mockup"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        width: '100%',
        maxWidth: '260px',
        margin: '0 auto',
      }}
    >
      {/* KHUNG SÂN KHẤU GAME THỰC TẾ (IN-GAME STAGE - CHUẨN XÁC HÌNH ẢNH TRONG GAME NRO) */}
      <div
        style={{
          width: '212px',
          height: '244px',
          borderRadius: '10px',
          border: '2px solid rgba(243, 156, 18, 0.6)',
          backgroundImage: `url(${charModel.stageImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
          position: 'relative',
          boxShadow: '0 8px 24px rgba(0,0,0,0.7), inset 0 0 20px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* VỊ TRÍ DANH HIỆU BAY BỒNG BỀNH TRÊN ĐẦU NHÂN VẬT */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          {badgeCanvasElement}
        </div>

        {/* NHÃN TÊN TỘC & NHÂN VẬT GÓC DƯỚI */}
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            padding: '3px 12px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 'bold',
            color: '#f8fafc',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 6px rgba(0,0,0,0.8)',
            zIndex: 5,
          }}
        >
          {charModel.name}
        </div>
      </div>
    </div>
  );
}
