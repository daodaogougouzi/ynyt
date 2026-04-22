// 评估规则中的学院选项，按资助项目明细中的真实学院整理。
const collegeOptions = ['药学院', '公共卫生学院', '医学技术学院', '第二临床医学院']

// 评估规则中的年级选项。
const gradeOptions = ['大一', '大二', '大三', '大四', '大五']

// 评估规则中的家庭经济情况选项。
const familyOptions = ['不困难', '一般困难', '困难', '特别困难']

// 评估规则中的奖励情况选项。
const awardOptions = ['是', '否']

// 评估规则中的户籍选项。
const householdOptions = ['广东省户籍', '非广东省户籍']

// 评估规则中的不及格情况选项。
const noFailOptions = ['是', '否']

// 评估规则中的突发困难情况选项。
const emergencyOptions = ['是', '否']

// 广东省家庭经济困难学生认定类型列表：默认项。
const recognitionOptions = [
  {
    key: 'none',
    label: '暂未认定/一般情况',
    evidence: '如暂无明确认定类型，可先咨询辅导员后补充对应佐证材料。',
    level: 'normal',
  },
  // 广东省认定类型：脱贫家庭学生。
  {
    key: 'povertyRelief',
    label: '脱贫家庭学生',
    evidence: '脱贫家庭相关证件、户口簿户主首页、户口簿学生本人页',
    level: 'special',
  },
  // 广东省认定类型：脱贫不稳定家庭学生。
  {
    key: 'unstablePovertyRelief',
    label: '脱贫不稳定家庭学生',
    evidence: '脱贫不稳定家庭相关证件、户口簿户主首页、户口簿学生本人页',
    level: 'special',
  },
  // 广东省认定类型：边缘易致贫家庭学生。
  {
    key: 'povertyEdge',
    label: '边缘易致贫家庭学生',
    evidence: '边缘易致贫家庭相关证件、户口簿户主首页、户口簿学生本人页',
    level: 'special',
  },
  // 广东省认定类型：突发严重困难户学生。
  {
    key: 'suddenSevere',
    label: '突发严重困难户学生',
    evidence: '突发严重困难户相关证件、户口簿户主首页、户口簿学生本人页',
    level: 'special',
  },
  // 广东省认定类型：原广东省户籍建档立卡家庭学生。
  {
    key: 'formerArchive',
    label: '原广东省户籍建档立卡家庭学生',
    evidence: '原建档立卡家庭相关证件、户口簿户主首页、户口簿学生本人页',
    level: 'special',
  },
  // 广东省认定类型：特困供养人员。
  {
    key: 'extremeSupport',
    label: '特困供养人员',
    evidence: '特困人员供养证件或农村五保供养证件、户口簿户主首页、户口簿学生本人页',
    level: 'special',
  },
  // 广东省认定类型：特困职工子女。
  {
    key: 'hardWorkerChild',
    label: '特困职工子女',
    evidence: '特困职工证、户口簿户主首页、户口簿学生本人页',
    level: 'special',
  },
  // 广东省认定类型：最低生活保障家庭学生。
  {
    key: 'minimumLiving',
    label: '最低生活保障家庭学生',
    evidence: '城乡居民最低生活保障证、户口簿户主首页、户口簿学生本人页',
    level: 'special',
  },
  // 广东省认定类型：低保边缘或支出型困难家庭学生。
  {
    key: 'minimumEdge',
    label: '低保边缘、支出型困难家庭学生',
    evidence: '低保边缘家庭证或支出型困难家庭证、户口簿户主首页、户口簿学生本人页',
    level: 'special',
  },
  // 广东省认定类型：孤儿或事实无人抚养儿童。
  {
    key: 'orphan',
    label: '孤儿（含事实无人抚养等儿童）',
    evidence: '儿童福利证、孤儿或事实无人抚养儿童身份认定证件等佐证材料',
    level: 'special',
  },
  // 广东省认定类型：优抚对象子女。
  {
    key: 'martyrChild',
    label: '优抚对象或因公牺牲警察子女',
    evidence: '残疾军人证或优抚对象抚恤补助登记证、户口簿户主首页、户口簿学生本人页',
    level: 'special',
  },
  // 广东省认定类型：其他低收入家庭学生。
  {
    key: 'lowIncome',
    label: '其他低收入家庭学生',
    evidence: '系统推送截图',
    level: 'special',
  },
  // 广东省认定类型：学生本人残疾。
  {
    key: 'studentDisabled',
    label: '学生本人残疾',
    evidence: '残疾人证',
    level: 'special',
  },
  // 广东省认定类型：父母一方为残疾人。
  {
    key: 'parentDisabled',
    label: '父母一方为残疾人',
    evidence: '残疾人证、户口簿户主首页、户口簿学生本人页',
    level: 'hard',
  },
  // 广东省认定类型：重大疾病。
  {
    key: 'majorDisease',
    label: '学生本人或家庭成员患重大疾病',
    evidence: '病历或病情诊断书、户口簿户主首页、户口簿家庭成员页、户口簿学生本人页',
    level: 'special',
  },
  // 广东省认定类型：一年内重大自然灾害。
  {
    key: 'naturalDisasterOneYear',
    label: '家庭遭受重大自然灾害，受灾严重（一年内）',
    evidence: '相关证件或手写情况说明（含申请人签名和居委会或村委会联系电话）、户口簿户主首页、户口簿学生本人页',
    level: 'special',
  },
  // 广东省认定类型：一至两年内重大自然灾害。
  {
    key: 'naturalDisasterTwoYear',
    label: '家庭遭受重大自然灾害，受灾严重（一年以上两年以内）',
    evidence: '相关证件或手写情况说明（含申请人签名和居委会或村委会联系电话）、户口簿户主首页、户口簿学生本人页',
    level: 'hard',
  },
  // 广东省认定类型：一年内重大突发意外事件。
  {
    key: 'accidentOneYear',
    label: '家庭遭重大突发意外事件（不含自然灾害、一年内）',
    evidence: '相关证件或手写情况说明（含申请人签名和居委会或村委会联系电话）、户口簿户主首页、户口簿学生本人页',
    level: 'special',
  },
  // 广东省认定类型：一至两年内重大突发意外事件。
  {
    key: 'accidentTwoYear',
    label: '家庭遭重大突发意外事件（不含自然灾害、一年以上两年以内）',
    evidence: '相关证件或手写情况说明（含申请人签名和居委会或村委会联系电话）、户口簿户主首页、户口簿学生本人页',
    level: 'hard',
  },
  // 广东省认定类型：父母一方抚养。
  {
    key: 'singleParent',
    label: '父母一方抚养',
    evidence: '相关证件或手写情况说明（含申请人签名和居委会或村委会联系电话）、户口簿户主首页、户口簿父或母本人页、户口簿学生本人页',
    level: 'hard',
  },
  // 广东省认定类型：革命老区或少数民族自治地区。
  {
    key: 'specialArea',
    label: '户籍所在地为革命老区/原中央苏区/少数民族自治地区',
    evidence: '户口簿',
    level: 'hard',
  },
  // 广东省认定类型：农村户籍。
  {
    key: 'ruralHousehold',
    label: '农村（含县镇）户籍',
    evidence: '户口簿',
    level: 'hard',
  },
  // 广东省认定类型：少数民族。
  {
    key: 'minority',
    label: '少数民族学生',
    evidence: '户口簿',
    level: 'hard',
  },
  // 广东省认定类型：父母均无工作。
  {
    key: 'parentsUnemployed',
    label: '父母均没有工作',
    evidence: '失业证或其他佐证材料',
    level: 'special',
  },
  // 广东省认定类型：父母一方无工作。
  {
    key: 'oneParentUnemployed',
    label: '父母一方没有工作',
    evidence: '失业证或其他佐证材料',
    level: 'hard',
  },
  // 广东省认定类型：农村小型种植或养殖户。
  {
    key: 'smallFarmer',
    label: '农村个体小型种植户或养殖户',
    evidence: '手写相关情况描述，需含申请人签名和所在居委会或村委会联系电话',
    level: 'hard',
  },
  // 广东省认定类型：家庭人均年收入偏低。
  {
    key: 'lowAnnualIncome',
    label: '家庭人均年收入低于就读地年人均可支配收入',
    evidence: '手写情况说明或其他家庭收入佐证材料',
    level: 'special',
  },
  // 广东省认定类型：父母均为初中及以下文化程度。
  {
    key: 'parentsLowEducation',
    label: '父母均为初中及以下文化程度',
    evidence: '户口簿',
    level: 'hard',
  },
  // 广东省认定类型：父母一方为初中及以下文化程度。
  {
    key: 'oneParentLowEducation',
    label: '父母一方为初中及以下文化程度',
    evidence: '户口簿',
    level: 'hard',
  },
  // 广东省认定类型：父母均为60周岁及以上。
  {
    key: 'parentsSenior',
    label: '父母均为60周岁及以上',
    evidence: '户口簿',
    level: 'hard',
  },
  // 广东省认定类型：父母一方为60周岁及以上。
  {
    key: 'oneParentSenior',
    label: '父母一方为60周岁及以上',
    evidence: '户口簿',
    level: 'hard',
  },
  // 广东省认定类型：赡养老人三位及以上。
  {
    key: 'supportManyElders',
    label: '除父母外赡养老人三位及以上',
    evidence: '户口簿',
    level: 'hard',
  },
  // 广东省认定类型：赡养老人一到两位。
  {
    key: 'supportSomeElders',
    label: '除父母外赡养老人一位到两位',
    evidence: '户口簿',
    level: 'hard',
  },
  // 广东省认定类型：学费与住宿费较高。
  {
    key: 'feeHigh',
    label: '学费、住宿费在9501元至20000元',
    evidence: '学校根据学生实际就读情况核实',
    level: 'hard',
  },
  // 广东省认定类型：学费与住宿费特别高。
  {
    key: 'feeVeryHigh',
    label: '学费、住宿费在20001元以上',
    evidence: '学校根据学生实际就读情况核实',
    level: 'special',
  },
  // 广东省认定类型：家庭多人在学。
  {
    key: 'manyStudents',
    label: '2人（含本人）及以上在上学',
    evidence: '户口簿、学生证注册页',
    level: 'hard',
  },
  // 广东省认定类型：其他特殊情况。
  {
    key: 'otherSpecial',
    label: '其他特殊情况',
    evidence: '相关证件或手写情况说明（含申请人签名和居委会或村委会联系电话）、户口簿户主首页、户口簿学生本人页',
    level: 'hard',
  },
]

