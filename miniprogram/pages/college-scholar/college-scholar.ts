import {
  getBoundCollege,
  getFavorites,
  toggleFavorite,
  getCurrentStudentSession,
  requireCurrentStudentSession,
} from '../../utils/storage'
import { request, showRequestError } from '../../utils/api'

export {}

interface CollegeItem {
  key: string
  name: string
}

interface AmountTier {
  label: string
  amount: string
  note: string
}

interface StudentSnapshot {
  id: string
  currentRecognitionLevel: string
  confirmedRecognitionLabels: string[]
}

interface CollegeScholarItem {
  id: string
  name: string
  sponsor: string
  type: string
  amountText: string
  amountTiers: AmountTier[]
  quota: string
  conditions: string[]
  deadline: string
  guide: string
  intro: string
  restrictionNote: string
  openForApply: boolean
  allowedRecognitionRuleIds: string[]
  requiresPovertyRecognition: boolean
  category: string
  collegeKey: string
  collegeName: string
}

interface ScholarshipDetailResponse {
  scholarship: CollegeScholarItem
  eligibility: {
    eligible: boolean
    reason: string
    grantTier: AmountTier | null
  }
}

interface DeadlineReminderItem {
  id: string
  scholarshipId: string
  scholarshipName: string
  deadline: string
  hoursLeft: number
  reason: string
  status: string
  createdAt: string
}

interface DeadlineReminderViewItem extends DeadlineReminderItem {
  createdAtText: string
}

interface DeadlineReminderResponse {
  list: DeadlineReminderItem[]
  generatedAt: string
}

const SCHOLARSHIP_AI_INTRO_TITLE = 'AI 咨询学院奖助问题'
const SCHOLARSHIP_AI_INTRO_TEXT = '可以继续问申请顺序、资格门槛、材料准备和截止时间。'

