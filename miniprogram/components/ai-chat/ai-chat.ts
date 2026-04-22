import { ApiRequestError, requestStream } from '../../utils/api'
import { getCurrentStudentId, saveAiChatHistory } from '../../utils/storage'

const AI_INVITE_STORAGE_KEY = 'xjt_ai_invite_state'
const AI_INVITE_INTERVAL_MS = 10 * 60 * 1000
const AI_INVITE_COPY = ['或许，我可以帮到你~', '无聊的话，可以跟我聊聊天哦~', '如果你愿意，我们可以一起理一理现在的困惑。']
const AI_PANEL_TITLE_BY_SCENE: Record<string, string> = {
  emotion: 'AI 树洞',
  onboarding: 'AI 使用向导',
  recognition: 'AI 智能助手',
  scholarship: 'AI 智能助手',
  'material-draft': 'AI 智能助手',
  general: 'AI 智能助手',
}
const AI_GREETING_BY_SCENE: Record<string, string> = {
  emotion: '这里是ai树洞，你可以说说最近最困扰你的事，我会陪你慢慢梳理。',
  onboarding: '你好，我是系统使用向导。你可以直接问我：先做哪一步、每个功能在哪、从登录到提交申请怎么走，我会按步骤带你操作。',
  recognition: '你好，我是易暖医途 AI 助手。你可以咨询认定流程、材料准备和表单填写建议。',
  scholarship: '你好，我是易暖医途 AI 助手。你可以咨询奖助项目条件、申请步骤和材料准备。',
  'material-draft': '你好，我是易暖医途 AI 助手。你可以让我帮你整理申请材料草稿和补全清单。',
  general: '你好，我是易暖医途 AI 助手。你可以咨询奖助条件、申报流程和临时补助问题。',
}
const AI_READY_STATUS_BY_SCENE: Record<string, string> = {
  emotion: '树洞已连线，我会陪你慢慢梳理',
  onboarding: '向导已就位，可直接问“我该先做什么”',
  recognition: '已连接 qwen3.5',
  scholarship: '已连接 qwen3.5',
  'material-draft': '已连接 qwen3.5',
  general: '已连接 qwen3.5',
}
const AI_INPUT_PLACEHOLDER_BY_SCENE: Record<string, string> = {
  emotion: '想说什么都可以，我在听',
  onboarding: '例如：我第一次用，应该先做什么？',
  recognition: '输入你的问题',
  scholarship: '输入你的问题',
  'material-draft': '输入你的问题',
  general: '输入你的问题',
}
const STREAM_TYPEWRITER_STEP = 6
const STREAM_TYPEWRITER_INTERVAL_MS = 20

export {}

interface AIChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
}

interface AIChatReplyResponse {
  reply: string
  conversationId?: string
  model?: string
  fallbackUsed?: boolean
  fallbackReason?: string
  emotionRisk?: {
    levelCode?: 'high' | 'medium' | 'low'
    suggestion?: string
    triggerReason?: string
  }
}

interface AIInviteStateRecord {
  nextAt: number
  lastIndex: number
}

let messageSeed = 1
let streamTypewriterTimer = 0
let streamTypewriterTarget = ''
let streamTypewriterDisplayed = ''
let streamTypewriterMessageId = ''