// 困难认定材料警示说明。
const recognitionWarning = '如提供虚假佐证材料，将影响家庭经济困难认定与相关奖助资格。'

// 需要重点关注的突发困难认定类型。
const seriousRecognitionKeys = [
  'suddenSevere',
  'majorDisease',
  'naturalDisasterOneYear',
  'accidentOneYear',
]

// 年级顺序映射，用于判断是否达到申请年级要求。
const gradeWeightMap = {
  大一: 1,
  大二: 2,
  大三: 3,
  大四: 4,
  大五: 5,
}

// 根据 key 获取当前困难认定配置。
function getRecognitionOption(key) {
  return recognitionOptions.find((item) => item.key === key) || recognitionOptions[0]
}

// 将排名输入统一转换为数字百分比。
function normalizeRanking(rawRanking) {
  const rankingText = String(rawRanking || '').replace('%', '').trim()
  const rankingValue = Number(rankingText)
  return Number.isFinite(rankingValue) ? rankingValue : NaN
}

// 将绩点输入统一转换为数字。
function normalizeGpa(rawGpa) {
  const gpaValue = Number(String(rawGpa || '').trim())
  return Number.isFinite(gpaValue) ? gpaValue : NaN
}

// 判断当前年级是否达到目标年级要求。
function isGradeAtLeast(grade, targetGrade) {
  return (gradeWeightMap[grade] || 0) >= (gradeWeightMap[targetGrade] || 0)
}

