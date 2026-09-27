const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGame, choose, advance, eventFor, selectEvent, validSave } = require('../src/core/engine');
const { planMonth, needsPlan, seekOpportunity, goalProgress } = require('../src/core/life');
const { forecast } = require('../src/core/guidance');
const { createStorage } = require('../src/services/storage');
const { createCollection } = require('../src/services/collection');
const { TRAITS, GOALS, PLANS, OPTIONS } = require('../src/data/life');
const { allEvents } = require('../src/content/catalog');
const { validateEvents } = require('../src/core/engine');
const { createRenderer } = require('../src/ui/renderer');
const { start } = require('../src/app');
function memory() { const data = {}; return { data, read: key => data[key], write: (key, value) => { data[key] = value; } }; }
function game(trait) { return createGame(() => 0, { trait, goal: 'balance' }); }
function month(state) {
  for (let i = 0; i < 4; i++) { state.eventId = 'quiet-day'; state = choose(state, 1); if (i < 3) state = advance(state, () => 0); }
  return state;
}
test('1.2内容包与专属选项结构有效', () => {
  assert.equal(allEvents.length, 37); validateEvents(allEvents);
  for (const [id, choices] of Object.entries(OPTIONS)) {
    const base = allEvents.find(e => e.id === id); assert.ok(base);
    validateEvents([{ ...base, choices: [...base.choices, ...choices] }]);
  }
});
test('月度安排：立即扣费、不能重复、延迟结算、下一月可重新选择', () => {
  const original = game(); let state = planMonth(original, 'study');
  assert.equal(original.money, 3000); assert.equal(state.money, 2600); assert.equal(state.week, 1);
  assert.equal(needsPlan(state), false); assert.equal(planMonth(state, 'rest'), state);
  assert.equal(state.xp, 0); state = month(state);
  assert.equal(state.xp, 10); assert.equal(state.life.plan, null); assert.equal(state.money, 3900);
  assert.ok(state.feedback.notices.includes('月度安排完成 · 进修技能'));
  state = advance(state); assert.equal(needsPlan(state), true); assert.equal(validSave(state), true);
  assert.equal(planMonth({ ...original, money: 399 }, 'study').money, 399);
  assert.equal(planMonth(original, 'unknown'), original);
});
test('提前结束不会兑现月末安排；休假支出计入现金预测', () => {
  const state = planMonth({ ...game(), health: 1 }, 'study');
  const end = choose(state, 0); assert.equal(end.ending.kind, 'health'); assert.equal(end.xp, 7);
  assert.equal(forecast(planMonth(game(), 'rest')).balance, 4100);
});
test('三种特质有明确效果，反馈显示裁切后的真实增量', () => {
  let state = game('specialist'); let result = choose(state, 0);
  assert.equal(result.xp, 9); assert.equal(result.feedback.deltas.xp, 9);
  state = game('boundaries'); result = choose(state, 0); assert.equal(result.mood, 74);
  state = { ...game('communicator'), eventId: 'newbie' }; result = choose(state, 0);
  assert.equal(result.life.trust.lin, 5); assert.equal(state.life.trust.lin, 2);
  state.life.trust.lin = 10; assert.equal(choose(state, 0).life.trust.lin, 10);
});
test('关系解锁协作且消耗信任；不满足条件不能使用隐藏选项', () => {
  let state = { ...game(), eventId: 'sick' };
  assert.equal(eventFor(state).choices.length, 3); assert.equal(choose(state, 3), state);
  state.life.trust.lin = 6; assert.equal(eventFor(state).choices.length, 4);
  const result = choose(state, 3); assert.equal(result.life.trust.lin, 5); assert.equal(result.health, 95);
  assert.match(result.life.journal[0].text, /解锁选择/);
  state = { ...game('specialist'), eventId: 'production' }; assert.equal(eventFor(state).choices.length, 4);
});
test('月度经营关系和新剧情可衔接，剧情只发生一次', () => {
  let state = month(planMonth(game('communicator'), 'connect'));
  assert.equal(state.life.trust.zhou, 5);
  state = { ...advance(state), week: 14, story: { seen: ['mentor-start', 'mentor-help', 'mentor-finish'], flags: ['mentored'] } };
  assert.equal(selectEvent(state, () => 0), 'zhou-invite'); state.eventId = 'zhou-invite';
  state = advance(choose(state, 0)); assert.notEqual(selectEvent(state, () => 0), 'zhou-invite');
  assert.equal(validSave(state), true);
});
test('积累两次求职准备后主动约猎头，不能重复花费或绕过裁员', () => {
  let state = advance(month(planMonth(game(), 'search')));
  state = advance(month(planMonth(state, 'search')));
  assert.equal(state.life.opportunities, 2);
  state = seekOpportunity(state); assert.equal(state.eventId, 'headhunter'); assert.equal(state.life.opportunities, 0);
  assert.equal(seekOpportunity(state), state);
  state.life.opportunities = 4; assert.equal(seekOpportunity(state), state);
  state.eventId = 'layoff'; assert.equal(seekOpportunity(state), state);
  state.eventId = 'coffee'; state.employed = false; assert.equal(seekOpportunity(state), state);
});
test('旧存档迁移保留进度与数值，损坏1.2字段不会被加载', () => {
  const platform = memory(), storage = createStorage(platform);
  const state = { ...game(), week: 23, money: 13456 }; delete state.life;
  platform.write('office-life-save-v1', JSON.stringify(state));
  const loaded = storage.load(); assert.equal(loaded.week, 23); assert.equal(loaded.money, 13456);
  assert.equal(loaded.life.trait, null); assert.equal(validSave(loaded), true);
  for (const bad of [{ ...loaded.life, trust: {} }, { ...loaded.life, plan: 'bad' }, { ...loaded.life, journal: [null] }]) {
    assert.doesNotThrow(() => validSave({ ...loaded, life: bad })); assert.equal(validSave({ ...loaded, life: bad }), false);
  }
});
test('年度目标和收藏持久化：去重、提前结束不计入、写入失败可重试', () => {
  const platform = memory(); let collection = createCollection(platform);
  const finished = advance(choose({ ...game(), week: 52, eventId: 'quiet-day' }, 1));
  assert.equal(goalProgress(finished).met, true); collection.record(finished); collection.record(finished);
  assert.equal(collection.get().completed, 1); assert.deepEqual(collection.get().goals, ['balance']);
  collection = createCollection(platform); collection.record(finished); assert.equal(collection.get().completed, 1);
  collection.record(advance(choose({ ...game(), health: 1 }, 0))); assert.equal(collection.get().completed, 1);
  assert.equal(collection.get().badges.length, 1);
  let fail = true; const flaky = createCollection({ read: () => null, write: () => { if (fail) throw Error(); } });
  flaky.record(finished); assert.equal(flaky.get().completed, 0); assert.match(flaky.warning(), /失败/);
  fail = false; flaky.record(finished); assert.equal(flaky.get().completed, 1); assert.equal(flaky.warning(), '');
});
test('300局1.2模拟：月度安排、专属选择、存档往返与结局均合法', () => {
  for (let seed = 1; seed <= 300; seed++) {
    let n = seed; const rng = () => ((n = (n * 1664525 + 1013904223) >>> 0) / 4294967296);
    let state = createGame(rng, { trait: TRAITS[seed % 3].id, goal: GOALS[seed % 3].id }), turns = 0;
    while (state.phase !== 'ended') {
      if (needsPlan(state)) {
        if (rng() > .5) state = seekOpportunity(state);
        const affordable = PLANS.filter(p => p.cost <= state.money);
        state = planMonth(state, affordable[Math.floor(rng() * affordable.length)].id);
      }
      assert.equal(needsPlan(state), false);
      state = choose(state, Math.floor(rng() * eventFor(state).choices.length)); assert.equal(validSave(state), true);
      state = advance(JSON.parse(JSON.stringify(state)), rng); assert.equal(validSave(state), true);
      assert.ok(++turns <= 52);
    }
  }
});
function canvasStub() {
  const ctx = new Proxy({ measureText: str => ({ width: Array.from(str).reduce((w, c) => w + (c.charCodeAt(0) > 255 ? 12 : 7), 0) }) }, { get: (o, k) => k in o ? o[k] : () => {} });
  return { getContext: () => ctx };
}
test('新增页面在手机尺寸和微信安全区内均有可用点击区域', () => {
  for (const size of [{ width: 390, height: 820, dpr: 1, top: 0, bottom: 0 }, { width: 320, height: 568, dpr: 2, top: 64, bottom: 0 }, { width: 430, height: 932, dpr: 3, top: 95, bottom: 34 }]) {
    let targets; const renderer = createRenderer({ canvas: canvasStub(), size: () => size, syncControls: value => { targets = value; } });
    const noop = () => {}, actions = new Proxy({}, { get: () => noop });
    for (const view of ['setup', 'plan', 'journal', 'collection', 'help', 'home', 'game']) {
      renderer.render(view, game('specialist'), actions, '', { profile: { trait: 'specialist', goal: 'balance' }, collection: { badges: [], goals: [], completed: 0 } });
      assert.ok(targets.length > 0);
      for (const target of targets) { assert.ok(target.x >= 0 && target.y >= size.top); assert.ok(target.x + target.w <= size.width + .01); assert.ok(target.y + target.h <= size.height - size.bottom + .01); assert.equal(typeof target.action, 'function'); }
    }
  }
});
test('应用流程：开局配置→月度计划→事件→手记→继续→存档恢复', () => {
  const platform = memory(); let targets = [], tick = 1000; const originalNow = Date.now;
  Date.now = () => tick += 300;
  try {
    Object.assign(platform, { canvas: canvasStub(), size: () => ({ width: 390, height: 820, dpr: 1, top: 0, bottom: 0 }), syncControls: t => { targets = t; }, onTap() {}, onResize() {}, onHide() {} });
    const app = start(platform);
    const click = text => { const target = targets.find(t => t.label.includes(text)); assert.ok(target, text); target.action(); };
    click('领取工牌'); click('技术专精'); click('把生活过好'); click('工牌准备好了');
    assert.equal(app.getState().life.trait, 'specialist'); assert.equal(app.getState().life.goal, 'balance');
    click('进修技能'); assert.equal(app.getState().money, 2600);
    click('职场手记'); click('回到这一周');
    const event = eventFor(app.getState()); click(event.choices[0].text); assert.equal(app.getState().phase, 'feedback');
    click('周末 · 随机小游戏');
    const tile = targets.find(t => /^(图案 |数字 |灯 )/.test(t.label));
    assert.ok(tile); tile.action();
    const weekendTargets = targets.map(t => [t.label, !!t.selected]);
    click('保存并返回首页'); click('继续第'); click('周末 · 随机小游戏');
    assert.deepEqual(targets.map(t => [t.label, !!t.selected]), weekendTargets);
    click('结束周末，进入下一周'); assert.equal(app.getState().week, 2);
    click('保存并返回首页'); click('开始新的人生'); click('确认重新开始');
    click('保存并返回首页'); click('继续第'); assert.equal(app.getState().week, 2);
    const resumed = start(platform); assert.equal(resumed.getState().week, 2); assert.equal(resumed.getState().life.plan, 'study');
  } finally { Date.now = originalNow; }
});
test('旧年度存档反复加载不会重复增加收藏，即使迁移写入失败', () => {
  const state = advance(choose({ ...game(), week: 52, eventId: 'quiet-day' }, 1)); delete state.life;
  const platform = memory(); platform.data['office-life-save-v1'] = JSON.stringify(state);
  const originalWrite = platform.write;
  platform.write = (key, value) => { if (key === 'office-life-save-v1') throw Error(); originalWrite(key, value); };
  for (let i = 0; i < 3; i++) createCollection(platform).record(createStorage(platform).load());
  assert.equal(createCollection(platform).get().completed, 1);
});
