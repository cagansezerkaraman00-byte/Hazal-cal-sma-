/* Compact external companion. Opening Document PiP requires a user gesture. */
const MiniTimer = (() => {
  let app, pip=null, tickId=null, opening=false, away=false;
  const css='html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#fff4e8}canvas{display:block;width:100%;height:100%;object-fit:contain}'
    +'.ctl{position:fixed;display:grid;place-items:center;padding:0;border:0;border-radius:50%;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.2)}.ctl svg{width:46%;height:46%;fill:currentColor}.ctl:focus-visible{outline:3px solid currentColor;outline-offset:2px}';
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
    const oy=Math.max(0,((canvas.height||240)-240)/2);
    g.setTransform(1,0,0,1,0,0);
    g.fillStyle=theme.bg;g.fillRect(0,0,canvas.width||640,canvas.height||240);
    if(oy){g.fillStyle=theme.panel;g.fillRect(0,0,232,canvas.height);g.translate(0,oy);}
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
    // küçük video penceresinde ⏯ tuşu pencerenin kendi düğmesidir: durmuşken nereye basılacağı yazılır
    const hint=mode==='video'&&!s.running?(s.fresh?' · ▶ ile başlat':' · ▶ ile devam'):'';
    const label=(s.fresh?'Hazır':!s.running?'Duraklatıldı':s.phase==='focus'?'Odak zamanı':'Mola zamanı')+hint;
    g.font='500 23px system-ui';g.fillStyle=theme.muted;
    const mins=Math.floor(Math.max(0,s.elapsed)/60)+' dk',minsW=(g.measureText(mins)||{}).width||60;
    g.fillText(label,252,145,Math.max(150,618-minsW-16-252)); // sağdaki dakikaya binmesin
    g.textAlign='right';g.fillText(mins,618,145);g.textAlign='left';
    g.fillStyle=theme.track;g.fillRect(252,165,366,5);
    g.fillStyle=theme.accent;g.fillRect(252,165,366*Math.max(0,Math.min(1,s.progress||0)),5);
    const chip=document.querySelector('#hud-weather');
    const weather=chip&&!chip.classList.contains('hidden')?chip.textContent.trim():'Birlikte, sakince.';
    // bitiş saati: telefon arka planda çizimi dondursa bile pencere doğru bilgi versin
    const end=s.running&&s.countdown?'Bitiş '+U.hm(new Date(Date.now()+Math.max(0,s.remaining)*1000))+' · ':'';
    g.font='20px system-ui';g.fillStyle=theme.muted;g.fillText(end+weather,252,207,366);
    if(docBtn&&canvas===docCanvas)placeButton(canvas,theme,s);
  }
  /* Mini pencere iki yolla açılır:
     - doc:   Document Picture-in-Picture (bilgisayarda Chrome/Edge)
     - video: sayaç tuvali → video akışı → video "resim içinde resim" (iPad/iPhone Safari, Android Chrome)
     İkisi de yoksa düğme ve tema seçimi hiç görünmez. Açık olup olmadığı her an canlı sorulur (isOpen);
     sayaca kalıcı bir işaret yazılmaz, böylece Tam odak yanlışlıkla kapanmaz. */
  let mode=null, vid=null, vcanvas=null, vstream=null, vtick=null, vworker=null;
  let docBtn=null, docCanvas=null, docIcon='', lastToggle=0, selfPlayAt=0, selfPauseAt=0, pressAt=0, lastRun=null;
  const canDoc=()=>typeof window!=='undefined'&&'documentPictureInPicture' in window;
  const isIOS=()=>typeof navigator!=='undefined'&&(/iP(hone|ad|od)/.test(navigator.userAgent||'')||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1));
  const isIPad=()=>isIOS()&&!/iPhone|iPod/.test(navigator.userAgent||'');
  const standalone=()=>{try{return navigator.standalone===true||matchMedia('(display-mode: standalone)').matches;}catch(e){return false;}};
  // iPad ana ekran uygulamasında mini pencere yerine Luna'nın penceresi küçültülür (Slide Over / Split View / pencere)
  const iPadWindowGuide=()=>!canDoc()&&isIOS()&&standalone()&&isIPad();
  function canVideo() {
    try {
      if(isIOS()&&standalone())return false; // iOS/iPadOS ana ekran uygulamasında video PiP çalışmıyor (WebKit 303885)
      if(typeof HTMLCanvasElement==='undefined'||!HTMLCanvasElement.prototype.captureStream)return false;
      const v=document.createElement('video');
      if(document.pictureInPictureEnabled&&typeof v.requestPictureInPicture==='function')return true;
      return typeof v.webkitSupportsPresentationMode==='function'&&v.webkitSupportsPresentationMode('picture-in-picture');
    } catch(e) {return false;}
  }
  const supported=()=>canDoc()||canVideo()||iPadWindowGuide();
  const videoInPip=()=>!!vid&&(document.pictureInPictureElement===vid||vid.webkitPresentationMode==='picture-in-picture');
  function isOpen() {return mode==='doc'?!!(pip&&!pip.closed):mode==='video'?videoInPip():false;}
  function cleanup() {if(tickId){clearInterval(tickId);tickId=null;}pip=null;away=false;lastCanvas=null;docBtn=null;docCanvas=null;docIcon='';if(mode==='doc')mode=null;}
  function startTick(fn) {
    try {
      const url=URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},1000)'],{type:'text/javascript'}));
      vworker=new Worker(url);URL.revokeObjectURL(url);
      vworker.onmessage=fn;
    } catch(e) {vworker=null;vtick=setInterval(fn,1000);}
  }
  function teardownVideo() {
    if(vworker){try{vworker.terminate();}catch(e){}vworker=null;}
    if(vtick){clearInterval(vtick);vtick=null;}
    if(vstream){try{vstream.getTracks().forEach(t=>t.stop());}catch(e){}vstream=null;}
    if(vid){try{vid.pause();vid.srcObject=null;vid.remove();}catch(e){}vid=null;}
    vcanvas=null;if(mode==='video')mode=null;away=false;
    setSession(false);lastRun=null;
  }
  // mini pencere başka uygulamadayken kapatıldıysa o andan sonrası izinli çıkış değil: Tam odak 15 sn sonra durdurur
  function closedWhileAway() {
    const a=Store.data.timer&&Store.data.timer.away;
    if(document.hidden&&a&&a.app==='miniTimer'){a.app=null;a.at=Date.now();Store.save();}
  }
  function onVideoLeave() {
    if(mode!=='video')return;
    teardownVideo();
    closedWhileAway();
    if(document.hidden&&window.LunaNotify)LunaNotify.timerSnapshot();
  }
  // video PiP için hazırlık: dokunuşun hemen başında (pointerdown) başlar ki "click"te PiP anında istenebilsin
  function prepareVideo() {
    if(vid)return vid;
    vcanvas=document.createElement('canvas');vcanvas.width=640;vcanvas.height=268; // 2,39:1, Android PiP sınırı
    render(vcanvas);
    vstream=vcanvas.captureStream(2);
    render(vcanvas); // akış açıldıktan sonra bir kez daha çiz: ilk kare hemen gitsin, video hazır olsun
    try{const tr=vstream.getVideoTracks()[0];if(tr&&tr.requestFrame)tr.requestFrame();}catch(e){}
    const v=document.createElement('video');
    v.muted=true;v.defaultMuted=true;v.playsInline=true;v.autoplay=true;
    v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');v.setAttribute('muted','');v.setAttribute('aria-hidden','true');
    v.className='mini-pip-video';v.disablePictureInPicture=false;
    v.srcObject=vstream;
    document.body.appendChild(v);
    v.addEventListener('leavepictureinpicture',onVideoLeave);
    v.addEventListener('webkitpresentationmodechanged',()=>{if(v===vid&&v.webkitPresentationMode!=='picture-in-picture'&&mode==='video')onVideoLeave();});
    // iPhone/iPad Safari: pencerenin ⏸/▶ tuşu videonun kendisini durdurur/oynatır; bunu biz yapmadıysak dokunuştur.
    // Pencere kapanırken de video durur: kısa bir an beklenir, pencere hâlâ açıksa ⏸'a basılmıştır (sayaç yanlışlıkla durmaz).
    // (Luna'nın kendi oynat/durdur çağrısının olayı bir kez yok sayılır; kullanıcının hemen ardından gelen dokunuşu kaybolmaz)
    v.addEventListener('pause',()=>{
      if(v!==vid||mode!=='video')return;
      if(Date.now()-selfPauseAt<500){selfPauseAt=0;return;}
      if(!webkitPip()){if(videoInPip())matchVideo();return;} // Chrome'da tuş Media Session'a gelir; görüntü donmasın
      pressAt=Date.now();
      setTimeout(()=>{if(v===vid&&mode==='video'&&videoInPip()&&v.paused)want(false);},900);
    });
    v.addEventListener('play',()=>{
      if(v!==vid||mode!=='video')return;
      if(Date.now()-selfPlayAt<500){selfPlayAt=0;return;}
      if(!webkitPip())return;
      pressAt=Date.now();
      if(videoInPip())want(true);
    });
    vid=v;
    startTick(()=>{if(vcanvas)render(vcanvas);watch();});
    v.play().catch(()=>{});
    // sayaç çalıştıkça hazır kalsın (dokununca anında açılsın); sayaç durup pencere açılmadıysa temizle
    const idle=setInterval(()=>{if(vid!==v){clearInterval(idle);return;}if(mode!=='video'&&!opening&&!Timer.state().running){clearInterval(idle);teardownVideo();}},60000);
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
    setSession(true);lastRun=null;setTimeout(()=>{if(mode==='video')matchVideo();},300);
    if(!Store.data.settings.miniUsed){Store.data.settings.miniUsed=true;Store.save();}
    app.toast('🐾','Mini pencere açıldı','Başka uygulamaya geçince köşede kalır; Luna\'ya dönünce kapanır.');
  }
  function openVideo() {
    const v=prepareVideo();
    const tip=/Android/i.test(navigator.userAgent||'')?' Olmazsa Ayarlar → Uygulamalar → Chrome → Resim içinde resim iznini aç.':'';
    const fail=(e)=>{
      opening=false;
      if(v!==vid)return; // eski bir denemenin cevabı
      setSession(false); // pencere açılmadı: ⏯ tuşları bağlı kalmasın
      if(e&&(e.name==='NotAllowedError'||e.name==='InvalidStateError')){app.toast('🐾','Mini pencere hazır','Bir kez daha dokun, hemen açılacak.');return;} // video hazır kalsın
      teardownVideo();app.toast('🐾','Mini pencere açılamadı','Bir kez daha dokun.'+tip);
    };
    const go=()=>{
      opening=true;
      setSession(true);
      let p;try{p=enterVideoPip(v);}catch(e){p=Promise.reject(e);}
      p.then(()=>{opening=false;if(v===vid)openedVideo();},fail);
    };
    // meta veri hazırsa PiP aynı dokunuşta istenir (iOS dokunuş gerektirir)
    if(v.readyState>=1){go();return;}
    opening=true;
    const t=setTimeout(()=>fail({name:'InvalidStateError'}),4000);
    v.addEventListener('loadedmetadata',()=>{clearTimeout(t);if(v===vid)go();else opening=false;},{once:true});
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
      const style=next.document.createElement('style');style.textContent=css;next.document.head.append(style);
      const canvas=next.document.createElement('canvas');canvas.width=640;canvas.height=240;
      canvas.setAttribute('aria-label','Kucak kucağa uyuyan Luna, Vesper ve Güçlü; saat ve çalışma sayacı');
      next.document.body.append(canvas);next.document.title='Luna · Mini sayaç';
      const ctl=next.document.createElement('button');ctl.type='button';ctl.className='ctl';
      ctl.addEventListener('click',toggleTimer);
      next.document.body.append(ctl);docBtn=ctl;docCanvas=canvas;
      next.addEventListener('pagehide',()=>{if(pip===next){cleanup();closedWhileAway();if(document.hidden)LunaNotify.timerSnapshot();}},{once:true});
      render(canvas);tickId=setInterval(()=>render(canvas),1000);
    } catch(e) {close();app.toast('🐾','Mini pencere açılamadı','Bir kez daha dokunarak dene.');}
    finally {opening=false;}
  }
  /* ---------- Mini pencereden durdur / başlat ----------
     Luna'daki Başla / Duraklat / Devam düğmesiyle aynı iş yapılır (app.miniToggle: süre kontrolü, konu seçimi, sessiz başlangıç).
     · bilgisayar (doc): pencerenin içindeki düğme
     · Android Chrome (video): pencerenin ⏯ tuşu Media Session'a gelir (tuvalden gelen görüntüde tuş ancak böyle görünür)
     · iPhone/iPad Safari (video): pencerenin ⏯ tuşu videoyu durdurur/oynatır; bu olaylar yakalanır
     Sayaç durunca video da bekletilir: pencerenin kendi ▶/⏸ simgesi hep sayaçla aynı kalır. */
  const running=()=>!!Timer.state().running;
  const webkitPip=()=>isIOS()||(typeof navigator!=='undefined'&&/Safari\//.test(navigator.userAgent||'')&&!/Chrome|Chromium|Edg|Android/.test(navigator.userAgent||''));
  function session() {try{const m=typeof navigator!=='undefined'&&navigator.mediaSession;return m&&typeof m.setActionHandler==='function'?m:null;}catch(e){return null;}}
  function setSession(on) {
    const ms=session();if(!ms)return;
    try{ms.setActionHandler('play',on?()=>want(true):null);}catch(e){}
    try{ms.setActionHandler('pause',on?()=>want(false):null);}catch(e){}
    try{ms.playbackState=on?(running()?'playing':'paused'):'none';}catch(e){}
  }
  function refreshAll() {if(mode==='video')matchVideo();else if(lastCanvas)render(lastCanvas);}
  // video tuşları: istenen duruma getirir (sayaç zaten öyleyse dokunmaz; aynı dokunuş iki yoldan gelse de bir kez sayılır)
  function want(run) {
    if(running()!==run&&app&&app.miniToggle)app.miniToggle();
    refreshAll();
  }
  // bilgisayardaki düğme: her basış çevirir (çift tıklama iki kez saymasın)
  function toggleTimer() {
    const now=Date.now();
    if(now-lastToggle<400)return;
    lastToggle=now;
    if(app&&app.miniToggle)app.miniToggle();
    refreshAll();
  }
  // görüntü sayaçla aynı durumda kalsın; sayaç durunca son kare ("Duraklatıldı") pencereye ulaştıktan sonra video bekletilir
  function matchVideo() {
    const v=vid;if(!v||mode!=='video')return;
    const run=running();lastRun=run;
    const ms=session();if(ms)try{ms.playbackState=run?'playing':'paused';}catch(e){}
    if(vcanvas){render(vcanvas);try{const tr=vstream&&vstream.getVideoTracks()[0];if(tr&&tr.requestFrame)tr.requestFrame();}catch(e){}}
    if(v.paused){selfPlayAt=Date.now();v.play().catch(()=>{selfPauseAt=Date.now();});}
    if(run)return;
    // akış saniyede iki kare yollar: yeni kare kesin ulaşsın diye en az 0,7 sn ve bir kare daha beklenir
    let done=false;const t0=Date.now();
    const hold=()=>{if(done||v!==vid||mode!=='video'||running()||v.paused)return;done=true;selfPauseAt=Date.now();v.pause();};
    if(typeof v.requestVideoFrameCallback==='function'){const f=()=>{if(Date.now()-t0>=700)hold();else v.requestVideoFrameCallback(f);};v.requestVideoFrameCallback(f);}
    setTimeout(hold,1600);
  }
  // saniyede bir: sayaç başka bir yoldan durduysa/başladıysa (süre doldu, Luna'dan basıldı) pencere de uysun
  function watch() {
    if(mode!=='video'||!vid)return;
    const run=running(),now=Date.now();
    if(run!==lastRun){matchVideo();return;}
    if(now-Math.max(selfPlayAt,selfPauseAt)<2000||now-pressAt<1500)return;
    if(run===vid.paused)matchVideo();
  }
  function placeButton(canvas,theme,s) {
    const r=canvas.getBoundingClientRect&&canvas.getBoundingClientRect();if(!r||!r.width)return;
    const k=Math.min(r.width/canvas.width,r.height/canvas.height);
    const x0=r.left+(r.width-canvas.width*k)/2,y0=r.top+(r.height-canvas.height*k)/2;
    const size=Math.max(30,Math.round(66*k)),cx=x0+574*k,cy=y0+84*k; // büyük saatin sağındaki boşluk
    const st=docBtn.style;
    st.left=Math.round(cx-size/2)+'px';st.top=Math.round(cy-size/2)+'px';st.width=st.height=size+'px';
    st.background=theme.accent;st.color=theme.bg;
    const icon=s.running?'pause':'play';
    if(icon!==docIcon){
      docIcon=icon;
      docBtn.innerHTML=icon==='pause'?'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.2"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.2"/></svg>'
        :'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 5.6v12.8a1 1 0 0 0 1.5.86l10.2-6.4a1 1 0 0 0 0-1.72L10 4.74a1 1 0 0 0-1.5.86z"/></svg>';
    }
    const name=s.running?'Duraklat':s.fresh?'Başlat':'Devam et';
    if(docBtn.title!==name){docBtn.title=name;docBtn.setAttribute('aria-label',name);}
  }
  function windowGuide() {
    app.openModal(`<h3>🐾 iPad'de mini pencere</h3>
      <p class="muted">Ana ekrandaki uygulamalarda Apple küçük video penceresine izin vermiyor. Onun yerine Luna'nın kendi penceresini küçültüp YouTube ya da ChatGPT'nin yanına koyabilirsin; Luna görünür kaldığı için sayaç canlı akar ve durmaz.</p>
      <ol class="install-steps">
        <li><b>iPadOS 26:</b> Luna açıkken sağ alt köşedeki tutamaçtan pencereyi küçült, sonra diğer uygulamayı aç; iki pencere yan yana durur.</li>
        <li><b>Daha eski iPadOS:</b> Luna açıkken ekranın altından Dock'u çek, YouTube'u sürükleyip yanına bırak (Split View) ya da kenara bırak (Slide Over).</li>
        <li>Luna dar pencerede sade sayaç ekranını gösterir; ders bitince tam ekrana geri al.</li>
      </ol>
      <div class="modal-actions"><button class="btn primary" type="button" data-act="ok">Anladım 💛</button></div>`, (card) => card.querySelector('[data-act="ok"]').addEventListener('click', () => app.closeModal()));
  }
  function open() {
    if(opening)return;
    if(isOpen()){if(mode==='doc'&&pip)pip.focus();return;}
    if(canDoc())return openDoc();
    if(canVideo())return openVideo();
    if(iPadWindowGuide())return windowGuide();
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
    } else if(iPadWindowGuide()) {
      if(picker)picker.hidden=true; // renkler yalnızca küçük video penceresinde kullanılır
      if(button){button.textContent='🐾 Mini pencere';button.title='iPad\'de Luna\'yı yan pencerede kullanma rehberi';button.addEventListener('click',open);}
    } else if(button) {
      button.textContent='🐾 Mini pencere';
      button.title='Başka uygulamaya geçmeden önce aç; Luna\'ya dönünce kapanır.';
      if(!canDoc()){
        button.addEventListener('pointerdown',()=>{if(canVideo()&&!isOpen())prepareVideo();});
        // daha önce mini pencere kullandıysa sayaç başlarken hazırla: dokununca anında açılsın (iOS dokunuş süresi kısa)
        document.querySelector('#btn-toggle')?.addEventListener('click',()=>{setTimeout(()=>{if(canVideo()&&!isOpen()&&Timer.state().running)prepareVideo();},50);});
      }
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
