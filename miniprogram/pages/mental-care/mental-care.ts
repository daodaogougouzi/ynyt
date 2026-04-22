import { getApiBaseUrl, request, showRequestError } from '../../utils/api'
import {
  getCurrentStudentSession,
  redirectToStudentLogin,
  saveMentalAssessmentHistory,
  type MentalAssessmentHistoryItem,
} from '../../utils/storage'

export {}

type ScaleKey = 'SDS' | 'SAS'
type GuideId = 'stress' | 'support' | 'science' | 'treehole'

const EMOTION_AI_INTRO_TITLE = 'AI 树洞'
const EMOTION_AI_INTRO_TEXT = '在关怀主题里随时聊聊你的心情和困扰。'

interface CareQuote {
  id: string
  text: string
}

interface GuideCard {
  id: GuideId
  title: string
  summary: string
  icon: string
}

interface StressCategory {
  id: string
  title: string
  icon: string
  tips: string[]
}

interface ScienceResource {
  id: string
  title: string
  source: string
  url: string
}

interface SupportChannel {
  label: string
  value: string
}

interface CampusMoment {
  id: string
  title: string
  caption: string
  image: string
  imageList: string[]
  publisher: string
  date: string
}

interface UploadAttachment {
  name: string
  type: string
  size: number
  contentBase64: string
}

interface CampusMomentRecord {
  id: string
  title?: string
  caption?: string
  image?: string
  imageList?: string[]
  studentName?: string
  publisher?: string
  submittedAt?: string
  publishedAt?: string
  status?: '待审核' | '已发布' | '驳回'
  reviewComment?: string
}

interface CampusMomentListResponse {
  list?: CampusMomentRecord[]
}

interface AssessmentQuestion {
  id: string
  text: string
  reverse?: boolean
}

interface AssessmentScaleConfig {
  key: ScaleKey
  name: string
  intro: string
  optionLabels: string[]
  questions: AssessmentQuestion[]
}

interface RenderQuestion {
  id: string
  no: number
  text: string
  selectedIndex: number
  selectedLabel: string
}

interface AssessmentResultView {
  scaleKey: ScaleKey
  scaleName: string
  rawScore: number
  standardScore: number
  indexScore: string
  levelLabel: string
  explain: string
  highlightText: string
  levelTone: 'tone-ok' | 'tone-warn' | 'tone-danger'
}

interface CampusMomentForm {
  title: string
  caption: string
  imageAttachments: UploadAttachment[]
  imagePreviewList: string[]
  imageNameList: string[]
}

const CARE_QUOTES: CareQuote[] = [
  { id: 'quote-1', text: '你真的超棒，慢慢来，一切都会慢慢如愿。' },
  { id: 'quote-2', text: '别怕眼前的难处，认真努力的你，值得所有温柔与好运。' },
  { id: 'quote-3', text: '纵使起点平凡，你依旧向阳前行，日子总会越来越暖。' },
  { id: 'quote-4', text: '你不是一个人在扛，我们会一直陪你走过这段路。' },
]

const GUIDE_CARDS: GuideCard[] = [
  {
    id: 'stress',
    title: '压力缓解',
    summary: '快来看看有什么缓解压力的方法吧！',
    icon: '压',
  },
  {
    id: 'support',
    title: '心有力量 · 师有陪伴',
    summary: '遇到突发困难时，学校和老师会与你并肩。',
    icon: '伴',
  },
  {
    id: 'science',
    title: '心理疾病科普',
    summary: '了解常见心理困扰与求助方式，做到早识别、早支持。',
    icon: '知',
  },
  {
    id: 'treehole',
    title: 'AI 树洞',
    summary: '在关怀主题里随时聊聊你的心情和困扰。',
    icon: '聊',
  },
]

const STRESS_CATEGORIES: StressCategory[] = [
  {
    id: 'study',
    title: '学业与考试压力',
    icon: '学',
    tips: [
      '拆解任务法：把大作业/复习拆成30分钟小目标，完成一项就打勾，减少畏难感。',
      '番茄工作法：学25分钟、休息5分钟，避免久坐内耗。',
      '拒绝完美主义：先完成，再优化，不必一次做到满分。',
    ],
  },
  {
    id: 'emotion',
    title: '情绪与心理内耗',
    icon: '情',
    tips: [
      '情绪树洞：写日记、和信任朋友倾诉，不把压力闷在心里。',
      '正念深呼吸：4秒吸气、6秒呼气，循环3分钟，快速平复焦虑。',
    ],
  },
  {
    id: 'body',
    title: '身体解压',
    icon: '体',
    tips: [
      '轻度运动：夜跑、散步、拉伸、跳绳，帮助释放压力。',
      '规律作息：尽量固定睡觉和起床时间，避免熬夜放大焦虑。',
    ],
  },
  {
    id: 'social',
    title: '人际与社团/学生工作压力',
    icon: '社',
    tips: [
      '学会拒绝：超出精力的任务要礼貌说“不”，不用硬扛。',
      '沟通前置：有矛盾不冷战，及时表达想法，减少误会内耗。',
    ],
  },
  {
    id: 'quick',
    title: '即时应急小技巧',
    icon: '急',
    tips: [
      '离开压抑环境，下楼走5分钟。',
      '听舒缓纯音乐或白噪音。',
      '洗热水澡或整理桌面，用小事找回掌控感。',
    ],
  },
]

