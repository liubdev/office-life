const { BADGES } = require('../data/life');
const { titleFor } = require('../core/guidance');
const { goalProgress } = require('../core/life');
const KEY = 'office-life-collection-v1';
const empty = () => ({ version: 1, badges: [], goals: [], runs: [], completed: 0 });
function valid(data) {
  return data && data.version === 1 && Number.isInteger(data.completed) && data.completed >= 0
    && Array.isArray(data.badges) && data.badges.length <= BADGES.length && data.badges.every(n => BADGES.some(b => b.name === n))
    && Array.isArray(data.goals) && data.goals.length <= 3 && data.goals.every(g => ['savings', 'leader', 'balance'].includes(g))
    && Array.isArray(data.runs) && data.runs.length <= 200 && data.runs.every(r => typeof r === 'string' && r.length <= 100);
}
function createCollection(platform) {
  let data = empty(), warning = '';
  try { const raw = platform.read(KEY); if (raw) { const parsed = JSON.parse(raw); if (!valid(parsed)) throw Error(); data = parsed; } }
  catch (_) { warning = '收藏无法读取，已使用空白图鉴'; }
  return {
    get: () => JSON.parse(JSON.stringify(data)), warning: () => warning,
    record(state) {
      if (!state || state.phase !== 'ended' || !state.life || data.runs.includes(state.life.runId)) return;
      const next = JSON.parse(JSON.stringify(data));
      next.runs = [...next.runs, state.life.runId].slice(-200);
      if (state.ending.kind === 'year') {
        next.completed++;
        const badge = titleFor(state).name;
        if (!next.badges.includes(badge)) next.badges.push(badge);
        if (goalProgress(state).met && !next.goals.includes(state.life.goal)) next.goals.push(state.life.goal);
      }
      try { platform.write(KEY, JSON.stringify(next)); data = next; warning = ''; }
      catch (_) { warning = '收藏保存失败，请稍后重试'; }
    }
  };
}
module.exports = { createCollection };
