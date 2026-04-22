const DEMO_TEACHER = {
  name: '李老师',
  password: '123456',
}

const DEFAULT_EMOTION_KEYWORD_GROUPS = [
  {
    code: 'high',
    label: '红色预警关键词',
    levelLabel: '红色预警',
    keywords: ['自杀', '自残', '结束生命', '不想活', '退学', '活不下去'],
  },
  {
    code: 'medium',
    label: '黄色预警关键词',
    levelLabel: '黄色预警',
    keywords: ['焦虑', '压力', '崩溃', '失眠', '害怕', '撑不住', '抑郁', '无人理解'],
  },
  {
    code: 'low',
    label: '蓝色观察关键词',
    levelLabel: '蓝色观察',
    keywords: ['紧张', '担心', '烦', '累', '难受', '压抑'],
  },
]

const state = {
  panel: 'dashboard',
  dashboard: null,
  monthlyReport: null,
  summaryReport: null,
  reportPeriodType: 'month',
  reportPeriodValue: '',
  reportCache: {},
  careAlerts: [],
  careAlertSummary: null,
  deadlineReminders: [],
  deadlineReminderSummary: null,
  workStudyJobs: [],
  workStudyApplications: [],
  emotionKeywordGroups: [],
  students: [],
  studentCurves: [],
  recognitions: [],
  scholarships: [],
  applications: [],
  campusMoments: [],
  announcements: [],
  recognitionRules: [],
  selectedStudent: null,
  selectedStudentCurve: null,
  selectedStudentCurveRange: 7,
  selectedStudentCurvePointId: '',
  selectedRecognition: null,
  selectedScholarship: null,
  selectedApplication: null,
  selectedWorkStudyApplication: null,
  selectedWorkStudyJob: null,
  selectedCareAlert: null,
  selectedDeadlineReminder: null,
  selectedCampusMoment: null,
  selectedAnnouncement: null,
  currentAnnouncementAttachments: [],
  currentAnnouncementCoverAttachment: null,
  currentAnnouncementCoverImage: '',
  teacherAiConversationId: '',
  teacherAiMessages: [],
  teacherAiDraft: '',
  teacherAiSending: false,
  teacherAiContextSnapshot: null,
  teacherAiQuickPrompts: [
    '帮我总结当前优先处理的老师端待办',
    '针对当前页面，给我一个工作建议清单',
    '帮我生成和学生沟通的建议话术',
    '告诉我当前这位学生最需要关注的点',
  ],
  isAuthenticated: false,
}

const titleMap = {
  dashboard: '仪表盘',
  'summary-report': 'AI报告',
  students: '学生管理',
  'student-detail': '学生详情',
  recognitions: '认定审核',
  scholarships: '奖助维护',
  applications: '奖助申请审核',
  'work-study': '勤工岗位管理',
  'care-alerts': '高关怀提醒',
  'deadline-reminders': '截止提醒',
  'campus-moments': '校园点滴审核',
  announcements: '公告维护',
}

const subtitleMap = {
  dashboard: '展示老师端整体概览和核心待办，并支持一键钻取',
  'summary-report': '生成老师端 AI 月度、季度、年度总结与关键指标报告',
  students: '查询学生当前困难认定状态、认定记录、奖助情况与心理状态摘要',
  'student-detail': '查看学生完整画像、资助记录与心理变化趋势',
  recognitions: '查看待审核认定申请，已审核记录仅支持查看',
  scholarships: '维护奖助学金说明、开放状态和认定类型限制',
  applications: '查看待审核奖助申请，已审核记录仅支持查看',
  'work-study': '维护勤工岗位并审核学生申请',
  'care-alerts': '按学生聚合预警并维护高风险情绪词',
  'deadline-reminders': '查看并处理奖助学金截止前待办提醒',
  'campus-moments': '审核学生投稿并控制校园点滴公开展示',
  announcements: '维护首页公告内容、封面与附件下载材料',
}

const categoryLabelMap = {
  national: '国家资助',
  local: '地方政府资助',
  school: '学校资助',
  social: '社会奖助学金',
}

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  const response = await fetch(path, {
    ...options,
    headers,
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || '请求失败')
  }
  return data
}

function arrayBufferToBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function bytesToSizeLabel(size) {
  const value = Number(size || 0)
  if (value < 1024) {
    return `${value}B`
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)}KB`
  }
  return `${(value / 1024 / 1024).toFixed(1)}MB`
}

function getDefaultAnnouncementCover() {
  return '/teacher/logo.png'
}

function getAnnouncementCover(coverImage) {
  return coverImage || getDefaultAnnouncementCover()
}

function toDataUrl(attachment) {
  if (!attachment || !attachment.contentBase64) {
    return ''
  }
  return `data:${attachment.type || 'application/octet-stream'};base64,${attachment.contentBase64}`
}

function getAttachmentHref(attachment) {
  if (!attachment) {
    return ''
  }
  const fileUrl = typeof attachment.fileUrl === 'string' ? attachment.fileUrl.trim() : ''
  if (fileUrl) {
    return fileUrl
  }
  return toDataUrl(attachment)
}

function getCampusMomentImageList(item) {
  const sourceList = Array.isArray(item?.imageList) ? item.imageList : []
  const list = sourceList
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)
  if (list.length > 0) {
    return list
  }
  const singleImage = String(item?.image || '').trim()
  return singleImage ? [singleImage] : []
}

function closeImagePreview() {
  const imageModal = document.getElementById('imagePreviewModal')
  if (!imageModal) {
    return
  }
  imageModal.classList.remove('show')
  imageModal.setAttribute('aria-hidden', 'true')
  const imageNode = document.getElementById('imagePreviewContent')
  if (imageNode) {
    imageNode.src = ''
  }
  if (!document.getElementById('detailModal')?.classList.contains('show')) {
    document.body.classList.remove('modal-open')
  }
}

function openImagePreview(src, title = '图片预览') {
  const previewSrc = String(src || '').trim()
  if (!previewSrc) {
    return
  }
  const imageModal = document.getElementById('imagePreviewModal')
  const imageTitle = document.getElementById('imagePreviewTitle')
  const imageNode = document.getElementById('imagePreviewContent')
  if (!imageModal || !imageTitle || !imageNode) {
    return
  }
  imageTitle.textContent = title
  imageNode.src = previewSrc
  imageModal.classList.add('show')
  imageModal.setAttribute('aria-hidden', 'false')
  document.body.classList.add('modal-open')
}

function bindImagePreviewClicks(container = document) {
  if (!container || typeof container.querySelectorAll !== 'function') {
    return
  }
  container.querySelectorAll('[data-preview-src]').forEach((node) => {
    if (node.dataset.previewBound === '1') {
      return
    }
    node.dataset.previewBound = '1'
    node.addEventListener('click', () => {
      openImagePreview(node.dataset.previewSrc, node.dataset.previewTitle || '图片预览')
    })
  })
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function safeText(value, fallback = '-') {
  const text = value === undefined || value === null || value === '' ? fallback : String(value)
  return escapeHtml(text)
}

function escapeAttribute(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeStringList(values) {
  return (Array.isArray(values) ? values : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean)
}

function formatDateText(value) {
  if (!value) {
    return '-'
  }
  return safeText(String(value).replace('T', ' ').slice(0, 16))
}

function parseDateValue(value) {
  const timestamp = Date.parse(String(value || ''))
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function formatDurationByMs(ms) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '0分钟'
  }
  const totalMinutes = Math.max(1, Math.round(ms / 60000))
  if (totalMinutes < 60) {
    return `${totalMinutes}分钟`
  }
  const totalHours = Math.floor(totalMinutes / 60)
  if (totalHours < 24) {
    return `${totalHours}小时`
  }
  const days = Math.floor(totalHours / 24)
  const remainHours = totalHours % 24
  return remainHours > 0 ? `${days}天${remainHours}小时` : `${days}天`
}

function formatElapsedSince(value) {
  const timestamp = parseDateValue(value)
  if (!timestamp) {
    return '-'
  }
  return formatDurationByMs(Date.now() - timestamp)
}

function formatElapsedBetween(startValue, endValue) {
  const start = parseDateValue(startValue)
  const end = parseDateValue(endValue)
  if (!start || !end || end < start) {
    return '-'
  }
  return formatDurationByMs(end - start)
}

function formatPercentValue(numerator, denominator) {
  const top = Number(numerator || 0)
  const bottom = Number(denominator || 0)
  if (!bottom || top <= 0) {
    return '0%'
  }
  return `${((top / bottom) * 100).toFixed(1)}%`
}

function getCareAlertChannelLabel(channel) {
  const mapping = {
    'ai-chat': 'AI树洞',
    'treehole-chat': 'AI树洞',
    treehole: '树洞记录',
    'mood-self-check': '今日情绪自评',
    'entry-self-check': '入口情绪自评',
    'assessment-self-check': '量表评估',
    'guide-enter': '引导入口',
    'manual-enter': '手动进入',
  }
  const key = String(channel || '').trim()
  if (mapping[key]) {
    return mapping[key]
  }
  if (key.startsWith('ai-chat-')) {
    const scene = key.slice('ai-chat-'.length)
    const sceneMap = {
      general: 'AI助手',
      recognition: 'AI认定助手',
      scholarship: 'AI奖助助手',
      onboarding: 'AI使用向导',
      'material-draft': 'AI材料草稿',
      emotion: 'AI树洞',
    }
    return sceneMap[scene] || 'AI助手'
  }
  return key || '未知来源'
}

function buildCareAlertRawContentList(entry) {
  const messages = Array.isArray(entry?.chatMessages) ? entry.chatMessages : []
  if (messages.length > 0) {
    return messages
      .map((message, index) => {
        const roleText = message.role === 'assistant' ? 'AI' : '学生'
        const text = String(message.content || '').trim() || '-'
        return `<div class="raw-content-item"><span class="raw-content-index">${safeText(String(index + 1))}.</span><span class="raw-content-role">${safeText(roleText)}：</span><span class="raw-content-text">${safeText(text)}</span></div>`
      })
      .join('')
  }
  const plainText = String(entry?.content || '').trim()
  if (plainText) {
    return `<div class="raw-content-item"><span class="raw-content-index">1.</span><span class="raw-content-role">学生：</span><span class="raw-content-text">${safeText(plainText)}</span></div>`
  }
  return '<div class="empty-state">暂无原话记录</div>'
}

function buildTextItemListHtml(items, emptyText = '暂无内容。') {
  const list = (Array.isArray(items) ? items : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean)
  if (list.length === 0) {
    return `<div class="empty-state">${safeText(emptyText)}</div>`
  }
  return list
    .map(
      (text) => `
        <div class="mini-card">
          <div class="stack-text">${safeText(text)}</div>
        </div>
      `,
    )
    .join('')
}

function summarizeRecognitionRules(ruleIds) {
  const selectedSet = new Set(Array.isArray(ruleIds) ? ruleIds : [])
  return state.recognitionRules.reduce(
    (acc, rule) => {
      if (!selectedSet.has(rule.id) || rule.manualScore || rule.clearOnTrue) {
        return acc
      }
      const score = Number(rule.score || 0)
      if (rule.category === 'accumulate') {
        acc.accumulateCount += 1
        acc.accumulateScore += score
      } else {
        acc.directCount += 1
        acc.directScore += score
      }
      return acc
    },
    {
      directCount: 0,
      directScore: 0,
      accumulateCount: 0,
      accumulateScore: 0,
    },
  )
}

function statusBadge(status) {
  const normalized = String(status || '未处理')
  let className = 'badge'
  if (normalized === '审核通过' || normalized === '已发布') {
    className = 'badge ok'
  } else if (normalized === '驳回' || normalized === '退回补充') {
    className = 'badge warn'
  }
  return `<span class="${className}">${safeText(normalized)}</span>`
}

function closeModal() {
  const modal = document.getElementById('detailModal')
  const dialog = modal.querySelector('.modal-dialog')
  const modalBody = document.getElementById('modalBody')
  const modalFooter = document.getElementById('modalFooter')
  modal.classList.remove('show', 'teacher-ai-modal')
  modal.setAttribute('aria-hidden', 'true')
  dialog.classList.remove('wide', 'teacher-ai-modal-dialog')
  modalBody.classList.remove('teacher-ai-modal-body')
  modalFooter.classList.remove('teacher-ai-modal-footer')
  document.getElementById('modalTitle').textContent = '详情'
  document.getElementById('modalSubtitle').textContent = ''
  modalBody.innerHTML = ''
  modalFooter.innerHTML = ''
  if (!document.getElementById('imagePreviewModal')?.classList.contains('show')) {
    document.body.classList.remove('modal-open')
  }
}

function openModal({ title, subtitle = '', body, footer = '', wide = false }) {
  const modal = document.getElementById('detailModal')
  const dialog = modal.querySelector('.modal-dialog')
  const modalBody = document.getElementById('modalBody')
  const modalFooter = document.getElementById('modalFooter')
  modal.classList.remove('teacher-ai-modal')
  dialog.classList.remove('teacher-ai-modal-dialog')
  modalBody.classList.remove('teacher-ai-modal-body')
  modalFooter.classList.remove('teacher-ai-modal-footer')
  document.getElementById('modalTitle').textContent = title
  document.getElementById('modalSubtitle').textContent = subtitle
  modalBody.innerHTML = body
  modalFooter.innerHTML = footer
  dialog.classList.toggle('wide', wide)
  modal.classList.add('show')
  modal.setAttribute('aria-hidden', 'false')
  document.body.classList.add('modal-open')
}

function buildAttachmentListHtml(attachments) {
  const list = Array.isArray(attachments) ? attachments : []
  if (list.length === 0) {
    return '<div class="empty-state">未上传附件。</div>'
  }
  return list
    .map(
      (item) => `
        <div class="mini-card">
          <div class="stack-text"><strong>${safeText(item.name)}</strong></div>
          <div class="stack-text">大小：${safeText(item.sizeLabel || '-', '-')}</div>
          <div class="stack-text"><a href="${escapeAttribute(getAttachmentHref(item))}" download="${escapeAttribute(item.name)}">下载附件</a></div>
        </div>
      `,
    )
    .join('')
}

function getStudentById(studentId) {
  return state.students.find((item) => item.id === studentId) || null
}

function getScholarshipById(scholarshipId) {
  return state.scholarships.find((item) => item.id === scholarshipId) || null
}

function getStudentRecognitions(studentId) {
  return state.recognitions.filter((item) => item.studentId === studentId)
}

function getStudentApplications(studentId) {
  return state.applications.filter((item) => item.studentId === studentId)
}

function getStudentCurve(studentId) {
  return state.studentCurves.find((item) => item.studentId === studentId) || null
}

function getStudentLatestPsychologySummary(studentId) {
  const curve = getStudentCurve(studentId)
  if (!curve) {
    return {
      levelText: '暂无记录',
      trendText: '待观察',
      latestTheme: '暂无心理事件数据',
      latestTimeText: '-',
    }
  }
  return {
    levelText: levelCodeToText(curve.latestLevelCode),
    trendText: String(curve.levelChange?.text || '风险稳定'),
    latestTheme: String(curve.latestThemes?.[0] || curve.latestSummaryHint || '已记录情绪事件'),
    latestTimeText: formatDateText(curve.latestEventAt),
  }
}

function getStudentCurveRangeDays(range) {
  if (Number(range) === 30) {
    return 30
  }
  if (Number(range) === 90) {
    return 90
  }
  return 7
}

function filterCurvePointsByRange(points, range) {
  const list = Array.isArray(points) ? points : []
  if (list.length === 0) {
    return []
  }
  const rangeDays = getStudentCurveRangeDays(range)
  const lastPoint = list[list.length - 1]
  const latestPointTime = parseDateValue(lastPoint?.latestEventAt || lastPoint?.createdAt || lastPoint?.label)
  const referenceTime = Math.max(Date.now(), latestPointTime || 0)
  if (!referenceTime) {
    return list.slice(-rangeDays)
  }
  const startTime = referenceTime - (rangeDays - 1) * 24 * 60 * 60 * 1000
  return list.filter((point) => {
    const pointTime = parseDateValue(point?.dateKey || point?.latestEventAt || point?.createdAt || point?.label)
    return pointTime >= startTime && pointTime <= referenceTime
  })
}

function buildStudentCurveEventListHtml(point) {
  const events = Array.isArray(point?.events) ? point.events : []
  if (events.length === 0) {
    return '<div class="empty-state">当天暂无可展示的事件明细。</div>'
  }
  return events
    .slice()
    .sort((a, b) => parseDateValue(a.createdAt) - parseDateValue(b.createdAt))
    .map((event) => {
      const tagHtml = normalizeStringList(event.themeTags)
        .slice(0, 4)
        .map((tag) => `<span class="badge">${safeText(tag)}</span>`)
        .join('')
      return `
        <div class="mini-card student-curve-event-card ${event.levelCode === 'high' ? 'warn' : event.levelCode === 'medium' ? 'mid' : 'ok'}">
          <div class="stack-text"><strong>${safeText(formatDateText(event.createdAt))}</strong> · ${safeText(getCareAlertChannelLabel(event.channel))}</div>
          <div class="stack-text">风险等级：${safeText(levelCodeToText(event.levelCode))} · 心情分 ${safeText(event.moodScore ?? event.curveScore, '0')}</div>
          <div class="stack-text">事件摘要：${safeText(event.summaryHint || '已记录情绪事件')}</div>
          <div class="chip-row">${tagHtml || '<span class="subtext">暂无主题标签</span>'}</div>
        </div>
      `
    })
    .join('')
}

function getRecognitionActionLabel(record) {
  return record.reviewStatus === '待审核' ? '审核' : '查看'
}

function getApplicationActionLabel(record) {
  return record.status === '待审核' ? '审核' : '查看'
}

function getCampusMomentActionLabel(record) {
  return record.status === '待审核' ? '审核' : '查看'
}

function getWorkStudyActionLabel(record) {
  return record.status === '待审核' ? '审核' : '查看'
}

function getCareAlertActionLabel(record) {
  return record.status === '已处理' ? '查看' : '处理'
}

function isRecognitionReadonly(record) {
  return record.reviewStatus !== '待审核'
}

function isApplicationReadonly(record) {
  return record.status !== '待审核'
}

function isCampusMomentReadonly(record) {
  return record.status !== '待审核'
}

function isWorkStudyReadonly(record) {
  return record.status !== '待审核'
}

function isCareAlertReadonly(record) {
  return record.status === '已处理'
}

function getCareAlertLevelMeta(levelCode) {
  if (levelCode === 'high') {
    return { label: '红色预警', className: 'badge warn' }
  }
  if (levelCode === 'medium') {
    return { label: '黄色预警', className: 'badge' }
  }
  return { label: '蓝色观察', className: 'badge ok' }
}

function getCareAlertLevelBadge(item) {
  const meta = getCareAlertLevelMeta(item.levelCode)
  const score = Number(item.sentimentScore || 0)
  return `<span class="${meta.className}">${safeText(meta.label)} · ${safeText(score, '0')}</span>`
}

function getPsychologyLevelBadge(levelCode) {
  const meta = getCareAlertLevelMeta(levelCode)
  return `<span class="${meta.className}">${safeText(meta.label)}</span>`
}

function getCareAlertStatusBadge(status) {
  const normalized = String(status || '可观察')
  if (normalized === '已处理') {
    return `<span class="badge ok">${safeText(normalized)}</span>`
  }
  if (normalized === '待关注') {
    return `<span class="badge warn">${safeText(normalized)}</span>`
  }
  return `<span class="badge">${safeText(normalized)}</span>`
}

function getRecognitionFilterLevel(record) {
  if (record.reviewStatus === '审核通过' && record.finalLevel) {
    return record.finalLevel
  }
  return record.systemLevel || '未认定'
}

function getRecognitionCollegeKey(record) {
  return record.profile?.collegeKey || ''
}

function getApplicationCategory(item) {
  return getScholarshipById(item.scholarshipId)?.category || ''
}

function getCategoryLabel(categoryKey) {
  return categoryLabelMap[categoryKey] || categoryKey || '未分类'
}

function getChartBarClass(tone) {
  if (tone === 'ok') {
    return 'chart-bar-fill ok'
  }
  if (tone === 'warn') {
    return 'chart-bar-fill warn'
  }
  return 'chart-bar-fill'
}

function buildChartCard(title, items) {
  const maxValue = Math.max(...items.map((item) => Number(item.value || 0)), 1)
  const rows = items
    .map((item) => {
      const value = Number(item.value || 0)
      const width = value > 0 ? Math.max(8, Math.round((value / maxValue) * 100)) : 0
      return `
        <div class="chart-item">
          <span class="chart-label">${safeText(item.label)}</span>
          <div class="chart-bar-track">
            <div class="${getChartBarClass(item.tone)}" style="width: ${width}%"></div>
          </div>
          <span class="chart-value">${safeText(value, '0')}</span>
        </div>
      `
    })
    .join('')
  return `
    <div class="chart-card">
      <h3>${safeText(title)}</h3>
      <div class="chart-list">${rows}</div>
    </div>
  `
}

function buildDashboardInsightCard(title, rows, footerText = '') {
  const list = (Array.isArray(rows) ? rows : []).slice(0, 8)
  const body = list.length
    ? list
        .map(
          (item) => `
            <div class="metric-row">
              <span>${safeText(item.label)}</span>
              <strong>${safeText(item.value, '0')}</strong>
            </div>
          `,
        )
        .join('')
    : '<div class="empty-state">暂无可展示数据。</div>'

  return `
    <div class="summary-card">
      <h3>${safeText(title)}</h3>
      <div class="metric-list">${body}</div>
      ${footerText ? `<div class="subtext">${safeText(footerText)}</div>` : ''}
    </div>
  `
}

function toPlainText(value, fallback = '-') {
  if (value === undefined || value === null || value === '') {
    return fallback
  }
  return String(value)
}

function sanitizeDownloadFileName(value, fallback = 'report') {
  return String(value || fallback)
    .trim()
    .replace(/[\\/:*?"<>|\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || fallback
}

function mapSummaryMetricRows(metricMap, config) {
  return config.map((item) => `${item.label}：${formatMetricValue(metricMap?.[item.key], item.fallback || '0')}`)
}

function buildSummaryReportDownloadContent(report) {
  if (!report) {
    return ''
  }

  const overview = report.overviewMetrics || {}
  const summaryText = report.summaryText || {}
  const insights = report.insights || {}
  const groups = report.dimensionGroups || {}
  const groupConfigMap = {
    engagement: {
      title: '参与与触达',
      metrics: [
        { key: 'aiConversationCount', label: 'AI会话总数' },
        { key: 'emotionConversationCount', label: 'AI树洞会话' },
        { key: 'emotionMessageCount', label: '情绪消息总数' },
        { key: 'policyViewCount', label: '政策浏览次数' },
        { key: 'shareCardCount', label: '分享卡片次数' },
        { key: 'handledDeadlineCount', label: '已处理截止提醒' },
      ],
    },
    psychology: {
      title: '心理与风险',
      metrics: [
        { key: 'totalAlerts', label: '预警总数' },
        { key: 'highAlerts', label: '红色预警' },
        { key: 'mediumAlerts', label: '黄色预警' },
        { key: 'lowAlerts', label: '蓝色观察' },
        { key: 'handleRate', label: '处理率', fallback: '0%' },
        { key: 'averageHandleHours', label: '平均处理时长(小时)' },
      ],
    },
    funding: {
      title: '资助业务',
      metrics: [
        { key: 'recognitionSubmitCount', label: '认定申请数' },
        { key: 'recognitionPassRate', label: '认定通过率', fallback: '0%' },
        { key: 'scholarshipApplyCount', label: '奖助申请数' },
        { key: 'scholarshipApproveRate', label: '奖助通过率', fallback: '0%' },
        { key: 'clickToApplyRate', label: '浏览转申请率', fallback: '0%' },
        { key: 'averageStayText', label: '平均停留时长', fallback: '0分钟' },
      ],
    },
    growth: {
      title: '成长与发展',
      metrics: [
        { key: 'growthEventCount', label: '成长事件数' },
        { key: 'growthPointsAdded', label: '新增积分' },
        { key: 'growthFlowerDelta', label: '新增花朵' },
        { key: 'growthFruitDelta', label: '新增果实' },
        { key: 'workStudyApprovedCount', label: '勤工通过数' },
        { key: 'campusMomentPublishedCount', label: '校园点滴发布数' },
      ],
    },
    action: {
      title: '行动与跟进',
      metrics: [
        { key: 'pendingOutreachCount', label: '待宣讲学生' },
        { key: 'pendingDeadlineCount', label: '待处理截止提醒' },
        { key: 'highRiskStudentCount', label: '高风险重点学生' },
        { key: 'difficultStudentCount', label: '重点困难学生' },
      ],
    },
  }

  const lines = [
    `# ${toPlainText(report.periodLabel, 'AI周期报告')}`,
    '',
    `- 统计区间：${toPlainText(formatDateText(report.startAt))} 至 ${toPlainText(formatDateText(report.endAt))}`,
    `- 生成时间：${toPlainText(formatDateText(report.generatedAt))}`,
    '',
    '## 核心概览',
    `- AI会话总数：${formatMetricValue(overview.aiConversationCount)}`,
    `- 情绪预警总数：${formatMetricValue(overview.totalAlerts)}`,
    `- 红色预警：${formatMetricValue(overview.highAlerts)}`,
    `- 政策浏览次数：${formatMetricValue(overview.policyViewCount)}`,
    `- 奖助申请数：${formatMetricValue(overview.applicationCount)}`,
    `- 成长事件数：${formatMetricValue(overview.growthEventCount)}`,
    '',
    '## AI总结',
    `- 总体判断：${toPlainText(summaryText.overall || insights.positive, '暂无总结')}`,
    `- 重点风险：${toPlainText(summaryText.risk || insights.focus, '暂无重点风险')}`,
    `- 下阶段建议：${toPlainText(summaryText.nextSteps || insights.action, '暂无建议')}`,
  ]

  ;['engagement', 'psychology', 'funding', 'growth', 'action'].forEach((key) => {
    const config = groupConfigMap[key]
    const group = groups[key]
    if (!config || !group) {
      return
    }
    lines.push('', `## ${config.title}`)
    mapSummaryMetricRows(group.metrics || {}, config.metrics).forEach((item) => {
      lines.push(`- ${item}`)
    })
  })

  const highRiskStudents = Array.isArray(report.topLists?.highRiskStudents) ? report.topLists.highRiskStudents : []
  lines.push('', '## 高风险重点学生')
  if (highRiskStudents.length === 0) {
    lines.push('- 暂无可展示记录')
  } else {
    highRiskStudents.slice(0, 6).forEach((item) => {
      lines.push(
        `- ${toPlainText(item.studentName)}｜${toPlainText(item.college)}｜${toPlainText(item.eventCount, '0')}条事件｜待关注${toPlainText(item.pendingCount, '0')}条`,
      )
    })
  }

  const pendingOutreachStudents = Array.isArray(report.topLists?.pendingOutreachStudents) ? report.topLists.pendingOutreachStudents : []
  lines.push('', '## 待宣讲重点学生')
  if (pendingOutreachStudents.length === 0) {
    lines.push('- 暂无可展示记录')
  } else {
    pendingOutreachStudents.slice(0, 6).forEach((item) => {
      lines.push(`- ${toPlainText(item.studentName)}｜${toPlainText(item.college)}｜${toPlainText(item.recommendation, '建议线下宣讲')}`)
    })
  }

  const topSignals = Array.isArray(report.topLists?.topSignals) ? report.topLists.topSignals : []
  lines.push('', '## 高频AI信号')
  if (topSignals.length === 0) {
    lines.push('- 暂无可展示记录')
  } else {
    topSignals.slice(0, 6).forEach((item) => {
      lines.push(`- ${toPlainText(item.label)}：${formatMetricValue(item.count)}`)
    })
  }

  const actionSuggestions = Array.isArray(report.actionSuggestions) ? report.actionSuggestions : []
  lines.push('', '## 建议动作清单')
  if (actionSuggestions.length === 0) {
    lines.push('- 暂无建议')
  } else {
    actionSuggestions.forEach((item, index) => {
      lines.push(`- 建议${index + 1}：${toPlainText(item)}`)
    })
  }

  return lines.join('\n')
}

