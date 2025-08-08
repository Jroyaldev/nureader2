import { 
  Book, 
  BookMetadata, 
  ReadingProgress, 
  ReadingSession,
  Annotation, 
  BookFilters,
  AnnotationFilters,
  CreateAnnotationRequest,
  UpdateAnnotationRequest,
  SaveProgressRequest,
  PaginatedResponse,
  ApiResponse
} from './index'

// Enhanced service interface definitions
export interface ValidationResult {
  valid: boolean
  errors?: ValidationError[]
  warnings?: ValidationWarning[]
  metadata?: Partial<BookMetadata>
}

export interface ValidationError {
  code: string
  message: string
  severity: 'error' | 'warning'
  location?: string
}

export interface ValidationWarning {
  code: string
  message: string
  suggestion?: string
}

export interface EpubBook {
  metadata: BookMetadata
  spine: SpineItem[]
  toc: TableOfContentsItem[]
  resources: Record<string, EpubResource>
  manifest: ManifestItem[]
  guide?: GuideItem[]
}

export interface SpineItem {
  id: string
  href: string
  mediaType: string
  linear: boolean
  properties?: string[]
}

export interface TableOfContentsItem {
  id: string
  label: string
  href: string
  playOrder?: number
  children?: TableOfContentsItem[]
}

export interface EpubResource {
  id: string
  href: string
  mediaType: string
  data?: ArrayBuffer | string
  properties?: string[]
}

export interface ManifestItem {
  id: string
  href: string
  mediaType: string
  properties?: string[]
  fallback?: string
}

export interface GuideItem {
  type: string
  title: string
  href: string
}

// File processing types
export interface FileUploadOptions {
  maxSize?: number
  allowedTypes?: string[]
  generateThumbnail?: boolean
  extractMetadata?: boolean
  validateStructure?: boolean
}

export interface FileProcessingResult {
  success: boolean
  book?: Book
  errors?: ValidationError[]
  warnings?: ValidationWarning[]
  processingTime: number
}

export interface ThumbnailOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
}

// Search and indexing types
export interface SearchResult {
  books: Book[]
  totalCount: number
  facets?: SearchFacets
  suggestions?: string[]
  searchTime: number
}

export interface SearchFacets {
  authors: FacetItem[]
  languages: FacetItem[]
  subjects: FacetItem[]
  publishers: FacetItem[]
}

export interface FacetItem {
  value: string
  count: number
}

export interface FullTextSearchOptions {
  query: string
  bookId?: string
  highlightResults?: boolean
  maxResults?: number
  contextLength?: number
}

export interface FullTextSearchResult {
  bookId: string
  matches: TextMatch[]
  totalMatches: number
}

export interface TextMatch {
  location: string
  context: string
  highlightedContext: string
  score: number
}

// Enhanced service interfaces
export interface BookService {
  // CRUD operations
  uploadBook(file: File, options?: FileUploadOptions): Promise<FileProcessingResult>
  getBooks(filters?: BookFilters): Promise<PaginatedResponse<Book>>
  getBook(id: string): Promise<ApiResponse<Book>>
  updateBook(id: string, updates: Partial<Book>): Promise<ApiResponse<Book>>
  deleteBook(id: string): Promise<ApiResponse<void>>
  
  // Search and discovery
  searchBooks(query: string, filters?: BookFilters): Promise<SearchResult>
  getBooksByAuthor(author: string, limit?: number): Promise<ApiResponse<Book[]>>
  getRecentBooks(limit?: number): Promise<ApiResponse<Book[]>>
  getPopularBooks(limit?: number): Promise<ApiResponse<Book[]>>
  
  // Metadata operations
  updateMetadata(id: string, metadata: Partial<BookMetadata>): Promise<ApiResponse<Book>>
  regenerateThumbnail(id: string, options?: ThumbnailOptions): Promise<ApiResponse<string>>
  
  // Bulk operations
  deleteBooks(ids: string[]): Promise<ApiResponse<void>>
  updateBooksMetadata(updates: Array<{id: string, metadata: Partial<BookMetadata>}>): Promise<ApiResponse<Book[]>>
}

export interface ReadingService {
  // Progress tracking
  saveProgress(request: SaveProgressRequest): Promise<ApiResponse<void>>
  getProgress(bookId: string): Promise<ApiResponse<ReadingProgress | null>>
  getReadingHistory(userId: string, limit?: number): Promise<ApiResponse<ReadingProgress[]>>
  getReadingStats(userId: string, dateRange?: {start: Date, end: Date}): Promise<ApiResponse<ReadingStats>>
  
