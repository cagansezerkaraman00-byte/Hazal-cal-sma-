/* Bilimsel çalışma asistanının araçları: uygulamadaki verilere YALNIZCA OKUMA erişimi.
   Asistan (Claude) ihtiyaç duyduğunda bu araçları kendisi çağırır; sonuçlar kısa JSON olarak döner.
   Hiçbir araç veri değiştirmez. Deneme kaydı önerisi yalnızca ekranda bir onay kartı gösterir; kaydı Hazal onaylar. */

const AsistanTools = (() => {
  const D = () => Store.data;
  const today = () => U.dateKey(new Date());
  const r2 = (x) => Math.round(x * 100) / 100;
  const clip = (s, n) => { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) + '…' : s; };
  const low = (s) => String(s || '').toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
  const isYks = () => (D().settings.profile.level || 'yks') === 'yks';
  const intIn = (v, a, b, def) => (Number.isInteger(v) ? Math.min(b, Math.max(a, v)) : def);
  const STATUS = ['başlamadım', 'çalışıyorum', 'tekrar', 'tamam'];
  const LEVELS = { yks: 'YKS hazırlık', kpss: 'KPSS hazırlık', uni: 'Üniversite', yl: 'Yüksek lisans', diger: 'Diğer' };

  // ---------- Tanımlar (sırası ve metni sabit: önbelleğe alınan ön ekin parçası) ----------
  const T = (name, description, properties = {}, required = []) => ({
    name, description, eager_input_streaming: true,
    input_schema: { type: 'object', additionalProperties: false, properties, required },
  });
  const DEFS = [
    T('ogrenci_durumu', 'Öğrencinin genel durumu: bugünün tarihi ve saati, eğitim düzeyi ve bölümü, YKS alanı, sınava kalan gün ve hazırlık dönemi, günlük hedef, bugün ve bu hafta çalışılan süre, seri, şu an çalışan sayaç, bekleyen kart ve hata soruları; üniversite/KPSS modunda dönem bilgisi. Öğrenciyle ilgili bir yorum, analiz ya da plan yapmadan önce (bugünün tarihini bilmek için de) çağır.'),
    T('calisma_oturumlari', 'Çalışma oturumlarının özeti: günlük dakikalar ve hedef tutma, ders ders süre/oturum sayısı/ortalama verim (1-5), saat dilimlerine ve haftanın günlerine göre dağılım, gece yarısından sonraki oturumlar, oturum sonunda yazdığı "zorlandığım yer" notları ve ruh hâli. Çalışma düzeni, verim, programa uyum ya da haftalık değerlendirme sorulduğunda çağır.', {
      gun: { type: 'integer', description: 'Kaç günlük özet (1-180). Varsayılan 14.' },
    }),
    T('calisma_programi', 'Çalışma programı ve plana uyum. YKS modunda: bu haftanın günlük programı (yapıldı işaretleriyle), son günlerde tamamlanan plan maddeleri, ders ders konu ilerlemesi (soru ağırlığına göre), açık görevler ve tekrar listesi. Üniversite/KPSS modunda: dersler, haftalık ders saatleri, devamsızlık, notlar, yaklaşan sınav ve ödevler, bugünün ve yarının otomatik çalışma listesi. Program kontrolü ya da yorumu istendiğinde çağır.'),
    T('konu_durumu', 'Konu konu durum: her konunun durumu (başlamadım/çalışıyorum/tekrar/tamam), YKS\'de yılda ortalama kaç soru geldiği ve son denemelerde kaç kez eksik çıktığı. ders verilmezse ders özetleri ve öncelikli konular döner. Eksik analizi, öncelik sıralaması ya da konu planı yaparken çağır.', {
      ders: { type: 'string', description: 'İsteğe bağlı: ders anahtarı (ör. tyt_mat, ayt_fiz) ya da adı (ör. "TYT Matematik"); üniversite/KPSS modunda ders adı.' },
    }),
    T('denemeler', 'Deneme sonuçları: her deneme için tarih, tür, ders ders doğru/yanlış/boş ve net, toplam net, işaretlenen eksik konular ve not; aynı türde bir öncekine göre değişim, son 3 ortalaması, soru ağırlığıyla önceliklendirilmiş eksik konular ve hatalı girilmiş kayıtlar. Deneme kontrolü, yorumu ya da eksik analizi istendiğinde çağır.', {
      adet: { type: 'integer', description: 'Son kaç deneme (1-30). Varsayılan 10.' },
      tur: { type: 'string', enum: ['TYT', 'AYT', 'YDT', 'BRANS'], description: 'İsteğe bağlı tür filtresi.' },
    }),
    T('hata_defteri', 'Hata defteri: yanlış yaptığı soruların ders, konu, hata nedeni (bilgi eksiği, yorum, işlem, dikkat, süre), tekrar kutusu, doğru sayısı ve notu; nedenlere, derslere ve konulara göre özet. Hata analizi istendiğinde ya da deneme/program yorumunu desteklemek için çağır. Bir sorunun fotoğrafına bakmak için dosya_oku aracına foto_id ver.', {
      adet: { type: 'integer', description: 'Listelenecek son kayıt sayısı (1-60). Varsayılan 25.' },
    }),
    T('kitaplik', 'Öğrencinin akademik materyalleri: Depo dosyaları (PDF, fotoğraf, çalışma kağıdı; id, ad, ders, tür), kayıtlı akademik kaynakları (başlık, yazar, yıl, DOI) ve ders notlarının başlıkları. Bir dosyayı ya da notu incelemeden önce id bulmak için çağır.', {
      ders: { type: 'string', description: 'İsteğe bağlı ders adı filtresi.' },
    }),
    T('dosya_oku', 'Depo\'daki bir dosyanın içeriğini getirir: fotoğraflar görüntü olarak, PDF\'ler sayfa metniyle (metni olmayan taranmış sayfalar görüntü olarak). Öğrenci bir dosyasını incelemeni istediğinde ya da bir hata sorusunun fotoğrafına bakman gerektiğinde çağır. id kitaplik ya da hata_defteri sonucundan gelir.', {
      id: { type: 'string', description: 'Dosya id' },
      sayfalar: { type: 'string', description: 'PDF için isteğe bağlı sayfa aralığı, ör. "3-8" (en fazla 25 sayfa).' },
    }, ['id']),
    T('not_oku', 'Öğrencinin kendi ders notunun tam metni. id kitaplik sonucundan gelir.', {
      id: { type: 'string', description: 'Not id' },
    }, ['id']),
    T('akademik_kaynak_ara', 'Akademik literatürde arama (OpenAlex, yedek olarak Crossref): makale ve kitapların başlık, yazar, yıl, dergi, DOI, açık erişim bağlantısı, atıf sayısı ve özeti. DOI verilirse o yayının künyesini getirir. Akademik kaynak bulma ya da bir atfı doğrulama istendiğinde çağır; sonuçlarda olmayan kaynağı uydurma.', {
      sorgu: { type: 'string', description: 'Arama ifadesi (tercihen İngilizce anahtar kelimeler) ya da DOI.' },
      adet: { type: 'integer', description: '1-10, varsayılan 6.' },
    }, ['sorgu']),
    T('deneme_kaydi_oner', 'Öğrencinin paylaştığı bir deneme sonucunu (karne fotoğrafı, cevap anahtarıyla karşılaştırma ya da yazdığı sayılar) Deneme sekmesine kaydetmesi için ekranda onay kartı gösterir. Kaydı ÖĞRENCİ onaylar; kaydedildiğini söyleme. Doğru/yanlış sayılarını kontrol ettikten sonra, analizin sonunda bir kez çağır.', {
      tarih: { type: 'string', description: 'YYYY-AA-GG; bilinmiyorsa boş bırak (bugün kullanılır).' },
      tur: { type: 'string', enum: ['TYT', 'AYT', 'BRANS'] },
      ad: { type: 'string', description: 'Deneme ya da yayın adı.' },
      brans: { type: 'string', description: 'Branş denemesinde ders anahtarı (ör. tyt_mat).' },
      dersler: {
        type: 'array',
        items: { type: 'object', additionalProperties: false, properties: { ders: { type: 'string', description: 'Ders anahtarı, ör. tyt_tr, tyt_mat, ayt_fiz.' }, dogru: { type: 'integer' }, yanlis: { type: 'integer' } }, required: ['ders', 'dogru', 'yanlis'] },
      },
      eksik_konular: { type: 'array', items: { type: 'string' }, description: 'Eksik çıkan konuların adları ya da id\'leri.' },
      not: { type: 'string', description: 'Kısa not (ör. "süre yetmedi, paragrafta zorlandı").' },
    }, ['tur', 'dersler']),
  ];

  const LABELS = {
    ogrenci_durumu: ['👤', 'Genel durumuna bakıyor…', 'genel durum'],
    calisma_oturumlari: ['⏱️', 'Çalışma oturumlarına bakıyor…', 'oturumlar'],
    calisma_programi: ['🗓️', 'Programını kontrol ediyor…', 'program'],
    konu_durumu: ['📚', 'Konu durumuna bakıyor…', 'konular'],
    denemeler: ['📝', 'Denemelerine bakıyor…', 'denemeler'],
    hata_defteri: ['❌', 'Hata defterine bakıyor…', 'hata defteri'],
    kitaplik: ['🗂️', 'Kitaplığına bakıyor…', 'kitaplık'],
    dosya_oku: ['📕', 'Dosyayı okuyor…', 'dosya'],
    not_oku: ['📓', 'Notunu okuyor…', 'not'],
    akademik_kaynak_ara: ['🔎', 'Akademik kaynak arıyor…', 'akademik arama'],
    deneme_kaydi_oner: ['💾', 'Kayıt önerisi hazırlıyor…', 'kayıt önerisi'],
  };
  const label = (name) => LABELS[name] || ['🔧', 'Bakıyor…', name];

  // ---------- Yardımcılar ----------
  const subjName = (id) => Store.subject(id).name;
  const weekStart = () => U.addDays(U.dayStart(new Date()), -((new Date().getDay() + 6) % 7));
  function findYksKey(q, keys) {
    if (!q) return null;
    const lq = low(q);
    const pool = keys || Object.keys(YKS.SUBJECTS);
    return pool.find((k) => k === q || low(k) === lq)
      || pool.find((k) => low(YKS.SUBJECTS[k].name) === lq || low(YKS.SUBJECTS[k].short) === lq)
      || pool.find((k) => low(YKS.SUBJECTS[k].name).includes(lq) || lq.includes(low(YKS.SUBJECTS[k].name)))
      || null;
  }
  function courseByName(q) {
    const lq = low(q), cs = D().uni.courses;
    return cs.find((c) => low(c.name) === lq || low(c.code) === lq) || cs.find((c) => low(c.name).includes(lq) || lq.includes(low(c.name))) || null;
  }

  // ---------- Araçlar ----------
  function ogrenci_durumu() {
    const s = D().settings, p = s.profile || {}, now = new Date();
    const ws = weekStart().getTime();
    const out = {
      bugun: today(), gun: U.DAYS[now.getDay()], saat: U.hm(now),
      ad: s.name || '', duzey: LEVELS[p.level || 'yks'] || p.level, bolum: p.dept || '', sinif: p.year || '',
      gunluk_hedef_dk: s.dailyGoal,
      bugun_calisilan_dk: Stats.minutesOn(now),
      bu_hafta_dk: D().sessions.filter((x) => x.start >= ws).reduce((a, x) => a + x.minutes, 0),
      seri_gun: Stats.streak(), en_uzun_seri: Stats.bestStreak(),
      toplam_oturum: D().sessions.length,
      ilk_oturum: D().sessions.length ? U.dateKey(D().sessions[0].start) : null,
      deneme_sayisi: D().denemeler.length,
      bekleyen_kart: window.NotesUI && NotesUI.dueCount ? NotesUI.dueCount() : 0,
      bekleyen_hata_sorusu: window.HataUI ? HataUI.dueCount() : 0,
    };
    const t = Timer.state();
    if (t.running || (!t.fresh && t.phase === 'focus')) {
      out.sayac = { durum: t.running ? 'çalışıyor' : 'duraklatıldı', faz: { focus: 'odak', short: 'kısa mola', long: 'uzun mola' }[t.phase] || t.phase, ders: t.subjectId ? subjName(t.subjectId) : 'Genel', hedef: t.intent || '', gecen_dk: Math.round(t.elapsed / 60) };
    }
    if (isYks()) {
      const f = YKS.field(), days = YKS.daysLeft(), ph = PlanUI.phase(days);
      out.yks = {
        alan: f ? YKS.FIELDS[f].name : 'seçilmedi', sinav_tarihi: YKS.examDate(),
        tarih_notu: D().yks.examDate ? 'öğrencinin girdiği tarih' : 'tahmini tarih (ÖSYM açıklayınca güncellenir)',
        kalan_gun: days, donem: ph ? `${ph.name}: ${ph.text}` : null,
        konu_hazirligi_yuzde: f ? Math.round(YKS.progress(f).pct * 100) : null,
      };
    } else if (window.Uni) {
      const u = D().uni, nx = Uni.upcoming(60).find((e) => Uni.EXAM.has(e.kind)), g = Uni.isSchool() ? Uni.gpa() : null;
      out.donem = {
        okul: u.school || '', fakulte: u.faculty || '', donem: u.term || '', hafta: Uni.weekOfTerm(), toplam_hafta: u.weeks,
        ders_sayisi: u.courses.length, siradaki_sinav: nx ? `${Uni.evLeft(nx)} (${nx.date})` : null,
        donem_ortalamasi: g ? g.term : null, gano: g ? g.overall : null,
      };
    }
    return out;
  }

  function calisma_oturumlari({ gun } = {}) {
    const n = intIn(gun, 1, 180, 14);
    const list = Stats.inRange(n), goal = D().settings.dailyGoal;
    const days = Stats.byDay(n);
    const total = list.reduce((a, s) => a + s.minutes, 0);
    const activeDays = days.filter((d) => d.minutes > 0).length;
    const blocks = [['00-05 gece', 0, 5], ['05-09 sabah', 5, 9], ['09-12 öğleden önce', 9, 12], ['12-15 öğle', 12, 15], ['15-18 ikindi', 15, 18], ['18-21 akşam', 18, 21], ['21-24 gece', 21, 24]];
    const byBlock = blocks.map(([name, a, b]) => {
      const l = list.filter((s) => { const h = new Date(s.start).getHours(); return h >= a && h < b; });
      const r = l.filter((s) => s.rating);
      return { dilim: name, dk: l.reduce((x, s) => x + s.minutes, 0), oturum: l.length, ort_verim: r.length ? r2(r.reduce((x, s) => x + s.rating, 0) / r.length) : null };
    }).filter((x) => x.oturum);
    const moods = {};
    for (const s of list) if (s.mood) moods[s.mood] = (moods[s.mood] || 0) + 1;
    const kinds = {};
    for (const s of list) kinds[s.kind || 'pomodoro'] = (kinds[s.kind || 'pomodoro'] || 0) + 1;
    return {
      aralik: `son ${n} gün (${days[0].key} → ${days[days.length - 1].key})`,
      toplam_dk: total, oturum: list.length, aktif_gun: activeDays,
      ortalama_dk_aktif_gun: activeDays ? Math.round(total / activeDays) : 0,
      ortalama_oturum_dk: list.length ? Math.round(total / list.length) : 0,
      hedef_dk: goal, hedefi_tuttugu_gun: days.filter((d) => d.minutes >= goal).length,
      gunluk: days.map((d) => `${d.key} ${U.DAYS[d.date.getDay()].slice(0, 3)} ${d.minutes}`),
      dersler: Stats.bySubject(list).sort((a, b) => b.minutes - a.minutes).map((x) => ({ ders: subjName(x.id), dk: x.minutes, oturum: x.count, ort_verim: x.rcnt ? r2(x.rsum / x.rcnt) : null })),
      saat_dilimleri: byBlock,
      haftanin_gunleri: Stats.byWeekday(list).map((w) => ({ gun: U.DAYS[w.day], dk: w.minutes })).filter((w) => w.dk),
      gece_yarisindan_sonra_oturum: list.filter((s) => new Date(s.start).getHours() < 5).length,
      tur: kinds,
      ruh_hali: moods,
      zorlandigi_yerler: list.filter((s) => s.hard).slice(-15).map((s) => `${U.dateKey(s.start)} ${subjName(s.subjectId)}: ${clip(s.hard, 120)}`),
      son_notlar: list.filter((s) => s.note).slice(-8).map((s) => `${U.dateKey(s.start)} ${subjName(s.subjectId)}: ${clip(s.note, 100)}`),
      seri_gun: Stats.streak(),
    };
  }

  function calisma_programi() {
    const out = {};
    if (isYks()) {
      const f = YKS.field();
      if (!f) out.not = 'YKS alanı seçilmemiş; otomatik haftalık program henüz yok.';
      else {
        const wk = PlanUI.peek(), t = today();
        if (wk) {
          const past = wk.days.filter((d) => d.date <= t);
          const all = past.flatMap((d) => d.items);
          out.bu_hafta = {
            hafta_baslangici: wk.week,
            gecen_gunlerde_tamamlanan: `${all.filter((i) => i.done).length}/${all.length}`,
            gunler: wk.days.map((d) => ({ tarih: d.date, maddeler: d.items.map((i) => `${i.done ? '✓' : '○'} ${i.title}${i.sub ? ` (${i.sub})` : ''} ~${i.minutes} dk`) })),
          };
        } else out.bu_hafta = 'Bu haftanın programı henüz oluşmadı (Plan sekmesi açılınca oluşur).';
        const done = D().yks.planDone || {};
        out.son_gunlerde_isaretlenen_madde = Object.keys(done).sort().slice(-14).map((k) => `${k}: ${done[k].length}`);
        out.konu_ilerlemesi = YKS.subjectKeys(f).map((k) => { const p = YKS.subjectProgress(k); return `${YKS.SUBJECTS[k].name}: %${Math.round(p.pct * 100)} (${p.done}/${p.count} konu tamam)`; });
        const ph = PlanUI.phase(YKS.daysLeft());
        if (ph) out.donem_onerisi = ph.text;
      }
    } else if (window.Uni) {
      const u = D().uni, school = Uni.isSchool();
      out.dersler = u.courses.map((c) => {
        const x = { ders: c.name, kod: c.code || '', haftalik_ders_saati: Uni.weeklyHours(c), konular: c.topics.length ? `${c.topics.filter((t) => t.done).length}/${c.topics.length}` : null };
        if (school) {
          const at = Uni.attendance(c), sc = Uni.courseScore(c);
          Object.assign(x, { kredi: c.credit, akts: c.ects, devamsizlik: at.limit ? `${at.used}/${at.limit} saat` : null, not: sc ? `${sc.score}${sc.complete ? '' : ` (%${sc.part} girildi)`}` : null, harf: c.letter || null });
        }
        return x;
      });
      out.yaklasanlar = Uni.upcoming(60).map((e) => `${e.date} ${Uni.evLeft(e)}${e.note ? ' · ' + clip(e.note, 60) : ''}`);
      out.bugunun_listesi = Uni.planFor(new Date()).map((i) => `${i.done ? '✓' : '○'} ${i.text} (~${i.min} dk)`);
      out.yarinin_listesi = Uni.planFor(U.addDays(new Date(), 1)).map((i) => `○ ${i.text} (~${i.min} dk)`);
      const nc = Uni.nextCalendar();
      if (nc) out.akademik_takvim = `${nc.title}: ${nc.date}${nc.end ? ' – ' + nc.end : ''}`;
      if (school) { const g = Uni.gpa(); out.ortalama = { donem: g.term, gano: g.overall }; }
    }
    out.acik_gorevler = D().tasks.filter((x) => !x.done).slice(-20).map((x) => `${x.text}${x.subjectId ? ' · ' + subjName(x.subjectId) : ''}${x.due ? ' · son: ' + x.due : ''}`);
    out.tekrar_listesi = D().review.filter((x) => !x.done).slice(-20).map((x) => clip(x.text, 100));
    return out;
  }

  function konu_durumu({ ders } = {}) {
    if (!isYks()) {
      const cs = ders ? [courseByName(ders)].filter(Boolean) : D().uni.courses;
      if (ders && !cs.length) return { hata: `"${ders}" adlı ders bulunamadı`, dersler: D().uni.courses.map((c) => c.name) };
      return { dersler: cs.map((c) => ({ ders: c.name, konular: c.topics.map((t) => `${t.done ? '✓' : '○'} ${t.week ? t.week + '. hf ' : ''}${t.title}`) })) };
    }
    const f = YKS.field(), keys = f ? YKS.subjectKeys(f) : YKS.TYT_KEYS;
    const eksik = Deneme.eksikCounts(10);
    if (ders) {
      const k = findYksKey(ders, keys) || findYksKey(ders);
      if (!k) return { hata: `"${ders}" dersi bulunamadı`, dersler: keys.map((x) => `${x} (${YKS.SUBJECTS[x].name})`) };
      const S = YKS.SUBJECTS[k];
      return {
        ders: S.name, yks_soru_sayisi: S.total,
        konular: S.topics.map((t) => `${t.name} · ${STATUS[YKS.status(t.id)]} · yılda ≈${t.avg} soru${eksik[t.id] ? ` · denemede ${eksik[t.id]} kez eksik` : ''}`),
      };
    }
    const prio = [];
    for (const k of keys) for (const t of YKS.SUBJECTS[k].topics) {
      const st = YKS.status(t.id);
      if (st < 3) prio.push({ t, k, st, score: (t.avg || 0.3) * (1 + (eksik[t.id] || 0)) * (st === 2 ? 0.5 : 1) });
    }
    prio.sort((a, b) => b.score - a.score);
    return {
      alan: f ? YKS.FIELDS[f].name : 'seçilmedi (yalnızca TYT)',
      dersler: keys.map((k) => { const p = YKS.subjectProgress(k); return `${k} · ${YKS.SUBJECTS[k].name}: %${Math.round(p.pct * 100)} (${p.done}/${p.count} tamam, ${YKS.SUBJECTS[k].total} soru)`; }),
      oncelikli_konular: prio.slice(0, 18).map((x) => `${YKS.SUBJECTS[x.k].short} · ${x.t.name} · ${STATUS[x.st]} · yılda ≈${x.t.avg} soru${eksik[x.t.id] ? ` · denemede ${eksik[x.t.id]} kez eksik` : ''}`),
      not: 'Bir dersin bütün konuları için ders parametresiyle tekrar çağır.',
    };
  }

  function denemeler({ adet, tur } = {}) {
    const n = intIn(adet, 1, 30, 10);
    let all = Deneme.list();
    if (tur) all = all.filter((e) => Deneme.kind(e) === tur);
    if (!all.length) return { not: tur ? `${tur} denemesi kayıtlı değil.` : 'Henüz kayıtlı deneme yok.' };
    const list = all.slice(-n);
    const rows = list.map((e) => {
      const prev = Deneme.previous(e);
      const subs = Object.keys(e.scores || {}).filter((k) => YKS.SUBJECTS[k]).map((k) => {
        const sc = e.scores[k], tot = YKS.SUBJECTS[k].total, d = +sc.d || 0, y = +sc.y || 0;
        return `${YKS.SUBJECTS[k].short}: D${d} Y${y} B${tot - d - y} → ${Deneme.fmt(Deneme.net(d, y))}/${tot}${d + y > tot ? ' ⚠️ D+Y soru sayısını aşıyor' : ''}`;
      });
      return {
        tarih: e.date, tur: Deneme.label(e), ad: e.name || '', toplam_net: Deneme.total(e), en_fazla: Deneme.maxQ(e),
        oncekine_gore: prev ? r2(Deneme.total(e) - Deneme.total(prev)) : null,
        dersler: subs,
        eksik_konular: (e.eksik || []).map((id) => YKS.topic(id)).filter(Boolean).map((t) => t.name),
        not: e.note ? clip(e.note, 200) : '',
      };
    });
    const trend = {};
    for (const k of ['TYT', 'AYT', 'YDT']) {
      const l = Deneme.list().filter((e) => Deneme.kind(e) === k);
      if (!l.length) continue;
      const last3 = l.slice(-3).map(Deneme.total);
      trend[k] = { son: Deneme.total(l[l.length - 1]), onceki: l.length > 1 ? Deneme.total(l[l.length - 2]) : null, son3_ort: r2(last3.reduce((a, b) => a + b, 0) / last3.length), sayi: l.length };
    }
    return {
      toplam_kayitli: Deneme.list().length,
      denemeler: rows,
      tur_ozeti: trend,
      oncelikli_eksikler: Deneme.weakTopics(6, 12).map((w) => `${w.topic.name} (${YKS.SUBJECTS[w.topic.subjectKey].short}) · son denemelerde ${w.count} kez · yılda ≈${w.topic.avg} soru`),
      uygulamanin_tespitleri: Deneme.insights(),
      kural: 'Net = Doğru − Yanlış/4. Boş net düşürmez.',
    };
  }

  function hata_defteri({ adet } = {}) {
    const n = intIn(adet, 1, 60, 25);
    const R = (window.HataUI && HataUI.REASONS) || {};
    const all = D().mistakes;
    if (!all.length) return { not: 'Hata defteri boş.' };
    const count = (fn) => { const o = {}; for (const m of all) { const k = fn(m); if (k) o[k] = (o[k] || 0) + 1; } return o; };
    const topics = count((m) => (m.topic ? low(m.topic) : ''));
    const t = today();
    return {
      toplam: all.length, ogrenilen: all.filter((m) => m.box >= 5).length,
      bugun_tekrar_bekleyen: all.filter((m) => m.box < 5 && m.due <= t).length,
      nedenler: count((m) => (R[m.reason] ? R[m.reason][1] : m.reason)),
      dersler: count((m) => subjName(m.subjectId)),
      en_cok_tekrar_eden_konular: Object.entries(topics).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k}: ${v}`),
      kayitlar: all.slice(-n).reverse().map((m) => ({
        tarih: U.dateKey(m.created || Date.now()), ders: subjName(m.subjectId), konu: m.topic || '', neden: R[m.reason] ? R[m.reason][1] : m.reason,
        kutu: `${m.box}/5`, dogru_sayisi: m.rights || 0, siradaki_tekrar: m.box >= 5 ? 'öğrenildi' : m.due,
        not: m.note ? clip(m.note, 160) : '', foto_id: m.fileId && D().files.some((x) => x.id === m.fileId) ? m.fileId : null,
      })),
    };
  }

  function kitaplik({ ders } = {}) {
    const lq = ders ? low(ders) : '';
    const match = (sid) => !lq || low(subjName(sid)).includes(lq);
    const K = (window.Depo && Depo.KINDS) || {};
    return {
      depo_dosyalari: D().files.filter((f) => match(f.subjectId)).slice(-60).reverse().map((f) => ({
        id: f.id, ad: f.name, ders: subjName(f.subjectId), tur: K[f.kind] ? K[f.kind][1] : f.kind,
        bicim: f.mime === 'application/pdf' ? 'PDF' : /^image\//.test(f.mime) ? 'fotoğraf' : f.mime, konum: f.src === 'drive' ? 'Google Drive' : 'bu cihaz', tarih: U.dateKey(f.created || Date.now()),
      })),
      kaynaklar: D().refs.filter((r) => match(r.subjectId)).slice(-40).reverse().map((r) => ({
        id: r.id, baslik: clip(r.title, 160), yazar: window.Kaynak ? Kaynak.inText(r) : '', yil: r.year || '', doi: r.doi || '', url: r.url || r.oaUrl || '',
      })),
      notlar: D().notes.filter((x) => match(x.subjectId)).slice(-60).reverse().map((x) => ({ id: x.id, baslik: clip(x.title || '(başlıksız)', 80), ders: subjName(x.subjectId), uzunluk: (x.body || '').length })),
    };
  }

  async function dosya_oku({ id, sayfalar } = {}, ctx) {
    const f = D().files.find((x) => x.id === id);
    if (!f) return { error: `"${id}" id'li dosya bulunamadı. Önce kitaplik aracıyla id'leri al.` };
    let blob;
    try { blob = await Depo.getBlob(f); } catch (e) {
      return { error: e instanceof Depo.NeedAuth ? 'Bu dosya Google Drive\'da; Drive bağlantısı yenilenmeden açılamıyor. Öğrenciden Kitaplık → Depo\'da bağlantıyı yenilemesini iste.' : `Dosya açılamadı: ${e.message}` };
    }
    const head = { type: 'text', text: `Dosya: ${f.name} · ders: ${subjName(f.subjectId)} · id: ${f.id}` };
    if (/^image\//.test(f.mime)) {
      const img = await ctx.prepImage(blob);
      return { blocks: [head, { type: 'image', source: { type: 'base64', media_type: img.type || 'image/jpeg', data: await ctx.toB64(img) } }] };
    }
    if (f.mime !== 'application/pdf') return { error: `Bu dosya türü (${f.mime}) okunamıyor; yalnızca PDF ve fotoğraflar.` };
    const pdf = await Depo.openPdf(blob);
    try {
      const N = pdf.numPages;
      let a = 1, b = Math.min(N, 15);
      const m = /^\s*(\d+)\s*(?:-\s*(\d+))?\s*$/.exec(sayfalar || '');
      if (m) { a = Math.max(1, +m[1]); b = Math.min(N, m[2] ? +m[2] : a); }
      b = Math.min(b, a + 24);
      if (a > N) return { error: `PDF ${N} sayfa; ${a}. sayfa yok.` };
      const blocks = [{ type: 'text', text: `${head.text} · ${N} sayfa · gösterilen: ${a}-${b}` }];
      let text = '', scanned = 0;
      for (let n = a; n <= b; n++) {
        const page = await pdf.getPage(n);
        const tc = await page.getTextContent();
        const t = tc.items.map((it) => it.str + (it.hasEOL ? '\n' : ' ')).join('').replace(/[ \t]+\n/g, '\n').trim();
        if (t.length >= 40 || scanned >= 4) { text += `\n\n=== Sayfa ${n} ===\n${t || '(metin yok)'}`; continue; }
        // metni olmayan (taranmış) sayfa: görüntü olarak gönder (en fazla 4)
        scanned++;
        const vp1 = page.getViewport({ scale: 1 });
        const vp = page.getViewport({ scale: Math.min(2.5, 1400 / vp1.width) });
        const c = document.createElement('canvas');
        c.width = Math.round(vp.width); c.height = Math.round(vp.height);
        await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        const jpg = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
        text += `\n\n=== Sayfa ${n} === (taranmış; görüntü olarak eklendi)`;
        blocks.push({ type: 'text', text: `Sayfa ${n}:` }, { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: await ctx.toB64(jpg) } });
      }
      blocks.splice(1, 0, { type: 'text', text: clip(text.trim(), 90000) || '(Bu sayfalarda metin yok.)' });
      if (b < N) blocks.push({ type: 'text', text: `Devamı için sayfalar="${b + 1}-${Math.min(N, b + 25)}" ile tekrar çağır.` });
      return { blocks };
    } finally { pdf.close(); }
  }

  function not_oku({ id } = {}) {
    const x = D().notes.find((n) => n.id === id);
    if (!x) return { error: `"${id}" id'li not bulunamadı.` };
    return { baslik: x.title || '', ders: subjName(x.subjectId), guncelleme: U.dateKey(x.updated || x.created || Date.now()), metin: clip(x.body, 30000) };
  }

  async function akademik_kaynak_ara({ sorgu, adet } = {}) {
    const q = String(sorgu || '').trim();
    if (!q) return { error: 'sorgu boş' };
    const n = intIn(adet, 1, 10, 6);
    const map = (r) => ({
      baslik: clip(r.title, 220), yazarlar: (r.authors || []).slice(0, 4).map((a) => a.literal || [a.given, a.family].filter(Boolean).join(' ')).join(', ') + ((r.authors || []).length > 4 ? ' ve diğ.' : ''),
      yil: r.year || '', yayin: r.container || r.publisher || '', doi: r.doi || '', url: r.oaUrl || r.url || (r.doi ? 'https://doi.org/' + r.doi : ''),
      atif: r.cited != null ? r.cited : undefined, ozet: r.abstract ? clip(r.abstract, 600) : '',
    });
    if (/^(https?:\/\/(dx\.)?doi\.org\/)?10\.\d{4,9}\//i.test(q)) {
      const r = await Kaynak.byDoi(q);
      return r ? { kaynak: 'Crossref', sonuc: [map(r)] } : { error: 'Bu DOI için kayıt bulunamadı.' };
    }
    const res = await Kaynak.search(q);
    return { kaynak: res.from, not: res.note || undefined, sonuc: (res.items || []).slice(0, n).map(map) };
  }

  // deneme önerisi: sayılar doğrulanır, öneri kartı için düzgün bir kayıt hazırlanır
  function deneme_kaydi_oner(inp = {}) {
    const type = inp.tur;
    if (!['TYT', 'AYT', 'BRANS'].includes(type)) return { error: 'tur TYT, AYT ya da BRANS olmalı' };
    const field = YKS.field() || 'SAY';
    let allowed = type === 'TYT' ? YKS.TYT_KEYS.slice() : type === 'AYT' ? (YKS.FIELDS[field] || YKS.FIELDS.SAY).ayt.slice() : [];
    let brans = type === 'BRANS' ? findYksKey(inp.brans) : undefined;
    const rows = Array.isArray(inp.dersler) ? inp.dersler : [];
    if (type === 'BRANS') {
      if (!brans && rows.length === 1) brans = findYksKey(rows[0] && rows[0].ders);
      if (!brans) return { error: 'Branş denemesi için brans (ders anahtarı) gerekli.' };
      allowed = [brans];
    }
    const scores = {}, problems = [];
    for (const r of rows) {
      const k = findYksKey(r && r.ders, allowed);
      if (!k) { problems.push(`"${r && r.ders}" bu türde bir ders değil (geçerli: ${allowed.join(', ')})`); continue; }
      const d = r.dogru, y = r.yanlis, tot = YKS.SUBJECTS[k].total;
      if (!Number.isInteger(d) || !Number.isInteger(y) || d < 0 || y < 0) { problems.push(`${YKS.SUBJECTS[k].short}: doğru/yanlış tam sayı olmalı`); continue; }
      if (d + y > tot) { problems.push(`${YKS.SUBJECTS[k].short}: D${d}+Y${y} = ${d + y}, soru sayısı ${tot}`); continue; }
      scores[k] = { d, y };
    }
    if (problems.length) return { error: 'Kayıt önerilemedi, sayıları kontrol et: ' + problems.join('; ') };
    if (!Object.keys(scores).length) return { error: 'En az bir dersin doğru/yanlış sayısı gerekli.' };
    const topicIds = new Set(allowed.flatMap((k) => YKS.SUBJECTS[k].topics.map((t) => t.id)));
    const eksik = [], unknown = [];
    for (const x of Array.isArray(inp.eksik_konular) ? inp.eksik_konular : []) {
      const lx = low(x);
      const t = topicIds.has(x) ? YKS.topic(x) : allowed.flatMap((k) => YKS.SUBJECTS[k].topics).find((tp) => low(tp.name) === lx) || allowed.flatMap((k) => YKS.SUBJECTS[k].topics).find((tp) => lx.length > 3 && (low(tp.name).includes(lx) || lx.includes(low(tp.name))));
      if (t && !eksik.includes(t.id)) eksik.push(t.id); else if (!t) unknown.push(x);
    }
    const date = /^\d{4}-\d{2}-\d{2}$/.test(inp.tarih || '') && !isNaN(new Date(inp.tarih + 'T12:00:00')) ? inp.tarih : today();
    const proposal = { kind: 'deneme', type, brans: type === 'BRANS' ? brans : undefined, date, name: clip(String(inp.ad || '').trim(), 40), scores, eksik, note: clip(String(inp.not || '').trim(), 300), saved: false };
    const net = Deneme.total({ scores });
    const dup = D().denemeler.some((e) => e.date === date && e.type === type && Math.abs(Deneme.total(e) - net) < 0.01);
    return {
      result: { durum: 'Öneri kartı öğrenciye gösterildi. Kaydetmek için öğrencinin "Denemelere kaydet"e basması gerekir; kaydedildiğini varsayma.', toplam_net: net, eslesmeyen_konular: unknown.length ? unknown : undefined, uyari: dup ? 'Aynı tarih ve türde aynı netle bir deneme zaten kayıtlı olabilir.' : undefined },
      proposal,
    };
  }

  // ---------- Girdi doğrulama (akışlı araç girdileri sunucuda doğrulanmaz) ----------
  function validate(name, inp) {
    if (!inp || typeof inp !== 'object' || Array.isArray(inp)) return 'girdi bir nesne olmalı';
    const def = DEFS.find((d) => d.name === name);
    if (!def) return 'bilinmeyen araç';
    const props = def.input_schema.properties;
    for (const k of Object.keys(inp)) if (!props[k]) return `bilinmeyen alan: ${k}`;
    for (const k of def.input_schema.required) if (inp[k] == null || inp[k] === '') return `eksik alan: ${k}`;
    for (const [k, v] of Object.entries(inp)) {
      const t = props[k].type;
      if (t === 'string' && typeof v !== 'string') return `${k} metin olmalı`;
      if (t === 'integer' && !Number.isInteger(v)) return `${k} tam sayı olmalı`;
      if (t === 'array' && !Array.isArray(v)) return `${k} liste olmalı`;
      if (props[k].enum && !props[k].enum.includes(v)) return `${k} şunlardan biri olmalı: ${props[k].enum.join(', ')}`;
    }
    return '';
  }

  const RUN = { ogrenci_durumu, calisma_oturumlari, calisma_programi, konu_durumu, denemeler, hata_defteri, kitaplik, dosya_oku, not_oku, akademik_kaynak_ara, deneme_kaydi_oner };
  // → { content: string | blok listesi, isError?, proposal? }
  async function run(name, input, ctx) {
    const bad = validate(name, input);
    if (bad) return { content: JSON.stringify({ INVALID_INPUT: bad, alinan: input }), isError: true };
    try {
      const r = await RUN[name](input, ctx);
      if (r && r.error) return { content: r.error, isError: true };
      if (r && r.blocks) return { content: r.blocks };
      if (r && r.proposal) return { content: JSON.stringify(r.result), proposal: r.proposal };
      return { content: JSON.stringify(r) };
    } catch (e) {
      return { content: `Araç çalışırken hata: ${(e && e.message) || e}`, isError: true };
    }
  }

  return { DEFS, run, label, validate };
})();

if (typeof window !== 'undefined') { window.AsistanTools = AsistanTools; }
