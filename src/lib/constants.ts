export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024,
  MAX_SIZE_MB: 10,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ],
  ALLOWED_FILE_EXTENSIONS: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'pdf', 'doc', 'docx', 'xls', 'xlsx'],
  IMAGE_EXTENSIONS: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'],
  MAX_IMAGES_PER_SECTION: 5,
  IMAGE_COMPRESSION_QUALITY: 0.8,
  IMAGE_MAX_WIDTH: 1920,
  IMAGE_MAX_HEIGHT: 1080,
} as const;

export const CACHE_CONTROL = {
  DEFAULT: '3600',
  SHORT: '1800',
  LONG: '86400',
} as const;

export const DEBOUNCE_DELAYS = {
  SEARCH: 300,
  INPUT: 500,
  RESIZE: 150,
} as const;

export const API_TIMEOUTS = {
  DEFAULT: 30000,
  UPLOAD: 60000,
  LONG_OPERATION: 120000,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const READ_LIMITS = {
  FILE_LINES: 2000,
  CHAR_LIMIT: 2000,
} as const;

export const TIME_CATEGORIES = {
  EARLY_MORNING: { start: 0, end: 7 },
  MORNING: { start: 7, end: 12 },
  AFTERNOON: { start: 12, end: 18 },
  EVENING: { start: 18, end: 21 },
  NIGHT: { start: 21, end: 24 },
} as const;

export const TIMEZONE = {
  DEFAULT: 'Asia/Riyadh',
  UTC_OFFSET: '+03:00',
} as const;

export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 6,
  RECOMMENDED_MIN_LENGTH: 8,
} as const;

export const PHONE_VALIDATION = {
  PATTERN: /^[\d\s\-\+\(\)]+$/,
} as const;

export const EMAIL_VALIDATION = {
  PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

export const URL_VALIDATION = {
  PATTERN: /^https?:\/\/.+/,
} as const;
