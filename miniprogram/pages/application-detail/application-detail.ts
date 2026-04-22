import { getApiBaseUrl, request, showRequestError } from '../../utils/api'
import { requireCurrentStudentSession } from '../../utils/storage'

export {}

interface LoadQuery {
  id?: string
}

interface ScholarshipAttachmentRecord {
  id: string
  name: string
  type: string
  size: number
  sizeLabel: string
  fileUrl?: string
  filePath?: string
  contentBase64?: string
}

interface ScholarshipApplySummary {
  personalIntro: string
  familySituation: string
  usagePlan: string
}

interface ScholarshipApplicationRecord {
  id: string
  scholarshipName: string
  scholarshipType: string
  academicYear: string
  status: string
  comment: string
  reviewComment: string
  submittedAt: string
  reviewedAt: string
  materials: string[]
  attachments: ScholarshipAttachmentRecord[]
  applySummary: ScholarshipApplySummary
  recognitionSnapshot: {
    level: string
    confirmedRecognitionLabels: string[]
  }
  eligibilityResult: {
    reason: string
    grantTier?: {
      label: string
      amount: string
    } | null
  }
}

function getSafeFileName(name: string): string {
  const safeName = String(name || '').replace(/[\\/:*?"<>|]/g, '_').trim()
  return safeName || `attachment-${Date.now()}`
}

function resolveAttachmentDownloadUrl(attachment: ScholarshipAttachmentRecord): string {
  const directUrl = String(attachment.fileUrl || attachment.filePath || '').trim()
  if (directUrl) {
    if (/^https?:\/\//i.test(directUrl) || /^data:/i.test(directUrl)) {
      return directUrl
    }
    if (directUrl.startsWith('/')) {
      return `${getApiBaseUrl()}${directUrl}`
    }
  }
  const contentBase64 = String(attachment.contentBase64 || '').trim()
  if (!contentBase64) {
    return ''
  }
  return `data:${attachment.type || 'application/octet-stream'};base64,${contentBase64}`
}

Page({
  data: {
    loading: true,
    record: null as ScholarshipApplicationRecord | null,
  },

  onLoad(query: LoadQuery) {
    if (!requireCurrentStudentSession('请先登录后查看申请详情')) {
      return
    }
    const recordId = typeof query.id === 'string' ? query.id : ''
    if (!recordId) {
      wx.showToast({ title: '未找到申请记录', icon: 'none' })
      return
    }
    this.loadDetail(recordId)
  },

  async loadDetail(recordId: string) {
    this.setData({ loading: true })
    try {
      const response = await request<{ record: ScholarshipApplicationRecord }>({
        url: `/api/scholarship-applications/${recordId}`,
      })
      const record = response.record
      this.setData({
        loading: false,
        record: {
          ...record,
          materials: Array.isArray(record.materials) ? record.materials : [],
          attachments: Array.isArray(record.attachments) ? record.attachments : [],
          applySummary: record.applySummary || {
            personalIntro: '',
            familySituation: '',
            usagePlan: '',
          },
        },
      })
    } catch (error) {
      this.setData({ loading: false })
      showRequestError(error)
    }
  },

  async onDownloadAttachment(event: WechatMiniprogram.TouchEvent) {
    const attachmentId = String(event.currentTarget.dataset.id || '')
    const record = this.data.record as ScholarshipApplicationRecord | null
    if (!record || !attachmentId) {
      return
    }
    const target = (record.attachments || []).find((item) => item.id === attachmentId)
    if (!target) {
      wx.showToast({
        title: '附件不存在',
        icon: 'none',
      })
      return
    }

    const directUrl = resolveAttachmentDownloadUrl(target)
    if (!directUrl) {
      wx.showToast({
        title: '附件内容不存在',
        icon: 'none',
      })
      return
    }

    if (/^https?:\/\//i.test(directUrl)) {
      wx.downloadFile({
        url: directUrl,
        success: (result) => {
          if (result.statusCode !== 200) {
            wx.showToast({
              title: '附件下载失败',
              icon: 'none',
            })
            return
          }
          wx.openDocument({
            filePath: result.tempFilePath,
            showMenu: true,
            fail: (err) => {
              showRequestError(new Error(err.errMsg || '附件打开失败'), '附件打开失败')
            },
          })
        },
        fail: (err) => {
          showRequestError(new Error(err.errMsg || '附件下载失败'), '附件下载失败')
        },
      })
      return
    }

    if (/^data:/i.test(directUrl)) {
      const rawBase64 = directUrl.split(',')[1] || ''
      if (!rawBase64) {
        wx.showToast({
          title: '附件内容不存在',
          icon: 'none',
        })
        return
      }
      const fs = wx.getFileSystemManager()
      const fileName = getSafeFileName(target.name)
      const filePath = `${wx.env.USER_DATA_PATH}/${Date.now()}-${fileName}`
      try {
        await new Promise<void>((resolve, reject) => {
          fs.writeFile({
            filePath,
            data: rawBase64,
            encoding: 'base64',
            success: () => resolve(),
            fail: (err) => reject(new Error(err.errMsg || '附件写入失败')),
          })
        })
        await new Promise<void>((resolve, reject) => {
          wx.openDocument({
            filePath,
            showMenu: true,
            success: () => resolve(),
            fail: (err) => reject(new Error(err.errMsg || '附件打开失败')),
          })
        })
      } catch (error) {
        showRequestError(error, '附件下载失败')
      }
      return
    }

    wx.showToast({
      title: '暂不支持该附件地址',
      icon: 'none',
    })
  },
})
