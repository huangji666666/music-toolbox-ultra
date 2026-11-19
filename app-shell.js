/* Presentation shell. Music, tuning, transport and storage stay in their existing owners. */
(() => {
'use strict';
const byId=id=>document.getElementById(id);
const skins=[['glass','澄蓝玻璃'],['sea','海盐青蓝'],['violet','暮紫'],['amber','暖金'],['graphite','石墨']];
const read=(key,fallback)=>{try{return localStorage.getItem('music_toolbox_'+key)||fallback;}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem('music_toolbox_'+key,value);}catch{}};
const selectValue=(id,value)=>byId(id)?.querySelectorAll('option').forEach(option=>option.selected=option.value===value);
const Shell={
 skin:'glass',layout:'auto',
 setSkin(value){this.skin=skins.some(([id])=>id===value)?value:'glass';document.body.dataset.skin=this.skin;save('skin',this.skin);document.querySelectorAll('[data-skin-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.skinChoice===this.skin)));},
 setMotion(value){const mode=value==='reduced'?'reduced':'auto';document.documentElement.dataset.motion=mode;save('motion',mode);selectValue('shell-motion',mode);},
 setLayout(value){this.layout=['auto','stack','side'].includes(value)?value:'auto';byId('tuner-instruments').dataset.arrangement=this.layout;save('tuner_layout',this.layout);selectValue('tuner-layout',this.layout);TunerAssist.renderTargets();this.scheduleLinks?.();},
 setTunerOption(key,value){
  const normalized=value==='off'?'off':'on';
  save(key==='headstock'?'tuner_headstock':`peg_${key}`,normalized);
  const head=byId('tuner-headstock');
  if(key==='headstock')head?.classList.toggle('headstock-art-hidden',normalized==='off');
  if(head&&(key==='note'||key==='string'))head.dataset[key]=normalized;
  const control=byId(`tuner-${key}-display`);if(control)selectValue(`tuner-${key}-display`,normalized);
 },
 appearance(){
  const host=byId('page-settings');if(!host||byId('shell-appearance'))return;
  const section=document.createElement('details');section.id='shell-appearance';section.className='settings-section shell-appearance';
  section.innerHTML='<summary class="settings-title">外观与动效</summary><div class="skin-choices">'+skins.map(([id,label])=>`<button type="button" data-skin-choice="${id}" aria-pressed="false"><i></i>${label}</button>`).join('')+'</div><label>动效<select id="shell-motion"><option value="auto">自然动效 · 遵循系统设置</option><option value="reduced">减少动效</option></select></label>';
  for(const group of host.querySelectorAll(':scope > .settings-section')){
   const title=group.querySelector('.settings-title');if(group.contains(byId('set-theme'))){section.append(...group.querySelectorAll('.setting-row'));group.remove();continue;}
   const fold=document.createElement('details'),summary=document.createElement('summary');fold.className='settings-section';summary.className=title.className;summary.append(...title.childNodes);if(summary.textContent.trim()==='灵敏度')summary.lastChild.textContent='检测灵敏度';title.remove();group.before(fold);fold.append(summary,...group.children);group.remove();
   const actions=fold.querySelector('[onclick="Settings.clearData()"]')?.parentElement;if(actions){actions.classList.add('settings-actions');fold.after(actions);}
  }
  host.querySelector('.settings-community').insertAdjacentElement('afterend',section);
  const quick=document.createElement('div');quick.id='quick-theme';quick.setAttribute('popover','auto');quick.setAttribute('aria-label','选择主题');quick.innerHTML='<div class="skin-choices">'+section.querySelector('.skin-choices').innerHTML+'</div><div class="brightness-picks"><button data-brightness="light">日间</button><button data-brightness="dark">夜间</button></div>';document.body.append(quick);
  for(const b of quick.querySelectorAll('button'))b.onclick=()=>{if(b.dataset.brightness)App.setTheme(b.dataset.brightness);else this.setSkin(b.dataset.skinChoice);quick.hidePopover?.();if(!quick.hidePopover)quick.hidden=true;};
  for(const b of quick.querySelectorAll('[data-brightness]'))b.setAttribute('aria-pressed',String(b.dataset.brightness===document.body.dataset.theme));
  if(!quick.showPopover){quick.hidden=true;byId('theme-toggle-btn').onclick=()=>quick.hidden=!quick.hidden;document.addEventListener('pointerdown',e=>{if(!quick.contains(e.target)&&!byId('theme-toggle-btn').contains(e.target))quick.hidden=true;});}
  section.querySelectorAll('[data-skin-choice]').forEach(b=>b.onclick=()=>this.setSkin(b.dataset.skinChoice));byId('shell-motion').onchange=e=>this.setMotion(e.target.value);
 },
 mountTuner(){
  if(byId('tuner-instruments'))return;TunerAssist.init();
  const rack=byId('strings-container'),range=byId('tuner-range');if(!rack||!range)return;
  const pair=document.createElement('div');pair.id='tuner-instruments';pair.className='tuner-instruments';
  const head=document.createElement('section');head.id='tuner-headstock';head.className='tuner-headstock';head.setAttribute('aria-label','吉他琴头，点击弦钮试听并锁定目标');
  head.innerHTML='<div class="headstock-heading"><strong>琴头</strong><span class="headstock-direction-hint">左列 ↺ 逆时针 · 右列 顺时针 ↻</span></div><div class="headstock-frame"><div class="headstock-art">'+this.headstockSVG()+'</div><div class="headstock-string-rack"></div></div>';
  head.querySelector('.headstock-string-rack').appendChild(rack);range.before(pair);pair.append(head,range);
  const diagnostics=byId('tuner-diagnostics'),a4=byId('a4-box');
  const quick=document.createElement('div');quick.className='tuner-quick-controls';quick.innerHTML='<details class="tuner-settings-fold"><summary>检测与显示设置</summary><div class="tuner-settings-body"><div class="tuner-quick-detection"><button type="button" class="tuner-diagnostics-toggle">检测方式与设备</button></div><div class="tuner-quick-display" role="group" aria-label="调音器显示选项"><label>琴头图形<select id="tuner-headstock-display"><option value="on">显示</option><option value="off">隐藏图形</option></select></label><label>音名<select id="tuner-note-display"><option value="on">显示</option><option value="off">隐藏</option></select></label><label>弦号<select id="tuner-string-display"><option value="on">显示</option><option value="off">隐藏</option></select></label></div></div></details>';
  pair.after(quick);
  for(const [id,label] of [['note','琴头音名'],['string','琴头弦号']])quick.querySelector('#tuner-'+id+'-display').parentNode.firstChild.textContent=label;
  const gear=quick.querySelector('summary');gear.className='tuner-diagnostics-toggle';gear.dataset.ui='settings-2';gear.setAttribute('aria-label','检测与显示设置');gear.title='检测与显示设置';gear.textContent='';quick.querySelector('.tuner-quick-detection').remove();if(diagnostics){quick.querySelector('.tuner-settings-body').prepend(diagnostics);diagnostics.open=true;}
  quick.querySelector('#tuner-headstock-display').onchange=e=>this.setTunerOption('headstock',e.target.value);
  quick.querySelector('#tuner-note-display').onchange=e=>this.setTunerOption('note',e.target.value);
  quick.querySelector('#tuner-string-display').onchange=e=>this.setTunerOption('string',e.target.value);
  const controls=document.createElement('div');controls.className='tuner-view-controls';controls.innerHTML='<label>琴头与钢琴<select id="tuner-layout"><option value="auto">自动排布</option><option value="stack">上下显示</option><option value="side">左右显示</option></select></label>';
  quick.querySelector('.tuner-settings-body').append(controls);byId('tuner-layout').onchange=e=>this.setLayout(e.target.value);
  const swap=document.createElement('button');swap.type='button';swap.id='tuner-swap';swap.setAttribute('aria-label','互换钢琴与琴头位置');swap.title='互换钢琴与琴头位置';swap.innerHTML='<svg viewBox="0 0 24 24" class="ui-glyph" aria-hidden="true"><path d="M8 20V4m-4 4 4-4 4 4m4-4v16m-4-4 4 4 4-4"/></svg>';
  const fold=quick.firstElementChild;const order=first=>{fold.open=false;pair.dataset.first=first;const heading=(first==='piano'?range:head).firstElementChild;heading.append(swap,quick);swap.setAttribute('aria-pressed',String(first==='head'));this.scheduleLinks?.();};order(read('tuner_order','piano'));swap.onclick=()=>{const first=pair.dataset.first==='piano'?'head':'piano';save('tuner_order',first);order(first);};
  const positionFold=()=>{if(!fold.open)return;const a=gear.getBoundingClientRect(),top=Math.max(8,document.querySelector('.top-bar').getBoundingClientRect().bottom+4),bottom=document.querySelector('nav').getBoundingClientRect().top-5,body=fold.lastElementChild,below=bottom-a.bottom,up=a.top-top;body.style.right=Math.max(6,innerWidth-a.right)+'px';body.style.maxHeight=Math.max(100,Math.max(up,below)-6)+'px';body.style.top=below>=up?a.bottom+3+'px':'auto';body.style.bottom=below>=up?'auto':innerHeight-a.top+3+'px';};fold.ontoggle=positionFold;window.addEventListener('resize',positionFold);document.addEventListener('scroll',positionFold,true);document.addEventListener('pointerdown',e=>{if(!quick.contains(e.target))fold.open=false;},true);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&fold.open){fold.open=false;gear.focus();}});
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.id='tuner-links';svg.setAttribute('aria-hidden','true');pair.append(svg);
  let frame=0;this.scheduleLinks=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;this.drawLinks(pair,svg);});};if(typeof ResizeObserver!=='undefined'){const ro=new ResizeObserver(this.scheduleLinks);for(const el of [pair,range,head,range.querySelector('.tuner-range-keys')])if(el)ro.observe(el);}window.addEventListener('resize',this.scheduleLinks);
  this.setLayout(read('tuner_layout','auto'));this.setTunerOption('headstock',read('tuner_headstock','on'));this.setTunerOption('note',read('peg_note','on'));this.setTunerOption('string',read('peg_string','on'));this.bindHeadstockControls();this.syncHeadstock();
 },
 drawLinks(pair,svg){
  const box=svg.getBoundingClientRect();if(!box.width||!box.height)return;const buttons=[...byId('strings-container').querySelectorAll('.s-btn')],active=Tuner.lockedString>=0?Tuner.lockedString:Tuner.confirmedStringIdx,keys=pair.querySelector('.tuner-range-keys');if(!keys)return;
  const head=byId('tuner-headstock').getBoundingClientRect(),keyboard=keys.getBoundingClientRect(),side=keyboard.right<=head.left+2||keyboard.left>=head.right-2,above=keyboard.top<head.top,lines=[];
  const track=keys.parentElement,origin=track.getBoundingClientRect(),packed=[],targets=new Map(),selected=Tuner.targetStrings[active]?.midi;
  for(const badge of track.querySelectorAll('.tuner-range-target')){
   const key=keys.querySelector(`[data-range-midi="${badge.dataset.midi}"]`);if(!key)continue;
   const r=key.getBoundingClientRect(),w=badge.offsetWidth,mid=Math.min(origin.width-w/2,Math.max(w/2,r.left+r.width/2-origin.left));
   const last=packed.at(-1);packed.push({badge,w,x:Math.max(mid,last?last.x+(last.w+w)/2+1:w/2)});
   badge.classList.toggle('current',Number(badge.dataset.midi)===selected);targets.set(badge.dataset.midi,badge);
  }
  let right=origin.width;for(const p of packed.reverse()){p.x=Math.min(p.x,right-p.w/2);p.badge.style.left=p.x+'px';right=p.x-p.w/2-1;}byId('tuner-range-targets').style.visibility='visible';
  for(const [i,b] of buttons.entries()){const midi=Tuner.targetStrings[i]?.midi,key=keys.querySelector(`[data-range-midi="${midi}"]`);if(!key)continue;const a=b.getBoundingClientRect(),z=key.getBoundingClientRect();if(!a.width||!z.width)continue;
   const left=a.left+a.width/2<head.left+head.width/2,dir=left?-1:1,x=(left?a.left:a.right)-box.left,y=a.top+a.height/2-box.top,k=z.left+z.width/2-box.left,v=(above?keyboard.bottom:keyboard.top)-box.top,offset=6+(i%4)*2;
   const edge=side?(keyboard.left>head.left?head.right:head.left)-box.left:(above?head.top:head.bottom)-box.top,rail=Math.min(box.width-2,Math.max(2,x+dir*offset));
   const dot=targets.get(String(midi))?.getBoundingClientRect(),dy=dot?dot.top+dot.height/2-box.top:v,dx=dot?dot.left+dot.width/2-box.left:k;
   const d=side?`M${x} ${y} C${edge} ${y} ${dx} ${y} ${dx} ${dy} L${k} ${v}`:`M${x} ${y} Q${rail} ${y} ${rail} ${y+(above?-1:1)*7} C${rail} ${edge} ${rail} ${edge} ${(rail+dx)/2} ${edge} S${dx} ${dy+(above?8:-8)} ${dx} ${dy} L${k} ${v}`;
   lines.push(`<path data-string="${i}" data-midi="${midi}" class="${active===i?'current':''}" d="${d}"/>`);if(!lines.some(s=>s.startsWith(`<polygon data-tip="${midi}"`))){const sign=dy<v?-1:1;lines.push(`<polygon data-tip="${midi}" points="${k},${v} ${k-2.6},${v+sign*4} ${k+2.6},${v+sign*4}" fill="var(--prim)"/>`);}}
  svg.innerHTML=lines.join('');this.waveKeys=[...targets.keys()].map(m=>keys.querySelector(`[data-range-midi="${m}"]`));keys.querySelectorAll('.wave-key').forEach(k=>{if(!this.waveKeys.includes(k)){k.classList.remove('wave-key','linked-key');k.style.removeProperty('--wave');}});this.updateWaves(Tuner.displayFreq>0?freqToMidi(Tuner.displayFreq,Tuner.a4):NaN);
 },
 updateWaves(m){if(!this.waveKeys?.length)return;const lock=Tuner.targetStrings[Tuner.lockedString]?.midi,nearest=Number.isFinite(m)?this.waveKeys.reduce((a,b)=>Math.abs(+a.dataset.rangeMidi-m)<=Math.abs(+b.dataset.rangeMidi-m)?a:b):null;
  for(const k of this.waveKeys){const pitch=+k.dataset.rangeMidi,on=lock==null||lock===pitch,focus=lock==null?k===nearest:lock===pitch,level=on?(Number.isFinite(m)?(focus?.38+.62*Math.max(0,1-Math.abs(m-pitch)/1.5):.18):focus?.94:.44):0;k.classList.toggle('wave-key',on);k.classList.toggle('linked-key',focus);const v=level.toFixed(2);if(k.style.getPropertyValue('--wave')!==v)k.style.setProperty('--wave',v);}
 },
 headstockSVG(count=6){
  const rows=count===4?[357,633]:[250,470,690],half=count/2,leftKnobXs=[227,222,228],nutY=890,ringR=29;
  const specs=Array.from({length:count},(_,i)=>{const left=i<half,row=left?half-1-i:i-half;return {i,stringNo:count-i,left,row,y:rows[row],postX:left?304:596,knobX:left?leftKnobXs[row]:900-leftKnobXs[row],nutX:372+156*i/(count-1),dir:left?-1:1,turns:2.35+i*.15};});
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  const tangentFor=s=>{
   const dx=s.nutX-s.postX,dy=nutY-s.y,distance=Math.hypot(dx,dy),phi=Math.atan2(dy,dx),delta=Math.acos(clamp(ringR/distance,-1,1));
   const a1=phi-delta,a2=phi+delta,x1=s.postX+Math.cos(a1)*ringR,x2=s.postX+Math.cos(a2)*ringR;
   const angle=s.left?(x1>x2?a1:a2):(x1<x2?a1:a2);
   return {angle,x:s.postX+Math.cos(angle)*ringR,y:s.y+Math.sin(angle)*ringR};
  };
  const coilFor=(s,tangent)=>{
   const steps=Math.max(72,Math.ceil(s.turns*60)),endR=7;
   let d='';
   for(let i=0;i<=steps;i++){
    const t=i/steps,angle=tangent.angle+s.dir*t*s.turns*Math.PI*2,r=ringR-(ringR-endR)*Math.pow(t,1.12);
    d+=`${i?'L':'M'}${(s.postX+Math.cos(angle)*r).toFixed(2)} ${(s.y+Math.sin(angle)*r).toFixed(2)}`;
   }
   return d;
  };
  specs.forEach(s=>{s.tangent=tangentFor(s);s.coil=coilFor(s,s.tangent);});
  const strings=specs.map(s=>`<path class="headstock-string" d="M${s.nutX} ${nutY} L${s.tangent.x.toFixed(2)} ${s.tangent.y.toFixed(2)}"/><path class="headstock-tail" d="M${s.nutX} ${nutY} L${s.nutX} 932"/>`).join('');
  const pegs=specs.map(s=>{
   const direction=s.left?'M-15 13 A22 22 0 0 1 15 13 m-5 -5 l5 5 -5 5':'M15 13 A22 22 0 0 1 -15 13 m5 -5 l-5 5 5 5';
   const angleMin=-135,angleMax=135;
   return `<g class="head-peg-control" data-head-string="${s.i}" data-peg-control data-cx="${s.knobX}" data-cy="${s.y}" data-rotation="0" role="slider" tabindex="0" aria-valuemin="${angleMin}" aria-valuemax="${angleMax}" aria-valuenow="0" aria-label="第${s.stringNo}弦视觉弦钮，可拖动旋转，不改变音高"><title>第${s.stringNo}弦弦钮，${s.left?'逆时针':'顺时针'}收紧</title><g class="head-peg-rotor" transform="rotate(0 ${s.knobX} ${s.y})"><ellipse class="head-peg-glow" cx="${s.knobX}" cy="${s.y}" rx="30.5" ry="43" fill="none"/><ellipse class="head-peg-knob" cx="${s.knobX}" cy="${s.y}" rx="22" ry="34"/><ellipse class="head-peg-inner" cx="${s.knobX}" cy="${s.y}" rx="16" ry="26.5"/><line class="head-peg-pointer" x1="${s.knobX}" y1="${s.y}" x2="${s.knobX}" y2="${s.y-29}"/><circle class="head-peg-dot" cx="${s.knobX}" cy="${s.y-29}" r="2.2"/><circle class="head-peg-center" cx="${s.knobX}" cy="${s.y}" r="1.5"/><path class="head-peg-direction" d="${direction}" transform="translate(${s.knobX} ${s.y})"/></g><ellipse class="head-peg-hit" cx="${s.knobX}" cy="${s.y}" rx="31" ry="45" fill="transparent"/></g>`;
  }).join('');
  const posts=specs.map(s=>`<g class="head-peg-post"><circle class="head-peg-ring" cx="${s.postX}" cy="${s.y}" r="23.5"/><circle class="head-peg-post-inner" cx="${s.postX}" cy="${s.y}" r="7"/><circle class="head-peg-cap" cx="${s.postX}" cy="${s.y}" r="8.4"/><circle class="head-peg-cap-hole" cx="${s.postX}" cy="${s.y-3.1}" r="1.2"/><path class="head-peg-wind-guide" d="${s.coil}"/><path class="head-peg-coil-path" d="${s.coil}"/></g>`).join('');
  return `<svg class="headstock-svg" viewBox="180 60 540 880" preserveAspectRatio="xMidYMid meet" role="group" aria-label="参考琴头线稿，可拖动六个弦钮旋转"><path class="headstock-body" d="M450 108 C350 108 266 186 250 304 C246 340 244 380 244 424 C244 500 245 580 249 650 C253 714 265 772 286 824 C305 867 320 893 332 904 L568 904 C580 893 595 867 614 824 C635 772 647 714 651 650 C655 580 656 500 656 424 C656 380 654 340 650 304 C634 186 550 108 450 108 Z"/><rect class="headstock-nut" x="332" y="886" width="236" height="18" rx="3"/><path class="headstock-nut-slot" d="M372 887 V903 M403.2 887 V903 M434.4 887 V903 M465.6 887 V903 M496.8 887 V903 M528 887 V903"/>${strings}${posts}${pegs}</svg>`;
 },
 bindHeadstockControls(){
  const svg=byId('tuner-headstock')?.querySelector('.headstock-svg');if(!svg||svg.dataset.bound==='true')return;svg.dataset.bound='true';
  const point=e=>{const p=svg.createSVGPoint?.();const matrix=svg.getScreenCTM?.();if(p&&matrix){p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(matrix.inverse());}const r=svg.getBoundingClientRect();return {x:180+(e.clientX-r.left)/Math.max(1,r.width)*540,y:60+(e.clientY-r.top)/Math.max(1,r.height)*880};};
  const setRotation=(control,value)=>{const angle=Math.max(-135,Math.min(135,Number(value)||0));control.dataset.rotation=String(angle);const x=Number(control.dataset.cx),y=Number(control.dataset.cy);control.querySelector('.head-peg-rotor')?.setAttribute('transform',`rotate(${angle} ${x} ${y})`);control.setAttribute('aria-valuenow',String(Math.round(angle)));control.setAttribute('aria-valuetext',`${control.getAttribute('aria-label')?.match(/第\d+弦/)?.[0]||'弦钮'}，${angle<0?'逆时针':'顺时针'} ${Math.abs(Math.round(angle))} 度`);};
  svg.querySelectorAll('[data-peg-control]').forEach(control=>{
   control.addEventListener('pointerdown',event=>{event.preventDefault();const p=point(event),x=Number(control.dataset.cx),y=Number(control.dataset.cy);control.dataset.dragStart=String(Math.atan2(p.y-y,p.x-x));control.dataset.dragOrigin=control.dataset.rotation||'0';control.setPointerCapture?.(event.pointerId);control.classList.add('dragging');});
   control.addEventListener('pointermove',event=>{if(!control.hasPointerCapture?.(event.pointerId))return;const p=point(event),x=Number(control.dataset.cx),y=Number(control.dataset.cy),start=Number(control.dataset.dragStart);setRotation(control,Number(control.dataset.dragOrigin)+(Math.atan2(p.y-y,p.x-x)-start)*180/Math.PI);});
   const stop=event=>{if(control.hasPointerCapture?.(event.pointerId))control.releasePointerCapture(event.pointerId);control.classList.remove('dragging');};
   control.addEventListener('pointerup',stop);control.addEventListener('pointercancel',stop);control.addEventListener('dblclick',()=>setRotation(control,0));
   control.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowDown'){event.preventDefault();setRotation(control,Number(control.dataset.rotation)-8);}if(event.key==='ArrowRight'||event.key==='ArrowUp'){event.preventDefault();setRotation(control,Number(control.dataset.rotation)+8);}if(event.key==='Home'){event.preventDefault();setRotation(control,0);}});
  });
 },
 syncHeadstock(){
  const head=byId('tuner-headstock');if(!head)return;const count=Tuner.targetStrings.length,supported=count===6||count===4,half=count/2;head.classList.toggle('multi-strings',!supported);
  if(head.dataset.strings!==String(count)){head.dataset.strings=String(count);const art=head.querySelector('.headstock-art');art.innerHTML=supported?this.headstockSVG(count):'';head.setAttribute('aria-label',`${count} 弦调音，琴头为弦位示意`);head.querySelector('.headstock-direction-hint').textContent='弦位示意';art.querySelector('svg')?.setAttribute('aria-label',`${count} 弦对称琴头示意`);const slots=art.querySelector('.headstock-nut-slot');if(slots)slots.setAttribute('d',Array.from({length:count},(_,i)=>`M${372+156*i/(count-1)} 887V903`).join(' '));this.bindHeadstockControls();}
  byId('strings-container').querySelectorAll('.s-btn').forEach((b,i)=>{b.style.setProperty('--peg-col',i<half?1:3);b.style.setProperty('--peg-row',i<half?half-i:i-half+1);});
  head.querySelectorAll('[data-head-string]').forEach(peg=>peg.classList.toggle('selected',Number(peg.dataset.headString)===(Tuner.lockedString>=0?Tuner.lockedString:Tuner.confirmedStringIdx)));this.scheduleLinks?.();
 },
 accessibleModal(id,closeId,focus){
  const modal=byId(id),close=byId(closeId);if(!modal)return;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label',id==='support-modal'?'捐赠支持':'联系与反馈');
  const dismiss=()=>{modal.remove();focus?.focus?.();};if(close)close.onclick=dismiss;
  modal.onclick=e=>{if(e.target===modal)dismiss();};modal.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();dismiss();}if(e.key==='Tab'){const items=[...modal.querySelectorAll('button,a[href],input,select')];const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};close?.focus();
 },
 accessibility(){
  document.querySelectorAll('nav .nav-item').forEach(item=>{item.setAttribute('role','button');item.tabIndex=0;item.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();item.click();}};});
  for(const [id,label] of [['theme-toggle-btn','选择主题'],['play-btn','开始或暂停节拍器'],['ear-play-btn','播放或重听练耳题目']])byId(id)?.setAttribute('aria-label',label);
  document.querySelector('.ear-play-btn')?.setAttribute('aria-label','播放或重听练耳题目');
 },
 init(){this.appearance();this.setSkin(read('skin','glass'));this.setMotion(read('motion','auto'));this.mountTuner();this.accessibility();PWAInstall.init();}
};
window.AppShell=Shell;

