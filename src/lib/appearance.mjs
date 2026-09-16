export const THEMES = [
  { id:'cream', name:'Cat café', colors:['#f4efe7','#5d1f34','#efb46e'] },
  { id:'lavender', name:'Lavender dream', colors:['#eee9ff','#6446ad','#b59cfa'] },
  { id:'candy', name:'Candy shop', colors:['#fff0f6','#b33873','#f9a7ca'] },
  { id:'ocean', name:'Ocean air', colors:['#e6f4fc','#185b8d','#7dcfe3'] },
  { id:'mint', name:'Matcha garden', colors:['#edf4df','#426532','#acd18c'] },
  { id:'sunset', name:'Peach sunset', colors:['#fff0e4','#9f4637','#ffba7e'] },
  { id:'midnight', name:'Midnight violet', colors:['#181728','#b9a2ff','#55437f'] },
  { id:'graphite', name:'Graphite', colors:['#1c2227','#8bd6cb','#455763'] }
];
export const validTheme = value => THEMES.some(t => t.id === value) ? value : 'cream';
export function clampDock(point, viewport, size) {
  const maxX=Math.max(8,viewport.width-size.width-8),maxY=Math.max(8,viewport.height-size.height-8);
  return {x:Math.max(8,Math.min(maxX,Number.isFinite(point?.x) ? point.x : maxX)),y:Math.max(8,Math.min(maxY,Number.isFinite(point?.y) ? point.y : maxY))};
}
export function summaryShares(stats) {
  const total=Math.max(0,Number(stats.total)||0);
  const share=value => total ? Math.max(0,Math.min(100,(Number(value)||0)/total*100)) : 0;
  return {productive:share(stats.productive),distraction:share(stats.distraction),neutral:share(stats.neutral)};
}
