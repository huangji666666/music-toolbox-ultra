/* 音乐工具箱 Ultra v13.5.8 最终功能包 */
/* 音乐工具箱 Ultra v13 增量：PWA、视唱、连续音高轨迹、实时演奏与即时试听 */
(() => {
'use strict';

const V13_VERSION='13.5.13';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

/* C01：真实自然制音扫弦。六根弦共用母素材，功率补偿后以低响度触发。 */
AudioEngine.mutedC01URL='./assets/muted-strum-c01-cc0.mp3';
AudioEngine.mutedC01Buffer=null;
AudioEngine.mutedRecentHits=[];
AudioEngine.playMutedFallback=function(stringIndex=0,time=null,intensity=.7){
    if(!this.ctx||!this.masterGainNode)return false;const when=Math.max(time??this.ctx.currentTime,this.ctx.currentTime),length=Math.floor(this.ctx.sampleRate*.22),buffer=this.ctx.createBuffer(1,length,this.ctx.sampleRate),data=buffer.getChannelData(0);let low=0;
    for(let i=0;i<length;i++){const t=i/length,white=Math.random()*2-1;low+=.055*(white-low);data[i]=(low*.84+white*.16)*Math.pow(1-t,3.2);}
    const source=this.ctx.createBufferSource(),lowpass=this.ctx.createBiquadFilter(),gain=this.ctx.createGain(),level=.041*Math.max(.45,Math.min(.9,intensity));source.buffer=buffer;lowpass.type='lowpass';lowpass.frequency.value=820+Math.max(0,5-stringIndex)*35;lowpass.Q.value=.5;gain.gain.setValueAtTime(.0001,when);gain.gain.linearRampToValueAtTime(level,when+.006);gain.gain.exponentialRampToValueAtTime(.0001,when+.23);source.connect(lowpass);lowpass.connect(gain);gain.connect(this.masterGainNode);source.start(when);source.stop(when+.25);return true;
};
AudioEngine.prepareMutedC01=async function(){
    if(this.mutedC01Buffer)return this.mutedC01Buffer;
    if(!this.ctx)await this.init();
    if(this._mutedC01Promise)return this._mutedC01Promise;
    this._mutedC01Promise=fetch(this.mutedC01URL).then(r=>{if(!r.ok)throw new Error('C01 '+r.status);return r.arrayBuffer();}).then(bytes=>this.ctx.decodeAudioData(bytes.slice(0))).then(buffer=>this.mutedC01Buffer=buffer).catch(error=>{console.warn('C01 制音采样载入失败',error);return null;}).finally(()=>this._mutedC01Promise=null);
    return this._mutedC01Promise;
};
AudioEngine.playMutedString=function(stringIndex=0,time=null,intensity=.7){
    if(!this.ctx||!this.masterGainNode)return false;
    if(!this.mutedC01Buffer){this.prepareMutedC01();return this.playMutedFallback(stringIndex,time,intensity);}
    const when=Math.max(time??this.ctx.currentTime,this.ctx.currentTime),now=performance.now();
    this.mutedRecentHits=this.mutedRecentHits.filter(t=>now-t<145);this.mutedRecentHits.push(now);
    const overlap=Math.max(1,this.mutedRecentHits.length),powerComp=1/Math.sqrt(overlap);
    // 单弦峰值刻意压低。扫过六弦时总能量仍保持自然，不会像六份同音叠加那样炸响。
    const base=.064*Math.max(.42,Math.min(.9,intensity))*powerComp;
    const src=this.ctx.createBufferSource(),hp=this.ctx.createBiquadFilter(),lp=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();
    src.buffer=this.mutedC01Buffer;src.playbackRate.value=.985+Math.random()*.025;
    hp.type='highpass';hp.frequency.value=52+Math.max(0,5-stringIndex)*7;
    lp.type='lowpass';lp.frequency.value=1680+Math.max(0,5-stringIndex)*55;lp.Q.value=.38;
    gain.gain.setValueAtTime(.0001,when);gain.gain.linearRampToValueAtTime(base,when+.006);gain.gain.setValueAtTime(base*.86,when+.09);gain.gain.exponentialRampToValueAtTime(.0001,when+.36);
    src.connect(hp);hp.connect(lp);lp.connect(gain);gain.connect(this.masterGainNode);src.start(when);src.stop(when+.41);return true;
};
AudioEngine.playMutedStrum=function(time=null,intensity=.7,stringIndex=0){return this.playMutedString(stringIndex,time,intensity);};

/* 旧版科幻进入音效：四个指定正弦波与 800 Hz 低通噪声，首次生成后复用单个 Buffer。 */
AudioEngine.playIntro=function(){
    if(!this.ctx||!this.masterGainNode)return false;const now=this.ctx.currentTime,rate=this.ctx.sampleRate,seconds=3.2;
    if(!this.legacySciFiIntroBuffer){const length=Math.floor(rate*seconds),buffer=this.ctx.createBuffer(2,length,rate),frequencies=[220,330,440,660],volumes=[.25,.20,.15,.10],alpha=1-Math.exp(-2*Math.PI*800/rate);for(let channel=0;channel<2;channel++){const data=buffer.getChannelData(channel);let filteredNoise=0;for(let i=0;i<length;i++){const t=i/rate,rise=t<=.6?t/.6:1,fall=t<=.6?1:Math.pow(.00025,(t-.6)/2.6),envelope=.0001+(.4-.0001)*rise*fall,noiseDecay=Math.pow(Math.max(0,1-t/seconds),4),white=Math.random()*2-1;filteredNoise+=alpha*(white-filteredNoise);let tone=0;for(let n=0;n<frequencies.length;n++)tone+=Math.sin(2*Math.PI*frequencies[n]*t+(channel?.055*n:0))*volumes[n];const sample=(tone+filteredNoise*.075*noiseDecay)*envelope;data[i]=Math.max(-.92,Math.min(.92,sample));}}this.legacySciFiIntroBuffer=buffer;}
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain(),compressor=this.ctx.createDynamicsCompressor();source.buffer=this.legacySciFiIntroBuffer;gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(.92,now+.025);gain.gain.setValueAtTime(.92,now+3.12);gain.gain.exponentialRampToValueAtTime(.0001,now+3.2);compressor.threshold.value=-8;compressor.knee.value=10;compressor.ratio.value=5;compressor.attack.value=.004;compressor.release.value=.18;source.connect(gain);gain.connect(compressor);compressor.connect(this.masterGainNode);source.start(now);source.stop(now+3.22);return true;
};

/* 节拍器：选择音色与开启鼓格时立即试听。 */
const metroSetSlot=Metro.setSlot.bind(Metro);
Metro.setSlot=function(slot,value){metroSetSlot(slot,value);AudioEngine.previewClick(value);};
const metroSetTrack=Metro.setTrackSound.bind(Metro);
Metro.setTrackSound=function(index,value){metroSetTrack(index,value);AudioEngine.previewClick(value);};
const metroSetKit=Metro.setKit.bind(Metro);
Metro.setKit=function(id){metroSetKit(id);setTimeout(()=>{const accent=Array.isArray(this.slots.accent)?this.slots.accent[0]:this.slots.accent;AudioEngine.previewClick(accent);},30);};
const metroToggleDrum=Metro.toggleDrum.bind(Metro);
Metro.toggleDrum=function(row,index,cell){metroToggleDrum(row,index,cell);if(this._ensurePattern()[row]?.[index])AudioEngine.previewClick(this.trackSounds[row]);};

/* BPM 数字块微调与拍号强弱。无强弱时只用普通拍音色、固定力度。 */
Metro.accentMode='meter';
const metroInitV13=Metro.init.bind(Metro),metroSetBpmV13=Metro.setBpm.bind(Metro),metroSetTsV13=Metro.setTs.bind(Metro),metroStopV13=Metro.stop.bind(Metro),metroScheduleV13=Metro._scheduleBeat.bind(Metro);
Metro.init=function(){
    try{const saved=JSON.parse(localStorage.getItem('protuner_metro_accent_v13'));if(saved?.accentMode)this.accentMode=saved.accentMode;const bpm=Number(localStorage.getItem('protuner_metro_bpm_v13'));if(bpm>=30&&bpm<=300)this.bpm=bpm;}catch(e){}
    metroInitV13();const mode=document.getElementById('metro-accent-mode');if(mode)[...mode.options].forEach(option=>option.selected=option.value===this.accentMode);this.setBpm(this.bpm);this.updateAccentGuide();this.bindBpmControls();this.bindSwingControls();
};
Metro.setBpm=function(value){metroSetBpmV13(value);try{localStorage.setItem('protuner_metro_bpm_v13',String(this.bpm));}catch(e){}};
Metro.adjustBpm=function(delta){this.setBpm(this.bpm+(Number(delta)||0));};
Metro.stopBpmHold=function(){clearTimeout(this._bpmHoldTimer);this._bpmHoldTimer=null;this._bpmHolding=false;};
Metro.startBpmHold=function(delta){
    this.stopBpmHold();const step=Number(delta)<0?-1:1,started=performance.now();this._bpmHolding=true;this.adjustBpm(step);
    const repeat=()=>{if(!this._bpmHolding)return;this.adjustBpm(step);const elapsed=performance.now()-started,delay=elapsed>2200?70:elapsed>1100?100:145;this._bpmHoldTimer=setTimeout(repeat,delay);};this._bpmHoldTimer=setTimeout(repeat,430);
};
Metro.bindBpmControls=function(){
    document.querySelectorAll('[data-bpm-step]').forEach(button=>{if(button.dataset.holdBound==='1')return;button.dataset.holdBound='1';button.onclick=null;const delta=Number(button.dataset.bpmStep)||0;button.addEventListener('pointerdown',event=>{if(event.button!==undefined&&event.button!==0)return;event.preventDefault();button.setPointerCapture?.(event.pointerId);button.dataset.pointerAt=String(performance.now());this.startBpmHold(delta);});const stop=()=>this.stopBpmHold();button.addEventListener('pointerup',stop);button.addEventListener('pointercancel',stop);button.addEventListener('lostpointercapture',stop);button.addEventListener('click',event=>{const pointerAt=Number(button.dataset.pointerAt||0),recent=pointerAt>0&&performance.now()-pointerAt<700;if(recent){event.preventDefault();return;}this.adjustBpm(delta);});});
};
Metro.bindSwingControls=function(){document.querySelectorAll('[data-swing-style]').forEach(button=>{if(button.dataset.swingBound==='1')return;button.dataset.swingBound='1';button.onclick=null;button.addEventListener('click',()=>this.setSwingStyle(button.dataset.swingStyle));});};
Metro.setAccentMode=function(mode){this.accentMode=mode==='flat'?'flat':'meter';const el=document.getElementById('metro-accent-mode');if(el)[...el.options].forEach(option=>option.selected=option.value===this.accentMode);try{localStorage.setItem('protuner_metro_accent_v13',JSON.stringify({accentMode:this.accentMode}));}catch(e){}this.updateAccentGuide();};
Metro.setTs=function(value){metroSetTsV13(value);this.updateAccentGuide();};
Metro._accentPattern=function(){
    if(this.accentMode==='flat')return Array(this.ts).fill(1);
    if(this.signature==='4/4')return [1,.58,.78,.58];
    if(this.signature==='3/4')return [1,.58,.58];
    if(this.signature==='5/4')return this.grouping5==='2+3'?[1,.58,.78,.58,.58]:[1,.58,.58,.78,.58];
    if(this.signature==='6/8')return [1,.76];
    if(this.signature==='7/8')return [1,.66,.78];
    return [1,.58];
};
Metro.updateAccentGuide=function(){
    const el=document.getElementById('metro-accent-guide');if(!el)return;
    if(this.accentMode==='flat'){el.innerHTML=`<strong>${esc(this.signature)}</strong> 无强弱 · 同一音色与力度循环`;return;}
    const labels=this.signature==='4/4'?'强 · 弱 · 次强 · 弱':this.signature==='3/4'?'强 · 弱 · 弱':this.signature==='5/4'?(this.grouping5==='2+3'?'强 · 弱 │ 次强 · 弱 · 弱':'强 · 弱 · 弱 │ 次强 · 弱'):this.signature==='6/8'?'强 · 弱 · 弱 │ 次强 · 弱 · 弱':this.signature==='7/8'?`强弱分组 ${this.grouping7}`:'强 · 弱';
    el.innerHTML=`<strong>${esc(this.signature)}</strong> ${labels}`;
};
const metroSetGroupingV13=Metro.setGrouping.bind(Metro);
Metro.setGrouping=function(which,value){metroSetGroupingV13(which,value);this.updateAccentGuide();};
Metro._scheduleBeat=function(beatIdx,time){
    if(this.customMode)return metroScheduleV13(beatIdx,time);
    const pulseDur=60/this.bpm,level=this._accentPattern()[beatIdx]??.58,strong=this.accentMode==='meter'&&level>=.95,secondary=this.accentMode==='meter'&&!strong&&level>=.72;
    if(this.accentMode==='flat')AudioEngine.playClick(time,false,this.slots.beat,.68);
    else if(strong)AudioEngine.playMetronomeBeat(time,true,this.slots.beat,this.slots.accent,.86);
    else if(secondary)AudioEngine.playMetronomeBeat(time,true,this.slots.beat,this.slots.accent,.56);
    else AudioEngine.playClick(time,false,this.slots.beat,.68*level);
    if(this.sub>1){const d=pulseDur/this.sub;for(let s=1;s<this.sub;s++){const isSwing=this.swingEnabled&&this.sub%2===0&&s%2===1;AudioEngine.playClick(time+this._swingPosition(s,d,this.sub),false,isSwing?this.slots.swing:this.slots.subdivision,isSwing?.45:.34);}}
    else if(this.swingEnabled)AudioEngine.playClick(time+pulseDur*this.swing,false,this.slots.swing,.42);
    setTimeout(()=>document.querySelectorAll('.v-dot').forEach((dot,i)=>{dot.classList.remove('beat-1','beat-mid','beat-weak');if(i===beatIdx)dot.classList.add(strong?'beat-1':level>=.72?'beat-mid':'beat-weak');}),Math.max(0,(time-AudioEngine.ctx.currentTime)*1000));
};
Metro.stop=function(){metroStopV13();document.querySelectorAll('.v-dot').forEach(dot=>dot.classList.remove('beat-mid'));};

/* Swing 使用固定的常用演奏形式；内部仍保留精确时值，但界面不再要求用户输入百分比。 */
Metro.swingStyles={
    straight:{ratio:.5,label:'直拍',detail:'均匀八分'},
    light:{ratio:.58,label:'轻 Swing',detail:'接近 7:5'},
    triplet:{ratio:2/3,label:'三连 Swing',detail:'标准 2:1 三连律动'},
    heavy:{ratio:.75,label:'重 Swing',detail:'接近 3:1'}
};
Metro._closestSwingStyle=function(){if(!this.swingEnabled)return 'straight';return Object.entries(this.swingStyles).filter(([key])=>key!=='straight').sort((a,b)=>Math.abs(a[1].ratio-this.swing)-Math.abs(b[1].ratio-this.swing))[0][0];};
Metro.setSwingRatio=function(value){this.swing=Math.max(.5,Math.min(.75,(parseFloat(value)||66.7)/100));this.swingStyle=this._closestSwingStyle();this.renderSwingControls();this.saveCustom();};
const metroRenderCustomV131=Metro.renderCustomUI.bind(Metro);
Metro.renderCustomUI=function(){metroRenderCustomV131();const note=document.querySelector('.metro-grid-note'),preset=this.swingStyles[this.swingStyle||this._closestSwingStyle()];if(note&&this.swingEnabled)note.innerHTML=note.innerHTML.replace(/Swing\s*[\d.]+%/,preset?.label||'Swing');};

/* v13.3 节拍器：Swing 总开关、完整拍号提示、渐速与可编辑三/六连鼓格。 */
Object.assign(Metro.signatures,{'3/8':{pulses:3,label:'3 个八分音符'},'9/8':{pulses:3,label:'3 组复拍'},'12/8':{pulses:4,label:'4 组复拍'}});
Metro.lastSwingStyle=Metro.swingStyle&&Metro.swingStyle!=='straight'?Metro.swingStyle:'triplet';
Metro.setSwingStyle=function(style){if(!['light','triplet','heavy'].includes(style))style=this.lastSwingStyle||'triplet';this.lastSwingStyle=style;this.swingStyle=style;this.swingEnabled=true;this.swing=this.swingStyles[style].ratio;this.renderSwingControls();this.renderCustomUI();this.saveCustom();if(this.playing){this.stop();this.start();}};
Metro.setSwingEnabled=function(on){this.swingEnabled=!!on;if(on){this.swingStyle=this.lastSwingStyle||'triplet';this.swing=this.swingStyles[this.swingStyle].ratio;}this.renderSwingControls();this.renderCustomUI();this.saveCustom();if(this.playing){this.stop();this.start();}};
Metro.renderSwingControls=function(){this.swingStyle=['light','triplet','heavy'].includes(this.swingStyle)?this.swingStyle:(this.lastSwingStyle||'triplet');this.lastSwingStyle=this.swingStyle;this.swing=this.swingStyles[this.swingStyle].ratio;const master=document.getElementById('metro-swing-master'),body=document.getElementById('metro-swing-body'),label=document.getElementById('metro-swing-master-label'),preset=this.swingStyles[this.swingStyle],description=document.getElementById('metro-swing-description'),sound=document.getElementById('metro-swing-sound');if(master)master.checked=!!this.swingEnabled;if(body)body.hidden=!this.swingEnabled;if(label)label.textContent=this.swingEnabled?'开启':'关闭';if(description)description.textContent=`${preset.label} · ${preset.detail}`;document.querySelectorAll('[data-swing-style]').forEach(button=>{const active=this.swingEnabled&&button.dataset.swingStyle===this.swingStyle;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));button.disabled=!this.swingEnabled;});if(sound){sound.innerHTML=this._options(this.slots.swing);const selected=Array.isArray(this.slots.swing)?this.slots.swing[0]:this.slots.swing;[...sound.options].forEach(option=>option.selected=option.value===selected);}};
Metro._accentPattern=function(){if(this.accentMode==='flat')return Array(this.ts).fill(1);const patterns={'2/2':[1,.58],'2/4':[1,.58],'3/4':[1,.58,.58],'3/8':[1,.58,.58],'4/4':[1,.58,.78,.58],'6/8':[1,.76],'9/8':[1,.72,.72],'12/8':[1,.58,.78,.58]};if(this.signature==='5/4')return this.grouping5==='2+3'?[1,.58,.78,.58,.58]:[1,.58,.58,.78,.58];if(this.signature==='7/8')return [1,.66,.78];return patterns[this.signature]||Array(this.ts).fill(.58).map((x,i)=>i?x:1);};
Metro.updateAccentGuide=function(){const el=document.getElementById('metro-accent-guide');if(!el)return;if(this.accentMode==='flat'){el.innerHTML=`<strong>${esc(this.signature)}</strong> 无强弱 · 固定同一音色与力度，从头循环到尾`;return;}const labels={'2/2':'强 · 弱','2/4':'强 · 弱','3/4':'强 · 弱 · 弱','3/8':'强 · 弱 · 弱','4/4':'强 · 弱 · 次强 · 弱','6/8':'强 · 弱 · 弱 │ 次强 · 弱 · 弱','9/8':'强 · 弱 · 弱 │ 次强 · 弱 · 弱 │ 次强 · 弱 · 弱','12/8':'强 · 弱 · 弱 │ 弱 · 弱 · 弱 │ 次强 · 弱 · 弱 │ 弱 · 弱 · 弱'};let text=labels[this.signature];if(this.signature==='5/4')text=this.grouping5==='2+3'?'强 · 弱 │ 次强 · 弱 · 弱':'强 · 弱 · 弱 │ 次强 · 弱';if(this.signature==='7/8')text=`${this.grouping7}：强弱分组`;el.innerHTML=`<strong>${esc(this.signature)}</strong> ${text||'强 · 弱'}`;};
const metroStepsV133=Metro._stepsFor.bind(Metro);
Metro._stepsFor=function(){const resolution=String(this.gridResolution);if(resolution==='8T'||resolution==='16T'){const perPulse=resolution==='8T'?3:6;if(this.signature==='2/2')return [perPulse*2,perPulse*2];return Array(this.ts).fill(perPulse);}if(this.signature==='3/8')return [1,1,1].map(()=>Math.max(1,Number(this.gridResolution)/8));if(this.signature==='9/8')return [3,3,3].map(n=>n*Number(this.gridResolution)/8);if(this.signature==='12/8')return [3,3,3,3].map(n=>n*Number(this.gridResolution)/8);return metroStepsV133();};
Metro.setGridResolution=function(value){this.custom.patterns[this._patternKey()]=this.custom.pattern||[];const allowed=['8','8T','16','16T','32'];this.gridResolution=allowed.includes(String(value))?String(value):'16';this.custom.pattern=this.custom.patterns[this._patternKey()]||this._defaultPattern();this.renderCustomUI();this.saveCustom();};
Metro._ensurePattern=function(){const total=this._stepsFor().reduce((a,b)=>a+b,0),src=this.custom.pattern||[];this.custom.pattern=Array.from({length:4},(_,r)=>Array.from({length:total},(_,i)=>{const old=src[r]?.[i];if(old&&typeof old==='object')return {on:true,subdivision:['single','triplet','sextuplet'].includes(old.subdivision)?old.subdivision:'single',velocity:old.velocity==='accent'?'accent':'normal'};return old?{on:true,subdivision:'single',velocity:'normal'}:false;}));return this.custom.pattern;};
Metro._defaultPattern=function(){const steps=this._stepsFor(),total=steps.reduce((a,b)=>a+b,0),rows=Array.from({length:4},()=>Array(total).fill(false));let at=0;steps.forEach((len,i)=>{rows[0][at]={on:true,subdivision:'single',velocity:i===0?'accent':'normal'};if(i%2===1)rows[1][at]={on:true,subdivision:'single',velocity:'normal'};for(let s=0;s<len;s+=Math.max(1,Math.round(len/(String(this.gridResolution).includes('T')?3:2))))rows[2][at+s]={on:true,subdivision:'single',velocity:'normal'};at+=len;});return rows;};
Metro.toggleDrum=function(r,i,cell){const p=this._ensurePattern(),on=!!p[r][i];p[r][i]=on?false:{on:true,subdivision:'single',velocity:'normal'};this.custom.patterns[this._patternKey()]=p;this.renderCustomUI();this.saveCustom();if(!on)AudioEngine.previewClick(this.trackSounds[r]);};
Metro.openDrumEvent=function(r,i){const p=this._ensurePattern(),event=p[r]?.[i];if(!event)return;document.getElementById('drum-event-modal')?.remove();const modal=document.createElement('div');modal.id='drum-event-modal';modal.className='practice-modal';modal.innerHTML=`<div class="practice-modal-card"><h3>编辑鼓点 ${i+1}</h3><p class="text-sub">单击仍负责开关；长按已点亮的格子进入这里。</p><div class="drum-event-options">${[['single','单击'],['triplet','三连音 3'],['sextuplet','六连音 6']].map(([value,label])=>`<button data-sub="${value}" class="${event.subdivision===value?'active':''}">${label}</button>`).join('')}</div><div class="drum-event-options" style="grid-template-columns:1fr 1fr;margin-top:8px"><button data-velocity="normal" class="${event.velocity!=='accent'?'active':''}">普通力度</button><button data-velocity="accent" class="${event.velocity==='accent'?'active':''}">重音</button></div><div class="p-row" style="margin-top:12px"><button class="btn-ios" id="drum-event-delete">删除鼓点</button><button class="btn-ios active" id="drum-event-done">完成</button></div></div>`;document.body.appendChild(modal);modal.querySelectorAll('[data-sub]').forEach(button=>button.onclick=()=>{event.subdivision=button.dataset.sub;modal.querySelectorAll('[data-sub]').forEach(x=>x.classList.toggle('active',x===button));AudioEngine.previewClick(this.trackSounds[r]);});modal.querySelectorAll('[data-velocity]').forEach(button=>button.onclick=()=>{event.velocity=button.dataset.velocity;modal.querySelectorAll('[data-velocity]').forEach(x=>x.classList.toggle('active',x===button));AudioEngine.previewClick(this.trackSounds[r]);});document.getElementById('drum-event-delete').onclick=()=>{p[r][i]=false;modal.remove();this.renderCustomUI();this.saveCustom();};document.getElementById('drum-event-done').onclick=()=>{modal.remove();this.renderCustomUI();this.saveCustom();};};
Metro.bindDrumGrid=function(){document.querySelectorAll('#metro-custom-container td[data-drum-row]').forEach(cell=>{let timer,long=false;cell.onpointerdown=event=>{event.preventDefault();long=false;cell.setPointerCapture?.(event.pointerId);timer=setTimeout(()=>{long=true;this.openDrumEvent(Number(cell.dataset.drumRow),Number(cell.dataset.drumIndex));},620);};cell.onpointerup=event=>{clearTimeout(timer);if(!long)this.toggleDrum(Number(cell.dataset.drumRow),Number(cell.dataset.drumIndex),cell);};cell.onpointercancel=()=>clearTimeout(timer);});};
Metro.renderCustomUI=function(){const c=document.getElementById('metro-custom-container');if(!c)return;const labels=['底鼓','军鼓','踩镲','辅助'],steps=this._stepsFor(),pattern=this._ensurePattern(),total=steps.reduce((a,b)=>a+b,0),starts=new Set();let at=0;steps.forEach(n=>{starts.add(at);at+=n;});let html='<div class="drum-grid"><table><thead><tr><th>鼓组</th>';for(let i=0;i<total;i++)html+=`<th class="${starts.has(i)?'bar-step':''}">${i+1}</th>`;html+='</tr></thead><tbody>';labels.forEach((label,r)=>{html+=`<tr><td>${label}</td>`;for(let i=0;i<total;i++){const event=pattern[r][i],sub=event?.subdivision||'single',velocity=event?.velocity||'normal',mark=sub==='triplet'?'3':sub==='sextuplet'?'6':'';html+=`<td data-drum-row="${r}" data-drum-index="${i}" data-subdivision="${sub}" data-velocity="${velocity}" data-mark="${mark}" class="${event?'on':''} ${starts.has(i)?'bar-step':''}"></td>`;}html+='</tr>';});const label=String(this.gridResolution)==='8T'?'八分三连网格':String(this.gridResolution)==='16T'?'十六分三连／六连网格':`${this.gridResolution} 分音符网格`;html+=`</tbody></table><div class="metro-grid-note">${this.signature} · ${label} · ${this.swingEnabled?this.swingStyles[this.swingStyle].label:'直拍'}；单击开关，长按亮格编辑三连／六连与重音。</div></div><div class="custom-groove-footer"><button class="btn-ios metro-custom-play" onclick="Metro.toggleCustomPlayback()">${this.playing&&this.customMode?'■ 停止':'▶ 播放自定义'}</button></div>`;c.innerHTML=html;c.classList.toggle('open',!!this.custom.open);const button=document.getElementById('custom-groove-toggle');if(button)button.textContent=this.custom.open?'收起鼓组':'展开鼓组';this.bindDrumGrid();};
const metroScheduleV133=Metro._scheduleBeat.bind(Metro);
Metro._scheduleBeat=function(beatIdx,time){if(!this.customMode)return metroScheduleV133(beatIdx,time);const pulseDur=60/this.bpm,steps=this._stepsFor(),count=steps[beatIdx],stepDur=pulseDur/count,start=steps.slice(0,beatIdx).reduce((a,b)=>a+b,0),pattern=this._ensurePattern();for(let r=0;r<4;r++)for(let s=0;s<count;s++){const event=pattern[r][start+s];if(!event)continue;const hits=event.subdivision==='triplet'?3:event.subdivision==='sextuplet'?6:1,volume=(event.velocity==='accent'?1:.76)*(r===2?.64:1);for(let h=0;h<hits;h++)AudioEngine.playClick(time+s*stepDur+h*stepDur/hits,event.velocity==='accent',this.trackSounds[r],volume/Math.sqrt(hits));}setTimeout(()=>document.querySelectorAll('.v-dot').forEach((dot,i)=>{dot.classList.toggle('beat-1',i===beatIdx&&beatIdx===0);dot.classList.toggle('beat-weak',i===beatIdx&&beatIdx!==0);}),Math.max(0,(time-AudioEngine.ctx.currentTime)*1000));};
/* 练耳：每题冻结快照并以 try/finally 释放播放锁，避免下一题只有音阶、没有目标音。 */
EarTraining.play=async function(){
    if(this.isPlaying)return;
    if(this.resetTimer){clearTimeout(this.resetTimer);this.resetTimer=null;}
    const token=++this.questionToken;this.isPlaying=true;this.answered=false;this.generateQuestion();
    const q={token,level:this.level,keyRoot:this.keyRoot,scaleType:this.scaleType,bpm:this.bpm,targetNotes:[...this.targetNotes],answer:this.correctAnswer};
    const prompt=document.getElementById('ear-prompt'),feedback=document.getElementById('ear-feedback'),choices=document.getElementById('ear-choices');
    if(feedback){feedback.textContent='';feedback.className='ear-feedback';}if(choices)choices.innerHTML='';
    try{
        if(!AudioEngine.ctx)await AudioEngine.init();
        const tpl=MusicTheory.scaleTemplates[q.scaleType],base=60+q.keyRoot,la=base+tpl[5],reference=[...tpl.map(iv=>base+iv),base+12,la];
        await AudioEngine.prepareInstrument([...reference,...q.targetNotes],'ear');
        if(prompt)prompt.textContent=`正在播放 ${enharmonic(q.keyRoot)} ${this.scaleDisplayNames[q.scaleType]||q.scaleType} 音阶…`;
        await this._playReferenceScale(q);if(token!==this.questionToken)return;
        await sleep(360);if(token!==this.questionToken)return;
        // 播放前再次确保目标采样已就绪，避免移动端在音阶尾音解码时吞掉题目。
        await AudioEngine.prepareInstrument(q.targetNotes,'ear');
        await this._playTarget(q);if(token!==this.questionToken)return;
        this.correctAnswer=q.answer;this.targetNotes=[...q.targetNotes];this.renderChoices();
    }catch(error){console.error(error);if(prompt)prompt.textContent='播放失败，请再点一次';toast('音频暂未就绪，请重试');}
    finally{if(token===this.questionToken)this.isPlaying=false;}
};

/* 连续音高追踪：音头决定分段；滑音/跑调保留在同一块的曲线中。 */
Practice.startLoop=function(){
    if(this._v13LoopStarted)return;this._v13LoopStarted=true;this._lastRms=0;this._lastValidAt=-99;this._pendingPitch=null;this._pitchFrames=[];
    const begin=(midiFloat,freq,confidence,elapsed,onset)=>{const midi=Math.round(midiFloat),pc=((midi%12)+12)%12;this.currentNote={id:this.noteIdCounter++,pc,midi,midiFloat,note:NOTE_NAMES[pc]+(Math.floor(midi/12)-1),start:elapsed,end:elapsed,confidence,freq,valid:true,samples:[freq],contour:[{t:elapsed,m:midiFloat}],onset};this._pendingPitch=null;};
    const loop=()=>{
        this.animId=requestAnimationFrame(loop);
        if(!this.isRecording||!AudioEngine.analyser||(typeof App!=='undefined'&&App.currentPage!=='practice'))return;
        const result=AudioEngine.samplePitch(this.minFreq,this.maxFreq),now=performance.now(),elapsed=(now-this.startTime)/1000;
        if(!result.valid||result.rms<this.gateThreshold*1.3)this.noiseFloor=Math.max(.0012,Math.min(.03,this.noiseFloor*.96+result.rms*.04));
        const valid=result.valid&&result.freq>0&&result.confidence>this.confidenceThreshold&&result.rms>Math.max(this.gateThreshold,this.noiseFloor*1.48);
        if(valid){
            const midiRaw=freqToMidi(result.freq,Tuner.a4);this._pitchFrames.push(midiRaw);if(this._pitchFrames.length>7)this._pitchFrames.shift();const sorted=[...this._pitchFrames].sort((a,b)=>a-b),midiFloat=sorted[Math.floor(sorted.length/2)];
            const onset=(elapsed-this._lastValidAt>.16)||(this._lastRms>0&&result.rms>this._lastRms*1.75&&elapsed-(this.currentNote?.start??-9)>.075);this._lastValidAt=elapsed;
            if(!this.currentNote)begin(midiFloat,result.freq,result.confidence,elapsed,onset);
            else{
                const diff=Math.abs(midiFloat-this.currentNote.midiFloat),age=elapsed-this.currentNote.start,dense=age<.36||onset,threshold=dense?.07:.16;
                if(onset&&age>.08){this.finalizeNote();begin(midiFloat,result.freq,result.confidence,elapsed,true);}
                else if(diff>.72){
                    if(!this._pendingPitch||Math.abs(this._pendingPitch.m-midiFloat)>.38)this._pendingPitch={m:midiFloat,since:elapsed};
                    if(elapsed-this._pendingPitch.since>=threshold){this.finalizeNote();begin(midiFloat,result.freq,result.confidence,this._pendingPitch.since,false);}
                    else{this.currentNote.end=elapsed;this.currentNote.contour.push({t:elapsed,m:midiFloat});}
                }else{
                    this._pendingPitch=null;this.currentNote.end=elapsed;this.currentNote.midiFloat=this.currentNote.midiFloat*.82+midiFloat*.18;this.currentNote.midi=Math.round(this.currentNote.midiFloat);this.currentNote.pc=((this.currentNote.midi%12)+12)%12;this.currentNote.note=NOTE_NAMES[this.currentNote.pc]+(Math.floor(this.currentNote.midi/12)-1);this.currentNote.confidence=Math.max(this.currentNote.confidence,result.confidence);this.currentNote.samples.push(result.freq);if(this.currentNote.samples.length>36)this.currentNote.samples.shift();this.currentNote.freq=this.currentNote.samples.reduce((a,b)=>a+b,0)/this.currentNote.samples.length;this.currentNote.contour.push({t:elapsed,m:midiRaw});if(this.currentNote.contour.length>180)this.currentNote.contour.shift();
                }
            }
        }else if(this.currentNote&&elapsed-this._lastValidAt>(this.currentNote.end-this.currentNote.start<.32?.11:.24)){this.finalizeNote();this._pitchFrames=[];}
        this._lastRms=result.rms||0;
        if(elapsed>=this.maxDuration){if(this.currentNote){this.currentNote.end=elapsed;this.finalizeNote();}this.isRecording=false;const btn=document.getElementById('rec-btn');if(btn){btn.classList.remove('active');btn.innerHTML='<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill="currentColor"/></svg>采样完成';}if(!SightSinging.recording)toast('采样完成，可进行分析');}
        if(!document.getElementById('page-practice')?.classList.contains('sight-mode'))this.renderWaterfall(elapsed);
    };
    this.animId=requestAnimationFrame(loop);
};
Practice.finalizeNote=function(){
    if(!this.currentNote)return;const n=this.currentNote,duration=n.end-n.start,spread=n.contour?.length?Math.max(...n.contour.map(p=>Math.abs(p.m-n.midiFloat))):0,last=this.notes.at(-1);
    if(duration>=Math.max(this.minNoteDuration,.07+this.denoiseLevel*.025)&&n.confidence>=this.confidenceThreshold&&spread<2.8){
        // 同音短漏帧合并；真实新音头仍保持独立。
        if(last&&!n.onset&&n.start-last.end<.22&&Math.abs(last.midi-n.midi)<=1){last.end=n.end;last.contour=[...(last.contour||[]),...(n.contour||[])];last.samples=[...(last.samples||[]),...(n.samples||[])].slice(-48);last.freq=last.samples.reduce((a,b)=>a+b,0)/last.samples.length;last.confidence=Math.max(last.confidence,n.confidence);}else this.notes.push(n);
    }
    this.currentNote=null;this._pendingPitch=null;this.waterfallEpoch++;
};
const oldRenderWaterfall=Practice.renderWaterfall.bind(Practice);
Practice.renderWaterfall=function(time){
    oldRenderWaterfall(time);const track=document.getElementById('waterfall-content'),parent=document.getElementById('practice-container');if(!track||!parent)return;track.querySelector('.practice-pitch-overlay')?.remove();const all=[...this.notes,...(this.currentNote?[this.currentNote]:[])].filter(n=>n.contour?.length>1);if(!all.length)return;const range=this.getPitchRange([...this.notes,...(this.currentNote?[this.currentNote]:[])]),span=Math.max(1,range.max-range.min),height=parent.clientHeight||200,width=Math.max(parseFloat(track.style.width)||parent.clientWidth,parent.clientWidth),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('practice-pitch-overlay');svg.setAttribute('width',width);svg.setAttribute('height',height);svg.setAttribute('viewBox',`0 0 ${width} ${height}`);all.forEach(n=>{const points=n.contour.map(p=>`${p.t*this.pxPerSec},${Math.max(3,Math.min(height-3,(1-(p.m-range.min)/span)*height))}`).join(' '),path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M'+points.replaceAll(' ',' L'));svg.appendChild(path);});track.appendChild(svg);
};

/* 组合节奏练习：默认五线谱，可即时切换简谱或文字。 */
Practice.rhythmComposerView='staff';
Practice._rhythmName=function(item){
    const names=[[4,'全音符'],[3,'附点二分音符'],[2,'二分音符'],[1.5,'附点四分音符'],[1,'四分音符'],[.75,'附点八分音符'],[.5,'八分音符'],[.375,'附点十六分音符'],[.25,'十六分音符'],[1/3,'三连音'],[1/6,'六连音']];
    return names.reduce((best,x)=>Math.abs(x[0]-item.value)<Math.abs(best[0]-item.value)?x:best,names[4])[1];
};
Practice._renderRhythmComposer=function(){
    const box=document.getElementById('rhythm-score-preview');if(!box)return;const items=this.rhythmComposer;
    document.querySelectorAll('.rhythm-notation-tabs button').forEach(button=>button.classList.toggle('active',button.dataset.view===this.rhythmComposerView));
    if(!items.length){box.innerHTML='<div class="rhythm-text-preview" style="color:var(--text-sub)">加入时值后在这里显示谱面</div>';return;}
    if(this.rhythmComposerView==='text'){box.innerHTML=`<div class="rhythm-text-preview">${items.map((item,i)=>`<span>${i+1}. ${esc(this._rhythmName(item))}</span>`).join('')}</div>`;return;}
    if(this.rhythmComposerView==='jianpu'){let total=0;box.innerHTML=`<div class="rhythm-text-preview" style="font:700 22px ui-monospace,monospace">${items.map(item=>{const bar=total>0&&Math.abs(total%4)<.001?'│ ':'';total+=item.value;const under=item.value<=.25?'̳':item.value<=.5?'̲':'',dot=String(item.label).includes('·')?' ·':'';return `<span>${bar}×${under}${dot}<small style="display:block;font:9px system-ui;color:var(--text-sub)">${esc(this._rhythmName(item))}</small></span>`;}).join('')}</div>`;return;}
    const width=Math.max(500,70+items.length*52),lines=[30,41,52,63,74];let svg=`<svg viewBox="0 0 ${width} 96" role="img" aria-label="五线谱节奏组合">`;
    lines.forEach(y=>svg+=`<line x1="18" y1="${y}" x2="${width-14}" y2="${y}" stroke="var(--text-sub)" opacity=".5"/>`);svg+='<text x="22" y="61" font-size="31" fill="var(--text)">𝄞</text>';
    let x=66,total=0;items.forEach(item=>{if(total>0&&Math.abs(total%4)<.001)svg+=`<line x1="${x-10}" y1="30" x2="${x-10}" y2="74" stroke="var(--text)"/>`;const d=item.value,open=d>=2;svg+=`<ellipse cx="${x}" cy="57" rx="8" ry="5.3" transform="rotate(-17 ${x} 57)" fill="${open?'var(--surf)':'var(--text)'}" stroke="var(--text)" stroke-width="1.5"/>`;if(d<4)svg+=`<line x1="${x+7}" y1="56" x2="${x+7}" y2="28" stroke="var(--text)" stroke-width="1.6"/>`;if(d<1)svg+=`<path d="M${x+7},28 q14,6 5,16" fill="none" stroke="var(--text)" stroke-width="2"/>`;if(d<=.25)svg+=`<path d="M${x+7},36 q14,6 5,16" fill="none" stroke="var(--text)" stroke-width="2"/>`;if(String(item.label).includes('·'))svg+=`<circle cx="${x+14}" cy="57" r="2" fill="var(--text)"/>`;if(Math.abs(d-1/3)<.01||Math.abs(d-1/6)<.01)svg+=`<text x="${x-2}" y="88" font-size="9" fill="var(--prim)">${d>.2?'3':'6'}</text>`;total+=d;x+=Math.max(38,d*30);});box.innerHTML=svg+'</svg>';
};
Practice.openRhythmComposer=function(){
    const symbols=[['2分',2,'二分音符'],['4分',1,'四分音符'],['8分',.5,'八分音符'],['16分',.25,'十六分音符'],['3连',1/3,'三连音'],['6连',1/6,'六连音']];this.rhythmComposer=[];this.rhythmComposerView='staff';
    const modal=document.createElement('div');modal.id='rhythm-composer-modal';modal.className='practice-modal';modal.innerHTML=`<div class="practice-modal-card"><h3>组合练习节奏</h3><p class="text-sub">先选时值，可加附点，再点“加入”。默认以五线谱显示。</p><div class="rhythm-chip-row">${symbols.map(([s,v,n])=>`<button class="btn-ios rhythm-chip" data-value="${v}" title="${n}">${s}</button>`).join('')}</div><div class="rhythm-input-state"><button class="btn-ios rhythm-dot-toggle" id="rhythm-dot">附点 ·</button><button class="btn-ios active" id="rhythm-add">加入</button></div><div class="rhythm-notation-tabs"><button data-view="staff" class="active">五线谱</button><button data-view="jianpu">简谱</button><button data-view="text">文字</button></div><div class="rhythm-score-preview" id="rhythm-score-preview"></div><div class="rhythm-composer-actions"><button class="btn-ios" id="rhythm-delete">删除上一个</button><button class="btn-ios" id="rhythm-clear">清空</button><button class="btn-ios" id="rhythm-preview">试听</button></div><div class="p-row"><button class="btn-ios active" id="rhythm-apply">用于识别</button><button class="btn-ios" id="rhythm-close">关闭</button></div></div>`;document.body.appendChild(modal);
    let selected=symbols[1],dotted=false;const redraw=()=>this._renderRhythmComposer();modal.querySelectorAll('.rhythm-chip').forEach((button,i)=>button.onclick=()=>{selected=symbols[i];modal.querySelectorAll('.rhythm-chip').forEach(x=>x.classList.remove('active'));button.classList.add('active');});modal.querySelectorAll('.rhythm-chip')[1]?.classList.add('active');modal.querySelectorAll('.rhythm-notation-tabs button').forEach(button=>button.onclick=()=>{this.rhythmComposerView=button.dataset.view;redraw();});
    document.getElementById('rhythm-dot').onclick=e=>{dotted=!dotted;e.currentTarget.classList.toggle('active',dotted);};document.getElementById('rhythm-add').onclick=()=>{this.rhythmComposer.push({value:selected[1]*(dotted?1.5:1),label:selected[0]+(dotted?'·':'')});redraw();};document.getElementById('rhythm-delete').onclick=()=>{this.rhythmComposer.pop();redraw();};document.getElementById('rhythm-clear').onclick=()=>{this.rhythmComposer=[];redraw();};document.getElementById('rhythm-preview').onclick=()=>this.playRhythmPattern(this.rhythmComposer.length?this.rhythmComposer.map(x=>x.value):[1,.5,.5]);document.getElementById('rhythm-apply').onclick=()=>{if(!this.rhythmComposer.length){toast('先加入节奏符号');return;}this.analyzeRhythmPattern(this.rhythmComposer.map(x=>x.value));modal.remove();};document.getElementById('rhythm-close').onclick=()=>modal.remove();redraw();
};

/* 视唱题库：公版旋律仅保存短句；生成题具有稳定唯一编号，避免近期重复。 */
const SightSinging={
    mode:'sight',recording:false,unlocked:false,exercise:null,history:[],historyIndex:-1,attempts:0,stats:{total:0,mastered:0,corrected:0,skipped:0,sum:0},
    library:[
        {id:'pd-beethoven-ode-01',title:'欢乐颂 · 开头短句',composer:'L. v. Beethoven（1824）',source:'《第九交响曲》第四乐章 · 公版旋律',root:0,mode:'Major',meter:'4/4',seq:[[4,1],[4,1],[5,1],[7,1],[7,1],[5,1],[4,1],[2,1],[0,1],[0,1],[2,1],[4,1],[4,1.5],[2,.5],[2,2]]},
        {id:'pd-mozart-twinkle-01',title:'小星星变奏曲主题 · 短句',composer:'传统旋律／W. A. Mozart 变奏（1781）',source:'Ah! vous dirai-je, maman · 公版旋律',root:0,mode:'Major',meter:'4/4',seq:[[0,1],[0,1],[7,1],[7,1],[9,1],[9,1],[7,2],[5,1],[5,1],[4,1],[4,1],[2,1],[2,1],[0,2]]},
        {id:'pd-folk-frere-01',title:'两只老虎／Frère Jacques · 短句',composer:'法国传统童谣',source:'传统旋律 · 公版',root:0,mode:'Major',meter:'4/4',seq:[[0,1],[2,1],[4,1],[0,1],[0,1],[2,1],[4,1],[0,1],[4,1],[5,1],[7,2],[4,1],[5,1],[7,2]]},
        {id:'pd-folk-mary-01',title:'Mary Had a Little Lamb · 短句',composer:'Lowell Mason（1830）',source:'传统童谣 · 公版',root:0,mode:'Major',meter:'4/4',seq:[[4,1],[2,1],[0,1],[2,1],[4,1],[4,1],[4,2],[2,1],[2,1],[2,2],[4,1],[7,1],[7,2]]},
        {id:'pd-folk-london-01',title:'London Bridge · 短句',composer:'英国传统童谣',source:'传统旋律 · 公版',root:0,mode:'Major',meter:'4/4',seq:[[7,1],[9,1],[7,1],[5,1],[4,1],[5,1],[7,2],[2,1],[4,1],[5,2],[4,1],[5,1],[7,2]]},
        {id:'pd-folk-row-01',title:'Row, Row, Row Your Boat · 短句',composer:'Eliphalet Oram Lyte（1881）',source:'美国传统童谣 · 公版',root:0,mode:'Major',meter:'6/8',seq:[[0,1.5],[0,1.5],[0,1],[2,.5],[4,1.5],[4,1],[2,.5],[4,1],[5,.5],[7,3]]},
        {id:'pd-pierpont-jingle-01',title:'Jingle Bells · 主题短句',composer:'James Lord Pierpont（1857）',source:'公版歌曲主题',root:0,mode:'Major',meter:'4/4',seq:[[4,1],[4,1],[4,2],[4,1],[4,1],[4,2],[4,1],[7,1],[0,1.5],[2,.5],[4,4]]},
        {id:'pd-folk-auclair-01',title:'Au Clair de la Lune · 短句',composer:'法国传统旋律（18世纪）',source:'传统旋律 · 公版',root:0,mode:'Major',meter:'4/4',seq:[[0,1],[0,1],[0,1],[2,1],[4,2],[2,2],[0,1],[4,1],[2,1],[2,1],[0,4]]},
        {id:'pd-newton-amazing-01',title:'Amazing Grace · 短句',composer:'New Britain 传统曲调（1829）',source:'公版圣歌旋律',root:7,mode:'Major',meter:'3/4',seq:[[7,1],[0,2],[4,.5],[2,.5],[0,2],[4,1],[4,2],[2,1],[7,2]]},
        {id:'pd-gruber-silent-01',title:'Silent Night · 短句',composer:'Franz Xaver Gruber（1818）',source:'公版圣歌旋律',root:0,mode:'Major',meter:'6/8',seq:[[7,1.5],[9,.5],[7,1],[4,3],[7,1.5],[9,.5],[7,1],[4,3],[2,2],[2,1],[11,3]]},
        {id:'pd-folk-sakura-01',title:'樱花 · 短句',composer:'日本传统民谣',source:'传统旋律 · 公版',root:9,mode:'Natural Minor',meter:'4/4',seq:[[0,1],[0,1],[2,2],[0,1],[0,1],[2,2],[0,1],[2,1],[3,1],[2,1],[0,1],[2,.5],[0,.5],[-2,2]]},
        {id:'pd-folk-greensleeves-01',title:'Greensleeves · 短句',composer:'英国传统旋律（16世纪）',source:'传统旋律 · 公版',root:9,mode:'Natural Minor',meter:'3/4',seq:[[0,1],[3,2],[5,1],[7,1.5],[8,.5],[7,1],[5,2],[2,1],[-1,1.5],[0,.5],[2,1],[3,2]]}
    ],
    init(){if(this.initialized)return;this.initialized=true;this.loadStats();this.setMode('sight');this.next(1,true);},
    setMode(mode){
        this.mode=mode==='free'?'free':'sight';const sight=this.mode==='sight',page=document.getElementById('page-practice');page?.classList.toggle('sight-mode',sight);if(page)page.dataset.practiceMode=this.mode;
        const sightButton=document.getElementById('practice-mode-sight'),freeButton=document.getElementById('practice-mode-free');sightButton?.classList.toggle('active',sight);freeButton?.classList.toggle('active',!sight);sightButton?.setAttribute('aria-selected',String(sight));freeButton?.setAttribute('aria-selected',String(!sight));
        if(sight&&Practice.isRecording)Practice.toggleRec();if(!sight){if(this.recording)this.finishRecord();Practice.startTime=performance.now();Practice.renderWaterfall();}else if(this.exercise)this.renderScore();
    },
    setup(){return {source:document.getElementById('sight-source')?.value||'library',notation:document.getElementById('sight-notation')?.value||'staff',key:document.getElementById('sight-key')?.value||'auto',scale:document.getElementById('sight-scale')?.value||'auto',meter:document.getElementById('sight-meter')?.value||'auto',difficulty:document.getElementById('sight-difficulty')?.value||'easy'};},
    updateSetup(){this.next(1,true);},setNotation(value){this.renderScore();},
    generated(index){const s=this.setup(),modes=s.scale==='auto'?['Major','Natural Minor','Dorian','Mixolydian']:[s.scale],mode=modes[index%modes.length],tpl=MusicTheory.scaleTemplates[mode]||MusicTheory.scaleTemplates.Major,length=s.difficulty==='easy'?8:s.difficulty==='medium'?12:16,durs=s.difficulty==='hard'?[.25,.5,.75,1,1.5]:s.difficulty==='medium'?[.5,1,1.5,2]:[1,1,2],seq=[];let degree=(index*3)%7;for(let i=0;i<length;i++){degree=Math.max(0,Math.min(7,degree+[-2,-1,0,1,2][(index*7+i*11)%5]));seq.push([tpl[Math.min(6,degree)],durs[(index+i*3)%durs.length]]);}return {id:`gen-${mode}-${s.difficulty}-${String(index%120).padStart(3,'0')}`,title:`随机视唱练习 ${String(index%120+1).padStart(3,'0')}`,composer:'音乐工具箱 Ultra 规则生成器',source:'本地生成 · 120 个稳定唯一编号',root:s.key==='auto'?(index*5)%12:Number(s.key),mode,meter:s.meter==='auto'?['2/4','3/4','4/4','6/8'][index%4]:s.meter,seq};},
    build(index){const s=this.setup();let x=s.source==='generated'?this.generated(index):this.library[((index%this.library.length)+this.library.length)%this.library.length];x=JSON.parse(JSON.stringify(x));const targetRoot=s.key==='auto'?x.root:Number(s.key);x.transpose=(targetRoot-x.root+12)%12;x.root=targetRoot;if(s.scale!=='auto')x.mode=s.scale;if(s.meter!=='auto')x.meter=s.meter;x.midis=x.seq.map(([iv])=>60+x.root+iv+x.transpose*0);x.durations=x.seq.map(x=>x[1]);return x;},
    next(delta=1,replace=false){if(this.recording)return;let idx=replace?Math.max(0,this.historyIndex):this.historyIndex+delta;if(idx<0)idx=0;if(!replace&&idx<this.history.length){this.historyIndex=idx;this.exercise=this.history[idx];}else{const seed=idx<0?0:idx+(this.setup().source==='generated'?37:0),exercise=this.build(seed);if(replace&&this.history.length)this.history[this.historyIndex]=exercise;else{this.history.push(exercise);this.historyIndex=this.history.length-1;}this.exercise=exercise;}this.attempts=0;this.unlocked=false;['sight-selfcheck','sight-play-recording','sight-detect'].forEach(id=>{const button=document.getElementById(id);if(button)button.disabled=true;});this.setMetrics();this.setLamp?.('idle','等待视唱','录制结束后自动检测，也可手动结束并检测');this.updateCard();this.renderScore();this.setStatus('<strong>准备：</strong>先看谱，可点“提示 Do”，再点“开始唱”。页面不会显示瀑布流。');},
    updateCard(){const e=this.exercise;if(!e)return;document.getElementById('sight-title').textContent=e.title;document.getElementById('sight-meta').textContent=`${e.composer} · ${enharmonic(e.root)} ${EarTraining.scaleDisplayNames[e.mode]||e.mode} · ${e.meter} · ${e.source} · ID ${e.id}`;},
    rootMidi(){return 60+(this.exercise?.root||0);},
    async playDo(){if(!this.exercise)return;if(!AudioEngine.ctx)await AudioEngine.init();await AudioEngine.prepareInstrument([this.rootMidi()],'practice');AudioEngine.playInstrument(this.rootMidi(),1.25,.3,'practice');this.setStatus(`<strong>当前 Do：</strong>${midiToName(this.rootMidi())}（首调 Do = 当前主音）`);},
    async playSequence(){const e=this.exercise;if(!e)return;const bpm=96,quarter=60000/bpm;await AudioEngine.prepareInstrument(e.midis,'practice');let at=0;e.midis.forEach((m,i)=>{setTimeout(()=>AudioEngine.playInstrument(m,Math.max(.2,e.durations[i]*quarter/1000*.9),.22,'practice'),at);at+=e.durations[i]*quarter;});await sleep(at+120);},
    toggleRecord(){if(this.recording){this.finishRecord();return;}this.startRecord();},
    startRecord(){if(!this.exercise)return;this.recording=true;this.unlocked=false;this.attempts++;Practice.notes=[];Practice.selectedNotes.clear();Practice.currentNote=null;Practice.startTime=performance.now();Practice.maxDuration=Math.max(4.5,Math.min(12,this.exercise.durations.reduce((a,b)=>a+b,0)*.63+1));Practice.isRecording=true;const b=document.getElementById('sight-record');if(b){b.textContent='结束并分析';b.classList.add('active');}document.getElementById('sight-selfcheck').disabled=true;this.setStatus(`<strong>正在录制：</strong>${Practice.maxDuration.toFixed(1)} 秒。先唱后听，完成后自动分析。`);clearTimeout(this.recordTimer);this.recordTimer=setTimeout(()=>this.finishRecord(),Practice.maxDuration*1000+120);},
    finishRecord(){if(!this.recording)return;clearTimeout(this.recordTimer);this.recording=false;if(Practice.currentNote)Practice.finalizeNote();Practice.isRecording=false;const b=document.getElementById('sight-record');if(b){b.textContent='开始视唱';b.classList.remove('active');}this.evaluate();},
    evaluate(){const detected=Practice.notes.filter(n=>n.valid),target=this.exercise.midis;if(!detected.length){this.setStatus('<strong>未检测到有效音高：</strong>可以提高灵敏度，或进入自由练习选择“人声”后再试。');return;}const n=Math.max(target.length,detected.length),pitchErrors=[];for(let i=0;i<n;i++){const t=target[Math.min(target.length-1,Math.round(i*(target.length-1)/Math.max(1,n-1)))],d=detected[Math.min(detected.length-1,Math.round(i*(detected.length-1)/Math.max(1,n-1)))].midi;pitchErrors.push(Math.abs(t-d));}const pitch=Math.max(0,100-pitchErrors.reduce((a,b)=>a+b,0)/pitchErrors.length*22),tg=this.exercise.durations.slice(0,-1),dg=detected.slice(1).map((n,i)=>Math.max(.04,n.start-detected[i].start)),norm=a=>{const sum=a.reduce((x,y)=>x+y,0)||1;return a.map(x=>x/sum);},ta=norm(tg),da=norm(dg),rn=Math.max(ta.length,da.length,1);let re=0;for(let i=0;i<rn;i++)re+=Math.abs((ta[Math.min(i,ta.length-1)]||0)-(da[Math.min(i,da.length-1)]||0));const rhythm=Math.max(0,100-re/rn*260),score=this.setup().notation==='drum'?rhythm:pitch*.72+rhythm*.28;this.unlocked=true;document.getElementById('sight-selfcheck').disabled=false;this.stats.total++;this.stats.sum+=score;if(score>=82&&this.attempts===1)this.stats.mastered++;else if(score>=72)this.stats.corrected++;this.saveStats();this.updateStats();this.renderScore(detected);this.setStatus(`<strong>分析完成：</strong>音高 ${pitch.toFixed(0)}% · 节奏 ${rhythm.toFixed(0)}% · 综合 ${score.toFixed(0)}%。现在可以播放自检。`);},
    async playSelfCheck(){if(!this.unlocked){toast('请先完成一次视唱录制');return;}this.setStatus('<strong>自检：</strong>正在播放标准答案；青色轨迹是刚才识别到的演唱。');await this.playSequence();},
    retry(){this.unlocked=false;document.getElementById('sight-selfcheck').disabled=true;this.startRecord();},
    markSkip(){this.stats.skipped++;this.saveStats();this.updateStats();this.next(1);},
    setStatus(html){const el=document.getElementById('sight-status');if(el)el.innerHTML=html;},
    renderScore(detected=[]){const e=this.exercise,box=document.getElementById('sight-score');if(!e||!box)return;const notation=document.getElementById('sight-notation')?.value||'staff';if(notation==='jianpu'){const tpl=MusicTheory.scaleTemplates[e.mode]||MusicTheory.scaleTemplates.Major;box.innerHTML=`<div class="sight-jianpu">${e.midis.map((m,i)=>{const rel=(m-60-e.root+120)%12,degree=tpl.indexOf(rel),num=degree>=0?degree+1:'·';return `<span class="note">${num}<span class="dur">${e.durations[i]} 拍</span></span>`;}).join('')}</div>`;return;}const w=Math.max(620,e.midis.length*46+70),h=190,lines=notation==='drum'?[95]:[64,78,92,106,120];let svg=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${notation==='drum'?'鼓谱':'五线谱'}"><rect width="100%" height="100%" fill="var(--surf)"/>`;lines.forEach(y=>svg+=`<line x1="24" y1="${y}" x2="${w-18}" y2="${y}" stroke="var(--text-sub)" opacity=".56"/>`);svg+=`<text x="28" y="45" fill="var(--prim)" font-size="12" font-weight="700">${esc(enharmonic(e.root))} · ${esc(e.meter)}</text>`;let x=70;e.midis.forEach((m,i)=>{const y=notation==='drum'?95:112-(m-64)*3.5,d=e.durations[i],filled=d<2;svg+=`<ellipse cx="${x}" cy="${y}" rx="9" ry="6" transform="rotate(-18 ${x} ${y})" fill="${filled?'var(--text)':'var(--surf)'}" stroke="var(--text)" stroke-width="1.5"/>`;if(d<=1)svg+=`<line x1="${x+8}" y1="${y}" x2="${x+8}" y2="${y-33}" stroke="var(--text)" stroke-width="1.7"/>`;if(d<1)svg+=`<path d="M${x+8},${y-33} q15,7 5,18" fill="none" stroke="var(--text)" stroke-width="2"/>`;if(d===1.5||d===.75)svg+=`<circle cx="${x+14}" cy="${y}" r="2.2" fill="var(--text)"/>`;x+=Math.max(32,d*42);});if(detected.length){const min=detected[0].start,max=Math.max(min+.1,detected.at(-1).end),pts=detected.map(n=>{const px=70+(n.start-min)/(max-min)*(w-110),py=notation==='drum'?88:112-(n.midi-64)*3.5;return `${px},${py}`;}).join(' ');svg+=`<polyline points="${pts}" fill="none" stroke="var(--teal)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".82"/>`;}box.innerHTML=svg+'</svg>';},
    showLibraryInfo(){alert('本地曲库为公版或开放授权短句；每题保留作者、来源、原调、拍号与稳定唯一 ID，并通过内容指纹避免重复。随机生成模式另有 120 个稳定编号。');},
    loadStats(){try{const s=JSON.parse(localStorage.getItem('protuner_sight_stats_v13'));if(s)this.stats={...this.stats,...s};}catch(e){}this.updateStats();},saveStats(){localStorage.setItem('protuner_sight_stats_v13',JSON.stringify(this.stats));},resetStats(){this.stats={total:0,mastered:0,corrected:0,skipped:0,sum:0};this.saveStats();this.updateStats();toast('视唱统计已清空');},updateStats(){const avg=this.stats.total?Math.round(this.stats.sum/this.stats.total):0;[['sight-total',this.stats.total],['sight-mastered',this.stats.mastered],['sight-corrected',this.stats.corrected],['sight-skipped',this.stats.skipped],['sight-confidence',avg+'%']].forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=v;});}
};
window.SightSinging=SightSinging;

/* 追加离线 CC0 曲库，并以稳定 ID 与内容指纹双重去重。 */
if(Array.isArray(window.SIGHT_LIBRARY_V2)){
    const ids=new Set(SightSinging.library.map(item=>item.id)),fingerprints=new Set(SightSinging.library.map(item=>JSON.stringify([item.root,item.mode,item.meter,item.seq])));
    for(const item of window.SIGHT_LIBRARY_V2){const fingerprint=item.fingerprint||JSON.stringify([item.root,item.mode,item.meter,item.seq]);if(ids.has(item.id)||fingerprints.has(fingerprint))continue;ids.add(item.id);fingerprints.add(fingerprint);SightSinging.library.push(item);}
}

/* 额外内置 100 条原创旋律题与 100 条节奏／鼓谱题；全部是稳定编号，不依赖网络随机数。 */
{
    const meters=['2/4','3/4','4/4','6/8'],meterBeats={'2/4':2,'3/4':3,'4/4':4,'6/8':3},modes=['Major','Natural Minor','Dorian','Mixolydian'];
    const makeDurations=(seed,total,rhythm=false)=>{const choices=rhythm?[.25,.5,.75,1,1.5]:seed%3===0?[.5,1,1.5]:[.5,1,2],values=[];let left=total,i=0;while(left>.001&&i<80){const fits=choices.filter(value=>value<=left+.001),duration=fits[(seed*7+i*5)%fits.length]||left;values.push(duration);left=Number((left-duration).toFixed(4));i++;}return values;};
    for(let index=0;index<100;index++){
        const meter=meters[index%meters.length],mode=modes[(index*3)%modes.length],root=(index*5)%12,tpl=MusicTheory.scaleTemplates[mode]||MusicTheory.scaleTemplates.Major,durations=makeDurations(index,meterBeats[meter]*2),seq=[];let degree=(index*3)%7;
        durations.forEach((duration,i)=>{degree=Math.max(0,Math.min(7,degree+[-2,-1,0,1,2][(index+i*3)%5]));seq.push([degree===7?12:tpl[Math.min(6,degree)],duration]);});
        SightSinging.library.push({id:`mtu-original-${String(index+1).padStart(3,'0')}`,title:`原创视唱练习 ${String(index+1).padStart(3,'0')}`,composer:'黄鸡／音乐工具箱 Ultra',source:'音乐工具箱 Ultra 内置原创',root,mode,meter,scoreBpm:60+(index%9)*4,style:index%4===0?'modal':'classical',bars:2,training:'melody',seq});
    }
    for(let index=0;index<100;index++){
        const meter=meters[index%meters.length],root=0,durations=makeDurations(index+103,meterBeats[meter]*2,true),seq=durations.map((duration,i)=>((index+i*7)%6===0?[null,duration,1]:[0,duration]));
        SightSinging.library.push({id:`mtu-rhythm-${String(index+1).padStart(3,'0')}`,title:`节奏读谱练习 ${String(index+1).padStart(3,'0')}`,composer:'黄鸡／音乐工具箱 Ultra',source:'音乐工具箱 Ultra 内置原创鼓谱',root,mode:'Major',meter,scoreBpm:54+(index%12)*4,style:'rhythm',bars:2,training:'rhythm',seq});
    }
}

/* 视唱 v13 完整设置、闭合小节、分项评分与“本人识别轨迹 → 标准答案”自检。 */
SightSinging.setup=function(){return {
    source:document.getElementById('sight-source')?.value||'library',training:document.getElementById('sight-training')?.value||'melody',notation:document.getElementById('sight-notation')?.value||'staff',key:document.getElementById('sight-key')?.value||'auto',scale:document.getElementById('sight-scale')?.value||'auto',meter:document.getElementById('sight-meter')?.value||'auto',difficulty:document.getElementById('sight-difficulty')?.value||'easy',bpm:Number(document.getElementById('sight-bpm')?.value)||96,bars:(document.getElementById('sight-bars')?.value||'2')==='full'?'full':Math.max(1,Number(document.getElementById('sight-bars')?.value)||2),style:document.getElementById('sight-style')?.value||'auto'
};};
const practiceSetSensitivityV131=Practice.setSensitivity.bind(Practice);
Practice.setSensitivity=function(value){practiceSetSensitivityV131(value);const v=Math.max(0,Math.min(100,Number(value)||0));[['practice-sensitivity',null],['sight-sensitivity','sight-sensitivity-value']].forEach(([sliderId,outputId])=>{const slider=document.getElementById(sliderId),output=outputId&&document.getElementById(outputId);if(slider)slider.value=String(v);if(output)output.textContent=Math.round(v)+'%';});};
SightSinging.updateTraining=function(value){const notation=document.getElementById('sight-notation');if(value==='rhythm'){if(notation)notation.value='drum';}else if(notation?.value==='drum')notation.value='staff';this.updateSetup();};
SightSinging.setNotation=function(value){const training=document.getElementById('sight-training');if(training)training.value=value==='drum'?'rhythm':'melody';this.renderScore(this.lastDetected||[]);};
SightSinging.setSensitivity=function(value){Practice.setSensitivity(value);const slider=document.getElementById('sight-sensitivity'),output=document.getElementById('sight-sensitivity-value'),v=Math.max(0,Math.min(100,Number(value)||0));if(slider)slider.value=String(v);if(output)output.textContent=Math.round(v)+'%';};
SightSinging._meterBeats=function(meter){return ({'2/2':4,'2/4':2,'3/4':3,'4/4':4,'3/8':1.5,'6/8':3,'7/8':3.5})[meter]||4;};
SightSinging._styleName=function(style){return ({classical:'古典／歌唱性',folk:'民谣／童谣',pop:'流行写作（原创）',modal:'调式色彩',rhythm:'节奏型'})[style]||'自动';};
SightSinging._resolveRoot=function(key,original,index){if(key==='auto')return original;if(key==='random')return (original+1+(index*7)%11)%12;const value=Number(key);return Number.isFinite(value)?((value%12)+12)%12:original;};
SightSinging.generated=function(index){
    const s=this.setup(),meters=s.meter==='auto'?['2/4','3/4','4/4','6/8']:[s.meter],meter=meters[index%meters.length],style=s.style==='auto'?['classical','folk','pop','modal','rhythm'][index%5]:s.style;
    const modePool=style==='modal'?['Dorian','Phrygian','Lydian','Mixolydian']:style==='classical'?['Major','Natural Minor','Harmonic Minor']:style==='pop'?['Major','Natural Minor','Mixolydian']:['Major','Natural Minor','Dorian','Mixolydian'],mode=s.scale==='auto'?modePool[index%modePool.length]:s.scale,tpl=MusicTheory.scaleTemplates[mode]||MusicTheory.scaleTemplates.Major;
    const requestedBars=s.bars==='full'?4:s.bars,beats=this._meterBeats(meter),total=beats*requestedBars,allowed=s.difficulty==='hard'?[1.5,1,.75,.5,.25]:s.difficulty==='medium'?[2,1.5,1,.75,.5,.25]:[2,1,.5],seq=[];let remaining=total,degree=(index*3)%7,i=0;
    while(remaining>.001&&i<128){const fits=allowed.filter(d=>d<=remaining+.001),duration=fits[(index*7+i*5)%fits.length]||remaining,steps=style==='classical'?[-2,-1,0,1,2]:style==='pop'?[-2,-1,-1,0,1,1,2]:[-3,-2,-1,0,1,2,3],step=steps[(index+i*(style==='pop'?3:5))%steps.length];degree=Math.max(0,Math.min(7,degree+step));if(remaining-duration<.001)degree=0;seq.push([degree===7?12:tpl[Math.min(6,degree)],duration]);remaining=Number((remaining-duration).toFixed(4));i++;}
    const originalRoot=(index*5)%12;return {id:`gen-${style}-${mode}-${meter.replace('/','')}-${requestedBars}-${String(index%120).padStart(3,'0')}`,title:`随机${s.training==='rhythm'?'节奏':'视唱'}练习 ${String(index%120+1).padStart(3,'0')}`,composer:'音乐工具箱 Ultra 规则生成器',source:'本地生成 · 小节时值已校验',root:this._resolveRoot(s.key,originalRoot,index),originalRoot,mode,meter,style,bpm:s.bpm,bars:requestedBars,seq};
};
SightSinging.build=function(index){
    const s=this.setup(),libraryPool=this.library.filter(item=>s.training==='rhythm'?item.training==='rhythm':item.training!=='rhythm');let exercise=s.source==='generated'?this.generated(index):libraryPool[((index%libraryPool.length)+libraryPool.length)%libraryPool.length];exercise=JSON.parse(JSON.stringify(exercise));const originalMode=exercise.mode,originalRoot=exercise.originalRoot??exercise.root,targetRoot=this._resolveRoot(s.key,originalRoot,index);exercise.originalRoot=originalRoot;exercise.root=targetRoot;
    if(s.scale!=='auto'&&s.scale!==originalMode){const from=MusicTheory.scaleTemplates[originalMode]||MusicTheory.scaleTemplates.Major,to=MusicTheory.scaleTemplates[s.scale]||MusicTheory.scaleTemplates.Major;exercise.seq=exercise.seq.map(([interval,duration,rest])=>{if(rest||interval===null)return [null,duration,1];const octave=Math.floor(interval/12),pc=((interval%12)+12)%12,degree=from.indexOf(pc),mapped=degree>=0?(to[degree]??pc):pc;return [mapped+octave*12,duration];});exercise.mode=s.scale;}
    if(s.meter!=='auto')exercise.meter=s.meter;exercise.bpm=s.bpm;exercise.style=exercise.style||(/Beethoven|Mozart/.test(exercise.composer)?'classical':/圣歌/.test(exercise.source)?'classical':'folk');
    const beats=this._meterBeats(exercise.meter),sourceBeats=exercise.seq.reduce((sum,x)=>sum+x[1],0),sourceBars=Math.max(1,Math.ceil(sourceBeats/beats));exercise.sourceBars=sourceBars;
    if(s.bars!=='full'&&exercise.seq.length){const targetBeats=beats*s.bars,original=exercise.seq.map(item=>[...item]),arranged=[];let used=0,cursor=0;while(used<targetBeats-.001&&cursor<512){const item=[...original[cursor%original.length]],remaining=targetBeats-used;item[1]=Math.min(Number(item[1])||.25,remaining);arranged.push(item);used=Number((used+item[1]).toFixed(4));cursor++;}exercise.seq=arranged;exercise.arrangedLoop=targetBeats>sourceBeats+.001;exercise.bars=s.bars;}else exercise.bars=sourceBars;
    exercise.midis=exercise.seq.map(([interval,,rest])=>rest||interval===null?null:60+exercise.root+interval);exercise.durations=exercise.seq.map(x=>x[1]);return exercise;
};
SightSinging.updateCard=function(){const e=this.exercise;if(!e)return;const title=document.getElementById('sight-title'),meta=document.getElementById('sight-meta'),segment=document.getElementById('sight-segment-label'),keyText=e.originalRoot===e.root?`原调 ${enharmonic(e.root)}`:`原调 ${enharmonic(e.originalRoot)} → 练习调 ${enharmonic(e.root)}`;if(title)title.textContent=e.title;if(meta)meta.textContent=`${e.composer} · ${keyText} ${EarTraining.scaleDisplayNames[e.mode]||e.mode} · ${e.meter} · ${e.bpm} BPM · ${this._styleName(e.style)} · ${e.source} · ID ${e.id}`;if(segment)segment.textContent=`${e.bars} 小节${e.arrangedLoop?' · 循环练习':''}`;};
SightSinging.next=(function(original){return function(delta=1,replace=false){this.lastDetected=[];this.rawPlayback?.pause?.();if(this.recordingUrl){URL.revokeObjectURL(this.recordingUrl);this.recordingUrl='';}document.getElementById('sight-play-recording')?.classList.remove('ready');return original.call(this,delta,replace);};})(SightSinging.next);
SightSinging.playSequence=async function(){const e=this.exercise;if(!e)return;const quarter=60000/(e.bpm||96);if(this.setup().training==='rhythm'){let at=0;e.durations.forEach((duration,i)=>{if(e.midis[i]!==null)setTimeout(()=>AudioEngine.playTheoryRhythmHit(AudioEngine.ctx.currentTime+.015,true,.56),at);at+=duration*quarter;});await sleep(at+120);return;}await AudioEngine.prepareInstrument(e.midis.filter(Number.isFinite),'practice');let at=0;e.midis.forEach((midi,i)=>{if(Number.isFinite(midi))setTimeout(()=>AudioEngine.playInstrument(midi,Math.max(.2,e.durations[i]*quarter/1000*.9),.22,'practice'),at);at+=e.durations[i]*quarter;});await sleep(at+120);};
SightSinging._startRhythmDetector=function(){
    this.rhythmHits=[];this._rhythmLastRms=0;this._rhythmLastHit=-9;const analyser=AudioEngine.analyser;if(!analyser)return;const data=new Float32Array(analyser.fftSize||2048),loop=()=>{if(!this.recording||this.setup().training!=='rhythm')return;analyser.getFloatTimeDomainData(data);let sum=0;for(const value of data)sum+=value*value;const rms=Math.sqrt(sum/data.length),elapsed=(performance.now()-Practice.startTime)/1000,threshold=Math.max(Practice.gateThreshold*1.35,.009);if(rms>threshold&&rms>this._rhythmLastRms*1.55&&elapsed-this._rhythmLastHit>.075){this.rhythmHits.push({id:Practice.noteIdCounter++,start:elapsed,end:elapsed+.06,midi:60,confidence:Math.min(1,rms/Math.max(threshold,.001)),valid:true});this._rhythmLastHit=elapsed;}this._rhythmLastRms=this._rhythmLastRms*.72+rms*.28;this._rhythmAnim=requestAnimationFrame(loop);};this._rhythmAnim=requestAnimationFrame(loop);
};
SightSinging.setLamp=function(state='idle',title='等待视唱',detail='录制结束后自动检测'){const lamp=document.getElementById('sight-result-lamp'),heading=document.getElementById('sight-lamp-title'),small=document.getElementById('sight-lamp-detail');if(lamp)lamp.dataset.state=state;if(heading)heading.textContent=title;if(small)small.textContent=detail;};
SightSinging.setMetrics=function(values={}){const fields={pitch:values.pitch,rhythm:values.rhythm,completion:values.completion,score:values.score};for(const [name,value] of Object.entries(fields)){const element=document.getElementById(`sight-metric-${name}`);if(element)element.textContent=Number.isFinite(value)?`${Math.round(value)}%`:'—';}};
SightSinging._startRawRecorder=function(){
    const button=document.getElementById('sight-play-recording');if(button)button.disabled=true;if(this.recordingUrl){URL.revokeObjectURL(this.recordingUrl);this.recordingUrl='';}
    this.mediaChunks=[];if(typeof MediaRecorder==='undefined'||!AudioEngine.micStream?.active)return;
    try{const attempt=this.attempts,mime=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(type=>MediaRecorder.isTypeSupported?.(type)),recorder=new MediaRecorder(AudioEngine.micStream,mime?{mimeType:mime}:undefined);this.mediaRecorder=recorder;recorder.ondataavailable=event=>{if(event.data?.size)this.mediaChunks.push(event.data);};recorder.onstop=()=>{const type=recorder.mimeType||this.mediaChunks[0]?.type||'audio/webm',blob=new Blob(this.mediaChunks,{type});this.mediaRecorder=null;if(!blob.size||attempt!==this.attempts)return;this.recordingUrl=URL.createObjectURL(blob);const play=document.getElementById('sight-play-recording');if(play){play.disabled=false;play.classList.add('ready');}};recorder.start(180);}catch(error){console.warn('视唱原声录制不可用',error);this.mediaRecorder=null;}
};
SightSinging._stopRawRecorder=function(){try{if(this.mediaRecorder?.state==='recording')this.mediaRecorder.stop();}catch(error){console.warn('结束视唱原声录制失败',error);}};
SightSinging.startRecord=async function(){
    if(!this.exercise||this.recording)return;try{if(!AudioEngine.ctx||!AudioEngine.analyser)await AudioEngine.init();}catch(error){toast('需要麦克风权限才能进行视唱检测');this.setLamp('bad','麦克风不可用','请允许麦克风权限后再试');return;}
    this.recording=true;this.unlocked=false;this.attempts++;this._evaluatedAttempt=0;this.lastDetected=[];Practice.notes=[];Practice.selectedNotes.clear();Practice.currentNote=null;Practice.startTime=performance.now();const seconds=this.exercise.durations.reduce((a,b)=>a+b,0)*60/(this.exercise.bpm||96);Practice.maxDuration=Math.max(4.5,Math.min(32,seconds+1.4));Practice.isRecording=this.setup().training!=='rhythm';if(this.setup().training==='rhythm')this._startRhythmDetector();this._startRawRecorder();
    const button=document.getElementById('sight-record'),detect=document.getElementById('sight-detect'),self=document.getElementById('sight-selfcheck');if(button){button.textContent='停止唱';button.classList.add('active');}if(detect)detect.disabled=false;if(self)self.disabled=true;this.setMetrics();this.setLamp('recording','正在聆听','唱完可点“结束并检测”，超时也会自动检测');this.setStatus(`<strong>正在录制：</strong>最长 ${Practice.maxDuration.toFixed(1)} 秒。录音仅保留在当前页面，供你立即回听。`);clearTimeout(this.recordTimer);this.recordTimer=setTimeout(()=>this.finishRecord(),Practice.maxDuration*1000+120);
};
SightSinging.finishRecord=function(){if(!this.recording)return;clearTimeout(this.recordTimer);cancelAnimationFrame(this._rhythmAnim);this.recording=false;if(Practice.currentNote)Practice.finalizeNote();Practice.isRecording=false;this._stopRawRecorder();const button=document.getElementById('sight-record'),detect=document.getElementById('sight-detect');if(button){button.textContent='开始唱';button.classList.remove('active');}if(detect)detect.disabled=true;this.setLamp('analyzing','正在检测','正在比较音准、节奏与完整度');queueMicrotask(()=>this.evaluate());};
SightSinging.detectNow=function(){if(this.recording){this.finishRecord();return;}toast(this.unlocked?'本次检测已完成':'请先点“开始唱”');};
SightSinging.evaluate=function(){
    if(this._evaluatedAttempt===this.attempts)return;this._evaluatedAttempt=this.attempts;const target=this.exercise.midis.filter(Number.isFinite),training=this.setup().training,detected=(training==='rhythm'?this.rhythmHits:Practice.notes).filter(n=>n.valid);if(!detected.length){this.lastDetected=[];this.unlocked=true;document.getElementById('sight-selfcheck').disabled=false;this.stats.total++;this.saveStats();this.updateStats();this.renderScore();this.setMetrics({pitch:0,rhythm:0,completion:0,score:0});this.setLamp('bad','没有识别到有效声音','仍可回放录音或听标准答案进行自检');this.setStatus(`<strong>未检测到有效${training==='rhythm'?'音头':'音高'}：</strong>仍已开放识别对照。可先回放自己的原声，再听标准答案自行判断；也可提高灵敏度重试。`);return;}this.lastDetected=detected.map(n=>({...n}));
    const n=Math.max(target.length,detected.length),pitchErrors=[];if(training!=='rhythm')for(let i=0;i<n;i++){const t=target[Math.min(target.length-1,Math.round(i*(target.length-1)/Math.max(1,n-1)))],d=detected[Math.min(detected.length-1,Math.round(i*(detected.length-1)/Math.max(1,n-1)))].midi;pitchErrors.push(Math.abs(t-d));}const pitch=training==='rhythm'?100:Math.max(0,100-pitchErrors.reduce((a,b)=>a+b,0)/pitchErrors.length*22),targetGaps=this.exercise.durations.slice(0,-1),detectedGaps=detected.slice(1).map((note,i)=>Math.max(.04,note.start-detected[i].start)),norm=values=>{const sum=values.reduce((x,y)=>x+y,0)||1;return values.map(x=>x/sum);},ta=norm(targetGaps),da=norm(detectedGaps),rn=Math.max(ta.length,da.length,1);let rhythmError=0;for(let i=0;i<rn;i++)rhythmError+=Math.abs((ta[Math.min(i,ta.length-1)]||0)-(da[Math.min(i,da.length-1)]||0));const rhythm=Math.max(0,100-rhythmError/rn*260),onsets=Math.min(target.length,detected.length)/Math.max(target.length,detected.length)*100,span=Math.max(.1,detected.at(-1).end-detected[0].start),voiced=detected.reduce((sum,note)=>sum+Math.max(.04,note.end-note.start),0),continuity=training==='rhythm'?onsets:Math.min(100,voiced/span*118),confidence=Math.min(100,detected.reduce((sum,note)=>sum+(note.confidence||.6),0)/detected.length*100),score=training==='rhythm'?rhythm*.7+onsets*.3:pitch*.55+rhythm*.2+onsets*.15+continuity*.1;
    this.unlocked=true;document.getElementById('sight-selfcheck').disabled=false;this.stats.total++;this.stats.sum+=score;if(score>=82&&this.attempts===1)this.stats.mastered++;else if(score>=72)this.stats.corrected++;this.saveStats();this.updateStats();this.renderScore();this.setMetrics({pitch:training==='rhythm'?NaN:pitch,rhythm,completion:onsets,score});this.setLamp(score>=82?'good':score>=65?'warn':'bad',score>=82?'通过 · 整体唱准了':score>=65?'接近 · 再修正一次':'需要再练一次',`系统置信度 ${confidence.toFixed(0)}% · 检测结果只作辅助`);this.setStatus(`<strong>分析完成：</strong>${training==='rhythm'?'':`音准 ${pitch.toFixed(0)}% · `}节奏 ${rhythm.toFixed(0)}% · 完整度 ${onsets.toFixed(0)}%${training==='rhythm'?'':` · 连续性 ${continuity.toFixed(0)}%`} · 综合 ${score.toFixed(0)}%。检测不理想也可直接回听、自检。`);
};
SightSinging.playDetected=async function(){const notes=this.lastDetected||[];if(!notes.length)return;const training=this.setup().training,start=notes[0].start;if(training!=='rhythm')await AudioEngine.prepareInstrument(notes.map(n=>n.midi),'practice');notes.forEach(note=>setTimeout(()=>training==='rhythm'?AudioEngine.playTheoryRhythmHit(AudioEngine.ctx.currentTime+.012,false,.44):AudioEngine.playInstrument(note.midi,Math.max(.14,note.end-note.start),.18,'practice'),Math.max(0,(note.start-start)*1000)));await sleep(Math.max(400,(notes.at(-1).end-start)*1000+160));};
SightSinging.playSelfCheck=async function(){if(!this.unlocked){toast('请先完成一次录制并分析');return;}this.setStatus(this.lastDetected?.length?'<strong>识别对照：</strong>先播放系统识别出的音符，短暂停顿后播放标准答案；原声请点“回放录音”。':'<strong>识别对照：</strong>本次没有有效检测轨迹，直接播放标准答案，请自行听辨检查。');if(this.lastDetected?.length){await this.playDetected();await sleep(380);}await this.playSequence();};
SightSinging.playRecording=async function(){if(!this.recordingUrl){toast('本题还没有可回放的录音');return;}try{this.rawPlayback?.pause?.();this.rawPlayback=new Audio(this.recordingUrl);await this.rawPlayback.play();this.setStatus('<strong>回放原声：</strong>正在播放本次视唱录音。录音不会上传，也不会保存到本地题库。');}catch(error){toast('当前浏览器无法回放这段录音');}};
SightSinging.retry=function(){if(this.recording)return;this.unlocked=false;document.getElementById('sight-selfcheck').disabled=true;this.startRecord();};
SightSinging._spellMidi=function(midi,root=0){const flats=new Set([1,3,5,8,10]),names=(flats.has(((root%12)+12)%12)?['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B']:['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B']),name=names[((midi%12)+12)%12],letter=name[0],accidental=name.slice(1),octave=Math.floor(midi/12)-1,index=octave*7+['C','D','E','F','G','A','B'].indexOf(letter);return {name,letter,accidental,octave,index};};
SightSinging._staffY=function(midi,root=0){return 119-(this._spellMidi(midi,root).index-30)*7;};
SightSinging._ledgerLines=function(x,y){let html='';if(y<=49)for(let ly=49;ly>=y-1;ly-=14)html+=`<line x1="${x-12}" y1="${ly}" x2="${x+12}" y2="${ly}" stroke="var(--text)" stroke-width="1.2"/>`;if(y>=133)for(let ly=133;ly<=y+1;ly+=14)html+=`<line x1="${x-12}" y1="${ly}" x2="${x+12}" y2="${ly}" stroke="var(--text)" stroke-width="1.2"/>`;return html;};
SightSinging.renderScore=function(){
    const e=this.exercise,box=document.getElementById('sight-score');if(!e||!box)return;const notation=document.getElementById('sight-notation')?.value||'staff',beats=this._meterBeats(e.meter),total=e.durations.reduce((a,b)=>a+b,0),bars=Math.max(1,Math.ceil(total/beats)),width=Math.max(720,total*58+150),height=184;
    if(notation==='jianpu'){const tpl=MusicTheory.scaleTemplates[e.mode]||MusicTheory.scaleTemplates.Major;let cursor=0;box.innerHTML=`<div class="sight-jianpu"><b>│</b>${e.midis.map((midi,i)=>{const rest=!Number.isFinite(midi),rel=rest?0:(midi-60-e.root+120)%12,degree=tpl.indexOf(rel),number=rest?'0':degree>=0?degree+1:'·',bar=cursor>0&&Math.abs(cursor%beats)<.001?'<b>│</b>':'';cursor+=e.durations[i];return `${bar}<span class="note${rest?' rest':''}">${number}<span class="dur">${e.durations[i]} 拍</span></span>`;}).join('')}<b>║</b></div>`;return;}
    const drum=notation==='drum',top=drum?78:63,bottom=drum?120:119,contentStart=104,contentEnd=width-22,pixelsPerBeat=(contentEnd-contentStart)/Math.max(.01,total),lines=drum?[92,106]:[63,77,91,105,119];let svg=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${drum?'鼓谱':'五线谱'}"><rect width="100%" height="100%" fill="var(--surf)"/>`;
    lines.forEach(y=>svg+=`<line class="notation-bar" x1="18" y1="${y}" x2="${contentEnd+5}" y2="${y}" stroke="var(--text-sub)" opacity=".6"/>`);svg+=`<line class="notation-bar" x1="18" y1="${top}" x2="18" y2="${bottom}" stroke="var(--text)" stroke-width="1.7"/><text x="20" y="27" fill="var(--prim)" font-size="11" font-weight="750">${esc(enharmonic(e.root))} ${esc(e.mode)} · ♩=${this.effectiveBpm?.(e)||e.bpm||96}</text>`;
    if(!drum)svg+=`<text x="25" y="111" fill="var(--text)" font-size="42">𝄞</text>`;else svg+=`<text x="29" y="113" fill="var(--text)" font-size="30">𝄥</text>`;
    const [numerator='4',denominator='4']=String(e.meter||'4/4').split('/');svg+=`<text x="69" y="82" fill="var(--text)" font-size="19" font-weight="750">${esc(numerator)}</text><text x="69" y="105" fill="var(--text)" font-size="19" font-weight="750">${esc(denominator)}</text>`;
    for(let bar=1;bar<=bars;bar++){const x=contentStart+Math.min(total,bar*beats)*pixelsPerBeat,final=bar===bars;svg+=`<line class="notation-bar" x1="${x}" y1="${top}" x2="${x}" y2="${bottom}" stroke="var(--text)" stroke-width="${final?2.3:1.25}"/>${final?`<line class="notation-bar" x1="${x-5}" y1="${top}" x2="${x-5}" y2="${bottom}" stroke="var(--text)" stroke-width="1"/>`:''}`;}
    let cursor=0;e.midis.forEach((midi,i)=>{const duration=e.durations[i],x=contentStart+(cursor+duration*.43)*pixelsPerBeat,rest=!Number.isFinite(midi),y=drum?99:rest?91:this._staffY(midi,e.root);if(rest)svg+=`<path d="M${x-7},${y-8} h14 l-9,8 h9 l-12,13" fill="none" stroke="var(--text-sub)" stroke-width="2.3" stroke-linejoin="round"/>`;else if(drum)svg+=`<path d="M${x-6},${y-6} L${x+6},${y+6} M${x+6},${y-6} L${x-6},${y+6}" stroke="var(--text)" stroke-width="2.3"/><line x1="${x+7}" y1="${y}" x2="${x+7}" y2="${y-31}" stroke="var(--text)" stroke-width="1.6"/>`;else{const spelling=this._spellMidi(midi,e.root),filled=duration<2,stemUp=y>=91;svg+=this._ledgerLines(x,y);if(spelling.accidental)svg+=`<text x="${x-17}" y="${y+5}" text-anchor="middle" fill="var(--text)" font-size="17">${spelling.accidental}</text>`;svg+=`<ellipse cx="${x}" cy="${y}" rx="9" ry="6" transform="rotate(-18 ${x} ${y})" fill="${filled?'var(--text)':'var(--surf)'}" stroke="var(--text)" stroke-width="1.5"/>`;if(duration<4){const sx=stemUp?x+8:x-8,sy=stemUp?y-34:y+34;svg+=`<line x1="${sx}" y1="${y}" x2="${sx}" y2="${sy}" stroke="var(--text)" stroke-width="1.7"/>`;if(duration<1)svg+=stemUp?`<path d="M${sx},${sy} q15,7 5,18" fill="none" stroke="var(--text)" stroke-width="2"/>`:`<path d="M${sx},${sy} q-15,-7 -5,-18" fill="none" stroke="var(--text)" stroke-width="2"/>`;}if([1.5,.75,.375,3].includes(duration)){const onLine=Math.abs(((119-y)/7)%2)<.01,dotY=onLine?y-7:y;svg+=`<circle cx="${x+15}" cy="${dotY}" r="2.4" fill="var(--text)"/>`;}}cursor+=duration;});
    if(this.lastDetected?.length&&!drum){const min=this.lastDetected[0].start,max=Math.max(min+.1,this.lastDetected.at(-1).end),points=this.lastDetected.map(note=>`${contentStart+(note.start-min)/(max-min)*(contentEnd-contentStart)},${this._staffY(note.midi,e.root)}`).join(' ');svg+=`<polyline points="${points}" fill="none" stroke="var(--teal)" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>`;}
    box.innerHTML=svg+'</svg>';
};
SightSinging.showLibraryInfo=function(){alert(`本地曲库共 ${this.library.length} 条：包含知名公版传统旋律，以及 OpenScore Lieder 的 CC0 声乐谱两小节摘录；每条均有稳定 ID、内容指纹、作者、来源、原调和拍号。另有 120 个稳定编号的本地生成练习。现代流行版权旋律不随包分发，“流行写作”只使用原创生成练习。`);};
SightSinging.updateStats=function(){const avg=this.stats.total?Math.round(this.stats.sum/this.stats.total):0,passed=this.stats.mastered+this.stats.corrected,passRate=this.stats.total?Math.round(passed/this.stats.total*100):0,masteryRate=this.stats.total?Math.round(this.stats.mastered/this.stats.total*100):0;[['sight-total',this.stats.total],['sight-mastered',this.stats.mastered],['sight-corrected',this.stats.corrected],['sight-skipped',this.stats.skipped],['sight-pass-rate',passRate+'%'],['sight-mastery-rate',masteryRate+'%'],['sight-confidence',avg+'%']].forEach(([id,value])=>{const element=document.getElementById(id);if(element)element.textContent=value;});};
window.SightSinging=SightSinging;

/* 视唱 v13.3：曲库拍号冻结、自动／手动速度、谱面试奏进度与内页曲库说明。 */
const sightSetupV133=SightSinging.setup.bind(SightSinging),sightBuildV133=SightSinging.build.bind(SightSinging),sightStartRecordV133=SightSinging.startRecord.bind(SightSinging),sightFinishRecordV133=SightSinging.finishRecord.bind(SightSinging);
SightSinging.setup=function(){const setup=sightSetupV133(),source=document.getElementById('sight-source')?.value||setup.source,tempoMode=document.getElementById('sight-tempo-mode')?.value||'auto';return {...setup,source,meter:source==='library'?'auto':setup.meter,tempoMode,bpm:Math.max(40,Math.min(180,Number(document.getElementById('sight-bpm')?.value)||96))};};
SightSinging.recommendedTempo=function(exercise){if(Number.isFinite(exercise.scoreBpm))return {bpm:exercise.scoreBpm,label:'谱面速度'};const difficulty=this.setup().difficulty,meter=exercise.meter||'4/4',base=difficulty==='hard'?96:difficulty==='medium'?84:72,bpm=['6/8','9/8','12/8'].includes(meter)?Math.max(56,base-8):base;return {bpm,label:'推荐练习速度'};};
SightSinging.tempoPercent=100;SightSinging.tempoPercentEnabled=false;
SightSinging.effectiveBpm=function(exercise=this.exercise){const base=Math.max(30,Number(exercise?.baseBpm??exercise?.bpm)||96),ratio=this.tempoPercentEnabled?this.tempoPercent/100:1;return Math.max(20,Math.min(360,Math.round(base*ratio)));};
SightSinging.build=function(index){const exercise=sightBuildV133(index),setup=this.setup();if(setup.source==='library'){const original=this.library.find(item=>item.id===exercise.id);if(original)exercise.meter=original.meter;}const tempo=setup.tempoMode==='manual'?{bpm:setup.bpm,label:'手动练习速度'}:this.recommendedTempo(exercise);exercise.baseBpm=tempo.bpm;exercise.bpm=this.effectiveBpm(exercise);exercise.tempoSource=tempo.label;exercise.tempoMode=setup.tempoMode;return exercise;};
SightSinging.syncSetupUI=function(){const source=document.getElementById('sight-source')?.value||'library',meter=document.getElementById('sight-meter-field'),tempoMode=document.getElementById('sight-tempo-mode')?.value||'auto',bpmField=document.getElementById('sight-bpm-field'),bpm=document.getElementById('sight-bpm'),value=document.getElementById('sight-bpm-value');if(meter){meter.classList.toggle('is-disabled',source==='library');meter.querySelector('select').disabled=source==='library';}if(bpmField)bpmField.classList.toggle('is-disabled',tempoMode==='auto');if(bpm)bpm.disabled=tempoMode==='auto';if(value)value.textContent=`${bpm?.value||96} BPM`;};
SightSinging.updateSetup=function(){this.syncSetupUI();this.next(1,true);};
SightSinging.updateTempoMode=function(){this.syncSetupUI();this.next(1,true);};
SightSinging.previewTempo=function(value){const output=document.getElementById('sight-bpm-value');if(output)output.textContent=`${Math.round(Number(value)||96)} BPM`;};
SightSinging.updateCard=function(){const e=this.exercise;if(!e)return;e.bpm=this.effectiveBpm(e);const title=document.getElementById('sight-title'),meta=document.getElementById('sight-meta'),segment=document.getElementById('sight-segment-label'),keyText=e.originalRoot===e.root?`原调 ${enharmonic(e.root)}`:`原调 ${enharmonic(e.originalRoot)} → 练习调 ${enharmonic(e.root)}`,tempoText=this.tempoPercentEnabled?`${e.tempoSource} ${e.baseBpm} × ${this.tempoPercent}% = ${e.bpm} BPM`:`${e.tempoSource} ${e.bpm} BPM`;if(title)title.textContent=e.title;if(meta)meta.textContent=`${e.composer} · ${keyText} ${EarTraining.scaleDisplayNames[e.mode]||e.mode} · 固定拍号 ${e.meter} · ${tempoText} · ${this._styleName(e.style)} · ${e.source} · ID ${e.id}`;if(segment)segment.textContent=`${e.bars} 小节${e.arrangedLoop?' · 循环练习':''}`;this.syncSetupUI();this.setPlaybackProgress(0,`${e.tempoSource} · ♩=${e.bpm}`);this.syncTempoPercentUI();};
SightSinging.setPlaybackProgress=function(ratio,label){const bar=document.getElementById('sight-playback-progress'),text=document.getElementById('sight-playback-label');if(bar)bar.style.width=Math.max(0,Math.min(1,Number(ratio)||0))*100+'%';if(text&&label)text.textContent=label;};
SightSinging.startPlaybackProgress=function(ms,label){this.stopPlaybackProgress();const started=performance.now();this.setPlaybackProgress(0,`${label} · ♩=${this.exercise?.bpm||96}`);this._progressTimer=setInterval(()=>{const ratio=Math.min(1,(performance.now()-started)/Math.max(1,ms));this.setPlaybackProgress(ratio,`${label} · ♩=${this.exercise?.bpm||96} · ${Math.round(ratio*100)}%`);if(ratio>=1)this.stopPlaybackProgress(`${label}完成 · ♩=${this.exercise?.bpm||96}`);},80);};
SightSinging.stopPlaybackProgress=function(label){clearInterval(this._progressTimer);this._progressTimer=null;if(label)this.setPlaybackProgress(1,label);};
SightSinging.playSequence=async function(){const e=this.exercise;if(!e)return;const quarter=60000/(e.bpm||96),duration=e.durations.reduce((sum,x)=>sum+x,0)*quarter;this.startPlaybackProgress(duration,'标准试奏');if(this.setup().training==='rhythm'){let at=0;e.durations.forEach((value,i)=>{if(e.midis[i]!==null)setTimeout(()=>AudioEngine.playTheoryRhythmHit(AudioEngine.ctx.currentTime+.015,true,.56),at);at+=value*quarter;});await sleep(at+120);this.stopPlaybackProgress(`试奏完成 · ♩=${e.bpm}`);return;}await AudioEngine.prepareInstrument(e.midis.filter(Number.isFinite),'practice');let at=0;e.midis.forEach((midi,i)=>{if(Number.isFinite(midi))setTimeout(()=>AudioEngine.playInstrument(midi,Math.max(.2,e.durations[i]*quarter/1000*.9),.22,'practice'),at);at+=e.durations[i]*quarter;});await sleep(at+120);this.stopPlaybackProgress(`试奏完成 · ♩=${e.bpm}`);};
SightSinging.startRecord=async function(){if(this.exercise)this.exercise.bpm=this.effectiveBpm();await sightStartRecordV133();if(this.recording)this.startPlaybackProgress(Practice.maxDuration*1000,'正在录制');};
SightSinging.finishRecord=function(){this.stopPlaybackProgress(`录制完成 · ♩=${this.exercise?.bpm||96}`);return sightFinishRecordV133();};
SightSinging.showLibraryInfo=function(){document.getElementById('sight-library-modal')?.remove();const cc0=this.library.filter(item=>item.license==='CC0-1.0'||String(item.source).includes('公版')).length,melody=this.library.filter(item=>item.training!=='rhythm'&&String(item.id).startsWith('mtu-original')).length,rhythm=this.library.filter(item=>item.training==='rhythm').length,modal=document.createElement('div');modal.id='sight-library-modal';modal.className='practice-modal';modal.innerHTML=`<div class="practice-modal-card"><h3>本地视唱曲库</h3><p>当前共 <strong>${this.library.length}</strong> 条本地谱题：约 ${cc0} 条公版／CC0 乐谱短句、${melody} 条音乐工具箱 Ultra 原创旋律题、${rhythm} 条原创节奏／鼓谱题。</p><p>曲库题的拍号始终保留原值。没有可靠原速度资料的题目明确显示“推荐练习速度”；竖向倍率只改变练习播放速度，不改写曲目资料。</p><p>模块化 PWA 版把曲库单独缓存，方便后续升级；单文件版已完整内嵌，可直接离线查看。</p><button class="ramp-confirm" id="sight-library-close">知道了</button></div>`;document.body.appendChild(modal);document.getElementById('sight-library-close').onclick=()=>modal.remove();};

SightSinging.syncTempoPercentUI=function(){const slider=document.getElementById('sight-tempo-percent'),output=document.getElementById('sight-tempo-percent-value'),button=document.getElementById('sight-tempo-enable');if(slider)slider.value=String(this.tempoPercent);if(output)output.textContent=`${this.tempoPercent}%`;if(button){button.classList.toggle('active',this.tempoPercentEnabled);button.textContent=this.tempoPercentEnabled?'倍率开':'倍率';}};
SightSinging.previewTempoPercent=function(value){this.tempoPercent=Math.max(25,Math.min(200,Number(value)||100));this.syncTempoPercentUI();const bpm=this.effectiveBpm();this.setPlaybackProgress(0,`预览倍率 ${this.tempoPercent}% · ♩=${bpm}`);};
SightSinging.applyTempoPercent=function(value){this.tempoPercent=Math.max(25,Math.min(200,Number(value)||100));if(!this.tempoPercentEnabled)this.tempoPercentEnabled=true;if(this.exercise)this.exercise.bpm=this.effectiveBpm();this.updateCard();this.renderScore();SightMetronome.refresh();};
SightSinging.toggleTempoPercent=function(){this.tempoPercentEnabled=!this.tempoPercentEnabled;if(this.exercise)this.exercise.bpm=this.effectiveBpm();this.updateCard();this.renderScore();SightMetronome.refresh();};

const SightMetronome={
    playing:false,timer:null,beat:0,
    signature(){return SightSinging.exercise?.meter||'4/4';},
    async start(){if(this.playing)return;if(!AudioEngine.ctx)await AudioEngine.init();this.playing=true;this.beat=0;this.updateButton();this.tick();},
    stop(){this.playing=false;clearTimeout(this.timer);this.timer=null;this.beat=0;this.updateButton();},
    refresh(){if(!this.playing){this.updateButton();return;}clearTimeout(this.timer);this.beat=0;this.tick();},
    accent(index,numerator){if(index===0)return 1;if(numerator===4&&index===2)return .76;if(numerator===6&&index===3)return .76;if(numerator===5&&index===2)return .76;if(numerator===7&&(index===2||index===4))return .72;return .52;},
    tick(){if(!this.playing)return;const [n='4',d='4']=this.signature().split('/').map(Number),numerator=Math.max(1,n||4),denominator=Math.max(1,d||4),level=this.accent(this.beat,numerator),strong=level>=.75,slot=Array.isArray(Metro.slots?.accent)?Metro.slots.accent[0]:Metro.slots?.accent||'wood;';if(strong)AudioEngine.playMetronomeBeat(AudioEngine.ctx.currentTime+.012,true,Metro.slots?.beat,slot,.62*level);else AudioEngine.playClick(AudioEngine.ctx.currentTime+.012,false,Metro.slots?.beat,.58*level);this.beat=(this.beat+1)%numerator;const bpm=SightSinging.effectiveBpm(),delay=60000/bpm*(4/denominator);this.timer=setTimeout(()=>this.tick(),Math.max(40,delay));this.updateButton();},
    updateButton(){const button=document.getElementById('sight-metro-toggle');if(!button)return;button.classList.toggle('active',this.playing);button.textContent=this.playing?`节拍器 · ${SightSinging.effectiveBpm()}`:'节拍器 · 关';}
};
window.SightMetronome=SightMetronome;
SightSinging.toggleMetronome=function(){if(SightMetronome.playing)SightMetronome.stop();else SightMetronome.start();};
const sightNextV134=SightSinging.next.bind(SightSinging);SightSinging.next=function(delta=1,replace=false){const result=sightNextV134(delta,replace);if(SightMetronome.playing)queueMicrotask(()=>SightMetronome.refresh());return result;};
const sightSetModeV134=SightSinging.setMode.bind(SightSinging);SightSinging.setMode=function(mode){if(mode!=='sight')SightMetronome.stop();return sightSetModeV134(mode);};
const sightEvaluateV134=SightSinging.evaluate.bind(SightSinging);SightSinging.evaluate=function(){sightEvaluateV134();const heard=(this.lastDetected||[]).length;if(heard){this.setLamp('good','已检测到本次演唱','请回放原声，再听标准答案自行检查');this.setStatus('<strong>录制完成：</strong>系统已捕捉到声音。自动判断只作辅助，请用“回放录音”和“识别对照”自行确认音准与节奏。');}};

/* 乐理和弦：根、三、五、七音均提供大触控独立试听，并保留完整与分解和弦。 */
const theoryShowTopicsV134=TheoryPage.showTopics.bind(TheoryPage);
TheoryPage.showTopics=function(categoryId=this.currentCategory){return theoryShowTopicsV134(Number.isFinite(Number(categoryId))?Number(categoryId):0);};
TheoryPage.playChordTone=function(interval){AudioEngine.playInstrument(60+Number(interval),.9,.23,'theory');};
TheoryPage.playChordLab=function(intervals,arpeggio=false){const values=String(intervals).split(',').map(Number).filter(Number.isFinite);values.forEach((interval,index)=>setTimeout(()=>AudioEngine.playInstrument(60+interval,1,.19,'theory'),arpeggio?index*260:index*34));};
TheoryPage._chordLab=function(items){return `<div class="theory-chord-lab">${items.map(item=>{const columns=item.intervals.length===3?[1,4,7]:[1,3,5,7];return `<section class="theory-chord-card"><h4>${item.name} · C${item.symbol}</h4><div class="theory-chord-visual" role="group" aria-label="${item.name}图解">${item.intervals.map((interval,index)=>`<button class="theory-tone-node" style="grid-column:${columns[index]}" onclick="TheoryPage.playChordTone(${interval})"><strong>${enharmonic(interval%12)}</strong><span>${['根音','三音','五音','七音'][index]}</span><small>距根音 ${interval} 半音</small></button>`).join('')}</div><div class="theory-chord-actions"><button onclick="TheoryPage.playChordLab('${item.intervals.join(',')}',false)">播放完整和弦</button><button onclick="TheoryPage.playChordLab('${item.intervals.join(',')}',true)">播放分解和弦</button></div></section>`;}).join('')}</div>`;};
TheoryPage._demoTriads=function(){return this._chordLab([{name:'大三和弦',symbol:'',intervals:[0,4,7]},{name:'小三和弦',symbol:'m',intervals:[0,3,7]},{name:'增三和弦',symbol:'aug',intervals:[0,4,8]},{name:'减三和弦',symbol:'dim',intervals:[0,3,6]}]);};
TheoryPage._demoSevenths=function(){return this._chordLab([{name:'大七和弦',symbol:'maj7',intervals:[0,4,7,11]},{name:'属七和弦',symbol:'7',intervals:[0,4,7,10]},{name:'小七和弦',symbol:'m7',intervals:[0,3,7,10]},{name:'半减七和弦',symbol:'m7♭5',intervals:[0,3,6,10]}],true);};

/* 乐理五度圈改为方形大触控布局；基础页单选，只有关系页要求双选。 */
TheoryPage._demoCOFBasic=function(){
    const cx=160,cy=160,radius=112,keys=['C','G','D','A','E','B','F♯','D♭','A♭','E♭','B♭','F'],pcs=[0,7,2,9,4,11,6,1,8,3,10,5];let html='<div class="theory-cof-demo"><svg viewBox="0 0 320 320" role="img" aria-label="可点击的标准五度圈">';
    for(let i=0;i<12;i++){const angle=(-90+i*30)*Math.PI/180,x=cx+radius*Math.cos(angle),y=cy+radius*Math.sin(angle),selected=i===0;html+=`<circle class="demo-key cof-hit" data-cof-pc="${pcs[i]}" data-cof-minor="0" data-x="${x}" data-y="${y}" cx="${x}" cy="${y}" r="23"/><circle class="theory-cof-node" data-cof-pc="${pcs[i]}" data-cof-minor="0" data-x="${x}" data-y="${y}" cx="${x}" cy="${y}" r="16" fill="${selected?'var(--prim)':'var(--surf)'}" stroke="var(--prim)" stroke-width="1.5"/><text x="${x}" y="${y+4}" text-anchor="middle" font-size="11" fill="${selected?'#fff':'var(--text)'}" font-weight="750" pointer-events="none">${keys[i]}</text>`;}
    html+='<circle cx="160" cy="160" r="58" fill="rgba(10,132,255,.06)" stroke="var(--border)"/><text x="160" y="153" text-anchor="middle" font-size="13" fill="var(--prim)" font-weight="750">标准五度圈</text><text x="160" y="174" text-anchor="middle" font-size="9" fill="var(--text-sub)">点一个调查看关系并试听</text></svg><div class="theory-cof-readout" id="theory-cof-readout"><strong>标准五度圈</strong> · 点击任意调，查看属调、下属调、关系小调与调号。</div><div class="theory-cof-actions"><button onclick="TheoryPage.playTheoryCofScale()">播放所选音阶</button><button onclick="TheoryPage.clearTheoryCof()">清除选择</button></div></div>';return html;
};
TheoryPage._demoCOFRelation=function(){
    const cx=160,cy=160,outer=116,inner=76,pcs=[0,7,2,9,4,11,6,1,8,3,10,5],keys=['C','G','D','A','E','B','F♯','D♭','A♭','E♭','B♭','F'],minor=[9,4,11,6,1,8,3,10,5,0,7,2],minorNames=['A','E','B','F♯','C♯','G♯','E♭','B♭','F','C','G','D'];let html='<div class="theory-cof-demo"><svg viewBox="0 0 320 320" role="img" aria-label="双选调性关系五度圈"><line id="theory-cof-link" x1="160" y1="160" x2="160" y2="160" stroke="var(--orange)" stroke-width="3" opacity="0" stroke-dasharray="5,4"/>';
    for(let i=0;i<12;i++){const angle=(-90+i*30)*Math.PI/180,x=cx+outer*Math.cos(angle),y=cy+outer*Math.sin(angle),mx=cx+inner*Math.cos(angle),my=cy+inner*Math.sin(angle);html+=`<circle class="demo-key cof-hit" data-cof-pc="${pcs[i]}" data-cof-minor="0" data-x="${x}" data-y="${y}" cx="${x}" cy="${y}" r="22"/><circle class="theory-cof-node" data-cof-pc="${pcs[i]}" data-cof-minor="0" data-x="${x}" data-y="${y}" cx="${x}" cy="${y}" r="15" fill="var(--surf)" stroke="var(--prim)"/><text x="${x}" y="${y+4}" text-anchor="middle" font-size="10" fill="var(--text)" pointer-events="none">${keys[i]}</text><circle class="demo-key cof-hit" data-cof-pc="${minor[i]}" data-cof-minor="1" data-x="${mx}" data-y="${my}" cx="${mx}" cy="${my}" r="19"/><circle class="theory-cof-node" data-cof-pc="${minor[i]}" data-cof-minor="1" data-x="${mx}" data-y="${my}" cx="${mx}" cy="${my}" r="12.5" fill="var(--bg)" stroke="var(--green)"/><text x="${mx}" y="${my+3.5}" text-anchor="middle" font-size="8" fill="var(--text-sub)" pointer-events="none">${minorNames[i]}m</text>`;}
    html+='<text x="160" y="154" text-anchor="middle" font-size="11" fill="var(--prim)" font-weight="750">选择两个调</text><text x="160" y="170" text-anchor="middle" font-size="8" fill="var(--text-sub)">比较距离与共同音</text></svg><div class="theory-cof-readout" id="theory-cof-readout"><strong>双选关系工具</strong> · 依次选择两个大调或小调，显示关系与共同音。</div><div class="theory-cof-actions"><button onclick="TheoryPage.playTheoryCofPair()">对比播放</button><button onclick="TheoryPage.clearTheoryCof()">清除选择</button></div></div>';return html;
};
const theoryCofReadoutV13=TheoryPage.updateTheoryCofReadout.bind(TheoryPage);
TheoryPage.updateTheoryCofReadout=function(demoType){theoryCofReadoutV13(demoType);if(demoType!=='cofBasic'||this.cofSelections.length!==1)return;const item=this.cofSelections[0],readout=document.getElementById('theory-cof-readout');if(!readout)return;const order=[0,7,2,9,4,11,6,1,8,3,10,5],position=order.indexOf(item.pc),signature=position===0?'无升降号':position<=6?`${position} 个升号`:`${12-position} 个降号`,name=pc=>this._cofName({pc:(pc+12)%12,minor:false});readout.innerHTML=`<strong>${this._cofName(item)} 大调</strong> · ${signature}<br>属调 ${name(item.pc+7)} · 下属调 ${name(item.pc+5)} · 关系小调 ${name(item.pc+9)}m`;
};

/* 虚拟乐器：独立音色；编排模式点按锁定、双击空弦区禁弦；演奏模式支持滑音、推弦、揉弦与击／勾弦。 */
AudioEngine.playBassInstrument=function(midi,duration=.95,vol=.18,time=null){if(!this.ctx)return false;const when=Math.max(time??this.ctx.currentTime,this.ctx.currentTime),freq=midiToFreq(midi,Tuner.a4),bus=this.ctx.createGain(),lp=this.ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=Math.min(1100,Math.max(420,freq*5));lp.Q.value=.65;bus.gain.setValueAtTime(.0001,when);bus.gain.exponentialRampToValueAtTime(vol,when+.012);bus.gain.exponentialRampToValueAtTime(.0001,when+duration);bus.connect(lp);lp.connect(this.masterGainNode);[{type:'triangle',mult:1,gain:1},{type:'sine',mult:.5,gain:.42},{type:'sine',mult:2,gain:.18}].forEach(part=>{const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type=part.type;osc.frequency.value=freq*part.mult;gain.gain.value=part.gain;osc.connect(gain);gain.connect(bus);osc.start(when);osc.stop(when+duration+.04);});return true;};
AudioEngine.startExpressiveString=function(midi,instrument='guitar',volume=.16){if(!this.ctx||!this.masterGainNode)return null;const now=this.ctx.currentTime,freq=midiToFreq(midi,Tuner.a4),bus=this.ctx.createGain(),filter=this.ctx.createBiquadFilter(),oscillators=[],lfo=this.ctx.createOscillator(),lfoGain=this.ctx.createGain();filter.type='lowpass';filter.frequency.value=instrument==='bass'?Math.min(1300,freq*6):instrument==='ukulele'?3300:2500;filter.Q.value=instrument==='bass' ? .8 : .55;bus.gain.setValueAtTime(.0001,now);bus.gain.exponentialRampToValueAtTime(volume,now+.012);bus.gain.exponentialRampToValueAtTime(volume*.56,now+.32);bus.connect(filter);filter.connect(this.masterGainNode);const parts=instrument==='bass'?[['triangle',1,.82],['sine',.5,.32],['sine',2,.12]]:instrument==='ukulele'?[['triangle',1,.72],['sine',2,.18]]:[['triangle',1,.72],['sine',.5,.13],['sine',2,.2]];parts.forEach(([type,mult,gainValue])=>{const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type=type;osc.frequency.value=freq*mult;gain.gain.value=gainValue;osc.connect(gain);gain.connect(bus);lfoGain.connect(osc.detune);osc.start(now);oscillators.push({osc,mult});});lfo.type='sine';lfo.frequency.value=5.4;lfoGain.gain.value=0;lfo.connect(lfoGain);lfo.start(now);let stopped=false;return {setSemitones:value=>oscillators.forEach(({osc,mult})=>osc.frequency.setTargetAtTime(freq*mult*Math.pow(2,value/12),this.ctx.currentTime,.018)),setVibrato:cents=>lfoGain.gain.setTargetAtTime(Math.max(0,cents||0),this.ctx.currentTime,.04),stop:(release=.28)=>{if(stopped)return;stopped=true;const at=this.ctx.currentTime;bus.gain.cancelScheduledValues(at);bus.gain.setValueAtTime(Math.max(.0001,bus.gain.value),at);bus.gain.exponentialRampToValueAtTime(.0001,at+release);oscillators.forEach(({osc})=>osc.stop(at+release+.05));lfo.stop(at+release+.05);}};};
InstrumentPage.playMode='edit';InstrumentPage.livePointers=new Map();InstrumentPage._stringTapState=new Map();InstrumentPage._performanceLast=new Map();
const instrumentSetInstrumentV133=InstrumentPage.setInstrument.bind(InstrumentPage),instrumentBoardSvg=InstrumentPage._boardSvg.bind(InstrumentPage),instrumentUpdateInfoV133=InstrumentPage.updateInfo.bind(InstrumentPage);
InstrumentPage._voiceScope=function(){return this.instrument==='piano'?'piano':this.instrument==='bass'?'bass':this.instrument==='ukulele'?'ukulele':'guitar';};
InstrumentPage.playInstrumentNote=function(midi,duration=.8,vol=.22,time=null){if(this.instrument==='piano')return AudioEngine.playInstrument(midi,duration,vol,'piano',time);if(this.instrument==='bass')return AudioEngine.playBassInstrument(midi,Math.max(.7,duration),Math.min(.19,vol),time);if(this.instrument==='ukulele')return AudioEngine.playInstrument(midi,Math.min(.72,duration),Math.min(.18,vol),'guitar',time);return AudioEngine.playInstrument(midi,duration,vol,'guitar',time);};
InstrumentPage.setInstrument=function(type){instrumentSetInstrumentV133(type);const midis=this.instrument==='piano'?[48,60,72]:this.getTuning().map(noteToMidi);AudioEngine.prepareInstrument(midis,this.instrument==='piano'?'piano':'guitar');toast(`${{piano:'钢琴',guitar:'吉他',ukulele:'尤克里里',bass:'贝斯'}[this.instrument]}音色已切换`,1200);};
InstrumentPage.playPiano=function(midi){AudioEngine.prepareInstrument([midi],'piano');AudioEngine.playInstrument(midi,1,.24,'piano');if(this.targetMidis.includes(midi)){this.assignments[midi]={key:midi};this.updateInfo();}};
InstrumentPage.setPlayMode=function(mode){this.playMode=mode==='performance'?'performance':'edit';for(const state of this.livePointers.values())state.voice?.stop?.(.08);this.livePointers.clear();this.render();};
InstrumentPage.toggleStringMute=function(stringIndex){const s=Number(stringIndex);for(const [id,state] of this.livePointers)if(state.s===s){state.voice?.stop?.(.08);this.livePointers.delete(id);}if(this.mutedStrings.has(s))this.mutedStrings.delete(s);else{this.mutedStrings.add(s);delete this.heldFrets[s];}this.resetChordLabel();this.render();toast(`${this.getTuning().length-s} 弦${this.mutedStrings.has(s)?'已禁用：不发声，也不参与和弦识别':'已恢复发声'}`,1600);};
InstrumentPage.toggleString=function(s){this.toggleStringMute(s);};
InstrumentPage._boardSvg=function(horizontal=true){let svg=instrumentBoardSvg(horizontal);for(let s=0;s<this.getTuning().length;s++){const old=`class="instrument-string-toggle" onclick="InstrumentPage.toggleString(${s})"`,replacement=`class="instrument-string-toggle${this.mutedStrings.has(s)?' is-muted':''}" data-string="${s}"`;svg=svg.replace(old,replacement);if(this.mutedStrings.has(s))svg=svg.replaceAll(`class="virtual-note-hit" data-string="${s}"`,`class="virtual-note-hit is-muted" data-string="${s}"`);}let string=0;svg=svg.replace(/<line (?=[^>]*stroke="var\(--text-sub\)")(?=[^>]*opacity="\.75")[^>]*\/>/g,match=>{const s=string++,visible=match.replace('<line ',`<line class="instrument-string-line${this.mutedStrings.has(s)?' is-muted':''}" data-string="${s}" pointer-events="none" `),hit=match.replace('<line ',`<line class="instrument-string-mute-hit" data-string="${s}" `).replace(/stroke="[^"]+"/,'stroke="transparent"').replace(/stroke-width="[^"]+"/,'stroke-width="24"').replace(/opacity="[^"]+"/,'opacity="0"');return hit+visible;});return svg;};
InstrumentPage.bindStringMuteGestures=function(){const board=document.querySelector('#instrument-stage .virtual-board-scroll');if(!board||board.dataset.doubleMuteBound==='1')return;board.dataset.doubleMuteBound='1';board.addEventListener('pointerup',event=>{const target=event.target?.closest?.('.instrument-string-toggle,.instrument-string-mute-hit');if(!target)return;event.preventDefault();const s=Number(target.dataset.string),now=performance.now(),last=this._stringTapState.get(s);if(last&&now-last.at<380&&Math.hypot(event.clientX-last.x,event.clientY-last.y)<28){this._stringTapState.delete(s);this.toggleStringMute(s);}else this._stringTapState.set(s,{at:now,x:event.clientX,y:event.clientY});},true);};
InstrumentPage.activeFret=function(stringIndex){let fret=this.heldFrets[stringIndex]??0;for(const p of this.livePointers.values())if(p.s===stringIndex)fret=Math.max(fret,p.f);return fret;};
InstrumentPage._showTechnique=function(label){const el=document.getElementById('instrument-technique');if(el)el.textContent=label;};
InstrumentPage.pointerDown=function(e,s,f,midi){e.preventDefault();e.currentTarget.setPointerCapture?.(e.pointerId);if(this.mutedStrings.has(s)){toast(`${this.getTuning().length-s} 弦已禁用；双击弦名或空白弦区恢复`,1200);return;}const horizontal=document.querySelector('#instrument-stage .virtual-fret-wrap')?.classList.contains('is-horizontal');if(this.playMode==='edit'){this.livePointers.set(e.pointerId,{s,f,midi,started:performance.now(),x:e.clientX,y:e.clientY,edit:true});return;}const last=this._performanceLast.get(s),technique=last&&performance.now()-last.at<420?(midi>last.midi?'击弦 Hammer-on':midi<last.midi?'勾弦 Pull-off':'再次拨弦'):'拨弦',voice=AudioEngine.startExpressiveString(midi,this.instrument,.15);const state={s,f,midi,startF:f,started:performance.now(),x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,horizontal,voice,technique,oscillations:0,lastPerp:0};state.vibratoTimer=setTimeout(()=>{if(!this.livePointers.has(e.pointerId))return;state.voice?.setVibrato?.(15);state.technique='揉弦 Vibrato';this._showTechnique(state.technique);},380);this.livePointers.set(e.pointerId,state);this._showTechnique(technique);};
InstrumentPage.pointerMove=function(e){const state=this.livePointers.get(e.pointerId);if(!state||state.edit)return;e.preventDefault();const axisDelta=state.horizontal?e.clientX-state.x:e.clientY-state.y,perpDelta=state.horizontal?e.clientY-state.y:e.clientX-state.x,spacing=state.horizontal?46:40,slide=axisDelta/spacing,bend=Math.min(2,Math.abs(perpDelta)/42*2),perpStep=perpDelta-state.lastPerp;if(Math.sign(perpStep)&&Math.sign(perpStep)!==Math.sign(state.lastPerp)&&Math.abs(perpStep)>2)state.oscillations++;state.lastPerp=perpStep;state.lastX=e.clientX;state.lastY=e.clientY;state.f=Math.max(0,state.startF+Math.round(slide));state.voice?.setSemitones?.(slide+bend);if(Math.abs(axisDelta)>11)state.technique=`滑音 Slide ${slide>=0?'↑':'↓'}`;else if(Math.abs(perpDelta)>9)state.technique='推弦 Bend';if(state.oscillations>=3){state.voice?.setVibrato?.(20);state.technique='揉弦 Vibrato';}this._showTechnique(state.technique);};
InstrumentPage.pointerUp=function(e,s,f,midi){const state=this.livePointers.get(e.pointerId);if(!state)return;clearTimeout(state.vibratoTimer);this.livePointers.delete(e.pointerId);if(state.edit){if(Math.hypot(e.clientX-state.x,e.clientY-state.y)<14)this.toggleHeld(s,f);return;}const elapsed=performance.now()-state.started;state.voice?.stop?.(elapsed<180?.46:.24);this._performanceLast.set(s,{midi,at:performance.now()});this._showTechnique(`${state.technique} · 已释放`);};
InstrumentPage.pointerCancel=function(e){const state=this.livePointers.get(e.pointerId);if(state){clearTimeout(state.vibratoTimer);state.voice?.stop?.(.08);}this.livePointers.delete(e.pointerId);};
InstrumentPage.shortPress=function(s,f,midi){if(this.mutedStrings.has(s))return;this.playInstrumentNote(midi,.82,.22);this.momentary={s,f};if(this.targetMidis.includes(midi))this.assignments[midi]={string:s,fret:f};this.render();setTimeout(()=>{if(this.momentary?.s===s&&this.momentary?.f===f){this.momentary=null;this.render();}},180);};
InstrumentPage.toggleHeld=function(s,f){if(this.mutedStrings.has(s))return;if(this.heldFrets[s]===f)delete this.heldFrets[s];else this.heldFrets[s]=f;this.resetChordLabel();this.playInstrumentNote(noteToMidi(this.getTuning()[s])+f,.88,.22);this.render();};
InstrumentPage.updateInfo=function(){instrumentUpdateInfoV133();const small=document.querySelector('#instrument-map-info small');if(small)small.innerHTML=this.playMode==='performance'?'点按拨弦 · 顺品位滑音 · 横向推弦 · 长按揉弦 · 双击弦名／空白弦区禁弦':'点按圆点锁定／替换 · 再点取消 · 双击弦名／空白弦区禁弦';};
const instrumentUpdateChordV134=InstrumentPage.updateChordConsole.bind(InstrumentPage),instrumentOpenNameV134=InstrumentPage.openChordNameEditor.bind(InstrumentPage),instrumentRememberV134=InstrumentPage.rememberChord.bind(InstrumentPage);
InstrumentPage.updateChordConsole=function(){instrumentUpdateChordV134();const detail=document.getElementById('instrument-chord-detail');if(detail?.textContent.includes('长按锁定'))detail.textContent='点按圆点锁定 · 同弦自动替换 · 再点取消';};
InstrumentPage.openChordNameEditor=function(){if(!(Object.keys(this.heldFrets).length||this.mutedStrings.size)){toast('请先点按圆点锁定一个指型');return;}return instrumentOpenNameV134();};
InstrumentPage.rememberChord=function(){if(!(Object.keys(this.heldFrets).length||this.mutedStrings.size)){toast('请先点按锁定指型或双击禁用琴弦');return;}return instrumentRememberV134();};
InstrumentPage.scrollBoard=function(value){const board=document.querySelector('#instrument-stage .virtual-board-scroll'),horizontal=document.querySelector('#instrument-stage .virtual-fret-wrap')?.classList.contains('is-horizontal'),ratio=Math.max(0,Math.min(100,Number(value)||0))/100;if(!board)return;if(horizontal)board.scrollLeft=(board.scrollWidth-board.clientWidth)*ratio;else board.scrollTop=(board.scrollHeight-board.clientHeight)*ratio;};
InstrumentPage.renderFretboard=function(stage){const vv=window.visualViewport,horizontal=this.orientation==='auto'?((vv?.width||innerWidth)>=(vv?.height||innerHeight)):this.orientation==='horizontal',axis=horizontal?'y':'x',count=this.getTuning().length,visualStrings=Array.from({length:count},(_,i)=>{const s=horizontal?count-1-i:i;return {s,label:`${count-s}弦`,disabled:this.mutedStrings.has(s)};}),performance=this.playMode==='performance';stage.innerHTML=`<div class="virtual-fret-wrap ${horizontal?'is-horizontal':'vertical'}${performance?' performance-mode':''}"><div class="instrument-board-column"><div class="virtual-board-scroll">${this._boardSvg(horizontal)}</div><div class="instrument-scroll-control"><span>1 品</span><input type="range" min="0" max="100" value="0" oninput="InstrumentPage.scrollBoard(this.value)" aria-label="指板品位导航"><span>${this.instrument==='bass'?20:18} 品</span></div><div class="instrument-technique" id="instrument-technique">${performance?'准备演奏':'编排模式'}</div></div><div class="strum-zone ${horizontal?'strum-vertical':'strum-horizontal'}" id="strum-zone" data-axis="${axis}" style="--strings:${count}"><div class="performance-string-cells">${visualStrings.map(item=>`<div class="performance-string-cell${item.disabled?' disabled':''}">${item.label}</div>`).join('')}</div><span>演奏区<br><small>${horizontal?'上高音 · 下低音':'左低音 · 右高音'} · 双指＝轻制音<br>双击弦名或空白弦区＝禁用／恢复</small></span></div></div>`;this.bindStringMuteGestures();this.bindPerformanceMove();this.bindStrum();};
InstrumentPage.bindPerformanceMove=function(){const board=document.querySelector('#instrument-stage .virtual-board-scroll');if(!board)return;board.addEventListener('pointermove',event=>this.pointerMove(event),{passive:false});};
InstrumentPage.bindStrum=function(){const z=document.getElementById('strum-zone');if(!z)return;const axis=z.dataset.axis==='x'?'x':'y',count=this.getTuning().length,indexAt=e=>{const r=z.getBoundingClientRect(),rel=axis==='x'?(e.clientX-r.left)/Math.max(1,r.width):(e.clientY-r.top)/Math.max(1,r.height);return Math.max(0,Math.min(count-1,Math.floor(rel*count)));},stringAt=visual=>axis==='y'?count-1-visual:visual,trigger=(visual,muted)=>{const s=stringAt(visual);if(this.mutedStrings.has(s))return;const intensity=Math.min(.72,.38+(this.strumState?.velocity||0)*.11);if(muted)AudioEngine.playMutedString(s,null,intensity*.72);else this.playInstrumentNote(noteToMidi(this.getTuning()[s])+this.activeFret(s),.76,.20);};z.onpointerdown=e=>{e.preventDefault();z.setPointerCapture?.(e.pointerId);this.activePointers.add(e.pointerId);if(!this.strumState){const at=indexAt(e);this.strumState={pointerId:e.pointerId,lastIndex:at,lastTime:performance.now(),velocity:0,muted:false};trigger(at,this.activePointers.size>1);}if(this.activePointers.size>1)this.strumState.muted=true;z.classList.toggle('muted',this.activePointers.size>1);};z.onpointermove=e=>{const st=this.strumState;if(!st||st.pointerId!==e.pointerId)return;e.preventDefault();const next=indexAt(e);if(next===st.lastIndex)return;const now=performance.now(),dt=Math.max(8,now-st.lastTime),step=next>st.lastIndex?1:-1;st.velocity=Math.min(2,Math.abs(next-st.lastIndex)*55/dt);for(let i=st.lastIndex+step;;i+=step){trigger(i,st.muted||this.activePointers.size>1);if(i===next)break;}st.lastIndex=next;st.lastTime=now;};const end=e=>{this.activePointers.delete(e.pointerId);if(this.strumState?.pointerId===e.pointerId)this.strumState=null;z.classList.toggle('muted',this.activePointers.size>1);};z.onpointerup=end;z.onpointercancel=end;};

/* 和弦探索增加独立禁用弦状态。双击 0 品圆点切换 ×，禁用后不计入识别。 */
ChordExplore.disabledStrings=new Set();
ChordExplore._muteTapState=new Map();
ChordExplore.activeNotes=function(notes=this.selectedNotes,disabled=this.disabledStrings){const muted=disabled instanceof Set?disabled:new Set(disabled||[]);return (notes||[]).filter(note=>!muted.has(Number(note.string)));};
ChordExplore.toggleDisabledString=function(index){const s=Number(index),now=performance.now();if(this._lastMuteToggle?.s===s&&now-this._lastMuteToggle.at<140)return;this._lastMuteToggle={s,at:now};if(this.disabledStrings.has(s))this.disabledStrings.delete(s);else{this.disabledStrings.add(s);this.selectedNotes=this.selectedNotes.filter(note=>Number(note.string)!==s);}this.lastGuesses=[];this.renderFretboard();this.updateGuess();};
const exploreRender=ChordExplore.renderFretboard.bind(ChordExplore);
ChordExplore.renderFretboard=function(){exploreRender();const svg=document.querySelector('#explore-fretboard svg');if(!svg)return;const groups=[...svg.querySelectorAll('g')].slice(0,this.getTuningNotes().length);groups.forEach((group,stringIndex)=>{group.dataset.string=String(stringIndex);group.ondblclick=event=>{event.preventDefault();event.stopPropagation();this.toggleDisabledString(stringIndex);};group.onpointerup=event=>{const now=performance.now(),last=this._muteTapState.get(stringIndex);if(last&&now-last.at<380&&Math.hypot(event.clientX-last.x,event.clientY-last.y)<28){event.preventDefault();event.stopPropagation();this._muteTapState.delete(stringIndex);this.toggleDisabledString(stringIndex);}else this._muteTapState.set(stringIndex,{at:now,x:event.clientX,y:event.clientY});};if(this.disabledStrings.has(stringIndex)){group.querySelector('text')?.replaceChildren(document.createTextNode('×'));group.setAttribute('opacity','.42');}});};
const exploreToggle=ChordExplore.toggleNote.bind(ChordExplore);
ChordExplore.toggleNote=function(stringIndex,fret){if(this.disabledStrings.has(stringIndex)){toast('该琴弦已禁用；双击 0 品恢复');return;}exploreToggle(stringIndex,fret);};
const exploreSetTuningV13=ChordExplore.setTuning.bind(ChordExplore);
ChordExplore.setTuning=function(name){this.disabledStrings.clear();exploreSetTuningV13(name);};
ChordExplore.updateGuess=function(){const display=document.getElementById('chord-guess-list'),notes=this.activeNotes();if(!display)return;if(notes.length<2){this.lastGuesses=[];display.innerHTML='<span><strong>和弦识别显示屏</strong><small>禁用弦已从发声、最低音与和弦计算中排除</small></span><span class="guess-open">展开 ›</span>';return;}this.lastGuesses=MusicTheory.guessChordsMidi(notes.map(note=>note.midi));const best=this.lastGuesses[0];if(!best){display.innerHTML='<span><strong>暂未匹配</strong><small>可继续选择音符</small></span><span class="guess-open">展开 ›</span>';return;}display.innerHTML=`<span><strong>${best.name}</strong><small>${best.inversionLabel} · ${Math.min(100,best.score)}% · ${best.chordPCs.map(enharmonic).join(' ')}</small></span><span class="guess-open">查看 ${this.lastGuesses.length} 项 ›</span>`;};
ChordExplore.addToArrangement=function(chordGuess){const selectedNotes=this.activeNotes().map(note=>({...note}));this.arrangement.push({...chordGuess,selectedNotes,disabled:[...this.disabledStrings]});this.renderArrangement();};
ChordExplore.playArrangement=function(){if(!this.arrangement.length){toast('请先添加和弦');return;}this.arrangement.forEach((chord,index)=>setTimeout(()=>{const midis=this.activeNotes(chord.selectedNotes,new Set(chord.disabled||[])).map(note=>note.midi).sort((a,b)=>a-b);if(midis.length)midis.forEach((midi,i)=>setTimeout(()=>AudioEngine.playInstrument(midi,.8,.16,'explore'),i*34));},index*800));};

/* v13.5：全面拍号分组。第一拍使用重拍音色；所有“次强”只放大普通拍音色。 */
Object.assign(Metro.signatures,{
    '5/8':{pulses:2,label:'混合拍子'},'8/8':{pulses:3,label:'可分组八拍'},'10/8':{pulses:3,label:'混合拍子'},
    '11/8':{pulses:4,label:'混合拍子'},'13/8':{pulses:5,label:'混合拍子'}
});
Metro.groupingOptions={
    '5/4':['3+2','2+3'],'5/8':['2+3','3+2'],'6/8':['3+3','2+2+2'],'7/8':['2+2+3','2+3+2','3+2+2'],
    '8/8':['3+3+2','3+2+3','2+3+3','2+2+2+2'],'9/8':['3+3+3','2+2+2+3','2+2+3+2','2+3+2+2','3+2+2+2'],
    '10/8':['3+3+2+2','3+2+3+2','3+2+2+3','2+3+3+2','2+3+2+3','2+2+3+3'],
    '11/8':['3+3+3+2','3+3+2+3','3+2+3+3','2+3+3+3','2+2+2+2+3','2+2+2+3+2','2+2+3+2+2','2+3+2+2+2','3+2+2+2+2'],
    '12/8':['3+3+3+3','2+2+2+2+2+2'],'13/8':['3+3+3+2+2','3+3+2+3+2','3+3+2+2+3','3+2+3+3+2','3+2+3+2+3','3+2+2+3+3','2+3+3+3+2','2+3+3+2+3','2+3+2+3+3','2+2+3+3+3']
};
Metro.meterGroupings={
    '5/4':Metro.grouping5||'3+2','5/8':'2+3','6/8':Metro.grouping6||'3+3','7/8':Metro.grouping7||'2+2+3','8/8':'3+3+2','9/8':'3+3+3','10/8':'3+3+2+2','11/8':'3+3+3+2','12/8':'3+3+3+3','13/8':'3+3+3+2+2'
};
try{Object.assign(Metro.meterGroupings,JSON.parse(localStorage.getItem('protuner_metro_groupings_v135'))||{});}catch(e){}
Metro._grouping=function(signature=this.signature){return this.meterGroupings[signature]||'';};
Metro._groupLengths=function(signature=this.signature){
    if(signature==='5/4')return [1,1,1,1,1];const grouped=this._grouping(signature);if(grouped)return grouped.split('+').map(Number).filter(Number.isFinite);
    const [n='4']=String(signature).split('/');return Array(Math.max(1,Number(n)||4)).fill(1);
};
Metro._beatDuration=function(index){const denominator=Number(String(this.signature).split('/')[1])||4,length=this._groupLengths()[index]||1;return 60/this.bpm*(4/denominator)*length;};
Metro._accentPattern=function(){
    if(this.accentMode==='flat')return Array(this.ts).fill(1);
    if(this.signature==='4/4')return [1,.58,.78,.58];
    if(this.signature==='5/4'){const split=this._grouping()==='2+3'?2:3;return [1,...Array(split-1).fill(.58),.78,...Array(5-split-1).fill(.58)];}
    return Array.from({length:this.ts},(_,index)=>index===0?1:(index===Math.ceil(this.ts/2)?.75:.68));
};
Metro.updateAccentGuide=function(){
    const element=document.getElementById('metro-accent-guide');if(!element)return;if(this.accentMode==='flat'){element.innerHTML=`<strong>${esc(this.signature)}</strong> 无强弱 · 固定普通拍音色与同一力度，从头循环到尾`;return;}
    const grouping=this._grouping(),groups=grouping?grouping.split('+').map(Number):this._groupLengths(),words=[];groups.forEach((length,group)=>{for(let i=0;i<length;i++)words.push(i===0?(group===0?'强':'次强'):'弱');if(group<groups.length-1)words.push('│');});
    element.innerHTML=`<strong>${esc(this.signature)}</strong> ${grouping?`${esc(grouping)} · `:''}${words.join(' · ').replace(/· │ ·/g,'│')}<br><small>次强＝普通拍音色提高音量，不与第一拍重音混淆</small>`;
};
Metro.renderGroupingControls=function(){
    const row=document.getElementById('metro-grouping-row'),options=this.groupingOptions[this.signature];if(!row)return;if(!options){row.innerHTML='';row.classList.remove('show');return;}
    const current=options.includes(this._grouping())?this._grouping():options[0];this.meterGroupings[this.signature]=current;row.innerHTML=`<label class="metro-field"><span>${esc(this.signature)} 分组</span><select id="metro-grouping-select" onchange="Metro.setGrouping('${esc(this.signature)}',this.value)">${options.map(value=>`<option value="${value}" ${value===current?'selected':''}>${value}</option>`).join('')}</select></label><small>分组决定次强位置与不等长主拍；第一组首拍最强。</small>`;row.classList.add('show');
};
Metro.setGrouping=function(signature,value){
    const key=String(signature).includes('/')?String(signature):signature==='5'?'5/4':signature==='6'?'6/8':signature==='7'?'7/8':this.signature,options=this.groupingOptions[key]||[];if(!options.includes(value))return;this.meterGroupings[key]=value;if(key==='5/4')this.grouping5=value;if(key==='6/8')this.grouping6=value;if(key==='7/8')this.grouping7=value;
    try{localStorage.setItem('protuner_metro_groupings_v135',JSON.stringify(this.meterGroupings));}catch(e){}this.ts=key===this.signature?(key==='5/4'?5:value.split('+').length):this.ts;this.custom.pattern=this.custom.patterns[this._patternKey()]||this._defaultPattern();this.renderDots();this.renderGroupingControls();this.renderCustomUI();this.updateAccentGuide();this.saveCustom();if(this.playing){this.stop();this.start();}
};
const metroSetTsV135=Metro.setTs.bind(Metro);
Metro.setTs=function(value){metroSetTsV135(value);if(this.signature!=='5/4'&&this._grouping())this.ts=this._groupLengths().length;this.renderDots();this.renderGroupingControls();this.updateAccentGuide();};
Metro._patternKey=function(){return `${this.signature}@${this.gridResolution}@${this._grouping()}`;};
Metro._stepsFor=function(){
    const resolution=String(this.gridResolution),denominator=Number(String(this.signature).split('/')[1])||4,groups=this._groupLengths();if(this.signature==='5/4')return Array(5).fill(resolution.includes('T')?(resolution==='8T'?3:6):Number(resolution)/4);
    if(resolution.includes('T')){const perQuarter=resolution==='8T'?3:6;return groups.map(length=>Math.max(1,Math.round(length*perQuarter*4/denominator)));}
    return groups.map(length=>Math.max(1,Math.round(length*Number(resolution)/denominator)));
};
Metro._scheduler=function(){if(!this.playing)return;const now=AudioEngine.ctx.currentTime;while(this.nextTime<now+this.scheduleAhead){const beat=this.currentBeat;this._scheduleBeat(beat,this.nextTime);this.nextTime+=this._beatDuration(beat);this.currentBeat=(beat+1)%this.ts;}this.timerId=setTimeout(()=>this._scheduler(),this.lookAhead);};
Metro._scheduleBeat=function(beatIdx,time){
    const duration=this._beatDuration(beatIdx),level=this._accentPattern()[beatIdx]??.58,strong=this.accentMode==='meter'&&beatIdx===0,secondary=this.accentMode==='meter'&&!strong&&level>=.72;
    if(this.customMode){const steps=this._stepsFor(),count=Math.max(1,steps[beatIdx]||1),stepDur=duration/count,start=steps.slice(0,beatIdx).reduce((sum,n)=>sum+n,0),pattern=this._ensurePattern();for(let row=0;row<4;row++)for(let step=0;step<count;step++){const event=pattern[row]?.[start+step];if(!event)continue;const hits=event.subdivision==='triplet'?3:event.subdivision==='sextuplet'?6:1,volume=(event.velocity==='accent'?1:.76)*(row===2?.64:1);for(let h=0;h<hits;h++)AudioEngine.playClick(time+step*stepDur+h*stepDur/hits,event.velocity==='accent',this.trackSounds[row],volume/Math.sqrt(hits));}}
    else{this._playMainBeat(beatIdx,time,strong,secondary);if(this.sub>1){const subDur=duration/this.sub;for(let s=1;s<this.sub;s++){const swing=this.swingEnabled&&this.sub%2===0&&s%2===1;AudioEngine.playClick(time+this._swingPosition(s,subDur,this.sub),false,swing?this.slots.swing:this.slots.subdivision,this._subdivisionLevel(swing));}}else if(this.swingEnabled)AudioEngine.playClick(time+duration*this.swing,false,this.slots.swing,this._subdivisionLevel(true));}
    setTimeout(()=>document.querySelectorAll('.v-dot').forEach((dot,index)=>{dot.classList.remove('beat-1','beat-mid','beat-weak');if(index===beatIdx)dot.classList.add(strong?'beat-1':secondary?'beat-mid':'beat-weak');}),Math.max(0,(time-AudioEngine.ctx.currentTime)*1000));
};

/* 特殊调弦离线搜索：模糊匹配艺人／中文名／曲目／调弦，一键同步调音器与节拍器。 */
const SpecialTuningSearch={
    records:Array.isArray(window.SPECIAL_TUNINGS_V1?.records)?window.SPECIAL_TUNINGS_V1.records:[],
    normalize(value){return String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/♯/g,'#').replace(/♭/g,'b').replace(/[^a-z0-9#\u3400-\u9fff]+/g,'');},
    haystack(item){return this.normalize([item.artist,item.artistZh,item.title,item.titleZh,item.tuning?.join(''),item.meter,item.grouping,item.category,...(item.aliases||[])].join(' '));},
    score(item,query){const q=this.normalize(query);if(!q)return item.confidence==='verified'?3:item.confidence==='reported'?2:1;const hay=this.haystack(item);if(hay.includes(q))return 100-Math.min(40,hay.indexOf(q)/8);let cursor=0;for(const char of hay)if(char===q[cursor])cursor++;const subsequence=cursor/q.length;const tokens=String(query).toLowerCase().split(/\s+/).filter(Boolean),tokenHits=tokens.filter(token=>hay.includes(this.normalize(token))).length;return subsequence*45+(tokens.length?tokenHits/tokens.length*40:0)+(item.confidence==='verified'?4:0);},
    search(query=''){return this.records.map(item=>({item,score:this.score(item,query)})).filter(x=>!query||x.score>=35).sort((a,b)=>b.score-a.score||String(a.item.artist).localeCompare(String(b.item.artist))).map(x=>x.item);},
    open(){document.getElementById('special-tuning-modal')?.remove();const modal=document.createElement('div');modal.id='special-tuning-modal';modal.className='practice-modal special-tuning-modal';modal.innerHTML=`<div class="practice-modal-card"><h3>特殊调弦曲目搜索</h3><div class="special-search-head"><input id="special-tuning-query" type="search" autocomplete="off" placeholder="艺人／中文名／曲名／调弦，如 Misko、宗克、DADGAD"><button id="special-tuning-close">关闭</button></div><div class="special-search-meta"><span id="special-tuning-count"></span><span>调弦＋拍号＋参考速度可一键应用</span></div><div class="special-search-results" id="special-tuning-results"></div></div>`;document.body.appendChild(modal);const input=document.getElementById('special-tuning-query');input.oninput=()=>this.render(input.value);document.getElementById('special-tuning-close').onclick=()=>modal.remove();modal.addEventListener('click',event=>{if(event.target===modal)modal.remove();});this.render('');setTimeout(()=>input.focus(),30);},
    render(query=''){const results=this.search(query).slice(0,80),container=document.getElementById('special-tuning-results'),count=document.getElementById('special-tuning-count');if(count)count.textContent=`本地 ${this.records.length} 条 · 当前 ${results.length} 条`;if(!container)return;container.innerHTML=results.length?results.map(item=>{const verified=item.confidence==='verified',label=verified?'已核实':item.confidence==='reported'?'公开记录':'练习参考',tempo=`${item.bpm?.[0]||60}–${item.bpm?.[1]||120} BPM`;return `<article class="special-tuning-card"><div><h4>${esc(item.titleZh||item.title)} <small>${esc(item.title||'')} · ${esc(item.artistZh||item.artist)} / ${esc(item.artist)}</small><i class="special-confidence ${item.confidence==='reference'?'reference':''}">${label}</i></h4><div class="special-tuning-notes">${(item.tuning||[]).map(note=>`<b>${esc(note)}</b>`).join('')}</div><p>${esc(item.meter||'4/4')}${item.grouping?` · ${esc(item.grouping)}`:''} · ${tempo}${item.capo?` · Capo ${item.capo}`:''} · ${esc(item.category||'六弦木吉他')}${item.note?`<br>${esc(item.note)}`:''}</p></div><button onclick="SpecialTuningSearch.apply('${esc(item.id)}')">一键应用</button></article>`;}).join(''):'<div class="sample-license-note">没有匹配项。可换用艺人英文名、中文名、曲名片段或六个调弦字母。</div>';},
    apply(id){const item=this.records.find(record=>record.id===id);if(!item)return;const guitarButton=document.querySelector('#top-mode-switch button');if(Tuner.mode!=='guitar')Tuner.setMode('guitar',guitarButton);Tuner.customTuning=SharedCustomTuning.save(item.tuning);Tuner.setPreset('__custom__');Tuner.loadPresets();const meter=String(item.meter||'4/4').replace('*','');if(Metro.signatures[meter]){Metro.setTs(meter);if(item.grouping&&Metro.groupingOptions[meter]?.includes(item.grouping))Metro.setGrouping(meter,item.grouping);}if(item.bpm?.length)Metro.setBpm(Math.round((Number(item.bpm[0])+Number(item.bpm[1]))/2));document.getElementById('special-tuning-modal')?.remove();toast(`已应用 ${item.titleZh||item.title}：${item.tuning.join(' ')} · ${meter} · ${Metro.bpm} BPM`,3200);}
};
SpecialTuningSearch.render=function(query=''){
    const results=this.search(query).slice(0,200),container=document.getElementById('special-tuning-results'),count=document.getElementById('special-tuning-count');if(count)count.textContent=`本地 ${this.records.length} 条 · 当前 ${results.length} 条`;if(!container)return;
    container.innerHTML=results.length?results.map(item=>{const label=item.confidence==='verified'?'已核实':item.confidence==='reported'?'公开记录':'练习参考',tempo=`${item.bpm?.[0]||60}–${item.bpm?.[1]||120} BPM`,source=item.source?` · <a href="${esc(item.source)}" target="_blank" rel="noopener" style="color:var(--prim);font-weight:750">查看来源</a>`:'';return `<article class="special-tuning-card"><div><h4>${esc(item.titleZh||item.title)} <small>${esc(item.title||'')} · ${esc(item.artistZh||item.artist)} / ${esc(item.artist)}</small><i class="special-confidence ${item.confidence==='reference'?'reference':''}">${label}</i></h4><div class="special-tuning-notes">${(item.tuning||[]).map(note=>`<b>${esc(note)}</b>`).join('')}</div><p>${esc(item.meter||'4/4')}${item.grouping?` · ${esc(item.grouping)}`:''} · ${tempo}${item.capo?` · Capo ${item.capo}`:''} · ${esc(item.category||'六弦木吉他')}${source}${item.note?`<br>${esc(item.note)}`:''}</p></div><button onclick="SpecialTuningSearch.apply('${esc(item.id)}')">一键应用</button></article>`;}).join(''):'<div class="sample-license-note">没有匹配项。可换用艺人英文名、中文名、曲名片段或六个调弦字母。</div>';
};
window.SpecialTuningSearch=SpecialTuningSearch;

/* 设置页赞助与联系反馈。二维码只在用户主动打开时显示。 */
const ContactSupport={
    douyinUrl:'https://v.douyin.com/aLnrfaUkAw8/',
    openSponsor(){document.getElementById('support-modal')?.remove();const modal=document.createElement('div');modal.id='support-modal';modal.className='practice-modal';modal.innerHTML=`<div class="practice-modal-card"><h3>赞助 · 感谢您的支持</h3><p class="text-sub">随便点心意都可以。您的支持会用于音乐工具箱 Ultra 的持续维护。</p><div class="support-grid"><div class="support-pay-card"><img src="./assets/support-alipay.jpg" alt="支付宝赞助收款码"><strong>支付宝</strong></div><div class="support-pay-card"><img src="./assets/support-wechat.jpg" alt="微信赞助收款码"><strong>微信支付</strong></div></div><button class="ramp-confirm" id="support-close">关闭</button></div>`;document.body.appendChild(modal);document.getElementById('support-close').onclick=()=>modal.remove();modal.onclick=event=>{if(event.target===modal)modal.remove();};},
    openContact(){document.getElementById('contact-modal')?.remove();const modal=document.createElement('div');modal.id='contact-modal';modal.className='practice-modal';modal.innerHTML=`<div class="practice-modal-card contact-card"><h3>联系与反馈</h3><p class="text-sub">可在抖音私信或评论区反馈。@超级小黄鸡 · 抖音号 376469860</p><img src="./assets/contact-douyin.jpg" alt="超级小黄鸡抖音码"><div class="contact-actions"><button id="contact-copy">复制抖音链接</button><a href="${this.douyinUrl}" target="_blank" rel="noopener">直接打开抖音</a></div><button class="ramp-confirm" id="contact-close">关闭</button></div>`;document.body.appendChild(modal);document.getElementById('contact-copy').onclick=()=>this.copy();document.getElementById('contact-close').onclick=()=>modal.remove();modal.onclick=event=>{if(event.target===modal)modal.remove();};},
    async copy(){try{await navigator.clipboard.writeText(this.douyinUrl);toast('抖音链接已复制');}catch(e){const area=document.createElement('textarea');area.value=this.douyinUrl;document.body.appendChild(area);area.select();document.execCommand('copy');area.remove();toast('抖音链接已复制');}}
};
window.ContactSupport=ContactSupport;

/* 视唱成品流程：显示／视唱小节同步、提示 Do/La、自动检测三色灯、示范与节拍器同一时间轴。 */
const sightSetupV135=SightSinging.setup.bind(SightSinging),sightNextV135=SightSinging.next.bind(SightSinging),sightUpdateCardV135=SightSinging.updateCard.bind(SightSinging);
SightSinging.displayBars='2';SightSinging.singBars='2';SightSinging.demoUnlocked=false;
SightSinging.setup=function(){const setup=sightSetupV135(),display=document.getElementById('sight-bars')?.value||this.displayBars||'2',sing=document.getElementById('sight-sing-bars')?.value||this.singBars||display;return {...setup,bars:display==='full'?'full':Math.max(1,Number(display)||2),singBars:sing==='full'?'full':Math.max(1,Number(sing)||2)};};
SightSinging.setBars=function(kind,value){const normalized=value==='full'?'full':String(Math.max(1,Number(value)||2));if(kind==='sing'){this.singBars=normalized;['sight-sing-bars','sight-sing-bars-quick'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=normalized;});this.updateCard();return;}this.displayBars=normalized;['sight-bars','sight-bars-quick'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=normalized;});this.updateSetup();};
const sightRenderScoreV135=SightSinging.renderScore.bind(SightSinging);
SightSinging.renderScore=function(){
    const result=sightRenderScoreV135();
    document.querySelectorAll('#sight-score svg circle[r="2.4"]').forEach(dot=>{let note=dot.previousElementSibling;while(note&&note.tagName?.toLowerCase()!=='ellipse')note=note.previousElementSibling;if(!note)return;const x=Number(note.getAttribute('cx')),y=Number(note.getAttribute('cy')),onLine=Math.abs(((119-y)/7)%2)<.01;dot.setAttribute('cx',String(x+13));dot.setAttribute('cy',String(onLine?y-5.5:y));dot.setAttribute('stroke','var(--surf)');dot.setAttribute('stroke-width','1.2');dot.setAttribute('paint-order','stroke');});
    return result;
};
SightSinging._practiceSequence=function(){const e=this.exercise;if(!e)return {midis:[],durations:[],beats:0};const setting=this.setup().singBars,limit=setting==='full'?Infinity:this._meterBeats(e.meter)*setting,midis=[],durations=[];let used=0;for(let i=0;i<e.durations.length&&used<limit-.001;i++){const duration=Math.min(e.durations[i],limit-used);midis.push(e.midis[i]);durations.push(duration);used+=duration;}return {midis,durations,beats:used};};
SightSinging.updateCard=function(){sightUpdateCardV135();const e=this.exercise;if(!e)return;const display=this.setup().bars,sing=this.setup().singBars,segment=document.getElementById('sight-segment-label'),hint=document.getElementById('sight-prep-hint');if(segment)segment.textContent=`显示 ${display==='full'?'整段':display+' 节'} · 唱 ${sing==='full'?'整段':sing+' 节'}`;if(hint)hint.textContent=this.demoUnlocked?'本题已完成，可听标准示范':'先读谱，点开始唱后自动检测';this.syncTempoPercentUI();};
SightSinging.setLamp=function(state='idle',title='未检测'){const lamp=document.getElementById('sight-result-lamp'),heading=document.getElementById('sight-lamp-title');if(lamp){lamp.dataset.state=state;lamp.setAttribute('aria-label',title);}if(heading)heading.textContent=title;};
SightSinging._setDemoUnlocked=function(unlocked){this.demoUnlocked=!!unlocked;this.unlocked=!!unlocked;const button=document.getElementById('sight-demo');if(button){button.disabled=!unlocked;button.classList.toggle('ready',!!unlocked);}this.updateCard();};
SightSinging.next=function(delta=1,replace=false){this._setDemoUnlocked(false);const result=sightNextV135(delta,replace);this.setLamp('idle','未检测');return result;};
SightSinging.playDo=async function(){if(!this.exercise)return;if(!AudioEngine.ctx)await AudioEngine.init();const midi=this.rootMidi();await AudioEngine.prepareInstrument([midi],'practice');AudioEngine.playInstrument(midi,1.15,.27,'practice');const hint=document.getElementById('sight-prep-hint');if(hint)hint.textContent=`提示 Do：${midiToName(midi)}`;};
SightSinging.playLa=async function(){if(!this.exercise)return;if(!AudioEngine.ctx)await AudioEngine.init();const template=MusicTheory.scaleTemplates[this.exercise.mode]||MusicTheory.scaleTemplates.Major,midi=this.rootMidi()+(template[5]??9);await AudioEngine.prepareInstrument([midi],'practice');AudioEngine.playInstrument(midi,1.15,.25,'practice');const hint=document.getElementById('sight-prep-hint');if(hint)hint.textContent=`提示 La：${midiToName(midi)}`;};
SightSinging.startRecord=async function(){
    if(!this.exercise||this.recording)return;try{if(!AudioEngine.ctx||!AudioEngine.analyser)await AudioEngine.init();}catch(error){toast('请允许麦克风权限后再开始视唱');this.setLamp('bad','麦克风不可用');return;}
    const sequence=this._practiceSequence(),bpm=this.effectiveBpm(),seconds=sequence.beats*60/bpm;this.recording=true;this._setDemoUnlocked(false);this.attempts++;this._evaluatedAttempt=0;this.lastDetected=[];Practice.notes=[];Practice.selectedNotes.clear();Practice.currentNote=null;Practice.maxDuration=Math.max(3,Math.min(36,seconds+1.1));Practice.startTime=performance.now()+260;Practice.isRecording=this.setup().training!=='rhythm';if(this.setup().training==='rhythm')this._startRhythmDetector();const button=document.getElementById('sight-record');if(button){button.textContent='结束并自动检测';button.classList.add('active');}this.setLamp('recording','正在录制');const start=AudioEngine.ctx.currentTime+.28;if(SightMetronome.playing)SightMetronome.syncAt(start);this.startPlaybackProgress(Practice.maxDuration*1000,'正在录制');clearTimeout(this.recordTimer);this.recordTimer=setTimeout(()=>this.finishRecord(),Practice.maxDuration*1000+280);
};
SightSinging.finishRecord=function(){if(!this.recording)return;clearTimeout(this.recordTimer);cancelAnimationFrame(this._rhythmAnim);this.recording=false;if(Practice.currentNote)Practice.finalizeNote();Practice.isRecording=false;const button=document.getElementById('sight-record');if(button){button.textContent='重新唱';button.classList.remove('active');}this.stopPlaybackProgress(`录制完成 · 正在检测`);this.setLamp('analyzing','自动检测中');queueMicrotask(()=>this.evaluate());};
SightSinging.evaluate=function(){
    if(this._evaluatedAttempt===this.attempts)return;this._evaluatedAttempt=this.attempts;const sequence=this._practiceSequence(),target=sequence.midis.filter(Number.isFinite),training=this.setup().training,detected=(training==='rhythm'?this.rhythmHits:Practice.notes).filter(note=>note.valid);this.lastDetected=detected.map(note=>({...note}));let score=0;
    if(detected.length){const n=Math.max(target.length,detected.length),errors=[];if(training!=='rhythm')for(let i=0;i<n;i++){const expected=target[Math.min(target.length-1,Math.round(i*(target.length-1)/Math.max(1,n-1)))],heard=detected[Math.min(detected.length-1,Math.round(i*(detected.length-1)/Math.max(1,n-1)))].midi;errors.push(Math.abs(expected-heard));}const pitch=training==='rhythm'?100:Math.max(0,100-errors.reduce((a,b)=>a+b,0)/Math.max(1,errors.length)*21),completion=Math.min(target.length,detected.length)/Math.max(1,Math.max(target.length,detected.length))*100;score=training==='rhythm'?completion:pitch*.76+completion*.24;}
    const state=score>=85?'good':score>=60?'warn':'bad',title=score>=85?'绿色 · 完成良好':score>=60?'橙色 · 基本完成':'红色 · 建议重唱';this.setLamp(state,title);this._setDemoUnlocked(true);this.stats.total++;this.stats.sum+=score;if(score>=85&&this.attempts===1)this.stats.mastered++;else if(score>=60)this.stats.corrected++;this.saveStats();this.updateStats();this.renderScore();this.stopPlaybackProgress(`检测完成 · ${Math.round(score)}%`);toast(`${title} · ${Math.round(score)}%（自动检测仅作辅助）`,2600);
};
SightSinging.playSequence=async function(){
    if(!this.demoUnlocked){toast('唱完以后再听标准示范');return;}const e=this.exercise,sequence=this._practiceSequence();if(!e||!sequence.durations.length)return;if(!AudioEngine.ctx)await AudioEngine.init();const bpm=this.effectiveBpm(),quarter=60/bpm,duration=sequence.beats*quarter,start=AudioEngine.ctx.currentTime+.28;this.startPlaybackProgress(duration*1000,'标准示范');if(SightMetronome.playing)SightMetronome.syncAt(start);
    if(this.setup().training==='rhythm')sequence.durations.reduce((at,value,index)=>{if(Number.isFinite(sequence.midis[index]))AudioEngine.playTheoryRhythmHit(start+at,true,.52);return at+value*quarter;},0);else{await AudioEngine.prepareInstrument(sequence.midis.filter(Number.isFinite),'practice');let at=0;sequence.midis.forEach((midi,index)=>{if(Number.isFinite(midi))AudioEngine.playInstrument(midi,Math.max(.18,sequence.durations[index]*quarter*.9),.22,'practice',start+at);at+=sequence.durations[index]*quarter;});}await sleep((start-AudioEngine.ctx.currentTime+duration)*1000+120);this.stopPlaybackProgress(`示范完成 · ♩=${bpm}`);
};

Object.assign(SightMetronome,{
    _generation:0,nextTime:0,beat:0,
    _groups(){const meter=this.signature(),grouping=Metro.meterGroupings?.[meter];if(grouping)return grouping.split('+').map(Number);const [n='4']=String(meter).split('/');return Array(Math.max(1,Number(n)||4)).fill(1);},
    _duration(index){const denominator=Number(String(this.signature()).split('/')[1])||4;return 60/SightSinging.effectiveBpm()*(4/denominator)*(this._groups()[index]||1);},
    _schedule(time,index){const strong=index===0,secondary=!strong&&index===Math.ceil(this._groups().length/2),beat=Metro.slots?.beat;if(strong)AudioEngine.playMetronomeBeat(time,true,beat,Metro.slots?.accent,.64);else AudioEngine.playClick(time,false,beat,secondary?.52:.38);},
    _loop(generation){if(!this.playing||generation!==this._generation)return;const now=AudioEngine.ctx.currentTime;while(this.nextTime<now+.18){const index=this.beat;this._schedule(this.nextTime,index);this.nextTime+=this._duration(index);this.beat=(index+1)%this._groups().length;}this.timer=setTimeout(()=>this._loop(generation),25);this.updateButton();},
    async start(){if(!AudioEngine.ctx)await AudioEngine.init();this.playing=true;this.syncAt(AudioEngine.ctx.currentTime+.06);},
    syncAt(time){this.playing=true;clearTimeout(this.timer);this._generation++;this.nextTime=Math.max(time,AudioEngine.ctx.currentTime+.03);this.beat=0;this._loop(this._generation);},
    stop(){this.playing=false;clearTimeout(this.timer);this.timer=null;this._generation++;this.beat=0;this.updateButton();},
    refresh(){if(!this.playing){this.updateButton();return;}this.syncAt(AudioEngine.ctx.currentTime+.06);},
    updateButton(){const button=document.getElementById('sight-metro-toggle');if(!button)return;button.classList.toggle('active',this.playing);button.textContent=this.playing?`节拍器 · ${SightSinging.effectiveBpm()}`:'节拍器 · 关';}
});

/* 虚拟乐器：拨弦模型取代正弦波；真实采样模式明确不支持连续推弦手势。 */
AudioEngine.startExpressiveString=function(midi,instrument='guitar',volume=.16){
    if(!this.ctx||!this.masterGainNode)return null;const now=this.ctx.currentTime,rate=this.ctx.sampleRate,freq=midiToFreq(midi,Tuner.a4),seconds=instrument==='bass'?4.2:3.2,length=Math.floor(rate*seconds),delay=Math.max(2,Math.round(rate/freq)),buffer=this.ctx.createBuffer(1,length,rate),data=buffer.getChannelData(0),brightness=instrument==='bass'?.492:instrument==='ukulele'?.488:.496;
    for(let i=0;i<delay&&i<length;i++)data[i]=(Math.random()*2-1)*(1-i/delay*.18);for(let i=delay;i<length;i++)data[i]=(data[i-delay]+data[Math.min(length-1,i-delay+1)])*brightness;
    const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain(),lfo=this.ctx.createOscillator(),lfoGain=this.ctx.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=instrument==='bass'?1200:instrument==='ukulele'?4200:3100;filter.Q.value=.45;gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(volume,now+.008);gain.gain.exponentialRampToValueAtTime(volume*.48,now+.35);source.connect(filter);filter.connect(gain);gain.connect(this.masterGainNode);lfo.type='sine';lfo.frequency.value=5.3;lfoGain.gain.value=0;lfo.connect(lfoGain);lfoGain.connect(source.detune);source.start(now);lfo.start(now);let stopped=false;return {setSemitones:value=>source.playbackRate.setTargetAtTime(Math.pow(2,(Number(value)||0)/12),this.ctx.currentTime,.018),setVibrato:cents=>lfoGain.gain.setTargetAtTime(Math.max(0,Number(cents)||0),this.ctx.currentTime,.035),stop:(release=.25)=>{if(stopped)return;stopped=true;const at=this.ctx.currentTime;gain.gain.cancelScheduledValues(at);gain.gain.setValueAtTime(Math.max(.0001,gain.gain.value),at);gain.gain.exponentialRampToValueAtTime(.0001,at+release);source.stop(at+release+.04);lfo.stop(at+release+.04);}};
};
InstrumentPage.toneMode=localStorage.getItem('protuner_instrument_tone_v135')||'expressive';InstrumentPage._editTapState=new Map();
InstrumentPage.setToneMode=function(mode){this.toneMode=mode==='sample'?'sample':'expressive';if(this.instrument==='piano')this.toneMode='sample';try{localStorage.setItem('protuner_instrument_tone_v135',this.toneMode);}catch(e){}this.syncToneUI();};
InstrumentPage.syncToneUI=function(){const select=document.getElementById('instrument-tone-mode'),note=document.getElementById('instrument-tone-note'),mode=this.instrument==='piano'?'sample':this.toneMode;if(select){[...select.options].forEach(option=>{option.selected=option.value===mode;if(option.selected)option.setAttribute('selected','');else option.removeAttribute('selected');});select.disabled=this.instrument==='piano';}if(note){const sample=this.instrument==='piano'||this.toneMode==='sample';note.classList.toggle('sample',sample);note.textContent=sample?'真实采样音色：不支持推弦、揉弦与连续滑音':'物理拨弦演奏音色：支持推弦、揉弦与滑音';}};
const instrumentSetInstrumentV135=InstrumentPage.setInstrument.bind(InstrumentPage),instrumentRenderV135=InstrumentPage.render.bind(InstrumentPage);
InstrumentPage.setInstrument=function(type){instrumentSetInstrumentV135(type);if(this.instrument==='piano')this.toneMode='sample';this.syncToneUI();};
InstrumentPage.render=function(){const result=instrumentRenderV135();this.syncToneUI();return result;};
InstrumentPage.pointerDown=function(e,s,f,midi){e.preventDefault();e.currentTarget.setPointerCapture?.(e.pointerId);if(this.mutedStrings.has(s)){toast(`${this.getTuning().length-s} 弦已禁用；双击该弦恢复`,1200);return;}const horizontal=document.querySelector('#instrument-stage .virtual-fret-wrap')?.classList.contains('is-horizontal');if(this.playMode==='edit'){this.livePointers.set(e.pointerId,{s,f,midi,started:performance.now(),x:e.clientX,y:e.clientY,edit:true});return;}const sample=this.toneMode==='sample'||this.instrument==='piano';if(sample){this.playInstrumentNote(midi,.9,.22);this.livePointers.set(e.pointerId,{s,f,midi,started:performance.now(),x:e.clientX,y:e.clientY,edit:false,sample:true,technique:'真实采样拨弦'});this._showTechnique('真实采样 · 不支持推弦/揉弦/滑音');return;}const last=this._performanceLast.get(s),technique=last&&performance.now()-last.at<420?(midi>last.midi?'击弦 Hammer-on':midi<last.midi?'勾弦 Pull-off':'再次拨弦'):'拨弦',voice=AudioEngine.startExpressiveString(midi,this.instrument,.16),state={s,f,midi,startF:f,started:performance.now(),x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,horizontal,voice,technique,oscillations:0,lastPerp:0};state.vibratoTimer=setTimeout(()=>{if(!this.livePointers.has(e.pointerId))return;state.voice?.setVibrato?.(15);state.technique='揉弦 Vibrato';this._showTechnique(state.technique);},380);this.livePointers.set(e.pointerId,state);this._showTechnique(technique);};
const instrumentPointerMoveV135=InstrumentPage.pointerMove.bind(InstrumentPage);
InstrumentPage.pointerMove=function(e){const state=this.livePointers.get(e.pointerId);if(state?.sample){e.preventDefault();this._showTechnique('真实采样 · 不支持推弦/揉弦/滑音');return;}return instrumentPointerMoveV135(e);};
InstrumentPage.pointerUp=function(e,s,f,midi){const state=this.livePointers.get(e.pointerId);if(!state)return;clearTimeout(state.vibratoTimer);this.livePointers.delete(e.pointerId);if(state.edit&&Math.hypot(e.clientX-state.x,e.clientY-state.y)<14){const key=`${s}:${f}`,now=performance.now(),last=this._editTapState.get(key);if(last&&now-last.at<360){clearTimeout(last.timer);this._editTapState.delete(key);this.toggleStringMute(s);}else{const timer=setTimeout(()=>{this._editTapState.delete(key);this.toggleHeld(s,f);},270);this._editTapState.set(key,{at:now,timer});}return;}if(state.sample){this._performanceLast.set(s,{midi,at:performance.now()});return;}const elapsed=performance.now()-state.started;state.voice?.stop?.(elapsed<180?.46:.24);this._performanceLast.set(s,{midi,at:performance.now()});this._showTechnique(`${state.technique} · 已释放`);};

/* 和弦探索：未禁用且未按品位的琴弦按空弦发声并参与和弦计算；双击圆点禁用。 */
ChordExplore.activeNotes=function(notes=this.selectedNotes,disabled=this.disabledStrings){const muted=disabled instanceof Set?disabled:new Set(disabled||[]),selected=Array.isArray(notes)?notes:[],tuning=this.getTuningNotes(),opens=tuning.map(noteToMidi),result=[];for(let string=0;string<tuning.length;string++){if(muted.has(string))continue;const pressed=[...selected].reverse().find(note=>Number(note.string)===string),midi=pressed?.midi??this.effectiveMidi(opens[string],0,string);if(Number.isFinite(midi))result.push(pressed?{...pressed,midi}:{string,fret:0,midi,implicit:true});}return result;};
ChordExplore._pendingNoteTap=new Map();
ChordExplore.toggleNote=function(stringIndex,fret){const string=Number(stringIndex),key=`${string}:${Number(fret)}`,now=performance.now(),last=this._pendingNoteTap.get(key);if(this.disabledStrings.has(string)){if(last){clearTimeout(last.timer);this._pendingNoteTap.delete(key);this.toggleDisabledString(string);}else{const timer=setTimeout(()=>this._pendingNoteTap.delete(key),300);this._pendingNoteTap.set(key,{at:now,timer});}return;}if(last&&now-last.at<360){clearTimeout(last.timer);this._pendingNoteTap.delete(key);this.toggleDisabledString(string);return;}const timer=setTimeout(()=>{this._pendingNoteTap.delete(key);exploreToggle(string,Number(fret));},270);this._pendingNoteTap.set(key,{at:now,timer});};
ChordExplore.renderFretboard=function(){exploreRender();const svg=document.querySelector('#explore-fretboard svg');if(!svg)return;const groups=[...svg.querySelectorAll('g')].slice(0,this.getTuningNotes().length);groups.forEach((group,string)=>{if(this.disabledStrings.has(string)){group.querySelector('text')?.replaceChildren(document.createTextNode('×'));group.setAttribute('opacity','.42');}});};
ChordExplore.strum=function(direction='down',muted=false){const notes=this.activeNotes().sort((a,b)=>direction==='up'?b.string-a.string:a.string-b.string);if(!notes.length){toast('所有琴弦都已禁用');return;}notes.forEach((note,index)=>setTimeout(()=>muted?AudioEngine.playMutedString(note.string,null,.58):AudioEngine.playInstrument(note.midi,.82,.18,'explore'),index*42));};
ChordExplore.updateGuess=function(){const display=document.getElementById('chord-guess-list'),notes=this.activeNotes();if(!display)return;if(notes.length<2){this.lastGuesses=[];display.innerHTML='<span><strong>和弦识别显示屏</strong><small>未禁用琴弦默认为空弦发声；双击圆点才禁用整弦</small></span><span class="guess-open">展开 ›</span>';return;}this.lastGuesses=MusicTheory.guessChordsMidi(notes.map(note=>note.midi));const best=this.lastGuesses[0];display.innerHTML=best?`<span><strong>${best.name}</strong><small>${best.inversionLabel} · ${Math.min(100,best.score)}% · ${best.chordPCs.map(enharmonic).join(' ')} · ${notes.filter(n=>n.implicit).length} 根空弦</small></span><span class="guess-open">查看 ${this.lastGuesses.length} 项 ›</span>`:'<span><strong>暂未匹配</strong><small>可继续按品位或双击禁弦</small></span><span class="guess-open">展开 ›</span>';};

/* 安装入口：能一键安装就调用浏览器原生提示，否则给出对应平台的最短操作指引。 */
const PWAInstall={
    deferred:null,ios:false,button:null,hint:null,
    init(){
        if(this.initialized)return;this.initialized=true;
        this.button=document.getElementById('start-install-btn');this.hint=document.getElementById('start-install-hint');
        if(!this.button)return;
        const standalone=!!(navigator.standalone||window.matchMedia?.('(display-mode: standalone)').matches);
        if(standalone){this.button.hidden=true;return;}
        this.ios=/iphone|ipad|ipod/i.test(navigator.userAgent||'')&&!/crios|fxios/i.test(navigator.userAgent||'');
        this.button.hidden=false;this.button.textContent=this.ios?'查看添加方法':'添加到桌面';
        addEventListener('beforeinstallprompt',event=>{event.preventDefault();this.deferred=event;this.button.hidden=false;this.button.textContent='添加到桌面';this.hint.hidden=true;},{once:false});
        addEventListener('appinstalled',()=>{this.deferred=null;this.button.hidden=true;this.showHint('已添加到桌面，可从桌面直接打开。');});
        if(location.protocol==='file:')this.showHint('本地单文件不能安装；请从 HTTPS 正式网址打开。');
    },
    showHint(text){if(this.hint){this.hint.textContent=text;this.hint.hidden=false;}},
    async open(){
        if(this.deferred){const event=this.deferred;this.deferred=null;try{await event.prompt();const choice=await event.userChoice;if(choice?.outcome==='accepted'){this.button.hidden=true;this.showHint('正在完成安装，请稍候。');}else this.showHint('安装未完成，可稍后再次点击。');}catch(error){this.showHint('浏览器暂时无法安装，请使用浏览器菜单添加。');}return;}
        if(this.ios){this.showHint('iPhone：点击 Safari 的“分享”，再选择“添加到主屏幕”。');return;}
        if(location.protocol==='file:'){this.showHint('本地单文件不能安装；请从 HTTPS 正式网址打开。');return;}
        this.showHint('请打开浏览器菜单，选择“安装音乐工具箱 Ultra”或“添加到桌面”。');
    }
};
window.PWAInstall=PWAInstall;

/* PWA 更新：启动页先自检，失败或离线都不阻塞“进入应用”；新缓存完整后才允许切换。 */
const PWAUpdate={
    registration:null,initPromise:null,remoteVersion:V13_VERSION,_messageBound:false,_controllerBound:false,
    _node(id){return document.getElementById(id);},
    _withTimeout(promise,ms,label){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(`${label} timeout`)),ms);Promise.resolve(promise).then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});},
    setState(state,title,detail,progress=100,action=false){
        const card=this._node('start-update-check'),status=this._node('start-update-status'),info=this._node('start-update-detail'),bar=this._node('start-update-progress'),wrap=bar?.parentElement,button=this._node('start-update-action'),version=this._node('start-update-version');
        if(card)card.dataset.state=state;if(status)status.textContent=title;if(info)info.textContent=detail;if(version)version.textContent=`v${this.remoteVersion||V13_VERSION}`;
        const value=Math.max(0,Math.min(100,Number(progress)||0));if(bar)bar.style.width=value+'%';if(wrap)wrap.setAttribute('aria-valuenow',String(Math.round(value)));if(button)button.classList.toggle('show',!!action);
    },
    setProgress(done,total){const ratio=total?Math.round(done/total*100):38;this.setState('downloading','发现新版 · 正在准备本地素材',`离线素材 ${done}/${total}；准备完成后可选择更新。`,Math.max(38,ratio),false);},
    dismiss(){document.getElementById('pwa-update')?.classList.remove('show');if(this.registration?.waiting)this.setState('ready','发现新版 · 已准备完成','可直接进入当前版本，稍后也能在提示中更新。',100,true);},
    show(){this.setState('ready','发现新版 · 已准备完成','新版离线素材已完整下载；更新为可选操作，不影响进入。',100,true);document.getElementById('pwa-update')?.classList.add('show');},
    apply(){
        if(this.registration?.waiting){this.setState('applying','正在更新本地素材','正在安全切换到新版本，请稍候…',100,false);try{sessionStorage.setItem('music-toolbox-ultra-reload','1');}catch(e){}this.registration.waiting.postMessage({type:'SKIP_WAITING'});return;}
        if(this.registration?.installing){this.setState('downloading','正在准备新版','素材尚未下载完整，完成后按钮会自动出现。',72,false);return;}
        this.setState('checking','重新检查更新','正在重新核对版本与离线素材…',24,false);this.initPromise=null;this.init();
    },
    _watch(worker){
        if(!worker||worker.__xingxianWatched)return;worker.__xingxianWatched=true;
        if(navigator.serviceWorker.controller)this.setState('downloading','发现新版 · 正在准备本地素材','后台下载完整后才会提供更新按钮。',42,false);else this.setState('downloading','首次离线准备中','正在缓存应用与本地素材；仍可直接进入。',28,false);
        worker.addEventListener('statechange',()=>{
            if(worker.state==='installed'){if(navigator.serviceWorker.controller)this.show();else{this.setState('latest','离线素材已准备','当前版本已完整缓存，可以离线使用。',100,false);toast('应用已缓存，可离线使用',2600);}}
            if(worker.state==='redundant'&&!this.registration?.waiting)this.setState('error','更新未完成 · 保留当前版本','新版素材未完整通过自检，当前离线版本未受影响。',100,false);
        });
    },
    async _run(){
        this.setState('checking','检查更新 · 自检中','正在核对离线素材与版本信息；可直接进入，不必等待。',12,false);
        const protocol=globalThis.location?.protocol||'file:';
        if(protocol==='file:'||!('serviceWorker'in navigator)){this.setState('local','本地文件模式 · 使用当前版本','直接打开文件时可使用主要功能；安装、离线缓存与在线更新需 HTTPS。',100,false);return;}
        if(navigator.onLine===false){this.setState('offline','无网络 · 使用当前版本','更新检查已跳过，正在使用设备里现有的完整离线版本。',100,false);return;}
        try{
            const base=new URL('./',document.baseURI),serviceWorkerUrl=new URL('sw.js',base),versionUrl=new URL('version.json',base);document.documentElement.dataset.updateBase=base.pathname;
            this.registration=await this._withTimeout(navigator.serviceWorker.register(serviceWorkerUrl.href,{scope:base.href,updateViaCache:'none'}),5500,'service worker register');
            if(!this._messageBound){this._messageBound=true;navigator.serviceWorker.addEventListener('message',event=>{const data=event.data||{};if(data.type==='CACHE_PROGRESS')this.setProgress(data.done,data.total);if(data.type==='CACHE_READY'&&navigator.serviceWorker.controller&&this.registration?.waiting)this.show();if(data.type==='CACHE_ERROR')this.setState('error','更新未完成 · 保留当前版本','新版素材下载或校验失败，当前离线版本仍可正常进入。',100,false);});}
            if(!this._controllerBound){this._controllerBound=true;navigator.serviceWorker.addEventListener('controllerchange',()=>{let reload=false;try{reload=sessionStorage.getItem('music-toolbox-ultra-reload')==='1'||sessionStorage.getItem('xingxian-reload')==='1';if(reload){sessionStorage.removeItem('music-toolbox-ultra-reload');sessionStorage.removeItem('xingxian-reload');}}catch(e){}if(reload)location.reload();});}
            if(this.registration.waiting){this.show();return;}
            this._watch(this.registration.installing);this.registration.addEventListener('updatefound',()=>this._watch(this.registration.installing));
            const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),4200);let info;
            try{versionUrl.searchParams.set('t',String(Date.now()));const response=await fetch(versionUrl.href,{cache:'no-store',signal:controller.signal,headers:{'cache-control':'no-cache'}});if(!response.ok)throw new Error('version '+response.status);info=await response.json();}finally{clearTimeout(timeout);}
            this.remoteVersion=info.version||V13_VERSION;document.documentElement.dataset.availableVersion=this.remoteVersion;const changed=this.remoteVersion!==V13_VERSION;
            if(changed)this.setState('downloading',`发现新版 v${this.remoteVersion}`,'正在后台准备完整离线素材；准备完毕后可选择更新。',38,false);else if(!this.registration.installing)this.setState('latest','已是最新版本',`v${V13_VERSION} · 离线素材自检通过。`,100,false);
            await this._withTimeout(this.registration.update(),5500,'service worker update');if(this.registration.waiting)this.show();else if(this.registration.installing)this._watch(this.registration.installing);else if(changed)this.setState('error','云端版本未完整发布 · 使用当前版本','version.json 已变化，但未检测到对应的新离线包。请确认已同时上传 sw.js 与全部素材；进入按钮不受影响。',100,false);else this.setState('latest','已是最新版本',`v${V13_VERSION} · 离线素材自检通过。`,100,false);
        }catch(error){const offline=navigator.onLine===false||error?.name==='AbortError'||error instanceof TypeError;this.setState(offline?'offline':'error',offline?'无网络 · 使用当前版本':'检查失败 · 使用当前版本',offline?'未连接到更新服务，已自动使用设备里的完整离线版本。':'版本自检暂时失败，不影响进入和当前离线素材。',100,false);console.warn('PWA 自检失败',error);}
    },
    init(){if(!this.initPromise)this.initPromise=this._run();return this.initPromise;}
};
window.PWAUpdate=PWAUpdate;

/* 在原初始化之后启用 v13 功能。 */
const appGoPageV134=App.goPage.bind(App);
App.goPage=function(name,navItem){if(name!=='practice')SightMetronome.stop();return appGoPageV134(name,navItem);};
const appInit=App.init.bind(App);
App.init=async function(){try{await appInit();}catch(error){console.error('基础模块初始化失败',error);}finally{SightSinging.init();PWAInstall.init();PWAUpdate.init();AudioEngine.prepareMutedC01();document.documentElement.dataset.appVersion=V13_VERSION;document.documentElement.dataset.coreReady='true';}};
const startUpdateCheck=()=>{if(/^https?:$/.test(location.protocol)){const url=new URL(location.href);if(url.searchParams.has('reset')){url.searchParams.delete('reset');history.replaceState(null,'',url.href);}}PWAInstall.init();PWAUpdate.init();};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startUpdateCheck,{once:true});else queueMicrotask(startUpdateCheck);
})();


/* 音乐工具箱 Ultra 最终功能模块。 */
(() => {
'use strict';

const RELEASE_VERSION='13.5.13';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const pageIsActive=name=>document.getElementById(`page-${name}`)?.classList.contains('active');
const selectValue=(select,value)=>{if(!select)return;[...select.options].forEach(option=>{option.selected=String(option.value)===String(value);});};

/* ---------- 页面互斥与导航回归保护 ---------- */
const originalGoPage=App.goPage.bind(App);
App.goPage=function(name,navItem){
    originalGoPage(name,navItem);
    requestAnimationFrame(()=>{
        const active=[...document.querySelectorAll('.page.active')];
        if(active.length===1)return;
        document.querySelectorAll('.page').forEach(page=>page.classList.toggle('active',page.id===`page-${name}`));
    });
};

/* ---------- 节拍器：BPM 永远表示每分钟主拍数 ----------
   2/2 的 120 = 每分钟 120 个二分音符主拍。分组只决定重音，不再把拍速除半。 */
Object.assign(Metro.signatures,{
    '3/8':{pulses:3,label:'3 个八分音符主拍'},
    '9/8':{pulses:9,label:'9 个八分音符主拍'},
    '12/8':{pulses:12,label:'12 个八分音符主拍'}
});
Metro._numerator=function(signature=this.signature){return Math.max(1,Number(String(signature).split('/')[0])||4);};
Metro._groupStarts=function(signature=this.signature){
    const grouping=this._grouping?.(signature),starts=new Set([0]);
    if(!grouping)return starts;
    let cursor=0;grouping.split('+').map(Number).forEach(length=>{cursor+=length;if(cursor<this._numerator(signature))starts.add(cursor);});
    return starts;
};
Metro._groupLengths=function(signature=this.signature){return Array(this._numerator(signature)).fill(1);};
Metro._beatDuration=function(){return 60/Math.max(30,this.bpm);};
Metro._accentPattern=function(){
    const count=this._numerator(),pattern=Array(count).fill(this.accentMode==='flat'?1:.58);
    if(this.accentMode==='flat')return pattern;
    pattern[0]=1;
    if(this.signature==='4/4')pattern[2]=.78;
    else for(const start of this._groupStarts())if(start>0)pattern[start]=.78;
    return pattern;
};
Metro._stepsFor=function(){
    const resolution=String(this.gridResolution),denominator=Math.max(1,Number(String(this.signature).split('/')[1])||4),count=this._numerator();
    const perBeat=resolution.includes('T')?Math.max(1,Math.round((resolution==='8T'?3:6)*4/denominator)):Math.max(1,Math.round(Number(resolution)*1/denominator));
    return Array(count).fill(perBeat);
};
const metroInitV1351=Metro.init.bind(Metro);
Metro.init=function(){
    metroInitV1351();
    this.ts=this._numerator(this.signature);
    this.custom.pattern=this.custom.patterns[this._patternKey()]||this._defaultPattern();
    this.renderDots();this.renderGroupingControls();this.renderCustomUI();this.updateAccentGuide();
};
Metro.renderGroupingControls=function(){
    const row=document.getElementById('metro-grouping-row'),options=this.groupingOptions[this.signature];if(!row)return;
    if(!options){row.innerHTML='';row.classList.remove('show');return;}
    const current=options.includes(this._grouping())?this._grouping():options[0];this.meterGroupings[this.signature]=current;
    row.innerHTML=`<label class="metro-field"><span>${escapeHtml(this.signature)} 分组</span><select id="metro-grouping-select" onchange="Metro.setGrouping('${escapeHtml(this.signature)}',this.value)">${options.map(value=>`<option value="${value}" ${value===current?'selected':''}>${value}</option>`).join('')}</select></label><small>分组只决定次强位置；每个分母拍仍按当前 BPM 发声。</small>`;
    row.classList.add('show');
};
Metro.setTs=function(value){
    const legacy={'2':'2/4','3':'3/4','4':'4/4','5':'5/4','6':'6/8','7':'7/8'},next=this.signatures[value]?value:(legacy[String(value)]||'4/4');
    this.custom.patterns[this._patternKey()]=this.custom.pattern||[];
    this.signature=next;this.ts=this._numerator(next);
    this.custom.pattern=this.custom.patterns[this._patternKey()]||this._defaultPattern();
    selectValue(document.getElementById('metro-ts-select'),next);
    this.renderDots();this.renderGroupingControls();this.renderCustomUI();this.updateAccentGuide();this.saveCustom();
    if(this.playing){this.stop();this.start();}
};
Metro.setGrouping=function(signature,value){
    const key=String(signature).includes('/')?String(signature):signature==='5'?'5/4':signature==='6'?'6/8':signature==='7'?'7/8':this.signature,options=this.groupingOptions[key]||[];
    if(!options.includes(value))return;
    this.meterGroupings[key]=value;if(key==='5/4')this.grouping5=value;if(key==='6/8')this.grouping6=value;if(key==='7/8')this.grouping7=value;
    try{localStorage.setItem('protuner_metro_groupings_v135',JSON.stringify(this.meterGroupings));}catch(error){}
    if(key===this.signature)this.ts=this._numerator(key);
    this.custom.pattern=this.custom.patterns[this._patternKey()]||this._defaultPattern();
    this.renderDots();this.renderGroupingControls();this.renderCustomUI();this.updateAccentGuide();this.saveCustom();
    if(this.playing){this.stop();this.start();}
};

/* ---------- 共用自定义调弦编辑器：显示同音异名，内部只存一个音高 ---------- */
const NOTE_CHOICES=[
    ['C','C'],['C#','C♯／D♭'],['D','D'],['D#','D♯／E♭'],['E','E'],['F','F'],
    ['F#','F♯／G♭'],['G','G'],['G#','G♯／A♭'],['A','A'],['A#','A♯／B♭'],['B','B']
];
const FLAT_TO_SHARP={'Db':'C#','Eb':'D#','Gb':'F#','Ab':'G#','Bb':'A#'};
const normalizePitchClass=value=>{
    const normalized=String(value??'').replace('♯','#').replace('♭','b');
    return FLAT_TO_SHARP[normalized]||normalized;
};
const CustomTuningEditor={
    target:'tuner',count:6,
    source(target){
        if(target==='tuner')return Tuner.customTuning||SharedCustomTuning.load(Tuner.targetStrings?.map(item=>item.name))||['E2','A2','D3','G3','B3','E4'];
        if(target==='chord')return ChordLib.customTuning||SharedCustomTuning.load(ChordLib.getTuningNotes())||ChordLib.getTuningNotes();
        if(target==='explore')return ChordExplore.customTuning||SharedCustomTuning.load(ChordExplore.getTuningNotes())||ChordExplore.getTuningNotes();
        return InstrumentPage.customTuning||SharedCustomTuning.load(InstrumentPage.getTuning())||InstrumentPage.getTuning();
    },
    open(target='tuner',forceCount=null){
        this.target=target;document.getElementById('release-custom-tuning-modal')?.remove();
        const source=this.source(target),count=forceCount?clamp(forceCount,4,8):(source.length||6);this.count=count;
        const rows=Array.from({length:count},(_,index)=>{
            const match=String(source[index]||'E2').match(/^([A-G](?:#|b|♯|♭)?)(-?\d+)$/),pitch=normalizePitchClass(match?.[1]||'E'),octave=match?.[2]||'2';
            return `<label class="custom-tuning-row"><strong>${count-index} 弦</strong><select id="release-tuning-note-${index}">${NOTE_CHOICES.map(([value,label])=>`<option value="${value}" ${value===pitch?'selected':''}>${label}</option>`).join('')}</select><select id="release-tuning-octave-${index}">${[0,1,2,3,4,5,6].map(value=>`<option value="${value}" ${String(value)===String(octave)?'selected':''}>${value} 组</option>`).join('')}</select></label>`;
        }).join('');
        const modal=document.createElement('div');modal.id='release-custom-tuning-modal';modal.className='practice-modal release-modal';
        modal.innerHTML=`<div class="practice-modal-card"><h3>自定义调弦</h3><p class="release-modal-note">升降同音名合并显示；例如 C♯／D♭ 只保存一个实际音高，不会重复计算。</p><label class="release-form-row"><span>弦数</span><select onchange="CustomTuningEditor.open('${target}',this.value)">${[4,5,6,7,8].map(value=>`<option value="${value}" ${value===count?'selected':''}>${value} 弦</option>`).join('')}</select></label><div class="custom-tuning-rows">${rows}</div><div class="release-actions"><button onclick="CustomTuningEditor.close()">取消</button><button class="primary" onclick="CustomTuningEditor.apply()">保存调弦</button></div></div>`;
        document.body.appendChild(modal);
    },
    close(){document.getElementById('release-custom-tuning-modal')?.remove();},
    apply(){
        const notes=Array.from({length:this.count},(_,index)=>`${document.getElementById(`release-tuning-note-${index}`).value}${document.getElementById(`release-tuning-octave-${index}`).value}`),target=this.target;
        SharedCustomTuning.save(notes);this.close();
        if(target==='tuner'){
            Tuner.customTuning=notes;Tuner.customStringCount=notes.length;Tuner.setPreset('__custom__');Tuner.loadPresets();document.getElementById('tuning-panel')?.classList.remove('open');document.getElementById('tuning-bar')?.classList.remove('open');
        }else if(target==='chord'){
            ChordLib.customTuning=notes;ChordLib.customStringCount=notes.length;ChordLib.tuningName='__custom__';ChordLib.spider=CapoEngine.ensure(ChordLib.spider,notes.length);ChordLib.generate();ChordLib.renderTuningVisual();
        }else if(target==='explore'){
            ChordExplore.customTuning=notes;ChordExplore.customStringCount=notes.length;ChordExplore.tuningName='__custom__';ChordExplore.spider=CapoEngine.ensure(ChordExplore.spider,notes.length);ChordExplore.selectedNotes=[];ChordExplore.renderTuningVisual();ChordExplore.renderFretboard();ChordExplore.updateGuess();ChordExplore.closeTuningPicker();
        }else{
            InstrumentPage.customTuning=notes;InstrumentPage.customStringCount=notes.length;InstrumentPage.tuningName='__custom__';InstrumentPage.heldFrets={};InstrumentPage.mutedStrings=new Set();InstrumentPage.resetChordLabel();InstrumentPage.renderTuningVisual();InstrumentPage.closeTuningPicker();InstrumentPage.render();
        }
        GlobalCapo.ensure(notes.length);GlobalCapo.apply(false);toast(`自定义调弦：${notes.join(' ')}`);
    }
};
window.CustomTuningEditor=CustomTuningEditor;
Tuner.showCustomTuningDialog=count=>CustomTuningEditor.open('tuner',count);
ChordLib.showCustomTuningDialog=count=>CustomTuningEditor.open('chord',count);
ChordLib.changeCustomStringCount=count=>CustomTuningEditor.open('chord',count);
ChordExplore.showCustomTuningDialog=count=>CustomTuningEditor.open('explore',count);
InstrumentPage.showCustomTuningDialog=count=>CustomTuningEditor.open('instrument',count);

/* ---------- 调音器／和弦／探索全局同步变调夹（含蜘蛛变调夹） ---------- */
const GlobalCapo={
    mode:'none',fret:0,spider:[],context:'tuner',
    load(){try{const saved=JSON.parse(localStorage.getItem('music_toolbox_global_capo_v1351'));if(saved){this.mode=['full','spider'].includes(saved.mode)?saved.mode:'none';this.fret=clamp(saved.fret,0,12);this.spider=Array.isArray(saved.spider)?saved.spider:[];}}catch(error){}},
    save(){try{localStorage.setItem('music_toolbox_global_capo_v1351',JSON.stringify({mode:this.mode,fret:this.fret,spider:this.spider}));}catch(error){}},
    ensure(count){this.spider=CapoEngine.ensure(this.spider,count);return this.spider;},
    notes(context=this.context){
        if(context==='tuner')return Tuner.customTuning||(TUNINGS[Tuner.presetName]?.notes)||[];
        if(context==='chord')return ChordLib.getTuningNotes();
        return ChordExplore.getTuningNotes();
    },
    description(){if(this.mode==='full')return `全夹 ${Math.max(1,this.fret)}品`;if(this.mode==='spider')return `蜘蛛 ${this.spider.filter(item=>item?.mode&&item.mode!=='off').length}弦`;return '无夹';},
    renderHeaders(){
        ['tuner-capo-button','chord-capo-button','explore-capo-button'].forEach(id=>{const button=document.getElementById(id);if(!button)return;button.textContent=this.description();button.classList.toggle('active',this.mode!=='none');button.setAttribute('aria-label',`变调夹：${this.description()}`);});
        const pairs=[['chord-capo-mode',this.mode],['capo-mode-sel',this.mode],['chord-capo-fret',String(this.fret)],['capo-sel',String(this.fret)]];pairs.forEach(([id,value])=>selectValue(document.getElementById(id),value));
    },
    apply(render=true){
        this.ensure(Math.max(8,Tuner.targetStrings?.length||0,ChordLib.getTuningNotes?.().length||0,ChordExplore.getTuningNotes?.().length||0));
        Tuner.capoMode=this.mode;Tuner.capoFret=this.fret;Tuner.spider=this.spider;Tuner.renderStrings?.();
        ChordLib.capoMode=this.mode;ChordLib.capoFret=this.fret;ChordLib.spider=CapoEngine.ensure(this.spider,ChordLib.getTuningNotes().length);
        ChordExplore.capoMode=this.mode;ChordExplore.capoFret=this.fret;ChordExplore.spider=CapoEngine.ensure(this.spider,ChordExplore.getTuningNotes().length);
        this.renderHeaders();this.save();
        if(!render)return;
        if(pageIsActive('chord')){
            if(document.getElementById('chord-lookup-page')?.classList.contains('active'))ChordLib.generate();
            else if(ChordExplore.initialized){ChordExplore.selectedNotes=[];ChordExplore.renderFretboard();ChordExplore.updateGuess();}
        }
    },
    setMode(mode,context=this.context){this.context=context;this.mode=['full','spider'].includes(mode)?mode:'none';if(this.mode==='full'&&this.fret===0)this.fret=1;this.apply();},
    setFret(value){this.fret=clamp(value,0,12);if(this.mode==='full'&&this.fret===0)this.mode='none';this.apply();},
    setSpiderMode(index,mode){const notes=this.notes(),spider=this.ensure(notes.length);spider[index].mode=['press','harmonic'].includes(mode)?mode:'off';if(spider[index].mode==='harmonic'&&!CapoEngine.harmonicOffsets[spider[index].fret])spider[index].fret=12;this.apply();},
    setSpiderFret(index,value){const spider=this.ensure(this.notes().length);spider[index].fret=Math.max(1,Number(value)||12);this.apply();},
    open(context='tuner'){
        this.context=context;document.getElementById('global-capo-modal')?.remove();const notes=this.notes(context),spider=this.ensure(notes.length),modal=document.createElement('div');modal.id='global-capo-modal';modal.className='practice-modal release-modal';
        const modeLabel=context==='tuner'?'调音器与和弦共用':context==='chord'?'和弦查询与调音器共用':'和弦探索与调音器共用';
        const spiderRows=this.mode==='spider'?`<div class="capo-spider-list">${spider.slice(0,notes.length).map((item,index)=>`<label class="release-form-row"><span>${notes.length-index}弦</span><select onchange="GlobalCapo.setSpiderMode(${index},this.value);GlobalCapo.open('${context}')"><option value="off" ${item.mode==='off'?'selected':''}>关闭</option><option value="press" ${item.mode==='press'?'selected':''}>按弦</option><option value="harmonic" ${item.mode==='harmonic'?'selected':''}>泛音</option></select><select onchange="GlobalCapo.setSpiderFret(${index},this.value)">${(item.mode==='harmonic'?[5,7,12,19,24]:Array.from({length:24},(_,i)=>i+1)).map(fret=>`<option value="${fret}" ${Number(item.fret)===fret?'selected':''}>${fret} 品</option>`).join('')}</select></label>`).join('')}</div>`:'';
        modal.innerHTML=`<div class="practice-modal-card"><h3>变调夹 · 全局同步</h3><p class="release-modal-note">${modeLabel}。调音器会显示“基础弦音 → 实际发声音”；蜘蛛变调夹可逐弦关闭、按弦或设为节点泛音。</p><label class="release-form-row"><span>模式</span><select onchange="GlobalCapo.setMode(this.value,'${context}');GlobalCapo.open('${context}')"><option value="none" ${this.mode==='none'?'selected':''}>无变调夹</option><option value="full" ${this.mode==='full'?'selected':''}>全变调夹</option><option value="spider" ${this.mode==='spider'?'selected':''}>蜘蛛变调夹</option></select></label>${this.mode==='full'?`<label class="release-form-row"><span>夹位</span><select onchange="GlobalCapo.setFret(this.value)">${Array.from({length:12},(_,i)=>i+1).map(fret=>`<option value="${fret}" ${this.fret===fret?'selected':''}>第 ${fret} 品</option>`).join('')}</select></label>`:''}${spiderRows}<div class="release-actions"><button onclick="document.getElementById('global-capo-modal').remove()">关闭</button><button class="primary" onclick="GlobalCapo.preview()">试听当前弦音</button></div></div>`;
        document.body.appendChild(modal);
    },
    preview(){const notes=this.notes(this.context).map(noteToMidi),actual=notes.map((midi,index)=>this.actualOpenMidi(midi,index)).filter(Number.isFinite);actual.forEach((midi,index)=>setTimeout(()=>AudioEngine.playInstrument(midi,.7,.18,'tuner'),index*85));},
    actualOpenMidi(baseMidi,index){if(this.mode==='full')return baseMidi+Math.max(1,this.fret);if(this.mode==='spider'){const item=this.spider[index]||{mode:'off',fret:12};if(item.mode==='press')return baseMidi+(Number(item.fret)||12);if(item.mode==='harmonic')return baseMidi+(CapoEngine.harmonicOffsets[item.fret]||12);}return baseMidi;}
};
GlobalCapo.load();window.GlobalCapo=GlobalCapo;

/* 调音器始终从基础调弦重新计算，避免反复升高。 */
Tuner.renderStrings=function(){
    const container=document.getElementById('strings-container');if(!container)return;container.innerHTML='';
    if(this.presetName==='__chrom__'){this.targetStrings=[];container.innerHTML='<span style="color:var(--text-sub);font-size:13px">半音阶模式 — 自动识别所有音符</span>';return;}
    const baseNotes=this.customTuning||(TUNINGS[this.presetName]?.notes)||[];GlobalCapo.ensure(baseNotes.length);
    this.targetStrings=baseNotes.map((baseName,index)=>{const baseMidi=noteToMidi(baseName),midi=GlobalCapo.actualOpenMidi(baseMidi,index);return {name:midiToName(midi),baseName,midi,freq:midiToFreq(midi,this.a4)};});
    this.targetStrings.forEach((string,index)=>{
        const button=document.createElement('button'),stringNumber=this.targetStrings.length-index,same=string.midi===noteToMidi(string.baseName);button.className='s-btn';
        button.innerHTML=`<span class="string-index">${stringNumber}弦</span><span><span class="string-full">${same?fullNoteLabel(string.baseName):`${fullNoteLabel(string.baseName)} → ${fullNoteLabel(string.name)}`}</span><br><span class="string-meta">${this.lockedString===index?'已锁定目标音':same?'点击试听并锁定':GlobalCapo.description()}</span></span><span class="string-hz">${string.freq.toFixed(1)} Hz</span>`;
        button.title=string.name;button.setAttribute('aria-label',`${stringNumber}弦 ${fullNoteLabel(string.baseName)} 实际 ${fullNoteLabel(string.name)} ${string.freq.toFixed(1)}赫兹`);
        button.onclick=()=>{this.lockedString=this.lockedString===index?-1:index;if(this.lockedString===index)AudioEngine.playInstrumentOnce(string.midi,.78,.26,'tuner',`string-${index}`);this.renderStrings();};
        if(this.lockedString===index)button.classList.add('locked');if(this.confirmedStringIdx===index)button.classList.add('active');container.appendChild(button);
    });
};

/* 所有旧入口都只修改全局状态；实际重绘由当前可见页面完成。 */
ChordLib.setCapoMode=mode=>GlobalCapo.setMode(mode,'chord');
ChordLib.setCapoFret=fret=>GlobalCapo.setFret(fret);
ChordLib.setSpiderMode=(index,mode)=>GlobalCapo.setSpiderMode(index,mode);
ChordLib.setSpiderFret=(index,fret)=>GlobalCapo.setSpiderFret(index,fret);
ChordExplore.setCapoMode=mode=>GlobalCapo.setMode(mode,'explore');
ChordExplore.setCapo=fret=>GlobalCapo.setFret(fret);
ChordExplore.setSpiderMode=(index,mode)=>GlobalCapo.setSpiderMode(index,mode);
ChordExplore.setSpiderFret=(index,fret)=>GlobalCapo.setSpiderFret(index,fret);

/* ---------- 虚拟乐器音色与三种离线制音 ---------- */
const InstrumentTone={
    muteStyle:'natural',muteVolume:.72,highCut:true,
    load(){try{const saved=JSON.parse(localStorage.getItem('music_toolbox_instrument_tone_v1351'));if(saved){this.muteStyle=['natural','warm','dry'].includes(saved.muteStyle)?saved.muteStyle:'natural';this.muteVolume=clamp(saved.muteVolume??.72,.15,1);this.highCut=saved.highCut!==false;}}catch(error){}},
    save(){try{localStorage.setItem('music_toolbox_instrument_tone_v1351',JSON.stringify({muteStyle:this.muteStyle,muteVolume:this.muteVolume,highCut:this.highCut}));}catch(error){}},
    label(){return ({natural:'自然扫弦',warm:'温暖低频',dry:'干燥木质'})[this.muteStyle]||'自然扫弦';},
    open(){
        document.getElementById('instrument-tone-modal')?.remove();const piano=InstrumentPage.instrument==='piano',mode=piano?'sample':InstrumentPage.toneMode||'expressive',modal=document.createElement('div');modal.id='instrument-tone-modal';modal.className='practice-modal release-modal';
        modal.innerHTML=`<div class="practice-modal-card"><h3>虚拟乐器音色</h3><p class="release-modal-note">真实采样适合自然音头，但不支持连续推弦、揉弦与滑音；演奏音色支持手势。三种制音全部离线，其中后两种由本地 Web Audio 合成。</p><label class="release-form-row"><span>演奏音色</span><select ${piano?'disabled':''} onchange="InstrumentTone.setPlayTone(this.value)"><option value="expressive" ${mode==='expressive'?'selected':''}>演奏音色 · 支持手势</option><option value="sample" ${mode==='sample'?'selected':''}>真实采样 · 不支持推弦</option></select></label><label class="release-form-row"><span>制音音色</span><select onchange="InstrumentTone.setMuteStyle(this.value)"><option value="natural" ${this.muteStyle==='natural'?'selected':''}>C01 自然扫弦制音</option><option value="warm" ${this.muteStyle==='warm'?'selected':''}>温暖低频制音</option><option value="dry" ${this.muteStyle==='dry'?'selected':''}>干燥木质制音</option></select></label><label class="release-form-row"><span>制音音量</span><span style="display:grid;grid-template-columns:minmax(0,1fr) 42px;gap:6px;align-items:center"><input type="range" min="15" max="100" value="${Math.round(this.muteVolume*100)}" oninput="InstrumentTone.setMuteVolume(this.value);this.nextElementSibling.textContent=this.value+'%'"><output>${Math.round(this.muteVolume*100)}%</output></span></label><label class="release-form-row"><span>高音抑制</span><span class="release-switch"><small style="color:var(--text-sub)">${this.highCut?'已开启':'已关闭'}</small><input type="checkbox" ${this.highCut?'checked':''} onchange="InstrumentTone.setHighCut(this.checked);this.previousElementSibling.textContent=this.checked?'已开启':'已关闭'"></span></label><div class="release-actions"><button onclick="document.getElementById('instrument-tone-modal').remove()">完成</button><button class="primary" onclick="InstrumentTone.preview()">试听制音</button></div></div>`;
        document.body.appendChild(modal);
    },
    setPlayTone(mode){InstrumentPage.setToneMode(mode);},
    setMuteStyle(style){this.muteStyle=['natural','warm','dry'].includes(style)?style:'natural';this.save();this.syncButton();this.preview();},
    setMuteVolume(value){this.muteVolume=clamp(Number(value)/100,.15,1);this.save();},
    setHighCut(enabled){this.highCut=!!enabled;this.save();},
    syncButton(){const button=document.getElementById('instrument-tone-open');if(button)button.textContent='音色';},
    async preview(){if(!AudioEngine.ctx)await AudioEngine.init();for(let string=0;string<6;string++)setTimeout(()=>AudioEngine.playMutedString(string,null,.72),string*48);}
};
InstrumentTone.load();window.InstrumentTone=InstrumentTone;

AudioEngine._releaseMutedNoise=function(kind){
    const key=`_releaseMutedNoise_${kind}`;if(this[key])return this[key];const seconds=kind==='warm'?.26:.13,length=Math.floor(this.ctx.sampleRate*seconds),buffer=this.ctx.createBuffer(1,length,this.ctx.sampleRate),data=buffer.getChannelData(0);let low=0;
    for(let index=0;index<length;index++){const phase=index/length,white=Math.random()*2-1;low+=.07*(white-low);data[index]=(kind==='warm'?low*.88+white*.12:white*.72+low*.28)*Math.pow(1-phase,kind==='warm'?2.5:4.2);}this[key]=buffer;return buffer;
};
AudioEngine._playReleaseSyntheticMute=function(stringIndex,time,intensity,kind){
    const when=Math.max(time??this.ctx.currentTime,this.ctx.currentTime),source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain(),level=(kind==='warm'?.12:.095)*InstrumentTone.muteVolume*clamp(intensity,.35,1);source.buffer=this._releaseMutedNoise(kind);source.playbackRate.value=.94+Math.random()*.12;
    filter.type=kind==='warm'?'lowpass':'bandpass';filter.frequency.value=kind==='warm'?(InstrumentTone.highCut?620:1050):(InstrumentTone.highCut?920:1700);filter.Q.value=kind==='warm'?.55:1.15;
    gain.gain.setValueAtTime(.0001,when);gain.gain.linearRampToValueAtTime(level,when+.004);gain.gain.exponentialRampToValueAtTime(.0001,when+(kind==='warm'?.25:.13));source.connect(filter);filter.connect(gain);gain.connect(this.masterGainNode);source.start(when);source.stop(when+(kind==='warm'?.28:.16));
    if(kind==='warm'){const thump=this.ctx.createOscillator(),thumpGain=this.ctx.createGain();thump.type='triangle';thump.frequency.setValueAtTime(112-stringIndex*3,when);thump.frequency.exponentialRampToValueAtTime(67,when+.09);thumpGain.gain.setValueAtTime(.0001,when);thumpGain.gain.exponentialRampToValueAtTime(level*.38,when+.004);thumpGain.gain.exponentialRampToValueAtTime(.0001,when+.12);thump.connect(thumpGain);thumpGain.connect(this.masterGainNode);thump.start(when);thump.stop(when+.14);}return true;
};
AudioEngine.playMutedString=function(stringIndex=0,time=null,intensity=.7){
    if(!this.ctx||!this.masterGainNode)return false;
    if(InstrumentTone.muteStyle!=='natural')return this._playReleaseSyntheticMute(stringIndex,time,intensity,InstrumentTone.muteStyle);
    if(!this.mutedC01Buffer){this.prepareMutedC01();return this._playReleaseSyntheticMute(stringIndex,time,intensity,'warm');}
    const when=Math.max(time??this.ctx.currentTime,this.ctx.currentTime),now=performance.now();this.mutedRecentHits=(this.mutedRecentHits||[]).filter(hit=>now-hit<150);this.mutedRecentHits.push(now);const compensation=1/Math.sqrt(Math.max(1,this.mutedRecentHits.length)),level=(.048+.082*InstrumentTone.muteVolume)*clamp(intensity,.36,1)*compensation;
    const source=this.ctx.createBufferSource(),highpass=this.ctx.createBiquadFilter(),lowpass=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();source.buffer=this.mutedC01Buffer;source.playbackRate.value=.985+Math.random()*.025;highpass.type='highpass';highpass.frequency.value=48+Math.max(0,5-stringIndex)*6;lowpass.type='lowpass';lowpass.frequency.value=InstrumentTone.highCut?1450:3400;lowpass.Q.value=.4;gain.gain.setValueAtTime(.0001,when);gain.gain.linearRampToValueAtTime(level,when+.006);gain.gain.setValueAtTime(level*.82,when+.09);gain.gain.exponentialRampToValueAtTime(.0001,when+.38);source.connect(highpass);highpass.connect(lowpass);lowpass.connect(gain);gain.connect(this.masterGainNode);source.start(when);source.stop(when+.42);return true;
};
AudioEngine.playMutedStrum=function(time=null,intensity=.7,stringIndex=0){return this.playMutedString(stringIndex,time,intensity);};
const syncToneUIV1351=InstrumentPage.syncToneUI.bind(InstrumentPage);
InstrumentPage.syncToneUI=function(){syncToneUIV1351();InstrumentTone.syncButton();};

/* 编排模式：单击立即锁定；第二击命中同一点时撤销首击并切换整弦禁用。 */
InstrumentPage._instantEditTap=new Map();
InstrumentPage.pointerUp=(function(previous){return function(event,stringIndex,fret,midi){
    const state=this.livePointers.get(event.pointerId);if(!state?.edit)return previous.call(this,event,stringIndex,fret,midi);
    clearTimeout(state.vibratoTimer);this.livePointers.delete(event.pointerId);if(Math.hypot(event.clientX-state.x,event.clientY-state.y)>=14)return;
    const string=Number(stringIndex),key=`${string}:${Number(fret)}`,now=performance.now(),last=this._instantEditTap.get(key);
    if(last&&now-last.at<340){this._instantEditTap.delete(key);if(last.previous===undefined)delete this.heldFrets[string];else this.heldFrets[string]=last.previous;this.toggleStringMute(string);return;}
    const previousFret=this.heldFrets[string];this.toggleHeld(string,Number(fret));this._instantEditTap.set(key,{at:now,previous:previousFret});setTimeout(()=>{const current=this._instantEditTap.get(key);if(current?.at===now)this._instantEditTap.delete(key);},360);
};})(InstrumentPage.pointerUp);

/* ---------- 和弦查询：根音滚轮、九个常用性质与“更多” ---------- */
const COMMON_CHORD_TYPES=['Maj','Min','7','Maj7','Min7','sus2','sus4','dim','aug'];
const MORE_CHORD_TYPES=['add9','m7b5','9','6','m6','Maj9','Min9','7sus4','6/9','Min11','7#9','7b9'];
ChordLib.buildRootRow=function(){const host=document.getElementById('chord-root-row');if(host)host.innerHTML=`<button type="button" class="chord-root-wheel-open" onclick="ChordLib.openRootWheel()"><span><small>根音 · 滚轮选择</small><strong>${escapeHtml(enharmonic(this.root))}</strong></span><span>更换 ›</span></button>`;};
ChordLib.openRootWheel=function(){
    document.getElementById('chord-root-wheel-modal')?.remove();this.rootWheelPending=this.root;const modal=document.createElement('div');modal.id='chord-root-wheel-modal';modal.className='bass-wheel-modal';modal.innerHTML=`<div class="bass-wheel-card"><h3>选择和弦根音</h3><p>操作与最低音滚轮一致：上下滑动选择，再点确定。</p><div class="bass-wheel" id="root-wheel" onscroll="ChordLib.syncRootWheel()"><div class="bass-wheel-spacer"></div>${Array.from({length:12},(_,pc)=>`<button data-pc="${pc}" class="${pc===this.root?'selected':''}" onclick="ChordLib.chooseRootWheel(${pc})"><strong>${escapeHtml(enharmonic(pc))}</strong><small>${escapeHtml(NOTE_NAMES_FLAT[pc]!==NOTE_NAMES[pc]?NOTE_NAMES_FLAT[pc]:'自然音')}</small></button>`).join('')}<div class="bass-wheel-spacer"></div></div><div class="bass-wheel-focus" aria-hidden="true"></div><div class="bass-wheel-actions"><button class="btn-ios" onclick="ChordLib.closeRootWheel()">取消</button><button class="btn-ios active" onclick="ChordLib.confirmRootWheel()">确定</button></div></div>`;document.body.appendChild(modal);requestAnimationFrame(()=>this.chooseRootWheel(this.root,false));
};
ChordLib.chooseRootWheel=function(pc,smooth=true){this.rootWheelPending=((Number(pc)%12)+12)%12;const wheel=document.getElementById('root-wheel');if(!wheel)return;const row=wheel.querySelector(`[data-pc="${this.rootWheelPending}"]`);row?.scrollIntoView({block:'center',behavior:smooth?'smooth':'auto'});wheel.querySelectorAll('button[data-pc]').forEach(button=>button.classList.toggle('selected',Number(button.dataset.pc)===this.rootWheelPending));};
ChordLib.syncRootWheel=function(){const wheel=document.getElementById('root-wheel');if(!wheel)return;clearTimeout(this._rootWheelTimer);this._rootWheelTimer=setTimeout(()=>{const center=wheel.getBoundingClientRect().top+wheel.clientHeight/2;let best=null,distance=Infinity;wheel.querySelectorAll('button[data-pc]').forEach(button=>{const current=Math.abs(button.getBoundingClientRect().top+button.offsetHeight/2-center);if(current<distance){distance=current;best=button;}});if(best){this.rootWheelPending=Number(best.dataset.pc);wheel.querySelectorAll('button[data-pc]').forEach(button=>button.classList.toggle('selected',button===best));}},55);};
ChordLib.confirmRootWheel=function(){this.root=((Number(this.rootWheelPending)%12)+12)%12;this.bassMode='auto';this.buildBassOptions();this.generate();this.buildRootRow();this.closeRootWheel();};
ChordLib.closeRootWheel=function(){document.getElementById('chord-root-wheel-modal')?.remove();};
ChordLib.selectRootFromWheel=function(pc){this.rootWheelPending=pc;this.confirmRootWheel();};
ChordLib.buildTypeRow=function(){const host=document.getElementById('chord-type-row');if(!host)return;host.innerHTML=COMMON_CHORD_TYPES.map(type=>`<button class="${this.type===type?'active':''}" onclick="ChordLib.selectCompactType('${type}')">${escapeHtml(MusicTheory.chordDisplayNames[type]||type)}</button>`).join('')+`<button class="chord-more-button ${MORE_CHORD_TYPES.includes(this.type)?'active':''}" onclick="ChordLib.openMoreTypes()">更多</button>`;};
ChordLib.selectCompactType=function(type){this.type=type;this.bassMode='auto';this.buildBassOptions();this.generate();this.buildTypeRow();};
ChordLib.openMoreTypes=function(){document.getElementById('chord-more-modal')?.remove();const modal=document.createElement('div');modal.id='chord-more-modal';modal.className='practice-modal release-modal';modal.innerHTML=`<div class="practice-modal-card"><h3>更多和弦性质</h3><p class="release-modal-note">常用九类留在首屏；扩展和弦集中在这里，功能不减少。</p><div class="chord-more-grid">${MORE_CHORD_TYPES.map(type=>`<button class="${this.type===type?'active':''}" onclick="ChordLib.chooseMoreType('${type}')">${escapeHtml(MusicTheory.chordDisplayNames[type]||type)}</button>`).join('')}</div><div class="release-actions"><button onclick="document.getElementById('chord-more-modal').remove()">关闭</button><button class="primary" onclick="document.getElementById('chord-more-modal').remove()">完成</button></div></div>`;document.body.appendChild(modal);};
ChordLib.chooseMoreType=function(type){this.selectCompactType(type);document.getElementById('chord-more-modal')?.remove();};
ChordExplore.arpeggiate=function(){const notes=this.activeNotes().sort((a,b)=>a.midi-b.midi);if(!notes.length){toast('所有琴弦都已禁用');return;}notes.forEach((note,index)=>setTimeout(()=>AudioEngine.playInstrument(note.midi,.92,.18,'explore'),index*150));};

/* ---------- 视唱：完整乐句目录、统一练习长度与精确谱面 ---------- */
const sequenceBeats=sequence=>(sequence||[]).reduce((sum,item)=>sum+(Number(item?.[1])||0),0);
const cloneSequence=sequence=>(sequence||[]).map(item=>[...item]);
const sliceSequence=(sequence,startBeat,endBeat)=>{
    const result=[];let cursor=0;
    for(const item of sequence||[]){const duration=Number(item?.[1])||0,next=cursor+duration,from=Math.max(cursor,startBeat),to=Math.min(next,endBeat);if(to-from>.0001){const copy=[...item];copy[1]=Number((to-from).toFixed(4));result.push(copy);}cursor=next;if(cursor>=endBeat-.0001)break;}
    return result;
};
const meterQuarterBeats=meter=>SightSinging._meterBeats?.(meter)||({'2/2':4,'2/4':2,'3/4':3,'4/4':4,'3/8':1.5,'6/8':3,'7/8':3.5,'9/8':4.5,'12/8':6}[meter]||4);
const splitPhrases=(sequence,meter,barsPerPhrase=2)=>{
    const beats=meterQuarterBeats(meter),total=sequenceBeats(sequence),phraseBeats=beats*barsPerPhrase,result=[];
    for(let start=0;start<total-.0001;start+=phraseBeats){const seq=sliceSequence(sequence,start,Math.min(total,start+phraseBeats));if(seq.length)result.push(seq);}return result.length?result:[cloneSequence(sequence)];
};
const expandSequence=(sequence,meter,targetBars=8)=>{
    const beats=meterQuarterBeats(meter),target=beats*targetBars,base=cloneSequence(sequence),result=[];if(!base.length)return result;
    while(sequenceBeats(result)<target-.0001){const remaining=target-sequenceBeats(result),take=sliceSequence(base,0,Math.min(sequenceBeats(base),remaining));result.push(...take);if(!take.length)break;}return result;
};
const TWINKLE_FULL=[
    [0,1],[0,1],[7,1],[7,1],[9,1],[9,1],[7,2],[5,1],[5,1],[4,1],[4,1],[2,1],[2,1],[0,2],
    [7,1],[7,1],[5,1],[5,1],[4,1],[4,1],[2,2],[7,1],[7,1],[5,1],[5,1],[4,1],[4,1],[2,2],
    [0,1],[0,1],[7,1],[7,1],[9,1],[9,1],[7,2],[5,1],[5,1],[4,1],[4,1],[2,1],[2,1],[0,2]
];

const SightCurriculum={
    catalog:[],
    makeOriginal(index,rhythm=false,meterOverride=null){
        const meters=['2/4','3/4','4/4','6/8','7/8'],meter=meterOverride&&meterOverride!=='auto'?meterOverride:meters[index%meters.length],beats=meterQuarterBeats(meter),modes=['Major','Natural Minor','Dorian','Mixolydian','Lydian'],mode=rhythm?'Major':modes[(index*3)%modes.length],template=MusicTheory.scaleTemplates[mode]||MusicTheory.scaleTemplates.Major,total=beats*8,sequence=[];let remaining=total,degree=(index*5)%7,cursor=0;
        const choices=rhythm?[.25,.5,.75,1,1.5]:index%3===0?[.5,1,1.5]:[.5,1,2];
        while(remaining>.001&&cursor<256){const fitting=choices.filter(value=>value<=remaining+.001),duration=fitting[(index*7+cursor*5)%fitting.length]||remaining;if(rhythm)sequence.push((index+cursor*7)%9===0?[null,duration,1]:[0,duration]);else{degree=Math.max(0,Math.min(7,degree+[-2,-1,0,1,2][(index+cursor*3)%5]));sequence.push([degree===7?12:template[Math.min(6,degree)],duration]);}remaining=Number((remaining-duration).toFixed(4));cursor++;}
        return {id:`mtu-${rhythm?'rhythm-plus':'melody-plus'}-${String(index+1).padStart(3,'0')}`,title:`${rhythm?'节奏读谱':'原创视唱组曲'} ${String(index+1).padStart(3,'0')}`,composer:'黄鸡／音乐工具箱 Ultra',source:'音乐工具箱 Ultra 内置原创 · 8 小节',root:rhythm?0:(index*5)%12,mode,meter,scoreBpm:(rhythm?58:64)+(index%10)*4,style:rhythm?'rhythm':index%4===0?'modal':'classical',training:rhythm?'rhythm':'melody',seq:sequence,phrases:splitPhrases(sequence,meter,2)};
    },
    build(){
        const raw=[...(SightSinging.library||[])],catalog=[],cc0Groups=new Map();
        raw.filter(item=>String(item.id).startsWith('cc0-osl-')).forEach(item=>{const key=item.sourceUrl||item.title.replace(/ · 第\s*\d+\s*段.*/,''),group=cc0Groups.get(key)||[];group.push(item);cc0Groups.set(key,group);});
        for(const group of cc0Groups.values()){
            group.sort((a,b)=>String(a.id).localeCompare(String(b.id),undefined,{numeric:true}));const first=group[0],phrases=group.map(item=>cloneSequence(item.seq)),sequence=phrases.flatMap(cloneSequence),bars=Math.max(1,Math.round(sequenceBeats(sequence)/meterQuarterBeats(first.meter)));
            catalog.push({...first,id:`${String(first.id).replace(/-seg-\d+$/,'')}-song`,title:`${first.title.replace(/ · 第\s*\d+\s*段.*/,'')} · ${bars} 小节选段`,source:`${first.source} · 连续乐句`,seq:sequence,phrases,bars});
        }
        raw.filter(item=>String(item.id).startsWith('pd-')).forEach(item=>{let sequence=String(item.id).includes('twinkle')?cloneSequence(TWINKLE_FULL):expandSequence(item.seq,item.meter,8),title=item.title.replace(/\s*·\s*(开头短句|主题短句|短句)$/,'');const phrases=splitPhrases(sequence,item.meter,2);catalog.push({...item,title:String(item.id).includes('twinkle')?`${title} · 完整主题`:`${title} · 8 小节主题练习`,source:String(item.id).includes('twinkle')?`${item.source} · 完整主题旋律`:`${item.source} · 延展练习版`,seq:sequence,phrases,bars:Math.round(sequenceBeats(sequence)/meterQuarterBeats(item.meter))});});
        raw.filter(item=>/^mtu-(original|rhythm)-/.test(String(item.id))).forEach(item=>{const sequence=expandSequence(item.seq,item.meter,8),phrases=splitPhrases(sequence,item.meter,2);catalog.push({...item,title:item.title.replace(/\s*·\s*短句$/,''),source:`${item.source} · 8 小节`,seq:sequence,phrases,bars:8});});
        for(let index=0;index<80;index++)catalog.push(this.makeOriginal(index+100,false));
        for(let index=0;index<40;index++)catalog.push(this.makeOriginal(index+200,true));
        this.catalog=catalog;SightSinging.library=catalog;
    },
    applySegment(exercise,length=SightSinging.practiceLength,phraseIndex=exercise.currentPhrase||0){
        if(!exercise)return;const phrases=exercise.fullPhrases||exercise.phrases||[exercise.fullSeq||exercise.seq||[]],safeIndex=clamp(phraseIndex,0,Math.max(0,phrases.length-1)),full=exercise.fullSeq||phrases.flatMap(cloneSequence),beats=meterQuarterBeats(exercise.meter),phraseStarts=[];let running=0;phrases.forEach(phrase=>{phraseStarts.push(running);running+=sequenceBeats(phrase);});exercise.currentPhrase=safeIndex;
        let sequence;if(length==='full')sequence=cloneSequence(full);else if(length==='phrase')sequence=cloneSequence(phrases[safeIndex]);else{const bars=Math.max(1,Number(length)||2),start=phraseStarts[safeIndex]||0;sequence=sliceSequence(full,start,Math.min(sequenceBeats(full),start+bars*beats));}
        exercise.seq=sequence;exercise.midis=sequence.map(([interval,,rest])=>rest||interval===null?null:60+exercise.root+interval);exercise.durations=sequence.map(item=>Number(item[1])||0);exercise.bars=Math.max(1,Math.ceil(sequenceBeats(sequence)/beats));exercise.segmentStartBeat=phraseStarts[safeIndex]||0;exercise.totalBars=Math.max(1,Math.ceil(sequenceBeats(full)/beats));
    }
};
SightCurriculum.build();window.SightCurriculum=SightCurriculum;

SightSinging.practiceLength=localStorage.getItem('music_toolbox_sight_length_v1351')||'2';
const setupBeforeRelease=SightSinging.setup.bind(SightSinging);
SightSinging.setup=function(){const setup=setupBeforeRelease(),length=this.practiceLength||'2',legacy=length==='full'?'full':length==='phrase'?'full':Math.max(1,Number(length)||2);return {...setup,practiceLength:length,bars:legacy,singBars:legacy};};
SightSinging.build=function(index){
    const setup=this.setup(),pool=SightCurriculum.catalog.filter(item=>setup.training==='rhythm'?item.training==='rhythm':item.training!=='rhythm'),source=setup.source==='generated'?SightCurriculum.makeOriginal(Math.abs(index)+900,setup.training==='rhythm',setup.meter):pool[((index%pool.length)+pool.length)%pool.length],exercise=JSON.parse(JSON.stringify(source)),originalRoot=exercise.originalRoot??exercise.root,targetRoot=this._resolveRoot(setup.key,originalRoot,index);exercise.originalRoot=originalRoot;exercise.root=targetRoot;
    let phrases=(exercise.phrases||splitPhrases(exercise.seq,exercise.meter,2)).map(cloneSequence),originalMode=exercise.mode;
    if(setup.scale!=='auto'&&setup.scale!==originalMode){const from=MusicTheory.scaleTemplates[originalMode]||MusicTheory.scaleTemplates.Major,to=MusicTheory.scaleTemplates[setup.scale]||MusicTheory.scaleTemplates.Major;phrases=phrases.map(phrase=>phrase.map(([interval,duration,rest])=>{if(rest||interval===null)return [null,duration,1];const octave=Math.floor(interval/12),pitch=((interval%12)+12)%12,degree=from.indexOf(pitch),mapped=degree>=0?(to[degree]??pitch):pitch;return [mapped+octave*12,duration];}));exercise.mode=setup.scale;}
    exercise.fullPhrases=phrases;exercise.fullSeq=phrases.flatMap(cloneSequence);exercise.currentPhrase=0;exercise.sourceBars=Math.max(1,Math.ceil(sequenceBeats(exercise.fullSeq)/meterQuarterBeats(exercise.meter)));
    const tempo=setup.tempoMode==='manual'?{bpm:setup.bpm,label:'手动练习速度'}:this.recommendedTempo(exercise);exercise.baseBpm=tempo.bpm;exercise.bpm=this.effectiveBpm(exercise);exercise.tempoSource=tempo.label;exercise.tempoMode=setup.tempoMode;
    SightCurriculum.applySegment(exercise,this.practiceLength,0);return exercise;
};
SightSinging._practiceSequence=function(){const exercise=this.exercise;if(!exercise)return {midis:[],durations:[],beats:0};return {midis:[...exercise.midis],durations:[...exercise.durations],beats:exercise.durations.reduce((sum,value)=>sum+value,0)};};
SightSinging.updateLengthOptions=function(){
    const select=document.getElementById('sight-practice-length'),total=this.exercise?.totalBars||1;if(!select)return;
    [...select.options].forEach(option=>{const numeric=Number(option.value);option.selected=option.value===this.practiceLength;option.disabled=Number.isFinite(numeric)&&numeric>total;});
};
SightSinging.setPracticeLength=function(value){
    const allowed=['1','2','4','8','phrase','full'];this.practiceLength=allowed.includes(String(value))?String(value):'2';try{localStorage.setItem('music_toolbox_sight_length_v1351',this.practiceLength);}catch(error){}
    if(this.exercise){SightCurriculum.applySegment(this.exercise,this.practiceLength,this.exercise.currentPhrase||0);this._setDemoUnlocked?.(false);this.setLamp?.('idle','未检测');this.updateCard();this.renderScore();if(SightMetronome.playing)SightMetronome.refresh();}
};
SightSinging.setBars=function(kind,value){this.setPracticeLength(value);};
SightSinging.nextPhrase=function(delta){
    if(this.recording||!this.exercise)return;const count=this.exercise.fullPhrases?.length||1,next=clamp((this.exercise.currentPhrase||0)+(Number(delta)||0),0,count-1);if(next===this.exercise.currentPhrase){toast(next===0?'已经是第一句':'已经是最后一句');return;}SightCurriculum.applySegment(this.exercise,this.practiceLength,next);this._setDemoUnlocked?.(false);this.setLamp?.('idle','未检测');this.lastDetected=[];this.updateCard();this.renderScore();if(SightMetronome.playing)SightMetronome.refresh();
};
const nextBeforeRelease=SightSinging.next.bind(SightSinging);
SightSinging.next=function(delta=1,replace=false){if(this.recording)return;const result=nextBeforeRelease(delta,replace);if(this.exercise){this.exercise.currentPhrase=0;SightCurriculum.applySegment(this.exercise,this.practiceLength,0);this.updateCard();this.renderScore();}return result;};
SightSinging.updateCard=function(){
    const exercise=this.exercise;if(!exercise)return;const phrases=exercise.fullPhrases?.length||1,index=(exercise.currentPhrase||0)+1,keyText=exercise.originalRoot===exercise.root?`原调 ${enharmonic(exercise.root)}`:`原调 ${enharmonic(exercise.originalRoot)} → 练习调 ${enharmonic(exercise.root)}`,title=document.getElementById('sight-title'),meta=document.getElementById('sight-meta'),segment=document.getElementById('sight-segment-label'),progress=document.getElementById('sight-phrase-progress');
    if(title)title.textContent=exercise.title;if(meta)meta.textContent=`${exercise.composer} · ${exercise.source} · ${keyText} ${EarTraining.scaleDisplayNames[exercise.mode]||exercise.mode} · ${exercise.meter} · ${this.effectiveBpm(exercise)} BPM`;
    const label=`第 ${index} 句／共 ${phrases} 句 · 当前 ${exercise.bars} 小节／全曲 ${exercise.totalBars} 小节`;if(segment)segment.textContent=label;if(progress)progress.textContent=`第 ${index} 句／共 ${phrases} 句`;
    const previous=document.getElementById('sight-prev-phrase'),next=document.getElementById('sight-next-phrase');if(previous)previous.disabled=index<=1;if(next)next.disabled=index>=phrases;this.updateLengthOptions();this.syncTempoPercentUI?.();
};

SightSinging.scrollToCurrentPhrase=function(){
    const score=document.getElementById('sight-score'),exercise=this.exercise;if(!score||!exercise)return;
    if(this.practiceLength!=='full'){score.scrollLeft=0;return;}
    const total=Math.max(.01,sequenceBeats(exercise.fullSeq||exercise.seq)),ratio=clamp((exercise.segmentStartBeat||0)/total,0,1);
    score.scrollLeft=Math.round(Math.max(0,score.scrollWidth-score.clientWidth)*ratio);
};

SightSinging._restSvg=function(x,duration){
    const value=Math.max(.125,Number(duration)||1),dotted=[.375,.75,1.5,3,6].some(item=>Math.abs(value-item)<.025),base=dotted?value/1.5:value,triplet=[1/3,2/3,4/3].some(item=>Math.abs(value-item)<.035);let kind,label,shape;
    if(base>=3.5){kind='whole';label='全休止符';shape=`<rect x="${x-8}" y="86" width="16" height="7" rx="1" fill="var(--text)"/>`;}
    else if(base>=1.75){kind='half';label='二分休止符';shape=`<rect x="${x-8}" y="93" width="16" height="7" rx="1" fill="var(--text)"/>`;}
    else if(base>=.875){kind='quarter';label='四分休止符';shape=`<path d="M${x+3} 78 l-7 10 7 8 -5 8 7 8 -4 10" fill="none" stroke="var(--text)" stroke-width="3.1" stroke-linecap="round" stroke-linejoin="round"/>`;}
    else if(base>=.44){kind='eighth';label='八分休止符';shape=`<circle cx="${x-4}" cy="91" r="3" fill="var(--text)"/><path d="M${x-1} 92 q11 2 5 13 l-8 17" fill="none" stroke="var(--text)" stroke-width="2.4" stroke-linecap="round"/>`;}
    else{kind='sixteenth';label='十六分休止符';shape=`<circle cx="${x-5}" cy="87" r="2.8" fill="var(--text)"/><circle cx="${x-2}" cy="97" r="2.8" fill="var(--text)"/><path d="M${x-2} 88 q11 2 5 11 M${x+1} 98 q9 2 3 10 l-8 16" fill="none" stroke="var(--text)" stroke-width="2.3" stroke-linecap="round"/>`;}
    if(dotted)label=`附点${label}`;if(triplet)label=`三连音${label}`;const dot=dotted?`<circle cx="${x+13}" cy="100" r="2.4" fill="var(--text)"/>`:'';const number=triplet?`<text x="${x}" y="68" text-anchor="middle" fill="var(--text-sub)" font-size="9" font-weight="800">3</text>`:'';
    return `<g class="sight-rest sight-rest-${kind}" role="img" aria-label="${label}，${value} 拍"><title>${label} · ${value} 拍</title>${shape}${dot}${number}</g>`;
};

SightSinging.renderScore=function(){
    const exercise=this.exercise,box=document.getElementById('sight-score');if(!exercise||!box)return;const notation=document.getElementById('sight-notation')?.value||'staff',beats=meterQuarterBeats(exercise.meter),total=Math.max(.01,sequenceBeats(exercise.seq)),bars=Math.max(1,Math.ceil(total/beats));
    if(notation==='jianpu'){const template=MusicTheory.scaleTemplates[exercise.mode]||MusicTheory.scaleTemplates.Major;let cursor=0;box.innerHTML=`<div class="sight-jianpu"><b>│</b>${exercise.midis.map((midi,index)=>{const rest=!Number.isFinite(midi),relative=rest?0:(midi-60-exercise.root+120)%12,degree=template.indexOf(relative),number=rest?'0':degree>=0?degree+1:'·',bar=cursor>0&&Math.abs(cursor%beats)<.001?'<b>│</b>':'';cursor+=exercise.durations[index];return `${bar}<span class="note${rest?' rest':''}">${number}<span class="dur">${exercise.durations[index]} 拍</span></span>`;}).join('')}<b>║</b></div>`;return;}
    const drum=notation==='drum',width=Math.max(660,Math.round(total*54+145)),height=214,top=drum?84:72,bottom=drum?112:128,contentStart=106,contentEnd=width-24,pixelsPerBeat=(contentEnd-contentStart)/total,staffLines=drum?[91,105]:[72,86,100,114,128];let svg=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${drum?'鼓谱':'五线谱'}，${bars} 小节"><rect width="100%" height="100%" fill="var(--surf)"/>`;
    staffLines.forEach(y=>svg+=`<line class="notation-bar" x1="18" y1="${y}" x2="${contentEnd+6}" y2="${y}" stroke="var(--text-sub)" opacity=".62"/>`);svg+=`<line class="notation-bar" x1="18" y1="${top}" x2="18" y2="${bottom}" stroke="var(--text)" stroke-width="2"/><text x="20" y="24" fill="var(--prim)" font-size="10" font-weight="750">${escapeHtml(enharmonic(exercise.root))} ${escapeHtml(exercise.mode)} · ${escapeHtml(exercise.meter)} · ${escapeHtml(exercise.tempoSource||'练习速度')} ${this.effectiveBpm(exercise)} BPM</text>`;
    svg+=drum?`<text x="31" y="113" fill="var(--text)" font-size="31">𝄥</text>`:`<text x="25" y="121" fill="var(--text)" font-size="43">𝄞</text>`;const [numerator='4',denominator='4']=String(exercise.meter||'4/4').split('/');svg+=`<text x="70" y="91" fill="var(--text)" font-size="19" font-weight="750">${escapeHtml(numerator)}</text><text x="70" y="114" fill="var(--text)" font-size="19" font-weight="750">${escapeHtml(denominator)}</text>`;
    for(let bar=1;bar<=bars;bar++){const x=contentStart+Math.min(total,bar*beats)*pixelsPerBeat,final=bar===bars;svg+=`<line class="notation-bar" x1="${x}" y1="${top}" x2="${x}" y2="${bottom}" stroke="var(--text)" stroke-width="${final?2.5:1.25}"/>${final?`<line class="notation-bar" x1="${x-5}" y1="${top}" x2="${x-5}" y2="${bottom}" stroke="var(--text)" stroke-width="1"/>`:''}`;}
    let cursor=0;exercise.midis.forEach((midi,index)=>{const duration=exercise.durations[index],x=contentStart+(cursor+duration*.44)*pixelsPerBeat,rest=!Number.isFinite(midi),spelling=rest?null:this._spellMidi(midi,exercise.root),y=drum?98:rest?100:128-(spelling.index-30)*7;
        if(rest)svg+=this._restSvg(x,duration);
        else if(drum)svg+=`<path d="M${x-6},${y-6} L${x+6},${y+6} M${x+6},${y-6} L${x-6},${y+6}" stroke="var(--text)" stroke-width="2.3"/><line x1="${x+7}" y1="${y}" x2="${x+7}" y2="${y-31}" stroke="var(--text)" stroke-width="1.6"/>`;
        else{if(y<=58)for(let ledger=58;ledger>=y-1;ledger-=14)svg+=`<line x1="${x-12}" y1="${ledger}" x2="${x+12}" y2="${ledger}" stroke="var(--text)" stroke-width="1.2"/>`;if(y>=142)for(let ledger=142;ledger<=y+1;ledger+=14)svg+=`<line x1="${x-12}" y1="${ledger}" x2="${x+12}" y2="${ledger}" stroke="var(--text)" stroke-width="1.2"/>`;if(spelling.accidental)svg+=`<text x="${x-17}" y="${y+5}" text-anchor="middle" fill="var(--text)" font-size="17">${escapeHtml(spelling.accidental)}</text>`;const filled=duration<2,stemUp=y>=100;svg+=`<ellipse class="notation-note" cx="${x}" cy="${y}" rx="9" ry="6" transform="rotate(-18 ${x} ${y})" fill="${filled?'var(--text)':'var(--surf)'}" stroke="var(--text)" stroke-width="1.5"/>`;if(duration<4){const stemX=stemUp?x+8:x-8,stemEnd=stemUp?y-35:y+35;svg+=`<line x1="${stemX}" y1="${y}" x2="${stemX}" y2="${stemEnd}" stroke="var(--text)" stroke-width="1.7"/>`;if(duration<1)svg+=stemUp?`<path d="M${stemX},${stemEnd} q15,7 5,18" fill="none" stroke="var(--text)" stroke-width="2"/>`:`<path d="M${stemX},${stemEnd} q-15,-7 -5,-18" fill="none" stroke="var(--text)" stroke-width="2"/>`;}
            if([.375,.75,1.5,3].some(value=>Math.abs(duration-value)<.001)){const onLine=Math.abs((bottom-y)/14-Math.round((bottom-y)/14))<.02,dotY=onLine?y-7:y;svg+=`<circle class="notation-dot" cx="${x+15}" cy="${dotY}" r="2.5" fill="var(--text)"/>`;}}
        cursor+=duration;
    });
    if(this.lastDetected?.length&&!drum){const first=this.lastDetected[0].start,last=Math.max(first+.1,this.lastDetected.at(-1).end),points=this.lastDetected.map(note=>`${contentStart+(note.start-first)/(last-first)*(contentEnd-contentStart)},${128-(this._spellMidi(note.midi,exercise.root).index-30)*7}`).join(' ');svg+=`<polyline points="${points}" fill="none" stroke="var(--teal)" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>`;}
    box.innerHTML=svg+'</svg>';requestAnimationFrame(()=>this.scrollToCurrentPhrase());
};

SightSinging.bindPhraseSwipe=function(){
    const score=document.getElementById('sight-score');if(!score||score.dataset.phraseSwipeBound==='1')return;score.dataset.phraseSwipeBound='1';let start=null;
    score.addEventListener('pointerdown',event=>{start={x:event.clientX,y:event.clientY,scroll:score.scrollLeft};},{passive:true});
    score.addEventListener('pointerup',event=>{if(!start)return;const dx=event.clientX-start.x,dy=event.clientY-start.y,atStart=score.scrollLeft<5,atEnd=score.scrollLeft+score.clientWidth>=score.scrollWidth-5;start=null;if(Math.abs(dx)<75||Math.abs(dx)<Math.abs(dy)*1.45)return;if(dx>0&&atStart)this.nextPhrase(-1);else if(dx<0&&atEnd)this.nextPhrase(1);},{passive:true});
};
SightSinging.showLibraryInfo=function(){const melody=SightCurriculum.catalog.filter(item=>item.training!=='rhythm').length,rhythm=SightCurriculum.catalog.length-melody;document.getElementById('sight-library-modal')?.remove();const modal=document.createElement('div');modal.id='sight-library-modal';modal.className='practice-modal release-modal';modal.innerHTML=`<div class="practice-modal-card"><h3>本地视唱曲库</h3><p class="release-modal-note">共 ${SightCurriculum.catalog.length} 首／组离线练习：${melody} 首旋律、${rhythm} 组节奏／鼓谱。曲库只使用公版、CC0 与音乐工具箱 Ultra 原创资料；现代版权旋律不会擅自完整收录。</p><p class="release-modal-note">“上一句／下一句”按音乐乐句移动；“练习长度”统一控制谱面、录音、标准示范与随谱节拍器。</p><div class="release-actions"><button onclick="document.getElementById('sight-library-modal').remove()">关闭</button><button class="primary" onclick="document.getElementById('sight-library-modal').remove()">知道了</button></div></div>`;document.body.appendChild(modal);};

/* 随谱节拍器同样以拍号分母所代表的一拍为 BPM 单位。
   例如 2/2 的 120 BPM 是每分钟 120 个二分音符拍点；7/8 的分组只改变次强位置。 */
SightMetronome._groups=function(){return Array(Math.max(1,Number(String(this.signature()).split('/')[0])||4)).fill(1);};
SightMetronome._duration=function(){return 60/Math.max(30,SightSinging.effectiveBpm());};
SightMetronome._schedule=function(time,index){
    const signature=this.signature(),strong=index===0,secondary=!strong&&Metro._groupStarts(signature).has(index),beat=Metro.slots?.beat;
    if(strong)AudioEngine.playMetronomeBeat(time,true,beat,Metro.slots?.accent,.64);
    else AudioEngine.playClick(time,false,beat,secondary?.52:.38);
};

/* ---------- 调音器独立抽屉 ---------- */
Tuner.closePicker=function(){const bar=document.getElementById('tuning-bar'),panel=document.getElementById('tuning-panel');bar?.classList.remove('open');panel?.classList.remove('open');bar?.setAttribute('aria-expanded','false');};
Tuner.togglePicker=function(){
    const bar=document.getElementById('tuning-bar'),panel=document.getElementById('tuning-panel');if(!bar||!panel)return;const open=!panel.classList.contains('open');
    bar.classList.toggle('open',open);panel.classList.toggle('open',open);bar.setAttribute('aria-expanded',String(open));if(open)requestAnimationFrame(()=>{const active=panel.querySelector('.tuning-card.active');active?.scrollIntoView?.({block:'nearest'});});
};
document.addEventListener('pointerdown',event=>{if(!document.getElementById('tuning-panel')?.classList.contains('open'))return;if(!event.target.closest?.('#page-tuner .tuning-picker'))Tuner.closePicker();},{passive:true});
document.addEventListener('keydown',event=>{if(event.key==='Escape')Tuner.closePicker();});

/* ---------- 主页面隔离的高级／精简渐速训练 ---------- */
const metroBeatDurationV1352=Metro._beatDuration.bind(Metro);
Metro._beatDuration=function(index){return this.signature==='2/2'?60/Math.max(30,this.bpm):metroBeatDurationV1352(index);};
Metro.ramp={mode:'range',baseline:120,start:120,target:150,current:120,step:1,interval:5,running:false,started:false,completed:false,timer:null,generation:0,nextBeatTime:0,beat:0,nextChangeAt:0};
Metro._rampNumber=function(id,fallback,min,max){const value=Number(document.getElementById(id)?.value);return clamp(Number.isFinite(value)?value:fallback,min,max);};
Metro._rampFormatTime=function(seconds){const value=Math.max(0,Math.round(seconds));if(value<60)return `${value} 秒`;const minutes=Math.floor(value/60),rest=value%60;return `${minutes} 分${rest?` ${rest} 秒`:''}`;};
Metro._rampReadFields=function(){
    const ramp=this.ramp;if(ramp.mode==='range'){ramp.start=this._rampNumber('ramp-start',ramp.start,30,300);ramp.target=this._rampNumber('ramp-target',ramp.target,30,300);ramp.step=this._rampNumber('ramp-step',ramp.step,1,30);ramp.interval=this._rampNumber('ramp-interval',ramp.interval,1,600);}else ramp.interval=this._rampNumber('ramp-lite-interval',ramp.interval,1,600);
};
Metro._rampUpdateDerived=function(){
    this._rampReadFields();const ramp=this.ramp,steps=ramp.mode==='range'?Math.ceil(Math.abs(ramp.target-ramp.start)/Math.max(1,ramp.step)):0,duration=steps*ramp.interval,output=document.getElementById(ramp.mode==='range'?'ramp-duration':'ramp-duration-lite');if(output)output.textContent=ramp.mode==='range'?this._rampFormatTime(duration):'手动暂停';
    const restore=document.getElementById('ramp-restore-button');if(restore)restore.textContent=`↶ 返回 ${ramp.mode==='range'?ramp.start:ramp.baseline}`;
};
Metro._rampUpdateUI=function(message=''){
    const ramp=this.ramp,current=document.getElementById('ramp-current'),state=document.getElementById('ramp-state'),bar=document.getElementById('ramp-progress'),button=document.getElementById('ramp-start-button');if(current)current.textContent=String(Math.round(ramp.current));
    let progress=0;if(ramp.mode==='range')progress=Math.abs(ramp.current-ramp.start)/Math.max(1,Math.abs(ramp.target-ramp.start));else if(ramp.running)progress=1-clamp((ramp.nextChangeAt-performance.now())/(ramp.interval*1000),0,1);if(bar)bar.style.width=`${clamp(progress,0,1)*100}%`;
    if(state)state.textContent=message||(ramp.mode==='range'?`${ramp.start} → ${ramp.target} · 每 ${ramp.interval} 秒变化 ${ramp.step} BPM`:`当前 ${ramp.current} BPM · 每 ${ramp.interval} 秒 +1 BPM`);if(button)button.textContent=ramp.running?'Ⅱ 暂停':ramp.completed?'↻ 重新开始':ramp.started?'▶ 继续':'▶ 开始';
    this._rampUpdateDerived();
};
Metro.rampFieldChanged=function(){if(this.ramp.running)return;this._rampReadFields();this.ramp.current=this.ramp.mode==='range'?this.ramp.start:this.ramp.baseline;this.ramp.started=false;this.ramp.completed=false;this._rampUpdateUI();};
Metro.adjustRampValue=function(id,delta){const input=document.getElementById(id);if(!input)return;input.value=String(clamp((Number(input.value)||5)+(Number(delta)||0),Number(input.min)||1,Number(input.max)||600));this.rampFieldChanged();};
Metro._rampBeatDuration=function(){return 60/Math.max(30,this.ramp.current);};
Metro._rampScheduleBeat=function(index,time){
    const duration=this._rampBeatDuration(index),level=this._accentPattern()[index]??.58,strong=this.accentMode==='meter'&&index===0,secondary=this.accentMode==='meter'&&!strong&&level>=.72;this._playMainBeat(index,time,strong,secondary);
    if(this.sub>1){const subDur=duration/this.sub;for(let sub=1;sub<this.sub;sub++){const swing=this.swingEnabled&&this.sub%2===0&&sub%2===1;AudioEngine.playClick(time+this._swingPosition(sub,subDur,this.sub),false,swing?this.slots.swing:this.slots.subdivision,this._subdivisionLevel(swing));}}else if(this.swingEnabled)AudioEngine.playClick(time+duration*this.swing,false,this.slots.swing,this._subdivisionLevel(true));
};
Metro.toggleRamp=async function(){
    const ramp=this.ramp;if(ramp.running){this.pauseRamp();return;}this._rampReadFields();if(ramp.mode==='range'&&ramp.start===ramp.target){toast('起始 BPM 和目标 BPM 不能相同');return;}if(ramp.completed){ramp.current=ramp.mode==='range'?ramp.start:ramp.baseline;ramp.started=false;ramp.completed=false;}if(!ramp.started)ramp.current=ramp.mode==='range'?ramp.start:ramp.baseline;
    try{if(!AudioEngine.ctx)await AudioEngine.init();else if(AudioEngine.ctx.state==='suspended')await AudioEngine.ctx.resume();await this._prepareCurrentSounds();}catch(error){toast('节拍器音频暂未就绪，请重试');return;}ramp.running=true;ramp.started=true;ramp.completed=false;ramp.generation++;ramp.beat=0;ramp.nextBeatTime=AudioEngine.ctx.currentTime+.06;ramp.nextChangeAt=performance.now()+ramp.interval*1000;this._rampUpdateUI();this._runRamp(ramp.generation);
};
Metro._runRamp=function(generation){
    const ramp=this.ramp;if(!ramp.running||generation!==ramp.generation||!AudioEngine.ctx)return;const audioNow=AudioEngine.ctx.currentTime;while(ramp.nextBeatTime<audioNow+.14){const beat=ramp.beat;this._rampScheduleBeat(beat,ramp.nextBeatTime);ramp.nextBeatTime+=this._rampBeatDuration(beat);ramp.beat=(beat+1)%Math.max(1,this.ts);}
    const now=performance.now();if(now>=ramp.nextChangeAt){const ticks=Math.max(1,Math.floor((now-ramp.nextChangeAt)/(ramp.interval*1000))+1);ramp.nextChangeAt+=ticks*ramp.interval*1000;if(ramp.mode==='lite'){ramp.current=clamp(ramp.current+ticks,30,300);if(ramp.current>=300){this.pauseRamp(true);this._rampUpdateUI('已到 300 BPM · 点击撤回或退出');return;}}else{const direction=Math.sign(ramp.target-ramp.start)||1;ramp.current+=direction*ramp.step*ticks;if((direction>0&&ramp.current>=ramp.target)||(direction<0&&ramp.current<=ramp.target)){ramp.current=ramp.target;this.pauseRamp(true);this._rampUpdateUI(`完成 · 已到 ${ramp.target} BPM`);return;}}}
    this._rampUpdateUI();ramp.timer=setTimeout(()=>this._runRamp(generation),25);
};
Metro.pauseRamp=function(done=false){const ramp=this.ramp;ramp.running=false;ramp.completed=!!done;ramp.generation++;clearTimeout(ramp.timer);ramp.timer=null;this._rampUpdateUI(done?`完成 · 当前 ${Math.round(ramp.current)} BPM`:'已暂停 · 点击继续');};
Metro.closeRamp=function(){const baseline=this.ramp.baseline;this.pauseRamp();this.setBpm(baseline);this.stop();document.getElementById('metro-ramp-modal')?.remove();};

/* ---------- 虚拟指板与演奏区共用真实琴弦坐标 ---------- */
InstrumentPage.syncStringAxis=function(){
    const wrap=document.querySelector('#instrument-stage .virtual-fret-wrap'),zone=document.getElementById('strum-zone'),svg=wrap?.querySelector('.virtual-board-scroll svg');if(!wrap||!zone||!svg)return;const horizontal=wrap.classList.contains('is-horizontal'),zoneRect=zone.getBoundingClientRect(),limit=horizontal?zoneRect.height:zoneRect.width;
    zone.querySelectorAll('.performance-string-cell[data-string]').forEach(cell=>{const line=svg.querySelector(`.instrument-string-line[data-string="${cell.dataset.string}"]`);if(!line)return;const rect=line.getBoundingClientRect(),value=horizontal?(rect.top+rect.height/2-zoneRect.top):(rect.left+rect.width/2-zoneRect.left);cell.style.setProperty('--string-axis',`${clamp(value,0,Math.max(0,limit))}px`);});
};
InstrumentPage.renderFretboard=function(stage){
    const vv=window.visualViewport,horizontal=this.orientation==='auto'?((vv?.width||innerWidth)>=(vv?.height||innerHeight)):this.orientation==='horizontal',axis=horizontal?'y':'x',count=this.getTuning().length,performance=this.playMode==='performance',cells=Array.from({length:count},(_,s)=>`<div class="performance-string-cell${this.mutedStrings.has(s)?' disabled':''}" data-string="${s}">${count-s}弦</div>`).join('');
    stage.innerHTML=`<div class="virtual-fret-wrap ${horizontal?'is-horizontal':'vertical'}${performance?' performance-mode':''}"><div class="virtual-board-scroll">${this._boardSvg(horizontal)}</div><div class="strum-zone ${horizontal?'strum-vertical':'strum-horizontal'}" id="strum-zone" data-axis="${axis}" style="--strings:${count}"><div class="performance-string-cells">${cells}</div><span>演奏区<br><small>${horizontal?'上高音 · 下低音':'左低音 · 右高音'} · 双指＝轻制音<br>双击弦名或空白弦区＝禁用／恢复</small></span></div><div class="instrument-scroll-control"><span>1 品</span><input type="range" min="0" max="100" value="0" oninput="InstrumentPage.scrollBoard(this.value)" aria-label="指板品位导航"><span>${this.instrument==='bass'?20:18} 品</span></div><div class="instrument-technique" id="instrument-technique">${performance?'准备演奏':'编排模式'}</div></div>`;
    this.bindStringMuteGestures();this.bindPerformanceMove();this.bindStrum();this._axisObserver?.disconnect();if(window.ResizeObserver){this._axisObserver=new ResizeObserver(()=>this.syncStringAxis());this._axisObserver.observe(stage);this._axisObserver.observe(document.getElementById('strum-zone'));}stage.querySelector('.virtual-board-scroll')?.addEventListener('scroll',()=>this.syncStringAxis(),{passive:true});requestAnimationFrame(()=>this.syncStringAxis());
};

/* ---------- 视唱谱面缩放、清晰休止符与可中断示范 ---------- */
SightSinging.scoreZoom=clamp(Number(localStorage.getItem('music_toolbox_sight_zoom_v1352'))||100,75,200);
SightSinging.applyScoreZoom=function(){const box=document.getElementById('sight-score'),svg=box?.querySelector('svg'),output=document.getElementById('sight-score-zoom-value');if(output)output.textContent=`${this.scoreZoom}%`;if(!box||!svg)return;const base=Math.max(660,Number(svg.viewBox?.baseVal?.width)||660),pixels=Math.round(base*this.scoreZoom/100);svg.style.setProperty('width',`max(100%, ${pixels}px)`,'important');svg.style.setProperty('min-width',`${pixels}px`,'important');};
SightSinging.adjustScoreZoom=function(delta){this.scoreZoom=clamp(this.scoreZoom+(Number(delta)||0),75,200);try{localStorage.setItem('music_toolbox_sight_zoom_v1352',String(this.scoreZoom));}catch(error){}this.applyScoreZoom();};
const sightRenderScoreV1352=SightSinging.renderScore.bind(SightSinging);
SightSinging.renderScore=function(){const result=sightRenderScoreV1352();requestAnimationFrame(()=>this.applyScoreZoom());return result;};
SightSinging._sightTransportToken=0;SightSinging._sightDemoBus=null;SightSinging._sightDemoPlaying=false;
SightSinging._hidePlaybackStrip=function(){document.querySelector('.sight-playback-strip')?.classList.remove('active');};
SightSinging.startPlaybackProgress=function(ms,label){clearInterval(this._progressTimer);clearTimeout(this._progressHideTimer);const strip=document.querySelector('.sight-playback-strip'),started=performance.now();strip?.classList.add('active');this.setPlaybackProgress(0,`${label} · ♩=${this.exercise?.bpm||96}`);this._progressTimer=setInterval(()=>{const ratio=Math.min(1,(performance.now()-started)/Math.max(1,ms));this.setPlaybackProgress(ratio,`${label} · ${Math.round(ratio*100)}%`);if(ratio>=1)this.stopPlaybackProgress(`${label}完成`);},80);};
SightSinging.stopPlaybackProgress=function(label=''){clearInterval(this._progressTimer);this._progressTimer=null;if(label)this.setPlaybackProgress(1,label);clearTimeout(this._progressHideTimer);this._progressHideTimer=setTimeout(()=>this._hidePlaybackStrip(),650);};
SightSinging.cancelSightAudio=function(){
    this._sightTransportToken++;this._sightDemoPlaying=false;clearInterval(this._progressTimer);clearTimeout(this._progressHideTimer);this._progressTimer=null;this._hidePlaybackStrip();const bus=this._sightDemoBus;this._sightDemoBus=null;if(bus&&AudioEngine.ctx){const now=AudioEngine.ctx.currentTime;try{bus.gain.cancelScheduledValues(now);bus.gain.setValueAtTime(Math.max(.0001,bus.gain.value),now);bus.gain.exponentialRampToValueAtTime(.0001,now+.025);setTimeout(()=>bus.disconnect(),90);}catch(error){}}
    const button=document.getElementById('sight-demo');if(button){button.textContent='标准示范';button.classList.remove('playing');}
};
SightSinging._scheduleSightDemo=function(callback){const master=AudioEngine.masterGainNode,bus=AudioEngine.ctx.createGain();bus.gain.value=1;bus.connect(master);this._sightDemoBus=bus;AudioEngine.masterGainNode=bus;try{callback();}finally{AudioEngine.masterGainNode=master;}return bus;};
SightSinging.playSequence=async function(){
    if(!this.demoUnlocked){toast('唱完以后再听标准示范');return;}if(this._sightDemoPlaying){this.cancelSightAudio();return;}this.cancelSightAudio();const token=++this._sightTransportToken,e=this.exercise,sequence=this._practiceSequence();if(!e||!sequence.durations.length)return;try{if(!AudioEngine.ctx)await AudioEngine.init();if(this.setup().training!=='rhythm')await AudioEngine.prepareInstrument(sequence.midis.filter(Number.isFinite),'practice');}catch(error){toast('示范音频暂未就绪，请重试');return;}if(token!==this._sightTransportToken)return;
    const bpm=this.effectiveBpm(),quarter=60/bpm,duration=sequence.beats*quarter,start=AudioEngine.ctx.currentTime+.28;this._sightDemoPlaying=true;const button=document.getElementById('sight-demo');if(button){button.textContent='停止示范';button.classList.add('playing');}this.startPlaybackProgress(duration*1000,'标准示范');if(SightMetronome.playing)SightMetronome.syncAt(start);
    const demoBus=this._scheduleSightDemo(()=>{let at=0;sequence.durations.forEach((value,index)=>{const midi=sequence.midis[index];if(this.setup().training==='rhythm'){if(Number.isFinite(midi))AudioEngine.playTheoryRhythmHit(start+at,true,.52);}else if(Number.isFinite(midi))AudioEngine.playInstrument(midi,Math.max(.18,value*quarter*.9),.22,'practice',start+at);at+=value*quarter;});});await sleep((start-AudioEngine.ctx.currentTime+duration)*1000+120);if(token!==this._sightTransportToken)return;try{demoBus.disconnect();}catch(error){}if(this._sightDemoBus===demoBus)this._sightDemoBus=null;this._sightDemoPlaying=false;if(button){button.textContent='标准示范';button.classList.remove('playing');}this.stopPlaybackProgress(`示范完成 · ♩=${bpm}`);
};
SightSinging.playDo=async function(){this.cancelSightAudio();if(!this.exercise)return;if(!AudioEngine.ctx)await AudioEngine.init();const midi=this.rootMidi();await AudioEngine.prepareInstrument([midi],'practice');AudioEngine.playInstrument(midi,1.15,.27,'practice');const hint=document.getElementById('sight-prep-hint');if(hint)hint.textContent=`提示 Do：${midiToName(midi)}`;};
SightSinging.playLa=async function(){this.cancelSightAudio();if(!this.exercise)return;if(!AudioEngine.ctx)await AudioEngine.init();const template=MusicTheory.scaleTemplates[this.exercise.mode]||MusicTheory.scaleTemplates.Major,midi=this.rootMidi()+(template[5]??9);await AudioEngine.prepareInstrument([midi],'practice');AudioEngine.playInstrument(midi,1.15,.25,'practice');const hint=document.getElementById('sight-prep-hint');if(hint)hint.textContent=`提示 La：${midiToName(midi)}`;};
const sightStartRecordV1352=SightSinging.startRecord.bind(SightSinging),sightNextPhraseV1352=SightSinging.nextPhrase.bind(SightSinging),sightNextV1352=SightSinging.next.bind(SightSinging),sightLengthV1352=SightSinging.setPracticeLength.bind(SightSinging),sightNotationV1352=SightSinging.setNotation?.bind(SightSinging),sightModeV1352=SightSinging.setMode.bind(SightSinging);
SightSinging.startRecord=async function(){this.cancelSightAudio();return sightStartRecordV1352();};
SightSinging.nextPhrase=function(delta){if(!this.recording)this.cancelSightAudio();return sightNextPhraseV1352(delta);};
SightSinging.next=function(delta=1,replace=false){if(!this.recording)this.cancelSightAudio();return sightNextV1352(delta,replace);};
SightSinging.setPracticeLength=function(value){this.cancelSightAudio();return sightLengthV1352(value);};
if(sightNotationV1352)SightSinging.setNotation=function(value){this.cancelSightAudio();return sightNotationV1352(value);};
SightSinging.setMode=function(mode){if(mode!=='sight')this.cancelSightAudio();return sightModeV1352(mode);};
SightSinging.showLibraryInfo=function(){const melody=SightCurriculum.catalog.filter(item=>item.training!=='rhythm').length,rhythm=SightCurriculum.catalog.length-melody;document.getElementById('sight-library-modal')?.remove();const modal=document.createElement('div');modal.id='sight-library-modal';modal.className='practice-modal release-modal';modal.innerHTML=`<div class="practice-modal-card"><h3>本地视唱曲库</h3><p class="release-modal-note">共 ${SightCurriculum.catalog.length} 首／组离线练习：${melody} 首旋律、${rhythm} 组节奏／鼓谱。曲库只使用公版、CC0 与音乐工具箱 Ultra 原创资料；现代版权旋律不会擅自完整收录。</p><p class="release-modal-note">“练习长度”统一控制谱面、录音、标准示范和随谱节拍器；可用上一句／下一句或在谱面边缘横向滑动继续练习。</p><div class="release-actions"><button onclick="document.getElementById('sight-library-modal').remove()">关闭</button><button class="primary" onclick="document.getElementById('sight-library-modal').remove()">知道了</button></div></div>`;document.body.appendChild(modal);};

/* ---------- 调式筛选、规范简谱与三类谱面统一缩放 ---------- */
const SIGHT_MODE_OPTIONS=[['Major','大调'],['Natural Minor','自然小调'],['Harmonic Minor','和声小调'],['Melodic Minor','旋律小调'],['Dorian','多利亚'],['Phrygian','弗里几亚'],['Lydian','利底亚'],['Mixolydian','混合利底亚']];
SightSinging.modeFilters=(function(){try{const saved=JSON.parse(localStorage.getItem('music_toolbox_sight_mode_filters_v1353'));if(Array.isArray(saved)&&saved.some(mode=>SIGHT_MODE_OPTIONS.some(([value])=>value===mode)))return saved.filter(mode=>SIGHT_MODE_OPTIONS.some(([value])=>value===mode));}catch(error){}return ['Major','Natural Minor'];})();
SightSinging.modeFilterLabel=function(){const selected=this.modeFilters||[];if(selected.length===2&&selected.includes('Major')&&selected.includes('Natural Minor'))return'大小调混合';if(selected.length===SIGHT_MODE_OPTIONS.length)return'全部调式随机';if(selected.length===1)return SIGHT_MODE_OPTIONS.find(([value])=>value===selected[0])?.[1]||selected[0];return `${selected.length} 种调式随机`;};
SightSinging.syncModeFilterUI=function(){const button=document.getElementById('sight-mode-filter-open'),hidden=document.getElementById('sight-scale');if(button){button.textContent=`${this.modeFilterLabel()} ›`;button.title='筛选题库调式；不会把原曲强制改成其他调式';}if(hidden)hidden.value='auto';};
SightSinging.openModeFilter=function(){
    document.getElementById('sight-mode-filter-modal')?.remove();const selected=new Set(this.modeFilters),modal=document.createElement('div');modal.id='sight-mode-filter-modal';modal.className='practice-modal release-modal';modal.innerHTML=`<div class="practice-modal-card"><h3>筛选视唱调式</h3><p class="release-modal-note">这里只筛选题目，不改写原曲调式。出题会在勾选的调式中随机；默认使用大调＋自然小调。</p><div class="sight-mode-presets"><button type="button" onclick="SightSinging.setModeFilterPreset('basic')">大小调混合</button><button type="button" onclick="SightSinging.setModeFilterPreset('all')">全部调式</button></div><div class="sight-mode-filter-grid">${SIGHT_MODE_OPTIONS.map(([value,label])=>`<label><input type="checkbox" value="${escapeHtml(value)}" ${selected.has(value)?'checked':''}><span>${escapeHtml(label)}</span><small>${escapeHtml(value)}</small></label>`).join('')}</div><div class="release-actions"><button onclick="document.getElementById('sight-mode-filter-modal').remove()">取消</button><button class="primary" onclick="SightSinging.applyModeFilter()">应用筛选</button></div></div>`;document.body.appendChild(modal);
};
SightSinging.setModeFilterPreset=function(preset){const wanted=preset==='all'?new Set(SIGHT_MODE_OPTIONS.map(([value])=>value)):new Set(['Major','Natural Minor']);document.querySelectorAll('#sight-mode-filter-modal input[type="checkbox"]').forEach(input=>{input.checked=wanted.has(input.value);});};
SightSinging.applyModeFilter=function(){const selected=[...document.querySelectorAll('#sight-mode-filter-modal input[type="checkbox"]:checked')].map(input=>input.value);if(!selected.length){toast('请至少选择一种调式');return;}this.modeFilters=selected;try{localStorage.setItem('music_toolbox_sight_mode_filters_v1353',JSON.stringify(selected));}catch(error){}document.getElementById('sight-mode-filter-modal')?.remove();this.syncModeFilterUI();this.next(1,true);};
const sightSetupV1353=SightSinging.setup.bind(SightSinging);
SightSinging.setup=function(){return {...sightSetupV1353(),scale:'auto',modeFilters:[...this.modeFilters]};};
SightSinging.build=function(index){
    const setup=this.setup(),trainingPool=SightCurriculum.catalog.filter(item=>setup.training==='rhythm'?item.training==='rhythm':item.training!=='rhythm'),selected=setup.training==='rhythm'?[]:this.modeFilters,filtered=selected.length?trainingPool.filter(item=>selected.includes(item.mode)):trainingPool;
    const selectedGenerated=()=>{let generated=SightCurriculum.makeOriginal(Math.abs(index)+900,setup.training==='rhythm',setup.meter);if(setup.training==='rhythm'||!selected.length||selected.includes(generated.mode))return generated;const targetMode=selected[Math.abs(index)%selected.length],from=MusicTheory.scaleTemplates[generated.mode]||MusicTheory.scaleTemplates.Major,to=MusicTheory.scaleTemplates[targetMode]||MusicTheory.scaleTemplates.Major,mapSequence=sequence=>sequence.map(([interval,duration,rest])=>{if(rest||interval===null)return [null,duration,1];const octave=Math.floor(interval/12),pitch=((interval%12)+12)%12,degree=from.indexOf(pitch);return [(degree>=0?(to[degree]??pitch):pitch)+octave*12,duration];});generated={...generated,id:`${generated.id}-${targetMode.replace(/\s+/g,'-').toLowerCase()}`,mode:targetMode,source:`${generated.source} · 所选调式原创补充`,seq:mapSequence(generated.seq)};generated.phrases=splitPhrases(generated.seq,generated.meter,2);return generated;};
    let source;if(setup.source==='generated'||(!filtered.length&&setup.training!=='rhythm'))source=selectedGenerated();else{const pool=filtered.length?filtered:trainingPool;source=pool[((index%pool.length)+pool.length)%pool.length];}
    const exercise=JSON.parse(JSON.stringify(source)),originalRoot=exercise.originalRoot??exercise.root,targetRoot=this._resolveRoot(setup.key,originalRoot,index);exercise.originalRoot=originalRoot;exercise.root=targetRoot;const phrases=(exercise.phrases||splitPhrases(exercise.seq,exercise.meter,2)).map(cloneSequence);exercise.fullPhrases=phrases;exercise.fullSeq=phrases.flatMap(cloneSequence);exercise.currentPhrase=0;exercise.sourceBars=Math.max(1,Math.ceil(sequenceBeats(exercise.fullSeq)/meterQuarterBeats(exercise.meter)));const tempo=setup.tempoMode==='manual'?{bpm:setup.bpm,label:'手动练习速度'}:this.recommendedTempo(exercise);exercise.baseBpm=tempo.bpm;exercise.bpm=this.effectiveBpm(exercise);exercise.tempoSource=tempo.label;exercise.tempoMode=setup.tempoMode;SightCurriculum.applySegment(exercise,this.practiceLength,0);return exercise;
};
SightSinging._jianpuDuration=function(value){const duration=Math.max(.0625,Number(value)||1),bases=[4,2,1,.5,.25,.125],dottedBase=bases.find(base=>Math.abs(duration-base*1.5)<.025),base=dottedBase||duration,triplet=[1/3,2/3,4/3].some(item=>Math.abs(duration-item)<.025),beams=base<.1875?3:base<.375?2:base<.75?1:0,extensions=base>=1.75?Math.max(1,Math.round(base)-1):0;return {duration,dotted:!!dottedBase,triplet,beams,extensions};};
SightSinging._jianpuNote=function(number,duration,octave=0,rest=false){const rhythm=this._jianpuDuration(duration),dots=octave>0?`<i class="jianpu-octave above">${'·'.repeat(Math.min(3,octave))}</i>`:octave<0?`<i class="jianpu-octave below">${'·'.repeat(Math.min(3,-octave))}</i>`:'',extensions=Array.from({length:rhythm.extensions},()=>'<i class="jianpu-extension">—</i>').join('');return `<span class="jianpu-note${rest?' rest':''}" aria-label="${rest?'休止符':`${number} 级音`}，${rhythm.duration} 拍"><span class="jianpu-pitch beams-${rhythm.beams}">${dots}<b>${number}</b>${rhythm.dotted?'<i class="jianpu-dot">·</i>':''}${rhythm.triplet?'<i class="jianpu-triplet">3</i>':''}</span>${extensions}</span>`;};
const sightRenderScoreV1353=SightSinging.renderScore.bind(SightSinging);
SightSinging.renderScore=function(){
    const notation=document.getElementById('sight-notation')?.value||'staff',exercise=this.exercise,box=document.getElementById('sight-score');if(notation!=='jianpu')return sightRenderScoreV1353();if(!exercise||!box)return;const template=MusicTheory.scaleTemplates[exercise.mode]||MusicTheory.scaleTemplates.Major,beats=meterQuarterBeats(exercise.meter),baseWidth=Math.max(660,exercise.midis.length*54+130);let cursor=0;const notes=exercise.midis.map((midi,index)=>{const duration=exercise.durations[index],rest=!Number.isFinite(midi),raw=rest?0:midi-(60+exercise.root),pitch=((raw%12)+12)%12,degree=template.indexOf(pitch),number=rest?'0':degree>=0?degree+1:'·',octave=rest?0:Math.floor(raw/12),bar=cursor>0&&Math.abs(cursor/beats-Math.round(cursor/beats))<.001?'<b class="jianpu-bar">│</b>':'';cursor+=duration;return `${bar}${this._jianpuNote(number,duration,octave,rest)}`;}).join('');box.innerHTML=`<div class="sight-jianpu" data-base-width="${baseWidth}" role="img" aria-label="简谱，${exercise.bars} 小节"><b class="jianpu-bar">│</b>${notes}<b class="jianpu-bar final">║</b></div>`;requestAnimationFrame(()=>this.applyScoreZoom());
};
SightSinging.applyScoreZoom=function(){const box=document.getElementById('sight-score'),output=document.getElementById('sight-score-zoom-value'),target=box?.querySelector('svg,.sight-jianpu');if(output)output.textContent=`${this.scoreZoom}%`;if(!box||!target)return;const svg=target.tagName?.toLowerCase()==='svg',base=svg?Math.max(660,Number(target.viewBox?.baseVal?.width)||660):Math.max(620,Number(target.dataset.baseWidth)||620),pixels=Math.round(base*this.scoreZoom/100);target.style.setProperty('width',`max(100%, ${pixels}px)`,'important');target.style.setProperty('min-width',`${pixels}px`,'important');};

/* 随谱节拍器独占视唱速度；示范只等待下一小节，不重置正在运行的点击流。 */
SightMetronome._measureDuration=function(){return this._groups().reduce((sum,_,index)=>sum+this._duration(index),0);};
SightMetronome._restartAt=function(time){clearTimeout(this.timer);this._generation++;this.nextTime=Math.max(Number(time)||0,AudioEngine.ctx.currentTime+.03);this.beat=0;this._loop(this._generation);return this.nextTime;};
SightMetronome.nextMeasureTime=function(minLead=.09){if(!this.playing||!AudioEngine.ctx)return (AudioEngine.ctx?.currentTime||0)+Math.max(.03,minLead);const groups=this._groups(),count=Math.max(1,groups.length),now=AudioEngine.ctx.currentTime;let time=this.nextTime,index=((this.beat%count)+count)%count;if(index!==0)for(let beat=index;beat<count;beat++)time+=this._duration(beat);const measure=Math.max(.05,this._measureDuration());while(time<now+Math.max(.03,minLead))time+=measure;return time;};
SightMetronome.start=async function(){if(this.playing){this.updateButton();return;}if(Metro.playing)Metro.stop();if(!AudioEngine.ctx)await AudioEngine.init();else if(AudioEngine.ctx.state==='suspended')await AudioEngine.ctx.resume();await Metro._prepareCurrentSounds?.();this.playing=true;this._restartAt(AudioEngine.ctx.currentTime+.06);this.updateButton();};
SightMetronome.syncAt=function(time){if(this.playing)return this.nextMeasureTime(Math.max(.03,(Number(time)||0)-AudioEngine.ctx.currentTime));this.playing=true;return this._restartAt(time);};
SightMetronome.refresh=function(){if(!this.playing){this.updateButton();return;}const count=Math.max(1,this._groups().length);this.beat=((this.beat%count)+count)%count;this.updateButton();};
SightSinging.playSequence=async function(){
    if(!this.demoUnlocked){toast('唱完以后再听标准示范');return;}if(this._sightDemoPlaying){this.cancelSightAudio();return;}this.cancelSightAudio();const token=++this._sightTransportToken,exercise=this.exercise,sequence=this._practiceSequence();if(!exercise||!sequence.durations.length)return;try{if(!AudioEngine.ctx)await AudioEngine.init();if(this.setup().training!=='rhythm')await AudioEngine.prepareInstrument(sequence.midis.filter(Number.isFinite),'practice');}catch(error){toast('示范音频暂未就绪，请重试');return;}if(token!==this._sightTransportToken)return;
    const bpm=this.effectiveBpm(),quarter=60/bpm,duration=sequence.beats*quarter,start=SightMetronome.playing?SightMetronome.nextMeasureTime(.1):AudioEngine.ctx.currentTime+.28,wait=Math.max(0,start-AudioEngine.ctx.currentTime);this._sightDemoPlaying=true;const button=document.getElementById('sight-demo');if(button){button.textContent='停止示范';button.classList.add('playing');}this.startPlaybackProgress((wait+duration)*1000,SightMetronome.playing?'示范等待下一小节进入':'标准示范');
    const demoBus=this._scheduleSightDemo(()=>{let at=0;sequence.durations.forEach((value,index)=>{const midi=sequence.midis[index];if(this.setup().training==='rhythm'){if(Number.isFinite(midi))AudioEngine.playTheoryRhythmHit(start+at,true,.52);}else if(Number.isFinite(midi))AudioEngine.playInstrument(midi,Math.max(.18,value*quarter*.9),.22,'practice',start+at);at+=value*quarter;});});await sleep((start-AudioEngine.ctx.currentTime+duration)*1000+120);if(token!==this._sightTransportToken)return;try{demoBus.disconnect();}catch(error){}if(this._sightDemoBus===demoBus)this._sightDemoBus=null;this._sightDemoPlaying=false;if(button){button.textContent='标准示范';button.classList.remove('playing');}this.stopPlaybackProgress(`示范完成 · ♩=${bpm}`);
};

/* ---------- 可命名、可回忆的本地自定义调弦 ---------- */
const CustomTuningLibrary={
    key:'music_toolbox_custom_tunings_v1353',usageKey:'music_toolbox_special_tuning_usage_v1353',
    list(){try{const records=JSON.parse(localStorage.getItem(this.key));return Array.isArray(records)?records.filter(item=>item&&Array.isArray(item.notes)&&item.notes.length>=4):[];}catch(error){return []; }},
    write(records){try{localStorage.setItem(this.key,JSON.stringify(records));}catch(error){}return records;},
    sorted(){return this.list().sort((a,b)=>(Number(b.uses)||0)-(Number(a.uses)||0)||(Number(b.lastUsed)||0)-(Number(a.lastUsed)||0)||(Number(b.updatedAt)||0)-(Number(a.updatedAt)||0));},
    upsert(name,notes,id=null){const records=this.list(),now=Date.now(),cleanName=String(name||'').trim()||`自定义调弦 ${records.length+1}`,cleanNotes=notes.map(note=>String(note));let index=id?records.findIndex(item=>item.id===id):-1;if(index<0)index=records.findIndex(item=>item.name===cleanName&&JSON.stringify(item.notes)===JSON.stringify(cleanNotes));const previous=records[index],record={id:previous?.id||`ct-${now.toString(36)}-${Math.random().toString(36).slice(2,7)}`,name:cleanName,notes:cleanNotes,uses:(Number(previous?.uses)||0)+1,lastUsed:now,createdAt:previous?.createdAt||now,updatedAt:now};if(index<0)records.push(record);else records[index]=record;this.write(records);return record;},
    touch(id){const records=this.list(),index=records.findIndex(item=>item.id===id);if(index<0)return null;records[index]={...records[index],uses:(Number(records[index].uses)||0)+1,lastUsed:Date.now()};this.write(records);return records[index];},
    remove(id){const records=this.list(),next=records.filter(item=>item.id!==id);this.write(next);return next.length!==records.length;},
    get(id){return this.list().find(item=>item.id===id)||null;},
    usage(){try{return JSON.parse(localStorage.getItem(this.usageKey))||{};}catch(error){return {}; }},
    touchBuiltIn(id){const usage=this.usage(),previous=usage[id]||{};usage[id]={uses:(Number(previous.uses)||0)+1,lastUsed:Date.now()};try{localStorage.setItem(this.usageKey,JSON.stringify(usage));}catch(error){}return usage[id];}
};
window.CustomTuningLibrary=CustomTuningLibrary;

const tunerUpdateBarV1353=Tuner.updateTuningBar.bind(Tuner);
Tuner.updateTuningBar=function(){const result=tunerUpdateBarV1353();if(this.presetName==='__custom__'&&this.customTuning){const name=document.getElementById('tb-name'),detail=document.getElementById('tb-en');if(name)name.textContent=this.customTuningName||'自定义调弦';if(detail)detail.textContent=this.customTuning.map(enharmonicFull).join(' ');}return result;};
CustomTuningEditor.editingId=null;CustomTuningEditor.pendingName='';CustomTuningEditor.pendingNotes=null;
CustomTuningEditor.capture=function(){const modal=document.getElementById('release-custom-tuning-modal');if(!modal)return null;const notes=[];for(let index=0;index<this.count;index++){const pitch=document.getElementById(`release-tuning-note-${index}`),octave=document.getElementById(`release-tuning-octave-${index}`);if(pitch&&octave)notes.push(`${pitch.value}${octave.value}`);}return {name:document.getElementById('release-tuning-name')?.value||this.pendingName,notes};};
CustomTuningEditor.open=function(target='tuner',forceCount=null,preset=null){
    const carry=this.capture();this.target=target;if(preset){this.editingId=preset.id||null;this.pendingName=preset.name||'';this.pendingNotes=[...(preset.notes||[])];}else if(carry){this.pendingName=carry.name;this.pendingNotes=carry.notes;}else{this.editingId=null;this.pendingName=Tuner.customTuningName||'';this.pendingNotes=null;}
    document.getElementById('release-custom-tuning-modal')?.remove();const source=this.pendingNotes||this.source(target),count=forceCount?clamp(forceCount,4,8):(source.length||6);this.count=count;const rows=Array.from({length:count},(_,index)=>{const match=String(source[index]||'E2').match(/^([A-G](?:#|b|♯|♭)?)(-?\d+)$/),pitch=normalizePitchClass(match?.[1]||'E'),octave=match?.[2]||'2';return `<label class="custom-tuning-row"><strong>${count-index} 弦</strong><select id="release-tuning-note-${index}">${NOTE_CHOICES.map(([value,label])=>`<option value="${value}" ${value===pitch?'selected':''}>${label}</option>`).join('')}</select><select id="release-tuning-octave-${index}">${[0,1,2,3,4,5,6].map(value=>`<option value="${value}" ${String(value)===String(octave)?'selected':''}>${value} 组</option>`).join('')}</select></label>`;}).join(''),saved=CustomTuningLibrary.sorted().slice(0,12),defaultName=this.pendingName||`自定义调弦 ${CustomTuningLibrary.list().length+1}`;
    const savedHtml=saved.length?`<div class="custom-tuning-saved"><strong>已保存调弦</strong>${saved.map(item=>`<div class="custom-tuning-saved-row" data-custom-id="${escapeHtml(item.id)}"><span><b>${escapeHtml(item.name)}</b><small>${item.notes.map(enharmonicFull).join(' ')} · 使用 ${Number(item.uses)||0} 次</small></span><button type="button" onclick="CustomTuningEditor.openSaved('${escapeHtml(item.id)}','${escapeHtml(target)}')">载入／重命名</button><button type="button" class="danger" onclick="CustomTuningEditor.deleteSaved('${escapeHtml(item.id)}')">删除</button></div>`).join('')}</div>`:'';
    const modal=document.createElement('div');modal.id='release-custom-tuning-modal';modal.className='practice-modal release-modal';modal.innerHTML=`<div class="practice-modal-card"><h3>${this.editingId?'编辑自定义调弦':'自定义调弦'}</h3><p class="release-modal-note">命名后保存到本机；特殊调弦搜索会优先显示最近、最常使用的自定义方案。</p><label class="release-form-row"><span>名称</span><input id="release-tuning-name" type="text" maxlength="36" value="${escapeHtml(defaultName)}" placeholder="例如：我的 DADGAD"></label><label class="release-form-row"><span>弦数</span><select onchange="CustomTuningEditor.open('${escapeHtml(target)}',this.value)">${[4,5,6,7,8].map(value=>`<option value="${value}" ${value===count?'selected':''}>${value} 弦</option>`).join('')}</select></label><div class="custom-tuning-rows">${rows}</div>${savedHtml}<div class="release-actions"><button onclick="CustomTuningEditor.close()">取消</button><button class="primary" onclick="CustomTuningEditor.apply()">保存并应用</button></div></div>`;document.body.appendChild(modal);
};
CustomTuningEditor.openSaved=function(id,target='tuner'){const item=CustomTuningLibrary.get(id);if(item)this.open(target,item.notes.length,item);};
CustomTuningEditor.deleteSaved=function(id){const item=CustomTuningLibrary.get(id);if(!item)return;if(typeof confirm==='function'&&!confirm(`删除“${item.name}”？`))return;CustomTuningLibrary.remove(id);if(this.editingId===id){this.editingId=null;this.pendingName='';this.pendingNotes=null;}this.open(this.target,this.count);toast('已删除本地自定义调弦');};
CustomTuningEditor._applyNotes=function(notes,name,target=this.target){
    SharedCustomTuning.save(notes);
    if(target==='tuner'){Tuner.customTuning=notes;Tuner.customTuningName=name;Tuner.customStringCount=notes.length;Tuner.setPreset('__custom__');Tuner.loadPresets();Tuner.updateTuningBar();Tuner.closePicker?.();}
    else if(target==='chord'){ChordLib.customTuning=notes;ChordLib.customStringCount=notes.length;ChordLib.tuningName='__custom__';ChordLib.spider=CapoEngine.ensure(ChordLib.spider,notes.length);ChordLib.generate();ChordLib.renderTuningVisual();}
    else if(target==='explore'){ChordExplore.customTuning=notes;ChordExplore.customStringCount=notes.length;ChordExplore.tuningName='__custom__';ChordExplore.spider=CapoEngine.ensure(ChordExplore.spider,notes.length);ChordExplore.selectedNotes=[];ChordExplore.renderTuningVisual();ChordExplore.renderFretboard();ChordExplore.updateGuess();ChordExplore.closeTuningPicker();}
    else{InstrumentPage.customTuning=notes;InstrumentPage.customStringCount=notes.length;InstrumentPage.tuningName='__custom__';InstrumentPage.heldFrets={};InstrumentPage.mutedStrings=new Set();InstrumentPage.resetChordLabel();InstrumentPage.renderTuningVisual();InstrumentPage.closeTuningPicker();InstrumentPage.render();}
    GlobalCapo.ensure(notes.length);GlobalCapo.apply(false);
};
CustomTuningEditor.apply=function(){const captured=this.capture();if(!captured?.notes.length)return;const record=CustomTuningLibrary.upsert(captured.name,captured.notes,this.editingId);this.editingId=record.id;this.pendingName=record.name;this.pendingNotes=[...record.notes];this._applyNotes(record.notes,record.name,this.target);this.close();toast(`已保存并应用：${record.name} · ${record.notes.map(enharmonicFull).join(' ')}`);};

const specialBaseRecords=[...SpecialTuningSearch.records],specialApplyV1353=SpecialTuningSearch.apply.bind(SpecialTuningSearch);
SpecialTuningSearch._customRecord=function(record){return {id:`custom:${record.id}`,customId:record.id,userDefined:true,titleZh:record.name,title:record.name,artistZh:'我的自定义',artist:'本机保存',tuning:record.notes,confidence:'custom',uses:Number(record.uses)||0,lastUsed:Number(record.lastUsed)||0,category:'本地自定义调弦'};};
SpecialTuningSearch.search=function(query=''){
    const custom=CustomTuningLibrary.sorted().map(record=>this._customRecord(record)),usage=CustomTuningLibrary.usage(),q=String(query||'').trim(),built=[...specialBaseRecords];
    if(!q)return [...custom,...built.sort((a,b)=>(Number(usage[b.id]?.uses)||0)-(Number(usage[a.id]?.uses)||0)||(Number(usage[b.id]?.lastUsed)||0)-(Number(usage[a.id]?.lastUsed)||0)||(b.confidence==='verified'?1:0)-(a.confidence==='verified'?1:0))];
    return [...custom,...built].map(item=>({item,score:this.score(item,q)+(item.userDefined?12:0)+(Number(item.uses)||Number(usage[item.id]?.uses)||0)*.15})).filter(result=>result.score>=35).sort((a,b)=>b.score-a.score||(Number(b.item.lastUsed)||0)-(Number(a.item.lastUsed)||0)).map(result=>result.item);
};
SpecialTuningSearch.render=function(query=''){
    const results=this.search(query).slice(0,200),container=document.getElementById('special-tuning-results'),count=document.getElementById('special-tuning-count'),customCount=CustomTuningLibrary.list().length;if(count)count.textContent=`自定义 ${customCount} 条 · 曲目 ${specialBaseRecords.length} 条 · 当前 ${results.length} 条`;if(!container)return;
    container.innerHTML=results.length?results.map(item=>{if(item.userDefined)return `<article class="special-tuning-card custom-result"><div><h4>${escapeHtml(item.titleZh)} <small>本机保存 · 使用 ${item.uses} 次</small><i class="special-confidence custom">我的调弦</i></h4><div class="special-tuning-notes">${item.tuning.map(note=>`<b>${escapeHtml(enharmonicFull(note))}</b>`).join('')}</div><p>应用后自动进入吉他调音器；不会改动节拍器 BPM 与拍号。</p></div><div class="special-tuning-card-actions"><button onclick="SpecialTuningSearch.apply('${escapeHtml(item.id)}')">一键应用</button><button onclick="SpecialTuningSearch.editCustom('${escapeHtml(item.customId)}')">编辑</button><button class="danger" onclick="SpecialTuningSearch.deleteCustom('${escapeHtml(item.customId)}')">删除</button></div></article>`;const label=item.confidence==='verified'?'已核实':item.confidence==='reported'?'公开记录':'练习参考',tempo=`${item.bpm?.[0]||60}–${item.bpm?.[1]||120} BPM`,source=item.source?` · <a href="${escapeHtml(item.source)}" target="_blank" rel="noopener">查看来源</a>`:'';return `<article class="special-tuning-card"><div><h4>${escapeHtml(item.titleZh||item.title)} <small>${escapeHtml(item.title||'')} · ${escapeHtml(item.artistZh||item.artist)} / ${escapeHtml(item.artist)}</small><i class="special-confidence ${item.confidence==='reference'?'reference':''}">${label}</i></h4><div class="special-tuning-notes">${(item.tuning||[]).map(note=>`<b>${escapeHtml(note)}</b>`).join('')}</div><p>${escapeHtml(item.meter||'4/4')}${item.grouping?` · ${escapeHtml(item.grouping)}`:''} · ${tempo}${item.capo?` · Capo ${item.capo}`:''} · ${escapeHtml(item.category||'六弦木吉他')}${source}${item.note?`<br>${escapeHtml(item.note)}`:''}</p></div><button onclick="SpecialTuningSearch.apply('${escapeHtml(item.id)}')">一键应用</button></article>`;}).join(''):'<div class="sample-license-note">没有匹配项。可换用自定义名称、艺人中英文名、曲名片段或六个调弦字母。</div>';
};
SpecialTuningSearch.apply=function(id){
    if(String(id).startsWith('custom:')){const customId=String(id).slice(7),item=CustomTuningLibrary.touch(customId);if(!item)return;const guitarButton=document.querySelector('#top-mode-switch button');if(Tuner.mode!=='guitar')Tuner.setMode('guitar',guitarButton);CustomTuningEditor._applyNotes(item.notes,item.name,'tuner');document.getElementById('special-tuning-modal')?.remove();toast(`已应用 ${item.name}：${item.notes.map(enharmonicFull).join(' ')}`,2800);return;}
    CustomTuningLibrary.touchBuiltIn(id);return specialApplyV1353(id);
};
SpecialTuningSearch.editCustom=function(id){const item=CustomTuningLibrary.get(id);if(item){document.getElementById('special-tuning-modal')?.remove();CustomTuningEditor.open('tuner',item.notes.length,item);}};
SpecialTuningSearch.deleteCustom=function(id){const item=CustomTuningLibrary.get(id);if(!item)return;if(typeof confirm==='function'&&!confirm(`删除“${item.name}”？`))return;CustomTuningLibrary.remove(id);this.render(document.getElementById('special-tuning-query')?.value||'');toast('已删除本地自定义调弦');};

/* ---------- 默认节拍音色、逐击点编辑状态与最低音标识 ---------- */
Object.assign(METRO_KITS.studio,{accent:'perc_snap',beat:'elec_tick',subdivision:'elec_tick',swing:'elec_tick'});
Object.assign(METRO_KITS.custom,{accent:'perc_snap',beat:'elec_tick',subdivision:'elec_tick',swing:'elec_tick'});
const metroInitV1353=Metro.init.bind(Metro);
Metro.init=function(){
    let saved=null,manualDefault=false,migrated=false;try{saved=JSON.parse(localStorage.getItem('protuner_metro_v9'));manualDefault=!!localStorage.getItem('protuner_metro_default');migrated=localStorage.getItem('music_toolbox_metro_default_v1353')==='1';}catch(error){}
    metroInitV1353();
    if(!migrated){
        const slots=saved?.slots||{},legacyAccent=JSON.stringify(slots.accent||[])===JSON.stringify(['metro_20','metro_30']),legacyStudio=!saved||(saved.kitId==='studio'&&legacyAccent&&slots.beat==='metro_30'&&slots.subdivision==='metro_30');
        if(!manualDefault&&legacyStudio){this.kitId='studio';this.slots={accent:'perc_snap',beat:'elec_tick',subdivision:'elec_tick',swing:'elec_tick'};selectValue(document.getElementById('metro-kit-select'),'studio');this.renderSoundPanel();this.renderSwingControls();this._prepareCurrentSounds();this.saveCustom();}
        try{localStorage.setItem('music_toolbox_metro_default_v1353','1');}catch(error){}
    }
};
const metroRenderSoundPanelV1353=Metro.renderSoundPanel.bind(Metro);
Metro.renderSoundPanel=function(preserveOpen=true){
    const result=metroRenderSoundPanelV1353(preserveOpen),note=document.querySelector('#metro-sound-panel .metro-kit-note');
    if(note)note.textContent='默认：第一拍以“拍手/响指”突出重拍，普通拍与次强均使用“电子 Click”；次强只提高普通拍音量，不会冒充第一拍。';
    const panel=document.getElementById('metro-sound-panel'),button=document.getElementById('metro-sound-editor-btn');if(button)button.textContent=panel?.classList.contains('open')?'收起音色':'编辑每个击点 ›';return result;
};
const metroSetSlotV1353=Metro.setSlot.bind(Metro);
Metro.setSlot=function(slot,value){const wasOpen=document.getElementById('metro-sound-panel')?.classList.contains('open');const result=metroSetSlotV1353(slot,value);if(wasOpen){document.getElementById('metro-sound-panel')?.classList.add('open');const button=document.getElementById('metro-sound-editor-btn');if(button)button.textContent='收起音色';}return result;};
const chordBuildBassV1353=ChordLib.buildBassOptions.bind(ChordLib);
ChordLib.buildBassOptions=function(){
    const result=chordBuildBassV1353(),label=document.getElementById('chord-bass-label'),shortcuts=document.getElementById('chord-bass-shortcuts'),wheel=document.getElementById('chord-bass-wheel-open');
    if(label)label.textContent='最低音／转位';const automatic=shortcuts?.querySelector('button');if(automatic){automatic.textContent='自动最低音／原位';automatic.title='默认由根音和所选和弦性质自动确定最低音；选择其他音即建立转位或斜杠和弦。';automatic.setAttribute('aria-label','自动最低音与原位和弦');}if(wheel&&!wheel.classList.contains('active'))wheel.textContent='任意最低音 · 滚轮选择';return result;
};

/* ---------- 精简渐速默认首页，内部速度与主页面完全隔离 ---------- */
Metro.ramp.mode='lite';
Metro._rampReadFields=function(){const ramp=this.ramp;if(ramp.mode==='range'){ramp.start=this._rampNumber('ramp-start',ramp.start,30,300);ramp.target=this._rampNumber('ramp-target',ramp.target,30,300);ramp.step=this._rampNumber('ramp-step',ramp.step,1,30);ramp.interval=this._rampNumber('ramp-interval',ramp.interval,1,600);}else ramp.interval=clamp(Number(document.getElementById('ramp-lite-interval')?.value)||ramp.interval||5,1,600);};
Metro._rampUpdateDerived=function(){this._rampReadFields();const ramp=this.ramp,steps=Math.ceil(Math.abs(ramp.target-ramp.start)/Math.max(1,ramp.step)),duration=steps*ramp.interval,output=document.getElementById('ramp-duration'),lite=document.getElementById('ramp-lite-interval-display'),restore=document.getElementById('ramp-restore-button');if(output)output.textContent=this._rampFormatTime(duration);if(lite)lite.textContent=`${ramp.interval} 秒`;if(restore)restore.textContent=`↶ 撤回到 ${ramp.mode==='range'?ramp.start:ramp.baseline} BPM`;};
Metro._rampUpdateUI=function(message=''){
    const ramp=this.ramp,current=document.getElementById('ramp-current'),state=document.getElementById('ramp-state'),bar=document.getElementById('ramp-progress'),start=document.getElementById('ramp-start-button');if(current)current.textContent=String(Math.round(ramp.current));let progress=0;if(ramp.mode==='range')progress=Math.abs(ramp.current-ramp.start)/Math.max(1,Math.abs(ramp.target-ramp.start));else if(ramp.running)progress=1-clamp((ramp.nextChangeAt-performance.now())/(ramp.interval*1000),0,1);if(bar)bar.style.width=`${clamp(progress,0,1)*100}%`;if(state)state.textContent=message||(ramp.mode==='lite'?`每 ${ramp.interval} 秒自动 +1 BPM`:`${ramp.start} → ${ramp.target} · 每 ${ramp.interval} 秒变化 ${ramp.step} BPM`);if(start)start.textContent=ramp.running?'Ⅱ 暂停':ramp.completed?'↻ 重新开始':ramp.started?'▶ 继续':'▶ 开始';this._rampUpdateDerived();
};
Metro.adjustLiteInterval=function(delta){const ramp=this.ramp;ramp.interval=clamp((Number(ramp.interval)||5)+(Number(delta)||0),1,600);const input=document.getElementById('ramp-lite-interval');if(input)input.value=String(ramp.interval);if(ramp.running)ramp.nextChangeAt=performance.now()+ramp.interval*1000;this._rampUpdateUI(`每 ${ramp.interval} 秒自动 +1 BPM`);};
Metro.startLiteRamp=async function(){const ramp=this.ramp;if(ramp.mode!=='lite'||ramp.running)return;if(!ramp.started)ramp.current=ramp.baseline;try{if(!AudioEngine.ctx)await AudioEngine.init();else if(AudioEngine.ctx.state==='suspended')await AudioEngine.ctx.resume();await this._prepareCurrentSounds();}catch(error){this._rampUpdateUI('音频暂未就绪 · 点一次加减号后重试');return;}if(ramp.mode!=='lite'||!document.getElementById('metro-ramp-modal'))return;ramp.running=true;ramp.started=true;ramp.completed=false;ramp.generation++;ramp.beat=0;ramp.nextBeatTime=AudioEngine.ctx.currentTime+.06;ramp.nextChangeAt=performance.now()+ramp.interval*1000;this._rampUpdateUI();this._runRamp(ramp.generation);};
/* 供发布前回归测试读取，不参与音频调度。 */
Metro.releaseTimingSnapshot=function(signature,bpm){
    const previousSignature=this.signature,previousBpm=this.bpm;
    this.signature=signature;this.bpm=Math.max(30,Number(bpm)||120);
    const snapshot={signature,bpm:this.bpm,pulses:this._numerator(signature),secondsPerPulse:this._beatDuration(),clicksPerMinute:60/this._beatDuration(),accents:this._accentPattern()};
    this.signature=previousSignature;this.bpm=previousBpm;
    return snapshot;
};

/* v13.5 原初始化全部成功后再挂接新增状态，避免抢跑或重复初始化模块。 */
const appInitV1351=App.init.bind(App);
App.init=async function(){
    await appInitV1351();
    GlobalCapo.apply(false);
    InstrumentTone.syncButton();
    SightSinging.syncModeFilterUI();
    SightSinging.bindPhraseSwipe();
    if(SightSinging.exercise){SightSinging.updateCard();SightSinging.renderScore();}
    document.documentElement.dataset.appVersion=RELEASE_VERSION;
    document.documentElement.dataset.coreReady='true';
};

})();


/* 音乐工具箱 Ultra v13.5.8：CC0 重拍、根音刻度尺、禁弦手势与标准鼓谱。 */
(() => {
'use strict';

const RELEASE_VERSION='13.5.13';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const meterQuarterBeatsLocal=meter=>{const [numerator='4',denominator='4']=String(meter||'4/4').split('/');return Math.max(.25,(Number(numerator)||4)*4/(Number(denominator)||4));};

/* ---------- 节拍器：50 个确认并标准化的本地 CC0 音源 ---------- */
const ACCENT_SAMPLE_ROWS=[["accent_cc0_01","K01 · 明亮击头 · Synthwave","强击头与短底鼓","Freesound"],
    ["accent_cc0_02","02 · 木块强击·圆润（R02）","木质与刮奏","VCSL"],
    ["accent_cc0_03","K02 · 枫木原声底鼓 · Spaun","强击头与短底鼓","Freesound"],
    ["accent_cc0_04","K03 · Techno · 硬击","强击头与短底鼓","Freesound"],
    ["accent_cc0_05","K04 · Deep House · MPC 质感","强击头与短底鼓","Freesound"],
    ["accent_cc0_06","N02 · 响棒 2 · 轻击","木质与刮奏","VCSL"],
    ["accent_cc0_07","N01 · 响棒 1 · 轻击","木质与刮奏","VCSL"],
    ["accent_cc0_08","N03 · 牛铃 · 敲击","金属与铃类","VCSL"],
    ["accent_cc0_09","N04 · 牛铃 · 制音","金属与铃类","VCSL"],
    ["accent_cc0_10","N05 · 铃鼓 1 · 敲击","手拍与摇奏","VCSL"],
    ["accent_cc0_11","N07 · 三角铁 · 制音","金属与铃类","VCSL"],
    ["accent_cc0_12","N08 · 三角铁 · 开放","金属与铃类","VCSL"],
    ["accent_cc0_13","N09 · 高音牛铃 · 敲击","金属与铃类","VCSL"],
    ["accent_cc0_14","N10 · 低音牛铃 · 敲击","金属与铃类","VCSL"],
    ["accent_cc0_15","N11 · 刹车鼓 · 金属槌","金属与铃类","VCSL"],
    ["accent_cc0_16","N12 · 卡巴萨 · 敲击","手拍与摇奏","VCSL"],
    ["accent_cc0_17","N14 · 手拍 · 亮","手拍与摇奏","VCSL"],
    ["accent_cc0_18","N16 · 响棒 1 · 明亮","木质与刮奏","VCSL"],
    ["accent_cc0_19","N18 · 牛铃 · 开放","金属与铃类","VCSL"],
    ["accent_cc0_20","N19 · 指钹 · 清脆","金属与铃类","VCSL"],
    ["accent_cc0_21","N23 · 闭镲 · 短","鼓组核心","VCSL"],
    ["accent_cc0_22","N24 · 闭镲 · 边缘","鼓组核心","VCSL"],
    ["accent_cc0_23","N26 · 开镲 · 短","鼓组核心","VCSL"],
    ["accent_cc0_24","N34 · 三角铁 3 · 制音","金属与铃类","VCSL"],
    ["accent_cc0_25","N39 · 木鱼 · 强","木质与刮奏","VCSL"],
    ["accent_cc0_26","N57 · 军鼓 · 强击","鼓组核心","VCSL"],
    ["accent_cc0_27","N06 · 铃鼓 1 · 摇动","手拍与摇奏","VCSL"],
    ["accent_cc0_28","N13 · 卡巴萨 · 摩擦","手拍与摇奏","VCSL"],
    ["accent_cc0_29","N15 · 独拍 · 软","手拍与摇奏","VCSL"],
    ["accent_cc0_30","N17 · 牛铃 · 明亮","金属与铃类","VCSL"],
    ["accent_cc0_31","N22 · 尼泊尔手铃","金属与铃类","VCSL"],
    ["accent_cc0_32","N25 · 松镲 · 轻","鼓组核心","VCSL"],
    ["accent_cc0_33","N27 · 大摇铃 · 敲击","手拍与摇奏","VCSL"],
    ["accent_cc0_34","N28 · 大摇铃 · 下摇","手拍与摇奏","VCSL"],
    ["accent_cc0_35","N29 · 小摇铃 · 双下","手拍与摇奏","VCSL"],
    ["accent_cc0_36","N30 · 小摇铃 · 拍击","手拍与摇奏","VCSL"],
    ["accent_cc0_37","N31 · 铃鼓 2 · 敲击","手拍与摇奏","VCSL"],
    ["accent_cc0_38","N32 · 铃鼓 2 · 摇动","手拍与摇奏","VCSL"],
    ["accent_cc0_39","N33 · 铃鼓 3 · 上摇","手拍与摇奏","VCSL"],
    ["accent_cc0_40","N36 · 木缝鼓 · 高","木质与刮奏","VCSL"],
    ["accent_cc0_41","N38 · 木鱼 · 轻","木质与刮奏","VCSL"],
    ["accent_cc0_42","N42 · 邦戈高音 · 开放","手鼓与民族鼓","VCSL"],
    ["accent_cc0_43","N43 · 邦戈高音 · 制音","手鼓与民族鼓","VCSL"],
    ["accent_cc0_44","N46 · 康加 · 指击","手鼓与民族鼓","VCSL"],
    ["accent_cc0_45","N50 · 达布卡 1 · 轻","手鼓与民族鼓","VCSL"],
    ["accent_cc0_46","N51 · 达布卡 2 · 轻","手鼓与民族鼓","VCSL"],
    ["accent_cc0_47","N52 · 达布卡 3 · 轻","手鼓与民族鼓","VCSL"],
    ["accent_cc0_48","N58 · 军鼓 · 无响弦","鼓组核心","VCSL"],
    ["accent_cc0_49","N59 · 军鼓 · 边击","鼓组核心","VCSL"],
    ["accent_cc0_50","N60 · 军鼓 2 · 强击","鼓组核心","VCSL"]];
const ACCENT_SAMPLE_META=Object.fromEntries(ACCENT_SAMPLE_ROWS.map(([id,label,family,source],index)=>[
    id,{id,label,family,source,url:window.MTU_ACCENT_INLINE_URLS?.[id]||`./assets/metronome-accent-cc0/${String(index+1).padStart(2,'0')}.wav`}
]));
window.MTU_ACCENT_SAMPLE_META=ACCENT_SAMPLE_META;

const clickAssetBeforeV1354=AudioEngine._clickAsset.bind(AudioEngine);
AudioEngine._clickAsset=function(soundType){return ACCENT_SAMPLE_META[soundType]?soundType:clickAssetBeforeV1354(soundType);};
// 短击音不用含尾部静音的整段 RMS；只平衡最响 50 ms，最多衰减 6 dB，不追加增益。
AudioEngine.balanceAccentSample=function(buffer){
    const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i)),windowSize=Math.max(1,Math.round(buffer.sampleRate*.05));
    let sum=0,maxPower=0;
    for(let i=0;i<buffer.length;i++){for(const data of channels){sum+=data[i]*data[i]/channels.length;if(i>=windowSize)sum-=data[i-windowSize]*data[i-windowSize]/channels.length;}maxPower=Math.max(maxPower,sum/windowSize);}
    return Math.max(.5,Math.min(1,.25/Math.max(.0001,Math.sqrt(maxPower))));
};
AudioEngine.loadAccentSample=async function(name){
    const meta=ACCENT_SAMPLE_META[name];if(!this.ctx||!meta)return null;
    if(this.sampleBuffers.has(name))return this.sampleBuffers.get(name);
    if(this.samplePromises.has(name))return this.samplePromises.get(name);
    const promise=(async()=>{
        const response=await fetch(meta.url,{cache:'force-cache'});if(!response.ok)throw new Error(`${response.status} ${meta.url}`);
        const bytes=await response.arrayBuffer(),buffer=await this.ctx.decodeAudioData(bytes.slice(0));
        // 44.1→48 kHz 插值可能产生超过文件峰值的样本；只衰减重采样过冲。
        let peak=0;for(let channel=0;channel<buffer.numberOfChannels;channel++)for(const value of buffer.getChannelData(channel))peak=Math.max(peak,Math.abs(value));
        if(peak>1)for(let channel=0;channel<buffer.numberOfChannels;channel++){const data=buffer.getChannelData(channel);for(let i=0;i<data.length;i++)data[i]/=peak;}
        meta.balance=this.balanceAccentSample(buffer);this.sampleBuffers.set(name,buffer);return buffer;
    })().catch(error=>{console.warn('重拍采样解码失败',name,error);return null;}).finally(()=>this.samplePromises.delete(name));
    this.samplePromises.set(name,promise);return promise;
};
const prepareClickSoundsBeforeV1354=AudioEngine.prepareClickSounds.bind(AudioEngine);
AudioEngine.prepareClickSounds=async function(sounds){
    const flat=(Array.isArray(sounds)?sounds:[sounds]).flat(Infinity).filter(Boolean),accent=[...new Set(flat.filter(sound=>ACCENT_SAMPLE_META[sound]))];
    const [embedded,...loaded]=await Promise.all([prepareClickSoundsBeforeV1354(flat),...accent.map(sound=>this.loadAccentSample(sound))]);
    if(loaded.some(buffer=>!buffer))throw new Error('确认音色未能加载：'+accent.filter((id,i)=>!loaded[i]).join(', '));return embedded;
};
const playClickBeforeNormalizedKit=AudioEngine.playClick.bind(AudioEngine);
AudioEngine.playClick=function(time,accent,sound='digit',volume=null){
    const meta=ACCENT_SAMPLE_META[sound];
    if(!meta)return playClickBeforeNormalizedKit(time,accent,sound,volume);
    const buffer=this.sampleBuffers.get(sound);if(!this.ctx||!this.masterGainNode||!buffer)return false;
    if(this.ctx.state==='suspended')void this.ctx.resume();
    const when=Math.max(time??this.ctx.currentTime,this.ctx.currentTime),source=this.ctx.createBufferSource(),gain=this.ctx.createGain();
    source.buffer=buffer; // 原采样音高：不再对重拍升调，也不额外压低普通拍。
    const level=Math.max(0,Math.min(1,Number(volume??(accent?.86:.58))||0))*(meta.balance??1);
    gain.gain.setValueAtTime(level,when);
    gain.gain.setValueAtTime(level,when+Math.max(0,buffer.duration-.005));
    gain.gain.linearRampToValueAtTime(0,when+buffer.duration);
    source.connect(gain);gain.connect(this.masterGainNode);source.onended=()=>{source.disconnect();gain.disconnect();};
    source.start(when);source.stop(when+buffer.duration+.01);return true;
};
const playMetronomeBeatBeforeV1354=AudioEngine.playMetronomeBeat.bind(AudioEngine);
AudioEngine.playMetronomeBeat=function(time,accent,beatSound,accentSounds,volume=.68){
    const layers=[...new Set((Array.isArray(accentSounds)?accentSounds:[accentSounds]).filter(Boolean))];
    if(!accent||!layers.some(sound=>ACCENT_SAMPLE_META[sound]))return playMetronomeBeatBeforeV1354(time,accent,beatSound,accentSounds,volume);
    const extra=layers.filter(sound=>sound!==layers[0]&&sound!==beatSound),hasBeat=beatSound&&beatSound!==layers[0];
    // 同一拍总权重不超过 1；不重复播放相同采样，也不偷偷丢掉旧设置的混合叠层。
    this.playClick(time,true,layers[0],volume*(1-(hasBeat?.10:0)-(extra.length?.15:0)));
    if(hasBeat)this.playClick(time,false,beatSound,volume*.10);
    extra.forEach(sound=>this.playClick(time,true,sound,volume*.15/extra.length));
};

Metro.levels={strong:.86,secondary:.70,beat:.58,subdivision:.33,swing:.40,flat:.68};
Metro._subdivisionLevel=function(swing){return this.kitId==='drum_t06'?.49:swing?this.levels.swing:this.levels.subdivision;};
Metro._playMainBeat=function(index,time,strong,secondary){
    if(this.kitId==='drum_t06'&&this.signature==='4/4'&&this.accentMode==='meter'){AudioEngine.playClick(time,index===0,index===0?this.slots.accent:index===2?this.trackSounds[1]:this.slots.beat,index===0?this.levels.strong:index===2?.82:this.levels.beat);return;}
    if(this.accentMode==='flat')AudioEngine.playClick(time,false,this.slots.beat,this.levels.flat);else if(strong)AudioEngine.playMetronomeBeat(time,true,this.slots.beat,this.slots.accent,this.levels.strong);else AudioEngine.playClick(time,false,this.slots.beat,secondary?this.levels.secondary:this.levels.beat);
};
const soundForAudition=id=>Object.keys(ACCENT_SAMPLE_META).find(key=>ACCENT_SAMPLE_META[key].label.includes(id));
const kitRows=[
    ['studio','默认 · 圆润木块','R02',null,'N23','N14'],
    ['wood','木质 · 响棒','N02','N01','N16','N39'],
    ['jazz','爵士 · 边击','K02','N59','N23','N24'],
    ['acoustic','原声 · 枫木鼓组','K02','N57','N23','N26'],
    ['soft','轻柔 · 手拍','N15','N12','N29','N14'],
    ['electronic','电子 · Synthwave','K01','N57','N23','N14'],
    ['scifi','电子 · Techno','K03','N60','N24','N26'],
    ['custom','自定义','R02',null,'N23','N14'],
    ['house','电子 · Deep House','K04','N58','N25','N14'],
    ['bells','金属 · 牛铃','N03','N04','N07','N08'],
    ['handdrum','手鼓 · 邦戈','N42','N43','N46','N50']
];
for(const [id,name,accent,beat,hat,aux] of kitRows){
    const base=beat?soundForAudition(beat):'elec_tick';
    METRO_KITS[id]={name,accent:soundForAudition(accent),beat:base,subdivision:id==='studio'||id==='custom'?base:soundForAudition(hat),swing:id==='studio'||id==='custom'?base:soundForAudition(aux),tracks:[soundForAudition(id==='studio'||id==='custom'?'K02':accent),soundForAudition(beat||'N57'),soundForAudition(hat),soundForAudition(aux)]};
}
const metroLabelBeforeV1354=Metro._label.bind(Metro);
Metro._label=function(sound){return ACCENT_SAMPLE_META[sound]?.label||metroLabelBeforeV1354(sound);};
Metro._allSounds=function(){return ['elec_tick',...Object.keys(ACCENT_SAMPLE_META)];};
Metro._soundGroups=function(selected){
    const groups=new Map([['电子 Click（保留）',[{id:'elec_tick',label:this._label('elec_tick')}]]]);
    for(const item of Object.values(ACCENT_SAMPLE_META)){const list=groups.get(item.family)||[];list.push(item);groups.set(item.family,list);}
    if(selected&&!this._allSounds().includes(selected))groups.set('旧设置（仅兼容已保存选择）',[{id:selected,label:this._label(selected)}]);
    return groups;
};
Metro._options=function(selected){
    const value=Array.isArray(selected)?selected[0]:selected;
    return [...this._soundGroups(value)].map(([family,items])=>`<optgroup label="${escapeHtml(family)}">${items.map(item=>`<option value="${item.id}" ${item.id===value?'selected':''}>${escapeHtml(item.label)}</option>`).join('')}</optgroup>`).join('');
};
const metroInitBeforeV1354=Metro.init.bind(Metro);
Metro.init=function(){
    let manualDefault=false,migrated=false,fresh=false;try{manualDefault=!!localStorage.getItem('protuner_metro_default');migrated=localStorage.getItem('music_toolbox_metro_default_v1354')==='1';fresh=!localStorage.getItem('protuner_metro_v9')&&!manualDefault;}catch(error){}
    metroInitBeforeV1354();
    // 新安装四轨也用确认音源；已有逐击编排和用户默认设置不覆盖。
    if(fresh){this.trackSounds=this._clone(METRO_KITS.studio.tracks);this.renderSoundPanel();this.saveCustom();}
    if(!migrated&&!manualDefault){
        const current=Array.isArray(this.slots?.accent)?this.slots.accent[0]:this.slots?.accent,factory=this.kitId==='studio'&&['perc_snap','metro_20','metro_30'].includes(current);
        if(factory){this.slots={...this.slots,accent:'accent_cc0_02',beat:'elec_tick',subdivision:'elec_tick',swing:'elec_tick'};this.renderSoundPanel();this.renderSwingControls();this._prepareCurrentSounds();this.saveCustom();}
        try{localStorage.setItem('music_toolbox_metro_default_v1354','1');}catch(error){}
    }
};
Metro.renderSoundPanel=function(preserveOpen=true){
    const panel=document.getElementById('metro-sound-panel');if(!panel)return;
    const open=preserveOpen&&panel.classList.contains('open'),accent=Array.isArray(this.slots.accent)?this.slots.accent:[this.slots.accent];
    const rows=[['accent','重拍',accent[0]],['accentLayer','重拍叠层',accent[1]||accent[0]],['beat','普通拍',this.slots.beat],['subdivision','细分',this.slots.subdivision],...['底鼓轨','军鼓轨','踩镲轨','辅助轨'].map((label,i)=>['track:'+i,label,this.trackSounds[i]])];
    panel.innerHTML=rows.map(([slot,label,value])=>`<div class="metro-slot-row"><span>${label}</span><button type="button" class="metro-sound-choice" data-sound-slot="${slot}" onclick="Metro.openSoundPicker('${slot}')" aria-label="选择${label}音色">${escapeHtml(this._label(value))} ›</button><button type="button" class="metro-preview" aria-label="试听${label}" onclick="${slot.startsWith('track:')?`Metro.previewTrack(${slot.slice(6)})`:`Metro.previewSlot('${slot}')`}">♪</button></div>`).join('')+
        '<div class="metro-kit-note">音源按类别展开选择，文件峰值已标准化。'+(this.kitId==='drum_t06'?'T06：4/4 首拍底鼓、第三拍 Clap、二／四拍闭镲；细分闭镲 49%，正拍闭镲 58%。无重音及其他拍号遵守原计拍。':'首套默认 R02 木块＋电子 Click；重拍 86% / 次强 70% / 普通 58% / 细分 33%。')+'旧保存选择仍可使用。</div><button class="metro-save-default" onclick="Metro.saveAsDefault()">保存为以后默认音色</button>';
    panel.classList.toggle('open',open);
    const button=document.getElementById('metro-sound-editor-btn');if(button)button.textContent=open?'收起音色':'编辑每个击点 ›';
};
Metro.openSoundPicker=function(slot){
    if(!['accent','accentLayer','beat','subdivision','swing','track:0','track:1','track:2','track:3'].includes(slot))return;
    const previous=document.getElementById('metro-sound-dialog');if(previous){previous.close();previous.remove();}
    const getValue=()=>slot.startsWith('track:')?this.trackSounds[Number(slot.slice(6))]:slot==='accentLayer'?(Array.isArray(this.slots.accent)?this.slots.accent[1]:this.slots.accent):this.slots[slot];
    const raw=getValue(),selected=Array.isArray(raw)?raw[0]:raw,dialog=document.createElement('dialog');dialog.id='metro-sound-dialog';dialog.className='metro-sound-dialog';dialog.setAttribute('aria-labelledby','metro-picker-title');
    dialog.innerHTML=`<div class="metro-picker-head"><strong id="metro-picker-title">选择音色 · 分类试听</strong><button type="button" data-close>完成</button></div><div class="metro-picker-scroll">${[...this._soundGroups(selected)].map(([family,items])=>`<details><summary>${escapeHtml(family)}（${items.length}）</summary>${items.map(item=>`<div class="metro-picker-row"><button type="button" data-sound="${item.id}" aria-pressed="${item.id===selected}">${escapeHtml(item.label)}</button><button type="button" data-preview="${item.id}" aria-label="仅试听 ${escapeHtml(item.label)}">♪</button></div>`).join('')}</details>`).join('')}</div>`;
    document.body.appendChild(dialog);
    dialog.querySelector('[data-close]').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>{dialog.remove();document.querySelector(`[data-sound-slot="${slot}"]`)?.focus();},{once:true});
    dialog.querySelectorAll('[data-preview]').forEach(button=>button.onclick=()=>AudioEngine.previewClick(button.dataset.preview));
    dialog.querySelectorAll('[data-sound]').forEach(button=>button.onclick=()=>{
        if(slot.startsWith('track:')){this.setTrackSound(Number(slot.slice(6)),button.dataset.sound);this.renderSoundPanel();}else this.setSlot(slot,button.dataset.sound);
        dialog.querySelectorAll('[data-sound]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    });
    dialog.showModal();dialog.querySelector('[data-close]').focus();
};
const metroSwingBeforeKit=Metro.renderSwingControls.bind(Metro);
Metro.renderSwingControls=function(){
    metroSwingBeforeKit();const select=document.getElementById('metro-swing-sound');if(!select)return;
    select.hidden=true;let button=document.querySelector('[data-sound-slot="swing"]');
    if(!button){button=document.createElement('button');button.type='button';button.className='metro-sound-choice';button.dataset.soundSlot='swing';button.onclick=()=>this.openSoundPicker('swing');select.after(button);}
    button.textContent=this._label(this.slots.swing)+' ›';button.disabled=!this.swingEnabled;button.setAttribute('aria-label','选择 Swing 音色');
};

/* ---------- 渐速训练：精简版只保留固定 +1、间隔、启停、撤回与完成 ---------- */
Metro._rampFieldsMarkup=function(){const ramp=this.ramp;if(ramp.mode==='lite')return `<div id="ramp-lite-fields" class="ramp-lite-panel"><input id="ramp-lite-interval" type="hidden" value="${ramp.interval}"><div class="ramp-lite-stepper" aria-label="精简渐速间隔"><button type="button" onclick="Metro.adjustLiteInterval(-1)" aria-label="间隔减一秒">−</button><span><small>每隔</small><strong id="ramp-lite-interval-display">${ramp.interval} 秒</strong><em>固定 +1 BPM</em></span><button type="button" onclick="Metro.adjustLiteInterval(1)" aria-label="间隔加一秒">＋</button></div></div>`;return `<div id="ramp-range-fields" class="ramp-range-grid"><label class="ramp-field">从 BPM<input id="ramp-start" type="number" min="30" max="300" value="${ramp.start}" oninput="Metro.rampFieldChanged()"></label><label class="ramp-field">到 BPM<input id="ramp-target" type="number" min="30" max="300" value="${ramp.target}" oninput="Metro.rampFieldChanged()"></label><label class="ramp-field">每次变化 BPM<input id="ramp-step" type="number" min="1" max="30" value="${ramp.step}" oninput="Metro.rampFieldChanged()"></label><label class="ramp-field">每隔多少秒<span class="ramp-stepper-field"><button type="button" onclick="Metro.adjustRampValue('ramp-interval',-1)">−</button><input id="ramp-interval" type="number" min="1" max="600" value="${ramp.interval}" oninput="Metro.rampFieldChanged()"><button type="button" onclick="Metro.adjustRampValue('ramp-interval',1)">＋</button></span></label><div class="ramp-derived ramp-field-wide"><span>预计总时长（自动计算）</span><strong id="ramp-duration"></strong></div></div>`;};
Metro._renderRampFields=function(){const host=document.getElementById('ramp-mode-fields');if(host)host.innerHTML=this._rampFieldsMarkup();this._rampUpdateUI();};
Metro.setRampMode=function(mode){
    this.pauseRamp();const ramp=this.ramp;ramp.mode=mode==='range'?'range':'lite';ramp.started=false;ramp.completed=false;ramp.current=ramp.mode==='range'?this._rampNumber('ramp-start',ramp.start,30,300):ramp.baseline;
    const modal=document.getElementById('metro-ramp-modal');if(modal)modal.dataset.mode=ramp.mode;document.querySelectorAll('[data-ramp-mode]').forEach(button=>button.classList.toggle('active',button.dataset.rampMode===ramp.mode));
    this._renderRampFields();
    this._rampUpdateUI(ramp.mode==='lite'?`等待开始 · 每 ${ramp.interval} 秒自动 +1 BPM`:'高级渐速待开始 · 总时长由区间、步长和间隔计算');
};
Metro.openRamp=function(){
    this.stop();const ramp=this.ramp;ramp.baseline=this.bpm;ramp.start=this.bpm;ramp.target=Math.min(300,this.bpm+30);ramp.current=this.bpm;ramp.step=Math.max(1,ramp.step||1);ramp.interval=Math.max(1,ramp.interval||5);ramp.mode='lite';ramp.running=false;ramp.started=false;ramp.completed=false;ramp.generation++;clearTimeout(ramp.timer);document.getElementById('metro-ramp-modal')?.remove();
    const modal=document.createElement('div');modal.id='metro-ramp-modal';modal.className='practice-modal metro-ramp-modal';modal.dataset.mode='lite';modal.innerHTML=`<div class="practice-modal-card"><h3>渐速训练</h3><div class="ramp-tabs"><button type="button" data-ramp-mode="lite" class="active" onclick="Metro.setRampMode('lite')">精简版</button><button type="button" data-ramp-mode="range" onclick="Metro.setRampMode('range')">高级版</button></div><div class="ramp-bpm-display"><small>当前 ♩ =</small><strong id="ramp-current">${ramp.current}</strong><span id="ramp-state">等待开始</span></div><div id="ramp-mode-fields"></div><div class="ramp-progress"><i id="ramp-progress"></i></div><div class="ramp-actions"><button type="button" class="ramp-start" id="ramp-start-button" onclick="Metro.toggleRamp()">▶ 开始</button><button type="button" class="ramp-restore" id="ramp-restore-button" onclick="Metro.restoreRamp()">↶ 撤回到 ${ramp.baseline} BPM</button><button type="button" class="ramp-confirm" onclick="Metro.closeRamp()">完成并退出</button></div></div>`;
    document.body.appendChild(modal);modal.addEventListener('click',event=>{if(event.target===modal)this.closeRamp();});this._renderRampFields();this._rampUpdateUI(`等待开始 · 每 ${ramp.interval} 秒自动 +1 BPM`);
};
Metro.restoreRamp=function(){const ramp=this.ramp;this.pauseRamp();ramp.current=ramp.mode==='range'?this._rampNumber('ramp-start',ramp.start,30,300):ramp.baseline;ramp.started=false;ramp.completed=false;this._rampUpdateUI(`已撤回到 ${Math.round(ramp.current)} BPM · 等待开始`);};

/* ---------- 和弦查询：同尺寸十二平均律刻度尺 ---------- */
const ROOT_NATURALS=new Map([[0,'C'],[2,'D'],[4,'E'],[5,'F'],[7,'G'],[9,'A'],[11,'B'],[12,'C']]);
const rootDisplay=pc=>{const value=((Number(pc)%12)+12)%12,sharp=NOTE_NAMES[value].replace('#','♯'),flat=NOTE_NAMES_FLAT[value].replace('b','♭');return sharp===flat?sharp:`${sharp}/${flat}`;};
ChordLib.buildRootRow=function(){
    const host=document.getElementById('chord-root-row');if(!host)return;const selected=((Number(this.root)%12)+12)%12,candidate=clamp(Math.round(this.rootRulerStep),0,12),selectedStep=Number.isFinite(this.rootRulerStep)&&candidate%12===selected?candidate:selected;
    host.innerHTML=`<div class="chord-root-ruler" id="chord-root-ruler" data-accidental="${ROOT_NATURALS.has(selectedStep)?'false':'true'}" role="slider" tabindex="0" aria-label="和弦根音，十二平均律刻度尺" aria-valuemin="0" aria-valuemax="11" aria-valuenow="${selected}" aria-valuetext="${escapeHtml(rootDisplay(selected))}"><span class="chord-root-ruler-caption">根音</span><div class="chord-root-ruler-track">${Array.from({length:13},(_,step)=>{const natural=ROOT_NATURALS.get(step),pc=step%12;return `<button type="button" class="chord-root-ruler-tick${natural?' natural':' accidental'}${step===selectedStep?' selected':''}" data-step="${step}" data-pc="${pc}" style="--root-step:${step}" aria-label="${escapeHtml(rootDisplay(pc))}" title="${escapeHtml(rootDisplay(pc))}">${natural?`<span>${natural}</span>`:''}</button>`;}).join('')}<i class="chord-root-ruler-pointer" style="--root-step:${selectedStep}" aria-hidden="true"></i></div><output class="chord-root-ruler-value" style="--root-step:${selectedStep}">${escapeHtml(rootDisplay(selected))}</output></div>`;
    this.bindRootRuler();
};
ChordLib._previewRootRuler=function(step){
    const ruler=document.getElementById('chord-root-ruler');if(!ruler)return;const normalized=clamp(Math.round(step),0,12),pc=normalized%12,pointer=ruler.querySelector('.chord-root-ruler-pointer'),output=ruler.querySelector('.chord-root-ruler-value');
    if(pointer)pointer.style.setProperty('--root-step',normalized);if(output){output.style.setProperty('--root-step',normalized);output.textContent=rootDisplay(pc);output.classList.remove('pop');void output.offsetWidth;output.classList.add('pop');}ruler.dataset.accidental=ROOT_NATURALS.has(normalized)?'false':'true';ruler.setAttribute('aria-valuenow',String(pc));ruler.setAttribute('aria-valuetext',rootDisplay(pc));ruler.querySelectorAll('.chord-root-ruler-tick').forEach(tick=>tick.classList.toggle('selected',Number(tick.dataset.step)===normalized));this.rootRulerPending=pc;this.rootRulerStep=normalized;
};
ChordLib._commitRootRuler=function(pc=this.rootRulerPending){this.root=((Number(pc)%12)+12)%12;this.bassMode='auto';this.buildBassOptions();this.generate();this.buildRootRow();};
ChordLib.bindRootRuler=function(){
    const ruler=document.getElementById('chord-root-ruler'),track=ruler?.querySelector('.chord-root-ruler-track');if(!ruler||!track)return;let dragging=false,pointerId=null;
    const stepAt=event=>{const rect=track.getBoundingClientRect(),ratio=clamp((event.clientX-rect.left)/Math.max(1,rect.width),0,1);return Math.round(ratio*12);};
    ruler.onpointerdown=event=>{event.preventDefault();dragging=true;pointerId=event.pointerId;ruler.setPointerCapture?.(event.pointerId);this._previewRootRuler(stepAt(event));};
    ruler.onpointermove=event=>{if(dragging&&event.pointerId===pointerId){event.preventDefault();this._previewRootRuler(stepAt(event));}};
    const finish=event=>{if(!dragging||event.pointerId!==pointerId)return;dragging=false;ruler.releasePointerCapture?.(event.pointerId);this._previewRootRuler(stepAt(event));this._commitRootRuler();};ruler.onpointerup=finish;ruler.onpointercancel=()=>{dragging=false;this.buildRootRow();};
    ruler.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?11:((this.root+(event.key==='ArrowRight'?1:-1)+12)%12);this._commitRootRuler(next);requestAnimationFrame(()=>document.getElementById('chord-root-ruler')?.focus());};
};
ChordLib.openRootWheel=function(){document.getElementById('chord-root-ruler')?.focus();};
ChordLib.closeRootWheel=function(){document.getElementById('chord-root-wheel-modal')?.remove();};

/* ---------- 和弦查询：最低音／转位移入和弦图下方的紧凑操作区 ---------- */
ChordLib._bassChoices=function(){
    const intervals=[...new Set((MusicTheory.chordTemplates[this.type]||[0,4,7]).map(interval=>((Number(interval)%12)+12)%12))],numbers=['原位','第一转位','第二转位','第三转位','第四转位','第五转位'];return intervals.map((interval,index)=>({interval,pc:(this.root+interval)%12,label:numbers[index]||`第${index}转位`}));
};
ChordLib._currentBassPc=function(){
    const current=this.voicings?.[this.voicingIdx],openMidis=this.getTuningNotes?.().map(noteToMidi)||[],midis=current?this._shapeMidis(current.frets,openMidis):[];return midis.length?((midis[0]%12)+12)%12:this.root;
};
ChordLib.syncBassNavButton=function(){
    const button=document.getElementById('chord-bass-nav-button');if(!button)return;const choices=this._bassChoices(),actual=this._currentBassPc(),selected=this.bassMode==='auto'?null:Number(this.bassMode),index=selected===null?-1:choices.findIndex(item=>item.pc===selected);let value;if(selected===null)value=`自动 · ${enharmonic(actual)}`;else if(index===0)value=`原位 · ${enharmonic(selected)}`;else if(index>0)value=`${['一','二','三','四','五'][index-1]||index}转 · ${enharmonic(selected)}`;else value=`指定 · ${enharmonic(selected)}`;button.querySelector('strong').textContent=value;button.classList.toggle('active',selected!==null);button.setAttribute('aria-label',`最低音与转位，当前${value}`);
};
const chordBuildBassBeforeV1354=ChordLib.buildBassOptions.bind(ChordLib);
ChordLib.buildBassOptions=function(){const result=chordBuildBassBeforeV1354();this.syncBassNavButton();return result;};
const chordRenderBeforeV1354=ChordLib.renderChord.bind(ChordLib);
ChordLib.renderChord=function(){const result=chordRenderBeforeV1354();this.syncBassNavButton();return result;};
ChordLib.openBassPicker=function(){
    document.getElementById('chord-bass-picker-modal')?.remove();const choices=this._bassChoices(),selected=this.bassMode==='auto'?'auto':String(this.bassMode),modal=document.createElement('div');modal.id='chord-bass-picker-modal';modal.className='practice-modal release-modal chord-bass-picker-modal';modal.innerHTML=`<div class="practice-modal-card"><h3>最低音／转位</h3><p class="release-modal-note">常用转位直接选择；“指定最低音”仍可建立踏板低音或斜杠和弦。选择后和弦图、名称、把位与试听会同步重算。</p><div class="chord-bass-choice-grid"><button type="button" class="${selected==='auto'?'active':''}" onclick="ChordLib.setBassFromPicker('auto')"><strong>自动推荐</strong><small>按当前把位选择自然低音</small></button>${choices.map((item,index)=>`<button type="button" class="${selected===String(item.pc)?'active':''}" onclick="ChordLib.setBassFromPicker('${item.pc}')"><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(rootDisplay(item.pc))}</small></button>`).join('')}</div><strong class="chord-bass-picker-label">指定最低音</strong><div class="chord-bass-pc-grid">${Array.from({length:12},(_,pc)=>`<button type="button" class="${selected===String(pc)?'active':''}" onclick="ChordLib.setBassFromPicker('${pc}')">${escapeHtml(rootDisplay(pc))}</button>`).join('')}</div><div class="release-actions"><button type="button" onclick="ChordLib.closeBassPicker()">取消</button><button type="button" class="primary" onclick="ChordLib.closeBassPicker()">完成</button></div></div>`;document.body.appendChild(modal);modal.addEventListener('click',event=>{if(event.target===modal)this.closeBassPicker();});
};
ChordLib.setBassFromPicker=function(value){this.setBass(value);this.closeBassPicker();};
ChordLib.closeBassPicker=function(){document.getElementById('chord-bass-picker-modal')?.remove();};

/* ---------- 虚拟乐器：任意弦命中区双击禁用／恢复 ---------- */
InstrumentPage._stringTapState=new Map();InstrumentPage._muteGestureSuppressed=new Set();
InstrumentPage._registerStringTap=function(stringIndex,anchor,x,y,pointerId,event=null){
    const string=Number(stringIndex),key=`${string}:${anchor}`,now=performance.now(),last=this._stringTapState.get(key);
    for(const [other,state] of this._stringTapState)if(now-state.at>420)this._stringTapState.delete(other);
    if(last&&now-last.at<390&&Math.hypot((Number(x)||0)-last.x,(Number(y)||0)-last.y)<42){
        this._stringTapState.delete(key);this._muteGestureSuppressed.add(pointerId);this.activePointers?.delete(pointerId);this.strumState=null;event?.preventDefault?.();event?.stopPropagation?.();this.toggleStringMute(string);return true;
    }
    this._stringTapState.set(key,{at:now,x:Number(x)||0,y:Number(y)||0});return false;
};
InstrumentPage.bindStringMuteGestures=function(){
    const stage=document.getElementById('instrument-stage');if(!stage||stage.dataset.doubleMuteBound==='1')return;stage.dataset.doubleMuteBound='1';
    stage.addEventListener('pointerup',event=>{
        const direct=event.target?.closest?.('.instrument-string-toggle,.instrument-string-mute-hit,.virtual-note-hit,.performance-string-cell'),zone=event.target?.closest?.('#strum-zone');let string,anchor;
        if(direct&&direct.dataset.string!==undefined){string=Number(direct.dataset.string);anchor=direct.dataset.fret!==undefined?`fret-${direct.dataset.fret}`:direct.classList.contains('performance-string-cell')?'strum':'line';}
        else if(zone){string=this.strumStringAt(event);anchor='strum';}
        if(Number.isFinite(string))this._registerStringTap(string,anchor,event.clientX,event.clientY,event.pointerId,event);
    },true);
};
InstrumentPage.pointerUp=function(event,stringIndex,fret,midi){
    if(this._muteGestureSuppressed.delete(event.pointerId)){const held=this.livePointers.get(event.pointerId);clearTimeout(held?.vibratoTimer);held?.voice?.stop?.(.06);this.livePointers.delete(event.pointerId);return;}
    const state=this.livePointers.get(event.pointerId);if(!state)return;clearTimeout(state.vibratoTimer);this.livePointers.delete(event.pointerId);
    if(state.edit){if(Math.hypot(event.clientX-state.x,event.clientY-state.y)<14)this.toggleHeld(Number(stringIndex),Number(fret));return;}
    if(state.sample){this._performanceLast.set(Number(stringIndex),{midi,at:performance.now()});return;}
    const elapsed=performance.now()-state.started;state.voice?.stop?.(elapsed<180?.46:.24);this._performanceLast.set(Number(stringIndex),{midi,at:performance.now()});this._showTechnique(`${state.technique} · 已释放`);
};

/* ---------- 视唱：标准五线鼓谱，节奏位置按真实时值计算 ---------- */
SightSinging._drumDurationInfo=function(value){
    const duration=Math.max(.0625,Number(value)||1),bases=[4,2,1,.5,.25,.125],dottedBase=bases.find(base=>Math.abs(duration-base*1.5)<.026),base=dottedBase||duration,triplet=[1/3,2/3,4/3].some(item=>Math.abs(duration-item)<.035),flags=base<.1875?3:base<.375?2:base<.75?1:0;return {duration,base,dotted:!!dottedBase,triplet,flags,open:base>=1.75,whole:base>=3.5};
};
SightSinging._drumInstrument=function(raw,index){
    const candidate=raw?.instrument||raw?.[3],known=['kick','floorTom','snare','highTom','hihat','ride'];if(known.includes(candidate))return candidate;
    return 'snare';
};
SightSinging._drumRestSvg=function(x,duration){return `<g class="drum-event drum-rest" data-duration="${duration}">${this._restSvg(x,duration)}</g>`;};
SightSinging._renderDrumScore=function(){
    const exercise=this.exercise,box=document.getElementById('sight-score');if(!exercise||!box)return;const beatCount=Math.max(.001,meterQuarterBeatsLocal(exercise.meter)),total=Math.max(.001,exercise.durations.reduce((sum,value)=>sum+Number(value||0),0)),bars=Math.max(1,Math.ceil(total/beatCount)),width=Math.max(660,Math.round(total*62+165)),height=214,staffTop=70,staffBottom=126,contentStart=116,contentEnd=width-25,pixelsPerBeat=(contentEnd-contentStart)/total,staffLines=[70,84,98,112,126],instrumentY={hihat:63,ride:70,highTom:84,snare:98,floorTom:112,kick:126};
    const events=[];let cursor=0;exercise.durations.forEach((duration,index)=>{const raw=exercise.seq?.[index],rest=!Number.isFinite(exercise.midis[index]),info=this._drumDurationInfo(duration),instrument=this._drumInstrument(raw,index),x=contentStart+cursor*pixelsPerBeat+Math.min(17,Math.max(6,duration*pixelsPerBeat*.34)),y=instrumentY[instrument]??98;events.push({index,start:cursor,duration:Number(duration),rest,info,instrument,x,y,raw});cursor+=Number(duration);});
    let svg=`<svg class="sight-drum-score" viewBox="0 0 ${width} ${height}" role="img" aria-label="标准鼓谱，${bars} 小节，${escapeHtml(exercise.meter)}"><rect width="100%" height="100%" fill="var(--surf)"/><text x="20" y="24" fill="var(--prim)" font-size="10" font-weight="750">鼓谱 · ${escapeHtml(exercise.meter)} · ${this.effectiveBpm(exercise)} BPM</text>`;
    staffLines.forEach(y=>svg+=`<line class="drum-staff-line notation-bar" x1="18" y1="${y}" x2="${contentEnd+7}" y2="${y}" stroke="var(--text-sub)" opacity=".62"/>`);svg+=`<line class="notation-bar" x1="18" y1="${staffTop}" x2="18" y2="${staffBottom}" stroke="var(--text)" stroke-width="2"/><g class="drum-clef" aria-label="打击乐谱号"><rect x="32" y="86" width="5" height="26" rx="2" fill="var(--text)"/><rect x="43" y="86" width="5" height="26" rx="2" fill="var(--text)"/></g>`;
    const [numerator='4',denominator='4']=String(exercise.meter||'4/4').split('/');svg+=`<text x="70" y="94" fill="var(--text)" font-size="20" font-weight="800">${escapeHtml(numerator)}</text><text x="70" y="119" fill="var(--text)" font-size="20" font-weight="800">${escapeHtml(denominator)}</text>`;
    for(let bar=1;bar<=bars;bar++){const x=contentStart+Math.min(total,bar*beatCount)*pixelsPerBeat,final=bar===bars;svg+=`<line class="notation-bar drum-barline" x1="${x}" y1="${staffTop}" x2="${x}" y2="${staffBottom}" stroke="var(--text)" stroke-width="${final?2.6:1.25}"/>${final?`<line class="notation-bar drum-barline" x1="${x-5}" y1="${staffTop}" x2="${x-5}" y2="${staffBottom}" stroke="var(--text)" stroke-width="1"/>`:''}`;}
    for(const event of events){
        const {x,y,info,instrument,duration,start,index}=event;if(event.rest){svg+=this._drumRestSvg(x,duration);continue;}const cross=['hihat','ride'].includes(instrument),stemX=x+7,stemTop=Math.max(37,y-39),label={kick:'底鼓',floorTom:'落地嗵鼓',snare:'军鼓',highTom:'高嗵鼓',hihat:'踩镲',ride:'叮叮镲'}[instrument];
        svg+=`<g class="drum-event drum-note drum-${instrument}" data-event-index="${index}" data-beat-start="${start}" data-duration="${duration}" aria-label="${label}，${duration} 拍"><title>${label} · ${duration} 拍</title>`;
        if(cross)svg+=`<path class="drum-notehead drum-x-notehead" d="M${x-6},${y-6} L${x+6},${y+6} M${x+6},${y-6} L${x-6},${y+6}" stroke="var(--text)" stroke-width="2.3" stroke-linecap="round"/>`;
        else svg+=`<ellipse class="drum-notehead" cx="${x}" cy="${y}" rx="8" ry="5.5" transform="rotate(-18 ${x} ${y})" fill="${info.open?'var(--surf)':'var(--text)'}" stroke="var(--text)" stroke-width="1.5"/>`;
        if(!info.whole)svg+=`<line class="drum-stem" x1="${stemX}" y1="${y}" x2="${stemX}" y2="${stemTop}" stroke="var(--text)" stroke-width="1.8"/>`;if(info.dotted)svg+=`<circle class="drum-dot" cx="${x+14}" cy="${y-5}" r="2.3" fill="var(--text)"/>`;if(info.triplet)svg+=`<text class="drum-triplet" x="${x}" y="31" text-anchor="middle" fill="var(--text-sub)" font-size="9" font-weight="800">3</text>`;svg+='</g>';
    }
    const shortRuns=[];let run=[];const flush=()=>{if(run.length)shortRuns.push(run);run=[];};for(const event of events){const beat=Math.floor(event.start+.0001),short=!event.rest&&event.info.flags>0,within=run.length&&Math.floor(run[0].start+.0001)===beat&&event.start<Math.ceil(event.start-.0001)+.999;if(short&&within)run.push(event);else{flush();if(short)run=[event];}}flush();
    const drawBeamRuns=(items,level)=>{let current=[];const end=()=>{if(current.length>=2){const first=current[0],last=current.at(-1),y=Math.min(...current.map(item=>Math.max(37,item.y-39)))+(level-1)*5;svg+=`<line class="drum-beam drum-beam-${level}" x1="${first.x+7}" y1="${y}" x2="${last.x+7}" y2="${y}" stroke="var(--text)" stroke-width="4"/>`;}else if(current.length===1){const item=current[0],top=Math.max(37,item.y-39)+(level-1)*5;svg+=`<path class="drum-flag drum-flag-${level}" d="M${item.x+7},${top} q14,5 6,17" fill="none" stroke="var(--text)" stroke-width="2.4" stroke-linecap="round"/>`;}current=[];};for(const item of items){if(item.info.flags>=level)current.push(item);else end();}end();};for(const items of shortRuns)for(let level=1;level<=3;level++)drawBeamRuns(items,level);
    for(let index=0;index<events.length-1;index++){const event=events[index],next=events[index+1],tie=event.raw?.tie||event.raw?.[4]==='tie';if(tie&&!event.rest&&!next.rest)svg+=`<path class="drum-tie" d="M${event.x+5},${event.y+9} Q${(event.x+next.x)/2},${Math.max(event.y,next.y)+20} ${next.x-5},${next.y+9}" fill="none" stroke="var(--text)" stroke-width="1.5"/>`;}
    if(this.lastDetected?.length){const first=this.lastDetected[0].start,last=Math.max(first+.1,this.lastDetected.at(-1).end);for(const hit of this.lastDetected){const ratio=clamp((hit.start-first)/(last-first),0,1),x=contentStart+ratio*(contentEnd-contentStart);svg+=`<line class="drum-detected-hit" x1="${x}" y1="${staffTop-8}" x2="${x}" y2="${staffBottom+8}" stroke="var(--teal)" stroke-width="2" opacity=".48"/>`;}}
    svg+=`<line id="sight-drum-playhead" x1="${contentStart}" y1="${staffTop-11}" x2="${contentStart}" y2="${staffBottom+11}" data-start-x="${contentStart}" data-end-x="${contentEnd}" stroke="var(--orange)" stroke-width="2.2" opacity="0" pointer-events="none"/></svg>`;box.innerHTML=svg;requestAnimationFrame(()=>this.scrollToCurrentPhrase?.());
};

const STAFF_LETTERS=['C','D','E','F','G','A','B'];
const STAFF_NATURAL_PCS=[0,2,4,5,7,9,11];
const STAFF_SHARP_ORDER=['F','C','G','D','A','E','B'];
const STAFF_FLAT_ORDER=['B','E','A','D','G','C','F'];
const STAFF_MAJOR_FIFTHS=[0,-5,2,-3,4,-1,6,1,-4,3,-2,5];
const STAFF_MODE_RELATIVE_MAJOR={Major:0,Minor:3,'Natural Minor':3,'Harmonic Minor':3,'Melodic Minor':3,Dorian:10,Phrygian:8,Lydian:7,Mixolydian:5};
const STAFF_SHARP_Y=[72,93,65,86,107,79,100];
const STAFF_FLAT_Y=[100,79,107,86,114,93,121];
const accidentalDelta=value=>value==='♯'?1:value==='♭'?-1:value==='𝄪'?2:value==='𝄫'?-2:0;
const accidentalGlyph=delta=>delta===2?'𝄪':delta===1?'♯':delta===-1?'♭':delta===-2?'𝄫':'';
SightSinging._keySignatureInfo=function(exercise){
    const root=((Number(exercise?.root)%12)+12)%12,offset=STAFF_MODE_RELATIVE_MAJOR[exercise?.mode]??0,majorPc=(root+offset)%12;let fifths=STAFF_MAJOR_FIFTHS[majorPc]??0;
    if(majorPc===6&&new Set([1,3,5,8,10]).has(root))fifths=-6;
    const byLetter={};if(fifths>0)STAFF_SHARP_ORDER.slice(0,fifths).forEach(letter=>{byLetter[letter]='♯';});if(fifths<0)STAFF_FLAT_ORDER.slice(0,-fifths).forEach(letter=>{byLetter[letter]='♭';});
    let rootLetterIndex=STAFF_LETTERS.findIndex((letter,index)=>((STAFF_NATURAL_PCS[index]+accidentalDelta(byLetter[letter])+12)%12)===root);if(rootLetterIndex<0)rootLetterIndex=STAFF_LETTERS.indexOf((fifths<0?NOTE_NAMES_FLAT[root]:NOTE_NAMES[root])[0]);if(rootLetterIndex<0)rootLetterIndex=0;
    const order=fifths>0?STAFF_SHARP_ORDER.slice(0,fifths):STAFF_FLAT_ORDER.slice(0,-fifths),ys=fifths>0?STAFF_SHARP_Y:STAFF_FLAT_Y,symbol=fifths>0?'♯':'♭',entries=order.map((letter,index)=>({letter,symbol,y:ys[index]}));
    return {fifths,byLetter,rootLetterIndex,entries,label:fifths>0?`${fifths} 个升号`:fifths<0?`${-fifths} 个降号`:'无升降号'};
};
SightSinging._staffSpellMidi=function(midi,exercise,signature=this._keySignatureInfo(exercise)){
    const value=Math.round(Number(midi)),pc=((value%12)+12)%12,root=((Number(exercise?.root)%12)+12)%12,template=(MusicTheory.scaleTemplates[exercise?.mode]||MusicTheory.scaleTemplates.Major).slice(0,7).map(item=>((Number(item)%12)+12)%12),relative=(pc-root+12)%12,degree=template.indexOf(relative);let letterIndex;
    if(degree>=0)letterIndex=(signature.rootLetterIndex+degree)%7;else{const name=(signature.fifths<0?NOTE_NAMES_FLAT:NOTE_NAMES)[pc];letterIndex=STAFF_LETTERS.indexOf(name[0]);}
    if(letterIndex<0)letterIndex=0;const letter=STAFF_LETTERS[letterIndex],naturalPc=STAFF_NATURAL_PCS[letterIndex];let delta=((pc-naturalPc+18)%12)-6;if(delta>2||delta<-2){const fallback=(signature.fifths<0?NOTE_NAMES_FLAT:NOTE_NAMES)[pc];letterIndex=STAFF_LETTERS.indexOf(fallback[0]);delta=fallback.includes('#')?1:fallback.includes('b')?-1:0;}
    const resolvedLetter=STAFF_LETTERS[letterIndex],resolvedNatural=STAFF_NATURAL_PCS[letterIndex],accidental=accidentalGlyph(delta);let octave=Math.floor(value/12)-1,pitch=(octave+1)*12+resolvedNatural+delta;while(pitch<value){octave++;pitch+=12;}while(pitch>value){octave--;pitch-=12;}
    return {name:`${resolvedLetter}${accidental}`,letter:resolvedLetter,accidental,octave,index:octave*7+letterIndex};
};
SightSinging._renderStaffScore=function(){
    const exercise=this.exercise,box=document.getElementById('sight-score');if(!exercise||!box)return;const beats=meterQuarterBeatsLocal(exercise.meter),total=Math.max(.01,exercise.durations.reduce((sum,value)=>sum+Number(value||0),0)),bars=Math.max(1,Math.ceil(total/beats)),signature=this._keySignatureInfo(exercise),signatureWidth=signature.entries.length*11,width=Math.max(660+signatureWidth,Math.round(total*54+145+signatureWidth)),height=214,top=72,bottom=128,timeX=70+signatureWidth,contentStart=106+signatureWidth,contentEnd=width-24,pixelsPerBeat=(contentEnd-contentStart)/total,staffLines=[72,86,100,114,128];
    let svg=`<svg class="sight-staff-score" viewBox="0 0 ${width} ${height}" role="img" aria-label="五线谱，${bars} 小节，${escapeHtml(signature.label)}"><rect width="100%" height="100%" fill="var(--surf)"/>`;
    staffLines.forEach(y=>svg+=`<line class="notation-bar" x1="18" y1="${y}" x2="${contentEnd+6}" y2="${y}" stroke="var(--text-sub)" opacity=".62"/>`);svg+=`<line class="notation-bar" x1="18" y1="${top}" x2="18" y2="${bottom}" stroke="var(--text)" stroke-width="2"/><text x="20" y="24" fill="var(--prim)" font-size="10" font-weight="750">${escapeHtml(enharmonic(exercise.root))} ${escapeHtml(exercise.mode)} · ${escapeHtml(exercise.meter)} · ${escapeHtml(exercise.tempoSource||'练习速度')} ${this.effectiveBpm(exercise)} BPM</text><text x="25" y="121" fill="var(--text)" font-size="43">𝄞</text>`;
    if(signature.entries.length){svg+=`<g class="sight-key-signature" role="img" aria-label="调号：${escapeHtml(signature.label)}">`;signature.entries.forEach((entry,index)=>{svg+=`<text x="${58+index*11}" y="${entry.y+6}" text-anchor="middle" fill="var(--text)" font-size="21" font-weight="700">${entry.symbol}</text>`;});svg+='</g>';}
    const [numerator='4',denominator='4']=String(exercise.meter||'4/4').split('/');svg+=`<text class="sight-time-signature" x="${timeX}" y="91" fill="var(--text)" font-size="19" font-weight="750">${escapeHtml(numerator)}</text><text class="sight-time-signature" x="${timeX}" y="114" fill="var(--text)" font-size="19" font-weight="750">${escapeHtml(denominator)}</text>`;
    for(let bar=1;bar<=bars;bar++){const x=contentStart+Math.min(total,bar*beats)*pixelsPerBeat,final=bar===bars;svg+=`<line class="notation-bar" x1="${x}" y1="${top}" x2="${x}" y2="${bottom}" stroke="var(--text)" stroke-width="${final?2.5:1.25}"/>${final?`<line class="notation-bar" x1="${x-5}" y1="${top}" x2="${x-5}" y2="${bottom}" stroke="var(--text)" stroke-width="1"/>`:''}`;}
    let cursor=0,measure=-1,measureAccidentals=new Map();exercise.midis.forEach((midi,index)=>{const duration=Number(exercise.durations[index])||.25,x=contentStart+(cursor+duration*.44)*pixelsPerBeat,rest=!Number.isFinite(midi),currentMeasure=Math.floor((cursor+.0001)/beats);if(currentMeasure!==measure){measure=currentMeasure;measureAccidentals=new Map();}
        if(rest)svg+=this._restSvg(x,duration);else{const spelling=this._staffSpellMidi(midi,exercise,signature),y=128-(spelling.index-30)*7;if(y<=58)for(let ledger=58;ledger>=y-1;ledger-=14)svg+=`<line x1="${x-12}" y1="${ledger}" x2="${x+12}" y2="${ledger}" stroke="var(--text)" stroke-width="1.2"/>`;if(y>=142)for(let ledger=142;ledger<=y+1;ledger+=14)svg+=`<line x1="${x-12}" y1="${ledger}" x2="${x+12}" y2="${ledger}" stroke="var(--text)" stroke-width="1.2"/>`;
            const accidentalKey=`${spelling.letter}${spelling.octave}`,baseline=signature.byLetter[spelling.letter]||'',active=measureAccidentals.has(accidentalKey)?measureAccidentals.get(accidentalKey):baseline,desired=spelling.accidental||'';if(desired!==active){const glyph=desired||'♮';svg+=`<text class="notation-accidental temporary" x="${x-17}" y="${y+5}" text-anchor="middle" fill="var(--text)" font-size="17" aria-label="临时${glyph}">${glyph}</text>`;measureAccidentals.set(accidentalKey,desired);}
            const filled=duration<2,stemUp=y>=100;svg+=`<ellipse class="notation-note" cx="${x}" cy="${y}" rx="9" ry="6" transform="rotate(-18 ${x} ${y})" fill="${filled?'var(--text)':'var(--surf)'}" stroke="var(--text)" stroke-width="1.5"/>`;if(duration<4){const stemX=stemUp?x+8:x-8,stemEnd=stemUp?y-35:y+35;svg+=`<line x1="${stemX}" y1="${y}" x2="${stemX}" y2="${stemEnd}" stroke="var(--text)" stroke-width="1.7"/>`;if(duration<1)svg+=stemUp?`<path d="M${stemX},${stemEnd} q15,7 5,18" fill="none" stroke="var(--text)" stroke-width="2"/>`:`<path d="M${stemX},${stemEnd} q-15,-7 -5,-18" fill="none" stroke="var(--text)" stroke-width="2"/>`;}
            if([.375,.75,1.5,3].some(value=>Math.abs(duration-value)<.001)){const onLine=Math.abs((bottom-y)/14-Math.round((bottom-y)/14))<.02,dotY=onLine?y-7:y;svg+=`<circle class="notation-dot" cx="${x+15}" cy="${dotY}" r="2.5" fill="var(--text)"/>`;}}
        cursor+=duration;
    });
    if(this.lastDetected?.length){const first=this.lastDetected[0].start,last=Math.max(first+.1,this.lastDetected.at(-1).end),points=this.lastDetected.map(note=>{const spelling=this._staffSpellMidi(note.midi,exercise,signature);return `${contentStart+(note.start-first)/(last-first)*(contentEnd-contentStart)},${128-(spelling.index-30)*7}`;}).join(' ');svg+=`<polyline points="${points}" fill="none" stroke="var(--teal)" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>`;}
    box.innerHTML=svg+'</svg>';requestAnimationFrame(()=>{this.applyScoreZoom?.();this.scrollToCurrentPhrase?.();});
};
const renderScoreBeforeV1354=SightSinging.renderScore.bind(SightSinging);
SightSinging.renderScore=function(){const notation=document.getElementById('sight-notation')?.value||'staff';if(notation==='drum')return this._renderDrumScore();if(notation==='staff')return this._renderStaffScore();return renderScoreBeforeV1354();};
const setPlaybackProgressBeforeV1354=SightSinging.setPlaybackProgress.bind(SightSinging);
SightSinging.setPlaybackProgress=function(ratio,label){const result=setPlaybackProgressBeforeV1354(ratio,label),playhead=document.getElementById('sight-drum-playhead');if(playhead){const value=clamp(ratio,0,1),start=Number(playhead.dataset.startX),end=Number(playhead.dataset.endX),x=start+(end-start)*value;playhead.setAttribute('x1',String(x));playhead.setAttribute('x2',String(x));playhead.setAttribute('opacity',value>0&&value<1?'0.92':'0');}return result;};

/* ---------- 视唱设置：确认式悬浮窗，不再挤压谱面 ---------- */
const sightUpdateSetupBeforeV1354=SightSinging.updateSetup.bind(SightSinging);
const sightUpdateTempoModeBeforeV1354=SightSinging.updateTempoMode.bind(SightSinging);
const sightUpdateTrainingBeforeV1354=SightSinging.updateTraining.bind(SightSinging);
const sightSetNotationBeforeV1354=SightSinging.setNotation.bind(SightSinging);
const sightSetSensitivityBeforeV1354=SightSinging.setSensitivity.bind(SightSinging);
const sightApplyModeFilterBeforeV1354=SightSinging.applyModeFilter.bind(SightSinging);
SightSinging.updateSetup=function(){if(this._settingsDraftOpen){this.syncSetupUI?.();return;}return sightUpdateSetupBeforeV1354();};
SightSinging.updateTempoMode=function(value){if(this._settingsDraftOpen){this.syncSetupUI?.();return;}return sightUpdateTempoModeBeforeV1354(value);};
SightSinging.updateTraining=function(value){
    if(!this._settingsDraftOpen)return sightUpdateTrainingBeforeV1354(value);const notation=document.getElementById('sight-notation');if(value==='rhythm'){if(notation)notation.value='drum';}else if(notation?.value==='drum')notation.value='staff';this.syncSetupUI?.();
};
SightSinging.setNotation=function(value){
    if(!this._settingsDraftOpen)return sightSetNotationBeforeV1354(value);const training=document.getElementById('sight-training');if(training)training.value=value==='drum'?'rhythm':'melody';this.syncSetupUI?.();
};
SightSinging.setSensitivity=function(value){
    if(!this._settingsDraftOpen)return sightSetSensitivityBeforeV1354(value);const slider=document.getElementById('sight-sensitivity'),output=document.getElementById('sight-sensitivity-value'),safe=clamp(value,0,100);if(slider)slider.value=String(safe);if(output)output.textContent=`${Math.round(safe)}%`;
};
SightSinging.applyModeFilter=function(){
    if(!this._settingsDraftOpen)return sightApplyModeFilterBeforeV1354();const selected=[...document.querySelectorAll('#sight-mode-filter-modal input[type="checkbox"]:checked')].map(input=>input.value);if(!selected.length){toast('请至少选择一种调式');return;}this.modeFilters=selected;document.getElementById('sight-mode-filter-modal')?.remove();this.syncModeFilterUI();
};
SightSinging.bindSettingsModal=function(){
    const details=document.getElementById('sight-settings'),summary=details?.querySelector(':scope > summary');if(!details||!summary||details.dataset.modalBound==='1')return;details.dataset.modalBound='1';details.classList.add('modalized');details.removeAttribute('open');summary.setAttribute('role','button');summary.setAttribute('aria-haspopup','dialog');summary.setAttribute('aria-expanded','false');summary.addEventListener('click',event=>{event.preventDefault();this.openSettingsModal();});
};
SightSinging._settingsSnapshot=function(body){
    const controls={};body.querySelectorAll('select,input,textarea').forEach(control=>{if(control.id)controls[control.id]={value:control.value,checked:!!control.checked};});return {controls,modeFilters:[...(this.modeFilters||[])],sensitivity:document.getElementById('sight-sensitivity')?.value||'68'};
};
SightSinging.openSettingsModal=function(){
    if(document.getElementById('sight-settings-modal'))return;const details=document.getElementById('sight-settings'),body=details?.querySelector(':scope > .sight-settings-body');if(!details||!body)return;details.removeAttribute('open');this._settingsDraft=this._settingsSnapshot(body);this._settingsDraftOpen=true;
    const modal=document.createElement('div');modal.id='sight-settings-modal';modal.className='practice-modal sight-settings-modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','sight-settings-modal-title');modal.innerHTML=`<div class="practice-modal-card"><div class="sight-settings-modal-head"><span><strong id="sight-settings-modal-title">出题与检测设置</strong><small>谱面 · 调式 · 难度 · 练习参数</small></span><button type="button" aria-label="取消并关闭" onclick="SightSinging.closeSettingsModal(false)">×</button></div><div class="sight-settings-modal-scroll"></div><div class="release-actions sight-settings-modal-actions"><button type="button" onclick="SightSinging.closeSettingsModal(false)">取消</button><button type="button" class="primary" onclick="SightSinging.closeSettingsModal(true)">确认</button></div></div>`;
    modal.querySelector('.sight-settings-modal-scroll').appendChild(body);document.body.appendChild(modal);details.querySelector('summary')?.setAttribute('aria-expanded','true');modal.addEventListener('click',event=>{if(event.target===modal)this.closeSettingsModal(false);});this._settingsEscape=event=>{if(event.key==='Escape')this.closeSettingsModal(false);};document.addEventListener('keydown',this._settingsEscape);requestAnimationFrame(()=>modal.querySelector('select,button,input')?.focus());
};
SightSinging.closeSettingsModal=function(commit=false){
    const modal=document.getElementById('sight-settings-modal'),details=document.getElementById('sight-settings'),body=modal?.querySelector('.sight-settings-body'),snapshot=this._settingsDraft;if(!modal||!details||!body)return;document.getElementById('sight-mode-filter-modal')?.remove();
    if(!commit&&snapshot){for(const [id,state] of Object.entries(snapshot.controls)){const control=document.getElementById(id);if(!control)continue;if(control.tagName==='SELECT')control.querySelectorAll('option').forEach(option=>{if(option.value===state.value)option.setAttribute('selected','');else option.removeAttribute('selected');});else{try{control.value=state.value;}catch(error){control.setAttribute('value',state.value);}}try{control.checked=state.checked;}catch(error){if(state.checked)control.setAttribute('checked','');else control.removeAttribute('checked');}}this.modeFilters=[...snapshot.modeFilters];}
    details.appendChild(body);modal.remove();details.querySelector('summary')?.setAttribute('aria-expanded','false');document.removeEventListener('keydown',this._settingsEscape);this._settingsEscape=null;this._settingsDraftOpen=false;
    this.syncModeFilterUI();this.syncSetupUI?.();const sensitivity=document.getElementById('sight-sensitivity'),sensitivityOutput=document.getElementById('sight-sensitivity-value');if(sensitivityOutput&&sensitivity)sensitivityOutput.textContent=`${Math.round(Number(sensitivity.value)||68)}%`;
    if(commit){try{localStorage.setItem('music_toolbox_sight_mode_filters_v1353',JSON.stringify(this.modeFilters||[]));}catch(error){}sightSetSensitivityBeforeV1354(sensitivity?.value||68);sightUpdateSetupBeforeV1354();toast('视唱设置已应用');}else toast('已取消本次设置');this._settingsDraft=null;
};

const appInitBeforeV1354=App.init.bind(App);
App.init=async function(){await appInitBeforeV1354();SightSinging.bindSettingsModal();};
SightSinging.bindSettingsModal();

window.MTU_RELEASE_VERSION=RELEASE_VERSION;
})();


/* 音乐工具箱 Ultra v13.5.8 最终发布修复层。 */
(() => {
'use strict';

const FINAL_BUILD='2026.09.17.1';
const finalClamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const finalEscape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const finalIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;
const finalStandalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
if(finalIOS)document.documentElement.dataset.ios='true';if(finalIOS&&finalStandalone)document.documentElement.dataset.iosStandalone='true';

/* 重置缓存是危险操作：先确认，再注销当前源 Service Worker、删除 CacheStorage 和本地数据，最后强制联网重载。 */
App.resetApplication=async function(){
    if(this._resetting)return;
    if(!confirm('重置会清除本应用路径的离线缓存及音乐工具箱的本地设置、自定义调弦和统计。同域其他音乐工具箱副本可能共用这些设置。联网检查成功后才执行。确定继续吗？'))return;
    this._resetting=true;const button=document.getElementById('start-reset-btn');if(button){button.disabled=true;button.textContent='正在重置…';}
    try{
        if(!/^https?:$/.test(location.protocol)||navigator.onLine===false)throw new Error('请先从联网的正式网址打开');
        const base=new URL('./',location.href),probe=new URL('version.json',base);probe.searchParams.set('resetProbe',Date.now());
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
        try{const response=await fetch(probe,{cache:'no-store',signal:controller.signal});if(!response.ok||!(await response.json()).version)throw new Error('无法验证在线版本');}finally{clearTimeout(timer);}
        if(navigator.serviceWorker?.getRegistrations){const registrations=await navigator.serviceWorker.getRegistrations();await Promise.all(registrations.filter(registration=>registration.scope===base.href).map(registration=>registration.unregister()));}
        if(globalThis.caches?.keys){for(const key of await caches.keys()){if(!/^(music-toolbox-ultra-|xingxian-v13-)/.test(key))continue;const cache=await caches.open(key),requests=await cache.keys(),own=requests.filter(request=>request.url.startsWith(base.href));if(own.length&&own.length===requests.length)await caches.delete(key);else await Promise.all(own.map(request=>cache.delete(request)));}}
        for(const storage of [localStorage,sessionStorage]){for(let i=storage.length-1;i>=0;i--){const key=storage.key(i);if(/^(protuner_|music[-_]toolbox[-_]ultra|music_toolbox_|xingxian[-_])/.test(key))storage.removeItem(key);}}
        const target=new URL(location.href);target.searchParams.set('reset',String(Date.now()));location.replace(target.href);
    }catch(error){
        console.error('重置缓存失败',error);this._resetting=false;if(button){button.disabled=false;button.textContent='重置缓存';}PWAInstall.showHint('重置未完成：'+(error.message||'请联网后重试'));
    }
};

/* 播放与录音分离：只有真正需要检测时才占用麦克风。 */
const appInitBeforeFinal=App.init.bind(App);
App.init=async function(){
    await appInitBeforeFinal();
    AudioEngine.loadAccentSample?.('accent_cc0_02');
    if(this.currentPage==='tuner')await AudioEngine.ensureMicrophone();
};
const appGoPageBeforeFinal=App.goPage.bind(App);
App.goPage=function(name,navItem){
    const result=appGoPageBeforeFinal(name,navItem);
    if(name==='tuner')AudioEngine.ensureMicrophone();
    else if(!Practice.isRecording&&!SightSinging.recording)AudioEngine.releaseMicrophone();
    return result;
};
const practiceToggleBeforeFinal=Practice.toggleRec.bind(Practice);
Practice.toggleRec=async function(){
    if(!this.isRecording){if(!await AudioEngine.ensureMicrophone())return;practiceToggleBeforeFinal();}
    else{practiceToggleBeforeFinal();AudioEngine.releaseMicrophone();}
};
const sightToggleBeforeFinal=SightSinging.toggleRecord.bind(SightSinging);
SightSinging.toggleRecord=async function(){
    if(!this.recording&&!(await AudioEngine.ensureMicrophone())){this.setLamp?.('bad','麦克风不可用');return;}
    return sightToggleBeforeFinal();
};
const sightFinishBeforeFinal=SightSinging.finishRecord.bind(SightSinging);
SightSinging.finishRecord=function(){const result=sightFinishBeforeFinal();if(App.currentPage!=='tuner')setTimeout(()=>{if(!Practice.isRecording&&!this.recording)AudioEngine.releaseMicrophone();},160);return result;};
document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden'&&!Practice.isRecording&&!SightSinging.recording)AudioEngine.releaseMicrophone();
    else if(document.visibilityState==='visible'&&App.currentPage==='tuner')AudioEngine.ensureMicrophone();
});
addEventListener('pagehide',()=>AudioEngine.releaseMicrophone(),{passive:true});

/* 调音器：自适应噪声底、起音/延音滞回与 520ms 显示保持。 */
Tuner.noiseFloor=.0012;Tuner.lastValidAt=0;Tuner.displayHoldMs=520;
Tuner.startLoop=function(){
    cancelAnimationFrame(this.animId);
    const loop=timestamp=>{
        this.animId=requestAnimationFrame(loop);
        if(!AudioEngine.analyser||App.currentPage!=='tuner'||!AudioEngine.micStream?.active)return;
        const dt=Math.min(Math.max(0,(timestamp-this.lastFrameTime)/1000),.05);this.lastFrameTime=timestamp;
        const capture=AudioEngine.captureProfiles[AudioEngine.captureProfile]||AudioEngine.captureProfiles.standard,result=AudioEngine.samplePitch(this.minFreq,this.maxFreq),now=performance.now();this.displayHoldMs=capture.holdMs;
        if(!result.valid||!result.freq)this.noiseFloor=finalClamp(this.noiseFloor*.965+(result.rms||0)*.035,capture.rmsFloor*.85,.025);
        const sustain=now-this.lastValidAt<this.displayHoldMs,threshold=Math.max(capture.rmsFloor,this.gateThreshold*capture.gateScale*(sustain?capture.sustainGate:1),this.noiseFloor*(sustain?capture.noiseSustain:capture.noiseAttack));
        const valid=result.valid&&result.freq>0&&result.rms>=threshold;
        window.TunerAssist?.observe({...result,valid},now);
        if(!valid){
            if(sustain){this.updateNeedle(this.displayCents||0,dt);return;}
            this.hideSnapWarning();
            if(this.displayNote!=='--'){this.displayNote='--';this.displayFreq=0;this.displayCents=0;this.isTuned=false;this.updateDisplay();}
            this.freqBuffer=[];this.updateNeedle(0,dt);
            if(this.confirmedStringIdx!==-1||this.pendingStringIdx!==-1){this.confirmedStringIdx=-1;this.pendingStringIdx=-1;this.renderStrings();}
            return;
        }
        this.lastValidAt=now;this.noiseFloor=finalClamp(this.noiseFloor*.992+Math.min(result.rms,threshold)*.008,capture.rmsFloor*.85,.025);
        this.freqBuffer.push(result.freq);if(this.freqBuffer.length>this.freqBufferSize)this.freqBuffer.shift();
        const medianFreq=this.getMedianFreq(),midi=freqToMidi(medianFreq,this.a4),roundedMidi=Math.round(midi),cents=(midi-roundedMidi)*100,pc=((roundedMidi%12)+12)%12,noteName=NOTE_NAMES[pc];
        if(pc!==this.stableNote){if(pc===this.lastNote){this.stableCount++;if(this.stableCount>=2){this.stableNote=pc;this.stableCount=0;}}else this.stableCount=0;this.lastNote=pc;}
        if(this.stableNote>=0){this.displayNote=noteName;this.displayFreq=medianFreq;this.displayCents=cents;this.isTuned=Math.abs(cents)<5;}
        this.updateDisplay();this.updateNeedle(cents,dt);this.detectString(roundedMidi,result.confidence);
        if(this.lockedString>=0&&this.targetStrings[this.lockedString]){const targetMidi=this.targetStrings[this.lockedString].midi;midi-targetMidi>=3?this.showSnapWarning(noteName):this.hideSnapWarning();}else this.hideSnapWarning();
    };
    this.lastFrameTime=performance.now();this.animId=requestAnimationFrame(loop);
};

/* 节拍器：先完成默认重拍采样解码，再调度第一拍。 */
Metro._finalStartToken=0;Metro._starting=false;
Metro.start=async function(){
    window.DrumWorkshop?.stop();
    if(this.playing||this._starting)return;const token=++this._finalStartToken;this._starting=true;
    const button=document.getElementById('play-btn');if(button){button.disabled=true;button.setAttribute('aria-label','正在准备节拍器音色');}
    try{if(!AudioEngine.ctx)await AudioEngine.init();else if(AudioEngine.ctx.state==='suspended')await AudioEngine.ctx.resume();await this._prepareCurrentSounds();}
    catch(error){console.warn('节拍器音色准备失败',error);toast('音色准备失败，请检查本地素材');return;}
    finally{if(button){button.disabled=false;button.removeAttribute('aria-label');}this._starting=false;}
    if(token!==this._finalStartToken||this.playing)return;
    this.playing=true;this.currentBeat=0;this.nextTime=AudioEngine.ctx.currentTime+.075;this._scheduler();
    if(button)button.innerHTML='<svg viewBox="0 0 24 24" style="width:22px;height:22px;fill:#fff"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>';
};
const metroStopBeforeFinal=Metro.stop.bind(Metro);
Metro.stop=function(){this._finalStartToken++;this._starting=false;return metroStopBeforeFinal();};
Metro.toggle=function(){if(this._starting){this.stop();return;}if(this.playing)this.stop();else{this.customMode=false;void this.start();}};
Metro.toggleCustomPlayback=function(){if(this.playing&&this.customMode){this.stop();return;}if(this.playing)this.stop();this.customMode=true;void this.start();};

/* 视唱谱面：手机默认每行 1 小节，平板默认每行 2 小节，并可手动切换。 */
SightSinging.scoreLayout=localStorage.getItem('music_toolbox_sight_layout_final')||'auto';
SightSinging._layoutBarsPerSystem=function(){if(this.scoreLayout==='horizontal')return Infinity;if(this.scoreLayout==='one'||this.scoreLayout.startsWith('grid'))return 1;if(this.scoreLayout==='two')return 2;return matchMedia('(min-width:768px)').matches?2:1;};
SightSinging._splitForSystems=function(exercise,barsPerSystem){
    const [numerator,denominator]=String(exercise.meter||'4/4').split('/').map(Number),beats=Math.max(.25,(numerator||4)*4/(denominator||4)),limit=Math.max(beats,beats*barsPerSystem),chunks=[];let chunk={seq:[],midis:[],durations:[]},used=0;
    const flush=()=>{if(!chunk.durations.length)return;chunks.push({...exercise,seq:chunk.seq,midis:chunk.midis,durations:chunk.durations,bars:Math.max(1,Math.ceil(chunk.durations.reduce((a,b)=>a+b,0)/beats))});chunk={seq:[],midis:[],durations:[]};used=0;};
    exercise.durations.forEach((rawDuration,index)=>{let remaining=Math.max(.001,Number(rawDuration)||.25);while(remaining>.0001){const part=Math.min(remaining,limit-used),raw=exercise.seq?.[index],copy=Array.isArray(raw)?[...raw]:raw&&typeof raw==='object'?{...raw}:raw;if(Array.isArray(copy))copy[1]=part;else if(copy&&typeof copy==='object')copy.duration=part;chunk.seq.push(copy);chunk.midis.push(exercise.midis[index]);chunk.durations.push(part);used+=part;remaining-=part;if(used>=limit-.0001)flush();}});flush();return chunks;
};
const sightRenderBeforeFinal=SightSinging.renderScore.bind(SightSinging);
SightSinging.renderScore=function(){
    const box=document.getElementById('sight-score'),exercise=this.exercise,barsPerSystem=this._layoutBarsPerSystem();if(!box||!exercise||!Number.isFinite(barsPerSystem))return sightRenderBeforeFinal();
    const chunks=this._splitForSystems(exercise,barsPerSystem);if(chunks.length<=1)return sightRenderBeforeFinal();
    const original=exercise,systems=[];this._buildingSystems=true;
    try{let offset=0;const total=chunks.reduce((sum,chunk)=>sum+chunk.durations.reduce((a,b)=>a+b,0),0);for(let index=0;index<chunks.length;index++){this.exercise=chunks[index];sightRenderBeforeFinal();const duration=chunks[index].durations.reduce((a,b)=>a+b,0);const markup=box.innerHTML.replace(/id="sight-drum-playhead"/g,`id="sight-drum-playhead-${index}" data-sight-playhead="true" data-progress-start="${offset/total}" data-progress-end="${(offset+duration)/total}"`);systems.push(`<section class="sight-system" aria-label="第 ${index+1} 行谱面">${markup}</section>`);offset+=duration;}}
    finally{this.exercise=original;this._buildingSystems=false;}
    const grid=this.scoreLayout==='grid2'?' grid-2':this.scoreLayout==='grid3'?' grid-3':'';box.innerHTML=`<div class="sight-systems${grid}">${systems.join('')}</div>`;requestAnimationFrame(()=>this.applyScoreZoom());
};
const sightZoomBeforeFinal=SightSinging.applyScoreZoom.bind(SightSinging);
SightSinging.applyScoreZoom=function(){
    const box=document.getElementById('sight-score'),systems=box?.querySelectorAll('.sight-system');if(!systems?.length){if(this.scoreLayout==='horizontal')return sightZoomBeforeFinal();const target=box?.querySelector('svg,.sight-jianpu'),output=document.getElementById('sight-score-zoom-value');if(!target)return;if(output)output.textContent=`${this.scoreZoom}%`;target.style.setProperty('width',`${this.scoreZoom}%`,'important');target.style.setProperty('min-width',`${this.scoreZoom}%`,'important');target.style.setProperty('height','auto','important');return;}
    const output=document.getElementById('sight-score-zoom-value');if(output)output.textContent=`${this.scoreZoom}%`;systems.forEach(system=>{const target=system.querySelector('svg,.sight-jianpu');if(!target)return;target.style.setProperty('width',`${this.scoreZoom}%`,'important');target.style.setProperty('min-width',`${this.scoreZoom}%`,'important');target.style.setProperty('height','auto','important');});
};
SightSinging._layoutLabel=function(){return {auto:'自动',horizontal:'横向',one:'1 小节/行',two:'2 小节/行',grid2:'2×2 网格',grid3:'2×3 网格'}[this.scoreLayout]||'自动';};
SightSinging.syncLayoutButton=function(){const button=document.getElementById('sight-layout-button');if(button)button.textContent=`谱面·${this._layoutLabel()}`;};
SightSinging.setScoreLayout=function(mode){const allowed=['auto','horizontal','one','two','grid2','grid3'];this.scoreLayout=allowed.includes(mode)?mode:'auto';try{localStorage.setItem('music_toolbox_sight_layout_final',this.scoreLayout);}catch(error){}document.getElementById('sight-layout-modal')?.remove();this.syncLayoutButton();this.renderScore();};
SightSinging.openScoreLayout=function(){
    document.getElementById('sight-layout-modal')?.remove();const modal=document.createElement('div');modal.id='sight-layout-modal';modal.className='practice-modal release-modal';const choices=[['auto','自动换行','手机 1 小节/行，平板 2 小节/行'],['horizontal','横向连续','谱面向右延伸并横向滑动'],['one','每行 1 小节','竖向逐小节阅读'],['two','每行 2 小节','宽屏紧凑阅读'],['grid2','2×2 网格','两列谱面，每格 1 小节'],['grid3','2×3 网格','两列、最多三行']];modal.innerHTML=`<div class="practice-modal-card"><h3>谱面布局</h3><p class="release-modal-note">谱面内容、练习长度、示范和检测范围不变，只调整阅读方式。</p><div class="sight-layout-choice">${choices.map(([value,label,note])=>`<button type="button" class="${this.scoreLayout===value?'active':''}" onclick="SightSinging.setScoreLayout('${value}')"><strong>${finalEscape(label)}</strong><small>${finalEscape(note)}</small></button>`).join('')}</div><div class="release-actions"><button type="button" onclick="document.getElementById('sight-layout-modal').remove()">取消</button><button type="button" class="primary" onclick="SightSinging.setScoreLayout('${this.scoreLayout}')">完成</button></div></div>`;document.body.appendChild(modal);
};
SightSinging.installLayoutButton=function(){if(document.getElementById('sight-layout-button'))return;const score=document.getElementById('sight-score'),button=document.createElement('button');if(!score)return;button.id='sight-layout-button';button.className='sight-layout-button';button.type='button';button.onclick=()=>this.openScoreLayout();score.insertAdjacentElement('afterend',button);this.syncLayoutButton();};
const sightInitBeforeFinal=SightSinging.init.bind(SightSinging);
SightSinging.init=function(){const result=sightInitBeforeFinal();this.installLayoutButton();this.renderScore();return result;};
let sightResizeTimer=0;addEventListener('resize',()=>{if(SightSinging.scoreLayout!=='auto')return;clearTimeout(sightResizeTimer);sightResizeTimer=setTimeout(()=>{if(App.currentPage==='practice')SightSinging.renderScore();},180);},{passive:true});

/* 多行鼓谱的每一行使用独立播放指针，避免重复 DOM ID。 */
const sightProgressBeforeFinal=SightSinging.setPlaybackProgress.bind(SightSinging);
SightSinging.setPlaybackProgress=function(ratio,label){
    const result=sightProgressBeforeFinal(ratio,label),value=Math.max(0,Math.min(1,Number(ratio)||0));
    document.querySelectorAll('[data-sight-playhead="true"]').forEach(playhead=>{const from=Number(playhead.dataset.progressStart),to=Number(playhead.dataset.progressEnd),local=Math.max(0,Math.min(1,(value-from)/Math.max(.0001,to-from))),start=Number(playhead.dataset.startX),end=Number(playhead.dataset.endX),x=start+(end-start)*local;playhead.setAttribute('x1',String(x));playhead.setAttribute('x2',String(x));playhead.setAttribute('opacity',value>=from&&value<to&&value<1?'0.92':'0');});
    return result;
};

/* 更新失败时显示确切缺失路径，不再只给模糊错误。 */
if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('message',event=>{const data=event.data||{};if(data.type==='CACHE_ERROR'&&data.failed)PWAUpdate.setState('error','发布素材不完整 · 使用当前版本',`缺失：${data.failed}。已保留设备中的完整旧缓存。`,100,false);});

document.querySelector('.start-btn')?.setAttribute('aria-label','进入音乐工具箱 Ultra');
document.documentElement.dataset.finalBuild=FINAL_BUILD;
})();

/* v13.5.9：调音器独立增强，不改变录音/视唱的检测策略和现有音色。 */
(() => {
const node=id=>document.getElementById(id);
const note=midi=>midiToName(Math.round(midi));
const assist={
    mode:'auto',active:'hybrid',lastGood:0,signalSince:0,lastProbe:0,probeWins:0,lastSwitch:-Infinity,lastUI:0,
    device(nav=navigator,width=innerWidth,coarse=matchMedia('(pointer:coarse)').matches){
        const ua=nav.userAgent||'',ipad=/iPad/.test(ua)||(nav.platform==='MacIntel'&&nav.maxTouchPoints>1);
        const os=ipad||/iPhone|iPod/.test(ua)?'iOS/iPadOS':/Android/.test(ua)?'Android':/Windows/.test(ua)?'Windows':/Mac/.test(ua)?'macOS':/Linux/.test(ua)?'Linux':'未知系统';
        const kind=ipad?'平板':/iPhone|iPod/.test(ua)?'手机':/Android/.test(ua)?(/Mobile/.test(ua)?'手机':'平板/大屏设备'):coarse&&width<1100?'触控设备':'电脑';
        return {os,kind,label:`${os} · ${kind}（推断）`};
    },
    keyCenter(midi){const m=Math.max(21,Math.min(108,midi));let whites=0;for(let n=21;n<m;n++)if(![1,3,6,8,10].includes(n%12))whites++;return (whites+([1,3,6,8,10].includes(m%12)?0:.5))/52*100;},
    position(midi){const m=Math.max(21,Math.min(108,midi)),lo=Math.floor(m),hi=Math.ceil(m);return this.keyCenter(lo)+(this.keyCenter(hi)-this.keyCenter(lo))*(m-lo);},
    init(){
        if(this.ready)return;this.ready=true;
        try{const saved=localStorage.getItem('music_toolbox_tuner_algorithm');if(['auto','hybrid','yin'].includes(saved))this.mode=saved;}catch{}
        this.active=this.mode==='yin'?'yin':'hybrid';this.lastGood=performance.now();
        const box=document.createElement('section');box.id='tuner-range';box.className='tuner-range';
        box.innerHTML='<div class="tuner-range-heading"><strong>88 键音域</strong><span>低音 ← A0—C8 → 高音</span></div><div class="tuner-range-track" role="img" aria-label="A0 到 C8，88 个等半音位置；蓝点为调弦目标"><div class="tuner-range-keys"></div><div id="tuner-range-targets"></div><i id="tuner-range-pointer" hidden></i></div><div class="tuner-range-labels"><span>A0</span><span>C2</span><span>C4 中央 C</span><span>C6</span><span>C8</span></div><p id="tuner-range-reading">等待单音输入 · 蓝点是各弦的目标音</p><div id="tuner-range-legend"></div><p id="tuner-detection-status" role="status">请逐根弹奏；未锁定时只推测最接近的琴弦。</p>';
        node('a4-box').insertAdjacentElement('afterend',box);
        box.querySelector('.tuner-range-track').setAttribute('aria-label','A0 到 C8，52 个白键与 36 个黑键；蓝点为调弦目标');
        box.querySelector('.tuner-range-keys').innerHTML=Array.from({length:88},(_,i)=>{const midi=i+21,black=[1,3,6,8,10].includes(midi%12);return `<i class="${black?'black':'white'}" data-midi="${midi}" style="left:${this.keyCenter(midi)}%"></i>`;}).join('');
        box.querySelectorAll('.tuner-range-labels span').forEach((label,i)=>label.style.left=this.position([21,36,60,84,108][i])+'%');
        this.renderTargets();this.sync();
    },
    setMode(value){
        this.mode=['auto','hybrid','yin'].includes(value)?value:'auto';this.active=this.mode==='yin'?'yin':'hybrid';
        this.signalSince=0;this.probeWins=0;this.lastGood=performance.now();this.lastSwitch=-Infinity;
        AudioEngine.cachedPitch=null;Tuner.freqBuffer=[];Tuner.lastValidAt=0;
        try{localStorage.setItem('music_toolbox_tuner_algorithm',this.mode);}catch{}
        this.sync();
    },
    sync(){
        if(node('tuner-algorithm'))node('tuner-algorithm').value=this.mode;
        if(node('tuner-capture'))node('tuner-capture').value=AudioEngine.captureProfile;
        const dev=this.device(),track=AudioEngine.micStream?.getAudioTracks?.()[0],settings=track?.getSettings?.()||{};
        if(node('tuner-device-info'))node('tuner-device-info').textContent=`${dev.label} · ${AudioEngine.ctx?'Web Audio':'等待音频启用'} · ${AudioEngine.captureBackend||'音乐约束'}${settings.sampleRate?' · '+settings.sampleRate+' Hz':''}`;
        if(node('tuner-detection-badge'))node('tuner-detection-badge').textContent=`${this.mode==='auto'?'自动':'手动'} · ${this.active==='yin'?'YIN 宽音域':'YIN + HPS'}`;
    },
    async reconnect(){
        const button=node('tuner-diagnostics')?.querySelector('button');if(button)button.disabled=true;
        try{AudioEngine.releaseMicrophone(false);if(AudioEngine._micPromise)await AudioEngine._micPromise;AudioEngine._micRecoveries=0;this.lastGood=performance.now();await AudioEngine.ensureMicrophone();this.sync();}
        finally{if(button)button.disabled=false;}
    },
    renderTargets(){
        const layer=node('tuner-range-targets'),legend=node('tuner-range-legend');if(!layer)return;
        layer.replaceChildren();legend.replaceChildren();
        Tuner.targetStrings.forEach((string,index)=>{
            const label=`${Tuner.targetStrings.length-index}弦 ${note(string.midi)}`,dot=document.createElement('i');
            dot.className='tuner-range-target';dot.style.left=this.position(string.midi)+'%';dot.style.top=(12+index%3*9)+'px';dot.title=label;
            const chip=document.createElement('span');chip.textContent=label;chip.className=Tuner.lockedString===index?'locked':'';
            layer.appendChild(dot);legend.appendChild(chip);
        });
        this.renderCapoNotice();this.renderReading();
    },
    renderCapoNotice(){
        const layer=node('tuner-range-targets');if(!layer)return;
        let notice=node('tuner-range-capo');if(!notice){notice=document.createElement('div');notice.id='tuner-range-capo';notice.setAttribute('role','status');node('tuner-range-legend').insertAdjacentElement('beforebegin',notice);}
        const strings=Tuner.targetStrings,active=GlobalCapo.mode==='full'&&GlobalCapo.fret>0||GlobalCapo.mode==='spider'&&GlobalCapo.spider.slice(0,strings.length).some(s=>s.mode!=='off');
        notice.hidden=!active;notice.replaceChildren();if(!active)return;
        const title=document.createElement('strong');title.textContent=GlobalCapo.mode==='spider'?'蜘蛛变调夹生效中':'变调夹生效中 · 第 '+GlobalCapo.fret+' 品';notice.appendChild(title);
        const details=document.createElement('p');details.textContent=strings.map((s,i)=>{const c=GlobalCapo.spider[i];if(GlobalCapo.mode==='spider'&&(!c||c.mode==='off'))return '';return `${strings.length-i}弦${GlobalCapo.mode==='spider'?' '+c.fret+'品'+(c.mode==='harmonic'?'泛音':'实按'):''}：${s.baseName} → ${note(s.midi)}`;}).filter(Boolean).join('；');notice.appendChild(details);
        const duplicates=new Map();strings.forEach((s,i)=>{const group=duplicates.get(s.midi)||[];group.push(strings.length-i);duplicates.set(s.midi,group);});
        const same=[...duplicates].filter(([,numbers])=>numbers.length>1).map(([m,numbers])=>numbers.join('／')+'弦同为 '+note(m));
        const explanation=document.createElement('p');explanation.textContent='蓝点表示变调夹作用后的目标音高。'+(same.length?same.join('；')+'，同音点上下错开显示。':'');notice.appendChild(explanation);
        const button=document.createElement('button');button.type='button';button.textContent='查看／调整变调夹';button.onclick=()=>GlobalCapo.open('tuner');notice.appendChild(button);
    },
    describe(midi,targets=Tuner.targetStrings,locked=Tuner.lockedString){
        if(!Number.isFinite(midi))return '等待单音输入 · 蓝点是各弦的目标音';
        const current=note(midi),outside=midi<21?' · 低于 A0':midi>108?' · 高于 C8':'';
        if(!targets.length)return `${current}${outside} · 数字表示八度，数字越大音越高`;
        let index=locked>=0&&locked<targets.length?locked:targets.reduce((best,s,i)=>Math.abs(midi-s.midi)<Math.abs(midi-targets[best].midi)?i:best,0);
        const diff=(midi-targets[index].midi)*100,number=targets.length-index,which=locked>=0?'锁定':'最接近';
        const state=Math.abs(diff)<5?'接近目标':`${diff>0?'偏高':'偏低'} ${Math.abs(diff)>=100?(Math.abs(diff)/100).toFixed(1)+' 半音':Math.abs(diff).toFixed(0)+' 音分'}`;
        const warning=locked>=0&&diff>=300?'；先核对弦与八度，勿继续盲目拧紧':'';
        return `${current}${outside} · ${which} ${number}弦 ${note(targets[index].midi)} · ${state}${warning}`;
    },
    renderReading(){
        const pointer=node('tuner-range-pointer'),reading=node('tuner-range-reading');if(!pointer)return;
        const midi=Tuner.displayFreq>0?freqToMidi(Tuner.displayFreq,Tuner.a4):NaN;
        pointer.hidden=!Number.isFinite(midi);if(!pointer.hidden)pointer.style.left=this.position(midi)+'%';
        reading.textContent=this.describe(midi);
    },
    observe(result,now){
        const profile=AudioEngine.captureProfiles[AudioEngine.captureProfile]||AudioEngine.captureProfiles.standard;
        if(result.valid){this.lastGood=now;this.signalSince=0;}else if(result.rms>Math.max(profile.rmsFloor*3,Tuner.gateThreshold*profile.gateScale)){if(!this.signalSince)this.signalSince=now;}else{this.signalSince=0;this.probeWins=0;}
        if(now-this.lastUI<300)return;this.lastUI=now;this.sync();
        const status=node('tuner-detection-status');if(!status)return;
        status.textContent=result.valid?'已识别单音 · 弦号为音高推测，泛音可能造成八度误判。':now-this.lastGood>12000?(this.signalSince?'有输入但音高不稳定，可在下方切换算法或采集方式。':'暂未收到稳定单音，请检查权限、输入设备并逐根弹奏。'):'等待稳定单音；静音不触发算法切换。';
    },
    // 固定窗口的 CMNDF；将完整 88 键范围与原有窄音域检测隔离。
    yin(buffer,sampleRate,minFreq=26,maxFreq=4500){
        const step=sampleRate>=40000&&maxFreq<2000?2:1,sr=sampleRate/step,n=Math.floor(buffer.length/step);
        const maxTau=Math.min(Math.ceil(sr/minFreq),Math.floor(n/2)-2),minTau=Math.max(2,Math.floor(sr/maxFreq)),count=Math.min(1024,n-maxTau-2);
        let power=0;for(let i=0;i<buffer.length;i++)power+=buffer[i]*buffer[i];const rms=Math.sqrt(power/buffer.length);
        if(count<64||rms<.0001)return {freq:0,confidence:0,rms,valid:false};
        if(!this.yinValues||this.yinValues.length<maxTau+2)this.yinValues=new Float32Array(maxTau+2);
        const values=this.yinValues;values[0]=1;let sum=0;
        for(let tau=1;tau<=maxTau+1;tau++){let diff=0;for(let i=0;i<count;i++){const delta=buffer[i*step]-buffer[(i+tau)*step];diff+=delta*delta;}sum+=diff;values[tau]=sum?diff*tau/sum:1;}
        let best=minTau;for(let tau=minTau;tau<=maxTau;tau++){if(values[tau]<values[best])best=tau;if(values[tau]<.12){while(tau<maxTau&&values[tau+1]<values[tau])tau++;best=tau;break;}}
        const confidence=Math.max(0,1-values[best]),denom=values[best-1]-2*values[best]+values[best+1],delta=denom?(values[best-1]-values[best+1])/(2*denom):0;
        const freq=sr/(best+(Math.abs(delta)<1?delta:0));return {freq,confidence,rms,valid:confidence>.85&&freq>=minFreq*.995&&freq<=maxFreq*1.005};
    }
};
window.TunerAssist=assist;
const originalDetect=AudioEngine.detectPitch.bind(AudioEngine);
AudioEngine.detectPitch=function(sr,min,max){
    if(App.currentPage!=='tuner')return originalDetect(sr,min,max);
    if(assist.active==='yin')return assist.yin(this.timeBuf,sr,min,max);
    const result=originalDetect(sr,min,max),now=performance.now();
    if(assist.mode==='auto'&&!result.valid&&assist.signalSince&&now-assist.signalSince>2500&&now-assist.lastProbe>250&&now-assist.lastSwitch>20000){
        assist.lastProbe=now;const candidate=assist.yin(this.timeBuf,sr,min,max);
        assist.probeWins=candidate.valid?assist.probeWins+1:0;
        if(assist.probeWins>=3){assist.active='yin';assist.lastSwitch=now;assist.probeWins=0;assist.sync();return candidate;}
    }else if(result.valid)assist.probeWins=0;
    return result;
};
const renderStrings=Tuner.renderStrings.bind(Tuner);Tuner.renderStrings=function(){const result=renderStrings();assist.renderTargets();return result;};
const updateDisplay=Tuner.updateDisplay.bind(Tuner);Tuner.updateDisplay=function(){const result=updateDisplay();assist.renderReading();return result;};
const tunerInit=Tuner.init.bind(Tuner);Tuner.init=function(){assist.init();return tunerInit();};
// 检测边界留出 A4=430–450 和估计误差的余量，音域显示仍严格为 A0–C8。
const setMode=Tuner.setMode.bind(Tuner);Tuner.setMode=function(...args){const result=setMode(...args);this.minFreq=26;this.maxFreq=4500;return result;};
Tuner.minFreq=26;Tuner.maxFreq=4500;
})();

/* 13.5.11: shared physical coordinates, capo validation and automatic capture. */
AudioEngine.capturePreference='auto';
AudioEngine.autoCaptureProfile=function(){return /iPhone|iPad|iPod/.test(navigator.userAgent||'')||(/Mac/.test(navigator.userAgent||'')&&navigator.maxTouchPoints>1)?'iphone':'standard';};
AudioEngine.setCaptureProfile=function(value){this.capturePreference=value==='auto'||!this.captureProfiles[value]?'auto':value;this.captureProfile=this.capturePreference==='auto'?this.autoCaptureProfile():value;return this.applyCaptureProfile();};
AudioEngine.setCaptureProfile('auto');
const micSet13511=Settings.setMicProfile.bind(Settings);
Settings.setMicProfile=async function(value,reconnect=true){await micSet13511(value,reconnect);this.syncAutoCapture();};
Settings.syncAutoCapture=function(){for(const id of ['set-mic-profile','tuner-capture']){const select=document.getElementById(id);if(!select)continue;if(!select.querySelector('option[value="auto"]'))select.insertAdjacentHTML('afterbegin','<option value="auto">自动（推荐）</option>');select.value=AudioEngine.capturePreference;}const note=document.getElementById('set-mic-profile-note');if(note)note.textContent=`${AudioEngine.capturePreference==='auto'?'自动 → ':''}${AudioEngine.captureProfiles[AudioEngine.captureProfile].label}`;};
const tunerSync13511=TunerAssist.sync.bind(TunerAssist);
TunerAssist.sync=function(){tunerSync13511();Settings.syncAutoCapture();};
const settingsInit13511=Settings.init.bind(Settings);
Settings.init=function(){const result=settingsInit13511();this.syncAutoCapture();return result;};

InstrumentPage.strumStringAt=function(event){const zone=document.getElementById('strum-zone'),axis=zone?.dataset.axis==='x'?'x':'y',point=axis==='x'?event.clientX:event.clientY,cells=[...(zone?.querySelectorAll('[data-string]')||[])];let distance=Infinity,best=0;for(const cell of cells){const r=cell.getBoundingClientRect(),d=Math.abs(point-(axis==='x'?r.left+r.width/2:r.top+r.height/2));if(d<distance){distance=d;best=Number(cell.dataset.string);}}return best;};
const syncAxis13511=InstrumentPage.syncStringAxis.bind(InstrumentPage);
InstrumentPage.syncStringAxis=function(){const wrap=document.querySelector('#instrument-stage .virtual-fret-wrap'),zone=document.getElementById('strum-zone'),svg=wrap?.querySelector('.virtual-board-scroll svg');if(!zone||!svg)return;const r=svg.getBoundingClientRect(),horizontal=wrap.classList.contains('is-horizontal');if(horizontal){zone.style.setProperty('height',`${r.height}px`,'important');zone.style.removeProperty('width');}else{zone.style.setProperty('width',`${Math.min(r.width,wrap.clientWidth)}px`,'important');zone.style.removeProperty('height');}syncAxis13511();};
InstrumentPage.bindStrum=function(){const zone=document.getElementById('strum-zone');if(!zone)return;
 const trigger=(s,muted)=>{if(this.mutedStrings.has(s))return;if(muted)AudioEngine.playMutedString(s,null,.34);else this.playInstrumentNote(noteToMidi(this.getTuning()[s])+this.activeFret(s),.76,.20);};
 zone.onpointerdown=e=>{e.preventDefault();zone.setPointerCapture?.(e.pointerId);this.activePointers.add(e.pointerId);if(!this.strumState){const s=this.strumStringAt(e);this.strumState={pointerId:e.pointerId,lastString:s,muted:false};trigger(s,this.activePointers.size>1);}if(this.activePointers.size>1)this.strumState.muted=true;zone.classList.toggle('muted',this.activePointers.size>1);};
 zone.onpointermove=e=>{const st=this.strumState;if(!st||st.pointerId!==e.pointerId)return;e.preventDefault();const s=this.strumStringAt(e);if(s===st.lastString)return;const step=s>st.lastString?1:-1;for(let i=st.lastString+step;;i+=step){trigger(i,st.muted||this.activePointers.size>1);if(i===s)break;}st.lastString=s;};
 const end=e=>{this.activePointers.delete(e.pointerId);if(this.strumState?.pointerId===e.pointerId)this.strumState=null;zone.classList.toggle('muted',this.activePointers.size>1);};zone.onpointerup=end;zone.onpointercancel=end;
};

ChordLib.handFrets=function(frets){return frets.map((f,i)=>this.capoMode==='spider'&&this.spider[i]?.mode==='press'&&f===this.spider[i].fret?0:f);};
ChordLib.fingerCount=function(input){const frets=this.handFrets(input),held=frets.map((f,i)=>f>0?i:-1).filter(i=>i>=0);if(!held.length)return 0;
 // Conservative fret/barre feasibility, not a guarantee for every hand size or technique.
 const masks=[];for(const f of new Set(held.map(i=>frets[i])))for(let a=0;a<frets.length;a++)for(let b=a;b<frets.length;b++){if(frets[a]!==f||frets[b]!==f)continue;let mask=0,valid=true;for(let s=a;s<=b;s++){if(frets[s]>=0&&frets[s]<f){const floor=this.capoMode==='spider'&&this.spider[s]?.mode==='press'?this.spider[s].fret:this.capoMode==='full'?this.capoFret:0;if(floor<f){valid=false;break;}}if(frets[s]===f)mask|=1<<held.indexOf(s);}if(valid)masks.push(mask);}
 const size=1<<held.length,dp=new Array(size).fill(99);dp[0]=0;for(let state=0;state<size;state++)for(const mask of masks)dp[state|mask]=Math.min(dp[state|mask],dp[state]+1);return dp[size-1];
};
const validVoicing13511=ChordLib._isValidVoicing.bind(ChordLib);
ChordLib._isValidVoicing=function(frets,open,pcs){if(!Array.isArray(frets)||frets.length!==open.length||frets.some((f,i)=>f>=0&&!Number.isFinite(this.effectiveMidi(open[i],f,i))))return false;return validVoicing13511(this.handFrets(frets),open,pcs)&&this.fingerCount(frets)<=4;};
const chordSVG13511=ChordLib._renderChordSVG.bind(ChordLib);
ChordLib._renderChordSVG=function(frets){const normalized=this.handFrets(frets),svg=chordSVG13511(normalized),count=frets.length;
 const info=this.capoMode==='spider'?this.spider.slice(0,count).map((c,i)=>{if(c.mode==='off')return '';const midi=this.effectiveMidi(noteToMidi(this.getTuningNotes()[i]),0,i),name=NOTE_NAMES[((midi%12)+12)%12]+(Math.floor(midi/12)-1);return `${count-i}弦 ${c.mode==='press'?'实按':'泛音'}${c.fret}品 → 空弦 ${name}${c.mode==='harmonic'?'；按品恢复原调弦':'；夹位为新空弦'}`;}).filter(Boolean):[];
 return svg+(info.length?`<div class="capo-voicing-notes">${info.map(v=>String(v).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))).join('<br>')}</div>`:'');
};
// Recompute selected pitches after capo changes; never retain a stale cached midi.
const activeExplore13511=ChordExplore.activeNotes.bind(ChordExplore);
ChordExplore.activeNotes=function(notes=this.selectedNotes,disabled=this.disabledStrings){const open=this.getTuningNotes().map(noteToMidi),fresh=(notes||[]).map(n=>({...n,midi:this.effectiveMidi(open[n.string],n.fret,n.string)})).filter(n=>Number.isFinite(n.midi));return activeExplore13511(fresh,disabled);};

/* 13.5.12: a chord diagram and its audition share one computed voicing. */
ChordLib.voicingStateKey=function(){return JSON.stringify([this.root,this.type,this.bassMode,this.getTuningNotes(),this.capoMode,this.capoFret,this.spider]);};
ChordLib.cancelAudition=function(){this._auditionToken=(this._auditionToken||0)+1;(this._auditionTimers||[]).forEach(clearTimeout);this._auditionTimers=[];};
const generate13512=ChordLib.generate.bind(ChordLib);
ChordLib.generate=function(){this.cancelAudition();this._voicingStateKey=this.voicingStateKey();return generate13512();};
ChordLib.ensureVoicingState=function(){if(this._voicingStateKey!==this.voicingStateKey())this.generate();};
const renderChord13512=ChordLib.renderChord.bind(ChordLib);
ChordLib.renderChord=function(){if(this._voicingStateKey!==this.voicingStateKey()){this.generate();return;}this.cancelAudition();const shape=this.voicings[this.voicingIdx],opens=this.getTuningNotes().map(noteToMidi);this.voicingSnapshot=shape?{key:this._voicingStateKey,index:this.voicingIdx,frets:[...shape.frets],notes:shape.frets.map((f,string)=>({string,fret:f,midi:f<0?null:this.effectiveMidi(opens[string],f,string)})).filter(n=>Number.isFinite(n.midi))}:null;return renderChord13512();};
const switchTab13512=ChordLib.switchTab.bind(ChordLib);
ChordLib.switchTab=function(tab,button){this.cancelAudition();GlobalCapo.apply(false);const result=switchTab13512(tab,button);if(tab==='lookup')this.ensureVoicingState();return result;};
const goPage13512=App.goPage.bind(App);
App.goPage=function(page,...args){if(page!=='chord')ChordLib.cancelAudition();const result=goPage13512(page,...args);if(page==='chord'&&document.getElementById('chord-lookup-page')?.classList.contains('active'))ChordLib.ensureVoicingState();return result;};
ChordLib.playChord=async function(){
 this.ensureVoicingState();const snapshot=this.voicingSnapshot;if(!snapshot?.notes.length)return;this.cancelAudition();const token=this._auditionToken;
 try{if(!AudioEngine.ctx)await AudioEngine.init();if(AudioEngine.ctx.state==='suspended')await AudioEngine.ctx.resume();await AudioEngine.prepareInstrument(snapshot.notes.map(n=>n.midi),'chord');
 if(token!==this._auditionToken||snapshot.key!==this.voicingStateKey())return;
 this._auditionTimers=snapshot.notes.map(note=>setTimeout(()=>{if(token===this._auditionToken&&snapshot.key===this.voicingStateKey())AudioEngine.playInstrument(note.midi,.9,.19,'chord');},note.string*38));
 }catch(error){console.warn('和弦试听未准备完成',error);toast('和弦音色未准备完成，请重试');}
};

/* Piano-range audition: overview stays compact; an octave panel supplies touch targets. */
TunerAssist.previewKey=async function(midi){
 midi=Number(midi);if(!Number.isInteger(midi)||midi<21||midi>108)return;const token=this._keyPreviewToken=(this._keyPreviewToken||0)+1;
 try{if(!AudioEngine.ctx)await AudioEngine.init();if(AudioEngine.ctx.state==='suspended')await AudioEngine.ctx.resume();await AudioEngine.prepareInstrument([midi],'piano');if(token!==this._keyPreviewToken)return;
 AudioEngine.playInstrument(midi,.85,.22,'piano');this.previewMidi=midi;
 document.querySelectorAll('[data-range-midi]').forEach(key=>key.classList.toggle('auditioning',Number(key.dataset.rangeMidi)===midi));
 const output=document.getElementById('range-key-status'),name=NOTE_NAMES[midi%12]+(Math.floor(midi/12)-1);if(output)output.textContent=`试听 ${name} · ${midiToFreq(midi,Tuner.a4).toFixed(2)} Hz（A4=${Tuner.a4}）`;
 }catch(error){console.warn('琴键试听失败',error);toast('琴键音色未准备完成，请重试');}
};
TunerAssist.renderKeyOctave=function(octave){this.keyOctave=Math.max(0,Math.min(8,Number(octave)||0));const host=document.getElementById('range-key-octave');if(!host)return;const low=Math.max(21,this.keyOctave*12+12),high=Math.min(108,this.keyOctave*12+23);host.innerHTML=Array.from({length:high-low+1},(_,i)=>{const midi=low+i,name=NOTE_NAMES[midi%12]+this.keyOctave;return `<button type="button" data-range-midi="${midi}" class="${[1,3,6,8,10].includes(midi%12)?'black':'white'}" onclick="TunerAssist.previewKey(${midi})">${name}</button>`;}).join('');};
const rangeInit13512=TunerAssist.init.bind(TunerAssist);
TunerAssist.init=function(){rangeInit13512();const box=document.getElementById('tuner-range');if(!box||box.dataset.playable)return;box.dataset.playable='true';
 box.querySelector('.tuner-range-track').setAttribute('role','group');box.querySelector('.tuner-range-track').setAttribute('aria-label','88 键音域，可点按试听；手机可展开大琴键');
 box.querySelectorAll('.tuner-range-keys i[data-midi]').forEach(old=>{const key=document.createElement('button'),midi=Number(old.dataset.midi);key.type='button';key.className=old.className;key.style.cssText=old.style.cssText;key.dataset.rangeMidi=String(midi);key.setAttribute('aria-label','试听 '+NOTE_NAMES[midi%12]+(Math.floor(midi/12)-1));key.onclick=()=>this.previewKey(midi);key.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?21:e.key==='End'?108:Math.max(21,Math.min(108,midi+(e.key==='ArrowRight'?1:-1)));box.querySelector(`.tuner-range-keys [data-range-midi="${next}"]`)?.focus();};old.replaceWith(key);});
 box.insertAdjacentHTML('beforeend','<p id="range-key-status" role="status">点击琴键试听，不改变调弦目标或锁定弦。</p><details class="range-play-panel"><summary>展开大琴键 · 手机试听</summary><label>八度 <select id="range-key-octave-select" onchange="TunerAssist.renderKeyOctave(this.value)">'+Array.from({length:9},(_,i)=>`<option value="${i}" ${i===4?'selected':''}>${i===0?'A0–B0':i===8?'C8':'C'+i+'–B'+i}</option>`).join('')+'</select></label><div id="range-key-octave"></div></details>');this.renderKeyOctave(4);
};
