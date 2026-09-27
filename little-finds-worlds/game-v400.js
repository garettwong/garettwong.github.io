// Little Finds v300 - the painting is fully vector (traced SVG); every findable thing is its own SVG layer.
import {W,H,FINDS} from './finds4.js?v=400';

const $=id=>document.getElementById(id);
const KEY='little-finds-harbour-v400',PREF='little-finds-prefs-v100';
let found=new Set(),prefs={sound:true,coached:false};
try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(v))found=new Set(v);}catch{}
try{prefs={...prefs,...JSON.parse(localStorage.getItem(PREF)||'{}')};}catch{}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify([...found]));}catch{}};
const savePrefs=()=>{try{localStorage.setItem(PREF,JSON.stringify(prefs));}catch{}};
const V='?v=400',art=id=>`svg4/${id}.svg${V}`;

const ITEMS=FINDS.map(f=>({...f}));
for(const t of ITEMS){t.area=0;for(const p of t.polys){let a=0;for(let i=0,j=p.length-1;i<p.length;j=i++)a+=(p[j][0]+p[i][0])*(p[j][1]-p[i][1]);t.area+=Math.abs(a/2);}}
const groups=[];
for(const t of ITEMS){let g=groups.find(g=>g.key===t.group);if(!g)groups.push(g={key:t.group,name:t.name,icon:t.id,items:[]});g.items.push(t);}
const left=g=>g.items.filter(t=>!found.has(t.id));
const in1=(p,x,y)=>{let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [a,b]=p[i],[d,e]=p[j];if((b>y)!=(e>y)&&x<(d-a)*(y-b)/(e-b)+a)c=!c;}return c;};
const inside=(t,x,y)=>t.polys.some(p=>in1(p,x,y));

// ---------- stage: one container (background + layers) moved with a CSS transform ----------
const board=$('board'),stage=$('stage'),fx=$('fx');
stage.style.width=W+'px';stage.style.height=H+'px';
for(const t of ITEMS){
  const im=new Image();im.src=art(t.id);im.alt='';im.draggable=false;im.className='layer';
  Object.assign(im.style,{left:t.x+'px',top:t.y+'px',width:t.w+'px',height:t.h+'px'});
  t.node=im;stage.append(im);
  if(found.has(t.id))im.classList.add('gone');
}
let cw=1,ch=1,s=1,tx=0,ty=0,sFit=1,sCover=1,sMax=4;
function clampView(){s=Math.max(sFit,Math.min(sMax,s));const w=W*s,h=H*s;
  tx=w<=cw?(cw-w)/2:Math.max(cw-w,Math.min(0,tx));ty=h<=ch?(ch-h)/2:Math.max(ch-h,Math.min(0,ty));}
let pending=false;
function apply(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;
  stage.style.transform=`translate(${tx}px,${ty}px) scale(${s})`;
  fx.style.transform=stage.style.transform;
  const mw=$('map').clientWidth,mh=$('map').clientHeight,r=$('map-view');
  r.style.left=(-tx/s/W*mw)+'px';r.style.top=(-ty/s/H*mh)+'px';r.style.width=Math.min(mw,cw/s/W*mw)+'px';r.style.height=Math.min(mh,ch/s/H*mh)+'px';
  $('plus').disabled=s>=sMax-1e-6;$('minus').disabled=s<=sFit+1e-6;});}
function resize(first){const r=board.getBoundingClientRect(),cx=(cw/2-tx)/s,cy=(ch/2-ty)/s;cw=r.width;ch=r.height;
  sFit=Math.min(cw/W,ch/H);sCover=Math.max(cw/W,ch/H);sMax=Math.max(sCover*3.5,sFit*8,1.6);
  if(first){s=sCover;tx=(cw-W*s)/2;ty=(ch-H*s)/2;}else{tx=cw/2-cx*s;ty=ch/2-cy*s;}clampView();apply();}
function zoomAt(ns,x=cw/2,y=ch/2){const k=Math.max(sFit,Math.min(sMax,ns))/s;tx=x-(x-tx)*k;ty=y-(y-ty)*k;s*=k;clampView();apply();}
let flight=0;
function animateTo(ns,ntx,nty,d=600){const from={s,tx,ty};s=ns;tx=ntx;ty=nty;clampView();const to={s,tx,ty};({s,tx,ty}=from);
  const t0=performance.now(),id=++flight;
  const step=now=>{if(id!==flight)return;const k=Math.min(1,(now-t0)/d),e=1-Math.pow(1-k,3);
    s=from.s+(to.s-from.s)*e;tx=from.tx+(to.tx-from.tx)*e;ty=from.ty+(to.ty-from.ty)*e;apply();if(k<1)requestAnimationFrame(step);};
  requestAnimationFrame(step);}
