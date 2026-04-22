import { getCurrentStudentId, redirectToStudentLogin } from './storage'

const API_BASE_STORAGE_KEY = 'xjt_api_base_url'
const DEFAULT_API_BASE_URL = 'https://ynyt.nat100.top'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

interface RequestOptions {
  url: string
  method?: HttpMethod
  data?: unknown
}

export interface StreamRequestOptions extends RequestOptions {
  onChunk?: (payload: unknown) => void
}

export class ApiRequestError extends Error {
  statusCode: number
  payload: unknown

  constructor(message: string, statusCode: number, payload: unknown = null) {
    super(message)
    this.name = 'ApiRequestError'
    this.statusCode = statusCode
    this.payload = payload
  }
}

function normalizeBaseUrl(rawValue: unknown): string {
  const baseUrl = typeof rawValue === 'string' ? rawValue.trim() : ''
  return (baseUrl || DEFAULT_API_BASE_URL).replace(/\/+$/, '')
}

export function getApiBaseUrl(): string {
  return normalizeBaseUrl(wx.getStorageSync(API_BASE_STORAGE_KEY))
}

export function resolveStaticUrl(pathname: string): string {
  const safePath = String(pathname || '').trim()
  if (!safePath) {
    return ''
  }
  if (/^https?:\/\//i.test(safePath) || /^data:/i.test(safePath)) {
    return safePath
  }
  if (!safePath.startsWith('/')) {
    return ''
  }
  return `${getApiBaseUrl()}${safePath}`
}

export function request<T>(options: RequestOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    const currentStudentId = getCurrentStudentId()
    if (currentStudentId) {
      headers['X-Student-Id'] = currentStudentId
    }
    wx.request({
      url: `${getApiBaseUrl()}${options.url}`,
      method: options.method || 'GET',
      data: options.data as WechatMiniprogram.IAnyObject,
      header: headers,
      success: (response: WechatMiniprogram.RequestSuccessCallbackResult) => {
        const statusCode = Number(response.statusCode || 0)
        if (statusCode >= 200 && statusCode < 300) {
          resolve(response.data as T)
          return
        }
        const payload = response.data as { message?: unknown }
        const message = typeof payload.message === 'string' && payload.message ? payload.message : '请求失败'
        if (statusCode === 401) {
          redirectToStudentLogin(message)
        }
        reject(new ApiRequestError(message, statusCode, response.data))
      },
      fail: (error: WechatMiniprogram.GeneralCallbackResult) => {
        reject(new ApiRequestError(error.errMsg || '网络请求失败', 0, null))
      },
    })
  })
}

