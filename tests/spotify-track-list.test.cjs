const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
async function main(){
 const id='1234567890123456789012',first='spotify:track:1111111111111111111111',second='spotify:track:2222222222222222222222';
 let mode='ok',click;const calls=[],played=[],node={innerHTML:'',addEventListener:(t,f)=>click=f};
 const source=fs.readFileSync(path.join(__dirname,'../js/spotify.js'),'utf8').replace('    init(app) {','    testing:{ bindSongs, songPath, songs:()=>songs, setup(app){App=app;st.token="test";st.exp=Date.now()+3600000;} },\n    init(app) {');
 const win={SpotifyPlayback:{uri:value=>{const m=value.match(/^spotify:(playlist|album|track):([A-Za-z0-9]{10,40})$/);return m?{type:m[1],uri:value}:null;},chooseTrack:async uri=>played.push(uri)}};
 const track=(uri,name)=>({uri,type:'track',name,artists:[{name:'Artist'}]});
 const link=new Function('window','document','localStorage','location','history','U','fetch',source+';return SpotifyLink;')(win,{getElementById:()=>node},{setItem:()=>{}},{},{},{esc:s=>s},async url=>{
  calls.push(url);if(mode==='forbidden')return {ok:false,status:403};
  const page=url.includes('offset=50')?{items:[{item:track(second,'İstediğim ikinci şarkı')}],next:null}:{items:[{item:track(first,'İlk şarkı')},{track:{uri:'spotify:local:invalid',name:'Yerel'}},null],next:`https://api.spotify.com/v1/playlists/${id}/items?offset=50`};
  return {ok:true,status:200,json:async()=>url.includes('offset=50')?page:{name:'Hazal’ın listesi',items:page}};
 });
 link.testing.setup({});link.testing.bindSongs();await link.showSongs('spotify:playlist:'+id);
 assert.equal(played.length,0,'loading a list never starts its first song');assert.match(node.innerHTML,/İlk şarkı/);assert.doesNotMatch(node.innerHTML,/Yerel/);
 await link.showSongs('spotify:playlist:'+id,true);assert.match(node.innerHTML,/İstediğim ikinci şarkı/);assert.equal(link.testing.songs().items.length,2);
 const button={dataset:{song:'play',uri:second}};await click({target:{closest:()=>button}});assert.deepEqual(played,[second],'tap passes the exact second song to the custom player');assert.equal(button.disabled,false);
 assert.equal(link.testing.songPath('https://evil.test/v1/playlists/'+id+'/items'),'');
 assert.equal(link.testing.songPath('https://api.spotify.com/v1/playlists/other123456789/items'),'');
 mode='forbidden';await link.showSongs('spotify:playlist:'+id,false,true);assert.match(node.innerHTML,/ortak düzenlediğin/);assert.equal(link.testing.songs().items.length,0,'denied list cannot display songs from old list');
 console.log('Spotify individual songs: current item format, paging, unsupported items, no auto start, exact tapped song, safe next links and restricted playlist handling passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
