const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const script=fs.readFileSync(path.join(__dirname,'../scripts/build-mac-helper.cjs'),'utf8');
function simulate(failVerification=false) {
  const commands=[];
  vm.runInNewContext(script,{
    __dirname:'/repo/scripts',process:{platform:'darwin'},console,
    require(name){
      if(name==='node:path')return path.posix;
      if(name==='node:fs')return {mkdirSync(){},chmodSync(){}};
      if(name==='node:child_process')return {spawnSync(command,args){
        commands.push({command,args:Array.from(args)});
        const index=args.indexOf('-verify_arch');
        if(index!==-1){
          assert.equal(index,1,'input file must precede the architecture list');
          assert.equal(args[0],'/repo/build/mac/purrductive-foreground');
          assert.deepEqual(Array.from(args.slice(index+1)),['arm64','x86_64']);
          if(failVerification)return {status:1};
        }
        return {status:0};
      }};
      throw new Error('Unexpected dependency: '+name);
    }
  });
  return commands;
}
test('Mac helper build places the lipo input before -verify_arch',()=>{
  const commands=simulate();
  assert.equal(commands.length,4);
  assert.ok(commands[0].args.includes('arm64-apple-macos13.0'));
  assert.ok(commands[1].args.includes('x86_64-apple-macos13.0'));
  assert.equal(commands[2].args[0],'-create');
});
test('Mac helper build fails rather than ignoring an architecture verification error',()=>{
  assert.throws(()=>simulate(true),/failed with status 1/);
});
