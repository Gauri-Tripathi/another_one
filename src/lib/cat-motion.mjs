export const CRAWL_FRAMES=8;
export const CRAWL_CYCLE_MS=1120;

// Find the eight opaque cat silhouettes, rather than assuming generated atlas
// cells have pixel-perfect margins.
export function crawlFrames(data,width,height) {
  const seen=new Uint8Array(width*height),queue=new Int32Array(width*height),parts=[];
  for(let seed=0;seed<seen.length;seed++) {
    if(seen[seed]||data[seed*4+3]<32)continue;
    let head=0,tail=1,minX=width,minY=height,maxX=0,maxY=0;
    queue[0]=seed;seen[seed]=1;
    while(head<tail) {
      const p=queue[head++],x=p%width,y=Math.floor(p/width);
      minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      const visit=n=>{if(!seen[n]&&data[n*4+3]>=32){seen[n]=1;queue[tail++]=n;}};
      if(x>0)visit(p-1);if(x+1<width)visit(p+1);if(y>0)visit(p-width);if(y+1<height)visit(p+width);
    }
    if(tail>width*height*.002)parts.push({x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1,area:tail});
  }
  if(parts.length!==8)throw new Error('Crawl atlas must contain eight separate cat silhouettes');
  return parts.sort((a,b)=>(Math.floor((a.y+a.height/2)/(height/2))-Math.floor((b.y+b.height/2)/(height/2)))||a.x-b.x);
}

export function crawlMotion(elapsed,catWidth,viewportWidth,reducedMotion=false) {
  catWidth=Math.max(1,catWidth);
  const start=-catWidth*1.05,end=viewportWidth*(viewportWidth<=1100?.02:.18);
  const cycles=Math.max(1,Math.ceil((end-start)/(catWidth*.18)));
  const duration=cycles*CRAWL_CYCLE_MS;
  const progress=reducedMotion?1:Math.min(1,Math.max(0,elapsed)/duration);
  return {x:start+(end-start)*progress,frame:progress===1?0:Math.floor(Math.max(0,elapsed)/CRAWL_CYCLE_MS*CRAWL_FRAMES)%CRAWL_FRAMES,done:progress===1,duration};
}

export function framePlacement(frame,frames,width=1000,height=550) {
  const scale=Math.min(width*.96/Math.max(...frames.map(f=>f.width)),height*.94/Math.max(...frames.map(f=>f.height)));
  return {x:width*.98-frame.width*scale,y:height*.98-frame.height*scale,width:frame.width*scale,height:frame.height*scale};
}
