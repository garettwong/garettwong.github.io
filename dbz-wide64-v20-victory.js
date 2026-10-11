/* Read-only presentation of the native victory reward. The cartridge applies BP on A. */
(function(global){'use strict';
let api=null,canvas=null,ctx=null,timer=0,shown=false,view=null,entries=0,lastError='';
let settling=false,nextPulse=0,settleStarted=0,pulses=0,keyTimer=0;
const decimal=(b,at)=>{let n=0n;for(let i=7;i>=0;i--)n=n*256n+BigInt(b[at+i]);return n.toString();};
const format=n=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');
function decode(input){
 const b=new Uint8Array(input),c=global.DreamWide64,r=c.chunk(b,'RAM',2048),w=c.chunk(b,'WRM',8192);
 // Phase $26 / subphase zero is the native BP result prompt. Later subphases
 // contain item rewards/story messages and retain their original presentation.
 if(r<0||w<0||b[r+0x2e]!==1||b[r+0x30]!==0x26||b[r+0x31]!==0||b[w+0x1c62]!==1||b[w+0x13fd]!==0)return null;
 const battle=global.DreamLargeBattle.decode(b);if(!battle||battle.remaining!==0)return null;
 return{total:battle.total,rewardBp:decimal(b,w+c.memory.rewardAddress-0x6000)};
}
function fit(){if(!canvas)return;const box=(global.dreamArtwork?.canvas||document.querySelector('#game canvas'))?.getBoundingClientRect();if(box)Object.assign(canvas.style,{left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.height+'px'});}
function create(){if(canvas)return;canvas=document.createElement('canvas');canvas.id='dbz-victory-reward';canvas.width=768;canvas.height=720;canvas.hidden=true;canvas.setAttribute('role','img');canvas.style.cssText='position:fixed;z-index:40;pointer-events:none;image-rendering:pixelated;';document.body.append(canvas);ctx=canvas.getContext('2d',{alpha:false});addEventListener('resize',fit);}
function draw(v){
 create();fit();canvas.hidden=false;canvas.setAttribute('aria-label',`Victory. ${v.total} enemies defeated. Battle reward ${format(v.rewardBp)} BP. ${settling?'Finishing party rewards.':'Press A to finish rewards.'}`);
 ctx.setTransform(3,0,0,3,0,0);ctx.fillStyle='#000';ctx.fillRect(0,0,256,240);ctx.fillStyle='#7429ff';ctx.fillRect(0,160,256,80);
 ctx.fillStyle='#ff6862';ctx.fillRect(18,35,220,181);ctx.fillStyle='#784d00';ctx.fillRect(20,37,216,177);ctx.fillStyle='#f7d9a7';ctx.fillRect(22,39,212,173);
 ctx.textAlign='center';ctx.fillStyle='#171005';ctx.font='700 16px monospace';ctx.fillText('VICTORY!',128,70);ctx.font='700 9px monospace';ctx.fillText(`${v.total} ${v.total===1?'ENEMY':'ENEMIES'} DEFEATED`,128,92);ctx.font='700 10px monospace';ctx.fillText('BATTLE REWARD',128,121);
 const amount=format(v.rewardBp);ctx.font='700 10px monospace';if(ctx.measureText(amount+' BP').width>194){ctx.font='700 9px monospace';ctx.fillText(amount,128,143,196);ctx.fillText('BP',128,157);}else ctx.fillText(amount+' BP',128,145);
 ctx.font='700 8px monospace';ctx.fillText(settling?'FINISHING PARTY REWARDS...':'PRESS A TO FINISH REWARDS',128,193);
}
function releaseKey(){if(keyTimer)clearTimeout(keyTimer);keyTimer=0;global.DreamInput?.input('victory-finish',0,8,0);}
function hide(){releaseKey();settling=false;shown=false;view=null;if(canvas)canvas.hidden=true;}
function rewardPhase(b){const c=global.DreamWide64,r=c.chunk(b,'RAM',2048),w=c.chunk(b,'WRM',8192);return r>=0&&w>=0&&b[r+0x2e]===1&&b[r+0x30]===38&&b[w+0x1c62]===1&&global.DreamLargeBattle.decode(b)?.remaining===0;}
function poll(){try{
 if(!api?.active()){releaseKey();if(settling)settleStarted=performance.now();return;}
 const b=new Uint8Array(api.gm().getState()),phase=rewardPhase(b),next=decode(b),now=performance.now();
 // Entry releases the attack's rapid-A lock. Only an actual advance beyond
 // the first reward prompt authorizes finishing the remaining native results.
 if(shown&&!next&&phase&&!settling){settling=true;settleStarted=now;nextPulse=now+140;pulses=0;}
 if(settling){
  if(!phase){hide();return;}
  if(now-settleStarted>30000){lastError='Reward messages did not finish. Press A to continue.';hide();return;}
  if(now>=nextPulse&&!keyTimer){global.DreamInput?.input('victory-finish',0,8,1);pulses++;nextPulse=now+180;keyTimer=setTimeout(releaseKey,24);}
  draw(view);return;
 }
 if(global.DreamGroupBlast?.isOpen())return;
 if(!next){hide();return;}if(!shown){api.release?.();entries++;}shown=true;view=next;draw(next);lastError='';
 }catch(e){lastError=String(e.message||e);hide();}}
function start(options){api=options;if(timer)clearInterval(timer);hide();timer=setInterval(poll,16);poll();}
function reset(){hide();entries=0;pulses=0;lastError='';}
global.DreamWide64Victory={decode,start,reset,isOpen:()=>shown,inspect:()=>({shown,view,entries,settling,pulses,lastError})};
})(typeof window==='undefined'?globalThis:window);
