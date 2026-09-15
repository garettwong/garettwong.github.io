/* Read-only UI enhancement: decoded values and exact source identities only. */
(function(global){
 const BLACK=0,BEIGE=0xf7d8a5,PURPLE=0x7527fe,BLUE=new Set([0,0xc0dfff,0x64b0ff,0x155fd9]);
 function rgb(p,x,y){const i=(y*256+x)*4;return p[i]*65536+p[i+1]*256+p[i+2];}
 function validate(p){if(p?.version!==1||!p.glyphs||!Array.isArray(p.labels)||p.labels.length>32)throw new Error('Invalid UI pack');if(p.cardShells&&(!Array.isArray(p.cardShells)||p.cardShells.length>4||!p.cardShells.every(shell=>Array.isArray(shell)&&shell.length===768&&shell.every(a=>Array.isArray(a)&&a.length===3&&a.every(Number.isInteger)&&a[0]>=0&&a[0]<32&&a[1]>=0&&a[1]<48&&a[2]>=0&&a[2]<=0xffffff))))throw new Error('Invalid card shell');return p;}
 function match(p,config){
  const found={labels:[],cards:[],strips:[],stats:null,pixels:p};
  for(const label of config.labels)if(global.DreamPatternTools.pixelHash(p,label.region)===label.pixelHash){
   if(label.id.endsWith('-card')){
    const x=label.region[0]-8;if(rgb(p,x+1,180)===BEIGE&&rgb(p,x+29,180)===BEIGE&&rgb(p,x+31,180)===BLACK)found.cards.push({...label,x});
   }else found.labels.push(label);
  }
  const cells=[];let valid=true,nonempty=0;
  for(let y=176;y<224&&valid;y+=8)for(let x=48;x<96&&valid;x+=8){
   let key='',empty=true;
   for(let yy=y;yy<y+8;yy++){let row=0;for(let xx=x;xx<x+8;xx++){const c=rgb(p,xx,yy);if(c!==BLACK&&c!==BEIGE&&!(yy===223&&c===PURPLE)){valid=false;break;}row=(row<<1)|(c===BLACK?1:0);if(c===BLACK)empty=false;}key+=row.toString(16).padStart(2,'0');}
   const char=empty?' ':config.glyphs[key]||null;cells.push({x,y,char,key});if(!empty)nonempty++;
  }
  // HP, BP and BE must all be present at their original positions.
  if(valid&&nonempty>=6&&config.statAnchors.some(anchors=>[0,1,12,13,24,25].every((i,j)=>cells[i]?.key===anchors[j])))found.stats=cells;
  if(found.stats&&config.cardShells)for(const x of [96,128]){
   if(found.cards.some(card=>card.x===x)||!config.cardShells.some(shell=>shell.every(([dx,dy,color])=>rgb(p,x+dx,176+dy)===color)))continue;
   const hash=global.DreamPatternTools.pixelHash(p,[x+8,192,16,16]),known=config.labels.find(label=>label.id.endsWith('-card')&&label.pixelHash===hash);
   found.cards.push({id:'traced-card',x,text:known?.text||null});
  }
  for(const y of [0,128]){let blue=0,ok=true;for(let yy=y;yy<y+32&&ok;yy++)for(let x=0;x<256;x++){const c=rgb(p,x,yy);if(!BLUE.has(c)){ok=false;break;}if(c)blue++;}if(ok&&blue>256*24)found.strips.push(y);}
  return found.labels.length||found.cards.length||found.stats||found.strips.length?found:null;
 }
 function rounded(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath();}
 function panel(c,x,y,w,h){const g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#fff0c7');g.addColorStop(.45,'#eaca8e');g.addColorStop(1,'#c69a54');rounded(c,x,y,w,h,1.3);c.fillStyle=g;c.fill();c.strokeStyle='#684a27';c.lineWidth=.4;c.stroke();}
 const iconCache=new Map();
 function icon(c,p,x,y,w,h){
  // Trace original symbol boundaries. Never infer a card value or replace its sign.
  const key=global.DreamPatternTools.pixelHash(p,[x,y,w,h]);let layers=iconCache.get(key);
  if(!layers){
   const colors=new Set();for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)colors.add(rgb(p,x+xx,y+yy));layers=[];
   for(const color of colors){if(color===PURPLE)continue;const edges=new Map();
    const same=(xx,yy)=>xx>=0&&yy>=0&&xx<w&&yy<h&&rgb(p,x+xx,y+yy)===color;
    const edge=(a,b)=>{const k=a.join(',');if(!edges.has(k))edges.set(k,[]);edges.get(k).push(b);};
    for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)if(same(xx,yy)){
     if(!same(xx,yy-1))edge([xx,yy],[xx+1,yy]);if(!same(xx+1,yy))edge([xx+1,yy],[xx+1,yy+1]);if(!same(xx,yy+1))edge([xx+1,yy+1],[xx,yy+1]);if(!same(xx-1,yy))edge([xx,yy+1],[xx,yy]);
    }
    const loops=[];while(edges.size){const start=edges.keys().next().value;let here=start;const loop=[];for(let limit=0;limit<4096;limit++){loop.push(here.split(',').map(Number));const list=edges.get(here);if(!list?.length)break;const next=list.pop();if(!list.length)edges.delete(here);here=next.join(',');if(here===start)break;}if(loop.length>=3)loops.push(loop);}
    layers.push({color,loops});
   }
   iconCache.set(key,layers);if(iconCache.size>128)iconCache.delete(iconCache.keys().next().value);
  }
  for(const{color,loops}of layers){c.fillStyle='#'+color.toString(16).padStart(6,'0');c.beginPath();for(const loop of loops){const last=loop[loop.length-1],first=loop[0];c.moveTo(x+(last[0]+first[0])/2,y+(last[1]+first[1])/2);for(let i=0;i<loop.length;i++){const a=loop[i],b=loop[(i+1)%loop.length];c.quadraticCurveTo(x+a[0],y+a[1],x+(a[0]+b[0])/2,y+(a[1]+b[1])/2);}c.closePath();}c.fill('evenodd');}
 }
 function kanji(c,text,x,y){panel(c,x,y,16,16);c.textAlign='center';c.textBaseline='middle';c.fillStyle='#241709';c.font='700 14px DreamLabels,serif';c.fillText(text,x+8,y+8.5,15);}
 function draw(c,found,width,height){
  c.save();c.scale(width/256,height/240);
  if(found.stats||found.cards.length||found.labels.length){c.save();c.beginPath();for(let y=160;y<240;y++){let start=-1;for(let x=0;x<=256;x++){if(x<256&&rgb(found.pixels,x,y)===PURPLE){if(start<0)start=x;}else if(start>=0){c.rect(start,y,x-start,1);start=-1;}}}c.clip();const background=c.createLinearGradient(0,160,0,240);background.addColorStop(0,'#342050');background.addColorStop(.4,'#21182f');background.addColorStop(1,'#111323');c.fillStyle=background;c.fillRect(0,160,256,80);c.restore();}

  if(found.stats){panel(c,48,176,48,48);c.fillStyle='#271c0f';c.font='700 8px Arial,sans-serif';c.textAlign='center';c.textBaseline='alphabetic';for(const a of found.stats){if(a.char&&a.char!==' ')c.fillText(a.char,a.x+4,a.y+7.3,7.7);else if(!a.char){for(let yy=0;yy<7;yy++)for(let xx=0;xx<8;xx++)if(rgb(found.pixels,a.x+xx,a.y+yy)===BLACK){rounded(c,a.x+xx-.08,a.y+yy-.08,1.16,1.16,.24);c.fill();}}}}
  for(const label of found.labels){const[x,y]=label.region;rounded(c,x-6,y+2,28,12,2);c.fillStyle='#f08a6b';c.fill();c.strokeStyle='#663b30';c.lineWidth=.7;c.stroke();kanji(c,label.text,x,y);}
  for(const card of found.cards){const x=card.x;panel(c,x,176,32,48);rounded(c,x+2,178,28,44,2);c.fillStyle='#18171b';c.fill();c.strokeStyle='#ef9879';c.lineWidth=.75;c.stroke();if(card.text)kanji(c,card.text,x+8,192);else icon(c,found.pixels,x+8,192,16,16);icon(c,found.pixels,x,176,16,16);icon(c,found.pixels,x+16,208,16,16);}
  for(const y of found.strips){
   const g=c.createLinearGradient(0,y,0,y+32);g.addColorStop(0,'#153c8f');g.addColorStop(.22,'#8dcfff');g.addColorStop(.5,'#d5edff');g.addColorStop(.8,'#509be7');g.addColorStop(1,'#123c84');c.fillStyle=g;c.fillRect(0,y,256,32);
   for(let yy=y;yy<y+32;yy++){let x=0;while(x<256){const color=rgb(found.pixels,x,yy),start=x;while(x<256&&rgb(found.pixels,x,yy)===color)x++;if(color===0xc0dfff||color===0){c.fillStyle=color?'rgba(231,248,255,.75)':'rgba(5,21,53,.8)';c.fillRect(start,yy+.25,x-start,.55);}}}
  }
  c.restore();
 }
 async function loadFont(){if(global.FontFace&&global.document?.fonts){const font=new FontFace('DreamLabels','url(/fonts/noto-serif-jp-labels.ttf)',{weight:'700'});await font.load();document.fonts.add(font);}}
 global.DreamHudTools={validate,match,draw,loadFont};
})(typeof window!=='undefined'?window:globalThis);

