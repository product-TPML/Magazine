(() => {
  const id = 'toc-admin-console';
  document.getElementById(id)?.remove();
  document.getElementById(id + '-style')?.remove();

  const params = new URLSearchParams(location.search);
  const issue = params.get('issue');
  const tocPage = Number.parseInt(params.get('p'), 10);
  const basePath = location.pathname.slice(0, location.pathname.lastIndexOf('/') + 1);
  if (!issue || !Number.isInteger(tocPage) || tocPage < 1) {
    alert('Open a magazine reader URL with ?issue=…&p=… first.');
    return;
  }

  const style = document.createElement('style');
  style.id = id + '-style';
  style.textContent = `
    #${id}{position:fixed;z-index:2147483647;top:10px;right:10px;width:min(320px,calc(100vw - 20px));max-height:calc(100dvh - 20px);overflow:auto;padding:12px;color:#f6f4e9;background:#17251d;border:1px solid #72816d;border-radius:10px;box-shadow:0 8px 36px #0009;font:14px/1.4 system-ui,sans-serif;color-scheme:dark}
    #${id} *{box-sizing:border-box;font:inherit}#${id} .ta-head{display:flex;align-items:center;gap:8px}#${id} strong{flex:1;font-size:1rem}#${id} p{margin:6px 0;color:#c5d0c6;font-size:.82rem}#${id} button,#${id} input{min-height:44px;color:inherit;background:#29392e;border:1px solid #62715f;border-radius:6px;padding:7px 10px}#${id} button{cursor:pointer}#${id} button:hover{border-color:#d8ee84}#${id} button:focus-visible,#${id} input:focus-visible,#${id} .ta-drag:focus-visible{outline:3px solid #f3bd69;outline-offset:2px}#${id} .ta-close{width:44px;padding:0;font-size:1.2rem}#${id} .ta-drag{flex:none;width:44px;height:44px;min-height:44px;padding:0;background:transparent;border-style:dashed;cursor:move;touch-action:none}#${id} .ta-finish{width:100%;margin-top:8px;color:#17200f;background:#d8ee84;border:0;font-weight:700}#${id} .ta-rows{display:grid;gap:5px;margin-top:8px}#${id} .ta-row{display:flex;align-items:center;gap:6px}#${id} .ta-row span{flex:1;color:#d5dfd4}#${id} .ta-row input{width:82px}#${id} .ta-delete{min-width:70px}#${id} .ta-status{min-height:1em;margin-bottom:0}#${id} .ta-page-label{flex:1;color:#d8ee84;font-size:.76rem}.toc-admin-page-overlay{position:absolute;inset:0;z-index:2147483646;pointer-events:auto;touch-action:none}.toc-admin-page-overlay .ta-rect{position:absolute;border:2px solid #d8ee84;background:#d8ee8440}.toc-admin-page-overlay .ta-rect.is-selected{border-color:#f3bd69;background:#f3bd6940}@media(prefers-reduced-motion:reduce){#${id},#${id} *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
  `;
  const toolbar = document.createElement('aside');
  toolbar.id = id;
  toolbar.innerHTML = '<div class="ta-head"><strong>Temporary page mapping</strong><button class="ta-drag" type="button" aria-label="Move toolbar; use arrow keys to move" title="Drag to move · arrow keys also move">⠿</button><button class="ta-close" type="button" aria-label="Close tool">×</button></div><p>Drag rectangles on this page, then enter each destination page. Local only; not authentication or publishing.</p><div class="ta-rows"></div><button class="ta-finish" type="button" disabled>Finish &amp; export</button><p class="ta-status" role="status" aria-live="polite">Loading page…</p>';
  document.head.append(style);
  document.body.append(toolbar);

  const close = () => { document.querySelectorAll('.toc-admin-page-overlay').forEach((node) => node.remove()); toolbar.remove(); style.remove(); observer.disconnect(); };
  toolbar.querySelector('.ta-close').addEventListener('click', close);
  const dragHandle = toolbar.querySelector('.ta-drag');
  let toolbarDrag = null;
  dragHandle.addEventListener('pointerdown', (event) => {
    event.preventDefault(); event.stopPropagation();
    const rect = toolbar.getBoundingClientRect();
    toolbarDrag = { pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
    toolbar.style.right = 'auto'; toolbar.style.bottom = 'auto'; toolbar.style.left = rect.left + 'px'; toolbar.style.top = rect.top + 'px';
    dragHandle.setPointerCapture(event.pointerId);
  });
  dragHandle.addEventListener('pointermove', (event) => {
    if (!toolbarDrag || toolbarDrag.pointerId !== event.pointerId) return;
    event.preventDefault(); event.stopPropagation();
    const x = Math.max(0, Math.min(innerWidth - toolbar.offsetWidth, event.clientX - toolbarDrag.offsetX));
    const y = Math.max(0, Math.min(innerHeight - toolbar.offsetHeight, event.clientY - toolbarDrag.offsetY));
    toolbar.style.left = x + 'px'; toolbar.style.top = y + 'px';
  });
  const endToolbarDrag = (event) => { if (toolbarDrag?.pointerId === event.pointerId) { event.preventDefault(); event.stopPropagation(); toolbarDrag = null; } };
  dragHandle.addEventListener('pointerup', endToolbarDrag);
  dragHandle.addEventListener('pointercancel', endToolbarDrag);
  dragHandle.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? 40 : 12;
    const rect = toolbar.getBoundingClientRect();
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
    if (!delta) return;
    event.preventDefault(); event.stopPropagation();
    toolbar.style.right = 'auto'; toolbar.style.bottom = 'auto';
    toolbar.style.left = Math.max(0, Math.min(innerWidth - toolbar.offsetWidth, rect.left + delta[0])) + 'px';
    toolbar.style.top = Math.max(0, Math.min(innerHeight - toolbar.offsetHeight, rect.top + delta[1])) + 'px';
  });
  const mappings = [];
  let pages = [];
  let active = null;
  let selected = -1;
  const status = (text) => { toolbar.querySelector('.ta-status').textContent = text; };

  function render() {
    document.querySelectorAll('#page-spread .toc-admin-page-overlay').forEach((layer) => {
      layer.replaceChildren();
      mappings.forEach((item, index) => {
        if (item.tocPage !== Number(layer.dataset.page)) return;
        const rect = document.createElement('div'); rect.className = 'ta-rect' + (index === selected ? ' is-selected' : '');
        rect.style.cssText = `left:${item.x}%;top:${item.y}%;width:${item.width}%;height:${item.height}%`;
        rect.addEventListener('pointerdown', (event) => { event.stopPropagation(); selected = index; render(); });
        layer.append(rect);
      });
    });
    const rows = toolbar.querySelector('.ta-rows'); rows.replaceChildren();
    mappings.forEach((item, index) => {
      const row = document.createElement('div'); row.className = 'ta-row';
      const name = document.createElement('span'); name.className = 'ta-page-label'; name.textContent = 'Page ' + item.tocPage + ' · Area ' + (index + 1);
      const input = document.createElement('input'); input.type = 'number'; input.min = '1'; input.max = String(pages.length); input.value = item.targetPage; input.setAttribute('aria-label', 'Area ' + (index + 1) + ' target magazine page');
      input.addEventListener('change', () => { const value = Number(input.value); if (!Number.isInteger(value) || value < 1 || value > pages.length) { input.setCustomValidity('Enter a page from 1 to ' + pages.length); input.reportValidity(); return; } input.setCustomValidity(''); item.targetPage = value; });
      const del = document.createElement('button'); del.type = 'button'; del.className = 'ta-delete'; del.textContent = 'Delete'; del.setAttribute('aria-label', 'Delete area ' + (index + 1)); del.addEventListener('click', () => { mappings.splice(index, 1); selected = -1; render(); });
      row.append(name, input, del); rows.append(row);
    });
  }
  const point = (event, rect) => ({ x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) });
  const setRectBounds = (element, a, b) => { element.style.left = Math.min(a.x, b.x) * 100 + '%'; element.style.top = Math.min(a.y, b.y) * 100 + '%'; element.style.width = Math.abs(b.x - a.x) * 100 + '%'; element.style.height = Math.abs(b.y - a.y) * 100 + '%'; };
  const begin = (event) => { if (event.target.closest('.ta-rect')) return; event.preventDefault(); event.stopPropagation(); const layer = event.currentTarget; const rect = layer.getBoundingClientRect(); const start = point(event, rect); const preview = document.createElement('div'); preview.className = 'ta-rect is-selected'; layer.append(preview); active = { start, rect, pointerId: event.pointerId, preview, tocPage: Number(layer.dataset.page), layer }; layer.setPointerCapture(event.pointerId); };
  const move = (event) => { if (!active || active.pointerId !== event.pointerId) return; event.preventDefault(); event.stopPropagation(); setRectBounds(active.preview, active.start, point(event, active.rect)); };
  const end = (event) => {
    if (!active || active.pointerId !== event.pointerId) return;
    event.preventDefault(); event.stopPropagation(); const start = active.start; const finish = point(event, active.rect); const page = active.tocPage; active.preview.remove(); active = null;
    if (Math.abs(start.x - finish.x) < .006 || Math.abs(start.y - finish.y) < .006) return;
    mappings.push({ tocPage: page, targetPage: 1, x: Math.min(start.x, finish.x) * 100, y: Math.min(start.y, finish.y) * 100, width: Math.abs(finish.x - start.x) * 100, height: Math.abs(finish.y - start.y) * 100 }); selected = mappings.length - 1; render();
  };
  const observer = new MutationObserver(attach);
  function attach() {
    const slots = [...document.querySelectorAll('#page-spread .page-slot')];
    const live = new Set(slots);
    let changed = false;
    document.querySelectorAll('#page-spread .toc-admin-page-overlay').forEach((node) => { if (!live.has(node.closest('.page-slot'))) node.remove(); });
    slots.forEach((slot) => {
      const page = Number(slot.dataset.page) + 1;
      const imageArea = slot.querySelector('.page-zoom');
      if (!imageArea) return;
      let layer = imageArea.querySelector(':scope > .toc-admin-page-overlay');
      if (!layer) {
        layer = document.createElement('div'); layer.className = 'toc-admin-page-overlay'; layer.id = id + '-overlay-' + page; layer.setAttribute('aria-label', 'Draw mapping rectangles on magazine page ' + page);
        layer.addEventListener('pointerdown', begin); layer.addEventListener('pointermove', move); layer.addEventListener('pointerup', end); layer.addEventListener('pointercancel', () => { active?.preview.remove(); active = null; });
        imageArea.append(layer);
        changed = true;
      }
      if (layer.dataset.page !== String(page)) changed = true;
      layer.dataset.page = String(page);
    });
    if (changed) render();
    if (slots.length) status('Draw areas on either visible page. Page labels identify each mapping.');
    else status('Waiting for reader pages…');
    toolbar.querySelector('.ta-finish').disabled = !slots.length;
  }

  toolbar.querySelector('.ta-finish').addEventListener('click', () => {
    const data = { issue, tocPage, mappings: mappings.map(({ tocPage, targetPage, x, y, width, height }) => ({ tocPage, targetPage, x, y, width, height })) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'toc-mappings-' + issue + '.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); status('Mapping JSON downloaded.');
  });

  fetch(basePath + 'data/' + encodeURIComponent(issue) + '/coords.json').then((response) => { if (!response.ok) throw new Error('Could not load issue page data.'); return response.json(); }).then((data) => {
    pages = data.pages;
    if (!Array.isArray(pages) || tocPage > pages.length) throw new Error('Page number is outside this issue.');
    observer.observe(document.querySelector('#page-spread') || document.body, { childList: true, subtree: true });
    attach();
  }).catch((error) => status(error.message));
})();
