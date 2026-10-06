/* Luna'nın söyledikleri. {name} yerine kullanıcının adı gelir. */

const Messages = (() => {
  const M = {
    checkIn: ["Nasılsın anneciğim? Bugün keyfin nasıl, anlat bakalım 🐾","{name}, bugün nasıl hissediyorsun? Önce bir halini hatırını sorayım dedim 💜","Hoş geldiiin anneciğim! Günün nasıl geçti? Biraz soluklan, sonra birlikte başlarız 🐱"],
    lowStudy: ["Bugün biraz az çalıştık, patilerim biraz düştü 🥺 Ama küçücük bir adımla başlayabiliriz anneciğim.","{name}, kitaplar bizi bekliyor… Biraz sitemliyim bugün 😾 Hadi yalnızca on dakika deneyelim.","Hıımm, dersler biraz yalnız kaldı bugün 🐾 Yorulduysan dinlen; hazırsan beraber kısa bir oturum yapalım."],
    focusNudge: ["Anneciğim, yine mi dışarı kaçtın? 😾 Hadi dersine odaklan, molada bakarız.","{name}, patimi masaya koydum! 🐾 Şimdi bir tek şu soruya odaklanalım.","Biraz kızdım bak 😼 Sürekli çıkıp girince konumuz yarım kalıyor. Hadi kaldığımız yerden!"],
    proud: ["Aferin anneciğim! Bugünkü emeğini gördüm, kuyruğum mutluluktan durmuyor 😻","{name}, bugün güzel çalıştın! Biraz dinlen, sonra istersen devam ederiz 💜"],
    bedtime: ["{name}, ben yatmaya gidiyoruum… Hadi sen de uyu anneciğim 🌙","Anneciğimm, gözlerim kapanıyor. Hadii uyuyalım, yarın yine birlikteyiz 💤","Battaniyeme kıvrıldım bile {name}. Bugünlük bu kadar, iyi gecelerr 🐾"],
    companion: ["Yanına kıvrıldım anneciğim. Bugün neyi birlikte halledelim? 🐾","Bir bardak su içtin mi {name}? Ben de patilerimi esnetiyorum 💜","Miyav! Buradayım anneciğim, acele etmeden birlikte ilerleyelim 🐱"],
    morning: [
      'Günaydın {name}! ☀️ Güneş doğdu, ben de hazırım. Bugün ne çalışıyoruz?',
      'Günaydın! Kahvaltını yaptın mı? Aç karnına ders çalışılmaz miyav 🐾',
      'Sabahın en verimli saatleri başladı {name}, beraber parlayalım ✨',
    ],
    noon: [
      'Öğlen oldu! Bir şeyler yemeyi unutma {name} 🍽️',
      'Güneş tepede, ben de enerjiyle doluyum. Bir pomodoro daha?',
    ],
    afternoon: [
      'İkindi uykusu bastırıyor mu? Bir bardak su iç, sonra devam 💧',
      'Öğleden sonra biraz yavaşlamak normal. Kısa bir oturumla başla, gerisi gelir.',
    ],
    evening: [
      'Güneş batıyor 🌇 Bugün çok şey başardın {name}.',
      'Akşam oldu, yıldızlar çıkmak üzere. Bugünün son tekrarını yapalım mı?',
      'Zambaklar açtı 🌸 Ben de biraz kıvrılıp yanında uzanıyorum.',
      'Akşam serinliği geldi. Kısa bir tekrar, sonra hak edilmiş bir dinlenme 💜',
    ],
    night: [
      'Yıldızlar çıktı ✨ Ama sen de dinlenmeyi hak ediyorsun.',
      'Gece çalışması güzel ama uykun da en az ders kadar önemli 🌙',
      'Gökyüzü bu gece çok güzel. Bugün yaptıkların da öyle ⭐',
    ],
    late: [
      'Saat çok geç oldu {name}... Beyin uykuda öğrendiklerini kaydeder, hadi yatalım 😴',
      'Ben uyuyorum, sen de uyu olur mu? Yarın daha taze olursun 💤',
      'Gece yarısını geçtik. Yarınki sen, bu geceki uykun için sana teşekkür edecek 🌙',
    ],
    start: [
      'Hadi başlıyoruz! Telefonu ters çevir, ben nöbetteyim 🐾',
      'Odak modu açık! Ben yanında kitap okuyorum 📖',
      'Tek bir şeye odaklan, gerisini bana bırak ✨',
      'Başladın bile, en zor kısım buydu! 💪',
      'Bu oturum sadece senin. Hadi {name}!',
    ],
    during: [
      'Çok güzel gidiyorsun, devam! ⭐',
      'Sırtını dikleştir, omuzlarını gevşet 🧘‍♀️',
      'Aklına başka bir şey geldiyse not al, sonra bakarsın.',
      'Sessizce yanındayım. Miyav 🐾',
      'Her dakika seni hedefine bir adım daha yaklaştırıyor.',
      'Zor bir yer mi? Bir kez daha oku, sonra kendi cümlelerinle anlat.',
    ],
    done: [
      'Harika! Bir oturum daha tamam 🎉',
      'Bravo {name}! Bunu hak ettin, mola zamanı ☕',
      'İşte bu! Yıldızlar senin için parlıyor ✨',
      'Gurur duyuyorum! Biraz esne, su iç 💧',
    ],
    breakStart: [
      'Mola! Ekrandan uzaklaş, pencereden dışarı bak 🌤️',
      'Biraz esne, kalk yürü. Ben de patilerimi esnetiyorum 🐈',
      'Mola zamanı! Bir bardak su iç, kendine gülümse 💛',
    ],
    breakEnd: [
      'Mola bitti! Hazır mısın? 🐾',
      'Hadi geri dönüyoruz, kaldığımız yerden devam ✨',
    ],
    goal: [
      'GÜNLÜK HEDEF TAMAM! 🎉🌟 Sen bir yıldızsın {name}!',
      'Bugünkü hedefe ulaştın! Kendinle gurur duy, ben duyuyorum 💛',
    ],
    poke: [
      'Miyav! 🐾', 'Prrrr... 💜', 'Beni sevdin mi? 🥺', 'Mrrr? Ders bitti mi?',
      'Kulağımın arkasını kaşı lütfen 😽', 'Miyav miyav! (Çok çalışkansın demek)',
      'Ben Luna, senin çalışma arkadaşın ⭐', 'Balık var mı? 🐟',
    ],
    fed: [
      'Nyam nyam! Teşekkürler 🐟💛', 'Mmm, en sevdiğim! Prrrr 😻', 'Doydum! Şimdi çalışmaya devam 💪',
    ],
    noFish: [
      'Balığımız kalmadı 🥺 Bir odak oturumu tamamlarsan bir balık kazanırsın!',
    ],
    yks: [
      "YKS'ye {days} gün var. Her gün küçük bir adım, o gün kocaman bir fark 🌟",
      '{days} gün sonra o salondan gülümseyerek çıkacaksın {name} 💛',
      'Bugün çalıştığın her konu, haziranda sana puan olarak dönecek ✨',
      'Hedefe giden yol tek tek çözülen sorulardan geçiyor. Sen bunu yapıyorsun 🐾',
    ],
    // {what}: "Anatomi vizesine 3 gün kaldı" / "Anatomi vizesi yarın"
    exam: [
      '{what}. Plan hazır, adım adım gidiyoruz; sen bunu yaparsın {name} 💪',
      '{what}. Bugünkü tekrar turu bile kocaman bir adım 🌟',
      '{what}. Ben hep yanındayım 🐾 Birlikte hallederiz.',
      '{what}. Hazırlandığın her dakika seninle o salona girecek 💛',
    ],
    uni: [
      'Bugün de kendi hikâyene bir sayfa ekliyorsun {name} 📚',
      'Küçük ama düzenli adımlar, dönem sonunda kocaman bir fark 🌟',
      'Kahve gözlerindeki o merak, en büyük gücün ✨',
      'Bugünkü listeyi birlikte bitirelim mi? Ben buradayım 🐾',
    ],
    denemeUp: [
      'Netlerin yükseliyor! 📈 Emeğinin karşılığını görüyorsun {name}.',
      'Bu deneme bir öncekinden daha iyi! Gurur duyuyorum 🌟',
    ],
    denemeAny: [
      'Deneme kaydedildi 📝 Her deneme sana yol gösteren bir harita.',
      'Bir deneme daha bitti! Eksik konular, bir sonraki adımın 🧭',
    ],
    play: [
      'Yumağımı yakaladım! 🧶', 'Bu ip benim! Miyav 😼', 'Molada biraz oyun iyi gelir, sen de esne 🧶',
    ],
    vesper: [
      'Bu Vesper 🐈‍⬛ Mavi gözlü gece kedimiz; sessizdir ama hep seni izler.',
      'Vesper selam veriyor 💙 Gözleri gece gibi, kalbi kadife gibi.',
      'Vesper de burada! Onunla birlikte sessizce odaklanabilirsin 🌙',
    ],
    kitten: [
      '{kitten} geldi! 🧡 Enerjisi hiç bitmez ama en çok senin yanında uyumayı sever.',
      'Minik {kitten} zıplıyor 🐾 Sen çalışırken o da büyüyor.',
      '{kitten} kocaman gözleriyle sana bakıyor 🥺 Mola verince seninle oynamak istiyor.',
    ],
    meetVesper: ['Tanıştırayım: bu Vesper, benim gece arkadaşım 🐈‍⬛ Mavi gözleri yıldızlar kadar parlak.'],
    meetKitten: ['Bu da minik {kitten}! 🧡 Kocaman gözlü, yerinde duramayan sarı bebeğimiz.'],
    yilbasi: ['Mutlu yıllar {name}! 🎄 Yeni yılda bütün hayallerin gerçek olsun ✨'],
    bayram: ['Bayramın mübarek olsun {name} 🌙 Bugün kendine de güzel davran, olur mu?'],
    ulusal: ['Bayramımız kutlu olsun 🇹🇷 Geleceği kuran gençlerden biri de sensin {name}.'],
    welcome: [
      'Merhaba {name}! Ben Luna 🤍 Bundan sonra derslerinde hep yanındayım. Hadi ilk oturumu başlatalım!',
    ],
    dolunay: [
      'Bu gece dolunay 🌕 Pencereden bir bak {name}, gökyüzü sana ışık tutuyor.',
      'Dolunay çıktı 🌕 Ben de ona bakıp mırlıyorum. Bugünün emeği de en az onun kadar parlak.',
    ],
    backup: [
      'Bu ay çok emek verdin {name} 🐾 Ayarlar → Veriler → Yedek al ile hepsini güvenceye alalım mı?',
      'Küçük bir hatırlatma: verilerinin bir yedeğini almaya ne dersin? Ayarlar → Veriler 💾',
    ],
    comeback: [
      'Seni özledim {name}! Bugün kısa bir oturumla başlamaya ne dersin?',
    ],
  };

  M.checkIn.push(...["Anneciğim, bugün içinden neler geçiyor? Önce seni bir dinleyeyim 🐾","Hoş geldin {name}! Enerjin nasıl: minik bir adım mı, uzun bir çalışma mı?","Bugünün en güzel şeyi neydi? Benimki seni burada görmek 😽","Su tamam mı, rahat bir sandalye tamam mı? Sen nasılsın peki?","Bugün zor geçtiyse yavaş başlayabiliriz anneciğim 💜","Miyav merhaba! Aklında ders dışında bir şey varsa önce not edelim."]);
  M.lowStudy.push(...["Kitap açık ama biz biraz uzaklara daldık galiba 😼 Bir sayfayla barışalım mı?","Anneciğim, bugün derslerle pek görüşemedik. On dakika birlikte dener miyiz?","Burnumu biraz kıvırdım ama sana güveniyorum. Küçük bir başlangıç yeter 🐾","Hazırsan en kolay soruyu seçelim. Zor olanı sonra düşünürüz.","Bugün plan az ilerledi diye bütün gün boşa gitmedi. Bir adım daha atabiliriz.","Hııım, ben masadayım, kalem burada… Eksik olan minicik bir başlangıç 😾"]);
  M.focusNudge.push(...["Pati kontrolü! Şimdi ekrandan ekrana değil, sorudan soruya gidiyoruz 😼","Anneciğim, bildirimler bekleyebilir. Önce şu paragrafı bitirelim mi?","Biraz somurttum bak! Hadi dikkatimizi yine deftere getirelim 🐾","{name}, molada gezelim; şimdi şu küçük işi birlikte bitirelim.","Daldık yine galiba. Sorun değil, kaldığın satırı bul; ben buradayım.","Telefon çok konuşuyor bugün, biz biraz derse kulak verelim 😾"]);
  M.proud.push(...["Anneciğim hedef tamam! Şimdi gururlu bir miyavı hak ettin 😻","Bugünkü emeğini tek tek topladın. Ben de yanına mutlulukla kıvrıldım.","{name}, bugün kendine verdiğin sözü tuttun. Biraz dinlenebilirsin 💜","Kocaman bir aferin! Şimdi gözlerini ekrandan ayırıp uzağa bak.","Patiler havaya! Bugünkü hedefi beraber kapattık 🐾","Bugün yeterince emek verdin. Yeni iş eklemeden bu anın tadını çıkaralım."]);
  M.bedtime.push(...["Anneciğimm, battaniye hazır. Hadii uyuyalım, yarın yine görüşürüz 🌙","{name}, ben pati pijamalarımı giydim sayılır. Gözlerimizi dinlendirelim mi?","Son sayfayı işaretle, kaldığın yer kaçmıyor. İyi geceler anneciğim 💤","Gece ekibi paydos! Ben kıvrılıyorum, sen de güzelce dinlen.","Bugünün defterini kapatalım mı? Yarınki ilk küçük adımı sabaha bırakıyoruz.","Mırr… Uykum geldi {name}. Hadi ışıkları biraz kısalım 🌙"]);
  M.companion.push(...["Kaleminin yanındaki yer benim. Beraber sessizce çalışabiliriz 🐱","Anneciğim, büyük planı küçücük parçalara bölelim mi?","Bir soru, bir nefes, bir yudum su. Acelemiz yok 💜","Takıldığın yere küçük bir yıldız koy; sonra tekrar döneriz.","Bugün mükemmel olmak zorunda değilsin. Başlamak yeter {name}.","Ben burada mırlıyorum. Sen sıradaki küçük işini seç bakalım 🐾"]);
  M.start.push(...["Anneciğim hazırsa pati ekibi hazır! İlk sorudan başlıyoruz 🐾","Şimdi yalnızca önündeki işe bakalım. Geri kalanı sırayla gelir.","Defter açıldı, Luna yerleşti. Hadi {name}, başlıyoruz!","Küçük bir hedef seç: bu oturumda neyi bitirmek istiyorsun?"]);
  M.done.push(...["Bir oturum daha cebimizde! Anneciğim, şimdi biraz esneyelim 😻","Emeğin kaydedildi. Molada omuzlarını ve gözlerini dinlendir.","Bitti bile! Nasıl geçtiğini bir kelimeyle not etmek ister misin?","Pati çak! Şimdi kendine kısa bir mola ver 🐾"]);
  M.poke.push(...["Mırrr… Anneciğim beni mi çağırdı? 😽","Bir pati benden, bir soru senden. Anlaştık mı?","Buradayım {name}! Kulağımı sevdin, şimdi deftere dönelim 🐾","Minik bir miyav molası verdik. Hazırsan devam 💜"]);

  function fill(t) {
    return t.replace(/\{name\}/g, Store.data.settings.name || 'canım').replace(/\{kitten\}/g, 'Güçlü');
  }

  function timeOfDay(d = new Date()) {
    const h = d.getHours();
    if (h >= 5 && h < 11) return 'morning';
    if (h >= 11 && h < 14) return 'noon';
    if (h >= 14 && h < 18) return 'afternoon';
    if (h >= 18 && h < 21) return 'evening';
    if (h >= 21 && h < 24) return 'night';
    return 'late';
  }

  function greeting(d = new Date()) {
    const h = d.getHours();
    const n = Store.data.settings.name || '';
    if (h >= 5 && h < 12) return `Günaydın ${n} ☀️`;
    if (h >= 12 && h < 18) return `İyi günler ${n} 🌤️`;
    if (h >= 18 && h < 22) return `İyi akşamlar ${n} 🌇`;
    return `İyi geceler ${n} 🌙`;
  }


  // Konuşma geçmişi çalışma verilerinden ayrı tutulur; yerel takvim gününde yenilenir.
  function companionState(now = new Date()) {
    const day = U.dateKey(now);
    let c = Store.data.lunaConversation;
    if (!c || typeof c !== 'object' || Array.isArray(c)) c = {};
    if (c.day !== day) c = { introduced: !!c.introduced, day, checkedIn: false, departures: 0, lastNudge: 0, bedtime: false };
    Store.data.lunaConversation = c;
    return c;
  }

  function mood(now = new Date()) {
    const c = companionState(now), h = now.getHours();
    if ((h >= 23 || h < 5) && !c.bedtime) return 'bedtime';
    const today = U.dateKey(now);
    const minutes = Store.data.sessions.reduce((sum, s) =>
      sum + (U.dateKey(s.end || s.start) === today ? Math.max(0, Number(s.minutes) || 0) : 0), 0);
    const goal = Math.max(1, Number(Store.data.settings.dailyGoal) || 180);
    if (minutes >= goal) return 'proud';
    // Güne yeni başlayan ya da halen çalışan kullanıcıya "az çalıştın" deme.
    const t = Store.data.timer;
    if (h >= 17 && h < 23 && minutes < Math.min(30, goal / 4) && !(t && t.running)) return 'lowStudy';
    return 'companion';
  }

  function departure(away, now = new Date()) {
    const c = companionState(now);
    if (!away || away.app || away.lunaCounted || now.getTime() - away.at <= 15000) return false;
    away.lunaCounted = true;
    c.departures = (Number(c.departures) || 0) + 1;
    // İlk çıkış normaldir. Hatırlatmalar en fazla on dakikada bir gelir.
    if (c.departures < 2 || (c.lastNudge && now.getTime() - c.lastNudge < 600000)) return false;
    c.lastNudge = now.getTime();
    away.lunaNudge = true;
    return true;
  }

  return {
    companionState, mood, departure,
    get(kind, vars) {
      const arr = M[kind] || M.poke;
      const state = companionState();
      if (!state.replies || typeof state.replies !== 'object' || Array.isArray(state.replies)) state.replies = {};
      const history = Array.isArray(state.replies[kind]) ? state.replies[kind] : [];
      const fresh = arr.filter((line) => !history.includes(line));
      const selected = U.pick(fresh.length ? fresh : arr);
      state.replies[kind] = [...history, selected].slice(-Math.min(3, arr.length - 1 || 1));
      Store.save();
      let t = fill(selected);
      if (vars) for (const k of Object.keys(vars)) t = t.split('{' + k + '}').join(vars[k]);
      return t;
    },
    // Gün boyunca aynı kalan seçim (her yeniden çizimde değişip göz yormasın)
    daily(kind, vars) {
      const arr = M[kind] || M.poke;
      const day = Math.floor(U.dayStart(new Date()).getTime() / 864e5);
      let t = fill(arr[day % arr.length]);
      if (vars) for (const k of Object.keys(vars)) t = t.split('{' + k + '}').join(vars[k]);
      return t;
    },
    love() {
      const notes = Store.data.loveNotes.filter((x) => x.trim());
      return notes.length ? U.pick(notes) : null;
    },
    timeOfDay,
    greeting,
  };
})();
