const BROWSERS = new Set(['chrome', 'msedge', 'brave', 'firefox', 'opera', 'vivaldi', 'arc']);
function websiteFromSample(sample) {
  if (!BROWSERS.has(String(sample.appName).toLowerCase()) || !sample.address) return null;
  try {
    const address = String(sample.address).trim();
    if (/\s/.test(address) || /^(about|chrome|edge|file|brave|view-source):/i.test(address)) return null;
    const url = new URL(address.includes('://') ? address : 'https://' + address);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    for (const domain of ['youtube.com', 'instagram.com', 'twitter.com', 'x.com', 'spotify.com', 'whatsapp.com']) {
      if (host === domain || host.endsWith('.' + domain)) return domain === 'twitter.com' ? 'x.com' : domain;
    }
    return host === 'youtu.be' ? 'youtube.com' : host;
  } catch { return null; }
}
module.exports = { websiteFromSample, BROWSERS };
