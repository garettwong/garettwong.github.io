const circle=Array.from(new Set(Array.from({length:160},(_,j)=>Math.round(Math.cos(j*Math.PI/80)*19)+','+Math.round(Math.sin(j*Math.PI/80)*19)))).map(p=>p.split(',').map(Number));
// Three seconds of active playing time at every speed; pausing freezes the countdown.
export function createShield(nes,enabled=false){
 let on=!!enabled;const left=[0,0],owned=[false,false];
 function clear(p){const m=nes.cpu.mem;if(owned[p]&&m[0xb0+p]<=2)m[0xb0+p]=0;left[p]=0;owned[p]=false;}
 nes.onPowerHit=p=>{if(!on||p<0||p>1||nes.cpu.mem[0x90+p]!==1)return;left[p]=180;nes.cpu.mem[0xb0+p]=Math.max(2,nes.cpu.mem[0xb0+p]);owned[p]=true;};
 return {configure(v){on=!!v;if(!on)for(let p=0;p<2;p++)clear(p);},before(speed=1){const m=nes.cpu.mem;for(let p=0;p<2;p++){if(m[0x18]!==5||m[0x1c]||m[0x90+p]!==1){clear(p);continue;}if(left[p]>0){left[p]=Math.max(0,left[p]-1/speed);if(left[p]>0){m[0xb0+p]=Math.max(2,m[0xb0+p]);owned[p]=true;}else clear(p);}}},save:()=>({enabled:on,left:[...left],owned:[...owned]}),load(v){on=!!v?.enabled;for(let p=0;p<2;p++){left[p]=on?Math.max(0,Math.min(180,Number(v?.left?.[p])||0)):0;owned[p]=!!v?.owned?.[p];if(!on)clear(p);}},get enabled(){return on;},get remaining(){return [...left];},draw(ctx){for(let p=0;p<2;p++)if(left[p]>0){const m=nes.cpu.mem;ctx.fillStyle='#9cecff';for(const [dx,dy] of circle)ctx.fillRect(m[0x334+p]+dx,m[0x31a+p]-8+dy,1,1);}}};
}
