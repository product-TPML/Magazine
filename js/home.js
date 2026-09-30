import { paywallMarkup } from './article.js';
import { renderHeader, renderPageControls, renderViewState } from './chrome.js';
import { $, appBase, currentIssueFromUrl, escapeHtml, issueFromPath, state } from './core.js';
import { t } from './i18n.js';
import { icon } from './icons.js';
import { allIssues, appPath, articleHref, currentArticle, isSubscriber, issueDate, issueSummary, publication, publicationLabel, readerUrl, shortIssueDate } from './issue.js';
import { loadCatalog, loadIssue } from './loader.js';
import { renderPageCanvas } from './pages.js';
import { closePanel } from './panels.js';
import { savePosition, savedKey, updateUrl } from './prefs.js';
import { stopSpeech } from './speech.js';

export function toggleSaved() {
  if (!state.articleId) return;
  const key = savedKey(state.articleId);
  if (state.saved[key]) delete state.saved[key];
  else state.saved[key] = { title: currentArticle()?.title, publication: publicationLabel(publication(state.issue.key)), edition: issueDate(state.issue.key), page: state.page + 1, issue: state.issue.key, article: String(state.articleId) };
  localStorage.setItem('reader-saved', JSON.stringify(state.saved));
  renderHeader();
}

export async function shareCurrent() {
  const article = currentArticle();
  const url = new URL(articleHref(article.id), location.href).href;
  try {
    if (navigator.share) await navigator.share({ title: article.title, url });
    else if (navigator.clipboard) await navigator.clipboard.writeText(url);
    showPanelNote(t('shareSuccess'));
  } catch (error) {
    if (error.name !== 'AbortError') showPanelNote(t('shareFail'));
  }
}

function showPanelNote(message) {
  if ($('#panel-body')) $('#panel-body').insertAdjacentHTML('afterbegin', '<p class="panel-note" role="status">' + escapeHtml(message) + '</p>');
}

export function latestIssueKey() {
  const code = publication(state.issue.key);
  return newestIssueKey(code) || state.issue.key;
}

// Header logo: open the cover of the newest edition of the current publication.
export function goHome() {
  const key = latestIssueKey();
  stopSpeech();
  savePosition();
  closePanel();
  history.pushState({}, '', readerUrl(key, 1));
  loadIssue(key).catch(console.error);
}

function newestIssueKey(code) { return allIssues().find((item) => item.publication === code)?.key; }

// Non-subscribers land on home unless the URL points into an edition.
function shouldShowHome() {
  const params = new URLSearchParams(location.search);
  if (params.has('home')) return true;
  if (params.has('issue') || issueFromPath()) return false;
  return !isSubscriber();
}

export function route() {
  if (!shouldShowHome()) return loadIssue(currentIssueFromUrl() || state.issueKey);
  const requested = new URLSearchParams(location.search).get('home');
  const last = localStorage.getItem('reader-last-issue');
  const code = requested === 'MY' || requested === 'SU' ? requested : last ? publication(last) : 'SU';
  return showHome(code);
}

export async function showHome(code, { push = false } = {}) {
  stopSpeech();
  savePosition();
  closePanel();
  await loadCatalog();
  const url = appBase.pathname + '?home=' + code;
  if (location.pathname + location.search !== url) history[push ? 'pushState' : 'replaceState']({}, '', url);
  await loadIssue(newestIssueKey(code), { home: true });
  window.scrollTo(0, 0);
}

export function openFromHome(key, page) {
  history.pushState({}, '', readerUrl(key, page));
  loadIssue(key).catch(console.error);
}

export function renderHome() {
  const issue = state.issue;
  const code = publication(issue.key);
  const summary = issueSummary(issue.key) || {};
  const coverOf = (item) => appPath('data/' + item.key + '/' + escapeHtml(item.cover || 'cover.jpg'));
  const resume = Number(localStorage.getItem('reader-resume:' + issue.key) || 0);
  const older = allIssues().filter((item) => item.publication === code && item.key !== issue.key).map((item) => {
    const page = Number(localStorage.getItem('reader-resume:' + item.key) || 0);
    const date = code === 'MY' ? item.label : shortIssueDate(item.key);
    return '<button class="home-edition" type="button" data-home-edition="' + item.key + '" aria-label="' + escapeHtml(publicationLabel(code) + ' ' + item.label) + '">'
      + '<span class="home-edition-cover"><img loading="lazy" src="' + coverOf(item) + '" alt="">' + (page > 0 ? '<span class="home-edition-tag">p.' + (page + 1) + '</span>' : '') + '</span>'
      + '<span class="home-edition-date">' + escapeHtml(date) + '</span></button>';
  }).join('');
  $('#home-view').innerHTML = '<section class="home-hero" aria-label="Current edition">'
    + '<button class="home-hero-cover" type="button" data-home-read="1" aria-label="Read ' + escapeHtml(publicationLabel(code) + ' ' + (summary.label || '')) + '"><img src="' + coverOf(summary.key ? summary : { key: issue.key }) + '" alt=""></button>'
    + '<div class="home-hero-copy">'
    + '<p class="home-eyebrow">' + (code === 'MY' ? 'ಈ ತಿಂಗಳ ಸಂಚಿಕೆ' : 'ಈ ವಾರದ ಸಂಚಿಕೆ') + '</p>'
    + '<h1 class="home-title">' + publicationLabel(code) + '<span>' + escapeHtml(summary.label || '') + '</span></h1>'
    + '<button class="home-read" type="button" data-home-read="1">ಈಗ ಓದಿ ' + icon('forward') + '</button>'
    + (resume > 0 ? '<button class="home-continue" type="button" data-home-read="' + (resume + 1) + '">ಪುಟ ' + (resume + 1) + ' ರಿಂದ ಮುಂದುವರಿಸಿ</button>' : '')
    + '</div></section>'
    + (older ? '<section class="home-shelf" aria-label="Older editions"><div class="home-shelf-head"><h2>ಹಿಂದಿನ ಸಂಚಿಕೆಗಳು</h2><button type="button" data-home-all>ಎಲ್ಲಾ ›</button></div><div class="home-carousel">' + older + '</div></section>' : '')
    + paywallMarkup();
}

export function switchEdition(key) {
  savePosition();
  closePanel();
  const resume = Number(localStorage.getItem('reader-resume:' + key) || 0) + 1;
  history.pushState({}, '', readerUrl(key, resume));
  loadIssue(key).catch(console.error);
}

export function returnToPage() {
  stopSpeech();
  state.view = 'page';
  state.articleId = null;
  updateUrl();
  renderViewState();
  renderPageCanvas();
  renderPageControls();
  renderHeader();
}
