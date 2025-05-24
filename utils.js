/**
 * Refactored utility functions for the extension
 */

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

  parseContent(content) {
    return content
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'))
      .map(line => line.toLowerCase().replace(/[^a-z0-9äöüß]/g, ''))
      .filter(word => word.length >= CONFIG.EMAIL.WORD_MIN_LENGTH);
  },

  async load(forceReload = false) {
    try {
      const { [CONFIG.STORAGE_KEYS.WORDLIST_URL]: wordlistUrl = CONFIG.URLS.DEFAULT_WORDLIST } =
        await StorageUtils.get(CONFIG.STORAGE_KEYS.WORDLIST_URL);

      // Check cache
      if (!forceReload && cachedWordlist && cachedWordlistUrl === wordlistUrl) {
        return cachedWordlist;
      }

      // Try local storage cache
      if (!forceReload) {
        const cacheKey = StorageUtils.generateCacheKey(wordlistUrl);
        const cached = await StorageUtils.getLocal(cacheKey);
        if (cached[cacheKey]) {
          cachedWordlist = cached[cacheKey];
          cachedWordlistUrl = wordlistUrl;
          return cachedWordlist;
        }
      }

      // Fetch from URL
      const wordlist = await this.fetchFromUrl(wordlistUrl);

      if (wordlist.length < CONFIG.EMAIL.MIN_WORDLIST_SIZE) {
        throw new Error(`Wordlist too small (less than ${CONFIG.EMAIL.MIN_WORDLIST_SIZE} words)`);
      }

      // Cache results
      await this.cacheWordlist(wordlist, wordlistUrl);

      return wordlist;

    } catch (error) {
      console.warn('Failed to load wordlist from URL, using fallback:', error);
      cachedWordlist = CONFIG.FALLBACK_WORDLIST;
      cachedWordlistUrl = null;
      return CONFIG.FALLBACK_WORDLIST;
    }
  },

  async cacheWordlist(wordlist, url) {
    cachedWordlist = wordlist;
    cachedWordlistUrl = url;

    const cacheKey = StorageUtils.generateCacheKey(url);
    await StorageUtils.setLocal({ [cacheKey]: wordlist });
  },

  clearCache() {
    cachedWordlist = null;
    cachedWordlistUrl = null;
  },

  async clearLocalCache() {
    const storage = await StorageUtils.getLocal(null);
    const keysToRemove = Object.keys(storage).filter(key => key.startsWith('wordlist_'));
    if (keysToRemove.length > 0) {
      await StorageUtils.removeLocal(keysToRemove);
    }
  }
};

/**
 * Email generation utilities
 */
const EmailGenerator = {
  pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  generateDigits() {
    return Math.floor(CONFIG.EMAIL.MIN_DIGITS + Math.random() * CONFIG.EMAIL.MAX_DIGITS);
  },

  async generate(catchAllDomain) {
    const wordlist = await WordlistManager.load();
    const w1 = this.pickRandom(wordlist);
    const w2 = this.pickRandom(wordlist);
    const digits = this.generateDigits();
    return `${w1}_${w2}_${digits}@${catchAllDomain}`;
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
const ExportUtils = {
  async exportAsJson() {
    const usageLog = await UsageLogger.getLog();
    if (usageLog.length === 0) {
      throw new Error('No data to export');
    }

    const data = JSON.stringify(usageLog, null, 2);
    const filename = `email_log_${new Date().toISOString().slice(0, 10)}.json`;
    UIUtils.downloadFile(data, filename, 'application/json');
  },

  async exportAsCsv() {
    const usageLog = await UsageLogger.getLog();
    if (usageLog.length === 0) {
      throw new Error('No data to export');
    }

    const headers = "email,domain,date\n";
    const csvContent = headers +
      usageLog.map(e => `"${e.generatedEmail}","${e.domain}","${e.date}"`).join('\n');

    const filename = `email_log_${new Date().toISOString().slice(0, 10)}.csv`;
    UIUtils.downloadFile(csvContent, filename, 'text/csv');
  }
};

// Legacy function exports for backward compatibility
function pickRandom(arr) { return EmailGenerator.pickRandom(arr); }
async function generateEmail(catchAllDomain) { return EmailGenerator.generate(catchAllDomain); }
async function logEmailUsage(domain, generatedEmail) { return UsageLogger.log(domain, generatedEmail); }
async function copyToClipboard(text) { return UIUtils.copyToClipboard(text); }
async function getCurrentDomain() { return BrowserUtils.getCurrentDomain(); }
function isValidDomain(domain) { return ValidationUtils.isValidDomain(domain); }
function isValidUrl(url) { return ValidationUtils.isValidUrl(url); }
function downloadFile(data, filename, type) { return UIUtils.downloadFile(data, filename, type); }
async function loadWordlist(forceReload) { return WordlistManager.load(forceReload); }
function clearWordlistCache() { return WordlistManager.clearCache(); }
async function clearWordlistLocalCache() { return WordlistManager.clearLocalCache(); }