function downloadSummaryReport(report) {
  if (!report) {
    throw new Error('暂无可下载的报告内容')
  }
  const content = buildSummaryReportDownloadContent(report)
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(report.periodLabel || '老师端AI报告')}</title><style>body{font-family:"Microsoft YaHei",sans-serif;line-height:1.7;color:#1f2937;padding:32px;} h1,h2{color:#111827;} pre{white-space:pre-wrap;font-family:"Microsoft YaHei",sans-serif;}</style></head><body><pre>${escapeHtml(content)}</pre></body></html>`
  const periodLabel = sanitizeDownloadFileName(report.periodLabel || `${state.reportPeriodType}-${state.reportPeriodValue}`)
  const generatedAt = sanitizeDownloadFileName(String(report.generatedAt || '').replace('T', ' ').slice(0, 16), 'generated')
  const fileName = `老师端AI报告-${periodLabel}-${generatedAt}.doc`
  const blob = new Blob([html], { type: 'application/msword;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function levelCodeToText(levelCode) {
  if (levelCode === 'high') {
    return '红色预警'
  }
  if (levelCode === 'medium') {
    return '黄色预警'
  }
  return '蓝色观察'
}

function getInsightListByCount(list, maxCount = 6) {
  return (Array.isArray(list) ? list : [])
    .slice()
    .sort((a, b) => Number(b.count || 0) - Number(a.count || 0))
    .slice(0, maxCount)
}

function renderOutreachStudentRows(students) {
  const list = Array.isArray(students) ? students : []
  if (list.length === 0) {
    return '<div class="empty-state">当前暂无需线下宣讲的重点学生。</div>'
  }
  return list
    .slice(0, 6)
    .map(
      (item) => `
        <div class="metric-row">
          <span>${safeText(item.studentName || '-')} · ${safeText(item.college || '-')} · ${safeText(item.grade || '-')}</span>
          <strong>${safeText(item.recommendation || '建议线下跟进')}</strong>
        </div>
      `,
    )
    .join('')
}

function renderDashboardInsights() {
  const insightsTarget = document.getElementById('dashboardInsights')
  if (!insightsTarget) {
    return
  }

  const scholarshipAnalytics = state.dashboard?.scholarshipAnalytics || {}
  const psychologyTrend = state.dashboard?.psychologyTrend || {}
  const scholarshipMetrics = scholarshipAnalytics.metrics || {}
  const scholarshipDistributions = scholarshipAnalytics.distributions || {}
  const topScholarships = Array.isArray(scholarshipAnalytics.topScholarships) ? scholarshipAnalytics.topScholarships : []
  const riskTrend = Array.isArray(psychologyTrend.riskTrend) ? psychologyTrend.riskTrend : []
  const markerTrend = Array.isArray(psychologyTrend.markerTrend) ? psychologyTrend.markerTrend : []
  const latestAssessments = Array.isArray(psychologyTrend.latestAssessments) ? psychologyTrend.latestAssessments : []
  const latestMarkers = Array.isArray(psychologyTrend.latestMarkers) ? psychologyTrend.latestMarkers : []

  const gradeRows = getInsightListByCount(scholarshipDistributions.byGrade).map((item) => ({
    label: item.label || '未填写年级',
    value: Number(item.count || 0),
  }))
  const majorRows = getInsightListByCount(scholarshipDistributions.byMajor).map((item) => ({
    label: item.label || '未填写专业',
    value: Number(item.count || 0),
  }))
  const genderRows = getInsightListByCount(scholarshipDistributions.byGender, 4).map((item) => ({
    label: item.label || '未填写',
    value: Number(item.count || 0),
  }))
  const recognitionRows = getInsightListByCount(scholarshipDistributions.byRecognitionLevel, 5).map((item) => ({
    label: item.label || '未认定',
    value: Number(item.count || 0),
  }))

  const topScholarshipRows = topScholarships.slice(0, 5).map((item) => ({
    label: item.name || '未命名项目',
    value: `${safeText(item.applicantCount, '0')} / ${safeText(item.viewCount, '0')} (${safeText(item.clickToApplyRate, '0%')})`,
  }))

  const latestRiskRows = riskTrend
    .slice(-5)
    .reverse()
    .map((item) => ({
      label: item.label || '-',
      value: `高${safeText(item.high, '0')} 中${safeText(item.medium, '0')} 低${safeText(item.low, '0')}`,
    }))

  const latestMarkerRows = latestMarkers.slice(0, 5).map((item) => ({
    label: `${item.studentName || '-'} · ${getCareAlertChannelLabel(item.channel)}`,
    value: `${levelCodeToText(item.levelCode)} · ${safeText(item.summaryHint || '已记录情绪信号')}`,
  }))

  const latestMarkerTrendRows = markerTrend
    .slice(-5)
    .reverse()
    .map((item) => ({
      label: item.label || '-',
      value: `AI${safeText(item.chat, '0')} · 量表${safeText(item.assessment, '0')} · 自评${safeText(item.mood, '0')} · 入口${safeText(item.entry, '0')}`,
    }))

  const latestAssessmentRows = latestAssessments.slice(0, 5).map((item) => ({
    label: `${item.studentName || '-'} · ${item.scaleName || '-'}`,
    value: `${safeText(item.standardScore, '0')}分 · ${levelCodeToText(item.levelCode)}`,
  }))

  const insightCards = [
    buildDashboardInsightCard(
      '奖助触达漏斗',
      [
        { label: '政策浏览总次数', value: Number(scholarshipMetrics.policyViewCount || 0) },
        { label: '浏览学生人数', value: Number(scholarshipMetrics.uniqueViewerCount || 0) },
        { label: '申请总次数', value: Number(scholarshipMetrics.applicationCount || 0) },
        { label: '申请学生人数', value: Number(scholarshipMetrics.uniqueApplicantCount || 0) },
        { label: '点击转申请率', value: scholarshipMetrics.clickToApplyRate || '0%' },
        { label: '平均停留时长', value: scholarshipMetrics.averageStayText || '0分钟' },
      ],
      `已认定学生浏览/申请：${safeText(scholarshipMetrics.activeViewedCount, '0')} / ${safeText(scholarshipMetrics.activeAppliedCount, '0')}`,
    ),
    buildDashboardInsightCard('奖助申请年级分布', gradeRows),
    buildDashboardInsightCard('奖助申请专业分布', majorRows),
    buildDashboardInsightCard('奖助申请性别分布', genderRows),
    buildDashboardInsightCard('奖助申请认定等级分布', recognitionRows),
    buildDashboardInsightCard('项目转化Top5（申请/浏览）', topScholarshipRows),
    buildDashboardInsightCard(
      '心理风险近5日趋势',
      latestRiskRows,
      `累计情绪事件：${safeText(psychologyTrend.metrics?.totalEmotionEvents, '0')} 条`,
    ),
    buildDashboardInsightCard('心理事件来源近5日（AI对话/情绪自评/量表）', latestMarkerTrendRows),
    buildDashboardInsightCard('最近心理事件（含AI对话+情绪自评+量表）', latestMarkerRows),
    buildDashboardInsightCard('最新量表评估记录', latestAssessmentRows),
  ]

  insightsTarget.innerHTML = insightCards.join('')
}

function buildOptionList(items, defaultLabel, currentValue) {
  return [`<option value="">${escapeHtml(defaultLabel)}</option>`]
    .concat(
      items.map(
        (item) =>
          `<option value="${safeText(item.value, '')}" ${item.value === currentValue ? 'selected' : ''}>${safeText(item.label)}</option>`,
      ),
    )
    .join('')
}

function setSelectOptions(selectId, items, defaultLabel) {
  const select = document.getElementById(selectId)
  const currentValue = select.value
  select.innerHTML = buildOptionList(items, defaultLabel, currentValue)
  if (items.some((item) => item.value === currentValue)) {
    select.value = currentValue
  }
}

function getTeacherAiPanelLabel(panel) {
  const panelMap = {
    dashboard: '仪表盘',
    'summary-report': 'AI报告',
    students: '学生管理',
    'student-detail': '学生详情',
    recognitions: '认定审核',
    scholarships: '奖助维护',
    applications: '奖助申请审核',
    'work-study': '勤工岗位管理',
    'care-alerts': '高关怀提醒',
    'deadline-reminders': '截止提醒',
    'campus-moments': '校园点滴审核',
    announcements: '公告维护',
  }
  return panelMap[String(panel || '').trim()] || '老师端'
}

function getTeacherAiQuickPrompts() {
  if (state.panel === 'student-detail' && state.selectedStudent) {
    return [
      `帮我总结${state.selectedStudent.name}当前最需要关注的情况`,
      `给我一份和${state.selectedStudent.name}谈话时的提纲`,
      `针对${state.selectedStudent.name}，下一步跟进建议是什么`,
      `如何向家长说明${state.selectedStudent.name}当前需要关注的问题`,
    ]
  }

  if (state.panel === 'recognitions' && state.selectedRecognition) {
    return [
      `这条认定记录当前最该核查什么`,
      `帮我总结这条认定申请的审核关注点`,
      `如果要退回补充，建议怎么和学生说明`,
      `这条认定记录可能存在哪些风险或材料缺口`,
    ]
  }

  if (state.panel === 'care-alerts' && state.selectedCareAlert) {
    return [
      `帮我判断这条高关怀提醒的优先级`,
      `针对当前高关怀学生，建议怎么跟进`,
      `给我一段适合老师联系学生的沟通话术`,
      `这条提醒需要联动哪些老师或部门`,
    ]
  }

  if (state.panel === 'applications' && state.selectedApplication) {
    return [
      `帮我总结这条奖助申请的审核关注点`,
      `这条申请优先核查哪些材料`,
      `如果需要退回补充，怎么和学生说更清楚`,
      `这条申请可能有哪些风险点`,
    ]
  }

  if (state.panel === 'summary-report') {
    return [
      '结合当前报告，帮我总结最优先处理的事项',
      '基于这份报告，给我一份老师行动建议清单',
      '当前报告里最值得老师重点关注的风险是什么',
      '帮我把这份报告转成简明工作汇报',
    ]
  }

  if (state.panel === 'dashboard') {
    return [
      '帮我总结当前优先处理的老师端待办',
      '基于仪表盘数据，告诉我今天先做什么',
      '给我一份待办优先级排序建议',
      '帮我生成一段老师工作安排建议',
    ]
  }

  return [
    '针对当前页面，给我一个工作建议清单',
    '帮我生成和学生沟通的建议话术',
    '告诉我这页最需要关注的点',
    '如果我是辅导员，下一步该怎么做',
  ]
}

function buildTeacherAiContext() {
  return {
    role: 'teacher',
    teacherName: DEMO_TEACHER.name,
    activePanel: state.panel,
    activePanelLabel: getTeacherAiPanelLabel(state.panel),
    dashboard: state.dashboard
      ? {
          pendingRecognitions: Number(state.dashboard.pendingRecognitions || 0),
          pendingScholarshipApplications: Number(state.dashboard.pendingScholarshipApplications || 0),
          pendingWorkStudyApplications: Number(state.dashboard.pendingWorkStudyApplications || 0),
          pendingCareAlerts: Number(state.dashboard.pendingCareAlerts || 0),
          highRiskStudentCount: Number(state.dashboard.highRiskStudentCount || 0),
          pendingDeadlineReminders: Number(state.dashboard.pendingDeadlineReminders || 0),
        }
      : null,
    currentSummaryReport: state.summaryReport
      ? {
          periodLabel: state.summaryReport.periodLabel,
          overviewMetrics: state.summaryReport.overviewMetrics,
          summaryText: state.summaryReport.summaryText,
        }
      : null,
    selectedStudent: state.selectedStudent
      ? {
          id: state.selectedStudent.id,
          name: state.selectedStudent.name,
          studentNo: state.selectedStudent.studentNo,
          college: state.selectedStudent.college,
          grade: state.selectedStudent.grade,
          className: state.selectedStudent.className,
          currentRecognitionLevel: state.selectedStudent.currentRecognitionLevel,
          currentRecognitionStatus: state.selectedStudent.currentRecognitionStatus,
        }
      : null,
    selectedRecognition: state.selectedRecognition
      ? {
          id: state.selectedRecognition.id,
          studentName: state.selectedRecognition.profile?.name,
          college: state.selectedRecognition.profile?.college,
          status: state.selectedRecognition.reviewStatus,
          level: state.selectedRecognition.finalLevel || state.selectedRecognition.recommendedLevel,
        }
      : null,
    selectedApplication: state.selectedApplication
      ? {
          id: state.selectedApplication.id,
          studentName: state.selectedApplication.studentName,
          scholarshipName: state.selectedApplication.scholarshipName,
          status: state.selectedApplication.status,
        }
      : null,
    selectedCareAlert: state.selectedCareAlert
      ? {
          id: state.selectedCareAlert.id,
          studentName: state.selectedCareAlert.studentName,
          college: state.selectedCareAlert.college,
          levelCode: state.selectedCareAlert.levelCode,
          pendingCount: state.selectedCareAlert.pendingCount,
          latestCreatedAt: state.selectedCareAlert.latestCreatedAt,
          suggestion: state.selectedCareAlert.suggestion,
        }
      : null,
    selectedDeadlineReminder: state.selectedDeadlineReminder
      ? {
          id: state.selectedDeadlineReminder.id,
          studentName: state.selectedDeadlineReminder.studentName,
          scholarshipName: state.selectedDeadlineReminder.scholarshipName,
          status: state.selectedDeadlineReminder.status,
          deadline: state.selectedDeadlineReminder.deadline,
        }
      : null,
  }
}

function getTeacherAiHistoryPayload() {
  return state.teacherAiMessages
    .filter((item) => item && item.role !== 'system')
    .map((item) => ({ role: item.role, content: item.content || '' }))
    .filter((item) => item.content.trim())
    .slice(-8)
}

function buildTeacherAiMessageHtml(message) {
  const role = message.role === 'user' ? 'user' : 'assistant'
  const label = role === 'user' ? '老师' : 'AI老师助手'
  const extra = []
  if (message.pending) {
    extra.push('生成中')
  }
  if (message.fallbackUsed) {
    extra.push('本地兜底')
  }
  return `
    <div class="teacher-ai-message ${role} ${message.pending ? 'typing' : ''} ${message.emptyState ? 'empty-state' : ''}">
      <div class="teacher-ai-message-meta">
        <strong>${safeText(label)}</strong>
        <span>${safeText(extra.join(' · ') || '已完成', '')}</span>
      </div>
      <div class="teacher-ai-message-bubble">${safeText(message.content || '')}${message.pending ? '<span class="teacher-ai-caret"></span>' : ''}</div>
    </div>
  `
}

function renderTeacherAiMessages() {
  const target = document.getElementById('teacherAiMessageList')
  if (!target) {
    return
  }
  const isEmptyState = state.teacherAiMessages.length === 0
  const list = isEmptyState
    ? [{ role: 'assistant', content: '你好，我是老师端 AI 小助手。你可以问我当前待办优先级、学生跟进建议、审核关注点或沟通话术。', emptyState: true }]
    : state.teacherAiMessages
  target.innerHTML = list.map((item) => buildTeacherAiMessageHtml(item)).join('')
  target.classList.toggle('empty', isEmptyState)
  target.scrollTop = target.scrollHeight
}

function renderTeacherAiQuickPrompts() {
  const target = document.getElementById('teacherAiQuickPrompts')
  if (!target) {
    return
  }
  state.teacherAiQuickPrompts = getTeacherAiQuickPrompts()
  target.innerHTML = state.teacherAiQuickPrompts
    .map(
      (prompt) => `<button class="inline-btn teacher-ai-quick-btn" data-teacher-ai-prompt="${escapeAttribute(prompt)}" type="button">${safeText(prompt)}</button>`,
    )
    .join('')
}

function renderTeacherAiModal() {
  const context = buildTeacherAiContext()
  state.teacherAiContextSnapshot = context
  openModal({
    title: 'AI老师助手',
    subtitle: `${context.activePanelLabel} · 结合当前老师端页面上下文提供建议`,
    wide: true,
    body: `
      <div class="teacher-ai-shell">
        <div class="teacher-ai-toolbar">
          <div class="subtext">可提问：待办排序、学生跟进、审核关注点、沟通建议。</div>
          <div class="teacher-ai-toolbar-actions">
            <button id="teacherAiResetBtn" class="inline-btn" type="button">新建对话</button>
          </div>
        </div>
        <div class="teacher-ai-quick-section">
          <div id="teacherAiQuickPrompts" class="chip-row teacher-ai-quick-row"></div>
        </div>
        <div id="teacherAiMessageList" class="teacher-ai-message-list"></div>
      </div>
    `,
    footer: `
      <div class="teacher-ai-footer">
        <textarea id="teacherAiInput" placeholder="请输入你想咨询的问题，例如：帮我判断当前最该优先处理哪些学生工作。">${escapeHtml(state.teacherAiDraft || '')}</textarea>
        <div class="teacher-ai-footer-actions">
          <button id="closeModalAction" class="inline-btn" type="button">关闭</button>
          <button id="teacherAiSendBtn" class="primary" type="button">发送</button>
        </div>
      </div>
    `,
  })
  const modal = document.getElementById('detailModal')
  modal.classList.add('teacher-ai-modal')
  modal.querySelector('.modal-dialog').classList.add('teacher-ai-modal-dialog')
  document.getElementById('modalBody').classList.add('teacher-ai-modal-body')
  document.getElementById('modalFooter').classList.add('teacher-ai-modal-footer')
  renderTeacherAiQuickPrompts()
  renderTeacherAiMessages()
  document.getElementById('closeModalAction').addEventListener('click', closeModal)
  document.getElementById('teacherAiResetBtn').addEventListener('click', () => {
    state.teacherAiConversationId = ''
    state.teacherAiMessages = []
    state.teacherAiDraft = ''
    renderTeacherAiModal()
  })
  const quickPrompts = document.getElementById('teacherAiQuickPrompts')
  quickPrompts?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-teacher-ai-prompt]')
    if (!button) {
      return
    }
    const prompt = String(button.getAttribute('data-teacher-ai-prompt') || '').trim()
    const input = document.getElementById('teacherAiInput')
    state.teacherAiDraft = prompt
    if (input) {
      input.value = prompt
      input.focus()
      input.setSelectionRange(prompt.length, prompt.length)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
  })
  document.getElementById('teacherAiInput').addEventListener('input', (event) => {
    state.teacherAiDraft = event.target.value
  })
  document.getElementById('teacherAiInput').addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      submitTeacherAiMessage().catch((error) => alert(error.message || '发送失败'))
    }
  })
  document.getElementById('teacherAiSendBtn').addEventListener('click', () => {
    submitTeacherAiMessage().catch((error) => alert(error.message || '发送失败'))
  })
}

async function streamTeacherAiReply(payload, onEvent) {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || 'AI请求失败')
  }
  if (!response.body) {
    throw new Error('浏览器不支持流式响应')
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }
    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() || ''
    blocks.forEach((block) => {
      const line = block
        .split(/\r?\n/)
        .find((entry) => entry.trim().startsWith('data:'))
      if (!line) {
        return
      }
      const payloadText = line.trim().slice(5).trim()
      if (!payloadText) {
        return
      }
      let event
      try {
        event = JSON.parse(payloadText)
      } catch (_error) {
        return
      }
      onEvent(event)
    })
  }
}

async function submitTeacherAiMessage() {
  if (state.teacherAiSending) {
    return
  }
  const input = document.getElementById('teacherAiInput')
  const question = String(input?.value || state.teacherAiDraft || '').trim()
  if (!question) {
    alert('请输入问题')
    return
  }
  state.teacherAiDraft = ''
  if (input) {
    input.value = ''
  }
  const context = buildTeacherAiContext()
  state.teacherAiContextSnapshot = context
  const history = getTeacherAiHistoryPayload()
  state.teacherAiSending = true
  const userMessage = { role: 'user', content: question }
  const assistantMessage = { role: 'assistant', content: '', pending: true, fallbackUsed: false }
  state.teacherAiMessages = state.teacherAiMessages.concat(userMessage, assistantMessage)
  renderTeacherAiMessages()
  try {
    await streamTeacherAiReply(
      {
        scene: 'teacher-assistant',
        question,
        history,
        conversationId: state.teacherAiConversationId,
        stream: true,
        context,
      },
      (event) => {
        if (event.type === 'start' && event.conversationId) {
          state.teacherAiConversationId = event.conversationId
        }
        if (event.type === 'chunk') {
          assistantMessage.content += String(event.text || '')
          renderTeacherAiMessages()
        }
        if (event.type === 'done') {
          assistantMessage.pending = false
          assistantMessage.content = String(event.reply || assistantMessage.content || '').trim()
          assistantMessage.fallbackUsed = Boolean(event.fallbackUsed)
          renderTeacherAiMessages()
        }
        if (event.type === 'error') {
          assistantMessage.pending = false
          assistantMessage.content = String(event.message || 'AI服务暂不可用，请稍后再试。')
          assistantMessage.fallbackUsed = Boolean(event.fallbackUsed)
          renderTeacherAiMessages()
        }
      },
    )
  } catch (error) {
    assistantMessage.pending = false
    assistantMessage.content = error.message || 'AI服务暂不可用，请稍后再试。'
    renderTeacherAiMessages()
  } finally {
    state.teacherAiSending = false
  }
}


