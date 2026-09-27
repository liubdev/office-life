const { C, roundRect, drawText } = require('./layout');
const VERSION = 'v1.2.0';
// Compact brand variants keep the same icon and readable version, with 44px navigation targets.
function headerLayout(size, originX, width, pad, actionCount) {
  const left = originX + pad, normalRight = originX + width - pad;
  let navigation = size.navigation;
  if (navigation && Math.min(normalRight, navigation.right) - left < 88) navigation = null;
  const top = navigation ? navigation.top : (size.top || 0) + 2;
  // Leave extra room for the mini-game entry beside the system capsule.
  const right = navigation ? Math.min(normalRight, navigation.right - 48) : normalRight;
  const available = right - left, actionWidth = actionCount ? actionCount * 44 + (actionCount - 1) * 4 : 0;
  const requiredGap = actionCount ? 8 : 0;
  const inline = available >= 88 + actionWidth + requiredGap;
  const brandSpace = available - (inline ? actionWidth + requiredGap : 0);
  const variant = brandSpace >= 160 ? 'full' : brandSpace >= 116 ? 'short' : 'mark';
  const brand = { x: left, y: top + 4, w: variant === 'full' ? 160 : variant === 'short' ? 116 : 88, h: 36, variant, showName: variant !== 'mark' };
  const actionY = inline ? top : Math.max(size.top || 0, top + 44) + 4;
  const actionLeft = inline ? brand.x + brand.w + requiredGap : left;
  const actions = Array.from({ length: actionCount }, (_, i) => ({ x: actionLeft + i * 48, y: actionY, w: 44, h: 44 }));
  const bottom = Math.max(top + 44, actionCount ? actionY + 44 : 0, size.top || 0);
  return { brand, actions, bottom, contentTop: bottom + 8, inline };
}
function strokePath(ctx, points) {
  ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
}
function badgeIcon(ctx, x, y) {
  // A clipped work badge: a lanyard tab, portrait and two lines of print.
  roundRect(ctx, x + 2, y + 5, 28, 30, '#d9dfd0', 7);
  roundRect(ctx, x + 2, y + 3, 28, 30, C.ink, 7);
  roundRect(ctx, x + 10, y, 12, 7, C.mint, 3);
  roundRect(ctx, x + 12, y + 3, 8, 2, C.green, 1);
  ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(x + 11, y + 15, 3, 0, Math.PI * 2); ctx.fill();
  roundRect(ctx, x + 7, y + 20, 8, 5, C.white, 3);
  roundRect(ctx, x + 19, y + 14, 6, 2, C.mint, 1);
  roundRect(ctx, x + 19, y + 20, 5, 2, C.mint, 1);
  roundRect(ctx, x + 8, y + 28, 16, 1.5, '#8fa797', .75);
}
function navigationIcon(ctx, kind, x, y) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = C.green; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (kind === 'journal') {
    roundRect(ctx, 3, 2, 12, 15, C.bg, 2.5, C.green);
    strokePath(ctx, [[6, 2], [6, 17]]);
    strokePath(ctx, [[9, 7], [12, 7]]); strokePath(ctx, [[9, 11], [12, 11]]);
    strokePath(ctx, [[1.5, 6], [4, 6]]); strokePath(ctx, [[1.5, 13], [4, 13]]);
  } else {
    strokePath(ctx, [[1, 8], [9, 2], [17, 8]]);
    strokePath(ctx, [[3.5, 7], [3.5, 16], [7, 16], [7, 11], [11, 11], [11, 16], [14.5, 16], [14.5, 7]]);
  }
  ctx.restore();
}
function drawHeader(ctx, header, items) {
  const { brand } = header;
  badgeIcon(ctx, brand.x, brand.y);
  if (brand.showName) {
    drawText(ctx, brand.variant === 'full' ? '我的工牌有想法' : '工牌有想法', brand.x + 40, brand.y + 1, 14, C.ink, true);
    roundRect(ctx, brand.x + 40, brand.y + 21, 50, 15, C.pale, 4);
    drawText(ctx, VERSION, brand.x + 44, brand.y + 22, 12, C.muted);
  } else {
    roundRect(ctx, brand.x + 36, brand.y + 11, 50, 16, C.pale, 4);
    drawText(ctx, VERSION, brand.x + 40, brand.y + 13, 12, C.muted);
  }
  items.forEach((item, i) => {
    const rect = header.actions[i];
    // Keep a full touch target around each centered, icon-only action.
    navigationIcon(ctx, item.icon, rect.x + 13, rect.y + 13);
  });
}
module.exports = { headerLayout, drawHeader };
