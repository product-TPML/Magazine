import { renderArticleControls, renderHeader, renderViewState } from './chrome.js';
import { $, escapeHtml, state } from './core.js';
import { t } from './i18n.js';
import { icon } from './icons.js';
import { bindImageZoom } from './imagezoom.js';
import { accessClass, appPath, articleAccess, articleHref, articlesForPage, currentArticle, isPaidArticle, issuePath, needsPreview, pageHref, publication } from './issue.js';
import { closeLightbox } from './lightbox.js';
import { loadArticleMeta, renderArticleMetaFromHtml } from './loader.js';
import { resetZoom } from './pages.js';
import { savePosition, updateUrl } from './prefs.js';
import { prepareSpeech, renderListenPlayer, stopSpeech } from './speech.js';

export async function openArticle(articleId, { push = true } = {}) {
  const article = state.issue.articles[String(articleId)];
  if (!article) return;
  closeLightbox({ restore: false });
  stopSpeech();
  resetZoom();
  await loadArticleMeta([article.id, article.previous, article.next].filter(Boolean));
  state.articleId = String(article.id);
  state.page = article.pageIndex;
  state.view = 'text';
  state.issue.lastOpened ||= {};
  state.issue.lastOpened[state.page] = state.articleId;
  savePosition();
  updateUrl(push);
  renderViewState();
  renderHeader();
  $('#article-content').innerHTML = '<p class="loading">Loading article…</p>';
  $('#article-scroll').scrollTop = 0;
  try {
    const response = await fetch(issuePath('articles/' + article.id + '.html'));
    if (!response.ok) throw new Error('Article unavailable');
    const html = await response.text();
    // ponytail: normalize word-count access classification once full metadata is available
    if (!article.plainText) {
      try { Object.assign(article, renderArticleMetaFromHtml(article.id, html)); } catch { /* keep fallback */ }
    }
    const preview = needsPreview(article);
    $('#article-content').innerHTML = preview ? articlePreviewMarkup(html, article) : articleMarkup(html, article);
    prepareSpeech();
    bindImageZoom();
    renderArticleFooterCards();
  } catch (error) {
    $('#article-content').innerHTML = '<p role="alert">Could not load this article.</p>';
    console.error(error);
  }
  renderHeader();
  renderArticleControls();
  renderListenPlayer();
}

function sanitizeArticleRoot(html, article) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, iframe, form, [style*="display:none"], .adPlaceholder').forEach((node) => node.remove());
  doc.querySelectorAll('*').forEach((node) => {
    if (node.getAttribute('style')?.includes('background')) node.classList.add('article-recipe');
    node.removeAttribute('style');
    [...node.attributes].forEach((attribute) => {
      if (attribute.name.toLowerCase().startsWith('on')) node.removeAttribute(attribute.name);
    });
  });
  doc.querySelectorAll('img').forEach((image) => {
    const filename = image.getAttribute('src')?.split('/').pop();
    if (filename) image.src = issuePath('media/' + filename);
    image.removeAttribute('style');
    image.loading = 'lazy';
    image.classList.add('zoomable');
  });
  doc.querySelectorAll('a').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (href && !/^(https?:|mailto:|#)/i.test(href)) link.removeAttribute('href');
  });
  return doc;
}

