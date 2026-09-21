const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGame, choose, advance, selectEvent, validSave, validateEvents } = require('../src/core/engine');
const { forecast, guidance, titleFor } = require('../src/core/guidance');
const { stories } = require('../src/data/stories');
test('旧存档继续游玩时补齐剧情字段', () => {
  const state = createGame(() => 0); delete state.story;
  assert.equal(validSave(state), true);
  assert.deepEqual(choose(state, 0).story, { seen: [], flags: [] });
  assert.equal(validSave({ ...state, story: { seen: ['bad'], flags: [] } }), false);
});
test('新人剧情记住选择，分支互斥且不重复', () => {
  assert.equal(validateEvents(stories), true);
  for (const index of [0, 1]) {
    let state = { ...createGame(), week: 3, eventId: 'mentor-start' };
    state = advance(choose(state, index)); state.week = 7;
    const branch = index === 0 ? 'mentor-help' : 'mentor-alone';
    assert.equal(selectEvent(state, () => 0), branch);
    state.eventId = branch; state = advance(choose(state, 0));
    assert.ok(!['mentor-help', 'mentor-alone'].includes(selectEvent(state, () => 0)));
    state.week = 11; assert.equal(selectEvent(state, () => 0), 'mentor-finish');
  }
});
test('项目剧情要求职级，保守和冲刺分支分别解锁', () => {
  for (const index of [0, 1]) {
    let state = { ...createGame(), level: 1, week: 16, eventId: 'project-start', story: { seen: ['mentor-start', 'mentor-help', 'mentor-finish'], flags: ['mentored'] } };
    state = advance(choose(state, index)); state.week = 22;
    assert.equal(selectEvent(state, () => 0), index === 0 ? 'project-safe' : 'project-rush');
    state.employed = false; assert.equal(selectEvent(state, () => 0), 'interview');
  }
});
test('发薪预测覆盖选择前、月结后、待业与风险提醒', () => {
  let state = createGame();
  assert.deepEqual(forecast(state), { remaining: 4, income: 4500, cost: 3200, balance: 4300 });
  state = { ...state, week: 4, earnedSalary: 3375 };
  assert.equal(forecast(state).income, 4500);
  state = { ...state, phase: 'feedback', earnedSalary: 0 };
  assert.equal(forecast(state).remaining, 4);
  state = { ...state, employed: false, money: 1000, health: 10 };
  assert.equal(forecast(state).income, 0);
  assert.match(guidance(state), /健康偏低/); assert.match(guidance(state), /生活费/);
});
test('结局称号按条件分配，不把提前结束记作年度成功', () => {
  const state = { ...createGame(), ending: { kind: 'year' } };
  assert.equal(titleFor({ ...state, level: 4 }).name, '事业生活双赢家');
  assert.equal(titleFor({ ...state, switches: 3 }).name, '职场迁徙家');
  assert.equal(titleFor({ ...state, level: 3 }).name, '从工位到管理层');
  assert.equal(titleFor({ ...state, money: 30000 }).name, '存款带来的底气');
  assert.equal(titleFor(state).name, '生活节奏守护者');
  assert.equal(titleFor({ ...state, health: 50 }).name, '平凡日子的坚持者');
  assert.equal(titleFor({ ...state, level: 4, ending: { kind: 'money' } }).name, '暂时休整，也是选择');
});
