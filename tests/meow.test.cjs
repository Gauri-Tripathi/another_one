const {test}=require('node:test');
const assert=require('node:assert/strict');
test('meow resumes suspended audio and cleanup prevents late playback',async()=>{
  const {startMeow}=await import('../src/lib/meow.mjs');
  const old=global.window;
  let context,resolveResume,starts=0;
  const param={value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}};
  class Context{
    constructor(){context=this;this.state='suspended';this.currentTime=0;}
    resume(){return new Promise(resolve=>{resolveResume=()=>{this.state='running';resolve();};});}
    close(){this.state='closed';return Promise.resolve();}
    createOscillator(){return {frequency:param,connect(){return this;},start(){starts++;},stop(){}};}
    createGain(){return {gain:param,connect(){return this;}};}
    createBiquadFilter(){return {frequency:param,Q:param,connect(){return this;}};}
  }
  try{
    global.window={AudioContext:Context};
    const states=[];const stop=startMeow(.3,s=>states.push(s));
    assert.equal(starts,0);assert.deepEqual(states,['blocked']);
    resolveResume();await Promise.resolve();assert.equal(starts,1);assert.equal(states.at(-1),'playing');
    stop();assert.equal(context.state,'closed');
    const cancel=startMeow();cancel();resolveResume();await Promise.resolve();assert.equal(starts,1);
    global.window={};let status;startMeow(.3,s=>status=s);assert.equal(status,'unavailable');
  }finally{global.window=old;}
});
