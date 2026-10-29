const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../js/spotify.js'),'utf8').replace('    init(app) {','    testing: { refreshLists, playlistPath, getState:()=>st, setup(app) { App=app;st.token="test";st.exp=Date.now()+3600000; } },\n    init(app) {');
const calls=[],node={innerHTML:''};let mode='normal';
const next='https://api.spotify.com/v1/me/playlists?limit=50&offset=50';
const followed={id:'followed12345678901234',name:'Kaydettiğim liste',owner:{id:'someone-else',display_name:'Başka biri'},images:[]};
const own={id:'own1234567890123456789',name:'Oluşturduğum liste',items:{total:3},images:[]};
const app={data:()=>({settings:{spotify:''}}),toast:()=>{}};
const link=new Function('window','document','localStorage','location','history','U','fetch',source+';return SpotifyLink;')({}, {getElementById:()=>node}, {setItem:()=>{}}, {}, {}, {esc:s=>String(s)},async url=>{
 calls.push(url);
 if(url.endsWith('/me'))return {ok:true,status:200,json:async()=>({display_name:'Hazal'})};
 if(mode==='fail')return {ok:false,status:403};
 if(url.includes('offset=50'))return {ok:true,status:200,json:async()=>({items:[followed,{id:'last123456789012345678',name:'Son liste',images:[]}],next:null,total:3})};
 return {ok:true,status:200,json:async()=>({items:[null,own,followed],next,total:3})};
});
async function main(){
 link.testing.setup(app);await link.testing.refreshLists();
 assert.equal(link.testing.getState().lists.length,2);
 assert(node.innerHTML.includes('Kaydettiğim liste'),'followed metadata-only playlists remain visible');
 assert(node.innerHTML.includes('Başka biri'));assert(node.innerHTML.includes('Daha fazla liste'));
 await link.testing.refreshLists(true);assert.equal(link.testing.getState().lists.length,3,'pages deduplicated');
 assert(!node.innerHTML.includes('Daha fazla liste'));assert(calls.some(x=>x.endsWith('/me/playlists?limit=50&offset=50')));
 mode='fail';await link.testing.refreshLists();assert.equal(link.testing.getState().err,'forbidden','profile success cannot hide playlist denial');assert.equal(link.testing.getState().lists.length,3,'failed refresh preserves existing lists');assert(node.innerHTML.includes('Spotify izin vermedi'));
 assert.equal(link.testing.playlistPath('https://evil.test/v1/me/playlists?offset=50'),'');
 assert.equal(link.testing.playlistPath('https://api.spotify.com/v1/me/tracks'),'');
 console.log('Spotify library: followed metadata-only lists, next-page loading, deduplication, error visibility, retained lists and safe paging URLs passed');
}
main().catch(e=>{console.error(e);process.exitCode=1});
