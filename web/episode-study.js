(() => {
  'use strict';
  const image = './assets/elp-hosts-v1.png';
  const esc = value => String(value ?? '').replace(/[&<>"']/g,
    x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const moment = (t, round=false) => {
    const n=(round?Math.round:Math.floor)(Math.max(0,t||0));
    return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
  };
  const button=(action,label,attrs='',kind='')=>`<button type="button" class="button ${kind}" data-action="${action}" ${attrs}>${esc(label)}</button>`;
  const jump=(at,label)=>button('episode-jump',label,`data-at="${Number(at)}"`);
  const brand=()=>`<img class="ep-brand-pair" src="${image}" alt="Marco 和 Erica" width="1536" height="1024">`;
  const logoSource='./assets/elp365-logo-motion.webp';
  const logoGlyphs=[['E','#3e627f',-8],['L','#bc5837',5],['P','#1f5f8f',-6],
    ['3','#a56719',6],['6','#a84e40',-7],['5','#273d65',5]];
  function dialogueLogo(){
    return `<svg class="ep-dialogue-logo" data-ep-dialogue-logo viewBox="0 0 240 234" aria-hidden="true" focusable="false">
      <svg x="22" y="7" width="109" height="143" viewBox="26 14 253 331">
        <image href="${logoSource}" width="1086" height="362"/>
      </svg>
      <svg x="112" y="17" width="103" height="138" viewBox="422 27 239 320">
        <image href="${logoSource}" width="1086" height="362"/>
      </svg>
      <g class="ep-logo-book">
        <svg x="24" y="113" width="192" height="87" viewBox="742 135 340 154">
          <image href="${logoSource}" width="1086" height="362"/>
        </svg>
        <path class="ep-logo-page" d="M120 168Q151 126 198 140L195 123Q150 108 120 168Z" fill="#fff0cc" stroke="#fff8e6" stroke-width="3" stroke-linejoin="round"/>
      </g>
      ${logoGlyphs.map(([letter,color,angle],i)=>{
        const x=31+i*35.6;
        return `<g class="ep-logo-glyph" style="--letter:${i}"><text x="${x}" y="223" transform="rotate(${angle} ${x} 205)" fill="${color}" stroke="#fff8e8" stroke-width="7" stroke-linejoin="round" paint-order="stroke" text-anchor="middle">${letter}</text></g>`;
      }).join('')}
    </svg>`;
  }

  const sectionEnglish={
    '开场与热身':'Introduction','词汇预习':'Vocabulary Preview','对话导入':'Dialogue Setup',
    '核心对话':'Core Dialogue','主持人复盘':'Host Recap','词汇拆解':'Language Takeaway',
    '慢速复播':'Slow Replay','原速复播':'Natural-speed Replay','对话复播':'Dialogue Replay',
    '句型组合':'Fluency Builder','总结与片尾':'Wrap-up','背景拓展':'Background',
    '面试技巧':'Interview Tips','文化讨论':'Culture Notes'
  };
  const sectionMarkers=[
    ['vocabulary preview','词汇预习','Vocabulary Preview'],
    ['language take ?away','词汇拆解','Language Takeaway'],
    ['fluency builder','句型组合','Fluency Builder'],
    ['putting it together','句型组合','Putting It Together']
  ].map(([phrase,zh,en])=>[new RegExp(`(^|[.!?]\\s+)(${phrase})(?:[.!?](?:\\s|$)|$)`,'i'),zh,en]);
  const spokenCache=new WeakMap();
  function spokenSection(cue){
    if(!cue)return null;
    if(spokenCache.has(cue))return spokenCache.get(cue);
    const text=cue.en?.trim()||'';
    for(const [pattern,zh,en] of sectionMarkers){
      // Recognize standalone audio stings, including stings attached to an adjacent subtitle.
      const hit=pattern.exec(text);
      if(!hit)continue;
      const offset=hit.index+hit[1].length;
      const at=cue.start+(offset?Math.max(0,cue.end-cue.start-1.15):0), event={zh,en,at};
      spokenCache.set(cue,event);
      return event;
    }
    spokenCache.set(cue,null);
    return null;
  }
  function chapterCue(node,chapter,scene,captions,t,lang){
    const config=scene?.chapterCue;
    node.hidden=lang==='off'||config?.enabled===false;
    if(node.hidden)return;
    const start=scene?.start??chapter.start;
    const title=scene?.title||chapter.title;
    let spoken;
    if((scene?.template??chapter.scene)!=='office'){
      for(let i=preceding(captions,t,c=>c.start);i>=0&&captions[i].end>=Math.max(start-3,t-2.8);i--){
        const candidate=spokenSection(captions[i]);
        if(candidate&&candidate.at>=start-3&&t>=candidate.at&&t-candidate.at<2.8){spoken=candidate;break;}
      }
    }
    const zh=config?.zh||spoken?.zh||title;
    const en=config?.en||spoken?.en||sectionEnglish[title]||'';
    const elapsed=t-(spoken?.at??start);
    const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    node.toggleAttribute('data-chapter-flash',!reduce&&elapsed>=0&&elapsed<1.2);
    for(const [selector,label] of [['[data-chapter-zh]',lang==='en'&&en?'':zh],['[data-chapter-en]',lang==='zh'||en===zh?'':en]]){
      const el=node.querySelector(selector);
      const glyphs=Array.from(label);
      const count=reduce?glyphs.length:Math.max(1,Math.ceil(glyphs.length*Math.min(1,Math.max(0,elapsed)/.65)));
      // Keep the heading's final footprint while the visible lettering fills in.
      if(el.dataset.heading!==label)el.dataset.heading=label;
      const typed=glyphs.slice(0,count).join('');
      if(el.firstElementChild.textContent!==typed)el.firstElementChild.textContent=typed;
    }
  }

  const officeFace=(motion,eyes,mouth)=>motion
    ?`<path data-office-eyes d="${eyes}" fill="none"/><path data-office-mouth d="${mouth}" fill="none"/>`
    :`<path d="${eyes}${mouth}" fill="none"/>`;
  const officeArt=(motion=false)=>`<svg viewBox="0 0 620 250" class="ep-office-art" aria-hidden="true" focusable="false">
    <path d="M25 211Q14 121 69 62 142 14 235 29 377 1 514 40q80 20 83 109l-13 68Q297 238 25 211Z" fill="#fff0ce"/>
    <path d="M42 218q105-5 218-1t304-4M99 230q160 5 371 1" fill="none" stroke="#bb9c76" stroke-width="2"/>
    <g stroke="#5f4b47" stroke-linecap="round" stroke-linejoin="round" stroke-width="3">
      <path d="M62 204 64 67q-1-10 12-12l74 1q10 1 10 11l4 137" fill="#f1c995"/>
      <path d="M75 196 76 68l70 1 4 125m-21-67 8 1" fill="none" stroke="#ad8061" stroke-width="2"/>
      <path d="M444 47q49-4 107 1l-2 74q-49 6-106 1Z" fill="#d2e5e2"/>
      <path d="M497 48v75m-52-38h104m-92-9 13-14m-7 20 20-21" fill="none" stroke="#90b8b1" stroke-width="2"/>
      <path d="m183 58 5-12 4 12 12 4-12 4-4 12-5-12-12-4ZM563 106l3-8 3 8 8 2-8 3-3 8-3-8-8-3Z" fill="#ffd389" stroke-width="2"/>
      <g class="ep-office-spark" fill="none" stroke="#bc7b66" stroke-width="2.3"><path d="m319 66 6-9m3 20 10-4m-8 15 9 2"/></g>
      <g class="ep-actor ep-rachel" ${motion?'data-office-actor="rachel"':''}>
        <path d="M212 219q-6-39 3-67 19-22 46-18 26 4 39 29l-4 56" fill="#e0a8ab"/>
        <path d="M216 99q1-35 34-42 37-7 49 31l-4 32q-12 27-44 25-32-3-35-46Z" fill="#f4c7a4"/>
        <path d="M216 104q-16-34 14-49 35-17 63 5 14 13 8 36-19-4-36-18-17 24-49 26Z" fill="#624957"/>
        <path d="M217 96q-17 6-12 30 3 13 15 18m12-69q21-20 49-13" fill="none" stroke="#8b626e" stroke-width="2"/>
        <path d="m232 117 6 1m38-1 7-2" fill="none" stroke="#df957f" stroke-width="4"/>
        ${officeFace(motion,'M242 107h1m29 0h1','M252 119q6 5 13 0')}
        <path d="M225 213v-24m59 24-1-21m-45-53 12 14 11-8 12 9 11-14" fill="none" stroke="#a46774" stroke-width="2"/>
        <g class="ep-office-gesture"><path d="M230 155q16 19 35 24l33-22" fill="none"/><path d="M264 153l25-12 19 22-26 14Z" fill="#fff6df"/><path d="m277 154 11-5m-8 11 12-6" stroke="#be9a73" stroke-width="1.5"/></g>
      </g>
      <g class="ep-actor ep-colleague" ${motion?'data-office-actor="colleague"':''}>
        <path d="M382 176q8-34 43-43 36-3 57 42" fill="#9dbfaf"/>
        <path d="M395 99q2-32 36-32 35 1 35 32 0 35-35 35-34 1-36-35Z" fill="#eebf99"/>
        <path d="M394 98q-4-26 12-37 32-18 53 5 8 10 8 24-32-1-47-18-9 14-26 26Z" fill="#72564f"/>
        <path d="M404 74q18-16 42-9m-47 47 7 2m42-3 6-2" fill="none" stroke="#b9826d" stroke-width="2"/>
        ${officeFace(motion,'M411 102h1m27 0h1','M419 118q7 5 14 0')}
      </g>
      <path d="M332 174q76-5 171-2l9 19-180 4Zm15 21v29m145-32 5 29" fill="#d3aa82"/>
      <path d="M373 168l-12-36 56 1-7 37Z" fill="#c6d8d7"/><path d="M382 153q10-5 16 2m-26 19 48-1" fill="none" stroke="#789d95" stroke-width="2"/>
      <path d="M461 164l20-1-2 10h-14Z" fill="#efb08f"/>
      <path d="M526 206q1-27-12-41m13 31q7-28 22-38m-22 38q-10-16-22-17" stroke="#7e9e7a" fill="none"/>
      <path d="M514 205l4 17q13 4 23 0l3-17Z" fill="#e6a38b"/>
    </g>
  </svg>`;
  const cover=(animate=false)=>`<figure class="ep-blind-cover${animate?' ep-cover-animated':''}" aria-label="办公室里，一位新同事在工位旁开口求助">${officeArt()}</figure>`;
  const mic=`<svg viewBox="0 0 40 63" aria-hidden="true"><rect x="10" y="3" width="20" height="35" rx="9"/><path d="M12 13h16m-16 6h16m-16 6h16M6 26v3c0 17 28 17 28 0v-3M20 43v12m-10 3h20"/></svg>`;
  const hostNames=(names={})=>[['marco',names.marco||'Marco'],['erica',names.erica||'Erica']];
  const hosts=(motion,names)=>`<div class="ep-studio" data-ep-studio>
    <div class="ep-air" aria-hidden="true">ON AIR</div>
    <div class="ep-wall-lines" aria-hidden="true"></div>
    <div class="ep-chalkboard" data-ep-board hidden>
      <strong lang="en" data-board-word></strong><span lang="zh" data-board-zh></span>
      <span lang="en" data-board-example></span>
    </div>
    <div class="ep-studio-cast">
      ${hostNames(names).map(([id,name])=>`<div class="ep-host ${id}" data-host="${id}">
        <div class="ep-sprite"><img src="${image}" alt="${esc(name)}" width="1536" height="1024">${motion?'<canvas width="768" height="1024" aria-hidden="true" hidden></canvas>':''}</div>
        <span class="ep-mic">${mic}</span>
      </div>`).join('')}
    </div>
    <div class="ep-desk" aria-hidden="true"></div>
  </div>`;
  const art = {
    pencil:'<path d="M9 35l3-11L32 4l9 9-20 20Zm3-11 9 9m7-25 9 9M9 35l8-2-6-6"/><path d="M8 42q13-3 30-2"/>',
    car:'<path d="M7 30V20l5-9h23l6 9v10H7Zm1-10h32M16 11l-3 9m18-9 3 9"/><circle cx="13" cy="33" r="4"/><circle cx="34" cy="33" r="4"/>',
    coins:'<ellipse cx="18" cy="17" rx="10" ry="5"/><path d="M8 17v12c0 7 20 7 20 0V17m-20 6c0 6 20 6 20 0"/><circle cx="34" cy="27" r="9"/>',
    people:'<circle cx="16" cy="15" r="7"/><circle cx="33" cy="15" r="7"/><path d="M5 36v-4c1-11 23-11 23 0v4M26 25c8-4 17 1 17 8v3"/>',
    desk:'<path d="M7 31h34M11 31v9m25-9v9M17 11h18v14H17Zm9 14v6M10 22h5v9"/>',
    meal:'<circle cx="24" cy="24" r="12"/><circle cx="24" cy="24" r="7"/><path d="M5 12v12m4-12v12m-4-5h4m-2 5v12m34-23c-4 6-4 12 1 13v10"/>',
    calendar:'<rect x="7" y="11" width="34" height="28" rx="4"/><path d="M15 8v8m18-8v8M7 20h34m-26 7h6m5 0h6m-17 6h6"/>',
    sweater:'<path d="M17 9l-10 6-4 13 10 4 3-6v14h16V26l3 6 10-4-4-13-10-6q-7 9-14 0Z"/>',
    parcel:'<path d="M7 17l17-8 17 8v17l-17 8-17-8Zm0 0 17 8 17-8m-17 8v17M16 13l17 8"/>',
    paper:'<path d="M12 5h18l7 8v29H12Zm18 0v9h7M17 21h15m-15 7h15m-15 7h10"/>',
    folder:'<path d="M5 15V9h15l6 5h16v5m-37-4 6 23h26l8-19H13l-8-4Z"/>',
    door:'<path d="M11 42V6h24v36M9 42h30m-10-17h2M3 13l4 2m-4 7 4-1m33-6 4-2"/>'
  };
  const sketch=kind=>`<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${art[kind]||art.paper}</g></svg>`;
  const tabs=view=>`<nav class="row ep-mode-tabs" aria-label="EP040 学习入口">
    ${[['whole','整期原音'],['core','核心对话'],['notes','本课讲义']].map(([mode,label])=>
      button('episode-view',label,`data-view="${mode}" aria-pressed="${mode===view}"`)).join('')}
  </nav>`;
  const officeScene=study=>study.sceneLayers?`<div class="ep-animated-scene ep-layered-scene">
    <img src="${esc(study.sceneLayers.background)}" width="768" height="512" alt="">
    ${study.sceneLayers.actors.map(actor=>`<img class="ep-scene-puppet" data-scene-actor="${esc(actor.id)}"
      src="${esc(actor.image)}" alt="" style="--actor-x:${Number(actor.x)}%;--actor-w:${Number(actor.width)}%;--actor-floor:${Number(actor.floor)}%">`).join('')}
  </div>`:study.sceneImage?`<div class="ep-animated-scene">
    <img src="${esc(study.sceneImage)}" width="768" height="512" alt="">
  </div>`:officeArt(study.hostMotion);
  function drawDialogue(container,study,t){
    if(!container||!study.sceneLayers)return;
    const greeting=study.sceneLayers.shots?.find(s=>s.start<=t&&s.end>t)?.beats.findLast(b=>b.at<=t);
    const forced=Object.entries(greeting?.cast||{}).find(([,actor])=>actor.pose==='speak')?.[0];
    const speaker=forced||spanAt(study.officeTurns,t)?.[2]||'';
    window.ELP_HOST_MOTION?.layerPose(container,study.hostMotion,t,speaker,study.sceneLayers);
  }
  function whole(study, simple=false) {
    return `<div class="ep-full${simple?' ep-full-simple':''}" data-ep-full>
      <div class="ep-watch card">
        <div class="ep-screen"><div class="ep-stage" data-ep-stage data-scene="studio" ${study.hostMotion?'data-host-motion':''}>
          <div class="ep-scene-name" data-ep-scene-name hidden><span lang="zh" data-chapter-zh><b></b></span><span lang="en" data-chapter-en><b></b></span></div>
          ${hosts(study.hostMotion,study.hostNames)}
          <div class="ep-office" data-ep-office hidden>${officeScene(study)}<div class="ep-office-beat" data-ep-beat hidden></div></div>
          ${study.sceneImage?`<div class="ep-office ep-blind-office" data-ep-blind-office hidden><img src="${esc(study.sceneImage)}" alt="" width="768" height="512"></div>`:''}
          <aside class="ep-word-sticker" data-ep-sticker hidden><strong data-ep-word lang="en"></strong><span data-ep-gloss></span></aside>
          <aside class="ep-example-card" data-ep-example hidden><span data-ep-art></span><span class="ep-example-copy" data-ep-example-text><span lang="en" data-ep-example-en></span><span lang="zh-CN" data-ep-example-zh></span></span></aside>
          ${dialogueLogo()}
        </div>
        <div class="ep-nameplates">
          <div class="ep-native-names">
            ${hostNames(study.hostNames).map(([id,name])=>`<span class="ep-name-seat" data-name-host="${id}"><span class="ep-host-name">${esc(name)}</span></span>`).join('')}
          </div>
          <div class="ep-composed-names" data-ep-composed-names></div>
        </div></div>
        <div class="ep-example-dock" data-ep-example-dock></div>
        <div class="ep-caption-slot">
          <div class="ep-caption" data-ep-caption hidden>
            <p lang="en" data-ep-en></p><p data-ep-zh></p>
            <p class="ep-caption-note" data-ep-note hidden></p>
          </div>
        </div>
        <div class="row ep-controls">
          ${button('episode-play','播放','data-ep-play','primary')}
          <input type="range" data-ep-seek min="0" max="${study.duration}" step=".1" value="0" aria-label="整期播放位置">
          <span class="tiny ep-clock" data-ep-clock>0:00 / ${moment(study.duration,true)}</span>
          ${button('episode-fullscreen','全屏','data-ep-fullscreen hidden')}
          ${simple?'':`<label class="sr" for="ep-play-rate">倍速</label>
          <select id="ep-play-rate" data-ep-rate><option value="0.8">0.8×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option></select>`}
        </div>
        <div class="row ep-options">
          ${simple?'<label><input type="checkbox" data-ep-language checked> 字幕</label>':`<label>字幕 <select data-ep-language><option value="off">关闭</option><option value="en">英文</option><option value="dual" selected>中英</option></select></label>
          <label><input type="checkbox" data-ep-stickers checked> 词汇贴纸</label>`}
        </div>
        <p class="audio-error ep-error" data-ep-error role="status" hidden></p>
        <p class="audio-error ep-error" data-fullscreen-error role="status" hidden></p>
      </div>
      ${simple?'':`<aside class="ep-chapter-list card" aria-label="原音章节">
        <h2>章节</h2>
        ${study.chapters.map(ch=>button('episode-chapter',moment(ch.start,true)+'　'+ch.title,`data-at="${ch.start}" data-chapter="${esc(ch.id)}"`,'ep-chapter')).join('')}
      </aside>
      <details class="card stage-card ep-transcript"><summary>本章文稿</summary><div data-ep-transcript></div></details>`}
    </div>`;
  }
  const anchorBar=(study,step)=>{
    const links=study.modules[String(step)]||[];
    if(!links.length)return '';
    return `<div class="row ep-anchor-bar">${links.map(([clip,label])=>
      jump(study.clips[clip][0],moment(study.clips[clip][0],true)+' '+label)).join('')}</div>`;
  };
  const vocab=study=>`<div class="gloss">${study.handout.vocabulary.map(v=>`<article class="card stage-card">
    <h3 lang="en">${esc(v.term)}</h3><p>${esc(v.meaning)}</p><p class="pattern" lang="en">${esc(v.usage)}</p>
    <p>${esc(v.trap)}</p><p lang="en">${esc(v.example)}</p>${jump(v.at,'听原音 · '+moment(v.at,true))}
    </article>`).join('')}</div>`;
  function pronunciation(study) {
    const clip=(name,label)=>button('episode-clip',label,`data-clip="${name}" aria-pressed="false"`);
    const replays=Object.entries(study.clips||{}).filter(([name])=>/^(slow|normal|replay)\d*$/.test(name))
      .sort((left,right)=>left[1][0]-right[1][0]);
    const replayLabel=name=>name.startsWith('slow')?'慢速复播':name.startsWith('normal')?'原速复播':'对话复播';
    const clipTime=name=>moment(study.clips[name][0],true);
    return `<article class="card stage-card">
      <h3>节目里的复播</h3>
      ${study.hostMotion||study.sceneLayers?`<div class="ep-office ep-practice-office" data-ep-practice-office>${officeScene(study)}${dialogueLogo()}</div>`:''}
      <div class="row">${replays.map(([name,[start]])=>clip(esc(name),moment(start,true)+' '+replayLabel(name))).join(' ')}</div>
      <div class="row ep-compare-controls"><label><input type="checkbox" data-ep-loop> 循环片段</label>
        <span class="tiny ep-clock" data-ep-compare-clock></span></div>
      <p class="audio-error" data-ep-error role="status" hidden></p>
    </article>${(study.practicePairs||[]).map(pair=>`<article class="card stage-card">
      <h3>${esc(pair.title)}</h3><p lang="en" class="pattern">${esc(pair.phrase)}</p><p>${esc(pair.listen)}</p>
      <div class="row">${[pair.slow,pair.normal].filter(name=>Object.hasOwn(study.clips||{},name))
        .map(name=>clip(esc(name),clipTime(name)+' '+replayLabel(name))).join(' ')}</div>
    </article>`).join('')}`;
  }
  function handout(study,course) {
    const items=(rows,render)=>rows.map(render).join('');
    const details=(title,html,open='')=>`<details class="card stage-card ep-notes-section" ${open}><summary>${esc(title)}</summary>${html}</details>`;
    const dialogue=items(course.cues,c=>`<div class="ep-notes-row">
      <span class="tiny">${esc(c.speaker)}</span><p lang="en" data-copy="en">${esc(c.en)}</p><p lang="zh">${esc(c.zh)}</p>
      ${jump(study.clips.first[0]+c.start,'听原句')}</div>`);
    const notes=items(course.cues,(c,i)=>`<div class="ep-notes-row"><p lang="en"><strong>${esc(c.en)}</strong></p>
      <p>${esc(study.handout.closeReading[i])}</p>${jump(study.clips.first[0]+c.start,'听原句')}</div>`);
    const short=rows=>items(rows,([title,copy,at])=>`<div class="ep-notes-row"><h3>${esc(title)}</h3><p>${esc(copy)}</p>${jump(at,'回听')}</div>`);
    return `<div class="stage-content ep-handout">
      ${details('双语对话全文',dialogue,'open')}
      ${details('核心词汇拆解',vocab(study))}
      ${details('逐句精读',notes)}
      ${details('高频句型',items(study.handout.patterns,v=>`<div class="ep-notes-row">
        <p class="pattern" lang="en">${esc(v.form)}</p><p lang="en">${esc(v.example)}</p>${jump(v.at,'听相关段落')}</div>`))}
      ${details('语法速览',short(study.handout.grammar))}
      ${details('场景贴士',short(study.handout.tips))}
    </div>`;
  }
  function preceding(rows,t,get) {
    let lo=0,hi=rows.length;
    while(lo<hi){
      const mid=(lo+hi)>>1;
      if(get(rows[mid])<=t)lo=mid+1;
      else hi=mid;
    }
    return lo-1;
  }
  const spanAt=(rows,t)=>{const hit=rows[preceding(rows,t,r=>r[0])];return hit&&t<hit[1]?hit:null;};
  function mark(en,terms){
    const phrases=[...new Set((terms||[]).map(value=>String(value).replace(/[….]+$/u,'').trim()).filter(Boolean))];
    if(!phrases.length)return esc(en);
    const patterns=phrases.sort((one,two)=>two.length-one.length).map(value=>
      value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/[’']/g,"[’']").replace(/\s+/g,'\\s+'));
    const matches=en.matchAll(new RegExp('(?<![A-Za-z])(?:'+patterns.join('|')+')(?![A-Za-z])','gi'));
    let result='',end=0;
    for(const hit of matches){
      result+=esc(en.slice(end,hit.index))+'<mark><strong>'+esc(hit[0])+'</strong></mark>';
      end=hit.index+hit[0].length;
    }
    return result+esc(en.slice(end));
  }

  function create(main,audio,save) {
    let study=null,state=null,view='off',clip=null,pending=null,loop=false,problem='';
    let frame=0,lastWrite=0,chapterKey='',copyKey='',exampleKey='',lastScrub=0,displayLanguage='dual';
    const q=s=>main.querySelector(s);
    const desktop=matchMedia('(min-width: 800px) and (hover: hover) and (pointer: fine)');
    const fullscreenText=(zh,en)=>displayLanguage==='en'?en:displayLanguage==='zh'?zh:zh+' / '+en;
    function fullscreenControl(){
      const button=q('[data-ep-fullscreen]'),player=button?.closest('.ep-watch');
      if(!button)return;
      const open=document.fullscreenElement===player||player.classList.contains('is-web-fullscreen');
      button.hidden=false;
      button.setAttribute('aria-pressed',String(open));
      const label=open?fullscreenText('退出全屏','Exit full screen'):fullscreenText('全屏','Full screen');
      if(button.textContent!==label)button.textContent=label;
    }
    function setWebFs(player,on){
      player.classList.toggle('is-web-fullscreen',on);
      document.documentElement.classList.toggle('ep-lock-scroll',on);
      fullscreenControl();
      sync();
    }
    function releaseFullscreen(){
      const player=main.querySelector('.ep-watch.is-web-fullscreen');
      if(player)setWebFs(player,false);
      if(document.fullscreenElement&&main.contains(document.fullscreenElement))
        document.exitFullscreen()?.catch(()=>{});
    }
    main.addEventListener('click',async event=>{
      const button=event.target.closest('[data-ep-fullscreen]');
      if(!button||button.hidden)return;
      const player=button.closest('.ep-watch'), notice=player.querySelector('[data-fullscreen-error]');
      notice.hidden=true;
      if(document.fullscreenElement===player||player.classList.contains('is-web-fullscreen')){
        try{
          if(document.fullscreenElement===player)await document.exitFullscreen();
        }catch{
          notice.textContent=fullscreenText('浏览器未能开启或退出全屏。','The browser could not change full screen mode.');
          notice.hidden=false;
        }
        if(player.classList.contains('is-web-fullscreen'))setWebFs(player,false);
        return;
      }
      if(desktop.matches&&document.fullscreenEnabled&&player.requestFullscreen){
        try{
          await player.requestFullscreen();
          return;
        }catch{}
      }
      if(main.contains(player))setWebFs(player,true);
    });
    window.addEventListener('keydown',event=>{
      if(event.key!=='Escape')return;
      const player=main.querySelector('.ep-watch.is-web-fullscreen');
      if(player)setWebFs(player,false);
    });
    desktop.addEventListener('change',fullscreenControl);
    document.addEventListener('fullscreenchange',fullscreenControl);
    const watchSize=new ResizeObserver(()=>sync());
    let exampleProbe=null;
    const now=()=>pending??audio.currentTime??0;
    const clamp=t=>Math.max(0,Math.min(study?.duration||0,Number.isFinite(t)?t:0));
    const subtitle=()=>{
      const choice=state?.episodeSubtitle;
      if(['off','en','dual'].includes(choice))return choice;
      if(window.ELP_LIBRARY?.singleLesson||window.ELP_LIBRARY?.trialSeries)return displayLanguage;
      return ['en','dual'].includes(choice)?choice:'dual';
    };
    const showWords=()=>state?.episodeStickers!==false;
    const wholeRate=()=>!window.ELP_LIBRARY?.singleLesson&&[.8,1,1.25,1.5].includes(state?.episodeRate)?state.episodeRate:1;
    function record(force=false){
      if(view!=='whole'||!state||(!force&&performance.now()-lastWrite<1800))return;
      state.episodeAt=clamp(now());
      lastWrite=performance.now();
      save();
    }
    function move(t){
      const target=clamp(t);
      if(audio.readyState>=1){audio.currentTime=target;pending=null;}
      else pending=target;
    }
    function pause(){
      audio.pause();
      if(frame)cancelAnimationFrame(frame);
      frame=0;
    }
    function clear(){
      releaseFullscreen();
      record(true);
      view='off';clip=null;pending=null;study=null;state=null;problem='';loop=false;
      watchSize.disconnect();
      exampleProbe?.remove();
      exampleProbe=null;
      pause();
      audio.removeAttribute('src');
      audio.load();
    }
    function bind(next,nextState){
      clear();
      study=next;state=nextState;
      if(study){audio.src=study.audio;audio.load();}
    }
    function replaceTimeline(next){
      if(!study||!next||next.audio!==study.audio)return;
      study=next;
      chapterKey='';copyKey='';exampleKey='';
      sync();
    }
    function setView(next){
      if(!study)return;
      if(view===next){releaseFullscreen();return;}
      record(true);
      releaseFullscreen();
      pause();
      clip=null;pending=null;problem='';view=next;
      if(view==='whole'){audio.playbackRate=wholeRate();move(clamp(state.episodeAt));}
    }
    function start(automatic=false){
      problem='';
      audio.play().catch(err=>{
        if(err.name==='AbortError')return;
        problem=err.name==='NotAllowedError'&&automatic?'浏览器阻止了自动播放，请点「播放」继续。':'这段原音没有播出，请重试。';
        sync();
      });
      sync();
    }
    function resume(){
      if(view!=='whole'||!study||!audio.paused)return;
      if(audio.ended||now()>=study.duration-.1)move(0);
      start(true);
    }
    function toggle(){
      if(view!=='whole')return;
      if(!audio.paused){pause();sync();return;}
      if(audio.ended||now()>=study.duration-.03)move(0);
      start();
    }
    function jumpTo(t,play=true){
      if(view!=='whole'||!Number.isFinite(t))return;
      move(t);record(true);
      if(play)start();else sync();
    }
    function scrub(t){
      lastScrub=performance.now();
      jumpTo(t,false);
    }
    function playClip(key){
      if(view!=='core'||!Object.hasOwn(study?.clips||{},key))return;
      if(clip?.key===key&&!audio.paused){pause();sync();return;}
      const [a,b]=study.clips[key],same=clip?.key===key;
      clip={key,a,b};
      if(!same||now()<a||now()>=b-.04)move(a);
      audio.playbackRate=1;
      start();
    }
    function stopClip(){
      if(view!=='core')return;
      clip=null;pending=null;pause();sync();
    }
    function preferences(el){
      if(!state)return;
      if(el.matches('[data-ep-language]'))state.episodeSubtitle=el.type==='checkbox'?(el.checked?'follow':'off'):el.value;
      else if(el.matches('[data-ep-stickers]'))state.episodeStickers=el.checked;
      else if(el.matches('[data-ep-rate]')){
        state.episodeRate=Number(el.value);
        audio.playbackRate=wholeRate();
      }else if(el.matches('[data-ep-loop]'))loop=el.checked;
      else return;
      save();sync();
    }
    function mount(){
      chapterKey='';copyKey='';exampleKey='';
      window.ELP_HOST_MOTION?.prepareLayers(study?.sceneLayers);
      fullscreenControl();
      watchSize.disconnect();
      const stage=q('[data-ep-stage]');
      if(stage)watchSize.observe(stage);
      sync();
    }
    function syncOffice(container,t,speaker){
      if(!container)return;
      if(study.sceneLayers)window.ELP_HOST_MOTION?.layerPose(container,study.hostMotion,t,speaker,study.sceneLayers);
      else window.ELP_HOST_MOTION?.officePose(container,study.hostMotion,t,speaker);
    }
    function placeExample(stage,node,visible){
      const dock=q('[data-ep-example-dock]');
      dock.hidden=!visible&&stage.dataset.scene==='office';
      let fit=true;
      // Keep measuring the in-frame placement when the visible card is docked.
      if(visible&&exampleProbe?.parentNode===stage){
        const box=stage.getBoundingClientRect(), card=exampleProbe.getBoundingClientRect();
        const gap=7;
        fit=card.left>=box.left+2&&card.right<=box.right-2&&card.top>=box.top+2&&card.bottom<=box.bottom-2;
        const overlays=stage.querySelectorAll(
          '[data-ep-board],[data-ep-scene-name],[data-ep-dialogue-logo],.ep-host,.ep-scene-puppet,.sc-board,.sc-bubble,.sc-actor'
        );
        for(const item of overlays){
          if(!fit)break;
          if(!item.checkVisibility({checkVisibilityCSS:true,checkOpacity:true}))continue;
          const r=item.getBoundingClientRect();
          if(card.left<r.right+gap&&card.right>r.left-gap&&card.top<r.bottom+gap&&card.bottom>r.top-gap)fit=false;
        }
      }
      const target=fit?stage:dock;
      node.classList.toggle('ep-card-docked',!fit);
      if(node.parentNode!==target)target.append(node);
    }
    function sync(){
      if(!study||!state)return;
      const warn=q('[data-ep-error]');
      if(warn){warn.hidden=!problem;warn.textContent=problem;}
      if(view==='core'){
        const position=q('[data-ep-compare-clock]');
        if(position)position.textContent=clip?moment(Math.min(Math.max(now(),clip.a),clip.b))+' / '+moment(clip.b,true):'';
        const control=q('[data-ep-loop]');
        if(control)control.checked=loop;
        for(const b of main.querySelectorAll('[data-action=episode-clip]'))
          b.setAttribute('aria-pressed',String(clip?.key===b.dataset.clip&&!audio.paused));
        const practice=q('[data-ep-practice-office]');
        if(practice){
          const t=clip?Math.min(Math.max(now(),clip.a),clip.b):0;
          const speaker=clip&&t<clip.b?spanAt(study.officeTurns,t)?.[2]:'';
          syncOffice(practice,t,speaker);
          practice.classList.toggle('is-playing',!!clip&&!audio.paused&&!audio.ended);
        }
        return;
      }
      if(view!=='whole'||!q('[data-ep-full]'))return;
      const t=clamp(now());
      const index=Math.max(0,preceding(study.chapters,t,c=>c.start));
      const ref=window.ELP_SCENE?.referenceAt(study,t), scene=ref?.native?ref.scene:null;
      const chapter=scene?{...study.chapters[index],scene:scene.template,start:scene.start,
        transition:scene.transition,effectSeconds:scene.seconds}:study.chapters[index];
      const office=chapter.scene==='office';
      let actor=spanAt(office?study.officeTurns:study.studioVoices,t)?.[2]||'';
      if(scene){
        const overrides=new Map();
        for(const m of scene.motion)if(t>=m.start&&t<m.end)overrides.set(m.actor,m.fx);
        const live=study.composition.lines[preceding(study.composition.lines,t,v=>v.start)];
        const speaker=live&&t<live.end&&live.actor;
        actor=speaker&&overrides.get(speaker)==='still'?'':scene.cast.find(a=>a.fx!=='still'&&(speaker?a.id===speaker:overrides.get(a.id)==='talk'))?.id||'';
      }
      const beat=office?spanAt(study.officeBeats,t)?.[2]:'';
      const c=study.captions[preceding(study.captions,t,v=>v.start)];
      let cue=c&&t<c.end?c:null;
      const simple=!!q('.ep-full-simple');
      const term=!simple&&showWords()?spanAt(study.stickers,t):null;
      let demo=office?null:spanAt(study.examples,t);
      const lang=subtitle();
      const stage=q('[data-ep-stage]');
      stage.classList.toggle('ep-blind-view',lang==='off');
      const board=q('[data-ep-board]');
      const panel=scene?.board.find(b=>t>=b.start&&t<b.end);
      const teaching=office||lang==='off'?null:scene?
        (panel?[panel.start,panel.end,panel.term,panel.zh,panel.en,{write:panel.write,erase:panel.erase}]:null):
        spanAt(study.boards||[],t);
      stage.classList.toggle('has-board',!!teaching);
      board.hidden=!teaching;
      if(teaching){
        const [start,end,word,zh,example,effect]=teaching;
        const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
        const typed=text=>{
          const glyphs=Array.from(text||'');
          const writing=effect?effect.write?Math.floor(glyphs.length*(t-start)/effect.write):glyphs.length:Math.floor((t-start)*40);
          const erasing=effect?effect.erase?Math.ceil(glyphs.length*(end-t)/effect.erase):glyphs.length:Math.ceil((end-t)*90);
          const limit=reduce?glyphs.length:Math.min(glyphs.length,writing,erasing);
          return glyphs.slice(0,limit).join('');
        };
        for(const [selector,value] of [['[data-board-word]',typed(word)],['[data-board-zh]',lang==='en'?'':typed(zh)],['[data-board-example]',lang==='zh'?'':typed(example)]]){
          const node=board.querySelector(selector);
          if(node.textContent!==value)node.textContent=value;
        }
      }
      const displayScene=ref?.scene.template??chapter.scene;
      stage.dataset.scene=displayScene;
      if(displayScene==='studio'){
        const room=ref?.scene??chapter, end=room.end??study.chapters[index+1]?.start??study.duration;
        const canShowBoard=ref?.scene?room.board.length>0:
          study.boards?.some(([start,finish])=>start<end&&finish>room.start);
        stage.classList.toggle('ep-teaching-layout',!!canShowBoard);
      }else stage.classList.remove('ep-teaching-layout');
      const transition=chapter.transition;
      const remaining=transition&&transition!=='cut'&&chapter.effectSeconds&&!matchMedia('(prefers-reduced-motion: reduce)').matches
        ? Math.max(0,1-(t-chapter.start)/chapter.effectSeconds):0;
      if(remaining>0){
        stage.dataset.transition=transition;
        stage.style.setProperty('--scene-in',String(Math.round(remaining*1000)/1000));
      }else if(stage.dataset.transition){
        delete stage.dataset.transition;
        stage.style.removeProperty('--scene-in');
      }
      const insertedExample=study.insertedVoices&&spanAt(study.insertedVoices,t);
      const speaker=study.hostMotion?(insertedExample?'':actor):(demo?'':actor);
      stage.dataset.speaker=speaker;
      stage.dataset.beat=beat||'';
      stage.classList.toggle('is-playing',!audio.paused&&!audio.ended);
      q('[data-ep-studio]').hidden=office;
      const officeStage=q('[data-ep-office]');
      officeStage.hidden=!office;
      if(office)syncOffice(officeStage,t,actor);
      else if(study.hostMotion)window.ELP_HOST_MOTION?.pose(stage,study.hostMotion,t,speaker);
      const beatLabel=q('[data-ep-beat]');
      if(beatLabel.dataset.beat!==(beat||'')){
        beatLabel.dataset.beat=beat||'';
        beatLabel.hidden=!beat;
        beatLabel.innerHTML=beat?sketch(beat==='meeting'?'calendar':beat==='client'?'people':'paper'):'';
        beatLabel.setAttribute('aria-hidden','true');
      }
      syncControls(t);
      const languageControl=q('[data-ep-language]');
      if(simple)languageControl.checked=lang!=='off';
      else{
        languageControl.value=lang;
        q('[data-ep-rate]').value=String(wholeRate());
        q('[data-ep-stickers]').checked=showWords();
      }

      const composed=window.ELP_SCENE?.render(stage,study,t,lang,ref);
      if(composed){
        cue=composed.cue;
        stage.dataset.scene=composed.scene.template;
        if(composed.controls){
          const c=composed.card;
          demo=c?[c.start,c.end,c.art,c.zh,c.en]:null;
        }
      }
      chapterCue(q('[data-ep-scene-name]'),chapter,composed?.scene,
        study.composition?.lines??study.captions,t,lang==='off'?'off':displayLanguage);
      const blindOffice=q('[data-ep-blind-office]');
      if(blindOffice){
        blindOffice.hidden=lang!=='off'||stage.dataset.scene!=='office';
        stage.classList.toggle('ep-use-still',!blindOffice.hidden);
      }
      const nextCopy=[cue?.start,term?.[0],lang,composed?.bubble].join('|');
      if(copyKey!==nextCopy){
        copyKey=nextCopy;
        q('[data-ep-caption]').hidden=!cue||lang==='off'||!!composed?.bubble;
        const ranges=cue?.highlights||[];
        q('[data-ep-en]').innerHTML=!cue?'':(composed?.explicitHighlights||ranges.some(r=>r.lang==='en'))?window.ELP_SCENE.html(cue.en,ranges,'en'):
          mark(cue.en,[...(study.highlights||[]),...(term?[term[2]]:[])]);
        q('[data-ep-zh]').innerHTML=cue?window.ELP_SCENE?.html(cue.zh,ranges,'zh')??esc(cue.zh):'';
        q('[data-ep-en]').hidden=lang==='zh';
        q('[data-ep-zh]').hidden=lang==='en';
        const note=q('[data-ep-note]');
        note.hidden=!cue?.note||lang==='off';
        note.textContent=cue?.note?(lang==='dual'?[cue.note.zh,cue.note.en].join(' · '):cue.note[lang])||'':'';
        q('[data-ep-sticker]').hidden=!term;
        q('[data-ep-word]').textContent=term?.[2]||'';
        q('[data-ep-gloss]').textContent=term?.[3]||'';
        q('[data-ep-gloss]').hidden=window.ELP_LIBRARY?.singleLesson&&displayLanguage==='en';
      }
      if(lang==='off')demo=null;
      const card=lang==='off'?null:composed?.card;
      const nextExample=(card?.id||demo?.[0]||'')+'|'+lang;
      const example=q('[data-ep-example]');
      if(exampleKey!==nextExample){
        exampleKey=nextExample;
        const node=example;
        exampleProbe?.remove();
        exampleProbe=null;
        node.hidden=!demo;
        if(card){
          node.dataset.placement=card.id;node.dataset.kind='card';
          if(card.x!=null){
            node.style.left=card.x+'%';node.style.top=card.y+'%';node.style.width=card.w+'%';
            node.style.bottom='auto';node.classList.add('ep-card-placed');
          }else{node.removeAttribute('style');node.classList.remove('ep-card-placed');}
        }else{
          delete node.dataset.placement;delete node.dataset.kind;
          node.removeAttribute('style');node.classList.remove('ep-card-placed');
        }
        if(card?.z!=null)node.style.zIndex=card.z;
        node.querySelector('[data-ep-art]').innerHTML=demo&&demo[2]!=='none'?sketch(demo[2]):'';
        const label=node.querySelector('[data-ep-example-text]');
        label.hidden=lang==='off';
        const exampleEn=node.querySelector('[data-ep-example-en]');
        const exampleZh=node.querySelector('[data-ep-example-zh]');
        exampleEn.hidden=lang==='zh'||!demo?.[4];
        exampleZh.hidden=lang==='en'||!demo?.[3];
        exampleEn.innerHTML=demo?.[4]?mark(demo[4],study.highlights):'';
        exampleZh.textContent=demo?.[3]||'';
        if(demo){
          exampleProbe=node.cloneNode(true);
          for(const attr of ['data-ep-example','data-placement','data-kind'])exampleProbe.removeAttribute(attr);
          exampleProbe.classList.remove('ep-card-docked','se-selected-piece');
          exampleProbe.classList.add('ep-example-probe');
          exampleProbe.setAttribute('aria-hidden','true');
          stage.append(exampleProbe);
        }
      }
      placeExample(stage,example,!!demo);
      if(!simple&&chapterKey!==chapter.id){
        chapterKey=chapter.id;
        for(const b of main.querySelectorAll('[data-chapter]')){
          if(b.dataset.chapter===chapter.id)b.setAttribute('aria-current','true');
          else b.removeAttribute('aria-current');
        }
        const end=study.chapters[index+1]?.start??study.duration;
        q('[data-ep-transcript]').innerHTML=study.captions.filter(v=>v.start<end&&v.end>chapter.start)
          .map(v=>`<div class="ep-notes-row"><p lang="en" data-copy="en">${esc(v.en)}</p><p lang="zh">${esc(v.zh)}</p>
            ${button('episode-chapter',moment(v.start,true),`data-at="${v.start}" aria-label="跳到 ${moment(v.start,true)}"`)}</div>`).join('');
      }
    }
    function syncControls(t){
      const play=q('[data-ep-play]');
      const label=audio.paused?'播放':'暂停';
      if(play.dataset.label!==label){play.textContent=label;play.dataset.label=label;}
      const slider=q('[data-ep-seek]');
      if(performance.now()-lastScrub>180)slider.value=t;
      slider.setAttribute('aria-valuetext',moment(t));
      q('[data-ep-clock]').textContent=moment(t)+' / '+moment(study.duration,true);
    }
    function tick(){
      frame=0;
      if(view==='core'&&clip&&!audio.paused&&now()>=clip.b){
        if(loop)move(clip.a);
        else{pause();move(clip.b);}
      }
      sync();
      if(!audio.paused)frame=requestAnimationFrame(tick);
    }
    audio.addEventListener('loadedmetadata',()=>{
      if(pending!==null)move(pending);
      sync();
    });
    audio.addEventListener('play',()=>{if(!frame)frame=requestAnimationFrame(tick);sync();});
    audio.addEventListener('pause',()=>{if(frame)cancelAnimationFrame(frame);frame=0;record(true);sync();});
    audio.addEventListener('timeupdate',()=>{
      if(view==='core'&&clip&&!audio.paused&&now()>=clip.b&&!frame)tick();
      record();if(audio.paused||!frame)sync();
    });
    audio.addEventListener('seeked',sync);
    main.addEventListener('host-portrait-ready',sync);
    audio.addEventListener('ended',()=>{if(view==='whole'&&state)state.episodeFinished=true;record(true);sync();});
    audio.addEventListener('error',()=>{
      if(!study)return;
      problem=study.audio.startsWith('https:')?'整期原音读取失败。请检查能否访问 GitHub，再刷新页面重试。':
        '本课的整期 MP3 打不开。请保留课程目录里的 media 文件夹。';
      sync();
    });
    window.addEventListener('pagehide',()=>record(true));
    return {bind,replaceTimeline,position:now,clear,setView,mount,toggle,resume,jumpTo,scrub,preferences,playClip,stopClip,
      setSubtitleMode(value){if(!state||!['dual','en','off'].includes(value))return;state.episodeSubtitle=value;save();sync();},
      setDisplayLanguage(value){displayLanguage=value;fullscreenControl();sync();}};
  }

  window.ELP_STUDIO={brand,cover,tabs,whole,handout,vocab,anchorBar,pronunciation,create,mark,officeScene,drawDialogue,dialogueLogo};
})();