Component({
  options: {
    addGlobalClass: true,
  },
  properties: {
    showFloatButton: {
      type: Boolean,
      value: true,
    },
    entryOnly: {
      type: Boolean,
      value: false,
    },
    fullscreen: {
      type: Boolean,
      value: false,
    },
    scene: {
      type: String,
      value: 'general',
      observer() {
        this.applySceneConfig()
      },
    },
    greetingText: {
      type: String,
      value: '',
      observer() {
        this.applySceneConfig()
      },
    },
  },
  data: {
    visible: false,
    inputValue: '',
    loading: false,
    conversationId: '',
    aiStatusText: AI_READY_STATUS_BY_SCENE.general,
    panelTitle: AI_PANEL_TITLE_BY_SCENE.general,
    inputPlaceholder: AI_INPUT_PLACEHOLDER_BY_SCENE.general,
    inviteText: '',
    scrollIntoView: 'msg-0',
    supportPromptVisible: false,
    supportPromptContent: '',
    supportPromptMode: 'general',
    messages: [
      {
        id: 'msg-0',
        role: 'ai',
        content: AI_GREETING_BY_SCENE.general,
      },
    ] as AIChatMessage[],
  },
  lifetimes: {
    attached() {
      this.refreshInviteText()
      this.applySceneConfig(true)
    },
  },
  methods: {
    applySceneConfig(forceResetMessages = false) {
      const scene = String(this.data.scene || 'general').trim() || 'general'
      const greeting = String(this.data.greetingText || '').trim() || AI_GREETING_BY_SCENE[scene] || AI_GREETING_BY_SCENE.general
      const panelTitle = AI_PANEL_TITLE_BY_SCENE[scene] || AI_PANEL_TITLE_BY_SCENE.general
      const aiStatusText = AI_READY_STATUS_BY_SCENE[scene] || AI_READY_STATUS_BY_SCENE.general
      const inputPlaceholder = AI_INPUT_PLACEHOLDER_BY_SCENE[scene] || AI_INPUT_PLACEHOLDER_BY_SCENE.general
      const messages = this.data.messages as AIChatMessage[]
      const shouldResetMessages =
        forceResetMessages ||
        messages.length === 0 ||
        (messages.length === 1 && messages[0]?.id === 'msg-0' && messages[0]?.role === 'ai')

      this.setData({
        panelTitle,
        aiStatusText,
        inputPlaceholder,
        ...(shouldResetMessages
          ? {
              messages: [
                {
                  id: 'msg-0',
                  role: 'ai',
                  content: greeting,
                },
              ],
              scrollIntoView: 'msg-0',
            }
          : {}),
      })
    },

    getInviteStorageKey() {
      const studentId = getCurrentStudentId() || 'guest'
      const scene = String(this.data.scene || 'general').trim() || 'general'
      return `${AI_INVITE_STORAGE_KEY}:${studentId}:${scene}`
    },

    readInviteState(): AIInviteStateRecord | null {
      const rawState = wx.getStorageSync(this.getInviteStorageKey()) as Partial<AIInviteStateRecord>
      if (!rawState || typeof rawState !== 'object') {
        return null
      }
      const nextAt = Number(rawState.nextAt || 0)
      const lastIndex = Number(rawState.lastIndex)
      if (!Number.isFinite(nextAt) || !Number.isFinite(lastIndex)) {
        return null
      }
      return {
        nextAt,
        lastIndex,
      }
    },

    writeInviteState(stateRecord: AIInviteStateRecord) {
      wx.setStorageSync(this.getInviteStorageKey(), stateRecord)
    },

    refreshInviteText(forceRotate = false) {
      const now = Date.now()
      const previousState = this.readInviteState()
      const hasValidIndex =
        Boolean(previousState) &&
        Number(previousState?.lastIndex) >= 0 &&
        Number(previousState?.lastIndex) < AI_INVITE_COPY.length
      const shouldRotate = forceRotate || !previousState || !hasValidIndex || now >= Number(previousState.nextAt || 0)

      let nextIndex = hasValidIndex ? Number(previousState?.lastIndex) : Math.floor(Math.random() * AI_INVITE_COPY.length)
      if (shouldRotate) {
        if (hasValidIndex) {
          nextIndex = (nextIndex + 1) % AI_INVITE_COPY.length
        }
        this.writeInviteState({
          nextAt: now + AI_INVITE_INTERVAL_MS,
          lastIndex: nextIndex,
        })
      }

      this.setData({
        inviteText: AI_INVITE_COPY[nextIndex] || AI_INVITE_COPY[0],
      })
    },

    onTapInvite() {
      if (this.data.entryOnly) {
        this.triggerEvent('invite', { scene: String(this.data.scene || 'general') }, {})
        this.refreshInviteText(true)
        return
      }
      this.openPanel()
      this.refreshInviteText(true)
    },

    // 打开 AI 对话面板。
    openPanel() {
      this.setData({ visible: true })
      this.scrollToBottom()
    },

    // 关闭 AI 对话面板。
    closePanel() {
      this.setData({ visible: false })
      this.refreshInviteText()
    },

    // 监听输入框内容变化。
    onInput(event: WechatMiniprogram.Input) {
      this.setData({ inputValue: event.detail.value })
    },

    stopTypewriter() {
      if (streamTypewriterTimer) {
        clearInterval(streamTypewriterTimer)
        streamTypewriterTimer = 0
      }
    },

    resetTypewriterState() {
      this.stopTypewriter()
      streamTypewriterTarget = ''
      streamTypewriterDisplayed = ''
      streamTypewriterMessageId = ''
    },

    settleTypewriterImmediately() {
      if (
        streamTypewriterMessageId &&
        streamTypewriterTarget &&
        streamTypewriterDisplayed !== streamTypewriterTarget
      ) {
        this.updateMessageContent(streamTypewriterMessageId, streamTypewriterTarget)
      }
      this.resetTypewriterState()
    },

    queueTypewriterRender(messageId: string, fullText: string) {
      streamTypewriterMessageId = messageId
      streamTypewriterTarget = fullText
      if (!streamTypewriterTimer) {
        streamTypewriterTimer = setInterval(() => {
          if (!streamTypewriterMessageId) {
            this.resetTypewriterState()
            return
          }

          if (streamTypewriterDisplayed.length >= streamTypewriterTarget.length) {
            this.stopTypewriter()
            return
          }

          const nextLength = Math.min(streamTypewriterTarget.length, streamTypewriterDisplayed.length + STREAM_TYPEWRITER_STEP)
          streamTypewriterDisplayed = streamTypewriterTarget.slice(0, nextLength)
          this.updateMessageContent(streamTypewriterMessageId, streamTypewriterDisplayed)
        }, STREAM_TYPEWRITER_INTERVAL_MS)
      }
    },

    flushTypewriterNow(messageId: string, fullText: string) {
      this.stopTypewriter()
      streamTypewriterMessageId = messageId
      streamTypewriterTarget = fullText
      streamTypewriterDisplayed = fullText
      this.updateMessageContent(messageId, fullText)
    },

    waitForTypewriterDone(timeoutMs = 6000): Promise<void> {
      return new Promise((resolve) => {
        const startedAt = Date.now()
        const checkDone = () => {
          const noPendingTarget = streamTypewriterTarget.length === 0 || streamTypewriterDisplayed.length >= streamTypewriterTarget.length
          if (noPendingTarget || Date.now() - startedAt >= timeoutMs) {
            this.stopTypewriter()
            resolve()
            return
          }
          setTimeout(checkDone, STREAM_TYPEWRITER_INTERVAL_MS)
        }
        checkDone()
      })
    },

    openWithQuestion(question = '', autoSend = false) {
      const nextQuestion = String(question || '').trim()
      this.setData(
        {
          visible: true,
          inputValue: nextQuestion,
        },
        () => {
          this.scrollToBottom()
          if (nextQuestion && autoSend) {
            this.onSend()
          }
        },
      )
    },

    showHighRiskModal() {
      const isEmotionScene = String(this.data.scene || 'general').trim() === 'emotion'
      this.setData({
        supportPromptVisible: true,
        supportPromptMode: isEmotionScene ? 'emotion' : 'general',
        supportPromptContent: isEmotionScene
          ? '系统检测到你刚刚提到可能伤害自己的行为。你可以立即联系辅导员或心理中心；如果你暂时还不想联系，我们也可以继续聊。'
          : '我们注意到你正在经历很大的压力。你可以立即联系辅导员或心理中心；如果你想先继续聊，我也会继续陪着你。',
      })
    },

    hideSupportPrompt() {
      this.setData({
        supportPromptVisible: false,
        supportPromptContent: '',
        supportPromptMode: 'general',
      })
    },

    copySupportChannel(channelText: string, toastTitle: string) {
      wx.setClipboardData({
        data: channelText,
        success: () => {
          wx.showToast({
            title: toastTitle,
            icon: 'none',
          })
        },
      })
    },

    onSupportPromptAction(event: WechatMiniprogram.TouchEvent) {
      const action = String(event.currentTarget.dataset.action || '').trim()
      const mode = String(this.data.supportPromptMode || 'general').trim()
      this.hideSupportPrompt()
      if (action === 'counselor') {
        this.copySupportChannel('学院公众号 / 辅导员办公室', '辅导员渠道已复制')
        return
      }
      if (action === 'center') {
        this.copySupportChannel('学生事务系统 - 心理咨询预约入口', '心理中心渠道已复制')
        return
      }
      if (action === 'continue' && mode === 'emotion') {
        const followUpId = this.appendMessage('ai', '')
        const followUpReply = '好的，那我们先不联系辅导员。那你是否愿意与我聊聊发生了什么吗？'
        this.queueTypewriterRender(followUpId, followUpReply)
      }
    },

    updateMessageContent(messageId: string, content: string) {
      const messages = this.data.messages as AIChatMessage[]
      const nextMessages = messages.map((item) => {
        if (item.id !== messageId) {
          return item
        }
        return {
          ...item,
          content,
        }
      })
      this.setData({
        messages: nextMessages,
        scrollIntoView: messageId,
      })
    },

    // 发送用户问题并调用统一 AI 后端流式返回回复。
    async onSend() {
      if (this.data.loading) {
        return
      }

      const question = String(this.data.inputValue || '').trim()
      if (!question) {
        wx.showToast({
          title: '请输入问题',
          icon: 'none',
        })
        return
      }

      const history = (this.data.messages as AIChatMessage[])
        .filter((item) => item.role === 'user' || item.role === 'ai')
        .map((item) => ({
          role: item.role === 'ai' ? 'assistant' : 'user',
          content: item.content,
        }))
        .slice(-8)

      this.appendMessage('user', question)
      this.setData({
        inputValue: '',
        loading: true,
        scrollIntoView: 'ai-loading-anchor',
      })

      this.resetTypewriterState()
      let aiMessageId = ''
      let streamedReply = ''
      let streamDonePayload: AIChatReplyResponse | null = null
      let streamErrorPayload: AIChatReplyResponse | null = null

      try {
        await requestStream<unknown>({
          url: '/api/ai/chat',
          method: 'POST',
          data: {
            scene: String(this.data.scene || 'general'),
            question,
            history,
            conversationId: String(this.data.conversationId || '').trim(),
            stream: true,
          },
          onChunk: (payload) => {
            const event = payload as Record<string, unknown>
            const eventType = typeof event.type === 'string' ? event.type : ''
            if (!eventType) {
              return
            }

            if (eventType === 'start') {
              const nextConversationId = typeof event.conversationId === 'string' ? event.conversationId.trim() : ''
              if (nextConversationId) {
                this.setData({ conversationId: nextConversationId })
              }
              return
            }

            if (eventType === 'chunk') {
              const chunkText = typeof event.text === 'string' ? event.text : ''
              if (!chunkText) {
                return
              }
              streamedReply += chunkText
              if (!aiMessageId) {
                aiMessageId = this.appendMessage('ai', '')
              }
              this.queueTypewriterRender(aiMessageId, streamedReply)
              return
            }

            if (eventType === 'done') {
              const emotionRisk = event.emotionRisk as AIChatReplyResponse['emotionRisk']
              streamDonePayload = {
                reply: typeof event.reply === 'string' ? event.reply : streamedReply,
                conversationId: typeof event.conversationId === 'string' ? event.conversationId : '',
                model: typeof event.model === 'string' ? event.model : '',
                fallbackUsed: Boolean(event.fallbackUsed),
                fallbackReason: typeof event.fallbackReason === 'string' ? event.fallbackReason : '',
                emotionRisk,
              }
              return
            }

            if (eventType === 'error') {
              const emotionRisk = event.emotionRisk as AIChatReplyResponse['emotionRisk']
              streamErrorPayload = {
                reply: '',
                conversationId: typeof event.conversationId === 'string' ? event.conversationId : '',
                model: typeof event.model === 'string' ? event.model : '',
                fallbackUsed: Boolean(event.fallbackUsed),
                fallbackReason: typeof event.fallbackReason === 'string' ? event.fallbackReason : '',
                emotionRisk,
              }
              const errorMessage = typeof event.message === 'string' && event.message ? event.message : 'AI服务暂不可用，请稍后重试。'
              streamErrorPayload.reply = errorMessage
            }
          },
        })

        const streamErrorResponse = streamErrorPayload as AIChatReplyResponse | null
        if (streamErrorResponse) {
          const message = String(streamErrorResponse.reply || 'AI服务暂不可用，请稍后重试。')
          const payload = {
            ...streamErrorResponse,
            message,
          }
          throw new ApiRequestError(message, 503, payload)
        }

        const response: AIChatReplyResponse = streamDonePayload || {
          reply: streamedReply,
          conversationId: String(this.data.conversationId || '').trim(),
          model: 'qwen3.5',
          fallbackUsed: false,
          fallbackReason: '',
          emotionRisk: undefined,
        }

        const reply = String(response.reply || streamedReply || '').trim() || '我已收到你的问题，我们继续一起完善。'
        if (!aiMessageId) {
          aiMessageId = this.appendMessage('ai', '')
        }
        this.queueTypewriterRender(aiMessageId, reply)
        await this.waitForTypewriterDone()

        if (response.conversationId) {
          this.setData({ conversationId: String(response.conversationId) })
        }
        const readyStatus = AI_READY_STATUS_BY_SCENE[String(this.data.scene || 'general').trim() || 'general'] || AI_READY_STATUS_BY_SCENE.general
        const aiStatusText = response.fallbackUsed
          ? `已切换本地兜底（${String(response.fallbackReason || 'qwen3.5暂不可用').slice(0, 16)}）`
          : readyStatus
        this.setData({ aiStatusText })

        if (response.emotionRisk?.levelCode === 'high') {
          this.showHighRiskModal()
        }

        const studentId = getCurrentStudentId()
        if (studentId) {
          saveAiChatHistory({
            id: `ai-chat-${Date.now()}`,
            studentId,
            scene: String(this.data.scene || 'general'),
            question,
            reply,
            fallbackUsed: Boolean(response.fallbackUsed),
            fallbackReason: String(response.fallbackReason || ''),
            model: String(response.model || ''),
            createdAt: new Date().toISOString(),
          })
        }
        this.triggerEvent('reply', { question, reply }, {})
      } catch (error) {
        const apiError = error instanceof ApiRequestError ? error : null
        const riskFromError = (apiError?.payload as { emotionRisk?: AIChatReplyResponse['emotionRisk'] } | null)?.emotionRisk
        if (riskFromError?.levelCode === 'high') {
          this.showHighRiskModal()
        }
        this.setData({ aiStatusText: 'qwen3.5连接异常，请稍后重试' })
        const fallbackReply = '现在有点繁忙，但我会继续陪你。你可以先告诉我最想先解决的一件事。'
        if (aiMessageId) {
          this.queueTypewriterRender(aiMessageId, fallbackReply)
          await this.waitForTypewriterDone(2000)
        } else {
          this.appendMessage('ai', fallbackReply)
        }
        wx.showToast({
          title: 'AI服务暂不可用',
          icon: 'none',
        })
      } finally {
        this.stopTypewriter()
        this.setData({ loading: false })
      }
    },

    // 追加一条会话消息并自动滚动到底部。
    appendMessage(role: 'user' | 'ai', content: string): string {
      const nextId = `msg-${messageSeed}`
      messageSeed += 1
      const nextMessages = (this.data.messages as AIChatMessage[]).concat({
        id: nextId,
        role,
        content,
      })
      this.setData({
        messages: nextMessages,
        scrollIntoView: nextId,
      })
      return nextId
    },

    // 将会话滚动位置移动到最后一条消息。
    scrollToBottom() {
      const messages = this.data.messages as AIChatMessage[]
      const lastMessage = messages[messages.length - 1]
      if (lastMessage) {
        this.setData({
          scrollIntoView: lastMessage.id,
        })
      }
    },
  },
})
