const test=require('node:test');
const assert=require('node:assert/strict');
test('eight unique themes and safe fallback for unknown saved preferences',async()=>{
  const {THEMES,validTheme}=await import('../src/lib/appearance.mjs');
  assert.equal(THEMES.length,8);assert.equal(new Set(THEMES.map(t=>t.id)).size,8);
  assert.equal(validTheme('midnight'),'midnight');assert.equal(validTheme('unknown'),'cream');
});
test('dock clamps off-screen positions after resize and tolerates invalid storage',async()=>{
  const {clampDock}=await import('../src/lib/appearance.mjs');
  const viewport={width:360,height:700},size={width:210,height:54};
  assert.deepEqual(clampDock({x:1400,y:900},viewport,size),{x:142,y:638});
  assert.deepEqual(clampDock({x:-100,y:-3},viewport,size),{x:8,y:8});
  assert.deepEqual(clampDock(null,viewport,size),{x:142,y:638});
  assert.deepEqual(clampDock({x:NaN,y:Infinity},viewport,size),{x:142,y:638});
});
test('category circles use total time and have no fabricated empty-day progress',async()=>{
  const {summaryShares}=await import('../src/lib/appearance.mjs');
  assert.deepEqual(summaryShares({total:100,productive:50,distraction:20,neutral:30}),{productive:50,distraction:20,neutral:30});
  assert.deepEqual(summaryShares({total:0}),{productive:0,distraction:0,neutral:0});
});