const flyTo=(x,y,ns)=>{ns=Math.max(sFit,Math.min(sMax,ns));animateTo(ns,cw/2-x*ns,ch/2-y*ns);};

// ---------- effects (in scene space, same transform as the stage) ----------
function addFx(cls,x,y,size,text){const e=document.createElement('div');e.className=cls;
  Object.assign(e.style,{left:x+'px',top:y+'px',width:size+'px',height:size+'px',marginLeft:-size/2+'px',marginTop:-size/2+'px'});
  if(text)e.textContent=text;fx.append(e);return e;}
function flyToTray(t){
  const btn=$('targets').querySelector(`[data-group="${t.group}"]`);
  const from=t.node.getBoundingClientRect();
  // a small bitmap snapshot of the layer flies (cheap to animate), drawn from the layer's own SVG
  const ghost=document.createElement('canvas'),dpr=Math.min(2,devicePixelRatio||1);
  ghost.width=Math.max(1,Math.round(from.width*dpr));ghost.height=Math.max(1,Math.round(from.height*dpr));
  try{ghost.getContext('2d').drawImage(t.node,0,0,ghost.width,ghost.height);}catch{}
  ghost.className='ghost';
  Object.assign(ghost.style,{left:from.left+'px',top:from.top+'px',width:from.width+'px',height:from.height+'px'});
  btn?.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});
  const go=()=>{document.body.append(ghost);t.node.classList.add('gone');t.node.classList.remove('lift');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const to=(btn||$('targets')).getBoundingClientRect(),size=Math.min(to.width,to.height)*.7;
    const k=Math.min(size/from.width,size/from.height);
    ghost.style.transform=`translate(${to.left+to.width/2-(from.left+from.width/2)}px,${to.top+to.height*.42-(from.top+from.height/2)}px) scale(${k})`;
    ghost.style.opacity='.9';
  }));
  setTimeout(()=>{ghost.remove();btn?.classList.add('pop');setTimeout(()=>btn?.classList.remove('pop'),500);},760);};
  go();
}
function celebrateItem(t){
  t.node.classList.add('lift');
  setTimeout(()=>flyToTray(t),420);
  const cx=t.x+t.w/2,cy=t.y+t.h/2,r=Math.max(t.w,t.h);
  const ring=addFx('ring',cx,cy,r*1.15);setTimeout(()=>ring.remove(),800);
  for(let i=0;i<12;i++){const a=Math.PI*2*i/12,d=r*.75+30;
    const p=addFx('spark',cx,cy,Math.max(22,r*.2),i%3?'✦':'♥');p.style.color=['#ffd35c','#ff8fa3','#9fe0b0','#fff'][i%4];
    p.style.fontSize=Math.max(18,r*.18)+'px';p.style.setProperty('--dx',Math.cos(a)*d+'px');p.style.setProperty('--dy',Math.sin(a)*d+'px');
    setTimeout(()=>p.remove(),900);}
}
let hintEl=null,hintT;
function hintAt(t){hintEl?.remove();clearTimeout(hintT);hintEl=addFx('hintring',t.x+t.w/2,t.y+t.h/2,Math.max(t.w,t.h)+60);hintT=setTimeout(()=>{hintEl?.remove();hintEl=null;},4500);}

// ---------- tray ----------
function renderTray(){const n=found.size;$('count').textContent=n;$('total').textContent=ITEMS.length;$('fill').style.width=(n/ITEMS.length*100)+'%';
  const box=$('targets'),scroll=box.scrollLeft;box.replaceChildren();
  for(const g of [...groups.filter(g=>left(g).length),...groups.filter(g=>!left(g).length)]){
    const l=left(g).length,b=document.createElement('button');b.className='target'+(l?'':' done');b.dataset.group=g.key;
    b.setAttribute('aria-label',`${g.name}: ${l?l+' left':'all found'}`);
    const img=new Image();img.src=art(g.icon);img.alt='';img.draggable=false;
    const name=document.createElement('span');name.textContent=g.name;b.append(img,name);
    if(g.items.length>1||!l){const c=document.createElement('i');c.className='badge';c.textContent=l?'×'+l:'✓';b.append(c);}
    b.onclick=()=>openItem(g);box.append(b);}
  box.scrollLeft=scroll;}
