(() => {
  'use strict';
  const main = document.getElementById('content');
  const player = document.getElementById('episode-audio');
  const Studio = window.ELP_STUDIO;
  const fullAudio = document.getElementById('episode-full-audio');
  const library = window.ELP_LIBRARY;
  if (!library?.catalog?.length) {
    main.innerHTML = '<h1>课程库暂时打不开</h1><p>请把 index.html 和同目录的课程文件一起保留。</p>';
    return;
  }
  const {catalog, lessons, report} = library;
  const single = library.singleLesson;
  const series = library.trialSeries;
  const curated = !!(series || single);
  const featured = single || series?.[0];
  const ui = window.ELP_EP040_LANGUAGE;
  const trialTabs=[['dialogue','逐句字幕'],['words','重点词组'],['practice','练习']];
  const trialUrl=(id,view)=>id===featured?'#'+view:'#lesson/'+id+'/'+view;
  const savedTrialTab=p=>trialTabs.some(([id])=>id===p.trialTab)?p.trialTab:'dialogue';
  const byId = new Map(catalog.map(row => [row.id,row]));
  const ready = catalog.filter(row => lessons[row.id]).sort((a,b) =>
    Number(a.difficulty!=='初级')-Number(b.difficulty!=='初级') || a.episode-b.episode);
  const categories = {
    '日常生存':['🏡','peach'], '职场商务':['💼','mint'],
    '差旅出行':['🧳','sky'], '社交情感':['💬','lavender']
  };
  const sceneIcons = {
    '餐厅点餐':'🍽️','确认等候时间':'⏳','礼貌回应':'🤝','请假':'📆','电话沟通':'☎️','工作交接':'📋',
    '酒店住宿':'🏨','核对预订':'🗒️','确认费用':'🧾','交通与问路':'🗺️','行车指路':'🗺️','纠正方向':'↪️',
    '电话预约':'☎️','协调时间':'🕒','预约改期':'📅','礼貌致歉':'🙏','请求帮忙':'🤝','同事沟通':'💬',
    '电梯寒暄':'👋','结束话题':'🌤️','理发':'✂️','确认需求':'📌','会议迟到':'🕒','说明进度':'📋',
    '超市结账':'🛒','询问付款':'💳','优惠券':'🎟️','租车':'🚙','确认替代方案':'🗂️','沟通保险':'📄'
  };
  const order = [
    ['盲听',''], ['扫盲','M2'], ['排雷','M3'], ['内功','M4 · M6'],
    ['招式','M7'], ['正音','M5'], ['输出','M8']
  ];
  const concept = {
    link:['连读','词尾的辅音和下一个词的元音可以接在一起。','check in → /tʃek ɪn/，听 /k/ 和 /ɪ/ 的连接。'],
    weak:['弱读','非重读的功能词常被说得更短，有些元音会变成 /ə/。','a cup of tea：抓 CUP、TEA，再听 a 和 of。'],
    stress:['重音','内容词和关键词常比周围音节突出，先用它们定位词组。','an UPgrade：名词 upgrade 的重音通常在前。'],
    flap:['闪音 t','一些北美口音会把重读元音后、非重读元音前的 /t/ 发成很短的闪音。','city：注意中间的 t 很短。'],
    chunk:['意群','按意思组织短语，先听哪几个词属于同一组，再模仿停顿。','I’ll send an update / by tomorrow morning.']
  };
  const safe = value => String(value ?? '').replace(/[&<>"']/g,
    x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const q = (selector, scope=main) => scope.querySelector(selector);
  const qa = (selector, scope=main) => Array.from(scope.querySelectorAll(selector));
  const ep = row => `EP${String(row.episode).padStart(3,'0')}`;
  const badge = (label,extra='') => `<span class="badge ${extra}">${safe(label)}</span>`;
  const categoryIcon = name => categories[name]?.[0] ?? '📚';
  const tone = name => categories[name]?.[1] ?? 'peach';
  const icon = value => `<span class="emoji" aria-hidden="true">${safe(value)}</span>`;
  const categoryBadge = name => `<span class="badge category-badge" data-tone="${tone(name)}">${icon(categoryIcon(name))}${safe(name)}</span>`;
  const tags = row => `<div class="tags">${row.tags.map(t => `<span class="scene-tag">${icon(sceneIcons[t]??'📍')}${safe(t)}</span>`).join('')}</div>`;
  const btn = (label, action, extra='', attrs='') =>
    `<button class="button ${extra}" type="button" data-action="${action}" ${attrs}>${safe(label)}</button>`;
  const iconBtn = (label, action, extra='', attrs='', icon='') =>
    `<button class="button ${extra}" type="button" data-action="${action}" ${attrs}>
      <span class="control-label" data-control-label>${safe(label)}</span>
      <span class="control-icon" aria-hidden="true">${safe(icon)}</span>
    </button>`;
  const wave = () => `<div class="signal" aria-hidden="true">${
    [25,38,64,46,83,57,97,76,52,67,36,18,36,60,91,76,52,31,39,19]
      .map(h => `<span style="--bar:${h}%"></span>`).join('')
  }</div>`;
  const bear = () => `<svg class="bear-doodle" viewBox="0 0 268 192" aria-hidden="true" focusable="false">
    <path d="M34 146c-13-40 5-105 52-121 34-12 102-13 134 20 32 34 19 76-9 100-27 23-136 39-177 1Z" fill="#f5cb8f" opacity=".47"/>
    <g stroke="#533f42" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round">
      <path d="m25 94 7-9 4 10 9 2-9 5-2 9-5-8-8 1 4-8Z" fill="#fff3c6"/>
      <path d="m220 45 6-9 5 9 10 2-8 5-3 11-5-8-11 1 6-7Z" fill="#fff4c9"/>
      <path d="M56 40q5-7 13-8m156 98 8-3m-5 13 8 3M31 129l7 4m169-106 3-6m-10 4-3-6" fill="none"/>
      <path d="M99 54C88 39 68 45 71 61c2 10 10 14 19 13m77-20c10-14 31-11 29 6-1 9-8 14-16 15" fill="#edb989"/>
      <path d="M75 101c-3-31 20-51 58-52 38-1 61 19 61 47 0 28-24 44-60 44-34 1-58-13-59-39Z" fill="#f4cfa6"/>
      <path d="M81 82c4-27 23-47 52-47 28 0 48 18 54 44" fill="none" stroke-width="7"/>
      <path d="M81 82c4-27 23-47 52-47 28 0 48 18 54 44" fill="none" stroke="#9cceb2" stroke-width="3.4"/>
      <path d="M74 84c-9 2-11 9-10 19 1 8 6 13 15 11l5-2-1-27Zm113 0c10 0 15 7 15 16s-5 14-14 15l-5-3 1-26Z" fill="#9cceb2"/>
      <path d="M106 96q4-5 8 0m42 0q5-5 9 0" fill="none"/>
      <path d="M130 101q5-4 10 0l-5 4-5-4Zm5 4v4m-7 0q3 6 7 0 4 5 8 0" fill="none" stroke-width="2.3"/>
      <path d="M93 106q8-5 15 0m54 0q7-6 15-1" fill="none" stroke="#d98d7c" stroke-width="4"/>
      <path d="M55 128c23-10 51-9 77 5 25-15 51-16 79-7l-6 40c-29-7-50-6-73 8-21-15-46-17-71-9Z" fill="#fff9e8"/>
      <path d="M132 134v38m-67-37c18-5 36-3 56 5m-53 4c18-4 36 0 51 6m25-10c20-9 37-10 56-5m-54 14c18-8 34-9 51-5" fill="none" stroke="#a38a76" stroke-width="1.7"/>
      <path d="M74 130q8-9 20-5c5 2 4 8 0 11l-12 2q-9-1-8-8Zm102-5q12-3 18 5c1 5-3 8-8 8l-11-2c-5-4-5-8 1-11Z" fill="#f4cfa6"/>
      <path d="M44 170q18 2 27 0m129 4q18-4 28-2m-185 8q18-1 29 0m131 0 13 1" fill="none" stroke="#9f7b69" stroke-width="1.8"/>
    </g>
  </svg>`;
  const time = t => {
    const n = Math.floor(Math.max(0,t || 0));
    return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
  };
  const clamp = (n,hi) => Number.isInteger(n) ? Math.max(0,Math.min(hi,n)) : 0;
  const KEY = 'scene-english:progress:v1';
  const cloud = window.ELP_PROGRESS;
  const trajectory = window.ELP_TRAJECTORY;
  const trajectoryView = window.ELP_TRAJECTORY_VIEW;
  let memory = {};
  if(!cloud)try { memory = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch {}
  if (typeof memory !== 'object' || Array.isArray(memory)) memory = {};
  if (!memory.lessons || typeof memory.lessons !== 'object' || Array.isArray(memory.lessons)) memory.lessons = {};
  function progress(id) {
    const course = lessons[id];
    let p = Object.hasOwn(memory.lessons,id) ? memory.lessons[id] : null;
    if (!p || typeof p !== 'object' || p.version !== course.version) {
      p = {version:course.version,step:0,passes:0,done:[],answers:[],graded:false};
      memory.lessons[id] = p;
    }
    p.step = clamp(p.step,6);
    p.passes = clamp(p.passes,3);
    p.done = Array.isArray(p.done) ? [...new Set(p.done.filter(n => Number.isInteger(n) && n>=0 && n<=6 && (n!==0 || p.passes===3)))] : [];
    p.answers = Array.isArray(p.answers) ? p.answers.map(x=>typeof x==='string'?x:'').slice(0,course.practice.gaps.length) : [];
    p.graded = p.graded === true;
    return p;
  }
  function persist() {
    if(cloud?.enabled){cloud.persist(memory);return;}
    if(cloud)return;
    try { localStorage.setItem(KEY,JSON.stringify(memory)); } catch {}
  }
  const episodeAudio = Studio && fullAudio ? Studio.create(main,fullAudio,persist) : null;
  const filters = {search:'', category:'', scene:'', level:'', page:0, expanded:''};
  let homeCategory='';
  let active = null, section = '', segment = null, countRound = false, reference = false;
  let rate = 1, lang = 'dual', audioError = '', frame = 0;
  const PAGE_SIZE = 18;

  function showTrajectory(snapshot = trajectory?.snapshot, status = trajectory?.status) {
    if (!curated || !trajectoryView) return;
    if (section === 'trajectory') trajectoryView.renderPage(main, snapshot, status);
    else if (section === 'study') trajectoryView.mountStudy(main, snapshot, status);
  }
  trajectory?.subscribe(showTrajectory);

  function renderTrialHome() {
    if(series&&window.ELP_TRIAL_DIRECTORY){
      const directoryLearning=cloud?.enabled?memory.cloudReady?memory.lessons:null:undefined;
      window.ELP_TRIAL_DIRECTORY.mount(main,{catalog:catalog.map(row=>({...row,sceneImage:lessons[row.id]?.sceneImage})),
        ready:[...series],feature:featured,learning:directoryLearning,
        activity:memory.activity, listening:cloud?.enabled&&memory.cloudReady?lastListening:null,
        resume:cloud?.enabled&&memory.cloudReady?lastListening(memory.last):null,
        ...(directoryLearning!==undefined?{motionFor}:{})});
      return;
    }
    const row=byId.get(featured), course=lessons[featured], p=progress(featured);
    const resume=p.trialTab?'继续学习':'开始学对话';
    main.innerHTML=`
      <div class="hero trial-hero">
        <div class="hero-copy">
          <div class="row trial-labels"><span class="ep">${ep(row)} · 试听课</span>${categoryBadge(row.category)}${badge(row.difficulty,'neutral')}</div>
          ${trialTitle(row)}
          <p class="trial-goal">${safe(course.goal)}</p>
          <div class="row trial-actions">
            <a class="button primary" href="#whole">听完整节目</a>
            <a class="button button-ghost" href="#core">${resume}</a>
          </div>
        </div>
        ${trialArt(course)}
      </div>
      ${series?renderTrialDirectory():''}`;
  }
  function lastListening(id){
    const p=memory.lessons[id], course=lessons[id];
    if(!p||!course||!series?.includes(id))return null;
    let mode=p.resumeView||(p.episodeView==='notes'?(p.episodeAt>0?'whole':'core'):p.episodeView)||(p.episodeAt>0?'whole':'core');
    if(mode==='core'&&!(p.trialAt>0||p.dialogueFinished)&&p.episodeAt>0)mode='whole';
    else if(mode==='whole'&&!(p.episodeAt>0||p.episodeFinished)&&p.trialAt>0)mode='core';
    const duration=mode==='whole'?course.episodeStudy?.duration:course.duration;
    const at=Math.max(0,Math.min(duration||0,Number(mode==='whole'?p.episodeAt:p.trialAt)||0));
    return {id,mode,at,duration:duration||0,finished:mode==='whole'?p.episodeFinished:p.dialogueFinished,
      hasPosition:at>0||(mode==='whole'?p.episodeFinished:p.dialogueFinished)};
  }
  const motionGuard=(() => {
    let hydrated=false;
    const prevSnapshots=new Map(), consumed=new Set();
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    function consumeOnce(key){
      if(consumed.has(key))return false;
      consumed.add(key);
      try{
        if(sessionStorage.getItem(key))return false;
        sessionStorage.setItem(key,'1');
      }catch{}
      return true;
    }
    function evaluate(episodeId,next){
      const prev=prevSnapshots.get(episodeId);
      prevSnapshots.set(episodeId,{...next});
      if(!hydrated||!prev)return null;
      const submittedNow=!prev.submitted&&next.submitted,completedNow=!prev.done&&next.done;
      if(submittedNow||completedNow){
        const outcome=completedNow?'course':'practice';
        const key=`elp-motion:${episodeId}:complete:${completedNow?'fin':'sub'}`;
        return consumeOnce(key)?{type:'complete',outcome,from:prev.ratio,to:completedNow?1:next.ratio,reduced:reduced.matches}:null;
      }
      if(prev.status==='new'&&next.status==='active'){
        const key=`elp-motion:${episodeId}:start`;
        return consumeOnce(key)?{type:'start',reduced:reduced.matches}:null;
      }
      if(prev.mode===next.mode&&next.ratio>prev.ratio&&next.at-prev.at>=2){
        const key=`elp-motion:${episodeId}:advance:${next.mode}:${Math.floor(next.at)}`;
        return consumeOnce(key)?{type:'advance',from:prev.ratio,to:next.ratio,reduced:reduced.matches}:null;
      }
      return null;
    }
    function cancelIn(root){
      if(!root?.querySelectorAll)return;
      root.querySelectorAll('[class*="is-motion-"]').forEach(el=>{
        el.getAnimations?.({subtree:true}).forEach(animation=>animation.cancel());
        [...el.classList].filter(name=>name.startsWith('is-motion-')).forEach(name=>el.classList.remove(name));
      });
    }
    function hydrate(entries){
      if(hydrated)return;
      for(const [episodeId,next] of entries)prevSnapshots.set(episodeId,{...next});
      hydrated=true;
    }
    return{evaluate,hydrate,cancelIn,consumeOnce};
  })();
  const motionMessages={course:'课程已完成',practice:'练习已提交',start:'课程开始学习',advance:'学习进度已更新'};
  const motionAnnouncements=new Set(), motionLive=document.createElement('p');
  motionLive.className='sr';
  motionLive.dataset.learningMotionLive='';
  motionLive.setAttribute('role','status');
  motionLive.setAttribute('aria-live','polite');
  function queueMotionAnnouncement(event){
    const pending=motionAnnouncements.size>0;
    motionAnnouncements.add(motionMessages[event.outcome||event.type]);
    if(pending)return;
    queueMicrotask(()=>{
      motionLive.textContent=[...motionAnnouncements].join('；');
      motionAnnouncements.clear();
    });
  }
  function motionSnapshot(episodeId){
    const saved=lastListening(episodeId),p=memory.lessons[episodeId];
    const status=window.ELP_TRIAL_DIRECTORY?.lessonStatus?.(p)||'new';
    return{
      status,
      ratio:status==='done'?1:saved?.duration?Math.max(0,Math.min(1,saved.at/saved.duration)):0,
      done:status==='done',
      submitted:p?.trialSubmitted===true,
      at:saved?.at||0,
      mode:saved?.mode||''
    };
  }
  function motionFor(episodeId){
    const event=motionGuard.evaluate(episodeId,motionSnapshot(episodeId));
    if(event)queueMotionAnnouncement(event);
    return event;
  }
  function hydrateMotionState(){
    if(!series||!window.ELP_TRIAL_DIRECTORY)return;
    main.after(motionLive);
    motionGuard.hydrate(catalog.map(row=>[row.id,motionSnapshot(row.id)]));
  }
  const trialTitle=row=>`<h1><span class="trial-title-zh" lang="zh">${safe(row.titleZh)}</span><span class="trial-title-en" lang="en">${safe(row.title)}</span></h1>`;
  const trialArt=(course,lazy=false)=>course.sceneImage
    ?`<figure class="trial-scene"><img ${lazy?'loading="lazy"':''} decoding="async" src="${safe(course.sceneImage)}" alt="" width="768" height="512"></figure>`
    :Studio.cover();
  function renderTrialDirectory(){
    return `<section class="trial-directory" aria-labelledby="trial-directory-title">
      <div class="between section-top"><h2 id="trial-directory-title">试听课程目录</h2><span class="badge neutral">10 节初级课</span></div>
      <div class="grid-three">${series.map(id=>{
        const row=byId.get(id),course=lessons[id];
        return `<article class="card trial-directory-card">
          <a class="trial-directory-cover" href="${trialUrl(id,'whole')}" aria-label="${safe(row.titleZh)} · ${safe(row.title)}">${trialArt(course,true)}</a>
          <div class="trial-directory-body">
            <div class="row"><span class="ep">${ep(row)}</span>${categoryBadge(row.category)}</div>
            <h3><span class="trial-title-zh" lang="zh">${safe(row.titleZh)}</span><span class="trial-title-en" lang="en">${safe(row.title)}</span></h3>
            <div class="row"><a class="button primary" href="${trialUrl(id,'whole')}">听完整节目</a>
            <a class="button button-ghost" href="${trialUrl(id,'core')}">学核心对话</a></div>
          </div></article>`;
      }).join('')}</div></section>`;
  }

  function renderHome() {
    const last = ready.find(row => row.id===memory.last);
    const unfinished = last && progress(last.id).done.length < 7;
    const start = (unfinished ? last : ready.find(row=>progress(row.id).done.length < 7)) ?? ready[0];
    const startLabel = unfinished ? '继续上次' : progress(start.id).done.length===7 ? '重温样课' : '开始学习';
    main.innerHTML = `
      <div class="hero">
        <div class="hero-copy"><h1>把一段英语<span>听透。</span></h1>
          <a class="button primary" href="#lesson/${start.id}">${startLabel} →</a>
        </div>
        ${Studio?Studio.brand():bear()}
      </div>
      <div class="between section-top"><h2>样课</h2><a href="#sounds">Module 0 · 发音基础</a></div>
      <div class="row home-filters" aria-label="样课分类">${['',...Object.keys(categories)].map(name=>`
        <button class="button filter-chip" type="button" data-action="home-category" data-category="${safe(name)}"
          data-tone="${tone(name)}" aria-pressed="${name===homeCategory}">${name?icon(categoryIcon(name)):''}${safe(name||'全部')}</button>`).join('')}
      </div>
      <p class="sr" id="home-count" role="status"></p>
      <div class="grid-three" id="home-lessons"></div>`;
    renderHomeCards();
  }
  function renderHomeCards() {
    const rows=homeCategory?ready.filter(row=>row.category===homeCategory):ready;
    q('#home-count').textContent=rows.length+' 节样课';
    qa('[data-action=home-category]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.category===homeCategory)));
    q('#home-lessons').innerHTML=rows.map(row => {
        const p = progress(row.id), count = p.done.length;
        return `<article class="card lesson-card" data-tone="${tone(row.category)}">
          <div class="between"><span class="ep">${ep(row)}</span>${badge(row.difficulty,'neutral')}</div>
          <div><h3>${safe(row.titleZh || row.title)}</h3><p class="en-title" lang="en">${safe(row.title)}</p></div>
          <div class="row card-category">${categoryBadge(row.category)}</div>${tags(row)}
          <div class="step-meter" aria-hidden="true">${order.map((_,i)=>`<i class="${p.done.includes(i)?'done':''}"></i>`).join('')}</div>
          <div class="between card-foot">
            <span class="progress-note">${count}/7 步</span>
            <a class="button" href="#lesson/${row.id}">${lessons[row.id].episodeStudy?'打开整期':count===7?'重温':count||p.passes?'继续学习':'开始学习'}</a>
          </div>
        </article>`;
      }).join('');
  }

  function options(list, selected, label=x=>x) {
    return list.map(x=>`<option value="${safe(x)}" ${x===selected?'selected':''}>${safe(label(x))}</option>`).join('');
  }
  const upstream = path => report.repository+'/blob/'+report.commit+'/'+path;
  const offline = location.protocol==='file:'&&!library.trial;
  const transcriptHref = row => offline?'../.source/EnglishPod/'+row.textPath:upstream(row.textPath);
  const sourceAudioHref = row => offline&&row.audioInWorkbench
    ? '../workbench/audio/'+encodeURIComponent(row.audioPath.split('/').at(-1)) : (row.audioUrl || upstream(row.audioPath));
  function renderResources() {
    const scenes = [...new Set(catalog.flatMap(row => row.tags))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
    main.innerHTML = `<h1>资源台账</h1>
      <p class="stat-line">${library.trial?`${report.paired} 期已索引 · ${ready.length} 节样课 · 原音在线读取`:report.cachedAudio===report.paired && report.localTranscripts===report.paired
        ? report.paired+' 期 · 原音与文稿均在本机'
        : report.paired+' 期已配对 · '+report.cachedAudio+' 期已缓存音频'}</p>
      <div class="filters">
        <label>搜标题、标签或期号<input id="search" type="search" value="${safe(filters.search)}" placeholder="例：酒店 / EP003"></label>
        <label>大分类<select id="category"><option value="">全部</option>${options(Object.keys(categories),filters.category,x=>categoryIcon(x)+' '+x)}</select></label>
        <label>场景<select id="scene"><option value="">全部</option>${options(scenes,filters.scene,x=>(sceneIcons[x]??'📍')+' '+x)}</select></label>
        <label>难度<select id="level"><option value="">全部</option>${options(['初级','中级','高级','待核'],filters.level)}</select></label>
      </div>
      <p id="resource-count" class="tiny" role="status"></p>
      <div id="resource-results" class="card list-card"></div>
      <div id="pagination" class="row pagination"></div>`;
    renderResourceResults();
  }
  function renderResourceResults() {
    const query = filters.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const matches = catalog.filter(row => {
      const hay = [ep(row),row.id,row.episode,row.title,row.titleZh,row.series,row.category,...row.tags].join(' ').toLowerCase();
      return query.every(word=>hay.includes(word)) && (!filters.category || filters.category===row.category) &&
        (!filters.scene || row.tags.includes(filters.scene)) && (!filters.level || filters.level===row.difficulty);
    });
    const pages = Math.max(1,Math.ceil(matches.length/PAGE_SIZE));
    filters.page = Math.max(0,Math.min(filters.page,pages-1));
    q('#resource-count').textContent = `${matches.length} 期`;
    const markup = matches.slice(filters.page*PAGE_SIZE,(filters.page+1)*PAGE_SIZE).map(row => {
      const open = filters.expanded===row.id;
      return `<article class="resource-row">
        <span class="ep">${ep(row)}</span>
        <div><p class="resource-title">${safe(row.titleZh||row.title)}</p>
          ${row.titleZh?`<p class="tiny" lang="en">${safe(row.title)}</p>`:''}</div>
        <div class="resource-meta"><div class="row">
          ${categoryBadge(row.category)} ${badge(row.difficulty,row.difficulty==='待核'?'pending':'')}
        </div>${tags(row)}</div>
        <div class="actions row">
          ${lessons[row.id]?`<a class="button primary" href="#lesson/${row.id}">学习</a>`:''}
          ${btn(open?'收起':'素材','resource','subtle',`data-id="${row.id}" aria-expanded="${open}" aria-controls="detail-${row.id}"`)}
        </div>
        <div id="detail-${row.id}" class="resource-detail" ${open?'':'hidden'}>
          <p>${library.trial?'原音在线':row.localAudio?'音频已缓存':'音频按需缓存'} · ${row.cueCount} 条原始字幕 · ${lessons[row.id]?'完整样课':'学习模块待编写'}</p>
          <p class="tiny">标签：${safe(row.tagBasis)}。难度：${safe(row.levelBasis)}${row.sourceCode?`（${safe(row.sourceCode)}）`:''}${row.levelConflict?`；源标题标「${safe(row.titleLevel)}」，与文件等级不同`:''}。</p>
          <div class="row"><a href="${safe(sourceAudioHref(row))}" target="_blank" rel="noopener">原音频</a>
            <a href="${safe(transcriptHref(row))}" target="_blank" rel="noopener">原始文稿</a></div>
        </div>
      </article>`;
    }).join('');
    q('#resource-results').innerHTML = markup || '<p class="empty">没有匹配的课程。</p>';
    q('#pagination').innerHTML = pages > 1 ? `${btn('上一页','page','',`data-move="-1" ${filters.page===0?'disabled':''}`)}
      <span class="tiny">${filters.page+1} / ${pages}</span>
      ${btn('下一页','page','',`data-move="1" ${filters.page===pages-1?'disabled':''}`)}` : '';
  }

  function soundCards(keys) {
    return keys.map(key => {
      const [title,help,example] = concept[key];
      return `<article class="card stage-card"><h3>${safe(title)}</h3><p>${safe(help)}</p><p class="muted">${safe(example)}</p></article>`;
    }).join('');
  }
  function renderSounds() {
    main.innerHTML = `<a class="crumb" href="#study">← ${single?'试听首页':'样课'}</a>
      <h1>Module 0 · 发音基础</h1>
      <div class="stage-content section-top">${soundCards(Object.keys(concept))}</div>`;
  }

  function audioControls(blind=false) {
    return `<div class="audio-controls ${blind?'blind':''}">
      ${btn('播放','play','primary','data-player-toggle')}
      ${blind?'<progress data-blind-bar max="1" value="0" aria-label="本遍播放进度"></progress>':
        '<input data-seek type="range" min="0" max="1" value="0" step=".1" aria-label="播放位置">'}
      <span class="time" data-player-time>0:00</span>
      <select id="rate" aria-label="播放速度">${[0.8,1,1.25].map(n=>`<option value="${n}" ${n===rate?'selected':''}>${n}×</option>`).join('')}</select>
    </div><p class="audio-error" role="status" data-audio-error ${audioError?'':'hidden'}>${safe(audioError)}</p>`;
  }
  function english(value,cl='text-line') { return `<p class="${cl}" lang="en">${safe(value)}</p>`; }
  function sectionCard(title,content) { return `<article class="card stage-card"><h3>${safe(title)}</h3>${content}</article>`; }
  function pair(a,b,labels,red=false) {
    return `<div class="compare"><p class="${red?'avoid':'dim'}"><strong>${labels[0]}</strong><span lang="en">${safe(a)}</span></p>
      <p class="prefer"><strong>${labels[1]}</strong><span lang="en">${safe(b)}</span></p></div>`;
  }
  function stageBody(course,p) {
    switch (p.step) {
      case 0: {
        const here = Math.min(p.passes,2);
        return `<article class="card blind-card">
          <div class="rounds" aria-label="已听 ${p.passes} 遍">${[0,1,2].map(i=>
            `<span class="${i<p.passes?'done':i===here?'here':''}">${i<p.passes?'✓ ':''}第 ${i+1} 遍</span>`).join('')}</div>
          <h3>${p.passes===3?'三遍已听完':safe(course.blind[here])}</h3>
          ${course.episodeStudy&&Studio?Studio.cover():wave()}${audioControls(true)}
        </article>`;
      }
      case 1: return `
        <div class="card stage-card">${audioControls()}
          <div class="between section-top"><h3>${course.transcriptMode==='guide'?'双语导读':'对话文稿'}</h3>
            <div class="row">${course.transcriptMode==='guide'?`<a class="button" href="${safe(transcriptHref(active.row))}" target="_blank" rel="noopener">原始文稿</a>`:''}
            ${single?'':btn('显示中文','language','','aria-pressed="'+(lang==='dual')+'"')}</div></div>
          <div class="cue-list" data-lang="${lang}">${course.cues.map((c,i)=>`
            <button type="button" class="cue" data-action="cue" data-cue="${i}">
              <span class="tiny">${time(c.start)} · ${safe(c.speaker)}</span>
              <span class="en" lang="en" data-copy="en">${safe(c.en)}</span><span class="zh" lang="zh">${safe(c.zh)}</span>
            </button>`).join('')}</div>
        </div>
        ${course.episodeStudy&&Studio?Studio.vocab(course.episodeStudy):
          `<div class="gloss">${course.glossary.map(g=>sectionCard(g.phrase,
          english(g.english,'muted')+`<p>${safe(g.chinese)}</p>${btn('听原句','cue','',`data-cue="${g.cue-1}"`)}`)).join('')}</div>`}`;
      case 2: return course.contrast.map(item=>sectionCard(item.context,
        pair(item.avoid,item.prefer,['这个场景里易踩雷','更合适的说法'],true)+`<p>${safe(item.why)}</p>`)).join('');
      case 3: return `<h3>Module 4 · 生活到职场</h3>
        ${course.strategy.map(item=>sectionCard(item.title,pair(item.casual,item.work,['生活','职场'])+`<p>${safe(item.why)}</p>`)).join('')}
        <h3>Module 6 · 潜台词</h3>
        ${course.subtext.map(item=>sectionCard(item.reading,`<p class="subtext" lang="en">${safe(item.line)}</p>
          <p>${safe(item.evidence)}</p><p>接话：<span lang="en">${safe(item.response)}</span></p>`)).join('')}`;
      case 4: return course.patterns.map(item=>sectionCard(item.use,
        `<p class="pattern" lang="en">${safe(item.frame)}</p>${english(item.example)}`)).join('');
      case 5: return `${course.episodeStudy&&Studio?Studio.pronunciation(course.episodeStudy):`<div class="card stage-card">${audioControls()}</div>
        ${course.pronunciation.map(item=>sectionCard(concept[item.concept][0],
          `${english(item.target)}<p>${safe(item.listen)}</p><p>${safe(item.practice)}</p>
          <div class="row">${btn('听这段','cue','',`data-cue="${item.cue-1}"`)}
          ${btn('循环本段','loop','',`data-cue="${item.cue-1}" aria-pressed="false"`)}</div>`)).join('')}`}
        <details class="card stage-card"><summary>Module 0 · 发音基础</summary>
          ${[...new Set(course.pronunciation.map(item=>item.concept))].map(k=>`<p><strong>${concept[k][0]}</strong>：${concept[k][1]}</p>`).join('')}
        </details>`;
      case 6: return outputBody(course,p);
    }
  }

  function normalize(answer) {
    return answer.normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").trim()
      .replace(/[.!?,;:]+$/g,'').trim().replace(/\s+/g,' ');
  }
  function gapFeedback(item, answer, graded) {
    if (!graded) return '';
    return item.answers.some(expected=>normalize(answer)===normalize(expected))
      ? '<span class="correct">✓ 正确</span>'
      : `<span class="wrong">参考：<span lang="en">${safe(item.answers[0])}</span></span>`;
  }
  function selfCheck(rewrite){
    const chinese=String(rewrite.check??''),english=String(rewrite.checkEn??ui?.translation(chinese)??'');
    return english&&english!==chinese
      ? `<p><span data-i18n><span lang="zh">自检：${safe(chinese)}</span><span lang="en">Self-check: ${safe(english)}</span></span></p>`
      : `<p>自检：${safe(chinese)}</p>`;
  }
  function outputBody(course,p,trial=false) {
    if(trial){
      const rewrite=course.practice.rewrite, submitted=p.trialSubmitted===true;
      return `<form id="trial-exercises" class="card stage-card trial-panel">
        <h2>练习</h2><h3>填空</h3>
        ${course.practice.gaps.map((item,i)=>`<div class="gap-field">
          <label><span lang="en">${safe(item.prompt)}</span><input name="gap-${i}" autocomplete="off" spellcheck="false" required maxlength="120" value="${safe(p.trialAnswers?.[i]||'')}"></label>
          <span class="tiny">${safe(item.hint)}</span>
          <p class="gap-feedback" data-result="${i}">${gapFeedback(item,p.trialAnswers?.[i]||'',submitted)}</p>
        </div>`).join('')}
        <h3>换个场景</h3><p>${safe(rewrite.task)}</p>
        <label class="sr" for="trial-rewrite">写下你的表达</label>
        <textarea id="trial-rewrite" name="rewrite" required maxlength="1200" placeholder="先写一句，或先自己说一遍。">${safe(p.trialRewrite||'')}</textarea>
        <div class="row"><button class="button primary" type="submit">提交练习</button><p data-trial-result role="status">${submitted?'✓ 练习已提交':''}</p></div>
        <div class="reference" data-trial-model ${submitted?'':'hidden'}><h3>参考表达</h3>${english(rewrite.reference)}${selfCheck(rewrite)}</div>
      </form>`;
    }
    return `<article class="card stage-card"><h3>填空</h3>
      <form id="gaps">${course.practice.gaps.map((item,i)=>`<div class="gap-field">
        <label><span lang="en">${safe(item.prompt)}</span>
          <input name="gap-${i}" aria-describedby="hint-${i}" spellcheck="false" autocapitalize="none"
            autocomplete="off" required maxlength="120" value="${safe(p.answers[i]||'')}"></label>
        <span class="tiny" id="hint-${i}">${safe(item.hint)}</span>
        <p class="gap-feedback" data-result="${i}" role="status">${gapFeedback(item,p.answers[i]||'',p.graded)}</p>
      </div>`).join('')}
      <button class="button" type="submit">检查填空</button></form>
      </article>
      <article class="card stage-card"><h3>换个场景</h3><p>${safe(course.practice.rewrite.task)}</p>
        <label class="sr" for="rewrite">写下你的表达</label>
        <textarea id="rewrite" maxlength="1200" placeholder="先写一句，或先自己说一遍。"></textarea>
        <div class="row">${btn(reference?'收起参考':'查看参考表达','reference','','aria-controls="rewrite-reference" aria-expanded="'+reference+'"')}</div>
        <div id="rewrite-reference" class="reference" ${reference?'':'hidden'}>
          ${english(course.practice.rewrite.reference)}${selfCheck(course.practice.rewrite)}
        </div>
      </article>`;
  }

  const lessonHead=(row,goal='')=>`<div class="lesson-head">
      <a class="crumb" href="#study">← ${single?'试听首页':'样课'}</a>
      <div class="row"><span class="ep">${ep(row)}</span>${categoryBadge(row.category)}${badge(row.difficulty,'neutral')}</div>
      <h1>${safe(row.titleZh||row.title)}</h1>
      ${goal?`<p>${safe(goal)}</p>`:''}
    </div>`;
  const listenModes=[['dual','中英双语','Bilingual'],['en','仅看英文','English only'],['off','盲听模式','Blind listening']];
  let listenMode='dual';
  try{const v=localStorage.getItem('elp-listen-mode');if(listenModes.some(([key])=>key===v))listenMode=v;}catch{}
  let queuedCoreAction=null;
  const modeBar=(visible=true)=>`<div class="listen-modes" role="group" aria-label="字幕与盲听 / Captions and listening" ${visible?'':'hidden'}>${listenModes.map(([key,zh,en])=>
    `<button type="button" data-listen-mode="${key}" aria-pressed="${listenMode===key}"><span data-i18n><span lang="zh">${zh}</span><span lang="en">${en}</span></span></button>`).join('')}</div>`;
  const trialHead=(row,other,url)=>`<div class="lesson-head trial-lesson-head">
    <div class="between"><span class="ep">${ep(row)}</span><nav class="learn-steps" aria-label="学习路径">
      ${[['whole','1 · 整期节目','Full episode'],['core','2 · 核心对话','Core dialogue']].map(([key,zh,en])=>`<a href="${trialUrl(row.id,key)}" ${active&&progress(active.id).episodeView===key?'aria-current="page"':''}><span data-i18n><span lang="zh">${zh}</span><span lang="en">${en}</span></span></a>`).join('')}</nav></div>
    ${trialTitle(row)}</div>`;
  const currentCueIndex=(pos=player.currentTime||0)=>Math.max(0,active.course.cues.findLastIndex(cue=>pos>=cue.start));
  const trialCueList=course=>`<div class="cue-list" data-lang="dual" data-trial-lines>${course.cues.map((c,i)=>
    `<div class="cue-row"><button type="button" class="cue" data-action="cue" data-cue="${i}">
      <span class="tiny">${time(c.start)} · <span>${safe(c.speaker)}</span></span>
      <span class="en" lang="en" data-copy="en">${course.transcriptMode==='guide'?safe(c.en):Array.isArray(c.highlights)?window.ELP_SCENE.html(c.en,c.highlights,'en'):Studio.mark(c.en,course.episodeStudy?.highlights)}</span>
      <span class="zh" lang="zh">${Array.isArray(c.highlights)?window.ELP_SCENE.html(c.zh,c.highlights,'zh'):safe(c.zh)}</span></button>
      <button type="button" class="cue-loop" data-action="loop" data-cue="${i}" data-loop-icon="true" aria-pressed="false" aria-label="循环第 ${i+1} 句">↻</button></div>`).join('')}</div>`;
  function renderTrialCore(){
    const {course,row,id}=active,p=progress(id),tab=savedTrialTab(p);
    if(tab==='practice')player.pause();
    const guide=course.transcriptMode==='guide';
    const cueTitle=guide?'双语导读':'逐句字幕';
    const blind=listenMode==='off';
    const actorMotion=course.episodeStudy?.sceneLayers?.shots?.length&&Studio?.officeScene;
    p.trialTab=tab;persist();
    const audio=tab==='practice'?'':`
      <div class="audio-controls trial-audio">
        ${tab==='dialogue'&&course.sceneImage?`<img class="core-thumb" src="${safe(course.sceneImage)}" alt="" width="46" height="36">`:''}
        ${iconBtn('播放','play','primary','data-player-toggle aria-label="播放 / Play"','▶')}
        ${iconBtn('重听本句','cue','','data-core-current data-cue="'+currentCueIndex(p.trialAt||0)+'" aria-label="重听本句 / Listen again"','↺')}
        ${iconBtn('单句循环','loop','','data-core-current data-cue="'+currentCueIndex(p.trialAt||0)+'" aria-pressed="false" aria-label="单句循环 / Loop this line"','↻')}
        <input data-seek type="range" min="0" max="1" value="0" step=".1" aria-label="播放位置">
        <span class="time" data-player-time>0:00</span>
        ${tab==='dialogue'?`<output class="core-cue-count" data-core-count></output>`:''}
      </div>
    `;
    const audioStatus=tab==='practice'?'':`<p class="audio-error core-audio-error" role="status" data-audio-error hidden></p>`;
    const tabLabel=key=>{
      const copy={
        dialogue:guide?{long:'双语导读',short:'字幕',longEn:'Bilingual guide',shortEn:'Guide'}
          :{long:'逐句字幕',short:'字幕',longEn:'Line by line',shortEn:'Lines'},
        words:{long:'重点词组',short:'词组',longEn:'Key phrases',shortEn:'Phrases'},
        practice:{long:'练习',short:'练习',longEn:'Practice',shortEn:'Practice'}
      }[key];
      return `<span class="core-label core-label-long" data-i18n><span lang="zh">${safe(copy.long)}</span><span lang="en">${safe(copy.longEn)}</span></span>
        <span class="core-label core-label-short" data-i18n><span lang="zh">${safe(copy.short)}</span><span lang="en">${safe(copy.shortEn)}</span></span>`;
    };
    const content=tab==='dialogue'?`<section class="card stage-card trial-panel">
      <h2 class="sr">${cueTitle}</h2>
      ${actorMotion?`<div class="trial-scene" data-trial-stage ${blind?'hidden':''}>${Studio.officeScene(course.episodeStudy)}${Studio.dialogueLogo()}</div>`:''}
      <div class="core-blind-notice" data-core-blind-notice ${blind?'':'hidden'}>
        <p>当前为盲听模式，逐句字幕已隐藏。</p>
        <button type="button" data-listen-mode="dual">恢复中英双语</button>
      </div>
      <div class="core-blind" data-core-blind ${blind?'':'hidden'}>${trialArt(course)}</div>
      ${guide?`<p class="tiny guide-notice">按段概括原音，不是逐字字幕。 <a href="${safe(upstream(row.textPath))}" target="_blank" rel="noopener">查看原始文稿</a></p>`:''}
      <div data-trial-transcript data-core-mode="${listenMode}" ${blind?'hidden':''}>${trialCueList(course)}</div>
    </section>`:tab==='words'?`<section class="card stage-card trial-panel"><h2>重点词组</h2>
      ${trialVocabulary(course,true)}</section>`:outputBody(course,p,true);
    main.innerHTML=trialHead(row,'听完整节目',trialUrl(id,'whole'))+modeBar(tab==='dialogue')+`<div class="core-sticky-bar" data-core-view="${tab}"><nav class="row trial-core-tabs" aria-label="核心对话">${trialTabs.map(([key])=>
      `<button class="button" type="button" data-action="trial-tab" data-trial-tab="${key}" aria-pressed="${tab===key}">${tabLabel(key)}</button>`).join('')}</nav>
      ${audio}</div>${audioStatus}${content}${handoutActions(id,true)}`;
    if(actorMotion)window.ELP_HOST_MOTION?.prepareLayers(course.episodeStudy.sceneLayers);
    if(library.localHandout){
      const download=q('.trial-download a');
      download.addEventListener('click',()=>{
        download.href=URL.createObjectURL(new Blob([Uint8Array.from(atob(library.localHandout),c=>c.charCodeAt(0))],{type:'application/pdf'}));
        const url=download.href;
        setTimeout(()=>URL.revokeObjectURL(url),30000);
      });
    }
    if(tab!=='practice'&&course.trialAudio&&!active.clipUrl&&!active.audioRequested)loadTrialAudio();
    syncPlayer();
  }
  const handoutActions=(id,preview=false)=>`<div class="row trial-download">
    ${preview&&series?`<a class="button button-ghost" href="${trialUrl(id,'notes')}">在线预览讲义</a>`:''}
    <a class="trial-text-link" href="./${series?'handouts/'+id:'ep040-handout'}.pdf" download="${id.toUpperCase().replace('-','')}-handout.pdf">📄 下载双语讲义</a></div>`;
  function trialVocabulary(course,replay=false){
    return `<div class="trial-words">${course.trialNotes.words.map(item=>`<article>
      <h3 lang="en">${safe(item.term)}</h3>
      <p lang="zh" data-trial-translation="zh">${safe(item.zh)}</p>
      ${item.en?`<p lang="en" data-trial-translation="en">${safe(item.en)}</p>`:''}
      <p lang="en" class="pattern">${safe(item.form)}</p>
      <p class="tiny">教学例句</p>${english(item.example)}
      ${item.tip?`<p>${safe(item.tip)}</p>`:''}
      ${replay?btn(course.transcriptMode==='guide'?'听相关段落':'听原句','cue','',`data-cue="${item.cue-1}"`):''}</article>`).join('')}</div>`;
  }
  function renderTrialNotes(row,course,id){
    main.innerHTML=trialHead(row,'学核心对话',trialUrl(id,'core'))+`
      <article class="card stage-card trial-panel trial-handout">
        <div class="between"><h2>双语讲义</h2><div class="trial-handout-logo">${Studio.brand()}<span>Marco · Erica</span></div></div>
        ${trialArt(course)}
        <h3>${course.transcriptMode==='guide'?'双语导读':'核心对话'}</h3>
        ${course.transcriptMode==='guide'?'<p class="tiny">按段概括原音，不是逐字字幕。</p>':''}
        ${course.cues.map((cue,index)=>`<div class="ep-notes-row">
          <span class="tiny">${time(cue.start)} · ${safe(cue.speaker)}</span>
          <p lang="en" data-copy="en">${safe(cue.en)}</p><p lang="zh">${safe(cue.zh)}</p>
          ${course.trialNotes.lines[index]?`<p class="tiny" lang="zh">${safe(course.trialNotes.lines[index])}</p>`:''}</div>`).join('')}
        <h3>重点词组</h3>${trialVocabulary(course)}
        <h3>高频句型</h3>${course.patterns.map(item=>`<div class="ep-notes-row">
          ${english(item.frame,'pattern')}<p>${safe(item.use)}</p>${english(item.example)}</div>`).join('')}
      </article>${handoutActions(id)}`;
  }
  function renderLesson(focus=false) {
    const {id, course, row} = active;
    const p = progress(id), [title, module] = order[p.step];
    const full = p.done.length===order.length;
    const blocked = (p.step===0 && p.passes<3) || (p.step===6 && !p.graded);
    const nextLabel = p.step===6 ? (full ? '已完成输出' : '完成输出') : `完成并继续 → ${order[p.step+1][0]}`;
    main.innerHTML = `${lessonHead(row,p.step===0?'':course.goal)}
    ${course.episodeStudy&&episodeAudio?Studio.tabs('core'):''}
    <div class="lesson-layout">
      <nav class="step-list" aria-label="学习步骤">
        ${order.map(([name,m],n)=>`<button class="step" data-action="step" data-step="${n}" type="button"
          ${p.step===n?'aria-current="step"':''}>
          <span class="step-num">${p.done.includes(n)?'✓':String(n+1).padStart(2,'0')}</span><span>${name}</span><span class="mod">${m}</span>
        </button>`).join('')}
      </nav>
      <section class="stage" aria-labelledby="step-title">
        <div class="between stage-title">
          <h2 id="step-title" tabindex="-1">${title} ${module?`<span class="mod">${module}</span>`:''}</h2>
          <span class="tiny" role="status">${full?'本课完成':`${p.done.length}/7 步已完成`}</span>
        </div>
        ${course.episodeStudy&&episodeAudio?Studio.anchorBar(course.episodeStudy,p.step):''}
        <div class="stage-content">${stageBody(course,p)}</div>
        <div class="stage-actions">
          ${p.step>0 ? btn('上一步','step','subtle',`data-step="${p.step-1}"`):'<span></span>'}
          ${full && p.step===6?`<a class="button primary" href="#study">${single?'返回试听首页':'返回样课'}</a>`:
            btn(nextLabel,'complete','primary',blocked?'disabled':'')}
        </div>
      </section>
    </div>`;
    if(active.course.trialAudio&&!active.clipUrl&&!active.audioRequested)loadTrialAudio();
    syncPlayer();
    if(course.episodeStudy)episodeAudio?.mount();
    if (focus) {
      q('#step-title').focus({preventScroll:true});
      q('.lesson-head').scrollIntoView({block:'start',behavior:'instant'});
    }
  }

  function focusPage() {
    main.focus({preventScroll:true});
    window.scrollTo({top:0,behavior:'instant'});
  }
  function renderEpisodeView(mode,focus=false,autoplay=true){
    if(!active?.course.episodeStudy||!episodeAudio){renderLesson(focus);return;}
    const {id,row,course}=active;
    const p=progress(id);
    const selected=curated?(mode||'core'):['whole','core','notes'].includes(mode)?mode:'whole';
    if(p.episodeView==='core'&&selected!=='core'){
      player.pause();segment=null;countRound=false;audioError='';
    }
    p.episodeView=selected;
    if(curated&&selected==='whole')p.episodeSubtitle=listenMode;
    episodeAudio.setView(selected);
    persist();
    if(curated){
      if(selected==='core')renderTrialCore();
      else if(selected==='notes')renderTrialNotes(row,course,id);
      else{
        main.innerHTML=trialHead(row,'学核心对话',trialUrl(id,'core'))+modeBar()+Studio.whole(course.episodeStudy,true)+handoutActions(id,true);
        episodeAudio.mount();
        if(autoplay)episodeAudio.resume();
      }
      if(focus)focusPage();
      return;
    }
    if(selected==='core'){renderLesson(focus);return;}
    main.innerHTML=lessonHead(row)+Studio.tabs(selected)+(selected==='whole'?
      Studio.whole(course.episodeStudy):Studio.handout(course.episodeStudy,course));
    episodeAudio.mount();
    if(focus)focusPage();
  }
  function route(focus=false,resumeCore=false) {
    motionGuard.cancelIn(main);
    motionLive.textContent='';
    const hash = location.hash.slice(1);
    const [, lessonId, lessonView] = hash.match(/^lesson\/(ep-\d{3})(?:\/(core|whole|notes))?$/) || [];
    const direct = curated&&['whole','core','notes'].includes(hash);
    const mode = direct ? hash : lessonView;
    const id = direct ? featured : lessonId;
    if (id && Object.hasOwn(lessons,id) && byId.has(id)) {
      const p=progress(id);
      const nextMode=mode||p.episodeView||(curated?'core':'whole');
      if (active?.id!==id) {
        releaseTrialAudio();
        segment=null; countRound=false; reference=false; audioError='';
        active = {id,row:byId.get(id),course:lessons[id]};
        episodeAudio?.bind(active.course.episodeStudy,p);
        if(active.course.audio)player.src = active.course.audio;
        player.playbackRate = rate;
        player.load();
      }
      memory.last=id;
      if(cloud?.enabled){
        p.lastOpened=Date.now();
        if(nextMode==='whole'||nextMode==='core')p.resumeView=nextMode;
      }
      active.resumeCore=!!(resumeCore&&nextMode==='core'&&curated);
      if(active.resumeCore)p.trialTab='dialogue';
      persist();
      section='lesson';
      if(active.course.episodeStudy&&episodeAudio)renderEpisodeView(nextMode);
      else renderLesson();
      if(active.resumeCore&&active.clipUrl&&player.readyState>=1)startCoreResume();
    } else {
      if (active) {
        episodeAudio?.clear();
        releaseTrialAudio();active=null;player.load();
        segment=null; countRound=false; audioError='';
      }
      section = curated&&trajectoryView&&hash==='trajectory' ? 'trajectory'
        : !curated&&hash==='resources' ? 'resources' : !curated&&hash==='sounds' ? 'sounds' : 'study';
      if (section==='resources') renderResources();
      else if (section==='sounds') renderSounds();
      else if (section==='trajectory') {
        showTrajectory();
      } else if(curated) {
        renderTrialHome();
        showTrajectory();
      }
      else renderHome();
    }
    trajectory?.showSummary(section==='study'||section==='trajectory');
    for (const [selector,current] of [['#nav-study',single?section!=='sounds':section!=='resources'],['#nav-resources',single?section==='sounds':section==='resources']]) {
      const link=q(selector,document);
      if (current) link?.setAttribute('aria-current','page');
      else link?.removeAttribute('aria-current');
    }
    if (focus) focusPage();
  }
  function startCoreResume(){
    if(!active?.resumeCore||progress(active.id).episodeView!=='core')return;
    active.resumeCore=false;
    segment=null;
    if(player.ended||player.currentTime>=player.duration-.1)player.currentTime=0;
    playMedia(true);
  }
  function releaseTrialAudio(){
    saveCoreTime(true);
    player.pause();player.removeAttribute('src');
    active?.audioRequest?.abort();
    if(active?.clipUrl)URL.revokeObjectURL(active.clipUrl);
  }
  async function loadTrialAudio(){
    const lesson=active;
    lesson.audioRequested=true;
    const request=lesson.audioRequest=new AbortController();
    audioError='正在从来源读取原音…';syncPlayer();
    try{
      const clip=await window.ELP_TRIAL_AUDIO.clip(lesson.course.trialAudio,lesson.course.window,request.signal);
      if(active!==lesson)return;
      lesson.clipUrl=URL.createObjectURL(clip);
      player.src=lesson.clipUrl;
      player.playbackRate=rate;
      audioError='';
    }catch{
      if(active===lesson){queuedCoreAction=null;lesson.resumeCore=false;audioError='原音读取失败。请检查能否访问 GitHub，再点击播放或例句重试。';}
    }finally{
      lesson.audioRequest=null;
      if(active===lesson)syncPlayer();
    }
  }
  player.addEventListener('loadedmetadata',()=>{
    const req=queuedCoreAction;queuedCoreAction=null;
    if(!req||active!==req.lesson||(curated&&progress(active.id).episodeView!=='core'))return;
    if(req.action==='play')togglePlay();else playCue(req.i,req.action==='loop');
  });
  function switchStep(n) {
    if (!active || !Number.isInteger(n) || n<0 || n>6) return;
    const p = progress(active.id);
    if (n===p.step) {q('#step-title').focus();return;}
    episodeAudio?.stopClip();
    player.pause(); player.currentTime=0;
    segment=null; countRound=false;
    if(!active.course.trialAudio||active.clipUrl)audioError='';
    p.step=n;
    persist();
    renderLesson(true);
  }
  function complete() {
    const p=progress(active.id);
    if ((p.step===0&&p.passes!==3)||(p.step===6&&!p.graded)) return;
    if (!p.done.includes(p.step)) p.done.push(p.step);
    if (p.step<6) switchStep(p.step+1);
    else {
      const next=order.findIndex((_,i)=>!p.done.includes(i));
      if (next>=0) switchStep(next);
      else { persist(); renderLesson(true); }
    }
  }

  function syncPlayer() {
    if (!active) return;
    const p=progress(active.id), duration=Number.isFinite(player.duration)?player.duration:active.course.duration;
    const pos=player.currentTime||0;
    syncTrialActors(pos);
    const toggle=q('[data-player-toggle]'), label=q('[data-player-time]');
    const playLabel = player.paused ? (!curated&&p.step===0 ?
      (countRound && pos>0 ? '继续本遍' : p.passes<3 ? `播放第 ${p.passes+1} 遍` : '重听') : '播放') : '暂停';
    if (toggle) {
      const controlLabel=toggle.querySelector('[data-control-label]');
      const controlIcon=toggle.querySelector('.control-icon');
      if (controlLabel) controlLabel.textContent=playLabel;
      else toggle.textContent=playLabel;
      if (controlIcon) controlIcon.textContent=player.paused?'▶':'⏸';
      toggle.setAttribute('aria-label',`${playLabel} / ${playLabel==='暂停'?'Pause':'Play'}`);
    }
    if(toggle)toggle.disabled=!!active.audioRequest;
    if (label) label.textContent = `${time(pos)} / ${time(duration)}`;
    const seek=q('[data-seek]');
    if (seek) {seek.disabled=player.readyState<1;seek.max=duration; seek.value=pos; seek.setAttribute('aria-valuetext',time(pos));}
    const cueCounter=q('[data-core-count]');
    if(cueCounter){
      const i=currentCueIndex(pos);
      cueCounter.textContent=listenMode==='off'?'':`第 ${Math.max(1,i+1)} / ${active.course.cues.length} 句`;
    }
    const bar=q('[data-blind-bar]');
    if (bar) {bar.max=duration||1; bar.value=pos;}
    const error=q('[data-audio-error]');
    if (error) {error.hidden=!audioError; error.textContent=audioError;}
    if (curated||p.step===1) {
      qa('.cue').forEach((el,i) => {
        const cue=active.course.cues[i], on=pos>=cue.start && pos<cue.end;
        if (el.classList.contains('current')!==on) {
          el.classList.toggle('current',on);
          if (on) el.setAttribute('aria-current','true');
          else el.removeAttribute('aria-current');
        }
      });
    }
    qa('[data-core-current]').forEach(el=>{el.dataset.cue=currentCueIndex(pos);});
    qa('[data-action=loop]').forEach(el=>{
      const on=segment?.repeat && segment.index===Number(el.dataset.cue);
      el.setAttribute('aria-pressed',String(!!on));
      if(el.dataset.loopIcon){
        el.textContent=on?'■':'↻';
        el.setAttribute('aria-label',`${on?'停止循环':'循环'}第 ${Number(el.dataset.cue)+1} 句`);
      }else{
        const loopLabel=on?'停止循环':el.hasAttribute('data-core-current')?'单句循环':'循环本段';
        const controlLabel=el.querySelector('[data-control-label]');
        if(controlLabel){
          const controlIcon=el.querySelector('.control-icon');
          controlLabel.textContent=loopLabel;
          if(controlIcon)controlIcon.textContent=on?'■':'↻';
          el.setAttribute('aria-label',`${loopLabel} / ${on?'Stop looping':el.hasAttribute('data-core-current')?'Loop this line':'Loop this section'}`);
        }else el.textContent=loopLabel;
      }
    });
  }
  function syncTrialActors(pos=player.currentTime||0){
    const stage=q('[data-trial-stage]');
    if(!stage||!active?.course.episodeStudy)return;
    const blind=listenMode==='off';
    stage.hidden=blind;
    stage.classList.toggle('is-playing',!blind&&!player.paused&&!player.ended);
    if(!blind) Studio.drawDialogue(stage,active.course.episodeStudy,active.course.window[0]+pos);
  }
  function playMedia(automatic=false) {
    audioError='';
    player.play().catch(error=>{
      if (error.name==='AbortError') return;
      audioError=error.name==='NotAllowedError'&&automatic?'浏览器阻止了自动播放，请点「播放」继续。':'播放失败，请重新打开这节课。';
      syncPlayer();
    });
    syncPlayer();
  }
  function togglePlay() {
    if (!player.paused) {player.pause();return;}
    const p=progress(active.id);
    if(curated){
      segment=null;
      if(player.ended)player.currentTime=0;
    }else if (p.step===0) {
      segment=null;
      if (!countRound || player.ended) player.currentTime=0;
      countRound=true;
    } else if (player.ended) {
      player.currentTime=0; segment=null;
    }
    playMedia();
  }
  function playCue(i,repeat) {
    const cue=active?.course.cues[i];
    if (!cue) return;
    if (repeat && segment?.repeat && segment.index===i) {
      segment=null;player.pause();syncPlayer();return;
    }
    segment={index:i,start:cue.start,end:cue.end,repeat};
    player.currentTime=cue.start;
    playMedia();
  }
  function boundary() {
    if (segment && !player.paused && player.currentTime>=segment.end) {
      if (segment.repeat) player.currentTime=segment.start;
      else {segment=null;player.pause();}
    }
  }
  function pulse() {
    frame=0;
    boundary();
    syncTrialActors();
    if (!player.paused) frame=requestAnimationFrame(pulse);
  }
  player.addEventListener('play',() => {
    if (!frame) frame=requestAnimationFrame(pulse);
    syncPlayer();
  });
  let coreWrite=0;
  function saveCoreTime(force=false){
    if(!curated||!active?.clipUrl||!player.readyState||(!force&&performance.now()-coreWrite<1200))return;
    const p=progress(active.id);
    p.trialAt=player.currentTime;
    coreWrite=performance.now();persist();
  }
  player.addEventListener('pause',()=>{if(frame) cancelAnimationFrame(frame);frame=0;saveCoreTime(true);syncPlayer();});
  player.addEventListener('timeupdate',()=>{boundary();saveCoreTime();syncPlayer();});
  player.addEventListener('loadedmetadata',()=>{
    if(curated&&active?.clipUrl){
      const at=Number(progress(active.id).trialAt)||0;
      if(at>0&&at<player.duration-.1)player.currentTime=at;
      startCoreResume();
    }
    syncPlayer();
  });
  player.addEventListener('seeked',()=>{saveCoreTime(true);syncPlayer();});
  window.addEventListener('pagehide',()=>saveCoreTime(true));
  player.addEventListener('error',()=>{
    if (!active||!player.getAttribute('src')) return;
    countRound=false; audioError='本课音频打不开。请检查课程目录里的 media 文件夹。';syncPlayer();
  });
  player.addEventListener('ended',()=>{
    if (!active) return;
    const p=progress(active.id);
    if(curated){p.dialogueFinished=true;persist();}
    if (!curated&&p.step===0 && countRound) {
      p.passes=Math.min(3,p.passes+1);
      countRound=false;player.currentTime=0;persist();
      renderLesson();
      (p.passes===3?q('[data-action=complete]'):q('[data-player-toggle]'))?.focus({preventScroll:true});
    } else if (segment?.repeat) {
      player.currentTime=segment.start;playMedia();
    } else {
      segment=null;syncPlayer();
    }
  });

  main.addEventListener('input',event=>{
    if(curated&&active&&event.target.closest('#trial-exercises')){
      const p=progress(active.id), form=new FormData(event.target.form);
      p.trialAnswers=active.course.practice.gaps.map((_,i)=>String(form.get('gap-'+i)||''));
      p.trialRewrite=String(form.get('rewrite')||'');
      if(p.trialSubmitted){
        p.trialSubmitted=false;
        event.target.form?.classList.remove('is-motion-practice');
        q('[data-trial-result]').textContent='';
        q('[data-trial-model]').hidden=true;
        qa('[data-result]').forEach(el=>el.textContent='');
      }
      persist();return;
    }
    if(event.target.matches('[data-ep-seek]')){
      episodeAudio?.scrub(Number(event.target.value));return;
    }
    if (section==='resources' && event.target.id==='search') {
      filters.search=event.target.value;filters.page=0;filters.expanded='';renderResourceResults();
    }
    if (active && event.target.matches('[data-seek]')) {
      segment=null;player.currentTime=Number(event.target.value);syncPlayer();
    }
  });
  main.addEventListener('change',event=>{
    if(event.target.matches('[data-ep-language],[data-ep-stickers],[data-ep-rate],[data-ep-loop]')){
      episodeAudio?.preferences(event.target);return;
    }
    const {id,value}=event.target;
    if (section==='resources' && ['category','scene','level'].includes(id)) {
      filters[id]=value;filters.page=0;filters.expanded='';renderResourceResults();
    }
    if (active && id==='rate' && [0.8,1,1.25].includes(Number(value))) {
      rate=Number(value);player.playbackRate=rate;
    }
  });
  main.addEventListener('submit',event=>{
    if(curated&&active&&event.target.id==='trial-exercises'){
      event.preventDefault();
      const p=progress(active.id), form=new FormData(event.target), items=active.course.practice.gaps;
      const names=[...items.map((_,i)=>'gap-'+i),'rewrite'];
      const empty=names.find(name=>!String(form.get(name)||'').trim());
      if(empty){
        event.target.elements.namedItem(empty).focus();
        q('[data-trial-result]').textContent='请先填完练习。';return;
      }
      p.trialAnswers=names.slice(0,-1).map(name=>String(form.get(name)).trim());
      p.trialRewrite=String(form.get('rewrite')).trim();
      p.trialSubmitted=true;persist();
      if(motionGuard.consumeOnce(`elp-motion:${active.id}:practice-feedback`))
        event.target.classList.add('is-motion-practice');
      items.forEach((item,i)=>{q('[data-result="'+i+'"]').innerHTML=gapFeedback(item,p.trialAnswers[i],true);});
      q('[data-trial-model]').hidden=false;
      q('[data-trial-result]').textContent='✓ 练习已提交';
      return;
    }
    if (!active || event.target.id!=='gaps') return;
    event.preventDefault();
    const p=progress(active.id), items=active.course.practice.gaps, form=new FormData(event.target);
    p.answers=items.map((_,i)=>String(form.get('gap-'+i)||'').trim());
    p.graded=true;persist();
    items.forEach((item,i)=>{q('[data-result="'+i+'"]').innerHTML=gapFeedback(item,p.answers[i],true);});
    const next=q('[data-action=complete]');
    if (next) next.disabled=false;
  });
  main.addEventListener('click',event=>{
    const preference=event.target.closest('[data-listen-mode]');
    if(preference&&active){
      listenMode=preference.dataset.listenMode;
      try{localStorage.setItem('elp-listen-mode',listenMode);}catch{}
      qa('[data-listen-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.listenMode===listenMode)));
      const transcript=q('[data-trial-transcript]'),blind=q('[data-core-blind]'),notice=q('[data-core-blind-notice]');
      if(transcript){transcript.hidden=listenMode==='off';transcript.dataset.coreMode=listenMode;}
      if(blind)blind.hidden=listenMode!=='off';
      if(notice)notice.hidden=listenMode!=='off';
      syncTrialActors();
      const p=progress(active.id);p.trialCaptions=listenMode!=='off';
      if(p.episodeView==='whole')episodeAudio?.setSubtitleMode(listenMode);
      syncPlayer();persist();return;
    }

    const link=event.target.closest('a[href]');
    const href=link?.getAttribute('href')||'';
    if(curated&&link&&!link.target&&!event.defaultPrevented&&event.button===0&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey&&
      (href==='#whole'||/^#lesson\/ep-\d{3}\/whole$/.test(href)||link.hasAttribute('data-continue-learning'))){
      event.preventDefault();
      if(location.hash!==href)history.pushState(null,'',href);
      route(true,href.endsWith('/core'));
      return;
    }
    const el=event.target.closest('[data-action]');
    if (!el) return;
    const action=el.dataset.action;
    if (section==='resources') {
      if (action==='resource') {
        const id=el.dataset.id;
        filters.expanded=filters.expanded===id?'':id;renderResourceResults();
        q('[data-id="'+id+'"]')?.focus({preventScroll:true});
      } else if (action==='page') {
        filters.page+=Number(el.dataset.move);filters.expanded='';renderResourceResults();
        q('#resource-results').scrollIntoView({block:'start',behavior:'instant'});
      }
      return;
    }
    if (section==='study' && action==='home-category') {
      const name=el.dataset.category;
      if (name==='' || Object.hasOwn(categories,name)) {homeCategory=name;renderHomeCards();}
      return;
    }
    if (!active) return;
    if(curated&&action==='trial-tab'){
      const p=progress(active.id), tab=el.dataset.trialTab;
      if(tab!==savedTrialTab(p)&&trialTabs.some(([key])=>key===tab)){
        p.trialTab=tab;renderTrialCore();
        q('[data-trial-tab="'+tab+'"]').focus({preventScroll:true});
      }
      return;
    }
    if(active.course.episodeStudy&&episodeAudio&&action.startsWith('episode-')){
      if(action==='episode-view'){
        if(progress(active.id).episodeView!==el.dataset.view){
          if(curated)location.hash=trialUrl(active.id,el.dataset.view);
          else renderEpisodeView(el.dataset.view,true);
        }
      }else if(action==='episode-play')episodeAudio.toggle();
      else if(action==='episode-chapter')episodeAudio.jumpTo(Number(el.dataset.at));
      else if(action==='episode-jump'){
        const at=Number(el.dataset.at);
        if(curated&&location.hash!==trialUrl(active.id,'whole'))history.pushState(null,'',trialUrl(active.id,'whole'));
        renderEpisodeView('whole',true,false);episodeAudio.jumpTo(at);
      }else if(action==='episode-clip'){
        player.pause();episodeAudio.playClip(el.dataset.clip);
      }
      return;
    }
    if (action==='step') switchStep(Number(el.dataset.step));
    if (action==='complete') complete();
    if (['play','cue','loop'].includes(action)&&active.course.trialAudio&&player.readyState<1){
      queuedCoreAction={lesson:active,action,i:Number(el.dataset.cue)};
      if(!active.clipUrl&&!active.audioRequest)loadTrialAudio();
      return;
    }
    if (action==='play') togglePlay();
    if (action==='cue') playCue(Number(el.dataset.cue),false);
    if (action==='loop') playCue(Number(el.dataset.cue),true);
    if (action==='language') {
      lang=lang==='dual'?'en':'dual';q('.cue-list').dataset.lang=lang;
      el.setAttribute('aria-pressed',String(lang==='dual'));
    }
    if (action==='reference') {
      reference=!reference;
      q('#rewrite-reference').hidden=!reference;
      el.textContent=reference?'收起参考':'查看参考表达';
      el.setAttribute('aria-expanded',String(reference));
    }
  });
  q('.skip',document).addEventListener('click',event=>{event.preventDefault();main.focus();});
  if(curated){
    const secondary=q('#nav-resources',document);
    secondary.remove();
    q('#nav-study',document).textContent='试听首页';
    const status=q('.local',document);
    if(status)status.textContent=series?series.length+' 节试听':'EP040';
    document.title='ELP365 · 英语试听课';
    ui?.mount(main,lang=>{
      episodeAudio?.setDisplayLanguage(lang);
      q('.cue-list')?.setAttribute('data-lang','dual');
    });
  }
  if(cloud?.enabled){
    cloud.load().then(data=>{
      Object.assign(memory,data);
      trajectory?.connect(data.userId);
      hydrateMotionState();
      window.addEventListener('hashchange',()=>route(true));route();
    });
  }else{
    hydrateMotionState();
    window.addEventListener('hashchange',()=>route(true));route();
  }
})();
