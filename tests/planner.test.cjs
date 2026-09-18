const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {ActivityStore}=require('../electron/store.cjs');
const {changePlanner,dueReminders,plannerState}=require('../electron/planner.cjs');
test('undated notes remain pinned, scheduled notes notify once and checked notes do not notify',()=>{
  const data={};changePlanner(data,{type:'addReminder',title:'Remember water'});
  changePlanner(data,{type:'addReminder',title:'Call mum',dueAt:'2026-09-17T12:00:00Z'});
  assert.equal(dueReminders(data,Date.parse('2026-09-17T11:00:00Z')).length,0);
  const due=dueReminders(data,Date.parse('2026-09-17T13:00:00Z'));assert.equal(due.length,1);due[0].notifiedAt='2026-09-17T13:00:00Z';
  assert.equal(dueReminders(data,Date.parse('2026-09-18T13:00:00Z')).length,0);
  changePlanner(data,{type:'toggleReminder',id:data.reminders[0].id});assert.equal(data.reminders[0].done,true);
  changePlanner(data,{type:'toggleReminder',id:data.reminders[0].id});assert.equal(data.reminders[0].done,false);
});
test('goal progress stays within bounds and is recoverably archived',()=>{
  const data={};changePlanner(data,{type:'addGoal',title:'Read chapters',target:2});const id=data.goals[0].id;
  for(let i=0;i<3;i++)changePlanner(data,{type:'goalProgress',id,delta:1});assert.equal(data.goals[0].progress,2);
  for(let i=0;i<4;i++)changePlanner(data,{type:'goalProgress',id,delta:-1});assert.equal(data.goals[0].progress,0);
  changePlanner(data,{type:'archiveGoal',id});assert.equal(data.goals[0].archived,true);
  changePlanner(data,{type:'archiveGoal',id});assert.equal(data.goals[0].archived,false);
  assert.throws(()=>changePlanner(data,{type:'addGoal',title:'Bad',target:Infinity}));
});
test('reminders and goals survive a full store restart',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'purrductive-planner-'));
  try {const store=new ActivityStore(directory);changePlanner(store.data,{type:'addReminder',title:'Pinned forever'});changePlanner(store.data,{type:'addGoal',title:'Focus daily',target:120,kind:'productive'});store.persist();const restored=plannerState(new ActivityStore(directory).data);assert.equal(restored.reminders[0].title,'Pinned forever');assert.equal(restored.goals[0].target,120);}finally{fs.rmSync(directory,{recursive:true,force:true});}
});
