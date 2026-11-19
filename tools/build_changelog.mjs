import fs from 'node:fs/promises';
const source=new URL('../index.html',import.meta.url),dest=new URL('../CHANGELOG.md',import.meta.url);
const html=await fs.readFile(source,'utf8');
const body=html.match(/<div class="release-list">([\s\S]+?)<\/div><\/details>/)?.[1];
if(!body)throw Error('首页更新列表缺失');
const groups=[...body.matchAll(/<section><h3>([^<]+)<\/h3><ul>([\s\S]+?)<\/ul><\/section>/g)];
const md='# 音乐工具箱 Ultra · 13.5.29\n\n本次从 13.5.28 升级。以下保留 13.5.14 至 13.5.29 的逐版记录。\n\n'+groups.map(([,title,ul])=>'## '+title+'\n\n'+[...ul.matchAll(/<li>([^<]+)<\/li>/g)].map(([,line])=>'- '+line).join('\n')).join('\n\n')+'\n';
await fs.writeFile(dest,md);