function setActivePanel(panel) {
  state.panel = panel
  state.teacherAiQuickPrompts = getTeacherAiQuickPrompts()
  document.querySelectorAll('.nav-btn').forEach((button) => {
    const activePanel = panel === 'student-detail' ? 'students' : panel
    button.classList.toggle('active', button.dataset.panel === activePanel)
  })
  document.querySelectorAll('.panel').forEach((item) => {
    item.classList.toggle('active', item.id === panel)
  })
  document.getElementById('panelTitle').textContent = titleMap[panel] || '老师端'
  document.getElementById('panelSubtitle').textContent = subtitleMap[panel] || '本地 Mock 数据联动演示环境'
  closeModal()
}

function setTeacherAuth(authenticated) {
  state.isAuthenticated = authenticated
  document.getElementById('teacherLoginShell').classList.toggle('hidden', authenticated)
  document.getElementById('teacherAppShell').classList.toggle('hidden', !authenticated)
}

function handleTeacherLogin() {
  const teacherName = document.getElementById('teacherName').value.trim()
  const teacherPassword = document.getElementById('teacherPassword').value.trim()
  if (teacherName !== DEMO_TEACHER.name || teacherPassword !== DEMO_TEACHER.password) {
    alert('姓名或密码不正确')
    return
  }
  loadAll()
    .then(() => {
      setTeacherAuth(true)
    })
    .catch((error) => {
      setTeacherAuth(false)
      alert(error.message || '老师端初始化失败，请先启动 Mock API')
    })
}

function handleTeacherLogout() {
  setTeacherAuth(false)
  document.getElementById('teacherPassword').value = ''
  closeModal()
}

function syncSelectedRecords() {
  if (state.selectedStudent) {
    state.selectedStudent = getStudentById(state.selectedStudent.id)
    state.selectedStudentCurve = getStudentCurve(state.selectedStudent?.id)
  }
  if (state.selectedRecognition) {
    state.selectedRecognition = state.recognitions.find((item) => item.id === state.selectedRecognition.id) || null
  }
  if (state.selectedScholarship) {
    state.selectedScholarship = state.scholarships.find((item) => item.id === state.selectedScholarship.id) || null
  }
  if (state.selectedApplication) {
    state.selectedApplication = state.applications.find((item) => item.id === state.selectedApplication.id) || null
  }
  if (state.selectedWorkStudyApplication) {
    state.selectedWorkStudyApplication =
      state.workStudyApplications.find((item) => item.id === state.selectedWorkStudyApplication.id) || null
  }
  if (state.selectedWorkStudyJob) {
    state.selectedWorkStudyJob = state.workStudyJobs.find((item) => item.id === state.selectedWorkStudyJob.id) || null
  }
  if (state.selectedCareAlert) {
    state.selectedCareAlert = state.careAlerts.find((item) => item.id === state.selectedCareAlert.id) || null
  }
  if (state.selectedDeadlineReminder) {
    state.selectedDeadlineReminder = state.deadlineReminders.find((item) => item.id === state.selectedDeadlineReminder.id) || null
  }
  if (state.selectedCampusMoment) {
    state.selectedCampusMoment = state.campusMoments.find((item) => item.id === state.selectedCampusMoment.id) || null
  }
  if (state.selectedAnnouncement) {
    state.selectedAnnouncement = state.announcements.find((item) => item.id === state.selectedAnnouncement.id) || null
  }
}

function populateStudentCollegeFilter() {
  const options = state.students.reduce((acc, item) => {
    if (!item.collegeKey || acc.some((entry) => entry.value === item.collegeKey)) {
      return acc
    }
    acc.push({ value: item.collegeKey, label: item.college })
    return acc
  }, [])
  setSelectOptions('studentCollegeFilter', options, '全部学院')
}

function populateRecognitionCollegeFilter() {
  const options = state.recognitions.reduce((acc, item) => {
    const collegeKey = getRecognitionCollegeKey(item)
    if (!collegeKey || acc.some((entry) => entry.value === collegeKey)) {
      return acc
    }
    acc.push({ value: collegeKey, label: item.profile.college })
    return acc
  }, [])
  setSelectOptions('recognitionCollegeFilter', options, '全部学院')
}

function populateScholarshipCategoryFilter() {
  const options = state.scholarships.reduce((acc, item) => {
    if (!item.category || acc.some((entry) => entry.value === item.category)) {
      return acc
    }
    acc.push({ value: item.category, label: getCategoryLabel(item.category) })
    return acc
  }, [])
  setSelectOptions('scholarshipCategoryFilter', options, '全部分类')
  setSelectOptions('applicationCategoryFilter', options, '全部项目分类')
}

function populateAnnouncementPublisherFilter() {
  const options = state.announcements.reduce((acc, item) => {
    if (!item.publisher || acc.some((entry) => entry.value === item.publisher)) {
      return acc
    }
    acc.push({ value: item.publisher, label: item.publisher })
    return acc
  }, [])
  setSelectOptions('announcementPublisherFilter', options, '全部发布人')
}

function renderDashboardReminders({
  highRiskCare,
  highRiskStudentCount,
  avgCareResponseHours,
  pendingCare,
  careTotal,
  careHandled,
  pendingDeadlineReminders,
  latestPendingDeadlineReminder,
  outreachSummary,
}) {
  const highPending = state.careAlerts.filter((item) => item.levelCode === 'high' && item.status !== '已处理')
  const topHigh = highPending[0]
  const topHighCreatedAt = topHigh?.latestCreatedAt || topHigh?.createdAt
  const topHighEventCount = Number(topHigh?.eventCount || 1)
  const handledRate = careTotal > 0 ? Math.round((Number(careHandled || 0) / Number(careTotal || 0)) * 100) : 0
  const deadlineSummaryText = latestPendingDeadlineReminder
    ? `${safeText(latestPendingDeadlineReminder.scholarshipName || '-')}` +
      ` · 截止${safeText(latestPendingDeadlineReminder.deadline || '-')}` +
      ` · 剩余${safeText(latestPendingDeadlineReminder.hoursLeft, '0')}小时`
    : '暂无待处理的截止提醒'
  const monthlyMetrics = state.monthlyReport?.metrics || {}
  const monthlyInsight = state.monthlyReport?.insight || {}
  const monthlySignals = Array.isArray(state.monthlyReport?.distributions?.aiSignals)
    ? state.monthlyReport.distributions.aiSignals.slice(0, 3)
    : []
  const monthlySignalText = monthlySignals.length > 0
    ? monthlySignals.map((item) => `${safeText(item.signal)}(${safeText(item.count, '0')})`).join('、')
    : '暂无明显高频AI信号'
  const outreachStudents = Array.isArray(outreachSummary?.pendingOutreachStudents)
    ? outreachSummary.pendingOutreachStudents
    : []
  return `
    <div class="summary-card">
      <h3>处置提醒</h3>
      <div class="metric-list">
        <div class="metric-row"><span>红色预警未处理</span><strong>${safeText(highRiskCare, '0')}</strong></div>
        <div class="metric-row"><span>高风险学生数</span><strong>${safeText(highRiskStudentCount, '0')}</strong></div>
        <div class="metric-row"><span>平均响应时长</span><strong>${safeText(avgCareResponseHours, '0')}小时</strong></div>
      </div>
      <div class="subtext">${topHigh ? `${safeText(topHigh.studentName)} · ${safeText(topHigh.college)} · 聚合${safeText(topHighEventCount, '1')}条 · 已等待${safeText(formatElapsedSince(topHighCreatedAt))}` : '暂无红色未处理预警'}</div>
    </div>
    <div class="summary-card">
      <h3>高关怀处理进度</h3>
      <div class="metric-list">
        <div class="metric-row"><span>提醒总数</span><strong>${safeText(careTotal, '0')}</strong></div>
        <div class="metric-row"><span>待关注</span><strong>${safeText(pendingCare, '0')}</strong></div>
        <div class="metric-row"><span>已处理</span><strong>${safeText(careHandled, '0')}</strong></div>
        <div class="metric-row"><span>处理完成率</span><strong>${safeText(handledRate, '0')}%</strong></div>
      </div>
      <div class="subtext">建议先处理红色预警，再跟进黄色与蓝色观察学生。</div>
    </div>
    <div class="summary-card">
      <h3>截止提醒待办</h3>
      <div class="metric-list">
        <div class="metric-row"><span>待处理提醒</span><strong>${safeText(pendingDeadlineReminders, '0')}</strong></div>
      </div>
      <div class="subtext">${deadlineSummaryText}</div>
    </div>
    <div class="summary-card">
      <h3>线下宣讲重点学生</h3>
      <div class="metric-list">${renderOutreachStudentRows(outreachStudents)}</div>
      <div class="subtext">建议动作：政策宣讲 + 一对一跟进，完成后在学生管理页补充备注。</div>
    </div>
    <div class="summary-card">
      <h3>本月AI关怀报告</h3>
      <div class="metric-list">
        <div class="metric-row"><span>情绪对话会话</span><strong>${safeText(monthlyMetrics.emotionConversationCount, '0')}</strong></div>
        <div class="metric-row"><span>情绪消息总数</span><strong>${safeText(monthlyMetrics.emotionMessageCount, '0')}</strong></div>
        <div class="metric-row"><span>本月预警处理率</span><strong>${safeText(monthlyMetrics.handleRate || '0%', '0%')}</strong></div>
        <div class="metric-row"><span>平均处理时长</span><strong>${safeText(monthlyMetrics.averageHandleHours, '0')}小时</strong></div>
      </div>
      <div class="subtext">${safeText(monthlyInsight.positive || '本月暂无关怀处理数据')} ${safeText(monthlyInsight.focus || '')}</div>
      <div class="subtext">高频AI信号：${monthlySignalText}</div>
    </div>
  `
}

