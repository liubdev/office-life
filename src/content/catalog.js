const { events, layoff, interview } = require('../data/events');
const { stories } = require('../data/stories');
const { CONTENT_PACKS, encounters } = require('../data/life');
// 目前只装载随游戏提供的基础内容。此目录不负责支付或购买凭证。
const packs = [{ ...CONTENT_PACKS[0], events, special: [layoff, interview], stories: [...stories, ...encounters] }];
const regularEvents = packs.flatMap(p => p.events);
const storyEvents = packs.flatMap(p => p.stories);
const allEvents = packs.flatMap(p => [...p.events, ...p.special, ...p.stories]);
module.exports = { packs, regularEvents, storyEvents, allEvents };
