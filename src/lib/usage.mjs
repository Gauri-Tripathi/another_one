const names = { msedge: 'Microsoft Edge', chrome: 'Google Chrome', firefox: 'Firefox', brave: 'Brave', spotify: 'Spotify', whatsapp: 'WhatsApp', code: 'Visual Studio Code', explorer: 'File Explorer' };
export function usageRows(segments, kind = 'apps') {
  const rows = new Map();
  for (const item of segments) {
    const key = kind === 'sites' ? item.website : String(item.appName || 'Unknown').toLowerCase();
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, { key, name: kind === 'sites' ? key : names[key] || item.appName, seconds: 0, sessions: new Set(), legacy: false, productive: 0, distraction: 0, neutral: 0 });
    const row = rows.get(key);
    const seconds = Math.max(0, Number(item.seconds) || 0);
    row.seconds += seconds;
    row[item.category || 'neutral'] += seconds;
    const session = kind === 'sites' ? item.siteSessionId : item.appSessionId;
    if (session) row.sessions.add(session);
    else row.legacy = true;
  }
  return [...rows.values()].map(row => ({ ...row, count: row.sessions.size, sessions: undefined })).sort((a, b) => b.seconds - a.seconds);
}