function parseKeywordCsv(value) {
  const list = String(value || '')
    .split(/[，,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
  return Array.from(new Set(list))
}

function formatKeywordList(value) {
  const list = Array.isArray(value) ? value : []
  return list.join('，')
}

function buildEmotionKeywordModalBody() {
  const getKeywords = (code) => state.emotionKeywordGroups.find((item) => item.code === code)?.keywords || []
  return `
    <div class="field">
      <label>红色预警关键词（逗号分隔）</label>
      <textarea id="emotionKeywordHigh" placeholder="例如：自杀, 不想活">${safeText(formatKeywordList(getKeywords('high')), '')}</textarea>
    </div>
    <div class="field">
      <label>黄色预警关键词（逗号分隔）</label>
      <textarea id="emotionKeywordMedium" placeholder="例如：焦虑, 失眠">${safeText(formatKeywordList(getKeywords('medium')), '')}</textarea>
    </div>
    <div class="field">
      <label>蓝色观察关键词（逗号分隔）</label>
      <textarea id="emotionKeywordLow" placeholder="例如：担心, 累">${safeText(formatKeywordList(getKeywords('low')), '')}</textarea>
    </div>
  `
}

function openEmotionKeywordModal() {
  openModal({
    title: '高风险情绪提示词维护',
    subtitle: '支持老师按业务场景维护关键词，逗号或换行分隔。',
    body: buildEmotionKeywordModalBody(),
    footer:
      '<button class="secondary" id="closeModalAction" type="button">取消</button><button class="primary" id="saveEmotionKeywordsBtn" type="button">保存关键词</button>',
  })
  document.getElementById('closeModalAction').addEventListener('click', closeModal)
  document.getElementById('saveEmotionKeywordsBtn').addEventListener('click', () => {
    submitEmotionKeywords().catch((error) => alert(error.message || '保存关键词失败'))
  })
}

function buildCareAlertHistoryRawContentCell(entry) {
  return `<div class="history-raw-content">${buildCareAlertRawContentList(entry)}</div>`
}

function getCareAlertHistoryRows(item) {
  const list = Array.isArray(item.events) ? item.events : []
  return list
    .slice()
    .sort((a, b) => parseDateValue(b.createdAt) - parseDateValue(a.createdAt))
    .map(
      (entry) => `
        <tr>
          <td>${formatDateText(entry.createdAt)}</td>
          <td>${safeText(getCareAlertLevelMeta(entry.levelCode).label)}</td>
          <td>${safeText(getCareAlertChannelLabel(entry.channel))}</td>
          <td>${safeText(entry.summaryHint || entry.triggerReason || '-')}</td>
          <td>${safeText((entry.riskTags || []).join('、') || '未识别')}</td>
          <td>${safeText((entry.matchedKeywords || []).join('、') || '未命中')}</td>
          <td>${safeText((entry.aiSignals || []).join('、') || '未触发')}</td>
          <td>${buildCareAlertHistoryRawContentCell(entry)}</td>
          <td>${getCareAlertStatusBadge(entry.status)}</td>
          <td>${safeText(entry.handler || '-')}</td>
          <td>${formatDateText(entry.handledAt)}</td>
          <td>${safeText(entry.handleNote || '-')}</td>
        </tr>
      `,
    )
    .join('')
}

function getCareAlertHistoryTableHtml(item) {
  const rows = getCareAlertHistoryRows(item)
  if (!rows) {
    return '<div class="empty-state">暂无处理记录。</div>'
  }
  return `
    <div class="table-wrap compact-table-wrap">
      <table class="compact-table care-history-table">
        <thead>
          <tr>
            <th>触发时间</th>
            <th>等级</th>
            <th>来源</th>
            <th>风险摘要</th>
            <th>风险标签</th>
            <th>关键词</th>
            <th>AI信号</th>
            <th>原话列表</th>
            <th>状态</th>
            <th>处理人</th>
            <th>处理时间</th>
            <th>处理意见</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `
}

function getWorkStudyOpenBadge(item) {
  return item.openForApply ? '<span class="badge ok">开放</span>' : '<span class="badge warn">关闭</span>'
}

function getWorkStudyJobById(jobId) {
  return state.workStudyJobs.find((item) => item.id === jobId) || null
}

function fillEmotionKeywordInputs() {
  const highTarget = document.getElementById('emotionKeywordHigh')
  const mediumTarget = document.getElementById('emotionKeywordMedium')
  const lowTarget = document.getElementById('emotionKeywordLow')
  if (!highTarget || !mediumTarget || !lowTarget) {
    return
  }
  const getKeywords = (code) => state.emotionKeywordGroups.find((item) => item.code === code)?.keywords || []
  highTarget.value = formatKeywordList(getKeywords('high'))
  mediumTarget.value = formatKeywordList(getKeywords('medium'))
  lowTarget.value = formatKeywordList(getKeywords('low'))
}

function renderWorkStudyJobTable() {
  const tbody = document.getElementById('workStudyJobTable')
  const keyword = normalizeText(document.getElementById('workStudyJobKeywordFilter').value)
  const openStatus = document.getElementById('workStudyJobOpenFilter').value
  const list = state.workStudyJobs.filter((item) => {
    if (openStatus === 'open' && !item.openForApply) {
      return false
    }
    if (openStatus === 'closed' && item.openForApply) {
      return false
    }
    if (keyword) {
      const matchText = [item.title, item.department, item.location, item.description, ...(item.tags || [])].join(' ')
      if (!normalizeText(matchText).includes(keyword)) {
        return false
      }
    }
    return true
  })

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">暂无符合条件的岗位。</td></tr>'
    return
  }

  tbody.innerHTML = list
    .map(
      (item) => `
        <tr>
          <td>
            ${safeText(item.title)}
            <div class="subtext">${safeText(item.department || '-')} · ${safeText(item.location || '-')}</div>
          </td>
          <td>
            ${safeText(item.salaryPerHour, '0')}元/小时
            <div class="subtext">周上限${safeText(item.weeklyHoursMax, '0')}h · 月上限${safeText(item.monthlyHoursMax, '0')}h</div>
          </td>
          <td>
            <div class="subtext">专业：${safeText((item.requiredMajors || []).join('、') || '不限')}</div>
            <div class="subtext">技能：${safeText((item.requiredSkills || []).join('、') || '无')}</div>
          </td>
          <td>
            <div class="subtext">待审核 ${safeText(item.pendingCount, '0')}</div>
            <div class="subtext">通过 ${safeText(item.approvedCount, '0')} · 驳回 ${safeText(item.rejectedCount, '0')}</div>
          </td>
          <td>${getWorkStudyOpenBadge(item)}</td>
          <td><button class="inline-btn" data-work-study-job-id="${safeText(item.id, '')}" type="button">编辑</button></td>
        </tr>
      `,
    )
    .join('')

  tbody.querySelectorAll('[data-work-study-job-id]').forEach((button) => {
    button.addEventListener('click', () => openWorkStudyJobModal(button.dataset.workStudyJobId))
  })
}

function buildWorkStudyJobModalBody(item) {
  const value = item || {
    title: '',
    department: '',
    location: '',
    salaryPerHour: 20,
    weeklyHoursMax: 8,
    monthlyHoursMax: 40,
    requiredMajors: [],
    requiredSkills: [],
    shiftSlots: [],
    tags: [],
    openForApply: true,
    description: '',
  }
  return `
    <div class="two-col">
      <div class="field">
        <label>岗位名称</label>
        <input id="workStudyJobTitle" value="${escapeAttribute(value.title || '')}" />
      </div>
      <div class="field">
        <label>所属部门</label>
        <input id="workStudyJobDepartment" value="${escapeAttribute(value.department || '')}" />
      </div>
    </div>
    <div class="two-col">
      <div class="field">
        <label>工作地点</label>
        <input id="workStudyJobLocation" value="${escapeAttribute(value.location || '')}" />
      </div>
      <div class="field">
        <label>薪资（元/小时）</label>
        <input id="workStudyJobSalary" type="number" min="0" step="0.1" value="${safeText(value.salaryPerHour, '0')}" />
      </div>
    </div>
    <div class="two-col">
      <div class="field">
        <label>周上限工时</label>
        <input id="workStudyJobWeeklyHours" type="number" min="1" value="${safeText(value.weeklyHoursMax, '1')}" />
      </div>
      <div class="field">
        <label>月上限工时</label>
        <input id="workStudyJobMonthlyHours" type="number" min="1" value="${safeText(value.monthlyHoursMax, '1')}" />
      </div>
    </div>
    <div class="field">
      <label>限定专业（逗号分隔，留空表示不限）</label>
      <input id="workStudyJobMajors" value="${escapeAttribute((value.requiredMajors || []).join('，'))}" />
    </div>
    <div class="field">
      <label>技能要求（逗号分隔）</label>
      <input id="workStudyJobSkills" value="${escapeAttribute((value.requiredSkills || []).join('，'))}" />
    </div>
    <div class="field">
      <label>班次安排（逗号或换行分隔）</label>
      <textarea id="workStudyJobShiftSlots">${safeText((value.shiftSlots || []).join('\n'), '')}</textarea>
    </div>
    <div class="field">
      <label>标签（逗号分隔）</label>
      <input id="workStudyJobTags" value="${escapeAttribute((value.tags || []).join('，'))}" />
    </div>
    <div class="field">
      <label>岗位说明</label>
      <textarea id="workStudyJobDescription">${safeText(value.description || '', '')}</textarea>
    </div>
    <div class="field">
      <label><input id="workStudyJobOpenForApply" type="checkbox" ${value.openForApply ? 'checked' : ''} /> 开放申请</label>
    </div>
  `
}

function openWorkStudyJobModal(jobId) {
  const item = jobId ? getWorkStudyJobById(jobId) : null
  state.selectedWorkStudyJob = item
  openModal({
    title: item ? '编辑勤工岗位' : '新增勤工岗位',
    subtitle: item ? `${safeText(item.title)} · ${safeText(item.department || '-')}` : '维护岗位后，学生端才会出现匹配申请入口',
    body: buildWorkStudyJobModalBody(item),
    footer:
      '<button class="secondary" id="closeModalAction" type="button">取消</button><button class="primary" id="saveWorkStudyJob" type="button">保存岗位</button>',
    wide: true,
  })
  document.getElementById('closeModalAction').addEventListener('click', closeModal)
  document.getElementById('saveWorkStudyJob').addEventListener('click', submitWorkStudyJob)
}

async function submitWorkStudyJob() {
  const payload = {
    title: document.getElementById('workStudyJobTitle').value.trim(),
    department: document.getElementById('workStudyJobDepartment').value.trim(),
    location: document.getElementById('workStudyJobLocation').value.trim(),
    salaryPerHour: Number(document.getElementById('workStudyJobSalary').value || 0),
    weeklyHoursMax: Number(document.getElementById('workStudyJobWeeklyHours').value || 0),
    monthlyHoursMax: Number(document.getElementById('workStudyJobMonthlyHours').value || 0),
    requiredMajors: parseKeywordCsv(document.getElementById('workStudyJobMajors').value),
    requiredSkills: parseKeywordCsv(document.getElementById('workStudyJobSkills').value),
    shiftSlots: parseKeywordCsv(document.getElementById('workStudyJobShiftSlots').value),
    tags: parseKeywordCsv(document.getElementById('workStudyJobTags').value),
    description: document.getElementById('workStudyJobDescription').value.trim(),
    openForApply: document.getElementById('workStudyJobOpenForApply').checked,
  }
  if (!payload.title) {
    alert('岗位名称不能为空')
    return
  }
  if (state.selectedWorkStudyJob) {
    await api(`/api/work-study/teacher/jobs/${state.selectedWorkStudyJob.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  } else {
    await api('/api/work-study/teacher/jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }
  await loadAll()
  closeModal()
  alert('勤工岗位已保存')
}

async function submitEmotionKeywords() {
  const payload = {
    high: parseKeywordCsv(document.getElementById('emotionKeywordHigh').value),
    medium: parseKeywordCsv(document.getElementById('emotionKeywordMedium').value),
    low: parseKeywordCsv(document.getElementById('emotionKeywordLow').value),
  }
  if (payload.high.length === 0) {
    alert('请至少填写一个红色预警关键词')
    return
  }
  await api('/api/teacher/emotion-keywords', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  const response = await api('/api/teacher/emotion-keywords')
  state.emotionKeywordGroups = Array.isArray(response.groups) ? response.groups : []
  fillEmotionKeywordInputs()
  alert('高风险情绪词已保存')
}

function renderDashboardDrillCard({ title, value, note, panel, level }) {
  const attrs = [
    panel ? `data-drill-panel="${escapeAttribute(panel)}"` : '',
    level ? `data-drill-level="${escapeAttribute(level)}"` : '',
  ]
    .filter(Boolean)
    .join(' ')
  return `
    <button class="stat-card drill-card" type="button" ${attrs}>
      <div class="stat-label">${safeText(title)}</div>
      <div class="stat-value">${safeText(value, '0')}</div>
      <div class="subtext">${safeText(note || '点击钻取')}</div>
    </button>
  `
}

function bindDashboardDrilldown() {
  document.querySelectorAll('.drill-card[data-drill-panel]').forEach((node) => {
    if (node.dataset.drillBound === '1') {
      return
    }
    node.dataset.drillBound = '1'
    node.addEventListener('click', () => {
      const panel = node.dataset.drillPanel
      if (!panel) {
        return
      }
      setActivePanel(panel)
      if (panel === 'recognitions') {
        const level = node.dataset.drillLevel || ''
        document.getElementById('recognitionStatusFilter').value = '待审核'
        if (level) {
          document.getElementById('recognitionLevelFilter').value = level
        }
        renderRecognitionTable()
      } else if (panel === 'applications') {
        document.getElementById('applicationStatusFilter').value = '待审核'
        renderApplicationTable()
      } else if (panel === 'work-study') {
        document.getElementById('workStudyStatusFilter').value = '待审核'
        renderWorkStudyTable()
      } else if (panel === 'care-alerts') {
        const level = node.dataset.drillLevel || ''
        if (level) {
          document.getElementById('careAlertLevelFilter').value = level
        }
        document.getElementById('careAlertStatusFilter').value = '待关注'
        renderCareAlertTable()
      } else if (panel === 'deadline-reminders') {
        document.getElementById('deadlineReminderStatusFilter').value = 'pending'
        renderDeadlineReminderTable()
      } else if (panel === 'campus-moments') {
        document.getElementById('campusMomentStatusFilter').value = '待审核'
        renderCampusMomentTable()
      }
    })
  })
}

function getCurrentMonthValue() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getCurrentQuarterValue() {
  const now = new Date()
  return `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`
}

function getCurrentYearValue() {
  return String(new Date().getFullYear())
}

function getDefaultReportPeriodValue(periodType) {
  if (periodType === 'quarter') {
    return getCurrentQuarterValue()
  }
  if (periodType === 'year') {
    return getCurrentYearValue()
  }
  return getCurrentMonthValue()
}

function buildMonthPeriodOptions(limit = 12) {
  const now = new Date()
  const list = []
  for (let index = 0; index < limit; index += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1)
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    list.push({ value, label: `${value} 月` })
  }
  return list
}

function buildQuarterPeriodOptions(limit = 8) {
  const now = new Date()
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1
  let year = now.getFullYear()
  let quarter = currentQuarter
  const list = []
  for (let index = 0; index < limit; index += 1) {
    list.push({ value: `${year}-Q${quarter}`, label: `${year} 年第 ${quarter} 季度` })
    quarter -= 1
    if (quarter < 1) {
      quarter = 4
      year -= 1
    }
  }
  return list
}

function buildYearPeriodOptions(limit = 5) {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: limit }, (_, index) => {
    const year = String(currentYear - index)
    return { value: year, label: `${year} 年` }
  })
}

function getReportPeriodOptions(periodType) {
  if (periodType === 'quarter') {
    return buildQuarterPeriodOptions()
  }
  if (periodType === 'year') {
    return buildYearPeriodOptions()
  }
  return buildMonthPeriodOptions()
}

function ensureReportPeriodValue() {
  const options = getReportPeriodOptions(state.reportPeriodType)
  const currentValue = String(state.reportPeriodValue || '').trim()
  if (options.some((item) => item.value === currentValue)) {
    return currentValue
  }
  const nextValue = getDefaultReportPeriodValue(state.reportPeriodType)
  state.reportPeriodValue = nextValue
  return nextValue
}

function syncSummaryReportControls() {
  document.querySelectorAll('.summary-report-tab').forEach((button) => {
    button.classList.toggle('active', button.dataset.reportType === state.reportPeriodType)
  })
  const select = document.getElementById('summaryReportPeriodValue')
  if (!select) {
    return
  }
  const options = getReportPeriodOptions(state.reportPeriodType)
  const currentValue = ensureReportPeriodValue()
  select.innerHTML = options
    .map((item) => `<option value="${escapeAttribute(item.value)}" ${item.value === currentValue ? 'selected' : ''}>${safeText(item.label)}</option>`)
    .join('')
  select.value = currentValue
}

async function loadSummaryReport(periodType = state.reportPeriodType, periodValue = state.reportPeriodValue, forceRefresh = false) {
  const nextType = ['month', 'quarter', 'year'].includes(String(periodType || '').trim())
    ? String(periodType).trim()
    : 'month'
  state.reportPeriodType = nextType
  const nextValue = String(periodValue || getDefaultReportPeriodValue(nextType)).trim() || getDefaultReportPeriodValue(nextType)
  state.reportPeriodValue = nextValue
  const cacheKey = `${nextType}:${nextValue}`
  if (forceRefresh || !state.reportCache[cacheKey]) {
    state.reportCache[cacheKey] = await api(
      `/api/teacher/summary-report?periodType=${encodeURIComponent(nextType)}&periodValue=${encodeURIComponent(nextValue)}`,
    )
  }
  state.summaryReport = state.reportCache[cacheKey]
  syncSummaryReportControls()
  renderSummaryReportPanel()
  return state.summaryReport
}

function buildSummaryMetricCard(title, value, note = '') {
  return `
    <div class="stat-card">
      <div class="stat-label">${safeText(title)}</div>
      <div class="stat-value">${safeText(value, '0')}</div>
      <div class="subtext">${safeText(note || '本周期统计')}</div>
    </div>
  `
}

function mapCountRows(list, maxCount = 8) {
  return (Array.isArray(list) ? list : []).slice(0, maxCount).map((item) => ({
    label: item.label || '-',
    value: Number(item.count ?? item.value ?? 0),
  }))
}

function formatMetricValue(value, fallback = '0') {
  if (typeof value === 'string') {
    return value || fallback
  }
  if (typeof value === 'number') {
    return String(value)
  }
  if (value === undefined || value === null || value === '') {
    return fallback
  }
  return String(value)
}

function buildSummaryMetricRows(metricMap, config) {
  return config.map((item) => ({
    label: item.label,
    value: formatMetricValue(metricMap?.[item.key], item.fallback || '0'),
  }))
}

function buildSummaryGroupCard(groupKey, group) {
  const configMap = {
    engagement: [
      { key: 'aiConversationCount', label: 'AI会话总数' },
      { key: 'emotionConversationCount', label: 'AI树洞会话' },
      { key: 'emotionMessageCount', label: '情绪消息总数' },
      { key: 'policyViewCount', label: '政策浏览次数' },
      { key: 'shareCardCount', label: '分享卡片次数' },
      { key: 'handledDeadlineCount', label: '已处理截止提醒' },
    ],
    psychology: [
      { key: 'totalAlerts', label: '预警总数' },
      { key: 'highAlerts', label: '红色预警' },
      { key: 'mediumAlerts', label: '黄色预警' },
      { key: 'lowAlerts', label: '蓝色观察' },
      { key: 'handleRate', label: '处理率', fallback: '0%' },
      { key: 'averageHandleHours', label: '平均处理时长(小时)' },
    ],
    funding: [
      { key: 'recognitionSubmitCount', label: '认定申请数' },
      { key: 'recognitionPassRate', label: '认定通过率', fallback: '0%' },
      { key: 'scholarshipApplyCount', label: '奖助申请数' },
      { key: 'scholarshipApproveRate', label: '奖助通过率', fallback: '0%' },
      { key: 'clickToApplyRate', label: '浏览转申请率', fallback: '0%' },
      { key: 'averageStayText', label: '平均停留时长', fallback: '0分钟' },
    ],
    growth: [
      { key: 'growthEventCount', label: '成长事件数' },
      { key: 'growthPointsAdded', label: '新增积分' },
      { key: 'growthFlowerDelta', label: '新增花朵' },
      { key: 'growthFruitDelta', label: '新增果实' },
      { key: 'workStudyApprovedCount', label: '勤工通过数' },
      { key: 'campusMomentPublishedCount', label: '校园点滴发布数' },
    ],
    action: [
      { key: 'pendingOutreachCount', label: '待宣讲学生' },
      { key: 'pendingDeadlineCount', label: '待处理截止提醒' },
      { key: 'highRiskStudentCount', label: '高风险重点学生' },
      { key: 'difficultStudentCount', label: '重点困难学生' },
    ],
  }
  const metricRows = buildSummaryMetricRows(group?.metrics || {}, configMap[groupKey] || [])
  const chartBlocks = []
  if (Array.isArray(group?.charts?.scenes) && group.charts.scenes.length > 0) {
    chartBlocks.push(buildChartCard('AI场景分布', mapCountRows(group.charts.scenes, 6)))
  }
  if (Array.isArray(group?.charts?.aiSignals) && group.charts.aiSignals.length > 0) {
    chartBlocks.push(buildChartCard('高频AI信号', mapCountRows(group.charts.aiSignals, 6)))
  }
  if (Array.isArray(group?.charts?.colleges) && group.charts.colleges.length > 0) {
    chartBlocks.push(buildChartCard('学院分布', mapCountRows(group.charts.colleges, 6)))
  }
  if (Array.isArray(group?.charts?.themes) && group.charts.themes.length > 0) {
    chartBlocks.push(buildChartCard('主题分布', mapCountRows(group.charts.themes, 6)))
  }
  if (Array.isArray(group?.charts?.growthActions) && group.charts.growthActions.length > 0) {
    chartBlocks.push(buildChartCard('成长行为分布', mapCountRows(group.charts.growthActions, 6)))
  }
  if (Array.isArray(group?.topScholarships) && group.topScholarships.length > 0) {
    chartBlocks.push(
      buildDashboardInsightCard(
        'Top奖助项目',
        group.topScholarships.slice(0, 6).map((item) => ({
          label: item.name || '未命名项目',
          value: `${safeText(item.applicantCount, '0')} / ${safeText(item.viewCount, '0')} (${safeText(item.clickToApplyRate, '0%')})`,
        })),
      ),
    )
  }
  return `
    <div class="section-card summary-report-group-card">
      <div class="section-header">
        <div>
          <h3>${safeText(group?.title || '统计分组')}</h3>
          <p class="subtext">本组指标基于当前周期真实记录汇总。</p>
        </div>
      </div>
      <div class="metric-list">${metricRows
        .map(
          (item) => `
            <div class="metric-row">
              <span>${safeText(item.label)}</span>
              <strong>${safeText(item.value, '0')}</strong>
            </div>
          `,
        )
        .join('')}</div>
      <div class="summary-report-subgrid">${chartBlocks.join('')}</div>
    </div>
  `
}

function buildFocusStudentRows(list, valueBuilder) {
  const items = Array.isArray(list) ? list : []
  if (items.length === 0) {
    return '<div class="empty-state">暂无可展示记录。</div>'
  }
  return items
    .slice(0, 6)
    .map(
      (item) => `
        <div class="metric-row">
          <span>${safeText(item.studentName || '-')} · ${safeText(item.college || '-')}</span>
          <strong>${safeText(valueBuilder(item), '-')}</strong>
        </div>
      `,
    )
    .join('')
}

function renderSummaryReportPanel() {
  const overviewTarget = document.getElementById('summaryReportOverview')
  const narrativeTarget = document.getElementById('summaryReportNarrative')
  const dimensionTarget = document.getElementById('summaryReportDimensions')
  const toplistTarget = document.getElementById('summaryReportToplists')
  const actionTarget = document.getElementById('summaryReportActions')
  const metaTarget = document.getElementById('summaryReportMeta')
  if (!overviewTarget || !narrativeTarget || !dimensionTarget || !toplistTarget || !actionTarget || !metaTarget) {
    return
  }

  syncSummaryReportControls()
  const report = state.summaryReport
  if (!report) {
    metaTarget.textContent = '请选择周期并生成 AI 报告。'
    overviewTarget.innerHTML = ''
    narrativeTarget.innerHTML = '<div class="summary-card"><div class="empty-state">暂无报告数据。</div></div>'
    dimensionTarget.innerHTML = ''
    toplistTarget.innerHTML = ''
    actionTarget.innerHTML = ''
    return
  }

  metaTarget.textContent = `${report.periodLabel || 'AI周期报告'} · 统计区间 ${formatDateText(report.startAt)} 至 ${formatDateText(report.endAt)} · 生成时间 ${formatDateText(report.generatedAt)}`

  const overview = report.overviewMetrics || {}
  overviewTarget.innerHTML = [
    buildSummaryMetricCard('AI会话总数', overview.aiConversationCount, '含树洞、认定、奖助等场景'),
    buildSummaryMetricCard('情绪预警总数', overview.totalAlerts, '本周期心理事件记录'),
    buildSummaryMetricCard('红色预警', overview.highAlerts, '高风险重点关注'),
    buildSummaryMetricCard('政策浏览次数', overview.policyViewCount, '奖助触达行为'),
    buildSummaryMetricCard('奖助申请数', overview.applicationCount, '已提交奖助申请'),
    buildSummaryMetricCard('成长事件数', overview.growthEventCount, '成长树结果层行为'),
  ].join('')

  const summaryText = report.summaryText || {}
  const insights = report.insights || {}
  narrativeTarget.innerHTML = [
    buildDashboardInsightCard('总体判断', [{ label: report.periodLabel || '当前周期', value: summaryText.overall || insights.positive || '暂无总结' }]),
    buildDashboardInsightCard('重点风险', [{ label: '风险分析', value: summaryText.risk || insights.focus || '暂无重点风险' }]),
    buildDashboardInsightCard('下阶段建议', [{ label: '建议动作', value: summaryText.nextSteps || insights.action || '暂无建议' }]),
  ].join('')

  const groups = report.dimensionGroups || {}
  dimensionTarget.innerHTML = ['engagement', 'psychology', 'funding', 'growth', 'action']
    .map((key) => buildSummaryGroupCard(key, groups[key]))
    .join('')

  toplistTarget.innerHTML = [
    buildDashboardInsightCard(
      '高风险重点学生',
      (report.topLists?.highRiskStudents || []).slice(0, 6).map((item) => ({
        label: `${item.studentName || '-'} · ${item.college || '-'}`,
        value: `${safeText(item.eventCount, '0')}条 · 待关注${safeText(item.pendingCount, '0')}条`,
      })),
    ),
    buildDashboardInsightCard(
      '待宣讲重点学生',
      (report.topLists?.pendingOutreachStudents || []).slice(0, 6).map((item) => ({
        label: `${item.studentName || '-'} · ${item.college || '-'}`,
        value: item.recommendation || '建议线下宣讲',
      })),
    ),
    buildDashboardInsightCard(
      '高频AI信号',
      (report.topLists?.topSignals || []).slice(0, 6).map((item) => ({
        label: item.label || '-',
        value: Number(item.count || 0),
      })),
    ),
  ].join('')

  actionTarget.innerHTML = `
    <div class="summary-card">
      <h3>建议动作清单</h3>
      <div class="metric-list">${(Array.isArray(report.actionSuggestions) ? report.actionSuggestions : ['暂无建议'])
        .map(
          (item, index) => `
            <div class="metric-row">
              <span>建议${index + 1}</span>
              <strong>${safeText(item)}</strong>
            </div>
          `,
        )
        .join('')}</div>
    </div>
    <div class="summary-card">
      <h3>重点学生摘录</h3>
      <div class="metric-list">
        ${buildFocusStudentRows(report.topLists?.highRiskStudents, (item) => `${safeText(item.eventCount, '0')}条事件`) }
      </div>
      <div class="subtext">优先结合学院、事件数与待处理状态安排后续跟进。</div>
    </div>
  `
}

function renderDashboard() {
  const statTarget = document.getElementById('statsGrid')
  const chartTarget = document.getElementById('dashboardCharts')
  const summaryTarget = document.getElementById('dashboardSummary')
  const reminderTarget = document.getElementById('dashboardReminders')

  const pendingRecognitions = Number(state.dashboard?.pendingRecognitions || 0)
  const pendingApplications = Number(state.dashboard?.pendingScholarshipApplications || 0)
  const pendingWorkStudy = Number(state.dashboard?.pendingWorkStudyApplications || 0)
  const pendingCare = Number(state.dashboard?.pendingCareAlerts || 0)
  const highRiskCare = Number(state.dashboard?.highRiskCareAlerts || 0)
  const recognizedStudents = Number(state.dashboard?.recognizedStudents || 0)
  const specialCount = Number(state.dashboard?.specialCount || 0)
  const hardCount = Number(state.dashboard?.hardCount || 0)
  const generalCount = Number(state.dashboard?.generalCount || 0)
  const workStudyOpenJobs = Number(state.dashboard?.workStudyOpenJobs || 0)
  const workStudyClosedJobs = Number(state.dashboard?.workStudyClosedJobs || 0)
  const workStudyApprovedApplications = Number(state.dashboard?.workStudyApprovedApplications || 0)
  const highRiskStudentCount = Number(state.dashboard?.highRiskStudentCount || 0)
  const avgCareResponseHours = Number(state.dashboard?.avgCareResponseHours || 0)
  const pendingDeadlineReminders = Number(state.dashboard?.pendingDeadlineReminders || 0)
  const latestPendingDeadlineReminder = state.deadlineReminders.find((item) => item.status === 'pending' || item.status === 'read') || null
  const outreachSummary = state.dashboard?.outreachSummary || {}

  const careTotal = Number(state.careAlertSummary?.total || state.careAlerts.length)
  const careHandled = Number(state.careAlertSummary?.handled || state.careAlerts.filter((item) => item.status === '已处理').length)

  const stats = [
    {
      title: '待审核认定',
      value: pendingRecognitions,
      note: '点击进入认定审核',
      panel: 'recognitions',
    },
    {
      title: '待审核奖助申请',
      value: pendingApplications,
      note: '点击进入奖助审核',
      panel: 'applications',
    },
    {
      title: '待审核勤工申请',
      value: pendingWorkStudy,
      note: '点击进入勤工管理',
      panel: 'work-study',
    },
    {
      title: '待关注高关怀',
      value: pendingCare,
      note: '点击进入高关怀提醒',
      panel: 'care-alerts',
    },
    {
      title: '本学年奖助申请总数',
      value: Number(state.applications.length),
      note: '含待审核、通过与驳回',
      panel: 'applications',
    },
    {
      title: '本学年认定申请总数',
      value: Number(state.recognitions.length),
      note: '覆盖全量认定记录',
      panel: 'recognitions',
    },
    {
      title: '开放勤工岗位',
      value: workStudyOpenJobs,
      note: `关闭岗位 ${safeText(workStudyClosedJobs, '0')} 个`,
      panel: 'work-study',
    },
    {
      title: '红色未处理预警',
      value: highRiskCare,
      note: '点击查看高风险列表',
      panel: 'care-alerts',
      level: 'high',
    },
    {
      title: '待处理截止提醒',
      value: Number(state.dashboard?.pendingDeadlineReminders || 0),
      note: '点击查看截止提醒列表',
      panel: 'deadline-reminders',
    },
    {
      title: '待宣讲重点学生',
      value: Number(outreachSummary.pendingOutreachCount || 0),
      note: `${safeText(outreachSummary.academicYear || '-') }学年困难学生待宣讲`,
      panel: 'students',
    },
  ]

  statTarget.innerHTML = stats.map((item) => renderDashboardDrillCard(item)).join('')

  const chartCards = [
    buildChartCard('奖助学金申请统计', [
      { label: '待审核', value: pendingApplications, tone: 'warn' },
      { label: '已通过', value: Number(state.applications.filter((item) => item.status === '审核通过').length), tone: 'ok' },
      { label: '已驳回', value: Number(state.applications.filter((item) => item.status === '驳回').length) },
      { label: '总申请数', value: Number(state.applications.length) },
    ]),
    buildChartCard('认定统计', [
      { label: '待审核', value: pendingRecognitions, tone: 'warn' },
      { label: '特别困难', value: specialCount, tone: 'warn' },
      { label: '困难', value: hardCount },
      { label: '一般困难', value: generalCount, tone: 'ok' },
      { label: '已认定总数', value: recognizedStudents },
    ]),
    buildChartCard('勤工岗位统计', [
      { label: '待审核申请', value: pendingWorkStudy, tone: 'warn' },
      { label: '已通过申请', value: workStudyApprovedApplications, tone: 'ok' },
      { label: '开放岗位', value: workStudyOpenJobs, tone: 'ok' },
      { label: '关闭岗位', value: workStudyClosedJobs },
      { label: '申请总数', value: Number(state.workStudyApplications.length) },
    ]),
    buildChartCard('高关怀统计', [
      { label: '待关注', value: pendingCare, tone: 'warn' },
      { label: '红色未处理', value: highRiskCare, tone: 'warn' },
      { label: '高风险学生数', value: highRiskStudentCount },
      { label: '提醒总数', value: Number(state.careAlertSummary?.total || state.careAlerts.length) },
      { label: '平均响应小时', value: avgCareResponseHours },
    ]),
  ]

  chartTarget.innerHTML = chartCards.join('')

  renderDashboardInsights()

  const latestRecognition = state.recognitions[0]
  const latestApplication = state.applications[0]
  const latestWorkStudyApplication = state.workStudyApplications[0]

  summaryTarget.innerHTML = `
    <div class="summary-card">
      <h3>核心待办</h3>
      <div class="metric-list">
        <div class="metric-row"><span>认定审核</span><strong>${safeText(pendingRecognitions, '0')}</strong></div>
        <div class="metric-row"><span>奖助申请审核</span><strong>${safeText(pendingApplications, '0')}</strong></div>
        <div class="metric-row"><span>勤工申请审核</span><strong>${safeText(pendingWorkStudy, '0')}</strong></div>
        <div class="metric-row"><span>高关怀待关注</span><strong>${safeText(pendingCare, '0')}</strong></div>
        <div class="metric-row"><span>截止提醒待处理</span><strong>${safeText(pendingDeadlineReminders, '0')}</strong></div>
        <div class="metric-row"><span>待宣讲重点学生</span><strong>${safeText(outreachSummary.pendingOutreachCount, '0')}</strong></div>
      </div>
      <div class="subtext">困难生政策触达：${safeText(outreachSummary.viewedPolicyStudentCount, '0')} / ${safeText(outreachSummary.targetStudentCount, '0')} 已浏览政策页</div>
    </div>
    <div class="summary-card">
      <h3>最新业务动态</h3>
      <div class="metric-list">
        <div class="metric-row"><span>最近认定</span><strong>${safeText(latestRecognition?.profile?.name || '暂无')}</strong></div>
        <div class="subtext">${latestRecognition ? `${formatDateText(latestRecognition.submittedAt)} · ${latestRecognition.reviewStatus}` : '暂无认定申请记录'}</div>
        <div class="metric-row"><span>最近奖助申请</span><strong>${safeText(latestApplication?.scholarshipName || '暂无')}</strong></div>
        <div class="subtext">${latestApplication ? `${formatDateText(latestApplication.submittedAt)} · ${latestApplication.status}` : '暂无奖助申请记录'}</div>
        <div class="metric-row"><span>最近勤工申请</span><strong>${safeText(latestWorkStudyApplication?.studentName || '暂无')}</strong></div>
        <div class="subtext">${latestWorkStudyApplication ? `${formatDateText(latestWorkStudyApplication.submittedAt)} · ${latestWorkStudyApplication.status}` : '暂无勤工岗位申请记录'}</div>
      </div>
    </div>
  `

  reminderTarget.innerHTML = renderDashboardReminders({
    highRiskCare,
    highRiskStudentCount,
    avgCareResponseHours,
    pendingCare,
    careTotal,
    careHandled,
    pendingDeadlineReminders,
    latestPendingDeadlineReminder,
    outreachSummary,
  })

  bindDashboardDrilldown()
}

function renderStudentTable() {
  const tbody = document.getElementById('studentTable')
  const keyword = normalizeText(document.getElementById('studentKeyword').value)
  const collegeKey = document.getElementById('studentCollegeFilter').value
  const level = document.getElementById('studentLevelFilter').value
  const status = document.getElementById('studentStatusFilter').value
  const list = state.students.filter((item) => {
    if (keyword && !normalizeText(item.name).includes(keyword) && !normalizeText(item.studentNo).includes(keyword)) {
      return false
    }
    if (collegeKey && item.collegeKey !== collegeKey) {
      return false
    }
    if (level && item.currentRecognitionLevel !== level) {
      return false
    }
    if (status && item.currentRecognitionStatus !== status) {
      return false
    }
    return true
  })

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">暂无符合条件的学生。</td></tr>'
    return
  }

  tbody.innerHTML = list
    .map((item) => {
      const recognitions = getStudentRecognitions(item.id)
      const applications = getStudentApplications(item.id)
      const psychologySummary = getStudentLatestPsychologySummary(item.id)
      return `
        <tr>
          <td>
            ${safeText(item.name)}
            <div class="subtext">${safeText(item.studentNo)}</div>
          </td>
          <td>
            ${safeText(item.college)}
            <div class="subtext">${safeText(item.major)} / ${safeText(item.className)}</div>
          </td>
          <td>
            ${statusBadge(item.currentRecognitionStatus)}
            <div class="subtext">${safeText(item.currentPovertyTag)} · ${safeText(item.currentRecognitionLevel)}</div>
          </td>
          <td>
            <div class="subtext">${safeText(psychologySummary.levelText)} · ${safeText(psychologySummary.trendText)}</div>
            <div class="subtext">${safeText(psychologySummary.latestTheme)}</div>
            <div class="subtext">最近：${safeText(psychologySummary.latestTimeText)}</div>
          </td>
          <td>
            <div class="subtext">认定申请 ${safeText(recognitions.length, '0')} 条</div>
            <div class="subtext">奖助申请 ${safeText(applications.length, '0')} 条</div>
          </td>
          <td><button class="inline-btn" data-student-id="${safeText(item.id, '')}" type="button">查看</button></td>
        </tr>
      `
    })
    .join('')

  tbody.querySelectorAll('[data-student-id]').forEach((button) => {
    button.addEventListener('click', () => openStudentDetailPanel(button.dataset.studentId))
  })
}

function buildStudentModalBody(student) {
  const recognitions = getStudentRecognitions(student.id)
  const applications = getStudentApplications(student.id)
  const confirmedLabels = Array.isArray(student.confirmedRecognitionLabels) ? student.confirmedRecognitionLabels : []
  const recognitionHtml = recognitions.length
    ? recognitions
        .map(
          (item) => `
            <div class="mini-card">
              <div class="stack-text"><strong>${formatDateText(item.submittedAt)}</strong></div>
              <div class="stack-text">${statusBadge(item.reviewStatus)}</div>
              <div class="stack-text">最终结果：${safeText(item.finalTag)} · ${safeText(item.finalLevel)} · ${safeText(item.finalScore, '0')}分</div>
              <div class="stack-text">确认类型：${safeText((item.confirmedRuleLabels || []).join('、') || '无')}</div>
            </div>
          `,
        )
        .join('')
    : '<div class="empty-state">暂无认定申请记录。</div>'
  const applicationHtml = applications.length
    ? applications
        .map(
          (item) => `
            <div class="mini-card">
              <div class="stack-text"><strong>${safeText(item.scholarshipName)}</strong></div>
              <div class="stack-text">提交时间：${formatDateText(item.submittedAt)}</div>
              <div class="stack-text">${statusBadge(item.status)}</div>
              <div class="stack-text">资格说明：${safeText(item.eligibilityResult?.reason || '无')}</div>
            </div>
          `,
        )
        .join('')
    : '<div class="empty-state">暂无奖助申请记录。</div>'

  return `
    <div class="chip-row">
      ${statusBadge(student.currentRecognitionStatus)}
      <span class="badge ok">${safeText(student.currentPovertyTag)}</span>
      <span class="badge">${safeText(student.currentRecognitionLevel)}</span>
    </div>
    <div class="detail-grid">
      <div class="mini-card">
        <div class="stack-text">学院：${safeText(student.college)}</div>
        <div class="stack-text">专业：${safeText(student.major)}</div>
        <div class="stack-text">班级：${safeText(student.className)}</div>
        <div class="stack-text">年级：${safeText(student.grade)}</div>
      </div>
      <div class="mini-card">
        <div class="stack-text">联系方式：${safeText(student.phone)}</div>
        <div class="stack-text">当前认定分数：${safeText(student.currentRecognitionScore, '0')}</div>
        <div class="stack-text">确认类型：${safeText(confirmedLabels.join('、') || '无')}</div>
      </div>
    </div>
    <div class="detail-section-title">贫困认定记录</div>
    <div class="detail-list">${recognitionHtml}</div>
    <div class="detail-section-title">奖助学金记录</div>
    <div class="detail-list">${applicationHtml}</div>
  `
}

function openStudentModal(studentId) {
  const student = getStudentById(studentId)
  if (!student) {
    return
  }
  state.selectedStudent = student
  openModal({
    title: `${student.name} 学生详情`,
    subtitle: `${student.studentNo} · ${student.college} · ${student.className}`,
    body: buildStudentModalBody(student),
    footer: '<button class="secondary" id="closeModalAction" type="button">关闭</button>',
    wide: true,
  })
  document.getElementById('closeModalAction').addEventListener('click', closeModal)
}

function buildStudentPsychologyCurveHtml(curve) {
  const allPoints = Array.isArray(curve?.points) ? curve.points : []
  if (allPoints.length === 0) {
    return '<div class="empty-state">暂无可展示的心理变化曲线数据。</div>'
  }

  const range = getStudentCurveRangeDays(state.selectedStudentCurveRange)
  const points = filterCurvePointsByRange(allPoints, range)
  if (points.length === 0) {
    return '<div class="empty-state">当前时间范围内暂无可展示的心理变化曲线数据。</div>'
  }
  const selectedPointId = String(state.selectedStudentCurvePointId || '')
  const selectedPoint = points.find((point) => point.id === selectedPointId) || points[points.length - 1] || null
  const chartWidth = 760
  const chartHeight = 240
  const paddingLeft = 44
  const paddingRight = 18
  const paddingTop = 18
  const paddingBottom = 34
  const innerWidth = Math.max(1, chartWidth - paddingLeft - paddingRight)
  const innerHeight = Math.max(1, chartHeight - paddingTop - paddingBottom)
  const scoreMin = 0
  const scoreMax = 100
  const normalizeScore = (value) => Math.max(scoreMin, Math.min(scoreMax, Number(value || 0)))
  const resolveLevelClass = (levelCode) => (levelCode === 'high' ? 'warn' : levelCode === 'medium' ? 'mid' : 'ok')
  const xLabelStep = points.length <= 6 ? 1 : points.length <= 10 ? 2 : 3
  const yAxisTicks = [0, 25, 50, 75, 100]
  const qualityBands = [
    { label: '需关注', start: 0, end: 35, className: 'warn' },
    { label: '波动区', start: 35, end: 70, className: 'mid' },
    { label: '较稳定', start: 70, end: 100, className: 'ok' },
  ]
  const chartPoints = points.map((point, index) => {
    const moodScore = normalizeScore(point.moodScore ?? point.curveScore)
    const x = paddingLeft + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth)
    const y = paddingTop + ((scoreMax - moodScore) / (scoreMax - scoreMin || 1)) * innerHeight
    const themeText = normalizeStringList(point.themeTags).slice(0, 2).join('、') || point.summaryHint || '当天已记录情绪事件'
    return {
      ...point,
      moodScore,
      x,
      y,
      levelClass: resolveLevelClass(point.levelCode),
      shortLabel: String(point.label || '').slice(5) || '-',
      displayLabel: index % xLabelStep === 0 || index === points.length - 1 ? String(point.label || '').slice(5) || '-' : '',
      themeText,
      isSelected: selectedPoint ? selectedPoint.id === point.id : false,
      tooltipText: [
        `日期：${String(point.label || point.dateKey || '-')}`,
        `当天事件：${Number(point.eventCount || 0)} 条`,
        `日心情分：${moodScore}`,
        `最高风险：${levelCodeToText(point.levelCode)}`,
        `主题：${normalizeStringList(point.themeTags).slice(0, 3).join('、') || point.summaryHint || '当天已记录情绪事件'}`,
      ].join('&#10;'),
    }
  })
  const polylinePoints = chartPoints.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')
  const areaPoints = [`${paddingLeft},${chartHeight - paddingBottom}`]
    .concat(chartPoints.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`))
    .concat([`${paddingLeft + innerWidth},${chartHeight - paddingBottom}`])
    .join(' ')
  const selectedThemeList = normalizeStringList(selectedPoint?.themeTags)
  const selectedDetailHtml = selectedPoint
    ? `
      <div class="student-curve-selected-card ${resolveLevelClass(selectedPoint.levelCode)}">
        <div class="student-curve-selected-head">
          <div>
            <div class="detail-title">${safeText(selectedPoint.label || selectedPoint.dateKey)} 心情详情</div>
            <div class="subtext">节点表示当天汇总心情分，点击折线点或下方卡片可查看当天事件列表。</div>
          </div>
          <div class="chip-row">
            ${getPsychologyLevelBadge(selectedPoint.levelCode)}
            <span class="badge">心情分 ${safeText(selectedPoint.moodScore, '0')}</span>
            <span class="badge">当天 ${safeText(selectedPoint.eventCount, '0')} 条</span>
          </div>
        </div>
        <div class="detail-grid student-selected-point-grid">
          <div class="mini-card">
            <div class="stack-text">日期：${safeText(selectedPoint.label || selectedPoint.dateKey)}</div>
            <div class="stack-text">当天事件数：${safeText(selectedPoint.eventCount, '0')}</div>
            <div class="stack-text">最高风险：${safeText(levelCodeToText(selectedPoint.levelCode))}</div>
            <div class="stack-text">日摘要：${safeText(selectedPoint.summaryHint || selectedPoint.themeText)}</div>
          </div>
          <div class="mini-card">
            <div class="stack-text">主题标签</div>
            <div class="chip-row">${selectedThemeList.map((tag) => `<span class="badge">${safeText(tag)}</span>`).join('') || '<span class="subtext">暂无主题标签</span>'}</div>
          </div>
        </div>
        <div class="detail-section-title student-curve-event-title">当天事件列表</div>
        <div class="detail-list">${buildStudentCurveEventListHtml(selectedPoint)}</div>
      </div>
    `
    : ''
  return `
    <div class="student-line-chart-card">
      <div class="student-line-chart-header">
        <div>
          <div class="detail-title">心理变化折线图</div>
          <div class="subtext">一天的事件会汇总为一天的心情分，纵轴越高表示当天状态越稳定。</div>
        </div>
        <div class="student-line-chart-tools">
          <div class="student-line-chart-range" role="tablist" aria-label="心理曲线范围切换">
            <button class="${range === 7 ? 'primary' : 'inline-btn'}" type="button" data-curve-range="7">近一周</button>
            <button class="${range === 30 ? 'primary' : 'inline-btn'}" type="button" data-curve-range="30">近一个月</button>
            <button class="${range === 90 ? 'primary' : 'inline-btn'}" type="button" data-curve-range="90">近三个月</button>
          </div>
          <div class="student-line-chart-legend">
            <span class="badge ok">心情较好</span>
            <span class="badge">波动观察</span>
            <span class="badge warn">需要关注</span>
          </div>
        </div>
      </div>
      <div class="student-line-chart-wrap">
        <svg class="student-line-chart" viewBox="0 0 ${chartWidth} ${chartHeight}" preserveAspectRatio="none" aria-label="学生心理变化折线图">
          <defs>
            <linearGradient id="studentMoodLineFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="rgba(47, 128, 237, 0.24)"></stop>
              <stop offset="100%" stop-color="rgba(47, 128, 237, 0.02)"></stop>
            </linearGradient>
          </defs>
          ${qualityBands
            .map((band) => {
              const top = paddingTop + ((scoreMax - band.end) / (scoreMax - scoreMin || 1)) * innerHeight
              const height = ((band.end - band.start) / (scoreMax - scoreMin || 1)) * innerHeight
              return `
                <rect x="${paddingLeft}" y="${top.toFixed(1)}" width="${innerWidth.toFixed(1)}" height="${height.toFixed(1)}" class="student-line-chart-band ${band.className}"></rect>
                <text x="${(paddingLeft + innerWidth - 8).toFixed(1)}" y="${(top + 14).toFixed(1)}" text-anchor="end" class="student-line-chart-band-label">${band.label}</text>
              `
            })
            .join('')}
          ${yAxisTicks
            .map((tick) => {
              const y = paddingTop + ((scoreMax - tick) / (scoreMax - scoreMin || 1)) * innerHeight
              return `
                <line x1="${paddingLeft}" y1="${y.toFixed(1)}" x2="${(paddingLeft + innerWidth).toFixed(1)}" y2="${y.toFixed(1)}" class="student-line-chart-grid"></line>
                <text x="${paddingLeft - 10}" y="${(y + 4).toFixed(1)}" text-anchor="end" class="student-line-chart-axis">${tick}</text>
              `
            })
            .join('')}
          <polygon points="${areaPoints}" class="student-line-chart-area"></polygon>
          <polyline points="${polylinePoints}" class="student-line-chart-path"></polyline>
          ${chartPoints
            .map(
              (point) => `
                <line x1="${point.x.toFixed(1)}" y1="${paddingTop}" x2="${point.x.toFixed(1)}" y2="${(chartHeight - paddingBottom).toFixed(1)}" class="student-line-chart-guide"></line>
                <g class="student-line-chart-node-group ${point.levelClass} ${point.isSelected ? 'active' : ''}" data-curve-point-id="${escapeAttribute(point.id)}">
                  <circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="9" class="student-line-chart-node-ring ${point.levelClass}"></circle>
                  <circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="5" class="student-line-chart-node ${point.levelClass}">
                    <title>${point.tooltipText}</title>
                  </circle>
                  <circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="11" class="student-line-chart-node-hit">
                    <title>${point.tooltipText}</title>
                  </circle>
                </g>
                ${point.displayLabel ? `<text x="${point.x.toFixed(1)}" y="${(chartHeight - 12).toFixed(1)}" text-anchor="middle" class="student-line-chart-axis">${safeText(point.displayLabel)}</text>` : ''}
              `,
            )
            .join('')}
        </svg>
      </div>
    </div>
    ${selectedDetailHtml}
    <div class="student-curve-strip">
      ${chartPoints
        .map((point) => {
          const height = Math.max(18, Math.round((point.moodScore / 100) * 100))
          return `
            <button class="curve-point-card ${point.levelClass} ${point.isSelected ? 'active' : ''}" type="button" data-curve-point-id="${escapeAttribute(point.id)}">
              <div class="curve-point-bar-wrap">
                <div class="curve-point-bar ${point.levelClass}" style="height:${safeText(height, '18')}%;"></div>
              </div>
              <div class="curve-point-meta">
                <div class="curve-point-date">${safeText(point.shortLabel)}</div>
                <div class="curve-point-type">当天 ${safeText(point.eventCount, '0')} 条</div>
                <div class="curve-point-score">${safeText(point.moodScore, '0')}</div>
                <div class="curve-point-theme">${safeText(point.themeText)}</div>
              </div>
            </button>
          `
        })
        .join('')}
    </div>
  `
}

function buildStudentPsychologyHighlightsHtml(curve) {
  const highlights = Array.isArray(curve?.recentEventHighlights) ? curve.recentEventHighlights : []
  if (highlights.length === 0) {
    return '<div class="empty-state">暂无近期主题事件。</div>'
  }
  return highlights
    .map((item) => {
      const tags = normalizeStringList(item.themeTags)
      const tagHtml = tags.length > 0
        ? `<div class="chip-row">${tags.map((tag) => `<span class="badge">${safeText(tag)}</span>`).join('')}</div>`
        : ''
      return `
        <div class="mini-card student-highlight-card">
          <div class="stack-text"><strong>${safeText(formatDateText(item.createdAt))}</strong> · ${safeText(getCareAlertChannelLabel(item.channel))}</div>
          <div class="stack-text">${getPsychologyLevelBadge(item.levelCode)}</div>
          <div class="stack-text">${safeText(item.summaryHint || '已记录情绪事件')}</div>
          ${tagHtml}
        </div>
      `
    })
    .join('')
}

function buildStudentDetailPanelBody(student) {
  if (!student) {
    return '<div class="empty-state">未找到学生信息。</div>'
  }

  const curve = getStudentCurve(student.id)
  const recognitions = getStudentRecognitions(student.id)
  const applications = getStudentApplications(student.id)
  const confirmedLabels = Array.isArray(student.confirmedRecognitionLabels) ? student.confirmedRecognitionLabels : []
  const latestSummary = getStudentLatestPsychologySummary(student.id)

  const recognitionHtml = recognitions.length
    ? recognitions
        .map(
          (item) => `
            <div class="mini-card">
              <div class="stack-text"><strong>${formatDateText(item.submittedAt)}</strong></div>
              <div class="stack-text">${statusBadge(item.reviewStatus)}</div>
              <div class="stack-text">最终结果：${safeText(item.finalTag)} · ${safeText(item.finalLevel)} · ${safeText(item.finalScore, '0')}分</div>
              <div class="stack-text">确认类型：${safeText((item.confirmedRuleLabels || []).join('、') || '无')}</div>
            </div>
          `,
        )
        .join('')
    : '<div class="empty-state">暂无认定申请记录。</div>'

  const applicationHtml = applications.length
    ? applications
        .map(
          (item) => `
            <div class="mini-card">
              <div class="stack-text"><strong>${safeText(item.scholarshipName)}</strong></div>
              <div class="stack-text">提交时间：${formatDateText(item.submittedAt)}</div>
              <div class="stack-text">${statusBadge(item.status)}</div>
              <div class="stack-text">资格说明：${safeText(item.eligibilityResult?.reason || '无')}</div>
            </div>
          `,
        )
        .join('')
    : '<div class="empty-state">暂无奖助申请记录。</div>'

  const psychologySummaryHtml = curve
    ? `
      <div class="detail-grid student-summary-grid">
        <div class="mini-card">
          <div class="stack-text">最新风险等级：${safeText(levelCodeToText(curve.latestLevelCode))}</div>
          <div class="stack-text">趋势变化：${safeText(curve.levelChange?.text || '风险稳定')}</div>
          <div class="stack-text">最近事件时间：${safeText(formatDateText(curve.latestEventAt))}</div>
          <div class="stack-text">近阶段统计天数：${safeText(curve.pointCount, '0')}</div>
        </div>
        <div class="mini-card">
          <div class="stack-text">AI树洞/高风险AI：${safeText(curve.channelBreakdown?.aiChat, '0')} 次</div>
          <div class="stack-text">今日情绪自评：${safeText(curve.channelBreakdown?.mood, '0')} 次</div>
          <div class="stack-text">入口情绪自评：${safeText(curve.channelBreakdown?.entry, '0')} 次</div>
          <div class="stack-text">量表自评：${safeText(curve.channelBreakdown?.assessment, '0')} 次</div>
        </div>
      </div>
      <div class="mini-card student-latest-summary-card">
        <div class="stack-text"><strong>最新主题摘要</strong></div>
        <div class="stack-text">${safeText(curve.latestSummaryHint || latestSummary.latestTheme)}</div>
        <div class="chip-row">${normalizeStringList(curve.latestThemes).map((tag) => `<span class="badge">${safeText(tag)}</span>`).join('')}</div>
      </div>
    `
    : '<div class="empty-state">暂无心理画像摘要。</div>'

  return `
    <div class="chip-row">
      ${statusBadge(student.currentRecognitionStatus)}
      <span class="badge ok">${safeText(student.currentPovertyTag)}</span>
      <span class="badge">${safeText(student.currentRecognitionLevel)}</span>
      <span class="badge">${safeText(latestSummary.levelText)}</span>
      <span class="badge">${safeText(latestSummary.trendText)}</span>
    </div>
    <div class="detail-section-title">学生基础画像</div>
    <div class="detail-grid student-summary-grid">
      <div class="mini-card">
        <div class="stack-text">姓名：${safeText(student.name)} / ${safeText(student.studentNo)}</div>
        <div class="stack-text">性别：${safeText(student.gender)}</div>
        <div class="stack-text">学院：${safeText(student.college)}</div>
        <div class="stack-text">专业：${safeText(student.major)}</div>
        <div class="stack-text">班级：${safeText(student.className)}</div>
        <div class="stack-text">年级：${safeText(student.grade)}</div>
      </div>
      <div class="mini-card">
        <div class="stack-text">联系方式：${safeText(student.phone)}</div>
        <div class="stack-text">当前认定分数：${safeText(student.currentRecognitionScore, '0')}</div>
        <div class="stack-text">当前认定状态：${safeText(student.currentRecognitionStatus)}</div>
        <div class="stack-text">当前困难等级：${safeText(student.currentRecognitionLevel)}</div>
        <div class="stack-text">贫困标签：${safeText(student.currentPovertyTag)}</div>
        <div class="stack-text">已确认认定类型：${safeText(confirmedLabels.join('、') || '无')}</div>
      </div>
    </div>
    <div class="detail-section-title">资助与认定信息</div>
    <div class="detail-grid student-record-grid">
      <div>
        <div class="detail-title">贫困认定记录</div>
        <div class="detail-list">${recognitionHtml}</div>
      </div>
      <div>
        <div class="detail-title">奖助学金记录</div>
        <div class="detail-list">${applicationHtml}</div>
      </div>
    </div>
    <div class="detail-section-title">心理画像摘要</div>
    ${psychologySummaryHtml}
    <div class="detail-section-title">心理变化曲线</div>
    ${buildStudentPsychologyCurveHtml(curve)}
    <div class="detail-section-title">近期主题事件</div>
    <div class="detail-list">${buildStudentPsychologyHighlightsHtml(curve)}</div>
  `
}

function openStudentDetailPanel(studentId) {
  const student = getStudentById(studentId)
  if (!student) {
    return
  }
  state.selectedStudent = student
  state.selectedStudentCurve = getStudentCurve(student.id)
  state.selectedStudentCurveRange = 7
  const visiblePoints = filterCurvePointsByRange(state.selectedStudentCurve?.points, state.selectedStudentCurveRange)
  const latestPoint = Array.isArray(visiblePoints) ? visiblePoints[visiblePoints.length - 1] : null
  state.selectedStudentCurvePointId = latestPoint?.id || ''
  const heading = document.getElementById('studentDetailHeading')
  const subheading = document.getElementById('studentDetailSubheading')
  const body = document.getElementById('studentDetailPanelBody')
  if (heading) {
    heading.textContent = `${student.name} 学生详情`
  }
  if (subheading) {
    subheading.textContent = `${student.studentNo} · ${student.college} · ${student.className}`
  }
  if (body) {
    body.innerHTML = buildStudentDetailPanelBody(student)
  }
  bindStudentCurveInteractions()
  setActivePanel('student-detail')
}

function bindStudentCurveInteractions() {
  const body = document.getElementById('studentDetailPanelBody')
  if (!body) {
    return
  }
  body.querySelectorAll('[data-curve-range]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextRange = getStudentCurveRangeDays(button.dataset.curveRange || state.selectedStudentCurveRange)
      state.selectedStudentCurveRange = nextRange
      const visiblePoints = filterCurvePointsByRange(state.selectedStudentCurve?.points, nextRange)
      const selectedStillVisible = visiblePoints.some((point) => point.id === state.selectedStudentCurvePointId)
      if (!selectedStillVisible) {
        state.selectedStudentCurvePointId = visiblePoints[visiblePoints.length - 1]?.id || ''
      }
      renderStudentDetailPanel()
    })
  })
  body.querySelectorAll('[data-curve-point-id]').forEach((node) => {
    node.addEventListener('click', () => {
      const pointId = String(node.dataset.curvePointId || '').trim()
      if (!pointId) {
        return
      }
      state.selectedStudentCurvePointId = pointId
      renderStudentDetailPanel()
    })
  })
}

