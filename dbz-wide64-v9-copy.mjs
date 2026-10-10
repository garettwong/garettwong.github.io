/* Explicit v8-to-v9 selected-slot copy. Ordinary load/import never calls this module. */
import {copyWide64V8SelectedSave} from './dbz-wide64-v9-selected-save-copy.mjs';
const SOURCE='1d42c093625251cd2c7c07d6ac87b115bb0e02e9e7b5441f000200162dd027c6';
async function json(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Edition information could not be read.');return r.json();}
async function rom(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('The matching edition ROM could not be read.');return new Uint8Array(await r.arrayBuffer());}
export async function copySelectedV8Save({state,sourceRom,targetRomId,manual}){
 if(manual!==true)throw Error('Choose the explicit selected-save copy action.');
 const targetEdition=await json('/dbz-wide64-v9-edition.json');if(targetEdition.romId!==targetRomId||targetEdition.selectedSaveCopySourceRomId!==SOURCE)throw Error('Wide64 v9 changed. Reload its entry before copying.');
 if(targetEdition.selectedSaveCopySourceEditionUrl!=='/dbz-wide64-v9-source-v8.json')throw Error('Unsupported source edition descriptor.');
 const sourceEdition=await json('/dbz-wide64-v9-source-v8.json');
 const source=sourceRom?new Uint8Array(sourceRom):await rom('/games/Dragon_Ball_Z_II_Wide64_NGPlus_v8.nes');
 const target=await rom('/games/Dragon_Ball_Z_II_Wide64_NGPlus_v9.nes');
 return copyWide64V8SelectedSave({state:new Uint8Array(state),romId:SOURCE,sourceRom:source,targetRom:target,sourceEdition,targetEdition,approval:{manual:true,operation:'copy-wide64-v8-to-v9',sourceRomId:SOURCE,targetRomId}});
}
