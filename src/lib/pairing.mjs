export function parsePairing(hash, companionUrl = '') {
  if (!hash.startsWith('#connect=')) return null;
  try {
    const config=JSON.parse(decodeURIComponent(hash.slice(9)));
    const url=new URL(config.url);
    if (url.protocol !== 'https:' || url.username || url.password || typeof config.key !== 'string' || !config.key || config.key.length>4096) return null;
    if (config.key.startsWith('sb_secret_')) return null;
    if (config.key.split('.').length===3) {
      try {const payload=JSON.parse(atob(config.key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if (payload.role && payload.role!=='anon') return null;} catch {return null;}
    }
    return {url:url.origin,key:config.key,companionUrl};
  } catch {return null;}
}
