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
  lightbox: { open: false, index: 0, images: [], returnFocus: null },
  editionPublication: null,
  textSize: Math.max(0, Math.min(3, Number(localStorage.getItem('reader-text-size') || 0))),
  saved: safeJson('reader-saved', {}),
  theme: savedTheme === 'sepia' || savedTheme === 'dark' ? savedTheme : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'sepia'),
  zoom: { scale: 1, x: 0, y: 0 },
  speech: { status: 'idle', index: 0, sentences: [], voices: [], utterance: null },
  gesture: { pointers: new Map(), moved: false, startX: 0, startY: 0, lastX: 0, lastY: 0, pinch: null, movedUntil: 0 }
};

const $ = (selector) => document.querySelector(selector);
const pageCanvas = $('#page-canvas');
const pageSpread = $('#page-spread');
const pageZoomStage = $('#page-zoom-stage');
const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const lightboxZoom = { scale: 1, x: 0, y: 0, pointers: new Map(), pinch: null };

function safeJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
}

function currentIssueFromUrl() {
  const params = new URLSearchParams(location.search);
  return params.get('issue') || issueFromPath() || localStorage.getItem('reader-last-issue') || null;
}

function issueFromPath(pathname = location.pathname) {
  const match = pathname.match(/^\/(sudha|mayura)\/(\d{4}-\d{2}-\d{2})\/read\/?$/i);
  if (!match) return null;
  return (match[1].toLowerCase() === 'mayura' ? 'MY' : 'SU') + '-' + match[2];
}

function publication(key) { return key && key.startsWith('MY') ? 'MY' : 'SU'; }
function publicationLabel(code) { return code === 'MY' ? 'ಮಯೂರ' : 'ಸುಧಾ'; }
function issuePath(file) { return '/data/' + state.issue.key + '/' + file; }
function readerUrl(key, page, view = 'page', articleId = null) {
  const params = new URLSearchParams({ issue: key, p: String(page) });
  if (view === 'text' && articleId) {
    params.set('view', 'text');
    params.set('article', String(articleId));
  }
  return '/?' + params;
}

