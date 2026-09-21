const { start } = require('../src/app');
const { createBrowserPlatform } = require('../src/platform/browser');
start(createBrowserPlatform());
