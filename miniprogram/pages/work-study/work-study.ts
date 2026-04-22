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

interface WorkStudyJobItem {
  id: string
  title: string
  department: string
  location: string
  salaryPerHour: number
  weeklyHoursMax: number
  monthlyHoursMax: number
  requiredSkills: string[]
  shiftSlots: string[]
  tags: string[]
  matchScore: number
  matchLevel: string
  eligible: boolean
  reason: string
  matchReasons: string[]
}

interface WorkStudyApplicationItem {
  id: string
  jobTitle: string
  department: string
  status: string
  matchScore: number
  matchLevel: string
  submittedAt: string
  reviewedAt: string
  reviewComment?: string
}

function normalizeListText(rawValue: string): string[] {
  return String(rawValue || '')
    .split(/[，,、\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

Page({
  data: {
    loading: false,
    applying: false,
    hasStudentSession: false,
    student: null as StudentSnapshot | null,
    workStudyJobs: [] as WorkStudyJobItem[],
    workStudyApplications: [] as WorkStudyApplicationItem[],
    showApplyPanel: false,
    selectedJob: null as WorkStudyJobItem | null,
    selectedApplySlots: [] as string[],
    applyIntro: '',
    applySkillTags: '',
  },

  onShow() {
    this.refreshDynamicData()
  },

  async refreshDynamicData() {
    const session = getCurrentStudentSession()
    if (!session) {
      this.setData({
        hasStudentSession: false,
        loading: false,
        student: null,
        workStudyJobs: [],
        workStudyApplications: [],
      })
      return
    }

    this.setData({ loading: true, hasStudentSession: true })
    try {
      const [studentResponse, jobsResponse, applicationResponse] = await Promise.all([
        request<{ student: StudentSnapshot }>({ url: '/api/students/current' }),
        request<{ list: WorkStudyJobItem[] }>({ url: '/api/work-study/jobs' }),
        request<{ list: WorkStudyApplicationItem[] }>({ url: '/api/work-study/applications' }),
      ])

      this.setData({
        loading: false,
        student: studentResponse.student,
        workStudyJobs: jobsResponse.list,
        workStudyApplications: applicationResponse.list.slice(0, 8),
      })
    } catch (error) {
      this.setData({ loading: false })
      showRequestError(error)
    }
  },

  openLogin() {
    wx.switchTab({ url: '/pages/mine/mine' })
  },

  onOpenApplyPanel(event: WechatMiniprogram.TouchEvent) {
    if (!requireCurrentStudentSession('请先登录后申请勤工岗位')) {
      return
    }
    const jobId = String(event.currentTarget.dataset.id || '')
    const selectedJob = (this.data.workStudyJobs as WorkStudyJobItem[]).find((item) => item.id === jobId) || null
    if (!selectedJob) {
      return
    }
    if (!selectedJob.eligible) {
      wx.showToast({
        title: (selectedJob.reason || '当前岗位暂不可申请').slice(0, 20),
        icon: 'none',
      })
      return
    }
    this.setData({
      showApplyPanel: true,
      selectedJob,
      selectedApplySlots: [],
      applyIntro: '',
      applySkillTags: '',
    })
  },

  onCloseApplyPanel() {
    this.setData({
      showApplyPanel: false,
      selectedJob: null,
      selectedApplySlots: [],
      applyIntro: '',
      applySkillTags: '',
    })
  },

  onApplySlotChange(event: WechatMiniprogram.CustomEvent) {
    this.setData({
      selectedApplySlots: (event.detail.value as string[]) || [],
    })
  },

  onApplyIntroInput(event: WechatMiniprogram.Input) {
    this.setData({
      applyIntro: String(event.detail.value || '').trim(),
    })
  },

  onApplySkillTagsInput(event: WechatMiniprogram.Input) {
    this.setData({
      applySkillTags: String(event.detail.value || '').trim(),
    })
  },

  async onSubmitApply() {
    if (!requireCurrentStudentSession('请先登录后申请勤工岗位')) {
      return
    }
    const selectedJob = this.data.selectedJob as WorkStudyJobItem | null
    if (!selectedJob) {
      return
    }
    const applyIntro = String(this.data.applyIntro || '').trim()
    if (!applyIntro) {
      wx.showToast({
        title: '请填写岗位申请说明',
        icon: 'none',
      })
      return
    }
    if ((selectedJob.shiftSlots || []).length > 0 && (this.data.selectedApplySlots as string[]).length === 0) {
      wx.showToast({
        title: '请至少选择一个可上岗时间',
        icon: 'none',
      })
      return
    }
    this.setData({ applying: true })
    try {
      await request<{ application: { id: string } }>({
        url: '/api/work-study/applications',
        method: 'POST',
        data: {
          jobId: selectedJob.id,
          intro: applyIntro,
          availableSlots: this.data.selectedApplySlots,
          skillTags: normalizeListText(String(this.data.applySkillTags || '')),
        },
      })
      wx.showToast({
        title: '岗位申请已提交',
        icon: 'success',
      })
      this.onCloseApplyPanel()
      this.refreshDynamicData()
    } catch (error) {
      showRequestError(error)
    } finally {
      this.setData({ applying: false })
    }
  },
})
