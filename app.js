const savedTheme = localStorage.getItem('reader-theme');
const state = {
  issueKey: currentIssueFromUrl(),
  catalog: null,
  issue: null,
  page: 0,
  view: 'page',
  articleId: null,
  panel: null,
  panelReturnFocus: null,
  loaded: new Set(),
  textSize: Number(localStorage.getItem('reader-text-size') || 1),
  saved: JSON.parse(localStorage.getItem('reader-saved') || '{}'),
  savedPages: JSON.parse(localStorage.getItem('reader-saved-pages') || '{}'),
  theme: savedTheme === 'sepia' || savedTheme === 'dark' ? savedTheme : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'sepia'),
  speech: { status: 'idle', index: 0, sentences: [], voices: [] }
};

const $ = (selector) => document.querySelector(selector);
const pageStrip = $('#page-strip');
const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function applyTheme() {
  document.documentElement.dataset.theme = state.theme === 'dark' ? '' : 'sepia';
  localStorage.setItem('reader-theme', state.theme);
}

applyTheme();

function issuePath(file) {
  return `data/${state.issue.key}/${file}`;
}

function imagePath(page, thumb = false) {
  const filename = (thumb ? page.imgThumbFile : page.imgFile).split('/').pop();
  return issuePath(`${thumb ? 'thumbs' : 'pages'}/${filename}`);
}

function parsePercent(value) {
  return Number.parseFloat(String(value || 0)) / 100;
}

function readPageNumber(value) {
  const page = Number.parseInt(value, 10);
  return Number.isFinite(page) ? Math.max(1, page) : 1;
}

