// Run: node tests/scene-characters.test.cjs
const source = require('node:fs').readFileSync(require('node:path').join(__dirname,'../js/scene.js'),'utf8');
const injection = "\n    inspect: { poseRows, kittenRows, LUNA_PAL, VES_PAL, KIT_PAL, expression, emotionPose, express,\n      setup(h,elev,m='idle') { W=220; H=130; groundY=110; hour=h; sun={elev}; mode=m; L.x=80; L.y=0; friends=[]; time=0; play=null; fishItem=null; nextVisit=999; eveningVisitDay=''; },\n      setTime(t){time=t;}, reduce(x){reducedMotion=x;}, vesperTime, startVisit, updateFriends,\n      friends:()=>friends, setArrival(fn){onFriendArrival=fn;}, L\n    },\n";
const U={rand:(a,b)=>(a+b)/2,clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),dateKey:d=>new Date(d).toISOString().slice(0,10)};
const api=new Function('U','window','matchMedia',source.replace('    init(canvas',injection+'    init(canvas')+';return Scene;')(U,{},()=>({matches:false}));
const i=api.inspect, rows=i.poseRows(),kit=i.kittenRows();
let n=0;function assert(x,label){if(!x)throw Error(label);n++;}
for(const mood of ['neutral','happy','proud','angry','sad','tender','sleepy'])for(const art of [rows,kit]){
const p=art['face_'+mood];assert(!!p,'pose '+mood);assert(p.rows.every(r=>r.length===p.rows[0].length),'rectangular '+mood);
}
i.setup(12,35);i.startVisit('vesper');assert(i.friends().length===0,'Vesper absent day');
i.setup(18,10);i.startVisit('vesper');assert(i.friends().length===0,'wait for darkness');
i.setup(19,-8);i.startVisit('vesper');assert(i.friends()[0]?.kind==='vesper','evening');
i.setup(2,-25);assert(i.vesperTime(),'after midnight');
i.setup(19,-8,'focus');i.startVisit('vesper');assert(i.friends().length===0,'quiet focus');
i.setup(12,30);i.startVisit('family');assert(i.friends().every(f=>f.kind==='kitten'),'day family');
i.setup(19,-8);i.updateFriends(.1);assert(i.friends()[0]?.kind==='vesper','automatic arrival');
let arrivals=0;i.setArrival(()=>arrivals++);for(let j=0;j<200;j++)i.updateFriends(.1);assert(arrivals===1,'one arrival callback');
i.express(i.L,'angry',8000);assert(i.emotionPose(i.L)==='face_angry','angry');
i.setTime(9);assert(i.emotionPose(i.L)===null,'expression expires');
i.setTime(0);i.express(i.L,'sleepy',8000);i.reduce(true);assert(i.emotionPose(i.L)==='face_sleepy','reduced motion');
console.log(n+' scene character checks passed');
