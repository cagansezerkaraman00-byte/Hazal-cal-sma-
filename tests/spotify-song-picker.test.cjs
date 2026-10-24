const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
async function main(){
 let instance,connects=0,activation=0,pulse,requests=[];
 const handlers={},root={addEventListener:(k,f)=>handlers[k]=f,querySelector:()=>null},nodes={'sp-playback':root,'sp-music-window':{},'spotify-frame':{}};
 class Player{constructor(){instance=this;this.events={};}addListener(k,f){this.events[k]=f;}async connect(){connects++;this.events.ready({device_id:'luna'});return true;}disconnect(){}async activateElement(){activation++;}async getCurrentState(){return null;}}
 const source=fs.readFileSync(path.join(__dirname,'../js/spotify-playback.js'),'utf8');
 const api=new Function('window','document','U','fetch','setInterval','clearInterval',source+';return SpotifyPlayback;')({Spotify:{Player}},{getElementById:k=>nodes[k]},{esc:s=>s},async(url,options)=>{requests.push(JSON.parse(options.body));return {ok:true};},fn=>{pulse=fn;return 1;},()=>{});
 api.init({hasAccess:()=>true,getToken:async()=> 'test',selection:()=>''});assert.equal(connects,0,'startup does not connect');
 assert.equal(api.prepare(),true);for(let i=0;i<10;i++)await Promise.resolve();assert(api.status().ready);
 api.prepare();assert.equal(connects,1,'opening music twice reuses connected device');assert.equal(requests.length,0,'warming player does not start random music');assert(nodes['spotify-frame'].hidden,'only one audio surface');
 const uri='spotify:track:2222222222222222222222';await api.chooseTrack(uri,{name:'Selected song',artists:[],duration_ms:200000});assert.deepEqual(requests[0],{uris:[uri]});assert.equal(activation,1,'one activation per tap');
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');assert(/id="sp-playback"/.test(html));assert(/id="sp-song-list"/.test(html));api.reset();
 console.log('Premium panel: lazy preconnect, one reused device, no automatic song, exact selected track, one activation and combined song list passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
