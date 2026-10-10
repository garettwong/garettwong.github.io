import {copyV10State} from './dbz-wide64-v11-selected-save-copy.mjs';
async function get(url,binary=false){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('The matching edition could not be read.');return binary?new Uint8Array(await r.arrayBuffer()):r.json();}
export async function copySelectedV10Save({state,sourceRom,targetRomId,manual}){
 const [sourceEdition,targetEdition,targetRom]=await Promise.all([get('/dbz-wide64-v11-source-v10.json'),get('/dbz-wide64-v11-edition.json'),get('/games/Dragon_Ball_Z_II_Wide64_NGPlus_v11.nes',true)]);
 if(targetEdition.romId!==targetRomId)throw Error('V11 changed. Reload the page before copying.');
 return copyV10State({state,sourceRom:sourceRom||await get('/games/Dragon_Ball_Z_II_Wide64_NGPlus_v10.nes',true),targetRom,sourceEdition,targetEdition,manual});
}
