const fs=require('fs'),assert=require('assert/strict');const {chromium}=require('C:/Users/garet/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root='D:/Codex 2/projects/NES-Wide64-HPBP169',ed=JSON.parse(fs.readFileSync(root+'/dbz-wide64-v8-edition.json')),base=process.env.BASE||'http://127.0.0.1:8176',prefix=process.env.BASE?'live-':'';
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'}),p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(base+'/dbz-wide64-v8-play.html');
await p.evaluate(async({id,bytes})=>{await new Promise((ok,no)=>{const q=indexedDB.open('nes-dream-library-v1',2);q.onsuccess=()=>{const d=q.result,t=d.transaction('states','readwrite');t.objectStore('states').put({key:id+':1',gameId:id,slot:1,bytes:new Uint8Array(bytes).buffer,updated:Date.now()});t.oncomplete=()=>{d.close();ok()};t.onerror=()=>no(t.error)};q.onerror=()=>no(q.error)});},{id:ed.romId,bytes:[...fs.readFileSync(__dirname+'/ui-encounter.state')]});
await p.frameLocator('iframe').getByRole('button',{name:'Play game',exact:true}).click({timeout:60000});const f=p.frames().find(f=>f.url().includes('/player-wide64-v8.html'));await f.waitForFunction(()=>window.dreamArtwork?.metrics?.frames>2);
const rows=[];
for(const [label,choice,exponent] of [['180–200',5,4],['180–200',5,5],['380–400',6,6],['380–400',6,7],['80–100',3,0],['Original',1,0]]){
 await p.getByRole('button',{name:'Load',exact:true}).click();await p.getByRole('button',{name:/Slot 1/}).click();await f.getByRole('dialog',{name:'Choose this battle'}).waitFor();
 await f.getByRole('radio',{name:label,exact:true}).click();await f.getByRole('radio',{name:`${2**exponent}×`,exact:true}).click();
 if(exponent===7){await p.screenshot({path:__dirname+'/'+prefix+'selector-phone.png'});await p.setViewportSize({width:844,height:390});await p.screenshot({path:__dirname+'/'+prefix+'selector-landscape.png'});await p.setViewportSize({width:390,height:844});}
 await f.getByRole('button',{name:'Start battle',exact:true}).click();await f.waitForFunction(()=>!DreamEnemies.isOpen());await p.waitForTimeout(150);
 const v=await f.evaluate(()=>{const g=EJS_emulator.gameManager,b=g.getState(),r=DreamWide64.chunk(b,'RAM',2048),w=DreamWide64.chunk(b,'WRM',8192);return{phase:[...b.slice(r+0x2e,r+0x32)],choice:b[w+0x1391],strength:b[w+0x1c60],pending:b[w+0x1396]+256*b[w+0x1397],total:b[w+0x1398]+256*b[w+0x1399],loaded:b[w+0x139a]+256*b[w+0x139b],batch:b[w+0x1372],active:b[w+0x1371],hp:b[r+0x2a4]+256*b[r+0x2a5],bp:b[r+0x2a6]+256*b[r+0x2a7]+65536*b[r+0x2a8],counter:DreamLargeBattle.decode(b),valid:!!DreamWide64.validateNative(b)};});
 console.log('selected',JSON.stringify({...v,counter:v.counter&&{total:v.counter.total,remaining:v.counter.remaining}}));
 assert.equal(v.choice,choice);assert.equal(v.strength,exponent);assert.equal(v.hp,50*2**exponent);assert.equal(v.bp,23000*2**exponent);assert.equal(v.phase[0],1);
 if(choice>=5){assert(v.total>=(choice===5?180:380)&&v.total<=(choice===5?200:400));assert.equal(v.pending+v.loaded,v.total);assert.equal(v.batch,100);assert.equal(v.counter.total,v.total);assert.equal(v.counter.remaining,v.total);}
 if(choice===1)assert.equal(v.active,0);
 rows.push({...v,counter:{total:v.counter?.total,remaining:v.counter?.remaining},label});console.log(label,2**exponent,v.total,v.hp,v.bp);
}
assert.deepEqual(errors,[]);fs.writeFileSync(__dirname+'/'+prefix+'selector-tests.json',JSON.stringify({rows,errors},null,2));await browser.close();})();
