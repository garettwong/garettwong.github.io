/** Explicit v18 -> v19 selected-save copy. No storage or emulator mutation. */
import {unpackSelectedState,inspectNativeLayout,sha256,crc32} from './dbz-wide64-v10-selected-save-copy.mjs';
const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
const same=(b,at,v)=>v.every((x,i)=>b[at+i]===x);
export async function copyV18State({state,sourceRom,targetRom,sourceEdition,targetEdition,manual}){
 assert(manual===true,'Choose Copy v18 save to v19 explicitly.');
 const source=new Uint8Array(sourceRom),target=new Uint8Array(targetRom),sourceHash=await sha256(source),targetHash=await sha256(target);
 assert(sourceHash===sourceEdition.romId&&sourceHash===targetEdition.selectedSaveCopySourceRomId,'Unexpected source ROM.');assert(targetHash===targetEdition.romId,'Unexpected target ROM.');
 const input=new Uint8Array(state),original=input.slice(),parsed=unpackSelectedState(input),n=parsed.native,p=inspectNativeLayout(n),dv=new DataView(n.buffer,n.byteOffset,n.byteLength);
 assert(dv.getUint32(p.nfo,true)===sourceEdition.prgCrc32,'Save belongs to another ROM.');
 for(const [at,data]of sourceEdition.residentChecks)assert(same(n,p.wram+at,data),'Source code fingerprint does not match v18.');
 const phase=n[p.ram+0x2e],sub=n[p.ram+0x30];assert(phase===6||phase===1,'Save on the map or in battle before copying.');
 assert(same(n,p.registers,[0xd7,0xdc,0xfc])&&same(n,p.ram+0x1fd,[0x5f,0xd1,0x08]),'Save is inside an active CPU call. Save again at the map or battle menu.');
 assert((phase===6&&n[p.ram+76]===5)||(phase===1&&n[p.ram+76]===12),'Unsupported checkpoint bank.');
 const changed=[];for(const [at,data]of targetEdition.residentChecks)for(let i=0;i<data.length;i++){const address=p.wram+at+i;if(n[address]!==data[i]){n[address]=data[i];changed.push(address);}}
 // The changed routine never suspends at the verified idle PC/stack above.
 // Active battle saves are therefore safe to copy too. Only UI coordination bytes are reset. HP, BP, reserve ledger, cards,
 // forms, story progress, kills and pending reward state remain untouched.
 for(let i=0x13fd;i<=0x13ff;i++){n[p.wram+i]=0;changed.push(p.wram+i);}
 dv.setUint32(p.nfo,targetEdition.prgCrc32,true);
 const out=input.slice();let payload=0;if(parsed.wrapper){let found=false;for(let a=8;a+8<=out.length;){const tag=String.fromCharCode(...out.slice(a,a+4)),size=new DataView(out.buffer,out.byteOffset,out.byteLength).getUint32(a+4,true);if(tag==='MEM '){payload=a+8;found=true;break;}a+=8+Math.ceil(size/8)*8;}assert(found,'Native payload missing.');}
 out.set(n,payload);assert(same(input,0,original),'Source save changed.');
 return {state:out,receipt:{operation:'copy-wide64-v18-to-v19',sourceRomId:sourceHash,targetRomId:targetHash,phase,subphase:sub,changedNativeOffsets:changed,progressPreserved:true}};
}
