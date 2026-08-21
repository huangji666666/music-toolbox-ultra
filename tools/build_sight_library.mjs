import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {DOMParser} from 'linkedom';

const selectedIds=[
  '6212179','6564424','6564816','6491377','6491461','6877413','6898041','6901078',
  '5153813','5153947','5705406','5701612','5729178','6810863','6022185','5987757',
  '5987937','4986030','6217099','6180725','6900961','7111114','6389103','5133353',
  '5004731','4919879','5004835','5015378','5016466','5014023','4976777','4978382',
  '4978468','4978488','4987640','6891758','6885211','6264559','5024834','5052801',
  '5983850','5983777','5983679','4919673','5000397','5187781','6170065','6160387'
];
const durationMap={long:16,breve:8,whole:4,half:2,quarter:1,eighth:.5,'16th':.25,'32nd':.125,'64th':.0625};
const cacheDir=path.resolve('.sight-source-cache');
const tsvPath=path.resolve('../.sight-source-cache/scores.tsv');
const outputPath=path.resolve('sight-library-v2.js');

await fs.mkdir(cacheDir,{recursive:true});
const rows=(await fs.readFile(tsvPath,'utf8')).trim().split(/\r?\n/).map(line=>{const [id,scorePath,title,url]=line.split('\t');return {id,scorePath,title,url};});
const byId=new Map(rows.map(row=>[row.id,row]));

const text=(node,selector)=>node?.querySelector(selector)?.textContent?.trim()||'';
const directChildren=(node,name)=>[...(node?.children||[])].filter(child=>child.localName===name);
function eventDuration(node,beats,tuplets){
  const kind=text(node,'durationType');let duration=kind==='measure'?beats:(durationMap[kind]||0);
  const dots=Number(text(node,'dots')||0);let add=duration/2;for(let i=0;i<dots;i++){duration+=add;add/=2;}
  const tupletId=text(node,'Tuplet');if(tupletId&&tuplets.has(tupletId)){const ratio=tuplets.get(tupletId);duration*=ratio.normal/ratio.actual;}
  return Number(duration.toFixed(5));
}
function parseScore(xml,row,maxSegments=6){
  const doc=new DOMParser().parseFromString(xml,'text/xml'),staves=[...doc.querySelectorAll('Score > Staff')],staff=staves.find(item=>item.querySelector('Chord Note pitch'))||staves[0];
  if(!staff)throw new Error('no score staff');
  const keyAccidental=Number(text(staff,'KeySig accidental')||0),sigN=Number(text(staff,'TimeSig sigN')||4),sigD=Number(text(staff,'TimeSig sigD')||4),beats=Number((sigN*4/sigD).toFixed(4));
  const tuplets=new Map([...staff.querySelectorAll('Tuplet[id]')].map(item=>[item.getAttribute('id'),{normal:Number(text(item,'normalNotes')||2),actual:Number(text(item,'actualNotes')||3)}]));
  const measures=directChildren(staff,'Measure'),parsed=[];let first=-1;
  measures.forEach((measure,index)=>{
    const voice=directChildren(measure,'voice')[0]||measure.querySelector('voice');const events=[];
    for(const node of directChildren(voice,'Chord').concat(directChildren(voice,'Rest')).sort((a,b)=>[...voice.children].indexOf(a)-[...voice.children].indexOf(b))){
      const rest=node.localName==='Rest',duration=eventDuration(node,beats,tuplets);if(!duration)continue;
      if(rest)events.push({rest:true,duration});else{const pitch=Number(text(node,'Note pitch'));if(Number.isFinite(pitch))events.push({rest:false,pitch,duration});}
    }
    if(first<0&&events.some(event=>!event.rest))first=index;parsed.push(events);
  });
  if(first<0)throw new Error('no melody notes');
  const allNotes=[];for(const measure of parsed)for(const event of measure)if(!event.rest)allNotes.push(event.pitch);
  const majorRoot=((keyAccidental*7)%12+12)%12,minorRoot=(majorRoot+9)%12,lastPc=((allNotes.at(-1)||60)%12+12)%12,mode=lastPc===minorRoot?'Natural Minor':'Major',root=mode==='Natural Minor'?minorRoot:majorRoot;
  const composer=row.scorePath.split('/')[0].replaceAll('_',' '),title=row.title.replaceAll('_',' ');
  const possible=[];for(let start=first;start<parsed.length-1;start+=2)if(parsed.slice(start,start+2).some(measure=>measure.some(event=>!event.rest)))possible.push(start);
  if(!possible.length)possible.push(first);
  const selected=[];for(let slot=0;slot<Math.min(maxSegments,possible.length);slot++){const pick=Math.min(possible.length-1,Math.floor(slot*possible.length/Math.min(maxSegments,possible.length)));if(!selected.includes(possible[pick]))selected.push(possible[pick]);}
  return selected.map((start,segmentIndex)=>{
    const target=beats*2,events=[];let total=0;
    for(let i=start;i<parsed.length&&total<target-.001;i++)for(const event of parsed[i]){if(total>=target-.001)break;const remaining=target-total,duration=Math.min(event.duration,remaining);if(duration>.0001){events.push({...event,duration:Number(duration.toFixed(4))});total+=duration;}}
    if(total<target-.001)events.push({rest:true,duration:Number((target-total).toFixed(4))});
    const excerptNotes=events.filter(event=>!event.rest).map(event=>event.pitch);if(!excerptNotes.length)return null;
    const average=excerptNotes.reduce((a,b)=>a+b,0)/excerptNotes.length,octaveShift=average>76?-12:average<56?12:0;
    const seq=events.map(event=>event.rest?[null,event.duration,1]:[event.pitch+octaveShift-(60+root),event.duration]);
    const fingerprint=crypto.createHash('sha256').update(JSON.stringify({root,mode,meter:`${sigN}/${sigD}`,seq})).digest('hex').slice(0,16);
    return {id:`cc0-osl-${row.id}-seg-${String(segmentIndex+1).padStart(2,'0')}`,title:`${title} · 第 ${segmentIndex+1} 段`,composer,source:'OpenScore Lieder · CC0-1.0',sourceUrl:row.url,license:'CC0-1.0',fingerprint,root,mode,meter:`${sigN}/${sigD}`,style:'classical',bars:2,seq};
  }).filter(Boolean);
}

