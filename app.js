(() => {
  'use strict';
  const {Board,LEVELS}=GameEngine,$=s=>document.querySelector(s),app=$('#app'),modal=$('#modal');
  const STORE='life-bureau-demo-v08',fresh=()=>({version:2,nickname:'新任执行员',title:'初次报到',coins:0,rewards:{},avatar:null,onboarded:false,accepted:false,completed:0,active:null,brushes:0,brushGift:false,episode:null,clue:false,taught:{},ach:{},muted:true,reduced:false});
  let state=fresh(),board=null,screen='opening',busy=false,selected=-1,brushMode=false,developMode=false,bonusFast=false,screenToken=0,slide=0,storyReplay=false,routeScroll=0,archiveScroll=0;
  try{const saved=JSON.parse(localStorage.getItem(STORE));if(saved?.version===2)state={...state,...saved,taught:saved.taught||{},ach:saved.ach||{}};}catch{}
  state.completed=Math.max(0,Math.min(5,Number(state.completed)||0));state.brushes=Math.max(0,Number(state.brushes)||0);
  if(state.active&&!Board.validSnapshot(state.active)){state.active=null;}
  if(!state.taught||typeof state.taught!=='object'||Array.isArray(state.taught))state.taught={};
  if(!state.ach||typeof state.ach!=='object'||Array.isArray(state.ach))state.ach={};
  state.completed=Math.floor(state.completed);
  state.brushes=Number.isFinite(state.brushes)?Math.floor(state.brushes):0;
  if(state.active?.level>state.completed)state.active=null;
  if(state.episode!==null&&(!Number.isInteger(state.episode)||state.episode<0||state.episode>4))state.episode=null;
  if(state.avatar&&!['female','male','friend','colleague'].includes(state.avatar))state.avatar=null;
  if(state.ruleVersion!==4){state.taught[2]=false;state.taught[3]=false;state.ruleVersion=4;}
  state.coins=Number.isSafeInteger(state.coins)&&state.coins>=0?state.coins:0;
  state.rewards=state.rewards&&typeof state.rewards==='object'&&!Array.isArray(state.rewards)?state.rewards:{};
  const EXECUTORS=[['female','寻光'],['male','远行'],['friend','拾忆'],['colleague','观澜']];
  let editingAvatar=false,draftPhoto=null,uploadBusy=false;
  if(typeof state.avatarPhoto!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(state.avatarPhoto)||state.avatarPhoto.length>250000)state.avatarPhoto=null;
  const escapeText=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  state.nickname=typeof state.nickname==='string'?state.nickname.slice(0,12):'新任执行员';
  const ICON={back:'m14 5-7 7 7 7',arrow:'M4 12h16m-6-6 6 6-6 6',home:'m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9',folder:'M3 6h7l2 3h9v11H3ZM3 6V4h7l2 2',book:'M12 5C8 2 3 3 3 3v17s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2ZM12 5v17',person:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21v-2a8 8 0 0 1 16 0v2',lock:'M6 10h12v11H6Zm3 0V6a3 3 0 0 1 6 0v4M12 14v3',check:'m4 12 5 5L20 6',pause:'M8 5v14M16 5v14',close:'m6 6 12 12M6 18 18 6',reset:'M4 9a8 8 0 1 1 0 8M4 3v6h6',photo:'M3 4h18v16H3Zm0 12 6-6 5 5 3-3 4 4M16 7h.01',sound:'M3 9h4l5-5v16l-5-5H3Zm13-2c4 3 4 7 0 10'};
  const icon=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON[n]||ICON.folder}"/></svg>`;
  const image=(name,cls='',alt='')=>`<img class="${cls}" src="assets/${name}.png" alt="${alt}" draggable="false">`;
  const glyph=(n)=>`<span class="art-icon icon-${n}" aria-hidden="true"></span>`;
  const portrait=(who,cls='')=>`<svg class="portrait ${cls}" viewBox="${cls.split(' ').includes('full')?'0 0 530 1536':'530 0 494 510'}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${({female:'女执行员',male:'男执行员',grandma:'接待奶奶',zhixia:'林知夏',aunt:'林姨',friend:'陈禾',colleague:'周远'})[who]}"><image href="assets/${who}.png" width="1024" height="1536"/></svg>`;
  const myPortrait=(cls='')=>state.avatarPhoto?`<img class="portrait uploaded-avatar ${cls}" src="${state.avatarPhoto}" alt="我的头像">`:portrait(state.avatar||'female',cls);
  const primary=(action,text,extra='')=>`<button class="primary" data-action="${action}" ${extra}>${text}${icon('arrow')}</button>`;
  function save(){try{localStorage.setItem(STORE,JSON.stringify(state));}catch{toast('当前浏览器无法保存，请保持页面开启。');}}
  let toastTimer;function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200);}
  function nav(active){return `<nav class="bottom-nav" aria-label="主导航">${[['home','home','首页'],['commission','folder','委托'],['archive','book','档案'],['profile','person','我的']].map(([a,i,t])=>`<button data-action="${a}" ${a===active?'class="current" aria-current="page"':''}>${icon(i)}<span>${t}</span></button>`).join('')}</nav>`;}
  function top(title,back='home'){return `<header class="topbar"><button class="icon-button" data-action="${back}" aria-label="返回">${icon('back')}</button><h1>${title}</h1><span></span></header>`;}
  function dialog(html){modal.innerHTML=`<div class="modal-inner">${html}</div>`;if(!modal.open)modal.showModal();modal.querySelector('button')?.focus();}
  function close(){modal.close();}
  function show(next){
    if(screen==='route')routeScroll=app.scrollTop;if(screen==='archive')archiveScroll=app.scrollTop;
    const oldVideo=$('#intro-video');if(oldVideo){oldVideo.pause();oldVideo.removeAttribute('src');oldVideo.load();}
    releaseAnimations();screenToken++;screen=next;selected=-1;brushMode=false;developMode=false;busy=false;close();
    app.className=`screen-${next}`;app.innerHTML='';app.scrollTop=0;
    const renders={opening,login,avatar,onboarding,home,commission,dossier,archive,route,profile,achievements,game,episode,clue};
    renders[next]();
    window.BureauMusic?.scene(next);
    document.documentElement.classList.toggle('reduce-motion',state.reduced);
    app.scrollTop=0;
  }
  function opening(){
    const token=screenToken;
    app.innerHTML=`<div class="entry-art"></div><div class="opening-title">${image('logo','','人生委托局')}<p>每一段人生，都有未完的心愿</p></div><button class="skip" data-action="login">跳过 ${icon('arrow')}</button>`;
    setTimeout(()=>{if(screenToken===token)show('login');},state.reduced?100:3200);
  }
  function login(){app.innerHTML=`<div class="entry-art"></div><section class="login-body">${image('logo','logo','人生委托局')}<p>走进别人的人生，<br>回应未完成的心愿。</p>${primary('login-go',state.avatar?'继续我的旅程':'以游客身份进入')}<small>进度保存在当前浏览器，无需注册</small></section>`;}
  function avatar(){
    draftPhoto=state.avatarPhoto||null;uploadBusy=false;
    app.innerHTML=`${top('昵称与头像',editingAvatar?'profile':'login')}<div class="page-intro"><h2>怎么称呼你？</h2><p>留个名字，开启你的第一份委托。</p></div><div class="identity-editor"><label class="name-label">昵称（最多12字）<input id="profile-name" maxlength="12" value="${escapeText(state.nickname)}" autocomplete="off"></label><p>选择一个头像</p><div class="profile-avatar-grid">${EXECUTORS.map(([who,name],i)=>`<label><input type="radio" name="avatar" value="${who}" ${!draftPhoto&&(state.avatar?state.avatar===who:i===0)?'checked':''}>${portrait(who)}<span>${name}</span></label>`).join('')}<label id="custom-avatar-choice" ${draftPhoto?'':'hidden'}><input type="radio" name="avatar" value="custom" ${draftPhoto?'checked':''}><img id="custom-avatar-preview" class="portrait uploaded-avatar" ${draftPhoto?`src="${draftPhoto}"`:''} alt="自选头像"><span>自选头像</span></label></div><label class="upload-avatar">上传自己的图片<input id="avatar-file" type="file" accept="image/png,image/jpeg,image/webp"></label><small id="upload-note" role="status">支持 JPG、PNG、WebP，最大10MB；仅保存在本机。</small></div><div class="page-bottom">${primary('register',editingAvatar?'保存资料':'开启我的旅程')}</div>`;
  }
  document.addEventListener('change',async e=>{
    if(e.target.id!=='avatar-file')return;
    const file=e.target.files?.[0];if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){toast('请选择10MB以内的 JPG、PNG 或 WebP 图片。');e.target.value='';return;}
    const token=screenToken;uploadBusy=true;
    const url=URL.createObjectURL(file);
    try{
      const img=new Image();img.src=url;await img.decode();
      if(token!==screenToken)return;
      const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
      const context=canvas.getContext('2d'),size=Math.min(img.naturalWidth,img.naturalHeight);
      context.fillStyle='#e9dfc9';context.fillRect(0,0,256,256);
      context.drawImage(img,(img.naturalWidth-size)/2,(img.naturalHeight-size)/2,size,size,0,0,256,256);
      draftPhoto=canvas.toDataURL('image/jpeg',0.85);
      $('#custom-avatar-preview').src=draftPhoto;$('#custom-avatar-choice').hidden=false;
      $('[name="avatar"][value="custom"]').checked=true;
      $('#upload-note').textContent='头像已准备好，保存后生效。';
    }catch{if(token===screenToken)toast('这张图片无法读取，请换一张试试。');}
    finally{URL.revokeObjectURL(url);if(token===screenToken)uploadBusy=false;}
  });
  let introPart=0,introWaiting=false;

  const introLines=['开启对话','欢迎来到人生委托局。这里收着一些还没有完成的心愿。','你会进入他们的人生，替他们把没能走完的那一段，继续走下去。'];
  function holdIntro(){
    if(introWaiting)return;
    introWaiting=true;
    const heldVideo=$('#intro-video');
    heldVideo.pause();
    $('#cg-hold').src=`assets/cg/scene-${String(introPart+1).padStart(2,'0')}-end.jpg`;
    $('#cg-hold').hidden=false;
    $('.cg-dialogue').hidden=introPart===0;
    $('#cg-open-dialogue').hidden=introPart!==0;
    $('.cg-speaker').hidden=introPart===0;
    $('#cg-line').textContent=introLines[introPart];
    $('#cg-next').hidden=false;
    $('#cg-next').textContent=introPart===0?'开启对话 ▸':introPart===2?'点击继续 · 接取第一份委托 ▸':'点击继续 ▸';
    $('#cg-pause').hidden=true;
    $('#cg-play').hidden=true;
    $('#cg-status').textContent='';
  }
  function nextIntro(){
    if(!introWaiting)return;
    if(introPart===2){endIntro();return;}

    introPart++;introWaiting=false;
    $('#cg-open-dialogue').hidden=true;
    $('.cg-dialogue').hidden=false;
    $('#cg-next').hidden=true;$('#cg-pause').hidden=false;
    $('#cg-line').textContent=introLines[introPart];
    $('.cg-speaker').hidden=false;
    const video=$('#intro-video');
    video.src=`assets/cg/scene-${String(introPart+1).padStart(2,'0')}.mp4`;video.load();
    playIntro();
  }
  function onboarding(){
    introPart=0;introWaiting=false;
    const token=screenToken;
    app.innerHTML=`<div class="cg-backdrop"></div><video id="intro-video" class="intro-video" src="assets/cg/scene-01.mp4" poster="assets/cg/intro-poster.jpg" playsinline webkit-playsinline preload="auto" aria-label="第一份委托：入局、奶奶迎接与递交档案"></video><img id="cg-hold" class="cg-hold" alt="上一段的最后一帧" hidden><div class="cg-brand">${image('logo','','人生委托局')}</div><div class="cg-toolbar"><button data-action="intro-video-sound" id="cg-sound">关闭声音</button><button data-action="intro-video-pause" id="cg-pause">暂停</button><button data-action="intro-skip">跳过</button></div><button class="cg-play" data-action="intro-video-play" id="cg-play" hidden>播放开场 CG</button><section class="cg-dialogue" aria-label="奶奶的对话" hidden><div class="cg-speaker">${portrait('grandma')}<strong>接待奶奶</strong></div><p id="cg-line" aria-live="polite">欢迎来到人生委托局。</p><button class="cg-dialogue-note" id="cg-next" data-action="intro-next" hidden>点击继续 ▸</button></section><div class="cg-open-dialogue" id="cg-open-dialogue" hidden>${primary('intro-next','开启对话')}</div><p class="cg-status" id="cg-status" role="status">正在准备影片…</p><div class="cg-ending intro-end" hidden><p>第一份委托已送达</p>${primary('intro-start','开始我的第一份委托')}<button class="text-link" data-action="intro-video-replay">重播 CG</button></div>`;
    const video=$('#intro-video');video.muted=false;
    $('.cg-dialogue').hidden=true;
    video.addEventListener('ended',()=>{if(token===screenToken)holdIntro();});
    video.addEventListener('playing',()=>{if(token!==screenToken)return;$('#cg-hold').hidden=true;$('#cg-play').hidden=true;$('#cg-status').textContent='';$('#cg-pause').textContent='暂停';});
    video.addEventListener('waiting',()=>{if(token===screenToken)$('#cg-status').textContent='影片加载中…';});
    video.addEventListener('error',()=>{if(token!==screenToken)return;endIntro();$('#cg-status').textContent='影片暂时无法播放，你仍可接取委托。';});
    playIntro();
  }
  function playIntro(){
    const video=$('#intro-video'),token=screenToken;if(!video||introWaiting)return;
    const result=video.play();
    result?.catch(()=>{if(token!==screenToken)return;$('#cg-play').hidden=false;$('#cg-status').textContent='点击播放，开始你的第一份委托。';$('#cg-pause').textContent='播放';});
  }
  function endIntro(){
    screenToken++;
    const video=$('#intro-video');video?.pause();
    app.classList.add('cg-finished');
    $('#cg-open-dialogue').hidden=true;
    $('.cg-dialogue').hidden=true;$('.intro-end').hidden=false;$('.cg-toolbar').hidden=true;$('#cg-play').hidden=true;$('#cg-status').textContent='';
  }
  function home(){
    app.innerHTML=`<div class="bureau-art"></div><header class="home-heading">${image('logo','logo','人生委托局')}<button class="avatar-mini" data-action="profile" aria-label="我的执行员">${myPortrait()}</button></header><button class="coin-wallet" data-action="wallet">金币 <b>${state.coins}</b></button><aside class="home-side">${[['settings','settings','设置'],['rank','rank','排行榜'],['checkin','checkin','签到'],['achievements','achievement','成就']].map(([a,i,t])=>`<button data-action="${a}">${glyph(i)}<span>${t}</span></button>`).join('')}</aside><div class="grandma">${portrait('grandma','full')}</div><div class="home-cta">${primary('continue',state.accepted?'继续完成委托':'开始完成委托')}<small>${state.completed>=5?'开篇已完成 · 回顾线索':`合照里少了一个人 · 第${(state.active?.level??state.completed)+1}关`}</small></div>${nav('home')}`;
  }
  function commission(){
    app.innerHTML=`${top('当前委托')}<div class="commission-content"><p class="eyebrow">第一段人生 · 旧照相馆</p><article class="commission-card"><div class="commission-cover">${image('cover','','旧照相馆')}</div><div class="commission-copy"><p class="eyebrow">合照里少了一个人</p><h2>久违的照相馆</h2><p>一张泛黄的合照里，<br>好像少了一个本该在场的人……</p><div class="mini-progress">${LEVELS.map((_,i)=>`<span class="${i<state.completed?'done':''}">${i<state.completed?icon('check'):i+1}</span>`).join('')}</div><small>开篇进度 ${state.completed}/5 · 人生委托仍在继续</small>${primary(state.accepted?'continue':'accept',state.accepted?'继续完成委托':'接取委托')}<button class="text-link" data-action="dossier">查看林知夏的资料 ${icon('arrow')}</button></div></article></div>${nav('commission')}`;
  }
  function dossier(){
    app.innerHTML=`${top('原主资料','commission')}<article class="dossier"><div class="identity">${portrait('zhixia')}<div><span class="eyebrow">原主 · 001</span><h2>林知夏</h2><p>26岁<br>社区档案整理工作者</p></div></div><section class="wish"><small>未竟的心愿</small><blockquote>“帮我找到我的家人。”</blockquote></section><p>林姨住院后，知夏回到熟悉的旧照相馆整理物品。她希望从留下的旧物里，找到关于家人的答案。</p><h3>她身边的人</h3><div class="relations">${[['aunt','林姨','抚养者'],['friend','陈禾','童年好友'],['colleague','周远','工作同事']].map(([id,name,role])=>`<button data-action="relation" data-id="${id}">${portrait(id)}<strong>${name}</strong><small>${role}</small></button>`).join('')}</div>${primary(state.accepted?'continue':'accept',state.accepted?'继续委托':'接取委托')}</article>`;
  }
  function archive(){
    const current=state.active?.level??Math.min(state.completed,4);
    app.innerHTML=`${top('档案')}<div class="story-cards"><button class="story-card unlocked" data-action="route">${image('cover','','旧照相馆')}<span class="current-pill">${state.completed===5?'开篇已完成':`当前第${current+1}关`}</span><span class="story-caption"><strong>合照里少了一个人</strong><small>第1—5关<br>开篇试玩</small></span></button>${[1,2].map((_,i)=>`<button class="story-card locked" data-action="future"><div class="future-scene future-${i}">${image(i?'entry':'bureau')}</div><span class="locked-overlay">${icon('lock')}<strong>未解锁</strong><small>关卡范围待开放</small></span></button>`).join('')}</div>${nav('archive')}`;
  }
  function route(){
    const current=state.active?.level??Math.min(state.completed,4);
    const xs=[134,175,166,143,150,163],ys=[394,466,538,610,682,754];
    const paths=xs.slice(0,-1).map((x,i)=>`<path class="${i<state.completed?'lit':''} ${i===4?'future-trail':''}" d="M ${x} ${ys[i]+23} C ${x+46} ${ys[i]+53},${xs[i+1]-50} ${ys[i+1]-48},${xs[i+1]} ${ys[i+1]-24}"/>`).join('');
    app.innerHTML=`${image('route-cinematic','route-cinematic','林知夏与身边的人，旧照相馆合影')}<button class="icon-button cinematic-back" data-action="archive" aria-label="返回档案">${icon('back')}</button><header class="cinematic-heading"><h1>合照里少了一个人</h1><p>${state.completed===5?'开篇已完成':`当前第 <b>${current+1}</b> 关`}</p></header><svg class="cinematic-trail" viewBox="0 0 390 844" aria-hidden="true"><path class="trail-intro" d="M 246 317 C 81 304,73 350,134 370"/>${paths}</svg><ol class="cinematic-levels" aria-label="关卡路线">${[...LEVELS,{name:'后续待开放'}].map((l,i)=>{
      const done=i<state.completed,now=i===current&&state.completed<5,locked=i===5||i>state.completed;
      return `<li class="${done?'done':''} ${now?'now':''} ${locked?'locked':''} ${i===5?'future':''}" style="--node-x:${xs[i]}px;--node-y:${ys[i]}px"><button class="cinematic-node" data-action="${i===5?'future':'level'}" ${i<5?`data-level="${i}"`:''} aria-label="第${i+1}关 ${l.name}，${done?'已完成':now?'当前可挑战':'未解锁'}"><b>${i+1}</b>${done?`<span class="cinematic-badge">${icon('check')}</span>`:locked?`<span class="cinematic-badge">${icon('lock')}</span>`:''}</button><span class="cinematic-label">${l.name}</span>${now?'<span class="cinematic-current">当前</span>':''}${i===4?`<button class="cinematic-clue" data-action="clue" aria-label="${state.clue?'查看童年照':'第5关关键线索，尚未获得'}">${image(state.clue?'clue':'back')}<small>${state.clue?'查看线索':'关键线索'}</small></button>`:''}</li>`;
    }).join('')}</ol><p class="cinematic-foot">开篇试玩<span>委托仍未结束</span></p>`;
  }
  function profile(){
    app.innerHTML=`${top('执行员档案')}<div class="agent-sheet"><section class="agent-card"><span class="agent-number">人生委托局 · 执行员 001</span><div class="agent-identity">${myPortrait('agent-face')}<div><h2>${escapeText(state.nickname)}</h2><span class="agent-title">${escapeText(state.title||'初次报到')}</span><button class="text-link" data-action="rename">修改昵称</button></div></div><button class="agent-change" data-action="switch-avatar">修改昵称与头像 ${icon('arrow')}</button></section><div class="agent-stats"><div><b>${state.completed}</b><span>通过关卡</span></div><div><b>0</b><span>完成委托</span></div><div><b>${state.clue?1:0}</b><span>发现线索</span></div></div><button class="agent-collection" data-action="collection">${image(state.clue?'clue':'back')}<div><strong>${state.clue?'最新线索 · 被裁剪的童年照':'你的第一件线索，尚待发现'}</strong><p>${state.clue?'画面外，还有谁？':'完成「久违的照相馆」，收藏人生的片段。'}</p><span>打开线索收藏 ${icon('arrow')}</span></div></button><div class="agent-actions"><button data-action="titles">${glyph('achievement')}<span>成就与称号</span></button><button data-action="wallet"><strong>${state.coins}</strong><span>我的金币</span></button><button data-action="intro-replay">${icon('photo')}<span>重看开场</span></button><button data-action="settings">${glyph('settings')}<span>游戏设置</span></button></div><p class="agent-foot">本次为五关开篇 · 人生委托尚未结束<br>独立试玩存档 · v0.8</p></div>${nav('profile')}`;
  }
  function achievements(){app.innerHTML=`${top('成就')}<section class="achievement-list">${[['swap','第一次整理','完成一次有效三消'],['line','一束补光','首次合成四连补光灯'],['episode','久违的照相馆','完成开篇情节']].map(([k,t,d])=>`<article class="${state.ach[k]?'earned':''}">${glyph('achievement')}<div><h2>${t}</h2><p>${d}</p><small>${state.ach[k]?'已达成':'尚未达成'}</small></div>${state.ach[k]?icon('check'):icon('lock')}</article>`).join('')}</section>`;}
  const LESSONS=[
    '交换相邻棋子，连成三枚即可消除。消除旧纸所在格的棋子，会清掉旧纸；在箱子旁边消除，就能打破箱子。',
    '本关赠送一槽显影液。点显影液，再选一个格子，清除周围3×3区域的旧纸，不消耗步数，不能破箱。之后每次有效交换积累2格，连锁最多额外2格，满6格可再次使用。',
    '把标记棋子向下交换，试试四连。四连生成补光灯。之后与任意相邻棋子交换即可触发：左右交换横扫，上下交换纵扫。拖动时查看预览，也可以留着与其他特效组合。',
    '特效可以保留，等它落到合适位置，或交换相邻特效做组合。赠送一把修复刷：点刷子，再点目标，不花步数。优先清一层遮挡；也能打破箱子或处理棋子。可以留到下一关。',
    '清除照片上的25格遮挡，让童年照逐步显露。完整显现后，就能看看画面里留下了什么。'
  ];
  const FEEDBACK=['门口那股旧相纸的味道，好像一直没变。','这些包装纸下面，都是以前留下的东西。','我小时候，也是在这张桌边写作业。','这个封皮……上面写的是我的名字。'];
  function prepare(level){
    if(level>state.completed||level<0||level>4){toast('先完成前面的关卡，再继续这段人生。');return;}
    if(state.active?.level===level){start(level);return;}
    const l=LEVELS[level];
    dialog(`<span class="eyebrow">第 ${level+1} 关</span><h2>${l.name}</h2><div class="prepare-goals">${target(l.photo?'back':'paper',l.paper.length,l.photo?'照片遮挡':'旧纸')}${l.boxes.length?target('box',l.boxes.length,'箱子'):''}</div><p>${level===0?'陈禾：“林姨让我把钥匙交给你。门边那箱东西，她说记得留好。”':'整理旧物，让过去慢慢显现。'}</p><small>${l.moves}步 · ${level<4?'清除两项目标':'揭开童年照片'}</small>${state.active?'<p class="warning">开始此关将放弃当前一局，并恢复该局开局时的道具数量。</p>':''}${primary('start','开始整理',`data-level="${level}"`)}<button class="text-link" data-action="close">稍后再来</button>`);
  }
  function start(level){
    if(level>state.completed||level<0||level>4)return;
    if(state.active?.level===level)board=new Board(level,state.active);
    else{
      if(state.active)state.brushes=state.active.startBrushes;
      if(level===3&&!state.brushGift){state.brushGift=true;state.brushes++;} 
      board=new Board(level,null,state.brushes);
    }
    if(!board.won()&&board.moves>0&&!board.canAct()){board.shuffle();toast('已为当前棋盘免费重排。');}
    state.accepted=true;state.active=board.snapshot();save();show('game');
    if(board.won()){finish();return;}if(board.moves<=0){failed();return;}
    if(!state.taught[level])dialog(`<span class="eyebrow">整理提示 · 第${level+1}关</span><h2>${LEVELS[level].name}</h2><p>${LESSONS[level]}</p>${level===3?image('brush','lesson-tool','修复刷'):''}${primary('lesson','知道了')}`);
  }
  function target(name,count,label){return `<span class="target" aria-label="${label}剩余${count}">${name==='box'?'<span class="box-art"></span>':image(name)}<b>${count===0?icon('check'):count}</b></span>`;}
  function game(){
    const r=board.remaining();
    app.innerHTML=`<div class="studio-art"></div><header class="game-header"><div><span class="eyebrow">旧照相馆 · 第${board.level+1}关</span><h1>${board.config.name}</h1></div><button class="icon-button" data-action="pause" aria-label="暂停">${icon('pause')}</button></header><div class="goal-strip"><div id="goals">${target(board.config.photo?'back':'paper',r.cover,board.config.photo?'照片遮挡':'旧纸')}${!board.config.photo?target('box',r.boxes,'箱子'):''}</div><div class="moves" aria-label="剩余步数"><small>剩余步数</small><strong id="moves">${board.moves}</strong></div></div><div class="score-strip">本局积分 <b id="score">${board.score}</b><span>通关后结算金币</span></div><div class="board-frame"><div id="board" class="${board.config.photo?'photo-board':''}" role="group" aria-label="七行七列三消棋盘"></div></div><p id="game-feedback" class="game-feedback" aria-live="polite">交换相邻棋子，连成三枚</p><div class="developer-bar"><button data-action="develop" id="develop"><span class="developer-vial" aria-hidden="true"><svg viewBox="0 0 48 56"><path d="M18 5h12v7H18z" fill="#d4b477"/><path d="M19 12v10L10 34v12q0 5 5 5h18q5 0 5-5V34L29 22V12Z" fill="#173e43" stroke="#e0c48c" stroke-width="2"/><path d="M13 35q7-5 14 0t8 0v11q0 2-3 2H16q-3 0-3-2Z" fill="#75dbc6"/><path d="M18 38v5" stroke="#e1fff4" stroke-width="2" stroke-linecap="round"/><path d="m25 26 1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5Z" fill="#ffe4a0"/></svg></span><span>显影液</span><span class="developer-meter"><i id="developer-fill"></i></span></button><small id="developer-tip"></small></div><footer class="game-tools"><button data-action="brush" id="brush">${image('brush')}<span>修复刷 <b id="brush-count">${board.brushes}</b></span></button><button data-action="hint">${image('hint')}<span>提示</span></button><button data-action="rules">${icon('book')}<span>玩法</span></button></footer>`;
    drawBoard();stats();
  }
  const TILES=['film','photo','clip','camera','stamp'],NAMES=['黄色胶卷','蓝色相片','红色照片夹','青色相机','紫色印章'];
  function piece(x){
    if(!x)return '';
    if(x.kind==='box')return '<span class="box-art"></span>';
    return `${image(x.special||TILES[x.color],'tile-art')}${x.special&&x.special!=='color'?`<span class="color-dot color-${x.color}"></span>`:''}`;
  }
  const heldAnimations=new Set();
  function releaseAnimations(){for(const animation of heldAnimations)animation.cancel();heldAnimations.clear();}
  function drawBoard(event={}){
    const el=$('#board');if(!el)return;
    releaseAnimations();
    const focused=document.activeElement?.dataset.cell;
    const markup=board.cells.map((x,i)=>{
      const row=Math.floor(i/7),col=i%7,photo=board.config.photo&&row>=1&&row<=5&&col>=1&&col<=5;
      const exposed=photo&&!board.cover[i],cover=board.cover[i]>0;
      const label=x?.kind==='box'?'箱子':x?`${NAMES[x.color]}${x.special?({row:'横向补光灯',col:'纵向补光灯',burst:'范围闪光灯',color:'全色底片'})[x.special]:''}`:'空格';
      return `<button class="cell ${cover?'covered':''} ${photo?'photo-cell':''} ${exposed?'exposed':''} ${i===selected?'selected':''} ${(event.ids||[]).includes(i)&&['clear','brush'].includes(event.type)?'clearing':''}" data-cell="${i}" style="${photo?`--px:${(col-1)*25}%;--py:${(row-1)*25}%;`:''}" aria-label="第${row+1}行第${col+1}列，${label}${cover?'，有遮挡':''}" aria-pressed="${i===selected}">${photo?'<span class="photo-fragment"></span>':''}${cover?`<span class="${photo?'photo-mask':'paper-layer'}"></span>`:''}${piece(x)}</button>`;
    }).join('');
    if(el.children.length!==49)el.innerHTML=markup;
    else{const template=document.createElement('template');template.innerHTML=markup;[...template.content.children].forEach((next,i)=>{const current=el.children[i];for(const attr of next.attributes)current.setAttribute(attr.name,attr.value);if(current.innerHTML!==next.innerHTML)current.innerHTML=next.innerHTML;});}
    if(focused!==undefined)el.querySelector(`[data-cell="${focused}"]`)?.focus({preventScroll:true});
  }
  function stats(){
    if(!$('#moves'))return;
    const r=board.remaining();$('#goals').innerHTML=target(board.config.photo?'back':'paper',r.cover,board.config.photo?'照片遮挡':'旧纸')+(!board.config.photo?target('box',r.boxes,'箱子'):'');
    if($('#score'))$('#score').textContent=board.score;
    $('#moves').textContent=board.moves;$('#moves').classList.toggle('low',board.moves<=5);
    $('#developer-fill').style.width=`${board.developer/6*100}%`;$('#develop').disabled=board.level<1||busy;$('#develop').classList.toggle('selected',developMode);$('#develop').classList.toggle('charged',board.level>0&&board.developer===6);$('#develop').setAttribute('aria-label',board.level<1?'显影液，第2关解锁':board.developer===6?'显影液已蓄满，点击使用':'显影液正在积累');$('#developer-tip').textContent=developMode?'点选3×3范围 · 再点按钮取消':board.level<1?'第2关解锁':board.developer===6?'已蓄满 · 点击显影':'交换和连锁可积累显影液';
    $('#brush-count').textContent=board.brushes;$('#brush').classList.toggle('selected',brushMode);
    $('#board').setAttribute('aria-busy',String(busy));
  }
  const delay=ms=>new Promise(r=>setTimeout(r,state.reduced||matchMedia('(prefers-reduced-motion:reduce)').matches?15:ms));
  let audio;
  function sound(kind){
    if(state.muted)return;
    try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);const pitch=kind==='burst'?220:kind==='color'?660:480+Math.min(board.chain,7)*65;o.type='triangle';o.frequency.setValueAtTime(pitch,audio.currentTime);o.frequency.exponentialRampToValueAtTime(pitch*(kind?1.5:.8),audio.currentTime+.12);g.gain.setValueAtTime(.025,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.15);o.start();o.stop(audio.currentTime+.16);}catch{}
  }
  async function notify(e,token){
    if(token!==screenToken)throw Error('cancelled');
    if(e.type==='swap'||e.type==='invalid'){
      const [a,b]=e.ids,dx=(b%7-a%7)*step(),dy=(Math.floor(b/7)-Math.floor(a/7))*step();
      await Promise.all([[a,dx,dy],[b,-dx,-dy]].map(([i,x,y])=>travel(tokenEl(i),e.type==='invalid'?[{transform:'translate(0,0)'},{transform:`translate(${x}px,${y}px)`,offset:.5},{transform:'translate(0,0)'}]:[{transform:'translate(0,0)'},{transform:`translate(${x}px,${y}px)`}],e.type==='invalid'?210:140)));
      drawBoard();stats();return;
    }
    if(e.type==='combo'){await flash(e.ids[1],e.kind);return;}
    if(e.type==='clear'){
      sound(e.effects?.[0]?.kind);$('#game-feedback').textContent=board.chain>1?`连锁 ${board.chain}`:'消除成功';
      const reduced=state.reduced||matchMedia('(prefers-reduced-motion:reduce)').matches;
      const effects=e.effects||[];
      const flashes=effects.slice(0,8).map(x=>flash(x.i,x.kind));
      // All decorative layers are bounded and removed before the next board render.
      const shards=[...new Set([...e.ids,...e.boxes])].filter((_,k)=>k%Math.max(1,Math.ceil(e.ids.length/16))===0);
      if(!reduced){
        const colorOrigin=effects.find(x=>x.kind==='color');
        if(colorOrigin)flashes.push(...e.ids.filter(i=>i!==colorOrigin.i).filter((_,k)=>k%Math.max(1,Math.ceil(e.ids.length/12))===0).map(i=>colorRay(colorOrigin.i,i)));
        flashes.push(...shards.map(i=>spark(i,e.boxes.includes(i)?'#d6a46c':['#ffd36d','#87cce5','#e98f83','#79c7b8','#c6a1e8'][board.cells[i]?.color||0])));
        if(effects.length)flashes.push(motion($('.board-frame'),[{transform:'translate(0,0)'},{transform:'translate(-2px,1px)',offset:.24},{transform:'translate(2px,-1px)',offset:.5},{transform:'translate(0,0)'}],180));
        if(board.chain>1)flashes.push(chainBadge(board.chain));
      }
      for(const i of e.clearedCover||[]){const layer=$(`[data-cell="${i}"] .paper-layer`)||$(`[data-cell="${i}"] .photo-mask`);flashes.push(motion(layer,[{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(1.1)'}],180,true));}
      await Promise.all([...flashes,...[...new Set([...e.ids,...e.boxes])].map(i=>{
        const dest=(e.creates||[]).find(c=>c.members?.includes(i));
        const x=dest?(dest.i%7-i%7)*step():0,y=dest?(Math.floor(dest.i/7)-Math.floor(i/7))*step():0;
        const origin=effects[0]?.i;
        const distance=origin==null?0:Math.abs(origin%7-i%7)+Math.abs(Math.floor(origin/7)-Math.floor(i/7));
        return motion(tokenEl(i),[{transform:'scale(1)',opacity:1},{transform:'scale(1.15)',opacity:1,offset:.24},{transform:`translate(${x}px,${y}px) scale(.08) rotate(8deg)`,opacity:0}],dest?190:180,true,{delay:Math.min(80,distance*12)});
      })]);
      stats();return;
    }
    // Render new specials with gravity instead of pausing on an empty board.
    if(e.type==='created')return;
    drawBoard();stats();
    if(e.type==='fall'){
      const moving=new Set((e.falls||[]).map(f=>f.i));
      await Promise.all([
        ...(e.falls||[]).map(f=>travel(tokenEl(f.i),[
          {transform:`translateY(${-f.rows*step()}px) scale(.98,1.03)`},
          {transform:'translateY(0) scale(1.07,.94)',offset:.83},
          {transform:'translateY(0) scale(1)'}
        ],Math.min(300,160+f.rows*19),{easing:'cubic-bezier(.32,.03,.66,1)'})),
        ...(e.born||[]).filter(i=>!moving.has(i)).map(i=>motion(tokenEl(i),[{transform:'scale(.3)',opacity:.5},{transform:'scale(1.22)',offset:.65},{transform:'scale(1)',opacity:1}],230))
      ]);
    }
    if(e.type==='develop'){await Promise.all(e.ids.map(i=>motion($(`[data-cell="${i}"]`),[{boxShadow:'inset 0 0 0 22px #b6e7da',opacity:.6},{boxShadow:'inset 0 0 0 0px #b6e7da',opacity:1}],420)));}
    if(e.type==='brush')await flash(e.ids[0],'burst');
    if(e.type==='reshuffle')toast('没有可用操作，已免费重排。');
  }
  const step=()=>{const el=$('#board');return el?parseFloat(getComputedStyle(el).width)/7+2/7:48;};
  const tokenEl=i=>$(`[data-cell="${i}"] .tile-art`)||$(`[data-cell="${i}"] .box-art`);
  async function motion(el,frames,duration,hold=false,options={}){
    if(!el||!el.animate||state.reduced||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
    const animation=el.animate(frames,{duration,easing:'cubic-bezier(.2,.65,.3,1)',fill:'both',...options});
    try{await animation.finished;}catch{}finally{if(hold)heldAnimations.add(animation);else animation.cancel();}
  }
  async function travel(el,frames,duration,options={}){
    if(!el||state.reduced||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
    const cell=el.closest('[data-cell]'),layer=$('#board');
    if(!cell||!layer)return;
    const ghost=el.cloneNode(true);
    ghost.classList.add('moving-token');ghost.setAttribute('aria-hidden','true');
    Object.assign(ghost.style,{position:'absolute',left:`${cell.offsetLeft+cell.clientLeft+(cell.clientWidth-el.offsetWidth)/2}px`,top:`${cell.offsetTop+cell.clientTop+(cell.clientHeight-el.offsetHeight)/2}px`,width:`${el.offsetWidth}px`,height:`${el.offsetHeight}px`,margin:'0',zIndex:'15'});
    el.style.visibility='hidden';layer.appendChild(ghost);
    try{await motion(ghost,frames,duration,false,options);}finally{ghost.remove();el.style.visibility='';}
  }
  async function flash(i,kind){
    if(state.reduced||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
    const layer=document.createElement('span');layer.className=`effect-light effect-${kind}`;
    layer.style.left=`${(i%7+.5)*step()}px`;layer.style.top=`${(Math.floor(i/7)+.5)*step()}px`;
    layer.setAttribute('aria-hidden','true');$('#board').appendChild(layer);
    const initial=kind==='row'?'scale(.02,.5)':kind==='col'?'scale(.5,.02)':'scale(.06)';
    try{await motion(layer,[
      {transform:`translate(-50%,-50%) ${initial}`,opacity:.15},
      {transform:'translate(-50%,-50%) scale(.14)',opacity:.55,offset:.16},
      {transform:'translate(-50%,-50%) scale(1)',opacity:.82,offset:.55},
      {transform:'translate(-50%,-50%) scale(1.08)',opacity:0}
    ],kind==='color'?310:250);}finally{layer.remove();}
  }
  async function colorRay(from,to){
    const dx=(to%7-from%7)*step(),dy=(Math.floor(to/7)-Math.floor(from/7))*step();
    const ray=document.createElement('span');ray.className='fx-ray';ray.setAttribute('aria-hidden','true');
    Object.assign(ray.style,{left:`${(from%7+.5)*step()}px`,top:`${(Math.floor(from/7)+.5)*step()}px`,width:`${Math.hypot(dx,dy)}px`});
    $('#board').appendChild(ray);const rotate=`rotate(${Math.atan2(dy,dx)}rad)`;
    try{await motion(ray,[{transform:`${rotate} scaleX(0)`,opacity:.2},{transform:`${rotate} scaleX(1)`,opacity:.75,offset:.48},{transform:`${rotate} scaleX(1)`,opacity:0}],260);}finally{ray.remove();}
  }
  async function spark(i,color){
    const layer=document.createElement('span');layer.className='fx-shards';
    layer.style.left=`${(i%7+.5)*step()}px`;layer.style.top=`${(Math.floor(i/7)+.5)*step()}px`;
    layer.setAttribute('aria-hidden','true');$('#board').appendChild(layer);
    try{await Promise.all(Array.from({length:4},(_,k)=>{
      const bit=document.createElement('i');bit.style.background=color;layer.appendChild(bit);
      const angle=(k*90+i*37)*Math.PI/180,dx=Math.cos(angle)*27,dy=Math.sin(angle)*27;
      return motion(bit,[{transform:'translate(0,0) scale(.5)',opacity:0},{opacity:.9,offset:.18},{transform:`translate(${dx}px,${dy+12}px) rotate(${k*75}deg) scale(.15)`,opacity:0}],260);
    }));}finally{layer.remove();}
  }
  async function chainBadge(count){
    const badge=document.createElement('span');badge.className='fx-chain';badge.textContent=count>3?`精彩连锁 ×${count}`:`连锁 ×${count}`;
    badge.setAttribute('aria-hidden','true');$('.board-frame').appendChild(badge);
    try{await motion(badge,[{transform:'translate(-50%,8px) scale(.7)',opacity:0},{transform:'translate(-50%,0) scale(1.05)',opacity:1,offset:.25},{transform:'translate(-50%,-10px) scale(1)',opacity:0}],300);}finally{badge.remove();}
  }
  async function act(fn){
    if(busy||screen!=='game'||modal.open)return;
    const old=board.snapshot(),token=screenToken;busy=true;selected=-1;brushMode=false;developMode=false;clearPreview();stats();
    try{
      const ok=await fn(e=>notify(e,token));
      if(token!==screenToken)return;
      if(!ok)$('#game-feedback').textContent='这个操作不能消除，不扣步数或道具。';
      else{
        if(board.turns>0)state.ach.swap=true;
        if(board.madeLine)state.ach.line=true;
        if(board.level===4){
          const obs=board.observations;
          if(!obs.length&&!board.cover[24]){obs.push('face');toast('知夏：这是小时候的我……');}
          else if(!obs.length&&[12,19,26,33,40].some(i=>!board.cover[i])){obs.push('edge');toast('知夏：照片右边，好像被剪掉了一块。');}
        }
        state.brushes=board.brushes;state.active=board.snapshot();save();
      }
      drawBoard();stats();
      busy=false;stats();
      if(board.won())finish();else if(board.moves<=0)failed();
      else if(board.level===0&&ok&&!state.taught.dual){state.taught.dual=true;save();$('#game-feedback').textContent='旧纸在原位清除；在箱子旁消除可以破箱。两项目标都要完成。';}
    }catch(e){
      if(token!==screenToken)return;
      board=new Board(old.level,old);busy=false;state.active=old;state.brushes=old.brushes;save();drawBoard();stats();toast('操作未完成，已恢复棋盘和资源，请重试。');
      console.error(e);
    }
  }
  async function finish(){
    busy=true;
    const token=screenToken,remaining=board.moves,base=board.score,waves=board.bonusPlan(),bonus=waves.reduce((n,w)=>n+w.points,0),total=base+bonus;bonusFast=state.reduced;
    const previous=Number.isSafeInteger(state.rewards[board.level])?state.rewards[board.level]:0;
    const earned=Math.floor(total/100),coins=Math.max(0,earned-previous);
    state.rewards[board.level]=Math.max(previous,earned);state.coins+=coins;
    state.completed=Math.max(state.completed,board.level+1);state.brushes=board.brushes;state.active=null;
    if(board.level===4){state.episode=state.clue?state.episode:0;state.clue=true;}
    save();
    $('#game-feedback').innerHTML='最后一次冲洗 <button class="bonus-speed" data-action="bonus-fast">点击加速</button>';
    let used=0,points=base;
    const original=board.cells.map(x=>({...x}));
    for(const wave of waves){
      if(token!==screenToken)return;
      used+=wave.steps;points+=wave.points;
      if(!bonusFast){
        for(const x of wave.lights)board.cells[x.i]={...board.cells[x.i],special:x.kind};
        drawBoard();$('#moves').textContent=remaining-used;
        await Promise.all(wave.lights.map(async x=>{const host=$('.board-frame'),fly=document.createElement('img');fly.src='assets/'+x.kind+'.png';fly.className='bonus-traveller';host.appendChild(fly);const tx=10+(x.i%7)*step(),ty=10+Math.floor(x.i/7)*step();try{await motion(fly,[{left:'300px',top:'-60px',opacity:.5,transform:'scale(.5)'},{left:tx+'px',top:ty+'px',opacity:1,transform:'scale(1)'}],170);}finally{fly.remove();}}));
        await Promise.all(wave.lights.map(x=>motion(tokenEl(x.i),[{transform:'scale(.2)',opacity:.4},{transform:'scale(1.2)',opacity:1},{transform:'scale(1)'}],180)));
        if(!bonusFast)await Promise.all(wave.lights.map(x=>flash(x.i,x.kind)));
        if(!bonusFast)await Promise.all(wave.hits.map(i=>motion(tokenEl(i),[{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.3)'}],160)));
      }
      board.cells=original.map(x=>({...x}));drawBoard();$('#moves').textContent=remaining-used;$('#score').textContent=points;
    }
    if(token!==screenToken)return;
    if(board.level===4){$('#board').classList.add('revealed');await delay(bonusFast?15:650);}
    if(token!==screenToken)return;
    busy=false;
    dialog(`<div class="success-mark">${icon('check')}</div><h2>${board.level===4?'照片显现了':'整理完成'}</h2><p>${FEEDBACK[board.level]||'原来这张照片也还留着。'}</p><div class="reward-only"><span>金币</span><b>+${coins}</b></div>${primary(board.level===4?'episode-start':'next',board.level===4?'看看这张照片':'继续下一关')}<button class="text-link" data-action="route">返回关卡路线</button>`);
  }
  function failed(){dialog(`<span class="eyebrow">步数用完了</span><h2>还差一点</h2><div class="prepare-goals">${target(board.config.photo?'back':'paper',board.remaining().cover,'剩余遮挡')}${!board.config.photo?target('box',board.remaining().boxes,'剩余箱子'):''}</div><p>试试把消除安排在目标所在格，或组合特效。</p>${primary('retry','重新尝试')}<button class="text-link" data-action="route">返回关卡路线</button>`);}
  const EP=['原来这张照片也还留着。','生日、放学……连这些都收起来了。','等等，右边这里，怎么被剪掉了？','当时站在我旁边的人，是谁？','获得线索：被裁剪的童年照'];
  function episode(){
    const s=storyReplay?slide:(state.episode??0);
    app.innerHTML=`<div class="studio-art"></div><button class="skip" data-action="ep-end">跳过剧情</button><div class="episode-photo ${s===2||s===3?'zoom-edge':''}">${image('clue','','右侧被裁剪的童年照片，边缘残留成人衣袖与手部')}</div><section class="speech"><span class="eyebrow">${s===4?'线索归档':'林知夏'} · ${s+1}/5</span><p>${EP[s]}</p>${primary('ep-next',s===4?'查看线索':'继续')}</section>`;
  }
  function clue(){
    app.innerHTML=`${top('被裁剪的童年照','route')}<article class="clue-page">${image('clue','clue-image','童年知夏站在照相馆门口，右侧另一人的身体被裁去')}<span class="eyebrow">线索 001 · 已获得</span><h2>画面外，还有谁？</h2><p>照片保存在写有知夏名字的相册中。右侧被裁剪，只留下另一人的部分衣袖和手部。</p><div class="question"><small>尚未解开的疑问</small><p>那个人是谁？谁裁了照片？为什么？</p></div><button class="secondary" data-action="ep-replay">回顾「久违的照相馆」</button>${primary('home','返回人生委托局')}</article>`;
  }
  function continueStory(){
    if(state.episode!==null){storyReplay=false;show('episode');}
    else if(!state.accepted)show('commission');
    else if(state.completed===5)show('clue');
    else prepare(state.active?.level??state.completed);
  }
  function cell(i){
    if(busy||modal.open||screen!=='game')return;
    if(developMode){act(n=>board.develop(i,n));return;}
    if(brushMode){act(n=>board.brush(i,n));return;}
    if(!board.isTile(i)){toast('在箱子上下左右邻格消除，或使用修复刷。');return;}
    if(selected>=0&&selected!==i&&board.adjacent(selected,i)){const from=selected;act(n=>board.swap(from,i,n));return;}
    selected=selected===i?-1:i;drawBoard();
    if(['row','col'].includes(board.cells[i].special))$('#game-feedback').textContent='补光灯：与相邻棋子交换即可触发，左右交换横扫、上下交换纵扫。';
    if(board.cells[i].special==='burst')$('#game-feedback').textContent='范围闪光灯：与相邻棋子交换，在新位置触发；与特效交换可组合。';
    if(board.cells[i].special==='color')$('#game-feedback').textContent='全色底片：与相邻棋子交换，消除全部同色棋子。';
  }
  let drag=null,suppressUntil=0;
  function clearPreview(){document.querySelectorAll('.preview-hit,.preview-valid,.preview-invalid,.develop-preview').forEach(el=>el.classList.remove('preview-hit','preview-valid','preview-invalid','develop-preview'));}
  function preview(a,b){
    clearPreview();const p=board.preview(a,b);
    [a,b].forEach(i=>$(`[data-cell="${i}"]`)?.classList.add(p.valid?'preview-valid':'preview-invalid'));
    if(!p.valid){$('#game-feedback').textContent='这次交换不能形成消除，松手后回弹，不扣步。';return;}
    p.lights.forEach(x=>board.line(x.i,x.direction).forEach(i=>$(`[data-cell="${i}"]`)?.classList.add('preview-hit')));
    $('#game-feedback').textContent=p.combo?'松手组合这两个特效':p.lights.length?`松手后${p.lights[0].direction==='row'?'横向':'纵向'}扫光`:p.trigger?'松手触发特效':'松手完成交换';
  }
  app.addEventListener('pointerdown',e=>{const el=e.target.closest('[data-cell]');if(el&&!busy&&!modal.open&&e.isPrimary!==false){drag={id:+el.dataset.cell,x:e.clientX,y:e.clientY,pointerId:e.pointerId};el.setPointerCapture(e.pointerId);}});
  app.addEventListener('pointermove',e=>{if(developMode&&!busy){clearPreview();const target=e.target.closest('[data-cell]');if(target)board.developArea(+target.dataset.cell).forEach(i=>$(`[data-cell="${i}"]`)?.classList.add('develop-preview'));return;}if(!drag||drag.pointerId!==e.pointerId||busy||brushMode||developMode)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.max(Math.abs(dx),Math.abs(dy))<14){clearPreview();return;}const b=drag.id+(Math.abs(dx)>Math.abs(dy)?dx>0?1:-1:dy>0?7:-7);if(board.adjacent(drag.id,b))preview(drag.id,b);else clearPreview();});
  app.addEventListener('pointerup',e=>{
    if(!drag||drag.pointerId!==e.pointerId)return;const d=drag;drag=null;clearPreview();
    const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.max(Math.abs(dx),Math.abs(dy))<18)return;
    suppressUntil=Date.now()+350;
    if(brushMode||developMode)return;
    const b=d.id+(Math.abs(dx)>Math.abs(dy)?dx>0?1:-1:dy>0?7:-7);
    if(board?.adjacent(d.id,b))act(n=>board.swap(d.id,b,n));
  });
  app.addEventListener('pointercancel',()=>{drag=null;clearPreview();});
  app.addEventListener('lostpointercapture',()=>{drag=null;clearPreview();});
  app.addEventListener('keydown',e=>{
    const el=e.target.closest('[data-cell]');if(!el)return;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
      e.preventDefault();const i=+el.dataset.cell,j=i+({ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7})[e.key];
      if(board.adjacent(i,j)){if(e.shiftKey)act(n=>board.swap(i,j,n));else{$(`[data-cell="${j}"]`)?.focus();if(selected>=0&&board.adjacent(selected,j))preview(selected,j);}}
    }
  });
  document.addEventListener('click',e=>{
    const cellEl=e.target.closest('[data-cell]');if(cellEl){if(Date.now()>suppressUntil)cell(+cellEl.dataset.cell);return;}
    const el=e.target.closest('[data-action]');if(el?.dataset.action==='bonus-fast'){bonusFast=true;el.textContent='正在结算…';return;}if(!el||el.disabled||busy)return;
    const a=el.dataset.action;
    if(['home','commission','archive','profile','route','dossier','login','achievements'].includes(a)){show(a);return;}
    switch(a){
      case 'login-go':requestFullscreen();editingAvatar=false;if(!state.avatar)show('avatar');else if(!state.onboarded){slide=0;show('onboarding');}else show('home');break;
      case 'register':{if(uploadBusy){toast('头像正在处理，请稍候。');break;}const name=$('#profile-name').value.trim();if(!name){toast('请填写昵称。');$('#profile-name').focus();break;}const chosen=$('[name="avatar"]:checked')?.value||'female';state.nickname=name.slice(0,12);state.avatar=chosen==='custom'?(state.avatar||'female'):chosen;state.avatarPhoto=chosen==='custom'?draftPhoto:null;save();show(editingAvatar?'profile':'onboarding');editingAvatar=false;break;}
      case 'intro-next':nextIntro();break;
      case 'intro-skip':endIntro();break;
      case 'intro-video-play':playIntro();break;
      case 'intro-video-sound':{const v=$('#intro-video');v.muted=!v.muted;el.textContent=v.muted?'开启声音':'关闭声音';break;}
      case 'intro-video-pause':{const v=$('#intro-video');if(v.paused)playIntro();else{v.pause();el.textContent='播放';}break;}
      case 'intro-video-replay':show('onboarding');break;
      case 'intro-start':state.onboarded=true;save();show('commission');break;
      case 'intro-replay':show('onboarding');break;
      case 'fullscreen':requestFullscreen(true);break;
      case 'wallet':dialog(`<h2>我的金币 · ${state.coins}</h2><p>每枚消除棋子 10 分，每格旧纸或箱子 30 分。通关后剩余步数会变为补光灯，奖励消除每格10分。</p><p>每 100 分兑换 1 金币，不足部分舍去；未通关不发放金币。重玩只补发超过该关历史奖励的差额。</p><p>金币保存在本机。消费功能暂未开放。</p>${primary('close','知道了')}`);break;
      case 'accept':state.accepted=true;save();prepare(state.active?.level??Math.min(state.completed,4));break;
      case 'continue':continueStory();break;
      case 'level':prepare(+el.dataset.level);break;
      case 'start':start(+el.dataset.level);break;
      case 'next':prepare(Math.min(board.level+1,4));break;
      case 'lesson':state.taught[board.level]=true;save();close();if(board.level===2&&board.turns===0){[9,16].forEach(i=>$(`[data-cell="${i}"]`)?.classList.add('hinted'));$('#game-feedback').textContent='将标记棋子向下交换，合成四连补光灯。';}else if(board.level===0)hint();break;
      case 'close':close();break;
      case 'pause':brushMode=false;selected=-1;drawBoard();stats();dialog(`<h2>稍作停留</h2><p>棋盘与步数已保存。</p>${primary('close','继续整理')}<button class="secondary" data-action="retry-confirm">重开本关</button><button class="secondary" data-action="music">背景音乐：${window.BureauMusic?.enabled?'开启':'关闭'}</button><button class="secondary" data-action="sound">音效：${state.muted?'关闭':'开启'}</button><button class="text-link" data-action="route">返回关卡路线</button>`);break;
      case 'retry-confirm':dialog(`<h2>重新开始这一关？</h2><p>棋盘和步数重置，道具恢复到这局开始时的数量。</p>${primary('retry','重新开始')}<button class="text-link" data-action="close">继续当前关卡</button>`);break;
      case 'retry':{const l=board.level;state.brushes=board.startBrushes;state.active=null;save();start(l);break;}
      case 'develop':if(board.developer<6){toast('显影液尚未蓄满：有效交换可积累，连锁有额外积累。');break;}developMode=!developMode;brushMode=false;selected=-1;drawBoard();stats();break;
      case 'brush':developMode=false;if(!board.brushes){toast('修复刷已用完，仍可通过消除完成目标。');break;}brushMode=!brushMode;selected=-1;drawBoard();stats();$('#game-feedback').textContent=brushMode?'点一个目标：清一层遮挡／破箱／处理棋子。不扣步数。':'已取消使用修复刷';break;
      case 'hint':hint();break;
      case 'rules':dialog(`<h2>整理小贴士</h2><div class="rules"><p>三连：清除棋子及本格一层覆盖物，同时伤害相邻箱子。</p><p>四连：补光灯，清一行或一列。T/L：范围闪光灯。五连：全色底片，与棋子交换后消除全盘同色。</p><p>单击特效只选中，与相邻可交换棋子交换即可触发，无需凑三连；相邻特效交换可组合。同色匹配和特效命中也能触发。补光灯按主动交换方向转向，连锁引爆保留原方向。合法交换扣1步，连锁不额外扣步。</p><p>修复刷不扣步数，优先清覆盖物；没有覆盖物时破箱、移除棋子或激活特效。</p><p>棋子每枚10分，覆盖物或箱子每格30分。显影液满6格，可清除选中位置周围3×3范围旧纸，不破箱、不扣步。通关余步变为补光灯，奖励消除每格10分；每100分兑换1金币，重玩只补历史差额。</p></div>${primary('close','继续整理')}`);break;
      case 'episode-start':storyReplay=state.episode===null;slide=0;show('episode');break;
      case 'ep-replay':storyReplay=true;slide=0;show('episode');break;
      case 'ep-next':if((storyReplay?slide:state.episode)<4){if(storyReplay)slide++;else{state.episode++;save();}show('episode');}else endEpisode();break;
      case 'ep-end':endEpisode();break;
      case 'clue':if(state.clue)show('clue');else toast('完成第5关后获得这张照片。');break;
      case 'future':toast('后续委托正在整理中，本次试玩开放前五关。');break;
      case 'rank':dialog(`<h2>排行榜</h2><p>排行榜尚未接入。本次试玩进度仅保存在当前设备。</p>${primary('close','知道了')}`);break;
      case 'checkin':dialog(`<h2>每日签到</h2><p>签到系统将在后续版本开放。本次试玩可直接体验五关。</p>${primary('close','知道了')}`);break;
      case 'relation':{const text={aunt:['林姨／林素','抚养知夏的人，目前住院。'],friend:['陈禾','知夏的童年好友，协助交接照相馆钥匙。'],colleague:['周远','知夏的工作同事。更多关系有待了解。']}[el.dataset.id];dialog(`<h2>${text[0]}</h2><p>${text[1]}</p>${primary('close','知道了')}`);break;}
      case 'switch-avatar':editingAvatar=true;show('avatar');break;
      case 'music':window.BureauMusic?.toggle();el.textContent='背景音乐：'+(window.BureauMusic?.enabled?'开启':'关闭');break;
      case 'sound':state.muted=!state.muted;save();if(screen==='profile')show('profile');else{el.textContent=`音效：${state.muted?'关闭':'开启'}`;}break;
      case 'motion':state.reduced=!state.reduced;save();document.documentElement.classList.toggle('reduce-motion',state.reduced);if(screen==='profile')show('profile');else el.textContent=`减少动态：${state.reduced?'开启':'关闭'}`;break;
      case 'rename':dialog(`<h2>你的执行员名字</h2><label class="name-label">昵称（最多12字）<input id="agent-name" maxlength="12" value="${escapeText(state.nickname)}" autocomplete="off"></label>${primary('save-name','保存昵称')}`);break;
      case 'save-name':{const name=$('#agent-name').value.trim();if(!name){toast('请输入一个名字。');break;}state.nickname=name.slice(0,12);save();show('profile');break;}
      case 'collection':if(state.clue)show('clue');else dialog(`<h2>线索收藏</h2><p>还没有收录线索。完成第5关，找到你的第一张人生照片。</p>${primary('route','查看关卡路线')}`);break;
      case 'titles':dialog(`<h2>成就与称号</h2>${[['初次报到',true,'加入人生委托局'],['旧物整理员',state.ach.swap,'完成一次有效交换'],['追光者',state.ach.line,'合成四连补光灯'],['记忆收藏家',state.ach.episode,'完成开篇情节']].map(([name,unlocked,desc])=>`<button class="title-choice" data-action="equip-title" data-title="${name}" ${unlocked?'':'disabled'}><span>${name}<small>${desc}</small></span><b>${state.title===name?'已佩戴':unlocked?'佩戴':'未解锁'}</b></button>`).join('')}${primary('close','返回')}`);break;
      case 'equip-title':{const name=el.dataset.title;if(!({'初次报到':true,'旧物整理员':state.ach.swap,'追光者':state.ach.line,'记忆收藏家':state.ach.episode})[name])break;state.title=name;save();show('profile');break;}
      case 'settings':dialog(`<span class="eyebrow">人生委托局</span><h2>设置</h2><button class="secondary" data-action="music">背景音乐：${window.BureauMusic?.enabled?'开启':'关闭'}</button><button class="secondary" data-action="sound">音效：${state.muted?'关闭':'开启'}</button><button class="secondary" data-action="motion">减少动态：${state.reduced?'开启':'关闭'}</button><button class="secondary" data-action="fullscreen">全屏显示</button><p class="settings-note">背景音乐：Kevin MacLeod<br>Dream Culture / Local Forecast - Elevator<br><a href="assets/music/CREDITS.txt" target="_blank" rel="noopener">音乐署名与授权 · CC BY 4.0</a></p><button class="text-link danger" data-action="reset">重置新版试玩进度</button>${primary('close','返回游戏')}`);break;
      case 'reset':dialog(`<h2>重置本版进度？</h2><p>会清除本版的关卡、线索、道具、金币和执行员选择，旧版存档不受影响。</p><button class="secondary" data-action="close">保留进度</button><button class="text-link danger" data-action="reset-confirm">确认重置</button>`);break;
      case 'reset-confirm':state=fresh();board=null;save();show('login');break;
    }
  });
  function hint(){
    if(screen!=='game'||busy)return;
    const move=board.possible()[0];
    const ids=move||[];
    ids.forEach(i=>$(`[data-cell="${i}"]`)?.classList.add('hinted'));
    $('#game-feedback').textContent=move?'标记棋子可以交换；可留住特效等待组合。':'暂无合法交换，请重开当前关卡。';
    setTimeout(()=>document.querySelectorAll('.hinted').forEach(x=>x.classList.remove('hinted')),2600);
  }
  function endEpisode(){if(!storyReplay){state.episode=null;state.ach.episode=true;save();}show('clue');}
  modal.addEventListener('cancel',e=>{if(screen==='game'&&(board.won()||board.moves<=0)){e.preventDefault();show('route');}});
  async function requestFullscreen(explicit=false){
    if(document.fullscreenElement)return;
    try{
      if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();
      else if(explicit)toast('此浏览器不支持网页全屏。iPhone 可在 Safari 分享菜单中添加到主屏幕后打开。');
    }catch{if(explicit)toast('浏览器未允许全屏；可以通过浏览器菜单添加到主屏幕。');}
    fitViewport();
  }
  document.addEventListener('fullscreenchange',()=>fitViewport());
  // 以390×844为逻辑画布，按可用屏幕等比例适配，避免纵向滚动和人物变形。
  const frame=document.createElement('div');frame.id='device-frame';app.before(frame);frame.appendChild(app);
  function fitViewport(){
    const vv=window.visualViewport,bodyStyle=getComputedStyle(document.body),w=(vv?.width||innerWidth)-(parseFloat(bodyStyle.paddingLeft)||0)-(parseFloat(bodyStyle.paddingRight)||0),h=(vv?.height||innerHeight)-(parseFloat(bodyStyle.paddingTop)||0)-(parseFloat(bodyStyle.paddingBottom)||0);
    const gutter=w>480?24:0,scale=Math.min((w-gutter)/390,(h-gutter)/844,1.2);
    document.documentElement.style.setProperty('--ui-scale',scale);
    frame.style.width=`${390*scale}px`;frame.style.height=`${844*scale}px`;
    const dialogScale=Math.min(scale,(w-24)/360,(h-24)/Math.max(1,modal.scrollHeight));
    modal.style.setProperty('--dialog-scale',dialogScale);
  }
  window.addEventListener('resize',fitViewport);window.visualViewport?.addEventListener('resize',fitViewport);
  new ResizeObserver(fitViewport).observe(modal);fitViewport();
  for(const name of [...TILES,'paper','boxes','row','col','burst','color','clue']){const img=new Image();img.src=`assets/${name}.png`;if(img.decode)img.decode().catch(()=>{});}
  show('opening');
})();





