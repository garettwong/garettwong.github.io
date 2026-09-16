// Destructible blue/red bombs: base grenades, snow grenades, mortar shells and UFO bombs.
// Preserve native explosion/cleanup routines and leave power-up capsules unchanged.
export function hitBombs(nes){
 const m=nes.cpu.mem;if(m[0x18]!==5)return 0;let hits=0;
 for(let e=0;e<16;e++){
  const type=m[0x528+e],routine=m[0x4b8+e],level=m[0x30];
  // Stage-specific type numbers must not affect unrelated enemies in other stages.
  const death=type===0x0b&&routine>=2&&routine<=3?4:
   (level===1||level===3)&&type===0x12&&routine===2?4:
   level===4&&type===0x11&&routine===2?3:
   level===4&&type===0x16&&routine===1?2:0;
  if(!death||!m[0x30a+e])continue;
  const ex=m[0x33e+e],ey=m[0x324+e];
  for(let b=0;b<255;b++){
   if(!m[0x6200+b]||(!m[0x6000+b]&&!m[0x7df0])||m[0x6d00+b]!==1)continue;
   const x=m[0x6600+b]-4,y=m[0x6500+b]-7;
   const vx=(m[0x6a00+b]<<24>>24)+m[0x6800+b]/256,vy=(m[0x6900+b]<<24>>24)+m[0x6700+b]/256;
   // Bomb-sized ellipse, swept over the pellet's last movement to avoid tunnelling.
   const dx=(ex-(x-vx))/16,dy=(ey-(y-vy))/9,ax=vx/16,ay=vy/9,l=ax*ax+ay*ay;
   const t=l?Math.max(0,Math.min(1,(dx*ax+dy*ay)/l)):1;
   if((dx-ax*t)**2+(dy-ay*t)**2>1)continue;
   // A shot-down bomb uses the harmless destroyed-enemy explosion, not
   // the grenade ground-impact routine, which deliberately keeps blast damage.
   m[0x578+e]=0;m[0x598+e]|=0x81;m[0x528+e]=0x0b;m[0x4b8+e]=4;
   if(m[0x7500+b]!==2){m[0x6d00+b]=2;m[0x6b00+b]=6;}
   hits++;break;
  }
 }
 return hits;
}
export function attachBombCollisions(nes){const frame=nes.frame.bind(nes);nes.frame=()=>{hitBombs(nes);const result=frame();hitBombs(nes);return result;};}
