/* Offline learning cards. Each entry carries its scene, lesson and executable exercise. */
(() => {
  'use strict';
  const scenes = {tuner:'调音器',metro:'节拍器',chord:'和弦',instrument:'乐器',ear:'练耳',practice:'视唱',theory:'乐理',circle:'五度圈',settings:'设置'};
  const items = [];
  const add = (scene, title, text, lesson, action, notes, source) => items.push({scene,title,text,lesson,action,notes,source,id:`${scene}/${title}`});
  const pitch = ['频率与音高 · OpenStax','https://openstax.org/books/contemporary-mathematics/pages/13-4-math-and-music'];
  const circle = ['调性与五度圈 · OpenLearn','https://www.open.edu/openlearn/history-the-arts/music/an-introduction-music-theory/content-section-6.5'];
  const guitar = ['指板五形 · Yamaha','https://hub.yamaha.com/guitars/g-how-to/using-the-caged-system/'];
  const lessons = [
    ['tuner','八度和频率','A3 为 220 Hz 时，高一个八度的 A4 为 440 Hz。先确认八度，再调音分。',[0,0],'keys',[57,69],pitch],
    ['tuner','半音与品位','同一弦从第五品移到第六品，在十二平均律中升高一个半音。',[0,1],'keys',[57,58],pitch],
    ['tuner','标准六弦','从最粗到最细依次是 E2、A2、D3、G3、B3、E4。两端都是 E，相差两个八度。',[0,0],'keys',[40,45,50,55,59,64]],
    ['tuner','Drop D','标准吉他的六弦由 E2 降到 D2，其他五弦保留。先听 D2，再与四弦 D3 对八度。',[0,0],'search',[38,50]],
    ['tuner','全夹二品','全夹二品时，C 大三和弦指型实际发出 D 大三和弦；小三和弦指型仍保留小三和弦性质。',[3,0],'capo',[62,66,69]],
    ['tuner','识别延音','单独拨响一根弦，等起音过去再读音分。其他弦的共振可能让目标音来回切换。',[0,0],'keys'],
    ['metro','Swing 的长短','在相同 BPM 下交替听直八分与 Swing。前一个音拉长，下一主拍的位置仍然相同。',[1,2],'swing'],
    ['metro','二四拍重音','四拍子里数一二三四，只在二和四拍手，脚继续保持四个等距主拍。',[1,0],'backbeat'],
    ['metro','力度与音色','让四拍都用同一个音色，只加大首拍力度，就能单独听出强弱的效果。',[1,0],'dynamics'],
    ['metro','切分与休止','先在整拍发声，再把强音挪到两个主拍之间；听一听旋律如何牵引下一拍。',[1,2],'grid'],
    ['metro','速度的单位','2/2 的主拍是二分音符。以 120 BPM 计主拍时，每一下仍相隔半秒。',[1,0],'meter22'],
    ['metro','七拍的分组','连续数 2＋2＋3，在每组的第一个音稍加重，七个脉冲仍然等距。',[1,0],'seven'],
    ['metro','渐速前先稳定','选一段连续八分音符，在能准确落拍的速度循环两遍，再开始渐速。',[1,1],'ramp'],
    ['metro','看一小节','关掉可视化里的声音，看分拍标记走一整圈，在下一次首拍开口数一。',[1,0],'visual'],
    ['instrument','五形连成指板','选同一个根音，依次查看 C、A、G、E、D 形里根音的位置，再连起相邻把位。',[3,0],'chordShape',null,guitar],
    ['instrument','小调五声音阶','从 A 开始弹 A、C、D、E、G。换把位以后，用根音 A 找回方向。',[2,3],'pentatonic',[57,60,62,64,67,69]],
    ['instrument','蓝调音','在 A 小调五声音阶的 D 与 E 之间加入 E♭，先听连续三个半音位置的摩擦和解决。',[2,3],'blues',[62,63,64]],
    ['instrument','三和弦琶音','把同一和弦的音分开弹响。用 C、E、G 上行，再倒着回到 C。',[3,0],'arp',[60,64,67,64,60]],
    ['ear','同时还是先后','先后播放 C 与 G 可以追踪旋律距离，同时播放可以听到纯五度的融合感。',[5,0],'harmonic',[60,67]],
    ['ear','比较三音','同样以 C 为根，比较 E 与 E♭。大、小三和弦的区别只需改变这个音。',[3,0],'triad',[60,64,67,60,63,67]],
    ['ear','七音离根音多远','B 距离上方 C 只有半音，B♭ 距它一个全音。先唱出这两个距离，再听大七与属七。',[3,1],'seventh',[71,72,70,72]],
    ['ear','旋律音程','听完两个连续音，先哼第二个音，再回唱第一个音，检查方向和距离。',[5,0],'melodic',[64,60]],
    ['practice','遇到休止符','休止期间脚继续打拍。下一个音的进入位置也属于这句旋律。',[1,1],'score'],
    ['practice','附点时值','附点把原音符延长一半。用四分音符为一拍时，附点四分音符占一拍半。',[1,2],'score'],
    ['practice','先认谱号','中央 C 在高音谱表的下加一线。找到它，再按线间顺序读相邻音。',[0,2],'score',[60,62,64]],
    ['practice','三连音','在一拍中平均唱三个八分三连音，第三个音之后的下一拍仍准时落下。',[1,2],'score'],
    ['circle','属到主','在 C 大调听 G7 回 C。试着跟唱 B 上行到 C，再听 F 下行到 E。',[4,0],'circleC',[71,72,65,64],circle],
    ['circle','相邻调号','从 C 大调顺五度到 G 大调，调号增加 F♯；再走到 D 大调，还会增加 C♯。',[4,0],'circleG',[60,67,74],circle],
    ['circle','关系小调','C 大调与 A 自然小调共用一组音。分别落在 C 与 A，听中心音怎样改变。',[4,0],'circleAm',[60,64,67,69,72,76],circle],
    ['chord','最低音','比较 C–E–G 和 E–G–C。音级集合相同，第二种由三音担当最低音。',[3,0],'triad',[60,64,67,64,67,72]],
    ['chord','挂四解决','在 Csus4 里 F 取代 E。先让 F 下行到 E，再听整个和弦的变化。',[3,0],'chordShape',[65,64]],
    ['theory','谁在低声部','大三和弦的第一转位把三音放在最低声部。依次听 C、E、G 和 E、G、C。',[3,0],'triad',[60,64,67,64,67,72]],
    ['theory','同音的两种写法','钢琴上的 A♯ 和 B♭ 对应同一键。谱子选用什么名称，要看音阶和和声上下文。',[0,1],'keys',[70]],
    ['theory','自然半音','钢琴白键中 E 到 F、B 到 C 相距半音。按 E、F、G，比较两段距离。',[0,1],'keys',[64,65,67],pitch],
    ['settings','离线使用','设置里的版本号对应当前网页。单文件内含音频，安装版会为首次完整离线准备资源。',[0,0],'updates'],
    ['settings','输入设备','调音读数来自输入设备。使用外接麦克风后，可在调音器查看检测方式与设备。',[0,0],'devices']
  ];
  lessons.forEach(row=>add(...row));
  const berkScale=['课程主题：Berklee · Guitar Scales 101','https://online.berklee.edu/courses/guitar-scales-101'],berkImprov=['课程主题：Berklee · Guitar Improvisation Techniques','https://online.berklee.edu/courses/guitar-improvisation-techniques'],berkRhythm=['概念：Berklee · Two Cool Rhythmic Devices','https://college.berklee.edu/bt/212/lesson.html'];
  const studies=[
    ['scale','大调阶梯','C 大调相邻两音的距离依次是全、全、半、全、全、全、半。先弹 E–F，再弹 F–G，手和耳朵一起比较。',0],['naturalMinor','小调的第六音','A 自然小调有 F，没有 F♯。在同一根弦上弹 E、F、G，听半音出现在哪里。',9],['majorPent','给旋律留空间','C 大调五声只用 C、D、E、G、A。与完整大调相比少了 F 和 B，试着只用这五个音回答一句旋律。',0],['pentatonic','同一组音，两个中心','C 大调五声和 A 小调五声使用同五个音。让第一句落在 C，第二句落在 A，听哪里更像终点。',9],['blues','蓝音是经过音的一种选择','从 D 滑向 E 时穿过 E♭。先把中间音停长，再一带而过，比较两种张力。',9],['dorian','多利亚的自然六级','D 多利亚里是 B，不是 B♭。在 D、F、A 的稳定音之间试着经过 B。',2],['phrygian','弗里吉亚的半音邻音','在 E 弗里吉亚里，F 紧挨着主音 E。先唱 F 再落到 E，记住这个距离。',4],['lydian','利底亚的升四级','在 F 利底亚里，B 到 C 只差一个半音。用 B 作短暂的停留，再落到 C。',5],['mixolydian','属七与降七级','G 混合利底亚有 F；G7 的四个音是 G、B、D、F。先只弹这四个，再在中间加音阶音。',7],['locrian','减五度的位置','B 洛克里亚的第五级是 F，而不是 F♯。在一根弦上数六个半音，再在相邻弦找同一个音。',11],['harmonicMinor','小调里的导音','A 和声小调把 G 提高到 G♯。单独慢弹 G♯–A，听最后半音的方向。',9],['melodicMinor','两种旋律小调惯例','这里选爵士用法：A、B、C、D、E、F♯、G♯，下行也保留升高的第六、七级。',9],['arp','先看三和弦骨架','把 C、E、G 分开弹，变换先后顺序。这三个音能当旋律的落点，不必每句都落在根音。',0],['maj7','把第七音唱准','在 Cmaj7 上先唱 B，再唱上方的 C。大七度是离下一个八度只差半音的位置。',0],['min7','小七和弦落点','Dm7 有 D、F、A、C。先弹短句，最后分别落在 F 与 C 上，比较不用根音时的感觉。',2],['seventh','属七的两条线','G7 的 B 可上行到 C，F 可下行到 E。先用两根弦唱出这两条线，再连上整个和弦。',7]
  ];
  studies.forEach(([layer,title,text,key])=>{add('instrument',title,text,[2,0],'board',null,berkScale);Object.assign(items.at(-1),{layer,key});});
  const fundamentals=['主题参考：Berklee · Guitar Fundamentals','https://online.berklee.edu/courses/guitar-fundamentals'];
  for(const [title,text,action] of [
    ['交替低音','左手先按住一个 C 和弦，拇指只在五弦和四弦之间轮换。等这两下均匀，再加高音。','chordShape'],['拇指是低音，不是重音','同一组分解和弦弹两次。一次突出低音，另一次突出最高音；节拍保持不变。','arp'],['辨认右手指号','常见指弹谱中 p、i、m、a 分别指拇指、食指、中指、无名指。把右手指号和左手品位分开读。','arp'],['让旋律浮出来','弹一个分解和弦，只把最高音弹得稍响。录下来听：你能不看谱就哼出高音线吗？','arp'],['同拍与分拨','用拇指和无名指同时拨低音和高音，再改为先低后高。音高不变，听起音怎样改变。','arp'],['不要误消掉延音','让开放的一弦持续响，再在二弦上换音。若高音随之中断，检查左手是否碰到了邻弦。','chordShape'],['留住共同音','在两个和弦里各找一个相同的音。换和弦时让这个音继续响，再听其他声部怎样移动。','chordShape'],['低声部先写','先在实琴上循环 C、A、F、G 四个低音。再给每个低音配一个高音，而不是一开始就填满六根弦。','arp'],['用同音换弦','标准吉他的二弦五品与一弦空弦都是 E4。选择哪根弦会改变余音、手感和下一个动作。','chordShape'],['指弹不是固定分工','拇指多照顾低音弦，但旋律、速度和弦序都会改变右手分工。以不断拍、音色可控为检验标准。','arp'],['先练跨弦再加速','每次从低弦跳到高弦时先慢一点，保持两音的时距相等，再逐步缩短间隔。','pentatonic'],['同一句换把位','先在一个把位弹出完整短句，再用另一组弦弹同一旋律。比较手移动的距离和音色。','pentatonic']
  ])add('instrument',title,text,[3,0],action,null,fundamentals);
  [ ['只改最后一音','保持短句前半的音和节奏不动，第二遍改最后一个音，听两句是否还有亲缘感。',1],['问与答','弹三个短音后空一拍。回答句沿用相同的节奏，结尾回到根音。',0],['给落点留时间','先唱出要到达的音，再用旁边的一个音靠近它。稳定的落点比多弹几个音更容易听清。',2],['用三度走把位','按音阶级数弹 1、3、2、4、3、5。耳朵跟随方向，而不只是记住手指顺序。',3],['休止也是乐句的一部分','给一个两音动机留出整拍空白，再重复。把脚下的拍子和手上的休止分开。',4],['把动机搬高','把 1、2、3 换成 2、3、4。保持各音时值，再比较两句的方向和落点。',5] ].forEach(([title,text,task])=>{add('instrument',title,text,[2,3],'improv',null,berkImprov);Object.assign(items.at(-1),{layer:'pentatonic',key:9,task});});
  for(const [string,open] of [40,45,50,55,59,64].entries())for(const fret of [3,5,7,9,12]){
    const pc=(open+fret)%12;add('instrument',`指板定位 · ${6-string} 弦 ${fret} 品`,`在标准六弦吉他上，${6-string} 弦空弦为 ${midiToName(open)}。先猜第 ${fret} 品的音，再听 ${midiToName(open+fret)} 核对。同音名还可以出现在哪根弦上？`,[0,1],'locate',[open,open+fret]);Object.assign(items.at(-1),{key:pc,fret});
  }
  for(const [title,text,action] of [ ['错开半拍','四拍都用脚踩稳，把原来落在一的重音移到“一、和”的“和”上。','grid'],['二和四','口数一二三四，手只在二、四拍响。不要为了等手拍而减慢脚步。','backbeat'],['休止后的落点','让第三拍不出声，人继续数拍；第四拍重新进入时须与计时一致。','grid'],['分组不是变速','7/8 的 2＋2＋3 划分改变重音位置，七个八分脉冲的间距不变。','seven'],['弱起不是加拍','从小节尾开始唱短句，第一拍仍在原来的位置。先数完整小节再进入。','grid'],['让一个音跨过强拍','弱拍起音并延续到下一强拍，不重新拨弦。延音也能制造切分感。','grid'],['重音与音高无关','同一个音不换音高，第二次弹得更响，力度重音依然很清楚。','dynamics'],['循序加速','同一短句连续两遍都能均匀落拍，再增加少量速度；开始抢拍就退回。','ramp'] ])add('metro',title,text,[1,2],action,null,berkRhythm);
  for(const type of ProgressionTraining.types){
    add('chord',`听辨${type.name}`,`以 C 为根音，${type.name}的一种排列距离根音 ${type.intervals.join('、')} 个半音。听完后试唱最高音。`,[3,type.family==='七和弦'?1:0],type.family==='七和弦'?'seventh':'chordLab',type.intervals.map(n=>60+n));
  }
  for(const template of ProgressionTraining.templates){
    const reader=Object.create(ProgressionTraining);reader.selection=new Set(reader.types.map(type=>type.id));reader.secondary=true;reader.borrowed=true;
    const mode=template.mode==='minor'?'Natural Minor':template.mode==='modal'?'Dorian':'Major';
    const example=reader.build(template,mode,0);if(!example)continue;
    const scene=template.mode==='modal'?'ear':template.family.includes('爵士')||template.family.includes('借用')?'circle':'theory';
    add(scene,template.name,`${example.chords.map(chord=>chord.name).join(' → ')}。先唱这一进行的根音线，再听完整和声。`,[3,2],'progression',example.chords.map(chord=>chord.notes[0]));
    Object.assign(items.at(-1),{template:template.id,mode,types:[...new Set(example.chords.map(chord=>chord.type))]});
  }
  const intervals=['纯一度','小二度','大二度','小三度','大三度','纯四度','三全音','纯五度','小六度','大六度','小七度','大七度','纯八度'];
  intervals.forEach((name,n)=>add('ear',`听${name}`,`从 C4 开始，两个音相距 ${n} 个半音。先后听一遍，再同时听，比较两种听法。`,[5,0],'harmonic',[60,60+n]));
  for(const piece of SightCurriculum.catalog.filter(p=>p.sourceUrl&&p.id.startsWith('cc0-osl-'))){
    const phrase=piece.phrases[0],sounding=phrase.filter(([pitch,,rest])=>pitch!=null&&!rest);if(!sounding.length)continue;
    const preview=sounding.slice(0,4).map(([interval])=>60+piece.root+interval);
    const range=Math.max(...sounding.map(n=>n[0]))-Math.min(...sounding.map(n=>n[0]));
    add('practice',piece.title.split(' · ')[0],`《${piece.title.split(' · ')[0]}》选段为 ${piece.meter}。第一句有 ${sounding.length} 次音符起音，最低音与最高音相距 ${range} 个半音。先听开头，再打开谱面唱这句。`,[0,2],'repertoire',preview,[piece.source,piece.sourceUrl]);
    const item=items.at(-1);item.piece=piece;item.id=piece.id;
  }
  for(const record of SpecialTuningSearch.records){
    if(record.confidence!=='verified'||!record.source||!Array.isArray(record.tuning))continue;
    add('tuner',`${record.artist} · ${record.title}`,`这条曲目记录的目标弦音为 ${record.tuning.join(' · ')}。打开搜索可对照弦序和来源。`,[0,0],'search',null,['曲目资料',record.source]);
    items.at(-1).query=record.title;
  }
  const hiddenKey='music_toolbox_danmaku_hidden_v21', positionKey='music_toolbox_tip_position_v21';
  const foldedKey='mtu-tips-folded';
  const swingSource=['Swing 节奏 · Open Music Theory','https://viva.pressbooks.pub/openmusictheory/chapter/swing-rhythms/'],meterSource=['复拍子 · Open Music Theory','https://viva.pressbooks.pub/openmusictheory/chapter/compound-meters-and-time-signatures/'],triadSource=['三和弦 · Open Music Theory','https://viva.pressbooks.pub/openmusictheory/chapter/triads/'];
  for(const row of [
    ['metro','Swing 不是固定比例','八分音符一长一短，不必总是精确的 2∶1。先保持主拍不变，再比较直拍和 Swing。',[1,2],'swing',null,swingSource],
    ['metro','六个八分，两个大拍','常规 6/8 每三个八分音符组成一大拍；把六下数为「一二三、四五六」，听一和四的落点。',[1,0],'six',null,meterSource],
    ['practice','在一个大拍里唱三个音','在常规 6/8 中，附点四分音符可作为大拍。唱三个等长的八分音符，不要把第三个音拖长。',[1,0],'six',null,meterSource],
    ['ear','两个三度搭成一个三和弦','C–E–G 与 C–E♭–G 保留同一个根音和五音。先分别唱出三音，再把三个音一起听。',[3,0],'triad',[60,64,67,60,63,67],triadSource],
    ['chord','转位不改变根音','C 大三和弦把 E 放在最低是第一转位，把 G 放在最低是第二转位，两种根音都还是 C。',[3,0],'chordLab',[64,67,72],triadSource],
    ['theory','大三度叠小三度','从 C 向上数四个半音到 E，再数三个到 G。试着改成先小三度、再大三度。',[3,0],'triad',null,triadSource],
    ['settings','练习时关闭讲解','不想按按钮就看到讲解时，可以单独关掉功能讲解，保留自动弹幕。',[0,0],'tipsSettings'],
    ['settings','给常用按钮留出空间','把灯泡拖到惯用手够得到的空白处，它会记住位置。自动弹幕可在外观与动效中单独关闭。',[0,0],'tipsSettings'],
    ['tuner','听八度再读指针','锁定四弦 D3，再听六弦降到 D2 的声音。两音音名相同，频率相差一倍。',[0,0],'keys',[38,50],pitch],
    ['tuner','先看弦号，再看键','两根弦可以定到同一音。连线汇合在一个键时，仍要看琴头上独立的弦号。',[0,1],'keys'],
    ['metro','把七拍数成三组','试 2＋2＋3：脚点七次，手只敲第一、三、五下。再把最后一组拍满。',[1,0],'seven'],
    ['metro','只听下一拍拍点','打开前进节奏块，看方块逼近终点。先静音预测下一拍，再开声音核对。',[1,0],'laneView'],
    ['metro','四小节只改末尾','进编排器做四小节循环；前三小节保持骨架，第四小节末尾加一个短回应。',[1,2],'arrange'],
    ['metro','听谁带动切分','在作品里静音闭镲，再只恢复闭镲。同一组底鼓和军鼓，细分可以改变推进感。',[1,2],'arrange'],
    ['chord','给属七留一个共同音','弹 G7 到 C，试着保持 G 不动，分别听 B 到 C、F 到 E 的距离。',[3,1],'chordLab',[71,72,65,64]],
    ['chord','先猜最低音','先只哼最低音，再听其他音。最低音和根音不同时，未必是一个新和弦。',[3,0],'triad'],
    ['instrument','同一落点，两条路线','先在一个把位弹到 A，再换一根弦找到同一个八度的 A。比较哪条路径更容易接下一句。',[2,3],'pentatonic'],
    ['instrument','用短句接两个把位','在相邻 CAGED 形状的交界找共同根音。第一句从它结束，第二句从它开始。',[3,0],'chordShape',null,guitar],
    ['ear','先判断第三音','让根音留在耳朵里，再哼和弦中的三音。第三音比根音高三个还是四个半音？',[3,0],'triad',[60,63,60,64]],
    ['ear','把同时的音拆开唱','听一个和声音程，先哼低音再哼高音。用旋律音程复核，不靠响度猜方向。',[5,0],'harmonic'],
    ['practice','呼吸不占下一拍','先在休止位置吸气，再唱下一乐句。录完只对照再次进入的时机。',[1,1],'score'],
    ['practice','唱前读出第一音','先对齐当前 Do，再找旋律第一音。有弱起时不要把第一个音误当小节首拍。',[0,2],'score'],
    ['theory','十二键不止十二个名字','平均律键盘的同一个黑键，在 G 小调可写作 B♭，在 B 大调可写作 A♯。',[0,1],'keys',[70]],
    ['theory','先弹骨架再添色彩','先听 C、E、G，再添 B。前三音仍是大三和弦，B 改变的是七和弦色彩。',[3,1],'seventh',[60,64,67,71]],
    ['circle','用两个音听终止','在大调 ii–V–I 中，先只追踪三音、七音。把进行加入编排，再寻找最近的声部移动。',[4,0],'selectedCadence'],
    ['circle','属调不是属和弦','G 可以是 C 大调的属和弦根音，也可以成为新调的主音。试着分别在 G、C 上结束。',[4,0],'circleG'],
    ['settings','台上只保留拍点','在舞台勾选减少动效，保留拍号与当前拍。慢设备可先关余波，再调亮度。',[1,0],'visual'],
    ['settings','给练习留一块安静区域','短按收起自动弹幕，仍可用灯泡查资料；长按则关闭，外观设置可重新开启。',[1,0],'tipsSettings']
  ])add(...row);
  add('circle','编排当前调的终止式','先在圈上选调，再把这个调的三个和弦加入编排。',[4,0],'selectedCadence');
  for(const [kind,title,text] of [['name','音名定位','同一音名可以出现在不同弦上。'],['read','弦品认音','先判断空弦，再按品数加半音。'],['axis','横纵找音','同一弦沿品位移动；同一品跨弦时要按实际定弦计算。'],['interval','八度与音程','同一个音升高十二个半音是八度，升高七个半音是纯五度。'],['ear','听音找指板','先听目标的高低，再到指板找相同八度。'],['degree','和弦内音','属七和弦由根音、大三度、纯五度和小七度构成。']]){for(const scene of ['theory','instrument']){add(scene,title,text,[5,0],'fretGame');items.at(-1).kind=kind;}}
  const get=(key,fallback)=>localStorage.getItem(key)??fallback;
  const byId=id=>document.getElementById(id);
  function icons(root=document){for(const b of [...(root.matches?.('[data-ui]')?[root]:[]),...root.querySelectorAll('[data-ui]')]){const id=b.dataset.ui,old=b.querySelector(':scope > .ui-glyph');if(old?.dataset.icon===id)continue;old?.remove();b.insertAdjacentHTML('afterbegin',`<svg data-icon="${id}" class="ui-glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#ui-${id}"/></svg>`);if(!b.title)b.title=b.getAttribute('aria-label')||b.textContent.trim();}}
  let scene,selected,timer,frame;
  const recent=Object.create(null);
  const draw=()=>{
    const pool=items.filter(item=>item.scene===scene);
    if(!pool.length)return null;
    const seen=recent[scene]??=[];
    let available=pool.filter(item=>!seen.includes(item.id));
    if(!available.length){seen.splice(0,Math.max(1,seen.length-1));available=pool.filter(item=>!seen.includes(item.id));}
    const item=available[Math.floor(Math.random()*available.length)]||pool[0];seen.push(item.id);return item;
  };
  const routes={
    six:['metro','试 6/8 · 3＋3',()=>{Metro.setTs('6/8');Metro.setGrouping('6/8','3+3');}],
    laneView:['metro','看前进节奏块',()=>{Metro.openVisualMetronome();const s=byId('metro-visual-panel').querySelector('select[data-style]');s.value='lane';s.dispatchEvent(new Event('change'));}],arrange:['metro','打开节奏编排',()=>DrumWorkshop.switchTab('drum')],tipsSettings:['settings','调整弹幕位置',()=>{byId('shell-appearance').open=true;byId('music-tip-settings-v21').scrollIntoView({block:'center'});}],
    selectedCadence:['circle','加入当前调的 ii–V–I',()=>{document.querySelector('.circle-compose').open=true;CirclePage.queueHarmony(true);}],
    fretGame:['instrument','开始这项指板游戏',item=>FretTrainer.open(item.kind,+document.querySelector('#instrument-study-panel [data-pos]')?.value||0)],
    board:['instrument','在指板上练',item=>InstrumentPage.openStudy('scale',item.layer,item.key)],improv:['instrument','试这条短句',item=>{InstrumentPage.openStudy('improv',item.layer,item.key);const el=byId('instrument-study-panel').querySelector('[data-task]');el.value=String(item.task);el.dispatchEvent(new Event('change',{bubbles:true}));}],
    locate:['instrument','在指板找根音',item=>{InstrumentPage.openStudy('scale','scale',item.key);const p=byId('instrument-study-panel').querySelector('[data-pos]');p.value=String(item.fret<=5?1:item.fret<=9?5:9);p.dispatchEvent(new Event('change',{bubbles:true}));}],
    repertoire:['practice','打开这首视唱谱',item=>{const s=SightSinging;if(s.recording){toast('请先结束当前录音');return;}s.setMode('sight');document.getElementById('sight-training').value='melody';const exercise=s.build(0,item.piece);s.history.push(exercise);s.next(s.history.length-1-s.historyIndex);}],
    progression:['ear','练这条和弦进行',item=>{EarTraining.setLevel('progression');EarTraining.setKeyMode('0',item.mode);const p=ProgressionTraining;p.family='all';p.template=item.template;p.secondary=true;p.borrowed=true;item.types.forEach(id=>p.selection.add(id));EarTraining.resetQuestion();}],
    keys:['tuner','查看键盘音域',()=>byId('tuner-range')?.scrollIntoView({block:'nearest'})],
    search:['tuner','搜索特殊调弦',item=>{SpecialTuningSearch.open();const input=byId('special-tuning-query');if(input&&item.query){input.value=item.query;input.dispatchEvent(new Event('input'));}}],
    capo:['tuner','打开变调夹',()=>byId('tuner-capo-button')?.click()], devices:['tuner','查看检测设备',()=>document.querySelector('.tuner-diagnostics-toggle')?.click()],
    swing:['metro','开启 Swing',()=>Metro.setSwingEnabled(true)],backbeat:['metro','试二四拍重音',()=>Metro.setAccentProfile('twoFour')],
    dynamics:['metro','试同音色力度',()=>Metro.setBeatVoiceMode('dynamics')],grid:['metro','编辑重音网格',()=>Metro.openAccentEditor()],
    meter22:['metro','试 2/2 拍',()=>Metro.setTs('2/2')],seven:['metro','试七拍分组',()=>{Metro.setTs('7/8');Metro.setGrouping('7/8','2+2+3');}],
    ramp:['metro','打开渐速训练',()=>Metro.openRamp()],visual:['metro','看可视化节拍器',()=>Metro.openVisualMetronome()],
    chordLab:['theory','试听和弦',()=>TheoryPage.showContent(3,0)], score:['practice','打开视唱谱面'],updates:['settings','查看更新',()=>byId('settings-update-check')?.scrollIntoView({block:'center'})]
  };
  for(const [action,label,level] of [['harmonic','同时听音程','interval'],['melodic','先后听音程','interval'],['triad','辨认三和弦','triad'],['seventh','辨认七和弦','seventh']]){
    routes[action]=['ear',label,()=>{EarTraining.setLevel(level);if(level==='interval'){EarTraining.setListening(EarTraining.referenceEnabled,action);byId('ear-interval-playback').value=action;}}];
  }
  for(const [action,layer,label] of [['chordShape','chord','看 CAGED 五形'],['pentatonic','pentatonic','练 A 小调五声音阶'],['blues','blues','练 A 布鲁斯音阶'],['arp','arp','练 C 大三和弦琶音']]){
    routes[action]=['instrument',label,()=>{CagedLab.root=['blues','pentatonic'].includes(layer)?9:0;CagedLab.layer=layer;CagedLab.open();}];
  }
  for(const [action,pc,minor] of [['circleC',0,false],['circleG',7,false],['circleAm',9,true]])routes[action]=['circle','在五度圈查看',()=>{if(CirclePage.selectedKey!==pc||CirclePage.selectedMinor!==minor)CirclePage.selectKey(pc,minor);}];

  const pill=document.createElement('aside');pill.id='music-tip-pill';pill.className='music-tip-pill';
  pill.innerHTML='<button class="music-tip-toggle" data-ui="lightbulb" type="button" title="学习小贴士 · 可拖动" aria-label="学习小贴士" aria-expanded="false"></button>';
  const host=document.createElement('div');host.id='music-tip-stream';host.className='music-tip-stream';
  const dock=document.createElement('div');dock.id='tip-gauge-dock';document.querySelector('#page-tuner .tuner-display').append(dock);dock.append(pill);document.body.append(host);
  const close=()=>{byId('music-tip-card')?.remove();pill.firstChild.setAttribute('aria-expanded','false');};
  const syncVisibility=()=>{host.hidden=get(hiddenKey,'0')==='1'||get(foldedKey,'0')==='1';host.replaceChildren();const opt=document.querySelector('#music-tip-settings-v21 [data-auto]');if(opt)opt.checked=get(hiddenKey,'0')!=='1';};
  const setStream=state=>{localStorage.setItem(hiddenKey,state==='off'?'1':'0');localStorage.setItem(foldedKey,state==='fold'?'1':'0');syncVisibility();close();if(!host.hidden)spawn();};
  const show=item=>{
    close();if(!item)return;selected=item;
    const [destination,label,act]=routes[item.action];
    const card=document.createElement('section');card.id='music-tip-card';card.className='music-tip-card';card.setAttribute('role','dialog');card.setAttribute('aria-label','学习小贴士');
    card.innerHTML='<div class="music-tip-card-head"><strong></strong><button aria-label="收起小贴士">×</button></div><p></p><small></small><div class="music-tip-card-actions"></div>';
    card.querySelector('strong').textContent=item.title;card.querySelector('p').textContent=item.text;card.querySelector('small').textContent=`${scenes[scene]} · `;
    const source=item.source;
    if(source&&/^https?:\/\//.test(source[1])){const link=document.createElement('a');link.textContent=source[0];link.href=source[1];link.target='_blank';link.rel='noopener';card.querySelector('small').append(link);}else card.querySelector('small').append('音乐工具箱 Ultra 原创练习');
    const button=(text,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.dataset.ui=({'换一条':'shuffle','收藏':'bookmark','学习乐理':'book-open','试听示例':'volume-2','关闭弹幕':'x','开启弹幕':'play'})[text]||'arrow-up-right';b.onclick=()=>fn(b);card.lastChild.append(b);};
    button('学习乐理',()=>{close();App.goPage('theory');TheoryPage.showContent(...item.lesson);});
    button(label,()=>{close();App.goPage(destination);if(destination==='metro'&&DrumWorkshop.tab!=='metro')DrumWorkshop.switchTab('metro');act?.(item);});
    if(item.notes)button('试听示例',async()=>{await AudioEngine.init();await AudioEngine.prepareInstrument('piano');item.notes.forEach((midi,i)=>setTimeout(()=>{if(card.isConnected)AudioEngine.playInstrument(midi,.4,.2,'ear');},item.action==='harmonic'?0:i*290));});
    button('换一条',()=>show(draw()));button('收藏',b=>{let saved;try{saved=JSON.parse(get('music_toolbox_tip_favorites_v20','[]'));}catch{saved=[];}localStorage.setItem('music_toolbox_tip_favorites_v20',JSON.stringify([...new Set([...saved,item.id])].slice(-80)));b.textContent='已收藏';});
    button(host.hidden?'开启弹幕':'收起弹幕',()=>setStream(host.hidden?'on':'fold'));const streamButton=card.lastChild.lastChild;if(!host.hidden){streamButton.title='短按收起，长按关闭自动弹幕';let hold;streamButton.onpointerdown=e=>{if(e.button===0)hold=setTimeout(()=>{setStream('off');toast('自动弹幕已关闭，可在设置中开启');},650);};streamButton.onpointerup=streamButton.onpointercancel=streamButton.onpointerleave=()=>clearTimeout(hold);}
    card.querySelector('.music-tip-card-head button').onclick=close;
    pill.firstChild.setAttribute('aria-expanded','true');document.body.append(card);icons(card);host.replaceChildren();placeCard();
  };
  let context=null;
  pill.firstChild.onclick=()=>{if(dragged){dragged=false;return;}byId('music-tip-card')?close():show(context||draw());};
  const settings=document.createElement('section');settings.className='music-tip-settings';settings.id='music-tip-settings-v21';settings.innerHTML='<label>弹幕位置<select><option value="auto">自动</option><option value="spread">全屏留白</option><option value="top">上半屏优先</option><option value="bottom">下半屏优先</option></select></label><label>功能讲解<input type="checkbox" data-guide></label>';
  const mountSettings=()=>{(byId('shell-appearance')||byId('page-settings')).append(settings);};mountSettings();document.addEventListener('DOMContentLoaded',mountSettings,{once:true});const position=settings.querySelector('select');
  const automatic=document.createElement('label');automatic.innerHTML='自动弹幕<input type="checkbox" data-auto>';settings.prepend(automatic);automatic.lastChild.onchange=e=>setStream(e.target.checked?'on':'off');
  const guides=settings.querySelector('[data-guide]');guides.checked=get('mtu-guide-v23','1')==='1';guides.onchange=()=>localStorage.setItem('mtu-guide-v23',guides.checked?'1':'0');
  const limit=(v,min,max)=>Math.max(min,Math.min(v,max));let drag,dragged=false;
  function bounds(){return {w:innerWidth,h:innerHeight,top:Math.max(8,document.querySelector('.top-bar').getBoundingClientRect().bottom+5),bottom:Math.min(innerHeight-8,document.querySelector('nav').getBoundingClientRect().top-5)};}
  function placeCard(){const card=byId('music-tip-card');if(!card)return;const r=pill.getBoundingClientRect(),b=bounds(),h=card.offsetHeight;Object.assign(card.style,{left:`${limit(r.left+22-card.offsetWidth/2,8,b.w-card.offsetWidth-8)}px`,top:`${limit(r.bottom+h+6<b.bottom?r.bottom+6:r.top-h-6,b.top,b.bottom-h)}px`,right:'auto',bottom:'auto'});}
  function move(x,y){if(pill.parentElement!==document.body)document.body.append(pill);const b=bounds();Object.assign(pill.style,{position:'fixed',left:`${limit(x,6,b.w-50)}px`,top:`${limit(y,b.top,b.bottom-44)}px`,right:'auto',bottom:'auto'});placeCard();}
  function restore(){if(drag)return;const value=get('mtu-tip-xy','').split(',').map(Number);if(value.length===2&&value.every(Number.isFinite)){move(value[0]*(innerWidth-44),value[1]*(innerHeight-44));return;}pill.removeAttribute('style');if(byId('page-tuner').classList.contains('active'))dock.append(pill);else byId('theme-toggle-btn').before(pill);placeCard();}
  pill.onpointerdown=e=>{if(e.button!==0)return;const r=pill.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,dx:e.clientX-r.left,dy:e.clientY-r.top};dragged=false;pill.firstChild.setPointerCapture(e.pointerId);};
  pill.onpointermove=e=>{if(!drag||e.pointerId!==drag.id)return;if(!dragged&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<6)return;dragged=true;dock.classList.add('return-target');move(e.clientX-drag.dx,e.clientY-drag.dy);pill.firstChild.setPointerCapture(e.pointerId);};
  window.addEventListener('pointerup',e=>{if(drag?.id!==e.pointerId)return;drag=null;dock.classList.remove('return-target');if(!dragged)return;const r=pill.getBoundingClientRect(),d=dock.getBoundingClientRect();if(d.width&&Math.hypot(r.left-d.left,r.top-d.top)<=34){localStorage.removeItem('mtu-tip-xy');restore();}else localStorage.setItem('mtu-tip-xy',[r.left/(innerWidth-44),r.top/(innerHeight-44)].join(','));});window.addEventListener('pointercancel',()=>{drag=null;dragged=false;dock.classList.remove('return-target');restore();});window.addEventListener('resize',restore);requestAnimationFrame(restore);
  for(const option of position.options)option.selected=option.value===get(positionKey,'spread');
  position.onchange=()=>{localStorage.setItem(positionKey,position.value);host.replaceChildren();spawn();};
  const obstacles='button,select,input,textarea,summary,label,a,[role="button"],svg,canvas,#tuner-headstock,#tuner-range,.ear-display,#sight-score,.drum-grid,.music-tip-toggle';
  const spawn=(hint='')=>{
    if(typeof hint!=='string')hint='';const reduced=document.documentElement.dataset.motion==='reduced'||matchMedia('(prefers-reduced-motion: reduce)').matches;
    if((host.hidden||reduced)&&!hint||document.hidden||byId('music-tip-card'))return;
    const page=byId(`page-${scene}`);if(!page?.classList.contains('active')||[...document.querySelectorAll('dialog[open],.practice-modal:not([hidden]),.metro-visual-panel,#study-flyout:not([hidden]),.tuner-settings-fold[open],.start-screen:not([hidden]):not(.hide)')].some(e=>e.getClientRects().length)){host.replaceChildren();return;}
    if(hint){hideHint();host.dataset.guide='true';}const area=host.getBoundingClientRect();if(!area.width||!area.height)return;
    const blocks=[...page.querySelectorAll(obstacles+',output,.tuner-display,#instrument-stage,#fret-game'),pill,document.querySelector('.top-bar'),document.querySelector('nav')].filter(Boolean).map(node=>node.getBoundingClientRect()).filter(r=>r.width&&r.height);for(const n of page.querySelectorAll('p,h2,h3,h4,article>strong')){const range=document.createRange();range.selectNodeContents(n);blocks.push(...range.getClientRects());}
    if(scene==='instrument'){for(const el of page.querySelectorAll('.board-tabs,.board-status,.board-answers,.board-menu:not([hidden]),.board-study-settings:not([hidden]),.instrument-session-strip,#instrument-stage')){const r=el.getBoundingClientRect();if(r.width&&r.height)blocks.push({left:r.left-10,right:r.right+10,top:r.top-10,bottom:r.bottom+10});}}
    if(hint&&host.childElementCount>=(scene==='instrument'?1:3))host.firstElementChild?.remove();
    const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;for(const other of [...host.children])if(other._lane){if(blocks.some(b=>intersects(other._lane,b)))other.remove();else blocks.push(other._lane);}
    if(host.childElementCount>=(scene==='instrument'?1:3))return;const item=hint?{title:hint,text:hint}:draw();if(!item)return;
    const chip=document.createElement(hint?'span':'button');chip.className='music-tip-danmaku'+(hint?' context-flight':'');chip.textContent=item.title;chip.setAttribute('aria-label',item.text);chip.dataset.scene=scene;if(hint)chip.setAttribute('role','status');else chip.onclick=()=>show(item);host.append(chip);
    const w=chip.offsetWidth,h=chip.offsetHeight,range=position.value;
    const start=0,end=area.height;
    const spots=[];
    for(let y=start+4;y+h+4<end;y+=h+5){const top=area.top+y;const ranges=blocks.filter(r=>r.bottom+4>top&&r.top-4<top+h).map(r=>[r.left-area.left-6,r.right-area.left+6]).sort((a,b)=>a[0]-b[0]);let left=4;
      for(const [a,b] of [...ranges,[area.width-4,area.width]]){const width=Math.min(a,area.width-4)-left;if(width>=w+52)spots.push([left,y,width]);left=Math.max(left,b);}}
    if(!spots.length){chip.remove();if(hint)hideHint();return;}const preferred=spots.filter(([,y])=>range==='top'?y<end/2:range==='bottom'?y>end/2:true),paths=preferred.length?preferred:spots;
    const centers=[...host.children].filter(n=>n!==chip&&n._lane).map(n=>n._lane.top-area.top);const anchor=Math.random()*end;const score=s=>centers.length?Math.min(...centers.map(v=>Math.abs(s[1]-v)))+Math.random()*h: -Math.abs(s[1]-anchor)+Math.random()*h;const [left,y,width]=paths.map(s=>[score(s),s]).sort((a,b)=>b[0]-a[0])[0][1],travel=width-w;chip._lane={left:area.left+left,right:area.left+left+width,top:area.top+y,bottom:area.top+y+h};chip.style.cssText=`--tip-x:${left}px;--tip-y:${y}px;--travel:${travel}px;--seconds:${Math.max(4,travel/36)}s`;
    if(hint){if(reduced){chip.style.setProperty('animation','none','important');chip.style.transform='none';}hintTimer=setTimeout(hideHint,reduced?3500:Math.max(4,travel/36)*1000+300);}chip.onanimationend=hint?hideHint:()=>chip.remove();
  };
  const changeScene=()=>{
    const next=document.querySelector('main .page.active')?.id.replace('page-','');if(!scenes[next]||next===scene)return;
    const follow=!!byId('music-tip-card');scene=next;context=null;close();restore();host.replaceChildren();hideHint();clearInterval(timer);cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>follow?show(draw()):spawn());timer=setInterval(spawn,1900);
  };
  const observer=new MutationObserver(changeScene);
  document.querySelectorAll('main > .page').forEach(page=>observer.observe(page,{attributes:true,attributeFilter:['class']}));
  document.addEventListener('scroll',()=>host.replaceChildren(),{capture:true,passive:true});window.addEventListener('resize',()=>host.replaceChildren());
  document.addEventListener('pointerdown',e=>{if(!e.target.closest?.('.music-tip-danmaku,#music-tip-card,#music-tip-pill'))host.replaceChildren();},true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
  let hintTimer;function hideHint(){clearTimeout(hintTimer);host.querySelector('.context-flight')?.remove();delete host.dataset.guide;}
  const help=[['#a4-box','八度和频率','440 Hz 是 A4 的参照；改变它，会一起改变调音目标。'],['#tuner-headstock','标准六弦','点弦号锁定目标；左列从上到下是四、五、六弦。'],['#tuner-range','半音与品位','相邻黑白键差一个半音。点键可听参考音。'],['#tuner-capo-button','全夹二品','全夹每升一品，所有弦升一个半音；蜘蛛夹按弦分别计算。'],['#metro-swing-master,#metro-swing-body','Swing 的长短','Swing 改细分的长短，不改变主拍速度。'],['#metro-accent-profile','二四拍重音','计拍方式管音色，重音方案管重音落在哪一拍。'],['#play-btn','看一小节','数到一时是新小节；开可视化能看见同一组拍点。'],['#instrument-study [data-study="scale"]','大调阶梯','蓝色的 1 是根音；其他数字是同一音阶里的级数。'],['#instrument-study [data-study="improv"]','只改最后一音','先用三个音组成短句，再只改节奏或最后一个音。'],['#instrument-caged-open','五形连成指板','五个名称是开放和弦形状，不是五种不同的调。'],['.circle-compose','属到主','ii–V–I 是和弦进行。选好调，就能把对应的和弦放进编排。'],['.ear-level-select','同时还是先后','先后听的是旋律音程，同时听的是和声音程。'],['#sight-demo','先认谱号','先看第一音，再听示范；唱时按相同乐句范围练。'],['.chord-page-tabs','最低音','查询给出按法，探索则根据你按下的音识别和弦。'],['#theory-memory-kit','自然半音','速记可以翻页或暂停。去练习会打开这张卡的对应工具。'],['#shell-appearance','离线使用','自然动效遵循系统偏好；减少动效后可手动翻卡。']];
  help.unshift(['.circle-compose','编排当前调的终止式','先选调，再加入三个和弦。'],['#instrument-study [data-study="scale"]','音名定位','可从贴士进入当前把位的找音游戏。']);
  document.addEventListener('click',e=>{if(!e.target.closest?.('button,input,select,summary,[role=button]'))return;const match=help.find(([s])=>e.target.closest(s));if(!match)return;context=items.find(i=>i.scene===scene&&i.title===match[1])||context;if(guides.checked)requestAnimationFrame(()=>spawn(match[2]));});
  const mappings={'#sight-demo':'volume-2','#sight-prev-phrase':'chevron-left','#sight-next-phrase':'chevron-right','#instrument-tone-open':'sliders-horizontal','.special-tuning-open':'search','#theme-toggle-btn':'circle-fading-plus','.metro-ramp-open':'timer','#metro-visual-open':'activity','.remember-primary':'bookmark','.music-tip-toggle':'lightbulb','.ear-play-btn':'ear','.drum-header-actions [data-use-metronome]':'timer','[data-use-metronome]':'timer','.metro-accent-edit':'sliders-horizontal','.tuner-diagnostics-toggle':'settings-2'};
  Object.assign(mappings,{'[onclick="DrumWorkshop.generate()"]':'shuffle','[onclick="DrumWorkshop.undo()"]':'undo-2','[onclick="DrumWorkshop.settings()"]':'settings-2','[onclick="InstrumentPage.clearMapping()"]':'x','[onclick="InstrumentPage.clearHeld()"]':'x','#instrument-orientation':'repeat','#settings-update-check button':'repeat'});
  function commonIcons(){for(const [s,id] of Object.entries(mappings)){for(const b of document.querySelectorAll(s)){if(b.querySelector('svg:not(.ui-glyph)'))continue;if(s==='.special-tuning-open'&&!b.dataset.ui)b.textContent='';b.dataset.ui=id;}}icons();}
  const navIcons={tuner:'activity',metro:'timer',chord:'layers',instrument:'guitar',ear:'ear',practice:'music-2',theory:'book-open',circle:'disc-3',settings:'settings-2'};
  for(const b of document.querySelectorAll('nav [data-page]')){const wrap=b.querySelector('.nav-icon');if(wrap&&navIcons[b.dataset.page]){wrap.replaceChildren();wrap.dataset.ui=navIcons[b.dataset.page];}}
  window.MusicTips={items,icons,commonIcons,spawnDanmaku:spawn,show:()=>show(context||draw()),get current(){return selected;},memoryCards:()=>items.filter(i=>['board','improv','locate','grid','harmonic','backbeat'].includes(i.action)||i.action==='fretGame'&&i.scene==='theory').map(i=>[i.title,i.text,()=>{const [page,,fn]=routes[i.action];App.goPage(page);if(page==='metro')DrumWorkshop.switchTab('metro');fn?.(i); }])};
  document.querySelector('nav').addEventListener('click',()=>requestAnimationFrame(commonIcons));document.addEventListener('DOMContentLoaded',commonIcons,{once:true});commonIcons();syncVisibility();changeScene();
})();
