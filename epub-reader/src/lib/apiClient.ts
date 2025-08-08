import axios, { 
  AxiosInstance, 
  AxiosRequestConfig, 
  AxiosResponse, 
  AxiosError,
  InternalAxiosRequestConfig
} from 'axios'
import { 
  ApiResponse, 
  ErrorType, 
  ErrorCode, 
  ErrorContext 
} from '../types'
import { 
  AppError, 
  getGlobalErrorHandler, 
  createAppErrorFromCode 
} from '../services/errorHandler'
import { apiLogger } from '../services/apiLogger'

// Network status detection
class NetworkStatusDetector {
  private isOnline = true
  private listeners: Array<(online: boolean) => void> = []

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine
      
      window.addEventListener('online', () => {
        this.isOnline = true
        this.notifyListeners(true)
      })
      
      window.addEventListener('offline', () => {
        this.isOnline = false
        this.notifyListeners(false)
      })
    }
  }

  getStatus(): boolean {
    return this.isOnline
  }

  onStatusChange(callback: (online: boolean) => void): () => void {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback)
    }
  }

  private notifyListeners(online: boolean): void {
    this.listeners.forEach(listener => listener(online))
  }
}

// Request retry configuration
interface RetryConfig {
  retries: number
  retryDelay: number
  retryCondition?: (error: AxiosError) => boolean
  exponentialBackoff?: boolean
  maxRetryDelay?: number
}

// API client configuration
interface ApiClientConfig {
  baseURL?: string
  timeout?: number
  retryConfig?: RetryConfig
  enableLogging?: boolean
  enableOfflineMode?: boolean
  authTokenProvider?: () => Promise<string | null>
}

// Request metadata for logging and error reporting
interface RequestMetadata {
  requestId: string
  startTime: number
  url: string
  method: string
  retryCount: number
}

export class ApiClient {
  private axiosInstance: AxiosInstance
  private networkDetector: NetworkStatusDetector
  private retryConfig: RetryConfig
  private enableLogging: boolean
  private enableOfflineMode: boolean
  private authTokenProvider?: () => Promise<string | null>
  private requestMetadata = new Map<string, RequestMetadata>()

