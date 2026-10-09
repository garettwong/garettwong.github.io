/* Explicit v6-to-v7 selected-slot copy. Ordinary load/import never calls this module. */
import {copyWide64V6SelectedSave} from './dbz-wide64-v7-selected-save-copy.mjs';
const SOURCE='43af7a32e835058ba45aa481e3d426433e72d61c68f1d7ad08d1d36995a06df8';
async function json(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Edition information could not be read.');return r.json();}
async function rom(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('The matching edition ROM could not be read.');return new Uint8Array(await r.arrayBuffer());}
export async function copySelectedV6Save({state,sourceRom,targetRomId,manual}){
 if(manual!==true)throw Error('Choose the explicit selected-save copy action.');
 const targetEdition=await json('/dbz-wide64-v7-edition.json');if(targetEdition.romId!==targetRomId||targetEdition.selectedSaveCopySourceRomId!==SOURCE)throw Error('Wide64 v7 changed. Reload its entry before copying.');
 if(targetEdition.selectedSaveCopySourceEditionUrl!=='/dbz-wide64-v7-source-v6.json')throw Error('Unsupported source edition descriptor.');
 const sourceEdition=await json('/dbz-wide64-v7-source-v6.json');
 const source=sourceRom?new Uint8Array(sourceRom):await rom('/games/Dragon_Ball_Z_II_Wide64_NGPlus_v6.nes');
 const target=await rom('/games/Dragon_Ball_Z_II_Wide64_NGPlus_v7.nes');
 return copyWide64V6SelectedSave({state:new Uint8Array(state),romId:SOURCE,sourceRom:source,targetRom:target,sourceEdition,targetEdition,approval:{manual:true,operation:'copy-wide64-v6-to-v7',sourceRomId:SOURCE,targetRomId}});
}
