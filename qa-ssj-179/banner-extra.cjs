const fs=require('fs'),assert=require('assert/strict');const {chromium}=require('C:/Users/garet/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root='D:/Codex 2/projects/NES-Wide64-HPBP169',edition=JSON.parse(fs.readFileSync(root+'/dbz-wide64-v9-edition.json'));
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('error',e.message)});
page.on('console',m=>{if(m.text().startsWith('battle179'))console.log(m.text());});
await page.goto((process.env.BASE||'http://127.0.0.1:8176')+'/dbz-wide64-v9-play.html');
await page.evaluate(async({bytes,id})=>{await new Promise((ok,no)=>{const q=indexedDB.open('nes-dream-library-v1',2);q.onsuccess=()=>{const d=q.result,t=d.transaction('states','readwrite');t.objectStore('states').put({key:id+':1',gameId:id,slot:1,bytes:new Uint8Array(bytes).buffer,updated:Date.now()});t.oncomplete=()=>{d.close();ok();};t.onerror=()=>no(t.error);};q.onerror=()=>no(q.error);});},{bytes:[...fs.readFileSync(process.env.FIXTURE||__dirname+'/v9-400.state')],id:edition.romId});
await page.frameLocator('iframe').getByRole('button',{name:'Play game',exact:true}).click({timeout:60000});const f=page.frames().find(f=>f.url().includes('/player-wide64-v9.html'));await f.waitForFunction(()=>window.dreamArtwork?.metrics?.frames>2);
await page.getByRole('button',{name:'Load',exact:true}).click();await page.getByRole('button',{name:/Slot 1/}).click();await page.waitForTimeout(600);
await page.screenshot({path:__dirname+'/ui-loaded.png'});


const checks=await f.evaluate(()=>{const g=EJS_emulator.gameManager,b=new Uint8Array(g.getState()),r=DreamWide64.chunk(b,'RAM',2048),w=DreamWide64.chunk(b,'WRM',8192);b[r+46]=1;b[w+0x15ae]=15;b[w+0x13bb]=10;b[w+0x13bc]=10;b[w+0x13be]=3;
const a=DreamWide64Awakening.acknowledge(b,1),diff=[];for(let i=0;i<b.length;i++)if(b[i]!==a[i])diff.push(i);if(diff.length!==1||diff[0]!==w+0x13be||a[w+0x13be]!==2)throw Error('ACK changed unrelated state');
window.qaQueueState=b;g.FS.writeFile('/dual.state',b);g.functions.loadState('dual.state',0);EJS_emulator.play();return {ackOnlyQueue:true};});
await f.waitForFunction(()=>DreamWide64Awakening.isOpen());await f.waitForFunction(()=>document.querySelector('#dbz-ssj2-banner').dataset.actor==='1'&&Number(document.querySelector('#dbz-ssj2-banner').dataset.elapsed)>900);
await page.screenshot({path:__dirname+'/banner-goku-phone.png'});
await page.setViewportSize({width:844,height:390});await page.screenshot({path:__dirname+'/banner-goku-landscape.png'});
await f.waitForFunction(()=>document.querySelector('#dbz-ssj2-banner').dataset.actor==='3'&&Number(document.querySelector('#dbz-ssj2-banner').dataset.elapsed)>900);
checks.doubleQueue=true;
await f.evaluate(()=>{window.qaSettledStart=performance.now();window.qaSettled=null;DreamWide64Awakening.whenSettled().then(()=>window.qaSettled=performance.now()-qaSettledStart);});
await f.waitForFunction(()=>window.qaSettled!==null);checks.waited=await f.evaluate(()=>qaSettled);assert(checks.waited>1000);checks.final=await f.evaluate(()=>{DreamTouch.releaseAll();EJS_emulator.pause();const b=EJS_emulator.gameManager.getState(),w=DreamWide64.chunk(b,'WRM',8192);return {queue:b[w+0x13be],forms:b[w+0x15ae],banner:DreamWide64Awakening.inspect()};});assert.equal(checks.final.queue,0);assert.equal(checks.final.banner.lastError,'');
await page.setViewportSize({width:390,height:844});
checks.menu=await f.evaluate(()=>{const g=EJS_emulator.gameManager,read=g.getState.bind(g),b=new Uint8Array(read()),r=DreamWide64.chunk(b,'RAM',2048),w=DreamWide64.chunk(b,'WRM',8192),out=[];b[r+46]=1;b[r+48]=7;b[r+0x9a]=0;b[r+0x200]=1;b[w+0x15ae]=0;b[w+0x13bd]=0;b[w+0x13be]=0;const transformed=DreamWide64Forms.prepare(b,0,true);if(!(transformed.state[w+0x13bd]&1))throw Error('Used flag missing');let blocked=0;try{DreamWide64Forms.prepare(transformed.state,0,true);}catch{blocked++;}const normal=DreamWide64Forms.prepare(transformed.state,0,false);try{DreamWide64Forms.prepare(normal.state,0,true);}catch{blocked++;}if(blocked!==2)throw Error('Repeat transformation allowed');
window.qaOriginalRead=read;g.getState=()=>normal.state;DreamSkills.reset();DreamSkills.open();const folder=[...document.querySelectorAll('#dbz-skills button')].find(b=>b.textContent.includes('Goku'));folder.click();const ids=[...document.querySelectorAll('#dbz-skills [data-skill]')].map(e=>Number(e.dataset.skill));if(ids.includes(35)||ids.includes(36))throw Error('Hidden form actions leaked');return {repeatBlocked:true,normalUsedMenu:ids};});
await page.screenshot({path:__dirname+'/transform-once-menu.png'});
await f.evaluate(()=>{EJS_emulator.gameManager.getState=qaOriginalRead;DreamSkills.reset();EJS_emulator.pause();});
fs.writeFileSync(__dirname+'/banner-extra-result.json',JSON.stringify({checks,errors},null,2));assert.equal(errors.length,0);console.log(checks);await browser.close();})();
