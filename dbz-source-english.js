/* Original-v10 English edition: exact generated glyphs, never fuzzy OCR. */
(function(global){
'use strict';
const ROM='9f451ef64526ba7919b1dbeccd2e5a460153a54d1b6b72b75876ec2210b5958b';
const rgb=c=>`rgb(${c&255},${c>>>8&255},${c>>>16&255})`;
class EnglishText {
 constructor(data){this.blocks=data.blocks;this.tables=new Map([8,16].map(h=>[h,new Map(data.glyphs.filter(g=>g.height===h).map(g=>[g.rows.join(','),g]))]));}
 matchBlock(p,x,y,b){
  const palette=new Map(),reverse=new Map();
  for(let dy=0;dy<b.height;dy++)for(let dx=0;dx<b.width;dx++){
   const key=b.indices[dy*b.width+dx],color=p[(y+dy)*256+x+dx];
   if(palette.has(key)){if(palette.get(key)!==color)return null;}
   else{if(reverse.has(color))return null;palette.set(key,color);reverse.set(color,key);}
  }
  return palette.size>=2?{...b,x,y,palette}:null;
 }
 scan(pixels){
  const p=new Uint32Array(pixels.buffer,pixels.byteOffset,pixels.byteLength/4),blocks=[],cells=[],occupied=new Set();
  for(const b of this.blocks){
   for(let y=b.y??0;y<=(b.y??240-b.height);y+=8)for(let x=b.x??0;x<=(b.x??256-b.width);x+=8){
    const match=this.matchBlock(p,x,y,b);if(!match)continue;blocks.push(match);
    for(let yy=y;yy<y+b.height;yy+=8)for(let xx=x;xx<x+b.width;xx+=8)occupied.add(yy*256+xx);
   }
  }
  const band=(x,y,color)=>{if(y<0||y>=240)return 0;let a=x,b=x;while(a>0&&p[y*256+a-1]===color)a--;while(b<256&&p[y*256+b]===color)b++;return b-a;};
  for(const height of [16,8])for(let y=0;y<=240-height;y+=8)for(let x=0;x<256;x+=8){
   if(occupied.has(y*256+x))continue;
   const counts=new Map();for(let yy=0;yy<height;yy++)for(let xx=0;xx<8;xx++){const c=p[(y+yy)*256+x+xx];counts.set(c,(counts.get(c)||0)+1);}
   if(counts.size!==2)continue;
   for(const [bg,count] of counts){
    if(count<16||Math.max(band(x,y-1,bg),band(x,y+height,bg))<40)continue;
    const rows=[];for(let yy=0;yy<height;yy++){let bits=0;for(let xx=0;xx<8;xx++)if(p[(y+yy)*256+x+xx]!==bg)bits|=128>>xx;rows.push(bits);}
    const glyph=this.tables.get(height).get(rows.join(','));if(!glyph)continue;
    if(glyph.kind==='stat'&&Math.max(bg&255,bg>>>8&255,bg>>>16&255)<150)continue;
    const ink=[...counts.keys()].find(c=>c!==bg);cells.push({x,y,height,text:glyph.text,bg,ink});
    for(let yy=y;yy<y+height;yy+=8)occupied.add(yy*256+x);break;
   }
  }
  cells.sort((a,b)=>a.y-b.y||a.x-b.x);return {cells,blocks};
 }
 draw(ctx,pixels,width,height){
  const {cells,blocks}=this.scan(pixels),runs=[];
  for(const c of cells){const last=runs.at(-1);
   // Never bridge a blank cell: adjacent names and stat columns retain their anchors.
   if(last&&last.y===c.y&&last.height===c.height&&last.bg===c.bg&&last.end===c.x){last.text+=c.text;last.end+=8;last.cells.push(c);}
   else runs.push({...c,end:c.x+8,cells:[c]});
  }
  const statRows=runs.filter(r=>/^(HP|BP|BE)$/.test(r.text)).map(r=>r.y);
  const prose=[];
  for(const r of runs){const last=prose.at(-1),isStats=statRows.some(y=>r.y>=y-16&&r.y<=y+16);
   if(!isStats&&last&&last.y===r.y&&last.bg===r.bg&&last.height===r.height&&r.x-last.end===8){last.text+=' '+r.text;last.end=r.end;last.cells.push(...r.cells);}
   else prose.push({...r,cells:r.cells.slice()});
  }
  runs.splice(0,runs.length,...prose);
  ctx.save();ctx.scale(width/256,height/240);ctx.textBaseline='alphabetic';
  for(const r of runs){
   ctx.fillStyle=rgb(r.bg);ctx.fillRect(r.x,r.y,r.end-r.x,r.height);
   ctx.fillStyle=rgb(r.ink);ctx.font=`600 ${r.height===16?12:8}px Arial, sans-serif`;
   ctx.fillText(r.text,r.x+.3,r.y+(r.height===16?13:7),r.end-r.x-.6);
  }
  for(const b of blocks){
   if(b.kind==='preserve')continue;
   {
    ctx.fillStyle=rgb(b.palette.get(b.bg));ctx.fillRect(b.x,b.y,b.width,b.height);
    ctx.fillStyle=b.kind==='subtitle'?'#d6edff':rgb(b.palette.get(b.ink));ctx.textAlign='center';
    ctx.font=b.kind==='subtitle'?'700 10px Arial':'700 6.5px Arial';
    for(let j=0;j<b.lines.length;j++)ctx.fillText(b.lines[j],b.x+b.width/2,b.y+(b.lines.length===1?11:7+j*7),b.width-1);
   }
  }
  ctx.restore();return [...runs,...blocks];
 }
}
class EnglishPlayer extends global.CT2English.EnglishPlayer {
 constructor(options){super(options);this.rules=[{id:'original-source-english'}];}
 async prepare(){const response=await fetch('/dbz-source-font.json?v=104');if(!response.ok)throw Error('English font failed to load.');this.text=new EnglishText(await response.json());this.onStatus?.('Original-source English ready');}
 present(pixels){super.present(pixels);if(this.gameId===global.DreamCards?.ROM&&this.overlay.style.display!=='none')global.DreamCards.draw(this.out,pixels,this.overlay.width,this.overlay.height);}
}
global.DBZSourceEnglish={ROM,EnglishText,EnglishPlayer};
})(typeof window==='undefined'?globalThis:window);
