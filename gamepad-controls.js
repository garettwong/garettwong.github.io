/* Shared Xbox/standard Gamepad controls for software NES and Nestopia. */
(()=>{'use strict';
 const sources=new Map();let manager=null,raw=null;
 function held(player,code){for(const map of sources.values())if(map.has(player+':'+code))return true;return false;}
 function input(source,player,code,value){if(!raw)return;const key=player+':'+code,before=held(player,code);let map=sources.get(source);if(!map)sources.set(source,map=new Set());if(value)map.add(key);else map.delete(key);const after=held(player,code);if(before!==after)raw(player,code,after?1:0);}
 function release(source){for(const key of [...(sources.get(source)||[])]){const [p,c]=key.split(':').map(Number);input(source,p,c,0);}sources.delete(source);}
 function reset(){for(const source of [...sources.keys()])release(source);neutralRequired=true;}
 function attach(gm){if(manager===gm)return;reset();manager=gm;raw=gm.simulateInput.bind(gm);gm.simulateInput=(p,c,v)=>input('keyboard',p,c,v);window.EJS_emulator?.gamepad?.terminate?.();}
 window.DreamInput={input,release,reset,attach};
 const button=document.createElement('button');button.id='controller-status';button.type='button';button.textContent='Connect controller';button.setAttribute('aria-haspopup','dialog');document.body.append(button);
 const dialog=document.createElement('dialog');dialog.id='controller-help';dialog.setAttribute('aria-labelledby','controller-title');dialog.innerHTML='<h2 id="controller-title">Xbox controller</h2><p id="controller-connection" role="status"></p><p id="controller-device"></p><ol><li>Turn on your controller. Hold its small pairing button until the Xbox light flashes.</li><li>On iPhone: Settings → Bluetooth → select Xbox Elite Wireless Controller. On PC: connect by USB or Bluetooth.</li><li>Return here, tap Play game, then press a controller button.</li></ol><table><tbody><tr><th>Xbox control</th><th>NES action</th></tr><tr><td>D-pad / left stick</td><td>Move</td></tr><tr><td>A (bottom)</td><td>A</td></tr><tr><td>X (left) or B (right)</td><td>B</td></tr><tr><td>Menu ☰</td><td>Start</td></tr><tr><td>View ▢▢</td><td>Select</td></tr></tbody></table><p>Button test: <output id="controller-test">Press a button or move the left stick.</output></p><p class="controller-note">The game pauses while this panel is open. Use the screen for Save, Load, Settings and game tricks. Rear paddles follow your Xbox profile.</p><button id="controller-close" type="button">Back to game</button>';
 document.body.append(dialog);
 if(!window.isSecureContext){const note=document.createElement('p');note.innerHTML='Controller input needs HTTPS. <a href="https://garettwong.github.io/?v=120" target="_top">Open the secure player</a>. Games and saves stay at each address; use Export library to transfer them.';dialog.insertBefore(note,dialog.firstChild);}
 const connection=dialog.querySelector('#controller-connection'),device=dialog.querySelector('#controller-device'),test=dialog.querySelector('#controller-test');
 let padIndex=null,neutralRequired=true,resumeAfterHelp=false,stopped=false,lastStatus='';
 const codes=[0,8,2,3,4,5,6,7],names={0:'B',8:'A',2:'Select',3:'Start',4:'Up',5:'Down',6:'Left',7:'Right'};
 function mapped(pad){const down=i=>pad.buttons[i]?.pressed||pad.buttons[i]?.value>.5;const out=new Set();for(const [i,c]of [[0,8],[1,0],[2,0],[8,2],[9,3],[12,4],[13,5],[14,6],[15,7]])if(down(i))out.add(c);
  // A digital direction overrides the corresponding stick axis. Dead zone avoids drift.
  const x=pad.axes[0]||0,y=pad.axes[1]||0;if(!down(14)&&!down(15)){if(x<-.4)out.add(6);if(x>.4)out.add(7);}if(!down(12)&&!down(13)){if(y<-.4)out.add(4);if(y>.4)out.add(5);}for(const [a,b]of [[4,5],[6,7]])if(out.has(a)&&out.has(b)){out.delete(a);out.delete(b);}return out;
 }
 function show(status,pad){if(status!==lastStatus){lastStatus=status;button.textContent=status;connection.textContent=status;}button.dataset.connected=String(!!pad);device.textContent=pad?.id||'Pair in Bluetooth settings first. If already paired, press a controller button here.';}
 function poll(){if(stopped)return;let pads=[],error='';try{pads=Array.from(navigator.getGamepads?.()||[]).filter(p=>p?.connected!==false&&p);}catch{error='Controller access blocked';}
  const pad=pads.find(p=>p.index===padIndex)||pads[0];if((pad?.index??null)!==padIndex){release('gamepad');neutralRequired=true;padIndex=pad?.index??null;}
  const available=pad&&(pad.mapping==='standard'||/xbox|xinput/i.test(pad.id));const next=available?mapped(pad):new Set();
  show(!window.isSecureContext?'Controller needs HTTPS':error||(!navigator.getGamepads?'Controller API unavailable':pad?available?'Controller connected':'Controller layout unsupported':'Connect controller'),pad);
  if(dialog.open)test.textContent=next.size?[...next].map(c=>names[c]).join(' + '):'No buttons held';
  const emulator=window.EJS_emulator,active=available&&emulator?.started&&!emulator.paused&&!document.hidden&&!dialog.open;
  if(!active){release('gamepad');neutralRequired=true;}else{if(!next.size)neutralRequired=false;if(!neutralRequired)for(const code of codes)input('gamepad',0,code,next.has(code));}
  requestAnimationFrame(poll);
 }
 button.addEventListener('click',()=>{resumeAfterHelp=!!window.EJS_emulator?.started&&!window.EJS_emulator.paused;window.DreamTouch?.releaseAll();reset();if(resumeAfterHelp)window.EJS_emulator.pause();dialog.showModal();});
 dialog.querySelector('#controller-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{reset();if(resumeAfterHelp&&!document.hidden)window.EJS_emulator?.play?.();resumeAfterHelp=false;button.focus();});
 addEventListener('blur',reset);addEventListener('gamepaddisconnected',()=>{release('gamepad');neutralRequired=true;});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
 addEventListener('pagehide',event=>{reset();if(!event.persisted)stopped=true;});
 window.DreamGamepad={mapped};requestAnimationFrame(poll);
})();
