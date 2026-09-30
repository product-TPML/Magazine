import { setControlsVisible } from './chrome.js';
import { $, escapeHtml, state } from './core.js';
import { T, t } from './i18n.js';
import { icon } from './icons.js';
import { accessClass, accessLabel, allIssues, appPath, articleIds, articleOrder, articlesForPage, imagePath, isPageLocked, issueDate, publication, publicationLabel } from './issue.js';
import { setPage } from './pages.js';
import { accessComposition, isSaved } from './prefs.js';
import { searchMarkup } from './search.js';

export function renderPanel() {
  const host = $('#panel-host');
  host.hidden = !state.panel;
  if (state.panel) host.dataset.panel = state.panel;
  else delete host.dataset.panel;
  const inert = Boolean(state.panel);
  document.querySelectorAll('#app-header, main, #page-controls, #article-controls, #listen-player').forEach((element) => { element.inert = inert; });
  if (!state.panel) return;
  $('#panel-title').textContent = T[state.lang].panelTitles[state.panel] || t('panelTitles').default;
  const body = $('#panel-body');
  if (state.panel === 'menu') body.innerHTML = menuMarkup();
  if (state.panel === 'publication') body.innerHTML = publicationMarkup();
  if (state.panel === 'contents') body.innerHTML = contentsMarkup();
  if (state.panel === 'pages') body.innerHTML = pagesMarkup();
  if (state.panel === 'stories') body.innerHTML = storiesMarkup();
  if (state.panel === 'saved') body.innerHTML = savedMarkup();
  if (state.panel === 'search') body.innerHTML = searchMarkup();
  if (state.panel === 'editions') body.innerHTML = editionsMarkup();
  if (state.panel === 'profile') body.innerHTML = profileMarkup();
  if (state.panel === 'faqs') body.innerHTML = '<div class="panel-section"><h3>' + t('faqs') + '</h3><p class="panel-row">' + t('faqsBody') + '</p></div>';
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
    page.textContent = t('page', article.pageIndex + 1);
    meta.append(page);
    if (status) meta.append(status);
    copy.className = 'panel-row-copy';
    row.classList.add('article-list-row');
    row.append(meta);
  });
}

export function openPanel(panel, trigger = document.activeElement) {
  state.panel = panel;
  state.panelReturnFocus = trigger;
  setControlsVisible(true);
  renderPanel();
  requestAnimationFrame(() => $('#panel-body')?.querySelector('button, a[href], input, select')?.focus());
}

export function closePanel() {
  const returnFocus = state.panelReturnFocus;
  state.panel = null;
  state.panelReturnFocus = null;
  renderPanel();
  if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
}

export function articleRow(article, excerpt = '') {
  const saved = isSaved(article.id) ? ' · ★' : '';
  const premium = accessClass(article) === 'premium';
  const tagGlyph = premium ? icon('lock') : '<span aria-hidden="true">○</span>';
  return '<button class="panel-row" type="button" data-article-link="' + article.id + '"><span><strong>' + escapeHtml(article.title || t('article', article.id)) + '</strong><small>' + escapeHtml(article.byline || t('bylineUnavailable')) + ' · ' + t('page', article.pageIndex + 1) + saved + '</small>' + (excerpt ? '<small class="row-meta">' + escapeHtml(excerpt) + '</small>' : '') + '<small><span class="status-pill access-' + accessClass(article) + '">' + tagGlyph + accessLabel(article) + '</span></small></span></button>';
}

function contentsMarkup() {
  const articles = articleIds().map((id) => state.issue.articles[id]).sort(articleOrder);
  return articles.length ? articles.map((article) => articleRow(article)).join('') : pageListMarkup();
}

function pageListMarkup() {
  return state.issue.pages.map((page, index) => '<button class="panel-row" type="button" data-page-link="' + index + '"><span><strong>' + t('page', index + 1) + '</strong><small>' + accessComposition(page) + '</small></span></button>').join('');
}

function scrubLabel(index) {
  return t('page', '') + '<output id="scrub-value">' + (index + 1) + '</output> / ' + state.issue.pages.length + (isPageLocked(index) ? ' <span class="page-scrub-lock">' + icon('lock') + t('premium') + '</span>' : '');
}

