const { validSave } = require('../core/engine');
const { newLife } = require('../core/life');
const SAVE_KEY = 'office-life-save-v1';
function createStorage(platform) {
  let warning = '';
  return {
    load() {
      try {
        const raw = platform.read(SAVE_KEY);
        if (!raw) return null;
        const state = JSON.parse(raw);
        if (!validSave(state)) { warning = '旧存档无法读取，可以重新开始'; return null; }
        if (!state.life) {
          state.life = newLife();
          // 旧年度存档反复打开也使用同一 ID，避免重复增加收藏次数。
          let hash = 2166136261;
          for (let i = 0; i < raw.length; i++) hash = Math.imul(hash ^ raw.charCodeAt(i), 16777619) >>> 0;
          state.life.runId = `legacy-${hash.toString(16)}`;
          try { platform.write(SAVE_KEY, JSON.stringify(state)); }
          catch (_) { warning = '升级存档暂未保存，本次仍可继续游玩'; }
        }
        return state;
      } catch (_) { warning = '存档不可用，可以重新开始'; return null; }
    },
    save(state) {
      try { platform.write(SAVE_KEY, JSON.stringify(state)); warning = ''; }
      catch (_) { warning = '保存失败，本次仍可继续游玩'; }
    },
    warning() { return warning; }
  };
}
module.exports = { createStorage };
