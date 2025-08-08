import { ErrorType, ErrorCode, ErrorContext, ErrorDetails, ApiError } from '../types'

export class AppError extends Error {
  public readonly type: ErrorType
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly context?: ErrorContext
  public readonly retryable: boolean
  public readonly timestamp: string

  constructor(
    message: string,
    code: ErrorCode,
    type: ErrorType = ErrorType.UNKNOWN,
    statusCode: number = 500,
    isOperational: boolean = true,
    retryable: boolean = false,
    context?: ErrorContext
  ) {
    super(message)
    this.name = 'AppError'
    this.type = type
    this.code = code
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.retryable = retryable
    this.context = context
    this.timestamp = new Date().toISOString()
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }

  toJSON(): ErrorDetails {
    return {
      type: this.type,
      code: this.code,
      message: this.message,
      context: this.context,
      stack: this.stack,
      retryable: this.retryable,
      statusCode: this.statusCode
    }
  }

  toApiError(): ApiError {
    return {
      type: this.type,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp,
      ...(this.retryable && { retryAfter: 5000 })
    }
  }
}

export interface ErrorAction {
  label: string
  action: () => void | Promise<void>
  primary?: boolean
}

export interface ErrorHandler {
  handleError(error: Error, context?: ErrorContext): Promise<void>
  reportError(error: Error, metadata?: Record<string, any>): Promise<void>
  showUserError(message: string, actions?: ErrorAction[]): void
  createAppError(message: string, code: ErrorCode, type?: ErrorType, statusCode?: number): AppError
  isRetryableError(error: Error): boolean
  shouldReportError(error: Error): boolean
}

export interface ErrorReportingService {
  report(error: ErrorDetails): Promise<void>
  reportBatch(errors: ErrorDetails[]): Promise<void>
  setUserContext(userId: string, metadata?: Record<string, any>): void
  addBreadcrumb(message: string, category?: string, level?: 'info' | 'warning' | 'error'): void
}

