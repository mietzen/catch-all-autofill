/**
 * Refactored options page script for managing settings and viewing history
 */

class OptionsController {
  constructor() {
    this.init();
  }

  async init() {
    try {
      this.setupEventListeners();
      await this.initializeUI();
    } catch (error) {
      console.error("Error initializing options page:", error);
    }
  }

  setupEventListeners() {
    // Domain settings
    document.getElementById('save').addEventListener('click', () => this.handleSaveDomain());
    document.getElementById('domain').addEventListener('input', (e) => this.updateExampleEmail(e.target.value.trim()));
    
    // Wordlist settings
    document.getElementById('save-wordlist-url').addEventListener('click', () => this.handleSaveWordlistUrl());
    document.getElementById('reset-wordlist-url').addEventListener('click', () => this.handleResetWordlistUrl());
    document.getElementById('reload-wordlist').addEventListener('click', () => this.handleReloadWordlist());
    
    // Export functions
    document.getElementById('download-json').addEventListener('click', () => this.handleExportJson());
    document.getElementById('download-csv').addEventListener('click', () => this.handleExportCsv());
    
    // History management
    document.getElementById('filter-domain').addEventListener('input', (e) => this.loadLogData(e.target.value));
    document.getElementById('clear-filter').addEventListener('click', () => this.handleClearFilter());
    document.getElementById('clear-history').addEventListener('click', () => this.handleClearHistory());
  }

  async initializeUI() {
    await this.loadDomainSettings();
    await this.updateWordlistStatus();
    await this.loadLogData();
  }

  showStatus(message, isError = false) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = isError ? 'status-error' : '';
    statusElement.style.opacity = 1;
    
