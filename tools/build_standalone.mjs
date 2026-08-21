import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const version=JSON.parse(await fs.readFile(path.join(root,'version.json'),'utf8'));
const output=path.join(root,`Music-Toolbox-Ultra-v${version.version}-Standalone.html`);
const accentPaths=Array.from({length:26},(_,index)=>path.join(root,'assets','metronome-accent-cc0',`${String(index+1).padStart(2,'0')}.wav`));
const [html,css,library,tunings,app,audio,alipay,wechat,douyin,icon,accentAudio]=await Promise.all([
  fs.readFile(path.join(root,'index.html'),'utf8'),
  fs.readFile(path.join(root,'app-final.css'),'utf8'),
  fs.readFile(path.join(root,'sight-library-v2.js'),'utf8'),
  fs.readFile(path.join(root,'special-tunings-v1.js'),'utf8'),
  fs.readFile(path.join(root,'app-final.js'),'utf8'),
  fs.readFile(path.join(root,'assets','muted-strum-c01-cc0.mp3')),
  fs.readFile(path.join(root,'assets','support-alipay.jpg')),
  fs.readFile(path.join(root,'assets','support-wechat.jpg')),
  fs.readFile(path.join(root,'assets','contact-douyin.jpg')),
  fs.readFile(path.join(root,'icons','app-icon.svg')),
  Promise.all(accentPaths.map(file=>fs.readFile(file))),
]);

const safeInline=source=>source.replaceAll('</script>','<\\/script>');
const dataUri=(mime,buffer)=>`data:${mime};base64,${buffer.toString('base64')}`;
const audioUri=dataUri('audio/mpeg',audio),inlineAccentUrls=Object.fromEntries(accentAudio.map((buffer,index)=>[`accent_cc0_${String(index+1).padStart(2,'0')}`,dataUri('audio/wav',buffer)]));
const embeddedApp=app
  .replace("AudioEngine.mutedC01URL='./assets/muted-strum-c01-cc0.mp3';",`AudioEngine.mutedC01URL='${audioUri}';`)
  .replaceAll('./assets/support-alipay.jpg',dataUri('image/jpeg',alipay))
  .replaceAll('./assets/support-wechat.jpg',dataUri('image/jpeg',wechat))
  .replaceAll('./assets/contact-douyin.jpg',dataUri('image/jpeg',douyin));

let standalone=html
  .replace(/\s*<link rel="manifest"[^>]*>/,'')
  .replace(/\s*<link rel="icon"[^>]*>/,`\n<link rel="icon" href="${dataUri('image/svg+xml',icon)}">`)
  .replace('<link rel="stylesheet" href="./app-final.css">',`<style data-final-module="app-final-css">\n${css}\n</style>`)
  .replace('<script src="./sight-library-v2.js"></script>',`<script data-final-module="sight-library">\n${safeInline(library)}\n</script>`)
  .replace('<script src="./special-tunings-v1.js"></script>',`<script data-final-module="special-tunings">\n${safeInline(tunings)}\n</script>`)
  .replace('<script src="./app-final.js"></script>',`<script data-final-module="app-final">\nwindow.MTU_ACCENT_INLINE_URLS=${JSON.stringify(inlineAccentUrls)};\n${safeInline(embeddedApp)}\n</script>`)
  .replace('<head>',`<head>\n<!-- 音乐工具箱 Ultra v${version.version} 最终单文件版；与 PWA 最终版同源生成。 -->`);

for(const external of ['./app-final.css','./app-final.js','./sight-library-v2.js','./special-tunings-v1.js','./assets/support-alipay.jpg','./assets/support-wechat.jpg','./assets/contact-douyin.jpg']){
  if(standalone.includes(`src="${external}"`)||standalone.includes(`href="${external}"`))throw new Error(`仍有外部核心资源：${external}`);
}
if(!standalone.includes('data:audio/mpeg;base64,'))throw new Error('C01 音频未内嵌');
if((standalone.match(/data:audio\/wav;base64,/g)||[]).length<26)throw new Error('26 个重拍音色未全部内嵌');
if((standalone.match(/data:image\/jpeg;base64,/g)||[]).length<3)throw new Error('赞助或联系图片未全部内嵌');

await fs.writeFile(output,standalone);
console.log(JSON.stringify({output,bytes:Buffer.byteLength(standalone),modules:['index','app-final-css','sight-library','special-tunings','app-final','C01 audio','26 accent sounds','support images']},null,2));
