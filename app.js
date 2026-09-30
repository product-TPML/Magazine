import { openArticle } from './js/article.js';
import { renderHeader, renderPageControls, setControlsVisible, spreadStart, useScroll, useSnap } from './js/chrome.js';
import { $, escapeHtml, lightboxZoom, pageSpread, state } from './js/core.js';
import { wasGalleryDragged } from './js/gallery.js';
import { nextPageIndex, previousPageIndex, setupPageGestures } from './js/gestures.js';
import { goHome, openFromHome, returnToPage, route, shareCurrent, showHome, switchEdition, toggleSaved } from './js/home.js';
import { applyChrome, setLang } from './js/i18n.js';
import { allIssues, articlesForPage, isSubscriber, publication } from './js/issue.js';
import { closeLightbox, moveLightbox, openLightbox, renderLightboxZoom } from './js/lightbox.js';
import { renderPageCanvas, resetZoom, setLayout, setPage, setZoom } from './js/pages.js';
import { closePanel, goToScrubPage, openPanel, previewScrubPage, renderPanel } from './js/panels.js';
import { applyTheme, savePosition, setAccountState } from './js/prefs.js';
import { runSearch } from './js/search.js';
import { loadVoices, speakCurrentSentence, stopSpeech, toggleSpeech } from './js/speech.js';

$('#previous-page').addEventListener('click', () => setPage(previousPageIndex()));

$('#view-mode-toggle').addEventListener('click', (event) => {
  const option = event.target.closest('[data-view-mode]');
  if (option) setLayout(option.dataset.viewMode);
});

$('#page-layout-toggle').addEventListener('click', () => setLayout(useScroll() ? 'single' : 'scroll'));

$('#next-page').addEventListener('click', () => setPage(nextPageIndex()));

$('#page-contents').addEventListener('click', (event) => openPanel('contents', event.currentTarget));

$('#page-number').addEventListener('click', (event) => openPanel('pages', event.currentTarget));

$('#page-article-action').addEventListener('click', (event) => {
  if (state.zoom.scale > 1.01) { resetZoom(); return; }
  const articles = articlesForPage(state.page);
  if (articles.length === 1) openArticle(articles[0].id);
  else if (articles.length > 1) openPanel('stories', event.currentTarget);
});

$('#edition-button').addEventListener('click', (event) => openPanel('editions', event.currentTarget));

$('#menu-button').addEventListener('click', (event) => openPanel('menu', event.currentTarget));

$('#text-menu-button').addEventListener('click', (event) => openPanel('menu', event.currentTarget));

$('#subscribe-button').addEventListener('click', (event) => openPanel('profile', event.currentTarget));

$('#text-subscribe-button').addEventListener('click', (event) => openPanel('profile', event.currentTarget));

$('#sticky-subscribe').addEventListener('click', (event) => openPanel('profile', event.currentTarget));

$('#account-button').addEventListener('click', (event) => openPanel('profile', event.currentTarget));

$('#text-account-button').addEventListener('click', (event) => openPanel('profile', event.currentTarget));

$('#back-button').addEventListener('click', returnToPage);

document.querySelectorAll('.publication-home').forEach((link) => link.addEventListener('click', (event) => {
  event.preventDefault();
  if (isSubscriber()) goHome();
  else showHome(publication(state.issue.key), { push: true }).catch(console.error);
}));

$('#home-view').addEventListener('click', (event) => {
  const read = event.target.closest('[data-home-read]');
  if (read) { openFromHome(state.issue.key, Number(read.dataset.homeRead)); return; }
  const edition = event.target.closest('[data-home-edition]');
  if (edition) { openFromHome(edition.dataset.homeEdition, Number(localStorage.getItem('reader-resume:' + edition.dataset.homeEdition) || 0) + 1); return; }
  const all = event.target.closest('[data-home-all]');
  if (all) openPanel('editions', all);
});

$('#save-button').addEventListener('click', toggleSaved);

document.addEventListener('change', (event) => {
  if (event.target.id === 'account-state-menu') setAccountState(event.target.value);
});

document.addEventListener('click', (event) => {
  const signIn = event.target.closest('.paywall-cta, .paywall-login-button');
  if (signIn) openPanel('profile', signIn);
});

$('#article-font-smaller').addEventListener('click', () => { state.textSize = Math.max(0, state.textSize - 1); localStorage.setItem('reader-text-size', state.textSize); renderHeader(); });

$('#article-font-larger').addEventListener('click', () => { state.textSize = Math.min(3, state.textSize + 1); localStorage.setItem('reader-text-size', state.textSize); renderHeader(); });

