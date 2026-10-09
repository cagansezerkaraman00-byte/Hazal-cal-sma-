const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../js/spotify-playback.js'),'utf8');
async function main(){
 let now=10000,pulse,cleared=0,instance;
 const events={},range={value:'0',style:{setProperty:(k,v)=>range.progress=v},setAttribute:(k,v)=>range[k]=v,matches:()=>true},elapsed={},total={};
 const root={innerHTML:'',addEventListener:(t,f)=>events[t]=f,querySelector:s=>s==='[data-live-seek]'?range:s==='[data-live-elapsed]'?elapsed:total};
 const nodes={'sp-playback':root,'spotify-frame':{}},doc={hidden:false,getElementById:k=>nodes[k]};
 const state=(position=5000,paused=false,id='first',seeking=false)=>({paused,position,duration:289000,disallows:{seeking},track_window:{current_track:{id,name:'Wicked Game',artists:[{name:'Chris Isaak'}]}}});
 class Player{constructor(){instance=this;this.events={};this.seeks=[];}addListener(t,f){this.events[t]=f;}async connect(){this.events.ready({device_id:'demo'});return true;}disconnect(){} async seek(n){this.seeks.push(n);if(this.fail)throw Error('offline');}async getCurrentState(){return this.state;} }
 const api=new Function('window','document','U','fetch','Date','setInterval','clearInterval',source+';return SpotifyPlayback;')({Spotify:{Player}},doc,{esc:s=>s},async()=>({ok:true}),{now:()=>now},fn=>{pulse=fn;return 1;},()=>cleared++);
 api.init({hasAccess:()=>true,getToken:async()=>'',selection:()=>''});
 await events.click({target:{closest:()=>({dataset:{live:'connect'}})}});
 instance.events.player_state_changed(state());assert.equal(range.value,'5000');assert.equal(elapsed.textContent,'0:05');assert.equal(total.textContent,'4:49');
 now+=3000;await pulse();assert.equal(range.value,'8000','playing position moves from SDK anchor');
 range.value='95000';events.input({target:range});assert.equal(elapsed.textContent,'1:35');
 now+=1000;await pulse();assert.equal(range.value,'95000','drag preview is not overwritten');assert.equal(instance.seeks.length,0,'input previews without network spam');
 await events.change({target:range});assert.deepEqual(instance.seeks,[95000]);assert.equal(range.value,'95000');
 await api.seekTo(999999);assert.equal(instance.seeks.at(-1),288999,'seek bounded below track end');
 await api.seekTo(-99);assert.equal(instance.seeks.at(-1),0);const count=instance.seeks.length;await api.seekTo(NaN);assert.equal(instance.seeks.length,count);
 instance.events.player_state_changed(state(12000,true));now+=3000;await pulse();assert.equal(range.value,'12000','paused clock does not advance');
 instance.fail=true;assert.equal(await api.seekTo(60000),false);assert.equal(range.value,'12000','failed seek restores position');assert.match(root.innerHTML,/gidilemedi/);instance.fail=false;
 instance.events.player_state_changed(state(0,false,'second',true));assert(range.disabled);assert.equal(await api.seekTo(30000),false,'Spotify disallows seeking');
 instance.events.player_state_changed(state());let resolveSeek;instance.seek=()=>new Promise(r=>resolveSeek=r);const pending=api.seekTo(45000);api.reset();resolveSeek();await pending;assert.equal(api.status().ready,false);assert(cleared>0,'logout clears clock');
 console.log('Spotify seek: drag preview, one seek on commit, accurate playing/paused clock, bounds, restrictions, failed request rollback and logout race passed');
}
main().catch(e=>{console.error(e);process.exitCode=1});
