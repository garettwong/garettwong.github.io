/* Expanded card values must not overwrite the original 15-byte map route. */
(()=>{'use strict';
const BASE=528, ROUTE=0x1c00, MARK=ROUTE+68, MAGIC=[67,82,84,50];
// Map mode owns this area beyond the expanded enemy pool's $7B9F end.
// The native writer stamps the format, so autosaves distinguish old routes.
const writer=[0x99,0,0x7c,0x48,...MAGIC.flatMap((n,i)=>[0xa9,n,0x8d,0x44+i,0x7c]),0x68,0x60];
const patches=[
 {offset:BASE+0x14792,old:[0x99,0xf9,4],bytes:[0x20,0x36,0xbf]},
 {offset:BASE+0x147dd,old:[0xb9,0xf9,4],bytes:[0xb9,0,0x7c]},
 {offset:BASE+0x17f36,old:Array(writer.length).fill(255),bytes:writer},
];
const same=(b,p,a)=>a.every((n,i)=>b[p+i]===n);
function chunk(b,tag,size){const h=[...tag].map(c=>c.charCodeAt(0)).concat([0,(size+1)&255,(size+1)>>8,0,0,0]);for(let i=0;i+size+9<=b.length;i++)if(same(b,i,h))return i+9;return -1;}
function prepareRom(b){
 for(const p of patches)if(!same(b,p.offset,p.old)&&!same(b,p.offset,p.bytes))throw Error('Expanded map routes do not match this game revision.');
 for(const p of patches)b.set(p.bytes,p.offset);
}
function upgradeState(input){
 const b=new Uint8Array(input).slice(),r=chunk(b,'RAM',2048),w=chunk(b,'WRM',8192);
 if(r<0||w<0||same(b,w+MARK,MAGIC))return b;
 if(b[r+0x2e]===6&&[3,4].includes(b[r+0x30])&&[1,3].includes(b[r+0x31])){
  const count=b[r+0x72];
  if(count<=15){
   b.set(b.slice(r+0x4f9,r+0x4f9+count),w+ROUTE);
  }else if(count<=68){
   // Old flights longer than 15 entries overwrote $0508..$050B. The
   // selected destination survives in $BE..$C1. Complete one native step
   // into that destination, letting the usual card/event dispatcher finish.
   const x=b[r+0xbe]|b[r+0xbf]<<8,y=b[r+0xc0]|b[r+0xc1]<<8;
   const startY=y>=16?y-16:y+16;
   b[r+0x509]=4;b[r+0x50a]=0;
   b.set([x&255,x>>8,startY&255,startY>>8],r+0x50b);
   b[r+0x71]=0;b[r+0x72]=1;b[r+0x31]=3;
   b[w+ROUTE]=y>=16?0x20:0x10;
  }
 }
 b.set(MAGIC,w+MARK);return b;
}
window.DreamCrazyRoute={prepareRom,upgradeState,patches,ROUTE,MARK,MAGIC};
})();
