const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const Store={save(){},data:{settings:{name:'Hazal'},sessions:[],loveNotes:[]}};
const U={pick:a=>a[0],dateKey:d=>new Date(d).toISOString().slice(0,10),rand:(a,b)=>(a+b)/2,clamp:(v,a,b)=>Math.min(b,Math.max(a,v))};
const M=new Function('Store','U',read('js/messages.js')+';return Messages;')(Store,U);
for(const [kind,speaker] of [['fed','luna'],['vesperFed','vesper'],['kittenFed','kitten']]) {
  const lines=Array.from({length:20},()=>M.get(kind));
  assert.equal(new Set(lines).size,20,kind+' has twenty different lines before repeating');
  assert.equal(M.delivery(kind).speaker,speaker);
  assert.equal(M.delivery(kind).emotion,'happy');
  assert.ok(lines.every(x=>!x.includes('{name}')));
}
const injection=`
    inspect: {
      setup(){W=220;groundY=110;L.x=80;L.y=0;L.dir=1;friends=['vesper','kitten'].map((kind,i)=>({kind,x:120+i*30,y:0,dir:1,state:'sit',steps:[{do:'wait',t:10}],ft:0}));},
      finish(){for(let j=0;j<300 && fishItem;j++){eatFish(.1);if(fishItem?.actor===L && L.state==='walk')L.x+=Math.sign(L.target-L.x)*Math.min(Math.abs(L.target-L.x),L.speed*.1);}return !fishItem;},
      clearFriends(){friends=[];}
    },
`;
const Scene=new Function('U','window','matchMedia',read('js/scene.js').replace('    init(canvas',injection+'    init(canvas')+';return Scene;')(U,{},()=>({matches:false}));
Scene.inspect.setup();const completed=[];
for(const expected of ['luna','vesper','kitten']) {
  assert.equal(Scene.feed(kind=>completed.push(kind)),expected);
  assert.equal(Scene.feed(()=>{throw Error('second meal must not start');}),null);
  assert.ok(Scene.inspect.finish(),'meal completes');
}
assert.deepEqual(completed,['luna','vesper','kitten']);
Scene.inspect.clearFriends();assert.equal(Scene.feed(),'luna');assert.ok(Scene.inspect.finish());
console.log('60 distinct feeding lines, speaker routing, meal completion and double-tap protection passed');
