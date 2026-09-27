import {W,H,ITEMS} from './items.js?v=100';

const $=id=>document.getElementById(id);
const KEY='little-finds-harbour-v100',PREF='little-finds-prefs-v100';
const canvas=$('scene'),ctx=canvas.getContext('2d');
const small=new Image(),hd=new Image();
let art=null;                       // best loaded picture
let found=new Set(),prefs={sound:true,coached:false};
try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(v))found=new Set(v.filter(id=>ITEMS.some(t=>t.id===id)));}catch{}
try{prefs={...prefs,...JSON.parse(localStorage.getItem(PREF)||'{}')};}catch{}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify([...found]));}catch{}};
const savePrefs=()=>{try{localStorage.setItem(PREF,JSON.stringify(prefs));}catch{}};

// ---------- geometry ----------
for(const t of ITEMS){
  const xs=t.poly.map(p=>p[0]),ys=t.poly.map(p=>p[1]);
  t.box=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
  let a=0;for(let i=0,j=t.poly.length-1;i<t.poly.length;j=i++)a+=(t.poly[j][0]+t.poly[i][0])*(t.poly[j][1]-t.poly[i][1]);
  t.area=Math.abs(a/2);
  t.path=new Path2D('M'+t.poly.map(p=>p.join(',')).join('L')+'Z');
}
const groups=[];
for(const t of ITEMS){let g=groups.find(g=>g.key===t.group);if(!g)groups.push(g={key:t.group,name:t.name,items:[]});g.items.push(t);}
const left=g=>g.items.filter(t=>!found.has(t.id));
function inside(p,x,y){let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [a,b]=p[i],[d,e]=p[j];if((b>y)!=(e>y)&&x<(d-a)*(y-b)/(e-b)+a)c=!c;}return c;}
function edgeDist(p,x,y){let m=1e9;for(let i=0,j=p.length-1;i<p.length;j=i++){const [ax,ay]=p[j],[bx,by]=p[i],dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy||1;let u=((x-ax)*dx+(y-ay)*dy)/l;u=Math.max(0,Math.min(1,u));m=Math.min(m,Math.hypot(x-ax-u*dx,y-ay-u*dy));}return m;}

// ---------- view ----------
let cw=1,ch=1,dpr=1,s=1,tx=0,ty=0,sFit=1,sCover=1,sMax=6;
const clampView=()=>{
  s=Math.max(sFit,Math.min(sMax,s));
  const w=W*s,h=H*s;
  tx=w<=cw?(cw-w)/2:Math.max(cw-w,Math.min(0,tx));
  ty=h<=ch?(ch-h)/2:Math.max(ch-h,Math.min(0,ty));
};
function resize(first){
  const r=$('board').getBoundingClientRect();
  const cx=(cw/2-tx)/s,cy=(ch/2-ty)/s;
  cw=r.width;ch=r.height;dpr=Math.min(3,devicePixelRatio||1);
  canvas.width=Math.round(cw*dpr);canvas.height=Math.round(ch*dpr);
  sFit=Math.min(cw/W,ch/H);sCover=Math.max(cw/W,ch/H);sMax=Math.max(sCover*4,sFit*6);
  if(first){s=sCover;tx=(cw-W*s)/2;ty=(ch-H*s)/2;}
  else{tx=cw/2-cx*s;ty=ch/2-cy*s;}
  clampView();kick();
}
function zoomAt(ns,x=cw/2,y=ch/2){const k=Math.max(sFit,Math.min(sMax,ns))/s;tx=x-(x-tx)*k;ty=y-(y-ty)*k;s*=k;clampView();kick();}
let flight=null;
function flyTo(x,y,ns){const from={s,tx,ty};ns=Math.max(sFit,Math.min(sMax,ns));
  let to={s:ns,tx:cw/2-x*ns,ty:ch/2-y*ns};const keep={s,tx,ty};s=to.s;tx=to.tx;ty=to.ty;clampView();to={s,tx,ty};({s,tx,ty}=keep);
  flight={from,to,t0:performance.now(),d:650};kick();}

