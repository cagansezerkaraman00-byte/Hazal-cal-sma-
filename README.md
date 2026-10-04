# 🐈‍⬛✨ Luna ile Çalış

Kedi **Luna** ile yıldızlı, pixel art bir ders çalışma uygulaması. Kurulum gerektirmez, telefona uygulama gibi yüklenebilir, internet olmadan da çalışır.

## Neler var?

**🌌 Canlı gökyüzü**
- Güneş ve ay **gerçek saate ve konuma göre** hareket eder (İstanbul varsayılan; ayarlardan şehir seçilebilir veya konum kullanılabilir)
- Sabah, gün doğumu, öğle, gün batımı ve gece renkleri; gerçek ay evresi
- Gece yıldızlar, kayan yıldızlar, ateş böcekleri ve gizli bir **kalp takımyıldızı** 💛
- Saat, tarih ve gün doğumu/batımı saatleri

**🐾 Luna**
- Pixel art kedi: gezinir, oturur, kuyruğunu sallar, göz kırpar
- Sen çalışırken kitabının ve fenerinin başına oturur; molada etrafta dolaşır; gece geç saatte uyur (Zzz)
- Ona dokununca zıplar, miyavlar, kalpler çıkar
- Her odak oturumunda 🐟 balık kazanırsın, Luna'yı besleyebilirsin
- 5 renk seçeneği (siyah, gri, turuncu, beyaz, krem)

**🍅 Zamanlayıcı**
- Pomodoro (odak / kısa mola / uzun mola) ve serbest kronometre
- Sayfa kapansa ya da yenilense bile doğru sayar
- Bitince zil sesi, bildirim; çalışırken ekran kararmaz
- Boşluk tuşu ile başlat/duraklat

**📝 Oturum kaydı**
- Her oturum sonunda: neler çalıştın, nerede zorlandın, verimin (1–5 ⭐), nasıl hissettin
- Uygulama dışında çalıştıysan elle ekleyebilirsin
- Zorlandığın yerler otomatik olarak **tekrar listesine** düşer

**📊 İstatistikler**
- Günlük çubuk grafik, **saatlere göre verim** (hangi saatte ne kadar ve ne kadar verimli)
- Ders dağılımı, haftanın günleri, 16 haftalık "yıldız haritası", oturum geçmişi
- Seri (art arda gün) takibi

**🔭 Luna'nın Raporu**
- En verimli ve en verimsiz saatlerin
- Uzun süredir çalışmadığın dersler, dengesiz ders dağılımı
- Senin için ideal oturum süresi, gece çalışmasının etkisi
- Önceki döneme göre gelişimin, yaklaşan sınavlar, geciken görevler
- Güçlü yönler / eksikler & düzeltmeler / öneriler olarak

**💌 Motivasyon**
- Luna günün saatine göre mesaj atar (günaydın, su iç, artık uyu…)
- **Sevgilinden notlar:** Ayarlar'a yazılan notları Luna arada söyler; günlük hedefe ulaşınca **günün gizli notu** açılır
- 17 rozet 🏅

**🎧 Müzik**
- Spotify çalma listesi/albüm bağlantısı yapıştırıp uygulamanın içinden dinleme
- Yağmur, dalga, şömine, beyaz/kahverengi gürültü ses karıştırıcısı

**📝 Görevler ve sınav geri sayımı**

## Nasıl açılır?

### En kolayı: GitHub Pages (telefonda da çalışır)
1. GitHub'da bu depoda **Settings → Pages** bölümüne git
2. *Source*: **Deploy from a branch**, *Branch*: `main` ve `/ (root)` seç, **Save**
3. Bir iki dakika sonra adres çıkar: `https://<kullanıcı-adı>.github.io/Hazal-cal-sma-/`
4. Telefonda bu adresi aç:
   - **iPhone (Safari):** Paylaş → *Ana Ekrana Ekle*
   - **Android (Chrome):** ⋮ menü → *Uygulamayı yükle*

### Bilgisayarda denemek için
```bash
python3 -m http.server 8000
# sonra tarayıcıda http://localhost:8000
```
(`index.html`'e çift tıklamak da çalışır ama bildirim ve çevrimdışı mod için sunucu gerekir.)

## Kişiselleştirme
- **Ayarlar → Kişisel:** isim, sevgilinin adı, günlük hedef, Luna'nın mesaj sıklığı
- **Ayarlar → Sevgilinden notlar:** her satıra bir not 💌
- **Ayarlar → Dersler:** ders ekle, sil, renk değiştir

## Veriler
Tüm veriler sadece kullanılan cihazın tarayıcısında saklanır (sunucu yok). Telefon değiştirirken **Ayarlar → Veriler → Dışa aktar**, yeni cihazda **İçe aktar**.

## Dosyalar
| Dosya | Görevi |
|---|---|
| `index.html` | Sayfa yapısı |
| `css/style.css` | Yıldız temalı tasarım |
| `js/scene.js` | Gökyüzü, güneş/ay hesabı ve pixel art Luna |
| `js/timer.js` | Pomodoro / serbest zamanlayıcı |
| `js/stats.js` | İstatistikler ve Luna'nın raporu |
| `js/messages.js` | Luna'nın mesajları |
| `js/audio.js` | Zil, miyav ve ortam sesleri |
| `js/app.js` | Arayüz ve her şeyi bağlayan kod |
| `js/storage.js` | Veri saklama |
| `sw.js`, `manifest.webmanifest` | Telefona yükleme ve çevrimdışı çalışma |

> Dosyalarda değişiklik yaptıktan sonra `sw.js` içindeki `VERSION` değerini artırırsan telefondaki uygulama da güncellenir.
