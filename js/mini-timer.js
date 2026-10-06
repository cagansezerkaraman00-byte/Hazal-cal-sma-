/* Compact external companion. Opening Document PiP requires a user gesture. */
const MiniTimer = (() => {
  let app, pip=null, tickId=null, opening=false, away=false;
  const css='html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#17192b}canvas{display:block;width:100%;height:100%;object-fit:contain;image-rendering:pixelated}';
  function render(canvas) {
    const g=canvas.getContext('2d'),now=new Date(),s=Timer.state();
    g.fillStyle='#17192b';g.fillRect(0,0,560,200);
    Scene.sleepingCompanions(canvas,Date.now()/1000);
    g.fillStyle='#655d7b';g.fillRect(254,28,2,144);
    g.fillStyle='#d4c7e5';g.font='21px system-ui';
    g.fillText(U.hm(now)+'  ·  '+now.toLocaleDateString('tr-TR',{day:'numeric',month:'short'}),278,38);
    g.fillStyle='#fff1da';g.font='bold 48px system-ui';
    g.fillText(U.fmtClock(s.countdown?s.remaining:s.elapsed),276,99);
    g.font='19px system-ui';g.fillStyle='#bcb2d2';
    g.fillText((s.phase==='focus'?'Odak':'Mola')+' · '+Math.floor(Math.max(0,s.elapsed)/60)+' dk'+(s.running?'':' · ⏸'),278,130);
    const chip=document.querySelector('#hud-weather');
    const weather=chip&&!chip.classList.contains('hidden')?chip.textContent.trim():'';
    g.font='18px system-ui';g.fillText(weather,278,163);
  }
  function cleanup() {if(tickId){clearInterval(tickId);tickId=null;}pip=null;away=false;}
  function close() {if(pip&&!pip.closed)pip.close();cleanup();}
  async function open() {
    if(opening)return;
    if(!('documentPictureInPicture' in window)) {
      app.toast('🐾','Bu cihazda dış mini pencere desteklenmiyor','Luna içinde kart açılmayacak. Uygulamadan çıkınca sayaç bildirimi için bildirimleri aç.');
      if(Store.data.timer){Store.data.timer.miniBackground=true;Store.save();}
      return;
    }
    if(pip&&!pip.closed){pip.focus();return;}
    opening=true;
    try {
      const next=await window.documentPictureInPicture.requestWindow({width:280,height:100,preferInitialWindowPlacement:true});
      pip=next;away=document.hidden;
      if(Store.data.timer){Store.data.timer.miniBackground=true;Store.save();}
      app.allowExit('miniTimer');
      const style=next.document.createElement('style');style.textContent=css;next.document.head.append(style);
      const canvas=next.document.createElement('canvas');canvas.width=560;canvas.height=200;
      canvas.setAttribute('aria-label','Kucak kucağa uyuyan Luna, Vesper ve Güçlü; saat ve çalışma sayacı');
      next.document.body.append(canvas);next.document.title='Luna · Mini sayaç';
      next.addEventListener('pagehide',()=>{if(pip===next){cleanup();if(document.hidden)LunaNotify.timerSnapshot();}},{once:true});
      render(canvas);tickId=setInterval(()=>render(canvas),1000);
    } catch(e) {app.toast('🐾','Mini pencere açılamadı','Destekleyen tarayıcıda Mini pencere düğmesine dokunarak açabilirsin.');}
    finally {opening=false;}
  }
  function init(a) {
    app=a;
    const button=document.querySelector('#mini-timer-open');
    if(button){button.textContent='🐾 Mini pencere';button.title='Uygulamadan ayrılmadan önce aç; geri döndüğünde kapanır.';button.addEventListener('click',open);}
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){away=true;return;}
      if(away&&pip)close();
    });
    window.addEventListener('focus',()=>{if(pip&&away&&!document.hidden)close();});
  }
  return {init,open,close,render};
})();
if(typeof window!=='undefined')window.MiniTimer=MiniTimer;