export const ERROR_MESSAGES = {
  // Network errors
  [ErrorCode.NETWORK_ERROR]: {
    title: 'Connection Problem',
    message: 'Please check your internet connection and try again.',
    actions: ['retry', 'offline-mode'],
    retryable: true
  },
  [ErrorCode.TIMEOUT_ERROR]: {
    title: 'Request Timeout',
    message: 'The request took too long to complete. Please try again.',
    actions: ['retry'],
    retryable: true
  },
  [ErrorCode.CONNECTION_REFUSED]: {
    title: 'Service Unavailable',
    message: 'Unable to connect to the service. Please try again later.',
    actions: ['retry', 'contact-support'],
    retryable: true
  },

  // Authentication errors
  [ErrorCode.INVALID_CREDENTIALS]: {
    title: 'Invalid Credentials',
    message: 'The email or password you entered is incorrect.',
    actions: ['retry', 'forgot-password'],
    retryable: false
  },
  [ErrorCode.TOKEN_EXPIRED]: {
    title: 'Session Expired',
    message: 'Your session has expired. Please log in again.',
    actions: ['login'],
    retryable: false
  },
  [ErrorCode.UNAUTHORIZED]: {
    title: 'Authentication Required',
    message: 'Please log in to continue.',
    actions: ['login', 'signup'],
    retryable: false
  },

  // Authorization errors
  [ErrorCode.FORBIDDEN]: {
    title: 'Access Denied',
    message: 'You do not have permission to perform this action.',
    actions: ['contact-support'],
    retryable: false
  },
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: {
    title: 'Insufficient Permissions',
    message: 'You need additional permissions to access this resource.',
    actions: ['contact-support'],
    retryable: false
  },

  // Validation errors
  [ErrorCode.INVALID_INPUT]: {
    title: 'Invalid Input',
    message: 'Please check your input and try again.',
    actions: ['retry'],
    retryable: false
  },
  [ErrorCode.MISSING_REQUIRED_FIELD]: {
    title: 'Missing Required Information',
    message: 'Please fill in all required fields.',
    actions: ['retry'],
    retryable: false
  },
  [ErrorCode.INVALID_FORMAT]: {
    title: 'Invalid Format',
    message: 'The data format is not valid. Please check and try again.',
    actions: ['retry'],
    retryable: false
  },

  // File processing errors
  [ErrorCode.FILE_TOO_LARGE]: {
    title: 'File Too Large',
    message: 'The file size exceeds the maximum allowed limit.',
    actions: ['try-smaller-file'],
    retryable: false
  },
  [ErrorCode.INVALID_FILE_TYPE]: {
    title: 'Invalid File Type',
    message: 'Only EPUB files are supported.',
    actions: ['try-different-file'],
    retryable: false
  },
  [ErrorCode.CORRUPTED_FILE]: {
    title: 'Corrupted File',
    message: 'The file appears to be corrupted or damaged.',
    actions: ['try-different-file', 'contact-support'],
    retryable: false
  },
  [ErrorCode.INVALID_EPUB]: {
    title: 'Invalid EPUB File',
    message: 'This EPUB file structure is not valid or supported.',
    actions: ['try-different-file', 'contact-support'],
    retryable: false
  },

  // Database errors
  [ErrorCode.DATABASE_CONNECTION_ERROR]: {
    title: 'Database Connection Error',
    message: 'Unable to connect to the database. Please try again later.',
    actions: ['retry', 'contact-support'],
    retryable: true
  },
  [ErrorCode.RECORD_NOT_FOUND]: {
    title: 'Not Found',
    message: 'The requested resource could not be found.',
    actions: ['go-back'],
    retryable: false
  },
  [ErrorCode.DUPLICATE_ENTRY]: {
    title: 'Duplicate Entry',
    message: 'This item already exists.',
    actions: ['try-different-name'],
    retryable: false
  },
  [ErrorCode.CONSTRAINT_VIOLATION]: {
    title: 'Data Constraint Violation',
    message: 'The operation violates data integrity constraints.',
    actions: ['contact-support'],
    retryable: false
  },

  // Rate limiting
  [ErrorCode.RATE_LIMIT_EXCEEDED]: {
    title: 'Rate Limit Exceeded',
    message: 'Too many requests. Please wait a moment before trying again.',
    actions: ['wait-and-retry'],
    retryable: true
  },

  // Generic errors
  [ErrorCode.INTERNAL_SERVER_ERROR]: {
    title: 'Internal Server Error',
    message: 'An unexpected error occurred on our end. Please try again.',
    actions: ['retry', 'contact-support'],
    retryable: true
  },
  [ErrorCode.SERVICE_UNAVAILABLE]: {
    title: 'Service Unavailable',
    message: 'The service is temporarily unavailable. Please try again later.',
    actions: ['retry', 'contact-support'],
    retryable: true
  },
  [ErrorCode.UNKNOWN_ERROR]: {
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again.',
    actions: ['retry', 'contact-support'],
    retryable: true
  }
}

// Error type to code mapping for backward compatibility
export const ERROR_TYPE_TO_CODES = {
  [ErrorType.NETWORK]: [ErrorCode.NETWORK_ERROR, ErrorCode.TIMEOUT_ERROR, ErrorCode.CONNECTION_REFUSED],
  [ErrorType.AUTHENTICATION]: [ErrorCode.INVALID_CREDENTIALS, ErrorCode.TOKEN_EXPIRED, ErrorCode.UNAUTHORIZED],
  [ErrorType.AUTHORIZATION]: [ErrorCode.FORBIDDEN, ErrorCode.INSUFFICIENT_PERMISSIONS],
  [ErrorType.VALIDATION]: [ErrorCode.INVALID_INPUT, ErrorCode.MISSING_REQUIRED_FIELD, ErrorCode.INVALID_FORMAT],
  [ErrorType.FILE_PROCESSING]: [ErrorCode.FILE_TOO_LARGE, ErrorCode.INVALID_FILE_TYPE, ErrorCode.CORRUPTED_FILE, ErrorCode.INVALID_EPUB],
  [ErrorType.DATABASE]: [ErrorCode.DATABASE_CONNECTION_ERROR, ErrorCode.RECORD_NOT_FOUND, ErrorCode.DUPLICATE_ENTRY, ErrorCode.CONSTRAINT_VIOLATION],
  [ErrorType.RATE_LIMIT]: [ErrorCode.RATE_LIMIT_EXCEEDED],
  [ErrorType.UNKNOWN]: [ErrorCode.INTERNAL_SERVER_ERROR, ErrorCode.SERVICE_UNAVAILABLE, ErrorCode.UNKNOWN_ERROR]
}

