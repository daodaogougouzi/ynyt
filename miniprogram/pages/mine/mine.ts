import {
  getBoundCollege,
  setBoundCollege,
  clearUserData,
  getCurrentStudentSession,
  setCurrentStudentSession,
  getMentalAssessmentHistory,
  type MentalAssessmentHistoryItem,
} from '../../utils/storage'
import { request, showRequestError } from '../../utils/api'

export {}

interface CollegeItem {
  key: string
  name: string
}

interface StudentSnapshot {
  id: string
  studentNo: string
  name: string
  college: string
  collegeKey: string
  currentRecognitionStatus: string
  currentRecognitionLevel: string
  confirmedRecognitionLabels: string[]
}

interface StudentScholarshipHistoryItem {
  id: string
  scholarshipId: string
  scholarshipName: string
  status: string
  submittedAt: string
  reviewedAt: string
}

interface StudentPortrait {
  studentId: string
  studentNo: string
  name: string
  grade: string
  college: string
  major: string
  className: string
  currentRecognitionStatus: string
  currentRecognitionLevel: string
  currentRecognitionScore: number
  confirmedRecognitionLabels: string[]
  latestRecognitionSubmittedAt: string
  latestRecognitionStatus: string
  scholarshipHistory: StudentScholarshipHistoryItem[]
}

interface PortraitSummaryView {
  scholarshipCount: number
  latestRecognitionTimeText: string
}

interface GrowthStage {
  key: string
  label: string
  desc: string
}

interface GrowthEvent {
  id: string
  actionType: string
  title: string
  description: string
  points: number
  flowerDelta: number
  fruitDelta: number
  sourceType: string
  sourceId: string
  createdAt: string
}

