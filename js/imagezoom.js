function clampImageZoom(zoom, image) {
  const limitX = Math.max(0, (image.clientWidth * (zoom.scale - 1)) / 2);
  const limitY = Math.max(0, (image.clientHeight * (zoom.scale - 1)) / 2);
  zoom.x = Math.max(-limitX, Math.min(limitX, zoom.x));
  zoom.y = Math.max(-limitY, Math.min(limitY, zoom.y));
}

export function bindImageZoom() {
  document.querySelectorAll('#article-content img.zoomable').forEach((image) => {
    const zoom = { scale: 1, x: 0, y: 0, pointers: new Map(), pinch: null, moved: false, startX: 0, startY: 0, movedUntil: 0 };
    const apply = () => { image.style.transform = 'translate3d(' + zoom.x + 'px, ' + zoom.y + 'px, 0) scale(' + zoom.scale + ')'; image.classList.toggle('is-image-zoomed', zoom.scale > 1); image.style.touchAction = zoom.scale > 1 ? 'none' : 'pan-y'; };
    apply();
    image.addEventListener('pointerdown', (event) => {
      zoom.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      zoom.moved = false;
      zoom.startX = event.clientX;
      zoom.startY = event.clientY;
      if (zoom.pointers.size === 1 && zoom.scale <= 1) {
        try { if (image.hasPointerCapture(event.pointerId)) image.releasePointerCapture(event.pointerId); } catch { /* no capture held */ }
        return;
      }
      if (zoom.pointers.size === 2) {
        const points = [...zoom.pointers.values()];
        zoom.pinch = { distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) || 1, scale: zoom.scale };
      }
    });
    image.addEventListener('pointermove', (event) => {
      if (!zoom.pointers.has(event.pointerId)) return;
      zoom.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (Math.hypot(event.clientX - zoom.startX, event.clientY - zoom.startY) > 8) zoom.moved = true;
      if (zoom.pointers.size === 2 && zoom.pinch) {
        event.preventDefault();
        const points = [...zoom.pointers.values()];
        zoom.scale = Math.max(1, Math.min(4, zoom.pinch.scale * Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) / zoom.pinch.distance));
        clampImageZoom(zoom, image);
        apply();
      } else if (zoom.pointers.size === 1 && zoom.scale > 1) {
        event.preventDefault();
        zoom.x += event.movementX || 0;
        zoom.y += event.movementY || 0;
        clampImageZoom(zoom, image);
        apply();
      }
    });
    const end = (event) => {
      zoom.pointers.delete(event.pointerId);
      if (zoom.pointers.size < 2) zoom.pinch = null;
      try { if (image.hasPointerCapture(event.pointerId)) image.releasePointerCapture(event.pointerId); } catch { /* no capture held */ }
      if (zoom.moved) zoom.movedUntil = performance.now() + 300;
      if (!zoom.pointers.size) { zoom.moved = false; }
    };
    image.addEventListener('pointerup', end);
    image.addEventListener('pointercancel', end);
    image.addEventListener('pointerleave', () => { zoom.pointers.clear(); zoom.pinch = null; });
    image.addEventListener('blur', () => { zoom.pointers.clear(); zoom.pinch = null; });
    image._imageZoom = zoom;
  });
}
