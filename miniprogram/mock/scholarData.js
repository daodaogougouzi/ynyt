// 首页轮播图 Mock 数据。
const homeBanners = [
  // Mock 轮播图 1：国家奖学金。
  {
    id: 'banner-national',
    title: '国家奖学金',
    subtitle: '10000元/人/学年，重点奖励特别优秀学生',
    themeStart: '#4A90E2',
    themeEnd: '#7FB3F4',
  },
  // Mock 轮播图 2：广东省新生资助。
  {
    id: 'banner-local',
    title: '广东省新生资助',
    subtitle: '家庭经济困难广东户籍新生可申请',
    themeStart: '#FFD166',
    themeEnd: '#F8E08B',
  },
  // Mock 轮播图 3：临时困难补贴。
  {
    id: 'banner-temporary',
    title: '临时困难补贴',
    subtitle: '重大疾病、灾害或突发困难可及时求助',
    themeStart: '#6BCB77',
    themeEnd: '#99E2A2',
  },
]

// 首页奖助分类导航标签。
const categoryTabs = [
  // Mock 分类：国家类。
  { key: 'national', label: '国家类' },
  // Mock 分类：地方政府类。
  { key: 'local', label: '地方政府类' },
  // Mock 分类：校级类。
  { key: 'school', label: '校级类' },
  // Mock 分类：学院合作类。
  { key: 'college-enterprise', label: '学院合作类' },
  // Mock 分类：社会捐助类。
  { key: 'social', label: '社会捐助类' },
]

