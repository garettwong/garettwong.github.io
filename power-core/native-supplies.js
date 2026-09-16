// Native enemy slots, graphics, damage, explosions and winged R collection.
// Keep four free slots for the stage's own enemies and bullets.
export const DENSITIES={more:{interval:360,cap:2},much:{interval:180,cap:4},lots:{interval:75,cap:6},crazy:{interval:40,cap:8}};
const properties={0:[0x82,0x22,1],2:[0x0f,0x32,0xf0],3:[0x0b,0x32,1],7:[0x8f,0x30,8]};
export const rCount=m=>m[0x7e6]+256*m[0x7e8]+65536*m[0x7ea];
export function spawnNative(m,type,x,y,slot){
 if(m[0x4b8+slot]||!properties[type])return false;
 for(let a=0x4b8;a<=0x5e8;a+=16)m[a+slot]=0;
 m[0x30a+slot]=1;m[0x358+slot]=0;m[0x528+slot]=type;m[0x33e+slot]=Math.round(x)&255;m[0x324+slot]=Math.round(y)&255;
 const [width,collision,hp]=properties[type];m[0x598+slot]=width;m[0x588+slot]=collision;m[0x578+slot]=hp;
 m[0x5a8+slot]=0; // Native weapon type zero = winged R.
 m[0x4b8+slot]=1;return true;
}
export function bgCollision(m,x,y){
 if(y<0||y>=224||x<0||x>=256)return 0;
 const yy=(y+m[0xfc])%240,xx=(x+m[0xfd])&255,nt=(m[0xff]&1)^((x+m[0xfd])>255?1:0);
 const index=((yy>>>2)&0x3c)|(xx>>>6)|(nt<<6),shift=6-2*((xx>>>4)&3);
 return [0,1,2,128][(m[0x680+index]>>>shift)&3];
}
export function createSupplies(nes,density='more',seed=Date.now()){
 let state={version:2,density:Object.hasOwn(DENSITIES,density)?density:'more',seed:seed>>>0,frame:0,stage:-1,tracked:[],used:[],pending:[]};
 const random=()=>{state.seed=(Math.imul(state.seed,1664525)+1013904223)>>>0;return state.seed/4294967296;};
 const freeSlots=m=>Array.from({length:16},(_,i)=>15-i).filter(i=>!m[0x4b8+i]);
 function wallPosition(m){
  const candidates=[];
  // Do not replace base/boss walls. Flying capsules work in those stages.
  if(![0,2,4,5,6].includes(m[0x30])||m[0x64]>=m[0x58])return null;
  for(let y=44-(m[0xfc]%32);y<204;y+=32)for(let x=108-(m[0xfd]%32);x<236;x+=32){
   if(y<44||Math.hypot(x-m[0x334],y-m[0x31a])<44)continue;
   const solid=[-8,8].every(dx=>[-8,8].every(dy=>bgCollision(m,x+dx,y+dy)===128));
   // Contra's cliff faces are visually rock but pass-through, under a one-way
   // ledge. Mount below the ledge, never across the walking surface or water.
   const belowLedge=[-8,8].every(dx=>bgCollision(m,x+dx,y-28)===1&&[-8,8].every(dy=>bgCollision(m,x+dx,y+dy)===0));
   if(!solid&&!belowLedge)continue;
   if(Array.from({length:16},(_,e)=>e).some(e=>m[0x4b8+e]&&Math.abs(m[0x33e+e]-x)<36&&Math.abs(m[0x324+e]-y)<36))continue;
   const key=`${m[0x64]}:${((x+m[0xfd])>>>5)}:${((y+m[0xfc])%240)>>>5}`;
   if(!state.used.includes(key))candidates.push({x,y,key});
  }
  return candidates.length?candidates[Math.floor(random()*candidates.length)]:null;
 }
 function update(){
  const m=nes.cpu.mem;if(m[0x18]!==5||m[0x1c]||m[0x90]!==1)return;
  if(state.stage!==m[0x30]){state.stage=m[0x30];state.tracked=[];state.pending=[];state.used=[];state.frame=0;}
  // Boxes and capsules convert their own slot to an R item. Turrets retain
  // their normal explosion; only confirmed destruction earns a reward.
  state.tracked=state.tracked.filter(t=>{
   const routine=m[0x4b8+t.slot],type=m[0x528+t.slot];if(!routine)return false;
   if(t.type===7&&type===7&&routine>=6&&!t.rewarded&&m[0x578+t.slot]===0){state.pending.push({x:m[0x33e+t.slot],y:m[0x324+t.slot]});t.rewarded=true;}
   return type===t.type||((t.type===2||t.type===3)&&type===0);
  });
  for(const r of state.pending){if(m[0x41])r.y+=m[0x68];else r.x-=m[0x68];}
  state.pending=state.pending.filter(r=>r.x>=8&&r.x<248&&r.y>=8&&r.y<224);
  let free=freeSlots(m);
  if(state.pending.length&&free.length>2){const r=state.pending.shift(),slot=free.shift();spawnNative(m,0,r.x,r.y,slot);state.tracked.push({slot,type:0});}
  const cfg=DENSITIES[state.density];if(state.frame++%cfg.interval||state.tracked.length>=cfg.cap||free.length<=4)return;
  const pos=wallPosition(m),useWall=pos&&random()<.7;let type,x,y;
  if(useWall){({x,y}=pos);type=2;state.used.push(pos.key);state.used=state.used.slice(-160);}
  else{type=3;x=48+Math.floor(random()*160);y=40+Math.floor(random()*100);}
  const slot=free[0];if(spawnNative(m,type,x,y,slot))state.tracked.push({slot,type});
 }
 return {update,draw(){},save:()=>JSON.parse(JSON.stringify(state)),load(value){
  // Discard old overlay items when resuming a v1 save; keep native game state.
  if(value?.version===2&&Object.hasOwn(DENSITIES,value.density)&&Array.isArray(value.tracked))state={...value,tracked:value.tracked.filter(t=>Number.isInteger(t.slot)&&t.slot>=0&&t.slot<16&&properties[t.type]).slice(0,12),pending:(value.pending||[]).slice(0,6),used:(value.used||[]).slice(-160)};
  else state={...state,density:Object.hasOwn(DENSITIES,value?.density)?value.density:state.density,frame:0,stage:-1,tracked:[],pending:[],used:[]};
 },get density(){return state.density;}};
}
