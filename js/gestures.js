import { openArticle } from './article.js';
import { setControlsVisible, useScroll, useSnap, useSpread } from './chrome.js';
import { pageCanvas, pageSpread, prefersReducedMotion, state } from './core.js';
import { t } from './i18n.js';
import { isPageLocked, pageImageSrc } from './issue.js';
import { maxPageZoom, renderZoom, setPage, setZoom } from './pages.js';

export function setupPageGestures() {
  const clearSwipePreview = () => {
    if (!state.gesture.swipe) return;
    pageSpread.classList.remove('page-dragging', 'page-settling');
    pageSpread.querySelector('.page-swipe-preview')?.remove();
    const current = pageSpread.querySelector('.page-slot');
    if (current) current.style.transform = '';
    state.gesture.swipe = null;
  };
  const settleSwipe = (commit) => {
    const swipe = state.gesture.swipe;
    if (!swipe) return false;
    if (commit) { clearSwipePreview(); setPage(swipe.page); return true; }
    pageSpread.classList.remove('page-dragging');
    pageSpread.classList.add('page-settling');
    const current = pageSpread.querySelector('.page-slot');
    const preview = pageSpread.querySelector('.page-swipe-preview');
    if (current) current.style.transform = 'translate3d(0, 0, 0)';
    if (preview) preview.style.transform = 'translate3d(' + (swipe.direction * pageCanvas.clientWidth) + 'px, 0, 0)';
    const finish = () => { pageSpread.removeEventListener('transitionend', finish); clearSwipePreview(); };
    if (prefersReducedMotion.matches) finish();
    else pageSpread.addEventListener('transitionend', finish, { once: true });
    return false;
  };
  const beginSwipe = (direction) => {
    if (useSpread() || state.zoom.scale > 1.01 || state.gesture.swipe) return;
    const page = direction < 0 ? nextPageIndex() : previousPageIndex();
    if (page < 0 || page >= state.issue.pages.length) return;
    const current = pageSpread.querySelector('.page-slot');
    if (!current) return;
    const preview = current.cloneNode(true);
    preview.classList.add('page-swipe-preview');
    preview.querySelectorAll('.hotspot').forEach((hotspot) => hotspot.remove());
    const image = preview.querySelector('img');
    image.alt = t('page', page + 1);
    preview.querySelector('.locked-page')?.remove();
    preview.classList.toggle('is-locked', isPageLocked(page));
    image.src = pageImageSrc(page);
    pageSpread.append(preview);
    state.gesture.swipe = { direction, page };
    pageSpread.classList.add('page-dragging');
    preview.style.transform = 'translate3d(' + (-direction * pageCanvas.clientWidth) + 'px, 0, 0)';
  };
  const updateSwipe = (distance) => {
    const swipe = state.gesture.swipe;
    if (!swipe) return;
    const width = pageCanvas.clientWidth;
    const travel = Math.max(-width, Math.min(width, distance));
    const current = pageSpread.querySelector('.page-slot:not(.page-swipe-preview)');
    const preview = pageSpread.querySelector('.page-swipe-preview');
    if (current) current.style.transform = 'translate3d(' + travel + 'px, 0, 0)';
    if (preview) preview.style.transform = 'translate3d(' + (travel - swipe.direction * width) + 'px, 0, 0)';
  };
  pageCanvas.addEventListener('pointerdown', (event) => {
    if (state.view !== 'page' || useScroll() || event.target.closest('.zoom-controls, .swipe-hint, .canvas-nav, .locked-page-card')) return;
    state.gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    state.gesture.startX = event.clientX;
    state.gesture.startY = event.clientY;
    state.gesture.lastX = event.clientX;
    state.gesture.lastY = event.clientY;
    state.gesture.velocityX = 0;
    state.gesture.lastTime = event.timeStamp || performance.now();
    state.gesture.moved = false;
    state.gesture.hotspot = event.target.closest('.hotspot');
    pageCanvas.setPointerCapture(event.pointerId);
    if (state.gesture.pointers.size === 2) {
      clearSwipePreview();
      const points = [...state.gesture.pointers.values()];
      const bounds = pageCanvas.getBoundingClientRect();
      state.gesture.pinch = { distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) || 1, scale: state.zoom.scale, x: state.zoom.x, y: state.zoom.y, center: { x: (points[0].x + points[1].x) / 2 - bounds.left, y: (points[0].y + points[1].y) / 2 - bounds.top } };
    }
  });
  pageCanvas.addEventListener('pointermove', (event) => {
    if (!state.gesture.pointers.has(event.pointerId)) return;
    event.preventDefault();
    state.gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const dx = event.clientX - state.gesture.lastX;
    const dy = event.clientY - state.gesture.lastY;
    const now = event.timeStamp || performance.now();
    state.gesture.lastX = event.clientX;
    state.gesture.lastY = event.clientY;
    state.gesture.velocityX = dx / Math.max(1, now - state.gesture.lastTime);
    state.gesture.lastTime = now;
    if (state.gesture.pointers.size === 2 && state.gesture.pinch) {
      const points = [...state.gesture.pointers.values()];
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const bounds = pageCanvas.getBoundingClientRect();
      const center = { x: (points[0].x + points[1].x) / 2 - bounds.left, y: (points[0].y + points[1].y) / 2 - bounds.top };
      const pinch = state.gesture.pinch;
      state.zoom.scale = Math.max(1, Math.min(maxPageZoom(), pinch.scale * distance / pinch.distance));
      const ratio = state.zoom.scale / pinch.scale;
      state.zoom.x = (pinch.x - (pinch.center.x - bounds.width / 2)) * ratio + (pinch.center.x - bounds.width / 2) + center.x - pinch.center.x;
      state.zoom.y = (pinch.y - (pinch.center.y - bounds.height / 2)) * ratio + (pinch.center.y - bounds.height / 2) + center.y - pinch.center.y;
      renderZoom();
      state.gesture.moved = true;
    } else if (state.zoom.scale > 1) {
      state.zoom.x += dx;
      state.zoom.y += dy;
      state.gesture.moved = true;
      renderZoom();
    } else {
      const distance = event.clientX - state.gesture.startX;
      const vertical = event.clientY - state.gesture.startY;
      if (Math.hypot(distance, vertical) > 8) state.gesture.moved = true;
      if (Math.abs(distance) > 8 && Math.abs(distance) > Math.abs(vertical) * 1.15) {
        if (!state.gesture.swipe) beginSwipe(distance < 0 ? -1 : 1);
        if (state.gesture.swipe) updateSwipe(distance);
      }
    }
  });
  const end = (event) => {
    if (!state.gesture.pointers.has(event.pointerId)) return;
    const delta = event.clientX - state.gesture.startX;
    const wasPinching = state.gesture.pointers.size > 1;
    const hotspot = state.gesture.hotspot;
    state.gesture.pointers.delete(event.pointerId);
    state.gesture.hotspot = null;
    if (state.gesture.pointers.size < 2) state.gesture.pinch = null;
    if (wasPinching || state.gesture.pointers.size) return;
    if (!state.gesture.moved && hotspot && state.zoom.scale <= 1.01) {
      state.gesture.movedUntil = performance.now() + 180;
      if (hotspot.dataset.tocTarget) setPage(Number(hotspot.dataset.tocTarget) - 1, { push: true });
      else openArticle(hotspot.dataset.article);
      return;
    }
    state.gesture.movedUntil = state.gesture.moved ? performance.now() + 180 : 0;
    if (state.zoom.scale <= 1.01 && state.gesture.swipe) {
      const threshold = Math.max(50, pageCanvas.clientWidth * .2);
      if (settleSwipe(Math.abs(delta) > threshold || Math.abs(state.gesture.velocityX) > .7)) return;
    } else if (state.zoom.scale <= 1.01 && Math.abs(delta) > 50) {
      setPage(state.page + (delta < 0 ? (useSpread() ? (state.page === 0 ? 1 : 2) : 1) : -(useSpread() ? (state.page === 1 ? 1 : 2) : 1)));
      return;
    }
    if (!state.gesture.moved && !event.target.closest('.hotspot, .canvas-nav, .zoom-controls')) setControlsVisible(document.body.classList.contains('chrome-hidden'));
  };
  pageCanvas.addEventListener('pointerup', end);
  const cancel = (event) => {
    if (!state.gesture.pointers.has(event.pointerId)) return;
    state.gesture.pointers.clear();
    state.gesture.pinch = null;
    state.gesture.hotspot = null;
    state.gesture.moved = true;
    state.gesture.movedUntil = performance.now() + 180;
    if (state.gesture.swipe) clearSwipePreview();
    pageSpread.classList.remove('page-dragging', 'page-settling');
    pageSpread.querySelector('.page-swipe-preview')?.remove();
    const current = pageSpread.querySelector('.page-slot');
    if (current) current.style.transform = '';
  };
  pageCanvas.addEventListener('pointercancel', cancel);
  pageCanvas.addEventListener('lostpointercapture', cancel);
  pageCanvas.addEventListener('click', (event) => {
    if (!useSnap() || state.view !== 'page' || event.target.closest('.hotspot, .canvas-nav, .zoom-controls, .locked-page-card')) return;
    setControlsVisible(document.body.classList.contains('chrome-hidden'));
  });
  pageCanvas.addEventListener('wheel', (event) => {
    if (useScroll() || !(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    const bounds = pageCanvas.getBoundingClientRect();
    setZoom(state.zoom.scale + (event.deltaY < 0 ? .25 : -.25), event.clientX - bounds.left, event.clientY - bounds.top);
  }, { passive: false });
}

export function previousPageIndex() { return !useSpread() ? state.page - 1 : state.page === 1 ? 0 : state.page - 2; }

export function nextPageIndex() { return !useSpread() ? state.page + 1 : state.page === 0 ? 1 : state.page + 2; }
