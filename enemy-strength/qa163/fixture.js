/* DEVELOPMENT LAYOUT FIXTURE ONLY. This never runs the ROM or EmulatorJS.
 * Real source modules create every overlay node. Mock bytes are confined here.
 */
(async () => {'use strict';
  const params = new URLSearchParams(location.search);
  const mode = ['battle','cards','skills'].includes(params.get('mode')) ? params.get('mode') : 'battle';
  const candidate = params.get('candidate') !== '0';
  const deployed = location.pathname.startsWith('/enemy-strength/qa163/');
  const asset = name => deployed ? (name.startsWith('dbz-enemy-strength') || name.startsWith('ui163') ? `/enemy-strength/${name}` : `/${name}`) : `assets/${name}`;
  const send = (type, details) => parent.postMessage({type, ...details}, location.origin);
  const log = (type, details={}) => send('es28-fixture-event', {event:{at:new Date().toISOString(),type,...details}});
  const status = message => {document.getElementById('fixture-message').textContent=message;log('mock-api-status',{message});};
  const store = new Map();
  // Do not read, write, remove, clear, or enumerate the real origin storage.
  Object.defineProperty(window, 'localStorage', {configurable:false,value:Object.freeze({
    getItem:key=>store.get(String(key)) ?? null,
    setItem:(key,value)=>{store.set(String(key),String(value));log('fixture-memory-storage',{operation:'setItem',key:String(key)});},
    removeItem:key=>store.delete(String(key)),
    clear:()=>store.clear(), key:i=>[...store.keys()][i]??null,
    get length(){return store.size;}
  })});
  const css = name => new Promise((resolve,reject) => { const link=document.createElement('link');link.rel='stylesheet';link.href=asset(name);link.onload=resolve;link.onerror=()=>reject(Error(`Could not load ${link.href}`));document.head.append(link); });
  const script = name => new Promise((resolve,reject) => {const el=document.createElement('script');el.src=asset(name);el.onload=resolve;el.onerror=()=>reject(Error(`Could not load ${el.src}`));document.body.append(el);});
  function chunk(bytes, tag, size) {
    const pattern=[...tag].map(c=>c.charCodeAt(0)).concat([0,(size+1)&255,(size+1)>>8,0,0,0]);
    for(let i=0;i+size+9<=bytes.length;i++) if(pattern.every((v,j)=>bytes[i+j]===v)) return i+9;
    throw Error(`Fixture lacks ${tag} tagged chunk`);
  }
  try {
    await Promise.all(['dbz-skills.css','dbz-card-editor.css','dbz-crazy-cards.css','dbz-enemy-strength.css'].map(css));
    if(candidate) await css('ui163.css');
    for(const name of ['dbz-skills.js','dbz-crazy.js','dbz-crazy-cards.js','dbz-enemy-strength-enemies.js','dbz-enemy-strength.js','dbz-enemy-strength-cards.js']) await script(name);
    if(candidate) await script('ui163.js');
    // Independently authored minimal interface mock. No ROM/save bytes are
    // fetched, copied, embedded, decoded, or loaded. All unspecified bytes are 0.
    const original = new Uint8Array(9+2048+9+8192);
    const header=(tag,size)=>[...tag].map(c=>c.charCodeAt(0)).concat([0,(size+1)&255,(size+1)>>8,0,0,0]);
    original.set(header('RAM',2048),0); original.set(header('WRM',8192),9+2048);
    const r=chunk(original,'RAM',2048),w=chunk(original,'WRM',8192);
    // Required adapter interface markers, not resident game code or a save.
    original.set([69,83,50,56],w+0x1ef8); original.set([76,0,104],w);
    original[r+0x2e]=1; original[r+0x200]=1;
    original[w+0x1390]=165; original[w+0x1394]=130;
    for(let i=0;i<5;i++) original[r+0x2a2+i*18]=i<2?i+16:255;
    let state=original.slice(),paused=false,loads=0,frameNumber=0;
    function prepare() {
      state=original.slice();
      if(mode!=='battle') {
        // Explicitly synthetic eligibility only; never described as native evidence.
        state[r+0x30]=6;state[r+0x9a]=0;state[r+0x200]=1;state[w+0x1390]=0;
      }
      if(mode==='cards') {
        const ranks=[[0,0],[8,2],[5,2],[6,5],[3,1]];
        for(let i=0;i<5;i++) state.set([0x80+i*4,0x22,2,ranks[i][0],ranks[i][1],4,0,0],r+0x3f5+i*8);
      }
      log('fixture-prepared',{mode,source:'procedural minimal interface mock; no save/ROM payload',mockEligibility:true,nativeGameplay:false});
    }
    const gm={
      getState:()=>state.slice(),
      loadState:bytes=>{state=new Uint8Array(bytes).slice();loads++;log('mock-load-state',{loads});},
      getFrameNum:()=>frameNumber,
      setCheat:()=>log('mock-cheat',{supported:false}),
      resetCheat:()=>{},
      // No simulateInput: native skill confirmation cannot pass in this fixture.
    };
    const api={gm:()=>gm,ramStart:bytes=>chunk(bytes,'RAM',2048),active:()=>true,
      release:()=>{},pause:()=>{paused=true;},isPaused:()=>paused,
      resume:()=>{paused=false;frameNumber++;if(mode==='battle'&&state[w+0x1391]>0){state[w+0x1390]=0;log('mock-encounter-ack',{nativeGameplay:false});}},
      resetFrame:()=>{},status,settle:async()=>{},english:true};
    prepare();
    if(mode==='battle') await window.DreamEnemyStrength.start(api);
    if(mode==='cards') {window.DreamEnemyStrengthCards.start(api);window.DreamEnemyStrengthCards.open();}
    if(mode==='skills') {window.DreamSkills.start(api);window.DreamSkills.open();}
    document.getElementById('fixture-reopen').onclick=async()=>{
      if(mode==='battle'){window.DreamEnemyStrength.reset();prepare();await window.DreamEnemyStrength.start(api);}
      if(mode==='cards')window.DreamEnemyStrengthCards.open();
      if(mode==='skills')window.DreamSkills.open();
    };
    function rect(el) {const b=el.getBoundingClientRect();return {left:b.left,top:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height};}
    function visuallyShown(el) {const c=getComputedStyle(el);return !el.hidden&&c.display!=='none'&&c.visibility!=='hidden'&&el.getClientRects().length>0;}
    function visibleInClip(el) {
      const b=rect(el);let clip={left:0,top:0,right:innerWidth,bottom:innerHeight};
      for(let p=el.parentElement;p;p=p.parentElement){const s=getComputedStyle(p);if(/auto|scroll|hidden|clip/.test(`${s.overflowX} ${s.overflowY}`)){const a=rect(p);clip={left:Math.max(clip.left,a.left),top:Math.max(clip.top,a.top),right:Math.min(clip.right,a.right),bottom:Math.min(clip.bottom,a.bottom)};}}
      return b.left>=clip.left-.5&&b.top>=clip.top-.5&&b.right<=clip.right+.5&&b.bottom<=clip.bottom+.5;
    }
    function measure() {
      const dialog=document.querySelector('[role=dialog]:not([hidden])');
      const common={schemaVersion:1,mode,candidate,nativeGameplay:false,viewport:{width:innerWidth,height:innerHeight,visualWidth:visualViewport?.width,visualHeight:visualViewport?.height},bodyClass:document.body.className,documentScrollWidth:document.documentElement.scrollWidth,sourceCatalog:{folders:window.DreamSkills.catalog.length,gokuMoves:window.DreamSkills.catalog.find(f=>f.name==='Goku').moves.length},activeElement:{tag:document.activeElement?.tagName,id:document.activeElement?.id,label:document.activeElement?.getAttribute('aria-label')||document.activeElement?.textContent?.trim().slice(0,80)}};
      if(!dialog)return {...common,open:false};
      const controls=[...dialog.querySelectorAll('button,input,select,summary')].filter(visuallyShown).map(el=>({tag:el.tagName,label:el.getAttribute('aria-label')||el.textContent.trim(),value:el.value??null,pressed:el.getAttribute('aria-pressed'),checked:el.getAttribute('aria-checked'),invalid:el.getAttribute('aria-invalid'),disabled:el.disabled??false,rect:rect(el),fontSize:parseFloat(getComputedStyle(el).fontSize),clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,fullyVisible:visibleInClip(el)}));
      const scrollRegions=[dialog,...dialog.querySelectorAll('.es163-scroll,.dbz-skill-list,.es163-footer')].map(el=>({selector:el.id?`#${el.id}`:el.className,rect:rect(el),scrollTop:el.scrollTop,clientHeight:el.clientHeight,scrollHeight:el.scrollHeight,clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,overflowY:getComputedStyle(el).overflowY}));
      const report={...common,open:true,dialog:{id:dialog.id,rect:rect(dialog)},view:dialog.querySelector('.dbz-skill-list')?.dataset.es163View??null,counts:{cardTabs:dialog.querySelectorAll('.dbz-card-tabs button').length,skillChoices:dialog.querySelectorAll('.dbz-skill-list button').length,scrollWrappers:dialog.querySelectorAll('.es163-scroll').length,footers:dialog.querySelectorAll('.es163-footer').length},controls,scrollRegions,
        checks:{noDocumentHorizontalOverflow:document.documentElement.scrollWidth<=innerWidth+1,dialogFitsViewport:rect(dialog).left>=0&&rect(dialog).right<=innerWidth+.5&&rect(dialog).top>=0&&rect(dialog).bottom<=innerHeight+.5,allTargetsAtLeast44:controls.every(c=>c.rect.width>=43.9&&c.rect.height>=43.9),allControlsCurrentlyVisible:controls.every(c=>c.fullyVisible),inputsAtLeast16:controls.filter(c=>['INPUT','SELECT'].includes(c.tag)).every(c=>c.fontSize>=16),allBottomActionsVisible:controls.filter(c=>['Start battle','Apply to all 5','Original values','Back to game'].includes(c.label)).every(c=>c.fullyVisible),noInternalHorizontalOverflow:scrollRegions.every(s=>s.scrollWidth<=s.clientWidth+1)}};
      return report;
    }
    addEventListener('message',event=>{if(event.source===parent&&event.origin===location.origin&&event.data?.type==='es28-layout-measure')send('es28-layout-report',{report:measure()});});
    document.addEventListener('click',event=>{const el=event.target.closest('button,input,select,summary');if(el)log('ui-click',{tag:el.tagName,label:el.getAttribute('aria-label')||el.textContent.trim(),trusted:event.isTrusted});},true);
    document.addEventListener('keydown',event=>{if(['Escape','Tab','Enter','Home','End','ArrowLeft','ArrowRight'].includes(event.key))log('ui-key',{key:event.key,shift:event.shiftKey,trusted:event.isTrusted});},true);
    document.addEventListener('change',event=>{if(event.target.matches('input,select'))log('ui-change',{id:event.target.id,value:event.target.value,trusted:event.isTrusted});},true);
    send('es28-fixture-ready',{mode,candidate});
  } catch(error) {status(error.message);send('es28-fixture-error',{message:error.message});}
})();
