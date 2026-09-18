const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {ActivityStore}=require('../electron/store.cjs');
for(const platform of ['win32','darwin'])test(platform+': main-process break scheduler opens one overlay even when foreground reader fails',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'purrductive-desktop-test-'));
  try {
    const store=new ActivityStore(directory);store.data.settings={...store.data.settings,breakIntervalSeconds:3};store.persist();
    const intervals=[],windows=[],handlers={},events={};let time=0;
    class Window {
      constructor(options){this.options=options;this.events={};this.destroyed=false;this.webContents={setWindowOpenHandler(){},send(){}};windows.push(this);}
      once(name,fn){this.events[name]=fn;}on(name,fn){this.events[name]=fn;}
      loadFile(){return Promise.resolve().then(()=>this.events['ready-to-show']?.());}
      setAlwaysOnTop(){}setIgnoreMouseEvents(value){this.ignoresMouse=value;}showInactive(){this.visible=true;}show(){}focus(){}
      setVisibleOnAllWorkspaces(value){this.allSpaces=value;}
      isDestroyed(){return this.destroyed;}close(){this.destroyed=true;this.events.closed?.();}destroy(){this.close();}
    }
    const electron={
      app:{isPackaged:false,requestSingleInstanceLock:()=>true,commandLine:{appendSwitch(){}},whenReady:()=>Promise.resolve(),getPath:()=>directory,setAppUserModelId(){},on(name,fn){events[name]=fn;}},
      BrowserWindow:Window,ipcMain:{handle(name,fn){handlers[name]=fn;},on(name,fn){handlers[name]=fn;}},
      powerMonitor:{getSystemIdleTime:()=>0,on(name,fn){events[name]=fn;}},
      Tray:class{setToolTip(){}setContextMenu(){}on(){}},Menu:{setApplicationMenu(){},buildFromTemplate:x=>x},nativeImage:{createFromPath:()=>({resize:()=>({setTemplateImage(){}})})},systemPreferences:{isTrustedAccessibilityClient:()=>false},
      Notification:{isSupported:()=>false},screen:{getCursorScreenPoint:()=>({x:0,y:0}),getDisplayNearestPoint:()=>({workArea:{x:0,y:0,width:1280,height:800}})},dialog:{},shell:{}
    };
    const source=fs.readFileSync(path.join(__dirname,'../electron/main.cjs'),'utf8');
    vm.runInNewContext(source,{require(name){if(name==='electron')return electron;if(name==='node:perf_hooks')return {performance:{now:()=>time}};if(name==='./foreground.cjs')return {ForegroundReader:class{read(){return Promise.resolve(null);}stop(){}}};return name.startsWith('./')?require(path.join(__dirname,'../electron',name)):require(name);},__dirname:path.join(__dirname,'../electron'),process:{pid:99,platform,env:{}},Date,console,setInterval(fn,ms){intervals.push({fn,ms});return intervals.length;},clearInterval(){}});
    await new Promise(resolve=>setImmediate(resolve));
    const tick=intervals.filter(i=>i.ms===1000).at(-1).fn;
    for(let i=0;i<4;i++){time+=1000;tick();}
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(windows.length,2);assert.equal(windows[1].options.transparent,true);assert.equal(windows[1].options.kiosk,undefined);assert.equal(windows[1].visible,true);assert.equal(windows[1].ignoresMouse,true);
    if(platform==='darwin'){assert.equal(windows[1].allSpaces,true);assert.equal(handlers['mac:permissions']().accessibility,false);assert.equal(handlers['mac:retry'](),true);events.activate();}
    handlers['break:preview']();assert.equal(windows.length,2,'no duplicate cat windows');
    handlers['break:acknowledge']();assert.equal(handlers['tracker:snapshot']().live.sittingSeconds,0);
    handlers['break:preview']();handlers['break:acknowledge']();assert.equal(handlers['tracker:snapshot']().live.sittingSeconds,0);
  } finally {fs.rmSync(directory,{recursive:true,force:true});}
});
