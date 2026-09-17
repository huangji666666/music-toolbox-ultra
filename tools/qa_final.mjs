import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseHTML} from 'linkedom';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const failures=[];
const passes=[];
const check=(condition,label,detail='')=>{
    if(condition)passes.push(label);
    else failures.push(`${label}${detail?`：${detail}`:''}`);
};
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

const html=read('index.html');
const releaseCss=read('app-final.css');
const releaseJs=read('app-final.js');
const version=JSON.parse(read('version.json'));
const packageMetadata=JSON.parse(read('package.json'));
const {document}=parseHTML(html);

/* 结构与发布文件 */
const idCounts=new Map();
for(const element of document.querySelectorAll('[id]'))idCounts.set(element.id,(idCounts.get(element.id)||0)+1);
const duplicateIds=[...idCounts].filter(([,count])=>count>1).map(([id])=>id);
check(duplicateIds.length===0,'DOM ID 无重复',duplicateIds.join(', '));
check(document.querySelectorAll('main > .page').length===9,'九个主页面完整');
check(document.querySelectorAll('main > .page.active').length===1,'初始仅一个主页面激活');
check(document.querySelectorAll('nav .nav-item').length===9,'底栏九项完整');
check(new Set([...document.querySelectorAll('nav .nav-item')].map(item=>item.dataset.page)).size===9,'底栏页面目标无重复');

const requiredIds=[
    'tuner-capo-button','sight-practice-length','sight-prev-phrase','sight-next-phrase','sight-phrase-progress',
    'metro-ts-select','metro-swing-master','chord-capo-button','explore-capo-button','chord-root-row',
    'chord-type-row','chord-bass-label','chord-bass-nav-button','chord-guess-list','instrument-tone-open','instrument-stage','theory-categories',
    'sight-mode-filter-open','metro-sound-editor-btn','metro-sound-panel','set-mic-profile',
];
const missingIds=requiredIds.filter(id=>!document.getElementById(id));
check(missingIds.length===0,'本轮关键控件均存在',missingIds.join(', '));

