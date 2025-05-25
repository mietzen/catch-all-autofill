/**
 * Refactored background script for the extension
 * Handles notifications, context menu, and other background tasks
 */

class BackgroundController {
  constructor() {
    this.init();
  }

  init() {
    this.setupContextMenu();
    this.setupEventListeners();
  }

  setupContextMenu() {
    browser.contextMenus.create({
      id: CONFIG.EXTENSION_ID,
      title: "Generate Email for this field",
      contexts: ["editable"]
    });
  }

  setupEventListeners() {
    browser.contextMenus.onClicked.addListener((info, tab) => this.handleContextMenuClick(info, tab));
    browser.runtime.onInstalled.addListener((details) => this.handleInstallation(details));
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => this.handleMessage(message, sender, sendResponse));
  }

  async handleContextMenuClick(info, tab) {
    if (info.menuItemId !== CONFIG.EXTENSION_ID) return;

    try {
      const catchAllDomain = await this.getCatchAllDomain();

      if (!catchAllDomain) {
        await this.showNoDomainNotification();
        browser.runtime.openOptionsPage();
        return;
      }

      const generatedEmail = await EmailGenerator.generate(catchAllDomain);
      const success = await this.injectEmailIntoField(tab, generatedEmail);

      if (success) {
        await this.logEmailUsage(tab, generatedEmail);
      }
    } catch (error) {
      console.error("Error handling context menu click:", error);
    }
  }

  async getCatchAllDomain() {
    const { [CONFIG.STORAGE_KEYS.CATCH_ALL_DOMAIN]: catchAllDomain } =
      await StorageUtils.get(CONFIG.STORAGE_KEYS.CATCH_ALL_DOMAIN);
    return catchAllDomain;
  }

  async showNoDomainNotification() {
    return browser.notifications.create({
      type: "basic",
      iconUrl: browser.runtime.getURL("src/assests/icons/icon-48.png"),
      title: CONFIG.EXTENSION_ID,
      message: "Please set a catch-all domain in the extension options"
    });
  }

  async injectEmailIntoField(tab, generatedEmail) {
    try {
      const results = await BrowserUtils.executeScript(tab.id,
        this.generateInjectionScript(generatedEmail)
      );

      return results[0]?.success || false;
    } catch (error) {
      console.error("Error injecting email:", error);
      return false;
    }
  }

  generateInjectionScript(generatedEmail) {
    return `
      (async function() {
        const generatedEmail = "${generatedEmail}";
        
        // Insert the email into the active element if it's an input field
        const activeElement = document.activeElement;
        if (activeElement && 
            (activeElement.tagName === 'INPUT' || 
             activeElement.tagName === 'TEXTAREA' || 
             activeElement.isContentEditable)) {
          
          if (activeElement.isContentEditable) {
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(generatedEmail));
          } else {
            activeElement.value = generatedEmail;
            
            // Fire input and change events to ensure form validation is triggered
            activeElement.dispatchEvent(new Event('input', { bubbles: true }));
            activeElement.dispatchEvent(new Event('change', { bubbles: true }));
          }
          
          return { success: true, email: generatedEmail };
        }
        
        return { success: false };
      })();
    `;
  }

  async logEmailUsage(tab, generatedEmail) {
    try {
      const domain = new URL(tab.url).hostname;
      await UsageLogger.log(domain, generatedEmail);
    } catch (error) {
      console.error("Error logging email usage:", error);
    }
  }

  async handleInstallation(details) {
    try {
      if (details.reason === "install") {
        browser.runtime.openOptionsPage();
      } else if (details.reason === "update") {
        await this.migrateDataIfNeeded();
      }
    } catch (error) {
      console.error("Error handling installation:", error);
    }
  }

  async migrateDataIfNeeded() {
    try {
      const { [CONFIG.STORAGE_KEYS.DATA_VERSION]: dataVersion } =
        await StorageUtils.get(CONFIG.STORAGE_KEYS.DATA_VERSION);

      if (!dataVersion || dataVersion < CONFIG.DATA_VERSION) {
        await this.performMigration(dataVersion);
        await StorageUtils.set({ [CONFIG.STORAGE_KEYS.DATA_VERSION]: CONFIG.DATA_VERSION });
      }
    } catch (error) {
      console.error("Error during data migration:", error);
    }
  }

  async performMigration(currentVersion) {
    if (!currentVersion || currentVersion < 2) {
      await this.migrateUsageLogFormat();
    }
    // Add future migrations here as needed
  }

  async migrateUsageLogFormat() {
    const { [CONFIG.STORAGE_KEYS.USAGE_LOG]: usageLog = [] } =
      await StorageUtils.get(CONFIG.STORAGE_KEYS.USAGE_LOG);

    let needsMigration = false;
    for (const entry of usageLog) {
      if (!entry.hasOwnProperty('date')) {
        needsMigration = true;
        break;
      }
    }

    if (needsMigration) {
      const migratedLog = usageLog.map(entry => ({
        domain: entry.domain || "unknown",
        date: entry.date || new Date().toISOString(),
        generatedEmail: entry.generatedEmail || ""
      }));

      await StorageUtils.set({ [CONFIG.STORAGE_KEYS.USAGE_LOG]: migratedLog });
    }
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      if (message.action === "showNotification") {
        await this.showNotification(message);
        sendResponse({ success: true });
      }
    } catch (error) {
      console.error("Error handling message:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async showNotification(message) {
    return browser.notifications.create({
      type: "basic",
      iconUrl: browser.runtime.getURL("src/assests/icons/icon-48.png"),
      title: message.title || CONFIG.EXTENSION_ID,
      message: message.message
    });
  }
}

// Initialize background controller
new BackgroundController();