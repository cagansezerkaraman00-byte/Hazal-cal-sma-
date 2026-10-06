/* Luna'nın söyledikleri. {name} yerine kullanıcının adı gelir. */

const Messages = (() => {
  const M = {
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

  return {
    get(kind, vars) {
      let t = fill(U.pick(M[kind] || M.poke));
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
