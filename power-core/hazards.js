// Extra collision for formerly invulnerable airborne hazards. ROM bytes and save IDs stay unchanged.
// Enemy type $11 is a moving flame in stage 3 and a snow grenade in stage 5.
export function destroyHitHazards(nes){
 const m=nes.cpu.mem,level=m[0x30];
 if(m[0x18]!==5||![2,4].includes(level))return 0;
 let destroyed=0;
 for(let e=0;e<16;e++){
  if(m[0x528+e]!==0x11||m[0x4b8+e]!==2||!m[0x30a+e])continue;
  const ex=m[0x33e+e],ey=m[0x324+e],radius=level===4?11:14;
  for(let b=0;b<255;b++){
   if(!m[0x6200+b]||!m[0x6000+b]||m[0x6d00+b]!==1)continue;
   const x=m[0x6600+b],y=m[0x6500+b];
   const vx=(m[0x6a00+b]<<24>>24)+m[0x6800+b]/256,vy=(m[0x6900+b]<<24>>24)+m[0x6700+b]/256;
   // Swept segment avoids missing small hazards between consecutive positions.
   const dx=ex-(x-vx),dy=ey-(y-vy),length=vx*vx+vy*vy,t=length?Math.max(0,Math.min(1,(dx*vx+dy*vy)/length)):1;
   if(Math.hypot(dx-vx*t,dy-vy*t)>radius)continue;
   m[0x578+e]=0;
   if(level===4)m[0x4b8+e]=3; // Existing grenade explosion -> cleanup routines.
   else{m[0x4b8+e]=0;m[0x30a+e]=0;} // Flame has no native death routine.
   if(m[0x7500+b]!==2){m[0x6d00+b]=2;m[0x6000+b]=0x47;}
   destroyed++;break;
  }
 }
 return destroyed;
}
export function attachHazardCollisions(nes){const frame=nes.frame.bind(nes);nes.frame=()=>{const result=frame();destroyHitHazards(nes);return result;};}
