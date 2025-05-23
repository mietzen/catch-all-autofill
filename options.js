/**
 * Options page script for managing settings and viewing history
 */

// Show status message
function showStatus(message, isError = false) {
  const statusElement = document.getElementById('status');
  statusElement.textContent = message;
  statusElement.className = isError ? 'status-error' : '';
  statusElement.style.opacity = 1;
  
  setTimeout(() => {
    statusElement.style.opacity = 0;
  }, 3000);
}

// Save domain
document.getElementById('save').addEventListener('click', async () => {
  const domain = document.getElementById('domain').value.trim();
  
  if (!domain) {
    showStatus("Please enter a domain", true);
    return;
  }
  
  if (!isValidDomain(domain)) {
    showStatus("Please enter a valid domain", true);
    return;
  }
  
  try {
    await browser.storage.sync.set({ catchAllDomain: domain });
    showStatus("Domain saved successfully!");
    updateExampleEmail(domain);
  } catch (error) {
    console.error("Error saving domain:", error);
    showStatus("Error saving domain", true);
  }
});

// Save wordlist URL
document.getElementById('save-wordlist-url').addEventListener('click', async () => {
  const url = document.getElementById('wordlist-url').value.trim();
  
  if (!url) {
    showStatus("Please enter a wordlist URL", true);
    return;
  }
  
  if (!isValidUrl(url)) {
    showStatus("Please enter a valid URL", true);
    return;
  }
  
  try {
    // Test the URL first
    showStatus("Testing URL...");
    await fetch(url);
    
    await browser.storage.sync.set({ wordlistUrl: url });
    
    // Clear cache and reload wordlist
    clearWordlistCache();
    await clearWordlistLocalCache();
    
    showStatus("Wordlist URL saved! Reloading wordlist...");
    await updateWordlistStatus();
    await updateExampleEmail(document.getElementById('domain').value);
  } catch (error) {
    console.error("Error saving wordlist URL:", error);
    showStatus("Error: Could not fetch wordlist from URL", true);
  }
});

// Reset to default wordlist URL
document.getElementById('reset-wordlist-url').addEventListener('click', async () => {
  if (confirm('Reset to default wordlist URL?')) {
    try {
      const defaultUrl = 'https://raw.githubusercontent.com/dys2p/wordlists-de/refs/heads/main/de-7776-v1.txt';
      document.getElementById('wordlist-url').value = defaultUrl;
      
      await browser.storage.sync.set({ wordlistUrl: defaultUrl });
      
      // Clear cache and reload wordlist
      clearWordlistCache();
      await clearWordlistLocalCache();
      
      showStatus("Reset to default wordlist URL");
      await updateWordlistStatus();
      await updateExampleEmail(document.getElementById('domain').value);
    } catch (error) {
      console.error("Error resetting wordlist URL:", error);
      showStatus("Error resetting wordlist URL", true);
    }
  }
});

// Reload wordlist from URL
document.getElementById('reload-wordlist').addEventListener('click', async () => {
  try {
    showStatus("Reloading wordlist...");
    
    // Force reload from URL
    clearWordlistCache();
    await clearWordlistLocalCache();
    await loadWordlist(true);
    
    showStatus("Wordlist reloaded successfully!");
    await updateWordlistStatus();
    await updateExampleEmail(document.getElementById('domain').value);
  } catch (error) {
    console.error("Error reloading wordlist:", error);
    showStatus("Error reloading wordlist", true);
  }
});

// Update example email when domain changes
document.getElementById('domain').addEventListener('input', function() {
  updateExampleEmail(this.value.trim());
});

// Update example email display
async function updateExampleEmail(domain) {
  const exampleDomain = domain || 'yourdomain.com';
  try {
    const wordlist = await loadWordlist();
    const w1 = pickRandom(wordlist);
    const w2 = pickRandom(wordlist);
    const digits = Math.floor(100 + Math.random() * 900);
    
    document.getElementById('example-email').textContent = 
      `${w1}_${w2}_${digits}@${exampleDomain}`;
  } catch (error) {
    document.getElementById('example-email').textContent = 
      `word_word_123@${exampleDomain}`;
  }
}

// Update wordlist status display
async function updateWordlistStatus() {
  try {
    const { wordlistUrl = 'https://raw.githubusercontent.com/dys2p/wordlists-de/refs/heads/main/de-7776-v1.txt' } = 
      await browser.storage.sync.get('wordlistUrl');
    
    const wordlist = await loadWordlist();
    const isDefault = wordlistUrl === 'https://raw.githubusercontent.com/dys2p/wordlists-de/refs/heads/main/de-7776-v1.txt';
    
    document.getElementById('wordlist-status').textContent = 
      `${isDefault ? 'Default' : 'Custom'} (${wordlist.length} words)`;
    
    document.getElementById('wordlist-preview').textContent = 
      wordlist.slice(0, 5).join(', ') + (wordlist.length > 5 ? '...' : '');
    
    // Show current URL in input
    document.getElementById('wordlist-url').value = wordlistUrl;
    
  } catch (error) {
    console.error("Error updating wordlist status:", error);
    document.getElementById('wordlist-status').textContent = "Error loading";
    document.getElementById('wordlist-preview').textContent = "Error";
  }
}

