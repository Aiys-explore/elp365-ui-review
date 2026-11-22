(() => {
  const panel=document.querySelector('#account');
  if(!panel){
    const bar=document.querySelector('#account-nav');
    if(!bar||location.protocol==='file:')return;
    fetch('/api/me').then(r=>r.ok?r.json():null).then(data=>{
      if(!data)return;
      const user=data.profile;
      bar.hidden=false;
      bar.querySelector('[data-account-name]').textContent=user.displayName||user.username;
      const avatar=bar.querySelector('[data-account-avatar]');
      if(user.avatarUrl){avatar.src=user.avatarUrl;avatar.hidden=false;}
      bar.querySelector('[data-admin]').hidden=user.role!=='admin';
      bar.querySelector('button').addEventListener('click',async()=>{
        await window.ELP_PROGRESS?.flush();
        const result=await fetch('/api/auth/logout',{method:'POST'});
        if(result.ok)location.href='/account.html';
      });
    }).catch(()=>{});
    return;
  }
  const get=s=>panel.querySelector(s), form=get('form'), params=new URLSearchParams(location.search);
  const setupCode=new URLSearchParams(location.hash.slice(1)).get('setup')||'';
  const scene=params.get('next')==='scene'&&/^ep-\d{3}$/.test(params.get('lesson')||'')?params.get('lesson'):null;
  const admin=params.get('next')==='admin'||params.get('next')==='ep040'||!!scene;
  const adminUrl=scene?'/admin/scenes/'+scene:params.get('next')==='ep040'?'/admin/ep040':'/admin';
  let resume=/^#(?:study|resources|core|whole|notes|lesson\/ep-\d{3}(?:\/(?:core|whole|notes))?)$/.test(location.hash)?location.hash:'#study';
  const studyUrl=()=>params.get('next')==='me'?'/me':params.get('next')==='workplace-message'?'/practice/workplace-message':(location.pathname==='/'?'/index.html':'/')+resume;
  if(setupCode)history.replaceState(null,'',location.pathname+location.search);
  let mode=setupCode?'setup':'login';
  function show(){
    const label={login:'登录学习室',register:'注册学员账号',setup:'设置管理员账号'}[mode];
    get('#auth-title').textContent=label;
    get('#auth-submit').textContent=mode==='login'?'登录':mode==='register'?'注册并登录':'创建管理员';
    get('.mg-tabs').hidden=mode==='setup';
    get('#invite').hidden=mode!=='register';
    form.elements.code.required=mode==='register';
    form.elements.password.autocomplete=mode==='login'?'current-password':'new-password';
    form.elements.password.minLength=mode==='login'?1:8;
    get('#auth-help').textContent=mode==='register'?'邀请码是原来的试学密码。密码至少 8 个字符，以后用自己的用户名和密码登录。':
      mode==='setup'?'请设置自己的用户名和密码（至少 8 个字符）。此入口只能创建一次管理员。':'';
    get('#account-status').textContent='';
    for(const b of panel.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===mode));
  }
  for(const b of panel.querySelectorAll('[data-mode]'))b.onclick=()=>{mode=b.dataset.mode;show();};
  form.onsubmit=async e=>{
    e.preventDefault();
    const button=get('#auth-submit'), status=get('#account-status');button.disabled=true;status.textContent='正在处理…';
    try{
      const {username,password,code}=Object.fromEntries(new FormData(form));
      const r=await fetch('/api/auth/'+mode,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password,code:mode==='setup'?setupCode:code})});
      const result=await r.json();
      if(!r.ok)throw Error(result.error);
      location.replace(result.role==='admin'&&(mode==='setup'||admin)?adminUrl:studyUrl());
    }catch(error){status.textContent=error.message||'暂时无法连接，请重试。';button.disabled=false;}
  };
  show();
  if(!setupCode&&location.pathname==='/account.html')fetch('/api/auth/session').then(r=>r.json()).then(({user})=>{
    if(user)location.replace(admin&&user.role==='admin'?adminUrl:studyUrl());
  }).catch(()=>{});
})();
