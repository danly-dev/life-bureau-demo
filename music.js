(() => {
  'use strict';
  const key='life-bureau-v08-music';
  let enabled=true,scene='opening',unlocked=false,timer;
  try{enabled=localStorage.getItem(key)!=='off';}catch{}
  const tracks={game:new Audio('assets/music/dream-culture-matched.mp3'),menu:new Audio('assets/music/local-forecast-elevator-matched.mp3')};
  Object.values(tracks).forEach(a=>{a.loop=true;a.volume=0;a.preload='none';});
  function sync(){
    clearInterval(timer);
    const target=enabled&&unlocked&&!document.hidden&&scene!=='onboarding'?tracks[scene==='game'?'game':'menu']:null;
    if(target&&target.paused)target.play().catch(()=>{});
    timer=setInterval(()=>{
      let moving=false;
      for(const a of Object.values(tracks)){
        const goal=a===target?1:0;
        a.volume=Math.max(0,Math.min(1,a.volume+Math.sign(goal-a.volume)*Math.min(0.04,Math.abs(goal-a.volume))));
        if(Math.abs(a.volume-goal)>0.00001)moving=true;
        if(a!==target&&a.volume===0)a.pause();
      }
      if(!moving)clearInterval(timer);
    },40);
  }
  window.BureauMusic={scene(next){scene=next;sync();},get enabled(){return enabled;},toggle(){enabled=!enabled;try{localStorage.setItem(key,enabled?'on':'off');}catch{}sync();return enabled;}};
  for(const event of ['pointerdown','keydown'])document.addEventListener(event,()=>{unlocked=true;sync();},{capture:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInterval(timer);Object.values(tracks).forEach(a=>{a.pause();a.volume=0;});}else sync();});
  window.addEventListener('pagehide',()=>{clearInterval(timer);Object.values(tracks).forEach(a=>a.pause());});
  window.addEventListener('pageshow',sync);
})();
