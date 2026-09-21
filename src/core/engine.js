const { CAREERS, MAX_WEEKS, LIVING_COST, SAVE_VERSION } = require('./config');
const { regularEvents: events, storyEvents: stories, allEvents: ALL_EVENTS } = require('../content/catalog');
const { PEOPLE, TRAITS } = require('../data/life');
const { newLife, eligible, decorateEvent, applyLife, validLife, log } = require('./life');
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const copy = value => JSON.parse(JSON.stringify(value));

function validateEvents(list) {
  const ids = new Set();
  for (const event of list) {
    if (!event.id || ids.has(event.id) || !event.title || !event.text || !event.tag) throw new Error('事件字段或 ID 无效');
    ids.add(event.id);
    if (!Array.isArray(event.choices) || event.choices.length < 2 || event.choices.length > 4) throw new Error('每个事件必须有 2–4 个选项');
    for (const choice of event.choices) {
      if (!choice.text || !choice.result || !choice.effects) throw new Error('选项字段不完整');
      for (const [key, value] of Object.entries(choice.effects)) {
        if (!['money', 'health', 'mood', 'favor', 'xp'].includes(key) || !Number.isFinite(value)) throw new Error('属性效果无效');
      }
      if (choice.relations && Object.entries(choice.relations).some(([id, value]) => !PEOPLE.some(p => p.id === id) || !Number.isInteger(value))) throw new Error('关系效果无效');
      if (choice.requires && ((choice.requires.trait && !TRAITS.some(t => t.id === choice.requires.trait)) || (choice.requires.person && (!PEOPLE.some(p => p.id === choice.requires.person) || !Number.isInteger(choice.requires.trust))))) throw new Error('解锁条件无效');
      if (choice.action && !['switchJob', 'loseJob', 'transfer', 'hire'].includes(choice.action)) throw new Error('职业动作无效');
    }
  }
  return true;
}
validateEvents(ALL_EVENTS);

