import React from 'react';
import { Clock3, Sparkles, Leaf, Zap, CircleHelp, Target } from 'lucide-react';
import { secondsToClock } from '../lib/time';
import { summaryShares } from '../lib/appearance.mjs';

function Ring({ percent, tone, children, label }) {
  const value=Math.max(0,Math.min(100,percent));
  return <div className={'metric-ring '+tone} role="img" aria-label={label}>
    <svg viewBox="0 0 120 120" aria-hidden="true"><circle className="ring-track" cx="60" cy="60" r="51"/><circle className="ring-fill" cx="60" cy="60" r="51" pathLength="100" strokeDasharray={`${value} 100`} transform="rotate(-90 60 60)"/></svg>
    <div className="ring-content">{children}</div>
  </div>;
}
export default function DayOverview({ stats, day, allDevices }) {
  const shares=summaryShares(stats);
  const classified=stats.productive+stats.distraction;
  const cards=[
    {key:'productive',label:'Productive',Icon:Leaf,note:'Time well spent'},
    {key:'distraction',label:'Distractions',Icon:Zap,note:'A little side quest'},
    {key:'neutral',label:'Unsorted',Icon:CircleHelp,note:'Still needs your say'}
  ];
  return <section className="day-overview" id="day-overview" aria-labelledby="overview-title" tabIndex={-1}>
    <header className="overview-heading"><div><p className="eyebrow"><Sparkles size={13}/> YOUR DAY, AT A GLANCE</p><h2 id="overview-title">Little circles. The whole picture.</h2></div><span className="overview-date">{new Date(day+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'})}</span></header>
    <div className="overview-cards">
      <article className="metric-card metric-total"><div className="metric-label"><Clock3 size={16}/><h3>Total time</h3></div><div className="total-value">{secondsToClock(stats.total)}</div><p>Active screen time</p><div className="total-composition" role="img" aria-label={`Time split: ${Math.round(shares.productive)}% productive, ${Math.round(shares.distraction)}% distraction, ${Math.round(shares.neutral)}% unsorted`}>{['productive','distraction','neutral'].map(key => <i key={key} className={key} style={{width:shares[key]+'%'}}/>)}</div><small>Idle minutes stay out.</small></article>
      {cards.map(({key,label,Icon,note}) => <article className={'metric-card metric-'+key} key={key}><div className="metric-label"><Icon size={16}/><h3>{label}</h3></div><Ring tone={key} percent={shares[key]} label={`${label}: ${secondsToClock(stats[key])}, ${Math.round(shares[key])}% of active time`}><strong>{secondsToClock(stats[key])}</strong><span>{Math.round(shares[key])}% of total</span></Ring><small>{note}</small></article>)}
      <article className="metric-card metric-focus"><div className="metric-label"><Target size={16}/><h3>Focus score</h3></div><Ring tone="focus" percent={classified ? stats.focus : 0} label={classified ? `Focus score ${stats.focus}%, excludes unsorted time` : 'No classified activity yet'}><strong>{classified ? stats.focus+'%' : '—'}</strong><span>{classified ? 'of sorted time' : 'not enough data'}</span></Ring><small>Unsorted time excluded.</small></article>
    </div>
    <div className="overview-footnote"><span className="overview-status-dot"/><span>{stats.total ? 'Based on the selected day and device.' : 'Your circles fill as activity is recorded.'} {allDevices && 'Combined laptop time can overlap.'}</span></div>
  </section>;
}
