/* Sürümler ve yenilikler (en yeni en üstte).
   Yeni sürüm çıkarırken yalnızca buraya, listenin en üstüne bir kayıt eklemek yeter: önbellek sürümü
   de buradan gelir, açık olan uygulamalar yeni sürümü görüp "Güncelleme hazır" der.
   Liste JSON biçiminde ve işaretlerin arasında durur; güncelleme denetimi bu dosyanın sunucudaki
   halini okur. */

const SURUMLER = /*SURUMLER*/[
  {
    "surum": "2.1.4",
    "tarih": "2026-10-06",
    "baslik": "Minik uyku penceresi",
    "notlar": [
      "🐾 Uygulama içindeki büyük mini sayaç kartı kaldırıldı.",
      "💤 Küçük yatay pencerede üç kedi birbirine sokulup uyur; saat ve sayaç yanlarında görünür.",
      "↗️ Destekleyen tarayıcıda ayrılmadan önce Mini pencere’ye dokun. Luna’ya geri dönünce kapanır. Web sürümü, uygulama alta alındığında kendiliğinden dış pencere açamaz."
    ]
  },

  {
    "surum": "2.1.3",
    "tarih": "2026-10-06",
    "baslik": "Hata düzeltmeleri",
    "notlar": [
      "🕐 Luna konuşurken saat ve tarih artık hiç kaybolmuyor; balon saatin yanına ya da altına geçiyor.",
      "🌙 Gece Luna \"hadi uyuyalım\" dedikten sonra \"nasılsın, başlayalım\" demiyor; hal hatır sorusu sabah geliyor.",
      "📊 Gece yarısını geçen oturum başladığı güne sayılıyor; Luna'nın övgüsü bugünkü halkayla aynı şeyi söylüyor.",
      "📱 iPhone'da sayaç düğmeleri karta sığıyor, Mini sayaç tek satırda.",
      "🔢 Soru ortalamaları ve rozet ilerlemeleri virgüllü (25,4); raporda \"6'sında, 7'sinde\" doğru yazılıyor.",
      "💾 Son yedek takvim gününe göre gösteriliyor: dün akşam aldığın yedek \"dün\" görünüyor.",
      "📲 Telefonu yan tutunca kurulum ekranındaki ok yazının üstüne binmiyor."
    ]
  },
  {
    "surum": "2.1.2",
    "tarih": "2026-10-06",
    "baslik": "Luna, Vesper ve Güçlü artık daha canlı",
    "notlar": [
      "🐾 Luna’ya 48 yeni replik; aynı kategoride son üç replik tekrar edilmez.",
      "🎧 Spotify gömülü oynatıcısı yerine dışarıda açılan liste bağlantısı.",
      "📲 Android Chrome’da desteklenen bağlantılar yüklü uygulamaya yönlendirilir; açılamazsa web adresi kullanılır. iPad ve iPhone’da cihazın uygulama bağlantısı tercihleri geçerlidir.",
      "😻 Luna konuşurken öne döner; övgü, tatlı sitem, özlem ve esneme için yeni piksel yüzler.",
      "🌙 Vesper saat 18 sonrası hava karardığında ziyarete gelir; Güçlü bebek diliyle sohbet eder.",
      "💬 Konuşma balonu artık konuşan kediyi takip eder. Yürüyüş ve oyun tepkileri canlandı; hareket azaltma tercihi korunur.",
      "🔔 Bildirim logosu ve Android küçük rozeti düzeltildi; ayarlara test bildirimi eklendi.",
      "🐾 Yarım kalan oturum, eksik hedef ve uzun aralar için farklı, seyrek hatırlatmalar. Uygulama tamamen kapalıyken push sunucusu olmadan garanti edilmez.",
      "⏱️ Üç kedili, taşınabilir mini sayaç: saat, tarih, hava ve çalışma süresi. Uygulama dışı pencere yalnız destekleyen tarayıcılarda; diğer cihazlarda Luna içinde görünür.",
      "📌 Mini sayaç oturumunda arka planda süre korunur. İzin varsa bildirimde logo ve bitiş saati gösterilir; bildirim saniye saniye canlı sayaç değildir."
    ]
  },
  {
    "surum": "2.1.1",
    "tarih": "2026-10-06",
    "baslik": "Luna artık halini hatırını soruyor",
    "notlar": [
      "🐾 İlk tanışma korunur; sonraki açılışlarda Luna her gün halini hatırını sorar.",
      "😾 Az çalışılan akşamlarda tatlı sitem, hedef tamamlanınca gururlu replikler.",
      "🌙 Gece Luna: Anneciğim, hadii uyuyalım!",
      "🔔 Odak oturumunda tekrarlanan çıkışlara, izin verilen uygulamalar hariç, seyrek hatırlatmalar. Bildirim için izin ve tarayıcı desteği gerekir; uygulama tamamen kapalıyken garanti edilmez."
    ]
  },
  {
    "surum": "2.1",
    "tarih": "2026-10-06",
    "baslik": "Luna artık telefonunda bir uygulama",
    "notlar": [
      "🐱 Yeni simge: ana ekranda mor yıldızların arasındaki beyaz kedi. Adı da kısaca Luna.",
      "📲 Tarayıcıdan açınca adım adım kurulum ekranı çıkıyor; iPhone'da Paylaş → Ana Ekrana Ekle, Android'de tek dokunuş. Bir kere kurman yeterli.",
      "🔔 Yeni sürüm gelince bildirim ve simgede küçük bir rozet görüyorsun. Dokunup güncelliyorsun, hiçbir şey indirmeden kaldığın yerden devam ediyorsun.",
      "💾 Her şey yazarken kaydediliyor; uygulamayı kapatsan da yarım kalan notun bir dahaki açılışta seni bekliyor.",
      "📅 YKS tarihi ÖSYM açıklayınca kendiliğinden güncellenecek; geri sayım ve plan ona göre ayarlanıyor. İstersen kendi tarihini de seçebilirsin.",
      "✍️ Oturum bitince kaç soru çözdüğünü yazabiliyorsun; ana sayfada bugün kaç soru çözdüğün görünüyor.",
      "📚 Kitaplık artık Notlar; dosyaların Kütüphane'de. Ders videolarını da ekleyip uygulamanın içinde izleyebiliyorsun.",
      "🧡 Yavru kedinin adı Güçlü, hep öyle kalacak.",
      "🛠️ Küçük ekranlarda daha derli toplu ayarlar ve birçok ufak düzeltme."
    ]
  },
  {
    "surum": "2.0",
    "tarih": "2026-10-06",
    "baslik": "Güncellemeler artık uygulamanın içinde",
    "notlar": [
      "🔄 Ayarlar'a Güncellemeler bölümü geldi: yeni sürüm çıkınca haber veriyorum, tek dokunuşla güncellenip yenileniyor. Verilerin, ayarların ve sayacın olduğu gibi kalıyor.",
      "✨ Güncellemeden sonraki ilk açılışta neler değiştiğini bu pencerede görüyorsun.",
      "📲 Luna'yı tarayıcıdan açınca ana ekrana ekleme rehberi çıkıyor; Android'de tek dokunuşla yükleniyor.",
      "🐾 Tam odakta izinli uygulamalar: YouTube, ChatGPT, Gemini ya da Spotify'a hangi yoldan geçersen geç, dönüşte \"Neredeydin?\" diye soruyorum. Seçersen sayaç hiç durmamış gibi devam ediyor.",
      "📱 Telefonda daha rahat: odak ekranındaki düğmeler küçük ekranlara sığıyor, grafiklerde dokununca değer görünüyor, küçük dokunma alanları büyüdü.",
      "⌨️ Android klavyesinde Notlar ve Kütüphane aramasında harfler artık çoğalmıyor; arama daha hızlı.",
      "📝 Bir pencerede yazdıkların, yanlışlıkla dışarı dokununca kaybolmuyor; önce soruyorum. Sevgilinden notlar yazarken kaydediliyor.",
      "🎯 Sahnedeki küçük sayaca dokununca odak ekranına geri dönüyorsun.",
      "🛠️ Uzak tarihli sınavlar (KPSS gibi) listede ve geri sayımda görünüyor; ondalıklar virgüllü; çevrimdışı PDF, dar ekran ve yatay ekran düzeltmeleri."
    ]
  },
  {
    "surum": "1.3",
    "tarih": "2026-10-05",
    "baslik": "Daha sağlam",
    "notlar": [
      "Sayaç dolarken açık olan not, kart ya da deneme penceresi artık kaybolmuyor; oturum penceresi o kapanınca geliyor.",
      "Duraklatılmış oturum duraklattığın anda bitiyor; uygulama kapalıyken mola bitince kendiliğinden oturum yazılmıyor.",
      "Depolama dolarsa uyarıyorum; iki sekme açıkken veriler birbirinin üstüne yazılmıyor.",
      "Drive'a yükleme yarıda kalırsa dosya cihazda kalıyor, hiçbir şey kaybolmuyor.",
      "Kaynakçada tireli isimler ve kitap bölümleri doğru yazılıyor.",
      "Üniversite modunda devamsızlık saati, ikinci vize notu ve geçmiş dönem ortalaması düzeldi."
    ]
  },
  {
    "surum": "1.2",
    "tarih": "2026-10-05",
    "baslik": "Üniversite, KPSS ve yüksek lisans",
    "notlar": [
      "Eğitim modu: YKS'den sonra üniversite, KPSS ya da yüksek lisans. YKS verilerin silinmiyor, her modun kendi ders listesi var.",
      "Dönem ekranı: dersler, haftalık program, sınav ve ödev takvimi, devamsızlık, not ortalaması ve GANO, telefon takvimine aktarma.",
      "Telefonda daha derli toplu ekranlar, daha hızlı açılış ve daha az pil kullanımı."
    ]
  },
  {
    "surum": "1.1",
    "tarih": "2026-10-04",
    "baslik": "Kitaplık büyüdü",
    "notlar": [
      "Tam odak ve izinli uygulamalar; yavru kedinin adı artık Güçlü.",
      "Depo: ders fotoğrafları ve PDF'ler, uygulama içinde PDF görüntüleyici, isteğe bağlı Google Drive.",
      "Hata defteri: yanlış yaptığın soruların fotoğrafı ve aralıklı yeniden çözme.",
      "Kaynaklar: makale arama, DOI ve ISBN ile ekleme, APA 7 / Vancouver / IEEE kaynakça.",
      "Tanılama bölümü: bir şey çalışmazsa nedenini gösteriyor."
    ]
  },
  {
    "surum": "1.0",
    "tarih": "2026-10-04",
    "baslik": "Luna ile Çalış",
    "notlar": [
      "Luna, canlı gökyüzü, gerçek ay ve güneş, mevsimler ve özel günler.",
      "Pomodoro ve serbest sayaç, sade odak ekranı.",
      "YKS planı ve konu takibi, deneme netleri, notlar ve bilgi kartları.",
      "İlerleme raporu, rozetler, Spotify ve ortam sesleri."
    ]
  }
]/*SURUMLER*/;

if (typeof window !== 'undefined') { window.SURUMLER = SURUMLER; }