const SCIENCE_RESOURCES: ScienceResource[] = [
  {
    id: 'science-1',
    title: 'Mental disorders（心理障碍总览）',
    source: 'WHO',
    url: 'https://www.who.int/news-room/fact-sheets/detail/mental-disorders',
  },
  {
    id: 'science-2',
    title: 'Anxiety disorders（焦虑障碍）',
    source: 'WHO',
    url: 'https://www.who.int/news-room/fact-sheets/detail/anxiety-disorders',
  },
  {
    id: 'science-3',
    title: 'Depression（抑郁障碍）',
    source: 'WHO',
    url: 'https://www.who.int/news-room/fact-sheets/detail/depression',
  },
  {
    id: 'science-4',
    title: '常见心理疾病科普（图文）',
    source: '小红书（用户提供）',
    url: 'http://xhslink.com/o/9p0oH2ToS0a',
  },
]

const SUPPORT_CHANNELS: SupportChannel[] = [
  { label: '心理咨询中心预约', value: '学生事务系统 - 心理咨询预约入口' },
  { label: '学院辅导员帮扶', value: '学院公众号 / 辅导员办公室' },
  { label: '24小时心理援助热线', value: '400-800-1234（Mock）' },
]

const SDS_CONFIG: AssessmentScaleConfig = {
  key: 'SDS',
  name: '抑郁自评量表（SDS）',
  intro: '请根据最近一周的实际状态选择频率，每题1-4分。',
  optionLabels: ['从无或偶尔', '有时', '经常', '总是如此'],
  questions: [
    { id: 'sds-1', text: '我感到情绪沮丧、郁闷。' },
    { id: 'sds-2', text: '我感到早晨心情最好。', reverse: true },
    { id: 'sds-3', text: '我要哭或想哭。' },
    { id: 'sds-4', text: '我夜间睡眠不好。' },
    { id: 'sds-5', text: '我吃饭像平常一样多。', reverse: true },
    { id: 'sds-6', text: '我的性功能正常。', reverse: true },
    { id: 'sds-7', text: '我感到体重减轻。' },
    { id: 'sds-8', text: '我为便秘烦恼。' },
    { id: 'sds-9', text: '我的心跳比平时快。' },
    { id: 'sds-10', text: '我无故感到疲乏。' },
    { id: 'sds-11', text: '我的头脑像平常一样清楚。', reverse: true },
    { id: 'sds-12', text: '我做事情像平常一样不感到困难。', reverse: true },
    { id: 'sds-13', text: '我坐卧难安，难以保持平静。' },
    { id: 'sds-14', text: '我对未来感到有希望。', reverse: true },
    { id: 'sds-15', text: '我比平时更容易激怒。' },
    { id: 'sds-16', text: '我觉得决定什么事很容易。', reverse: true },
    { id: 'sds-17', text: '我感到自己是有用的和不可缺少的。', reverse: true },
    { id: 'sds-18', text: '我的生活很有意思。', reverse: true },
    { id: 'sds-19', text: '假若我死了，别人会过得更好。' },
    { id: 'sds-20', text: '我仍旧喜欢自己平时喜欢的东西。', reverse: true },
  ],
}

