const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGame, choose, advance, salary, eventFor, validSave, validateEvents } = require('../src/core/engine');
const { events, layoff, interview } = require('../src/data/events');
const { createStorage } = require('../src/services/storage');
function fixture(fields = {}) { return { ...createGame(() => 0), ...fields }; }
test('内容库至少20条事件，ID唯一，选项及效果合法', () => {
  assert.ok(events.length >= 20);
  assert.equal(validateEvents([...events, layoff, interview]), true);
  assert.throws(() => validateEvents([events[0], events[0]]));
  assert.throws(() => validateEvents([{ ...events[0], choices: [] }]));
});
test('开局、选择、实际变化反馈、下一周及重复点击防护', () => {
  const state = createGame(() => 0), next = choose(state, 0);
  assert.equal(state.health, 80);
  assert.equal(next.health, 71); assert.equal(next.feedback.deltas.health, -9);
  assert.equal(next.phase, 'feedback'); assert.equal(choose(next, 0), next);
  assert.equal(choose(state, -1), state); assert.equal(choose(state, 1.5), state);
  const resumed = advance(next, () => 0);
  assert.equal(resumed.week, 2); assert.notEqual(resumed.eventId, state.eventId);
  assert.equal(advance(resumed), resumed);
});
test('属性上限反馈显示实际增量', () => {
  const next = choose(fixture({ health: 99, mood: 99, eventId: 'exercise' }), 0);
  assert.equal(next.health, 100); assert.equal(next.feedback.deltas.health, 1);
  assert.equal(next.mood, 100);
});
test('四个在岗周累计工资并扣除一次生活费', () => {
  let state = fixture({ eventId: 'quiet-day' });
  for (let i = 0; i < 4; i++) {
    state.eventId = 'quiet-day'; state = choose(state, 1);
    if (i < 3) state = advance(state, () => 0);
  }
  assert.equal(state.money, 4300); assert.equal(state.earnedSalary, 0);
  assert.ok(state.feedback.notices.some(n => n.includes('4500')));
});
test('晋升只在结算周，要求经验、好感且仍在职', () => {
  const base = { week: 4, xp: 24, favor: 60, eventId: 'quiet-day' };
  const next = choose(fixture(base), 1);
  assert.equal(next.level, 1); assert.equal(salary(next), 6500); assert.equal(next.promotions, 1);
  assert.equal(choose(fixture({ ...base, week: 3 }), 1).level, 0);
  assert.equal(choose(fixture({ ...base, favor: 54 }), 1).level, 0);
  assert.equal(choose(fixture({ ...base, employed: false }), 1).level, 0);
});
test('跳槽加薪并重置信任，不追溯修改本周工资', () => {
  const next = choose(fixture({ eventId: 'headhunter' }), 0);
  assert.equal(salary(next), 5300); assert.equal(next.favor, 45);
  assert.equal(next.earnedSalary, 1125); assert.equal(next.switches, 1);
});
test('低好感触发裁员，领取补偿后进入求职，再就业保留职级', () => {
  const low = choose(fixture({ favor: 16, eventId: 'late-message' }), 2);
  const layoffState = advance(low, () => 0);
  assert.equal(layoffState.eventId, 'layoff');
  const fired = choose(layoffState, 0);
  assert.equal(fired.employed, false); assert.equal(salary(fired), 0);
  assert.equal(fired.money, 8000);
  const seeking = advance(fired, () => 0);
  assert.equal(seeking.eventId, 'interview');
  const hired = choose(seeking, 0);
  assert.equal(hired.employed, true); assert.equal(hired.favor, 45); assert.equal(hired.level, fired.level);
});
test('内部转岗清除薪资补贴，待业休整仍留在求职流程', () => {
  const transfer = choose(fixture({ salaryBonus: 1600, eventId: 'layoff' }), 1);
  assert.equal(transfer.salaryBonus, 0); assert.equal(transfer.employed, true);
  const rest = choose(fixture({ employed: false, favor: 0, eventId: 'interview' }), 1);
  assert.equal(advance(rest, () => 0).eventId, 'interview');
});
test('失业期间不累计工资，生活费仍结算', () => {
  const next = choose(fixture({ week: 4, money: 10000, earnedSalary: 1125, employed: false, eventId: 'interview' }), 1);
  assert.equal(next.money, 7575); assert.equal(next.earnedSalary, 0);
});
test('健康、精神、破产及52周均能结束，结局先展示反馈', () => {
  const fixtures = [
    [{ health: 1, eventId: 'late-message' }, 0, 'health'],
    [{ mood: 1, eventId: 'late-message' }, 0, 'mood'],
    [{ money: 0, eventId: 'coffee' }, 0, 'money'],
    [{ week: 52, eventId: 'quiet-day' }, 1, 'year']
  ];
  for (const [fields, index, reason] of fixtures) {
    const result = choose(fixture(fields), index);
    assert.equal(result.ending.kind, reason); assert.equal(result.phase, 'feedback');
    const end = advance(result); assert.equal(end.phase, 'ended'); assert.equal(advance(end), end);
    assert.equal(validSave(end), true);
  }
  assert.equal(createGame().week, 1);
});
test('存档往返、损坏、版本不匹配、写入失败均不崩溃', () => {
  let data = '';
  const storage = createStorage({ read: () => data, write: (_, value) => { data = value; } });
  const state = choose(createGame(() => 0), 0);
  storage.save(state); assert.deepEqual(storage.load(), state);
  data = '{invalid'; assert.equal(storage.load(), null);
  data = JSON.stringify({ ...state, version: 0 }); assert.equal(storage.load(), null);
  assert.equal(validSave({ ...state, feedback: {} }), false);
  assert.equal(validSave({ ...state, health: NaN }), false);
  const blocked = createStorage({ read: () => { throw Error(); }, write: () => { throw Error(); } });
  assert.equal(blocked.load(), null); blocked.save(state); assert.ok(blocked.warning());
});
test('100个可复现随机人生均在52周内结束，状态可保存且数值有限', () => {
  for (let seed = 1; seed <= 100; seed++) {
    let n = seed; const rng = () => ((n = (n * 1664525 + 1013904223) >>> 0) / 4294967296);
    let state = createGame(rng), turns = 0;
    while (state.phase !== 'ended') {
      state = choose(state, Math.floor(rng() * eventFor(state).choices.length));
      assert.equal(validSave(state), true);
      state = advance(state, rng); turns++;
      assert.ok(turns <= 52);
    }
  }
});
