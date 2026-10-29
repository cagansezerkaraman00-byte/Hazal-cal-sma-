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
    const label=s.fresh?'Hazır':!s.running?'Duraklatıldı':s.phase==='focus'?'Odak zamanı':'Mola zamanı';
    g.font='500 23px system-ui';g.fillStyle=theme.muted;
    const mins=Math.floor(Math.max(0,s.elapsed)/60)+' dk',minsW=(g.measureText(mins)||{}).width||60,room=618-minsW-16-252;
    if(mode==='video'&&!s.running) {
      // küçük video penceresinde ⏯ pencerenin kendi tuşudur: durmuşken nereye basılacağı küçük bir simgeyle yazılır
      const head=label+' · ',tail=s.fresh?' ile başlat':' ile devam',wd=(t)=>(g.measureText(t)||{}).width||0;
      let size=23;
      while(size>15&&wd(head)+size*0.95+wd(tail)>room){size--;g.font='500 '+size+'px system-ui';}
      let x=252;g.fillText(head,x,145);x+=wd(head);
      playPause(g,x,145,size,theme.muted);x+=size*0.95;
      g.fillText(tail,x,145);
      g.font='500 23px system-ui';
    } else g.fillText(label,252,145,Math.max(150,room)); // sağdaki dakikaya binmesin
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
  let docBtn=null, docCanvas=null, docIcon='', lastToggle=0, pressAt=0, lastRun=null;
  let openedAt=0, shown=0, holding=false, selfPauseAt=0, selfPlayAt=0; // küçük pencere açıldığından beri ekrana gelen kare sayısı
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
    setSession(false);lastRun=null;openedAt=0;shown=0;holding=false;
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
    // Android'de video yalnızca biz beklettiğimizde durur (sayaç durmuşken ▶ görünsün diye); başka bir sebeple durursa
    // (pencere kapanıyor, sistem) sayaca dokunulmaz, görüntü sayacın durumuna göre yeniden ayarlanır.
    // iPhone/iPad Safari'de pencerenin ⏸ tuşu videonun kendisini durdurur; pencere kapanırken de video durur.
    // Bu yüzden kısa bir an beklenir: pencere hâlâ açıksa ⏸'a basılmıştır, sayaç çevrilir ve görüntü yeniden akar.
    v.addEventListener('pause',()=>{
      if(v!==vid||mode!=='video')return;
      if(Date.now()-selfPauseAt<500){selfPauseAt=0;return;} // kendi bekletmemiz
      if(!webkitPip()){if(videoInPip())sync();return;} // Chrome'da tuş Media Session'a gelir
      const at=pressAt=Date.now();
      setTimeout(()=>{
        if(v!==vid||mode!=='video'||!videoInPip())return; // pencere kapandı: sayaca dokunulmaz
        if(v.paused&&lastToggle<at-300)flip(); // aynı dokunuş Media Session'dan da geldiyse bir kez sayılır
        sync();
      },900);
    });
    // Chrome bazı cihazlarda ▶'a basılınca Media Session'a haber vermeden videoyu kendisi oynatır: o da ▶ dokunuşu sayılır
    v.addEventListener('play',()=>{
      if(v!==vid||mode!=='video'||webkitPip())return;
      if(Date.now()-selfPlayAt<500){selfPlayAt=0;return;} // kendi oynatmamız
      if(videoInPip()&&!running())flip();
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
    setSession(true);lastRun=running();openedAt=Date.now();shown=0;holding=false;
    // pencereye gerçekten kare gidiyor mu: açılıştan sonra ekrana gelen kareler sayılır
    if(typeof vid.requestVideoFrameCallback==='function'){const v=vid,f=()=>{if(v!==vid||mode!=='video')return;shown++;v.requestVideoFrameCallback(f);};v.requestVideoFrameCallback(f);}
    setTimeout(sync,300);
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
      p.then((win)=>{
        opening=false;if(v!==vid)return;
        openedVideo();
        // pencerenin boyutu değişirse (tablet döndü, pencere büyütüldü) bekleyen görüntü yeniden gönderilir
        if(win&&typeof win.addEventListener==='function')win.addEventListener('resize',nudge);
      },fail);
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
      ctl.addEventListener('click',flip);
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
     Her basış sayacı çevirir; tarayıcı hangi tuşu (▶ ya da ⏸) yollarsa yollasın sonuç aynıdır.
     Android'de sayaç durunca video da bekletilir ki pencerenin tuşu ▶ göstersin; ama yalnızca pencere görüntüyü gerçekten
     aldıktan sonra (açılıştan en az 2 sn ve iki kare, kareler sayılamıyorsa 3,5 sn sonra). Erken (~1 sn) bekletilen video
     tablette kapkara kalıyordu (2.14). */
  const running=()=>!!Timer.state().running;
  const webkitPip=()=>isIOS()||(typeof navigator!=='undefined'&&/Safari\//.test(navigator.userAgent||'')&&!/Chrome|Chromium|Edg|Android/.test(navigator.userAgent||''));
  function session() {try{const m=typeof navigator!=='undefined'&&navigator.mediaSession;return m&&typeof m.setActionHandler==='function'?m:null;}catch(e){return null;}}
  function setSession(on) {
    const ms=session();if(!ms)return;
    try{ms.setActionHandler('play',on?flip:null);}catch(e){}
    try{ms.setActionHandler('pause',on?flip:null);}catch(e){}
    try{ms.playbackState=on?(running()?'playing':'paused'):'none';}catch(e){}
  }
  // pencerenin simgesi sayacın durumunu göstersin (tarayıcı izin verdiği ölçüde)
  function syncState() {const ms=session();if(ms&&mode==='video')try{ms.playbackState=running()?'playing':'paused';}catch(e){}}
  function refreshAll() {if(mode==='video'){paint();sync();}else if(lastCanvas)render(lastCanvas);}
  // Her basış sayacı çevirir (Luna'daki Başla / Duraklat / Devam gibi). Aynı dokunuş iki yoldan gelirse bir kez sayılır.
  function flip() {
    const now=Date.now();
    if(now-lastToggle<600)return;
    lastToggle=now;
    if(app&&app.miniToggle)app.miniToggle();
    lastRun=running();
    refreshAll();
  }
  // yeni kare hemen çizilip akışa verilir
  function paint() {if(vcanvas){render(vcanvas);try{const tr=vstream&&vstream.getVideoTracks()[0];if(tr&&tr.requestFrame)tr.requestFrame();}catch(e){}}}
  // Luna arkadayken tarayıcı kareleri saymaz: o zaman 3,5 sn yeter (görüntü o ana kadar hep aktığı için pencereye çoktan ulaşmıştır)
  const holdReady=()=>{if(webkitPip()||!vid)return false;const t=Date.now()-openedAt;return t>=3500||(t>=2000&&shown>=2);};
  // görüntüyü sayaca uydur: çalışıyorsa (ya da pencere yeni açıldıysa) akar; durmuşsa son kare pencereye ulaştıktan sonra beklenir
  function sync() {
    const v=vid;if(!v||mode!=='video')return;
    syncState();
    if(running()||!holdReady()){holding=false;if(v.paused){selfPlayAt=Date.now();v.play().catch(()=>{});}return;}
    if(v.paused||holding)return; // zaten bekliyor ya da birazdan bekleyecek
    holding=true;paint();
    const t0=Date.now();let done=false;
    const hold=()=>{
      if(done)return;done=true;holding=false;
      if(v!==vid||mode!=='video'||running()||v.paused)return;
      selfPauseAt=Date.now();v.pause();
    };
    // akış saniyede iki kare yollar: "Duraklatıldı" karesi kesin ulaşsın diye en az 0,7 sn ve bir kare daha beklenir
    if(typeof v.requestVideoFrameCallback==='function'){const f=()=>{if(Date.now()-t0>=700)hold();else v.requestVideoFrameCallback(f);};v.requestVideoFrameCallback(f);}
    setTimeout(hold,1600);
  }
  // bekleyen pencereye yeni kare gönder (pencerenin boyutu değişti, Luna öne/arkaya geçti): kısa bir an oynatılıp yeniden beklenir
  function nudge() {
    const v=vid;if(!v||mode!=='video'||!v.paused||running())return;
    paint();selfPlayAt=Date.now();v.play().catch(()=>{});
    setTimeout(sync,50);
  }
  // saniyede bir: sayaç başka yoldan durduysa/başladıysa (süre doldu, Luna'dan basıldı) pencere de uysun
  function watch() {
    if(mode!=='video'||!vid)return;
    const run=running();
    if(run!==lastRun){lastRun=run;paint();}
    if(Date.now()-pressAt<1500)return; // Safari'de dokunuş anlaşılırken bekle
    sync();
  }
  // ⏯ simgesi: üçgen ve iki çubuk (her yazı tipinde aynı görünür)
  function playPause(g,x,y,size,color) {
    const h=size*0.7,top=y-h,bw=h*0.17;
    g.fillStyle=color;
    g.beginPath();g.moveTo(x+1,top);g.lineTo(x+1+h*0.6,top+h/2);g.lineTo(x+1,top+h);g.closePath();g.fill();
    g.fillRect(x+1+h*0.72,top,bw,h);g.fillRect(x+1+h*0.72+bw*1.9,top,bw,h);
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
      if(isOpen())nudge(); // Luna öne/arkaya geçince bekleyen pencere de yeni kare alsın
      if(document.hidden){if(isOpen())away=true;return;}
      if(away&&isOpen())close();
    });
    window.addEventListener('focus',()=>{if(away&&isOpen()&&!document.hidden)close();});
  }
  return {init,open,close,render,refreshTheme,palette,themes,isOpen,supported};
})();
if(typeof window!=='undefined')window.MiniTimer=MiniTimer;
