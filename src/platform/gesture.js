// Shared drag threshold prevents a swipe that ends on an option from choosing it.
function createGesture(onTap, onScroll, timing = {}) {
  const frame = timing.frame || (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : null);
  const now = timing.now || Date.now;
  let generation = 0, velocity = 0, lastTime = 0;
  function coast(x, y) {
    if (!frame || Math.abs(velocity) < 0.08) return;
    const token = generation; let previous = now(), elapsed = 0;
    const step = () => {
      if (token !== generation) return;
      const current = now(), dt = Math.min(32, Math.max(1, current - previous));
      previous = current; elapsed += dt;
      velocity *= Math.exp(-dt / 180);
      if (elapsed > 700 || Math.abs(velocity) < 0.03) return;
      if (onScroll(velocity * dt, x, y) !== false) frame(step);
    };
    frame(step);
  }
  let start = null, last = null, moved = false;
  return {
    start(x, y) { generation++; velocity = 0; lastTime = now(); start = last = { x, y }; moved = false; },
    move(x, y) {
      if (!start) return;
      const wasMoved = moved;
      moved = moved || Math.hypot(x - start.x, y - start.y) > 8;
      const current = now(), dt = Math.max(8, current - lastTime);
      if (moved) {
        const delta = (wasMoved ? last.y : start.y) - y;
        velocity = Math.max(-2.5, Math.min(2.5, delta / dt));
        onScroll(delta, start.x, start.y);
      }
      lastTime = current;
      last = { x, y };
    },
    end(x, y) {
      if (!start) return;
      const tapped = !moved && Math.hypot(x - start.x, y - start.y) <= 8;
      if (moved && now() - lastTime < 80) coast(start.x, start.y);
      start = last = null;
      if (tapped) onTap(x, y);
    },
    cancel() { generation++; velocity = 0; start = last = null; moved = false; }
  };
}
module.exports = { createGesture };
