const { createGesture } = require('./gesture');
function createWechatPlatform(wx) {
  const canvas = wx.createCanvas();
  let scroll = () => {}, gesture;
  const readSize = () => {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const width = info.windowWidth, height = info.windowHeight;
    const safe = info.safeArea || { top: 0, bottom: height, left: 0, right: width };
    let navigation;
    const statusTop = Math.max(safe.top || 0, info.statusBarHeight || 0);
    let menuBottom = Math.max(safe.top || 0, info.statusBarHeight || 0) + 36;
    try {
      const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect();
      if (menu && Number.isFinite(menu.bottom) && menu.bottom > 0 && menu.bottom < height / 2) {
        menuBottom = menu.bottom;
        const menuHeight = menu.bottom - menu.top;
        if (Number.isFinite(menu.left) && menu.left > Math.max(safe.left || 0, 0) + 100 && menu.left < width
          && Number.isFinite(menu.top) && menu.top >= statusTop && menuHeight >= 16 && menuHeight <= 60) {
          navigation = { top: Math.max(statusTop, menu.top + (menuHeight - 44) / 2), right: menu.left - 8 };
        }
      }
    } catch (_) { /* 旧客户端使用导航栏预留空间。 */ }
    return { width, height, dpr: info.pixelRatio || 1, navigation,
      top: Math.max((safe.top || 0) + 8, menuBottom + 8, 64),
      bottom: Math.max(0, height - (Number.isFinite(safe.bottom) ? safe.bottom : height)),
      left: Math.max(0, safe.left || 0), right: Math.max(0, width - (Number.isFinite(safe.right) ? safe.right : width)) };
  };
  return {
    canvas, size: readSize,
    onScroll(handler) { scroll = handler; },
    onTap(handler) {
      gesture = createGesture(handler, (...args) => scroll(...args));
      if (wx.onTouchStart) wx.onTouchStart(event => {
        if (!event.touches || event.touches.length !== 1) { gesture.cancel(); return; }
        const t = event.touches[0]; gesture.start(t.clientX, t.clientY);
      });
      if (wx.onTouchMove) wx.onTouchMove(event => {
        if (!event.touches || event.touches.length !== 1) { gesture.cancel(); return; }
        const t = event.touches[0]; gesture.move(t.clientX, t.clientY);
      });
      wx.onTouchEnd(event => {
        const t = event.changedTouches && event.changedTouches[0]; if (!t) return;
        if (wx.onTouchStart) gesture.end(t.clientX, t.clientY); else handler(t.clientX, t.clientY);
      });
      if (wx.onTouchCancel) wx.onTouchCancel(() => gesture.cancel());
    },
    onResize(handler) { if (wx.onWindowResize) wx.onWindowResize(() => { if (gesture) gesture.cancel(); handler(); }); },
    onHide(handler) { wx.onHide(() => { if (gesture) gesture.cancel(); handler(); }); },
    read: key => wx.getStorageSync(key), write: (key, value) => wx.setStorageSync(key, value)
  };
}
module.exports = { createWechatPlatform };
