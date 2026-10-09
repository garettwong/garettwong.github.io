/* Explicit v4-to-v5 selected-slot copy. Ordinary load/import never calls this module. */
import {copyWide64V4SelectedSave} from './dbz-wide64-v5-selected-save-copy.mjs';
const SOURCE='7df00b932570baae95f4087a622a631480272a7ded22d77126fb40e7cd59435d';
async function json(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Edition information could not be read.');return r.json();}
async function rom(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('The matching edition ROM could not be read.');return new Uint8Array(await r.arrayBuffer());}
export async function copySelectedV4Save({state,sourceRom,targetRomId,manual}){
 if(manual!==true)throw Error('Choose the explicit selected-save copy action.');
 const targetEdition=await json('/dbz-wide64-v5-edition.json');if(targetEdition.romId!==targetRomId||targetEdition.selectedSaveCopySourceRomId!==SOURCE)throw Error('Wide64 v5 changed. Reload its entry before copying.');
 if(targetEdition.selectedSaveCopySourceEditionUrl!=='/dbz-wide64-v5-source-v4.json')throw Error('Unsupported source edition descriptor.');
 const sourceEdition=await json('/dbz-wide64-v5-source-v4.json');
 const source=sourceRom?new Uint8Array(sourceRom):await rom('/games/Dragon_Ball_Z_II_Wide64_NGPlus_v4.nes');
 const target=await rom('/games/Dragon_Ball_Z_II_Wide64_NGPlus_v5.nes');
 return copyWide64V4SelectedSave({state:new Uint8Array(state),romId:SOURCE,sourceRom:source,targetRom:target,sourceEdition,targetEdition,approval:{manual:true,operation:'copy-wide64-v4-to-v5',sourceRomId:SOURCE,targetRomId}});
}
