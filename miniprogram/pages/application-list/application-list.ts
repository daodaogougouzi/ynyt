import { request, showRequestError } from '../../utils/api'
import { requireCurrentStudentSession } from '../../utils/storage'

export {}

interface ScholarshipApplication {
  id: string
  scholarshipName: string
  status: string
  submittedAt: string
  reviewComment: string
}

Page({
  data: {
    loading: false,
    list: [] as ScholarshipApplication[],
  },

  onShow() {
    if (!requireCurrentStudentSession('请先登录后查看奖助申请')) {
      this.setData({ list: [], loading: false })
      return
    }
    this.loadList()
  },

  async loadList() {
    this.setData({ loading: true })
    try {
      const response = await request<{ list: ScholarshipApplication[] }>({ url: '/api/scholarship-applications' })
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
    wx.navigateTo({ url: `/pages/application-detail/application-detail?id=${recordId}` })
  },
})