export function requestStream<T>(options: StreamRequestOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    const currentStudentId = getCurrentStudentId()
    if (currentStudentId) {
      headers['X-Student-Id'] = currentStudentId
    }

    let settled = false
    let finalPayload: unknown = null
    let bytesBuffer = new Uint8Array(0)

    const emitPayload = (rawData: string) => {
      const lines = rawData.split(/\r?\n/)
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) {
          continue
        }
        const jsonText = trimmed.slice(5).trim()
        if (!jsonText || jsonText === '[DONE]') {
          continue
        }
        try {
          const payload = JSON.parse(jsonText) as Record<string, unknown>
          const eventType = typeof payload.type === 'string' ? payload.type : ''
          if (eventType === 'done' || eventType === 'error') {
            finalPayload = payload
          }
          if (options.onChunk) {
            options.onChunk(payload)
          }
        } catch (_error) {
          // Ignore malformed chunk payloads to avoid interrupting stream rendering.
        }
      }
    }

    const decodeChunkText = (bytes: Uint8Array): string => {
      try {
        const encoded = Array.from(bytes)
          .map((byte) => `%${byte.toString(16).padStart(2, '0')}`)
          .join('')
        return decodeURIComponent(encoded)
      } catch (_error) {
        try {
          return Array.from(bytes)
            .map((code) => String.fromCharCode(code))
            .join('')
        } catch (__error) {
          return ''
        }
      }
    }

    const appendChunkBytes = (chunkBytes: Uint8Array) => {
      if (chunkBytes.length === 0) {
        return
      }
      const merged = new Uint8Array(bytesBuffer.length + chunkBytes.length)
      merged.set(bytesBuffer, 0)
      merged.set(chunkBytes, bytesBuffer.length)
      bytesBuffer = merged
    }

    const flushSseSegments = (flushRemainder = false) => {
      let start = 0
      let index = 0

      while (index < bytesBuffer.length) {
        let delimiterWidth = 0
        if (index + 1 < bytesBuffer.length && bytesBuffer[index] === 10 && bytesBuffer[index + 1] === 10) {
          delimiterWidth = 2
        } else if (
          index + 3 < bytesBuffer.length &&
          bytesBuffer[index] === 13 &&
          bytesBuffer[index + 1] === 10 &&
          bytesBuffer[index + 2] === 13 &&
          bytesBuffer[index + 3] === 10
        ) {
          delimiterWidth = 4
        }

        if (!delimiterWidth) {
          index += 1
          continue
        }

        const segment = bytesBuffer.slice(start, index)
        if (segment.length > 0) {
          emitPayload(decodeChunkText(segment))
        }
        start = index + delimiterWidth
        index = start
      }

      if (flushRemainder && start < bytesBuffer.length) {
        emitPayload(decodeChunkText(bytesBuffer.slice(start)))
        bytesBuffer = new Uint8Array(0)
        return
      }

      bytesBuffer = bytesBuffer.slice(start)
    }

    const requestOptions: WechatMiniprogram.RequestOption<WechatMiniprogram.IAnyObject> & {
      enableChunked?: boolean
    } = {
      url: `${getApiBaseUrl()}${options.url}`,
      method: options.method || 'GET',
      data: options.data as WechatMiniprogram.IAnyObject,
      responseType: 'text',
      enableChunked: true,
      header: headers,
      success: (response: WechatMiniprogram.RequestSuccessCallbackResult) => {
        if (settled) {
          return
        }
        settled = true

        const statusCode = Number(response.statusCode || 0)
        if (statusCode < 200 || statusCode >= 300) {
          const payload = response.data as { message?: unknown }
          const message = typeof payload?.message === 'string' && payload.message ? payload.message : '流式请求失败'
          if (statusCode === 401) {
            redirectToStudentLogin(message)
          }
          reject(new ApiRequestError(message, statusCode, response.data))
          return
        }

        flushSseSegments(true)

        if (typeof response.data === 'string' && response.data.trim()) {
          emitPayload(response.data)
        }

        if (response.data instanceof ArrayBuffer && response.data.byteLength > 0) {
          appendChunkBytes(new Uint8Array(response.data))
          flushSseSegments(true)
        }

        resolve((finalPayload ?? response.data) as T)
      },
      fail: (error: WechatMiniprogram.GeneralCallbackResult) => {
        if (settled) {
          return
        }
        settled = true
        reject(new ApiRequestError(error.errMsg || '网络请求失败', 0, null))
      },
    }

    const task = wx.request(requestOptions)

    const streamTask = task as WechatMiniprogram.RequestTask & {
      onChunkReceived?: (callback: (chunkResult: { data: ArrayBuffer }) => void) => void
    }

    streamTask.onChunkReceived?.((chunkResult) => {
      if (settled) {
        return
      }
      appendChunkBytes(new Uint8Array(chunkResult.data))
      flushSseSegments(false)
    })
  })
}

export function showRequestError(error: unknown, fallback = '请求失败，请确认本地 Mock API 已启动'): void {
  const message = error instanceof Error && error.message ? error.message : fallback
  wx.showToast({
    title: message.slice(0, 20),
    icon: 'none',
  })
}
