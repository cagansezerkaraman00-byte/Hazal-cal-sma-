/* Kaynaklar: akademik kütüphane ve kaynakça (Notlar → Kaynaklar).
   - Makale arama: OpenAlex (anahtarsız günde ~100 arama; isteğe bağlı ücretsiz anahtar), yedek: Crossref
   - DOI ile ekleme: Crossref (yazar ad/soyadı ayrı, en doğru künye), yedek: OpenAlex
   - ISBN ile kitap: Open Library, yedek: Google Books
   - Biçimler: APA 7 (Türkçe karşılıklarıyla), Vancouver (tıp/sağlık), IEEE (mühendislik)
   Sunucu yok; kütüphane veride (yedeğe girer). */

const Kaynak = (() => {
  const KEY = 'luna-openalex'; // isteğe bağlı OpenAlex anahtarı (yalnızca bu cihaz)
  const oaKey = () => { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } };
  const PARTICLES = new Set(['van', 'von', 'de', 'der', 'den', 'da', 'di', 'du', 'del', 'della', 'la', 'le', 'bin', 'ibn', 'al', 'el', 'dos', 'das', 'ten', 'ter']);

  // "Arthur C. Guyton" → {family: 'Guyton', given: 'Arthur C.'}
  function splitName(full) {
    const t = String(full || '').trim().replace(/\s+/g, ' ');
    if (!t) return null;
    if (t.includes(',')) { const [f, g] = t.split(',').map((x) => x.trim()); return { family: f, given: g || '' }; }
    const p = t.split(' ');
    if (p.length === 1) return { family: p[0], given: '' };
    let i = p.length - 1;
    while (i > 1 && PARTICLES.has(p[i - 1].toLowerCase())) i--;
    return { family: p.slice(i).join(' '), given: p.slice(0, i).join(' ') };
  }
  // ilk harfler: "Jean-Paul C." → APA "J.-P. C.", Vancouver "JPC"
  function initials(given, style) {
    const parts = String(given || '').replace(/\./g, ' ').replace(/\s*-\s*/g, '-').trim().split(/\s+/).filter(Boolean);
    // "J.-P." noktalar atılınca "J -P" olur: boş parçalar ayıklanmazsa ''[0] çöker
    const bits = (w) => w.split('-').filter(Boolean);
    if (style === 'vancouver') return parts.map((w) => bits(w).map((x) => x[0]).join('')).join('').toLocaleUpperCase('tr-TR');
    return parts.map((w) => bits(w).map((x) => x[0].toLocaleUpperCase('tr-TR') + '.').join('-')).filter(Boolean).join(' ');
  }
  const esc = (s) => U.esc(s);
  // HTML çıktısında kayıt baştan kaçışlanır (yazar adları dahil: dış kaynaklardan gelen metin güvenilmez)
  const it = (s, html) => (html ? `<i>${s}</i>` : s);
  const T = (s) => s;
  const escStr = (v) => (typeof v === 'string' ? esc(v) : v);
  const escRec = (r) => {
    const o = {};
    for (const k of Object.keys(r)) o[k] = escStr(r[k]);
    o.authors = (r.authors || []).map((a) => { const x = {}; for (const k of Object.keys(a || {})) x[k] = escStr(a[k]); return x; });
    return o;
  };
  const dash = (p) => String(p || '').replace(/\s*[-–—]\s*/g, '–');
  const doiUrl = (d) => (d ? 'https://doi.org/' + d.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '') : '');
  const endDot = (s) => (/[.?!]$/.test(s) ? s : s + '.');
  const MONTHS_TR = U.MONTHS;
  const trDate = (iso) => { if (!iso) return ''; const d = new Date(iso + 'T12:00:00'); return `${d.getDate()} ${MONTHS_TR[d.getMonth()]} ${d.getFullYear()}`; };

  // ---------- Biçimlendirme ----------
  function apaAuthors(list) {
    const n = (a) => (a.literal ? a.literal : `${a.family}${a.given ? ', ' + initials(a.given, 'apa') : ''}`);
    const names = list.map(n);
    if (!names.length) return '';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]}, & ${names[1]}`;
    if (names.length <= 20) return `${names.slice(0, -1).join(', ')}, & ${names[names.length - 1]}`;
    return `${names.slice(0, 19).join(', ')}, . . . ${names[names.length - 1]}`;
  }
  function vanAuthors(list) {
    const names = list.map((a) => (a.literal ? a.literal : `${a.family}${a.given ? ' ' + initials(a.given, 'vancouver') : ''}`));
    if (names.length > 6) return names.slice(0, 6).join(', ') + ', et al';
    return names.join(', ');
  }
  function ieeeAuthors(list) {
    const names = list.map((a) => (a.literal ? a.literal : `${a.given ? initials(a.given, 'apa') + ' ' : ''}${a.family}`));
    if (names.length > 6) return names[0] + ' et al.';
    if (names.length <= 2) return names.join(' and ');
    return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
  }
  // r: {type, title, authors, year, container, volume, issue, pages, doi, url, edition, publisher, city, accessed, date}
  function format(r, style, html) {
    if (html) r = escRec(r);
    const yr = r.year ? String(r.year) : /^\d{4}/.test(r.date || '') ? r.date.slice(0, 4) : '';
    const doi = doiUrl(r.doi);
    const link = doi || r.url || '';
    const ed = r.edition && String(r.edition) !== '1' ? r.edition : '';
    if (style === 'vancouver') {
      const a = vanAuthors(r.authors || []);
      if (r.type === 'book') return `${a ? a + '. ' : ''}${T(endDot(r.title), html)} ${ed ? ed + '. bs. ' : ''}${r.city ? T(r.city, html) + ': ' : ''}${T(r.publisher || '', html)}${r.publisher ? '; ' : ''}${yr}.`;
      if (r.type === 'web') return `${a ? a + '. ' : ''}${T(r.title, html)} [Internet]. ${r.container ? T(r.container, html) + '; ' : ''}${yr || 't.y.'} [erişim tarihi: ${trDate(r.accessed) || trDate(U.dateKey(new Date()))}]. Erişim adresi: ${T(r.url || '', html)}`;
      return `${a ? a + '. ' : ''}${T(endDot(r.title), html)} ${r.container ? T(r.container, html) + '. ' : ''}${yr}${r.volume ? ';' + r.volume : ''}${r.issue ? '(' + r.issue + ')' : ''}${r.pages ? ':' + String(r.pages).replace(/\s*[–—]\s*/g, '-') : ''}.${r.doi ? ' doi:' + r.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '') : ''}`;
    }
    if (style === 'ieee') {
      const a = ieeeAuthors(r.authors || []);
      if (r.type === 'book') return `${a ? a + ', ' : ''}${it(r.title, html)}${ed ? ', ' + ed + '. bs.' : ''} ${r.city ? T(r.city, html) + ': ' : ''}${T(r.publisher || '', html)}, ${yr}.`;
      if (r.type === 'web') return `${a ? a + ', ' : ''}"${T(r.title, html)}," ${r.container ? T(r.container, html) + '. ' : ''}[Online]. Available: ${T(r.url || '', html)} (erişim: ${trDate(r.accessed) || trDate(U.dateKey(new Date()))}).`;
      const bits = [r.container ? it(r.container, html) : '', r.volume ? 'vol. ' + r.volume : '', r.issue ? 'no. ' + r.issue : '', r.pages ? 'pp. ' + dash(r.pages) : '', yr].filter(Boolean).join(', ');
      return `${a ? a + ', ' : ''}"${T(r.title, html)}," ${bits}${r.doi ? ', doi: ' + r.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '') : ''}.`;
    }
    // APA 7
    const a = apaAuthors(r.authors || []);
    // web sayfası tarihli ise (Yıl, Gün Ay), değilse (Yıl) / (t.y.)
    const dd = r.type === 'web' && /^\d{4}-\d{2}-\d{2}$/.test(r.date || '') ? new Date(r.date + 'T12:00:00') : null;
    const when = dd ? `(${dd.getFullYear()}, ${dd.getDate()} ${MONTHS_TR[dd.getMonth()]})` : `(${yr || 't.y.'})`;
    const lead = a ? `${endDot(a)} ${when}.` : '';
    if (r.type === 'book') {
      const t = `${it(r.title, html)}${ed ? ` (${ed}. bs.)` : ''}.`;
      return lead ? `${lead} ${t} ${T(r.publisher || '', html)}${r.publisher ? '.' : ''}${link ? ' ' + T(link, html) : ''}` : `${t} ${when}. ${T(r.publisher || '', html)}.${link ? ' ' + T(link, html) : ''}`;
    }
    if (r.type === 'web') return `${lead ? lead + ' ' : ''}${it(r.title, html)}.${lead ? '' : ' ' + when + '.'} ${r.container ? T(r.container, html) + '. ' : ''}${T(r.url || '', html)}`;
    const vol = r.volume ? `, ${it(r.volume, html)}${r.issue ? '(' + T(r.issue, html) + ')' : ''}` : '';
    const box = r.container ? ` ${it(r.container, html)}${vol}${r.pages ? ', ' + dash(r.pages) : ''}.` : ''; // dergisiz kayıtta ". ." kalmasın
    return `${lead ? lead + ' ' : ''}${T(endDot(r.title), html)}${lead ? '' : ' ' + when + '.'}${box}${link ? ' ' + T(link, html) : ''}`;
  }
  // metin içi atıf (APA): (Guyton & Hall, 2020) / (Kaya vd., 2021)
  function inText(r) {
    const a = r.authors || [], y = r.year || 't.y.';
    const f = (x) => x.literal || x.family;
    if (!a.length) return `(${r.title.split(' ').slice(0, 3).join(' ')}…, ${y})`;
    if (a.length === 1) return `(${f(a[0])}, ${y})`;
    if (a.length === 2) return `(${f(a[0])} & ${f(a[1])}, ${y})`;
    return `(${f(a[0])} vd., ${y})`;
  }
  function bibliography(list, style, html) {
    let l = list.slice();
    if (style === 'apa') l.sort((x, y) => ((x.authors[0] && (x.authors[0].family || x.authors[0].literal)) || x.title).localeCompare((y.authors[0] && (y.authors[0].family || y.authors[0].literal)) || y.title, 'tr') || (x.year || 0) - (y.year || 0));
    const items = l.map((r, i) => (style === 'apa' ? '' : `[${i + 1}] `) + format(r, style, html));
    return html ? items.map((x) => `<p>${x}</p>`).join('') : items.join('\n');
  }

  // ---------- Dış servisler ----------
  async function getJSON(url) {
    const ctl = window.AbortController ? new AbortController() : null;
    const t = setTimeout(() => ctl && ctl.abort(), 12000);
    try {
      const r = await fetch(url, { signal: ctl ? ctl.signal : undefined });
      if (r.status === 404) return null;
      if (r.status === 429) { const e = new Error('Günlük ücretsiz arama sınırına ulaşıldı'); e.limit = true; throw e; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('Zaman aşımı');
      if (e.limit || /^HTTP/.test(e.message)) throw e;
      throw new Error('Bağlantı kurulamadı');
    } finally { clearTimeout(t); }
  }
  const cleanDoi = (s) => { const m = String(s || '').match(/10\.\d{4,9}\/[^\s"<>]+/); return m ? m[0].replace(/[.,;)]+$/, '') : ''; };
  function fromOpenAlex(w) {
    const abs = w.abstract_inverted_index;
    let abstract = '';
    if (abs) { const pos = []; for (const [word, idx] of Object.entries(abs)) for (const i of idx) pos[i] = word; abstract = pos.filter(Boolean).join(' '); }
    const b = w.biblio || {};
    const src = (w.primary_location && w.primary_location.source) || {};
    const type = w.type === 'book' ? 'book' : 'article'; // kitap bölümü: kitabın adı "kaynak" olarak kalır
    return {
      type, title: (w.display_name || w.title || '').replace(/<[^>]+>/g, ''),
      authors: (w.authorships || []).map((a) => splitName(a.author && a.author.display_name)).filter(Boolean),
      year: w.publication_year || '', container: type === 'book' ? '' : src.display_name || '', publisher: type === 'book' ? src.host_organization_name || '' : '',
      volume: b.volume || '', issue: b.issue || '', pages: b.first_page ? b.first_page + (b.last_page && b.last_page !== b.first_page ? '-' + b.last_page : '') : '',
      doi: cleanDoi(w.doi), url: '', oaUrl: (w.best_oa_location && (w.best_oa_location.pdf_url || w.best_oa_location.landing_page_url)) || (w.open_access && w.open_access.oa_url) || '',
      cited: w.cited_by_count || 0, abstract: abstract.slice(0, 3000),
    };
  }
  function fromCrossref(m) {
    const dp = (m.issued && m.issued['date-parts'] && m.issued['date-parts'][0]) || (m.published && m.published['date-parts'] && m.published['date-parts'][0]) || [];
    const type = /^(book|edited-book|monograph|reference-book|book-set)$/.test(m.type || '') ? 'book' : 'article'; // bölümler (book-chapter/part/section) kitap adıyla
    return {
      type, title: ((m.title && m.title[0]) || '').replace(/<[^>]+>/g, ''),
      authors: (m.author || []).map((a) => (a.family ? { family: a.family, given: a.given || '' } : a.name ? { literal: a.name } : null)).filter(Boolean),
      year: dp[0] || '', container: type === 'book' ? '' : (m['container-title'] && m['container-title'][0]) || '', publisher: m.publisher || '',
      volume: m.volume || '', issue: m.issue || '', pages: m.page || '', doi: m.DOI || '', url: '', oaUrl: '', cited: m['is-referenced-by-count'] || 0,
      abstract: String(m.abstract || '').replace(/<[^>]+>/g, '').slice(0, 3000),
    };
  }
  async function search(q) {
    const sel = 'id,doi,display_name,publication_year,authorships,primary_location,biblio,type,open_access,best_oa_location,cited_by_count,abstract_inverted_index';
    try {
      const j = await getJSON(`https://api.openalex.org/works?search=${encodeURIComponent(q)}&per-page=12&select=${sel}${oaKey() ? '&api_key=' + encodeURIComponent(oaKey()) : ''}`);
      return { from: 'OpenAlex', items: ((j && j.results) || []).map(fromOpenAlex) };
    } catch (e) {
      // yedek: Crossref (anahtarsız)
      const j = await getJSON(`https://api.crossref.org/works?query=${encodeURIComponent(q)}&rows=12&select=DOI,title,author,issued,published,container-title,volume,issue,page,type,publisher,is-referenced-by-count`);
      return { from: 'Crossref', items: ((j && j.message && j.message.items) || []).map(fromCrossref), note: e.message };
    }
  }
  async function byDoi(input) {
    const doi = cleanDoi(input);
    if (!doi) return null;
    let r = null;
    try { const j = await getJSON(`https://api.crossref.org/works/${encodeURIComponent(doi)}`); if (j && j.message) r = fromCrossref(j.message); } catch (e) { /* yedeğe geç */ }
    try {
      const w = await getJSON(`https://api.openalex.org/works/doi:${encodeURIComponent(doi)}${oaKey() ? '?api_key=' + encodeURIComponent(oaKey()) : ''}`);
      if (w) { const o = fromOpenAlex(w); r = r ? { ...r, oaUrl: o.oaUrl, abstract: r.abstract || o.abstract, cited: Math.max(r.cited, o.cited) } : o; }
    } catch (e) { if (!r) throw e; }
    return r;
  }
  async function byIsbn(input) {
    const isbn = String(input || '').replace(/[^\dXx]/g, '');
    if (!(isbn.length === 10 || isbn.length === 13)) return null;
    try {
      const j = await getJSON(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
      const b = j && j['ISBN:' + isbn];
      if (b) {
        return {
          type: 'book', title: b.title + (b.subtitle ? ': ' + b.subtitle : ''), authors: (b.authors || []).map((a) => splitName(a.name)).filter(Boolean),
          year: (String(b.publish_date || '').match(/\d{4}/) || [''])[0], publisher: (b.publishers && b.publishers[0] && b.publishers[0].name) || '',
          city: (b.publish_places && b.publish_places[0] && b.publish_places[0].name) || '', isbn, doi: '', url: '', edition: '',
        };
      }
    } catch (e) { /* yedeğe geç */ }
    const g = await getJSON(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    const v = g && g.items && g.items[0] && g.items[0].volumeInfo;
    if (!v) return null;
    return {
      type: 'book', title: v.title + (v.subtitle ? ': ' + v.subtitle : ''), authors: (v.authors || []).map(splitName).filter(Boolean),
      year: (String(v.publishedDate || '').match(/\d{4}/) || [''])[0], publisher: v.publisher || '', city: '', isbn, doi: '', url: '', edition: '',
    };
  }

  return { format, inText, bibliography, search, byDoi, byIsbn, splitName, initials, oaKey, setOaKey(k) { try { localStorage.setItem(KEY, k); } catch (e) { /* yok say */ } } };
})();

if (typeof window !== 'undefined') { window.Kaynak = Kaynak; }

