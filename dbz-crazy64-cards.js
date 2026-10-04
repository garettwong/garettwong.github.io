/* Crazy64 uses the shared card editor with its own ROM/save identity. */
(()=>{'use strict';
 if(!window.DreamCrazyCardsFactory)throw Error('Crazy64 card editor requires dbz-crazy-cards.js.');
 if(!window.DreamCrazy64)throw Error('Crazy64 configuration is unavailable.');
 window.DreamCrazyCardsFactory(window.DreamCrazy64,'DreamCrazy64Cards');
})();
