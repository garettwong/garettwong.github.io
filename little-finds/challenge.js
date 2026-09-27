import {SCENES as ORIGINAL,findHit} from './scenes.js?v=84';
export {findHit};
export const TYPES=['Tiny key','Little leaf','Heart charm','Star charm','Small button','Mini bow','Little feather','Tiny mushroom','Small shell','Moon charm'];
export function charm(g,type,x,y,r){g.save();g.translate(x,y);g.scale(r/10,r/10);g.lineWidth=1.7;g.lineJoin='round';g.strokeStyle='#604f37';g.fillStyle=['#c6a15a','#8a9a59','#ba7c66','#ceb673','#9c9980','#aa876a','#bdb394','#b48e6a','#cfb993','#b6a06e'][type];g.beginPath();
if(type===0){g.arc(-4,-3,4,0,7);g.moveTo(-1,0);g.lineTo(7,7);g.lineTo(9,5);g.moveTo(4,4);g.lineTo(6,2);}
if(type===1){g.moveTo(-8,7);g.quadraticCurveTo(-10,-7,8,-8);g.quadraticCurveTo(10,6,-8,7);g.moveTo(-6,5);g.lineTo(6,-6);}
if(type===2){g.moveTo(0,8);g.bezierCurveTo(-18,-3,-6,-14,0,-5);g.bezierCurveTo(6,-14,18,-3,0,8);}
if(type===3){for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,R=i%2?4:10;g.lineTo(Math.cos(a)*R,Math.sin(a)*R);}g.closePath();}
if(type===4){g.arc(0,0,8,0,7);}
if(type===5){g.moveTo(0,0);g.lineTo(-9,-6);g.lineTo(-8,7);g.lineTo(8,-7);g.lineTo(9,6);g.closePath();}
if(type===6){g.ellipse(0,-1,4,10,.55,0,7);g.moveTo(-5,9);g.lineTo(4,-8);}
if(type===7){g.rect(-2,0,4,9);g.moveTo(-9,1);g.quadraticCurveTo(-8,-14,8,1);g.closePath();}
if(type===8){g.moveTo(-5,7);g.lineTo(-9,-2);g.bezierCurveTo(-10,-12,10,-12,9,-2);g.lineTo(5,7);g.closePath();g.moveTo(0,6);g.lineTo(0,-7);}
if(type===9){g.arc(0,0,9,.5,5.8);g.quadraticCurveTo(-6,0,8,4);}
g.fill();g.stroke();if(type===4){g.fillStyle='#604f37';for(const a of [-2,2])for(const b of [-2,2])g.fillRect(a,b,1.5,1.5);}g.restore();}
const REGIONS=[[[8,12,90,930],[100,8,370,145],[390,155,87,360],[95,475,375,470]],[[8,10,112,930],[405,15,73,910],[150,20,280,115],[110,585,290,357]],[[10,8,91,930],[407,10,77,925],[105,8,297,145],[104,745,296,195]]];
export const SCENES=ORIGINAL.map((s,index)=>{let seed=9851+index*71;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};const items=[];for(let n=0;n<100;n++){let x,y;for(let attempt=0;attempt<1000;attempt++){const box=REGIONS[index][Math.floor(rand()*REGIONS[index].length)];x=box[0]+rand()*box[2];y=box[1]+rand()*box[3];if(items.every(t=>Math.hypot(x-t[2],y-t[3])>19))break;}const type=n%10,r=3.8+rand()*1.8;items.push([`hard-${n}`,TYPES[type],x,y,r+2,r+2,type,r,rand()*1.8-.9]);}return {...s,items};});
