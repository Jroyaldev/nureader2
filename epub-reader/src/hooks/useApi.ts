import { useState, useCallback, useRef, useEffect } from 'react'
import { apiClient, handleApiResponse } from '../lib/apiClient'
import { ApiResponse, ErrorContext } from '../types'
import { AppError } from '../services/errorHandler'
import { useErrorHandler } from '../components/ui/ErrorBoundary'

// API call state
interface ApiState<T> {
  data: T | null
  loading: boolean
  error: AppError | null
  lastUpdated: Date | null
}

// API call options
interface ApiCallOptions {
  immediate?: boolean
  retryOnMount?: boolean
  context?: Partial<ErrorContext>
  onSuccess?: (data: any) => void
  onError?: (error: AppError) => void
}

// Hook for making API calls with error handling
export const useApi = <T = any>(
  apiCall: () => Promise<ApiResponse<T>>,
  options: ApiCallOptions = {}
) => {
  const {
    immediate = false,
    retryOnMount = false,
    context,
    onSuccess,
    onError
  } = options

  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null
  })

  const { handleError } = useErrorHandler()
  const abortControllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const execute = useCallback(async (): Promise<T | null> => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    setState(prev => ({
      ...prev,
      loading: true,
      error: null
    }))

    try {
      const data = await handleApiResponse(apiCall, context)

      if (mountedRef.current) {
        setState({
          data,
          loading: false,
          error: null,
          lastUpdated: new Date()
        })

        onSuccess?.(data)
      }

      return data
    } catch (error) {
      const appError = error instanceof AppError ? error : new AppError(
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN_ERROR' as any,
        'UNKNOWN' as any
      )

      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: appError
        }))

        // Handle error through error boundary system
        handleError(appError, context)
        onError?.(appError)
      }

      return null
    }
  }, [apiCall, context, handleError, onSuccess, onError])

  const retry = useCallback(() => {
    return execute()
  }, [execute])

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      lastUpdated: null
    })
  }, [])

  // Execute immediately if requested
  useEffect(() => {
    if (immediate || retryOnMount) {
      execute()
    }
  }, [immediate, retryOnMount, execute])

  return {
    ...state,
    execute,
    retry,
    reset,
    isRetryable: state.error?.retryable ?? false
  }
}

// Hook for API mutations (POST, PUT, DELETE)
export const useApiMutation = <TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
  options: Omit<ApiCallOptions, 'immediate' | 'retryOnMount'> = {}
) => {
  const [state, setState] = useState<ApiState<TData>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null
  })

  const { handleError } = useErrorHandler()
  const { context, onSuccess, onError } = options

  const mutate = useCallback(async (variables: TVariables): Promise<TData | null> => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null
    }))

    try {
      const data = await handleApiResponse(() => mutationFn(variables), context)

      setState({
        data,
        loading: false,
        error: null,
        lastUpdated: new Date()
      })

      onSuccess?.(data)
      return data
    } catch (error) {
      const appError = error instanceof AppError ? error : new AppError(
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN_ERROR' as any,
        'UNKNOWN' as any
      )

      setState(prev => ({
        ...prev,
        loading: false,
        error: appError
      }))

      handleError(appError, context)
      onError?.(appError)
      return null
    }
  }, [mutationFn, context, handleError, onSuccess, onError])

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      lastUpdated: null
    })
  }, [])

  return {
    ...state,
    mutate,
    reset,
    isRetryable: state.error?.retryable ?? false
  }
}

// Hook for file uploads with progress tracking
export const useFileUpload = <T = any>(
  uploadUrl: string,
  options: ApiCallOptions & {
    onProgress?: (progress: number) => void
  } = {}
) => {
  const [progress, setProgress] = useState(0)
  const { onProgress, ...apiOptions } = options

  const mutation = useApiMutation<T, { file: File; additionalData?: Record<string, any> }>(
    ({ file, additionalData }) => 
      apiClient.uploadFile(uploadUrl, file, {
        onProgress: (progress) => {
          setProgress(progress)
          onProgress?.(progress)
        },
        additionalData
      }),
    apiOptions
  )

  const upload = useCallback((file: File, additionalData?: Record<string, any>) => {
    setProgress(0)
    return mutation.mutate({ file, additionalData })
  }, [mutation])

  const reset = useCallback(() => {
    setProgress(0)
    mutation.reset()
  }, [mutation])

  return {
    ...mutation,
    progress,
    upload,
    reset
  }
}

// Hook for network status monitoring
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(apiClient.isOnline())

  useEffect(() => {
    const unsubscribe = apiClient.onNetworkStatusChange(setIsOnline)
    return unsubscribe
  }, [])

  return {
    isOnline,
    isOffline: !isOnline
  }
}

// Hook for API polling
export const useApiPolling = <T = any>(
  apiCall: () => Promise<ApiResponse<T>>,
  interval: number,
  options: ApiCallOptions & {
    enabled?: boolean
    stopOnError?: boolean
  } = {}
) => {
  const { enabled = true, stopOnError = false, ...apiOptions } = options
  const [isPolling, setIsPolling] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const api = useApi(apiCall, { ...apiOptions, immediate: false })

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    setIsPolling(true)
    
    // Execute immediately
    api.execute()

    // Set up interval
    intervalRef.current = setInterval(() => {
      api.execute().catch(() => {
        if (stopOnError) {
          setIsPolling(false)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }
      })
    }, interval)
  }, [api, interval, stopOnError])

  const stopPolling = useCallback(() => {
    setIsPolling(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Auto start/stop based on enabled flag
  useEffect(() => {
    if (enabled && !isPolling) {
      startPolling()
    } else if (!enabled && isPolling) {
      stopPolling()
    }
  }, [enabled, isPolling, startPolling, stopPolling])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    ...api,
    isPolling,
    startPolling,
    stopPolling
  }
}

// Utility hook for batch API calls
export const useApiBatch = <T = any>(
  apiCalls: Array<() => Promise<ApiResponse<T>>>,
  options: ApiCallOptions = {}
) => {
  const [state, setState] = useState<{
    data: (T | null)[]
    loading: boolean
    error: AppError | null
    completed: number
    total: number
  }>({
    data: [],
    loading: false,
    error: null,
    completed: 0,
    total: apiCalls.length
  })

  const { handleError } = useErrorHandler()
  const { context, onSuccess, onError } = options

  const execute = useCallback(async (): Promise<(T | null)[]> => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      completed: 0
    }))

    const results: (T | null)[] = []
    let hasError = false

    for (let i = 0; i < apiCalls.length; i++) {
      try {
        const data = await handleApiResponse(apiCalls[i], context)
        results.push(data)
        
        setState(prev => ({
          ...prev,
          completed: i + 1,
          data: [...results]
        }))
      } catch (error) {
        const appError = error instanceof AppError ? error : new AppError(
          error instanceof Error ? error.message : 'Unknown error',
          'UNKNOWN_ERROR' as any,
          'UNKNOWN' as any
        )

        results.push(null)
        hasError = true

        setState(prev => ({
          ...prev,
          completed: i + 1,
          data: [...results],
          error: appError
        }))

        handleError(appError, context)
        onError?.(appError)
        break
      }
    }

    setState(prev => ({
      ...prev,
      loading: false
    }))

    if (!hasError) {
      onSuccess?.(results)
    }

    return results
  }, [apiCalls, context, handleError, onSuccess, onError])

  return {
    ...state,
    execute,
    progress: state.total > 0 ? (state.completed / state.total) * 100 : 0
  }
}