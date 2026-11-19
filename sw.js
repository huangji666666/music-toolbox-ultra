const CACHE_NAME='music-toolbox-ultra-v13.5.31-20261119-10';
const SCOPE_TAG='::'+encodeURIComponent(new URL(self.registration.scope).pathname);
const ACTIVE_CACHE=CACHE_NAME+SCOPE_TAG;
const STAGING_CACHE=`${ACTIVE_CACHE}-staging`;
const OWN_CACHE_PREFIXES=['music-toolbox-ultra-','xingxian-v13-'];
const MANIFEST_URL='./release-assets.json';
const scope=self.registration.scope;
const scoped=url=>new URL(url,scope).href;
let selected,repairing;

// The manifest is the commit record. Count and compare actual request URLs before using a snapshot.
async function complete(name){
  const cache=await caches.open(name),response=await cache.match(MANIFEST_URL);
  if(!response)return false;
  const m=await response.json(),urls=new Set((await cache.keys()).map(r=>r.url));
  return m.cache+SCOPE_TAG===name&&Array.isArray(m.assets)&&m.assets.some(a=>a.url==='./index.html')&&m.assets.every(a=>urls.has(scoped(a.url)));
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
        const response=await fetch(new Request(item.url,{cache:'reload'}));
        if(!response.ok)throw new Error(`${response.status} ${item.url}`);
        const bytes=await response.clone().arrayBuffer();
        if(bytes.byteLength!==item.bytes)throw new Error(`大小不符 ${item.url}`);
        const hash=await digestHex(bytes);if(hash&&hash!==item.sha256)throw new Error(`校验不符 ${item.url}`);
        await stage.put(item.url,item.url.endsWith('.html')?cleanNavigation(response):response);
        await broadcast({type:'CACHE_PROGRESS',done:index+1,total:assets.length});
      }
      const target=exists?await caches.open(ACTIVE_CACHE):stage;
      if(exists)for(const item of assets){failed=item.url;await target.put(item.url,await stage.match(item.url));}
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
self.addEventListener('install',event=>event.waitUntil(prepareOnce()));

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

self.addEventListener('fetch',event=>{
  const request=event.request;if(request.method!=='GET')return;
  const url=new URL(request.url);if(url.origin!==self.location.origin||!url.href.startsWith(scope))return;
  if(url.searchParams.has('reset')||url.searchParams.has('resetProbe')||url.searchParams.has('updateProbe')){event.respondWith(fetch(request,{cache:'no-store'}));return;}
  if(url.pathname.endsWith('/version.json')||url.pathname.endsWith('/release-assets.json')){
    event.respondWith(fetch(request,{cache:'no-store'}).catch(async()=>{const name=await (selected||choose());if(name){const hit=await(await caches.open(name)).match(request,{ignoreSearch:true});if(hit)return hit;}return Response.error();}));return;
  }
  const home=request.mode==='navigate'&&[scope,scoped('index.html')].includes(url.origin+url.pathname);
  if(home||!selected)selected=choose();
  event.respondWith(selected.then(async name=>{
    const cached=name&&await (await caches.open(name)).match(home?'./index.html':request,{ignoreSearch:url.pathname.endsWith('/icons/app-icon.svg')});
    return cached?(request.mode==='navigate'?cleanNavigation(cached):cached):fetch(request);
  }));
});