interface GrowthTreeRecord {
  studentId: string
  points: number
  flowers: number
  fruits: number
  stage: GrowthStage
  nextStageHint: string
  events: GrowthEvent[]
  updatedAt: string
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

interface DeadlineReminderViewItem {
  id: string
  scholarshipId: string
  scholarshipName: string
  deadline: string
  hoursLeft: number
  reason: string
  createdAtText: string
}

interface LoginSession {
  studentId: string
  studentNo: string
  name: string
}

interface MentalHistoryViewItem {
  id: string
  scaleName: string
  standardScore: number
  levelLabel: string
  levelTone: 'tone-ok' | 'tone-warn' | 'tone-danger'
  highlightText: string
  createdAtText: string
}

type GrowthFruitTone = 'campus' | 'scholarship'
type GrowthNodeKind = 'fruit' | 'flower'
type GrowthTreeStageSkin = 'seed' | 'sprout' | 'bloom' | 'prosperous'

const growthTreeImageMap: Record<GrowthTreeStageSkin, string> = {
  seed: '/assets/growth-tree/tree-seed.svg',
  sprout: '/assets/growth-tree/tree-sprout.svg',
  bloom: '/assets/growth-tree/tree-bloom.svg',
  prosperous: '/assets/growth-tree/tree-prosperous.svg',
}

interface GrowthAchievementViewItem {
  id: string
  title: string
  description: string
  pointsText: string
  createdAtText: string
  sourceType: string
  sourceId: string
  tone: GrowthFruitTone
  toneText: string
  nodeKind: GrowthNodeKind
  nodeKindText: string
  nodeCode: string
  nodeVariant: number
}

interface GrowthTreeNodeView {
  id: string
  leftPercent: number
  topPercent: number
  nodeKind: GrowthNodeKind
  nodeCode: string
  nodeVariant: number
}

function resolveGrowthTreeStageSkin(stageKey: string): GrowthTreeStageSkin {
  if (stageKey === 'prosperous') {
    return 'prosperous'
  }
  if (stageKey === 'bloom') {
    return 'bloom'
  }
  if (stageKey === 'sprout') {
    return 'sprout'
  }
  return 'seed'
}

function formatDateText(rawValue: string): string {
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

function formatMentalHistoryTime(rawValue: string): string {
  return formatDateText(rawValue)
}

function formatRelativeDays(rawValue: string): string {
  const date = new Date(rawValue)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }
  const diff = Date.now() - date.getTime()
  if (diff < 0) {
    return '刚刚'
  }
  const day = Math.floor(diff / (24 * 3600 * 1000))
  if (day <= 0) {
    return '今天'
  }
  if (day <= 30) {
    return `${day}天前`
  }
  return formatDateText(rawValue).slice(0, 10)
}

function toMentalHistoryViewItem(item: MentalAssessmentHistoryItem): MentalHistoryViewItem {
  return {
    id: item.id,
    scaleName: item.scaleName,
    standardScore: item.standardScore,
    levelLabel: item.levelLabel,
    levelTone: item.levelTone,
    highlightText: item.highlightText,
    createdAtText: formatMentalHistoryTime(item.createdAt),
  }
}

function resolveGrowthAchievementTone(item: GrowthEvent): GrowthFruitTone {
  if (item.actionType === 'scholarshipApproved' || item.sourceType === 'scholarship-application') {
    return 'scholarship'
  }
  return 'campus'
}

function isGrowthAchievementEvent(item: GrowthEvent): boolean {
  const actionType = String(item.actionType || '')
  return actionType === 'campusMomentRecorded' || actionType === 'campusMomentPublished' || actionType === 'scholarshipApproved'
}

function buildPointsSummary(item: GrowthEvent): string {
  const points = Number(item.points || 0)
  const flowerDelta = Number(item.flowerDelta || 0)
  const fruitDelta = Number(item.fruitDelta || 0)
  const parts = [`+${points}积分`]
  if (flowerDelta > 0) {
    parts.push(`+${flowerDelta}花朵`)
  }
  if (fruitDelta > 0) {
    parts.push(`+${fruitDelta}果实`)
  }
  return parts.join(' · ')
}

function getGrowthFruitPosition(index: number): { leftPercent: number; topPercent: number } {
  const anchors = [
    { leftPercent: 50, topPercent: 14 },
    { leftPercent: 38, topPercent: 16 },
    { leftPercent: 62, topPercent: 16 },
    { leftPercent: 28, topPercent: 20 },
    { leftPercent: 72, topPercent: 20 },
    { leftPercent: 20, topPercent: 26 },
    { leftPercent: 80, topPercent: 26 },
    { leftPercent: 34, topPercent: 24 },
    { leftPercent: 66, topPercent: 24 },
    { leftPercent: 44, topPercent: 20 },
    { leftPercent: 56, topPercent: 20 },
    { leftPercent: 50, topPercent: 26 },
    { leftPercent: 24, topPercent: 32 },
    { leftPercent: 76, topPercent: 32 },
    { leftPercent: 40, topPercent: 30 },
    { leftPercent: 60, topPercent: 30 },
    { leftPercent: 14, topPercent: 38 },
    { leftPercent: 86, topPercent: 38 },
    { leftPercent: 30, topPercent: 38 },
    { leftPercent: 70, topPercent: 38 },
    { leftPercent: 50, topPercent: 36 },
    { leftPercent: 36, topPercent: 42 },
    { leftPercent: 64, topPercent: 42 },
    { leftPercent: 50, topPercent: 44 },
  ]
  return anchors[index % anchors.length]
}

function resolveGrowthNodeKind(item: GrowthEvent): GrowthNodeKind {
  const flowerDelta = Number(item.flowerDelta || 0)
  const fruitDelta = Number(item.fruitDelta || 0)
  if (flowerDelta > fruitDelta) {
    return 'flower'
  }
  if (fruitDelta > 0) {
    return 'fruit'
  }
  return item.actionType === 'campusMomentRecorded' ? 'flower' : 'fruit'
}

function resolveGrowthNodeVariant(item: GrowthEvent, index: number): number {
  const seedSource = `${item.id}|${item.actionType}|${item.sourceId}|${index}`
  let hash = 0
  for (let i = 0; i < seedSource.length; i += 1) {
    hash = (hash * 33 + seedSource.charCodeAt(i)) % 997
  }
  return (hash % 4) + 1
}

function formatGrowthNodeCode(kind: GrowthNodeKind, index: number): string {
  const prefix = kind === 'flower' ? '花' : '果'
  return `${prefix}${`${index + 1}`.padStart(2, '0')}`
}

function toGrowthAchievementViewItem(item: GrowthEvent, index: number): GrowthAchievementViewItem {
  const tone = resolveGrowthAchievementTone(item)
  const nodeKind = resolveGrowthNodeKind(item)
  return {
    id: item.id,
    title: item.title,
    description: String(item.description || '').trim() || '持续记录校园成长，稳步向前。',
    pointsText: buildPointsSummary(item),
    createdAtText: formatDateText(item.createdAt),
    sourceType: String(item.sourceType || ''),
    sourceId: String(item.sourceId || ''),
    tone,
    toneText: tone === 'scholarship' ? '奖助成就' : '校园成长',
    nodeKind,
    nodeKindText: nodeKind === 'flower' ? '花朵记录' : '果实记录',
    nodeCode: formatGrowthNodeCode(nodeKind, index),
    nodeVariant: resolveGrowthNodeVariant(item, index),
  }
}

function toGrowthTreeNodeList(list: GrowthAchievementViewItem[]): GrowthTreeNodeView[] {
  return list.slice(0, 24).map((item, index) => {
    const position = getGrowthFruitPosition(index)
    return {
      id: item.id,
      leftPercent: position.leftPercent,
      topPercent: position.topPercent,
      nodeKind: item.nodeKind,
      nodeCode: item.nodeCode,
      nodeVariant: item.nodeVariant,
    }
  })
}

function toDeadlineReminderViewItem(item: DeadlineReminderItem): DeadlineReminderViewItem {
  return {
    id: item.id,
    scholarshipId: item.scholarshipId,
    scholarshipName: item.scholarshipName,
    deadline: item.deadline,
    hoursLeft: Number(item.hoursLeft || 0),
    reason: item.reason,
    createdAtText: formatDateText(item.createdAt),
  }
}

Page({
  data: {
    colleges: [] as CollegeItem[],
    collegeIndex: 0,
    boundCollegeName: '暂未绑定',
    student: null as StudentSnapshot | null,
    portrait: null as StudentPortrait | null,
    portraitSummary: {
      scholarshipCount: 0,
      latestRecognitionTimeText: '-',
    } as PortraitSummaryView,
    growthTree: null as GrowthTreeRecord | null,
    growthAchievementList: [] as GrowthAchievementViewItem[],
    growthNodeList: [] as GrowthTreeNodeView[],
    growthTreeImage: growthTreeImageMap.seed,
    selectedGrowthAchievement: null as GrowthAchievementViewItem | null,
    growthTreeStageSkin: 'seed' as GrowthTreeStageSkin,
    showGrowthTreeDetail: false,
    deadlineReminderList: [] as DeadlineReminderViewItem[],
    nearestDeadlineReminder: null as DeadlineReminderViewItem | null,
    loading: false,
    loginSubmitting: false,
    hasSession: false,
    mentalHistoryList: [] as MentalHistoryViewItem[],
    loginForm: {
      studentNo: '',
      name: '',
    },
    menuItems: [
      { label: '我的认定申请', url: '/pages/recognition-list/recognition-list' },
      { label: '我的奖助申请', url: '/pages/application-list/application-list' },
      { label: '勤工岗位申请进度', url: '/pages/work-study/work-study' },
      { label: 'AI助手（材料草稿）', url: '/pages/ai-assistant/ai-assistant' },
      { label: '校园点滴审核进度', url: '/pages/campus-moment-list/campus-moment-list' },
      { label: '临时困难补助指引', url: '/pages/temporary-aid/temporary-aid' },
      { label: '我的评估记录', url: '/pages/evaluate-history/evaluate-history' },
      { label: '我的收藏', url: '/pages/favorites/favorites' },
      { label: '帮助中心', url: '/pages/help-center/help-center' },
      { label: '关于易暖医途', url: '/pages/about/about-page' },
    ],
  },

  onShow() {
    const session = getCurrentStudentSession()
    this.setData({
      hasSession: Boolean(session),
      'loginForm.studentNo': session?.studentNo || '',
      'loginForm.name': session?.name || '',
    })
    if (session) {
      this.refreshMineData()
      this.loadMentalHistory(session.studentId)
      return
    }
    this.setData({
      student: null,
      portrait: null,
      portraitSummary: {
        scholarshipCount: 0,
        latestRecognitionTimeText: '-',
      },
      growthTree: null,
      growthAchievementList: [],
      growthNodeList: [],
      growthTreeImage: growthTreeImageMap.seed,
      selectedGrowthAchievement: null,
      growthTreeStageSkin: 'seed',
      showGrowthTreeDetail: false,
      deadlineReminderList: [],
      nearestDeadlineReminder: null,
      boundCollegeName: '暂未绑定',
      mentalHistoryList: [],
    })
  },

  async refreshMineData() {
    this.setData({ loading: true })
    try {
      const boundCollege = getBoundCollege()
      const [collegeResponse, studentResponse, portraitResponse, growthTreeResponse, deadlineReminderResponse] = await Promise.all([
        request<{ list: CollegeItem[] }>({ url: '/api/colleges' }),
        request<{ student: StudentSnapshot }>({ url: '/api/students/current' }),
        request<{ portrait: StudentPortrait }>({ url: '/api/students/current/portrait' }),
        request<{ tree: GrowthTreeRecord }>({ url: '/api/growth-tree' }),
        request<{ list: DeadlineReminderItem[] }>({ url: '/api/deadline-reminders?hourWindow=720' }),
      ])
      const colleges = collegeResponse.list
      const student = studentResponse.student
      const portrait = portraitResponse.portrait
      const growthTree = growthTreeResponse.tree
      const growthAchievementList = (growthTree?.events || [])
        .filter((item) => isGrowthAchievementEvent(item))
        .slice(0, 24)
        .map((item, index) => toGrowthAchievementViewItem(item, index))
      const growthNodeList = toGrowthTreeNodeList(growthAchievementList)
      const selectedGrowthAchievement = growthAchievementList[0] || null
      const growthTreeStageSkin = resolveGrowthTreeStageSkin(String(growthTree?.stage?.key || ''))
      const growthTreeImage = growthTreeImageMap[growthTreeStageSkin]
      const deadlineReminderList = Array.isArray(deadlineReminderResponse.list)
        ? deadlineReminderResponse.list
            .filter((item) => String(item.status || '') === 'pending')
            .sort((a, b) => Number(a.hoursLeft || 0) - Number(b.hoursLeft || 0))
            .slice(0, 3)
            .map(toDeadlineReminderViewItem)
        : []
      const defaultCollegeKey = boundCollege || student.collegeKey || ''
      const collegeIndex = colleges.findIndex((item) => item.key === defaultCollegeKey)
      const safeIndex = collegeIndex >= 0 ? collegeIndex : 0
      if (!boundCollege && student.collegeKey) {
        setBoundCollege(student.collegeKey)
      }

      this.setData({
        loading: false,
        colleges,
        collegeIndex: safeIndex,
        boundCollegeName: defaultCollegeKey ? colleges[safeIndex]?.name || student.college : '暂未绑定',
        student,
        portrait,
        portraitSummary: {
          scholarshipCount: Array.isArray(portrait?.scholarshipHistory) ? portrait.scholarshipHistory.length : 0,
          latestRecognitionTimeText: portrait?.latestRecognitionSubmittedAt
            ? formatRelativeDays(portrait.latestRecognitionSubmittedAt)
            : '-',
        },
        growthTree,
        growthAchievementList,
        growthNodeList,
        growthTreeImage,
        selectedGrowthAchievement,
        growthTreeStageSkin,
        showGrowthTreeDetail: false,
        deadlineReminderList,
        nearestDeadlineReminder: deadlineReminderList[0] || null,
      })
      this.loadMentalHistory(student.id)
    } catch (error) {
      this.setData({ loading: false })
      showRequestError(error)
    }
  },

  loadMentalHistory(studentId: string) {
    const list = getMentalAssessmentHistory(studentId).map(toMentalHistoryViewItem)
    this.setData({
      mentalHistoryList: list,
    })
  },

  onLoginInput(event: WechatMiniprogram.Input) {
    const field = String(event.currentTarget.dataset.field || '')
    if (!field) {
      return
    }
    this.setData({
      [`loginForm.${field}`]: String(event.detail.value || '').trim(),
    })
  },

  async onLogin() {
    const studentNo = String(this.data.loginForm.studentNo || '').trim()
    const name = String(this.data.loginForm.name || '').trim()
    if (!studentNo || !name) {
      wx.showToast({
        title: '请输入姓名和学号',
        icon: 'none',
      })
      return
    }
    this.setData({ loginSubmitting: true })
    try {
      const response = await request<{ session: LoginSession; student: StudentSnapshot }>({
        url: '/api/students/login',
        method: 'POST',
        data: { studentNo, name },
      })
      setCurrentStudentSession(response.session)
      this.setData({
        hasSession: true,
        student: response.student,
      })
      if (response.student.collegeKey) {
        setBoundCollege(response.student.collegeKey)
      }
      this.loadMentalHistory(response.student.id)
      wx.showToast({
        title: '登录成功',
        icon: 'success',
      })
      this.refreshMineData()
    } catch (error) {
      showRequestError(error, '登录失败')
    } finally {
      this.setData({ loginSubmitting: false })
    }
  },

  async onCollegeChange(event: WechatMiniprogram.PickerChange) {
    const collegeIndex = Number(event.detail.value)
    const target = this.data.colleges[collegeIndex]
    const student = this.data.student as StudentSnapshot | null
    if (!target || !student) {
      return
    }
    try {
      const response = await request<{ student: StudentSnapshot }>({
        url: '/api/students/current',
        method: 'PUT',
        data: {
          collegeKey: target.key,
        },
      })
      setBoundCollege(target.key)
      this.setData({
        collegeIndex,
        boundCollegeName: target.name,
        student: response.student,
      })
      wx.showToast({
        title: '学院绑定已更新',
        icon: 'none',
      })
    } catch (error) {
      showRequestError(error, '学院更新失败')
    }
  },

  onOpenMenu(event: WechatMiniprogram.TouchEvent) {
    const url = String(event.currentTarget.dataset.url || '')
    if (!url) {
      return
    }
    wx.navigateTo({ url })
  },

  onOpenGrowthTreeDetail() {
    if (!this.data.growthTree) {
      return
    }
    this.setData({
      showGrowthTreeDetail: true,
      selectedGrowthAchievement: this.data.selectedGrowthAchievement || this.data.growthAchievementList[0] || null,
    })
  },

  closeGrowthTreeDetail() {
    this.setData({
      showGrowthTreeDetail: false,
    })
  },

  onTapGrowthFruit(event: WechatMiniprogram.TouchEvent) {
    const achievementId = String(event.currentTarget.dataset.id || '')
    if (!achievementId) {
      return
    }
    const target = (this.data.growthAchievementList as GrowthAchievementViewItem[]).find((item) => item.id === achievementId) || null
    if (!target) {
      return
    }
    this.setData({
      selectedGrowthAchievement: target,
    })
  },

  onOpenGrowthAchievementSource() {
    const target = this.data.selectedGrowthAchievement
    if (!target) {
      return
    }

    if (target.sourceType === 'scholarship-application' && target.sourceId) {
      wx.navigateTo({ url: `/pages/application-detail/application-detail?id=${target.sourceId}` })
      return
    }

    if (target.sourceType === 'campus-moment') {
      wx.navigateTo({ url: '/pages/campus-moment-list/campus-moment-list' })
      return
    }

    wx.showToast({
      title: '暂不支持直接跳转',
      icon: 'none',
    })
  },

  onClearData() {
    wx.showModal({
      title: '提示',
      content: '将退出当前账号并清空本地缓存，是否继续？',
      success: (result) => {
        if (!result.confirm) {
          return
        }
        clearUserData()
        this.setData({
          hasSession: false,
          student: null,
          portrait: null,
          portraitSummary: {
            scholarshipCount: 0,
            latestRecognitionTimeText: '-',
          },
          growthTree: null,
          growthAchievementList: [],
          growthNodeList: [],
          growthTreeImage: growthTreeImageMap.seed,
          selectedGrowthAchievement: null,
          growthTreeStageSkin: 'seed',
          showGrowthTreeDetail: false,
          deadlineReminderList: [],
          nearestDeadlineReminder: null,
          colleges: [],
          collegeIndex: 0,
          boundCollegeName: '暂未绑定',
          mentalHistoryList: [],
          'loginForm.studentNo': '',
          'loginForm.name': '',
        })
        wx.showToast({
          title: '已退出登录',
          icon: 'none',
        })
      },
    })
  },
})