const SAS_CONFIG: AssessmentScaleConfig = {
  key: 'SAS',
  name: '焦虑自评量表（SAS）',
  intro: '请根据最近一周的实际状态选择频率，每题1-4分。',
  optionLabels: ['没有或很少有', '有时有', '大部分时间有', '绝大多数时间有'],
  questions: [
    { id: 'sas-1', text: '我感到比往常更加神经过敏和焦虑。' },
    { id: 'sas-2', text: '我无缘无故感到担心。' },
    { id: 'sas-3', text: '我容易心烦意乱或感到恐慌。' },
    { id: 'sas-4', text: '我感到我的身体好像被分成几块，支离破碎。' },
    { id: 'sas-5', text: '我感到事事都很顺利，不会有倒霉事情发生。', reverse: true },
    { id: 'sas-6', text: '我的四肢抖动和震颤。' },
    { id: 'sas-7', text: '我因头痛、颈痛、背痛而烦恼。' },
    { id: 'sas-8', text: '我感到无力且容易疲劳。' },
    { id: 'sas-9', text: '我感到很平静，能安静坐下来。', reverse: true },
    { id: 'sas-10', text: '我感到我的心跳较快。' },
    { id: 'sas-11', text: '我因阵阵眩晕而不舒服。' },
    { id: 'sas-12', text: '我有阵阵要昏倒的感觉。' },
    { id: 'sas-13', text: '我呼吸时进气和出气都不费力。', reverse: true },
    { id: 'sas-14', text: '我的手指和脚趾感到麻木和刺痛。' },
    { id: 'sas-15', text: '我因胃痛和消化不良而苦恼。' },
    { id: 'sas-16', text: '我必须时常排尿。' },
    { id: 'sas-17', text: '我的手总是很温暖而干燥。', reverse: true },
    { id: 'sas-18', text: '我觉得脸发烧发红。' },
    { id: 'sas-19', text: '我容易入睡，晚上休息很好。', reverse: true },
    { id: 'sas-20', text: '我做恶梦。' },
  ],
}

const SCALE_CONFIG_MAP: Record<ScaleKey, AssessmentScaleConfig> = {
  SDS: SDS_CONFIG,
  SAS: SAS_CONFIG,
}

interface EmotionEventResponse {
  event: {
    levelCode: 'high' | 'medium' | 'low'
    suggestion: string
    triggerReason: string
  }
}

function formatDate(value: string): string {
  return String(value || '').slice(0, 10)
}

function normalizeCoverUrl(rawCoverImage: string, fallbackCoverImage: string): string {
  const coverImage = String(rawCoverImage || '').trim()
  if (!coverImage) {
    return fallbackCoverImage
  }
  if (/^https?:\/\//i.test(coverImage) || /^data:/i.test(coverImage)) {
    return coverImage
  }
  if (coverImage.startsWith('/')) {
    return `${getApiBaseUrl()}${coverImage}`
  }
  return coverImage
}

function buildFallbackMoments(fallbackCoverImage: string): CampusMoment[] {
  return [
    {
      id: 'fallback-1',
      title: '晚霞下的操场跑道',
      caption: '今天也有不少同学在操场慢跑，运动是很好的情绪出口。',
      image: fallbackCoverImage,
      imageList: [fallbackCoverImage],
      publisher: '关怀中心管理员',
      date: formatDate(new Date().toISOString()),
    },
    {
      id: 'fallback-2',
      title: '图书馆夜读角落',
      caption: '学业再忙，也别忘了给自己安排休息和放松。',
      image: fallbackCoverImage,
      imageList: [fallbackCoverImage],
      publisher: '关怀中心管理员',
      date: formatDate(new Date().toISOString()),
    },
  ]
}

function normalizeCampusMomentRecord(item: CampusMomentRecord, fallbackCoverImage: string): CampusMoment {
  const sourceImageList = Array.isArray(item.imageList) ? item.imageList : []
  const normalizedImageList = sourceImageList
    .map((entry) => normalizeCoverUrl(String(entry || ''), fallbackCoverImage))
    .filter((entry) => Boolean(entry))
  const fallbackImage = normalizeCoverUrl(String(item.image || ''), fallbackCoverImage)
  const imageList = normalizedImageList.length > 0 ? normalizedImageList : (fallbackImage ? [fallbackImage] : [fallbackCoverImage])
  return {
    id: String(item.id || `moment-${Date.now()}`),
    title: String(item.title || '校园一角'),
    caption: String(item.caption || '').slice(0, 60) || '和你共享身边的点滴美好。',
    image: imageList[0],
    imageList,
    publisher: String(item.studentName || item.publisher || '校园投稿'),
    date: formatDate(String(item.publishedAt || item.submittedAt || '')),
  }
}

function buildRenderQuestions(scaleKey: ScaleKey, answers: number[]): RenderQuestion[] {
  const scale = SCALE_CONFIG_MAP[scaleKey]
  return scale.questions.map((question, index) => {
    const score = Number(answers[index] || 0)
    const selectedIndex = score > 0 ? score - 1 : -1
    const selectedLabel = selectedIndex >= 0 ? scale.optionLabels[selectedIndex] : ''
    return {
      id: question.id,
      no: index + 1,
      text: question.text,
      selectedIndex,
      selectedLabel,
    }
  })
}

function getAdjustedScore(rawScore: number, reverse: boolean): number {
  if (!reverse) {
    return rawScore
  }
  return 5 - rawScore
}

