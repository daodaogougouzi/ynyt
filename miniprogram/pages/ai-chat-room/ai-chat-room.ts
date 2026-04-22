export {}

type SceneKey = 'emotion' | 'onboarding' | 'recognition' | 'scholarship' | 'material-draft' | 'general'

interface AiChatPageOptions {
  scene?: string
  title?: string
  introTitle?: string
  introText?: string
  question?: string
  autoSend?: string
}

interface AiChatComponentInstance {
  openWithQuestion?: (question?: string, autoSend?: boolean) => void
  openPanel?: () => void
  setData?: (data: Record<string, unknown>) => void
}

const PAGE_TITLE_BY_SCENE: Record<SceneKey, string> = {
  emotion: 'AI树洞',
  onboarding: 'AI使用向导',
  recognition: 'AI认定助手',
  scholarship: 'AI奖助助手',
  'material-draft': 'AI材料助手',
  general: 'AI助手',
}

const INTRO_TITLE_BY_SCENE: Partial<Record<SceneKey, string>> = {
  emotion: 'AI 树洞',
  onboarding: 'AI 使用向导',
  recognition: '提交前还想确认？',
  scholarship: 'AI 咨询学院奖助问题',
  'material-draft': 'AIGC 材料草稿助手',
}

const INTRO_TEXT_BY_SCENE: Partial<Record<SceneKey, string>> = {
  emotion: '在关怀主题里随时聊聊你的心情和困扰。',
  onboarding: '可以直接问我：先做哪一步、每个功能在哪、怎么完成提交流程。',
  recognition: '可以继续问认定流程、材料准备、退回原因和填写建议。',
  scholarship: '可以继续问申请顺序、资格门槛、材料准备和截止时间。',
  'material-draft': '根据你的基本信息和申请目标，快速生成可编辑的奖助申请草稿。',
}

function decodeQueryText(rawValue: string): string {
  const value = String(rawValue || '').trim()
  if (!value) {
    return ''
  }
  try {
    return decodeURIComponent(value)
  } catch (_error) {
    return value
  }
}

function normalizeScene(rawValue: string): SceneKey {
  const value = String(rawValue || '').trim() as SceneKey
  if (value === 'emotion' || value === 'onboarding' || value === 'recognition' || value === 'scholarship' || value === 'material-draft') {
    return value
  }
  return 'general'
}

function buildChatGreeting(introTitle: string, introText: string): string {
  const safeTitle = String(introTitle || '').trim().replace(/[。！？!?；;，,：:]$/, '')
  const safeText = String(introText || '').trim()
  if (safeTitle && safeText) {
    return `${safeTitle}：${safeText}`
  }
  return safeText || safeTitle
}

Page({
  data: {
    scene: 'general' as SceneKey,
    pageTitle: PAGE_TITLE_BY_SCENE.general,
    introTitle: INTRO_TITLE_BY_SCENE.general || '',
    introText: INTRO_TEXT_BY_SCENE.general || '',
    chatGreeting: '',
    pendingQuestion: '',
    pendingAutoSend: false,
  },

  onLoad(options: AiChatPageOptions) {
    const scene = normalizeScene(options.scene || 'general')
    const pageTitle = decodeQueryText(options.title || '') || PAGE_TITLE_BY_SCENE[scene] || PAGE_TITLE_BY_SCENE.general
    const introTitle = decodeQueryText(options.introTitle || '') || INTRO_TITLE_BY_SCENE[scene] || ''
    const introText = decodeQueryText(options.introText || '') || INTRO_TEXT_BY_SCENE[scene] || ''
    const pendingQuestion = decodeQueryText(options.question || '')
    const pendingAutoSend = String(options.autoSend || '').trim() === '1'
    const chatGreeting = buildChatGreeting(introTitle, introText)
    this.setData({
      scene,
      pageTitle,
      introTitle,
      introText,
      chatGreeting,
      pendingQuestion,
      pendingAutoSend,
    })
  },

  onReady() {
    const chat = this.selectComponent('#roomAiChat') as WechatMiniprogram.Component.TrivialInstance & AiChatComponentInstance
    if (!chat) {
      return
    }
    const pendingQuestion = String(this.data.pendingQuestion || '').trim()
    const pendingAutoSend = Boolean(this.data.pendingAutoSend)
    if (typeof chat.openWithQuestion === 'function') {
      chat.openWithQuestion(pendingQuestion, pendingAutoSend)
      return
    }
    if (pendingQuestion && typeof chat.setData === 'function') {
      chat.setData({ inputValue: pendingQuestion })
    }
    if (typeof chat.openPanel === 'function') {
      chat.openPanel()
    }
  },
})
