// Global wordlist cache
let cachedWordlist = null;
let cachedWordlistUrl = null;

/**
 * Storage utilities
 */
const StorageUtils = {
  async get(keys) {
    return browser.storage.sync.get(keys);
  },

  async set(data) {
    return browser.storage.sync.set(data);
  },

  async getLocal(keys) {
    return browser.storage.local.get(keys);
  },

  async setLocal(data) {
    return browser.storage.local.set(data);
  },

  async removeLocal(keys) {
    return browser.storage.local.remove(keys);
  },

  generateCacheKey(url) {
    return `wordlist_${btoa(url).slice(0, 20)}`;
  }
};

/**
 * Wordlist management
 */
const WordlistManager = {
  async fetchFromUrl(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const text = await response.text();
    return this.parseContent(text);
  },

  async fetchLocalWordlist(filename) {
    const url = browser.runtime.getURL(filename);
    return this.fetchFromUrl(url);
  },

  parseContent(content) {
    return content
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'))
      .map(line => line.toLowerCase().replace(/[^a-z0-9äöüß]/g, ''))
      .filter(word => word.length >= CONFIG.EMAIL.WORD_MIN_LENGTH);
  },

  async getCurrentSelection() {
    const { [CONFIG.STORAGE_KEYS.WORDLIST_SELECTION]: selection = CONFIG.WORDLISTS.DEFAULT } =
      await StorageUtils.get(CONFIG.STORAGE_KEYS.WORDLIST_SELECTION);
    return selection;
  },

  async load(forceReload = false) {
    try {
      const selection = await this.getCurrentSelection();

      // Check cache
      if (!forceReload && cachedWordlist && cachedWordlistUrl === selection) {
        return cachedWordlist;
      }

      let wordlist;

      if (selection === CONFIG.WORDLISTS.CUSTOM_KEY) {
        // Load from custom URL
        const { [CONFIG.STORAGE_KEYS.WORDLIST_URL]: customUrl } =
          await StorageUtils.get(CONFIG.STORAGE_KEYS.WORDLIST_URL);

        if (!customUrl) {
          throw new Error('Custom wordlist selected but no URL configured');
        }

        // Try local storage cache for custom URL
        if (!forceReload) {
          const cacheKey = StorageUtils.generateCacheKey(customUrl);
          const cached = await StorageUtils.getLocal(cacheKey);
          if (cached[cacheKey]) {
            cachedWordlist = cached[cacheKey];
            cachedWordlistUrl = selection;
            return cachedWordlist;
          }
        }

        wordlist = await this.fetchFromUrl(customUrl);

        // Cache custom wordlist
        const cacheKey = StorageUtils.generateCacheKey(customUrl);
        await StorageUtils.setLocal({ [cacheKey]: wordlist });

      } else {
        // Load local wordlist
        const wordlistConfig = CONFIG.WORDLISTS.AVAILABLE.find(w => w.code === selection);
        if (!wordlistConfig) {
          throw new Error(`Unknown wordlist selection: ${selection}`);
        }

        // Try local storage cache for local wordlist
        if (!forceReload) {
          const cacheKey = `local_wordlist_${selection}`;
          const cached = await StorageUtils.getLocal(cacheKey);
          if (cached[cacheKey]) {
            cachedWordlist = cached[cacheKey];
            cachedWordlistUrl = selection;
            return cachedWordlist;
          }
        }

        wordlist = await this.fetchLocalWordlist(wordlistConfig.file);

        // Cache local wordlist
        const cacheKey = `local_wordlist_${selection}`;
        await StorageUtils.setLocal({ [cacheKey]: wordlist });
      }

      if (wordlist.length < CONFIG.EMAIL.MIN_WORDLIST_SIZE) {
        throw new Error(`Wordlist too small (less than ${CONFIG.EMAIL.MIN_WORDLIST_SIZE} words)`);
      }

      // Update memory cache
      cachedWordlist = wordlist;
      cachedWordlistUrl = selection;

      return wordlist;

    } catch (error) {
      console.error('Failed to load wordlist:', error);
      // Default to English wordlist instead of fallback
      try {
        const englishConfig = CONFIG.WORDLISTS.AVAILABLE.find(w => w.code === 'en');
        const wordlist = await this.fetchLocalWordlist(englishConfig.file);
        cachedWordlist = wordlist;
        cachedWordlistUrl = 'en';
        return wordlist;
      } catch (fallbackError) {
        console.error('Failed to load English fallback:', fallbackError);
        throw new Error('Unable to load any wordlist');
      }
    }
  },

  async cacheWordlist(wordlist, identifier) {
    cachedWordlist = wordlist;
    cachedWordlistUrl = identifier;
  },

  clearCache() {
    cachedWordlist = null;
    cachedWordlistUrl = null;
  },

  async clearLocalCache() {
    const storage = await StorageUtils.getLocal(null);
    const keysToRemove = Object.keys(storage).filter(key =>
      key.startsWith('wordlist_') || key.startsWith('local_wordlist_')
    );
    if (keysToRemove.length > 0) {
      await StorageUtils.removeLocal(keysToRemove);
    }
  },

  getWordlistInfo(selection) {
    if (selection === CONFIG.WORDLISTS.CUSTOM_KEY) {
      return { name: 'Custom URL', flag: null, isCustom: true };
    }

    const config = CONFIG.WORDLISTS.AVAILABLE.find(w => w.code === selection);
    return config ? {
      name: config.name,
      flag: config.flag,
      isCustom: false
    } : null;
  }
};

