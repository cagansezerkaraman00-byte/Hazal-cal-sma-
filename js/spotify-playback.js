/* Official Spotify Web Playback SDK. Loaded on demand; never part of app startup. */
const SpotifyPlayback = (() => {
  let config, player=null, device='', pending=null, sdkPromise=null, generation=0;
  let message='', playing=false, track=null, position=0, duration=0, connecting=false;
  const el=()=>document.getElementById('sp-playback');
  const esc=s=>U.esc(String(s||''));
  function fail(text){message=text;render();}
  function render(){
    const root=el();if(!root||!config)return;
    const enabled=config.hasAccess();
    root.hidden=!enabled;
    const embed=document.getElementById('spotify-frame');if(embed){embed.hidden=!!device;if(device&&embed.innerHTML)embed.innerHTML='';}
    if(!enabled)return;
    const fmt=n=>`${Math.floor(n/60000)}:${String(Math.floor(n/1000)%60).padStart(2,'0')}`;
    root.innerHTML=`<div class="sp-live-heading"><b>🎧 Spotify · Luna oynatıcı</b><span>${device?'Bu cihaz':'Premium'}</span></div>
      <p class="sp-live-track">${track?esc(track.name):'Müziğin burada, Luna’nın yanında.'}</p>
      <p class="hint">${track?esc((track.artists||[]).map(a=>a.name).join(' · ')):'Aşağıdaki listelerden veya kendi Spotify bağlantından müzik seç.'}</p>
      ${track?`<p class="hint">${fmt(position)} / ${fmt(duration)}</p>`:''}
      <div class="sp-live-controls">${device?`<button class="btn soft" type="button" data-live="previous" aria-label="Önceki şarkı">⏮</button><button class="btn primary" type="button" data-live="toggle">${playing?'Duraklat':track?'Devam et':'Luna’da dinle'}</button><button class="btn soft" type="button" data-live="next" aria-label="Sonraki şarkı">⏭</button><button class="btn soft" type="button" data-live="selected">Seçtiğim listeyi çal</button>`:`<button class="btn primary" type="button" data-live="connect" ${connecting?'disabled':''}>${connecting?'Oynatıcı hazırlanıyor…':'Luna oynatıcısını aç'}</button>`}</div>
      <p class="hint" role="status">${esc(message||'Çalışma sayacın müzikten bağımsız devam eder.')}</p>`;
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
    const auth=await config.getToken();if(!auth)throw Error('AUTH');
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),12000);
    try{const res=await fetch('https://api.spotify.com/v1'+path,{method:'PUT',headers:{Authorization:'Bearer '+auth,'Content-Type':'application/json'},body:JSON.stringify(body),signal:ctl.signal});
      if(!res.ok)throw Error(res.status===401?'AUTH':res.status===403?'PREMIUM':res.status===429?'RATE':'PLAYBACK');
    }finally{clearTimeout(timer);}
  }
  function error(e){const msg={AUTH:'Spotify oturumunu yeniden bağla.',PREMIUM:'Spotify bu hesap için oynatmaya izin vermedi. Premium ve Luna erişimini kontrol et.',RATE:'Spotify kısa süre beklememizi istiyor. Biraz sonra tekrar dene.'};fail(msg[e.message]||'Müzik başlatılamadı. İnternetini kontrol edip yeniden dene.');}
  async function connect(){
    if(device)return true;if(pending)return pending;if(!config.hasAccess())return false;
    const run=++generation;connecting=true;message='';render();
    pending=(async()=>{
      let stopWaiting=()=>{};
      try{await sdk();if(run!==generation)return false;
        if(player){player.disconnect();player=null;}
        const current=new window.Spotify.Player({name:'Luna · çalışma müziği',volume:.6,enableMediaSession:true,getOAuthToken:cb=>config.getToken().then(t=>cb(t)).catch(()=>cb(''))});player=current;
        current.addListener('player_state_changed',s=>{if(run!==generation)return;track=s?.track_window?.current_track||null;playing=!!s&&!s.paused;position=s?.position||0;duration=s?.duration||0;render();});
        current.addListener('not_ready',()=>{if(run===generation){device='';fail('Oynatıcı bağlantısı kesildi. Yeniden açabilirsin.');}});
        current.addListener('autoplay_failed',()=>{if(run===generation)fail('Sesi başlatmak için “Devam et” düğmesine dokun.');});
        const ready=new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>reject(Error('READY_TIMEOUT')),15000);
          stopWaiting=()=>clearTimeout(timer);
          current.addListener('ready',({device_id})=>{clearTimeout(timer);const valid=run===generation&&player===current;if(valid){device=device_id;render();}resolve(valid);});
          for(const name of ['initialization_error','authentication_error','account_error','playback_error'])current.addListener(name,()=>{clearTimeout(timer);reject(Error(name==='account_error'?'PREMIUM':name==='authentication_error'?'AUTH':'PLAYBACK'));});
        });
        // Attach a rejection handler before connect to avoid an unhandled SDK error.
        const handled=ready.catch(e=>{error(e);return false;});
        if(!await current.connect()){current.disconnect();throw Error('CONNECT');}
        const ok=await handled;if(!ok){current.disconnect();if(player===current){player=null;device='';}}return ok;
      }catch(e){if(run===generation){if(player)player.disconnect();player=null;device='';error(e);}return false;}
      finally{stopWaiting();if(run===generation){connecting=false;pending=null;render();}}
    })();return pending;
  }
  function uri(url){const m=String(url||'').match(/(?:open\.spotify\.com\/(?:intl-[a-z-]+\/)?|spotify:)(playlist|album|track)[/:]([A-Za-z0-9]{10,40})(?:[/?#]|$)/i);return m?{type:m[1].toLowerCase(),uri:'spotify:'+m[1].toLowerCase()+':'+m[2]}:null;}
  async function playSelected(){
    if(!device){fail('Önce Luna oynatıcısını aç.');return false;}
    const selection=uri(config.selection());if(!selection){fail('Bir şarkı, albüm veya çalma listesi seç.');return false;}
    // Must be invoked directly from a tap for iOS audio activation.
    try{await player.activateElement();await request('/me/player/play?device_id='+encodeURIComponent(device),selection.type==='track'?{uris:[selection.uri]}:{context_uri:selection.uri});message='Müzik Luna’da başlatılıyor…';render();return true;}catch(e){error(e);return false;}
  }
  function reset(){++generation;if(player)player.disconnect();player=null;device='';pending=null;connecting=false;track=null;playing=false;message='';if(config?.restoreEmbed)config.restoreEmbed();render();}
  return {
    init(options){config=options;const root=el();if(!root)return;root.addEventListener('click',async e=>{const b=e.target.closest('[data-live]');if(!b)return;try{
      if(b.dataset.live==='connect'){await connect();return;}
      if(!player||!device)return;
      if(b.dataset.live==='selected'){await playSelected();return;}
      if(b.dataset.live==='toggle'){if(!track){await playSelected();return;}const activated=player.activateElement();await activated;await player.togglePlay();}
      else if(b.dataset.live==='next')await player.nextTrack();else if(b.dataset.live==='previous')await player.previousTrack();
    }catch(err){error(err);}});render();},render,reset,playSelected,uri,
    status(){return {ready:!!device,connecting,playing,track:track?.name||''};}
  };
})();
window.SpotifyPlayback=SpotifyPlayback;
