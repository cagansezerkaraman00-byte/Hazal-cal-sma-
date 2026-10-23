/* Sticker defteri: sayfa sayfa stickerlar. Benzer stickerlar aynı bölümde; bölüm 12'den uzunsa birkaç sayfaya bölünür.
   Görsel stickerlar assets/stickers/<paket>/<ad>.webp (saydam, beyaz kesim kenarlı); güne 'i:<paket>/<ad>' diye yazılır
   (eski emoji stickerlar da olduğu gibi gösterilir). Yeni paket: scripts/sticker-kes.py ile kes, aşağıya bölüm olarak ekle (bkz. NOTLAR.md). */

const StickerDefter = (() => {
  const BOLUMLER = [
    { id: 'retro', title: 'Retro ve mektuplar', icon: '💌', pack: 'p1', items: ['s01-01', 's01-02', 's01-03', 's01-04', 's01-05', 's01-06', 's01-07', 's01-08', 's01-09', 's01-10', 's01-11', 's01-12', 's01-13', 's01-14', 's01-15', 's01-16', 's01-17', 's01-18', 's01-19', 's01-20', 's01-21', 's08-01', 's08-03', 's08-05', 's08-09', 's08-24', 's07-01', 's07-04', 's07-12'] },
    { id: 'kedi', title: 'Kediler', icon: '🐱', pack: 'p1', items: ['s02-01', 's02-02', 's02-03', 's02-04', 's02-05', 's02-06', 's02-07', 's02-08', 's02-09', 's03-36', 's03-22', 's05-28', 's07-08', 's08-32', 's08-02'] },
    { id: 'altin', title: 'Altın gökyüzü', icon: '✨', pack: 'p1', items: ['s04-01', 's04-02', 's04-03', 's04-04', 's04-05', 's04-06', 's04-07', 's04-08', 's04-09', 's04-10', 's04-11', 's04-15', 's04-16', 's04-17', 's04-18', 's04-19', 's04-20', 's04-21', 's04-22', 's04-24', 's04-25', 's04-26', 's04-27', 's04-29', 's04-30', 's04-31', 's04-32'] },
    { id: 'deniz', title: 'Deniz', icon: '🌊', pack: 'p1', items: ['s06-01', 's06-02', 's06-03', 's06-04', 's06-06', 's06-07', 's06-08', 's06-09', 's06-10', 's06-11', 's06-12', 's06-13', 's06-14', 's06-15', 's06-16', 's06-17', 's06-18', 's06-19', 's06-20', 's06-21', 's06-22', 's06-23', 's06-24', 's06-25', 's06-26', 's06-27', 's06-28', 's06-29', 's06-30', 's06-31', 's06-34', 's06-36', 's06-37', 's06-38', 's06-41', 's06-42'] },
    { id: 'yaz', title: 'Yaz ve limon', icon: '🍋', pack: 'p1', items: ['s09-05', 's09-12', 's09-13', 's09-18', 's09-25', 's09-43', 's09-50', 's09-53', 's09-51', 's09-19', 's09-09', 's09-17', 's09-24', 's09-26', 's09-49', 's09-58', 's09-33', 's09-34', 's09-35', 's09-52', 's09-38', 's09-02', 's09-11', 's09-55', 's09-10', 's09-03', 's09-14', 's09-15', 's09-28', 's09-29', 's09-45', 's09-57', 's09-41', 's09-56', 's09-06', 's09-07', 's09-22'] },
    { id: 'tatli', title: 'Tatlılar ve yiyecekler', icon: '🧁', pack: 'p1', items: ['s08-27', 's08-06', 's08-30', 's08-10', 's08-12', 's08-11', 's08-17', 's08-31', 's08-20', 's08-21', 's08-33', 's08-13', 's08-22', 's08-25', 's08-04', 's08-23', 's08-16', 's08-26', 's07-09', 's07-11', 's07-07', 's07-13', 's07-15', 's03-03'] },
    { id: 'cicek', title: 'Çiçekler ve bitkiler', icon: '🌷', pack: 'p1', items: ['s07-10', 's07-06', 's07-14', 's07-02', 's05-11', 's05-14', 's05-26', 's05-20', 's05-21', 's03-24', 's03-32', 's03-17', 's03-27', 's03-28', 's03-29', 's03-15', 's03-38'] },
    { id: 'cay', title: 'Çay saati', icon: '🫖', pack: 'p1', items: ['s05-03', 's05-19', 's05-04', 's05-08', 's05-06', 's05-18', 's05-24', 's05-32', 's05-31'] },
    { id: 'ev', title: 'Sıcacık ev', icon: '🏡', pack: 'p1', items: ['s03-12', 's03-01', 's03-02', 's03-10', 's03-14', 's03-09', 's03-25', 's03-04', 's03-11', 's03-31', 's03-21', 's03-20', 's03-18', 's03-33', 's03-34', 's03-23', 's03-35', 's03-16', 's03-13', 's03-37', 's03-39', 's07-05'] },
  ];
  const PER_PAGE = 12; // defter sayfası 3 × 4
  const isImg = (s) => typeof s === 'string' && s.startsWith('i:');
  const src = (s) => 'assets/stickers/' + s.slice(2) + '.webp';
  const all = (b) => (b.pack ? b.items.map((x) => 'i:' + b.pack + '/' + x) : b.items.slice());
  // bölümler sayfalara: [{ bolum, title, icon, items, part, parts }]
  const PAGES = [];
  for (const b of BOLUMLER) {
    const items = all(b), parts = Math.ceil(items.length / PER_PAGE);
    for (let i = 0; i < parts; i++) PAGES.push({ bolum: b.id, title: b.title, icon: b.icon, items: items.slice(i * PER_PAGE, (i + 1) * PER_PAGE), part: i + 1, parts });
  }
  const KNOWN = new Set(PAGES.flatMap((p) => p.items));
  // takvim hücresi ve defter için tek biçim (görsel tembel yüklenir; bozuk dosya sessizce gizlenir)
  function html(s, cls = '') {
    if (isImg(s)) return `<img class="${cls}" src="${src(s)}" alt="" loading="lazy" decoding="async" onerror="this.style.visibility='hidden'">`;
    return `<span class="${cls}">${U.esc(s)}</span>`;
  }
  return { BOLUMLER, PAGES, isImg, src, html, known: (s) => KNOWN.has(s) };
})();

if (typeof window !== 'undefined') { window.StickerDefter = StickerDefter; }
