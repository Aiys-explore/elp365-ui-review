(() => {
  const KEY='scene-english:progress:v1', own='scene-english:pending:';
  const enabled=location.protocol!=='file:'&&location.pathname!=='/local-demo.html';
  let cache={}, queue={}, userId='', timer=0, sending=null, failures=0, stopped=false;
  const key=id=>own+id;
  const line=()=>document.querySelector('#member-sync');
  const tell=s=>{if(line())line().textContent=s;};
  const fields=['step','passes','done','answers','graded','trialAt','trialTab','trialCaptions','trialAnswers','trialRewrite','trialSubmitted','episodeAt','episodeView','resumeView','lastOpened','episodeSubtitle','episodeRate','episodeStickers','episodeFinished','dialogueFinished'];
  const pick=p=>Object.fromEntries(fields.filter(k=>Object.hasOwn(p,k)).map(k=>[k,p[k]]));
  const store=()=>{
    if(!userId)return;
    try{
      if(Object.keys(queue).length)localStorage.setItem(key(userId),JSON.stringify(queue));
      else localStorage.removeItem(key(userId));
    }catch{}
  };
  function pending(id){
    try{return JSON.parse(localStorage.getItem(key(id))||'{}')||{};}catch{return {};}
  }
  const extract=p=>Object.entries(p).slice(0,50).map(([id,progress])=>({id,progress}));
  const delayed=ms=>{clearTimeout(timer);timer=setTimeout(()=>{flush();},ms);};
  async function identity(timeout=4000){
    const result=await fetch('/api/me/progress',{signal:AbortSignal.timeout(timeout)});
    if(result.status===401){stopped=true;throw Error('登录已过期，重新登录后可同步。');}
    if(!result.ok)throw Error('云端暂未连接。');
    return result.json();
  }
  async function load(){
    try{
      const data=await identity();
      userId=data.userId;
      queue=pending(userId);
      const rows=data.records;
      const activity=Object.fromEntries(rows.map(r=>[r.id,r.updated]));
      const lessons=Object.fromEntries(rows.map(r=>[r.id,r.progress]));
      for(const [id,patch] of Object.entries(queue))if(window.ELP_LIBRARY.lessons[id])
        lessons[id]={...lessons[id],...patch,version:window.ELP_LIBRARY.lessons[id].version};
      cache=Object.fromEntries(Object.entries(lessons).map(([k,v])=>[k,JSON.parse(JSON.stringify(pick(v)))]));
      tell(Object.keys(queue).length?'正在同步上次保留的记录…':'学习记录已连接云端');
      if(Object.keys(queue).length)delayed(500);
      const last=Object.keys(queue).filter(id=>lessons[id]?.lastOpened)
        .sort((a,b)=>lessons[b].lastOpened-lessons[a].lastOpened)[0];
      const cloudLast=rows[0];
      return {lessons,activity,cloudReady:true,last:last&&lessons[last].lastOpened>(cloudLast?.progress.lastOpened||cloudLast?.updated||0)?last:cloudLast?.id||''};
    }catch(e){tell(e.message==='登录已过期，重新登录后可同步。'?e.message:'暂未连接云端，恢复连接后会同步本次学习。');return {lessons:{}};}
  }
  function persist(memory){
    if(stopped)return;
    for(const [id,p] of Object.entries(memory.lessons)){
      const prev=cache[id]||{}, next=pick(p), patch={};
      for(const [k,v] of Object.entries(next))if(JSON.stringify(v)!==JSON.stringify(prev[k]))patch[k]=v;
      if(Object.keys(patch).length){queue[id]={...queue[id],...patch};cache[id]=JSON.parse(JSON.stringify(next));}
    }
    if(Object.keys(queue).length){store();tell('学习记录待同步…');if(!timer&&!sending)delayed(1000);}
  }
  async function send(keepalive){
    if(stopped||!Object.keys(queue).length)return true;
    let entries=[];
    try{
      if(!userId){
        const data=await identity();
        userId=data.userId;
        const old=pending(userId);
        for(const [id,p] of Object.entries(old))queue[id]={...p,...queue[id]};
        store();
      }
      entries=extract(queue);
      if(keepalive){
        let size=0;
        entries=entries.filter(e=>{size+=new TextEncoder().encode(JSON.stringify(e)).byteLength;return size<=56000;});
      }
      if(!entries.length)return false;
      const r=await fetch('/api/me/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entries,userId}),keepalive});
      if(r.status===401){stopped=true;throw Error('登录已过期，请重新登录后同步。');}
      if(r.status===409){stopped=true;throw Error('账号已变化，记录留在原账号的本机缓存中。');}
      if(!r.ok)throw Error('暂未同步，记录已保留在此设备。');
      for(const {id,progress} of entries){
        for(const [k,v] of Object.entries(progress))if(JSON.stringify(queue[id]?.[k])===JSON.stringify(v))delete queue[id][k];
        if(queue[id]&&!Object.keys(queue[id]).length)delete queue[id];
      }
      failures=0;store();tell(Object.keys(queue).length?'学习记录待同步…':'学习记录已同步');
      return !Object.keys(queue).length;
    }catch(e){
      failures++;store();
      tell(stopped?e.message:userId?'暂未同步，记录已保留在此设备。':'暂未连接云端，将重试同步。');
      return false;
    }
  }
  async function flush(keepalive=false){
    clearTimeout(timer);timer=0;
    if(!sending&&Object.keys(queue).length&&!stopped){
      sending=send(keepalive).finally(()=>{
        sending=null;
        if(!stopped&&Object.keys(queue).length)delayed(failures?Math.min(30000,1800*2**Math.min(4,failures)):350);
      });
    }
    return sending||!Object.keys(queue).length;
  }
  if(enabled){
    window.addEventListener('online',()=>flush());
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')queueMicrotask(()=>flush(true));});
    window.addEventListener('pagehide',()=>queueMicrotask(()=>flush(true)));
  }else tell('学习进度保存在当前浏览器');
  window.ELP_PROGRESS={enabled,load,persist,flush,legacyKey:KEY};
})();
