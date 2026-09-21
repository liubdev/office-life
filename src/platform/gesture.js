// Shared drag threshold prevents a swipe that ends on an option from choosing it.
function createGesture(onTap, onScroll) {
  let start = null, last = null, moved = false;
  return {
    start(x, y) { start = last = { x, y }; moved = false; },
    move(x, y) {
      if (!start) return;
      const wasMoved = moved;
      moved = moved || Math.hypot(x - start.x, y - start.y) > 8;
      if (moved) onScroll((wasMoved ? last.y : start.y) - y, start.x, start.y);
      last = { x, y };
    },
    end(x, y) {
      if (!start) return;
      const tapped = !moved && Math.hypot(x - start.x, y - start.y) <= 8;
      start = last = null;
      if (tapped) onTap(x, y);
    },
    cancel() { start = last = null; moved = false; }
  };
}
module.exports = { createGesture };
