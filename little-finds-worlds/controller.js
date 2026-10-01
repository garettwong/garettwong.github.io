// Xbox controls for Little Finds' canvas and its scene/dialog menus.
export function readPad(pad){
 const pressed=i=>!!(pad.buttons[i]?.pressed||pad.buttons[i]?.value>.5);
 const axis=i=>Math.abs(pad.axes[i]||0)>.22?pad.axes[i]:0;
 return {x:pressed(14)||pressed(15)?Number(pressed(15))-Number(pressed(14)):axis(0),y:pressed(12)||pressed(13)?Number(pressed(13))-Number(pressed(12)):axis(1),panX:axis(2),panY:axis(3),buttons:[0,1,2,4,5,8,9].filter(pressed)};
}
export function startController(game){
 const board=document.getElementById('board'),cursor=document.createElement('div');cursor.id='xbox-cursor';cursor.hidden=true;cursor.setAttribute('aria-hidden','true');board.append(cursor);
 const bar=document.createElement('button');bar.id='xbox-help-button';bar.textContent='Xbox controller';bar.type='button';document.querySelector('header').after(bar);
 const help=document.createElement('dialog');help.id='xbox-help';help.innerHTML='<h2>Xbox controller</h2><p id="xbox-state">Pair your controller in Bluetooth settings, then press a button.</p><p>In a scene:<br><b>Left stick / D-pad</b> — move the crosshair<br><b>A</b> — find the object under it<br><b>Right stick</b> — move the picture<br><b>LB / RB</b> — zoom out / in<br><b>X</b> — show a hint<br><b>B / View</b> — back to scenes</p><p>In menus: D-pad to choose, A to select, B to close.<br><b>Menu ☰</b> opens or closes this guide.</p><button type="button">Back to game</button>';document.body.append(help);
 bar.onclick=()=>help.showModal();help.querySelector('button').onclick=()=>help.close();
 let x=0,y=0,initialized=false,last=0,previous=new Set(),ready=false,padId=null,repeatAt=0;
 const zero=()=>{previous.clear();ready=false;cursor.hidden=true;};
 addEventListener('blur',zero);addEventListener('gamepaddisconnected',zero);document.addEventListener('visibilitychange',()=>{if(document.hidden)zero();});
 function menu(dialog,dx,dy,accept,now){
  if(!accept&&Math.abs(dx)<=.4&&Math.abs(dy)<=.4){repeatAt=0;return;}
  const scope=dialog||document.getElementById('home');
  const options=[...scope.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]')].filter(e=>e.getClientRects().length);
  if(!options.length)return;let i=options.indexOf(document.activeElement);if(i<0){i=0;options[0].focus();}
  const direction=dy>.4||dx>.4?1:dy<-.4||dx<-.4?-1:0;
  if(direction&&now>=repeatAt){i=(i+direction+options.length)%options.length;options[i].focus();options[i].scrollIntoView({block:'nearest'});repeatAt=now+200;}if(!direction)repeatAt=0;
  if(accept)options[i].click();
 }
 function poll(now){requestAnimationFrame(poll);const dt=Math.min(50,now-last||16)/1000;last=now;let pads=[];try{pads=Array.from(navigator.getGamepads?.()||[]).filter(p=>p&&p.connected!==false);}catch{}
  const pad=pads.find(p=>p.index===padId)||pads[0];const supported=pad&&(pad.mapping==='standard'||/xbox|xinput/i.test(pad.id));
  const text=!window.isSecureContext?'Xbox controller needs HTTPS':supported?'Xbox connected · controls':pad?'Controller layout unsupported':'Xbox controller · pairing help';if(bar.textContent!==text)bar.textContent=text;
  const detail=help.querySelector('#xbox-state'),message=supported?pad.id:'Pair your controller in Bluetooth settings, then press and release a button.';if(detail.textContent!==message)detail.textContent=message;
  if(!supported||document.hidden){zero();padId=pad?.index??null;return;}if(pad.index!==padId){zero();padId=pad.index;}
  const state=readPad(pad),current=new Set(state.buttons),neutral=!state.x&&!state.y&&!state.panX&&!state.panY&&!current.size;
  if(!ready){if(neutral)ready=true;previous=current;return;}const before=previous,hit=i=>current.has(i)&&!before.has(i);previous=current;
  let dialog=document.querySelector('dialog[open]');if(hit(9)){if(help.open)help.close();else if(!dialog)help.showModal();cursor.hidden=true;return;}
  if(dialog){cursor.hidden=true;if(hit(1)||hit(8)){dialog.close();return;}menu(dialog,state.x,state.y,hit(0),now);return;}
  if(!game.playing()){cursor.hidden=true;initialized=false;menu(null,state.x,state.y,hit(0),now);return;}
  const size=game.size();if(!initialized){x=size.width/2;y=size.height/2;initialized=true;}
  x=Math.max(0,Math.min(size.width,x+state.x*300*dt));y=Math.max(0,Math.min(size.height,y+state.y*300*dt));
  cursor.hidden=false;cursor.style.left=x+'px';cursor.style.top=y+'px';
  if(state.panX||state.panY)game.pan(-state.panX*400*dt,-state.panY*400*dt);
  if(hit(4))game.zoom(.8,x,y);if(hit(5))game.zoom(1.25,x,y);
  if(hit(0))game.tap(x,y);if(hit(2)){game.hint();x=size.width/2;y=size.height/2;}
  if(hit(1)||hit(8)){game.back();initialized=false;cursor.hidden=true;}
 }
 requestAnimationFrame(poll);
}