// Feeds the blurred, darkened photo behind a figure's caption (see .article-figure::before in styles.css).
function photoUrl(src) {
  return 'url("' + String(src || '').replace(/["\\\n]/g, encodeURIComponent) + '")';
}

function makeFigure(doc, picture, className) {
  const figure = doc.createElement('figure');
  figure.className = className;
  const image = picture.querySelector('img');
  const caption = picture.querySelector('.caption');
  const credit = picture.querySelector('.credit');
  if (image) {
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    image.setAttribute('aria-label', t('openArticleImageAria'));
    figure.style.setProperty('--photo', photoUrl(image.getAttribute('src')));
    figure.append(image);
  }
  if (caption?.textContent.trim()) {
    const figcaption = doc.createElement('figcaption');
    figcaption.className = 'article-caption';
    figcaption.innerHTML = caption.innerHTML;
    figure.append(figcaption);
  }
  if (credit?.textContent.trim()) {
    const small = doc.createElement('small');
    small.className = 'article-credit';
    small.innerHTML = credit.innerHTML;
    figure.append(small);
  }
  return figure;
}

// Gallery carousel shared by the full article and the paywall preview, so every reader sees it.
function makeGallery(doc, pictures) {
  if (!pictures.length) return null;
  const gallery = doc.createElement('section');
  gallery.className = 'article-gallery';
  gallery.setAttribute('aria-labelledby', 'article-gallery-title');
  const title = doc.createElement('h2');
  title.id = 'article-gallery-title';
  title.textContent = t('gallery');
  const track = doc.createElement('div');
  track.className = 'article-gallery-track';
  track.setAttribute('role', 'list');
  track.setAttribute('aria-label', t('galleryImagesAria'));
  gallery.append(title, track);
  pictures.forEach((picture) => {
    const figure = makeFigure(doc, picture, 'article-figure article-gallery-item');
    figure.setAttribute('role', 'listitem');
    track.append(figure);
  });
  return gallery;
}

function articlePreviewMarkup(html, article) {
  // ponytail: build preview from sanitized text + hero and gallery figures only; never render full root and hide it
  const doc = sanitizeArticleRoot(html, article);
  const root = doc.querySelector('.articleDetail') || doc.body;
  const extractedTitle = doc.querySelector('h1 p, h1')?.textContent.trim();
  const pictures = [...root.querySelectorAll('.pictures > .picture')];
  const hero = pictures[0] || null;
  // ponytail: count bodytext only when present; unclassed paragraphs are fallback, never captions/bylines/siblings
  const body = root.querySelector('.bodytext');
  const scope = body || root;
  const paras = [...scope.querySelectorAll(body ? 'p' : 'p:not([class])')]
    .filter((p) => !p.closest('.pictures') && !p.classList.contains('byline') && !p.classList.contains('caption'))
    .map((p) => p.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const words = paras.join(' ').split(/\s+/).filter(Boolean).slice(0, 100);
  const title = '<h1>' + escapeHtml(article.title || extractedTitle || 'Article ' + article.id) + '</h1>';
  const meta = [article.byline, article.section].filter(Boolean).map(escapeHtml).join(' · ');
  const heroFigure = hero ? makeFigure(doc, hero, 'article-figure article-hero') : null;
  const loosePictures = [...root.querySelectorAll('img')].filter((image) => !image.closest('.pictures')).map((image) => {
    const picture = doc.createElement('div');
    picture.append(image);
    return picture;
  });
  const gallery = makeGallery(doc, pictures.slice(1).concat(loosePictures));
  const figure = (heroFigure ? heroFigure.outerHTML : '') + (gallery ? gallery.outerHTML : '');
  const previous = article.previous ? '<a href="' + articleHref(article.previous) + '" data-article-link="' + article.previous + '">' + icon('back') + 'Previous article</a>' : '<span></span>';
  const next = article.next ? '<a href="' + articleHref(article.next) + '" data-article-link="' + article.next + '">Next article' + icon('forward') + '</a>' : '<span></span>';
  const footer = '<footer class="article-footer">' + previous + '<a class="original-page" href="' + pageHref(article.pageIndex) + '" data-page-link="' + article.pageIndex + '">View original page · Page ' + (article.pageIndex + 1) + '</a>' + next + '</footer>';
  return '<p class="access-status access-' + accessClass(article) + '">' + articleAccess(article) + '</p>' + title + (meta ? '<p class="byline">' + meta + '</p>' : '') + figure + '<p class="paywall-preview">' + escapeHtml(words.join(' ')) + '…</p>' + paywallMarkup() + footer;
}

function paywallCopy() {
  return publication(state.issue.key) === 'MY'
    ? { title: 'ಮಯೂರ ಚಂದಾದಾರರಿಗೆ ಪ್ರತಿ ತಿಂಗಳು ಕಥೆ, ಕವನ, ಪ್ರಬಂಧಗಳ ಪೂರ್ಣ ಸಂಚಿಕೆ ಈಗ ಪ್ರೀಮಿಯಂನಲ್ಲಿ!', lede: 'ಒಂದು ಚಂದಾದಾರಿಕೆ → ಮಯೂರ ಮಾಸಪತ್ರಿಕೆಯ ಪ್ರತಿ ಸಂಚಿಕೆಗೆ ಅನಿಯಮಿತ ಪ್ರವೇಶ.' }
    : { title: 'ಸುಧಾ ಚಂದಾದಾರರಿಗೆ ಪ್ರತಿ ವಾರ ಕಥೆ, ಧಾರಾವಾಹಿ, ಲೇಖನಗಳ ಪೂರ್ಣ ಓದು ಈಗ ಪ್ರೀಮಿಯಂನಲ್ಲಿ!', lede: 'ಒಂದು ಚಂದಾದಾರಿಕೆ → ಸುಧಾ ವಾರಪತ್ರಿಕೆಯ ಪ್ರತಿ ಸಂಚಿಕೆಗೆ ಅನಿಯಮಿತ ಪ್ರವೇಶ.' };
}

function paywallActionsMarkup() {
  return '<button class="paywall-cta" type="button"><span class="premium-icon" aria-hidden="true"></span><span>ಈಗ ಚಂದಾದಾರರಾಗಿ</span></button>'
    + '<p class="paywall-login">ಈಗಾಗಲೇ ಸದಸ್ಯರೇ? <button class="paywall-login-button" type="button"><span>ಲಾಗಿನ್ ಮಾಡಿ</span><img src="' + appPath('Assets/icon-login-arrow.svg') + '" alt=""></button></p>';
}

export function paywallMarkup() {
  const benefit = (file, text) => '<li><img src="' + appPath('Assets/' + file) + '" alt=""><span>' + text + '</span></li>';
  const copy = paywallCopy();
  return '<section class="paywall" aria-label="Subscribe to continue reading">'
    + '<img class="paywall-watermark" src="' + appPath('Assets/pv-nandi-watermark.svg') + '" alt="" aria-hidden="true">'
    + '<h2 class="paywall-title">' + copy.title + '</h2>'
    + '<p class="paywall-lede">' + copy.lede + '</p>'
    + '<ul class="paywall-benefits">'
    + benefit('icon-premium-stories.svg', 'ಎಲ್ಲಾ ಪ್ರೀಮಿಯಂ ಲೇಖನಗಳ ಪೂರ್ಣ ಓದು')
    + benefit('icon-epaper.svg', 'ಹಿಂದಿನ ಎಲ್ಲಾ ಸಂಚಿಕೆಗಳ ಇ-ಆವೃತ್ತಿ')
    + benefit('icon-ad-lite.svg', 'ಜಾಹೀರಾತು - ಲೈಟ್ ಅನುಭವ')
    + '</ul>'
    + paywallActionsMarkup()
    + '</section>';
}

export function lockedPageMarkup(index) {
  const copy = paywallCopy();
  const free = articlesForPage(index).filter((article) => !isPaidArticle(article));
  const freeList = free.length
    ? '<div class="locked-free"><span>ಉಚಿತವಾಗಿ ಓದಿ:</span>' + free.map((article) => '<button class="locked-free-article" type="button" data-article="' + article.id + '">' + escapeHtml(article.title || 'Article ' + article.id) + '</button>').join('') + '</div>'
    : '';
  return '<div class="locked-page"><section class="locked-page-card" aria-label="Page ' + (index + 1) + ' is for subscribers">'
    + '<span class="locked-chip">' + icon('lock') + 'ಪ್ರೀಮಿಯಂ ಪುಟ</span>'
    + '<h2 class="locked-title">' + copy.title + '</h2>'
    + '<p class="locked-lede">' + copy.lede + '</p>'
    + paywallActionsMarkup() + freeList
    + '</section></div>';
}

function articleMarkup(html, article) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, iframe, form, [style*="display:none"], .adPlaceholder').forEach((node) => node.remove());
  doc.querySelectorAll('*').forEach((node) => {
    if (node.getAttribute('style')?.includes('background')) node.classList.add('article-recipe');
    node.removeAttribute('style');
    [...node.attributes].forEach((attribute) => {
      if (attribute.name.toLowerCase().startsWith('on')) node.removeAttribute(attribute.name);
    });
  });
  doc.querySelectorAll('img').forEach((image) => {
    const filename = image.getAttribute('src')?.split('/').pop();
    if (filename) image.src = issuePath('media/' + filename);
    image.removeAttribute('style');
    image.loading = 'lazy';
    image.classList.add('zoomable');
  });
  doc.querySelectorAll('a').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (href && !/^(https?:|mailto:|#)/i.test(href)) link.removeAttribute('href');
  });
  const root = doc.querySelector('.articleDetail') || doc.body;
  const extractedTitle = doc.querySelector('h1 p, h1')?.textContent.trim();
  root.querySelector('h1')?.remove();
  root.querySelector('.byline')?.remove();
  root.querySelectorAll('p').forEach((paragraph) => {
    if (paragraph.querySelector('i')) paragraph.remove();
  });
  root.querySelectorAll('p').forEach((paragraph) => {
    if (!paragraph.textContent.trim() && !paragraph.querySelector('img')) paragraph.remove();
  });
  const pictures = [...root.querySelectorAll('.pictures > .picture')];
  root.querySelector('.pictures')?.remove();
  const loosePictures = [...root.querySelectorAll('img')].map((image) => {
    const picture = doc.createElement('div');
    picture.append(image);
    return picture;
  });
  root.querySelectorAll('p').forEach((paragraph) => {
    if (!paragraph.textContent.trim() && !paragraph.querySelector('img')) paragraph.remove();
  });
  const hero = pictures.shift();
  const galleryPictures = pictures.concat(loosePictures);
  const gallery = makeGallery(doc, galleryPictures);
  if (hero) {
    const figure = makeFigure(doc, hero, 'article-figure article-hero');
    const first = root.firstElementChild;
    if (first) root.insertBefore(figure, first);
    else root.append(figure);
    if (gallery) figure.after(gallery);
  } else if (gallery) {
    const first = root.firstElementChild;
    if (first) root.insertBefore(gallery, first);
    else root.append(gallery);
  }
  root.querySelectorAll('p').forEach((paragraph) => {
    if (!/^\s*l\s+/i.test(paragraph.textContent)) return;
    paragraph.classList.add('article-bullet');
    const firstText = [...paragraph.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
    if (firstText) firstText.nodeValue = firstText.nodeValue.replace(/^\s*l\s+/i, '');
  });
  const title = '<h1>' + escapeHtml(article.title || extractedTitle || 'Article ' + article.id) + '</h1>';
  const meta = [article.byline, article.section].filter(Boolean).map(escapeHtml).join(' · ');
  const previous = article.previous ? '<a href="' + articleHref(article.previous) + '" data-article-link="' + article.previous + '">' + icon('back') + 'Previous article</a>' : '<span></span>';
  const next = article.next ? '<a href="' + articleHref(article.next) + '" data-article-link="' + article.next + '">Next article' + icon('forward') + '</a>' : '<span></span>';
  const footer = '<footer class="article-footer">' + previous + '<a class="original-page" href="' + pageHref(article.pageIndex) + '" data-page-link="' + article.pageIndex + '">View original page · Page ' + (article.pageIndex + 1) + '</a>' + next + '</footer>';
  return '<p class="access-status access-' + accessClass(article) + '">' + articleAccess(article) + '</p>' + title + (meta ? '<p class="byline">' + meta + '</p>' : '') + root.innerHTML + footer;
}

function renderArticleFooterCards() {
  const article = currentArticle();
  if (!article) return;
  document.querySelectorAll('#article-content .article-footer').forEach((footer) => {
    footer.querySelector('.original-page')?.remove();
    footer.querySelectorAll(':scope > span').forEach((placeholder) => placeholder.remove());
    footer.hidden = !footer.querySelector('a[data-article-link]');
  });
  document.querySelectorAll('#article-content .article-footer a[data-article-link]').forEach((link) => {
    const id = link.dataset.articleLink;
    const target = state.issue.articles[String(id)];
    const previous = String(id) === String(article.previous);
    link.className = 'article-nav article-nav-' + (previous ? 'previous' : 'next');
    link.innerHTML = '<span class="article-nav-direction">' + (previous ? icon('back') + t('previousArticle') : t('nextArticle') + icon('forward')) + '</span><strong>' + escapeHtml(target?.title || t('article', '')) + '</strong>' + (target?.byline ? '<small>' + escapeHtml(target.byline) + '</small>' : '');
  });
  document.querySelectorAll('#article-content .article-footer').forEach((footer) => {
    const next = footer.querySelector('.article-nav-next');
    if (next) footer.prepend(next);
  });
}
