const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const memory = {}; let quota = false;
const ctx = vm.createContext({ console, localStorage: {
  getItem: k => memory[k] || null,
  setItem(k,v) { if (quota) throw new Error('Quota'); memory[k] = String(v); },
  removeItem: k => delete memory[k]
} });
for (const f of ['storage', 'planlar']) vm.runInContext(fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8'), ctx);
const run = s => vm.runInContext(s, ctx);
const get = s => JSON.parse(run(`JSON.stringify(${s})`));
run(`Store.data.sessions.push({ id:'old-session', start:new Date(2026,0,10,12).getTime(), minutes:90, questions:12, subjectId:'s1' }); Store.data.fish=7; Store.data.badges={one:123};`);
const unchanged = get('[Store.data.sessions,Store.data.fish,Store.data.badges]');
for (const [v, scope, expected] of [['1,5','day',90],['0.25','day',15],['','day',0],['24','day',1440],['25','day',null],['168','week',10080],['744','month',44640],['-1','day',null],['abc','day',null]]) {
  assert.equal(run(`Planlar.hoursToMinutes(${JSON.stringify(v)}, ${JSON.stringify(scope)})`), expected);
}
const input = { date:'2026-01-10', subjectId:'s1', topic:'Problemler <b>test</b>', questions:35 };
const rec = get(`Planlar.saveQuestions(${JSON.stringify(input)})`);
assert.ok(rec.id);
assert.equal(run(`Planlar.subjectWork('s1','day','2026-01-10').questions`),47);
assert.equal(run(`Planlar.subjectWork('s1','day','2026-01-10').minutes`),90);
assert.equal(run(`Planlar.questionEntries('week','2026-01-05').length`),1);
assert.equal(run(`Planlar.questionEntries('day','2026-01-11').length`),0);
for (const patch of [{questions:0},{questions:1.5},{questions:10000},{date:'2026-02-30'},{date:'2099-01-01'},{topic:' '},{subjectId:'missing'}]) {
  assert.equal(run(`Planlar.saveQuestions(${JSON.stringify({...input,...patch})})`), false);
}
run(`Planlar.saveQuestions(${JSON.stringify({...input,questions:42})},${JSON.stringify(rec.id)})`);
assert.equal(run(`Planlar.questionEntries('day','2026-01-10')[0].questions`),42);
assert.equal(run('Store.data.questionLogs.length'),1);
run('Store.importJSON(JSON.parse(JSON.stringify(Store.data)))');
assert.equal(run(`Planlar.questionEntries('day','2026-01-10')[0].questions`),42);
const backup = get('Store.data');
quota = true;
assert.equal(run(`Planlar.saveQuestions(${JSON.stringify(input)})`),false);
assert.equal(run(`Planlar.removeQuestions(${JSON.stringify(rec.id)})`),false);
assert.equal(run(`Planlar.questionEntries('day','2026-01-10')[0].questions`),42);
quota = false;
run(`Planlar.removeQuestions(${JSON.stringify(rec.id)})`);
assert.equal(run(`Planlar.questionEntries('day','2026-01-10').length`),0);
// A newer deletion marker prevents old backups resurrecting the entry.
run('Store.data.questionLogs[0].updated += 1000');
run(`Store.mergeJSON(${JSON.stringify(backup)})`);
assert.equal(run(`Planlar.questionEntries('day','2026-01-10').length`),0);
assert.deepEqual(get('[Store.data.sessions,Store.data.fish,Store.data.badges]'),unchanged);
run(`Store.importJSON({ sessions: Store.data.sessions, questionLogs:'bad' })`);
assert.deepEqual(get('Store.data.questionLogs'),[]);
assert.equal(run('Store.data.sessions.length'),1);
console.log('Question journal: hours, validation, totals, edits, backup, deletion merge, quota rollback and no study rewards passed');
