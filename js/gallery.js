import { $ } from './core.js';

let galleryDrag = null;

let galleryDragUntil = 0;
export const wasGalleryDragged = () => performance.now() < galleryDragUntil;

$('#article-content').addEventListener('pointerdown', (event) => {
  const track = event.target.closest('.article-gallery-track');
  if (!track || event.pointerType !== 'mouse' || event.button !== 0) return;
  galleryDrag = { track, startX: event.clientX, startScroll: track.scrollLeft, moved: false };
});

window.addEventListener('pointermove', (event) => {
  if (!galleryDrag) return;
  const dx = event.clientX - galleryDrag.startX;
  if (!galleryDrag.moved && Math.abs(dx) < 5) return;
  if (!galleryDrag.moved) { galleryDrag.moved = true; galleryDrag.track.classList.add('is-dragging'); }
  galleryDrag.track.scrollLeft = galleryDrag.startScroll - dx;
});

const endGalleryDrag = () => {
  if (!galleryDrag) return;
  const { track, moved } = galleryDrag;
  galleryDrag = null;
  if (!moved) return;
  galleryDragUntil = performance.now() + 250;
  const before = track.scrollLeft;
  track.classList.remove('is-dragging');
  track.scrollTo({ left: before, behavior: 'auto' });
};

window.addEventListener('pointerup', endGalleryDrag);

window.addEventListener('pointercancel', endGalleryDrag);

$('#article-content').addEventListener('dragstart', (event) => { if (event.target.closest('.article-gallery-track')) event.preventDefault(); });
