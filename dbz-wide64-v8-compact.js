/* Player 163: DOM presentation only. No emulator, ROM, state or save access. */
(() => {
  'use strict';
  const scope = 'dbz-wide64-edition';
  const enhanced = new WeakSet();
  let queued = false;
  let viewportQueued = false;

  function section(className) {
    const element = document.createElement('div');
    element.className = className;
    return element;
  }

  function battle(dialog) {
    if (!enhanced.has(dialog)) {
      const title = dialog.querySelector('h2');
      const start = dialog.querySelector('.enemy-strength-start');
      if (!title || !start) return;
      const focused = dialog.contains(document.activeElement) ? document.activeElement : null;
      const content = section('es163-scroll');
      const footer = section('es163-footer');
      // Snapshot the live HTMLCollection before moving its members.
      for (const child of Array.from(dialog.children)) {
        if (child !== title && child !== start) content.append(child);
      }
      footer.append(start);
      dialog.append(content, footer);
      const note = dialog.querySelector('.enemy-strength-note');
      if (note) {
        const details = document.createElement('details');
        details.className = 'es163-details';
        const label = document.createElement('summary');
        label.textContent = 'Battle details';
        const reward = document.createElement('p');
        reward.textContent = 'Enemy count is already included in the game’s normal reward.';
        note.replaceWith(details);
        details.append(label, reward, note);
      }
      for (const button of dialog.querySelectorAll('.enemy-strength-options button')) {
        const description = button.querySelector('span');
        if (description) button.title = description.textContent;
      }
      enhanced.add(dialog);
      if (focused?.isConnected && document.activeElement !== focused) focused.focus({ preventScroll: true });
    }
    const summary = dialog.querySelector('.enemy-strength-summary');
    const match = summary?.textContent.match(/^Enemy BP & HP: (\d+)×\. Victory BP: (\d+)×\./);
    if (match) summary.textContent = `BP / HP ${match[1]}× · Victory BP ${match[2]}×`;
    const feedback = dialog.querySelector('.enemy-strength-feedback');
    const original = feedback?.textContent.match(/^Original: (\d+) opponents? in this fight\.$/);
    if (original) feedback.textContent = `Original roster: ${original[1]}`;
  }

  function cards(dialog) {
    if (enhanced.has(dialog)) return;
    const title = dialog.querySelector('h2');
    const actions = dialog.querySelector('.dbz-card-actions');
    const feedback = dialog.querySelector('.dbz-card-feedback');
    if (!title || !actions || !feedback) return;
    const focused = dialog.contains(document.activeElement) ? document.activeElement : null;
    const content = section('es163-scroll');
    const footer = section('es163-footer');
    // Snapshot the live HTMLCollection before moving its members.
    for (const child of Array.from(dialog.children)) {
      if (child !== title && child !== actions && child !== feedback) content.append(child);
    }
    footer.append(feedback, actions);
    dialog.append(content, footer);
    const range = dialog.querySelector('#crazy-card-range');
    const limits = range?.textContent.match(/^Attack: (\S+)\. Defence: (\S+)\./);
    if (limits) {
      range.title = range.textContent;
      range.textContent = limits[1] === limits[2]
        ? `Attack / Defence: ${limits[1]}`
        : `Attack: ${limits[1]} · Defence: ${limits[2]}`;
    }
    const hint = dialog.querySelector('.dbz-card-hint');
    if (hint) {
      hint.title = hint.textContent;
      hint.textContent = 'Locked cards stay on new hands.';
    }
    for (const input of dialog.querySelectorAll('input')) {
      input.setAttribute('enterkeyhint', 'done');
      input.setAttribute('autocapitalize', 'off');
    }
    enhanced.add(dialog);
    if (focused?.isConnected && document.activeElement !== focused) focused.focus({ preventScroll: true });
  }

  function skills(dialog) {
    const list = dialog.querySelector('.dbz-skill-list');
    if (!list) return;
    const view = list.querySelector('button[data-skill]') ? 'moves' : 'folders';
    if (list.dataset.es163View !== view) list.dataset.es163View = view;
    if (dialog.dataset.es163View !== view) dialog.dataset.es163View = view;
  }

  function keepFocusedInputVisible() {
    const input = document.activeElement;
    if (!input?.matches?.('input, select')) return;
    const content = input.closest('#dbz-card-editor .es163-scroll');
    if (!content) return;
    const bounds = content.getBoundingClientRect();
    const control = input.getBoundingClientRect();
    if (control.bottom > bounds.bottom - 4) content.scrollTop += control.bottom - bounds.bottom + 4;
    else if (control.top < bounds.top + 4) content.scrollTop += control.top - bounds.top - 4;
  }

  function viewport() {
    viewportQueued = false;
    if (!document.body?.classList.contains(scope)) return;
    const visual = window.visualViewport;
    const width = Math.min(window.innerWidth, visual?.width || window.innerWidth);
    const height = Math.min(window.innerHeight, visual?.height || window.innerHeight);
    const properties = {
      '--es163-vwidth': `${width}px`,
      '--es163-vheight': `${height}px`,
      '--es163-vleft': `${Math.max(0, visual?.offsetLeft || 0)}px`,
      '--es163-vtop': `${Math.max(0, visual?.offsetTop || 0)}px`,
    };
    for (const [name, value] of Object.entries(properties)) {
      if (document.body.style.getPropertyValue(name) !== value) document.body.style.setProperty(name, value);
    }
    keepFocusedInputVisible();
  }

  function scheduleViewport() {
    if (viewportQueued) return;
    viewportQueued = true;
    requestAnimationFrame(viewport);
  }

  function refresh() {
    queued = false;
    if (!document.body?.classList.contains(scope)) return;
    const selector = document.getElementById('dbz-enemy-strength-choice');
    const editor = document.getElementById('dbz-card-editor');
    const catalog = document.getElementById('dbz-skills');
    if (selector) battle(selector);
    if (editor) cards(editor);
    if (catalog) skills(catalog);
    scheduleViewport();
  }

  function schedule() {
    if (queued) return;
    queued = true;
    queueMicrotask(refresh);
  }

  function start() {
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'hidden'],
    });
    window.addEventListener('resize', scheduleViewport, { passive: true });
    window.visualViewport?.addEventListener('resize', scheduleViewport, { passive: true });
    window.visualViewport?.addEventListener('scroll', scheduleViewport, { passive: true });
    document.addEventListener('focusin', scheduleViewport);
    refresh();
  }

  window.DreamEnemyStrengthUI163 = Object.freeze({ refresh });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
