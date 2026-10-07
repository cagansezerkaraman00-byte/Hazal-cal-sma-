const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/kurulum.js'),'utf8');
function setup(standalone=false, options={}){
const events={},controls=new Map();let root;
const cl={add(){},remove(){},toggle(){}};
for(const key of ['.kr-btn','.kr-arrow','#kr-steps'])controls.set(key,{hidden:false,innerHTML:'',textContent:'Yükle',classList:cl,scrollIntoView(){},addEventListener(){}});
const document={readyState:options.loading ? 'loading' : 'complete',addEventListener:(k,f)=>events[k]=f,documentElement:{classList:cl},querySelector:()=>null,createElement:()=>({id:'',innerHTML:'',classList:cl,setAttribute(){},querySelector:s=>controls.get(s)||null}),body:{prepend:n=>root=n}};
const window={addEventListener:(k,f)=>events[k]=f};
const ctx={URLSearchParams,window,document,navigator:{userAgent:'Android Chrome',webdriver:true,...options.navigator},location:{search:options.search || '',hash:'',origin:'https://example.test',pathname:'/Luna/'},matchMedia:()=>({matches:standalone})};
vm.createContext(ctx);vm.runInContext(source,ctx);return {api:window.LunaKurulum,events,controls,root:()=>root};
}
(async()=>{
const a=setup();assert.equal(a.api.active,true,'browser stays on install landing, even in automation');assert.match(a.root().innerHTML,/Luna'yı yükle/);
let prompts=0;a.events.beforeinstallprompt({preventDefault(){},prompt:async()=>prompts++,userChoice:Promise.resolve({outcome:'dismissed'})});
await a.api.install();assert.equal(prompts,1);assert.match(a.controls.get('#kr-steps').innerHTML,/Uygulamayı yükle/);assert.equal(a.controls.get('.kr-btn').hidden,false);
a.events.beforeinstallprompt({preventDefault(){},prompt:async()=>prompts++,userChoice:Promise.resolve({outcome:'accepted'})});await a.api.install();
assert.equal(a.controls.get('.kr-btn').hidden,true);assert.match(a.controls.get('#kr-steps').innerHTML,/Kurulum isteğin alındı/);assert.match(a.controls.get('#kr-steps').innerHTML,/Bu sayfa uygulamaya yönlendirilmez/);assert.equal(a.api.active,true);
a.events.appinstalled();assert.ok(a.root(),'install screen stays present');
const b=setup(true);assert.equal(b.api.active,false);assert.equal(b.root(),undefined);
const m=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../manifest.webmanifest'),'utf8'));assert.equal(m.id,'./');assert.equal(m.display,'standalone');assert.equal(m.start_url,'./?source=homescreen');

for (const navigator of [
  {userAgent:'Mozilla/5.0 (iPhone) Version/18.0 Safari/604.1'},
  {userAgent:'Mozilla/5.0 (iPad) Version/17.0 Safari/604.1'},
  {userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Version/18.0 Safari/605.1',platform:'MacIntel',maxTouchPoints:5}
]) {
  const ios=setup(false,{navigator,loading:true});
  assert.equal(ios.root(),undefined);
  ios.api.mount(); const mounted=ios.root();
  assert.match(ios.controls.get('#kr-steps').innerHTML,/indirme çubuğu bekleme/);
  assert.equal(ios.controls.get('#kr-steps').hidden,false);
  assert.match(ios.controls.get('#kr-steps').innerHTML,/Web Uygulaması Olarak Aç/);
  assert.equal(ios.controls.get('.kr-btn').textContent,'Ana ekrana ekleme adımları');
  ios.events.DOMContentLoaded(); assert.equal(ios.root(),mounted,'mount is idempotent');
  ios.events.beforeinstallprompt({preventDefault(){},prompt(){throw Error('iOS must not wait for an install prompt');}});
  await ios.api.install(); assert.equal(ios.controls.get('.kr-btn').hidden,false);
}
const embedded=setup(false,{navigator:{userAgent:'iPhone Instagram'}});
assert.match(embedded.controls.get('#kr-steps').innerHTML,/Safari'de aç/);
const chromeIOS=setup(false,{navigator:{userAgent:'iPhone CriOS/123'}});
assert.match(chromeIOS.controls.get('#kr-steps').innerHTML,/Safari/);
assert.equal(setup(true,{search:'?kurulum'}).api.active,false,'installed app never gets trapped on install landing');
console.log('Installation checks passed: Android, iPhone, desktop-mode iPad, embedded browsers and early mounting');

})().catch(e=>{console.error(e);process.exitCode=1;});