  // Session management
  startReadingSession(bookId: string): Promise<ApiResponse<ReadingSession>>
  endReadingSession(sessionId: string): Promise<ApiResponse<ReadingSession>>
  getActiveSessions(userId: string): Promise<ApiResponse<ReadingSession[]>>
  
  // Annotations
  createAnnotation(annotation: CreateAnnotationRequest): Promise<ApiResponse<Annotation>>
  getAnnotations(bookId: string, filters?: AnnotationFilters): Promise<PaginatedResponse<Annotation>>
  updateAnnotation(id: string, updates: UpdateAnnotationRequest): Promise<ApiResponse<Annotation>>
  deleteAnnotation(id: string): Promise<ApiResponse<void>>
  
  // Annotation operations
  searchAnnotations(query: string, filters?: AnnotationFilters): Promise<ApiResponse<Annotation[]>>
  exportAnnotations(bookId: string, format: 'json' | 'csv' | 'markdown'): Promise<ApiResponse<Blob>>
  importAnnotations(bookId: string, file: File): Promise<ApiResponse<Annotation[]>>
  
  // Bulk operations
  deleteAnnotations(ids: string[]): Promise<ApiResponse<void>>
  updateAnnotationTags(ids: string[], tags: string[]): Promise<ApiResponse<Annotation[]>>
}

export interface EpubService {
  // File processing
  loadBook(file: File): Promise<EpubBook>
  extractMetadata(file: File): Promise<BookMetadata>
  generateThumbnail(file: File, options?: ThumbnailOptions): Promise<Blob>
  validateEpubFile(file: File): Promise<ValidationResult>
  
  // Content processing
  extractText(file: File): Promise<string>
  extractImages(file: File): Promise<Array<{id: string, data: Blob, mediaType: string}>>
  processChapter(bookId: string, chapterHref: string): Promise<string>
  
  // Search and indexing
  indexBookContent(book: EpubBook): Promise<void>
  searchInBook(bookId: string, options: FullTextSearchOptions): Promise<FullTextSearchResult>
  
  // Rendering support
  getChapterContent(bookId: string, chapterHref: string): Promise<string>
  resolveResource(bookId: string, resourceHref: string): Promise<ArrayBuffer>
  getCFIFromLocation(bookId: string, location: string): Promise<string>
  getLocationFromCFI(bookId: string, cfi: string): Promise<string>
}

// Additional service interfaces
export interface UserService {
  getCurrentUser(): Promise<ApiResponse<User>>
  updateUserPreferences(preferences: Partial<UserPreferences>): Promise<ApiResponse<UserPreferences>>
  getUserStats(userId: string): Promise<ApiResponse<UserStats>>
  deleteUserData(userId: string): Promise<ApiResponse<void>>
}

export interface NotificationService {
  sendNotification(userId: string, notification: Notification): Promise<ApiResponse<void>>
  getNotifications(userId: string, filters?: NotificationFilters): Promise<PaginatedResponse<Notification>>
  markAsRead(notificationIds: string[]): Promise<ApiResponse<void>>
  deleteNotifications(notificationIds: string[]): Promise<ApiResponse<void>>
}

// Supporting types for new service methods
export interface ReadingStats {
  totalBooksRead: number
  totalReadingTime: number
  averageReadingSpeed: number
  booksReadThisMonth: number
  readingStreak: number
  favoriteGenres: string[]
  readingGoals: ReadingGoal[]
}

export interface ReadingGoal {
  id: string
  type: 'books' | 'pages' | 'time'
  target: number
  current: number
  deadline: Date
  achieved: boolean
}

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  preferences: UserPreferences
  createdAt: Date
  updatedAt: Date
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  fontSize: number
  fontFamily: string
  lineHeight: number
  readingSpeed: number
  autoSave: boolean
  notifications: NotificationPreferences
}

export interface NotificationPreferences {
  email: boolean
  push: boolean
  inApp: boolean
  readingReminders: boolean
  goalReminders: boolean
}

export interface UserStats {
  totalBooks: number
  totalAnnotations: number
  totalReadingTime: number
  averageReadingSpeed: number
  joinDate: Date
  lastActive: Date
}

export interface Notification {
  id: string
  userId: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  read: boolean
  actionUrl?: string
  createdAt: Date
}

export interface NotificationFilters {
  type?: 'info' | 'success' | 'warning' | 'error'
  read?: boolean
  limit?: number
  offset?: number
}