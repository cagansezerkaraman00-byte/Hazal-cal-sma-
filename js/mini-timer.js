/* Mini sayaç: Document PiP destekleniyorsa dış pencere, diğer cihazlarda uygulama içi kart. */
const MiniTimer = (() => {
  let app, card, canvas, pip=null, pipCanvas=null, tickId=null, weather=()=>null;
  const css='body{margin:0;background:#17192b;color:#fff;font:14px system-ui}canvas{display:block;width:100%;height:auto;image-rendering:pixelated}';
  function render(target) {
    if(!target)return;
    const g=target.getContext('2d'),now=new Date(),s=Timer.state();
    g.fillStyle='#17192b';g.fillRect(0,0,600,310);
    g.fillStyle='#eacda3';g.font='bold 18px system-ui';g.fillText('LUNA · '+(s.phase==='focus'?'ODAK':'MOLA'),22,28);
    g.fillStyle='#fff4df';g.font='bold 40px system-ui';g.fillText(U.fmtClock(s.countdown?s.remaining:s.elapsed),22,77);
    g.font='16px system-ui';g.fillStyle='#c1c6dd';
    g.fillText(U.hm(now)+' · '+now.toLocaleDateString('tr-TR',{day:'numeric',month:'long',weekday:'short'}),22,103);
    const w=weather();const chip=document.querySelector('#hud-weather');
    const weatherText=w&&chip&&!chip.classList.contains('hidden')?chip.textContent.trim():'Hava durumu yok';
    g.fillText(weatherText.slice(0,45),22,128);
    const mins=Math.floor(Math.max(0,s.elapsed)/60);
    g.fillText(mins+' dk · '+(s.running?'Çalışıyor':s.fresh?'Hazır':'Duraklatıldı'),355,69);
    Scene.companionPortraits(target,155,145,Date.now()/1000);
  }
  function tick(){render(canvas);render(pipCanvas);}
  function stopIfClosed(){if(!card&&!pip&&tickId){clearInterval(tickId);tickId=null;}}
  function close() {card?.remove();card=null;canvas=null;stopIfClosed();}
  async function external() {
    if(!('documentPictureInPicture' in window))return;
    try {
      if(pip&&!pip.closed){pip.focus();return;}
      app.allowExit('miniTimer');
      pip=await window.documentPictureInPicture.requestWindow({width:400,height:245});
      const style=pip.document.createElement('style');style.textContent=css;pip.document.head.append(style);
      pipCanvas=pip.document.createElement('canvas');pipCanvas.width=600;pipCanvas.height=310;
      pip.document.body.append(pipCanvas);
      const back=pip.document.createElement('button');back.textContent='Luna’ya dön';back.onclick=()=>{window.focus();pip.close();};pip.document.body.append(back);
      pip.addEventListener('pagehide',()=>{pip=null;pipCanvas=null;LunaNotify.timerSnapshot(true);stopIfClosed();},{once:true});
      tick();
    }catch(e){app.toast('🐾','Dış pencere açılamadı','Mini sayaç uygulamanın içinde açık kalıyor.');}
  }
  function open() {
    if(card){card.scrollIntoView({block:'nearest'});return;}
    if(Store.data.timer){Store.data.timer.miniBackground=true;Store.save();}
    card=document.createElement('aside');card.className='luna-mini-panel';card.setAttribute('aria-label','Luna mini sayaç');
    card.innerHTML='<div class="mini-handle"><b>🐾 Mini sayaç</b><button type="button" data-mini="close" aria-label="Mini sayacı kapat">✕</button></div><canvas width="600" height="310" aria-label="Saat, hava ve çalışma sayacı"></canvas><div class="mini-actions"><button type="button" data-mini="toggle">Başlat / duraklat</button><button type="button" data-mini="external">Ekran dışında aç</button></div><p class="mini-help"></p>';
    document.body.append(card);canvas=card.querySelector('canvas');
    const support='documentPictureInPicture' in window;
    card.querySelector('[data-mini="external"]').hidden=!support;
    card.querySelector('.mini-help').textContent=support?'Başka uygulamaların üstünde görmek için Ekran dışında aç’a dokun.':'Bu cihazda mini kart yalnızca Luna içinde görünür. Bu oturum arka planda devam eder; logo ve bitiş saati için bildirimleri aç.';
    card.addEventListener('click',e=>{const k=e.target.closest('[data-mini]')?.dataset.mini;
      if(k==='close'){close();LunaNotify.timerSnapshot(true);}else if(k==='external')external();else if(k==='toggle')Timer.toggle();});
    const handle=card.querySelector('.mini-handle');let drag=null;
    handle.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;const r=card.getBoundingClientRect();drag={x:e.clientX-r.left,y:e.clientY-r.top};handle.setPointerCapture(e.pointerId);});
    handle.addEventListener('pointermove',e=>{if(!drag)return;card.style.left=Math.max(0,Math.min(innerWidth-card.offsetWidth,e.clientX-drag.x))+'px';card.style.top=Math.max(0,Math.min(innerHeight-card.offsetHeight,e.clientY-drag.y))+'px';card.style.right='auto';card.style.bottom='auto';});
    const release=()=>{drag=null;};handle.addEventListener('pointerup',release);handle.addEventListener('pointercancel',release);
    tick();if(!tickId)tickId=setInterval(tick,1000);
  }
  function init(a,w){app=a;weather=w||weather;document.querySelector('#mini-timer-open')?.addEventListener('click',open);}
  return {init,open,close};
})();
if(typeof window!=='undefined')window.MiniTimer=MiniTimer;