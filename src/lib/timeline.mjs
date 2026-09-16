export function segmentsForDay(segments, day) {
  const start = new Date(day+'T00:00:00').getTime();
  const endDate = new Date(start);endDate.setDate(endDate.getDate()+1);
  const end=endDate.getTime();
  return segments.flatMap(s => {
    const a=Date.parse(s.startedAt),b=Date.parse(s.endedAt);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b<=a) return [];
    const overlap=Math.max(0,Math.min(b,end)-Math.max(a,start));
    if (!overlap) return [];
    return [{...s,startedAt:new Date(Math.max(a,start)).toISOString(),endedAt:new Date(Math.min(b,end)).toISOString(),seconds:Math.max(0,Number(s.seconds)||0)*overlap/(b-a)}];
  });
}
export function timelineHours(segments, day) {
  const start = new Date(day + 'T00:00:00').getTime();
  const end = new Date(day + 'T00:00:00'); end.setDate(end.getDate() + 1);
  if (!Number.isFinite(start)) return [];
  const hours = [];
  for (let t = start; t < end.getTime(); t += 3600000) hours.push({ start: t, end: Math.min(t + 3600000, end.getTime()), label: new Date(t).toLocaleTimeString([], { hour: '2-digit', hour12: false }), productive: 0, distraction: 0, neutral: 0, segments: [] });
  for (const segment of segments) {
    const a = new Date(segment.startedAt).getTime(), b = new Date(segment.endedAt).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) continue;
    const category = ['productive','distraction','neutral'].includes(segment.category) ? segment.category : 'neutral';
    // Spread legacy active seconds across the recorded span without inventing time.
    const active = Math.min((b - a) / 1000, Math.max(0, Number(segment.seconds) || 0));
    for (const hour of hours) {
      const overlap = Math.max(0, Math.min(b, hour.end) - Math.max(a, hour.start));
      if (!overlap) continue;
      hour[category] += active * overlap / (b - a);
      hour.segments.push(segment);
    }
  }
  return hours;
}