let chosen=null;
function openItem(g){chosen=g;const l=left(g).length;$('item-picture').src=art(g.icon);$('item-name').textContent=g.name;
  $('item-left').textContent=l?(g.items.length>1?`${l} of ${g.items.length} still hiding`:'Still hiding somewhere…'):'Found! ♥';
  $('item-hint').hidden=!l;$('item-dialog').showModal();}
function showHint(g){const pool=g?left(g):ITEMS.filter(t=>!found.has(t.id));if(!pool.length)return;
  const vx=(cw/2-tx)/s,vy=(ch/2-ty)/s;const t=pool.slice().sort((a,b)=>Math.hypot(a.x-vx,a.y-vy)-Math.hypot(b.x-vx,b.y-vy))[0];
  flyTo(t.x+t.w/2,t.y+t.h/2,Math.max(s,sCover*1.4,Math.min(sMax,Math.min(cw,ch)*.3/Math.max(t.w,t.h))));
  hintAt(t);toast(g?'Look inside the golden circle ✦':`Try the ${t.name.toLowerCase()} ✦`);}

// ---------- sound + toast ----------
let audio;
function chime(big){if(!prefs.sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();
  (big?[523,659,784,1047,1319]:[784,988,1319]).forEach((f,i)=>{const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+i*.075;
    o.frequency.value=f;o.connect(g);g.connect(audio.destination);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.06,t+.012);g.gain.exponentialRampToValueAtTime(.0008,t+.5);o.start(t);o.stop(t+.52);});}catch{}}
function soft(){if(!prefs.sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;o.frequency.value=220;o.connect(g);g.connect(audio.destination);g.gain.setValueAtTime(.025,t);g.gain.exponentialRampToValueAtTime(.0005,t+.12);o.start(t);o.stop(t+.13);}catch{}}
let toastT;function toast(m){clearTimeout(toastT);const e=$('toast');e.textContent=m;e.classList.add('on');toastT=setTimeout(()=>e.classList.remove('on'),1900);}
const cheers=['Lovely!','Well spotted!','Found it!','Sharp eyes!','Wonderful!','Yay!','So good!'];

// ---------- tapping ----------
function tap(px,py){const x=(px-tx)/s,y=(py-ty)/s,tol=16/s;
  const open=ITEMS.filter(t=>!found.has(t.id)&&x>t.x-tol&&x<t.x+t.w+tol&&y>t.y-tol&&y<t.y+t.h+tol);
  let hit=open.filter(t=>inside(t,x,y)).sort((a,b)=>a.area-b.area)[0];
  if(!hit)for(const [dx,dy] of [[tol,0],[-tol,0],[0,tol],[0,-tol],[tol*.7,tol*.7],[-tol*.7,tol*.7],[tol*.7,-tol*.7],[-tol*.7,-tol*.7]]){hit=open.find(t=>inside(t,x+dx,y+dy));if(hit)break;}
  if(!hit){const m=addFx('miss',x,y,28/s);setTimeout(()=>m.remove(),500);soft();return;}
  found.add(hit.id);save();if(hintEl){hintEl.remove();hintEl=null;}
  celebrateItem(hit);if(navigator.vibrate)try{navigator.vibrate(18);}catch{}
  const g=groups.find(g=>g.key===hit.group),l=left(g).length,done=found.size===ITEMS.length;
  chime(!l||done);setTimeout(renderTray,800);
  toast(done?'Everything found! ♥':l?`${hit.name} · ${l} more to find`:`${cheers[found.size%cheers.length]} ${g.name} ♥`);
  if(done)setTimeout(celebrate,1300);}
function celebrate(){const c=$('confetti');c.replaceChildren();
  for(let i=0;i<60;i++){const e=document.createElement('span');e.textContent=['♥','✿','★','●'][i%4];
    e.style.cssText=`left:${Math.random()*100}vw;color:${['#e8738a','#f5b83d','#6fa87a','#6f9fd8','#c96f4a'][i%5]};animation-delay:${Math.random()*1.2}s;font-size:${12+Math.random()*16}px;--dx:${(Math.random()-.5)*120}px`;c.append(e);}
  chime(true);setTimeout(()=>chime(true),420);$('complete').showModal();}

