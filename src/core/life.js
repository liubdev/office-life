const { TRAITS, GOALS, PEOPLE, PLANS, OPTIONS, RELATIONS } = require('../data/life');
const clamp = n => Math.max(0, Math.min(10, n));
function newLife(profile = {}) {
  return { trait: TRAITS.some(t => t.id === profile.trait) ? profile.trait : null,
    goal: GOALS.some(g => g.id === profile.goal) ? profile.goal : 'savings',
    trust: { lin: 2, zhou: 2, manager: 2 }, plan: null, plannedMonth: 0,
    opportunities: 0, journal: [], runId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}` };
}
function eligible(state, req) {
  const life = state.life;
  return !!life && (!req.trait || life.trait === req.trait) && (!req.person || life.trust[req.person] >= req.trust);
}
function decorateEvent(state, event) {
  if (!event) return event;
  const extras = (OPTIONS[event.id] || []).filter(c => eligible(state, c.requires));
  return { ...event, choices: [...event.choices, ...extras].slice(0, 4) };
}
function needsPlan(state) { return !!state && state.phase === 'playing' && state.week % 4 === 1 && state.life && state.life.plannedMonth < Math.ceil(state.week / 4); }
function planMonth(state, id) {
  const plan = PLANS.find(p => p.id === id);
  if (!needsPlan(state) || !plan || state.money < plan.cost) return state;
  const next = JSON.parse(JSON.stringify(state));
  next.money -= plan.cost; next.life.plan = id; next.life.plannedMonth = Math.ceil(next.week / 4);
  log(next, `月度安排：${plan.name}${plan.cost ? `，支出 ¥${plan.cost}` : ''}`);
  return next;
}
function log(state, text) { state.life.journal.push({ week: state.week, text }); state.life.journal = state.life.journal.slice(-80); }
function relations(state, changes, notices) {
  const summaries = [];
  for (const [id, value] of Object.entries(changes || {})) {
    const before = state.life.trust[id];
    const after = clamp(before + value + (value > 0 && state.life.trait === 'communicator' ? 1 : 0));
    state.life.trust[id] = after;
    if (after !== before) summaries.push(`${PEOPLE.find(p => p.id === id).name}${after > before ? '+' : ''}${after - before}`);
  }
  if (summaries.length) notices.push(`关系 · ${summaries.join(' / ')}`);
}
function applyLife(state, event, choice, index, notices) {
  if (state.life.trait === 'specialist' && (choice.effects.xp || 0) >= 5) { state.xp += 2; notices.push('技术专精 · 额外经验 +2'); }
  if (state.life.trait === 'boundaries' && choice.effects.mood < 0) { const saved = Math.min(2, -choice.effects.mood); state.mood += saved; notices.push(`边界清晰 · 减少精神消耗 ${saved}`); }
  relations(state, choice.relations || (RELATIONS[event.id] || [])[index], notices);
  if (choice.requires) log(state, `解锁选择：${choice.text}`);
  if (event.unlock || choice.action) log(state, `${event.title}：${choice.text}`);
  if (state.week % 4 === 0 && state.life.plan) {
    const plan = PLANS.find(p => p.id === state.life.plan);
    for (const [key, value] of Object.entries(plan.effects)) state[key] += value;
    notices.push(`月度安排完成 · ${plan.name}`);
    if (plan.id === 'connect') relations(state, { lin: 2, zhou: 2, manager: 2 }, notices);
    if (plan.id === 'search') { state.life.opportunities = Math.min(4, state.life.opportunities + 1); notices.push(`求职准备 ${state.life.opportunities}/2 · 可在月初联系人脉`); }
    log(state, `完成安排：${plan.name}`); state.life.plan = null;
  }
}
function seekOpportunity(state) {
  if (!needsPlan(state) || !state.employed || state.life.opportunities < 2 || ['layoff', 'headhunter'].includes(state.eventId)) return state;
  const next = JSON.parse(JSON.stringify(state));
  next.life.opportunities -= 2; next.eventId = 'headhunter';
  log(next, '主动联系猎头，拿到一次面谈机会'); return next;
}
function goalProgress(state) {
  const id = state.life.goal;
  const met = id === 'savings' ? state.money >= 30000 : id === 'leader' ? state.level >= 2 : state.health >= 70 && state.mood >= 70;
  const detail = id === 'savings' ? `¥${Math.max(0, state.money).toLocaleString('en-US')} / ¥30,000` : id === 'leader' ? `职级 ${state.level + 1} / 目标 3` : `健康 ${state.health} · 精神 ${state.mood} / 目标均 70`;
  return { met: met && !!state.ending && state.ending.kind === 'year', detail, name: GOALS.find(g => g.id === id).name };
}
function validLife(life) {
  if (!life || !(life.trait === null || TRAITS.some(t => t.id === life.trait)) || !GOALS.some(g => g.id === life.goal)) return false;
  if (!life.trust || PEOPLE.some(p => !Number.isInteger(life.trust[p.id]) || life.trust[p.id] < 0 || life.trust[p.id] > 10)) return false;
  if (!(life.plan === null || PLANS.some(p => p.id === life.plan)) || !Number.isInteger(life.plannedMonth) || life.plannedMonth < 0 || life.plannedMonth > 13) return false;
  if (!Number.isInteger(life.opportunities) || life.opportunities < 0 || life.opportunities > 4 || typeof life.runId !== 'string' || life.runId.length > 100 || !life.runId) return false;
  return Array.isArray(life.journal) && life.journal.length <= 80 && life.journal.every(e => e && Number.isInteger(e.week) && e.week >= 1 && e.week <= 52 && typeof e.text === 'string' && e.text.length <= 500);
}
module.exports = { newLife, eligible, decorateEvent, needsPlan, planMonth, applyLife, seekOpportunity, goalProgress, validLife, log };
