/* Çağan'ın mektupları: Küçük Dünya'daki mektup kutusu. Mektupları Çağan yazar; burada yalnızca açılma koşulları durur.
   Metin kodlu (base64) saklanır: kodu açan biri sürprizi bir bakışta okuyamasın. Yeni mektup: scripts/mektup-kodla.cjs ile kodla,
   listenin sonuna ekle. kosul: { tur: 'madde', sayi: 10 } o kadar plan maddesi bitince (şimdiye kadar bitenler de sayılır),
   { tur: 'tarih', tarih: 'YYYY-AA-GG' } o gün, { tur: 'serbest' } istediği zaman.
   Çalış sekmesindeki ilk mektup (Messages.mektup) kutuda da en başta durur. */

const Mektuplar = (() => {
  const LISTE = [
    { id: 'm-adim', baslik: 'Bugünkü adımın için', kosul: { tur: 'madde', sayi: 1 }, imza: 'Çağan',
      metin: 'eyJoaXRhcCI6IkfDvHplbCBIYXphbOKAmcSxbSwiLCJwYXJhZ3JhZmxhciI6WyJidWfDvG4ga2VuZGluIGnDp2luIGJpciBhZMSxbSBkYWhhIGF0dMSxbi4iLCJCZW4geWFsbsSxemNhIGJpdGlyZGnEn2luIGtvbnVsYXJsYSBkZcSfaWwsIHllbmlkZW4gZGVuZW1lbmxlIGRlIGd1cnVyIGR1eXV5b3J1bS4iLCJIZXIgZ8O8biBnw7zDp2zDvCBvbG1hayB6b3J1bmRhIGRlxJ9pbHNpbi4gU2VuIGtlbmRpIGjEsXrEsW5kYSBkYSBiw7x5w7x5b3JzdW4uIiwixLB5aSBraSB2YXJzxLFuLiJdfQ==' },
  ];
  function coz(s) {
    try {
      const bin = atob(s), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const m = JSON.parse(new TextDecoder().decode(bytes));
      return m && typeof m.hitap === 'string' && Array.isArray(m.paragraflar) ? m : null;
    } catch (e) { return null; }
  }
  return { LISTE, coz };
})();

if (typeof window !== 'undefined') { window.Mektuplar = Mektuplar; }
