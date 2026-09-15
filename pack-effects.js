/* Energy effects are clipped to exact original flame-colored pixels. */
(function(global){
 const COLORS=new Set([0xb53120,0xea9e22,0xf7d8a5,0xffffff]);
 function match(p){
  const mask=new Uint8Array(256*128),seeds=[];
  for(let y=0;y<128;y++){let start=-1;for(let x=0;x<=256;x++){const i=(y*256+x)*4,yes=x<256&&COLORS.has((p[i]<<16)|(p[i+1]<<8)|p[i+2]);if(yes){mask[y*256+x]=1;if(start<0)start=x;}else if(start>=0){if(x-start>=64)seeds.push(y*256+start);start=-1;}}}
  const visited=new Uint8Array(mask.length),queue=new Int32Array(mask.length),effects=[];
  for(const seed of seeds){if(visited[seed])continue;let head=0,tail=1,minX=256,maxX=-1,minY=128,maxY=-1,colors=0;queue[0]=seed;visited[seed]=1;
   while(head<tail){const n=queue[head++],x=n%256,y=(n/256)|0,idx=n*4,color=(p[idx]<<16)|(p[idx+1]<<8)|p[idx+2];colors|=color===0xb53120?1:color===0xea9e22?2:color===0xf7d8a5?4:8;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    for(const next of [x>0?n-1:-1,x<255?n+1:-1,y>0?n-256:-1,y<127?n+256:-1])if(next>=0&&mask[next]&&!visited[next]){visited[next]=1;queue[tail++]=next;}
   }
   if((colors&6)!==6||!(colors&9)||maxX-minX<63||maxY-minY<3||maxY-minY>40||tail<128)continue;
   const runs=[];for(let y=minY;y<=maxY;y++){let start=-1;for(let x=minX;x<=maxX+1;x++){if(x<=maxX&&visited[y*256+x]){if(start<0)start=x;}else if(start>=0){runs.push([start,y,x-start]);start=-1;}}}
   effects.push({x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1,runs});if(effects.length>=4)break;
  }
  return effects;
 }
 function draw(c,effects,width,height){c.save();c.scale(width/256,height/240);for(const e of effects){c.save();c.beginPath();for(const[x,y,w]of e.runs)c.rect(x,y,w,1);c.clip();const gradient=c.createLinearGradient(0,e.y,0,e.y+e.h);gradient.addColorStop(0,'#b83b10');gradient.addColorStop(.2,'#ff9b14');gradient.addColorStop(.42,'#ffe88b');gradient.addColorStop(.5,'#fffef3');gradient.addColorStop(.58,'#ffe88b');gradient.addColorStop(.8,'#ff9b14');gradient.addColorStop(1,'#a42e10');c.fillStyle=gradient;c.fillRect(e.x,e.y,e.w,e.h);c.restore();}c.restore();}
 global.DreamEffectTools={match,draw};
})(typeof window!=='undefined'?window:globalThis);

