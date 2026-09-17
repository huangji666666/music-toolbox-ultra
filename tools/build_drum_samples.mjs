// Original, deterministic percussion synthesis. No downloaded/commercial samples.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),sr=44100;
const profiles=[['classic','经典 Trap',110,1],['tight','紧实 Trap',140,.68],['bright','明亮 Trap',160,.85],['house','House',125,.9],['techno','Techno',150,.75]];
const roles=['kick','snare','hat','clap','openhat','bass','rim','crash'];
const labels=['底鼓','军鼓','闭镲','手拍','开镲','808 谐波低音','边击','吊镲'];
const samples=[],folder=path.join(root,'assets/drums');fs.mkdirSync(folder,{recursive:true});
for(let p=0;p<profiles.length;p++)for(let r=0;r<roles.length;r++){
 const [key,title,fundamental,decay]=profiles[p],role=roles[r],seconds=[.38,.27,.095,.25,.46,.65,.10,.7][r]*decay;
 const signal=new Float64Array(Math.ceil(seconds*sr));let seed=7919+p*997+r*43,phase=0,last=0,hp=0,lastHP=0,hp2=0;
 const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
 const alpha=Math.exp(-2*Math.PI*90/sr);
 for(let i=0;i<signal.length;i++){
  const t=i/sr,n=noise(),attack=Math.min(1,t/.0007),fade=Math.min(1,(seconds-t)/.008);let x=0;
  if(role==='kick'||role==='bass'){
   const bass=role==='bass',f=fundamental+(bass?45:330)*Math.exp(-t/(bass?.009:.012));phase+=2*Math.PI*f/sr;
   x=(Math.sin(phase)+.36*Math.sin(2*phase)+.16*Math.sin(3*phase))*Math.exp(-t/(bass?.19:.08)/decay);
   x=Math.tanh(x*(1.2+p*.25))+.24*n*Math.exp(-t/.004);
  }else if(role==='snare')x=(.52*Math.sin(2*Math.PI*(180+p*22)*t)+.2*Math.sin(2*Math.PI*330*t))*Math.exp(-t/.045)+n*.9*Math.exp(-t/(.055*decay));
  else if(role==='clap'){x=n*(Math.exp(-t/.025)+[.009,.018,.027].reduce((sum,d)=>sum+(t>=d?.65*Math.exp(-(t-d)/.026):0),0));}
  else if(role==='rim')x=(Math.sin(2*Math.PI*(760+p*60)*t)+.55*Math.sin(2*Math.PI*1730*t))*Math.exp(-t/.015)+.3*n*Math.exp(-t/.002);
  else {const metal=[3167,4211,5323,6779].reduce((sum,f)=>sum+Math.sign(Math.sin(2*Math.PI*f*(1+p*.015)*t)),0)/4;const d=role==='hat'?.022:role==='openhat'?.13:.20;x=(.6*n+.4*metal)*Math.exp(-t/(d*decay));}
  x*=attack*Math.max(0,fade);hp=alpha*(hp+x-last);last=x;hp2=alpha*(hp2+hp-lastHP);lastHP=hp;signal[i]=hp2;
 }
 let peak=0;for(const x of signal)peak=Math.max(peak,Math.abs(x));
 const bytes=Buffer.alloc(44+signal.length*2);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(sr,24);bytes.writeUInt32LE(sr*2,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(signal.length*2,40);
 for(let i=0;i<signal.length;i++)bytes.writeInt16LE(Math.round(signal[i]/peak*32767),44+i*2);
 const id=`drum_${key}_${role}`,file=`assets/drums/${key}-${role}.wav`;fs.writeFileSync(path.join(root,file),bytes);
 samples.push({id,file,name:`${title} · ${labels[r]}`,category:title,role,source:'Original deterministic synthesis: tools/build_drum_samples.mjs',author:'音乐工具箱 Ultra · 原创程序合成',license:'CC0-1.0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',sampleRate:sr,channels:1,duration:signal.length/sr,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),peak:32767/32768,fundamentalHz:['kick','bass'].includes(role)?fundamental:null,highPassHz:90});
}
fs.writeFileSync(path.join(root,'licenses/drum-sources.json'),JSON.stringify({version:'13.5.11',description:'40 original synthesized one-shots, not a branded drum-machine recording. Kick/bass settled fundamental 110–160 Hz, added harmonics, two 90 Hz high-pass stages, linked peak normalization. Not a brick-wall cutoff or a promise of identical perceived loudness.',samples},null,2)+'\n');
// One-time trim of approved N15 in this version; original audition and prior release stay intact.
const provenancePath=path.join(root,'licenses/metronome-sources.json'),provenance=JSON.parse(fs.readFileSync(provenancePath,'utf8')),sample=provenance.samples.find(s=>s.auditionId==='N15');
if(!sample.processing?.trimLeadingFrames){
 const file=path.join(root,sample.file),raw=fs.readFileSync(file),channels=raw.readUInt16LE(22),rate=raw.readUInt32LE(24),frames=(raw.length-44)/(channels*2);let onset=0;
 for(;onset<frames;onset++){let a=0;for(let c=0;c<channels;c++)a=Math.max(a,Math.abs(raw.readInt16LE(44+(onset*channels+c)*2)));if(a>=327.67)break;}
 const trim=Math.max(0,onset-Math.round(rate*.002)),out=Buffer.concat([raw.subarray(0,44),raw.subarray(44+trim*channels*2)]);
 for(let f=0;f<Math.round(rate*.0005);f++)for(let c=0;c<channels;c++){const at=44+(f*channels+c)*2;out.writeInt16LE(Math.round(out.readInt16LE(at)*f/(rate*.0005)),at);}
 out.writeUInt32LE(out.length-8,4);out.writeUInt32LE(out.length-44,40);fs.writeFileSync(file,out);
 sample.processing={trimLeadingFrames:trim,trimLeadingMs:trim/rate*1000,fadeInMs:.5,reason:'Remove leading silence; preserve attack and tail'};sample.bytes=out.length;sample.duration=(out.length-44)/(rate*channels*2);sample.sha256=crypto.createHash('sha256').update(out).digest('hex');
}
provenance.version='13.5.11';fs.writeFileSync(provenancePath,JSON.stringify(provenance,null,2)+'\n');console.log(`Generated ${samples.length} original drums; N15 trimmed ${sample.processing.trimLeadingMs.toFixed(2)} ms`);