// Keep all dial geometry in the upper semicircle. Per frame only the needle changes.
Tuner.drawGauge=function(){
 const svg=byId('tuner-gauge-svg');if(!svg)return;
 if(svg.dataset.shellGauge!=='true'){
  svg.setAttribute('viewBox','0 0 260 150');svg.setAttribute('role','img');svg.setAttribute('aria-label','半圆调音表盘，左低右高，中央为准音');
  const cx=130,cy=130,R=110,p=(r,c)=>{const a=(180+(c+50)*1.8)*Math.PI/180;return [cx+r*Math.cos(a),cy+r*Math.sin(a)];};
  let content='<path d="M20 130 A110 110 0 0 1 240 130" fill="none" stroke="var(--gauge-arc)" stroke-width="8" stroke-linecap="round"/><path d="M120.4 20.4 A110 110 0 0 1 139.6 20.4" fill="none" stroke="var(--prim)" stroke-width="8" stroke-linecap="round"/>';
  for(let c=-50;c<=50;c+=5){const major=c%10===0,a=p(R-11,c),b=p(R-(major?22:16),c);content+=`<path d="M${a[0]} ${a[1]} L${b[0]} ${b[1]}" stroke="${c===0?'var(--prim)':'var(--gauge-tick)'}" stroke-width="${c===0?2.4:1.1}"/>`;}
  for(const c of [-50,-25,0,25,50]){const a=p(R-34,c);content+=`<text x="${a[0]}" y="${a[1]+4}" text-anchor="middle" fill="var(--text-sub)" font-size="9">${c>0?'+':''}${c}</text>`;}
  content+='<g id="gauge-needle"><path d="M130 130 V45" stroke="var(--prim)" stroke-width="2.5" stroke-linecap="round"/><circle cx="130" cy="130" r="5" fill="var(--prim)"/></g>';
  svg.innerHTML=content;svg.dataset.shellGauge='true';svg.dataset.static='true';
 }
 const angle=Math.max(-90,Math.min(90,Number(this.needleAngle)||0));svg.querySelector('#gauge-needle').setAttribute('transform',`rotate(${angle} 130 130)`);
};
const renderStrings=Tuner.renderStrings.bind(Tuner);Tuner.renderStrings=function(...args){const result=renderStrings(...args);Shell.syncHeadstock();return result;};
// Re-evaluate only the automatic board direction after a viewport change.
Shell.syncInstrumentLayout=function(){
 if(InstrumentPage.instrument==='piano'||InstrumentPage.orientation!=='auto'||InstrumentPage.pointerHolds?.size||InstrumentPage.activePointers?.size)return;
 const vv=window.visualViewport,horizontal=(vv?.width||innerWidth)>=(vv?.height||innerHeight),wrap=document.querySelector('#instrument-stage .virtual-fret-wrap');
 if(wrap&&wrap.classList.contains('is-horizontal')!==horizontal)InstrumentPage.render();
};
const goPage=App.goPage.bind(App);App.goPage=function(...args){const result=goPage(...args);if(args[0]==='instrument')Shell.syncInstrumentLayout();return result;};
let layoutTimer;addEventListener('resize',()=>{clearTimeout(layoutTimer);layoutTimer=setTimeout(()=>{if(App.currentPage==='instrument')Shell.syncInstrumentLayout();},180);},{passive:true});

