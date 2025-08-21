import { ErrorDetails } from '../types'
import { getGlobalErrorHandler } from './errorHandler'

// API request/response logging
interface ApiLogEntry {
  id: string
  timestamp: string
  method: string
  url: string
  status?: number
  duration?: number
  requestSize?: number
  responseSize?: number
  userAgent?: string
  userId?: string
  sessionId?: string
  error?: ErrorDetails
  metadata?: Record<string, any>
}

// Performance metrics
interface PerformanceMetrics {
  requestCount: number
  errorCount: number
  averageResponseTime: number
  slowestRequest: ApiLogEntry | null
  fastestRequest: ApiLogEntry | null
  errorRate: number
  uptime: number
  lastReset: Date
}

// API monitoring configuration
interface ApiMonitoringConfig {
  enableLogging: boolean
  enableMetrics: boolean
  maxLogEntries: number
  slowRequestThreshold: number
  errorRateThreshold: number
  metricsReportInterval: number
  enableRealTimeAlerts: boolean
}

export class ApiLogger {
  private logs: ApiLogEntry[] = []
  private metrics: PerformanceMetrics
  private config: ApiMonitoringConfig
  private metricsInterval: NodeJS.Timeout | null = null
  private startTime: Date

  constructor(config: Partial<ApiMonitoringConfig> = {}) {
    this.startTime = new Date()
    this.config = {
      enableLogging: true,
      enableMetrics: true,
      maxLogEntries: 1000,
      slowRequestThreshold: 5000, // 5 seconds
      errorRateThreshold: 0.1, // 10%
      metricsReportInterval: 60000, // 1 minute
      enableRealTimeAlerts: true,
      ...config
    }

    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      slowestRequest: null,
      fastestRequest: null,
      errorRate: 0,
      uptime: 0,
      lastReset: new Date()
    }