async function load(row){
  const cachePath=path.join(cacheDir,`${row.id}.mscx`);let xml;
  try{xml=await fs.readFile(cachePath,'utf8');}catch{
    const raw=`https://raw.githubusercontent.com/OpenScore/Lieder/main/scores/${row.scorePath}/lc${row.id}.mscx`,response=await fetch(encodeURI(raw));if(!response.ok)throw new Error(`${response.status} ${raw}`);xml=await response.text();await fs.writeFile(cachePath,xml);
  }
  return parseScore(xml,row,6);
}

const cachedIds=(await fs.readdir(cacheDir)).filter(name=>name.endsWith('.mscx')).map(name=>name.replace('.mscx','')).filter(id=>byId.has(id));
const candidates=[...new Set([...selectedIds.filter(id=>cachedIds.includes(id)),...cachedIds])],library=[];
for(let offset=0;offset<candidates.length&&library.length<300;offset+=8){const batch=candidates.slice(offset,offset+8);const settled=await Promise.allSettled(batch.map(id=>load(byId.get(id))));settled.forEach((result,index)=>{if(result.status==='fulfilled')library.push(...result.value);else console.error(batch[index],result.reason?.message||result.reason);});console.log(`processed ${Math.min(offset+8,candidates.length)}/${candidates.length}; usable ${library.length}`);}
const seenIds=new Set(),seenPrints=new Set(),deduped=library.filter(item=>{if(seenIds.has(item.id)||seenPrints.has(item.fingerprint))return false;seenIds.add(item.id);seenPrints.add(item.fingerprint);return true;}).slice(0,300);
const header=`/* Generated from locally cached OpenScore Lieder CC0 score data. Do not hand-edit.\n   Source: https://github.com/OpenScore/Lieder\n   License: CC0-1.0. Each item is an independently indexed two-measure sight-singing excerpt. */\n`;
await fs.writeFile(outputPath,`${header}window.SIGHT_LIBRARY_V2=${JSON.stringify(deduped,null,2)};\n`);
console.log(`wrote ${deduped.length} unique excerpts to ${outputPath}`);
