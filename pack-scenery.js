/* The lookup reads a scenery strip only. Unknown scenes retain original output. */
(function(global){
 'use strict';
 function validate(p,depth=0){
  if(p?.alternates){if(depth||!Array.isArray(p.alternates)||p.alternates.length>4)throw new Error('Invalid scenery alternatives');for(const alt of p.alternates)validate(alt,1);}
  if(p?.version!==1||p.period!==256||JSON.stringify(p.region)!=='[0,128,256,32]'||typeof p.image!=='string'||!p.image.startsWith('/packs/motion/')||p.image.includes('..')||!p.frames||Object.keys(p.frames).length>10000)throw new Error('Invalid scenery pack');
  for(const [hash,x] of Object.entries(p.frames))if(!/^\d+$/.test(hash)||Number(hash)>0xffffffff||!Number.isInteger(x)||x<0||x>=256)throw new Error('Invalid scenery fingerprint');
  for(const [hash,y] of Object.entries(p.reveals||{}))if(!Object.hasOwn(p.frames,hash)||![8,16,24].includes(y))throw new Error('Invalid scenery reveal');
  return p;
 }
 function match(pixels,p){const hash=global.DreamPatternTools.pixelHash(pixels,p.region);for(const scene of [p,...(p.alternates||[])])if(Object.hasOwn(scene.frames,String(hash)))return {...scene,offset:scene.frames[hash],reveal:(scene.reveals||{})[hash]||0};return null;}
 function draw(ctx,image,match,width,height){
  const [x,baseY,w,baseH]=match.region,reveal=match.reveal||0,y=baseY+reveal,h=baseH-reveal,sourceHeight=image.height*h/baseH,scale=image.width/match.period,offset=match.offset,first=Math.min(w,match.period-offset);
  ctx.drawImage(image,offset*scale,0,first*scale,sourceHeight,x/256*width,y/240*height,first/256*width,h/240*height);
  if(first<w)ctx.drawImage(image,0,0,(w-first)*scale,sourceHeight,(x+first)/256*width,y/240*height,(w-first)/256*width,h/240*height);
 }
 global.DreamSceneryTools={validate,match,draw};
})(typeof window!=='undefined'?window:globalThis);
