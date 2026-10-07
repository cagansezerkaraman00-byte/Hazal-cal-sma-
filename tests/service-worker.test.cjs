const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto').webcrypto;
const root=path.join(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'release-manifest.json'),'utf8'));
const source=fs.readFileSync(path.join(root,'sw.js'),'utf8');
function setup(fault){
 const handlers={},writes=[],focus=[],opened=[];let activated=0,pending;
 const scope='https://example.test/Luna/';
 const ctx={crypto,URL,Response,location:{origin:'https://example.test'},SURUMLER:[{surum:manifest.version}],importScripts(){},Request:class{constructor(url){this.url=url;}},
 fetch:async request=>{const file=typeof request==='string'?request:request.url;if(file==='release-manifest.json')return new Response(JSON.stringify({...manifest,version:fault==='version'?'old':manifest.version}));const p=file==='./'?'index.html':file;if(fault==='missing' && p==='js/app.js')return new Response('',{status:404});return new Response(fault==='mixed' && p==='js/messages.js'?'old code':fs.readFileSync(path.join(root,p)));},
 caches:{open:async name=>{opened.push(name);return {put:async (...x)=>writes.push(x),match:async()=>undefined};},keys:async()=>[],delete:async()=>{throw Error('no caches should be removed');}},
 self:{registration:{scope,getNotifications:async()=>[]},addEventListener:(k,f)=>handlers[k]=f,skipWaiting:async()=>activated++,clients:{claim:async()=>{},matchAll:async()=>[{url:'https://example.test/other/',focus:async()=>focus.push('other')},{url:scope+'?source=homescreen',postMessage(){},focus:async()=>focus.push('app')}],openWindow:async()=>{throw Error('reuse app');}}}};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 return {writes,opened,handlers,activated:()=>activated,focus,install:()=>{handlers.install({waitUntil:p=>pending=p});return pending;}};
}
(async()=>{
 for(const fault of ['mixed','missing','version']){const t=setup(fault);await assert.rejects(t.install());assert.equal(t.writes.length,0);assert.equal(t.activated(),0);}
 const good=setup();await good.install();assert.ok(good.writes.length>30);assert.equal(good.activated(),1);
 let pending;good.handlers.notificationclick({notification:{tag:'test',data:{},close(){}},waitUntil:p=>pending=p});await pending;assert.deepEqual(good.focus,['app']);
 let response;good.handlers.fetch({request:{method:'GET',mode:'cors',url:'https://example.test/Luna/js/app.js?v=1.0'},respondWith:p=>response=p});assert.equal((await response).status,503,'missing old release cannot fetch new code');
 console.log('Atomic update checks passed: mixed/missing code rejected, matching release activates, old versions cannot mix');
})().catch(e=>{console.error(e);process.exitCode=1;});
