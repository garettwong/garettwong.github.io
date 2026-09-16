// Use native retraction to erase background tiles before releasing the slot.
// Stage-specific IDs must never affect bosses that reuse them elsewhere.
export function createHazards(nes){
 let dying=[];
 const target=(m,e)=>m[0x30]===5&&[16,17,18].includes(m[0x528+e])||m[0x30]===6&&m[0x528+e]===16;
 function explode(m,e){
  let cleanup=null;
  if(m[0x30]===6){const x=m[0x33e+e]+m[0xfd],y=(m[0x324+e]+m[0xfc])%240,nt=(m[0xff]&1)^(x>255?1:0),a=0x2000+nt*1024+(y>>>3)*32+((x&255)>>>3);cleanup={slot:e,type:16,level:6,tiles:[a,a+1,a+32,a+33,a+64,a+65],wait:3};}
  m[0x528+e]=11;m[0x4b8+e]=4;m[0x578+e]=0;m[0x598+e]=0x83;m[0x30a+e]=1;m[0x538+e]=0;return cleanup;
 }
 function before(){const m=nes.cpu.mem;dying=dying.filter(t=>m[0x30]===t.level&&(t.tiles||m[0x528+t.slot]===t.type&&m[0x4b8+t.slot]));for(const t of dying)if(!t.tiles){m[0x598+t.slot]|=0x81;m[0x538+t.slot]=0;}}
 function update(){
  const m=nes.cpu.mem;if(m[0x18]!==5||m[0x1c])return 0;let hits=0;
  dying=dying.flatMap(t=>{const e=t.slot;if(m[0x30]!==t.level)return [];if(t.tiles){if(--t.wait>0)return [t];for(const a of t.tiles){if(a>=0x2000&&a<0x3000&&(a&1023)<960&&[0xce,0xcf,0xde,0xdf,0xee,0xef].includes(nes.ppu.vramMem[nes.ppu.vramMirrorTable[a]]))nes.ppu.mirroredWrite(a,0);}return [];}if(m[0x528+e]!==t.type||!m[0x4b8+e])return [];if(m[0x4b8+e]===2){const c=explode(m,e);return c?[c]:[];}return [t];});
  for(let e=0;e<16;e++){
   const routine=m[0x4b8+e],type=m[0x528+e];if(!target(m,e)||routine<2||routine>4||dying.some(t=>t.slot===e))continue;
   const x=m[0x33e+e],y=m[0x324+e];let left=x-12,right=x+12,top=y-12,bottom=y+12;
   if(m[0x30]===5&&routine>=3){const dx=m[0x5d8+e]<<24>>24,dy=m[0x5e8+e]<<24>>24;left+=Math.min(0,dx);right+=Math.max(0,dx);bottom+=Math.max(0,dy);}
   if(m[0x30]===6)top-=Math.min(8,m[0x5d8+e])*8;
   for(let b=0;b<255;b++){
    if(!m[0x6200+b]||!m[0x6000+b]||m[0x6d00+b]!==1)continue;
    const bx=m[0x6600+b]-4,by=m[0x6500+b]-7,vx=(m[0x6a00+b]<<24>>24)+m[0x6800+b]/256,vy=(m[0x6900+b]<<24>>24)+m[0x6700+b]/256;
    // Swept segment versus the visible hazard rectangle; fast lasers cannot tunnel.
    let lo=0,hi=1;for(const [a,v,min,max] of [[bx-vx,vx,left,right],[by-vy,vy,top,bottom]]){if(!v){if(a<min||a>max)hi=-1;}else{const p=(min-a)/v,q=(max-a)/v;lo=Math.max(lo,Math.min(p,q));hi=Math.min(hi,Math.max(p,q));}}
    if(lo>hi)continue;
    m[0x578+e]=0;m[0x598+e]|=0x81;
    if(routine===2){const c=explode(m,e);if(c)dying.push(c);}
    else{if(m[0x30]===6)m[0x5e8+e]|=1;m[0x4b8+e]=4;m[0x538+e]=0;dying.push({slot:e,type,level:m[0x30]});}
    if(m[0x7500+b]!==2){m[0x6d00+b]=2;m[0x6b00+b]=6;}hits++;break;
   }
  }return hits;
 }
 return {before,update,save:()=>dying.map(t=>({...t})),load(v){dying=Array.isArray(v)?v.filter(t=>Number.isInteger(t.slot)&&t.slot>=0&&t.slot<16&&((t.level===5&&[16,17,18].includes(t.type))||(t.level===6&&t.type===16))).slice(0,16):[];}};
}
