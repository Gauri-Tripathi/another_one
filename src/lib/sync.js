import { createClient } from "@supabase/supabase-js";
import { parsePairing } from './pairing.mjs';

let cachedClient;
let cachedKey;
export function makeSupabase(config) {
  if (!config?.url || !config?.key) return null;
  if (!parsePairing('#connect='+encodeURIComponent(JSON.stringify(config)))) return null;
  const key = JSON.stringify([config.url, config.key]);
  if (cachedKey === key) return cachedClient;
  try {
    cachedClient = createClient(config.url, config.key, { auth: { persistSession: true } });
    cachedKey = key;
    return cachedClient;
  } catch { return null; }
}

export async function requireUser(client) {
  if (!client) throw new Error('Configure your cloud project first.');
  const {data, error} = await client.auth.getUser();
  if (error || !data?.user) throw new Error('Sign in to your cloud account in Settings.');
  return data.user;
}
const uploaded = new WeakMap();
export async function pushSegments(client, segments, user) {
  user ||= await requireUser(client);
  let cache = uploaded.get(client);
  if (!cache || cache.userId !== user.id) {cache={userId:user.id,rows:new Map()};uploaded.set(client,cache);}
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
    manual: Boolean(s.manual),
    website: s.website || null,
    app_session_id: s.appSessionId || null,
    site_session_id: s.siteSessionId || null
  }));
  const changed = rows.filter(row => cache.rows.get(row.id) !== JSON.stringify(row));
  for (let i=0;i<changed.length;i+=250) {
    const batch=changed.slice(i,i+250);
    const { error } = await client.from("activity_segments").upsert(batch);
    if (error) throw error;
    batch.forEach(row => cache.rows.set(row.id,JSON.stringify(row)));
  }
  const ids=new Set(rows.map(r => r.id));
  for (const id of cache.rows.keys()) if (!ids.has(id)) cache.rows.delete(id);
}

export async function pullRecent(client, user) {
  user ||= await requireUser(client);
  const since = new Date();
  since.setDate(since.getDate() - 31);
  since.setHours(0, 0, 0, 0);
  const all=[];
  let after=null;
  // UUID keyset pagination remains stable while another laptop uploads new rows.
  while (true) {
    let query=client.from("activity_segments").select("*").eq('user_id',user.id).gte("started_at",since.toISOString()).order('id',{ascending:true}).limit(500);
    if (after) query=query.gt('id',after);
    const {data,error}=await query;
    if (error) throw error;
    all.push(...(data || []));
    if (!data?.length) break;
    after=data[data.length-1].id;
  }
  return all.map(row => ({
    id: row.id, deviceId: row.device_id, startedAt: row.started_at, endedAt: row.ended_at,
    seconds: row.seconds, appName: row.app_name, windowTitle: row.window_title,
    category: row.category, confidence: row.confidence, reason: row.reason, manual: row.manual,
    website: row.website, appSessionId: row.app_session_id, siteSessionId: row.site_session_id
  }));
}
