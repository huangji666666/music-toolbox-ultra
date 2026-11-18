/* 音乐工具箱 Ultra — independent drum arrangement, shared Web Audio engine. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),copy=value=>JSON.parse(JSON.stringify(value));
const roles=['kick','snare','hat','clap','openhat','bass','rim','crash'],names=['底鼓','军鼓','闭镲','手拍','开镲','808 低音','边击／打击','吊镲'];
const kits=[['classic','经典 Trap'],['tight','紧实 Trap'],['bright','明亮 Trap'],['house','House 电子'],['techno','Techno 电子'],['dry','干脆 Trap'],['punch','硬击 Trap'],['dust','颗粒 Breakbeat']];
for(const [kit,label] of kits){
 for(let i=0;i<roles.length;i++){const id=`drum_${kit}_${roles[i]}`;window.MTU_ACCENT_SAMPLE_META[id]={id,label:`${label} · ${names[i]}（原创）`,family:`${label} · 原创鼓组`,source:'原创合成 · CC0',url:window.MTU_ACCENT_INLINE_URLS?.[id]||`./assets/drums/${kit}-${roles[i]}.wav`};}
 METRO_KITS['drum_'+kit]={name:label+' · 手机友好',accent:`drum_${kit}_kick`,beat:`drum_${kit}_rim`,subdivision:`drum_${kit}_hat`,swing:`drum_${kit}_openhat`,tracks:['kick','snare','hat','clap'].map(r=>`drum_${kit}_${r}`)};
}
const approvedKits=[['t06','T06 · 808 风格细镲（默认）'],['t04','T04 · 锐利真镲'],['t05','T05 · 空气感真镲']];
const soundsForKit=id=>roles.map(r=>id==='t06'&&r==='kick'?'drum_dry_kick':`drum_${['hat','openhat'].includes(r)?id:'classic'}_${r}`);
for(const [kit,label] of approvedKits){
 for(const [role,name] of [['hat','闭镲'],['openhat','开镲']]){const id=`drum_${kit}_${role}`;window.MTU_ACCENT_SAMPLE_META[id]={id,label:`${label} · ${name}`,family:label,source:kit==='t06'?'原创合成 · CC0':'VCSL 真镲处理 · CC0',url:window.MTU_ACCENT_INLINE_URLS?.[id]||`./assets/drums/${kit}-${role}.wav`};}
 METRO_KITS['drum_'+kit]={name:label,accent:kit==='t06'?'drum_dry_kick':'drum_classic_kick',beat:`drum_${kit}_hat`,subdivision:`drum_${kit}_hat`,swing:`drum_${kit}_hat`,tracks:[kit==='t06'?'drum_dry_kick':'drum_classic_kick','drum_classic_clap',`drum_${kit}_hat`,`drum_${kit}_openhat`]};
}
// Keep the established first default, put the user's T06 choice second.
const orderedKits=[['studio',METRO_KITS.studio],['drum_t06',METRO_KITS.drum_t06],...Object.entries(METRO_KITS).filter(([id])=>!['studio','drum_t06','shakers'].includes(id))];
Object.keys(METRO_KITS).forEach(id=>delete METRO_KITS[id]);Object.assign(METRO_KITS,Object.fromEntries(orderedKits));
const loadMetro=Metro.loadCustom.bind(Metro);Metro.loadCustom=function(){loadMetro();if(this.kitId==='shakers')this.kitId='custom';if(this.kitId==='drum_t06'&&this.slots.accent==='drum_classic_kick'){this.slots.accent='drum_dry_kick';if(this.trackSounds[0]==='drum_classic_kick')this.trackSounds[0]='drum_dry_kick';}};
const kitOptions=[...approvedKits,...kits,['acoustic','原声鼓组'],['world','传统／手鼓']];
const defaultNotes=(row,bars=2)=>Array.from({length:bars},(_,bar)=>{
 const hits=row===0?[[0,112]]:row===3?[[2,108]]:row===2?[[.5,70],[1,82],[1.5,70],[2.5,70],[3,82],[3.5,70]]:[];
 return hits.map(([t,v])=>({t:bar*4+t,d:.25,n:1,v,manual:false}));
}).flat();
// Quarter-note positions; each style is a seed skeleton, not an exhaustive genre definition.
const styles={trap:{label:'Trap · 半拍',kick:[0,1.75,3.5],snare:[2],hat:.5},hiphop:{label:'Hip-hop',kick:[0,1.5,2.75],snare:[1,3],hat:.5},house:{label:'House · 四拍底鼓',kick:[0,1,2,3],snare:[1,3],hat:.5},techno:{label:'Techno',kick:[0,1,2,3],snare:[1,3],hat:.25},pop:{label:'流行',kick:[0,2],snare:[1,3],hat:.5},rock:{label:'摇滚',kick:[0,2,2.5],snare:[1,3],hat:.5},funk:{label:'Funk · 切分',kick:[0,.75,2,2.75],snare:[1,3],hat:.25},disco:{label:'Disco',kick:[0,1,2,3],snare:[1,3],hat:.5},reggae:{label:'Reggae · One Drop',kick:[2],snare:[2],hat:.5},shuffle:{label:'Shuffle',kick:[0,2],snare:[1,3],hat:2/3},latin:{label:'拉丁打击 · 参考',kick:[0,2.5],snare:[1.5,3],hat:.5},world:{label:'手鼓 · 循环',kick:[0,2],snare:[1.5,3.5],hat:.5}};
const gridOptions=[['4','四分'],['8','八分'],['16','十六分'],['32','三十二分'],['8T','八分三连'],['16T','十六分三连']];
const meters=[...new Set([...Object.keys(Metro.signatures),'6/4','7/4'])];
styles.trap_basic={label:'T06 默认 · 底鼓／Clap／细镲',kick:[0],snare:[2],hat:.5};
const W=window.DrumWorkshop={
 key:'music_toolbox_drum_workshop_v1',ready:false,tab:'metro',playing:false,starting:false,token:0,sources:new Set(),undoStack:[],saved:Object.create(null),
 state:null,
 defaultState(){const sounds=soundsForKit('t06');return {schema:1,bpm:140,signature:'4/4',bars:2,grid:'16',kit:'t06',style:'trap_basic',variant:0,density:.5,velocity:'auto',seed:1,swing:0,tracks:roles.map((r,i)=>({name:names[i],sound:sounds[i],volume:1,mute:false,solo:false,locked:false,notes:defaultNotes(i)}))};},
 resetDefault(){this.checkpoint();this.state=this.defaultState();this.persist();this.render();toast('已载入 T06 默认节奏；原编排可撤销恢复');},
 barLength(){const [n,d]=this.state.signature.split('/').map(Number);return n*4/d;},
 length(){return this.barLength()*this.state.bars;},
 step(){return {'4':1,'8':.5,'16':.25,'32':.125,'8T':1/3,'16T':1/6}[this.state.grid]||.25;},
 validState(s){const [n,d]=String(s?.signature||'').split('/').map(Number),length=n*4/d*s?.bars;return s?.schema===1&&Number.isFinite(s.bpm)&&s.bpm>=30&&s.bpm<=300&&meters.includes(s.signature)&&Number.isInteger(s.bars)&&s.bars>=1&&s.bars<=32&&gridOptions.some(([id])=>id===s.grid)&&Number.isFinite(s.swing)&&s.swing>=0&&s.swing<=.45&&Number.isFinite(s.density)&&s.density>=0&&s.density<=1&&Object.hasOwn(styles,s.style)&&kitOptions.some(([id])=>id===s.kit)&&['auto','manual'].includes(s.velocity)&&Array.isArray(s.tracks)&&s.tracks.length===8&&s.tracks.every(t=>typeof t.name==='string'&&t.name.length<80&&Metro._allSounds().includes(t.sound)&&Number.isFinite(t.volume)&&t.volume>=0&&t.volume<=1&&Array.isArray(t.notes)&&t.notes.length<=4096&&t.notes.every(n=>Number.isFinite(n.t)&&n.t>=0&&n.t<length&&Number.isFinite(n.d)&&n.d>0&&n.d<=4&&n.t+n.d<=length+1e-6&&[1,3,5,6,7].includes(n.n)&&Number.isFinite(n.v)&&n.v>=1&&n.v<=127));},
 load(){this.state=this.defaultState();try{const raw=JSON.parse(localStorage.getItem(this.key)||'null');if(this.validState(raw?.state)){this.state=raw.state;for(const [name,s] of Object.entries(raw.saved||{}).slice(0,30))if(name.length<81&&this.validState(s))this.saved[name]=s;return;}}catch{}if(this.legacyExisted)this.importLegacy(false);else this.persist();},
 persist(){try{localStorage.setItem(this.key,JSON.stringify({state:this.state,saved:this.saved}));return true;}catch{toast('本地存储已满，编排尚未保存；请勿关闭页面');return false;}},
 redoStack:[],
 checkpoint(col){this.stop();this.remember();if(Number.isInteger(col)){const bar=Math.floor(col*this.step()/this.barLength());const keep=this.state.editedBars??=[];if(!keep.includes(bar))keep.push(bar);}},
 remember(){this.redoStack.length=0;this.undoStack.push(copy(this.state));if(this.undoStack.length>12)this.undoStack.shift();this.historyButtons();},
 historyButtons(){for(const [name,stack] of [['undo',this.undoStack],['redo',this.redoStack]]){const button=$('drum-'+name);if(button)button.disabled=!stack.length;}},
 restoreStep(from,to){if(!from.length)return;this.stop();to.push(copy(this.state));this.state=from.pop();this.persist();this.render();},
 undo(){this.restoreStep(this.undoStack,this.redoStack);},redo(){this.restoreStep(this.redoStack,this.undoStack);},
 init(){if(this.ready)return;this.ready=true;this.load();const page=$('page-metro'),basic=document.createElement('div');basic.id='metro-basic-pane';while(page.firstChild)basic.appendChild(page.firstChild);page.appendChild(basic);
 const nav=document.createElement('div');nav.className='metro-subtabs';nav.setAttribute('role','tablist');nav.innerHTML='<button id="metro-tab-basic" role="tab" aria-controls="metro-basic-pane" onclick="DrumWorkshop.switchTab(\'metro\')">节拍器</button><button id="metro-tab-drum" role="tab" aria-controls="drum-workshop" onclick="DrumWorkshop.switchTab(\'drum\')">节奏编排</button>';page.prepend(nav);
 const panel=document.createElement('section');panel.id='drum-workshop';panel.hidden=true;panel.innerHTML='<div id="drum-workspace"></div><details class="drum-legacy"><summary>旧版四轨编排（原内容保留）</summary><p>可继续编辑旧方案，或导入到上方八轨工作区；导入可以撤销。</p><button onclick="DrumWorkshop.importLegacy(true)">导入旧四轨</button></details>';page.appendChild(panel);
 const legacy=panel.querySelector('.drum-legacy');for(const element of [basic.querySelector('.custom-groove-header'),basic.querySelector('.metro-custom-options'),$('metro-custom-container')])if(element)legacy.appendChild(element);
 this.render();this.switchTab('metro');},
 switchTab(tab){this.stop();Metro.stop();this.tab=tab==='drum'?'drum':'metro';if(!$('drum-workshop'))return;$('drum-workshop').hidden=this.tab!=='drum';$('metro-basic-pane').hidden=this.tab!=='metro';for(const [id,on] of [['metro-tab-basic',this.tab==='metro'],['metro-tab-drum',this.tab==='drum']]){$(id).setAttribute('aria-selected',String(on));$(id).classList.toggle('active',on);}},
 importLegacy(undo=true){if(undo)this.checkpoint();const pattern=Metro._ensurePattern(),steps=Metro._stepsFor();this.state.signature=Metro.signature;this.state.bpm=Metro.bpm;this.state.bars=1;this.state.grid=String(Metro.gridResolution);let at=0;const denominator=Number(Metro.signature.split('/')[1]),pulse=4/denominator;
 this.state.tracks.forEach(t=>t.notes=[]);for(let b=0;b<steps.length;b++){const count=steps[b];for(let row=0;row<4;row++){this.state.tracks[row].sound=Metro.trackSounds[row];for(let j=0;j<count;j++){const e=pattern[row]?.[at+j];if(e)this.state.tracks[row].notes.push({t:b*pulse+j*pulse/count,d:pulse/count,n:e.subdivision==='triplet'?3:e.subdivision==='sextuplet'?6:1,v:e.velocity==='accent'?115:85,manual:true});}}at+=count;}
 if(undo){this.persist();this.render();toast('已导入旧四轨；原方案仍保留，可撤销');}},
 change(field,value){const s=this.state,oldBars=s.bars;let next=value;if(field==='bpm')next=Math.max(30,Math.min(300,Number(value)||120));if(field==='bars')next=Math.max(1,Math.min(32,Math.round(Number(value)||oldBars)));if(field==='density'||field==='swing')next=Math.max(0,Math.min(field==='swing'?.45:1,Number(value)||0));
 if(next===s[field])return;
 if(field==='bars'){const end=next*this.barLength(),exceeds=t=>t.notes.some(e=>e.t+e.d>end+1e-6);if(s.tracks.some(t=>t.locked&&exceeds(t))){toast('锁定轨道超出所选小节数');this.render();return;}if(next<oldBars&&s.tracks.some(exceeds)&&!confirm('缩短后将移除范围外的鼓点。可撤销，已保存的作品不变。')){this.render();return;}
 this.checkpoint();s.bars=next;if(next<oldBars){for(const t of s.tracks)t.notes=t.notes.filter(e=>e.t<end).map(e=>({...e,d:Math.min(e.d,end-e.t)}));s.editedBars=(s.editedBars||[]).filter(i=>i<next);}
 const occupied=new Set([...(s.editedBars||[]),...s.tracks.flatMap(t=>t.notes.map(e=>Math.floor(e.t/this.barLength())))]);this.generate(true,false,0,occupied);return;}
 if(field==='signature'){const [n,d]=next.split('/').map(Number);if(s.tracks.some(t=>t.notes.some(e=>e.t+e.d>n*4/d*s.bars+1e-6))){toast('现有鼓点超出新范围，请先调整鼓点');this.render();return;}}
 this.checkpoint();s[field]=next;if(field==='signature')s.grouping=Metro._grouping?.(next)||'';this.persist();this.render();},
 setKit(id){this.checkpoint();this.state.kit=id;const sounds=id==='acoustic'?['accent_cc0_03','accent_cc0_26','accent_cc0_21','accent_cc0_17','accent_cc0_23','accent_cc0_05','accent_cc0_49','accent_cc0_12']:id==='world'?['accent_cc0_42','accent_cc0_43','accent_cc0_16','accent_cc0_17','accent_cc0_37','accent_cc0_44','accent_cc0_45','accent_cc0_31']:roles.map(r=>`drum_${id}_${r}`);
 this.state.tracks.forEach((t,i)=>{if(!t.locked)t.sound=approvedKits.some(([kit])=>kit===id)?soundsForKit(id)[i]:sounds[i];});if(!this.styleOptions().some(([key])=>key===this.state.style))this.state.style=this.styleOptions()[0][0];this.persist();this.render();},
 track(row,field,value){this.checkpoint();const t=this.state.tracks[row];t[field]=field==='volume'?Math.max(0,Math.min(1,Number(value))):value;this.persist();this.render();},
 picker(row){$('drum-picker')?.remove();const t=this.state.tracks[row],dialog=document.createElement('dialog');dialog.id='drum-picker';dialog.className='metro-sound-dialog';dialog.innerHTML='<div class="metro-picker-head"><strong>轨道音色 · '+esc(t.name)+'</strong><button data-close>完成</button></div><div class="metro-picker-scroll">'+[...Metro._soundGroups(t.sound)].map(([family,items])=>`<details><summary>${esc(family)}</summary>${items.map(m=>`<div class="metro-picker-row"><button data-sound="${m.id}" aria-pressed="${m.id===t.sound}">${esc(m.label)}</button><button data-preview="${m.id}" aria-label="试听 ${esc(m.label)}">♪</button></div>`).join('')}</details>`).join('')+'</div>';document.body.appendChild(dialog);dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();dialog.querySelectorAll('[data-preview]').forEach(b=>b.onclick=()=>AudioEngine.previewClick(b.dataset.preview));dialog.querySelectorAll('[data-sound]').forEach(b=>b.onclick=()=>{this.track(row,'sound',b.dataset.sound);dialog.querySelectorAll('[data-sound]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});dialog.showModal();},
 notesAt(row,col){const a=col*this.step(),b=a+this.step();return this.state.tracks[row].notes.filter(e=>e.t>=a-1e-7&&e.t<b-1e-7);},
 toggle(row,col){const notes=this.notesAt(row,col);this.checkpoint(col);const t=this.state.tracks[row];if(notes.length)t.notes=t.notes.filter(n=>!notes.includes(n));else t.notes.push({t:col*this.step(),d:Math.min(this.step(),this.length()-col*this.step()),n:1,v:90,manual:this.state.velocity==='manual'});this.persist();this.renderGrid();},
 edit(row,col){$('drum-note-dialog')?.remove();const notes=this.notesAt(row,col),draft=copy(notes.length?notes:[{t:col*this.step(),d:Math.min(this.step(),this.length()-col*this.step()),n:1,v:90,manual:this.state.velocity==='manual'}]);
 const dialog=document.createElement('dialog');dialog.id='drum-note-dialog';dialog.className='drum-note-dialog';dialog.innerHTML=`<h3>${esc(this.state.tracks[row].name)} · 鼓点编辑</h3><p>连音均分每个鼓点的时值，不改变整小节长度。更换网格不会重排已有鼓点。</p>${draft.map((e,i)=>`<fieldset><legend>第 ${(e.t+1).toFixed(2)} 四分拍位置</legend><label>细分次数<select data-n="${i}">${[1,3,5,6,7].map(n=>`<option value="${n}" ${n===e.n?'selected':''}>${n===1?'单击':n+' 连音'}</option>`).join('')}</select></label><label>均分范围<select data-d="${i}"><option value="${e.d}">当前时值（${e.d.toFixed(3)} 个四分音符）</option><option value="${this.step()}">一个当前网格</option><option value="${4/Number(this.state.signature.split('/')[1])}">一拍（按拍号分母）</option></select></label><label>力度 1–127<input data-v="${i}" type="number" min="1" max="127" value="${e.v}"></label><label><input data-manual="${i}" type="checkbox" ${e.manual?'checked':''}>锁定手动力度，不被自动力度覆盖</label></fieldset>`).join('')}<div class="drum-actions"><button data-cancel>取消</button><button data-delete>删除这些鼓点</button><button data-save>保存</button></div>`;
 const applyNotes=events=>{this.checkpoint(col);this.state.tracks[row].notes=this.state.tracks[row].notes.filter(e=>!notes.includes(e)).concat(events);this.persist();this.renderGrid();dialog.close();};
 document.body.appendChild(dialog);dialog.onclose=()=>dialog.remove();dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();dialog.querySelector('[data-delete]').onclick=()=>applyNotes([]);dialog.querySelector('[data-save]').onclick=()=>{draft.forEach((e,i)=>{e.n=Number(dialog.querySelector(`[data-n="${i}"]`).value);e.d=Math.min(this.length()-e.t,Number(dialog.querySelector(`[data-d="${i}"]`).value));e.v=Math.max(1,Math.min(127,Number(dialog.querySelector(`[data-v="${i}"]`).value)||90));e.manual=dialog.querySelector(`[data-manual="${i}"]`).checked;});applyNotes(draft);};dialog.showModal();},
 velocity(row,e,hit=0,state=this.state){if(state.velocity==='manual'||e.manual)return e.v/127;const strong=Math.abs(e.t-Math.round(e.t))<1e-6;return Math.max(.15,Math.min(1,e.v/127*(row===2?(strong?1:.82):1)*(hit%2?.86:1)));},
 events(s=this.state){const events=[],solo=s.tracks.some(t=>t.solo),[n,d]=s.signature.split('/').map(Number),length=s.bars*n*4/d;s.tracks.forEach((track,row)=>{if(track.mute||(solo&&!track.solo))return;for(const e of track.notes)for(let h=0;h<e.n;h++){let t=e.t+h*e.d/e.n;if(t>=length)continue;const local=t-Math.floor(t);if(s.swing&&Math.abs(local-.5)<1e-6)t+=s.swing*.5;events.push({t,row,volume:this.velocity(row,e,h,s)*track.volume/Math.sqrt(e.n),sound:track.sound});}});return events.sort((a,b)=>a.t-b.t);},
 quarterSeconds(){return 60/this.state.bpm*Number(this.state.signature.split('/')[1])/4;},
 async play(){if(this.playing||this.starting){this.stop();return;}Metro.stop();if(Metro.ramp?.running)Metro.pauseRamp();this.starting=true;const token=++this.token;this.transport();try{if(!AudioEngine.ctx)await AudioEngine.init();await AudioEngine.ctx.resume();await AudioEngine.prepareClickSounds(this.state.tracks.map(t=>t.sound));if(token!==this.token)return;this.queue=this.events();if(!this.queue.length){toast('没有可播放的鼓点，请点亮格子或点击骰子生成');return;}
 this.playing=true;this.origin=AudioEngine.ctx.currentTime+.075;this.cycle=0;this.cursor=0;this.tick();this.animate();}catch(error){console.warn('鼓组准备失败',error);toast('鼓组音色加载失败，未启动播放');}finally{if(token===this.token){this.starting=false;this.transport();}}},
 outputBus(){const ctx=AudioEngine.ctx;if(this.busContext!==ctx||this.busDestination!==AudioEngine.masterGainNode){this.bus?.disconnect();this.bus=ctx.createWaveShaper();const curve=new Float32Array(16385);for(let i=0;i<curve.length;i++){const x=i/(curve.length-1)*2-1,a=Math.abs(x);curve[i]=Math.sign(x)*(a<=.32?a:.32+.08*Math.tanh((a-.32)/.08));}this.bus.curve=curve;this.bus.oversample='4x';this.bus.connect(AudioEngine.masterGainNode);this.busContext=ctx;this.busDestination=AudioEngine.masterGainNode;}return this.bus;},
 trigger(e,time){const meta=window.MTU_ACCENT_SAMPLE_META[e.sound],buffer=AudioEngine.sampleBuffers.get(meta?e.sound:AudioEngine._clickAsset(e.sound));if(!buffer)return;const source=AudioEngine.ctx.createBufferSource(),gain=AudioEngine.ctx.createGain();source.buffer=buffer;gain.gain.value=e.volume*(meta?.balance??1)*.45;source.connect(gain);gain.connect(this.outputBus());this.sources.add(source);source.onended=()=>{this.sources.delete(source);source.disconnect();gain.disconnect();};source.start(time);source.stop(time+buffer.duration+.01);},
 tick(){if(!this.playing)return;const ctx=AudioEngine.ctx,seconds=this.quarterSeconds(),duration=this.length()*seconds;if(ctx.currentTime-this.origin>this.cycle*duration+duration){this.cycle=Math.floor((ctx.currentTime-this.origin)/duration);this.cursor=0;}let budget=0;while(budget++<2048){const e=this.queue[this.cursor],when=this.origin+(this.cycle*this.length()+e.t)*seconds;if(when>ctx.currentTime+Metro.scheduleAhead)break;if(when>=ctx.currentTime-.025)this.trigger(e,Math.max(ctx.currentTime,when));if(++this.cursor===this.queue.length){this.cursor=0;this.cycle++;}}this.timer=setTimeout(()=>this.tick(),Metro.lookAhead);},
 animate(){if(!this.playing)return;const position=Math.max(0,(AudioEngine.ctx.currentTime-this.origin)/this.quarterSeconds())%this.length(),col=Math.floor(position/this.step());if(col!==this.lastCol){if(col<(this.gridStart||0)||col>=(this.gridStart||0)+(this.visibleCols||8)){this.gridStart=Math.floor(col/(this.visibleCols||8))*(this.visibleCols||8);this.renderGrid();}document.querySelectorAll('#drum-grid .current').forEach(n=>n.classList.remove('current'));document.querySelectorAll(`#drum-grid [data-col="${col}"]`).forEach(n=>n.classList.add('current'));this.lastCol=col;}this.frame=requestAnimationFrame(()=>this.animate());},
 stop(){this.token++;this.playing=false;this.starting=false;clearTimeout(this.timer);cancelAnimationFrame(this.frame);for(const source of this.sources)try{source.stop();}catch{}this.sources.clear();this.lastCol=-1;document.querySelectorAll('#drum-grid .current').forEach(n=>n.classList.remove('current'));this.transport();},
 transport(){const b=$('drum-play');if(b){b.textContent=this.starting?'取消准备':this.playing?'■ 停止':'▶ 播放';b.setAttribute('aria-pressed',String(this.playing));}const input=$('drum-bpm-input');if(input&&document.activeElement!==input)input.value=String(this.state?.bpm??140);},
 adjustBpm(delta){const next=Math.max(30,Math.min(300,(Number(this.state?.bpm)||140)+(Number(delta)||0)));if(!this.state||next===this.state.bpm)return;this.state.bpm=next;this.persist();this.transport();},
 startBpmHold(delta){this.stopBpmHold();if(this.state.bpm+delta>=30&&this.state.bpm+delta<=300)this.remember();this.adjustBpm(delta);this.bpmHoldTimer=setTimeout(()=>{this.bpmHoldInterval=setInterval(()=>this.adjustBpm(delta),90);},420);},
 stopBpmHold(){clearTimeout(this.bpmHoldTimer);clearInterval(this.bpmHoldInterval);this.bpmHoldTimer=0;this.bpmHoldInterval=0;},
 setBpmInput(value){const next=Math.max(30,Math.min(300,Number(value)||140));if(this.state.bpm===next){this.transport();return;}this.checkpoint();this.state.bpm=next;this.persist();this.transport();},
 saveNamed(){const input=$('drum-save-name'),name=input.value.trim().slice(0,80);if(!name){toast('请先填写方案名称');return;}if(Object.keys(this.saved).length>=30&&!this.saved[name]){toast('最多保存 30 套方案');return;}if(this.saved[name]&&!confirm('覆盖同名方案“'+name+'”？'))return;this.saved[name]=copy(this.state);if(this.persist())toast('已保存到节奏编排作品方案');this.render();},
 loadNamed(name){if(!this.saved[name])return;this.checkpoint();this.state=copy(this.saved[name]);this.persist();this.render();},
 openSaved(name){if(!this.saved[name])return;this.loadNamed(name);App.goPage('metro');this.switchTab('drum');toast('已载入节奏编排作品：'+name);},
 render(){const root=$('drum-workspace');if(!root)return;const s=this.state,opt=(rows,value)=>rows.map(([id,label])=>`<option value="${id}" ${String(id)===String(value)?'selected':''}>${esc(label)}</option>`).join('');
 root.innerHTML=`<header class="drum-heading"><h2>节奏编排</h2><div class="drum-header-actions"><div class="drum-bpm-stepper" aria-label="节奏编排速度"><button type="button" aria-label="BPM 减 1，长按连续减少" onpointerdown="DrumWorkshop.startBpmHold(-1)" onpointerup="DrumWorkshop.stopBpmHold()" onpointercancel="DrumWorkshop.stopBpmHold()" onpointerleave="DrumWorkshop.stopBpmHold()">−</button><label><span>BPM</span><input id="drum-bpm-input" aria-label="编排速度" type="number" min="30" max="300" value="${s.bpm}" onchange="DrumWorkshop.setBpmInput(this.value)"></label><button type="button" aria-label="BPM 加 1，长按连续增加" onpointerdown="DrumWorkshop.startBpmHold(1)" onpointerup="DrumWorkshop.stopBpmHold()" onpointercancel="DrumWorkshop.stopBpmHold()" onpointerleave="DrumWorkshop.stopBpmHold()">＋</button></div><button id="drum-play" onclick="DrumWorkshop.play()">▶ 播放</button><button id="drum-expand" onclick="DrumWorkshop.expand()">${this.expanded?'还原':'展开'}</button></div></header>
 <div class="drum-primary"><label>鼓组音色<select aria-label="鼓组音色" onchange="DrumWorkshop.setKit(this.value)">${opt(kitOptions,s.kit)}</select></label><label>风格<select aria-label="节奏风格" onchange="DrumWorkshop.change('style',this.value)">${opt(this.styleOptions(),s.style)}</select></label><label>小节数<select aria-label="小节数" onchange="DrumWorkshop.change('bars',this.value)">${opt(Array.from({length:32},(_,i)=>[i+1,i+1]),s.bars)}</select></label><label>节奏变体<select aria-label="节奏变体" onchange="DrumWorkshop.chooseVariant(this.value)">${opt(Array.from({length:8},(_,i)=>[i,['基础','反拍','切分','留白','推动','碎拍','呼应','过门'][i]+' · '+(i+1)]),s.variant||0)}</select></label></div>
 <div class="drum-transport"><label class="drum-arrangement-picker">作品方案<select aria-label="读取节奏编排作品" onchange="DrumWorkshop.loadNamed(this.value)"><option value="">当前作品／读取方案…</option>${Object.keys(this.saved).map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('')}</select></label><button onclick="DrumWorkshop.generate()">换个节奏</button><button id="drum-undo" aria-label="撤销" title="撤销" data-ui="undo-2" onclick="DrumWorkshop.undo()" ${this.undoStack.length?'':'disabled'}></button><button id="drum-redo" aria-label="重做" title="重做" data-ui="undo-2" onclick="DrumWorkshop.redo()" ${this.redoStack.length?'':'disabled'}></button><button onclick="DrumWorkshop.settings()">设置／保存作品</button></div>
 <div id="drum-grid" class="drum-scroll" tabindex="0" aria-label="鼓组编排网格"></div>
 <div class="drum-pages"><button aria-label="上一组轨道" onclick="DrumWorkshop.pageRows(-1)">↑</button><span id="drum-row-position"></span><button aria-label="下一组轨道" onclick="DrumWorkshop.pageRows(1)">↓</button><button aria-label="前一段节奏" onclick="DrumWorkshop.pageSteps(-1)">←</button><span id="drum-step-position"></span><button aria-label="后一段节奏" onclick="DrumWorkshop.pageSteps(1)">→</button></div>`;this.renderGrid();this.transport();
 if(typeof ResizeObserver!=='undefined'){this.gridObserver?.disconnect();this.gridObserver=new ResizeObserver(()=>{const c=this.capacity();if(c.cols!==this.visibleCols||c.rows!==this.visibleRows)this.renderGrid();});this.gridObserver.observe($('drum-grid'));}
 },
 renderGrid(){const grid=$('drum-grid');if(!grid)return;
 const size=this.capacity();this.visibleCols=size.cols;this.visibleRows=size.rows;
 const scroll=grid.scrollLeft,step=this.step(),cols=Math.ceil(this.length()/step-1e-6),bar=this.barLength();this.gridStart=Math.max(0,Math.min(this.gridStart||0,Math.max(0,cols-size.cols)));this.trackStart=Math.max(0,Math.min(this.trackStart||0,8-size.rows));const from=this.gridStart,to=Math.min(cols,from+size.cols);let html='<table><thead><tr><th>音色／轨道</th>';for(let i=from;i<to;i++){const t=i*step,first=Math.abs(t/bar-Math.round(t/bar))<1e-6;html+=`<th data-col="${i}" class="${first?'bar':''}">${first?'小节 '+(Math.round(t/bar)+1):i+1}</th>`;}html+='</tr></thead><tbody>';
 this.state.tracks.forEach((track,row)=>{if(row<this.trackStart||row>=this.trackStart+size.rows)return;html+=`<tr><th><div class="drum-track-title"><button aria-label="选择或试听 ${esc(track.name)}" onclick="DrumWorkshop.trackSettings(${row})">${esc(track.name)}${track.mute?' · 静音':track.locked?' · 锁定':''}</button></div></th>`;
 for(let col=from;col<to;col++){const notes=this.notesAt(row,col),mark=notes.length>1?'•'+notes.length:notes[0]?.n>1?String(notes[0].n):notes.length?'●':'';html+=`<td class="${Math.abs(col*step/bar-Math.round(col*step/bar))<1e-6?'bar':''}"><button type="button" data-row="${row}" data-col="${col}" class="drum-step ${notes.length?'on':''}" aria-pressed="${!!notes.length}" aria-label="${esc(track.name)} 第 ${col+1} 格${notes.length?' 有鼓点':''}">${mark}</button></td>`;}html+='</tr>';});grid.innerHTML=html+'</tbody></table>';grid.scrollLeft=scroll;
 $('drum-row-position').textContent=(this.trackStart+1)+'–'+Math.min(8,this.trackStart+size.rows)+'/8轨';$('drum-step-position').textContent=(from+1)+'–'+to+'/'+cols;
 grid.querySelectorAll('.drum-step').forEach(button=>{const row=Number(button.dataset.row),col=Number(button.dataset.col);let timer=0,long=false,moved=false,x=0,y=0;button.onpointerdown=e=>{x=e.clientX;y=e.clientY;long=false;moved=false;timer=setTimeout(()=>{long=true;this.edit(row,col);},550);};button.onpointermove=e=>{if(Math.hypot(e.clientX-x,e.clientY-y)>10){clearTimeout(timer);moved=true;}};button.onpointerup=()=>clearTimeout(timer);button.onpointercancel=()=>{clearTimeout(timer);moved=true;};button.onclick=()=>{if(!long&&!moved)this.toggle(row,col);long=false;};button.oncontextmenu=e=>{e.preventDefault();clearTimeout(timer);this.edit(row,col);};button.onkeydown=e=>{if(e.key==='F2'||(e.shiftKey&&e.key==='Enter')){e.preventDefault();this.edit(row,col);}};});}
};
const init=Metro.init.bind(Metro);Metro.init=function(){W.legacyExisted=!!localStorage.getItem('protuner_metro_v9');const result=init();W.init();return result;};
Object.assign(styles,{
 drill:{label:'Drill · 留白切分',kick:[0,1.5,3.25],snare:[2],hat:.5},jersey:{label:'Jersey Club',kick:[0,1,2.5,3.25],snare:[1,3],hat:.5},boom:{label:'Boom Bap',kick:[0,1.75,2.5],snare:[1,3],hat:.5},lofi:{label:'Lo-fi',kick:[0,2.25],snare:[1,3],hat:1},
 dnb:{label:'Drum & Bass',kick:[0,2.5],snare:[1,3],hat:.25},breakbeat:{label:'Breakbeat',kick:[0,1.5,2.75],snare:[1,3],hat:.25},garage:{label:'UK Garage · 2-step',kick:[0,2.5],snare:[1,3],hat:.5},dubstep:{label:'Dubstep · 半拍',kick:[0,3.25],snare:[2],hat:.5},
 afro:{label:'Afrobeat · 切分',kick:[0,1.5,3],snare:[1,2.75],hat:.5},dembow:{label:'Dembow',kick:[0,2],snare:[.75,1.5,2.75,3.5],hat:.5},bossa:{label:'Bossa Nova · 参考',kick:[0,1.75,2,3.75],snare:[0,1.5,3],hat:.5},samba:{label:'Samba · 参考',kick:[0,.75,2,2.75],snare:[.5,1.5,2.5,3.5],hat:.25},
 reggaeback:{label:'Reggae · 反拍',kick:[0,2],snare:[2],hat:.5},rnb:{label:'R&B',kick:[0,1.75,2.5],snare:[1,3],hat:.5},ballad:{label:'抒情／半拍摇滚',kick:[0],snare:[2],hat:1}
});
const styleFamilies={trap:['trap_basic','trap','drill','hiphop','boom','lofi','jersey','rnb','dubstep','garage','breakbeat','dnb'],electronic:['house','techno','disco','garage','dnb','breakbeat','dubstep','jersey','afro','dembow','trap','rnb'],acoustic:['pop','rock','funk','ballad','shuffle','reggae','reggaeback','bossa','samba','rnb','boom','latin'],world:['world','latin','afro','dembow','bossa','samba','reggae','reggaeback','funk','shuffle','pop','rock']};
W.styleOptions=function(){const group=this.state.kit==='world'?'world':this.state.kit==='acoustic'?'acoustic':['house','techno','dust'].includes(this.state.kit)?'electronic':'trap';return [...new Set([...styleFamilies[group],...Object.keys(styles)])].map(key=>[key,(styleFamilies[group].includes(key)?'':'其他 · ')+styles[key].label]);};
W.capacity=function(){const g=$('drum-grid');return {cols:Math.max(3,Math.min(32,Math.floor(((g?.clientWidth||600)-112)/48))),rows:Math.max(1,Math.min(8,Math.floor(((g?.clientHeight||420)-38)/52)))};};
W.pageRows=function(delta){this.trackStart=Math.max(0,Math.min(8-(this.visibleRows||8),(this.trackStart||0)+delta*(this.visibleRows||8)));this.renderGrid();};
W.pageSteps=function(delta){this.gridStart=Math.max(0,Math.min(Math.ceil(this.length()/this.step())-(this.visibleCols||8),(this.gridStart||0)+delta*(this.visibleCols||8)));this.renderGrid();};
W.expand=async function(){this.expanded=!this.expanded;const panel=$('page-metro');panel.classList.toggle('drum-expanded',this.expanded);this.render();if(this.expanded){try{await panel.requestFullscreen?.();if(matchMedia('(pointer:coarse)').matches)await screen.orientation?.lock?.('landscape');}catch{toast('已展开工作区；如需横屏，请转动手机');}}else{try{screen.orientation?.unlock?.();if(document.fullscreenElement)await document.exitFullscreen();}catch{}}};
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&W.expanded){W.expanded=false;$('page-metro').classList.remove('drum-expanded');W.render();}});
W.trackSettings=function(row){const t=this.state.tracks[row],dialog=document.createElement('dialog');dialog.className='drum-note-dialog';dialog.innerHTML=`<h3>${esc(t.name)}</h3><p>${esc(Metro._label(t.sound))}</p><button data-preview>♪ 试听</button><button data-picker>选择音色</button><label>轨道音量<input data-volume type="range" min="0" max="1" step=".05" value="${t.volume}"></label>${[['mute','静音'],['solo','独奏'],['locked','锁定轨道']].map(([id,label])=>`<label><input type="checkbox" data-field="${id}" ${t[id]?'checked':''}>${label}</label>`).join('')}<button data-close>完成</button>`;document.body.appendChild(dialog);dialog.onclose=()=>dialog.remove();dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.querySelector('[data-preview]').onclick=()=>AudioEngine.previewClick(t.sound);dialog.querySelector('[data-picker]').onclick=()=>{dialog.close();this.picker(row);};dialog.querySelector('[data-volume]').onchange=e=>this.track(row,'volume',e.target.value);dialog.querySelectorAll('[data-field]').forEach(input=>input.onchange=()=>this.track(row,input.dataset.field,input.checked));dialog.showModal();};
W.settings=function(){const s=this.state,dialog=document.createElement('dialog'),options=(rows,value)=>rows.map(v=>`<option value="${v}" ${String(v)===String(value)?'selected':''}>${v}</option>`).join('');dialog.className='drum-note-dialog';dialog.innerHTML=`<h3>节奏设置</h3><div class="drum-controls"><label>拍号<select data-field="signature">${options(['2/2','2/4','3/4','4/4','5/4','6/4','7/4','5/8','6/8','7/8','9/8','12/8'],s.signature)}</select></label><label>小节<select data-field="bars">${options([1,2,3,4,5,6,7,8],s.bars)}</select></label><label>网格<select data-field="grid">${gridOptions.map(([id,label])=>`<option value="${id}" ${id===s.grid?'selected':''}>${label}</option>`).join('')}</select></label><label>力度<select data-field="velocity"><option value="auto" ${s.velocity==='auto'?'selected':''}>自动力度</option><option value="manual" ${s.velocity==='manual'?'selected':''}>手动力度</option></select></label><label>变化密度<input data-field="density" type="range" min="0" max="1" step=".1" value="${s.density}"></label><label>Swing<input data-field="swing" type="range" min="0" max=".45" step=".05" value="${s.swing}"></label></div><div class="drum-save"><input id="drum-save-name" maxlength="80" placeholder="方案名称"><button onclick="DrumWorkshop.saveNamed()">保存方案</button><select data-load><option value="">读取方案…</option>${Object.keys(this.saved).map(n=>`<option>${esc(n)}</option>`).join('')}</select></div><button data-reset>载入 T06 默认节奏（可撤销）</button><button data-legacy>查看／导入旧四轨</button><p>点格子开关；长按或右键编辑连音。选择左侧轨道编辑音色与音量。</p><button data-close>完成</button>`;
 dialog.querySelector('[data-field="bars"]').parentElement.remove();dialog.querySelector('[data-field="signature"]').innerHTML=options(meters,s.signature);const sync=document.createElement('button');sync.textContent=`从节拍器同步 · ${Metro.bpm} BPM · ${Metro.signature} ${Metro._grouping?.()||''}`;dialog.querySelector('.drum-controls').after(sync);sync.onclick=()=>{if(this.syncMeter(true))dialog.close();};
 document.body.appendChild(dialog);dialog.onclose=()=>{const legacy=dialog.querySelector('.drum-legacy');if(legacy){legacy.open=false;$('drum-workshop').appendChild(legacy);}dialog.remove();};dialog.querySelectorAll('[data-field]').forEach(e=>e.onchange=()=>{this.change(e.dataset.field,e.value);if(e.dataset.field==='signature')e.value=this.state.signature;});dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.querySelector('[data-load]').onchange=e=>{this.loadNamed(e.target.value);dialog.close();};dialog.querySelector('[data-reset]').onclick=()=>{this.resetDefault();dialog.close();};dialog.querySelector('[data-legacy]').onclick=()=>{const legacy=document.querySelector('.drum-legacy');dialog.appendChild(legacy);legacy.open=true;};dialog.showModal();};
W.chooseVariant=function(value){this.checkpoint();this.state.variant=Math.max(0,Math.min(7,Number(value)||0));this.generate(true,false);};
W.generate=function(quiet=false,checkpoint=true,firstBar=0,preserve=null){if(checkpoint)this.checkpoint();const s=this.state;if(!quiet)s.variant=((s.variant||0)+1+Math.floor(Math.random()*7))%8;const v=s.variant||0,style=styles[s.style]||styles.trap,barLength=this.barLength();
 if(!firstBar&&!preserve){s.editedBars=[];s.tracks.forEach(t=>{if(!t.locked)t.notes=[];});}
 const add=(row,t,velocity=90,n=1,d=.25)=>{if(s.tracks[row].locked||t<0||t>=this.length()-1e-8)return;const notes=s.tracks[row].notes,at=notes.findIndex(e=>Math.abs(e.t-t)<1e-8);const event={t,d:Math.min(d,this.length()-t),n,v:velocity,manual:false};if(at<0)notes.push(event);else notes[at]=event;};
 const [num,den]=s.signature.split('/').map(Number),unit=4/den;
 const requested=String(s.grouping||Metro.groupingOptions?.[s.signature]?.[0]||'').split('+').map(Number);
 const groups=requested.every(v=>Number.isInteger(v)&&v>0)&&requested.reduce((a,b)=>a+b,0)===num?requested:Array(num).fill(1);
 for(let bar=firstBar;bar<s.bars;bar++){
  if(preserve?.has(bar))continue;
  const start=bar*barLength,end=start+barLength,scaled=t=>start+t;
  if(num!==4||den!==4){
   const heads=new Set();let b=0;for(const size of groups){heads.add(b);b+=size;}
   const back=s.style==='trap_basic'?3:1,step=style.hat*(v===5?.5:1);
   for(let i=0;i<num;i++){
    const a=start+i*unit,head=heads.has(i),accent=i===0||groups.length<num&&head;
    if(accent||style.kick.includes(i%4)&&v!==3)add(0,a,i===0?112:95);
    if((groups.length===num?i%2===1:!head&&heads.has((i+1)%num))&&v!==3)add(back,a,93);
    for(let t=0;t<1-1e-8;t+=step)add(2,a+t*unit,t?62:accent?90:75,1,Math.min(.25,step*unit));
   }
   if(v){const pivot=(v+bar)%num;add(6,start+(pivot+.5)*unit,62+v*4);if(v===5||v===7)add(2,end-unit/2,78,v===7?3:6,unit/2);}
  }else{
  const kicks=style.kick.filter((_,i)=>v!==3||i===0),snares=style.snare;
  kicks.forEach(t=>add(0,scaled(t),112));snares.forEach(t=>add(s.style==='trap_basic'?3:1,scaled(t),108));
  if(s.style==='shuffle'){for(let t=0;t<barLength;t++){add(2,start+t,82,1,1/3);if(t+2/3<barLength)add(2,start+t+2/3,65,1,1/3);}}
  else {const step=style.hat*(v===5?.5:1);for(let t=0;t<barLength;t+=step){if(s.style==='trap_basic'&&t%4===0||s.style==='trap_basic'&&t%4===2)continue;add(2,start+t,t%1===0?82:70,1,Math.min(.25,step));}}
  if(v>0){const offset=[0,.5,1.25,2.75,3.5,.75,2.25,3.75][v];add(0,scaled(offset),v===3?88:104);add(6,scaled((offset+1)%4),60+v*3);}
  if(v===1||['reggae','reggaeback','house','techno','disco'].includes(s.style))for(let t=.5;t<barLength;t++)add(4,start+t,70);
  if(v===2||v===6)add(1,scaled(v===2?2.75:1.75),48);
  if(v===4)add(3,scaled(3),88);
  if(v===5||v===7)add(2,end-barLength/8,66,v===7?3:6,barLength/8);
  if(v===7)add(1,end-barLength/16,82,3,barLength/16);
  if(['world','latin','afro','bossa','samba','dembow'].includes(s.style))for(let t=.75;t<barLength;t+=.75)add(6,start+t,84);
  }
  if((bar+1)%4===0)add(6,end-unit*.5,68,(bar+1)%8===0?3:1,unit*.5);
 }
 // Variation is deterministic; density adds a quiet response without replacing its backbone.
 if(s.density>.65)for(let b=firstBar;b<s.bars;b++)if(!preserve?.has(b))add(6,b*barLength+barLength*.4375,48);
 this.persist();this.render();if(!quiet)toast(styles[s.style].label+' · 变体 '+(v+1)+'，可撤销');
};
W.styleCatalog=styles;
W.syncMeter=function(explicit){const s=this.state,group=Metro._grouping?.(Metro.signature)||'',different=s.signature!==Metro.signature||group!==(s.grouping||'');if(explicit&&different&&s.tracks.some(t=>t.locked&&t.notes.length)){toast('锁定轨道含有鼓点，未更改作品拍号。');return false;}if(explicit&&different&&!confirm('按节拍器拍号重新生成鼓点？可撤销，已保存的作品不变。'))return false;if(explicit)this.checkpoint();s.signature=Metro.signature;s.bpm=Metro.bpm;s.grouping=group;if(different)this.generate(true,false);else{this.persist();this.render();}return true;};
const enter=W.switchTab.bind(W);W.switchTab=function(tab){if(tab==='drum'&&this.freshMeter){this.freshMeter=false;this.syncMeter(false);}return enter(tab);};
const restore=W.load.bind(W);W.load=function(){this.freshMeter=!localStorage.getItem(this.key)&&!this.legacyExisted;restore();};
const loadSounds=W.load.bind(W);W.load=function(){loadSounds();if(this.state.kit==='t06'&&!this.state.tracks[0].locked&&this.state.tracks[0].sound==='drum_classic_kick'){this.undoStack.push(copy(this.state));this.state.tracks[0].sound='drum_dry_kick';this.persist();}};
const go=App.goPage.bind(App);App.goPage=function(page,...args){if(page!=='metro')W.stop();return go(page,...args);};
document.addEventListener('visibilitychange',()=>{if(document.hidden)W.stop();});
})();

/* 13.5.18：让已保存编排可以直接作为节拍器作品使用，并改善手机分页语义。 */
(() => {
 'use strict';
 const W=window.DrumWorkshop;
 if(!W)return;
 const previousRender=W.render.bind(W);
 W.metronomeArrangement=(()=>{try{return localStorage.getItem('music_toolbox_drum_metronome')||'';}catch{return '';}})();
 W.useAsMetronome=function(name){
  if(name&&!this.saved[name])return;
  Metro.stop();
  this.metronomeArrangement=name;
  try{localStorage.setItem('music_toolbox_drum_metronome',name);}catch{}
  this.switchTab('metro');
  if(name){const s=this.saved[name];Metro.setTs(s.signature);if(Metro.groupingOptions?.[s.signature]?.includes(s.grouping))Metro.setGrouping(s.signature,s.grouping);Metro.setBpm(s.bpm);}
  this.render();toast(name?'已设为节拍器作品：'+name:'已恢复手动计拍');
 };
 W.render=function(...args){
  const result=previousRender(...args);
  const play=document.getElementById('drum-play');if(play&&!this.playing&&!this.starting)play.textContent='▶ 播放当前编排';
  const picker=document.querySelector('#drum-workshop .drum-arrangement-picker');
  if(picker&&!picker.querySelector('[data-use-metronome]')){
   const use=document.createElement('button');use.type='button';use.dataset.useMetronome='true';use.textContent='用作节拍器';use.setAttribute('aria-label','把所选编排设为节拍器作品');
   use.onclick=()=>{const name=picker.querySelector('select')?.value;if(name)this.useAsMetronome(name);else toast('请先选择一个已保存作品');};
   picker.appendChild(use);
  }
  if(picker){
   const actions=document.querySelector('.drum-header-actions');
   if(actions){picker.classList.add('drum-arrangement-compact');actions.insertBefore(picker,document.getElementById('drum-expand'));}
   const sel=picker.querySelector('select');for(const option of sel.options)option.selected=option.value===(this.selectedName||'');
   sel.onchange=()=>{this.selectedName=sel.value;if(sel.value)this.loadNamed(sel.value);};
  }
  const pane=document.getElementById('metro-basic-pane');
  if(pane){
   let source=document.getElementById('metro-work-source');
   if(!source){source=document.createElement('label');source.id='metro-work-source';source.className='metro-voice-mode';source.innerHTML='<span>播放来源</span><select aria-label="节拍器播放来源"></select>';pane.querySelector('.metro-actions')?.after(source);}
   const select=source.querySelector('select');select.replaceChildren();
   for(const name of ['',...Object.keys(this.saved)]){const option=document.createElement('option');option.value=name;option.textContent=name?'作品 · '+name:'手动计拍';select.appendChild(option);if(name===(this.metronomeArrangement||''))option.selected=true;}
   select.onchange=()=>this.useAsMetronome(select.value);
   pane.dataset.work=String(!!this.saved[this.metronomeArrangement]);
  }
  const pages=document.querySelector('#drum-workshop .drum-pages');
  if(window.MusicTips?.commonIcons)window.MusicTips.commonIcons();
  if(pages){
   const buttons=pages.querySelectorAll('button');
   [['上一组轨道','切换到上一组轨道'],['下一组轨道','切换到下一组轨道'],['上一段节奏','切换到上一段节奏'],['下一段节奏','切换到下一段节奏']].forEach(([text,title],i)=>{const button=buttons[i];if(button){button.textContent=text;button.title=title;button.setAttribute('aria-label',title);}});
  }
  return result;
 };
})();
