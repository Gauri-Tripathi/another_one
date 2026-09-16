export const CATEGORY = {
  productive: { label: "Productive", color: "#1f6f5f" },
  distraction: { label: "Distraction", color: "#d7643f" },
  neutral: { label: "Unsorted", color: "#aaa39a" }
};

export function localDay(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function secondsToClock(value = 0) {
  if (value > 0 && value < 60) return `${Math.round(value)}s`;
  const minutes = Math.max(0, Math.round(value / 60));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${mins}m`;
  return `${hours}h ${String(mins).padStart(2, "0")}m`;
}

export function summarize(segments = []) {
  const sums = { productive: 0, distraction: 0, neutral: 0, total: 0 };
  for (const segment of segments) {
    const seconds = Number(segment.seconds) || 0;
    sums.total += seconds;
    sums[segment.category] = (sums[segment.category] || 0) + seconds;
  }
  sums.focus = sums.productive + sums.distraction
    ? Math.round((sums.productive / (sums.productive + sums.distraction)) * 100)
    : 0;
  return sums;
}

export function groupApps(segments = []) {
  const apps = new Map();
  for (const segment of segments) {
    const key = `${segment.appName}|${segment.category}`;
    const current = apps.get(key) || { appName: segment.appName || "Unknown", category: segment.category, seconds: 0 };
    current.seconds += Number(segment.seconds) || 0;
    apps.set(key, current);
  }
  return [...apps.values()].sort((a, b) => b.seconds - a.seconds);
}

export function groupDays(segments = []) {
  const days = new Map();
  for (const segment of segments) {
    const key = localDay(segment.startedAt);
    const entry = days.get(key) || { date: key, segments: [] };
    entry.segments.push(segment);
    days.set(key, entry);
  }
  return [...days.values()].map(day => ({ ...day, ...summarize(day.segments) })).sort((a, b) => b.date.localeCompare(a.date));
}
