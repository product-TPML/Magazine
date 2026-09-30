import { $, lightboxZoom, state } from './core.js';

function renderLightbox() {
  const item = state.lightbox.images[state.lightbox.index];
  if (!item) return;
  $('#lightbox-image').src = item.src;
  $('#lightbox-image').alt = item.alt;
  $('#lightbox-caption').textContent = item.caption;
  $('#lightbox-counter').textContent = (state.lightbox.index + 1) + ' / ' + state.lightbox.images.length;
  $('#lightbox-prev').disabled = state.lightbox.images.length < 2;
  $('#lightbox-next').disabled = state.lightbox.images.length < 2;
  resetLightboxZoom();
}

export function renderLightboxZoom() {
  $('#lightbox-image').style.transform = 'translate3d(' + lightboxZoom.x + 'px, ' + lightboxZoom.y + 'px, 0) scale(' + lightboxZoom.scale + ')';
  $('#lightbox-image').classList.toggle('is-zoomed', lightboxZoom.scale > 1);
}

function resetLightboxZoom() {
  lightboxZoom.scale = 1;
  lightboxZoom.x = 0;
  lightboxZoom.y = 0;
  lightboxZoom.pointers.clear();
  lightboxZoom.pinch = null;
  renderLightboxZoom();
}

function setLightboxInert(inert) {
  document.querySelectorAll('#app-header, main, #article-controls, #listen-player').forEach((element) => { element.inert = inert; });
}

export function openLightbox(index) {
  const images = [...document.querySelectorAll('#article-content .article-figure img')].map((image) => ({
    src: image.currentSrc || image.src,
    alt: image.alt || '',
    caption: image.closest('figure')?.querySelector('.article-caption')?.textContent.trim() || ''
  }));
  if (!images.length) return;
  state.lightbox = { open: true, index: Math.max(0, Math.min(index, images.length - 1)), images, returnFocus: document.activeElement };
  renderLightbox();
  $('#image-lightbox').hidden = false;
  document.body.classList.add('lightbox-open');
  setLightboxInert(true);
  $('#lightbox-close').focus();
}

export function closeLightbox({ restore = true } = {}) {
  if (!state.lightbox.open) return;
  const trigger = state.lightbox.returnFocus;
  state.lightbox = { open: false, index: 0, images: [], returnFocus: null };
  $('#image-lightbox').hidden = true;
  document.body.classList.remove('lightbox-open');
  setLightboxInert(false);
  if (restore && trigger && document.contains(trigger)) trigger.focus();
}

export function moveLightbox(delta) {
  if (!state.lightbox.open || state.lightbox.images.length < 2) return;
  state.lightbox.index = (state.lightbox.index + delta + state.lightbox.images.length) % state.lightbox.images.length;
  renderLightbox();
}
