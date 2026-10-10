/* Explicit v9-to-v10 selected-slot copy. Ordinary load/import never calls this module. */
import {copyWide64V9SelectedSave} from './dbz-wide64-v10-selected-save-copy.mjs';
const SOURCE='cf2e6b9aef368f4ff8627c558f9d558db327ad76a572132353a7f05cfaab82e8';
async function json(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Edition information could not be read.');return r.json();}
async function rom(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('The matching edition ROM could not be read.');return new Uint8Array(await r.arrayBuffer());}
export async function copySelectedV9Save({state,sourceRom,targetRomId,manual}){
 if(manual!==true)throw Error('Choose the explicit selected-save copy action.');
 const targetEdition=await json('/dbz-wide64-v10-edition.json');if(targetEdition.romId!==targetRomId||targetEdition.selectedSaveCopySourceRomId!==SOURCE)throw Error('Wide64 v10 changed. Reload its entry before copying.');
 if(targetEdition.selectedSaveCopySourceEditionUrl!=='/dbz-wide64-v10-source-v9.json')throw Error('Unsupported source edition descriptor.');
 const sourceEdition=await json('/dbz-wide64-v10-source-v9.json');
 const source=sourceRom?new Uint8Array(sourceRom):await rom('/games/Dragon_Ball_Z_II_Wide64_NGPlus_v9.nes');
 const target=await rom('/games/Dragon_Ball_Z_II_Wide64_NGPlus_v10.nes');
 return copyWide64V9SelectedSave({state:new Uint8Array(state),romId:SOURCE,sourceRom:source,targetRom:target,sourceEdition,targetEdition,approval:{manual:true,operation:'copy-wide64-v9-to-v10',sourceRomId:SOURCE,targetRomId}});
}