function issueDate(key) {
  const parts = key.match(/^[A-Z]{2}-(\d{4})-(\d{2})-(\d{2})$/);
  if (!parts) return key;
  return new Date(parts[1] + '-' + parts[2] + '-' + parts[3] + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function shortIssueDate(key) {
  const parts = key.match(/^[A-Z]{2}-(\d{4})-(\d{2})-(\d{2})$/);
  if (!parts) return key;
  return new Date(parts[1] + '-' + parts[2] + '-' + parts[3] + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function imagePath(page, thumb = false) {
  const file = (thumb ? page.imgThumbFile : page.imgFile).split('/').pop();
  return issuePath((thumb ? 'thumbs/' : 'pages/') + file);
}

function parsePercent(value) { return Number.parseFloat(String(value || 0)) / 100; }
function readPageNumber(value) { const page = Number.parseInt(value, 10); return Number.isFinite(page) ? Math.max(1, page) : 1; }
function allIssues() { return state.catalog?.publications.flatMap((item) => item.issues.map((issue) => ({ ...issue, publication: item.code, publicationTitle: item.title }))) || []; }
function issueSummary(key) { return allIssues().find((issue) => issue.key === key); }
function currentArticle() { return state.issue?.articles[state.articleId] || null; }
function articleIds() { return Object.keys(state.issue?.articles || {}).sort((a, b) => articleOrder(state.issue.articles[a], state.issue.articles[b])); }
function articleOrder(a, b) { return (a.pageIndex - b.pageIndex) || (parsePercent(a.top) - parsePercent(b.top)) || (parsePercent(a.left) - parsePercent(b.left)); }
function articlesForPage(index) { return state.issue.pages[index]?.articles.map((item) => state.issue.articles[String(item.id)]).filter(Boolean).sort(articleOrder) || []; }

function articleForPage(index) {
  const page = state.issue.pages[index];
  if (!page || !page.articles.length) return null;
  const last = state.issue.lastOpened?.[index];
  return page.articles.map((item) => state.issue.articles[String(item.id)]).filter(Boolean).find((article) => String(article.id) === String(last))
    || articlesForPage(index).sort((a, b) => (parsePercent(b.width) * parsePercent(b.height)) - (parsePercent(a.width) * parsePercent(a.height)))[0];
}

function articleHref(id) {
  const article = state.issue.articles[String(id)];
  return article ? readerUrl(state.issue.key, article.pageIndex + 1, 'text', article.id) : '#';
}

function pageHref(index) { return readerUrl(state.issue.key, index + 1); }
function articleAccess(article) {
  const words = String(article?.plainText || '').trim().split(/\s+/).filter(Boolean).length;
  return article?.plainText && words < 200 ? 'Free' : 'Premium';
}
function accessClass(article) { return articleAccess(article).toLowerCase(); }

function accessComposition(page) {
  const articles = articlesForPage(page.index);
  const free = articles.filter((article) => articleAccess(article) === 'Free').length;
  const premium = articles.length - free;
  if (!articles.length) return 'No articles';
  const counts = (free ? '<span class="access-count access-free" title="Free"><span class="access-icon" aria-hidden="true">○</span><span>' + free + '</span><span class="sr-only"> Free</span></span>' : '')
    + (premium ? '<span class="access-count access-premium" title="Premium"><span class="access-icon" aria-hidden="true">●</span><span>' + premium + '</span><span class="sr-only"> Premium</span></span>' : '');
  return '<span class="access-composition" aria-label="' + free + ' Free, ' + premium + ' Premium">' + counts + '</span>';
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme === 'sepia' ? 'sepia' : '';
  localStorage.setItem('reader-theme', state.theme);
}

function savePosition() {
  if (!state.issue) return;
  localStorage.setItem('reader-last-issue', state.issue.key);
  localStorage.setItem('reader-resume:' + state.issue.key, String(state.page));
  if (state.articleId) localStorage.setItem('reader-last-article:' + state.issue.key, state.articleId);
}

function updateUrl(push = false) {
  const url = readerUrl(state.issue.key, state.page + 1, state.view, state.articleId);
  history[push ? 'pushState' : 'replaceState']({}, '', url);
}

function useSpread() { return Boolean(state.issue && pageCanvas.clientWidth >= 900 && state.issue.pages.length > 1); }
function spreadStart(index = state.page) { return !useSpread() || index === 0 ? index : 1 + Math.floor((index - 1) / 2) * 2; }
function spreadIndices(index = state.page) {
  const start = spreadStart(index);
  return [start, useSpread() && start > 0 && state.issue.pages[start + 1] ? start + 1 : null].filter((value) => value !== null);
}
function displayPageLabel() {
  const pages = spreadIndices();
  return pages.length > 1 ? 'Pages ' + (pages[0] + 1) + '–' + (pages[1] + 1) : 'Page ' + (pages[0] + 1);
}

function renderHeader() {
  const summary = issueSummary(state.issue.key);
  $('#edition-publication').textContent = publicationLabel(publication(state.issue.key));
  $('#edition-label').textContent = innerWidth < 480 ? shortIssueDate(state.issue.key) : (summary?.label || shortIssueDate(state.issue.key));
  $('#subscribe-button').hidden = false;
  $('#text-subscribe-button').hidden = false;
  $('#back-page-label').textContent = 'ಪುಟ ' + (state.page + 1);
  $('#save-button').textContent = state.saved[state.articleId] ? '★' : '☆';
  $('#save-button').setAttribute('aria-label', state.saved[state.articleId] ? 'Remove saved article' : 'Save article');
  document.documentElement.style.setProperty('--article-size', [1.125, 1.25, 1.4, 1.55][state.textSize] + 'rem');
}

function setControlsVisible(visible) {
  document.body.classList.toggle('chrome-hidden', !visible && !state.panel);
  $('#app-header').classList.toggle('chrome-hidden', !visible && !state.panel);
  $('.page-view').classList.toggle('chrome-hidden', !visible && state.view === 'page');
  $('#article-controls').classList.toggle('chrome-hidden', !visible && state.view === 'text');
}

function renderViewState() {
  $('.page-view').hidden = state.view !== 'page';
  $('.text-view').hidden = state.view !== 'text';
  $('#article-controls').hidden = state.view !== 'text';
  $('#reading-progress').hidden = state.view !== 'text';
  $('.page-header').hidden = state.view === 'text';
  $('.text-header').hidden = state.view !== 'text';
  setControlsVisible(true);
}

function renderPageControls() {
  const articles = articlesForPage(state.page);
  $('#page-number').querySelector('span:last-child').textContent = displayPageLabel();
  $('#page-article-action').hidden = !articles.length && state.zoom.scale <= 1.01;
  $('#page-article-action').querySelector('span:last-child').textContent = state.zoom.scale > 1.01 ? 'Reset zoom' : articles.length === 1 ? 'Read article' : articles.length + ' articles';
  $('#previous-page').disabled = state.page === 0;
  $('#next-page').disabled = state.page >= state.issue.pages.length - 1;
}

function renderArticleControls() {
  $('#article-listen').querySelector('.control-icon').textContent = state.speech.status === 'playing' ? 'Ⅱ' : '▶';
  $('#article-listen').querySelector('span:last-child').textContent = state.speech.status === 'playing' ? 'Pause' : 'Listen';
}

function renderZoom() {
  const transform = 'translate3d(' + state.zoom.x + 'px, ' + state.zoom.y + 'px, 0) scale(' + state.zoom.scale + ')';
  pageZoomStage.style.transform = transform;
  $('#zoom-reset').hidden = state.zoom.scale <= 1.01;
  $('#page-article-action').hidden = !articlesForPage(state.page).length && state.zoom.scale <= 1.01;
  $('#page-article-action').querySelector('span:last-child').textContent = state.zoom.scale > 1.01 ? 'Reset zoom' : articlesForPage(state.page).length === 1 ? 'Read article' : articlesForPage(state.page).length + ' articles';
}

function fitPageZoom() {
  pageSpread.querySelectorAll('.page-slot').forEach((slot) => {
    const page = state.issue.pages[Number(slot.dataset.page)];
    const zoom = slot.querySelector('.page-zoom');
    const ratio = (page.width || 3) / (page.height || 4);
    const height = Math.min(pageCanvas.clientHeight, slot.clientWidth / ratio);
    zoom.style.width = Math.max(0, height * ratio) + 'px';
    zoom.style.height = Math.max(0, height) + 'px';
  });
}

function resetZoom() {
  state.zoom.scale = 1;
  state.zoom.x = 0;
  state.zoom.y = 0;
  renderZoom();
  if (state.issue) renderPageControls();
}

function setZoom(scale, anchorX = pageCanvas.clientWidth / 2, anchorY = pageCanvas.clientHeight / 2) {
  const previous = state.zoom.scale;
  state.zoom.scale = Math.max(1, Math.min(4, scale));
  const ratio = state.zoom.scale / previous;
  state.zoom.x = (state.zoom.x - (anchorX - pageCanvas.clientWidth / 2)) * ratio + (anchorX - pageCanvas.clientWidth / 2);
  state.zoom.y = (state.zoom.y - (anchorY - pageCanvas.clientHeight / 2)) * ratio + (anchorY - pageCanvas.clientHeight / 2);
  renderZoom();
}

function renderPageCanvas() {
  const indices = spreadIndices();
  pageSpread.classList.toggle('is-spread', indices.length > 1);
  pageSpread.replaceChildren(...indices.map((index) => {
    const page = state.issue.pages[index];
    const slot = document.createElement('div');
    slot.className = 'page-slot';
    slot.dataset.page = index;
    const art = document.createElement('div');
    art.className = 'page-art';
    art.style.setProperty('--page-ratio', (page.width || 3) + ' / ' + (page.height || 4));
    const zoom = document.createElement('div');
    zoom.className = 'page-zoom';
    const image = document.createElement('img');
    image.alt = 'Page ' + (index + 1);
    image.loading = index === state.page || index === state.page + 1 ? 'eager' : 'lazy';
    image.src = imagePath(page);
    const placeholder = document.createElement('span');
    placeholder.className = 'page-placeholder';
    placeholder.textContent = 'Page ' + (index + 1);
    zoom.append(image, placeholder);
    page.articles.forEach((hotspot) => {
      const button = document.createElement('button');
      button.className = 'hotspot';
      button.type = 'button';
      button.style.top = parsePercent(hotspot.top) * 100 + '%';
      button.style.left = parsePercent(hotspot.left) * 100 + '%';
      button.style.width = parsePercent(hotspot.width) * 100 + '%';
      button.style.height = parsePercent(hotspot.height) * 100 + '%';
      button.dataset.article = hotspot.id;
      button.setAttribute('aria-label', 'Read: ' + (state.issue.articles[String(hotspot.id)]?.title || 'article ' + hotspot.id));
      zoom.append(button);
    });
    art.append(zoom);
    slot.append(art);
    return slot;
  }));
  fitPageZoom();
  resetZoom();
}

function animatePageChange(direction) {
  if (!direction || prefersReducedMotion.matches) return;
  pageSpread.classList.remove('page-transition-next', 'page-transition-previous');
  void pageSpread.offsetWidth;
  pageSpread.classList.add('page-transition-' + direction);
  pageSpread.addEventListener('animationend', () => pageSpread.classList.remove('page-transition-' + direction), { once: true });
}

function setPage(pageIndex, { push = false, keepControls = true } = {}) {
  const previousPage = state.page;
  stopSpeech();
  state.view = 'page';
  state.articleId = null;
  state.page = Math.max(0, Math.min(pageIndex, state.issue.pages.length - 1));
  state.page = spreadStart(state.page);
  savePosition();
  updateUrl(push);
  renderViewState();
  renderPageCanvas();
  renderPageControls();
  renderHeader();
  animatePageChange(state.page > previousPage ? 'next' : state.page < previousPage ? 'previous' : '');
  if (!keepControls) setControlsVisible(false);
}

async function openArticle(articleId, { push = true } = {}) {
  const article = state.issue.articles[String(articleId)];
  if (!article) return;
  closeLightbox({ restore: false });
  stopSpeech();
  resetZoom();
  await loadArticleMeta([article.id, article.previous, article.next].filter(Boolean));
  state.articleId = String(article.id);
  state.page = article.pageIndex;
  state.view = 'text';
  state.issue.lastOpened ||= {};
  state.issue.lastOpened[state.page] = state.articleId;
  savePosition();
  updateUrl(push);
  renderViewState();
  renderHeader();
  $('#article-content').innerHTML = '<p class="loading">Loading article…</p>';
  $('#article-scroll').scrollTop = 0;
  try {
    const response = await fetch(issuePath('articles/' + article.id + '.html'));
    if (!response.ok) throw new Error('Article unavailable');
    $('#article-content').innerHTML = articleMarkup(await response.text(), article);
    prepareSpeech();
    bindImageZoom();
    renderArticleFooterCards();
  } catch (error) {
    $('#article-content').innerHTML = '<p role="alert">Could not load this article.</p>';
    console.error(error);
  }
  renderHeader();
  renderArticleControls();
  renderListenPlayer();
}

function articleMarkup(html, article) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, iframe, form, [style*="display:none"], .adPlaceholder').forEach((node) => node.remove());
  doc.querySelectorAll('*').forEach((node) => {
    if (node.getAttribute('style')?.includes('background')) node.classList.add('article-recipe');
    node.removeAttribute('style');
    [...node.attributes].forEach((attribute) => {
      if (attribute.name.toLowerCase().startsWith('on')) node.removeAttribute(attribute.name);
    });
  });
  doc.querySelectorAll('img').forEach((image) => {
    const filename = image.getAttribute('src')?.split('/').pop();
    if (filename) image.src = issuePath('media/' + filename);
    image.removeAttribute('style');
    image.loading = 'lazy';
    image.classList.add('zoomable');
  });
  doc.querySelectorAll('a').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (href && !/^(https?:|mailto:|#)/i.test(href)) link.removeAttribute('href');
  });
  const root = doc.querySelector('.articleDetail') || doc.body;
  const extractedTitle = doc.querySelector('h1 p, h1')?.textContent.trim();
  root.querySelector('h1')?.remove();
  root.querySelector('.byline')?.remove();
  root.querySelectorAll('p').forEach((paragraph) => {
    if (paragraph.querySelector('i')) paragraph.remove();
  });
  root.querySelectorAll('p').forEach((paragraph) => {
    if (!paragraph.textContent.trim() && !paragraph.querySelector('img')) paragraph.remove();
  });
  const pictures = [...root.querySelectorAll('.pictures > .picture')];
  root.querySelector('.pictures')?.remove();
  const makeFigure = (picture, className, side = '') => {
    const figure = doc.createElement('figure');
    figure.className = className;
    if (side) figure.dataset.side = side;
    const image = picture.querySelector('img');
    const caption = picture.querySelector('.caption');
    const credit = picture.querySelector('.credit');
    if (image) {
      image.tabIndex = 0;
      image.setAttribute('role', 'button');
      image.setAttribute('aria-label', 'Open article image');
      figure.append(image);
    }
    if (caption?.textContent.trim()) {
      const figcaption = doc.createElement('figcaption');
      figcaption.className = 'article-caption';
      figcaption.innerHTML = caption.innerHTML;
      figure.append(figcaption);
    }
    if (credit?.textContent.trim()) {
      const small = doc.createElement('small');
      small.className = 'article-credit';
      small.innerHTML = credit.innerHTML;
      figure.append(small);
    }
    return figure;
  };
  const paragraphs = [...root.querySelectorAll('p:not([class])')];
  const hero = pictures.shift();
  if (hero) {
    const figure = makeFigure(hero, 'article-figure article-hero');
    const first = root.firstElementChild;
    if (first) root.insertBefore(figure, first);
    else root.append(figure);
  }
  if (paragraphs.length && pictures.length) {
    const inlineCount = Math.min(pictures.length, Math.floor(paragraphs.length / 4), 4);
    const interval = Math.max(3, Math.floor(paragraphs.length / (inlineCount + 1)));
    pictures.slice(0, inlineCount).forEach((picture, index) => {
      const position = Math.min(1 + (index + 1) * interval, paragraphs.length - 1);
      paragraphs[position].before(makeFigure(picture, 'article-figure article-float', index % 2 ? 'left' : 'right'));
    });
    pictures.slice(inlineCount).forEach((picture) => root.append(makeFigure(picture, 'article-figure article-float')));
  } else {
    pictures.forEach((picture) => root.append(makeFigure(picture, 'article-figure article-float')));
  }
  root.querySelectorAll('p').forEach((paragraph) => {
    if (!/^\s*l\s+/i.test(paragraph.textContent)) return;
    paragraph.classList.add('article-bullet');
    const firstText = [...paragraph.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
    if (firstText) firstText.nodeValue = firstText.nodeValue.replace(/^\s*l\s+/i, '');
  });
  const title = '<h1>' + escapeHtml(article.title || extractedTitle || 'Article ' + article.id) + '</h1>';
  const meta = [article.byline, article.section].filter(Boolean).map(escapeHtml).join(' · ');
  const previous = article.previous ? '<a href="' + articleHref(article.previous) + '" data-article-link="' + article.previous + '">← Previous article</a>' : '<span></span>';
  const next = article.next ? '<a href="' + articleHref(article.next) + '" data-article-link="' + article.next + '">Next article →</a>' : '<span></span>';
  const footer = '<footer class="article-footer">' + previous + '<a class="original-page" href="' + pageHref(article.pageIndex) + '" data-page-link="' + article.pageIndex + '">View original page · Page ' + (article.pageIndex + 1) + '</a>' + next + '</footer>';
  return '<p class="access-status access-' + accessClass(article) + '">' + articleAccess(article) + '</p>' + title + (meta ? '<p class="byline">' + meta + '</p>' : '') + root.innerHTML + footer;
}

function prepareSpeech() {
  state.speech.sentences = [];
  state.speech.index = 0;
  const walker = document.createTreeWalker($('#article-content'), NodeFilter.SHOW_TEXT, {
    acceptNode(node) { return node.nodeValue.trim() && !node.parentElement.closest('h1, .byline, .access-status, .article-footer') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const parts = node.nodeValue.trim().split(/(?<=[.!?।])\s+/u);
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
  if (!('speechSynthesis' in window)) { state.speech.voices = []; renderListenPlayer(); return; }
  state.speech.voices = speechSynthesis.getVoices().filter((voice) => /^kn[-_]/i.test(voice.lang));
  renderListenPlayer();
}

function clearSpeechHighlight() { document.querySelectorAll('.speech-current').forEach((node) => node.classList.remove('speech-current')); }

function speakCurrentSentence() {
  if (!state.speech.sentences.length || !state.speech.voices.length) return;
  speechSynthesis.cancel();
  clearSpeechHighlight();
  const sentence = document.querySelector('[data-speech-index="' + state.speech.index + '"]');
  sentence?.classList.add('speech-current');
  sentence?.scrollIntoView({ behavior: prefersReducedMotion.matches ? 'auto' : 'smooth', block: 'center' });
  const utterance = new SpeechSynthesisUtterance(state.speech.sentences[state.speech.index]);
  utterance.lang = 'kn-IN';
  utterance.rate = Number($('#listen-rate').value || 1);
  utterance.voice = state.speech.voices[0];
  utterance.onend = () => {
    if (state.speech.status !== 'playing') return;
    state.speech.index += 1;
    if (state.speech.index >= state.speech.sentences.length) { state.speech.status = 'idle'; state.speech.index = 0; clearSpeechHighlight(); }
    else speakCurrentSentence();
    renderArticleControls();
    renderListenPlayer();
  };
  utterance.onerror = () => { state.speech.status = 'idle'; renderArticleControls(); renderListenPlayer(); };
  state.speech.utterance = utterance;
  speechSynthesis.speak(utterance);
  renderArticleControls();
  renderListenPlayer();
}

function toggleSpeech() {
  if (!('speechSynthesis' in window) || !state.speech.voices.length) return;
  if (state.speech.status === 'playing') { speechSynthesis.pause(); state.speech.status = 'paused'; }
  else if (state.speech.status === 'paused') { speechSynthesis.resume(); state.speech.status = 'playing'; }
  else { state.speech.status = 'playing'; speakCurrentSentence(); return; }
  renderArticleControls();
  renderListenPlayer();
}

function stopSpeech() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  state.speech.status = 'idle';
  state.speech.index = 0;
  state.speech.utterance = null;
  clearSpeechHighlight();
  if ($('#article-controls')) renderArticleControls();
  if ($('#listen-player')) renderListenPlayer();
}

function renderListenPlayer() {
  if (!$('#listen-player')) return;
  $('#listen-player').hidden = state.view !== 'text' || state.speech.status === 'idle';
  const supported = 'speechSynthesis' in window && state.speech.voices.length > 0;
  $('#listen-play').disabled = !supported;
  $('#listen-play').textContent = state.speech.status === 'playing' ? 'Ⅱ' : '▶';
  $('#listen-play').setAttribute('aria-label', state.speech.status === 'playing' ? 'Pause article' : 'Play article');
  $('#listen-status').textContent = supported ? (state.speech.status === 'paused' ? 'Paused' : 'Reading aloud') : 'No Kannada voice available on this device';
  $('#listen-progress').value = state.speech.sentences.length ? state.speech.index / state.speech.sentences.length : 0;
}

function bindImageZoom() {
  document.querySelectorAll('#article-content img.zoomable').forEach((image) => {
    const figure = image.closest('.article-float');
    if (figure) {
      const classify = () => {
        if (!image.naturalWidth || !image.naturalHeight) return;
        const ratio = image.naturalWidth / image.naturalHeight;
        figure.classList.remove('is-portrait', 'is-landscape', 'is-square');
        figure.classList.add(ratio >= 1.15 ? 'is-landscape' : ratio <= .9 ? 'is-portrait' : 'is-square');
      };
      if (image.complete) classify();
      else image.addEventListener('load', classify, { once: true });
    }
    const zoom = { scale: 1, x: 0, y: 0, pointers: new Map(), pinch: null };
    const apply = () => { image.style.transform = 'translate3d(' + zoom.x + 'px, ' + zoom.y + 'px, 0) scale(' + zoom.scale + ')'; image.classList.toggle('is-image-zoomed', zoom.scale > 1); };
    image.addEventListener('pointerdown', (event) => {
      zoom.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      image.setPointerCapture(event.pointerId);
      if (zoom.pointers.size === 2) {
        const points = [...zoom.pointers.values()];
        zoom.pinch = { distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y), scale: zoom.scale };
      }
    });
    image.addEventListener('pointermove', (event) => {
      if (!zoom.pointers.has(event.pointerId)) return;
      zoom.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (zoom.pointers.size === 2 && zoom.pinch) {
        const points = [...zoom.pointers.values()];
        zoom.scale = Math.max(1, Math.min(4, zoom.pinch.scale * Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) / zoom.pinch.distance));
        apply();
      } else if (zoom.scale > 1) { zoom.x += event.movementX; zoom.y += event.movementY; apply(); }
    });
    const end = (event) => { zoom.pointers.delete(event.pointerId); if (zoom.pointers.size < 2) zoom.pinch = null; };
    image.addEventListener('pointerup', end);
    image.addEventListener('pointercancel', end);
  });
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value || '';
  return div.innerHTML;
}

function renderArticleFooterCards() {
  const article = currentArticle();
  if (!article) return;
  document.querySelectorAll('#article-content .article-footer').forEach((footer) => {
    footer.querySelector('.original-page')?.remove();
    footer.querySelectorAll(':scope > span').forEach((placeholder) => placeholder.remove());
    footer.hidden = !footer.querySelector('a[data-article-link]');
  });
  document.querySelectorAll('#article-content .article-footer a[data-article-link]').forEach((link) => {
    const id = link.dataset.articleLink;
    const target = state.issue.articles[String(id)];
    const previous = String(id) === String(article.previous);
    link.className = 'article-nav article-nav-' + (previous ? 'previous' : 'next');
    link.innerHTML = '<span class="article-nav-direction">' + (previous ? '← Previous article' : 'Next article →') + '</span><strong>' + escapeHtml(target?.title || 'Article') + '</strong>' + (target?.byline ? '<small>' + escapeHtml(target.byline) + '</small>' : '');
  });
  document.querySelectorAll('#article-content .article-footer').forEach((footer) => {
    const next = footer.querySelector('.article-nav-next');
    if (next) footer.prepend(next);
  });
}

function renderLightbox() {
  const item = state.lightbox.images[state.lightbox.index];
  if (!item) return;
  $('#lightbox-image').src = item.src;
  $('#lightbox-image').alt = item.alt;
  $('#lightbox-caption').textContent = item.caption;
  $('#lightbox-counter').textContent = (state.lightbox.index + 1) + ' / ' + state.lightbox.images.length;
  $('#lightbox-prev').disabled = state.lightbox.images.length < 2;
  $('#lightbox-next').disabled = state.lightbox.images.length < 2;
  resetLightboxZoom();
}

function renderLightboxZoom() {
  $('#lightbox-image').style.transform = 'translate3d(' + lightboxZoom.x + 'px, ' + lightboxZoom.y + 'px, 0) scale(' + lightboxZoom.scale + ')';
  $('#lightbox-image').classList.toggle('is-zoomed', lightboxZoom.scale > 1);
}

function resetLightboxZoom() {
  lightboxZoom.scale = 1;
  lightboxZoom.x = 0;
  lightboxZoom.y = 0;
  lightboxZoom.pointers.clear();
  lightboxZoom.pinch = null;
  renderLightboxZoom();
}

function setLightboxInert(inert) {
  document.querySelectorAll('#app-header, main, #article-controls, #listen-player').forEach((element) => { element.inert = inert; });
}

function openLightbox(index) {
  const images = [...document.querySelectorAll('#article-content .article-figure img')].map((image) => ({
    src: image.currentSrc || image.src,
    alt: image.alt || '',
    caption: image.closest('figure')?.querySelector('.article-caption')?.textContent.trim() || ''
  }));
  if (!images.length) return;
  state.lightbox = { open: true, index: Math.max(0, Math.min(index, images.length - 1)), images, returnFocus: document.activeElement };
  renderLightbox();
  $('#image-lightbox').hidden = false;
  document.body.classList.add('lightbox-open');
  setLightboxInert(true);
  $('#lightbox-close').focus();
}

function closeLightbox({ restore = true } = {}) {
  if (!state.lightbox.open) return;
  const trigger = state.lightbox.returnFocus;
  state.lightbox = { open: false, index: 0, images: [], returnFocus: null };
  $('#image-lightbox').hidden = true;
  document.body.classList.remove('lightbox-open');
  setLightboxInert(false);
  if (restore && trigger && document.contains(trigger)) trigger.focus();
}

function moveLightbox(delta) {
  if (!state.lightbox.open || state.lightbox.images.length < 2) return;
  state.lightbox.index = (state.lightbox.index + delta + state.lightbox.images.length) % state.lightbox.images.length;
  renderLightbox();
}

function renderPanel() {
  const host = $('#panel-host');
  host.hidden = !state.panel;
  if (state.panel) host.dataset.panel = state.panel;
  else delete host.dataset.panel;
  const inert = Boolean(state.panel);
  document.querySelectorAll('#app-header, main, #page-controls, #article-controls, #listen-player').forEach((element) => { element.inert = inert; });
  if (!state.panel) return;
  const titles = { menu: 'Menu', contents: 'Contents', pages: 'Pages', stories: 'Stories on this page', saved: 'Saved Articles', search: 'Search', publication: 'Publication', editions: 'Editions', profile: 'My Profile', faqs: 'FAQs' };
  $('#panel-title').textContent = titles[state.panel] || 'Reader';
  const body = $('#panel-body');
  if (state.panel === 'menu') body.innerHTML = menuMarkup();
  if (state.panel === 'publication') body.innerHTML = publicationMarkup();
  if (state.panel === 'contents') body.innerHTML = contentsMarkup();
  if (state.panel === 'pages') body.innerHTML = pagesMarkup();
  if (state.panel === 'stories') body.innerHTML = storiesMarkup();
  if (state.panel === 'saved') body.innerHTML = savedMarkup();
  if (state.panel === 'search') body.innerHTML = searchMarkup();
  if (state.panel === 'editions') body.innerHTML = editionsMarkup();
  if (state.panel === 'profile') body.innerHTML = '<div class="panel-section"><h3>My Profile</h3><p class="panel-row">Sign in to manage subscription and account details.</p></div>';
  if (state.panel === 'faqs') body.innerHTML = '<div class="panel-section"><h3>FAQs</h3><p class="panel-row">For subscription and reader support, contact Prajavani support through the Prajavani homepage.</p></div>';
  renderArticleRows();
  if (state.panel === 'pages') requestAnimationFrame(() => body.querySelector('.is-current')?.scrollIntoView({ block: 'nearest' }));
}

function renderArticleRows() {
  document.querySelectorAll('#panel-body .panel-row[data-article-link]').forEach((row) => {
    const article = state.issue.articles[row.dataset.articleLink];
    const copy = row.querySelector(':scope > span');
    if (!article || !copy) return;
    const firstDetail = [...copy.children].find((element) => element.tagName === 'SMALL');
    if (article.byline) firstDetail && (firstDetail.textContent = article.byline);
    else firstDetail?.remove();
    const status = copy.querySelector('.status-pill');
    status?.parentElement.remove();
    const meta = document.createElement('span');
    meta.className = 'panel-row-meta';
    const page = document.createElement('small');
    page.textContent = 'Page ' + (article.pageIndex + 1);
    meta.append(page);
    if (status) meta.append(status);
    copy.className = 'panel-row-copy';
    row.classList.add('article-list-row');
    row.append(meta);
  });
}

function openPanel(panel, trigger = document.activeElement) {
  state.panel = panel;
  state.panelReturnFocus = trigger;
  setControlsVisible(true);
  renderPanel();
  requestAnimationFrame(() => $('#panel-body')?.querySelector('button, a[href], input')?.focus());
}

function closePanel() {
  const returnFocus = state.panelReturnFocus;
  state.panel = null;
  state.panelReturnFocus = null;
  renderPanel();
  if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
}

function articleRow(article, excerpt = '') {
  const saved = state.saved[article.id] ? ' · ★' : '';
  return '<button class="panel-row" type="button" data-article-link="' + article.id + '"><span><strong>' + escapeHtml(article.title || 'Article ' + article.id) + '</strong><small>' + escapeHtml(article.byline || 'Byline unavailable') + ' · Page ' + (article.pageIndex + 1) + saved + '</small>' + (excerpt ? '<small class="row-meta">' + escapeHtml(excerpt) + '</small>' : '') + '<small><span class="status-pill access-' + accessClass(article) + '">' + articleAccess(article) + '</span></small></span></button>';
}

function contentsMarkup() {
  const articles = articleIds().map((id) => state.issue.articles[id]).sort(articleOrder);
  return articles.length ? articles.map((article) => articleRow(article)).join('') : pageListMarkup();
}

function pageListMarkup() {
  return state.issue.pages.map((page, index) => '<button class="panel-row" type="button" data-page-link="' + index + '"><span><strong>Page ' + (index + 1) + '</strong><small>' + accessComposition(page) + '</small></span></button>').join('');
}

function pagesMarkup() {
  const scrub = state.issue.pages.length > 80 ? '<label class="page-scrub">Page <output id="scrub-value">' + (state.page + 1) + '</output> / ' + state.issue.pages.length + '<input id="page-scrub" type="range" min="1" max="' + state.issue.pages.length + '" value="' + (state.page + 1) + '" aria-label="Jump to page"></label>' : '';
  const grid = state.issue.pages.map((page, index) => '<button class="page-thumb' + (index === state.page ? ' is-current' : '') + '" type="button" data-page-link="' + index + '" aria-label="Go to page ' + (index + 1) + '"><img loading="lazy" src="' + imagePath(page, true) + '" alt=""><span class="page-number-label">' + (index + 1) + '</span><strong>Page ' + (index + 1) + '</strong><small>' + accessComposition(page) + '</small></button>').join('');
  return scrub + '<div class="page-grid">' + grid + '</div>';
}

function storiesMarkup() {
  return articlesForPage(state.page).map((article) => articleRow(article)).join('') || '<p class="panel-row">No stories on this page.</p>';
}

function savedMarkup() {
  const entries = Object.entries(state.saved);
  if (!entries.length) return '<p class="panel-row">No saved articles yet.</p>';
  return entries.map(([id, saved]) => {
    const article = state.issue.articles[id];
    if (!article) return '<div class="panel-row"><span><strong>' + escapeHtml(saved.title || 'Article ' + id) + '</strong><small>' + escapeHtml(saved.publication || 'Saved article') + ' · Unavailable in this edition</small></span></div>';
    return '<button class="panel-row" type="button" data-article-link="' + article.id + '"><span><strong>' + escapeHtml(article.title || saved.title || 'Article ' + id) + '</strong><small>' + escapeHtml(saved.publication || publicationLabel(publication(state.issue.key))) + ' · ' + escapeHtml(saved.edition || issueDate(state.issue.key)) + ' · Page ' + (saved.page || article.pageIndex + 1) + '</small><small><span class="status-pill access-' + accessClass(article) + '">' + articleAccess(article) + '</span></small></span></button>';
  }).join('');
}

function menuMarkup() {
  return '<div class="menu-top"><a class="panel-row" href="https://www.prajavani.net/" data-home-link><span><strong>ಪ್ರಜಾವಾಣಿ ಮುಖ್ಯಪುಟಕ್ಕೆ</strong><small>Prajavani Home</small></span></a><button class="panel-row" type="button" data-action="search"><span><strong>Search</strong><small>Search this edition</small></span></button></div><div class="menu-divider"></div><button class="panel-row" type="button" data-action="profile"><span><strong>Sign In</strong><small>My Profile</small></span></button><button class="panel-row" type="button" data-action="saved"><span><strong>Saved Articles</strong><small>Articles you bookmarked</small></span></button><button class="panel-row" type="button" data-action="faqs"><span><strong>FAQs</strong><small>Support and contact information</small></span></button>';
}

function searchMarkup() {
  return '<form class="search-form" id="search-form"><input id="search-input" type="search" placeholder="Search this issue" aria-label="Search this issue"><button type="submit">Search</button></form><div id="search-results"></div>';
}

function searchExcerpt(article, query) {
  const text = article.plainText || article.title || '';
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  return index < 0 ? text.slice(0, 120) : '…' + text.slice(Math.max(0, index - 45), index + query.length + 75) + '…';
}

function runSearch(query) {
  if (!query) { $('#search-results').innerHTML = ''; return; }
  const result = articleIds().map((id) => state.issue.articles[id]).filter((article) => (article.title + ' ' + article.byline + ' ' + (article.plainText || '')).toLowerCase().includes(query.toLowerCase()));
  $('#search-results').innerHTML = result.length ? result.map((article) => articleRow(article, searchExcerpt(article, query))).join('') : '<p class="panel-row">No matches.</p>';
}

function editionsMarkup() {
  const selected = state.editionPublication || publication(state.issue.key);
  const issues = allIssues().filter((issue) => issue.publication === selected);
  const cards = issues.map((issue) => {
    const resume = Number(localStorage.getItem('reader-resume:' + issue.key) || 0) + 1;
    const current = issue.key === state.issue.key;
    const currentInfo = current ? 'Current edition' : 'Continue from page ' + resume;
    const pageOnly = current && !articleIds().length ? '<small>Page-only edition</small>' : '';
    return '<button class="edition-card' + (current ? ' is-current' : '') + '" type="button" data-edition-link="' + issue.key + '"><img src="/data/' + issue.key + '/' + escapeHtml(issue.cover) + '" alt=""><strong>' + escapeHtml(issue.label) + '</strong><span>' + currentInfo + '</span>' + pageOnly + '</button>';
  }).join('');
  return '<p class="panel-note">Choose an edition of ' + escapeHtml(publicationLabel(selected)) + '.</p><div class="edition-grid">' + cards + '</div>';
}

function publicationMarkup() {
  const selected = state.editionPublication || publication(state.issue.key);
  return '<div class="publication-options"><button class="edition-tab' + (selected === 'SU' ? ' is-active' : '') + '" type="button" data-edition-publication="SU">Sudha</button><button class="edition-tab' + (selected === 'MY' ? ' is-active' : '') + '" type="button" data-edition-publication="MY">Mayura</button></div>';
}

function renderArticleMetaFromHtml(id, html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const title = doc.querySelector('h1 p, h1')?.textContent.trim() || 'Article ' + id;
  const byline = state.issue.bylines[id]?.byline || '';
  const section = state.issue.bylines[id]?.section || '';
  const plainText = (doc.querySelector('.bodytext') || doc.querySelector('.articleDetail'))?.textContent.replace(/\s+/g, ' ').trim() || '';
  return { title, byline, section, plainText };
}

async function loadArticleMeta(ids = articleIds()) {
  await Promise.all(ids.map(async (id) => {
    if (state.issue.articles[id]?.title) return;
    try {
      const response = await fetch(issuePath('articles/' + id + '.html'));
      if (response.ok) Object.assign(state.issue.articles[id], renderArticleMetaFromHtml(id, await response.text()));
    } catch { /* an incomplete article should not block the edition */ }
  }));
}

function normalizeIssue(key, coords, bylines) {
  const articles = {};
  const pages = (coords.pages || []).map((page, index) => ({ ...page, index, articles: page.articles || [] }));
  pages.forEach((page) => page.articles.forEach((hotspot) => {
    const id = String(hotspot.id);
    const existing = articles[id] || { id, pageIndex: page.index, ...bylines[id], ...hotspot };
    existing.pageIndex = Math.min(existing.pageIndex, page.index);
    articles[id] = existing;
  }));
  const ordered = Object.values(articles).sort(articleOrder);
  ordered.forEach((article, index) => { article.previous = ordered[index - 1]?.id; article.next = ordered[index + 1]?.id; });
  return { key, pages, articles, bylines, lastOpened: {} };
}

async function loadCatalog() {
  if (state.catalog) return;
  const response = await fetch('/generated/catalog.json');
  if (!response.ok) throw new Error('Could not load the edition catalog');
  state.catalog = await response.json();
}

async function loadIssue(key) {
  stopSpeech();
  await loadCatalog();
  key ||= state.catalog.publications[0].issues[0].key;
  state.issueKey = key;
  const responses = await Promise.all([fetch('/data/' + key + '/coords.json'), fetch('/data/' + key + '/bylines.json').catch(() => null)]);
  if (!responses[0].ok) throw new Error('Could not load ' + key);
  state.issue = normalizeIssue(key, await responses[0].json(), responses[1]?.ok ? await responses[1].json() : {});
  state.editionPublication = publication(key);
  const params = new URLSearchParams(location.search);
  const requested = params.has('p') ? readPageNumber(params.get('p')) - 1 : Number(localStorage.getItem('reader-resume:' + key) || 0);
  state.page = Math.max(0, Math.min(requested, state.issue.pages.length - 1));
  state.articleId = params.get('article') && state.issue.articles[params.get('article')] ? params.get('article') : null;
  state.view = params.get('view') === 'text' && state.articleId ? 'text' : 'page';
  if (useSpread()) state.page = spreadStart(state.page);
  renderHeader();
  renderViewState();
  renderPageCanvas();
  renderPageControls();
  if (state.view === 'text') await openArticle(state.articleId, { push: false });
  renderArticleControls();
  renderListenPlayer();
  loadArticleMeta().then(() => {
    renderPageCanvas();
    renderHeader();
    if (state.panel) renderPanel();
  });
}

function toggleSaved() {
  if (!state.articleId) return;
  if (state.saved[state.articleId]) delete state.saved[state.articleId];
  else state.saved[state.articleId] = { title: currentArticle()?.title, publication: publicationLabel(publication(state.issue.key)), edition: issueDate(state.issue.key), page: state.page + 1 };
  localStorage.setItem('reader-saved', JSON.stringify(state.saved));
  renderHeader();
}

async function shareCurrent() {
  const article = currentArticle();
  const url = new URL(articleHref(article.id), location.href).href;
  try {
    if (navigator.share) await navigator.share({ title: article.title, url });
    else if (navigator.clipboard) await navigator.clipboard.writeText(url);
    showPanelNote('Article link copied or ready to share.');
  } catch (error) {
    if (error.name !== 'AbortError') showPanelNote('Sharing was not available.');
  }
}

function showPanelNote(message) {
  if ($('#panel-body')) $('#panel-body').insertAdjacentHTML('afterbegin', '<p class="panel-note" role="status">' + escapeHtml(message) + '</p>');
}

function switchEdition(key) {
  savePosition();
  closePanel();
  const resume = Number(localStorage.getItem('reader-resume:' + key) || 0) + 1;
  history.pushState({}, '', readerUrl(key, resume));
  loadIssue(key).catch(console.error);
}

function returnToPage() {
  stopSpeech();
  state.view = 'page';
  state.articleId = null;
  updateUrl();
  renderViewState();
  renderPageCanvas();
  renderPageControls();
  renderHeader();
}

function setupPageGestures() {
  pageCanvas.addEventListener('pointerdown', (event) => {
    if (state.view !== 'page' || event.target.closest('.zoom-controls, .swipe-hint, .canvas-nav')) return;
    state.gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    state.gesture.startX = event.clientX;
    state.gesture.startY = event.clientY;
    state.gesture.lastX = event.clientX;
    state.gesture.lastY = event.clientY;
    state.gesture.moved = false;
    state.gesture.hotspot = event.target.closest('.hotspot');
    pageCanvas.setPointerCapture(event.pointerId);
    if (state.gesture.pointers.size === 2) {
      const points = [...state.gesture.pointers.values()];
      state.gesture.pinch = { distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y), scale: state.zoom.scale, center: { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 } };
    }
  });
  pageCanvas.addEventListener('pointermove', (event) => {
    if (!state.gesture.pointers.has(event.pointerId)) return;
    event.preventDefault();
    state.gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const dx = event.clientX - state.gesture.lastX;
    const dy = event.clientY - state.gesture.lastY;
    state.gesture.lastX = event.clientX;
    state.gesture.lastY = event.clientY;
    if (state.gesture.pointers.size === 2 && state.gesture.pinch) {
      const points = [...state.gesture.pointers.values()];
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const center = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
      setZoom(state.gesture.pinch.scale * distance / state.gesture.pinch.distance, center.x, center.y);
      state.zoom.x += center.x - state.gesture.pinch.center.x;
      state.zoom.y += center.y - state.gesture.pinch.center.y;
      state.gesture.pinch.center = center;
      state.gesture.moved = true;
    } else if (state.zoom.scale > 1) {
      state.zoom.x += dx;
      state.zoom.y += dy;
      state.gesture.moved = true;
      renderZoom();
    } else if (Math.hypot(event.clientX - state.gesture.startX, event.clientY - state.gesture.startY) > 8) state.gesture.moved = true;
  });
  const end = (event) => {
    if (!state.gesture.pointers.has(event.pointerId)) return;
    const delta = event.clientX - state.gesture.startX;
    const wasPinching = state.gesture.pointers.size > 1;
    const hotspot = state.gesture.hotspot;
    state.gesture.pointers.delete(event.pointerId);
    state.gesture.hotspot = null;
    if (state.gesture.pointers.size < 2) state.gesture.pinch = null;
    if (wasPinching || state.gesture.pointers.size) return;
    if (!state.gesture.moved && hotspot && state.zoom.scale <= 1.01) {
      state.gesture.movedUntil = performance.now() + 180;
      openArticle(hotspot.dataset.article);
      return;
    }
    state.gesture.movedUntil = state.gesture.moved ? performance.now() + 180 : 0;
    if (state.zoom.scale <= 1.01 && Math.abs(delta) > 50) {
      setPage(state.page + (delta < 0 ? (useSpread() ? (state.page === 0 ? 1 : 2) : 1) : -(useSpread() ? (state.page === 1 ? 1 : 2) : 1)));
      return;
    }
    if (!state.gesture.moved && !event.target.closest('.hotspot, .canvas-nav, .zoom-controls')) setControlsVisible(document.body.classList.contains('chrome-hidden'));
  };
  pageCanvas.addEventListener('pointerup', end);
  pageCanvas.addEventListener('pointercancel', end);
  pageCanvas.addEventListener('wheel', (event) => {
    if (!(event.ctrlKey || event.metaKey || innerWidth >= 1024)) return;
    event.preventDefault();
    const bounds = pageCanvas.getBoundingClientRect();
    setZoom(state.zoom.scale + (event.deltaY < 0 ? .25 : -.25), event.clientX - bounds.left, event.clientY - bounds.top);
  }, { passive: false });
}

function previousPageIndex() { return !useSpread() ? state.page - 1 : state.page === 1 ? 0 : state.page - 2; }
function nextPageIndex() { return !useSpread() ? state.page + 1 : state.page === 0 ? 1 : state.page + 2; }

$('#previous-page').addEventListener('click', () => setPage(previousPageIndex()));
$('#next-page').addEventListener('click', () => setPage(nextPageIndex()));
$('#page-contents').addEventListener('click', (event) => openPanel('contents', event.currentTarget));
$('#page-number').addEventListener('click', (event) => openPanel('pages', event.currentTarget));
$('#page-article-action').addEventListener('click', (event) => {
  if (state.zoom.scale > 1.01) { resetZoom(); return; }
  const articles = articlesForPage(state.page);
  if (articles.length === 1) openArticle(articles[0].id);
  else if (articles.length > 1) openPanel('stories', event.currentTarget);
});
$('#publication-button').addEventListener('click', (event) => openPanel('publication', event.currentTarget));
$('#edition-button').addEventListener('click', (event) => openPanel('editions', event.currentTarget));
$('#menu-button').addEventListener('click', (event) => openPanel('menu', event.currentTarget));
$('#text-menu-button').addEventListener('click', (event) => openPanel('menu', event.currentTarget));
$('#subscribe-button').addEventListener('click', (event) => openPanel('profile', event.currentTarget));
$('#text-subscribe-button').addEventListener('click', (event) => openPanel('profile', event.currentTarget));
$('#back-button').addEventListener('click', returnToPage);
$('#save-button').addEventListener('click', toggleSaved);
$('#article-font-smaller').addEventListener('click', () => { state.textSize = Math.max(0, state.textSize - 1); localStorage.setItem('reader-text-size', state.textSize); renderHeader(); });
$('#article-font-larger').addEventListener('click', () => { state.textSize = Math.min(3, state.textSize + 1); localStorage.setItem('reader-text-size', state.textSize); renderHeader(); });
$('#article-listen').addEventListener('click', toggleSpeech);
$('#article-share').addEventListener('click', shareCurrent);
$('#listen-play').addEventListener('click', toggleSpeech);
$('#listen-stop').addEventListener('click', stopSpeech);
$('#listen-rate').addEventListener('change', () => { if (state.speech.status === 'playing') speakCurrentSentence(); });
$('#close-panel').addEventListener('click', closePanel);
$('#panel-host').addEventListener('submit', (event) => { if (event.target.id === 'search-form') { event.preventDefault(); runSearch($('#search-input').value.trim()); } });
$('#panel-host').addEventListener('input', (event) => { if (event.target.id === 'page-scrub') $('#scrub-value').value = event.target.value; });
$('#panel-host').addEventListener('change', (event) => { if (event.target.id === 'page-scrub') { closePanel(); setPage(Number(event.target.value) - 1, { push: true }); } });
$('#panel-host').addEventListener('click', (event) => {
  if (event.target.matches('[data-close-panel]')) { closePanel(); return; }
  if (event.target.closest('[data-home-link]')) { savePosition(); return; }
  const tab = event.target.closest('[data-edition-publication]');
  if (tab) {
    const latest = allIssues().filter((issue) => issue.publication === tab.dataset.editionPublication).sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    if (latest) switchEdition(latest.key);
    return;
  }
  const edition = event.target.closest('[data-edition-link]');
  if (edition) { switchEdition(edition.dataset.editionLink); return; }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'search') { openPanel('search', event.target.closest('[data-action]')); return; }
  if (action === 'profile') { openPanel('profile', event.target.closest('[data-action]')); return; }
  if (action === 'saved') { openPanel('saved', event.target.closest('[data-action]')); return; }
  if (action === 'faqs') { openPanel('faqs', event.target.closest('[data-action]')); return; }
  const article = event.target.closest('[data-article-link]');
  if (article) { closePanel(); openArticle(article.dataset.articleLink); return; }
  const page = event.target.closest('[data-page-link]');
  if (page) { closePanel(); setPage(Number(page.dataset.pageLink), { push: true }); }
});
$('#panel-host').addEventListener('keydown', (event) => {
  if (!state.panel) return;
  if (event.key === 'Escape') { event.preventDefault(); closePanel(); return; }
  if (event.key !== 'Tab') return;
  const focusable = [...$('#panel-host .panel-card').querySelectorAll('button, a[href], input, select, [tabindex]:not([tabindex="-1"])')].filter((element) => !element.disabled && !element.hidden);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
$('#article-content').addEventListener('click', (event) => {
  const image = event.target.closest('.article-content img');
  if (image) {
    event.preventDefault();
    openLightbox([...document.querySelectorAll('#article-content .article-figure img')].indexOf(image));
    return;
  }
  const article = event.target.closest('[data-article-link]');
  if (article) { event.preventDefault(); openArticle(article.dataset.articleLink); return; }
  const page = event.target.closest('[data-page-link]');
  if (page) { event.preventDefault(); returnToPage(); setPage(Number(page.dataset.pageLink), { push: true }); }
});
$('#article-content').addEventListener('keydown', (event) => {
  const image = event.target.closest('.article-content img');
  if (image && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    openLightbox([...document.querySelectorAll('#article-content .article-figure img')].indexOf(image));
  }
});
pageSpread.addEventListener('click', (event) => {
  const hotspot = event.target.closest('.hotspot');
  if (hotspot && state.zoom.scale <= 1.01 && performance.now() > state.gesture.movedUntil) openArticle(hotspot.dataset.article);
});
$('#lightbox-close').addEventListener('click', () => closeLightbox());
$('#lightbox-prev').addEventListener('click', () => moveLightbox(-1));
$('#lightbox-next').addEventListener('click', () => moveLightbox(1));
$('#image-lightbox').addEventListener('click', (event) => { if (event.target.matches('[data-close-lightbox]')) closeLightbox(); });
$('#image-lightbox').addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  const focusable = [...$('#image-lightbox').querySelectorAll('button')].filter((element) => !element.disabled);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
let lightboxSwipeStart = null;
$('#lightbox-image').addEventListener('pointerdown', (event) => {
  lightboxZoom.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  $('#lightbox-image').setPointerCapture(event.pointerId);
  if (lightboxZoom.pointers.size === 2) {
    const points = [...lightboxZoom.pointers.values()];
    lightboxZoom.pinch = { distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y), scale: lightboxZoom.scale };
  }
});
$('#lightbox-image').addEventListener('pointermove', (event) => {
  if (!lightboxZoom.pointers.has(event.pointerId)) return;
  lightboxZoom.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (lightboxZoom.pointers.size === 2 && lightboxZoom.pinch) {
    const points = [...lightboxZoom.pointers.values()];
    const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
    lightboxZoom.scale = Math.max(1, Math.min(4, lightboxZoom.pinch.scale * distance / lightboxZoom.pinch.distance));
    renderLightboxZoom();
  } else if (lightboxZoom.scale > 1) {
    lightboxZoom.x += event.movementX;
    lightboxZoom.y += event.movementY;
    renderLightboxZoom();
  }
});
const endLightboxPointer = (event) => { lightboxZoom.pointers.delete(event.pointerId); if (lightboxZoom.pointers.size < 2) lightboxZoom.pinch = null; };
$('#lightbox-image').addEventListener('pointerup', endLightboxPointer);
$('#lightbox-image').addEventListener('pointercancel', endLightboxPointer);
$('#image-lightbox').addEventListener('pointerdown', (event) => {
  if (event.target.closest('button, [data-close-lightbox]')) return;
  if (lightboxZoom.pointers.size > 1 || lightboxZoom.scale > 1) { lightboxSwipeStart = null; return; }
  lightboxSwipeStart = { x: event.clientX, y: event.clientY };
});
$('#image-lightbox').addEventListener('pointerup', (event) => {
  if (!lightboxSwipeStart) return;
  const deltaX = event.clientX - lightboxSwipeStart.x;
  const deltaY = event.clientY - lightboxSwipeStart.y;
  lightboxSwipeStart = null;
  if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) moveLightbox(deltaX < 0 ? 1 : -1);
});
$('#image-lightbox').addEventListener('pointercancel', () => { lightboxSwipeStart = null; });
$('#swipe-hint').addEventListener('click', (event) => { event.currentTarget.hidden = true; localStorage.setItem('reader-swipe-hint', 'seen'); });
$('#zoom-in').addEventListener('click', () => setZoom(state.zoom.scale + .5));
$('#zoom-out').addEventListener('click', () => setZoom(state.zoom.scale - .5));
$('#zoom-reset').addEventListener('click', resetZoom);
$('#article-scroll').addEventListener('scroll', () => {
  const element = $('#article-scroll');
  const max = element.scrollHeight - element.clientHeight;
  $('#progress-bar').style.width = (max ? (element.scrollTop / max) * 100 : 0) + '%';
  const last = Number(element.dataset.lastScroll || 0);
  const nearTop = element.scrollTop < 32;
  const nearBottom = max - element.scrollTop < 32;
  const scrollingUp = element.scrollTop < last;
  element.dataset.lastScroll = element.scrollTop;
  if (state.view === 'text') setControlsVisible(nearTop || nearBottom || scrollingUp);
});
$('#article-scroll').addEventListener('click', () => { if (state.view === 'text') setControlsVisible(true); });
document.addEventListener('focusin', (event) => { if (event.target.closest('#app-header, #article-controls, #listen-player')) setControlsVisible(true); });
window.addEventListener('keydown', (event) => {
  if (state.lightbox.open) {
    if (event.key === 'Escape') { event.preventDefault(); closeLightbox(); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); moveLightbox(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); moveLightbox(1); }
    return;
  }
  if (event.target.matches('input, select, textarea, button, a')) return;
  if (state.view === 'page' && event.key === 'ArrowLeft') setPage(previousPageIndex());
  if (state.view === 'page' && event.key === 'ArrowRight') setPage(nextPageIndex());
  if (state.view === 'page' && event.key === 'Home') setPage(0);
  if (state.view === 'page' && event.key === 'End') setPage(state.issue.pages.length - 1);
  if (state.view === 'page' && (event.key === '+' || event.key === '=')) setZoom(state.zoom.scale + .5);
  if (state.view === 'page' && event.key === '-') setZoom(state.zoom.scale - .5);
  if (event.key === 'Escape' && state.panel) closePanel();
});
window.addEventListener('popstate', () => loadIssue(currentIssueFromUrl() || state.issueKey).catch(console.error));
window.addEventListener('resize', () => { if (state.issue) { state.page = spreadStart(state.page); renderPageCanvas(); renderPageControls(); } if (state.panel) renderPanel(); });
if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', loadVoices);

document.querySelectorAll('.canvas-nav').forEach((button) => {
  const path = button.id === 'previous-page' ? 'M14.5 5.5 8.5 12l6 6.5' : 'M9.5 5.5 15.5 12l-6 6.5';
  button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${path}" /></svg>`;
});
applyTheme();
setupPageGestures();
if (!localStorage.getItem('reader-swipe-hint')) $('#swipe-hint').hidden = false;
loadIssue(state.issueKey).catch((error) => { $('main').innerHTML = '<p class="panel-row" role="alert">' + escapeHtml(error.message) + '</p>'; console.error(error); });
