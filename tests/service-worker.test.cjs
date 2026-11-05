const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto').webcrypto;
const root=path.join(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'release-manifest.json'),'utf8'));
const source=fs.readFileSync(path.join(root,'sw.js'),'utf8');
function setup(fault){
 const handlers={},writes=[],focus=[],opened=[],cacheData=new Map();let activated=0,pending,offline=false;
 const scope='https://example.test/Luna/';
 const key=k=>new URL(typeof k==='string'?k:k.url,scope).href;
 const ctx={crypto,URL,Response,location:{origin:'https://example.test'},SURUMLER:[{surum:manifest.version}],importScripts(){},Request:class{constructor(url){this.url=url;}},
 fetch:async request=>{
  if(offline)throw new Error('offline');
  const file=typeof request==='string'?request:request.url;
  if(file==='release-manifest.json'){
   const m={...manifest,files:{...manifest.files},version:fault==='version'?'old':manifest.version};
   if(fault==='audioDigest')delete m.files['assets/meows/kitten.mp3'];
   return new Response(JSON.stringify(m));
  }
  const p=file==='./'?'index.html':file;
  if(fault==='missing'&&p==='js/app.js'||fault==='audioMissing'&&p==='assets/meows/kitten.mp3')return new Response('',{status:404});
  if(fault==='mixed'&&p==='js/messages.js')return new Response('old code');
  const bytes=fs.readFileSync(path.join(root,p));
  return new Response(fault==='audioCorrupt'&&p==='assets/meows/kitten.mp3'?bytes.subarray(0,100):bytes);
 },
 caches:{
  open:async name=>{opened.push(name);if(!cacheData.has(name))cacheData.set(name,new Map());const data=cacheData.get(name);return {put:async (k,r)=>{writes.push([k,r]);data.set(key(k),r.clone());},match:async k=>data.get(key(k))?.clone(),delete:async()=>true};},
  has:async name=>cacheData.has(name),match:async(k,o)=>cacheData.get(o?.cacheName)?.get(key(k))?.clone(),keys:async()=>[...cacheData.keys()],delete:async()=>{throw Error('no caches should be removed');}
 },
 self:{registration:{scope,getNotifications:async()=>[]},addEventListener:(k,f)=>handlers[k]=f,skipWaiting:async()=>activated++,clients:{claim:async()=>{},matchAll:async()=>[{url:'https://example.test/other/',focus:async()=>focus.push('other')},{url:scope+'?source=homescreen',postMessage(){},focus:async()=>focus.push('app')}],openWindow:async()=>{throw Error('reuse app');}}}};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 return {writes,opened,handlers,activated:()=>activated,focus,offline:()=>{offline=true;},install:()=>{handlers.install({waitUntil:p=>pending=p});return pending;}};
}
(async()=>{
 for(const fault of ['mixed','missing','version','audioMissing','audioCorrupt','audioDigest']){const t=setup(fault);await assert.rejects(t.install());assert.equal(t.writes.length,0);assert.equal(t.activated(),0);}
 const good=setup();await good.install();assert.ok(good.writes.length>30);assert.equal(good.activated(),1);
 let pending;good.handlers.notificationclick({notification:{tag:'test',data:{},close(){}},waitUntil:p=>pending=p});await pending;assert.deepEqual(good.focus,['app']);
 for(const p of ['js/app.js','assets/meows/kitten.mp3']){
  let response;good.handlers.fetch({request:{method:'GET',mode:'cors',url:'https://example.test/Luna/'+p+'?v=1.0'},respondWith:p=>response=p});assert.equal((await response).status,503,'missing old release cannot fetch newer code or audio');
 }
 assert.ok(!good.opened.includes('luna-1.0'));
 good.offline();
 for(const file of ['cat-voice.mp3','kitten.mp3','cat-meow.mp3']){
  let response;good.handlers.fetch({request:{method:'GET',mode:'cors',url:'https://example.test/Luna/assets/meows/'+file+'?v='+manifest.version},respondWith:p=>response=p});
  assert.deepEqual(Buffer.from(await (await response).arrayBuffer()),fs.readFileSync(path.join(root,'assets/meows',file)),'offline response must preserve original MP3 bytes');
 }
 console.log('Atomic updates: corrupt/missing audio and code rejected with zero writes; all three real recordings work offline; versions stay isolated');
})().catch(e=>{console.error(e);process.exitCode=1;});
