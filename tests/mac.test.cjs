const test=require('node:test'),assert=require('node:assert/strict');
const {PassThrough}=require('node:stream');const {EventEmitter}=require('node:events');
const {MacForegroundReader,normalizeMacSample,helperPath}=require('../electron/mac-reader.cjs');
const {websiteFromSample}=require('../electron/website.cjs');
const {classifyActivity}=require('../electron/classifier.cjs');
const base={appName:'Safari',bundleId:'com.apple.Safari',processId:123,windowId:'123:1:2:3:4',windowTitle:'A calculus explanation',observedTick:1000,observedAt:2000,address:'https://www.youtube.com/watch?v=private',accessibility:true};
function child(){const c=new EventEmitter();c.stdout=new PassThrough();c.stdin=new PassThrough();c.kill=()=>{c.killed=true;};return c;}
test('Mac bundle IDs normalize Safari, Chrome, VS Code and office apps without title inference',()=>{
  const safari=normalizeMacSample(base);assert.equal(safari.appName,'safari');assert.equal(websiteFromSample(safari),'youtube.com');
  assert.equal(normalizeMacSample({...base,bundleId:'com.microsoft.VSCode'}).appName,'code');
  assert.equal(normalizeMacSample({...base,bundleId:'com.google.Chrome'}).appName,'chrome');
  for(const name of ['Xcode','Pages','Numbers','Keynote'])assert.equal(classifyActivity(name,'Untitled').category,'productive');
  assert.equal(websiteFromSample({...safari,address:null}),null);
  assert.equal(normalizeMacSample({...base,observedTick:undefined}),null);
  assert.equal(normalizeMacSample(null),null);assert.deepEqual(normalizeMacSample({unstable:true}),{unstable:true});
});
test('Mac helper IPC supports repeated reads, timeout/restart, and ignores retired processes',async()=>{
  const children=[],args=[];
  const reader=new MacForegroundReader({includeAddress:false,binary:'/helper',timeoutMs:20,spawnImpl:(...a)=>{args.push(a);const c=child();children.push(c);return c;}});
  const one=reader.read();children[0].stdout.write(JSON.stringify(base)+'\n');assert.equal((await one).appName,'safari');assert.deepEqual(args[0][1],[]);
  const two=reader.read();assert.equal(await reader.read(),null);children[0].stdout.write('bad json\n');assert.equal(await two,null);
  assert.equal(await reader.read(),null);assert.equal(children[0].killed,true);
  const next=reader.read();children[0].emit('exit');children[0].stdout.write(JSON.stringify(base)+'\n');
  children[1].stdout.write(JSON.stringify({...base,appName:'New',bundleId:'test'})+'\n');assert.equal((await next).appName,'New');reader.stop();
});
test('Mac reader handles missing helpers and explicitly chooses the URL worker',async()=>{
  const c=child();let args;
  const r=new MacForegroundReader({binary:'/missing',spawnImpl:(_b,a)=>{args=a;return c;}});const pending=r.read();c.emit('error',new Error('ENOENT'));assert.equal(await pending,null);assert.deepEqual(args,['--address']);
  assert.match(helperPath({isPackaged:true,resourcesPath:'/Applications/Purrductive.app/Contents/Resources'}),/mac[\\/]purrductive-foreground$/);
  assert.match(helperPath({isPackaged:false,root:'/repo'}),/build[\\/]mac[\\/]purrductive-foreground$/);
});
test('packaging includes native collector outside ASAR and supports both Mac architectures',()=>{
  const pkg=require('../package.json');assert.equal(pkg.build.mac.extraResources[0].to,'mac/purrductive-foreground');assert.match(pkg.scripts['dist:mac'],/--arm64 --x64/);
});
test('compiled helper responds with JSON on a Mac build host', {skip:process.platform!=='darwin'},async()=>{
  const fs=require('node:fs');const binary=helperPath({isPackaged:false});assert.ok(fs.existsSync(binary),'Run npm run build:mac-helper before Mac tests');
  const {spawn}=require('node:child_process');const {createInterface}=require('node:readline');
  await new Promise((resolve,reject)=>{const proc=spawn(binary,[],{stdio:['pipe','pipe','pipe']});const timer=setTimeout(()=>{proc.kill();reject(new Error('Native helper did not respond'));},5000);
    proc.on('error',e=>{clearTimeout(timer);reject(e);});
    createInterface({input:proc.stdout}).once('line',line=>{clearTimeout(timer);proc.kill();try{const result=JSON.parse(line);assert.ok(result.appName||result.error||result.unstable);resolve();}catch(e){reject(e);}});proc.stdin.write('sample\n');
  });
});
