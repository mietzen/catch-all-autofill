
const CONFIG = {
  EXTENSION_ID: 'catch-all-email-extension',
  DATA_VERSION: 2,

  ICON: {
    SIZE: 20,
    PADDING: 5,
    MAIL_GLYPH: '<i class="fas fa-envelope"></i>',
    SUCCESS_GLYPH: '<i class="fas fa-check"></i>',
    COPY_GLYPH: '<i class="fas fa-copy"></i>',
    DELETE_GLYPH: '<i class="fas fa-trash"></i>'
  },

  ANIMATION: {
    NOTIFICATION_DURATION: 3000,
    SUCCESS_FEEDBACK_DURATION: 1000,
    TRANSITION_DURATION: 300
  },

  EMAIL: {
    MIN_DIGITS: 100,
    MAX_DIGITS: 900,
    MIN_WORDLIST_SIZE: 10,
    WORD_MIN_LENGTH: 2,
    MAX_EMAIL_LENGTH: 254,
    MAX_RETRIES: 10
  },

  WORDLISTS: {
    DEFAULT: 'en',
    AVAILABLE: [
      { code: 'de', name: 'German', flag: 'DE', file: 'src/assets/wordlists/de.txt' },
      { code: 'en', name: 'English', flag: 'US', file: 'src/assets/wordlists/en.txt' },
      { code: 'es', name: 'Spanish', flag: 'ES', file: 'src/assets/wordlists/es.txt' },
      { code: 'fi', name: 'Finnish', flag: 'FI', file: 'src/assets/wordlists/fi.txt' },
      { code: 'fr', name: 'French', flag: 'FR', file: 'src/assets/wordlists/fr.txt' },
      { code: 'se', name: 'Swedish', flag: 'SE', file: 'src/assets/wordlists/se.txt' }
    ],
    CUSTOM_KEY: 'custom'
  },

  STORAGE_KEYS: {
    CATCH_ALL_DOMAIN: 'catchAllDomain',
    WORDLIST_SELECTION: 'wordlistSelection',
    WORDLIST_URL: 'wordlistUrl',
    USAGE_LOG: 'usageLog',
    DATA_VERSION: 'dataVersion',
    GITHUB_PAT: 'githubPat',
    GITHUB_REPOSITORY: 'githubRepository',
    GITHUB_BRANCH: 'githubBranch',
    GITHUB_AUTO_BACKUP: 'githubAutoBackup',
    LAST_BACKUP_DATE: 'lastBackupDate',
    LAST_BACKUP_URL: 'lastBackupUrl',
    LAST_BACKUP_ERROR: 'lastBackupError'
  },

  VALIDATION: {
    MIN_FIELD_WIDTH: 100,
    MIN_FIELD_HEIGHT: 20,
    DOMAIN_REGEX: /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.+[a-zA-Z]{2,}$/
  },

  CSS_CLASSES: {
    WRAPPER: 'catch-all-email-extension-wrapper',
    ICON: 'catch-all-email-extension-icon',
    NOTIFICATION: 'catch-all-email-extension-notification'
  },

  SELECTORS: {
    EMAIL_INPUTS: 'input[autocomplete="email"], input[autocomplete="username"], input[id="email"], input[id="username"], input[name="email"], input[name="username"], input[type="email"]',
    PASSWORD_MANAGER_EXCLUSIONS: '[data-lastpass-icon-root], [data-1password-icon]'
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}