/**
 * Centralized configuration for the extension
 */

const CONFIG = {
  EXTENSION_ID: 'catch-all-email-extension',
  DATA_VERSION: 2,

  // UI Constants
  ICON: {
    SIZE: 20,
    PADDING: 5,
    MAIL_GLYPH: '<i class="fas fa-envelope"></i>',
    SUCCESS_GLYPH: '<i class="fas fa-check"></i>',
    COPY_GLYPH: '<i class="fas fa-copy"></i>',
    DELETE_GLYPH: '<i class="fas fa-trash"></i>'
  },

  // Animation and timing
  ANIMATION: {
    NOTIFICATION_DURATION: 3000,
    SUCCESS_FEEDBACK_DURATION: 1000,
    TRANSITION_DURATION: 300
  },

  // Email generation
  EMAIL: {
    MIN_DIGITS: 100,
    MAX_DIGITS: 900,
    MIN_WORDLIST_SIZE: 10,
    WORD_MIN_LENGTH: 2
  },

  // URLs
  URLS: {
    DEFAULT_WORDLIST: 'https://raw.githubusercontent.com/mietzen/catch-all-autofill/refs/heads/main/wordlists/eff_large_wordlist.txt'
  },

  // Storage keys
  STORAGE_KEYS: {
    CATCH_ALL_DOMAIN: 'catchAllDomain',
    WORDLIST_URL: 'wordlistUrl',
    USAGE_LOG: 'usageLog',
    DATA_VERSION: 'dataVersion',
    CUSTOM_WORDLIST: 'customWordlist',
    USE_CUSTOM_WORDLIST: 'useCustomWordlist'
  },

  // Validation
  VALIDATION: {
    MIN_FIELD_WIDTH: 100,
    MIN_FIELD_HEIGHT: 20,
    DOMAIN_REGEX: /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.+[a-zA-Z]{2,}$/
  },

  // Fallback data
  FALLBACK_WORDLIST: [
    "apple", "bridge", "candle", "delta", "echo", "forest", "grape",
    "hotel", "igloo", "jelly", "koala", "lemon", "monkey", "nectar",
    "omega", "pencil", "quest", "rocket", "sunset", "tiger", "umbrella",
    "violet", "whale", "xray", "yodel", "zebra"
  ],

  // CSS Classes
  CSS_CLASSES: {
    WRAPPER: 'catch-all-email-extension-wrapper',
    ICON: 'catch-all-email-extension-icon',
    NOTIFICATION: 'catch-all-email-extension-notification'
  },

  // Selectors
  SELECTORS: {
    EMAIL_INPUTS: 'input[type="email"]',
    PASSWORD_MANAGER_EXCLUSIONS: '[data-lastpass-icon-root], [data-1password-icon]'
  }
};

// Make config available globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}