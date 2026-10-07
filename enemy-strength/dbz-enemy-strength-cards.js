/* ES28 cards retain 1–256 ranks, keyed only by this edition’s completed ROM ID. */
(()=>{'use strict';
window.DreamCrazyCardsFactory(window.DreamEnemyStrength,'DreamEnemyStrengthCards');
const cards=window.DreamEnemyStrengthCards,start=cards.start;
cards.start=function(options){
 start(options);
 const dialog=document.querySelector('body.dbz-enemy-strength-edition #dbz-card-editor');
 if(!dialog)return;
 const title=dialog.querySelector('h2');if(title)title.textContent='Edit battle cards';
 if(dialog.dataset.enemyStrengthReady)return;dialog.dataset.enemyStrengthReady='true';
 dialog.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const controls=Array.from(dialog.querySelectorAll('button,input,select,[tabindex]')).filter(el=>!el.disabled&&el.tabIndex!==-1);
  const first=controls[0],last=controls[controls.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 });
};
})();
