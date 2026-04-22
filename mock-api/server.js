const http = require('http')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const https = require('https')
const { URL } = require('url')
const { recognitionRules, calculateRecognitionScore } = require('../shared/recognitionRules')
const { scholarshipSeeds, homeBanners, announcements: announcementSeeds, categoryTabs } = require('../shared/scholarshipSeeds')
const { studentSeeds } = require('../shared/studentSeeds')

const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'mock-data')
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')
const TEACHER_WEB_DIR = path.join(ROOT, 'teacher-web')
const PORT = Number(process.env.XJT_MOCK_API_PORT || 3100)
const PUBLIC_BASE_URL = String(process.env.XJT_PUBLIC_BASE_URL || 'https://ynyt.nat100.top').replace(/\/+$/, '')

const FILES = {
  students: path.join(DATA_DIR, 'students.json'),
  scholarships: path.join(DATA_DIR, 'scholarships.json'),
  recognitions: path.join(DATA_DIR, 'recognitionApplications.json'),
  applications: path.join(DATA_DIR, 'scholarshipApplications.json'),
  announcements: path.join(DATA_DIR, 'announcements.json'),
  campusMoments: path.join(DATA_DIR, 'campusMoments.json'),
  materialDrafts: path.join(DATA_DIR, 'materialDrafts.json'),
  emotionEvents: path.join(DATA_DIR, 'emotionEvents.json'),
  emotionKeywords: path.join(DATA_DIR, 'emotionKeywords.json'),
  growthTrees: path.join(DATA_DIR, 'growthTrees.json'),
  workStudyJobs: path.join(DATA_DIR, 'workStudyJobs.json'),
  workStudyApplications: path.join(DATA_DIR, 'workStudyApplications.json'),
  aiConversations: path.join(DATA_DIR, 'aiConversations.json'),
  deadlineReminders: path.join(DATA_DIR, 'deadlineReminders.json'),
  shareCards: path.join(DATA_DIR, 'shareCards.json'),
  policyViews: path.join(DATA_DIR, 'policyViews.json'),
}

const campusMomentSeeds = [
  {
    id: 'campus-moment-001',
    studentId: 'student-1001',
    studentNo: '20230001',
    studentName: '张晨曦',
    title: '傍晚操场的风很舒服',
    caption: '今天和室友跑步后心情轻松了很多，分享给大家。',
    image: '/teacher/logo.png',
    status: '已发布',
    reviewComment: '内容积极，已发布。',
    submittedAt: '2026-04-06T10:00:00.000Z',
    reviewedAt: '2026-04-06T11:00:00.000Z',
    publishedAt: '2026-04-06T11:00:00.000Z',
    publisher: '关怀中心老师',
  },
]

const workStudyJobSeeds = [
  {
    id: 'job-library-assistant',
    title: '图书馆借阅助理',
    department: '图书馆',
    location: '图书馆一楼服务台',
    salaryPerHour: 20,
    weeklyHoursMax: 8,
    monthlyHoursMax: 40,
    requiredMajors: [],
    requiredSkills: ['沟通', '信息录入'],
    shiftSlots: ['周一 19:00-21:00', '周三 19:00-21:00', '周五 19:00-21:00'],
    tags: ['校内', '晚间', '稳定'],
    openForApply: true,
    description: '负责借还书登记、秩序维护与读者咨询。',
  },
  {
    id: 'job-lab-data-entry',
    title: '实验数据整理助理',
    department: '医学技术学院实验中心',
    location: '实验楼A302',
    salaryPerHour: 22,
    weeklyHoursMax: 6,
    monthlyHoursMax: 24,
    requiredMajors: ['医学检验技术', '预防医学'],
    requiredSkills: ['Excel', '细致'],
    shiftSlots: ['周二 14:30-17:30', '周四 14:30-17:30'],
    tags: ['校内', '专业相关'],
    openForApply: true,
    description: '协助老师完成实验台账录入和数据清洗。',
  },
  {
    id: 'job-admin-support',
    title: '学院行政事务助理',
    department: '学生工作办公室',
    location: '行政楼208',
    salaryPerHour: 19.8,
    weeklyHoursMax: 8,
    monthlyHoursMax: 32,
    requiredMajors: [],
    requiredSkills: ['办公软件', '沟通', '责任心'],
    shiftSlots: ['周一 15:00-17:00', '周三 15:00-17:00', '周五 15:00-17:00'],
    tags: ['校内', '白天'],
    openForApply: true,
    description: '协助通知整理、资料归档与活动签到。',
  },
]

const DEFAULT_EMOTION_KEYWORDS = {
  high: ['自杀', '自残', '结束生命', '不想活', '退学', '活不下去', '死', '割手', '划手', '割自己', '水果刀'],
  medium: ['焦虑', '压力', '崩溃', '失眠', '害怕', '撑不住', '抑郁', '无人理解'],
  low: ['紧张', '担心', '烦', '累', '难受', '压抑'],
}

const AI_EMOTION_PATTERNS = {
  high: [
    { pattern: /想(要)?(自杀|轻生|结束生命|去死|离开这个世界|彻底消失)/, label: '存在明确自伤或轻生意图' },
    { pattern: /(不想活|活不下去|结束这一切|再也不想醒来|世界没有我(会)?更好)/, label: '表达强烈绝望与生命放弃' },
    { pattern: /(写(好)?遗书|割腕|跳楼|吞药|上吊|自残)/, label: '描述具体自伤方式或准备行为' },
    { pattern: /(水果刀|刀片|小刀).{0,8}(割手|划手|割自己|划自己|划伤自己|割伤自己)/, label: '提及借助刀具实施自伤行为' },
    { pattern: /(割手|划手|割自己|划自己|划伤自己|割伤自己).{0,12}(解压|舒服|释放|缓解)/, label: '把自伤描述为减压方式' },
    { pattern: /(今晚|今天|现在|马上).*(结束|自杀|离开|消失)/, label: '出现近期实施时间线' },
  ],
  medium: [
    { pattern: /(撑不住|扛不住|快崩溃|要崩溃|被压垮|喘不过气|透不过气)/, label: '表达情绪濒临失控' },
    { pattern: /(失眠|整夜睡不着|不敢睡|心慌|胸闷|惊恐|焦虑|抑郁)/, label: '出现持续心理生理压力信号' },
    { pattern: /(没人理解|没人管我|不被需要|被孤立|被排挤|无助|绝望|看不到希望|没有出路)/, label: '出现明显无助与孤立感' },
    { pattern: /(想退学|不想上学|不敢去上课|害怕去学校)/, label: '学习生活功能受损迹象' },
  ],
  low: [{ pattern: /(压力大|好累|很烦|烦死了|难受|压抑|心情不好|低落|紧张|担心)/, label: '出现一般负向情绪表达' }],
}

function clampEnvNumber(rawValue, min, max, fallback) {
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.min(max, Math.max(min, parsed))
}

const AI_NEGATIVE_TOKENS = ['绝望', '崩溃', '痛苦', '害怕', '压抑', '孤独', '无助', '难受', '失眠', '焦虑', '抑郁']
const AI_CRISIS_TOKENS = ['想死', '轻生', '结束生命', '不想活', '消失', '遗书', '自残', '自杀']
const rawClaudeBaseUrl = String(process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').trim().replace(/\/+$/, '')
const CLAUDE_API_URL = /\/v1\/messages$/i.test(rawClaudeBaseUrl)
  ? rawClaudeBaseUrl
  : `${rawClaudeBaseUrl}/v1/messages`
const CLAUDE_MODEL = String(
  process.env.ANTHROPIC_MODEL ||
  process.env.CLAUDE_MODEL ||
  process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ||
  'claude-sonnet-4-6',
).trim() || 'claude-sonnet-4-6'
const CLAUDE_MAX_OUTPUT_TOKENS = clampEnvNumber(process.env.CLAUDE_MAX_OUTPUT_TOKENS, 256, 8192, 4096)
const CLAUDE_TEMPERATURE = clampEnvNumber(process.env.CLAUDE_TEMPERATURE, 0, 1, 0.3)
const CLAUDE_API_TIMEOUT_MS = Math.round(clampEnvNumber(process.env.CLAUDE_API_TIMEOUT_MS, 8000, 60000, 30000))
const CLAUDE_API_RETRY_COUNT = Math.round(clampEnvNumber(process.env.CLAUDE_API_RETRY_COUNT, 0, 2, 1))
const CLAUDE_API_KEY = String(
  process.env.ANTHROPIC_API_KEY ||
  process.env.CLAUDE_API_KEY ||
  process.env.ANTHROPIC_AUTH_TOKEN ||
  '',
).trim()
const ENABLE_AI_LOCAL_FALLBACK = false
const AI_HISTORY_LIMIT = 8
const AI_PERSIST_HISTORY_LIMIT = 24

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function ensureFile(filePath, seed) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(seed, null, 2), 'utf8')
  }
}

function bootstrapData() {
  ensureDir(DATA_DIR)
  ensureDir(UPLOAD_DIR)
  ensureFile(FILES.students, studentSeeds)
  ensureFile(FILES.scholarships, scholarshipSeeds)
  ensureFile(FILES.recognitions, [])
  ensureFile(FILES.applications, [])
  ensureFile(FILES.announcements, announcementSeeds)
  ensureFile(FILES.campusMoments, campusMomentSeeds)
  ensureFile(FILES.materialDrafts, [])
  ensureFile(FILES.emotionEvents, [])
  ensureFile(FILES.emotionKeywords, DEFAULT_EMOTION_KEYWORDS)
  ensureFile(FILES.growthTrees, [])
  ensureFile(FILES.workStudyJobs, workStudyJobSeeds)
  ensureFile(FILES.workStudyApplications, [])
  ensureFile(FILES.aiConversations, [])
  ensureFile(FILES.deadlineReminders, [])
  ensureFile(FILES.shareCards, [])
  ensureFile(FILES.policyViews, [])
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Student-Id',
  })
  res.end(JSON.stringify(data))
}

function sendSseHeaders(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Student-Id',
    'X-Accel-Buffering': 'no',
  })
}

