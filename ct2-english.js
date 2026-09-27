/* English text compositor for the exact LIVE8 English ROM. Gameplay is unmodified. */
(function(global){
 'use strict';
 const ROM='9be53d68a9614554670cd84ee42dd8c10b3893ded6b3255db05a9d706f3b741d';
 class EnglishText {
  constructor(glyphs,title){this.lookup=new Map(glyphs.map(g=>[g.rows.join(','),g.text==='un'?'w':g.text]));this.title=title;}
  scan(pixels){
   const rows=[];
   for(let y=0;y<=232;y++){let line=[];
    for(let x=0;x<256;x+=8){let mask=[],valid=true,color=null,lit=0;
     for(let dy=0;dy<8&&valid;dy++){let bits=0;for(let dx=0;dx<8;dx++){
      const i=((y+dy)*256+x+dx)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2];
      if((r<35&&g<35&&b<35)||(Math.max(r,g,b)<120&&Math.max(r,g,b)-Math.min(r,g,b)<15))continue;
      if(!color)color=[r,g,b];
      if(Math.abs(color[0]-r)+Math.abs(color[1]-g)+Math.abs(color[2]-b)>12){valid=false;break;}
      bits|=128>>dx;lit++;
     }mask.push(bits);}
     const text=valid&&lit>=2?this.lookup.get(mask.join(',')):undefined;
     line.push(text?{x,y,text,color}:null);
    }
    for(let x=0;x<32;x++){if(!line[x])continue;const cells=[line[x]];let end=x;
     while(end+1<32&&line[end+1])cells.push(line[++end]);
     rows.push({x:x*8,y,width:(end-x+1)*8,text:cells.map(c=>c.text).join(''),cells});x=end;
    }
   }const occupied=new Uint8Array(256*240),accepted=[];for(const r of rows.sort((a,b)=>b.cells.length-a.cells.length)){if(r.cells.some(c=>{for(let dy=0;dy<8;dy++)if(occupied[(c.y+dy)*256+c.x])return true;return false;}))continue;accepted.push(r);for(const c of r.cells)for(let dy=0;dy<8;dy++)occupied[(c.y+dy)*256+c.x]=1;}return accepted.sort((a,b)=>a.y-b.y||a.x-b.x);
  }
  draw(ctx,pixels,width,height){
   const sx=width/256,sy=height/240,found=this.scan(pixels),runs=[];for(const r of found){const last=runs.at(-1);if(last&&last.y===r.y&&r.x===last.x+last.width+8){last.text+=' '+r.text;last.width+=8+r.width;last.cells.push(...r.cells);}else runs.push({...r,cells:r.cells.slice()});}ctx.save();ctx.scale(sx,sy);ctx.textBaseline='alphabetic';
   for(const r of runs){
    ctx.fillStyle='#000';ctx.fillRect(r.x,r.y,r.width,8);
    let text=r.text.replace(/(\d{2})w(\d{2})/g,'$1:$2').replace(/F0CUS/g,'FOCUS').replace(/TaBaSa/g,'Tsubasa').replace(/([a-z])(\d)/g,'$1 $2');
    if(r.cells.some(c=>c.text.length>1)&&/^[A-Za-z]+$/.test(text))text=text[0]+text.slice(1).toLowerCase();
    text=text.replace(/\/(?=$|\s)/g,'!').replace(/^(FW|MF|DF|GK) ([A-Za-z]+)$/,(_,role,name)=>role+' '+name[0]+name.slice(1).toLowerCase());
    const names={RollSave:'Rolling Save',OceanSave:'Spin Save',Jump:'Triangle Jump','Image C':'Clone Save','Ps.Wd':'Password'};text=names[text]||text;
    let x=r.x,w=r.width;if(text==='Triangle Jump'&&r.x===88){x=80;w+=8;ctx.fillRect(x,r.y,w,8);}
    ctx.fillStyle=`rgb(${r.cells[0].color.join(',')})`;ctx.font='600 7.5px Arial, sans-serif';const measured=ctx.measureText(text).width;ctx.save();ctx.translate(x,r.y);ctx.scale(Math.min(1,w/measured),1);ctx.fillText(text,.1,7);ctx.restore();
   }
   if(this.title&&this.title.every(([x,y,r,g,b])=>{const i=(y*256+x)*4;return Math.abs(pixels[i]-r)+Math.abs(pixels[i+1]-g)+Math.abs(pixels[i+2]-b)<24;})){
    const markerCount=y=>{let n=0;for(let dy=0;dy<8;dy++)for(let x=80;x<88;x++){const i=((y+dy)*256+x)*4;if(Math.min(pixels[i],pixels[i+1],pixels[i+2])>180)n++;}return n;},activeTop=markerCount(128)>=markerCount(144);
    ctx.fillStyle='#000';ctx.fillRect(0,0,256,240);
    ctx.textAlign='center';ctx.fillStyle='#7bc4ff';ctx.font='900 italic 19px Arial';ctx.fillText('CAPTAIN',128,58);ctx.fillStyle='#fff';ctx.font='900 italic 25px Arial';ctx.fillText('TSUBASA II',128,85);ctx.fillStyle='#f8c55a';ctx.font='700 8px Arial';ctx.fillText('SUPER STRIKER',128,103);
    for(const [t,y] of [['KICK OFF',135],['CONTINUE',151]]){ctx.fillStyle='#000';ctx.fillRect(96,y-7,64,8);ctx.fillStyle='#fff';ctx.font='700 7px Arial';ctx.fillText(t,128,y);}
    ctx.fillStyle='#f8c55a';ctx.beginPath();ctx.arc(83,activeTop?132:148,2.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ddd';ctx.font='6px Arial';ctx.fillText('© Yoichi Takahashi / Shueisha',128,175);ctx.fillText('TV Tokyo · CH.12 · Tsuchida Pro',128,190);ctx.fillText('© TECMO 1990',128,205);
   }
   ctx.fillStyle='#000';ctx.fillRect(0,0,256,2);ctx.fillRect(0,232,256,8);
   ctx.restore();return runs;
  }
 }
 class EnglishPlayer {
  constructor(options){Object.assign(this,options);this.rules=[{id:'ct2-english-hd'}];this.enabled=true;this.metrics={frames:0};this.scratch=document.createElement('canvas');this.scratch.width=256;this.scratch.height=240;this.ctx=this.scratch.getContext('2d');this.out=this.overlay.getContext('2d',{alpha:false});}
  async prepare(){const r=await fetch('/ct2-english-font.json');if(!r.ok)throw Error('English font could not load.');const data=await r.json();this.text=new EnglishText(data.glyphs,data.title);this.onStatus?.('English HD ready');}
  setEnabled(){this.enabled=true;}
  resetFrame(){if(global.DreamFrameSource){global.DreamFrameSource.pixels=null;global.DreamFrameSource.requested=true;}}
  async start(){const native=global.DreamFrameSource;native.enabled=true;native.requested=true;native.onFrame=()=>{native.requested=true;if(!this.suspended&&!this.stopped&&native.pixels&&native.canvas===this.canvas)this.present(native.pixels);};this.resize=()=>{if(this.lastPixels)this.present(this.lastPixels);};global.addEventListener('resize',this.resize);this.onDisplay?.({active:true,reason:'active'});}
  present(pixels){
   this.lastPixels=pixels;const canvas=this.canvas;if(!canvas?.width)return;
   const rect=canvas.getBoundingClientRect(),aspect=global.EJS_emulator?.gameManager?.getVideoDimensions('aspect')||4/3,cw=canvas.width,ch=canvas.height,vw=Math.min(cw,ch*aspect),vh=vw/aspect,ox=(cw-vw)/2,oy=cw<ch?0:(ch-vh)/2;
   const rw=rect.width*vw/cw,rh=rect.height*vh/ch,scale=Math.min(8,Math.max(4,Math.ceil(rw*(global.devicePixelRatio||1)/256))),width=256*scale,height=240*scale;
   if(this.overlay.width!==width){this.overlay.width=width;this.overlay.height=height;}
   Object.assign(this.overlay.style,{left:rect.left+rect.width*ox/cw+'px',top:rect.top+rect.height*oy/ch+'px',width:rw+'px',height:rh+'px',display:'block'});
   this.ctx.putImageData(new ImageData(pixels,256,240),0,0);this.out.imageSmoothingEnabled=false;this.out.drawImage(this.scratch,0,0,width,height);this.out.imageSmoothingEnabled=true;this.metrics.textRuns=this.text.draw(this.out,pixels,width,height).length;this.metrics.frames++;this.metrics.resolution=[width,height];
  }
  suspend(){this.suspended=true;}
  resume(){this.suspended=false;this.resetFrame();}
  stop(){this.stopped=true;global.removeEventListener('resize',this.resize);}
 }
 global.CT2English={ROM,EnglishText,EnglishPlayer};
})(typeof window==='undefined'?globalThis:window);
