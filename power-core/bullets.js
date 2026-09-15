import {projectiles} from './contra.js';
let pelletSheet;
function sheet(){
 if(pelletSheet)return pelletSheet;
 const c=typeof OffscreenCanvas==='function'?new OffscreenCanvas(20,10):globalThis.document?.createElement('canvas');
 if(!c||!c.getContext)return null;c.width=20;c.height=10;const p=c.getContext('2d');
 p.fillStyle='#ff2222';p.fillRect(1,0,4,2);p.fillRect(0,2,6,3);p.fillRect(1,5,4,2);p.fillStyle='#ffb455';p.fillRect(2,1,2,2);
 p.fillStyle='#ff5421';p.beginPath();p.arc(14,4,4,0,Math.PI*2);p.fill();p.fillStyle='#ffd444';p.fillRect(13,2,3,4);p.fillStyle='#fff5bf';p.fillRect(14,3,1,2);
 return pelletSheet=c;
}
export function drawProjectiles(ctx,nes,variants=true){
 for(const b of projectiles(nes)){
  const kind=variants?b.kind:0;
  if(b.hit){ctx.fillStyle='#fff3ab';ctx.fillRect(b.x,b.y,5,5);continue;}
  if(kind===2){const length=Math.hypot(b.vx,b.vy)||1;ctx.strokeStyle='#48eaff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.x+3,b.y+3);ctx.lineTo(b.x+3-b.vx/length*10,b.y+3-b.vy/length*10);ctx.stroke();ctx.strokeStyle='#e8ffff';ctx.lineWidth=1;ctx.stroke();}
  else if(ctx.drawImage&&sheet()){if(kind===1)ctx.drawImage(pelletSheet,10,0,9,9,b.x-1,b.y-1,9,9);else ctx.drawImage(pelletSheet,0,0,7,8,b.x,b.y,7,8);}
  else if(kind===1){ctx.fillStyle='#ff5421';ctx.beginPath();ctx.arc(b.x+3,b.y+3,4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffd444';ctx.fillRect(b.x+2,b.y+1,3,4);ctx.fillStyle='#fff5bf';ctx.fillRect(b.x+3,b.y+2,1,2);}
  else{ctx.fillStyle='#ff2222';ctx.fillRect(b.x+1,b.y,4,2);ctx.fillRect(b.x,b.y+2,6,3);ctx.fillRect(b.x+1,b.y+5,4,2);ctx.fillStyle='#ffb455';ctx.fillRect(b.x+2,b.y+1,2,2);}
 }
}