function sendSseData(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

function formatAttachmentSize(size) {
  const value = Number(size || 0)
  if (value < 1024) {
    return `${value}B`
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)}KB`
  }
  return `${(value / 1024 / 1024).toFixed(1)}MB`
}

function getMimeTypeByName(fileName) {
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
  if (lowerName.endsWith('.svg')) {
    return 'image/svg+xml'
  }
  if (lowerName.endsWith('.pdf')) {
    return 'application/pdf'
  }
  if (lowerName.endsWith('.txt')) {
    return 'text/plain'
  }
  if (lowerName.endsWith('.doc')) {
    return 'application/msword'
  }
  if (lowerName.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  if (lowerName.endsWith('.xls')) {
    return 'application/vnd.ms-excel'
  }
  if (lowerName.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }
  if (lowerName.endsWith('.ppt')) {
    return 'application/vnd.ms-powerpoint'
  }
  if (lowerName.endsWith('.pptx')) {
    return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  }
  return 'application/octet-stream'
}

function getExtByMimeType(mimeType) {
  const normalized = String(mimeType || '').toLowerCase()
  if (normalized === 'image/png') {
    return '.png'
  }
  if (normalized === 'image/jpeg') {
    return '.jpg'
  }
  if (normalized === 'image/webp') {
    return '.webp'
  }
  if (normalized === 'image/gif') {
    return '.gif'
  }
  if (normalized === 'image/svg+xml') {
    return '.svg'
  }
  if (normalized === 'application/pdf') {
    return '.pdf'
  }
  if (normalized === 'text/plain') {
    return '.txt'
  }
  if (normalized === 'application/msword') {
    return '.doc'
  }
  if (normalized === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return '.docx'
  }
  if (normalized === 'application/vnd.ms-excel') {
    return '.xls'
  }
  if (normalized === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return '.xlsx'
  }
  if (normalized === 'application/vnd.ms-powerpoint') {
    return '.ppt'
  }
  if (normalized === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
    return '.pptx'
  }
  return '.bin'
}

function normalizeAttachmentMimeType(rawType, fileName, fallbackMimeType) {
  const mimeType = typeof rawType === 'string' ? rawType.trim().toLowerCase() : ''
  if (mimeType) {
    return mimeType
  }
  const guessedMimeType = getMimeTypeByName(fileName)
  if (guessedMimeType !== 'application/octet-stream') {
    return guessedMimeType
  }
  return fallbackMimeType
}

function normalizeAttachmentName(rawName, fallbackName) {
  const text = String(rawName || '').trim().replace(/\\/g, '/')
  const baseName = path.posix.basename(text)
  return baseName || fallbackName
}

function sanitizeUploadSubDir(rawSubDir) {
  const text = String(rawSubDir || '').toLowerCase().trim().replace(/[^a-z0-9/_-]/g, '-')
  const normalized = path.posix.normalize(`/${text}`).replace(/^\/+/, '').replace(/\/+$/, '')
  if (!normalized || normalized.startsWith('..')) {
    return 'misc'
  }
  const segments = normalized.split('/').filter(Boolean)
  if (segments.length === 0 || segments.some((segment) => segment === '.' || segment === '..')) {
    return 'misc'
  }
  return segments.join('/')
}

function sanitizeStoredFilePath(rawPath) {
  const text = String(rawPath || '').trim()
  if (!text) {
    return ''
  }
  let candidatePath = text
  if (/^https?:\/\//i.test(candidatePath)) {
    try {
      candidatePath = new URL(candidatePath).pathname || ''
    } catch (error) {
      candidatePath = ''
    }
  }
  if (!candidatePath.startsWith('/uploads/')) {
    return ''
  }
  const normalized = path.posix.normalize(candidatePath)
  if (!normalized.startsWith('/uploads/') || normalized.includes('..')) {
    return ''
  }
  return normalized
}

function normalizePublicResourceUrl(rawValue) {
  const text = String(rawValue || '').trim()
  if (!text) {
    return ''
  }
  if (/^data:/i.test(text)) {
    return text
  }
  if (text.startsWith('/')) {
    return `${PUBLIC_BASE_URL}${text}`
  }
  if (/^https?:\/\//i.test(text)) {
    try {
      const urlObject = new URL(text)
      const pathname = String(urlObject.pathname || '')
      const isInternalAsset = /^\/(uploads|teacher)\//i.test(pathname)
      const isLocalHost = /^(localhost|127\.0\.0\.1|::1)$/i.test(String(urlObject.hostname || ''))
      if (isInternalAsset || isLocalHost) {
        return `${PUBLIC_BASE_URL}${pathname}${urlObject.search || ''}${urlObject.hash || ''}`
      }
      return text
    } catch (error) {
      return text
    }
  }
  return text
}

function createUploadFilePath({ contentBase64, name, mimeType, uploadSubDir }) {
  const safeSubDir = sanitizeUploadSubDir(uploadSubDir)
  const targetDir = path.join(UPLOAD_DIR, ...safeSubDir.split('/'))
  ensureDir(targetDir)
  const normalizedName = normalizeAttachmentName(name, 'attachment.bin')
  const extFromName = path.extname(normalizedName).toLowerCase()
  const ext = extFromName || getExtByMimeType(mimeType)
  const stem = path.basename(normalizedName, extFromName || undefined)
  const safeStem = stem.replace(/[^a-z0-9._-]/gi, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '') || 'file'
  const contentHash = crypto.createHash('sha1').update(contentBase64).digest('hex').slice(0, 16)
  const storedFileName = `${contentHash}-${safeStem}${ext}`
  const relativePath = path.posix.join('/uploads', safeSubDir, storedFileName)
  const absolutePath = path.join(UPLOAD_DIR, ...safeSubDir.split('/'), storedFileName)
  if (!fs.existsSync(absolutePath)) {
    fs.writeFileSync(absolutePath, Buffer.from(contentBase64, 'base64'))
  }
  return relativePath
}

function sanitizeExternalFileUrl(rawUrl) {
  const text = String(rawUrl || '').trim()
  if (!/^https?:\/\//i.test(text)) {
    return ''
  }
  try {
    return new URL(text).toString()
  } catch (error) {
    return ''
  }
}

function sanitizeAttachmentRecord(attachment, uploadSubDir, fallbackMimeType = 'application/octet-stream') {
  if (!attachment || typeof attachment !== 'object') {
    return null
  }
  const source = attachment
  const name = normalizeAttachmentName(source.name, `attachment-${Date.now()}`)
  const type = normalizeAttachmentMimeType(source.type, name, fallbackMimeType)
  const size = Number(source.size || 0)
  const contentBase64 = typeof source.contentBase64 === 'string' ? source.contentBase64.trim() : ''
  const existingFilePath = sanitizeStoredFilePath(source.filePath || source.fileUrl || source.url || '')
  const externalFileUrl = sanitizeExternalFileUrl(source.fileUrl || source.url || '')
  const filePath = contentBase64
    ? createUploadFilePath({ contentBase64, name, mimeType: type, uploadSubDir })
    : existingFilePath || externalFileUrl
  if (!filePath) {
    return null
  }
  const fileUrl = /^https?:\/\//i.test(filePath)
    ? filePath
    : normalizePublicResourceUrl(filePath)
  return {
    id: typeof source.id === 'string' && source.id ? source.id : '',
    name,
    type,
    size,
    sizeLabel: typeof source.sizeLabel === 'string' && source.sizeLabel ? source.sizeLabel : formatAttachmentSize(size),
    filePath,
    fileUrl,
  }
}

function sanitizeImageAttachment(attachment, uploadSubDir = 'images') {
  const safeAttachment = sanitizeAttachmentRecord(attachment, uploadSubDir, 'image/jpeg')
  if (!safeAttachment) {
    return null
  }
  return {
    ...safeAttachment,
    type: /^image\//i.test(safeAttachment.type)
      ? safeAttachment.type
      : normalizeAttachmentMimeType('', safeAttachment.name, 'image/jpeg'),
  }
}

function sanitizeAttachments(attachments, uploadSubDir = 'attachments') {
  return (Array.isArray(attachments) ? attachments : [])
    .map((item, index) => {
      const source = item && typeof item === 'object' ? item : {}
      const fallbackId = `attachment-${Date.now()}-${index}`
      const safeAttachment = sanitizeAttachmentRecord({ ...source, id: source.id || fallbackId }, uploadSubDir)
      if (!safeAttachment) {
        return null
      }
      return {
        ...safeAttachment,
        id: safeAttachment.id || fallbackId,
      }
    })
    .filter(Boolean)
}

function buildImageUrlByAttachment(attachment, uploadSubDir) {
  const safeAttachment = sanitizeImageAttachment(attachment, uploadSubDir)
  if (!safeAttachment) {
    return ''
  }
  return safeAttachment.fileUrl || ''
}

function sendText(res, statusCode, contentType, data) {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
  })
  res.end(data)
}

function notFound(res) {
  sendJson(res, 404, { message: 'Not Found' })
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      if (!body) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

function getStudentIdFromRequest(req) {
  const rawValue = req.headers['x-student-id']
  if (Array.isArray(rawValue)) {
    return String(rawValue[0] || '').trim()
  }
  return typeof rawValue === 'string' ? rawValue.trim() : ''
}

function getStudentById(studentId) {
  const students = readJson(FILES.students)
  return students.find((item) => item.id === studentId) || null
}

function getCurrentStudent(req) {
  const requestedStudentId = req ? getStudentIdFromRequest(req) : ''
  if (!requestedStudentId) {
    return null
  }
  return getStudentById(requestedStudentId)
}

function getSceneByPath(pathname, fallbackScene = 'general') {
  const normalizedPath = String(pathname || '')
  if (normalizedPath.includes('/mental-care/')) {
    return 'emotion'
  }
  if (normalizedPath.includes('/ai-evaluate/')) {
    return 'recognition'
  }
  if (normalizedPath.includes('/college-scholar/')) {
    return 'scholarship'
  }
  if (normalizedPath.includes('/ai-assistant/')) {
    return 'material-draft'
  }
  return fallbackScene
}

function requireCurrentStudent(req, res) {
  const student = getCurrentStudent(req)
  if (!student) {
    sendJson(res, 401, { message: '请先登录学生账号' })
    return null
  }
  return student
}

function updateStudent(nextStudent) {
  const students = readJson(FILES.students)
  const index = students.findIndex((item) => item.id === nextStudent.id)
  if (index >= 0) {
    students[index] = nextStudent
  } else {
    students.unshift(nextStudent)
  }
  writeJson(FILES.students, students)
  return nextStudent
}

function getScholarshipById(id) {
  const scholarships = readJson(FILES.scholarships)
  return scholarships.find((item) => item.id === id)
}

function getCurrentAcademicYear() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

function getAcademicYearByDate(dateText) {
  const parsedDate = dateText ? new Date(dateText) : null
  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return getCurrentAcademicYear()
  }
  const year = parsedDate.getFullYear()
  const month = parsedDate.getMonth() + 1
  return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

function getScholarshipType(scholarshipId, fallbackType) {
  if (fallbackType) {
    return fallbackType
  }
  const scholarship = getScholarshipById(scholarshipId)
  return scholarship?.type || ''
}

function normalizeScholarshipApplyComment(rawComment) {
  return String(rawComment || '').trim()
}

function validateScholarshipApplyPayload(body) {
  const personalIntro = String(body?.personalIntro || '').trim()
  const familySituation = String(body?.familySituation || '').trim()
  const usagePlan = String(body?.usagePlan || '').trim()
  if (!personalIntro || !familySituation || !usagePlan) {
    return {
      valid: false,
      message: '请完整填写个人简介、家庭情况说明和资助使用计划。',
      applySummary: null,
    }
  }
  const attachmentList = sanitizeAttachments(body?.attachments, 'scholarship-applications/attachments')
  if (attachmentList.length === 0) {
    return {
      valid: false,
      message: '请至少上传1个申请附件。',
      applySummary: null,
    }
  }
  const applySummary = {
    personalIntro,
    familySituation,
    usagePlan,
  }
  return {
    valid: true,
    message: '',
    applySummary,
    attachmentList,
  }
}

function normalizeApplicationRecord(item) {
  const normalized = {
    ...item,
    scholarshipType: getScholarshipType(item.scholarshipId, item.scholarshipType),
    academicYear: item.academicYear || getAcademicYearByDate(item.submittedAt),
    applySummary: {
      personalIntro: String(item?.applySummary?.personalIntro || '').trim(),
      familySituation: String(item?.applySummary?.familySituation || '').trim(),
      usagePlan: String(item?.applySummary?.usagePlan || '').trim(),
    },
    comment: normalizeScholarshipApplyComment(item?.comment),
    materials: normalizeStringList(item?.materials),
    attachments: sanitizeAttachments(item?.attachments, 'scholarship-applications/attachments'),
  }
  if (normalized.materials.length === 0) {
    const fallbackMaterials = [
      normalized.applySummary.personalIntro ? `个人简介：${normalized.applySummary.personalIntro}` : '',
      normalized.applySummary.familySituation ? `家庭情况：${normalized.applySummary.familySituation}` : '',
      normalized.applySummary.usagePlan ? `使用计划：${normalized.applySummary.usagePlan}` : '',
    ].filter(Boolean)
    if (fallbackMaterials.length > 0) {
      normalized.materials = fallbackMaterials
    }
  }
  return normalized
}

function getScholarshipApplyLock(studentId, scholarship, applications) {
  const currentAcademicYear = getCurrentAcademicYear()
  const normalizedApplications = applications.map((item) => normalizeApplicationRecord(item))
  const sameYearApplications = normalizedApplications.filter(
    (item) => item.studentId === studentId && item.academicYear === currentAcademicYear,
  )
  const duplicatedScholarship = sameYearApplications.find((item) => item.scholarshipId === scholarship.id)
  if (duplicatedScholarship) {
    return {
      blocked: true,
      message: `同一学年内同一奖助学金项目仅可申请一次，你已申请${scholarship.name}。`,
    }
  }
  return {
    blocked: false,
    message: '',
  }
}

function getRecognitionRuleLabelMap() {
  return recognitionRules.reduce((acc, rule) => {
    acc[rule.id] = rule.label
    return acc
  }, {})
}

function sanitizeConfirmedRecognitionRuleIds(ruleIds) {
  const allowedRuleIds = recognitionRules
    .filter((rule) => !rule.manualScore && !rule.clearOnTrue)
    .map((rule) => rule.id)
  return (Array.isArray(ruleIds) ? ruleIds : []).filter((ruleId) => allowedRuleIds.includes(ruleId))
}

function deriveColleges(scholarships) {
  const result = []
  scholarships.forEach((item) => {
    if (item.collegeKey && !result.some((entry) => entry.key === item.collegeKey)) {
      result.push({ key: item.collegeKey, name: item.collegeName })
    }
  })
  return result
}

function getCollegeNameByKey(collegeKey) {
  const safeKey = String(collegeKey || '').trim()
  if (!safeKey) {
    return ''
  }
  const scholarships = readJson(FILES.scholarships)
  const matchedScholarship = scholarships.find((item) => String(item.collegeKey || '').trim() === safeKey && String(item.collegeName || '').trim())
  if (matchedScholarship) {
    return String(matchedScholarship.collegeName || '').trim()
  }
  const student = readJson(FILES.students).find((item) => String(item.collegeKey || '').trim() === safeKey && String(item.college || '').trim())
  return student ? String(student.college || '').trim() : ''
}

function buildHomeScholarships() {
  return readJson(FILES.scholarships).map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    amountText: item.amountText,
    intro: item.intro,
    deadline: item.deadline,
  }))
}

function parseTime(value) {
  const timestamp = Date.parse(String(value || ''))
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function getDateKey(value) {
  const text = String(value || '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text
  }
  const timestamp = parseTime(text)
  if (!timestamp) {
    return ''
  }
  return new Date(timestamp).toISOString().slice(0, 10)
}

function getDefaultAnnouncementCoverUrl() {
  return `${PUBLIC_BASE_URL}/teacher/logo.png`
}

function normalizeAnnouncementRecord(item) {
  const now = new Date().toISOString()
  const publishedAt = typeof item?.publishedAt === 'string' && item.publishedAt ? item.publishedAt : now
  const coverAttachment = sanitizeImageAttachment(item?.coverImageAttachment, 'announcements/covers')
  const coverByAttachment = coverAttachment?.fileUrl || ''
  const normalizedCoverImage = normalizePublicResourceUrl(item?.coverImage)
  return {
    id: typeof item?.id === 'string' && item.id ? item.id : createId('announcement'),
    coverImage: coverByAttachment || normalizedCoverImage || getDefaultAnnouncementCoverUrl(),
    coverImageAttachment: coverAttachment,
    title: typeof item?.title === 'string' ? item.title.trim() : '',
    content: typeof item?.content === 'string' ? item.content.trim() : '',
    attachments: sanitizeAttachments(item?.attachments, 'announcements/attachments'),
    publishedAt,
    updatedAt: typeof item?.updatedAt === 'string' && item.updatedAt ? item.updatedAt : publishedAt,
    publisher: typeof item?.publisher === 'string' && item.publisher.trim() ? item.publisher.trim() : '学生资助管理中心',
  }
}

function readAnnouncements() {
  return readJson(FILES.announcements).map((item) => normalizeAnnouncementRecord(item))
}

function getAnnouncementList() {
  return readAnnouncements().sort((a, b) => parseTime(b.publishedAt) - parseTime(a.publishedAt))
}

function buildHomeAnnouncements() {
  return getAnnouncementList().map((item) => ({
    id: item.id,
    coverImage: item.coverImage,
    title: item.title,
    date: String(item.publishedAt || '').slice(0, 10),
    publisher: item.publisher,
  }))
}

function normalizeCampusMomentImage(rawImage, imageAttachment) {
  const imageByAttachment = buildImageUrlByAttachment(imageAttachment, 'campus-moments/images')
  if (imageByAttachment) {
    return imageByAttachment
  }
  const normalizedImage = normalizePublicResourceUrl(rawImage)
  if (normalizedImage) {
    return normalizedImage
  }
  return getDefaultAnnouncementCoverUrl()
}

function sanitizeCampusMomentImageAttachments(rawAttachments) {
  return sanitizeAttachments(rawAttachments, 'campus-moments/images')
    .map((item) => {
      if (!item) {
        return null
      }
      const normalizedType = /^image\//i.test(String(item.type || ''))
        ? String(item.type || '').toLowerCase()
        : normalizeAttachmentMimeType('', item.name, 'image/jpeg')
      return {
        ...item,
        type: normalizedType,
      }
    })
    .filter((item) => item && /^image\//i.test(String(item.type || '')))
}

function buildCampusMomentImageList(item, imageAttachment, imageAttachments) {
  const list = []
  const pushImageUrl = (rawUrl) => {
    const normalized = normalizePublicResourceUrl(rawUrl)
    if (normalized && !list.includes(normalized)) {
      list.push(normalized)
    }
  }

  ;(Array.isArray(imageAttachments) ? imageAttachments : []).forEach((attachment) => {
    const imageUrl = buildImageUrlByAttachment(attachment, 'campus-moments/images')
    if (imageUrl) {
      pushImageUrl(imageUrl)
    }
  })

  const singleAttachmentImageUrl = buildImageUrlByAttachment(imageAttachment, 'campus-moments/images')
  if (singleAttachmentImageUrl) {
    pushImageUrl(singleAttachmentImageUrl)
  }

  if (Array.isArray(item?.imageList)) {
    item.imageList.forEach((entry) => {
      pushImageUrl(entry)
    })
  }

  pushImageUrl(item?.image)

  if (list.length === 0) {
    list.push(getDefaultAnnouncementCoverUrl())
  }

  return list
}

function normalizeCampusMomentRecord(item) {
  const now = new Date().toISOString()
  const status = ['待审核', '已发布', '驳回'].includes(String(item?.status || '')) ? String(item.status) : '待审核'
  const submittedAt = typeof item?.submittedAt === 'string' && item.submittedAt ? item.submittedAt : now
  const reviewedAt = typeof item?.reviewedAt === 'string' ? item.reviewedAt : ''
  const publishedAt = status === '已发布' ? item?.publishedAt || reviewedAt || submittedAt : ''
  const imageAttachment = sanitizeImageAttachment(item?.imageAttachment, 'campus-moments/images')
  const imageAttachments = sanitizeCampusMomentImageAttachments(item?.imageAttachments)
  const imageList = buildCampusMomentImageList(item, imageAttachment, imageAttachments)
  return {
    id: typeof item?.id === 'string' && item.id ? item.id : createId('campus-moment'),
    studentId: typeof item?.studentId === 'string' ? item.studentId : '',
    studentNo: typeof item?.studentNo === 'string' ? item.studentNo : '',
    studentName: typeof item?.studentName === 'string' ? item.studentName : '匿名同学',
    title: typeof item?.title === 'string' ? item.title.trim() : '',
    caption: typeof item?.caption === 'string' ? item.caption.trim() : '',
    image: imageList[0],
    imageList,
    imageAttachment,
    imageAttachments,
    status,
    reviewComment: typeof item?.reviewComment === 'string' ? item.reviewComment : '',
    submittedAt,
    reviewedAt,
    publishedAt,
    publisher: typeof item?.publisher === 'string' && item.publisher.trim() ? item.publisher.trim() : '关怀中心老师',
  }
}

function readCampusMoments() {
  return readJson(FILES.campusMoments).map((item) => normalizeCampusMomentRecord(item))
}

function getCampusMomentList() {
  return readCampusMoments().sort((a, b) => parseTime(b.submittedAt) - parseTime(a.submittedAt))
}

function getPublishedCampusMoments() {
  return getCampusMomentList()
    .filter((item) => item.status === '已发布')
    .sort((a, b) => parseTime(b.publishedAt || b.submittedAt) - parseTime(a.publishedAt || a.submittedAt))
}

function buildRecognitionSnapshot(student) {
  return {
    level: student.currentRecognitionLevel,
    score: student.currentRecognitionScore,
    confirmedRecognitionRuleIds: student.confirmedRecognitionRuleIds || [],
    confirmedRecognitionLabels: student.confirmedRecognitionLabels || [],
  }
}

function getNationalGrantTier(level) {
  if (level === '特别困难') {
    return { label: '一档资助', amount: '5000元/人/学年' }
  }
  if (level === '困难') {
    return { label: '二档资助', amount: '3700元/人/学年' }
  }
  if (level === '一般困难') {
    return { label: '三档资助', amount: '2500元/人/学年' }
  }
  return null
}

function evaluateScholarshipEligibility(student, scholarship) {
  if (!student) {
    return { eligible: false, reason: '登录后可查看个人资格并申请', grantTier: null }
  }
  const recognitionSnapshot = buildRecognitionSnapshot(student)
  const hasRecognition = recognitionSnapshot.level !== '未认定'
  const applications = readJson(FILES.applications)
  const applyLock = getScholarshipApplyLock(student.id, scholarship, applications)
  if (applyLock.blocked) {
    return { eligible: false, reason: applyLock.message, grantTier: null, locked: true }
  }
  if (scholarship.id === 'national-grant') {
    const tier = getNationalGrantTier(recognitionSnapshot.level)
    if (!tier) {
      return { eligible: false, reason: '需先完成成长支持认定后，才能申请国家助学金。', grantTier: null }
    }
    return { eligible: true, reason: `当前按${tier.label}分档发放，预计金额为${tier.amount}。`, grantTier: tier }
  }

  if (Array.isArray(scholarship.allowedRecognitionRuleIds) && scholarship.allowedRecognitionRuleIds.length > 0) {
    const matchedType = scholarship.allowedRecognitionRuleIds.some((ruleId) => recognitionSnapshot.confirmedRecognitionRuleIds.includes(ruleId))
    if (!matchedType) {
      return { eligible: false, reason: '该助学项目只对指定困难认定类型开放，当前认定类型不匹配。', grantTier: null }
    }
  }

  if (scholarship.requiresPovertyRecognition && !hasRecognition) {
    return { eligible: false, reason: '需先完成成长支持认定后，才能申请该项目。', grantTier: null }
  }

  return { eligible: true, reason: scholarship.restrictionNote || '当前条件满足基础申请要求。', grantTier: null }
}

function clampNumber(value, min, max) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return min
  }
  return Math.min(max, Math.max(min, numericValue))
}

function normalizeStringList(values) {
  if (!Array.isArray(values)) {
    return []
  }
  return values
    .map((item) => String(item || '').trim())
    .filter(Boolean)
}

function resolveRecommendationLevel(score) {
  if (score >= 85) {
    return '高匹配'
  }
  if (score >= 65) {
    return '中匹配'
  }
  return '待提升'
}

function resolveRecommendationBucket(score) {
  if (score >= 80) {
    return 'high'
  }
  if (score >= 60) {
    return 'medium'
  }
  return 'low'
}

function buildScholarshipRecommendationScore(student, scholarship, eligibility) {
  let score = 40
  if (eligibility?.eligible) {
    score += 25
  } else {
    score -= 20
  }
  if (scholarship.openForApply) {
    score += 12
  } else {
    score -= 30
  }
  if (scholarship.collegeKey && scholarship.collegeKey === student.collegeKey) {
    score += 15
  }
  if (scholarship.requiresPovertyRecognition && student.currentRecognitionLevel !== '未认定') {
    score += 12
  }
  if (scholarship.requiresPovertyRecognition && student.currentRecognitionLevel === '未认定') {
    score -= 12
  }
  const allowedRuleIds = Array.isArray(scholarship.allowedRecognitionRuleIds) ? scholarship.allowedRecognitionRuleIds : []
  if (allowedRuleIds.length > 0) {
    const matchedCount = allowedRuleIds.filter((ruleId) => (student.confirmedRecognitionRuleIds || []).includes(ruleId)).length
    if (matchedCount > 0) {
      score += 10
    } else {
      score -= 12
    }
  }
  if (scholarship.type === '助学金' && student.currentRecognitionLevel !== '未认定') {
    score += 8
  }
  if (/新生/.test(String(scholarship.name || '')) && /大一/.test(String(student.grade || ''))) {
    score += 8
  }
  return clampNumber(score, 0, 100)
}

function buildScholarshipRecommendationReasons(student, scholarship, eligibility) {
  const reasons = []
  const reasonCodes = []
  if (scholarship.openForApply) {
    reasons.push('当前项目处于开放申请状态')
    reasonCodes.push('open_for_apply')
  } else {
    reasons.push('当前项目暂未开放申请')
    reasonCodes.push('not_open')
  }

  if (scholarship.collegeKey && scholarship.collegeKey === student.collegeKey) {
    reasons.push('该项目面向你所在学院，匹配度更高')
    reasonCodes.push('college_match')
  }

  if (scholarship.id === 'national-grant') {
    const tier = getNationalGrantTier(student.currentRecognitionLevel)
    if (tier) {
      reasons.push(`已按${tier.label}匹配国家助学金档位（${tier.amount}）`)
      reasonCodes.push('national_tier_matched')
    } else {
      reasons.push('需先完成成长支持认定后才能申请国家助学金')
      reasonCodes.push('recognition_required')
    }
  } else if (scholarship.requiresPovertyRecognition) {
    if (student.currentRecognitionLevel !== '未认定') {
      reasons.push(`你当前认定等级为${student.currentRecognitionLevel}，满足该项目的认定要求`)
      reasonCodes.push('recognition_matched')
    } else {
      reasons.push('该项目要求先完成成长支持认定')
      reasonCodes.push('recognition_required')
    }
  }

  const allowedRuleIds = Array.isArray(scholarship.allowedRecognitionRuleIds) ? scholarship.allowedRecognitionRuleIds : []
  if (allowedRuleIds.length > 0) {
    const matchedCount = allowedRuleIds.filter((ruleId) => (student.confirmedRecognitionRuleIds || []).includes(ruleId)).length
    if (matchedCount > 0) {
      reasons.push(`你已命中${matchedCount}项项目指定认定类型`)
      reasonCodes.push('recognition_type_matched')
    } else {
      reasons.push('你的成长支持认定类型与该项目指定条件暂不匹配')
      reasonCodes.push('recognition_type_unmatched')
    }
  }

  if (eligibility?.reason) {
    reasons.push(String(eligibility.reason))
  }

  return {
    reasons: reasons.slice(0, 4),
    reasonCodes: Array.from(new Set(reasonCodes)).slice(0, 4),
  }
}

function buildAiRecommendationReason({ eligibility, score, matchLevel, reasons }) {
  const baseReason = Array.isArray(reasons) && reasons.length > 0
    ? reasons[0]
    : (eligibility?.reason || '系统已根据你的当前条件完成匹配。')
  if (!eligibility?.eligible) {
    return `当前项目匹配值为${score}分（${matchLevel}），暂不建议优先申报。原因：${baseReason}`
  }
  return `当前项目匹配值为${score}分（${matchLevel}），建议优先准备材料。原因：${baseReason}`
}

function getStudentRecommendationFeed(student, limit = 8) {
  const scholarships = readJson(FILES.scholarships)
  const list = scholarships
    .map((scholarship) => {
      const eligibility = evaluateScholarshipEligibility(student, scholarship)
      const score = buildScholarshipRecommendationScore(student, scholarship, eligibility)
      const matchLevel = resolveRecommendationLevel(score)
      const reasonPayload = buildScholarshipRecommendationReasons(student, scholarship, eligibility)
      return {
        id: scholarship.id,
        name: scholarship.name,
        category: scholarship.category,
        type: scholarship.type,
        amountText: scholarship.amountText,
        deadline: scholarship.deadline,
        score,
        fitBucket: resolveRecommendationBucket(score),
        matchLevel,
        reasons: reasonPayload.reasons,
        reasonCodes: reasonPayload.reasonCodes,
        aiReason: buildAiRecommendationReason({ eligibility, score, matchLevel, reasons: reasonPayload.reasons }),
        eligibility,
      }
    })
    .sort((a, b) => b.score - a.score)
  return list.slice(0, Math.max(1, Math.min(30, Number(limit) || 8)))
}

function getStudentAlternativeScholarships(student, currentScholarshipId, limit = 4) {
  const recommendations = getStudentRecommendationFeed(student, 30)
  const candidates = recommendations
    .filter((item) => item.id !== currentScholarshipId)
    .filter((item) => item.eligibility?.eligible)
    .filter((item) => {
      const scholarship = getScholarshipById(item.id)
      return scholarship?.openForApply
    })
    .map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      amountText: item.amountText,
      deadline: item.deadline,
      score: item.score,
      matchLevel: item.matchLevel,
      fitBucket: item.fitBucket,
      reason: item.aiReason || item.reasons[0] || '当前项目与你的条件匹配度更高',
      fallbackReason: item.reasons[0] || '当前项目与你的条件匹配度更高',
      fitAdvice: item.fitBucket === 'high'
        ? '推荐优先尝试'
        : item.fitBucket === 'medium'
          ? '建议补齐材料后尝试'
          : '建议先完善条件再尝试',
    }))

  const shuffled = candidates.slice()
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const temp = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = temp
  }

  const safeLimit = Math.max(1, Math.min(8, Number(limit) || 4))
  return shuffled.slice(0, safeLimit)
}

function normalizeDeadlineReminders(list) {
  return (Array.isArray(list) ? list : [])
    .map((item) => {
      const normalizedStatus = ['pending', 'read', 'handled', 'overdue'].includes(String(item?.status || ''))
        ? String(item.status)
        : ['pending', 'handled'].includes(String(item?.status || ''))
          ? String(item.status)
          : 'pending'
      return {
        id: typeof item?.id === 'string' && item.id ? item.id : createId('deadline-reminder'),
        studentId: typeof item?.studentId === 'string' ? item.studentId : '',
        studentName: typeof item?.studentName === 'string' ? item.studentName : '',
        studentNo: typeof item?.studentNo === 'string' ? item.studentNo : '',
        college: typeof item?.college === 'string' ? item.college : '',
        scholarshipId: typeof item?.scholarshipId === 'string' ? item.scholarshipId : '',
        scholarshipName: typeof item?.scholarshipName === 'string' ? item.scholarshipName : '',
        deadline: typeof item?.deadline === 'string' ? item.deadline : '',
        hoursLeft: Number(item?.hoursLeft || 0),
        reason: typeof item?.reason === 'string' ? item.reason : '',
        status: normalizedStatus,
        createdAt: typeof item?.createdAt === 'string' && item.createdAt ? item.createdAt : new Date().toISOString(),
        readAt: typeof item?.readAt === 'string' ? item.readAt : '',
        handledAt: typeof item?.handledAt === 'string' ? item.handledAt : '',
      }
    })
    .filter((item) => Boolean(item.studentId) && Boolean(item.scholarshipId))
    .sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt))
}

function reconcileDeadlineReminderRecord(reminder, studentMap, scholarshipMap) {
  const studentId = String(reminder?.studentId || '').trim()
  const scholarshipId = String(reminder?.scholarshipId || '').trim()
  const student = studentMap.get(studentId)
  const scholarship = scholarshipMap.get(scholarshipId)
  if (!student || !scholarship) {
    return null
  }
  if (scholarship.collegeKey && scholarship.collegeKey !== student.collegeKey) {
    return null
  }
  const scholarshipName = String(scholarship.name || reminder.scholarshipName || '奖助项目').trim()
  return {
    ...reminder,
    studentName: String(student.name || '').trim(),
    studentNo: String(student.studentNo || '').trim(),
    college: String(student.college || '').trim(),
    scholarshipName,
    deadline: String(scholarship.deadline || reminder.deadline || '').trim(),
    reason: String(reminder?.reason || '').trim() || `${scholarshipName} 即将截止，请尽快完成申报材料提交。`,
  }
}

function sanitizeDeadlineReminders(list) {
  const students = readJson(FILES.students)
  const scholarships = readJson(FILES.scholarships)
  const studentMap = new Map(
    students
      .filter((item) => Boolean(item && item.id))
      .map((item) => [String(item.id).trim(), item]),
  )
  const scholarshipMap = new Map(
    scholarships
      .filter((item) => Boolean(item && item.id))
      .map((item) => [String(item.id).trim(), item]),
  )
  return normalizeDeadlineReminders(list)
    .map((item) => reconcileDeadlineReminderRecord(item, studentMap, scholarshipMap))
    .filter(Boolean)
}

function readDeadlineReminders() {
  const rawList = normalizeDeadlineReminders(readJson(FILES.deadlineReminders))
  const sanitizedList = sanitizeDeadlineReminders(rawList)
  if (JSON.stringify(rawList) !== JSON.stringify(sanitizedList)) {
    writeJson(FILES.deadlineReminders, sanitizedList)
  }
  return sanitizedList
}

function writeDeadlineReminders(list) {
  writeJson(FILES.deadlineReminders, sanitizeDeadlineReminders(list))
}

function parseDeadlineToTime(deadline) {
  const raw = String(deadline || '').trim()
  if (!raw) {
    return 0
  }
  const normalized = /T/.test(raw) ? raw : `${raw}T23:59:59+08:00`
  const value = Date.parse(normalized)
  return Number.isNaN(value) ? 0 : value
}

function buildStudentDeadlineReminders(student, options = {}) {
  if (!student) {
    return []
  }
  const hourWindow = clampNumber(options.hourWindow ?? 72, 1, 720)
  const now = Date.now()
  const list = readJson(FILES.scholarships)
  const applications = readJson(FILES.applications).map((item) => normalizeApplicationRecord(item))
  const reminderHistory = readDeadlineReminders()

  return list
    .filter((scholarship) => scholarship.openForApply)
    .filter((scholarship) => !scholarship.collegeKey || scholarship.collegeKey === student.collegeKey)
    .map((scholarship) => {
      const deadlineTime = parseDeadlineToTime(scholarship.deadline)
      if (!deadlineTime) {
        return null
      }
      const hoursLeft = Math.floor((deadlineTime - now) / 3600000)
      if (hoursLeft < 0 || hoursLeft > hourWindow) {
        return null
      }
      const eligibility = evaluateScholarshipEligibility(student, scholarship)
      if (!eligibility.eligible) {
        return null
      }
      const hasSubmitted = applications.some(
        (item) => item.studentId === student.id && item.scholarshipId === scholarship.id && item.status !== '驳回',
      )
      if (hasSubmitted) {
        return null
      }
      const hasPendingReminder = reminderHistory.some(
        (item) => item.studentId === student.id && item.scholarshipId === scholarship.id && (item.status === 'pending' || item.status === 'read'),
      )
      return {
        id: createId('deadline-reminder'),
        studentId: student.id,
        studentName: student.name,
        studentNo: student.studentNo,
        college: student.college,
        scholarshipId: scholarship.id,
        scholarshipName: scholarship.name,
        deadline: scholarship.deadline,
        hoursLeft,
        reason: `${scholarship.name} 即将截止，请尽快完成申报材料提交。`,
        alreadyPushed: hasPendingReminder,
        status: hasPendingReminder ? 'read' : 'pending',
        createdAt: new Date().toISOString(),
      }
    })
    .filter(Boolean)
    .sort((a, b) => Number(a.hoursLeft || 0) - Number(b.hoursLeft || 0))
}

function appendDeadlineReminders(reminders) {
  const list = readDeadlineReminders()
  reminders.forEach((item) => {
    if (!item || item.alreadyPushed) {
      return
    }
    list.unshift({
      id: item.id,
      studentId: item.studentId,
      studentName: item.studentName,
      studentNo: item.studentNo,
      college: item.college,
      scholarshipId: item.scholarshipId,
      scholarshipName: item.scholarshipName,
      deadline: item.deadline,
      hoursLeft: item.hoursLeft,
      reason: item.reason,
      status: 'pending',
      createdAt: item.createdAt,
      readAt: '',
      handledAt: '',
    })
  })
  writeDeadlineReminders(list)
}

function normalizeShareCardText(value, maxLength = 120) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) {
    return ''
  }
  return text.slice(0, maxLength)
}

function normalizeShareProfileSnapshot(snapshot, fallbackSnapshot = {}) {
  const fallback = fallbackSnapshot && typeof fallbackSnapshot === 'object' ? fallbackSnapshot : {}
  return {
    studentName: normalizeShareCardText(snapshot?.studentName, 40) || normalizeShareCardText(fallback.studentName, 40),
    college: normalizeShareCardText(snapshot?.college, 60) || normalizeShareCardText(fallback.college, 60),
    level: normalizeShareCardText(snapshot?.level, 30) || normalizeShareCardText(fallback.level, 30),
  }
}

function normalizeShareCardPayload(payload, fallbackSharer = {}) {
  const sharer = normalizeShareProfileSnapshot(payload?.sharer, fallbackSharer)
  return {
    scholarshipId: normalizeShareCardText(payload?.scholarshipId, 80),
    scholarshipName: normalizeShareCardText(payload?.scholarshipName, 80),
    sponsor: normalizeShareCardText(payload?.sponsor, 80),
    amountText: normalizeShareCardText(payload?.amountText, 60),
    deadline: normalizeShareCardText(payload?.deadline, 40),
    reason: normalizeShareCardText(payload?.reason, 200),
    sharer,
  }
}

function normalizeShareCardRecord(item) {
  const fallbackId = typeof item?.id === 'string' && item.id ? item.id : createId('share-card')
  const normalizedCode = normalizeShareCardText(item?.code, 16).toUpperCase().replace(/[^A-Z0-9]/g, '')
  const code = normalizedCode || crypto.createHash('sha1').update(fallbackId).digest('hex').slice(0, 8).toUpperCase()
  const fallbackSharer = normalizeShareProfileSnapshot(item?.sharer)
  const payload = normalizeShareCardPayload(item?.payload, fallbackSharer)
  const sharer = normalizeShareProfileSnapshot(item?.sharer, payload.sharer)
  const safeScholarshipId = encodeURIComponent(payload.scholarshipId || '')
  const fallbackPath = safeScholarshipId
    ? `/pages/policy-detail/policy-detail?id=${safeScholarshipId}&shareCode=${encodeURIComponent(code)}`
    : '/pages/policy-detail/policy-detail'
  const normalizedPath = normalizeShareCardText(item?.path, 260)
  const subtitleByPayload = [
    payload.sponsor,
    payload.amountText,
    payload.deadline ? `截止：${payload.deadline}` : '',
  ].filter(Boolean).join(' · ')
  const scholarshipName = payload.scholarshipName || '奖助项目'
  const sharerName = sharer.studentName || '同学'
  return {
    id: fallbackId,
    code,
    path: normalizedPath.startsWith('/pages/') ? normalizedPath : fallbackPath,
    title: normalizeShareCardText(item?.title, 80) || `${sharerName} 推荐你关注：${scholarshipName}`,
    subtitle: normalizeShareCardText(item?.subtitle, 140) || subtitleByPayload || '点击查看项目详情与申请条件',
    poster: normalizePublicResourceUrl(item?.poster) || getDefaultAnnouncementCoverUrl(),
    sharer,
    payload: {
      ...payload,
      sharer,
    },
    createdAt: typeof item?.createdAt === 'string' && item.createdAt ? item.createdAt : new Date().toISOString(),
  }
}

function readShareCards() {
  return readJson(FILES.shareCards)
    .map((item) => normalizeShareCardRecord(item))
    .sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt))
}

function writeShareCards(list) {
  writeJson(FILES.shareCards, (Array.isArray(list) ? list : []).map((item) => normalizeShareCardRecord(item)))
}

function createShareCardCode(list = []) {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  const existingCodes = new Set(
    (Array.isArray(list) ? list : [])
      .map((item) => normalizeShareCardText(item?.code, 16).toUpperCase())
      .filter(Boolean),
  )
  for (let attempt = 0; attempt < 40; attempt += 1) {
    let code = ''
    for (let index = 0; index < 6; index += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)]
    }
    if (!existingCodes.has(code)) {
      return code
    }
  }
  return crypto.createHash('sha1').update(`${Date.now()}-${Math.random()}`).digest('hex').slice(0, 6).toUpperCase()
}

function normalizePolicyViewRecord(item) {
  const viewAt = typeof item?.viewAt === 'string' && item.viewAt ? item.viewAt : new Date().toISOString()
  const leaveAt = typeof item?.leaveAt === 'string' && item.leaveAt ? item.leaveAt : ''
  let stayDurationMs = Number(item?.stayDurationMs || 0)
  if (!Number.isFinite(stayDurationMs) || stayDurationMs < 0) {
    stayDurationMs = 0
  }
  if (!stayDurationMs && leaveAt) {
    const viewTime = parseTime(viewAt)
    const leaveTime = parseTime(leaveAt)
    if (viewTime > 0 && leaveTime > viewTime) {
      stayDurationMs = leaveTime - viewTime
    }
  }
  return {
    id: typeof item?.id === 'string' && item.id ? item.id : createId('policy-view'),
    studentId: typeof item?.studentId === 'string' ? item.studentId : '',
    studentNo: typeof item?.studentNo === 'string' ? item.studentNo : '',
    studentName: typeof item?.studentName === 'string' ? item.studentName : '',
    college: typeof item?.college === 'string' ? item.college : '',
    grade: typeof item?.grade === 'string' ? item.grade : '',
    major: typeof item?.major === 'string' ? item.major : '',
    gender: typeof item?.gender === 'string' ? item.gender : '',
    scholarshipId: typeof item?.scholarshipId === 'string' ? item.scholarshipId : '',
    scholarshipName: typeof item?.scholarshipName === 'string' ? item.scholarshipName : '',
    category: typeof item?.category === 'string' ? item.category : '',
    scholarshipType: typeof item?.scholarshipType === 'string' ? item.scholarshipType : '',
    academicYear: typeof item?.academicYear === 'string' && item.academicYear ? item.academicYear : getAcademicYearByDate(viewAt),
    viewAt,
    leaveAt,
    stayDurationMs,
  }
}

function readPolicyViews() {
  return readJson(FILES.policyViews)
    .map((item) => normalizePolicyViewRecord(item))
    .filter((item) => Boolean(item.studentId) && Boolean(item.scholarshipId))
    .sort((a, b) => parseTime(b.viewAt) - parseTime(a.viewAt))
}

function writePolicyViews(list) {
  writeJson(FILES.policyViews, (Array.isArray(list) ? list : []).map((item) => normalizePolicyViewRecord(item)))
}

function upsertPolicyViewRecord(record) {
  const now = new Date().toISOString()
  const list = readPolicyViews()
  const nextRecord = normalizePolicyViewRecord({
    ...record,
    viewAt: now,
    academicYear: getAcademicYearByDate(now),
  })
  const duplicateIndex = list.findIndex((item) => {
    const sameStudent = item.studentId === nextRecord.studentId
    const sameScholarship = item.scholarshipId === nextRecord.scholarshipId
    if (!sameStudent || !sameScholarship) {
      return false
    }
    return Math.abs(parseTime(item.viewAt) - parseTime(now)) <= 6 * 3600000
  })

  if (duplicateIndex >= 0) {
    list[duplicateIndex] = normalizePolicyViewRecord({
      ...list[duplicateIndex],
      ...nextRecord,
      id: list[duplicateIndex].id,
      viewAt: now,
      academicYear: getAcademicYearByDate(now),
    })
    writePolicyViews(list)
    return list[duplicateIndex]
  }

  list.unshift(nextRecord)
  writePolicyViews(list)
  return nextRecord
}

function buildScholarshipMaterialChecklist(scholarship) {
  const checklist = [
    '个人申请陈述（不少于500字）',
    '成绩单或综合测评证明',
    '身份证明（学生证/身份证）',
  ]
  if (scholarship?.requiresPovertyRecognition) {
    checklist.push('家庭经济困难认定结果截图')
  }
  if (scholarship?.type === '奖学金') {
    checklist.push('获奖或实践证明材料')
  }
  if (scholarship?.type === '助学金') {
    checklist.push('家庭经济情况相关佐证材料')
  }
  if (Array.isArray(scholarship?.conditions) && scholarship.conditions.length > 0) {
    checklist.push(`项目条件自查：${scholarship.conditions.slice(0, 2).join('；')}`)
  }
  return checklist
}

function pickMissingMaterials(requiredList, providedList) {
  const providedText = normalizeStringList(providedList).join(' | ')
  return normalizeStringList(requiredList).filter((item) => !providedText.includes(item.slice(0, 6)))
}

function splitMissingMaterialsByPriority(missingMaterials) {
  const list = normalizeStringList(missingMaterials)
  const required = []
  const recommended = []
  list.forEach((item) => {
    if (/申请陈述|成绩单|身份证明|认定结果|家庭经济/.test(item)) {
      required.push(item)
    } else {
      recommended.push(item)
    }
  })
  return {
    required,
    recommended,
  }
}

function buildMaterialNextAction({ scholarship, missingByPriority }) {
  const requiredCount = Number(missingByPriority?.required?.length || 0)
  if (requiredCount > 0) {
    return `建议先补齐${requiredCount}项必交材料，再提交${scholarship?.name || '目标项目'}申请。`
  }
  return `主要材料已覆盖，建议核对格式并尽快提交${scholarship?.name || '目标项目'}申请。`
}

function buildMaterialDraftText({ student, scholarship, personalSummary, hardshipNote, strengths, goal }) {
  const scholarshipName = scholarship?.name || '奖助项目'
  const recognitionText = student.currentRecognitionLevel === '未认定'
    ? '目前我正在完善家庭经济困难认定材料。'
    : `目前已通过家庭经济困难认定，认定等级为${student.currentRecognitionLevel}。`
  const strengthsText = normalizeStringList(strengths).join('、') || '认真学习、积极参加校园活动'
  const summaryText = String(personalSummary || '').trim() || '我在校期间始终保持踏实学习，努力提升综合能力。'
  const hardshipText = String(hardshipNote || '').trim() || '家庭经济压力对学习和生活带来一定影响，但我始终坚持积极面对。'
  const goalText = String(goal || '').trim() || '若获资助，我将优先用于学习资料、课程实践与基本生活开支，并继续提升专业能力回馈学校。'
  return [
    `尊敬的老师：`,
    ``,
    `我是${student.college}${student.major}${student.className}的${student.name}（学号：${student.studentNo}）。现申请${scholarshipName}。`,
    ``,
    `在校期间，${summaryText}`,
    `我的主要优势包括：${strengthsText}。`,
    ``,
    `家庭方面，${hardshipText}`,
    `${recognitionText}`,
    ``,
    `${goalText}`,
    ``,
    `恳请老师审核。`,
    ``,
    `申请人：${student.name}`,
    `日期：${new Date().toISOString().slice(0, 10)}`,
  ].join('\n')
}

async function createMaterialDraftRecord(student, payload) {
  const scholarship = payload?.scholarshipId ? getScholarshipById(payload.scholarshipId) : null
  const requiredChecklist = scholarship
    ? buildScholarshipMaterialChecklist(scholarship)
    : ['个人申请陈述（不少于500字）', '身份证明（学生证/身份证）', '材料真实性承诺说明']
  const providedMaterials = normalizeStringList(payload?.providedMaterials)
  const missingMaterials = pickMissingMaterials(requiredChecklist, providedMaterials)
  const missingMaterialsByPriority = splitMissingMaterialsByPriority(missingMaterials)
  const localDraftText = buildMaterialDraftText({
    student,
    scholarship,
    personalSummary: payload?.personalSummary,
    hardshipNote: payload?.hardshipNote,
    strengths: payload?.strengths,
    goal: payload?.goal,
  })
  const baseRecord = {
    id: createId('material-draft'),
    studentId: student.id,
    scholarshipId: scholarship?.id || '',
    scholarshipName: scholarship?.name || '通用申请',
    draftText: localDraftText,
    requiredChecklist,
    missingMaterials,
    missingMaterialsByPriority,
    providedMaterials,
    nextAction: buildMaterialNextAction({ scholarship, missingByPriority: missingMaterialsByPriority }),
    tips: [
      '建议先在“我的认定申请”确认当前成长支持认定状态。',
      '重点突出真实经历与可量化成果，避免空泛表述。',
      '提交前逐项核对附件清单，减少退回补充。',
    ],
    createdAt: new Date().toISOString(),
    aiModel: 'fallback-local',
    fallbackUsed: true,
  }

  const question = [
    `目标项目：${scholarship?.name || '通用奖助项目'}`,
    `个人概况：${String(payload?.personalSummary || '').trim() || '未填写'}`,
    `家庭情况：${String(payload?.hardshipNote || '').trim() || '未填写'}`,
    `能力标签：${normalizeStringList(payload?.strengths).join('、') || '未填写'}`,
    `资助计划：${String(payload?.goal || '').trim() || '未填写'}`,
    '请生成一版可直接提交的奖助申请草稿。',
  ].join('\n')

  const aiResult = await generateSceneAiReply({
    scene: 'material-draft',
    question,
    history: [],
    student,
  })

  if (!aiResult.reply) {
    throw new Error(aiResult.error || 'AI服务暂不可用，请稍后重试。')
  }

  return {
    ...baseRecord,
    draftText: aiResult.reply,
    aiModel: aiResult.model,
    fallbackUsed: Boolean(aiResult.fallbackUsed),
  }
}

function normalizeMaterialDraftRecord(item) {
  const record = item && typeof item === 'object' ? item : {}
  const missingMaterials = normalizeStringList(record.missingMaterials)
  const missingMaterialsByPriority = record.missingMaterialsByPriority && typeof record.missingMaterialsByPriority === 'object'
    ? {
      required: normalizeStringList(record.missingMaterialsByPriority.required),
      recommended: normalizeStringList(record.missingMaterialsByPriority.recommended),
    }
    : splitMissingMaterialsByPriority(missingMaterials)
  return {
    id: typeof record.id === 'string' && record.id ? record.id : createId('material-draft'),
    studentId: typeof record.studentId === 'string' ? record.studentId : '',
    scholarshipId: typeof record.scholarshipId === 'string' ? record.scholarshipId : '',
    scholarshipName: typeof record.scholarshipName === 'string' ? record.scholarshipName : '通用申请',
    draftText: typeof record.draftText === 'string' ? record.draftText : '',
    requiredChecklist: normalizeStringList(record.requiredChecklist),
    missingMaterials,
    missingMaterialsByPriority,
    providedMaterials: normalizeStringList(record.providedMaterials),
    nextAction: typeof record.nextAction === 'string'
      ? record.nextAction
      : buildMaterialNextAction({ scholarship: { name: record.scholarshipName }, missingByPriority: missingMaterialsByPriority }),
    tips: normalizeStringList(record.tips),
    createdAt: typeof record.createdAt === 'string' && record.createdAt ? record.createdAt : new Date().toISOString(),
    aiModel: typeof record.aiModel === 'string' ? record.aiModel : 'fallback-local',
    fallbackUsed: Boolean(record.fallbackUsed),
  }
}

function readMaterialDrafts() {
  return readJson(FILES.materialDrafts)
    .map((item) => normalizeMaterialDraftRecord(item))
    .sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt))
}

function writeMaterialDrafts(list) {
  writeJson(FILES.materialDrafts, (Array.isArray(list) ? list : []).map((item) => normalizeMaterialDraftRecord(item)))
}

function normalizeEmotionKeywordBucket(values) {
  const list = (Array.isArray(values) ? values : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean)
  return Array.from(new Set(list))
}

function normalizeEmotionKeywordsRecord(item, fallback = DEFAULT_EMOTION_KEYWORDS) {
  const source = item && typeof item === 'object' ? item : {}
  const fallbackSource = fallback && typeof fallback === 'object' ? fallback : DEFAULT_EMOTION_KEYWORDS
  const high = Array.isArray(source.high)
    ? normalizeEmotionKeywordBucket(source.high)
    : normalizeEmotionKeywordBucket(fallbackSource.high)
  const medium = Array.isArray(source.medium)
    ? normalizeEmotionKeywordBucket(source.medium)
    : normalizeEmotionKeywordBucket(fallbackSource.medium)
  const low = Array.isArray(source.low)
    ? normalizeEmotionKeywordBucket(source.low)
    : normalizeEmotionKeywordBucket(fallbackSource.low)
  return {
    high,
    medium,
    low,
  }
}

function readEmotionKeywords() {
  const stored = normalizeEmotionKeywordsRecord(readJson(FILES.emotionKeywords))
  return {
    high: Array.from(new Set([...DEFAULT_EMOTION_KEYWORDS.high, ...stored.high])),
    medium: Array.from(new Set([...DEFAULT_EMOTION_KEYWORDS.medium, ...stored.medium])),
    low: Array.from(new Set([...DEFAULT_EMOTION_KEYWORDS.low, ...stored.low])),
  }
}

function writeEmotionKeywords(item) {
  writeJson(FILES.emotionKeywords, normalizeEmotionKeywordsRecord(item))
}

function getEmotionKeywordGroups() {
  const keywords = readEmotionKeywords()
  return [
    {
      code: 'high',
      label: '红色预警关键词',
      levelLabel: '红色预警',
      keywords: keywords.high,
    },
    {
      code: 'medium',
      label: '黄色预警关键词',
      levelLabel: '黄色预警',
      keywords: keywords.medium,
    },
    {
      code: 'low',
      label: '蓝色观察关键词',
      levelLabel: '蓝色观察',
      keywords: keywords.low,
    },
  ]
}

function summarizeEmotionEventHint(event) {
  const keywords = normalizeStringList(event?.matchedKeywords)
  const aiSignals = normalizeStringList(event?.aiSignals)
  const riskTags = normalizeStringList(event?.riskTags)
  const signalText = riskTags[0] || aiSignals[0] || keywords[0] || ''
  if (event?.levelCode === 'high') {
    return signalText ? `出现高风险表达信号（${signalText}），建议立即人工干预。` : '出现高风险表达信号，建议立即人工干预。'
  }
  if (event?.levelCode === 'medium') {
    return signalText ? `近期多次提及压力相关话题（${signalText}），建议尽快一对一关怀。` : '近期多次提及压力相关话题，建议尽快一对一关怀。'
  }
  if (signalText) {
    return `出现轻度情绪波动信号（${signalText}），建议持续关注。`
  }
  return '建议持续关注学生近期情绪变化。'
}

function buildEmotionRiskTags({ content, levelCode, matchedKeywords, aiSignals, repeatedStressCount }) {
  const text = String(content || '').toLowerCase()
  const mergedSignals = `${text} ${normalizeStringList(matchedKeywords).join(' ')} ${normalizeStringList(aiSignals).join(' ')}`
  const tags = []

  if (levelCode === 'high') {
    tags.push('高风险')
  } else if (levelCode === 'medium') {
    tags.push('中风险')
  } else {
    tags.push('低风险观察')
  }

  if (Number(repeatedStressCount || 0) >= 2) {
    tags.push('重复压力事件')
  }
  if (/学业|挂科|论文|考试|绩点/.test(mergedSignals)) {
    tags.push('学业压力')
  }
  if (/钱|生活费|学费|兼职|经济|困难|借|负债/.test(mergedSignals)) {
    tags.push('经济压力')
  }
  if (/失眠|睡不着|睡眠/.test(mergedSignals)) {
    tags.push('睡眠问题')
  }
  if (/孤独|没人|无助|社交|沟通/.test(mergedSignals)) {
    tags.push('人际支持不足')
  }
  if (/自杀|自残|结束生命|不想活|活不下去/.test(mergedSignals)) {
    tags.push('伤害风险')
  }

  return Array.from(new Set(tags))
}

function normalizeEmotionEventChatMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .map((item) => {
      const role = item?.role === 'assistant' ? 'assistant' : item?.role === 'user' ? 'user' : ''
      const content = typeof item?.content === 'string' ? item.content.trim() : ''
      if (!role || !content) {
        return null
      }
      return {
        role,
        content,
      }
    })
    .filter(Boolean)
    .slice(-12)
}

function resolveEmotionEventChatMessages(item) {
  const normalized = normalizeEmotionEventChatMessages(item?.chatMessages)
  if (normalized.length > 0) {
    return normalized
  }
  const content = typeof item?.content === 'string' ? item.content.trim() : ''
  if (!content) {
    return []
  }
  return [{ role: 'user', content }]
}

function buildEmotionEventChatSnapshot(history, question, reply = '') {
  const snapshot = normalizeEmotionEventChatMessages(history)
  const normalizedQuestion = typeof question === 'string' ? question.trim() : ''
  if (normalizedQuestion) {
    const last = snapshot[snapshot.length - 1]
    if (!last || last.role !== 'user' || last.content !== normalizedQuestion) {
      snapshot.push({ role: 'user', content: normalizedQuestion })
    }
  }
  const normalizedReply = typeof reply === 'string' ? reply.trim() : ''
  if (normalizedReply) {
    snapshot.push({ role: 'assistant', content: normalizedReply })
  }
  return normalizeEmotionEventChatMessages(snapshot)
}

function normalizeEmotionEventRecord(item) {
  const levelCode = ['high', 'medium', 'low'].includes(String(item?.levelCode || '')) ? String(item.levelCode) : 'low'
  const status = ['待关注', '已处理', '可观察'].includes(String(item?.status || ''))
    ? String(item.status)
    : getEmotionStatusByLevel(levelCode)
  return {
    id: typeof item?.id === 'string' && item.id ? item.id : createId('emotion-event'),
    studentId: typeof item?.studentId === 'string' ? item.studentId : '',
    studentNo: typeof item?.studentNo === 'string' ? item.studentNo : '',
    studentName: typeof item?.studentName === 'string' ? item.studentName : '',
    college: typeof item?.college === 'string' ? item.college : '',
    grade: typeof item?.grade === 'string' ? item.grade : '',
    channel: typeof item?.channel === 'string' ? item.channel : 'treehole',
    content: typeof item?.content === 'string' ? item.content : '',
    chatMessages: normalizeEmotionEventChatMessages(item?.chatMessages),
    levelCode,
    levelColor: typeof item?.levelColor === 'string' ? item.levelColor : (levelCode === 'high' ? '红色' : levelCode === 'medium' ? '黄色' : '蓝色'),
    priority: clampNumber(item?.priority ?? (levelCode === 'high' ? 3 : levelCode === 'medium' ? 2 : 1), 1, 3),
    matchedKeywords: normalizeStringList(item?.matchedKeywords),
    aiSignals: normalizeStringList(item?.aiSignals),
    riskTags: normalizeStringList(item?.riskTags),
    triggerReason: typeof item?.triggerReason === 'string' ? item.triggerReason : '',
    summaryHint: typeof item?.summaryHint === 'string'
      ? item.summaryHint
      : summarizeEmotionEventHint(item),
    suggestion: typeof item?.suggestion === 'string' ? item.suggestion : '',
    sentimentScore: clampNumber(item?.sentimentScore ?? -10, -100, 100),
    status,
    handleNote: typeof item?.handleNote === 'string' ? item.handleNote : '',
    handler: typeof item?.handler === 'string' ? item.handler : '',
    createdAt: typeof item?.createdAt === 'string' && item.createdAt ? item.createdAt : new Date().toISOString(),
    handledAt: typeof item?.handledAt === 'string' ? item.handledAt : '',
  }
}

function readEmotionEvents() {
  return readJson(FILES.emotionEvents)
    .map((item) => normalizeEmotionEventRecord(item))
    .sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt))
}

function writeEmotionEvents(list) {
  writeJson(FILES.emotionEvents, list.map((item) => normalizeEmotionEventRecord(item)))
}

function extractMatchedKeywords(content, keywords) {
  return keywords.filter((keyword) => content.includes(keyword))
}

function getEmotionStatusByLevel(levelCode) {
  if (levelCode === 'high' || levelCode === 'medium') {
    return '待关注'
  }
  return '可观察'
}

function detectAiEmotionSignals(content, recentEvents) {
  const text = String(content || '').trim().toLowerCase()
  if (!text) {
    return {
      levelCode: 'low',
      priority: 1,
      matchedSignals: [],
      triggerReason: '',
      suggestion: '',
      sentimentScore: -8,
      repeatedStressCount: 0,
      content: '',
    }
  }

  const matchedHigh = AI_EMOTION_PATTERNS.high.filter((item) => item.pattern.test(text)).map((item) => item.label)
  const matchedMedium = AI_EMOTION_PATTERNS.medium.filter((item) => item.pattern.test(text)).map((item) => item.label)
  const matchedLow = AI_EMOTION_PATTERNS.low.filter((item) => item.pattern.test(text)).map((item) => item.label)

  const negativeTokenCount = AI_NEGATIVE_TOKENS.reduce((count, token) => count + (text.includes(token) ? 1 : 0), 0)
  const crisisTokenCount = AI_CRISIS_TOKENS.reduce((count, token) => count + (text.includes(token) ? 1 : 0), 0)
  const recentMediumOrHighCount = (Array.isArray(recentEvents) ? recentEvents : []).filter(
    (item) => item.levelCode === 'medium' || item.levelCode === 'high',
  ).length

  let levelCode = 'low'
  let priority = 1
  let sentimentScore = -12 - Math.min(negativeTokenCount * 6, 30)
  let triggerReason = ''
  let suggestion = ''
  let matchedSignals = []

  if (matchedHigh.length > 0 || crisisTokenCount >= 2) {
    levelCode = 'high'
    priority = 3
    sentimentScore = -90
    matchedSignals = matchedHigh.length > 0 ? matchedHigh : ['检测到多处危机语义表达']
    triggerReason = `AI语义识别高风险信号：${matchedSignals.join('、')}`
    suggestion = 'AI识别到紧急风险语义，请辅导员立即人工复核并优先干预。'
  } else if (matchedMedium.length > 0 || negativeTokenCount >= 3 || recentMediumOrHighCount >= 2) {
    levelCode = 'medium'
    priority = 2
    sentimentScore = Math.min(-65, -35 - negativeTokenCount * 6)
    matchedSignals = matchedMedium.length > 0 ? matchedMedium : ['检测到持续负向语义表达']
    const baseReason = matchedMedium.length > 0 ? matchedSignals.join('、') : '近期负向表达密度偏高'
    const trendReason = recentMediumOrHighCount >= 2 ? '且近7天出现重复压力事件' : ''
    triggerReason = `AI语义识别中风险信号：${baseReason}${trendReason ? `，${trendReason}` : ''}`
    suggestion = '建议辅导员在24小时内进行关怀访谈，并持续跟踪情绪变化。'
  } else if (matchedLow.length > 0 || negativeTokenCount >= 1) {
    levelCode = 'low'
    priority = 1
    sentimentScore = Math.min(-20, sentimentScore)
    matchedSignals = matchedLow.length > 0 ? matchedLow : ['检测到轻度负向情绪表达']
    triggerReason = `AI语义识别低风险信号：${matchedSignals.join('、')}`
    suggestion = '建议继续观察并给予鼓励性反馈。'
  }

  return {
    levelCode,
    priority,
    matchedSignals,
    triggerReason,
    suggestion,
    sentimentScore: clampNumber(sentimentScore, -100, 100),
    repeatedStressCount: recentMediumOrHighCount,
    content: text,
  }
}

function mergeEmotionAnalyses(keywordAnalysis, aiAnalysis) {
  const levelRank = { low: 1, medium: 2, high: 3 }
  const safeKeyword = keywordAnalysis && typeof keywordAnalysis === 'object' ? keywordAnalysis : {}
  const safeAi = aiAnalysis && typeof aiAnalysis === 'object' ? aiAnalysis : {}

  const keywordLevel = ['high', 'medium', 'low'].includes(safeKeyword.levelCode) ? safeKeyword.levelCode : 'low'
  const aiLevel = ['high', 'medium', 'low'].includes(safeAi.levelCode) ? safeAi.levelCode : 'low'
  const finalLevel = levelRank[aiLevel] > levelRank[keywordLevel] ? aiLevel : keywordLevel

  const keywordReason = typeof safeKeyword.triggerReason === 'string' ? safeKeyword.triggerReason.trim() : ''
  const aiReason = typeof safeAi.triggerReason === 'string' ? safeAi.triggerReason.trim() : ''

  const finalReason = [keywordReason, aiReason]
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .join('；')

  const keywordSuggestion = typeof safeKeyword.suggestion === 'string' ? safeKeyword.suggestion.trim() : ''
  const aiSuggestion = typeof safeAi.suggestion === 'string' ? safeAi.suggestion.trim() : ''
  const finalSuggestion = [keywordSuggestion, aiSuggestion]
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .join('；')

  const finalPriority = clampNumber(
    Math.max(Number(safeKeyword.priority || 1), Number(safeAi.priority || 1), levelRank[finalLevel] || 1),
    1,
    3,
  )
  const finalSentimentScore = Math.min(
    Number.isFinite(Number(safeKeyword.sentimentScore)) ? Number(safeKeyword.sentimentScore) : -10,
    Number.isFinite(Number(safeAi.sentimentScore)) ? Number(safeAi.sentimentScore) : -10,
  )

  const matchedKeywords = normalizeStringList(safeKeyword.matchedKeywords)
  const aiSignals = normalizeStringList(safeAi.matchedSignals)
  const riskTags = buildEmotionRiskTags({
    content: safeKeyword.content || safeAi.content || '',
    levelCode: finalLevel,
    matchedKeywords,
    aiSignals,
    repeatedStressCount: Number(safeAi.repeatedStressCount || safeKeyword.repeatedStressCount || 0),
  })

  return {
    levelCode: finalLevel,
    levelColor: finalLevel === 'high' ? '红色' : finalLevel === 'medium' ? '黄色' : '蓝色',
    priority: finalPriority,
    matchedKeywords,
    aiSignals,
    riskTags,
    triggerReason: finalReason || '未识别到明显高风险情绪信号',
    suggestion: finalSuggestion || '建议继续观察并保持鼓励性回应。',
    sentimentScore: clampNumber(finalSentimentScore, -100, 100),
  }
}

function analyzeEmotionRisk(studentId, content) {
  const normalizedContent = String(content || '').trim()
  const emotionKeywords = readEmotionKeywords()
  const highHits = extractMatchedKeywords(normalizedContent, emotionKeywords.high)
  const mediumHits = extractMatchedKeywords(normalizedContent, emotionKeywords.medium)
  const lowHits = extractMatchedKeywords(normalizedContent, emotionKeywords.low)
  const now = Date.now()
  const recentEvents = readJson(FILES.emotionEvents).filter((item) => {
    if (item.studentId !== studentId) {
      return false
    }
    const timestamp = Date.parse(String(item.createdAt || ''))
    if (Number.isNaN(timestamp)) {
      return false
    }
    return now - timestamp <= 7 * 24 * 60 * 60 * 1000
  })
  const repeatedStressCount = recentEvents.filter((item) => item.levelCode === 'medium' || item.levelCode === 'high').length

  let keywordAnalysis
  if (highHits.length > 0) {
    keywordAnalysis = {
      content: normalizedContent,
      repeatedStressCount,
      levelCode: 'high',
      levelColor: '红色',
      priority: 3,
      matchedKeywords: highHits,
      triggerReason: `命中高风险关键词：${highHits.join('、')}`,
      suggestion: '检测到高风险表达，系统已生成紧急提醒，请辅导员优先联系学生。',
      sentimentScore: -95,
    }
  } else if (mediumHits.length > 0 || repeatedStressCount >= 2) {
    const keywordText = mediumHits.length > 0 ? `命中关键词：${mediumHits.join('、')}` : '近7天相关负面话题重复出现'
    keywordAnalysis = {
      content: normalizedContent,
      repeatedStressCount,
      levelCode: 'medium',
      levelColor: '黄色',
      priority: 2,
      matchedKeywords: mediumHits,
      triggerReason: keywordText,
      suggestion: '建议辅导员在24小时内进行一对一关怀沟通。',
      sentimentScore: -70,
    }
  } else {
    keywordAnalysis = {
      content: normalizedContent,
      repeatedStressCount,
      levelCode: 'low',
      levelColor: '蓝色',
      priority: 1,
      matchedKeywords: lowHits,
      triggerReason: lowHits.length > 0 ? `出现轻度压力词：${lowHits.join('、')}` : '',
      suggestion: lowHits.length > 0 ? '建议继续观察，保持鼓励性回应。' : '',
      sentimentScore: lowHits.length > 0 ? -35 : -10,
    }
  }

  const aiAnalysis = detectAiEmotionSignals(normalizedContent, recentEvents)
  return mergeEmotionAnalyses(keywordAnalysis, aiAnalysis)
}

function sortCareAlerts(list) {
  return [...list].sort((a, b) => {
    const priorityDiff = Number(b.priority || 0) - Number(a.priority || 0)
    if (priorityDiff !== 0) {
      return priorityDiff
    }
    return parseTime(b.createdAt) - parseTime(a.createdAt)
  })
}

function buildCareAlertSummary(list) {
  return {
    total: list.length,
    pending: list.filter((item) => item.status === '待关注').length,
    handled: list.filter((item) => item.status === '已处理').length,
    red: list.filter((item) => item.levelCode === 'high').length,
    yellow: list.filter((item) => item.levelCode === 'medium').length,
    blue: list.filter((item) => item.levelCode === 'low').length,
  }
}

function getMonthRange(monthText) {
  const current = new Date()
  const currentMonth = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
  const normalized = typeof monthText === 'string' ? monthText.trim() : ''
  const safeMonth = /^\d{4}-\d{2}$/.test(normalized) ? normalized : currentMonth
  const start = Date.parse(`${safeMonth}-01T00:00:00+08:00`)
  if (!start) {
    const fallbackStart = Date.parse(`${currentMonth}-01T00:00:00+08:00`)
    const fallbackEnd = Date.parse(`${currentMonth}-31T23:59:59+08:00`)
    return {
      month: currentMonth,
      startAt: fallbackStart,
      endAt: fallbackEnd,
    }
  }
  const [yearText, monthNumText] = safeMonth.split('-')
  const year = Number(yearText)
  const monthNumber = Number(monthNumText)
  const endMonth = monthNumber >= 12 ? 1 : monthNumber + 1
  const endYear = monthNumber >= 12 ? year + 1 : year
  const end = Date.parse(`${endYear}-${String(endMonth).padStart(2, '0')}-01T00:00:00+08:00`) - 1
  return {
    month: safeMonth,
    startAt: start,
    endAt: end,
  }
}

function getQuarterRange(periodValue) {
  const now = new Date()
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1
  const normalized = typeof periodValue === 'string' ? periodValue.trim() : ''
  const matched = normalized.match(/^(\d{4})-Q([1-4])$/)
  const year = matched ? Number(matched[1]) : now.getFullYear()
  const quarter = matched ? Number(matched[2]) : currentQuarter
  const startMonth = (quarter - 1) * 3 + 1
  const endMonth = startMonth + 2
  const startAt = Date.parse(`${year}-${String(startMonth).padStart(2, '0')}-01T00:00:00+08:00`)
  const endYear = endMonth >= 12 ? year + 1 : year
  const nextMonth = endMonth >= 12 ? 1 : endMonth + 1
  const endAt = Date.parse(`${endYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+08:00`) - 1
  return {
    quarter: `${year}-Q${quarter}`,
    startAt,
    endAt,
  }
}

function getYearRange(periodValue) {
  const now = new Date()
  const normalized = typeof periodValue === 'string' ? periodValue.trim() : ''
  const year = /^\d{4}$/.test(normalized) ? Number(normalized) : now.getFullYear()
  return {
    year: String(year),
    startAt: Date.parse(`${year}-01-01T00:00:00+08:00`),
    endAt: Date.parse(`${year + 1}-01-01T00:00:00+08:00`) - 1,
  }
}

function getPeriodRange(periodType, periodValue) {
  const type = ['month', 'quarter', 'year'].includes(String(periodType || '').trim())
    ? String(periodType).trim()
    : 'month'

  if (type === 'quarter') {
    const range = getQuarterRange(periodValue)
    return {
      periodType: 'quarter',
      periodValue: range.quarter,
      periodLabel: `${range.quarter} 季度报告`,
      startAt: range.startAt,
      endAt: range.endAt,
    }
  }

  if (type === 'year') {
    const range = getYearRange(periodValue)
    return {
      periodType: 'year',
      periodValue: range.year,
      periodLabel: `${range.year} 年度报告`,
      startAt: range.startAt,
      endAt: range.endAt,
    }
  }

  const range = getMonthRange(periodValue)
  return {
    periodType: 'month',
    periodValue: range.month,
    periodLabel: `${range.month} 月度报告`,
    startAt: range.startAt,
    endAt: range.endAt,
  }
}

function isTimeInRange(value, range) {
  const timestamp = parseTime(value)
  if (!timestamp || !range) {
    return false
  }
  return timestamp >= Number(range.startAt || 0) && timestamp <= Number(range.endAt || 0)
}

function buildAverageHandleHours(list) {
  const hoursList = (Array.isArray(list) ? list : [])
    .map((item) => {
      const createdAt = parseTime(item.createdAt)
      const handledAt = parseTime(item.handledAt)
      if (!createdAt || !handledAt || handledAt < createdAt) {
        return 0
      }
      return (handledAt - createdAt) / 3600000
    })
    .filter((hours) => hours > 0)
  if (hoursList.length === 0) {
    return 0
  }
  return Number((hoursList.reduce((sum, hours) => sum + hours, 0) / hoursList.length).toFixed(2))
}

function getAiReportSceneLabel(scene) {
  const sceneMap = {
    emotion: 'AI树洞',
    onboarding: 'AI使用向导',
    recognition: 'AI认定助手',
    scholarship: 'AI奖助助手',
    'material-draft': 'AI材料草稿',
    'teacher-assistant': 'AI老师助手',
    general: 'AI智能助手',
  }
  const key = String(scene || '').trim()
  return sceneMap[key] || key || 'AI会话'
}

function buildTeacherSummaryReport(periodType, periodValue) {
  const range = getPeriodRange(periodType, periodValue)
  const students = readJson(FILES.students)
  const studentMap = students.reduce((acc, item) => {
    acc[item.id] = item
    return acc
  }, {})
  const targetStudents = students.filter((item) => ['特别困难', '困难'].includes(String(item.currentRecognitionLevel || '')))

  const emotionEvents = readEmotionEvents().filter((item) => isTimeInRange(item.createdAt, range))
  const aiConversationStore = getAiConversationStore()
    .map((item) => normalizeAiConversationRecord(item))
    .filter((item) => isTimeInRange(item.updatedAt, range))
  const emotionConversations = aiConversationStore.filter((item) => item.scene === 'emotion')
  const emotionMessageCount = emotionConversations.reduce(
    (sum, item) => sum + trimAiHistory(item.history, AI_PERSIST_HISTORY_LIMIT).length,
    0,
  )
  const emotionConversationStudentCount = new Set(emotionConversations.map((item) => item.studentId).filter(Boolean)).size
  const aiConversationStudentCount = new Set(aiConversationStore.map((item) => item.studentId).filter(Boolean)).size

  const aiSceneBreakdown = aiConversationStore
    .reduce((acc, item) => {
      const label = getAiReportSceneLabel(item.scene)
      const existing = acc.find((entry) => entry.label === label)
      if (existing) {
        existing.count += 1
      } else {
        acc.push({ label, count: 1 })
      }
      return acc
    }, [])
    .sort((a, b) => b.count - a.count)

  const careSummary = buildCareAlertSummary(emotionEvents)
  const handledAlerts = emotionEvents.filter((item) => item.status === '已处理' && item.handledAt)
  const averageHandleHours = buildAverageHandleHours(handledAlerts)
  const careClusters = buildCareAlertClusters(emotionEvents)

  const aiSignalTop = emotionEvents
    .reduce((acc, item) => {
      normalizeStringList(item.aiSignals).forEach((signal) => {
        const existing = acc.find((entry) => entry.label === signal)
        if (existing) {
          existing.count += 1
        } else {
          acc.push({ label: signal, count: 1 })
        }
      })
      return acc
    }, [])
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const collegeTop = emotionEvents
    .reduce((acc, item) => {
      const label = String(item.college || '未填写学院').trim() || '未填写学院'
      const existing = acc.find((entry) => entry.label === label)
      if (existing) {
        existing.count += 1
      } else {
        acc.push({ label, count: 1 })
      }
      return acc
    }, [])
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const themeTop = emotionEvents
    .reduce((acc, item) => {
      buildPsychologyThemeTags(item).forEach((theme) => {
        const existing = acc.find((entry) => entry.label === theme)
        if (existing) {
          existing.count += 1
        } else {
          acc.push({ label: theme, count: 1 })
        }
      })
      return acc
    }, [])
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const highRiskStudents = careClusters
    .filter((item) => item.levelCode === 'high')
    .slice(0, 8)
    .map((item) => ({
      studentId: item.studentId,
      studentNo: item.studentNo,
      studentName: item.studentName,
      college: item.college,
      eventCount: item.eventCount,
      pendingCount: item.pendingCount,
      latestCreatedAt: item.latestCreatedAt,
      suggestion: item.suggestion,
    }))

  const levelDistribution = [
    { level: 'high', label: '红色预警', count: careSummary.red },
    { level: 'medium', label: '黄色预警', count: careSummary.yellow },
    { level: 'low', label: '蓝色观察', count: careSummary.blue },
  ]

  const psychologyTrend = buildTeacherPsychologyTrendData(range)
  const scholarshipAnalytics = buildTeacherScholarshipAnalytics(range)
  const policyViews = readPolicyViews().filter((item) => isTimeInRange(item.viewAt, range))

  const shareCards = readShareCards().filter((item) => isTimeInRange(item.createdAt, range))
  const shareProjectTop = shareCards
    .reduce((acc, item) => {
      const label = String(item?.payload?.scholarshipName || item?.title || '未命名项目').trim() || '未命名项目'
      const existing = acc.find((entry) => entry.label === label)
      if (existing) {
        existing.count += 1
      } else {
        acc.push({ label, count: 1 })
      }
      return acc
    }, [])
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
  const shareCollegeTop = shareCards
    .reduce((acc, item) => {
      const label = String(item?.sharer?.college || '未填写学院').trim() || '未填写学院'
      const existing = acc.find((entry) => entry.label === label)
      if (existing) {
        existing.count += 1
      } else {
        acc.push({ label, count: 1 })
      }
      return acc
    }, [])
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  const deadlineReminders = readDeadlineReminders().filter((item) => isTimeInRange(item.createdAt, range))
  const pendingDeadlineCount = deadlineReminders.filter((item) => item.status === 'pending' || item.status === 'read').length
  const handledDeadlineCount = deadlineReminders.filter((item) => item.status === 'handled' || item.status === 'overdue').length
  const deadlineProjectTop = deadlineReminders
    .reduce((acc, item) => {
      const label = String(item.scholarshipName || '未命名项目').trim() || '未命名项目'
      const existing = acc.find((entry) => entry.label === label)
      if (existing) {
        existing.count += 1
      } else {
        acc.push({ label, count: 1 })
      }
      return acc
    }, [])
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  const recognitions = readJson(FILES.recognitions)
  const recognitionSubmissions = recognitions.filter((item) => isTimeInRange(item.submittedAt, range))
  const recognitionApproved = recognitions.filter(
    (item) => item.reviewStatus === '审核通过' && isTimeInRange(item.reviewedAt, range),
  )
  const recognitionLevelTop = recognitionApproved
    .reduce((acc, item) => {
      const label = String(item.finalLevel || '未认定').trim() || '未认定'
      const existing = acc.find((entry) => entry.label === label)
      if (existing) {
        existing.count += 1
      } else {
        acc.push({ label, count: 1 })
      }
      return acc
    }, [])
    .sort((a, b) => b.count - a.count)

  const applications = readJson(FILES.applications).map((item) => normalizeApplicationRecord(item))
  const periodApplications = applications.filter((item) => isTimeInRange(item.submittedAt, range))
  const approvedApplications = applications.filter((item) => item.status === '审核通过' && isTimeInRange(item.reviewedAt, range))

  const workStudyApplications = readWorkStudyApplications()
  const periodWorkStudyApplications = workStudyApplications.filter((item) => isTimeInRange(item.submittedAt, range))
  const approvedWorkStudyApplications = workStudyApplications.filter(
    (item) => item.status === '审核通过' && isTimeInRange(item.reviewedAt, range),
  )

  const campusMoments = readCampusMoments()
  const periodCampusMoments = campusMoments.filter((item) => isTimeInRange(item.submittedAt, range))
  const publishedCampusMoments = campusMoments.filter(
    (item) => item.status === '已发布' && isTimeInRange(item.publishedAt || item.reviewedAt || item.submittedAt, range),
  )

  const growthEvents = getGrowthTreeList()
    .flatMap((tree) => {
      const student = studentMap[tree.studentId] || null
      return (Array.isArray(tree.events) ? tree.events : []).map((event) => ({
        ...event,
        studentId: tree.studentId,
        studentName: student?.name || '',
        college: student?.college || '',
      }))
    })
    .filter((event) => isTimeInRange(event.createdAt, range))

  const growthActionTop = growthEvents
    .reduce((acc, item) => {
      const label = resolveGrowthRewardByAction(item.actionType).title
      const existing = acc.find((entry) => entry.label === label)
      if (existing) {
        existing.count += 1
      } else {
        acc.push({ label, count: 1 })
      }
      return acc
    }, [])
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const targetStudentIdSet = new Set(targetStudents.map((item) => item.id))
  const pendingOutreachStudents = targetStudents
    .filter((student) => {
      const viewedAny = policyViews.some((item) => item.studentId === student.id)
      const appliedAny = periodApplications.some((item) => item.studentId === student.id)
      return !viewedAny && !appliedAny
    })
    .map((student) => ({
      studentId: student.id,
      studentNo: student.studentNo,
      studentName: student.name,
      college: student.college,
      grade: student.grade,
      currentRecognitionLevel: student.currentRecognitionLevel,
      recommendation: '建议辅导员线下一对一宣讲，优先引导其了解当前开放项目。',
    }))

  const recognitionPassRate = formatPercentValue(recognitionApproved.length, recognitionSubmissions.length)
  const scholarshipApproveRate = formatPercentValue(approvedApplications.length, periodApplications.length)
  const highRiskStudentCount = new Set(highRiskStudents.map((item) => item.studentId).filter(Boolean)).size
  const shareStudentCount = new Set(shareCards.map((item) => item?.sharer?.studentName).filter(Boolean)).size
  const growthPointsAdded = growthEvents.reduce((sum, item) => sum + Number(item.points || 0), 0)
  const growthFlowerDelta = growthEvents.reduce((sum, item) => sum + Number(item.flowerDelta || 0), 0)
  const growthFruitDelta = growthEvents.reduce((sum, item) => sum + Number(item.fruitDelta || 0), 0)

  const topSignalText = aiSignalTop[0]?.label || '暂无明显高频AI信号'
  const topCollegeText = collegeTop[0]?.label || '暂无集中学院'
  const positiveText = careSummary.handled > 0
    ? `${range.periodLabel}内已处理${careSummary.handled}条预警，处理率${formatPercentValue(careSummary.handled, careSummary.total)}。`
    : `${range.periodLabel}内暂无已处理预警记录，建议加强老师值班巡检与复盘。`
  const focusText = careSummary.red > 0
    ? `本期存在${careSummary.red}条红色预警，高风险重点学生${highRiskStudentCount}人，主要关注信号为“${topSignalText}”。`
    : `本期暂无红色预警，当前高频关注主题为“${topSignalText}”，建议保持常态化观察。`
  const conversionText = scholarshipAnalytics.metrics.applicationCount > 0
    ? `政策浏览${scholarshipAnalytics.metrics.policyViewCount}次，奖助申请${scholarshipAnalytics.metrics.applicationCount}次，浏览转申请率${scholarshipAnalytics.metrics.clickToApplyRate}。`
    : `本期政策浏览${scholarshipAnalytics.metrics.policyViewCount}次，但奖助申请转化偏少，建议加强线下宣讲和申请辅导。`
  const actionText = pendingOutreachStudents.length > 0 || pendingDeadlineCount > 0
    ? `当前仍有${pendingOutreachStudents.length}名重点学生待宣讲、${pendingDeadlineCount}条截止提醒待处理，建议尽快形成跟进闭环。`
    : '当前重点学生触达与截止提醒处理较为及时，可转入复盘与典型案例沉淀。'

  const actionSuggestions = []
  if (careSummary.red > 0) {
    actionSuggestions.push(`优先跟进${careSummary.red}条红色预警，尤其关注${highRiskStudents.slice(0, 3).map((item) => item.studentName).filter(Boolean).join('、') || '高风险学生'}。`)
  }
  if (Number(scholarshipAnalytics.metrics.policyViewCount || 0) > 0 && Number(scholarshipAnalytics.metrics.applicationCount || 0) === 0) {
    actionSuggestions.push('政策浏览已有触达但申请未形成转化，建议增加一对一材料辅导与截止前提醒。')
  }
  if (pendingOutreachStudents.length > 0) {
    actionSuggestions.push(`还有${pendingOutreachStudents.length}名重点学生在本期未完成政策触达，建议结合学院逐一线下宣讲。`)
  }
  if (pendingDeadlineCount > 0) {
    actionSuggestions.push(`本期仍有${pendingDeadlineCount}条截止提醒待处理，建议优先催办临近截止项目。`)
  }
  if (growthEvents.length > 0) {
    actionSuggestions.push(`本期累计新增成长事件${growthEvents.length}条，可结合“${growthActionTop[0]?.label || '成长记录'}”沉淀典型案例。`)
  }
  if (actionSuggestions.length === 0) {
    actionSuggestions.push('本期整体运行平稳，建议继续保持现有老师端巡检、宣讲与复盘节奏。')
  }

  return {
    periodType: range.periodType,
    periodValue: range.periodValue,
    periodLabel: range.periodLabel,
    startAt: new Date(range.startAt).toISOString(),
    endAt: new Date(range.endAt).toISOString(),
    generatedAt: new Date().toISOString(),
    overviewMetrics: {
      aiConversationCount: aiConversationStore.length,
      emotionConversationCount: emotionConversations.length,
      emotionMessageCount,
      emotionConversationStudentCount,
      aiConversationStudentCount,
      totalAlerts: careSummary.total,
      highAlerts: careSummary.red,
      policyViewCount: scholarshipAnalytics.metrics.policyViewCount,
      applicationCount: scholarshipAnalytics.metrics.applicationCount,
      shareCardCount: shareCards.length,
      growthEventCount: growthEvents.length,
    },
    dimensionGroups: {
      engagement: {
        title: '触达与活跃',
        metrics: {
          aiConversationCount: aiConversationStore.length,
          emotionConversationCount: emotionConversations.length,
          emotionMessageCount,
          emotionConversationStudentCount,
          aiConversationStudentCount,
          policyViewCount: scholarshipAnalytics.metrics.policyViewCount,
          uniqueViewerCount: scholarshipAnalytics.metrics.uniqueViewerCount,
          shareCardCount: shareCards.length,
          shareStudentCount,
          deadlineReminderCount: deadlineReminders.length,
          handledDeadlineCount,
        },
        charts: {
          scenes: aiSceneBreakdown,
          shareProjects: shareProjectTop,
          shareColleges: shareCollegeTop,
          deadlineProjects: deadlineProjectTop,
        },
      },
      psychology: {
        title: '心理关怀与风险',
        metrics: {
          totalAlerts: careSummary.total,
          pendingAlerts: careSummary.pending,
          handledAlerts: careSummary.handled,
          highAlerts: careSummary.red,
          mediumAlerts: careSummary.yellow,
          lowAlerts: careSummary.blue,
          handleRate: formatPercentValue(careSummary.handled, careSummary.total),
          averageHandleHours,
          highRiskStudentCount,
          trackedStudentCount: Number(psychologyTrend.metrics?.trackedStudentCount || 0),
          totalMarkerPoints: Number(psychologyTrend.metrics?.totalMarkerPoints || 0),
        },
        charts: {
          level: levelDistribution,
          aiSignals: aiSignalTop,
          colleges: collegeTop,
          themes: themeTop,
          riskTrend: Array.isArray(psychologyTrend.riskTrend) ? psychologyTrend.riskTrend.slice(-8) : [],
          markerTrend: Array.isArray(psychologyTrend.markerTrend) ? psychologyTrend.markerTrend.slice(-8) : [],
        },
      },
      funding: {
        title: '资助链路转化',
        metrics: {
          recognitionSubmitCount: recognitionSubmissions.length,
          recognitionApprovedCount: recognitionApproved.length,
          recognitionPassRate,
          scholarshipApplyCount: periodApplications.length,
          scholarshipApprovedCount: approvedApplications.length,
          scholarshipApproveRate,
          policyViewCount: scholarshipAnalytics.metrics.policyViewCount,
          uniqueViewerCount: scholarshipAnalytics.metrics.uniqueViewerCount,
          uniqueApplicantCount: scholarshipAnalytics.metrics.uniqueApplicantCount,
          clickToApplyRate: scholarshipAnalytics.metrics.clickToApplyRate,
          averageStayText: scholarshipAnalytics.metrics.averageStayText,
        },
        charts: {
          byGrade: Array.isArray(scholarshipAnalytics.distributions?.byGrade) ? scholarshipAnalytics.distributions.byGrade : [],
          byMajor: Array.isArray(scholarshipAnalytics.distributions?.byMajor) ? scholarshipAnalytics.distributions.byMajor : [],
          byGender: Array.isArray(scholarshipAnalytics.distributions?.byGender) ? scholarshipAnalytics.distributions.byGender : [],
          byRecognitionLevel: Array.isArray(scholarshipAnalytics.distributions?.byRecognitionLevel)
            ? scholarshipAnalytics.distributions.byRecognitionLevel
            : [],
          recognitionLevels: recognitionLevelTop,
        },
        topScholarships: Array.isArray(scholarshipAnalytics.topScholarships) ? scholarshipAnalytics.topScholarships.slice(0, 6) : [],
      },
      growth: {
        title: '成长与发展结果',
        metrics: {
          growthEventCount: growthEvents.length,
          growthPointsAdded,
          growthFlowerDelta,
          growthFruitDelta,
          workStudyApplyCount: periodWorkStudyApplications.length,
          workStudyApprovedCount: approvedWorkStudyApplications.length,
          campusMomentSubmitCount: periodCampusMoments.length,
          campusMomentPublishedCount: publishedCampusMoments.length,
        },
        charts: {
          growthActions: growthActionTop,
          workStudyStatus: [
            { label: '待审核', count: periodWorkStudyApplications.filter((item) => item.status === '待审核').length },
            { label: '审核通过', count: periodWorkStudyApplications.filter((item) => item.status === '审核通过').length },
            { label: '驳回', count: periodWorkStudyApplications.filter((item) => item.status === '驳回').length },
          ],
          campusMomentStatus: [
            { label: '待审核', count: periodCampusMoments.filter((item) => item.status === '待审核').length },
            { label: '已发布', count: periodCampusMoments.filter((item) => item.status === '已发布').length },
            { label: '驳回', count: periodCampusMoments.filter((item) => item.status === '驳回').length },
          ],
        },
      },
      action: {
        title: '重点对象与老师动作',
        metrics: {
          pendingOutreachCount: pendingOutreachStudents.length,
          pendingDeadlineCount,
          highRiskStudentCount,
          topRiskCollegeCount: Number(collegeTop[0]?.count || 0),
          difficultStudentCount: targetStudentIdSet.size,
        },
        charts: {
          shareProjects: shareProjectTop,
          deadlineProjects: deadlineProjectTop,
          topThemes: themeTop,
        },
        focusStudents: {
          highRisk: highRiskStudents.slice(0, 5),
          outreach: pendingOutreachStudents.slice(0, 5),
        },
      },
    },
    topLists: {
      highRiskStudents,
      topScholarships: Array.isArray(scholarshipAnalytics.topScholarships) ? scholarshipAnalytics.topScholarships.slice(0, 6) : [],
      topSignals: aiSignalTop,
      pendingOutreachStudents: pendingOutreachStudents.slice(0, 8),
    },
    insights: {
      positive: positiveText,
      focus: focusText,
      conversion: conversionText,
      action: actionText,
    },
    summaryText: {
      overall: `${range.periodLabel}内共记录${aiConversationStore.length}次AI会话、${careSummary.total}条情绪预警、${scholarshipAnalytics.metrics.policyViewCount}次政策浏览和${periodApplications.length}次奖助申请，重点关注学院为${topCollegeText}。`,
      risk: careSummary.red > 0
        ? `本期存在${careSummary.red}条红色预警、${careSummary.yellow}条黄色预警，高频AI信号为“${topSignalText}”，建议优先跟进高危学生。`
        : `本期未出现红色预警，但累计记录${careSummary.yellow}条黄色预警与${careSummary.blue}条蓝色观察，建议围绕“${topSignalText}”持续观察。`,
      nextSteps: `${actionText} ${actionSuggestions[0] || ''}`.trim(),
    },
    actionSuggestions,
  }
}

function buildTeacherMonthlyReport(monthText) {
  const report = buildTeacherSummaryReport('month', monthText)
  const psychology = report.dimensionGroups?.psychology || {}
  const engagement = report.dimensionGroups?.engagement || {}
  const highRiskStudents = Array.isArray(report.topLists?.highRiskStudents) ? report.topLists.highRiskStudents : []
  const aiSignals = Array.isArray(psychology.charts?.aiSignals)
    ? psychology.charts.aiSignals.map((item) => ({ signal: item.label, count: item.count }))
    : []
  const colleges = Array.isArray(psychology.charts?.colleges)
    ? psychology.charts.colleges.map((item) => ({ college: item.label, count: item.count }))
    : []

  return {
    month: report.periodValue,
    generatedAt: report.generatedAt,
    metrics: {
      totalAlerts: Number(psychology.metrics?.totalAlerts || 0),
      pendingAlerts: Number(psychology.metrics?.pendingAlerts || 0),
      handledAlerts: Number(psychology.metrics?.handledAlerts || 0),
      highAlerts: Number(psychology.metrics?.highAlerts || 0),
      mediumAlerts: Number(psychology.metrics?.mediumAlerts || 0),
      lowAlerts: Number(psychology.metrics?.lowAlerts || 0),
      handleRate: psychology.metrics?.handleRate || '0%',
      averageHandleHours: Number(psychology.metrics?.averageHandleHours || 0),
      highRiskStudentCount: Number(psychology.metrics?.highRiskStudentCount || 0),
      emotionConversationCount: Number(engagement.metrics?.emotionConversationCount || 0),
      emotionMessageCount: Number(engagement.metrics?.emotionMessageCount || 0),
      emotionConversationStudentCount: Number(engagement.metrics?.emotionConversationStudentCount || 0),
    },
    distributions: {
      level: Array.isArray(psychology.charts?.level) ? psychology.charts.level : [],
      aiSignals,
      colleges,
    },
    highRiskStudents,
    insight: {
      positive: report.insights?.positive || '',
      focus: report.insights?.focus || '',
    },
  }
}

function normalizeGrowthEvents(events) {
  return (Array.isArray(events) ? events : [])
    .map((item) => ({
      id: typeof item?.id === 'string' && item.id ? item.id : createId('growth-event'),
      actionType: typeof item?.actionType === 'string' ? item.actionType : 'custom',
      title: typeof item?.title === 'string' ? item.title : '成长记录',
      description: typeof item?.description === 'string' ? item.description : '',
      points: Number(item?.points || 0),
      flowerDelta: Number(item?.flowerDelta || 0),
      fruitDelta: Number(item?.fruitDelta || 0),
      sourceType: typeof item?.sourceType === 'string' ? item.sourceType : '',
      sourceId: typeof item?.sourceId === 'string' ? item.sourceId : '',
      createdAt: typeof item?.createdAt === 'string' && item.createdAt ? item.createdAt : new Date().toISOString(),
    }))
    .sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt))
}

function resolveGrowthStage(points) {
  if (points >= 180) {
    return { key: 'prosperous', label: '繁茂期', desc: '成长树枝繁叶茂，已经形成稳定正向循环。' }
  }
  if (points >= 110) {
    return { key: 'bloom', label: '盛放期', desc: '你正在持续积累积极成长事件。' }
  }
  if (points >= 50) {
    return { key: 'sprout', label: '抽枝期', desc: '成长树已抽枝，继续保持就会开花结果。' }
  }
  return { key: 'seed', label: '萌芽期', desc: '成长从一次次小行动开始。' }
}

function resolveGrowthNextStageHint(points) {
  if (points >= 180) {
    return '你已进入繁茂期，继续记录点滴行动，稳步巩固成长成果。'
  }
  if (points >= 110) {
    return `再积累${Math.max(0, 180 - points)}积分可进入繁茂期，建议优先完成奖助申请与心理活动。`
  }
  if (points >= 50) {
    return `再积累${Math.max(0, 110 - points)}积分可进入盛放期，建议保持连续行动与任务打卡。`
  }
  return `再积累${Math.max(0, 50 - points)}积分可进入抽枝期，先从一次认定申请或心理自评开始。`
}

function normalizeGrowthTreeRecord(item) {
  const points = Math.max(0, Number(item?.points || 0))
  const flowers = Math.max(0, Number(item?.flowers || 0))
  const fruits = Math.max(0, Number(item?.fruits || 0))
  const stage = resolveGrowthStage(points)
  return {
    studentId: typeof item?.studentId === 'string' ? item.studentId : '',
    points,
    flowers,
    fruits,
    stage,
    nextStageHint: typeof item?.nextStageHint === 'string' && item.nextStageHint.trim()
      ? item.nextStageHint.trim()
      : resolveGrowthNextStageHint(points),
    events: normalizeGrowthEvents(item?.events).slice(0, 100),
    updatedAt: typeof item?.updatedAt === 'string' && item.updatedAt ? item.updatedAt : new Date().toISOString(),
  }
}

function getGrowthTreeList() {
  return readJson(FILES.growthTrees).map((item) => normalizeGrowthTreeRecord(item))
}

function writeGrowthTreeList(list) {
  writeJson(FILES.growthTrees, list.map((item) => normalizeGrowthTreeRecord(item)))
}

function getOrCreateGrowthTree(studentId) {
  const list = getGrowthTreeList()
  const index = list.findIndex((item) => item.studentId === studentId)
  if (index >= 0) {
    return { list, index, tree: list[index] }
  }
  const nextTree = normalizeGrowthTreeRecord({
    studentId,
    points: 0,
    flowers: 0,
    fruits: 0,
    events: [],
    updatedAt: new Date().toISOString(),
  })
  list.unshift(nextTree)
  writeGrowthTreeList(list)
  return { list, index: 0, tree: nextTree }
}

function resolveGrowthRewardByAction(actionType) {
  const rewardMap = {
    recognitionApproved: { points: 22, flowerDelta: 1, fruitDelta: 0, title: '困难认定通过' },
    scholarshipApproved: { points: 35, flowerDelta: 1, fruitDelta: 1, title: '奖助申请通过' },
    mentalAssessment: { points: 10, flowerDelta: 1, fruitDelta: 0, title: '完成积极心理测评' },
    mentalActivity: { points: 16, flowerDelta: 1, fruitDelta: 0, title: '参与心理活动' },
    campusMomentRecorded: { points: 12, flowerDelta: 1, fruitDelta: 1, title: '记录校园点滴' },
    campusMomentPublished: { points: 12, flowerDelta: 1, fruitDelta: 1, title: '校园点滴发布' },
    workStudyApproved: { points: 18, flowerDelta: 0, fruitDelta: 1, title: '勤工岗位申请通过' },
    custom: { points: 8, flowerDelta: 0, fruitDelta: 0, title: '成长记录' },
  }
  return rewardMap[actionType] || rewardMap.custom
}

function appendGrowthEvent(studentId, payload) {
  const { list, index, tree } = getOrCreateGrowthTree(studentId)
  const reward = resolveGrowthRewardByAction(payload?.actionType)
  const sourceType = typeof payload?.sourceType === 'string' ? payload.sourceType : ''
  const sourceId = typeof payload?.sourceId === 'string' ? payload.sourceId : ''
  const sourceKey = sourceType && sourceId ? `${sourceType}:${sourceId}` : ''
  if (sourceKey) {
    const duplicated = tree.events.some((item) => `${item.sourceType}:${item.sourceId}` === sourceKey)
    if (duplicated) {
      return { tree, event: null }
    }
  }
  const eventPoints = Math.max(0, Number(payload?.points ?? reward.points))
  const flowerDelta = Math.max(0, Number(payload?.flowerDelta ?? reward.flowerDelta))
  const fruitDelta = Math.max(0, Number(payload?.fruitDelta ?? reward.fruitDelta))
  const event = {
    id: createId('growth-event'),
    actionType: payload?.actionType || 'custom',
    title: typeof payload?.title === 'string' && payload.title ? payload.title : reward.title,
    description: typeof payload?.description === 'string' ? payload.description : '',
    points: eventPoints,
    flowerDelta,
    fruitDelta,
    sourceType,
    sourceId,
    createdAt: new Date().toISOString(),
  }
  const nextTree = normalizeGrowthTreeRecord({
    ...tree,
    points: tree.points + eventPoints,
    flowers: tree.flowers + flowerDelta,
    fruits: tree.fruits + fruitDelta,
    events: [event, ...(Array.isArray(tree.events) ? tree.events : [])],
    updatedAt: new Date().toISOString(),
  })
  list[index] = nextTree
  writeGrowthTreeList(list)
  return { tree: nextTree, event }
}

function normalizeWorkStudyJobRecord(item) {
  return {
    id: typeof item?.id === 'string' && item.id ? item.id : createId('work-job'),
    title: typeof item?.title === 'string' ? item.title.trim() : '',
    department: typeof item?.department === 'string' ? item.department.trim() : '',
    location: typeof item?.location === 'string' ? item.location.trim() : '',
    salaryPerHour: clampNumber(item?.salaryPerHour ?? 19.8, 0, 999),
    weeklyHoursMax: clampNumber(item?.weeklyHoursMax ?? 8, 1, 60),
    monthlyHoursMax: clampNumber(item?.monthlyHoursMax ?? 40, 1, 240),
    requiredMajors: normalizeStringList(item?.requiredMajors),
    requiredSkills: normalizeStringList(item?.requiredSkills),
    shiftSlots: normalizeStringList(item?.shiftSlots),
    tags: normalizeStringList(item?.tags),
    openForApply: Boolean(item?.openForApply),
    description: typeof item?.description === 'string' ? item.description.trim() : '',
  }
}

function readWorkStudyJobs() {
  return readJson(FILES.workStudyJobs).map((item) => normalizeWorkStudyJobRecord(item))
}

function normalizeWorkStudyApplicationRecord(item) {
  return {
    id: typeof item?.id === 'string' && item.id ? item.id : createId('work-application'),
    studentId: typeof item?.studentId === 'string' ? item.studentId : '',
    studentNo: typeof item?.studentNo === 'string' ? item.studentNo : '',
    studentName: typeof item?.studentName === 'string' ? item.studentName : '',
    college: typeof item?.college === 'string' ? item.college : '',
    major: typeof item?.major === 'string' ? item.major : '',
    grade: typeof item?.grade === 'string' ? item.grade : '',
    jobId: typeof item?.jobId === 'string' ? item.jobId : '',
    jobTitle: typeof item?.jobTitle === 'string' ? item.jobTitle : '',
    department: typeof item?.department === 'string' ? item.department : '',
    intro: typeof item?.intro === 'string' ? item.intro : '',
    availableSlots: normalizeStringList(item?.availableSlots),
    skillTags: normalizeStringList(item?.skillTags),
    matchScore: clampNumber(item?.matchScore ?? 0, 0, 100),
    matchLevel: typeof item?.matchLevel === 'string' ? item.matchLevel : '待提升',
    matchReasons: normalizeStringList(item?.matchReasons),
    status: ['待审核', '审核通过', '驳回'].includes(String(item?.status || '')) ? String(item.status) : '待审核',
    reviewComment: typeof item?.reviewComment === 'string' ? item.reviewComment : '',
    submittedAt: typeof item?.submittedAt === 'string' && item.submittedAt ? item.submittedAt : new Date().toISOString(),
    reviewedAt: typeof item?.reviewedAt === 'string' ? item.reviewedAt : '',
  }
}

function readWorkStudyApplications() {
  return readJson(FILES.workStudyApplications)
    .map((item) => normalizeWorkStudyApplicationRecord(item))
    .sort((a, b) => parseTime(b.submittedAt) - parseTime(a.submittedAt))
}

function writeWorkStudyApplications(list) {
  writeJson(FILES.workStudyApplications, list.map((item) => normalizeWorkStudyApplicationRecord(item)))
}

function intersectStringLists(source, target) {
  const sourceList = normalizeStringList(source)
  const targetList = normalizeStringList(target)
  if (sourceList.length === 0 || targetList.length === 0) {
    return []
  }
  return sourceList.filter((item) => targetList.some((entry) => entry.includes(item) || item.includes(entry)))
}

function getWorkStudyMatchResult(student, job, applications = []) {
  if (!student) {
    return {
      score: 0,
      level: '待提升',
      eligible: false,
      reason: '请先登录学生账号后再查看岗位匹配度',
      reasons: ['登录后可查看个性化岗位匹配结果'],
    }
  }

  const existingRecord = applications.find(
    (item) => item.studentId === student.id && item.jobId === job.id && (item.status === '待审核' || item.status === '审核通过'),
  )
  if (existingRecord) {
    return {
      score: 20,
      level: '待提升',
      eligible: false,
      reason: existingRecord.status === '待审核' ? '你已申请该岗位，正在等待审核。' : '你已通过该岗位审核，无需重复申请。',
      reasons: ['当前岗位已有你的有效申请记录'],
    }
  }

  if (!job.openForApply) {
    return {
      score: 15,
      level: '待提升',
      eligible: false,
      reason: '该岗位暂未开放报名',
      reasons: ['岗位状态为关闭'],
    }
  }

  let score = 45
  const reasons = []
  const studentMajor = String(student.major || '')
  const studentSkills = normalizeStringList(student.skillTags || student.skills)
  const studentSlots = normalizeStringList(student.freeTimeSlots)

  if (job.requiredMajors.length === 0) {
    score += 8
    reasons.push('岗位不限专业，可直接报名')
  } else if (job.requiredMajors.some((item) => item === studentMajor)) {
    score += 16
    reasons.push('你的专业与岗位要求匹配')
  } else {
    score -= 10
    reasons.push('专业匹配度一般，建议补充相关能力说明')
  }

  const matchedSkills = intersectStringLists(studentSkills, job.requiredSkills)
  if (matchedSkills.length > 0) {
    score += 12
    reasons.push(`能力标签匹配：${matchedSkills.slice(0, 2).join('、')}`)
  } else if (job.requiredSkills.length > 0) {
    reasons.push('建议在申请说明中补充岗位相关技能经历')
  }

  if (student.currentRecognitionLevel !== '未认定') {
    score += 10
    reasons.push('已通过困难认定，符合勤工助学优先原则')
  }

  const matchedSlots = intersectStringLists(studentSlots, job.shiftSlots)
  if (matchedSlots.length > 0) {
    score += 8
    reasons.push('空课时间与岗位班次存在重合')
  } else if (studentSlots.length > 0 && job.shiftSlots.length > 0) {
    score -= 6
    reasons.push('建议核对空课时间后再提交申请')
  }

  const finalScore = clampNumber(score, 0, 100)
  return {
    score: finalScore,
    level: resolveRecommendationLevel(finalScore),
    eligible: finalScore >= 40,
    reason: finalScore >= 40 ? '当前条件满足基础报名要求。' : '当前匹配度较低，建议完善技能与时间信息后再报名。',
    reasons: reasons.slice(0, 4),
  }
}

function getWorkStudyOpenJobsWithMatch(student) {
  const jobs = readWorkStudyJobs().filter((item) => item.openForApply)
  const applications = readWorkStudyApplications()
  return jobs
    .map((job) => {
      const match = getWorkStudyMatchResult(student, job, applications)
      return {
        ...job,
        matchScore: match.score,
        matchLevel: match.level,
        eligible: match.eligible,
        reason: match.reason,
        matchReasons: match.reasons,
      }
    })
    .sort((a, b) => Number(b.matchScore || 0) - Number(a.matchScore || 0))
}

function getStudentScholarshipHistory(studentId, applications) {
  return applications
    .filter((item) => item.studentId === studentId)
    .map((item) => ({
      id: item.id,
      scholarshipId: item.scholarshipId,
      scholarshipName: item.scholarshipName,
      status: item.status,
      submittedAt: item.submittedAt,
      reviewedAt: item.reviewedAt,
    }))
    .sort((a, b) => parseTime(b.submittedAt) - parseTime(a.submittedAt))
}

function buildStudentPortrait(student, latestRecognition, scholarshipHistory) {
  return {
    studentId: student.id,
    studentNo: student.studentNo,
    name: student.name,
    grade: student.grade,
    college: student.college,
    major: student.major,
    className: student.className,
    currentRecognitionStatus: student.currentRecognitionStatus,
    currentRecognitionLevel: student.currentRecognitionLevel,
    currentRecognitionScore: student.currentRecognitionScore,
    confirmedRecognitionRuleIds: student.confirmedRecognitionRuleIds || [],
    confirmedRecognitionLabels: student.confirmedRecognitionLabels || [],
    latestRecognitionSubmittedAt: latestRecognition?.submittedAt || '',
    latestRecognitionStatus: latestRecognition?.reviewStatus || student.currentRecognitionStatus,
    scholarshipHistory,
  }
}

function formatPercentValue(numerator, denominator) {
  const top = Number(numerator || 0)
  const bottom = Number(denominator || 0)
  if (!bottom || top <= 0) {
    return '0%'
  }
  return `${((top / bottom) * 100).toFixed(1)}%`
}

function getAiConversationStore() {
  return readJson(FILES.aiConversations)
}

function writeAiConversationStore(list) {
  writeJson(FILES.aiConversations, Array.isArray(list) ? list : [])
}

function normalizeAiConversationMessage(message) {
  const role = String(message?.role || '').trim()
  const content = typeof message?.content === 'string' ? message.content.trim() : ''
  if (!content || (role !== 'user' && role !== 'assistant')) {
    return null
  }
  return {
    role,
    content,
    createdAt: typeof message?.createdAt === 'string' && message.createdAt ? message.createdAt : new Date().toISOString(),
  }
}

function normalizeAiConversationRecord(record) {
  const source = record && typeof record === 'object' ? record : {}
  const history = Array.isArray(source.history)
    ? source.history.map((item) => normalizeAiConversationMessage(item)).filter(Boolean)
    : []
  return {
    conversationId: typeof source.conversationId === 'string' && source.conversationId ? source.conversationId : createId('ai-conversation'),
    studentId: typeof source.studentId === 'string' ? source.studentId : '',
    scene: typeof source.scene === 'string' ? source.scene : 'general',
    history: history.slice(-AI_PERSIST_HISTORY_LIMIT),
    updatedAt: typeof source.updatedAt === 'string' && source.updatedAt ? source.updatedAt : new Date().toISOString(),
  }
}

function getAiConversationRecord(conversationId, studentId, scene) {
  const normalizedConversationId = String(conversationId || '').trim()
  const store = getAiConversationStore().map((item) => normalizeAiConversationRecord(item))
  if (normalizedConversationId) {
    const existing = store.find((item) => item.conversationId === normalizedConversationId)
    if (existing) {
      return {
        store,
        index: store.findIndex((item) => item.conversationId === normalizedConversationId),
        record: existing,
      }
    }
  }
  const nextRecord = normalizeAiConversationRecord({
    conversationId: normalizedConversationId || createId('ai-conversation'),
    studentId: studentId || '',
    scene,
    history: [],
    updatedAt: new Date().toISOString(),
  })
  store.unshift(nextRecord)
  return {
    store,
    index: 0,
    record: nextRecord,
  }
}

function persistAiConversationRecord(store, index, record) {
  const nextStore = Array.isArray(store) ? store.slice() : []
  const safeRecord = normalizeAiConversationRecord(record)
  if (index >= 0 && index < nextStore.length) {
    nextStore[index] = safeRecord
  } else {
    nextStore.unshift(safeRecord)
  }
  writeAiConversationStore(nextStore.slice(0, 300))
}

function trimAiHistory(history, limit = AI_HISTORY_LIMIT) {
  return (Array.isArray(history) ? history : [])
    .map((item) => normalizeAiConversationMessage(item))
    .filter(Boolean)
    .slice(-Math.max(1, limit))
}

function listRecentEmotionRiskSignals(studentId, size = 6) {
  if (!studentId) {
    return []
  }
  return readEmotionEvents()
    .filter((item) => item.studentId === studentId)
    .slice(0, Math.max(1, size))
    .map((item) => ({
      levelCode: item.levelCode,
      triggerReason: item.triggerReason,
      suggestion: item.suggestion,
      createdAt: item.createdAt,
    }))
}

function buildAiSceneContext(scene, student, extraContext) {
  const scholarships = readJson(FILES.scholarships)
  const applications = readJson(FILES.applications).map((item) => normalizeApplicationRecord(item))
  const recognitions = readJson(FILES.recognitions)
  const announcements = getAnnouncementList().slice(0, 5)
  const latestRecognition = student
    ? recognitions
        .filter((item) => item.studentId === student.id)
        .sort((a, b) => parseTime(b.submittedAt) - parseTime(a.submittedAt))[0] || null
    : null
  const portrait = student
    ? buildStudentPortrait(student, latestRecognition, getStudentScholarshipHistory(student.id, applications).slice(0, 6))
    : null

  const common = {
    now: new Date().toISOString(),
    student: portrait,
  }

  if (scene === 'teacher-assistant') {
    return {
      ...common,
      teacherContext: extraContext && typeof extraContext === 'object' ? extraContext : {},
      latestAnnouncements: announcements.map((item) => ({
        id: item.id,
        title: item.title,
        publisher: item.publisher,
        publishedAt: item.publishedAt,
      })),
      openScholarships: scholarships.filter((item) => item.openForApply).slice(0, 8).map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        amountText: item.amountText,
        deadline: item.deadline,
      })),
    }
  }

  if (scene === 'emotion') {
    return {
      ...common,
      recentEmotionSignals: student ? listRecentEmotionRiskSignals(student.id, 8) : [],
      supportChannels: ['学院辅导员', '学校心理咨询中心', '24小时心理援助热线（校内）'],
    }
  }

  if (scene === 'material-draft') {
    return {
      ...common,
      openScholarships: scholarships.filter((item) => item.openForApply).slice(0, 10).map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        conditions: item.conditions,
        requiresPovertyRecognition: item.requiresPovertyRecognition,
        deadline: item.deadline,
      })),
      latestDrafts: student
        ? readJson(FILES.materialDrafts).filter((item) => item.studentId === student.id).slice(0, 3)
        : [],
    }
  }

  if (scene === 'recognition') {
    return {
      ...common,
      recognitionRuleBrief: recognitionRules
        .filter((item) => item.studentSelectable)
        .slice(0, 20)
        .map((item) => ({ id: item.id, no: item.no, label: item.label, score: item.score, evidence: item.evidence })),
      recentRecognitionRecords: student
        ? recognitions.filter((item) => item.studentId === student.id).slice(0, 3)
        : [],
    }
  }

  if (scene === 'scholarship') {
    const recommendationList = student ? getStudentRecommendationFeed(student, 8) : []
    return {
      ...common,
      recommendations: recommendationList.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        amountText: item.amountText,
        matchLevel: item.matchLevel,
        reasons: item.reasons,
      })),
      openScholarships: scholarships.filter((item) => item.openForApply).slice(0, 12).map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        amountText: item.amountText,
        deadline: item.deadline,
        restrictionNote: item.restrictionNote,
      })),
    }
  }

  return {
    ...common,
    latestAnnouncements: announcements.map((item) => ({
      id: item.id,
      title: item.title,
      publisher: item.publisher,
      publishedAt: item.publishedAt,
    })),
    openScholarships: scholarships.filter((item) => item.openForApply).slice(0, 8).map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      amountText: item.amountText,
      deadline: item.deadline,
    })),
  }
}

function getAiScenePrompt(scene) {
  if (scene === 'emotion') {
    return [
      '你是易暖医途的心理关怀助手。',
      '用温和、支持性的中文回复，先共情，再给2-3条可执行建议。',
      '不得给出诊断结论；如出现明显自伤风险，明确建议立即联系辅导员/心理中心并就近求助。',
      '根据用户问题的复杂度自然展开回复，优先保证共情、清晰和可执行性，不限制固定字数。',
    ].join('\n')
  }
  if (scene === 'material-draft') {
    return [
      '你是易暖医途的材料草稿助手。',
      '结合上下文中的学生信息与目标项目，给出可直接使用的中文申请草稿或修改建议。',
      '如果用户要草稿，优先给结构化文本（称呼、正文、结尾）并指出需补材料。',
      '根据用户需求自然输出；需要完整草稿时可提供完整正文，不限制固定字数。',
    ].join('\n')
  }
  if (scene === 'recognition') {
    return [
      '你是易暖医途的困难认定咨询助手。',
      '根据规则与学生状态解释认定流程、材料、常见退回原因。',
      '不要编造政策条文；不确定时明确说明“以学院最终审核为准”。',
      '根据问题复杂度完整说明流程、材料和注意事项，不限制固定字数。',
    ].join('\n')
  }
  if (scene === 'scholarship') {
    return [
      '你是易暖医途的奖助咨询助手。',
      '结合推荐结果与资格状态，给出优先申请顺序与准备建议。',
      '强调截止时间、资格门槛和材料完整性。',
      '根据问题复杂度给出完整建议，必要时分点说明优先级、材料和截止时间，不限制固定字数。',
    ].join('\n')
  }
  if (scene === 'teacher-assistant') {
    return [
      '你是易暖医途的老师端 AI 助手，服务对象是辅导员、班主任和资助管理老师。',
      '你的回答要围绕老师工作展开：待办优先级、学生跟进建议、认定审核关注点、奖助审核建议、沟通话术、风险干预建议。',
      '优先使用上下文中给出的老师端页面数据、学生记录和统计信息，不要把老师当成学生来回答。',
      '不要编造政策条文或不存在的数据；不确定时明确说需要老师补充信息或以学院最终审核为准。',
      '根据老师问题复杂度给出完整、可执行的建议，必要时分点展开，不限制固定字数。',
    ].join('\n')
  }
  return [
    '你是易暖医途的校园资助AI助手。',
    '回答要准确、完整、场景化，优先使用上下文提供的数据。',
    '不确定时提示用户补充信息，不要虚构。',
    '根据问题复杂度自然展开回复，不限制固定字数。',
  ].join('\n')
}

function buildClaudePayload({ scene, history, question, context }) {
  const normalizedHistory = trimAiHistory(history, AI_HISTORY_LIMIT)
  const messages = normalizedHistory.map((item) => ({ role: item.role, content: item.content }))
  messages.push({ role: 'user', content: question })
  return {
    model: CLAUDE_MODEL,
    max_tokens: CLAUDE_MAX_OUTPUT_TOKENS,
    temperature: CLAUDE_TEMPERATURE,
    system: `${getAiScenePrompt(scene)}\n\n可用业务上下文(JSON)：\n${JSON.stringify(context, null, 2)}`,
    messages,
  }
}

function extractClaudeText(responsePayload) {
  const content = Array.isArray(responsePayload?.content) ? responsePayload.content : []
  const textBlocks = content
    .filter((item) => item && item.type === 'text' && typeof item.text === 'string')
    .map((item) => item.text.trim())
    .filter(Boolean)
  if (textBlocks.length > 0) {
    return textBlocks.join('\n').trim()
  }

  // Some gateways return stream-like deltas under alternative fields.
  const candidates = []
  if (typeof responsePayload?.output_text === 'string') {
    candidates.push(responsePayload.output_text)
  }
  if (typeof responsePayload?.completion === 'string') {
    candidates.push(responsePayload.completion)
  }
  const choices = Array.isArray(responsePayload?.choices) ? responsePayload.choices : []
  for (const choice of choices) {
    if (typeof choice?.text === 'string') {
      candidates.push(choice.text)
    }
    if (typeof choice?.message?.content === 'string') {
      candidates.push(choice.message.content)
    }
  }
  const cleaned = candidates.map((item) => String(item || '').trim()).filter(Boolean)
  return cleaned.join('\n').trim()
}

function parseClaudeStreamPayload(rawData) {
  const lines = String(rawData || '').split(/\r?\n/)
  let model = CLAUDE_MODEL
  let text = ''
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) {
      continue
    }
    const payload = trimmed.slice(5).trim()
    if (!payload || payload === '[DONE]') {
      continue
    }
    let event
    try {
      event = JSON.parse(payload)
    } catch (_error) {
      continue
    }
    if (event?.type === 'message_start' && typeof event?.message?.model === 'string') {
      model = String(event.message.model || model)
    }
    if (event?.type === 'content_block_start' && event?.content_block?.type === 'text' && typeof event?.content_block?.text === 'string') {
      text += event.content_block.text
    }
    if (event?.type === 'content_block_delta' && event?.delta?.type === 'text_delta' && typeof event?.delta?.text === 'string') {
      text += event.delta.text
    }
  }
  return {
    model,
    text: text.trim(),
  }
}

function parseClaudeStreamEvents(rawData) {
  const lines = String(rawData || '').split(/\r?\n/)
  let model = CLAUDE_MODEL
  const chunks = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) {
      continue
    }
    const payload = trimmed.slice(5).trim()
    if (!payload || payload === '[DONE]') {
      continue
    }
    let event
    try {
      event = JSON.parse(payload)
    } catch (_error) {
      continue
    }
    if (event?.type === 'message_start' && typeof event?.message?.model === 'string') {
      model = String(event.message.model || model)
    }
    if (event?.type === 'content_block_start' && event?.content_block?.type === 'text' && typeof event?.content_block?.text === 'string') {
      chunks.push(event.content_block.text)
    }
    if (event?.type === 'content_block_delta' && event?.delta?.type === 'text_delta' && typeof event?.delta?.text === 'string') {
      chunks.push(event.delta.text)
    }
  }
  return {
    model,
    chunks,
    text: chunks.join('').trim(),
  }
}

function callClaudeApi(payload) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify(payload)
    const isStream = Boolean(payload?.stream)
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        authorization: `Bearer ${CLAUDE_API_KEY}`,
        'anthropic-version': '2023-06-01',
        accept: isStream ? 'text/event-stream' : 'application/json',
      },
      timeout: CLAUDE_API_TIMEOUT_MS,
    }

    const request = https.request(CLAUDE_API_URL, requestOptions, (response) => {
      let rawData = ''
      response.on('data', (chunk) => {
        rawData += chunk
      })
      response.on('end', () => {
        if (!rawData) {
          reject(new Error('Claude API 返回空响应'))
          return
        }

        const statusCode = Number(response.statusCode || 0)
        if (statusCode < 200 || statusCode >= 300) {
          try {
            const parsedError = JSON.parse(rawData)
            const message = typeof parsedError?.error?.message === 'string' && parsedError.error.message
              ? parsedError.error.message
              : `Claude API 调用失败（${statusCode}）`
            reject(new Error(message))
          } catch (_error) {
            reject(new Error(`Claude API 调用失败（${statusCode}）`))
          }
          return
        }

        if (isStream) {
          const parsedStream = parseClaudeStreamPayload(rawData)
          if (!parsedStream.text) {
            reject(new Error('Claude API 流式响应未返回可用文本'))
            return
          }
          resolve({
            model: parsedStream.model,
            content: [{ type: 'text', text: parsedStream.text }],
          })
          return
        }

        let parsed
        try {
          parsed = JSON.parse(rawData)
        } catch (_error) {
          reject(new Error('Claude API 响应解析失败'))
          return
        }

        const directText = extractClaudeText(parsed)
        if (!directText) {
          resolve(callClaudeApi({ ...payload, stream: true }))
          return
        }

        resolve(parsed)
      })
    })

    request.on('timeout', () => {
      request.destroy(new Error('Claude API 请求超时'))
    })
    request.on('error', (error) => {
      reject(error)
    })

    request.write(requestBody)
    request.end()
  })
}

function isRetryableClaudeError(error) {
  const message = error instanceof Error ? String(error.message || '') : String(error || '')
  return /请求超时|socket hang up|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|ECONNREFUSED/i.test(message)
}

async function callClaudeApiWithRetry(payload) {
  const maxAttempts = Math.max(1, CLAUDE_API_RETRY_COUNT + 1)
  let lastError = null
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await callClaudeApi(payload)
    } catch (error) {
      lastError = error
      if (attempt >= maxAttempts || !isRetryableClaudeError(error)) {
        throw error
      }
    }
  }
  throw lastError || new Error('Claude API 调用失败')
}

function getFallbackAiReply(question, scene, context) {
  const safeQuestion = String(question || '').trim()
  if (scene === 'emotion') {
    if (/自杀|轻生|不想活|结束生命/.test(safeQuestion)) {
      return '我很重视你现在的状态。请立即联系辅导员或学校心理中心，并尽快找身边可信任的人陪同你。你不是一个人。'
    }
    return '我听到了你的感受。先深呼吸一下，试试把最困扰你的一件事写出来，我们可以一起拆成小步骤处理。'
  }

  if (scene === 'material-draft') {
    const studentName = context?.student?.name || '同学'
    return `尊敬的老师：\n\n我是${studentName}，现申请相关奖助项目。请结合我提交的学习情况与家庭情况说明进行审核。\n\n我将把资助优先用于学习资料与基本生活支出，并持续提升学业表现。\n\n申请人：${studentName}`
  }

  if (scene === 'recognition') {
    return '建议你先核对已勾选认定项与佐证材料是否一一对应，再提交申请。37和38项由老师审核阶段决定，最终结果以学院审核为准。'
  }

  if (scene === 'scholarship') {
    const first = Array.isArray(context?.recommendations) ? context.recommendations[0] : null
    if (first?.name) {
      return `你可以优先准备“${first.name}”的申请材料，并同步检查截止时间与资格要求。提交前重点核对认定状态与附件完整性。`
    }
    return '建议先查看当前开放的奖助项目，按“资格匹配度+截止时间”排序准备申请材料。'
  }

  if (scene === 'teacher-assistant') {
    const panelLabel = context?.teacherContext?.activePanelLabel || '当前页面'
    return `我会按老师端工作视角协助你。结合${panelLabel}和当前上下文，建议你先处理高风险与临近截止事项，再核查待审核记录的关键信息；如果你告诉我想处理哪位学生或哪条记录，我可以继续给你更具体的跟进建议和沟通话术。`
  }

  return '你可以告诉我你的学院、年级和想申请的项目，我会结合系统数据给出更具体建议。'
}

const EMOTION_DEMO_SCRIPT = {
  openingUser: '我现在感觉难过，想聊聊。',
  openingAssistant: '听到你现在这么难过，我很心疼，也谢谢你愿意来这里说出来。我会先陪着你，不急着下结论。你愿意告诉我，最近发生了什么，或者是哪件事让你最难受吗？',
  selfHarmUser: '最近晚上睡觉的时候心跳很快，心烦失眠。每天都精神恍惚，今天我发现拿着水果刀割手很解压。',
  continueAssistant: '好的，那我们先不联系辅导员。那你是否愿意与我聊聊发生了什么吗？',
  familyUser: '我的妈妈最近被检查出恶性肿瘤，需要一大笔费用进行手术，导致现在家庭经济情况很困难。我觉得我的日常生活费都会家里带来一定负担，我现在该怎么办。',
}

function normalizeDemoText(value) {
  return String(value || '')
    .replace(/\s+/g, '')
    .replace(/[，。！？、,.!?；;：“”"'（）()\[\]【】]/g, '')
}

function buildEmotionDemoProfile(question, history, context) {
  const text = String(question || '').trim()
  const recentHistory = trimAiHistory(history, AI_HISTORY_LIMIT)
  const studentName = context?.student?.name || '同学'
  const normalizedQuestion = normalizeDemoText(text)
  const openingUser = normalizeDemoText(EMOTION_DEMO_SCRIPT.openingUser)
  const openingAssistant = normalizeDemoText(EMOTION_DEMO_SCRIPT.openingAssistant)
  const selfHarmUser = normalizeDemoText(EMOTION_DEMO_SCRIPT.selfHarmUser)
  const continueAssistant = normalizeDemoText(EMOTION_DEMO_SCRIPT.continueAssistant)
  const familyUser = normalizeDemoText(EMOTION_DEMO_SCRIPT.familyUser)
  const historyTexts = recentHistory.map((item) => normalizeDemoText(item.content)).filter(Boolean)
  const hasOpeningTurn = historyTexts.includes(openingUser) || historyTexts.some((item) => item.includes(openingAssistant))
  const hasContinueTurn = historyTexts.some((item) => item.includes(continueAssistant))

  return {
    studentName,
    isOpeningPrompt: normalizedQuestion === openingUser,
    isDemoSelfHarmTurn: normalizedQuestion === selfHarmUser && hasOpeningTurn,
    isDemoFamilyTurn: normalizedQuestion === familyUser && hasContinueTurn,
  }
}

function getEmotionDemoReply(question, history, context) {
  const demo = buildEmotionDemoProfile(question, history, context)
  if (demo.isOpeningPrompt) {
    return EMOTION_DEMO_SCRIPT.openingAssistant
  }

  if (demo.isDemoSelfHarmTurn) {
    return '谢谢你把这些告诉我。你刚刚提到用水果刀割手来解压，这说明你现在已经很难受了，我很重视这件事。你先把刀具放到离自己远一点的地方，尽量不要一个人待着。我们可以继续聊，你也可以慢慢告诉我，最近到底发生了什么。'
  }

  if (demo.isDemoFamilyTurn) {
    return [
      '抱抱你，家里突然遇到妈妈生病和手术费用这样的事，任何人都会觉得又慌又累，你现在会担心生活费给家里增加负担，这种感受我能理解。',
      '从你说的情况看，学校这边可以优先关注“临时困难补助”这类突发困难帮扶。像家庭成员重大疾病、突发高额治疗支出，通常都属于重点支持情形。',
      '你可以在易暖医途小程序里进入“临时补助指引”，先看申请条件和材料清单，再尽快联系辅导员或学院资助老师说明情况，准备家庭情况说明、疾病/住院或手术证明、费用材料等，再按指引提交。',
      '如果你愿意，我也可以继续陪你一起梳理：先准备哪些材料、怎么跟老师开口、或者怎么把想说的话整理出来。',
    ].join('')
  }

  return ''
}

function getEmotionGuidedReply(question, history, context) {
  const demoReply = getEmotionDemoReply(question, history, context)
  if (demoReply) {
    return demoReply
  }
  return ''
}

function buildEmotionDemoResponse({ question, history, student, conversationId }) {
  const context = buildAiSceneContext('emotion', student, null)
  const reply = getEmotionGuidedReply(question, history, context)
  if (!reply) {
    return null
  }
  const analysis = analyzeEmotionRisk(student?.id || '', question)
  const emotionRisk = {
    levelCode: analysis.levelCode,
    suggestion: analysis.suggestion,
    triggerReason: analysis.triggerReason,
  }
  return {
    reply,
    scene: 'emotion',
    conversationId,
    model: CLAUDE_API_KEY ? `${CLAUDE_MODEL}-guided` : 'emotion-demo-guided',
    fallbackUsed: false,
    fallbackReason: '',
    emotionRisk,
    contextSnapshot: {
      now: context?.now,
      student: context?.student || null,
      teacherContext: null,
    },
  }
}

function streamTextByChunk(text, onToken, chunkSize = 14) {
  const safeText = String(text || '')
  if (!safeText) {
    return
  }
  for (let index = 0; index < safeText.length; index += chunkSize) {
    onToken(safeText.slice(index, index + chunkSize))
  }
}

async function generateSceneAiReply({ scene, question, history, student, extraContext }) {
  const context = buildAiSceneContext(scene, student, extraContext)
  if (scene === 'emotion') {
    const guidedReply = getEmotionGuidedReply(question, history, context)
    if (guidedReply) {
      return {
        reply: guidedReply,
        model: CLAUDE_API_KEY ? `${CLAUDE_MODEL}-guided` : 'emotion-demo-guided',
        fallbackUsed: false,
        context,
        error: '',
      }
    }
  }
  if (!CLAUDE_API_KEY) {
    const missingKeyError = 'Claude API Key 未配置'
    if (ENABLE_AI_LOCAL_FALLBACK) {
      return {
        reply: getFallbackAiReply(question, scene, context),
        model: 'fallback-local',
        fallbackUsed: true,
        context,
        error: missingKeyError,
      }
    }
    return {
      reply: '',
      model: CLAUDE_MODEL,
      fallbackUsed: false,
      context,
      error: missingKeyError,
    }
  }

  const payload = buildClaudePayload({ scene, history, question, context })
  try {
    const claudeResponse = await callClaudeApiWithRetry(payload)
    const text = extractClaudeText(claudeResponse)
    if (!text) {
      throw new Error('Claude API 未返回可用文本')
    }
    return {
      reply: text,
      model: String(claudeResponse?.model || CLAUDE_MODEL),
      fallbackUsed: false,
      context,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Claude API 调用失败'
    if (ENABLE_AI_LOCAL_FALLBACK) {
      return {
        reply: getFallbackAiReply(question, scene, context),
        model: 'fallback-local',
        fallbackUsed: true,
        context,
        error: message,
      }
    }
    return {
      reply: '',
      model: CLAUDE_MODEL,
      fallbackUsed: false,
      context,
      error: message,
    }
  }
}

async function streamSceneAiReply({ scene, question, history, student, extraContext, onToken }) {
  const context = buildAiSceneContext(scene, student, extraContext)
  if (scene === 'emotion') {
    const guidedReply = getEmotionGuidedReply(question, history, context)
    if (guidedReply) {
      streamTextByChunk(guidedReply, onToken)
      return {
        reply: guidedReply,
        model: CLAUDE_API_KEY ? `${CLAUDE_MODEL}-guided` : 'emotion-demo-guided',
        fallbackUsed: false,
        context,
        error: '',
      }
    }
  }
  if (!CLAUDE_API_KEY) {
    return {
      reply: '',
      model: CLAUDE_MODEL,
      fallbackUsed: false,
      context,
      error: 'Claude API Key 未配置',
    }
  }

  const payload = {
    ...buildClaudePayload({ scene, history, question, context }),
    stream: true,
  }

  try {
    const claudeResponse = await callClaudeApiWithRetry(payload)
    const chunks = []
    if (Array.isArray(claudeResponse?.content)) {
      for (const item of claudeResponse.content) {
        if (item && item.type === 'text' && typeof item.text === 'string' && item.text) {
          chunks.push(item.text)
        }
      }
    }
    for (const chunk of chunks) {
      onToken(chunk)
    }
    const reply = chunks.join('').trim()
    if (!reply) {
      return {
        reply: '',
        model: String(claudeResponse?.model || CLAUDE_MODEL),
        fallbackUsed: false,
        context,
        error: 'Claude API 流式响应未返回可用文本',
      }
    }
    return {
      reply,
      model: String(claudeResponse?.model || CLAUDE_MODEL),
      fallbackUsed: false,
      context,
      error: '',
    }
  } catch (error) {
    return {
      reply: '',
      model: CLAUDE_MODEL,
      fallbackUsed: false,
      context,
      error: error instanceof Error ? error.message : 'Claude API 调用失败',
    }
  }
}

function buildDonationDashboardData() {
  const students = readJson(FILES.students)
  const scholarships = readJson(FILES.scholarships)
  const applications = readJson(FILES.applications).map((item) => normalizeApplicationRecord(item))
  const socialScholarships = scholarships.filter((item) => item.category === 'social')
  const scholarshipMap = socialScholarships.reduce((acc, item) => {
    acc[item.id] = item
    return acc
  }, {})
  const socialScholarshipIdSet = new Set(socialScholarships.map((item) => item.id))
  const socialApplications = applications.filter((item) => socialScholarshipIdSet.has(item.scholarshipId))
  const approvedApplications = socialApplications.filter((item) => item.status === '审核通过')
  const pendingApplications = socialApplications.filter((item) => item.status === '待审核')
  const applicantIdSet = new Set(socialApplications.map((item) => item.studentId))
  const applicantStudents = students.filter((item) => applicantIdSet.has(item.id))
  const reachedStudents = students.filter((student) => {
    const recommendationFeed = getStudentRecommendationFeed(student, 30)
    return recommendationFeed.some((item) => item.category === 'social' && Number(item.score || 0) >= 65)
  })

  const profileByCollege = applicantStudents
    .reduce((acc, item) => {
      const key = item.college || '未填写学院'
      const existing = acc.find((entry) => entry.label === key)
      if (existing) {
        existing.count += 1
      } else {
        acc.push({ label: key, count: 1 })
      }
      return acc
    }, [])
    .sort((a, b) => b.count - a.count)

  const profileByRecognitionLevel = socialApplications
    .reduce((acc, item) => {
      const key = item?.recognitionSnapshot?.level || '未认定'
      const existing = acc.find((entry) => entry.label === key)
      if (existing) {
        existing.count += 1
      } else {
        acc.push({ label: key, count: 1 })
      }
      return acc
    }, [])
    .sort((a, b) => b.count - a.count)

  const topProjects = socialScholarships
    .map((item) => {
      const relatedApplications = socialApplications.filter((record) => record.scholarshipId === item.id)
      const approvedCount = relatedApplications.filter((record) => record.status === '审核通过').length
      return {
        id: item.id,
        name: item.name,
        sponsor: item.sponsor,
        openForApply: Boolean(item.openForApply),
        applicationCount: relatedApplications.length,
        approvedCount,
      }
    })
    .sort((a, b) => b.applicationCount - a.applicationCount || b.approvedCount - a.approvedCount)
    .slice(0, 6)

  const sponsorStats = socialScholarships
    .reduce((acc, item) => {
      const sponsor = item.sponsor || '社会捐助方'
      const existing = acc.find((entry) => entry.sponsor === sponsor)
      if (existing) {
        existing.projectCount += 1
      } else {
        acc.push({ sponsor, projectCount: 1, applicationCount: 0, approvedCount: 0, approvalRate: '0%' })
      }
      return acc
    }, [])
    .map((item) => {
      const relatedApplications = socialApplications.filter(
        (record) => (scholarshipMap[record.scholarshipId]?.sponsor || '社会捐助方') === item.sponsor,
      )
      const approvedCount = relatedApplications.filter((record) => record.status === '审核通过').length
      return {
        ...item,
        applicationCount: relatedApplications.length,
        approvedCount,
        approvalRate: formatPercentValue(approvedCount, relatedApplications.length),
      }
    })
    .sort((a, b) => b.applicationCount - a.applicationCount)

  return {
    generatedAt: new Date().toISOString(),
    metrics: {
      projectCount: socialScholarships.length,
      openProjectCount: socialScholarships.filter((item) => item.openForApply).length,
      applicationCount: socialApplications.length,
      approvedCount: approvedApplications.length,
      pendingCount: pendingApplications.length,
      applicantCount: applicantIdSet.size,
      reachCount: reachedStudents.length,
      clickRate: formatPercentValue(socialApplications.length, reachedStudents.length),
      approvalRate: formatPercentValue(approvedApplications.length, socialApplications.length),
    },
    topProjects,
    applicantProfiles: {
      byCollege: profileByCollege,
      byRecognitionLevel: profileByRecognitionLevel,
    },
    sponsorStats,
  }
}

function getTeacherWorkStudyApplications(scope = 'all', status = '') {
  const list = readWorkStudyApplications()
  return list.filter((item) => {
    if (scope === 'pending' && item.status !== '待审核') {
      return false
    }
    if (status && item.status !== status) {
      return false
    }
    return true
  })
}

function buildTeacherWorkStudyJobOverview(jobs, applications) {
  const applicationList = Array.isArray(applications) ? applications : []
  return (Array.isArray(jobs) ? jobs : [])
    .map((item) => {
      const related = applicationList.filter((entry) => entry.jobId === item.id)
      const pendingCount = related.filter((entry) => entry.status === '待审核').length
      const approvedCount = related.filter((entry) => entry.status === '审核通过').length
      const rejectedCount = related.filter((entry) => entry.status === '驳回').length
      return {
        ...item,
        pendingCount,
        approvedCount,
        rejectedCount,
        applicationCount: related.length,
      }
    })
    .sort((a, b) => Number(b.openForApply) - Number(a.openForApply) || b.applicationCount - a.applicationCount)
}

function getCareAlertClusterKey(item) {
  return item.studentId || item.studentNo || item.id
}

function buildCareAlertClusters(list) {
  const groupMap = new Map()
  ;(Array.isArray(list) ? list : []).forEach((item) => {
    const key = getCareAlertClusterKey(item)
    const exists = groupMap.get(key)
    if (!exists) {
      groupMap.set(key, {
        id: `cluster-${key}`,
        studentId: item.studentId,
        studentNo: item.studentNo,
        studentName: item.studentName,
        college: item.college,
        grade: item.grade,
        levelCode: item.levelCode,
        status: item.status,
        priority: Number(item.priority || 1),
        sentimentScore: Number(item.sentimentScore || 0),
        latestCreatedAt: item.createdAt,
        latestHandledAt: item.handledAt || '',
        triggerReason: item.triggerReason || '',
        summaryHint: item.summaryHint || summarizeEmotionEventHint(item),
        suggestion: item.suggestion || '',
        content: item.content || '',
        matchedKeywords: normalizeStringList(item.matchedKeywords),
        aiSignals: normalizeStringList(item.aiSignals),
        riskTags: normalizeStringList(item.riskTags),
        pendingCount: item.status === '待关注' ? 1 : 0,
        handledCount: item.status === '已处理' ? 1 : 0,
        observableCount: item.status === '可观察' ? 1 : 0,
        eventCount: 1,
        latestEventId: item.id,
        events: [item],
      })
      return
    }

    exists.eventCount += 1
    if (item.status === '待关注') {
      exists.pendingCount += 1
    } else if (item.status === '已处理') {
      exists.handledCount += 1
    } else {
      exists.observableCount += 1
    }

    const currentPriority = Number(item.priority || 1)
    if (currentPriority > exists.priority) {
      exists.priority = currentPriority
      exists.levelCode = item.levelCode
      exists.sentimentScore = Number(item.sentimentScore || 0)
    }

    const existingTime = parseTime(exists.latestCreatedAt)
    const currentTime = parseTime(item.createdAt)
    if (currentTime >= existingTime) {
      exists.latestCreatedAt = item.createdAt
      exists.latestHandledAt = item.handledAt || ''
      exists.triggerReason = item.triggerReason || exists.triggerReason
      exists.summaryHint = item.summaryHint || exists.summaryHint
      exists.suggestion = item.suggestion || exists.suggestion
      exists.content = item.content || exists.content
      exists.studentName = item.studentName || exists.studentName
      exists.studentNo = item.studentNo || exists.studentNo
      exists.college = item.college || exists.college
      exists.grade = item.grade || exists.grade
      exists.latestEventId = item.id
    }

    exists.matchedKeywords = Array.from(new Set(exists.matchedKeywords.concat(normalizeStringList(item.matchedKeywords))))
    exists.aiSignals = Array.from(new Set((exists.aiSignals || []).concat(normalizeStringList(item.aiSignals))))
    exists.riskTags = Array.from(new Set((exists.riskTags || []).concat(normalizeStringList(item.riskTags))))
    exists.events.push(item)
  })

  return Array.from(groupMap.values())
    .map((item) => {
      const sortedEvents = sortCareAlerts(item.events)
      const hasPending = sortedEvents.some((entry) => entry.status === '待关注')
      return {
        ...item,
        events: sortedEvents,
        status: hasPending ? '待关注' : item.status,
      }
    })
    .sort((a, b) => {
      const priorityDiff = Number(b.priority || 0) - Number(a.priority || 0)
      if (priorityDiff !== 0) {
        return priorityDiff
      }
      return parseTime(b.latestCreatedAt) - parseTime(a.latestCreatedAt)
    })
}

function buildTeacherScholarshipAnalytics(range) {
  const students = readJson(FILES.students)
  const scholarships = readJson(FILES.scholarships)
  const applications = readJson(FILES.applications)
    .map((item) => normalizeApplicationRecord(item))
    .filter((item) => !range || isTimeInRange(item.submittedAt, range))
  const policyViews = readPolicyViews().filter((item) => !range || isTimeInRange(item.viewAt, range))

  const scholarshipMap = scholarships.reduce((acc, item) => {
    acc[item.id] = item
    return acc
  }, {})

  const scholarshipStats = scholarships
    .map((item) => {
      const viewRecords = policyViews.filter((record) => record.scholarshipId === item.id)
      const applyRecords = applications.filter((record) => record.scholarshipId === item.id)
      const applicantStudentCount = new Set(applyRecords.map((record) => record.studentId).filter(Boolean)).size
      const viewStudentCount = new Set(viewRecords.map((record) => record.studentId).filter(Boolean)).size
      const stayDurations = viewRecords
        .map((record) => Number(record.stayDurationMs || 0))
        .filter((duration) => Number.isFinite(duration) && duration > 0)
      const averageStayMs = stayDurations.length
        ? Math.round(stayDurations.reduce((sum, duration) => sum + duration, 0) / stayDurations.length)
        : 0
      return {
        id: item.id,
        name: item.name,
        category: item.category,
        type: item.type,
        sponsor: item.sponsor,
        viewCount: viewRecords.length,
        viewStudentCount,
        applicantCount: applyRecords.length,
        applicantStudentCount,
        clickToApplyRate: formatPercentValue(applyRecords.length, viewRecords.length),
        averageStayMs,
        averageStayText: `${Math.max(1, Math.round(averageStayMs / 60000))}分钟`,
      }
    })
    .sort((a, b) => b.viewCount - a.viewCount || b.applicantCount - a.applicantCount)

  const activeStudents = students.filter((item) => item.currentRecognitionLevel !== '未认定')
  const activeStudentIdSet = new Set(activeStudents.map((item) => item.id))
  const viewedStudentSet = new Set(policyViews.map((item) => item.studentId).filter((id) => activeStudentIdSet.has(id)))
  const appliedStudentSet = new Set(applications.map((item) => item.studentId).filter((id) => activeStudentIdSet.has(id)))

  const byGrade = applications
    .reduce((acc, item) => {
      const student = students.find((entry) => entry.id === item.studentId)
      const grade = String(student?.grade || '未填写年级').trim() || '未填写年级'
      const existing = acc.find((entry) => entry.label === grade)
      if (existing) {
        existing.count += 1
      } else {
        acc.push({ label: grade, count: 1 })
      }
      return acc
    }, [])
    .sort((a, b) => b.count - a.count)

  const byMajor = applications
    .reduce((acc, item) => {
      const student = students.find((entry) => entry.id === item.studentId)
      const major = String(student?.major || '未填写专业').trim() || '未填写专业'
      const existing = acc.find((entry) => entry.label === major)
      if (existing) {
        existing.count += 1
      } else {
        acc.push({ label: major, count: 1 })
      }
      return acc
    }, [])
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const byGender = applications
    .reduce((acc, item) => {
      const student = students.find((entry) => entry.id === item.studentId)
      const gender = String(student?.gender || '未填写').trim() || '未填写'
      const existing = acc.find((entry) => entry.label === gender)
      if (existing) {
        existing.count += 1
      } else {
        acc.push({ label: gender, count: 1 })
      }
      return acc
    }, [])
    .sort((a, b) => b.count - a.count)

  const byRecognitionLevel = applications
    .reduce((acc, item) => {
      const level = String(item?.recognitionSnapshot?.level || '未认定').trim() || '未认定'
      const existing = acc.find((entry) => entry.label === level)
      if (existing) {
        existing.count += 1
      } else {
        acc.push({ label: level, count: 1 })
      }
      return acc
    }, [])
    .sort((a, b) => b.count - a.count)

  const applicationTrendMap = new Map()
  applications.forEach((item) => {
    const dateKey = String(item.submittedAt || '').slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return
    }
    const existing = applicationTrendMap.get(dateKey)
    if (existing) {
      existing.count += 1
    } else {
      applicationTrendMap.set(dateKey, { label: dateKey, count: 1 })
    }
  })
  const applicationTrend = Array.from(applicationTrendMap.values())
    .sort((a, b) => String(a.label).localeCompare(String(b.label)))
    .slice(-14)

  const topScholarships = scholarshipStats.slice(0, 6).map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    type: item.type,
    viewCount: item.viewCount,
    applicantCount: item.applicantCount,
    clickToApplyRate: item.clickToApplyRate,
    averageStayText: item.averageStayText,
  }))

  const totalStayMs = policyViews
    .map((item) => Number(item.stayDurationMs || 0))
    .filter((duration) => Number.isFinite(duration) && duration > 0)
    .reduce((sum, duration) => sum + duration, 0)
  const averageStayMs = policyViews.length > 0 ? Math.round(totalStayMs / policyViews.length) : 0

  return {
    generatedAt: new Date().toISOString(),
    metrics: {
      policyViewCount: policyViews.length,
      uniqueViewerCount: new Set(policyViews.map((item) => item.studentId).filter(Boolean)).size,
      applicationCount: applications.length,
      uniqueApplicantCount: new Set(applications.map((item) => item.studentId).filter(Boolean)).size,
      clickToApplyRate: formatPercentValue(applications.length, policyViews.length),
      averageStayMs,
      averageStayText: `${Math.max(1, Math.round(averageStayMs / 60000))}分钟`,
      activeStudentCount: activeStudents.length,
      activeViewedCount: viewedStudentSet.size,
      activeAppliedCount: appliedStudentSet.size,
    },
    distributions: {
      byGrade,
      byMajor,
      byGender,
      byRecognitionLevel,
      applicationTrend,
    },
    topScholarships,
  }
}

function resolvePsychologyMarkerMeta(item) {
  const content = String(item?.content || '').trim()
  const channel = String(item?.channel || '').trim()
  const assessmentMatch = content.match(/量表自评：([^（]+)（标准分(\d+)）/)
  const sourceScene = channel === 'ai-chat' || channel === 'treehole-chat'
    ? 'emotion'
    : (channel.startsWith('ai-chat-') ? channel.slice('ai-chat-'.length) : '')

  if (assessmentMatch || channel === 'assessment-self-check') {
    return {
      markerType: 'assessment',
      sourceScene: 'emotion',
      scaleName: assessmentMatch ? String(assessmentMatch[1] || '').trim() : '心理自评',
      standardScore: assessmentMatch ? Number(assessmentMatch[2] || 0) : null,
    }
  }

  if (channel === 'mood-self-check') {
    return {
      markerType: 'mood',
      sourceScene: 'emotion',
      scaleName: '',
      standardScore: null,
    }
  }

  if (channel === 'entry-self-check') {
    return {
      markerType: 'entry',
      sourceScene: 'emotion',
      scaleName: '',
      standardScore: null,
    }
  }

  if (channel === 'ai-chat' || channel === 'treehole-chat' || channel.startsWith('ai-chat-')) {
    return {
      markerType: 'ai-chat',
      sourceScene,
      scaleName: '',
      standardScore: null,
    }
  }

  return {
    markerType: 'other',
    sourceScene,
    scaleName: '',
    standardScore: null,
  }
}

function buildPsychologyThemeTags(item) {
  return Array.from(
    new Set(
      normalizeStringList([
        ...normalizeStringList(item?.riskTags),
        ...normalizeStringList(item?.matchedKeywords),
        ...normalizeStringList(item?.aiSignals),
      ]),
    ),
  ).slice(0, 5)
}

function resolvePsychologyCurveScore(item, markerMeta) {
  const standardScore = Number(markerMeta?.standardScore)
  if (markerMeta?.markerType === 'assessment' && Number.isFinite(standardScore) && standardScore > 0) {
    return clampNumber(Math.round(100 - standardScore), 0, 100)
  }

  const sentimentScore = clampNumber(item?.sentimentScore ?? -10, -100, 100)
  return clampNumber(Math.round(50 + sentimentScore / 2), 0, 100)
}

function shouldIncludePsychologyCurveEvent(item, markerMeta) {
  if (!item?.studentId) {
    return false
  }

  if (markerMeta?.markerType === 'assessment' || markerMeta?.markerType === 'mood' || markerMeta?.markerType === 'entry') {
    return true
  }

  if (markerMeta?.markerType !== 'ai-chat') {
    return false
  }

  if (markerMeta.sourceScene === 'emotion') {
    return true
  }

  return String(item?.levelCode || '') === 'high'
}

function buildTeacherPsychologyTrendData(range) {
  const students = readJson(FILES.students)
  const emotionEvents = readEmotionEvents().filter((item) => !range || isTimeInRange(item.createdAt, range))

  const studentMap = students.reduce((acc, item) => {
    acc[item.id] = item
    return acc
  }, {})

  const levelRank = { low: 1, medium: 2, high: 3 }
  const resolveLevelRank = (levelCode) => levelRank[levelCode] || 1

  const markerList = emotionEvents
    .map((item) => {
      const markerMeta = resolvePsychologyMarkerMeta(item)
      if (!shouldIncludePsychologyCurveEvent(item, markerMeta)) {
        return null
      }

      const student = studentMap[item.studentId] || null
      const themeTags = buildPsychologyThemeTags(item)
      const curveScore = resolvePsychologyCurveScore(item, markerMeta)

      return {
        id: item.id,
        studentId: item.studentId,
        studentName: item.studentName,
        studentNo: item.studentNo,
        college: item.college,
        grade: item.grade,
        major: student?.major || '',
        createdAt: item.createdAt,
        dateKey: getDateKey(item.createdAt),
        label: String(item.createdAt || '').slice(0, 10),
        levelCode: item.levelCode,
        markerType: markerMeta.markerType,
        sourceScene: markerMeta.sourceScene,
        channel: String(item.channel || '').trim(),
        scaleName: markerMeta.scaleName,
        standardScore: markerMeta.standardScore,
        sentimentScore: Number(item.sentimentScore || 0),
        curveScore,
        summaryHint: item.summaryHint || summarizeEmotionEventHint(item),
        themeTags,
        riskTags: normalizeStringList(item.riskTags),
        matchedKeywords: normalizeStringList(item.matchedKeywords),
        aiSignals: normalizeStringList(item.aiSignals),
      }
    })
    .filter(Boolean)

  const assessmentList = markerList.filter((item) => item.markerType === 'assessment')
  const moodList = markerList.filter((item) => item.markerType === 'mood')
  const entryList = markerList.filter((item) => item.markerType === 'entry')
  const aiChatList = markerList.filter((item) => item.markerType === 'ai-chat')

  const riskTrendMap = new Map()
  emotionEvents.forEach((item) => {
    const dateKey = getDateKey(item.createdAt)
    if (!dateKey) {
      return
    }
    const existing = riskTrendMap.get(dateKey) || { label: dateKey, high: 0, medium: 0, low: 0, total: 0 }
    existing.total += 1
    if (item.levelCode === 'high') {
      existing.high += 1
    } else if (item.levelCode === 'medium') {
      existing.medium += 1
    } else {
      existing.low += 1
    }
    riskTrendMap.set(dateKey, existing)
  })

  const markerTrendMap = new Map()
  markerList.forEach((item) => {
    const dateKey = item.dateKey || getDateKey(item.createdAt)
    if (!dateKey) {
      return
    }
    const exists = markerTrendMap.get(dateKey) || { label: dateKey, chat: 0, assessment: 0, mood: 0, entry: 0, total: 0 }
    exists.total += 1
    if (item.markerType === 'assessment') {
      exists.assessment += 1
    } else if (item.markerType === 'mood') {
      exists.mood += 1
    } else if (item.markerType === 'entry') {
      exists.entry += 1
    } else {
      exists.chat += 1
    }
    markerTrendMap.set(dateKey, exists)
  })

  const riskTrend = Array.from(riskTrendMap.values())
    .sort((a, b) => String(a.label).localeCompare(String(b.label)))
    .slice(-30)

  const markerTrend = Array.from(markerTrendMap.values())
    .sort((a, b) => String(a.label).localeCompare(String(b.label)))
    .slice(-30)

  const latestAssessments = assessmentList
    .slice()
    .sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt))
    .slice(0, 20)

  const latestMarkers = markerList
    .slice()
    .sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt))
    .slice(0, 20)

  const studentCurveMap = markerList.reduce((acc, item) => {
    const key = item.studentId || item.studentNo || item.id
    if (!acc[key]) {
      acc[key] = {
        studentId: key,
        studentName: item.studentName,
        studentNo: item.studentNo,
        college: item.college,
        grade: item.grade,
        major: item.major,
        points: [],
        pointCount: 0,
        eventCount: 0,
        latestLevelCode: item.levelCode,
        levelChange: {
          direction: 'flat',
          delta: 0,
          text: '风险稳定',
        },
      }
    }

    const studentCurve = acc[key]
    let dayPoint = studentCurve.points.find((point) => point.id === item.dateKey)
    if (!dayPoint) {
      dayPoint = {
        id: item.dateKey,
        dateKey: item.dateKey,
        label: item.dateKey,
        createdAt: item.createdAt,
        latestEventAt: item.createdAt,
        curveScore: 0,
        moodScore: 0,
        levelCode: item.levelCode,
        summaryHint: item.summaryHint,
        themeTags: [],
        riskTags: [],
        matchedKeywords: [],
        aiSignals: [],
        eventCount: 0,
        channelBreakdown: { aiChat: 0, assessment: 0, mood: 0, entry: 0, total: 0 },
        events: [],
      }
      studentCurve.points.push(dayPoint)
    }

    dayPoint.createdAt = parseTime(item.createdAt) < parseTime(dayPoint.createdAt) ? item.createdAt : dayPoint.createdAt
    dayPoint.latestEventAt = parseTime(item.createdAt) > parseTime(dayPoint.latestEventAt) ? item.createdAt : dayPoint.latestEventAt
    dayPoint.eventCount += 1
    dayPoint.events.push({
      id: item.id,
      createdAt: item.createdAt,
      markerType: item.markerType,
      sourceScene: item.sourceScene,
      channel: item.channel,
      scaleName: item.scaleName,
      standardScore: item.standardScore,
      sentimentScore: item.sentimentScore,
      curveScore: item.curveScore,
      moodScore: item.curveScore,
      levelCode: item.levelCode,
      summaryHint: item.summaryHint,
      themeTags: item.themeTags,
      riskTags: item.riskTags,
      matchedKeywords: item.matchedKeywords,
      aiSignals: item.aiSignals,
    })

    if (resolveLevelRank(item.levelCode) >= resolveLevelRank(dayPoint.levelCode)) {
      dayPoint.levelCode = item.levelCode
      dayPoint.summaryHint = item.summaryHint
    }

    if (item.markerType === 'assessment') {
      dayPoint.channelBreakdown.assessment += 1
    } else if (item.markerType === 'mood') {
      dayPoint.channelBreakdown.mood += 1
    } else if (item.markerType === 'entry') {
      dayPoint.channelBreakdown.entry += 1
    } else {
      dayPoint.channelBreakdown.aiChat += 1
    }
    dayPoint.channelBreakdown.total += 1
    return acc
  }, {})

  const studentCurves = Object.values(studentCurveMap)
    .map((item) => {
      const allPoints = item.points
        .slice()
        .map((point) => {
          const sortedEvents = point.events
            .slice()
            .sort((a, b) => parseTime(a.createdAt) - parseTime(b.createdAt))
          const scoreSum = sortedEvents.reduce((sum, event) => sum + Number(event.curveScore || 0), 0)
          const averageScore = sortedEvents.length > 0 ? Math.round(scoreSum / sortedEvents.length) : 0
          const themeTags = Array.from(
            new Set(sortedEvents.flatMap((event) => normalizeStringList(event.themeTags))),
          ).slice(0, 6)
          const riskTags = Array.from(
            new Set(sortedEvents.flatMap((event) => normalizeStringList(event.riskTags))),
          ).slice(0, 6)
          const matchedKeywords = Array.from(
            new Set(sortedEvents.flatMap((event) => normalizeStringList(event.matchedKeywords))),
          ).slice(0, 6)
          const aiSignals = Array.from(
            new Set(sortedEvents.flatMap((event) => normalizeStringList(event.aiSignals))),
          ).slice(0, 6)
          const highestRiskEvent = sortedEvents.reduce((selected, event) => {
            if (!selected) {
              return event
            }
            return resolveLevelRank(event.levelCode) >= resolveLevelRank(selected.levelCode) ? event : selected
          }, null)
          const themeSummary = themeTags.slice(0, 3).join('、')

          return {
            ...point,
            createdAt: sortedEvents[0]?.createdAt || point.createdAt,
            latestEventAt: sortedEvents[sortedEvents.length - 1]?.createdAt || point.latestEventAt,
            curveScore: averageScore,
            moodScore: averageScore,
            levelCode: highestRiskEvent?.levelCode || point.levelCode,
            summaryHint: highestRiskEvent?.summaryHint || point.summaryHint || (themeSummary ? `当天主要关注 ${themeSummary}` : '当天已记录情绪事件'),
            themeTags,
            riskTags,
            matchedKeywords,
            aiSignals,
            channel: highestRiskEvent?.channel || sortedEvents[sortedEvents.length - 1]?.channel || '',
            markerType: highestRiskEvent?.markerType || sortedEvents[sortedEvents.length - 1]?.markerType || '',
            sourceScene: highestRiskEvent?.sourceScene || sortedEvents[sortedEvents.length - 1]?.sourceScene || '',
            events: sortedEvents,
          }
        })
        .sort((a, b) => String(a.dateKey || a.label).localeCompare(String(b.dateKey || b.label)))

      const firstPoint = allPoints[0]
      const lastPoint = allPoints[allPoints.length - 1]
      const delta = resolveLevelRank(lastPoint?.levelCode) - resolveLevelRank(firstPoint?.levelCode)
      let levelChange = {
        direction: 'flat',
        delta: 0,
        text: '风险稳定',
      }
      if (delta > 0) {
        levelChange = {
          direction: 'up',
          delta,
          text: `风险上升${delta}级`,
        }
      } else if (delta < 0) {
        levelChange = {
          direction: 'down',
          delta,
          text: `风险下降${Math.abs(delta)}级`,
        }
      }

      const latestThemes = normalizeStringList(lastPoint?.themeTags).slice(0, 5)

      const channelBreakdown = allPoints.reduce(
        (acc, point) => {
          acc.aiChat += Number(point.channelBreakdown?.aiChat || 0)
          acc.assessment += Number(point.channelBreakdown?.assessment || 0)
          acc.mood += Number(point.channelBreakdown?.mood || 0)
          acc.entry += Number(point.channelBreakdown?.entry || 0)
          acc.total += Number(point.channelBreakdown?.total || point.eventCount || 0)
          return acc
        },
        { aiChat: 0, assessment: 0, mood: 0, entry: 0, total: 0 },
      )

      const recentEventHighlights = allPoints
        .slice(-5)
        .reverse()
        .map((point) => ({
          id: point.id,
          createdAt: point.latestEventAt || point.createdAt,
          label: point.label,
          dateKey: point.dateKey,
          markerType: point.markerType,
          sourceScene: point.sourceScene,
          channel: point.channel,
          levelCode: point.levelCode,
          curveScore: point.curveScore,
          moodScore: point.moodScore,
          summaryHint: point.summaryHint,
          themeTags: point.themeTags,
          eventCount: point.eventCount,
        }))

      return {
        ...item,
        pointCount: allPoints.length,
        eventCount: channelBreakdown.total,
        points: allPoints,
        latestLevelCode: lastPoint?.levelCode || item.latestLevelCode,
        latestSummaryHint: lastPoint?.summaryHint || '',
        latestThemes,
        latestEventAt: lastPoint?.latestEventAt || lastPoint?.createdAt || '',
        latestCurveScore: Number(lastPoint?.curveScore || 0),
        latestSentimentScore: Number(lastPoint?.events?.[lastPoint.events.length - 1]?.sentimentScore || 0),
        levelChange,
        channelBreakdown,
        recentEventHighlights,
      }
    })
    .sort((a, b) => parseTime(b.latestEventAt) - parseTime(a.latestEventAt))

  return {
    generatedAt: new Date().toISOString(),
    includedChannels: ['assessment-self-check', 'mood-self-check', 'entry-self-check', 'ai-chat', 'treehole-chat', 'ai-chat-* high'],
    excludedChannels: ['guide-enter', 'manual-enter'],
    metrics: {
      totalEmotionEvents: emotionEvents.length,
      totalAssessmentRecords: assessmentList.length,
      totalAssessmentPoints: assessmentList.length,
      totalMoodCheckPoints: moodList.length,
      totalEntryMoodPoints: entryList.length,
      totalAiChatPoints: aiChatList.length,
      totalMarkerPoints: markerList.length,
      trackedStudentCount: new Set(markerList.map((item) => item.studentId).filter(Boolean)).size,
    },
    riskTrend,
    markerTrend,
    latestAssessments,
    latestMarkers,
    studentCurves,
  }
}

function buildTeacherDashboardData() {
  const students = readJson(FILES.students)
  const recognitions = readJson(FILES.recognitions)
  const applications = readJson(FILES.applications)
  const campusMoments = readCampusMoments()
  const careAlerts = readEmotionEvents()
  const careClusters = buildCareAlertClusters(careAlerts)
  const workStudyApplications = readWorkStudyApplications()
  const workStudyJobs = readWorkStudyJobs()
  const policyViews = readPolicyViews()
  const currentAcademicYear = getCurrentAcademicYear()
  const targetStudents = students.filter((item) => ['特别困难', '困难'].includes(String(item.currentRecognitionLevel || '')))
  const targetStudentIdSet = new Set(targetStudents.map((item) => item.id))
  const sameYearApplications = applications
    .map((item) => normalizeApplicationRecord(item))
    .filter((item) => item.academicYear === currentAcademicYear)
  const sameYearPolicyViews = policyViews.filter((item) => item.academicYear === currentAcademicYear)
  const outreachCandidates = targetStudents
    .filter((student) => {
      const viewedAny = sameYearPolicyViews.some((item) => item.studentId === student.id)
      const appliedAny = sameYearApplications.some((item) => item.studentId === student.id)
      return !viewedAny && !appliedAny
    })
    .map((student) => ({
      studentId: student.id,
      studentNo: student.studentNo,
      studentName: student.name,
      college: student.college,
      grade: student.grade,
      currentRecognitionLevel: student.currentRecognitionLevel,
      recommendation: '建议辅导员线下一对一宣讲，优先引导其了解当前开放项目。',
    }))

  const avgResponseHours = careAlerts.length
    ? Number(
        (
          careAlerts
            .filter((item) => item.handledAt && item.createdAt)
            .map((item) => {
              const start = parseTime(item.createdAt)
              const end = parseTime(item.handledAt)
              if (!start || !end || end < start) {
                return 0
              }
              return (end - start) / 3600000
            })
            .filter((item) => item > 0)
            .reduce((sum, item, _, list) => sum + item / list.length, 0)
        ).toFixed(2),
      )
    : 0

  const scholarshipAnalytics = buildTeacherScholarshipAnalytics()
  const psychologyTrend = buildTeacherPsychologyTrendData()

  return {
    pendingRecognitions: recognitions.filter((item) => item.reviewStatus === '待审核').length,
    pendingScholarshipApplications: applications.filter((item) => item.status === '待审核').length,
    pendingCampusMoments: campusMoments.filter((item) => item.status === '待审核').length,
    pendingWorkStudyApplications: workStudyApplications.filter((item) => item.status === '待审核').length,
    pendingCareAlerts: careAlerts.filter((item) => item.status === '待关注').length,
    pendingDeadlineReminders: readDeadlineReminders().filter((item) => item.status === 'pending' || item.status === 'read').length,
    highRiskCareAlerts: careAlerts.filter((item) => item.levelCode === 'high' && item.status !== '已处理').length,
    recognizedStudents: students.filter((item) => item.currentRecognitionLevel !== '未认定').length,
    specialCount: students.filter((item) => item.currentRecognitionLevel === '特别困难').length,
    hardCount: students.filter((item) => item.currentRecognitionLevel === '困难').length,
    generalCount: students.filter((item) => item.currentRecognitionLevel === '一般困难').length,
    workStudyOpenJobs: workStudyJobs.filter((item) => item.openForApply).length,
    workStudyClosedJobs: workStudyJobs.filter((item) => !item.openForApply).length,
    workStudyApprovedApplications: workStudyApplications.filter((item) => item.status === '审核通过').length,
    avgCareResponseHours: Number.isFinite(avgResponseHours) ? avgResponseHours : 0,
    highRiskStudentCount: careClusters.filter((item) => item.levelCode === 'high' && item.status !== '已处理').length,
    outreachSummary: {
      academicYear: currentAcademicYear,
      targetStudentCount: targetStudentIdSet.size,
      viewedPolicyStudentCount: new Set(
        sameYearPolicyViews
          .map((item) => item.studentId)
          .filter((studentId) => targetStudentIdSet.has(studentId)),
      ).size,
      appliedStudentCount: new Set(
        sameYearApplications
          .map((item) => item.studentId)
          .filter((studentId) => targetStudentIdSet.has(studentId)),
      ).size,
      pendingOutreachCount: outreachCandidates.length,
      pendingOutreachStudents: outreachCandidates,
    },
    scholarshipAnalytics,
    psychologyTrend,
  }
}

function getStaticContentType(targetPath) {
  const ext = path.extname(targetPath).toLowerCase()
  const typeMap = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  }
  return typeMap[ext] || 'application/octet-stream'
}

function serveStaticFile(rootDir, relativePath, res) {
  const safePath = path.normalize(relativePath).replace(/^\.\.(?:[\\/]|$)/, '')
  const target = path.join(rootDir, safePath)
  if (!target.startsWith(rootDir) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    return notFound(res)
  }
  sendText(res, 200, getStaticContentType(target), fs.readFileSync(target))
}

function serveTeacherStatic(reqPath, res) {
  const strippedPath = reqPath === '/' ? '/index.html' : reqPath.replace(/^\/teacher/, '')
  const relativePath = !strippedPath || strippedPath === '/' ? 'index.html' : strippedPath.replace(/^[/\\]+/, '')
  return serveStaticFile(TEACHER_WEB_DIR, relativePath, res)
}

function serveUploadStatic(reqPath, res) {
  const strippedPath = reqPath.replace(/^\/uploads/, '')
  const relativePath = strippedPath.replace(/^[/\\]+/, '')
  if (!relativePath) {
    return notFound(res)
  }
  return serveStaticFile(UPLOAD_DIR, relativePath, res)
}

async function handleApi(req, res, urlObject) {
  const pathname = urlObject.pathname
  if (req.method === 'GET' && pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, port: PORT })
  }

  if (req.method === 'GET' && pathname === '/api/recognition-rules') {
    return sendJson(res, 200, { list: recognitionRules })
  }

  if (req.method === 'POST' && pathname === '/api/students/login') {
    const body = await parseBody(req)
    const studentNo = typeof body.studentNo === 'string' ? body.studentNo.trim() : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const student = readJson(FILES.students).find((item) => item.studentNo === studentNo && item.name === name)
    if (!student) {
      return sendJson(res, 400, { message: '姓名或学号不正确' })
    }
    return sendJson(res, 200, {
      student,
      session: {
        studentId: student.id,
        studentNo: student.studentNo,
        name: student.name,
      },
    })
  }

  if (req.method === 'GET' && pathname === '/api/students/current') {
    const student = requireCurrentStudent(req, res)
    if (!student) {
      return
    }
    return sendJson(res, 200, { student })
  }

  if (req.method === 'PUT' && pathname === '/api/students/current') {
    const student = requireCurrentStudent(req, res)
    if (!student) {
      return
    }
    const body = await parseBody(req)
    const nextCollegeKey = typeof body.collegeKey === 'string' ? body.collegeKey.trim() : ''
    if (!nextCollegeKey) {
      return sendJson(res, 400, { message: '学院不能为空' })
    }
    const nextCollegeName = getCollegeNameByKey(nextCollegeKey)
    if (!nextCollegeName) {
      return sendJson(res, 400, { message: '未找到对应学院信息' })
    }
    const nextStudent = updateStudent({
      ...student,
      collegeKey: nextCollegeKey,
      college: nextCollegeName,
    })
    return sendJson(res, 200, { student: nextStudent })
  }

  if (req.method === 'GET' && pathname === '/api/students/current/portrait') {
    const student = requireCurrentStudent(req, res)
    if (!student) {
      return
    }
    const recognitions = readJson(FILES.recognitions)
    const applications = readJson(FILES.applications).map((item) => normalizeApplicationRecord(item))
    const latestRecognition = recognitions
      .filter((item) => item.studentId === student.id)
      .sort((a, b) => parseTime(b.submittedAt) - parseTime(a.submittedAt))[0]
    const scholarshipHistory = getStudentScholarshipHistory(student.id, applications)
    return sendJson(res, 200, {
      portrait: buildStudentPortrait(student, latestRecognition, scholarshipHistory),
    })
  }

  if (req.method === 'GET' && pathname === '/api/students') {
    return sendJson(res, 200, { list: readJson(FILES.students) })
  }

  if (req.method === 'GET' && pathname === '/api/home-data') {
    const homeScholarships = buildHomeScholarships()
    const homeAnnouncements = buildHomeAnnouncements()
    return sendJson(res, 200, {
      banners: homeBanners,
      categoryTabs,
      announcements: homeAnnouncements,
      scholarships: homeScholarships,
      policies: homeScholarships,
    })
  }

  if (req.method === 'GET' && pathname === '/api/recommendations') {
    const student = requireCurrentStudent(req, res)
    if (!student) {
      return
    }
    const limit = Number(urlObject.searchParams.get('limit') || 8)
    const list = getStudentRecommendationFeed(student, limit)
    return sendJson(res, 200, {
      studentId: student.id,
      generatedAt: new Date().toISOString(),
      list,
    })
  }

  if (req.method === 'POST' && pathname === '/api/material-drafts') {
    const student = requireCurrentStudent(req, res)
    if (!student) {
      return
    }
    const body = await parseBody(req)
    const draft = await createMaterialDraftRecord(student, body)
    const list = readMaterialDrafts()
    list.unshift(draft)
    writeMaterialDrafts(list)
    return sendJson(res, 200, { draft: normalizeMaterialDraftRecord(draft) })
  }

  if (req.method === 'GET' && pathname === '/api/material-drafts') {
    const student = requireCurrentStudent(req, res)
    if (!student) {
      return
    }
    const drafts = readMaterialDrafts().filter((item) => item.studentId === student.id)
    return sendJson(res, 200, { list: drafts })
  }

  if (req.method === 'POST' && pathname === '/api/ai/chat') {
    const body = await parseBody(req)
    const sceneFromBody = typeof body.scene === 'string' ? body.scene.trim() : ''
    const scene = sceneFromBody || getSceneByPath(req.headers.referer || req.headers.origin || '', 'general')
    const question = typeof body.question === 'string' ? body.question.trim() : ''
    if (!question) {
      return sendJson(res, 400, { message: '提问内容不能为空' })
    }

    const teacherContext = body && typeof body.context === 'object' ? body.context : null
    const student = scene === 'teacher-assistant' ? null : getCurrentStudent(req)
    const analysis = analyzeEmotionRisk(student?.id || '', question)
    const incomingHistory = Array.isArray(body.history) ? body.history : []
    const persistedConversationId = typeof body.conversationId === 'string' ? body.conversationId.trim() : ''
    const { store, index, record } = getAiConversationRecord(persistedConversationId, student?.id || '', scene)

    const requestHistory = trimAiHistory(incomingHistory, AI_HISTORY_LIMIT)
    const baseHistory = requestHistory.length > 0 ? requestHistory : trimAiHistory(record.history, AI_HISTORY_LIMIT)

    const demoEmotionResponse = scene === 'emotion'
      ? buildEmotionDemoResponse({
        question,
        history: baseHistory,
        student,
        conversationId: record.conversationId,
      })
      : null

    const wantsStream = Boolean(body.stream)

    if (demoEmotionResponse) {
      const nextHistory = trimAiHistory(
        baseHistory.concat(
          { role: 'user', content: question },
          { role: 'assistant', content: demoEmotionResponse.reply },
        ),
        AI_PERSIST_HISTORY_LIMIT,
      )

      persistAiConversationRecord(store, index, {
        ...record,
        studentId: student?.id || record.studentId,
        scene,
        history: nextHistory,
        updatedAt: new Date().toISOString(),
      })

      if (student) {
        const demoAnalysis = analyzeEmotionRisk(student.id, question)
        const event = normalizeEmotionEventRecord({
          id: createId('emotion-event'),
          studentId: student.id,
          studentNo: student.studentNo,
          studentName: student.name,
          college: student.college,
          grade: student.grade,
          channel: 'ai-chat',
          content: question,
          chatMessages: buildEmotionEventChatSnapshot(baseHistory, question, demoEmotionResponse.reply),
          ...demoAnalysis,
          status: getEmotionStatusByLevel(demoAnalysis.levelCode),
          createdAt: new Date().toISOString(),
          handledAt: '',
          handleNote: '',
          handler: '',
        })
        const emotionEventList = readEmotionEvents()
        emotionEventList.unshift(event)
        writeEmotionEvents(emotionEventList)
        demoEmotionResponse.emotionRisk = {
          levelCode: event.levelCode,
          suggestion: event.suggestion,
          triggerReason: event.triggerReason,
        }
      }

      if (wantsStream) {
        sendSseHeaders(res)
        sendSseData(res, {
          type: 'start',
          conversationId: record.conversationId,
          scene,
        })
        streamTextByChunk(demoEmotionResponse.reply, (chunk) => {
          sendSseData(res, {
            type: 'chunk',
            text: chunk,
          })
        })
        sendSseData(res, {
          type: 'done',
          ...demoEmotionResponse,
        })
        return res.end()
      }

      return sendJson(res, 200, demoEmotionResponse)
    }

    if (wantsStream) {
      sendSseHeaders(res)
      sendSseData(res, {
        type: 'start',
        conversationId: record.conversationId,
        scene,
      })

      const chunks = []
      const aiResult = await streamSceneAiReply({
        scene,
        question,
        history: baseHistory,
        student,
        extraContext: teacherContext,
        onToken: (chunk) => {
          const safeChunk = String(chunk || '')
          if (!safeChunk) {
            return
          }
          chunks.push(safeChunk)
          sendSseData(res, {
            type: 'chunk',
            text: safeChunk,
          })
        },
      })

      const reply = String(aiResult.reply || '').trim()
      if (!reply) {
        sendSseData(res, {
          type: 'error',
          message: 'AI服务暂不可用，请稍后重试。',
          fallbackReason: aiResult.error || 'AI服务暂不可用',
          model: aiResult.model,
          fallbackUsed: Boolean(aiResult.fallbackUsed),
          emotionRisk: {
            levelCode: analysis.levelCode,
            suggestion: analysis.suggestion,
            triggerReason: analysis.triggerReason,
          },
        })
        return res.end()
      }

      const nextHistory = trimAiHistory(
        baseHistory.concat(
          { role: 'user', content: question },
          { role: 'assistant', content: reply },
        ),
        AI_PERSIST_HISTORY_LIMIT,
      )

      persistAiConversationRecord(store, index, {
        ...record,
        studentId: student?.id || record.studentId,
        scene,
        history: nextHistory,
        updatedAt: new Date().toISOString(),
      })

      let emotionRisk = {
        levelCode: analysis.levelCode,
        suggestion: analysis.suggestion,
        triggerReason: analysis.triggerReason,
      }
      if (student && scene !== 'teacher-assistant') {
        if (scene === 'emotion' || analysis.levelCode === 'high') {
          const event = normalizeEmotionEventRecord({
            id: createId('emotion-event'),
            studentId: student.id,
            studentNo: student.studentNo,
            studentName: student.name,
            college: student.college,
            grade: student.grade,
            channel: scene === 'emotion' ? 'ai-chat' : `ai-chat-${scene}`,
            content: question,
            chatMessages: buildEmotionEventChatSnapshot(baseHistory, question, reply),
            ...analysis,
            status: getEmotionStatusByLevel(analysis.levelCode),
            createdAt: new Date().toISOString(),
            handledAt: '',
            handleNote: '',
            handler: '',
          })
          const emotionEventList = readEmotionEvents()
          emotionEventList.unshift(event)
          writeEmotionEvents(emotionEventList)
          emotionRisk = {
            levelCode: event.levelCode,
            suggestion: event.suggestion,
            triggerReason: event.triggerReason,
          }
        }
      }

      sendSseData(res, {
        type: 'done',
        reply,
        scene,
        conversationId: record.conversationId,
        model: aiResult.model,
        fallbackUsed: Boolean(aiResult.fallbackUsed),
        fallbackReason: aiResult.error || '',
        emotionRisk,
        contextSnapshot: {
          now: aiResult.context?.now,
          student: aiResult.context?.student || null,
          teacherContext: aiResult.context?.teacherContext || null,
        },
      })
      return res.end()
    }

    const aiResult = await generateSceneAiReply({
      scene,
      question,
      history: baseHistory,
      student,
      extraContext: teacherContext,
    })

    if (!aiResult.reply) {
      return sendJson(res, 503, {
        message: 'AI服务暂不可用，请稍后重试。',
        scene,
        conversationId: record.conversationId,
        model: aiResult.model,
        fallbackUsed: Boolean(aiResult.fallbackUsed),
        fallbackReason: aiResult.error || 'AI服务暂不可用',
        emotionRisk: {
          levelCode: analysis.levelCode,
          suggestion: analysis.suggestion,
          triggerReason: analysis.triggerReason,
        },
      })
    }

    const nextHistory = trimAiHistory(
      baseHistory.concat(
        { role: 'user', content: question },
        { role: 'assistant', content: aiResult.reply },
      ),
      AI_PERSIST_HISTORY_LIMIT,
    )

    persistAiConversationRecord(store, index, {
      ...record,
      studentId: student?.id || record.studentId,
      scene,
      history: nextHistory,
      updatedAt: new Date().toISOString(),
    })

    let emotionRisk = {
      levelCode: analysis.levelCode,
      suggestion: analysis.suggestion,
      triggerReason: analysis.triggerReason,
    }
    if (student && scene !== 'teacher-assistant') {
      if (scene === 'emotion' || analysis.levelCode === 'high') {
        const event = normalizeEmotionEventRecord({
          id: createId('emotion-event'),
          studentId: student.id,
          studentNo: student.studentNo,
          studentName: student.name,
          college: student.college,
          grade: student.grade,
          channel: scene === 'emotion' ? 'ai-chat' : `ai-chat-${scene}`,
          content: question,
          chatMessages: buildEmotionEventChatSnapshot(baseHistory, question, aiResult.reply),
          ...analysis,
          status: getEmotionStatusByLevel(analysis.levelCode),
          createdAt: new Date().toISOString(),
          handledAt: '',
          handleNote: '',
          handler: '',
        })
        const emotionEventList = readEmotionEvents()
        emotionEventList.unshift(event)
        writeEmotionEvents(emotionEventList)
        emotionRisk = {
          levelCode: event.levelCode,
          suggestion: event.suggestion,
          triggerReason: event.triggerReason,
        }
      }
    }

    return sendJson(res, 200, {
      reply: aiResult.reply,
      scene,
      conversationId: record.conversationId,
      model: aiResult.model,
      fallbackUsed: Boolean(aiResult.fallbackUsed),
      fallbackReason: aiResult.error || '',
      emotionRisk,
      contextSnapshot: {
        now: aiResult.context?.now,
        student: aiResult.context?.student || null,
        teacherContext: aiResult.context?.teacherContext || null,
      },
    })
  }

  if (req.method === 'POST' && pathname === '/api/emotion-events') {
    const student = requireCurrentStudent(req, res)
    if (!student) {
      return
    }
    const body = await parseBody(req)
    const content = typeof body.content === 'string' ? body.content.trim() : ''
    if (!content) {
      return sendJson(res, 400, { message: '对话内容不能为空' })
    }
    const analysis = analyzeEmotionRisk(student.id, content)
    const event = normalizeEmotionEventRecord({
      id: createId('emotion-event'),
      studentId: student.id,
      studentNo: student.studentNo,
      studentName: student.name,
      college: student.college,
      grade: student.grade,
      channel: typeof body.channel === 'string' && body.channel ? body.channel : 'treehole',
      content,
      chatMessages: buildEmotionEventChatSnapshot(body.history, content, ''),
      ...analysis,
      status: getEmotionStatusByLevel(analysis.levelCode),
      createdAt: new Date().toISOString(),
      handledAt: '',
      handleNote: '',
      handler: '',
    })
    const list = readEmotionEvents()
    list.unshift(event)
    writeEmotionEvents(list)
    if (event.channel === 'assessment-self-check') {
      appendGrowthEvent(student.id, {
        actionType: 'mentalAssessment',
        sourceType: 'emotion-event',
        sourceId: event.id,
        title: '完成心理自评',
        description: String(event.content || '').slice(0, 60),
      })
    }

    let aiReply = ''
    let aiMeta = null
    if (body.withAiReply) {
      const aiHistory = Array.isArray(body.history) ? body.history : []
      const aiResult = await generateSceneAiReply({
        scene: 'emotion',
        question: content,
        history: aiHistory,
        student,
      })
      aiReply = aiResult.reply
      aiMeta = {
        model: aiResult.model,
        fallbackUsed: Boolean(aiResult.fallbackUsed),
        fallbackReason: aiResult.error || '',
      }
      if (!aiReply) {
        return sendJson(res, 503, {
          message: 'AI服务暂不可用，请稍后重试。',
          event,
          aiMeta,
        })
      }
    }

    return sendJson(res, 200, { event, aiReply, aiMeta })
  }

  if (req.method === 'GET' && pathname === '/api/emotion-events') {
    const scope = urlObject.searchParams.get('scope') || 'mine'
    if (scope === 'all') {
      return sendJson(res, 200, {
        list: readEmotionEvents(),
      })
    }
    const student = requireCurrentStudent(req, res)
    if (!student) {
      return
    }
    const list = readEmotionEvents().filter((item) => item.studentId === student.id)
    return sendJson(res, 200, { list })
  }

  if (req.method === 'GET' && pathname === '/api/growth-tree') {
    const student = requireCurrentStudent(req, res)
    if (!student) {
      return
    }
    const { tree } = getOrCreateGrowthTree(student.id)
    return sendJson(res, 200, { tree })
  }

  if (req.method === 'POST' && pathname === '/api/growth-tree/events') {
    const student = requireCurrentStudent(req, res)
    if (!student) {
      return
    }
    const body = await parseBody(req)
    const { tree, event } = appendGrowthEvent(student.id, {
      actionType: body.actionType,
      title: body.title,
      description: body.description,
      points: body.points,
      flowerDelta: body.flowerDelta,
      fruitDelta: body.fruitDelta,
      sourceType: body.sourceType,
      sourceId: body.sourceId,
    })
    return sendJson(res, 200, {
      tree,
      event,
      duplicated: !event,
    })
  }

  if (req.method === 'GET' && pathname === '/api/work-study/jobs') {
    const student = getCurrentStudent(req)
    const list = getWorkStudyOpenJobsWithMatch(student)
    return sendJson(res, 200, { list })
  }

  if (req.method === 'POST' && pathname === '/api/work-study/applications') {
    const student = requireCurrentStudent(req, res)
    if (!student) {
      return
    }
    const body = await parseBody(req)
    const jobId = typeof body.jobId === 'string' ? body.jobId : ''
    if (!jobId) {
      return sendJson(res, 400, { message: '岗位ID不能为空' })
    }
    const job = readWorkStudyJobs().find((item) => item.id === jobId)
    if (!job) {
      return notFound(res)
    }
    if (!job.openForApply) {
      return sendJson(res, 400, { message: '该岗位暂未开放报名' })
    }
    const applications = readWorkStudyApplications()
    const matched = getWorkStudyMatchResult(student, job, applications)
    if (!matched.eligible) {
      return sendJson(res, 400, { message: matched.reason })
    }
    const intro = typeof body.intro === 'string' ? body.intro.trim() : ''
    if (!intro) {
      return sendJson(res, 400, { message: '请填写岗位申请说明' })
    }
    const selectedSlots = normalizeStringList(body.availableSlots)
    if (job.shiftSlots.length > 0 && selectedSlots.length === 0) {
      return sendJson(res, 400, { message: '请至少选择一个可上岗时间' })
    }
    const record = normalizeWorkStudyApplicationRecord({
      id: createId('work-application'),
      studentId: student.id,
      studentNo: student.studentNo,
      studentName: student.name,
      college: student.college,
      major: student.major,
      grade: student.grade,
      jobId: job.id,
      jobTitle: job.title,
      department: job.department,
      intro,
      availableSlots: selectedSlots,
      skillTags: normalizeStringList(body.skillTags),
      matchScore: matched.score,
      matchLevel: matched.level,
      matchReasons: matched.reasons,
      status: '待审核',
      reviewComment: '',
      submittedAt: new Date().toISOString(),
      reviewedAt: '',
    })
    const nextList = [record, ...applications]
    writeWorkStudyApplications(nextList)
    return sendJson(res, 200, { application: record })
  }

  if (req.method === 'GET' && pathname === '/api/work-study/applications') {
    const scope = urlObject.searchParams.get('scope') || 'mine'
    if (scope === 'all') {
      return sendJson(res, 200, { list: readWorkStudyApplications() })
    }
    const student = requireCurrentStudent(req, res)
    if (!student) {
      return
    }
    const list = readWorkStudyApplications().filter((item) => item.studentId === student.id)
    return sendJson(res, 200, { list })
  }

  if (req.method === 'GET' && pathname === '/api/announcements') {
    return sendJson(res, 200, { list: getAnnouncementList() })
  }

  if (req.method === 'GET' && pathname.startsWith('/api/announcements/')) {
    const announcementId = pathname.split('/').pop()
    const target = getAnnouncementList().find((item) => item.id === announcementId)
    if (!target) {
      return notFound(res)
    }
    return sendJson(res, 200, { announcement: target })
  }

  if (req.method === 'GET' && pathname === '/api/campus-moments') {
    const scope = urlObject.searchParams.get('scope')
    if (scope === 'all') {
      return sendJson(res, 200, { list: getCampusMomentList() })
    }
    if (scope === 'mine') {
      const student = requireCurrentStudent(req, res)
      if (!student) {
        return
      }
      const list = getCampusMomentList().filter((item) => item.studentId === student.id)
      return sendJson(res, 200, { list })
    }
    return sendJson(res, 200, { list: getPublishedCampusMoments() })
  }

  if (req.method === 'POST' && pathname === '/api/campus-moments') {
    const student = requireCurrentStudent(req, res)
    if (!student) {
      return
    }
    const body = await parseBody(req)
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const caption = typeof body.caption === 'string' ? body.caption.trim() : ''
    const imageAttachmentsByList = sanitizeCampusMomentImageAttachments(body.imageAttachments)
    const imageAttachmentBySingle = sanitizeImageAttachment(body.imageAttachment, 'campus-moments/images')
    const imageAttachment = imageAttachmentBySingle || imageAttachmentsByList[0] || null
    const imageAttachments = []
    if (imageAttachment) {
      imageAttachments.push(imageAttachment)
    }
    imageAttachmentsByList.forEach((item) => {
      if (!imageAttachments.some((entry) => entry.filePath === item.filePath)) {
        imageAttachments.push(item)
      }
    })
    if (!title || !caption) {
      return sendJson(res, 400, { message: '标题和内容不能为空' })
    }
    if (!imageAttachment) {
      return sendJson(res, 400, { message: '请至少上传1张校园点滴图片' })
    }
    const list = readCampusMoments()
    const record = normalizeCampusMomentRecord({
      id: createId('campus-moment'),
      studentId: student.id,
      studentNo: student.studentNo,
      studentName: student.name,
      title,
      caption,
      image: '',
      imageList: imageAttachments.map((item) => item.fileUrl),
      imageAttachment,
      imageAttachments,
      status: '待审核',
      reviewComment: '',
      submittedAt: new Date().toISOString(),
      reviewedAt: '',
      publishedAt: '',
      publisher: '',
    })
    list.unshift(record)
    writeJson(FILES.campusMoments, list)
    appendGrowthEvent(student.id, {
      actionType: 'campusMomentRecorded',
      sourceType: 'campus-moment',
      sourceId: record.id,
      title: '记录校园点滴',
      description: String(record.title || '校园点滴').slice(0, 40),
    })
    return sendJson(res, 200, { record })
  }

  if (req.method === 'POST' && /^\/api\/campus-moments\/[^/]+\/review$/.test(pathname)) {
    const campusMomentId = pathname.split('/')[3]
    const body = await parseBody(req)
    const list = readCampusMoments()
    const index = list.findIndex((item) => item.id === campusMomentId)
    if (index < 0) {
      return notFound(res)
    }
    const reviewStatus = body.status === '驳回' ? '驳回' : '已发布'
    const reviewedAt = new Date().toISOString()
    const nextRecord = normalizeCampusMomentRecord({
      ...list[index],
      status: reviewStatus,
      reviewComment: typeof body.reviewComment === 'string' ? body.reviewComment.trim() : '',
      reviewedAt,
      publishedAt: reviewStatus === '已发布' ? reviewedAt : '',
      publisher: typeof body.publisher === 'string' && body.publisher.trim() ? body.publisher.trim() : '关怀中心老师',
    })
    list[index] = nextRecord
    writeJson(FILES.campusMoments, list)
    if (reviewStatus === '已发布' && nextRecord.studentId) {
      appendGrowthEvent(nextRecord.studentId, {
        actionType: 'campusMomentPublished',
        sourceType: 'campus-moment',
        sourceId: nextRecord.id,
        title: '校园点滴通过发布',
        description: String(nextRecord.title || '校园点滴').slice(0, 40),
      })
    }
    return sendJson(res, 200, { record: nextRecord })
  }

  if (req.method === 'POST' && pathname === '/api/teacher/announcements') {
    const body = await parseBody(req)
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const content = typeof body.content === 'string' ? body.content.trim() : ''
    if (!title || !content) {
      return sendJson(res, 400, { message: '公告标题和内容不能为空' })
    }
    const now = new Date().toISOString()
    const list = readAnnouncements()
    const announcement = normalizeAnnouncementRecord({
      id: createId('announcement'),
      coverImageAttachment: body.coverImageAttachment,
      title,
      content,
      attachments: body.attachments,
      publishedAt: now,
      updatedAt: now,
      publisher: body.publisher,
    })
    list.unshift(announcement)
    writeJson(FILES.announcements, list)
    return sendJson(res, 200, { announcement })
  }

  if (req.method === 'PUT' && pathname.startsWith('/api/teacher/announcements/')) {
    const announcementId = pathname.split('/').pop()
    const body = await parseBody(req)
    const list = readAnnouncements()
    const index = list.findIndex((item) => item.id === announcementId)
    if (index < 0) {
      return notFound(res)
    }
    const current = list[index]
    const nextAnnouncement = normalizeAnnouncementRecord({
      ...current,
      coverImage: typeof body.coverImage === 'string' ? body.coverImage : '',
      coverImageAttachment: sanitizeImageAttachment(body.coverImageAttachment, 'announcements/covers') || current.coverImageAttachment,
      title: typeof body.title === 'string' ? body.title : current.title,
      content: typeof body.content === 'string' ? body.content : current.content,
      attachments: Array.isArray(body.attachments)
        ? sanitizeAttachments(body.attachments, 'announcements/attachments')
        : current.attachments,
      publisher: typeof body.publisher === 'string' ? body.publisher : current.publisher,
      publishedAt: current.publishedAt,
      updatedAt: new Date().toISOString(),
    })
    if (!nextAnnouncement.title || !nextAnnouncement.content) {
      return sendJson(res, 400, { message: '公告标题和内容不能为空' })
    }
    list[index] = nextAnnouncement
    writeJson(FILES.announcements, list)
    return sendJson(res, 200, { announcement: nextAnnouncement })
  }

  if (req.method === 'GET' && pathname === '/api/colleges') {
    const scholarships = readJson(FILES.scholarships)
    return sendJson(res, 200, { list: deriveColleges(scholarships) })
  }

  if (req.method === 'GET' && pathname === '/api/scholarships') {
    const scholarships = readJson(FILES.scholarships)
    const category = urlObject.searchParams.get('category')
    const collegeKey = urlObject.searchParams.get('collegeKey')
    const filtered = scholarships.filter((item) => {
      if (category && item.category !== category) {
        return false
      }
      if (collegeKey && item.collegeKey && item.collegeKey !== collegeKey) {
        return false
      }
      return true
    })
    return sendJson(res, 200, { list: filtered })
  }

  if (req.method === 'GET' && pathname === '/api/deadline-reminders') {
    const student = requireCurrentStudent(req, res)
    if (!student) {
      return
    }
    const hourWindow = Number(urlObject.searchParams.get('hourWindow') || 72)
    const list = buildStudentDeadlineReminders(student, { hourWindow })
    appendDeadlineReminders(list)
    const persistedList = readDeadlineReminders()
      .filter((item) => item.studentId === student.id)
      .map((item) => {
        if (item.status === 'pending') {
          return {
            ...item,
            status: 'read',
            readAt: item.readAt || new Date().toISOString(),
          }
        }
        return item
      })
      .sort((a, b) => Number(a.hoursLeft || 0) - Number(b.hoursLeft || 0))
    const history = readDeadlineReminders().filter((item) => item.studentId !== student.id)
    writeDeadlineReminders(history.concat(persistedList))
    return sendJson(res, 200, {
      list: persistedList,
      generatedAt: new Date().toISOString(),
    })
  }

  if (req.method === 'POST' && pathname === '/api/share-cards') {
    const student = requireCurrentStudent(req, res)
    if (!student) {
      return
    }
    const body = await parseBody(req)
    const payload = normalizeShareCardPayload(body, {
      studentName: student.name,
      college: student.college,
      level: student.currentRecognitionLevel,
    })
    if (!payload.scholarshipId || !payload.scholarshipName) {
      return sendJson(res, 400, { message: '奖助项目信息不能为空' })
    }

    const list = readShareCards()
    const shareCard = normalizeShareCardRecord({
      id: createId('share-card'),
      code: createShareCardCode(list),
      path: `/pages/policy-detail/policy-detail?id=${encodeURIComponent(payload.scholarshipId)}&shareCode=`,
      title: `${payload.sharer.studentName || '同学'} 推荐你关注：${payload.scholarshipName}`,
      subtitle: payload.reason || `${payload.sponsor || '奖助项目'} · ${payload.amountText || ''}`,
      poster: '/teacher/logo.png',
      sharer: payload.sharer,
      payload,
      createdAt: new Date().toISOString(),
    })

    const persistedShareCard = {
      ...shareCard,
      path: `/pages/policy-detail/policy-detail?id=${encodeURIComponent(payload.scholarshipId)}&shareCode=${encodeURIComponent(shareCard.code)}`,
    }
    list.unshift(persistedShareCard)
    writeShareCards(list)
    return sendJson(res, 200, { shareCard: persistedShareCard })
  }

  if (req.method === 'GET' && /^\/api\/share-cards\/[^/]+$/.test(pathname)) {
    const code = String(pathname.split('/')[3] || '').trim().toUpperCase()
    if (!code) {
      return notFound(res)
    }
    const list = readShareCards()
    const shareCard = list.find((item) => item.code === code)
    if (!shareCard) {
      return notFound(res)
    }
    return sendJson(res, 200, { shareCard })
  }

  if (req.method === 'GET' && pathname === '/api/teacher/deadline-reminders') {
    const status = String(urlObject.searchParams.get('status') || '').trim()
    const list = readDeadlineReminders().filter((item) => {
      if (status && item.status !== status) {
        return false
      }
      return true
    })
    return sendJson(res, 200, {
      list,
      summary: {
        total: list.length,
        pending: list.filter((item) => item.status === 'pending' || item.status === 'read').length,
        handled: list.filter((item) => item.status === 'handled').length,
        overdue: list.filter((item) => item.status === 'overdue').length,
      },
    })
  }

  if (req.method === 'GET' && pathname.startsWith('/api/scholarships/')) {
    const scholarship = getScholarshipById(pathname.split('/').pop())
    if (!scholarship) {
      return notFound(res)
    }
    const student = getCurrentStudent(req)
    if (student) {
      upsertPolicyViewRecord({
        studentId: student.id,
        studentNo: student.studentNo,
        studentName: student.name,
        college: student.college,
        grade: student.grade,
        major: student.major,
        gender: student.gender,
        scholarshipId: scholarship.id,
        scholarshipName: scholarship.name,
        category: scholarship.category,
        scholarshipType: scholarship.type,
      })
    }
    const eligibility = evaluateScholarshipEligibility(student, scholarship)
    const currentRecommendation = student
      ? getStudentRecommendationFeed(student, 30).find((item) => item.id === scholarship.id)
      : null
    const shouldShowAlternatives = Boolean(
      student && (
        !eligibility.eligible ||
        String(currentRecommendation?.fitBucket || '') === 'low' ||
        String(currentRecommendation?.matchLevel || '') === '待提升'
      ),
    )
    const recommendation = currentRecommendation
      ? {
        score: currentRecommendation.score,
        matchLevel: currentRecommendation.matchLevel,
        fitBucket: currentRecommendation.fitBucket,
        aiReason: currentRecommendation.aiReason,
      }
      : null
    const alternativeRecommendations = shouldShowAlternatives
      ? getStudentAlternativeScholarships(student, scholarship.id, 4)
      : []
    return sendJson(res, 200, {
      scholarship,
      eligibility,
      recommendation,
      showAlternativeRecommendations: shouldShowAlternatives,
      alternativeRecommendations,
    })
  }

  if (req.method === 'PUT' && pathname.startsWith('/api/scholarships/')) {
    const scholarshipId = pathname.split('/').pop()
    const body = await parseBody(req)
    const scholarships = readJson(FILES.scholarships)
    const index = scholarships.findIndex((item) => item.id === scholarshipId)
    if (index < 0) {
      return notFound(res)
    }
    scholarships[index] = {
      ...scholarships[index],
      name: body.name ?? scholarships[index].name,
      amountText: body.amountText ?? scholarships[index].amountText,
      amountMode: body.amountMode ?? scholarships[index].amountMode,
      amountTiers: Array.isArray(body.amountTiers) ? body.amountTiers : scholarships[index].amountTiers,
      restrictionNote: body.restrictionNote ?? scholarships[index].restrictionNote,
      allowedRecognitionRuleIds: Array.isArray(body.allowedRecognitionRuleIds)
        ? body.allowedRecognitionRuleIds
        : scholarships[index].allowedRecognitionRuleIds,
      openForApply: typeof body.openForApply === 'boolean' ? body.openForApply : scholarships[index].openForApply,
      deadline: body.deadline ?? scholarships[index].deadline,
      guide: body.guide ?? scholarships[index].guide,
    }
    writeJson(FILES.scholarships, scholarships)
    return sendJson(res, 200, { scholarship: scholarships[index] })
  }

  if (req.method === 'POST' && pathname === '/api/recognitions/preview') {
    const student = requireCurrentStudent(req, res)
    if (!student) {
      return
    }
    const body = await parseBody(req)
    const result = calculateRecognitionScore({ selectedRuleIds: body.selectedRuleIds || [] })
    return sendJson(res, 200, result)
  }

  if (req.method === 'POST' && pathname === '/api/recognitions') {
    const body = await parseBody(req)
    const student = requireCurrentStudent(req, res)
    if (!student) {
      return
    }
    if (student.currentRecognitionStatus === '审核通过') {
      return sendJson(res, 400, { message: '当前认定已通过，不能重复申请。' })
    }
    const existingRecognitions = readJson(FILES.recognitions)
    const hasPendingRecognition = existingRecognitions.some(
      (item) => item.studentId === student.id && (item.reviewStatus === '待审核' || item.reviewStatus === '退回补充'),
    )
    if (hasPendingRecognition) {
      return sendJson(res, 400, { message: '当前已有认定申请在处理中，请先查看审核结果。' })
    }
    const nextStudent = {
      ...student,
      studentNo: body.profile?.studentNo || student.studentNo,
      name: body.profile?.name || student.name,
      college: body.profile?.college || student.college,
      collegeKey: body.profile?.collegeKey || student.collegeKey,
      major: body.profile?.major || student.major,
      className: body.profile?.className || student.className,
      grade: body.profile?.grade || student.grade,
      phone: body.profile?.phone || student.phone,
      currentRecognitionStatus: '待审核',
    }
    updateStudent(nextStudent)

    const ruleLabelMap = getRecognitionRuleLabelMap()
    const preview = calculateRecognitionScore({ selectedRuleIds: body.selectedRuleIds || [] })
    const recognitions = readJson(FILES.recognitions)
    const application = {
      id: createId('recognition'),
      studentId: nextStudent.id,
      profile: {
        studentNo: nextStudent.studentNo,
        name: nextStudent.name,
        college: nextStudent.college,
        collegeKey: nextStudent.collegeKey,
        major: nextStudent.major,
        className: nextStudent.className,
        grade: nextStudent.grade,
        phone: nextStudent.phone,
      },
      selectedRuleIds: Array.isArray(body.selectedRuleIds) ? body.selectedRuleIds : [],
      selectedRuleLabels: (Array.isArray(body.selectedRuleIds) ? body.selectedRuleIds : []).map((id) => ruleLabelMap[id]).filter(Boolean),
      supplementalNote: body.supplementalNote || '',
      materials: Array.isArray(body.materials) ? body.materials : [],
      attachments: sanitizeAttachments(body.attachments, 'recognitions/attachments'),
      academicYear: getCurrentAcademicYear(),
      systemScore: preview.finalScore,
      systemLevel: preview.level.label,
      systemTag: preview.level.tag,
      reviewStatus: '待审核',
      teacherAdjustScore: 0,
      finalScore: preview.finalScore,
      finalLevel: preview.level.label,
      finalTag: preview.level.tag,
      confirmedRuleIds: [],
      confirmedRuleLabels: [],
      reviewComment: '',
      submittedAt: new Date().toISOString(),
      reviewedAt: '',
    }
    recognitions.unshift(application)
    writeJson(FILES.recognitions, recognitions)
    return sendJson(res, 200, { application })
  }

  if (req.method === 'GET' && pathname === '/api/recognitions') {
    const scope = urlObject.searchParams.get('scope')
    const studentId = urlObject.searchParams.get('studentId') || getStudentIdFromRequest(req)
    if (!studentId && scope !== 'all') {
      return sendJson(res, 401, { message: '请先登录学生账号' })
    }
    const status = urlObject.searchParams.get('status')
    const list = readJson(FILES.recognitions).filter((item) => {
      if (studentId && item.studentId !== studentId) {
        return false
      }
      if (status && item.reviewStatus !== status) {
        return false
      }
      return true
    })
    return sendJson(res, 200, { list })
  }

  if (req.method === 'GET' && pathname.startsWith('/api/recognitions/')) {
    const student = requireCurrentStudent(req, res)
    if (!student) {
      return
    }
    const record = readJson(FILES.recognitions).find((item) => item.id === pathname.split('/').pop())
    if (!record || record.studentId !== student.id) {
      return notFound(res)
    }
    return sendJson(res, 200, { record })
  }

  if (req.method === 'POST' && /^\/api\/recognitions\/[^/]+\/review$/.test(pathname)) {
    const recognitionId = pathname.split('/')[3]
    const body = await parseBody(req)
    const recognitions = readJson(FILES.recognitions)
    const index = recognitions.findIndex((item) => item.id === recognitionId)
    if (index < 0) {
      return notFound(res)
    }
    const ruleLabelMap = getRecognitionRuleLabelMap()
    const confirmedRuleIds = sanitizeConfirmedRecognitionRuleIds(
      Array.isArray(body.confirmedRuleIds) ? body.confirmedRuleIds : recognitions[index].selectedRuleIds,
    )
    const manualBonusScore = Number(body.manualBonusScore || 0)
    const clearInvalid = Boolean(body.clearInvalid)
    const scoreResult = calculateRecognitionScore({ confirmedRuleIds, manualBonusScore, clearInvalid })
    const reviewStatus = body.reviewStatus || '审核通过'
    recognitions[index] = {
      ...recognitions[index],
      reviewStatus,
      teacherAdjustScore: clearInvalid ? 0 : Math.max(0, manualBonusScore),
      finalScore: scoreResult.finalScore,
      finalLevel: reviewStatus === '审核通过' ? scoreResult.level.label : recognitions[index].finalLevel,
      finalTag: reviewStatus === '审核通过' ? scoreResult.level.tag : recognitions[index].finalTag,
      confirmedRuleIds,
      confirmedRuleLabels: confirmedRuleIds.map((id) => ruleLabelMap[id]).filter(Boolean),
      reviewComment: body.reviewComment || '',
      reviewedAt: new Date().toISOString(),
      clearInvalid,
    }
    writeJson(FILES.recognitions, recognitions)

    const targetStudent = getStudentById(recognitions[index].studentId)
    if (targetStudent && reviewStatus === '审核通过') {
      updateStudent({
        ...targetStudent,
        currentRecognitionStatus: '审核通过',
        currentRecognitionLevel: scoreResult.level.label,
        currentPovertyTag: scoreResult.level.tag,
        currentRecognitionScore: scoreResult.finalScore,
        confirmedRecognitionRuleIds: confirmedRuleIds,
        confirmedRecognitionLabels: confirmedRuleIds.map((id) => ruleLabelMap[id]).filter(Boolean),
      })
      appendGrowthEvent(targetStudent.id, {
        actionType: 'recognitionApproved',
        sourceType: 'recognition',
        sourceId: recognitions[index].id,
        title: '困难认定审核通过',
        description: `认定等级更新为 ${scoreResult.level.label}`,
      })
    } else if (targetStudent && reviewStatus === '退回补充') {
      updateStudent({ ...targetStudent, currentRecognitionStatus: '退回补充' })
    } else if (targetStudent && reviewStatus === '驳回') {
      updateStudent({
        ...targetStudent,
        currentRecognitionStatus: '驳回',
        currentRecognitionLevel: '未认定',
        currentPovertyTag: '未认定',
        currentRecognitionScore: 0,
        confirmedRecognitionRuleIds: [],
        confirmedRecognitionLabels: [],
      })
    }

    return sendJson(res, 200, { record: recognitions[index] })
  }

  if (req.method === 'POST' && pathname === '/api/scholarship-applications') {
    const body = await parseBody(req)
    const scholarship = getScholarshipById(body.scholarshipId)
    if (!scholarship) {
      return notFound(res)
    }
    const student = requireCurrentStudent(req, res)
    if (!student) {
      return
    }
    const applications = readJson(FILES.applications).map((item) => normalizeApplicationRecord(item))
    const applyPayloadResult = validateScholarshipApplyPayload(body)
    if (!applyPayloadResult.valid) {
      return sendJson(res, 400, { message: applyPayloadResult.message })
    }
    const applyLock = getScholarshipApplyLock(student.id, scholarship, applications)
    if (applyLock.blocked) {
      return sendJson(res, 400, { message: applyLock.message })
    }
    const eligibility = evaluateScholarshipEligibility(student, scholarship)
    if (!eligibility.eligible) {
      return sendJson(res, 400, { message: eligibility.reason })
    }
    const application = normalizeApplicationRecord({
      id: createId('scholarship'),
      studentId: student.id,
      scholarshipId: scholarship.id,
      scholarshipName: scholarship.name,
      scholarshipType: scholarship.type,
      academicYear: getCurrentAcademicYear(),
      recognitionSnapshot: buildRecognitionSnapshot(student),
      eligibilityResult: eligibility,
      applySummary: applyPayloadResult.applySummary,
      materials: [
        `个人简介：${applyPayloadResult.applySummary.personalIntro}`,
        `家庭情况：${applyPayloadResult.applySummary.familySituation}`,
        `使用计划：${applyPayloadResult.applySummary.usagePlan}`,
      ],
      attachments: applyPayloadResult.attachmentList,
      status: '待审核',
      comment: body.comment || '',
      submittedAt: new Date().toISOString(),
      reviewedAt: '',
      reviewComment: '',
    })
    applications.unshift(application)
    writeJson(FILES.applications, applications)
    return sendJson(res, 200, { application })
  }

  if (req.method === 'GET' && pathname === '/api/scholarship-applications') {
    const scope = urlObject.searchParams.get('scope')
    const studentId = urlObject.searchParams.get('studentId') || getStudentIdFromRequest(req)
    if (!studentId && scope !== 'all') {
      return sendJson(res, 401, { message: '请先登录学生账号' })
    }
    const status = urlObject.searchParams.get('status')
    const list = readJson(FILES.applications)
      .map((item) => normalizeApplicationRecord(item))
      .filter((item) => {
        if (studentId && item.studentId !== studentId) {
          return false
        }
        if (status && item.status !== status) {
          return false
        }
        return true
      })
    return sendJson(res, 200, { list })
  }

  if (req.method === 'GET' && pathname.startsWith('/api/scholarship-applications/')) {
    const student = requireCurrentStudent(req, res)
    if (!student) {
      return
    }
    const record = readJson(FILES.applications)
      .map((item) => normalizeApplicationRecord(item))
      .find((item) => item.id === pathname.split('/').pop() && item.studentId === student.id)
    if (!record) {
      return notFound(res)
    }
    return sendJson(res, 200, { record })
  }

  if (req.method === 'POST' && /^\/api\/scholarship-applications\/[^/]+\/review$/.test(pathname)) {
    const applicationId = pathname.split('/')[3]
    const body = await parseBody(req)
    const applications = readJson(FILES.applications)
    const index = applications.findIndex((item) => item.id === applicationId)
    if (index < 0) {
      return notFound(res)
    }
    applications[index] = {
      ...applications[index],
      status: body.status || '审核通过',
      reviewComment: body.reviewComment || '',
      reviewedAt: new Date().toISOString(),
    }
    writeJson(FILES.applications, applications)
    if (applications[index].status === '审核通过') {
      appendGrowthEvent(applications[index].studentId, {
        actionType: 'scholarshipApproved',
        sourceType: 'scholarship-application',
        sourceId: applications[index].id,
        title: '奖助申请审核通过',
        description: `${applications[index].scholarshipName} 审核通过`,
      })
    }
    return sendJson(res, 200, { application: applications[index] })
  }

  if (req.method === 'GET' && pathname === '/api/work-study/teacher/jobs') {
    const keyword = String(urlObject.searchParams.get('keyword') || '')
      .trim()
      .toLowerCase()
    const openStatus = String(urlObject.searchParams.get('openStatus') || '').trim()
    const jobs = buildTeacherWorkStudyJobOverview(readWorkStudyJobs(), readWorkStudyApplications()).filter((item) => {
      if (openStatus === 'open' && !item.openForApply) {
        return false
      }
      if (openStatus === 'closed' && item.openForApply) {
        return false
      }
      if (keyword) {
        const text = [item.title, item.department, item.location, item.description, ...(item.tags || [])].join(' ').toLowerCase()
        return text.includes(keyword)
      }
      return true
    })
    return sendJson(res, 200, { list: jobs })
  }

  if (req.method === 'POST' && pathname === '/api/work-study/teacher/jobs') {
    const body = await parseBody(req)
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) {
      return sendJson(res, 400, { message: '岗位名称不能为空' })
    }
    const jobs = readWorkStudyJobs()
    const duplicated = jobs.some((item) => item.title === title)
    if (duplicated) {
      return sendJson(res, 400, { message: '已存在同名岗位，请先修改原岗位。' })
    }
    const nextJob = normalizeWorkStudyJobRecord({
      id: createId('work-job'),
      title,
      department: body.department,
      location: body.location,
      salaryPerHour: body.salaryPerHour,
      weeklyHoursMax: body.weeklyHoursMax,
      monthlyHoursMax: body.monthlyHoursMax,
      requiredMajors: body.requiredMajors,
      requiredSkills: body.requiredSkills,
      shiftSlots: body.shiftSlots,
      tags: body.tags,
      openForApply: body.openForApply !== false,
      description: body.description,
    })
    jobs.unshift(nextJob)
    writeJson(FILES.workStudyJobs, jobs)
    return sendJson(res, 200, { job: nextJob })
  }

  if (req.method === 'PUT' && /^\/api\/work-study\/teacher\/jobs\/[^/]+$/.test(pathname)) {
    const jobId = pathname.split('/')[5]
    const body = await parseBody(req)
    const jobs = readWorkStudyJobs()
    const index = jobs.findIndex((item) => item.id === jobId)
    if (index < 0) {
      return notFound(res)
    }
    const current = jobs[index]
    const title = typeof body.title === 'string' ? body.title.trim() : current.title
    if (!title) {
      return sendJson(res, 400, { message: '岗位名称不能为空' })
    }
    jobs[index] = normalizeWorkStudyJobRecord({
      ...current,
      ...body,
      title,
      id: current.id,
      openForApply: typeof body.openForApply === 'boolean' ? body.openForApply : current.openForApply,
    })
    writeJson(FILES.workStudyJobs, jobs)
    return sendJson(res, 200, { job: jobs[index] })
  }

  if (req.method === 'GET' && pathname === '/api/work-study/teacher/applications') {
    const status = urlObject.searchParams.get('status') || ''
    const scope = urlObject.searchParams.get('scope') || 'all'
    return sendJson(res, 200, {
      list: getTeacherWorkStudyApplications(scope, status),
    })
  }

  if (req.method === 'POST' && /^\/api\/work-study\/teacher\/applications\/[^/]+\/review$/.test(pathname)) {
    const applicationId = pathname.split('/')[5]
    const body = await parseBody(req)
    const list = readWorkStudyApplications()
    const index = list.findIndex((item) => item.id === applicationId)
    if (index < 0) {
      return notFound(res)
    }
    const status = body.status === '驳回' ? '驳回' : '审核通过'
    const reviewComment = typeof body.reviewComment === 'string' ? body.reviewComment.trim() : ''
    list[index] = normalizeWorkStudyApplicationRecord({
      ...list[index],
      status,
      reviewComment,
      reviewedAt: new Date().toISOString(),
    })
    writeWorkStudyApplications(list)
    if (status === '审核通过') {
      appendGrowthEvent(list[index].studentId, {
        actionType: 'workStudyApproved',
        sourceType: 'work-study-application',
        sourceId: list[index].id,
        title: '勤工岗位申请通过',
        description: `${list[index].jobTitle} 审核通过`,
      })
    }
    return sendJson(res, 200, { application: list[index] })
  }

  if (req.method === 'GET' && pathname === '/api/teacher/care-alerts') {
    const status = urlObject.searchParams.get('status') || ''
    const level = urlObject.searchParams.get('level') || ''
    const studentKeyword = String(urlObject.searchParams.get('keyword') || '').trim()
    const list = sortCareAlerts(readEmotionEvents()).filter((item) => {
      if (status && item.status !== status) {
        return false
      }
      if (level && item.levelCode !== level) {
        return false
      }
      if (studentKeyword) {
        return [item.studentName, item.studentNo, item.college].join(' ').includes(studentKeyword)
      }
      return true
    })
    const clusters = buildCareAlertClusters(list)
    const sanitizeForTeacher = (item) => ({
      ...item,
      content: typeof item.content === 'string' ? item.content : '',
      chatMessages: resolveEmotionEventChatMessages(item),
      events: Array.isArray(item.events)
        ? item.events.map((entry) => ({
            ...entry,
            content: typeof entry.content === 'string' ? entry.content : '',
            chatMessages: resolveEmotionEventChatMessages(entry),
          }))
        : item.events,
    })
    return sendJson(res, 200, {
      list: list.map(sanitizeForTeacher),
      clusters: clusters.map(sanitizeForTeacher),
      summary: buildCareAlertSummary(list),
    })
  }

  if (req.method === 'GET' && pathname === '/api/teacher/emotion-keywords') {
    return sendJson(res, 200, {
      groups: getEmotionKeywordGroups(),
    })
  }

  if (req.method === 'PUT' && pathname === '/api/teacher/emotion-keywords') {
    const body = await parseBody(req)
    const nextRecord = normalizeEmotionKeywordsRecord({
      high: body.high,
      medium: body.medium,
      low: body.low,
    })
    if (nextRecord.high.length === 0) {
      return sendJson(res, 400, { message: '红色预警关键词不能为空' })
    }
    writeEmotionKeywords(nextRecord)
    return sendJson(res, 200, {
      groups: getEmotionKeywordGroups(),
    })
  }

  if (req.method === 'POST' && /^\/api\/teacher\/care-alerts\/[^/]+\/handle$/.test(pathname)) {
    const alertId = pathname.split('/')[4]
    const body = await parseBody(req)
    const list = readEmotionEvents()
    const handleNote = typeof body.handleNote === 'string' ? body.handleNote.trim() : ''
    if (!handleNote) {
      return sendJson(res, 400, { message: '处理意见不能为空' })
    }

    const nextStatus = body.status === '可观察' ? '可观察' : '已处理'
    const handler = typeof body.handler === 'string' ? body.handler.trim() || '辅导员' : '辅导员'
    const handledAt = new Date().toISOString()

    let targetIndexes = []
    const directIndex = list.findIndex((item) => item.id === alertId)
    if (directIndex >= 0) {
      targetIndexes = [directIndex]
    } else if (alertId.startsWith('cluster-')) {
      const cluster = buildCareAlertClusters(list).find((item) => item.id === alertId)
      if (!cluster) {
        return notFound(res)
      }
      const clusterKey = getCareAlertClusterKey(cluster)
      targetIndexes = list
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => getCareAlertClusterKey(item) === clusterKey && item.status !== '已处理')
        .map(({ index }) => index)
      if (targetIndexes.length === 0 && cluster.latestEventId) {
        const latestIndex = list.findIndex((item) => item.id === cluster.latestEventId)
        if (latestIndex >= 0) {
          targetIndexes = [latestIndex]
        }
      }
    }

    if (targetIndexes.length === 0) {
      return notFound(res)
    }

    targetIndexes.forEach((index) => {
      list[index] = normalizeEmotionEventRecord({
        ...list[index],
        status: nextStatus,
        handleNote,
        handler,
        handledAt,
      })
    })

    writeEmotionEvents(list)
    return sendJson(res, 200, {
      alert: list[targetIndexes[0]],
      updatedCount: targetIndexes.length,
    })
  }

  if (req.method === 'POST' && /^\/api\/teacher\/deadline-reminders\/[^/]+\/handle$/.test(pathname)) {
    const reminderId = pathname.split('/')[4]
    const list = readDeadlineReminders()
    const index = list.findIndex((item) => item.id === reminderId)
    if (index < 0) {
      return notFound(res)
    }
    const nowIso = new Date().toISOString()
    const deadlineTime = parseDeadlineToTime(list[index].deadline)
    const isOverdue = deadlineTime > 0 && deadlineTime < Date.now()
    list[index] = {
      ...list[index],
      status: isOverdue ? 'overdue' : 'handled',
      handledAt: nowIso,
      readAt: list[index].readAt || nowIso,
    }
    writeDeadlineReminders(list)
    return sendJson(res, 200, { reminder: list[index] })
  }

  if (req.method === 'GET' && pathname === '/api/teacher/donation-dashboard') {
    return sendJson(res, 200, buildDonationDashboardData())
  }

  if (req.method === 'GET' && pathname === '/api/teacher/monthly-report') {
    const month = String(urlObject.searchParams.get('month') || '').trim()
    return sendJson(res, 200, buildTeacherMonthlyReport(month))
  }

  if (req.method === 'GET' && pathname === '/api/teacher/summary-report') {
    const periodType = String(urlObject.searchParams.get('periodType') || 'month').trim()
    const periodValue = String(urlObject.searchParams.get('periodValue') || '').trim()
    return sendJson(res, 200, buildTeacherSummaryReport(periodType, periodValue))
  }

  if (req.method === 'GET' && pathname === '/api/teacher/scholarship-analytics') {
    return sendJson(res, 200, buildTeacherScholarshipAnalytics())
  }

  if (req.method === 'GET' && pathname === '/api/teacher/psychology-trend') {
    return sendJson(res, 200, buildTeacherPsychologyTrendData())
  }

  if (req.method === 'GET' && pathname === '/api/teacher/dashboard') {
    return sendJson(res, 200, buildTeacherDashboardData())
  }

  if (req.method === 'GET' && pathname === '/api/teacher/outreach-reminders') {
    const dashboard = buildTeacherDashboardData()
    const outreachSummary = dashboard.outreachSummary || {}
    const list = Array.isArray(outreachSummary.pendingOutreachStudents) ? outreachSummary.pendingOutreachStudents : []
    return sendJson(res, 200, {
      list,
      summary: {
        academicYear: outreachSummary.academicYear || getCurrentAcademicYear(),
        targetStudentCount: Number(outreachSummary.targetStudentCount || 0),
        viewedPolicyStudentCount: Number(outreachSummary.viewedPolicyStudentCount || 0),
        appliedStudentCount: Number(outreachSummary.appliedStudentCount || 0),
        pendingOutreachCount: Number(outreachSummary.pendingOutreachCount || 0),
      },
    })
  }

  return notFound(res)
}

bootstrapData()

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true })
  }
  const urlObject = new URL(req.url, `https://ynyt.nat100.top`)
  try {
    if (urlObject.pathname.startsWith('/api/')) {
      return await handleApi(req, res, urlObject)
    }
    if (urlObject.pathname.startsWith('/uploads/')) {
      return serveUploadStatic(urlObject.pathname, res)
    }
    if (urlObject.pathname === '/' || urlObject.pathname.startsWith('/teacher')) {
      return serveTeacherStatic(urlObject.pathname, res)
    }
    return notFound(res)
  } catch (error) {
    return sendJson(res, 500, { message: error.message || 'Server Error' })
  }
})

server.listen(PORT, () => {
  console.log(`易暖医途 Mock API running at ${PUBLIC_BASE_URL} (port ${PORT})`)
})
