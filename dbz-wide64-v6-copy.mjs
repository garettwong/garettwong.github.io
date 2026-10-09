/* Explicit v5-to-v6 selected-slot copy. Ordinary load/import never calls this module. */
import {copyWide64V5SelectedSave} from './dbz-wide64-v6-selected-save-copy.mjs';
const SOURCE='8041f35655658465e40abc62900ce6236d75912fd6bf78f213f351d32b8b501f';
async function json(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Edition information could not be read.');return r.json();}
async function rom(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('The matching edition ROM could not be read.');return new Uint8Array(await r.arrayBuffer());}
export async function copySelectedV5Save({state,sourceRom,targetRomId,manual}){
 if(manual!==true)throw Error('Choose the explicit selected-save copy action.');
 const targetEdition=await json('/dbz-wide64-v6-edition.json');if(targetEdition.romId!==targetRomId||targetEdition.selectedSaveCopySourceRomId!==SOURCE)throw Error('Wide64 v6 changed. Reload its entry before copying.');
 if(targetEdition.selectedSaveCopySourceEditionUrl!=='/dbz-wide64-v6-source-v5.json')throw Error('Unsupported source edition descriptor.');
 const sourceEdition=await json('/dbz-wide64-v6-source-v5.json');
 const source=sourceRom?new Uint8Array(sourceRom):await rom('/games/Dragon_Ball_Z_II_Wide64_NGPlus_v5.nes');
 const target=await rom('/games/Dragon_Ball_Z_II_Wide64_NGPlus_v6.nes');
 return copyWide64V5SelectedSave({state:new Uint8Array(state),romId:SOURCE,sourceRom:source,targetRom:target,sourceEdition,targetEdition,approval:{manual:true,operation:'copy-wide64-v5-to-v6',sourceRomId:SOURCE,targetRomId}});
}