  constructor(config: ApiClientConfig = {}) {
    this.networkDetector = new NetworkStatusDetector()
    this.enableLogging = config.enableLogging ?? process.env.NODE_ENV === 'development'
    this.enableOfflineMode = config.enableOfflineMode ?? true
    this.authTokenProvider = config.authTokenProvider

    this.retryConfig = {
      retries: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
      maxRetryDelay: 10000,
      retryCondition: this.defaultRetryCondition,
      ...config.retryConfig
    }

    this.axiosInstance = axios.create({
      baseURL: config.baseURL || '/api',
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.setupInterceptors()
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // Generate request ID for tracking
        const requestId = this.generateRequestId()
        config.metadata = { requestId, retryCount: 0 }

        // Store request metadata
        this.requestMetadata.set(requestId, {
          requestId,
          startTime: Date.now(),
          url: config.url || '',
          method: config.method || 'GET',
          retryCount: 0
        })

        // Add authentication token
        if (this.authTokenProvider) {
          try {
            const token = await this.authTokenProvider()
            if (token) {
              config.headers.Authorization = `Bearer ${token}`
            }
          } catch (error) {
            console.warn('Failed to get auth token:', error)
          }
        }

        // Check network status
        if (!this.networkDetector.getStatus()) {
          if (this.enableOfflineMode) {
            // Try to serve from cache or return cached response
            const cachedResponse = await this.getCachedResponse(config)
            if (cachedResponse) {
              return Promise.reject(new AppError(
                'Using cached response (offline)',
                ErrorCode.NETWORK_ERROR,
                ErrorType.NETWORK,
                200,
                true,
                false
              ))
            }
          }
          
          return Promise.reject(new AppError(
            'No internet connection',
            ErrorCode.NETWORK_ERROR,
            ErrorType.NETWORK,
            0,
            true,
            true
          ))
        }

        // Log request
        apiLogger.logRequest({
          method: config.method?.toUpperCase() || 'UNKNOWN',
          url: config.url || '',
          requestSize: config.data ? JSON.stringify(config.data).length : 0,
          userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
          metadata: {
            requestId,
            headers: config.headers
          }
        })

        if (this.enableLogging) {
          console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
            requestId,
            headers: config.headers,
            data: config.data
          })
        }

        // Add breadcrumb
        getGlobalErrorHandler().addBreadcrumb(
          `API Request: ${config.method?.toUpperCase()} ${config.url}`,
          'http',
          'info'
        )

        return config
      },
      (error) => {
        return Promise.reject(this.handleRequestError(error))
      }
    )

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        const requestId = response.config.metadata?.requestId
        const metadata = requestId ? this.requestMetadata.get(requestId) : null

        if (metadata) {
          const duration = Date.now() - metadata.startTime
          const responseSize = response.data ? JSON.stringify(response.data).length : 0
          
          // Log successful response
          apiLogger.logResponse(
            requestId,
            response.status,
            duration,
            responseSize,
            {
              contentType: response.headers['content-type'],
              cacheControl: response.headers['cache-control']
            }
          )

          if (this.enableLogging) {
            console.log(`[API] ${response.status} ${metadata.method} ${metadata.url}`, {
              requestId,
              duration,
              status: response.status,
              data: response.data
            })
          }

          // Add breadcrumb
          getGlobalErrorHandler().addBreadcrumb(
            `API Response: ${response.status} ${metadata.method} ${metadata.url} (${duration}ms)`,
            'http',
            'info'
          )

          // Clean up metadata
          this.requestMetadata.delete(requestId)
        }

        return response
      },
      async (error: AxiosError) => {
        return this.handleResponseError(error)
      }
    )
  }

  private async handleResponseError(error: AxiosError): Promise<never> {
    const requestId = error.config?.metadata?.requestId
    const metadata = requestId ? this.requestMetadata.get(requestId) : null
    
    // Increment retry count
    if (metadata) {
      metadata.retryCount++
    }

    // Check if we should retry
    if (this.shouldRetry(error, metadata?.retryCount || 0)) {
      return this.retryRequest(error)
    }

    // Clean up metadata
    if (requestId) {
      this.requestMetadata.delete(requestId)
    }

    // Convert to AppError and handle
    const appError = this.convertToAppError(error)
    const duration = metadata ? Date.now() - metadata.startTime : 0
    
    // Log error
    if (requestId) {
      apiLogger.logError(
        requestId,
        appError.toJSON(),
        duration,
        {
          responseData: error.response?.data,
          responseHeaders: error.response?.headers
        }
      )
    }

    if (this.enableLogging) {
      console.error(`[API] ${error.response?.status || 'ERR'} ${metadata?.method || 'UNKNOWN'} ${metadata?.url || 'UNKNOWN'}`, {
        requestId,
        duration,
        error: appError.toJSON(),
        response: error.response?.data
      })
    }

    // Add breadcrumb
    getGlobalErrorHandler().addBreadcrumb(
      `API Error: ${error.response?.status || 'ERR'} ${metadata?.method || 'UNKNOWN'} ${metadata?.url || 'UNKNOWN'}`,
      'http',
      'error'
    )

    // Handle error through global error handler
    const context: ErrorContext = {
      component: 'ApiClient',
      action: 'handleResponseError',
      timestamp: new Date().toISOString(),
      metadata: {
        requestId,
        url: metadata?.url,
        method: metadata?.method,
        retryCount: metadata?.retryCount,
        status: error.response?.status,
        statusText: error.response?.statusText
      }
    }

    await getGlobalErrorHandler().handleError(appError, context)
    
    return Promise.reject(appError)
  }

  private handleRequestError(error: any): AppError {
    return new AppError(
      error.message || 'Request configuration error',
      ErrorCode.INVALID_INPUT,
      ErrorType.VALIDATION,
      400,
      true,
      false
    )
  }

  private shouldRetry(error: AxiosError, retryCount: number): boolean {
    if (retryCount >= this.retryConfig.retries) {
      return false
    }

    if (this.retryConfig.retryCondition) {
      return this.retryConfig.retryCondition(error)
    }

    return this.defaultRetryCondition(error)
  }

  private defaultRetryCondition(error: AxiosError): boolean {
    // Don't retry client errors (4xx) except for specific cases
    if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
      // Retry on rate limiting and authentication errors
      return [401, 408, 429].includes(error.response.status)
    }

    // Retry on network errors, timeouts, and server errors (5xx)
    return (
      !error.response || // Network error
      error.code === 'ECONNABORTED' || // Timeout
      error.code === 'ENOTFOUND' || // DNS error
      error.code === 'ECONNREFUSED' || // Connection refused
      (error.response.status >= 500) // Server error
    )
  }

  private async retryRequest(error: AxiosError): Promise<AxiosResponse> {
    const requestId = error.config?.metadata?.requestId
    const metadata = requestId ? this.requestMetadata.get(requestId) : null
    const retryCount = metadata?.retryCount || 0

    // Calculate delay with exponential backoff
    let delay = this.retryConfig.retryDelay
    if (this.retryConfig.exponentialBackoff) {
      delay = Math.min(
        this.retryConfig.retryDelay * Math.pow(2, retryCount - 1),
        this.retryConfig.maxRetryDelay || 10000
      )
    }

    // Add jitter to prevent thundering herd
    delay += Math.random() * 1000

    // Log retry attempt
    if (this.enableLogging) {
      console.log(`[API] Retrying request (attempt ${retryCount}/${this.retryConfig.retries}) after ${delay}ms`, {
        requestId,
        url: metadata?.url,
        method: metadata?.method
      })
    }

    // Add breadcrumb
    getGlobalErrorHandler().addBreadcrumb(
      `API Retry: Attempt ${retryCount}/${this.retryConfig.retries} for ${metadata?.method} ${metadata?.url}`,
      'http',
      'info'
    )

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, delay))

    // Update retry count in config
    if (error.config) {
      error.config.metadata = { 
        ...error.config.metadata, 
        retryCount 
      }
    }

    // Retry the request
    return this.axiosInstance.request(error.config!)
  }

  private convertToAppError(error: AxiosError): AppError {
    // Handle network errors
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        return createAppErrorFromCode(ErrorCode.TIMEOUT_ERROR, 'Request timeout')
      }
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return createAppErrorFromCode(ErrorCode.CONNECTION_REFUSED, 'Connection failed')
      }
      return createAppErrorFromCode(ErrorCode.NETWORK_ERROR, error.message)
    }

    // Handle HTTP errors based on status code
    const status = error.response.status
    const data = error.response.data

    let code: ErrorCode
    let type: ErrorType

    switch (status) {
      case 400:
        code = ErrorCode.INVALID_INPUT
        type = ErrorType.VALIDATION
        break
      case 401:
        code = ErrorCode.UNAUTHORIZED
        type = ErrorType.AUTHENTICATION
        break
      case 403:
        code = ErrorCode.FORBIDDEN
        type = ErrorType.AUTHORIZATION
        break
      case 404:
        code = ErrorCode.RECORD_NOT_FOUND
        type = ErrorType.DATABASE
        break
      case 408:
        code = ErrorCode.TIMEOUT_ERROR
        type = ErrorType.TIMEOUT
        break
      case 409:
        code = ErrorCode.DUPLICATE_ENTRY
        type = ErrorType.DATABASE
        break
      case 413:
        code = ErrorCode.FILE_TOO_LARGE
        type = ErrorType.FILE_PROCESSING
        break
      case 422:
        code = ErrorCode.INVALID_FORMAT
        type = ErrorType.VALIDATION
        break
      case 429:
        code = ErrorCode.RATE_LIMIT_EXCEEDED
        type = ErrorType.RATE_LIMIT
        break
      case 500:
        code = ErrorCode.INTERNAL_SERVER_ERROR
        type = ErrorType.UNKNOWN
        break
      case 502:
      case 503:
      case 504:
        code = ErrorCode.SERVICE_UNAVAILABLE
        type = ErrorType.UNKNOWN
        break
      default:
        code = ErrorCode.UNKNOWN_ERROR
        type = ErrorType.UNKNOWN
    }

    const message = data?.message || data?.error || error.message || `HTTP ${status} Error`

    return new AppError(
      message,
      code,
      type,
      status,
      true,
      this.defaultRetryCondition(error)
    )
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async getCachedResponse(config: InternalAxiosRequestConfig): Promise<AxiosResponse | null> {
    // Implement cache lookup logic here
    // This is a placeholder for offline mode functionality
    return null
  }

  // Public API methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.get<ApiResponse<T>>(url, config)
    return response.data
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.post<ApiResponse<T>>(url, data, config)
    return response.data
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.put<ApiResponse<T>>(url, data, config)
    return response.data
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.patch<ApiResponse<T>>(url, data, config)
    return response.data
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.delete<ApiResponse<T>>(url, config)
    return response.data
  }

  // File upload with progress tracking
  async uploadFile<T = any>(
    url: string, 
    file: File, 
    options?: {
      onProgress?: (progress: number) => void
      additionalData?: Record<string, any>
    }
  ): Promise<ApiResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)
    
    if (options?.additionalData) {
      Object.entries(options.additionalData).forEach(([key, value]) => {
        formData.append(key, JSON.stringify(value))
      })
    }

    const response = await this.axiosInstance.post<ApiResponse<T>>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (options?.onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          options.onProgress(progress)
        }
      }
    })

    return response.data
  }

  // Network status methods
  isOnline(): boolean {
    return this.networkDetector.getStatus()
  }

  onNetworkStatusChange(callback: (online: boolean) => void): () => void {
    return this.networkDetector.onStatusChange(callback)
  }

  // Configuration methods
  setAuthTokenProvider(provider: () => Promise<string | null>): void {
    this.authTokenProvider = provider
  }

  updateRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config }
  }

  // Debugging methods
  getRequestMetadata(): Map<string, RequestMetadata> {
    return new Map(this.requestMetadata)
  }

  clearRequestMetadata(): void {
    this.requestMetadata.clear()
  }
}

