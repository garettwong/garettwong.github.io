/* Development fixture controls only. This file is never loaded by the game. */
(() => {'use strict';
  const $ = id => document.getElementById(id), frame = $('game-frame');
  let keyboard = false, events = [], lastReport = null;
  const mode = () => document.querySelector('[name=mode]:checked').value;
  function resize() {
    const w = Number($('width').value), h = Number($('height').value), base = Number($('game-height').value);
    const game = Math.max(180, base - (keyboard ? 260 : 0));
    $('device').style.width = `${w}px`; $('device').style.height = `${h}px`;
    document.querySelector('.phone-chrome').style.height = `${Math.max(0, h-base)}px`;
    frame.style.height = `${game}px`;
    $('keyboard-area').hidden = !keyboard;
    $('keyboard').setAttribute('aria-pressed', String(keyboard));
    $('fixture-status').textContent = `Outer ${w}×${h}; actual iframe ${w}×${game}. ${keyboard ? 'Keyboard resize simulation.' : ''}`;
  }
  function reload() {
    frame.src = `frame.html?mode=${mode()}&candidate=${$('candidate').checked ? 1 : 0}&reload=${Date.now()}`;
    lastReport = null; $('report').textContent = 'Loading actual module-created DOM…';
  }
  $('modes').addEventListener('change', reload); $('candidate').addEventListener('change', reload);
  $('preset').addEventListener('change', () => { const [w,h,g] = $('preset').value.split(','); $('width').value=w; $('height').value=h; $('game-height').value=g; keyboard=false; resize(); });
  $('resize').onclick = resize;
  // Prevent outer controls stealing iframe input focus during resize testing.
  $('keyboard').addEventListener('pointerdown', event => event.preventDefault());
  $('keyboard').onclick = () => { keyboard = !keyboard; resize(); };
  $('reopen').onclick = reload;
  $('measure').addEventListener('pointerdown', event => event.preventDefault());
  $('measure').onclick = () => frame.contentWindow.postMessage({type:'es28-layout-measure'}, location.origin);
  $('clear-log').onclick = () => { events=[]; $('events').textContent='[]'; };
  addEventListener('message', event => {
    if (event.source !== frame.contentWindow || event.origin !== location.origin) return;
    const data = event.data;
    if (data.type === 'es28-layout-report') { lastReport=data.report; $('report').textContent=JSON.stringify(lastReport,null,2); }
    if (data.type === 'es28-fixture-event') { events.push(data.event); $('events').textContent=JSON.stringify(events,null,2); }
    if (data.type === 'es28-fixture-ready') { $('fixture-status').textContent=`Actual ${data.mode} module ready. ${data.candidate?'UI163 applied.':'Baseline CSS.'}`; frame.contentWindow.postMessage({type:'es28-layout-measure'}, location.origin); }
    if (data.type === 'es28-fixture-error') $('fixture-status').textContent=`Fixture error: ${data.message}`;
  });
  resize();
})();
