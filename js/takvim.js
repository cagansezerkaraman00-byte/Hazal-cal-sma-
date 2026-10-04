/* Takvim: mevsim ve özel günler (yılbaşı, Ramazan/Kurban Bayramı, ulusal bayramlar, 14 Şubat).
   Dini bayramlar Diyanet takviminden (2026-2028); diğer yıllar için tarayıcının Hicri (Ümmü'l-Kurâ) takvimi kullanılır. */

const Takvim = (() => {
  // Diyanet: bayramın 1. günü ve gün sayısı
  const DINI = {
    2026: { ramazan: '2026-03-20', kurban: '2026-05-27' },
    2027: { ramazan: '2027-03-09', kurban: '2027-05-16' },
    2028: { ramazan: '2028-02-26', kurban: '2028-05-05' },
  };
  const ULUSAL = {
    '04-23': 'Ulusal Egemenlik ve Çocuk Bayramı',
    '05-19': "Atatürk'ü Anma, Gençlik ve Spor Bayramı",
    '08-30': 'Zafer Bayramı',
    '10-29': 'Cumhuriyet Bayramı',
  };

  const key = (d) => U.dateKey(d);
  const md = (d) => key(d).slice(5);
  const inRange = (d, startIso, days) => {
    const s = U.dayStart(new Date(startIso + 'T12:00:00')).getTime();
    const t = U.dayStart(d).getTime();
    return t >= s && t < s + days * 864e5;
  };

  // Hicri ay/gün (Intl desteklenmiyorsa null)
  let hijriFmt = null;
  try { hijriFmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric', day: 'numeric' }); } catch (e) { hijriFmt = null; }
  function hijri(d) {
    if (!hijriFmt) return null;
    try {
      const parts = hijriFmt.formatToParts(d);
      const m = +parts.find((p) => p.type === 'month').value;
      const day = +parts.find((p) => p.type === 'day').value;
      return m && day ? { m, day } : null;
    } catch (e) { return null; }
  }

  function season(d = new Date()) {
    const m = new Date(d).getMonth();
    if (m === 11 || m <= 1) return 'kis';
    if (m <= 4) return 'ilkbahar';
    if (m <= 7) return 'yaz';
    return 'sonbahar';
  }

  // O günün özel temaları (aynı gün birden fazla olabilir)
  function events(d = new Date()) {
    d = new Date(d);
    const out = [];
    const y = d.getFullYear();
    const mmdd = md(d);
    if (mmdd >= '12-24' || mmdd <= '01-02') out.push({ key: 'yilbasi', name: 'Yeni yıl', emoji: '🎄', fireworks: mmdd === '12-31' || mmdd === '01-01' });
    if (mmdd === '02-14') out.push({ key: 'sevgililer', name: 'Sevgililer Günü', emoji: '💘' });
    if (ULUSAL[mmdd]) out.push({ key: 'ulusal', name: ULUSAL[mmdd], emoji: '🇹🇷' });
    const known = DINI[y];
    if (known) {
      if (inRange(d, known.ramazan, 3)) out.push({ key: 'ramazan', name: 'Ramazan Bayramı', emoji: '🌙' });
      if (inRange(d, known.kurban, 4)) out.push({ key: 'kurban', name: 'Kurban Bayramı', emoji: '🕌' });
    } else {
      const h = hijri(d);
      if (h && h.m === 10 && h.day <= 3) out.push({ key: 'ramazan', name: 'Ramazan Bayramı', emoji: '🌙' });
      if (h && h.m === 12 && h.day >= 10 && h.day <= 13) out.push({ key: 'kurban', name: 'Kurban Bayramı', emoji: '🕌' });
    }
    return out;
  }
  const is = (d, k) => events(d).some((e) => e.key === k);

  const SEASON_NAME = { kis: 'Kış', ilkbahar: 'İlkbahar', yaz: 'Yaz', sonbahar: 'Sonbahar' };
  return { season, events, is, SEASON_NAME };
})();

if (typeof window !== 'undefined') { window.Takvim = Takvim; }
