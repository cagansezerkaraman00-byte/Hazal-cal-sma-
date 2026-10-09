/* Sürümler ve yenilikler (en yeni en üstte).
   Yeni sürüm çıkarırken yalnızca buraya, listenin en üstüne bir kayıt eklemek yeter: önbellek sürümü
   de buradan gelir, açık olan uygulamalar yeni sürümü görüp "Güncelleme hazır" der.
   Liste JSON biçiminde ve işaretlerin arasında durur; güncelleme denetimi bu dosyanın sunucudaki
   halini okur. */

const SURUMLER = /*SURUMLER*/[
{
  "surum": "2.4.5",
  "tarih": "2026-10-09",
  "baslik": "Spotify hesabınla Luna içinde dinle",
  "notlar": ["🎧 Spotify hesabınla güvenli giriş, kendi çalma listelerin ve Luna içinde Premium oynatıcı eklendi. Oynatıcıyı açarak şarkıları başlatabilir, duraklatabilir ve değiştirebilirsin. Telefon ve tabletlerde gerçek hesapla deneme yapılacak."]
},
{
  "surum": "2.4.4",
  "tarih": "2026-10-09",
  "baslik": "Sade sayaç ve günlük çizelge",
  "notlar": [
    "⏱️ Sayaç altındaki ders ve oturum hedefi alanları kaldırıldı. Plandan başlatınca ders bağlantısı korunur.",
    "⌛ Geri sayım için üç kutu: saat, dakika, saniye. 1 saniyeden 23 saat 59 dakika 59 saniyeye kadar süre seçilebilir. Başlamış sayaçta süre değişmez.",
    "🗓️ Günlük plan artık çalışma, hedef süre ve durum sütunları olan bir çizelge. Tamamlanma yüzdesi, haftalık/aylık görünüm ve soru günlüğü korunur."
  ]
},
{
  "surum": "2.4.3",
  "tarih": "2026-10-09",
  "baslik": "Lavanta, dengeli sayaç ve soru günlüğü",
  "notlar": [
    "🪻 Lavanta ve pembe görünüm; gece temasında sakin yıldızlar. Sayaç halkası pembe.",
    "⏱️ Sayaç çemberi büyütüldü; rakamlar telefon, tablet ve küçük yatay pencerede çembere göre ölçeklenir.",
    "🗓️ Plan hedefleri saat olarak girilir (1,5 saat gibi). Hedef soru alanı kaldırıldı; her maddenin ders veya genel plan için olduğu açıklandı.",
    "✍️ Plan → Günlük içinde soru günlüğü: gün, ders, konu ve çözülen soru sayısı. Kayıtları düzenleyebilir, silebilir ve yedekleyebilirsin; çalışma süresini değiştirmez.",
    "📳 Sesten bağımsız titreşim denemesi ve cihaz desteğine göre yardım. Gerçek miyav kayıtları korunur."
  ]
},
{
  "surum": "2.4.2",
  "tarih": "2026-10-08",
  "baslik": "TYT, AYT ve Luna'nın bitiş miyavları",
  "notlar": [
    "⏱️ Çalış ekranında Serbest kronometre, TYT (165 dk), AYT (180 dk) ve kendi süreni girebildiğin geri sayım bir arada. 25/35/60 dakika kısayolları kaldırıldı.",
    "🐈 Süre dolunca eklenen üç gerçek kedi kaydından seçtiğin miyav çalar. Beş doğal ses bölümü ve beş titreşim ritmi Ayarlar'dan seçilip denenebilir; sesler çevrimdışı da saklanır.",
    "📳 Titreşim destekleyen cihazlarda çalışır. iPhone/iPad'de ses ve ekrandaki bitiş uyarısı kullanılır; arka planda askıya alınan uygulamanın uyarısı gecikebilir.",
    "🛠️ Duraklatma ve yeniden açmada sınav süresi korunur. Erken bitirmede süre doldu alarmı çalmaz; biten oturum ikinci kez kaydedilmez."
  ]
},
{
  "surum": "2.4.1",
  "tarih": "2026-10-08",
  "baslik": "Geri sayım, kronometre ve kesintisiz rozetler",
  "notlar": [
    "⏳ Pomodoro yerine 1–900 dakika arasında ayarlanabilir geri sayım; 25, 35 ve 60 dakika kısayolları.",
    "⏱️ Kronometre bir saatten sonra saat, dakika ve saniyeyi gösterir.",
    "⭐ 1 saatten 15 saate kadar 15 kesintisiz çalışma rozeti; duraklatılan parçalar birbirine eklenmez.",
    "🛠️ Güvenli güncelleme ve açılış onarımı korunur."
  ]
},
{
  "surum": "2.4",
  "tarih": "2026-10-08",
  "baslik": "Planlarını sen yazıyorsun",
  "notlar": [
    "🗓️ Plan sekmesinde günlük, haftalık ve aylık planlar var. Rastgele program yok: maddeleri sen eklersin, işaretlersin, bitmeyenleri tek dokunuşla sonraki güne taşırsın.",
    "💬 Akşam Luna günün planına bakıyor: yüzde kaçını bitirdiğini söylüyor ve küçük bir sonraki adım öneriyor. O akşam açmadıysan ertesi sabah anlatıyor.",
    "🏠 Ana ekrandaki Bugünün planı artık senin maddelerini gösteriyor; derse bağlı maddeye dokununca çalışma başlıyor.",
    "🛟 Bir güncelleme bu cihazda açılamazsa Luna kendiliğinden çalışan bir önceki sürümle açılıyor. Kayıtların ve ayarların yerinde kalıyor.",
    "🌙 Gökyüzü, Luna ve yıldızlar tek bir hata yüzünden kaybolmuyor; bozuk bir dosya artık yayınlanamıyor."
  ]
},
{
  "surum": "2.3.8",
  "tarih": "2026-10-07",
  "baslik": "Kurulum adımları cilalandı",
  "notlar": [
    "📱 iPad'de Paylaş düğmesinin yeri daha net (+ düğmesinin hemen solunda); Daha Fazla ve Eylemleri Düzenle de anlatılıyor.",
    "🤖 Android'de Chrome'un yeni menü adı (Yükle ve kısayol oluştur) ve Firefox'un adımları güncellendi.",
    "⏳ Kurulum sayfası, sen düğmeye dokunduktan sonra yeni sürüm gelse de yarıda yenilenmiyor.",
    "⬇️ iPhone'daki mavi ok artık yazıların üstüne binmiyor; Bağlantıyı kopyala düğmesi kesilmeyen bağlantıyı kopyalıyor.",
    "🔔 Güncelleme sırasında çalışan sayacın bildirimi kapanmıyor."
  ]
},
{
  "surum": "2.3.7",
  "tarih": "2026-10-07",
  "baslik": "Güvenli güncelleme ve açılış onarımı",
  "notlar": [
    "🛠️ Güncelleme dosyaları aynı sürümün doğrulamasından geçmeden etkinleşmez. Eksik veya karışık indirme eski çalışan sürümün yerini almaz.",
    "🔄 Açılış tamamlanamazsa boş ekran yerine yeniden deneme ve onarım bağlantısı gösterilir; çalışma kayıtları silinmez.",
    "📦 Sayfa ve kod dosyaları sürüm numarasıyla eşleştirilir."
  ]
},
{
  "surum": "2.3.5",
  "tarih": "2026-10-07",
  "baslik": "Üç kediye beslenme replikleri ve uygulama içi Spotify",
  "notlar": [
    "🐟 Luna, Vesper ve Güçlü için toplam 60 yeni beslenme repliği; her karakterin son 19 sözü tekrar edilmez.",
    "🐾 Sahnedeki kediler sırayla beslenir, yemek bitince kendi sözlerini söyler. Yemek sürerken tekrar dokunmak balık harcamaz.",
    "🎧 Spotify listeleri ve şarkıları Luna içindeki resmi oynatıcıda açılır; bunun için Client ID gerekmez. Hesap girişi ve tam dinleme Spotify koşullarına bağlıdır."
  ]
},
  {
    "surum": "2.3.3",
    "tarih": "2026-10-07",
    "baslik": "Tabletlerde kurulum düzeltildi",
    "notlar": [
      "📱 iPad: adımlar iPad'e göre yazıldı (Paylaş sağ üstte, gerekirse Daha Fazla). Yatay ekranda kart ve adımlar yan yana duruyor, üst kısım artık kesilmiyor.",
      "🤖 Android tabletler artık bilgisayar sanılmıyor. Samsung Internet, Firefox ve Edge için kendi menü adımları eklendi.",
      "⚡ Luna'yı yükle'ye erken dokunulursa birkaç saniye beklenir; yükleme penceresi aynı dokunuşla açılır.",
      "🏠 Ana ekran simgesi yanlışlıkla yer imi olarak eklendiyse sayfa bunu fark edip nasıl düzeltileceğini anlatıyor.",
      "🔔 Bildirimlerde yine renkli Luna simgesi görünüyor, sürüm numarası da doğru gösteriliyor.",
      "🔗 Paylaşılan bağlantıda kedili önizleme çıkıyor; kurulum sayfası yeni sürüm gelince kendini yeniliyor."
    ]
  },
  {
    "surum": "2.3.2",
    "tarih": "2026-10-07",
    "baslik": "iPad ve iPhone kurulumu düzeltildi",
    "notlar": [
      "📱 iPhone ve iPad kurulum adımları artık beklemeden görünür. Safari → Paylaş → Ana Ekrana Ekle ile kurulur; varsa Web Uygulaması Olarak Aç seçeneği açılır.",
      "⚡ Kurulum ekranı uygulama dosyalarını ve dış yazı tiplerini beklemeden hazırlanır. Ana ekran simgesi kurulum bağlantısından eklenmiş olsa da uygulama açılır.",
      "🔔 Bildirimlerde şeffaf kedi simgesi kullanılır; eski Luna bildirimleri güncellemede temizlenir.",
      "💜 Mor kurulum sayfası, yükleme isteği kabul edilince kapanmaz ve uygulamanın içini tarayıcıda açmaz. Kurulumdan sonra ana ekrandaki Luna simgesinden açılır.",
      "📲 Bildirime dokununca varsa ana ekrandan açılmış Luna penceresi tercih edilir. Kurulum simgeleri çevrimdışı önbelleğe eklendi.",
      "🐾 Son mobil mini pencere, beş tema ve karakter iyileştirmeleri korunur. Başarısız dış pencere açılışları temizlenir.",
      "✍️ Geliştiren: Çağan Sezer Karaman."
    ]
  },
  {
    "surum": "2.3",
    "tarih": "2026-10-07",
    "baslik": "Yeni kurulum sayfası",
    "notlar": [
      "💜 Luna'nın bağlantısı artık lila bir kurulum sayfası açıyor: ortada Luna, altında \"Luna'yı yükle\". Android ve bilgisayarda tek dokunuşla yüklenir, iPhone ve iPad'de adımları gösterir.",
      "🎁 Uygulamanın içi yalnızca yüklenince görünür; tarayıcıda açan biri sadece kurulum sayfasını görür.",
      "🔗 Bağlantı WhatsApp gibi uygulamalarda Luna'nın simgesiyle paylaşılır."
    ]
  },
  {
    "surum": "2.2",
    "tarih": "2026-10-07",
    "baslik": "Mini pencere iPad'de, Luna daha sevecen",
    "notlar": [
      "🐾 Mini pencere: Android'de ve Safari'de dokununca sayaç köşede küçük bir pencerede kalır. iPad'deki Luna uygulamasında düğme, Luna'yı YouTube'un yanında küçük pencerede kullanmayı adım adım anlatıyor; sayaç orada da durmadan akar.",
      "😊 Luna \"Bugün nasılsın?\" diye sorduğunda tek dokunuşla cevap verebilirsin; ona göre sana bir şey söylüyor.",
      "💬 Luna, Vesper ve Güçlü için yeni cümleler; sabah ayrı, akşam ayrı hal hatır. Gece sadece uykulu sözler.",
      "🌙 Vesper akşam bir kez gelir, bazen Luna'nın yanına kıvrılıp uyur. Kediler daha az ve yerinde konuşur.",
      "🛠️ Odak, hatırlatma ve bildirim düzeltmeleri; güncellemeler artık çok daha küçük iniyor."
    ]
  },
  {
    "surum": "2.1.7",
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


