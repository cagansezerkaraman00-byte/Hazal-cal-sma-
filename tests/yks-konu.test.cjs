// Run: node tests/yks-konu.test.cjs
// YKS konuları doğru derste ve doğru sınavda mı (MEB/ÖSYM çerçevesi; 2027 YKS'de yapı değişmedi, yeni müfredat 2028'den).
// Örn. Paragraf TYT Türkçe'de, Problemler TYT Matematik'te, Türev AYT Matematik'te; hiçbiri Fizik'te değil.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let n = 0;
const ok = (v, label) => { assert.ok(v, label); n++; };
const eq = (a, b, label) => { assert.deepStrictEqual(a, b, label); n++; };

const store = { 'luna-study-v1': JSON.stringify({ version: 1, yks: { field: 'SAY', topics: {}, planDone: {} } }) };
const fakeLS = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
const ctx = vm.createContext({ localStorage: fakeLS, console, Date, Math, JSON });
for (const f of ['js/storage.js', 'js/yks.js']) vm.runInContext(read(f), ctx, { filename: f });
const get = (expr) => JSON.parse(vm.runInContext(`JSON.stringify(${expr})`, ctx));
const S = get('Object.fromEntries(Object.entries(YKS.SUBJECTS).map(([k, s]) => [k, { name: s.name, exam: s.exam, total: s.total, topics: s.topics.map((t) => t.name) }]))');
const where = (name) => Object.keys(S).filter((k) => S[k].topics.some((t) => t === name || t.startsWith(name)));

// ---------- konular doğru derste ----------
const yer = {
  'Paragraf': ['tyt_tr', 'ydt'], 'Cümlenin Ögeleri': ['tyt_tr'], 'Sözcükte Anlam': ['tyt_tr'],
  'Problemler': ['tyt_mat'], 'Temel Kavramlar': ['tyt_mat', 'ayt_mat'], 'Türev': ['ayt_mat'], 'İntegral': ['ayt_mat'], 'Limit ve Süreklilik': ['ayt_mat'], 'Trigonometri': ['ayt_mat'],
  'Açılar ve Üçgenler': ['tyt_geo'], 'Çemberin Analitik İncelenmesi': ['ayt_geo'],
  'Optik': ['tyt_fiz'], 'Hareket ve Kuvvet': ['tyt_fiz'], 'Basit Harmonik Hareket': ['ayt_fiz'], 'Modern Fizik': ['ayt_fiz'], 'Atışlar': ['ayt_fiz'],
  'Kimyasal Türler Arası Etkileşimler': ['tyt_kim'], 'Organik Kimya': ['ayt_kim'], 'Gazlar': ['ayt_kim'],
  'Canlıların Sınıflandırılması': ['tyt_bio'], 'Genden Proteine': ['ayt_bio'], 'Sinir Sistemi': ['ayt_bio'],
  'Divan Edebiyatı': ['ayt_edb'], 'Milli Mücadele': ['tyt_tar', 'ayt_tar1', 'ayt_tar2'],
};
for (const [t, keys] of Object.entries(yer)) eq(where(t), keys, `"${t}" → ${keys.map((k) => S[k].name).join(', ')}`);
for (const k of ['tyt_fiz', 'ayt_fiz', 'tyt_kim', 'ayt_kim', 'tyt_bio', 'ayt_bio']) {
  ok(!S[k].topics.some((t) => /^(Türev|Problemler|Paragraf|İntegral|Limit|Cümlenin)/.test(t)), `${S[k].name} içinde matematik ya da Türkçe konusu yok`);
}
for (const k of ['tyt_mat', 'ayt_mat', 'tyt_geo', 'ayt_geo']) ok(!S[k].topics.some((t) => /^(Paragraf|Optik|Organik|Cümlenin)/.test(t)), `${S[k].name} içinde Türkçe/fen konusu yok`);
// her konunun kimliği tek bir derse ait
const ids = get('Object.values(YKS.SUBJECTS).flatMap((s) => s.topics.map((t) => t.id))');
eq(ids.length, new Set(ids).size, 'konu kimlikleri benzersiz');
ok(get('Object.values(YKS.SUBJECTS).every((s) => s.topics.every((t) => YKS.topic(t.id).subjectKey === s.key))'), 'her konu kendi dersine bağlı');

// ---------- sınav ve soru sayıları (ÖSYM yapısı) ----------
eq([S.tyt_tr.total, S.tyt_mat.total + S.tyt_geo.total, S.tyt_fiz.total + S.tyt_kim.total + S.tyt_bio.total, S.tyt_tar.total + S.tyt_cog.total + S.tyt_fel.total + S.tyt_din.total], [40, 40, 20, 20], 'TYT: Türkçe 40, Temel Matematik 40, Fen 20, Sosyal 20 (120)');
eq([S.tyt_fiz.total, S.tyt_kim.total, S.tyt_bio.total], [7, 7, 6], 'TYT Fen: Fizik 7, Kimya 7, Biyoloji 6');
eq([S.ayt_mat.total + S.ayt_geo.total, S.ayt_fiz.total, S.ayt_kim.total, S.ayt_bio.total], [40, 14, 13, 13], 'AYT Matematik 40, Fizik 14, Kimya 13, Biyoloji 13');
eq([S.ayt_edb.total + S.ayt_tar1.total + S.ayt_cog1.total, S.ayt_tar2.total + S.ayt_cog2.total + S.ayt_fel.total + S.ayt_din.total], [40, 40], 'AYT TDE-Sosyal-1 40, Sosyal-2 40');
for (const k of Object.keys(S)) ok(S[k].name.startsWith(S[k].exam === 'YDT' ? 'YDT' : S[k].exam + ' '), `${S[k].name}: adında sınavı yazıyor`);

// ---------- sayısalda sayaçtaki dersler doğru YKS derslerine bağlı ----------
const say = get('YKS.studySubjects("SAY").map((s) => [s.name, s.yks])');
eq(say, [['Türkçe', ['tyt_tr']], ['Matematik', ['tyt_mat', 'ayt_mat']], ['Geometri', ['tyt_geo', 'ayt_geo']], ['Fizik', ['tyt_fiz', 'ayt_fiz']], ['Kimya', ['tyt_kim', 'ayt_kim']], ['Biyoloji', ['tyt_bio', 'ayt_bio']], ['Sosyal (TYT)', ['tyt_tar', 'tyt_cog', 'tyt_fel', 'tyt_din']]], 'SAY: her ders kendi TYT ve AYT konularıyla');

// ---------- arayüz: satırda sınav ve ders yazıyor ----------
const ui = read('js/planlar-ui.js');
ok(/function subLabel\(it\)/.test(ui) && /return yk \? yk\.name : s \? s\.name : 'Genel';/.test(ui), 'plan satırında konunun sınavı ve dersi yazıyor (ör. "TYT Matematik")');
ok((ui.match(/subLabel\(it\)/g) || []).length >= 5, 'Bugün kartı, haftalık ve günlük çizelgede aynı yazı');

console.log(`yks-konu: ${n} checks passed`);
