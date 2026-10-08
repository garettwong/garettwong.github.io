/* Manual-only conversion; ordinary load/import never calls this module. */
import {unpackState,rewrapState} from './dbz-wide64-state.mjs';
import {convertES28ToWide64,ES28_ROM_ID,sha256} from './dbz-wide64-migration.mjs';
export async function copyES28ToRound2({state,romId,sourceRom,targetRomId,manual}){
 if(manual!==true||romId!==ES28_ROM_ID)throw Error('Choose the explicit ES28 copy action.');
 const response=await fetch('/dbz-wide64-edition.json',{cache:'no-store'});if(!response.ok)throw Error('Wide64 edition information is unavailable.');
 const edition=await response.json();if(edition.romId!==targetRomId)throw Error('Wide64 changed. Reload the library before copying.');
 if(!edition.freshStartSha256||!edition.freshStartUrl||!edition.freshStartWrapperSha256)throw Error('The verified Wide64 first-map snapshot is not ready. Your original saves are unchanged.');
 const freshResponse=await fetch(edition.freshStartUrl,{cache:'no-store'});if(!freshResponse.ok)throw Error('The first-map snapshot could not be loaded.');
 const freshWrapped=new Uint8Array(await freshResponse.arrayBuffer());if(await sha256(freshWrapped)!==edition.freshStartWrapperSha256)throw Error('First-map snapshot checksum mismatch.');
 const source=unpackState(state).native,fresh=unpackState(freshWrapped).native;
 const result=await convertES28ToWide64({state:source,romId,sourceRom:new Uint8Array(sourceRom),freshState:fresh,edition,approval:{manual:true,operation:'convert-es28-to-wide64',sourceRomId:romId,targetRomId},round:2});
 return {...result,state:rewrapState(result.state,freshWrapped)};
}