function salary(state) { return state.employed ? CAREERS[state.level].salary + state.salaryBonus : 0; }
function eventFor(state) { return decorateEvent(state, ALL_EVENTS.find(event => event.id === state.eventId)); }
function selectEvent(state, rng) {
  if (!state.employed) return 'interview';
  if (state.favor <= 15 || ([12, 28, 44].includes(state.week) && state.favor < 50)) return 'layoff';
  const story = state.story || { seen: [], flags: [] };
  const node = stories.find(event => {
    const u = event.unlock;
    return !story.seen.includes(event.id) && state.week >= u.week && state.level >= (u.level || 0)
      && (!u.person || eligible(state, u))
      && (!u.after || story.seen.includes(u.after)) && (!u.flag || story.flags.includes(u.flag))
      && !(event.id === 'mentor-alone' && story.seen.includes('mentor-help'))
      && !(event.id === 'mentor-help' && story.seen.includes('mentor-alone'));
  });
  if (node) return node.id;
  const pool = events.filter(event => (!event.minXp || state.xp >= event.minXp) && !state.recent.includes(event.id));
  return pool[Math.min(pool.length - 1, Math.floor(clamp(rng(), 0, 1) * pool.length))].id;
}
function createGame(rng = Math.random, profile = {}) {
  const state = {
    version: SAVE_VERSION, phase: 'playing', week: 1,
    money: 3000, health: 80, mood: 80, favor: 50, xp: 0,
    level: 0, employed: true, salaryBonus: 0, earnedSalary: 0,
    switches: 0, promotions: 0, recent: [], eventId: '', feedback: null, ending: null,
    life: newLife(profile), story: { seen: [], flags: [] }
  };
  state.eventId = selectEvent(state, rng);
  return state;
}
function endReason(state) {
  if (state.health <= 0) return { title: '身体按下了暂停键', text: '你需要停下来休养。下一次，试着给休息留一点空间。', kind: 'health' };
  if (state.mood <= 0) return { title: '先找回自己的生活', text: '长期消耗让你决定离开职场。工作之外，还有很多值得期待的事。', kind: 'mood' };
  if (state.money < 0) return { title: '现金流告急', text: '存款已不足以支撑生活，这段职场旅程暂时结束。', kind: 'money' };
  if (state.week >= MAX_WEEKS) return { title: '这一年，辛苦了', text: state.level >= 3 ? '你带着成长走过四季，也学会在事业和生活之间做选择。' : '走完一年就值得给自己鼓掌。你的职场故事，还可以有另一种写法。', kind: 'year' };
  return null;
}
function choose(state, index) {
  if (state.phase !== 'playing') return state;
  const event = eventFor(state);
  if (!Number.isInteger(index) || !event || !event.choices[index]) return state;
  const next = copy(state);
  const choice = event.choices[index];
  next.life = next.life || newLife();
  const notices = [];
  // v1 存档没有剧情字段，第一次选择时平滑补齐。
  next.story = next.story || { seen: [], flags: [] };
  if (event.unlock && !next.story.seen.includes(event.id)) next.story.seen.push(event.id);
  if (choice.flag && !next.story.flags.includes(choice.flag)) next.story.flags.push(choice.flag);
  // 按实际在岗周数累计工资，跳槽、离职不会追溯改变已工作的工资。
  next.earnedSalary += salary(state) / 4;
  for (const [key, value] of Object.entries(choice.effects)) next[key] += value;
  if (choice.action === 'switchJob') {
    next.salaryBonus += 800; next.switches++; next.favor = 45;
    notices.push('跳槽成功 · 月薪 +¥800，老板好感重置为 45');
  } else if (choice.action === 'loseJob') {
    next.employed = false; next.favor = 0;
    notices.push('进入待业状态 · 在岗期间已累计的工资仍会结算');
  } else if (choice.action === 'transfer') {
    next.salaryBonus = 0; next.favor = 45;
    notices.push('内部转岗 · 职级保留，月薪补贴归零，好感重置为 45');
  } else if (choice.action === 'hire') {
    next.employed = true; next.salaryBonus = 0; next.favor = 45;
    notices.push('重新入职 · 职级保留，好感重置为 45');
  }
  applyLife(next, event, choice, index, notices);
  for (const key of ['health', 'mood', 'favor']) next[key] = clamp(next[key], 0, 100);
  next.xp = Math.max(0, next.xp);
  if (next.week % 4 === 0) {
    const pay = Math.round(next.earnedSalary);
    next.money += pay - LIVING_COST;
    next.earnedSalary = 0;
    notices.push(`月度结算 · 工资 +¥${pay} / 生活费 −¥${LIVING_COST}`);
  }
  next.ending = endReason(next);
  const target = CAREERS[next.level + 1];
  if (!next.ending && next.employed && next.week % 4 === 0 && target && next.xp >= target.xp && next.favor >= 55) {
    next.level++; next.promotions++; next.favor = clamp(next.favor - 8, 0, 100);
    notices.push(`晋升为${target.name} · 新月薪 ¥${salary(next)}，好感 −8`);
  }
  if (next.level > state.level) log(next, `晋升为${CAREERS[next.level].name}`);
  const deltas = {};
  for (const key of ['money', 'health', 'mood', 'favor', 'xp']) deltas[key] = next[key] - state[key];
  for (const notice of notices) log(next, notice);
  next.feedback = { title: choice.text, text: choice.result, deltas, notices };
  next.phase = 'feedback';
  next.recent = [...next.recent, event.id].slice(-6);
  return next;
}
function advance(state, rng = Math.random) {
  if (state.phase !== 'feedback') return state;
  const next = copy(state);
  if (next.ending) { next.phase = 'ended'; return next; }
  next.week++;
  next.phase = 'playing'; next.feedback = null;
  next.eventId = selectEvent(next, rng);
  return next;
}
function validSave(state) {
  if (!state || state.version !== SAVE_VERSION || !['playing', 'feedback', 'ended'].includes(state.phase)) return false;
  if (state.life !== undefined && !validLife(state.life)) return false;
  if (state.story !== undefined) {
    const s = state.story;
    if (!s || !Array.isArray(s.seen) || !Array.isArray(s.flags) || s.seen.length > stories.length || s.flags.length > 6) return false;
    if (s.seen.some(id => !stories.some(event => event.id === id)) || s.flags.some(f => !['mentored', 'independent', 'buffered', 'rushed', 'caring'].includes(f))) return false;
  }
  for (const key of ['week', 'money', 'health', 'mood', 'favor', 'xp', 'level', 'salaryBonus', 'earnedSalary', 'switches', 'promotions']) {
    if (!Number.isFinite(state[key])) return false;
  }
  if (!Number.isInteger(state.week) || state.week < 1 || state.week > MAX_WEEKS || !Number.isInteger(state.level) || !CAREERS[state.level]) return false;
  if (['health', 'mood', 'favor'].some(key => state[key] < 0 || state[key] > 100)) return false;
  if (typeof state.employed !== 'boolean' || state.xp < 0 || state.salaryBonus < 0 || state.earnedSalary < 0) return false;
  if (!eventFor(state) || !Array.isArray(state.recent) || state.recent.length > 6 || state.recent.some(id => !ALL_EVENTS.some(event => event.id === id))) return false;
  if (state.ending !== null && (!state.ending || !['health', 'mood', 'money', 'year'].includes(state.ending.kind) || typeof state.ending.title !== 'string' || typeof state.ending.text !== 'string')) return false;
  if (state.phase === 'playing' && (state.ending || state.feedback)) return false;
  if (state.phase === 'ended' && !state.ending) return false;
  if (state.phase !== 'playing') {
    const f = state.feedback;
    if (!f || typeof f.title !== 'string' || typeof f.text !== 'string' || !Array.isArray(f.notices) || f.notices.some(n => typeof n !== 'string') || !f.deltas) return false;
    if (['money', 'health', 'mood', 'favor', 'xp'].some(key => !Number.isFinite(f.deltas[key]))) return false;
  }
  return true;
}
module.exports = { createGame, choose, advance, salary, eventFor, selectEvent, validSave, validateEvents, endReason };
