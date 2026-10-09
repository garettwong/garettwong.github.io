/* Explicit v2-to-v4 selected-slot copy. Ordinary load/import never calls this module. */
import {copyWide64V2SelectedSave} from './dbz-wide64-v4-selected-save-copy.mjs';
const SOURCE='aac50b54117526a75690d8a1145c2d4d72811017730bcb0e17c0e550a1e9663e';
async function json(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Edition information could not be read.');return r.json();}
async function rom(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('The matching edition ROM could not be read.');return new Uint8Array(await r.arrayBuffer());}
export async function copySelectedV2Save({state,sourceRom,targetRomId,manual}){
 if(manual!==true)throw Error('Choose the explicit selected-save copy action.');
 const targetEdition=await json('/dbz-wide64-v4-edition.json');if(targetEdition.romId!==targetRomId||targetEdition.selectedSaveCopySourceRomId!==SOURCE)throw Error('Wide64 v4 changed. Reload its entry before copying.');
 if(targetEdition.selectedSaveCopySourceEditionUrl!=='/dbz-wide64-v4-source-v2.json')throw Error('Unsupported source edition descriptor.');
 const sourceEdition=await json('/dbz-wide64-v4-source-v2.json');
 const source=sourceRom?new Uint8Array(sourceRom):await rom('/games/Dragon_Ball_Z_II_Wide64_NGPlus_v2.nes');
 const target=await rom('/games/Dragon_Ball_Z_II_Wide64_NGPlus_v4.nes');
 return copyWide64V2SelectedSave({state:new Uint8Array(state),romId:SOURCE,sourceRom:source,targetRom:target,sourceEdition,targetEdition,approval:{manual:true,operation:'copy-wide64-v2-to-next-graphics',sourceRomId:SOURCE,targetRomId}});
}
