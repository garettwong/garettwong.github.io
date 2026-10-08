/* Explicit selected-slot copy. Ordinary load/import never calls this module. */
import {copyWide64V1SelectedSave,inspectWide64V1CopySource,WIDE64_V1_ROM_ID,sha256} from './dbz-wide64-v2-selected-save-copy.mjs';
async function json(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Edition information could not be read.');return r.json();}
async function rom(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('The matching edition ROM could not be read.');return new Uint8Array(await r.arrayBuffer());}
export async function copySelectedV1Save({state,sourceRom,targetRomId,manual}){
 if(manual!==true)throw Error('Choose the explicit selected-save copy action.');
 const targetEdition=await json('/dbz-wide64-v2-edition.json');if(targetEdition.romId!==targetRomId)throw Error('Wide64 v2 changed. Reload its entry before copying.');
 const sourceEdition=await json(targetEdition.selectedSaveCopySourceEditionUrl);
 const source=sourceRom?new Uint8Array(sourceRom):await rom('/games/Dragon_Ball_Z_II_Wide64_NGPlus_v1.nes');
 const target=await rom('/games/Dragon_Ball_Z_II_Wide64_NGPlus_v2.nes');
 return copyWide64V1SelectedSave({state:new Uint8Array(state),romId:WIDE64_V1_ROM_ID,sourceRom:source,targetRom:target,sourceEdition,targetEdition,approval:{manual:true,operation:'copy-wide64-v1-to-v2',sourceRomId:WIDE64_V1_ROM_ID,targetRomId}});
}
