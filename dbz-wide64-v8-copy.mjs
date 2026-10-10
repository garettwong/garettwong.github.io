/* Explicit v7-to-v8 selected-slot copy. Ordinary load/import never calls this module. */
import {copyWide64V7SelectedSave} from './dbz-wide64-v8-selected-save-copy.mjs';
const SOURCE='e8fdfe2e0a56dbafae48d67484f1ac12aceb6a466d4a03de800b3ac0a78a7b8e';
async function json(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Edition information could not be read.');return r.json();}
async function rom(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('The matching edition ROM could not be read.');return new Uint8Array(await r.arrayBuffer());}
export async function copySelectedV7Save({state,sourceRom,targetRomId,manual}){
 if(manual!==true)throw Error('Choose the explicit selected-save copy action.');
 const targetEdition=await json('/dbz-wide64-v8-edition.json');if(targetEdition.romId!==targetRomId||targetEdition.selectedSaveCopySourceRomId!==SOURCE)throw Error('Wide64 v8 changed. Reload its entry before copying.');
 if(targetEdition.selectedSaveCopySourceEditionUrl!=='/dbz-wide64-v8-source-v7.json')throw Error('Unsupported source edition descriptor.');
 const sourceEdition=await json('/dbz-wide64-v8-source-v7.json');
 const source=sourceRom?new Uint8Array(sourceRom):await rom('/games/Dragon_Ball_Z_II_Wide64_NGPlus_v7.nes');
 const target=await rom('/games/Dragon_Ball_Z_II_Wide64_NGPlus_v8.nes');
 return copyWide64V7SelectedSave({state:new Uint8Array(state),romId:SOURCE,sourceRom:source,targetRom:target,sourceEdition,targetEdition,approval:{manual:true,operation:'copy-wide64-v7-to-v8',sourceRomId:SOURCE,targetRomId}});
}
