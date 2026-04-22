const {
  collegeOptions,
  gradeOptions,
  familyOptions,
  awardOptions,
  householdOptions,
  noFailOptions,
  emergencyOptions,
  recognitionOptions,
  recognitionWarning,
  runEvaluate,
} = require('../../mock/evaluateRule') as {
  collegeOptions: string[]
  gradeOptions: string[]
  familyOptions: string[]
  awardOptions: string[]
  householdOptions: string[]
  noFailOptions: string[]
  emergencyOptions: string[]
  recognitionOptions: Array<{ key: string; label: string; evidence: string; level: string }>
  recognitionWarning: string
  runEvaluate: (formData: FormDataModel) => EvaluateOutput
}

import {
  EvaluateHistoryItem,
  getEvaluateHistory,
  saveEvaluateHistory,
  getCurrentStudentSession,
  requireCurrentStudentSession,
} from '../../utils/storage'
import { request, showRequestError } from '../../utils/api'

const RECOMMEND_REASON_HINTS: Record<string, string[]> = {
  high: ['可优先准备材料并尽快提交，整体命中度较高。', '建议先核对截止时间，再补齐附件材料。'],
  medium: ['建议先补强对应条件项后再提交。', '可先完善认定与佐证材料，提高通过率。'],
  low: ['当前更建议先完成困难认定，再尝试相关项目。', '可先从条件更匹配的项目入手，降低申请阻力。'],
}

const RECOGNITION_AI_INTRO_TITLE = '提交前还想确认？'
const RECOGNITION_AI_INTRO_TEXT = '可以继续问认定流程、材料准备、退回原因和填写建议。'

export {}

interface FormDataModel {
  college: string
  grade: string
  ranking: string
  gpa: string
  family: string
  hasAward: string
  household: string
  noFailCourse: string
  suddenHardship: string
  recognitionType: string
  recognitionLevel: string
  recognitionLabel: string
  recognitionEvidence: string
}

interface RuleResult {
  name: string
  matched: boolean
  reason: string
}

interface RecommendItem {
  id?: string
  name: string
  reason: string
  score?: number
  matchLevel?: string
}

interface EvaluateOutput {
  results: RuleResult[]
  matchedList: RuleResult[]
  unmatchedList: RuleResult[]
  recommendedList: RecommendItem[]
  primaryStatus: 'success' | 'danger'
  primaryText: string
}

interface RecommendationApiItem {
  id: string
  name: string
  score: number
  matchLevel: string
  reasons: string[]
}


interface RecognitionRule {
  id: string
  no: number
  label: string
  score: number
  studentSelectable: boolean
  evidence: string
}

interface RecognitionPreview {
  baseScore: number
  finalScore: number
  manualBonusScore: number
  clearInvalid: boolean
  level: {
    label: string
  }
}

interface RecognitionProfile {
  studentNo: string
  name: string
  college: string
  collegeKey: string
  major: string
  className: string
  grade: string
  phone: string
}

interface StudentSnapshot extends RecognitionProfile {
  id: string
  currentRecognitionStatus: string
  currentRecognitionLevel: string
  confirmedRecognitionLabels: string[]
}

interface RecognitionRecord {
  id: string
  reviewStatus: string
  finalLevel: string
  submittedAt: string
  reviewComment?: string
}

interface RecognitionAttachment {
  id: string
  name: string
  type: string
  size: number
  sizeLabel: string
  contentBase64: string
}

interface TempAttachmentFile {
  name: string
  path: string
  size: number
  type?: string
}

function createHistoryId(): string {
  return `his-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

function createAttachmentId(): string {
  return `attachment-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

function formatNow(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  const hour = `${now.getHours()}`.padStart(2, '0')
  const minute = `${now.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

function createEmptyProfile(): RecognitionProfile {
  return {
    studentNo: '',
    name: '',
    college: '',
    collegeKey: '',
    major: '',
    className: '',
    grade: '',
    phone: '',
  }
}

function formatAttachmentSize(size: number): string {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)}MB`
  }
  if (size >= 1024) {
    return `${Math.round(size / 1024)}KB`
  }
  return `${size}B`
}

function guessAttachmentType(fileName: string): string {
  const normalized = String(fileName || '').toLowerCase()
  if (normalized.endsWith('.pdf')) {
    return 'application/pdf'
  }
  if (normalized.endsWith('.doc')) {
    return 'application/msword'
  }
  if (normalized.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  if (normalized.endsWith('.xls')) {
    return 'application/vnd.ms-excel'
  }
  if (normalized.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }
  if (normalized.endsWith('.png')) {
    return 'image/png'
  }
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) {
    return 'image/jpeg'
  }
  return 'application/octet-stream'
}

