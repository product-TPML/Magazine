import { renderArticleControls, renderHeader, renderPageControls } from './chrome.js';
import { state } from './core.js';
import { renderHome } from './home.js';
import { publication } from './issue.js';
import { resetZoom } from './pages.js';
import { renderPanel } from './panels.js';
import { renderListenPlayer } from './speech.js';

// UI chrome text: Kannada by default, with an English option in the hamburger menu.
// Article/paywall/home copy is always Kannada (the publication's own editorial voice), so it is
// not part of this dictionary. `t(key, ...args)` looks up state.lang, falling back to English.
export const T = {
  kn: {
    chooseEdition: 'ಸಂಚಿಕೆ ಆಯ್ಕೆಮಾಡಿ',
    pageLayoutGroup: 'ಪುಟದ ವಿನ್ಯಾಸ',
    singlePage: 'ಒಂದು ಪುಟ',
    singlePageView: 'ಒಂದು ಪುಟದ ನೋಟ',
    doublePage: 'ಎರಡು ಪುಟಗಳು',
    doublePageView: 'ಎರಡು ಪುಟಗಳ ಹರವಿನ ನೋಟ',
    scrollView: 'ನಿರಂತರ ಸ್ಕ್ರಾಲ್ ನೋಟ',
    continuousScroll: 'ನಿರಂತರ ಸ್ಕ್ರಾಲ್',
    subscribe: 'ಚಂದಾದಾರರಾಗಿ',
    accountAria: 'ಸೈನ್ ಇನ್ / ನನ್ನ ಪ್ರೊಫೈಲ್',
    menuAria: 'ಮೆನು ತೆರೆಯಿರಿ',
    saveArticle: 'ಲೇಖನ ಉಳಿಸಿ',
    removeSavedArticle: 'ಉಳಿಸಿದ ಲೇಖನ ತೆಗೆಯಿರಿ',
    backToPage: (n) => 'ಪುಟ ' + n + 'ಕ್ಕೆ ಹಿಂತಿರುಗಿ',
    page: (n) => 'ಪುಟ ' + n,
    pagesRange: (a, b) => 'ಪುಟಗಳು ' + a + '–' + b,
    magazinePageAria: 'ನಿಯತಕಾಲಿಕೆ ಪುಟ',
    previousPageAria: 'ಹಿಂದಿನ ಪುಟ',
    nextPageAria: 'ಮುಂದಿನ ಪುಟ',
    zoomControlsAria: 'ಪುಟ ಝೂಮ್ ನಿಯಂತ್ರಣಗಳು',
    zoomOut: 'ಝೂಮ್ ಕಡಿಮೆ ಮಾಡಿ',
    zoomIn: 'ಝೂಮ್ ಹೆಚ್ಚಿಸಿ',
    resetZoom: 'ಝೂಮ್ ಮರುಹೊಂದಿಸಿ',
    swipeHint: 'ಪುಟ ತಿರುಗಿಸಲು ಅಡ್ಡಡ್ಡ ಸ್ವೈಪ್ ಮಾಡಿ',
    pageActionsAria: 'ಪುಟ ಕ್ರಿಯೆಗಳು',
    contents: 'ವಿಷಯಸೂಚಿ',
    readArticle: 'ಲೇಖನ ಓದಿ',
    articlesCount: (n) => n + ' ಲೇಖನಗಳು',
    layoutSwipe: 'ಸ್ವೈಪ್',
    layoutVertical: 'ಲಂಬ',
    layoutAriaSwipe: 'ಪುಟ ವಿನ್ಯಾಸ: ಸ್ವೈಪ್. ಲಂಬಕ್ಕೆ ಬದಲಿಸಿ',
    layoutAriaVertical: 'ಪುಟ ವಿನ್ಯಾಸ: ಲಂಬ. ಸ್ವೈಪ್‌ಗೆ ಬದಲಿಸಿ',
    articleImageTitle: 'ಲೇಖನದ ಚಿತ್ರ',
    closeImageViewerAria: 'ಚಿತ್ರ ವೀಕ್ಷಕ ಮುಚ್ಚಿ',
    previousImageAria: 'ಹಿಂದಿನ ಚಿತ್ರ',
    nextImageAria: 'ಮುಂದಿನ ಚಿತ್ರ',
    openArticleImageAria: 'ಲೇಖನದ ಚಿತ್ರ ತೆರೆಯಿರಿ',
    loadingArticle: 'ಲೇಖನ ಲೋಡ್ ಆಗುತ್ತಿದೆ…',
    articleLoadError: 'ಈ ಲೇಖನವನ್ನು ಲೋಡ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.',
    retry: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
    offline: 'ನೀವು ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದ್ದೀರಿ',
    gallery: 'ಗ್ಯಾಲರಿ',
    galleryImagesAria: 'ಗ್ಯಾಲರಿ ಚಿತ್ರಗಳು',
    listenControlsAria: 'ಆಲಿಸುವ ನಿಯಂತ್ರಣಗಳು',
    playArticleAria: 'ಲೇಖನ ಪ್ಲೇ ಮಾಡಿ',
    pauseArticleAria: 'ಲೇಖನ ವಿರಮಿಸಿ',
    listen: 'ಆಲಿಸಿ',
    pause: 'ವಿರಮಿಸಿ',
    readingAloud: 'ಗಟ್ಟಿಯಾಗಿ ಓದಲಾಗುತ್ತಿದೆ',
    paused: 'ವಿರಮಿಸಲಾಗಿದೆ',
    noVoice: 'ಈ ಸಾಧನದಲ್ಲಿ ಕನ್ನಡ ಧ್ವನಿ ಲಭ್ಯವಿಲ್ಲ',
    speechProgressAria: 'ಭಾಷಣ ಪ್ರಗತಿ',
    speed: 'ವೇಗ',
    speechSpeedAria: 'ಭಾಷಣ ವೇಗ',
    stop: 'ನಿಲ್ಲಿಸಿ',
    articleActionsAria: 'ಲೇಖನ ಕ್ರಿಯೆಗಳು',
    smaller: 'ಚಿಕ್ಕದು',
    larger: 'ದೊಡ್ಡದು',
    share: 'ಹಂಚಿಕೊಳ್ಳಿ',
    closePanelAria: 'ಪ್ಯಾನೆಲ್ ಮುಚ್ಚಿ',
    panelTitles: { menu: 'ಮೆನು', contents: 'ವಿಷಯಸೂಚಿ', pages: 'ಪುಟಗಳು', stories: 'ಈ ಪುಟದ ಲೇಖನಗಳು', saved: 'ಉಳಿಸಿದ ಲೇಖನಗಳು', search: 'ಹುಡುಕಿ', publication: 'ಪ್ರಕಟಣೆ', editions: 'ಸಂಚಿಕೆಗಳು', profile: 'ನನ್ನ ಪ್ರೊಫೈಲ್', faqs: 'ಪ್ರಶ್ನೋತ್ತರಗಳು', default: 'ರೀಡರ್' },
    prajavaniHome: 'ಪ್ರಜಾವಾಣಿ ಮುಖ್ಯಪುಟ',
    search: 'ಹುಡುಕಿ',
    searchThisEdition: 'ಈ ಸಂಚಿಕೆಯಲ್ಲಿ ಹುಡುಕಿ',
    signIn: 'ಸೈನ್ ಇನ್',
    myProfile: 'ನನ್ನ ಪ್ರೊಫೈಲ್',
    savedArticles: 'ಉಳಿಸಿದ ಲೇಖನಗಳು',
    bookmarkedArticles: 'ನೀವು ಬುಕ್‌ಮಾರ್ಕ್ ಮಾಡಿದ ಲೇಖನಗಳು',
    faqs: 'ಪ್ರಶ್ನೋತ್ತರಗಳು',
    supportInfo: 'ಬೆಂಬಲ ಮತ್ತು ಸಂಪರ್ಕ ಮಾಹಿತಿ',
    darkMode: 'ಡಾರ್ಕ್ ಮೋಡ್',
    useDarkColors: 'ಗಾಢ ಬಣ್ಣಗಳನ್ನು ಬಳಸಿ',
    readerMode: 'ಓದುಗ ಮೋಡ್',
    prototypeSetting: 'ಪ್ರಾಯೋಗಿಕ ಸೆಟ್ಟಿಂಗ್',
    freeReader: 'ಉಚಿತ ಓದುಗ',
    subscriber: 'ಚಂದಾದಾರ',
    language: 'ಭಾಷೆ',
    languageCurrent: 'ಕನ್ನಡ',
    signInToManage: 'ಚಂದಾದಾರಿಕೆ ಮತ್ತು ಖಾತೆ ವಿವರಗಳನ್ನು ನಿರ್ವಹಿಸಲು ಸೈನ್ ಇನ್ ಆಗಿ.',
    faqsBody: 'ಚಂದಾದಾರಿಕೆ ಮತ್ತು ಓದುಗ ಬೆಂಬಲಕ್ಕಾಗಿ, ಪ್ರಜಾವಾಣಿ ಮುಖಪುಟದ ಮೂಲಕ ಪ್ರಜಾವಾಣಿ ಬೆಂಬಲವನ್ನು ಸಂಪರ್ಕಿಸಿ.',
    chooseAnEdition: 'ಸಂಚಿಕೆ ಆಯ್ಕೆಮಾಡಿ.',
    currentEdition: 'ಪ್ರಸ್ತುತ ಸಂಚಿಕೆ',
    continueFromPage: (n) => 'ಪುಟ ' + n + ' ರಿಂದ ಮುಂದುವರಿಸಿ',
    open: 'ತೆರೆಯಿರಿ',
    pageOnlyEdition: 'ಪುಟ-ಮಾತ್ರ ಸಂಚಿಕೆ',
    searchThisIssue: 'ಈ ಸಂಚಿಕೆಯಲ್ಲಿ ಹುಡುಕಿ',
    noMatches: 'ಯಾವುದೇ ಹೊಂದಾಣಿಕೆ ಇಲ್ಲ.',
    searchIndexing: 'ಲೇಖನಗಳನ್ನು ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ…',
    premiumSearchNote: 'ಪ್ರೀಮಿಯಂ ಲೇಖನ · ಪೂರ್ಣ ಪಠ್ಯ ಓದಲು ಚಂದಾದಾರರಾಗಿ.',
    noStoriesOnPage: 'ಈ ಪುಟದಲ್ಲಿ ಯಾವುದೇ ಲೇಖನಗಳಿಲ್ಲ.',
    noSavedYet: 'ಇನ್ನೂ ಉಳಿಸಿದ ಲೇಖನಗಳಿಲ್ಲ.',
    bylineUnavailable: 'ಲೇಖಕರ ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ',
    article: (n) => 'ಲೇಖನ ' + n,
    savedArticleFallback: 'ಉಳಿಸಿದ ಲೇಖನ',
    unavailableInEdition: 'ಈ ಸಂಚಿಕೆಯಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲ',
    goToPageAria: (n) => 'ಪುಟ ' + n + 'ಕ್ಕೆ ಹೋಗಿ',
    premiumLockedSuffix: ' (ಪ್ರೀಮಿಯಂ, ಲಾಕ್ ಆಗಿದೆ)',
    choosePageAria: 'ಪುಟ ಆಯ್ಕೆಮಾಡಿ',
    go: 'ಹೋಗಿ',
    noArticles: 'ಲೇಖನಗಳಿಲ್ಲ',
    free: 'ಉಚಿತ',
    premium: 'ಪ್ರೀಮಿಯಂ',
    previousArticle: 'ಹಿಂದಿನ ಲೇಖನ',
    nextArticle: 'ಮುಂದಿನ ಲೇಖನ',
    shareSuccess: 'ಲೇಖನದ ಲಿಂಕ್ ನಕಲಿಸಲಾಗಿದೆ ಅಥವಾ ಹಂಚಿಕೊಳ್ಳಲು ಸಿದ್ಧವಿದೆ.',
    shareFail: 'ಹಂಚಿಕೊಳ್ಳಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.',
    catalogLoadError: 'ಸಂಚಿಕೆಗಳ ಪಟ್ಟಿ ಲೋಡ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ',
    issueLoadError: (key) => key + ' ಲೋಡ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ',
  },
  en: {
    chooseEdition: 'Choose edition',
    pageLayoutGroup: 'Page layout',
    singlePage: 'Single page',
    singlePageView: 'Single page view',
    doublePage: 'Two-page spread',
    doublePageView: 'Two-page spread view',
    scrollView: 'Continuous scroll view',
    continuousScroll: 'Continuous scroll',
    subscribe: 'Subscribe',
    accountAria: 'Sign in / My profile',
    menuAria: 'Open menu',
    saveArticle: 'Save article',
    removeSavedArticle: 'Remove saved article',
    backToPage: (n) => 'Back to page ' + n,
    page: (n) => 'Page ' + n,
    pagesRange: (a, b) => 'Pages ' + a + '–' + b,
    magazinePageAria: 'Magazine page',
    previousPageAria: 'Previous page',
    nextPageAria: 'Next page',
    zoomControlsAria: 'Page zoom controls',
    zoomOut: 'Zoom out',
    zoomIn: 'Zoom in',
    resetZoom: 'Reset zoom',
    swipeHint: 'Swipe horizontally to turn pages',
    pageActionsAria: 'Page actions',
    contents: 'Contents',
    readArticle: 'Read article',
    articlesCount: (n) => n + ' articles',
    layoutSwipe: 'Swipe',
    layoutVertical: 'Vertical',
    layoutAriaSwipe: 'Page layout: Swipe. Switch to vertical',
    layoutAriaVertical: 'Page layout: Vertical. Switch to swipe',
    articleImageTitle: 'Article image',
    closeImageViewerAria: 'Close image viewer',
    previousImageAria: 'Previous image',
    nextImageAria: 'Next image',
    openArticleImageAria: 'Open article image',
    loadingArticle: 'Loading article…',
    articleLoadError: 'Could not load this article.',
    retry: 'Try again',
    offline: 'You are offline',
    gallery: 'Gallery',
    galleryImagesAria: 'Gallery images',
    listenControlsAria: 'Listen controls',
    playArticleAria: 'Play article',
    pauseArticleAria: 'Pause article',
    listen: 'Listen',
    pause: 'Pause',
    readingAloud: 'Reading aloud',
    paused: 'Paused',
    noVoice: 'No Kannada voice available on this device',
    speechProgressAria: 'Speech progress',
    speed: 'Speed',
    speechSpeedAria: 'Speech speed',
    stop: 'Stop',
    articleActionsAria: 'Article actions',
    smaller: 'Smaller',
    larger: 'Larger',
    share: 'Share',
    closePanelAria: 'Close panel',
    panelTitles: { menu: 'Menu', contents: 'Contents', pages: 'Pages', stories: 'Stories on this page', saved: 'Saved Articles', search: 'Search', publication: 'Publication', editions: 'Editions', profile: 'My Profile', faqs: 'FAQs', default: 'Reader' },
    prajavaniHome: 'Prajavani Home',
    search: 'Search',
    searchThisEdition: 'Search this edition',
    signIn: 'Sign In',
    myProfile: 'My Profile',
    savedArticles: 'Saved Articles',
    bookmarkedArticles: 'Articles you bookmarked',
    faqs: 'FAQs',
    supportInfo: 'Support and contact information',
    darkMode: 'Dark mode',
    useDarkColors: 'Use dark colors',
    readerMode: 'Reader mode',
    prototypeSetting: 'Prototype setting',
    freeReader: 'Free reader',
    subscriber: 'Subscriber',
    language: 'Language',
    languageCurrent: 'English',
    signInToManage: 'Sign in to manage subscription and account details.',
    faqsBody: 'For subscription and reader support, contact Prajavani support through the Prajavani homepage.',
    chooseAnEdition: 'Choose an edition.',
    currentEdition: 'Current edition',
    continueFromPage: (n) => 'Continue from page ' + n,
    open: 'Open',
    pageOnlyEdition: 'Page-only edition',
    searchThisIssue: 'Search this issue',
    noMatches: 'No matches.',
    searchIndexing: 'Preparing articles for search…',
    premiumSearchNote: 'Premium article · Subscribe to read the full text.',
    noStoriesOnPage: 'No stories on this page.',
    noSavedYet: 'No saved articles yet.',
    bylineUnavailable: 'Byline unavailable',
    article: (n) => 'Article ' + n,
    savedArticleFallback: 'Saved article',
    unavailableInEdition: 'Unavailable in this edition',
    goToPageAria: (n) => 'Go to page ' + n,
    premiumLockedSuffix: ' (Premium, locked)',
    choosePageAria: 'Choose page',
    go: 'Go',
    noArticles: 'No articles',
    free: 'Free',
    premium: 'Premium',
    previousArticle: 'Previous article',
    nextArticle: 'Next article',
    shareSuccess: 'Article link copied or ready to share.',
    shareFail: 'Sharing was not available.',
    catalogLoadError: 'Could not load the edition catalog',
    issueLoadError: (key) => 'Could not load ' + key,
  },
};

