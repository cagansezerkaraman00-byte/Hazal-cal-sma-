// Run: node tests/luna-conversation.test.cjs
const source = require('node:fs').readFileSync(require('node:path').join(__dirname, '../js/messages.js'), 'utf8');
const passed = (() => {

const Store = { save() {}, data: { settings: { name: 'Hazal', dailyGoal: 180 }, sessions: [], timer: null, loveNotes: [] } };
const U = {
 dateKey: d => { d = new Date(d); return [d.getFullYear(), d.getMonth()+1, d.getDate()].join('-'); },
 pick: a => a[0]
};
const M = new Function('Store', 'U', source + '\nreturn Messages;')(Store, U);
const at = (day, hour, minute = 0) => new Date(2026, 9, day, hour, minute);
let count = 0;
function eq(actual, expected, label) { if (actual !== expected) throw new Error(label + ': ' + actual + ' !== ' + expected); count++; }
eq(M.get('welcome'), 'Merhaba Hazal! Ben Luna 🤍 Bundan sonra derslerinde hep yanındayım. Hadi ilk oturumu başlatalım!', 'original welcome');
eq(M.mood(at(6, 10)), 'companion', 'no morning guilt');
eq(M.mood(at(6, 18)), 'lowStudy', 'low study evening');
Store.data.timer = {running:true};
eq(M.mood(at(6, 18)), 'companion', 'active study not scolded');
Store.data.timer = null;
Store.data.sessions = [{start:at(6, 12).getTime(),minutes:180}];
eq(M.mood(at(6, 18)), 'proud', 'daily goal');
Store.data.sessions = [{start:at(5, 12).getTime(),minutes:180}];
eq(M.mood(at(6, 18)), 'lowStudy', 'yesterday excluded');
M.companionState(at(6, 18)).lowStudySaid = true;
eq(M.mood(at(6, 19)), 'companion', 'evening sitem only once');
eq(M.mood(at(6, 23)), 'bedtime', 'bedtime');
M.companionState(at(6, 23)).bedtime = true;
eq(M.mood(at(6, 23)), 'late', 'after goodnight only sleepy lines');
eq(M.mood(at(7, 1)), 'late', 'no second goodnight after midnight');
eq(M.companionState(at(7, 1)).bedtime, true, 'night belongs to the evening before 05:00');
const c = M.companionState(at(6, 23)); c.checkedIn = true; c.introduced = true;
eq(M.companionState(at(7, 8)).checkedIn, false, 'new daily check-in');
eq(M.companionState(at(7, 8)).introduced, true, 'intro persists');
const away = (h,m,extra={})=>({at:at(7,h,m).getTime(),...extra});
eq(M.departure(away(10,0), new Date(at(7,10).getTime()+10000)), false, 'short exit ignored');
eq(M.companionState(at(7,10)).departures, 0, 'short exit not counted');
eq(M.departure(away(10,0,{app:'spotify'}),at(7,10,1)), false, 'allowed app');
const first = away(10,0);
eq(M.departure(first,at(7,10,1)),false,'first exit');
eq(M.departure(first,at(7,10,2)),false,'same exit not counted twice');
eq(M.companionState(at(7,10)).departures,1,'one counted exit');
eq(M.departure(away(10,2),at(7,10,3)),true,'second exit nudge');
eq(M.departure(away(10,4),at(7,10,5)),false,'cooldown');
eq(M.departure(away(10,13),at(7,10,14)),true,'after cooldown');
eq(M.companionState(at(8,8)).departures,0,'daily departures reset');
return count;

})();
console.log(`${passed} Luna conversation checks passed`);
