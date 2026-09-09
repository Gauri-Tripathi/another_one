import { createClient } from "@supabase/supabase-js";

export function makeSupabase(config) {
  if (!config?.url || !config?.key) return null;
  return createClient(config.url, config.key, { auth: { persistSession: true } });
}

export async function pushSegments(client, segments) {
  if (!client || !segments.length) return;
  const { data: { user } } = await client.auth.getUser();
  if (!user) return;
  const rows = segments.map(s => ({
    id: s.id,
    user_id: user.id,
    device_id: s.deviceId || "desktop",
    started_at: s.startedAt,
    ended_at: s.endedAt,
    seconds: s.seconds,
    app_name: s.appName,
    window_title: s.windowTitle,
    category: s.category,
    confidence: s.confidence,
    reason: s.reason,
    manual: Boolean(s.manual)
  }));
  const { error } = await client.from("activity_segments").upsert(rows);
  if (error) throw error;
}

export async function pullRecent(client) {
  if (!client) return [];
  const since = new Date();
  since.setDate(since.getDate() - 31);
  since.setHours(0, 0, 0, 0);
  const { data, error } = await client.from("activity_segments")
    .select("*").gte("started_at", since.toISOString()).order("started_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id, deviceId: row.device_id, startedAt: row.started_at, endedAt: row.ended_at,
    seconds: row.seconds, appName: row.app_name, windowTitle: row.window_title,
    category: row.category, confidence: row.confidence, reason: row.reason, manual: row.manual
  }));
}
