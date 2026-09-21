// 事件只描述内容和效果；数值结算、职业流转由引擎统一处理。
const choice = (text, effects, result, action) => ({ text, effects, result, ...(action ? { action } : {}) });
const events = [
  { id: 'late-message', tag: '加班现场', title: '23:48，老板发来消息', text: '“这个需求明早能测完吗？”你刚打开游戏，手机就亮了。', choices: [
    choice('接下任务，今晚冲一把', { health: -9, mood: -8, favor: 12, xp: 7 }, '天亮时你交了报告，也错过了睡眠。'),
    choice('说明风险，约定明天交付', { favor: 4, xp: 4, mood: -2 }, '你把工作量列清楚，对方接受了新时间。'),
    choice('假装已经睡着', { favor: -9, mood: 8, health: 4 }, '这一晚睡得很好，周会上气氛有点微妙。') ] },
  { id: 'coffee', tag: '办公室日常', title: '下午三点，灵魂掉线', text: '屏幕上的表格开始重影。同事问你要不要一起点喝的。', choices: [
    choice('请大家喝咖啡', { money: -100, mood: 7, favor: 5 }, '工位飘起咖啡香，讨论也顺畅了不少。'),
    choice('去楼下散步十分钟', { health: 5, mood: 6 }, '太阳和风，给大脑重新充了电。'),
    choice('再撑一下，把任务做完', { health: -4, mood: -4, xp: 6 }, '进度条向前挪了一截，你也更困了。') ] },
  { id: 'production', tag: '紧急任务', title: '线上突然冒烟了', text: '用户反馈不断增加，群里所有人都在问：“谁能看看？”', choices: [
    choice('主动定位问题', { health: -7, mood: -5, favor: 10, xp: 9 }, '你找到一个关键线索，大家终于能对症处理。'),
    choice('协调分工，一起排查', { favor: 6, xp: 5, mood: -2 }, '有人看日志，有人复现，事故逐渐平息。'),
    choice('等明确安排再行动', { favor: -7, mood: 3 }, '你保住了休息时间，也失去一次表现机会。') ] },
  { id: 'credit', tag: '人情世故', title: '汇报里，没有你的名字', text: '你熬夜完成的方案，被同事用“我做的”三个字轻轻带过。', choices: [
    choice('补充自己的贡献和记录', { favor: 5, xp: 4, mood: 3 }, '你平静地展示过程，贡献终于有了归属。'),
    choice('会后私下沟通', { mood: 5, xp: 2 }, '同事答应补充说明，你决定再观察一次。'),
    choice('算了，先忍一忍', { mood: -9, favor: 2 }, '表面风平浪静，心里多了一根刺。') ] },
  { id: 'weekend', tag: '生活也重要', title: '周末，朋友约你出去', text: '有人提议骑车，有人提议火锅。你的待办清单还很长。', choices: [
    choice('骑车吹风去', { money: -150, health: 10, mood: 10 }, '沿途的风景，比表格好看多了。'),
    choice('火锅！今天只谈生活', { money: -260, mood: 15, health: 3 }, '大家聊到打烊，烦恼暂时留在了办公室。'),
    choice('在家补觉', { health: 12, mood: 6 }, '睡醒之后，世界没那么难了。'),
    choice('用周末学一门新技能', { mood: -4, xp: 9 }, '你做出一个小作品，收藏夹终于少了一项。') ] },
  { id: 'course', tag: '自我投资', title: '收藏夹里的课程开课了', text: '课程有点贵，但正好能解决你工作中反复遇到的问题。', choices: [
    choice('报名系统学习', { money: -700, xp: 13, mood: 3 }, '认真做完作业后，你开始能独立处理难题。'),
    choice('用免费资料练手', { xp: 7, health: -3 }, '进度慢一些，但你找到了适合自己的方法。'),
    choice('先把当前工作做好', { mood: 4, favor: 3 }, '这次没有冲动下单，手头任务也更稳了。') ] },
  { id: 'meeting', tag: '会议生存', title: '这场会已经开了两小时', text: '大家绕回了最开始的问题。会议室的空气逐渐凝固。', choices: [
    choice('总结分歧，提出下一步', { favor: 7, xp: 5 }, '你把问题写成三点，会议终于有了结论。'),
    choice('默默整理会议纪要', { favor: 3, xp: 3, mood: -3 }, '笔记很完整，你的精神有点空。'),
    choice('建议暂停，改为异步讨论', { mood: 6, favor: -3 }, '大家重获自由，老板却觉得还没聊透。') ] },
  { id: 'sick', tag: '身体信号', title: '喉咙开始抗议', text: '醒来时头有点沉，但今天恰好有个重要汇报。', choices: [
    choice('请假休息，委托同事汇报', { money: -180, health: 14, mood: 5, favor: -3 }, '你认真休息了一次，身体慢慢恢复。'),
    choice('远程完成关键部分', { health: 3, favor: 3, xp: 3 }, '必要的工作做完了，你关上电脑继续睡。'),
    choice('硬撑着到公司', { health: -12, mood: -6, favor: 9, xp: 4 }, '汇报顺利结束，回程却格外漫长。') ] },
  { id: 'bonus', tag: '意外收获', title: '项目奖金到账', text: '团队拿到了额外预算，你也分到一笔奖励。要怎么庆祝？', choices: [
    choice('存起来，给未来一点底气', { money: 900, mood: 4 }, '账户余额让你踏实了不少。'),
    choice('留一半，吃一顿好的', { money: 450, mood: 12, health: 3 }, '这一顿，你终于没有边吃边回消息。') ] },
  { id: 'newbie', tag: '团队协作', title: '新人向你求助', text: '新同事卡在一个老问题上。教会他需要花点时间。', choices: [
    choice('一起排查，顺手写份指南', { xp: 7, favor: 6, health: -3 }, '下次遇到同类问题，团队有文档可查了。'),
    choice('给他几个排查方向', { xp: 3, favor: 3 }, '你没有代劳，但帮他迈过了第一道坎。'),
    choice('今天忙，约个别的时间', { mood: 3, favor: -2 }, '你守住了自己的安排，也记下了这个约定。') ] },
  { id: 'scope', tag: '需求变更', title: '“只改一个小地方”', text: '上线前一天，产品经理画了一个大圈：这里、这里，还有这里。', choices: [
    choice('列出影响，重新排期', { xp: 6, favor: 4, mood: 2 }, '影响范围摆上台面，团队调整了计划。'),
    choice('全部接下，加班完成', { health: -10, mood: -8, favor: 11, xp: 7 }, '版本赶上了，你的周末没有赶上。'),
    choice('坚持本次只修关键问题', { favor: -3, mood: 6, xp: 3 }, '边界说清楚后，沟通反而简单了。') ] },
  { id: 'rent', tag: '生活账单', title: '房东发来续租消息', text: '租金要涨了。离公司近，还是住得便宜一点？', choices: [
    choice('付差价，保住通勤时间', { money: -450, health: 5, mood: 4 }, '住处没变，熟悉的早餐店也还在。'),
    choice('搬去便宜的合租房', { money: 250, health: -5, mood: -5 }, '省下了钱，通勤的闹钟提前了半小时。'),
    choice('认真协商一次', { money: -120, xp: 2, mood: 2 }, '双方各退一步，续租的事情定了下来。') ] },
  { id: 'team-dinner', tag: '人情世故', title: '下班后的“自愿”聚餐', text: '老板说今天不谈工作。你已经看到了他包里的笔记本。', choices: [
    choice('去坐一会儿，提前离席', { money: -80, favor: 5, mood: 2 }, '你打了招呼，也赶上回家的末班车。'),
    choice('留下来聊聊项目', { favor: 10, xp: 3, mood: -6, health: -4 }, '你更了解了老板的想法，也更晚睡了。'),
    choice('说明有约，直接回家', { favor: -5, mood: 9, health: 4 }, '今晚的时间属于你自己。') ] },
  { id: 'automation', tag: '效率革命', title: '这个重复操作，第 100 次了', text: '每天都要手动整理同一份报告。也许可以写个小工具。', choices: [
    choice('写工具并分享给团队', { xp: 10, favor: 8, health: -5 }, '第一次花了时间，以后的你会感谢今天。'),
    choice('先优化自己的流程', { xp: 6, mood: 4 }, '少了几次复制粘贴，日子轻快了一点。'),
    choice('保持原样，稳妥交付', { favor: 2, mood: -4 }, '报告按时提交，明天的步骤依然相同。') ] },
  { id: 'exercise', tag: '生活也重要', title: '运动鞋在角落落灰', text: '今晚没有紧急消息，楼下的公园亮起了灯。', choices: [
    choice('慢跑半小时', { health: 12, mood: 7 }, '跑得不快，但每一步都属于自己。'),
    choice('找教练上体验课', { money: -200, health: 15, mood: 9 }, '有人帮你调整动作，你开始期待下一次。'),
    choice('躺着刷手机', { mood: 8, health: -3 }, '短视频很快乐，抬头已经凌晨一点。') ] },
  { id: 'side-gig', tag: '额外收入', title: '朋友介绍了一个私活', text: '需求看起来不大，工期却很紧。这个周末要接吗？', choices: [
    choice('接单，认真交付', { money: 1200, health: -9, mood: -5, xp: 5 }, '尾款到账，你决定下周给自己留点空。'),
    choice('缩小范围，只做核心部分', { money: 550, health: -3, xp: 3 }, '双方确认范围后，合作很顺利。'),
    choice('婉拒，周末留给自己', { health: 6, mood: 8 }, '没有多赚一笔，但好好休息也有价值。') ] },
  { id: 'review', tag: '绩效面谈', title: '老板问：最近怎么样？', text: '季度面谈开始了。这次，你打算怎么讲自己的成绩？', choices: [
    choice('用结果和数据说明贡献', { favor: 10, xp: 5, mood: 3 }, '有证据的成绩，让对话具体了起来。'),
    choice('坦诚困难，争取资源', { favor: 4, xp: 4, mood: 6 }, '几个堵点终于得到了支持。'),
    choice('谦虚一点，随便聊聊', { favor: -3, mood: 2 }, '气氛轻松，但你的成绩没有被充分看到。') ] },
  { id: 'family', tag: '生活也重要', title: '家里打来电话', text: '“最近忙不忙？好久没一起吃饭了。”电话那边声音很轻。', choices: [
    choice('买票回去过个周末', { money: -500, health: 5, mood: 16 }, '熟悉的饭菜，让你记起努力之外的生活。'),
    choice('认真聊一小时', { mood: 10, health: 3 }, '挂电话前，你们约好了下次见面的日子。'),
    choice('先忙完这个项目再说', { favor: 5, xp: 4, mood: -7 }, '工作继续推进，心里却空了一小块。') ] },
  { id: 'conference', tag: '自我投资', title: '行业分享会开放报名', text: '主题正好与你的项目有关，也许能遇到一些新同行。', choices: [
    choice('自费参加，主动交流', { money: -350, xp: 10, mood: 5 }, '你带回了新思路和几位同行的联系方式。'),
    choice('申请公司支持', { favor: 4, xp: 6 }, '老板同意了，条件是回来做一次分享。'),
    choice('看会后的公开资料', { xp: 4, mood: 2 }, '你挑了最相关的部分，做了几页笔记。') ] },
  { id: 'blame', tag: '职场风浪', title: '一口锅，向你飞来', text: '延期复盘会上，有人把原因归结为你的环节。事实没有那么简单。', choices: [
    choice('拿出时间线，还原事实', { xp: 6, favor: 5, mood: -2 }, '大家重新看清依赖关系，问题有了归属。'),
    choice('先接住问题，再约单独复盘', { favor: 8, mood: -7, xp: 3 }, '会开完了，你还需要补一场艰难的沟通。'),
    choice('当场发火', { favor: -14, mood: 7 }, '情绪释放了，后续沟通却更难了。') ] },
  { id: 'quiet-day', tag: '办公室日常', title: '难得没有新消息', text: '所有任务都按计划推进。这一小段空白，你准备怎样使用？', choices: [
    choice('整理经验，写进文档', { xp: 6, favor: 4 }, '零散的经验变成了可以复用的知识。'),
    choice('准点下班，好好休息', { health: 8, mood: 9 }, '你在天还亮着的时候走出了写字楼。'),
    choice('研究一个难点', { xp: 9, health: -3, mood: -2 }, '你终于弄懂了那个一直绕不开的问题。') ] },
  { id: 'equipment', tag: '工位改造', title: '椅子又吱呀叫了一声', text: '坐了一整天，腰背提醒你：工作环境也值得认真对待。', choices: [
    choice('添置靠垫和支架', { money: -240, health: 10, mood: 5 }, '工位舒服了一些，你也记得起身活动。'),
    choice('申请更换办公设备', { health: 5, favor: -2, xp: 2 }, '申请走完流程，终于有了新椅子。'),
    choice('每小时站起来走走', { health: 7, mood: 3 }, '没有花钱的小改变，也确实有用。') ] },
  { id: 'headhunter', tag: '职业岔路', title: '猎头带来一份新机会', text: '新团队愿意涨薪 800 元/月，但要重新适应环境。你会怎么选？', minXp: 12, choices: [
    choice('接受邀约，换个环境', { mood: 8, health: -4, xp: 4 }, '你收拾好工位，准备去新公司重新开始。', 'switchJob'),
    choice('先拿机会与公司谈谈', { favor: -5, xp: 4, money: 300 }, '你拿到一次留任奖励，也让诉求更加明确。'),
    choice('留下来，把当前项目做好', { favor: 8, xp: 5 }, '你暂时选择了熟悉的团队。') ] },
  { id: 'demo', tag: '关键时刻', title: '轮到你向客户演示', text: '演示前半小时，你发现了一个不影响主流程的小问题。', choices: [
    choice('准备替代路径，并如实说明', { xp: 7, favor: 7, mood: -2 }, '演示平稳结束，诚实沟通赢得了信任。'),
    choice('临时修复再完整检查', { health: -7, mood: -5, favor: 9, xp: 8 }, '紧张的检查之后，版本顺利完成演示。'),
    choice('请同事协助演示', { xp: 3, favor: 3, mood: 3 }, '两个人配合，压力小了很多。') ] }
];

const layoff = { id: 'layoff', tag: '组织调整', title: '公司启动了人员调整', text: '名单里有你的名字。工作可以重找，先决定如何走过这个岔路。', choices: [
  choice('领取补偿，开始求职', { money: 5000, mood: -9 }, '你拿到离职补偿。下一周开始寻找新机会。', 'loseJob'),
  choice('争取内部转岗', { favor: 8, mood: -6, xp: 3 }, '你留在公司，转岗适应期让月薪补贴归零。', 'transfer')
] };
const interview = { id: 'interview', tag: '重新出发', title: '下一站，重新开始', text: '招聘方看过你的经历，提供了一份同级岗位。也可以先休整一周。', choices: [
  choice('接受 offer，下周入职', { mood: 8, xp: 3 }, '你接受了同级岗位，重新开始积累信任。', 'hire'),
  choice('休整一周再找', { health: 12, mood: 12, money: -350 }, '你决定先照顾自己，下周继续看机会。')
] };
module.exports = { events, layoff, interview };
