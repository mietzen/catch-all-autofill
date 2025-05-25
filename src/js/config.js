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
    WORD_MIN_LENGTH: 2,
    MAX_EMAIL_LENGTH: 254,
    MAX_RETRIES: 10
  },

  // Wordlist configuration
  WORDLISTS: {
    DEFAULT: 'en',
    AVAILABLE: [
      { code: 'de', name: 'German', flag: 'DE', file: 'assets/wordlists/de.txt' },
      { code: 'en', name: 'English', flag: 'US', file: 'assets/wordlists/en.txt' },
      { code: 'es', name: 'Spanish', flag: 'ES', file: 'assets/wordlists/es.txt' },
      { code: 'fi', name: 'Finnish', flag: 'FI', file: 'assets/wordlists/fi.txt' },
      { code: 'fr', name: 'French', flag: 'FR', file: 'assets/wordlists/fr.txt' },
      { code: 'se', name: 'Swedish', flag: 'SE', file: 'assets/wordlists/se.txt' }
    ],
    CUSTOM_KEY: 'custom'
  },


  // Storage keys
  STORAGE_KEYS: {
    CATCH_ALL_DOMAIN: 'catchAllDomain',
    WORDLIST_SELECTION: 'wordlistSelection', // New: stores 'de', 'en', etc. or 'custom'
    WORDLIST_URL: 'wordlistUrl', // Only used when selection is 'custom'
    USAGE_LOG: 'usageLog',
    DATA_VERSION: 'dataVersion',
  },

  // Validation
  VALIDATION: {
    MIN_FIELD_WIDTH: 100,
    MIN_FIELD_HEIGHT: 20,
    DOMAIN_REGEX: /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.+[a-zA-Z]{2,}$/
  },

  // CSS Classes
  CSS_CLASSES: {
    WRAPPER: 'catch-all-email-extension-wrapper',
    ICON: 'catch-all-email-extension-icon',
    NOTIFICATION: 'catch-all-email-extension-notification'
  },

  // Selectors
  SELECTORS: {
    EMAIL_INPUTS: 'input[autocomplete="email"], input[autocomplete="username"], input[id="email"], input[id="username"], input[name="email"], input[name="username"], input[type="email"]',
    PASSWORD_MANAGER_EXCLUSIONS: '[data-lastpass-icon-root], [data-1password-icon]'
  }
};

// Make config available globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}