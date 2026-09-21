const { createGesture } = require('./gesture');
function createBrowserPlatform() {
  const canvas = document.getElementById('game'), frame = document.getElementById('frame');
  let scroll = () => {}, gesture, pointerId = null;
  const controls = new Map();
  const updateHeight = () => document.documentElement.style.setProperty('--viewport-height', `${window.visualViewport ? window.visualViewport.height : window.innerHeight}px`);
  updateHeight();
  return {
    canvas,
    size() {
      const safe = getComputedStyle(document.getElementById('safe-area'));
      return { width: canvas.clientWidth, height: canvas.clientHeight, dpr: window.devicePixelRatio || 1,
        top: parseFloat(safe.paddingTop) || 0, bottom: parseFloat(safe.paddingBottom) || 0,
        left: parseFloat(safe.paddingLeft) || 0, right: parseFloat(safe.paddingRight) || 0 };
    },
    onScroll(handler) { scroll = handler; },
    onTap(handler) {
      gesture = createGesture(handler, (...args) => scroll(...args));
      const point = event => { const r = canvas.getBoundingClientRect(); return [event.clientX - r.left, event.clientY - r.top]; };
      frame.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        if (pointerId !== null) { gesture.cancel(); return; }
        pointerId = event.pointerId; gesture.start(...point(event)); frame.setPointerCapture(pointerId);
      });
      frame.addEventListener('pointermove', event => { if (event.pointerId === pointerId) gesture.move(...point(event)); });
      frame.addEventListener('pointerup', event => {
        if (event.pointerId !== pointerId) return;
        pointerId = null; gesture.end(...point(event));
      });
      const cancel = () => { pointerId = null; gesture.cancel(); };
      frame.addEventListener('pointercancel', cancel); frame.addEventListener('lostpointercapture', cancel);
      // Pointer taps go through the canvas hit regions. Keyboard/assistive clicks retain DOM buttons.
      frame.addEventListener('click', event => { if (event.detail > 0) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
      frame.addEventListener('wheel', event => {
        event.preventDefault(); scroll(event.deltaY * (event.deltaMode === 1 ? 20 : event.deltaMode === 2 ? canvas.clientHeight * .75 : 1));
      }, { passive: false });
      frame.addEventListener('keydown', event => {
        const step = canvas.clientHeight * .65;
        const deltas = { ArrowDown: 48, ArrowUp: -48, PageDown: step, PageUp: -step, Home: -1e6, End: 1e6 };
        if (deltas[event.key] !== undefined) { event.preventDefault(); scroll(deltas[event.key]); }
      });
    },
    onResize(handler) {
      const resized = () => { if (gesture) gesture.cancel(); updateHeight(); handler(); };
      window.addEventListener('resize', resized);
      if (window.visualViewport) window.visualViewport.addEventListener('resize', resized);
      if (typeof ResizeObserver !== 'undefined') new ResizeObserver(handler).observe(frame);
    },
    onHide(handler) { window.addEventListener('pagehide', () => { if (gesture) gesture.cancel(); handler(); }); },
    syncControls(targets) {
      const layer = document.getElementById('controls'), seen = new Set();
      targets.forEach((target, index) => {
        const key = `${target.label}:${index}`; seen.add(key);
        let button = controls.get(key);
        if (!button) { button = document.createElement('button'); button.type = 'button'; controls.set(key, button); layer.appendChild(button); }
        button.textContent = target.label; button.setAttribute('aria-label', target.label);
        button.setAttribute('aria-pressed', String(!!target.selected));
        Object.assign(button.style, { left: `${target.x}px`, top: `${target.y}px`, width: `${target.w}px`, height: `${target.h}px` });
        button.onclick = target.action;
      });
      for (const [key, button] of controls) if (!seen.has(key)) { button.remove(); controls.delete(key); }
    },
    read: key => localStorage.getItem(key), write: (key, value) => localStorage.setItem(key, value)
  };
}
module.exports = { createBrowserPlatform };
