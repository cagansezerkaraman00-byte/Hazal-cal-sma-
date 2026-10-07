/* Luna bildirimleri: sayfa çalışırken hatırlatma; kapalı uygulama için push sunucusu gerekir. */
const LunaNotify = (() => {
  let app, started = Date.now(), lastTimerKey = '', checking = false;
  const asset = name => new URL('icons/' + name, location.href).href;
  const day = now => U.dateKey(now);
  function memory(now = new Date()) {
    let m = Store.data.notificationMemory;
    if (!m || m.day !== day(now)) m = { day: day(now), sent: [], count: 0, lastAt: 0 };
    Store.data.notificationMemory = m;
    return m;
  }
  function options(body, extra = {}) {
    return { body, icon: asset('icon-192.png'), badge: asset('notification-badge.png'),
      tag: 'luna-message', data: { tab: 'home' }, ...extra };
  }
  async function send(title, body, extra = {}) {
    if (!Store.data.settings.notify || !('Notification' in window) || Notification.permission !== 'granted') return false;
    try {
      const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      if (!reg) return false; // mobil tarayıcılarda new Notification güvenilir değildir
      await reg.showNotification(title, options(body, extra));
      return true;
    } catch (e) { return false; }
  }
  // uygun hatırlatmalar öncelik sırasıyla; bugün gönderilmiş tür atlanır (biri gönderildi diye diğerleri tıkanmasın)
  function candidates(data, now = new Date(), sessionStarted = started) {
    const hour = now.getHours(), out = [];
    if (hour < 9 || hour >= 22 || !data.settings.studyReminders) return out;
    const timer = data.timer;
    if (timer && timer.running) return out; // çalışma ve molayı bölme
    const today = day(now);
    const minutes = data.sessions.reduce((n,s) => n + (day(new Date(s.start || s.end)) === today ? Math.max(0,+s.minutes || 0) : 0),0);
    const pending = data.tasks.filter(t => !t.done && t.due && t.due <= today);
    if (pending.length && hour >= 17) out.push({kind:'remindTasks',vars:{count:pending.length}});
    if (timer && timer.phase === 'focus' && timer.accum > 0 && timer.pausedAt && +now - timer.pausedAt >= 30*60000)
      out.push({kind:'remindPaused'});
    if (minutes === 0 && hour >= 17) out.push({kind:'remindStart'});
    const goal = Math.max(0,+data.settings.dailyGoal || 0);
    if (goal > minutes && minutes > 0 && hour >= 18) out.push({kind:'remindGoal',vars:{minutes:Math.ceil(goal-minutes)}});
    const last = Math.max(sessionStarted,...data.sessions.map(s=>+s.end || +s.start || 0));
    if (+now-last >= 120*60000) out.push({kind:'remindAway'});
    return out;
  }
  function choose(data, now = new Date(), sessionStarted = started) { return candidates(data, now, sessionStarted)[0] || null; }
  async function check() {
    // uygulama içindeki (Luna'nın söylediği) hatırlatma bildirim izni istemez; sistem bildirimi send() içinde izne bakar
    if (checking || !app) return;
    checking = true;
    try {
    const now=new Date(), m=memory(now), item=candidates(Store.data,now).find(c=>!m.sent.includes(c.kind));
    if (!item || m.count>=3 || (m.lastAt && +now-m.lastAt<90*60000)) return;
    const body=Messages.get(item.kind,item.vars);
    let delivered=false;
    if (document.hidden) delivered=await send('Luna seni çağırıyor 🐾',body,{tag:'luna-study-reminder'});
    // Luna az önce konuştuysa (ör. dönüşte "sayaç durdu") onun sözünü ezme; sonraki dakikada yeniden dene
    // açılıştan sonraki ilk 10 dakika Luna'nın kendi karşılaması yeter; hatırlatma üst üste binmesin
    else if (!app.isBusy() && !(app.quietFor && app.quietFor(60000)) && Date.now() - started > 10 * 60000) { app.sayText(body,{emotion:'tender'}); delivered=true; }
    if (delivered) {m.sent.push(item.kind);m.count++;m.lastAt=+now;Store.save();}
    } finally { checking = false; }
  }
  async function timerSnapshot(force=false) {
    if (!document.hidden && !force) return false;
    const s=Timer.state();
    if (!s.running) {await clearTimer(); return false;}
    const end=s.countdown?new Date(Date.now()+s.remaining*1000):null;
    const label=s.phase==='focus'?'Odak':'Mola';
    // Tam odakta izinsiz çıkışta sayaç 15 sn sonra durur: bitiş saati vaat etme
    const a=Store.data.timer&&Store.data.timer.away;
    const willPause=s.phase==='focus'&&Store.data.settings.pauseOnLeave&&a&&!a.app;
    const body=willPause ? 'Tam odak: 15 sn içinde dönmezsen sayaç durur · Kalan '+U.fmtClock(s.countdown?s.remaining:s.elapsed)
      : (end ? 'Bitiş '+U.hm(end)+' · Kalan '+U.fmtClock(s.remaining) : 'Geçen '+U.fmtClock(s.elapsed))+' · Dokunup güncel sayacı aç.';
    const key=[s.firstStart,s.resumedAt,s.phase,willPause?1:0].join(':');
    if (!force && key===lastTimerKey) return false;
    const ok=await send('Luna · '+label+' sayacı',body,{tag:'luna-timer',silent:true,renotify:false,data:{tab:'home'}});
    if(ok)lastTimerKey=key;
    return ok;
  }
  async function clearTimer() {
    lastTimerKey='';
    try { const reg=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration();
      if(reg)for(const n of await reg.getNotifications({tag:'luna-timer'}))n.close();
    }catch(e){}
  }
  function init(a) {
    app=a;
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden)timerSnapshot();
      else {clearTimer();check();}
    });
    setInterval(check,60000);
    setInterval(()=>{if(lastTimerKey&&!Timer.state().running)clearTimer();},5000);
    document.querySelector('#test-notification')?.addEventListener('click',async()=>{
      const ok=await send('Luna burada 🐾','Anneciğim, logom ve mesajım görünüyor mu?',{tag:'luna-test'});
      app.toast(ok?'🔔':'🔕',ok?'Test bildirimi gönderildi':'Bildirim gönderilemedi',
        ok?'Görünümü cihazın bildirim panelinde kontrol et.':'Bildirim iznini ve cihaz ayarlarını kontrol et.');
    });
    navigator.serviceWorker?.addEventListener('message',e=>{
      if(e.data?.type==='luna-open-tab')app.showTab(e.data.tab==='settings'?'settings':'home');
    });
  }
  return {init,send,check,choose,candidates,options,timerSnapshot,clearTimer};
})();
if(typeof window!=='undefined')window.LunaNotify=LunaNotify;