function renderStudentDetailPanel() {
  const body = document.getElementById('studentDetailPanelBody')
  const heading = document.getElementById('studentDetailHeading')
  const subheading = document.getElementById('studentDetailSubheading')
  if (!body || !heading || !subheading) {
    return
  }
  if (!state.selectedStudent) {
    heading.textContent = '学生详情'
    subheading.textContent = '查看学生完整画像、资助记录与心理变化趋势。'
    body.innerHTML = '<div class="empty-state">请先从学生列表选择一位学生。</div>'
    return
  }
  heading.textContent = `${state.selectedStudent.name} 学生详情`
  subheading.textContent = `${state.selectedStudent.studentNo} · ${state.selectedStudent.college} · ${state.selectedStudent.className}`
  body.innerHTML = buildStudentDetailPanelBody(state.selectedStudent)
  bindStudentCurveInteractions()
}

function buildRecognitionDetailBody(record, readonly) {
  const student = getStudentById(record.studentId)
  const profile = record.profile || {}
  const selectedRuleIds = Array.isArray(record.selectedRuleIds) ? record.selectedRuleIds : []
  const hasConfirmedRuleIds = Array.isArray(record.confirmedRuleIds) && record.confirmedRuleIds.length > 0
  const confirmedRuleIds = hasConfirmedRuleIds
    ? record.confirmedRuleIds
    : record.reviewStatus === '待审核'
      ? selectedRuleIds
      : []
  const confirmedIds = new Set(confirmedRuleIds)
  const ruleLabelMap = state.recognitionRules.reduce((acc, rule) => {
    acc[rule.id] = rule.label
    return acc
  }, {})
  const selectedLabels =
    Array.isArray(record.selectedRuleLabels) && record.selectedRuleLabels.length > 0
      ? record.selectedRuleLabels
      : selectedRuleIds.map((id) => ruleLabelMap[id]).filter(Boolean)
  const confirmedLabels =
    Array.isArray(record.confirmedRuleLabels) && record.confirmedRuleLabels.length > 0
      ? record.confirmedRuleLabels
      : confirmedRuleIds.map((id) => ruleLabelMap[id]).filter(Boolean)
  const selectedSummary = summarizeRecognitionRules(selectedRuleIds)
  const confirmedSummary = summarizeRecognitionRules(confirmedRuleIds)
  const attachmentCount = Array.isArray(record.attachments) ? record.attachments.length : 0
  const pendingElapsed = record.reviewStatus === '待审核' ? formatElapsedSince(record.submittedAt) : '-'
  const reviewElapsed = formatElapsedBetween(record.submittedAt, record.reviewedAt)

  const ruleHtml = state.recognitionRules
    .filter((rule) => !rule.manualScore && !rule.clearOnTrue)
    .map((rule) => {
      if (readonly) {
        return confirmedIds.has(rule.id)
          ? `
            <div class="mini-card">
              <div class="stack-text"><strong>${safeText(rule.no, '')}. ${safeText(rule.label)}</strong></div>
              <div class="subtext">${safeText(rule.evidence)}</div>
            </div>
          `
          : ''
      }
      return `
        <label class="rule-item">
          <input type="checkbox" value="${safeText(rule.id, '')}" ${confirmedIds.has(rule.id) ? 'checked' : ''} />
          <div>
            <div>${safeText(rule.no, '')}. ${safeText(rule.label)}（${safeText(rule.score, '0')}分）</div>
            <div class="subtext">${safeText(rule.evidence)}</div>
          </div>
        </label>
      `
    })
    .filter(Boolean)
    .join('') || '<div class="empty-state">暂无确认规则。</div>'

  const baseInfo = `
    <div class="chip-row">
      ${statusBadge(record.reviewStatus)}
      <span class="badge">学年：${safeText(record.academicYear || '-')}</span>
      <span class="badge">附件：${safeText(attachmentCount, '0')}份</span>
    </div>
    <div class="detail-grid">
      <div class="mini-card">
        <div class="stack-text"><strong>学生信息</strong></div>
        <div class="stack-text">姓名：${safeText(profile.name)} / ${safeText(profile.studentNo)}</div>
        <div class="stack-text">学院：${safeText(profile.college)} / ${safeText(profile.major)}</div>
        <div class="stack-text">班级：${safeText(profile.className)} / ${safeText(profile.grade)}</div>
        <div class="stack-text">联系方式：${safeText(profile.phone || '-')}</div>
      </div>
      <div class="mini-card">
        <div class="stack-text"><strong>认定快照</strong></div>
        <div class="stack-text">当前标签：${safeText(student?.currentPovertyTag || '未认定')} · ${safeText(student?.currentRecognitionLevel || '未认定')}</div>
        <div class="stack-text">系统预估：${safeText(record.systemTag)} · ${safeText(record.systemLevel)} · ${safeText(record.systemScore, '0')}分</div>
        <div class="stack-text">最终结果：${safeText(record.finalTag)} · ${safeText(record.finalLevel)} · ${safeText(record.finalScore, '0')}分</div>
      </div>
    </div>
    <div class="detail-grid">
      <div class="mini-card">
        <div class="stack-text"><strong>学生填报摘要</strong></div>
        <div class="stack-text">直达困难项：${safeText(selectedSummary.directCount, '0')}条（${safeText(selectedSummary.directScore, '0')}分）</div>
        <div class="stack-text">累计项：${safeText(selectedSummary.accumulateCount, '0')}条（${safeText(selectedSummary.accumulateScore, '0')}分）</div>
        <div class="stack-text">学生补充说明：${safeText(record.supplementalNote || '无')}</div>
      </div>
      <div class="mini-card">
        <div class="stack-text"><strong>审核进度</strong></div>
        <div class="stack-text">提交时间：${formatDateText(record.submittedAt)}</div>
        <div class="stack-text">待处理时长：${safeText(pendingElapsed)}</div>
        <div class="stack-text">审核时间：${formatDateText(record.reviewedAt)}</div>
        <div class="stack-text">审核耗时：${safeText(reviewElapsed)}</div>
      </div>
    </div>
    <div class="detail-section-title">学生勾选规则</div>
    <div class="detail-list">${buildTextItemListHtml(selectedLabels, '未勾选规则。')}</div>
    <div class="detail-section-title">学生材料清单</div>
    <div class="detail-list">${buildTextItemListHtml(record.materials, '未填写材料说明。')}</div>
    <div class="detail-section-title">附件材料（${safeText(attachmentCount, '0')}份）</div>
    <div class="detail-list">${buildAttachmentListHtml(record.attachments)}</div>
  `

  if (readonly) {
    return `
      ${baseInfo}
      <div class="detail-grid">
        <div class="mini-card">
          <div class="stack-text"><strong>审核结果</strong></div>
          <div class="stack-text">审核状态：${statusBadge(record.reviewStatus)}</div>
          <div class="stack-text">老师加分：${safeText(record.teacherAdjustScore, '0')}</div>
          <div class="stack-text">清零处理：${record.clearInvalid ? '已触发' : '未触发'}</div>
          <div class="stack-text">审核意见：${safeText(record.reviewComment || '无')}</div>
        </div>
        <div class="mini-card">
          <div class="stack-text"><strong>确认后规则构成</strong></div>
          <div class="stack-text">直达困难项：${safeText(confirmedSummary.directCount, '0')}条（${safeText(confirmedSummary.directScore, '0')}分）</div>
          <div class="stack-text">累计项：${safeText(confirmedSummary.accumulateCount, '0')}条（${safeText(confirmedSummary.accumulateScore, '0')}分）</div>
          <div class="stack-text">确认类型：${safeText(confirmedLabels.join('、') || '无')}</div>
        </div>
      </div>
      <div class="detail-section-title">确认规则明细</div>
      <div class="detail-list">${ruleHtml}</div>
    `
  }

  return `
    ${baseInfo}
    <div class="field">
      <label>逐项确认（仅用于最终认定，37/38项在下方单独处理）</label>
      <div class="rule-list">${ruleHtml}</div>
    </div>
    <div class="two-col">
      <div class="field">
        <label>审核状态</label>
        <select id="recognitionReviewStatus">
          <option value="审核通过" ${record.reviewStatus === '审核通过' ? 'selected' : ''}>审核通过</option>
          <option value="退回补充" ${record.reviewStatus === '退回补充' ? 'selected' : ''}>退回补充</option>
          <option value="驳回" ${record.reviewStatus === '驳回' ? 'selected' : ''}>驳回</option>
        </select>
      </div>
      <div class="field">
        <label>37项老师酌情加分</label>
        <input id="recognitionBonus" type="number" min="0" value="${safeText(record.teacherAdjustScore || 0, '0')}" />
      </div>
    </div>
    <div class="field">
      <label><input id="recognitionClearInvalid" type="checkbox" ${record.clearInvalid ? 'checked' : ''} /> 38项：提供虚假佐证材料，触发清零</label>
      <div class="subtext">触发后最终分数将直接清零，系统等级同步重算为“未认定”。</div>
    </div>
    <div class="field">
      <label>审核意见</label>
      <textarea id="recognitionComment" placeholder="请说明通过/退回/驳回原因，学生会在“我的-认定状态”看到该意见。">${safeText(record.reviewComment || '', '')}</textarea>
    </div>
  `
}