class EmailGenerator {
  static async generate(domain) {
    let attempts = 0;
    let email;

    do {
      attempts++;
      const wordlist = await WordlistManager.load();
      const word1 = this.pickRandom(wordlist);
      const word2 = this.pickRandom(wordlist);
      const digits = this.generateDigits();

      email = `${word1}_${word2}_${digits}@${domain}`;

      // Check length
      if (email.length > CONFIG.EMAIL.MAX_EMAIL_LENGTH) {
        continue;
      }

      // Check for collision
      if (await this.isEmailUnique(email)) {
        break;
      }

      email = null;
    } while (attempts < CONFIG.EMAIL.MAX_RETRIES);

    if (!email) {
      throw new Error('Unable to generate unique email after maximum retries');
    }

    return email;
  }

  static async isEmailUnique(email) {
    try {
      const usageLog = await UsageLogger.getLog();
      return !usageLog.some(entry => entry.generatedEmail === email);
    } catch (error) {
      console.error('Error checking email uniqueness:', error);
      return true; // Assume unique if check fails
    }
  }

  static validateEmail(email) {
    const errors = [];

    // Length check
    if (email.length > CONFIG.EMAIL.MAX_EMAIL_LENGTH) {
      errors.push(`Email too long (${email.length}/${CONFIG.EMAIL.MAX_EMAIL_LENGTH} chars)`);
    }

    // Basic format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }

    // Local part length (before @)
    const localPart = email.split('@')[0];
    if (localPart && localPart.length > 64) {
      errors.push('Local part too long (max 64 chars)');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  static pickRandom(wordlist) {
    return wordlist[Math.floor(Math.random() * wordlist.length)];
  }

  static generateDigits() {
    return Math.floor(Math.random() * (CONFIG.EMAIL.MAX_DIGITS - CONFIG.EMAIL.MIN_DIGITS + 1)) + CONFIG.EMAIL.MIN_DIGITS;
  }
};

/**
 * Usage logging utilities
 */
const UsageLogger = {
  async log(domain, generatedEmail) {
    const date = new Date().toISOString();
    const { [CONFIG.STORAGE_KEYS.USAGE_LOG]: usageLog = [] } =
      await StorageUtils.get(CONFIG.STORAGE_KEYS.USAGE_LOG);

    usageLog.push({ domain, date, generatedEmail });
    return StorageUtils.set({ [CONFIG.STORAGE_KEYS.USAGE_LOG]: usageLog });
  },

  async getLog() {
    const { [CONFIG.STORAGE_KEYS.USAGE_LOG]: usageLog = [] } =
      await StorageUtils.get(CONFIG.STORAGE_KEYS.USAGE_LOG);
    return usageLog;
  },

  async clearLog() {
    return StorageUtils.set({ [CONFIG.STORAGE_KEYS.USAGE_LOG]: [] });
  },

  async deleteEntry(entry) {
    const usageLog = await this.getLog();
    const newLog = usageLog.filter(e =>
      e.generatedEmail !== entry.generatedEmail ||
      e.domain !== entry.domain ||
      e.date !== entry.date
    );
    return StorageUtils.set({ [CONFIG.STORAGE_KEYS.USAGE_LOG]: newLog });
  }
};

/**
 * UI utilities
 */
const UIUtils = {
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback for Firefox
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      document.body.appendChild(textarea);
      textarea.select();
      const result = document.execCommand('copy');
      document.body.removeChild(textarea);
      return result;
    }
  },