// Helper functions for error handling
export const getErrorTypeFromCode = (code: ErrorCode): ErrorType => {
  for (const [type, codes] of Object.entries(ERROR_TYPE_TO_CODES)) {
    if (codes.includes(code)) {
      return type as ErrorType
    }
  }
  return ErrorType.UNKNOWN
}

export const isRetryableErrorCode = (code: ErrorCode): boolean => {
  const errorInfo = ERROR_MESSAGES[code]
  return errorInfo?.retryable ?? false
}

export const createAppErrorFromCode = (
  code: ErrorCode, 
  customMessage?: string, 
  context?: ErrorContext
): AppError => {
  const errorInfo = ERROR_MESSAGES[code]
  const type = getErrorTypeFromCode(code)
  const message = customMessage || errorInfo?.message || 'An error occurred'
  
  let statusCode = 500
  switch (type) {
    case ErrorType.AUTHENTICATION:
      statusCode = 401
      break
    case ErrorType.AUTHORIZATION:
      statusCode = 403
      break
    case ErrorType.VALIDATION:
      statusCode = 400
      break
    case ErrorType.RATE_LIMIT:
      statusCode = 429
      break
    case ErrorType.DATABASE:
      if (code === ErrorCode.RECORD_NOT_FOUND) statusCode = 404
      break
  }
  
  return new AppError(
    message,
    code,
    type,
    statusCode,
    true,
    errorInfo?.retryable ?? false,
    context
  )
}
// Concrete ErrorHandler implementation
export class ErrorHandlerService implements ErrorHandler {
  private reportingService?: ErrorReportingService
  private userNotificationCallback?: (message: string, actions?: ErrorAction[]) => void
  private breadcrumbs: Array<{message: string, category: string, level: string, timestamp: string}> = []
  private maxBreadcrumbs = 50

  constructor(
    reportingService?: ErrorReportingService,
    userNotificationCallback?: (message: string, actions?: ErrorAction[]) => void
  ) {
    this.reportingService = reportingService
    this.userNotificationCallback = userNotificationCallback
  }

  async handleError(error: Error, context?: ErrorContext): Promise<void> {
    const appError = this.normalizeError(error, context)
    
    // Add breadcrumb for this error
    this.addBreadcrumb(
      `Error occurred: ${appError.message}`,
      'error',
      'error'
    )

    // Report error if it should be reported
    if (this.shouldReportError(appError)) {
      await this.reportError(appError, { context })
    }

    // Show user notification for operational errors
    if (appError.isOperational) {
      const errorInfo = ERROR_MESSAGES[appError.code]
      if (errorInfo) {
        const actions = this.createErrorActions(appError, errorInfo.actions)
        this.showUserError(errorInfo.message, actions)
      }
    }

    // Log error for debugging
    console.error('Error handled:', {
      error: appError.toJSON(),
      context,
      breadcrumbs: this.breadcrumbs.slice(-5) // Last 5 breadcrumbs
    })
  }

