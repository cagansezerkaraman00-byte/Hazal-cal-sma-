/* Sürümler ve yenilikler (en yeni en üstte).
   Yeni sürüm çıkarırken yalnızca buraya, listenin en üstüne bir kayıt eklemek yeter: önbellek sürümü
   de buradan gelir, açık olan uygulamalar yeni sürümü görüp "Güncelleme hazır" der.
   Liste JSON biçiminde ve işaretlerin arasında durur; güncelleme denetimi bu dosyanın sunucudaki
   halini okur. */

const SURUMLER = /*SURUMLER*/[
{
  "surum": "2.8",
  "tarih": "2026-10-25",
  "baslik": "Hazal'ın Küçük Dünyası",
  "notlar": [
    "🏡 Yeni: Hazal'ın Küçük Dünyası. Çalış sekmesindeki karta dokun; yıldızlı pencerenin önünde Luna, Vesper ve Güçlü'nün birlikte dinlendiği odan açılır.",
    "🏅 Bugüne kadar kazandığın bütün rozetler odanı süslüyor: duvarda çerçeveler, kitaplıkta kupalar, madalyalar ve kitaplar. Bir rozete dokununca kartı açılır; yeni rozetler kendiliğinden eklenir, hiçbiri silinmez.",
    "🪴 Planından günün ilk maddesini bitirince odana bir eşya gelir, günün planı tamamen bitince bir tane daha: lavanta, minder, yıldız lambası, mum, kedi yatağı ve daha fazlası. Yerlerini sen seçersin; şimdiye kadarki emeğin de odanı ilk açışında hediye olarak bekliyor.",
    "💌 Çağan'dan mektup kutusu: mektuplar kendi gününde ya da emeğin bir eşiğe varınca açılır; açtıklarını istediğin zaman yeniden okursun.",
    "🔥 Seri rozetleri artık doğru sayılıyor; hak ettiğin seri rozetleri gelecek.",
    "⚡ Luna daha hızlı açılıyor; geri tuşu açık pencereyi, defteri ya da odayı kapatıyor, başka sekmedeysen Çalış'a dönüyor. Uygulama yanlışlıkla kapanmıyor.",
    "📒 Sticker defterinin sayfa ve yapıştırma sesleri artık çalıyor; takvimde iPhone ve iPad'de dokunuşların boşa gitmesi giderildi."
  ]
},
{
  "surum": "2.7.2",
  "tarih": "2026-10-24",
  "baslik": "Göz almayan açılış",
  "notlar": [
    "🌙 Luna açılırken artık parlak açık lila bir ekran yok: koyu bir alacakaranlık moru zeminde kedi yumuşakça parlıyor, altında \"Luna\" ve küçük noktalar; uygulama hazır olunca usulca kayboluyor. Gece gözünü almaz.",
    "📱 Telefonun kendi açılış rengi de koyulaştı; telefon bunu kendisi güncellediği için bir gün kadar sürebilir."
  ]
},
{
  "surum": "2.7.1",
  "tarih": "2026-10-24",
  "baslik": "Yeni ayraç",
  "notlar": [
    "🎀 Sticker defterinin ayracı yenilendi: sırttan, sayfaların arasından sarkan saten bir kurdele; her defterin kendi renginde. Defter kapanırken artık geriden gelmiyor, kapakla birlikte kayıyor.",
    "📚 Defterin kenarındaki sayfa yığını da kapak açılıp kapanırken onunla aynı anda belirip kayboluyor.",
    "💖 Takvime çok özel bir gün eklendi; zamanı gelince görürsün."
  ]
},
{
  "surum": "2.7",
  "tarih": "2026-10-24",
  "baslik": "Takvim ve sticker defteri",
  "notlar": [
    "📅 Yeni Takvim sekmesi: telli, pembe ve yıldızlı bir masa takvimi. Bir güne dokun, en üstteki \"Güne not al\" ile doğum günlerini, buluşmaları yaz; istersen her yıl tekrarlasın, bir gün önce de haber vereyim.",
    "📝 Denemelerini takvimden planla: Deneme sekmesinde de görünür, sonucunu girince analizine katılır. O gün ve bir gün önce sana hatırlatırım.",
    "📒 Sticker defteri: beş zambaklı defter, gerçek bir defter gibi sayfa sayfa çevriliyor. 216 sticker arasından birine dokun, uçup güne yapışsın.",
    "🌈 Sticker yapıştırdığın gün, stickerın rengine boyanır; son kullandığın stickerlar da tek dokunuşla elinin altında.",
    "🗓️ Her günün sayfasında o günün planı ve çalışman da var; unuttuğun bir çalışmayı geçmiş bir güne ekleyebilirsin."
  ]
},
{
  "surum": "2.6.4",
  "tarih": "2026-10-23",
  "baslik": "Daha akıcı müzik",
  "notlar": [
    "🎧 Şarkının ilerleme çubuğu artık saniyede bir zıplamıyor, akıp gidiyor; şarkı değişince kapak ve şarkı adı yumuşakça beliriyor, aynı kapak yeniden yüklenip titremiyor.",
    "⚡ Bir listeye dokunduğun an şarkıları yüklenmeye başlıyor; daha önce açtığın listeye dönünce şarkılar beklemeden geliyor. Yüklenirken boş ekran yerine şarkı satırlarının taslağı görünüyor.",
    "🎵 Listede çalan şarkının yanında küçük ses çubukları oynuyor, böylece hangisinin çaldığını hemen görüyorsun."
  ]
},
{
  "surum": "2.6.3",
  "tarih": "2026-10-23",
  "baslik": "Daha sağlam Luna",
  "notlar": [
    "📅 Gece duraklatıp sabah devam ettiğin oturum artık ikiye ayrılıyor: dünkü kısım düne, bugünkü kısım bugüne yazılıyor; bugünün hedefi doğru doluyor.",
    "🔔 Luna arka planda kapanıp yeniden açılsa da süre bitince alarm sesi çalar; ekrana bir kez dokunman yeter.",
    "🎯 Sıfırladığın oturumun hedefi bir sonraki oturuma taşınmıyor, başka bir plan maddesi yanlışlıkla işaretlenmiyor.",
    "🔄 Yedekleri birleştirirken sildiğin kayıtlar geri gelmiyor; başka cihazda düzelttiğin oturum yeni hâliyle geliyor.",
    "📚 Silinmiş ya da öbür moddaki bir derse ait oturum, kaynak ve dosya düzenlenince başka derse kaymıyor; alan seçerken kullandığın dersler silinmiyor.",
    "☁️ Dosya yüklerken, kamera ya da dosya seçici açıkken güncelleme sayfayı yenilemiyor; Drive eşitlemesi yeni yüklenen dosyayı silmiyor.",
    "🗓️ Ana ekrandaki plan 8 maddeden uzunsa kalanlara bağlantı var; hata defterinde öğrenilen soru sayısı doğru sayılıyor; rehberdeki müzik anlatımı güncellendi."
  ]
},
{
  "surum": "2.6.2",
  "tarih": "2026-10-23",
  "baslik": "Müzikte oynatıcı yukarıda",
  "notlar": [
    "🎧 Müzik bölümünde Luna oynatıcısı ve şarkı listesi artık en üstte, kütüphanendeki çalma listeleri altında. Aşağıdan bir liste seçince oynatıcı ekranın yukarısında kaldıysa yumuşakça oraya kayar."
  ]
},
{
  "surum": "2.6.1",
  "tarih": "2026-10-22",
  "baslik": "Şiir için küçük düzeltmeler",
  "notlar": [
    "⭐ Yıldız artık parmağını kaldırınca açılıyor; sayfayı kaydırırken yanlışlıkla açılmıyor. Ders sırasında dokunulursa da dersini bölmüyor.",
    "⏰ Şiir açıkken ders biterse 'Süre doldu' uyarısı şiirin üstünde görünüyor.",
    "📱 Telefon yan çevrildiğinde şiir ve zambak ekrana tam sığıyor.",
    "✨ 'Baştan' dedikten sonra da Luna'nın sözü geliyor; klavyeyle açınca boşluk tuşu sayacı başlatmıyor, Esc yalnızca şiiri kapatıyor.",
    "🔤 İnternetsiz açılışta da uygulamanın yazı tipleri yerinde kalıyor."
  ]
},
{
  "surum": "2.6",
  "tarih": "2026-10-22",
  "baslik": "Sana bir şiir ve Zambak teması",
  "notlar": [
    "🌸 Eşeğin sana bir şiir bıraktı 💜 İlk açılışta kendiliğinden gelir; sonra Çalış ekranındaki 'Şiiri aç' ile istediğin zaman yeniden okuyabilirsin.",
    "⭐ Geceleri sahnenin gökyüzünde altın renkli bir yıldız parlıyor. O sizin yıldızınız: dokununca şiir yeniden açılır.",
    "🌺 Ayarlar → Görünüm'e yeni bir tema geldi: Zambak. Lacivert gökyüzü, altın başlıklar ve gökkuşağı renkli düğmeler.",
    "🖼️ Şiirdeki resmin tamamını açabilirsin; telefonuna kaydetmek için 'Telefona kaydet'e dokun ya da resme basılı tut."
  ]
},
{
  "surum": "2.5",
  "tarih": "2026-10-14",
  "baslik": "Sana bir mektup ve birçok küçük düzeltme",
  "notlar": [
    "💜 Çalış ekranına sana özel bir mektup eklendi. 'Mektubu aç' deyince açılır, istediğin zaman tekrar okuyabilirsin.",
    "🛟 Yedek yükleme artık güvenli: bozuk bir dosya ya da dolu depolama yüzünden hiçbir verin kaybolmaz; işlem ya tam uygulanır ya hiç.",
    "⏱️ Ayarlardaki geri sayım dakikası artık seçtiğin süreyle aynı; düzenleyince saat:dakika:saniye seçimini sessizce silmiyor.",
    "🔕 Güncelleme kartı odak ekranında saatin üstüne binmiyor; oturum bitince yeniden görünür.",
    "✍️ Küçük yazı ve dil düzeltmeleri: iPhone kurulum metni, 'Güncelle' düğmesi, gün sonu kutlaması, kılavuzdaki eski anlatımlar ve alt yazı düzeltildi.",
    "🗓️ YKS günü geldiğinde Luna artık '0 gün' demiyor, o güne özel bir söz söylüyor."
  ]
},
{
  "surum": "2.4.17",
  "tarih": "2026-10-10",
  "baslik": "Spotify atlama ve sarma kontrolleri",
  "notlar": [
    "🎧 Seçtiğin şarkı artık çalma listesiyle birlikte başlar. İleri ve geri düğmeleri listedeki komşu şarkıyı seçer. Sarma komutu uygulanmadığında aynı Luna cihazına yeniden gönderilir. Geciken yanıtlar ve kopan bağlantılar için toparlanma düzeltmeleri dahildir."
  ]
},
{
  "surum": "2.4.16",
  "tarih": "2026-10-10",
  "baslik": "Spotify bağlantı ve sarma düzeltmesi",
  "notlar": [
    "🎧 Art arda sararken son seçilen konum uygulanır. Geciken eski yanıtlar sarma konumunu değiştirmez. iPad ses engelinde Sesi aç ile tekrar denenebilir; takılan işlemler düğmeleri kilitlemez. Oturum yenileme ve kopan bağlantının toparlanması düzeltildi."
  ]
},
{
  "surum": "2.4.15",
  "tarih": "2026-10-10",
  "baslik": "Tek Premium müzik paneli",
  "notlar": [
    "🎧 Albüm kapağı, seçilebilir şarkılar ve ileri–geri sarma tek Premium panelinde. Müzik bölümü açılınca oynatıcı önceden hazırlanır ve aynı bağlantı kullanılır. Spotify’ın ağ ve ses yükleme süresi cihaz bağlantısına bağlıdır."
  ]
},
{
  "surum": "2.4.14",
  "tarih": "2026-10-10",
  "baslik": "Spotify oynatıcı ve şarkı listesi",
  "notlar": [
    "🎧 Spotify’ın kendi kapaklı oynatıcısı ve altındaki şarkı listesi tek pencerede. Ayrı mor Luna oynatıcısı kaldırıldı; oynatma Spotify penceresinde devam eder."
  ]
},
{
  "surum": "2.4.13",
  "tarih": "2026-10-10",
  "baslik": "Açık ve geniş Spotify penceresi",
  "notlar": [
    "🎧 Spotify’ın kendi penceresi açık ve daha uzun. En alttaki mor şarkı listesi kaldırıldı; üstteki Luna oynatıcısı korundu. Şarkı seçimindeki tekrarlanan ses hazırlığı kaldırıldı ve oynatma tuşlarından sonra durum hemen yenileniyor."
  ]
},
{
  "surum": "2.4.12",
  "tarih": "2026-10-10",
  "baslik": "Geniş müzik paneli ve hızlı seçim",
  "notlar": [
    "🎧 Şarkı seçimi ve oynatma kontrolleri tek geniş panelde birleşti. Seçilen şarkı bilgisi hemen görünür; eski konum güncellemeleri ileri sarmayı geri almaz. Spotify’ın kendi penceresi açılır bölümde büyütüldü."
  ]
},
{
  "surum": "2.4.11",
  "tarih": "2026-10-10",
  "baslik": "Spotify şarkı seçimi açıklaması",
  "notlar": [
    "🎧 Şarkı satırından seçim ve Spotify liste önizlemesi birbirinden ayrıldı. Dinlemek istediğin şarkıyı listeden seçip Luna oynatıcısında kontrol edebilirsin."
  ]
},
{
  "surum": "2.4.10",
  "tarih": "2026-10-10",
  "baslik": "Listeden tek tek şarkı seçimi",
  "notlar": [
    "🎧 Kendi listendeki şarkılar ayrı satırlar halinde görünür. Dokunduğun şarkı doğrudan Luna oynatıcısına aktarılır; pembe kaydırma çubuğu ve oynatma düğmeleriyle kontrol edilir. Spotify’ın erişim vermediği listeler için açıklama gösterilir."
  ]
},
{
  "surum": "2.4.9",
  "tarih": "2026-10-10",
  "baslik": "Spotify’da istediğin şarkıyı seç",
  "notlar": [
    "🎧 Spotify listesi Luna oynatıcısı açıkken de görünür. Alttaki pencereden seçtiğin şarkı Luna oynatıcısına aktarılır; liste açmak artık otomatik olarak ilk şarkıyı başlatmaz."
  ]
},
{
  "surum": "2.4.8",
  "tarih": "2026-10-10",
  "baslik": "Spotify şarkı kaydırma ve tatlı düğmeler",
  "notlar": [
    "🎧 Pembe kaydırma çubuğuyla şarkıda istediğin saniyeye git. Geçen ve toplam süre gösterilir; yuvarlak önceki, sonraki ve oynat/duraklat düğmeleri mor ve lavanta temalarıyla uyumludur."
  ]
},
{
  "surum": "2.4.7",
  "tarih": "2026-10-09",
  "baslik": "Spotify kütüphanesi",
  "notlar": [
    "🎧 Kaydedilen ve oluşturulan Spotify listeleri oynatıcının üstüne taşındı. İlk 50 listenin ardından Daha fazla liste ile devam edilebilir. Liste yükleme hataları ve yanlış hesap durumu daha açık gösterilir."
  ]
},
{
  "surum": "2.4.6",
  "tarih": "2026-10-09",
  "baslik": "Spotify oynatıcı görünürlük düzeltmesi",
  "notlar": [
    "🎧 Şarkı adı, sanatçı ve süre yazılarının gece temasında kaybolması düzeltildi. Spotify kartı ve metinleri seçilen temaya birlikte uyum sağlar."
  ]
},
{
  "surum": "2.4.5",
  "tarih": "2026-10-09",
  "baslik": "Spotify hesabınla Luna içinde dinle",
  "notlar": ["🎧 Spotify hesabınla güvenli giriş, kendi çalma listelerin ve Luna içinde Premium oynatıcı eklendi. Oynatıcıyı açarak şarkıları başlatabilir, duraklatabilir ve değiştirebilirsin."]
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


