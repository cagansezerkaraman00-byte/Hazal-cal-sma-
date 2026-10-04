/* Eğitim asistanı (Claude). Hazal'ın kendi Anthropic API anahtarıyla doğrudan tarayıcıdan çalışır;
   anahtar yalnızca bu cihazda (veri yedeğine girmez). Sohbetler IndexedDB'de.
   - PDF ve fotoğraflar Depo'dan ya da doğrudan eklenir; PDF'lerde sayfa numaralı kaynak gösterimi (citations)
   - İsteğe bağlı web araması: dış kaynaklar bağlantısıyla gösterilir, uydurma kaynak yok
   - Deneme analizi, konu anlatımı, soru çözümü, bilgi kartı üretimi, cevabı nota kaydetme
   - Aylık bütçe: her yanıtın maliyeti hesaplanır, bütçe dolunca durur */

const Asistan = (() => {
  let App = null;
  const $ = (s, el = document) => el.querySelector(s);
  const D = () => Store.data;

  // ---------- Ayarlar (yalnızca bu cihaz) ----------
  const CKEY = 'luna-ai';
  let cfg = { apiKey: '', model: 'claude-opus-5-5', budget: 5, effort: 'high', web: true, lastErr: '' };
  const MODELS = {
    'claude-opus-5-5': { n: 'Claude Opus 5.5', d: 'En güçlü, en derin anlatım (varsayılan)', in: 4, out: 20, cw: 5, cr: 0.2, effort: true, fb: true, ws: 'web_search_20260209' },
    'claude-sonnet-5-5': { n: 'Claude Sonnet 5.5', d: 'Hızlı ve daha ekonomik', in: 2, out: 10, cw: 2.5, cr: 0.2, effort: true, fb: true, ws: 'web_search_20260209' },
    'claude-haiku-4-5': { n: 'Claude Haiku 4.5', d: 'En hızlı ve en ucuz, kısa sorular için', in: 1, out: 5, cw: 1.25, cr: 0.1, effort: false, fb: false, ws: 'web_search_20250305' },
  };
  const WEB_SEARCH_USD = 0.01; // arama başına
  function loadCfg() { try { cfg = { ...cfg, ...(JSON.parse(localStorage.getItem(CKEY) || '{}') || {}) }; } catch (e) { /* yok say */ } if (!MODELS[cfg.model]) cfg.model = 'claude-opus-5-5'; }
  function saveCfg() { try { localStorage.setItem(CKEY, JSON.stringify(cfg)); } catch (e) { /* yok say */ } }
  const ready = () => /^sk-ant-/.test(cfg.apiKey || '');

  // ---------- SDK (resmi Anthropic SDK, uygulama içinde paketli) ----------
  let sdkP = null, client = null, clientKey = '';
  async function sdk() {
    if (!sdkP) sdkP = import(new URL('vendor/anthropic/anthropic-sdk.mjs', location.href).href).then((m) => m.default).catch((e) => { sdkP = null; throw e; });
    const Anthropic = await sdkP;
    if (!client || clientKey !== cfg.apiKey) {
      // tarayıcıdan doğrudan erişim: anahtar Hazal'ın kendi cihazında, başka kimseye gitmez
      client = new Anthropic({ apiKey: cfg.apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 });
      clientKey = cfg.apiKey;
    }
    return { Anthropic, client };
  }

  // ---------- Harcama ----------
  const month = () => U.dateKey(new Date()).slice(0, 7);
  function spend() {
    const a = D().ai || (D().ai = { month: month(), usd: 0, req: 0 });
    if (a.month !== month()) { a.month = month(); a.usd = 0; a.req = 0; }
    return a;
  }
  function costOf(usage, model) {
    const m = MODELS[model] || MODELS[cfg.model];
    if (!usage) return 0;
    const web = (usage.server_tool_use && usage.server_tool_use.web_search_requests) || 0;
    return ((usage.input_tokens || 0) * m.in + (usage.cache_creation_input_tokens || 0) * m.cw + (usage.cache_read_input_tokens || 0) * m.cr + (usage.output_tokens || 0) * m.out) / 1e6 + web * WEB_SEARCH_USD;
  }
  const usd = (x) => '$' + (x < 0.01 && x > 0 ? x.toFixed(4) : x.toFixed(2));

  // ---------- Sohbet deposu (IndexedDB) ----------
  const DB = (() => {
    let dbp = null;
    const open = () => dbp || (dbp = new Promise((res, rej) => {
      const r = indexedDB.open('luna-asistan', 1);
      r.onupgradeneeded = () => { r.result.createObjectStore('chats', { keyPath: 'id' }); r.result.createObjectStore('att'); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => { dbp = null; rej(r.error); };
    }));
    const tx = async (store, mode, fn) => {
      const db = await open();
      return new Promise((res, rej) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        t.oncomplete = () => res(req ? req.result : undefined);
        t.onerror = () => rej(t.error);
      });
    };
    return {
      put: (c) => tx('chats', 'readwrite', (s) => s.put(c)),
      all: () => tx('chats', 'readonly', (s) => s.getAll()),
      del: (id) => tx('chats', 'readwrite', (s) => s.delete(id)),
      putAtt: (k, v) => tx('att', 'readwrite', (s) => s.put(v, k)),
      getAtt: (k) => tx('att', 'readonly', (s) => s.get(k)),
      delAtt: (k) => tx('att', 'readwrite', (s) => s.delete(k)),
    };
  })();

  // ---------- Sistem talimatı (sabit tutulur: önbelleğe alınır) ----------
  const LEVELS = { yks: 'YKS hazırlığı yapan bir lise öğrencisi', kpss: 'KPSS hazırlığı yapan bir aday', uni: 'bir üniversite öğrencisi', yl: 'bir yüksek lisans öğrencisi', diger: 'bir öğrenci' };
  function systemPrompt() {
    const s = D().settings, p = s.profile || {};
    const who = `${LEVELS[p.level] || LEVELS.yks}${p.dept ? ` (bölüm/alan: ${p.dept}${p.year ? ', ' + p.year : ''})` : ''}`;
    const field = D().yks && D().yks.field && (p.level || 'yks') === 'yks' ? ` YKS alanı: ${(YKS.FIELDS[D().yks.field] || {}).name || D().yks.field}.` : '';
    return `Sen ${s.name || 'öğrencinin'} kişisel eğitim asistanısın. Karşındaki kişi ${who}.${field}
Görevin öğrenmesine yardım etmek: konuları anlaşılır anlatmak, sorularını çözmek, belgelerindeki anlamadığı yerleri açıklamak ve güvenilir kaynaklara yönlendirmek.

Bilimsel doğruluk:
- Yalnızca doğruluğundan emin olduğun bilgiyi kesin dille söyle. Emin olmadığında ya da kaynaklar ayrıştığında bunu açıkça belirt.
- Kaynak, yazar, kitap baskısı, sayfa numarası, DOI ya da bağlantı asla uydurma. Bir kaynağı ancak gerçekten biliyorsan ya da web aramasında bulduysan ver.
- Belge (PDF, fotoğraf) verildiğinde açıklamanı belgeye dayandır; belgede olmayan bir şey eklediğinde bunun belgenin dışından geldiğini söyle.
- Web araması varsa güncel ya da doğrulanması gereken bilgiler için kullan; hakemli makaleler, ders kitapları, resmî kılavuzlar (ör. WHO, NIH, MEB, ÖSYM) ve üniversite kaynaklarını tercih et; forum ve içerik çiftliklerinden kaçın.
- Tıp ve sağlık konularında anlatımın eğitim amaçlıdır; gerçek bir hasta için tanı ya da tedavi önerisi olmadığını gerektiğinde hatırlat.

Anlatım:
- Türkçe yaz (soru başka dilde sorulursa o dilde). Sıcak, cesaretlendirici ve sakin bir ton kullan; asla küçümseme ya da moral bozma.
- Önce kısa ve net bir cevap ver, sonra adım adım açıkla. Gerekirse benzetme, çözümlü örnek ve sık yapılan hatalar ekle.
- Test sorularında çözüm yolunu ve neden diğer şıkların yanlış olduğunu göster. Öğrenci "ipucu" isterse çözümü verme, yönlendir.
- YKS konularında konunun sınavdaki ağırlığını ve hangi soru tiplerinin çıktığını gözet; çalışma önerilerini aktif hatırlama, aralıklı tekrar ve karma çalışma gibi kanıta dayalı tekniklere dayandır.
- Matematik ve fen ifadelerini LaTeX kullanmadan, düz metin ve Unicode ile yaz (x², √x, ∫, Σ, Δ, →, ≤, ·).
- Biçim: kısa başlıklar, maddeler ve gerektiğinde küçük tablolar (Markdown). Gereksiz uzatma.
- Uygunsa yanıtı, öğrencinin kendini sınayabileceği tek bir kısa soruyla ya da sıradaki adım önerisiyle bitir.`;
  }

  // ---------- Ekler: Depo dosyası ya da doğrudan eklenen fotoğraf/PDF ----------
  const b64Cache = new Map();
  function toB64(blob) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(',')[1] || '');
      r.onerror = () => rej(r.error);
      r.readAsDataURL(blob);
    });
  }
  // fotoğraflar 1568 px'e indirilir (Claude için önerilen boyut; jeton ve maliyet düşer)
  async function prepImage(blob) {
    try {
      const bmp = await createImageBitmap(blob);
      const k = Math.min(1, 1568 / Math.max(bmp.width, bmp.height));
      if (k === 1 && blob.size < 3.5 * 1048576 && /jpeg|png|webp|gif/.test(blob.type)) { bmp.close && bmp.close(); return blob; }
      const c = document.createElement('canvas');
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      bmp.close && bmp.close();
      return await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.88));
    } catch (e) { return blob; }
  }
  async function attBlob(ref) {
    if (ref.src === 'depo') {
      const item = D().files.find((x) => x.id === ref.id);
      if (!item) throw new Error(`"${ref.name}" depoda bulunamadı`);
      return Depo.getBlob(item);
    }
    const b = await DB.getAtt(ref.id);
    if (!b) throw new Error(`"${ref.name}" bu cihazda bulunamadı`);
    return b;
  }
  // PDF'in seçili sayfalarının metni (büyük PDF'ler için ucuz yol)
  async function pdfText(blob, from, to) {
    const pdf = await Depo.openPdf(blob);
    try {
      const out = [];
      const last = Math.min(to, pdf.numPages);
      for (let n = Math.max(1, from); n <= last; n++) {
        const tc = await (await pdf.getPage(n)).getTextContent();
        out.push(`=== Sayfa ${n} ===\n` + tc.items.map((it) => it.str + (it.hasEOL ? '\n' : ' ')).join('').replace(/[ \t]+\n/g, '\n').trim());
      }
      return { text: out.join('\n\n'), pages: pdf.numPages };
    } finally { pdf.close(); }
  }
  // sohbetteki ek kaydını API içerik bloğuna çevir
  async function materialize(ref) {
    const key = ref.id + ':' + (ref.range || 'all');
    if (b64Cache.has(key)) return b64Cache.get(key);
    const blob = await attBlob(ref);
    let block;
    if (ref.mime === 'application/pdf' && ref.range) {
      const [a, b] = ref.range.split('-').map(Number);
      const { text } = await pdfText(blob, a, b);
      block = { type: 'document', source: { type: 'text', media_type: 'text/plain', data: text || '(Bu sayfalarda metin bulunamadı; taranmış olabilir.)' }, title: `${ref.name} (s. ${ref.range})`, citations: { enabled: true } };
    } else if (ref.mime === 'application/pdf') {
      block = { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: await toB64(blob) }, title: ref.name, citations: { enabled: true } };
    } else {
      const img = await prepImage(blob);
      block = { type: 'image', source: { type: 'base64', media_type: img.type || 'image/jpeg', data: await toB64(img) } };
    }
    b64Cache.set(key, block);
    while (b64Cache.size > 8) b64Cache.delete(b64Cache.keys().next().value);
    return block;
  }
  // geçmişteki mesajları API'ye hazırla (ekler her seferinde aynı baytlar: önbellek bozulmaz)
  async function apiMessages(msgs, opts = {}) {
    const out = [];
    for (const m of msgs) {
      if (m.role === 'assistant') { out.push({ role: 'assistant', content: m.content }); continue; }
      const content = [];
      for (const b of m.content) {
        if (b.type === 'luna_att') {
          const block = await materialize(b);
          content.push(opts.noCitations && block.citations ? { ...block, citations: { enabled: false } } : block);
        } else content.push(b);
      }
      out.push({ role: 'user', content });
    }
    return out;
  }

  // ---------- İstek ----------
  function requestParams(messages, extra = {}) {
    const M = MODELS[cfg.model];
    const p = {
      model: cfg.model,
      max_tokens: 64000,
      system: systemPrompt(),
      cache_control: { type: 'ephemeral' }, // konuşmanın önceki kısmı önbelleğe alınır (takip soruları ucuzlar)
      messages,
      ...extra,
    };
    if (M.effort) p.output_config = { ...(p.output_config || {}), effort: cfg.effort === 'medium' ? 'medium' : 'high' };
    if (M.fb) { p.betas = ['server-side-fallback-2026-07-01']; p.fallbacks = 'default'; } // güvenlik reddinde önerilen modele devret
    if (cfg.web && !extra.noTools) p.tools = [{ type: M.ws, name: 'web_search', max_uses: 5 }];
    delete p.noTools;
    return p;
  }
  function errText(e, Anthropic) {
    if (!Anthropic) return e && e.message ? e.message : 'Bilinmeyen hata';
    if (e instanceof Anthropic.APIUserAbortError) return 'Durduruldu.';
    if (e instanceof Anthropic.AuthenticationError) return 'API anahtarı geçersiz ya da silinmiş. Asistan ayarlarından yeni anahtar gir.';
    if (e instanceof Anthropic.PermissionDeniedError) return 'Bu anahtarın bu modele izni yok. Ayarlardan başka bir model seçebilirsin.';
    if (e instanceof Anthropic.RateLimitError) return 'Çok kısa sürede çok istek gitti; biraz bekleyip yeniden dene.';
    if (e instanceof Anthropic.BadRequestError) {
      const msg = String(e.message || '');
      if (/credit|balance|billing/i.test(msg)) return 'Anthropic hesabında kredi kalmamış görünüyor. Konsoldan bakiye ekleyebilirsin.';
      if (/too large|maximum|exceed|pages/i.test(msg)) return 'Dosya bu istek için çok büyük. PDF için sayfa aralığı seçmeyi dene.';
      return 'İstek kabul edilmedi: ' + msg.slice(0, 200);
    }
    if (e instanceof Anthropic.InternalServerError || (e && e.status === 529)) return 'Claude şu an çok yoğun; birazdan yeniden dene.';
    if (e instanceof Anthropic.APIConnectionError) return 'İnternet bağlantısı yok ya da Anthropic’e ulaşılamadı.';
    if (e instanceof Anthropic.APIError) return `Hata (${e.status || '?'}): ${String(e.message || '').slice(0, 200)}`;
    return e && e.message ? e.message : 'Bilinmeyen hata';
  }

  // ---------- Durum ----------
  let chats = [];        // özet listesi
  let chat = null;       // açık sohbet
  let pending = [];      // gönderilecek ekler
  let live = null;       // {stream, text, status}
  let loaded = false;

  async function loadChats() {
    try { chats = (await DB.all()).sort((a, b) => b.updated - a.updated); } catch (e) { chats = []; }
    loaded = true;
  }
  function newChat(title) {
    chat = { id: U.uid(), title: title || 'Yeni sohbet', created: Date.now(), updated: Date.now(), model: cfg.model, messages: [], cost: 0 };
    pending = [];
  }
  async function saveChat() {
    chat.updated = Date.now();
    await DB.put(chat).catch(() => {});
    const i = chats.findIndex((c) => c.id === chat.id);
    if (i >= 0) chats.splice(i, 1);
    chats.unshift(chat);
  }

  async function send(text, opts = {}) {
    if (live) return;
    if (!ready()) { App.toast('🎓', 'Önce API anahtarını gir', 'Asistan → Ayarlar'); return; }
    const sp = spend();
    if (sp.usd >= cfg.budget) { App.toast('🎓', 'Bu ayın asistan bütçesi doldu', `${usd(sp.usd)} / ${usd(cfg.budget)} · Ayarlardan artırabilirsin`); return; }
    text = String(text || '').trim();
    if (!text && !pending.length) return;
    if (!chat) newChat();
    const content = [...pending.map((r) => ({ type: 'luna_att', ...r })), { type: 'text', text: text || 'Bu dosyayı açıkla.' }];
    // büyük belge: göndermeden önce tahmini maliyeti göster
    if (pending.length && !opts.confirmed) {
      const est = await estimate([...chat.messages, { role: 'user', content }]).catch(() => null);
      if (est && est.usd > 0.25 && !confirm(`Bu istek yaklaşık ${Math.round(est.tokens / 1000)} bin jeton ≈ ${usd(est.usd)} tutacak (takip soruları önbellek sayesinde çok daha ucuz). Gönderilsin mi?\n\nİpucu: Büyük PDF'lerde yalnızca ilgili sayfaları seçmek maliyeti düşürür.`)) return;
    }
    if (chat.messages.length === 0 && chat.title === 'Yeni sohbet') chat.title = (text || pending[0].name).slice(0, 60);
    chat.messages.push({ role: 'user', content, at: Date.now() });
    pending = [];
    await saveChat();
    await run();
  }
  async function estimate(msgs) {
    const { client } = await sdk();
    const r = await client.messages.countTokens({ model: cfg.model, system: systemPrompt(), messages: await apiMessages(msgs) });
    const M = MODELS[cfg.model];
    return { tokens: r.input_tokens, usd: (r.input_tokens * M.cw) / 1e6 };
  }
  async function run() {
    let Anthropic = null;
    live = { text: '', status: 'Düşünüyor…', searches: [] };
    render();
    try {
      const s = await sdk();
      Anthropic = s.Anthropic;
      let messages = await apiMessages(chat.messages);
      let final = null, total = 0;
      // web araması uzun sürerse model duraklayabilir (pause_turn): kaldığı yerden devam ettir
      for (let round = 0; round < 4; round++) {
        const stream = s.client.beta.messages.stream(requestParams(messages));
        live.stream = stream;
        stream.on('text', (d) => { live.text += d; live.status = ''; paintLive(); });
        stream.on('streamEvent', (ev) => {
          if (ev.type === 'content_block_start' && ev.content_block && ev.content_block.type === 'server_tool_use') { live.status = '🔎 Kaynak aranıyor…'; paintLive(); }
        });
        const msg = await stream.finalMessage();
        total += costOf(msg.usage, msg.model || cfg.model);
        if (msg.stop_reason === 'refusal') {
          final = { ...msg, content: [{ type: 'text', text: 'Bu isteğe yanıt veremedim. Soruyu farklı bir şekilde sormayı deneyebilirsin.' }] };
          break;
        }
        if (final && final._paused) final = { ...msg, content: [...final.content, ...msg.content] };
        else final = msg;
        if (msg.stop_reason !== 'pause_turn') break;
        messages = [...messages, { role: 'assistant', content: msg.content }];
        final._paused = true;
      }
      delete final._paused;
      // düz JSON: akıştan gelen bloklardaki hesaplanan alanlar (araç girdisi) kalıcı veriye dönüşsün
      chat.messages.push({ role: 'assistant', content: JSON.parse(JSON.stringify(final.content)), at: Date.now(), model: final.model || cfg.model, cost: total, stop: final.stop_reason });
      chat.cost = (chat.cost || 0) + total;
      const sp = spend();
      sp.usd += total; sp.req++;
      D().stats.aiAsked = (D().stats.aiAsked || 0) + 1;
      App.save();
      if (App.checkBadges) App.checkBadges();
      cfg.lastErr = ''; saveCfg();
      await saveChat();
      if (final.stop_reason === 'max_tokens') App.toast('🎓', 'Yanıt çok uzadığı için kesildi', '"Devam et" yazabilirsin');
    } catch (e) {
      const msg = errText(e, Anthropic);
      const aborted = Anthropic && e instanceof Anthropic.APIUserAbortError;
      if (!aborted) { cfg.lastErr = msg; saveCfg(); }
      // yanıtsız kalan son soruyu geri al (geçmiş tutarlı kalsın), metni yazma kutusuna geri koy
      const last = chat.messages[chat.messages.length - 1];
      if (last && last.role === 'user') {
        chat.messages.pop();
        pending = last.content.filter((b) => b.type === 'luna_att').map(({ type, ...r }) => r);
        const t = last.content.find((b) => b.type === 'text');
        restoreText = t ? t.text : '';
        await saveChat();
      }
      if (!aborted) App.toast('⚠️', 'Asistan yanıt veremedi', msg);
    }
    live = null;
    render();
  }
  let restoreText = '';

  // ---------- Bilgi kartı üretimi (yapılandırılmış çıktı) ----------
  const CARD_SCHEMA = {
    type: 'object', additionalProperties: false, required: ['cards'],
    properties: { cards: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['front', 'back'], properties: { front: { type: 'string' }, back: { type: 'string' } } } } },
  };
  async function makeCards(source) {
    if (!ready()) return;
    const sp = spend();
    if (sp.usd >= cfg.budget) { App.toast('🎓', 'Bu ayın asistan bütçesi doldu'); return; }
    App.toast('🃏', 'Kartlar hazırlanıyor…', 'Birkaç saniye sürebilir');
    let Anthropic = null;
    try {
      const s = await sdk();
      Anthropic = s.Anthropic;
      const content = [];
      if (source.att) content.push(await materialize(source.att).then((b) => (b.citations ? { ...b, citations: { enabled: false } } : b)));
      content.push({ type: 'text', text: `${source.text ? 'İçerik:\n' + source.text + '\n\n' : ''}Bu içerikten aktif hatırlama için 8-15 bilgi kartı üret. Her kart tek bir kavramı sorsun; ön yüz kısa bir soru, arka yüz 1-3 cümlelik doğru ve net bir cevap olsun. Sınavda çıkabilecek tanımlara, formüllere, neden-sonuç ilişkilerine ve sık karıştırılan noktalara öncelik ver. İçerikte olmayan bilgi ekleme. Türkçe yaz; formülleri LaTeX olmadan Unicode ile yaz.` });
      const p = requestParams([{ role: 'user', content }], { noTools: true, output_config: { format: { type: 'json_schema', schema: CARD_SCHEMA } } });
      p.max_tokens = 16000;
      delete p.cache_control;
      const msg = await s.client.beta.messages.create(p);
      const cost = costOf(msg.usage, msg.model || cfg.model);
      spend().usd += cost; spend().req++; App.save();
      if (msg.stop_reason === 'refusal') throw new Error('Bu içerik için kart üretilemedi.');
      const txt = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
      let cards = [];
      try { cards = JSON.parse(txt).cards || []; } catch (e) { throw new Error('Kartlar okunamadı, yeniden dene.'); }
      reviewCards(cards.filter((c) => c.front && c.back).slice(0, 30), source.subjectId, cost);
    } catch (e) { App.toast('⚠️', 'Kart üretilemedi', errText(e, Anthropic)); }
  }
  function reviewCards(cards, subjectId, cost) {
    if (!cards.length) { App.toast('🃏', 'Kart çıkmadı'); return; }
    const subj = subjectId || (D().subjects[0] && D().subjects[0].id) || '';
    const card = App.openModal(`<h3>🃏 ${cards.length} kart hazır</h3>
      <p class="muted small">İstemediklerinin işaretini kaldır. Maliyet: ${usd(cost)}</p>
      <label>Ders</label><select data-f="subject">${D().subjects.map((s) => `<option value="${s.id}" ${s.id === subj ? 'selected' : ''}>${U.esc(s.name)}</option>`).join('')}<option value="">Genel</option></select>
      <ul class="gen-cards">${cards.map((c, i) => `<li><label><input type="checkbox" checked data-i="${i}"><span><b>${U.esc(c.front)}</b><small>${U.esc(c.back)}</small></span></label></li>`).join('')}</ul>
      <div class="modal-actions"><button class="btn soft" data-act="cancel" type="button">Vazgeç</button><button class="btn primary" data-act="add" type="button">Kartlara ekle</button></div>`);
    card.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]') && e.target.closest('[data-act]').dataset.act;
      if (act === 'cancel') App.closeModal();
      if (act !== 'add') return;
      const sid = card.querySelector('[data-f="subject"]').value;
      const today = U.dateKey(new Date());
      let n = 0;
      card.querySelectorAll('[data-i]').forEach((cb) => {
        if (!cb.checked) return;
        const c = cards[+cb.dataset.i];
        D().cards.push({ id: U.uid(), subjectId: sid, front: c.front.slice(0, 400), back: c.back.slice(0, 1200), box: 1, due: today, created: Date.now() });
        n++;
      });
      App.save(); App.closeModal(); App.refreshHome();
      App.toast('🃏', `${n} kart eklendi`, 'Kitaplık → Kartlar’da bugün tekrar edebilirsin');
    });
  }

  // ---------- Güvenli Markdown ----------
  function inline(s) {
    // önce [metin](adres) bağlantıları yer tutucuya, sonra çıplak adresler: iç içe bağlantı oluşmaz
    const links = [];
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (m, t, u) => { links.push(`<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`); return `\u0003${links.length - 1}\u0004`; });
    s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)\u0003]+)/g, (m, pre, u) => `${pre}<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`);
    return s
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\u0003(\d+)\u0004/g, (m, i) => links[+i]);
  }
  function md(src) {
    const lines = U.esc(src).split('\n');
    let html = '', list = null, para = [], code = null;
    const flushPara = () => { if (para.length) { html += `<p>${para.map(inline).join('<br>')}</p>`; para = []; } };
    const flushList = () => { if (list) { html += `<${list.t}>${list.items.map((x) => `<li>${inline(x)}</li>`).join('')}</${list.t}>`; list = null; } };
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (code !== null) { if (/^```/.test(l)) { html += `<pre><code>${code.join('\n')}</code></pre>`; code = null; } else code.push(l); continue; }
      if (/^```/.test(l)) { flushPara(); flushList(); code = []; continue; }
      const h = l.match(/^(#{1,4})\s+(.*)/);
      if (h) { flushPara(); flushList(); html += `<h${Math.min(6, h[1].length + 2)}>${inline(h[2])}</h${Math.min(6, h[1].length + 2)}>`; continue; }
      if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
        flushPara(); flushList();
        const row = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim()));
        const head = row(l); i++;
        const body = [];
        while (i + 1 < lines.length && /^\s*\|.*\|\s*$/.test(lines[i + 1])) body.push(row(lines[++i]));
        html += `<div class="table-wrap"><table><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
        continue;
      }
      const ul = l.match(/^\s*[-*•]\s+(.*)/), ol = l.match(/^\s*\d+[.)]\s+(.*)/);
      if (ul || ol) {
        flushPara();
        const t = ul ? 'ul' : 'ol';
        if (!list || list.t !== t) { flushList(); list = { t, items: [] }; }
        list.items.push((ul || ol)[1]);
        continue;
      }
      if (/^\s*&gt;\s?/.test(l)) { flushPara(); flushList(); html += `<blockquote>${inline(l.replace(/^\s*&gt;\s?/, ''))}</blockquote>`; continue; }
      if (/^\s*(-{3,}|\*{3,})\s*$/.test(l)) { flushPara(); flushList(); html += '<hr>'; continue; }
      if (!l.trim()) { flushPara(); flushList(); continue; }
      flushList();
      para.push(l);
    }
    if (code !== null) html += `<pre><code>${code.join('\n')}</code></pre>`;
    flushPara(); flushList();
    return html;
  }
  // yanıt blokları → metin + kaynak işaretleri + kaynak listesi
  function renderAnswer(content) {
    const sources = [], keyIdx = new Map();
    let text = '';
    const searches = [];
    for (const b of content || []) {
      if (b.type === 'server_tool_use' && b.name === 'web_search' && b.input && b.input.query) searches.push(b.input.query);
      if (b.type !== 'text') continue;
      text += b.text;
      for (const c of b.citations || []) {
        let key, label, url = '';
        if (c.type === 'web_search_result_location') { key = c.url; label = c.title || c.url; url = c.url; }
        else if (c.type === 'page_location') { key = `${c.document_index}:${c.start_page_number}`; label = `${c.document_title || 'Belge'} · s. ${c.start_page_number}${c.end_page_number - 1 > c.start_page_number ? '–' + (c.end_page_number - 1) : ''}`; }
        else if (c.type === 'char_location') { key = `${c.document_index}:c${c.start_char_index}`; label = c.document_title || 'Belge'; }
        else continue;
        if (!keyIdx.has(key)) { keyIdx.set(key, sources.length + 1); sources.push({ label, url, quote: c.cited_text || '' }); }
        text += `\u0001${keyIdx.get(key)}\u0002`;
      }
    }
    let html = md(text).replace(/\u0001(\d+)\u0002/g, (m, n) => `<sup class="cite" data-cite="${n}" title="${U.esc(((sources[n - 1] || {}).quote || '').slice(0, 300))}">${n}</sup>`);
    if (searches.length) html = `<p class="ai-search">🔎 ${searches.map((q) => U.esc(q)).join(' · ')}</p>` + html;
    if (sources.length) {
      html += `<div class="ai-sources"><b>Kaynaklar</b><ol>${sources.map((s) => `<li>${s.url ? `<a href="${U.esc(s.url)}" target="_blank" rel="noopener noreferrer">${U.esc(s.label)}</a>` : U.esc(s.label)}${s.quote ? `<small>“${U.esc(s.quote.slice(0, 220))}${s.quote.length > 220 ? '…' : ''}”</small>` : ''}</li>`).join('')}</ol></div>`;
    }
    return { html, text: text.replace(/\u0001\d+\u0002/g, ''), sources };
  }

  // ---------- Bağlamdan hazır istekler ----------
  function denemeContext() {
    const list = Deneme.list().slice(-8);
    if (!list.length) return '';
    const rows = list.map((e) => {
      const subs = Object.keys(e.scores || {}).filter((k) => YKS.SUBJECTS[k]).map((k) => `${YKS.SUBJECTS[k].short} ${Deneme.fmt(Deneme.net(e.scores[k].d, e.scores[k].y))} (D${e.scores[k].d || 0} Y${e.scores[k].y || 0}/${YKS.SUBJECTS[k].total})`).join(', ');
      return `- ${e.date} ${Deneme.label(e)}${e.name ? ' "' + e.name + '"' : ''}: toplam ${Deneme.fmt(Deneme.total(e))} net. ${subs}`;
    }).join('\n');
    const weak = Deneme.weakTopics(6, 10).map((w) => `- ${w.topic.name} (${YKS.SUBJECTS[w.topic.subjectKey].short}): son denemelerde ${w.count} kez eksik; YKS'de yılda ortalama ${w.topic.avg} soru`).join('\n');
    const days = YKS.daysLeft ? YKS.daysLeft() : null;
    return `Deneme sonuçlarım (eskiden yeniye):\n${rows}\n\nEksik çıkan konular:\n${weak || '- (işaretlenmemiş)'}\n\n${days != null ? `Sınava ${days} gün var. ` : ''}Günlük hedefim ${D().settings.dailyGoal} dakika.`;
  }
  function askDeneme() {
    const ctx = denemeContext();
    if (!ctx) { App.toast('📝', 'Önce bir deneme ekle', 'Deneme sekmesinden'); return; }
    App.showTab('asistan');
    newChat('Deneme analizi');
    send(`${ctx}\n\nLütfen:\n1) Güçlü yanlarımı ve en çok net kazanabileceğim dersleri/konuları somut sayılarla çıkar.\n2) Önümüzdeki 2 hafta için günlük, uygulanabilir bir çalışma planı öner; YKS soru ağırlıklarını ve eksik konularımı gözet.\n3) Her öncelikli konu için nasıl çalışmam gerektiğini (hangi tür kaynak, kaç soru, hangi kanıta dayalı teknik) kısaca söyle.\nKısa ve net ol; beni motive eden ama gerçekçi bir dil kullan.`, { confirmed: true });
  }
  // başka modüllerden hazır bir istekle yeni sohbet (kaynak özeti, hata sorusu…)
  function ask(text, title, atts) {
    App.showTab('asistan');
    if (live) return;
    newChat(title || 'Yeni sohbet');
    pending = (atts || []).slice();
    send(text, { confirmed: !pending.length });
  }
  // haftalık değerlendirme: son 7 günün özeti
  function askWeek() {
    const days = Stats.byDay(7);
    const list = Stats.inRange(7);
    if (!list.length) { App.toast('📈', 'Bu hafta henüz oturum yok', 'Birkaç oturumdan sonra birlikte değerlendirelim'); return; }
    const subj = Stats.bySubject(list).map((x) => `${Store.subject(x.id).name}: ${U.fmtMin(x.minutes)} (${x.count} oturum${x.rcnt ? ', ort. verim ' + (x.rsum / x.rcnt).toFixed(1) + '/5' : ''})`).join('; ');
    const best = App.bestHours ? App.bestHours().slice(0, 3) : [];
    const goal = D().settings.dailyGoal;
    const hit = days.filter((d) => d.minutes >= goal).length;
    const moods = list.filter((s) => s.mood).map((s) => s.mood).join(' ');
    const wk = U.dateKey(U.addDays(new Date(), -6));
    const den = Deneme.list().filter((e) => e.date >= wk).map((e) => `${e.date} ${Deneme.label(e)} ${Deneme.fmt(Deneme.total(e))} net`).join('; ');
    const ctx = `Son 7 günüm:
- Günlük dakikalar: ${days.map((d) => `${U.DAYS_SHORT[d.date.getDay()]} ${d.minutes}`).join(', ')} (hedef ${goal} dk; ${hit}/7 gün tuttu)
- Dersler: ${subj}
${best.length ? `- En verimli saatlerim: ${best.map((h) => U.pad(h) + ':00').join(', ')}
` : ''}${moods ? `- Oturum sonu ruh hâlim: ${moods}
` : ''}${den ? `- Bu haftaki denemeler: ${den}
` : ''}- Bu hafta tekrar edilen kart: ${D().stats.cardReviews || 0} (toplam), hata defterinde bekleyen soru: ${window.HataUI ? HataUI.dueCount() : 0}`;
    ask(`${ctx}

Haftamı birlikte değerlendirelim: neleri iyi yaptığımı somut olarak söyle, verimimi artıracak 2-3 küçük ve uygulanabilir değişiklik öner (zamanlama, ders dağılımı, teknik), ve gelecek hafta için 3 net hedef koy. Kısa, sıcak ve gerçekçi ol.`, '📈 Haftalık değerlendirme');
  }
  function askAboutFile(item) {
    App.showTab('asistan');
    if (!chat || chat.messages.length) newChat(item.name);
    pending = [{ src: 'depo', id: item.id, name: item.name, mime: item.mime }];
    if (item.mime === 'application/pdf') choosePdfRange(pending[0]);
    render();
    setTimeout(() => { const t = $('#ai-input'); if (t) { t.value = t.value || 'Bu belgenin ana fikirlerini açıkla. Anlamadığım yerleri soracağım.'; t.focus(); } }, 50);
  }
  // büyük PDF: tümü (şekillerle) ya da sayfa aralığı (yalnızca metin, ucuz)
  async function choosePdfRange(ref) {
    let pages = 0;
    try { const blob = await attBlob(ref); const pdf = await Depo.openPdf(blob); pages = pdf.numPages; pdf.close(); } catch (e) { return; }
    ref.pages = pages;
    if (pages <= 30) { render(); return; }
    const card = App.openModal(`<h3>📕 ${U.esc(ref.name)}</h3>
      <p class="muted">Bu PDF <b>${pages}</b> sayfa. Tamamını göndermek pahalı olabilir.</p>
      <label class="switch"><input type="radio" name="rng" value="range" checked> Yalnızca şu sayfalar (metin): <input type="number" data-f="a" min="1" max="${pages}" value="1" style="width:5em"> – <input type="number" data-f="b" min="1" max="${pages}" value="${Math.min(pages, 20)}" style="width:5em"></label>
      <label class="switch"><input type="radio" name="rng" value="all"> Tamamı (şekiller ve tablolar dahil)</label>
      <div class="modal-actions"><button class="btn primary" data-act="ok" type="button">Tamam</button></div>`);
    card.addEventListener('click', (e) => {
      if (!e.target.closest('[data-act="ok"]')) return;
      if (card.querySelector('input[name="rng"]:checked').value === 'range') {
        let a = U.clamp(parseInt(card.querySelector('[data-f="a"]').value, 10) || 1, 1, pages);
        let b = U.clamp(parseInt(card.querySelector('[data-f="b"]').value, 10) || a, a, pages);
        ref.range = `${a}-${b}`;
      }
      App.closeModal(); render();
    });
  }

  // ---------- Ekran ----------
  function setupHtml() {
    const sp = spend();
    return `<details class="card ai-setup" ${ready() ? '' : 'open'}>
      <summary>⚙️ Asistan ayarları <span class="muted small">${ready() ? `${MODELS[cfg.model].n} · bu ay ${usd(sp.usd)} / ${usd(cfg.budget)}` : 'kurulum gerekli'}</span></summary>
      <p class="hint">Asistan Claude ile çalışır ve senin <b>Anthropic API anahtarını</b> kullanır (adımlar: Ayarlar → Kılavuz → <b>Eğitim asistanı</b>). Anahtar yalnızca bu cihazda saklanır, veri yedeğine girmez; kimseyle paylaşma.</p>
      <label>API anahtarı</label>
      <div class="inline-form"><input type="password" data-ai="key" placeholder="sk-ant-…" value="${ready() ? '••••••••' + U.esc(cfg.apiKey.slice(-4)) : ''}" autocomplete="off" spellcheck="false"><button class="btn primary" data-ai="save-key" type="button">Kaydet</button></div>
      <label>Model</label>
      <select data-ai="model">${Object.keys(MODELS).map((k) => `<option value="${k}" ${k === cfg.model ? 'selected' : ''}>${MODELS[k].n} — ${MODELS[k].d} ($${MODELS[k].in}/$${MODELS[k].out} milyon jeton)</option>`).join('')}</select>
      <div class="row2">
        <label class="field">Aylık bütçe ($) <input type="number" data-ai="budget" min="1" max="500" step="1" value="${cfg.budget}"></label>
        <label class="field">Anlatım derinliği <select data-ai="effort"><option value="high" ${cfg.effort !== 'medium' ? 'selected' : ''}>Derin (önerilen)</option><option value="medium" ${cfg.effort === 'medium' ? 'selected' : ''}>Daha hızlı</option></select></label>
      </div>
      <label class="switch"><input type="checkbox" data-ai="web" ${cfg.web ? 'checked' : ''}> Gerektiğinde internette güvenilir kaynak arasın (arama başına ~$0,01)</label>
      <p class="muted small">Bu ay: ${sp.req} istek · ${usd(sp.usd)}. Sohbetler bu cihazda saklanır. ${ready() ? '<button class="btn danger small-btn" data-ai="forget" type="button">Anahtarı sil</button>' : ''}</p>
    </details>`;
  }
  function msgHtml(m, i) {
    if (m.role === 'user') {
      const atts = m.content.filter((b) => b.type === 'luna_att');
      const t = (m.content.find((b) => b.type === 'text') || {}).text || '';
      const nl = (x) => U.esc(x).replace(/\n/g, '<br>');
      // uzun mesajlar (ör. deneme verileri) katlanır
      const body = t.length > 420 ? `${nl(t.slice(0, 260))}… <details class="ai-more"><summary>Tamamını göster</summary>${nl(t)}</details>` : nl(t);
      return `<div class="ai-msg user">${atts.length ? `<div class="ai-atts">${atts.map((a) => `<span class="ai-att">${a.mime === 'application/pdf' ? '📕' : '🖼️'} ${U.esc(a.name)}${a.range ? ` · s. ${a.range}` : ''}</span>`).join('')}</div>` : ''}<div class="ai-text">${body}</div></div>`;
    }
    const r = renderAnswer(m.content);
    const fb = (m.content || []).some((b) => b.type === 'fallback');
    return `<div class="ai-msg bot" data-i="${i}"><div class="ai-text">${r.html}</div>
      <div class="ai-foot"><span class="muted small">${MODELS[m.model] ? MODELS[m.model].n : U.esc(m.model || '')}${fb ? ' (yedek model)' : ''} · ${usd(m.cost || 0)}</span>
        <span class="ai-acts"><button class="chip" data-ai="note" data-i="${i}" type="button">📓 Nota kaydet</button><button class="chip" data-ai="cards" data-i="${i}" type="button">🃏 Kart üret</button><button class="chip" data-ai="copy" data-i="${i}" type="button">📋</button></span></div></div>`;
  }
  function render() {
    const root = $('#asistan-root');
    if (!root) return;
    if (!loaded) { loadChats().then(render); return; }
    const hasDeneme = window.Deneme && Deneme.list().length > 0;
    const msgs = chat ? chat.messages : [];
    root.innerHTML = `
      ${setupHtml()}
      <div class="card ai-card">
        <div class="ai-top">
          <select data-ai="chat" aria-label="Sohbetler"><option value="">＋ Yeni sohbet</option>${chats.map((c) => `<option value="${c.id}" ${chat && chat.id === c.id ? 'selected' : ''}>${U.esc(c.title)}</option>`).join('')}</select>
          ${chat && chat.messages.length ? '<button class="icon-btn" data-ai="del-chat" type="button" title="Sohbeti sil">🗑️</button>' : ''}
        </div>
        ${msgs.length || live ? '' : `<div class="ai-empty">
          <div style="font-size:2.2rem">🎓</div>
          <p><b>Ne çalışıyoruz?</b> Konu anlatayım, sorunu çözeyim, PDF'indeki anlamadığın yeri açıklayayım ya da kaynak bulayım.</p>
          <div class="chips ai-quick">
            ${hasDeneme ? '<button class="chip" data-ai="q-deneme" type="button">📊 Denemelerimi analiz et</button>' : ''}
            <button class="chip" data-ai="q-file" type="button">🗂️ Depodan dosya sor</button>
            <button class="chip" data-ai="q-photo" type="button">📷 Soru fotoğrafı çöz</button>
            <button class="chip" data-ai="q-topic" type="button">💡 Konu anlat</button>
            <button class="chip" data-ai="q-src" type="button">🔎 Kaynak öner</button>
          </div></div>`}
        <div class="ai-msgs" id="ai-msgs">${msgs.map(msgHtml).join('')}${live ? `<div class="ai-msg bot live"><div class="ai-text" id="ai-live">${live.text ? md(live.text) : ''}</div><div class="ai-status" id="ai-status">${U.esc(live.status || '')}</div></div>` : ''}</div>
        <div class="ai-compose">
          ${pending.length ? `<div class="ai-atts">${pending.map((a, i) => `<span class="ai-att">${a.mime === 'application/pdf' ? '📕' : '🖼️'} ${U.esc(a.name)}${a.range ? ` · s. ${a.range}` : a.pages ? ` · ${a.pages} sayfa` : ''}<button type="button" data-ai="unatt" data-i="${i}" title="Kaldır">✕</button></span>`).join('')}</div>` : ''}
          <div class="ai-row">
            <label class="icon-btn ai-clip" title="Fotoğraf ya da PDF ekle">📎<input type="file" accept="image/*,application/pdf" hidden data-ai="file"></label>
            <textarea id="ai-input" rows="2" placeholder="${ready() ? 'Sorunu yaz… (Enter gönderir, Shift+Enter yeni satır)' : 'Önce yukarıdan API anahtarını gir'}" ${ready() ? '' : 'disabled'}></textarea>
            ${live ? '<button class="btn soft" data-ai="stop" type="button">■ Durdur</button>' : `<button class="btn primary" data-ai="send" type="button" ${ready() ? '' : 'disabled'}>Gönder</button>`}
          </div>
        </div>
      </div>`;
    if (restoreText) { $('#ai-input').value = restoreText; restoreText = ''; }
    const box = $('#ai-msgs');
    if (box) box.scrollTop = box.scrollHeight;
  }
  let paintT = 0;
  function paintLive() {
    if (paintT) return;
    paintT = requestAnimationFrame(() => {
      paintT = 0;
      const el = $('#ai-live'), st = $('#ai-status');
      if (!el || !live) return;
      el.innerHTML = md(live.text);
      if (st) st.textContent = live.status || '';
      const box = $('#ai-msgs');
      if (box && box.scrollHeight - box.scrollTop - box.clientHeight < 160) box.scrollTop = box.scrollHeight;
    });
  }

  function pickFromDepo() {
    const files = D().files.filter((x) => x.mime === 'application/pdf' || /^image\//.test(x.mime)).sort((a, b) => b.created - a.created);
    if (!files.length) { App.toast('🗂️', 'Depoda PDF ya da fotoğraf yok', 'Kitaplık → Depo’dan ekleyebilir ya da 📎 ile doğrudan seçebilirsin'); return; }
    const card = App.openModal(`<h3>🗂️ Depodan seç</h3><ul class="pick-list">${files.slice(0, 80).map((f) => `<li><button type="button" data-id="${f.id}">${f.mime === 'application/pdf' ? '📕' : '🖼️'} <span>${U.esc(f.name)}<small>${U.esc(f.subjectId ? Store.subject(f.subjectId).name : 'Genel')} · ${f.src === 'drive' ? '☁️' : '📱'}</small></span></button></li>`).join('')}</ul>
      <div class="modal-actions"><button class="btn soft" data-act="cancel" type="button">Vazgeç</button></div>`);
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-act="cancel"]')) { App.closeModal(); return; }
      const b = e.target.closest('[data-id]');
      if (!b) return;
      const it = files.find((f) => f.id === b.dataset.id);
      App.closeModal();
      if (it) askAboutFile(it);
    });
  }

  function bind() {
    const root = $('#asistan-root');
    root.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-ai]');
      if (!b || b.tagName === 'SELECT' || b.tagName === 'TEXTAREA' || (b.tagName === 'INPUT' && b.type !== 'checkbox')) return;
      const act = b.dataset.ai;
      if (act === 'save-key') {
        const v = $('#asistan-root [data-ai="key"]').value.trim();
        if (/^•+/.test(v)) return;
        if (!/^sk-ant-[\w-]{20,}$/.test(v)) { App.toast('🎓', 'Bu bir Anthropic API anahtarına benzemiyor', '"sk-ant-" ile başlamalı'); return; }
        const old = cfg.apiKey;
        cfg.apiKey = v;
        let Anthropic = null;
        try {
          const s = await sdk();
          Anthropic = s.Anthropic;
          await s.client.models.list({ limit: 1 }); // ücretsiz doğrulama
          saveCfg();
          App.toast('🎓', 'Asistan hazır', 'Anahtar doğrulandı ve bu cihaza kaydedildi');
        } catch (err) { cfg.apiKey = old; App.toast('⚠️', 'Anahtar doğrulanamadı', errText(err, Anthropic)); }
        render();
      } else if (act === 'forget') {
        if (!confirm('API anahtarı bu cihazdan silinsin mi?')) return;
        cfg.apiKey = ''; saveCfg(); client = null; render();
      } else if (act === 'send') send($('#ai-input').value);
      else if (act === 'stop') { if (live && live.stream) live.stream.abort(); }
      else if (act === 'unatt') { pending.splice(+b.dataset.i, 1); render(); }
      else if (act === 'del-chat') {
        if (!chat || !confirm('Bu sohbet silinsin mi?')) return;
        await DB.del(chat.id).catch(() => {});
        for (const m of chat.messages) for (const c of m.content || []) if (c.type === 'luna_att' && c.src === 'att') DB.delAtt(c.id).catch(() => {});
        chats = chats.filter((c) => c.id !== chat.id); chat = null; render();
      } else if (act === 'q-deneme') askDeneme();
      else if (act === 'q-file') pickFromDepo();
      else if (act === 'q-photo') { const inp = $('#asistan-root [data-ai="file"]'); inp.setAttribute('capture', 'environment'); inp.accept = 'image/*'; inp.click(); setTimeout(() => { inp.removeAttribute('capture'); inp.accept = 'image/*,application/pdf'; }, 1000); }
      else if (act === 'q-topic') { const t = $('#ai-input'); t.value = 'Şu konuyu bana baştan, örneklerle anlat: '; t.focus(); }
      else if (act === 'q-src') { const t = $('#ai-input'); t.value = 'Şu konuyu derinlemesine çalışmak için güvenilir kaynaklar öner (ders kitabı bölümleri, derleme makaleler, resmî kılavuzlar), her biri için neden faydalı olduğunu yaz: '; t.focus(); }
      else if (act === 'note' || act === 'cards' || act === 'copy') {
        const m = chat && chat.messages[+b.dataset.i];
        if (!m) return;
        const r = renderAnswer(m.content);
        const q = chat.messages[+b.dataset.i - 1];
        const qText = q ? ((q.content.find((x) => x.type === 'text') || {}).text || '') : '';
        if (act === 'copy') {
          try { await navigator.clipboard.writeText(r.text); App.toast('📋', 'Kopyalandı'); } catch (err) { App.toast('⚠️', 'Kopyalanamadı'); }
        } else if (act === 'note') {
          const src = r.sources.length ? '\n\nKaynaklar:\n' + r.sources.map((s, i) => `- [${i + 1}] ${s.label}${s.url ? ' ' + s.url : ''}`).join('\n') : '';
          D().notes.push({ id: U.uid(), subjectId: (D().subjects[0] && D().subjects[0].id) || '', title: ('🎓 ' + (qText || chat.title)).slice(0, 80), body: (r.text + src).slice(0, 20000), created: Date.now(), updated: Date.now(), pinned: false });
          App.save(); App.toast('📓', 'Not olarak kaydedildi', 'Kitaplık → Notlar');
        } else {
          const att = q && q.content.find((x) => x.type === 'luna_att');
          makeCards({ text: r.text.slice(0, 30000), att: att ? { ...att } : null });
        }
      }
    });
    root.addEventListener('change', async (e) => {
      const t = e.target;
      if (t.dataset.ai === 'model') { cfg.model = t.value; saveCfg(); render(); }
      else if (t.dataset.ai === 'budget') { cfg.budget = U.clamp(parseFloat(t.value) || 5, 1, 500); saveCfg(); render(); }
      else if (t.dataset.ai === 'effort') { cfg.effort = t.value; saveCfg(); }
      else if (t.dataset.ai === 'web') { cfg.web = t.checked; saveCfg(); }
      else if (t.dataset.ai === 'chat') {
        if (live) return;
        chat = t.value ? chats.find((c) => c.id === t.value) || null : null;
        pending = []; render();
      } else if (t.dataset.ai === 'file' && t.files && t.files[0]) {
        const f = t.files[0];
        t.value = '';
        if (!/^image\/|application\/pdf/.test(f.type)) { App.toast('🎓', 'Fotoğraf ya da PDF seçebilirsin'); return; }
        if (f.size > 30 * 1048576) { App.toast('🎓', 'Dosya çok büyük', 'En fazla 30 MB; büyük PDF’leri Depo’ya ekleyip sayfa aralığı seçebilirsin'); return; }
        const id = U.uid();
        await DB.putAtt(id, f);
        if (!chat) newChat(f.name);
        const ref = { src: 'att', id, name: f.name || 'foto.jpg', mime: f.type };
        pending.push(ref);
        if (f.type === 'application/pdf') choosePdfRange(ref);
        render();
        const ta = $('#ai-input');
        if (ta && !ta.value) ta.value = /^image\//.test(f.type) ? 'Bu soruyu adım adım çöz ve hangi konuya ait olduğunu söyle.' : 'Bu belgeyi açıkla.';
      }
    });
    root.addEventListener('keydown', (e) => {
      if (e.target.id === 'ai-input' && e.key === 'Enter' && !e.shiftKey && !e.isComposing && matchMedia('(pointer: fine)').matches) { e.preventDefault(); send(e.target.value); }
    });
    // kaynak işaretine dokununca alıntıyı göster (dokunmatikte title görünmez)
    root.addEventListener('click', (e) => {
      const c = e.target.closest('sup.cite');
      if (c && c.title) App.toast('📄', `Kaynak ${c.dataset.cite}`, c.title, 7000);
    });
  }

  return {
    init(app) { App = app; loadCfg(); bind(); },
    render,
    askDeneme,
    askAboutFile,
    ask,
    askWeek,
    makeCards,
    status() { const sp = spend(); return { ready: ready(), model: MODELS[cfg.model].n, usd: sp.usd, budget: cfg.budget, req: sp.req, web: cfg.web, err: cfg.lastErr || '' }; },
    // testler ve diğer modüller için
    _md: md, _renderAnswer: renderAnswer, _params: (m) => requestParams(m),
  };
})();

if (typeof window !== 'undefined') { window.Asistan = Asistan; }
