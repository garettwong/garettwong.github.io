from pathlib import Path
r=Path('D:/Codex 2/projects/NES-Wide64-HPBP169')
p=r/'player-wide64-v9.html';s=p.read_text(encoding='utf8');s=s.replace('<script src="/player-wide64-v9-runtime.js','<script src="/dbz-wide64-v9-awakening.js?v=179"></script><script src="/player-wide64-v9-runtime.js');p.write_text(s,encoding='utf8')
p=r/'player-wide64-v9-runtime.js';s=p.read_text(encoding='utf8')
s=s.replace('await engine.prepare();','await engine.prepare();await window.DreamWide64Awakening.ready;')
s=s.replace('const resumeGame=(allowChoice=false)=>{','const resumeGame=(allowChoice=false)=>{if(window.DreamWide64Awakening?.isOpen())return;')
s=s.replace('if(!started||window.DreamEnemies?.isOpen()','if(!started||window.DreamWide64Awakening?.isOpen()||window.DreamEnemies?.isOpen()')
s=s.replace('try{await window.DreamWide64Training?.whenSettled();','try{await window.DreamWide64Awakening?.whenSettled();await window.DreamWide64Training?.whenSettled();')
s=s.replace('if(started)window.DreamWide64Panel.open();','if(started&&!window.DreamWide64Awakening?.isOpen())window.DreamWide64Panel.open();')
s=s.replace('window.DreamWide64Panel.reset();','window.DreamWide64Awakening.reset();window.DreamWide64Panel.reset();')
s=s.replace('try{await window.DreamCards?.whenSettled();await window.DreamWide64Training?.reset();','try{await window.DreamWide64Awakening?.whenSettled();await window.DreamCards?.whenSettled();await window.DreamWide64Training?.reset();')
needle='window.EJS_onGameStart=async()=>{'
start="window.DreamWide64Awakening.start({gm:()=>window.EJS_emulator.gameManager,active:()=>started&&!menuPaused&&!backgroundPaused,release:()=>window.DreamTouch?.releaseAll(),pause:()=>window.EJS_emulator.pause(),advance:()=>window.EJS_emulator.play(),resume:()=>{if(!menuPaused&&!backgroundPaused)resumeGame();},beginConfirmation,resetFrame:()=>engine?.resetFrame(),status:text=>send('status',{text})});"
s=s.replace(needle,needle+start);p.write_text(s,encoding='utf8')
p=r/'dbz-wide64-v9-skills.js';s=p.read_text(encoding='utf8').replace('await returnToNativeAttackChoice(gm,edit,token);','await window.DreamWide64Awakening?.whenSettled();await returnToNativeAttackChoice(gm,edit,token);');p.write_text(s,encoding='utf8')
p=r/'dbz-wide64-v9-nameplates.js';s=p.read_text(encoding='utf8').replace('let atlas=null,patterns=[];','let atlas=null,patterns=[],stageIIAtlas=null;const stageIIReady=new Promise(resolve=>{const img=new Image();img.onload=()=>{stageIIAtlas=img;resolve(true);};img.onerror=()=>resolve(false);img.src="/packs/wide64-v9-ssj2-portraits.png";});')
s=s.replace('actor,on,cell:', 'actor,on,stageII:on&&!!(forms&(actor===1?4:8)),cell:')
s=s.replace('const [sx,sy,sw,sh]=rects[face.cell]', 'const source=face.stageII&&stageIIAtlas?stageIIAtlas:atlas,[sx,sy,sw,sh]=face.stageII&&stageIIAtlas?(face.actor===1?[24,0,863,887]:[998,0,715,887]):rects[face.cell]')
s=s.replace('ctx.drawImage(atlas,sx','ctx.drawImage(source,sx');p.write_text(s,encoding='utf8')
