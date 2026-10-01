/* Start controller discovery in the Home Screen app's main document, before games. */
(()=>{'use strict';
 if(window.DreamControllerHub)return;
 let pads=[],error='',signature='',sequence=0,frame=0,timer=0,stopped=false;
 function publish(){const next=error+'|'+pads.map(p=>p.index+':'+p.id).join('|');if(next===signature)return;signature=next;window.dispatchEvent(new CustomEvent('dream-controller-status'));}
 function scan(){
  if(stopped||document.hidden){pads=[];publish();return pads;}
  error='';try{if(!navigator.getGamepads)error='unavailable';pads=Array.from(navigator.getGamepads?.()||[]).filter(p=>p&&p.connected!==false);}catch(e){pads=[];error=e.name||'blocked';}
  sequence++;publish();return pads;
 }
 function stop(){stopped=true;cancelAnimationFrame(frame);clearTimeout(timer);frame=timer=0;pads=[];publish();}
 function animate(){frame=0;if(stopped)return;scan();frame=requestAnimationFrame(animate);}
 function heartbeat(){timer=0;if(stopped)return;scan();timer=setTimeout(heartbeat,250);}
 function start(){stopped=false;scan();if(!frame)frame=requestAnimationFrame(animate);if(!timer)timer=setTimeout(heartbeat,250);}
 window.DreamControllerHub={read:scan,status:()=>({count:pads.length,name:pads[0]?.id||'',error,sequence,standalone:!!navigator.standalone})};
 // Connection events alone miss devices paired before opening the shortcut.
 addEventListener('gamepadconnected',start);addEventListener('gamepaddisconnected',scan);
 addEventListener('pageshow',start);addEventListener('focus',start);addEventListener('pagehide',stop);
 document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
 for(const name of ['pointerdown','touchstart','keydown'])document.addEventListener(name,start,{capture:true,passive:true});
 start();
})();
