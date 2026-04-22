export interface EvaluateHistoryItem {
  id: string
  time: string
  college: string
  grade: string
  ranking: string
  gpa: string
  family: string
  hasAward: string
  status: 'success' | 'danger'
  text: string
  matchedList: string[]
}

export interface StudentSession {
  studentId: string
  studentNo: string
  name: string
}

export interface MentalAssessmentHistoryItem {
  id: string
  studentId: string
  scaleKey: 'SDS' | 'SAS'
  scaleName: string
  rawScore: number
  standardScore: number
  indexScore: string
  levelLabel: string
  levelTone: 'tone-ok' | 'tone-warn' | 'tone-danger'
  highlightText: string
  createdAt: string
}

export interface AiChatHistoryItem {
  id: string
  studentId: string
  scene: string
  question: string
  reply: string
  fallbackUsed: boolean
  fallbackReason: string
  model: string
  createdAt: string
}

const FAVORITES_KEY = 'xjt_favorites'
const EVALUATE_HISTORY_KEY = 'xjt_evaluate_history'
const MENTAL_ASSESSMENT_HISTORY_KEY = 'xjt_mental_assessment_history'
const AI_CHAT_HISTORY_KEY = 'xjt_ai_chat_history'
const COLLEGE_BINDING_KEY = 'xjt_college_binding'
const CURRENT_STUDENT_KEY = 'xjt_current_student'

const legacyCollegeKeyMap: Record<string, string> = {
  publicHealth: 'public-health',
  medicalTechnology: 'medical-technology',
  secondClinical: 'second-clinical',
}

function normalizeCollegeKey(rawKey: unknown): string {
  const collegeKey = typeof rawKey === 'string' ? rawKey.trim() : ''
  if (!collegeKey) {
    return ''
  }
  return legacyCollegeKeyMap[collegeKey] || collegeKey
}

function normalizeStudentSession(rawValue: unknown): StudentSession | null {
  if (!rawValue || typeof rawValue !== 'object') {
    return null
  }
  const source = rawValue as Record<string, unknown>
  const studentId = typeof source.studentId === 'string' ? source.studentId.trim() : ''
  const studentNo = typeof source.studentNo === 'string' ? source.studentNo.trim() : ''
  const name = typeof source.name === 'string' ? source.name.trim() : ''
  if (!studentId || !studentNo || !name) {
    return null
  }
  return {
    studentId,
    studentNo,
    name,
  }
}

function readArrayStorage(key: string): unknown[] {
  const cache = wx.getStorageSync(key)
  return Array.isArray(cache) ? cache : []
}

export function getFavorites(): string[] {
  const list = readArrayStorage(FAVORITES_KEY)
  return list.filter((item) => typeof item === 'string') as string[]
}

export function setFavorites(favoriteIds: string[]): void {
  wx.setStorageSync(FAVORITES_KEY, favoriteIds)
}

export function toggleFavorite(itemId: string): string[] {
  const favorites = getFavorites()
  const exists = favorites.includes(itemId)
  const nextList = exists ? favorites.filter((id) => id !== itemId) : favorites.concat(itemId)
  setFavorites(nextList)
  return nextList
}

export function getEvaluateHistory(): EvaluateHistoryItem[] {
  const list = readArrayStorage(EVALUATE_HISTORY_KEY)
  return list as EvaluateHistoryItem[]
}

export function saveEvaluateHistory(item: EvaluateHistoryItem): EvaluateHistoryItem[] {
  const nextList = [item].concat(getEvaluateHistory()).slice(0, 3)
  wx.setStorageSync(EVALUATE_HISTORY_KEY, nextList)
  return nextList
}

export function getMentalAssessmentHistory(studentId = ''): MentalAssessmentHistoryItem[] {
  const list = readArrayStorage(MENTAL_ASSESSMENT_HISTORY_KEY) as MentalAssessmentHistoryItem[]
  const safeStudentId = String(studentId || '').trim()
  if (!safeStudentId) {
    return list
  }
  return list.filter((item) => item.studentId === safeStudentId)
}

export function saveMentalAssessmentHistory(item: MentalAssessmentHistoryItem): MentalAssessmentHistoryItem[] {
  const list = getMentalAssessmentHistory()
  const nextList = [item].concat(list).slice(0, 20)
  wx.setStorageSync(MENTAL_ASSESSMENT_HISTORY_KEY, nextList)
  return nextList
}

export function getAiChatHistory(studentId = ''): AiChatHistoryItem[] {
  const list = readArrayStorage(AI_CHAT_HISTORY_KEY) as AiChatHistoryItem[]
  const safeStudentId = String(studentId || '').trim()
  if (!safeStudentId) {
    return list
  }
  return list.filter((item) => item.studentId === safeStudentId)
}

export function saveAiChatHistory(item: AiChatHistoryItem): AiChatHistoryItem[] {
  const list = getAiChatHistory()
  const nextList = [item].concat(list).slice(0, 100)
  wx.setStorageSync(AI_CHAT_HISTORY_KEY, nextList)
  return nextList
}

export function clearAiChatHistory(): void {
  wx.removeStorageSync(AI_CHAT_HISTORY_KEY)
}

export function clearMentalAssessmentHistory(): void {
  wx.removeStorageSync(MENTAL_ASSESSMENT_HISTORY_KEY)
}

export function getBoundCollege(): string {
  return normalizeCollegeKey(wx.getStorageSync(COLLEGE_BINDING_KEY))
}

export function setBoundCollege(collegeKey: string): void {
  wx.setStorageSync(COLLEGE_BINDING_KEY, normalizeCollegeKey(collegeKey))
}

export function getCurrentStudentSession(): StudentSession | null {
  return normalizeStudentSession(wx.getStorageSync(CURRENT_STUDENT_KEY))
}

const STUDENT_LOGIN_PAGE = '/pages/mine/mine'

export function getCurrentStudentId(): string {
  return getCurrentStudentSession()?.studentId || ''
}

export function hasCurrentStudentSession(): boolean {
  return Boolean(getCurrentStudentSession())
}

export function redirectToStudentLogin(message = '请先登录学生账号'): void {
  wx.showToast({
    title: message,
    icon: 'none',
  })
  wx.switchTab({ url: STUDENT_LOGIN_PAGE })
}

export function requireCurrentStudentSession(message = '请先登录学生账号'): StudentSession | null {
  const session = getCurrentStudentSession()
  if (session) {
    return session
  }
  redirectToStudentLogin(message)
  return null
}

export function setCurrentStudentSession(session: StudentSession): void {
  const nextSession = normalizeStudentSession(session)
  if (!nextSession) {
    wx.removeStorageSync(CURRENT_STUDENT_KEY)
    return
  }
  wx.setStorageSync(CURRENT_STUDENT_KEY, nextSession)
}

export function clearCurrentStudentSession(): void {
  wx.removeStorageSync(CURRENT_STUDENT_KEY)
}

export function clearUserData(): void {
  wx.removeStorageSync(FAVORITES_KEY)
  wx.removeStorageSync(EVALUATE_HISTORY_KEY)
  wx.removeStorageSync(MENTAL_ASSESSMENT_HISTORY_KEY)
  wx.removeStorageSync(AI_CHAT_HISTORY_KEY)
  wx.removeStorageSync(COLLEGE_BINDING_KEY)
  wx.removeStorageSync(CURRENT_STUDENT_KEY)
}
