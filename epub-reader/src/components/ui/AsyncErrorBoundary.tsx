'use client'

import React, { Component, ReactNode } from 'react'
import { ErrorBoundary, ErrorFallbackProps } from './ErrorBoundary'
import { Button } from './core/Button/Button'
import { getGlobalErrorHandler } from '../../services/errorHandler'

interface AsyncErrorBoundaryProps {
  children: ReactNode
  onRetry?: () => void | Promise<void>
  retryDelay?: number
  maxRetries?: number
  fallback?: React.ComponentType<AsyncErrorFallbackProps>
  showRetryButton?: boolean
  retryButtonText?: string
}

interface AsyncErrorBoundaryState {
  isRetrying: boolean
  retryPromise: Promise<void> | null
}

export interface AsyncErrorFallbackProps extends ErrorFallbackProps {
  isRetrying: boolean
  onRetry: () => void
  canRetry: boolean
  retryButtonText: string
}

export class AsyncErrorBoundary extends Component<AsyncErrorBoundaryProps, AsyncErrorBoundaryState> {
  private retryTimeoutId: number | null = null

  constructor(props: AsyncErrorBoundaryProps) {
    super(props)
    this.state = {
      isRetrying: false,
      retryPromise: null
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  handleRetry = async () => {
    const { onRetry, retryDelay = 1000 } = this.props

    if (this.state.isRetrying) return

    this.setState({ isRetrying: true })

    try {
      if (retryDelay > 0) {
        await new Promise(resolve => {
          this.retryTimeoutId = window.setTimeout(resolve, retryDelay)
        })
      }

      if (onRetry) {
        const retryPromise = Promise.resolve(onRetry())
        this.setState({ retryPromise })
        await retryPromise
      }

      // Reset the error boundary after successful retry
      this.setState({ isRetrying: false, retryPromise: null })
    } catch (error) {
      // If retry fails, report the error but don't reset the boundary
      getGlobalErrorHandler().handleError(error as Error, {
        component: 'AsyncErrorBoundary',
        action: 'retryFailed',
        timestamp: new Date().toISOString()
      })
      this.setState({ isRetrying: false, retryPromise: null })
    }
  }

  render() {
    const {
      children,
      fallback: FallbackComponent = AsyncErrorFallback,
      maxRetries = 3,
      showRetryButton = true,
      retryButtonText = 'Try Again',
      ...errorBoundaryProps
    } = this.props

    const { isRetrying } = this.state

    return (
      <ErrorBoundary
        {...errorBoundaryProps}
        fallback={(props) => (
          <FallbackComponent
            {...props}
            isRetrying={isRetrying}
            onRetry={this.handleRetry}
            canRetry={showRetryButton && props.retryCount < maxRetries}
            retryButtonText={retryButtonText}
          />
        )}
      >
        {children}
      </ErrorBoundary>
    )
  }
}

// Default async error fallback component
const AsyncErrorFallback: React.FC<AsyncErrorFallbackProps> = ({
  error,
  resetError,
  retryCount,
  errorId,
  isRetrying,
  onRetry,
  canRetry,
  retryButtonText
}) => {
  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
          {isRetrying ? (
            <svg
              className="w-6 h-6 text-blue-600 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
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
          )}
        </div>

        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {isRetrying ? 'Retrying...' : 'Operation Failed'}
        </h3>
        
        <p className="text-gray-600 mb-4">
          {isRetrying 
            ? 'Please wait while we try to recover...'
            : 'The operation could not be completed. You can try again or reload the page.'
          }
        </p>

        {retryCount > 0 && (
          <p className="text-sm text-gray-500 mb-4">
            Attempt {retryCount + 1}
          </p>
        )}

        {process.env.NODE_ENV === 'development' && error && !isRetrying && (
          <details className="mb-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-500">
              Error Details
            </summary>
            <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
              <div>Error: {error.message}</div>
              <div>ID: {errorId}</div>
            </div>
          </details>
        )}

        {!isRetrying && (
          <div className="space-y-2">
            {canRetry && (
              <Button
                onClick={onRetry}
                variant="primary"
                size="sm"
                disabled={isRetrying}
              >
                {retryButtonText}
              </Button>
            )}
            
            <div className="flex space-x-2 justify-center">
              <Button
                onClick={resetError}
                variant="secondary"
                size="sm"
              >
                Reset
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="secondary"
                size="sm"
              >
                Reload Page
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Hook for handling async operations with error boundaries
export const useAsyncErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null)
  const [isRetrying, setIsRetrying] = React.useState(false)
  const [retryCount, setRetryCount] = React.useState(0)

  const executeAsync = React.useCallback(async (
    operation: () => Promise<any>,
    options?: {
      maxRetries?: number
      retryDelay?: number
      onError?: (error: Error) => void
      onRetry?: () => void
    }
  ): Promise<any> => {
    const { maxRetries = 3, retryDelay = 1000, onError, onRetry } = options || {}

    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          setIsRetrying(true)
          onRetry?.()
          
          if (retryDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt - 1)))
          }
        }

        const result = await operation()
        
        // Success - reset error state
        setError(null)
        setIsRetrying(false)
        setRetryCount(0)
        
        return result
      } catch (err) {
        lastError = err as Error
        setRetryCount(attempt + 1)
        
        if (attempt === maxRetries) {
          // Final attempt failed
          setError(lastError)
          setIsRetrying(false)
          onError?.(lastError)
          
          getGlobalErrorHandler().handleError(lastError, {
            component: 'useAsyncErrorHandler',
            action: 'executeAsync',
            timestamp: new Date().toISOString(),
            metadata: { attempts: attempt + 1, maxRetries }
          })
        }
      }
    }

    return null
  }, [])

  const resetError = React.useCallback(() => {
    setError(null)
    setIsRetrying(false)
    setRetryCount(0)
  }, [])

  return {
    error,
    isRetrying,
    retryCount,
    executeAsync,
    resetError
  }
}