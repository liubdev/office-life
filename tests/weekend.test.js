const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWeekend, pickTile } = require('../src/core/weekend');
const { createGesture } = require('../src/platform/gesture');

test('配对棋盘总能清空；错配、重复点击和无效输入不消除图案', () => {
  let board = createWeekend(() => 0.37);
  const symbols = [...new Set(board.tiles)];
  assert.equal(symbols.length, 6);
  symbols.forEach(symbol => assert.equal(board.tiles.filter(t => t === symbol).length, 2));
  assert.equal(pickTile(board, -1), board);
  board = pickTile(board, 0);
  assert.equal(pickTile(board, 0).selected, null);
  board = pickTile(board, board.tiles.findIndex(t => t !== board.tiles[0]));
  assert.equal(board.matched.length, 0);
  assert.equal(board.moves, 1);
  for (const symbol of symbols) {
    const pair = board.tiles.flatMap((t, i) => t === symbol ? [i] : []);
    board = pickTile(pickTile(board, pair[0]), pair[1]);
    assert.equal(pickTile(board, pair[0]), board);
  }
  assert.equal(board.matched.length, 12);
  assert.match(board.message, /全部消除/);
});

test('惯性滚动逐渐停止；新触摸、取消和边界及时打断，不误触选项', () => {
  let time = 1000, distance = 0, taps = 0, boundary = false;
  const queue = [];
  const gesture = createGesture(() => taps++, delta => { distance += delta; return !boundary; },
    { now: () => time, frame: fn => queue.push(fn) });
  const tick = () => { time += 16; queue.shift()?.(); };
  const swipe = () => { gesture.start(10, 200); time += 16; gesture.move(10, 160); gesture.end(10, 160); };
  swipe(); const released = distance;
  tick(); assert.ok(distance > released);
  gesture.start(10, 100); const stopped = distance; tick(); assert.equal(distance, stopped);
  gesture.cancel(); swipe(); gesture.cancel(); const cancelled = distance; tick(); assert.equal(distance, cancelled);
  swipe(); boundary = true; tick(); assert.equal(queue.length, 0);
  boundary = false; swipe(); for (let i = 0; i < 60 && queue.length; i++) tick();
  assert.equal(queue.length, 0); assert.equal(taps, 0);
});

test('随机周末：三周覆盖三种玩法、不连续重复，同一周重启后抽取一致', () => {
  const { createWeeklyWeekend } = require('../src/core/weekend');
  const firstTypes = new Set();
  for (let run = 0; run < 30; run++) {
    let previous = null, batch = [];
    for (let week = 1; week <= 52; week++) {
      const state = { week, life: { runId: `run-${run}` } };
      const board = createWeeklyWeekend(state);
      assert.deepEqual(board, createWeeklyWeekend(JSON.parse(JSON.stringify(state))));
      assert.notEqual(board.type, previous);
      if (week === 1) firstTypes.add(board.type);
      batch.push(board.type);
      if (week % 3 === 0) { assert.equal(new Set(batch).size, 3); batch = []; }
      previous = board.type;
    }
  }
  assert.equal(firstTypes.size, 3);
});

test('数字漫步：错序不前进，正确顺序完成，完成后不可继续计步', () => {
  let board = createWeekend(() => 0.41, 'numbers');
  board = pickTile(board, board.tiles.indexOf(9));
  assert.equal(board.next, 1); assert.equal(board.matched.length, 0);
  for (let number = 1; number <= 9; number++) board = pickTile(board, board.tiles.indexOf(number));
  assert.equal(board.complete, true); assert.equal(board.matched.length, 9);
  assert.equal(pickTile(board, 0), board);
});

test('熄灯小屋：不跨行翻转、每个随机棋盘都有解，完成后不再变动', () => {
  const empty = { type: 'lights', tiles: Array(9).fill(false), moves: 0, complete: false };
  assert.deepEqual(pickTile(empty, 2).tiles, [false, true, true, false, false, true, false, false, false]);
  for (let seed = 0; seed < 20; seed++) {
    let n = seed;
    const board = createWeekend(() => ((n = (n * 1664525 + 1013904223) >>> 0) / 4294967296), 'lights');
    assert.ok(board.tiles.some(Boolean));
    let solved;
    for (let mask = 1; mask < 512 && !solved; mask++) {
      let attempt = board;
      for (let i = 0; i < 9; i++) if (mask & (1 << i)) attempt = pickTile(attempt, i);
      if (attempt.complete) solved = attempt;
    }
    assert.ok(solved); assert.equal(pickTile(solved, 4), solved);
  }
});