$('#article-listen').addEventListener('click', toggleSpeech);

$('#article-share').addEventListener('click', shareCurrent);

$('#share-fab').addEventListener('click', shareCurrent);

$('#listen-play').addEventListener('click', toggleSpeech);

$('#listen-stop').addEventListener('click', stopSpeech);

$('#listen-rate').addEventListener('change', () => { if (state.speech.status === 'playing') speakCurrentSentence({ restart: true }); });

$('#close-panel').addEventListener('click', closePanel);

$('#panel-host').addEventListener('submit', (event) => { if (event.target.id === 'search-form') { event.preventDefault(); runSearch($('#search-input').value.trim()); } });

$('#panel-host').addEventListener('input', (event) => { if (event.target.id === 'page-scrub') previewScrubPage(event.target.value); });

$('#panel-host').addEventListener('click', (event) => { if (event.target.closest('#page-scrub-go')) goToScrubPage(); });

$('#panel-host').addEventListener('keydown', (event) => { if (event.target.id === 'page-scrub' && event.key === 'Enter') { event.preventDefault(); goToScrubPage(); } });

$('#panel-host').addEventListener('click', (event) => {
  if (event.target.matches('[data-close-panel]')) { closePanel(); return; }
  if (event.target.closest('[data-home-link]')) { savePosition(); return; }
  const publicationSwitch = event.target.closest('[data-publication-switch]');
  if (publicationSwitch) {
    const code = publicationSwitch.dataset.publicationSwitch;
    if (state.view === 'home') { showHome(code, { push: true }).catch(console.error); return; }
    const issue = allIssues().find((item) => item.publication === code);
    if (issue && issue.key !== state.issue.key) switchEdition(issue.key);
    else closePanel();
    return;
  }
  const edition = event.target.closest('[data-edition-link]');
  if (edition) { switchEdition(edition.dataset.editionLink); return; }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'theme') {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    renderHeader();
    renderPanel();
    $('#panel-host [data-action="theme"]')?.focus();
    return;
  }
  if (action === 'lang') {
    setLang(state.lang === 'kn' ? 'en' : 'kn');
    $('#panel-host [data-action="lang"]')?.focus();
    return;
  }
  if (action === 'publication') { openPanel('publication', event.target.closest('[data-action]')); return; }
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
  const retry = event.target.closest('[data-retry-article]');
  if (retry) { openArticle(retry.dataset.retryArticle, { push: false }); return; }
  const image = event.target.closest('.article-content img');
  if (image) {
    event.preventDefault();
    if (wasGalleryDragged()) return;
    if (image._imageZoom && performance.now() < image._imageZoom.movedUntil) return;
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
  const freeArticle = event.target.closest('.locked-free-article');
  if (freeArticle) { openArticle(freeArticle.dataset.article); return; }
  const hotspot = event.target.closest('.hotspot');
  if (!hotspot || state.zoom.scale > 1.01 || performance.now() <= state.gesture.movedUntil) return;
  if (hotspot.dataset.tocTarget) setPage(Number(hotspot.dataset.tocTarget) - 1, { push: true });
  else openArticle(hotspot.dataset.article);
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

// Dragging the viewer down follows the finger and dims the scrim; letting go past 80px closes it.
function resetLightboxDrag() {
  const figure = $('.lightbox-figure');
  const backdrop = $('.lightbox-backdrop');
  figure.style.transition = '';
  figure.style.transform = '';
  backdrop.style.opacity = '';
}

$('#image-lightbox').addEventListener('pointermove', (event) => {
  if (!lightboxSwipeStart) return;
  const deltaX = event.clientX - lightboxSwipeStart.x;
  const deltaY = event.clientY - lightboxSwipeStart.y;
  if (!lightboxSwipeStart.vertical && (Math.abs(deltaY) < 12 || Math.abs(deltaY) < Math.abs(deltaX))) return;
  lightboxSwipeStart.vertical = true;
  $('.lightbox-figure').style.transition = 'none';
  $('.lightbox-figure').style.transform = 'translateY(' + deltaY + 'px)';
  $('.lightbox-backdrop').style.opacity = String(Math.max(.35, 1 - Math.abs(deltaY) / 400));
});

$('#image-lightbox').addEventListener('pointerup', (event) => {
  if (!lightboxSwipeStart) return;
  const deltaX = event.clientX - lightboxSwipeStart.x;
  const deltaY = event.clientY - lightboxSwipeStart.y;
  lightboxSwipeStart = null;
  resetLightboxDrag();
  if (Math.abs(deltaY) > 80 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) { closeLightbox(); return; }
  if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) moveLightbox(deltaX < 0 ? 1 : -1);
});

$('#image-lightbox').addEventListener('pointercancel', () => { lightboxSwipeStart = null; resetLightboxDrag(); });

// Double-tap toggles 2x zoom around the tapped point.
let lightboxTap = null;
$('#lightbox-image').addEventListener('pointerdown', (event) => { lightboxTap = { x: event.clientX, y: event.clientY, t: performance.now(), single: lightboxZoom.pointers.size <= 1 }; });
$('#lightbox-image').addEventListener('pointerup', (event) => {
  const down = lightboxTap;
  lightboxTap = null;
  if (!down || !down.single || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 10 || performance.now() - down.t > 300) return;
  const previous = lightboxLastTap;
  lightboxLastTap = { x: event.clientX, y: event.clientY, t: performance.now() };
  if (!previous || lightboxLastTap.t - previous.t > 350 || Math.hypot(event.clientX - previous.x, event.clientY - previous.y) > 40) return;
  lightboxLastTap = null;
  const image = $('#lightbox-image');
  if (lightboxZoom.scale > 1) { lightboxZoom.scale = 1; lightboxZoom.x = 0; lightboxZoom.y = 0; }
  else {
    const rect = image.getBoundingClientRect();
    lightboxZoom.scale = 2;
    lightboxZoom.x = (1 - 2) * (event.clientX - (rect.left + rect.width / 2));
    lightboxZoom.y = (1 - 2) * (event.clientY - (rect.top + rect.height / 2));
  }
  renderLightboxZoom();
});
let lightboxLastTap = null;

$('#swipe-hint').addEventListener('click', (event) => { event.currentTarget.hidden = true; localStorage.setItem('reader-swipe-hint', 'seen'); });

$('#zoom-in').addEventListener('click', () => setZoom(state.zoom.scale + .5));

$('#zoom-out').addEventListener('click', () => setZoom(state.zoom.scale - .5));

$('#zoom-reset').addEventListener('click', resetZoom);

$('#article-scroll').addEventListener('scroll', () => {
  const element = $('#article-scroll');
  const max = element.scrollHeight - element.clientHeight;
  $('#progress-bar').style.width = (max ? (element.scrollTop / max) * 100 : 0) + '%';
  const last = Number(element.dataset.lastScroll || 0);
  // Ignore small moves: toggling the chrome resizes this scroller and nudges scrollTop.
  if (Math.abs(element.scrollTop - last) < 8) return;
  element.dataset.lastScroll = element.scrollTop;
  const nearTop = element.scrollTop < 32;
  // Wider than the header height, so showing the chrome here can't push us back out of the zone.
  const nearBottom = max - element.scrollTop < 160;
  const scrollingUp = element.scrollTop < last;
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
  if (state.view === 'page' && !useScroll() && (event.key === '+' || event.key === '=')) setZoom(state.zoom.scale + .5);
  if (state.view === 'page' && !useScroll() && event.key === '-') setZoom(state.zoom.scale - .5);
  if (event.key === 'Escape' && state.panel) closePanel();
});

window.addEventListener('popstate', () => route().catch(console.error));

window.addEventListener('resize', () => {
  const continuousScroll = useScroll() && !useSnap() && pageSpread.dataset.scrollIssue?.startsWith(state.issue?.key + ':flow');
  if (state.issue && !continuousScroll) { state.page = spreadStart(state.page); renderPageCanvas(); renderPageControls(); }
  if (state.panel) renderPanel();
});

if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', loadVoices);

document.querySelectorAll('.canvas-nav').forEach((button) => {
  const path = button.id === 'previous-page' ? 'M14.5 5.5 8.5 12l6 6.5' : 'M9.5 5.5 15.5 12l-6 6.5';
  button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${path}" /></svg>`;
});

applyTheme();

applyChrome();

document.body.dataset.account = state.account;

setupPageGestures();

if (!localStorage.getItem('reader-swipe-hint')) $('#swipe-hint').hidden = false;

route().catch((error) => { $('main').innerHTML = '<p class="panel-row" role="alert">' + escapeHtml(error.message) + '</p>'; console.error(error); });

// Offline banner; a story that failed to load is retried automatically when the connection returns.
const syncOnline = () => { $('#offline-banner').hidden = navigator.onLine; };
window.addEventListener('offline', syncOnline);
window.addEventListener('online', () => {
  syncOnline();
  if (state.view === 'text' && document.querySelector('#article-content .article-error')) openArticle(state.articleId, { push: false });
});
syncOnline();
