# Notlar

Uygulamada görünmez; ileride yapılacak işleri unutmamak için.

## Üniversite modu

- Takvimdeki **deneme planlama** şimdilik yalnızca YKS modunda var. Üniversite modu üzerinde çalışmaya başladığımızda bu bölüm **vize / final / proje** olarak değişecek ve üniversite modundaki sınav ve ödev kayıtlarına bağlanacak (`js/takvim-ui.js` içindeki `plansOn` / deneme bölümü).

## Sticker defteri

- Stickerlar `assets/stickers/<paket>/` içinde (ilk paket: `p1`, 9 sayfadan kesilmiş 216 sticker). Bölümler ve sırası `js/stickers.js` içinde.
- Yeni sticker sayfası gelince:
  1. `python3 scripts/sticker-kes.py <png klasörü> <çıkış klasörü>` ile kes (gerekenler dosyanın başında yazıyor).
  2. Yarım kalan parçaları ayıkla, iyi olanları yeni bir pakete (`p2` gibi) kopyala.
  3. `js/stickers.js` içinde benzerleri aynı bölüme ekle ya da yeni bölüm aç (bir bölüm 20'den uzunsa kendiliğinden birkaç sayfaya bölünür).
- Görseller servis çalışanında `luna-stickers-1` önbelleğine ilk görüldüğünde girer; dosya adı değişmedikçe güncellenmez (bir sticker değişirse yeni adla ekle).
