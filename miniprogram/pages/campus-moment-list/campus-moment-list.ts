import { getApiBaseUrl, request, showRequestError } from '../../utils/api'
import { requireCurrentStudentSession } from '../../utils/storage'

export {}

interface CampusMomentRecord {
  id: string
  title: string
  caption?: string
  image?: string
  imageList?: string[]
  status: string
  reviewComment?: string
  submittedAt: string
  reviewedAt?: string
  publishedAt?: string
  publisher?: string
}

interface CampusMomentListResponse {
  list?: CampusMomentRecord[]
}

function formatDateTime(rawValue: string): string {
  const text = String(rawValue || '').trim()
  if (!text) {
    return ''
  }
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) {
    return text.slice(0, 16)
  }
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

function normalizeImageUrl(rawValue: string): string {
  const image = String(rawValue || '').trim()
  if (!image) {
    return ''
  }
  if (/^https?:\/\//i.test(image) || /^data:/i.test(image)) {
    return image
  }
  if (image.startsWith('/')) {
    return `${getApiBaseUrl()}${image}`
  }
  return image
}

function normalizeImageList(rawValue: unknown, fallbackImage: string): string[] {
  const sourceList = Array.isArray(rawValue) ? rawValue : []
  const list = sourceList
    .map((item) => normalizeImageUrl(String(item || '')))
    .filter((item) => Boolean(item))
  if (list.length > 0) {
    return list
  }
  if (fallbackImage) {
    return [fallbackImage]
  }
  return []
}

Page({
  data: {
    loading: false,
    list: [] as CampusMomentRecord[],
    showDetailModal: false,
    activeDetail: null as CampusMomentRecord | null,
  },

  onShow() {
    if (!requireCurrentStudentSession('请先登录后查看校园点滴审核进度')) {
      this.setData({
        list: [],
        loading: false,
        showDetailModal: false,
        activeDetail: null,
      })
      return
    }
    this.loadList()
  },

  async loadList() {
    this.setData({ loading: true })
    try {
      const response = await request<CampusMomentListResponse>({ url: '/api/campus-moments?scope=mine' })
      const sourceList = Array.isArray(response.list) ? response.list : []
      this.setData({
        loading: false,
        list: sourceList.map((item) => {
          const image = normalizeImageUrl(item.image || '')
          const imageList = normalizeImageList(item.imageList, image)
          return {
            ...item,
            image,
            imageList,
            submittedAt: formatDateTime(item.submittedAt),
            reviewedAt: formatDateTime(item.reviewedAt || ''),
            publishedAt: formatDateTime(item.publishedAt || ''),
          }
        }),
      })
    } catch (error) {
      this.setData({ loading: false, list: [] })
      showRequestError(error, '校园点滴进度加载失败')
    }
  },

  onOpenDetail(event: WechatMiniprogram.TouchEvent) {
    const recordId = String(event.currentTarget.dataset.id || '')
    if (!recordId) {
      return
    }
    const target = (this.data.list as CampusMomentRecord[]).find((item) => item.id === recordId) || null
    if (!target) {
      return
    }
    this.setData({
      showDetailModal: true,
      activeDetail: target,
    })
  },

  closeDetailModal() {
    this.setData({
      showDetailModal: false,
      activeDetail: null,
    })
  },

  onPreviewImage(event: WechatMiniprogram.TouchEvent) {
    const currentImage = String(event.currentTarget.dataset.image || '')
    const imageListRaw = event.currentTarget.dataset.images
    const imageList = Array.isArray(imageListRaw)
      ? imageListRaw.map((item) => String(item || ''))
      : (typeof imageListRaw === 'string' ? imageListRaw.split(',').map((item) => String(item || '')) : [])
    const urls = imageList
      .map((item) => String(item || '').trim())
      .filter((item) => /^https?:\/\//i.test(item) || /^data:/i.test(item))
    if (!currentImage || urls.length === 0) {
      return
    }
    wx.previewImage({
      current: currentImage,
      urls,
    })
  },
})
