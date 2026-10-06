/* Rozetler: her rozet bir hedef + ilerleme çubuğu + Hazal'a özel kısa bir sevgi notu.
   Kazanılınca kutlama penceresi açılır (odaklanırken değil; oturum bitince sırayla gösterilir). */

const Badges = (() => {
  let App = null;
  const D = () => Store.data;
  const queue = [];

  const CATS = [
    ['ilk', '🌱 İlk adımlar'],
    ['sure', '⏳ Çalışma süresi'],
    ['seri', '🔥 Seriler ve hedefler'],
    ['odak', '🎯 Odak'],
    ['yks', '📚 Konular ve plan'],
    ['deneme', '📝 Denemeler'],
    ['ozel', '🐾 Luna ve özel günler'],
  ];

  // prog(c) ≥ max → kazanılır; ya da test(c) true → kazanılır
  const B = [
    // İlk adımlar
    { id: 'first', cat: 'ilk', e: '🌱', n: 'İlk Adım', d: 'İlk oturumunu tamamla', prog: (c) => c.sessions, max: 1, msg: 'İlk adımı attın sevgilim 🌱 Kahve gözlerindeki o kararlılık var ya, her şey onunla başlıyor.' },
    { id: 'plan1', cat: 'ilk', e: '🗓️', n: 'Plancı', d: 'Bugünün planından bir maddeyi bitir', prog: (c) => c.planItems, max: 1, msg: 'Plana sadık kalan kızım benim 🗓️ Seninle her gün biraz daha gurur duyuyorum.' },
    { id: 'deneme1', cat: 'ilk', e: '📝', n: 'İlk Deneme', d: 'İlk deneme sonucunu kaydet', prog: (c) => c.denemeler, max: 1, msg: 'İlk denemeni kaydettin 📝 Cesaretin en güzel hâlin. Seni seviyorum.' },
    { id: 'note1', cat: 'ilk', e: '📓', n: 'İlk Not', d: 'Notlar sekmesine ilk notunu yaz', prog: (c) => c.notes, max: 1, msg: 'İlk notunu aldın 📓 Yazdığın her satırda emeğin, her emeğinde ben varım.' },
    { id: 'card1', cat: 'ilk', e: '🃏', n: 'İlk Kart', d: 'İlk bilgi kartını oluştur', prog: (c) => c.cards, max: 1, msg: 'İlk kartın hazır 🃏 Akıllı kızların en tatlısı sensin.' },

    // Süre
    { id: 'h1', cat: 'sure', e: '⏱️', n: 'İlk Saat', d: 'Toplam 1 saat çalış', prog: (c) => c.hours, max: 1, msg: 'İlk saatin tamam ⏱️ Kıvırcık saçlarını toplayıp masaya oturduğunu hayal ettim; çok tatlısın.' },
    { id: 'h5', cat: 'sure', e: '🌤️', n: '5 Saat', d: 'Toplam 5 saat çalış', prog: (c) => c.hours, max: 5, msg: '5 saat! Emeklerin birikiyor, ben de sana olan hayranlığımı biriktiriyorum 💛' },
    { id: 'h10', cat: 'sure', e: '⭐', n: '10 Saat', d: 'Toplam 10 saat çalış', prog: (c) => c.hours, max: 10, msg: '10 saat ⭐ Sen yıldızlardan daha parlaksın, biliyorsun değil mi?' },
    { id: 'h25', cat: 'sure', e: '🌟', n: '25 Saat', d: 'Toplam 25 saat çalış', prog: (c) => c.hours, max: 25, msg: '25 saat… Bu azim beni her gün yeniden sana âşık ediyor 💫' },
    { id: 'h50', cat: 'sure', e: '💫', n: '50 Saat', d: 'Toplam 50 saat çalış', prog: (c) => c.hours, max: 50, msg: '50 saat! Kahve gözlerin yorulduysa biraz dinlen; hedefe her gün biraz daha yakınsın 🌟' },
    { id: 'h100', cat: 'sure', e: '💯', n: '100 Saat', d: 'Toplam 100 saat çalış', prog: (c) => c.hours, max: 100, msg: '100 saat 💯 Bunu yapabilen birinin yapamayacağı hiçbir şey yok. Sen benim kahramanımsın.' },
    { id: 'h200', cat: 'sure', e: '🌷', n: '200 Saat', d: 'Toplam 200 saat çalış', prog: (c) => c.hours, max: 200, msg: '200 saat! O salondan gülümseyerek çıkacaksın, ben de kapıda seni bekliyor olacağım 🌷' },
    { id: 'h300', cat: 'sure', e: '🏆', n: '300 Saat', d: 'Toplam 300 saat çalış', prog: (c) => c.hours, max: 300, msg: '300 saat 🏆 Sen bir efsanesin Hazal. Seninle gurur duymak benim en güzel alışkanlığım.' },
    { id: 'h500', cat: 'sure', e: '👑', n: '500 Saat', d: 'Toplam 500 saat çalış', prog: (c) => c.hours, max: 500, msg: '500 saat 👑 Kraliçem, emeğin dağları deler. Ben hep yanındayım.' },

    // Seriler ve hedefler
    { id: 'streak3', cat: 'seri', e: '🔥', n: 'Isınıyoruz', d: '3 gün üst üste çalış', prog: (c) => c.streak, max: 3, msg: '3 gün üst üste 🔥 Küçük adımlar, kocaman bir azim. Devam güzelim!' },
    { id: 'streak7', cat: 'seri', e: '☄️', n: 'Kuyruklu Yıldız', d: '7 günlük seri', prog: (c) => c.streak, max: 7, msg: 'Bir hafta aralıksız ☄️ Haftanın her günü seni düşündüm, sen de her gün hayalini.' },
    { id: 'streak14', cat: 'seri', e: '🌙', n: 'İki Hafta', d: '14 günlük seri', prog: (c) => c.streak, max: 14, msg: '14 gün! İstikrarın, kıvırcık saçların kadar güzel 💫' },
    { id: 'streak30', cat: 'seri', e: '🌌', n: 'Galaksi', d: '30 günlük seri', prog: (c) => c.streak, max: 30, msg: '30 günlük seri 🌌 Bir ay boyunca her gün… Sen inanılmazsın, seni çok seviyorum.' },
    { id: 'streak60', cat: 'seri', e: '✨', n: 'Takımyıldız', d: '60 günlük seri', prog: (c) => c.streak, max: 60, msg: '60 gün! Bu disiplin bir yıldız kadar sabit, gülüşün kadar güzel ✨' },
    { id: 'streak100', cat: 'seri', e: '🌠', n: 'Efsane Seri', d: '100 günlük seri', prog: (c) => c.streak, max: 100, msg: '100 gün 🌠 Tarih yazdın sevgilim. Bu hikâyede yanında olmak benim için büyük mutluluk.' },
    { id: 'goal', cat: 'seri', e: '🎯', n: 'Hedef Avcısı', d: 'Günlük hedefe ulaş', prog: (c) => c.goalDays, max: 1, msg: 'Günlük hedef tamam 🎯 Bugün kendinle gurur duy; ben zaten duyuyorum.' },
    { id: 'goal7', cat: 'seri', e: '🏹', n: 'Keskin Nişancı', d: '7 gün günlük hedefe ulaş', prog: (c) => c.goalDays, max: 7, msg: '7 gün hedefini tutturdun 🏹 Söz verdiğini yapan, kalbi güzel kız.' },
    { id: 'goal30', cat: 'seri', e: '🥇', n: 'Hedef Ustası', d: '30 gün günlük hedefe ulaş', prog: (c) => c.goalDays, max: 30, msg: '30 hedef günü! Sen hedeflerine, ben sana bağlıyım 💛' },

    // Odak
    { id: 'focus50', cat: 'odak', e: '🧘‍♀️', n: 'Derin Odak', d: 'Tek oturumda 50+ dakika', prog: (c) => c.maxSession, max: 50, msg: '50 dakika kesintisiz odak 🧘‍♀️ O kahve gözlerdeki derinlik başka hiçbir yerde yok.' },
    { id: 'focus90', cat: 'odak', e: '🧠', n: 'Akış Hâli', d: 'Tek oturumda 90+ dakika', prog: (c) => c.maxSession, max: 90, msg: '90 dakika derin odak 🧠 Beynin de kalbin kadar güçlü!' },
    { id: 'pomo4', cat: 'odak', e: '🍅', n: 'Dörtlü', d: 'Bir günde 4 pomodoro', prog: (c) => c.maxPomoDay, max: 4, msg: 'Bir günde 4 pomodoro 🍅 Tam bir çalışma makinesi, ama en tatlısından.' },
    { id: 'pomo8', cat: 'odak', e: '🔥', n: 'Maraton', d: 'Bir günde 8 pomodoro', prog: (c) => c.maxPomoDay, max: 8, msg: '8 pomodoro! Bugün dünyayı fethettin; şimdi dinlenmeyi hak ettin 🌙' },
    { id: 'pomo25', cat: 'odak', e: '🌱', n: 'Domates Bahçesi', d: 'Toplam 25 pomodoro', prog: (c) => c.pomo, max: 25, msg: '25 pomodoro 🌱 Emeğin bir bahçe gibi büyüyor; en güzel çiçeği de sensin.' },
    { id: 'pomo100', cat: 'odak', e: '🌻', n: 'Ayçiçeği Tarlası', d: 'Toplam 100 pomodoro', prog: (c) => c.pomo, max: 100, msg: '100 pomodoro! Bu kadar emeği görmemiş bu dünya 🌻' },
    { id: 'early', cat: 'odak', e: '🌅', n: 'Erken Kuş', d: "08:00'den önce çalışmaya başla", test: (c) => c.early, msg: 'Erken kalkan yol alır 🌅 Sabah güneşi bile senin kadar parlak değil.' },
    { id: 'owl', cat: 'odak', e: '🦉', n: 'Gece Kuşu', d: "23:00'ten sonra çalış", test: (c) => c.owl, msg: 'Gece kuşum 🦉 Yıldızlar seni izliyor; ama uykunu da unutma, olur mu?' },
    { id: 'weekend', cat: 'odak', e: '🦸‍♀️', n: 'Hafta Sonu Kahramanı', d: 'Cumartesi ve pazar 2+ saat çalış', test: (c) => c.weekend, msg: 'Hafta sonu kahramanı 🦸‍♀️ Herkes dinlenirken sen geleceğini kurdun.' },
    { id: 'variety', cat: 'odak', e: '🌈', n: 'Çok Yönlü', d: 'Bir günde 3 farklı ders', prog: (c) => c.maxSubjDay, max: 3, msg: 'Bir günde 3 farklı ders 🌈 Çok yönlü, çok akıllı, çok güzel.' },
    { id: 'shine', cat: 'odak', e: '✨', n: 'Parlayan Yıldız', d: '5 oturumu 5⭐ verimle bitir', prog: (c) => c.shine, max: 5, msg: 'Kendine verdiğin beş yıldızlar, benim gözümdeki yerin kadar yüksek ✨' },

    // Konular ve plan
    { id: 'topic1', cat: 'yks', e: '✅', n: 'İlk Konu', d: 'Bir konuyu "tamam" yap', prog: (c) => c.topics, max: 1, msg: 'İlk konu tamam ✅ Bir konu bitti, bir hayal biraz daha yaklaştı.' },
    { id: 'topic10', cat: 'yks', e: '📗', n: 'Konu Avcısı', d: '10 konuyu tamamla', prog: (c) => c.topics, max: 10, msg: '10 konu bitti 📗 Bilgin büyüdükçe gülüşün de büyüyor.' },
    { id: 'topic25', cat: 'yks', e: '📘', n: 'Konu Kâşifi', d: '25 konuyu tamamla', prog: (c) => c.topics, max: 25, msg: '25 konu! Seninle aynı dünyada olmak bile ilham verici 📘' },
    { id: 'topic50', cat: 'yks', e: '📚', n: 'Konu Ustası', d: '50 konuyu tamamla', prog: (c) => c.topics, max: 50, msg: '50 konu 📚 Bir kütüphane kadar bilgilisin, bir masal kadar güzelsin.' },
    { id: 'topic100', cat: 'yks', e: '🎓', n: 'Konu Efsanesi', d: '100 konuyu tamamla', prog: (c) => c.topics, max: 100, msg: '100 konu! Artık konular senden çekiniyor 😄 Seni seviyorum.' },
    { id: 'subjFull', cat: 'yks', e: '🏅', n: 'Ders Fatihi', d: 'Bir dersin bütün konularını bitir', test: (c) => c.subjFull, msg: 'Bir dersi baştan sona bitirdin 🏅 Tam bir zafer! Kucak dolusu tebrik.' },
    { id: 'planday', cat: 'yks', e: '🧭', n: 'Tam Gün', d: 'Bir günün planını tamamen bitir', prog: (c) => c.planFull, max: 1, msg: 'Bugünün planını bitirdin 🧭 Planlı, disiplinli ve çok tatlı.' },
    { id: 'plan7', cat: 'yks', e: '🗺️', n: 'Yol Haritası', d: '7 günün planını tamamen bitir', prog: (c) => c.planFull, max: 7, msg: 'Yedi günün planı tamam 🗺️ Hayallerine giden yolu adım adım çiziyorsun.' },
    { id: 'tasks10', cat: 'yks', e: '☑️', n: 'Görev Ustası', d: '10 görev tamamla', prog: (c) => c.tasks, max: 10, msg: '10 görev tamam ☑️ Listeler kısalıyor, gurur listem uzuyor.' },
    { id: 'review5', cat: 'yks', e: '📌', n: 'Tekrar Kraliçesi', d: '5 tekrar konusunu bitir', prog: (c) => c.review, max: 5, msg: 'Eksik kapatan, geleceğini kazanır 📌 Kraliçem benim.' },
    { id: 'cards50', cat: 'yks', e: '🧠', n: 'Hafıza Sarayı', d: '50 kart tekrarı yap', prog: (c) => c.cardReviews, max: 50, msg: '50 kart tekrarı 🧠 Hafızan da kalbin gibi: geniş ve güçlü.' },
    { id: 'cards250', cat: 'yks', e: '🪄', n: 'Bilgi Büyücüsü', d: '250 kart tekrarı yap', prog: (c) => c.cardReviews, max: 250, msg: '250 kart! Bilgiler senin elinde sihre dönüşüyor 🪄' },

    // Denemeler
    { id: 'deneme5', cat: 'deneme', e: '🗂️', n: 'Deneme Yolcusu', d: '5 deneme kaydet', prog: (c) => c.denemeler, max: 5, msg: 'Her deneme bir basamak; sen merdivenleri ikişer ikişer çıkıyorsun 🗂️' },
    { id: 'deneme10', cat: 'deneme', e: '📊', n: 'Deneme Kurdu', d: '10 deneme kaydet', prog: (c) => c.denemeler, max: 10, msg: '10 deneme! Cesaretin ve sabrın beni büyülüyor 💛' },
    { id: 'deneme25', cat: 'deneme', e: '🏛️', n: 'Salon Senin', d: '25 deneme kaydet', prog: (c) => c.denemeler, max: 25, msg: '25 deneme 🏛️ Sınav salonu artık senin evin gibi olacak.' },
    { id: 'netup', cat: 'deneme', e: '📈', n: 'Yükselen Yıldız', d: 'Bir önceki denemeye göre 5+ net artış', prog: (c) => c.maxRise, max: 5, msg: 'Netlerin 5 arttı 📈 Emeğinin karşılığı geliyor, kahve gözlerindeki ışık da öyle.' },
    { id: 'netup10', cat: 'deneme', e: '🚀', n: 'Roket', d: 'Bir önceki denemeye göre 10+ net artış', prog: (c) => c.maxRise, max: 10, msg: '10 net artış! 🚀 Sen yükselirken ben en önde seni alkışlıyorum.' },
    { id: 'best', cat: 'deneme', e: '🌟', n: 'Yeni Rekor', d: 'En az 3 deneme sonra kişisel rekor kır', test: (c) => c.newBest, msg: 'Yeni rekor! 🌟 Kendi sınırlarını aşan kız, seninle gurur duyuyorum.' },

    // Luna ve özel günler
    { id: 'luna10', cat: 'ozel', e: '🐟', n: "Luna'nın Dostu", d: "Luna'yı 10 kez besle", prog: (c) => c.fed, max: 10, msg: 'Kedilerin bile seni bu kadar sevmesine şaşmamalı 🐟' },
    { id: 'luna50', cat: 'ozel', e: '🐠', n: 'Kedi Kraliçesi', d: "Luna'yı 50 kez besle", prog: (c) => c.fed, max: 50, msg: 'Luna senin en sadık çalışma arkadaşın, ben de en sadık hayranın 💛' },
    { id: 'hata1', cat: 'ilk', e: '❌', n: 'Hatadan Ders', d: 'Hata defterine ilk soruyu ekle', prog: (c) => c.mistakes, max: 1, msg: 'Yanlışına bakmak cesaret ister ve sen yaptın 💛 Her hata seni doğruya bir adım daha yaklaştırıyor.' },
    { id: 'hata10', cat: 'odak', e: '🧠', n: 'Hata Avcısı', d: '10 hata sorusunu öğren (4 kez doğru çöz)', prog: (c) => c.mistakesLearned, max: 10, msg: '10 yanlışı doğruya çevirdin 🧠 O sorular artık senin; seninle çok gurur duyuyorum.' },
    { id: 'kaynak5', cat: 'ozel', e: '📚', n: 'Kütüphaneci', d: 'Kütüphanene 5 kaynak ekle', prog: (c) => c.refs, max: 5, msg: 'Kendi akademik kütüphaneni kuruyorsun 📚 Kıvırcık saçlı bilim insanım benim!' },
    { id: 'depo10', cat: 'ozel', e: '🗂️', n: 'Düzenli Masa', d: 'Depoya 10 dosya ekle', prog: (c) => c.depo, max: 10, msg: 'Her şey yerli yerinde 🗂️ Düzenli bir masa, berrak bir zihin demek.' },
    { id: 'friends', cat: 'ozel', e: '🐈‍⬛', n: 'Kedi Ailesi', d: 'Vesper ve minik Güçlü ile tanış', test: (c) => c.friends, msg: 'Vesper ve minik Güçlü de geldi 🐈‍⬛ Bu küçük dünya senin için kuruldu.' },
    { id: 'bayram', cat: 'ozel', e: '🌙', n: 'Bayram Çalışkanı', d: 'Bir bayram gününde çalış', test: (c) => c.special.has('ramazan') || c.special.has('kurban'), msg: 'Bayramda bile çalıştın 🌙 Bayramın mübarek olsun güzelim, emeğin de.' },
    { id: 'newyear', cat: 'ozel', e: '🎆', n: 'Yeni Yıl Yıldızı', d: 'Yılbaşı haftasında çalış', test: (c) => c.special.has('yilbasi'), msg: 'Yeni yıla çalışarak girdin 🎆 Bu yıl senin yılın olacak, biliyorum.' },
    { id: 'valentine', cat: 'ozel', e: '💘', n: 'Kalbimin Sahibi', d: "14 Şubat'ta çalış", test: (c) => c.special.has('sevgililer'), msg: 'Sevgililer Günü’nde bile ders 💘 Sen hem kalbimin hem hedeflerinin sahibisin.' },
    { id: 'republic', cat: 'ozel', e: '🇹🇷', n: 'Bayram Ruhu', d: 'Bir ulusal bayramda çalış', test: (c) => c.special.has('ulusal'), msg: 'Bayramlar seninle daha anlamlı 🇹🇷 Geleceğe en güzel hediyeyi sen hazırlıyorsun.' },
  ];
  const byId = Object.fromEntries(B.map((b) => [b.id, b]));

  // Tek geçişte bütün sayaçları hesapla (her kontrolde bir kez)
  function context() {
    const s = D();
    const goal = s.settings.dailyGoal || 180;
    const day = {};
    let total = 0, maxSession = 0, pomo = 0, shine = 0, early = false, owl = false;
    for (const x of s.sessions) {
      total += x.minutes;
      if (x.minutes > maxSession) maxSession = x.minutes;
      const k = U.dateKey(x.start);
      const o = day[k] || (day[k] = { min: 0, pomo: 0, subj: new Set() });
      o.min += x.minutes;
      if (x.kind === 'pomodoro') { o.pomo++; pomo++; }
      o.subj.add(x.subjectId);
      if (x.rating === 5) shine++;
      const h = new Date(x.start).getHours();
      if (h >= 4 && h < 8) early = true;
      if (h >= 23 || h < 4) owl = true;
    }
    let goalDays = 0, maxPomoDay = 0, maxSubjDay = 0, weekend = false;
    const special = new Set();
    for (const k of Object.keys(day)) {
      const o = day[k];
      if (o.min >= goal) goalDays++;
      if (o.pomo > maxPomoDay) maxPomoDay = o.pomo;
      if (o.subj.size > maxSubjDay) maxSubjDay = o.subj.size;
      const dt = new Date(k + 'T12:00:00');
      if (dt.getDay() === 6 && o.min >= 120) {
        const sun = day[U.dateKey(U.addDays(dt, 1))];
        if (sun && sun.min >= 120) weekend = true;
      }
      if (window.Takvim) for (const e of Takvim.events(dt)) special.add(e.key);
    }
    let maxRise = 0, newBest = false, subjFull = false;
    if (window.Deneme) {
      const l = Deneme.list();
      const best = {};
      const cnt = {};
      for (const e of l) {
        const p = Deneme.previous(e);
        const t = Deneme.total(e);
        if (p) maxRise = Math.max(maxRise, t - Deneme.total(p));
        const kk = e.type + (e.brans || '');
        cnt[kk] = (cnt[kk] || 0) + 1;
        if (cnt[kk] > 3 && t > best[kk]) newBest = true;
        best[kk] = Math.max(best[kk] ?? -Infinity, t);
      }
    }
    if (window.YKS && YKS.field()) subjFull = YKS.subjectKeys().some((k) => { const p = YKS.subjectProgress(k); return p.count && p.done === p.count; });
    const st = s.stats || {};
    return {
      sessions: s.sessions.length,
      hours: total / 60,
      maxSession, pomo, shine, early, owl, weekend, goalDays, maxPomoDay, maxSubjDay, special,
      streak: window.Stats ? Stats.bestStreak() : 0,
      topics: window.YKS ? YKS.doneCount() : 0,
      subjFull,
      denemeler: s.denemeler.length,
      maxRise, newBest,
      planItems: st.planItems || 0,
      planFull: st.planFull || 0,
      tasks: s.tasksDone || 0,
      review: s.reviewDone || 0,
      notes: (s.notes || []).length,
      cards: (s.cards || []).length,
      cardReviews: st.cardReviews || 0,
      fed: s.fed || 0,
      friends: !!st.friendsMet,
      mistakes: (s.mistakes || []).length,
      mistakesLearned: st.mistakesLearned || 0,
      refs: (s.refs || []).length,
      depo: (s.files || []).length,
    };
  }
  const earned = (b, c) => (b.test ? !!b.test(c) : b.prog(c) >= b.max);

  // Yeni kazanılanları işaretler ve kuyruğa ekler
  function check() {
    const c = context();
    const fresh = B.filter((b) => !D().badges[b.id] && earned(b, c));
    if (!fresh.length) return [];
    const now = Date.now();
    for (const b of fresh) D().badges[b.id] = now;
    Store.save();
    queue.push(...fresh);
    flush();
    return fresh;
  }

  const sign = () => { const p = (D().settings.partner || '').trim(); return p ? `— ${U.esc(p)} 💌` : '💌'; };
  function confetti() {
    const colors = ['#ffd84d', '#ff8fb5', '#9a7bff', '#5fd3a3', '#6cc4ff', '#ffb547'];
    let h = '';
    for (let i = 0; i < 26; i++) {
      h += `<i style="left:${(i * 37) % 100}%;background:${colors[i % colors.length]};animation-delay:${(i % 9) * 0.07}s;animation-duration:${1.6 + (i % 5) * 0.25}s"></i>`;
    }
    return `<div class="confetti" aria-hidden="true">${h}</div>`;
  }

  // Kutlama penceresi: odaklanırken ya da başka pencere açıkken bekler
  function flush() {
    if (!App || !queue.length) return;
    if (App.isFocusing() || !document.getElementById('modal').classList.contains('hidden')) return;
    if (queue.length > 3) {
      const list = queue.splice(0);
      App.openModal(`${confetti()}<div class="badge-pop">
        <div class="bp-emoji">🏅</div>
        <h3>${list.length} yeni rozet kazandın!</h3>
        <div class="bp-list">${list.map((b) => `<span title="${U.esc(b.n)}">${b.e}</span>`).join('')}</div>
        <p class="bp-msg">${U.esc(list[0].msg)}</p>
        <p class="bp-sign">${sign()}</p>
        <p class="hint">Her rozetin kendi notu var; İlerleme → Rozetler'den dokunup okuyabilirsin.</p>
        <button class="btn primary" data-act="ok">Teşekkürler 💛</button></div>`, bindOk);
    } else {
      const b = queue.shift();
      App.openModal(`${confetti()}<div class="badge-pop">
        <div class="bp-emoji">${b.e}</div>
        <div class="bp-kicker">Yeni rozet</div>
        <h3>${U.esc(b.n)}</h3>
        <p class="hint">${U.esc(b.d)}</p>
        <p class="bp-msg">${U.esc(b.msg)}</p>
        <p class="bp-sign">${sign()}</p>
        <button class="btn primary" data-act="ok">${queue.length ? `Sıradaki rozet (${queue.length}) →` : 'Teşekkürler 💛'}</button></div>`, bindOk);
    }
    App.celebrate();
  }
  function bindOk(card) {
    card.querySelector('[data-act="ok"]').addEventListener('click', () => { App.closeModal(); setTimeout(flush, 250); });
  }

  // İlerleme sekmesindeki rozet galerisi
  function render(el) {
    if (!el) return;
    const c = context();
    const got = B.filter((b) => D().badges[b.id]).length;
    el.innerHTML = `<p class="hint">${got}/${B.length} rozet · Kazandığın rozete dokunursan notunu okuyabilirsin 💌</p>` + CATS.map(([cat, title]) => {
      const list = B.filter((b) => b.cat === cat);
      const n = list.filter((b) => D().badges[b.id]).length;
      return `<h3 class="sub-h">${title} <span class="muted small">${n}/${list.length}</span></h3>
        <div class="badges">${list.map((b) => {
          const on = !!D().badges[b.id];
          let prog = '';
          if (!on && !b.test) {
            const cur = Math.min(b.prog(c), b.max);
            const txt = b.max >= 10 || cur % 1 ? `${Math.floor(cur * 10) / 10}/${b.max}` : `${Math.floor(cur)}/${b.max}`;
            prog = `<div class="b-prog"><i style="width:${Math.round((cur / b.max) * 100)}%"></i></div><div class="b-ptxt">${txt}</div>`;
          }
          return `<button class="badge ${on ? 'on' : ''}" data-id="${b.id}" type="button">
            <div class="e">${b.e}</div><div class="n">${U.esc(b.n)}</div><div class="d">${U.esc(b.d)}</div>${prog}</button>`;
        }).join('')}</div>`;
    }).join('');
  }
  function openDetail(id) {
    const b = byId[id];
    if (!b) return;
    const on = D().badges[b.id];
    App.openModal(`<div class="badge-pop">
      <div class="bp-emoji ${on ? '' : 'locked'}">${b.e}</div>
      <h3>${U.esc(b.n)}</h3>
      <p class="hint">${U.esc(b.d)}</p>
      ${on ? `<p class="bp-msg">${U.esc(b.msg)}</p><p class="bp-sign">${sign()}</p><p class="hint">${new Date(on).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} tarihinde kazandın</p>`
        : '<p class="bp-msg muted">Bu rozetin içinde sana yazılmış bir not var 💌 Kazanınca açılacak.</p>'}
      <button class="btn primary" data-act="ok">Kapat</button></div>`, (card) => card.querySelector('[data-act="ok"]').addEventListener('click', App.closeModal));
  }

  return {
    init(app) { App = app; setInterval(flush, 2000); },
    check,
    flush,
    render,
    openDetail,
    count: () => B.length,
    LIST: B,
  };
})();

if (typeof window !== 'undefined') { window.Badges = Badges; }
