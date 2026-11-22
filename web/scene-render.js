(() => {
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const sets=new WeakMap(), reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const samples=new WeakMap();
  const overlayDefaults={board:{x:50,y:40,w:60,z:20},bubble:{x:50,y:22,w:62,z:80}};
  const zOf=(p,kind)=>p?.z??(kind==='board'?20:kind==='bubble'?80:kind==='actor'?30:
    p.id==='mic-left'||p.id==='mic-right'?60:p.asset==='desk'||p.id==='desk-foreground'?40:45);
  const overlayOf=(scene,kind)=>({...overlayDefaults[kind],...scene.overlays?.[kind]});
  function pathAt(p,t){
    const route=[...(p.routes||[])].sort((a,b)=>a.start-b.start).findLast(r=>r.start<=t);
    if(route){
      const points=route.points;
      if(t>=route.end)return {...p,...points.at(-1)};
      let f=clamp((t-route.start)/(route.end-route.start),0,1);
      f=f*f*(3-2*f);
      const distances=points.slice(1).map((b,i)=>Math.hypot(b.x-points[i].x,(b.y-points[i].y)*2/3));
      let rest=f*distances.reduce((sum,v)=>sum+v,0);
      for(let i=0;i<distances.length;i++){
        if(distances[i]>0&&(rest<=distances[i]||i===distances.length-1)){
          const a=points[i],b=points[i+1],k=clamp(rest/distances[i],0,1);
          return {...p,x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k};
        }
        rest-=distances[i];
      }
      return {...p,...points.at(-1)};
    }
    const points=p.path||[];
    if(!points.length||t<points[0].at)return p;
    const i=at(points,t,'at'), a=points[i],b=points[i+1];
    if(!b)return {...p,x:a.x,y:a.y};
    const next=(t-a.at)/(b.at-a.at);
    return {...p,x:a.x+(b.x-a.x)*next,y:a.y+(b.y-a.y)*next};
  }
  const elem=(tag,cls,parent)=>{const node=document.createElement(tag);node.className=cls;parent.append(node);return node;};
  function at(rows,t,key='start'){
    let l=0,r=rows.length;
    while(l<r){let mid=(l+r)>>>1;if(rows[mid][key]<=t)l=mid+1;else r=mid;}
    return l-1;
  }
  function referenceAt(study,t){
    const graph=study.composition;
    if(!graph?.scenes?.length)return null;
    const scene=graph.scenes[Math.max(0,at(graph.scenes,t))], preset=graph.reference?.[scene.template];
    const same=(key)=>scene[key].length===preset[key].length&&scene[key].every(p=>
      p.z==null&&!p.path?.length&&!p.routes?.length&&preset[key].some(r=>['id','asset','x','y','w'].every(k=>r[k]===p[k])));
    const line=graph.lines[at(graph.lines,t)];
    const native=!!(preset&&!scene.overlays&&!scene.presence?.length&&scene.background===preset.background&&same('cast')&&same('props')&&scene.transition==='cut'&&
      !(line?.variant&&line.end>t)&&scene.cast.every(p=>['talk','still'].includes(p.fx))&&scene.motion.every(m=>!m.variant&&['talk','still'].includes(m.fx)));
    return {scene,native};
  }
  function labelNative(stage){
    if(stage.dataset.referenceReady)return;
    stage.dataset.referenceReady='true';
    const tag=(node,id,kind)=>{
      if(node){node.dataset.placement=id;node.dataset.kind=kind;}
    };
    for(const id of ['marco','erica']){
      const actor=stage.querySelector('[data-ep-studio] [data-host="'+id+'"]');
      tag(actor,id,'actor');tag(actor?.querySelector('.ep-mic'),id==='marco'?'mic-left':'mic-right','prop');
    }
    tag(stage.querySelector('[data-ep-studio] .ep-air'),'recording-light','prop');
    tag(stage.querySelector('[data-ep-studio] .ep-desk'),'desk-foreground','prop');
    tag(stage.querySelector('[data-ep-board]'),'board','board');
    for(const node of stage.querySelectorAll('[data-ep-office] [data-scene-actor]'))tag(node,node.dataset.sceneActor,'actor');
  }
  function measureFormal(stage,study){
    const width=stage.offsetWidth, key=(innerWidth<=660?'mobile':'desktop')+':v2';
    const hit=samples.get(stage);
    if(hit?.key===key)return hit;
    labelNative(stage);
    stage.dataset.scMeasure='true';
    const hadBoard=stage.classList.contains('has-board');
    const box=stage.getBoundingClientRect(), height=box.height;
    if(width<1||height<1){delete stage.dataset.scMeasure;return {};}
    const read=(p,bottom=false,frameHeight=height)=>{
      const r=p.getBoundingClientRect();
      const w=p.offsetWidth/width*100;
      return {x:(r.left+r.width*.5-box.left)/box.width*100,y:(r.top+r.height*(bottom?1:.5)-box.top)/frameHeight*100,
        w, h:p.offsetHeight/width*150};
    };
    const readStudio=()=>{
      const map={};
      for(const p of stage.querySelectorAll('[data-ep-studio] [data-placement]')){
        const kind=p.dataset.kind;
        map[p.dataset.placement]=read(p,kind==='actor');
        if(kind==='actor')map[p.dataset.placement].w=p.getBoundingClientRect().width/box.width*100;
        else if(kind==='prop'){
          const host=p.closest('.ep-host');
          if(host){
            const scale=host.getBoundingClientRect().width/host.offsetWidth;
            map[p.dataset.placement].w*=scale;
            map[p.dataset.placement].h*=scale;
          }
        }
      }
      return map;
    };
    stage.classList.remove('has-board');
    const studio=readStudio(), office={};
    for(const p of stage.querySelectorAll('[data-ep-office] [data-placement]'))office[p.dataset.placement]=read(p,true,box.width*2/3);
    stage.classList.add('has-board');
    const board=readStudio();
    stage.classList.toggle('has-board',hadBoard);
    delete stage.dataset.scMeasure;
    const result={key,studio,office,board};
    if(studio.marco?.w>0&&(!study.sceneLayers||Object.values(office).filter(p=>p.h>0).length===study.sceneLayers.actors.length))
      samples.set(stage,result);
    return result;
  }
  function html(text,ranges,language){
    const str=String(text??'');
    const selected=(ranges??[]).filter(r=>r.lang===language&&r.a>=0&&r.b<=str.length&&r.a<r.b).sort((a,b)=>a.a-b.a);
    const merged=[];
    for(const r of selected){
      const before=merged.at(-1);
      if(before&&r.a<=before.b)before.b=Math.max(before.b,r.b);
      else merged.push({a:r.a,b:r.b});
    }
    let out='', offset=0;
    for(const {a,b} of merged){out+=esc(str.slice(offset,a))+'<mark class="scene-emphasis">'+esc(str.slice(a,b))+'</mark>';offset=b;}
    return out+esc(str.slice(offset));
  }
  function rgbImage(parent,cls,url){
    const node=elem('img',cls,parent);node.src=url;node.alt='';node.draggable=false;return node;
  }
  function createSlot(parent,kind){
    const wrapper=elem('div','sc-frame '+kind,parent);
    const bg=rgbImage(wrapper,'sc-background','data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
    const wall=elem('div','ep-wall-lines sc-wall',wrapper);
    return {wrapper,bg,wall,pieces:new Map()};
  }
  function newView(stage){
    const root=elem('div','sc-composed',stage);
    const old=createSlot(root,'sc-old'), next=createSlot(root,'sc-next');
    const board=elem('aside','sc-board',next.wrapper);
    board.dataset.placement=board.dataset.kind='board';
    const heading=elem('strong','sc-board-term',board), zh=elem('span','sc-board-chinese',board), en=elem('span','sc-board-example',board);
    for(const row of [heading,zh,en])elem('span','',row);
    const bubble=elem('aside','sc-bubble',next.wrapper);
    bubble.dataset.placement=bubble.dataset.kind='bubble';
    const name=elem('span','sc-bubble-name',bubble), english=elem('span','sc-bubble-en',bubble), chinese=elem('span','sc-bubble-zh',bubble);
    const rail=stage.nextElementSibling?.querySelector('[data-ep-composed-names]');
    return {root,old,next,board,heading,zh,en,bubble,name,english,chinese,rail,plates:new Map()};
  }
  function geometry(node,p){
    node.style.left=p.x+'%';node.style.top=p.y+'%';node.style.width=p.w+'%';
    if(p.h>0)node.style.height=p.h+'%';else node.style.removeProperty('height');
  }
  function slotData(slot,scene,media){
    const bg=media.get(scene.background)?.url;
    if(bg&&slot.bg.getAttribute('src')!==bg)slot.bg.src=bg;
    const studio=scene.background==='studio';
    slot.wrapper.classList.toggle('sc-formal-studio',studio);
    slot.bg.hidden=studio;slot.wall.hidden=!studio;
    const seen=new Set();
    for(const p of [...scene.cast,...scene.props]){
      const actor=scene.cast.includes(p), k=(actor?'actor':'prop')+':'+p.id;
      seen.add(k);
      if(!slot.pieces.has(k)){
        const node=elem('div','sc-piece '+(actor?'sc-actor':'sc-prop'),slot.wrapper);
        node.dataset.placement=p.id;node.dataset.kind=actor?'actor':'prop';
        slot.pieces.set(k,{node,key:'', art:elem('div','sc-artwork',node)});
      }
      const entry=slot.pieces.get(k);
      entry.node.classList.toggle('sc-desk',p.asset==='desk');
      geometry(entry.node,p);
    }
    for(const [k,p] of slot.pieces)if(!seen.has(k)){p.node.remove();slot.pieces.delete(k);}
  }
  function sourcePiece(entry,media,native){
    const mediaKey=media?.id+':'+(native?'native':'img');
    if(!media||entry.key===mediaKey)return;
    entry.key=mediaKey;
    const {node,art}=entry;
    art.replaceChildren();art.classList.toggle('sc-standard',!!native);
    if(media.host){
      node.dataset.host=media.host;
      const sprite=elem('div','ep-sprite sc-host-image',art);
      rgbImage(sprite,'','/assets/elp-hosts-v1.png');
      const canvas=elem('canvas','',sprite);canvas.width=768;canvas.height=1024;canvas.hidden=true;
      sprite.classList.toggle('sc-host-right',media.host==='erica');
    }else{
      delete node.dataset.host;
      if(native){
        const clone=native.cloneNode(true);
        clone.removeAttribute('data-placement');clone.removeAttribute('data-kind');clone.classList.add('sc-native-prop');
        art.append(clone);
      }else rgbImage(art,'sc-image',media.url);
    }
  }
  function motion(t,p,kind,talking){
    if(reduced.matches||kind==='still')return '';
    if(kind==='nod')return 'translateY('+(-(Math.sin(t*7)**2)*3).toFixed(2)+'px) rotate('+(Math.sin(t*9)*2).toFixed(2)+'deg)';
    if(kind==='float')return 'translateY('+(-4+Math.sin(t*3.8)*4).toFixed(2)+'px)';
    if(kind==='talk'&&talking)return 'translateY('+(-2.5-Math.sin(t*16)**2*2.1).toFixed(2)+'px) rotate('+(Math.sin(t*7)*1.7).toFixed(2)+'deg)';
    return '';
  }
  const mix=(a,b,p)=>a+(b-a)*p;
  function presenceAt(scene,id,t){
    const segments=scene.presence?.filter(r=>r.actor===id);
    if(!segments?.length)return null;
    return segments.find(r=>r.start<=t&&t<r.end)??false;
  }
  function drawEntrance(node,clip,t){
    const duration=clip?Math.min(clip.seconds,(clip.end-clip.start)/2):0;
    const entering=!!(duration&&t-clip.start<duration), leaving=!!(duration&&clip.end-t<duration);
    const effect=reduced.matches?'cut':entering?clip.enter:leaving?clip.exit:'cut';
    const linear=entering?(t-clip.start)/duration:leaving?(clip.end-t)/duration:1;
    const progress=entering?1-(1-linear)**2:linear**2;
    const remaining=1-progress;
    let translate='';
    if(effect==='slide-left'||effect==='slide-right'){
      translate=`${(effect==='slide-left'?-65:65)*remaining}%`;
    }else if(effect.startsWith('fly-')){
      const horizontal=effect==='fly-left'||effect==='fly-right';
      const distance=horizontal?node.parentElement.clientWidth:node.parentElement.clientHeight;
      const sign=effect==='fly-left'||effect==='fly-up'?-1:1;
      const size=horizontal?node.offsetWidth:node.offsetHeight;
      const offset=`${sign*(distance+size)*remaining}px`;
      translate=horizontal?`${offset} 0px`:`0px ${offset}`;
    }
    node.style.opacity=effect==='fade'||effect==='pop'||effect.startsWith('slide-')?String(progress):'';
    node.style.translate=translate;
    node.style.scale=effect==='pop'?String(.74+.26*progress):'';
    node.style.maskImage=effect==='blinds'
      ?`repeating-linear-gradient(to bottom, black 0 ${progress*12.5}%, transparent ${progress*12.5}% 12.5%)`:'';
    return effect!=='cut';
  }
  function drawSlot(slot,scene,media,t,line,study,blend=null,boardOn=false, formal=null, graph=null, stage=null){
    slot.wrapper.dataset.scene=scene.template;
    slotData(slot,scene,media);
    const overrides=new Map();
    for(const m of scene.motion){if(m.start>t)break;if(t<m.end)overrides.set(m.actor,m);}
    let speaker='';
    const names=[];
    for(const p of scene.cast){
      const entry=slot.pieces.get('actor:'+p.id), motionCue=overrides.get(p.id);
      const presence=presenceAt(scene,p.id,t);
      entry.node.hidden=presence===false;
      if(entry.node.hidden)continue;
      const active=line?.actor===p.id&&line.variant?{...motionCue,...line,fx:p.fx}:motionCue;
      const playingSwap=!reduced.matches&&active?.variant&&active.swap&&active.swap!=='cut'&&t-active.start<.32;
      const progress=playingSwap?clamp((t-active.start)/.32,0,1):1;
      let asset=active?.variant||p.asset;
      if(playingSwap&&active.swap==='flip'&&progress<.5){
        const previous=scene.motion.findLast(m=>m!==active&&m.actor===p.id&&m.start<active.start&&m.end>=active.start-.04);
        asset=previous?.variant||p.asset;
      }
      const img=media.get(asset), kind=active?.fx??p.fx;
      sourcePiece(entry,img);
      const talking=kind==='talk'&&(line?.actor?line.actor===p.id:active?.fx==='talk');
      const layers=study.sceneLayers;
      const assetPath=value=>value?.replace(/^\.?\//,'');
      const authored=scene.template==='office'&&kind!=='still'&&!active?.variant&&!p.path?.length&&!p.routes?.length&&
        layers?.actors.some(a=>a.id===p.id&&assetPath(a.image)===assetPath(img?.url))
        ?window.ELP_HOST_MOTION?.actionAt(layers,p.id,t,talking?p.id:''):null;
      const sprite=entry.art.querySelector('.sc-image'), source=authored?.image||img?.url;
      if(sprite&&source&&sprite.getAttribute('src')!==source)sprite.src=source;
      entry.node.style.visibility=presence==null&&authored?.hidden?'hidden':'';
      const prev=blend?.old.cast.find(r=>r.asset===p.asset||r.id===p.id);
      let shape=pathAt(p,t);
      if(prev)shape={...shape,x:mix(prev.x,shape.x,blend.progress),y:mix(prev.y,shape.y,blend.progress),w:mix(prev.w,shape.w,blend.progress)};
      const official=formal?.[boardOn&&scene.template==='studio'?'board':scene.template]?.[p.id];
      const reference=graph?.reference?.[scene.template]?.cast.find(r=>r.id===p.id);
      if(official?.w&&reference){
        shape={...shape,x:official.x+shape.x-reference.x,y:official.y+shape.y-reference.y,w:official.w*shape.w/reference.w};
      }else if(boardOn&&scene.template==='studio'){
        const side=p.x<50?-1:1;
        shape={...shape,x:clamp(shape.x+side*14,8,92),y:Math.min(100,shape.y+2),w:shape.w*.68};
      }
      geometry(entry.node,shape);
      const sized=media.get(p.asset)?.family==='ep040';
      entry.node.classList.toggle('sc-cast-sized',sized);
      if(sized)entry.node.style.height=(shape.w*3.17)+'%';
      const n=entry.node;
      const transitioning=(presence||n.style.opacity||n.style.translate||n.style.scale||n.style.maskImage)&&drawEntrance(n,presence,t);
      entry.node.style.zIndex=zOf(p,'actor');
      entry.node.style.setProperty('--sc-move',authored||img?.host&&talking?'translateY(0px)':motion(t,p,kind,talking)||'translateY(0px)');
      entry.node.dataset.speaking=String(!!talking);
      entry.art.style.transform=authored?`translateX(${authored.shift}%) perspective(650px) rotateY(${authored.angle}deg) scaleX(${authored.flip?-1:1})`:playingSwap&&active.swap==='flip'?
        'perspective(500px) rotateY('+((progress<.5?progress:progress-1)*180)+'deg)':'';
      entry.art.style.opacity=authored?.opacity??(playingSwap&&active.swap==='fade'?progress:1);
      if(img?.host){
        if(talking)speaker=img.host;
        if(!transitioning)names.push({id:p.id,x:shape.x,name:img.role||img.title,talking});
      }
    }
    for(const p of scene.props){
      const entry=slot.pieces.get('prop:'+p.id), official=formal?.[boardOn&&scene.template==='studio'?'board':scene.template]?.[p.id];
      const reference=graph?.reference?.[scene.template]?.props.find(r=>r.id===p.id);
      const native=reference?.asset===p.asset&&stage?.querySelector('[data-ep-studio] [data-placement="'+p.id+'"]');
      sourcePiece(entry,media.get(p.asset),native);
      const shape=pathAt(p,t);
      geometry(entry.node,official?.w&&reference?{...shape,x:official.x+shape.x-reference.x,y:official.y+shape.y-reference.y,
        w:official.w*p.w/reference.w,h:native?official.h*p.w/reference.w:0}:shape);
      entry.node.style.zIndex=zOf(p,'prop');
    }
    if(study.hostMotion)window.ELP_HOST_MOTION?.pose(slot.wrapper,study.hostMotion,t,speaker);
    return names;
  }
  function syncNameplates(stage,view,names,reserveSpace=names.length>0){
    if(!view.rail)return;
    stage.toggleAttribute('data-composed-nameplates',reserveSpace);
    const visible=new Set();
    for(const {id,x,name,talking} of names){
      visible.add(id);
      let plate=view.plates.get(id);
      if(!plate){
        plate=elem('span','ep-host-name',view.rail);
        view.plates.set(id,plate);
      }
      if(plate.textContent!==name)plate.textContent=name;
      plate.style.setProperty('--name-x',x+'%');
      plate.dataset.speaking=String(talking);
    }
    for(const [id,plate] of view.plates)if(!visible.has(id)){
      plate.remove();view.plates.delete(id);
    }
  }
  function writeBoard(view,board,t,lang,scene){
    const visible=!!board||(scene.template==='board'&&lang!=='off');
    view.board.hidden=!visible;
    if(!visible)return;
    const form=s=>{
      const points=Array.from(s||'');
      if(!board||reduced.matches)return points.join('');
      const writing=board.write>0?Math.trunc(points.length*(t-board.start)/board.write):points.length;
      const erasing=board.erase>0?Math.ceil(points.length*(board.end-t)/board.erase):points.length;
      return points.slice(0,clamp(Math.min(writing,erasing),0,points.length)).join('');
    };
    for(const [row,copy] of [[view.heading,board?.term||''],[view.zh,lang==='en'?'':board?.zh||''],[view.en,lang==='zh'?'':board?.en||'']]){
      if(row.dataset.boardLine!==copy)row.dataset.boardLine=copy;
      row.hidden=!copy;
      const line=row.firstElementChild, value=form(copy);
      if(line.textContent!==value)line.textContent=value;
    }
  }
  function styleTransition(view,transition,t,old,current){
    const p=(reduced.matches||!transition||transition==='cut'||current.seconds<=0)?1:clamp((t-current.start)/current.seconds,0,1);
    const eased=p*p*(3-2*p), next=view.next.wrapper.style, prev=view.old.wrapper.style;
    next.opacity=1;next.transform='';next.clipPath='';
    prev.opacity=1;prev.transform='';
    const showOld=!!old&&p<1;
    view.old.wrapper.hidden=!showOld;
    if(p>=1)return null;
    if(transition==='slide'){
      next.transform='translateX('+((1-eased)*100)+'%)';
      if(showOld)prev.transform='translateX('+(-eased*28)+'%)';
    }else if(transition==='wipe'){
      next.clipPath='inset(0 '+((1-eased)*100)+'% 0 0)';
    }else if(transition==='focus'){
      next.transform='scale('+(1.1-eased*.1)+')';next.opacity=eased;
    }else if(transition==='match'){
      if(showOld)prev.opacity=1-eased;
      next.opacity=.65+.35*eased;
    }else if(transition==='dissolve'){
      next.opacity=eased;
    }else{
      if(showOld)prev.opacity=Math.max(0,1-eased*2);
      next.opacity=Math.max(0,eased*2-1);
    }
    return transition==='match'&&old?{old,progress:eased}:null;
  }
  function render(stage,study,t,lang,ref=referenceAt(study,t)){
    const graph=study.composition;
    if(!graph?.scenes?.length){
      const view=sets.get(stage);
      if(view){syncNameplates(stage,view,[]);view.root.remove();sets.delete(stage);}
      delete stage.dataset.composed;return null;
    }
    let view=sets.get(stage);
    if(!view){view=newView(stage);sets.set(stage,view);}
    if(view.graph!==graph){view.graph=graph;view.media=new Map(graph.assets.map(a=>[a.id,a]));view.bubbleKey='';}
    stage.dataset.composed=ref?.native?'reference':'true';
    const index=Math.max(0,at(graph.scenes,t)), scene=graph.scenes[index], previous=graph.scenes[index-1];
    const line=graph.lines[at(graph.lines,t)], cue=line&&t<line.end?line:null;
    const board=lang!=='off'?scene.board.find(b=>t>=b.start&&t<b.end):null;
    const actor=cue&&scene.cast.find(a=>a.id===cue.actor&&presenceAt(scene,a.id,t)!==false);
    const bubble=!!(actor&&lang!=='off'&&(cue.bubble==='on'||(cue.bubble==='inherit'&&scene.bubble)));
    view.root.hidden=!!ref?.native&&!bubble;
    if(ref?.native){
      view.old.wrapper.hidden=true;
      view.next.wrapper.removeAttribute('style');
      labelNative(stage);
      if(view.plates.size)syncNameplates(stage,view,[]);
    }else{
      const formal=measureFormal(stage,study);
      const blend=styleTransition(view,scene.transition,t,previous,scene);
      if(previous&&!view.old.wrapper.hidden)drawSlot(view.old,previous,view.media,scene.start-.001,null,study,null,false,formal,graph,stage);
      const names=drawSlot(view.next,scene,view.media,t,cue,study,blend,!!board,formal,graph,stage);
      syncNameplates(stage,view,names,scene.cast.some(p=>view.media.get(p.asset)?.host)||names.length>0);
      writeBoard(view,board,t,lang,scene);
      const opts=overlayOf(scene,'board');
      geometry(view.board,opts);view.board.style.zIndex=zOf(opts,'board');
    }
    view.bubble.hidden=!bubble;
    if(bubble){
      const key=[cue.id,lang,scene.id,actor?.asset,cue.start].join('|');
      if(view.bubbleKey!==key){
        view.bubbleKey=key;
        const label=actor&&view.media.get(actor.asset)?.role;
        view.name.textContent=label||'';
        view.name.hidden=!label;view.english.hidden=lang==='zh';view.chinese.hidden=lang==='en';
        view.english.innerHTML=html(cue.en,cue.highlights,'en');view.chinese.innerHTML=html(cue.zh,cue.highlights,'zh');
      }
      const opts=overlayOf(scene,'bubble'), actorNode=actor&&view.next.pieces.get('actor:'+actor.id)?.node;
      if(!graph.highlightVersion&&scene.overlays?.bubble?.x!=null){
        geometry(view.bubble,opts);view.bubble.classList.add('sc-placed-bubble');
      }else{
        view.bubble.classList.remove('sc-placed-bubble');
        view.bubble.style.removeProperty('width');
        const n=ref?.native?stage.querySelector('[data-placement="'+actor.id+'"][data-kind=actor]'):actorNode;
        const r=n?.getBoundingClientRect(), s=stage.getBoundingClientRect();
        const x=r?.width&&s.width?(r.x+r.width/2-s.x)/s.width*100:pathAt(actor,t).x;
        const w=clamp(scene.overlays?.bubble?.w??47,22,64);
        const center=clamp(x,w/2+2,98-w/2);
        view.bubble.style.width=w+'%';
        view.bubble.style.left=center+'%';
        view.bubble.style.setProperty('--sc-tail',clamp(50+(x-center)*100/w,9,91)+'%');
        const bubbleHeight=s.height?view.bubble.getBoundingClientRect().height/s.height*100:0;
        const target=r?.height&&s.height?(r.top-s.top)/s.height*100-3:25;
        const top=board?clamp(75,40,Math.max(40,98-bubbleHeight*.88)):clamp(Math.max(target,bubbleHeight+2),24,96);
        view.bubble.style.top=top+'%';
      }
      view.bubble.style.zIndex=zOf(opts,'bubble');
      view.bubble.classList.toggle('sc-bubble-low',!!board);
      view.bubble.classList.toggle('sc-follow-bubble',!!graph.highlightVersion);
    }
    const cards=scene.cards??[],card=cards.findLast(c=>t>=c.start&&t<c.end);
    return {cue,bubble,scene,card,controls:graph.controlVersion===1,explicitHighlights:graph.highlightVersion===1};
  }
  window.ELP_SCENE={render,html,referenceAt,overlayOf,zOf,pathAt};
})();
