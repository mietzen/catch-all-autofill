/**
 * Popup script that handles the toolbar popup interface
 */

// Show status message with optional error styling
function showStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.classList.toggle('error', isError);
  status.style.opacity = 1;
  
  // Clear after 3 seconds
  setTimeout(() => {
    status.style.opacity = 0;
  }, 3000);
}

// Generate and display email
document.getElementById('generate').addEventListener('click', async () => {
  try {
    const { catchAllDomain } = await browser.storage.sync.get('catchAllDomain');
    if (!catchAllDomain) {
      document.getElementById('generated').textContent = "No domain configured";
      showStatus("Please configure a catch-all domain in settings", true);
      return;
    }

    const currentDomain = await getCurrentDomain();
    const generatedEmail = await generateEmail(catchAllDomain); // Fixed: await added
    
    await logEmailUsage(currentDomain, generatedEmail);
    
    document.getElementById('generated').textContent = generatedEmail;
    document.getElementById('copy-container').style.display = 'flex';
    
    await loadExistingEmails();
  } catch (error) {
    console.error("Error generating email:", error);
    showStatus("Error generating email", true);
  }
});

// Copy generated email to clipboard
document.getElementById('copy').addEventListener('click', async () => {
  const emailText = document.getElementById('generated').textContent;
  if (!emailText) return;
  
  const success = await copyToClipboard(emailText);
  if (success) {
    showStatus("Copied to clipboard!");
  } else {
    showStatus("Failed to copy", true);
  }
});

// Fill email forms on the current page
document.getElementById('fill-forms').addEventListener('click', async () => {
  try {
    const { catchAllDomain } = await browser.storage.sync.get('catchAllDomain');
    if (!catchAllDomain) {
      showStatus("No domain configured", true);
      return;
    }
    
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    const generatedEmail = await generateEmail(catchAllDomain); // Generate here first
    
    // Execute content script to fill forms
    await browser.tabs.executeScript(tab.id, {
      code: `
        (async function() {
          const generatedEmail = "${generatedEmail}";
          const domain = window.location.hostname;
          
          const emailFields = document.querySelectorAll('input[type="email"]');
          let filledCount = 0;
          
          for (const field of emailFields) {
            if (!field.value && !field.dataset.noCatchAllFill) {
              field.value = generatedEmail;
              field.dispatchEvent(new Event('input', { bubbles: true }));
              field.dispatchEvent(new Event('change', { bubbles: true }));
              filledCount++;
            }
          }
          
          return { filledCount, generatedEmail, domain };
        })()
      `
    }).then(async (results) => {
      const { filledCount, generatedEmail, domain } = results[0];
      
      if (filledCount > 0) {
        showStatus(`Filled ${filledCount} email field(s)`);
        await logEmailUsage(domain, generatedEmail);
        await loadExistingEmails();
      } else {
        showStatus("No empty email fields found");
      }
    });
  } catch (error) {
    console.error("Error filling forms:", error);
    showStatus("Error filling forms", true);
  }
});

// Display existing emails for the current domain
async function loadExistingEmails() {
  try {
    const currentDomain = await getCurrentDomain();
    const { usageLog = [] } = await browser.storage.sync.get('usageLog');
    
    const domainEmails = usageLog.filter(entry => entry.domain === currentDomain);
    
    const ul = document.getElementById('existing');
    ul.innerHTML = '';
    
    if (domainEmails.length === 0) {
      const li = document.createElement('li');
      li.textContent = "No emails generated yet";
      li.style.color = "#777";
      ul.appendChild(li);
      return;
    }
    
    // Display most recent 10 emails
    domainEmails
      .slice(-10)
      .reverse()
      .forEach(entry => {
        const li = document.createElement('li');
        
        const emailSpan = document.createElement('span');
        emailSpan.textContent = entry.generatedEmail;
        li.appendChild(emailSpan);
        
        const copyIcon = document.createElement('span');
        copyIcon.textContent = "📋";
        copyIcon.title = "Copy to clipboard";
        copyIcon.className = "copy-icon";
        copyIcon.addEventListener('click', () => {
          copyToClipboard(entry.generatedEmail).then(() => {
            showStatus("Copied to clipboard!");
          });
        });
        li.appendChild(copyIcon);
        
        ul.appendChild(li);
      });
  } catch (error) {
    console.error("Error loading emails:", error);
  }
}

// Open options page
document.getElementById('open-options').addEventListener('click', (e) => {
  e.preventDefault();
  browser.runtime.openOptionsPage();
});

// Initialize popup
(async () => {
  try {
    const { catchAllDomain } = await browser.storage.sync.get('catchAllDomain');
    
    // Show warning if no domain is configured
    if (!catchAllDomain) {
      document.getElementById('no-domain-warning').style.display = 'block';
    }
    
    await loadExistingEmails();
  } catch (error) {
    console.error("Error initializing popup:", error);
  }
})();