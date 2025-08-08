'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { ErrorHandlerService, ErrorAction, getGlobalErrorHandler } from '../../services/errorHandler'
import { ErrorType, ErrorCode, ErrorContext } from '../../types'
import { Button } from './Button'

interface Props {
  children: ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  onReset?: () => void
  resetKeys?: Array<string | number>
  resetOnPropsChange?: boolean
  isolate?: boolean
  context?: Partial<ErrorContext>
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
  errorId: string
}

export interface ErrorFallbackProps {
  error: Error | null
  errorInfo: ErrorInfo | null
  resetError: () => void
  retryCount: number
  errorId: string
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null
  private errorHandler: ErrorHandlerService

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorId: ''
    }
    this.errorHandler = getGlobalErrorHandler()
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const context: ErrorContext = {
      component: this.props.context?.component || 'ErrorBoundary',
      action: this.props.context?.action || 'componentDidCatch',
      timestamp: new Date().toISOString(),
      metadata: {
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount,
        errorId: this.state.errorId,
        ...this.props.context?.metadata
      }
    }

    this.setState({ errorInfo })

    // Handle error through the centralized error handler
    this.errorHandler.handleError(error, context)

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props
    const { hasError } = this.state

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, idx) => prevProps.resetKeys?.[idx] !== key)) {
        this.resetError()
      }
    }

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetError()
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  resetError = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    })

    this.props.onReset?.()
  }

  retryWithDelay = (delay: number = 1000) => {
    this.setState(prevState => ({
      retryCount: prevState.retryCount + 1
    }))

    this.resetTimeoutId = window.setTimeout(() => {
      this.resetError()
    }, delay)
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
          retryCount={this.state.retryCount}
          errorId={this.state.errorId}
        />
      )
    }

    return this.props.children
  }
}

// Default error fallback component
export const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  resetError,
  retryCount,
  errorId
}) => {
  const isRetryable = error ? getGlobalErrorHandler().isRetryableError(error) : false
  const maxRetries = 3

  const handleReload = () => {
    window.location.reload()
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  const handleReportError = () => {
    if (error) {
      getGlobalErrorHandler().reportError(error, {
        errorId,
        retryCount,
        userAction: 'manual_report'
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-gray-600 mb-6">
            We encountered an unexpected error. This has been reported to our team.
          </p>

          {process.env.NODE_ENV === 'development' && error && (
            <details className="mb-4 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                Error Details (Development)
              </summary>
              <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-800 overflow-auto max-h-32">
                <div className="mb-2">
                  <strong>Error:</strong> {error.message}
                </div>
                <div className="mb-2">
                  <strong>Error ID:</strong> {errorId}
                </div>
                {retryCount > 0 && (
                  <div className="mb-2">
                    <strong>Retry Count:</strong> {retryCount}
                  </div>
                )}
                {error.stack && (
                  <div>
                    <strong>Stack:</strong>
                    <pre className="whitespace-pre-wrap">{error.stack}</pre>
                  </div>
                )}
              </div>
            </details>
          )}

          <div className="space-y-3">
            {isRetryable && retryCount < maxRetries && (
              <Button
                onClick={resetError}
                variant="primary"
                className="w-full"
              >
                Try Again
              </Button>
            )}

            <div className="flex space-x-3">
              <Button
                onClick={handleReload}
                variant="secondary"
                className="flex-1"
              >
                Reload Page
              </Button>
              <Button
                onClick={handleGoHome}
                variant="secondary"
                className="flex-1"
              >
                Go Home
              </Button>
            </div>

            <Button
              onClick={handleReportError}
              variant="ghost"
              className="w-full text-sm"
            >
              Report This Error
            </Button>
          </div>

          {retryCount >= maxRetries && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                Multiple retry attempts failed. Please reload the page or contact support.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Feature-specific error boundary for isolated error handling
interface FeatureErrorBoundaryProps extends Props {
  featureName: string
  showMinimalFallback?: boolean
}

export const FeatureErrorBoundary: React.FC<FeatureErrorBoundaryProps> = ({
  featureName,
  showMinimalFallback = false,
  children,
  ...props
}) => {
  const context: Partial<ErrorContext> = {
    component: `FeatureErrorBoundary_${featureName}`,
    action: 'featureError',
    ...props.context
  }

  const fallback = showMinimalFallback ? MinimalErrorFallback : FeatureErrorFallback

  return (
    <ErrorBoundary
      {...props}
      context={context}
      fallback={fallback}
      isolate={true}
    >
      {children}
    </ErrorBoundary>
  )
}

// Minimal error fallback for feature boundaries
const MinimalErrorFallback: React.FC<ErrorFallbackProps> = ({ resetError }) => (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
    <div className="flex items-center">
      <svg
        className="w-5 h-5 text-red-400 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span className="text-sm text-red-800">
        This feature is temporarily unavailable.
      </span>
      <Button
        onClick={resetError}
        variant="ghost"
        size="sm"
        className="ml-auto text-red-600 hover:text-red-800"
      >
        Retry
      </Button>
    </div>
  </div>
)

// Feature-specific error fallback
const FeatureErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  retryCount,
  errorId
}) => {
  const isRetryable = error ? getGlobalErrorHandler().isRetryableError(error) : false

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Feature Unavailable
        </h3>
        <p className="text-gray-600 mb-4">
          This feature encountered an error and is temporarily unavailable.
        </p>

        {process.env.NODE_ENV === 'development' && error && (
          <details className="mb-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-500">
              Error Details
            </summary>
            <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
              <div>Error: {error.message}</div>
              <div>ID: {errorId}</div>
              {retryCount > 0 && <div>Retries: {retryCount}</div>}
            </div>
          </details>
        )}

        <div className="space-y-2">
          {isRetryable && (
            <Button onClick={resetError} variant="primary" size="sm">
              Try Again
            </Button>
          )}
          <Button
            onClick={() => window.location.reload()}
            variant="secondary"
            size="sm"
          >
            Reload Page
          </Button>
        </div>
      </div>
    </div>
  )
}

// Hook for using error boundary functionality
export const useErrorHandler = () => {
  const errorHandler = getGlobalErrorHandler()

  const handleError = React.useCallback((error: Error, context?: Partial<ErrorContext>) => {
    errorHandler.handleError(error, {
      component: context?.component || 'useErrorHandler',
      action: context?.action || 'handleError',
      timestamp: new Date().toISOString(),
      ...context
    })
  }, [errorHandler])

  const reportError = React.useCallback((error: Error, metadata?: Record<string, any>) => {
    errorHandler.reportError(error, metadata)
  }, [errorHandler])

  const addBreadcrumb = React.useCallback((message: string, category?: string, level?: 'info' | 'warning' | 'error') => {
    errorHandler.addBreadcrumb(message, category, level)
  }, [errorHandler])

  return {
    handleError,
    reportError,
    addBreadcrumb,
    isRetryableError: errorHandler.isRetryableError.bind(errorHandler),
    createAppError: errorHandler.createAppError.bind(errorHandler)
  }
}

// Higher-order component for wrapping components with error boundaries
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}