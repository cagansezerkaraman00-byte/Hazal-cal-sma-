/* Official Spotify Web Playback SDK. Loaded on demand; never part of app startup. */
const SpotifyPlayback = (() => {
  let config, player=null, device='', pending=null, sdkPromise=null, generation=0;
  let queuedSeek=null,commandEpoch=0,selectionTimer=null,needsGesture=false,reconnectNeeded=false;
  let selectionPending=null, selectionSequence=0, seekHold=null, selectionWork=Promise.resolve();
  let message='', playing=false, track=null, position=0, duration=0, connecting=false;
  let embedController=null, embedEpoch=0, embedApiPromise=null, picked='', transferQueue=Promise.resolve();
  let clock=null, observedAt=Date.now(), dragging=false, draft=0, seekBusy=false, seekSequence=0, seekAllowed=true, syncBusy=false, ticks=0;
  const el=()=>document.getElementById('sp-playback');
  const esc=s=>U.esc(String(s||''));
  const icon=name=>{
    const paths={
      play:'<path d="M9 5.5c0-1 1.1-1.6 2-1.1l10 6.3c.9.6.9 2 0 2.6l-10 6.3c-.9.5-2-.1-2-1.1z"/>',
      pause:'<rect x="7" y="5" width="4" height="14" rx="1.8"/><rect x="15" y="5" width="4" height="14" rx="1.8"/>',
      previous:'<rect x="5" y="5" width="3" height="14" rx="1.5"/><path d="M18 5.7c.9-.6 2 .1 2 1.1v10.4c0 1-1.1 1.7-2 1.1l-7.8-5.2c-.8-.5-.8-1.7 0-2.2z"/>',
      next:'<rect x="18" y="5" width="3" height="14" rx="1.5"/><path d="M8 5.7c-.9-.6-2 .1-2 1.1v10.4c0 1 1.1 1.7 2 1.1l7.8-5.2c.8-.5.8-1.7 0-2.2z"/>'
    };
    return `<svg viewBox="0 0 26 24" aria-hidden="true" focusable="false" fill="currentColor">${paths[name]}</svg>`;
  };
  const fmt=n=>`${Math.floor(Math.max(0,n)/60000)}:${String(Math.floor(Math.max(0,n)/1000)%60).padStart(2,'0')}`;
  const trackKey=()=>track?.id||track?.uri||track?.name||'';
  function bounded(work,ms=6000){
    let timer;return Promise.race([Promise.resolve(work),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('COMMAND_TIMEOUT')),ms);})]).finally(()=>clearTimeout(timer));
  }
  function clearSelection(){clearTimeout(selectionTimer);selectionTimer=null;selectionPending=null;}
  function cancelSeek(){++seekSequence;++commandEpoch;seekBusy=false;seekHold=null;if(queuedSeek){queuedSeek.resolve(false);queuedSeek=null;}}
  function watchSelection(){
    clearTimeout(selectionTimer);const run=generation,choice=selectionSequence;
    selectionTimer=setTimeout(()=>{if(run!==generation||choice!==selectionSequence||!selectionPending)return;clearSelection();needsGesture=true;playing=false;fail('Spotify şarkıyı başlatmadı. Sesi aç düğmesine dokunarak yeniden dene.');},8000);
  }
  function currentPosition(){return Math.min(duration,Math.max(0,position+(playing&&!seekBusy?Date.now()-observedAt:0)));}
  function paintTimeline(){
    const root=el(),input=root?.querySelector?.('[data-live-seek]');if(!input)return;
    const value=dragging?draft:currentPosition();
    input.value=String(Math.round(value));input.max=String(duration||1);
    input.disabled=!device||!!selectionPending||!track||duration<=0||!seekAllowed;
    input.setAttribute('aria-valuetext',`${fmt(value)} / ${fmt(duration)}`);
    input.style.setProperty('--sp-progress',`${duration?Math.min(100,value/duration*100):0}%`);
    const elapsed=root.querySelector('[data-live-elapsed]'),total=root.querySelector('[data-live-total]');
    if(elapsed)elapsed.textContent=fmt(value);if(total)total.textContent=fmt(duration);
  }
  function acceptState(state){
    if(needsGesture)return; // A stale playing state cannot unlock browser-blocked audio.
    const incoming=state?.track_window?.current_track;
    const previousPlaying=playing,previousDuration=duration,previousMessage=message;
    if(seekHold&&(incoming?.id||incoming?.uri||incoming?.name)===seekHold.key&&state?.paused===!playing&&Date.now()<seekHold.until&&Math.abs((state?.position||0)-currentPosition())>2500)return;
    if(selectionPending&&incoming?.uri!==selectionPending.uri&&incoming?.id!==selectionPending.uri.split(':')[2])return;
    if(selectionPending){clearSelection();message='';}if(state&&!state.paused)needsGesture=false;
    if(seekBusy)return;
    const previous=trackKey();track=incoming||null;
    playing=!!state&&!state.paused;position=state?.position||0;duration=state?.duration||0;observedAt=Date.now();
    seekAllowed=!state?.disallows?.seeking;
    if(previous!==trackKey()||!track){dragging=false;cancelSeek();}
    if(track&&message==='Müzik Luna’da başlatılıyor…')message='';
    if(dragging||(previous===trackKey()&&previousPlaying===playing&&previousDuration===duration&&previousMessage===message))paintTimeline();else render();
  }
  function stopClock(){if(clock!==null)clearInterval(clock);clock=null;ticks=0;syncBusy=false;dragging=false;}
  function startClock(){
    stopClock();clock=setInterval(async()=>{
      if(document.hidden)return;paintTimeline();
      if(++ticks%1||dragging||seekBusy||syncBusy||!player?.getCurrentState)return;
      const current=player,run=generation,epoch=commandEpoch;syncBusy=true;
      try{const state=await bounded(current.getCurrentState(),4000);if(state&&run===generation&&current===player&&epoch===commandEpoch&&!dragging&&!seekBusy)acceptState(state);}
      catch(e){/* A temporary state refresh failure must not interrupt music. */}
      finally{if(run===generation)syncBusy=false;}
    },1000);
  }
  async function seekTo(value){
    const target=Number(value);if(!Number.isFinite(target)||!player||!device||!track||duration<=0||!seekAllowed||selectionPending)return false;
    const ms=Math.round(Math.min(Math.max(0,target),Math.max(0,duration-1)));
    ++commandEpoch;dragging=false;
    if(seekBusy){
      if(queuedSeek)queuedSeek.resolve(false);
      position=ms;observedAt=Date.now();paintTimeline();
      return new Promise(resolve=>{queuedSeek={ms,key:trackKey(),resolve};});
    }
    const run=generation,current=player,key=trackKey(),sequence=++seekSequence,old=currentPosition();
    seekBusy=true;position=ms;observedAt=Date.now();paintTimeline();
    try{
      await bounded(current.seek(ms));
      if(run!==generation||current!==player||key!==trackKey()||sequence!==seekSequence)return false;
      if(!queuedSeek){position=ms;observedAt=Date.now();seekHold={key,until:Date.now()+4000};message='';}
      return true;
    }catch(e){
      if(run===generation&&key===trackKey()&&sequence===seekSequence&&!queuedSeek){position=old;observedAt=Date.now();message='Sarma yanıtı alınamadı. Tekrar deneyebilirsin.';}
      return false;
    }finally{
      if(run===generation&&sequence===seekSequence){
        seekBusy=false;const next=queuedSeek;queuedSeek=null;
        if(next){if(next.key===trackKey())seekTo(next.ms).then(next.resolve);else next.resolve(false);}
        else if(message)render();else paintTimeline();
      }
    }
  }
  function fail(text){message=text;render();}
  function render(){
    const root=el();if(!root||!config)return;
    const restoreSeekFocus=document.activeElement?.matches?.('[data-live-seek]');
    const enabled=config.hasAccess();
    root.hidden=!enabled;const panel=document.getElementById('sp-music-window');if(panel)panel.hidden=!enabled;
    const embed=document.getElementById('spotify-frame');if(embed)embed.hidden=enabled;
    if(!enabled)return;
    const cover=track?.album?.images?.find(i=>/^https:\/\//.test(i.url||''))?.url;
    root.innerHTML=`<div class="sp-premium-cover">${cover?`<img src="${esc(cover)}" alt="${esc(track.name)} albüm kapağı">`:'<span aria-hidden="true">♫</span>'}</div><div class="sp-live-heading"><b>🎧 Spotify · Luna oynatıcı</b><span>${device?'Bu cihaz':'Premium'}</span></div>
      <p class="sp-live-track">${track?esc(track.name):'Müziğin burada, Luna’nın yanında.'}</p>
      <p class="hint">${track?esc((track.artists||[]).map(a=>a.name).join(' · ')):'Aşağıdan dinlemek istediğin şarkıyı seç.'}</p>
      ${track?`<div class="sp-live-timeline"><input type="range" data-live-seek min="0" max="${duration||1}" step="1000" value="${Math.round(currentPosition())}" aria-label="Şarkıda dinlemek istediğin saniye" ${!device||selectionPending||!seekAllowed||duration<=0?'disabled':''}><div class="sp-live-times"><span data-live-elapsed>${fmt(currentPosition())}</span><span data-live-total>${fmt(duration)}</span></div></div>`:''}
      <div class="sp-live-controls">${device?`<button class="btn soft sp-live-skip" type="button" data-live="previous" ${selectionPending?'disabled':''} aria-label="Önceki şarkı" title="Önceki şarkı">${icon('previous')}</button><button class="btn primary sp-live-toggle" type="button" data-live="toggle" ${selectionPending?'disabled':''} aria-label="${needsGesture?'Sesi aç':playing?'Duraklat':track?'Devam et':'Luna’da dinle'}">${icon(playing?'pause':'play')}</button><button class="btn soft sp-live-skip" type="button" data-live="next" ${selectionPending?'disabled':''} aria-label="Sonraki şarkı" title="Sonraki şarkı">${icon('next')}</button>${!track||selectionPending?`<button class="btn soft sp-live-selected" type="button" data-live="selected">${picked?'Seçilen şarkıyı yeniden dene':'Listeden bir şarkı seç'}</button>`:''}`:`<button class="btn primary" type="button" data-live="connect" ${connecting?'disabled':''}>${connecting?'Oynatıcı hazırlanıyor…':'Luna oynatıcısını aç'}</button>`}</div>
      ${message&&device?'<button class="btn soft" type="button" data-live="reconnect">Bağlantıyı yenile</button>':''}
      <p class="hint" role="status">${esc(message||(!seekAllowed&&track?'Spotify bu içerikte ileri veya geri sarmaya izin vermiyor.':'Çalışma sayacın müzikten bağımsız devam eder.'))}</p>`;
    paintTimeline();
    if(restoreSeekFocus)root.querySelector?.('[data-live-seek]')?.focus?.({preventScroll:true});
  }
  function sdk(){
    if(window.Spotify?.Player)return Promise.resolve();
    if(sdkPromise)return sdkPromise;
    sdkPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='https://sdk.scdn.co/spotify-player.js';script.async=true;
      const timer=setTimeout(()=>{script.remove();sdkPromise=null;reject(Error('SDK_TIMEOUT'));},15000);
      window.onSpotifyWebPlaybackSDKReady=()=>{clearTimeout(timer);resolve();};
      script.onerror=()=>{clearTimeout(timer);script.remove();sdkPromise=null;reject(Error('SDK_NETWORK'));};
      document.head.appendChild(script);
    });return sdkPromise;
  }
  async function request(path,body){
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),12000);
    try{
      for(let attempt=0;attempt<2;attempt++){
        const auth=await bounded(config.getToken(attempt>0),10000);if(!auth)throw Error('AUTH');
        const res=await fetch('https://api.spotify.com/v1'+path,{method:'PUT',headers:{Authorization:'Bearer '+auth,'Content-Type':'application/json'},body:JSON.stringify(body),signal:ctl.signal});
        if(res.status===401&&attempt===0)continue;
        if(!res.ok)throw Error(res.status===401?'AUTH':res.status===403?'PREMIUM':res.status===429?'RATE':res.status===404?'DEVICE':'PLAYBACK');
        return;
      }
    }finally{clearTimeout(timer);}
  }
  function error(e){const msg={AUTH:'Spotify oturumunu yeniden bağla.',PREMIUM:'Spotify bu hesap için oynatmaya izin vermedi. Premium ve Luna erişimini kontrol et.',RATE:'Spotify kısa süre beklememizi istiyor. Biraz sonra tekrar dene.',COMMAND_TIMEOUT:'Spotify yanıt vermedi. Yeniden bağlanıp deneyebilirsin.',DEVICE:'Spotify bu cihazı henüz göremiyor. Oynatıcıyı yeniden açıp şarkına dokun.',READY_TIMEOUT:'Oynatıcı bağlantısı zamanında kurulamadı. Yeniden aç düğmesine dokun.'};fail(msg[e.message]||'Müzik başlatılamadı. İnternetini kontrol edip yeniden dene.');}
  async function connect(){
    if(device)return true;if(pending)return pending;if(!config.hasAccess())return false;
    const run=++generation;connecting=true;message='';render();
    pending=(async()=>{
      let stopWaiting=()=>{};
      try{await sdk();if(run!==generation)return false;
        if(player){player.disconnect();player=null;}
        const current=new window.Spotify.Player({name:'Luna · çalışma müziği',volume:.6,enableMediaSession:true,getOAuthToken:cb=>config.getToken().then(t=>cb(t)).catch(()=>cb(''))});player=current;
        current.addListener('player_state_changed',s=>{if(run===generation)acceptState(s);});
        current.addListener('not_ready',()=>{if(run===generation){device='';playing=false;reconnectNeeded=true;clearSelection();cancelSeek();stopClock();fail('Oynatıcı bağlantısı kesildi. Yeniden açabilirsin.');}});
        current.addListener('autoplay_failed',()=>{if(run===generation){clearSelection();needsGesture=true;playing=false;fail('Sesi başlatmak için Sesi aç düğmesine dokun.');}});
        const ready=new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>reject(Error('READY_TIMEOUT')),15000);
          stopWaiting=()=>clearTimeout(timer);
          current.addListener('ready',({device_id})=>{clearTimeout(timer);const valid=run===generation&&player===current;if(valid){reconnectNeeded=false;device=device_id;startClock();render();}resolve(valid);});
          for(const name of ['initialization_error','authentication_error','account_error','playback_error'])current.addListener(name,()=>{if(run!==generation||player!==current)return;clearTimeout(timer);clearSelection();cancelSeek();const err=Error(name==='account_error'?'PREMIUM':name==='authentication_error'?'AUTH':'PLAYBACK');if(name!=='playback_error'){device='';stopClock();current.disconnect();}error(err);reject(err);});
        });
        // Attach a rejection handler before connect to avoid an unhandled SDK error.
        const handled=ready.catch(e=>{if(run===generation)error(e);return false;});
        if(!await bounded(current.connect(),15000)){current.disconnect();throw Error('CONNECT');}
        const ok=await handled;if(!ok){current.disconnect();if(player===current){player=null;device='';}}return ok;
      }catch(e){if(run===generation){if(player)player.disconnect();player=null;device='';error(e);}return false;}
      finally{stopWaiting();if(run===generation){connecting=false;pending=null;render();}}
    })();return pending;
  }
  function uri(url){const m=String(url||'').match(/(?:open\.spotify\.com\/(?:intl-[a-z-]+\/)?|spotify:)(playlist|album|track)[/:]([A-Za-z0-9]{10,40})(?:[/?#]|$)/i);return m?{type:m[1].toLowerCase(),uri:'spotify:'+m[1].toLowerCase()+':'+m[2]}:null;}
  async function playSelected(selected=picked||config.selection(),activated=false){
    if(!device){fail('Önce Luna oynatıcısını aç.');return false;}
    const selection=uri(selected);if(!selection){fail('Bir şarkı, albüm veya çalma listesi seç.');return false;}
    // Must be invoked directly from a tap for iOS audio activation.
    const run=generation,current=player;
    try{if(!activated)await bounded(current.activateElement());if(run!==generation)return false;await request('/me/player/play?device_id='+encodeURIComponent(device),selection.type==='track'?{uris:[selection.uri]}:{context_uri:selection.uri});if(run!==generation)return false;if(selection.type==='track'&&picked&&picked!==selection.uri)return false;if(selectionPending)watchSelection();if(!needsGesture)message='Müzik Luna’da başlatılıyor…';render();return true;}catch(e){if(run===generation){clearSelection();needsGesture=true;error(e);}return false;}
  }
  async function chooseTrack(value,metadata){
    const selected=uri(value);if(selected?.type!=='track')return false;
    if(!device){fail(connecting?'Oynatıcı hazırlanıyor. Hazır olduğunda şarkına dokun.':'Önce oynatıcıyı aç, sonra şarkını seç.');return false;}
    cancelSeek();clearSelection();needsGesture=false;
    const sequence=++selectionSequence,run=generation;
    const previous={track,position,duration,playing};
    picked=selected.uri;selectionPending={uri:selected.uri};
    track={uri:selected.uri,name:metadata?.name||'Seçtiğin şarkı',artists:metadata?.artists||[],album:metadata?.album};
    position=0;duration=metadata?.duration_ms||0;playing=false;message='Seçtiğin şarkı hazırlanıyor…';observedAt=Date.now();render();
    // Activate audio in the original tap, then serialize remote play requests.
    const activation=player?.activateElement();
    try{await bounded(activation);}catch(e){if(run===generation&&sequence===selectionSequence){clearSelection();({track,position,duration,playing}=previous);error(e);}return false;}
    const queued=selectionWork.catch(()=>false).then(()=>run===generation&&sequence===selectionSequence?transferPicked(true):false);
    selectionWork=queued;
    const ok=await queued;
    if(run!==generation||sequence!==selectionSequence)return false;
    if(!ok){clearSelection();({track,position,duration,playing}=previous);render();}
    if(ok&&player?.getCurrentState){try{const state=await bounded(player.getCurrentState(),4000);if(run===generation&&sequence===selectionSequence&&state)acceptState(state);}catch(e){/* Next clock pulse retries. */}}
    return ok;
  }
  async function pauseForEmbed(){
    if(!player||!device||!playing)return;
    try{await player.pause();playing=false;observedAt=Date.now();render();}catch(e){error(e);}
  }
  function embedApi(){
    if(embedApiPromise)return embedApiPromise;
    embedApiPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='https://open.spotify.com/embed/iframe-api/v1';script.async=true;
      const timer=setTimeout(()=>{embedApiPromise=null;script.remove();reject(Error('EMBED_TIMEOUT'));},15000);
      window.onSpotifyIframeApiReady=api=>{clearTimeout(timer);resolve(api);};
      script.onerror=()=>{clearTimeout(timer);embedApiPromise=null;script.remove();reject(Error('EMBED_NETWORK'));};document.head.appendChild(script);
    });return embedApiPromise;
  }
  async function transferPicked(activated=false){
    const selected=picked,controller=embedController,epoch=embedEpoch;
    if(!selected)return false;
    // Stop the embed preview before starting full playback on the Luna device.
    try{Promise.resolve(controller?.pause()).catch(()=>{});}catch(e){/* The selection remains available for retry. */}
    if(!device){fail('Şarkı seçildi. Luna oynatıcısını açıp seçtiğin şarkıyı çal.');return false;}
    const ok=await playSelected(selected,activated);
    return ok&&epoch===embedEpoch;
  }
  function mountEmbed(url){
    const selection=uri(url),root=document.getElementById('spotify-frame');
    if(!root||!selection||!config?.hasAccess())return false;
    const epoch=++embedEpoch;picked='';
    try{embedController?.destroy();}catch(e){/* Old embed already removed. */}embedController=null;
    root.hidden=false;root.innerHTML='<h3 class="sub-h">Spotify liste önizlemesi</h3><div id="sp-song-picker"></div>';
    embedApi().then(api=>{
      if(epoch!==embedEpoch||!config.hasAccess())return;
      const target=root.querySelector('#sp-song-picker');if(!target)return;
      api.createController(target,{uri:selection.uri,width:'100%',height:900,theme:0},controller=>{
        if(epoch!==embedEpoch){controller.destroy();return;}embedController=controller;
        controller.addListener('playback_started',event=>{
          const selected=uri(event?.data?.playingURI);
          if(epoch!==embedEpoch||!config.hasAccess()||selected?.type!=='track')return;
          picked=selected.uri;render();transferQueue=transferQueue.catch(()=>{}).then(()=>epoch===embedEpoch&&picked===selected.uri?transferPicked():false);transferQueue.catch(()=>fail('Şarkı seçildi. Üstteki çal düğmesine dokun.'));
        });
      });
    }).catch(()=>{
      if(epoch!==embedEpoch)return;
      root.innerHTML=`<p class="hint">Şarkı seçme bağlantısı kurulamadı. Listeyi yeniden açarak tekrar deneyebilirsin.</p><iframe title="Spotify oynatıcı" src="https://open.spotify.com/embed/${selection.type}/${selection.uri.split(':')[2]}?theme=0" width="100%" height="900" style="border:0;border-radius:12px" allow="autoplay; encrypted-media; fullscreen; picture-in-picture"></iframe>`;
    });return true;
  }
  function reset(){reconnectNeeded=false;clearSelection();cancelSeek();needsGesture=false;++selectionSequence;selectionPending=null;seekHold=null;selectionWork=Promise.resolve();++embedEpoch;picked='';try{embedController?.destroy();}catch(e){}embedController=null;++generation;++seekSequence;stopClock();seekBusy=false;position=0;duration=0;if(player)player.disconnect();player=null;device='';pending=null;connecting=false;track=null;playing=false;message='';if(config?.restoreEmbed)config.restoreEmbed();render();}
  return {
    init(options){config=options;const root=el();if(!root)return;
      const recover=()=>{if(reconnectNeeded&&!document.hidden&&document.getElementById('music-card')?.open&&config.hasAccess()&&!connecting)connect();};
      document.addEventListener?.('visibilitychange',recover);window.addEventListener?.('online',recover);
      root.addEventListener('pointerdown',e=>{if(e.target.matches?.('[data-live-seek]')){dragging=true;draft=Number(e.target.value);}});
      root.addEventListener('input',e=>{if(!e.target.matches?.('[data-live-seek]'))return;dragging=true;draft=Number(e.target.value);paintTimeline();});
      root.addEventListener('change',async e=>{if(e.target.matches?.('[data-live-seek]'))await seekTo(e.target.value);});
      root.addEventListener('pointercancel',()=>{dragging=false;paintTimeline();});
      root.addEventListener('focusout',()=>{if(dragging){dragging=false;paintTimeline();}});
      root.addEventListener('click',async e=>{const b=e.target.closest('[data-live]');if(!b)return;try{
      if(b.dataset.live==='reconnect'){
        ++generation;++selectionSequence;clearSelection();cancelSeek();stopClock();
        player?.disconnect();player=null;device='';pending=null;connecting=false;playing=false;
        await connect();return;
      }
      if(b.dataset.live==='connect'){if(player)bounded(player.activateElement()).catch(()=>{});await connect();return;}
      if(!player||!device)return;
      if(b.dataset.live==='selected'){if(picked)await transferPicked();else await playSelected();return;}
      if(b.dataset.live==='toggle'){if(!track){await playSelected();return;}const activated=player.activateElement();await bounded(activated);if(needsGesture){needsGesture=false;if(picked){selectionPending={uri:picked};await playSelected(picked,true);}else await bounded(player.resume());}else await bounded(player.togglePlay());}
      else if(b.dataset.live==='next')await bounded(player.nextTrack());else if(b.dataset.live==='previous')await bounded(player.previousTrack());
      const current=player,run=generation;const state=await bounded(current.getCurrentState?.(),4000);if(state&&run===generation&&current===player)acceptState(state);
    }catch(err){error(err);}});render();},render,reset,playSelected,seekTo,uri,mountEmbed,chooseTrack,pauseForEmbed,
    prepare(){if(!config?.hasAccess())return false;render();connect();return true;},
    status(){return {ready:!!device,connecting,playing,track:track?.name||''};}
  };
})();
window.SpotifyPlayback=SpotifyPlayback;
