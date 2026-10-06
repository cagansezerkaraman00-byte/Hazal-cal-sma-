// Run: node tests/update-flow.test.cjs
const source = require('node:fs').readFileSync(require('node:path').join(__dirname, '../js/guncelleme.js'), 'utf8');
(async()=>{

const nodes = new Map();
const node = () => ({innerHTML:'',classList:{toggle(){},contains(){return true;}}});
const docListeners={}, swListeners={};
const document={hidden:false,querySelector:s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);},addEventListener:(k,fn)=>docListeners[k]=fn};
const window={addEventListener(){},YKS:null};
let reloads=0, updates=0, allowExits=0, offline=false;
const location={hash:'',protocol:'https:',reload(){reloads++;}};
const data={settings:{notify:false},sessions:[]};
const toasts=[];
const app={data:()=>data,toast:(...x)=>toasts.push(x),allowExit:()=>allowExits++,isBusy:()=>false};
const reg={update:async()=>{updates++;}};
const navigator={userAgent:'Test',platform:'Test',serviceWorker:{controller:{},register:async()=>reg,addEventListener:(k,fn)=>{(swListeners[k] ||= []).push(fn);}}};
const localStorage={getItem:()=> '2.1',setItem(){}};
const U={esc:String,MONTHS:['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']};
const SURUMLER=[{surum:'2.1',tarih:'2026-10-06',baslik:'Eski',notlar:[]}];
const remote='/*SURUMLER*/'+JSON.stringify([{surum:'2.1.1',tarih:'2026-10-06',baslik:'Yeni Luna',notlar:['Yeni sohbet']}])+'/*SURUMLER*/';
const fetch=async()=>{if(offline)throw Error('offline');return {ok:true,text:async()=>remote};};
const f=new Function('document','window','navigator','location','localStorage','U','SURUMLER','fetch','matchMedia','setTimeout','setInterval',source+'; return Guncelleme;');
const g=f(document,window,navigator,location,localStorage,U,SURUMLER,fetch,()=>({matches:false}),()=>0,()=>0);
let count=0;
function ok(value,label){if(!value)throw Error(label);count++;}
ok(g.newer('2.1.1','2.1'),'patch version detection');
ok(g.newer('2.10','2.9'),'numeric version order');
ok(!g.newer('2.1','2.1'),'same version');
ok(g.parse('broken')===null,'invalid version document');
g.init(app);
await Promise.resolve();
await g.check(true);
ok(nodes.get('#update-card').innerHTML.includes("Sürüm 2.1.1'e güncelle"),'settings update button rendered');
ok(nodes.get('#update-banner').innerHTML.includes('Güncelle'),'banner update button rendered');
ok(nodes.get('#update-card').innerHTML.includes('Geliştiren: Çağan Sezer Karaman'),'developer credit');
offline=true; await g.check(true);
ok(toasts.some(x=>x.includes('Güncellemelere bakılamadı')),'offline error surfaced');
offline=false;
reg.update=async()=>{for(const fn of swListeners.controllerchange||[])fn();};
await g.apply();
ok(reloads===1,'update reload exactly once');
ok(allowExits===1,'reload exempted from focus penalty');
console.log(`${count} update flow checks passed`);

})().catch(e=>{ console.error(e); process.exitCode=1; });