// Default API client instance
export const apiClient = new ApiClient({
  enableLogging: process.env.NODE_ENV === 'development',
  enableOfflineMode: true,
  retryConfig: {
    retries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
    maxRetryDelay: 10000
  }
})

// Utility function for handling API responses
export const handleApiResponse = async <T>(
  apiCall: () => Promise<ApiResponse<T>>,
  context?: Partial<ErrorContext>
): Promise<T> => {
  try {
    const response = await apiCall()
    
    if (!response.success) {
      throw new AppError(
        response.error || 'API call failed',
        ErrorCode.UNKNOWN_ERROR,
        ErrorType.UNKNOWN,
        500,
        true,
        true
      )
    }
    
    return response.data
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    
    // Handle unexpected errors
    const appError = new AppError(
      error instanceof Error ? error.message : 'Unknown API error',
      ErrorCode.UNKNOWN_ERROR,
      ErrorType.UNKNOWN,
      500,
      true,
      true
    )
    
    if (context) {
      await getGlobalErrorHandler().handleError(appError, {
        component: context.component || 'ApiClient',
        action: context.action || 'handleApiResponse',
        timestamp: new Date().toISOString(),
        ...context
      })
    }
    
    throw appError
  }
}

// Type augmentation for axios config
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      requestId: string
      retryCount: number
    }
  }
}