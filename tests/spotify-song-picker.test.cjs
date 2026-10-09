const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
async function main(){
 const calls=[],events={},embedEvents={};let paused=0,destroyed=0,access=true;
 const embed={innerHTML:'',querySelector:()=>({})},root={addEventListener:(k,f)=>events[k]=f};
 const controller={addListener:(k,f)=>embedEvents[k]=f,pause:()=>paused++,destroy:()=>destroyed++};
 const api={createController:(target,opts,cb)=>{assert.equal(opts.uri,'spotify:playlist:1234567890123456789012');cb(controller);}};
 class Player{constructor(){this.events={};}addListener(k,f){this.events[k]=f;}async connect(){this.events.ready({device_id:'luna'});return true;}disconnect(){}async activateElement(){}}
 const win={Spotify:{Player}};
 const doc={getElementById:k=>k==='sp-playback'?root:embed,createElement:()=>({remove:()=>{}}),head:{appendChild:()=>win.onSpotifyIframeApiReady(api)}};
 const source=fs.readFileSync(path.join(__dirname,'../js/spotify-playback.js'),'utf8');
 const playback=new Function('window','document','U','fetch','setInterval','clearInterval',source+';return SpotifyPlayback;')(win,doc,{esc:s=>s},async(url,opt)=>{calls.push(JSON.parse(opt.body));return {ok:true};},()=>1,()=>{});
 playback.init({hasAccess:()=>access,getToken:async()=> 'test',selection:()=> 'spotify:playlist:1234567890123456789012'});
 await events.click({target:{closest:()=>({dataset:{live:'connect'}})}});await Promise.resolve();
 assert.equal(embed.hidden,false,'song picker stays visible when SDK ready');assert.equal(calls.length,0,'opening a playlist never starts its first track');
 embedEvents.playback_started({data:{playingURI:'spotify:track:2222222222222222222222'}});
 for(let i=0;i<12;i++)await Promise.resolve();
 assert.deepEqual(calls[0],{uris:['spotify:track:2222222222222222222222']},'exact tapped song is transferred');assert(paused>0,'embed preview is stopped before Luna playback');
 assert.match(root.innerHTML,/Seçilen şarkıyı yeniden dene/);
 embedEvents.playback_started({data:{playingURI:'javascript:alert(1)'}});await Promise.resolve();assert.equal(calls.length,1,'invalid embed URI cannot play');
 const stale=embedEvents.playback_started;playback.reset();access=false;stale({data:{playingURI:'spotify:track:3333333333333333333333'}});
 for(let i=0;i<6;i++)await Promise.resolve();assert.equal(calls.length,1,'old iframe cannot play after logout');assert(destroyed>0);
 assert.equal(playback.mountEmbed('javascript:alert(1)'),false);
 console.log('Spotify song picker: visible embed, no automatic first track, exact selected URI, preview pause, retry button and stale/logout events passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
