const path=require('node:path');
const {spawn}=require('node:child_process');
const {createInterface}=require('node:readline');
const APP_IDS={
  'com.apple.Safari':'safari','com.apple.SafariTechnologyPreview':'safari',
  'com.google.Chrome':'chrome','com.microsoft.edgemac':'msedge','com.brave.Browser':'brave',
  'org.mozilla.firefox':'firefox','com.operasoftware.Opera':'opera','com.vivaldi.Vivaldi':'vivaldi','company.thebrowser.Browser':'arc',
  'com.microsoft.VSCode':'code','com.apple.dt.Xcode':'xcode','com.apple.finder':'Finder',
  'com.apple.iWork.Pages':'Pages','com.apple.iWork.Numbers':'Numbers','com.apple.iWork.Keynote':'Keynote',
  'com.microsoft.Word':'winword','com.microsoft.Excel':'excel','com.microsoft.Powerpoint':'powerpnt',
  'com.apple.Terminal':'terminal','com.googlecode.iterm2':'terminal','com.purrductive.app':'Purrductive'
};
function normalizeMacSample(sample) {
  if(!sample||typeof sample!=='object')return null;
  if(!sample.appName)return sample.unstable?{unstable:true}:null;
  if(!Number.isFinite(sample.observedTick)||!Number.isFinite(sample.observedAt)||!Number.isFinite(sample.processId))return null;
  return {...sample,appName:APP_IDS[sample.bundleId]||String(sample.appName),windowTitle:String(sample.windowTitle||'')};
}
function helperPath({isPackaged,resourcesPath,root=path.join(__dirname,'..')}) {
  return isPackaged?path.join(resourcesPath,'mac','purrductive-foreground'):path.join(root,'build','mac','purrductive-foreground');
}
class MacForegroundReader {
  constructor({includeAddress=true,binary,spawnImpl=spawn,timeoutMs=2000}={}) {
    this.includeAddress=includeAddress;this.binary=binary;this.spawn=spawnImpl;this.timeoutMs=timeoutMs;
  }
  read() {
    if(this.pending)return Promise.resolve(null);
    return new Promise(resolve=>{
      const timer=setTimeout(()=>this.stop(),this.timeoutMs);
      this.pending=value=>{clearTimeout(timer);this.pending=null;resolve(value);};
      if(!this.child) {
        let child;
        try{child=this.spawn(this.binary,this.includeAddress?['--address']:[],{stdio:['pipe','pipe','ignore']});}
        catch{this.stop();return;}
        this.child=child;
        createInterface({input:child.stdout}).on('line',line=>{
          if(this.child!==child)return;
          try{this.pending?.(normalizeMacSample(JSON.parse(line)));}catch{this.pending?.(null);}
        });
        child.on('error',()=>{if(this.child===child)this.stop();});
        child.on('exit',()=>{if(this.child===child)this.stop();});
        child.stdin.on('error',()=>{if(this.child===child)this.stop();});
      }
      this.child.stdin.write('sample\n');
    });
  }
  stop(){const child=this.child;this.child=null;this.pending?.(null);child?.kill();}
}
module.exports={MacForegroundReader,normalizeMacSample,helperPath};