function issueDate(key) {
  const [, year, month, day] = key.match(/^[A-Z]{2}-(\d{4})-(\d{2})-(\d{2})$/) || [];
  return year ? new Date(`${year}-${month}-${day}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : key;
}

function publication(key) { return key.startsWith('MY') ? 'MY' : 'SU'; }

function issueFromPath(pathname = location.pathname) {
  const match = pathname.match(/^\/(sudha|mayura)\/(\d{4}-\d{2}-\d{2})\/read\/?$/i);
  return match ? `${match[1].toUpperCase() === 'MAYURA' ? 'MY' : 'SU'}-${match[2]}` : null;
}

function currentIssueFromUrl() { return new URLSearchParams(location.search).get('issue') || issueFromPath(); }

function readerPath(key) { return `/${publication(key) === 'MY' ? 'mayura' : 'sudha'}/${key.slice(3)}/read/`; }

function readerUrl(key, page, view = 'page', articleId = null) {
  const params = new URLSearchParams({ p: String(page) });
  if (view === 'text' && articleId) { params.set('view', 'text'); params.set('article', articleId); }
  return `${readerPath(key)}?${params}`;
}

function allIssues() { return state.catalog?.publications.flatMap((publication) => publication.issues.map((issue) => ({ ...issue, publication: publication.code, publicationTitle: publication.title }))) || []; }

function issueSummary(key) { return allIssues().find((issue) => issue.key === key); }

function articleIds() {
  return [...new Set(state.issue.pages.flatMap((page) => page.articles.map((article) => String(article.id))))];
}

function articleForPage(pageIndex) {
  const page = state.issue.pages[pageIndex];
  const last = state.issue.lastOpened?.[pageIndex];
  const selected = page.articles.find((item) => String(item.id) === last);
  return selected || [...page.articles].sort((a, b) => (parsePercent(b.width) * parsePercent(b.height)) - (parsePercent(a.width) * parsePercent(a.height)))[0];
}

function currentArticle() {
  return state.issue.articles[state.articleId] || null;
}

function articleHref(articleId) {
  const article = state.issue.articles[articleId];
  return readerUrl(state.issue.key, article.pageIndex + 1, 'text', articleId);
}

function updateUrl(push = false) {
  const url = readerUrl(state.issue.key, state.page + 1, state.view, state.articleId);
  history[push ? 'pushState' : 'replaceState']({}, '', url);
}

function renderEditionSelect() {
  const summary = issueSummary(state.issue.key);
  $('#edition-cover').src = issuePath(summary?.cover || 'cover.jpg');
  $('#edition-label').textContent = summary?.label || issueDate(state.issue.key);
  $('#publication-select').value = publication(state.issue.key);
}

function renderHeader() {
  const article = currentArticle();
  $('#app-header').classList.toggle('is-collapsed', state.view === 'text' && $('#article-scroll').scrollTop > 48);
  $('.page-header').hidden = state.view === 'text';
  $('.text-header').hidden = state.view !== 'text';
  $('#article-title').textContent = article?.title || 'Article';
  $('#article-meta').textContent = [article?.byline, article?.section].filter(Boolean).join(' · ');
  $('#text-page-meta').textContent = `${article?.section || 'Article'} · Page ${(article?.pageIndex ?? state.page) + 1}`;
  $('#save-button').textContent = state.saved[state.articleId] ? '★' : '☆';
  $('#save-button').setAttribute('aria-label', state.saved[state.articleId] ? 'Remove saved article' : 'Save article');
  document.documentElement.style.setProperty('--article-size', `${[1, 1.15, 1.32][state.textSize] || 1}rem`);
}

function renderNav() {
  const items = state.view === 'text'
    ? [['contents', '☷', 'Contents'], ['listen', state.speech.status === 'playing' ? '⏸' : '▶', 'Listen'], ['saved', '☆', 'Saved']]
    : [['contents', '☷', 'Contents'], ['pages', '▦', 'Pages'], ['saved', '☆', 'Saved']];
  $('#context-nav').replaceChildren(...items.map(([id, icon, label]) => {
    const button = document.createElement('button');
    button.className = `context-item${state.panel === id ? ' is-active' : ''}`;
    button.type = 'button';
    button.dataset.panel = id;
    button.innerHTML = `<span aria-hidden="true">${icon}</span><span>${label}</span>`;
    return button;
  }));
}

function renderModeToggle() {
  const hasArticle = Boolean(articleForPage(state.page));
  const toggle = $('#mode-toggle');
  toggle.hidden = !hasArticle;
  toggle.href = state.view === 'page' ? readerUrl(state.issue.key, state.page + 1, 'text', articleForPage(state.page)?.id) : readerUrl(state.issue.key, state.page + 1);
  toggle.querySelector('.mode-page').classList.toggle('is-current', state.view === 'page');
  toggle.querySelector('.mode-text').classList.toggle('is-current', state.view === 'text');
}

function pageKey(index = state.page) { return `${state.issue.key}:${index}`; }

function isPageSaved(index = state.page) { return Boolean(state.savedPages[pageKey(index)]); }

function renderPageStrip() {
  pageStrip.replaceChildren(...state.issue.pages.map((page, index) => {
    const slide = document.createElement('div');
    slide.className = 'page-slide';
    slide.dataset.page = index;
    const art = document.createElement('div');
    art.className = 'page-art';
    art.style.setProperty('--page-ratio', `${page.width || 3} / ${page.height || 4}`);
    const image = document.createElement('img');
    image.alt = `Page ${index + 1}`;
    image.loading = index <= 1 ? 'eager' : 'lazy';
    image.dataset.src = imagePath(page);
    const placeholder = document.createElement('span');
    placeholder.className = 'page-placeholder';
    placeholder.textContent = `Page ${index + 1}`;
    art.append(image, placeholder);
    page.articles.forEach((article) => {
      const hotspot = document.createElement('button');
      hotspot.className = 'hotspot';
      hotspot.type = 'button';
      hotspot.style.top = `${parsePercent(article.top) * 100}%`;
      hotspot.style.left = `${parsePercent(article.left) * 100}%`;
      hotspot.style.width = `${parsePercent(article.width) * 100}%`;
      hotspot.style.height = `${parsePercent(article.height) * 100}%`;
      hotspot.dataset.article = article.id;
      hotspot.setAttribute('aria-label', `Read: ${state.issue.articles[article.id]?.title || `article ${article.id}`}`);
      art.append(hotspot);
    });
    slide.append(art);
    return slide;
  }));
  syncLoadedPages();
  pageStrip.querySelector(`[data-page="${state.page}"]`)?.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
}

function syncLoadedPages() {
  const slides = [...pageStrip.children];
  slides.forEach((slide, index) => {
    if (Math.abs(index - state.page) > 1) return;
    const image = slide.querySelector('img');
    if (!image.src) image.src = image.dataset.src;
    state.loaded.add(index);
  });
}

function setPage(pageIndex, { push = false, scroll = true } = {}) {
  stopSpeech();
  state.page = Math.max(0, Math.min(pageIndex, state.issue.pages.length - 1));
  state.loaded.add(state.page);
  state.issue.lastOpened ||= {};
  if (state.view === 'page') state.articleId = null;
  if (scroll) pageStrip.querySelector(`[data-page="${state.page}"]`)?.scrollIntoView({ behavior: prefersReducedMotion.matches ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
  syncLoadedPages();
  updateUrl(push);
  localStorage.setItem(`reader-resume:${state.issue.key}`, String(state.page));
  renderPageControls();
  renderModeToggle();
}

function renderPageControls() {
  $('#page-indicator').textContent = `Page ${state.page + 1} / ${state.issue.pages.length}`;
  $('#previous-page').disabled = state.page === 0;
  $('#next-page').disabled = state.page === state.issue.pages.length - 1;
}

async function openArticle(articleId, { push = true } = {}) {
  const article = state.issue.articles[articleId];
  if (!article) return;
  stopSpeech();
  state.articleId = articleId;
  state.page = article.pageIndex;
  state.view = 'text';
  state.issue.lastOpened ||= {};
  state.issue.lastOpened[state.page] = articleId;
  renderHeader();
  renderNav();
  renderModeToggle();
  $('.page-view').hidden = true;
  $('.text-view').hidden = false;
  $('#article-content').innerHTML = '<p class="loading">Loading article…</p>';
  $('#article-scroll').scrollTop = 0;
  updateUrl(push);
  try {
    const response = await fetch(issuePath(`articles/${articleId}.html`));
    if (!response.ok) throw new Error(`Article ${articleId} unavailable`);
    const html = await response.text();
    $('#article-content').innerHTML = articleMarkup(html, article);
    prepareSpeech();
  } catch (error) {
    $('#article-content').innerHTML = `<p role="alert">Could not load this article.</p>`;
    console.error(error);
  }
  renderHeader();
  renderListenPlayer();
}

function articleMarkup(html, article) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, iframe, form, [style*="display:none"], .adPlaceholder').forEach((node) => node.remove());
  doc.querySelectorAll('*').forEach((node) => [...node.attributes].forEach((attribute) => {
    if (attribute.name.toLowerCase().startsWith('on')) node.removeAttribute(attribute.name);
  }));
  doc.querySelectorAll('img').forEach((image) => {
    const filename = image.getAttribute('src')?.split('/').pop();
    if (filename) image.src = issuePath(`media/${filename}`);
    image.removeAttribute('style');
  });
  doc.querySelectorAll('a').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (href && !/^(https?:|mailto:|#)/i.test(href)) link.removeAttribute('href');
  });
  const root = doc.querySelector('.articleDetail') || doc.body;
  const title = article.title ? `<h1>${escapeHtml(article.title)}</h1>` : '';
  const meta = [article.byline, article.section].filter(Boolean).map(escapeHtml).join(' · ');
  const footer = `<div class="article-footer">${article.previous ? `<a href="${articleHref(article.previous)}" data-article-link="${article.previous}">← Previous article</a>` : '<span></span>'}${article.next ? `<a href="${articleHref(article.next)}" data-article-link="${article.next}">Next article →</a>` : '<span></span>'}</div>`;
  root.querySelector('h1')?.remove();
  return `${title}${meta ? `<p class="byline">${meta}</p>` : ''}${root.innerHTML}${footer}`;
}

function prepareSpeech() {
  state.speech.sentences = [];
  state.speech.index = 0;
  const root = $('#article-content');
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.nodeValue.trim() && !node.parentElement.closest('h1, .byline, .article-footer') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const parts = node.nodeValue.trim().split(/(?<=[.!?।॥])\s+/u);
    if (parts.length === 1) {
      const span = document.createElement('span');
      span.className = 'speech-sentence';
      span.dataset.speechIndex = state.speech.sentences.length;
      span.textContent = node.nodeValue;
      state.speech.sentences.push(parts[0]);
      node.replaceWith(span);
      return;
    }
    const fragment = document.createDocumentFragment();
    parts.forEach((part, index) => {
      const span = document.createElement('span');
      span.className = 'speech-sentence';
      span.dataset.speechIndex = state.speech.sentences.length;
      span.textContent = part;
      state.speech.sentences.push(part);
      fragment.append(span);
      if (index < parts.length - 1) fragment.append(' ');
    });
    node.replaceWith(fragment);
  });
  loadVoices();
}

function loadVoices() {
  if (!('speechSynthesis' in window)) {
    state.speech.voices = [];
    renderListenPlayer();
    return;
  }
  state.speech.voices = speechSynthesis.getVoices().filter((voice) => /^kn[-_]/i.test(voice.lang));
  const select = $('#listen-voice');
  select.replaceChildren(...state.speech.voices.map((voice) => new Option(voice.name, voice.voiceURI)));
  select.disabled = !state.speech.voices.length;
  renderListenPlayer();
}

function clearSpeechHighlight() {
  document.querySelectorAll('.speech-current').forEach((node) => node.classList.remove('speech-current'));
}

function speakCurrentSentence() {
  if (!state.speech.sentences.length || !state.speech.voices.length) return;
  speechSynthesis.cancel();
  clearSpeechHighlight();
  const sentence = document.querySelector(`[data-speech-index="${state.speech.index}"]`);
  sentence?.classList.add('speech-current');
  sentence?.scrollIntoView({ behavior: prefersReducedMotion.matches ? 'auto' : 'smooth', block: 'center' });
  const utterance = new SpeechSynthesisUtterance(state.speech.sentences[state.speech.index]);
  utterance.lang = 'kn-IN';
  utterance.rate = Number($('#listen-rate').value || 1);
  utterance.voice = state.speech.voices.find((voice) => voice.voiceURI === $('#listen-voice').value) || state.speech.voices[0];
  utterance.onend = () => {
    if (state.speech.status !== 'playing') return;
    state.speech.index += 1;
    if (state.speech.index >= state.speech.sentences.length) {
      state.speech.status = 'idle';
      state.speech.index = 0;
      clearSpeechHighlight();
      renderNav();
      renderListenPlayer();
      return;
    }
    speakCurrentSentence();
  };
  utterance.onerror = () => { state.speech.status = 'idle'; renderNav(); renderListenPlayer(); };
  state.speech.utterance = utterance;
  speechSynthesis.speak(utterance);
  renderNav();
  renderListenPlayer();
}

function toggleSpeech() {
  if (!('speechSynthesis' in window) || !state.speech.voices.length) return;
  if (state.speech.status === 'playing') {
    speechSynthesis.pause();
    state.speech.status = 'paused';
  } else if (state.speech.status === 'paused') {
    speechSynthesis.resume();
    state.speech.status = 'playing';
  } else {
    state.speech.status = 'playing';
    speakCurrentSentence();
    return;
  }
  renderNav();
  renderListenPlayer();
}

function stopSpeech() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  state.speech.status = 'idle';
  state.speech.index = 0;
  state.speech.utterance = null;
  clearSpeechHighlight();
  renderNav();
  renderListenPlayer();
}

function renderListenPlayer() {
  const player = $('#listen-player');
  if (!player) return;
  player.hidden = state.view !== 'text';
  const supported = 'speechSynthesis' in window && state.speech.voices.length > 0;
  $('#listen-play').disabled = !supported;
  $('#listen-play').textContent = state.speech.status === 'playing' ? 'Ⅱ' : '▶';
  $('#listen-play').setAttribute('aria-label', state.speech.status === 'playing' ? 'Pause article' : 'Play article');
  $('#listen-status').textContent = supported ? (state.speech.status === 'paused' ? 'Paused' : state.speech.status === 'playing' ? 'Reading aloud' : 'Listen') : 'No Kannada voice available on this device';
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value || '';
  return div.innerHTML;
}

function renderPanel() {
  const host = $('#panel-host');
  host.hidden = !state.panel;
  const modal = Boolean(state.panel && innerWidth < 1024);
  document.querySelectorAll('#app-header, main, #mode-toggle, #context-nav, #listen-player').forEach((element) => { element.inert = modal; });
  $('.panel-card').toggleAttribute('aria-modal', modal);
  renderNav();
  if (!state.panel) return;
  const titles = { contents: 'Contents', pages: 'Pages', saved: 'Saved', listen: 'Listen', search: 'Search', more: 'More', editions: 'Editions' };
  $('#panel-title').textContent = titles[state.panel] || 'Reader';
  const body = $('#panel-body');
  if (state.panel === 'contents') body.innerHTML = contentsMarkup();
  if (state.panel === 'pages') body.innerHTML = pagesMarkup();
  if (state.panel === 'saved') body.innerHTML = savedMarkup();
  if (state.panel === 'listen') body.innerHTML = '<p class="panel-row">Speech playback will be added next. The article text is ready for it.</p>';
  if (state.panel === 'search') body.innerHTML = searchMarkup();
  if (state.panel === 'more') body.innerHTML = moreMarkup();
  if (state.panel === 'editions') body.innerHTML = editionsMarkup();
  if (state.panel === 'pages') requestAnimationFrame(() => body.querySelector('.is-current')?.scrollIntoView({ block: 'nearest' }));
}

function openPanel(panel, trigger = document.activeElement) {
  state.panel = panel;
  state.panelReturnFocus = trigger;
  renderPanel();
  requestAnimationFrame(() => $('#panel-body')?.querySelector('button, input, select')?.focus());
}

function closePanel() {
  const returnFocus = state.panelReturnFocus;
  state.panel = null;
  state.panelReturnFocus = null;
  renderPanel();
  if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
}

function contentsMarkup() {
  const ids = articleIds();
  if (!ids.length) return pageListMarkup();
  const groups = new Map();
  ids.forEach((id) => { const article = state.issue.articles[id]; const section = article.section || 'Other'; if (!groups.has(section)) groups.set(section, []); groups.get(section).push(article); });
  return [...groups].map(([section, articles]) => `<section class="panel-section"><h3>${escapeHtml(section)}</h3>${articles.map((article) => `<button class="panel-row" type="button" data-article-link="${article.id}"><span><strong>${escapeHtml(article.title || `Article ${article.id}`)}</strong><small>${escapeHtml([article.byline, `Page ${article.pageIndex + 1}`].filter(Boolean).join(' · '))}</small></span></button>`).join('')}</section>`).join('');
}

function pagesMarkup() {
  const scrub = state.issue.pages.length > 80 ? `<label class="page-scrub">Page <output id="scrub-value">${state.page + 1}</output> / ${state.issue.pages.length}<input id="page-scrub" type="range" min="1" max="${state.issue.pages.length}" value="${state.page + 1}" aria-label="Jump to page"></label>` : '';
  return `${scrub}<div class="page-grid">${state.issue.pages.map((page, index) => `<button class="page-thumb${index === state.page ? ' is-current' : ''}" type="button" data-page-link="${index}" aria-label="Go to page ${index + 1}"><img loading="lazy" src="${imagePath(page, true)}" alt=""><span>${index + 1}</span></button>`).join('')}</div>`;
}

function pageListMarkup() {
  return `<section class="panel-section"><h3>Pages</h3>${state.issue.pages.map((page, index) => `<button class="panel-row" type="button" data-page-link="${index}"><span><strong>Page ${index + 1}</strong><small>${page.articles.length ? 'Article available' : 'Page only'}</small></span></button>`).join('')}</section>`;
}

function savedMarkup() {
  const savedArticles = Object.keys(state.saved).filter((id) => state.saved[id] && state.issue.articles[id]);
  const savedPages = Object.keys(state.savedPages).filter((key) => key.startsWith(`${state.issue.key}:`)).map((key) => Number(key.split(':').pop()));
  const pageRows = savedPages.map((index) => `<button class="panel-row" type="button" data-page-link="${index}"><span><strong>★ Page ${index + 1}</strong><small>Saved page</small></span></button>`).join('');
  return `<button class="panel-row" type="button" data-page-link="${Number(localStorage.getItem(`reader-resume:${state.issue.key}`) || 0)}"><span><strong>Resume this edition</strong><small>Page ${Number(localStorage.getItem(`reader-resume:${state.issue.key}`) || 0) + 1}</small></span></button>${pageRows}${savedArticles.length ? savedArticles.map((id) => `<button class="panel-row" type="button" data-article-link="${id}"><span><strong>★ ${escapeHtml(state.issue.articles[id].title)}</strong><small>Saved article</small></span></button>`).join('') : '<p class="panel-row">No saved articles yet.</p>'}`;
}

function moreMarkup() {
  const pageLabel = isPageSaved() ? 'Remove page bookmark' : 'Save current page';
  return `<div class="more-actions"><button class="panel-row" type="button" data-action="save-page"><span><strong>${pageLabel}</strong><small>Keep this page in Saved</small></span></button><button class="panel-row" type="button" data-action="open-page"><span><strong>Open in pages</strong><small>Return to the source page</small></span></button><button class="panel-row" type="button" data-action="share-page"><span><strong>Share page image</strong><small>Use Web Share when available</small></span></button><button class="panel-row" type="button" data-action="download-page"><span><strong>Download page image</strong><small>Save the current page locally</small></span></button><button class="panel-row" type="button" data-action="share-pdf"><span><strong>Share edition PDF</strong><small>Use Web Share when available</small></span></button><button class="panel-row" type="button" data-action="download-pdf"><span><strong>Download edition PDF</strong><small>Save the assembled issue</small></span></button><button class="panel-row" type="button" data-action="theme"><span><strong>Theme: ${escapeHtml(state.theme)}</strong><small>Cycle dark and sepia</small></span></button><button class="panel-row" type="button" data-action="editions"><span><strong>Switch edition</strong><small>Browse the cover grid</small></span></button></div>`;
}

function editionsMarkup() {
  return `<div class="edition-grid">${allIssues().map((issue) => `<button class="edition-card${issue.key === state.issue.key ? ' is-current' : ''}" type="button" data-edition-link="${issue.key}"><img src="data/${issue.key}/${escapeHtml(issue.cover)}" alt=""><strong>${escapeHtml(issue.publicationTitle)}</strong><span>${escapeHtml(issue.label)}</span></button>`).join('')}</div>`;
}

function searchMarkup() {
  return `<form class="search-form" id="search-form"><input id="search-input" type="search" placeholder="Search this issue" aria-label="Search this issue"><button type="submit">Search</button></form><div id="search-results"></div>`;
}

function runSearch(query) {
  const result = articleIds().map((id) => state.issue.articles[id]).filter((article) => `${article.title} ${article.byline} ${article.section} ${article.plainText || ''}`.toLowerCase().includes(query.toLowerCase()));
  $('#search-results').innerHTML = result.length ? result.map((article) => `<button class="panel-row" type="button" data-article-link="${article.id}"><span><strong>${escapeHtml(article.title)}</strong><small>Page ${article.pageIndex + 1}</small></span></button>`).join('') : '<p class="panel-row">No matches.</p>';
}

function renderArticleMetaFromHtml(id, html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const title = doc.querySelector('h1 p, h1')?.textContent.trim() || `Article ${id}`;
  const byline = state.issue.bylines[id]?.byline || '';
  const section = state.issue.bylines[id]?.section || '';
  const plainText = doc.querySelector('.articleDetail')?.textContent.replace(/\s+/g, ' ').trim() || '';
  return { title, byline, section, plainText };
}

async function loadArticleMeta() {
  const ids = articleIds();
  await Promise.all(ids.map(async (id) => {
    try {
      const response = await fetch(issuePath(`articles/${id}.html`));
      if (!response.ok) return;
      const meta = renderArticleMetaFromHtml(id, await response.text());
      Object.assign(state.issue.articles[id], meta);
    } catch { /* an incomplete article should not block the issue */ }
  }));
}

function normalizeIssue(key, coords, bylines) {
  const articles = {};
  const pages = (coords.pages || []).map((page, index) => ({ ...page, index, articles: page.articles || [] }));
  pages.forEach((page) => page.articles.forEach((hotspot) => {
    const id = String(hotspot.id);
    const existing = articles[id] || { id, pageIndex: indexOfFirstPage(pages, id), ...bylines[id] };
    existing.pageIndex = Math.min(existing.pageIndex, page.index);
    articles[id] = existing;
  }));
  const ordered = Object.values(articles).sort((a, b) => a.pageIndex - b.pageIndex);
  ordered.forEach((article, index) => { article.previous = ordered[index - 1]?.id; article.next = ordered[index + 1]?.id; });
  return { key, pages, articles, bylines, lastOpened: {} };
}

function indexOfFirstPage(pages, id) { return pages.findIndex((page) => page.articles.some((article) => String(article.id) === id)); }

async function loadIssue(key) {
  stopSpeech();
  await loadCatalog();
  key ||= state.catalog.publications[0].issues[0].key;
  state.issueKey = key;
  const [coordsResponse, bylinesResponse] = await Promise.all([fetch(`data/${key}/coords.json`), fetch(`data/${key}/bylines.json`).catch(() => null)]);
  if (!coordsResponse.ok) throw new Error(`Could not load ${key}`);
  const coords = await coordsResponse.json();
  const bylines = bylinesResponse?.ok ? await bylinesResponse.json() : {};
  state.issue = normalizeIssue(key, coords, bylines);
  state.issue.lastOpened = {};
  state.loaded = new Set();
  const params = new URLSearchParams(location.search);
  const requestedPage = readPageNumber(params.get('p')) - 1;
  const resume = Number(localStorage.getItem(`reader-resume:${key}`) || 0);
  state.page = Math.max(0, Math.min(requestedPage >= 0 ? requestedPage : resume, state.issue.pages.length - 1));
  state.articleId = params.get('article') && state.issue.articles[params.get('article')] ? params.get('article') : null;
  state.view = params.get('view') === 'text' && state.articleId ? 'text' : 'page';
  renderEditionSelect();
  renderPageStrip();
  renderPageControls();
  renderHeader();
  renderNav();
  renderModeToggle();
  $('.page-view').hidden = state.view === 'text';
  $('.text-view').hidden = state.view !== 'text';
  if (state.view === 'text') await openArticle(state.articleId, { push: false });
  renderListenPlayer();
  loadArticleMeta().then(() => { renderPageStrip(); renderPanel(); renderHeader(); renderListenPlayer(); });
}

async function loadCatalog() {
  if (state.catalog) return;
  const response = await fetch('generated/catalog.json');
  if (!response.ok) throw new Error('Could not load the edition catalog');
  state.catalog = await response.json();
}

function toggleSaved() {
  if (!state.articleId) return;
  if (state.saved[state.articleId]) delete state.saved[state.articleId]; else state.saved[state.articleId] = true;
  localStorage.setItem('reader-saved', JSON.stringify(state.saved));
  renderHeader();
}

function togglePageSaved(index = state.page) {
  const key = pageKey(index);
  if (state.savedPages[key]) delete state.savedPages[key]; else state.savedPages[key] = true;
  localStorage.setItem('reader-saved-pages', JSON.stringify(state.savedPages));
}

async function shareCurrent() {
  const title = currentArticle()?.title || `${state.issue.key} · Page ${state.page + 1}`;
  try {
    if (navigator.share) await navigator.share({ title, url: location.href });
    else await navigator.clipboard.writeText(location.href);
    $('#panel-body').insertAdjacentHTML('afterbegin', '<p class="panel-note" role="status">Link ready to share.</p>');
  } catch (error) {
    if (error.name !== 'AbortError') $('#panel-body').insertAdjacentHTML('afterbegin', '<p class="panel-note" role="status">Sharing was not available.</p>');
  }
}

async function shareFile(url, filename, type) {
  try {
    const response = await fetch(url);
    const file = new File([await response.blob()], filename, { type });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ title: filename, files: [file] });
    else await shareCurrent();
  } catch (error) {
    if (error.name !== 'AbortError') $('#panel-body').insertAdjacentHTML('afterbegin', '<p class="panel-note" role="status">Sharing was not available.</p>');
  }
}

function downloadFile(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
}

function cycleTheme() {
  state.theme = state.theme === 'dark' ? 'sepia' : 'dark';
  applyTheme();
}

function switchEdition(key) {
  closePanel();
  history.pushState({}, '', readerUrl(key, 1));
  loadIssue(key).catch(console.error);
}

$('#previous-page').addEventListener('click', () => setPage(state.page - 1));
$('#next-page').addEventListener('click', () => setPage(state.page + 1));
$('#edition-button').addEventListener('click', (event) => openPanel('editions', event.currentTarget));
$('#publication-select').addEventListener('change', (event) => {
  const next = allIssues().find((issue) => issue.publication === event.target.value)?.key;
  if (next) switchEdition(next);
});
$('#mode-toggle').addEventListener('click', (event) => { event.preventDefault(); state.view === 'page' ? openArticle(articleForPage(state.page)?.id) : returnToPage(); });
$('#back-button').addEventListener('click', returnToPage);
$('#save-button').addEventListener('click', toggleSaved);
$('#text-smaller').addEventListener('click', () => { state.textSize = Math.max(0, state.textSize - 1); localStorage.setItem('reader-text-size', state.textSize); renderHeader(); });
$('#text-larger').addEventListener('click', () => { state.textSize = Math.min(2, state.textSize + 1); localStorage.setItem('reader-text-size', state.textSize); renderHeader(); });
$('#search-button').addEventListener('click', (event) => openPanel('search', event.currentTarget));
$('#more-button').addEventListener('click', (event) => openPanel('more', event.currentTarget));
$('#text-more-button').addEventListener('click', (event) => openPanel('more', event.currentTarget));
$('#close-panel').addEventListener('click', closePanel);
$('#panel-host').addEventListener('submit', (event) => { if (event.target.id !== 'search-form') return; event.preventDefault(); runSearch($('#search-input').value.trim()); });
$('#panel-host').addEventListener('input', (event) => { if (event.target.id === 'page-scrub') $('#scrub-value').value = event.target.value; });
$('#panel-host').addEventListener('change', (event) => {
  if (event.target.id !== 'page-scrub') return;
  closePanel();
  state.view = 'page';
  $('.page-view').hidden = false;
  $('.text-view').hidden = true;
  setPage(Number(event.target.value) - 1, { push: true });
  renderHeader();
  renderNav();
});
$('#panel-host').addEventListener('click', (event) => {
  if (event.target.matches('[data-close-panel]')) { closePanel(); return; }
  const editionLink = event.target.closest('[data-edition-link]');
  if (editionLink) { switchEdition(editionLink.dataset.editionLink); return; }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'save-page') { togglePageSaved(); renderPanel(); return; }
  if (action === 'open-page') { closePanel(); if (state.view === 'text') returnToPage(); return; }
  if (action === 'share-page') { shareFile(imagePath(state.issue.pages[state.page]), `${state.issue.key}-page-${state.page + 1}.png`, 'image/png'); return; }
  if (action === 'download-page') { downloadFile(imagePath(state.issue.pages[state.page]), `${state.issue.key}-page-${state.page + 1}.png`); return; }
  if (action === 'share-pdf') { shareFile(issuePath('edition.pdf'), `${state.issue.key}.pdf`, 'application/pdf'); return; }
  if (action === 'download-pdf') { downloadFile(issuePath('edition.pdf'), `${state.issue.key}.pdf`); return; }
  if (action === 'theme') { cycleTheme(); renderPanel(); return; }
  if (action === 'editions') { openPanel('editions', event.target.closest('[data-action]')); return; }
  const articleLink = event.target.closest('[data-article-link]');
  if (articleLink) { closePanel(); openArticle(articleLink.dataset.articleLink); return; }
  const pageLink = event.target.closest('[data-page-link]');
  if (pageLink) { closePanel(); state.view = 'page'; $('.page-view').hidden = false; $('.text-view').hidden = true; setPage(Number(pageLink.dataset.pageLink), { push: true }); renderHeader(); renderNav(); }
});
$('#panel-host').addEventListener('keydown', (event) => {
  if (!state.panel) return;
  if (event.key === 'Escape') { event.preventDefault(); closePanel(); return; }
  if (event.key !== 'Tab') return;
  const focusable = [...$('#panel-host .panel-card').querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((element) => !element.disabled && !element.hidden);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
$('#context-nav').addEventListener('click', (event) => { const button = event.target.closest('[data-panel]'); if (!button) return; if (button.dataset.panel === 'listen') { toggleSpeech(); return; } openPanel(button.dataset.panel, button); });
$('#listen-play').addEventListener('click', toggleSpeech);
$('#listen-rate').addEventListener('change', () => { if (state.speech.status === 'playing') speakCurrentSentence(); });
$('#listen-voice').addEventListener('change', () => { if (state.speech.status === 'playing') speakCurrentSentence(); });
$('#article-content').addEventListener('click', (event) => { const link = event.target.closest('[data-article-link]'); if (link) { event.preventDefault(); openArticle(link.dataset.articleLink); } });
$('#article-scroll').addEventListener('scroll', () => { const element = $('#article-scroll'); const max = element.scrollHeight - element.clientHeight; $('#progress-bar').style.width = `${max ? (element.scrollTop / max) * 100 : 0}%`; $('#app-header').classList.toggle('is-collapsed', state.view === 'text' && element.scrollTop > 48); });
pageStrip.addEventListener('click', (event) => { const hotspot = event.target.closest('.hotspot'); if (hotspot) openArticle(hotspot.dataset.article); });
let edgeStart = null;
pageStrip.addEventListener('pointerdown', (event) => { if (state.view === 'page' && !event.target.closest('.hotspot')) edgeStart = { x: event.clientX, pointerId: event.pointerId }; });
pageStrip.addEventListener('pointerup', (event) => {
  if (!edgeStart || edgeStart.pointerId !== event.pointerId) return;
  const start = edgeStart;
  edgeStart = null;
  const edge = 24;
  const delta = event.clientX - start.x;
  if (start.x <= edge && (delta >= -8)) setPage(state.page - 1);
  if (start.x >= innerWidth - edge && (delta <= 8)) setPage(state.page + 1);
});
pageStrip.addEventListener('pointercancel', () => { edgeStart = null; });
pageStrip.addEventListener('scroll', () => { if (state.view !== 'page') return; window.clearTimeout(pageStrip._scrollTimer); pageStrip._scrollTimer = window.setTimeout(() => { const slides = [...pageStrip.children]; const center = pageStrip.scrollLeft + pageStrip.clientWidth / 2; const next = slides.reduce((best, slide, index) => Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - center) < Math.abs(slides[best].offsetLeft + slides[best].offsetWidth / 2 - center) ? index : best, 0); if (next !== state.page) { state.page = next; updateUrl(); localStorage.setItem(`reader-resume:${state.issue.key}`, String(next)); renderPageControls(); renderModeToggle(); syncLoadedPages(); } }, 100); });
window.addEventListener('keydown', (event) => { if (event.target.matches('input, select, textarea, button')) return; if (state.view === 'page' && event.key === 'ArrowLeft') setPage(state.page - 1); if (state.view === 'page' && event.key === 'ArrowRight') setPage(state.page + 1); if (state.view === 'page' && event.key === 'Home') setPage(0); if (state.view === 'page' && event.key === 'End') setPage(state.issue.pages.length - 1); if (event.key === 'Escape' && state.panel) closePanel(); });
window.addEventListener('popstate', () => loadIssue(currentIssueFromUrl() || state.issueKey).catch(console.error));
window.addEventListener('resize', () => { if (state.panel) renderPanel(); });
if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', loadVoices);

function returnToPage() {
  stopSpeech();
  state.view = 'page';
  state.articleId = null;
  $('.page-view').hidden = false;
  $('.text-view').hidden = true;
  updateUrl();
  renderHeader();
  renderNav();
  renderModeToggle();
  renderListenPlayer();
}

loadIssue(state.issueKey).catch((error) => { document.querySelector('main').innerHTML = `<p class="panel-row" role="alert">${escapeHtml(error.message)}</p>`; console.error(error); });
