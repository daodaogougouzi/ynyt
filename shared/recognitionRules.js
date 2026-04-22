const recognitionRules = [
  { id: 'R01', no: 1, label: '脱贫家庭学生', score: 90, category: 'direct', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '脱贫家庭相关证件、户口簿户主首页、户口簿学生本人页' },
  { id: 'R02', no: 2, label: '脱贫不稳定家庭学生', score: 90, category: 'direct', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '脱贫不稳定家庭相关证件、户口簿户主首页、户口簿学生本人页' },
  { id: 'R03', no: 3, label: '边缘易致贫家庭学生', score: 90, category: 'direct', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '边缘易致贫家庭相关证件、户口簿户主首页、户口簿学生本人页' },
  { id: 'R04', no: 4, label: '突发严重困难户学生', score: 90, category: 'direct', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '突发严重困难户相关证件、户口簿户主首页、户口簿学生本人页' },
  { id: 'R05', no: 5, label: '原广东省户籍建档立卡家庭学生', score: 90, category: 'direct', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '原广东省户籍建档立卡家庭相关证件、户口簿户主首页、户口簿学生本人页' },
  { id: 'R06', no: 6, label: '特困供养人员', score: 90, category: 'direct', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '特困人员供养证件或农村五保供养证件、户口簿户主首页、户口簿学生本人页' },
  { id: 'R07', no: 7, label: '特困职工子女', score: 90, category: 'direct', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '特困职工证、户口簿户主首页、户口簿学生本人页' },
  { id: 'R08', no: 8, label: '最低生活保障家庭学生', score: 90, category: 'direct', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '城乡居民最低生活保障证、户口簿户主首页、户口簿学生本人页' },
  { id: 'R09', no: 9, label: '低保边缘、支出型困难家庭学生', score: 90, category: 'direct', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '低保边缘家庭证或支出型困难家庭证、户口簿户主首页、户口簿学生本人页' },
  { id: 'R10', no: 10, label: '孤儿（含事实无人抚养等儿童）', score: 90, category: 'direct', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '儿童福利证、孤儿或事实无人抚养儿童身份认定证件等佐证材料' },
  { id: 'R11', no: 11, label: '优抚对象或因公牺牲警察子女', score: 90, category: 'direct', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '残疾军人证或优抚对象抚恤补助登记证、户口簿户主首页、户口簿学生本人页' },
  { id: 'R12', no: 12, label: '其他低收入家庭学生', score: 90, category: 'direct', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '系统推送截图' },
  { id: 'R13', no: 13, label: '学生本人残疾', score: 90, category: 'direct', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '残疾人证' },
  { id: 'R14', no: 14, label: '父母一方为残疾人', score: 90, category: 'direct', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '残疾人证、户口簿户主首页、户口簿学生本人页' },
  { id: 'R15', no: 15, label: '学生本人或家庭成员患重大疾病', score: 90, category: 'direct', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '病历或病情诊断书、户口簿户主首页、户口簿家庭成员页、户口簿学生本人页' },
  { id: 'R16', no: 16, label: '家庭遭受重大自然灾害，受灾严重（一年内）', score: 90, category: 'direct', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '相关证件或手写情况描述（含申请人签名和居委会或村委会联系电话）、户口簿户主首页、户口簿学生本人页' },
  { id: 'R17', no: 17, label: '家庭遭受重大自然灾害，受灾严重（一年以上两年以内）', score: 40, category: 'direct', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '相关证件或手写相关情况描述（需含申请人签名和所在居委会或村委会联系电话）、户口簿户主首页、户口簿学生本人页' },
  { id: 'R18', no: 18, label: '家庭遭重大突发意外事件（不含自然灾害、一年内）', score: 90, category: 'direct', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '相关证件或手写相关情况描述（需含申请人签名和所在居委会或村委会联系电话）、户口簿户主首页、户口簿学生本人页' },
  { id: 'R19', no: 19, label: '家庭遭重大突发意外事件（不含自然灾害、一年以上两年以内）', score: 40, category: 'direct', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '相关证件或手写相关情况描述（需含申请人签名和所在居委会或村委会联系电话）、户口簿户主首页、户口簿学生本人页' },
  { id: 'R20', no: 20, label: '父母一方抚养', score: 35, category: 'direct', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '相关证件或手写情况描述（含申请人签名和居委会或村委会联系电话）、户口簿户主首页、户口簿父亲或母亲本人页、户口簿学生本人页' },
  { id: 'R21', no: 21, label: '户籍所在地为革命老区、原中央苏区、少数民族自治地区', score: 3, category: 'accumulate', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '户口簿' },
  { id: 'R22', no: 22, label: '农村（含县镇）户籍', score: 1, category: 'accumulate', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '户口簿' },
  { id: 'R23', no: 23, label: '少数民族', score: 1, category: 'accumulate', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '户口簿' },
  { id: 'R24', no: 24, label: '父母均没有工作（不含农村种植户或养殖户）', score: 13, category: 'accumulate', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '失业证或其他佐证材料' },
  { id: 'R25', no: 25, label: '父母一方没有工作（不含农村种植户或养殖户）', score: 3, category: 'accumulate', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '失业证或其他佐证材料' },
  { id: 'R26', no: 26, label: '农村个体小型种植户或个体小型养殖户（或两者均是）', score: 1, category: 'accumulate', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '手写相关情况描述，需含申请人签名和所在居委会或村委会联系电话' },
  { id: 'R27', no: 27, label: '家庭人均年收入低于就读地年人均可支配收入', score: 3, category: 'accumulate', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '手写相关情况描述，需含申请人签名和所在居委会或村委会联系电话' },
  { id: 'R28', no: 28, label: '父母均为初中及以下文化程度', score: 2, category: 'accumulate', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '户口簿' },
  { id: 'R29', no: 29, label: '父母一方为初中及以下文化程度', score: 1, category: 'accumulate', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '户口簿' },
  { id: 'R30', no: 30, label: '父母均为60周岁及以上', score: 2, category: 'accumulate', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '户口簿' },
  { id: 'R31', no: 31, label: '父母一方为60周岁及以上', score: 1, category: 'accumulate', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '户口簿' },
  { id: 'R32', no: 32, label: '除父母外赡养老人三位及以上', score: 3, category: 'accumulate', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '户口簿' },
  { id: 'R33', no: 33, label: '除父母外赡养老人一位到两位', score: 1, category: 'accumulate', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '户口簿' },
  { id: 'R34', no: 34, label: '学费、住宿费在9501元至20000元', score: 1, category: 'accumulate', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '学校根据学生实际就读情况核实' },
  { id: 'R35', no: 35, label: '学费、住宿费在20001元以上', score: 2, category: 'accumulate', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '学校根据学生实际就读情况核实' },
  { id: 'R36', no: 36, label: '2人（含本人）及以上在上学', score: 3, category: 'accumulate', studentSelectable: true, teacherOnly: false, manualScore: false, clearOnTrue: false, evidence: '户口簿、学生证注册页' },
  { id: 'R37', no: 37, label: '其他特殊情况（老师酌情加分）', score: 0, category: 'manual', studentSelectable: false, teacherOnly: true, manualScore: true, clearOnTrue: false, evidence: '相关证件或手写相关情况描述（含申请人签名和居委会或村委会联系电话）、户口簿户主首页、户口簿学生本人页' },
  { id: 'R38', no: 38, label: '提供虚假佐证材料', score: 0, category: 'clear', studentSelectable: false, teacherOnly: true, manualScore: false, clearOnTrue: true, evidence: '相关举证' },
]

