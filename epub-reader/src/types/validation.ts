import { z } from 'zod'
import { 
  MAX_FILE_SIZE, 
  ALLOWED_MIME_TYPES, 
  SUPPORTED_LANGUAGES,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE
} from './index'

// Base validation schemas
export const IdSchema = z.string().uuid('Invalid ID format')
export const EmailSchema = z.string().email('Invalid email format')
export const UrlSchema = z.string().url('Invalid URL format')
export const DateSchema = z.coerce.date()
export const PositiveIntSchema = z.number().int().positive('Must be a positive integer')
export const NonNegativeIntSchema = z.number().int().min(0, 'Must be non-negative')

// Pagination schemas
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Book validation schemas
export const BookMetadataSchema = z.object({
  format: z.literal('epub'),
  version: z.string(),
  rights: z.string().nullable(),
  subjects: z.array(z.string()),
  contributors: z.array(z.object({
    name: z.string(),
    role: z.string()
  })),
  customProperties: z.record(z.string(), z.any())
})

export const CreateBookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  author: z.string().max(200, 'Author name too long').optional(),
  description: z.string().max(2000, 'Description too long').optional(),
  isbn: z.string().regex(/^(?:\d{10}|\d{13})$/, 'Invalid ISBN format').optional(),
  language: z.enum(SUPPORTED_LANGUAGES as [string, ...string[]]).default('en'),
  publisher: z.string().max(200, 'Publisher name too long').optional(),
  publishedDate: DateSchema.optional(),
  pageCount: PositiveIntSchema.optional(),
  metadata: BookMetadataSchema.partial().optional()
})

export const UpdateBookSchema = CreateBookSchema.partial()

export const BookFiltersSchema = z.object({
  search: z.string().max(200).optional(),
  author: z.string().max(200).optional(),
  language: z.enum(SUPPORTED_LANGUAGES as [string, ...string[]]).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['uploading', 'processing', 'ready', 'error']).optional(),
  sortBy: z.enum(['title', 'author', 'createdAt', 'lastRead', 'fileSize']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  dateRange: z.object({
    start: DateSchema,
    end: DateSchema
  }).optional()
}).merge(PaginationSchema.omit({ sortBy: true, sortOrder: true }))

// Annotation validation schemas
export const CreateAnnotationSchema = z.object({
  bookId: IdSchema,
  type: z.enum(['highlight', 'note', 'bookmark']),
  content: z.string().min(1, 'Content is required').max(5000, 'Content too long'),
  note: z.string().max(2000, 'Note too long').optional(),
  location: z.string().min(1, 'Location is required'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  tags: z.array(z.string().max(50)).max(10, 'Too many tags').optional(),
  isPrivate: z.boolean().default(false)
})

export const UpdateAnnotationSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  note: z.string().max(2000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  isPrivate: z.boolean().optional()
})

export const AnnotationFiltersSchema = z.object({
  type: z.enum(['highlight', 'note', 'bookmark']).optional(),
  tags: z.array(z.string()).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isPrivate: z.boolean().optional(),
  sortBy: z.enum(['createdAt', 'location', 'type']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  dateRange: z.object({
    start: DateSchema,
    end: DateSchema
  }).optional()
}).merge(PaginationSchema.omit({ sortBy: true, sortOrder: true }))

// Reading progress validation schemas
export const SaveProgressSchema = z.object({
  bookId: IdSchema,
  currentLocation: z.string().min(1, 'Location is required'),
  progressPercentage: z.number().min(0).max(100),
  readingTimeMinutes: NonNegativeIntSchema,
  sessionData: z.object({
    startTime: DateSchema,
    endTime: DateSchema.optional(),
    pagesRead: NonNegativeIntSchema,
    wordsRead: NonNegativeIntSchema,
    averageReadingSpeed: z.number().min(0)
  }).optional()
})

// File upload validation schemas
export const FileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine(file => file.size <= MAX_FILE_SIZE, 'File too large')
    .refine(file => ALLOWED_MIME_TYPES.includes(file.type), 'Invalid file type'),
  generateThumbnail: z.boolean().default(true),
  extractMetadata: z.boolean().default(true),
  validateStructure: z.boolean().default(true)
})