  downloadFile(data, filename, type) {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  showNotification(message, isError = false, container = document.body) {
    // Remove existing notification
    const existing = container.querySelector(`.${CONFIG.CSS_CLASSES.NOTIFICATION}`);
    if (existing) {
      existing.remove();
    }

    const notification = document.createElement('div');
    notification.className = CONFIG.CSS_CLASSES.NOTIFICATION;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 16px;
      background-color: ${isError ? '#f44336' : '#4CAF50'};
      color: white;
      border-radius: 4px;
      z-index: 10001;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 300px;
      transition: all 0.3s ease;
      transform: translateX(100%);
    `;

    notification.textContent = message;
    container.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
    });

    // Remove after delay
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, CONFIG.ANIMATION.TRANSITION_DURATION);
    }, CONFIG.ANIMATION.NOTIFICATION_DURATION);
  }
};

/**
 * Browser utilities
 */
const BrowserUtils = {
  async getCurrentTab() {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    return tab;
  },

  async getCurrentDomain() {
    const tab = await this.getCurrentTab();
    return new URL(tab.url).hostname;
  },

  async executeScript(tabId, code) {
    return browser.tabs.executeScript(tabId, { code });
  }
};

/**
 * Validation utilities
 */
const ValidationUtils = {
  isValidDomain(domain) {
    return CONFIG.VALIDATION.DOMAIN_REGEX.test(domain);
  },

  isValidUrl(url) {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  },

  isFieldSuitableForIcon(field) {
    return field.offsetWidth >= CONFIG.VALIDATION.MIN_FIELD_WIDTH &&
      field.offsetHeight >= CONFIG.VALIDATION.MIN_FIELD_HEIGHT;
  },

  isFieldInPasswordManager(field) {
    return field.closest(CONFIG.SELECTORS.PASSWORD_MANAGER_EXCLUSIONS);
  }
};

/**
 * Export management
 */
/**
 * Export management
 */
const ExportUtils = {
  async exportAsJson() {
    try {
      // Get all extension data
      const [usageLog, syncStorage, localStorage] = await Promise.all([
        UsageLogger.getLog(),
        StorageUtils.get(null), // Get all sync storage
        StorageUtils.getLocal(null) // Get all local storage
      ]);

      // Prepare export data
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: CONFIG.DATA_VERSION,
          extensionId: CONFIG.EXTENSION_ID
        },
        settings: {
          // Core settings from sync storage
          catchAllDomain: syncStorage[CONFIG.STORAGE_KEYS.CATCH_ALL_DOMAIN] || '',
          wordlistSelection: syncStorage[CONFIG.STORAGE_KEYS.WORDLIST_SELECTION] || CONFIG.WORDLISTS.DEFAULT,
          wordlistUrl: syncStorage[CONFIG.STORAGE_KEYS.WORDLIST_URL] || '',
          dataVersion: syncStorage[CONFIG.STORAGE_KEYS.DATA_VERSION] || CONFIG.DATA_VERSION
        },
        cache: {
          // Local storage cache data (wordlists, etc.)
          localStorageKeys: Object.keys(localStorage).filter(key => 
            key.startsWith('wordlist_') || key.startsWith('local_wordlist_')
          ),
          // Note: We don't export actual cached wordlist data to keep file size reasonable
          cacheInfo: `${Object.keys(localStorage).length} cached items`
        },
        usageLog: usageLog,
        statistics: {
          totalEmails: usageLog.length,
          uniqueDomains: [...new Set(usageLog.map(entry => entry.domain))].length,
          dateRange: usageLog.length > 0 ? {
            first: usageLog.reduce((min, entry) => entry.date < min ? entry.date : min, usageLog[0].date),
            last: usageLog.reduce((max, entry) => entry.date > max ? entry.date : max, usageLog[0].date)
          } : null
        }
      };

      if (usageLog.length === 0 && !exportData.settings.catchAllDomain) {
        throw new Error('No data to export');
      }

      const data = JSON.stringify(exportData, null, 2);
      const filename = `catch_all_email_backup_${new Date().toISOString().slice(0, 10)}.json`;
      UIUtils.downloadFile(data, filename, 'application/json');
      
      return exportData;
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  },

  async importFromJson(jsonData) {
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      
      // Validate import data structure
      if (!data.settings && !data.usageLog) {
        throw new Error('Invalid backup file format');
      }

      // Import settings
      if (data.settings) {
        const settingsToImport = {};
        
        if (data.settings.catchAllDomain) {
          settingsToImport[CONFIG.STORAGE_KEYS.CATCH_ALL_DOMAIN] = data.settings.catchAllDomain;
        }
        
        if (data.settings.wordlistSelection) {
          settingsToImport[CONFIG.STORAGE_KEYS.WORDLIST_SELECTION] = data.settings.wordlistSelection;
        }
        
        if (data.settings.wordlistUrl) {
          settingsToImport[CONFIG.STORAGE_KEYS.WORDLIST_URL] = data.settings.wordlistUrl;
        }

        await StorageUtils.set(settingsToImport);
      }

      // Import usage log
      if (data.usageLog && Array.isArray(data.usageLog)) {
        await StorageUtils.set({ [CONFIG.STORAGE_KEYS.USAGE_LOG]: data.usageLog });
      }

      return {
        settingsImported: Object.keys(data.settings || {}).length,
        emailsImported: (data.usageLog || []).length
      };

    } catch (error) {
      console.error('Import error:', error);
      throw new Error('Failed to import backup: ' + error.message);
    }
  }
};

const FlagIcons = {
  // Available country codes from the flag-icons.css
  availableFlags: ['ad', 'ae', 'af', 'ag', 'ai', 'al', 'am', 'ao', 'aq', 'ar', 'arab', 'as', 'asean', 'at', 'au', 'aw', 'ax', 'az', 'ba', 'bb', 'bd', 'be', 'bf', 'bg', 'bh', 'bi', 'bj', 'bl', 'bm', 'bn', 'bo', 'bq', 'br', 'bs', 'bt', 'bv', 'bw', 'by', 'bz', 'ca', 'cc', 'cd', 'cefta', 'cf', 'cg', 'ch', 'ci', 'ck', 'cl', 'cm', 'cn', 'co', 'cp', 'cr', 'cu', 'cv', 'cw', 'cx', 'cy', 'cz', 'de', 'dg', 'dj', 'dk', 'dm', 'do', 'dz', 'eac', 'ec', 'ee', 'eg', 'eh', 'er', 'es-ct', 'es-ga', 'es-pv', 'es', 'et', 'eu', 'fi', 'fj', 'fk', 'fm', 'fo', 'fr', 'ga', 'gb-eng', 'gb-nir', 'gb-sct', 'gb-wls', 'gb', 'gd', 'ge', 'gf', 'gg', 'gh', 'gi', 'gl', 'gm', 'gn', 'gp', 'gq', 'gr', 'gs', 'gt', 'gu', 'gw', 'gy', 'hk', 'hm', 'hn', 'hr', 'ht', 'hu', 'ic', 'id', 'ie', 'il', 'im', 'in', 'io', 'iq', 'ir', 'is', 'it', 'je', 'jm', 'jo', 'jp', 'ke', 'kg', 'kh', 'ki', 'km', 'kn', 'kp', 'kr', 'kw', 'ky', 'kz', 'la', 'lb', 'lc', 'li', 'lk', 'lr', 'ls', 'lt', 'lu', 'lv', 'ly', 'ma', 'mc', 'md', 'me', 'mf', 'mg', 'mh', 'mk', 'ml', 'mm', 'mn', 'mo', 'mp', 'mq', 'mr', 'ms', 'mt', 'mu', 'mv', 'mw', 'mx', 'my', 'mz', 'na', 'nc', 'ne', 'nf', 'ng', 'ni', 'nl', 'no', 'np', 'nr', 'nu', 'nz', 'om', 'pa', 'pc', 'pe', 'pf', 'pg', 'ph', 'pk', 'pl', 'pm', 'pn', 'pr', 'ps', 'pt', 'pw', 'py', 'qa', 're', 'ro', 'rs', 'ru', 'rw', 'sa', 'sb', 'sc', 'sd', 'se', 'sg', 'sh-ac', 'sh-hl', 'sh-ta', 'sh', 'si', 'sj', 'sk', 'sl', 'sm', 'sn', 'so', 'sr', 'ss', 'st', 'sv', 'sx', 'sy', 'sz', 'tc', 'td', 'tf', 'tg', 'th', 'tj', 'tk', 'tl', 'tm', 'tn', 'to', 'tr', 'tt', 'tv', 'tw', 'tz', 'ua', 'ug', 'um', 'un', 'us', 'uy', 'uz', 'va', 'vc', 've', 'vg', 'vi', 'vn', 'vu', 'wf', 'ws', 'xk', 'xx', 'ye', 'yt', 'za', 'zm', 'zw'],

  getFlag(countryCode) {
    const code = countryCode.toLowerCase();
    if (this.availableFlags.includes(code)) {
      return `<span class="fi fi-${code}"></span>`;
    }
    return `<span class="flag-fallback">${countryCode}</span>`;
  },

  createFlagElement(countryCode, size = '20px') {
    const wrapper = document.createElement('span');
    wrapper.className = 'flag-wrapper';
    wrapper.style.cssText = `
            display: inline-block;
            width: ${size};
            height: ${size};
            margin-right: 8px;
            vertical-align: middle;
        `;

    const code = countryCode.toLowerCase();
    if (this.availableFlags.includes(code)) {
      const flagElement = document.createElement('span');
      flagElement.className = `fi fi-${code}`;
      flagElement.style.cssText = `
                width: 100%;
                height: 100%;
                display: block;
            `;
      wrapper.appendChild(flagElement);
    } else {
      const fallback = document.createElement('span');
      fallback.className = 'flag-fallback';
      fallback.textContent = countryCode;
      wrapper.appendChild(fallback);
    }

    return wrapper;
  }
};

// Export for use in extension
if (typeof window !== 'undefined') {
  window.FlagIcons = FlagIcons;
}
