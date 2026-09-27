/* Shared renderer used by the live game and recorded-frame QA exports. */
(function(global){
 function sprite(out,asset,r,width,height){
  const[x,y,w,h]=r.region;
  if(r.cutin){out.save();out.beginPath();out.rect(x/256*width,y/240*height,w/256*width,h/240*height);out.clip();const g=out.createLinearGradient(0,y/240*height,0,(y+h)/240*height);g.addColorStop(0,'#15180d');g.addColorStop(.5,'#8b8540');g.addColorStop(1,'#171b12');out.fillStyle=g;out.fillRect(x/256*width,y/240*height,w/256*width,h/240*height);for(let i=0;i<12;i++){out.fillStyle=i%3?'#dad8b077':'#ffffffaa';out.fillRect(((i*37)%90)/256*width,(y+2+i*2.4)/240*height,(150+i*8)/256*width,.35/240*height);}const [faceX,faceW]=r.cutin;out.drawImage(asset,asset.width*.1,asset.height*.32,asset.width*.8,asset.height*.533,faceX/256*width,y/240*height,faceW/256*width,h/240*height);out.restore();return;}
  if(r.badge){out.save();out.fillStyle='#e9cf94';out.fillRect(x/256*width,y/240*height,w/256*width,h/240*height);out.drawImage(asset,(x+1)/256*width,(y+1)/240*height,(w-2)/256*width,(h-2)/240*height);out.restore();return;}
  if(!r.motion){const [px,py,pw,ph]=r.paintRegion||r.region;if(r.holes){out.save();out.beginPath();out.rect(px/256*width,py/240*height,pw/256*width,ph/240*height);for(const [hx,hy,hw,hh] of r.holes)out.rect(hx/256*width,hy/240*height,hw/256*width,hh/240*height);out.clip('evenodd');}out.drawImage(asset,px/256*width,py/240*height,pw/256*width,ph/240*height);if(r.holes)out.restore();return;}
  const[dx,dy,bw,bh]=r.renderRegion||[0,0,w,h],left=Math.floor(x/256*width),top=Math.floor(y/240*height),right=Math.ceil((x+w)/256*width),bottom=Math.ceil((y+h)/240*height);out.save();out.beginPath();out.rect(left,top,right-left,bottom-top);out.clip();out.fillStyle='#000';out.fillRect(left,top,right-left,bottom-top);if(r.flipX){out.save();out.translate((x+dx+bw)/256*width,(y+dy)/240*height);out.scale(-1,1);out.drawImage(asset,0,0,bw/256*width,bh/240*height);out.restore();}else out.drawImage(asset,(x+dx)/256*width,(y+dy)/240*height,bw/256*width,bh/240*height);
  for(const[px,py,red,green,blue]of r.details||[]){out.fillStyle=`rgb(${red},${green},${blue})`;out.fillRect((x+px)/256*width,(y+py)/240*height,width/256,height/240);}out.restore();
 }
 global.DreamDrawTools={sprite};
})(typeof window!=='undefined'?window:globalThis);