// Browser capabilities determine installation; OS detection only chooses instructions.
PWAInstall.platform=function(nav=navigator){
 const ua=nav.userAgent||'',ios=/iPhone|iPad|iPod/i.test(ua)||(nav.platform==='MacIntel'&&nav.maxTouchPoints>1);
 if(ios)return /CriOS|FxiOS|EdgiOS/i.test(ua)?'ios-browser':'ios';
 if(/Android/i.test(ua))return 'android';
 if(/Mac/i.test(ua)&&/Safari/i.test(ua)&&!/Chrome|Chromium|Edg|OPR/i.test(ua))return 'mac-safari';
 if(/Firefox/i.test(ua))return 'firefox';return 'desktop';
};
const nativeInstall=PWAInstall.open.bind(PWAInstall);
PWAInstall.open=async function(){
 if(this.deferred)return nativeInstall();
 if(location.protocol==='file:'){this.showHint('本地单文件不能添加为桌面应用。请从正式 HTTPS 网站打开，再使用“添加到桌面”。');return;}
 const hints={ios:'iPhone／iPad：Safari → 分享 → 添加到主屏幕 → 添加。', 'ios-browser':'iPhone／iPad：使用浏览器的分享菜单选择“添加到主屏幕”；若没有该选项，请在 Safari 打开。',android:'Android：浏览器菜单 → 安装应用或添加到主屏幕。浏览器支持原生安装时，此按钮会直接弹出安装提示。','mac-safari':'Mac：Safari 17 或更新版本 → 文件 → 添加到程序坞。旧版本可用 Chrome／Edge 的“安装应用”。',firefox:'Firefox 通常没有完整桌面安装入口。可用 Chrome／Edge 打开此网站，选择“安装应用”；手机请使用系统支持的添加入口。',desktop:'Windows／Mac／Linux：Chrome 或 Edge 的地址栏安装图标，或菜单 → 安装此网站为应用。出现原生安装能力时，此按钮可直接安装。'};
 this.showHint(hints[this.platform()]);
};
for(const [method,id,close] of [['openSponsor','support-modal','support-close'],['openContact','contact-modal','contact-close']]){const original=ContactSupport[method].bind(ContactSupport);ContactSupport[method]=function(){const focus=document.activeElement;original();Shell.accessibleModal(id,close,focus);};}
// Standard rhythmic values drive heads, flags and dots consistently.
SightSinging.notationDuration=function(duration){
 const value=Math.max(.001,Number(duration)||1);
 for(const base of [8,4,2,1,.5,.25,.125,.0625])for(const [factor,dots,tuplet] of [[1,0,0],[1.5,1,0],[1.75,2,0],[2/3,0,3]])if(Math.abs(value-base*factor)<.0001)return {base,dots,tuplet,flags:Math.max(0,Math.round(Math.log2(1/base))),open:base>=2,whole:base>=4};
 return {base:value,dots:0,tuplet:0,flags:value<1?Math.min(4,Math.max(1,Math.round(Math.log2(1/value)))):0,open:value>=2,whole:value>=4};
};
SightSinging._restSvg=function(x,duration){
 const info=this.notationDuration(duration),ink='var(--text)',kind=info.base>=4?'whole':info.base>=2?'half':info.base>=1?'quarter':info.flags===1?'eighth':info.flags===2?'sixteenth':info.flags===3?'thirtysecond':'sixtyfourth';
 const names={whole:'全',half:'二分',quarter:'四分',eighth:'八分',sixteenth:'十六分',thirtysecond:'三十二分',sixtyfourth:'六十四分'};let shape='';
 if(info.base>=2)shape=`<rect x="${x-8}" y="${info.base>=4?86:93}" width="16" height="7" fill="${ink}"/>`;
 else if(info.base>=1)shape=`<path d="M${x+3} 78 l-7 10 7 8 -5 8 7 8 -4 10" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
 else {const hooks=Math.max(1,info.flags),top=91-(hooks-1)*5;for(let i=0;i<hooks;i++)shape+=`<circle class="rest-hook" cx="${x-4+i*2}" cy="${top+i*8}" r="2.8" fill="${ink}"/><path d="M${x-1+i*2} ${top+1+i*8} q9 2 5 10" fill="none" stroke="${ink}" stroke-width="2.3" stroke-linecap="round"/>`;shape+=`<path d="M${x+4+(hooks-1)*2} ${top+7+(hooks-1)*8} l-9 20" fill="none" stroke="${ink}" stroke-width="2.3" stroke-linecap="round"/>`;}
 for(let i=0;i<info.dots;i++)shape+=`<circle class="notation-dot" cx="${x+13+i*6}" cy="100" r="2.3" fill="${ink}"/>`;
 if(info.tuplet)shape+=`<text class="notation-tuplet" x="${x}" y="68" text-anchor="middle" fill="${ink}" font-size="11">${info.tuplet}</text>`;
 const label=(info.tuplet?'三连音':'')+(info.dots===2?'双附点':info.dots?'附点':'')+names[kind]+'休止符';
 return `<g class="sight-rest sight-rest-${kind}" role="img" aria-label="${label}，${duration} 拍"><title>${label}</title>${shape}</g>`;
};
SightSinging._renderStaffScore=function(){
 const original=this.exercise,box=byId('sight-score');if(!original||!box)return;const e=this._splitForSystems(original,Infinity)[0]||original;
 const sig=this._keySignatureInfo(e),[num=4,den=4]=String(e.meter||'4/4').split('/').map(Number),beats=Math.max(.25,num*4/den),total=Math.max(.001,e.durations.reduce((s,d)=>s+Number(d||0),0));
 const spacing=e.durations.map(d=>Math.max(26,Number(d)*70)),spaceTotal=spacing.reduce((s,w)=>s+w,0),sw=sig.entries.length*11,start=106+sw,width=Math.max(420+sw,spaceTotal+145+sw),end=width-28,ink='var(--text)',bg='var(--surf)',parts=[],bounds=[0,194];
 const positionAt=beat=>{let time=0,space=0;for(let i=0;i<e.durations.length;i++){const d=Number(e.durations[i])||.25;if(beat<=time+d+.00001)return start+(space+Math.max(0,Math.min(1,(beat-time)/d))*spacing[i])/spaceTotal*(end-start);time+=d;space+=spacing[i];}return end;};
 const line=(a,b,c,d,w=1.5,cls='')=>`<path class="${cls}" d="M${a} ${b} L${c} ${d}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round"/>`;
 const text=(x,y,t,size=11,cls='')=>`<text class="${cls}" x="${x}" y="${y}" text-anchor="middle" fill="${ink}" font-size="${size}">${String(t).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</text>`;
 let cursor=0;const events=e.durations.map((d,i)=>{const duration=Number(d)||.25,rest=!Number.isFinite(e.midis[i]),spell=rest?null:this._staffSpellMidi(e.midis[i],e,sig),event={i,d:duration,t:cursor,x:positionAt(cursor+duration*.34),y:rest?100:128-(spell.index-30)*7,rest,spell,info:this.notationDuration(duration)};cursor+=duration;return event;});
 const explicit=String(e.grouping||'').split('+').map(Number),groups=explicit.length>1&&explicit.reduce((s,n)=>s+n,0)===num?explicit:den===8&&num>3&&num%3===0?Array(num/3).fill(3):Array(num).fill(1);
 const bucket=t=>{const bar=Math.floor((t+.00001)/beats),local=t-bar*beats;let edge=0;for(let i=0;i<groups.length;i++){edge+=groups[i]*4/den;if(local<edge-.00001)return {key:bar+':'+i,end:bar*beats+edge};}return {key:bar+':last',end:(bar+1)*beats};};
 let run=[],key='';const runs=[],flush=()=>{if(run.length>1)runs.push(run);run=[];};
 for(const v of events){const b=bucket(v.t),eligible=!v.rest&&v.info.flags>0&&v.t+v.d<=b.end+.00001;if(!eligible||key!==b.key)flush();if(eligible){run.push(v);key=b.key;}}flush();
 const beams=[];
 for(const list of runs){const up=list.reduce((s,v)=>s+v.y,0)/list.length>=100,dir=up?-1:1,first=list[0],last=list.at(-1),x1=first.x+(up?8:-8),x2=last.x+(up?8:-8),slope=Math.max(-.1,Math.min(.1,(last.y-first.y)/Math.max(1,x2-x1)));let base=first.y+dir*40;const at=x=>base+(x-x1)*slope;
  for(const v of list){const sx=v.x+(up?8:-8),want=v.y+dir*35;if(up&&at(sx)>want)base-=at(sx)-want;if(!up&&at(sx)<want)base+=want-at(sx);}
  list.forEach(v=>{v.beamed=true;v.up=up;v.sx=v.x+(up?8:-8);v.sy=at(v.sx);});
  const beam=(a,b,l)=>{const y1=at(a)+(l-1)*6*-dir,y2=at(b)+(l-1)*6*-dir,h=4.3*-dir;beams.push(`<path class="notation-beam level-${l}" d="M${a} ${y1} L${b} ${y2} L${b} ${y2+h} L${a} ${y1+h} Z" fill="${ink}"/>`);};
  for(let l=1;l<=Math.max(...list.map(v=>v.info.flags));l++)list.forEach((v,i)=>{if(v.info.flags<l)return;const before=list[i-1],after=list[i+1],left=before?.info.flags>=l,right=after?.info.flags>=l;if(right)beam(v.sx,after.sx,l);else if(!left&&l>1){const n=after||before,other=v.sx+Math.sign(n.sx-v.sx)*Math.min(12,Math.abs(n.sx-v.sx)*.4);beam(Math.min(v.sx,other),Math.max(v.sx,other),l);}});
  for(let i=0;i<list.length;i+=3){const triplet=list.slice(i,i+3);if(triplet.length===3&&triplet.every(v=>v.info.tuplet===3)){const y=up?Math.min(...triplet.map(v=>v.sy))-9:Math.max(...triplet.map(v=>v.sy))+18;parts.push(text((triplet[0].x+triplet[2].x)/2,y,3,12,'notation-tuplet'));triplet.forEach(v=>v.tupletDrawn=true);bounds[0]=Math.min(bounds[0],y-15);bounds[1]=Math.max(bounds[1],y+5);}}
 }
 let bar=-1,acc=new Map();for(const v of events){const current=Math.floor((v.t+.00001)/beats);if(current!==bar){bar=current;acc=new Map();}if(v.rest){parts.push(this._restSvg(v.x,v.d));continue;}
  const {x,y,spell,info}=v;parts.push(`<g class="notation-event" data-event-index="${v.i}" data-duration="${v.d}">`);
  if(y<=58)for(let l=58;l>=y-1;l-=14)parts.push(line(x-13,l,x+13,l,1.2,'notation-ledger'));if(y>=142)for(let l=142;l<=y+1;l+=14)parts.push(line(x-13,l,x+13,l,1.2,'notation-ledger'));
  const id=spell.letter+spell.octave,active=acc.has(id)?acc.get(id):sig.byLetter[spell.letter]||'',desired=spell.accidental||'';if(active!==desired){parts.push(text(x-18,y+5,desired||'♮',19,'notation-accidental temporary'));acc.set(id,desired);}
  parts.push(`<ellipse class="notation-note${info.open?' open':''}" cx="${x}" cy="${y}" rx="${info.whole?10:8}" ry="5.5" transform="rotate(-18 ${x} ${y})" fill="${info.open?bg:ink}" stroke="${ink}" stroke-width="1.6"/>`);
  if(!info.whole){const up=v.beamed?v.up:y>=100,sx=v.beamed?v.sx:x+(up?7:-7),sy=v.beamed?v.sy:y+(up?-38:38);parts.push(line(sx,y,sx,sy,1.7,'notation-stem'));if(!v.beamed)for(let l=0;l<info.flags;l++){const fy=sy+(up?l*7:-l*7),dir=up?1:-1;parts.push(`<path class="notation-flag" d="M${sx} ${fy} C${sx+4} ${fy+dir*8} ${sx+17} ${fy+dir*8} ${sx+12} ${fy+dir*23} C${sx+14} ${fy+dir*12} ${sx+5} ${fy+dir*14} ${sx} ${fy+dir*8} Z" fill="${ink}"/>`);}bounds[0]=Math.min(bounds[0],sy-15);bounds[1]=Math.max(bounds[1],sy+18);}
  for(let dot=0;dot<info.dots;dot++){const onLine=Math.abs((128-y)/14-Math.round((128-y)/14))<.01;parts.push(`<circle class="notation-dot" cx="${x+14+dot*6}" cy="${onLine?y-7:y}" r="2.3" fill="${ink}"/>`);}
  if(info.tuplet&&!v.tupletDrawn)parts.push(text(x,y>=100?y-51:y+55,info.tuplet,11,'notation-tuplet'));
  const tie=e.ties?.[v.i],next=events[v.i+1];
  if(tie?.to){const target=next&&!next.rest?next.x-10:end,ty=y>=100?y+13:y-13,bend=y>=100?11:-11;parts.push(`<path class="notation-tie" data-tie="to" d="M${x+8} ${ty} Q${(x+8+target)/2} ${ty+bend} ${target} ${ty}" fill="none" stroke="${ink}" stroke-width="1.6"/>`);bounds[0]=Math.min(bounds[0],ty+bend-3);bounds[1]=Math.max(bounds[1],ty+bend+3);}
  if(tie?.from&&v.i===0){const ty=y>=100?y+13:y-13,bend=y>=100?11:-11;parts.push(`<path class="notation-tie" data-tie="from" d="M${start-8} ${ty} Q${(start-8+x-9)/2} ${ty+bend} ${x-9} ${ty}" fill="none" stroke="${ink}" stroke-width="1.6"/>`);}
  bounds[0]=Math.min(bounds[0],y-18);bounds[1]=Math.max(bounds[1],y+20);parts.push('</g>');
 }
 parts.push(...beams);
 if(this.lastDetected?.length){const first=this.lastDetected[0].start,last=Math.max(first+.1,this.lastDetected.at(-1).end),points=this.lastDetected.map(n=>{const y=128-(this._staffSpellMidi(n.midi,e,sig).index-30)*7;bounds[0]=Math.min(bounds[0],y-12);bounds[1]=Math.max(bounds[1],y+12);return `${positionAt((n.start-first)/(last-first)*total)},${y}`;}).join(' ');parts.push(`<polyline points="${points}" fill="none" stroke="var(--teal)" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>`);}
 const top=Math.min(0,Math.floor(bounds[0]/14)*14),height=Math.max(214,Math.ceil((bounds[1]-top+14)/14)*14);let svg=`<svg class="sight-staff-score polished" viewBox="0 ${top} ${width} ${height}" role="img" aria-label="五线谱，${Math.ceil(total/beats)} 小节，${sig.label}"><rect x="0" y="${top}" width="${width}" height="${height}" fill="${bg}"/>`;
 for(const y of [72,86,100,114,128])svg+=`<path class="notation-bar" d="M18 ${y} H${end+6}" stroke="var(--text-sub)" opacity=".55" stroke-width=".8"/>`;
 svg+=line(18,72,18,128,1.5)+text(40,121,'𝄞',43)+`<g class="sight-key-signature" aria-label="调号：${sig.label}">`+sig.entries.map((v,i)=>text(58+i*11,v.y+6,v.symbol,21)).join('')+'</g>'+text(77+sw,92,num,20,'sight-time-signature')+text(77+sw,118,den,20,'sight-time-signature');
 for(let b=1;b<=Math.ceil(total/beats);b++){const x=positionAt(Math.min(total,b*beats)),final=b===Math.ceil(total/beats);svg+=line(x,72,x,128,final?2.5:1,'notation-bar');if(final)svg+=line(x-5,72,x-5,128,1,'notation-bar');}
 box.innerHTML=svg+parts.join('')+'</svg>';requestAnimationFrame(()=>{this.applyScoreZoom();this.scrollToCurrentPhrase?.();});
};
const scoreZoom=SightSinging.applyScoreZoom.bind(SightSinging);SightSinging.applyScoreZoom=function(){
 scoreZoom();if(innerWidth<1000)return;
 byId('sight-score')?.querySelectorAll('.sight-staff-score.polished').forEach(svg=>{const view=svg.getAttribute('viewBox').split(' ').map(Number),width=Math.max(620,Math.min(920,view[2]*1.5))*this.scoreZoom/100;svg.style.setProperty('width',`min(100%,${width}px)`,'important');svg.style.setProperty('min-width','0','important');svg.style.marginInline='auto';});
};
// Prevent double activation while the single entrance is initializing audio and pages.
const start=App.startApp.bind(App);App.startApp=async function(){if(this._shellStarting)return;this._shellStarting=true;const b=document.querySelector('.start-btn');if(b)b.disabled=true;try{return await start();}catch(error){this._shellStarting=false;if(b)b.disabled=false;toast('音频暂未启用，请再次进入');throw error;}};
Shell.init();
})();
