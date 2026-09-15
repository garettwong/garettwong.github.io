// Extra supply objects live outside the NES's scarce enemy/projectile slots.
export const DENSITIES={more:{interval:90,batch:2,cap:16},much:{interval:45,batch:3,cap:28},lots:{interval:24,batch:5,cap:40}};
export const rCount=m=>m[0x7e6]+256*m[0x7e8]+65536*m[0x7ea];
export function addR(m){const n=Math.min(0xffffff,rCount(m)+1);m[0x7e6]=n&255;m[0x7e8]=(n>>>8)&255;m[0x7ea]=(n>>>16)&255;m[0xaa]=0x13;}
export function createSupplies(nes,density='more',seed=Date.now()){
 let state={density:Object.hasOwn(DENSITIES,density)?density:'more',seed:seed>>>0,frame:0,stage:-1,items:[]};
 const random=()=>{state.seed=(Math.imul(state.seed,1664525)+1013904223)>>>0;return state.seed/4294967296;};
 function update(){
  const m=nes.cpu.mem;if(m[0x18]!==5||m[0x1c]||m[0x90]!==1)return;
  if(state.stage!==m[0x30]){state.stage=m[0x30];state.items=[];state.frame=0;}
  const cfg=DENSITIES[state.density],px=m[0x334],py=m[0x31a]-10;
  if(state.frame++%cfg.interval===0)for(let j=0;j<cfg.batch&&state.items.length<cfg.cap;j++){
   state.items.push({x:Math.max(16,Math.min(240,px+(random()-.3)*190)),y:Math.max(45,Math.min(212,py+(random()-.5)*90)),kind:Math.floor(random()*4),age:0});
  }
  for(let i=state.items.length-1;i>=0;i--){const s=state.items[i];s.age++;
   if(m[0x41]===1)s.y+=m[0x68];else if(m[0x41]===0)s.x-=m[0x68];
   if(s.kind===1)s.x-=.35;
   if(s.kind){for(let b=0;b<255;b++){
    if(!m[0x6200+b]||m[0x6d00+b]!==1)continue;
    const x=m[0x6600+b]-1,y=m[0x6500+b]-4,vx=(m[0x6a00+b]<<24>>24)+m[0x6800+b]/256,vy=(m[0x6900+b]<<24>>24)+m[0x6700+b]/256;
    const dx=x-s.x,dy=y-s.y,l=vx*vx+vy*vy,t=l?Math.max(0,Math.min(1,(dx*vx+dy*vy)/l)):0;
    if((dx-vx*t)**2+(dy-vy*t)**2<169){s.kind=0;break;}
   }}
   if(!s.kind){const dx=px-s.x,dy=py-s.y,d=Math.hypot(dx,dy);if(d<18){addR(m);state.items.splice(i,1);continue;}if(d<85){s.x+=dx/d*2.8;s.y+=dy/d*2.8;}}
   if(s.age>900||s.x< -16||s.y>252){state.items.splice(i,1);}
  }
 }
 function draw(ctx){if(nes.cpu.mem[0x18]!==5||nes.cpu.mem[0x1c])return;ctx.font='bold 8px monospace';ctx.textAlign='center';
  for(const s of state.items){const x=Math.round(s.x),y=Math.round(s.y);ctx.fillStyle=s.kind?'#2f506c':'#ff433e';ctx.fillRect(x-7,y-6,14,12);ctx.strokeStyle=s.kind?'#a9dfff':'#ffe36e';ctx.lineWidth=1;ctx.strokeRect(x-7,y-6,14,12);
   if(s.kind===1){ctx.fillStyle='#b7e7ff';ctx.fillRect(x-12,y-2,5,4);ctx.fillRect(x+7,y-2,5,4);}if(s.kind===2){ctx.fillStyle='#b7e7ff';ctx.fillRect(x-2,y-12,4,6);}if(s.kind===3){ctx.fillStyle='#b7e7ff';ctx.fillRect(x-6,y-5,2,2);ctx.fillRect(x+4,y+3,2,2);}ctx.fillStyle='#fff';ctx.fillText('R',x,y+3);
  }ctx.textAlign='start';
 }
 return {update,draw,save:()=>JSON.parse(JSON.stringify(state)),load(value){if(value&&Object.hasOwn(DENSITIES,value.density)&&Array.isArray(value.items)){state={...value,items:value.items.slice(0,40).filter(s=>Number.isFinite(s.x)&&Number.isFinite(s.y)&&Number.isInteger(s.kind)&&s.kind>=0&&s.kind<=3)};}else state={...state,items:[],frame:0,stage:-1};},get density(){return state.density;}};
}
