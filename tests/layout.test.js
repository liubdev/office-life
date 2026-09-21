const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRenderer } = require('../src/ui/renderer');
const { createGesture } = require('../src/platform/gesture');
const { createWechatPlatform } = require('../src/platform/wechat');
const { createGame, choose, advance } = require('../src/core/engine');
const { allEvents } = require('../src/content/catalog');
const { OPTIONS } = require('../src/data/life');
function canvasStub() {
  const ctx = new Proxy({ font: '', measureText(value) {
    const size = Number(this.font.match(/(\d+)px/)[1]);
    return { width: [...String(value)].reduce((sum, c) => sum + (c.charCodeAt(0) > 255 ? size : size * .6), 0) };
  } }, { get: (o, k) => k in o ? o[k] : () => {} });
  return { getContext: () => ctx };
}
const SIZES = [
  [280, 653, 2, 64, 0], [320, 480, 2, 64, 0], [320, 568, 2, 64, 0],
  [360, 640, 3, 64, 0], [375, 667, 2, 64, 0], [375, 812, 3, 95, 34],
  [390, 844, 3, 95, 34], [393, 852, 3, 103, 34], [412, 915, 3.5, 90, 24],
  [430, 932, 3, 103, 34], [768, 1024, 2, 80, 20], [1024, 768, 2, 80, 20],
  [844, 390, 3, 0, 21, 47, 47], [1440, 900, 1, 0, 0]
].map(([width, height, dpr, top, bottom, left = 0, right = 0]) => ({ width, height, dpr, top, bottom, left, right }));
const actions = new Proxy({}, { get: () => () => {} });
function checkText(boxes, size) {
  boxes.forEach(box => {
    assert.ok(box.size >= 12, `字体过小: ${box.text}`);
    assert.ok(box.x >= size.left - .01, box.text);
    assert.ok(box.x + box.w <= size.width - size.right + .01, `横向溢出: ${box.text}`);
  });
  // Text lines in the same viewport must not overlap one another.
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    const overlap = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > .1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > .1;
    assert.ok(!overlap, `文字重叠: ${a.text} / ${b.text}`);
  }
}
function checkTargets(targets, size) {
  targets.forEach(t => {
    assert.ok(t.w >= 44 && t.h >= 44, `触摸区过小: ${t.label}`);
    assert.ok(t.x >= size.left && t.y >= size.top, t.label);
    assert.ok(t.x + t.w <= size.width - size.right + .01 && t.y + t.h <= size.height - size.bottom + .01, `按钮越过安全区: ${t.label}`);
  });
}
test('14种窗口尺寸：所有页面文字不重叠、不横向溢出，字号与点击区不随短屏缩小', () => {
  for (const size of SIZES) {
    let targets;
    const renderer = createRenderer({ canvas: canvasStub(), size: () => size, syncControls: t => { targets = t; } });
    const state = createGame(() => 0, { trait: 'specialist', goal: 'savings' });
    state.life.journal = [{ week: 1, text: '这是非常长的一段职场记录。'.repeat(18) }];
    for (const view of ['home', 'setup', 'plan', 'journal', 'collection', 'help', 'confirm', 'game']) {
      renderer.render(view, state, actions, '', { profile: { trait: 'specialist', goal: 'savings' }, collection: { badges: [], goals: [], completed: 0 } });
      const report = renderer.inspect();
      assert.ok(report.viewport.h >= 44, `${size.width}×${size.height} ${view}`);
      checkText(report.textBoxes, size); checkText(report.footerTextBoxes, size); checkTargets(targets, size);
      const initialFonts = report.textBoxes.map(t => t.size);
      renderer.scroll(1e6); checkTargets(targets, size);
      assert.equal(renderer.inspect().offset, report.maxScroll);
      assert.deepEqual(renderer.inspect().textBoxes.map(t => t.size), initialFonts);
    }
    for (const ended of [false, true]) {
      const feedback = choose({ ...state, week: ended ? 52 : 4, eventId: 'quiet-day' }, 1);
      const value = ended ? advance(feedback) : feedback;
      renderer.render('game', value, actions);
      checkText(renderer.inspect().textBoxes, size); checkText(renderer.inspect().footerTextBoxes, size); checkTargets(targets, size);
    }
  }
});
test('37个事件与专属选项：窄屏滑动可到达每个选择，文本完整换行', () => {
  const size = SIZES[1]; let targets;
  const renderer = createRenderer({ canvas: canvasStub(), size: () => size, syncControls: t => { targets = t; } });
  for (const event of allEvents) {
    const state = { ...createGame(() => 0), eventId: event.id };
    state.life.trust = { lin: 10, zhou: 10, manager: 10 };
    if (OPTIONS[event.id] && OPTIONS[event.id][0].requires.trait) state.life.trait = OPTIONS[event.id][0].requires.trait;
    renderer.render('game', state, actions); renderer.scroll(-1e6);
    checkText(renderer.inspect().textBoxes, size);
    const labels = new Set();
    for (let y = 0; y <= renderer.inspect().maxScroll + 40; y += 40) {
      targets.forEach(t => labels.add(t.label)); checkTargets(targets, size); renderer.scroll(40);
    }
    for (const choice of event.choices) assert.ok(labels.has(choice.text), `${event.id}: ${choice.text}`);
    if (OPTIONS[event.id]) assert.ok(labels.has(OPTIONS[event.id][0].text));
  }
});
test('底部主按钮固定；滚动只响应正文；切周归顶；窗口变化不会丢进度或越界', () => {
  let size = SIZES[1], targets;
  const renderer = createRenderer({ canvas: canvasStub(), size: () => size, syncControls: t => { targets = t; } });
  const state = createGame(() => 0);
  renderer.render('setup', state, actions);
  const before = targets.find(t => t.label.includes('工牌准备好了'));
  renderer.scroll(100, before.x, before.y); assert.equal(renderer.inspect().offset, 0);
  renderer.scroll(500); const after = targets.find(t => t.label.includes('工牌准备好了'));
  assert.equal(after.y, before.y); assert.equal(after.h, before.h);
  const offset = renderer.inspect().offset;
  renderer.render('setup', state, actions, '', { profile: { trait: 'boundaries', goal: 'balance' } });
  assert.equal(renderer.inspect().offset, offset);
  size = SIZES[10]; renderer.render('setup', state, actions); checkTargets(targets, size);
  renderer.render('game', { ...state, week: 2 }, actions); assert.equal(renderer.inspect().offset, 0);
});
test('Canvas像素比最多3倍且同尺寸滚动不重复分配画布', () => {
  let writes = 0, w, h; const canvas = canvasStub();
  Object.defineProperties(canvas, { width: { get: () => w, set: v => { w = v; writes++; } }, height: { get: () => h, set: v => { h = v; writes++; } } });
  const renderer = createRenderer({ canvas, size: () => SIZES[8] });
  renderer.render('help', null, actions); assert.equal(w, 412 * 3); assert.equal(h, 915 * 3);
  renderer.scroll(100); renderer.scroll(100); assert.equal(writes, 2);
});
test('共享手势：滑动、抖动、取消、多次拖动不会误选事件', () => {
  let taps = 0, distance = 0;
  const gesture = createGesture(() => taps++, delta => { distance += delta; });
  gesture.start(20, 200); gesture.move(21, 197); gesture.end(21, 197); assert.equal(taps, 1);
  gesture.start(20, 200); gesture.move(20, 150); gesture.move(20, 100); gesture.end(20, 100);
  assert.equal(taps, 1); assert.equal(distance, 100);
  gesture.start(20, 200); gesture.move(50, 200); gesture.move(20, 200); gesture.end(20, 200); assert.equal(taps, 1);
  gesture.start(20, 200); gesture.cancel(); gesture.end(20, 200); assert.equal(taps, 1);
  gesture.start(20, 200); gesture.end(20, 100); assert.equal(taps, 1);
});
test('微信滑动接线、触摸取消、切后台与多点触控正确处理', () => {
  const handlers = {}, wx = { createCanvas: canvasStub, getWindowInfo: () => ({ windowWidth: 844, windowHeight: 390, pixelRatio: 3, safeArea: { top: 0, bottom: 369, left: 47, right: 797 } }) };
  for (const name of ['onTouchStart', 'onTouchMove', 'onTouchEnd', 'onTouchCancel', 'onHide', 'onWindowResize']) wx[name] = callback => { handlers[name] = callback; };
  const platform = createWechatPlatform(wx); let taps = 0, amount = 0, hides = 0;
  platform.onTap(() => taps++); platform.onScroll(delta => { amount += delta; }); platform.onHide(() => hides++);
  assert.equal(platform.size().left, 47); assert.equal(platform.size().right, 47); assert.equal(platform.size().bottom, 21);
  const point = (x, y) => ({ touches: [{ clientX: x, clientY: y }], changedTouches: [{ clientX: x, clientY: y }] });
  handlers.onTouchStart(point(50, 200)); handlers.onTouchMove(point(50, 100)); handlers.onTouchEnd(point(50, 100));
  assert.equal(amount, 100); assert.equal(taps, 0);
  handlers.onTouchStart(point(50, 200)); handlers.onTouchCancel(); handlers.onTouchEnd(point(50, 200)); assert.equal(taps, 0);
  handlers.onTouchStart(point(50, 200)); handlers.onHide(); handlers.onTouchEnd(point(50, 200)); assert.equal(taps, 0); assert.equal(hides, 1);
  handlers.onTouchStart(point(50, 200)); handlers.onTouchMove({ touches: [{}, {}] }); handlers.onTouchEnd(point(50, 200)); assert.equal(taps, 0);
});
test('顶部品牌、版本与手记首页共用胶囊安全行：小屏、大屏和刘海机均不碰撞', () => {
  const devices = [
    { width: 320, height: 568, status: 20, menu: { left: 224, top: 26, bottom: 58, right: 313 } },
    { width: 375, height: 812, status: 44, menu: { left: 278, top: 50, bottom: 82, right: 368 } },
    { width: 390, height: 844, status: 47, menu: { left: 293, top: 53, bottom: 85, right: 383 } },
    { width: 430, height: 932, status: 59, menu: { left: 333, top: 65, bottom: 97, right: 423 } },
    { width: 280, height: 653, status: 24, menu: { left: 182, top: 30, bottom: 62, right: 273 } },
    { width: 768, height: 1024, status: 24, menu: { left: 671, top: 30, bottom: 62, right: 761 } }
  ];
  const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  for (const d of devices) {
    const platform = createWechatPlatform({ createCanvas: canvasStub, getWindowInfo: () => ({ windowWidth: d.width, windowHeight: d.height, statusBarHeight: d.status, safeArea: { top: d.status, bottom: d.height - 20 } }), getMenuButtonBoundingClientRect: () => d.menu });
    const size = platform.size(), renderer = createRenderer(platform), state = createGame(() => 0);
    assert.ok(size.navigation);
    for (const view of ['home', 'game', 'plan', 'journal', 'setup', 'help', 'collection']) {
      let tapped = '';
      const active = { ...actions, home: () => { tapped = 'home'; }, journal: () => { tapped = 'journal'; } };
      const targets = renderer.render(view, state, active), report = renderer.inspect();
      const blocks = [report.header.brand, ...report.header.actions];
      const capsule = { x: d.menu.left, y: d.menu.top, w: d.menu.right - d.menu.left, h: d.menu.bottom - d.menu.top };
      blocks.forEach(rect => {
        assert.ok(rect.y >= d.status, '不进入系统状态栏');
        assert.ok(!overlaps(rect, capsule), '不碰撞微信胶囊');
        assert.ok(rect.x >= 0 && rect.x + rect.w <= d.width);
        assert.ok(rect.y + rect.h <= report.viewport.y, '正文不能盖住顶部');
      });
      for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) assert.ok(!overlaps(blocks[i], blocks[j]));
      assert.ok(report.header.brand.y < size.top, 'LOGO上移至胶囊同一行');
      for (const label of ['保存并返回首页', '职场手记']) {
        const target = targets.find(t => t.label === label);
        if (!target) continue;
        assert.ok(target.h >= 44 && target.w >= 44);
        renderer.tap(target.x + target.w / 2, target.y + target.h / 2);
        assert.equal(tapped, label === '职场手记' ? 'journal' : 'home');
      }
    }
  }
});
test('胶囊尺寸不可用时顶部使用安全回退，版本号仍保留', () => {
  for (const menu of [undefined, { bottom: 0 }, { bottom: 85 }, { left: 270, top: NaN, bottom: 85 }]) {
    const platform = createWechatPlatform({ createCanvas: canvasStub, getWindowInfo: () => ({ windowWidth: 375, windowHeight: 812, safeArea: { top: 44, bottom: 778 } }), getMenuButtonBoundingClientRect: () => menu });
    const size = platform.size(), renderer = createRenderer(platform);
    const targets = renderer.render('game', createGame(), actions);
    assert.equal(size.navigation, undefined);
    assert.ok(renderer.inspect().header.brand.y >= size.top);
    checkTargets(targets, { ...size, left: 0, right: 0 });
  }
});
