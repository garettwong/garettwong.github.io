const fs=require('fs'),assert=require('assert/strict');const {chromium}=require('C:/Users/garet/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root='D:/Codex 2/projects/NES-Wide64-HPBP169',edition=JSON.parse(fs.readFileSync(root+'/dbz-wide64-v9-edition.json'));
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('error',e.message)});
page.on('console',m=>{if(m.text().startsWith('battle179'))console.log(m.text());});
await page.goto((process.env.BASE||'http://127.0.0.1:8176')+'/dbz-wide64-v9-play.html');
await page.evaluate(async({bytes,id})=>{await new Promise((ok,no)=>{const q=indexedDB.open('nes-dream-library-v1',2);q.onsuccess=()=>{const d=q.result,t=d.transaction('states','readwrite');t.objectStore('states').put({key:id+':1',gameId:id,slot:1,bytes:new Uint8Array(bytes).buffer,updated:Date.now()});t.oncomplete=()=>{d.close();ok();};t.onerror=()=>no(t.error);};q.onerror=()=>no(q.error);});},{bytes:[...fs.readFileSync(process.env.FIXTURE||__dirname+'/v9-400.state')],id:edition.romId});
await page.frameLocator('iframe').getByRole('button',{name:'Play game',exact:true}).click({timeout:60000});const f=page.frames().find(f=>f.url().includes('/player-wide64-v9.html'));await f.waitForFunction(()=>window.dreamArtwork?.metrics?.frames>2);
await page.getByRole('button',{name:'Load',exact:true}).click();await page.getByRole('button',{name:/Slot 1/}).click();await page.waitForTimeout(600);
await page.screenshot({path:__dirname+'/ui-loaded.png'});

await f.evaluate(()=>{const g=EJS_emulator.gameManager;window.qaRead179=()=>{const b=g.getState(),r=DreamWide64.chunk(b,'RAM',2048),w=DreamWide64.chunk(b,'WRM',8192);return {phase:[...b.slice(r+46,r+50)],kills:[b[w+0x13bb],b[w+0x13bc]],forms:b[w+0x15ae],queue:b[w+0x13be],loaded:b[w+0x139a]+256*b[w+0x139b],pending:b[w+0x1396]+256*b[w+0x1397],frame:g.getFrameNum(),banner:DreamWide64Awakening.inspect()};};document.querySelector('[data-lock-code="8"]').click();});
const events=[],seen=new Set();let last='',start=Date.now(),captured=false;
while(Date.now()-start<150000){await page.waitForTimeout(80);const v=await f.evaluate(()=>qaRead179()),sig=JSON.stringify([v.phase,v.kills,v.forms,v.queue,v.loaded,v.banner.busy]);if(sig!==last){events.push(v);console.log('event',JSON.stringify(v));last=sig;}
 if(v.banner.busy&&!captured){await f.waitForFunction(()=>Number(document.querySelector('#dbz-ssj2-banner')?.dataset.elapsed)>900);await page.screenshot({path:__dirname+'/banner-gohan-phone.png'});await f.locator('#dbz-ssj2-banner').screenshot({path:__dirname+'/banner-gohan.png'});captured=true;}
 if(captured&&!v.banner.busy){await f.evaluate(()=>{DreamTouch.releaseAll();EJS_emulator.pause();});break;}
}
const state=await f.evaluate(()=>[...EJS_emulator.gameManager.getState()]);fs.writeFileSync(__dirname+'/after-awakening.state',Buffer.from(state));await page.screenshot({path:__dirname+'/after-awakening.png'});
fs.writeFileSync(__dirname+'/banner-ui-result.json',JSON.stringify({events,errors,captured},null,2));assert(captured,'Actual 10-kill banner did not open');assert.equal(errors.length,0);assert.equal(events.at(-1).banner.lastError,'');assert.equal(events.at(-1).queue,0);assert(events.at(-1).frame>events.find(e=>e.banner.busy).frame);await browser.close();})();