function openRecognitionModal(recognitionId) {
  const record = state.recognitions.find((item) => item.id === recognitionId)
  if (!record) {
    return
  }
  state.selectedRecognition = record
  const readonly = isRecognitionReadonly(record)
  openModal({
    title: readonly ? '认定申请详情' : '认定申请审核',
    subtitle: `${record.profile.name} · ${record.profile.studentNo}`,
    body: buildRecognitionDetailBody(record, readonly),
    footer: readonly
      ? '<button class="secondary" id="closeModalAction" type="button">关闭</button>'
      : '<button class="secondary" id="closeModalAction" type="button">取消</button><button class="primary" id="saveRecognitionReview" type="button">保存审核结果</button>',
    wide: true,
  })
  document.getElementById('closeModalAction').addEventListener('click', closeModal)
  if (!readonly) {
    document.getElementById('saveRecognitionReview').addEventListener('click', submitRecognitionReview)
  }
}

function renderRecognitionTable() {
  const tbody = document.getElementById('recognitionTable')
  const keyword = normalizeText(document.getElementById('recognitionKeywordFilter').value)
  const collegeKey = document.getElementById('recognitionCollegeFilter').value
  const level = document.getElementById('recognitionLevelFilter').value
  const status = document.getElementById('recognitionStatusFilter').value
  const list = state.recognitions.filter((item) => {
    if (keyword && !normalizeText(item.profile.name).includes(keyword) && !normalizeText(item.profile.studentNo).includes(keyword)) {
      return false
    }
    if (collegeKey && getRecognitionCollegeKey(item) !== collegeKey) {
      return false
    }
    if (level && getRecognitionFilterLevel(item) !== level) {
      return false
    }
    if (status && item.reviewStatus !== status) {
      return false
    }
    return true
  })

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">暂无符合条件的认定申请。</td></tr>'
    return
  }

  tbody.innerHTML = list
    .map(
      (item) => `
        <tr>
          <td>${safeText(item.profile.name)}<div class="subtext">${safeText(item.profile.studentNo)}</div></td>
          <td>${safeText(item.profile.college)}</td>
          <td>${safeText(getRecognitionFilterLevel(item))} · ${safeText(item.systemTag)}<div class="subtext">${safeText(item.systemScore, '0')}分</div></td>
          <td>${statusBadge(item.reviewStatus)}</td>
          <td>${formatDateText(item.submittedAt)}</td>
          <td><button class="inline-btn" data-recognition-id="${safeText(item.id, '')}" type="button">${getRecognitionActionLabel(item)}</button></td>
        </tr>
      `,
    )
    .join('')

  tbody.querySelectorAll('[data-recognition-id]').forEach((button) => {
    button.addEventListener('click', () => openRecognitionModal(button.dataset.recognitionId))
  })
}

function openScholarshipModal(scholarshipId) {
  const item = state.scholarships.find((entry) => entry.id === scholarshipId)
  if (!item) {
    return
  }
  state.selectedScholarship = item
  openModal({
    title: '奖助学金编辑',
    subtitle: `${item.name} · ${getCategoryLabel(item.category)}`,
    body: `
      <div class="meta-list">
        <div>奖助分类：${safeText(getCategoryLabel(item.category))}</div>
        <div>资助类型：${safeText(item.type)}</div>
        <div>资助方：${safeText(item.sponsor)}</div>
        <div>金额档位：${safeText((item.amountTiers || []).map((tier) => `${tier.label}:${tier.amount}`).join('；') || '无')}</div>
      </div>
      <div class="field">
        <label>奖助学金名称</label>
        <input id="scholarshipName" value="${safeText(item.name, '')}" />
      </div>
      <div class="field">
        <label>金额展示</label>
        <input id="scholarshipAmountText" value="${safeText(item.amountText, '')}" />
      </div>
      <div class="field">
        <label>资格说明</label>
        <textarea id="scholarshipRestrictionNote">${safeText(item.restrictionNote || '', '')}</textarea>
      </div>
      <div class="field">
        <label>项目指引</label>
        <textarea id="scholarshipGuide">${safeText(item.guide || '', '')}</textarea>
      </div>
      <div class="field">
        <label>限定认定类型（逗号分隔，如 R04,R15）</label>
        <input id="scholarshipRuleIds" value="${safeText((item.allowedRecognitionRuleIds || []).join(','), '')}" />
      </div>
      <div class="field">
        <label>截止时间</label>
        <input id="scholarshipDeadline" value="${safeText(item.deadline || '', '')}" />
      </div>
      <div class="field">
        <label><input id="scholarshipOpenForApply" type="checkbox" ${item.openForApply ? 'checked' : ''} /> 开放申请</label>
      </div>
    `,
    footer: '<button class="secondary" id="closeModalAction" type="button">取消</button><button class="primary" id="saveScholarship" type="button">保存项目</button>',
    wide: true,
  })
  document.getElementById('closeModalAction').addEventListener('click', closeModal)
  document.getElementById('saveScholarship').addEventListener('click', submitScholarshipEdit)
}

function renderScholarshipTable() {
  const tbody = document.getElementById('scholarshipTable')
  const keyword = normalizeText(document.getElementById('scholarshipKeywordFilter').value)
  const category = document.getElementById('scholarshipCategoryFilter').value
  const type = document.getElementById('scholarshipTypeFilter').value
  const openStatus = document.getElementById('scholarshipOpenFilter').value
  const list = state.scholarships.filter((item) => {
    if (keyword && !normalizeText(item.name).includes(keyword) && !normalizeText(item.sponsor).includes(keyword)) {
      return false
    }
    if (category && item.category !== category) {
      return false
    }
    if (type && item.type !== type) {
      return false
    }
    if (openStatus === 'open' && !item.openForApply) {
      return false
    }
    if (openStatus === 'closed' && item.openForApply) {
      return false
    }
    return true
  })

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">暂无符合条件的奖助学金。</td></tr>'
    return
  }

  tbody.innerHTML = list
    .map(
      (item) => `
        <tr>
          <td>${safeText(item.name)}<div class="subtext">${safeText(getCategoryLabel(item.category))}</div></td>
          <td>${safeText(item.type)}</td>
          <td>${safeText(item.amountText)}</td>
          <td>${safeText(item.restrictionNote)}</td>
          <td>${item.openForApply ? '<span class="badge ok">开放</span>' : '<span class="badge warn">关闭</span>'}</td>
          <td><button class="inline-btn" data-scholarship-id="${safeText(item.id, '')}" type="button">编辑</button></td>
        </tr>
      `,
    )
    .join('')

  tbody.querySelectorAll('[data-scholarship-id]').forEach((button) => {
    button.addEventListener('click', () => openScholarshipModal(button.dataset.scholarshipId))
  })
}

function buildApplicationDetailBody(item, readonly) {
  const student = getStudentById(item.studentId)
  const recognitionSnapshot = item.recognitionSnapshot || {}
  const eligibilityResult = item.eligibilityResult || {}
  const applySummary = item.applySummary || {}
  const materials = Array.isArray(item.materials) ? item.materials : []
  const attachments = Array.isArray(item.attachments) ? item.attachments : []
  const pendingElapsed = item.status === '待审核' ? formatElapsedSince(item.submittedAt) : '-'
  const reviewElapsed = formatElapsedBetween(item.submittedAt, item.reviewedAt)
  const grantTierText = eligibilityResult.grantTier
    ? `${eligibilityResult.grantTier.label || '-'} · ${eligibilityResult.grantTier.amount || '-'}`
    : '无分档'
  const lockHint = eligibilityResult.locked ? '（当前申请已触发同学年互斥规则）' : ''

  const baseInfo = `
    <div class="chip-row">
      ${statusBadge(item.status)}
      <span class="badge">学年：${safeText(item.academicYear || '-')}</span>
      <span class="badge">材料：${safeText(materials.length, '0')}项</span>
    </div>
    <div class="detail-grid">
      <div class="mini-card">
        <div class="stack-text"><strong>学生信息</strong></div>
        <div class="stack-text">姓名：${safeText(student?.name || item.studentId)} / ${safeText(student?.studentNo || '-')}</div>
        <div class="stack-text">学院：${safeText(student?.college || '未知')} / ${safeText(student?.major || '-')}</div>
        <div class="stack-text">班级：${safeText(student?.className || '-')} / ${safeText(student?.grade || '-')}</div>
        <div class="stack-text">联系方式：${safeText(student?.phone || '-')}</div>
      </div>
      <div class="mini-card">
        <div class="stack-text"><strong>项目信息</strong></div>
        <div class="stack-text">项目：${safeText(item.scholarshipName)}</div>
        <div class="stack-text">项目类型：${safeText(item.scholarshipType || '-')}</div>
        <div class="stack-text">项目分类：${safeText(getCategoryLabel(getApplicationCategory(item)) || '未分类')}</div>
        <div class="stack-text">提交时间：${formatDateText(item.submittedAt)}</div>
      </div>
    </div>
    <div class="detail-grid">
      <div class="mini-card">
        <div class="stack-text"><strong>认定快照</strong></div>
        <div class="stack-text">标签：${safeText(recognitionSnapshot.tag || '未认定')} · ${safeText(recognitionSnapshot.level || '未认定')}</div>
        <div class="stack-text">分数：${safeText(recognitionSnapshot.score, '0')}分</div>
        <div class="stack-text">认定类型：${safeText((recognitionSnapshot.confirmedRecognitionLabels || []).join('、') || '无')}</div>
      </div>
      <div class="mini-card">
        <div class="stack-text"><strong>资格判断</strong></div>
        <div class="stack-text">结果：${eligibilityResult.eligible ? '<span class="badge ok">符合</span>' : '<span class="badge warn">不符合</span>'}</div>
        <div class="stack-text">原因：${safeText(eligibilityResult.reason || '无')}${safeText(lockHint, '')}</div>
        <div class="stack-text">国家助学金分档：${safeText(grantTierText)}</div>
      </div>
    </div>
    <div class="detail-grid">
      <div class="mini-card">
        <div class="stack-text"><strong>流程进度</strong></div>
        <div class="stack-text">待处理时长：${safeText(pendingElapsed)}</div>
        <div class="stack-text">审核时间：${formatDateText(item.reviewedAt)}</div>
        <div class="stack-text">审核耗时：${safeText(reviewElapsed)}</div>
      </div>
      <div class="mini-card">
        <div class="stack-text"><strong>学生说明</strong></div>
        <div class="stack-text">个人简介：${safeText(applySummary.personalIntro || '无')}</div>
        <div class="stack-text">家庭情况：${safeText(applySummary.familySituation || '无')}</div>
        <div class="stack-text">使用计划：${safeText(applySummary.usagePlan || '无')}</div>
        <div class="stack-text">备注：${safeText(item.comment || '无')}</div>
      </div>
    </div>
    <div class="detail-section-title">申请材料清单</div>
    <div class="detail-list">${buildTextItemListHtml(materials, '未提交材料说明。')}</div>
    <div class="detail-section-title">附件材料（${safeText(attachments.length, '0')}份）</div>
    <div class="detail-list">${buildAttachmentListHtml(attachments)}</div>
  `

  if (readonly) {
    return `
      ${baseInfo}
      <div class="detail-grid">
        <div class="mini-card">
          <div class="stack-text"><strong>审核结果</strong></div>
          <div class="stack-text">审核状态：${statusBadge(item.status)}</div>
          <div class="stack-text">审核意见：${safeText(item.reviewComment || '无')}</div>
        </div>
        <div class="mini-card">
          <div class="stack-text"><strong>回显提醒</strong></div>
          <div class="stack-text">学生端“我的奖助申请”会展示当前审核状态和审核意见。</div>
        </div>
      </div>
    `
  }

  return `
    ${baseInfo}
    <div class="field">
      <label>审核状态</label>
      <select id="applicationReviewStatus">
        <option value="审核通过" ${item.status === '审核通过' ? 'selected' : ''}>审核通过</option>
        <option value="驳回" ${item.status === '驳回' ? 'selected' : ''}>驳回</option>
      </select>
    </div>
    <div class="field">
      <label>审核意见</label>
      <textarea id="applicationReviewComment" placeholder="请说明通过依据或驳回原因，学生端将直接展示该内容。">${safeText(item.reviewComment || '', '')}</textarea>
    </div>
  `
}

function openApplicationModal(applicationId) {
  const item = state.applications.find((entry) => entry.id === applicationId)
  if (!item) {
    return
  }
  state.selectedApplication = item
  const readonly = isApplicationReadonly(item)
  openModal({
    title: readonly ? '奖助申请详情' : '奖助申请审核',
    subtitle: `${safeText(item.scholarshipName)} · ${safeText(getStudentById(item.studentId)?.name || item.studentId)}`,
    body: buildApplicationDetailBody(item, readonly),
    footer: readonly
      ? '<button class="secondary" id="closeModalAction" type="button">关闭</button>'
      : '<button class="secondary" id="closeModalAction" type="button">取消</button><button class="primary" id="saveApplicationReview" type="button">保存审核结果</button>',
    wide: false,
  })
  document.getElementById('closeModalAction').addEventListener('click', closeModal)
  if (!readonly) {
    document.getElementById('saveApplicationReview').addEventListener('click', submitApplicationReview)
  }
}

function renderAnnouncementTable() {
  const tbody = document.getElementById('announcementTable')
  const keyword = normalizeText(document.getElementById('announcementKeywordFilter').value)
  const publisher = document.getElementById('announcementPublisherFilter').value
  const list = state.announcements.filter((item) => {
    if (keyword && !normalizeText(item.title).includes(keyword) && !normalizeText(item.publisher).includes(keyword)) {
      return false
    }
    if (publisher && item.publisher !== publisher) {
      return false
    }
    return true
  })

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">暂无符合条件的公告。</td></tr>'
    return
  }

  tbody.innerHTML = list
    .map(
      (item) => `
        <tr>
          <td><img class="table-cover previewable" src="${escapeAttribute(getAnnouncementCover(item.coverImage))}" alt="公告封面" data-preview-src="${escapeAttribute(getAnnouncementCover(item.coverImage))}" data-preview-title="公告封面：${escapeAttribute(item.title || '未命名')}" /></td>
          <td>${safeText(item.title)}<div class="subtext">${safeText(item.content || '').slice(0, 48)}</div></td>
          <td>${safeText(item.publisher)}</td>
          <td>${formatDateText(item.publishedAt)}</td>
          <td>${safeText((item.attachments || []).length, '0')}</td>
          <td><button class="inline-btn" data-announcement-id="${safeText(item.id, '')}" type="button">编辑</button></td>
        </tr>
      `,
    )
    .join('')

  tbody.querySelectorAll('[data-announcement-id]').forEach((button) => {
    button.addEventListener('click', () => openAnnouncementModal(button.dataset.announcementId))
  })
  bindImagePreviewClicks(tbody)
}

function renderAnnouncementAttachmentList() {
  const list = Array.isArray(state.currentAnnouncementAttachments) ? state.currentAnnouncementAttachments : []
  const target = document.getElementById('announcementAttachmentList')
  if (!target) {
    return
  }
  if (list.length === 0) {
    target.innerHTML = '<div class="empty-state">暂无附件</div>'
    return
  }
  target.innerHTML = list
    .map(
      (item, index) => `
        <div class="attachment-item">
          <span>${safeText(item.name)}（${safeText(item.sizeLabel || '-', '-')}）</span>
          <span>
            <a class="inline-btn" href="${escapeAttribute(getAttachmentHref(item))}" download="${escapeAttribute(item.name)}">下载</a>
            <button class="danger" data-announcement-attachment-index="${index}" type="button">删除</button>
          </span>
        </div>
      `,
    )
    .join('')
  target.querySelectorAll('[data-announcement-attachment-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const removeIndex = Number(button.dataset.announcementAttachmentIndex)
      state.currentAnnouncementAttachments = list.filter((_, idx) => idx !== removeIndex)
      renderAnnouncementAttachmentList()
    })
  })
}

function buildCampusMomentImagePreview(item) {
  const imageList = getCampusMomentImageList(item)
  if (imageList.length === 0) {
    return '<span class="subtext">无图片</span>'
  }
  const firstImage = imageList[0]
  const countText = imageList.length > 1 ? `<div class="subtext">共${safeText(imageList.length, '1')}张</div>` : ''
  return `
    <div>
      <img class="table-cover previewable" src="${escapeAttribute(firstImage)}" alt="校园点滴图片" data-preview-src="${escapeAttribute(firstImage)}" data-preview-title="校园点滴图片预览" />
      ${countText}
    </div>
  `
}

function formatCampusMomentSubmitMeta(item) {
  const submittedAt = formatDateText(item.submittedAt)
  const reviewedAt = item.reviewedAt ? formatDateText(item.reviewedAt) : '-'
  return `提交：${submittedAt}<div class="subtext">审核：${reviewedAt}</div>`
}

async function addAnnouncementCoverAttachment() {
  const fileInput = document.getElementById('announcementCoverAttachmentFile')
  if (!fileInput.files || fileInput.files.length === 0) {
    alert('请先选择封面图片')
    return
  }
  const file = fileInput.files[0]
  const arrayBuffer = await file.arrayBuffer()
  const coverAttachment = {
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: Number(file.size || 0),
    contentBase64: arrayBufferToBase64(arrayBuffer),
  }
  const coverDataUrl = toDataUrl(coverAttachment)
  state.currentAnnouncementCoverAttachment = coverAttachment
  state.currentAnnouncementCoverImage = coverDataUrl
  const coverInput = document.getElementById('announcementCoverImage')
  coverInput.value = coverDataUrl
  const coverPreview = document.getElementById('announcementCoverPreview')
  coverPreview.src = coverDataUrl
  const coverName = document.getElementById('announcementCoverAttachmentName')
  coverName.textContent = `已上传：${file.name}`
  fileInput.value = ''
}

function clearAnnouncementCoverAttachment() {
  state.currentAnnouncementCoverAttachment = null
  state.currentAnnouncementCoverImage = ''
  const coverInput = document.getElementById('announcementCoverImage')
  coverInput.value = ''
  const coverPreview = document.getElementById('announcementCoverPreview')
  coverPreview.src = getDefaultAnnouncementCover()
  const coverName = document.getElementById('announcementCoverAttachmentName')
  coverName.textContent = ''
  const fileInput = document.getElementById('announcementCoverAttachmentFile')
  if (fileInput) {
    fileInput.value = ''
  }
}

async function addAnnouncementAttachment() {
  const fileInput = document.getElementById('announcementAttachmentFile')
  if (!fileInput.files || fileInput.files.length === 0) {
    alert('请先选择文件')
    return
  }
  const file = fileInput.files[0]
  const arrayBuffer = await file.arrayBuffer()
  const attachment = {
    id: `attachment-${Date.now()}`,
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: Number(file.size || 0),
    sizeLabel: bytesToSizeLabel(file.size || 0),
    contentBase64: arrayBufferToBase64(arrayBuffer),
  }
  state.currentAnnouncementAttachments = (Array.isArray(state.currentAnnouncementAttachments) ? state.currentAnnouncementAttachments : []).concat(attachment)
  renderAnnouncementAttachmentList()
  fileInput.value = ''
}

