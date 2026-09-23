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
 // FASTMATCH66
 const motionPlans=new WeakMap();
 function motionPlan(rules){
  let plan=motionPlans.get(rules);if(plan)return plan;
  const ids=new Map(),items=new Map();let ri=0;
  for(const r of rules){if(r.motion){const n=r.anchors.length,off=new Int32Array(n),cid=new Int32Array(n),ax=new Int32Array(n),ay=new Int32Array(n);
   r.anchors.forEach((a,k)=>{if(!ids.has(a[2]))ids.set(a[2],ids.size);off[k]=a[1]*256+a[0];cid[k]=ids.get(a[2]);ax[k]=a[0];ay[k]=a[1];});
   const col=new Uint32Array(r.anchors.map(a=>a[2])),W=r.region[2],H=r.region[3];let lo=0,hi=0;for(let k=1;k<64;k++){if(r.signature[k]<r.signature[lo])lo=k;if(r.signature[k]>r.signature[hi])hi=k;}
   const pk=[lo,hi,9,14,42,54],poff=new Int32Array(pk.map(k=>Math.floor((Math.floor(k/8)+.5)*H/8)*256+Math.floor(((k%8)+.5)*W/8))),pval=new Uint8Array(pk.map(k=>r.signature[k]));
   items.set(r,{ri,off,cid,col,ax,ay,w:W,h:H,poff,pval,hits:[]});}ri++;}
  plan={ids,items,count:new Int32Array(ids.size),start:new Int32Array(ids.size+1),fill:new Int32Array(ids.size),pos:new Int32Array(40960),packed:new Uint32Array(40960),prev:new Uint32Array(40960),lum:new Uint8Array(61440),hasPrev:false};
  motionPlans.set(rules,plan);return plan;
 }
 function lowerBound(a,lo,hi,v){while(lo<hi){const m=(lo+hi)>>1;if(a[m]<v)lo=m+1;else hi=m;}return lo;}
 function findMatches(pixels,rules){
  const found=[],portraits=portraitCandidates(pixels,rules),plan=motionPlan(rules),{ids,items,count,start,fill,pos,packed,prev,lum}=plan;
  let x0=256,y0=160,x1=-1,y1=-1;
  if(ids.size){
   count.fill(0);let lastC=-1,lastId=-1;
   for(let q=0,i=0;q<40960;q++,i+=4){const c=(pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2];packed[q]=c;if(c!==prev[q]){const xx=q&255,yy=q>>>8;if(xx<x0)x0=xx;if(xx>x1)x1=xx;if(yy<y0)y0=yy;y1=yy;}if(c!==lastC){lastC=c;const v=ids.get(c);lastId=v===undefined?-1:v;}if(lastId>=0)count[lastId]++;}
   const full=!plan.hasPrev;if(full){x0=0;y0=0;x1=255;y1=159;}
   if(x1>=0){
    start[0]=0;for(let k=0;k<ids.size;k++){start[k+1]=start[k]+count[k];fill[k]=start[k];}
    lastC=-1;lastId=-1;for(let q=0;q<40960;q++){const c=packed[q];if(c!==lastC){lastC=c;const v=ids.get(c);lastId=v===undefined?-1:v;}if(lastId>=0)pos[fill[lastId]++]=q;}
    const r0=Math.max(0,y0-48),r1=Math.min(159,y1+48);
    for(let q=r0*256,i=q*4,e=(r1+1)*256;q<e;q++,i+=4)lum[q]=Math.round(.299*pixels[i]+.587*pixels[i+1]+.114*pixels[i+2]);
    for(const [r,m] of items){
     const w=m.w,h=m.h,off=m.off,col=m.col,n=off.length,poff=m.poff,pval=m.pval;
     // Keep earlier hits whose box lies completely outside the changed area.
     const kept=[];for(const e of m.hits)if(e.region[0]+w-1<x0||e.region[0]>x1||e.region[1]+h-1<y0||e.region[1]>y1)kept.push(e);
     let best=0;for(let k=1;k<n;k++)if(count[m.cid[k]]<count[m.cid[best]])best=k;
     const ax=m.ax[best],ay=m.ay[best],id=m.cid[best];
     const cx0=Math.max(0,x0-w+1),cx1=Math.min(256-w,x1),cy0=Math.max(0,y0-h+1),cy1=Math.min(160-h,y1);
     if(cx0<=cx1&&cy0<=cy1){
      const s0=lowerBound(pos,start[id],start[id+1],(cy0+ay)*256),limit=(cy1+ay+1)*256;
      for(let j=s0,end=start[id+1];j<end;j++){const q=pos[j];if(q>=limit)break;const x=(q&255)-ax,y=(q>>>8)-ay;if(x<cx0||x>cx1||y<cy0||y>cy1)continue;
       const base=y*256+x;let ok=true;for(let k=0;k<n;k++)if(packed[base+off[k]]!==col[k]){ok=false;break;}if(!ok)continue;
       for(let k=0;k<6;k++)if(lum[base+poff[k]]!==pval[k]){ok=false;break;}if(!ok)continue;
       if(matchesAt(pixels,r,x,y))kept.push({...r,region:[x,y,w,h]});}
     }
     kept.sort((a,b)=>(a.region[1]*256+a.region[0])-(b.region[1]*256+b.region[0]));m.hits=kept;
    }
   }
   prev.set(packed);plan.hasPrev=true;
  }
  for(const r of rules){
   if(r.motion){for(const e of items.get(r).hits)found.push(e);}
   else if(r.search){found.push(...(portraits.get(r)||[]));}
   else if(matchesAt(pixels,r,r.region[0],r.region[1]))found.push(r);
  }
  const poses=new Map(),result=[];
  for(const r of found){
   if(!r.motion){result.push(r);continue;}
   const[x,y,w,h]=r.region,[dx,dy,bw,bh]=r.renderRegion||[0,0,w,h],key=[r.image,x+dx,y+dy,bw,bh].join(':');
   const previous=poses.get(key);if(!previous||w*h>previous.region[2]*previous.region[3])poses.set(key,r);
  }
  return result.concat(Array.from(poses.values()));
 }
 function findMatchesSlow(pixels,rules){
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
 global.DreamPatternTools={validateSearch,pixelHash,findMatches,findMatchesSlow};
})(typeof window!=='undefined'?window:globalThis);

