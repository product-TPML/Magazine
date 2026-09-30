import { lockedPageMarkup } from './article.js';
import { renderHeader, renderPageControls, renderViewState, setControlsVisible, spreadIndices, spreadStart, useScroll, useSnap } from './chrome.js';
import { $, pageCanvas, pageSpread, pageZoomStage, prefersReducedMotion, state } from './core.js';
import { t } from './i18n.js';
import { articlesForPage, isPageLocked, lockedPages, pageImageSrc, parsePercent, preloadNearbyPages } from './issue.js';
import { savePosition, updateUrl } from './prefs.js';
import { stopSpeech } from './speech.js';

let renderedPageZoom = { scale: 1, x: 0, y: 0 };
let scrollSyncFrame = 0;

export function renderZoom() {
  state.zoom.scale = Math.min(state.zoom.scale, maxPageZoom());
  clampPageZoom();
  const transform = 'translate3d(' + state.zoom.x + 'px, ' + state.zoom.y + 'px, 0) scale(' + state.zoom.scale + ')';
  pageZoomStage.style.transform = transform;
  renderedPageZoom = { ...state.zoom };
  const active = state.zoom.scale > 1.01 || Math.abs(state.zoom.x) > .5 || Math.abs(state.zoom.y) > .5;
  $('#zoom-reset').hidden = !active;
  $('#zoom-in').disabled = state.zoom.scale >= maxPageZoom() - .001;
  $('#page-article-action').hidden = !articlesForPage(state.page).length && !active;
  $('#page-article-action').querySelector('span:last-child').textContent = active ? t('resetZoom') : articlesForPage(state.page).length === 1 ? t('readArticle') : t('articlesCount', articlesForPage(state.page).length);
}

export function maxPageZoom() {
  const images = [...pageSpread.querySelectorAll('.page-slot:not(.is-locked) .page-zoom img')];
  if (!images.length) return 1;
  return Math.min(4, ...images.map((image) => {
    if (!image.naturalWidth || !image.naturalHeight || !image.clientWidth || !image.clientHeight) return 1;
    return Math.max(1, Math.min(image.naturalWidth / image.clientWidth, image.naturalHeight / image.clientHeight));
  }));
}

