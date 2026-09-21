const CAREERS = [
  { name: '初级职员', salary: 4500, xp: 0 },
  { name: '骨干员工', salary: 6500, xp: 24 },
  { name: '项目组长', salary: 9000, xp: 60 },
  { name: '部门主管', salary: 13000, xp: 104 },
  { name: '职场合伙人', salary: 18000, xp: 156 }
];
const LABELS = { money: '存款', health: '健康', mood: '精神', favor: '老板好感', xp: '经验' };
module.exports = { CAREERS, LABELS, MAX_WEEKS: 52, LIVING_COST: 3200, SAVE_VERSION: 1 };
