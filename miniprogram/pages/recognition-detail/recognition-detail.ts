import { request, showRequestError } from '../../utils/api'
import { requireCurrentStudentSession } from '../../utils/storage'

export {}

interface LoadQuery {
  id?: string
}

interface RecognitionAttachment {
  id: string
  name: string
  sizeLabel: string
}

interface RecognitionRecord {
  id: string
  profile: {
    studentNo: string
    name: string
    college: string
    major: string
    className: string
    grade: string
    phone: string
  }
  selectedRuleLabels: string[]
  confirmedRuleLabels: string[]
  supplementalNote: string
  materials: string[]
  attachments: RecognitionAttachment[]
  reviewStatus: string
  systemLevel: string
  finalLevel: string
  reviewComment: string
  submittedAt: string
  reviewedAt: string
}

Page({
  data: {
    loading: true,
    record: null as RecognitionRecord | null,
  },

  onLoad(query: LoadQuery) {
    if (!requireCurrentStudentSession('请先登录后查看认定详情')) {
      return
    }
    const recordId = typeof query.id === 'string' ? query.id : ''
    if (!recordId) {
      wx.showToast({ title: '未找到申请记录', icon: 'none' })
      return
    }
    this.loadDetail(recordId)
  },

  async loadDetail(recordId: string) {
    this.setData({ loading: true })
    try {
      const response = await request<{ record: RecognitionRecord }>({ url: `/api/recognitions/${recordId}` })
      this.setData({
        loading: false,
        record: response.record,
      })
    } catch (error) {
      this.setData({ loading: false })
      showRequestError(error)
    }
  },
})
