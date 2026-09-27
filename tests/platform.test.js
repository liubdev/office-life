const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWechatPlatform } = require('../src/platform/wechat');
const { createRenderer } = require('../src/ui/renderer');
const { createGame, choose, advance } = require('../src/core/engine');
const { events } = require('../src/data/events');
const { stories } = require('../src/data/stories');
const { createBrowserPlatform } = require('../src/platform/browser');
test('浏览器正常释放指针后保持惯性，拖动中丢失捕获则取消', () => {
  const names = ['window', 'document', 'requestAnimationFrame'];
  const previous = names.map(name => Object.getOwnPropertyDescriptor(globalThis, name));
  const handlers = {}, queue = [];
  let scrolled = 0, taps = 0;
  const frame = { addEventListener: (name, fn) => { handlers[name] = fn; }, setPointerCapture() {} };
  const canvas = { getBoundingClientRect: () => ({ left: 0, top: 0 }) };
  try {
    globalThis.window = { innerHeight: 800 };
    globalThis.document = { documentElement: { style: { setProperty() {} } }, getElementById: id => id === 'frame' ? frame : canvas };
    globalThis.requestAnimationFrame = fn => queue.push(fn);
    const platform = createBrowserPlatform();
    platform.onScroll(delta => { scrolled += delta; return true; });
    platform.onTap(() => taps++);
    const event = y => ({ pointerId: 1, button: 0, clientX: 30, clientY: y });
    handlers.pointerdown(event(300)); handlers.pointermove(event(200)); handlers.pointerup(event(200));
    handlers.lostpointercapture(event(200));
    const released = scrolled; queue.shift()();
    assert.ok(scrolled > released, '正常松手后的捕获释放不能打断惯性');
    handlers.pointerdown(event(200)); handlers.pointermove(event(100)); handlers.lostpointercapture(event(100));
    const cancelled = scrolled;
    while (queue.length) queue.shift()();
    handlers.pointerup(event(100));
    assert.equal(scrolled, cancelled); assert.equal(taps, 0);
  } finally {
    names.forEach((name, i) => { if (previous[i]) Object.defineProperty(globalThis, name, previous[i]); else delete globalThis[name]; });
  }
});
function canvasStub() {
  const ctx = new Proxy({ measureText: str => ({ width: str.length * 14 }) }, { get: (o, k) => k in o ? o[k] : () => {} });
  return { getContext: () => ctx };
}
test('微信适配：使用上屏Canvas、安全区、触摸结束坐标和同步存储', () => {
  let listener; const data = {};
  const wx = { createCanvas: canvasStub, getWindowInfo: () => ({ windowWidth: 390, windowHeight: 844, pixelRatio: 3, safeArea: { top: 47, bottom: 810 } }), onTouchEnd: cb => { listener = cb; }, getStorageSync: k => data[k], setStorageSync: (k, v) => { data[k] = v; } };
  const p = createWechatPlatform(wx); assert.equal(p.size().top, 91); assert.equal(p.size().bottom, 34);
  wx.getMenuButtonBoundingClientRect = () => ({ bottom: 87 });
  assert.equal(p.size().top, 95);
  wx.getMenuButtonBoundingClientRect = () => ({ bottom: 0 });
  assert.equal(p.size().top, 91);
  wx.getMenuButtonBoundingClientRect = () => { throw Error('unavailable'); };
  assert.equal(p.size().top, 91);
  let point; p.onTap((x, y) => { point = [x, y]; }); listener({ changedTouches: [{ clientX: 12, clientY: 34 }] });
  assert.deepEqual(point, [12, 34]); p.write('a', 'b'); assert.equal(p.read('a'), 'b');
});
test('所有事件、结果、首页、确认和结局可绘制，按钮位于画面内', () => {
  const renderer = createRenderer({ canvas: canvasStub(), size: () => ({ width: 390, height: 820, dpr: 1, top: 0, bottom: 0 }) });
  const actions = { newGame() {}, resume() {}, confirmNew() {}, home() {}, advance() {}, choose() {} };
  for (const event of [...events, ...stories]) {
    const state = { ...createGame(), eventId: event.id };
    const buttons = renderer.render('game', state, actions);
    const labels = new Set(buttons.map(b => b.label));
    const max = renderer.inspect().maxScroll;
    for (let y = 0; y <= max + 80; y += 80) { renderer.scroll(80); renderer.render('game', state, actions).forEach(b => labels.add(b.label)); }
    for (const choice of event.choices) assert.ok(labels.has(choice.text), choice.text);
    for (const b of buttons) { assert.ok(b.y + b.h <= 820); assert.ok(b.x + b.w <= 390); }
    for (let i = 0; i < event.choices.length; i++) renderer.render('game', choose(state, i), actions);
  }
  renderer.render('home', null, actions);
  renderer.render('help', null, actions);
  renderer.render('confirm', createGame(), actions);
  renderer.render('game', advance(choose({ ...createGame(), week: 52 }, 0)), actions);
});
