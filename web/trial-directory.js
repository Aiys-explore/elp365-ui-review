(() => {
  'use strict';
  const PAGE_SIZE = 18;
  const translations = {
    '日常生存':'Everyday life', '职场商务':'Workplace', '差旅出行':'Travel', '社交情感':'Social life',
    '初级':'Beginner', '中级':'Intermediate', '高级':'Advanced', '待核':'Unverified',
    '日常交流':'Everyday conversation', '周末与兴趣':'Weekends and interests', '社会与文化':'Society and culture',
    '关系与情绪':'Relationships and feelings', '寒暄与认识':'Greetings and introductions', '节日与兴趣':'Holidays and interests',
    '求职与入职':'Job hunting and onboarding', '消费与售后':'Shopping and returns', '会议与演示':'Meetings and presentations',
    '餐厅点餐':'Ordering at a restaurant', '家务与居住':'Home and chores', '办公沟通':'Office communication',
    '设备与网络':'Devices and internet', '银行与账单':'Banking and bills', '进度与协作':'Progress and collaboration',
    '医疗与身体':'Health and healthcare', '交通与问路':'Transport and directions', '礼貌回应':'Polite responses',
    '航班与入境':'Flights and immigration', '请假':'Taking leave', '电话沟通':'Phone calls', '酒店住宿':'Hotel stays',
    '协调时间':'Scheduling', '礼貌致歉':'Polite apologies', '旅行与订票':'Travel and bookings',
    '确认等候时间':'Checking wait times', '工作交接':'Handing over work', '核对预订':'Checking a reservation',
    '确认费用':'Checking charges', '行车指路':'Driving directions', '纠正方向':'Correcting directions',
    '电话预约':'Booking by phone', '预约改期':'Rescheduling', '请求帮忙':'Asking for help',
    '同事沟通':'Talking with coworkers', '电梯寒暄':'Elevator small talk', '结束话题':'Ending a conversation',
    '理发':'Getting a haircut', '确认需求':'Confirming needs', '会议迟到':'Running late to a meeting',
    '说明进度':'Sharing progress', '超市结账':'Grocery checkout', '询问付款':'Asking about payment',
    '优惠券':'Coupons', '租车':'Car rental', '确认替代方案':'Checking alternatives', '沟通保险':'Discussing insurance'
  };
  const states = new WeakMap();
  const sessions = new WeakMap();
  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[char]);
  const english = value => Object.hasOwn(translations,value) ? translations[value] : value;
  const pair = (zh,en) => zh && en && zh !== en
    ? `<span data-i18n><span lang="zh">${safe(zh)}</span><span lang="en">${safe(en)}</span></span>`
    : `<span data-i18n lang="${en ? 'en' : 'zh'}">${safe(en || zh)}</span>`;
  const normalize = value => String(value ?? '').normalize('NFKC').toLowerCase();
  const episodeNo = row => Number(row.episode ?? row.id.split('-').at(-1));
  const episodeLabel = row => 'EP'+String(episodeNo(row)).padStart(3,'0');
  const statuses = {ready:['可试听','Ready to try'], pending:['待精校','Pending review']};
  const learningLabels={new:['未开始','Not started'],active:['学习中','In progress'],done:['已完成','Completed']};
  const lessonStatus = p => !p||!(p.lastOpened||p.episodeView||p.resumeView||p.episodeAt>0||p.trialAt>0||p.passes>0||
    p.episodeFinished||p.dialogueFinished||p.trialSubmitted||p.graded||p.done?.length||p.trialRewrite||p.trialAnswers?.some(x=>x)) ? 'new'
    : p.episodeFinished||((p.dialogueFinished||p.passes===3)&&(p.trialSubmitted||p.graded))||p.done?.length===7 ? 'done'
    : 'active';
  const clock = s=>{const i=Math.max(0,Math.floor(s));return Math.floor(i/60)+':'+String(i%60).padStart(2,'0');};
  const clamp01 = value => Math.min(1,Math.max(0,Number(value) || 0));
  const bilingual = ([zh,en]) => zh && en ? `${zh} / ${en}` : (zh || en);
  const optionText = ([zh,en], mode) => mode === 'en' ? (en || zh) : (zh || en);
  const checkMark = '<span class="td-complete-mark" aria-hidden="true"><svg class="elp-check" viewBox="0 0 24 24" width="14" height="14" focusable="false" role="presentation"><path class="elp-check-path" d="M4 12.5 L9.5 18 L20 6.5"/></svg></span>';
  const checkSlot = mark => `<span class="td-check-slot">${mark}</span>`;
  const progressTrack = '<div class="td-progress-track" aria-hidden="true"><div class="td-progress-fill"></div></div>';
  const lessonLinks = ({route,saved,isWhole,again}) => {
    const primary = saved?.hasPosition
      ? `<a class="td-link td-link-primary td-row-resume" data-continue-learning href="${route}/${isWhole?'whole':'core'}">${pair(again?'再听一遍':'接着听',again?'Play again':'Resume')}</a>`
      : `<a class="td-link td-link-primary" href="${route}/core">${pair('开始学习','Start learning')}</a>`;
    const compact = saved?.hasPosition
      ? `<a class="td-link td-link-text" href="${route}/whole">${pair('听整期','Full episode')}</a>
         <a class="td-link td-link-text" href="${route}/core">${pair('学核心对话','Core dialogue')}</a>`
      : `<a class="td-link td-link-text" href="${route}/whole">${pair('听整期','Full episode')}</a>
         <a class="td-link td-link-text" href="${route}/notes">${pair('看笔记','Lesson notes')}</a>`;
    return `<div class="td-links">${primary}${compact}</div>`;
  };

  function mount(main, {catalog, ready, feature, learning, activity, listening, resume, motionFor}) {
    sessions.get(main)?.();
    const cleanups=[];
    sessions.set(main,()=>{cleanups.splice(0).forEach(cleanup=>cleanup());});
    const available = new Set(ready);
    const records = [...catalog].sort((a,b)=>Number(available.has(b.id))-Number(available.has(a.id))
      || Number(b.id===feature)-Number(a.id===feature) || episodeNo(a)-episodeNo(b));
    const readyCount = records.filter(row=>available.has(row.id)).length;
    const pendingCount = records.length-readyCount;
    const hasLearning = learning!==undefined;
    const learningReady = hasLearning && learning!==null;
    const progressFor = id => lessonStatus(learning?.[id]);
    const ratioFor = id => {
      if (!learningReady) return 0;
      if (progressFor(id)==='done') return 1;
      const saved = listening?.(id);
      return saved?.hasPosition && saved.duration>0 ? clamp01(saved.at/saved.duration) : 0;
    };
    /* The app owns the motion decision, the one-shot consumption and the aria-live region.
       The directory only renders the matching state and never replays a played motion. */
    const motionResults = new Map();
    const playedMotion = new Set();
    const resolveMotion = id => {
      if (typeof motionFor!=='function') return null;
      if (!motionResults.has(id)) {
        let result = null;
        try { result = motionFor(id); } catch { result = null; }
        motionResults.set(id, result && typeof result==='object'
          && ['complete','start','advance'].includes(result.type) ? result : null);
      }
      const result = motionResults.get(id);
      if (!result) return null;
      const resting = ratioFor(id);
      const to = Number.isFinite(result.to) ? clamp01(result.to) : resting;
      const rawFrom = Number.isFinite(result.from) ? clamp01(result.from)
        : (result.type==='complete' ? Math.max(0,to-0.15) : 0);
      return {
        result,
        from: Math.min(rawFrom,to),
        to
      };
    };
    const motionState = (id, kind) => {
      const resting = ratioFor(id);
      const done = progressFor(id)==='done';
      const motion = resolveMotion(id);
      const restingState = {cls:'', style:`--progress-to:${resting.toFixed(3)}`, check:done};
      if (!motion) return restingState;
      const {result,from,to} = motion;
      /* A submitted exercise is not a finished course: the practice outcome keeps the
         resting bar, shows no completion mark and runs no course completion motion.
         The app keeps announcing the submission through its aria-live region. */
      if (result.type==='complete' && result.outcome!=='course') return restingState;
      const key = `${kind}:${id}:${result.type}:${result.outcome||''}`;
      const first = !playedMotion.has(key);
      playedMotion.add(key);
      const completed = done || (result.type==='complete' && result.outcome==='course');
      const cls = result.reduced ? ' is-motion-static' : (first ? ` is-motion-${result.type}` : '');
      return {
        cls,
        style:`--progress-to:${to.toFixed(3)};--progress-from:${from.toFixed(3)}`,
        check: completed
      };
    };
    const recentFirst = (a,b) => Math.max(learning?.[b.id]?.lastOpened||0, activity?.[b.id]||0)
      - Math.max(learning?.[a.id]?.lastOpened||0, activity?.[a.id]||0);
    const unique = values => [...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
    const filters = {
      category:{label:['分类','Category'],all:['全部分类','All categories'],
        values:unique(records.map(row=>row.category)).map(value=>[value,[value,english(value)]])},
      scene:{label:['场景','Scene'],all:['全部场景','All scenes'],
        values:unique(records.flatMap(row=>row.tags ?? [])).map(value=>[value,[value,english(value)]])},
      level:{label:['难度','Level'],all:['全部难度','All levels'],
        values:unique(records.map(row=>row.difficulty)).map(value=>[value,[value,english(value)]])},
      availability:{label:['试听状态','Availability'],all:['全部状态','All statuses'],values:Object.entries(statuses)},
    ...(hasLearning?{progress:{label:['学习进度','Progress'],
        all:learningReady?['全部进度','All progress']:['暂未读取云端进度','Cloud progress unavailable'],
        values:[['unfinished',['未学完','Unfinished']], ...Object.entries(learningLabels)]}}:{})
    };
    const resetFilters = {query:'',category:'',scene:'',level:'',availability:'ready',progress:''};
    const state = states.get(main) ?? {...resetFilters, page:0, view:'list'};
    states.set(main,state);
    if(!learningReady)state.progress='';
    const haystacks = new Map(records.map(row=>{
      const terms = [row.title,row.titleZh,row.category,row.difficulty,...(row.tags ?? [])];
      return [row.id,normalize([...terms,...terms.map(english),row.id,episodeLabel(row)].join(' '))];
    }));
    const label = key => {
      const def = filters[key];
      return `<label class="td-field td-field-${key}">${pair(...def.label)}<select data-td-filter="${key}" aria-label="${safe(bilingual(def.label))}"></select></label>`;
    };
    const recent = resume&&catalog.find(row=>row.id===resume.id);
    const isWhole=resume?.mode==='whole', t=resume?clock(resume.at):'', total=resume?clock(resume.duration):'';
    /* The resume card keeps the app driven motion, so a start, an advance or a finished
       course is still announced when the matching row is filtered out of the list. */
    const continueMotion = recent ? motionState(recent.id,'continue') : {cls:'',style:'',check:false};
    const continueCard=recent?`<section class="td-continue${continueMotion.cls}" style="${continueMotion.style}" aria-labelledby="td-continue-title">
      <div class="td-continue-copy">
        <h2 id="td-continue-title">${continueMotion.check?checkMark:''}${pair('继续学习','Continue learning')}</h2>
        <p class="td-continue-title"><span class="td-episode">${episodeLabel(recent)}</span> ${pair(recent.titleZh,recent.title)}</p>
        <p class="td-continue-position">${pair(...(isWhole?['整期节目','Full episode']:['核心对话','Core dialogue']))}
          <span class="td-continue-clock">${safe(t)} / ${safe(total)}</span></p>
      </div>
      <a data-continue-learning href="#lesson/${encodeURIComponent(recent.id)}/${isWhole?'whole':'core'}" class="td-continue-link">${pair(resume.finished&&resume.at>=resume.duration-.1?'再听一遍':'接着听',resume.finished&&resume.at>=resume.duration-.1?'Listen again':'Resume listening')}</a>
      ${progressTrack}
    </section>`:'';

    main.innerHTML = `<section class="elp-trial-dir" aria-labelledby="trial-directory-title">
      <header class="td-head">
        <h1 id="trial-directory-title">${pair('试听课程目录','Trial lesson directory')}</h1>
        <p class="td-total">${pair(`${records.length} 期目录`,`${records.length} episodes`)}
          <span class="td-badge td-ready">${pair(`可试听 ${readyCount}`,`${readyCount} ready to try`)}</span>
          <span class="td-badge td-pending">${pair(`待精校 ${pendingCount}`,`${pendingCount} pending review`)}</span></p>
        <details class="td-about"><summary class="td-about-summary">${pair('关于目录','About this directory')}</summary>
          <p class="td-description">${pair('可试听的课程提供整期节目和核心对话。默认只看可试听的课程；可在筛选中查看全部目录。','Ready lessons include the full episode and core dialogue. Ready lessons are shown first. Use Filters to see the full directory.')}</p></details>
      </header>
      ${continueCard}
      <div class="td-controls${hasLearning?' td-with-progress':''}">
        <label class="td-field td-query">${pair('搜索课程','Search lessons')}<input type="search" data-td-query aria-label="${safe(bilingual(['搜索课程','Search lessons']))}"></label>
        ${hasLearning?label('progress'):''}
        <details class="td-more-filters"><summary>${pair('更多筛选','More filters')}</summary><div class="td-filter-fields">
        ${label('category')}
        ${label('scene')}
        ${label('level')}
        ${label('availability')}</div></details>
      </div>
      <div class="td-toolbar">
        <button type="button" class="td-ready-only" data-td-ready-only aria-pressed="true">${pair(`仅看可试听 (${readyCount} 期)`,`Ready only (${readyCount})`)}</button>
        <p class="td-count" role="status" aria-atomic="true"></p>
        <div class="td-views" role="group">
          <button type="button" data-td-view="list">${pair('列表','List')}</button>
          <button type="button" data-td-view="cards">${pair('卡片','Cards')}</button>
        </div>
      </div>
      <ol class="td-results" role="list"></ol>
      <div class="td-empty" hidden><p>${pair('没有匹配的课程。','No matching lessons.')}</p>
        <button type="button" data-td-reset>${pair('清空筛选','Clear filters')}</button></div>
      <nav class="td-pages">
        <button type="button" data-td-page="-1">${pair('上一页','Previous')}</button>
        <span class="td-page-position"></span>
        <button type="button" data-td-page="1">${pair('下一页','Next')}</button>
      </nav>
    </section>`;
    const root = main.querySelector('.elp-trial-dir');
    const get = selector => root.querySelector(selector);
    const search = get('[data-td-query]');
    const more=get('.td-more-filters');
    const wide=matchMedia('(min-width: 701px)');
    const wireDisclosure=(el,key)=>{
      let synced=null;
      const sync=()=>{
        el.open=wide.matches?true:(state[key]??false);
        synced=el.open;
      };
      const onToggle=()=>{
        if(el.open!==synced&&!wide.matches)state[key]=el.open;
      };
      el.addEventListener('toggle',onToggle);
      wide.addEventListener('change',sync);
      sync();
      return ()=>{
        el.removeEventListener('toggle',onToggle);
        wide.removeEventListener('change',sync);
      };
    };
    cleanups.push(wireDisclosure(more,'moreOpen'));
    const results = get('.td-results');
    const pages = get('.td-pages');
    const count = get('.td-count');
    const readyOnly=get('[data-td-ready-only]');
    readyOnly.onclick=()=>{state.availability=state.availability==='ready'?'':'ready';selects.availability.value=state.availability;state.page=0;update();};
    const viewButtons = [...root.querySelectorAll('[data-td-view]')];
    const pageButtons = [...root.querySelectorAll('[data-td-page]')];
    const languageSource = document.documentElement;
    const selects = Object.fromEntries(Object.keys(filters).map(key=>[key,get(`[data-td-filter="${key}"]`)]));
    if(selects.progress)selects.progress.disabled=!learningReady;
    let mode = '';
    const syncLanguage = () => {
      const next = languageSource.dataset.trialLanguage || 'dual';
      if (mode === next) return;
      mode = next;
      Object.entries(filters).forEach(([key,def])=>{
        const choices=[['',def.all],...def.values];
        selects[key].replaceChildren(...choices.map(([value,names])=>new Option(optionText(names,mode),value)));
        selects[key].value = state[key];
      });
      search.placeholder = mode === 'en' ? 'e.g. EP040' : '例：EP040';
      get('.td-views').setAttribute('aria-label',bilingual(['目录布局','Directory layout']));
      pages.setAttribute('aria-label',bilingual(['目录分页','Directory pages']));
    };
    const observer = new MutationObserver(()=>{
      if (!main.contains(root)) observer.disconnect();
      else syncLanguage();
    });
    observer.observe(languageSource,{attributes:true,attributeFilter:['data-trial-language']});
    observer.observe(main,{childList:true});
    cleanups.push(()=>observer.disconnect());

    const rowMarkup = row => {
      const canStudy = available.has(row.id);
      const progressKey=learningReady?progressFor(row.id):null;
      const saved=canStudy&&(progressKey==='active'||progressKey==='done')?listening?.(row.id):null;
      const position=saved?.hasPosition?clock(saved.at):'';
      const isWhole=saved?.mode==='whole';
      const again=!!(saved?.finished&&saved.at>=saved.duration-.1);
      const route = `#lesson/${encodeURIComponent(row.id)}`;
      const hasImage = canStudy && !!row.sceneImage;
      const motion = motionState(row.id,'row');
      const thumb = state.view !== 'cards' || !hasImage ? '' : `<div class="td-thumb" aria-hidden="true"><img src="${safe(row.sceneImage)}" loading="lazy" decoding="async" width="72" height="60" alt=""></div>`;
      const titleZh = row.titleZh || `第 ${episodeNo(row)} 期 · ${row.title}`;
      const learningLabel = progressKey ? (motion.check
        ? `<span class="elp-complete-label">${pair(...learningLabels[progressKey])}</span>`
        : pair(...learningLabels[progressKey])) : '';
      const links = canStudy ? lessonLinks({route,saved,isWhole,again})
        : `<div class="td-links"><span class="td-coming" aria-disabled="true">${pair('即将上线','Coming soon')}</span></div>`;
      return `<li class="td-item${hasImage?'':' td-item-no-thumb'}${motion.cls}" style="${motion.style}" data-episode="${safe(row.id)}">${thumb}<div class="td-body">
        <div class="td-item-head">
          <span class="td-episode">${episodeLabel(row)}</span>
          <span class="td-badge ${canStudy?'td-ready':'td-pending'}">${pair(...statuses[canStudy?'ready':'pending'])}</span>
          ${progressKey?`<span class="td-badge td-learning-${progressKey} td-status-badge" data-learning="${progressKey}">${checkSlot(motion.check?checkMark:'')}${learningLabel}</span>`:''}
        </div>
        <h2 class="td-title"><span class="td-title-zh" lang="zh">${safe(titleZh)}</span><span class="td-title-en" lang="en">${safe(row.title)}</span></h2>
        <p class="td-meta">${[row.category,row.difficulty,...(row.tags ?? [])].filter(Boolean)
          .map(value=>pair(value,english(value))).join('<span class="td-separator" aria-hidden="true">·</span>')}</p>
        ${learningReady&&canStudy?`<p class="td-last-position">${position?
          `${pair(...(isWhole?['上次听到 · 整期','Last position · Full episode']:['上次听到 · 核心对话','Last position · Core dialogue']))} <strong>${safe(position)}</strong>`:
          pair('尚无听音记录','No listening yet')}</p>`:''}
        ${links}
      </div>${hasLearning?progressTrack:''}</li>`;
    };

    const update = () => {
      const words = normalize(state.query).trim()
        .replace(/\b(?:ep(?:isode)?)\s*[-#]?\s*(\d+)\b/g, 'ep$1')
        .replace(/第\s*(\d+)\s*期/g, 'ep$1').split(/\s+/).filter(Boolean);
      const matches = records.filter(row=>{
        const text = haystacks.get(row.id);
        return words.every(word=>{
          const episode = /^(?:ep|#)?(\d+)$/.exec(word);
          return episode ? episodeNo(row) === Number(episode[1]) : text.includes(word);
        }) && (!state.category || row.category===state.category)
          && (!state.scene || (row.tags ?? []).includes(state.scene))
          && (!state.level || row.difficulty===state.level)
          && (!state.availability || state.availability===(available.has(row.id)?'ready':'pending'))
          && (!state.progress || (state.progress==='unfinished'
            ? available.has(row.id) && progressFor(row.id)!=='done'
            : progressFor(row.id)===state.progress));
      });
      if(state.progress==='unfinished')matches.sort((a,b)=>Number(progressFor(b.id)==='active')-Number(progressFor(a.id)==='active')
        || (progressFor(a.id)==='active'?recentFirst(a,b):0));
      readyOnly.setAttribute('aria-pressed',String(state.availability==='ready'));
      const totalPages = Math.ceil(matches.length/PAGE_SIZE);
      state.page = Math.min(state.page, Math.max(0,totalPages-1));
      const start = state.page*PAGE_SIZE;
      const end = Math.min(start+PAGE_SIZE,matches.length);
      count.innerHTML = matches.length ? pair(`${start+1}–${end} / ${matches.length} 期`,`${start+1}–${end} of ${matches.length} episodes`)
        : pair('0 期','0 episodes');
      results.dataset.view = state.view;
      results.innerHTML = matches.slice(start,end).map(rowMarkup).join('');
      results.hidden = matches.length === 0;
      get('.td-empty').hidden = matches.length > 0;
      viewButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.tdView===state.view)));
      pages.hidden = totalPages < 2;
      pageButtons[0].disabled = state.page===0;
      pageButtons[1].disabled = state.page>=totalPages-1;
      get('.td-page-position').innerHTML = pair(`第 ${state.page+1} / ${totalPages} 页`,`Page ${state.page+1} of ${totalPages}`);
    };
    search.value = state.query;
    search.addEventListener('input',()=>{state.query=search.value; state.page=0; update();});
    Object.entries(selects).forEach(([key,select])=>select.addEventListener('change',()=>{
      state[key]=select.value; state.page=0; update();
    }));
    viewButtons.forEach(button=>button.addEventListener('click',()=>{
      if (state.view !== button.dataset.tdView) {state.view=button.dataset.tdView; update();}
    }));
    pageButtons.forEach(button=>button.addEventListener('click',()=>{
      state.page+=Number(button.dataset.tdPage); update();
      if (button.disabled) pageButtons.find(control=>!control.disabled)?.focus({preventScroll:true});
      count.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'auto'});
    }));
    get('[data-td-reset]').addEventListener('click',()=>{
      Object.assign(state,resetFilters,{page:0});
      search.value='';
      Object.entries(selects).forEach(([key,select])=>{select.value=state[key];});
      update(); search.focus();
    });
    syncLanguage();
    update();
  }
  window.ELP_TRIAL_DIRECTORY = {mount,lessonStatus};
})();
