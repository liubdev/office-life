const { createWechatPlatform } = require('./src/platform/wechat');
const { start } = require('./src/app');
start(createWechatPlatform(wx));
