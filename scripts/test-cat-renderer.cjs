// Isolated Electron smoke test: never starts the tracker or opens user data.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const assert=require('node:assert/strict');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'purrductive-cat-test-')));
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
const timeout=setTimeout(()=>{console.error('Cat renderer timed out');app.exit(1);},20000);
app.whenReady().then(async()=>{
  const win=new BrowserWindow({show:false,width:1400,height:900,webPreferences:{offscreen:true,backgroundThrottling:false,contextIsolation:true,nodeIntegration:false}});
  const bundle=process.argv[2]?path.resolve(process.argv[2]):path.join(__dirname,'..');
  await win.loadFile(path.join(bundle,'dist/index.html'),{hash:'/break'});
  const result=await win.webContents.executeJavaScript(`new Promise(resolve=>{
    const frames=new Set(),pixels=new Set(),positions=new Set();
    let count=0;
    const timer=setInterval(()=>{
      const c=document.querySelector('.cat-crawl-path canvas');
      if(c){frames.add(c.dataset.frame);pixels.add(c.toDataURL());positions.add(c.parentElement.style.transform);}
      if(++count===35){clearInterval(timer);resolve({frames:[...frames],pixelStates:pixels.size,positions:positions.size,hidden:document.hidden,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,text:document.body.innerText});}
    },70);
  })`);
  console.log(JSON.stringify(result));
  assert.equal(result.reduced,false,'Disable reduced motion for this gait smoke test');
  assert.ok(result.frames.filter(Boolean).length>=6,'Paws must advance through distinct poses');
  assert.ok(result.pixelStates>=6,'Canvas pixels must change, not only its position');
  assert.ok(result.positions>=6,'Cat must travel');
  assert.ok(!result.text.includes('could not load'),'No static fallback');
  // Silence the continuous purr first, so it cannot make this assertion pass.
  await win.webContents.executeJavaScript(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Mute cat').click()`);
  await new Promise(resolve=>setTimeout(resolve,400));
  await win.webContents.executeJavaScript(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Meow again').click()`);
  await new Promise(resolve=>setTimeout(resolve,250));
  assert.ok(win.webContents.isCurrentlyAudible(),'Meow replay must produce audio');
  await win.webContents.executeJavaScript(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Mute cat').click()`);
  console.log('PASS: frame pixels, travel, and audio output verified in Electron');
  clearTimeout(timeout);win.destroy();app.exit(0);
}).catch(error=>{console.error(error);clearTimeout(timeout);app.exit(1);});
