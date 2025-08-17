// Application constants
export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
export const ALLOWED_MIME_TYPES = ['application/epub+zip']
export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh']

export const ANNOTATION_COLORS = {
  yellow: '#fef3c7',
  green: '#d1fae5',
  forest: '#228b22',
  purple: '#e9d5ff',
  pink: '#fce7f3',
  red: '#fee2e2',
} as const

export const READING_THEMES = {
  light: {
    background: '#ffffff',
    color: '#1f2937',
    name: 'Light'
  },
  dark: {
    background: '#1f2937',
    color: '#f9fafb',
    name: 'Dark'
  },
  sepia: {
    background: '#f7f3e9',
    color: '#5d4e37',
    name: 'Sepia'
  }
} as const