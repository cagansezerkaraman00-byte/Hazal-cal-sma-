const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/kurulum.js'),'utf8');
function setup(standalone=false, options={}){
const events={},controls=new Map();let root;
const cl={add(){},remove(){},toggle(){}};
for(const key of ['.kr-btn','.kr-arrow','#kr-steps'])controls.set(key,{hidden:false,innerHTML:'',textContent:'Yükle',classList:cl,scrollIntoView(){},addEventListener(){}});
const document={readyState:options.loading ? 'loading' : 'complete',addEventListener:(k,f)=>events[k]=f,documentElement:{classList:cl},querySelector:()=>null,createElement:()=>({id:'',innerHTML:'',classList:cl,setAttribute(){},addEventListener(){},querySelector:s=>controls.get(s)||null}),body:{prepend:n=>root=n}};
const window={addEventListener:(k,f)=>events[k]=f};
const timers=[];const ctx={URLSearchParams,window,document,setTimeout:(f)=>timers.push(f),navigator:{userAgent:'Android Chrome',webdriver:true,...options.navigator},location:{search:options.search || '',hash:'',origin:'https://example.test',pathname:'/Luna/'},matchMedia:(q)=>({matches:/display-mode/.test(q) ? standalone : !!options.coarse})};
vm.createContext(ctx);vm.runInContext(source,ctx);return {api:window.LunaKurulum,events,controls,root:()=>root,timers};
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
// Android tablet in desktop-site mode ("X11; Linux") must get Android steps, not PC steps
const tabletUA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
const tab=setup(false,{navigator:{userAgent:tabletUA,maxTouchPoints:5},coarse:true});
let tapped=tab.api.install(); tab.timers.forEach((f)=>f()); await tapped;
assert.match(tab.controls.get('#kr-steps').innerHTML,/Yükle ve kısayol oluştur/); assert.doesNotMatch(tab.controls.get('#kr-steps').innerHTML,/⊕/);
const pc=setup(false,{navigator:{userAgent:tabletUA,maxTouchPoints:0}});
tapped=pc.api.install(); pc.timers.forEach((f)=>f()); await tapped; assert.match(pc.controls.get('#kr-steps').innerHTML,/⊕/,'a Linux PC keeps desktop steps');
// one tap: the prompt arriving while the tap waits opens the system dialog
const wait=setup(false,{navigator:{userAgent:tabletUA,maxTouchPoints:5},coarse:true}); let opened=0;
tapped=wait.api.install(); assert.equal(wait.controls.get('.kr-btn').textContent,'Hazırlanıyor…');
wait.events.beforeinstallprompt({preventDefault(){},prompt:async()=>opened++,userChoice:Promise.resolve({outcome:'accepted'})}); await tapped;
assert.equal(opened,1); assert.match(wait.controls.get('#kr-steps').innerHTML,/Kurulum isteğin alındı/);
// the prompt arriving after the steps are shown says one more tap is enough
const late=setup(false,{navigator:{userAgent:'Mozilla/5.0 (Linux; Android 14; SM-X710) Chrome/129.0 Safari/537.36'}});
tapped=late.api.install(); late.timers.forEach((f)=>f()); await tapped;
late.events.beforeinstallprompt({preventDefault(){},prompt:async()=>{},userChoice:Promise.resolve({outcome:'accepted'})});
assert.match(late.controls.get('#kr-steps').innerHTML,/bir kez daha dokun/);
// browsers that never offer the system dialog get their own menus at once
const samsung=setup(false,{navigator:{userAgent:'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Safari/537.36'}});
tapped=samsung.api.install(); samsung.timers.forEach((f)=>f()); await tapped; assert.match(samsung.controls.get('#kr-steps').innerHTML,/Sayfa ekle/);
const fxa=setup(false,{navigator:{userAgent:'Mozilla/5.0 (Android 14; Tablet; rv:131.0) Gecko/131.0 Firefox/131.0'}});
await fxa.api.install(); assert.equal(fxa.timers.length,0,'Firefox never waits'); assert.match(fxa.controls.get('#kr-steps').innerHTML,/Uygulamayı ana ekrana ekle/); assert.doesNotMatch(fxa.controls.get('#kr-steps').innerHTML,/yükleyemiyor/);
const wv=setup(false,{navigator:{userAgent:'Mozilla/5.0 (Linux; Android 14; SM-X710 Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Safari/537.36'}});
await wv.api.install(); assert.match(wv.controls.get('#kr-steps').innerHTML,/Tarayıcıda aç/);
// iPad: no arrow (Share moves with the window size); iPhone keeps it; bookmark launch explains the toggle
const ipad=setup(false,{navigator:{userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Version/18.0 Safari/605.1',platform:'MacIntel',maxTouchPoints:5}});
assert.equal(ipad.controls.get('.kr-arrow').hidden,true); assert.match(ipad.controls.get('#kr-steps').innerHTML,/Daha Fazla/);
const iphone=setup(false,{navigator:{userAgent:'Mozilla/5.0 (iPhone) Version/18.0 Safari/604.1'}}); assert.equal(iphone.controls.get('.kr-arrow').hidden,false);
const bookmark=setup(false,{navigator:{userAgent:'Mozilla/5.0 (iPad) Version/26.0 Safari/604.1'},search:'?source=homescreen'});
assert.match(bookmark.controls.get('#kr-steps').innerHTML,/Luna Safari'de açıldı/);
console.log('Installation checks passed: Android phones and tablets (desktop mode, Samsung, Firefox, WebView), one-tap prompt, iPhone, iPad, embedded browsers and early mounting');

})().catch(e=>{console.error(e);process.exitCode=1;});