function buildAssessmentResult(scaleKey: ScaleKey, answers: number[]): AssessmentResultView {
  const scale = SCALE_CONFIG_MAP[scaleKey]
  const adjustedScores = scale.questions.map((question, index) => {
    const rawScore = Number(answers[index] || 0)
    return {
      text: question.text,
      score: getAdjustedScore(rawScore, Boolean(question.reverse)),
    }
  })
  const rawScore = adjustedScores.reduce((sum, item) => sum + item.score, 0)
  const standardScore = Math.round(rawScore * 1.25)
  const indexScore = (rawScore / 80).toFixed(2)

  let levelLabel = ''
  let explain = ''
  let levelTone: AssessmentResultView['levelTone'] = 'tone-ok'

  if (standardScore < 50) {
    levelLabel = scaleKey === 'SDS' ? '状态总体平稳（无明显抑郁倾向）' : '状态总体平稳（无明显焦虑倾向）'
    explain = '建议继续保持规律作息、适度运动和稳定社交。'
    levelTone = 'tone-ok'
  } else if (standardScore <= 59) {
    levelLabel = scaleKey === 'SDS' ? '轻度抑郁倾向' : '轻度焦虑倾向'
    explain = '建议先做自我调节，并与信任的人沟通，必要时预约心理咨询。'
    levelTone = 'tone-warn'
  } else if (standardScore <= 69) {
    levelLabel = scaleKey === 'SDS' ? '中度抑郁倾向' : '中度焦虑倾向'
    explain = '建议尽快联系辅导员或心理咨询中心，做进一步评估与支持。'
    levelTone = 'tone-danger'
  } else {
    levelLabel = scaleKey === 'SDS' ? '重度抑郁倾向' : '重度焦虑倾向'
    explain = '请尽快联系学校心理中心或专业医疗机构，及时获得帮助。'
    levelTone = 'tone-danger'
  }

  const highlightItems = adjustedScores
    .filter((item) => item.score >= 3)
    .slice(0, 3)
    .map((item) => item.text)
  const highlightText = highlightItems.length > 0 ? `重点关注：${highlightItems.join('；')}` : ''

  return {
    scaleKey,
    scaleName: scale.name,
    rawScore,
    standardScore,
    indexScore,
    levelLabel,
    explain,
    highlightText,
    levelTone,
  }
}

function buildHistoryRecord(result: AssessmentResultView): MentalAssessmentHistoryItem | null {
  const session = getCurrentStudentSession()
  if (!session) {
    return null
  }
  return {
    id: `mental-assessment-${Date.now()}`,
    studentId: session.studentId,
    scaleKey: result.scaleKey,
    scaleName: result.scaleName,
    rawScore: result.rawScore,
    standardScore: result.standardScore,
    indexScore: result.indexScore,
    levelLabel: result.levelLabel,
    levelTone: result.levelTone,
    highlightText: result.highlightText,
    createdAt: new Date().toISOString(),
  }
}

function readFileAsBase64(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath,
      encoding: 'base64',
      success: (result) => {
        resolve(String(result.data || ''))
      },
      fail: (error) => {
        reject(new Error(error.errMsg || '附件读取失败'))
      },
    })
  })
}

function getMimeTypeByName(fileName: string): string {
  const lowerName = String(fileName || '').toLowerCase()
  if (lowerName.endsWith('.png')) {
    return 'image/png'
  }
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
    return 'image/jpeg'
  }
  if (lowerName.endsWith('.webp')) {
    return 'image/webp'
  }
  if (lowerName.endsWith('.gif')) {
    return 'image/gif'
  }
  return 'image/jpeg'
}

function buildImageDataUrl(attachment: UploadAttachment | null): string {
  if (!attachment || !attachment.contentBase64) {
    return ''
  }
  return `data:${attachment.type || 'application/octet-stream'};base64,${attachment.contentBase64}`
}

function buildImageDataUrlList(attachments: UploadAttachment[]): string[] {
  return (Array.isArray(attachments) ? attachments : [])
    .map((attachment) => buildImageDataUrl(attachment))
    .filter((item) => Boolean(item))
}

