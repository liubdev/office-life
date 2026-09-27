const { TRAITS, GOALS, PEOPLE, PLANS, BADGES } = require('../data/life');
const { goalProgress } = require('../core/life');
const { C } = require('./layout');
const { TITLES } = require('../core/weekend');
function setup(ui, actions, profile) {
  ui.heading('领取你的专属工牌', '一种特质，一个目标。这一年由你来安排。');
  ui.paragraph('01 / 你擅长怎样解决问题', { color: C.green, bold: true });
  TRAITS.forEach(t => ui.card(`${profile.trait === t.id ? '●' : '○'} ${t.name}`, t.text, { selected: profile.trait === t.id, action: () => actions.trait(t.id) }));
  ui.spacer(8); ui.paragraph('02 / 你想怎样走完这一年', { color: C.green, bold: true });
  GOALS.forEach(g => ui.card(`${profile.goal === g.id ? '●' : '○'} ${g.name}`, g.text, { selected: profile.goal === g.id, action: () => actions.goal(g.id) }));
  ui.paragraph('特质会解锁新选择；目标在年度结束时评定。', { size: 13 });
}
function plan(ui, state, actions) {
  ui.heading(`第 ${Math.ceil(state.week / 4)} 期 · 先安排自己`, '每 4 周选一项安排，不消耗周数；收益在期末结算。');
  const goal = goalProgress(state);
  ui.card(goal.name, `${goal.detail}\n可用存款 ¥${state.money.toLocaleString('en-US')} · 生活费另计`, { dark: true });
  // 主动邀约放在安排之前，避免玩家选完安排后错过入口。
  if (state.life.opportunities >= 2 && state.employed && !['layoff', 'headhunter'].includes(state.eventId)) {
    ui.card('用 2 次求职准备，联系猎头', '先联系再选安排：本周事件将替换为猎头邀约。', { primary: true, action: actions.seek });
  } else {
    ui.paragraph(state.eventId === 'headhunter' ? '猎头已约好，选好安排后进入面谈。' : `求职准备 ${state.life.opportunities}/2 · 累积后可在月初联系猎头。`, { size: 13, color: C.green });
  }
  PLANS.forEach(p => ui.card(`${p.name}${state.money >= p.cost ? '' : ' · 存款不足'}`, p.text, { action: () => actions.plan(p.id), disabled: state.money < p.cost }));
  ui.paragraph('安排支出立即扣除；月末收益需要走到第 4 周，提前结束不会补发。', { size: 13 });
}
function journal(ui, state, actions, page) {
  const goal = goalProgress(state), trait = TRAITS.find(t => t.id === state.life.trait);
  ui.heading('我的职场手记', `${trait ? trait.name : '熟悉的自己'} · ${goal.name}`);
  ui.card(goal.met ? '年度目标已达成' : '我的年度目标', goal.detail, { fill: C.pale });
  PEOPLE.forEach(p => {
    const value = state.life.trust[p.id];
    ui.card(`${p.name} · ${value >= 6 ? '彼此信任' : value >= 3 ? '逐渐熟悉' : '保持距离'}`, `${p.role} · 信任 ${value}/10`);
  });
  ui.paragraph('信任达到 6 可解锁协作；求助也会消耗信任。', { size: 13 });
  const entries = state.life.journal.slice().reverse(), pages = Math.max(1, Math.ceil(entries.length / 4));
  ui.paragraph(`最近的决定 · ${page + 1}/${pages}`, { bold: true, color: C.ink });
  if (!entries.length) ui.paragraph('故事从你做出的第一个安排开始。');
  entries.slice(page * 4, page * 4 + 4).forEach(e => ui.card(`第 ${e.week} 周`, e.text));
  const buttons = [];
  if (page > 0) buttons.push({ title: '较新记录', action: () => actions.journalPage(-1) });
  if (page + 1 < pages) buttons.push({ title: '较早记录', action: () => actions.journalPage(1) });
  if (buttons.length) ui.buttons(buttons);
}
function collection(ui, data) {
  ui.heading('那些不同的职场人生', `已完成 ${data.completed} 个年度 · 称号 ${data.badges.length}/${BADGES.length}`);
  BADGES.forEach(b => ui.card(`${data.badges.includes(b.name) ? '●' : '○'} ${b.name}`, b.hint, { fill: data.badges.includes(b.name) ? C.pale : C.white }));
  ui.paragraph(`年度目标已达成 ${data.goals.length}/3\n重新开始会保留收藏。`, { color: C.green });
  ui.paragraph('收藏只保存在本机。清除数据或更换设备后不会同步。', { size: 13 });
}
function weekend(ui, board, actions) {
  if (!board) return;
  const type = board.type || 'pairs', columns = type === 'pairs' ? 4 : 3;
  ui.heading('周末，放空一下', TITLES[type]);
  if (type === 'lights') ui.paragraph(`还亮着 ${board.tiles.filter(Boolean).length} 盏 · 已走 ${board.moves} 步`, { color: C.green });
  else {
    const count = board.matched.length / (type === 'pairs' ? 2 : 1), total = type === 'pairs' ? 6 : 9;
    ui.progress(count, total, `${count} / ${total} · 尝试 ${board.moves} 次`);
  }
  for (let row = 0; row < 3; row++) {
    ui.buttons(board.tiles.slice(row * columns, row * columns + columns).map((symbol, col) => {
      const index = row * columns + col, done = type !== 'lights' && board.matched.includes(index);
      const title = type === 'lights' ? (symbol ? '●' : '○') : done ? '✓' : String(symbol);
      const label = type === 'lights' ? `灯 ${index + 1}：${symbol ? '亮' : '灭'}` : type === 'numbers' ? `数字 ${symbol}` : `图案 ${index + 1}：${symbol}`;
      return { title, size: 24, center: true, disabled: done || board.complete,
        selected: type === 'lights' ? symbol : board.selected === index, color: done ? C.line : C.green,
        label, action: () => actions.tile(index) };
    }));
  }
  ui.paragraph(board.message, { color: C.green });
  ui.paragraph('纯放松，不影响属性；随时可以进入下一周。', { size: 12 });
}
module.exports = { setup, plan, journal, collection, weekend };
