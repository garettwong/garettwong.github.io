/* Original-v10 English edition: exact generated glyphs, never fuzzy OCR. */
(function(global){
'use strict';
const ROM='9f451ef64526ba7919b1dbeccd2e5a460153a54d1b6b72b75876ec2210b5958b';
const rgb=c=>`rgb(${c&255},${c>>>8&255},${c>>>16&255})`;
class EnglishText {
 constructor(data){this.blocks=data.blocks;this.tables=new Map([8,16].map(h=>[h,new Map(data.glyphs.filter(g=>g.height===h).map(g=>[g.rows.join(','),g]))]));}
 matchBlock(p,x,y,b){
  if(!this.cacheEnabled)return this.matchBlockRaw(p,x,y,b);
  this.blockCache??=new Map();let cache=this.blockCache.get(b);if(!cache){cache=new Map();this.blockCache.set(b,cache);}const key=y*256+x;
  if(cache.has(key)&&!this.regionChanged(x,y,b.width,b.height))return cache.get(key);
  const result=this.matchBlockRaw(p,x,y,b);cache.set(key,result);return result;
 }
 regionChanged(x,y,width,height){for(let yy=y;yy<y+height;yy+=8)for(let xx=x;xx<x+width;xx+=8)if(this.dirtyTiles[(yy/8)*32+xx/8])return true;return false;}
 matchBlockRaw(p,x,y,b){
  const palette=new Map(),reverse=new Map();
  for(let dy=0;dy<b.height;dy++)for(let dx=0;dx<b.width;dx++){
   const key=b.indices[dy*b.width+dx],color=p[(y+dy)*256+x+dx];
   if(palette.has(key)){if(palette.get(key)!==color)return null;}
   else{if(reverse.has(color))return null;palette.set(key,color);reverse.set(color,key);}
  }
  return palette.size>=2?{...b,x,y,palette}:null;
 }
 tileCounts(p,x,y,height){
  this.tileCache??=new Map();const key=height*65536+y*256+x,previous=this.tileCache.get(key);
  if(previous&&!this.regionChanged(x,y,8,height))return previous;
  const counts=new Map();scan:for(let yy=0;yy<height;yy++)for(let xx=0;xx<8;xx++){const c=p[(y+yy)*256+x+xx];counts.set(c,(counts.get(c)||0)+1);if(counts.size>2)break scan;}
  this.tileCache.set(key,counts);return counts;
 }
 scan(pixels){
  if(this.cacheEnabled&&this.previousPixels?.length===pixels.length){let same=true;const a=new Uint32Array(pixels.buffer,pixels.byteOffset,pixels.byteLength/4),b=new Uint32Array(this.previousPixels.buffer);for(let i=0;i<a.length;i++)if(a[i]!==b[i]){same=false;break;}if(same)return this.previousScan;}
  const p=new Uint32Array(pixels.buffer,pixels.byteOffset,pixels.byteLength/4),blocks=[],cells=[],occupied=new Set();
  if(this.cacheEnabled){this.dirtyTiles=new Uint8Array(960);const old=this.previousPixels?new Uint32Array(this.previousPixels.buffer):null;if(!old)this.dirtyTiles.fill(1);else for(let y=0;y<240;y+=8)for(let x=0;x<256;x+=8){tile:for(let yy=0;yy<8;yy++)for(let xx=0;xx<8;xx++)if(p[(y+yy)*256+x+xx]!==old[(y+yy)*256+x+xx]){this.dirtyTiles[(y/8)*32+x/8]=1;break tile;}}}
  for(const b of this.blocks){
   for(let y=b.y??0;y<=(b.y??240-b.height);y+=8)for(let x=b.x??0;x<=(b.x??256-b.width);x+=8){
    const match=this.matchBlock(p,x,y,b);if(!match)continue;blocks.push(match);
    for(let yy=y;yy<y+b.height;yy+=8)for(let xx=x;xx<x+b.width;xx+=8)occupied.add(yy*256+xx);
   }
  }
  const band=(x,y,color)=>{if(y<0||y>=240)return 0;let a=x,b=x;while(a>0&&p[y*256+a-1]===color)a--;while(b<256&&p[y*256+b]===color)b++;return b-a;};
  for(const height of [16,8])for(let y=0;y<=240-height;y+=8)for(let x=0;x<256;x+=8){
   if(occupied.has(y*256+x))continue;
   const counts=this.cacheEnabled?this.tileCounts(p,x,y,height):new Map();if(!this.cacheEnabled)for(let yy=0;yy<height;yy++)for(let xx=0;xx<8;xx++){const c=p[(y+yy)*256+x+xx];counts.set(c,(counts.get(c)||0)+1);}
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
  cells.sort((a,b)=>a.y-b.y||a.x-b.x);const result={cells,blocks};if(this.cacheEnabled){this.previousPixels=new Uint8Array(pixels);this.previousScan=result;}return result;
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
 async prepare(){const response=await fetch('/dbz-source-font.json?v=104');if(!response.ok)throw Error('English font failed to load.');this.text=new EnglishText(await response.json());this.text.cacheEnabled=!!this.turboPerformance;this.onStatus?.('Original-source English ready');}
 present(pixels){
  if(global.DreamGroupBlast?.coversScreen?.())return;
  const now=performance.now(),limited=this.battleThrottle?.()&&this.fightFps!==0&&pixels[0]===0&&pixels[1]===0&&pixels[2]===0;
  if(limited&&now<(this.nextFightPresentation||0))return;
  this.nextFightPresentation=limited?Math.max(now,(this.nextFightPresentation||now)+1000/(this.fightFps||60)):now;super.present(pixels);if((this.gameId===global.DreamCards?.ROM||this.gameId===global.DreamLargeBattle?.ROM)&&this.overlay.style.display!=='none')global.DreamCards.draw(this.out,pixels,this.overlay.width,this.overlay.height);if(this.gameId===global.DreamLargeBattle?.ROM&&this.overlay.style.display!=='none')global.DreamLargeBattle.draw(this.out,pixels,this.overlay.width,this.overlay.height);if(this.overlay.style.display!=='none')global.DreamScouter?.draw(this.out,this.overlay.width,this.overlay.height);}
}
global.DBZSourceEnglish={ROM,EnglishText,EnglishPlayer};
})(typeof window==='undefined'?globalThis:window);