  async reportError(error: Error, metadata?: Record<string, any>): Promise<void> {
    if (!this.reportingService) {
      console.warn('No error reporting service configured')
      return
    }

    const appError = this.normalizeError(error)
    const errorDetails: ErrorDetails = {
      ...appError.toJSON(),
      cause: error.cause as Error,
    }

    try {
      await this.reportingService.report(errorDetails)
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  showUserError(message: string, actions?: ErrorAction[]): void {
    if (this.userNotificationCallback) {
      this.userNotificationCallback(message, actions)
    } else {
      // Fallback to console if no notification callback is set
      console.error('User Error:', message)
      if (actions) {
        console.log('Available actions:', actions.map(a => a.label))
      }
    }
  }

  createAppError(
    message: string, 
    code: ErrorCode, 
    type?: ErrorType, 
    statusCode?: number
  ): AppError {
    return createAppErrorFromCode(code, message, {
      component: 'ErrorHandler',
      action: 'createAppError',
      timestamp: new Date().toISOString()
    })
  }

  isRetryableError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.retryable
    }
    
    // Check for common retryable error patterns
    const retryablePatterns = [
      /network/i,
      /timeout/i,
      /connection/i,
      /503/,
      /502/,
      /504/
    ]
    
    return retryablePatterns.some(pattern => 
      pattern.test(error.message) || pattern.test(error.name)
    )
  }

  shouldReportError(error: Error): boolean {
    if (error instanceof AppError) {
      // Don't report validation errors or client-side errors
      return ![ErrorType.VALIDATION, ErrorType.AUTHENTICATION].includes(error.type)
    }
    
    // Report all non-AppError instances
    return true
  }

  addBreadcrumb(message: string, category: string = 'general', level: 'info' | 'warning' | 'error' = 'info'): void {
    this.breadcrumbs.push({
      message,
      category,
      level,
      timestamp: new Date().toISOString()
    })

    // Keep only the most recent breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs)
    }

    // Also add to reporting service if available
    this.reportingService?.addBreadcrumb(message, category, level)
  }

  setUserContext(userId: string, metadata?: Record<string, any>): void {
    this.reportingService?.setUserContext(userId, metadata)
  }

  getBreadcrumbs(): Array<{message: string, category: string, level: string, timestamp: string}> {
    return [...this.breadcrumbs]
  }

  clearBreadcrumbs(): void {
    this.breadcrumbs = []
  }

  private normalizeError(error: Error, context?: ErrorContext): AppError {
    if (error instanceof AppError) {
      // Update context if provided
      if (context) {
        return new AppError(
          error.message,
          error.code,
          error.type,
          error.statusCode,
          error.isOperational,
          error.retryable,
          { ...error.context, ...context }
        )
      }
      return error
    }

    // Convert regular Error to AppError
    let code = ErrorCode.UNKNOWN_ERROR
    let type = ErrorType.UNKNOWN

    // Try to infer error type from message/name
    if (error.name === 'ValidationError' || error.message.includes('validation')) {
      code = ErrorCode.INVALID_INPUT
      type = ErrorType.VALIDATION
    } else if (error.name === 'NetworkError' || error.message.includes('network')) {
      code = ErrorCode.NETWORK_ERROR
      type = ErrorType.NETWORK
    } else if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      code = ErrorCode.TIMEOUT_ERROR
      type = ErrorType.TIMEOUT
    } else if (error.message.includes('unauthorized') || error.message.includes('401')) {
      code = ErrorCode.UNAUTHORIZED
      type = ErrorType.AUTHENTICATION
    } else if (error.message.includes('forbidden') || error.message.includes('403')) {
      code = ErrorCode.FORBIDDEN
      type = ErrorType.AUTHORIZATION
    }

    return new AppError(
      error.message,
      code,
      type,
      500,
      true,
      this.isRetryableError(error),
      context || {
        component: 'Unknown',
        action: 'Unknown',
        timestamp: new Date().toISOString()
      }
    )
  }

  private createErrorActions(error: AppError, actionTypes: string[]): ErrorAction[] {
    const actions: ErrorAction[] = []

    for (const actionType of actionTypes) {
      switch (actionType) {
        case 'retry':
          actions.push({
            label: 'Try Again',
            action: () => window.location.reload(),
            primary: true
          })
          break
        case 'offline-mode':
          actions.push({
            label: 'Use Offline Mode',
            action: () => {
              // Implement offline mode logic
              console.log('Switching to offline mode')
            }
          })
          break
        case 'login':
          actions.push({
            label: 'Log In',
            action: () => {
              window.location.href = '/login'
            },
            primary: true
          })
          break
        case 'signup':
          actions.push({
            label: 'Sign Up',
            action: () => {
              window.location.href = '/signup'
            }
          })
          break
        case 'contact-support':
          actions.push({
            label: 'Contact Support',
            action: () => {
              window.open('mailto:support@example.com', '_blank')
            }
          })
          break
        case 'go-back':
          actions.push({
            label: 'Go Back',
            action: () => window.history.back(),
            primary: true
          })
          break
        case 'try-different-file':
          actions.push({
            label: 'Try Different File',
            action: () => {
              // Trigger file picker or navigate to upload
              console.log('Opening file picker')
            }
          })
          break
        case 'wait-and-retry':
          actions.push({
            label: 'Wait and Retry',
            action: async () => {
              await new Promise(resolve => setTimeout(resolve, 5000))
              window.location.reload()
            },
            primary: true
          })
          break
        case 'forgot-password':
          actions.push({
            label: 'Reset Password',
            action: () => {
              window.location.href = '/forgot-password'
            }
          })
          break
        case 'try-smaller-file':
          actions.push({
            label: 'Try Smaller File',
            action: () => {
              console.log('Please select a smaller file')
            }
          })
          break
        case 'try-different-name':
          actions.push({
            label: 'Try Different Name',
            action: () => {
              console.log('Please try a different name')
            }
          })
          break
      }
    }

    return actions
  }
}

