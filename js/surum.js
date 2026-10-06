/* Sürümler ve yenilikler (en yeni en üstte).
   Yeni sürüm çıkarırken yalnızca buraya, listenin en üstüne bir kayıt eklemek yeter: önbellek sürümü
   de buradan gelir, açık olan uygulamalar yeni sürümü görüp "Güncelleme hazır" der.
   Liste JSON biçiminde ve işaretlerin arasında durur; güncelleme denetimi bu dosyanın sunucudaki
   halini okur. */

const SURUMLER = /*SURUMLER*/[
  {
    "surum": "2.1.7",
    "gorunenSurum": "2.1.4",
    "tarih": "2026-10-07",
    "baslik": "Luna · Birlikte çalışıyoruz",
    "notlar": [
      "✍️ Geliştiren: Çağan Sezer Karaman.",
      "🐾 Luna, Vesper ve Güçlü için daha duygulu konuşmalar, yeni piksel yüz ifadeleri, canlı yürüyüş ve oyun tepkileri. Konuşma balonu konuşan kediyi takip eder; saat ve tarih görünür kalır.",
      "🌙 Vesper akşam hava karardığında gelir; Güçlü sevecen bebek diliyle konuşur. Gece uyku repliğinden sonra çalışma çağrısı yapılmaz.",
      "🎧 Spotify, YouTube, ChatGPT ve Gemini bağlantıları cihazın desteklediği şekilde kurulu uygulamaya yönlenir; uygun durumda web bağlantısı kullanılır.",
      "🔔 Bildirim logosu ve küçük rozet düzeltildi. Eksik hedef, yarım oturum ve uzun aralar için farklı, seyrek hatırlatmalar ve test bildirimi eklendi.",
      "💤 Küçük yatay mini pencerede uyuyan üç kedinin görseli; yanında saat, tarih, hava durumu, çalışma süresi ve ilerleme çubuğu bulunur. Görsel çevrimdışı da açılır.",
      "🎨 Ayarlar’dan beş mini pencere teması seçilebilir: güneşli Sıcak krem, Lavanta dalları, yaz çiçekli Adaçayı, kalpli Gül kurusu, yıldızlı ve hilalli Gece mavisi. Seçim kaydedilir ve açık pencereye uygulanır.",
      "↗️ Büyük uygulama içi kart kaldırıldı. Destekleyen tarayıcıda ayrılmadan önce Mini pencere’ye dokunulur; Luna’ya dönünce kapanır. Web sürümü alta alındığında kendiliğinden dış pencere açamaz.",
      "📌 Mini pencere oturumunda arka plandaki süre korunur. İzin varsa bildirimde bitiş saati gösterilir; canlı saniye sayacı değildir. Uygulama tamamen kapalıyken güvenilir hatırlatma için ek bildirim altyapısı gerekir.",
      "🛠️ Gece yarısını geçen oturumlar, günlük hedef hesapları, telefon düğme yerleşimleri, Türkçe sayılar, yedek tarihleri ve kurulum ekranı düzeltildi."
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
  }
]/*SURUMLER*/;

if (typeof window !== 'undefined') { window.SURUMLER = SURUMLER; }