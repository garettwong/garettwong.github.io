/* Native mode-9 board: $04B8..$04BF are the eight actual outcome IDs.
 * $9B9C reads the chosen index from $6D and copies its outcome into $6E.
 * Faces were captured through the native reveal routine, without changing rewards. */
(()=>{'use strict';
 let api=null,board=null,timer=null,atlas=null;
 const names=["Vegeta", "Vegeta", "Bulma", "Korin", "Bulma", "Korin", "Oolong", "Oolong", "Yemma", "Porunga", "Ginyu", "Frieza", "Roshi", "Roshi", "Roshi", "Grandpa", "Guldo", "Guldo", "Grandpa", "Miss", "Oolong", "Cui", "Ginyu", "Miss"];
 function decode(ram){
  if(!ram||ram[0x2e]!==9||![2,3,4].includes(ram[0x30])||ram[0xd3]!==0)return null;
  const cards=Array.from(ram.subarray(0x4b8,0x4c0));if(cards.some(id=>id>23))return null;
  return {phase:ram[0x30],selected:ram[0x30]===4?ram[0x6d]:-1,cards};
 }
 function poll(){if(!api?.active())return;try{const s=new Uint8Array(api.gm().getState()),at=api.ramStart(s);board=at<0?null:decode(s.subarray(at,at+2048));}catch{board=null;}}
 function start(options){api=options;if(timer)clearInterval(timer);atlas=new Image();atlas.src='/dbz-scouter-cards.png?v=136';timer=setInterval(poll,80);poll();}
 function draw(ctx,width,height){
  if(!board||!atlas?.complete||!atlas.naturalWidth)return;
  ctx.save();ctx.scale(width/256,height/240);ctx.imageSmoothingEnabled=false;
  board.cards.forEach((id,i)=>{
   const x=48+(i%4)*48,y=40+Math.floor(i/4)*64;
   ctx.drawImage(atlas,(id%8)*32,Math.floor(id/8)*48,32,48,x,y,32,48);
   ctx.fillStyle='#080b13';ctx.fillRect(x,y+40,32,8);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='top';ctx.font='700 5.5px Arial,sans-serif';ctx.fillText(names[id],x+16,y+41,31);
   if(i===board.selected){ctx.strokeStyle='#fff6a0';ctx.lineWidth=1.5;ctx.strokeRect(x-2,y-2,36,52);}
  });
  if(board.phase===3){
   ctx.fillStyle='#f7d8a5';ctx.fillRect(67,166,170,53);ctx.fillStyle='#15151a';ctx.textAlign='left';ctx.font='700 7px Arial,sans-serif';ctx.fillText('All 8 cards revealed.',76,178);ctx.fillText('Press B to choose a card.',76,194);
  }
  ctx.restore();
 }
 window.DreamScouter={start,draw,decode,reset:()=>{board=null;},inspect:()=>board?{...board,cards:[...board.cards]}:null};
})();
