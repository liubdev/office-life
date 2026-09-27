const SYMBOLS = ['☕', '♫', '★', '☀', '☂', '✿'];
const TYPES = ['pairs', 'numbers', 'lights'];
const TITLES = { pairs: '配对消消乐', numbers: '数字漫步', lights: '熄灯小屋' };
function shuffle(items, rng) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(rng() * (i + 1))));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function toggleLights(tiles, index) {
  return tiles.map((on, i) => Math.abs(Math.floor(i / 3) - Math.floor(index / 3)) + Math.abs(i % 3 - index % 3) <= 1 ? !on : on);
}
function createWeekend(rng = Math.random, type = 'pairs') {
  if (type === 'numbers') return { type, tiles: shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng), matched: [], next: 1, moves: 0, complete: false, message: '从 1 到 9，依次点亮数字。' };
  if (type === 'lights') {
    let tiles = Array(9).fill(false);
    // Scramble a solved board with legal moves, so every puzzle has a solution.
    shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8], rng).slice(0, 4).forEach(i => { tiles = toggleLights(tiles, i); });
    if (!tiles.some(Boolean)) tiles = toggleLights(tiles, 4);
    return { type, tiles, moves: 0, complete: false, message: '点击一格，翻转自己和上下左右的灯；全部熄灭即可。' };
  }
  return { type: 'pairs', tiles: shuffle([...SYMBOLS, ...SYMBOLS], rng), matched: [], selected: null, moves: 0, complete: false, message: '点两个相同图案即可消除，不限时。' };
}
function seededRandom(value) {
  let seed = 2166136261;
  for (const char of value) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function createWeeklyWeekend(state) {
  const run = state.life && state.life.runId || 'legacy';
  const week = Math.max(1, state.week), block = Math.floor((week - 1) / TYPES.length);
  let bag, previous;
  for (let i = 0; i <= block; i++) {
    bag = shuffle(TYPES, seededRandom(`${run}:bag:${i}`));
    if (bag[0] === previous) [bag[0], bag[1]] = [bag[1], bag[0]];
    previous = bag[bag.length - 1];
  }
  return createWeekend(seededRandom(`${run}:board:${week}`), bag[(week - 1) % TYPES.length]);
}
function pickTile(board, index) {
  if (!board || board.complete || !Number.isInteger(index) || index < 0 || index >= board.tiles.length) return board;
  if (board.type === 'lights') {
    const tiles = toggleLights(board.tiles, index), complete = !tiles.some(Boolean);
    return { ...board, tiles, complete, moves: board.moves + 1, message: complete ? '灯都熄了，晚安，好好休息。' : '点击翻转自己和上下左右的灯，试着全部熄灭。' };
  }
  if (board.matched.includes(index)) return board;
  if (board.type === 'numbers') {
    if (board.tiles[index] !== board.next) return { ...board, moves: board.moves + 1, message: `下一步找 ${board.next}，不用着急。` };
    const complete = board.next === 9;
    return { ...board, matched: [...board.matched, index], next: board.next + 1, moves: board.moves + 1, complete,
      message: complete ? '走完九步，思绪也清爽了。' : `很好，接下来找 ${board.next + 1}。` };
  }
  if (board.selected === index) return { ...board, selected: null };
  if (board.selected === null) return { ...board, selected: index };
  const matched = board.tiles[board.selected] === board.tiles[index];
  const next = { ...board, selected: null, moves: board.moves + 1,
    matched: matched ? [...board.matched, board.selected, index] : board.matched,
    message: matched ? '配对成功！' : '图案不同，再试试。' };
  if (next.matched.length === next.tiles.length) { next.complete = true; next.message = '全部消除！带着好心情迎接下一周。'; }
  return next;
}
module.exports = { createWeekend, createWeeklyWeekend, pickTile, TYPES, TITLES };
