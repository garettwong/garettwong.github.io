/* Exact original terrain tiles, with camera-phase discovery. No game memory access. */
(function(global){
 'use strict';
 const states=new WeakMap(),points=[[0,0],[8,8],[15,15],[3,11]],probes=[[32,32],[96,32],[160,32],[32,80],[96,80],[160,80],[208,128],[80,128]];
 const rgb=(p,x,y)=>{const i=(y*256+x)*4;return p[i]*65536+p[i+1]*256+p[i+2];};
 function validate(p){
  if(p?.version!==1||p.tileSize!==16||!Array.isArray(p.tiles)||p.tiles.length>128)throw new Error('Invalid terrain tiles');
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
  const validPhase=([dx,dy])=>{let count=0;for(const[x,y]of probes)if(tileAt(x+dx,y+dy)&&++count>=3)return true;return false;};
  let phase=validPhase(state.phase)?state.phase:null;
  if(!phase)for(let dy=0;dy<16&&!phase;dy++)for(let dx=0;dx<16;dx++)if(validPhase([dx,dy])){phase=[dx,dy];break;}
  if(!phase)for(const candidate of [state.phase,[0,0]]){let count=0;for(const[x,y]of probes)if(tileAt(x+candidate[0],y+candidate[1],true)&&++count>=3){phase=candidate;break;}if(phase)break;}
  if(!phase)return [];state.phase=phase;const found=[];
  for(let y=phase[1];y<=224;y+=16)for(let x=phase[0];x<=240;x+=16){const t=tileAt(x,y,true);if(t)found.push({...t,x,y});}
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
 global.DreamMapTools={validate,match,draw};
})(typeof window!=='undefined'?window:globalThis);
