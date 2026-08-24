/** Message suffix from API liveSync payload */
export function formatLiveSync(data) {
  const ls = data?.liveSync;
  if (!ls) return '';
  if (ls.reloaded) return ' — đã áp dụng in-game ngay';
  return ` — chưa áp dụng in-game: ${ls.error || 'agent không phản hồi'}`;
}
