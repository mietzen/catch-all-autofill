// Common utility functions for the extension

// Default wordlist URL
const DEFAULT_WORDLIST_URL = 'https://raw.githubusercontent.com/dys2p/wordlists-de/refs/heads/main/de-7776-v1.txt';

// Fallback wordlist if URL fails
const fallbackWords = [
  "apple", "bridge", "candle", "delta", "echo", "forest", "grape",
  "hotel", "igloo", "jelly", "koala", "lemon", "monkey", "nectar",
  "omega", "pencil", "quest", "rocket", "sunset", "tiger", "umbrella",
  "violet", "whale", "xray", "yodel", "zebra"
];

// Global wordlist cache
let cachedWordlist = null;
let cachedWordlistUrl = null;

/**
 * Fetches wordlist from URL
 * @param {string} url - URL to fetch wordlist from
 * @returns {Promise<Array>} Array of words
 */
async function fetchWordlistFromUrl(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const text = await response.text();
  return parseWordlistContent(text);
}

/**
 * Loads wordlist from URL with caching
 * @param {boolean} forceReload - Force reload from URL
 * @returns {Promise<Array>} Array of words
 */
async function loadWordlist(forceReload = false) {
  try {
    const { wordlistUrl = DEFAULT_WORDLIST_URL } = await browser.storage.sync.get('wordlistUrl');
    
    // Check if we have cached wordlist for this URL
    if (!forceReload && cachedWordlist && cachedWordlistUrl === wordlistUrl) {
      return cachedWordlist;
    }
    
    // Try to load from local storage first
    if (!forceReload) {
      const cached = await browser.storage.local.get(`wordlist_${btoa(wordlistUrl).slice(0, 20)}`);
      const cacheKey = `wordlist_${btoa(wordlistUrl).slice(0, 20)}`;
      if (cached[cacheKey]) {
        cachedWordlist = cached[cacheKey];
        cachedWordlistUrl = wordlistUrl;
        return cachedWordlist;
      }
    }
    
    // Fetch from URL
    const wordlist = await fetchWordlistFromUrl(wordlistUrl);
    
    if (wordlist.length < 10) {
      throw new Error('Wordlist too small (less than 10 words)');
    }
    
    // Cache in memory and local storage
    cachedWordlist = wordlist;
    cachedWordlistUrl = wordlistUrl;
    
    const cacheKey = `wordlist_${btoa(wordlistUrl).slice(0, 20)}`;
    await browser.storage.local.set({ [cacheKey]: wordlist });
    
    return wordlist;
    
  } catch (error) {
    console.warn('Failed to load wordlist from URL, using fallback:', error);
    cachedWordlist = fallbackWords;
    cachedWordlistUrl = null;
    return fallbackWords;
  }
}

/**
 * Clears the wordlist cache
 */
function clearWordlistCache() {
  cachedWordlist = null;
  cachedWordlistUrl = null;
}

/**
 * Clears local storage cache for wordlists
 */
async function clearWordlistLocalCache() {
  // Clear all wordlist cache entries
  const storage = await browser.storage.local.get();
  const keysToRemove = Object.keys(storage).filter(key => key.startsWith('wordlist_'));
  if (keysToRemove.length > 0) {
    await browser.storage.local.remove(keysToRemove);
  }
}

/**
 * Parses a wordlist text file content
 * @param {string} content - File content
 * @returns {Array} Array of cleaned words
 */
function parseWordlistContent(content) {
  return content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'))
    .map(line => line.toLowerCase().replace(/[^a-z0-9äöüß]/g, ''))
    .filter(word => word.length >= 2);
}

/**
 * Picks a random item from an array
 * @param {Array} arr - The array to pick from
 * @returns {*} A random element from the array
 */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generates a unique email address for the given catch-all domain
 * @param {string} catchAllDomain - The domain to use (without @)
 * @returns {Promise<string>} A generated email address
 */
async function generateEmail(catchAllDomain) {
  const wordlist = await loadWordlist();
  const w1 = pickRandom(wordlist);
  const w2 = pickRandom(wordlist);
  const digits = Math.floor(100 + Math.random() * 900);
  return `${w1}_${w2}_${digits}@${catchAllDomain}`;
}

/**
 * Logs a new email usage
 * @param {string} domain - The domain where the email was used
 * @param {string} generatedEmail - The email that was generated
 * @returns {Promise} A promise that resolves when the log is updated
 */
async function logEmailUsage(domain, generatedEmail) {
  const date = new Date().toISOString();
  const { usageLog = [] } = await browser.storage.sync.get('usageLog');
  usageLog.push({ domain, date, generatedEmail });
  return browser.storage.sync.set({ usageLog });
}

/**
 * Downloads data as a file
 * @param {string} data - The content to download
 * @param {string} filename - The filename to use
 * @param {string} type - The MIME type of the file
 */
function downloadFile(data, filename, type) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Copies text to clipboard
 * @param {string} text - The text to copy
 * @returns {Promise} A promise that resolves when the text is copied
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for Firefox which might not support clipboard API in extensions
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    document.body.appendChild(textarea);
    textarea.select();
    const result = document.execCommand('copy');
    document.body.removeChild(textarea);
    return result;
  }
}

/**
 * Gets the domain from the current tab
 * @returns {Promise<string>} A promise that resolves to the current domain
 */
async function getCurrentDomain() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return new URL(tab.url).hostname;
}

/**
 * Validates an email domain
 * @param {string} domain - The domain to validate
 * @returns {boolean} Whether the domain is valid
 */
function isValidDomain(domain) {
  return /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.+[a-zA-Z]{2,}$/.test(domain);
}

/**
 * Validates a URL
 * @param {string} url - The URL to validate
 * @returns {boolean} Whether the URL is valid
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
}
