const CACHE_NAME='music-toolbox-ultra-v13.5.33-20261119-12';
const SCOPE_TAG='::'+encodeURIComponent(new URL(self.registration.scope).pathname);
const ACTIVE_CACHE=CACHE_NAME+SCOPE_TAG;
const STAGING_CACHE=`${ACTIVE_CACHE}-staging`;
const OWN_CACHE_PREFIXES=['music-toolbox-ultra-','xingxian-v13-'];
const MANIFEST_URL='./release-assets.json';
const scope=self.registration.scope;
const scoped=url=>new URL(url,scope).href;
let selected,repairing;
const homeFile='./index.html',homeKey='./';
const entryKey=url=>url===homeFile?homeKey:url;
const cachedHome=async cache=>(await cache.match(homeKey))||(await cache.match(homeFile)); // pre-33 snapshots

// The manifest is the commit record. Count and compare actual request URLs before using a snapshot.
async function complete(name){
  const cache=await caches.open(name),response=await cache.match(MANIFEST_URL);
  if(!response)return false;
  const m=await response.json(),urls=new Set((await cache.keys()).map(r=>r.url));
  return m.cache+SCOPE_TAG===name&&Array.isArray(m.assets)&&m.assets.some(a=>a.url===homeFile)&&m.assets.every(a=>urls.has(scoped(a.url))||a.url===homeFile&&urls.has(scope));
}
async function choose(){
  const keys=await caches.keys();
  for(const name of [ACTIVE_CACHE,...keys.slice().reverse().filter(k=>k!==ACTIVE_CACHE&&k.startsWith('music-toolbox-ultra-')&&k.endsWith(SCOPE_TAG))]){
    if(keys.includes(name)&&await complete(name).catch(()=>false))return name;
  }
  return null;
}
function cleanNavigation(response){
  if(!response?.redirected)return response;
  const headers=new Headers(response.headers);for(const h of ['content-encoding','content-length','transfer-encoding'])headers.delete(h);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function broadcast(message){
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  clients.filter(client=>!client.url||new URL('./',client.url).href===scope).forEach(client=>client.postMessage({...message,cache:CACHE_NAME}));
}

async function digestHex(bytes){
  if(!self.crypto?.subtle)return null;
  const digest=await self.crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
}

async function prepare(verify=false){
    const exists=(await caches.keys()).includes(ACTIVE_CACHE);
    if(exists&&!verify&&await complete(ACTIVE_CACHE).catch(()=>false))return;
    // A new build's namespace is invisible to the serving worker. Only repair of a pre-existing namespace needs a separate stage.
    const stage=await caches.open(exists?STAGING_CACHE:ACTIVE_CACHE);
    let failed='release-assets.json';
    try{
      const manifestResponse=await fetch(new Request(MANIFEST_URL,{cache:'reload'}));
      if(!manifestResponse.ok)throw new Error(`${manifestResponse.status} ${MANIFEST_URL}`);
      const manifest=await manifestResponse.clone().json(),assets=Array.isArray(manifest.assets)?manifest.assets:[];
      if(!assets.some(a=>a.url==='./index.html')||manifest.cache!==CACHE_NAME)throw new Error('发布清单与 Service Worker 版本不一致');
      for(let index=0;index<assets.length;index++){
        const item=assets[index];failed=item.url;
        const key=entryKey(item.url),response=await fetch(new Request(key,{cache:'reload',mode:'same-origin'}));
        if(!response.ok)throw new Error(`${response.status} ${item.url}`);
        const bytes=await response.clone().arrayBuffer();
        if(bytes.byteLength!==item.bytes)throw new Error(`大小不符 ${item.url}`);
        const hash=await digestHex(bytes);if(hash&&hash!==item.sha256)throw new Error(`校验不符 ${item.url}`);
        await stage.put(key,cleanNavigation(response));
        await broadcast({type:'CACHE_PROGRESS',done:index+1,total:assets.length});
      }
      const target=exists?await caches.open(ACTIVE_CACHE):stage;
      if(exists)for(const item of assets){failed=item.url;const key=entryKey(item.url);await target.put(key,await stage.match(key));}
      await target.put(MANIFEST_URL,manifestResponse);
      if(exists)await caches.delete(STAGING_CACHE);
      selected=null;
      await broadcast({type:'CACHE_READY',cache:CACHE_NAME,total:assets.length});
    }catch(error){
      await caches.delete(STAGING_CACHE);
      if(!exists)await caches.delete(ACTIVE_CACHE);
      await broadcast({type:'CACHE_ERROR',cache:CACHE_NAME,failed,message:String(error?.message||error)});
      throw error;
    }
}
const prepareOnce=(verify=false)=>repairing||(repairing=prepare(verify).finally(()=>{repairing=null}));
self.addEventListener('install',event=>event.waitUntil((async()=>{
  // A broken old page cannot send SKIP_WAITING. Healthy sessions keep their update prompt.
  let recover=false;
  if(self.registration.active){const name=await choose();const home=name&&await cachedHome(await caches.open(name));recover=!home||home.redirected||!home.ok;}
  await prepareOnce();if(recover)await self.skipWaiting();
})()));

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    let reserve;
    for(const k of keys.slice().reverse())if(k!==ACTIVE_CACHE&&k.startsWith('music-toolbox-ultra-')&&k.endsWith(SCOPE_TAG)&&await complete(k).catch(()=>false)){reserve=k;break;}
    for(const key of keys){
      if(key===ACTIVE_CACHE||key===reserve||key===STAGING_CACHE||!OWN_CACHE_PREFIXES.some(prefix=>key.startsWith(prefix)))continue;
      const tag=key.includes('::')?'::'+key.slice(key.lastIndexOf('::')+2).replace(/-staging$/,''):null;
      const sameScope=key.endsWith(SCOPE_TAG);
      if(tag!==null&&!sameScope&&tag!==SCOPE_TAG)continue;
      const cache=await caches.open(key),requests=await cache.keys();
      if(!sameScope&&tag===null&&!requests.some(request=>request.url===new URL('index.html',self.registration.scope).href))continue;
      if(sameScope||(requests.length&&requests.every(request=>request.url.startsWith(self.registration.scope))))await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')event.waitUntil(self.skipWaiting());
  if(event.data?.type==='BUILD_ID')event.ports[0]?.postMessage(CACHE_NAME);
  if(event.data?.type==='REPAIR_OFFLINE')event.waitUntil(prepareOnce(true).then(()=>event.ports[0]?.postMessage({ok:true}),()=>event.ports[0]?.postMessage({ok:false})));
});

