/* YKS verisi: dersler, konular ve konu başına ortalama soru sayıları; alanlar; ilerleme hesapları.
   Soru sayıları ÖSYM'nin geçmiş yıllardaki sınavlarından derlenen konu dağılımı tablolarına dayanır
   (bkz. SOURCES). Ortalama = kaynakların doğrulanabildiği yılların ortalaması. */

const YKS = (() => {
  // __DATA_START__
  const SUBJECTS = {
    tyt_tr: { exam: "TYT", name: "TYT Türkçe", short: "Türkçe", total: 40, topics: [
      { name: "Paragraf", d: "Paragrafta Anlam + Paragrafın Yapısı", avg: 25.4, y: [26, 26, 26] },
      { name: "Sözcükte Anlam", d: "Deyim, Atasözü, Söz Yorumu", avg: 3.7, y: [4, 4, 3] },
      { name: "Cümlede Anlam", avg: 3.1, y: [3, 3, 4] },
      { name: "Yazım Kuralları", avg: 2, y: [2, 2, 2] },
      { name: "Noktalama İşaretleri", avg: 2, y: [2, 2, 2] },
      { name: "Cümlenin Ögeleri", avg: 1.1, y: [1, 1, 1] },
      { name: "Sözcük Türleri", d: "İsim, Sıfat, Zamir, Zarf, Edat-Bağlaç-Ünlem", avg: 1, y: [0, 1, 0] },
      { name: "Sözcükte Yapı ve Ekler", d: "Biçim Bilgisi", avg: 0.7, y: [1, 0, 0] },
      { name: "Ses Bilgisi", avg: 0.4, y: [0, 0, 1] },
      { name: "Fiiller", d: "Kip-Kişi, Ek Fiil, Fiilimsi, Çatı", avg: 0.3, y: [1, 0, 1] },
      { name: "Cümle Türleri", avg: 0.1, y: [0, 1, 0] },
      { name: "Anlatım Bozukluğu", avg: 0, y: [0, 0, 0] },
    ] },
    tyt_mat: { exam: "TYT", name: "TYT Matematik", short: "Matematik", total: 30, topics: [
      { name: "Problemler", d: "Sayı, kesir, yaş, işçi-havuz, hız, yüzde-kâr-zarar, karışım, grafik problemleri", avg: 11.6, y: [12, 11, 10] },
      { name: "Temel Kavramlar", avg: 2.6, y: [3, 1, 2] },
      { name: "Sayı Basamakları", avg: 1.4, y: [1, 2, 1] },
      { name: "Rasyonel Sayılar", d: "Kesirler, Ondalık Sayılar", avg: 1.4, y: [1, 2, 2] },
      { name: "Mutlak Değer", avg: 1.1, y: [1, 2, 1] },
      { name: "Fonksiyonlar", avg: 1.1, y: [1, 1, 1] },
      { name: "Permütasyon ve Kombinasyon", avg: 1.1, y: [1, 3, 1] },
      { name: "Olasılık", avg: 1.1, y: [1, 1, 1] },
      { name: "Basit Eşitsizlikler", avg: 1, y: [1, 0, 3] },
      { name: "Köklü Sayılar", avg: 1, y: [1, 1, 1] },
      { name: "Kümeler ve Kartezyen Çarpım", avg: 1, y: [1, 1, 1] },
      { name: "Bölme ve Bölünebilme", avg: 0.9, y: [1, 1, 1] },
      { name: "Üslü Sayılar", avg: 0.9, y: [1, 1, 1] },
      { name: "Denklem Çözme", d: "Birinci Dereceden Denklemler", avg: 0.9, y: [1, 0, 1] },
      { name: "Veri ve İstatistik", avg: 0.8, y: [1, 1, 1] },
      { name: "Oran-Orantı", avg: 0.6, y: [1, 0, 1] },
      { name: "Mantık", avg: 0.6, y: [1, 1, 1] },
      { name: "Polinomlar", avg: 0.3, y: [0, 0, 0] },
      { name: "EBOB-EKOK", avg: 0.1, y: [0, 1, 0] },
      { name: "Çarpanlara Ayırma", avg: 0.1, y: [0, 0, 0] },
    ] },
    tyt_geo: { exam: "TYT", name: "TYT Geometri", short: "Geometri", total: 10, topics: [
      { name: "Açılar ve Üçgenler", d: "Doğruda/Üçgende Açı, Özel Üçgenler, Açıortay-Kenarortay, Eşlik-Benzerlik, Üçgende Alan", avg: 3.6, y: [4, 5, 5] },
      { name: "Katı Cisimler", d: "Prizma, Piramit, Silindir, Koni, Küre", avg: 2, y: [2, 2, 2] },
      { name: "Dikdörtgen", avg: 1.1, y: [1, 1, 1] },
      { name: "Çokgenler", avg: 1, y: [1, 1, 1] },
      { name: "Yamuk", avg: 0.8, y: [1, 1, 1] },
      { name: "Kare", avg: 0.5, y: [1, 0, 0] },
      { name: "Analitik Geometri", d: "Noktanın ve Doğrunun Analitiği", avg: 0.5, y: [0, 0, 0] },
      { name: "Çember ve Daire", avg: 0.4, y: [0, 0, 0] },
      { name: "Paralelkenar, Eşkenar Dörtgen ve Deltoid", avg: 0.3, y: [0, 0, 0] },
    ] },
    tyt_fiz: { exam: "TYT", name: "TYT Fizik", short: "Fizik", total: 7, topics: [
      { name: "Optik", avg: 1.4, y: [1, 1, 2] },
      { name: "Hareket ve Kuvvet", d: "Dinamik dahil", avg: 1.1, y: [2, 1, 1] },
      { name: "Isı, Sıcaklık ve Genleşme", avg: 0.9, y: [1, 1, 1] },
      { name: "Elektrik Akımı, Devreler ve Manyetizma", avg: 0.8, y: [0, 1, 2] },
      { name: "Madde ve Özellikleri", avg: 0.6, y: [0, 1, 1] },
      { name: "Dalgalar", avg: 0.6, y: [1, 1, 0] },
      { name: "Kaldırma Kuvveti", avg: 0.5, y: [1, 1, 0] },
      { name: "Elektrostatik", avg: 0.4, y: [1, 0, 0] },
      { name: "Basınç", avg: 0.4, y: [0, 0, 0] },
      { name: "Fizik Bilimine Giriş", avg: 0.3, y: [0, 0, 0] },
      { name: "İş, Güç ve Enerji", avg: 0.1, y: [0, 0, 0] },
    ] },
    tyt_kim: { exam: "TYT", name: "TYT Kimya", short: "Kimya", total: 7, topics: [
      { name: "Kimya Bilimi", avg: 1, y: [1, 1, 1] },
      { name: "Kimyasal Türler Arası Etkileşimler", avg: 1, y: [1, 1, 1] },
      { name: "Maddenin Halleri", avg: 1, y: [1, 1, 1] },
      { name: "Karışımlar", avg: 0.9, y: [1, 1, 1] },
      { name: "Asitler, Bazlar ve Tuzlar", avg: 0.9, y: [1, 1, 1] },
      { name: "Periyodik Sistem", avg: 0.8, y: [1, 0, 1] },
      { name: "Kimyasal Hesaplamalar", d: "Mol ve Tepkimeler", avg: 0.5, y: [1, 1, 0] },
      { name: "Atom ve Atomun Yapısı", avg: 0.4, y: [0, 1, 0] },
      { name: "Kimyanın Temel Kanunları", avg: 0.4, y: [0, 0, 1] },
      { name: "Kimya Her Yerde", avg: 0.3, y: [0, 0, 0] },
    ] },
    tyt_bio: { exam: "TYT", name: "TYT Biyoloji", short: "Biyoloji", total: 6, topics: [
      { name: "Canlıların Sınıflandırılması ve Biyoçeşitlilik", avg: 1, y: [1, 1, 1] },
      { name: "Hücre Bölünmeleri ve Üreme", d: "Mitoz, Mayoz", avg: 1, y: [1, 1, 1] },
      { name: "Kalıtım", avg: 1, y: [1, 1, 1] },
      { name: "Ekosistem Ekolojisi ve Güncel Çevre Sorunları", avg: 1, y: [1, 1, 1] },
      { name: "Hücre, Organeller ve Madde Geçişleri", avg: 0.9, y: [1, 1, 1] },
      { name: "Canlıların Temel Bileşenleri", d: "İnorganik/Organik Bileşikler, Enzimler", avg: 0.7, y: [0, 1, 1] },
      { name: "Canlıların Ortak Özellikleri", avg: 0.4, y: [1, 0, 0] },
    ] },
    tyt_tar: { exam: "TYT", name: "TYT Tarih", short: "Tarih", total: 5, topics: [
      { name: "Milli Mücadele", avg: 1.1, y: [1, 1, 2] },
      { name: "İlk ve Orta Çağlarda Türk Dünyası", avg: 1, y: [1, 1, 1] },
      { name: "İslam Medeniyetinin Doğuşu ve İlk Türk-İslam Devletleri", avg: 1, y: [1, 1, 1] },
      { name: "Atatürkçülük ve Türk İnkılabı", avg: 0.7, y: [1, 1, 0] },
      { name: "Beylikten Devlete Osmanlı", avg: 0.4, y: [1, 0, 0] },
      { name: "Uluslararası İlişkilerde Denge Stratejisi", d: "1774-1914", avg: 0.4, y: [0, 0, 1] },
      { name: "Dünya Gücü Osmanlı ve Arayış Yılları", d: "1453-1774", avg: 0.1, y: [0, 1, 0] },
      { name: "XX. Yüzyıl Başlarında Osmanlı Devleti ve Dünya", avg: 0.1, y: [0, 0, 0] },
      { name: "Tarih ve Zaman, İnsanlığın İlk Dönemleri, Orta Çağda Dünya", avg: 0, y: [0, 0, 0] },
    ] },
    tyt_cog: { exam: "TYT", name: "TYT Coğrafya", short: "Coğrafya", total: 5, topics: [
      { name: "İklim Bilgisi", d: "Atmosfer, Sıcaklık, Basınç-Rüzgar, Nem-Yağış", avg: 1.1, y: [1, 1, 2] },
      { name: "Nüfus, Göç ve Yerleşme", avg: 1.1, y: [1, 1, 2] },
      { name: "Harita Bilgisi", avg: 0.6, y: [1, 1, 0] },
      { name: "Doğal Afetler, Çevre ve Toplum", avg: 0.6, y: [0, 1, 1] },
      { name: "Bölgeler, Ülkeler ve Uluslararası Ulaşım Hatları", avg: 0.5, y: [1, 1, 0] },
      { name: "İç ve Dış Kuvvetler, Yer Şekilleri", avg: 0.4, y: [0, 0, 0] },
      { name: "Doğa ve İnsan, Coğrafyanın Bölümleri", avg: 0.3, y: [0, 0, 0] },
      { name: "Dünya'nın Şekli, Hareketleri ve Coğrafi Konum", avg: 0.1, y: [0, 0, 0] },
      { name: "Su, Toprak ve Bitkiler", avg: 0.1, y: [1, 0, 0] },
      { name: "Ekonomik Faaliyetler", avg: 0.1, y: [0, 0, 0] },
    ] },
    tyt_fel: { exam: "TYT", name: "TYT Felsefe", short: "Felsefe", total: 5, topics: [
      { name: "Bilgi Felsefesi", avg: 1.4, y: [2, 1, 2] },
      { name: "Ahlak Felsefesi", avg: 1, y: [1, 1, 1] },
      { name: "Felsefenin Konusu", d: "Felsefeyi Tanıma, Felsefi Düşünce", avg: 0.9, y: [0, 1, 2] },
      { name: "Varlık Felsefesi", avg: 0.8, y: [1, 1, 0] },
      { name: "Din Felsefesi", avg: 0.4, y: [0, 1, 0] },
      { name: "Bilim Felsefesi", avg: 0.3, y: [1, 0, 0] },
      { name: "Siyaset Felsefesi", avg: 0.3, y: [0, 0, 0] },
      { name: "Sanat Felsefesi", avg: 0.1, y: [0, 0, 0] },
    ] },
    tyt_din: { exam: "TYT", name: "TYT Din Kültürü", short: "Din Kültürü", total: 5, topics: [
      { name: "Bilgi ve İnanç", d: "İnanç Esasları", avg: 1.1, y: [1, 1, 1] },
      { name: "Ahlak ve Değerler", avg: 1, y: [1, 1, 1] },
      { name: "Vahiy ve Akıl", d: "Kur'an ve Yorumu", avg: 0.9, y: [0, 1, 1] },
      { name: "İslam ve İbadet", avg: 0.8, y: [0, 1, 1] },
      { name: "Hz. Muhammed (s.a.v.) ve Örnekliği", avg: 0.8, y: [1, 1, 1] },
      { name: "Din, Kültür ve Medeniyet", avg: 0.4, y: [1, 0, 0] },
      { name: "İslam Düşüncesinde Yorumlar ve Tasavvuf", avg: 0.1, y: [1, 0, 0] },
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
  const SOURCES = ["https://ertansinansahin.com/tyt-ve-ayt-fizik-konulari-ve-soru-dagilimi/", "https://ertansinansahin.com/tyt-fizik-konulari-ve-soru-dagilimi/", "https://www.rehberimsensin.com/tyt-fizik-konulari-ve-soru-dagilimi", "https://kunduz.com/tr/blog/2021-yks-fizik-konulari-2020-yks-fizik-soru-dagilimi-275803/", "https://egitim.com/lise/tyt-fizik-konulari-ve-soru-dagilimi", "https://fizikozeldersin.com/pages/blog/tyt-2025-fizik-cikan-konular", "https://dogrutercihler.com/2023-tyt-fizik-konulari-ve-soru-dagilimi/", "https://www.xyzakademi.com.tr/tyt-kimya-soru-dagilimi/", "https://www.rehberimsensin.com/tyt-kimya-konulari-ve-soru-dagilimi", "https://kunduz.com/tr/blog/2021-tyt-kimya-konulari-tyt-kimya-soru-dagilimi-272150/", "https://www.ozeldersalani.com/tyt-kimya-konulari-ve-soru-dagilimlari", "https://egitim.com/lise/tyt-kimya-konulari-ve-soru-dagilimi", "https://www.rehberimsensin.com/tyt-biyoloji-konulari-ve-soru-dagilimi", "https://www.unirehberi.com/tyt-biyoloji-konulari/", "https://ykskocum.com/tyt-biyoloji-konulari/", "https://www.milliyet.com.tr/gundem/tyt-biyoloji-konulari-ve-soru-dagilimi-2024-tytde-biyoloji-dersinden-hangi-konular-var-6267878", "https://rehberpanda.com/rehberler/yks/soru-dagilimi/tyt-tarih/", "https://universitenitanit.com/makale/oku/tyt-tarih-konulari-ve-soru-dagilimi-yks", "https://www.rehberimsensin.com/tyt-tarih-konulari-ve-soru-dagilimi", "https://unikazan.com/blog/tyt-tarih-konulari-2026/", "https://rehberpanda.com/rehberler/yks/soru-dagilimi/tyt-cografya/", "https://universitenitanit.com/makale/oku/tyt-cografya-konulari-ve-soru-dagilimi-yks", "https://www.rehberimsensin.com/tyt-cografya-konulari-ve-soru-dagilimi", "https://unikazan.com/blog/tyt-cografya-konulari-2026/", "https://unikazan.com/blog/tyt-felsefe-konulari-2026/", "https://egitim.com/lise/tyt-felsefe-konulari-ve-soru-dagilimi", "https://www.ozeldersalani.com/tyt-felsefe-konulari-felsefe-soru-dagilimi", "https://universitenitanit.com/makale/oku/tyt-felsefe-konulari-ve-soru-dagilimi-yks", "https://rehberpanda.com/rehberler/yks/soru-dagilimi/tyt-din-kulturu/", "https://okulsecim.com/blog/yks-konulari/tyt-din-kulturu-konulari-ve-soru-dagilimi", "https://www.rehberimsensin.com/tyt-din-kulturu-konulari-ve-soru-dagilim", "https://www.tahtaapp.com/blog/yks/tyt-soru-dagilimi", "https://unikazan.com/blog/yks-2027de-neler-degiscek-meb-son-aciklamalar-guncel-rehber/", "https://dogrutercihler.com/tyt-turkce-konu-ve-soru-dagilimi/", "https://www.unirehberi.com/tyt-turkce-konulari/", "https://www.bilgenc.com/tyt-turkce-konulari/", "https://www.rehberimsensin.com/tyt-turkce-konulari-ve-soru-dagilimi", "https://unikazan.com/blog/tyt-turkce-konulari-2026/", "https://www.ozeldersalani.com/tyt-turkce-konulari-ve-tyt-turkce-soru-dagilimi", "https://dogrutercihler.com/tyt-matematik-konu-ve-soru-dagilimi/", "https://www.unirehberi.com/tyt-matematik-konulari/", "https://www.kitapsec.com/blog/2025-tyt-sinavi-matematik-konulari-114.html", "https://askakitap.com/blog/tyt-matematik-konulari", "https://www.thekoc.net/service/tyt-matematik", "https://www.bilgenc.com/tyt-matematik-konulari/", "https://www.rehberimsensin.com/tyt-matematik-konulari-ve-soru-dagilimi", "https://dogrutercihler.com/tyt-geometri-konu-ve-soru-dagilimi/", "https://www.bilgenc.com/tyt-geometri-konulari/", "https://www.unirehberi.com/tyt-geometri-konulari/", "https://egitim.com/lise/tyt-geometri-konulari-ve-soru-dagilimi", "https://www.rehberimsensin.com/tyt-geometri-konulari-ve-soru-dagilimi", "https://www.ozeldersalani.com/ydt-ingilizce-konulari-ve-soru-dagilimi", "https://www.aladilakademisi.com/ydt-sinavi-suresi/", "https://kunduz.com/tr/blog/ydt-konulari-ingilizce-soru-dagilimi-283248/"];
  const EXAMS = {"TYT": {"minutes": 165, "questions": 120}, "AYT": {"minutes": 180, "questions": 160}, "YDT": {"minutes": 120, "questions": 80}};
  const DEFAULT_DATE = "2027-06-19";
  const DATE_NOTE = "Tahmini tarih: ÖSYM 2027 takvimini açıklayınca buradan güncelleyebilirsin.";
  const GUIDANCE = {"dailyRoutines": [], "weeklyStructure": [], "phases": [], "deneme": [], "techniques": [], "wellbeing": []};
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

  function subjectKeys(field = st().field) {
    const f = FIELDS[field];
    return TYT_KEYS.concat(f ? f.ayt : []).filter((k) => SUBJECTS[k]);
  }
  function examDate() { return st().examDate || DEFAULT_DATE; }
  function daysLeft() {
    const d = new Date(examDate() + 'T09:00:00');
    if (isNaN(d)) return null;
    return Math.ceil((U.dayStart(d) - U.dayStart(new Date())) / 864e5);
  }
  const status = (id) => st().topics[id] || 0;
  function setStatus(id, v) {
    if (!topicIndex[id]) return;
    if (v) st().topics[id] = v; else delete st().topics[id];
    Store.save();
  }
  function doneCount(field = st().field) {
    if (!field) return 0;
    let n = 0;
    for (const k of subjectKeys(field)) for (const t of SUBJECTS[k].topics) if (status(t.id) === 3) n++;
    return n;
  }
  // Soru ağırlığına göre hazır olma yüzdesi (tamam = 1, tekrar = 0.7, çalışıyorum = 0.35)
  const CREDIT = [0, 0.35, 0.7, 1];
  function subjectProgress(key) {
    const s = SUBJECTS[key];
    let w = 0, got = 0, done = 0;
    for (const t of s.topics) {
      const a = Math.max(t.avg, 0.2);
      w += a;
      got += a * CREDIT[status(t.id)];
      if (status(t.id) === 3) done++;
    }
    return { key, pct: w ? got / w : 0, done, count: s.topics.length, questionsCovered: Math.round((got / (w || 1)) * s.total) };
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
    topic: (id) => topicIndex[id] || null,
    subjectKeys,
    studySubjects,
    examDate,
    daysLeft,
    status,
    setStatus,
    doneCount,
    subjectProgress,
    progress,
    field: () => st().field,
  };
})();

// app.js varlık kontrolü için (üst düzey const window'a eklenmez)
if (typeof window !== 'undefined') { window.YKS = YKS; }
