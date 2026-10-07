const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/kurulum.js'),'utf8');
function setup(standalone=false){
const events={},controls=new Map();let root;
const cl={add(){},remove(){},toggle(){}};
for(const key of ['.kr-btn','.kr-arrow','#kr-steps'])controls.set(key,{hidden:false,innerHTML:'',textContent:'Yükle',classList:cl,scrollIntoView(){},addEventListener(){}});
const document={readyState:'complete',documentElement:{classList:cl},querySelector:()=>null,createElement:()=>({id:'',innerHTML:'',classList:cl,setAttribute(){},querySelector:s=>controls.get(s)||null}),body:{prepend:n=>root=n}};
const window={addEventListener:(k,f)=>events[k]=f};
const ctx={URLSearchParams,window,document,navigator:{userAgent:'Android Chrome',webdriver:true},location:{search:'',hash:'',origin:'https://example.test',pathname:'/Luna/'},matchMedia:()=>({matches:standalone})};
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
console.log('15 installation gate and standalone checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});