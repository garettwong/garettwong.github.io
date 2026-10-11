/* Browser QA only: native phase-5 card selector. Does not alter production files. */
const fs=require('fs');
const {chromium}=require('C:/Users/garet/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const q=__dirname, root='D:/Codex 2/projects/NES-Wide64-HPBP169';
const edition=JSON.parse(fs.readFileSync(root+'/dbz-wide64-v20-edition.json'));
const base=process.env.BASE||'http://127.0.0.1:8177';
const speeds=(process.env.SPEEDS||'1,4,16,64').split(',').map(Number), defences=[256,255,64,16,8];
const results={runAt:new Date().toISOString(),base,viewport:{width:390,height:844,isMobile:true,hasTouch:true},romId:edition.romId,fixture:'card-menu.state',expected:{phase:5,selectionRam:'$6e',defences,attack:256},runs:[],failures:[],limitations:['Controller result uses an emulated navigator.getGamepads() standard-gamepad object; no physical hardware was tested.']};
const fail=(r,name,detail)=>{r.assertions.push({name,pass:false,detail});results.failures.push(`${r.name}: ${name}: ${detail}`)};
const pass=(r,name,detail)=>r.assertions.push({name,pass:true,detail});
const keepAlive=setInterval(()=>{},1000);
async function runEachCardAt64(browser){
 const evidence={runAt:new Date().toISOString(),base,viewport:results.viewport,fixture:'card-menu.state',speed:64,expected:{selectionRam:'$6e',cards:defences.map(defense=>({attack:256,defense}))},cases:[],overlap:null,failures:[]};
 const load=async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  await page.addInitScript(id=>{localStorage.setItem('nes-dream:dbz-crazy-cards:'+id,JSON.stringify({cards:[256,255,64,16,8].map(defense=>({attack:256,defense,attribute:1,locked:true}))}));},edition.romId);
  await page.goto(base+'/dbz-wide64-v20-play.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('#wide64-v20-preview-notice').waitFor({state:'attached'});
  const bytes=[...fs.readFileSync(q+'/card-menu.state')];
  await page.evaluate(({id,bytes})=>new Promise((resolve,reject)=>{const request=indexedDB.open('nes-dream-library-v1',2);request.onsuccess=()=>{const db=request.result,tx=db.transaction('states','readwrite');tx.objectStore('states').put({key:id+':1',gameId:id,slot:1,bytes:new Uint8Array(bytes).buffer,updated:Date.now()});tx.oncomplete=()=>{db.close();resolve()};tx.onerror=reject;};request.onerror=reject;}),{id:edition.romId,bytes});
  await page.frameLocator('iframe').getByRole('button',{name:'Play game',exact:true}).click({timeout:60000});
  const f=page.frames().find(x=>x.url().includes('/player-wide64-v20.html'));
  await f.waitForFunction(()=>window.dreamArtwork?.metrics.frames>2);
  await page.evaluate(()=>document.querySelector('iframe').contentWindow.postMessage({channel:'nes-dream',type:'speed',value:64},location.origin));
  await page.getByRole('button',{name:'Load',exact:true}).click(); await page.getByRole('button',{name:/Slot 1/}).click();
  await f.waitForFunction(()=>{const b=EJS_emulator.gameManager.getState(),p=DreamWide64.chunk(b,'RAM',2048);return b[p+0x30]===5});
  const read=()=>f.evaluate(()=>{const b=EJS_emulator.gameManager.getState(),p=DreamWide64.chunk(b,'RAM',2048),z=[...b.slice(p,p+0x240)];return{phase:z[0x30],selection6e:z[0x6e],selection6f:z[0x6f],party020d:z[0x20d],party0200_021f:z.slice(0x200,0x220),cards:DreamCards.inspect().values,skills:{open:DreamSkills.isOpen(),confirm:DreamSkills.isConfirming()}}});
  return{context,page,f,read};
 };
 const press=async(page,f,code,ms=80)=>{await f.evaluate(code=>DreamInput.input('card-qa-index64',0,code,1),code);await page.waitForTimeout(ms);await f.evaluate(code=>DreamInput.input('card-qa-index64',0,code,0),code);await page.waitForTimeout(150);};
 for(let index=0;index<5;index++){let s;try{s=await load();for(let n=0;n<index;n++)await press(s.page,s.f,7);const before=await s.read();await press(s.page,s.f,8);await s.page.waitForTimeout(700);const after=await s.read(),expected={attack:256,defense:defences[index],attribute:1};const assertions=[{name:'native $6e index before A',pass:before.selection6e===index,detail:before.selection6e},{name:'selected card data before A',pass:JSON.stringify(before.cards[index])===JSON.stringify(expected),detail:before.cards[index]},{name:'native $6e index preserved through dialog',pass:after.selection6e===index,detail:after.selection6e},{name:'A opened native skill/confirm flow',pass:after.phase===6||after.phase===7||after.skills.open||after.skills.confirm,detail:{phase:after.phase,skills:after.skills}}];for(const a of assertions)if(!a.pass)evidence.failures.push(`index ${index}: ${a.name}`);evidence.cases.push({index,expected,before,after,assertions});if(index===4)await s.page.screenshot({path:q+'/card-qa-index64-card4-skill-dialog.png',fullPage:true});}catch(error){evidence.failures.push(`index ${index}: ${error.message}`);evidence.cases.push({index,error:error.stack||String(error)});}finally{if(s)await s.context.close();}}
 let s;try{s=await load();await s.f.evaluate(()=>{DreamInput.input('card-qa-overlap',0,8,1);DreamInput.input('card-qa-overlap',0,7,1);setTimeout(()=>DreamInput.input('card-qa-overlap',0,7,0),30);setTimeout(()=>DreamInput.input('card-qa-overlap',0,8,0),80)});await s.page.waitForTimeout(800);const after=await s.read();evidence.overlap={input:'A+Right overlapping, Right release 30ms then A release 80ms',after,assertion:{name:'inputs release without stuck active direction',pass:after.selection6e>=0&&after.selection6e<=4&&[5,6,7].includes(after.phase),detail:{phase:after.phase,index:after.selection6e}}};if(!evidence.overlap.assertion.pass)evidence.failures.push('overlap did not settle in expected native flow');}catch(error){evidence.overlap={error:error.stack||String(error)};evidence.failures.push('overlap infrastructure error')}finally{if(s)await s.context.close();}
 fs.writeFileSync(q+'/card-qa-native-index64.json',JSON.stringify(evidence,null,2));
}
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 if(process.env.CARD_INDEXES){await runEachCardAt64(browser);return;}
  for(const speed of speeds){
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const page=await context.newPage(); const r={name:`speed-${speed}`,speed,assertions:[],events:[]}; results.runs.push(r);
    try{
      await page.addInitScript(()=>{window.__cardQaPad={buttons:Array.from({length:17},()=>({pressed:false,value:0})),axes:[0,0,0,0],connected:true,id:'card-qa-emulated-standard-gamepad',index:0,mapping:'standard',timestamp:0};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__cardQaPad]});});
      await page.addInitScript((id)=>localStorage.setItem('nes-dream:dbz-crazy-cards:'+id,JSON.stringify({cards:[256,255,64,16,8].map(defense=>({attack:256,defense,attribute:1,locked:true}))})),edition.romId);
      await page.goto(base+'/dbz-wide64-v20-play.html',{waitUntil:'domcontentloaded',timeout:60000});
      await page.locator('#wide64-v20-preview-notice').waitFor({state:'attached',timeout:30000});
      await page.evaluate(async({id,bytes})=>new Promise((resolve,reject)=>{const request=indexedDB.open('nes-dream-library-v1',2);request.onsuccess=()=>{const db=request.result,tx=db.transaction('states','readwrite');tx.objectStore('states').put({key:id+':1',gameId:id,slot:1,bytes:new Uint8Array(bytes).buffer,updated:Date.now()});tx.oncomplete=()=>{db.close();resolve()};tx.onerror=reject};request.onerror=reject}),{id:edition.romId,bytes:[...fs.readFileSync(q+'/card-menu.state')]});
      await page.frameLocator('iframe').getByRole('button',{name:'Play game',exact:true}).click({timeout:60000});
      const f=page.frames().find(x=>x.url().includes('/player-wide64-v20.html')); if(!f)throw Error('player frame unavailable');
      await f.waitForFunction(()=>window.dreamArtwork?.metrics.frames>2,null,{timeout:60000});
      await page.evaluate(n=>{window.qaSpeed=n;document.querySelector('iframe').contentWindow.postMessage({channel:'nes-dream',type:'speed',value:n},location.origin)},speed);
      await page.getByRole('button',{name:'Load',exact:true}).click(); await page.getByRole('button',{name:/Slot 1/}).click();
      const read=()=>f.evaluate(()=>{const b=EJS_emulator.gameManager.getState(),ram=DreamWide64.chunk(b,'RAM',2048),z=[...b.slice(ram,ram+0x300)];return{frame:EJS_emulator.gameManager.getFrameNum(),fast:EJS_emulator.isFastForward,phase:z[0x30],selection6e:z[0x6e],selection6f:z[0x6f],party020d:z[0x20d],party0200_021f:z.slice(0x200,0x220),cards:DreamCards?.inspect?.(),skills:{open:DreamSkills?.isOpen?.(),confirm:DreamSkills?.isConfirming?.()}}});
      await f.waitForFunction(()=>{const b=EJS_emulator.gameManager.getState(),p=DreamWide64.chunk(b,'RAM',2048);return b[p+0x30]===5},{},{timeout:30000});
      const start=await read(); r.events.push({step:'loaded',...start});
      (start.phase===5?pass:fail)(r,'fixture starts native phase 5',String(start.phase));
      (start.selection6e===0?pass:fail)(r,'fixture starts card index 0',`$6e=${start.selection6e}, $6f=${start.selection6f}`);
      const values=start.cards?.values?.map(c=>[c.attack,c.defense])||[]; (JSON.stringify(values)===JSON.stringify(defences.map(d=>[256,d]))?pass:fail)(r,'seeded cards preserve attack/defence',JSON.stringify(values));
      const pulse=async(code,ms=80,source='native')=>{await f.evaluate(({code,source})=>DreamInput.input(source,0,code,1),{code,source});await page.waitForTimeout(ms);await f.evaluate(({code,source})=>DreamInput.input(source,0,code,0),{code,source});await page.waitForTimeout(180);};
      for(let expected=1;expected<=4;expected++){await pulse(7,80,'card-qa-right');const s=await read();r.events.push({step:`right-${expected}`,...s});(s.selection6e===expected?pass:fail)(r,`right short press reaches ${expected}`,`$6e=${s.selection6e}`);}
      const afterRight=await read();await page.waitForTimeout(450);const idle=await read();(idle.selection6e===afterRight.selection6e?pass:fail)(r,'idle does not repeat navigation',`before=${afterRight.selection6e}, after=${idle.selection6e}`);
      for(let expected=3;expected>=0;expected--){await pulse(6,80,'card-qa-left');const s=await read();r.events.push({step:`left-${expected}`,...s});(s.selection6e===expected?pass:fail)(r,`left short press reaches ${expected}`,`$6e=${s.selection6e}`);}
      // Actual touch controls: pointer down/up on the rendered Right button.
      const beforeTouch=await read();await f.evaluate(()=>{const p=document.querySelector('#direction-pad'),b=p.getBoundingClientRect(),x=b.right-4,y=b.top+b.height/2;p.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:193,clientX:x,clientY:y,pointerType:'touch'}));setTimeout(()=>p.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:193,clientX:x,clientY:y,pointerType:'touch'})),80);});await page.waitForTimeout(260);const touch=await read();r.events.push({step:'touch-pad-right',...touch});(touch.selection6e===beforeTouch.selection6e+1?pass:fail)(r,'touch pointer path Right advances exactly one',`before=${beforeTouch.selection6e}, after=${touch.selection6e}`);
      // Keyboard travels through the emulator input API used by the page keyboard handler.
      const beforeKey=await read();await f.evaluate(()=>{const gm=EJS_emulator.gameManager;gm.simulateInput(0,6,1)});await page.waitForTimeout(80);await f.evaluate(()=>{const gm=EJS_emulator.gameManager;gm.simulateInput(0,6,0)});await page.waitForTimeout(180);const key=await read();r.events.push({step:'keyboard-api-left',...key});(key.selection6e===beforeKey.selection6e-1?pass:fail)(r,'keyboard route (gm.simulateInput) Left steps once',`before=${beforeKey.selection6e}, after=${key.selection6e}`);
      // Emulated standard controller: d-pad right index 15 then release.
      const beforePad=await read();await f.evaluate(()=>{__cardQaPad.buttons[15]={pressed:true,value:1};__cardQaPad.timestamp++});await page.waitForTimeout(80);await f.evaluate(()=>{__cardQaPad.buttons[15]={pressed:false,value:0};__cardQaPad.timestamp++});await page.waitForTimeout(220);const pad=await read();r.events.push({step:'emulated-gamepad-right',...pad});(pad.selection6e===beforePad.selection6e+1?pass:fail)(r,'emulated standard gamepad Right steps once',`before=${beforePad.selection6e}, after=${pad.selection6e}`);
      // A selects current card. Native phase should leave card selection and the skill layer should appear/confirm as implemented.
      const chosen=(await read()).selection6e; await pulse(8,80,'card-qa-a'); await page.waitForTimeout(800); const selected=await read();r.events.push({step:'A-select',chosen,...selected});
      ((selected.phase===6||selected.phase===7||selected.skills.open||selected.skills.confirm)?pass:fail)(r,'A exits card selector into native skill/confirm flow',JSON.stringify(selected));
      if(selected.skills.open||selected.skills.confirm){await page.screenshot({path:q+`/card-qa-native-speed${speed}-skill-dialog.png`,fullPage:true});const back=f.getByRole('button',{name:/Back to game/i});if(await back.count()){await back.click();await page.waitForTimeout(180);const closed=await read();r.events.push({step:'dialog-back',...closed});(!closed.skills.open&&!closed.skills.confirm?pass:fail)(r,'dialog Back returns to game',JSON.stringify(closed.skills));}}
      await page.screenshot({path:q+`/card-qa-native-speed${speed}-final.png`,fullPage:true});
      fs.writeFileSync(q+`/card-qa-native-speed${speed}.json`,JSON.stringify(r,null,2));
    }catch(e){fail(r,'run completed without infrastructure error',e.stack||String(e));fs.writeFileSync(q+`/card-qa-native-speed${speed}.json`,JSON.stringify(r,null,2));}
    finally{await context.close();}
  }
}finally{await browser.close();fs.writeFileSync(q+'/card-qa-native-summary.json',JSON.stringify(results,null,2));clearInterval(keepAlive);}
})().catch(error=>{console.error(error);clearInterval(keepAlive);process.exitCode=1;});
