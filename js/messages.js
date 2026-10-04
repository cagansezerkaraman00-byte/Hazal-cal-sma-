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
    ],
    night: [
      'Yıldızlar çıktı ✨ Ama sen de dinlenmeyi hak ediyorsun.',
      'Gece çalışması güzel ama uykun da en az ders kadar önemli 🌙',
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
    welcome: [
      'Merhaba {name}! Ben Luna 🤍 Bundan sonra derslerinde hep yanındayım. Hadi ilk oturumu başlatalım!',
    ],
    comeback: [
      'Seni özledim {name}! Bugün kısa bir oturumla başlamaya ne dersin?',
    ],
  };

  function fill(t) {
    return t.replace(/\{name\}/g, Store.data.settings.name || 'canım');
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
    get(kind) { return fill(U.pick(M[kind] || M.poke)); },
    love() {
      const notes = Store.data.loveNotes.filter((x) => x.trim());
      return notes.length ? U.pick(notes) : null;
    },
    timeOfDay,
    greeting,
  };
})();
