import { request, showRequestError } from '../../utils/api'
import { requireCurrentStudentSession } from '../../utils/storage'

export {}

interface RecognitionRecord {
  id: string
  reviewStatus: string
  finalLevel: string
  submittedAt: string
  reviewComment?: string
}

Page({
  data: {
    loading: false,
    list: [] as RecognitionRecord[],
  },

  onShow() {
    if (!requireCurrentStudentSession('请先登录后查看认定申请')) {
      this.setData({ list: [], loading: false })
      return
    }
    this.loadList()
  },

  async loadList() {
    this.setData({ loading: true })
    try {
      const response = await request<{ list: RecognitionRecord[] }>({ url: '/api/recognitions' })
      this.setData({
        loading: false,
        list: response.list,
      })
    } catch (error) {
      this.setData({ loading: false })
      showRequestError(error)
    }
  },

  onOpenDetail(event: WechatMiniprogram.TouchEvent) {
    const recordId = String(event.currentTarget.dataset.id || '')
    if (!recordId) {
      return
    }
    wx.navigateTo({ url: `/pages/recognition-detail/recognition-detail?id=${recordId}` })
  },
})
