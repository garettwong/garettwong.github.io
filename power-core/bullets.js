import {projectiles} from './contra.js';
export function drawProjectiles(ctx,nes,variants=true){
 for(const b of projectiles(nes)){
  const kind=variants?b.kind:0;
  if(b.hit){ctx.fillStyle='#fff3ab';ctx.fillRect(b.x,b.y,5,5);continue;}
  if(kind===2){const length=Math.hypot(b.vx,b.vy)||1;ctx.strokeStyle='#48eaff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.x+3,b.y+3);ctx.lineTo(b.x+3-b.vx/length*10,b.y+3-b.vy/length*10);ctx.stroke();ctx.strokeStyle='#e8ffff';ctx.lineWidth=1;ctx.stroke();}
  else if(kind===1){ctx.fillStyle='#ff5421';ctx.beginPath();ctx.arc(b.x+3,b.y+3,4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffd444';ctx.fillRect(b.x+2,b.y+1,3,4);ctx.fillStyle='#fff5bf';ctx.fillRect(b.x+3,b.y+2,1,2);}
  else{ctx.fillStyle='#ff2222';ctx.fillRect(b.x+1,b.y,4,2);ctx.fillRect(b.x,b.y+2,6,3);ctx.fillRect(b.x+1,b.y+5,4,2);ctx.fillStyle='#ffb455';ctx.fillRect(b.x+2,b.y+1,2,2);}
 }
}