// Default error reporting service implementation
export class ConsoleErrorReportingService implements ErrorReportingService {
  private userContext?: { userId: string, metadata?: Record<string, any> }

  async report(error: ErrorDetails): Promise<void> {
    console.error('Error Report:', {
      ...error,
      userContext: this.userContext,
      timestamp: new Date().toISOString()
    })
  }

  async reportBatch(errors: ErrorDetails[]): Promise<void> {
    console.error('Batch Error Report:', {
      errors,
      userContext: this.userContext,
      timestamp: new Date().toISOString()
    })
  }

  setUserContext(userId: string, metadata?: Record<string, any>): void {
    this.userContext = { userId, metadata }
  }

  addBreadcrumb(message: string, category?: string, level?: 'info' | 'warning' | 'error'): void {
    console.log('Breadcrumb:', { message, category, level, timestamp: new Date().toISOString() })
  }
}

// Global error handler instance
let globalErrorHandler: ErrorHandlerService

export const initializeErrorHandler = (
  reportingService?: ErrorReportingService,
  userNotificationCallback?: (message: string, actions?: ErrorAction[]) => void
): ErrorHandlerService => {
  globalErrorHandler = new ErrorHandlerService(reportingService, userNotificationCallback)
  
  // Set up global error handlers
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      globalErrorHandler.handleError(event.error, {
        component: 'Global',
        action: 'unhandledError',
        timestamp: new Date().toISOString(),
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      })
    })

    window.addEventListener('unhandledrejection', (event) => {
      globalErrorHandler.handleError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        {
          component: 'Global',
          action: 'unhandledPromiseRejection',
          timestamp: new Date().toISOString()
        }
      )
    })
  }

  return globalErrorHandler
}

export const getGlobalErrorHandler = (): ErrorHandlerService => {
  if (!globalErrorHandler) {
    globalErrorHandler = new ErrorHandlerService(new ConsoleErrorReportingService())
  }
  return globalErrorHandler
}

// Utility functions for common error scenarios
export const handleAsyncError = async <T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  fallback?: T
): Promise<T | undefined> => {
  try {
    return await operation()
  } catch (error) {
    await getGlobalErrorHandler().handleError(error as Error, context)
    return fallback
  }
}

export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => R,
  context: Partial<ErrorContext>
) => {
  return (...args: T): R | undefined => {
    try {
      return fn(...args)
    } catch (error) {
      getGlobalErrorHandler().handleError(error as Error, {
        component: context.component || 'Unknown',
        action: context.action || 'Unknown',
        timestamp: new Date().toISOString(),
        ...context
      })
      return undefined
    }
  }
}