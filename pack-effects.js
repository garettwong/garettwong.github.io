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
   let foreign=false;const distinct=new Set();for(let y=minY;y<=maxY&&!foreign;y++)for(let x=minX;x<=maxX;x++){const i=(y*256+x)*4,color=(p[i]<<16)|(p[i+1]<<8)|p[i+2];if(color&&!COLORS.has(color)){foreign=true;break;}if(color)distinct.add(color);}if(foreign||distinct.size<2)continue;
   const runs=[];for(let y=minY;y<=maxY;y++){let start=-1;for(let x=minX;x<=maxX+1;x++){if(x<=maxX&&visited[y*256+x]){if(start<0)start=x;}else if(start>=0){runs.push([start,y,x-start]);start=-1;}}}
   const outline=[];for(let x=minX;x<=maxX;x++){let top=maxY+1,bottom=minY-1;for(let y=minY;y<=maxY;y++)if(visited[y*256+x]){top=Math.min(top,y);bottom=y+1;}if(bottom>=top)outline.push([x+.5,top,bottom]);}
   const interior=outline.reduce((sum,a)=>sum+a[2]-a[1],0);
   effects.push({x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1,runs,tint,outline,clipOnly:interior-tail>tail*.025});if(effects.length>=4)break;
  }
  return effects;
 }
 function match(p){return [
  ...matchFamily(p,COLORS,'orange'),
  ...matchFamily(p,new Set([0x155fd9,0x64b0ff,0xc0dfff,0xffffff]),'blue'),
  ...matchFamily(p,new Set([0x00404d,0x88d800,0xcfef96,0xffffff]),'green')
 ];}
 function draw(c,effects,width,height){
  c.save();c.scale(width/256,height/240);
  for(const e of effects){
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
 global.DreamEffectTools={match,draw};
})(typeof window!=='undefined'?window:globalThis);