function formatDateTimeText(rawValue: string): string {
  const date = new Date(rawValue)
  if (Number.isNaN(date.getTime())) {
    return String(rawValue || '').slice(0, 16)
  }
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

Page({
  data: {
    colleges: [] as CollegeItem[],
    collegeIndex: 0,
    currentCollegeKey: '',
    currentCollegeName: '',
    hasBoundCollege: false,
    typeTabs: ['全部', '学院专属', '奖学金', '助学金', '资助项目'],
    activeType: '全部',
    favoriteIds: [] as string[],
    allItems: [] as CollegeScholarItem[],
    displayItems: [] as CollegeScholarItem[],
    showDetail: false,
    detailItem: null as CollegeScholarItem | null,
    detailEligibilityText: '',
    student: null as StudentSnapshot | null,
    deadlineReminderList: [] as DeadlineReminderViewItem[],
    nearestDeadlineReminder: null as DeadlineReminderViewItem | null,
    loading: false,
  },

  onLoad() {
    this.initializePage()
  },

  onShow() {
    const currentCollegeKey = getBoundCollege()
    const currentCollegeName = (this.data.colleges as CollegeItem[]).find((item) => item.key === currentCollegeKey)?.name || ''
    this.setData({
      favoriteIds: getFavorites(),
      currentCollegeKey,
      currentCollegeName,
      hasBoundCollege: Boolean(currentCollegeKey),
    })
    if (this.data.colleges.length > 0) {
      this.syncCollegeIndex()
      this.refreshItems()
      this.refreshDeadlineReminders()
    }
  },

  async initializePage() {
    const boundCollegeKey = getBoundCollege()
    this.setData({
      favoriteIds: getFavorites(),
      currentCollegeKey: boundCollegeKey,
      hasBoundCollege: Boolean(boundCollegeKey),
    })
    try {
      const collegeResponse = await request<{ list: CollegeItem[] }>({ url: '/api/colleges' })
      const session = getCurrentStudentSession()
      let student: StudentSnapshot | null = null
      let currentCollegeKey = boundCollegeKey
      if (session) {
        const studentResponse = await request<{ student: StudentSnapshot }>({ url: '/api/students/current' })
        student = studentResponse.student
      }
      const colleges = [{ key: '', name: '未绑定学院' }].concat(collegeResponse.list)
      const currentCollegeName = colleges.find((item) => item.key === currentCollegeKey)?.name || ''
      this.setData({
        colleges,
        student,
        currentCollegeKey,
        currentCollegeName,
        hasBoundCollege: Boolean(currentCollegeKey),
      })
      this.syncCollegeIndex()
      await this.refreshItems()
      this.refreshDeadlineReminders()
    } catch (error) {
      showRequestError(error)
    }
  },

  syncCollegeIndex() {
    const collegeIndex = (this.data.colleges as CollegeItem[]).findIndex(
      (item) => item.key === this.data.currentCollegeKey,
    )
    this.setData({ collegeIndex: collegeIndex >= 0 ? collegeIndex : 0 })
  },

  openAiPanel() {
    const introTitle = encodeURIComponent(SCHOLARSHIP_AI_INTRO_TITLE)
    const introText = encodeURIComponent(SCHOLARSHIP_AI_INTRO_TEXT)
    wx.navigateTo({
      url: `/pages/ai-chat-room/ai-chat-room?scene=scholarship&title=AI%E5%A5%96%E5%8A%A9%E5%8A%A9%E6%89%8B&introTitle=${introTitle}&introText=${introText}`,
    })
  },

  onCollegeChange() {
    wx.showToast({
      title: '学院信息取自已绑定学院，请先到“我的”中绑定',
      icon: 'none',
    })
  },

  onTypeTabTap(event: WechatMiniprogram.TouchEvent) {
    const activeType = String(event.currentTarget.dataset.type || '全部')
    this.setData({ activeType })
    this.applyTypeFilter()
    this.refreshDeadlineReminders()
  },

  async refreshItems() {
    this.setData({ loading: true })
    try {
      const response = await request<{ list: CollegeScholarItem[] }>({
        url: '/api/scholarships',
      })
      this.setData({
        loading: false,
        allItems: response.list,
      })
      this.applyTypeFilter()
    } catch (error) {
      this.setData({ loading: false })
      showRequestError(error)
    }
  },

  async refreshDeadlineReminders() {
    const session = getCurrentStudentSession()
    if (!session) {
      this.setData({
        deadlineReminderList: [],
        nearestDeadlineReminder: null,
      })
      return
    }
    try {
      const response = await request<DeadlineReminderResponse>({ url: '/api/deadline-reminders?hourWindow=720' })
      const list = Array.isArray(response.list)
        ? response.list
            .filter((item) => String(item.status || '') === 'pending')
            .sort((a, b) => Number(a.hoursLeft || 0) - Number(b.hoursLeft || 0))
            .slice(0, 4)
            .map((item) => ({
              ...item,
              createdAtText: formatDateTimeText(item.createdAt),
            }))
        : []
      this.setData({
        deadlineReminderList: list,
        nearestDeadlineReminder: list[0] || null,
      })
    } catch (error) {
      this.setData({
        deadlineReminderList: [],
        nearestDeadlineReminder: null,
      })
      showRequestError(error)
    }
  },

  applyTypeFilter() {
    const allItems = this.data.allItems as CollegeScholarItem[]
    const activeType = this.data.activeType as string
    const currentCollegeKey = this.data.currentCollegeKey as string

    if (!currentCollegeKey) {
      this.setData({ displayItems: [] })
      return
    }

    const collegeFilteredItems = allItems.filter((item) => !item.collegeKey || item.collegeKey === currentCollegeKey)

    let displayItems = collegeFilteredItems
    if (activeType === '学院专属') {
      displayItems = collegeFilteredItems.filter((item) => item.collegeKey === currentCollegeKey)
    } else if (activeType !== '全部') {
      displayItems = collegeFilteredItems.filter((item) => item.type === activeType)
    }

    this.setData({ displayItems })
  },

  onToggleFavorite(event: WechatMiniprogram.TouchEvent) {
    const itemId = String(event.currentTarget.dataset.id || '')
    if (!itemId) {
      return
    }
    const favoriteIds = toggleFavorite(itemId)
    this.setData({ favoriteIds })
    wx.showToast({
      title: favoriteIds.includes(itemId) ? '已收藏' : '已取消收藏',
      icon: 'none',
    })
  },

  async onOpenDetail(event: WechatMiniprogram.TouchEvent) {
    if (!requireCurrentStudentSession('请先登录后查看个人资格与申请入口')) {
      return
    }
    const itemId = String(event.currentTarget.dataset.id || '')
    const target = (this.data.displayItems as CollegeScholarItem[]).find((item) => item.id === itemId)
    if (!target) {
      return
    }
    try {
      const response = await request<ScholarshipDetailResponse>({
        url: `/api/scholarships/${itemId}`,
      })
      this.setData({
        showDetail: true,
        detailItem: response.scholarship,
        detailEligibilityText: response.eligibility.reason,
      })
    } catch (error) {
      showRequestError(error)
    }
  },

  onCloseDetail() {
    this.setData({
      showDetail: false,
      detailItem: null,
      detailEligibilityText: '',
    })
  },

  onGoPolicyDetail() {
    if (!requireCurrentStudentSession('请先登录后查看完整详情与申请')) {
      return
    }
    const detailItem = this.data.detailItem as CollegeScholarItem | null
    if (!detailItem) {
      return
    }
    wx.navigateTo({ url: `/pages/policy-detail/policy-detail?id=${detailItem.id}` })
  },
})