// ---------- input ----------
const pts=new Map();let pinch=null;
const pos=e=>{const r=board.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
board.addEventListener('pointerdown',e=>{if(e.target.closest('button,#map,#coach'))return;e.preventDefault();flight++;const p=pos(e);
  pts.set(e.pointerId,{...p,sx:p.x,sy:p.y,t:performance.now(),moved:false});try{board.setPointerCapture(e.pointerId);}catch{}
  if(pts.size===2){for(const q of pts.values())q.moved=true;const [a,b]=[...pts.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
  hideCoach();});
board.addEventListener('pointermove',e=>{const p=pts.get(e.pointerId);if(!p)return;e.preventDefault();const q=pos(e);
  if(Math.hypot(q.x-p.sx,q.y-p.sy)>9)p.moved=true;const dx=q.x-p.x,dy=q.y-p.y;p.x=q.x;p.y=q.y;
  if(pts.size>=2){const [a,b]=[...pts.values()],d=Math.hypot(a.x-b.x,a.y-b.y),cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;
    if(pinch){tx+=cx-pinch.x;ty+=cy-pinch.y;zoomAt(s*d/pinch.d,cx,cy);}pinch={d,x:cx,y:cy};}
  else if(p.moved){tx+=dx;ty+=dy;clampView();apply();}});
function up(e){const p=pts.get(e.pointerId);if(!p)return;pts.delete(e.pointerId);if(pts.size<2)pinch=null;
  if(e.type==='pointerup'&&!p.moved&&performance.now()-p.t<600)tap(p.x,p.y);}
board.addEventListener('pointerup',up);board.addEventListener('pointercancel',up);
board.addEventListener('wheel',e=>{e.preventDefault();const p=pos(e);zoomAt(s*Math.exp(-e.deltaY*.0022),p.x,p.y);},{passive:false});
board.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('gesturestart',e=>e.preventDefault());
$('plus').onclick=()=>animateTo(s*1.6,cw/2-(cw/2-tx)*1.6,ch/2-(ch/2-ty)*1.6,300);
$('minus').onclick=()=>animateTo(s/1.6,cw/2-(cw/2-tx)/1.6,ch/2-(ch/2-ty)/1.6,300);
$('map').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();const r=$('map').getBoundingClientRect();flyTo((e.clientX-r.left)/r.width*W,(e.clientY-r.top)/r.height*H,s);});
addEventListener('resize',()=>{if(!$('play').hidden)resize(false);});
addEventListener('blur',()=>{pts.clear();pinch=null;});

// ---------- screens ----------
function hideCoach(){if(!$('coach').hidden){$('coach').hidden=true;prefs.coached=true;savePrefs();}}
function homeCopy(){const n=found.size;$('progress-home').textContent=n?`${n} of ${ITEMS.length} found so far`:`${ITEMS.length} little things to find`;
  $('start').textContent=n===ITEMS.length?'Look at the finished picture':n?'Keep exploring':'Start exploring';$('reset').hidden=!n;}
const clearMarks=()=>{for(const t of ITEMS)t.node.classList.remove('gone','lift');};
function home(){$('play').hidden=true;$('home').hidden=false;homeCopy();}
function play(){$('home').hidden=true;$('play').hidden=false;renderTray();requestAnimationFrame(()=>{resize(true);if(!prefs.coached)$('coach').hidden=false;});}
$('start').onclick=()=>{chime(false);play();};
$('back').onclick=home;
$('reset').onclick=()=>{if(confirm('Start over? Your finds will be cleared.')){found.clear();save();clearMarks();homeCopy();}};
$('hint').onclick=()=>showHint(null);
$('coach-ok').onclick=hideCoach;
$('close-item').onclick=()=>$('item-dialog').close();
$('item-hint').onclick=()=>{$('item-dialog').close();showHint(chosen);};
$('again').onclick=()=>{$('complete').close();found.clear();save();clearMarks();renderTray();resize(true);};
$('admire').onclick=()=>{$('complete').close();animateTo(sFit,0,0);};
for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',e=>{if(e.target===d)d.close();});
function soundUI(){$('sound').classList.toggle('off',!prefs.sound);$('sound').setAttribute('aria-pressed',String(prefs.sound));}
$('sound').onclick=()=>{prefs.sound=!prefs.sound;savePrefs();soundUI();if(prefs.sound)chime(false);};
soundUI();
for(const id of ['lucky','teapot1','duck','calico','bun1','ferry']){const i=new Image();i.src=art(id);i.alt='';$('teaser').append(i);}
homeCopy();
const bg=$('bg');
const ready=()=>{$('loading').hidden=true;};
if(bg.complete&&bg.naturalWidth)ready();else bg.addEventListener('load',ready);
window.__lf={ITEMS,found,view:()=>({s,tx,ty,cw,ch}),tapScene:(x,y)=>tap(x*s+tx,y*s+ty)};
