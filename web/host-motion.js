(() => {
  'use strict';
  const W=768,H=1024;
  const landmarks=[
    {mouth:[508,513,87,53,25,-.16],eyes:[[416,408,46,30,21,-.04],[552,385,32,30,22,-.12]]},
    {mouth:[325,526,86,53,25,.095],eyes:[[256,401,43,33,21,.13],[410,420,49,34,23,.12]]}
  ];
  const limit=(x,a,b)=>Math.max(a,Math.min(x,b));
  const smooth=x=>x*x*(3-2*x);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const banks=new Map();
  const rendered=new WeakMap();
  const waiting=new WeakSet();
  const strokes=[.77,.56,.36,.20,.095];
  const officeFaces=[
    {id:'rachel',eyes:'M239 107q3 2 6 0m24 0q3 2 6 0',mouth:[252,119,13]},
    {id:'colleague',eyes:'M408 102q3 2 6 0m22 0q3 2 6 0',mouth:[419,118,14]}
  ];
  const neutralFaces=new WeakMap();

  // Warp narrow columns without reading pixels, so this also works on file://.
  function warp(image,half,[cx,cy,rx,ry,inner,slope],scale){
    const x=Math.floor(cx-rx),y=Math.floor(cy-ry-Math.abs(rx*slope)-2);
    const canvas=document.createElement('canvas');
    const w=canvas.width=Math.ceil(rx*2),h=canvas.height=Math.ceil(ry*2+2*Math.abs(rx*slope)+4);
    const ctx=canvas.getContext('2d');
    ctx.drawImage(image,half*W+x,y,w,h,0,0,w,h);
    for(let dx=0;dx<w;dx+=2){
      const width=Math.min(2,w-dx),offset=x+dx+width/2-cx;
      const strength=1+(scale-1)*smooth(limit((1-Math.abs(offset)/rx)/.28,0,1));
      if(strength===1)continue;
      const center=cy+slope*offset,edge=inner*strength;
      const source=[center-ry,center-inner,center+inner,center+ry];
      const target=[center-ry,center-edge,center+edge,center+ry];
      for(let i=0;i<3;i++){
        ctx.drawImage(image,half*W+x+dx,source[i],width,source[i+1]-source[i],
          dx,target[i]-y,width,target[i+1]-target[i]);
      }
    }
    return {canvas,x,y};
  }
  function patch(image,i,part,index,scale){
    const key=image.src+'|'+i+'|'+part+'|'+index;
    if(!banks.has(key)){
      const box=part==='mouth'?landmarks[i].mouth:landmarks[i].eyes[Number(part)];
      banks.set(key,warp(image,i,box,scale));
    }
    return banks.get(key);
  }
  function energyAt(track,t){
    const time=limit(t*track.fps,0,track.levels.length-1);
    const n=Math.floor(time),f=time-n;
    return (track.levels[n]*(1-f)+(track.levels[n+1]??track.levels[n])*f)/255;
  }
  function blinkAt(t,i){
    const cycle=i?3.87:4.21,phase=i?.77:1.38;
    const distance=Math.abs(((t-phase+cycle/2)%cycle+cycle)%cycle-cycle/2);
    return distance<.095&&!reduced.matches?Math.floor((1-distance/.095)*4.99):-1;
  }
  function pose(stage,track,t,speaker){
    if(!track?.levels?.length)return;
    const energy=energyAt(track,t);
    for(const [i,id] of ['marco','erica'].entries()){
      const node=stage.querySelector('[data-host="'+id+'"]');
      const sprite=node?.querySelector('.ep-sprite'),image=sprite?.querySelector('img'),canvas=sprite?.querySelector('canvas');
      if(!image||!canvas)continue;
      if(!image.complete){
        if(!waiting.has(image)){
          waiting.add(image);
          image.addEventListener('load',()=>{if(stage.isConnected)stage.dispatchEvent(new Event('host-portrait-ready',{bubbles:true}));},{once:true});
        }
        continue;
      }
      if(image.naturalWidth!==W*2||image.naturalHeight!==H)continue;
      const talking=speaker===id&&!reduced.matches;
      const mouth=talking?Math.round(limit(energy*(.77+.23*Math.sin(t*24)**2),0,1)*12):0;
      const blink=blinkAt(t,i);
      const key=mouth+':'+blink;
      if(rendered.get(canvas)!==key){
        rendered.set(canvas,key);
        const ctx=canvas.getContext('2d');
        ctx.clearRect(0,0,W,H);
        ctx.drawImage(image,i*W,0,W,H,0,0,W,H);
        const m=patch(image,i,'mouth',mouth,.19+mouth*.069);
        ctx.drawImage(m.canvas,m.x,m.y);
        if(blink>=0){
          for(const eye of ['0','1']){
            const p=patch(image,i,eye,blink,strokes[blink]);
            ctx.drawImage(p.canvas,p.x,p.y);
          }
        }
        canvas.hidden=false;
        image.classList.add('ep-motion-source');
        canvas.dataset.pose=key;
      }
      // No independent clock: the pose freezes on pause and is recreated on seek.
      const y=reduced.matches?0:talking?-.35-energy*2.2:Math.sin(t*4+i)*.8;
      const a=reduced.matches?0:talking?Math.sin(t*8)*1.25:Math.sin(t*4+i)*.65;
      sprite.style.transform=`translateY(${y}px) rotate(${a}deg)`;
    }
  }
  function officePose(stage,track,t,speaker){
    if(!track?.levels?.length)return;
    const energy=energyAt(track,t);
    for(const [i,face] of officeFaces.entries()){
      const actor=stage.querySelector(`[data-office-actor=${face.id}]`);
      if(!actor)continue;
      const mouth=actor.querySelector('[data-office-mouth]'),eyes=actor.querySelector('[data-office-eyes]');
      if(!neutralFaces.has(actor))neutralFaces.set(actor,[mouth.getAttribute('d'),eyes.getAttribute('d')]);
      const [smile,openEyes]=neutralFaces.get(actor);
      const talking=speaker===face.id&&!reduced.matches;
      const opening=talking?Math.round(Math.max(0,energy-.09)*(.75+.25*Math.sin(t*24)**2)*13):0;
      const blink=blinkAt(t,i)>=1;
      const key=opening+':'+blink;
      if(rendered.get(actor)!==key){
        rendered.set(actor,key);
        const [x,y,w]=face.mouth;
        mouth.setAttribute('d',opening?`M${x} ${y}q${w/2} 3 ${w} 0q${-w/2} ${opening+3} ${-w} 0Z`:smile);
        mouth.setAttribute('fill',opening?'#69433e':'none');
        eyes.setAttribute('d',blink?face.eyes:openEyes);
      }
      const lift=talking?-energy*(1.5+.9*Math.sin(t*8)**2):0;
      const tilt=talking?Math.sin(t*8)*energy*1.7:0;
      actor.style.transform=lift||tilt?`translateY(${lift}px) rotate(${tilt}deg)`:'';
    }
  }
  const warmed=new Set();
  function prepareLayers(layers){
    for(const actor of layers?.actors||[]){
      for(const src of [actor.image,...Object.values(actor.poses||{}).map(p=>p.image)]){
        if(warmed.has(src))continue;
        warmed.add(src);
        const img=new Image();img.src=src;
      }
    }
  }
  // The animation clock is the original recording. Authored states are snapshots,
  // so jumping into a scene needs no prior playthrough or elapsed wall time.
  function actionAt(layers,id,t,speaker){
    const actor=layers?.actors.find(a=>a.id===id);
    if(!actor?.poses)return null;
    const shot=layers.shots?.find(s=>t>=s.start&&t<s.end);
    const index=shot?.beats.findLastIndex(b=>b.at<=t)??-1;
    const beat=index>=0?shot.beats[index]:null;
    const prev=index>0?shot.beats[index-1]:null;
    const state=beat?.cast?.[id]||{},last=prev?.cast?.[id]||{};
    const progress=!reduced.matches&&prev?Math.min(1,(t-beat.at)/.24):1;
    const ease=1-(1-progress)**3;
    const turning=!!last.flip!==!!state.flip&&progress<1;
    const entering=last.hidden===true&&state.hidden!==true;
    const key=state.pose||(id===speaker?'speak':'listen');
    const moveTime=Number(state.moveSeconds)||.24;
    const moveProgress=!reduced.matches&&prev?smooth(Math.min(1,(t-beat.at)/moveTime)):1;
    const offset=(last.offset||0)+((state.offset||0)-(last.offset||0))*moveProgress;
    return {
      image:actor.poses[key]?.image||actor.image,
      key,hidden:state.hidden===true,
      opacity:entering?ease:1,
      shift:offset+(entering?(1-ease)*34:0),
      flip:turning&&progress<.5?!!last.flip:!!state.flip,
      angle:turning?(progress<.5?progress:progress-1)*158:0
    };
  }
  function layerPose(stage,track,t,speaker,layers){
    const energy=reduced.matches||!track?.levels?.length?0:energyAt(track,t);
    for(const puppet of stage.querySelectorAll('[data-scene-actor]')){
      const action=actionAt(layers,puppet.dataset.sceneActor,t,speaker);
      if(action){
        if(puppet.getAttribute('src')!==action.image)puppet.src=action.image;
        puppet.hidden=action.hidden;
        puppet.dataset.pose=action.key;
        puppet.dataset.facing=action.flip?'flipped':'original';
        puppet.style.opacity=action.opacity;
        puppet.style.setProperty('--puppet-shift',action.shift+'%');
        puppet.style.setProperty('--puppet-angle',action.angle+'deg');
        puppet.style.setProperty('--puppet-facing',action.flip?-1:1);
        continue;
      }
      const active=puppet.dataset.sceneActor===speaker;
      const lift=active?energy*(2.1+1.8*Math.sin(t*8)**2):0;
      const turn=active?energy*Math.sin(t*6.5)*2:0;
      puppet.style.setProperty('--puppet-lift',-lift.toFixed(2)+'px');
      puppet.style.setProperty('--puppet-turn',turn.toFixed(2)+'deg');
    }
  }
  window.ELP_HOST_MOTION={pose,officePose,layerPose,actionAt,prepareLayers};
})();
