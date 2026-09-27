/* Read-only UI enhancement: decoded values and exact source identities only. */
(function(global){
 const BLACK=0,BEIGE=0xf7d8a5,PURPLE=0x7527fe,BLUE=new Set([0,0xc0dfff,0x64b0ff,0x155fd9]);
 function rgb(p,x,y){const i=(y*256+x)*4;return p[i]*65536+p[i+1]*256+p[i+2];}
 function validate(p){if(p?.version!==1||!p.glyphs||!Array.isArray(p.labels)||p.labels.length>32)throw new Error('Invalid UI pack');if(p.cardShells&&(!Array.isArray(p.cardShells)||p.cardShells.length>4||!p.cardShells.every(shell=>Array.isArray(shell)&&shell.length===768&&shell.every(a=>Array.isArray(a)&&a.length===3&&a.every(Number.isInteger)&&a[0]>=0&&a[0]<32&&a[1]>=0&&a[1]<48&&a[2]>=0&&a[2]<=0xffffff))))throw new Error('Invalid card shell');return p;}
 function match(p,config){
  const found={labels:[],cards:[],strips:[],stats:null,text:[],background:[],pixels:p};
  // Only recolour the purple interface area connected to a screen corner;
  // purple costume pixels inside the battle remain untouched.
  const visited=new Uint8Array(256*240),queue=new Int32Array(256*240);let head=0,tail=0;
  for(const n of [0,255,239*256,240*256-1])if(rgb(p,n%256,n>>8)===PURPLE){queue[tail++]=n;visited[n]=1;}
  while(head<tail){const n=queue[head++],x=n%256,y=n>>8;for(const next of [x?n-1:-1,x<255?n+1:-1,y?n-256:-1,y<239?n+256:-1])if(next>=0&&!visited[next]&&rgb(p,next%256,next>>8)===PURPLE){visited[next]=1;queue[tail++]=next;}}
  if(tail)for(let y=0;y<240;y++){let start=-1;for(let x=0;x<=256;x++){if(x<256&&visited[y*256+x]){if(start<0)start=x;}else if(start>=0){found.background.push([start,y,x-start]);start=-1;}}}
  // Exact glyph decoding on the game's text-panel palette. No OCR guesses.
  if(config.textGlyphs){
   const lines=new Map(),marks=[];
   for(let x=0;x<=248;x+=8){const rows=[];
    for(let y=0;y<240;y++){let bits=0,valid=true;for(let dx=0;dx<8;dx++){const color=rgb(p,x+dx,y);if(color!==BLACK&&color!==BEIGE){valid=false;break;}bits=(bits<<1)|(color===BLACK?1:0);}rows.push(valid?bits.toString(16).padStart(2,'0'):null);}
    for(let y=0;y<=232;y++){const slice=rows.slice(y,y+8);if(slice.includes(null))continue;const key=slice.join('');if(key==='0000000000000000'||key==='ffffffffffffffff')continue;const char=config.textGlyphs[key];if(!char)continue;const cell={x,y,char};if(char==='゛'||char==='゜'){marks.push(cell);continue;}if(!lines.has(y))lines.set(y,[]);lines.get(y).push(cell);}
   }
   // The native battle panel scrolls by one pixel. Select a whole line's
   // observed baseline instead of assuming every font starts on an 8px grid.
   const accepted=[];for(const[y,cells]of [...lines].sort((a,b)=>b[1].length-a[1].length))if(cells.length>=2&&!accepted.some(v=>Math.abs(v-y)<8)){accepted.push(y);found.text.push(...cells);}
   found.text.push(...marks.filter(a=>found.text.some(b=>b.x===a.x&&b.y===a.y+8)));
   found.text.sort((a,b)=>a.y-b.y||a.x-b.x);
  }
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
  if(config.handShell?.length===768)for(let x=8;x<=224;x+=8){if(found.cards.some(card=>card.x===x)||!config.handShell.every(([dx,dy,color])=>rgb(p,x+dx,176+dy)===color))continue;const hash=global.DreamPatternTools.pixelHash(p,[x+8,192,16,16]),known=(config.handIdentities||[]).find(v=>v.pixelHash===hash);found.cards.push({id:'map-hand-card',x,text:known?.text||null});}
  for(const y of [0,128])for(const [palette,tint]of [[BLUE,'blue'],[new Set([0,0xb53120,0xff8170,0xffccc5]),'red']]){let colored=0,ok=true;for(let yy=y;yy<y+32&&ok;yy++)for(let x=0;x<256;x++){const c=rgb(p,x,yy);if(!palette.has(c)){ok=false;break;}if(c)colored++;}if(ok&&colored>256*24)found.strips.push({y,tint});}
  return found.labels.length||found.cards.length||found.stats||found.strips.length||found.text.length||found.background.length?found:null;
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
 function kanji(c,text,x,y){panel(c,x,y,16,16);c.textAlign='center';c.textBaseline='middle';c.fillStyle='#241709';c.font='600 14px DreamDialogue,serif';c.fillText(text,x+8,y+8.5,15);}
 function draw(c,found,width,height){
  c.save();c.scale(width/256,height/240);
  if(found.background?.length){c.save();c.beginPath();for(const[x,y,w]of found.background)c.rect(x,y,w,1);c.clip();const bg=c.createLinearGradient(0,0,256,240);bg.addColorStop(0,'#26324f');bg.addColorStop(.5,'#171e35');bg.addColorStop(1,'#0d1426');c.fillStyle=bg;c.fillRect(0,0,256,240);c.restore();}
  if(found.stats||found.cards.length||found.labels.length){c.save();c.beginPath();for(let y=160;y<240;y++){let start=-1;for(let x=0;x<=256;x++){if(x<256&&rgb(found.pixels,x,y)===PURPLE){if(start<0)start=x;}else if(start>=0){c.rect(start,y,x-start,1);start=-1;}}}c.clip();const background=c.createLinearGradient(0,160,0,240);background.addColorStop(0,'#342050');background.addColorStop(.4,'#21182f');background.addColorStop(1,'#111323');c.fillStyle=background;c.fillRect(0,160,256,80);c.restore();}

  if(found.stats){panel(c,48,176,48,48);c.fillStyle='#271c0f';c.font='700 8px Arial,sans-serif';c.textAlign='center';c.textBaseline='alphabetic';for(const a of found.stats){if(a.char&&a.char!==' ')c.fillText(a.char,a.x+4,a.y+7.3,7.7);else if(!a.char){for(let yy=0;yy<7;yy++)for(let xx=0;xx<8;xx++)if(rgb(found.pixels,a.x+xx,a.y+yy)===BLACK){rounded(c,a.x+xx-.08,a.y+yy-.08,1.16,1.16,.24);c.fill();}}}}
  for(const label of found.labels){const[x,y]=label.region;rounded(c,x-6,y+2,28,12,2);c.fillStyle='#f08a6b';c.fill();c.strokeStyle='#663b30';c.lineWidth=.7;c.stroke();kanji(c,label.text,x,y);}
  for(const card of found.cards){const x=card.x;panel(c,x,176,32,48);rounded(c,x+2,178,28,44,2);c.fillStyle='#18171b';c.fill();c.strokeStyle='#ef9879';c.lineWidth=.75;c.stroke();if(card.text)kanji(c,card.text,x+8,192);else icon(c,found.pixels,x+8,192,16,16);icon(c,found.pixels,x,176,16,16);icon(c,found.pixels,x+16,208,16,16);}
  for(const strip of found.strips){const {y,tint}=strip;const red=tint==='red';
   const g=c.createLinearGradient(0,y,0,y+32);g.addColorStop(0,red?'#7b251d':'#153c8f');g.addColorStop(.22,red?'#ff9787':'#8dcfff');g.addColorStop(.5,red?'#ffe2d5':'#d5edff');g.addColorStop(.8,red?'#e75b43':'#509be7');g.addColorStop(1,red?'#78201a':'#123c84');c.fillStyle=g;c.fillRect(0,y,256,32);
   for(let yy=y;yy<y+32;yy++){let x=0;while(x<256){const color=rgb(found.pixels,x,yy),start=x;while(x<256&&rgb(found.pixels,x,yy)===color)x++;if(color===(red?0xffccc5:0xc0dfff)||color===0){c.fillStyle=color?'rgba(231,248,255,.75)':'rgba(5,21,53,.8)';c.fillRect(start,yy+.25,x-start,.55);}}}
  }
  const text=found.text||[],marks=new Map(text.filter(a=>a.char==='゛'||a.char==='゜').map(a=>[`${a.x},${a.y+8}`,a.char]));
  for(const a of text){
   if(found.stats&&a.x>=48&&a.x<96&&a.y>=176&&a.y<224)continue;
   c.fillStyle='#f7d8a5';c.fillRect(a.x,a.y,8,8);c.fillStyle='#241709';
   if((a.char==='゛'||a.char==='゜')&&text.some(b=>b.x===a.x&&b.y===a.y+8))continue;
   const mark=marks.get(`${a.x},${a.y}`),char=mark?(a.char+(mark==='゛'?'\u3099':'\u309a')).normalize('NFC'):a.char;
   c.font='600 8px DreamDialogue,"Yu Gothic",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(char,a.x+4,a.y+4.25,8);
  }
  c.restore();
 }
 async function loadFont(){if(global.FontFace&&global.document?.fonts)await Promise.all([['DreamLabels','noto-serif-jp-labels.ttf','700'],['DreamDialogue','dbz-dialogue.ttf','600']].map(async([name,file,weight])=>{const font=new FontFace(name,`url(/fonts/${file})`,{weight});await font.load();document.fonts.add(font);}));}
 global.DreamHudTools={validate,match,draw,loadFont};
})(typeof window!=='undefined'?window:globalThis);