function clampPageZoom() {
  if (state.zoom.scale <= 1.01) {
    state.zoom.x = 0;
    state.zoom.y = 0;
    return;
  }
  const canvas = pageCanvas.getBoundingClientRect();
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const content = [...pageSpread.querySelectorAll('.page-zoom')].map((element) => element.getBoundingClientRect());
  if (!content.length || !canvas.width || !canvas.height) return;
  const bounds = content.reduce((result, rect) => ({
    left: Math.min(result.left, centerX + (rect.left - canvas.left - centerX - renderedPageZoom.x) / renderedPageZoom.scale),
    top: Math.min(result.top, centerY + (rect.top - canvas.top - centerY - renderedPageZoom.y) / renderedPageZoom.scale),
    right: Math.max(result.right, centerX + (rect.right - canvas.left - centerX - renderedPageZoom.x) / renderedPageZoom.scale),
    bottom: Math.max(result.bottom, centerY + (rect.bottom - canvas.top - centerY - renderedPageZoom.y) / renderedPageZoom.scale)
  }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
  const visibleX = Math.min(64, canvas.width, (bounds.right - bounds.left) * state.zoom.scale);
  const visibleY = Math.min(64, canvas.height, (bounds.bottom - bounds.top) * state.zoom.scale);
  state.zoom.x = Math.max(visibleX - centerX - (bounds.right - centerX) * state.zoom.scale, Math.min(canvas.width - visibleX - centerX - (bounds.left - centerX) * state.zoom.scale, state.zoom.x));
  state.zoom.y = Math.max(visibleY - centerY - (bounds.bottom - centerY) * state.zoom.scale, Math.min(canvas.height - visibleY - centerY - (bounds.top - centerY) * state.zoom.scale, state.zoom.y));
}

export function fitPageZoom() {
  pageSpread.querySelectorAll('.page-slot').forEach((slot) => {
    const page = state.issue.pages[Number(slot.dataset.page)];
    const zoom = slot.querySelector('.page-zoom');
    const ratio = (page.width || 3) / (page.height || 4);
    const height = Math.min(pageCanvas.clientHeight, slot.clientWidth / ratio);
    zoom.style.width = Math.max(0, height * ratio) + 'px';
    zoom.style.height = Math.max(0, height) + 'px';
  });
}

export function resetZoom() {
  state.zoom.scale = 1;
  state.zoom.x = 0;
  state.zoom.y = 0;
  renderZoom();
  if (state.issue) renderPageControls();
}

export function setZoom(scale, anchorX = pageCanvas.clientWidth / 2, anchorY = pageCanvas.clientHeight / 2) {
  const previous = state.zoom.scale;
  state.zoom.scale = Math.max(1, Math.min(maxPageZoom(), scale));
  const ratio = state.zoom.scale / previous;
  state.zoom.x = (state.zoom.x - (anchorX - pageCanvas.clientWidth / 2)) * ratio + (anchorX - pageCanvas.clientWidth / 2);
  state.zoom.y = (state.zoom.y - (anchorY - pageCanvas.clientHeight / 2)) * ratio + (anchorY - pageCanvas.clientHeight / 2);
  renderZoom();
}

function buildPageSlot(index) {
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
  image.alt = t('page', index + 1);
  image.loading = Math.abs(index - state.page) <= 1 ? 'eager' : 'lazy';
  image.addEventListener('load', () => { if (image.isConnected && !useScroll()) renderZoom(); });
  const locked = isPageLocked(index);
  slot.classList.toggle('is-locked', locked);
  image.src = pageImageSrc(index);
  const placeholder = document.createElement('span');
  placeholder.className = 'page-placeholder';
  placeholder.textContent = t('page', index + 1);
  zoom.append(image, placeholder);
  if (locked) {
    zoom.insertAdjacentHTML('beforeend', lockedPageMarkup(index));
    art.append(zoom);
    slot.append(art);
    return slot;
  }
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
  state.issue.tocMappings.filter((mapping) => mapping.tocPage === index + 1).forEach((mapping) => {
    const button = document.createElement('button');
    button.className = 'hotspot hotspot-toc';
    button.type = 'button';
    button.style.top = mapping.y + '%';
    button.style.left = mapping.x + '%';
    button.style.width = mapping.width + '%';
    button.style.height = mapping.height + '%';
    button.dataset.tocTarget = mapping.targetPage;
    button.setAttribute('aria-label', 'Go to page ' + mapping.targetPage);
    zoom.append(button);
  });
  art.append(zoom);
  slot.append(art);
  return slot;
}

export function renderPageCanvas() {
  if (state.view === 'home') return;
  if (useScroll()) { renderScrollCanvas(); return; }
  pageCanvas.classList.remove('is-scroll', 'is-snap');
  delete pageSpread.dataset.scrollIssue;
  pageCanvas.scrollTop = 0;
  const indices = spreadIndices();
  pageSpread.classList.toggle('is-spread', indices.length > 1);
  pageSpread.replaceChildren(...indices.map((index) => buildPageSlot(index)));
  fitPageZoom();
  resetZoom();
  preloadNearbyPages(state.page);
}

function renderScrollCanvas() {
  const snap = useSnap();
  const key = state.issue.key + (snap ? ':snap' : ':flow') + ':' + lockedPages().join(',');
  if (pageSpread.dataset.scrollIssue !== key) {
    pageCanvas.classList.add('is-scroll');
    pageCanvas.classList.toggle('is-snap', snap);
    pageSpread.classList.remove('is-spread');
    pageSpread.replaceChildren(...state.issue.pages.map((page, index) => buildPageSlot(index)));
    pageSpread.dataset.scrollIssue = key;
    resetZoom();
  }
  if (snap) fitPageZoom();
  scrollToPage(state.page);
  preloadNearbyPages(state.page);
}

export function scrollToPage(index) {
  const slot = pageSpread.querySelector('.page-slot[data-page="' + index + '"]');
  if (slot) pageCanvas.scrollTo({ top: slot.offsetTop - (useSnap() ? 0 : 8), behavior: 'instant' });
}

// In scroll layouts the current page is the one crossing 40% down the canvas.
function syncScrollPage() {
  scrollSyncFrame = 0;
  if (!useScroll() || state.view !== 'page' || !pageSpread.dataset.scrollIssue) return;
  const line = pageCanvas.scrollTop + pageCanvas.clientHeight * .4;
  let page = 0;
  for (const slot of pageSpread.children) {
    if (slot.offsetTop > line) break;
    page = Number(slot.dataset.page);
  }
  if (page === state.page) return;
  state.page = page;
  savePosition();
  updateUrl(false);
  renderPageControls();
  preloadNearbyPages(page);
}

pageCanvas.addEventListener('scroll', () => { if (!scrollSyncFrame) scrollSyncFrame = requestAnimationFrame(syncScrollPage); }, { passive: true });

export function setLayout(layout) {
  if (state.layout === layout) return;
  state.layout = layout;
  localStorage.setItem('reader-page-layout', layout);
  state.page = spreadStart(state.page);
  renderPageCanvas();
  renderPageControls();
  pageCanvas.focus({ preventScroll: true });
}

function animatePageChange(direction) {
  if (!direction || prefersReducedMotion.matches || useScroll()) return;
  pageSpread.classList.remove('page-transition-next', 'page-transition-previous');
  void pageSpread.offsetWidth;
  pageSpread.classList.add('page-transition-' + direction);
  pageSpread.addEventListener('animationend', () => pageSpread.classList.remove('page-transition-' + direction), { once: true });
}

export function setPage(pageIndex, { push = false, keepControls = true } = {}) {
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
