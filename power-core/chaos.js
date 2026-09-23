import {countR} from './r-progress.js';
export const CHAOS_DENSITIES={more:4,much:6,lots:8,crazy:10};
const CAPACITY=65536,TAU=Math.PI*2;
const MISSILE_COLORS={3:0xff268aff,8:0xffb3ff86,9:0xffffd780,10:0xff80cfff,11:0xfffff0b0,12:0xffffa8ed,13:0xff80cfff,14:0xff66ff33};
const pelletOffsets=[];for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(Math.abs(dx)+Math.abs(dy)<=3)pelletOffsets.push(dy*256+dx);
const spinCos=Float32Array.from({length:152},(_,i)=>Math.cos(i*.52)),spinSin=Float32Array.from({length:152},(_,i)=>Math.sin(i*.52));
// Own the full field in typed arrays. The native engine receives nearby shots
// for its real enemy damage routines; unselected shots continue to fly normally.
export function createChaos(nes,profile,density='more',directions=64){
 profile=['S','F','L','SFL','FRONT','FAN'].includes(profile)?profile:profile==='WAVE'?'S':'FRONT';
 directions=[16,32,64,128,256,512,1024,2048].includes(directions)?directions:64;
 density=Object.hasOwn(CHAOS_DENSITIES,density)?density:'more';
 const on=new Uint8Array(CAPACITY),kind=new Uint8Array(CAPACITY),owner=new Uint8Array(CAPACITY),age=new Uint16Array(CAPACITY);
 const dirCos=new Float32Array(CAPACITY),dirSin=new Float32Array(CAPACITY);
 const ox=new Float32Array(CAPACITY),oy=new Float32Array(CAPACITY),angle=new Float32Array(CAPACITY),x=new Float32Array(CAPACITY),y=new Float32Array(CAPACITY),px=new Float32Array(CAPACITY),py=new Float32Array(CAPACITY);
 const free=[],heads=new Int32Array(64),next=new Int32Array(CAPACITY),marked=new Uint32Array(CAPACITY),bridge=new Int32Array(255),phase=[1,1],pending=[0,0],held=[false,false];
 const forward=[];
 const targetX=new Float32Array(16),targetY=new Float32Array(16),targetGrid=new Int8Array(64);
 let frame=0,volley=0,stage=-1,cursor=0,active=0,emitted=0,blocked=0,look='pro';
 function clear(){on.fill(0);free.length=0;for(let i=CAPACITY-1;i>=0;i--)free.push(i);active=0;phase.fill(1);pending.fill(0);held.fill(false);bridge.fill(-1);}
 clear();
 function release(i){if(on[i]){on[i]=0;free.push(i);active--;}}
 function addShot(k,p,cx,cy,a){if(free.length<=(k===14?0:1024)){blocked++;return false;}const i=free.pop();on[i]=1;kind[i]=k;owner[i]=p;age[i]=0;angle[i]=a;dirCos[i]=Math.cos(a);dirSin[i]=Math.sin(a);ox[i]=x[i]=px[i]=cx;oy[i]=y[i]=py[i]=cy;active++;emitted++;return true;}
 function branch(i,k,count,spread){if(free.length<count-1)return;const cx=x[i],cy=y[i],a=angle[i],p=owner[i];release(i);for(let j=0;j<count;j++)addShot(k,p,cx,cy,k===6?j*TAU/count:a+(j-(count-1)/2)*spread);}
 function emit(p,m){
  const kinds=profile==='SFL'?[0,1,2]:[{S:0,F:1,L:2,COMET:3,WAVE:4,STAR:5,SWARM:8,SKYFALL:9,PACK:10,LANCE:11,HELIX:12,FRONT:8,FAN:8}[profile]??0],needed=directions*kinds.length;
  if(free.length<needed+1024){blocked++;return false;} // Never erase a live ring to admit another.
  const turn=volley++*.018;
  for(let d=0;d<directions;d++)for(const k of kinds){const i=free.pop();on[i]=1;kind[i]=k;owner[i]=p;age[i]=0;angle[i]=d*TAU/directions+turn;dirCos[i]=Math.cos(angle[i]);dirSin[i]=Math.sin(angle[i]);ox[i]=x[i]=px[i]=m[0x334+p];oy[i]=y[i]=py[i]=m[0x31a+p]-8;active++;emitted++;}
  return true;
 }
 function before(){
  const m=nes.cpu.mem;m[0x7df0]=1;bridge.fill(-1);
  for(let b=0;b<255;b++){m[0x6200+b]=0;m[0x6000+b]=0;m[0x6d00+b]=0;}
  if(m[0x18]!==5||m[0x1c]){if(active)clear();return;}
  if(stage!==m[0x30]){clear();stage=m[0x30];}frame++;
  heads.fill(-1);forward.length=0;
  const rates=[countR(m,0),countR(m,1)],speeds=rates.map(r=>4+Math.min(1.5,Math.log2(1+r)*.12));
  let targets=0;const level=m[0x30];
  for(let e=0;e<16;e++){
   const routine=m[0x4b8+e],type=m[0x528+e];
   const flame=level===5&&[16,17,18].includes(type)&&routine>=2&&routine<=4,claw=level===6&&type===16&&routine>=2&&routine<=4;
   const bomb=type===11&&routine>=2&&routine<=3||[1,3].includes(level)&&[17,18].includes(type)&&routine===2||level===4&&(type===17&&routine===2||type===22&&routine===1);
   if(!routine||!type||!(m[0x578+e]>0||flame||claw||bomb))continue;
   let tx=m[0x33e+e],ty=m[0x324+e];if(flame&&routine>=3){tx+=(m[0x5d8+e]<<24>>24)/2;ty+=Math.max(0,m[0x5e8+e]<<24>>24)/2;}if(claw)ty-=Math.min(8,m[0x5d8+e])*4;
   targetX[targets]=tx;targetY[targets++]=ty;
  }
  // Share nearest-target results across 32px cells instead of searching every enemy for every missile.
  targetGrid.fill(-1);for(let cell=0;cell<64;cell++){const cx=(cell%8)*32+16,cy=(cell>>>3)*32+16;let best=Infinity;for(let t=0;t<targets;t++){const dx=targetX[t]-cx,dy=targetY[t]-cy,d=dx*dx+dy*dy;if(d<best){best=d;targetGrid[cell]=t;}}}

  const scrollX=m[0x41]?0:m[0x68],scrollY=m[0x41]?m[0x68]:0,guidanceStep=directions>=2048?2:1;
  for(let i=0;i<CAPACITY;i++)if(on[i]){
   px[i]=x[i];py[i]=y[i];if(m[0x41])oy[i]+=m[0x68];else ox[i]-=m[0x68];
   const t=++age[i],speed=speeds[owner[i]];
   if(kind[i]===8){
    // Current homing mode: reuse heading between guidance ticks and bypass legacy weapon branches.
    if(t===1||targets&&t%guidanceStep===0){
     if(targets){
     const target=i%targets,desired=Math.atan2(targetY[target]-y[i],targetX[target]-x[i]);
     let delta=(desired-angle[i])%TAU;if(delta>Math.PI)delta-=TAU;else if(delta< -Math.PI)delta+=TAU;
     angle[i]+=Math.max(-.12*guidanceStep,Math.min(.12*guidanceStep,delta));}dirCos[i]=Math.cos(angle[i]);dirSin[i]=Math.sin(angle[i]);
    }
    x[i]+=dirCos[i]*speed-scrollX;y[i]+=dirSin[i]*speed+scrollY;
   }else if(kind[i]===3||kind[i]>=8&&kind[i]<=13){
    // Missiles turn gradually toward a live enemy; no lock-on to loose R pickups.
    const cell=Math.max(0,Math.min(7,y[i]>>5))*8+Math.max(0,Math.min(7,x[i]>>5));
    const target=kind[i]===8&&targets?i%targets:targetGrid[cell];
    const k=kind[i],rising=k===9&&t<13,guidanceStep=directions>=2048?2:1;
    if(t===1||t%guidanceStep===0){let desired=angle[i];
    if(rising)desired=-Math.PI/2;
    else if(target>=0){desired=Math.atan2(targetY[target]-y[i],targetX[target]-x[i]);if(k===12)desired+=Math.sin(t*.4+(i%2)*Math.PI)*.65;}
    if(rising||target>=0){let delta=(desired-angle[i])%TAU;if(delta>Math.PI)delta-=TAU;else if(delta< -Math.PI)delta+=TAU;const turn=k===9?.28:k===11?.075:k===12?.22:k===13?.20:.12;angle[i]+=Math.max(-turn*guidanceStep,Math.min(turn*guidanceStep,delta));}
    dirCos[i]=Math.cos(angle[i]);dirSin[i]=Math.sin(angle[i]);}
    const velocity=speed*(k===10?.72:k===11?1.55:k===13?1.25:1);
    x[i]+=dirCos[i]*velocity-(m[0x41]?0:m[0x68]);y[i]+=dirSin[i]*velocity+(m[0x41]?m[0x68]:0);
    if(k===9&&y[i]<8)y[i]=8;
    if(k===10&&(t>=24||t>=6&&target>=0&&Math.hypot(targetX[target]-x[i],targetY[target]-y[i])<28)){branch(i,13,3,.5);continue;}
   }else{
    const ca=dirCos[i],sa=dirSin[i],radius=kind[i]===1?Math.min(12,t*.9):kind[i]===2?Math.min(4,t*.4):0,spin=t*.52;
    const along=(kind[i]===4?3:kind[i]===6?2:speed)*t+radius*spinCos[Math.min(t,151)],side=radius*spinSin[Math.min(t,151)];
    x[i]=ox[i]+ca*along-sa*side;y[i]=oy[i]+sa*along+ca*side;
   }
   if(kind[i]===4&&t>=18){branch(i,6,12,0);continue;}
   if(kind[i]===5&&t===10){branch(i,7,3,.26);continue;}
   if(kind[i]===6&&t>16){release(i);continue;}
   if(x[i]<-16||x[i]>272||y[i]<-16||y[i]>256||t>150){release(i);continue;}
   if(x[i]>=0&&x[i]<252&&y[i]>=0&&y[i]<233){const cell=(y[i]>>>5)*8+(x[i]>>>5);next[i]=heads[cell];heads[cell]=i;if(kind[i]===14)forward.push(i);}
  }
  for(let p=0;p<2;p++){
   const down=nes.controllers[p+1].state[1]===0x41;
   if(down&&!held[p])pending[p]=Math.max(pending[p],2);held[p]=down;
   if(m[0x90+p]!==1){pending[p]=0;continue;}
   if(!down&&!pending[p]){phase[p]=1;continue;}
   if((profile==='FRONT'||profile==='FAN')&&down&&frame%3===0){const aim=m[0x40]?-Math.PI/2:([-Math.PI/2,-Math.PI/4,0,Math.PI/4,0,Math.PI,Math.PI*.75,Math.PI,-Math.PI*.75,-Math.PI/2,Math.PI/2][m[0xc2+p]]??(m[0xd8+p]&64?Math.PI:0));if(profile==='FAN'){if(free.length>=24)for(let lane=0;lane<24;lane++)addShot(14,p,m[0x334+p],m[0x31a+p]-8,aim-Math.PI/4+lane*Math.PI/46);}else if(free.length>=5)for(let lane=-2;lane<=2;lane++)addShot(14,p,m[0x334+p]-Math.sin(aim)*lane*2,m[0x31a+p]-8+Math.cos(aim)*lane*2,aim);}
   const base=CHAOS_DENSITIES[density],r=rates[p],rate=base*(1+.8*r/(r+4));
   let bursts=0;while(phase[p]>=1&&bursts++<2&&(down||pending[p])){phase[p]--;if(emit(p,m)&&pending[p])pending[p]--;}phase[p]=Math.min(3,phase[p]+rate/60);
  }
  let b=0;
  function map(i){if(b>=255||marked[i]===frame||!on[i]||x[i]<0||x[i]>=252||y[i]<0||y[i]>=233)return false;marked[i]=frame;bridge[b]=i;
   for(let a=0x6000;a<=0x7900;a+=256)m[a+b]=0;
   m[0x6200+b]=4;m[0x6000+b]=0;m[0x6d00+b]=1;m[0x6500+b]=Math.round(y[i]+7);m[0x6600+b]=Math.round(x[i]+4);m[0x6e00+b]=owner[i];m[0x7500+b]=kind[i]===11?2:kind[i]>2?0:kind[i];
   const vx=x[i]-px[i],vy=y[i]-py[i];m[0x6a00+b]=Math.floor(vx)&255;m[0x6800+b]=Math.round((vx-Math.floor(vx))*256)&255;m[0x6900+b]=Math.floor(vy)&255;m[0x6700+b]=Math.round((vy-Math.floor(vy))*256)&255;b++;return true;}
  for(const i of forward){if(b>=128)break;map(i);}
  // Prioritize bullets near every enemy, including long flame/claw hit areas.
  for(let e=0;e<16&&b<255;e++)if(m[0x4b8+e]&&m[0x528+e]!==0){
   const ex=m[0x33e+e],ey=m[0x324+e],type=m[0x528+e];let left=ex-24,right=ex+24,top=ey-32,bottom=ey+32,taken=0;
   if(m[0x30]===5&&[16,17,18].includes(type)){left=ex-12;right=ex+12;top=ey-12;bottom=ey+12;if(m[0x4b8+e]>=3){const dx=m[0x5d8+e]<<24>>24,dy=m[0x5e8+e]<<24>>24;left+=Math.min(0,dx);right+=Math.max(0,dx);bottom+=Math.max(0,dy);}}
   if(m[0x30]===6&&type===16){left=ex-12;right=ex+12;top=ey-12-Math.min(8,m[0x5d8+e])*8;bottom=ey+12;}
   for(let cy=Math.max(0,top>>5);cy<=Math.min(7,bottom>>5)&&taken<14;cy++)for(let cx=Math.max(0,left>>5);cx<=Math.min(7,right>>5)&&taken<14;cx++)for(let i=heads[cy*8+cx];i>=0&&taken<14;i=next[i])if(x[i]>=left&&x[i]<=right&&y[i]>=top&&y[i]<=bottom&&map(i))taken++;
  }
  for(let scanned=0;scanned<CAPACITY&&b<255;scanned++){cursor=(cursor+1)%CAPACITY;map(cursor);}
 }
 function after(){const m=nes.cpu.mem;for(let b=0;b<255;b++){const i=bridge[b];if(i>=0&&on[i]&&m[0x6d00+b]===2&&m[0x6b00+b]>0&&m[0x6b00+b]<=6)nes.onPowerHit?.(owner[i]);if(i>=0&&on[i]&&kind[i]!==2&&kind[i]!==11&&(m[0x6d00+b]!==1||!m[0x6200+b])){if(kind[i]===10)branch(i,13,3,.5);else if(kind[i]===4)branch(i,6,12,0);else release(i);}}}
 // Rasterize into the native 256x240 frame: one canvas upload, even with
 // thousands of pellets. No thousands of drawImage calls on the phone.
 function render(image){const pixels=new Uint32Array(image.data.buffer,image.data.byteOffset,256*240);const dot=(xx,yy,c)=>{if(xx>=0&&xx<256&&yy>=0&&yy<240)pixels[yy*256+xx]=c;};const lite=active>2500;let fx=0,fy=0,ca=1,sa=0;const P=(al,sd,c)=>{const X=Math.round(fx+ca*al-sa*sd),Y=Math.round(fy+sa*al+ca*sd);if(X>=0&&X<256&&Y>=0&&Y<240)pixels[Y*256+X]=c;};const B=(al,sd,c,a)=>{const X=Math.round(fx+ca*al-sa*sd),Y=Math.round(fy+sa*al+ca*sd);if(X<0||X>=256||Y<0||Y>=240)return;const j=Y*256+X,d=pixels[j],b=1-a;pixels[j]=0xff000000|((((d>>>16)&255)*b+((c>>>16)&255)*a)<<16)|((((d>>>8)&255)*b+((c>>>8)&255)*a)<<8)|(((d&255)*b+(c&255)*a)|0);};const proShot=i=>{fx=x[i];fy=y[i];ca=dirCos[i];sa=dirSin[i];const k=kind[i],f=(frame+i)&3,fl=f<2;if(k===14){if(!lite){for(let al=-6;al<=-3;al+=.5){const a=.12+(al+6)*.1;B(al,0,0xff46e85a,a);B(al,1,0xff46e85a,a*.7);}}for(let al=-2.5;al<=0;al+=.5){P(al,0,0xff6eff3c);P(al,1,0xff3cc84a);}P(.5,0,0xffd2ffdc);P(.5,1,0xffa0ffb4);P(1,0,0xffffffff);P(1,1,0xffffffff);P(1.5,0,0xffffffff);return;}const band=MISSILE_COLORS[k]||0xff3228e6;if(lite){for(let al=-1;al<=2;al+=.5)P(al,0,al>=2?0xffffffff:al>=1?band:0xffebe2dc);P(-1.5,0,fl?0xff96f0ff:0xff1e8cff);return;}for(let al=-10;al<=-6;al+=1)B(al,.5+Math.sin((frame+i)*.5+al)*.7,0xffb9b4b4,.08*(al+11));const flame=fl?-5.5:-4.5;for(let al=flame;al<=-3;al+=.5){const c=al>-3.6?0xffdcfaff:al>-4.6?0xff96f0ff:0xff1e8cff;P(al,0,c);P(al,1,al>-4?0xff64d2ff:0xff143ce6);}for(let al=-3;al<=-2;al+=.5){P(al,-1,0xff2a20c8);P(al,2,0xff2a20c8);}for(let al=-2.5;al<=2.5;al+=.5){const top=al>=1&&al<1.9?band:0xfff0ece8,bot=al>=1&&al<1.9?band:0xff9c8e84;P(al,0,top);P(al,1,bot);}P(3,0,0xffffffff);P(3,1,0xffd8d0c8);P(3.5,.5,0xffffffff);};
  for(let i=0;i<CAPACITY;i++)if(on[i]){const xx=Math.round(x[i]),yy=Math.round(y[i]),center=yy*256+xx,inside=xx>=8&&xx<248&&yy>=8&&yy<232;if(kind[i]===2){const ca=dirCos[i],sa=dirSin[i];for(let j=0;j<7;j++){const lx=Math.round(xx-ca*j),ly=Math.round(yy-sa*j);const c=(frame%8<4)?0xffffffff:0xffffd9ab;if(inside){pixels[ly*256+lx]=c;pixels[ly*256+lx+1]=c;}else{dot(lx,ly,c);dot(lx+1,ly,c);}}}
   else if(kind[i]===3||kind[i]>=8){if(look==='pro')proShot(i);else{const color=MISSILE_COLORS[kind[i]];if(xx>=0&&xx<256&&yy>=0&&yy<240)pixels[center]=color;}}
   else if(kind[i]===4||kind[i]===6){const r=kind[i]===4?3:2;for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(dx*dx+dy*dy<=r*r)dot(xx+dx,yy+dy,(Math.abs(dx)+Math.abs(dy)<2)?0xffbaffff:(frame%4<2?0xff126aff:0xff24bfff));if(kind[i]===4){dot(xx,yy-4,0xffeeeeee);dot(xx+1,yy-5,0xff24bfff);}}
   else if(kind[i]===5||kind[i]===7){const c=kind[i]===5?0xfff5b5ff:0xffffed99;for(let j=0;j<5;j++)dot(Math.round(xx-Math.cos(angle[i])*j),Math.round(yy-Math.sin(angle[i])*j),j===0?0xffffffff:c);}
   else{const c=kind[i]===1?0xffffffff:0xff3030ff;if(inside){for(let j=0;j<pelletOffsets.length;j++)pixels[center+pelletOffsets[j]]=c;pixels[center]=kind[i]===1?0xffffffff:0xffadf4ff;pixels[center-256]=kind[i]===1?0xffffeeee:0xff38cfff;}else{for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(Math.abs(dx)+Math.abs(dy)<=3)dot(xx+dx,yy+dy,c);dot(xx,yy,kind[i]===1?0xffffffff:0xffadf4ff);dot(xx,yy-1,kind[i]===1?0xffffeeee:0xff38cfff);}}}
 }
 function save(){const items=[];for(let i=0;i<CAPACITY;i++)if(on[i])items.push([kind[i],owner[i],age[i],ox[i],oy[i],angle[i],x[i],y[i],px[i],py[i]]);return {version:1,profile,directions,density,frame,volley,stage,items};}
 function load(v){clear();if(v?.version!==1)return;if(typeof v.profile==='string')profile=['S','F','L','SFL','FRONT','FAN'].includes(v.profile)?v.profile:v.profile==='WAVE'?'S':'FRONT';directions=[16,32,64,128,256,512,1024,2048].includes(v.directions)?v.directions:64;density=Object.hasOwn(CHAOS_DENSITIES,v.density)?v.density:density;frame=Number.isInteger(v.frame)?v.frame:0;volley=v.volley||0;stage=v.stage;marked.fill(0);for(const row of (v.items||[]).slice(0,CAPACITY)){if(row.length!==10||!row.every(Number.isFinite)||row[0]<0||row[0]>14||row[1]<0||row[1]>1||row[0]===4||row[0]===6)continue;const i=free.pop();[kind[i],owner[i],age[i],ox[i],oy[i],angle[i],x[i],y[i],px[i],py[i]]=row;dirCos[i]=Math.cos(angle[i]);dirSin[i]=Math.sin(angle[i]);on[i]=1;active++;}}
 return {configure(v){if(v.look==='pro'||v.look==='classic')look=v.look;if(Object.hasOwn(CHAOS_DENSITIES,v.density))density=v.density;if(['S','F','L','SFL','FRONT','FAN'].includes(v.style))profile=v.style;if([16,32,64,128,256,512,1024,2048].includes(v.angles))directions=v.angles;},get options(){return {style:profile,angles:directions,look};},before,after,render,save,load,get stats(){return {active,emitted,blocked,capacity:CAPACITY,density};},get bullets(){const r=[];for(let i=0;i<CAPACITY;i++)if(on[i])r.push({x:x[i],y:y[i],kind:kind[i],age:age[i],angle:angle[i]});return r;}};
}