// 按未满足条件拼接评估原因。
function buildReason(unmetList, matchedText) {
  return unmetList.length > 0 ? `需满足：${unmetList.join('、')}` : matchedText
}

// 根据家庭经济情况与认定类型汇总困难画像。
function getDifficultyProfile(formData) {
  const recognition = getRecognitionOption(formData.recognitionType)
  const isSpecial = formData.family === '特别困难' || recognition.level === 'special'
  const isHard = isSpecial || formData.family === '困难' || recognition.level === 'hard'

  return {
    isHard,
    isSpecial,
    hasRecognition: recognition.key !== 'none',
    label: recognition.label,
    evidence: recognition.evidence,
  }
}

// 固定评估规则：国家奖学金。
function evaluateNationalScholarship(formData) {
  const ranking = normalizeRanking(formData.ranking)
  const gpa = normalizeGpa(formData.gpa)
  const unmetList = []

  if (!isGradeAtLeast(formData.grade, '大二')) {
    unmetList.push('二年级及以上')
  }
  if (!(ranking <= 10)) {
    unmetList.push('学业成绩排名前10%')
  }
  if (!(gpa >= 3.8)) {
    unmetList.push('平均绩点不低于3.8')
  }
  if (formData.hasAward !== '是') {
    unmetList.push('获得过校级及以上奖励')
  }

  return {
    name: '国家奖学金',
    matched: unmetList.length === 0,
    reason: buildReason(unmetList, '满足二年级及以上、排名前10%、绩点3.8及以上和获奖条件。'),
  }
}

