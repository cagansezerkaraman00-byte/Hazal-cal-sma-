const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
async function main(){
 let instance,pulse,resolveRequest,html='',renders=0,now=10000;
 const events={},range={style:{setProperty:()=>{}},setAttribute:()=>{}},elapsed={},total={};
 const root={set innerHTML(v){html=v;renders++;},get innerHTML(){return html;},addEventListener:(t,f)=>events[t]=f,querySelector:s=>s==='[data-live-seek]'?range:s==='[data-live-elapsed]'?elapsed:total};
 const nodes={'sp-playback':root,'sp-music-window':{},'spotify-frame':{}};
 const first='spotify:track:1111111111111111111111',second='spotify:track:2222222222222222222222';
 const state=(uri,position=0)=>({paused:false,position,duration:200000,track_window:{current_track:{uri,name:uri===first?'Old song':'New song',artists:[]}}});
 class Player{constructor(){instance=this;this.events={};this.state=state(first);}addListener(t,f){this.events[t]=f;}async connect(){this.events.ready({device_id:'demo'});return true;}disconnect(){}async activateElement(){this.activations=(this.activations||0)+1;}async getCurrentState(){return this.state;}async seek(ms){this.seeks=(this.seeks||[]).concat(ms);} }
 const source=fs.readFileSync(path.join(__dirname,'../js/spotify-playback.js'),'utf8');
 const api=new Function('window','document','U','fetch','Date','setInterval','clearInterval',source+';return SpotifyPlayback;')({Spotify:{Player}},{getElementById:k=>nodes[k],hidden:false},{esc:s=>s},()=>new Promise(r=>resolveRequest=()=>r({ok:true})),{now:()=>now},fn=>{pulse=fn;return 1;},()=>{});
 api.init({hasAccess:()=>true,getToken:async()=> 'test',selection:()=>''});await events.click({target:{closest:()=>({dataset:{live:'connect'}})}});
 instance.events.player_state_changed(state(first));const pending=api.chooseTrack(second,{name:'New song',artists:[],duration_ms:200000});
 assert.match(html,/New song/,'title changes before network finishes');assert(range.disabled,'seeking waits for real selected audio');
 instance.events.player_state_changed(state(first,10000));assert.match(html,/New song/,'late old song cannot overwrite choice');
 for(let i=0;i<40&&!resolveRequest;i++)await Promise.resolve();assert.equal(typeof resolveRequest,"function");resolveRequest();await pending;assert.equal(instance.activations,1,"one audio activation per song selection");
 instance.state=state(second);instance.events.player_state_changed(instance.state);assert(!range.disabled);const before=renders;
 instance.events.player_state_changed(state(second,1000));assert.equal(renders,before,'position updates do not rebuild controls');
 await api.seekTo(60000);instance.events.player_state_changed(state(second,1000));assert.equal(range.value,'60000','late old position cannot undo a seek');
 instance.state=state(second,60000);await pulse();assert.equal(range.value,'60000','state refresh happens on the next one-second pulse');
 api.reset();console.log('Fast music window: immediate selected metadata, delayed request, stale track rejection, in-place timeline, stale seek rejection and one-second sync passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