function resolveStudentRecognitionInfo(student: StudentSnapshot | null) {
  const labels = Array.isArray(student?.confirmedRecognitionLabels) ? student?.confirmedRecognitionLabels : []
  const matchedOption = recognitionOptions.find((option) =>
    labels.some((label) => label === option.label || label.includes(option.label) || option.label.includes(label)),
  )
  if (matchedOption) {
    return matchedOption
  }
  if (!student || student.currentRecognitionLevel === '未认定') {
    return recognitionOptions[0]
  }
  return {
    key: 'none',
    label: labels[0] || student.currentRecognitionLevel,
    evidence: '当前认定类型已根据老师审核结果自动同步。',
    level: student.currentRecognitionLevel === '特别困难' ? 'special' : 'hard',
  }
}

function chooseRecognitionFiles(count: number): Promise<TempAttachmentFile[]> {
  return new Promise((resolve, reject) => {
    wx.chooseMessageFile({
      count,
      type: 'file',
      success: (result) => {
        resolve((result.tempFiles || []) as unknown as TempAttachmentFile[])
      },
      fail: (error) => {
        reject(new Error(error.errMsg || '附件选择失败'))
      },
    })
  })
}

function readFileAsBase64(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath,
      encoding: 'base64',
      success: (result) => {
        resolve(String(result.data || ''))
      },
      fail: (error) => {
        reject(new Error(error.errMsg || '附件读取失败'))
      },
    })
  })
}

function mergeRecommendedListByApi(
  localList: RecommendItem[],
  apiList: RecommendationApiItem[],
): RecommendItem[] {
  const apiMap = (Array.isArray(apiList) ? apiList : []).reduce<Record<string, RecommendationApiItem>>((map, item) => {
    const safeName = String(item?.name || '').trim()
    if (safeName) {
      map[safeName] = item
    }
    return map
  }, {})

  return (Array.isArray(localList) ? localList : []).map((item) => {
    const safeName = String(item?.name || '').trim()
    const matched = safeName ? apiMap[safeName] : null
    const matchLevel = String(matched?.matchLevel || '').trim()
    const reasonHints = matchLevel === '高匹配'
      ? RECOMMEND_REASON_HINTS.high
      : matchLevel === '中匹配'
        ? RECOMMEND_REASON_HINTS.medium
        : RECOMMEND_REASON_HINTS.low
    const reasonFromApi = Array.isArray(matched?.reasons)
      ? matched.reasons.map((entry) => String(entry || '').trim()).filter(Boolean)[0] || ''
      : ''
    return {
      ...item,
      id: matched ? String(matched.id || '').trim() || undefined : item.id,
      score: matched ? Number(matched.score || 0) : undefined,
      matchLevel: matchLevel || undefined,
      reason: reasonFromApi || String(item.reason || '').trim() || reasonHints[0],
    }
  })
}

function createRecommendationSummaryText(recommendedList: RecommendItem[]): string {
  const list = Array.isArray(recommendedList) ? recommendedList : []
  if (list.length === 0) {
    return ''
  }
  const highCount = list.filter((item) => String(item.matchLevel || '').trim() === '高匹配').length
  const mediumCount = list.filter((item) => String(item.matchLevel || '').trim() === '中匹配').length
  const lowCount = list.filter((item) => String(item.matchLevel || '').trim() === '待提升').length
  return `推荐概览：高匹配 ${highCount} 项，中匹配 ${mediumCount} 项，待提升 ${lowCount} 项。`
}

