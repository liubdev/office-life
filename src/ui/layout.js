const C = { bg: '#f5f3ec', ink: '#213c36', muted: '#63736b', mint: '#d6edaa', green: '#43765a', line: '#dcded3', white: '#fffef9', red: '#a04c36', pale: '#e9eee2' };
const FONT = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
function setFont(ctx, size, bold) { ctx.font = `${bold ? 600 : 400} ${size}px ${FONT}`; }
function linesFor(ctx, value, width, size, bold = false) {
  setFont(ctx, size, bold);
  const lines = []; let line = '';
  for (const char of String(value)) {
    if (char === '\n') { lines.push(line); line = ''; continue; }
    if (line && ctx.measureText(line + char).width > width) { lines.push(line); line = char; } else line += char;
  }
  if (line) lines.push(line);
  return lines;
}
function roundRect(ctx, x, y, w, h, fill, radius = 14, stroke) {
  radius = Math.min(radius, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius); ctx.arcTo(x, y + h, x, y, radius); ctx.arcTo(x, y, x + w, y, radius); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}
function drawText(ctx, value, x, y, size = 14, color = C.ink, bold = false) {
  setFont(ctx, size, bold); ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(String(value), x, y);
}
// Layout uses logical screen pixels. Height is derived from measured text, never scaled to fit a screen.
function createLayout(ctx, width, { x = 16, y = 12, gap = 12 } = {}) {
  const commands = [], targets = [], textBoxes = []; let cursor = y;
  function blockText(value, tx, ty, w, size, color, bold, lineHeight) {
    const lines = linesFor(ctx, value, w, size, bold);
    lines.forEach((line, i) => {
      const yy = ty + i * lineHeight;
      textBoxes.push({ text: line, x: tx, y: yy, w: ctx.measureText(line).width, h: lineHeight, size });
      commands.push(() => drawText(ctx, line, tx, yy, size, color, bold));
    });
    return lines.length * lineHeight;
  }
  function paragraph(value, { size = 14, color = C.muted, bold = false, after = gap } = {}) {
    cursor += blockText(value, x, cursor, width, size, color, bold, Math.ceil(size * 1.5)) + after;
  }
  function cardHeight(title, body, w, options = {}) {
    const pad = 16, titleSize = options.size || 15;
    const titleH = linesFor(ctx, title, w - pad * 2, titleSize, true).length * Math.ceil(titleSize * 1.45);
    const bodyH = body ? 6 + linesFor(ctx, body, w - pad * 2, 13).length * 20 : 0;
    return Math.max(options.action ? 52 : 48, pad * 2 + titleH + bodyH);
  }
  function placeCard(title, body, tx, ty, w, h, options) {
    const fill = options.dark ? C.ink : options.selected || options.primary ? C.mint : options.fill || C.white;
    commands.push(() => roundRect(ctx, tx, ty, w, h, fill, 14, options.dark ? undefined : C.line));
    const titleColor = options.dark ? C.white : options.disabled ? C.muted : options.color || C.ink;
    let yy = ty + 16;
    yy += blockText(title, tx + 16, yy, w - 32, options.size || 15, titleColor, true, Math.ceil((options.size || 15) * 1.45));
    if (body) blockText(body, tx + 16, yy + 6, w - 32, 13, options.dark ? C.mint : C.muted, false, 20);
    if (options.action && !options.disabled) targets.push({ label: options.label || title, x: tx, y: ty, w, h, action: options.action, selected: !!options.selected });
  }
  function card(title, body = '', options = {}) {
    const h = cardHeight(title, body, width, options);
    placeCard(title, body, x, cursor, width, h, options); cursor += h + gap;
  }
  function option(title, body, { marker = 'A', action, disabled = false, special = false } = {}) {
    const ty = cursor, titleWidth = width - 88;
    const titleH = Math.max(28, linesFor(ctx, title, titleWidth, 15, true).length * 22);
    const bodyH = body ? linesFor(ctx, body, width - 32, 13).length * 20 : 0;
    const h = 28 + titleH + (body ? 20 + bodyH : 0);
    commands.push(() => {
      roundRect(ctx, x, ty + 2, width, h, '#e0e4d9', 12);
      roundRect(ctx, x, ty, width, h, disabled ? C.pale : C.white, 12, disabled ? C.line : '#bacbb7');
      roundRect(ctx, x + 14, ty + 14, 28, 28, disabled ? C.line : special ? C.green : C.pale, 8);
      if (body) {
        ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath();
        ctx.moveTo(x + 16, ty + 14 + titleH + 9); ctx.lineTo(x + width - 16, ty + 14 + titleH + 9); ctx.stroke();
      }
      if (!disabled) {
        const cx = x + width - 23, cy = ty + 14 + titleH / 2;
        ctx.strokeStyle = C.green; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(cx - 3, cy - 4); ctx.lineTo(cx + 1, cy); ctx.lineTo(cx - 3, cy + 4); ctx.stroke();
      }
    });
    const markerWidth = linesFor(ctx, marker, 28, 12, true);
    setFont(ctx, 12, true);
    blockText(markerWidth[0], x + 14 + (28 - ctx.measureText(markerWidth[0]).width) / 2, ty + 21, 28, 12, special && !disabled ? C.white : C.green, true, 16);
    blockText(title, x + 52, ty + 14 + (titleH === 28 ? 3 : 0), titleWidth, 15, disabled ? C.muted : C.ink, true, 22);
    if (body) blockText(body, x + 16, ty + 14 + titleH + 20, width - 32, 13, disabled ? C.muted : C.green, false, 20);
    if (action && !disabled) targets.push({ label: title, x, y: ty, w: width, h, action });
    cursor += h + gap;
  }
  function buttons(items) {
    const w = (width - gap * (items.length - 1)) / items.length;
    const h = Math.max(...items.map(item => cardHeight(item.title, '', w, item)));
    items.forEach((item, i) => placeCard(item.title, '', x + i * (w + gap), cursor, w, h, item)); cursor += h + gap;
  }
  function metrics(items) {
    const gutter = 8, available = width - gutter * (items.length - 1);
    const weights = items.map((_, i) => i === 0 ? 1.6 : 1), total = weights.reduce((a, b) => a + b, 0);
    const widths = weights.map(weight => available * weight / total);
    const labelHeights = items.map((item, i) => linesFor(ctx, item.label, widths[i] - 16, 12).length * 18);
    const valueHeights = items.map((item, i) => linesFor(ctx, item.value, widths[i] - 16, 18, true).length * 25);
    const labelH = Math.max(...labelHeights), h = 20 + labelH + 6 + Math.max(...valueHeights);
    let xx = x;
    items.forEach((item, i) => {
      const tx = xx, ty = cursor, w = widths[i];
      commands.push(() => roundRect(ctx, tx, ty, w, h, C.white, 10, C.line));
      blockText(item.label, tx + 8, ty + 10, w - 16, 12, C.muted, false, 18);
      blockText(item.value, tx + 8, ty + 10 + labelH + 6, w - 16, 18, item.risk ? C.red : C.ink, true, 25);
      xx += w + gutter;
    });
    cursor += h + gap;
  }
  function progress(value, max, label) {
    if (label) paragraph(label, { size: 13, color: C.green, after: 8 });
    const yy = cursor;
    commands.push(() => { roundRect(ctx, x, yy, width, 5, C.line, 2); if (value > 0) roundRect(ctx, x, yy, Math.max(4, width * Math.min(1, value / max)), 5, C.green, 2); });
    cursor += 5 + gap;
  }
  function hero() {
    const yy = cursor, h = width < 340 ? 144 : 176;
    commands.push(() => {
      roundRect(ctx, x, yy, width, h, '#e5eadb', 18);
      const deskY = yy + h - 38, mid = x + width * .55;
      roundRect(ctx, x + 22, yy + 20, width * .25, h - 66, '#fff9de', 8);
      roundRect(ctx, x + 26, deskY, width - 52, 7, C.ink, 3);
      roundRect(ctx, mid - 42, yy + 34, 104, h - 89, C.ink, 7);
      roundRect(ctx, mid - 35, yy + 41, 90, h - 103, C.mint, 4);
      roundRect(ctx, mid + 5, deskY - 18, 8, 18, C.ink, 2);
      roundRect(ctx, x + width - 61, deskY - 24, 21, 24, C.white, 5);
      drawText(ctx, '人生不只有绩效', x + 24, yy + h - 23, 12, C.green);
    }); cursor += h + gap;
  }
  return { paragraph, card, option, buttons, metrics, progress, hero, spacer: (height = gap) => { cursor += height; },
    heading: (title, subtitle) => { paragraph(title, { size: width < 320 ? 25 : 28, color: C.ink, bold: true, after: 8 }); if (subtitle) paragraph(subtitle); },
    get height() { return cursor; }, commands, targets, textBoxes, width };
}
module.exports = { C, createLayout, linesFor, roundRect, drawText };