// ---------- effects ----------
const fx=[];let hint=null;
function burst(t){
  const cx=(t.box[0]+t.box[2])/2,cy=(t.box[1]+t.box[3])/2,now=performance.now();
  fx.push({type:'ring',x:cx,y:cy,r:Math.max(t.box[2]-t.box[0],t.box[3]-t.box[1])/2,t0:now,d:700});
  fx.push({type:'glow',item:t,t0:now,d:900});
  for(let i=0;i<14;i++){const a=Math.PI*2*i/14+Math.random()*.4,v=40+Math.random()*50;
    fx.push({type:'spark',x:cx,y:cy,vx:Math.cos(a)*v,vy:Math.sin(a)*v,c:['#ffd35c','#ff8fa3','#fff','#9fe0b0'][i%4],heart:i%3===0,t0:now,d:800+Math.random()*300});}
}
function miss(x,y){fx.push({type:'miss',x,y,t0:performance.now(),d:450});}

// ---------- drawing ----------
let raf=0;
function kick(){if(!raf)raf=requestAnimationFrame(frame);}
function frame(now){
  raf=0;let busy=false;
  if(flight){const k=Math.min(1,(now-flight.t0)/flight.d),e=1-Math.pow(1-k,3);
    s=flight.from.s+(flight.to.s-flight.from.s)*e;tx=flight.from.tx+(flight.to.tx-flight.from.tx)*e;ty=flight.from.ty+(flight.to.ty-flight.from.ty)*e;
    if(k>=1)flight=null;else busy=true;}
  paint(now);
  for(let i=fx.length-1;i>=0;i--)if(now-fx[i].t0>fx[i].d)fx.splice(i,1);
  if(fx.length||hint&&now<hint.until)busy=true;else if(hint){hint=null;paint(now);}
  if(busy)kick();
}
function paint(now){
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle='#efe2cf';ctx.fillRect(0,0,cw,ch);
  if(!art)return;
  ctx.save();ctx.translate(tx,ty);ctx.scale(s,s);
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(art,0,0,W,H);
  // found marks
  for(const t of ITEMS)if(found.has(t.id)){
    ctx.save();ctx.lineJoin='round';
    ctx.strokeStyle='rgba(255,255,255,.95)';ctx.lineWidth=4/s;ctx.stroke(t.path);
    ctx.strokeStyle='rgba(84,145,98,.9)';ctx.lineWidth=1.6/s;ctx.stroke(t.path);
    const r=Math.max(7/s,Math.min(10,9/s));
    const bx=Math.min(t.box[2],W-r),by=Math.max(t.box[1],r);
    ctx.beginPath();ctx.arc(bx,by,r,0,Math.PI*2);ctx.fillStyle='#4f8a5c';ctx.fill();ctx.lineWidth=1.5/s;ctx.strokeStyle='#fff';ctx.stroke();
    ctx.beginPath();ctx.moveTo(bx-r*.45,by);ctx.lineTo(bx-r*.1,by+r*.38);ctx.lineTo(bx+r*.5,by-r*.35);ctx.lineWidth=Math.max(1.6/s,r*.28);ctx.stroke();
    ctx.restore();}
  // hint glow
  if(hint){const t=hint.item,k=(Math.sin(now/180)+1)/2,cx=(t.box[0]+t.box[2])/2,cy=(t.box[1]+t.box[3])/2,r=Math.max(t.box[2]-t.box[0],t.box[3]-t.box[1])/2+14/s+k*6/s;
    ctx.save();ctx.shadowColor='#ffb800';ctx.shadowBlur=18;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle=`rgba(255,226,120,${.75+.25*k})`;ctx.lineWidth=5/s;ctx.stroke();ctx.restore();}
  for(const f of fx){const k=Math.min(1,(now-f.t0)/f.d);
    if(f.type==='ring'){ctx.beginPath();ctx.arc(f.x,f.y,f.r+k*30/s+6/s,0,Math.PI*2);ctx.strokeStyle=`rgba(255,240,170,${1-k})`;ctx.lineWidth=(6-4*k)/s;ctx.stroke();}
    if(f.type==='glow'){ctx.save();ctx.globalAlpha=(1-k)*.55;ctx.fillStyle='#fff6c8';ctx.fill(f.item.path);ctx.restore();}
    if(f.type==='spark'){const e=1-Math.pow(1-k,2),x=f.x+f.vx*e/s*1.2,y=f.y+f.vy*e/s*1.2+k*k*20/s;ctx.globalAlpha=1-k;ctx.fillStyle=f.c;
      if(f.heart){ctx.font=`${14/s}px sans-serif`;ctx.textAlign='center';ctx.fillText('♥',x,y);}else{ctx.beginPath();ctx.arc(x,y,3/s*(1-k*.5),0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
    if(f.type==='miss'){ctx.beginPath();ctx.arc(f.x,f.y,(8+k*18)/s,0,Math.PI*2);ctx.strokeStyle=`rgba(255,255,255,${.7*(1-k)})`;ctx.lineWidth=2/s;ctx.stroke();}
  }
  ctx.restore();
  // minimap
  const m=$('map').getContext('2d'),mw=180,mh=120;
  m.drawImage(small.complete&&small.naturalWidth?small:art,0,0,mw,mh);
  m.fillStyle='rgba(255,250,240,.35)';m.fillRect(0,0,mw,mh);
  m.strokeStyle='#c0482e';m.lineWidth=4;
  m.strokeRect(Math.max(2,-tx/s/W*mw),Math.max(2,-ty/s/H*mh),Math.min(mw-4,cw/s/W*mw),Math.min(mh-4,ch/s/H*mh));
  $('plus').disabled=s>=sMax-1e-6;$('minus').disabled=s<=sFit+1e-6;
}

// ---------- tray ----------
function renderTray(){
  const n=found.size;
  $('count').textContent=n;$('total').textContent=ITEMS.length;
  $('fill').style.width=(n/ITEMS.length*100)+'%';
  const box=$('targets'),scroll=box.scrollLeft;box.replaceChildren();
  const order=[...groups.filter(g=>left(g).length),...groups.filter(g=>!left(g).length)];
  for(const g of order){
    const l=left(g).length,b=document.createElement('button');
    b.className='target'+(l?'':' done');b.dataset.group=g.key;
    b.setAttribute('aria-label',`${g.name}: ${l?l+' left':'all found'}`);
    const img=new Image();img.src=`stickers/${g.items[0].id}.webp`;img.alt='';img.draggable=false;
    const name=document.createElement('span');name.textContent=g.name;
    b.append(img,name);
    if(g.items.length>1||!l){const c=document.createElement('i');c.className='badge';c.textContent=l?'×'+l:'✓';b.append(c);}
    b.onclick=()=>openItem(g);
    box.append(b);
  }
  box.scrollLeft=scroll;
}
let chosen=null;
function openItem(g){
  chosen=g;const l=left(g).length;
  $('item-picture').src=`stickers/${g.items[0].id}.webp`;
  $('item-name').textContent=g.name;
  $('item-left').textContent=l?(g.items.length>1?`${l} of ${g.items.length} still hiding`:'Still hiding somewhere…'):'Found! ♥';
  $('item-hint').hidden=!l;
  $('item-dialog').showModal();
}
function showHint(g){
  const pool=g?left(g):ITEMS.filter(t=>!found.has(t.id));
  if(!pool.length)return;
  // nearest to the current view centre feels gentlest
  const cx=(cw/2-tx)/s,cy=(ch/2-ty)/s;
  const t=pool.slice().sort((a,b)=>Math.hypot(a.box[0]-cx,a.box[1]-cy)-Math.hypot(b.box[0]-cx,b.box[1]-cy))[0];
  const size=Math.max(t.box[2]-t.box[0],t.box[3]-t.box[1]);
  const want=Math.max(s,Math.min(sMax,Math.min(cw,ch)*.28/size),sCover*1.3);
  flyTo((t.box[0]+t.box[2])/2,(t.box[1]+t.box[3])/2,want);
  hint={item:t,until:performance.now()+4200};
  toast(g?'Look inside the golden circle ✦':`Try the ${t.name.toLowerCase()} ✦`);
}

// ---------- found ----------
let audio;
function chime(big){
  if(!prefs.sound)return;
  try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();
    const notes=big?[523,659,784,1047,1319]:[784,988,1319];
    notes.forEach((f,i)=>{const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+i*.075;
      o.type='sine';o.frequency.value=f;o.connect(g);g.connect(audio.destination);
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.06,t+.012);g.gain.exponentialRampToValueAtTime(.0008,t+.5);o.start(t);o.stop(t+.52);});
  }catch{}
}
function soft(){if(!prefs.sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;o.frequency.value=220;o.connect(g);g.connect(audio.destination);g.gain.setValueAtTime(.025,t);g.gain.exponentialRampToValueAtTime(.0005,t+.12);o.start(t);o.stop(t+.13);}catch{}}
let toastT;
function toast(msg){clearTimeout(toastT);const el=$('toast');el.textContent=msg;el.classList.add('on');toastT=setTimeout(()=>el.classList.remove('on'),1900);}
const cheers=['Lovely!','Well spotted!','Found it!','Sharp eyes!','Wonderful!','Yay!','So good!'];
function tap(px,py){
  const x=(px-tx)/s,y=(py-ty)/s,tol=Math.max(3,14/s);
  const open=ITEMS.filter(t=>!found.has(t.id)&&x>t.box[0]-tol&&x<t.box[2]+tol&&y>t.box[1]-tol&&y<t.box[3]+tol);
  let hit=open.filter(t=>inside(t.poly,x,y)).sort((a,b)=>a.area-b.area)[0];
  if(!hit)hit=open.map(t=>({t,d:edgeDist(t.poly,x,y)})).filter(v=>v.d<tol).sort((a,b)=>a.d-b.d)[0]?.t;
  if(!hit){miss(x,y);kick();soft();return;}
  found.add(hit.id);save();
  if(hint?.item===hit)hint=null;
  burst(hit);kick();
  if(navigator.vibrate)try{navigator.vibrate(18);}catch{}
  const g=groups.find(g=>g.key===hit.group),l=left(g).length;
  const done=found.size===ITEMS.length;
  chime(!l||done);
  renderTray();
  const btn=$('targets').querySelector(`[data-group="${g.key}"]`);btn?.classList.add('pop');
  toast(done?'Everything found! ♥':l?`${hit.name} · ${l} more to find`:`${cheers[found.size%cheers.length]} ${g.name} ♥`);
  if(done)setTimeout(celebrate,900);
}
function celebrate(){
  const box=$('confetti');box.replaceChildren();
  for(let i=0;i<60;i++){const e=document.createElement('span');e.textContent=['♥','✿','★','●'][i%4];
    e.style.cssText=`left:${Math.random()*100}vw;color:${['#e8738a','#f5b83d','#6fa87a','#6f9fd8','#c96f4a'][i%5]};animation-delay:${Math.random()*1.2}s;font-size:${12+Math.random()*16}px;--dx:${(Math.random()-.5)*120}px`;
    box.append(e);}
  chime(true);setTimeout(()=>chime(true),420);
  $('complete').showModal();
}

// ---------- input ----------
const pts=new Map();let pinch=null,lastTap=0;
const pos=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
canvas.addEventListener('pointerdown',e=>{e.preventDefault();flight=null;const p=pos(e);
  pts.set(e.pointerId,{...p,sx:p.x,sy:p.y,t:performance.now(),moved:false});try{canvas.setPointerCapture(e.pointerId);}catch{}
  if(pts.size===2){for(const q of pts.values())q.moved=true;const [a,b]=[...pts.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
  hideCoach();});
canvas.addEventListener('pointermove',e=>{const p=pts.get(e.pointerId);if(!p)return;e.preventDefault();const q=pos(e);
  if(Math.hypot(q.x-p.sx,q.y-p.sy)>9)p.moved=true;const dx=q.x-p.x,dy=q.y-p.y;p.x=q.x;p.y=q.y;
  if(pts.size>=2){const [a,b]=[...pts.values()],d=Math.hypot(a.x-b.x,a.y-b.y),cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;
    if(pinch){tx+=cx-pinch.x;ty+=cy-pinch.y;zoomAt(s*d/pinch.d,cx,cy);}pinch={d,x:cx,y:cy};}
  else if(p.moved){tx+=dx;ty+=dy;clampView();kick();}});
function up(e){const p=pts.get(e.pointerId);if(!p)return;pts.delete(e.pointerId);if(pts.size<2)pinch=null;
  if(e.type==='pointerup'&&!p.moved&&performance.now()-p.t<600){
    const now=performance.now();
    if(e.pointerType==='mouse'||now-lastTap>0)tap(p.x,p.y);
    lastTap=now;}}
for(const t of ['pointerup','pointercancel'])canvas.addEventListener(t,up);
canvas.addEventListener('wheel',e=>{e.preventDefault();const p=pos(e);zoomAt(s*Math.exp(-e.deltaY*.0022),p.x,p.y);},{passive:false});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('gesturestart',e=>e.preventDefault());
$('plus').onclick=()=>{const t0={s,tx,ty};zoomAt(s*1.6);const to={s,tx,ty};({s,tx,ty}=t0);flight={from:t0,to,t0:performance.now(),d:300};kick();};
$('minus').onclick=()=>{const t0={s,tx,ty};zoomAt(s/1.6);const to={s,tx,ty};({s,tx,ty}=t0);flight={from:t0,to,t0:performance.now(),d:300};kick();};
function mapJump(e){const r=$('map').getBoundingClientRect();flyTo((e.clientX-r.left)/r.width*W,(e.clientY-r.top)/r.height*H,s);}
$('map').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();mapJump(e);});
addEventListener('resize',()=>{if(!$('play').hidden)resize(false);});
addEventListener('blur',()=>{pts.clear();pinch=null;});

// ---------- screens ----------
function hideCoach(){if(!$('coach').hidden){$('coach').hidden=true;prefs.coached=true;savePrefs();}}
function homeCopy(){
  const n=found.size;
  $('progress-home').textContent=n?`${n} of ${ITEMS.length} found so far`:`${ITEMS.length} little things to find`;
  $('start').textContent=n===ITEMS.length?'Look at the finished picture':n?'Keep exploring':'Start exploring';
  $('reset').hidden=!n;
}
function home(){$('play').hidden=true;$('home').hidden=false;homeCopy();}
function play(){
  $('home').hidden=true;$('play').hidden=false;renderTray();
  requestAnimationFrame(()=>{resize(true);if(!prefs.coached)$('coach').hidden=false;});
}
$('start').onclick=()=>{chime(false);play();};
$('back').onclick=home;
$('reset').onclick=()=>{if(confirm('Start over? Your finds will be cleared.')){found.clear();save();homeCopy();}};
$('hint').onclick=()=>showHint(null);
$('coach-ok').onclick=hideCoach;
$('close-item').onclick=()=>$('item-dialog').close();
$('item-hint').onclick=()=>{$('item-dialog').close();showHint(chosen);};
$('again').onclick=()=>{$('complete').close();found.clear();save();renderTray();resize(true);};
$('admire').onclick=()=>{$('complete').close();s=sFit;clampView();kick();};
for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',e=>{if(e.target===d)d.close();});
function soundUI(){$('sound').textContent=prefs.sound?'♪':'♪̸';$('sound').setAttribute('aria-pressed',String(prefs.sound));$('sound').classList.toggle('off',!prefs.sound);}
$('sound').onclick=()=>{prefs.sound=!prefs.sound;savePrefs();soundUI();if(prefs.sound)chime(false);};
soundUI();

// teaser stickers on the home screen
for(const id of ['lucky','teapot1','duck','calico','bun1','ferry']){const i=new Image();i.src=`stickers/${id}.webp`;i.alt='';$('teaser').append(i);}
homeCopy();

// ---------- pictures ----------
small.onload=()=>{if(!art)art=small;const h=$('hero-art').getContext('2d');h.drawImage(small,0,0,900,600);kick();$('loading').hidden=true;};
hd.onload=()=>{art=hd;kick();$('loading').hidden=true;};
small.src='harbour-small.webp?v=100';
hd.src='harbour-hd.webp?v=100';
// warm the sticker cache
for(const g of groups){const i=new Image();i.src=`stickers/${g.items[0].id}.webp`;}

// test hooks
window.__lf={ITEMS,found,view:()=>({s,tx,ty,cw,ch}),tapScene:(x,y)=>tap(x*s+tx,y*s+ty)};
