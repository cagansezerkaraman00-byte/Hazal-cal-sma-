# Notlar

Uygulamada görünmez; ileride yapılacak işleri unutmamak için.

## Üniversite modu

- Takvimdeki **deneme planlama** şimdilik yalnızca YKS modunda var. Üniversite modu üzerinde çalışmaya başladığımızda bu bölüm **vize / final / proje** olarak değişecek ve üniversite modundaki sınav ve ödev kayıtlarına bağlanacak (`js/takvim-ui.js` içindeki `plansOn` / deneme bölümü).

## Sticker defteri

- 2.10'dan beri yalnızca **Ay Işığı** (`siyah-yildizli`) açık; İnci Düşü, Gül Kurusu, Saklı Bahçe ve Mavi Rüya `js/takvim-ui.js` içindeki `DEFTERLER`'de `kilitli: true`. Kapakları `assets/defter/` içinde duruyor. Her deftere kendi stickerları gelince `kilitli` kaldırılır; iki ya da daha çok defter açık olunca seçici kendiliğinden geri gelir.

- Stickerlar `assets/stickers/<paket>/` içinde (ilk paket: `p1`, 9 sayfadan kesilmiş 216 sticker). Bölümler ve sırası `js/stickers.js` içinde.
- Yeni sticker sayfası gelince:
  1. `python3 scripts/sticker-kes.py <png klasörü> <çıkış klasörü>` ile kes (gerekenler dosyanın başında yazıyor).
  2. Yarım kalan parçaları ayıkla, iyi olanları yeni bir pakete (`p2` gibi) kopyala.
  3. `js/stickers.js` içinde benzerleri aynı bölüme ekle ya da yeni bölüm aç (bir bölüm 20'den uzunsa kendiliğinden birkaç sayfaya bölünür).
- Görseller servis çalışanında `luna-stickers-1` önbelleğine ilk görüldüğünde girer; dosya adı değişmedikçe güncellenmez (bir sticker değişirse yeni adla ekle).

## Sonra yapılacak: halkada kedi

- 2.9.1–2.9.2'de Bugün halkasının ucunda yürüyen minik Güçlü (sahnedeki yavru çizimi, 1,5 kat) denendi; Çağan "çok çirkin, sonra yapacağız" dedi, 2.9.3'te kaldırıldı. Kod commit `e7ed294`'te (`RingCat`, `.gr-yol`, `.gr-kedi`). Yeniden yapılırken önce önizleme gösterilecek.

## Geri dönüş noktası

- **2.13.2 öncesi:** 2.13.1, commit `cc4874b`; yerelde `eski-2.13.1` dalı. 2.13.2 yalnızca İlerleme'den sekiz kartı kaldırdı (Güçlü yönlerin, Gelişim fırsatları, Öneriler, Saatlere göre verim, Haftalık zaman çizelgesi, Günlük çalışma, Dersler, Haftanın günleri; `index.html` ve `js/app.js` `renderCharts` / `renderReport`). Veri silinmedi. Çağan "yalnızca çarpı attığım yerler" dedi: rapor başlığındaki "İşte gözlemlerim" ve Kılavuz'daki "Luna'nın raporu" / "Saatlere göre verim" satırları bilerek olduğu gibi bırakıldı.
- **2.13.1 öncesi:** 2.13, commit `ef02723`; yerelde `eski-2.13` dalı da bu commit'i gösterir. 2.13.1 yalnızca görünüş ve küçük düzeltme: Plan'daki Görevler kartı kalktı (`D().tasks` silinmedi, görev hatırlatması ve rapordaki görev cümlesi kapandı), yatay telefonda Luna'nın balonu kedinin yanına geçer (`js/scene.js` `positionBubble`), plansız günde Bugün kartı süre yazmaz, alçak ekranda rozet penceresi sıkışır. Geri alınırsa veri kaybı olmaz. Çalış ekranındaki "💭 Aklına gelen?" kutusu hâlâ `D().tasks`'a yazıyor ve artık görünmüyor; Çağan'a soruldu (kaldırılsın mı, Notlar'a mı gitsin), cevap bekleniyor.
- **2.13 (yeni Konu takibi) öncesi:** 2.12.4, commit `2ea6770`; yerelde `eski-2.12.4` dalı da bu commit'i gösterir. Beğenilmezse 2.12.4'ün `css/style.css`, `index.html`, `js/deneme.js`, `js/plan.js`, `js/planlar-ui.js`, `js/storage.js`, `js/yks.js`, `sw.js` dosyaları daha yüksek bir sürüm numarasıyla (ör. 2.13.1) yeniden yayınlanır; `assets/konu/` kalabilir, kullanılmaz. Veri kaybı olmaz: yeni işaretler ve notlar `yks.takip` içinde, eski sürüm bu alanı açıp kaydedince olduğu gibi saklıyor (denendi); eski `yks.topics` işaretlerine hiç dokunulmadı. Konu kimlikleri değişti; eski kimlikler `js/yks.js` içindeki `RENAMED` ile yenilerine bağlı. Kartların çizimleri ve kapak `assets/konu/` içinde (Çağan'ın gönderdiği tasarımdan kesildi).
- **2.12.4:** 2.12.3'teki fazlalıklar (kart zemini, parlama, üstteki seçimin rengi) geri alındı; yalnızca halka, piksel rakamlar, SERBEST ODAK yazısı ve altındaki küçük yazılar Zambak pembesi. Önceki sürüm 2.12.3, commit `302064e`.
- **2.12.3 öncesi:** 2.12.2, commit `6d0bcd5`. 2.12.3 yalnızca Zambak temasında sayaç kartının renkleri (css/style.css'te `:root[data-tema="zambak"] .timer-card` kuralları); silmek eski altın sayacı geri getirir.
- **2.12.2 öncesi:** 2.12.1, commit `52de693` (güne dokununca pasta listede açılıyordu). 2.12.2 yalnızca görünüş.
- **2.12.1 öncesi:** 2.12, commit `dd260c4` (hafta grafiği yığılmış sütun + hafta pastası). 2.12.1 yalnızca görünüş: her günde ders ders ayrı sütun, y ekseni, güne dokununca o günün pastası.
- **2.12 öncesi:** 2.11.1, commit `d6080bc`. 2.12 yalnızca İlerleme'nin görünüşünü değiştirir (haftanın grafiği, saat dk sn); kayıtlara dokunmaz, geri alınırsa veri kaybı olmaz.
- **2.10 öncesi:** 2.9.3, commit `dc55c9f`. 2.10 bitmeyen maddeleri kendiliğinden taşır (`moved` / `from` alanları, eski sürüm de tanır); geri alınırsa taşınmış maddeler yerinde kalır, kaybolmaz. Tekrar listesinin verisi (`review`) silinmedi.
- **2.9.1 öncesi:** 2.9, commit `227276e`. Oturumlardaki `endReason: 'part'` (konu değiştirince kaydedilen parça) ve sayaçtaki `segs` alanlarını eski sürüm tanımadan saklar; veri kaybı olmaz.
- **2.9 (Bugün kartı = günün programı) öncesi:** canlıdaki son sürüm **2.8.1**, commit `3f5456c`. Geri istenirse 2.8.1'in `index.html`, `css/style.css`, `js/app.js`, `js/planlar.js`, `js/planlar-ui.js`, `js/timer.js` dosyaları daha yüksek bir sürüm numarasıyla yeniden yayınlanır. Veri kaybı olmaz: oturumlardaki yeni `planId` alanını eski sürüm tanımadan saklar; eski maddelerin süre hedefleri (`min`) hiç silinmedi.
- **2.8 (Hazal'ın Küçük Dünyası) öncesi:** canlıdaki son sürüm **2.7.2**, commit `047fa18`. Yerelde `eski-2.7.2` dalı bu commit'i gösterir; commit uzak daldaki geçmişte de durur.
- "Her şeyi geri al" denirse: 2.7.2'nin kodu daha yüksek bir sürüm numarasıyla (ör. 2.8.1) yeniden yayınlanır; telefonlar onu güncelleme olarak alır. Veriler silinmez: eski sürüm tanımadığı `dunya` alanını olduğu gibi saklar, rozetler ve planlar yerinde kalır.

## Çağan'ın mektupları (Küçük Dünya)

- Mektuplar `js/mektuplar.js` içinde, kodlu (base64) durur. Yeni mektup: metni bir dosyaya yaz (ilk satır hitap, sonra boş satırla ayrılmış paragraflar), `node scripts/mektup-kodla.cjs mektup.txt` çıktısını listenin sonuna `metin` olarak ekle.
- Açılma koşulu: `{ tur: 'madde', sayi: 10 }` (o kadar plan maddesi bitince; şimdiye kadar bitenler de sayılır), `{ tur: 'tarih', tarih: 'YYYY-AA-GG' }`, `{ tur: 'serbest' }` (istediği zaman).
- Mektupların içeriğini yalnızca Çağan yazar; uydurma anı ya da olay eklenmez.
