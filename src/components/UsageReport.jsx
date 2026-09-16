import React, { useMemo, useState } from 'react';
import { AppWindow, Globe2, ChartNoAxesColumnIncreasing, Search } from 'lucide-react';
import { usageRows, appKey } from '../lib/usage.mjs';
import { secondsToClock, CATEGORY } from '../lib/time';
import AppIcon from './AppIcon';
import DayTimeline from './DayTimeline';

export default function UsageReport({ segments, live, day, onCategory, readOnly, icons }) {
  const [kind, setKind] = useState('timeline');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('time');
  const [limit, setLimit] = useState(12);
  const [expanded, setExpanded] = useState(null);
  const rows = useMemo(() => usageRows(segments, kind).filter(r => r.name.toLowerCase().includes(query.toLowerCase())).sort((a,b) => sort === 'visits' ? b.count-a.count : sort === 'name' ? a.name.localeCompare(b.name) : b.seconds-a.seconds), [segments,kind,query,sort]);
  return <section className="activity-workspace panel">
    <div className="workspace-heading"><div><p className="eyebrow">THE CAT KEPT RECEIPTS</p><h2>Where your attention went.</h2></div><div className="report-tabs" aria-label="Activity views">{[['timeline','Day timeline',ChartNoAxesColumnIncreasing],['apps','Apps',AppWindow],['sites','Websites',Globe2]].map(([key,label,Icon]) => <button key={key} className={kind === key ? 'active' : ''} aria-pressed={kind === key} onClick={() => {setKind(key);setLimit(12);setExpanded(null);}}><Icon size={18}/>{label}</button>)}</div></div>
    {kind === 'timeline' ? <DayTimeline key={day} segments={segments} day={day} onCategory={onCategory} readOnly={readOnly} icons={icons}/> : <div className="report-body">
      <div className="report-tools"><label className="report-search"><Search size={18}/><input aria-label="Search usage" placeholder={kind === 'apps' ? 'Find WhatsApp, Spotify, a browser…' : 'Find YouTube, Instagram, X…'} value={query} onChange={e => {setQuery(e.target.value);setLimit(12);}}/></label><select aria-label="Sort usage" value={sort} onChange={e => setSort(e.target.value)}><option value="time">Most time</option><option value="visits">Most visits</option><option value="name">Name</option></select></div>
      <div className="report-explainer"><strong>{rows.length} {kind === 'apps' ? 'apps' : 'websites'} · {secondsToClock(rows.reduce((sum,r) => sum+r.seconds,0))} active</strong><span>Visits count foreground returns, not launches. Website time is part of browser time.</span></div>
      <div className="report-column-head"><span>{kind === 'apps' ? 'APPLICATION' : 'WEBSITE'}</span><span>VISITS</span><span>ACTIVE TIME</span><span>TIME SPLIT</span></div>
      {rows.slice(0,limit).map(row => <React.Fragment key={row.key}><button className={'report-row ' + (expanded === row.key ? 'expanded' : '')} aria-expanded={expanded === row.key} onClick={() => setExpanded(expanded === row.key ? null : row.key)}>
        <span className="report-identity"><AppIcon name={row.key} website={kind === 'sites'} icons={icons}/><span><strong>{row.name}</strong><small>{row.legacy ? 'Includes older time without visit counts' : 'Tap to inspect recent activity'}</small></span></span><span className="visit-count">{row.count || (row.legacy ? '—' : 0)}{row.legacy && row.count > 0 ? '+' : ''}</span><b>{secondsToClock(row.seconds)}</b><span className="usage-split">{Object.entries(CATEGORY).map(([key,value]) => <i key={key} title={value.label + ': ' + secondsToClock(row[key])} style={{background:value.color,width:(row.seconds ? row[key]/row.seconds*100 : 0)+'%'}}/>)}</span>
      </button>{expanded === row.key && <div className="report-expanded">{segments.filter(s => kind === 'sites' ? s.website === row.key : appKey(s.appName) === row.key).slice().sort((a,b) => b.startedAt.localeCompare(a.startedAt)).slice(0,8).map(s => <div key={s.id}><time>{new Date(s.startedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</time><span title={s.windowTitle}>{s.windowTitle || s.appName}</span><b>{secondsToClock(s.seconds)}</b><select aria-label={'Category for '+s.windowTitle} disabled={readOnly} value={s.category} onChange={e => onCategory(s.id,e.target.value)}>{Object.entries(CATEGORY).map(([key,value]) => <option key={key} value={key}>{value.label}</option>)}</select></div>)}<small>Latest 8 entries. Explore the full sequence in Day timeline.</small></div>}</React.Fragment>)}
      {!rows.length && <div className="empty-state"><Search/><h3>No matching activity yet.</h3><p>{kind === 'sites' ? 'Supported browsers must expose their address bar. App totals still count when a URL cannot be read.' : 'Try another date or search. Only foreground usage is counted.'}</p></div>}
      {limit < rows.length && <button className="soft-button" onClick={() => setLimit(n => n+12)}>Show more</button>}
      <p className="timeline-caption">{kind === 'sites' ? live?.websiteStatus || 'Last uploaded website activity.' : 'Background apps and background music do not count as active screen time.'}</p>
    </div>}
  </section>;
}
