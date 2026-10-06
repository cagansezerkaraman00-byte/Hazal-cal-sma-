/* Compact external companion. Opening Document PiP requires a user gesture. */
const MiniTimer = (() => {
  let app, pip=null, tickId=null, opening=false, away=false;
  const css='html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#fff4e8}canvas{display:block;width:100%;height:100%;object-fit:contain}';
  let family=null, lastCanvas=null;
  function art() {
    if(!family && typeof Image!=='undefined') {
      family=new Image();
      family.onload=()=>{if(lastCanvas)render(lastCanvas);};
      family.src=new URL('assets/sleeping-family.png',document.baseURI).href;
    }
    return family;
  }
  function render(canvas) {
    lastCanvas=canvas;
    const g=canvas.getContext('2d'),now=new Date(),s=Timer.state(),picture=art();
    g.fillStyle='#fff4e8';g.fillRect(0,0,640,240);
    g.fillStyle='#eed6c1';g.fillRect(0,0,232,240);
    if(picture?.complete && picture.naturalWidth) {
      g.save();g.beginPath();g.roundRect(12,14,208,212,18);g.clip();
      g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
      g.drawImage(picture,12,16,208,208);g.restore();
    } else {
      g.font='22px system-ui';g.fillStyle='#795443';g.fillText('Luna ve ailesi',36,120);
    }
    g.fillStyle='#876750';g.font='500 21px system-ui';
    g.fillText(U.hm(now),252,36);
    g.textAlign='right';g.fillText(now.toLocaleDateString('tr-TR',{day:'numeric',month:'long'}),618,36);g.textAlign='left';
    g.fillStyle='#402e2a';g.font='600 67px system-ui';
    g.fillText(U.fmtClock(s.countdown?s.remaining:s.elapsed),249,110);
    const label=s.fresh?'Hazır':!s.running?'Duraklatıldı':s.phase==='focus'?'Odak zamanı':'Mola zamanı';
    g.font='500 23px system-ui';g.fillStyle='#85614e';g.fillText(label,252,145);
    g.textAlign='right';g.fillText(Math.floor(Math.max(0,s.elapsed)/60)+' dk',618,145);g.textAlign='left';
    g.fillStyle='#e8d6c6';g.fillRect(252,165,366,5);
    g.fillStyle='#ac7756';g.fillRect(252,165,366*Math.max(0,Math.min(1,s.progress||0)),5);
    const chip=document.querySelector('#hud-weather');
    const weather=chip&&!chip.classList.contains('hidden')?chip.textContent.trim():'Birlikte, sakince.';
    g.font='20px system-ui';g.fillStyle='#8b705f';g.fillText(weather,252,207);
  }
  function cleanup() {if(tickId){clearInterval(tickId);tickId=null;}pip=null;away=false;lastCanvas=null;}
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
      const next=await window.documentPictureInPicture.requestWindow({width:320,height:120,preferInitialWindowPlacement:true});
      pip=next;away=document.hidden;
      if(Store.data.timer){Store.data.timer.miniBackground=true;Store.save();}
      app.allowExit('miniTimer');
      const style=next.document.createElement('style');style.textContent=css;next.document.head.append(style);
      const canvas=next.document.createElement('canvas');canvas.width=640;canvas.height=240;
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