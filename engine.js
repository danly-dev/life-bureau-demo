/* 人生委托局 PRD v1.0 · 七乘七三消规则。坐标配置使用一基行列。 */
(function (root) {
  'use strict';
  const N=7, SIZE=49, tile=(color,special=null)=>({kind:'tile',color,special});
  const LEVELS=[
    {name:'整理前台',moves:20,colors:4,paper:[[5,2],[5,3],[6,2],[6,3]],boxes:[[6,5],[6,6]]},
    {name:'掸去旧纸',moves:22,colors:4,paper:[[2,2],[2,3],[3,2],[3,3],[5,5],[5,6],[6,5],[6,6]],boxes:[[3,5],[3,6],[5,2],[6,2]]},
    {name:'整理工作台',moves:24,colors:5,paper:[[2,2],[2,3],[2,4],[3,2],[3,3],[3,4],[5,2],[5,3],[6,2],[6,3]],boxes:[[4,5],[4,6],[5,5],[5,6]]},
    {name:'小心修复',moves:24,colors:5,paper:[[2,2],[2,3],[2,4],[2,5],[3,2],[3,5],[5,2],[5,5],[6,2],[6,3],[6,4],[6,5]],boxes:[[3,3],[3,4],[4,3],[4,4],[5,3],[5,4]]},
    {name:'久违的照相馆',moves:28,colors:5,paper:Array.from({length:25},(_,i)=>[2+Math.floor(i/5),2+i%5]),boxes:[],photo:true}
  ];
  LEVELS.forEach((x,i)=>x.seed=20261021+i*781);
  LEVELS[1].seed=20261030; // Avoid a one/two-move tutorial finish caused by the original cascade.
  class Board {
    static validSnapshot(s){
      return !!s&&Number.isInteger(s.level)&&s.level>=0&&s.level<5&&
        ['moves','brushes','startBrushes','turns','seed'].every(k=>Number.isSafeInteger(s[k])&&s[k]>=0)&&
        Array.isArray(s.cover)&&s.cover.length===SIZE&&s.cover.every(n=>Number.isInteger(n)&&n>=0&&n<=1)&&
        Array.isArray(s.cells)&&s.cells.length===SIZE&&s.cells.every(x=>x&&(
          x.kind==='box'&&Number.isInteger(x.hp)&&x.hp>0||
          x.kind==='tile'&&Number.isInteger(x.color)&&x.color>=0&&x.color<5&&[null,undefined,'row','col','burst','color'].includes(x.special)
        ));
    }
    constructor(level=0,saved=null,brushes=0){
      this.level=level;this.config=LEVELS[level];this.seed=this.config.seed;
      this.cells=Array(SIZE).fill(null);this.cover=Array(SIZE).fill(0);
      this.moves=this.config.moves;this.brushes=brushes;this.startBrushes=brushes;
      this.developer=level===1?6:0;this.observations=[];this.score=0;this.turns=0;this.chain=0;this.madeLine=false;this.usedLine=false;
      if(saved){Object.assign(this,JSON.parse(JSON.stringify(saved)));this.config=LEVELS[level];this.developer=Math.max(0,Math.min(6,Number(this.developer)||0));this.observations=Array.isArray(this.observations)?this.observations:[];this.score=Number.isSafeInteger(this.score)&&this.score>=0?this.score:0;return;}
      this.config.paper.forEach(([r,c])=>this.cover[(r-1)*N+c-1]=1);
      this.config.boxes.forEach(([r,c])=>this.cells[(r-1)*N+c-1]={kind:'box',hp:1});
      this.fillClean();
    }
    rand(){this.seed=(1664525*this.seed+1013904223)>>>0;return this.seed/4294967296;}
    make(){return tile(Math.floor(this.rand()*this.config.colors));}
    isTile(i){return this.cells[i]?.kind==='tile';}
    color(i){return this.isTile(i)&&this.cells[i].special!=='color'?this.cells[i].color:-1;}
    adjacent(a,b){return a>=0&&b>=0&&a<SIZE&&b<SIZE&&Math.abs(Math.floor(a/N)-Math.floor(b/N))+Math.abs(a%N-b%N)===1;}
    neighbors(i){return [i-7,i+7,i-1,i+1].filter(j=>this.adjacent(i,j));}
    fillClean(){
      for(let attempt=0;attempt<100;attempt++){
        for(let i=0;i<SIZE;i++){
          if(this.cells[i]?.kind==='box')continue;
          const options=Array.from({length:this.config.colors},(_,c)=>c).filter(c=>!(i%7>1&&this.color(i-1)===c&&this.color(i-2)===c)&&!(i>=14&&this.color(i-7)===c&&this.color(i-14)===c));
          this.cells[i]=tile(options[Math.floor(this.rand()*options.length)]);
        }
        // L3开局四连：把(2,3)向下交换到(3,3)，第三行形成四连。
        if(this.level===2){
          [[14,0],[15,0],[16,1],[17,0],[9,0],[18,2]].forEach(([i,c])=>this.cells[i]=tile(c));
        }
        if(!this.groups().length&&this.possible().length)return;
      }
      throw Error('初始棋盘生成失败');
    }
    groups(){
      const all=[];
      for(let axis=0;axis<2;axis++)for(let line=0;line<7;line++){
        let run=[];
        const flush=()=>{if(run.length>=3)all.push({ids:[...run],axis});run=[];};
        for(let k=0;k<7;k++){const i=axis?k*7+line:line*7+k,c=this.color(i);if(c<0){flush();continue;}if(run.length&&this.color(run[0])!==c)flush();run.push(i);}
        flush();
      }
      return all;
    }
    validSpecial(a,b){return !!(this.cells[a]?.special||this.cells[b]?.special);}
    possible(){
      const out=[];
      for(let a=0;a<SIZE;a++)for(const b of [a+1,a+7]){
        if(!this.adjacent(a,b)||!this.isTile(a)||!this.isTile(b))continue;
        if(this.validSpecial(a,b)){out.push([a,b]);continue;}
        [this.cells[a],this.cells[b]]=[this.cells[b],this.cells[a]];
        const ok=this.groups().some(g=>g.ids.includes(a)||g.ids.includes(b));
        [this.cells[a],this.cells[b]]=[this.cells[b],this.cells[a]];
        if(ok)out.push([a,b]);
      }
      return out;
    }
    canAct(){return this.possible().length>0;}
    preview(a,b){
      if(!this.adjacent(a,b)||!this.isTile(a)||!this.isTile(b))return {valid:false,lights:[]};
      const trigger=this.validSpecial(a,b),combo=!!(this.cells[a]?.special&&this.cells[b]?.special);
      [this.cells[a],this.cells[b]]=[this.cells[b],this.cells[a]];
      try{
        const groups=this.groups(),valid=trigger||groups.some(g=>g.ids.includes(a)||g.ids.includes(b));
        const direction=Math.floor(a/7)===Math.floor(b/7)?'row':'col';
        const lights=combo?[]:[...new Set([...groups.flatMap(g=>g.ids),...(trigger?[a,b]:[])])].filter(i=>['row','col'].includes(this.cells[i]?.special)).map(i=>({i,direction}));
        return {valid,combo,trigger,lights};
      }finally{[this.cells[a],this.cells[b]]=[this.cells[b],this.cells[a]];}
    }
    shuffle(){
      const ids=this.cells.map((x,i)=>x?.kind==='tile'?i:-1).filter(i=>i>=0),items=ids.map(i=>this.cells[i]);
      for(let attempt=0;attempt<30;attempt++){
        for(let i=items.length-1;i>0;i--){const j=Math.floor(this.rand()*(i+1));[items[i],items[j]]=[items[j],items[i]];}
        ids.forEach((id,k)=>this.cells[id]=items[k]);
        if(!this.groups().length&&this.canAct())return;
      }
      throw Error('无法重排出可用棋盘，请重试');
    }
    line(i,axis,width=1){
      const r=Math.floor(i/7),c=i%7,out=[];
      for(let d=-Math.floor(width/2);d<=Math.floor(width/2);d++)for(let k=0;k<7;k++){
        const rr=axis==='row'?r+d:k,cc=axis==='row'?k:c+d;
        if(rr>=0&&rr<7&&cc>=0&&cc<7)out.push(rr*7+cc);
      }
      return out;
    }
    diamond(i,radius){return Array.from({length:SIZE},(_,j)=>j).filter(j=>Math.abs(Math.floor(i/7)-Math.floor(j/7))+Math.abs(i%7-j%7)<=radius);}
    mostColor(){const counts=Array(5).fill(0);this.cells.forEach((_,i)=>{if(this.color(i)>=0)counts[this.color(i)]++;});return counts.indexOf(Math.max(...counts));}
    colored(c){return this.cells.map((_,i)=>this.color(i)===c?i:-1).filter(i=>i>=0);}
    effect(i,x){
      if(x.special==='row'||x.special==='col'){this.usedLine=true;return this.line(i,x.special);}
      if(x.special==='burst')return this.diamond(i,2);
      if(x.special==='color')return [i,...this.colored(this.mostColor())];
      return [i];
    }
    creations(groups,anchor,source){
      // 合并有交点的匹配线，单个连通集合只生成一个特效。
      const sets=[];
      for(const g of groups){
        const overlaps=sets.filter(s=>g.ids.some(i=>s.ids.has(i)));
        const s={ids:new Set(g.ids),lines:[g]};
        for(const old of overlaps){old.ids.forEach(i=>s.ids.add(i));s.lines.push(...old.lines);sets.splice(sets.indexOf(old),1);}
        sets.push(s);
      }
      return sets.flatMap(s=>{
        const long=s.lines.find(g=>g.ids.length>=5),four=s.lines.find(g=>g.ids.length===4);
        const crosses=[...s.ids].filter(i=>s.lines.filter(g=>g.ids.includes(i)).length>1).sort((a,b)=>a-b);
        let special=null,at;
        if(long){special='color';at=long.ids.includes(anchor)?anchor:long.ids.includes(source)?source:long.ids[Math.floor((long.ids.length-1)/2)];}
        else if(crosses.length){special='burst';at=crosses.includes(anchor)?anchor:crosses[0];}
        else if(four){special=anchor!=null?(Math.floor(anchor/7)===Math.floor(source/7)?'row':'col'):(four.axis?'col':'row');at=four.ids.includes(anchor)?anchor:four.ids.includes(source)?source:four.ids[Math.floor((four.ids.length-1)/2)];}
        if(!special)return [];
        if(special==='row'||special==='col')this.madeLine=true;
        return [{i:at,x:tile(this.color(at),special),members:[...s.ids]}];
      });
    }
    async hit(initial,notify,creates=[],suppressed=[],comboEffect=null){
      const hit=new Set(initial),queue=[...hit],activated=new Set(suppressed),created=new Map(creates.map(x=>[x.i,x.x])),effects=comboEffect?[comboEffect]:[];
      for(let q=0;q<queue.length;q++){
        const i=queue[q],x=this.cells[i];
        if(x?.special&&!activated.has(i)){
          activated.add(i);
          created.delete(i);
          effects.push({i,kind:x.special});
          for(const j of this.effect(i,x)){if(created.has(j)&&j!==i)created.delete(j);if(!hit.has(j)){hit.add(j);queue.push(j);}}
        }
      }
      const boxes=new Set(),clearedCover=[];
      for(const i of hit){
        if(this.cover[i]){this.cover[i]--;clearedCover.push(i);}
        if(this.cells[i]?.kind==='box')boxes.add(i);
        if(this.isTile(i))this.neighbors(i).forEach(j=>{if(this.cells[j]?.kind==='box')boxes.add(j);});
      }
      boxes.forEach(i=>{this.cells[i].hp--;});
      this.score += [...hit].filter(i=>this.isTile(i)).length*10+clearedCover.length*30+[...boxes].filter(i=>this.cells[i].hp<=0).length*30;
      await notify({type:'clear',ids:[...hit],boxes:[...boxes],effects,clearedCover,creates:creates.filter(x=>created.has(x.i))});
      hit.forEach(i=>{if(this.isTile(i))this.cells[i]=null;});
      boxes.forEach(i=>{if(this.cells[i]?.hp<=0)this.cells[i]=null;});
      created.forEach((x,i)=>{this.cells[i]=x;});
      await notify({type:'created',ids:[...created.keys()]});
      const falls=this.gravity();
      await notify({type:'fall',ids:[],falls,born:[...created.values()].map(x=>this.cells.indexOf(x)).filter(i=>i>=0)});
    }
    gravity(){
      const falls=[];
      for(let c=0;c<7;c++){
        let bottom=6;
        while(bottom>=0){
          if(this.cells[bottom*7+c]?.kind==='box'){bottom--;continue;}
          let top=bottom;while(top>0&&this.cells[(top-1)*7+c]?.kind!=='box')top--;
          const items=[];for(let r=bottom;r>=top;r--)if(this.cells[r*7+c])items.push({x:this.cells[r*7+c],r});
          for(let r=bottom;r>=top;r--){const k=bottom-r,item=items[k],from=item?item.r:top-1-(k-items.length);this.cells[r*7+c]=item?.x||this.make();if(from!==r)falls.push({i:r*7+c,rows:r-from});}
          bottom=top-1;
        }
      }
      return falls;
    }
    async settle(notify,anchor=null,source=null){
      for(let wave=0;wave<100;wave++){
        const groups=this.groups();if(!groups.length)break;
        if(anchor!==null){const direction=Math.floor(anchor/7)===Math.floor(source/7)?'row':'col';for(const i of new Set(groups.flatMap(g=>g.ids)))if(['row','col'].includes(this.cells[i]?.special))this.cells[i].special=direction;}
        this.chain++;await this.hit([...new Set(groups.flatMap(g=>g.ids))],notify,this.creations(groups,anchor,source));
        anchor=null;source=null;
      }
      if(this.groups().length)throw Error('连锁未稳定');
      if(!this.won()&&!this.canAct()){this.shuffle();await notify({type:'reshuffle',ids:[]});}
      await notify({type:'settled',ids:[]});
    }
    async combo(a,b,x,y,notify){
      this.chain++;
      let ids=[a,b];
      if(x.special==='color'||y.special==='color'){
        const other=x.special==='color'?y:x;
        if(other.special==='color')ids=Array.from({length:SIZE},(_,i)=>i);
        else{
          const targets=this.colored(other.color);
          if(other.special){targets.forEach(i=>this.cells[i]=tile(other.color,other.special==='burst'?'burst':this.rand()<.5?'row':'col'));}
          ids.push(...targets);
          // 组合双方已消费，其余转换特效各自触发一次。
          if(other.special)ids.push(...this.effect(b,other));
        }
      }else if(x.special==='burst'&&y.special==='burst')ids.push(...this.diamond(b,3));
      else if(x.special==='burst'||y.special==='burst'){const line=x.special==='burst'?y:x;ids.push(...this.line(b,line.special,3));this.usedLine=true;}
      else{ids.push(...this.line(b,'row'),...this.line(b,'col'));this.usedLine=true;}
      await this.hit(ids,notify,[],[a,b],{i:b,kind:x.special==='color'||y.special==='color'?'color':x.special==='burst'&&y.special==='burst'?'burst':'cross'});
    }
    async swap(a,b,notify=async()=>{}){
      if(this.moves<=0||this.won()||!this.adjacent(a,b)||!this.isTile(a)||!this.isTile(b))return false;
      const x={...this.cells[a]},y={...this.cells[b]},combo=this.validSpecial(a,b);
      [this.cells[a],this.cells[b]]=[this.cells[b],this.cells[a]];
      if(!combo&&!this.groups().length){[this.cells[a],this.cells[b]]=[this.cells[b],this.cells[a]];await notify({type:'invalid',ids:[a,b]});return false;}
      this.moves--;this.turns++;this.chain=0;
      await notify({type:'swap',ids:[a,b]});
      if(combo){
        if((x.special&&y.special)||x.special==='color'||y.special==='color')await this.combo(a,b,x,y,notify);
        else{
          const at=x.special?b:a;
          if(['row','col'].includes(this.cells[at].special))this.cells[at].special=Math.floor(a/7)===Math.floor(b/7)?'row':'col';
          this.chain++;
          await this.hit([at],notify);
        }
      }
      await this.settle(notify,combo?null:b,combo?null:a);if(this.level>=1)this.developer=Math.min(6,this.developer+2+Math.min(2,Math.max(0,this.chain-1)));return true;
    }
    async brush(i,notify=async()=>{}){
      if(i<0||i>=SIZE||!this.cells[i]||this.brushes<=0||this.won()||this.moves<=0)return false;
      this.brushes--;this.chain=0;
      if(this.cover[i]){this.cover[i]--;this.score+=30;await notify({type:'brush',ids:[i]});}
      else if(this.cells[i].kind==='box'){
        this.cells[i].hp--;if(this.cells[i].hp<=0)this.score+=30;await notify({type:'brush',ids:[i]});
        if(this.cells[i].hp<=0)this.cells[i]=null;const falls=this.gravity();await notify({type:'fall',ids:[],falls});
      }else await this.hit([i],notify);
      await this.settle(notify);return true;
    }
    developArea(i){
      if(!Number.isInteger(i)||i<0||i>=SIZE)return [];
      const r=Math.floor(i/7),c=i%7;
      return Array.from({length:SIZE},(_,j)=>j).filter(j=>Math.abs(Math.floor(j/7)-r)<=1&&Math.abs(j%7-c)<=1);
    }
    async develop(i,notify=async()=>{}){
      if(this.level<1||this.developer<6||this.moves<=0||this.won())return false;
      const ids=this.developArea(i).filter(j=>this.cover[j]>0&&this.cells[j]?.kind!=='box');
      if(!ids.length)return false;
      this.developer=0;ids.forEach(j=>this.cover[j]--);this.score+=ids.length*30;
      await notify({type:'develop',ids});return true;
    }
    bonusPlan(){
      // Cosmetic reward waves never call ordinary settle or generate further rewards.
      const waves=[];let left=this.moves,k=0;
      const batch=Math.max(1,Math.ceil(left/5));
      while(left>0){
        const count=Math.min(batch,left),lights=[];
        for(let j=0;j<count;j++){const n=k++;lights.push({i:(n*11+this.level*3)%49,kind:n%2?'col':'row'});}
        const hits=[...new Set(lights.flatMap(x=>this.line(x.i,x.kind)))];
        waves.push({lights,hits,steps:count,points:hits.length*10});left-=count;
      }
      return waves;
    }
    remaining(){return {cover:this.cover.reduce((a,b)=>a+b,0),boxes:this.cells.filter(x=>x?.kind==='box').length};}
    won(){const r=this.remaining();return !r.cover&&!r.boxes;}
    snapshot(){const {config,...rest}=this;return JSON.parse(JSON.stringify(rest));}
  }
  root.GameEngine={Board,LEVELS};
})(window);
