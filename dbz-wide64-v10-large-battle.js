/* Read-only full-roster view for the selectable-size battle ROM. */
(function(global){
'use strict';
const ROM='35fb39e8b495ee788aacd9519fa952df56ada686dd0d4f305d61632cb13033a5';
let api=null,timer=null,battle=null,lastError='';
const portraits=new Map();
const reserveSlots=[24667,24670,24673,24676,24679,24682,24685,24688,24691,24694,24697,24700,24703,24706,24709,24712,24715,24718,24721,24724,24727,24730,24733,24736,24739,24742,24745,24748,24751,24754,24757,24760,24763,24766,24769,24772,24775,24778,24781,24784,24787,25071,25074,25077,25080,25083,25280,25283,25286,25289,25292,25295,25298,25301,25304,25307,25310,25313,25316,25319,25322,25325,25328,25331,25334,25337,25340,25354,25357,25360,25363,25366,25369,25372,25375,25378,25381,25384,25387,25390,25393,25396,25399,25402,25405,25408,25411,25419,25422,25425,25428,25431,25434,25437,25440,25443,25446,25449,25452,25455,25458,25461,25464,25467,25470,25502,25505,25508,25511,25514,25517,25520,25523,25526,25529,25532,25535,25538,25541,25544,25547,25550,25553,25556,25559,25562,25565,25568,25571,25574,25577,25580,25583,25586,25589,25592,25595,25598,25601,25609,25612,25615,25618,25621,25624,25627,25630,25633,25697,25700,25703,25706,25709,25712,25715,25718,25721,25724,25727,25730,25733,25736,25739,25742,25745,25748,25751,25754,25757,25760,25763,25766,25769,25772,25775,25778,25781,25784,25787,25790,25793,25796,25799,25802,25805,25808,25811,25814,25817,25820,25823,25826,25829,25832,25998,26001,26004,26007,26010,26605,26608,26611,26614,26617,26620,27899,28138,28141,28144,28147,28150,28153,28156,28419,28422,28425,28428,28655,28658,28661,28664,28667,24800,24803,24806,24809,24812,24815,24829,24832,24835,24838,24841,24844,24847,24850,24853,24856,24859,24862,24865,24868,24871,24874,24893,24896,24899,24902,24905,24908,24911,24914,24917,24920,24923,24926,24929,24932,25913,25916,25919,25922,25925,25928,25931,25934,25937,25940,25943,25946,25949,25952,25955,25958,25961,25964,25967,25970,25973,25976,25979,25982,25985,25988,25991,29648,29651,29654,29657,29660,29663,29666,29669,29672,29675,29678,29681,29684,29687,29690];

function chunk(bytes,tag,size){
 for(let i=0;i+size+9<=bytes.length;i++){
  if(bytes[i]!==tag.charCodeAt(0)||bytes[i+1]!==tag.charCodeAt(1)||bytes[i+2]!==tag.charCodeAt(2)||bytes[i+3]!==0)continue;
  const length=bytes[i+4]+bytes[i+5]*256+bytes[i+6]*65536+bytes[i+7]*16777216;
  if(length===size+1&&bytes[i+8]===0)return bytes.subarray(i+9,i+9+size);
 }
 return null;
}

function decode(bytes){
 const ram=chunk(bytes,'RAM',2048),wram=chunk(bytes,'WRM',8192);
 if(!ram||!wram||ram[0x2e]!==1)return null;
 if(wram[0x1371]!==0xa5){
  const enemies=[];for(let i=0;i<5;i++){const at=0x2a2+i*18,id=ram[at],hp=ram[at+2]+256*ram[at+3];if(id>=0x80)continue;enemies.push({index:i,id,type:ram[at+12]&63,hp,alive:id<64&&hp>0});}
  return enemies.length?{total:enemies.length,page:0,phase:ram[0x30],selected:-1,enemies,remaining:enemies.filter(e=>e.alive).length,original:true}:null;
 }
 const total=wram[0x1372],page=wram[0x1370];
 const full=wram[0x1398]+256*wram[0x1399],pending=wram[0x1396]+256*wram[0x1397],loaded=wram[0x139a]+256*wram[0x139b],waves=wram[0x13b5]===0xb8&&full>100&&full<=400&&pending+loaded===full&&loaded>=total;
 const revision=wram[0x1394],limit=revision===0x82?100:40;
 if(total<(waves?1:10)||total>limit||page>=Math.ceil((waves?full-loaded+total:total)/5)||(total>20&&revision!==0x81&&revision!==0x82))return null;
 const enemies=[];
 for(let i=0;i<total;i++){
  // The current page can have newer combat results than its stored pool copy.
  const current=Math.floor(i/5)===page&&(!waves||wram[0x13cf]===page);
  const data=current?ram:wram,at=current?0x2a2+(i%5)*18:i<20?0x1200+i*18:0x1600+(i-20)*18;
  const id=data[at],hp=data[at+2]+256*data[at+3];
  enemies.push({index:i,id,type:data[at+12]&0x3f,hp,alive:id<0x40&&hp>0});
 }
 const reserve=[];
 if(waves&&wram[0x13c1]===0xa0){
  for(let global=loaded;global<full;global++){
   const current=Math.floor((global-(loaded-total))/5)===page&&wram[0x13cf]===page,slot=(global-(loaded-total))%5;
   const at=reserveSlots[global-100]-0x6000,hp=current?ram[0x2a4+slot*18]+256*ram[0x2a5+slot*18]:wram[at]+256*wram[at+1];
   reserve.push({index:global,hp,alive:hp>0});
  }
 }
 return {total:waves?full:total,batch:total,pending:waves?pending:0,offset:waves?loaded-total:0,page,phase:ram[0x30],selected:ram[0x30]===8?page*5+ram[0x70]:-1,enemies,reserve,remaining:enemies.filter(e=>e.alive).length+(waves?(wram[0x13c1]===0xa0?reserve.filter(e=>e.alive).length:pending):0)};
}

function animation(){return !!battle && battle.phase>=32 && battle.phase<=39;}

function poll(){
 if(!api?.active())return;
 try{battle=decode(new Uint8Array(api.gm().getState()));lastError='';}
 catch(error){battle=null;lastError=String(error.message||error);}
}

function start(options){
 api=options;if(timer)clearInterval(timer);
 // Poll outside the emulator's rendering callback: save-state reads are not reentrant.
 timer=setInterval(poll,125);poll();
}
function reset(){battle=null;portraits.clear();}

function cachePortraits(pixels,b){
 if(b.original||b.phase<2||b.phase>9)return;
 for(let slot=0;slot<5;slot++){
  const enemy=b.enemies[b.page*5+slot];if(!enemy?.alive||portraits.has(enemy.type))continue;
  const sx=48+slot*32,sy=112,rgba=new Uint8ClampedArray(32*32*4);let lit=0;
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){
   const from=((sy+y)*256+sx+x)*4,to=(y*32+x)*4;
   rgba.set(pixels.subarray(from,from+4),to);
   if(Math.max(rgba[to],rgba[to+1],rgba[to+2])>80)lit++;
  }
  if(lit<100)continue;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=32;
  canvas.getContext('2d').putImageData(new ImageData(rgba,32,32),0,0);
  portraits.set(enemy.type,canvas);
 }
}

function draw(ctx,pixels,width,height){
 const b=battle;if(!b)return;
 if(animation()){
  ctx.save();ctx.scale(width/256,height/240);ctx.fillStyle='rgba(5,7,12,.85)';ctx.fillRect(4,4,78,20);
  ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle='#ffe29a';ctx.font='700 6px Arial,sans-serif';ctx.fillText('OPPONENTS LEFT',8,7);
  ctx.fillStyle='#fff';ctx.font='700 9px Arial,sans-serif';ctx.fillText(`${b.remaining} / ${b.total}`,8,14);ctx.restore();return;
 }
 if(b.original||b.phase<2||b.phase>9)return;
 cachePortraits(pixels,b);
 ctx.save();ctx.scale(width/256,height/240);
 ctx.fillStyle='#05070c';ctx.fillRect(0,94,256,68);
 ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.font='700 7px Arial,sans-serif';
 ctx.fillStyle='#ffe29a';ctx.fillText(`${b.total} OPPONENTS · ${b.remaining} REMAINING`,128,102);
 const hundred=b.total>40,columns=hundred?20:10,cell=hundred?12.4:24,rows=Math.ceil(b.enemies.length/columns);
 for(const enemy of b.enemies){
  const row=Math.floor(enemy.index/columns),column=enemy.index%columns;
  const inRow=Math.min(columns,b.enemies.length-row*columns),left=(256-inRow*cell)/2;
  const compact=rows>2,size=hundred?7:compact?10:18,step=hundred?10.5:compact?14:27;
  const x=left+column*cell+(hundred?0:(cell-size)/2),y=106+row*step;
  const selected=enemy.index===b.selected,portrait=portraits.get(enemy.type);
  ctx.globalAlpha=enemy.alive?1:.3;
  if(portrait){ctx.imageSmoothingEnabled=false;ctx.drawImage(portrait,x,y,size,size);}
  else{ctx.fillStyle='#415272';ctx.fillRect(x,y,size,size);ctx.fillStyle='#fff';ctx.font='700 8px Arial';ctx.fillText(String(enemy.index+1+(b.offset||0)),x+size/2,y+size*.75);}
  ctx.globalAlpha=1;
  if(selected){ctx.strokeStyle='#ffd45e';ctx.lineWidth=1.5;ctx.strokeRect(x-1,y-1,size+2,size+2);}
  if(!enemy.alive){ctx.strokeStyle='#f47272';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+3,y+3);ctx.lineTo(x+size-2,y+size-2);ctx.moveTo(x+size-2,y+3);ctx.lineTo(x+3,y+size-2);ctx.stroke();}
  ctx.font=hundred?'600 3.5px Arial,sans-serif':'600 5.5px Arial,sans-serif';ctx.fillStyle=selected?'#ffd45e':enemy.alive?'#f0f3fa':'#8b91a0';
  ctx.fillText(`${enemy.index+1+(b.offset||0)}`,hundred?x+size+2.6:compact?x+size+4:x+size/2,hundred?y+5.5:compact?y+8:y+24);
 }
 ctx.restore();
}

global.DreamLargeBattle={ROM,start,reset,draw,decode,animation,inspect:()=>battle?{...battle,enemies:battle.enemies.map(e=>({...e})),portraits:portraits.size,error:lastError}:null};
})(typeof window==='undefined'?globalThis:window);
