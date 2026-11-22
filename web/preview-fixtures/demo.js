(() => {
  'use strict';
  const {rows, duration} = window.ELP_DEMO_RECORDING;
  const media = './preview-fixtures/';
  const cover = media + 'office.svg';
  const bySection = section => rows.filter(row => row.section === section);
  const core = bySection('office');
  const first = core[0].start;
  const last = core.at(-1).end;
  const lessonIds = ['ep-040', 'ep-901', 'ep-902'];
  const version = 'review-1';
  const captions = rows.map(({start,end,en,zh}) => ({start,end,en,zh}));
  const turns = items => items.map(({start,end,speaker}) => [start,end,speaker]);
  const highlights = ['quick look', 'swamped', 'check with'];
  const casts = ['mia', 'dan'].map((id, index) => ({
    id, x: index ? 66 : 33, width: 22, floor: 9,
    image: media + id + '.svg',
    poses: {speak:{image:media + id + '-speak.svg'}}
  }));
  const lesson = {
    version, sceneImage:cover,
    goal:'明确说出你要请对方做什么，并接住对方的婉拒。',
    trialAudio:media + 'episode.mp3', duration:last-first, window:[first,last],
    cues:core.map(({start,end,speaker,en,zh}) => ({
      start:start-first,end:end-first,speaker:speaker==='mia'?'Mia':'Dan',en,zh
    })),
    episodeStudy:{
      audio:media + 'episode.mp3',duration,sceneImage:cover,captions,highlights,
      chapters:[
        {id:'intro',title:'开场与热身',start:0,scene:'studio'},
        {id:'dialogue',title:'核心对话',start:first,scene:'office'},
        {id:'words',title:'词汇拆解',start:bySection('words')[0].start,scene:'studio'},
        {id:'wrap',title:'总结与片尾',start:bySection('wrap')[0].start,scene:'studio'}
      ],
      sceneLayers:{
        background:media + 'room.svg', actors:casts,
        shots:[{start:first,end:last,beats:[{at:first,cast:{dan:{flip:true}}}]}]
      },
      studioVoices:turns(rows.filter(row => row.section!=='office')),
      officeTurns:turns(core),officeBeats:[],
      boards:bySection('words').filter(row => row.term).map(row =>
        [row.start,row.end,row.term,row.meaning,'']),
      examples:bySection('words').filter(row => row.example).map(row =>
        [row.start,row.end,'paper',row.zh,row.en]),
      clips:{first:[first,last]},stickers:[],modules:{}
    },
    trialNotes:{
      words:[
        {term:'take a quick look',zh:'快速看一眼',en:'Review something briefly.',form:'take a quick look at + 名词',example:core[0].en,cue:1},
        {term:'be swamped',zh:'忙得抽不开身',en:'Have too much work to do.',form:'be swamped with + 名词',example:core[1].en,cue:2},
        {term:'check with',zh:'找某人问一下',en:'Ask someone to confirm or help.',form:'check with + 人',example:core[2].en,cue:3}
      ],
      lines:['带上明确的请求对象。','说明自己现在的情况。','问清楚还能找谁。','把承诺说到具体时间。']
    },
    patterns:[{frame:'Could you take a quick look at [thing]?',use:'请对方快速确认某件事。',example:core[0].en}],
    practice:{
      gaps:[{prompt:'Could you take a quick ___ at this slide?',answers:['look'],hint:'填入一个词。'}],
      rewrite:{task:'用一句英语请同事快速看一下会议议程。',reference:'Could you take a quick look at this meeting agenda?',check:'是否说清楚请对方看什么？'}
    }
  };
  const catalog = [
    {id:lessonIds[0],episode:40,titleZh:'请同事快速看一眼',title:'Asking for a quick review',category:'职场商务',difficulty:'初级',tags:['请求帮忙','同事沟通']},
    {id:lessonIds[1],episode:901,titleZh:'同事抽不开身 · 完成状态示例',title:'A busy coworker · Completed sample',category:'职场商务',difficulty:'中级',tags:['同事沟通']},
    {id:lessonIds[2],episode:902,titleZh:'找另一位同事 · 未开始示例',title:'Ask another coworker · New sample',category:'职场商务',difficulty:'初级',tags:['请求帮忙']},
    {id:'ep-903',episode:903,titleZh:'酒店确认预订 · 待精校示例',title:'Confirming a hotel booking · Pending sample',category:'差旅出行',difficulty:'初级',tags:['核对预订']}
  ];
  window.ELP_LIBRARY = {
    catalog,trialSeries:lessonIds,lessons:Object.fromEntries(lessonIds.map(id => [id,lesson]))
  };

  const key = 'elp365-demo:progress:v1';
  const demoRecords = {
    'ep-040':{version,episodeAt:5,episodeView:'whole',resumeView:'whole',lastOpened:2},
    'ep-901':{version,episodeAt:duration,episodeFinished:true,episodeView:'whole',lastOpened:1}
  };
  window.ELP_PROGRESS = {
    enabled:true,
    async load(){
      try {
        const saved = JSON.parse(localStorage.getItem(key));
        if(saved?.lessons && typeof saved.last === 'string')return {...saved,cloudReady:true};
      } catch {}
      return {lessons:structuredClone(demoRecords),activity:{},cloudReady:true,last:'ep-040'};
    },
    persist({lessons,last}){
      try {localStorage.setItem(key,JSON.stringify({lessons,last}));} catch {}
    }
  };
  document.querySelector('#reset-demo').addEventListener('click', () => {
    localStorage.removeItem(key);
    localStorage.removeItem('elp-listen-mode');
    history.replaceState(null,'','#study');
    location.reload();
  });
})();
