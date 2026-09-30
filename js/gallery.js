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

// "2 / 6" position cue in the gallery heading; scroll events don't bubble, so listen in the capture phase.
let galleryCountFrame = 0;
$('#article-content').addEventListener('scroll', (event) => {
  const track = event.target;
  if (!track.classList?.contains('article-gallery-track') || galleryCountFrame) return;
  galleryCountFrame = requestAnimationFrame(() => {
    galleryCountFrame = 0;
    const items = [...track.children];
    const left = track.scrollLeft + track.clientWidth / 2;
    let index = items.findIndex((item) => item.offsetLeft + item.offsetWidth > left);
    if (index < 0) index = items.length - 1;
    const count = track.closest('.article-gallery')?.querySelector('.gallery-count');
    if (count) count.textContent = (index + 1) + ' / ' + items.length;
  });
}, true);