    if (this.config.enableMetrics) {
      this.startMetricsReporting()
    }
  }

  // Log API request
  logRequest(entry: Omit<ApiLogEntry, 'id' | 'timestamp'>): void {
    if (!this.config.enableLogging) return

    const logEntry: ApiLogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      ...entry
    }

    this.logs.push(logEntry)

    // Maintain log size limit
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs = this.logs.slice(-this.config.maxLogEntries)
    }

    // Update metrics
    if (this.config.enableMetrics) {
      this.updateMetrics(logEntry)
    }

    // Check for alerts
    if (this.config.enableRealTimeAlerts) {
      this.checkAlerts(logEntry)
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(logEntry)
    }
  }

  // Log successful API response
  logResponse(
    requestId: string,
    status: number,
    duration: number,
    responseSize?: number,
    metadata?: Record<string, any>
  ): void {
    const existingEntry = this.logs.find(log => log.id === requestId)
    if (existingEntry) {
      existingEntry.status = status
      existingEntry.duration = duration
      existingEntry.responseSize = responseSize
      existingEntry.metadata = { ...existingEntry.metadata, ...metadata }
    } else {
      this.logRequest({
        method: 'UNKNOWN',
        url: 'UNKNOWN',
        status,
        duration,
        responseSize,
        metadata
      })
    }
  }

  // Log API error
  logError(
    requestId: string,
    error: ErrorDetails,
    duration?: number,
    metadata?: Record<string, any>
  ): void {
    const existingEntry = this.logs.find(log => log.id === requestId)
    if (existingEntry) {
      existingEntry.error = error
      existingEntry.duration = duration
      existingEntry.status = error.statusCode
      existingEntry.metadata = { ...existingEntry.metadata, ...metadata }
    } else {
      this.logRequest({
        method: 'UNKNOWN',
        url: 'UNKNOWN',
        status: error.statusCode,
        duration,
        error,
        metadata
      })
    }
  }

  // Get logs with filtering
  getLogs(filters?: {
    method?: string
    status?: number
    hasError?: boolean
    minDuration?: number
    maxDuration?: number
    since?: Date
    limit?: number
  }): ApiLogEntry[] {
    let filteredLogs = [...this.logs]

    if (filters) {
      if (filters.method) {
        filteredLogs = filteredLogs.filter(log => 
          log.method.toLowerCase() === filters.method!.toLowerCase()
        )
      }

      if (filters.status) {
        filteredLogs = filteredLogs.filter(log => log.status === filters.status)
      }

      if (filters.hasError !== undefined) {
        filteredLogs = filteredLogs.filter(log => 
          filters.hasError ? !!log.error : !log.error
        )
      }

      if (filters.minDuration) {
        filteredLogs = filteredLogs.filter(log => 
          (log.duration || 0) >= filters.minDuration!
        )
      }

      if (filters.maxDuration) {
        filteredLogs = filteredLogs.filter(log => 
          (log.duration || 0) <= filters.maxDuration!
        )
      }

      if (filters.since) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) >= filters.since!
        )
      }

      if (filters.limit) {
        filteredLogs = filteredLogs.slice(-filters.limit)
      }
    }

    return filteredLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  // Get error summary
  getErrorSummary(timeRange?: { start: Date; end: Date }): {
    totalErrors: number
    errorsByType: Record<string, number>
    errorsByStatus: Record<number, number>
    mostCommonErrors: Array<{ error: string; count: number }>
  } {
    let logs = this.logs.filter(log => !!log.error)

    if (timeRange) {
      logs = logs.filter(log => {
        const timestamp = new Date(log.timestamp)
        return timestamp >= timeRange.start && timestamp <= timeRange.end
      })
    }

    const errorsByType: Record<string, number> = {}
    const errorsByStatus: Record<number, number> = {}
    const errorMessages: Record<string, number> = {}

    logs.forEach(log => {
      if (log.error) {
        // Count by error type
        errorsByType[log.error.type] = (errorsByType[log.error.type] || 0) + 1
        
        // Count by status code
        if (log.status) {
          errorsByStatus[log.status] = (errorsByStatus[log.status] || 0) + 1
        }
        
        // Count by error message
        errorMessages[log.error.message] = (errorMessages[log.error.message] || 0) + 1
      }
    })

    const mostCommonErrors = Object.entries(errorMessages)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalErrors: logs.length,
      errorsByType,
      errorsByStatus,
      mostCommonErrors
    }
  }

  // Get performance summary
  getPerformanceSummary(timeRange?: { start: Date; end: Date }): {
    totalRequests: number
    averageResponseTime: number
    medianResponseTime: number
    p95ResponseTime: number
    slowestRequests: ApiLogEntry[]
    requestsByMethod: Record<string, number>
    requestsByStatus: Record<number, number>
  } {
    let logs = this.logs.filter(log => log.duration !== undefined)

    if (timeRange) {
      logs = logs.filter(log => {
        const timestamp = new Date(log.timestamp)
        return timestamp >= timeRange.start && timestamp <= timeRange.end
      })
    }

    const durations = logs.map(log => log.duration!).sort((a, b) => a - b)
    const requestsByMethod: Record<string, number> = {}
    const requestsByStatus: Record<number, number> = {}

    logs.forEach(log => {
      requestsByMethod[log.method] = (requestsByMethod[log.method] || 0) + 1
      if (log.status) {
        requestsByStatus[log.status] = (requestsByStatus[log.status] || 0) + 1
      }
    })

    const averageResponseTime = durations.length > 0 
      ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length 
      : 0

    const medianResponseTime = durations.length > 0 
      ? durations[Math.floor(durations.length / 2)] 
      : 0

    const p95Index = Math.floor(durations.length * 0.95)
    const p95ResponseTime = durations.length > 0 ? durations[p95Index] : 0

    const slowestRequests = logs
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 10)

    return {
      totalRequests: logs.length,
      averageResponseTime,
      medianResponseTime,
      p95ResponseTime,
      slowestRequests,
      requestsByMethod,
      requestsByStatus
    }
  }

  // Export logs for analysis
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = [
        'timestamp', 'method', 'url', 'status', 'duration', 
        'requestSize', 'responseSize', 'error', 'userId'
      ]
      
      const rows = this.logs.map(log => [
        log.timestamp,
        log.method,
        log.url,
        log.status || '',
        log.duration || '',
        log.requestSize || '',
        log.responseSize || '',
        log.error?.message || '',
        log.userId || ''
      ])

      return [headers, ...rows].map(row => row.join(',')).join('\n')
    }

    return JSON.stringify(this.logs, null, 2)
  }

  // Clear logs and reset metrics
  clear(): void {
    this.logs = []
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      slowestRequest: null,
      fastestRequest: null,
      errorRate: 0,
      uptime: 0,
      lastReset: new Date()
    }
  }

  // Update configuration
  updateConfig(config: Partial<ApiMonitoringConfig>): void {
    this.config = { ...this.config, ...config }
    
    if (this.config.enableMetrics && !this.metricsInterval) {
      this.startMetricsReporting()
    } else if (!this.config.enableMetrics && this.metricsInterval) {
      this.stopMetricsReporting()
    }
  }

  // Destroy logger and cleanup
  destroy(): void {
    this.stopMetricsReporting()
    this.logs = []
  }

  private updateMetrics(entry: ApiLogEntry): void {
    this.metrics.requestCount++
    
    if (entry.error) {
      this.metrics.errorCount++
    }

    if (entry.duration !== undefined) {
      // Update average response time
      const totalTime = this.metrics.averageResponseTime * (this.metrics.requestCount - 1)
      this.metrics.averageResponseTime = (totalTime + entry.duration) / this.metrics.requestCount

      // Update slowest/fastest requests
      if (!this.metrics.slowestRequest || entry.duration > (this.metrics.slowestRequest.duration || 0)) {
        this.metrics.slowestRequest = entry
      }

      if (!this.metrics.fastestRequest || entry.duration < (this.metrics.fastestRequest.duration || Infinity)) {
        this.metrics.fastestRequest = entry
      }
    }

    // Update error rate
    this.metrics.errorRate = this.metrics.errorCount / this.metrics.requestCount

    // Update uptime
    this.metrics.uptime = Date.now() - this.startTime.getTime()
  }

  private checkAlerts(entry: ApiLogEntry): void {
    // Check for slow requests
    if (entry.duration && entry.duration > this.config.slowRequestThreshold) {
      this.sendAlert('slow_request', {
        message: `Slow API request detected: ${entry.method} ${entry.url} took ${entry.duration}ms`,
        entry,
        threshold: this.config.slowRequestThreshold
      })
    }

    // Check error rate
    if (this.metrics.errorRate > this.config.errorRateThreshold) {
      this.sendAlert('high_error_rate', {
        message: `High error rate detected: ${(this.metrics.errorRate * 100).toFixed(2)}%`,
        errorRate: this.metrics.errorRate,
        threshold: this.config.errorRateThreshold
      })
    }

    // Check for specific error types
    if (entry.error) {
      if (entry.error.type === 'NETWORK') {
        this.sendAlert('network_error', {
          message: `Network error: ${entry.error.message}`,
          entry
        })
      }
    }
  }

  private sendAlert(type: string, data: any): void {
    // In a real application, this would send alerts to monitoring services
    console.warn(`[API Alert] ${type}:`, data)
    
    // Report to error handler
    getGlobalErrorHandler().addBreadcrumb(
      `API Alert: ${type}`,
      'monitoring',
      'warning'
    )
  }

  private startMetricsReporting(): void {
    if (this.metricsInterval) return

    this.metricsInterval = setInterval(() => {
      this.reportMetrics()
    }, this.config.metricsReportInterval)
  }

  private stopMetricsReporting(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
      this.metricsInterval = null
    }
  }

  private reportMetrics(): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('[API Metrics]', this.getMetrics())
    }

    // In production, send metrics to monitoring service
    // Example: analytics.track('api_metrics', this.getMetrics())
  }

  private logToConsole(entry: ApiLogEntry): void {
    const color = entry.error ? 'color: red' : 
                 (entry.status && entry.status >= 400) ? 'color: orange' : 
                 'color: green'

    console.log(
      `%c[API] ${entry.method} ${entry.url} ${entry.status || 'PENDING'}${entry.duration ? ` (${entry.duration}ms)` : ''}`,
      color,
      entry
    )
  }

  private generateId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Global API logger instance
export const apiLogger = new ApiLogger({
  enableLogging: true,
  enableMetrics: true,
  enableRealTimeAlerts: process.env.NODE_ENV === 'production'
})

