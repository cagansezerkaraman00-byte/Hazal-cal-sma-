/* YKS verisi: dersler, konular ve konu başına ortalama soru sayıları; alanlar; ilerleme hesapları.
   Soru sayıları ÖSYM'nin geçmiş yıllardaki sınavlarından derlenen konu dağılımı tablolarına dayanır
   (bkz. SOURCES). Ortalama = kaynakların doğrulanabildiği yılların ortalaması. */

const YKS = (() => {
  // __DATA_START__
  const SUBJECTS = {
    tyt_tr: { exam: "TYT", name: "TYT Türkçe", short: "Türkçe", total: 40, topics: [
      { name: "Sözcükte Anlam" },
      { name: "Cümlede Anlam" },
      { name: "Paragrafta Anlam" },
      { name: "Anlatım Biçimleri" },
      { name: "Ses Bilgisi" },
      { name: "Yazım Kuralları" },
      { name: "Noktalama İşaretleri" },
      { name: "Sözcükte Yapı" },
      { name: "Sözcük Türleri" },
      { name: "Edat-Bağlaç-Ünlem" },
      { name: "Fiiller" },
      { name: "Ek Fiil" },
      { name: "Fiilde Çatı" },
      { name: "Fiilimsi" },
      { name: "Cümlenin Öğeleri" },
      { name: "Cümle Türleri" },
      { name: "Anlatım Bozuklukları" },
    ] },
    tyt_mat: { exam: "TYT", name: "TYT Matematik", short: "Matematik", total: 30, topics: [
      { name: "Sayılar" },
      { name: "Sayı Basamakları" },
      { name: "Bölme ve Bölünebilme" },
      { name: "OBEB-OKEK" },
      { name: "Rasyonel Sayılar" },
      { name: "Basit Eşitsizlikler" },
      { name: "Mutlak Değer" },
      { name: "Üslü Sayılar" },
      { name: "Köklü Sayılar" },
      { name: "Çarpanlara Ayırma" },
      { name: "Oran Orantı" },
      { name: "Denklem Çözme" },
      { name: "Problemler" },
      { name: "Kümeler" },
      { name: "Fonksiyonlar" },
      { name: "Permütasyon" },
      { name: "Kombinasyon" },
      { name: "Binom" },
      { name: "Olasılık" },
      { name: "İstatistik" },
      { name: "2. Dereceden Denklemler" },
      { name: "Karmaşık Sayılar" },
      { name: "Polinomlar" },
    ] },
    tyt_geo: { exam: "TYT", name: "TYT Geometri", short: "Geometri", total: 10, topics: [
      { name: "Doğruda ve Üçgende Açılar" },
      { name: "Üçgende Açı-Kenar Bağıntıları" },
      { name: "Üçgende Benzerlik" },
      { name: "Üçgende Açıortay-Kenarortay" },
      { name: "Dik Üçgen" },
      { name: "İkizkenar Üçgen" },
      { name: "Eşkenar Üçgen" },
      { name: "Üçgende Alan" },
      { name: "Çokgenler" },
      { name: "Dörtgenler" },
      { name: "Yamuk-Paralelkenar" },
      { name: "Eşkenar Dörtgen" },
      { name: "Dikdörtgen" },
      { name: "Kare" },
      { name: "Deltoid" },
      { name: "Çemberde Açı" },
      { name: "Çemberde Uzunluk" },
      { name: "Dairenin Çevresi ve Alanı" },
      { name: "Doğrunun Analitik İncelenmesi" },
      { name: "Çemberin Analitik İncelenmesi" },
      { name: "Katı Cisimler" },
    ] },
    tyt_fiz: { exam: "TYT", name: "TYT Fizik", short: "Fizik", total: 7, topics: [
      { name: "Fizik Bilimine Giriş" },
      { name: "Madde ve Özellikleri" },
      { name: "Sıvıların Kaldırma Kuvveti" },
      { name: "Basınç" },
      { name: "Isı, Sıcaklık ve Genleşme" },
      { name: "Hareket ve Kuvvet" },
      { name: "Dinamik" },
      { name: "İş, Güç ve Enerji" },
      { name: "Elektrik" },
      { name: "Manyetizma" },
      { name: "Optik" },
    ] },
    tyt_kim: { exam: "TYT", name: "TYT Kimya", short: "Kimya", total: 7, topics: [
      { name: "Kimya Bilimi" },
      { name: "Atom ve Yapısı" },
      { name: "Periyodik Sistem" },
      { name: "Kimyasal Türler Arası Etkileşimler" },
      { name: "Asitler-Bazlar ve Tuzlar" },
      { name: "Doğa ve Kimya" },
      { name: "Kimyasal Tepkimeler" },
      { name: "Kimyanın Temel Yasaları" },
      { name: "Maddenin Halleri" },
      { name: "Karışımlar" },
      { name: "Endüstride ve Canlılarda Enerji" },
      { name: "Kimya Her Yerde" },
    ] },
    tyt_bio: { exam: "TYT", name: "TYT Biyoloji", short: "Biyoloji", total: 6, topics: [
      { name: "Canlıların Ortak Özellikleri" },
      { name: "Canlıların Temel Bileşenleri" },
      { name: "Hücre ve Organelleri" },
      { name: "Hücre Zarından Madde Geçişi" },
      { name: "Canlıların Sınıflandırılması" },
      { name: "Mitoz ve Eşeysiz Üreme" },
      { name: "Mayoz ve Eşeyli Üreme" },
      { name: "Kalıtım" },
      { name: "Ekosistem Ekolojisi" },
      { name: "Güncel Çevre Sorunları" },
    ] },
    tyt_tar: { exam: "TYT", name: "TYT Tarih", short: "Tarih", total: 5, topics: [
      { name: "Tarih Bilimine Giriş" },
      { name: "Uygarlığın Doğuşu ve İlk Uygarlıklar" },
      { name: "İlk Türk Devletleri" },
      { name: "İslam Tarihi ve Uygarlığı" },
      { name: "Türk-İslam Devletleri" },
      { name: "Türklerin İslamiyeti Kabulü" },
      { name: "Türkiye Tarihi" },
      { name: "Beylikten Devlete (1300-1453)" },
      { name: "Dünya Gücü: Osmanlı Devleti" },
      { name: "Osmanlı Duraklama Dönemi" },
      { name: "Gerileme Devri (1699-1792)" },
      { name: "Arayış Yılları (17. Yüzyıl)" },
      { name: "Avrupa ve Osmanlı Devleti (18. Yüzyıl)" },
      { name: "En Uzun Yüzyıl (1800-1922)" },
      { name: "20. Yüzyıl Başlarında Osmanlı Devleti" },
      { name: "XIX. Yüzyılda Osmanlı Devleti" },
      { name: "1. Dünya Savaşı ve Milli Mücadeleye Hazırlık Dönemi" },
      { name: "Kurtuluş Savaşında Cepheler" },
      { name: "Türk İnkılabı" },
      { name: "Atatürkçülük ve Atatürk İlkeleri" },
      { name: "Türk Dış Politikası" },
    ] },
    tyt_cog: { exam: "TYT", name: "TYT Coğrafya", short: "Coğrafya", total: 5, topics: [
      { name: "İnsan ve Coğrafya" },
      { name: "Dünya'nın Şekli ve Hareketleri" },
      { name: "Harita Bilgisi" },
      { name: "Coğrafi Konum" },
      { name: "Dünya'nın Yapısı ve Oluşum Süreci" },
      { name: "Su Kaynakları-Toprak-Bitkiler" },
      { name: "İklim Bilgisi" },
      { name: "Nüfus-Türkiye'de Nüfus" },
      { name: "Göç" },
      { name: "Ekonomik Faaliyetler" },
      { name: "Ülkeler ve Bölgeler" },
      { name: "Çevre ve Toplum" },
    ] },
    tyt_fel: { exam: "TYT", name: "TYT Felsefe", short: "Felsefe", total: 5, topics: [
      { name: "Felsefenin Alanı" },
      { name: "Bilgi Felsefesi" },
      { name: "Bilim Felsefesi" },
      { name: "Varlık Felsefesi" },
      { name: "Ahlak Felsefesi" },
      { name: "Siyaset Felsefesi" },
      { name: "Sanat Felsefesi" },
      { name: "Din Felsefesi" },
    ] },
    tyt_din: { exam: "TYT", name: "TYT Din Kültürü", short: "Din Kültürü", total: 5, topics: [
      { name: "İnsan ve Din (İnanç)" },
      { name: "İbadet" },
      { name: "Hz. Muhammed'in Hayatı" },
      { name: "Vahiy ve Akıl" },
      { name: "İslam Düşüncesi ve Yorumu" },
      { name: "İslamda Değerler, Sanat ve Laiklik" },
      { name: "Yaşayan Dinler" },
    ] },
    ayt_mat: { exam: "AYT", name: "AYT Matematik", short: "Matematik", total: 30, topics: [
      { name: "Temel Kavramlar" },
      { name: "Sayı Basamakları" },
      { name: "Bölme ve Bölünebilme" },
      { name: "EBOB-EKOK" },
      { name: "Rasyonel Sayılar" },
      { name: "Basit Eşitsizlikler" },
      { name: "Mutlak Değer" },
      { name: "Üslü Sayılar" },
      { name: "Köklü Sayılar" },
      { name: "Çarpanlara Ayırma" },
      { name: "Oran Orantı" },
      { name: "Denklem Çözme" },
      { name: "Problemler" },
      { name: "Kümeler" },
      { name: "Kartezyen Çarpım" },
      { name: "Mantık" },
      { name: "Fonksiyonlar" },
      { name: "Polinomlar" },
      { name: "2. Dereceden Denklemler" },
      { name: "Permütasyon ve Kombinasyon" },
      { name: "Binom ve Olasılık" },
      { name: "İstatistik" },
      { name: "Karmaşık Sayılar" },
      { name: "2. Dereceden Eşitsizlikler" },
      { name: "Parabol" },
      { name: "Trigonometri" },
      { name: "Logaritma" },
      { name: "Diziler" },
      { name: "Limit" },
      { name: "Türev" },
      { name: "İntegral" },
    ] },
    ayt_geo: { exam: "AYT", name: "AYT Geometri", short: "Geometri", total: 10, topics: [
      { name: "Doğruda ve Üçgende Açılar" },
      { name: "Dik ve Özel Üçgenler" },
      { name: "Dik Üçgende Trigonometrik Bağıntılar" },
      { name: "İkizkenar ve Eşkenar Üçgen" },
      { name: "Üçgende Alanlar" },
      { name: "Üçgende Açıortay Bağıntıları" },
      { name: "Üçgende Kenarortay Bağıntıları" },
      { name: "Üçgende Eşlik ve Benzerlik" },
      { name: "Üçgende Açı-Kenar Bağıntıları" },
      { name: "Çokgenler" },
      { name: "Dörtgenler" },
      { name: "Yamuk" },
      { name: "Paralelkenar" },
      { name: "Eşkenar Dörtgen - Deltoid" },
      { name: "Dikdörtgen" },
      { name: "Çemberde Açılar" },
      { name: "Çemberde Uzunluk" },
      { name: "Daire" },
      { name: "Prizmalar" },
      { name: "Piramitler" },
      { name: "Küre" },
      { name: "Koordinat Düzlemi ve Noktanın Analitiği" },
      { name: "Doğrunun Analitiği" },
      { name: "Tekrar Eden, Dönen ve Yansıyan Şekiller" },
      { name: "Dönüşümlerle Geometri" },
      { name: "Trigonometri" },
      { name: "Çemberin Analitiği" },
    ] },
    ayt_fiz: { exam: "AYT", name: "AYT Fizik", short: "Fizik", total: 14, topics: [
      { name: "Vektörler" },
      { name: "Kuvvet, Tork ve Denge" },
      { name: "Kütle Merkezi" },
      { name: "Basit Makineler" },
      { name: "Hareket" },
      { name: "Newton'un Hareket Yasaları" },
      { name: "İş, Güç ve Enerji II" },
      { name: "Atışlar" },
      { name: "İtme ve Momentum" },
      { name: "Elektrik Alan ve Potansiyel" },
      { name: "Paralel Levhalar ve Sığa" },
      { name: "Manyetik Alan ve Manyetik Kuvvet" },
      { name: "İndüksiyon, Alternatif Akım ve Transformatörler" },
      { name: "Çembersel Hareket" },
      { name: "Kütle Çekim ve Kepler Yasaları" },
      { name: "Basit Harmonik Hareket" },
      { name: "Dalga Mekaniği ve Elektromanyetik Dalgalar" },
      { name: "Atom Modelleri" },
      { name: "Büyük Patlama ve Radyoaktivite" },
      { name: "Modern Fizik" },
      { name: "Modern Fiziğin Teknolojideki Uygulamaları" },
    ] },
    ayt_kim: { exam: "AYT", name: "AYT Kimya", short: "Kimya", total: 13, topics: [
      { name: "Modern Atom Teorisi" },
      { name: "Gazlar" },
      { name: "Sıvı Çözeltiler ve Çözünürlük" },
      { name: "Kimyasal Tepkimelerde Enerji" },
      { name: "Tepkimelerde Hız ve Denge" },
      { name: "Kimya ve Elektrik" },
      { name: "Karbon Kimyası" },
      { name: "Organik Kimya" },
      { name: "Enerji Kaynakları ve Bilimsel Gelişmeler" },
    ] },
    ayt_bio: { exam: "AYT", name: "AYT Biyoloji", short: "Biyoloji", total: 13, topics: [
      { name: "Sinir Sistemi" },
      { name: "Endokrin Sistem" },
      { name: "Duyu Organları" },
      { name: "Destek ve Hareket Sistemi" },
      { name: "Sindirim Sistemi" },
      { name: "Dolaşım ve Bağışıklık Sistemi" },
      { name: "Solunum Sistemi" },
      { name: "Üriner Sistem" },
      { name: "Üreme Sistemi ve Embriyonik Gelişim" },
      { name: "Komünite ve Popülasyon Ekolojisi" },
      { name: "Nükleik Asitler" },
      { name: "Genetik Şifre ve Protein Sentezi" },
      { name: "Canlılık ve Enerji" },
      { name: "Fotosentez ve Kemosentez" },
      { name: "Hücresel Solunum" },
      { name: "Bitki Biyolojisi" },
      { name: "Canlılar ve Çevre" },
    ] },
    ayt_edb: { exam: "AYT", name: "AYT Türk Dili ve Edebiyatı", short: "Edebiyat", total: 24, topics: [
      { name: "Anlam Bilgisi", d: "Sözcükte, Cümlede, Paragrafta Anlam", avg: 5.1, y: [6, 6, 6] },
      { name: "Divan Edebiyatı", avg: 4.3, y: [3, 4, 5] },
      { name: "Cumhuriyet Dönemi Türk Edebiyatı", avg: 3, y: [2, 3, 2] },
      { name: "Şiir Bilgisi", d: "Nazım Birimi, Ölçü, Kafiye", avg: 2.8, y: [3, 2, 3] },
      { name: "Halk Edebiyatı", d: "Halk Hikâyesi, Destan, Geleneksel Türk Tiyatrosu dahil", avg: 1.6, y: [2, 1, 2] },
      { name: "Tanzimat Edebiyatı", avg: 1.5, y: [1, 1, 1] },
      { name: "Edebi Sanatlar", d: "Söz Sanatları", avg: 1.4, y: [1, 2, 1] },
      { name: "Servet-i Fünun ve Fecr-i Ati Edebiyatı", avg: 1.1, y: [1, 1, 1] },
      { name: "Milli Edebiyat", avg: 1, y: [1, 1, 1] },
      { name: "Batı Edebiyatı Akımları", avg: 1, y: [1, 1, 1] },
      { name: "İslamiyet Öncesi ve Geçiş Dönemi Türk Edebiyatı", avg: 0.8, y: [1, 1, 0] },
      { name: "Metin Türleri", d: "Edebi Türler / Nesir Bilgisi", avg: 0.5, y: [2, 1, 1] },
    ] },
    ayt_tar1: { exam: "AYT", name: "AYT Tarih-1", short: "Tarih-1", total: 10, topics: [
      { name: "Milli Mücadele", avg: 2.4, y: [2, 2, 3] },
      { name: "İslam Medeniyetinin Doğuşu", avg: 1.2, y: [1, 1, 2] },
      { name: "İlk ve Orta Çağlarda Türk Dünyası", avg: 1, y: [1, 1, 1] },
      { name: "XX. Yüzyıl Başlarında Osmanlı Devleti ve Dünya", avg: 1, y: [1, 1, 1] },
      { name: "İnsanlığın İlk Dönemleri", avg: 0.8, y: [1, 1, 1] },
      { name: "Beylikten Devlete Osmanlı", d: "Siyaset, Savaşçılar ve Askerler, Medeniyet", avg: 0.8, y: [1, 1, 0] },
      { name: "Dünya Gücü Osmanlı ve Klasik Çağ", d: "Merkez Teşkilatı, Toplum Düzeni", avg: 0.6, y: [0, 0, 1] },
      { name: "Osmanlı'da Değişim ve Modernleşme", d: "1595-1914: Değişen Dünya Dengeleri, Denge Stratejisi, Devrimler Çağı", avg: 0.6, y: [1, 1, 1] },
      { name: "Türklerin İslamiyet'i Kabulü ve İlk Türk-İslam Devletleri", avg: 0.4, y: [0, 1, 0] },
      { name: "Yerleşme ve Devletleşme Sürecinde Selçuklu Türkiyesi", avg: 0.4, y: [1, 0, 0] },
      { name: "Atatürkçülük ve Türk İnkılabı", avg: 0.4, y: [0, 1, 0] },
      { name: "Tarih ve Zaman", avg: 0.2, y: [0, 0, 0] },
      { name: "Çağdaş Türk ve Dünya Tarihi", d: "İki Savaş Arası Dönem ve sonrası", avg: 0.2, y: [1, 0, 0] },
    ] },
    ayt_cog1: { exam: "AYT", name: "AYT Coğrafya-1", short: "Coğrafya-1", total: 6, topics: [
      { name: "Çevre Sorunları ve Çözüm Yaklaşımları", d: "Geri Dönüşüm, Sürdürülebilirlik", avg: 1.1, y: [0, 3, 1] },
      { name: "Ekstrem Doğa Olayları", avg: 0.6, y: [0, 0, 1] },
      { name: "Şehirler ve Kırsal Yerleşmeler", avg: 0.6, y: [1, 0, 1] },
      { name: "Doğal Kaynaklar ve Türkiye'de Ekonomik Faaliyetler", d: "Tarım, Sanayi, Maden, Enerji", avg: 0.6, y: [1, 0, 1] },
      { name: "Küreselleşen Dünya ve Uluslararası Örgütler", avg: 0.5, y: [0, 0, 1] },
      { name: "Ekosistemlerin Özellikleri ve İşleyişi", d: "Küresel İklim Değişikliği dahil", avg: 0.4, y: [1, 0, 1] },
      { name: "Ekonomi, Şehirleşme ve Göç", avg: 0.4, y: [0, 1, 0] },
      { name: "Türkiye'de Turizm", avg: 0.4, y: [1, 0, 0] },
      { name: "Kültür Bölgeleri ve Türk Kültürü", avg: 0.4, y: [1, 1, 0] },
      { name: "Jeopolitik Konum ve Ülkeler Arası Etkileşim", avg: 0.4, y: [1, 0, 0] },
      { name: "Nüfus Politikaları ve Projeksiyonları", avg: 0.3, y: [0, 1, 0] },
      { name: "Hizmet Sektörü, Ulaşım ve Ticaret", avg: 0.3, y: [0, 0, 0] },
      { name: "İşlevsel Bölgeler ve Kalkınma Projeleri", avg: 0.1, y: [0, 0, 0] },
    ] },
    ayt_tar2: { exam: "AYT", name: "AYT Tarih-2", short: "Tarih-2", total: 11, topics: [
      { name: "Milli Mücadele", avg: 2.1, y: [2, 2, 3] },
      { name: "Osmanlı Kuruluş ve Klasik Dönem", d: "Beylikten Devlete, Dünya Gücü Osmanlı, Teşkilat", avg: 1.9, y: [0, 1, 2] },
      { name: "Osmanlı'da Değişim ve Modernleşme", d: "17.-19. yy, Denge Stratejisi, Devrimler Çağı", avg: 1.9, y: [3, 2, 2] },
      { name: "Tarih ve Zaman / İnsanlığın İlk Dönemleri", avg: 1, y: [1, 1, 1] },
      { name: "İlk ve Orta Çağlarda Türk Dünyası", avg: 1, y: [1, 1, 1] },
      { name: "Atatürkçülük ve Türk İnkılabı", avg: 1, y: [1, 1, 0] },
      { name: "İslam Medeniyeti, Türk-İslam Devletleri ve Selçuklu Türkiyesi", avg: 0.9, y: [1, 1, 1] },
      { name: "XX. Yüzyıl Başlarında Osmanlı Devleti ve Dünya", avg: 0.7, y: [1, 1, 1] },
      { name: "Çağdaş Türk ve Dünya Tarihi", d: "İki Savaş Arası, II. Dünya Savaşı, Soğuk Savaş, Küreselleşme", avg: 0.6, y: [1, 1, 0] },
    ] },
    ayt_cog2: { exam: "AYT", name: "AYT Coğrafya-2", short: "Coğrafya-2", total: 11, topics: [
      { name: "Çevre Sorunları ve Çözüm Yaklaşımları", avg: 1.6, y: [3, 1, 1] },
      { name: "Küreselleşen Dünya ve Uluslararası Örgütler", avg: 1.3, y: [1, 1, 1] },
      { name: "Ekosistemlerin Özellikleri ve İşleyişi", avg: 1.1, y: [1, 2, 1] },
      { name: "Türkiye'de Tarım, Sanayi, Maden ve Enerji Kaynakları", avg: 0.9, y: [0, 1, 2] },
      { name: "Ekonomi, Şehirleşme ve Göç", avg: 0.8, y: [0, 1, 1] },
      { name: "İşlevsel Bölgeler ve Kalkınma Projeleri", avg: 0.8, y: [1, 1, 0] },
      { name: "Küresel İklim Değişikliği", avg: 0.6, y: [0, 0, 1] },
      { name: "Şehirler ve Kırsal Yerleşmeler", avg: 0.6, y: [0, 2, 0] },
      { name: "Dünyada Doğal Kaynak ve Ekonomi", avg: 0.6, y: [1, 0, 0] },
      { name: "Jeopolitik Konum ve Ülkeler Arası Etkileşim", avg: 0.6, y: [1, 1, 0] },
      { name: "Ekstrem Doğa Olayları", avg: 0.5, y: [0, 1, 1] },
      { name: "Nüfus Politikaları ve Projeksiyonları", avg: 0.5, y: [1, 0, 1] },
      { name: "Türkiye'de Turizm", avg: 0.5, y: [1, 0, 1] },
      { name: "Kültür Bölgeleri ve Türk Kültürü", avg: 0.5, y: [1, 0, 1] },
      { name: "Hizmet Sektörü ve Ulaşım", avg: 0.1, y: [0, 0, 0] },
    ] },
    ayt_fel: { exam: "AYT", name: "AYT Felsefe Grubu", short: "Felsefe Grubu", total: 12, topics: [
      { name: "Felsefe", d: "Felsefenin Temel Konuları ve Problemleri, MÖ 6. yy-20. yy Felsefe Tarihi", avg: 3, y: [3, 3, 3] },
      { name: "Psikoloji", d: "Psikoloji Bilimini Tanıyalım, Temel Süreçler, Öğrenme-Bellek-Düşünme, Ruh Sağlığının Temelleri", avg: 3, y: [3, 3, 3] },
      { name: "Sosyoloji", d: "Sosyolojiye Giriş, Birey ve Toplum, Toplumsal Yapı, Toplumsal Değişme, Toplum ve Kültür, Toplumsal Kurumlar", avg: 3, y: [3, 3, 3] },
      { name: "Mantık", d: "Mantığa Giriş, Klasik Mantık, Sembolik Mantık, Mantık ve Dil", avg: 3, y: [3, 3, 3] },
    ] },
    ayt_din: { exam: "AYT", name: "AYT Din Kültürü", short: "Din Kültürü", total: 6, topics: [
      { name: "İslam, Bilim ve Medeniyet", d: "İslam ve Bilim, Anadolu'da İslam, Gönül Coğrafyamız", avg: 1.3, y: [2, 0, 3] },
      { name: "İnanç", d: "Allah-İnsan İlişkisi, İnançla İlgili Meseleler, Dünya ve Ahiret", avg: 1.2, y: [0, 2, 0] },
      { name: "İbadet ve Ahlak", d: "İslam ve İbadet, Ahlaki Tutum ve Davranışlar", avg: 1, y: [1, 1, 2] },
      { name: "Kur'an ve Hz. Muhammed", d: "Kur'an'a Göre Hz. Muhammed, Hz. Muhammed ve Gençlik, Kur'an'da Bazı Kavramlar", avg: 1, y: [1, 2, 0] },
      { name: "İslam Düşüncesinde Yorumlar", d: "İtikadi, Siyasi, Fıkhi ve Tasavvufi", avg: 0.7, y: [0, 1, 0] },
      { name: "Din ve Hayat / Güncel Dini Meseleler", avg: 0.5, y: [2, 0, 0] },
      { name: "Dünya Dinleri", d: "Yahudilik ve Hristiyanlık, Hint ve Çin Dinleri", avg: 0.3, y: [0, 0, 1] },
    ] },
    ydt: { exam: "YDT", name: "YDT İngilizce", short: "İngilizce", total: 80, topics: [
      { name: "Paragraf", d: "Okuma", avg: 15, y: [15, 15, 15] },
      { name: "Dil Bilgisi", avg: 10, y: [10, 10, 10] },
      { name: "Cümle Tamamlama", avg: 8, y: [8, 8, 8] },
      { name: "İngilizce-Türkçe Çeviri", avg: 6, y: [6, 6, 6] },
      { name: "Türkçe-İngilizce Çeviri", avg: 6, y: [6, 6, 6] },
      { name: "Kelime Bilgisi", avg: 5, y: [5, 5, 5] },
      { name: "Cloze Test", avg: 5, y: [5, 5, 5] },
      { name: "Diyalog Tamamlama", avg: 5, y: [5, 5, 5] },
      { name: "Anlamca Yakın Cümle", avg: 5, y: [5, 5, 5] },
      { name: "Duruma Uygun İfade", avg: 5, y: [5, 5, 5] },
      { name: "Paragraf Tamamlama", avg: 5, y: [5, 5, 5] },
      { name: "Anlam Bütünlüğünü Bozan Cümle", avg: 5, y: [5, 5, 5] },
    ] },
  };
  const SOURCES = ["https://ertansinansahin.com/tyt-ve-ayt-fizik-konulari-ve-soru-dagilimi/", "https://ertansinansahin.com/tyt-fizik-konulari-ve-soru-dagilimi/", "https://www.rehberimsensin.com/tyt-fizik-konulari-ve-soru-dagilimi", "https://kunduz.com/tr/blog/2021-yks-fizik-konulari-2020-yks-fizik-soru-dagilimi-275803/", "https://egitim.com/lise/tyt-fizik-konulari-ve-soru-dagilimi", "https://fizikozeldersin.com/pages/blog/tyt-2025-fizik-cikan-konular", "https://dogrutercihler.com/2023-tyt-fizik-konulari-ve-soru-dagilimi/", "https://www.xyzakademi.com.tr/tyt-kimya-soru-dagilimi/", "https://www.rehberimsensin.com/tyt-kimya-konulari-ve-soru-dagilimi", "https://kunduz.com/tr/blog/2021-tyt-kimya-konulari-tyt-kimya-soru-dagilimi-272150/", "https://www.ozeldersalani.com/tyt-kimya-konulari-ve-soru-dagilimlari", "https://egitim.com/lise/tyt-kimya-konulari-ve-soru-dagilimi", "https://www.rehberimsensin.com/tyt-biyoloji-konulari-ve-soru-dagilimi", "https://www.unirehberi.com/tyt-biyoloji-konulari/", "https://ykskocum.com/tyt-biyoloji-konulari/", "https://www.milliyet.com.tr/gundem/tyt-biyoloji-konulari-ve-soru-dagilimi-2024-tytde-biyoloji-dersinden-hangi-konular-var-6267878", "https://rehberpanda.com/rehberler/yks/soru-dagilimi/tyt-tarih/", "https://universitenitanit.com/makale/oku/tyt-tarih-konulari-ve-soru-dagilimi-yks", "https://www.rehberimsensin.com/tyt-tarih-konulari-ve-soru-dagilimi", "https://unikazan.com/blog/tyt-tarih-konulari-2026/", "https://rehberpanda.com/rehberler/yks/soru-dagilimi/tyt-cografya/", "https://universitenitanit.com/makale/oku/tyt-cografya-konulari-ve-soru-dagilimi-yks", "https://www.rehberimsensin.com/tyt-cografya-konulari-ve-soru-dagilimi", "https://unikazan.com/blog/tyt-cografya-konulari-2026/", "https://unikazan.com/blog/tyt-felsefe-konulari-2026/", "https://egitim.com/lise/tyt-felsefe-konulari-ve-soru-dagilimi", "https://www.ozeldersalani.com/tyt-felsefe-konulari-felsefe-soru-dagilimi", "https://universitenitanit.com/makale/oku/tyt-felsefe-konulari-ve-soru-dagilimi-yks", "https://rehberpanda.com/rehberler/yks/soru-dagilimi/tyt-din-kulturu/", "https://okulsecim.com/blog/yks-konulari/tyt-din-kulturu-konulari-ve-soru-dagilimi", "https://www.rehberimsensin.com/tyt-din-kulturu-konulari-ve-soru-dagilim", "https://www.tahtaapp.com/blog/yks/tyt-soru-dagilimi", "https://unikazan.com/blog/yks-2027de-neler-degiscek-meb-son-aciklamalar-guncel-rehber/", "https://dogrutercihler.com/tyt-turkce-konu-ve-soru-dagilimi/", "https://www.unirehberi.com/tyt-turkce-konulari/", "https://www.bilgenc.com/tyt-turkce-konulari/", "https://www.rehberimsensin.com/tyt-turkce-konulari-ve-soru-dagilimi", "https://unikazan.com/blog/tyt-turkce-konulari-2026/", "https://www.ozeldersalani.com/tyt-turkce-konulari-ve-tyt-turkce-soru-dagilimi", "https://dogrutercihler.com/tyt-matematik-konu-ve-soru-dagilimi/", "https://www.unirehberi.com/tyt-matematik-konulari/", "https://www.kitapsec.com/blog/2025-tyt-sinavi-matematik-konulari-114.html", "https://askakitap.com/blog/tyt-matematik-konulari", "https://www.thekoc.net/service/tyt-matematik", "https://www.bilgenc.com/tyt-matematik-konulari/", "https://www.rehberimsensin.com/tyt-matematik-konulari-ve-soru-dagilimi", "https://dogrutercihler.com/tyt-geometri-konu-ve-soru-dagilimi/", "https://www.bilgenc.com/tyt-geometri-konulari/", "https://www.unirehberi.com/tyt-geometri-konulari/", "https://egitim.com/lise/tyt-geometri-konulari-ve-soru-dagilimi", "https://www.rehberimsensin.com/tyt-geometri-konulari-ve-soru-dagilimi", "https://www.basarisiralamalari.com/yks-ayt-kimya-konulari-ve-soru-dagilimi/", "https://www.unirehberi.com/ayt-kimya-konulari-yks/", "https://miletakademi.net/blog/ayt-kimya-konulari-ve-ayt-kimya-soru-dagilimi", "https://dogrutercihler.com/2024-ayt-kimya-konulari-ve-soru-dagilimi/", "https://universitenitanit.com/makale/oku/ayt-kimya-konulari-ve-soru-dagilimi-yks", "https://www.ozeldersalani.com/ayt-kimya-konulari-ve-soru-dagilimlari", "https://www.basarisiralamalari.com/yks-ayt-biyoloji-konulari-ve-soru-dagilimi/", "https://www.unirehberi.com/ayt-biyoloji-konulari-yks/", "https://miletakademi.net/blog/ayt-biyoloji-konulari", "https://universitenitanit.com/makale/oku/ayt-biyoloji-konulari-ve-soru-dagilimi-yks", "https://dogrutercihler.com/2024-ayt-biyoloji-konulari-ve-soru-dagilimi/", "https://www.fuzem.com/ayt-2025-soru-dagilimi-hazirlik", "https://unikazan.com/blog/ayt-matematik-konulari-2026/", "https://www.bilgenc.com/ayt-matematik-konulari/", "https://www.xyzakademi.com.tr/ayt-soru-dagilimi/", "https://askakitap.com/blog/ayt-matematik-konulari", "https://askakitap.com/blog/ayt-matematikte-en-cok-cikan-konular", "https://www.kitapsec.com/blog/2026-ayt-matematik-konulari-134.html", "https://dogrutercihler.com/2024-ayt-matematik-konulari-ve-soru-dagilimi/", "https://dogrutercihler.com/2024-ayt-geometri-konulari-ve-soru-dagilimi/", "https://www.superprof.com.tr/blog/ayt-geometri-soru-dagilimi/", "https://benimkocum.net/2025-ayt-geometri-konulari-ve-soru-dagilimi/", "https://www.bilgenc.com/ayt-fizik-konulari/", "https://unikazan.com/blog/ayt-fizik-konulari-2026/", "https://www.xyzakademi.com.tr/ayt-fizik-soru-dagilimi/", "https://askakitap.com/blog/ayt-fizik-konulari", "https://www.unirehberi.com/ayt-fizik-konulari-yks/", "https://ertansinansahin.com/ayt-fizik-konulari-ve-soru-dagilimi/", "https://www.alzeyayinlari.com/mod/page/view.php?id=2087", "https://www.meb.gov.tr/2023-lgsde-8-sinifin-yksde-12-sinifin-ikinci-donem-konulari-sinav-kapsamina-dahil-olmayacak/haber/29003/tr", "https://www.bilgenc.com/ayt-edebiyat-konulari/", "https://www.bilgenc.com/ayt-tarih-1-konulari/", "https://www.bilgenc.com/ayt-tarih-2-konulari/", "https://www.bilgenc.com/ayt-cografya-1-konulari/", "https://www.bilgenc.com/ayt-cografya-2-konulari/", "https://www.bilgenc.com/ayt-felsefe-grubu-konulari/", "https://www.bilgenc.com/ayt-din-kulturu-konulari/", "https://www.bilgenc.com/yks-sosyal-bilimler-2-nedir/", "https://www.basarisiralamalari.com/yks-ayt-cografya-2-konulari-ve-soru-dagilimi/", "https://www.basarisiralamalari.com/yks-ayt-tarih-1-konulari-ve-soru-dagilimlariosym-meb/", "https://www.basarisiralamalari.com/yks-din-kulturu-konulari-ve-soru-dagilimi/", "https://ykskocum.com/ayt-tarih-2-konulari/", "https://ykssayac.com/ayt-edebiyat-soru-dagilimi/", "https://rehberpanda.com/rehberler/yks/soru-dagilimi/ayt-edebiyat/", "https://mentorozelders.com/blog/sinav-hazirlik/ayt-edebiyat-soru-dagilimi/", "https://www.kocumbe.com/konu-dagilimlari/ayt/edebiyat", "https://dogrutercihler.com/2023-ayt-edebiyat-konulari-ve-soru-dagilimi/", "https://rokethazirlik.com/ayt-felsefe-grubu-konulari-ve-soru-dagilimi", "https://rehberpanda.com/rehberler/yks/soru-dagilimi/ayt-felsefe/", "https://www.ekonomist.com.tr/egitim/yks-2025-ayt-sorulari-nasildi-uzman-yorumlari-61465", "https://tarihvakti.com/2025-ayt-tarih-sorulari-ve-cevaplari/", "https://www.ozeldersalani.com/ydt-ingilizce-konulari-ve-soru-dagilimi", "https://www.aladilakademisi.com/ydt-sinavi-suresi/", "https://kunduz.com/tr/blog/ydt-konulari-ingilizce-soru-dagilimi-283248/"];
  const EXAMS = {"TYT": {"minutes": 165, "questions": 120}, "AYT": {"minutes": 180, "questions": 160}, "YDT": {"minutes": 120, "questions": 80}};
  const DEFAULT_DATE = "2027-06-19";
  const DATE_NOTE = "Tahmini tarih. ÖSYM 2027 takvimini açıklayınca burası kendiliğinden güncellenir.";
  const GUIDANCE = {"dailyRoutines": ["Her gün 20-30 paragraf sorusu çöz, süre tut. Sınava yaklaştıkça 30-40'a çıkar.", "Her gün 20-30 matematik problemi çöz. Sayıdan çok düzen önemli: her gün 20 soru, haftada bir gün 150 sorudan daha etkili.", "Paragrafı sabah, zihnin en berrak olduğu saatte çöz.", "Günün ilk çalışma bloğunu en zor ya da en zayıf derse ayır.", "Her gün 15-20 dakika tekrar yap: önceki günlerin konularını kitaba bakmadan hatırlamaya çalış.", "Yanlış ve boş soruları hata defterine yaz, 1-3 gün sonra çözüme bakmadan yeniden çöz.", "50 dk çalışma + 10 dk mola ya da 25+5 Pomodoro bloklarıyla ilerle.", "Güne 3 net hedefle başla, gün sonunda 5 dakikada ne yaptığına bak.", "Her gün aynı saatte yat ve kalk. Sabah bloklarını sınav saatine (10:15) göre ayarla."], "weeklyStructure": ["Haftada 5 gün konu çalış ve soru çöz, 1 gün deneme ve analiz yap, 1 gün hafif tekrar ve dinlenmeye ayır.", "Aynı gün içinde TYT ve AYT derslerini dönüşümlü çalış (ör. sabah matematik, öğleden sonra edebiyat ya da fen).", "Haftada bir tekrar günü koy: o haftanın konularını kendini test ederek gözden geçir.", "Denemeyi sabah çöz, analizi aynı öğleden sonra ya da ertesi sabah yap.", "Yeni haftanın planını deneme analizine göre kur: en çok yanlış çıkan 2-3 konuya ek süre ver.", "Pazar akşamı 20-30 dakikada haftayı değerlendir, gelecek haftanın planını güncelle.", "Haftada en az yarım günü tamamen dinlenmeye ve kendine ayır."], "phases": [{"monthsLeft": ">8 ay", "focus": "Konu öğrenme dönemi. TYT temellerini sağlamlaştır (temel matematik, problemler, paragraf, dil bilgisi) ve 11. sınıf AYT konularına başla. Her konudan sonra bol soru çöz. Haftada 1 TYT denemesi yeterli."}, {"monthsLeft": "4-8 ay", "focus": "AYT konularını bitir, TYT'deki eksikleri kapat. Konu testlerinden karma testlere geç. Haftada 1-2 TYT denemesi, 2 haftada bir AYT denemesi çöz. Yanlış analizine göre konu tekrarı yap."}, {"monthsLeft": "2-4 ay", "focus": "Konular büyük ölçüde bitmiş olsun. Tekrar, ÖSYM çıkmış soruları ve zayıf konu kampları dönemi. Haftada 2-3 deneme (TYT + AYT) çöz, süre yönetimi ve soru seçme stratejisi geliştir."}, {"monthsLeft": "Son 2 ay", "focus": "Deneme, analiz ve hedefli tekrar dönemi. Haftada 3-4 deneme çöz, bazılarını sınav saatinde (10:15) çöz. Yeni kaynak alma, bildiğin kaynakları ve hata defterini tekrar et."}, {"monthsLeft": "Son 2 hafta", "focus": "Yeni konu çalışma. Özetleri, hata defterini ve sık hata yaptığın konuları tekrar et. Ritmi korumak için 2-3 deneme çöz, uyku ve beslenmeyi sınav saatine göre sabitle. Son 2-3 gün tempoyu düşür ve dinlen."}], "deneme": ["Deneme sıklığı döneme göre artar: konu döneminde haftada 1 TYT, karma dönemde 2, son 3 ayda 2-3, son ayda 3-4 (TYT + AYT).", "Denemeyi gerçek sınav gibi çöz: tek oturumda, süre tutarak, telefon kapalı, mümkünse 10:15'te.", "Her yanlışı ve boşu sınıflandır: bilmiyordum / yanlış yorum veya işlem / dikkat hatası / süre yetmedi.", "Yanlış ve boşları konu bazında listele (ör. TYT Matematik, Problemler: 2 yanlış). Bu liste haftanın önceliğini belirlesin.", "Ders bazında doğru, yanlış, boş, net ve süreyi bir tabloya kaydet.", "Tek denemeye takılma, son 3-4 denemenin ortalamasına ve gidişatına bak.", "Bir TYT denemesinin analizine yaklaşık 1-1,5 saat ayır. Analiz edilmeyen deneme net kazandırmaz.", "Az deneme ve iyi analiz, çok deneme ve analizsizlikten daha verimlidir.", "Çözemediğin soruları 3-7 gün sonra çözüme bakmadan yeniden dene."], "techniques": ["Aktif hatırlama: Okumak yerine kitabı kapat ve kendini test et, ya da boş kağıda konuyu baştan yaz. Dunlosky ve ark. (2013) bunu en yüksek faydalı teknikler arasında sayıyor.", "Aralıklı tekrar: Konuyu 1 gün, 3 gün, 1 hafta ve 1 ay sonra yeniden hatırla. Tek seferde yığmaktan çok daha kalıcıdır (yüksek fayda).", "Karma çalışma: Farklı konu ve soru tiplerini karıştır, özellikle matematikte karışık testler çöz. Soru tipini tanıma becerisi gelişir.", "Kendine açıklama (Feynman): Konuyu birine anlatır gibi kendi cümlelerinle açıkla. Takıldığın yer eksiğini gösterir.", "Uyku: Uyku öğrenileni kalıcı hale getirir. Ergenler için 8-10 saat öneriliyor (AASM/AAP). Uykusuz kalarak çalışmak verimi düşürür.", "Odaklı bloklar (Pomodoro): 25 dk çalış, 5 dk mola ver. 4 bloktan sonra 15-30 dk uzun mola ver. Telefonu başka odaya bırak.", "Yeniden okuma ve fosforlu kalemle altını çizme tek başına düşük fayda sağlar. Bunları test etmeyle birleştir.", "Hata defterini aralıklı tekrarla eşleştir: yanlış soruları belli aralıklarla yeniden çöz.", "Kısa yürüyüş ve egzersiz dikkati ve ruh halini destekler."], "wellbeing": ["Dinlenmek de planın parçası. Haftada en az yarım gün tamamen kendine ayır.", "Kendini başkalarıyla değil, geçen haftaki halinle kıyasla.", "Küçük ilerlemeleri kutla: 1 net artış da gerçek bir ilerlemedir.", "Kötü bir deneme bir yargı değil, bir veridir. Analiz et ve yoluna devam et.", "Planı esnek tut. Kaçan bir gün telafi edilebilir, plan suçluluk kaynağı değil rehberdir.", "Düzenli uyku, su ve dengeli öğünler enerjini korur. Kafeini akşam saatlerinde azalt.", "Her gün 20-30 dakika yürü ya da hareket et.", "Sosyal medyaya sınır koy, ekranı yatmadan 1 saat önce bırak.", "Gerildiğinde kutu nefesi dene: 4 sn al, 4 sn tut, 4 sn ver, 4 sn bekle.", "Aile, arkadaşlar ve hobilere zaman ayır. Bu ilişkiler motivasyonunu besler.", "Zorlandığında rehber öğretmeninle konuşmak bir güç göstergesidir."]};
  // __DATA_END__

  // Alanlara göre AYT dersleri (TYT herkes için ortak)
  const TYT_KEYS = ['tyt_tr', 'tyt_mat', 'tyt_geo', 'tyt_fiz', 'tyt_kim', 'tyt_bio', 'tyt_tar', 'tyt_cog', 'tyt_fel', 'tyt_din'];
  const FIELDS = {
    SAY: { name: 'Sayısal', short: 'SAY', ayt: ['ayt_mat', 'ayt_geo', 'ayt_fiz', 'ayt_kim', 'ayt_bio'] },
    EA: { name: 'Eşit Ağırlık', short: 'EA', ayt: ['ayt_mat', 'ayt_geo', 'ayt_edb', 'ayt_tar1', 'ayt_cog1'] },
    SOZ: { name: 'Sözel', short: 'SÖZ', ayt: ['ayt_edb', 'ayt_tar1', 'ayt_cog1', 'ayt_tar2', 'ayt_cog2', 'ayt_fel', 'ayt_din'] },
    DIL: { name: 'Dil', short: 'DİL', ayt: ['ydt'] },
  };

  // Sayaçta görünen çalışma dersleri: birden çok YKS dersini tek başlıkta toplar
  const C = { tr: '#ff8fb5', mat: '#ffb547', geo: '#ffd84d', fiz: '#6cc4ff', kim: '#a98bff', bio: '#5fd3a3', edb: '#ff9e7a', tar: '#d4a373', cog: '#7fc8a9', fel: '#c49bff', din: '#9fb4ff', sos: '#e0a3c8', fen: '#73d2c8', ing: '#7aa7ff' };
  const STUDY = {
    SAY: [
      { id: 'y_tr', name: 'Türkçe', color: C.tr, yks: ['tyt_tr'] },
      { id: 'y_mat', name: 'Matematik', color: C.mat, yks: ['tyt_mat', 'ayt_mat'] },
      { id: 'y_geo', name: 'Geometri', color: C.geo, yks: ['tyt_geo', 'ayt_geo'] },
      { id: 'y_fiz', name: 'Fizik', color: C.fiz, yks: ['tyt_fiz', 'ayt_fiz'] },
      { id: 'y_kim', name: 'Kimya', color: C.kim, yks: ['tyt_kim', 'ayt_kim'] },
      { id: 'y_bio', name: 'Biyoloji', color: C.bio, yks: ['tyt_bio', 'ayt_bio'] },
      { id: 'y_sos', name: 'Sosyal (TYT)', color: C.sos, yks: ['tyt_tar', 'tyt_cog', 'tyt_fel', 'tyt_din'] },
    ],
    EA: [
      { id: 'y_tr', name: 'Türkçe', color: C.tr, yks: ['tyt_tr'] },
      { id: 'y_mat', name: 'Matematik', color: C.mat, yks: ['tyt_mat', 'ayt_mat'] },
      { id: 'y_geo', name: 'Geometri', color: C.geo, yks: ['tyt_geo', 'ayt_geo'] },
      { id: 'y_edb', name: 'Edebiyat', color: C.edb, yks: ['ayt_edb'] },
      { id: 'y_tar', name: 'Tarih', color: C.tar, yks: ['tyt_tar', 'ayt_tar1'] },
      { id: 'y_cog', name: 'Coğrafya', color: C.cog, yks: ['tyt_cog', 'ayt_cog1'] },
      { id: 'y_feldin', name: 'Felsefe & Din (TYT)', color: C.fel, yks: ['tyt_fel', 'tyt_din'] },
      { id: 'y_fen', name: 'Fen (TYT)', color: C.fen, yks: ['tyt_fiz', 'tyt_kim', 'tyt_bio'] },
    ],
    SOZ: [
      { id: 'y_tr', name: 'Türkçe', color: C.tr, yks: ['tyt_tr'] },
      { id: 'y_edb', name: 'Edebiyat', color: C.edb, yks: ['ayt_edb'] },
      { id: 'y_tar', name: 'Tarih', color: C.tar, yks: ['tyt_tar', 'ayt_tar1', 'ayt_tar2'] },
      { id: 'y_cog', name: 'Coğrafya', color: C.cog, yks: ['tyt_cog', 'ayt_cog1', 'ayt_cog2'] },
      { id: 'y_fel', name: 'Felsefe Grubu', color: C.fel, yks: ['tyt_fel', 'ayt_fel'] },
      { id: 'y_din', name: 'Din Kültürü', color: C.din, yks: ['tyt_din', 'ayt_din'] },
      { id: 'y_mat', name: 'Matematik (TYT)', color: C.mat, yks: ['tyt_mat', 'tyt_geo'] },
      { id: 'y_fen', name: 'Fen (TYT)', color: C.fen, yks: ['tyt_fiz', 'tyt_kim', 'tyt_bio'] },
    ],
    DIL: [
      { id: 'y_ing', name: 'İngilizce (YDT)', color: C.ing, yks: ['ydt'] },
      { id: 'y_tr', name: 'Türkçe', color: C.tr, yks: ['tyt_tr'] },
      { id: 'y_mat', name: 'Matematik (TYT)', color: C.mat, yks: ['tyt_mat', 'tyt_geo'] },
      { id: 'y_sos', name: 'Sosyal (TYT)', color: C.sos, yks: ['tyt_tar', 'tyt_cog', 'tyt_fel', 'tyt_din'] },
      { id: 'y_fen', name: 'Fen (TYT)', color: C.fen, yks: ['tyt_fiz', 'tyt_kim', 'tyt_bio'] },
    ],
  };

  const st = () => Store.data.yks;

  // Konu kimliği: ders anahtarı + sadeleştirilmiş konu adı (kalıcı)
  function slug(t) {
    return t.toLocaleLowerCase('tr-TR')
      .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  const topicIndex = {};
  for (const key of Object.keys(SUBJECTS)) {
    const s = SUBJECTS[key];
    s.key = key;
    for (const t of s.topics) {
      t.id = key + ':' + slug(t.name);
      t.subjectKey = key;
      topicIndex[t.id] = t;
    }
  }

  // Konular 2.13'te Rehberlik Servisim TYT ve Sayısal AYT listesine göre yenilendi. Adı değişen eski konunun kimliği
  // yeni konuya yönlendirilir: eski plan maddeleri, deneme eksikleri ve eski işaretler kaybolmaz.
  // [eski ad, yeni ad, (başka dersteyse) yeni dersin anahtarı]
  const RENAMED = {
    tyt_tr: [['Paragraf', 'Paragrafta Anlam'], ['Sözcükte Yapı ve Ekler', 'Sözcükte Yapı'], ['Anlatım Bozukluğu', 'Anlatım Bozuklukları']],
    tyt_mat: [['Temel Kavramlar', 'Sayılar'], ['Permütasyon ve Kombinasyon', 'Permütasyon'], ['Kümeler ve Kartezyen Çarpım', 'Kümeler'], ['Veri ve İstatistik', 'İstatistik'], ['EBOB-EKOK', 'OBEB-OKEK'], ['Mantık', 'Mantık', 'ayt_mat']],
    tyt_geo: [['Açılar ve Üçgenler', 'Doğruda ve Üçgende Açılar'], ['Yamuk', 'Yamuk-Paralelkenar'], ['Analitik Geometri', 'Doğrunun Analitik İncelenmesi'], ['Çember ve Daire', 'Çemberde Açı'], ['Paralelkenar, Eşkenar Dörtgen ve Deltoid', 'Eşkenar Dörtgen']],
    tyt_fiz: [['Elektrik Akımı, Devreler ve Manyetizma', 'Elektrik'], ['Kaldırma Kuvveti', 'Sıvıların Kaldırma Kuvveti'], ['Elektrostatik', 'Elektrik']],
    tyt_kim: [['Atom ve Atomun Yapısı', 'Atom ve Yapısı'], ['Kimyanın Temel Kanunları', 'Kimyanın Temel Yasaları'], ['Kimyasal Hesaplamalar', 'Kimyasal Tepkimeler']],
    tyt_bio: [['Canlıların Sınıflandırılması ve Biyoçeşitlilik', 'Canlıların Sınıflandırılması'], ['Hücre Bölünmeleri ve Üreme', 'Mitoz ve Eşeysiz Üreme'], ['Ekosistem Ekolojisi ve Güncel Çevre Sorunları', 'Ekosistem Ekolojisi'], ['Hücre, Organeller ve Madde Geçişleri', 'Hücre ve Organelleri']],
    tyt_tar: [['Milli Mücadele', 'Kurtuluş Savaşında Cepheler'], ['İlk ve Orta Çağlarda Türk Dünyası', 'İlk Türk Devletleri'], ['İslam Medeniyetinin Doğuşu ve İlk Türk-İslam Devletleri', 'Türk-İslam Devletleri'], ['Atatürkçülük ve Türk İnkılabı', 'Türk İnkılabı'], ['Beylikten Devlete Osmanlı', 'Beylikten Devlete (1300-1453)'], ['Uluslararası İlişkilerde Denge Stratejisi', 'En Uzun Yüzyıl (1800-1922)'], ['Dünya Gücü Osmanlı ve Arayış Yılları', 'Dünya Gücü: Osmanlı Devleti'], ['XX. Yüzyıl Başlarında Osmanlı Devleti ve Dünya', '20. Yüzyıl Başlarında Osmanlı Devleti'], ['Tarih ve Zaman, İnsanlığın İlk Dönemleri, Orta Çağda Dünya', 'Tarih Bilimine Giriş']],
    tyt_cog: [['Nüfus, Göç ve Yerleşme', "Nüfus-Türkiye'de Nüfus"], ['Doğal Afetler, Çevre ve Toplum', 'Çevre ve Toplum'], ['Bölgeler, Ülkeler ve Uluslararası Ulaşım Hatları', 'Ülkeler ve Bölgeler'], ['İç ve Dış Kuvvetler, Yer Şekilleri', "Dünya'nın Yapısı ve Oluşum Süreci"], ['Doğa ve İnsan, Coğrafyanın Bölümleri', 'İnsan ve Coğrafya'], ["Dünya'nın Şekli, Hareketleri ve Coğrafi Konum", "Dünya'nın Şekli ve Hareketleri"], ['Su, Toprak ve Bitkiler', 'Su Kaynakları-Toprak-Bitkiler']],
    tyt_fel: [['Felsefenin Konusu', 'Felsefenin Alanı']],
    tyt_din: [['Bilgi ve İnanç', 'İnsan ve Din (İnanç)'], ['İslam ve İbadet', 'İbadet'], ['Hz. Muhammed (s.a.v.) ve Örnekliği', "Hz. Muhammed'in Hayatı"], ['Ahlak ve Değerler', 'İslamda Değerler, Sanat ve Laiklik'], ['İslam Düşüncesinde Yorumlar ve Tasavvuf', 'İslam Düşüncesi ve Yorumu']],
    ayt_mat: [['Temel Kavramlar ve Sayılar', 'Temel Kavramlar'], ['İntegral ve Uygulamaları', 'İntegral'], ['Türev ve Uygulamaları', 'Türev'], ['Üstel ve Logaritmik Fonksiyonlar', 'Logaritma'], ['İkinci Dereceden Denklemler, Eşitsizlikler ve Karmaşık Sayılar', '2. Dereceden Denklemler'], ['Limit ve Süreklilik', 'Limit'], ['Kümeler ve Kartezyen Çarpım', 'Kümeler'], ['Olasılık', 'Binom ve Olasılık'], ['Binom Açılımı', 'Binom ve Olasılık']],
    ayt_geo: [['Noktanın ve Doğrunun Analitiği', 'Doğrunun Analitiği'], ['Çember ve Daire', 'Çemberde Açılar'], ['Üçgenler', 'Doğruda ve Üçgende Açılar'], ['Katı Cisimler', 'Prizmalar'], ['Çokgenler ve Özel Dörtgenler', 'Çokgenler'], ['Çemberin Analitik İncelenmesi', 'Çemberin Analitiği'], ['Dönüşüm Geometrisi', 'Dönüşümlerle Geometri']],
    ayt_fiz: [['Modern Fizik ve Teknolojideki Uygulamaları', 'Modern Fiziğin Teknolojideki Uygulamaları'], ['Düzgün Çembersel Hareket', 'Çembersel Hareket'], ['Elektriksel Kuvvet, Elektrik Alan, Potansiyel ve Sığa', 'Elektrik Alan ve Potansiyel'], ['Vektörler, Bağıl Hareket ve Bir Boyutta Sabit İvmeli Hareket', 'Vektörler'], ['İtme ve Çizgisel Momentum', 'İtme ve Momentum'], ['Tork, Denge, Kütle Merkezi ve Basit Makineler', 'Kuvvet, Tork ve Denge'], ['Atom Fiziğine Giriş ve Radyoaktivite', 'Büyük Patlama ve Radyoaktivite'], ['İş, Güç ve Enerji', 'İş, Güç ve Enerji II']],
    ayt_kim: [['Kimyasal Tepkimelerde Denge', 'Tepkimelerde Hız ve Denge'], ['Kimyasal Tepkimelerde Hız', 'Tepkimelerde Hız ve Denge'], ['Asit-Baz ve Çözünürlük Dengesi', 'Sıvı Çözeltiler ve Çözünürlük']],
    ayt_bio: [['Genden Proteine', 'Genetik Şifre ve Protein Sentezi']],
  };
  const ALIAS = {}, OLD_OF = {};
  for (const k of Object.keys(RENAMED)) {
    for (const [o, n, nk] of RENAMED[k]) {
      const from = k + ':' + slug(o), to = (nk || k) + ':' + slug(n);
      if (topicIndex[to] && !topicIndex[from]) { ALIAS[from] = to; (OLD_OF[to] = OLD_OF[to] || []).push(from); }
    }
  }

  function subjectKeys(field = st().field) {
    const f = FIELDS[field];
    return TYT_KEYS.concat(f ? f.ayt : []).filter((k) => SUBJECTS[k]);
  }
  // Resmi tarih: sunucudaki sinav-tarihleri.json (güncelleme denetimiyle birlikte okunur, cihazda saklanır).
  // Hazal tarihi kendisi seçmediyse geri sayım ve plan bu tarihe uyar; ÖSYM açıklayınca dosyayı değiştirmek yeter.
  const OFFICIAL_KEY = 'luna-resmi-tarihler';
  const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) && !isNaN(new Date(v + 'T12:00:00'));
  function official() {
    try { const o = JSON.parse(localStorage.getItem(OFFICIAL_KEY) || 'null'); return o && isDay(o.tarih) ? o : null; } catch (e) { return null; }
  }
  const officialDate = () => (official() || {}).tarih || DEFAULT_DATE;
  // sunucudan gelen listeyi kaydeder; Hazal'ın geri sayımı değiştiyse { from, to, kesin } döndürür
  function setOfficial(data) {
    const y = data && data.yks;
    if (!y || !isDay(y.tarih)) return null;
    // eskiden resmi tarihin aynısı seçildiyse o da resmi tarihi izlesin
    if (st().examDate && st().examDate === officialDate()) { st().examDate = null; Store.save(); }
    const before = examDate(), was = official();
    try { localStorage.setItem(OFFICIAL_KEY, JSON.stringify({ tarih: y.tarih, kesin: !!y.kesin })); } catch (e) { return null; }
    const after = examDate();
    if (after !== before) return { from: before, to: after, kesin: !!y.kesin };
    if (!st().examDate && y.kesin && !(was && was.kesin)) return { from: before, to: after, kesin: true }; // tarih aynı ama artık kesin
    return null;
  }
  function examDate() { return isDay(st().examDate) ? st().examDate : officialDate(); }
  const customDate = () => isDay(st().examDate) && st().examDate !== officialDate();
  function dateNote() {
    if (customDate()) return '';
    const o = official();
    return o && o.kesin ? 'ÖSYM\'nin açıkladığı tarih. Değişirse burası kendiliğinden güncellenir.' : DATE_NOTE;
  }
  function daysLeft() {
    const d = new Date(examDate() + 'T09:00:00');
    if (isNaN(d)) return null;
    return Math.ceil((U.dayStart(d) - U.dayStart(new Date())) / 864e5);
  }
  const status = (id) => st().topics[id] || 0; // eski dört durumlu kayıt (0 başlamadım … 3 tamam); silinmez
  function setStatus(id, v) {
    if (!topicIndex[id]) return;
    if (v) st().topics[id] = v; else delete st().topics[id];
    Store.save();
  }
  // Konu takibi: tam bitti / yarım / eksik ve konuya not. Yeni işaret yoksa eski kayıt sayılır:
  // eski "tamam" tam bitti, "çalışıyorum" ya da "tekrar" yarım. Eski kayıt hiç değiştirilmez.
  const DURUMLAR = ['tam', 'yarim', 'eksik'];
  const takip = () => { const y = st(); if (!y.takip || typeof y.takip !== 'object' || Array.isArray(y.takip)) y.takip = {}; return y.takip; };
  function durum(id) {
    const x = takip()[id];
    if (x && typeof x.s === 'string') return DURUMLAR.includes(x.s) ? x.s : '';
    const old = Math.max(status(id), ...(OLD_OF[id] || []).map(status)); // eski adıyla işaretlenmiş olabilir
    return old === 3 ? 'tam' : old ? 'yarim' : '';
  }
  const not = (id) => { const x = takip()[id]; return x && typeof x.n === 'string' ? x.n : ''; };
  function yaz(id, patch) {
    if (!topicIndex[id]) return false;
    const t = takip(), cur = t[id] || { s: durum(id), n: not(id) };
    const next = { s: cur.s || '', n: cur.n || '', ...patch, at: Date.now() };
    t[id] = next; // boşaltılan kutu da zamanıyla kalır: eşitlemede öbür cihazın eski işareti geri gelmesin
    Store.save();
    return true;
  }
  const setDurum = (id, s) => yaz(id, { s: DURUMLAR.includes(s) ? s : '' });
  const setNot = (id, n) => yaz(id, { n: String(n || '').replace(/\s+$/, '').slice(0, 300) });
  function doneCount(field = st().field) {
    if (!field) return 0;
    let n = 0;
    for (const k of subjectKeys(field)) for (const t of SUBJECTS[k].topics) if (durum(t.id) === 'tam') n++;
    return n;
  }
  // Soru ağırlığına göre hazır olma yüzdesi (tam bitti = 1, yarım = 0.5)
  const CREDIT = { tam: 1, yarim: 0.5 };
  function subjectProgress(key) {
    const s = SUBJECTS[key];
    let w = 0, got = 0, done = 0, half = 0, miss = 0;
    for (const t of s.topics) {
      const a = Math.max(t.avg || 0, 0.2), d = durum(t.id);
      w += a;
      got += a * (CREDIT[d] || 0);
      if (d === 'tam') done++; else if (d === 'yarim') half++; else if (d === 'eksik') miss++;
    }
    return { key, pct: w ? got / w : 0, done, half, miss, count: s.topics.length, questionsCovered: Math.round((got / (w || 1)) * s.total) };
  }
  function progress(field = st().field) {
    const per = subjectKeys(field).map(subjectProgress);
    let q = 0, qc = 0;
    for (const p of per) { q += SUBJECTS[p.key].total; qc += p.pct * SUBJECTS[p.key].total; }
    return { pct: q ? qc / q : 0, subjects: per, questionsCovered: Math.round(qc), questions: q };
  }
  function studySubjects(field) { return (STUDY[field] || STUDY.SAY).map((x) => ({ ...x, yks: x.yks.slice() })); }

  return {
    SUBJECTS, EXAMS, FIELDS, GUIDANCE, SOURCES, DATE_NOTE, DEFAULT_DATE, TYT_KEYS,
    topic: (id) => topicIndex[id] || topicIndex[ALIAS[id]] || null,
    subjectKeys,
    studySubjects,
    examDate,
    officialDate,
    setOfficial,
    customDate,
    dateNote,
    daysLeft,
    status,
    setStatus,
    durum,
    setDurum,
    not,
    setNot,
    doneCount,
    subjectProgress,
    progress,
    field: () => st().field,
  };
})();

// app.js varlık kontrolü için (üst düzey const window'a eklenmez)
if (typeof window !== 'undefined') { window.YKS = YKS; }

