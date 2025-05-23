/**
 * Background script for the extension
 * Handles notifications, context menu, and other background tasks
 */

// Set up context menu for generating emails
browser.contextMenus.create({
  id: "generate-email",
  title: "Generate Email for this field",
  contexts: ["editable"]
});

// Handle context menu clicks
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "generate-email") {
    const { catchAllDomain } = await browser.storage.sync.get('catchAllDomain');
    
    if (!catchAllDomain) {
      await browser.notifications.create({
        type: "basic",
        iconUrl: browser.runtime.getURL("icons/icon-48.png"),
        title: "Catch-All Email Autofill",
        message: "Please set a catch-all domain in the extension options"
      });
      browser.runtime.openOptionsPage();
      return;
    }
    
    // Generate email first, then inject
    const generatedEmail = await generateEmail(catchAllDomain);
    
    // Inject the pre-generated email
    await browser.tabs.executeScript(tab.id, {
      code: `
        (async function() {
          const generatedEmail = "${generatedEmail}";
          
          // Insert the email into the active element if it's an input field
          const activeElement = document.activeElement;
          if (activeElement && 
              (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) {
            
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
      `
    }).then(async (results) => {
      const result = results[0];
      
      if (result && result.success) {
        // Log the email usage
        const domain = new URL(tab.url).hostname;
        
        const { usageLog = [] } = await browser.storage.sync.get('usageLog');
        usageLog.push({
          domain,
          date: new Date().toISOString(),
          generatedEmail: result.email
        });
        await browser.storage.sync.set({ usageLog });
      }
    });
  }
});

// Listen for installation or update
browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    // Open options page on first install to configure catch-all domain
    browser.runtime.openOptionsPage();
  } else if (details.reason === "update") {
    // Check if we need to migrate data from older versions
    await migrateDataIfNeeded();
  }
});

// Migrate data from older versions if needed
async function migrateDataIfNeeded() {
  try {
    const { dataVersion } = await browser.storage.sync.get('dataVersion');
    
    // If no version or older version, perform migrations
    if (!dataVersion || dataVersion < 2) {
      // Example migration: restructure usage log format
      const { usageLog = [] } = await browser.storage.sync.get('usageLog');
      
      // Check if the log needs migration (example: adding missing fields)
      let needsMigration = false;
      for (const entry of usageLog) {
        if (!entry.hasOwnProperty('date')) {
          needsMigration = true;
          break;
        }
      }
      
      if (needsMigration) {
        const migratedLog = usageLog.map(entry => {
          // Ensure all required fields exist
          return {
            domain: entry.domain || "unknown",
            date: entry.date || new Date().toISOString(),
            generatedEmail: entry.generatedEmail || ""
          };
        });
        
        await browser.storage.sync.set({ usageLog: migratedLog });
      }
      
      // Update the data version
      await browser.storage.sync.set({ dataVersion: 2 });
    }
  } catch (error) {
    console.error("Error during data migration:", error);
  }
}

// Listen for messages from other parts of the extension
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "showNotification") {
    await browser.notifications.create({
      type: "basic",
      iconUrl: browser.runtime.getURL("icons/icon-48.png"),
      title: message.title || "Catch-All Email Autofill",
      message: message.message
    });
    sendResponse({ success: true });
  }
});