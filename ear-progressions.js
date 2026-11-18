/* Ear training uses musical templates, not transpositions counted as new progressions. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),E=EarTraining;
const types=[
 ['maj','三和弦','大三',[0,4,7],''],['min','三和弦','小三',[0,3,7],'m'],['dim','三和弦','减三',[0,3,6],'dim'],['aug','三和弦','增三',[0,4,8],'aug'],
 ['maj7','七和弦','大七',[0,4,7,11],'maj7'],['7','七和弦','属七',[0,4,7,10],'7'],['m7','七和弦','小七',[0,3,7,10],'m7'],['mMaj7','七和弦','小大七',[0,3,7,11],'mMaj7'],['half','七和弦','半减七',[0,3,6,10],'m7♭5'],['dim7','七和弦','减七',[0,3,6,9],'dim7'],
 ['maj9','九和弦','大九',[0,4,7,11,14],'maj9'],['9','九和弦','属九',[0,4,7,10,14],'9'],['m9','九和弦','小九',[0,3,7,10,14],'m9'],
 ['11','十一和弦','属十一',[0,4,7,10,14,17],'11'],['m11','十一和弦','小十一',[0,3,7,10,14,17],'m11'],
 ['13','十三和弦','属十三',[0,4,7,10,14,21],'13'],['maj13','十三和弦','大十三',[0,4,7,11,14,21],'maj13'],['m13','十三和弦','小十三',[0,3,7,10,14,21],'m13'],
 ['sus2','挂留和弦','挂二',[0,2,7],'sus2'],['sus4','挂留和弦','挂四',[0,5,7],'sus4'],['7sus4','挂留和弦','属七挂四',[0,5,7,10],'7sus4'],
 ['add9','添加音／六和弦','大三加九',[0,4,7,14],'add9'],['madd9','添加音／六和弦','小三加九',[0,3,7,14],'m(add9)'],['6','添加音／六和弦','大六',[0,4,7,9],'6'],['m6','添加音／六和弦','小六',[0,3,7,9],'m6'],
 ['7b9','变化属和弦','属七降九',[0,4,7,10,13],'7♭9'],['7s9','变化属和弦','属七升九',[0,4,7,10,15],'7♯9'],['7b5','变化属和弦','属七降五',[0,4,6,10],'7♭5']
].map(([id,family,name,intervals,symbol])=>({id,family,name,intervals,symbol}));
const templates=[];
const add=(family,mode,rows)=>rows.forEach(([name,steps])=>templates.push({id:'p'+String(templates.length+1).padStart(3,'0'),family,mode,name,steps:steps.split(' ')}));
add('流行／基础','major',[
 ['流行四和弦','1 5 6 4'],['流行回环','6 4 1 5'],['五十年代','1 6 4 5'],['循环五度','1 6 2 5'],['卡农骨架','1 5 6 3 4 1 4 5'],['四五回家','1 4 5 1'],['流行下行','1 5 4 1'],['下属回环','1 4 1 5'],
 ['一四二五','1 4 2 5'],['一三四五','1 3 4 5'],['一三六四','1 3 6 4'],['六二五一','6 2 5 1'],['四五三六','4 5 3 6'],['四一五六','4 1 5 6'],['六五四五','6 5 4 5'],['一二四五','1 2 4 5'],
 ['一六三五','1 6 3 5'],['四一二五','4 1 2 5'],['二四一五','2 4 1 5'],['六三四一','6 3 4 1'],['一四三六','1 4 3 6'],['一二五一','1 2 5 1'],['六四二五','6 4 2 5'],['一五二四','1 5 2 4']]);
add('小调／影视','minor',[
 ['自然小调循环','1 b6 b3 b7'],['安达卢西亚','1 b7 b6 5M'],['小调四和弦','1 4 b7 b3'],['小调下属终止','1 4 5M 1'],['小调明暗','1 b3 b7 4'],['小调下行回环','1 b7 b6 b7'],['小调六七一','b6 b7 1 1'],['小调六四五','1 b6 4 5M'],
 ['小调二五一','2d 5M 1'],['小调长终止','1 b6 2d 5M'],['小调三六四','1 b3 b6 4'],['小调六三七','1 b6 b3 5M'],['小调四一五','4 1 5M 1'],['小调七三六','1 b7 b3 b6'],['小调六七三','b6 b7 b3 1'],['小调四七三','4 b7 b3 b6']]);
add('爵士／终止','major',[
 ['大调二五一','2 5:7 1:maj7'],['爵士回转','1:maj7 6:m7 2:m7 5:7'],['三六二五','3:m7 6:m7 2:m7 5:7'],['四七三六','4:maj7 7:half 3:m7 6:m7'],['爵士下属终止','1:maj7 4:maj7 2:m7 5:7'],['延伸二五一','2:m9 5:9 1:maj9'],['属挂留解决','2:m7 5:7sus4 5:7 1:maj7'],['爵士六二五','6:m7 2:m7 5:7 1:maj7']]);
add('副属／借用','major',[
 ['副属到二级','1 V/2 2 5'],['副属到五级','1 V/5 5 1'],['副属到六级','1 V/6 6 4'],['连续副属','V/6 V/2 V/5 5'],['副属回转','1 V/6 2 5'],['小下属借用','1 4 4m 1'],['降七借用','1 b7M 4 1'],['降六降七','1 b6M b7M 1']]);
add('调式／踏板','modal',[
 ['主音与四级','1 4 1 4'],['主音与二级','1 2 1 2'],['一级七级四级','1 7 4 1'],['一级二级四级','1 2 4 1'],['一级三级四级','1 3 4 1'],['一级六级四级','1 6 4 1'],['一级五级七级','1 5 7 1'],['一级四级二级','1 4 2 1']]);
const roman=['I','II','III','IV','V','VI','VII'],major=[0,2,4,5,7,9,11];
const minorModes=['Natural Minor','Harmonic Minor','Melodic Minor','Aeolian'];
const P=window.ProgressionTraining={types,templates,selection:new Set(['maj','min','dim','maj7','7','m7','half']),family:'all',template:'random',secondary:true,borrowed:true,question:null,
 save(){try{localStorage.setItem('music_toolbox_ear_harmony',JSON.stringify({ids:[...this.selection],family:this.family,template:this.template,secondary:this.secondary,borrowed:this.borrowed}));}catch{}},
 load(){try{const s=JSON.parse(localStorage.getItem('music_toolbox_ear_harmony')||'null');if(s){this.selection=new Set((s.ids||[]).filter(id=>types.some(t=>t.id===id)));this.family=['all',...new Set(templates.map(t=>t.family))].includes(s.family)?s.family:'all';this.template=templates.some(t=>t.id===s.template)?s.template:'random';this.secondary=s.secondary!==false;this.borrowed=s.borrowed!==false;}}catch{}},
 compatible(t,mode){return t.mode==='modal'||t.mode==='minor'&&minorModes.includes(mode)||t.mode==='major'&&mode==='Major';},
 chord(token,mode,root){
  const scale=MusicTheory.scaleTemplates[mode],secondary=token.startsWith('V/');if(secondary&&!this.secondary)return null;
  let degree,pc,quality,wanted,borrowed=false;
  if(secondary){degree=Number(token.slice(2));pc=(scale[degree-1]+7)%12;quality=[0,4,7];wanted='7';}
  else {const m=/^(b?)([1-7])([Mmd]?)(?::([\w]+))?$/.exec(token);if(!m)return null;degree=+m[2];pc=m[1]?major[degree-1]-1:scale[degree-1];
   quality=[0,2,4].map(n=>(scale[(degree-1+n)%7]+12*Math.floor((degree-1+n)/7)-scale[degree-1]));
   if(m[1]){quality=[0,4,7];borrowed=quality.some(n=>!scale.includes((pc+n)%12));}
   if(m[3]){quality=m[3]==='M'?[0,4,7]:m[3]==='m'?[0,3,7]:[0,3,6];borrowed=quality.some(n=>!scale.includes((pc+n)%12));}
   wanted=m[4];if(borrowed&&!this.borrowed)return null;
  }
  if(wanted&&!this.selection.has(wanted))return null;
  const exact=types.find(t=>t.id===wanted&&this.selection.has(t.id));
  const candidates=types.filter(t=>this.selection.has(t.id)&&quality.every(n=>t.intervals.includes(n))&&(secondary||borrowed||t.intervals.every(n=>scale.includes((pc+n)%12))));
  const type=exact||candidates.find(t=>t.intervals.length===3)||candidates[Math.floor(Math.random()*candidates.length)];if(!type)return null;
  const base=48+(root+pc)%12,notes=type.intervals.map(n=>base+n),small=type.intervals.includes(3),numeral=small?roman[degree-1].toLowerCase():roman[degree-1],suffix=type.symbol.replace(/^m(?!aj)/,'');
  const label=secondary?'V'+type.symbol+'/'+((scale[(degree+1)%7]-scale[degree-1]+12)%12===3?roman[degree-1].toLowerCase():roman[degree-1]):(token.startsWith('b')?'♭':'')+numeral+suffix;
  return {degree,pc,type:type.id,notes,label,name:enharmonic((root+pc)%12)+type.symbol,secondary,borrowed};
 },
 build(t,mode,root){if(!this.compatible(t,mode))return null;const chords=t.steps.map(s=>this.chord(s,mode,root));return chords.every(Boolean)?{template:t.id,name:t.name,mode,root,chords,label:chords.map(c=>c.label).join(' – ')}:null;},
 pool(){const modes=E.scaleSelection==='random'?E.trainingScaleTypes:[E.scaleSelection];const root=E.keySelection==='random'?Math.floor(Math.random()*12):Number(E.keySelection);const pool=[];
  for(const mode of modes)for(const t of templates){if(this.family!=='all'&&t.family!==this.family||this.template!=='random'&&t.id!==this.template)continue;const q=this.build(t,mode,root);if(q)pool.push(q);}return pool;},
 generate(){
  if(!this.selection.size)throw Error('请至少选择一种和弦。');
  if(E.level==='harmony'){const type=types.filter(t=>this.selection.has(t.id));const chosen=type[Math.floor(Math.random()*type.length)],root=E.keySelection==='random'?Math.floor(Math.random()*12):+E.keySelection;return {root,mode:E.scaleSelection==='random'?E.trainingScaleTypes[Math.floor(Math.random()*E.trainingScaleTypes.length)]:E.scaleSelection,chords:[{notes:chosen.intervals.map(n=>60+root+n),name:enharmonic(root)+chosen.symbol,label:chosen.name,type:chosen.id}],label:chosen.name,options:E._shuffle([chosen.name,...E._shuffle(type.filter(t=>t!==chosen).map(t=>t.name)).slice(0,3)])};}
  const pool=this.pool();if(!pool.length)throw Error('当前调式、进行和和弦筛选没有匹配题目，请调整训练范围。');
  for(const q of E._shuffle(pool)){
  const alternatives=new Set([q.label]);
  // Distractors use the same key and mode and never introduce unchecked chord types.
  for(const t of E._shuffle(templates.filter(t=>this.compatible(t,q.mode)&&t.steps.length===q.chords.length))){const alt=this.build(t,q.mode,q.root);if(alt)alternatives.add(alt.label);if(alternatives.size===4)break;}
  if(alternatives.size>=2)return {...q,options:E._shuffle([...alternatives])};
  }
  throw Error('当前筛选不足以生成两个可区分答案，请增加和弦类型。');
 },
 async sequence(q,token,reference=false,index=null){
  const chords=index===null?q.chords:[q.chords[index]],beat=60/E.bpm;
  await AudioEngine.prepareInstrument(chords.flatMap(c=>c.notes).concat(60+q.root),'ear');if(token!==E.questionToken)return;
  if(reference){$('ear-prompt').textContent=enharmonic(q.root)+' · '+E.scaleDisplayNames[q.mode];await E._playReferenceScale({token,keyRoot:q.root,scaleType:q.mode,bpm:E.bpm});}
  for(const c of chords){if(token!==E.questionToken)return; c.notes.forEach(n=>AudioEngine.playInstrument(n,beat*1.45,.36/Math.sqrt(c.notes.length),'ear'));await E._sleep(beat*2000);}
 },
 async play(fresh=true,reference=true,index=null){if(E.isPlaying)return;clearTimeout(E.resetTimer);const token=++E.questionToken;E.isPlaying=true;
  try{if(fresh){this.question=this.generate();E.answered=false;$('ear-feedback').textContent='';$('ear-choices').replaceChildren();$('ear-harmony-review')?.remove();}const q=this.question;if(!q)return;
   E.keyRoot=q.root;E.scaleType=q.mode;E.targetNotes=q.chords.flatMap(c=>c.notes);E.correctAnswer=q.label;
   if(!AudioEngine.ctx)await AudioEngine.init();if(token!==E.questionToken)return;
   $('ear-prompt').textContent='听辨'+(E.level==='progression'?'和弦进行':'和弦色彩')+'…';await this.sequence(q,token,reference&&E.referenceEnabled,index);if(token!==E.questionToken)return;
   $('ear-prompt').textContent=E.answered?'点击下方和弦逐个对照':'请选择听到的'+(E.level==='progression'?'和弦进行':'和弦类型');if(!E.answered)this.renderChoices();
  }catch(error){if(token===E.questionToken){this.question=null;E.targetNotes=[];$('ear-choices').replaceChildren();$('ear-prompt').textContent=error.message;}}
  finally{if(token===E.questionToken)E.isPlaying=false;}
 },
 renderChoices(){const host=$('ear-choices');host.replaceChildren();for(const label of this.question.options){const b=document.createElement('button');b.className='ear-choice-btn';b.textContent=label;b.onclick=()=>this.answer(label);host.appendChild(b);}},
 answer(label){if(E.answered||E.isPlaying||!this.question)return;E.answered=true;E.total++;const ok=label===this.question.label;if(ok){E.correct++;E.score+=10;}$('ear-feedback').textContent=ok?'✓ 正确':'正确答案：'+this.question.label;$('ear-feedback').className='ear-feedback '+(ok?'correct':'wrong');
  for(const b of $('ear-choices').children){b.disabled=true;b.classList.toggle('correct',b.textContent===this.question.label);b.classList.toggle('wrong',!ok&&b.textContent===label);}E.updateStats();E.saveStats();
  const review=document.createElement('div');review.id='ear-harmony-review';this.question.chords.forEach((c,i)=>{const b=document.createElement('button');b.textContent=(i+1)+'. '+c.name;b.onclick=()=>this.play(false,false,i);review.appendChild(b);});const next=document.createElement('button');next.textContent='下一题';next.onclick=()=>this.play(true);review.appendChild(next);$('ear-choices').after(review);
 },
 settings(){
  $('ear-harmony-settings')?.remove();const d=document.createElement('dialog');d.id='ear-harmony-settings';d.className='ear-harmony-settings';const h=document.createElement('h3');h.textContent='和弦训练范围';d.appendChild(h);
  const help=document.createElement('p');help.textContent='用于“和弦综合”和“和弦进行”。副属／借用是和声功能，单独开关；十一／十三和弦采用常用省略配置。';d.appendChild(help);
  for(const family of new Set(types.map(t=>t.family))){const group=document.createElement('details');const title=document.createElement('summary');title.textContent=family;group.appendChild(title);for(const t of types.filter(t=>t.family===family)){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=t.id;input.checked=this.selection.has(t.id);input.dataset.chord='true';label.append(input,document.createTextNode(t.name));group.appendChild(label);}d.appendChild(group);}
  const family=document.createElement('select');family.setAttribute('aria-label','进行类别');for(const value of ['all',...new Set(templates.map(t=>t.family))])family.add(new Option(value==='all'?'全部进行类别':value,value));family.value=this.family;
  const preset=document.createElement('select');preset.setAttribute('aria-label','指定和弦进行');const fill=()=>{preset.replaceChildren(new Option('随机进行','random'));for(const t of templates.filter(t=>family.value==='all'||t.family===family.value))preset.add(new Option(t.id+' · '+t.name,t.id));preset.value=[...preset.options].some(o=>o.value===this.template)?this.template:'random';};fill();family.onchange=fill;d.append(family,preset);
  for(const [id,name] of [['secondary','副属和弦'],['borrowed','调式借用']]){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.id='ear-allow-'+id;input.checked=this[id];label.append(input,document.createTextNode(name));d.appendChild(label);}
  const footer=document.createElement('footer');for(const [title,fn] of [['全选',()=>d.querySelectorAll('[data-chord]').forEach(e=>e.checked=true)],['清空',()=>d.querySelectorAll('[data-chord]').forEach(e=>e.checked=false)],['取消',()=>d.close()],['应用',()=>{this.selection=new Set([...d.querySelectorAll('[data-chord]:checked')].map(e=>e.value));this.family=family.value;this.template=preset.value;this.secondary=$('ear-allow-secondary').checked;this.borrowed=$('ear-allow-borrowed').checked;this.save();E.resetQuestion();d.close();}]]){const b=document.createElement('button');b.textContent=title;b.onclick=fn;footer.appendChild(b);}d.appendChild(footer);document.body.appendChild(d);d.showModal();
 }
};
const custom=()=>['harmony','progression'].includes(E.level);
P.load();
E.referenceEnabled=true;E.intervalPlayback='melodic';
try{const s=JSON.parse(localStorage.getItem('music_toolbox_ear_listening')||'null');if(s){E.referenceEnabled=s.reference!==false;E.intervalPlayback=s.interval==='harmonic'?'harmonic':'melodic';}}catch{}
E.setListening=function(reference,interval){this.resetQuestion();this.referenceEnabled=reference;this.intervalPlayback=interval==='harmonic'?'harmonic':'melodic';try{localStorage.setItem('music_toolbox_ear_listening',JSON.stringify({reference:this.referenceEnabled,interval:this.intervalPlayback}));}catch{}};
E.replayListening=async function(reference=false,onlyReference=false){if(this.isPlaying)return;if(onlyReference&&!this.referenceEnabled){toast('参考调式已关闭；勾选后可重听');return;}if(!onlyReference&&!this.targetNotes.length)return this.play();clearTimeout(this.resetTimer);const token=++this.questionToken,q={token,level:this.level,keyRoot:this.keyRoot,scaleType:this.scaleType,bpm:this.bpm,targetNotes:[...this.targetNotes]};this.isPlaying=true;try{if(!AudioEngine.ctx)await AudioEngine.init();if(reference||onlyReference)await this._playReferenceScale(q);if(token!==this.questionToken)return;if(!onlyReference)await this._playTarget(q);}catch{toast('音频未准备完成，请重试');}finally{if(token===this.questionToken)this.isPlaying=false;}};
E.replayScale=function(){return this.replayListening(true,true);};
E._playTarget=async function(q){const level=q?.level||this.level,notes=q?.targetNotes||this.targetNotes,token=q?.token??this.questionToken;await AudioEngine.prepareInstrument(notes,'ear');if(token!==this.questionToken)return;
 if(level==='single'){$('ear-prompt').textContent='这个音是哪个唱名？';AudioEngine.playInstrument(notes[0],1,.25,'ear');await this._sleep(1020);return;}
 if(level==='triad'||level==='seventh'){$('ear-prompt').textContent='这是什么'+(level==='triad'?'三':'七')+'和弦？';for(const n of notes){if(token!==this.questionToken)return;AudioEngine.playInstrument(n,1.2,.15,'ear');await this._sleep(36);}await this._sleep(420);return;}
 $('ear-prompt').textContent='这是什么音程？';
 if(this.intervalPlayback==='harmonic'){const at=AudioEngine.ctx.currentTime+.025;notes.forEach(n=>AudioEngine.playInstrument(n,1,.18,'ear',at));await this._sleep(1100);}else{AudioEngine.playInstrument(notes[0],.5,.2,'ear');await this._sleep(550);if(token!==this.questionToken)return;AudioEngine.playInstrument(notes[1],.8,.2,'ear');await this._sleep(850);}
};
E._playReferenceScale=async function(q){if(!this.referenceEnabled)return;const token=q?.token??this.questionToken,scale=MusicTheory.scaleTemplates[q?.scaleType||this.scaleType],base=60+(q?.keyRoot??this.keyRoot),ms=30000/(q?.bpm||this.bpm);await AudioEngine.prepareInstrument([...scale.map(n=>base+n),base+12],'ear');
 for(const n of [...scale,12]){if(token!==this.questionToken)return;AudioEngine.playInstrument(base+n,Math.max(.38,ms*1.55/1000),.18,'ear');await this._sleep(ms);}
 for(let i=0;i<2;i++){if(token!==this.questionToken)return;AudioEngine.playInstrument(base+scale[5],Math.max(.82,ms*4.08/1000),.2,'ear');await this._sleep(ms*4);} };
const listeningInit=E.init.bind(E);E.init=function(){listeningInit();const box=document.createElement('div');box.className='ear-listening';box.innerHTML='<label><input id="ear-reference-enabled" type="checkbox">播放参考调式</label><label id="ear-interval-kind">音程 <select id="ear-interval-playback"><option value="melodic">旋律 · 先后听</option><option value="harmonic">和声 · 同时听</option></select></label>';document.querySelector('.ear-key-tools').after(box);$('ear-reference-enabled').checked=this.referenceEnabled;$('ear-interval-playback').value=this.intervalPlayback;box.onchange=()=>this.setListening($('ear-reference-enabled').checked,$('ear-interval-playback').value);$('ear-interval-kind').hidden=this.level!=='interval';};
const init=E.init.bind(E);E.init=function(){init();const host=document.querySelector('.ear-level-select');for(const [id,name] of [['harmony','和弦综合'],['progression','和弦进行']]){const b=document.createElement('button');b.textContent=name;b.onclick=()=>E.setLevel(id,b);host.appendChild(b);}const b=document.createElement('button');b.className='ear-range-button';b.textContent='和弦范围';b.onclick=()=>P.settings();document.querySelector('.ear-key-tools').appendChild(b);};
const play=E.play.bind(E),reset=E.resetQuestion.bind(E),stage=E.renderStageIndicator.bind(E);
E.play=function(){return custom()?P.play(true):play();};E.replay=function(){return custom()?P.play(!P.question,false):this.replayListening(false);};E.replayQuestion=function(){return custom()?P.play(!P.question,true):this.replayListening(true);};
E.resetQuestion=function(){reset();P.question=null;$('ear-harmony-review')?.remove();};
E.renderStageIndicator=function(){if(custom()){if($('ear-stage-indicator'))$('ear-stage-indicator').textContent=E.level==='progression'?'和弦进行 → 听辨与对照':'和弦色彩 → 听辨与对照';}else stage();$('page-ear').classList.toggle('harmony-training',custom());if($('ear-interval-kind'))$('ear-interval-kind').hidden=E.level!=='interval';};
const go=App.goPage.bind(App);App.goPage=function(page,...args){if(page!=='ear'&&App.currentPage==='ear'){E.questionToken++;E.isPlaying=false;clearTimeout(E.resetTimer);}return go(page,...args);};
})();