Page({
  data: {
    dailyQuote: CARE_QUOTES[0],
    guideCards: GUIDE_CARDS,
    quickMoodOptions: ['开心', '难过', '困惑', '自洽', '一般', '舒适', '烦躁', '疲惫', '紧张', '期待'],
    quickMoodEntryOptions: ['开心', '难过', '困惑', '自洽', '一般', '舒适', '烦躁', '疲惫', '紧张', '期待', '压力大', '有点累'],
    stressCategories: STRESS_CATEGORIES,
    scienceResources: SCIENCE_RESOURCES,
    supportChannels: SUPPORT_CHANNELS,
    campusMoments: [] as CampusMoment[],
    showMomentModal: false,
    showMomentDetailModal: false,
    activeMomentDetail: null as CampusMoment | null,
    showMomentSubmitModal: false,
    momentForm: {
      title: '',
      caption: '',
      imageAttachments: [],
      imagePreviewList: [],
      imageNameList: [],
    } as CampusMomentForm,
    momentSubmitting: false,
    showGuideModal: false,
    activeGuideId: '' as GuideId | '',
    activeGuideTitle: '',
    activeScaleKey: 'SDS' as ScaleKey,
    activeScaleName: SDS_CONFIG.name,
    activeScaleIntro: SDS_CONFIG.intro,
    activeOptionLabels: SDS_CONFIG.optionLabels,
    activeQuestions: [] as RenderQuestion[],
    assessmentAnswersSDS: new Array(SDS_CONFIG.questions.length).fill(0),
    assessmentAnswersSAS: new Array(SAS_CONFIG.questions.length).fill(0),
    assessmentResult: null as AssessmentResultView | null,
    showAssessmentModal: false,
  },

  onLoad() {
    this.refreshDailyQuote()
    this.syncScaleView('SDS')
    this.loadCampusMoments()
  },

  onShow() {
    this.loadCampusMoments()
  },

  refreshDailyQuote() {
    const randomIndex = Math.floor(Math.random() * CARE_QUOTES.length)
    this.setData({
      dailyQuote: CARE_QUOTES[randomIndex],
    })
  },

  onRefreshQuote() {
    this.refreshDailyQuote()
  },

  async loadCampusMoments() {
    const fallbackCoverImage = `${getApiBaseUrl()}/teacher/logo.png`
    try {
      const response = await request<CampusMomentListResponse>({ url: '/api/campus-moments' })
      const sourceList = Array.isArray(response.list) ? response.list : []
      const campusMoments = sourceList.slice(0, 8).map((item) => normalizeCampusMomentRecord(item, fallbackCoverImage))
      this.setData({
        campusMoments: campusMoments.length > 0 ? campusMoments : buildFallbackMoments(fallbackCoverImage),
      })
    } catch (error) {
      this.setData({
        campusMoments: buildFallbackMoments(fallbackCoverImage),
      })
      showRequestError(error, '校园点滴加载失败，已展示默认内容')
    }
  },

  openMomentModal() {
    this.setData({
      showMomentModal: true,
      showMomentDetailModal: false,
      activeMomentDetail: null,
      showMomentSubmitModal: false,
      showGuideModal: false,
      showAssessmentModal: false,
    })
  },

  closeMomentModal() {
    this.setData({
      showMomentModal: false,
      showMomentDetailModal: false,
      activeMomentDetail: null,
    })
  },

  openMomentSubmitModal() {
    const session = getCurrentStudentSession()
    if (!session) {
      redirectToStudentLogin('请先登录学生账号后再投稿')
      return
    }
    this.setData({
      showMomentSubmitModal: true,
      showMomentModal: false,
      showGuideModal: false,
      showAssessmentModal: false,
    })
  },

  closeMomentSubmitModal() {
    this.setData({
      showMomentSubmitModal: false,
      momentForm: {
        title: '',
        caption: '',
        imageAttachments: [],
        imagePreviewList: [],
        imageNameList: [],
      },
    })
  },

  onMomentInput(event: WechatMiniprogram.Input) {
    const field = String(event.currentTarget.dataset.field || '')
    if (!field) {
      return
    }
    this.setData({
      [`momentForm.${field}`]: String(event.detail.value || ''),
    })
  },

  async onChooseMomentImage() {
    try {
      const currentAttachments = (this.data.momentForm.imageAttachments || []) as UploadAttachment[]
      const remaining = Math.max(0, 9 - currentAttachments.length)
      if (remaining <= 0) {
        wx.showToast({
          title: '最多上传9张图片',
          icon: 'none',
        })
        return
      }
      const result = await new Promise<WechatMiniprogram.ChooseImageSuccessCallbackResult>((resolve, reject) => {
        wx.chooseImage({
          count: remaining,
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
          success: resolve,
          fail: (error) => reject(new Error(error.errMsg || '图片选择失败')),
        })
      })
      const tempFilePaths = Array.isArray(result.tempFilePaths) ? result.tempFilePaths : []
      if (tempFilePaths.length === 0) {
        return
      }
      const tempFileList = Array.isArray(result.tempFiles) ? result.tempFiles : []
      const nextAttachments = await Promise.all(tempFilePaths.map(async (tempFilePath, index) => {
        const currentPath = String(tempFilePath || '')
        const tempFile = tempFileList[index]
        const fileName = currentPath.split('/').pop() || `campus-moment-${Date.now()}-${index + 1}.jpg`
        const fileType = getMimeTypeByName(fileName)
        const fileSize = Number(tempFile?.size || 0)
        const contentBase64 = await readFileAsBase64(currentPath)
        return {
          name: fileName,
          type: fileType,
          size: fileSize,
          contentBase64,
        } as UploadAttachment
      }))
      const imageAttachments = currentAttachments.concat(nextAttachments)
      this.setData({
        'momentForm.imageAttachments': imageAttachments,
        'momentForm.imagePreviewList': buildImageDataUrlList(imageAttachments),
        'momentForm.imageNameList': imageAttachments.map((item) => item.name),
      })
    } catch (error) {
      showRequestError(error, '图片上传失败')
    }
  },

  onClearMomentImage(event: WechatMiniprogram.TouchEvent) {
    const removeIndex = Number(event.currentTarget.dataset.index)
    const currentAttachments = (this.data.momentForm.imageAttachments || []) as UploadAttachment[]
    if (!Number.isNaN(removeIndex) && removeIndex >= 0) {
      const imageAttachments = currentAttachments.filter((_, index) => index !== removeIndex)
      this.setData({
        'momentForm.imageAttachments': imageAttachments,
        'momentForm.imagePreviewList': buildImageDataUrlList(imageAttachments),
        'momentForm.imageNameList': imageAttachments.map((item) => item.name),
      })
      return
    }
    this.setData({
      'momentForm.imageAttachments': [],
      'momentForm.imagePreviewList': [],
      'momentForm.imageNameList': [],
    })
  },

  onOpenMomentDetail(event: WechatMiniprogram.TouchEvent) {
    const momentId = String(event.currentTarget.dataset.id || '')
    if (!momentId) {
      return
    }
    const target = (this.data.campusMoments as CampusMoment[]).find((item) => item.id === momentId) || null
    if (!target) {
      return
    }
    this.setData({
      showMomentModal: false,
      showMomentDetailModal: true,
      activeMomentDetail: target,
    })
  },

  closeMomentDetailModal() {
    this.setData({
      showMomentDetailModal: false,
      activeMomentDetail: null,
      showMomentModal: true,
    })
  },

  async onSubmitMoment() {
    const title = String(this.data.momentForm.title || '').trim()
    const caption = String(this.data.momentForm.caption || '').trim()
    const imageAttachments = (this.data.momentForm.imageAttachments || []) as UploadAttachment[]
    if (!title || !caption) {
      wx.showToast({
        title: '请填写标题和内容',
        icon: 'none',
      })
      return
    }
    if (!imageAttachments.length || !imageAttachments[0]?.contentBase64) {
      wx.showToast({
        title: '请至少上传1张图片',
        icon: 'none',
      })
      return
    }
    this.setData({ momentSubmitting: true })
    try {
      await request({
        url: '/api/campus-moments',
        method: 'POST',
        data: {
          title,
          caption,
          imageAttachment: imageAttachments[0],
          imageAttachments,
        },
      })
      wx.showToast({
        title: '投稿已提交，等待老师审核',
        icon: 'none',
      })
      this.setData({
        showMomentSubmitModal: false,
        showMomentDetailModal: false,
        activeMomentDetail: null,
        momentSubmitting: false,
        momentForm: {
          title: '',
          caption: '',
          imageAttachments: [],
          imagePreviewList: [],
          imageNameList: [],
        },
      })
      this.loadCampusMoments()
    } catch (error) {
      this.setData({ momentSubmitting: false })
      showRequestError(error, '投稿失败')
    }
  },

  onPreviewMoment(event: WechatMiniprogram.TouchEvent) {
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

  onOpenGuideDetail(event: WechatMiniprogram.TouchEvent) {
    const guideId = String(event.currentTarget.dataset.id || '') as GuideId | ''
    if (guideId === 'treehole') {
      this.onOpenTreeholeFromGuide()
      return
    }
    const targetGuide = GUIDE_CARDS.find((item) => item.id === guideId)
    if (!targetGuide) {
      return
    }
    this.setData({
      activeGuideId: targetGuide.id,
      activeGuideTitle: targetGuide.title,
      showGuideModal: true,
      showMomentModal: false,
      showMomentSubmitModal: false,
      showAssessmentModal: false,
    })
  },

  closeGuideModal() {
    this.setData({ showGuideModal: false })
  },

  onCopyScienceLink(event: WechatMiniprogram.TouchEvent) {
    const url = String(event.currentTarget.dataset.url || '')
    if (!url) {
      return
    }
    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showToast({
          title: '链接已复制',
          icon: 'none',
        })
      },
    })
  },

  onContactCounselor() {
    const targetChannel = SUPPORT_CHANNELS[1]?.value || '学院公众号 / 辅导员办公室'
    wx.setClipboardData({
      data: targetChannel,
      success: () => {
        wx.showToast({
          title: '渠道已复制',
          icon: 'none',
        })
      },
    })
  },

  onCallHotline() {
    wx.makePhoneCall({
      phoneNumber: '4008001234',
      fail: () => {
        wx.showToast({
          title: '当前环境不支持拨号',
          icon: 'none',
        })
      },
    })
  },

  onOpenTreeholeFromGuide() {
    this.openEmotionAiChat()
    this.reportEmotionEvent('打开树洞对话', 'guide-enter')
  },

  openAssessmentModal() {
    this.setData({
      showAssessmentModal: true,
      showMomentModal: false,
      showMomentSubmitModal: false,
      showGuideModal: false,
    })
  },

  closeAssessmentModal() {
    this.setData({ showAssessmentModal: false })
  },

  onSwitchScale(event: WechatMiniprogram.TouchEvent) {
    const scaleKey = String(event.currentTarget.dataset.key || 'SDS') as ScaleKey
    if (scaleKey !== 'SDS' && scaleKey !== 'SAS') {
      return
    }
    this.syncScaleView(scaleKey)
    this.setData({
      assessmentResult: null,
    })
  },

  syncScaleView(scaleKey: ScaleKey) {
    const scale = SCALE_CONFIG_MAP[scaleKey]
    const answers = scaleKey === 'SDS' ? (this.data.assessmentAnswersSDS as number[]) : (this.data.assessmentAnswersSAS as number[])
    this.setData({
      activeScaleKey: scale.key,
      activeScaleName: scale.name,
      activeScaleIntro: scale.intro,
      activeOptionLabels: scale.optionLabels,
      activeQuestions: buildRenderQuestions(scaleKey, answers),
    })
  },

  onPickAssessmentOption(event: WechatMiniprogram.CustomEvent) {
    const scaleKey = this.data.activeScaleKey as ScaleKey
    if (scaleKey !== 'SDS' && scaleKey !== 'SAS') {
      return
    }

    const dataset = event.currentTarget.dataset as Record<string, unknown>
    const index = Number(dataset.index ?? -1)
    const selectedValue = (event.detail as { value?: string | number }).value
    const selectedIndex = Number(selectedValue)
    const questionLength = SCALE_CONFIG_MAP[scaleKey].questions.length

    if (!Number.isFinite(index) || index < 0 || index >= questionLength) {
      return
    }
    if (!Number.isFinite(selectedIndex) || selectedIndex < 0 || selectedIndex > 3) {
      return
    }

    const nextScore = selectedIndex + 1
    if (scaleKey === 'SDS') {
      const answers = [...(this.data.assessmentAnswersSDS as number[])]
      answers[index] = nextScore
      this.setData({
        assessmentAnswersSDS: answers,
        activeQuestions: buildRenderQuestions('SDS', answers),
      })
      return
    }

    const answers = [...(this.data.assessmentAnswersSAS as number[])]
    answers[index] = nextScore
    this.setData({
      assessmentAnswersSAS: answers,
      activeQuestions: buildRenderQuestions('SAS', answers),
    })
  },

  onResetAssessment() {
    const scaleKey = this.data.activeScaleKey as ScaleKey
    if (scaleKey === 'SDS') {
      const cleared = new Array(SDS_CONFIG.questions.length).fill(0)
      this.setData({
        assessmentAnswersSDS: cleared,
        activeQuestions: buildRenderQuestions('SDS', cleared),
        assessmentResult: null,
      })
      return
    }

    const cleared = new Array(SAS_CONFIG.questions.length).fill(0)
    this.setData({
      assessmentAnswersSAS: cleared,
      activeQuestions: buildRenderQuestions('SAS', cleared),
      assessmentResult: null,
    })
  },

  onSubmitAssessment() {
    const scaleKey = this.data.activeScaleKey as ScaleKey
    const sourceAnswers = scaleKey === 'SDS' ? this.data.assessmentAnswersSDS : this.data.assessmentAnswersSAS
    const expectedLength = SCALE_CONFIG_MAP[scaleKey].questions.length
    const answers = (Array.isArray(sourceAnswers) ? sourceAnswers : [])
      .slice(0, expectedLength)
      .map((item) => Number(item || 0))

    while (answers.length < expectedLength) {
      answers.push(0)
    }

    const pendingCount = answers.filter((item) => item <= 0).length
    if (pendingCount > 0) {
      wx.showToast({
        title: `还有${pendingCount}题未作答`,
        icon: 'none',
      })
      return
    }

    const result = buildAssessmentResult(scaleKey, answers)
    const historyRecord = buildHistoryRecord(result)
    if (historyRecord) {
      saveMentalAssessmentHistory(historyRecord)
      this.reportEmotionEvent(
        `量表自评：${result.scaleName} ${result.levelLabel}（标准分${result.standardScore}）`,
        'assessment-self-check',
      )
    }

    this.setData({
      assessmentResult: result,
      showAssessmentModal: false,
      activeQuestions: buildRenderQuestions(scaleKey, answers),
      ...(scaleKey === 'SDS'
        ? { assessmentAnswersSDS: answers }
        : { assessmentAnswersSAS: answers }),
    })

    if (result.levelTone === 'tone-danger') {
      wx.showModal({
        title: '关怀提醒',
        content: '你的自评结果提示需要更多支持，建议尽快联系辅导员或心理咨询中心。',
        confirmText: '联系辅导员',
        cancelText: '联系心理咨询室',
        success: (modalResult) => {
          const supportText = modalResult.confirm
            ? '学院公众号 / 辅导员办公室'
            : '学生事务系统 - 心理咨询预约入口'
          wx.setClipboardData({
            data: supportText,
            success: () => {
              wx.showToast({
                title: '渠道已复制',
                icon: 'none',
              })
            },
          })
        },
      })
    }
  },

  onQuickMoodTap(event: WechatMiniprogram.TouchEvent) {
    const mood = String(event.currentTarget.dataset.mood || '').trim()
    if (!mood) {
      return
    }
    this.reportEmotionEvent(`情绪自评：${mood}`, 'mood-self-check')
    this.openEmotionAiChat(`我现在感觉${mood}，想聊聊。`, true)
  },

  openTreeholeModal() {
    this.openEmotionAiChat()
    this.reportEmotionEvent('打开树洞对话', 'manual-enter')
  },

  onPickEntryMood(event: WechatMiniprogram.TouchEvent) {
    const mood = String(event.currentTarget.dataset.mood || '').trim()
    if (!mood) {
      return
    }
    this.reportEmotionEvent(`情绪入口自评：${mood}`, 'entry-self-check')
    this.openEmotionAiChat(`我现在感觉${mood}，想聊聊。`, true)
  },

  openEmotionAiChat(prefillQuestion = '', autoSend = false) {
    this.setData({
      showGuideModal: false,
      showMomentModal: false,
      showMomentSubmitModal: false,
      showAssessmentModal: false,
    })
    const question = encodeURIComponent(String(prefillQuestion || '').trim())
    const introTitle = encodeURIComponent(EMOTION_AI_INTRO_TITLE)
    const introText = encodeURIComponent(EMOTION_AI_INTRO_TEXT)
    const query = [
      'scene=emotion',
      'title=AI%E6%A0%91%E6%B4%9E',
      `introTitle=${introTitle}`,
      `introText=${introText}`,
    ]
    if (question) {
      query.push(`question=${question}`)
    }
    if (autoSend) {
      query.push('autoSend=1')
    }
    wx.navigateTo({
      url: `/pages/ai-chat-room/ai-chat-room?${query.join('&')}`,
    })
  },

  async reportEmotionEvent(content: string, channel: string) {
    const safeContent = String(content || '').trim()
    if (!safeContent) {
      return
    }
    try {
      const response = await request<EmotionEventResponse>({
        url: '/api/emotion-events',
        method: 'POST',
        data: {
          content: safeContent,
          channel,
        },
      })
      const event = response.event
      if (event.levelCode === 'high') {
        wx.showModal({
          title: '关怀提醒',
          content: '系统检测到你可能正处于高压状态，建议尽快联系辅导员或学校心理中心，我们会陪你一起面对。',
          confirmText: '联系辅导员',
          cancelText: '联系心理咨询室',
          success: (modalResult) => {
            const supportText = modalResult.confirm
              ? '学院公众号 / 辅导员办公室'
              : '学生事务系统 - 心理咨询预约入口'
            wx.setClipboardData({
              data: supportText,
              success: () => {
                wx.showToast({
                  title: '渠道已复制',
                  icon: 'none',
                })
              },
            })
          },
        })
        return
      }
      if (event.levelCode === 'medium' && channel !== 'treehole-chat') {
        return
      }
    } catch (_error) {
      // Ignore logging failures to avoid interrupting the care-center flow.
    }
  },
})