// A network navigation must belong to the same release as its scripts. A stale CDN,
// captive portal, timeout or offline request must not replace the verified snapshot.
async function navigate(file,name){
  const cache=name&&await caches.open(name),hit=cache&&(file===homeFile?await cachedHome(cache):await cache.match(file));
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),3500);
  try{
    const etag=hit?.headers.get('etag');
    const response=await fetch(scoped(entryKey(file)),{cache:'no-store',mode:'same-origin',signal:abort.signal,headers:etag?{'If-None-Match':etag}:{}});
    if(response.status===304&&hit)return cleanNavigation(hit);
    if(!response.ok)throw Error('navigation '+response.status);
    if(cache){const manifest=await(await cache.match(MANIFEST_URL)).json(),asset=manifest.assets.find(a=>a.url===file);
      if(!asset||await digestHex(await response.clone().arrayBuffer())!==asset.sha256)throw Error('different release');}
    return cleanNavigation(response);
  }catch(error){if(hit)return cleanNavigation(hit);throw error;}finally{clearTimeout(timer);}
}
self.addEventListener('fetch',event=>{
  const request=event.request;if(request.method!=='GET')return;
  const url=new URL(request.url);if(url.origin!==self.location.origin||!url.href.startsWith(scope))return;
  const path=url.origin+url.pathname,home=path===scope||path===scoped('index.html'),repair=path===scoped('repair')||path===scoped('repair.html');
  if(request.mode==='navigate'&&(home||repair)){
    // The independent online repair page must work even when the active snapshot is bad.
    if(repair&&url.searchParams.has('reset')){event.respondWith(fetch(scoped('repair.html'),{cache:'no-store',mode:'same-origin'}).then(cleanNavigation));return;}
    selected=choose();event.respondWith(selected.then(name=>navigate(home?homeFile:'./repair.html',name)));return;
  }
  if(request.mode==='navigate')return;
  if(url.searchParams.has('reset')||url.searchParams.has('resetProbe')||url.searchParams.has('updateProbe')){event.respondWith(fetch(request,{cache:'no-store'}).then(cleanNavigation));return;}
  if(url.pathname.endsWith('/version.json')||url.pathname.endsWith('/release-assets.json')){
    event.respondWith(fetch(request,{cache:'no-store'}).catch(async()=>{const name=await (selected||choose());if(name){const hit=await(await caches.open(name)).match(request,{ignoreSearch:true});if(hit)return hit;}return Response.error();}));return;
  }
  if(!selected)selected=choose();
  event.respondWith(selected.then(async name=>{
    const cache=name&&await caches.open(name),cached=cache&&(home?await cachedHome(cache):await cache.match(request,{ignoreSearch:url.pathname.endsWith('/icons/app-icon.svg')}));
    return cached?cleanNavigation(cached):fetch(request);
  }));
});
