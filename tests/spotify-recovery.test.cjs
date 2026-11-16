const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
async function main(){
 let instance,pulse,html='',now=10000,nextTimer=0,fetchStatus=204;
 const timers=new Map(),events={},requests=[],tokens=[],seeks=[],resolvers=[];
 const range={style:{setProperty(){}},setAttribute(){}},elapsed={},total={};
 const root={set innerHTML(v){html=v;},get innerHTML(){return html;},addEventListener:(k,f)=>events[k]=f,querySelector:s=>s==='[data-live-seek]'?range:s==='[data-live-elapsed]'?elapsed:total};
 const nodes={'sp-playback':root,'sp-music-window':{},'spotify-frame':{}};
 const first='spotify:track:1111111111111111111111',second='spotify:track:2222222222222222222222';
 const state=(uri=first,pos=0)=>({paused:false,position:pos,duration:200000,track_window:{current_track:{uri,name:uri,artists:[]}}});
 class Player{
  constructor(){instance=this;this.events={};this.state=state();}
  addListener(k,f){this.events[k]=f;}async connect(){this.events.ready({device_id:'demo'});return true;}disconnect(){}
  async activateElement(){if(this.activationFails)throw Error('activation');}
  getCurrentState(){return this.readState?this.readState():Promise.resolve(this.state);}
  seek(ms){seeks.push(ms);return new Promise(resolve=>resolvers.push(()=>{this.state.position=ms;resolve();}));}
 }
 const source=fs.readFileSync(path.join(__dirname,'../js/spotify-playback.js'),'utf8');
 const api=new Function('window','document','U','fetch','Date','setInterval','clearInterval','setTimeout','clearTimeout',source+';return SpotifyPlayback;')(
  {Spotify:{Player}},{getElementById:k=>nodes[k],hidden:false},{esc:s=>s},async(url,opts)=>{requests.push({url,body:opts.body?JSON.parse(opts.body):null});const status=fetchStatus;fetchStatus=204;return {ok:status===204,status};},
  {now:()=>now},fn=>{pulse=fn;return 1;},()=>{},(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,ms});return id;},id=>timers.delete(id));
 const flush=async()=>{for(let i=0;i<50;i++)await Promise.resolve();};
 const click=live=>events.click({target:{closest:()=>({dataset:{live}})}});
 const fire=ms=>{const found=[...timers].find(([,t])=>t.ms===ms);assert(found,'expected timeout '+ms);timers.delete(found[0]);found[1].fn();};
 api.init({hasAccess:()=>true,getToken:async force=>{tokens.push(force);return 'test';},selection:()=>first});await click('connect');instance.events.player_state_changed(state());
 const a=api.seekTo(60000),b=api.seekTo(90000),c=api.seekTo(120000);
 assert.equal(await b,false,'superseded queued seek resolves');assert.equal(range.value,'120000');assert.equal(range.disabled,false,'dragging remains available during a slow seek');
 assert.deepEqual(seeks,[60000]);resolvers.shift()();await a;await flush();assert.deepEqual(seeks,[60000,120000],'only newest queued target is sent');resolvers.shift()();assert.equal(await c,true);
 instance.events.player_state_changed(state(first,1000));assert.equal(range.value,'120000','late position cannot undo latest seek');
 now+=5000;let resolvePoll;instance.readState=()=>{instance.readState=null;return new Promise(r=>resolvePoll=r);};const polling=pulse();await flush();
 const seek=api.seekTo(45000);resolvers.shift()();await seek;resolvePoll(state(first,1000));await polling;assert.equal(range.value,'45000','poll started before seek is discarded');instance.readState=null;
 const hung=api.seekTo(80000);fetchStatus=403;fire(6000);assert.equal(await hung,false);assert.equal(range.disabled,false,'timeout releases controls');assert.match(html,/Sarma yanıtı/);resolvers.shift()();
 instance.activationFails=true;assert.equal(await api.chooseTrack(second,{name:'Second'}),false);assert.equal(range.disabled,false,'activation failure releases selected-song lock');instance.activationFails=false;
 fetchStatus=401;await api.chooseTrack(second,{name:'Second',duration_ms:200000});assert(tokens.includes(true),'401 refreshes access token once');
 instance.events.autoplay_failed();instance.events.player_state_changed(state());await pulse();assert.match(html,/aria-label="Sesi aç"/);assert(!/data-live="toggle" disabled/.test(html),'iOS audio recovery button enabled');
 const before=requests.length;await click('toggle');assert.equal(requests.length,before+1,'audio recovery retries the chosen song');assert.deepEqual(requests.at(-1).body,{uris:[second]});
 fire(8000);assert.match(html,/Sesi aç/,'missing playback acknowledgement gives actionable retry');
 instance.events.not_ready();assert.equal(api.status().ready,false);assert(!/data-live="connect" disabled/.test(html));await click('connect');assert(api.status().ready,'reconnect works after device loss');
 instance.events.authentication_error();assert.equal(api.status().ready,false,'auth error after ready invalidates stale device');assert.match(html,/yeniden bağla/);
 api.reset();console.log('Spotify recovery: queued latest seek, stale poll, timeouts, activation failure, 401 refresh, iOS retry, missing acknowledgement, disconnect and post-ready auth error passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
