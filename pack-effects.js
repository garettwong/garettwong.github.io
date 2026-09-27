/* Energy effects are clipped to exact original flame-colored pixels. */
(function(global){
 const COLORS=new Set([0xb53120,0xea9e22,0xf7d8a5,0xffffff]);
 function matchFamily(p,COLORS,tint){
  const mask=new Uint8Array(256*128),seeds=[];
  for(let y=0;y<128;y++){let start=-1;for(let x=0;x<=256;x++){const i=(y*256+x)*4,yes=x<256&&COLORS.has((p[i]<<16)|(p[i+1]<<8)|p[i+2]);if(yes){mask[y*256+x]=1;if(start<0)start=x;}else if(start>=0){if(x-start>=12)seeds.push(y*256+start);start=-1;}}}
  const visited=new Uint8Array(mask.length),queue=new Int32Array(mask.length),effects=[];
  for(const seed of seeds){if(visited[seed])continue;let head=0,tail=1,minX=256,maxX=-1,minY=128,maxY=-1,colors=0,tinted=0;queue[0]=seed;visited[seed]=1;
   while(head<tail){const n=queue[head++],x=n%256,y=(n/256)|0,idx=n*4,color=(p[idx]<<16)|(p[idx+1]<<8)|p[idx+2];if(color!==0xffffff)tinted++;colors|=color===0xb53120?1:color===0xea9e22?2:color===0xf7d8a5?4:8;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    for(const next of [x>0?n-1:-1,x<255?n+1:-1,y>0?n-256:-1,y<127?n+256:-1])if(next>=0&&mask[next]&&!visited[next]){visited[next]=1;queue[tail++]=next;}
   }
   if(tinted<16||maxX-minX<19||(maxY-minY<(maxX-minX>=63?2:7))||maxY-minY>63||tail<128||minY<32)continue;
   // A projectile's entire bounding box must contain only its energy palette
   // and empty black. This excludes a fighter whose skin shares one colour.
   let foreign=false;const distinct=new Set();for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const i=(y*256+x)*4,color=(p[i]<<16)|(p[i+1]<<8)|p[i+2];if(color&&!COLORS.has(color)){foreign=true;continue;}if(color)distinct.add(color);}if(distinct.size<2||foreign&&!(maxX-minX>(maxY-minY)*3&&tail>=256))continue;
   let protectedBox=null;if(foreign){let a=256,b=128,d=-1,f=-1;for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const i=(y*256+x)*4,color=(p[i]<<16)|(p[i+1]<<8)|p[i+2];if(color&&!COLORS.has(color)){a=Math.min(a,x);b=Math.min(b,y);d=Math.max(d,x);f=Math.max(f,y);}}protectedBox=[a-2,b-2,d-a+5,f-b+5];}
   const runs=[];for(let y=minY;y<=maxY;y++){let start=-1;for(let x=minX;x<=maxX+1;x++){if(x<=maxX&&visited[y*256+x]){if(start<0)start=x;}else if(start>=0){runs.push([start,y,x-start]);start=-1;}}}
   const outline=[];for(let x=minX;x<=maxX;x++){let top=maxY+1,bottom=minY-1;for(let y=minY;y<=maxY;y++)if(visited[y*256+x]){top=Math.min(top,y);bottom=y+1;}if(bottom>=top)outline.push([x+.5,top,bottom]);}
   const interior=outline.reduce((sum,a)=>sum+a[2]-a[1],0);
   effects.push({x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1,runs,tint,outline,protectedBox,clipOnly:!foreign&&interior-tail>tail*.025});if(effects.length>=4)break;
  }
  return effects;
 }
 function aura(p){
  let x0=256,y0=128,x1=-1,y1=-1,n=0;const runs=[];
  for(let y=0;y<128;y++){let start=-1;for(let x=0;x<=256;x++){const i=(y*256+x)*4,col=x<256?(p[i]<<16)|(p[i+1]<<8)|p[i+2]:-1,yes=col===0xb53120||col===0xff8170;if(yes){n++;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);if(start<0)start=x;}else if(start>=0){runs.push([start,y,x-start]);start=-1;}}}
  const w=x1-x0+1,h=y1-y0+1;if(n<1800||w<60||h<60||w>128||h>128)return [];
  // Red circular power-up rings, never the terrain or a portrait panel.
  let clear=0;for(let y=0;y<128;y++)for(let x=128;x<256;x++){const i=(y*256+x)*4;if(p[i]===0&&p[i+1]===0&&p[i+2]===0)clear++;}if(clear<15500)return [];
  return [{aura:true,x:x0,y:y0,w,h,runs}];
 }
 function match(p){return [...aura(p),
  ...matchFamily(p,COLORS,'orange'),
  ...matchFamily(p,new Set([0x155fd9,0x64b0ff,0xc0dfff,0xffffff]),'blue'),
  ...matchFamily(p,new Set([0x00404d,0x88d800,0xcfef96,0xffffff]),'green')
 ];}
 // Preserve source proportions. A beam extends by repeating its shaft, never
 // by flattening the head or stretching an explosion across a changing box.
 function spriteRects(art,w,h,beam=false){
  const sw=art.width,sh=art.height,scale=Math.min(h/sh,beam?Infinity:w/sw);
  if(!beam||w<sw*scale){const k=Math.min(w/sw,h/sh),dw=sw*k,dh=sh*k;return [[0,0,sw,sh,(w-dw)/2,(h-dh)/2,dw,dh]];}
  const left=Math.floor(sw*.25),right=Math.floor(sw*.3),mid=sw-left-right,lh=sh*scale,lw=left*scale,rw=right*scale,rects=[[0,0,left,sh,0,(h-lh)/2,lw,lh]];
  for(let x=lw;x<w-rw-1e-6;){const dw=Math.min(mid*scale,w-rw-x);rects.push([left,0,dw/scale,sh,x,(h-lh)/2,dw,lh]);x+=dw;}
  rects.push([sw-right,0,right,sh,w-rw,(h-lh)/2,rw,lh]);return rects;
 }
 function paintSprite(c,art,x,y,w,h,beam=false){for(const [sx,sy,sw,sh,dx,dy,dw,dh]of spriteRects(art,w,h,beam))c.drawImage(art,sx,sy,sw,sh,x+dx,y+dy,dw,dh);}
 function draw(c,effects,width,height,assets){
  c.save();c.scale(width/256,height/240);
  for(const e of effects){
   if(e.aura){const art=assets?.get('/packs/remaster-v96/red-aura.webp');if(!art)continue;c.save();c.beginPath();c.rect(e.x-1,e.y-1,e.w+2,e.h+2);c.ellipse(e.x+e.w/2,e.y+e.h*.58,e.w*.25,e.h*.2,0,0,Math.PI*2);c.clip('evenodd');c.fillStyle='#000';c.fillRect(e.x-1,e.y-1,e.w+2,e.h+2);if(c.dreamBackdrop)global.DreamSceneryTools.restore(c,256,240);paintSprite(c,art,e.x,e.y,e.w,e.h);c.restore();continue;}

   const beam=e.w>e.h*2.3,name=beam?e.tint+'-beam':e.tint+(e.w<36?'-impact':'-explosion'),art=assets?.get('/packs/remaster-v96/'+name+'.webp');
   if(art){c.save();c.beginPath();c.rect(e.x-.2,e.y-.2,e.w+.4,e.h+.4);c.clip();c.beginPath();if(e.clipOnly){for(const[x,y,w]of e.runs)c.rect(x,y,w,1);}else{c.rect(e.x-.2,e.y-.2,e.w+.4,e.h+.4);}if(e.protectedBox)c.rect(...e.protectedBox);c.clip(e.protectedBox?'evenodd':'nonzero');c.fillStyle='#000';c.fillRect(e.x,e.y,e.w,e.h);if(c.dreamBackdrop)global.DreamSceneryTools.restore(c,256,240);c.globalCompositeOperation='screen';const left=e.outline.filter(a=>a[0]<e.x+e.w/3).reduce((s,a)=>s+a[2]-a[1],0),right=e.outline.filter(a=>a[0]>e.x+e.w*2/3).reduce((s,a)=>s+a[2]-a[1],0);if(beam&&left>right*1.2){c.translate(e.x+e.w,e.y);c.scale(-1,1);paintSprite(c,art,0,0,e.w,e.h,true);}else paintSprite(c,art,e.x,e.y,e.w,e.h,beam);c.restore();continue;}
   c.save();if(e.clipOnly){c.beginPath();for(const[x,y,w]of e.runs)c.rect(x,y,w,1);c.clip();}else {c.fillStyle='#000';for(const[x,y,w]of e.runs)c.fillRect(x,y,w,1);}
   const cool=e.tint==='blue',green=e.tint==='green',edge=cool?'#164fce':green?'#39870b':'#b83b10',mid=cool?'#54baff':green?'#a1e94b':'#ff9b14',light=cool?'#c8f4ff':green?'#e7ffb3':'#ffe88b';
   const gradient=c.createLinearGradient(0,e.y,0,e.y+e.h);
   for(const[t,color]of [[0,edge],[.2,mid],[.42,light],[.5,'#fffef3'],[.58,light],[.8,mid],[1,edge]])gradient.addColorStop(t,color);
   c.fillStyle=gradient;if(e.clipOnly){c.fillRect(e.x,e.y,e.w,e.h);c.restore();continue;}c.beginPath();
   const points=[...e.outline.map(a=>[a[0],a[1]]),...e.outline.slice().reverse().map(a=>[a[0],a[2]])];
   if(points.length){const first=points[0],last=points[points.length-1];c.moveTo((first[0]+last[0])/2,(first[1]+last[1])/2);for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];c.quadraticCurveTo(a[0],a[1],(a[0]+b[0])/2,(a[1]+b[1])/2);}c.closePath();c.fill();}
   c.restore();
  }
  c.restore();
 }
 global.DreamEffectTools={match,draw,spriteRects};
})(typeof window!=='undefined'?window:globalThis);

