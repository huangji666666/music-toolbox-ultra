import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {parseHTML} from 'linkedom';

// Run the actual release chain; only browser capabilities are substituted.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=read('index.html'),passes=[],failures=[];
const check=(condition,label,detail='')=>(condition?passes:failures).push(label+(detail?'：'+detail:''));
const store=()=>{const values=new Map();return {get length(){return values.size;},key:index=>[...values.keys()][index]??null,getItem:key=>values.get(String(key))??null,setItem:(key,value)=>values.set(String(key),String(value)),removeItem:key=>values.delete(String(key)),clear:()=>values.clear()};};

function load({storage=store(),nav={},standalone=false}={}){
    const {document,window:dom}=parseHTML(html),listeners=new Map(),timers=[];
    const sandbox={
        document,console,localStorage:storage,sessionStorage:store(),performance:globalThis.performance,
        URL,Blob,TextEncoder,TextDecoder,Uint8Array,Float32Array,ArrayBuffer,DataView,Map,Set,WeakMap,WeakSet,
        Promise,Math,JSON,Date,RegExp,Error,TypeError,DOMException:globalThis.DOMException,
        structuredClone:globalThis.structuredClone,crypto:globalThis.crypto,navigator:{onLine:false,...nav},
        location:{protocol:'https:',href:'https://example.test/toolbox/',reload(){}},
        innerWidth:390,innerHeight:844,devicePixelRatio:2,
        matchMedia:query=>({matches:standalone&&query==='(display-mode: standalone)',addEventListener(){},removeEventListener(){}}),
        addEventListener(name,handler){const list=listeners.get(name)||[];list.push(handler);listeners.set(name,list);},removeEventListener(){},
        requestAnimationFrame(){return 1;},cancelAnimationFrame(){},
        setTimeout(fn,delay){timers.push({fn,delay});return timers.length;},clearTimeout(){},
        setInterval(){return 1;},clearInterval(){},queueMicrotask(){},alert(){},
        getComputedStyle(){return {getPropertyValue(){return '';}}},
        Image:dom.Image,HTMLElement:dom.HTMLElement,Element:dom.Element,Node:dom.Node,
        SVGElement:dom.SVGElement,Event:dom.Event,CustomEvent:dom.CustomEvent,MutationObserver:dom.MutationObserver,
    };
    sandbox.window=sandbox;sandbox.self=sandbox;sandbox.globalThis=sandbox;
    sandbox.visualViewport={width:390,height:844,addEventListener(){}};
    const context=vm.createContext(sandbox),run=code=>vm.runInContext(code,context,{filename:'qa-shell-expression.js',timeout:20000});
    for(const script of document.querySelectorAll('script')){
        const src=script.getAttribute('src');
        vm.runInContext(src?read(src.replace(/^\.\//,'')):script.textContent,context,{filename:src||'index-inline.js',timeout:20000});
    }
    return {document,sandbox,storage,run,timers,emit:(name,event={})=>(listeners.get(name)||[]).forEach(handler=>handler(event))};
}

try{
    const runtime=load(),{document,run,sandbox,emit}=runtime;
    check(true,'最终发布脚本链实际加载');
    check(document.querySelectorAll('#start-mask .start-btn').length===1,'首页只有一个进入应用入口');
    check(document.querySelectorAll('#start-mask #start-install-btn').length===1&&!document.getElementById('start-install-btn').hidden,'首页立即初始化独立安装入口');
    check(document.querySelectorAll('#shell-appearance [data-skin-choice]').length===5&&document.querySelectorAll('#quick-theme [data-skin-choice]').length===5,'设置与顶栏均有五种配色');
    run('AppShell.init();AppShell.init()');
    check(document.querySelectorAll('#shell-appearance').length===1&&document.querySelectorAll('#tuner-instruments').length===1,'外壳重复初始化不重复创建控件');
    for(const item of document.querySelectorAll('nav .nav-item')){
        // linkedom does not compile HTML inline handlers; execute their real source on click.
        item.onclick=()=>{sandbox.__navElement=item;run(`(function(){${item.getAttribute('onclick')}}).call(window.__navElement)`);};
        let prevented=0;const active=[];
        for(const key of ['Enter',' ']){item.onkeydown({key,preventDefault(){prevented++;}});active.push(document.querySelector('main > .page.active')?.id);}
        const valid=item.getAttribute('role')==='button'&&item.getAttribute('tabindex')==='0'&&prevented===2&&active.every(id=>id==='page-'+item.dataset.page)&&document.querySelectorAll('main > .page.active').length===1;
        check(valid,'键盘Enter与空格切页：'+item.dataset.page,valid?'':JSON.stringify({role:item.getAttribute('role'),tabindex:item.getAttribute('tabindex'),prevented,active}));
    }
    check(['#theme-toggle-btn','#play-btn','.ear-play-btn'].every(selector=>document.querySelector(selector)?.getAttribute('aria-label')),'主题、节拍器与练耳图标按钮具备可读名称');

    const platforms=[
        ['iPhone Safari',{userAgent:'Mozilla/5.0 (iPhone) Version/18.0 Mobile Safari/604.1'},'ios','Safari'],
        ['iPhone Chrome',{userAgent:'Mozilla/5.0 (iPhone) CriOS/140.0 Mobile Safari/604.1'},'ios-browser','Safari'],
        ['iPad 桌面标识',{userAgent:'Mozilla/5.0 (Macintosh) Version/18.0 Safari/605.1',platform:'MacIntel',maxTouchPoints:5},'ios','iPad'],
        ['Android',{userAgent:'Mozilla/5.0 (Linux; Android 15) Chrome/140.0 Mobile Safari/537.36'},'android','Android'],
        ['Mac Safari',{userAgent:'Mozilla/5.0 (Macintosh) Version/18.0 Safari/605.1'},'mac-safari','程序坞'],
        ['Firefox',{userAgent:'Mozilla/5.0 (Windows NT 10.0) Firefox/140.0'},'firefox','Firefox'],
        ['Windows Edge',{userAgent:'Mozilla/5.0 (Windows NT 10.0) Chrome/140.0 Safari/537.36 Edg/140.0'},'desktop','Chrome'],
        ['Mac Chrome',{userAgent:'Mozilla/5.0 (Macintosh) Chrome/140.0 Safari/537.36'},'desktop','Chrome'],
    ];
    for(const [label,nav,expected,hint] of platforms){
        Object.assign(sandbox.navigator,{userAgent:'',platform:'',maxTouchPoints:0},nav);
        const platform=run('PWAInstall.platform()');await run('PWAInstall.open()');
        check(platform===expected&&document.getElementById('start-install-hint').textContent.includes(hint),'安装平台与操作指引：'+label);
    }
    let prompts=0,prevented=0;
    emit('beforeinstallprompt',{preventDefault(){prevented++;},async prompt(){prompts++;},userChoice:Promise.resolve({outcome:'accepted'})});
    await run('PWAInstall.open()');
    check(prompts===1&&prevented===1&&document.getElementById('start-install-btn').hidden&&run('PWAInstall.deferred===null'),'浏览器原生安装优先并消费一次安装事件');
    sandbox.location.protocol='file:';await run('PWAInstall.open()');
    check(/本地单文件.*不能/.test(document.getElementById('start-install-hint').textContent),'单文件安装明确引导到 HTTPS');
    const installed=load({standalone:true});
    check(installed.document.getElementById('start-install-btn').hidden,'独立安装模式隐藏重复安装入口');

    document.querySelector('[data-skin-choice="violet"]').onclick();
    document.getElementById('shell-motion').onchange({target:{value:'reduced'}});
    document.getElementById('tuner-layout').onchange({target:{value:'side'}});
    run("App.setTheme('dark')");
    const restored=load({storage:runtime.storage});
    check(restored.document.body.dataset.skin==='violet'&&restored.run("AppShell.skin==='violet'")&&restored.document.querySelector('[data-skin-choice="violet"]').getAttribute('aria-pressed')==='true','点击选择的皮肤跨重载持久化');
    check(restored.document.documentElement.dataset.motion==='reduced'&&restored.document.getElementById('tuner-instruments').dataset.arrangement==='side','减少动效及琴头排布跨重载持久化');
    restored.run("AppShell.setSkin('unknown')");
    check(restored.document.body.dataset.skin==='glass','非法皮肤值安全回退');
    check(document.body.dataset.theme==='dark'&&document.body.dataset.skin==='violet','深浅主题与皮肤同时保留');

    sandbox.location.protocol='https:';
    run('Tuner.drawGauge()');
    const gauge=document.getElementById('tuner-gauge-svg');
    // Existing SVG innerHTML uses linkedom's HTML empty-tag parser; inspect all paths, excluding the needle.
    const staticPaths=[...gauge.querySelectorAll('path')].filter(p=>!gauge.querySelector('#gauge-needle').contains(p));
    check(gauge.getAttribute('viewBox')==='0 0 260 150'&&staticPaths.length===23,'半圆表盘具有完整弧线与21个刻度');
    const ticks=[...staticPaths].slice(2).map(p=>p.getAttribute('d').match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi).map(Number));
    check(ticks.length===21&&ticks.every(([x1,y1,x2,y2])=>x1>=0&&x1<=260&&x2>=0&&x2<=260&&y1>=0&&y1<=130.00001&&y2>=0&&y2<=130.00001),'半圆刻度全部位于上半圆');
    const labels=[...gauge.querySelectorAll('text')].map(t=>({text:t.textContent,x:Number(t.getAttribute('x')),y:Number(t.getAttribute('y'))}));
    check(labels.map(v=>v.text).join(',')==='-50,-25,0,+25,+50'&&labels.every((v,i)=>v.y>=0&&v.y<=150&&(!i||v.x>labels[i-1].x)),'半圆音分标签从左低到右高且未越界');
    const firstTick=gauge.firstElementChild;
    for(const [angle,expected] of [[-130,-90],[0,0],[130,90]]){
        run(`Tuner.needleAngle=${angle};Tuner.drawGauge()`);
        check(gauge.querySelector('#gauge-needle').getAttribute('transform')===`rotate(${expected} 130 130)`,'半圆指针角度：'+angle);
    }
    check(gauge.firstElementChild===firstTick,'指针更新复用静态表盘');

    run("Tuner.presetName='Standard';Tuner.customTuning=null;Tuner.lockedString=-1;Tuner.confirmedStringIdx=-1;GlobalCapo.mode='none';Tuner.renderStrings();window.__stringHits=[];AudioEngine.playInstrumentOnce=(...args)=>window.__stringHits.push(args)");
    check(document.querySelectorAll('#tuner-headstock #strings-container .s-btn').length===6&&document.querySelectorAll('[data-head-string]').length===6,'琴头复用全部六弦真实按钮');
    const railDots=[...document.querySelectorAll('#tuner-range-targets i')];run('Tuner.renderStrings();TunerAssist.renderReading()');check(railDots.length===6&&railDots.every((n,i)=>n===document.querySelectorAll('#tuner-range-targets i')[i]),'刷新弦和音高时六个编号原位复用');
    for(let i=0;i<6;i++){
        document.querySelectorAll('#strings-container .s-btn')[i].onclick();
        const button=document.querySelectorAll('#strings-container .s-btn')[i],peg=document.querySelector(`[data-head-string="${i}"]`),hit=sandbox.__stringHits.at(-1);
        check(run('Tuner.lockedString')===i&&peg.classList.contains('selected')&&button.classList.contains('locked')&&hit?.[0]===run(`Tuner.targetStrings[${i}].midi`)&&hit?.[4]===`string-${i}`,'琴头第'+(6-i)+'弦锁定与试听逐一绑定');
        button.onclick();
    }
    check(run('Tuner.lockedString')===-1&&sandbox.__stringHits.length===6&&!document.querySelector('[data-head-string].selected'),'再次点击六弦恢复自动且不重复试听');
    run('Tuner.confirmedStringIdx=2;Tuner.renderStrings()');
    check(document.querySelector('[data-head-string="2"]').classList.contains('selected'),'自动识别高亮同步琴头');

    const score=(midis,durations,meter='4/4',grouping='')=>{
        run(`SightSinging.exercise=${JSON.stringify({root:0,mode:'Major',midis,durations,meter,grouping})};SightSinging.lastDetected=[];SightSinging._renderStaffScore()`);
        return document.querySelector('#sight-score svg');
    };
    let svg=score([64,65,67,69],[.5,.5,.5,.5]);
    check(svg.querySelectorAll('.notation-beam.level-1').length===2&&svg.querySelectorAll('.notation-flag').length===0,'4/4八分音符按主拍连梁');
    const stems=[...svg.querySelectorAll('.notation-stem')].map(p=>p.getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number));
    const beams=[...svg.querySelectorAll('.notation-beam')].map(p=>p.getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number));
    check(beams.every((b,i)=>Math.abs(b[0]-stems[i*2][2])<.001&&Math.abs(b[1]-stems[i*2][3])<.001&&Math.abs(b[2]-stems[i*2+1][2])<.001&&Math.abs(b[3]-stems[i*2+1][3])<.001),'连梁端点与真实符干对齐');
    svg=score([64,65,67,69,71,72],[.5,.5,.5,.5,.5,.5],'6/8');
    const x=[...svg.querySelectorAll('.notation-note')].map(n=>Number(n.getAttribute('cx'))),edges=[...svg.querySelectorAll('.notation-beam')].map(p=>p.getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number));
    check(edges.length===4&&svg.querySelectorAll('.notation-flag').length===0&&edges.every(b=>!(b[0]<((x[2]+x[3])/2)&&b[2]>((x[2]+x[3])/2))),'6/8按3+3分组且中间不跨组连梁');
    svg=score([64,65,67,69,71,72,74],Array(7).fill(.5),'7/8','2+2+3');
    check(svg.querySelectorAll('.notation-beam.level-1').length===4&&svg.querySelectorAll('.notation-flag').length===0,'7/8显式2+2+3分组');
    svg=score([64,65,67,69],[.25,.25,.25,.25]);
    check(svg.querySelectorAll('.notation-beam.level-1').length===3&&svg.querySelectorAll('.notation-beam.level-2').length===3,'十六分音符具有两层连梁');
    svg=score(Array(32).fill(64),Array(32).fill(.125));
    const denseNotes=[...svg.querySelectorAll('.notation-note')].map(n=>Number(n.getAttribute('cx')));
    const closest=Math.min(...denseNotes.slice(1).map((x,i)=>x-denseNotes[i]));
    check(denseNotes.length===32&&closest>=18,'密集三十二分音符音头保持间距而不重叠',closest>=18?'':'最小中心间距 '+closest.toFixed(2)+'px，音头宽16px');
    svg=score([64,64,64,64,64],[.125,.125,.125,.125,4]);
    const mixedNotes=[...svg.querySelectorAll('.notation-note')].slice(0,4).map(n=>Number(n.getAttribute('cx')));
    const mixedClosest=Math.min(...mixedNotes.slice(1).map((x,i)=>x-mixedNotes[i]));
    check(mixedNotes.length===4&&mixedClosest>=18,'短音与长音混合时短音头仍保持间距',mixedClosest>=18?'':'最小中心间距 '+mixedClosest.toFixed(2)+'px');
    svg=score([64,65,67],[.5,.25,.25]);
    check(svg.querySelectorAll('.notation-beam.level-1').length===2&&svg.querySelectorAll('.notation-beam.level-2').length===1,'八分与十六分混合节奏的二级梁正确');
    svg=score([64,null,65,67],[.25,.25,.25,.25]);
    check(svg.querySelectorAll('.sight-rest').length===1&&svg.querySelectorAll('.notation-beam.level-1').length===1&&svg.querySelectorAll('.notation-flag').length===2,'休止符断开连梁且保留独立符尾');
    for(const [duration,flags] of [[.125,3],[.0625,4]]){
        svg=score([64],[duration]);
        check(svg.querySelectorAll('.notation-flag').length===flags&&svg.querySelectorAll('.notation-beam').length===0,`${flags}重符尾的独立短音时值`);
    }
    svg=score([64,67,72],[3,6,3.5],'16/4');
    const events=[...svg.querySelectorAll('.notation-event')];
    check(events.every(e=>e.querySelector('.notation-note.open'))&&events[0].querySelectorAll('.notation-stem').length===1&&events[1].querySelectorAll('.notation-stem').length===0&&events.map(e=>e.querySelectorAll('.notation-dot').length).join(',')==='1,1,2','附点二分、附点全音与双附点二分保持空心音头');
    check(events.every(e=>[...e.querySelectorAll('.notation-dot')].every(dot=>Number(dot.getAttribute('cx'))>Number(e.querySelector('.notation-note').getAttribute('cx'))&&![72,86,100,114,128].includes(Number(dot.getAttribute('cy'))))),'附点位于音头右侧并避开五线');
    svg=score([64,65,67],Array(3).fill(1/3));
    check(svg.querySelectorAll('.notation-tuplet').length===1&&svg.querySelector('.notation-tuplet').textContent==='3'&&svg.querySelectorAll('.notation-beam').length===2,'八分三连音共用连梁且只标一个3');
    svg=score([64,65,67,69,71,72,74,76],Array(8).fill(.5),'2/4');
    check(svg.querySelectorAll('.notation-beam').length===4,'连梁不跨越小节边界');
    for(const [duration,kind,hooks,dots,tuplet] of [[4,'whole',0,0,0],[2,'half',0,0,0],[1,'quarter',0,0,0],[.5,'eighth',1,0,0],[.25,'sixteenth',2,0,0],[.125,'thirtysecond',3,0,0],[.0625,'sixtyfourth',4,0,0],[.75,'eighth',1,1,0],[3.5,'half',0,2,0],[1/3,'eighth',1,0,1],[2/3,'quarter',0,0,1]]){
        svg=score([null],[duration]);const rest=svg.querySelector('.sight-rest');
        check(rest?.classList.contains('sight-rest-'+kind)&&rest.querySelectorAll('.rest-hook').length===hooks&&rest.querySelectorAll('.notation-dot').length===dots&&rest.querySelectorAll('.notation-tuplet').length===tuplet,'休止符标准时值、附点与三连音：'+duration);
    }
    run("SightSinging.exercise={root:0,mode:'Major',training:'melody',meter:'4/4',midis:[64],durations:[6],seq:[[4,6]],bars:2};SightSinging.scoreLayout='one';window.__unsplit=JSON.stringify(SightSinging.exercise);window.__chunks=SightSinging._splitForSystems(SightSinging.exercise,1)");
    const chunks=sandbox.__chunks;
    check(chunks.length===2&&chunks[0].durations[0]===4&&chunks[1].durations[0]===2&&chunks[0].ties[0].to&&!chunks[0].ties[0].from&&chunks[1].ties[0].from&&!chunks[1].ties[0].to,'跨行六拍长音按小节拆分并双向标记延音线');
    run('SightSinging.renderScore()');
    const systems=[...document.querySelectorAll('#sight-score .sight-system')];
    check(systems.length===2&&systems[0].querySelector('.notation-tie[data-tie="to"]')&&systems[1].querySelector('.notation-tie[data-tie="from"]'),'跨行长音在两行谱面实际绘制延音线');
    check(run('JSON.stringify(SightSinging.exercise)===window.__unsplit'),'谱面拆分不改动播放及检测的原始六拍事件');
    run("SightSinging.exercise={root:0,mode:'Major',training:'melody',meter:'4/4',midis:[null],durations:[6],seq:[[null,6]],bars:2};SightSinging.renderScore()");
    check(document.querySelectorAll('#sight-score .sight-system').length===2&&!document.querySelector('#sight-score .notation-tie'),'跨行休止拆分不生成延音线');
    svg=score([21,108,24,105],[.125,.125,.125,.125]);
    const [left,top,width,height]=svg.getAttribute('viewBox').split(/\s+/).map(Number);
    const shapeInside=[...svg.querySelectorAll('.notation-note,.notation-dot,.notation-stem,.notation-flag,.notation-beam,.notation-ledger')].every(shape=>{
        if(['ellipse','circle'].includes(shape.tagName.toLowerCase())){
            const cx=Number(shape.getAttribute('cx')),cy=Number(shape.getAttribute('cy')),rx=Number(shape.getAttribute('rx')||shape.getAttribute('r')),ry=Number(shape.getAttribute('ry')||shape.getAttribute('r'));
            return cx-rx>=left&&cx+rx<=left+width&&cy-ry>=top&&cy+ry<=top+height;
        }
        const points=shape.getAttribute('d').match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi).map(Number);
        return points.every((n,i)=>Number.isFinite(n)&&n>=(i%2?top:left)&&n<=(i%2?top+height:left+width));
    });
    check(svg.querySelectorAll('.notation-ledger').length>0&&shapeInside,'A0至C8极端音符、符干、符尾、连梁与加线均在谱窗范围');

    // Hold the actual entrance at its audio await to reproduce a rapid double tap.
    run('window.__entrance={audio:0,intro:0,init:0};AudioEngine.ctx=null;AudioEngine.init=()=>{window.__entrance.audio++;return new Promise(resolve=>window.__audioReady=resolve)};AudioEngine.playIntro=()=>window.__entrance.intro++;App.init=()=>window.__entrance.init++');
    const before=runtime.timers.length,first=run('App.startApp()');await run('App.startApp()');
    check(sandbox.__entrance.audio===1&&document.querySelector('.start-btn').disabled,'进入应用等待音频时快速双击只启动一次');
    sandbox.__audioReady();await first;
    const startupTimers=runtime.timers.slice(before).filter(t=>t.delay===1000);startupTimers.forEach(t=>t.fn());
    check(sandbox.__entrance.intro===1&&sandbox.__entrance.init===1&&startupTimers.length===1&&document.getElementById('start-mask').classList.contains('fade-out'),'一次入口完成只播放一次提示并初始化一次页面');
    run('App._shellStarting=false;AudioEngine.ctx=null;AudioEngine.init=async()=>{throw new Error("qa-shell-audio-failure")}');
    let rejected=false;try{await run('App.startApp()');}catch(error){rejected=error.message==='qa-shell-audio-failure';}
    check(rejected&&!document.querySelector('.start-btn').disabled&&run('App._shellStarting===false'),'音频初始化失败恢复进入按钮可重试');

    const reset=load(),resetWindow=reset.sandbox,rootScope='https://example.test/',childScope=rootScope+'preview/';
    const rootCache='music-toolbox-ultra-test::%2F',rootStaging=rootCache+'-staging',childCache='music-toolbox-ultra-test::%2Fpreview%2F',childStaging=childCache+'-staging';
    const cacheEntries=new Map([
        [rootCache,[rootScope+'index.html',rootScope+'version.json']],
        [rootStaging,[rootScope+'index.html']],
        [childCache,[childScope+'index.html',childScope+'version.json']],
        [childStaging,[childScope+'index.html']],
        ['music-toolbox-ultra-legacy-root',[rootScope+'index.html',rootScope+'app-final.js']],
        ['music-toolbox-ultra-legacy-child',[childScope+'index.html',childScope+'app-final.js']],
        ['unrelated-cache',[rootScope+'index.html']],
    ]),deleted=[],removedRequests=[],unregistered=[],probes=[],replacements=[];
    resetWindow.confirm=()=>true;resetWindow.AbortController=globalThis.AbortController;
    resetWindow.location.href=rootScope;resetWindow.location.replace=url=>replacements.push(url);resetWindow.navigator.onLine=true;
    resetWindow.fetch=async(url,options)=>{probes.push({url:String(url),cache:options.cache});return {ok:true,json:async()=>({version:'13.5.21'})};};
    resetWindow.navigator.serviceWorker={getRegistrations:async()=>[rootScope,childScope].map(scope=>({scope,unregister:async()=>{unregistered.push(scope);return true;}}))};
    resetWindow.caches={
        keys:async()=>[...cacheEntries.keys()],
        open:async key=>({keys:async()=>cacheEntries.get(key).map(url=>({url})),delete:async request=>{removedRequests.push(request.url);cacheEntries.set(key,cacheEntries.get(key).filter(url=>url!==request.url));return true;}}),
        delete:async key=>{deleted.push(key);return cacheEntries.delete(key);},
    };
    reset.storage.setItem('music_toolbox_reset_fixture','remove');reset.storage.setItem('unrelated_preference','retain');
    resetWindow.sessionStorage.setItem('protuner_reset_fixture','remove');resetWindow.sessionStorage.setItem('unrelated_session','retain');
    await reset.run('App.resetApplication()');
    check(deleted.length===3&&[rootCache,rootStaging,'music-toolbox-ultra-legacy-root'].every(key=>deleted.includes(key))&&[childCache,childStaging,'music-toolbox-ultra-legacy-child','unrelated-cache'].every(key=>cacheEntries.has(key))&&removedRequests.length===0&&unregistered.length===1&&unregistered[0]===rootScope&&probes.length===1&&probes[0].cache==='no-store'&&new URL(probes[0].url).pathname==='/version.json'&&new URL(probes[0].url).searchParams.has('resetProbe')&&replacements.length===1&&new URL(replacements[0]).searchParams.has('reset')&&reset.storage.getItem('music_toolbox_reset_fixture')===null&&reset.storage.getItem('unrelated_preference')==='retain'&&resetWindow.sessionStorage.getItem('protuner_reset_fixture')===null&&resetWindow.sessionStorage.getItem('unrelated_session')==='retain','根路径重置只删除自身tagged/staging/legacy缓存及SW，保留子路径副本与非应用数据');
    reset.run('App._resetting=false');resetWindow.confirm=()=>false;
    reset.storage.setItem('music_toolbox_cancel_fixture','retain');resetWindow.sessionStorage.setItem('protuner_cancel_fixture','retain');
    const counts=[deleted.length,removedRequests.length,unregistered.length,probes.length,replacements.length];
    await reset.run('App.resetApplication()');
    check(JSON.stringify(counts)===JSON.stringify([deleted.length,removedRequests.length,unregistered.length,probes.length,replacements.length])&&reset.storage.getItem('music_toolbox_cancel_fixture')==='retain'&&resetWindow.sessionStorage.getItem('protuner_cancel_fixture')==='retain','取消重置确认不探测网络、不删除缓存或设置、不注销SW、不刷新页面');
}catch(error){check(false,'界面外壳检查运行异常',error.stack||error.message);}

const result={version:JSON.parse(read('version.json')).version,passed:passes.length,failed:failures.length,passes,failures};
if(process.argv.includes('--report'))fs.writeFileSync(path.resolve(root,'../../development/13.5.15-shell-qa.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
process.exitCode=failures.length?1:0;
