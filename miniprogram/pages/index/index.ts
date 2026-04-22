import { request, showRequestError } from '../../utils/api'
import { requireCurrentStudentSession } from '../../utils/storage'

export {}

interface BannerItem {
  id: string
  title: string
  subtitle: string
  themeStart: string
  themeEnd: string
}

interface CategoryTab {
  key: string
  label: string
}

interface ScholarshipListItem {
  id: string
  name: string
  category: string
  amountText: string
  intro: string
  deadline: string
}

interface AnnouncementItem {
  id: string
  title: string
  date: string
  coverImage?: string
  publisher?: string
}

interface QuickActionItem {
  key: string
  label: string
  icon: string
  action: string
}

interface RecommendationItem {
  id: string
  name: string
  category: string
  type: string
  amountText: string
  deadline: string
  score: number
  matchLevel: string
  reasons: string[]
}

interface HomeDataResponse {
  banners: BannerItem[]
  categoryTabs: CategoryTab[]
  announcements: AnnouncementItem[]
  scholarships?: ScholarshipListItem[]
  policies?: ScholarshipListItem[]
}

const ONBOARDING_AI_INTRO_TITLE = 'AI 使用向导'
const ONBOARDING_AI_INTRO_TEXT = '可以直接问我：先做哪一步、每个功能在哪、怎么完成提交流程。'


const quickActions: QuickActionItem[] = [
  { key: 'evaluate', label: '困难认定申请', icon: '认', action: 'toEvaluate' },
  { key: 'apply', label: '奖助学金申请', icon: '奖', action: 'toScholarshipApply' },
  { key: 'temporary', label: '临时补助指引', icon: '补', action: 'toTemporaryAid' },
  { key: 'college', label: '学院奖助学金', icon: '院', action: 'toCollegeScholar' },
  { key: 'care', label: '心理关怀', icon: '心', action: 'toMentalCare' },
  { key: 'campus', label: '校园点滴', icon: '滴', action: 'toCampusMoments' },
  { key: 'workStudy', label: '勤工岗位', icon: '岗', action: 'toWorkStudy' },
  { key: 'aiAssistant', label: 'AI助手', icon: '智', action: 'toAiAssistant' },
]

Page({
  data: {
    banners: [] as BannerItem[],
    categoryTabs: [] as CategoryTab[],
    scholarships: [] as ScholarshipListItem[],
    filteredScholarships: [] as ScholarshipListItem[],
    announcements: [] as AnnouncementItem[],
    recommendations: [] as RecommendationItem[],
    selectedCategory: 'national',
    showScholarshipModal: false,
    quickActions,
    onboardingAiIntroTitle: ONBOARDING_AI_INTRO_TITLE,
    onboardingAiIntroText: ONBOARDING_AI_INTRO_TEXT,
    loading: false,
  },

  onLoad() {
    this.loadHomeData()
  },

  async loadHomeData() {
    this.setData({ loading: true })
    try {
      const response = await request<HomeDataResponse>({ url: '/api/home-data' })
      const recommendationResponse = await request<{ list: RecommendationItem[] }>({ url: '/api/recommendations?limit=6' })
      const scholarshipList = Array.isArray(response.scholarships)
        ? response.scholarships
        : Array.isArray(response.policies)
          ? response.policies
          : []
      const selectedCategory = response.categoryTabs[0]?.key || 'national'
      const filteredScholarships = scholarshipList.filter((item) => item.category === selectedCategory)
      this.setData({
        loading: false,
        banners: response.banners,
        categoryTabs: response.categoryTabs,
        announcements: response.announcements,
        scholarships: scholarshipList,
        filteredScholarships,
        selectedCategory,
        recommendations: recommendationResponse.list || [],
      })
    } catch (error) {
      this.setData({ loading: false })
      showRequestError(error)
    }
  },

  openAiPanel() {
    const introTitle = encodeURIComponent(ONBOARDING_AI_INTRO_TITLE)
    const introText = encodeURIComponent(ONBOARDING_AI_INTRO_TEXT)
    wx.navigateTo({
      url: `/pages/ai-chat-room/ai-chat-room?scene=onboarding&title=AI%E4%BD%BF%E7%94%A8%E5%90%91%E5%AF%BC&introTitle=${introTitle}&introText=${introText}`,
    })
  },

  onTapQuickAction(event: WechatMiniprogram.TouchEvent) {
    const action = String(event.currentTarget.dataset.action || '')
    const requiresLogin = ['toEvaluate', 'toScholarshipApply', 'toWorkStudy', 'toAiAssistant'].includes(action)
    if (requiresLogin && !requireCurrentStudentSession('请先登录后再使用该功能')) {
      return
    }
    if (action === 'toEvaluate') {
      wx.switchTab({ url: '/pages/ai-evaluate/ai-evaluate' })
      return
    }
    if (action === 'toScholarshipApply') {
      wx.switchTab({ url: '/pages/college-scholar/college-scholar' })
      return
    }
    if (action === 'toWorkStudy') {
      wx.navigateTo({ url: '/pages/work-study/work-study' })
      return
    }
    if (action === 'toAiAssistant') {
      wx.navigateTo({ url: '/pages/ai-assistant/ai-assistant' })
      return
    }
    if (action === 'toTemporaryAid') {
      wx.navigateTo({ url: '/pages/temporary-aid/temporary-aid' })
      return
    }
    if (action === 'toMentalCare') {
      wx.switchTab({ url: '/pages/mental-care/mental-care' })
      return
    }
    if (action === 'toCollegeScholar') {
      wx.switchTab({ url: '/pages/college-scholar/college-scholar' })
      return
    }
    if (action === 'toCampusMoments') {
      wx.switchTab({ url: '/pages/mental-care/mental-care' })
      return
    }
    if (action === 'showScholarship') {
      this.openScholarshipModal()
    }
  },

  onSelectCategory(_event: WechatMiniprogram.TouchEvent) {
    // 首页已隐藏奖助学金列表，保留空实现避免模板残留事件报错。
  },

  onOpenScholarshipDetail(event: WechatMiniprogram.TouchEvent) {
    const scholarshipId = String(event.currentTarget.dataset.id || '')
    if (!scholarshipId) {
      return
    }
    if (this.data.showScholarshipModal) {
      this.closeScholarshipModal()
    }
    wx.navigateTo({ url: `/pages/policy-detail/policy-detail?id=${scholarshipId}` })
  },

  onOpenAnnouncementDetail(event: WechatMiniprogram.TouchEvent) {
    const announcementId = String(event.currentTarget.dataset.id || '')
    if (!announcementId) {
      return
    }
    wx.navigateTo({ url: `/pages/announcement-detail/announcement-detail?id=${announcementId}` })
  },

  openScholarshipModal() {
    this.setData({ showScholarshipModal: true })
  },

  closeScholarshipModal() {
    this.setData({ showScholarshipModal: false })
  },
})
