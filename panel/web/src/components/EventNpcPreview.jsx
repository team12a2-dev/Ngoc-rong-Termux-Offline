import ItemIcon from './ItemIcon';

export default function EventNpcPreview({ npc, mapName }) {
  if (!npc) return null;

  const displayName = npc.hideName ? '' : (npc.npcName || 'NPC Sự Kiện');
  const chatQuote = (npc.autoChatPhrases && npc.autoChatPhrases.length > 0)
    ? npc.autoChatPhrases[0]
    : (npc.greetingText || 'Xin chào! Ta là NPC Sự Kiện!');

  return (
    <div className="event-npc-preview-box" style={{
      background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%)',
      border: '1px solid rgba(56, 189, 248, 0.25)',
      borderRadius: 12,
      padding: '18px 16px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
      textAlign: 'center'
    }}>
      <div style={{
        position: 'absolute',
        top: 8,
        left: 10,
        fontSize: 11,
        color: '#38bdf8',
        background: 'rgba(56, 189, 248, 0.15)',
        padding: '2px 8px',
        borderRadius: 4,
        fontWeight: 600,
        textTransform: 'uppercase'
      }}>
        Live Preview In-Game
      </div>

      <div style={{
        position: 'absolute',
        top: 8,
        right: 10,
        fontSize: 11,
        color: '#94a3b8'
      }}>
        {mapName ? `${mapName} (ID: ${npc.mapId})` : `Map ID: ${npc.mapId}`} · X: {npc.cx} Y: {npc.cy}
      </div>

      {/* Speech Bubble */}
      <div style={{
        margin: '28px auto 14px',
        maxWidth: '85%',
        background: 'rgba(255, 255, 255, 0.95)',
        color: '#0f172a',
        padding: '8px 14px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 500,
        lineHeight: 1.4,
        position: 'relative',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
      }}>
        💬 "{chatQuote}"
        <div style={{
          position: 'absolute',
          bottom: -7,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '7px solid transparent',
          borderRight: '7px solid transparent',
          borderTop: '7px solid rgba(255, 255, 255, 0.95)'
        }} />
      </div>

      {/* NPC Body/Avatar */}
      <div style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        padding: 8
      }}>
        {/* Overhead Name */}
        <div style={{
          marginBottom: 6,
          fontSize: 13,
          fontWeight: 700,
          color: npc.hideName ? '#64748b' : '#38bdf8',
          fontStyle: npc.hideName ? 'italic' : 'normal',
          textShadow: '0 2px 4px rgba(0,0,0,0.8)'
        }}>
          {npc.hideName ? '[Đã ẩn tên NPC]' : displayName}
        </div>

        {/* Avatar Graphic */}
        <div style={{
          width: 68,
          height: 68,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, rgba(15, 23, 42, 0.8) 100%)',
          border: '2px solid rgba(56, 189, 248, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(56, 189, 248, 0.35)',
          overflow: 'hidden'
        }}>
          {npc.modelType === 'icon' ? (
            <ItemIcon iconId={npc.avatarId || 349} size={50} />
          ) : npc.modelType === 'costume' ? (
            <ItemIcon iconId={npc.avatarId || (npc.head > 0 ? npc.head : 349)} tempId={npc.disguiseId} size={50} />
          ) : (
            <ItemIcon iconId={npc.avatarId || 349} tempId={npc.tempId} size={50} />
          )}
        </div>

        {/* Model Spec Badge */}
        <div style={{
          marginTop: 6,
          display: 'flex',
          gap: 6,
          fontSize: 11,
          color: '#94a3b8'
        }}>
          <span className="badge sm" style={{ textTransform: 'capitalize' }}>{npc.modelType}</span>
          {npc.modelType === 'costume' && npc.head > 0 && (
            <span className="badge sm">H:{npc.head} B:{npc.body} L:{npc.leg}</span>
          )}
          {npc.dialogAvatarId > 0 && (
            <span className="badge sm">Thoại: #{npc.dialogAvatarId}</span>
          )}
        </div>
      </div>
    </div>
  );
}