const scriptOrder=[...document.querySelectorAll('script[src]')].map(script=>script.getAttribute('src'));
check(JSON.stringify(scriptOrder)===JSON.stringify(['./sight-library-v2.js','./special-tunings-v1.js','./app-final.js','./drum-workshop.js']),'最终脚本加载顺序固定');
check(document.querySelector('link[href="./app-final.css"]')!==null,'最终样式已加载');
check(!scriptOrder.some(source=>/v13\.5\.[14]|v13-extension/.test(source)),'发布页面不再加载旧版增量文件');
check(!/#page-[\w-]+(?:\.active)?\s*\{[^}]*display\s*:/s.test(releaseCss),'候选样式未用页面 ID 改写 display');
check(/\.page:not\(\.active\)[^{]*\{[^}]*display\s*:\s*none\s*!important/s.test(releaseCss),'非活动页面强制隔离');
check(/#page-theory button[\s\S]*?min-height\s*:\s*48px\s*!important/.test(releaseCss),'乐理触控目标至少 48px');
check(/#page-theory button>\*[\s\S]*?pointer-events\s*:\s*none/.test(releaseCss),'乐理按钮子元素不截获触控');
check(/instrument-toolbar[\s\S]*?grid-template-columns[\s\S]*?overflow-x\s*:\s*auto/.test(releaseCss),'虚拟乐器五控件单行且可局部横滑');
check(/#page-tuner #tuning-panel\{[\s\S]*?position\s*:\s*absolute\s*!important[\s\S]*?overflow\s*:\s*hidden\s*!important/.test(releaseCss)&&/#page-tuner #tuning-panel\.open\{[\s\S]*?overflow-y\s*:\s*auto\s*!important/.test(releaseCss),'调音器调弦列表为独立抽屉且内部滚动');
check(/\.virtual-fret-wrap\.is-horizontal[\s\S]*?grid-template-columns[\s\S]*?\.virtual-fret-wrap\.vertical/.test(releaseCss)&&/--string-axis/.test(releaseCss),'横竖指板与演奏区共用琴弦坐标轴');
check(/\.sight-playback-strip\{display\s*:\s*none\s*!important/.test(releaseCss)&&/\.sight-playback-strip\.active\{display\s*:\s*block\s*!important/.test(releaseCss),'视唱播放进度仅在播放时显示');
check(/\.jianpu-pitch\.beams-1::after/.test(releaseCss)&&/\.jianpu-extension/.test(releaseCss),'简谱使用下划线与延音横线表达时值');
check(/\.ramp-lite-stepper[\s\S]*?grid-template-columns/.test(releaseCss)&&/data-mode="lite"/.test(releaseCss),'精简渐速间隔控制布局存在');
check(document.querySelectorAll('.settings-community button').length===2,'赞助与反馈入口各一项');

check(/\.chord-root-ruler\{[\s\S]*?--root-edge\s*:\s*12px[\s\S]*?height\s*:\s*46px/.test(releaseCss)&&/var\(--root-step\) \* \(100% - 2 \* var\(--root-edge\)\) \/ 12/.test(releaseCss),'根音刻度尺保持紧凑并使用十二等分坐标');
check(/\.chord-root-ruler-tick span\{[\s\S]*?font-size\s*:\s*12px/.test(releaseCss)&&/\.chord-root-ruler-value\{[\s\S]*?left\s*:\s*calc\(var\(--root-edge\)/.test(releaseCss)&&/transform\s*:\s*translateX\(-50%\)/.test(releaseCss)&&/background\s*:\s*var\(--prim\)/.test(releaseCss),'根音气泡始终以自身中心对齐选中刻度，不在首尾偏移');
check(/\.sight-settings-modal \.practice-modal-card/.test(releaseCss)&&/\.sight-settings-modal-scroll/.test(releaseCss),'视唱出题设置使用内部滚动的悬浮窗');
check(/\.chord-controls>\.chord-bass-control\{display\s*:\s*none\s*!important/.test(releaseCss)&&/\.voicing-step-group/.test(releaseCss)&&/@media\(max-width:430px\)[\s\S]*?\.voicing-step-group\{grid-column:1\/-1/.test(releaseCss),'最低音转位移至和弦图下方，窄屏使用两行舒适布局');
check(/\.sight-drum-score \.drum-staff-line/.test(releaseCss),'鼓谱专用样式已隔离');
check(/data-ios-standalone="true"\]\{--safe-t:max\(env\(safe-area-inset-top,0px\),60px\)/.test(releaseCss)&&/data-ios="true"\]\[data-layout="compact"\][\s\S]*?height:calc\(46px \+ var\(--safe-t\)\)/.test(releaseCss)&&/data-ios="true"\]\[data-layout="short"\][\s\S]*?height:calc\(44px \+ var\(--safe-t\)\)/.test(releaseCss),'iPhone 独立安装模式预留灵动岛安全区且不被紧凑布局覆盖');
check(document.querySelector('.sight-score-shell + .sight-score-navigation')!==null,'视唱上一题/上一句导航已移出谱窗裁剪层');
check(/\.sight-systems/.test(releaseCss)&&/\.sight-layout-choice/.test(releaseCss),'视唱多行与布局选择样式存在');
check(fs.existsSync(path.join(root,'.github','workflows','pages.yml')),'GitHub Actions 整目录发布配置存在');

for(const file of ['app-final.js','drum-workshop.js','sw.js','tools/build_standalone.mjs','tools/build_release.mjs','tools/build_sight_library.mjs','tools/build_drum_samples.mjs']){
    try{execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});check(true,`${file} 语法`);}
    catch(error){check(false,`${file} 语法`,String(error.stderr||error.message));}
}

const serviceWorker=read('sw.js'),releaseManifest=JSON.parse(read('release-assets.json')),appShell=releaseManifest.assets.map(item=>item.url);
const missingShellFiles=appShell.filter(item=>!fs.existsSync(path.join(root,item.replace(/^\.\//,''))));
check(missingShellFiles.length===0,'离线清单文件全部存在',missingShellFiles.join(', '));
check(appShell.includes('./app-final.css')&&appShell.includes('./app-final.js'),'最终样式与脚本进入离线缓存');
check(appShell.filter(item=>/assets\/metronome-accent-cc0\/\d{2}\.wav$/.test(item)).length===50,'50 个重拍音色全部进入离线缓存');
check(serviceWorker.includes(`const CACHE_NAME='${version.cache}'`)&&releaseManifest.cache===version.cache,'version.json、发布清单与缓存名一致');
check(serviceWorker.includes('STAGING_CACHE')&&serviceWorker.includes("type:'CACHE_ERROR'")&&serviceWorker.includes('failed'),'Service Worker 使用暂存缓存并报告具体缺失资源');
check(packageMetadata.version===version.version,'package.json 与候选版本号一致');
check(releaseJs.includes(`const V13_VERSION='${version.version}'`)&&releaseJs.includes(`const FINAL_BUILD='${version.build}'`),'运行时版本与构建号一致');


const selectedAudio=JSON.parse(read('licenses/metronome-sources.json')).samples;
const approvedIds='R02 N01 N02 N03 N04 N05 N06 N07 N08 N09 N10 N11 N12 N13 N14 N15 N16 N17 N18 N19 N22 N23 N24 N25 N26 N27 N28 N29 N30 N31 N32 N33 N34 N36 N38 N39 N42 N43 N46 N50 N51 N52 N57 N58 N59 N60 K01 K02 K03 K04'.split(' ');
check(selectedAudio.length===50&&new Set(selectedAudio.map(s=>s.id)).size===50&&approvedIds.every(id=>selectedAudio.some(s=>s.auditionId===id)),'50 个用户确认编号全部集成，无 H 系列或遗漏');
for(const sample of selectedAudio){
    const bytes=fs.readFileSync(path.join(root,sample.file));
    let peak=0;for(let i=44;i<bytes.length;i+=2)peak=Math.max(peak,Math.abs(bytes.readInt16LE(i)));
    check(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WAVE'&&bytes.readUInt16LE(20)===1&&bytes.readUInt16LE(34)===16&&peak===32767&&bytes.length===sample.bytes&&crypto.createHash('sha256').update(bytes).digest('hex')===sample.sha256&&sample.license==='CC0-1.0',sample.auditionId+' PCM16 峰值、来源许可与 SHA-256');
}

/* 在轻量 DOM 中执行与浏览器一致的经典脚本顺序。 */
const createStore=()=>{
    const values=new Map();
    return {getItem:key=>values.has(String(key))?values.get(String(key)):null,setItem:(key,value)=>values.set(String(key),String(value)),removeItem:key=>values.delete(String(key)),clear:()=>values.clear()};
};
const parsed=parseHTML(html),runtimeDocument=parsed.document,domWindow=parsed.window;
const sandbox={
    document:runtimeDocument,console,localStorage:createStore(),sessionStorage:createStore(),
    performance:globalThis.performance,URL,Blob,TextEncoder,TextDecoder,Uint8Array,Float32Array,ArrayBuffer,DataView,
    Map,Set,WeakMap,WeakSet,Promise,Math,JSON,Date,RegExp,Error,TypeError,DOMException:globalThis.DOMException,
    structuredClone:globalThis.structuredClone,crypto:globalThis.crypto,navigator:{onLine:false},
    location:{protocol:'file:',href:'file:///index.html',reload(){}},innerWidth:390,innerHeight:844,devicePixelRatio:2,
    matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),addEventListener(){},removeEventListener(){},
    requestAnimationFrame(){return 1;},cancelAnimationFrame(){},setTimeout(){return 1;},clearTimeout(){},setInterval(){return 1;},clearInterval(){},
    queueMicrotask(){},alert(){},getComputedStyle(){return {getPropertyValue(){return '';}}},
    Image:domWindow.Image,HTMLElement:domWindow.HTMLElement,Element:domWindow.Element,Node:domWindow.Node,
    SVGElement:domWindow.SVGElement,Event:domWindow.Event,CustomEvent:domWindow.CustomEvent,
};
sandbox.window=sandbox;sandbox.self=sandbox;sandbox.globalThis=sandbox;
sandbox.visualViewport={width:390,height:844,addEventListener(){}};
const context=vm.createContext(sandbox);
const run=(code,name)=>vm.runInContext(code,context,{filename:name,timeout:20000});
try{
    run(runtimeDocument.querySelector('script:not([src])').textContent,'index-inline.js');
    run(read('sight-library-v2.js'),'sight-library-v2.js');
    run(read('special-tunings-v1.js'),'special-tunings-v1.js');
    run(releaseJs,'app-final.js');
    run(read('drum-workshop.js'),'drum-workshop.js');
    check(true,'完整脚本链可加载');
}catch(error){
    check(false,'完整脚本链可加载',error.stack||error.message);
}

const evaluate=expression=>run(expression,'qa-expression.js');
if(!failures.some(item=>item.startsWith('完整脚本链可加载'))){

    check(evaluate("Object.keys(window.MTU_ACCENT_SAMPLE_META).length")===96&&selectedAudio.every(s=>evaluate('window.MTU_ACCENT_SAMPLE_META['+JSON.stringify(s.id)+'].label').includes(s.auditionId)),'原 90 音源保留，加入 T04–T06 六个确认镲音');
    check(evaluate("Object.values(METRO_KITS).every(k=>[k.accent,k.beat,k.subdivision,k.swing,...k.tracks].flat().every(s=>Metro._allSounds().includes(s)))"),'12 套预设仅使用确认音源及保留的电子 Click');
    check(evaluate("(()=>{const channels=[new Float32Array(4410).fill(.1),new Float32Array(4410).fill(.1)],b={numberOfChannels:2,length:4410,sampleRate:44100,getChannelData:i=>channels[i]};const quiet=AudioEngine.balanceAccentSample(b);channels.forEach(c=>c.fill(1));return quiet===1&&AudioEngine.balanceAccentSample(b)===.5;})()"),'响度平衡不压低弱素材，强素材衰减最多 6 dB，不追加增益');
    const dynamics=evaluate(`(()=>{const old={ctx:AudioEngine.ctx,click:AudioEngine.playClick,beat:AudioEngine.playMetronomeBeat,signature:Metro.signature,custom:Metro.customMode,sub:Metro.sub,swing:Metro.swingEnabled,mode:Metro.accentMode};try{AudioEngine.ctx={currentTime:0};const hits=[];AudioEngine.playClick=(t,a,s,v)=>hits.push(v);AudioEngine.playMetronomeBeat=(t,a,b,s,v)=>hits.push(v);Metro.signature='4/4';Metro.customMode=false;Metro.sub=1;Metro.swingEnabled=false;Metro.accentMode='meter';for(let i=0;i<4;i++)Metro._scheduleBeat(i,0);const main=hits.splice(0);for(let i=0;i<4;i++)Metro._rampScheduleBeat(i,0);return {main,ramp:hits};}finally{AudioEngine.ctx=old.ctx;AudioEngine.playClick=old.click;AudioEngine.playMetronomeBeat=old.beat;Metro.signature=old.signature;Metro.customMode=old.custom;Metro.sub=old.sub;Metro.swingEnabled=old.swing;Metro.accentMode=old.mode;}})()`);
    check(JSON.stringify(dynamics.main)===JSON.stringify([.86,.58,.70,.58])&&JSON.stringify(dynamics.ramp)===JSON.stringify(dynamics.main),'主节拍器与渐速训练共用强弱比例');
    check(evaluate("Metro._scheduleBeat.toString().includes('this._subdivisionLevel')&&Metro._rampScheduleBeat.toString().includes('this._subdivisionLevel')&&Metro._subdivisionLevel(false)===Metro.levels.subdivision&&Metro._subdivisionLevel(true)===Metro.levels.swing"),'主节拍器与渐速训练细分/Swing 使用同一力度规则');
    check(evaluate(`(()=>{const old=AudioEngine.playClick,hits=[];try{AudioEngine.playClick=(t,a,s,v)=>hits.push({s,v});AudioEngine.playMetronomeBeat(0,true,'elec_tick',['accent_cc0_02','accent_cc0_02','metro_20'],1);return hits.length===3&&Math.abs(hits.reduce((n,h)=>n+h.v,0)-1)<1e-9&&hits.some(h=>h.s==='metro_20');}finally{AudioEngine.playClick=old;}})()`),'重拍混音权重不超过 1，去重且保留旧设置叠层');

    evaluate('TunerAssist.init()');
    check(runtimeDocument.querySelectorAll('.tuner-range-keys button').length===88&&runtimeDocument.querySelectorAll('#tuner-algorithm option').length===3,'88 键音域与自动／原有／YIN 三种检测模式完整');
    const pitch=evaluate(`(()=>{const results=[];for(const sr of [44100,48000])for(const f of [27.5,82.4069,110,440,1046.502,4186.009]){const b=Float32Array.from({length:4096},(_,i)=>.1*Math.sin(2*Math.PI*f*i/sr)),r=TunerAssist.yin(b,sr);results.push({valid:r.valid,error:Math.abs(1200*Math.log2(r.freq/f))});}return results;})()`);
    check(pitch.every(r=>r.valid&&r.error<5),'YIN：44.1/48kHz 下 A0、E2、A2、A4、C6、C8 合成单音误差小于 5 音分',JSON.stringify(pitch));
    check(evaluate("!TunerAssist.yin(new Float32Array(4096),48000).valid"),'YIN 静音输入不产生有效音高');
    check(evaluate(`(()=>{const old={page:App.currentPage,active:TunerAssist.active,ctx:AudioEngine.ctx,analyser:AudioEngine.analyser,timeBuf:AudioEngine.timeBuf,cached:AudioEngine.cachedPitch};try{App.currentPage='tuner';TunerAssist.active='yin';AudioEngine.ctx={sampleRate:48000};AudioEngine.timeBuf=new Float32Array(4096);let f=0;AudioEngine.analyser={getFloatTimeDomainData(buffer){for(let i=0;i<buffer.length;i++)buffer[i]=.1*Math.sin(2*Math.PI*f*i/48000);}};return [27.5*430/440,4186.009*450/440].every(freq=>{f=freq;AudioEngine.cachedPitch=null;return AudioEngine.samplePitch(Tuner.minFreq,Tuner.maxFreq).valid;});}finally{App.currentPage=old.page;TunerAssist.active=old.active;AudioEngine.ctx=old.ctx;AudioEngine.analyser=old.analyser;AudioEngine.timeBuf=old.timeBuf;AudioEngine.cachedPitch=old.cached;}})()`),'检测链在 A4=430–450 时仍覆盖钢琴最低和最高音，不被边界过滤');
    check(evaluate(`(()=>{TunerAssist.signalSince=100;TunerAssist.probeWins=2;TunerAssist.observe({valid:false,rms:0},15000);return TunerAssist.signalSince===0&&TunerAssist.probeWins===0;})()`),'静音清除自动切换计时与探测次数');
    check(evaluate(`TunerAssist.describe(43,[{midi:40}],0).includes('核对')&&!TunerAssist.describe(52,[{midi:40}],-1).includes('勿继续')`),'仅锁定目标且高出至少三半音时提示核对弦与八度');
    check(evaluate(`TunerAssist.device({userAgent:'iPhone',platform:'iPhone',maxTouchPoints:5},390,true).kind==='手机'&&TunerAssist.device({userAgent:'Macintosh',platform:'MacIntel',maxTouchPoints:5},1024,true).kind==='平板'&&TunerAssist.device({userAgent:'Android Mobile'},390,true).os==='Android'`),'设备类别推断覆盖 iPhone、桌面标识 iPad 与 Android');
    check(/const startUpdateCheck=[^\n]+PWAInstall.init\(\);PWAUpdate.init\(\);/.test(releaseJs)&&releaseJs.includes('if(this.initialized)return;this.initialized=true;'),'首页立即初始化安装入口且重复初始化安全');
    check(releaseJs.includes("url.searchParams.delete('reset');history.replaceState"),'联网重置后移除一次性网络参数，避免之后离线重开被强制联网');
    check(serviceWorker.includes('ACTIVE_CACHE=CACHE_NAME+SCOPE_TAG')&&serviceWorker.includes('requests.every(request=>request.url.startsWith(self.registration.scope))')&&serviceWorker.includes("url.searchParams.has('resetProbe')"),'离线缓存按页面作用域隔离且重置探测强制联网');
    check(evaluate(`(()=>{const source=App.resetApplication.toString();return source.indexOf('await fetch(probe')<source.indexOf('registration.unregister()')&&source.includes('registration.scope===base.href')&&!source.includes('storage.clear()');})()`),'重置先验证网络、精确匹配 SW 作用域且不清空所有同源存储');
    const multi=evaluate(`(()=>{const box=document.getElementById('sight-score'),old=box.innerHTML;box.innerHTML='<svg><line data-sight-playhead="true" data-progress-start="0" data-progress-end="0.5" data-start-x="10" data-end-x="110"/><line data-sight-playhead="true" data-progress-start="0.5" data-progress-end="1" data-start-x="10" data-end-x="110"/></svg>';const lines=[...box.querySelectorAll('line')];SightSinging.setPlaybackProgress(.25,'QA');const first=lines.map(el=>[Number(el.getAttribute('x1')),el.getAttribute('opacity')]);SightSinging.setPlaybackProgress(.75,'QA');const second=lines.map(el=>[Number(el.getAttribute('x1')),el.getAttribute('opacity')]);box.innerHTML=old;return {first,second};})()`);
    check(multi.first[0][0]===60&&multi.first[0][1]==='0.92'&&multi.first[1][1]==='0'&&multi.second[0][1]==='0'&&multi.second[1][0]===60&&multi.second[1][1]==='0.92','多行鼓谱按各行局部进度移动，只有活动行显示光标');
    const timing22=evaluate("Metro.releaseTimingSnapshot('2/2',120)");
    const timing44=evaluate("Metro.releaseTimingSnapshot('4/4',120)");
    check(timing22.pulses===2&&timing22.secondsPerPulse===.5&&timing22.clicksPerMinute===120,'2/2：120 BPM 每分钟 120 个主拍');
    check(timing44.pulses===4&&timing44.secondsPerPulse===.5&&timing44.clicksPerMinute===120,'4/4：120 BPM 每分钟 120 个主拍');
    check(JSON.stringify(timing44.accents)===JSON.stringify([1,.58,.78,.58]),'4/4 强弱为强·弱·次强·弱');
    const grouping78=evaluate("Metro.signature='7/8';Metro.meterGroupings['7/8']='2+2+3';({pulses:Metro._numerator(),starts:[...Metro._groupStarts()],accents:Metro._accentPattern()})");
    check(grouping78.pulses===7&&JSON.stringify(grouping78.starts)===JSON.stringify([0,2,4]),'7/8 的 2+2+3 具有七个拍点与正确次强位置');
    evaluate("AudioEngine.prepareClickSounds=async()=>[];Metro.signature='7/8';Metro.init()");
    check(evaluate("Metro.ts")===7&&runtimeDocument.querySelectorAll('#visual-dots .v-dot').length===7,'节拍器初始化不会把 7/8 压缩成三下');
    evaluate("Metro.setSwingEnabled(true);Metro.setSwingStyle('heavy')");
    check(evaluate("Metro.swingEnabled&&Metro.swingStyle==='heavy'&&Metro.swing===.75"),'Swing 开关与三种形式可选');
    evaluate("Metro.bpm=120;Metro.adjustBpm(-1)");
    check(evaluate('Metro.bpm')===119,'BPM 加减按钮逻辑按 1 调节');
    check(evaluate("Metro.signature='7/8';Metro.ramp.current=120;60/Metro._rampBeatDuration()")===120,'渐速训练在不规则拍号下仍按当前 BPM 发主拍');
    evaluate("AudioEngine.init=async()=>false;AudioEngine.previewClick=()=>{}");
    const ramp=evaluate(`(()=>{Metro.signature='4/4';Metro.bpm=120;Metro.playing=true;Metro.openRamp();const opened={baseline:Metro.ramp.baseline,bpm:Metro.bpm,playing:Metro.playing,defaultMode:Metro.ramp.mode,noAdvancedDuration:!document.getElementById('ramp-duration')};Metro.setRampMode('range');opened.advancedDuration=document.getElementById('ramp-duration')?.textContent;Metro.closeRamp();return {...opened,closedBpm:Metro.bpm,closedPlaying:Metro.playing,modal:!!document.getElementById('metro-ramp-modal')};})()`);
    check(ramp.baseline===120&&!ramp.playing&&ramp.defaultMode==='lite'&&ramp.noAdvancedDuration&&ramp.advancedDuration==='2 分 30 秒','渐速训练进入即暂停主节拍器；精简版无时长，高级版才自动推导总时长');
    check(ramp.closedBpm===120&&!ramp.closedPlaying&&!ramp.modal,'渐速训练退出恢复原 BPM 并保持暂停');
    const liteRamp=evaluate(`(()=>{Metro.bpm=126;Metro.openRamp();const modal=document.getElementById('metro-ramp-modal'),tabs=[...modal.querySelectorAll('[data-ramp-mode]')].map(button=>button.dataset.rampMode),actions=modal.querySelectorAll('.ramp-lite-stepper button').length+modal.querySelectorAll('#ramp-start-button,#ramp-restore-button,.ramp-confirm').length,result={mode:Metro.ramp.mode,baseline:Metro.ramp.baseline,tabs,actions,startHidden:document.getElementById('ramp-start-button').hidden,running:Metro.ramp.running,hasRangeDom:!!document.getElementById('ramp-range-fields'),hasLiteRangeText:/从 BPM|到 BPM|每次变化|预计总时长/.test(document.getElementById('ramp-mode-fields').textContent),modalMode:modal.dataset.mode};Metro.setRampMode('range');result.advancedCreated=!!document.getElementById('ramp-range-fields');result.liteRemoved=!document.getElementById('ramp-lite-fields');Metro.closeRamp();return result;})()`);
    check(liteRamp.mode==='lite'&&liteRamp.baseline===126&&JSON.stringify(liteRamp.tabs)===JSON.stringify(['lite','range'])&&liteRamp.modalMode==='lite','渐速训练默认左侧精简版并继承进入 BPM');
    check(liteRamp.actions===5&&!liteRamp.startHidden&&!liteRamp.running&&!liteRamp.hasRangeDom&&!liteRamp.hasLiteRangeText&&liteRamp.advancedCreated&&liteRamp.liteRemoved,'精简版进入保持暂停且 DOM 中彻底没有高级字段；切换高级版才生成高级控件');

    const metroSounds=evaluate(`(()=>{Metro.renderSoundPanel();const panel=document.getElementById('metro-sound-panel');panel.classList.add('open');Metro.setSlot('beat','elec_tick');Metro.buildBassOptions?.();return {open:panel.classList.contains('open'),button:document.getElementById('metro-sound-editor-btn').textContent,accent:Metro.slots.accent,beat:Metro.slots.beat};})()`);
    check(metroSounds.open&&metroSounds.button==='收起音色','逐击点选完音色后编辑面板保持展开');
    check(metroSounds.accent==='accent_cc0_02'&&metroSounds.beat==='elec_tick','新安装默认重拍为 02 木块强击·圆润、普通拍为电子 Click');
    check(evaluate("Metro._allSounds().filter(id=>id.startsWith('accent_cc0_')).length")===50,'50 个 CC0 重拍音色均进入节拍器音色库');

    evaluate('Tuner.closePicker();Tuner.togglePicker()');
    check(runtimeDocument.getElementById('tuning-panel').classList.contains('open')&&runtimeDocument.getElementById('tuning-bar').getAttribute('aria-expanded')==='true','调音器调弦抽屉可单击展开');
    evaluate('Tuner.closePicker()');
    check(!runtimeDocument.getElementById('tuning-panel').classList.contains('open'),'调音器调弦抽屉可关闭');

    for(const page of ['tuner','metro','chord','instrument','ear','practice','theory','circle','settings']){
        evaluate(`App.goPage('${page}',null)`);
        check(runtimeDocument.querySelectorAll('main > .page.active').length===1&&runtimeDocument.getElementById(`page-${page}`).classList.contains('active'),`页面互斥：${page}`);
    }

    evaluate('SightSinging.init()');
    check(evaluate("!AudioEngine.init.toString().includes('getUserMedia')&&AudioEngine.ensureMicrophone.toString().includes('_openMicrophone')&&AudioEngine._openMicrophone.toString().includes('getUserMedia')"),'播放初始化与麦克风申请已分离');
    check(evaluate("Metro.start.toString().includes('await this._prepareCurrentSounds()')"),'节拍器等待默认音色后才调度第一拍');
    const metroStartFailure=await evaluate(`(async()=>{const init=AudioEngine.init,ctx=AudioEngine.ctx,scheduler=Metro._scheduler,token=Metro._finalStartToken,playing=Metro.playing;let scheduled=false;AudioEngine.ctx=null;AudioEngine.init=async()=>{throw new Error('qa-audio-init')};Metro.playing=false;Metro._starting=false;Metro._scheduler=()=>{scheduled=true};await Metro.start();const result={playing:Metro.playing,starting:Metro._starting,scheduled};AudioEngine.init=init;AudioEngine.ctx=ctx;Metro._scheduler=scheduler;Metro._finalStartToken=token;Metro.playing=playing;return result;})()`);
    check(!metroStartFailure.playing&&!metroStartFailure.starting&&!metroStartFailure.scheduled,'节拍器音频准备失败时保持停止且不进入调度');
    check(evaluate("Tuner.startLoop.toString().includes('displayHoldMs')"),'调音器包含延音保持与自适应门限');
    const micProfiles=evaluate(`(()=>{const names=Object.keys(AudioEngine.captureProfiles),iphone=AudioEngine.setCaptureProfile('iphone'),selected=document.getElementById('set-mic-profile');Settings.setMicProfile('standard',false);return {names,iphoneHold:iphone.holdMs,iphoneFloor:iphone.rmsFloor,restored:AudioEngine.captureProfile,selected:selected.value};})()`);
    check(JSON.stringify(micProfiles.names)===JSON.stringify(['standard','iphone','system'])&&micProfiles.iphoneHold>=1500&&micProfiles.iphoneFloor<.001&&micProfiles.restored==='standard'&&micProfiles.selected==='standard','设置中提供标准、iPhone 延音增强与系统语音增强三种麦克风工作模式');
    check(runtimeDocument.getElementById('sight-layout-button')!==null&&evaluate("SightSinging._layoutBarsPerSystem()")===1,'手机默认每行一小节并提供谱面布局按钮');
    const catalog=evaluate("({count:SightCurriculum.catalog.length,melody:SightCurriculum.catalog.filter(x=>x.training!=='rhythm').length,rhythm:SightCurriculum.catalog.filter(x=>x.training==='rhythm').length})");
    check(catalog.count>=350&&catalog.melody>200&&catalog.rhythm>100,'视唱离线目录达到数百条且含旋律/鼓谱');
    const modeFilter=evaluate(`(()=>{SightSinging.modeFilters=['Dorian'];const exercise=SightSinging.build(17);SightSinging.modeFilters=['Major','Natural Minor'];SightSinging.syncModeFilterUI();return {mode:exercise.mode,label:document.getElementById('sight-mode-filter-open').textContent,scale:document.getElementById('sight-scale').value};})()`);
    check(modeFilter.mode==='Dorian'&&modeFilter.label.includes('大小调混合')&&modeFilter.scale==='auto','调式多选只筛选题目且默认大小调混合');
    const sightSettings=evaluate(`(()=>{const select=(element,value)=>[...element.options].forEach(option=>{if(option.value===value)option.setAttribute('selected','');else option.removeAttribute('selected');});SightSinging.bindSettingsModal();const difficulty=document.getElementById('sight-difficulty'),original=difficulty.value;SightSinging.openSettingsModal();const opened=!!document.getElementById('sight-settings-modal'),moved=!!document.querySelector('#sight-settings-modal .sight-settings-body');select(difficulty,original==='hard'?'easy':'hard');SightSinging.updateSetup();SightSinging.closeSettingsModal(false);const restored=difficulty.value===original&&!document.getElementById('sight-settings-modal');SightSinging.openSettingsModal();select(difficulty,'medium');SightSinging.closeSettingsModal(true);return {opened,moved,restored,committed:difficulty.value==='medium',bodyReturned:!!document.querySelector('#sight-settings>.sight-settings-body')};})()`);
    check(sightSettings.opened&&sightSettings.moved&&sightSettings.restored&&sightSettings.committed&&sightSettings.bodyReturned,'视唱设置悬浮窗取消可回滚、确认后统一应用并归位',JSON.stringify(sightSettings));
    const twinkle=evaluate(`(()=>{const pool=SightCurriculum.catalog.filter(x=>x.training!=='rhythm'),index=pool.findIndex(x=>String(x.id).includes('twinkle')),exercise=SightSinging.build(index);SightSinging.exercise=exercise;SightSinging.practiceLength='full';SightCurriculum.applySegment(exercise,'full',0);SightSinging.updateCard();SightSinging.renderScore();return {bars:exercise.totalBars,phrases:exercise.fullPhrases.length,beats:exercise.durations.reduce((a,b)=>a+b,0),title:exercise.title};})()`);
    check(twinkle.bars===12&&twinkle.phrases===6&&twinkle.beats===48,'《小星星》完整主题为 12 小节、6 个乐句');
    evaluate("SightSinging.setPracticeLength('4')");
    const unified=evaluate("({bars:SightSinging.exercise.bars,sequence:SightSinging._practiceSequence(),label:document.getElementById('sight-segment-label').textContent})");
    check(unified.bars===4&&unified.sequence.beats===16&&unified.label.includes('当前 4 小节'),'统一练习长度同步谱面与检测/示范序列');
    evaluate('SightSinging.nextPhrase(1)');
    check(evaluate("SightSinging.exercise.currentPhrase===1&&document.getElementById('sight-phrase-progress').textContent.includes('第 2 句')"),'上一句/下一句与进度同步');
    check(runtimeDocument.querySelector('#sight-score svg')!==null&&runtimeDocument.querySelectorAll('#sight-score .notation-bar').length>=7,'五线谱含左封口、小节线与结束线');
    const keySignature=evaluate(`(()=>{const notation=document.getElementById('sight-notation');[...notation.options].forEach(option=>{if(option.value==='staff')option.setAttribute('selected','');else option.removeAttribute('selected');});SightSinging.exercise={title:'调号测试',composer:'QA',source:'原创测试',root:7,originalRoot:7,mode:'Major',meter:'4/4',bpm:80,baseBpm:80,tempoSource:'测试',currentPhrase:0,fullPhrases:[[[11,1],[10,1],[11,1]]],fullSeq:[[11,1],[10,1],[11,1]],seq:[[11,1],[10,1],[11,1]],midis:[66,65,66],durations:[1,1,1],bars:1,totalBars:1};const flat=SightSinging._keySignatureInfo({root:3,mode:'Major'});SightSinging.renderScore();const score=document.getElementById('sight-score'),key=score.querySelector('.sight-key-signature text'),time=score.querySelector('.sight-time-signature'),temporary=[...score.querySelectorAll('.notation-accidental.temporary')].map(node=>node.textContent).join('');return {sharps:score.querySelectorAll('.sight-key-signature text').length,keyGlyph:key?.textContent,keyX:Number(key?.getAttribute('x')),timeX:Number(time?.getAttribute('x')),temporary,flats:flat.fifths};})()`);
    check(keySignature.sharps===1&&keySignature.keyGlyph==='♯'&&keySignature.keyX<keySignature.timeX&&keySignature.flats===-3,'五线谱按调式在高音谱号右侧、拍号左侧绘制正确调号');
    check(keySignature.temporary==='♮♯','调内音不重复标记，临时变化音按小节状态显示还原与重新升号');
    const dot=evaluate(`(()=>{SightSinging.exercise={title:'附点定位测试',composer:'QA',source:'原创测试',root:0,originalRoot:0,mode:'Major',meter:'4/4',bpm:80,baseBpm:80,tempoSource:'测试',currentPhrase:0,fullPhrases:[[[0,1.5]]],fullSeq:[[0,1.5]],seq:[[0,1.5]],midis:[60],durations:[1.5],bars:1,totalBars:1};SightSinging.renderScore();const note=document.querySelector('#sight-score .notation-note'),dot=document.querySelector('#sight-score .notation-dot');return {noteY:Number(note?.getAttribute('cy')),dotY:Number(dot?.getAttribute('cy'))};})()`);
    check(Number.isFinite(dot.noteY)&&Number.isFinite(dot.dotY)&&dot.noteY!==dot.dotY,'附点落在对应音符右侧并避开谱线');
    const jianpu=evaluate(`(()=>{const notation=document.getElementById('sight-notation');[...notation.options].forEach(option=>{if(option.value==='jianpu')option.setAttribute('selected','');else option.removeAttribute('selected');});SightSinging.exercise={title:'简谱时值测试',composer:'QA',source:'原创测试',root:0,originalRoot:0,mode:'Major',meter:'4/4',bpm:80,baseBpm:80,tempoSource:'测试',currentPhrase:0,fullPhrases:[[[0,.5],[2,2],[4,1.5],[null,.25,1]]],fullSeq:[[0,.5],[2,2],[4,1.5],[null,.25,1]],seq:[[0,.5],[2,2],[4,1.5],[null,.25,1]],midis:[60,62,64,null],durations:[.5,2,1.5,.25],bars:2,totalBars:2};SightSinging.renderScore();SightSinging.scoreZoom=150;SightSinging.applyScoreZoom();const score=document.getElementById('sight-score'),target=score.querySelector('.sight-jianpu'),result={beams:score.querySelectorAll('.beams-1,.beams-2').length,extensions:score.querySelectorAll('.jianpu-extension').length,dots:score.querySelectorAll('.jianpu-dot').length,legacy:score.textContent.includes('拍'),width:target?.style.getPropertyValue('min-width')||''};[...notation.options].forEach(option=>{if(option.value==='staff')option.setAttribute('selected','');else option.removeAttribute('selected');});return result;})()`);
    check(jianpu.beams>=2&&jianpu.extensions===1&&jianpu.dots===1&&!jianpu.legacy,'简谱短音下划线、长音延音线与附点标记正确且无“X拍”文字');
    check(jianpu.width.includes('px')||jianpu.width.includes('%'),'简谱与五线谱共用谱面缩放');
    const drum=evaluate(`(()=>{const notation=document.getElementById('sight-notation');[...notation.options].forEach(option=>{if(option.value==='drum')option.setAttribute('selected','');else option.removeAttribute('selected');});SightSinging.exercise={title:'鼓谱时值测试',composer:'QA',source:'原创测试',root:0,originalRoot:0,mode:'Major',meter:'4/4',bpm:80,baseBpm:80,tempoSource:'测试',currentPhrase:0,fullPhrases:[[[0,.5,0,'hihat'],[0,.5,0,'snare'],[null,1,1],[0,.25,0,'kick'],[0,.25,0,'snare'],[0,1.5,0,'ride']]],fullSeq:[[0,.5,0,'hihat'],[0,.5,0,'snare'],[null,1,1],[0,.25,0,'kick'],[0,.25,0,'snare'],[0,1.5,0,'ride']],seq:[[0,.5,0,'hihat'],[0,.5,0,'snare'],[null,1,1],[0,.25,0,'kick'],[0,.25,0,'snare'],[0,1.5,0,'ride']],midis:[60,60,null,60,60,60],durations:[.5,.5,1,.25,.25,1.5],bars:1,totalBars:1};SightSinging.lastDetected=[];SightSinging.renderScore();SightSinging.setPlaybackProgress(.5,'QA');const score=document.getElementById('sight-score'),playhead=score.querySelector('#sight-drum-playhead'),result={staff:score.querySelectorAll('.drum-staff-line').length,bars:score.querySelectorAll('.drum-barline').length,heads:score.querySelectorAll('.drum-notehead').length,xheads:score.querySelectorAll('.drum-x-notehead').length,stems:score.querySelectorAll('.drum-stem').length,beams:score.querySelectorAll('.drum-beam,.drum-flag').length,rests:score.querySelectorAll('.drum-rest').length,dots:score.querySelectorAll('.drum-dot').length,playhead:Number(playhead?.getAttribute('x1')),start:Number(playhead?.dataset.startX),end:Number(playhead?.dataset.endX)};[...notation.options].forEach(option=>{if(option.value==='staff')option.setAttribute('selected','');else option.removeAttribute('selected');});return result;})()`);
    check(drum.staff===5&&drum.bars>=2&&drum.heads>=4&&drum.xheads>=2&&drum.stems>=4,'鼓谱含五线、谱号/拍号、小节线及分乐器音头');
    check(drum.beams>=2&&drum.rests===1&&drum.dots===1,'鼓谱按时值绘制符尾/连梁、休止符与附点');
    check(Math.abs(drum.playhead-(drum.start+drum.end)/2)<.01,'鼓谱播放光标按真实时值进度对齐');
    const sightClock=evaluate(`(()=>{AudioEngine.ctx={currentTime:10};SightSinging.exercise={meter:'4/4',baseBpm:120,bpm:120};SightMetronome.playing=true;SightMetronome.nextTime=10.2;SightMetronome.beat=2;const before=SightMetronome.nextTime,next=SightMetronome.nextMeasureTime(.1),synced=SightMetronome.syncAt(10.4);return {before,after:SightMetronome.nextTime,next,synced,startSource:SightMetronome.start.toString(),demoSource:SightSinging.playSequence.toString()};})()`);
    check(sightClock.next===11.2&&sightClock.after===sightClock.before&&sightClock.synced===11.2,'随谱节拍器对齐下一小节时不重置连续点击流');
    check(sightClock.startSource.includes('Metro.stop()')&&sightClock.demoSource.includes('nextMeasureTime'),'视唱节拍器隔离主 BPM，示范等待下一小节进入');

    evaluate('TheoryPage.init();TheoryPage.showContent(3,0)');
    check(runtimeDocument.querySelectorAll('.theory-chord-card').length===4,'三和弦页面为四张图文卡');
    check(runtimeDocument.querySelectorAll('.theory-tone-node').length===12&&runtimeDocument.querySelectorAll('.theory-chord-actions button').length===8,'根三五音及完整/分解试听均保留');

    const chord=evaluate(`(()=>{ChordExplore.tuningName='Standard';ChordExplore.customTuning=null;ChordExplore.capoMode='none';ChordExplore.capoFret=0;ChordExplore.disabledStrings=new Set([0]);ChordExplore.selectedNotes=[{string:2,fret:2,midi:52},{string:3,fret:2,midi:57},{string:4,fret:1,midi:60}];const notes=ChordExplore.activeNotes();ChordExplore.updateGuess();return {strings:notes.map(n=>n.string),implicit:notes.filter(n=>n.implicit).length,name:ChordExplore.lastGuesses[0]?.name||''};})()`);
    check(JSON.stringify(chord.strings)===JSON.stringify([1,2,3,4,5])&&chord.implicit===2,'和弦探索：未禁用空弦默认发声，禁用弦完全排除');
    check(/^Am(?:$|\/)/.test(chord.name)&&!chord.name.includes('/E'),'Am 禁用六弦后最低音重新计算为 A');

    const editMute=evaluate(`(()=>{InstrumentPage.heldFrets={0:3};InstrumentPage.mutedStrings=new Set();InstrumentPage.livePointers=new Map();InstrumentPage._stringTapState=new Map();let toggles=0;InstrumentPage.toggleStringMute=function(s){toggles++;if(this.mutedStrings.has(s))this.mutedStrings.delete(s);else{this.mutedStrings.add(s);delete this.heldFrets[s];}};const tap=id=>InstrumentPage._registerStringTap(0,'fret-3',20,20,id);const first=tap(1),disabled=tap(2);const restoreFirst=tap(3),restoreSecond=tap(4);return {first,disabled,restoreFirst,restoreSecond,muted:InstrumentPage.mutedStrings.has(0),toggles,held:InstrumentPage.heldFrets[0]};})()`);
    check(!editMute.first&&editMute.disabled&&!editMute.restoreFirst&&editMute.restoreSecond&&editMute.toggles===2&&!editMute.muted&&editMute.held===undefined,'虚拟乐器编排/演奏：双击禁弦，禁弦首击静默，第二击恢复');
    const instrumentStructure=evaluate(`(()=>{InstrumentPage.orientation='horizontal';InstrumentPage.instrument='guitar';InstrumentPage.playMode='performance';InstrumentPage.renderFretboard(document.getElementById('instrument-stage'));const wrap=document.querySelector('#instrument-stage .virtual-fret-wrap'),zone=document.getElementById('strum-zone');return {horizontal:wrap?.classList.contains('is-horizontal'),strings:zone?.querySelectorAll('.performance-string-cell[data-string]').length,axis:zone?.dataset.axis};})()`);
    check(instrumentStructure.horizontal&&instrumentStructure.strings===6&&instrumentStructure.axis==='y','横向虚拟指板与六弦演奏区使用同一方向');

    const capo=evaluate(`(()=>{Tuner.presetName='Standard';Tuner.customTuning=null;GlobalCapo.mode='full';GlobalCapo.fret=2;GlobalCapo.apply(false);return {base:noteToMidi(Tuner.targetStrings[0].baseName),actual:Tuner.targetStrings[0].midi,chordMode:ChordLib.capoMode,exploreFret:ChordExplore.capoFret};})()`);
    check(capo.actual===capo.base+2&&capo.chordMode==='full'&&capo.exploreFret===2,'调音器/和弦/探索变调夹全局同步');
    evaluate("Tuner.customTuning=['Db2','Ab2','Db3','Gb3','Bb3','Eb4'];CustomTuningEditor.open('tuner',6)");
    check(runtimeDocument.getElementById('release-tuning-note-0')?.value==='C#','自定义调弦降号自动归一且显示同音异名');
    const namedTuning=evaluate(`(()=>{localStorage.removeItem(CustomTuningLibrary.key);const first=CustomTuningLibrary.upsert('我的开放调弦',['D2','A2','D3','F#3','A3','D4']),second=CustomTuningLibrary.touch(first.id),top=SpecialTuningSearch.search('')[0];return {name:top.titleZh,user:top.userDefined,uses:second.uses,query:SpecialTuningSearch.search('开放').length};})()`);
    check(namedTuning.user&&namedTuning.name==='我的开放调弦'&&namedTuning.uses===2&&namedTuning.query>0,'命名自定义调弦可保存、模糊搜索并按使用记录回忆');
    evaluate("document.getElementById('release-custom-tuning-modal')?.remove();ChordLib.root=0;ChordLib.buildRootRow();ChordLib.buildTypeRow()");
    check(runtimeDocument.querySelectorAll('#chord-type-row button').length===10,'和弦查询首屏为九种常用性质＋更多');
    const rootRuler=evaluate(`(()=>{const ruler=document.getElementById('chord-root-ruler'),labels=[...ruler.querySelectorAll('.chord-root-ruler-tick.natural span')].map(node=>node.textContent).join('');ChordLib._previewRootRuler(1);const output=ruler.querySelector('.chord-root-ruler-value'),accidental=output.textContent,highlighted=ruler.dataset.accidental==='true'&&output.classList.contains('pop'),bubbleStep=output.style.getPropertyValue('--root-step');ChordLib._commitRootRuler(1);return {ticks:ruler.querySelectorAll('.chord-root-ruler-tick').length,labels,accidental,highlighted,bubbleStep,root:ChordLib.root,modal:!!document.getElementById('chord-root-wheel-modal')};})()`);
    check(rootRuler.ticks===13&&rootRuler.labels==='CDEFGABC'&&rootRuler.accidental==='C♯/D♭'&&rootRuler.highlighted&&String(rootRuler.bubbleStep)==='1'&&rootRuler.root===1&&!rootRuler.modal,'根音刻度尺气泡跟随十二半音坐标，并持续高亮自然音或同音异名',JSON.stringify(rootRuler));
    evaluate("ChordLib.bassMode='auto';ChordLib.buildBassOptions()");
    check(runtimeDocument.getElementById('chord-bass-label').textContent==='最低音／转位'&&runtimeDocument.querySelector('#chord-bass-shortcuts button')?.textContent.includes('自动最低音'),'和弦查询明确标识最低音／转位与自动原位');
    const bassPicker=evaluate(`(()=>{ChordLib.root=0;ChordLib.type='Maj';ChordLib.bassMode='auto';ChordLib.buildBassOptions();ChordLib.openBassPicker();const modal=document.getElementById('chord-bass-picker-modal'),common=modal.querySelectorAll('.chord-bass-choice-grid button').length,all=modal.querySelectorAll('.chord-bass-pc-grid button').length;ChordLib.setBassFromPicker('4');return {common,all,closed:!document.getElementById('chord-bass-picker-modal'),label:document.querySelector('#chord-bass-nav-button strong').textContent,mode:ChordLib.bassMode};})()`);
    check(bassPicker.common===4&&bassPicker.all===12&&bassPicker.closed&&bassPicker.mode===4&&bassPicker.label.includes('一转'),'和弦图下方最低音按钮提供常用转位与任意十二音，并同步重算状态',JSON.stringify(bassPicker));

    const special=evaluate("({count:SpecialTuningSearch.records.length,misko:SpecialTuningSearch.search('Misko').length,marcin:SpecialTuningSearch.search('Marcin').length,jong:SpecialTuningSearch.search('宗克').length,liu:SpecialTuningSearch.search('刘嘉卓').length})");
    check(special.count>=80&&special.misko&&special.marcin&&special.jong&&special.liu,'特殊调弦模糊搜索覆盖代表艺人');
}

/* 单文件是构建产物，但必须与模块版使用同一逻辑。 */
const standalonePath=path.join(root,`Music-Toolbox-Ultra-v${version.version}-Standalone.html`);
check(fs.existsSync(standalonePath),'最终单文件已生成');
if(fs.existsSync(standalonePath)){
    const standalone=fs.readFileSync(standalonePath,'utf8'),standaloneDocument=parseHTML(standalone).document;
    check(!standaloneDocument.querySelector('script[src]'),'单文件没有外部核心脚本');
    check(!standaloneDocument.querySelector('link[href="./app-final.css"]'),'单文件已内嵌最终样式');
    check(standaloneDocument.querySelectorAll('script[data-final-module]').length===4&&standaloneDocument.querySelectorAll('style[data-final-module]').length===1,'单文件内嵌最终脚本与样式模块');
    check(standalone.includes('data:audio/mpeg;base64,'),'单文件内嵌 C01 制音素材');
    check((standalone.match(/data:audio\/wav;base64,/g)||[]).length===96,'单文件内嵌全部 96 个正式音源');
    check((standalone.match(/data:image\/jpeg;base64,/g)||[]).length>=3,'单文件内嵌赞助与联系图片');
    const standaloneIds=new Map();for(const element of standaloneDocument.querySelectorAll('[id]'))standaloneIds.set(element.id,(standaloneIds.get(element.id)||0)+1);
    check(![...standaloneIds.values()].some(count=>count>1),'单文件 DOM ID 无重复');
    let inlineSyntax=true,inlineError='';
    try{for(const script of standaloneDocument.querySelectorAll('script'))new vm.Script(script.textContent);}
    catch(error){inlineSyntax=false;inlineError=error.message;}
    check(inlineSyntax,'单文件所有内嵌脚本语法',inlineError);
}

const drums=JSON.parse(read('licenses/drum-sources.json')).samples;
check(drums.length===40&&new Set(drums.map(s=>s.id)).size===40,'三套 Trap、两套电子，每套八种原创鼓音');
for(const s of drums){const b=fs.readFileSync(path.join(root,s.file));let peak=0,finite=true;for(let i=44;i<b.length;i+=2){const v=b.readInt16LE(i);peak=Math.max(peak,Math.abs(v));finite&&=Number.isFinite(v);}check(finite&&peak===32767&&s.bytes===b.length&&crypto.createHash('sha256').update(b).digest('hex')===s.sha256&&s.license==='CC0-1.0'&&appShell.includes('./'+s.file),s.id+' 标准化、许可、哈希与离线清单');}
check(drums.filter(s=>s.role==='kick'||s.role==='bass').every(s=>s.fundamentalHz>=100&&s.highPassHz===90),'新底鼓／808 主体基频 110–160 Hz，含谐波与低频清理');
check(JSON.parse(read('licenses/metronome-sources.json')).samples.find(s=>s.auditionId==='N15').processing.trimLeadingMs>45,'N15 手拍已去除约 49.6 ms 前导');
check(evaluate("document.querySelectorAll('.tuner-range-keys button.white').length===52&&document.querySelectorAll('.tuner-range-keys button.black').length===36"),'真实琴键为 52 白＋36 黑');
check(evaluate("TunerAssist.position(61)>TunerAssist.position(60)&&TunerAssist.position(61)<TunerAssist.position(62)&&TunerAssist.position(21)>0&&TunerAssist.position(108)<100"),'黑键与指针共用实际琴键中心，首尾不越界');
check(evaluate("[0,7,8].map(f=>CapoEngine.midi(45,f,0,'spider',0,[{mode:'press',fret:7}])).join(',')==='52,52,53'&&CapoEngine.midi(45,6,0,'spider',0,[{mode:'press',fret:7}])===null"),'实按蜘蛛夹：七品本身等价新空弦，八品正常升高');
check(evaluate("[0,1,3,7,8].map(f=>CapoEngine.midi(45,f,0,'spider',0,[{mode:'harmonic',fret:7}])).join(',')==='64,46,48,52,53'"),'泛音蜘蛛夹：仅松手泛音，任意按品恢复原调弦');
check(evaluate(`(()=>{ChordLib.root=0;ChordLib.type='Maj';ChordLib.bassMode='auto';ChordLib.customTuning=null;ChordLib.tuningName='standard';ChordLib.capoMode='spider';ChordLib.spider=Array.from({length:6},(_,i)=>({mode:[1,4].includes(i)?'harmonic':'off',fret:7}));ChordLib.generate();return ChordLib.voicings[0].frets.join(',')==='-1,3,2,0,1,0'&&ChordLib._renderChordSVG(ChordLib.voicings[0].frets).includes('按品恢复原调弦');})()`),'二／五弦七品泛音：C x32010 优先保留，图示空弦规则明确');
check(evaluate("ChordLib.capoMode='none';ChordLib.fingerCount([1,0,1,0,1,1])===3&&ChordLib.fingerCount([1,0,1,0,1,0])===3&&ChordLib.fingerCount([1,1,1,1,1,1])===1"),'横按不能跨过需要发声的低品／空弦');
check(evaluate("AudioEngine.setCaptureProfile('auto');AudioEngine.capturePreference==='auto'&&AudioEngine.captureProfile==='standard'"),'麦克风自动偏好与实际配置分离');
check(evaluate(`(()=>{const old=navigator.userAgent;navigator.userAgent='iPhone';AudioEngine.setCaptureProfile('auto');const a=AudioEngine.captureProfile;AudioEngine.setCaptureProfile('standard');const b=AudioEngine.capturePreference;navigator.userAgent=old;return a==='iphone'&&b==='standard';})()`),'iPhone 自动延音配置，手动选择优先');
check(evaluate(`(()=>{const w=DrumWorkshop;w.state=w.defaultState();w.state.tracks.forEach(t=>t.notes=[]);w.state.tracks[0].notes=[{t:0,d:1,n:7,v:100,manual:true}];const events=w.events();return events.length===7&&events.every((e,i)=>Math.abs(e.t-i/7)<1e-9);})()`),'七连音严格均分指定时值，不延长一拍');
check(evaluate(`(()=>{const w=DrumWorkshop,notes=JSON.stringify(w.state.tracks);w.change('grid','32');return notes===JSON.stringify(w.state.tracks);})()`),'更换网格不删改鼓点时值');
check(evaluate(`(()=>{const w=DrumWorkshop;w.state.tracks[0].locked=true;const notes=JSON.stringify(w.state.tracks[0]);w.generate(true);return notes===JSON.stringify(w.state.tracks[0]);})()`),'风格生成保留锁定轨道');
check(evaluate("DrumWorkshop.state.signature='2/2';DrumWorkshop.state.bpm=120;DrumWorkshop.quarterSeconds()*2===.5"),'编排 2/2 的 120 BPM 每分钟 120 个二分音符主拍');
check(evaluate("DrumWorkshop.validState(DrumWorkshop.defaultState())&&!DrumWorkshop.validState({...DrumWorkshop.defaultState(),bpm:Infinity})"),'保存数据有结构与范围校验');
check(evaluate(`(()=>{const w=DrumWorkshop;w.state=w.defaultState();w.state.style='shuffle';w.generate(true);const times=w.state.tracks[2].notes.map(n=>n.t);return new Set(times).size===times.length&&times.slice(0,4).every((t,i)=>Math.abs(t-[0,2/3,1,1+2/3][i])<1e-8);})()`),'Shuffle 是每拍首击＋后 1/3 拍，不重复触发');
check(evaluate(`(()=>{const w=DrumWorkshop;w.state=w.defaultState();w.state.signature='7/4';w.state.bars=8;w.generate(true);return w.validState(w.state);})()`),'长拍号八小节方案可保存恢复');
check(evaluate(`(()=>{SightSinging.scoreLayout='auto';SightSinging.scoreZoom=100;document.getElementById('sight-score').innerHTML='<svg viewBox="0 0 660 180"></svg>';SightSinging.applyScoreZoom();return document.querySelector('#sight-score svg').style.getPropertyValue('min-width')==='100%';})()`),'视唱自动单行不再强制 660px 横向溢出');
check(evaluate("SPECIAL_TUNINGS_V1.records.filter(r=>r.id.startsWith('sethares-')).length>=15&&SPECIAL_TUNINGS_V1.records.filter(r=>r.id.startsWith('sethares-')).every(r=>r.confidence==='reference'&&r.reviewedAt==='2026-09-16')"),'新增调弦注明核验日期、来源及参考八度');
check(evaluate(`(()=>{ChordLib.capoMode='spider';ChordLib.spider=Array.from({length:6},(_,i)=>({mode:[1,3].includes(i)?'harmonic':'off',fret:7}));ChordLib.ensureVoicingState();const s=ChordLib.voicingSnapshot;return s.key===ChordLib.voicingStateKey()&&s.frets.join(',')===ChordLib.voicings[ChordLib.voicingIdx].frets.join(',')&&s.notes.length>0&&s.notes.every(n=>[0,4,7].includes(n.midi%12));})()`),'蜘蛛夹改变后指法和试听快照自动同步，五／三弦 H7 不混入 D');
check(evaluate(`(()=>{TunerAssist.renderKeyOctave(0);const low=document.querySelectorAll('#range-key-octave button').length;TunerAssist.renderKeyOctave(8);const high=document.querySelector('#range-key-octave button').dataset.rangeMidi;TunerAssist.renderKeyOctave(4);return low===3&&high==='108'&&document.querySelectorAll('#range-key-octave button').length===12;})()`),'大琴键八度分组覆盖 A0–C8，无越界音高');
const trapApproved=JSON.parse(read('licenses/trap-approved-sources.json')).samples;
check(trapApproved.length===6&&trapApproved.every(s=>{const b=fs.readFileSync(path.join(root,s.file));let peak=0;for(let i=44;i<b.length;i+=2)peak=Math.max(peak,Math.abs(b.readInt16LE(i)));return peak===32767&&b.length===s.bytes&&crypto.createHash('sha256').update(b).digest('hex')===s.sha256&&appShell.includes('./'+s.file);}), 'T04–T06 六个确认样本保持原试听哈希、标准化与完整离线缓存');
check(evaluate("Object.keys(METRO_KITS)[1]==='drum_t06'&&!Object.hasOwn(METRO_KITS,'shakers')"),'T06 位于普通节拍器第二项，移除摇奏铃鼓预设');
check(evaluate(`(()=>{const s=DrumWorkshop.defaultState();return s.kit==='t06'&&s.tracks[0].notes.map(e=>e.t).join(',')==='0,4'&&s.tracks[3].notes.map(e=>e.t).join(',')==='2,6'&&s.tracks[2].notes.filter(e=>e.t%1===0).map(e=>e.t).join(',')==='1,3,5,7'&&s.tracks[2].notes.every(e=>e.v===(e.t%1===0?82:70))&&[1,4,5,6,7].every(row=>!s.tracks[row].notes.length);})()`),'T06 默认只有首拍底鼓、第三拍 Clap、二四拍与略弱八分细分闭镲');
const capoNotice=evaluate(`(()=>{Tuner.presetName='Standard';Tuner.customTuning=null;GlobalCapo.mode='spider';GlobalCapo.spider=Array.from({length:6},(_,i)=>({mode:[1,3].includes(i)?'harmonic':'off',fret:7}));GlobalCapo.apply(false);const el=document.getElementById('tuner-range-capo'),text=el.textContent,shown=!el.hidden;GlobalCapo.setMode('none');return {shown,text,hidden:document.getElementById('tuner-range-capo').hidden};})()`);
check(capoNotice.shown&&capoNotice.text.includes('蜘蛛变调夹生效中')&&capoNotice.text.includes('5／1弦同为 E4')&&capoNotice.hidden,'蜘蛛夹同音 E4 明示弦号，关闭变调夹后高亮提示消失',JSON.stringify(capoNotice));
const result={version:version.version,passed:passes.length,failed:failures.length,passes,failures};
fs.writeFileSync(path.join(root,'release-validation.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
if(failures.length)process.exit(1);