// Slider only picks a page: sync the label and grid, and wait for Go (or Enter) to navigate.
export function previewScrubPage(value) {
  const index = Number(value) - 1;
  $('.page-scrub-label').innerHTML = scrubLabel(index);
  document.querySelectorAll('.page-thumb.is-target').forEach((thumb) => thumb.classList.remove('is-target'));
  const thumb = document.querySelector('.page-thumb[data-page-link="' + index + '"]');
  if (thumb) { thumb.classList.add('is-target'); thumb.scrollIntoView({ block: 'nearest' }); }
}

export function goToScrubPage() {
  const input = $('#page-scrub');
  if (!input) return;
  closePanel();
  setPage(Number(input.value) - 1, { push: true });
}

function pagesMarkup() {
  const scrub = state.issue.pages.length > 80
    ? '<div class="page-scrub"><label for="page-scrub"><span class="page-scrub-label">' + scrubLabel(state.page) + '</span><input id="page-scrub" type="range" min="1" max="' + state.issue.pages.length + '" value="' + (state.page + 1) + '" aria-label="' + t('choosePageAria') + '"></label><button class="page-scrub-go" id="page-scrub-go" type="button">' + t('go') + '</button></div>'
    : '';
  const grid = state.issue.pages.map((page, index) => {
    const locked = isPageLocked(index);
    return '<button class="page-thumb' + (index === state.page ? ' is-current' : '') + (locked ? ' is-locked' : '') + '" type="button" data-page-link="' + index + '" aria-label="' + t('goToPageAria', index + 1) + (locked ? t('premiumLockedSuffix') : '') + '"><img loading="lazy" src="' + imagePath(page, true) + '" alt=""><span class="page-number-label">' + (index + 1) + '</span>'
      + (locked ? '<span class="page-lock-badge" aria-hidden="true">' + icon('lock') + '</span>' : '')
      + '<strong>' + t('page', index + 1) + '</strong><small>' + (locked ? '<span class="page-locked-label">' + icon('lock') + t('premium') + '</span>' : accessComposition(page)) + '</small></button>';
  }).join('');
  return scrub + '<div class="page-grid">' + grid + '</div>';
}

function storiesMarkup() {
  return articlesForPage(state.page).map((article) => articleRow(article)).join('') || '<p class="panel-row">' + t('noStoriesOnPage') + '</p>';
}

function savedMarkup() {
  const entries = Object.entries(state.saved);
  if (!entries.length) return '<p class="panel-row">' + t('noSavedYet') + '</p>';
  return entries.map(([key, saved]) => {
    // ponytail: edition-scoped composite keys; legacy global IDs stay unavailable, never reattached
    const separator = key.indexOf(':');
    const entryIssue = separator > 0 ? key.slice(0, separator) : null;
    const id = separator > 0 ? key.slice(separator + 1) : key;
    const article = entryIssue === state.issue.key ? state.issue.articles[id] : null;
    if (!article) return '<div class="panel-row"><span><strong>' + escapeHtml(saved.title || t('article', id)) + '</strong><small>' + escapeHtml(saved.publication || t('savedArticleFallback')) + ' · ' + t('unavailableInEdition') + '</small></span></div>';
    return '<button class="panel-row" type="button" data-article-link="' + article.id + '"><span><strong>' + escapeHtml(article.title || saved.title || t('article', id)) + '</strong><small>' + escapeHtml(saved.publication || publicationLabel(publication(state.issue.key))) + ' · ' + escapeHtml(saved.edition || issueDate(state.issue.key)) + ' · ' + t('page', saved.page || article.pageIndex + 1) + '</small><small><span class="status-pill access-' + accessClass(article) + '">' + accessLabel(article) + '</span></small></span></button>';
  }).join('');
}

