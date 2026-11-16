/* Hazal'ın Küçük Dünyası (veri): çalıştıkça dolan oda. Ayrı bir ilerleme sistemi yok; Planlarım ve rozetler kullanılır.
   - Bugün ilk kez bir plan maddesi bitince odaya bir eşya gelir; bugünün planı tamamen bitince bir eşya daha (günde en çok iki).
     Aynı gün için ödül bir kez verilir: işaret kaldırılıp yeniden konsa da ikinci eşya gelmez.
   - Oda ilk açıldığında şimdiye kadarki emek de sayılır: planından madde bitirdiği her geçmiş gün için bir eşya (en çok 6).
   - Eşyalar önce tek tek gelir, hepsi gelince renkli olanların yeni renkleri gelir.
   - Kazanılan rozetler odanın duvarında çerçeve, kitaplığında kupa ve kitap olur (Badges'tan okunur, burada saklanmaz; silinmez).
   - Eşyalar ve okunan mektuplar D().dunya içinde durur: yedeğe girer, güncellemede kaybolmaz.
   D().dunya = { esyalar: [{ id: 'es-<tür>', tur, renk, renkler, yer, at, updated }], odul: { 'ilk:YYYY-AA-GG': 'tür:renk', 'tam:…': … },
                 acildi: { mektupId: 'YYYY-AA-GG' }, hosgeldin: ms, gorulen: ms } */

