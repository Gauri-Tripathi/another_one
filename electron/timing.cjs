// Keep fractional milliseconds between polls; never round each sample up.
class ActivityClock {
  reset() { this.previous=null; this.remainder=0; }
  observe(sample, now, wallTime=Date.now()) {
    const previous=this.previous;
    this.previous={sample,now};
    if (!previous) return null;
    const delta=now-previous.now;
    if (delta<0 || delta>15000) {this.remainder=0;return null;}
    const amount=delta+(this.remainder || 0);
    const seconds=Math.floor(amount/1000);
    this.remainder=amount-seconds*1000;
    return seconds ? {sample:previous.sample,seconds,endedAt:new Date(wallTime-this.remainder)} : null;
  }
}
function breakTick({seconds,elapsed,paused,locked,suspended,showing}) {
  if (paused || locked || suspended || showing || elapsed<0 || elapsed>15000) return seconds;
  return seconds+elapsed/1000;
}
// Fractional seconds belong to their actual interval, never to the next app.
// Wall clock anchors survive clock adjustments; monotonic time determines duration.
class PreciseActivityClock {
  reset() { this.previous=null; }
  observe(sample, now, wallTime=Date.now()) {
    now=Math.round(now);wallTime=Math.round(wallTime);
    const previous=this.previous;
    if(previous && now<=previous.now) return null;
    const endedAt=previous ? previous.wallTime+(now-previous.now) : wallTime;
    this.previous={sample,now,wallTime:endedAt};
    if(!previous) return null;
    const delta=now-previous.now;
    if(delta>3000) {this.previous.wallTime=wallTime;return null;}
    return {sample:previous.sample,seconds:delta/1000,endedAt:new Date(endedAt)};
  }
}
function sameContext(a,b) {
  return Boolean(a&&b&&a.processId===b.processId&&a.windowId===b.windowId&&a.windowTitle===b.windowTitle);
}
module.exports={ActivityClock,PreciseActivityClock,sameContext,breakTick};