// User preferences validation schemas
export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  fontSize: z.number().min(12).max(24).default(16),
  fontFamily: z.string().max(50).default('serif'),
  lineHeight: z.number().min(1.2).max(2.0).default(1.5),
  readingSpeed: z.number().min(50).max(1000).default(250),
  autoSave: z.boolean().default(true),
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
    inApp: z.boolean().default(true),
    readingReminders: z.boolean().default(false),
    goalReminders: z.boolean().default(true)
  })
})

// Search validation schemas
export const SearchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(200, 'Query too long'),
  filters: BookFiltersSchema.optional(),
  highlightResults: z.boolean().default(true),
  maxResults: z.number().int().min(1).max(100).default(20)
})

export const FullTextSearchSchema = z.object({
  query: z.string().min(1).max(200),
  bookId: IdSchema.optional(),
  highlightResults: z.boolean().default(true),
  maxResults: z.number().int().min(1).max(100).default(20),
  contextLength: z.number().int().min(50).max(500).default(150)
})

// API response validation schemas
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    error: z.string().nullable(),
    success: z.boolean(),
    timestamp: z.string(),
    requestId: z.string().optional()
  })

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: z.array(dataSchema),
    pagination: z.object({
      page: PositiveIntSchema,
      limit: PositiveIntSchema,
      total: NonNegativeIntSchema,
      totalPages: NonNegativeIntSchema,
      hasNext: z.boolean(),
      hasPrevious: z.boolean()
    }),
    meta: z.object({
      totalSize: NonNegativeIntSchema.optional(),
      filters: z.record(z.string(), z.any()).optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(['asc', 'desc']).optional()
    }).optional()
  })

// Error validation schemas
export const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string(),
  value: z.any().optional()
})

export const ApiErrorSchema = z.object({
  type: z.enum(['NETWORK', 'VALIDATION', 'AUTHENTICATION', 'AUTHORIZATION', 'FILE_PROCESSING', 'DATABASE', 'RATE_LIMIT', 'TIMEOUT', 'UNKNOWN']),
  code: z.string(),
  message: z.string(),
  details: z.string().optional(),
  validationErrors: z.array(ValidationErrorSchema).optional(),
  timestamp: z.string(),
  requestId: z.string().optional(),
  retryAfter: z.number().optional()
})

// Export type inference helpers
export type CreateBookInput = z.infer<typeof CreateBookSchema>
export type UpdateBookInput = z.infer<typeof UpdateBookSchema>
export type BookFiltersInput = z.infer<typeof BookFiltersSchema>
export type CreateAnnotationInput = z.infer<typeof CreateAnnotationSchema>
export type UpdateAnnotationInput = z.infer<typeof UpdateAnnotationSchema>
export type AnnotationFiltersInput = z.infer<typeof AnnotationFiltersSchema>
export type SaveProgressInput = z.infer<typeof SaveProgressSchema>
export type UserPreferencesInput = z.infer<typeof UserPreferencesSchema>
export type SearchInput = z.infer<typeof SearchSchema>
export type FullTextSearchInput = z.infer<typeof FullTextSearchSchema>
export type ValidationErrorType = z.infer<typeof ValidationErrorSchema>
export type ApiErrorType = z.infer<typeof ApiErrorSchema>

// Validation helper functions
export const validateInput = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.issues.map((e: any) => e.message).join(', ')}`)
    }
    throw error
  }
}

export const safeValidateInput = <T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } => {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}

// Custom validation functions
export const isValidEpubFile = (file: File): boolean => {
  return file.type === 'application/epub+zip' && file.size <= MAX_FILE_SIZE
}

export const isValidImageFile = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  return validTypes.includes(file.type) && file.size <= 5 * 1024 * 1024 // 5MB
}

export const sanitizeSearchQuery = (query: string): string => {
  return query.trim().replace(/[<>]/g, '').substring(0, 200)
}

export const validateCFI = (cfi: string): boolean => {
  // Basic CFI validation - should start with epubcfi(
  return /^epubcfi\(.*\)$/.test(cfi)
}

export const validateHexColor = (color: string): boolean => {
  return /^#[0-9A-Fa-f]{6}$/.test(color)
}