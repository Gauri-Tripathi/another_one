const {randomUUID}=require('node:crypto');
function plannerState(data) {return {reminders:Array.isArray(data.reminders)?data.reminders:[],goals:Array.isArray(data.goals)?data.goals:[]};}
function changePlanner(data, action, now=new Date().toISOString()) {
  const state=plannerState(data);
  const title=String(action.title || '').trim().slice(0,180);
  if (action.type==='addReminder') {
    if (!title) throw new Error('Give your reminder a title.');
    if (state.reminders.length>=1000) throw new Error('Reminder limit reached.');
    const dueAt=action.dueAt ? new Date(action.dueAt).toISOString() : null;
    state.reminders.push({id:randomUUID(),title,dueAt,done:false,createdAt:now,notifiedAt:null});
  } else if (action.type==='toggleReminder') {
    const row=state.reminders.find(r=>r.id===action.id);if (!row) throw new Error('Reminder not found.');
    row.done=!row.done;row.completedAt=row.done?now:null;
  } else if (action.type==='addGoal') {
    if (!title) throw new Error('Give your goal a title.');
    if (state.goals.length>=1000) throw new Error('Goal limit reached.');
    const target=Number(action.target);
    if (!Number.isFinite(target) || target<1 || target>10000) throw new Error('Choose a target from 1 to 10,000.');
    state.goals.push({id:randomUUID(),title,target:Math.round(target),progress:0,kind:action.kind==='productive'?'productive':'steps',createdAt:now,archived:false});
  } else if (action.type==='goalProgress') {
    const row=state.goals.find(r=>r.id===action.id);if (!row || row.kind!=='steps') throw new Error('Manual goal not found.');
    row.progress=Math.max(0,Math.min(row.target,row.progress+(action.delta===-1?-1:1)));
  } else if (action.type==='archiveGoal') {
    const row=state.goals.find(r=>r.id===action.id);if (!row) throw new Error('Goal not found.');row.archived=!row.archived;
  } else throw new Error('Unknown planner action.');
  Object.assign(data,state);return state;
}
function dueReminders(data, now=Date.now()) {return plannerState(data).reminders.filter(r=>!r.done && !r.notifiedAt && r.dueAt && Date.parse(r.dueAt)<=now);}
module.exports={plannerState,changePlanner,dueReminders};
