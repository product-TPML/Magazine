import { $, appBase, pageCanvas, pageSpread, state } from './core.js';
import { latestIssueKey } from './home.js';
import { t } from './i18n.js';
import { icon } from './icons.js';
import { articlesForPage, isSubscriber, issueSummary, publication, readerUrl, shortIssueDate } from './issue.js';
import { fitPageZoom, scrollToPage } from './pages.js';
import { isSaved } from './prefs.js';

export function useSpread() { return Boolean(state.issue && state.layout === 'double' && pageCanvas.clientWidth >= 900 && state.issue.pages.length > 1); }

export function useScroll() { return Boolean(state.issue && state.layout === 'scroll' && state.issue.pages.length > 1); }

export function useSnap() { return useScroll() && innerWidth < 1024; }

export function spreadStart(index = state.page) { return !useSpread() || index === 0 ? index : 1 + Math.floor((index - 1) / 2) * 2; }

export function spreadIndices(index = state.page) {
  const start = spreadStart(index);
  return [start, useSpread() && start > 0 && state.issue.pages[start + 1] ? start + 1 : null].filter((value) => value !== null);
}

function displayPageLabel() {
  const pages = spreadIndices();
  return pages.length > 1 ? t('pagesRange', pages[0] + 1, pages[1] + 1) : t('page', pages[0] + 1);
}

export function renderHeader() {
  const summary = issueSummary(state.issue.key);
  const subscriber = isSubscriber();
  const publicationCode = publication(state.issue.key);
  const publicationName = publicationCode === 'MY' ? 'Mayura' : 'Sudha';
  $('#edition-logo').src = publicationCode === 'MY' ? 'Assets/MAYURA-MAST-white.svg' : 'Assets/Sudha_Mast_GOLD-New Nandi.svg';
  $('#edition-logo').alt = publicationName;
  $('#text-edition-logo').src = $('#edition-logo').src;
  $('#text-edition-logo').alt = publicationName + ' magazine';
  const homeHref = subscriber ? readerUrl(latestIssueKey(), 1) : appBase.pathname + '?home=' + publicationCode;
  document.querySelectorAll('.publication-home').forEach((link) => { link.href = homeHref; link.setAttribute('aria-label', publicationName + (subscriber ? ' home: latest edition cover' : ' home')); });
  document.body.dataset.publication = publicationCode;
  document.querySelector('meta[name="theme-color"]').content = getComputedStyle($('#app-header')).backgroundColor;
  $('#publication-button').setAttribute('aria-label', t('choosePublication', publicationName));
  $('#edition-label').textContent = innerWidth < 480 ? shortIssueDate(state.issue.key) : (summary?.label || shortIssueDate(state.issue.key));
  $('#subscribe-button').hidden = subscriber;
  $('#text-subscribe-button').hidden = subscriber;
  const backLabel = t('backToPage', state.page + 1);
  $('#back-button').setAttribute('aria-label', backLabel);
  $('#back-button').title = backLabel;
  const saved = state.articleId ? isSaved(state.articleId) : false;
  $('#save-button').innerHTML = icon('bookmark');
  $('#save-button').classList.toggle('is-active', saved);
  $('#save-button').setAttribute('aria-label', saved ? t('removeSavedArticle') : t('saveArticle'));
  document.documentElement.style.setProperty('--article-size', [1.125, 1.25, 1.4, 1.55][state.textSize] + 'rem');
  document.body.dataset.account = state.account;
}

export function setControlsVisible(visible) {
  document.body.classList.toggle('chrome-hidden', !visible && !state.panel);
  $('#app-header').classList.toggle('chrome-hidden', !visible && !state.panel);
  $('.page-view').classList.toggle('chrome-hidden', !visible && state.view === 'page');
  $('#article-controls').classList.toggle('chrome-hidden', !visible && state.view === 'text');
  if (useSnap() && state.view === 'page' && pageSpread.dataset.scrollIssue) requestAnimationFrame(() => { fitPageZoom(); scrollToPage(state.page); });
}

export function renderViewState() {
  document.body.dataset.view = state.view;
  $('#home-view').hidden = state.view !== 'home';
  $('.page-view').hidden = state.view !== 'page';
  $('.text-view').hidden = state.view !== 'text';
  $('#article-controls').hidden = state.view !== 'text';
  $('#reading-progress').hidden = state.view !== 'text';
  $('#view-mode-toggle').hidden = state.view !== 'page' || innerWidth < 1024 || !state.issue || state.issue.pages.length < 2;
  $('.page-header').hidden = state.view === 'text';
  $('.text-header').hidden = state.view !== 'text';
  setControlsVisible(true);
}

export function renderPageControls() {
  const articles = articlesForPage(state.page);
  const zoomActive = state.zoom.scale > 1.01 || Math.abs(state.zoom.x) > .5 || Math.abs(state.zoom.y) > .5;
  $('#page-number').querySelector('span:last-child').textContent = displayPageLabel();
  $('#page-article-action').hidden = !articles.length && !zoomActive;
  $('#page-article-action').querySelector('span:last-child').textContent = zoomActive ? t('resetZoom') : articles.length === 1 ? t('readArticle') : t('articlesCount', articles.length);
  $('#previous-page').disabled = state.page === 0;
  $('#next-page').disabled = state.page >= state.issue.pages.length - 1;
  const viewToggle = $('#view-mode-toggle');
  viewToggle.hidden = state.view !== 'page' || innerWidth < 1024 || state.issue.pages.length < 2;
  viewToggle.querySelectorAll('[data-view-mode]').forEach((option) => option.setAttribute('aria-pressed', String(option.dataset.viewMode === state.layout)));
  const layoutToggle = $('#page-layout-toggle');
  layoutToggle.hidden = state.issue.pages.length < 2;
  const mode = useScroll() ? 'vertical' : 'swipe';
  layoutToggle.dataset.mode = mode;
  $('#page-layout-label').textContent = mode === 'vertical' ? t('layoutVertical') : t('layoutSwipe');
  layoutToggle.setAttribute('aria-label', mode === 'vertical' ? t('layoutAriaVertical') : t('layoutAriaSwipe'));
}

export function renderArticleControls() {
  $('#article-listen').querySelector('.control-icon').innerHTML = icon(state.speech.status === 'playing' ? 'pause' : 'listen');
  $('#article-listen').querySelector('span:last-child').textContent = state.speech.status === 'playing' ? t('pause') : t('listen');
}
