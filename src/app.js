const { createGame, choose, advance } = require('./core/engine');
const { needsPlan, planMonth, seekOpportunity } = require('./core/life');
const { createStorage } = require('./services/storage');
const { createCollection } = require('./services/collection');
const { createWeeklyWeekend, pickTile } = require('./core/weekend');
const { createRenderer } = require('./ui/renderer');
function start(platform) {
  const storage = createStorage(platform), collection = createCollection(platform), renderer = createRenderer(platform);
  let state = storage.load(), view = 'home', lastAction = 0;
  let weekend = null, weekendKey = '';
  let profile = { trait: 'communicator', goal: 'savings' }, journalPage = 0;
  const redraw = () => renderer.render(view, state, actions, [storage.warning(), collection.warning()].filter(Boolean).join(' · '), { profile, collection: collection.get(), journalPage, weekend });
  const save = () => { if (state) { storage.save(state); collection.record(state); } };
  const gameView = () => needsPlan(state) ? 'plan' : 'game';
  const guarded = action => () => {
    const now = Date.now(); if (now - lastAction < 220) return;
    lastAction = now; action(); redraw();
  };
  const actions = {
    newGame: guarded(() => { view = 'setup'; }),
    begin: guarded(() => { state = createGame(Math.random, profile); view = gameView(); save(); }),
    trait: id => guarded(() => { profile.trait = id; })(),
    goal: id => guarded(() => { profile.goal = id; })(),
    resume: guarded(() => { if (state) { view = gameView(); save(); } }),
    confirmNew: guarded(() => { view = 'confirm'; }),
    home: guarded(() => { save(); view = 'home'; }),
    help: guarded(() => { view = 'help'; }),
    collection: guarded(() => { save(); view = 'collection'; }),
    journal: guarded(() => { journalPage = 0; view = 'journal'; }),
    journalPage: delta => guarded(() => { journalPage = Math.max(0, Math.min(Math.ceil(state.life.journal.length / 4) - 1, journalPage + delta)); })(),
    plan: id => guarded(() => { state = planMonth(state, id); view = gameView(); save(); })(),
    seek: guarded(() => { state = seekOpportunity(state); save(); }),
    choose: index => guarded(() => { if (view !== 'game' || needsPlan(state)) return; state = choose(state, index); save(); })(),
    weekend: guarded(() => { if (!state || state.phase !== 'feedback' || state.ending) return; const key = `${state.life.runId}:${state.week}`; if (weekendKey !== key) { weekend = createWeeklyWeekend(state); weekendKey = key; } view = 'weekend'; }),
    tile: index => { if (view !== 'weekend') return; weekend = pickTile(weekend, index); redraw(); },
    advance: guarded(() => { state = advance(state); view = gameView(); save(); })
  };
  collection.record(state);
  if (platform.onScroll) platform.onScroll(renderer.scroll);
  platform.onTap(renderer.tap); platform.onResize(redraw); platform.onHide(save); redraw();
  return { getState: () => state, redraw };
}
module.exports = { start };