// 固定评估规则：国家励志奖学金。
function evaluateNationalEncourage(formData) {
  const ranking = normalizeRanking(formData.ranking)
  const gpa = normalizeGpa(formData.gpa)
  const difficultyProfile = getDifficultyProfile(formData)
  const unmetList = []

  if (!isGradeAtLeast(formData.grade, '大二')) {
    unmetList.push('二年级及以上')
  }
  if (!(ranking <= 50)) {
    unmetList.push('学业成绩排名前50%')
  }
  if (!(gpa >= 3.0)) {
    unmetList.push('平均绩点不低于3.0')
  }
  if (formData.noFailCourse !== '是') {
    unmetList.push('评审学年无不及格科目')
  }
  if (!difficultyProfile.isHard) {
    unmetList.push('完成家庭经济困难认定')
  }

  return {
    name: '国家励志奖学金',
    matched: unmetList.length === 0,
    reason: buildReason(unmetList, '满足二年级及以上、前50%、绩点达标、无不及格且家庭经济困难。'),
  }
}

// 固定评估规则：国家助学金。
function evaluateNationalGrant(formData) {
  const difficultyProfile = getDifficultyProfile(formData)
  const matched = difficultyProfile.isHard

  return {
    name: '国家助学金',
    matched,
    reason: matched
      ? `已具备家庭经济困难基础条件，认定参考为：${difficultyProfile.label}。`
      : '需完成家庭经济困难认定后，方可重点关注国家助学金分档评定。',
  }
}

// 固定评估规则：广东省家庭经济困难大学新生资助。
function evaluateGuangdongFreshmanAid(formData) {
  const difficultyProfile = getDifficultyProfile(formData)
  const unmetList = []

  if (formData.household !== '广东省户籍') {
    unmetList.push('广东省户籍')
  }
  if (formData.grade !== '大一') {
    unmetList.push('当年入学一年级新生')
  }
  if (!difficultyProfile.isHard) {
    unmetList.push('家庭经济困难且无力支付当年学费')
  }

  return {
    name: '广东省家庭经济困难大学新生资助',
    matched: unmetList.length === 0,
    reason: buildReason(unmetList, '满足广东省户籍、家庭经济困难及一年级新生条件。'),
  }
}

