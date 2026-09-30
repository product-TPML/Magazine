const savedTheme = localStorage.getItem('reader-theme');

export const state = {
  issueKey: currentIssueFromUrl(),
  catalog: null,
  issue: null,
  page: 0,
  view: 'page',
  articleId: null,
  panel: null,
  panelReturnFocus: null,
  lightbox: { open: false, index: 0, images: [], returnFocus: null },
  textSize: Math.max(0, Math.min(3, Number(localStorage.getItem('reader-text-size') || 0))),
  layout: initialLayout(),
  saved: safeJson('reader-saved', {}),
  theme: savedTheme === 'dark' ? 'dark' : (savedTheme === 'light' || savedTheme === 'sepia' ? 'light' : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')),
  zoom: { scale: 1, x: 0, y: 0 },
  speech: { status: 'idle', index: 0, sentences: [], voices: [], utterance: null, run: 0 },
  gesture: { pointers: new Map(), moved: false, startX: 0, startY: 0, lastX: 0, lastY: 0, velocityX: 0, lastTime: 0, pinch: null, movedUntil: 0, swipe: null },
  account: localStorage.getItem('reader-account') === 'subscriber' ? 'subscriber' : 'free',
  lang: localStorage.getItem('reader-lang') === 'en' ? 'en' : 'kn'
};

export const $ = (selector) => document.querySelector(selector);

export const appBase = new URL('../', import.meta.url);

export const pageCanvas = $('#page-canvas');

export const pageSpread = $('#page-spread');

export const pageZoomStage = $('#page-zoom-stage');

export const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

export const lightboxZoom = { scale: 1, x: 0, y: 0, pointers: new Map(), pinch: null };

export const preloadedPageImages = new Set();

// Layout math uses --header-height; keep it equal to the header's rendered height.
const appHeader = $('#app-header');

new ResizeObserver(() => { const height = appHeader.getBoundingClientRect().height; if (height) document.documentElement.style.setProperty('--header-height', height + 'px'); }).observe(appHeader);

function initialLayout() {
  const saved = localStorage.getItem('reader-page-layout');
  if (saved === 'single' || saved === 'double' || saved === 'scroll') return saved;
  return localStorage.getItem('reader-single-page') === 'true' ? 'single' : 'double';
}

function safeJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
}

export function currentIssueFromUrl() {
  const params = new URLSearchParams(location.search);
  return params.get('issue') || issueFromPath() || localStorage.getItem('reader-last-issue') || null;
}

export function issueFromPath(pathname = location.pathname) {
  const match = pathname.match(/^\/(sudha|mayura)\/(\d{4}-\d{2}-\d{2})\/read\/?$/i);
  if (!match) return null;
  return (match[1].toLowerCase() === 'mayura' ? 'MY' : 'SU') + '-' + match[2];
}

export function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value || '';
  return div.innerHTML;
}
