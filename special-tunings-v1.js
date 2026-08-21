/* 音乐工具箱 Ultra · 特殊调弦离线索引 v1
 * 仅保存检索与练习元数据，不分发受版权保护的曲谱或录音。
 * confidence: verified=有公开曲谱/艺人资料交叉核对；reported=公开社区曲谱记录；reference=常见演奏方案。
 */
(() => {
'use strict';

const src={
  gtdb:'https://gtdb.org/',
  hedges:'https://gtdb.org/artists/michael-hedges/16',
  donross:'https://gtdb.org/artists/don-ross/29',
  dufour:'https://gtdb.org/artists/antoine-dufour/30',
  padim:'https://www.danielpadim.com/tabs',
  jaco:'https://www.jacoliumusic.com/about/'
};
const R=(id,artist,artistZh,title,titleZh,tuning,meter='4/4',bpm=[72,96],extra={})=>({id,artist,artistZh,title,titleZh,tuning,meter,bpm,grouping:'',capo:0,category:'六弦木吉他',confidence:'reported',source:src.gtdb,aliases:[],...extra});

const songs=[
  R('misko-thunderstorm','Alexandr Misko','亚历山大·米斯科','Thunderstorm','雷暴',['C#2','G#2','C3','F3','G#3','C4'],'4/4',[76,96],{confidence:'verified',source:'https://gtdb.org/csgscfgsc',aliases:['Misko','米斯科','米斯科雷暴']}),
  R('misko-never-gonna','Alexandr Misko','亚历山大·米斯科','Never Gonna Give You Up','Never Gonna Give You Up 改编',['A#2','F2','F3','F3','G#4','C#5'],'4/4',[104,116],{confidence:'verified',source:'https://gtdb.org/asfffgscs',aliases:['Rickroll','瑞克摇','Misko']}),
  R('misko-lady-steel','Alexandr Misko','亚历山大·米斯科','Lady of Steel','钢铁女士',['F#2','F#2','C#3','E3','A3','B3'],'4/4',[76,104],{confidence:'verified',source:'https://gtdb.org/fsfscseab',aliases:['Misko']}),
  R('misko-late-passenger','Alexandr Misko','亚历山大·米斯科','Late Passenger','迟到的乘客',['D2','F2','A2','E3','A3','C4'],'4/4',[80,112],{confidence:'verified',source:'https://gtdb.org/dfaeac',aliases:['Roundtrip','Misko']}),
  R('misko-forsaken','Alexandr Misko','亚历山大·米斯科','Forsaken','遗弃',['D2','D3','D3','A3','D4','F#4'],'4/4',[68,92],{confidence:'verified',source:'https://gtdb.org/dddadfs',aliases:['Beyond the Box','Misko']}),

  R('marcin-shape','Marcin Patrzałek','马尔钦·帕特扎莱克','Shape of You','Shape of You 指弹改编',['D2','A2','F3','D3','A3','D#4'],'4/4',[92,104],{confidence:'verified',source:'https://gtdb.org/dafdads',aliases:['Marcin','马辛','马尔钦']}),
  R('marcin-asturias','Marcin Patrzałek','马尔钦·帕特扎莱克','Asturias','阿斯图里亚斯',['D2','A2','F3','D3','A3','D4'],'3/4',[96,132],{confidence:'reported',source:'https://gtdb.org/dafdad',aliases:['Marcin','马辛','Leyenda']}),
  R('marcin-still-dre','Marcin Patrzałek','马尔钦·帕特扎莱克','Still D.R.E.','Still D.R.E. 改编',['D2','A2','F3','D3','A3','D4'],'4/4',[88,100],{confidence:'reported',source:'https://gtdb.org/dafdad',aliases:['Marcin','Dr Dre','马辛']}),
  R('marcin-warmup','Marcin Patrzałek','马尔钦·帕特扎莱克','Warm-up / Percussive Study','打击指弹热身',['D2','A2','D3','F3','A3','D4'],'4/4',[72,108],{confidence:'verified',source:'https://www.guitarworld.com/lessons/techniques/marcin-warm-up-techniques',aliases:['Marcin','DADFAD','马尔钦']}),

  R('padim-waiting','Daniel Padim','丹尼尔·帕丁','Waiting For You','等待你',['B1','F#2','C#3','F#3','B3','F#4'],'4/4',[68,92],{confidence:'verified',source:'https://gtdb.org/artists/daniel-padim/3733',aliases:['Daniel Pandim','Padim','Pandim','丹尼尔']}),
  R('padim-sky','Daniel Padim','丹尼尔·帕丁','A Sky Full of Stars','满天星',['B1','F#2','C#3','F#3','B3','A#4'],'4/4',[116,128],{confidence:'verified',source:'https://gtdb.org/bfscsfsbas',aliases:['Coldplay','Daniel Pandim','Padim']}),
  R('padim-yellow','Daniel Padim','丹尼尔·帕丁','Yellow','Yellow 指弹改编',['E2','A2','D3','G3','B3','E4'],'4/4',[82,92],{capo:4,confidence:'verified',source:'https://www.songsterr.com/a/wsa/daniel-padim-yellow-tab-s571254',aliases:['Coldplay','Daniel Pandim']}),

  R('gomm-passionflower','Jon Gomm','乔恩·戈姆','Passionflower','西番莲',['B1','F#2','B2','F#3','B3','D#4'],'4/4',[80,112],{confidence:'reported',source:'https://gtdb.org/',aliases:['宗克','Jon Gomm','Gomm']}),
  R('gomm-deep-sea','Jon Gomm','乔恩·戈姆','Deep Sea Fishes','深海鱼',['A1','E2','C#3','E3','G#3','B3'],'4/4',[72,104],{confidence:'verified',source:'https://gtdb.org/aecsegsb',aliases:['宗克','Gomm']}),
  R('gomm-aint-nobody','Jon Gomm','乔恩·戈姆','Ain’t Nobody','Ain’t Nobody 改编',['C2','F2','C3','F3','G#3','C4'],'4/4',[92,108],{confidence:'verified',source:'https://gtdb.org/cfcfgsc',aliases:["Ain't Nobody",'宗克','Gomm']}),
  R('gomm-aecegc','Jon Gomm','乔恩·戈姆','Open A minor Study','A 小调开放指弹',['A1','E2','C3','E3','G3','C4'],'4/4',[64,92],{confidence:'verified',source:'https://gtdb.org/aecegc',aliases:['宗克','Gomm']}),

  R('mckee-rylynn','Andy McKee','安迪·麦基','Rylynn','莱琳',['E2','C3','D3','G3','A3','D4'],'4/4',[78,92],{confidence:'verified',source:'https://gtdb.org/ecdgad',aliases:['Andy Mckee','麦基']}),
  R('mckee-drifting','Andy McKee','安迪·麦基','Drifting','漂流',['D2','A2','D3','G3','A3','D4'],'4/4',[96,116],{confidence:'reference',source:'https://gtdb.org/',aliases:['Andy Mckee','麦基']}),
  R('mckee-shanghai','Andy McKee','安迪·麦基','The Tuning From Shanghai','上海调弦',['E2','B2','D3','G3','B3','D4'],'4/4',[70,96],{confidence:'verified',source:'https://gtdb.org/ebdgbd',aliases:['Shanghai','Andy Mckee','麦基']}),
  R('mckee-dependent','Andy McKee','安迪·麦基','Dependent Arising','缘起',['A1','E2','G2','C3','B3','D4'],'4/4',[64,92],{confidence:'verified',source:'https://gtdb.org/aegcbd',aliases:['Andy Mckee','麦基']}),
  R('mckee-joyland','Andy McKee','安迪·麦基','Joyland','欢乐世界',['D2','A2','D3','A3','E4','C#5'],'4/4',[92,120],{confidence:'reported',source:'https://gtdb.org/dadaecs/videos/0URXuFjbP8w',aliases:['Andy Mckee','麦基']}),
  R('mckee-hunters-moon','Andy McKee','安迪·麦基','Hunter’s Moon','猎人之月',['C2','G2','D3','F3','A3','D4'],'4/4',[72,104],{confidence:'reported',source:'https://gtdb.org/cgdfsad/videos/4dEgxaN9J6g',aliases:["Hunter's Moon",'Andy Mckee']}),

  R('hedges-aerial','Michael Hedges','迈克尔·赫奇斯','Aerial Boundaries','空中边界',['C2','C3','D3','G3','A3','D4'],'4/4',[72,96],{confidence:'verified',source:'https://gtdb.org/ccdgad',aliases:['Hedges','赫奇斯']}),
  R('hedges-baby-toes','Michael Hedges','迈克尔·赫奇斯','Baby Toes','Baby Toes',['D2','A2','D3','G3','C4','D4'],'4/4',[72,100],{confidence:'verified',source:src.hedges,aliases:['Hedges']}),
  R('hedges-bensusan','Michael Hedges','迈克尔·赫奇斯','Bensusan','Bensusan',['C2','G2','D3','G3','A3','C4'],'4/4',[72,104],{confidence:'verified',source:src.hedges,aliases:['Hedges','Pierre Bensusan']}),
  R('hedges-magic-farmer','Michael Hedges','迈克尔·赫奇斯','Magic Farmer','魔法农夫',['C2','F2','C3','G3','A3','E4'],'4/4',[88,116],{confidence:'verified',source:src.hedges,aliases:['Hedges']}),
  R('hedges-naked-stalk','Michael Hedges','迈克尔·赫奇斯','Naked Stalk','Naked Stalk',['D2','A2','D3','E3','A3','B3'],'4/4',[72,104],{confidence:'verified',source:src.hedges,aliases:['Hedges']}),
  R('hedges-rickover','Michael Hedges','迈克尔·赫奇斯','Rickover’s Dream','里科弗之梦',['C2','G2','D3','G3','B3','C4'],'4/4',[76,104],{confidence:'verified',source:src.hedges,aliases:["Rickovers Dream",'Hedges']}),
  R('hedges-ritual','Michael Hedges','迈克尔·赫奇斯','Ritual Dance','仪式之舞',['D2','A2','D3','G3','C4','C4'],'4/4',[96,124],{confidence:'verified',source:src.hedges,aliases:['Hedges']}),
  R('hedges-watchtower','Michael Hedges','迈克尔·赫奇斯','All Along the Watchtower','沿着瞭望塔',['D2','A2','E3','E3','A3','A3'],'4/4',[104,124],{confidence:'verified',source:'https://gtdb.org/daeeaa/artists/michael-hedges-tuning/259/tab/609',aliases:['Hedges','Dylan','Hendrix']}),

  R('dufour-ashes','Antoine Dufour','安托万·迪富尔','Ashes in the Sea','海中灰烬',['D2','A2','E3','F3','C4','E4'],'4/4',[68,96],{confidence:'verified',source:src.dufour,aliases:['Dufour','迪富尔']}),
  R('dufour-catching','Antoine Dufour','安托万·迪富尔','Catching the Light','捕捉光线',['D2','A2','C#3','E3','B3','E4'],'4/4',[72,100],{confidence:'verified',source:src.dufour,aliases:['Dufour','迪富尔']}),

  R('ross-colour-blue','Don Ross','唐·罗斯','Any Colour But Blue','除了蓝色的任何颜色',['D2','A2','E3','F#3','A3','E4'],'4/4',[88,116],{confidence:'verified',source:src.donross,aliases:['Don Ross','罗斯']}),
  R('ross-berkeley','Don Ross','唐·罗斯','Berkeley Springs','伯克利泉',['F2','A2','C3','F3','C4','F4'],'4/4',[84,112],{confidence:'verified',source:src.donross,aliases:['Berkerly Springs','罗斯']}),
  R('ross-cold','Don Ross','唐·罗斯','In From the Cold','从寒冷中来',['C2','G2','D3','G3','B3','C4'],'4/4',[76,104],{confidence:'verified',source:src.donross,aliases:['罗斯']}),
  R('ross-first-ride','Don Ross','唐·罗斯','The First Ride','第一次骑行',['F2','A2','C3','G3','C4','E4'],'4/4',[92,120],{confidence:'verified',source:src.donross,aliases:['罗斯']}),
  R('ross-thin-air','Don Ross','唐·罗斯','Thin Air','稀薄空气',['D2','A2','D3','E3','A3','E4'],'4/4',[76,104],{confidence:'verified',source:src.donross,aliases:['罗斯']}),

  R('sungha-rainy','Sungha Jung','郑成河','Rainy Day','雨天',['D2','G2','C3','F3','G3','C4'],'4/4',[68,92],{confidence:'reported',source:'https://gtdb.org/dgcfgc/videos/CQ0KDAvXCRE',aliases:['宗克','郑晟河','Sungha','Jung']}),
  R('sungha-winner','Sungha Jung','郑成河','The Winner Takes It All','胜者为王',['F2','G2','D3','G3','A#3','D4'],'4/4',[72,96],{confidence:'verified',source:'https://gtdb.org/fgdgasd',aliases:['宗克','Sungha','ABBA']}),
  R('sungha-neon','Sungha Jung','郑成河','Neon','Neon 改编',['C2','A2','D3','G3','C4','F4'],'4/4',[92,108],{confidence:'verified',source:'https://gtdb.org/video/_qJjM7ZoSuk',aliases:['宗克','Sungha','John Mayer']}),
  R('sungha-perfect','Sungha Jung','郑成河','Perfect','Perfect 改编',['F#2','A2','E3','A3','A3','F#4'],'3/4',[56,72],{confidence:'reported',source:'https://gtdb.org/fsaeaafs/videos/MD0Y65JmF_Q',aliases:['宗克','Sungha','Ed Sheeran']}),

  R('kotaro-wings','Kotaro Oshio','押尾光太郎','Brand New Wings','Brand New Wings',['C#2','G#2','E3','F#3','B3','E4'],'4/4',[92,120],{confidence:'verified',source:'https://gtdb.org/csgsefsbe',aliases:['押尾','Kotaro','Oshio']}),
  R('kotaro-cgdgbd','Kotaro Oshio','押尾光太郎','CGDGBD Medley','CGDGBD 组曲',['C2','G2','D3','G3','B3','D4'],'4/4',[76,116],{confidence:'reported',source:'https://gtdb.org/dgdfsasds/videos/28AzZzlv_7A',aliases:['押尾','Kotaro']}),
  R('kotaro-hard-rain','Kotaro Oshio','押尾光太郎','Hard Rain','Hard Rain',['C2','G2','E3','F3','B3','E4'],'4/4',[104,132],{confidence:'reported',source:'https://gtdb.org/video/SOassHOkvNE',aliases:['押尾','Kotaro']}),
  R('kotaro-last-christmas','Kotaro Oshio','押尾光太郎','Last Christmas','Last Christmas 改编',['E2','A2','E3','G3','B3','D4'],'4/4',[92,116],{confidence:'reported',source:'https://gtdb.org/eaegbd',aliases:['押尾','Kotaro','Wham']}),

  R('stricagnoli-gorillaz','Luca Stricagnoli','卢卡·斯特里卡尼奥利','Feel Good Inc.','Gorillaz 改编',['D2','F2','D3','F3','C4','D4'],'4/4',[124,140],{confidence:'reported',source:'https://gtdb.org/guitar-tuner/fcfascf?page=244',aliases:['Luca','Gorillaz','卢卡']}),
  R('stricagnoli-dollars','Luca Stricagnoli','卢卡·斯特里卡尼奥利','For a Few Dollars More','黄昏双镖客',['C2','A2','D3','G3','A3','D4'],'4/4',[88,112],{confidence:'reported',source:'https://www.gtdb.org/cadgad/videos/OB_tVv18Zhw',aliases:['Luca','Morricone','卢卡']}),
  R('stricagnoli-iron','Luca Stricagnoli','卢卡·斯特里卡尼奥利','Iron Maiden Medley','铁娘子组曲',['D1','A1','D2','A2','D3','G3','B3','E4'],'4/4',[120,152],{category:'多颈／八弦参考',confidence:'reported',source:'https://gtdb.org/dadadgbe',aliases:['Luca','Triple Neck','卢卡']}),

  R('page-rain-song','Jimmy Page','吉米·佩奇','The Rain Song','雨之歌',['D2','G2','C3','G3','C4','D4'],'4/4',[72,92],{confidence:'reference',aliases:['Led Zeppelin','齐柏林飞艇']}),
  R('page-kashmir','Jimmy Page','吉米·佩奇','Kashmir','克什米尔',['D2','A2','D3','G3','A3','D4'],'3/4',[76,88],{confidence:'reference',aliases:['Led Zeppelin','齐柏林飞艇']}),
  R('page-bron','Jimmy Page','吉米·佩奇','Bron-Yr-Aur','Bron-Yr-Aur',['C2','A2','C3','G3','C4','E4'],'4/4',[72,100],{confidence:'reference',aliases:['Led Zeppelin','齐柏林飞艇']}),
  R('drake-pink-moon','Nick Drake','尼克·德雷克','Pink Moon','粉红月亮',['C2','G2','C3','F3','C4','E4'],'4/4',[72,92],{confidence:'reference',aliases:['尼克德雷克']}),
  R('goo-iris','Goo Goo Dolls','咕咕玩偶','Iris','Iris',['B1','D2','D3','D3','D4','D4'],'6/8',[72,92],{grouping:'3+3',category:'弹唱／十二弦参考',confidence:'verified',source:'https://gtdb.org/bddddd',aliases:['Iris tuning']}),
  R('benhoward-oldpine','Ben Howard','本·霍华德','Old Pine','老松树',['C2','G2','C3','G3','G3','C4'],'4/4',[84,104],{confidence:'reference',aliases:['本霍华德']}),
  R('bensusan-so-long','Pierre Bensusan','皮埃尔·本苏珊','So Long Michael','再见迈克尔',['D2','A2','D3','G3','A3','D4'],'4/4',[72,104],{confidence:'reported',source:'https://gtdb.org/dadfsab/videos/HUA6t9swkVo',aliases:['DADGAD','本苏珊']}),
  R('jaco-jing','Jaco Liu','刘嘉卓','Jing','境',['D2','A2','D3','G3','A3','D4'],'4/4',[64,92],{confidence:'reference',source:'https://www.guitarworld.com.cn/pu/q71477',aliases:['刘家卓','Liu Jiazhuo','LJZ','嘉卓'],note:'公开页面确认使用特殊调弦，但未公开完整定弦；当前提供常用 DADGAD 练习参考，请以作者曲谱为准。'}),
  R('jaco-mission','Jaco Liu','刘嘉卓','Mission: Impossible','碟中谍改编',['D2','A2','D3','G3','A3','D4'],'5/4',[92,116],{grouping:'3+2',confidence:'reference',source:src.jaco,aliases:['刘家卓','Liu Jiazhuo','LJZ','不可能的任务'],note:'拍号与速度为练习参考；具体调弦请以刘嘉卓正式曲谱或教学为准。'})
];

const guides=[
  ['guide-drop-d','Drop D / 降 D',['D2','A2','D3','G3','B3','E4'],'4/4',[60,140]],
  ['guide-double-drop-d','Double Drop D / 双降 D',['D2','A2','D3','G3','B3','D4'],'4/4',[60,132]],
  ['guide-dadgad','DADGAD / D 模态',['D2','A2','D3','G3','A3','D4'],'4/4',[56,140]],
  ['guide-open-d','Open D / 开放 D',['D2','A2','D3','F#3','A3','D4'],'4/4',[56,132]],
  ['guide-open-dm','Open Dm / 开放 D 小调',['D2','A2','D3','F3','A3','D4'],'4/4',[56,124]],
  ['guide-open-e','Open E / 开放 E',['E2','B2','E3','G#3','B3','E4'],'4/4',[64,140]],
  ['guide-open-g','Open G / 开放 G',['D2','G2','D3','G3','B3','D4'],'4/4',[60,132]],
  ['guide-open-c','Open C / 开放 C',['C2','G2','C3','G3','C4','E4'],'4/4',[52,124]],
  ['guide-open-cm','Open Cm / 开放 C 小调',['C2','G2','C3','G3','C4','D#4'],'4/4',[52,116]],
  ['guide-open-a','Open A / 开放 A',['E2','A2','C#3','E3','A3','E4'],'4/4',[64,136]],
  ['guide-open-am','Open Am / 开放 A 小调',['E2','A2','C3','E3','A3','E4'],'4/4',[56,124]],
  ['guide-open-b','Open B / 开放 B',['B1','F#2','B2','F#3','B3','D#4'],'4/4',[60,132]],
  ['guide-cgdgbd','Open G/C add4',['C2','G2','D3','G3','B3','D4'],'4/4',[56,124]],
  ['guide-facgce','FACGCE / Fmaj9',['F2','A2','C3','G3','C4','E4'],'4/4',[56,120]],
  ['guide-daeacse','DAEAC#E / Open A add4',['D2','A2','E3','A3','C#4','E4'],'4/4',[56,124]],
  ['guide-cgcggc','CGCGGC / C5 drone',['C2','G2','C3','G3','G3','C4'],'4/4',[52,120]],
  ['guide-dgdgbd','Open G 低音 G',['D2','G2','D3','G3','B3','D4'],'4/4',[56,128]],
  ['guide-d-standard','D Standard / 全弦降全音',['D2','G2','C3','F3','A3','D4'],'4/4',[60,144]],
  ['guide-eb-standard','E♭ Standard / 全弦降半音',['D#2','G#2','C#3','F#3','A#3','D#4'],'4/4',[60,148]],
  ['guide-drop-c','Drop C',['C2','G2','C3','F3','A3','D4'],'4/4',[60,148]],
  ['guide-new-standard','New Standard Tuning',['C2','G2','D3','A3','E4','G4'],'4/4',[52,120]],
  ['guide-all-fourths','All Fourths / 全四度',['E2','A2','D3','G3','C4','F4'],'4/4',[60,132]],
  ['guide-nashville','Nashville High-Strung',['E3','A3','D4','G4','B3','E4'],'4/4',[72,144]],
  ['guide-12-string-standard','12-string Standard',['E2','E3','A2','A3','D3','D4','G3','G4','B3','B3','E4','E4'],'4/4',[60,140]],
  ['guide-12-string-dadgad','12-string DADGAD',['D2','D3','A2','A3','D3','D4','G3','G4','A3','A3','D4','D4'],'4/4',[56,128]],
  ['guide-open-g-6-8','Open G · 6/8 练习',['D2','G2','D3','G3','B3','D4'],'6/8',[48,108],'3+3'],
  ['guide-dadgad-7-8','DADGAD · 7/8 练习',['D2','A2','D3','G3','A3','D4'],'7/8',[56,112],'2+2+3'],
  ['guide-open-d-5-4','Open D · 5/4 练习',['D2','A2','D3','F#3','A3','D4'],'5/4',[52,108],'3+2']
].map(([id,title,tuning,meter,bpm,grouping=''])=>R(id,'Tuning Reference','常用特殊调弦',title,titleZh(title),tuning,meter,bpm,{grouping,confidence:'reference',source:src.gtdb,category:tuning.length===12?'十二弦':'调弦方案',aliases:['特殊调弦','开放调弦','Alternate Tuning'],note:'速度为安全、实用的练习区间，不代表某一录音的原速。'}));

function titleZh(value){return value.includes('/')?value.split('/')[1].trim():value;}
window.SPECIAL_TUNINGS_V1={version:'1.1.0',updated:'2026-08-20',records:[...songs,...guides],sources:src,notice:'调弦资料来自公开艺人页、公开曲谱索引与常见调弦方案。标为“参考”的条目请以作者正式曲谱为准；练习速度区间不是版权曲谱。'};
})();
