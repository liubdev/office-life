const { CAREERS, LABELS, MAX_WEEKS } = require('../core/config');
const { salary, eventFor } = require('../core/engine');
const { forecast, titleFor } = require('../core/guidance');
const { goalProgress } = require('../core/life');
const screens = require('./life-screens');
const { headerLayout, drawHeader } = require('./header');
const { C, createLayout, linesFor, roundRect, drawText } = require('./layout');
function createRenderer(platform) {
  const ctx = platform.canvas.getContext('2d');
  let cachedLayout;
  let targets = [], lastArgs, route = '', offset = 0, maxScroll = 0, viewport, diagnostics;
  function home(ui, state, actions) {
    ui.paragraph('一份工作，很多种活法。', { color: C.green });
    ui.heading('这一年，你说了算', '从第一份工资，到自己的职场答案。');
    ui.hero();
    ui.heading('这次，我想怎么上班');
    ui.paragraph('选一张专属工牌，安排自己的每个月。和同事建立信任，让今天的选择改变后来的故事。');
    ui.card('52 周一局 · 自动存档', '每次选择推进一周，每四周安排自己的生活。', { fill: C.pale });
    if (state && state.phase !== 'ended') ui.card('开始新的人生', '重新选择特质与目标，开启另一种生活。', { action: actions.confirmNew });
    else ui.paragraph('初始存款 ¥3,000 · 月薪 ¥4,500', { size: 13 });
  }
  function play(ui, state, actions) {
    ui.heading(`第 ${state.week} 周 · ${state.phase === 'playing' ? '上班日常' : '本周回声'}`);
    ui.paragraph(`${state.employed ? CAREERS[state.level].name : '待业中'} · 月薪 ¥${salary(state).toLocaleString('en-US')}`, { size: 13, after: 8 });
    ui.metrics([
      { label: '存款', value: `¥${state.money.toLocaleString('en-US')}`, risk: state.money < 1000 },
      { label: '健康', value: state.health, risk: state.health <= 25 },
      { label: '心情', value: state.mood, risk: state.mood <= 25 },
      { label: '好感', value: state.favor, risk: state.favor <= 25 }
    ]);
    const cash = forecast(state);
    ui.paragraph(`${cash.remaining} 周后月结 · 预计结余 ¥${(cash.income - cash.cost).toLocaleString('en-US')}`, { size: 12, after: 8 });
    if (state.phase === 'playing') {
      const event = eventFor(state);
      ui.card(event.title, event.text, { size: 20, fill: C.pale });
      event.choices.forEach((choice, i) => {
        const hint = `${choice.requires ? '专属选择 · ' : ''}${Object.entries(choice.effects).map(([k, v]) => `${LABELS[k]}${v > 0 ? '+' : ''}${v}`).join('  ')}`;
        ui.option(choice.text, hint, { marker: String.fromCharCode(65 + i), action: () => actions.choose(i), special: !!choice.requires });
      });
    } else {
      ui.card(state.feedback.title, state.feedback.text, { size: 20 });
      const changes = Object.entries(state.feedback.deltas).filter(([, delta]) => delta).map(([key, delta]) => `${LABELS[key]} ${delta > 0 ? '+' : ''}${delta}`);
      if (changes.length) ui.paragraph(changes.join('  ·  '), { size: 13, color: C.green });
      state.feedback.notices.forEach(notice => ui.paragraph(notice, { size: 14, color: C.green }));
      if (!state.ending) ui.card('周末 · 随机小游戏', '配对、数字或熄灯，换个节奏。', { action: actions.weekend, fill: C.pale });
      if (state.ending) ui.paragraph('这段旅程已抵达终点。', { color: C.red });
    }
  }
  function ending(ui, state) {
    ui.paragraph('PERSONAL ARCHIVE', { size: 12, color: C.green });
    ui.heading(state.ending.title, state.ending.text);
    if (state.life) { const goal = goalProgress(state); ui.card(goal.name, goal.met ? '目标达成' : '留给下一次挑战', { fill: C.pale }); }
    ui.card('你的职场年度档案', [
      `走过的时间：${state.week} 周`, `最后的身份：${state.employed ? CAREERS[state.level].name : '自由求职人'}`,
      `账户余额：¥${state.money.toLocaleString('en-US')}`, `身体 / 精神：${state.health} / ${state.mood}`,
      `晋升 / 跳槽：${state.promotions} 次 / ${state.switches} 次`
    ].join('\n'));
    const badge = titleFor(state); ui.card(badge.name, badge.hint, { fill: C.mint });
  }
  function footerFor(view, state, actions) {
    if (view === 'home') return [[{ title: state && state.phase !== 'ended' ? `继续第 ${state.week} 周的生活` : '领取工牌，开始上班', action: state && state.phase !== 'ended' ? actions.resume : actions.newGame, primary: true }], [{ title: '玩法说明', action: actions.help }, { title: '人生收藏', action: actions.collection }]];
    if (view === 'setup') return [[{ title: '工牌准备好了，开始这一年', action: actions.begin, primary: true }]];
    if (view === 'weekend') return [[{ title: '结束周末，进入下一周', action: actions.advance, primary: true }]];
    if (view === 'journal') return [[{ title: '回到这一周', action: actions.resume, primary: true }]];
    if (view === 'help' || view === 'collection') return [[{ title: '回到首页', action: actions.home, primary: true }]];
    if (view === 'confirm') return [[{ title: '确认重新开始', action: actions.newGame, primary: true }], [{ title: '继续当前人生', action: actions.resume }]];
    if (view === 'game' && state.phase === 'ended') return [[{ title: '再过一种人生', action: actions.newGame, primary: true }, { title: '人生收藏', action: actions.collection }]];
    if (view === 'game' && state.phase === 'feedback') return [[{ title: state.ending ? '查看我的年度档案' : '收好心情，进入下一周', action: actions.advance, primary: true }]];
    return [];
  }
  function render(view, state, actions, warning = '', meta = {}, reuseLayout = false) {
    lastArgs = [view, state, actions, warning, meta];
    const key = `${view}:${state ? `${state.life ? state.life.runId : ''}:${state.week}:${state.phase}` : ''}:${meta.journalPage || 0}`;
    if (key !== route) { offset = 0; route = key; }
    const size = platform.size(), dpr = Math.max(1, Math.min(3, size.dpr || 1));
    const safeLeft = size.left || 0, safeRight = size.right || 0;
    const width = Math.min(560, size.width - safeLeft - safeRight), originX = safeLeft + (size.width - safeLeft - safeRight - width) / 2;
    const bottom = size.height - (size.bottom || 0), pad = width < 360 ? 16 : 20, inner = width - pad * 2;
    const pixelWidth = Math.round(size.width * dpr), pixelHeight = Math.round(size.height * dpr);
    if (platform.canvas.width !== pixelWidth) platform.canvas.width = pixelWidth;
    if (platform.canvas.height !== pixelHeight) platform.canvas.height = pixelHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = C.bg; ctx.fillRect(0, 0, size.width, size.height);
    targets = [];
    // Logo, version and navigation share a measured safe row beside the WeChat capsule.
    const navigationItems = [];
    if (state && state.life && ['game', 'plan'].includes(view)) navigationItems.push({ title: '手记', icon: 'journal', label: '职场手记', action: actions.journal });
    if (view !== 'home') navigationItems.push({ title: '首页', icon: 'home', label: '保存并返回首页', action: actions.home });
    const header = headerLayout(size, originX, width, pad, navigationItems.length);
    drawHeader(ctx, header, navigationItems);
    navigationItems.forEach((item, i) => {
      targets.push({ ...header.actions[i], label: item.label, action: item.action });
    });
    let contentTop = header.contentTop;
    if (warning) {
      const lines = linesFor(ctx, warning, inner - 20, 12), h = lines.length * 18 + 16;
      roundRect(ctx, originX + pad, contentTop, inner, h, '#f7ece6', 8);
      lines.forEach((line, i) => drawText(ctx, line, originX + pad + 10, contentTop + 8 + i * 18, 12, C.red)); contentTop += h + 8;
    }
    const footer = reuseLayout ? cachedLayout.footer : createLayout(ctx, inner, { x: originX + pad, y: 8, gap: 8 }), rows = footerFor(view, state, actions);
    if (!reuseLayout) rows.forEach(row => footer.buttons(row));
    const footerHeight = rows.length ? footer.height : 0, footerY = bottom - footerHeight;
    const ui = reuseLayout ? cachedLayout.ui : createLayout(ctx, inner, { x: originX + pad });
    if (!reuseLayout) {
      if (view === 'home') home(ui, state, actions);
      else if (view === 'weekend') screens.weekend(ui, meta.weekend, actions);
      else if (view === 'setup') screens.setup(ui, actions, meta.profile || { trait: 'communicator', goal: 'savings' });
      else if (view === 'plan') screens.plan(ui, state, actions);
      else if (view === 'journal') screens.journal(ui, state, actions, meta.journalPage || 0);
      else if (view === 'collection') screens.collection(ui, meta.collection || { badges: [], goals: [], completed: 0 });
      else if (view === 'confirm') { ui.heading('开始一段新的人生？', '当前存档将在完成新工牌配置后被替换。你也可以继续原来的职场旅程。'); }
      else if (view === 'help') {
        ui.heading('上班之前，先看这里');
        [
          ['你的专属工牌', '开局选择特质与年度目标。一局最多 52 周，特质和同事信任能解锁专属选项。'],
          ['安排自己的生活', '每四周先选一次主动安排，支出立即扣除，收益在月末兑现。寻找机会累计两次，可在月初联系猎头。'],
          ['工资与晋升', '每 4 周发工资并扣除 ¥3,200 生活费。工资按实际在岗周数累计；晋升需要经验和好感达到要求，每 4 周评估一次。'],
          ['照顾自己', '健康或精神降至 0、存款低于 0，旅程就会结束。低好感可能引发裁员，离职后可以重新求职。'],
          ['选择与回声', '每次事件选择推进一周。选项显示直接影响；特质、关系及月结结果以反馈为准。上下滑动可查看完整内容。'],
          ['本机存档', '进度仅保存在本机，不上传到服务器。删除数据或更换设备可能丢失进度；重新开始会替换当前存档，保留人生收藏。'],
          ['人生收藏', '年度称号与达成的目标会留在人生收藏。当前无广告、无付费、无账号登录，角色与情节均为虚构。']
        ].forEach(([title, body]) => ui.card(title, body));
      } else if (state.phase === 'ended') ending(ui, state);
      else play(ui, state, actions);
      cachedLayout = { ui, footer };
    }
    const viewHeight = Math.max(1, footerY - contentTop - 8);
    viewport = { x: originX, y: contentTop, w: width, h: viewHeight };
    maxScroll = Math.max(0, ui.height - viewHeight); offset = Math.max(0, Math.min(maxScroll, offset));
    ctx.save(); ctx.beginPath(); ctx.rect(originX, contentTop, width, viewHeight); ctx.clip(); ctx.translate(0, contentTop - offset);
    ui.commands.forEach(command => command()); ctx.restore();
    // Partial buttons are visible while scrolling, but not tappable until at least 44 px are exposed.
    ui.targets.forEach(t => {
      const y = t.y + contentTop - offset, visibleTop = Math.max(contentTop, y), visibleBottom = Math.min(contentTop + viewHeight, y + t.h);
      if (visibleBottom - visibleTop >= 44) targets.push({ ...t, y: visibleTop, h: visibleBottom - visibleTop });
    });
    if (maxScroll > 0) {
      const thumb = Math.max(28, viewHeight * viewHeight / ui.height), yy = contentTop + (viewHeight - thumb) * offset / maxScroll;
      roundRect(ctx, originX + width - 6, contentTop, 3, viewHeight, C.line, 1);
      roundRect(ctx, originX + width - 6, yy, 3, thumb, C.green, 1);
    }
    if (rows.length) {
      ctx.fillStyle = C.bg; ctx.fillRect(originX, footerY, width, footerHeight);
      ctx.save(); ctx.translate(0, footerY); footer.commands.forEach(command => command()); ctx.restore();
      targets.push(...footer.targets.map(t => ({ ...t, y: t.y + footerY })));
    }
    diagnostics = { header, viewport, contentHeight: ui.height, offset, maxScroll, textBoxes: ui.textBoxes, footerTextBoxes: footer.textBoxes, footerY, dpr };
    if (platform.syncControls) platform.syncControls(targets);
    return targets;
  }
  function tap(x, y) { const target = targets.find(t => x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h); if (target) target.action(); }
  function scroll(delta, x, y) {
    if (!lastArgs || !Number.isFinite(delta)) return false;
    if (Number.isFinite(x) && Number.isFinite(y) && (x < viewport.x || x > viewport.x + viewport.w || y < viewport.y || y > viewport.y + viewport.h)) return false;
    const next = Math.max(0, Math.min(maxScroll, offset + delta));
    if (next === offset) return false;
    offset = next; render(...lastArgs, true); return true;
  }
  return { render, tap, scroll, inspect: () => diagnostics };
}
module.exports = { createRenderer };