function openAnnouncementModal(announcementId) {
  const item = announcementId ? state.announcements.find((entry) => entry.id === announcementId) : null
  const isEdit = Boolean(item)
  state.selectedAnnouncement = item
  state.currentAnnouncementAttachments = Array.isArray(item?.attachments) ? [...item.attachments] : []
  state.currentAnnouncementCoverAttachment = null
  state.currentAnnouncementCoverImage = ''
  const coverImage = getAnnouncementCover(item?.coverImage || '')
  openModal({
    title: isEdit ? '编辑公告' : '新增公告',
    subtitle: isEdit ? `${safeText(item?.title)} · ${safeText(item?.publisher)}` : '请填写公告封面、标题、内容与附件',
    body: `
      <div class="field">
        <label>公告封面（图片附件上传）</label>
        <div class="attachment-uploader">
          <div class="attachment-row">
            <input id="announcementCoverAttachmentFile" type="file" accept="image/*" />
            <button id="announcementCoverAttachmentAddBtn" class="secondary" type="button">上传封面</button>
            <button id="announcementCoverAttachmentClearBtn" class="inline-btn" type="button">移除封面</button>
          </div>
          <div id="announcementCoverAttachmentName" class="cover-fallback"></div>
        </div>
      </div>
      <div class="field hidden">
        <input id="announcementCoverImage" value="${escapeAttribute(coverImage)}" />
      </div>
      <div class="field">
        <img id="announcementCoverPreview" class="cover-preview" src="${escapeAttribute(coverImage)}" alt="封面预览" />
        <div class="cover-fallback">封面将以图片附件形式保存，不再使用外链 URL。</div>
      </div>
      <div class="two-col">
        <div class="field">
          <label>公告标题</label>
          <input id="announcementTitle" value="${escapeAttribute(item?.title || '')}" />
        </div>
        <div class="field">
          <label>发布人</label>
          <input id="announcementPublisher" value="${escapeAttribute(item?.publisher || '学生资助管理中心')}" />
        </div>
      </div>
      <div class="field">
        <label>公告内容</label>
        <textarea id="announcementContent">${item?.content ? safeText(item.content, '') : ''}</textarea>
      </div>
      <div class="field">
        <label>公告附件</label>
        <div class="attachment-uploader">
          <div class="attachment-row">
            <input id="announcementAttachmentFile" type="file" />
            <button id="announcementAttachmentAddBtn" class="secondary" type="button">添加附件</button>
            <button id="announcementAttachmentClearBtn" class="inline-btn" type="button">清空附件</button>
          </div>
          <div id="announcementAttachmentList" class="attachment-list"></div>
        </div>
      </div>
    `,
    footer:
      '<button class="secondary" id="closeModalAction" type="button">取消</button><button class="primary" id="saveAnnouncement" type="button">保存公告</button>',
    wide: true,
  })
  document.getElementById('closeModalAction').addEventListener('click', closeModal)
  document.getElementById('saveAnnouncement').addEventListener('click', submitAnnouncement)
  document.getElementById('announcementCoverAttachmentAddBtn').addEventListener('click', addAnnouncementCoverAttachment)
  document.getElementById('announcementCoverAttachmentClearBtn').addEventListener('click', clearAnnouncementCoverAttachment)
  document.getElementById('announcementAttachmentAddBtn').addEventListener('click', addAnnouncementAttachment)
  document.getElementById('announcementAttachmentClearBtn').addEventListener('click', () => {
    state.currentAnnouncementAttachments = []
    renderAnnouncementAttachmentList()
  })
  renderAnnouncementAttachmentList()
}

