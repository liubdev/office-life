// 只出现一次的剧情节点。后续节点由之前的选择解锁。
const c = (text, effects, result, flag) => ({ text, effects, result, ...(flag ? { flag } : {}) });
const stories = [
  { id: 'mentor-start', tag: '同事情谊 · 1', title: '新人小林坐到了你旁边', text: '小林第一次独立接任务，反复向你确认。带他入门，会占用你的时间。', unlock: { week: 3 }, choices: [
    c('抽半天教他，留下排查手册', { health: -5, mood: -3, xp: 5 }, '小林认真记下每一步。你们建立起了信任。', 'mentored'),
    c('给他资料，让他先独立尝试', { mood: 4, xp: 2 }, '你保住了自己的节奏，小林开始独自摸索。', 'independent') ] },
  { id: 'mentor-help', tag: '同事情谊 · 2', title: '这次，小林站了出来', text: '紧急问题撞上你的家庭安排。你曾经帮助的小林说：“我可以接一部分。”', unlock: { week: 7, after: 'mentor-start', flag: 'mentored' }, choices: [
    c('信任他，完成交接后回家', { mood: 9, health: 5, favor: 3 }, '他顺利处理了问题，你也赶上了家里的晚饭。'),
    c('一起处理，再带他复盘', { health: -4, xp: 9, favor: 5 }, '你们找到了更稳妥的处理流程。') ] },
  { id: 'mentor-alone', tag: '同事情谊 · 2', title: '两个人，都卡住了', text: '你和小林遇到了同一个问题。之前各自摸索，这次需要一起补上方法。', unlock: { week: 7, after: 'mentor-start', flag: 'independent' }, choices: [
    c('一起补文档，重新建立配合', { health: -6, mood: -3, xp: 8 }, '协作起步晚了一点，但这次你们走到了一起。', 'mentored'),
    c('各自解决，先交自己的任务', { health: -3, favor: 4, xp: 4 }, '任务交了，彼此依然只是点头之交。') ] },
  { id: 'mentor-finish', tag: '同事情谊 · 完', title: '小林的转正答辩', text: '答辩结束，他提起了刚入职的日子。你如何回应这段共同经历？', unlock: { week: 11, after: 'mentor-start' }, choices: [
    c('把舞台留给他，真诚祝贺', { mood: 8, favor: 3 }, '看到新人独当一面，你也感到一份踏实。'),
    c('整理带教经验，申请内部分享', { health: -4, xp: 8, favor: 6 }, '你的经验变成了下一批新人的入门指南。') ] },
  { id: 'project-start', tag: '项目负责人 · 1', title: '第一次，由你来定计划', text: '升为骨干后，你拿到一个小项目。上线时间和质量目标都由你协调。', unlock: { week: 16, level: 1 }, choices: [
    c('预留缓冲，明确交付边界', { favor: -3, xp: 6 }, '计划看起来保守，但风险有了明确的出口。', 'buffered'),
    c('承诺提前交付，争取奖金', { favor: 8, mood: -5 }, '大家期待更高了，计划里几乎没有余量。', 'rushed') ] },
  { id: 'project-safe', tag: '项目负责人 · 完', title: '缓冲时间真的用上了', text: '供应方延迟交付。你预留的时间，替团队挡住了一轮通宵。', unlock: { week: 22, after: 'project-start', flag: 'buffered' }, choices: [
    c('按原计划交付，兑现承诺', { money: 500, xp: 8, favor: 6 }, '项目稳定上线，团队认可了你的判断。'),
    c('用剩余时间补自动检查', { health: -5, xp: 12, favor: 4 }, '短期少休息了一点，后续维护更轻松了。') ] },
  { id: 'project-rush', tag: '项目负责人 · 完', title: '提前交付的承诺到期了', text: '供应方延期，原本紧张的排期被打乱。现在要为之前的承诺做决定。', unlock: { week: 22, after: 'project-start', flag: 'rushed' }, choices: [
    c('争取延期，承担沟通责任', { favor: -10, mood: -4, xp: 6 }, '奖金没有了，但团队保住了基本节奏。'),
    c('补上缺口，冲刺拿下奖金', { money: 1300, health: -14, mood: -9, xp: 9 }, '项目赶上了，你也切实感受到了透支。') ] },
  { id: 'leader', tag: '带队日常', title: '组员提出准点下班', text: '成为组长后，你开始站在排期的另一端。组员希望今天按时回家。', unlock: { week: 30, level: 2 }, choices: [
    c('调整优先级，保护团队节奏', { favor: -5, xp: 7, mood: 7 }, '你没有把每一次压力都原样传给下一层。', 'caring'),
    c('自己补上最紧急的部分', { health: -10, mood: -5, favor: 8, xp: 5 }, '团队按时走了，办公室里又只剩下你。'),
    c('缩小交付范围，与老板重谈', { xp: 8, mood: -3, favor: 2 }, '谈判不轻松，但你争取到了一次调整。') ] }
];
module.exports = { stories };
