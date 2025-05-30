class PopupController {
  constructor() {
    this.currentDomain = null;
    this.init();
  }

  async init() {
    try {
      await this.setupEventListeners();
      await this.initializeUI();
    } catch (error) {
      console.error("Error initializing popup:", error);
    }
  }

  setupEventListeners() {
    document.getElementById('generate').addEventListener('click', () => this.handleGenerate());
    document.getElementById('copy').addEventListener('click', () => this.handleCopy());
    document.getElementById('open-options').addEventListener('click', (e) => this.handleOpenOptions(e));
  }

  async initializeUI() {
    const { [CONFIG.STORAGE_KEYS.CATCH_ALL_DOMAIN]: catchAllDomain } =
      await StorageUtils.get(CONFIG.STORAGE_KEYS.CATCH_ALL_DOMAIN);

    if (!catchAllDomain) {
      document.getElementById('no-domain-warning').style.display = 'block';
    }

    this.currentDomain = await BrowserUtils.getCurrentDomain();
    await this.loadExistingEmails();
  }

  showStatus(message, isError = false) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.classList.toggle('error', isError);
    status.style.opacity = 1;

    setTimeout(() => {
      status.style.opacity = 0;
    }, CONFIG.ANIMATION.NOTIFICATION_DURATION);
  }

  async handleGenerate() {
    try {
      const { [CONFIG.STORAGE_KEYS.CATCH_ALL_DOMAIN]: catchAllDomain } =
        await StorageUtils.get(CONFIG.STORAGE_KEYS.CATCH_ALL_DOMAIN);

      if (!catchAllDomain) {
        document.getElementById('generated').textContent = "No domain configured";
        this.showStatus("Please configure a catch-all domain in settings", true);
        return;
      }

      const generatedEmail = await EmailGenerator.generate(catchAllDomain);

      await UsageLogger.log(this.currentDomain, generatedEmail);

      document.getElementById('generated').textContent = generatedEmail;
      document.getElementById('copy-container').style.display = 'flex';

      await this.loadExistingEmails();
    } catch (error) {
      console.error("Error generating email:", error);
      this.showStatus("Error generating email", true);
    }
  }

  async handleCopy() {
    const emailText = document.getElementById('generated').textContent;
    if (!emailText) return;

    const success = await UIUtils.copyToClipboard(emailText);
    this.showStatus(success ? "Copied to clipboard!" : "Failed to copy", !success);
  }

  async loadExistingEmails() {
    try {
      const usageLog = await UsageLogger.getLog();
      const domainEmails = usageLog.filter(entry => entry.domain === this.currentDomain);

      const ul = document.getElementById('existing');
      ul.innerHTML = '';

      if (domainEmails.length === 0) {
        this.renderEmptyEmailList(ul);
        return;
      }

      this.renderEmailList(ul, domainEmails.slice(-10).reverse());
    } catch (error) {
      console.error("Error loading emails:", error);
    }
  }

  renderEmptyEmailList(container) {
    const li = document.createElement('li');
    li.textContent = "No emails generated yet";
    li.style.color = "#777";
    container.appendChild(li);
  }

  renderEmailList(container, emails) {
    emails.forEach(entry => {
      const li = document.createElement('li');

      const emailSpan = document.createElement('span');
      emailSpan.textContent = entry.generatedEmail;
      li.appendChild(emailSpan);

      const copyIcon = this.createCopyIcon(entry.generatedEmail);
      li.appendChild(copyIcon);

      container.appendChild(li);
    });
  }

  createCopyIcon(email) {
    const copyIcon = document.createElement('span');
    copyIcon.innerHTML = CONFIG.ICON.COPY_GLYPH;
    copyIcon.title = "Copy to clipboard";
    copyIcon.className = "copy-icon";
    copyIcon.addEventListener('click', async () => {
      const success = await UIUtils.copyToClipboard(email);
      this.showStatus(success ? "Copied to clipboard!" : "Failed to copy", !success);
    });
    return copyIcon;
  }

  handleOpenOptions(e) {
    e.preventDefault();
    browser.runtime.openOptionsPage();
  }
}
new PopupController();