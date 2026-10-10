const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
async function main(){
 let player,html='',mode='ok',httpStatus=204;const events={},requests=[];
 const range={style:{setProperty(){}},setAttribute(){}},root={set innerHTML(v){html=v;},get innerHTML(){return html;},addEventListener:(k,f)=>events[k]=f,querySelector:s=>s==='[data-live-seek]'?range:{}};
 const tracks=['1','2','3'].map(n=>({uri:'spotify:track:'+n.repeat(22),name:'Song '+n,artists:[],duration_ms:200000}));
 const context='spotify:playlist:'+'4'.repeat(22);
 const state=(t,pos=0)=>({paused:false,position:pos,duration:t.duration_ms,track_window:{current_track:t}});
 class Player{
  constructor(){player=this;this.events={};this.state=null;this.skips=0;}
  addListener(k,f){this.events[k]=f;}async connect(){this.events.ready({device_id:'luna-only'});return true;}disconnect(){}
  async activateElement(){}async getCurrentState(){return this.state;}
  async seek(ms){if(mode==='reject')throw Error('sdk failed');if(mode!=='silent')this.state.position=ms;}
  async nextTrack(){this.skips++;throw Error('sdk skip failed');}async previousTrack(){throw Error('sdk skip failed');}
 }
 const api=new Function('window','document','U','fetch','setInterval','clearInterval',fs.readFileSync(path.join(__dirname,'../js/spotify-playback.js'),'utf8')+';return SpotifyPlayback;')(
  {Spotify:{Player}},{getElementById:id=>id==='sp-playback'?root:{},hidden:false},{esc:s=>s},async(url,opt)=>{
   const body=opt.body?JSON.parse(opt.body):null;requests.push({url,method:opt.method,body});
   if(httpStatus!==204)return {ok:false,status:httpStatus};
   if(url.includes('/play?')){const chosen=tracks.find(t=>t.uri===(body.offset?.uri||body.uris?.[0]));if(chosen){player.state=state(chosen);player.events.player_state_changed(player.state);}}
   if(url.includes('/seek?'))player.state.position=Number(new URL(url).searchParams.get('position_ms'));
   return {ok:true,status:204};
  },()=>1,()=>{});
 api.init({hasAccess:()=>true,getToken:async()=> 'test',selection:()=>context});
 const click=live=>events.click({target:{closest:()=>({dataset:{live}})}});
 await click('connect');await api.chooseTrack(tracks[1].uri,tracks[1],{context,items:tracks});
 assert.deepEqual(requests.at(-1).body,{context_uri:context,offset:{uri:tracks[1].uri},position_ms:0},'selected song keeps the full playlist as playback context');
 await click('next');assert.equal(api.status().track,'Song 3');assert.equal(requests.at(-1).body.offset.uri,tracks[2].uri);
 await click('previous');assert.equal(api.status().track,'Song 2');assert.equal(requests.at(-1).body.offset.uri,tracks[1].uri);
 assert.equal(player.skips,0,'known neighboring songs use exact track selection, not an empty SDK queue');
 mode='reject';assert(await api.seekTo(90000));assert.equal(player.state.position,90000);assert.match(requests.at(-1).url,/seek\?position_ms=90000&device_id=luna-only/);
 mode='silent';assert(await api.seekTo(20000),'SDK success without moving audio must use fallback');assert.equal(player.state.position,20000);
 mode='ok';const before=requests.length;assert(await api.seekTo(30000));assert.equal(requests.length,before,'confirmed SDK seek adds no remote request');
 mode='reject';httpStatus=403;assert.equal(await api.seekTo(80000),false);assert.match(html,/Sarma yanıtı/);assert.equal(range.disabled,false);httpStatus=204;
 await api.chooseTrack(tracks[2].uri,tracks[2],{context,items:tracks});await click('next');assert.equal(requests.at(-1).method,'POST');assert.match(requests.at(-1).url,/\/next\?device_id=luna-only/,'end of loaded page can continue full Spotify context');
 const relinked={...tracks[0],uri:'spotify:track:'+'9'.repeat(22),linked_from:{uri:tracks[0].uri}};
 await api.chooseTrack(tracks[0].uri,tracks[0],{context,items:tracks});player.events.player_state_changed(state(relinked));assert.equal(range.disabled,false,'relinked song does not lock controls');
 api.reset();console.log('Spotify controls: playlist context, exact next/previous songs, SDK failure and silent seek fallback, device targeting, API failure rollback and relinked tracks passed');
}
const watchdog=setTimeout(()=>{console.error('Spotify controls test did not finish');process.exit(1);},10000);
main().then(()=>clearTimeout(watchdog)).catch(e=>{clearTimeout(watchdog);console.error(e);process.exitCode=1;});
