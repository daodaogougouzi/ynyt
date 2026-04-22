// AI 问答关键词回复库。
const aiAnswerRules = [
  // Mock 规则：国家奖学金条件。
  {
    id: 'rule-national-top',
    keywords: ['国家奖学金', '国奖', '前10', '绩点3.8'],
    reply: '国家奖学金标准为10000元/人/学年，一般要求二年级及以上、学业和综合表现突出，学业成绩排名通常位于前10%，并具备较强综合素质和获奖经历。',
  },
  // Mock 规则：国家励志奖学金条件。
  {
    id: 'rule-national-encourage',
    keywords: ['国家励志', '励志奖学金', '前50', '无不及格'],
    reply: '国家励志奖学金标准为6000元/人/学年，通常要求二年级及以上、家庭经济困难、学业成绩排名前50%，且评审学年没有不及格科目。',
  },
  // Mock 规则：国家助学金条件。
  {
    id: 'rule-national-grant',
    keywords: ['国家助学金', '助学金分档', '困难认定'],
    reply: '国家助学金一般按家庭经济困难认定结果分档发放，标准约为2500-5000元/人/学年，重点看困难认定材料是否完整。',
  },
  // Mock 规则：广东新生资助条件。
  {
    id: 'rule-guangdong-freshman',
    keywords: ['广东新生资助', '新生资助', '广东省户籍'],
    reply: '广东省家庭经济困难大学新生资助面向广东省户籍的一年级家庭经济困难新生，资助标准不超过6000元/人。',
  },
  // Mock 规则：困难认定材料。
  {
    id: 'rule-recognition',
    keywords: ['认定材料', '低保', '脱贫', '孤儿', '重大疾病', '困难认定'],
    reply: '家庭经济困难认定常见材料包括户口簿首页和本人页、低保或脱贫等相关证件、病历诊断书、灾害或突发意外证明，以及必要的手写情况说明。',
  },
  // Mock 规则：临时困难补贴。
  {
    id: 'rule-temporary-aid',
    keywords: ['临时困难', '临时补贴', '重大疾病', '意外', '自然灾害'],
    reply: '临时困难补贴适用于重大疾病、严重意外伤害、严重自然灾害和其他突发困难情形，建议第一时间联系辅导员并准备相关证明。',
  },
  // Mock 规则：助学贷款和绿色通道。
  {
    id: 'rule-loan',
    keywords: ['助学贷款', '绿色通道', '交不起学费'],
    reply: '家庭经济困难学生可申请生源地国家助学贷款；新生若暂时无法缴费，可先通过绿色通道办理入学，再补办困难认定与资助手续。',
  },
  // Mock 规则：药学院奖助。
  {
    id: 'rule-pharmacy',
    keywords: ['药学院', '红珊瑚', '药苑校友', '应用实践创新基金'],
    reply: '药学院目前可重点关注红珊瑚奖助学金、应用实践创新基金和药苑校友基金奖助学金，不同项目分别对应困难资助、考研奖励和实践创新支持。',
  },
  // Mock 规则：医学技术学院奖助。
  {
    id: 'rule-medical-technology',
    keywords: ['医学技术学院', '兰卫教育基金', '科方奖学金'],
    reply: '医学技术学院可重点关注兰卫教育基金和科方奖学金，通常面向非毕业年级全日制本科生，按学院专项管理办法评审。',
  },
  // Mock 规则：第二临床医学院奖助。
  {
    id: 'rule-second-clinical',
    keywords: ['第二临床医学院', '国华学业', '国华体育'],
    reply: '第二临床医学院可关注国华学业奖学金和国华体育奖学金，分别偏向学业与志愿服务表现、以及校级及以上体育赛事成绩。',
  },
  // Mock 规则：申报流程类。
  {
    id: 'rule-process',
    keywords: ['怎么申请', '申报流程', '提交材料', '截止'],
    reply: '建议先完成家庭经济困难认定或成绩材料准备，再按学院通知提交申请表、成绩证明、获奖或困难证明，并留意学院初审与公示时间。',
  },
  // Mock 规则：心理关怀类。
  {
    id: 'rule-mental-care',
    keywords: ['压力', '焦虑', '难过', '心理'],
    reply: '别给自己太大压力，你已经很努力了。遇到经济压力和情绪困扰时，可以先联系辅导员、资助老师或心理咨询中心，一步一步处理。',
  },
]

// 情绪疏导场景专用回复。
const emotionReplies = [
  // Mock 回复：安抚类。
  '别担心，学校会一直支持你。',
  // Mock 回复：鼓励类。
  '慢慢来，你已经很努力了。',
  // Mock 回复：行动建议类。
  '先照顾好自己，再一步一步处理眼前的问题。',
]

// 默认兜底回复。
const fallbackReply = '我已收到你的问题。你可以告诉我学院、年级、困难认定类型或想申请的奖助项目，我会给你更具体的建议。'

// 根据关键词匹配 AI 回复。
function matchAiAnswer(question, scene) {
  // 输入为空时直接返回提示。
  if (!question || !String(question).trim()) {
    return '请输入你想咨询的问题。'
  }

  const safeQuestion = String(question).trim().toLowerCase()

  // 情绪疏导场景优先返回暖心文案。
  if (scene === 'emotion') {
    const randomIndex = Math.floor(Math.random() * emotionReplies.length)
    return emotionReplies[randomIndex]
  }

  // 普通场景执行关键词匹配。
  const matched = aiAnswerRules.find((rule) => {
    return rule.keywords.some((keyword) => safeQuestion.includes(keyword.toLowerCase()))
  })

  return matched ? matched.reply : fallbackReply
}

module.exports = {
  aiAnswerRules,
  emotionReplies,
  fallbackReply,
  matchAiAnswer,
}
