/* The lookup reads a scenery strip only. Unknown scenes retain original output. */
(function(global){
 'use strict';
 function validate(p,depth=0){
  if(p?.alternates){if(depth||!Array.isArray(p.alternates)||p.alternates.length>4)throw new Error('Invalid scenery alternatives');for(const alt of p.alternates)validate(alt,1);}
  if(p?.version!==1||p.period!==256||JSON.stringify(p.region)!=='[0,128,256,32]'||typeof p.image!=='string'||!p.image.startsWith('/packs/motion/')||p.image.includes('..')||!p.frames||Object.keys(p.frames).length>10000)throw new Error('Invalid scenery pack');
  for(const [hash,x] of Object.entries(p.frames))if(!/^\d+$/.test(hash)||Number(hash)>0xffffffff||!Number.isInteger(x)||x<0||x>=256)throw new Error('Invalid scenery fingerprint');
  for(const [hash,y] of Object.entries(p.reveals||{}))if(!Object.hasOwn(p.frames,hash)||![8,16,24].includes(y))throw new Error('Invalid scenery reveal');
  if(p.layers&&(!Array.isArray(p.layers)||p.layers.length!==3||p.layers.some(l=>typeof l.image!=='string'||!l.image.startsWith('/packs/')||l.image.includes('..')||![0,.25,1].includes(l.speed))))throw new Error('Invalid scenery layers');
  return p;
 }
 function match(pixels,p){
  const hash=global.DreamPatternTools.pixelHash(pixels,p.region),scenes=[p,...(p.alternates||[])];
  for(const scene of scenes)if(Object.hasOwn(scene.frames,String(hash)))return {...scene,offset:scene.frames[hash],reveal:(scene.reveals||{})[hash]||0};
  // Exact local terrain survives new camera positions and characters crossing
  // the strip. Require agreement across many independent tiles, then preserve
  // every unmatched cell instead of painting over an actor or effect.
  const hashes=[];for(let y=128;y<160;y+=8)for(let x=8;x<248;x+=8)hashes.push({x,y,hash:global.DreamPatternTools.pixelHash(pixels,[x,y,8,8])});
  let best=null;
  for(const scene of scenes){if(!scene.tiles)continue;const votes=new Map();
   for(const cell of hashes)for(const [worldX,y]of scene.tiles[cell.hash]||[]){if(y!==cell.y)continue;const offset=(worldX-cell.x+256)%256;if(!votes.has(offset))votes.set(offset,[]);votes.get(offset).push([cell.x,cell.y,8,8]);}
   for(const[offset,cells]of votes)if(cells.length>=16&&(!best||cells.length>best.cells.length))best={...scene,offset,reveal:0,cells};
  }
  if(best){
   // Repeated and flat tiles cannot establish the camera, but become safe
   // to paint once distinctive tiles have established its exact position.
   best.cells=hashes.filter(cell=>(best.paintTiles?.[cell.hash]||best.tiles[cell.hash]||[]).some(([worldX,y])=>y===cell.y&&worldX===(cell.x+best.offset)%256)).map(cell=>[cell.x,cell.y,8,8]);
  }
  return best;
 }
 function draw(ctx,image,match,width,height){
  if(ctx.dreamBackdrop){ctx.save();ctx.beginPath();for(const[x,y,w,h]of match.cells||[match.region])ctx.rect(Math.floor(x/256*width),Math.floor(y/240*height),Math.ceil((x+w)/256*width)-Math.floor(x/256*width),Math.ceil((y+h)/240*height)-Math.floor(y/240*height));ctx.clip();restore(ctx,width,height);ctx.restore();return;}
  ctx.save();if(match.cells){ctx.beginPath();for(const[x,y,w,h]of match.cells)ctx.rect(x/256*width,y/240*height,w/256*width,h/240*height);ctx.clip();}
  const [x,baseY,w,baseH]=match.region,reveal=match.reveal||0,y=baseY+reveal,h=baseH-reveal,sourceHeight=image.height*h/baseH,scale=image.width/match.period,offset=match.offset,first=Math.min(w,match.period-offset);
  ctx.drawImage(image,offset*scale,0,first*scale,sourceHeight,x/256*width,y/240*height,first/256*width,h/240*height);
  if(first<w)ctx.drawImage(image,0,0,(w-first)*scale,sourceHeight,(x+first)/256*width,y/240*height,(w-first)/256*width,h/240*height);
  ctx.restore();
 }
 function backdrop(ctx,image,match,pixels,width,height,assets){
  ctx.dreamBackdrop=null;if(!image||match.reveal)return;
  // Only the verified arena's empty sky is replaced. Native actors, effects,
  // text and all HUD pixels are retained until their own replacement pass.
  const layers=match.layers?.map(l=>({...l,art:assets?.get(l.image)}));
  if(layers?.every(l=>l.art)){
   const key=match.arena,previous=ctx.dreamSceneState;let travel=match.offset;
   if(previous?.key===key){let delta=match.offset-previous.offset;if(delta>128)delta-=256;if(delta<-128)delta+=256;travel=previous.travel+delta;}
   ctx.dreamSceneState={key,offset:match.offset,travel};ctx.dreamBackdrop={layers,travel};
  }else ctx.dreamBackdrop=image;
  ctx.save();ctx.beginPath();
  for(let y=0;y<128;y++){let start=-1;for(let x=0;x<=256;x++){const i=(y*256+x)*4,black=x<256&&pixels[i]===0&&pixels[i+1]===0&&pixels[i+2]===0;if(black){if(start<0)start=x;}else if(start>=0){ctx.rect(Math.floor(start/256*width),Math.floor(y/240*height),Math.ceil(x/256*width)-Math.floor(start/256*width),Math.ceil((y+1)/240*height)-Math.floor(y/240*height));start=-1;}}}
  ctx.clip();restore(ctx,width,height);ctx.restore();
 }
 function restore(ctx,width,height){
  const back=ctx.dreamBackdrop;if(!back)return;
  if(!back.layers){ctx.drawImage(back,0,0,width,height*160/240);return;}
  ctx.save();ctx.scale(width/256,height/240);ctx.beginPath();ctx.rect(0,0,256,160);ctx.clip();ctx.fillStyle='#000';ctx.fillRect(0,0,256,160);
  for(const layer of back.layers){const art=layer.art,k=Math.max(256/art.width,160/art.height),span=art.width*k,h=art.height*k,offset=((back.travel*layer.speed)%(span*2)+span*2)%(span*2);
   for(let i=-1;i<=3;i++){const x=i*span-offset;if(x>=256||x+span<=0)continue;const unit=ctx.getTransform().a,drawX=Math.floor(x*unit)/unit,drawRight=Math.ceil((x+span)*unit)/unit,drawW=drawRight-drawX;ctx.save();if(Math.abs(i%2)===1){ctx.translate(drawRight,0);ctx.scale(-1,1);ctx.drawImage(art,0,160-h,drawW,h);}else ctx.drawImage(art,drawX,160-h,drawW,h);ctx.restore();}
  }ctx.restore();
 }
 global.DreamSceneryTools={validate,match,draw,backdrop,restore};
})(typeof window!=='undefined'?window:globalThis);
