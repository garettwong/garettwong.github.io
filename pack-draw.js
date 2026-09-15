/* Shared renderer used by the live game and recorded-frame QA exports. */
(function(global){
 function sprite(out,asset,r,width,height){
  const[x,y,w,h]=r.region;
  if(!r.motion){const [px,py,pw,ph]=r.paintRegion||r.region;if(r.holes){out.save();out.beginPath();out.rect(px/256*width,py/240*height,pw/256*width,ph/240*height);for(const [hx,hy,hw,hh] of r.holes)out.rect(hx/256*width,hy/240*height,hw/256*width,hh/240*height);out.clip('evenodd');}out.drawImage(asset,px/256*width,py/240*height,pw/256*width,ph/240*height);if(r.holes)out.restore();return;}
  const[dx,dy,bw,bh]=r.renderRegion||[0,0,w,h],left=Math.floor(x/256*width),top=Math.floor(y/240*height),right=Math.ceil((x+w)/256*width),bottom=Math.ceil((y+h)/240*height);out.save();out.beginPath();out.rect(left,top,right-left,bottom-top);out.clip();out.fillStyle='#000';out.fillRect(left,top,right-left,bottom-top);out.drawImage(asset,(x+dx)/256*width,(y+dy)/240*height,bw/256*width,bh/240*height);
  for(const[px,py,red,green,blue]of r.details||[]){out.fillStyle=`rgb(${red},${green},${blue})`;out.fillRect((x+px)/256*width,(y+py)/240*height,width/256,height/240);}out.restore();
 }
 global.DreamDrawTools={sprite};
})(typeof window!=='undefined'?window:globalThis);
