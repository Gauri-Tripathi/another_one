import React,{useEffect,useRef,useState} from 'react';
import RealCat,{CATS} from './RealCat';
import {crawlFrames,crawlMotion,framePlacement} from '../lib/cat-motion.mjs';

export default function CrawlingCat({catId='silver',onStatus}) {
  const cat=CATS.find(c=>c.id===catId)||CATS[0];
  const holder=useRef(null),canvas=useRef(null);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    let disposed=false,raf=0,frames,lastStamp=null,elapsed=0,lastFrame=-1,arrived=false,fallback=false;
    const node=holder.current,output=canvas.current,ctx=output?.getContext('2d');
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
    const sheet=new Image();
    setFailed(false);node.style.visibility='hidden';onStatus?.('loading');
    function placeFallback(){if(disposed)return;fallback=true;setFailed(true);onStatus?.('failed');node.style.transform=`translateX(${crawlMotion(0,node.clientWidth,window.innerWidth,true).x}px)`;node.style.visibility='visible';}
    function draw(frameIndex){
      if(lastFrame===frameIndex)return;lastFrame=frameIndex;
      const f=frames[frameIndex],p=framePlacement(f,frames,output.width,output.height);
      ctx.clearRect(0,0,output.width,output.height);
      ctx.drawImage(sheet,f.x,f.y,f.width,f.height,p.x,p.y,p.width,p.height);
      output.dataset.frame=String(frameIndex);
    }
    function tick(stamp){
      if(disposed||!frames)return;
      // Hidden windows pause the gait instead of jumping across the screen.
      if(lastStamp!==null&&!document.hidden)elapsed+=Math.min(64,stamp-lastStamp);
      lastStamp=stamp;
      const pose=crawlMotion(elapsed,node.clientWidth,window.innerWidth,reduce.matches||arrived);
      node.style.transform=`translateX(${pose.x}px)`;node.style.visibility='visible';
      draw(pose.frame);arrived=pose.done;
      if(pose.done)onStatus?.(reduce.matches?'reduced':'arrived');
      if(!pose.done)raf=requestAnimationFrame(tick);
    }
    function restart(){cancelAnimationFrame(raf);if(fallback){placeFallback();return;}lastStamp=null;raf=requestAnimationFrame(tick);}
    sheet.onload=()=>{
      if(disposed)return;
      try {
        if(!ctx)throw new Error('Canvas unavailable');
        const scratch=document.createElement('canvas');scratch.width=sheet.naturalWidth;scratch.height=sheet.naturalHeight;
        const source=scratch.getContext('2d',{willReadFrequently:true});source.drawImage(sheet,0,0);
        frames=crawlFrames(source.getImageData(0,0,scratch.width,scratch.height).data,scratch.width,scratch.height);
        onStatus?.('walking');
        restart();
      }catch{placeFallback();}
    };
    sheet.onerror=placeFallback;sheet.src=`./cats/${cat.id}-crawl.png`;
    reduce.addEventListener('change',restart);window.addEventListener('resize',restart);
    return()=>{disposed=true;cancelAnimationFrame(raf);sheet.onload=null;sheet.onerror=null;reduce.removeEventListener('change',restart);window.removeEventListener('resize',restart);};
  },[cat.id,onStatus]);
  return <div className="cat-walk-path cat-crawl-path" ref={holder}>
    <canvas ref={canvas} width="1000" height="550" hidden={failed} role="img" aria-label={`${cat.name}, your ${cat.breed.toLowerCase()} cat, creeping over for a break`}/>
    {failed&&<RealCat catId={cat.id}/>}
  </div>;
}
