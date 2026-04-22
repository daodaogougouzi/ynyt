import { request, showRequestError } from '../../utils/api'
import { getCurrentStudentSession, requireCurrentStudentSession } from '../../utils/storage'

export {}

interface StudentSnapshot {
  id: string
  name: string
  studentNo: string
  college: string
  major: string
  className: string
  grade: string
  currentRecognitionStatus: string
  currentRecognitionLevel: string
}

interface MaterialDraftPriority {
  required: string[]
  recommended: string[]
}

interface MaterialDraftRecord {
  id: string
  scholarshipName: string
  draftText: string
  requiredChecklist: string[]
  missingMaterials: string[]
  missingMaterialsByPriority?: MaterialDraftPriority
  nextAction?: string
  tips: string[]
  createdAt: string
}

interface ScholarshipSimple {
  id: string
  name: string
  category: string
  type: string
  openForApply: boolean
}

interface DraftFormModel {
  personalSummary: string
  hardshipNote: string
  strengths: string
  goal: string
}

const AI_ASSISTANT_INTRO_TITLE = 'AIGC 材料草稿助手'
const AI_ASSISTANT_INTRO_TEXT = '根据你的基本信息和申请目标，快速生成可编辑的奖助申请草稿。'

function normalizeListText(rawValue: string): string[] {
  return String(rawValue || '')
    .split(/[，,、\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

Page({
  data: {
    loading: false,
    draftSubmitting: false,
    hasStudentSession: false,
    assistantIntroTitle: AI_ASSISTANT_INTRO_TITLE,
    assistantIntroText: AI_ASSISTANT_INTRO_TEXT,
    student: null as StudentSnapshot | null,
    materials: [
      '家庭情况说明或个人申请书',
      '重大疾病病历、诊断书或突发事件证明',
      '受灾证明、事故证明或居委会/村委会说明',
      '户口簿户主首页、家庭成员页、学生本人页',
      '辅导员审核意见或学院补充材料',
    ],
    draftScholarships: [] as ScholarshipSimple[],
    draftScholarshipIndex: 0,
    draftForm: {
      personalSummary: '',
      hardshipNote: '',
      strengths: '',
      goal: '',
    } as DraftFormModel,
    latestDraft: null as MaterialDraftRecord | null,
    draftHistory: [] as MaterialDraftRecord[],
  },

  onLoad() {
    this.refreshDynamicData()
  },

  onShow() {
    this.refreshDynamicData()
  },

  openLogin() {
    wx.switchTab({ url: '/pages/mine/mine' })
  },

  async refreshDynamicData() {
    const session = getCurrentStudentSession()
    if (!session) {
      this.setData({
        hasStudentSession: false,
        loading: false,
        student: null,
        draftScholarships: [],
        draftScholarshipIndex: 0,
        latestDraft: null,
        draftHistory: [],
      })
      return
    }

    this.setData({ loading: true, hasStudentSession: true })
    try {
      const [studentResponse, draftResponse, scholarshipResponse] = await Promise.all([
        request<{ student: StudentSnapshot }>({ url: '/api/students/current' }),
        request<{ list: MaterialDraftRecord[] }>({ url: '/api/material-drafts' }),
        request<{ list: ScholarshipSimple[] }>({ url: '/api/scholarships' }),
      ])

      const draftScholarships = scholarshipResponse.list
        .filter((item) => item.openForApply)
        .map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          type: item.type,
          openForApply: item.openForApply,
        }))

      let draftScholarshipIndex = this.data.draftScholarshipIndex as number
      if (draftScholarships.length === 0 || draftScholarshipIndex >= draftScholarships.length) {
        draftScholarshipIndex = 0
      }

      this.setData({
        loading: false,
        student: studentResponse.student,
        draftScholarships,
        draftScholarshipIndex,
        latestDraft: draftResponse.list[0] || null,
        draftHistory: draftResponse.list.slice(0, 3),
      })
    } catch (error) {
      this.setData({ loading: false })
      showRequestError(error)
    }
  },

  onDraftScholarshipChange(event: WechatMiniprogram.PickerChange) {
    this.setData({
      draftScholarshipIndex: Number(event.detail.value || 0),
    })
  },

  onDraftFormInput(event: WechatMiniprogram.Input) {
    const field = String(event.currentTarget.dataset.field || '')
    if (!field) {
      return
    }
    this.setData({
      [`draftForm.${field}`]: String(event.detail.value || '').trim(),
    })
  },

  async onGenerateDraft() {
    if (!requireCurrentStudentSession('请先登录后生成申请草稿')) {
      return
    }
    const draftScholarships = this.data.draftScholarships as ScholarshipSimple[]
    const draftScholarshipIndex = this.data.draftScholarshipIndex as number
    const selectedScholarship = draftScholarships[draftScholarshipIndex] || null
    if (!selectedScholarship) {
      wx.showToast({
        title: '暂无可用奖助项目',
        icon: 'none',
      })
      return
    }

    const draftForm = this.data.draftForm as DraftFormModel
    const hasInput = Boolean(
      String(draftForm.personalSummary || '').trim() ||
        String(draftForm.hardshipNote || '').trim() ||
        String(draftForm.strengths || '').trim() ||
        String(draftForm.goal || '').trim(),
    )
    if (!hasInput) {
      wx.showToast({
        title: '请至少填写一项草稿信息',
        icon: 'none',
      })
      return
    }

    this.setData({ draftSubmitting: true })
    try {
      const response = await request<{ draft: MaterialDraftRecord }>({
        url: '/api/material-drafts',
        method: 'POST',
        data: {
          scholarshipId: selectedScholarship.id,
          personalSummary: draftForm.personalSummary,
          hardshipNote: draftForm.hardshipNote,
          strengths: normalizeListText(draftForm.strengths),
          goal: draftForm.goal,
          providedMaterials: this.data.materials,
        },
      })
      const draft = response.draft
      const draftHistory = [draft].concat(this.data.draftHistory as MaterialDraftRecord[]).slice(0, 3)
      this.setData({
        latestDraft: draft,
        draftHistory,
      })
      wx.showToast({
        title: '草稿生成成功',
        icon: 'success',
      })
    } catch (error) {
      showRequestError(error)
    } finally {
      this.setData({ draftSubmitting: false })
    }
  },

  openAiAssistantRoom() {
    const introTitle = encodeURIComponent(String(this.data.assistantIntroTitle || AI_ASSISTANT_INTRO_TITLE))
    const introText = encodeURIComponent(String(this.data.assistantIntroText || AI_ASSISTANT_INTRO_TEXT))
    wx.navigateTo({
      url: `/pages/ai-chat-room/ai-chat-room?scene=material-draft&title=AI%E6%9D%90%E6%96%99%E5%8A%A9%E6%89%8B&introTitle=${introTitle}&introText=${introText}`,
    })
  },

  onCopyDraft() {
    const latestDraft = this.data.latestDraft as MaterialDraftRecord | null
    if (!latestDraft) {
      return
    }
    wx.setClipboardData({
      data: latestDraft.draftText,
      success: () => {
        wx.showToast({
          title: '草稿已复制',
          icon: 'success',
        })
      },
    })
  },
})
