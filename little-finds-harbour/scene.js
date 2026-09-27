export const W=1536,H=1024,VERSION=1;
export const types={bun:'Pineapple buns',cup:'Blue tea cups',jar:'Strawberry jam',lemon:'Lemons',carrot:'Carrots',teapot:'Blue teapots',duck:'Rubber ducks',can:'Watering cans',gloves:'Garden gloves',cat:'Sleepy cats',boots:'Garden boots',scissors:'Blue scissors',pin:'Rolling pins'};
// Each tuple is left, contact baseline, opaque width, optional rotation.
// Coordinates refer to the 1536 x 1024 background, not screen pixels.
const places={
 bun:[[20,328,40],[17,379,42],[140,453,43],[193,450,40],[207,643,45],[376,733,40]],
 cup:[[144,187,40],[166,643,44],[885,499,42],[895,659,56],[120,104,40]],
 jar:[[34,98,38],[91,108,36],[276,175,40],[345,244,38],[286,635,44]],
 lemon:[[382,174,29],[1438,465,31],[1480,468,30],[1395,565,33],[1360,705,31]],
 carrot:[[1435,574,48,-12],[1485,584,48,6],[1390,458,46,-10],[1465,838,50,5],[286,724,45,0]],
 teapot:[[357,650,85],[937,497,78],[691,655,108]],
 duck:[[350,92,30],[1295,697,32],[1052,480,26]],
 can:[[1350,555,72],[1165,880,72],[228,866,67]],
 gloves:[[111,660,44],[1410,694,48],[304,871,48]],
 cat:[[72,838,150],[1110,1006,160],[1218,390,100]],
 boots:[[1290,976,76],[479,944,65],[384,964,64]],
 scissors:[[606,661,38],[267,669,44],[1482,929,43]],
 pin:[[56,480,94],[285,422,79],[180,485,85]]
};
export const objects=Object.entries(places).flatMap(([type,points])=>points.map(([x,base,w,rotation=0],i)=>({id:`${type}-${i+1}`,type,x,base,w,rotation})));
export function layoutObjects(metadata){return objects.map(o=>{const m=metadata[o.type],b=m.bounds,h=o.w*(b[3]-b[1])/(b[2]-b[0]);return {...o,y:o.base-h,h};}).sort((a,b)=>a.base-b.base);}
export function validFound(values){const ids=new Set(objects.map(o=>o.id));return new Set(Array.isArray(values)?values.filter(v=>ids.has(v)):[]);}
export function collect(found,id){if(!objects.some(o=>o.id===id)||found.has(id))return false;found.add(id);return true;}
export function counts(found,type){const group=objects.filter(o=>o.type===type);return {found:group.filter(o=>found.has(o.id)).length,total:group.length};}
export function localPoint(o,x,y){const angle=-o.rotation*Math.PI/180,dx=x-(o.x+o.w/2),dy=y-(o.y+o.h/2);return {x:(dx*Math.cos(angle)-dy*Math.sin(angle))/o.w+.5,y:(dx*Math.sin(angle)+dy*Math.cos(angle))/o.h+.5};}
export function clampCamera(c,width,height){c.x=W*c.s<=width?(width-W*c.s)/2:Math.max(width-W*c.s,Math.min(0,c.x));c.y=H*c.s<=height?(height-H*c.s)/2:Math.max(height-H*c.s,Math.min(0,c.y));return c;}