export function t(key, ...args) {
  const entry = (T[state.lang] && T[state.lang][key] !== undefined) ? T[state.lang][key] : T.en[key];
  return typeof entry === 'function' ? entry(...args) : entry;
}

export function setLang(value) {
  state.lang = value === 'en' ? 'en' : 'kn';
  localStorage.setItem('reader-lang', state.lang);
  applyChrome();
  renderHeader();
  renderPageControls();
  renderArticleControls();
  renderListenPlayer();
  document.querySelectorAll('.article-content .access-status').forEach((el) => {
    const label = el.querySelector('.access-status-label');
    if (label) label.textContent = el.classList.contains('access-premium') ? t('premium') : t('free');
  });
  document.querySelectorAll('.gallery-title-text').forEach((el) => { el.textContent = t('gallery'); });
  document.querySelectorAll('.article-gallery-track').forEach((el) => el.setAttribute('aria-label', t('galleryImagesAria')));
  document.querySelectorAll('.article-content img[role="button"]').forEach((el) => el.setAttribute('aria-label', t('openArticleImageAria')));
  if (state.view === 'home' && state.issue) renderHome();
  if (state.panel) renderPanel();
}

// Static chrome text that index.html doesn't own dynamically (menus/panels do, via t() at render time).
export function applyChrome() {
  const set = (selector, fn) => document.querySelectorAll(selector).forEach(fn);
  document.documentElement.lang = state.lang;
  set('#offline-banner', (el) => { el.textContent = t('offline'); });
  set('#edition-button', (el) => el.setAttribute('aria-label', t('chooseEdition')));
  set('#share-fab', (el) => { el.setAttribute('aria-label', t('share')); el.title = t('share'); });
  set('#view-mode-toggle', (el) => el.setAttribute('aria-label', t('pageLayoutGroup')));
  set('[data-view-mode="single"]', (el) => { el.setAttribute('aria-label', t('singlePageView')); el.title = t('singlePage'); });
  set('[data-view-mode="double"]', (el) => { el.setAttribute('aria-label', t('doublePageView')); el.title = t('doublePage'); });
  set('[data-view-mode="scroll"]', (el) => { el.setAttribute('aria-label', t('scrollView')); el.title = t('continuousScroll'); });
  set('.subscribe-mobile-label, .subscribe-desktop-label, #text-subscribe-label, #sticky-subscribe-label', (el) => { el.textContent = t('subscribe'); });
  set('.account-button', (el) => el.setAttribute('aria-label', t('accountAria')));
  set('#menu-button, #text-menu-button', (el) => el.setAttribute('aria-label', t('menuAria')));
  set('#page-canvas', (el) => el.setAttribute('aria-label', t('magazinePageAria')));
  set('#previous-page', (el) => el.setAttribute('aria-label', t('previousPageAria')));
  set('#next-page', (el) => el.setAttribute('aria-label', t('nextPageAria')));
  set('.zoom-controls', (el) => el.setAttribute('aria-label', t('zoomControlsAria')));
  set('#zoom-out', (el) => el.setAttribute('aria-label', t('zoomOut')));
  set('#zoom-in', (el) => el.setAttribute('aria-label', t('zoomIn')));
  set('#zoom-reset', (el) => el.setAttribute('aria-label', t('resetZoom')));
  set('#swipe-hint', (el) => { el.textContent = t('swipeHint'); });
  set('#page-controls', (el) => el.setAttribute('aria-label', t('pageActionsAria')));
  set('#page-contents > span:last-child', (el) => { el.textContent = t('contents'); });
  set('#lightbox-title', (el) => { el.textContent = t('articleImageTitle'); });
  set('#lightbox-close', (el) => el.setAttribute('aria-label', t('closeImageViewerAria')));
  set('#lightbox-prev', (el) => el.setAttribute('aria-label', t('previousImageAria')));
  set('#lightbox-next', (el) => el.setAttribute('aria-label', t('nextImageAria')));
  set('#listen-player', (el) => el.setAttribute('aria-label', t('listenControlsAria')));
  set('#listen-progress', (el) => el.setAttribute('aria-label', t('speechProgressAria')));
  set('#listen-speed-label', (el) => { el.textContent = t('speed'); });
  set('#listen-rate', (el) => el.setAttribute('aria-label', t('speechSpeedAria')));
  set('#listen-stop', (el) => { el.textContent = t('stop'); });
  set('#article-controls', (el) => el.setAttribute('aria-label', t('articleActionsAria')));
  set('#article-font-smaller > span:last-child', (el) => { el.textContent = t('smaller'); });
  set('#article-font-larger > span:last-child', (el) => { el.textContent = t('larger'); });
  set('#article-share > span:last-child', (el) => { el.textContent = t('share'); });
  set('#close-panel', (el) => el.setAttribute('aria-label', t('closePanelAria')));
}
