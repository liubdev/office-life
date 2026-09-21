const { CAREERS, LIVING_COST } = require('./config');
const { PLANS } = require('../data/life');
function forecast(state) {
  const remaining = state.phase === 'playing' ? 4 - ((state.week - 1) % 4) : 4 - (state.week % 4);
  const monthly = state.employed ? CAREERS[state.level].salary + state.salaryBonus : 0;
  const income = Math.round(state.earnedSalary + monthly * remaining / 4);
  return { remaining, income, cost: LIVING_COST, balance: state.money + income - LIVING_COST + ((PLANS.find(p => state.life && p.id === state.life.plan) || { effects: {} }).effects.money || 0) };
}
function guidance(state) {
  const risks = [];
  if (state.health <= 25) risks.push('健康偏低，优先休息');
  if (state.mood <= 25) risks.push('精神紧张，减少消耗');
  if (forecast(state).balance < 0) risks.push('预计结余不足生活费');
  if (state.employed && state.favor <= 25) risks.push('好感偏低，留意岗位风险');
  return risks.join(' · ') || (state.week <= 2 ? '选项下方是直接影响；选择后本周结束。' : '健康或精神归零、存款低于零会结束旅程。');
}
function titleFor(state) {
  if (state.ending && state.ending.kind !== 'year') return { name: '暂时休整，也是选择', hint: '下一局目标：健康与精神保持在 25 以上。' };
  if (state.level === 4 && state.health >= 60 && state.mood >= 60) return { name: '事业生活双赢家', hint: '最高职级，健康与精神均达到 60。' };
  if (state.switches >= 3) return { name: '职场迁徙家', hint: '完成一年，并成功跳槽至少 3 次。' };
  if (state.level >= 3) return { name: '从工位到管理层', hint: '完成一年，并成为主管或合伙人。' };
  if (state.money >= 30000) return { name: '存款带来的底气', hint: '完成一年，留下至少 ¥30,000 存款。' };
  if (state.health >= 70 && state.mood >= 70) return { name: '生活节奏守护者', hint: '完成一年，健康与精神均达到 70。' };
  return { name: '平凡日子的坚持者', hint: '走完 52 周，就是属于你的第一份成就。' };
}
module.exports = { forecast, guidance, titleFor };