async function submitAnnouncement() {
  const title = document.getElementById('announcementTitle').value.trim()
  const content = document.getElementById('announcementContent').value.trim()
  const publisher = document.getElementById('announcementPublisher').value.trim() || '学生资助管理中心'
  const coverImage = state.currentAnnouncementCoverImage || document.getElementById('announcementCoverImage').value.trim() || getDefaultAnnouncementCover()
  const coverImageAttachment = state.currentAnnouncementCoverAttachment
  const attachments = Array.isArray(state.currentAnnouncementAttachments) ? state.currentAnnouncementAttachments : []
  if (!title || !content) {
    alert('公告标题和内容不能为空')
    return
  }
  if (!coverImageAttachment && !state.selectedAnnouncement) {
    alert('请上传公告封面图片')
    return
  }
  if (state.selectedAnnouncement) {
    await api(`/api/teacher/announcements/${state.selectedAnnouncement.id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, content, publisher, coverImage, coverImageAttachment, attachments }),
    })
  } else {
    await api('/api/teacher/announcements', {
      method: 'POST',
      body: JSON.stringify({ title, content, publisher, coverImage, coverImageAttachment, attachments }),
    })
  }
  await loadAll()
  closeModal()
  alert('公告已保存')
}

function renderApplicationTable() {
  const tbody = document.getElementById('applicationTable')
  const keyword = normalizeText(document.getElementById('applicationKeywordFilter').value)
  const category = document.getElementById('applicationCategoryFilter').value
  const recognitionLevel = document.getElementById('applicationRecognitionFilter').value
  const status = document.getElementById('applicationStatusFilter').value
  const list = state.applications.filter((item) => {
    const student = getStudentById(item.studentId)
    const scholarshipCategory = getApplicationCategory(item)
    if (
      keyword &&
      !normalizeText(student?.name).includes(keyword) &&
      !normalizeText(student?.studentNo).includes(keyword) &&
      !normalizeText(item.scholarshipName).includes(keyword)
    ) {
      return false
    }
    if (category && scholarshipCategory !== category) {
      return false
    }
    if (recognitionLevel && item.recognitionSnapshot.level !== recognitionLevel) {
      return false
    }
    if (status && item.status !== status) {
      return false
    }
    return true
  })

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">暂无符合条件的奖助申请。</td></tr>'
    return
  }

  tbody.innerHTML = list
    .map((item) => {
      const student = getStudentById(item.studentId)
      return `
        <tr>
          <td>${safeText(student?.name || item.studentId)}<div class="subtext">${safeText(student?.studentNo || '')}</div></td>
          <td>${safeText(item.scholarshipName)}<div class="subtext">${safeText(getCategoryLabel(getApplicationCategory(item)) || '未分类')}</div></td>
          <td>${safeText(item.recognitionSnapshot.tag)} · ${safeText(item.recognitionSnapshot.level)}<div class="subtext">${safeText(item.recognitionSnapshot.score, '0')}分</div></td>
          <td>${statusBadge(item.status)}</td>
          <td>
            ${formatDateText(item.submittedAt)}
            <div class="subtext">待处理：${safeText(item.status === '待审核' ? formatElapsedSince(item.submittedAt) : '-')}</div>
          </td>
          <td><button class="inline-btn" data-application-id="${safeText(item.id, '')}" type="button">${getApplicationActionLabel(item)}</button></td>
        </tr>
      `
    })
    .join('')

  tbody.querySelectorAll('[data-application-id]').forEach((button) => {
    button.addEventListener('click', () => openApplicationModal(button.dataset.applicationId))
  })
}

function buildWorkStudyDetailBody(item, readonly) {
  const pendingElapsed = item.status === '待审核' ? formatElapsedSince(item.submittedAt) : '-'
  const reviewElapsed = formatElapsedBetween(item.submittedAt, item.reviewedAt)
  const slotText = item.availableSlots.length > 0 ? item.availableSlots.join('、') : '未填写'
  const skillTagText = item.skillTags.length > 0 ? item.skillTags.join('、') : '未填写'
  const reasonsHtml = buildTextItemListHtml(item.matchReasons, '暂无匹配说明。')
  const baseInfo = `
    <div class="chip-row">
      ${statusBadge(item.status)}
      <span class="badge">匹配度：${safeText(item.matchLevel)} · ${safeText(item.matchScore, '0')}分</span>
    </div>
    <div class="detail-grid">
      <div class="mini-card">
        <div class="stack-text"><strong>学生信息</strong></div>
        <div class="stack-text">姓名：${safeText(item.studentName || '-')} / ${safeText(item.studentNo || '-')}</div>
        <div class="stack-text">学院：${safeText(item.college || '-')} / ${safeText(item.major || '-')}</div>
        <div class="stack-text">年级：${safeText(item.grade || '-')}</div>
      </div>
      <div class="mini-card">
        <div class="stack-text"><strong>岗位信息</strong></div>
        <div class="stack-text">岗位：${safeText(item.jobTitle)}</div>
        <div class="stack-text">部门：${safeText(item.department)}</div>
        <div class="stack-text">提交时间：${formatDateText(item.submittedAt)}</div>
      </div>
    </div>
    <div class="detail-grid">
      <div class="mini-card">
        <div class="stack-text"><strong>申请内容</strong></div>
        <div class="stack-text">可上岗时间：${safeText(slotText)}</div>
        <div class="stack-text">技能标签：${safeText(skillTagText)}</div>
        <div class="stack-text">申请说明：${safeText(item.intro || '无')}</div>
      </div>
      <div class="mini-card">
        <div class="stack-text"><strong>处理进度</strong></div>
        <div class="stack-text">待处理时长：${safeText(pendingElapsed)}</div>
        <div class="stack-text">审核时间：${formatDateText(item.reviewedAt)}</div>
        <div class="stack-text">审核耗时：${safeText(reviewElapsed)}</div>
      </div>
    </div>
    <div class="detail-section-title">匹配依据</div>
    <div class="detail-list">${reasonsHtml}</div>
  `

  if (readonly) {
    return `
      ${baseInfo}
      <div class="field">
        <label>审核意见</label>
        <div class="mini-card">${safeText(item.reviewComment || '无')}</div>
      </div>
    `
  }

  return `
    ${baseInfo}
    <div class="field">
      <label>审核状态</label>
      <select id="workStudyReviewStatus">
        <option value="审核通过">审核通过</option>
        <option value="驳回">驳回</option>
      </select>
    </div>
    <div class="field">
      <label>审核意见</label>
      <textarea id="workStudyReviewComment" placeholder="请说明通过依据或驳回原因，学生端将直接展示。">${safeText(item.reviewComment || '', '')}</textarea>
    </div>
  `
}

function openWorkStudyModal(applicationId) {
  const item = state.workStudyApplications.find((entry) => entry.id === applicationId)
  if (!item) {
    return
  }
  state.selectedWorkStudyApplication = item
  const readonly = isWorkStudyReadonly(item)
  openModal({
    title: readonly ? '勤工岗位申请详情' : '勤工岗位申请审核',
    subtitle: `${safeText(item.studentName || '-')} · ${safeText(item.jobTitle || '-')}`,
    body: buildWorkStudyDetailBody(item, readonly),
    footer: readonly
      ? '<button class="secondary" id="closeModalAction" type="button">关闭</button>'
      : '<button class="secondary" id="closeModalAction" type="button">取消</button><button class="primary" id="saveWorkStudyReview" type="button">保存审核结果</button>',
    wide: false,
  })
  document.getElementById('closeModalAction').addEventListener('click', closeModal)
  if (!readonly) {
    document.getElementById('saveWorkStudyReview').addEventListener('click', submitWorkStudyReview)
  }
}

function renderWorkStudyTable() {
  const tbody = document.getElementById('workStudyTable')
  const keyword = normalizeText(document.getElementById('workStudyKeywordFilter').value)
  const status = document.getElementById('workStudyStatusFilter').value
  const list = state.workStudyApplications.filter((item) => {
    if (
      keyword &&
      !normalizeText(item.studentName).includes(keyword) &&
      !normalizeText(item.studentNo).includes(keyword) &&
      !normalizeText(item.jobTitle).includes(keyword)
    ) {
      return false
    }
    if (status && item.status !== status) {
      return false
    }
    return true
  })

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">暂无符合条件的勤工岗位申请。</td></tr>'
    return
  }

  tbody.innerHTML = list
    .map(
      (item) => `
        <tr>
          <td>${safeText(item.studentName || '-')}<div class="subtext">${safeText(item.studentNo || '-')} · ${safeText(item.college || '-')}</div></td>
          <td>${safeText(item.jobTitle)}<div class="subtext">${safeText(item.department || '-')}</div></td>
          <td>${safeText(item.matchLevel)} · ${safeText(item.matchScore, '0')}分</td>
          <td>${statusBadge(item.status)}</td>
          <td>
            ${formatDateText(item.submittedAt)}
            <div class="subtext">待处理：${safeText(item.status === '待审核' ? formatElapsedSince(item.submittedAt) : '-')}</div>
          </td>
          <td><button class="inline-btn" data-work-study-id="${safeText(item.id, '')}" type="button">${getWorkStudyActionLabel(item)}</button></td>
        </tr>
      `,
    )
    .join('')

  tbody.querySelectorAll('[data-work-study-id]').forEach((button) => {
    button.addEventListener('click', () => openWorkStudyModal(button.dataset.workStudyId))
  })
}

function buildCareAlertEventLine(label, value, className = '') {
  const lineClass = className ? `detail-line ${className}` : 'detail-line'
  return `
    <div class="${lineClass}">
      <span class="detail-line-label">${safeText(label)}</span>
      <span class="detail-line-value">${safeText(value || '-')}</span>
    </div>
  `
}

function buildCareAlertEventBody(entry) {
  return [
    buildCareAlertEventLine('触发时间', formatDateText(entry.createdAt)),
    buildCareAlertEventLine('来源渠道', getCareAlertChannelLabel(entry.channel)),
    buildCareAlertEventLine('风险等级', getCareAlertLevelMeta(entry.levelCode).label),
    buildCareAlertEventLine('风险标签', (entry.riskTags || []).join('、') || '未识别'),
    buildCareAlertEventLine('关键词', (entry.matchedKeywords || []).join('、') || '未命中'),
    buildCareAlertEventLine('AI信号', (entry.aiSignals || []).join('、') || '未触发'),
    buildCareAlertEventLine('状态', entry.status || '-'),
    buildCareAlertEventLine('风险摘要', entry.summaryHint || entry.triggerReason || entry.suggestion || '-'),
    '<div class="stack-text"><strong>聊天原话列表</strong></div>',
    `<div class="mini-card raw-content-card"><div class="raw-content-list">${buildCareAlertRawContentList(entry)}</div></div>`,
  ].join('')
}

function buildCareAlertDetailBody(item, readonly) {
  const levelMeta = getCareAlertLevelMeta(item.levelCode)
  const pendingElapsed = item.status === '已处理' ? '-' : formatElapsedSince(item.latestCreatedAt || item.createdAt)
  const reviewElapsed = formatElapsedBetween(item.latestCreatedAt || item.createdAt, item.latestHandledAt || item.handledAt)
  const keywordText = item.matchedKeywords.length > 0 ? item.matchedKeywords.join('、') : '未命中关键词'
  const aiSignalText = Array.isArray(item.aiSignals) && item.aiSignals.length > 0 ? item.aiSignals.join('、') : '未触发语义信号'
  const riskTagText = Array.isArray(item.riskTags) && item.riskTags.length > 0 ? item.riskTags.join('、') : '未识别风险标签'
  const clusterEvents = Array.isArray(item.events) ? item.events : []
  const historyHtml = clusterEvents
    .slice(0, 5)
    .map(
      (entry) => `
        <div class="mini-card detail-mini-card">
          ${buildCareAlertEventBody(entry)}
        </div>
      `,
    )
    .join('')
  const historyTableHtml = getCareAlertHistoryTableHtml(item)
  const baseInfo = `
    <div class="chip-row">
      ${getCareAlertLevelBadge(item)}
      ${getCareAlertStatusBadge(item.status)}
      <span class="badge">优先级：P${safeText(item.priority, '1')}</span>
      <span class="badge">聚合事件：${safeText(item.eventCount || 1, '1')}条</span>
    </div>
    <div class="detail-grid detail-grid-care">
      <div class="mini-card">
        <div class="stack-text"><strong>学生信息</strong></div>
        <div class="stack-text">姓名：${safeText(item.studentName || '-')} / ${safeText(item.studentNo || '-')}</div>
        <div class="stack-text">学院：${safeText(item.college || '-')} / ${safeText(item.grade || '-')}</div>
        <div class="stack-text">来源：${safeText(getCareAlertChannelLabel(item.channel || 'treehole'))}</div>
      </div>
      <div class="mini-card">
        <div class="stack-text"><strong>预警信息</strong></div>
        <div class="stack-text">等级：${safeText(levelMeta.label)}</div>
        <div class="stack-text">触发原因：${safeText(item.summaryHint || item.triggerReason || '-')}</div>
        <div class="stack-text">风险标签：${safeText(riskTagText)}</div>
        <div class="stack-text">命中关键词：${safeText(keywordText)}</div>
        <div class="stack-text">AI语义信号：${safeText(aiSignalText)}</div>
      </div>
      <div class="mini-card">
        <div class="stack-text"><strong>处理进度</strong></div>
        <div class="stack-text">最近触发：${formatDateText(item.latestCreatedAt || item.createdAt)}</div>
        <div class="stack-text">已等待：${safeText(pendingElapsed)}</div>
        <div class="stack-text">最近处理：${formatDateText(item.latestHandledAt || item.handledAt)}</div>
        <div class="stack-text">处理耗时：${safeText(reviewElapsed)}</div>
      </div>
      <div class="mini-card">
        <div class="stack-text"><strong>系统建议</strong></div>
        <div class="stack-text">${safeText(item.suggestion || '无')}</div>
        <div class="stack-text">待关注：${safeText(item.pendingCount || 0, '0')} · 已处理：${safeText(item.handledCount || 0, '0')} · 可观察：${safeText(item.observableCount || 0, '0')}</div>
      </div>
    </div>
    <div class="detail-section-title">最新聊天原话列表</div>
    <div class="mini-card raw-content-card"><div class="raw-content-list">${buildCareAlertRawContentList(item)}</div></div>
    <div class="detail-section-title">风险摘要</div>
    <div class="mini-card">${safeText(item.summaryHint || item.triggerReason || item.suggestion || '系统已生成风险归纳，建议结合线下面谈进一步确认。')}</div>
    <div class="detail-section-title">风险标签</div>
    <div class="mini-card">${safeText(riskTagText)}</div>
    <div class="detail-section-title">历史触发（最近5条）</div>
    <div class="detail-list">${historyHtml || '<div class="empty-state">暂无历史记录</div>'}</div>
    <div class="detail-section-title">该学生处理记录明细</div>
    ${historyTableHtml}
  `

  if (readonly) {
    return `
      ${baseInfo}
      <div class="field">
        <label>处理记录</label>
        <div class="mini-card">
          <div class="stack-text">处理人：${safeText(item.handler || '-')}</div>
          <div class="stack-text">处理意见：${safeText(item.handleNote || '无')}</div>
        </div>
      </div>
    `
  }

  return `
    ${baseInfo}
    <div class="field">
      <label>处理意见</label>
      <textarea id="careAlertHandleNote" placeholder="请记录已采取的沟通与处置动作，便于后续跟进。">${safeText(item.handleNote || '', '')}</textarea>
    </div>
  `
}

function openCareAlertModal(alertId) {
  const item = state.careAlerts.find((entry) => entry.id === alertId)
  if (!item) {
    return
  }
  state.selectedCareAlert = item
  const readonly = item.status === '已处理' || item.pendingCount <= 0
  openModal({
    title: readonly ? '高关怀提醒详情' : '高关怀提醒处理',
    subtitle: `${safeText(item.studentName || '-')} · ${safeText(item.college || '-')}`,
    body: buildCareAlertDetailBody(item, readonly),
    footer: readonly
      ? '<button class="secondary" id="closeModalAction" type="button">关闭</button>'
      : '<button class="secondary" id="closeModalAction" type="button">取消</button><button class="primary" id="saveCareAlertHandle" type="button">标记已处理</button>',
    wide: true,
  })
  document.getElementById('closeModalAction').addEventListener('click', closeModal)
  if (!readonly) {
    document.getElementById('saveCareAlertHandle').addEventListener('click', submitCareAlertHandle)
  }
}

function renderCareAlertTable() {
  const tbody = document.getElementById('careAlertTable')
  const keyword = normalizeText(document.getElementById('careAlertKeywordFilter').value)
  const level = document.getElementById('careAlertLevelFilter').value
  const status = document.getElementById('careAlertStatusFilter').value
  const list = state.careAlerts.filter((item) => {
    if (
      keyword &&
      !normalizeText(item.studentName).includes(keyword) &&
      !normalizeText(item.studentNo).includes(keyword) &&
      !normalizeText(item.college).includes(keyword) &&
      !normalizeText(item.triggerReason).includes(keyword)
    ) {
      return false
    }
    if (level && item.levelCode !== level) {
      return false
    }
    if (status) {
      if (status === '待关注' && Number(item.pendingCount || 0) <= 0) {
        return false
      }
      if (status === '已处理' && Number(item.pendingCount || 0) > 0) {
        return false
      }
      if (status === '可观察' && item.status !== '可观察') {
        return false
      }
    }
    return true
  })

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">暂无符合条件的高关怀提醒。</td></tr>'
    return
  }

  tbody.innerHTML = list
    .map((item) => {
      const currentStatus = Number(item.pendingCount || 0) > 0 ? '待关注' : item.status || '已处理'
      const timeMeta =
        currentStatus === '已处理'
          ? `最近处理耗时：${safeText(formatElapsedBetween(item.latestCreatedAt || item.createdAt, item.latestHandledAt || item.handledAt))}`
          : currentStatus === '可观察'
            ? '建议持续观察该学生近期状态变化'
            : `已等待：${safeText(formatElapsedSince(item.latestCreatedAt || item.createdAt))}`
      return `
        <tr>
          <td>${safeText(item.studentName || '-')}<div class="subtext">${safeText(item.studentNo || '-')} · ${safeText(item.college || '-')}</div></td>
          <td>${getCareAlertLevelBadge(item)}</td>
          <td>${safeText(item.summaryHint || item.triggerReason || '-')}
            <div class="subtext">风险标签：${safeText((item.riskTags || []).join('、') || '未识别风险标签')}</div>
            <div class="subtext">关键词：${safeText((item.matchedKeywords || []).join('、') || '未命中关键词')}</div>
            <div class="subtext">AI信号：${safeText((item.aiSignals || []).join('、') || '未触发语义信号')}</div>
            <div class="subtext">该学生记录：${safeText(item.eventCount || 1, '1')}条 · 待关注${safeText(item.pendingCount || 0, '0')}条</div>
          </td>
          <td>${getCareAlertStatusBadge(currentStatus)}</td>
          <td>${formatDateText(item.latestCreatedAt || item.createdAt)}<div class="subtext">${timeMeta}</div></td>
          <td><button class="inline-btn" data-care-alert-id="${safeText(item.id, '')}" type="button">${getCareAlertActionLabel({ status: currentStatus })}</button></td>
        </tr>
      `
    })
    .join('')

  tbody.querySelectorAll('[data-care-alert-id]').forEach((button) => {
    button.addEventListener('click', () => openCareAlertModal(button.dataset.careAlertId))
  })
}

function getDeadlineReminderStatusMeta(status) {
  const normalized = String(status || 'pending')
  if (normalized === 'handled') {
    return {
      badge: '<span class="badge ok">已处理</span>',
      text: '已处理',
      actionable: false,
      statusCode: 'handled',
    }
  }
  if (normalized === 'overdue') {
    return {
      badge: '<span class="badge warn">已超时</span>',
      text: '已超时',
      actionable: false,
      statusCode: 'overdue',
    }
  }
  if (normalized === 'read') {
    return {
      badge: '<span class="badge">已读待处理</span>',
      text: '已读待处理',
      actionable: true,
      statusCode: 'read',
    }
  }
  return {
    badge: '<span class="badge warn">待处理</span>',
    text: '待处理',
    actionable: true,
    statusCode: 'pending',
  }
}

function getDeadlineReminderStatusBadge(status) {
  return getDeadlineReminderStatusMeta(status).badge
}

function getDeadlineReminderActionLabel(item) {
  return getDeadlineReminderStatusMeta(item?.status).actionable ? '处理' : '查看'
}

function buildDeadlineReminderDetailBody(item, readonly) {
  const statusMeta = getDeadlineReminderStatusMeta(item.status)
  const statusLabel = statusMeta.text
  const handledAtText = formatDateText(item.handledAt)
  const createdAtText = formatDateText(item.createdAt)
  const waitText = item.status === 'handled' || item.status === 'overdue'
    ? formatElapsedBetween(item.createdAt, item.handledAt)
    : formatElapsedSince(item.createdAt)
  const baseInfo = `
    <div class="detail-grid">
      <div class="mini-card">
        <div class="stack-text"><strong>学生信息</strong></div>
        <div class="stack-text">学号：${safeText(item.studentNo || '-')}</div>
        <div class="stack-text">姓名：${safeText(item.studentName || '-')}</div>
        <div class="stack-text">学院：${safeText(item.college || '-')}</div>
      </div>
      <div class="mini-card">
        <div class="stack-text"><strong>提醒信息</strong></div>
        <div class="stack-text">项目：${safeText(item.scholarshipName || '-')}</div>
        <div class="stack-text">截止时间：${safeText(item.deadline || '-')}</div>
        <div class="stack-text">预计剩余：${safeText(item.hoursLeft, '0')}小时</div>
      </div>
    </div>
    <div class="detail-grid">
      <div class="mini-card">
        <div class="stack-text"><strong>处理进度</strong></div>
        <div class="stack-text">当前状态：${safeText(statusLabel)}</div>
        <div class="stack-text">创建时间：${safeText(createdAtText)}</div>
        <div class="stack-text">处理时间：${safeText(handledAtText)}</div>
        <div class="stack-text">耗时：${safeText(waitText)}</div>
      </div>
      <div class="mini-card">
        <div class="stack-text"><strong>系统提醒</strong></div>
        <div class="stack-text">${safeText(item.reason || '无')}</div>
      </div>
    </div>
  `

  if (readonly) {
    return baseInfo
  }

  return `${baseInfo}<div class="subtext">点击“标记已处理”后，该提醒将从待办中移除。</div>`
}

function openDeadlineReminderModal(reminderId) {
  const item = state.deadlineReminders.find((entry) => entry.id === reminderId)
  if (!item) {
    return
  }
  state.selectedDeadlineReminder = item
  const statusMeta = getDeadlineReminderStatusMeta(item.status)
  const readonly = !statusMeta.actionable
  openModal({
    title: readonly ? '截止提醒详情' : '截止提醒处理',
    subtitle: `${safeText(item.studentName || '-')} · ${safeText(item.scholarshipName || '-')}`,
    body: buildDeadlineReminderDetailBody(item, readonly),
    footer: readonly
      ? '<button class="secondary" id="closeModalAction" type="button">关闭</button>'
      : '<button class="secondary" id="closeModalAction" type="button">取消</button><button class="primary" id="saveDeadlineReminderHandle" type="button">标记已处理</button>',
    wide: false,
  })
  document.getElementById('closeModalAction').addEventListener('click', closeModal)
  if (!readonly) {
    document.getElementById('saveDeadlineReminderHandle').addEventListener('click', submitDeadlineReminderHandle)
  }
}

function renderDeadlineReminderTable() {
  const tbody = document.getElementById('deadlineReminderTable')
  const keyword = normalizeText(document.getElementById('deadlineReminderKeywordFilter').value)
  const status = document.getElementById('deadlineReminderStatusFilter').value
  const list = state.deadlineReminders.filter((item) => {
    if (
      keyword &&
      !normalizeText(item.studentName).includes(keyword) &&
      !normalizeText(item.studentNo).includes(keyword) &&
      !normalizeText(item.college).includes(keyword) &&
      !normalizeText(item.scholarshipName).includes(keyword)
    ) {
      return false
    }
    if (status && item.status !== status) {
      return false
    }
    return true
  })

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">暂无符合条件的截止提醒。</td></tr>'
    return
  }

  tbody.innerHTML = list
    .map((item) => {
      const createdAtText = formatDateText(item.createdAt)
      const statusMeta = getDeadlineReminderStatusMeta(item.status)
      const progressText = statusMeta.statusCode === 'handled' || statusMeta.statusCode === 'overdue'
        ? `处理于：${safeText(formatDateText(item.handledAt))}`
        : `已等待：${safeText(formatElapsedSince(item.createdAt))}`
      return `
        <tr>
          <td>${safeText(item.studentName || '-')}<div class="subtext">${safeText(item.studentNo || '-')} · ${safeText(item.college || '-')}</div></td>
          <td>${safeText(item.scholarshipName || '-')}</td>
          <td>${safeText(item.deadline || '-')}<div class="subtext">剩余 ${safeText(item.hoursLeft, '0')} 小时</div></td>
          <td>${getDeadlineReminderStatusBadge(item.status)}</td>
          <td>${createdAtText}<div class="subtext">${progressText}</div></td>
          <td><button class="inline-btn" data-deadline-reminder-id="${safeText(item.id, '')}" type="button">${getDeadlineReminderActionLabel(item)}</button></td>
        </tr>
      `
    })
    .join('')

  tbody.querySelectorAll('[data-deadline-reminder-id]').forEach((button) => {
    button.addEventListener('click', () => openDeadlineReminderModal(button.dataset.deadlineReminderId))
  })
}

function buildCampusMomentImageGalleryHtml(item) {
  const imageList = getCampusMomentImageList(item)
  if (imageList.length === 0) {
    return '<div class="empty-state">未上传图片。</div>'
  }
  return `<div class="campus-moment-gallery">${imageList
    .map((imageUrl, index) => `
      <img
        class="campus-moment-cover previewable"
        src="${escapeAttribute(imageUrl)}"
        alt="校园点滴图片${index + 1}"
        data-preview-src="${escapeAttribute(imageUrl)}"
        data-preview-title="校园点滴图片 ${index + 1}/${imageList.length}"
      />
    `)
    .join('')}</div>`
}

function buildCampusMomentDetailBody(item, readonly) {
  const student = getStudentById(item.studentId)
  const statusOptions = ['已发布', '驳回']
    .map((status) => `<option value="${status}" ${item.status === status ? 'selected' : ''}>${status}</option>`)
    .join('')
  const imagePreview = buildCampusMomentImageGalleryHtml(item)
  const baseInfo = `
    <div class="detail-grid">
      <div class="mini-card">
        <div class="stack-text"><strong>投稿人信息</strong></div>
        <div class="stack-text">姓名：${safeText(item.studentName || '匿名同学')}</div>
        <div class="stack-text">学号：${safeText(item.studentNo || '-')}</div>
        <div class="stack-text">学生ID：${safeText(item.studentId || '-')}</div>
        <div class="stack-text">学院：${safeText(student?.college || '-')}</div>
        <div class="stack-text">班级：${safeText(student?.className || '-')}</div>
      </div>
      <div class="mini-card">
        <div class="stack-text"><strong>审核信息</strong></div>
        <div class="stack-text">当前状态：${statusBadge(item.status)}</div>
        <div class="stack-text">提交时间：${formatDateText(item.submittedAt)}</div>
        <div class="stack-text">审核时间：${formatDateText(item.reviewedAt)}</div>
        <div class="stack-text">发布时间：${formatDateText(item.publishedAt)}</div>
        <div class="stack-text">发布人：${safeText(item.publisher || '-')}</div>
      </div>
    </div>
    <div class="detail-section-title">投稿内容</div>
    <div class="meta-list">
      <div>标题：${safeText(item.title)}</div>
      <div>内容：${safeText(item.caption)}</div>
    </div>
    ${imagePreview}
  `

  if (readonly) {
    return `
      ${baseInfo}
      <div class="field">
        <label>审核意见</label>
        <div class="mini-card">${safeText(item.reviewComment || '无')}</div>
      </div>
    `
  }

  return `
    ${baseInfo}
    <div class="field">
      <label>审核结果</label>
      <select id="campusMomentReviewStatus">${statusOptions}</select>
    </div>
    <div class="field">
      <label>审核意见</label>
      <textarea id="campusMomentReviewComment" placeholder="请填写发布理由或驳回原因，便于学生在“我的”中查看">${safeText(item.reviewComment || '', '')}</textarea>
    </div>
  `
}

function openCampusMomentModal(campusMomentId) {
  const item = state.campusMoments.find((entry) => entry.id === campusMomentId)
  if (!item) {
    return
  }
  state.selectedCampusMoment = item
  const readonly = isCampusMomentReadonly(item)
  openModal({
    title: readonly ? '校园点滴详情' : '校园点滴审核',
    subtitle: `${safeText(item.title)} · ${safeText(item.studentName || '匿名同学')}`,
    body: buildCampusMomentDetailBody(item, readonly),
    footer: readonly
      ? '<button class="secondary" id="closeModalAction" type="button">关闭</button>'
      : '<button class="secondary" id="closeModalAction" type="button">取消</button><button class="primary" id="saveCampusMomentReview" type="button">保存审核结果</button>',
    wide: false,
  })
  document.getElementById('closeModalAction').addEventListener('click', closeModal)
  bindImagePreviewClicks(document.getElementById('modalBody'))
  if (!readonly) {
    document.getElementById('saveCampusMomentReview').addEventListener('click', submitCampusMomentReview)
  }
}

function renderCampusMomentTable() {
  const tbody = document.getElementById('campusMomentTable')
  const keyword = normalizeText(document.getElementById('campusMomentKeywordFilter').value)
  const status = document.getElementById('campusMomentStatusFilter').value
  const list = state.campusMoments.filter((item) => {
    if (
      keyword &&
      !normalizeText(item.title).includes(keyword) &&
      !normalizeText(item.caption).includes(keyword) &&
      !normalizeText(item.studentName).includes(keyword)
    ) {
      return false
    }
    if (status && item.status !== status) {
      return false
    }
    return true
  })

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">暂无符合条件的校园点滴投稿。</td></tr>'
    return
  }

  tbody.innerHTML = list
    .map(
      (item) => `
        <tr>
          <td>${safeText(item.studentName || '匿名同学')}<div class="subtext">${safeText(item.studentNo || '-')}</div></td>
          <td>${safeText(item.title)}<div class="subtext">${safeText(item.caption).slice(0, 70)}</div></td>
          <td>${buildCampusMomentImagePreview(item)}</td>
          <td>${statusBadge(item.status)}</td>
          <td>${formatCampusMomentSubmitMeta(item)}</td>
          <td><button class="inline-btn" data-campus-moment-id="${safeText(item.id, '')}" type="button">${getCampusMomentActionLabel(item)}</button></td>
        </tr>
      `,
    )
    .join('')

  tbody.querySelectorAll('[data-campus-moment-id]').forEach((button) => {
    button.addEventListener('click', () => openCampusMomentModal(button.dataset.campusMomentId))
  })
  bindImagePreviewClicks(tbody)
}

async function submitRecognitionReview() {
  if (!state.selectedRecognition) {
    return
  }
  const currentId = state.selectedRecognition.id
  const confirmedRuleIds = Array.from(document.querySelectorAll('#modalBody .rule-item input:checked')).map((item) => item.value)
  const reviewStatus = document.getElementById('recognitionReviewStatus').value
  const manualBonusScore = Number(document.getElementById('recognitionBonus').value || 0)
  const clearInvalid = document.getElementById('recognitionClearInvalid').checked
  const reviewComment = document.getElementById('recognitionComment').value.trim()
  if (!reviewComment) {
    alert('请填写审核意见，便于学生查看审核结论。')
    return
  }
  if (reviewStatus === '审核通过' && confirmedRuleIds.length === 0 && !clearInvalid) {
    alert('审核通过时请至少确认一条规则，或勾选38项清零。')
    return
  }
  if (manualBonusScore < 0) {
    alert('37项加分不能为负数。')
    return
  }
  if (clearInvalid && reviewStatus === '审核通过' && manualBonusScore > 0) {
    alert('已勾选38项清零时，37项加分将不会生效。')
  }
  await api(`/api/recognitions/${currentId}/review`, {
    method: 'POST',
    body: JSON.stringify({ confirmedRuleIds, reviewStatus, manualBonusScore, clearInvalid, reviewComment }),
  })
  await loadAll()
  closeModal()
  alert('认定审核已保存')
}

async function submitScholarshipEdit() {
  if (!state.selectedScholarship) {
    return
  }
  const currentId = state.selectedScholarship.id
  const payload = {
    name: document.getElementById('scholarshipName').value.trim(),
    amountText: document.getElementById('scholarshipAmountText').value.trim(),
    restrictionNote: document.getElementById('scholarshipRestrictionNote').value.trim(),
    guide: document.getElementById('scholarshipGuide').value.trim(),
    deadline: document.getElementById('scholarshipDeadline').value.trim(),
    openForApply: document.getElementById('scholarshipOpenForApply').checked,
    allowedRecognitionRuleIds: document
      .getElementById('scholarshipRuleIds')
      .value.split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  }
  await api(`/api/scholarships/${currentId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  await loadAll()
  closeModal()
  alert('奖助学金已保存')
}

async function submitApplicationReview() {
  if (!state.selectedApplication) {
    return
  }
  const currentId = state.selectedApplication.id
  const status = document.getElementById('applicationReviewStatus').value
  const reviewComment = document.getElementById('applicationReviewComment').value.trim()
  if (!reviewComment) {
    alert('请填写审核意见，便于学生查看审核结论。')
    return
  }
  await api(`/api/scholarship-applications/${currentId}/review`, {
    method: 'POST',
    body: JSON.stringify({ status, reviewComment }),
  })
  await loadAll()
  closeModal()
  alert('奖助申请审核已保存')
}

async function submitWorkStudyReview() {
  if (!state.selectedWorkStudyApplication) {
    return
  }
  const currentId = state.selectedWorkStudyApplication.id
  const status = document.getElementById('workStudyReviewStatus').value
  const reviewComment = document.getElementById('workStudyReviewComment').value.trim()
  if (!reviewComment) {
    alert('请填写审核意见，便于学生查看岗位申请结果。')
    return
  }
  await api(`/api/work-study/teacher/applications/${currentId}/review`, {
    method: 'POST',
    body: JSON.stringify({ status, reviewComment }),
  })
  await loadAll()
  closeModal()
  alert('勤工岗位审核已保存')
}

async function submitCareAlertHandle() {
  if (!state.selectedCareAlert) {
    return
  }
  const currentId = state.selectedCareAlert.id
  const handleNote = document.getElementById('careAlertHandleNote').value.trim()
  if (!handleNote) {
    alert('请填写处理意见后再提交。')
    return
  }
  await api(`/api/teacher/care-alerts/${currentId}/handle`, {
    method: 'POST',
    body: JSON.stringify({ handleNote, handler: DEMO_TEACHER.name }),
  })
  await loadAll()
  closeModal()
  alert('高关怀提醒已标记为已处理')
}

async function submitDeadlineReminderHandle() {
  if (!state.selectedDeadlineReminder) {
    return
  }
  const currentId = state.selectedDeadlineReminder.id
  await api(`/api/teacher/deadline-reminders/${currentId}/handle`, {
    method: 'POST',
  })
  await loadAll()
  closeModal()
  alert('截止提醒已标记为已处理')
}

async function submitCampusMomentReview() {
  if (!state.selectedCampusMoment) {
    return
  }
  const currentId = state.selectedCampusMoment.id
  const status = document.getElementById('campusMomentReviewStatus').value
  const reviewComment = document.getElementById('campusMomentReviewComment').value.trim()
  await api(`/api/campus-moments/${currentId}/review`, {
    method: 'POST',
    body: JSON.stringify({ status, reviewComment, publisher: DEMO_TEACHER.name }),
  })
  await loadAll()
  closeModal()
  alert('校园点滴审核已保存')
}

async function loadAll() {
  const defaultReportPeriodValue = getDefaultReportPeriodValue(state.reportPeriodType)
  state.reportPeriodValue = defaultReportPeriodValue
  const [
    dashboard,
    monthlyReport,
    summaryReport,
    psychologyTrendResponse,
    careAlertsResponse,
    deadlineRemindersResponse,
    workStudyJobsResponse,
    workStudyApplicationsResponse,
    emotionKeywordsResponse,
    studentsResponse,
    recognitionsResponse,
    scholarshipsResponse,
    applicationsResponse,
    rulesResponse,
    announcementsResponse,
    campusMomentsResponse,
  ] = await Promise.all([
    api('/api/teacher/dashboard'),
    api('/api/teacher/monthly-report'),
    api(`/api/teacher/summary-report?periodType=${encodeURIComponent(state.reportPeriodType)}&periodValue=${encodeURIComponent(defaultReportPeriodValue)}`).catch(
      () => null,
    ),
    api('/api/teacher/psychology-trend'),
    api('/api/teacher/care-alerts'),
    api('/api/teacher/deadline-reminders'),
    api('/api/work-study/teacher/jobs').catch(async (error) => {
      if (!/not found/i.test(String(error?.message || ''))) {
        throw error
      }
      const fallback = await api('/api/work-study/jobs')
      return {
        list: (fallback.list || []).map((item) => ({
          ...item,
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
          applicationCount: 0,
        })),
      }
    }),
    api('/api/work-study/teacher/applications?scope=all').catch(async (error) => {
      if (!/not found/i.test(String(error?.message || ''))) {
        throw error
      }
      return api('/api/work-study/applications?scope=all')
    }),
    api('/api/teacher/emotion-keywords').catch((error) => {
      if (!/not found/i.test(String(error?.message || ''))) {
        throw error
      }
      return { groups: DEFAULT_EMOTION_KEYWORD_GROUPS }
    }),
    api('/api/students'),
    api('/api/recognitions?scope=all'),
    api('/api/scholarships'),
    api('/api/scholarship-applications?scope=all'),
    api('/api/recognition-rules'),
    api('/api/announcements'),
    api('/api/campus-moments?scope=all'),
  ])
  state.dashboard = dashboard
  state.monthlyReport = monthlyReport
  state.summaryReport = summaryReport
  state.reportCache = summaryReport
    ? {
        [`${state.reportPeriodType}:${defaultReportPeriodValue}`]: summaryReport,
      }
    : {}
  state.studentCurves = Array.isArray(psychologyTrendResponse.studentCurves) ? psychologyTrendResponse.studentCurves : []
  state.careAlerts = Array.isArray(careAlertsResponse.clusters) ? careAlertsResponse.clusters : careAlertsResponse.list
  state.careAlertSummary = careAlertsResponse.summary
  state.deadlineReminders = Array.isArray(deadlineRemindersResponse.list) ? deadlineRemindersResponse.list : []
  state.deadlineReminderSummary = deadlineRemindersResponse.summary || null
  state.workStudyJobs = workStudyJobsResponse.list
  state.workStudyApplications = workStudyApplicationsResponse.list
  state.emotionKeywordGroups = Array.isArray(emotionKeywordsResponse.groups)
    ? emotionKeywordsResponse.groups
    : DEFAULT_EMOTION_KEYWORD_GROUPS
  state.students = studentsResponse.list
  state.recognitions = recognitionsResponse.list
  state.scholarships = scholarshipsResponse.list
  state.applications = applicationsResponse.list
  state.recognitionRules = rulesResponse.list
  state.announcements = announcementsResponse.list
  state.campusMoments = campusMomentsResponse.list
  syncSelectedRecords()
  populateStudentCollegeFilter()
  populateRecognitionCollegeFilter()
  populateScholarshipCategoryFilter()
  populateAnnouncementPublisherFilter()
  fillEmotionKeywordInputs()
  syncSummaryReportControls()
  renderDashboard()
  renderSummaryReportPanel()
  renderStudentTable()
  renderStudentDetailPanel()
  renderRecognitionTable()
  renderScholarshipTable()
  renderApplicationTable()
  renderWorkStudyJobTable()
  renderWorkStudyTable()
  renderCareAlertTable()
  renderDeadlineReminderTable()
  renderCampusMomentTable()
  renderAnnouncementTable()
}

function bindEvents() {
  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.addEventListener('click', () => setActivePanel(button.dataset.panel))
  })

  document.getElementById('teacherAiLauncherBtn').addEventListener('click', () => {
    renderTeacherAiModal()
  })

  document.getElementById('refreshBtn').addEventListener('click', () => {
    loadAll().catch((error) => alert(error.message || '刷新失败'))
  })

  document.querySelectorAll('.summary-report-tab').forEach((button) => {
    button.addEventListener('click', () => {
      const nextType = button.dataset.reportType || 'month'
      state.reportPeriodType = nextType
      state.reportPeriodValue = getDefaultReportPeriodValue(nextType)
      syncSummaryReportControls()
      const metaTarget = document.getElementById('summaryReportMeta')
      if (metaTarget) {
        metaTarget.textContent = '正在切换报告周期并加载数据...'
      }
      loadSummaryReport(nextType, state.reportPeriodValue, true).catch((error) => alert(error.message || '生成报告失败'))
    })
  })
  document.getElementById('summaryReportPeriodValue').addEventListener('change', (event) => {
    state.reportPeriodValue = event.target.value
  })
  document.getElementById('summaryReportGenerateBtn').addEventListener('click', async (event) => {
    const button = event.currentTarget
    const originalText = button.textContent
    button.disabled = true
    button.textContent = '生成并下载中...'
    const metaTarget = document.getElementById('summaryReportMeta')
    if (metaTarget) {
      metaTarget.textContent = '正在重新生成 AI 周期报告并准备下载，请稍候...'
    }
    try {
      const report = await loadSummaryReport(state.reportPeriodType, state.reportPeriodValue, true)
      downloadSummaryReport(report)
    } catch (error) {
      alert(error.message || '生成报告失败')
    } finally {
      button.disabled = false
      button.textContent = originalText
    }
  })

  document.getElementById('teacherLoginBtn').addEventListener('click', handleTeacherLogin)
  document.getElementById('teacherLogoutBtn').addEventListener('click', handleTeacherLogout)
  document.getElementById('teacherPassword').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      handleTeacherLogin()
    }
  })

  document.getElementById('studentSearchBtn').addEventListener('click', renderStudentTable)
  document.getElementById('studentDetailBackBtn').addEventListener('click', () => setActivePanel('students'))
  document.getElementById('studentResetBtn').addEventListener('click', () => {
    document.getElementById('studentKeyword').value = ''
    document.getElementById('studentCollegeFilter').value = ''
    document.getElementById('studentLevelFilter').value = ''
    document.getElementById('studentStatusFilter').value = ''
    renderStudentTable()
  })

  ;['studentKeyword', 'recognitionKeywordFilter', 'scholarshipKeywordFilter', 'applicationKeywordFilter', 'announcementKeywordFilter'].forEach((id) => {
    document.getElementById(id).addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        if (id.startsWith('student')) {
          renderStudentTable()
        } else if (id.startsWith('recognition')) {
          renderRecognitionTable()
        } else if (id.startsWith('scholarship')) {
          renderScholarshipTable()
        } else if (id.startsWith('application')) {
          renderApplicationTable()
        } else {
          renderAnnouncementTable()
        }
      }
    })
  })

  ;['workStudyKeywordFilter', 'workStudyJobKeywordFilter', 'careAlertKeywordFilter', 'deadlineReminderKeywordFilter', 'campusMomentKeywordFilter'].forEach((id) => {
    document.getElementById(id).addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') {
        return
      }
      if (id === 'workStudyKeywordFilter') {
        renderWorkStudyTable()
        return
      }
      if (id === 'workStudyJobKeywordFilter') {
        renderWorkStudyJobTable()
        return
      }
      if (id === 'careAlertKeywordFilter') {
        renderCareAlertTable()
        return
      }
      if (id === 'deadlineReminderKeywordFilter') {
        renderDeadlineReminderTable()
        return
      }
      renderCampusMomentTable()
    })
  })

  ;['studentCollegeFilter', 'studentLevelFilter', 'studentStatusFilter'].forEach((id) => {
    document.getElementById(id).addEventListener('change', renderStudentTable)
  })

  ;['recognitionCollegeFilter', 'recognitionLevelFilter', 'recognitionStatusFilter'].forEach((id) => {
    document.getElementById(id).addEventListener('change', renderRecognitionTable)
  })

  ;['scholarshipCategoryFilter', 'scholarshipTypeFilter', 'scholarshipOpenFilter'].forEach((id) => {
    document.getElementById(id).addEventListener('change', renderScholarshipTable)
  })

  ;['applicationCategoryFilter', 'applicationRecognitionFilter', 'applicationStatusFilter'].forEach((id) => {
    document.getElementById(id).addEventListener('change', renderApplicationTable)
  })

  document.getElementById('workStudySearchBtn').addEventListener('click', renderWorkStudyTable)
  document.getElementById('workStudyStatusFilter').addEventListener('change', renderWorkStudyTable)
  document.getElementById('workStudyResetBtn').addEventListener('click', () => {
    document.getElementById('workStudyKeywordFilter').value = ''
    document.getElementById('workStudyStatusFilter').value = ''
    renderWorkStudyTable()
  })

  document.getElementById('workStudyJobSearchBtn').addEventListener('click', renderWorkStudyJobTable)
  document.getElementById('workStudyJobOpenFilter').addEventListener('change', renderWorkStudyJobTable)
  document.getElementById('workStudyJobCreateBtn').addEventListener('click', () => openWorkStudyJobModal(''))

  document.getElementById('careAlertSearchBtn').addEventListener('click', renderCareAlertTable)
  ;['careAlertLevelFilter', 'careAlertStatusFilter'].forEach((id) => {
    document.getElementById(id).addEventListener('change', renderCareAlertTable)
  })
  document.getElementById('openEmotionKeywordsBtn').addEventListener('click', openEmotionKeywordModal)

  document.getElementById('deadlineReminderSearchBtn').addEventListener('click', renderDeadlineReminderTable)
  document.getElementById('deadlineReminderStatusFilter').addEventListener('change', renderDeadlineReminderTable)
  document.getElementById('deadlineReminderResetBtn').addEventListener('click', () => {
    document.getElementById('deadlineReminderKeywordFilter').value = ''
    document.getElementById('deadlineReminderStatusFilter').value = ''
    renderDeadlineReminderTable()
  })

  document.getElementById('campusMomentSearchBtn').addEventListener('click', renderCampusMomentTable)
  document.getElementById('campusMomentStatusFilter').addEventListener('change', renderCampusMomentTable)
  document.getElementById('campusMomentResetBtn').addEventListener('click', () => {
    document.getElementById('campusMomentKeywordFilter').value = ''
    document.getElementById('campusMomentStatusFilter').value = ''
    renderCampusMomentTable()
  })

  document.getElementById('announcementSearchBtn').addEventListener('click', renderAnnouncementTable)
  document.getElementById('announcementPublisherFilter').addEventListener('change', renderAnnouncementTable)
  document.getElementById('announcementCreateBtn').addEventListener('click', () => openAnnouncementModal(''))

  document.getElementById('modalCloseBtn').addEventListener('click', closeModal)
  document.querySelector('[data-close-modal]').addEventListener('click', closeModal)

  document.getElementById('imagePreviewCloseBtn').addEventListener('click', closeImagePreview)
  document.querySelector('[data-close-image-preview]').addEventListener('click', closeImagePreview)
  const imagePreviewModal = document.getElementById('imagePreviewModal')

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && imagePreviewModal.classList.contains('show')) {
      closeImagePreview()
      return
    }
    if (event.key === 'Escape' && document.getElementById('detailModal').classList.contains('show')) {
      closeModal()
    }
  })
}

setActivePanel(state.panel)
bindEvents()
setTeacherAuth(false)
