import { openArticle } from './article.js';
import { renderHeader, renderPageControls } from './chrome.js';
import { $, state } from './core.js';
import { openFromHome, renderHome } from './home.js';
import { t } from './i18n.js';
import { articleAccess, articlesForPage, isSubscriber, readerUrl } from './issue.js';
import { renderPageCanvas } from './pages.js';
import { closePanel, renderPanel } from './panels.js';
import { stopSpeech } from './speech.js';

function getAccountState() { return isSubscriber() ? 'subscriber' : 'free'; }

export function setAccountState(value) {
  state.account = value === 'subscriber' ? 'subscriber' : 'free';
  localStorage.setItem('reader-account', state.account);
  stopSpeech();
  renderAccountUI();
  if (state.view === 'home') {
    if (isSubscriber()) { closePanel(); openFromHome(state.issue.key, Number(localStorage.getItem('reader-resume:' + state.issue.key) || 0) + 1); }
    else { renderHome(); if (state.panel) renderPanel(); }
    return;
  }
  if (state.panel === 'profile' || state.panel === 'menu') renderPanel();
  if (state.view === 'text' && state.articleId) openArticle(state.articleId, { push: false });
  else { renderPageCanvas(); renderPageControls(); renderHeader(); if (state.panel) renderPanel(); }
}

function renderAccountUI() {
  document.body.dataset.account = state.account;
  const select = $('#account-state-menu');
  if (select) select.value = state.account;
  renderHeader();
}

export function savedKey(id) { return state.issue ? state.issue.key + ':' + String(id) : String(id); }

export function isSaved(id) { return Boolean(state.issue && state.saved[savedKey(id)]); }

export function accessComposition(page) {
  const articles = articlesForPage(page.index);
  const free = articles.filter((article) => articleAccess(article) === 'Free').length;
  const premium = articles.length - free;
  if (!articles.length) return t('noArticles');
  const counts = (free ? '<span class="access-count access-free" title="' + t('free') + '"><span class="access-icon" aria-hidden="true">○</span><span>' + free + '</span><span class="sr-only"> ' + t('free') + '</span></span>' : '')
    + (premium ? '<span class="access-count access-premium" title="' + t('premium') + '"><span class="access-icon" aria-hidden="true">●</span><span>' + premium + '</span><span class="sr-only"> ' + t('premium') + '</span></span>' : '');
  return '<span class="access-composition" aria-label="' + free + ' ' + t('free') + ', ' + premium + ' ' + t('premium') + '">' + counts + '</span>';
}

export function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  localStorage.setItem('reader-theme', state.theme);
}

export function savePosition() {
  if (!state.issue || state.view === 'home') return;
  localStorage.setItem('reader-last-issue', state.issue.key);
  localStorage.setItem('reader-resume:' + state.issue.key, String(state.page));
  if (state.articleId) localStorage.setItem('reader-last-article:' + state.issue.key, state.articleId);
}

export function updateUrl(push = false) {
  if (state.view === 'home') return;
  const url = readerUrl(state.issue.key, state.page + 1, state.view, state.articleId);
  history[push ? 'pushState' : 'replaceState']({}, '', url);
}
