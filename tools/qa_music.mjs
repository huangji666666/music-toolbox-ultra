import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {parseHTML} from 'linkedom';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const {document,window:dom}=parseHTML(read('index.html'));
const store=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};};
const sandbox={document,console,localStorage:store(),sessionStorage:store(),performance,URL,Blob,TextEncoder,TextDecoder,Uint8Array,Float32Array,ArrayBuffer,DataView,Map,Set,WeakMap,WeakSet,Promise,Math,JSON,Date,RegExp,Error,TypeError,DOMException,structuredClone,crypto:globalThis.crypto,navigator:{onLine:false},location:{protocol:'file:',href:'file:///index.html',reload(){}},innerWidth:390,innerHeight:844,devicePixelRatio:2,matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),addEventListener(){},removeEventListener(){},requestAnimationFrame(){return 1;},cancelAnimationFrame(){},setTimeout(){return 1;},clearTimeout(){},setInterval(){return 1;},clearInterval(){},queueMicrotask(){},alert(){},confirm(){return true;},getComputedStyle(){return {getPropertyValue(){return '';}}},Image:dom.Image,HTMLElement:dom.HTMLElement,Element:dom.Element,Node:dom.Node,SVGElement:dom.SVGElement,Event:dom.Event,CustomEvent:dom.CustomEvent};
sandbox.window=sandbox;sandbox.self=sandbox;sandbox.globalThis=sandbox;
sandbox.visualViewport={width:390,height:844,addEventListener(){}};
const context=vm.createContext(sandbox);
// 变调夹组合回归包含 12 调 × 9 和弦的完整指法核验，保留断言不变并给脚本足够执行窗口。
const run=code=>vm.runInContext(code,context,{timeout:120000});
run(document.querySelector('script:not([src])').textContent);
for(const file of ['sight-library-v2.js','special-tunings-v1.js','app-final.js','drum-workshop.js','ear-progressions.js'])run(read(file));
let checks=0;
const check=(code,label)=>{assert.equal(run(code),true,label);checks++;console.log('PASS '+label);};
async function auditCacheInstall(kind){
 const scope='https://qa.invalid/toolbox/',version=JSON.parse(read('version.json')),active=version.cache+'::%2Ftoolbox%2F',old='music-toolbox-ultra-previous::%2Ftoolbox%2F';
 const entries=new Map([[old,new Map([[scope+'index.html',new Response('previous')]])]]),handlers={},messages=[];
 if(kind==='existing')entries.set(active,new Map([[scope+'sentinel',new Response('keep')]]));
 const resolve=k=>typeof k==='string'?new URL(k,scope).href:k.url;
 let writes=0;
 const caches={delete:async name=>entries.delete(name),keys:async()=>[...entries.keys()],open:async name=>{
  if(!entries.has(name))entries.set(name,new Map());const map=entries.get(name);
  return {put:async(k,r)=>{if(name===active&&++writes===2&&['quota','existing'].includes(kind))throw new Error('QuotaExceededError');map.set(resolve(k),r.clone());},match:async k=>map.get(resolve(k))?.clone(),keys:async()=>[...map.keys()].map(url=>({url}))};
 }};
 const bodies=new Map([['./index.html','index'],['./app-final.js','script']]),assets=[];
 for(const [url,body] of bodies){const bytes=new TextEncoder().encode(body),digest=await crypto.subtle.digest('SHA-256',bytes);assets.push({url,bytes:bytes.length,sha256:[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('')});}
 const self={registration:{scope},location:{origin:'https://qa.invalid'},crypto,clients:{matchAll:async()=>[{postMessage:m=>messages.push(m)}],claim:async()=>{}},addEventListener:(kind,fn)=>handlers[kind]=fn};
 const fetch=async request=>{
  if(request.url.endsWith('release-assets.json'))return new Response(JSON.stringify({cache:version.cache,assets}));
  if(kind==='download'&&request.url===scope)return new Response('failure',{status:503});
  return new Response(bodies.get(request.url===scope?'./index.html':'./'+request.url.split('/').at(-1)));
 };
 const RelativeRequest=class {constructor(url){this.url=new URL(url,scope).href;}};
 vm.runInNewContext(read('sw.js'),{self,caches,fetch,Request:RelativeRequest,URL,Uint8Array,Error});
 let job;handlers.install({waitUntil:p=>job=p});let rejected=false;try{await job;}catch{rejected=true;}
 assert.equal(entries.has(active+'-staging'),false,'安装结束应清除暂存缓存');
 if(kind==='success'){
  assert.equal(rejected,false);assert.equal(entries.get(active).size,assets.length+1);assert.ok(messages.some(m=>m.type==='CACHE_READY'));
  handlers.activate({waitUntil:p=>job=p});await job;assert.equal(entries.has(old),false);
 }else{
  assert.equal(rejected,true);assert.equal(entries.has(old),true,'失败应保留旧缓存');assert.equal(messages.some(m=>m.type==='CACHE_READY'),false);
  assert.equal(entries.has(active),kind==='existing','复制失败清理新建目标，但保留此前存在的目标');
  const error=messages.find(m=>m.type==='CACHE_ERROR');assert.ok(error);assert.ok(error.failed.endsWith(kind==='download'?'index.html':'app-final.js'),'失败定位应指向实际失败资源');
  if(kind==='existing')assert.ok(entries.get(active).has(scope+'sentinel'));
 }
 checks++;console.log('PASS 实际Service Worker安装：'+({download:'下载失败保留旧缓存',quota:'目标复制配额失败清理半成缓存',existing:'目标复制失败保留已有活动缓存',success:'全部成功后才激活并淘汰旧缓存'})[kind]);
}
for(const kind of ['download','quota','existing','success'])await auditCacheInstall(kind);
async function auditCacheScope(scopePath,siblingPath){
 const scope='https://qa.invalid'+scopePath,sibling='https://qa.invalid'+siblingPath,version=JSON.parse(read('version.json')),tag='::'+encodeURIComponent(scopePath),active=version.cache+tag;
 const own='music-toolbox-ultra-old'+tag,other='music-toolbox-ultra-old::'+encodeURIComponent(siblingPath),legacyOwn='music-toolbox-ultra-legacy-own',legacyOther='music-toolbox-ultra-legacy-other',assetsOnly='music-toolbox-ultra-legacy-assets',unrelated='other-app-cache';
 const entries=new Map([[active,[scope+'index.html']],[own,[scope+'index.html']],[other,[sibling+'index.html']],[legacyOwn,[scope+'index.html',scope+'app-final.js']],[legacyOther,[sibling+'index.html']],[assetsOnly,[scope+'app-final.js']],[unrelated,[scope+'index.html']]]),handlers={};
 const caches={keys:async()=>[...entries.keys()],delete:async key=>entries.delete(key),open:async key=>({keys:async()=>entries.get(key).map(url=>({url}))})};
 const self={registration:{scope},location:{origin:'https://qa.invalid'},clients:{claim:async()=>{}},addEventListener:(kind,fn)=>handlers[kind]=fn};
 vm.runInNewContext(read('sw.js'),{self,caches,URL,Error});let job;handlers.activate({waitUntil:p=>job=p});await job;
 for(const key of [own,legacyOwn])assert.equal(entries.has(key),false,'应清理当前scope旧缓存：'+key);
 for(const key of [active,other,legacyOther,assetsOnly,unrelated])assert.equal(entries.has(key),true,'应保留活动、异scope或无法归属缓存：'+key);
 checks++;console.log('PASS 实际Service Worker激活：'+scopePath+'独立淘汰旧缓存，保留'+siblingPath+'及未归属缓存');
}
await auditCacheScope('/','/toolbox/');
await auditCacheScope('/toolbox/','/');
async function auditBackgroundPreload(){
 const M=run('Metro'),A=run('AudioEngine'),W=run('DrumWorkshop'),descriptors=Object.getOwnPropertyDescriptors(M),old={prepare:A.prepareClickSounds,play:A.playClick,ctx:A.ctx,init:W.init,stop:W.stop,legacy:W.legacyExisted,console:sandbox.console,storage:sandbox.localStorage,toast:run('toast')};
 const error=new Error('QA actual preload rejection'),warnings=[],unhandled=[],messages=[],previews=[];let scheduled=0;
 const onUnhandled=reason=>unhandled.push(reason);process.on('unhandledRejection',onUnhandled);
 try{
  sandbox.localStorage=store();sandbox.console={...console,warn:(...args)=>warnings.push(args)};sandbox.__preloadToast=message=>messages.push(message);run('toast=__preloadToast');
  A.prepareClickSounds=async()=>{throw error;};A.playClick=(time,accent,sound)=>previews.push(sound);A.ctx={state:'running',currentTime:0};W.init=()=>{};W.stop=()=>{};
  for(const name of ['renderDots','renderGroupingControls','renderSoundPanel','renderSwingControls','renderCustomUI','updateAccentGuide','bindBpmControls','bindSwingControls'])M[name]=()=>{};
  M.init();M.setKit('studio');M.setSlot('accent','accent_cc0_01');M.setTrackSound(0,'drum_classic_kick');
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(unhandled.length,0,'后台预载及自动试听真实拒绝不得成为unhandledRejection');assert.equal(warnings.filter(args=>args[0]==='节拍器音色后台预载失败'&&args[1]===error).length,6,'初始化三层与三种设置入口均记录原失败');
  assert.equal(warnings.filter(args=>args[0]==='节拍器音色试听失败'&&args[1]===error).length,2);assert.ok(messages.includes('音色试听失败，请检查本地素材'));assert.equal(previews.length,0,'音色未就绪不得试听或自动替换');
  assert.equal(M.slots.accent,'accent_cc0_01');assert.equal(M.trackSounds[0],'drum_classic_kick');assert.equal(M.kitId,'custom');
  M.playing=false;M._starting=false;M._scheduler=()=>scheduled++;await M.start();
  assert.equal(M.playing,false);assert.equal(M._starting,false);assert.equal(scheduled,0,'实际开始仍等待音色，失败时不得调度第一拍');assert.ok(messages.includes('音色准备失败，请检查本地素材'));
  assert.equal(M.slots.accent,'accent_cc0_01','加载失败不悄悄更换所选音色');
  A.prepareClickSounds=async()=>true;await A.previewClick('accent_cc0_01');assert.deepEqual(previews,['accent_cc0_01'],'成功试听仍使用指定音色');
 }finally{
  process.removeListener('unhandledRejection',onUnhandled);Object.assign(A,{prepareClickSounds:old.prepare,playClick:old.play,ctx:old.ctx});Object.assign(W,{init:old.init,stop:old.stop,legacyExisted:old.legacy});
  for(const key of Object.keys(M))if(!Object.hasOwn(descriptors,key))delete M[key];Object.defineProperties(M,descriptors);sandbox.console=old.console;sandbox.localStorage=old.storage;sandbox.__preloadToast=old.toast;run('toast=__preloadToast');delete sandbox.__preloadToast;
 }
 checks++;console.log('PASS 后台音色预载与自动试听真实拒绝不冒异常、不改选择，试听／开始失败不发声并提示');
}
await auditBackgroundPreload();
async function auditSightMetronomeFailure(){
 const S=run('SightMetronome'),M=run('Metro'),A=run('AudioEngine'),descriptors=Object.getOwnPropertyDescriptors(S),old={prepare:A.prepareClickSounds,ctx:A.ctx,playing:M.playing,console:sandbox.console,toast:run('toast')},error=new Error('QA sight metronome rejection'),unhandled=[],warnings=[],messages=[];let scheduled=0;
 let button=document.getElementById('sight-metro-toggle');const added=!button;if(added){button=document.createElement('button');button.id='sight-metro-toggle';document.body.append(button);}const label=button.textContent,classes=button.className;
 const onUnhandled=reason=>unhandled.push(reason);process.on('unhandledRejection',onUnhandled);
 try{
  sandbox.console={...console,warn:(...args)=>warnings.push(args)};sandbox.__sightFailureToast=message=>messages.push(message);run('toast=__sightFailureToast');
  A.prepareClickSounds=async()=>{throw error;};A.ctx={state:'running',currentTime:0};M.playing=false;S.playing=false;S.timer=null;S._restartAt=()=>scheduled++;
  run('SightSinging.toggleMetronome()');await new Promise(resolve=>setImmediate(resolve));
  assert.equal(unhandled.length,0,'视唱按钮丢弃start Promise时，加载拒绝仍被实际入口处理');assert.equal(S.playing,false);assert.equal(S.timer,null);assert.equal(scheduled,0);
  assert.equal(button.textContent,'节拍器 · 关');assert.equal(button.classList.contains('active'),false);assert.equal(warnings[0][1],error);assert.ok(messages.includes('音色准备失败，请检查本地素材'));
 }finally{
  process.removeListener('unhandledRejection',onUnhandled);Object.assign(A,{prepareClickSounds:old.prepare,ctx:old.ctx});M.playing=old.playing;Object.defineProperties(S,descriptors);sandbox.console=old.console;sandbox.__sightFailureToast=old.toast;run('toast=__sightFailureToast');delete sandbox.__sightFailureToast;
  if(added)button.remove();else{button.textContent=label;button.className=classes;}
 }
 checks++;console.log('PASS 视唱节拍器音色拒绝不冒异常、不调度、保持关闭按钮并明确提示');
}
await auditSightMetronomeFailure();
check(`(()=>{const A=AudioEngine,old={ctx:A.ctx,engine:A.engine,playSample:A.playSample,a4:Tuner.a4};try{A.ctx={currentTime:0,state:'running'};A.engine='sample';const hits=[];A.playSample=(asset,t,v,rate)=>{hits.push({asset,rate});return true;};for(const a4 of [430,440,450]){Tuner.a4=a4;for(const voice of ['piano','guitar'])A.playInstrument(69,1,.2,voice);}return hits.every((h,i)=>Math.abs(h.rate-[430,440,450][Math.floor(i/2)]/440)<1e-10);}finally{Object.assign(A,{ctx:old.ctx,engine:old.engine,playSample:old.playSample});Tuner.a4=old.a4;}})()`,'钢琴与吉他采样经真实播放入口跟随A4=430/440/450校准');
check(`(()=>{const A=AudioEngine,fields=['ctx','analyser','fftSize','timeBuf','freqBuf','yinDiff','yinCmndf','bufferQuality','envelopeAttack','envelopeRelease','detectionInterval','cachedPitch'],old=Object.fromEntries(fields.map(k=>[k,A[k]]));try{for(const sr of [44100,48000,96000,192000])for(const quality of ['low','standard','high']){A.ctx={sampleRate:sr};A.analyser={get frequencyBinCount(){return this.fftSize/2;}};A.setBufferQuality(quality);if(A.timeBuf.length!==A.analyser.fftSize||A.freqBuf.length!==A.analyser.frequencyBinCount)return false;for(const f of [27.5*430/440,32.7,82.4069,4186.009]){for(let i=0;i<A.timeBuf.length;i++)A.timeBuf[i]=.1*Math.sin(2*Math.PI*f*i/sr);const p=TunerAssist.yin(A.timeBuf,sr);if(!p.valid||Math.abs(1200*Math.log2(p.freq/f))>=5)throw Error(JSON.stringify({sr,quality,f,window:A.timeBuf.length,detected:p.freq,valid:p.valid}));}}return true;}finally{Object.assign(A,old);}})()`,'三档缓冲在44.1/48/96/192kHz下最低校准A0及C1/E2/C8纯音误差小于5音分');
run(`globalThis.auditMicrophone=async scenario=>{
 const A=AudioEngine,fields=['ctx','init','analyser','inputGainNode','micStream','micSourceNode','updateDeviceStatus','applyCaptureProfile','_micEpoch','_micPromise'],old=Object.fromEntries(fields.map(k=>[k,A[k]])),devices=navigator.mediaDevices;
 let calls=0,stops=0;const pending=[];
 const stream=()=>{const track={readyState:'live',muted:false,addEventListener(){},stop(){stops++;}};return {active:true,getTracks:()=>[track],getAudioTracks:()=>[track]};};
 try{
  Object.assign(A,{ctx:{createMediaStreamSource(){return {connect(){},disconnect(){}};}},init:async()=>{},analyser:{},inputGainNode:{},micStream:null,micSourceNode:null,updateDeviceStatus:()=>{},applyCaptureProfile:()=>{},_micPromise:null});
  navigator.mediaDevices={getUserMedia:()=>{calls++;return new Promise((resolve,reject)=>pending.push({resolve,reject}));}};
  const first=A.ensureMicrophone();for(let i=0;i<8;i++)await Promise.resolve();
  if(scenario==='denied'){
   const second=A.ensureMicrophone(),error=new Error('QA permission denied');error.name='NotAllowedError';pending[0].reject(error);
   return await first===false&&await second===false&&calls===1;
  }
  A.releaseMicrophone();const second=scenario==='reentry'?A.ensureMicrophone():null;
  pending[0].resolve(stream());if(await first!==false||stops!==1)return false;
  if(!second)return !A.micStream;
  for(let i=0;i<16;i++)await Promise.resolve();if(calls!==2)return false;
  const fresh=stream();pending[1].resolve(fresh);return await second===true&&A.micStream===fresh&&stops===1;
 }finally{A.releaseMicrophone(false);Object.assign(A,old);navigator.mediaDevices=devices;}
};`);
for(const [scenario,label] of [['cancel','延迟麦克风许可在离页后停掉旧输入'],['reentry','立即重返调音器会重新申请输入，不共用已取消请求'],['denied','并发调用遇权限拒绝不重复申请']]){assert.equal(await run('auditMicrophone('+JSON.stringify(scenario)+')'),true,label);checks++;console.log('PASS '+label);}
run('ProgressionTraining.selection=new Set(ProgressionTraining.types.map(t=>t.id))');
check(`MusicTheory.chordTemplates.add11.join(',')==='0,4,7,17'&&!MusicTheory.chordTemplates.add11.includes(11)`,'add11为三和弦加十一音，不额外加入大七音');
check(`(()=>{const P=ProgressionTraining;for(const mode of EarTraining.trainingScaleTypes)for(let root=0;root<12;root++)for(let d=1;d<=7;d++){const c=P.chord(String(d),mode,root);if(!c||c.notes.some(n=>!Number.isFinite(n)))return false;const expected=MusicTheory.scaleTemplates[mode];if(c.notes.some(n=>!expected.includes((n-root+120)%12)))return false;}return true;})()`,'各七音调式所有自然级和弦发声均为调内音');
check(`(()=>{const P=ProgressionTraining;P.borrowed=true;const c=P.chord('b3','Harmonic Minor',0);P.borrowed=false;const denied=P.chord('b3','Harmonic Minor',0),natural=P.chord('b3','Natural Minor',0);P.borrowed=true;return c?.borrowed&&c.type==='maj'&&c.notes.join(',')==='51,55,58'&&denied===null&&natural?.borrowed===false;})()`,'C和声小调的Eb大三按完整和弦判定借用，自然小调仍为调内');
check(`(()=>{const P=ProgressionTraining;P.borrowed=true;for(const mode of ['Natural Minor','Harmonic Minor','Melodic Minor','Aeolian'])for(let root=0;root<12;root++)for(const t of P.templates.filter(t=>t.mode==='minor')){const q=P.build(t,mode,root);if(!q||q.chords.some(c=>c.borrowed!==c.notes.some(n=>!MusicTheory.scaleTemplates[mode].includes((n-root+120)%12))))return false;}return true;})()`,'全部16个小调模板在12调及四小调中完整生成，借用标记与发声一致');
check(`(()=>{ChordLib.capoMode='none';const normal=ChordLib.fingerCount([2,0,2,0,2,0]);ChordLib.capoMode='full';ChordLib.capoFret=7;return normal===3&&ChordLib.fingerCount([9,0,9,0,9,0])===3;})()`,'全夹使用物理品位，横按不会遮挡夹位空弦');
check(`(()=>{const W=DrumWorkshop;W.state=W.defaultState();const i=document.createElement('input');i.id='drum-save-name';document.body.append(i);for(const name of ['__proto__','constructor','toString']){i.value=name;W.saveNamed();}i.remove();const saved=JSON.parse(localStorage.getItem(W.key)).saved;return ['__proto__','constructor','toString'].every(n=>Object.hasOwn(saved,n)&&W.validState(saved[n]));})()`,'鼓机方案名与JavaScript原型属性重名时仍完整持久化');
run(`globalThis.auditVoicings=config=>{
 const L=ChordLib;L.capoMode=config.mode;L.capoFret=config.fret||0;L.spider=Array.from({length:6},(_,i)=>config.strings?.[i]||{mode:'off',fret:12});L.bassMode='auto';L.customTuning=null;L.tuningName='Standard';
 for(let root=0;root<12;root++)for(const type of ['Maj','Min','7','Maj7','Min7','sus2','sus4','dim','aug']){
  L.root=root;L.type=type;L.generate();const pcs=MusicTheory.chordTemplates[type].map(n=>(root+n)%12),base=[40,45,50,55,59,64];
  if(config.mode==='none'&&!L.voicings.length)throw Error(root+' '+type+' 缺失指法');
  for(const v of L.voicings){const notes=[];for(let i=0;i<6;i++){const f=v.frets[i];if(f<0)continue;const capo=L.spider[i];let n=base[i]+f;
   if(config.mode==='full'){if(f===0)n=base[i]+L.capoFret;else if(f<=L.capoFret)throw Error('全夹前出现按品');}
   if(config.mode==='spider'&&capo.mode==='press'){if(f===0||f===capo.fret)n=base[i]+capo.fret;else if(f<capo.fret)throw Error('蜘蛛实按前出现按品');}
   if(config.mode==='spider'&&capo.mode==='harmonic'&&f===0)n=base[i]+({5:24,7:19,12:12,19:19,24:24})[capo.fret];
   notes.push(n);}
   if(notes.some(n=>!pcs.includes(n%12))||pcs.some(pc=>!notes.some(n=>n%12===pc))||L.fingerCount(v.frets)>4)throw Error(JSON.stringify({config,root,type,frets:v.frets,notes,pcs}));
  }
  if(L.voicingSnapshot){const current=L.voicings[L.voicingIdx].frets.map((f,i)=>f<0?null:L.effectiveMidi(base[i],f,i)).filter(Number.isFinite);if(current.join(',')!==L.voicingSnapshot.notes.map(n=>n.midi).join(','))throw Error('指法与试听快照错配');}
 }
 return true;
};`);
for(const [label,config] of [
 ['无夹',{mode:'none'}],['全夹2品',{mode:'full',fret:2}],['全夹7品',{mode:'full',fret:7}],
 ['蜘蛛二／五弦H7',{mode:'spider',strings:{1:{mode:'harmonic',fret:7},4:{mode:'harmonic',fret:7}}}],
 ['蜘蛛三／五弦H7',{mode:'spider',strings:{1:{mode:'harmonic',fret:7},3:{mode:'harmonic',fret:7}}}],
 ['蜘蛛混合实按与泛音',{mode:'spider',strings:{1:{mode:'press',fret:7},3:{mode:'press',fret:5},4:{mode:'harmonic',fret:12}}}],
])check('auditVoicings('+JSON.stringify(config)+')','12根音九种常用和弦，'+label+'：独立音级核验、最多四指及试听快照一致');
check(`(()=>{const W=DrumWorkshop;for(const signature of ['2/2','2/4','3/4','4/4','5/4','6/4','7/4','5/8','6/8','7/8','9/8','12/8'])for(const style of Object.keys(W.styleCatalog))for(let variant=0;variant<8;variant++){W.state=W.defaultState();Object.assign(W.state,{signature,bars:8,style,variant});W.generate(true,false);if(!W.validState(W.state)||W.events().some(e=>!Number.isFinite(e.t)||e.t<0||e.t>=W.length()))throw Error(signature+' '+style+' '+variant);}W.state=W.defaultState();W.state.signature='2/2';W.state.bpm=120;return W.quarterSeconds()*2===.5;})()`,'28风格八变体与12拍号八小节保存有效、鼓点不越界，2/2按主拍计速');
console.log(JSON.stringify({checks,failed:0}));


