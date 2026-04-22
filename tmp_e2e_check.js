const http = require('http')
const fs = require('fs')
const path = require('path')

const base = process.env.E2E_BASE || 'http://127.0.0.1:3100'

function request(targetPath, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(targetPath, base)
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers,
    }
    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        let parsed = null
        try {
          parsed = data ? JSON.parse(data) : null
        } catch (error) {
          parsed = { parseError: error.message, raw: data }
        }
        resolve({ status: res.statusCode, body: parsed, raw: data })
      })
    })
    req.on('error', reject)
    if (body !== undefined) {
      req.write(JSON.stringify(body))
    }
    req.end()
  })
}

function score(item) {
  return Number(item?.score || 0)
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

async function main() {
  const report = { A: {}, B: {}, C: {}, meta: {} }

  const studentsResp = await request('/api/students')
  const students = (studentsResp.body && studentsResp.body.list) || []
  const sHigh = students.find((s) => String(s.currentRecognitionLevel || '').includes('特别困难')) || students[0]
  const sMid = students.find((s) => String(s.currentRecognitionLevel || '').trim() === '困难') || students[1] || students[0]
  const sNone = students.find((s) => String(s.currentRecognitionLevel || '') === '未认定') || students[2] || students[0]

  report.meta.students = {
    high: sHigh ? { id: sHigh.id, name: sHigh.name, level: sHigh.currentRecognitionLevel } : null,
    mid: sMid ? { id: sMid.id, name: sMid.name, level: sMid.currentRecognitionLevel } : null,
    none: sNone ? { id: sNone.id, name: sNone.name, level: sNone.currentRecognitionLevel } : null,
  }

  async function getRecommendations(studentId, limit = 6) {
    return request(`/api/recommendations?limit=${limit}`, { headers: { 'x-student-id': studentId } })
  }

  async function getScholarshipDetail(studentId, id) {
    return request(`/api/scholarships/${id}`, { headers: { 'x-student-id': studentId } })
  }

  async function getDeadlineReminders(studentId, hourWindow = 720) {
    return request(`/api/deadline-reminders?hourWindow=${hourWindow}`, {
      headers: { 'x-student-id': studentId },
    })
  }

  async function getScholarshipList() {
    const response = await request('/api/scholarships')
    return response.body?.list || []
  }

  async function updateScholarship(id, payload) {
    return request(`/api/scholarships/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    })
  }

  async function ensureDeadlineOverlap(studentId, candidateScholarshipIds = []) {
    const existingStudent = await getDeadlineReminders(studentId, 720)
    const existingTeacher = await request('/api/teacher/deadline-reminders')
    let overlap = (existingStudent.body?.list || []).find((item) => (existingTeacher.body?.list || []).some((entry) => entry.id === item.id))
    if (overlap) {
      return {
        overlap,
        studentList: existingStudent.body?.list || [],
        teacherList: existingTeacher.body?.list || [],
        seeded: false,
      }
    }

    const scholarshipList = await getScholarshipList()
    const scholarshipMap = scholarshipList.reduce((acc, item) => {
      acc[item.id] = item
      return acc
    }, {})
    const tryIds = Array.from(new Set(candidateScholarshipIds)).filter(Boolean)
    const nearDate = new Date(Date.now() + 24 * 3600 * 1000)
    const nearDateText = `${nearDate.getFullYear()}-${String(nearDate.getMonth() + 1).padStart(2, '0')}-${String(nearDate.getDate()).padStart(2, '0')}`

    for (const scholarshipId of tryIds.slice(0, 10)) {
      const original = scholarshipMap[scholarshipId]
      if (!original) {
        continue
      }
      await updateScholarship(scholarshipId, {
        name: original.name,
        amountText: original.amountText,
        amountMode: original.amountMode,
        amountTiers: original.amountTiers,
        restrictionNote: original.restrictionNote,
        allowedRecognitionRuleIds: original.allowedRecognitionRuleIds,
        openForApply: true,
        deadline: nearDateText,
        guide: original.guide,
      })
      const studentDeadline = await getDeadlineReminders(studentId, 720)
      const teacherDeadline = await request('/api/teacher/deadline-reminders')
      overlap = (studentDeadline.body?.list || []).find((item) => (teacherDeadline.body?.list || []).some((entry) => entry.id === item.id))
      if (overlap) {
        return {
          overlap,
          studentList: studentDeadline.body?.list || [],
          teacherList: teacherDeadline.body?.list || [],
          seeded: true,
          seededScholarshipId: scholarshipId,
        }
      }
    }

    return {
      overlap: null,
      studentList: existingStudent.body?.list || [],
      teacherList: existingTeacher.body?.list || [],
      seeded: false,
    }
  }

  async function findAlternativeDetail(studentId, preferredIds = []) {
    for (const id of preferredIds) {
      const detail = await getScholarshipDetail(studentId, id)
      if (detail.status === 200 && detail.body?.showAlternativeRecommendations) {
        return { detail, scholarshipId: id, from: 'preferred' }
      }
    }
    const allScholarshipsResp = await request('/api/scholarships')
    const allScholarships = allScholarshipsResp.body?.list || []
    for (const item of allScholarships.slice(0, 20)) {
      const detail = await getScholarshipDetail(studentId, item.id)
      if (detail.status === 200 && detail.body?.showAlternativeRecommendations) {
        return { detail, scholarshipId: item.id, from: 'fallback-all' }
      }
    }
    return null
  }

  const recResp = await getRecommendations(sHigh.id, 6)
  const recList = recResp.body?.list || []
  const a1 = {
    status: recResp.status,
    top6: recList.length,
    allHaveScore: recList.every((item) => Number.isFinite(score(item))),
    allHaveAiReason: recList.every((item) => hasText(item.aiReason)),
    consistentCount: 0,
    sampled: recList.slice(0, 3).map((item) => ({ id: item.id, name: item.name, score: item.score, fitBucket: item.fitBucket })),
    ok: false,
  }

  for (const item of recList.slice(0, 3)) {
    const detail = await getScholarshipDetail(sHigh.id, item.id)
    const recommendation = detail.body?.recommendation || {}
    const sameScore = Number(recommendation.score || 0) === Number(item.score || 0)
    const sameLevel = String(recommendation.matchLevel || '') === String(item.matchLevel || '')
    const sameReason = String(recommendation.aiReason || '').trim() === String(item.aiReason || '').trim()
    if (sameScore && sameLevel && sameReason) {
      a1.consistentCount += 1
    }
  }

  a1.ok = recResp.status === 200 && a1.top6 === 6 && a1.allHaveScore && a1.allHaveAiReason && a1.consistentCount >= Math.min(3, recList.length)
  report.A.A1 = a1

  let a2Detail = null
  let a2ScholarshipId = ''
  for (const item of recList) {
    if (String(item.fitBucket || '') === 'low' || String(item.matchLevel || '') === '待提升') {
      const detail = await getScholarshipDetail(sHigh.id, item.id)
      if (detail.status === 200) {
        a2Detail = detail.body
        a2ScholarshipId = item.id
        break
      }
    }
  }
  if (!a2Detail) {
    for (const item of recList) {
      const detail = await getScholarshipDetail(sHigh.id, item.id)
      if (detail.status === 200 && detail.body?.eligibility?.eligible === false) {
        a2Detail = detail.body
        a2ScholarshipId = item.id
        break
      }
    }
  }
  if (!a2Detail) {
    const fallbackA2 = await findAlternativeDetail(sMid.id, recList.map((item) => item.id))
    if (fallbackA2) {
      a2Detail = fallbackA2.detail.body
      a2ScholarshipId = fallbackA2.scholarshipId
    }
  }

  const a2List = a2Detail?.alternativeRecommendations || []
  report.A.A2 = {
    scholarshipId: a2ScholarshipId,
    showAlternativeRecommendations: Boolean(a2Detail?.showAlternativeRecommendations),
    alternativeCount: a2List.length,
    allHaveFallbackReason: a2List.every((item) => hasText(item.fallbackReason || item.reason || '')),
    allHaveFitAdvice: a2List.every((item) => hasText(item.fitAdvice || '')),
    ok: Boolean(a2Detail?.showAlternativeRecommendations) && a2List.length > 0,
  }

  const draftResp = await request('/api/material-drafts', {
    method: 'POST',
    headers: {
      'x-student-id': sMid.id,
      'Content-Type': 'application/json',
    },
    body: {
      scholarshipId: recList[0]?.id || '',
      intro: '我来自农村家庭，平时成绩中等，想申请补助减轻压力。',
      familyInfo: '父母务农，收入不稳定。',
      goal: '用于学费与基本生活开支。',
      providedMaterials: ['身份证', '成绩单'],
    },
  })

  const draft = draftResp.body?.draft || {}
  const byPriority = draft.missingMaterialsByPriority || {}
  report.A.A3 = {
    status: draftResp.status,
    hasDraftText: hasText(draft.draftText),
    hasRequiredList: Array.isArray(byPriority.required),
    hasRecommendedList: Array.isArray(byPriority.recommended),
    hasNextAction: hasText(draft.nextAction),
    ok: draftResp.status === 200 && hasText(draft.draftText) && Array.isArray(byPriority.required) && Array.isArray(byPriority.recommended) && hasText(draft.nextAction),
  }

  const deadlineResult = await ensureDeadlineOverlap(sMid.id, recList.map((item) => item.id))

  report.A.A4 = {
    studentCount: deadlineResult.studentList.length,
    teacherCount: deadlineResult.teacherList.length,
    overlapFound: Boolean(deadlineResult.overlap),
    overlapFrom: 'mid',
    seededForTest: Boolean(deadlineResult.seeded),
    seededScholarshipId: deadlineResult.seededScholarshipId || '',
    sampleStatusFlow: deadlineResult.overlap ? deadlineResult.overlap.status : null,
    ok: Boolean(deadlineResult.overlap),
  }

  const growthResp = await request('/api/growth-tree', { headers: { 'x-student-id': sHigh.id } })
  const tree = growthResp.body?.tree || {}
  report.A.A5 = {
    status: growthResp.status,
    hasStage: !!tree.stage,
    hasNextStageHint: hasText(tree.nextStageHint || ''),
    hasRecentEvents: Array.isArray(tree.events),
    ok: growthResp.status === 200 && !!tree.stage && hasText(tree.nextStageHint || ''),
  }

  const mediumEvent = await request('/api/emotion-events', {
    method: 'POST',
    headers: {
      'x-student-id': sMid.id,
      'Content-Type': 'application/json',
    },
    body: {
      channel: 'ai-chat',
      content: '最近压力很大，总是失眠，感觉快撑不住了。',
    },
  })

  const highEvent = await request('/api/emotion-events', {
    method: 'POST',
    headers: {
      'x-student-id': sMid.id,
      'Content-Type': 'application/json',
    },
    body: {
      channel: 'ai-chat',
      content: '我真的不想活了，甚至有自残冲动。',
    },
  })

  const mediumLevel = mediumEvent.body?.event?.levelCode
  const highLevel = highEvent.body?.event?.levelCode
  report.A.A6 = {
    mediumLevel,
    highLevel,
    mediumSuggestion: mediumEvent.body?.event?.suggestion || '',
    highSuggestion: highEvent.body?.event?.suggestion || '',
    ok: mediumEvent.status === 200 && highEvent.status === 200 && (mediumLevel === 'medium' || mediumLevel === 'high') && highLevel === 'high',
  }

  const dashboard = await request('/api/teacher/dashboard')
  const analytics = await request('/api/teacher/scholarship-analytics')
  const dashboardBody = dashboard.body || {}
  const analyticsBody = analytics.body || {}

  report.B.B1 = {
    dashboardStatus: dashboard.status,
    analyticsStatus: analytics.status,
    hasFunnelMetrics: !!dashboardBody.scholarshipAnalytics?.metrics,
    directAnalyticsMetrics: !!analyticsBody.metrics,
    clickRateInBoth: hasText(dashboardBody.scholarshipAnalytics?.metrics?.clickToApplyRate || '') && hasText(analyticsBody.metrics?.clickToApplyRate || ''),
    ok: dashboard.status === 200 && analytics.status === 200 && !!dashboardBody.scholarshipAnalytics?.metrics && !!analyticsBody.metrics,
  }

  const outreach = await request('/api/teacher/outreach-reminders')
  const outreachList = outreach.body?.list || []
  report.B.B2 = {
    status: outreach.status,
    count: outreachList.length,
    hasRecommendationField: outreachList.every((item) => hasText(item.recommendation || '')),
    ok: outreach.status === 200,
  }

  const trend = await request('/api/teacher/psychology-trend')
  const trendBody = trend.body || {}
  const latestMarkers = trendBody.latestMarkers || []
  let hasChat = latestMarkers.some((item) => item.markerType === 'chat')
  let hasAssessment = latestMarkers.some((item) => item.markerType === 'assessment')

  if (!hasAssessment) {
    await request('/api/emotion-events', {
      method: 'POST',
      headers: {
        'x-student-id': sMid.id,
        'Content-Type': 'application/json',
      },
      body: {
        channel: 'assessment-self-check',
        content: '量表自评：SDS（标准分59）',
      },
    })
    const trendAfterAssessment = await request('/api/teacher/psychology-trend')
    const latestAfterAssessment = trendAfterAssessment.body?.latestMarkers || []
    hasChat = latestAfterAssessment.some((item) => item.markerType === 'chat')
    hasAssessment = latestAfterAssessment.some((item) => item.markerType === 'assessment')
    if (trendAfterAssessment.status === 200) {
      trendBody.latestMarkers = latestAfterAssessment
      trendBody.markerTrend = trendAfterAssessment.body?.markerTrend || trendBody.markerTrend
      trendBody.studentCurves = trendAfterAssessment.body?.studentCurves || trendBody.studentCurves
    }
  }

  const curvesOk = (trendBody.studentCurves || []).every((curve) => (Array.isArray(curve.points) ? curve.points.length <= 12 : true))

  report.B.B3 = {
    status: trend.status,
    hasChatMarker: hasChat,
    hasAssessmentMarker: hasAssessment,
    hasMarkerTrend: Array.isArray(trendBody.markerTrend),
    curvePointsAtMost12: curvesOk,
    ok: trend.status === 200 && hasChat && hasAssessment && Array.isArray(trendBody.markerTrend) && curvesOk,
  }

  const care = await request('/api/teacher/care-alerts')
  const careList = care.body?.list || []
  const noContent = careList.every((item) => !item.content)
  const allSummary = careList.every((item) => hasText(item.summaryHint || ''))

  report.B.B4 = {
    status: care.status,
    noRawContent: noContent,
    allHaveSummaryHint: allSummary,
    hasRiskTags: careList.some((item) => Array.isArray(item.riskTags) && item.riskTags.length > 0),
    ok: care.status === 200 && noContent && allSummary,
  }

  const month = await request('/api/teacher/monthly-report')
  const metrics = month.body?.metrics || {}
  report.B.B5 = {
    status: month.status,
    hasTotalAlerts: Number.isFinite(Number(metrics.totalAlerts)),
    hasHandledAlerts: Number.isFinite(Number(metrics.handledAlerts)),
    hasAverageHandleHours: Number.isFinite(Number(metrics.averageHandleHours)),
    hasInsight: !!month.body?.insight,
    ok: month.status === 200 && Number.isFinite(Number(metrics.totalAlerts)) && Number.isFinite(Number(metrics.handledAlerts)) && Number.isFinite(Number(metrics.averageHandleHours)) && !!month.body?.insight,
  }

  report.C.C1 = {
    basedOnB4: report.B.B4.noRawContent,
    ok: report.B.B4.noRawContent,
  }

  const targets = [
    'policy-detail/policy-detail.wxml',
    'ai-evaluate/ai-evaluate.wxml',
    'mine/mine.wxml',
    'college-scholar/college-scholar.wxml',
  ]
  const root = 'D:/javaApp/xiaojintong/miniprogram/pages'
  const matchedFiles = []
  for (const relPath of targets) {
    const filePath = path.join(root, relPath)
    const text = fs.readFileSync(filePath, 'utf8')
    if (text.includes('贫困')) {
      matchedFiles.push(relPath)
    }
  }

  report.C.C2 = {
    scanned: targets,
    matchedFiles,
    ok: matchedFiles.length === 0,
  }

  const detailNoStudent = await request(`/api/scholarships/${recList[0]?.id || ''}`)
  const detailWithStudent = await getScholarshipDetail(sHigh.id, recList[0]?.id || '')
  report.C.C3 = {
    noStudentStatus: detailNoStudent.status,
    withStudentStatus: detailWithStudent.status,
    recommendationOptionalPresent: detailWithStudent.status === 200 ? ('recommendation' in (detailWithStudent.body || {})) : false,
    alternativeOptionalPresent: detailWithStudent.status === 200 ? ('showAlternativeRecommendations' in (detailWithStudent.body || {})) : false,
    draftOptionalPresent: draftResp.status === 200 ? ('missingMaterialsByPriority' in draft && 'nextAction' in draft) : false,
    ok: detailNoStudent.status === 200 && detailWithStudent.status === 200,
  }

  const flat = []
  for (const section of ['A', 'B', 'C']) {
    for (const [key, value] of Object.entries(report[section])) {
      flat.push({ key: `${section}.${key}`, ok: Boolean(value.ok) })
    }
  }

  report.meta.passCount = flat.filter((item) => item.ok).length
  report.meta.totalCount = flat.length
  report.meta.failed = flat.filter((item) => !item.ok).map((item) => item.key)

  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => {
  console.error('E2E script failed:', error && error.stack ? error.stack : error)
  process.exit(1)
})