// 固定评估规则：临时困难补贴。
function evaluateTemporaryAid(formData) {
  const isSeriousRecognition = seriousRecognitionKeys.includes(formData.recognitionType)
  const matched = formData.suddenHardship === '是' || isSeriousRecognition

  return {
    name: '临时困难补贴',
    matched,
    reason: matched
      ? '存在突发困难、重大疾病、严重受灾或重大意外等情形，可优先咨询临时困难补贴。'
      : '需存在重大疾病、突发意外、严重受灾等紧急困难情形，才更适合申请临时困难补贴。',
  }
}

// 根据真实政策与当前表单生成推荐列表。
function buildRecommendedList(formData, results) {
  const ranking = normalizeRanking(formData.ranking)
  const difficultyProfile = getDifficultyProfile(formData)
  const recommendedList = []

  function pushRecommend(name, reason) {
    if (!recommendedList.some((item) => item.name === name)) {
      recommendedList.push({ name, reason })
    }
  }

  results
    .filter((item) => item.matched)
    .forEach((item) => {
      pushRecommend(item.name, item.reason)
    })

  if (difficultyProfile.isHard) {
    pushRecommend('国家助学贷款（生源地）', '家庭经济困难学生可按户籍所在地申请生源地信用助学贷款。')
    pushRecommend('勤工助学', '学校优先安排家庭经济困难学生参加校内勤工助学岗位。')
  }

  if (difficultyProfile.isHard && formData.grade === '大一') {
    pushRecommend('绿色通道', '新生如暂时无法缴纳学费，可先通过绿色通道办理入学后再完成资助认定。')
  }

  if (ranking <= 3 && formData.noFailCourse === '是') {
    pushRecommend('综合奖学金（一等奖方向）', '综合排名和学业表现优异，可重点关注校级综合奖学金一等奖。')
  } else if (ranking <= 8 && formData.noFailCourse === '是') {
    pushRecommend('综合奖学金（二等奖方向）', '综合表现较好，可重点关注综合奖学金二等奖。')
  } else if (ranking <= 15 && formData.noFailCourse === '是') {
    pushRecommend('综合奖学金（三等奖方向）', '当前成绩表现可继续冲刺综合奖学金三等奖。')
  }

  if (formData.hasAward === '是') {
    pushRecommend('单项奖学金', '如在思想品德、学业表现、体育、美育或劳动素养方面突出，可同步关注单项奖学金。')
  }

  if (ranking <= 1 && formData.hasAward === '是' && formData.noFailCourse === '是') {
    pushRecommend('校长奖学金', '当前表现接近学校最高层次奖学金关注方向，可重点准备综合素质材料。')
  }

  pushRecommend(`${formData.college}专属社会奖助项目`, '可前往“学院奖助学金”页面查看本学院社会奖助、校友基金与专项奖励。')

  return recommendedList
}

// 运行全部规则并返回统一评估结果。
function runEvaluate(formData) {
  const results = [
    evaluateNationalScholarship(formData),
    evaluateNationalEncourage(formData),
    evaluateNationalGrant(formData),
    evaluateGuangdongFreshmanAid(formData),
    evaluateTemporaryAid(formData),
  ]

  const matchedList = results.filter((item) => item.matched)
  const unmatchedList = results.filter((item) => !item.matched)
  const recommendedList = buildRecommendedList(formData, results)

  return {
    results,
    matchedList,
    unmatchedList,
    recommendedList,
    primaryStatus: matchedList.length > 0 ? 'success' : 'danger',
    primaryText:
      matchedList.length > 0
        ? `你当前最匹配${matchedList[0].name}，同时可继续关注其他推荐项目。`
        : `当前未直接满足核心奖助项目，建议优先补齐${unmatchedList[0].name}相关条件。`,
  }
}

module.exports = {
  collegeOptions,
  gradeOptions,
  familyOptions,
  awardOptions,
  householdOptions,
  noFailOptions,
  emergencyOptions,
  recognitionOptions,
  recognitionWarning,
  getRecognitionOption,
  normalizeRanking,
  normalizeGpa,
  runEvaluate,
}