function menuMarkup() {
  const dark = state.theme === 'dark';
  const enUi = state.lang === 'en';
  return '<div class="menu-top"><a class="panel-row" href="https://www.prajavani.net/" data-home-link><span class="menu-row-icon">' + icon('home') + '</span><span><strong>ಪ್ರಜಾವಾಣಿ ಮುಖ್ಯಪುಟಕ್ಕೆ</strong><small>' + t('prajavaniHome') + '</small></span></a><button class="panel-row" type="button" data-action="search"><span class="menu-row-icon">' + icon('search') + '</span><span><strong>' + t('search') + '</strong><small>' + t('searchThisEdition') + '</small></span></button></div><div class="menu-divider"></div><button class="panel-row" type="button" data-action="profile"><span class="menu-row-icon">' + icon('profile') + '</span><span><strong>' + t('signIn') + '</strong><small>' + t('myProfile') + '</small></span></button><button class="panel-row" type="button" data-action="saved"><span class="menu-row-icon">' + icon('saved') + '</span><span><strong>' + t('savedArticles') + '</strong><small>' + t('bookmarkedArticles') + '</small></span></button><button class="panel-row" type="button" data-action="faqs"><span class="menu-row-icon">' + icon('faq') + '</span><span><strong>' + t('faqs') + '</strong><small>' + t('supportInfo') + '</small></span></button><button class="panel-row theme-toggle" type="button" role="switch" aria-checked="' + dark + '" data-action="theme"><span class="menu-row-icon">' + icon(dark ? 'moon' : 'sun') + '</span><span class="theme-toggle-copy"><strong>' + t('darkMode') + '</strong><small>' + t('useDarkColors') + '</small></span><span class="theme-switch" aria-hidden="true"></span></button>'
    + '<div class="menu-divider"></div><label class="panel-row account-state-control" for="account-state-menu"><span class="menu-row-icon">' + icon('settings') + '</span><span><strong>' + t('readerMode') + '</strong><small>' + t('prototypeSetting') + '</small></span><select id="account-state-menu" name="account-state-menu"><option value="free"' + (state.account === 'free' ? ' selected' : '') + '>' + t('freeReader') + '</option><option value="subscriber"' + (state.account === 'subscriber' ? ' selected' : '') + '>' + t('subscriber') + '</option></select></label>'
    + '<div class="menu-divider"></div><button class="panel-row theme-toggle" type="button" role="switch" aria-checked="' + enUi + '" data-action="lang"><span class="menu-row-icon">' + icon('globe') + '</span><span class="theme-toggle-copy"><strong>' + t('language') + '</strong><small>' + t('languageCurrent') + '</small></span><span class="theme-switch" aria-hidden="true"></span></button>';
}

function editionsMarkup() {
  const issues = allIssues();
  const cards = issues.map((issue) => {
    const resume = Number(localStorage.getItem('reader-resume:' + issue.key) || 0) + 1;
    const current = issue.key === state.issue.key;
    const currentInfo = current && state.view !== 'home' ? t('currentEdition') : resume > 1 ? t('continueFromPage', resume) : t('open');
    const pageOnly = current && !articleIds().length ? '<small>' + t('pageOnlyEdition') + '</small>' : '';
    return '<button class="edition-card' + (current ? ' is-current' : '') + '" type="button" data-edition-link="' + issue.key + '"><img src="' + appPath('data/' + issue.key + '/' + escapeHtml(issue.cover)) + '" alt=""><strong>' + escapeHtml(issue.label) + '</strong><span>' + currentInfo + '</span>' + pageOnly + '</button>';
  }).join('');
  return '<p class="panel-note">' + t('chooseAnEdition') + '</p><div class="edition-grid">' + cards + '</div>';
}

function profileMarkup() {
  return '<div class="panel-section"><h3>' + t('myProfile') + '</h3><p class="panel-row">' + t('signInToManage') + '</p></div>';
}

function publicationMarkup() {
  const selected = publication(state.issue.key);
  return '<div class="publication-options"><button class="edition-tab' + (selected === 'SU' ? ' is-active' : '') + '" type="button" aria-label="Sudha" aria-pressed="' + (selected === 'SU') + '" data-publication-switch="SU"><img src="' + appPath('Assets/Sudha_Mast_GOLD-New Nandi.svg') + '" alt="Sudha"></button><button class="edition-tab' + (selected === 'MY' ? ' is-active' : '') + '" type="button" aria-label="Mayura" aria-pressed="' + (selected === 'MY') + '" data-publication-switch="MY"><img src="' + appPath('Assets/MAYURA-MAST.svg') + '" alt="Mayura"></button></div>';
}
