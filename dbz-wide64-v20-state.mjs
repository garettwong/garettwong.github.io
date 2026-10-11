/* Strict emulator-container boundary. The migration engine only sees bare NST. */
const bytes = input => input instanceof Uint8Array ? new Uint8Array(input.buffer,input.byteOffset,input.byteLength) : new Uint8Array(input);
const same = (b,p,s) => p>=0 && p+s.length<=b.length && [...s].every((c,i)=>b[p+i]===c.charCodeAt(0));
const u32 = (b,p) => new DataView(b.buffer,b.byteOffset,b.byteLength).getUint32(p,true);
const put32 = (b,p,v) => new DataView(b.buffer,b.byteOffset,b.byteLength).setUint32(p,v,true);
const assert=(ok,text)=>{if(!ok)throw Error(text);};
export function unpackState(input) {
 const b=bytes(input);assert(b.length>=16&&b.length<=16*1024*1024,'Invalid save-state size');
 if(same(b,0,'NST\x1a'))return {native:b.slice(),format:'nestopia',wrapper:null};
 assert(same(b,0,'RASTATE')&&b[7]===1,'Unsupported emulator save wrapper');
 let p=8,mem=null,ended=false;const sections=[];
 while(p+8<=b.length){
  const tag=String.fromCharCode(...b.subarray(p,p+4)),size=u32(b,p+4),start=p+8,end=start+size,padded=start+Math.ceil(size/8)*8;
  assert(end<=b.length&&padded<=b.length,'Truncated emulator save section');
  assert(/^[A-Z0-9 ]{4}$/.test(tag),'Invalid emulator save section');
  if(tag==='END '){assert(size===0&&padded===b.length,'Invalid emulator save terminator');ended=true;sections.push({tag,raw:b.slice(p,padded)});break;}
  if(tag==='MEM '){assert(!mem&&same(b,start,'NST\x1a'),'Invalid or duplicate Nestopia memory section');mem=b.slice(start,end);}
  sections.push({tag,raw:b.slice(p,padded)});p=padded;
 }
 assert(ended&&mem,'Missing emulator memory or terminator');
 return {native:mem,format:'retroarch-v1',wrapper:{header:b.slice(0,8),sections}};
}
export function rewrapState(nativeInput,templateInput) {
 const native=bytes(nativeInput);assert(same(native,0,'NST\x1a'),'Expected a Nestopia state');
 const template=unpackState(templateInput);if(!template.wrapper)return native.slice();
 const size=Math.ceil(native.length/8)*8,mem=new Uint8Array(8+size);mem.set([77,69,77,32]);put32(mem,4,native.length);mem.set(native,8);
 const parts=[template.wrapper.header,...template.wrapper.sections.map(s=>s.tag==='MEM '?mem:s.raw)];
 const out=new Uint8Array(parts.reduce((n,b)=>n+b.length,0));let offset=0;for(const part of parts){out.set(part,offset);offset+=part.length;}return out;
}
export function stateChunks(input){
 const {native}=unpackState(input),out={};
 for(const [tag,size,key]of [['RAM',2048,'ram'],['WRM',8192,'wram']]){
  let found=-1;
  for(let p=8;p+9+size<=native.length;p++)if(same(native,p,tag+'\0')&&u32(native,p+4)===size+1&&native[p+8]===0){assert(found<0,'Ambiguous '+tag+' memory chunk');found=p+9;}
  assert(found>=0,'Missing '+tag+' memory chunk');out[key]=found;
 }
 assert(out.ram+2048<=out.wram||out.wram+8192<=out.ram,'Overlapping memory chunks');return {...out,native};
}
