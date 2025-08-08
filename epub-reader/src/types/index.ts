// Core domain types
export interface Book {
  id: string
  userId: string
  title: string
  author: string | null
  description: string | null
  isbn: string | null
  language: string
  publisher: string | null
  publishedDate: Date | null
  pageCount: number | null
  filePath: string
  fileSize: number
  coverPath: string | null
  metadata: BookMetadata
  createdAt: Date
  updatedAt: Date
}

export interface BookMetadata {
  format: 'epub'
  version: string
  rights: string | null
  subjects: string[]
  contributors: Contributor[]
  customProperties: Record<string, any>
}

export interface Contributor {
  name: string
  role: string
}

export interface ReadingProgress {
  id: string
  userId: string
  bookId: string
  currentLocation: string // CFI or chapter reference
  progressPercentage: number
  readingTimeMinutes: number
  lastReadAt: Date
  sessionData: ReadingSession
}

export interface ReadingSession {
  id: string
  userId: string
  bookId: string
  startTime: Date
  endTime?: Date
  pagesRead: number
  wordsRead: number
  averageReadingSpeed: number
  createdAt: Date
}

export interface Annotation {
  id: string
  userId: string
  bookId: string
  type: 'highlight' | 'note' | 'bookmark'
  content: string
  note: string | null
  location: string // CFI location
  color: string
  tags: string[]
  isPrivate: boolean
  createdAt: Date
  updatedAt: Date
}

// API types
export interface ApiResponse<T> {
  data: T
  error: string | null
  success: boolean
  timestamp: string
  requestId?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  }
  meta?: {
    totalSize?: number
    filters?: Record<string, any>
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }
}

// Request types
export interface CreateBookRequest {
  title: string
  author?: string
  description?: string
  isbn?: string
  language?: string
  publisher?: string
  publishedDate?: string
  pageCount?: number
  metadata?: Partial<BookMetadata>
}

export interface UpdateBookRequest {
  title?: string
  author?: string
  description?: string
  isbn?: string
  language?: string
  publisher?: string
  publishedDate?: string
  pageCount?: number
  metadata?: Partial<BookMetadata>
}

export interface CreateAnnotationRequest {
  bookId: string
  type: 'highlight' | 'note' | 'bookmark'
  content: string
  note?: string
  location: string
  color: string
  tags?: string[]
  isPrivate?: boolean
}

export interface UpdateAnnotationRequest {
  content?: string
  note?: string
  color?: string
  tags?: string[]
  isPrivate?: boolean
}

export interface SaveProgressRequest {
  bookId: string
  currentLocation: string
  progressPercentage: number
  readingTimeMinutes: number
  sessionData?: Partial<ReadingSession>
}

// Error types
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  FILE_PROCESSING = 'FILE_PROCESSING',
  DATABASE = 'DATABASE',
  RATE_LIMIT = 'RATE_LIMIT',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  
  // Authentication errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // Authorization errors
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // File processing errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  CORRUPTED_FILE = 'CORRUPTED_FILE',
  INVALID_EPUB = 'INVALID_EPUB',
  
  // Database errors
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Generic errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface ErrorContext {
  component: string
  action: string
  userId?: string
  bookId?: string
  annotationId?: string
  sessionId?: string
  userAgent?: string
  timestamp: string
  metadata?: Record<string, any>
}

export interface ErrorDetails {
  type: ErrorType
  code: ErrorCode
  message: string
  context?: ErrorContext
  stack?: string
  cause?: Error
  retryable: boolean
  statusCode: number
}

export interface ValidationError {
  field: string
  message: string
  code: string
  value?: any
}

export interface ApiError {
  type: ErrorType
  code: ErrorCode
  message: string
  details?: string
  validationErrors?: ValidationError[]
  timestamp: string
  requestId?: string
  retryAfter?: number
}

// Utility types
export type BookStatus = 'uploading' | 'processing' | 'ready' | 'error'
export type AnnotationType = 'highlight' | 'note' | 'bookmark'
export type SortOrder = 'asc' | 'desc'
export type FileFormat = 'epub'

// Filter and search types
export interface BookFilters {
  search?: string
  author?: string
  language?: string
  tags?: string[]
  status?: BookStatus
  sortBy?: 'title' | 'author' | 'createdAt' | 'lastRead' | 'fileSize'
  sortOrder?: SortOrder
  limit?: number
  offset?: number
  dateRange?: {
    start: Date
    end: Date
  }
}

export interface AnnotationFilters {
  type?: AnnotationType
  tags?: string[]
  color?: string
  isPrivate?: boolean
  sortBy?: 'createdAt' | 'location' | 'type'
  sortOrder?: SortOrder
  limit?: number
  offset?: number
  dateRange?: {
    start: Date
    end: Date
  }
}

// Configuration types
export interface AppConfig {
  maxFileSize: number
  allowedFileTypes: string[]
  supportedLanguages: string[]
  defaultTheme: string
  apiTimeout: number
  retryAttempts: number
  cacheTimeout: number
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  fontSize: number
  fontFamily: string
  lineHeight: number
  readingSpeed: number
  autoSave: boolean
  notifications: {
    email: boolean
    push: boolean
    inApp: boolean
  }
}

// Event types for analytics and tracking
export interface AnalyticsEvent {
  name: string
  properties?: Record<string, any>
  userId?: string
  sessionId?: string
  timestamp: Date
}

export interface ReadingEvent extends AnalyticsEvent {
  bookId: string
  chapterIndex?: number
  progressPercentage: number
  readingTimeMinutes: number
}

export interface AnnotationEvent extends AnalyticsEvent {
  annotationId: string
  bookId: string
  type: AnnotationType
  action: 'create' | 'update' | 'delete'
}

// Constants
export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
export const ALLOWED_MIME_TYPES = ['application/epub+zip']
export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko']
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100
export const API_TIMEOUT = 30000 // 30 seconds
export const MAX_RETRY_ATTEMPTS = 3
export const CACHE_TIMEOUT = 5 * 60 * 1000 // 5 minutes

// Type guards
export const isBook = (obj: any): obj is Book => {
  return obj && typeof obj.id === 'string' && typeof obj.title === 'string'
}

export const isAnnotation = (obj: any): obj is Annotation => {
  return obj && typeof obj.id === 'string' && typeof obj.bookId === 'string' && 
         ['highlight', 'note', 'bookmark'].includes(obj.type)
}

export const isReadingProgress = (obj: any): obj is ReadingProgress => {
  return obj && typeof obj.id === 'string' && typeof obj.bookId === 'string' && 
         typeof obj.progressPercentage === 'number'
}

export const isApiError = (obj: any): obj is ApiError => {
  return obj && obj.type && obj.code && obj.message
}

// Re-export validation types and schemas
export * from './validation'