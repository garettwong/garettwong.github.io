/* Exact original terrain tiles, with camera-phase discovery. No game memory access. */
(function(global){
 'use strict';
 const states=new WeakMap(),points=[[0,0],[8,8],[15,15],[3,11]],probes=[[32,32],[96,32],[160,32],[32,80],[96,80],[160,80],[208,128],[80,128]];
 const rgb=(p,x,y)=>{const i=(y*256+x)*4;return p[i]*65536+p[i+1]*256+p[i+2];};
 function validate(p){
  if(p?.version!==1||p.tileSize!==16||!Array.isArray(p.tiles)||p.tiles.length>256)throw new Error('Invalid terrain tiles');
  const hashes=new Set();for(const t of p.tiles){if(!Number.isInteger(t.hash)||t.hash<0||t.hash>0xffffffff||hashes.has(t.hash)||!Array.isArray(t.anchors)||t.anchors.length!==4||!t.anchors.every(n=>Number.isInteger(n)&&n>=0&&n<=0xffffff)||typeof t.image!=='string'||!t.image.startsWith('/packs/map/')||t.image.includes('..'))throw new Error('Invalid terrain tile');hashes.add(t.hash);}
  for(const t of p.tiles){if(t.pivot&&(!Array.isArray(t.pivot)||t.pivot.length!==3||!t.pivot.every(Number.isInteger)||t.pivot[0]<0||t.pivot[0]>15||t.pivot[1]<0||t.pivot[1]>15||t.pivot[2]<1||t.pivot[2]>0xffffff))throw new Error('Invalid terrain pivot');if(t.preserveBlack!==undefined&&typeof t.preserveBlack!=='boolean')throw new Error('Invalid terrain mask');if(t.preserveWhite!==undefined&&typeof t.preserveWhite!=='boolean')throw new Error('Invalid board-edge mask');}
  if(p.gateColors&&(!Array.isArray(p.gateColors)||p.gateColors.length>16||!p.gateColors.every(n=>Number.isInteger(n)&&n>=0&&n<=0xffffff)))throw new Error('Invalid terrain palette');
  return p;
 }
 function match(p,config){
  let state=states.get(config);if(!state){state={phase:[0,0],index:new Map(),shapes:new Map()};for(const t of config.tiles){const key=t.anchors.join(',');if(!state.index.has(key))state.index.set(key,[]);state.index.get(key).push(t);if(t.palettePattern)state.shapes.set(t.palettePattern.join(','),t);}states.set(config,state);}
  // Three complete tile fingerprints identify terrain. Sparse palette samples
  // miss starfields at some camera offsets and used to disable the whole map.
  const tileAt=(x,y,palette=false)=>{const candidates=state.index.get(points.map(([dx,dy])=>rgb(p,x+dx,y+dy)).join(','))||[],possible=candidates.filter(t=>!t.pivot||rgb(p,x+t.pivot[0],y+t.pivot[1])===t.pivot[2]);if(possible.length){const hash=global.DreamPatternTools.pixelHash(p,[x,y,16,16]),exact=possible.find(t=>t.hash===hash);if(exact)return exact;}if(!palette||!state.shapes.size)return null;const colors=new Map([[0,0],[0xffffff,1]]),pattern=[];for(let yy=y;yy<y+16;yy++)for(let xx=x;xx<x+16;xx++){const color=rgb(p,xx,yy);if(!colors.has(color))colors.set(color,colors.size);pattern.push(colors.get(color));}return state.shapes.get(pattern.join(','))||null;};
  const validPhase=([dx,dy])=>{let count=0;for(const[x,y]of probes){const t=tileAt(x+dx,y+dy);if(t&&t.probe!==false&&++count>=3)return true;}return false;};
  let phase=validPhase(state.phase)?state.phase:null;
  if(!phase)for(let dy=0;dy<16&&!phase;dy++)for(let dx=0;dx<16;dx++)if(validPhase([dx,dy])){phase=[dx,dy];break;}
  if(!phase)for(const candidate of [state.phase,[0,0]]){let count=0;for(const[x,y]of probes)if(tileAt(x+candidate[0],y+candidate[1],true)?.probe!==false&&tileAt(x+candidate[0],y+candidate[1],true)&&++count>=3){phase=candidate;break;}if(phase)break;}
  if(!phase)return [];state.phase=phase;const found=[];
  for(let y=phase[1];y<=224;y+=16)for(let x=phase[0];x<=240;x+=16){const t=tileAt(x,y,true);if(t)found.push({...t,x,y});}
  const edge=(x,y,w,h,index,px,py)=>{const hash=global.DreamPatternTools.pixelHash(p,[x,y,w,h]),t=config.tiles.find(t=>t.edges?.[index]===hash);if(t)found.push({...t,x:px,y:py,edge:true});};
  if(phase[0]===8)for(let y=phase[1];y<=224;y+=16){edge(0,y,8,16,1,-8,y);edge(248,y,8,16,0,248,y);}
  if(phase[1]===8)for(let x=phase[0];x<=240;x+=16){edge(x,0,16,8,3,x,-8);edge(x,232,16,8,2,x,232);}
  return found;
 }
 function draw(c,assets,tiles,p,width,height){
  c.save();c.scale(width/256,height/240);
  for(const t of tiles){const image=assets.get(t.image);if(!image)continue;if(t.preserveBlack===false){c.drawImage(image,t.x,t.y,16,16);if(t.preserveWhite){c.fillStyle='#fff';for(let yy=0;yy<16;yy++)for(let xx=0;xx<16;xx++)if(rgb(p,t.x+xx,t.y+yy)===0xffffff)c.fillRect(t.x+xx,t.y+yy,1,1);}continue;}c.save();c.beginPath();
   // Preserve the original void and dashed grid pixels even if generated edges differ.
   for(let yy=0;yy<16;yy++){let start=-1;for(let xx=0;xx<=16;xx++){if(xx<16&&rgb(p,t.x+xx,t.y+yy)!==0){if(start<0)start=xx;}else if(start>=0){c.rect(t.x+start,t.y+yy,xx-start,1);start=-1;}}}
   c.clip();c.drawImage(image,t.x,t.y,16,16);c.restore();
  }c.restore();
 }
 function drawKai(c,p,width,height){
  c.save();c.scale(width/256,height/240);c.beginPath();
  for(let y=0;y<240;y++){let start=-1;for(let x=0;x<=256;x++){const v=x<256?rgb(p,x,y):-1,yes=v===0xffc4ea||(y>144&&(v===0xf7d8a5||v===0xffccc5));if(yes){if(start<0)start=x;}else if(start>=0){c.rect(start,y,x-start,1);start=-1;}}}c.clip();const sky=c.createLinearGradient(0,0,0,240);sky.addColorStop(0,'#b797d8');sky.addColorStop(.58,'#f5c5df');sky.addColorStop(.61,'#ffe4bf');sky.addColorStop(1,'#e3b68c');c.fillStyle=sky;c.fillRect(0,0,256,240);for(let i=0;i<16;i++){const x=(i*73)%280-12,y=154+i*5,g=c.createRadialGradient(x,y,0,x,y,35);g.addColorStop(0,'#fff5dfaa');g.addColorStop(1,'#fff5df00');c.fillStyle=g;c.fillRect(x-35,y-35,70,70);}c.restore();
  c.save();c.scale(width/256,height/240);
  for(let y=48;y<=160;y+=16)for(let x=64;x<=176;x+=16){if(x!==64&&x!==176&&y!==48&&y!==160)continue;let green=0,black=0,cream=0,other=0;for(let yy=y;yy<y+16;yy++)for(let xx=x;xx<x+16;xx++){const v=rgb(p,xx,yy);if(v===0x88d800)green++;else if(v===0)black++;else if((v===0xf7d8a5||v===0xffccc5))cream++;else other++;}if(other||!(green===144&&black===60||cream===126&&black===130))continue;const g=c.createLinearGradient(x,y,x+16,y+16);g.addColorStop(0,green?'#c7eb65':'#fff0bd');g.addColorStop(1,green?'#568d20':'#c99c58');c.fillStyle=g;c.fillRect(x+.6,y+.6,14.8,14.8);c.strokeStyle='#345725';c.lineWidth=.7;c.strokeRect(x+.5,y+.5,15,15);if(!green){c.fillStyle='#35290e';c.font='600 12px DreamDialogue,serif';c.textAlign='center';c.textBaseline='middle';c.fillText('修',x+8,y+8,13);}}
  c.restore();
 }
 global.DreamMapTools={validate,match,draw,drawKai};
})(typeof window!=='undefined'?window:globalThis);