function getRecognitionRules() {
  return recognitionRules.map((item) => ({ ...item }))
}

function resolveDifficultyLevel(score) {
  if (score >= 90) {
    return { code: 'special', label: '特别困难', tag: '一类贫困生' }
  }
  if (score >= 40) {
    return { code: 'hard', label: '困难', tag: '二类贫困生' }
  }
  if (score >= 15) {
    return { code: 'general', label: '一般困难', tag: '三类贫困生' }
  }
  return { code: 'none', label: '未认定', tag: '未认定' }
}

function calculateRecognitionScore(payload) {
  const selectedRuleIds = Array.isArray(payload.selectedRuleIds) ? payload.selectedRuleIds : []
  const confirmedRuleIds = Array.isArray(payload.confirmedRuleIds) ? payload.confirmedRuleIds : selectedRuleIds
  const manualBonusScore = Number(payload.manualBonusScore || 0)
  const clearInvalid = Boolean(payload.clearInvalid)
  const rules = getRecognitionRules()
  const matchedRules = rules.filter((rule) => confirmedRuleIds.includes(rule.id) && !rule.clearOnTrue && !rule.manualScore)
  const baseScore = matchedRules.reduce((sum, item) => sum + Number(item.score || 0), 0)
  const rawScore = clearInvalid ? 0 : baseScore + Math.max(0, manualBonusScore)
  const level = resolveDifficultyLevel(rawScore)
  return {
    baseScore,
    manualBonusScore: clearInvalid ? 0 : Math.max(0, manualBonusScore),
    finalScore: rawScore,
    clearInvalid,
    level,
    matchedRules,
  }
}

module.exports = {
  recognitionRules,
  getRecognitionRules,
  resolveDifficultyLevel,
  calculateRecognitionScore,
}
