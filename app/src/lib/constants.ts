/**
 * Application-wide constants
 * Centralizes magic numbers and configuration values for maintainability
 */

// ============================================
// TIME CONSTANTS (in seconds)
// ============================================

/** Seconds in one minute */
export const SECONDS_PER_MINUTE = 60

/** Seconds in one hour */
export const SECONDS_PER_HOUR = 3600

/** Seconds in one day */
export const SECONDS_PER_DAY = 86400

/** Seconds in one week */
export const SECONDS_PER_WEEK = 604800

// ============================================
// TIME CONSTANTS (in milliseconds)
// ============================================

/** Milliseconds in one minute */
export const MS_PER_MINUTE = 60000

/** Milliseconds in one second */
export const MS_PER_SECOND = 1000

/** Default polling interval for notifications (1 minute) */
export const NOTIFICATION_POLL_INTERVAL_MS = 60000

/** Message polling interval (5 seconds) */
export const MESSAGE_POLL_INTERVAL_MS = 5000

/** Toast auto-dismiss delay (effectively forever - 1000 seconds) */
export const TOAST_REMOVE_DELAY_MS = 1000000

// ============================================
// UI CONSTANTS
// ============================================

/** Maximum number of toasts to show at once */
export const TOAST_LIMIT = 1

/** Animation delay for slot cards (ms) */
export const SLOT_CARD_ANIMATION_DELAY_MS = 1500

/** Default debounce delay for search inputs (ms) */
export const SEARCH_DEBOUNCE_MS = 300

// ============================================
// PAGINATION & LIMITS
// ============================================

/** Default page size for lists */
export const DEFAULT_PAGE_SIZE = 10

/** Maximum notifications to show in dropdown */
export const MAX_NOTIFICATIONS_DROPDOWN = 10

// ============================================
// WEIGHT CONSTANTS (for livestock)
// ============================================

/** Example live weight for beef (lbs) - used in examples/placeholders */
export const EXAMPLE_BEEF_LIVE_WEIGHT = 1200

/** Example live weight for pork (lbs) - used in examples/placeholders */
export const EXAMPLE_PORK_LIVE_WEIGHT = 280

/** Example tag number for livestock placeholders */
export const EXAMPLE_TAG_NUMBER = '1234'

// ============================================
// BUSINESS CONSTANTS
// ============================================

/** Default ZIP code for demo/placeholder purposes */
export const EXAMPLE_ZIP_CODE = '13326'

/** Example phone number format */
export const EXAMPLE_PHONE = '4567'

// ============================================
// COPYRIGHT & BRANDING
// ============================================

/** Company founding year for copyright notices */
export const COPYRIGHT_YEAR = 2025

/** Stats: Number of processors on platform (for marketing) */
export const STATS_PROCESSORS_COUNT = 2847
