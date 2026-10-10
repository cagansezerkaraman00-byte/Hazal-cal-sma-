const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(path.join(__dirname,'../js',p),'utf8');
let now=Date.UTC(2026,9,7,10),tick,completed=[];
class Clock extends Date {constructor(...a){super(...(a.length?a:[now]));}static now(){return now;}}
const Store={save(){},data:{settings:{focus:25,short:5,long:15,longEvery:4,autoBreak:true,autoFocus:true,dailyGoal:180},stats:{},subjects:[{id:'math'}],sessions:[],timer:null,denemeler:[]}};
const U={clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),dateKey:d=>new Date(d).toISOString().slice(0,10)};
const load=()=>new Function('Store','U','Date','setInterval','document',read('timer.js')+';return Timer;')(Store,U,Clock,f=>tick=f,{hidden:false});
let timer=load();const handlers={onFocusDone:s=>{completed.push(s);Store.data.sessions.push(s);}};timer.init(handlers);
assert.equal(timer.state().kind,'countdown');assert.equal(timer.state().remaining,1500);
assert.ok(timer.setCountdownMinutes(35));timer.toggle();assert.equal(timer.state().total,2100);
assert.equal(timer.setCountdownMinutes(25),false,'running duration is locked');Store.data.settings.focus=60;assert.equal(timer.state().total,2100,'settings cannot shorten/extend active timer');
now+=2100000;tick();assert.equal(completed.length,1);assert.equal(completed[0].minutes,35);assert.equal(timer.state().phase,'focus');assert.equal(timer.state().running,false,'no automatic break or restart');
timer.setKind('free');timer.toggle();now+=3661000;tick();assert.equal(timer.state().elapsed,3661);assert.equal(timer.state().continuousSeconds,3661);
timer=load();timer.init(handlers);assert.equal(timer.state().continuousSeconds,3661,'reload preserves continuity');
timer.toggle();const paused=timer.state().elapsed;now+=600000;assert.equal(timer.state().elapsed,paused);timer.toggle();now+=1800000;timer.finish();assert.equal(completed.at(-1).continuousSeconds,3661,'paused segments are not added into one streak');
timer.setKind('free');timer.toggle();now+=1800000;timer.toggle();now+=1000;timer.toggle();now+=1800000;timer.finish();assert.equal(completed.at(-1).minutes,60);assert.equal(completed.at(-1).continuousSeconds,1800,'two half hours do not earn uninterrupted hour');
timer.setKind('free');timer.toggle();now+=15*3600000;timer.finish();assert.equal(completed.at(-1).continuousSeconds,54000);
const badgeSource=read('badges.js').replace('    init(app) {','    inspectContext: context,\n    init(app) {');
const Badges=new Function('Store','U','window','Timer',badgeSource+';return Badges;')(Store,U,{},timer);
const list=Badges.LIST.filter(x=>x.cat==='kesintisiz');assert.equal(list.length,15);assert.equal(new Set(list.map(x=>x.id)).size,15);
const context=Badges.inspectContext();for(let i=0;i<15;i++){assert.equal(list[i].max,(i+1)*3600);assert.ok(list[i].prog(context)>=list[i].max);}
const old={minutes:900,kind:'free',start:now};Store.data.sessions=[old];Store.data.stats={};Store.data.timer=null;assert.equal(Badges.inspectContext().continuousSeconds,0,'untracked historical/manual sessions cannot earn new streak badges');
console.log('Countdown, hour stopwatch, reload, pauses, 15-hour tracking and badge boundaries passed');
