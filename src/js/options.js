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
    document.getElementById('wordlist-selection').addEventListener('change', (e) => this.handleWordlistSelectionChange(e.target.value));
    document.getElementById('save-wordlist-url').addEventListener('click', () => this.handleSaveWordlistUrl());
    document.getElementById('reload-wordlist').addEventListener('click', () => this.handleReloadWordlist());

    // GitHub backup settings
    document.getElementById('test-github-connection').addEventListener('click', () => this.handleTestGitHubConnection());
    document.getElementById('save-github-config').addEventListener('click', () => this.handleSaveGitHubConfig());
    document.getElementById('manual-backup').addEventListener('click', () => this.handleManualBackup());
    document.getElementById('show-github-help').addEventListener('click', (e) => this.toggleGitHubHelp(e));

    // Export/Import functions
    document.getElementById('export-backup').addEventListener('click', () => this.handleExportBackup());
    document.getElementById('import-backup').addEventListener('click', () => this.handleImportBackup());
    document.getElementById('import-file').addEventListener('change', (e) => this.handleFileSelected(e));

    // History management
    document.getElementById('filter-domain').addEventListener('input', (e) => this.loadLogData(e.target.value));
    document.getElementById('clear-filter').addEventListener('click', () => this.handleClearFilter());
    document.getElementById('clear-history').addEventListener('click', () => this.handleClearHistory());
  }

  async initializeUI() {
    await this.loadDomainSettings();
    await this.setupWordlistDropdown();
    await this.updateWordlistStatus();
    await this.loadGitHubSettings();
    await this.updateGitHubStatus();
    await this.loadLogData();
  }

  async setupWordlistDropdown() {
    const dropdown = document.getElementById('wordlist-selection');
    dropdown.innerHTML = '';

    // Add local wordlist options
    CONFIG.WORDLISTS.AVAILABLE.forEach(wordlist => {
      const option = document.createElement('option');
      option.value = wordlist.code;
      option.textContent = wordlist.name;
      dropdown.appendChild(option);
    });

    // Add custom option
    const customOption = document.createElement('option');
    customOption.value = CONFIG.WORDLISTS.CUSTOM_KEY;
    customOption.textContent = 'Custom URL';
    dropdown.appendChild(customOption);

    // Load current selection
    const currentSelection = await WordlistManager.getCurrentSelection();
    dropdown.value = currentSelection;
    
    this.toggleCustomUrlField(currentSelection === CONFIG.WORDLISTS.CUSTOM_KEY);
  }

  getFlagEmoji(countryCode) {
    // Convert country code to flag emoji
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
  }

  toggleCustomUrlField(isCustom) {
    const urlContainer = document.getElementById('custom-url-container');
    const urlField = document.getElementById('wordlist-url');
    const saveButton = document.getElementById('save-wordlist-url');
    
    if (isCustom) {
      urlContainer.style.display = 'block';
      urlField.required = true;
    } else {
      urlContainer.style.display = 'none';
      urlField.required = false;
    }
  }

  async handleWordlistSelectionChange(selection) {
    try {
      this.toggleCustomUrlField(selection === CONFIG.WORDLISTS.CUSTOM_KEY);
      
      if (selection !== CONFIG.WORDLISTS.CUSTOM_KEY) {
        // Save local wordlist selection immediately
        await StorageUtils.set({ [CONFIG.STORAGE_KEYS.WORDLIST_SELECTION]: selection });
        WordlistManager.clearCache();
        await this.updateWordlistStatus();
        await this.updateExampleEmail(document.getElementById('domain').value);
        this.showStatus(`Switched to ${WordlistManager.getWordlistInfo(selection).name} wordlist`);
      }
    } catch (error) {
      console.error("Error changing wordlist selection:", error);
      this.showStatus("Error changing wordlist", true);
    }
  }

  async handleSaveWordlistUrl() {
    const url = document.getElementById('wordlist-url').value.trim();
    const selection = document.getElementById('wordlist-selection').value;

    if (selection !== CONFIG.WORDLISTS.CUSTOM_KEY) {
      this.showStatus("Custom URL only needed when 'Custom URL' is selected", true);
      return;
    }

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

      await StorageUtils.set({ 
        [CONFIG.STORAGE_KEYS.WORDLIST_SELECTION]: CONFIG.WORDLISTS.CUSTOM_KEY,
        [CONFIG.STORAGE_KEYS.WORDLIST_URL]: url 
      });

      WordlistManager.clearCache();
      await WordlistManager.clearLocalCache();

      this.showStatus("Custom wordlist URL saved! Reloading wordlist...");
      await this.updateWordlistStatus();
      await this.updateExampleEmail(document.getElementById('domain').value);
    } catch (error) {
      console.error("Error saving wordlist URL:", error);
      this.showStatus("Error: Could not fetch wordlist from URL", true);
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

  async updateWordlistStatus() {
    try {
      const selection = await WordlistManager.getCurrentSelection();
      const wordlist = await WordlistManager.load();
      const info = WordlistManager.getWordlistInfo(selection);

      if (info) {
        const statusText = info.isCustom ? 
          'Custom URL' : 
          `${this.getFlagEmoji(info.flag)} ${info.name}`;
        
        document.getElementById('wordlist-status').textContent =
          `${statusText} (${wordlist.length} words)`;
      } else {
        document.getElementById('wordlist-status').textContent = 
          `Unknown (${wordlist.length} words)`;
      }

      document.getElementById('wordlist-preview').textContent =
        wordlist.slice(0, 5).join(', ') + (wordlist.length > 5 ? '...' : '');

      // Update custom URL field if custom is selected
      if (selection === CONFIG.WORDLISTS.CUSTOM_KEY) {
        const { [CONFIG.STORAGE_KEYS.WORDLIST_URL]: customUrl = '' } =
          await StorageUtils.get(CONFIG.STORAGE_KEYS.WORDLIST_URL);
        document.getElementById('wordlist-url').value = customUrl;
      }

    } catch (error) {
      console.error("Error updating wordlist status:", error);
      document.getElementById('wordlist-status').textContent = "Error loading";
      document.getElementById('wordlist-preview').textContent = "Error";
    }
  }

  async loadGitHubSettings() {
    try {
      const config = await GitHubBackup.getConfig();
      
      document.getElementById('github-pat').value = config.pat;
      document.getElementById('github-repository').value = config.repository;
      document.getElementById('github-branch').value = config.branch;
      document.getElementById('github-auto-backup').checked = config.autoBackup;
    } catch (error) {
      console.error("Error loading GitHub settings:", error);
    }
  }

  async updateGitHubStatus() {
    try {
      const isConfigured = await GitHubBackup.isConfigured();
      const statusElement = document.getElementById('github-connection-status');
      const backupInfo = document.getElementById('backup-info');

      if (isConfigured) {
        statusElement.textContent = 'Configured';
        statusElement.style.color = '#4CAF50';
        backupInfo.style.display = 'block';

        // Load last backup info
        const lastBackup = await GitHubBackup.getLastBackupInfo();
        document.getElementById('last-backup-date').textContent = 
          lastBackup.lastDate ? new Date(lastBackup.lastDate).toLocaleString() : 'Never';

        if (lastBackup.lastError) {
          document.getElementById('last-backup-status').textContent = 'Error: ' + lastBackup.lastError;
          document.getElementById('last-backup-status').style.color = '#f44336';
        } else if (lastBackup.lastUrl) {
          document.getElementById('last-backup-status').textContent = 'Success';
          document.getElementById('last-backup-status').style.color = '#4CAF50';
          document.getElementById('last-backup-link').href = lastBackup.lastUrl;
          document.getElementById('last-backup-link-container').style.display = 'block';
        } else {
          document.getElementById('last-backup-status').textContent = 'Not backed up yet';
          document.getElementById('last-backup-status').style.color = '#757575';
        }
      } else {
        statusElement.textContent = 'Not configured';
        statusElement.style.color = '#757575';
        backupInfo.style.display = 'none';
      }
    } catch (error) {
      console.error("Error updating GitHub status:", error);
    }
  }

  async handleTestGitHubConnection() {
    try {
      const config = this.getGitHubConfigFromForm();
      const errors = await GitHubBackup.validateConfig(config);

      if (errors.length > 0) {
        this.showStatus('Configuration errors: ' + errors.join(', '), true);
        return;
      }

      this.showStatus('Testing connection...');
      const result = await GitHubBackup.testConnection(config);

      if (result.success) {
        this.showStatus('Connection successful!');
      } else {
        this.showStatus('Connection failed: ' + result.error, true);
      }
    } catch (error) {
      console.error('Error testing GitHub connection:', error);
      this.showStatus('Error testing connection: ' + error.message, true);
    }
  }

  async handleSaveGitHubConfig() {
    try {
      const config = this.getGitHubConfigFromForm();
      const errors = await GitHubBackup.validateConfig(config);

      if (errors.length > 0) {
        this.showStatus('Please fix the following errors: ' + errors.join(', '), true);
        return;
      }

      await StorageUtils.set({
        [CONFIG.STORAGE_KEYS.GITHUB_PAT]: config.pat,
        [CONFIG.STORAGE_KEYS.GITHUB_REPOSITORY]: config.repository,
        [CONFIG.STORAGE_KEYS.GITHUB_BRANCH]: config.branch,
        [CONFIG.STORAGE_KEYS.GITHUB_AUTO_BACKUP]: config.autoBackup
      });

      this.showStatus('GitHub configuration saved!');
      await this.updateGitHubStatus();
    } catch (error) {
      console.error('Error saving GitHub config:', error);
      this.showStatus('Error saving configuration: ' + error.message, true);
    }
  }

  async handleManualBackup() {
    try {
      const isConfigured = await GitHubBackup.isConfigured();
      if (!isConfigured) {
        this.showStatus('Please configure GitHub settings first', true);
        return;
      }

      this.showStatus('Creating backup...');
      const result = await GitHubBackup.manualBackup();

      this.showStatus('Backup created successfully!');
      await this.updateGitHubStatus();
    } catch (error) {
      console.error('Error creating manual backup:', error);
      this.showStatus('Backup failed: ' + error.message, true);
      await this.updateGitHubStatus();
    }
  }

  getGitHubConfigFromForm() {
    return {
      pat: document.getElementById('github-pat').value.trim(),
      repository: document.getElementById('github-repository').value.trim(),
      branch: document.getElementById('github-branch').value.trim() || 'main',
      autoBackup: document.getElementById('github-auto-backup').checked
    };
  }

  toggleGitHubHelp(event) {
    event.preventDefault();
    const helpSection = document.getElementById('github-help');
    helpSection.style.display = helpSection.style.display === 'none' ? 'block' : 'none';
  }

  async handleExportBackup() {
    try {
      await ExportUtils.exportAsJson();
      this.showStatus("Backup exported successfully!");
    } catch (error) {
      console.error("Error exporting backup:", error);
      this.showStatus(error.message === 'No data to export' ? error.message : "Error exporting backup", true);
    }
  }

  handleImportBackup() {
    document.getElementById('import-file').click();
  }

  async handleFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      this.showStatus("Please select a JSON file", true);
      return;
    }

    try {
      this.showImportStatus("Reading backup file...");
      
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Validate backup structure
      if (!data.settings && !data.usageLog && !data.metadata) {
        throw new Error("Invalid backup file format");
      }

      // Show confirmation dialog with import details
      const confirmMessage = this.buildImportConfirmation(data);
      if (!confirm(confirmMessage)) {
        this.hideImportStatus();
        return;
      }

      this.showImportStatus("Importing settings...");
      
      const result = await ExportUtils.importFromJson(data);
      
      this.showImportStatus("Refreshing interface...");
      
      // Refresh the UI
      await this.loadDomainSettings();
      await this.setupWordlistDropdown();
      await this.updateWordlistStatus();
      await this.loadGitHubSettings();
      await this.updateGitHubStatus();
      await this.loadLogData();
      await this.updateExampleEmail(document.getElementById('domain').value);

      this.hideImportStatus();
      this.showStatus(`Import successful! ${result.settingsImported} settings and ${result.emailsImported} emails imported.`);

    } catch (error) {
      console.error("Error importing backup:", error);
      this.hideImportStatus();
      this.showStatus("Error importing backup: " + error.message, true);
    }

    // Clear file input
    event.target.value = '';
  }

  buildImportConfirmation(data) {
    const lines = ["Import the following data?", ""];
    
    if (data.metadata) {
      lines.push(`Export Date: ${new Date(data.metadata.exportDate).toLocaleString()}`);
    }
    
    if (data.settings) {
      lines.push("Settings to import:");
      if (data.settings.catchAllDomain) lines.push(`  • Domain: ${data.settings.catchAllDomain}`);
      if (data.settings.wordlistSelection) lines.push(`  • Wordlist: ${data.settings.wordlistSelection}`);
      if (data.settings.wordlistUrl) lines.push(`  • Custom URL: ${data.settings.wordlistUrl}`);
      if (data.settings.githubRepository) lines.push(`  • GitHub Repo: ${data.settings.githubRepository}`);
    }
    
    if (data.usageLog) {
      lines.push(`Email History: ${data.usageLog.length} entries`);
    }
    
    lines.push("", "⚠️ This will overwrite your current settings!");
    
    return lines.join("\n");
  }

  showImportStatus(message) {
    const statusDiv = document.getElementById('import-status');
    const detailsDiv = statusDiv.querySelector('.import-details');
    detailsDiv.textContent = message;
    statusDiv.style.display = 'block';
  }

  hideImportStatus() {
    document.getElementById('import-status').style.display = 'none';
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
      CONFIG.ICON.COPY_GLYPH,
      'Copy email',
      async () => {
        const success = await UIUtils.copyToClipboard(entry.generatedEmail);
        this.showStatus(success ? 'Email copied to clipboard!' : 'Failed to copy', !success);
      }
    );
    actionsCell.appendChild(copyButton);

    // Delete button
    const deleteButton = this.createActionButton(
      CONFIG.ICON.DELETE_GLYPH,
      'Delete entry',
      () => this.handleDeleteEntry(entry)
    );
    actionsCell.appendChild(deleteButton);

    return actionsCell;
  }

  createActionButton(glyph, title, onClick) {
    const button = document.createElement('button');
    button.className = 'icon-button';
    button.innerHTML = glyph;
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