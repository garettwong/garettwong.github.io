export const MAX_R=99999;
export const countR=(m,p=0)=>m[0x7e6+p]+256*m[0x7e8+p]+65536*m[0x7ea+p];
export function clampR(m){for(let p=0;p<2;p++)if(countR(m,p)>MAX_R){m[0x7e6+p]=MAX_R&255;m[0x7e8+p]=(MAX_R>>>8)&255;m[0x7ea+p]=MAX_R>>>16;}}
// Fractional cadence avoids the old 10 / 100 / 1000 thresholds. Every pickup
// raises the requested rate, approaching one volley per frame at high counts.
export const volleysPerSecond=r=>60-48/(1+Math.min(MAX_R,Math.max(0,r))*.25);
export function attachRProgress(nes){
 const frame=nes.frame.bind(nes),phase=[1,1];
 nes.frame=()=>{
  const m=nes.cpu.mem;clampR(m);
  if(m[0x18]===5&&!m[0x1c])for(let p=0;p<2;p++){
   const held=nes.controllers[p+1].state[1]===0x41;
   if(m[0x90+p]!==1||(!held&&!m[0x7a02+p])){phase[p]=1;continue;}
   phase[p]=Math.min(2,phase[p]+volleysPerSecond(countR(m,p))/60);
   const ready=phase[p]>=1;if(ready)phase[p]-=1;
   m[0x7a00+p]=ready?0:1;
  }
  const result=frame();clampR(nes.cpu.mem);return result;
 };
 return {reset(){phase[0]=phase[1]=1;clampR(nes.cpu.mem);}};
}
export function drawRIndicator(ctx,m){
 if(m[0x18]!==5||m[0x1c])return;
 ctx.fillStyle='rgba(5,9,16,.75)';ctx.fillRect(3,229,65,10);
 ctx.font='8px monospace';ctx.textBaseline='top';ctx.fillStyle='#f4dd77';
 ctx.fillText('R '+Math.min(MAX_R,countR(m)).toLocaleString('en-US'),6,230);
}