// 首页政策科普与奖助政策列表。
const scholarshipPolicies = [
  // Mock 政策：国家奖学金。
  {
    id: 'policy-national-1',
    name: '国家奖学金',
    category: 'national',
    amount: '10000元/人/学年',
    intro: '二年级及以上学生可申请，通常要求学业成绩和综合考评排名位于前10%。',
    deadline: '以学校年度通知为准',
  },
  // Mock 政策：国家励志奖学金。
  {
    id: 'policy-national-2',
    name: '国家励志奖学金',
    category: 'national',
    amount: '6000元/人/学年',
    intro: '面向二年级及以上家庭经济困难学生，要求学业成绩排名前50%且无不及格科目。',
    deadline: '以学校年度通知为准',
  },
  // Mock 政策：国家助学金。
  {
    id: 'policy-national-3',
    name: '国家助学金',
    category: 'national',
    amount: '2500-5000元/人/学年',
    intro: '按家庭经济困难认定结果分档资助，可与国家奖学金或国家励志奖学金同时申请。',
    deadline: '以学校年度通知为准',
  },
  // Mock 政策：国家助学贷款。
  {
    id: 'policy-national-4',
    name: '国家助学贷款（生源地）',
    category: 'national',
    amount: '本专科最高20000元/人/年',
    intro: '家庭经济困难学生可按户籍所在地政策申请生源地信用助学贷款。',
    deadline: '按生源地资助部门安排办理',
  },
  // Mock 政策：服兵役国家教育资助。
  {
    id: 'policy-national-5',
    name: '服兵役国家教育资助',
    category: 'national',
    amount: '本科生最高不超过20000元/人/年',
    intro: '应征入伍、退役复学或入学学生可按国家政策享受学费补偿、贷款代偿或学费减免。',
    deadline: '按征兵与学校资助通知为准',
  },
  // Mock 政策：绿色通道。
  {
    id: 'policy-national-6',
    name: '绿色通道',
    category: 'national',
    amount: '先办理入学手续',
    intro: '家庭经济确实困难且暂时无法缴费的新生，可先办理入学再完成困难认定与资助。',
    deadline: '新生报到期间',
  },
  // Mock 政策：南粤扶残助学工程。
  {
    id: 'policy-local-1',
    name: '南粤扶残助学工程',
    category: 'local',
    amount: '本科生一次性15000元',
    intro: '面向广东省户籍新入学残疾本专科大学生，由入学前户籍所在地残联受理。',
    deadline: '按当地残联年度通知为准',
  },
  // Mock 政策：“三支一扶”贷款代偿。
  {
    id: 'policy-local-2',
    name: '“三支一扶”国家助学贷款代偿',
    category: 'local',
    amount: '代偿在校期间国家助学贷款本息',
    intro: '毕业后到基层从事支农、支教、支医和帮扶乡村振兴工作且考核合格者可申请。',
    deadline: '按地方专项通知为准',
  },
  // Mock 政策：广东省新生资助。
  {
    id: 'policy-local-3',
    name: '广东省家庭经济困难大学新生资助',
    category: 'local',
    amount: '不超过6000元/人',
    intro: '面向广东省户籍、当年考入学校的一年级家庭经济困难新生。',
    deadline: '新生入学当年办理',
  },
  // Mock 政策：临时困难补贴。
  {
    id: 'policy-school-1',
    name: '临时困难补贴',
    category: 'school',
    amount: '金额不等',
    intro: '适用于重大疾病、严重意外伤害、严重自然灾害或其他突发困难情形。',
    deadline: '突发情况发生后尽快申请',
  },
  // Mock 政策：勤工助学。
  {
    id: 'policy-school-2',
    name: '勤工助学',
    category: 'school',
    amount: '19.8元/人/小时',
    intro: '学校原则上每周不超过8小时、每月不超过40小时，优先安排家庭经济困难学生。',
    deadline: '按岗位开放情况申请',
  },
  // Mock 政策：综合奖学金。
  {
    id: 'policy-school-3',
    name: '综合奖学金',
    category: 'school',
    amount: '800-2000元/人/学年',
    intro: '一等奖、二等奖、三等奖分别奖励全面发展、品学兼优的学生。',
    deadline: '以学校学年评审安排为准',
  },
  // Mock 政策：单项奖学金。
  {
    id: 'policy-school-4',
    name: '单项奖学金',
    category: 'school',
    amount: '600元/人/学年',
    intro: '面向思想品德、学业、体育、美育和劳动素养方面表现突出的学生。',
    deadline: '以学校学年评审安排为准',
  },
  // Mock 政策：毕业生奖学金。
  {
    id: 'policy-school-5',
    name: '毕业生奖学金',
    category: 'school',
    amount: '1500元/人/学年',
    intro: '以学生在校期间综合表现为主要依据，奖励全面发展且有专长业绩的毕业生。',
    deadline: '毕业年级评审期',
  },
  // Mock 政策：校长奖学金。
  {
    id: 'policy-school-6',
    name: '校长奖学金',
    category: 'school',
    amount: '8000元/人/学年',
    intro: '学校最高层次奖学金，重点奖励德智体美劳全面发展或单项能力特别突出的学生。',
    deadline: '以学校年度通知为准',
  },
  // Mock 政策：应征入伍优秀学生奖励。
  {
    id: 'policy-school-7',
    name: '应征入伍优秀学生奖励',
    category: 'school',
    amount: '1000-50000元/人',
    intro: '依据服役期间立功、受奖及服役地区情况分级奖励，不重复叠加发放。',
    deadline: '按年度退役与审核安排办理',
  },
  // Mock 政策：李汉魂助学金。
  {
    id: 'policy-social-1',
    name: '李汉魂助学金',
    category: 'social',
    amount: '2000元/人/学年',
    intro: '面向湛江校区在籍在校本科困难学生，新生重点倾向家庭经济特别困难者。',
    deadline: '按年度专项通知为准',
  },
  // Mock 政策：红珊瑚奖助学金。
  {
    id: 'policy-college-1',
    name: '红珊瑚奖助学金（药学院）',
    category: 'college-enterprise',
    amount: '2000-2500元/人/年',
    intro: '覆盖药学院助学与考研专项奖励，分别面向困难生和优秀考研录取学生。',
    deadline: '按药学院通知为准',
  },
  // Mock 政策：应用实践创新基金。
  {
    id: 'policy-college-2',
    name: '应用实践创新基金（药学院）',
    category: 'college-enterprise',
    amount: '2000元/人/学年',
    intro: '面向“药学+应用化学联合学位”二至四年级学生，关注成绩与实践表现。',
    deadline: '按药学院通知为准',
  },
  // Mock 政策：药苑校友基金奖助学金。
  {
    id: 'policy-college-3',
    name: '药苑校友基金奖助学金（药学院）',
    category: 'college-enterprise',
    amount: '2000-2500元/人/年',
    intro: '覆盖药学院困难生资助与考研优秀学生奖励，由校友基金支持。',
    deadline: '按药学院通知为准',
  },
  // Mock 政策：万人调查奖学金。
  {
    id: 'policy-college-4',
    name: '万人调查奖学金（公共卫生学院）',
    category: 'college-enterprise',
    amount: '1000元/人/学年',
    intro: '面向统计学非毕业年级全日制本科生，按专项管理办法执行。',
    deadline: '按学院通知为准',
  },
  // Mock 政策：兰卫教育基金。
  {
    id: 'policy-college-5',
    name: '兰卫教育基金（医学技术学院）',
    category: 'college-enterprise',
    amount: '1000-5000元不等',
    intro: '面向医学技术学院非毕业年级本科生，按基金管理办法评审。',
    deadline: '按学院通知为准',
  },
  // Mock 政策：科方奖学金。
  {
    id: 'policy-college-6',
    name: '科方奖学金（医学技术学院）',
    category: 'college-enterprise',
    amount: '2500-10000元/人/学年',
    intro: '面向医学技术学院非毕业年级本科生，具体以学院专项管理办法为准。',
    deadline: '按学院通知为准',
  },
  // Mock 政策：国华学业奖学金。
  {
    id: 'policy-college-7',
    name: '国华学业奖学金（第二临床医学院）',
    category: 'college-enterprise',
    amount: '1500元/人/学年',
    intro: '面向康复相关专业本科生，要求成绩前30%、无不及格且志愿服务达标。',
    deadline: '按学院通知为准',
  },
  // Mock 政策：国华体育奖学金。
  {
    id: 'policy-college-8',
    name: '国华体育奖学金（第二临床医学院）',
    category: 'college-enterprise',
    amount: '年度奖金总量不超过5750元',
    intro: '奖励在校级及以上正规综合性体育赛事中取得优异成绩的学生。',
    deadline: '按学院通知为准',
  },
]

// 首页最新公告栏数据。
const announcements = [
  // Mock 公告：国家奖学金申报提醒。
  {
    id: 'notice-1',
    title: '国家奖学金、国家励志奖学金进入学院摸排阶段，请符合条件同学提前准备成绩与获奖材料。',
    date: '2026-04-03',
    type: '申报通知',
  },
  // Mock 公告：新生资助说明。
  {
    id: 'notice-2',
    title: '广东省家庭经济困难大学新生资助材料说明已更新，广东户籍新生可关注户口与困难认定证明要求。',
    date: '2026-04-04',
    type: '政策更新',
  },
  // Mock 公告：临时困难补贴提示。
  {
    id: 'notice-3',
    title: '如遇重大疾病、自然灾害或突发意外，请第一时间联系辅导员并在小程序查看临时困难补贴指引。',
    date: '2026-04-05',
    type: '温馨提醒',
  },
]

module.exports = {
  homeBanners,
  categoryTabs,
  scholarshipPolicies,
  announcements,
}
