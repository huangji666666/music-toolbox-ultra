import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'release-assets.json');
const mode=process.argv.includes('--check')?'check':'write';
const relative=file=>`./${path.relative(root,file).split(path.sep).join('/')}`;
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

async function walk(directory){
    const result=[];
    for(const entry of await fs.readdir(directory,{withFileTypes:true})){
        const target=path.join(directory,entry.name);
        if(entry.isDirectory())result.push(...await walk(target));
        else if(entry.isFile())result.push(target);
    }
    return result;
}

const html=await fs.readFile(path.join(root,'index.html'),'utf8');
const linked=[...html.matchAll(/(?:src|href)=["'](\.\/[^"'#?]+)["']/g)].map(match=>match[1]);
const core=['./index.html','./manifest.webmanifest','./version.json',...linked];
const folders=['assets','icons','licenses'];
const folderFiles=(await Promise.all(folders.map(name=>walk(path.join(root,name))))).flat().map(relative);
const urls=[...new Set([...core,...folderFiles])].sort();
const assets=[];
for(const url of urls){
    const file=path.join(root,url.slice(2));
    const bytes=await fs.readFile(file);
    if(!bytes.length)throw new Error(`空文件：${url}`);
    assets.push({url,bytes:bytes.length,sha256:sha256(bytes)});
}
const version=JSON.parse(await fs.readFile(path.join(root,'version.json'),'utf8'));
const manifest={schema:1,version:version.version,build:version.build,cache:version.cache,generatedAt:'2026-09-17T00:00:00.000Z',assets};
const serialized=JSON.stringify(manifest,null,2)+'\n';

if(mode==='check'){
    const current=await fs.readFile(output,'utf8');
    if(current!==serialized)throw new Error('release-assets.json 与当前发布文件不一致，请先运行 node tools/build_release.mjs');
    console.log(`发布清单校验通过：${assets.length} 个文件`);
}else{
    await fs.writeFile(output,serialized);
    console.log(`已生成 ${path.relative(root,output)}：${assets.length} 个文件`);
}