// Download usage log as JSON
document.getElementById('download-json').addEventListener('click', async () => {
  try {
    const { usageLog = [] } = await browser.storage.sync.get('usageLog');
    if (usageLog.length === 0) {
      showStatus("No data to export", true);
      return;
    }
    
    const data = JSON.stringify(usageLog, null, 2);
    const filename = `email_log_${new Date().toISOString().slice(0, 10)}.json`;
    downloadFile(data, filename, 'application/json');
    showStatus("JSON file downloaded");
  } catch (error) {
    console.error("Error downloading JSON:", error);
    showStatus("Error downloading file", true);
  }
});

// Download usage log as CSV
document.getElementById('download-csv').addEventListener('click', async () => {
  try {
    const { usageLog = [] } = await browser.storage.sync.get('usageLog');
    if (usageLog.length === 0) {
      showStatus("No data to export", true);
      return;
    }
    
    const headers = "email,domain,date\n";
    const csvContent = headers + 
      usageLog.map(e => `"${e.generatedEmail}","${e.domain}","${e.date}"`).join('\n');
    
    const filename = `email_log_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadFile(csvContent, filename, 'text/csv');
    showStatus("CSV file downloaded");
  } catch (error) {
    console.error("Error downloading CSV:", error);
    showStatus("Error downloading file", true);
  }
});

// Filter logs by domain
document.getElementById('filter-domain').addEventListener('input', function() {
  loadLogData(this.value);
});

// Clear filter
document.getElementById('clear-filter').addEventListener('click', function() {
  document.getElementById('filter-domain').value = '';
  loadLogData('');
});

// Clear all history
document.getElementById('clear-history').addEventListener('click', async () => {
  if (confirm('Are you sure you want to delete ALL email history? This cannot be undone.')) {
    try {
      await browser.storage.sync.set({ usageLog: [] });
      showStatus("All history cleared");
      loadLogData('');
    } catch (error) {
      console.error("Error clearing history:", error);
      showStatus("Error clearing history", true);
    }
  }
});

// Load and display email usage log
async function loadLogData(domainFilter = '') {
  try {
    const { usageLog = [] } = await browser.storage.sync.get('usageLog');
    const logTable = document.getElementById('log');
    logTable.innerHTML = '';
    
    // Apply domain filter if provided
    const filteredLog = domainFilter 
      ? usageLog.filter(entry => entry.domain.includes(domainFilter))
      : usageLog;
    
    if (filteredLog.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 4;
      cell.textContent = domainFilter 
        ? "No emails found for this domain filter" 
        : "No emails generated yet";
      cell.style.textAlign = 'center';
      cell.style.padding = '20px';
      cell.style.color = '#737373';
      row.appendChild(cell);
      logTable.appendChild(row);
      return;
    }
    
    // Sort by date (newest first)
    filteredLog
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach(entry => {
        const row = document.createElement('tr');
        
        // Email column
        const emailCell = document.createElement('td');
        emailCell.textContent = entry.generatedEmail;
        row.appendChild(emailCell);
        
        // Domain column
        const domainCell = document.createElement('td');
        domainCell.textContent = entry.domain;
        row.appendChild(domainCell);
        
        // Date column
        const dateCell = document.createElement('td');
        const date = new Date(entry.date);
        dateCell.textContent = date.toLocaleString();
        row.appendChild(dateCell);
        
        // Actions column
        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions';
        
        // Copy button
        const copyButton = document.createElement('button');
        copyButton.className = 'icon-button';
        copyButton.textContent = '📋';
        copyButton.title = 'Copy email';
        copyButton.addEventListener('click', () => {
          copyToClipboard(entry.generatedEmail).then(() => {
            showStatus('Email copied to clipboard!');
          });
        });
        actionsCell.appendChild(copyButton);
        
        // Delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'icon-button';
        deleteButton.textContent = '🗑️';
        deleteButton.title = 'Delete entry';
        deleteButton.addEventListener('click', async () => {
          if (confirm('Delete this email entry?')) {
            try {
              const { usageLog = [] } = await browser.storage.sync.get('usageLog');
              const newLog = usageLog.filter(e => 
                e.generatedEmail !== entry.generatedEmail || 
                e.domain !== entry.domain ||
                e.date !== entry.date
              );
              await browser.storage.sync.set({ usageLog: newLog });
              showStatus('Entry deleted');
              loadLogData(document.getElementById('filter-domain').value);
            } catch (error) {
              console.error('Error deleting entry:', error);
              showStatus('Error deleting entry', true);
            }
          }
        });
        actionsCell.appendChild(deleteButton);
        
        row.appendChild(actionsCell);
        logTable.appendChild(row);
      });
  } catch (error) {
    console.error("Error loading log data:", error);
    showStatus("Error loading log data", true);
  }
}

// Initialize the options page
(async () => {
  try {
    // Load catch-all domain if set
    const { catchAllDomain } = await browser.storage.sync.get('catchAllDomain');
    if (catchAllDomain) {
      document.getElementById('domain').value = catchAllDomain;
      updateExampleEmail(catchAllDomain);
    }
    
    // Update wordlist status display
    await updateWordlistStatus();
    
    // Load email history
    await loadLogData();
  } catch (error) {
    console.error("Error initializing options page:", error);
  }
})();