    setTimeout(() => {
      statusElement.style.opacity = 0;
    }, CONFIG.ANIMATION.NOTIFICATION_DURATION);
  }

  async loadDomainSettings() {
    const { [CONFIG.STORAGE_KEYS.CATCH_ALL_DOMAIN]: catchAllDomain } = 
      await StorageUtils.get(CONFIG.STORAGE_KEYS.CATCH_ALL_DOMAIN);
    
    if (catchAllDomain) {
      document.getElementById('domain').value = catchAllDomain;
      this.updateExampleEmail(catchAllDomain);
    }
  }

  async handleSaveDomain() {
    const domain = document.getElementById('domain').value.trim();
    
    if (!domain) {
      this.showStatus("Please enter a domain", true);
      return;
    }
    
    if (!ValidationUtils.isValidDomain(domain)) {
      this.showStatus("Please enter a valid domain", true);
      return;
    }
    
    try {
      await StorageUtils.set({ [CONFIG.STORAGE_KEYS.CATCH_ALL_DOMAIN]: domain });
      this.showStatus("Domain saved successfully!");
      this.updateExampleEmail(domain);
    } catch (error) {
      console.error("Error saving domain:", error);
      this.showStatus("Error saving domain", true);
    }
  }

  async handleSaveWordlistUrl() {
    const url = document.getElementById('wordlist-url').value.trim();
    
    if (!url) {
      this.showStatus("Please enter a wordlist URL", true);
      return;
    }
    
    if (!ValidationUtils.isValidUrl(url)) {
      this.showStatus("Please enter a valid URL", true);
      return;
    }
    
    try {
      this.showStatus("Testing URL...");
      await fetch(url);
      
      await StorageUtils.set({ [CONFIG.STORAGE_KEYS.WORDLIST_URL]: url });
      
      WordlistManager.clearCache();
      await WordlistManager.clearLocalCache();
      
      this.showStatus("Wordlist URL saved! Reloading wordlist...");
      await this.updateWordlistStatus();
      await this.updateExampleEmail(document.getElementById('domain').value);
    } catch (error) {
      console.error("Error saving wordlist URL:", error);
      this.showStatus("Error: Could not fetch wordlist from URL", true);
    }
  }

  async handleResetWordlistUrl() {
    if (!confirm('Reset to default wordlist URL?')) return;
    
    try {
      document.getElementById('wordlist-url').value = CONFIG.URLS.DEFAULT_WORDLIST;
      
      await StorageUtils.set({ [CONFIG.STORAGE_KEYS.WORDLIST_URL]: CONFIG.URLS.DEFAULT_WORDLIST });
      
      WordlistManager.clearCache();
      await WordlistManager.clearLocalCache();
      
      this.showStatus("Reset to default wordlist URL");
      await this.updateWordlistStatus();
      await this.updateExampleEmail(document.getElementById('domain').value);
    } catch (error) {
      console.error("Error resetting wordlist URL:", error);
      this.showStatus("Error resetting wordlist URL", true);
    }
  }

  async handleReloadWordlist() {
    try {
      this.showStatus("Reloading wordlist...");
      
      WordlistManager.clearCache();
      await WordlistManager.clearLocalCache();
      await WordlistManager.load(true);
      
      this.showStatus("Wordlist reloaded successfully!");
      await this.updateWordlistStatus();
      await this.updateExampleEmail(document.getElementById('domain').value);
    } catch (error) {
      console.error("Error reloading wordlist:", error);
      this.showStatus("Error reloading wordlist", true);
    }
  }

  async updateExampleEmail(domain) {
    const exampleDomain = domain || 'yourdomain.com';
    try {
      const wordlist = await WordlistManager.load();
      const w1 = EmailGenerator.pickRandom(wordlist);
      const w2 = EmailGenerator.pickRandom(wordlist);
      const digits = EmailGenerator.generateDigits();
      
      document.getElementById('example-email').textContent = 
        `${w1}_${w2}_${digits}@${exampleDomain}`;
    } catch (error) {
      document.getElementById('example-email').textContent = 
        `word_word_123@${exampleDomain}`;
    }
  }

  async updateWordlistStatus() {
    try {
      const { [CONFIG.STORAGE_KEYS.WORDLIST_URL]: wordlistUrl = CONFIG.URLS.DEFAULT_WORDLIST } = 
        await StorageUtils.get(CONFIG.STORAGE_KEYS.WORDLIST_URL);
      
      const wordlist = await WordlistManager.load();
      const isDefault = wordlistUrl === CONFIG.URLS.DEFAULT_WORDLIST;
      
      document.getElementById('wordlist-status').textContent = 
        `${isDefault ? 'Default' : 'Custom'} (${wordlist.length} words)`;
      
      document.getElementById('wordlist-preview').textContent = 
        wordlist.slice(0, 5).join(', ') + (wordlist.length > 5 ? '...' : '');
      
      document.getElementById('wordlist-url').value = wordlistUrl;
      
    } catch (error) {
      console.error("Error updating wordlist status:", error);
      document.getElementById('wordlist-status').textContent = "Error loading";
      document.getElementById('wordlist-preview').textContent = "Error";
    }
  }

  async handleExportJson() {
    try {
      await ExportUtils.exportAsJson();
      this.showStatus("JSON file downloaded");
    } catch (error) {
      console.error("Error downloading JSON:", error);
      this.showStatus(error.message === 'No data to export' ? error.message : "Error downloading file", true);
    }
  }

  async handleExportCsv() {
    try {
      await ExportUtils.exportAsCsv();
      this.showStatus("CSV file downloaded");
    } catch (error) {
      console.error("Error downloading CSV:", error);
      this.showStatus(error.message === 'No data to export' ? error.message : "Error downloading file", true);
    }
  }

  handleClearFilter() {
    document.getElementById('filter-domain').value = '';
    this.loadLogData('');
  }

  async handleClearHistory() {
    if (!confirm('Are you sure you want to delete ALL email history? This cannot be undone.')) return;
    
    try {
      await UsageLogger.clearLog();
      this.showStatus("All history cleared");
      this.loadLogData('');
    } catch (error) {
      console.error("Error clearing history:", error);
      this.showStatus("Error clearing history", true);
    }
  }

  async loadLogData(domainFilter = '') {
    try {
      const usageLog = await UsageLogger.getLog();
      const logTable = document.getElementById('log');
      logTable.innerHTML = '';
      
      const filteredLog = domainFilter 
        ? usageLog.filter(entry => entry.domain.includes(domainFilter))
        : usageLog;
      
      if (filteredLog.length === 0) {
        this.renderEmptyLogTable(logTable, domainFilter);
        return;
      }
      
      this.renderLogTable(logTable, filteredLog);
    } catch (error) {
      console.error("Error loading log data:", error);
      this.showStatus("Error loading log data", true);
    }
  }

  renderEmptyLogTable(table, domainFilter) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.textContent = domainFilter 
      ? "No emails found for this domain filter" 
      : "No emails generated yet";
    cell.style.cssText = 'text-align: center; padding: 20px; color: #737373;';
    row.appendChild(cell);
    table.appendChild(row);
  }

  renderLogTable(table, filteredLog) {
    filteredLog
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach(entry => {
        const row = this.createLogRow(entry);
        table.appendChild(row);
      });
  }

  createLogRow(entry) {
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
    const actionsCell = this.createActionsCell(entry);
    row.appendChild(actionsCell);
    
    return row;
  }

  createActionsCell(entry) {
    const actionsCell = document.createElement('td');
    actionsCell.className = 'actions';
    
    // Copy button
    const copyButton = this.createActionButton(
      CONFIG.ICON.COPY_EMOJI, 
      'Copy email',
      async () => {
        const success = await UIUtils.copyToClipboard(entry.generatedEmail);
        this.showStatus(success ? 'Email copied to clipboard!' : 'Failed to copy', !success);
      }
    );
    actionsCell.appendChild(copyButton);
    
    // Delete button
    const deleteButton = this.createActionButton(
      CONFIG.ICON.DELETE_EMOJI,
      'Delete entry',
      () => this.handleDeleteEntry(entry)
    );
    actionsCell.appendChild(deleteButton);
    
    return actionsCell;
  }

  createActionButton(emoji, title, onClick) {
    const button = document.createElement('button');
    button.className = 'icon-button';
    button.textContent = emoji;
    button.title = title;
    button.addEventListener('click', onClick);
    return button;
  }

  async handleDeleteEntry(entry) {
    if (!confirm('Delete this email entry?')) return;
    
    try {
      await UsageLogger.deleteEntry(entry);
      this.showStatus('Entry deleted');
      this.loadLogData(document.getElementById('filter-domain').value);
    } catch (error) {
      console.error('Error deleting entry:', error);
      this.showStatus('Error deleting entry', true);
    }
  }
}

// Initialize options controller
new OptionsController();