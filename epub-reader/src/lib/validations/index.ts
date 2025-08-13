import { z } from 'zod';

// Common validation schemas
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email();
export const dateSchema = z.string().datetime();

// Pagination schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Book schemas
export const bookMetadataSchema = z.object({
  title: z.string().min(1).max(500),
  author: z.string().max(255).nullable(),
  description: z.string().max(5000).nullable(),
  isbn: z.string().regex(/^(97[89])?\d{9}[\dXx]$/).nullable().optional(),
  publisher: z.string().max(255).nullable(),
  publishedDate: z.string().datetime().nullable(),
  pageCount: z.number().int().positive().nullable(),
  language: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/).default('en'),
  subjects: z.string().max(1000).nullable(),
});

export const bookUploadSchema = z.object({
  file: z.object({
    name: z.string(),
    size: z.number().positive().max(50 * 1024 * 1024), // 50MB max
    type: z.string().refine(
      (type) => type === 'application/epub+zip',
      'File must be an EPUB'
    ),
  }),
  metadata: bookMetadataSchema.partial(),
});

export const bookSearchSchema = z.object({
  query: z.string().min(1).max(255),
  filters: z.object({
    author: z.string().optional(),
    language: z.string().optional(),
    hasAnnotations: z.boolean().optional(),
    inProgress: z.boolean().optional(),
  }).optional(),
  pagination: paginationSchema.optional(),
});

// Reading progress schemas
export const readingProgressSchema = z.object({
  bookId: uuidSchema,
  chapterId: z.string().max(255).nullable(),
  position: z.string().nullable(), // CFI position
  percentageComplete: z.number().min(0).max(100),
  totalTimeMinutes: z.number().int().min(0).optional(),
});

export const readingSessionSchema = z.object({
  bookId: uuidSchema,
  startChapterId: z.string().nullable(),
  endChapterId: z.string().nullable(),
  startCfi: z.string().nullable(),
  endCfi: z.string().nullable(),
  startPercentage: z.number().min(0).max(100).nullable(),
  endPercentage: z.number().min(0).max(100).nullable(),
  pagesRead: z.number().int().min(0).nullable(),
  deviceType: z.enum(['desktop', 'tablet', 'mobile', 'unknown']).optional(),
  browser: z.string().max(100).nullable(),
  os: z.string().max(100).nullable(),
  viewportWidth: z.number().int().positive().nullable(),
  viewportHeight: z.number().int().positive().nullable(),
  idleTimeSeconds: z.number().int().min(0).default(0),
});

// Annotation schemas
export const annotationTypeSchema = z.enum(['highlight', 'note', 'bookmark']);
export const annotationColorSchema = z.enum([
  '#FFE066', '#FF6B6B', '#4ECDC4', '#95E77E', '#B4A7D6', '#FFB6C1'
]);

export const annotationCreateSchema = z.object({
  bookId: uuidSchema,
  type: annotationTypeSchema,
  chapterId: z.string().max(255).nullable(),
  cfiRange: z.string().nullable(),
  selectedText: z.string().nullable(),
  noteContent: z.string().max(5000).nullable(),
  color: annotationColorSchema.nullable(),
}).refine(
  (data) => {
    // selectedText is required for highlights and notes, but not bookmarks
    if (data.type !== 'bookmark' && !data.selectedText) {
      return false;
    }
    return true;
  },
  {
    message: "selectedText is required for highlights and notes",
    path: ["selectedText"],
  }
);

export const annotationUpdateSchema = annotationCreateSchema.partial().extend({
  id: uuidSchema,
});

// Collection schemas
export const collectionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable(),
});

export const collectionBookSchema = z.object({
  collectionId: uuidSchema,
  bookId: uuidSchema,
});

// Profile schemas
export const profileUpdateSchema = z.object({
  email: emailSchema.optional(),
  fullName: z.string().max(255).nullable(),
  avatarUrl: z.string().url().nullable(),
  theme: z.enum(['light', 'dark', 'system']).nullable(),
  fontSize: z.number().int().min(12).max(32).nullable(),
  lineHeight: z.number().min(1).max(3).nullable(),
  fontFamily: z.string().max(100).nullable(),
  readingGoalMinutes: z.number().int().min(0).max(1440).nullable(),
});

// API Response schemas
export const apiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
  statusCode: z.number().int(),
  details: z.record(z.any()).optional(),
});

export const apiSuccessSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    metadata: z.object({
      timestamp: dateSchema,
      requestId: z.string().optional(),
    }).optional(),
  });

export const paginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int(),
      limit: z.number().int(),
      totalPages: z.number().int(),
      totalItems: z.number().int(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
  });

// Type exports
export type BookMetadata = z.infer<typeof bookMetadataSchema>;
export type BookUpload = z.infer<typeof bookUploadSchema>;
export type BookSearch = z.infer<typeof bookSearchSchema>;
export type ReadingProgress = z.infer<typeof readingProgressSchema>;
export type ReadingSession = z.infer<typeof readingSessionSchema>;
export type AnnotationCreate = z.infer<typeof annotationCreateSchema>;
export type AnnotationUpdate = z.infer<typeof annotationUpdateSchema>;
export type AnnotationType = z.infer<typeof annotationTypeSchema>;
export type AnnotationColor = z.infer<typeof annotationColorSchema>;
export type Collection = z.infer<typeof collectionSchema>;
export type CollectionBook = z.infer<typeof collectionBookSchema>;
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type Pagination = z.infer<typeof paginationSchema>;