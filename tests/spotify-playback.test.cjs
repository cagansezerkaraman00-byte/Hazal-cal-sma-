const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(path.join(__dirname,'../js',p),'utf8');
async function main(){
 const nodes={'sp-playback':{addEventListener:(type,fn)=>{if(type==='click')nodes['sp-playback'].click=fn;}},'spotify-frame':{}},calls=[];
 let instance,response=204,selection='' ,access=true;
 class Player{constructor(){instance=this;this.events={};this.activated=0;}addListener(k,f){this.events[k]=f;}async connect(){this.events.ready({device_id:'luna-device'});return true;}disconnect(){this.disconnected=true;}async activateElement(){this.activated++;}async togglePlay(){this.toggled=true;}async nextTrack(){this.next=true;}async previousTrack(){this.prev=true;}}
 const playback=new Function('window','document','U','fetch',read('spotify-playback.js')+';return SpotifyPlayback;')({Spotify:{Player}}, {getElementById:k=>nodes[k],createElement:()=>({remove:()=>{}}),head:{appendChild:()=>{}}}, {esc:s=>s},async(url,opt)=>{calls.push({url,opt});return{ok:response===204,status:response};});
 playback.init({hasAccess:()=>access,getToken:async()=> 'test-token',selection:()=>selection});
 const click=act=>nodes['sp-playback'].click({target:{closest:()=>({dataset:{live:act}})}});
 assert.equal(calls.length,0,'no startup network');assert.equal(nodes['spotify-frame'].hidden,true);
 await click('connect');assert.equal(playback.status().ready,true);assert.equal(nodes['spotify-frame'].hidden,true);
 selection='https://open.spotify.com/playlist/1234567890123456789012';await click('toggle');assert.equal(instance.activated,1);assert.match(calls[0].url,/device_id=luna-device/);assert.deepEqual(JSON.parse(calls[0].opt.body),{context_uri:'spotify:playlist:1234567890123456789012'});
 selection='spotify:track:1234567890123456789012';await click('selected');assert.deepEqual(JSON.parse(calls[1].opt.body),{uris:['spotify:track:1234567890123456789012']});
 instance.events.player_state_changed({paused:false,position:1000,duration:200000,track_window:{current_track:{name:'A song',artists:[{name:'Artist'}]}}});assert(playback.status().playing);await click('toggle');assert(instance.toggled);await click('next');assert(instance.next);await click('previous');assert(instance.prev);
 const prior=calls.length;selection='javascript:alert(1)';await click('selected');assert.equal(calls.length,prior);
 selection='spotify:album:1234567890123456789012';response=403;await click('selected');assert.match(nodes['sp-playback'].innerHTML,/Premium/);
 playback.reset();access=false;playback.render();assert(instance.disconnected);assert.equal(playback.status().ready,false);assert.equal(nodes['spotify-frame'].hidden,false);assert(nodes['sp-playback'].hidden);
 // A forged OAuth callback cannot exchange its code for a token.
 const storage=new Map(),cid='a'.repeat(32),uri='https://example.test/';let network=0;
 storage.set('luna-sp-verifier',JSON.stringify({v:'verifier',state:'expected',clientId:cid,redirect:uri,at:Date.now()}));
 const source=read('spotify.js').replace('    init(app) {','    testing: { handleRedirect, setup(app) { App=app;st.clientId="'+cid+'"; } },\n    init(app) {');
 const link=new Function('window','document','localStorage','location','history','fetch',source+';return SpotifyLink;')({}, {getElementById:()=>null}, {getItem:k=>storage.get(k),removeItem:k=>storage.delete(k)}, {origin:'https://example.test',pathname:'/',search:'?code=forged&state=wrong',hash:''}, {replaceState:()=>{}},async()=>{network++;});
 link.testing.setup({toast:()=>{}});await link.testing.handleRedirect();assert.equal(network,0);assert(!storage.has('luna-sp-verifier'));
 console.log('Spotify playback: lazy startup, on-device playback, track/context selection, tap activation, controls, denied access, logout and forged OAuth callback passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
