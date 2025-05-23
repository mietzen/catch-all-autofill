/**
 * Content script that runs on webpages to inject icons into email fields
 */

// Configuration
const EXTENSION_ID = 'catch-all-email-extension';
const ICON_SIZE = 20;
const ICON_PADDING = 5;

// Track processed fields to avoid duplicates
const processedFields = new WeakSet();

// Initialize the extension
(async () => {
  try {
    const { catchAllDomain } = await browser.storage.sync.get('catchAllDomain');
    if (!catchAllDomain) return; // No domain configured

    // Start observing for email fields
    initializeEmailFieldObserver();
    
    // Process existing email fields
    processExistingEmailFields();
  } catch (error) {
    console.error("Catch-All Email Autofill error:", error);
  }
})();

// Initialize mutation observer to watch for dynamically added email fields
function initializeEmailFieldObserver() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            processEmailFieldsInNode(node);
          }
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Process existing email fields on page load
function processExistingEmailFields() {
  processEmailFieldsInNode(document);
}

// Process email fields in a given node
function processEmailFieldsInNode(node) {
  const emailFields = node.querySelectorAll ? 
    node.querySelectorAll('input[type="email"]') : 
    (node.type === 'email' && node.tagName === 'INPUT' ? [node] : []);

  for (const field of emailFields) {
    if (!processedFields.has(field)) {
      processedFields.add(field);
      injectIconIntoEmailField(field);
    }
  }
}

// Inject icon into email field
function injectIconIntoEmailField(emailField) {
  // Skip if field is too small or hidden
  if (emailField.offsetWidth < 100 || emailField.offsetHeight < 20) {
    return;
  }

  // Skip if field is in a password manager or similar context
  if (emailField.closest('[data-lastpass-icon-root], [data-1password-icon]')) {
    return;
  }

  // Create wrapper div if field is not already wrapped
  let wrapper = emailField.parentElement;
  if (!wrapper.classList.contains(`${EXTENSION_ID}-wrapper`)) {
    wrapper = document.createElement('div');
    wrapper.className = `${EXTENSION_ID}-wrapper`;
    wrapper.style.cssText = `
      position: relative;
      display: inline-block;
      width: 100%;
    `;
    
    emailField.parentNode.insertBefore(wrapper, emailField);
    wrapper.appendChild(emailField);
  }

  // Create the icon
  const icon = document.createElement('div');
  icon.className = `${EXTENSION_ID}-icon`;
  icon.innerHTML = '📧'; // Email icon
  icon.title = 'Generate catch-all email';
  
  // Style the icon
  icon.style.cssText = `
    position: absolute;
    right: ${ICON_PADDING}px;
    top: 50%;
    transform: translateY(-50%);
    width: ${ICON_SIZE}px;
    height: ${ICON_SIZE}px;
    cursor: pointer;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    background: #f0f0f0;
    border-radius: 3px;
    border: 1px solid #ccc;
    transition: all 0.2s ease;
    user-select: none;
  `;

  // Add hover effect
  icon.addEventListener('mouseenter', () => {
    icon.style.background = '#e0e0e0';
    icon.style.transform = 'translateY(-50%) scale(1.1)';
  });

  icon.addEventListener('mouseleave', () => {
    icon.style.background = '#f0f0f0';
    icon.style.transform = 'translateY(-50%) scale(1)';
  });

  // Add click handler
  icon.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const { catchAllDomain } = await browser.storage.sync.get('catchAllDomain');
      if (!catchAllDomain) {
        showNotification('No catch-all domain configured. Please set one in the extension settings.', true);
        return;
      }

      // Generate email - Fixed: now using async function
      const generatedEmail = await generateEmail(catchAllDomain);
      
      // Fill the field
      emailField.value = generatedEmail;
      emailField.focus();
      
      // Trigger events
      emailField.dispatchEvent(new Event('input', { bubbles: true }));
      emailField.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Log usage
      const domain = window.location.hostname;
      await logEmailUsage(domain, generatedEmail);
      
      // Show confirmation
      showNotification(`Generated email: ${generatedEmail}`);
      
      // Brief visual feedback
      icon.style.background = '#4CAF50';
      icon.innerHTML = '✓';
      setTimeout(() => {
        icon.style.background = '#f0f0f0';
        icon.innerHTML = '✉️';
      }, 1000);
      
    } catch (error) {
      console.error('Error generating email:', error);
      showNotification('Error generating email', true);
    }
  });

  // Adjust field padding to make room for icon
  const currentPaddingRight = window.getComputedStyle(emailField).paddingRight;
  const paddingValue = parseInt(currentPaddingRight) || 0;
  emailField.style.paddingRight = `${Math.max(paddingValue, ICON_SIZE + ICON_PADDING * 2)}px`;

  // Add icon to wrapper
  wrapper.appendChild(icon);

  // Handle field focus/blur for icon visibility
  emailField.addEventListener('focus', () => {
    icon.style.opacity = '1';
  });

  emailField.addEventListener('blur', () => {
    // Keep icon visible if field has value or on hover
    if (!emailField.value && !wrapper.matches(':hover')) {
      icon.style.opacity = '0.7';
    }
  });

  // Initially set opacity based on field state
  icon.style.opacity = emailField.value ? '1' : '0.7';
}

// Generate email function - Fixed: now async and uses loadWordlist
async function generateEmail(catchAllDomain) {
  try {
    // Load wordlist from storage
    const { customWordlist, useCustomWordlist } = await browser.storage.sync.get(['customWordlist', 'useCustomWordlist']);
    
    let wordlist;
    if (useCustomWordlist && customWordlist && customWordlist.length > 0) {
      wordlist = customWordlist;
    } else {
      // Fallback to default wordlist
      wordlist = [
        "apple", "bridge", "candle", "delta", "echo", "forest", "grape",
        "hotel", "igloo", "jelly", "koala", "lemon", "monkey", "nectar",
        "omega", "pencil", "quest", "rocket", "sunset", "tiger", "umbrella",
        "violet", "whale", "xray", "yodel", "zebra"
      ];
    }
    
    function pickRandom(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }
    
    const w1 = pickRandom(wordlist);
    const w2 = pickRandom(wordlist);
    const digits = Math.floor(100 + Math.random() * 900);
    return `${w1}_${w2}_${digits}@${catchAllDomain}`;
  } catch (error) {
    console.error('Error loading wordlist:', error);
    // Fallback to simple generation
    const digits = Math.floor(100000 + Math.random() * 900000);
    return `temp_${digits}@${catchAllDomain}`;
  }
}

// Log email usage function
async function logEmailUsage(domain, generatedEmail) {
  const date = new Date().toISOString();
  const { usageLog = [] } = await browser.storage.sync.get('usageLog');
  usageLog.push({ domain, date, generatedEmail });
  return browser.storage.sync.set({ usageLog });
}

// Show notification function
function showNotification(message, isError = false) {
  // Remove existing notification
  const existing = document.querySelector(`.${EXTENSION_ID}-notification`);
  if (existing) {
    existing.remove();
  }

  const notification = document.createElement('div');
  notification.className = `${EXTENSION_ID}-notification`;
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
  document.body.appendChild(notification);
  
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
    }, 300);
  }, 3000);
}