Page({
  data: {
    hasStudentSession: false,
    activeTab: 'evaluate',
    collegeOptions,
    gradeOptions,
    familyOptions,
    awardOptions,
    householdOptions,
    noFailOptions,
    emergencyOptions,
    recognitionOptions,
    recognitionWarning,
    collegeIndex: 0,
    gradeIndex: 0,
    recognitionIndex: 0,
    currentRecognitionLabel: recognitionOptions[0].label,
    currentRecognitionEvidence: recognitionOptions[0].evidence,
    form: {
      college: collegeOptions[0],
      grade: gradeOptions[0],
      ranking: '',
      gpa: '',
      family: familyOptions[0],
      hasAward: awardOptions[1],
      household: householdOptions[0],
      noFailCourse: noFailOptions[0],
      suddenHardship: emergencyOptions[1],
      recognitionType: recognitionOptions[0].key,
      recognitionLevel: '未认定',
      recognitionLabel: recognitionOptions[0].label,
      recognitionEvidence: recognitionOptions[0].evidence,
    } as FormDataModel,
    hasEvaluated: false,
    evaluateResult: null as EvaluateOutput | null,
    recommendationSummaryText: '',
    historyList: [] as EvaluateHistoryItem[],
    recognitionLoading: false,
    recognitionSubmitting: false,
    currentStudent: null as StudentSnapshot | null,
    profile: createEmptyProfile() as RecognitionProfile,
    recognitionRules: [] as RecognitionRule[],
    selectedRuleIds: [] as string[],
    selectedRuleIdMap: {} as Record<string, boolean>,
    selectedMaterials: [] as string[],
    attachmentList: [] as RecognitionAttachment[],
    supplementalNote: '',
    recognitionPreview: null as RecognitionPreview | null,
    recognitionHistory: [] as RecognitionRecord[],
    recognitionReadonly: false,
    recognitionReadonlyText: '',
  },

  onLoad() {
    this.loadHistoryList()
  },

  onShow() {
    const session = getCurrentStudentSession()
    if (session) {
      this.setData({ hasStudentSession: true })
      this.loadHistoryList()
      this.loadRecognitionContext()
      return
    }
    this.setData({
      hasStudentSession: false,
      hasEvaluated: false,
      evaluateResult: null,
      recommendationSummaryText: '',
      historyList: [],
      currentStudent: null,
      profile: createEmptyProfile(),
      recognitionRules: [],
      selectedRuleIds: [],
      selectedRuleIdMap: {},
      selectedMaterials: [],
      attachmentList: [],
      supplementalNote: '',
      recognitionPreview: null,
      recognitionHistory: [],
      recognitionReadonly: false,
      recognitionReadonlyText: '请先登录后使用 AI 评估、认定申请与个人记录功能。',
      recognitionLoading: false,
    })
  },

  onSwitchTab(event: WechatMiniprogram.TouchEvent) {
    const tab = String(event.currentTarget.dataset.tab || 'evaluate')
    this.setData({ activeTab: tab })
  },

  async loadRecognitionContext() {
    if (!getCurrentStudentSession()) {
      this.setData({ recognitionLoading: false })
      return
    }
    this.setData({ recognitionLoading: true })
    try {
      const studentResponse = await request<{ student: StudentSnapshot }>({ url: '/api/students/current' })
      const rulesResponse = await request<{ list: RecognitionRule[] }>({ url: '/api/recognition-rules' })
      const currentStudent = studentResponse.student
      const recognitionHistoryResponse = await request<{ list: RecognitionRecord[] }>({
        url: `/api/recognitions?studentId=${encodeURIComponent(currentStudent.id)}`,
      })
      const recognitionRules = rulesResponse.list.filter((item) => item.studentSelectable)
      const profile: RecognitionProfile = {
        studentNo: currentStudent.studentNo,
        name: currentStudent.name,
        college: currentStudent.college,
        collegeKey: currentStudent.collegeKey,
        major: currentStudent.major,
        className: currentStudent.className,
        grade: currentStudent.grade,
        phone: currentStudent.phone,
      }
      const currentRecognition = resolveStudentRecognitionInfo(currentStudent)
      const latestRecognition = recognitionHistoryResponse.list[0] || null
      const recognitionReadonly = Boolean(
        currentStudent.currentRecognitionStatus === '审核通过' ||
          (latestRecognition && latestRecognition.reviewStatus !== '驳回'),
      )
      const recognitionReadonlyText = currentStudent.currentRecognitionStatus === '审核通过'
        ? '当前认定已通过，不能重复申请，请查看下方认定记录。'
        : latestRecognition && latestRecognition.reviewStatus === '待审核'
          ? '当前认定申请正在审核中，请先查看审核结果。'
          : latestRecognition && latestRecognition.reviewStatus === '退回补充'
            ? '当前认定申请已退回补充，请先查看下方记录。'
            : ''
      this.setData({
        recognitionLoading: false,
        currentStudent,
        profile,
        recognitionRules,
        recognitionHistory: recognitionHistoryResponse.list,
        recognitionReadonly,
        recognitionReadonlyText,
        recognitionIndex: Math.max(
          0,
          recognitionOptions.findIndex((item) => item.key === currentRecognition.key),
        ),
        currentRecognitionLabel: currentRecognition.label,
        currentRecognitionEvidence: currentRecognition.evidence,
        'form.recognitionType': currentRecognition.key,
        'form.recognitionLevel': currentStudent.currentRecognitionLevel,
        'form.recognitionLabel': currentRecognition.label,
        'form.recognitionEvidence': currentRecognition.evidence,
      })
      this.updateSelectedMaterials(this.data.selectedRuleIds as string[])
      if ((this.data.selectedRuleIds as string[]).length > 0) {
        this.loadRecognitionPreview(this.data.selectedRuleIds as string[])
      }
    } catch (error) {
      this.setData({ recognitionLoading: false })
      showRequestError(error)
    }
  },

  updateSelectedMaterials(selectedRuleIds: string[]) {
    const materialMap: Record<string, boolean> = {}
    const selectedMaterials = (this.data.recognitionRules as RecognitionRule[])
      .filter((item) => selectedRuleIds.includes(item.id))
      .map((item) => item.evidence)
      .filter((item) => {
        if (materialMap[item]) {
          return false
        }
        materialMap[item] = true
        return true
      })
    this.setData({ selectedMaterials })
  },

  async loadRecognitionPreview(selectedRuleIds: string[]) {
    if (selectedRuleIds.length === 0) {
      this.setData({
        recognitionPreview: null,
        selectedRuleIdMap: {},
      })
      return
    }
    try {
      const response = await request<RecognitionPreview>({
        url: '/api/recognitions/preview',
        method: 'POST',
        data: { selectedRuleIds },
      })
      this.setData({ recognitionPreview: response })
    } catch (error) {
      showRequestError(error, '认定预估失败')
    }
  },

  applySelectedRuleIds(selectedRuleIds: string[]) {
    const recognitionRules = this.data.recognitionRules as RecognitionRule[]
    const ruleOrderMap = recognitionRules.reduce<Record<string, number>>((map, item, index) => {
      map[item.id] = index
      return map
    }, {})
    const normalizedRuleIds = Array.from(
      new Set(
        (selectedRuleIds || [])
          .map((item) => String(item || '').trim())
          .filter((item) => Boolean(item) && ruleOrderMap[item] !== undefined),
      ),
    ).sort((left, right) => ruleOrderMap[left] - ruleOrderMap[right])
    const selectedRuleIdMap = normalizedRuleIds.reduce<Record<string, boolean>>((map, item) => {
      map[item] = true
      return map
    }, {})
    this.setData({
      selectedRuleIds: normalizedRuleIds,
      selectedRuleIdMap,
    })
    this.updateSelectedMaterials(normalizedRuleIds)
    this.loadRecognitionPreview(normalizedRuleIds)
  },

  onRuleChange(event: WechatMiniprogram.CustomEvent) {
    const selectedRuleIds = (event.detail.value as string[]) || []
    this.applySelectedRuleIds(selectedRuleIds)
  },

  onToggleRule(event: WechatMiniprogram.TouchEvent) {
    const ruleId = String(event.currentTarget.dataset.id || '').trim()
    if (!ruleId) {
      return
    }
    const currentRuleIds = this.data.selectedRuleIds as string[]
    const nextRuleIds = currentRuleIds.includes(ruleId)
      ? currentRuleIds.filter((item) => item !== ruleId)
      : currentRuleIds.concat(ruleId)
    this.applySelectedRuleIds(nextRuleIds)
  },

  onProfileInput(event: WechatMiniprogram.Input) {
    const field = String(event.currentTarget.dataset.field || '')
    if (!field) {
      return
    }
    this.setData({
      [`profile.${field}`]: String(event.detail.value || '').trim(),
    })
  },

  onSupplementalNoteInput(event: WechatMiniprogram.Input) {
    this.setData({
      supplementalNote: String(event.detail.value || '').trim(),
    })
  },

  openLogin() {
    wx.switchTab({ url: '/pages/mine/mine' })
  },

  openAiPanel() {
    const introTitle = encodeURIComponent(RECOGNITION_AI_INTRO_TITLE)
    const introText = encodeURIComponent(RECOGNITION_AI_INTRO_TEXT)
    wx.navigateTo({
      url: `/pages/ai-chat-room/ai-chat-room?scene=recognition&title=AI%E8%AE%A4%E5%AE%9A%E5%8A%A9%E6%89%8B&introTitle=${introTitle}&introText=${introText}`,
    })
  },

  onCollegeChange(event: WechatMiniprogram.PickerChange) {
    const nextIndex = Number(event.detail.value)
    this.setData({
      collegeIndex: nextIndex,
      'form.college': this.data.collegeOptions[nextIndex],
    })
  },

  onGradeChange(event: WechatMiniprogram.PickerChange) {
    const nextIndex = Number(event.detail.value)
    this.setData({
      gradeIndex: nextIndex,
      'form.grade': this.data.gradeOptions[nextIndex],
    })
  },

  async onChooseAttachments() {
    if (!requireCurrentStudentSession('请先登录后上传认定材料')) {
      return
    }
    try {
      const remaining = Math.max(0, 5 - (this.data.attachmentList as RecognitionAttachment[]).length)
      if (remaining <= 0) {
        wx.showToast({
          title: '最多上传5个附件',
          icon: 'none',
        })
        return
      }
      const tempFiles = await chooseRecognitionFiles(remaining)
      if (!tempFiles.length) {
        return
      }
      const attachments = await Promise.all(
        tempFiles.map(async (file) => {
          const contentBase64 = await readFileAsBase64(file.path)
          return {
            id: createAttachmentId(),
            name: file.name,
            type: file.type || guessAttachmentType(file.name),
            size: Number(file.size || 0),
            sizeLabel: formatAttachmentSize(Number(file.size || 0)),
            contentBase64,
          } as RecognitionAttachment
        }),
      )
      this.setData({
        attachmentList: (this.data.attachmentList as RecognitionAttachment[]).concat(attachments),
      })
    } catch (error) {
      showRequestError(error, '附件上传失败')
    }
  },

  onRemoveAttachment(event: WechatMiniprogram.TouchEvent) {
    const attachmentId = String(event.currentTarget.dataset.id || '')
    if (!attachmentId) {
      return
    }
    this.setData({
      attachmentList: (this.data.attachmentList as RecognitionAttachment[]).filter((item) => item.id !== attachmentId),
    })
  },

  onRankingInput(event: WechatMiniprogram.Input) {
    this.setData({
      'form.ranking': String(event.detail.value || '').trim(),
    })
  },

  onGpaInput(event: WechatMiniprogram.Input) {
    this.setData({
      'form.gpa': String(event.detail.value || '').trim(),
    })
  },

  onFamilyChange(event: WechatMiniprogram.RadioGroupChange) {
    this.setData({
      'form.family': String(event.detail.value || ''),
    })
  },

  onAwardChange(event: WechatMiniprogram.RadioGroupChange) {
    this.setData({
      'form.hasAward': String(event.detail.value || ''),
    })
  },

  onHouseholdChange(event: WechatMiniprogram.RadioGroupChange) {
    this.setData({
      'form.household': String(event.detail.value || ''),
    })
  },

  onNoFailChange(event: WechatMiniprogram.RadioGroupChange) {
    this.setData({
      'form.noFailCourse': String(event.detail.value || ''),
    })
  },

  onEmergencyChange(event: WechatMiniprogram.RadioGroupChange) {
    this.setData({
      'form.suddenHardship': String(event.detail.value || ''),
    })
  },

  validateForm(): boolean {
    const form = this.data.form as FormDataModel
    if (
      !form.college ||
      !form.grade ||
      !form.ranking ||
      !form.gpa ||
      !form.family ||
      !form.hasAward ||
      !form.household ||
      !form.noFailCourse ||
      !form.suddenHardship
    ) {
      wx.showToast({
        title: '请完整填写评估信息',
        icon: 'none',
      })
      return false
    }

    const rankingNumber = Number(String(form.ranking).replace('%', '').trim())
    if (!Number.isFinite(rankingNumber) || rankingNumber < 0 || rankingNumber > 100) {
      wx.showToast({
        title: '学业排名请输入0-100数字',
        icon: 'none',
      })
      return false
    }

    const gpaNumber = Number(String(form.gpa).trim())
    if (!Number.isFinite(gpaNumber) || gpaNumber < 0 || gpaNumber > 5) {
      wx.showToast({
        title: '平均绩点请输入0-5数字',
        icon: 'none',
      })
      return false
    }

    return true
  },

  validateRecognitionForm(): boolean {
    const profile = this.data.profile as RecognitionProfile
    if (
      !profile.studentNo ||
      !profile.name ||
      !profile.college ||
      !profile.major ||
      !profile.className ||
      !profile.grade ||
      !profile.phone
    ) {
      wx.showToast({
        title: '请完整填写认定申请信息',
        icon: 'none',
      })
      return false
    }
    if ((this.data.selectedRuleIds as string[]).length === 0) {
      wx.showToast({
        title: '请至少勾选一项认定情况',
        icon: 'none',
      })
      return false
    }
    return true
  },

  async onStartEvaluate() {
    if (!this.validateForm()) {
      return
    }

    const evaluateResult = runEvaluate(this.data.form as FormDataModel)
    let recommendedList = evaluateResult.recommendedList
    try {
      const recommendationResponse = await request<{ list: RecommendationApiItem[] }>({
        url: '/api/recommendations?limit=12',
      })
      recommendedList = mergeRecommendedListByApi(evaluateResult.recommendedList, recommendationResponse.list || [])
    } catch (error) {
      // Keep local evaluate recommendations when recommendation API is temporarily unavailable.
    }

    const nextEvaluateResult: EvaluateOutput = {
      ...evaluateResult,
      recommendedList,
    }

    this.setData({
      hasEvaluated: true,
      evaluateResult: nextEvaluateResult,
      recommendationSummaryText: createRecommendationSummaryText(recommendedList),
    })

    const recognitionLabel = this.data.form.recognitionLabel || this.data.currentRecognitionLabel
    const historyItem: EvaluateHistoryItem = {
      id: createHistoryId(),
      time: formatNow(),
      college: this.data.form.college,
      grade: this.data.form.grade,
      ranking: this.data.form.ranking,
      gpa: this.data.form.gpa,
      family: this.data.form.family,
      hasAward: this.data.form.hasAward,
      status: evaluateResult.primaryStatus,
      text: `${evaluateResult.primaryText}｜认定：${recognitionLabel}`,
      matchedList: nextEvaluateResult.recommendedList.map((item) => item.name),
    }

    const historyList = saveEvaluateHistory(historyItem)
    this.setData({ historyList })
  },

  loadHistoryList() {
    this.setData({
      historyList: getEvaluateHistory(),
    })
  },

  onOpenRecognitionDetail(event: WechatMiniprogram.TouchEvent) {
    if (!requireCurrentStudentSession('请先登录后查看认定详情')) {
      return
    }
    const recordId = String(event.currentTarget.dataset.id || '')
    if (!recordId) {
      return
    }
    wx.navigateTo({ url: `/pages/recognition-detail/recognition-detail?id=${recordId}` })
  },

  onOpenRecommendedScholarship(event: WechatMiniprogram.TouchEvent) {
    if (!requireCurrentStudentSession('请先登录后查看奖助详情')) {
      return
    }
    const scholarshipId = String(event.currentTarget.dataset.id || '').trim()
    const scholarshipName = String(event.currentTarget.dataset.name || '').trim()
    if (!scholarshipId) {
      wx.showToast({
        title: `${scholarshipName || '该项目'}详情暂未同步`,
        icon: 'none',
      })
      return
    }
    wx.navigateTo({ url: `/pages/policy-detail/policy-detail?id=${scholarshipId}` })
  },

  async onSubmitRecognition() {
    if (!requireCurrentStudentSession('请先登录后提交认定申请')) {
      return
    }
    if (!this.validateRecognitionForm()) {
      return
    }
    this.setData({ recognitionSubmitting: true })
    try {
      const currentStudent = this.data.currentStudent as StudentSnapshot | null
      const profile = this.data.profile as RecognitionProfile
      const attachmentList = this.data.attachmentList as RecognitionAttachment[]
      await request<{ application: { id: string } }>({
        url: '/api/recognitions',
        method: 'POST',
        data: {
          profile: {
            ...profile,
            collegeKey: currentStudent?.collegeKey || profile.collegeKey || '',
          },
          selectedRuleIds: this.data.selectedRuleIds,
          supplementalNote: this.data.supplementalNote,
          materials: this.data.selectedMaterials,
          attachments: attachmentList,
        },
      })
      wx.showToast({
        title: '认定申请已提交',
        icon: 'success',
      })
      this.setData({
        selectedRuleIds: [],
        selectedRuleIdMap: {},
        selectedMaterials: [],
        attachmentList: [],
        supplementalNote: '',
        recognitionPreview: null,
      })
      this.loadRecognitionContext()
    } catch (error) {
      showRequestError(error)
    } finally {
      this.setData({ recognitionSubmitting: false })
    }
  },
})
