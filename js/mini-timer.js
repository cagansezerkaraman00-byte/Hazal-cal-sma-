/* Compact external companion. Opening Document PiP requires a user gesture. */
const MiniTimer = (() => {
  let app, pip=null, tickId=null, opening=false, away=false;
  const css='html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#fff4e8}canvas{display:block;width:100%;height:100%;object-fit:contain}';
  const themes = {
    cream: {name:'Sıcak krem',bg:'#fff4e8',panel:'#eed6c1',ink:'#402e2a',muted:'#85614e',track:'#e8d6c6',accent:'#ac7756'},
    lavender: {name:'Lavanta',bg:'#f4efff',panel:'#ddd3ef',ink:'#38284c',muted:'#705c87',track:'#ddd2ed',accent:'#9474bb'},
    sage: {name:'Adaçayı',bg:'#edf5ed',panel:'#cfdfcf',ink:'#293e30',muted:'#546e5b',track:'#d1dfd2',accent:'#719477'},
    rose: {name:'Gül kurusu',bg:'#fff0f2',panel:'#efd0d7',ink:'#542d3a',muted:'#8b5b6b',track:'#eed3dc',accent:'#b87b91'},
    midnight: {name:'Gece mavisi',bg:'#1c263b',panel:'#27344c',ink:'#f6ebdc',muted:'#b7c4dc',track:'#3a4863',accent:'#d6ae79'}
  };
  const palette = () => themes[Store.data.settings?.miniTheme] || themes.cream;
  let family=null, lastCanvas=null;
  function refreshTheme() {
    if(lastCanvas)render(lastCanvas);
  }
  function art() {
    if(!family && typeof Image!=='undefined') {
      family=new Image();
      family.onload=()=>{if(lastCanvas)render(lastCanvas);};
      family.src=new URL('assets/sleeping-family.jpg',document.baseURI).href;
    }
    return family;
  }
  function decorations(g, theme) {
    const kind=Object.keys(themes).find(k=>themes[k]===theme);
    const dot=(x,y,r,color)=>{g.fillStyle=color;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();};
    const star=(x,y,r,color)=>{g.fillStyle=color;g.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4;const d=i%2?r*.28:r;const px=x+Math.cos(a)*d,py=y+Math.sin(a)*d;i?g.lineTo(px,py):g.moveTo(px,py);}g.closePath();g.fill();};
    g.save();
    if(kind==='midnight') {
      [[496,198,4],[515,223,3],[558,191,3],[600,222,4],[623,185,3]].forEach(([x,y,r])=>star(x,y,r,'#e8c793'));
      dot(581,206,13,'#f3d8a3');dot(587,201,12,theme.bg);
      [[28,6],[74,233],[190,7],[239,45],[634,80],[633,152]].forEach(([x,y])=>dot(x,y,1.5,'#c8d4ed'));
    } else if(kind==='sage') {
      [[512,215,8],[546,202,10],[587,219,8],[611,194,7]].forEach(([x,y,r],i)=>{
        g.strokeStyle='#709071';g.lineWidth=2;g.beginPath();g.moveTo(x,y);g.lineTo(x-4,236);g.stroke();
        for(let j=0;j<5;j++)dot(x+Math.cos(j*1.257)*r,y+Math.sin(j*1.257)*r,r*.62,i%2?'#fff9dc':'#e9b9b1');
        dot(x,y,r*.45,'#d5a751');
      });
    } else if(kind==='lavender') {
      [520,549,578,606].forEach((x,i)=>{
        g.strokeStyle='#859178';g.lineWidth=2;g.beginPath();g.moveTo(x,237);g.lineTo(x-6,193+i%2*9);g.stroke();
        for(let j=0;j<4;j++){dot(x-8-j,200+j*6+i%2*9,3.7,'#b6a0d0');dot(x-1-j,203+j*6+i%2*9,3.7,'#9476b4');}
      });
    } else if(kind==='rose') {
      [[524,204],[568,220],[605,198]].forEach(([x,y])=>{
        g.fillStyle='#c88c9e';g.beginPath();g.moveTo(x,y+9);g.bezierCurveTo(x-20,y-3,x-7,y-15,x,y-5);g.bezierCurveTo(x+7,y-15,x+20,y-3,x,y+9);g.fill();
      });
      dot(548,191,3,'#dfb3bd');dot(591,234,3,'#dfb3bd');
    } else {
      dot(582,208,13,'#ddb17d');
      g.strokeStyle='#d4a573';g.lineWidth=2;
      for(let i=0;i<8;i++){const a=i*Math.PI/4;g.beginPath();g.moveTo(582+Math.cos(a)*18,208+Math.sin(a)*18);g.lineTo(582+Math.cos(a)*23,208+Math.sin(a)*23);g.stroke();}
      star(530,204,5,'#cda57d');star(505,227,3,'#cda57d');
    }
    g.restore();
  }
  function render(canvas) {
    lastCanvas=canvas;
    const g=canvas.getContext('2d'),now=new Date(),s=Timer.state(),picture=art(),theme=palette();
    if(pip&&!pip.closed)pip.document.body.style.background=theme.bg;
    g.fillStyle=theme.bg;g.fillRect(0,0,640,240);
    g.fillStyle=theme.panel;g.fillRect(0,0,232,240);
    decorations(g,theme);
    if(picture?.complete && picture.naturalWidth) {
      g.save();g.beginPath();g.roundRect(12,14,208,212,18);g.clip();
      g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
      g.drawImage(picture,12,16,208,208);g.restore();
    } else {
      g.font='22px system-ui';g.fillStyle=theme.muted;g.fillText('Luna ve ailesi',36,120);
    }
    g.fillStyle=theme.muted;g.font='500 21px system-ui';
    g.fillText(U.hm(now),252,36);
    g.textAlign='right';g.fillText(now.toLocaleDateString('tr-TR',{day:'numeric',month:'long'}),618,36);g.textAlign='left';
    g.fillStyle=theme.ink;g.font='600 67px system-ui';
    g.fillText(U.fmtClock(s.countdown?s.remaining:s.elapsed),249,110);
    const label=s.fresh?'Hazır':!s.running?'Duraklatıldı':s.phase==='focus'?'Odak zamanı':'Mola zamanı';
    g.font='500 23px system-ui';g.fillStyle=theme.muted;g.fillText(label,252,145);
    g.textAlign='right';g.fillText(Math.floor(Math.max(0,s.elapsed)/60)+' dk',618,145);g.textAlign='left';
    g.fillStyle=theme.track;g.fillRect(252,165,366,5);
    g.fillStyle=theme.accent;g.fillRect(252,165,366*Math.max(0,Math.min(1,s.progress||0)),5);
    const chip=document.querySelector('#hud-weather');
    const weather=chip&&!chip.classList.contains('hidden')?chip.textContent.trim():'Birlikte, sakince.';
    // bitiş saati: telefon arka planda çizimi dondursa bile pencere doğru bilgi versin
    const end=s.running&&s.countdown?'Bitiş '+U.hm(new Date(Date.now()+Math.max(0,s.remaining)*1000))+' · ':'';
    g.font='20px system-ui';g.fillStyle=theme.muted;g.fillText(end+weather,252,207,366);
  }
  /* Mini pencere iki yolla açılır:
     - doc:   Document Picture-in-Picture (bilgisayarda Chrome/Edge)
     - video: sayaç tuvali → video akışı → video "resim içinde resim" (iPad/iPhone Safari, Android Chrome)
     İkisi de yoksa düğme ve tema seçimi hiç görünmez. Açık olup olmadığı her an canlı sorulur (isOpen);
     sayaca kalıcı bir işaret yazılmaz, böylece Tam odak yanlışlıkla kapanmaz. */
  let mode=null, vid=null, vcanvas=null, vstream=null, vtick=null;
  const canDoc=()=>typeof window!=='undefined'&&'documentPictureInPicture' in window;
  function canVideo() {
    try {
      if(typeof HTMLCanvasElement==='undefined'||!HTMLCanvasElement.prototype.captureStream)return false;
      const v=document.createElement('video');
      if(document.pictureInPictureEnabled&&typeof v.requestPictureInPicture==='function')return true;
      return typeof v.webkitSupportsPresentationMode==='function'&&v.webkitSupportsPresentationMode('picture-in-picture');
    } catch(e) {return false;}
  }
  const supported=()=>canDoc()||canVideo();
  const videoInPip=()=>!!vid&&(document.pictureInPictureElement===vid||vid.webkitPresentationMode==='picture-in-picture');
  function isOpen() {return mode==='doc'?!!(pip&&!pip.closed):mode==='video'?videoInPip():false;}
  function cleanup() {if(tickId){clearInterval(tickId);tickId=null;}pip=null;away=false;lastCanvas=null;if(mode==='doc')mode=null;}
  function teardownVideo() {
    if(vtick){clearInterval(vtick);vtick=null;}
    if(vstream){try{vstream.getTracks().forEach(t=>t.stop());}catch(e){}vstream=null;}
    if(vid){try{vid.pause();vid.srcObject=null;vid.remove();}catch(e){}vid=null;}
    vcanvas=null;if(mode==='video')mode=null;away=false;
  }
  function onVideoLeave() {
    if(mode!=='video')return;
    teardownVideo();
    if(document.hidden&&window.LunaNotify)LunaNotify.timerSnapshot();
  }
  // video PiP için hazırlık: dokunuşun hemen başında (pointerdown) başlar ki "click"te PiP anında istenebilsin
  function prepareVideo() {
    if(vid)return vid;
    vcanvas=document.createElement('canvas');vcanvas.width=640;vcanvas.height=240;
    render(vcanvas);
    vstream=vcanvas.captureStream(2);
    const v=document.createElement('video');
    v.muted=true;v.defaultMuted=true;v.playsInline=true;v.autoplay=true;
    v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');v.setAttribute('muted','');v.setAttribute('aria-hidden','true');
    v.className='mini-pip-video';v.disablePictureInPicture=false;
    v.srcObject=vstream;
    document.body.appendChild(v);
    v.addEventListener('leavepictureinpicture',onVideoLeave);
    v.addEventListener('webkitpresentationmodechanged',()=>{if(v===vid&&v.webkitPresentationMode!=='picture-in-picture'&&mode==='video')onVideoLeave();});
    // PiP penceresindeki duraklat düğmesi görüntüyü dondurmasın
    v.addEventListener('pause',()=>{if(v===vid&&videoInPip())v.play().catch(()=>{});});
    vid=v;
    vtick=setInterval(()=>{if(vcanvas)render(vcanvas);},1000);
    v.play().catch(()=>{});
    // açılmadan bırakılırsa bir dakika sonra temizle
    setTimeout(()=>{if(vid===v&&mode!=='video')teardownVideo();},60000);
    return v;
  }
  function enterVideoPip(v) {
    if(v.paused)v.play().catch(()=>{});
    if(document.pictureInPictureEnabled&&typeof v.requestPictureInPicture==='function')return v.requestPictureInPicture();
    v.webkitSetPresentationMode('picture-in-picture');
    return Promise.resolve();
  }
  function openedVideo() {
    mode='video';away=document.hidden;
    app.allowExit('miniTimer');
    app.toast('🐾','Mini pencere açıldı','Başka uygulamaya geçince köşede kalır; Luna\'ya dönünce kapanır.');
  }
  function openVideo() {
    const v=prepareVideo();
    const fail=()=>{teardownVideo();app.toast('🐾','Mini pencere açılamadı','Bir kez daha dokun. Olmazsa cihazın Ayarlar → Genel → Resim İçinde Resim seçeneğini aç.');};
    // meta veri hazırsa PiP aynı dokunuşta istenir (iOS dokunuş gerektirir)
    if(v.readyState>=1){enterVideoPip(v).then(openedVideo,fail);return;}
    opening=true;
    const t=setTimeout(()=>{opening=false;fail();},4000);
    v.addEventListener('loadedmetadata',()=>{clearTimeout(t);opening=false;enterVideoPip(v).then(openedVideo,fail);},{once:true});
  }
  function closeVideo() {
    try {
      if(document.pictureInPictureElement===vid&&document.exitPictureInPicture)document.exitPictureInPicture().catch(()=>{});
      else if(vid&&vid.webkitPresentationMode==='picture-in-picture')vid.webkitSetPresentationMode('inline');
    } catch(e) {}
    teardownVideo();
  }
  function close() {
    if(mode==='video'){closeVideo();return;}
    if(pip&&!pip.closed)pip.close();cleanup();
  }
  async function openDoc() {
    if(pip&&!pip.closed){pip.focus();return;}
    opening=true;
    try {
      const next=await window.documentPictureInPicture.requestWindow({width:320,height:120,preferInitialWindowPlacement:true});
      pip=next;mode='doc';away=document.hidden;
      app.allowExit('miniTimer');
      const style=next.document.createElement('style');style.textContent=css;next.document.head.append(style);
      const canvas=next.document.createElement('canvas');canvas.width=640;canvas.height=240;
      canvas.setAttribute('aria-label','Kucak kucağa uyuyan Luna, Vesper ve Güçlü; saat ve çalışma sayacı');
      next.document.body.append(canvas);next.document.title='Luna · Mini sayaç';
      next.addEventListener('pagehide',()=>{if(pip===next){cleanup();if(document.hidden)LunaNotify.timerSnapshot();}},{once:true});
      render(canvas);tickId=setInterval(()=>render(canvas),1000);
    } catch(e) {app.toast('🐾','Mini pencere açılamadı','Bir kez daha dokunarak dene.');}
    finally {opening=false;}
  }
  function open() {
    if(opening)return;
    if(isOpen()){if(mode==='doc'&&pip)pip.focus();return;}
    if(canDoc())return openDoc();
    if(canVideo())return openVideo();
    app.toast('🐾','Bu cihazda mini pencere yok','Sayaç Luna\'da çalışmaya devam eder.');
  }
  function init(a) {
    app=a;
    if(Store.data.timer&&'miniBackground' in Store.data.timer){delete Store.data.timer.miniBackground;Store.save();} // eski sürümün kalıcı işareti
    const button=document.querySelector('#mini-timer-open');
    const picker=document.querySelector('.mini-theme-picker');
    if(!supported()) {
      // desteklemeyen cihazda hiç gösterme (işe yaramayan düğme kafa karıştırmasın)
      if(button)button.hidden=true;
      if(picker)picker.hidden=true;
    } else if(button) {
      button.textContent='🐾 Mini pencere';
      button.title='Başka uygulamaya geçmeden önce aç; Luna\'ya dönünce kapanır.';
      if(!canDoc())button.addEventListener('pointerdown',()=>{if(canVideo()&&!isOpen())prepareVideo();});
      button.addEventListener('click',open);
    }
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){if(isOpen())away=true;return;}
      if(away&&isOpen())close();
    });
    window.addEventListener('focus',()=>{if(away&&isOpen()&&!document.hidden)close();});
  }
  return {init,open,close,render,refreshTheme,palette,themes,isOpen,supported};
})();
if(typeof window!=='undefined')window.MiniTimer=MiniTimer;