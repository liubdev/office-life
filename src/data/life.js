// 基础内容包：稳定 ID 用于存档，后续章节可复用条件与效果协议。
const CONTENT_PACKS = [{ id: 'base', name: '第一张工牌', version: '1.2.0', included: true }];
const TRAITS = [
  { id: 'communicator', name: '擅长沟通', text: '建立关系时额外 +1 信任；解锁协调选项。' },
  { id: 'specialist', name: '技术专精', text: '事件获得至少 5 经验时额外 +2；解锁技术选项。' },
  { id: 'boundaries', name: '边界清晰', text: '事件精神损耗减少 2；解锁边界选项。' }
];
const GOALS = [
  { id: 'savings', name: '自由基金', text: '完成一年，存款达到 ¥30,000。' },
  { id: 'leader', name: '第一次带队', text: '完成一年，成为项目组长或更高职级。' },
  { id: 'balance', name: '把生活过好', text: '完成一年，健康与精神均不低于 70。' }
];
const PEOPLE = [{ id: 'lin', name: '小林', role: '一起成长的同事' }, { id: 'zhou', name: '周姐', role: '经验丰富的前辈' }, { id: 'manager', name: '陈主管', role: '看重承诺与交付' }];
const PLANS = [
  { id: 'study', name: '进修技能', text: '现在花 ¥400；月末经验 +10、精神 −3。', cost: 400, effects: { xp: 10, mood: -3 } },
  { id: 'connect', name: '经营关系', text: '现在花 ¥200；月末信任各 +2、精神 +4。', cost: 200, effects: { mood: 4 } },
  { id: 'rest', name: '留时间给生活', text: '月末健康 +8、精神 +8；支出 ¥200。', cost: 0, effects: { health: 8, mood: 8, money: -200 } },
  { id: 'search', name: '寻找新机会', text: '月末精神 −4；积累 2 次后可主动联系猎头。', cost: 0, effects: { mood: -4 } }
];
const BADGES = [
  { name: '事业生活双赢家', hint: '最高职级，健康与精神均达到 60。' },
  { name: '职场迁徙家', hint: '完成一年，成功跳槽至少 3 次。' },
  { name: '从工位到管理层', hint: '完成一年，成为主管或合伙人。' },
  { name: '存款带来的底气', hint: '完成一年，存款至少 ¥30,000。' },
  { name: '生活节奏守护者', hint: '完成一年，健康与精神均达到 70。' },
  { name: '平凡日子的坚持者', hint: '走完 52 周，写完自己的故事。' }
];
const extra = (text, effects, result, requires, relations = {}) => ({ text, effects, result, requires, relations });
const OPTIONS = {
  'production': [extra('写诊断脚本，快速缩小范围', { xp: 10, health: -2, mood: -2 }, '技术积累派上了用场，你用脚本找出了异常。', { trait: 'specialist' }, { zhou: 1 })],
  'automation': [extra('和周姐一起做成团队工具', { xp: 9, favor: 6, health: -2 }, '周姐提供业务经验，你负责实现。工具开始服务整个团队。', { person: 'zhou', trust: 6 }, { zhou: 1 })],
  'meeting': [extra('分别确认诉求，再定行动清单', { xp: 6, favor: 5, mood: 2 }, '你让沉默的人也参与进来，会议终于结束。', { trait: 'communicator' }, { manager: 1 })],
  'scope': [extra('按约定拆分交付，守住边界', { xp: 5, favor: 2, mood: 6 }, '提前说清的原则，成为了这次排期的依据。', { trait: 'boundaries' }, { manager: 1 })],
  'sick': [extra('请小林接手，安心休息', { health: 15, mood: 7 }, '你留下了清晰的交接，小林稳稳接住了任务。', { person: 'lin', trust: 6 }, { lin: -1 })],
  'blame': [extra('请陈主管一起核对决策记录', { favor: 5, mood: 4, xp: 4 }, '积累的信任让主管愿意一起还原事实。', { person: 'manager', trust: 6 }, { manager: -1 })],
  'late-message': [extra('请小林协作，分担紧急任务', { xp: 5, favor: 6, health: -2 }, '你们明确了分工，没有让任何一个人熬通宵。', { person: 'lin', trust: 6 }, { lin: -1 })],
  'demo': [extra('准备自动检查和备用演示', { xp: 9, favor: 6, health: -2 }, '之前练过的技术，让临场准备更从容。', { trait: 'specialist' }, { zhou: 1 })]
};
// 普通事件同样会积累关系；关系不是老板好感的替代品。
const RELATIONS = {
  'mentor-start': [{ lin: 3 }, { lin: -1 }], 'mentor-help': [{ lin: 2 }, { lin: 2 }],
  'mentor-alone': [{ lin: 2 }, { lin: -1 }], 'mentor-finish': [{ lin: 2 }, { lin: 1 }],
  newbie: [{ lin: 2 }, { lin: 1 }, { lin: -1 }], coffee: [{ lin: 1, zhou: 1 }, {}, {}],
  review: [{ manager: 2 }, { manager: 1 }, { manager: -1 }],
  automation: [{ zhou: 2 }, { zhou: 1 }, {}], conference: [{ zhou: 2 }, { manager: 1 }, {}],
  scope: [{ manager: 1 }, { manager: 1 }, { manager: -1 }]
};
const encounters = [
  { id: 'zhou-invite', tag: '周姐的邀约', title: '周姐想和你做一次分享', text: '她记得你之前的投入，邀请你一起整理团队踩过的坑。', unlock: { week: 14, person: 'zhou', trust: 5 }, choices: [
    { text: '一起准备，让经验被看见', effects: { xp: 12, health: -5, favor: 5 }, relations: { zhou: 2 }, result: '你们把零散经验做成了分享，更多同事认识了你。' },
    { text: '提供资料，把舞台留给她', effects: { mood: 6, xp: 4 }, relations: { zhou: 1 }, result: '你贡献了案例，也保住了自己的下班时间。' }
  ] },
  { id: 'manager-promise', tag: '陈主管的委托', title: '一次更难的任务', text: '陈主管想让你负责跨组协调。信任带来了机会，也带来了新的压力。', unlock: { week: 24, person: 'manager', trust: 6 }, choices: [
    { text: '争取资源后接下任务', effects: { xp: 14, favor: 6, mood: -6 }, relations: { manager: 2 }, result: '你明确了资源和责任，第一次站到跨组协作的中心。' },
    { text: '坦诚说明容量，推荐同事', effects: { mood: 8, favor: -3 }, relations: { manager: -1 }, result: '主管有些失望，但你没有作出无法兑现的承诺。' }
  ] },
  { id: 'lin-reunion', tag: '同事情谊 · 后来', title: '小林也开始带新人了', text: '他拿出你曾经留下的手册，说想把这份帮助继续传下去。', unlock: { week: 36, person: 'lin', trust: 6 }, choices: [
    { text: '一起更新这份手册', effects: { xp: 9, mood: 8, health: -3 }, relations: { lin: 2 }, result: '手册上多了新的名字。曾经的帮助变成了团队的习惯。' },
    { text: '让他试试自己的方法', effects: { mood: 10, health: 4 }, relations: { lin: 1 }, result: '你把选择权交给他，他已经能够独当一面。' }
  ] }
];
module.exports = { CONTENT_PACKS, TRAITS, GOALS, PEOPLE, PLANS, BADGES, OPTIONS, RELATIONS, encounters };
