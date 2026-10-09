const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
async function main(){
 const calls=[],events={},embedEvents={};let paused=0,destroyed=0,access=true;
 const embed={innerHTML:'',querySelector:()=>({})},root={addEventListener:(k,f)=>events[k]=f};
 const controller={addListener:(k,f)=>embedEvents[k]=f,pause:()=>paused++,destroy:()=>destroyed++};
 const api={createController:(target,opts,cb)=>{assert.equal(opts.uri,'spotify:playlist:1234567890123456789012');assert.equal(opts.height,900,'playlist has enough room for native song rows');cb(controller);}};
 class Player{constructor(){this.events={};}addListener(k,f){this.events[k]=f;}async connect(){this.events.ready({device_id:'luna'});return true;}disconnect(){}async activateElement(){}}
 const win={Spotify:{Player}};
 const doc={getElementById:k=>k==='sp-playback'?root:embed,createElement:()=>({remove:()=>{}}),head:{appendChild:()=>win.onSpotifyIframeApiReady(api)}};
 const source=fs.readFileSync(path.join(__dirname,'../js/spotify-playback.js'),'utf8');
 const playback=new Function('window','document','U','fetch','setInterval','clearInterval',source+';return SpotifyPlayback;')(win,doc,{esc:s=>s},async(url,opt)=>{calls.push(JSON.parse(opt.body));return {ok:true};},()=>1,()=>{});
 playback.init({hasAccess:()=>access,getToken:async()=> 'test',selection:()=> 'spotify:playlist:1234567890123456789012'});
 await events.click({target:{closest:()=>({dataset:{live:'connect'}})}});await Promise.resolve();
 assert.equal(embed.hidden,false,'song picker stays visible when SDK ready');assert.equal(calls.length,0,'opening a playlist never starts its first track');
 assert.equal(embedEvents.playback_started,undefined,'native playback must not be redirected or paused by Luna');
 assert.equal(paused,0,'native player remains in control');
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert(!/id="sp-playback"/.test(html),'separate Luna player removed');
 assert(!/id="sp-song-list"/.test(html),'duplicate Luna song list removed');
 assert(/id="spotify-frame"/.test(html),'native player and playlist retained');
 playback.reset();access=false;assert(destroyed>0,'native controller destroyed on logout');
 assert.equal(playback.mountEmbed('spotify:playlist:1234567890123456789012'),false,'signed-out user cannot mount authenticated controller');
 assert.equal(playback.mountEmbed('javascript:alert(1)'),false);
 console.log('Spotify native player: tall playlist, no auto start, no SDK takeover, duplicate controls removed and logout cleanup passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
