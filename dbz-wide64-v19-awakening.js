/* Native kill counters request a cut-in; only its acknowledged queue bit is edited. */
(()=>{'use strict';
const DURATION=4200,SSJ1='/packs/wide64-v19-nameplates-v2.png',SSJ2='/packs/wide64-v19-ssj2-portraits.png';
const load=url=>new Promise((yes,no)=>{const img=new Image();img.onload=()=>yes(img);img.onerror=()=>no(Error('Transformation portrait could not load.'));img.src=url;});
let portraits=null,api=null,canvas=null,context=null,busy=false,token=0,raf=0,unlock=null,pending=null,lastError='',sequence=0;
const ready=Promise.all([load(SSJ1),load(SSJ2)]).then(images=>{portraits=images;return true;});ready.catch(()=>{});
function decode(input){const b=new Uint8Array(input),c=window.DreamWide64;c.validateNative(b);const r=c.chunk(b,'RAM',2048),w=c.chunk(b,'WRM',8192);if(r<0||w<0||b[r+0x2e]!==1)return null;const queue=b[w+0x13be]&3,forms=b[w+0x15ae],bits=[1,2].filter(bit=>(queue&bit)&&(forms&bit)&&(forms&bit*4)&&b[w+0x13bb+(bit===1?0:1)]>=10);return bits.length?{b,r,w,queue,forms,bit:bits[0],actor:bits[0]===1?1:3}:null;}
function acknowledge(input,actor){const v=decode(input);if(!v||v.actor!==actor)throw Error('The battle changed during the transformation.');const out=v.b.slice();out[v.w+0x13be]&=~v.bit;return out;}
function pose(ctx,actor,stage,x,y,w,h){const image=portraits[stage===2?1:0],rect=stage===2?(actor===1?[24,0,863,887]:[998,0,715,887]):(actor===1?[91,674,545,511]:[750,719,400,467]);const [sx,sy,sw,sh]=rect,scale=Math.min(w/sw,h/sh),dw=sw*scale,dh=sh*scale;ctx.drawImage(image,sx,sy,sw,sh,x+(w-dw)/2,y+h-dh,dw,dh);}
function draw(ctx,actor,elapsed,reduced=false){
 const rect=ctx.canvas===canvas?canvas.getBoundingClientRect():null,aspect=rect&&rect.width?rect.height*256/(rect.width*240):1;
 const t=Math.min(1,elapsed/DURATION),stage=elapsed<650?1:2,entry=Math.min(1,elapsed/250),exit=Math.min(1,(DURATION-elapsed)/300),pulse=reduced?0:Math.max(0,Math.sin(elapsed/145))*0.3;
 ctx.clearRect(0,0,256,240);ctx.fillStyle='rgba(0,0,0,.58)';ctx.fillRect(0,0,256,240);ctx.save();ctx.globalAlpha=Math.max(0,Math.min(entry,exit));
 const top=62,bottom=172;ctx.fillStyle='#080d1b';ctx.fillRect(0,top,256,bottom-top);ctx.fillStyle=pulse>.15?'#563914':'#2d2418';ctx.fillRect(0,top+3,256,bottom-top-6);
 // The native long cut-in's horizontal streaks sweep eight pixels per beat.
 for(let i=0;i<18;i++){const y=top+7+i*5.5,shift=reduced?0:(Math.floor(elapsed/55)*8+i*23)%280;ctx.fillStyle=i%3===0?'#ffe8a6':i%3===1?'#ab640e':'#f1b82c';ctx.fillRect(240-shift,y,75+(i%4)*24,i%3===0?1:2);ctx.fillRect(-40-shift,y,90,1);}
 const shade=ctx.createLinearGradient(92,0,250,0);shade.addColorStop(0,'rgba(4,9,20,.2)');shade.addColorStop(.3,'rgba(4,9,20,.95)');shade.addColorStop(1,'rgba(4,9,20,.98)');ctx.fillStyle=shade;ctx.fillRect(90,top+3,166,bottom-top-6);
 ctx.strokeStyle='#ffe394';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,top);ctx.lineTo(256,top);ctx.moveTo(0,bottom);ctx.lineTo(256,bottom);ctx.stroke();
 if(stage===2){ctx.save();ctx.strokeStyle=pulse>.1?'#d9ffff':'#54c8ff';ctx.lineWidth=1.1;for(const x of [12,103,247]){ctx.beginPath();ctx.moveTo(x,top+8);ctx.lineTo(x-7,top+27);ctx.lineTo(x+4,top+35);ctx.lineTo(x-6,top+64);ctx.lineTo(x+5,bottom-9);ctx.stroke();}ctx.restore();}
 ctx.save();ctx.translate(63,0);ctx.scale(Math.min(1,aspect),1);ctx.translate(-63,0);pose(ctx,actor,stage,4+(reduced?0:Math.sin(elapsed/35)*(1-t)),42,118,130);ctx.restore();
 ctx.save();ctx.translate(185,0);ctx.scale(Math.min(1,aspect),1);ctx.translate(-185,0);
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff5cf';ctx.font=`900 ${aspect<.6?16:10}px Arial,sans-serif`;ctx.fillText(actor===1?'GOKU':'GOHAN',186,85);
 ctx.fillStyle=stage===2?'#ffe66d':'#ffffff';ctx.font=`900 ${aspect<.6?17:11}px Arial,sans-serif`;ctx.fillText(stage===2?'SUPER SAIYAN II':'SUPER SAIYAN I',185,111,133/Math.min(1,aspect));
 ctx.fillStyle='#beeaff';ctx.font=`700 ${aspect<.6?11:7}px Arial,sans-serif`;ctx.fillText('10 ENEMIES DEFEATED',185,133,133/Math.min(1,aspect));ctx.fillStyle='#fff';ctx.font=`900 ${aspect<.6?14:9}px Arial,sans-serif`;ctx.fillText('BP ×100 FROM SSJ I',185,151,133/Math.min(1,aspect));
 ctx.restore();
 if(!reduced&&elapsed>=600&&elapsed<780){ctx.fillStyle=`rgba(255,250,210,${.45*(1-Math.abs(elapsed-690)/90)})`;ctx.fillRect(0,top,256,bottom-top);}
 ctx.restore();return stage;
}
function fit(){if(!canvas)return;const rect=(window.dreamArtwork?.canvas||document.querySelector('#game canvas'))?.getBoundingClientRect();if(!rect)return;Object.assign(canvas.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});}
function create(){if(canvas)return;canvas=document.createElement('canvas');canvas.id='dbz-ssj2-banner';canvas.width=768;canvas.height=720;canvas.hidden=true;canvas.setAttribute('role','img');canvas.style.cssText='position:fixed;z-index:40;pointer-events:auto;touch-action:none;';canvas.addEventListener('pointerdown',e=>e.preventDefault());document.body.append(canvas);context=canvas.getContext('2d');addEventListener('resize',fit);}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function animate(actor,current){return new Promise(resolve=>{let elapsed=0,previous=performance.now();const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const step=now=>{if(current!==token){resolve(false);return;}const dt=now-previous;previous=now;if(!document.hidden&&api.active())elapsed+=Math.min(dt,80);fit();context.setTransform(3,0,0,3,0,0);const stage=draw(context,actor,elapsed,reduced);canvas.dataset.actor=String(actor);canvas.dataset.stage=String(stage);canvas.dataset.elapsed=String(Math.round(elapsed));if(elapsed>=DURATION){resolve(true);return;}raf=requestAnimationFrame(step);};raf=requestAnimationFrame(step);});}
async function play(v){
 if(busy)return;busy=true;const current=++token;create();canvas.hidden=false;canvas.setAttribute('aria-label',`${v.actor===1?'Goku':'Gohan'} transforms into Super Saiyan II. Battle power multiplied by one hundred.`);api.release();unlock=api.beginConfirmation?.();api.pause();
 try{
  await ready;while(v&&current===token){
   api.status(`${v.actor===1?'Goku':'Gohan'}: Super Saiyan II — 100× Super Saiyan I BP.`);
   if(!await animate(v.actor,current))return;
   const gm=api.gm(),before=gm.getFrameNum(),state=acknowledge(gm.getState(),v.actor),name=`ssj2-ack-${++sequence}.state`;
   gm.FS.writeFile('/'+name,state);gm.functions.loadState(name,0);api.advance();
   const deadline=performance.now()+5000;let consumed=false;
   while(current===token&&performance.now()<deadline){await delay(10);const b=gm.getState(),w=window.DreamWide64.chunk(b,'WRM',8192);if(gm.getFrameNum()>before&&!(b[w+0x13be]&v.bit)){consumed=true;break;}}
   try{gm.FS.unlink('/'+name);}catch{}if(current!==token)return;api.pause();if(!consumed)throw Error('The transformation animation could not resume. Load your last save and try again.');
   api.resetFrame();v=decode(gm.getState());
  }
 }catch(error){lastError=error.message;api.status(error.message);}
 finally{if(current===token){canvas.hidden=true;busy=false;unlock?.();unlock=null;pending=null;api.resume();}}
}
function poll(){if(api&&api.active()&&!busy){try{const v=decode(api.gm().getState());if(v){pending=play(v);pending.catch(error=>{lastError=error.message;});}}catch{}}setTimeout(poll,30);}
function reset(){token++;if(canvas)canvas.hidden=true;busy=false;unlock?.();unlock=null;pending=null;}
function settled(){if(!pending&&api&&!busy){const v=decode(api.gm().getState());if(v)pending=play(v);}return pending||Promise.resolve();}
function start(options){api=options;create();poll();}
window.DreamWide64Awakening={ready,decode,acknowledge,draw,pose,start,reset,isOpen:()=>busy,whenSettled:settled,inspect:()=>({busy,lastError,duration:DURATION})};
})();
