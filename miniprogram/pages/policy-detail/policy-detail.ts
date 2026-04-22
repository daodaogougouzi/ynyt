import { request, resolveStaticUrl, showRequestError } from '../../utils/api'
import { getCurrentStudentSession, requireCurrentStudentSession } from '../../utils/storage'

export {}

interface ScholarshipTier {
  label: string
  amount: string
  note: string
}

interface ScholarshipItem {
  id: string
  name: string
  category: string
  type: string
  sponsor: string
  amountMode: string
  amountText: string
  amountTiers: ScholarshipTier[]
  requiresPovertyRecognition: boolean
  allowedRecognitionRuleIds: string[]
  restrictionNote: string
  quota: string
  deadline: string
  intro: string
  conditions: string[]
  guide: string
  openForApply: boolean
}

interface EligibilityResult {
  eligible: boolean
  reason: string
  grantTier: ScholarshipTier | null
}

interface StudentSnapshot {
  id: string
  studentNo: string
  name: string
  college: string
  currentRecognitionStatus: string
  currentRecognitionLevel: string
  confirmedRecognitionLabels: string[]
}

interface RecognitionRule {
  id: string
  no: number
  label: string
  score: number
  studentSelectable: boolean
  evidence: string
}

interface AlternativeRecommendationItem {
  id: string
  name: string
  type: string
  amountText: string
  deadline: string
  score: number
  matchLevel: string
  fitBucket?: 'high' | 'medium' | 'low'
  reason: string
  fallbackReason?: string
  fitAdvice?: string
}

interface RecommendationSnapshot {
  score?: number
  matchLevel?: string
  fitBucket?: 'high' | 'medium' | 'low'
  aiReason?: string
}

interface ScholarshipDetailResponse {
  scholarship: ScholarshipItem
  eligibility: EligibilityResult
  recommendation?: RecommendationSnapshot
  showAlternativeRecommendations?: boolean
  alternativeRecommendations?: AlternativeRecommendationItem[]
}

interface LoadQuery {
  id?: string
}

interface ScholarshipApplicationSummary {
  id: string
  scholarshipId?: string
  scholarshipName?: string
  scholarshipType: string
  academicYear: string
  status: string
}

interface ShareProfileSnapshot {
  studentName: string
  college: string
  level: string
}

interface ShareCardPayload {
  scholarshipId: string
  scholarshipName: string
  sponsor: string
  amountText: string
  deadline: string
  reason: string
  sharer: ShareProfileSnapshot
}

interface ShareCardResponse {
  shareCard: {
    id: string
    code: string
    path: string
    title: string
    subtitle: string
    poster: string
    sharer: ShareProfileSnapshot
    payload: ShareCardPayload
    createdAt: string
  }
}

interface ScholarshipApplyPayload {
  scholarshipId: string
  personalIntro: string
  familySituation: string
  usagePlan: string
  comment: string
  attachments: ScholarshipMaterialAttachment[]
}

interface ScholarshipMaterialAttachment {
  id: string
  name: string
  type: string
  size: number
  sizeLabel: string
  contentBase64: string
}

interface ScholarshipApplyForm {
  personalIntro: string
  familySituation: string
  usagePlan: string
}

interface TempAttachmentFile {
  name: string
  path: string
  size: number
  type?: string
}

