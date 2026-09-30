import { appBase, preloadedPageImages, state } from './core.js';
import { t } from './i18n.js';

export function publication(key) { return key && key.startsWith('MY') ? 'MY' : 'SU'; }

export function publicationLabel(code) { return code === 'MY' ? 'ಮಯೂರ' : 'ಸುಧಾ'; }

export function appPath(path) { return new URL(path, appBase).pathname; }

export function issuePath(file) { return appPath('data/' + state.issue.key + '/' + file); }

export function readerUrl(key, page, view = 'page', articleId = null) {
  const params = new URLSearchParams({ issue: key, p: String(page) });
  if (view === 'text' && articleId) {
    params.set('view', 'text');
    params.set('article', String(articleId));
  }
  return appBase.pathname + '?' + params;
}

export function issueDate(key) {
  const parts = key.match(/^[A-Z]{2}-(\d{4})-(\d{2})-(\d{2})$/);
  if (!parts) return key;
  return new Date(parts[1] + '-' + parts[2] + '-' + parts[3] + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function shortIssueDate(key) {
  const parts = key.match(/^[A-Z]{2}-(\d{4})-(\d{2})-(\d{2})$/);
  if (!parts) return key;
  return new Date(parts[1] + '-' + parts[2] + '-' + parts[3] + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function imagePath(page, thumb = false) {
  const file = (thumb ? page.imgThumbFile : page.imgFile).split('/').pop();
  return issuePath((thumb ? 'thumbs/' : 'pages/') + file);
}

// Free readers can't open pages that carry a Premium article; those pages only ever load the thumbnail.
export function isPageLocked(index) { return !isSubscriber() && articlesForPage(index).some(isPaidArticle); }

export function lockedPages() { return state.issue.pages.map((page, index) => index).filter(isPageLocked); }

export function pageImageSrc(index) { return imagePath(state.issue.pages[index], isPageLocked(index)); }

export function preloadNearbyPages(index) {
  for (let pageIndex = Math.max(0, index - 3); pageIndex <= Math.min(state.issue.pages.length - 1, index + 3); pageIndex += 1) {
    if (isPageLocked(pageIndex)) continue;
    const src = imagePath(state.issue.pages[pageIndex]);
    if (preloadedPageImages.has(src)) continue;
    preloadedPageImages.add(src);
    const image = new Image();
    image.decoding = 'async';
    image.src = src;
  }
}

export function parsePercent(value) { return Number.parseFloat(String(value || 0)) / 100; }

export function readPageNumber(value) { const page = Number.parseInt(value, 10); return Number.isFinite(page) ? Math.max(1, page) : 1; }

export function allIssues() { return state.catalog?.publications.flatMap((item) => item.issues.map((issue) => ({ ...issue, publication: item.code, publicationTitle: item.title }))) || []; }

export function issueSummary(key) { return allIssues().find((issue) => issue.key === key); }

export function currentArticle() { return state.issue?.articles[state.articleId] || null; }

export function articleIds() { return Object.keys(state.issue?.articles || {}).sort((a, b) => articleOrder(state.issue.articles[a], state.issue.articles[b])); }

export function articleOrder(a, b) { return (a.pageIndex - b.pageIndex) || (parsePercent(a.top) - parsePercent(b.top)) || (parsePercent(a.left) - parsePercent(b.left)); }

export function articlesForPage(index) { return state.issue.pages[index]?.articles.map((item) => state.issue.articles[String(item.id)]).filter(Boolean).sort(articleOrder) || []; }

function articleForPage(index) {
  const page = state.issue.pages[index];
  if (!page || !page.articles.length) return null;
  const last = state.issue.lastOpened?.[index];
  return page.articles.map((item) => state.issue.articles[String(item.id)]).filter(Boolean).find((article) => String(article.id) === String(last))
    || articlesForPage(index).sort((a, b) => (parsePercent(b.width) * parsePercent(b.height)) - (parsePercent(a.width) * parsePercent(a.height)))[0];
}

export function articleHref(id) {
  const article = state.issue.articles[String(id)];
  return article ? readerUrl(state.issue.key, article.pageIndex + 1, 'text', article.id) : '#';
}

export function pageHref(index) { return readerUrl(state.issue.key, index + 1); }

export function articleAccess(article) {
  const words = String(article?.plainText || '').trim().split(/\s+/).filter(Boolean).length;
  return article?.plainText && words < 100 ? 'Free' : 'Premium';
}

export function accessClass(article) { return articleAccess(article).toLowerCase(); }

export function accessLabel(article) { return accessClass(article) === 'premium' ? t('premium') : t('free'); }

export function isSubscriber() { return state.account === 'subscriber'; }

export function isPaidArticle(article) { return articleAccess(article) === 'Premium'; }

export function needsPreview(article) { return !isSubscriber() && isPaidArticle(article); }
