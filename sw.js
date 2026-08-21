const CACHE_NAME='music-toolbox-ultra-v13.5.8-20260822-1';
const STAGING_CACHE=`${CACHE_NAME}-staging`;
const OWN_CACHE_PREFIXES=['music-toolbox-ultra-','xingxian-v13-'];
const MANIFEST_URL='./release-assets.json';

async function broadcast(message){
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  clients.forEach(client=>client.postMessage(message));
}

async function digestHex(bytes){
  if(!self.crypto?.subtle)return null;
  const digest=await self.crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    await caches.delete(STAGING_CACHE);
    const stage=await caches.open(STAGING_CACHE);
    let failed='release-assets.json';
    try{
      const manifestResponse=await fetch(new Request(MANIFEST_URL,{cache:'reload'}));
      if(!manifestResponse.ok)throw new Error(`${manifestResponse.status} ${MANIFEST_URL}`);
      const manifest=await manifestResponse.clone().json(),assets=Array.isArray(manifest.assets)?manifest.assets:[];
      if(!assets.length||manifest.cache!==CACHE_NAME)throw new Error('发布清单与 Service Worker 版本不一致');
      await stage.put(MANIFEST_URL,manifestResponse.clone());
      for(let index=0;index<assets.length;index++){
        const item=assets[index];failed=item.url;
        const response=await fetch(new Request(item.url,{cache:'reload'}));
        if(!response.ok)throw new Error(`${response.status} ${item.url}`);
        const bytes=await response.clone().arrayBuffer();
        if(bytes.byteLength!==item.bytes)throw new Error(`大小不符 ${item.url}`);
        const hash=await digestHex(bytes);if(hash&&hash!==item.sha256)throw new Error(`校验不符 ${item.url}`);
        await stage.put(item.url,response);
        await broadcast({type:'CACHE_PROGRESS',done:index+1,total:assets.length});
      }
      const target=await caches.open(CACHE_NAME);
      for(const request of await stage.keys()){const response=await stage.match(request);if(response)await target.put(request,response);}
      await caches.delete(STAGING_CACHE);
      await broadcast({type:'CACHE_READY',cache:CACHE_NAME,total:assets.length});
    }catch(error){
      await caches.delete(STAGING_CACHE);
      await broadcast({type:'CACHE_ERROR',cache:CACHE_NAME,failed,message:String(error?.message||error)});
      throw error;
    }
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE_NAME&&key!==STAGING_CACHE&&OWN_CACHE_PREFIXES.some(prefix=>key.startsWith(prefix))).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

self.addEventListener('fetch',event=>{
  const request=event.request;if(request.method!=='GET')return;
  const url=new URL(request.url);if(url.origin!==self.location.origin)return;
  if(url.pathname.endsWith('/version.json')||url.pathname.endsWith('/release-assets.json')){
    event.respondWith(fetch(request,{cache:'no-store'}).catch(()=>caches.match(request)));return;
  }
  if(request.mode==='navigate'){
    event.respondWith(caches.match('./index.html').then(hit=>hit||fetch(request).catch(()=>caches.match('./index.html'))));return;
  }
  event.respondWith(caches.match(request).then(hit=>hit||fetch(request)));
});
