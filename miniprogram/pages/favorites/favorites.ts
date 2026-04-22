import { getFavorites } from '../../utils/storage'
import { request, showRequestError } from '../../utils/api'

export {}

interface ScholarshipLite {
  id: string
  name: string
  amountText: string
  type: string
}

Page({
  data: {
    loading: false,
    list: [] as ScholarshipLite[],
  },

  onShow() {
    this.loadList()
  },

  async loadList() {
    this.setData({ loading: true })
    try {
      const favoriteIds = getFavorites()
      const response = await request<{ list: ScholarshipLite[] }>({ url: '/api/scholarships' })
      this.setData({
        loading: false,
        list: response.list.filter((item) => favoriteIds.includes(item.id)),
      })
    } catch (error) {
      this.setData({ loading: false })
      showRequestError(error)
    }
  },

  onOpenDetail(event: WechatMiniprogram.TouchEvent) {
    const policyId = String(event.currentTarget.dataset.id || '')
    if (!policyId) {
      return
    }
    wx.navigateTo({ url: `/pages/policy-detail/policy-detail?id=${policyId}` })
  },
})
