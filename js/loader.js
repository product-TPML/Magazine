import { refreshSearch } from './search.js';
import { openArticle } from './article.js';
import { renderArticleControls, renderHeader, renderPageControls, renderViewState, spreadStart, useSpread } from './chrome.js';
import { state } from './core.js';
import { renderHome } from './home.js';
import { t } from './i18n.js';
import { appPath, articleIds, articleOrder, issuePath, readPageNumber } from './issue.js';
import { renderPageCanvas } from './pages.js';
import { renderPanel } from './panels.js';
import { renderListenPlayer, stopSpeech } from './speech.js';

export function renderArticleMetaFromHtml(id, html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const title = doc.querySelector('h1 p, h1')?.textContent.trim() || 'Article ' + id;
  const byline = state.issue.bylines[id]?.byline || '';
  const section = state.issue.bylines[id]?.section || '';
  const plainText = (doc.querySelector('.bodytext') || doc.querySelector('.articleDetail'))?.textContent.replace(/\s+/g, ' ').trim() || '';
  return { title, byline, section, plainText };
}

export async function loadArticleMeta(ids = articleIds()) {
  await Promise.all(ids.map(async (id) => {
    if (state.issue.articles[id]?.title) return;
    try {
      const response = await fetch(issuePath('articles/' + id + '.html'));
      if (response.ok) Object.assign(state.issue.articles[id], renderArticleMetaFromHtml(id, await response.text()));
    } catch { /* an incomplete article should not block the edition */ }
  }));
}

function normalizeIssue(key, coords, bylines, tocMappings = []) {
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
  return { key, pages, articles, bylines, tocMappings, lastOpened: {} };
}

function validTocMappings(data, key, pageCount) {
  if (data?.issue !== key || !Array.isArray(data.mappings)) return [];
  return data.mappings.filter((mapping) => {
    const { tocPage, targetPage, x, y, width, height } = mapping || {};
    return Number.isInteger(tocPage) && tocPage >= 1 && tocPage <= pageCount
      && Number.isInteger(targetPage) && targetPage >= 1 && targetPage <= pageCount
      && [x, y, width, height].every((value) => Number.isFinite(value) && value >= 0 && value <= 100)
      && width > 0 && height > 0 && x + width <= 100 && y + height <= 100;
  });
}

export async function loadCatalog() {
  if (state.catalog) return;
  const response = await fetch(appPath('generated/catalog.json'));
  if (!response.ok) throw new Error(t('catalogLoadError'));
  state.catalog = await response.json();
}

export async function loadIssue(key, { home = false } = {}) {
  stopSpeech();
  await loadCatalog();
  key ||= state.catalog.publications[0].issues[0].key;
  state.issueKey = key;
  const responses = await Promise.all([fetch(appPath('data/' + key + '/coords.json')), fetch(appPath('data/' + key + '/bylines.json')).catch(() => null), key === 'SU-2026-09-24' ? fetch(appPath('data/' + key + '/toc-mappings-SU-2026-09-24.json')).catch(() => null) : null]);
  if (!responses[0].ok) throw new Error(t('issueLoadError', key));
  const coords = await responses[0].json();
  let tocMappings = [];
  try {
    if (responses[2]?.ok) tocMappings = validTocMappings(await responses[2].json(), key, coords.pages?.length || 0);
  } catch { /* mappings are optional and must not block the edition */ }
  state.issue = normalizeIssue(key, coords, responses[1]?.ok ? await responses[1].json() : {}, tocMappings);
  const params = new URLSearchParams(location.search);
  const requested = home ? 0 : params.has('p') ? readPageNumber(params.get('p')) - 1 : Number(localStorage.getItem('reader-resume:' + key) || 0);
  state.page = Math.max(0, Math.min(requested, state.issue.pages.length - 1));
  state.articleId = !home && params.get('article') && state.issue.articles[params.get('article')] ? params.get('article') : null;
  state.view = home ? 'home' : params.get('view') === 'text' && state.articleId ? 'text' : 'page';
  if (useSpread()) state.page = spreadStart(state.page);
  renderHeader();
  renderViewState();
  if (home) renderHome();
  renderPageCanvas();
  renderPageControls();
  if (state.view === 'text') await openArticle(state.articleId, { push: false });
  renderArticleControls();
  renderListenPlayer();
  loadArticleMeta().then(() => {
    state.issue.metaLoaded = true;
    if (state.view === 'home') renderHome();
    renderPageCanvas();
    renderHeader();
    if (state.panel === 'search') refreshSearch();
    else if (state.panel) renderPanel();
  });
}
