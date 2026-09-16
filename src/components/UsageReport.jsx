import React, { useMemo, useState } from 'react';
import { AppWindow, Globe2, Search, PawPrint } from 'lucide-react';
import { usageRows } from '../lib/usage.mjs';
import { localDay, secondsToClock } from '../lib/time';

export default function UsageReport({ segments, live }) {
  const [kind, setKind] = useState('apps');
  const [day, setDay] = useState(localDay());
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('time');
  const [limit, setLimit] = useState(12);
  const rows = useMemo(() => {
    const selected = segments.filter(s => !day || localDay(s.startedAt) === day);
    const result = usageRows(selected, kind).filter(r => r.name.toLowerCase().includes(query.toLowerCase()));
    return sort === 'opens' ? result.sort((a, b) => b.count - a.count || b.seconds - a.seconds) : result;
  }, [segments, day, kind, query, sort]);
  const total = rows.reduce((sum, row) => sum + row.seconds, 0);
  return <section className="usage-report panel">
    <div className="usage-heading"><div><p className="eyebrow">THE CAT KEPT RECEIPTS</p><h2>Your attention, accounted for.</h2><p>Every app. Every little “just checking”.</p></div><div className="usage-tabs" role="group" aria-label="Usage report type"><button aria-pressed={kind === 'apps'} onClick={() => { setKind('apps'); setLimit(12); }}><AppWindow size={17}/> Apps</button><button aria-pressed={kind === 'sites'} onClick={() => { setKind('sites'); setLimit(12); }}><Globe2 size={17}/> Websites</button></div></div>
    <div className="usage-tools"><label><Search size={16}/><input aria-label="Search usage report" placeholder={kind === 'apps' ? 'Find WhatsApp, Spotify, a browser...' : 'Find youtube.com, x.com...'} value={query} onChange={e => { setQuery(e.target.value); setLimit(12); }}/></label><input aria-label="Usage report date" type="date" value={day} onChange={e => { setDay(e.target.value); setLimit(12); }}/><button onClick={() => setDay('')}>All saved days</button><select aria-label="Sort usage report" value={sort} onChange={e => setSort(e.target.value)}><option value="time">Most time</option><option value="opens">Most visits</option></select></div>
    <div className="usage-summary"><span><b>{rows.length}</b> {kind === 'apps' ? 'apps' : 'websites'}</span><span><b>{secondsToClock(total)}</b> active time</span><span className="usage-definition">{kind === 'apps' ? 'Visits = times brought into active use, including returns.' : 'Visits = returns to a domain. Website time is part of browser time.'}</span></div>
    {rows.length ? <div className="usage-table"><div className="usage-table-head"><span>{kind === 'apps' ? 'Application' : 'Website'}</span><span>Visits</span><span>Time used</span><span>Time split</span></div>{rows.slice(0, limit).map((row, i) => <div className="usage-row" key={row.key}><div className="usage-identity"><span className={'usage-avatar tint-' + i % 4}>{kind === 'sites' ? <Globe2 size={20}/> : row.name.slice(0, 1)}</span><div><strong>{row.name}</strong><small>{row.legacy ? 'Includes older time without visit counts' : kind === 'apps' ? 'Foreground usage' : 'Detected from the address bar'}</small></div></div><b className="visit-pill">{row.count || (row.legacy ? '—' : 0)}{row.legacy && row.count > 0 ? '+' : ''}</b><strong>{row.seconds < 60 ? row.seconds + 's' : secondsToClock(row.seconds)}</strong><div className="usage-split" aria-label={Math.round(row.productive / (row.seconds || 1) * 100) + '% productive'}>{['productive','distraction','neutral'].map(c => <i key={c} className={c} style={{width: row[c] / (row.seconds || 1) * 100 + '%'}}/>)}</div></div>)}</div> : <div className="usage-empty"><PawPrint size={32}/><h3>{query ? 'No matching receipts.' : kind === 'sites' ? 'Your next browsing adventure goes here.' : 'Your app adventures start here.'}</h3><p>{kind === 'sites' ? 'Use a supported browser while tracking runs. Sites appear when its address bar is readable.' : 'Use an application while tracking runs, or choose another date.'}</p></div>}
    <div className="usage-footer"><span>{kind === 'sites' ? live?.websiteStatus || 'Website details require the desktop update and sync schema migration.' : 'Sampled every 5 seconds. Very brief switches can be missed; background apps are not timed.'}</span>{rows.length > limit && <button onClick={() => setLimit(n => n + 12)}>Show more</button>}</div>
  </section>;
}