function createAttachmentId(): string {
  return `sch-attachment-${Date.now()}-${Math.floor(Math.random() * 1000)}`
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

function chooseScholarshipFiles(count: number): Promise<TempAttachmentFile[]> {
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

function buildShareReasonText(_scholarship: ScholarshipItem, eligibility: EligibilityResult): string {
  if (!eligibility.eligible) {
    return String(eligibility.reason || '').trim() || '推荐你先看这个项目，条件更友好。'
  }
  return String(eligibility.reason || '').trim() || `这个项目当前与你的条件匹配，建议优先准备材料。`
}

function resolveShareCardUrl(pathname: string): string {
  const safePath = String(pathname || '').trim()
  if (!safePath) {
    return ''
  }
  if (/^https?:\/\//i.test(safePath) || /^data:/i.test(safePath)) {
    return safePath
  }
  if (safePath.startsWith('/uploads/') || safePath.startsWith('/teacher/')) {
    return resolveStaticUrl(safePath)
  }
  return ''
}

Page({
  data: {
    scholarshipId: '',
    loading: true,
    submitting: false,
    scholarship: null as ScholarshipItem | null,
    eligibility: null as EligibilityResult | null,
    student: null as StudentSnapshot | null,
    allowedRecognitionLabels: [] as string[],
    currentAcademicYear: '',
    appliedScholarshipStatusText: '',
    hasScholarshipApplicationThisYear: false,
    recommendation: null as RecommendationSnapshot | null,
    showAlternativeRecommendations: false,
    alternativeRecommendations: [] as AlternativeRecommendationItem[],
    applyForm: {
      personalIntro: '',
      familySituation: '',
      usagePlan: '',
    } as ScholarshipApplyForm,
    applyAttachmentList: [] as ScholarshipMaterialAttachment[],
    shareGenerating: false,
    shareCard: null as ShareCardResponse['shareCard'] | null,
  },

  onLoad(query: LoadQuery) {
    const scholarshipId = typeof query.id === 'string' ? query.id : ''
    if (!scholarshipId) {
      wx.showToast({
        title: '未找到奖助项目',
        icon: 'none',
      })
      return
    }
    this.loadPolicyDetail(scholarshipId)
  },

  async loadPolicyDetail(scholarshipId: string) {
    this.setData({
      loading: true,
      scholarshipId,
    })
    try {
      const session = getCurrentStudentSession()
      const [detailResponse, ruleResponse, applicationResponse, studentResponse] = await Promise.all([
        request<ScholarshipDetailResponse>({
          url: `/api/scholarships/${scholarshipId}`,
        }),
        request<{ list: RecognitionRule[] }>({ url: '/api/recognition-rules' }),
        session
          ? request<{ list: ScholarshipApplicationSummary[] }>({ url: '/api/scholarship-applications' })
          : Promise.resolve({ list: [] as ScholarshipApplicationSummary[] }),
        session
          ? request<{ student: StudentSnapshot }>({ url: '/api/students/current' })
          : Promise.resolve({ student: null as StudentSnapshot | null }),
      ])
      const ruleMap = ruleResponse.list.reduce((acc, item) => {
        acc[item.id] = item.label
        return acc
      }, {} as Record<string, string>)
      const allowedRecognitionLabels = detailResponse.scholarship.allowedRecognitionRuleIds
        .map((ruleId) => ruleMap[ruleId])
        .filter((label) => Boolean(label))
      const currentAcademicYear = new Date().getMonth() + 1 >= 8
        ? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
        : `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`
      const sameYearApplications = applicationResponse.list.filter((item) => item.academicYear === currentAcademicYear)
      const sameScholarshipApplication = sameYearApplications.find(
        (item) => item.scholarshipId === detailResponse.scholarship.id,
      )
      this.setData({
        loading: false,
        scholarship: detailResponse.scholarship,
        eligibility: detailResponse.eligibility,
        student: studentResponse.student,
        allowedRecognitionLabels,
        currentAcademicYear,
        appliedScholarshipStatusText: sameScholarshipApplication
          ? `${sameScholarshipApplication.scholarshipName || detailResponse.scholarship.name} · ${sameScholarshipApplication.status}`
          : '',
        hasScholarshipApplicationThisYear: Boolean(sameScholarshipApplication),
        recommendation: detailResponse.recommendation || null,
        showAlternativeRecommendations: Boolean(detailResponse.showAlternativeRecommendations),
        alternativeRecommendations: Array.isArray(detailResponse.alternativeRecommendations)
          ? detailResponse.alternativeRecommendations
          : [],
        shareCard: null,
      })
    } catch (error) {
      this.setData({ loading: false })
      showRequestError(error)
    }
  },

  onOpenAlternativeRecommendation(event: WechatMiniprogram.TouchEvent) {
    const targetId = String(event.currentTarget.dataset.id || '')
    if (!targetId) {
      return
    }
    if (targetId === this.data.scholarshipId) {
      return
    }
    this.loadPolicyDetail(targetId)
  },

  onApplyInput(event: WechatMiniprogram.Input) {
    const field = String(event.currentTarget.dataset.field || '')
    if (!field) {
      return
    }
    this.setData({
      [`applyForm.${field}`]: String(event.detail.value || '').trim(),
    })
  },

  async onGenerateShareCard() {
    if (!requireCurrentStudentSession('请先登录后生成推荐卡')) {
      return
    }
    const scholarship = this.data.scholarship as ScholarshipItem | null
    const eligibility = this.data.eligibility as EligibilityResult | null
    const student = this.data.student as StudentSnapshot | null
    if (!scholarship || !eligibility || !student) {
      return
    }
    const payload: ShareCardPayload = {
      scholarshipId: scholarship.id,
      scholarshipName: scholarship.name,
      sponsor: scholarship.sponsor,
      amountText: scholarship.amountText,
      deadline: scholarship.deadline,
      reason: buildShareReasonText(scholarship, eligibility),
      sharer: {
        studentName: student.name,
        college: student.college,
        level: student.currentRecognitionLevel,
      },
    }
    this.setData({ shareGenerating: true })
    try {
      const response = await request<ShareCardResponse>({
        url: '/api/share-cards',
        method: 'POST',
        data: payload,
      })
      this.setData({
        shareCard: response.shareCard,
      })
      wx.showToast({
        title: '推荐卡已生成',
        icon: 'success',
      })
    } catch (error) {
      showRequestError(error, '推荐卡生成失败')
    } finally {
      this.setData({ shareGenerating: false })
    }
  },

  onPreviewShareCard() {
    const shareCard = this.data.shareCard as ShareCardResponse['shareCard'] | null
    if (!shareCard) {
      return
    }
    const url = resolveShareCardUrl(shareCard.poster || shareCard.path)
    if (!url) {
      wx.showToast({
        title: '分享卡地址不可用',
        icon: 'none',
      })
      return
    }
    wx.previewImage({
      current: url,
      urls: [url],
    })
  },

  onCopyShareText() {
    const shareCard = this.data.shareCard as ShareCardResponse['shareCard'] | null
    const scholarship = this.data.scholarship as ScholarshipItem | null
    const eligibility = this.data.eligibility as EligibilityResult | null
    if (!scholarship || !eligibility) {
      return
    }
    const baseText = [
      `我在用易暖医途整理奖助申请，这个项目可以重点关注：${scholarship.name}`,
      `资助标准：${scholarship.amountText}`,
      `截止时间：${scholarship.deadline}`,
      `推荐理由：${buildShareReasonText(scholarship, eligibility)}`,
    ]
    if (shareCard?.code) {
      baseText.push(`推荐码：${shareCard.code}`)
    }
    wx.setClipboardData({
      data: baseText.join('\n'),
      success: () => {
        wx.showToast({
          title: '推荐文案已复制',
          icon: 'none',
        })
      },
    })
  },

  onShareAppMessage() {
    const shareCard = this.data.shareCard as ShareCardResponse['shareCard'] | null
    const scholarship = this.data.scholarship as ScholarshipItem | null
    const student = this.data.student as StudentSnapshot | null
    const sharePath = shareCard?.path || `/pages/policy-detail/policy-detail?id=${String(this.data.scholarshipId || '').trim()}`
    const sharerName = String(student?.name || '').trim() || '同学'
    const scholarshipName = String(scholarship?.name || '').trim() || '奖助项目'
    const title = `${sharerName} 推荐你关注：${scholarshipName}`
    const imageUrl = resolveShareCardUrl(shareCard?.poster || '') || undefined
    return {
      title,
      path: sharePath,
      imageUrl,
    }
  },

  onShareTimeline() {
    const scholarship = this.data.scholarship as ScholarshipItem | null
    const student = this.data.student as StudentSnapshot | null
    const scholarshipName = String(scholarship?.name || '').trim() || '奖助项目'
    const sharerName = String(student?.name || '').trim() || '同学'
    return {
      title: `${sharerName} 的奖助推荐卡：${scholarshipName}`,
      query: `id=${String(this.data.scholarshipId || '').trim()}`,
    }
  },

  async onChooseApplyAttachments() {
    if (!requireCurrentStudentSession('请先登录后上传申请附件')) {
      return
    }
    try {
      const remaining = Math.max(0, 5 - (this.data.applyAttachmentList as ScholarshipMaterialAttachment[]).length)
      if (remaining <= 0) {
        wx.showToast({
          title: '最多上传5个附件',
          icon: 'none',
        })
        return
      }
      const tempFiles = await chooseScholarshipFiles(remaining)
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
          } as ScholarshipMaterialAttachment
        }),
      )
      this.setData({
        applyAttachmentList: (this.data.applyAttachmentList as ScholarshipMaterialAttachment[]).concat(attachments),
      })
    } catch (error) {
      showRequestError(error, '附件上传失败')
    }
  },

  onRemoveApplyAttachment(event: WechatMiniprogram.TouchEvent) {
    const attachmentId = String(event.currentTarget.dataset.id || '')
    if (!attachmentId) {
      return
    }
    this.setData({
      applyAttachmentList: (this.data.applyAttachmentList as ScholarshipMaterialAttachment[]).filter(
        (item) => item.id !== attachmentId,
      ),
    })
  },

  validateApplyForm(): boolean {
    const applyForm = this.data.applyForm as ScholarshipApplyForm
    if (!applyForm.personalIntro || !applyForm.familySituation || !applyForm.usagePlan) {
      wx.showToast({
        title: '请完整填写申请信息',
        icon: 'none',
      })
      return false
    }
    if ((this.data.applyAttachmentList as ScholarshipMaterialAttachment[]).length === 0) {
      wx.showToast({
        title: '请至少上传1个附件',
        icon: 'none',
      })
      return false
    }
    return true
  },

  async onApply() {
    if (!requireCurrentStudentSession('请先登录后提交奖助申请')) {
      return
    }
    const scholarship = this.data.scholarship as ScholarshipItem | null
    const eligibility = this.data.eligibility as EligibilityResult | null
    if (!scholarship || !eligibility) {
      return
    }
    if (!scholarship.openForApply) {
      wx.showToast({
        title: '该项目暂未开放申请',
        icon: 'none',
      })
      return
    }
    if (!eligibility.eligible) {
      wx.showToast({
        title: '当前不符合申请条件',
        icon: 'none',
      })
      return
    }
    if (!this.validateApplyForm()) {
      return
    }
    const applyForm = this.data.applyForm as ScholarshipApplyForm
    const attachmentList = this.data.applyAttachmentList as ScholarshipMaterialAttachment[]
    const applyPayload: ScholarshipApplyPayload = {
      scholarshipId: scholarship.id,
      personalIntro: applyForm.personalIntro,
      familySituation: applyForm.familySituation,
      usagePlan: applyForm.usagePlan,
      comment: [
        `个人简介：${applyForm.personalIntro}`,
        `家庭情况：${applyForm.familySituation}`,
        `使用计划：${applyForm.usagePlan}`,
      ].join('\n'),
      attachments: attachmentList,
    }
    this.setData({ submitting: true })
    try {
      await request<{ application: { id: string } }>({
        url: '/api/scholarship-applications',
        method: 'POST',
        data: applyPayload,
      })
      wx.showToast({
        title: '申请已提交',
        icon: 'success',
      })
      this.setData({
        applyForm: {
          personalIntro: '',
          familySituation: '',
          usagePlan: '',
        },
        applyAttachmentList: [],
      })
      this.loadPolicyDetail(this.data.scholarshipId as string)
    } catch (error) {
      showRequestError(error)
    } finally {
      this.setData({ submitting: false })
    }
  },
})
