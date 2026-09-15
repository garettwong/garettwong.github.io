/* Pixel-exact portrait placement. Reads output pixels only; never game memory. */
(function(global){
 'use strict';
 function validateSearch(pack){
  const ids=new Set();
  for(const r of pack.rules){
   if(ids.has(r.id))throw new Error('Duplicate artwork rule');ids.add(r.id);
   if(r.threshold!==undefined&&(!Number.isFinite(r.threshold)||r.threshold<0||r.threshold>8))throw new Error('Invalid matching threshold');
   if(!Number.isInteger(r.pixelHash)||r.pixelHash<0||r.pixelHash>0xffffffff)throw new Error('Invalid pixel fingerprint');
   if(r.search!==undefined&&typeof r.search!=='boolean')throw new Error('Invalid portrait search');
   if(r.motion!==undefined&&typeof r.motion!=='boolean')throw new Error('Invalid motion rule');
   if(r.context&&(!Array.isArray(r.context)||r.context.length>8||r.context.some(a=>!Array.isArray(a)||a.length!==3||!a.every(Number.isInteger)||a[0]<0||a[0]>255||a[1]<0||a[1]>239||a[2]<0||a[2]>0xffffff)))throw new Error('Invalid scene context');
   if(r.paintRegion){const [x,y,w,h]=r.paintRegion;if(r.motion||!Array.isArray(r.paintRegion)||r.paintRegion.length!==4||![x,y,w,h].every(Number.isInteger)||x<0||y<0||w<1||h<1||x+w>256||y+h>240||!r.context?.length)throw new Error('Invalid scene paint region');}
   if(r.holes&&(!r.paintRegion||!Array.isArray(r.holes)||r.holes.length>4||r.holes.some(a=>!Array.isArray(a)||a.length!==4||!a.every(Number.isInteger)||a[0]<r.paintRegion[0]||a[1]<r.paintRegion[1]||a[2]<1||a[3]<1||a[0]+a[2]>r.paintRegion[0]+r.paintRegion[2]||a[1]+a[3]>r.paintRegion[1]+r.paintRegion[3])))throw new Error('Invalid preserved menu region');
   if(r.motion){
    if(!r.search||r.pixelHash===undefined||r.region[2]>64||r.region[3]>64||!Array.isArray(r.anchors)||r.anchors.length<3||r.anchors.length>8)throw new Error('Invalid sprite template');
    for(const a of r.anchors)if(!Array.isArray(a)||a.length!==3||!a.every(Number.isInteger)||a[0]<0||a[0]>=r.region[2]||a[1]<0||a[1]>=r.region[3]||a[2]<0||a[2]>0xffffff)throw new Error('Invalid sprite anchor');
    if(r.renderRegion&&(!Array.isArray(r.renderRegion)||r.renderRegion.length!==4||!r.renderRegion.every(Number.isInteger)||r.renderRegion.some(n=>Math.abs(n)>64)||r.renderRegion[2]<1||r.renderRegion[3]<1))throw new Error('Invalid sprite crop');
    if(r.details&&(!Array.isArray(r.details)||r.details.length>4096||r.details.some(a=>!Array.isArray(a)||a.length!==5||!a.every(Number.isInteger)||a.some(n=>n<0)||a[0]>=r.region[2]||a[1]>=r.region[3]||a.slice(2).some(n=>n>255))))throw new Error('Invalid sprite details');
   }else if(r.search&&(r.region[2]!==32||r.region[3]!==32||r.pixelHash===undefined))throw new Error('Moving portraits require a verified 32-pixel template');
  }
  return pack;
 }
 function luminance(pixels,index){return Math.round(.299*pixels[index]+.587*pixels[index+1]+.114*pixels[index+2]);}
 function pixelHash(pixels,region){
  const[x,y,w,h]=region;let hash=2166136261;
  for(let row=y;row<y+h;row++)for(let i=(row*256+x)*4,end=i+w*4;i<end;i++)hash=Math.imul(hash^pixels[i],16777619);
  return hash>>>0;
 }
 const exactProbes=new WeakMap();
 function matchesAt(pixels,r,x,y){
  for(const [xx,yy,c] of r.context||[]){const i=(yy*256+xx)*4;if(((pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2])!==c)return false;}
  const w=r.region[2],h=r.region[3],region=[x,y,w,h];
  if(r.pixelHash!==undefined){
   let probes=exactProbes.get(r);if(!probes){let lo=0,hi=0;for(let k=1;k<64;k++){if(r.signature[k]<r.signature[lo])lo=k;if(r.signature[k]>r.signature[hi])hi=k;}probes=[lo,hi,9,14,42,54];exactProbes.set(r,probes);}
   for(const k of probes){
    const xx=x+Math.floor(((k%8)+.5)*w/8),yy=y+Math.floor((Math.floor(k/8)+.5)*h/8);
    if(luminance(pixels,(yy*256+xx)*4)!==r.signature[k])return false;
   }
   return pixelHash(pixels,region)===r.pixelHash;
  }
  return global.DreamPackTools.distance(global.DreamPackTools.signature(pixels,region),r.signature)<=(r.threshold??3);
 }
 const portraitIndexes=new WeakMap();
 function portraitCandidates(pixels,rules){
  let index=portraitIndexes.get(rules);if(!index){index=new Map();for(const r of rules)if(r.search&&!r.motion){const key=(r.signature[9]<<16)|(r.signature[27]<<8)|r.signature[54];if(!index.has(key))index.set(key,[]);index.get(key).push(r);}portraitIndexes.set(rules,index);}
  const hits=new Map();if(!index.size)return hits;
  for(let y=0;y<=208;y+=8)for(let x=0;x<=224;x+=8){const key=(luminance(pixels,((y+6)*256+x+6)*4)<<16)|(luminance(pixels,((y+14)*256+x+14)*4)<<8)|luminance(pixels,((y+26)*256+x+26)*4),candidates=index.get(key);if(!candidates)continue;for(const r of candidates)if(matchesAt(pixels,r,x,y)){if(!hits.has(r))hits.set(r,[]);hits.get(r).push({...r,region:[x,y,32,32]});}}
  return hits;
 }
 function findMatches(pixels,rules){
  const found=[],portraits=portraitCandidates(pixels,rules);
  const colors=new Map(),packed=new Uint32Array(256*160);
  for(const r of rules)if(r.motion)for(const a of r.anchors)colors.set(a[2],[]);
  if(colors.size)for(let y=0;y<160;y++)for(let x=0;x<256;x++){
   const i=(y*256+x)*4,c=(pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2];
   packed[y*256+x]=c;const positions=colors.get(c);if(positions)positions.push(y*256+x);
  }
  for(const r of rules){
   if(r.motion){
    let anchor=r.anchors[0];for(const a of r.anchors)if(colors.get(a[2]).length<colors.get(anchor[2]).length)anchor=a;
    const [ax,ay,color]=anchor,[,,w,h]=r.region;
    for(const position of colors.get(color)){
     const x=(position&255)-ax,y=(position>>>8)-ay;if(x<0||y<0||x+w>256||y+h>160)continue;
     let anchorsMatch=true;for(let k=0;k<r.anchors.length;k++){const a=r.anchors[k];if(packed[(y+a[1])*256+x+a[0]]!==a[2]){anchorsMatch=false;break;}}if(!anchorsMatch)continue;
     if(matchesAt(pixels,r,x,y))found.push({...r,region:[x,y,w,h]});
    }
   }else if(r.search){
    found.push(...(portraits.get(r)||[]));
   }else if(matchesAt(pixels,r,r.region[0],r.region[1]))found.push(r);
  }
  const poses=new Map(),result=[];
  for(const r of found){
   if(!r.motion){result.push(r);continue;}
   const[x,y,w,h]=r.region,[dx,dy,bw,bh]=r.renderRegion||[0,0,w,h],key=[r.image,x+dx,y+dy,bw,bh].join(':');
   const previous=poses.get(key);if(!previous||w*h>previous.region[2]*previous.region[3])poses.set(key,r);
  }
  return result.concat(Array.from(poses.values()));
 }
 global.DreamPatternTools={validateSearch,pixelHash,findMatches};
})(typeof window!=='undefined'?window:globalThis);

