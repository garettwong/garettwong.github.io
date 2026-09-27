/* HD English for the existing DBZ II ROM. No ROM, palette or gameplay writes. */
(function(global){
 'use strict';
 const ROM='2760ce996957b27a16b4023ac2571afa477437307c1876029baf179ba93c206c';
 const rgb=c=>`rgb(${c&255},${c>>>8&255},${c>>>16&255})`;
 class EnglishText {
  constructor(glyphs){this.tables=new Map([8,16].map(h=>[h,new Map(glyphs.filter(g=>g.height===h).map(g=>[g.rows.join(','),g.text]))]));}
  scan(pixels){
   const colors=new Uint32Array(pixels.buffer,pixels.byteOffset,pixels.byteLength/4),found=[];
   for(const height of [16,8])for(let y=0;y<=240-height;y+=8)for(let x=0;x<256;x+=8){
    const counts=new Map();for(let dy=0;dy<height;dy++)for(let dx=0;dx<8;dx++){const c=colors[(y+dy)*256+x+dx];counts.set(c,(counts.get(c)||0)+1);}
    if(counts.size<2||counts.size>4)continue;
    const sorted=[...counts].sort((a,b)=>b[1]-a[1]);for(const [bg,count] of sorted){
    if(count<8)continue;
    
    const rows=[];for(let dy=0;dy<height;dy++){let bits=0;for(let dx=0;dx<8;dx++)if(colors[(y+dy)*256+x+dx]!==bg)bits|=128>>dx;rows.push(bits);}
    const text=this.tables.get(height).get(rows.join(','));if(!text)continue;
    // Use the strongest contrast as ink; the second NES colour is a shadow, not another glyph.
    const luminance=c=>(c&255)*.2126+(c>>>8&255)*.7152+(c>>>16&255)*.0722;
    const ink=sorted.filter(c=>c[0]!==bg).sort((a,b)=>Math.abs(luminance(b[0])-luminance(bg))-Math.abs(luminance(a[0])-luminance(bg)))[0][0];
    found.push({x,y,height,text,bg,ink});break;
    }
   }
   const occupied=new Set(),accepted=[];
   for(const c of found){const keys=Array.from({length:c.height/8},(_,i)=>(c.y/8+i)*32+c.x/8);if(keys.some(k=>occupied.has(k)))continue;keys.forEach(k=>occupied.add(k));accepted.push(c);}
   return accepted.sort((a,b)=>a.y-b.y||a.x-b.x);
  }
  draw(ctx,pixels,width,height){
   const cells=this.scan(pixels),runs=[];
   const colors=new Uint32Array(pixels.buffer,pixels.byteOffset,pixels.byteLength/4);
   for(const c of cells){const last=runs.at(-1),gap=last?c.x-last.end:0;let clear=gap>=0&&gap<=8;
    if(clear&&last)for(let y=c.y;y<c.y+c.height&&clear;y++)for(let x=last.end;x<c.x;x++)if(colors[y*256+x]!==c.bg){clear=false;break;}
    if(last&&last.y===c.y&&last.height===c.height&&last.bg===c.bg&&clear){last.text+=' '.repeat(gap/8)+c.text;last.end=c.x+8;last.cells.push(c);}
    else runs.push({...c,end:c.x+8,cells:[c]});
   }
   ctx.save();ctx.scale(width/256,height/240);ctx.textBaseline='alphabetic';
   for(const r of runs){
    if(!/[A-Za-z0-9&]/.test(r.text))continue;
    // Completely erase the original ink and shadow, without touching cursor or scene art.
    for(const c of r.cells){ctx.fillStyle=rgb(c.bg);ctx.fillRect(c.x,c.y,8,c.height);}
    ctx.fillStyle=rgb(r.ink);ctx.font=`600 ${r.height===16?12:7.5}px Arial, sans-serif`;
    const w=r.end-r.x,measured=ctx.measureText(r.text).width;
    ctx.save();ctx.translate(r.x,r.y);ctx.scale(Math.min(1,(w-.5)/Math.max(1,measured)),1);ctx.fillText(r.text,.25,r.height===16?13:7);ctx.restore();
   }
   ctx.restore();return runs;
  }
 }
 class EnglishPlayer extends global.CT2English.EnglishPlayer {
  constructor(options){super(options);this.rules=[{id:'dbz-english-hd'}];}
  async prepare(){const response=await fetch('/dbz-english-font.json?v=103');if(!response.ok)throw Error('English HD font could not load.');const data=await response.json();this.text=new EnglishText(data.glyphs);this.onStatus?.('English HD ready');}
 }
 global.DBZEnglish={ROM,EnglishText,EnglishPlayer};
})(typeof window==='undefined'?globalThis:window);

