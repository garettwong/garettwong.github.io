/* Upgrade the existing Crazy64 save identity to128 card points. */
(()=>{'use strict';
 window.DreamCrazyCardsFactory({...window.DreamCrazy128,prepareCards:window.DreamCrazy64.prepareRom,prepareRom:window.DreamCrazy64.prepareRom},'DreamCrazy128Cards');
})();
