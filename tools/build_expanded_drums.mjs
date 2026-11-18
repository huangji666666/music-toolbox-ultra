import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),sr=44100;
const profiles=[['dry','干脆 Trap',155,.8],['punch','硬击 Trap',180,1],['dust','颗粒 Breakbeat',135,1.2]];
const roles=['kick','snare','hat','clap','openhat','bass','rim','crash'],samples=[];
for(let p=0;p<profiles.length;p++)for(let r=0;r<roles.length;r++){
 const [kit,name,f,decay]=profiles[p],role=roles[r],duration=[.17,.19,.065,.16,.26,.42,.08,.46][r]*decay;
 const data=new Float64Array(Math.ceil(duration*sr));let seed=991+p*3181+r*97,phase=0,noiseLow=0,previous=0,hp=0;
 for(let i=0;i<data.length;i++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1,t=i/sr;noiseLow+=.22*(noise-noiseLow);let x;
  if(role==='kick'){
   phase+=2*Math.PI*(f+170*Math.exp(-t/.006)+22*Math.sin(t*175)*Math.exp(-t/.025))/sr;
   x=(Math.sin(phase)*Math.exp(-t/(.019*decay))+.52*noiseLow*Math.exp(-t/.013)+.15*noise*Math.exp(-t/.0018));
  }else if(role==='bass'){phase+=2*Math.PI*(f+28*Math.exp(-t/.008))/sr;x=Math.tanh(1.6*Math.sin(phase))*Math.exp(-t/.08);}
  else if(role==='snare')x=(.35*Math.sin(2*Math.PI*(205+p*38)*t)*Math.exp(-t/.023)+(noise-noiseLow)*Math.exp(-t/(.035*decay)));
  else if(role==='clap')x=(noise-noiseLow)*[0,.007,.014].reduce((n,d)=>n+(t>=d?Math.exp(-(t-d)/(.016*decay)):0),0);
  else if(role==='rim')x=(Math.sin(t*2*Math.PI*(900+p*120))+.4*noise)*Math.exp(-t/.009);
  else x=(noise-noiseLow)*Math.exp(-t/((role==='hat'?.011:role==='openhat'?.06:.1)*decay));
  x*=Math.min(1,t/.0004)*Math.min(1,(duration-t)/.006);const a=Math.exp(-2*Math.PI*90/sr);hp=a*(hp+x-previous);previous=x;data[i]=hp;
 }
 let peak=0;for(const x of data)peak=Math.max(peak,Math.abs(x));const b=Buffer.alloc(44+data.length*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(data.length*2,40);for(let i=0;i<data.length;i++)b.writeInt16LE(Math.round(data[i]/peak*32767),44+i*2);
 const file=`assets/drums/${kit}-${role}.wav`;fs.writeFileSync(path.join(root,file),b);samples.push({id:`drum_${kit}_${role}`,file,name:name+' · '+role,role,license:'CC0-1.0',source:'Original deterministic synthesis: tools/build_expanded_drums.mjs',author:'音乐工具箱 Ultra · 原创程序合成',duration:data.length/sr,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex'),peak:32767/32768,highPassHz:90,fundamentalHz:f});
}
fs.writeFileSync(path.join(root,'licenses/expanded-drum-sources.json'),JSON.stringify({version:'13.5.14',samples},null,2)+'\n');
console.log('Generated 24 additional percussion samples; T06 uses dry-kick (136 ms).');