const Dunya = (() => {
  const D = () => Store.data;
  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  const RENKLER = [ // renkli eşyalarda a: ana renk, A: gölge, h: ışık, o: dış hat
    { ad: 'Pembe', a: '#e9a3cb', A: '#c97fae', h: '#fbd3e8', o: '#8e4f78' },
    { ad: 'Lila', a: '#b79bff', A: '#8f74e0', h: '#ddd0ff', o: '#5f45a8' },
    { ad: 'Nane', a: '#8fd6b4', A: '#5fae8c', h: '#c9f0dc', o: '#3f7d63' },
  ];
  // kat: kucuk (masa üstü; yere de konur), yer (yalnızca zemin), asili (pencerenin üstü). once: ilk konacağı yerler
  const ESYALAR = [
    { tur: 'lavanta', ad: 'Lavanta çiçeği', kat: 'kucuk', renkli: true, once: ['pencere-sol', 'sehpa'] },
    { tur: 'minder', ad: 'Minder', kat: 'yer', renkli: true, once: ['hali-sol', 'hali-sag'] },
    { tur: 'lamba', ad: 'Yıldız lambası', kat: 'kucuk', once: ['kitaplik-ust', 'sehpa'] },
    { tur: 'kitap', ad: 'Okuma yığını', kat: 'kucuk', once: ['pencere-sag', 'sehpa'] },
    { tur: 'celenk', ad: 'Yıldız çelengi', kat: 'asili', once: ['pencere-ust'] },
    { tur: 'mum', ad: 'Mum', kat: 'kucuk', renkli: true, once: ['sehpa', 'pencere-sag'] },
    { tur: 'kupa', ad: 'Sıcak kupa', kat: 'kucuk', renkli: true, once: ['sehpa', 'pencere-sag'] },
    { tur: 'puf', ad: 'Puf', kat: 'yer', renkli: true, once: ['yer-sol', 'hali-sag'] },
    { tur: 'zambak', ad: 'Zambak saksısı', kat: 'kucuk', once: ['pencere-sag', 'kitaplik-ust'] },
    { tur: 'sepet', ad: 'Yumak sepeti', kat: 'yer', renkli: true, once: ['hali-sag', 'yer-sag'] },
    { tur: 'balik', ad: 'Balık kâsesi', kat: 'kucuk', once: ['sehpa', 'kitaplik-ust'] },
    { tur: 'yatak', ad: 'Kedi yatağı', kat: 'yer', renkli: true, once: ['yer-sag', 'hali-sol'] },
    { tur: 'karkuresi', ad: 'Kar küresi', kat: 'kucuk', once: ['kitaplik-ust', 'pencere-sol'] },
    { tur: 'teleskop', ad: 'Teleskop', kat: 'yer', once: ['yer-sag', 'yer-sol'] },
  ];
  const YERLER = {
    'pencere-ust': { ad: 'Pencere üstü', kat: 'asili' },
    'pencere-sol': { ad: 'Pencere solu', kat: 'kucuk' },
    'pencere-sag': { ad: 'Pencere sağı', kat: 'kucuk' },
    'kitaplik-ust': { ad: 'Kitaplığın üstü', kat: 'kucuk' },
    'sehpa': { ad: 'Sehpa', kat: 'kucuk' },
    'yer-sol': { ad: 'Yer, sol', kat: 'yer' },
    'hali-sol': { ad: 'Halı, sol', kat: 'yer' },
    'hali-sag': { ad: 'Halı, sağ', kat: 'yer' },
    'yer-sag': { ad: 'Yer, sağ', kat: 'yer' },
  };
  const GECMIS_EN_COK = 6;
  const bos = () => ({ esyalar: [], odul: {}, acildi: {}, hosgeldin: 0, gorulen: 0 });
  function st() {
    const d = D();
    if (!isObj(d.dunya)) d.dunya = bos();
    return d.dunya;
  }
  const bilgi = (tur) => ESYALAR.find((e) => e.tur === tur) || null;
  const gun = (ms) => U.dateKey(new Date(ms));
  // eşyanın konabileceği yerler: asılı olanlar yalnızca pencerenin üstüne, zemin eşyaları yalnızca yere; küçükler her yere
  function yerleri(tur) {
    const e = bilgi(tur);
    if (!e) return [];
    return Object.keys(YERLER).filter((y) => (e.kat === 'asili' ? YERLER[y].kat === 'asili' : e.kat === 'yer' ? YERLER[y].kat === 'yer' : YERLER[y].kat !== 'asili'));
  }
  function bosYer(tur) {
    const dolu = new Set(st().esyalar.map((x) => x.yer).filter(Boolean)), e = bilgi(tur);
    return [...e.once, ...yerleri(tur)].find((y) => yerleri(tur).includes(y) && !dolu.has(y)) || '';
  }
  // sıradaki ödül: önce her eşyanın ilk hâli, sonra renkli eşyaların ikinci, sonra üçüncü rengi
  function sonraki() {
    const s = st();
    for (let r = 0; r < RENKLER.length; r++) {
      for (const e of ESYALAR) {
        const x = s.esyalar.find((z) => z.tur === e.tur);
        if (r === 0 && !x) return { tur: e.tur, renk: 0 };
        if (r > 0 && e.renkli && x && !x.renkler.includes(r)) return { tur: e.tur, renk: r };
      }
    }
    return null;
  }
  function ver(kaynak, now) {
    const o = sonraki();
    if (!o) return null;
    const s = st();
    let x = s.esyalar.find((z) => z.tur === o.tur);
    if (!x) { x = { id: 'es-' + o.tur, tur: o.tur, renk: 0, renkler: [0], yer: bosYer(o.tur), at: now, updated: now }; s.esyalar.push(x); }
    else { x.renkler.push(o.renk); x.renk = o.renk; x.at = now; x.updated = now; } // yeni rengi hemen görünsün; istersen eskisine dönersin
    return { tur: o.tur, renk: o.renk, yeni: o.renk === 0, kaynak, at: now };
  }
  const iz = (r) => (r ? r.tur + ':' + r.renk : '-');

  let dinleyici = null;
  // Planlar.setDone'dan: bir günlük plan maddesi ilk kez bitince (kaldırılıp yeniden işaretlenince de çağrılır; gün başına bir kez ödül)
  function planBitti(planKey, fullDay, now = Date.now()) {
    const s = st(), bugun = gun(now), out = [];
    const k1 = 'ilk:' + bugun;
    if (!s.odul[k1]) { const r = ver('ilk', now); s.odul[k1] = iz(r); if (r) out.push(r); }
    if (fullDay && planKey === bugun) {
      const k2 = 'tam:' + bugun;
      if (!s.odul[k2]) { const r = ver('tam', now); s.odul[k2] = iz(r); if (r) out.push(r); }
    }
    if (out.length && dinleyici) { try { dinleyici(out); } catch (e) { /* oda ödülü planı bozmasın */ } }
    return out;
  }
  // planda madde bitirdiği günler (yalnızca okunur): Planlarım maddeleri, tam biten günler, eski YKS planı
  function emekGunleri() {
    const set = new Set(), d = D(), day = isObj(d.plans) && isObj(d.plans.day) ? d.plans.day : {};
    for (const k of Object.keys(day)) {
      if (!Array.isArray(day[k])) continue;
      for (const it of day[k]) if (isObj(it) && !it.del && it.done) set.add(it.doneAt ? gun(it.doneAt) : k);
    }
    for (const k of (d.stats && Array.isArray(d.stats.planFullDates) ? d.stats.planFullDates : [])) if (typeof k === 'string') set.add(k);
    const pd = d.yks && isObj(d.yks.planDone) ? d.yks.planDone : {};
    for (const k of Object.keys(pd)) if (Array.isArray(pd[k]) && pd[k].length) set.add(k);
    return set;
  }
  // oda ilk açıldığında: şimdiye kadarki emeğin hediyesi (bir kez). Bu güncellemeden önce bugün biten madde varsa günün ödülü de.
  function hosgeldin(now = Date.now()) {
    const s = st();
    if (s.hosgeldin) return [];
    const bugun = gun(now), gunler = emekGunleri(), out = [];
    const gecmis = [...gunler].filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k) && k < bugun).length;
    for (let i = 0; i < Math.min(GECMIS_EN_COK, gecmis); i++) { const r = ver('gecmis', now); if (!r) break; out.push(r); }
    if (gunler.has(bugun) && !s.odul['ilk:' + bugun]) { const r = ver('ilk', now); s.odul['ilk:' + bugun] = iz(r); if (r) out.push(r); }
    if (typeof Planlar !== 'undefined' && Planlar.stats && !s.odul['tam:' + bugun]) {
      const t = Planlar.stats(Planlar.list('day', bugun));
      if (t.total > 0 && t.done === t.total && t.moved === 0) { const r = ver('tam', now); s.odul['tam:' + bugun] = iz(r); if (r) out.push(r); }
    }
    s.hosgeldin = now;
    Store.save();
    return out;
  }
  // eşyanın yeri: dolu bir yere konursa oradaki eşya onun eski yerine geçer (olmuyorsa dolaba)
  function yerlestir(tur, yer, now = Date.now()) {
    const s = st(), x = s.esyalar.find((z) => z.tur === tur);
    if (!x || (yer && !yerleri(tur).includes(yer)) || x.yer === yer) return false;
    const diger = yer && s.esyalar.find((z) => z.yer === yer);
    if (diger) { diger.yer = yerleri(diger.tur).includes(x.yer) ? x.yer : ''; diger.updated = now; }
    x.yer = yer; x.updated = now;
    Store.save();
    return true;
  }
  function renkSec(tur, r, now = Date.now()) {
    const x = st().esyalar.find((z) => z.tur === tur);
    if (!x || !x.renkler.includes(r) || x.renk === r) return false;
    x.renk = r; x.updated = now;
    Store.save();
    return true;
  }

  // ---------- Mektuplar ----------
  const ILK_OKUNDU = 'luna-mektup-okundu'; // Çalış sekmesindeki ilk mektubun "okundu" işareti (o kartla ortak)
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  function mektuplar() {
    const out = [];
    if (typeof Messages !== 'undefined' && Messages.mektup) out.push({ id: 'ilk', baslik: 'İlk mektubun', kosul: { tur: 'serbest' }, ilk: true });
    if (typeof Mektuplar !== 'undefined') for (const m of Mektuplar.LISTE) if (m && m.id && m.id !== 'ilk') out.push(m);
    return out;
  }
  const hedefSayisi = () => +((D().stats || {}).planItems) || 0;
  function acilabilir(m, now = Date.now()) {
    const k = (m && m.kosul) || {};
    if (k.tur === 'serbest') return true;
    if (k.tur === 'madde') return hedefSayisi() >= (+k.sayi || 1);
    if (k.tur === 'tarih') return typeof k.tarih === 'string' && gun(now) >= k.tarih;
    return false;
  }
  const okundu = (m) => !!st().acildi[m.id] || (m.ilk && lsGet(ILK_OKUNDU) === '1');
  function icerik(m) {
    const partner = (D().settings.partner || '').trim();
    if (m.ilk) { const x = Messages.mektup; return { hitap: x.baslik, paragraflar: x.paragraflar, imza: partner }; }
    const x = typeof Mektuplar !== 'undefined' ? Mektuplar.coz(m.metin) : null;
    return x ? { ...x, imza: m.imza || '' } : null;
  }
  function oku(m, now = Date.now()) {
    const s = st();
    if (!s.acildi[m.id]) { s.acildi[m.id] = gun(now); Store.save(); }
    if (m.ilk) { try { localStorage.setItem(ILK_OKUNDU, '1'); } catch (e) { /* özel sekme */ } }
  }
  const yeniMektup = (now) => mektuplar().find((m) => acilabilir(m, now) && !okundu(m)) || null;

  // ---------- Rozetler: odada nerede durur ----------
  const ROZET_YERI = { ilk: 'cerceve', deneme: 'cerceve', ozel: 'cerceve', sure: 'kupa', seri: 'madalya', yks: 'kitap', odak: 'kitap', kesintisiz: 'kitap' };
  function rozetler() {
    if (typeof Badges === 'undefined' || !Badges.LIST) return [];
    const got = D().badges || {};
    return Badges.LIST.map((b, i) => ({ id: b.id, ad: b.n, e: b.e, cat: b.cat, sira: i, yer: ROZET_YERI[b.cat] || 'kitap', at: got[b.id] || 0 }));
  }

  // ana sayfa kartı için: görülmemiş yeni eşya var mı
  const yeniEsya = () => st().esyalar.filter((x) => x.at > (st().gorulen || 0));
  function gordu(now = Date.now()) { st().gorulen = now; Store.save(); }

  return {
    RENKLER, ESYALAR, YERLER, bilgi, yerleri, st, planBitti, hosgeldin, yerlestir, renkSec, emekGunleri,
    mektuplar, acilabilir, okundu, icerik, oku, yeniMektup, hedefSayisi, rozetler, yeniEsya, gordu,
    dinle(fn) { dinleyici = fn; },
  };
})();

if (typeof window !== 'undefined') { window.Dunya = Dunya; }
