/**
 * Refactored content script that runs on webpages to inject icons into email fields
 */


class EmailFieldProcessor {
  constructor() {
    this.processedFields = new WeakSet();
    this.injectFontAwesome(); // Add this line
    this.init();
  }

  injectFontAwesome() {
    if (!document.getElementById('catch-all-fa-css')) {
      const link = document.createElement('link');
      link.id = 'catch-all-fa-css';
      link.rel = 'stylesheet';
      link.href = browser.runtime.getURL('css/fontawesome.min.css');
      document.head.appendChild(link);

      const solidLink = document.createElement('link');
      solidLink.rel = 'stylesheet';
      solidLink.href = browser.runtime.getURL('css/solid.min.css');
      document.head.appendChild(solidLink);
    }
  }

  async init() {
    try {
      const { [CONFIG.STORAGE_KEYS.CATCH_ALL_DOMAIN]: catchAllDomain } =
        await StorageUtils.get(CONFIG.STORAGE_KEYS.CATCH_ALL_DOMAIN);

      if (!catchAllDomain) return;

      this.initializeObserver();
      this.processExistingFields();
    } catch (error) {
      console.error("Catch-All Email Autofill error:", error);
    }
  }

  initializeObserver() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.processFieldsInNode(node);
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

  processExistingFields() {
    this.processFieldsInNode(document);
  }

  processFieldsInNode(node) {
    const emailFields = node.querySelectorAll ?
      node.querySelectorAll(CONFIG.SELECTORS.EMAIL_INPUTS) :
      (node.type === 'email' && node.tagName === 'INPUT' ? [node] : []);

    for (const field of emailFields) {
      if (!this.processedFields.has(field)) {
        this.processedFields.add(field);
        this.injectIcon(field);
      }
    }
  }

  injectIcon(emailField) {
    if (!this.shouldProcessField(emailField)) {
      return;
    }

    const wrapper = this.createOrGetWrapper(emailField);
    const icon = this.createIcon(emailField);

    this.adjustFieldPadding(emailField);
    wrapper.appendChild(icon);
    this.setupFieldEventListeners(emailField, icon, wrapper);
  }

  shouldProcessField(field) {
    return ValidationUtils.isFieldSuitableForIcon(field) &&
      !ValidationUtils.isFieldInPasswordManager(field);
  }

  createOrGetWrapper(emailField) {
    let wrapper = emailField.parentElement;
    if (!wrapper.classList.contains(CONFIG.CSS_CLASSES.WRAPPER)) {
      wrapper = document.createElement('div');
      wrapper.className = CONFIG.CSS_CLASSES.WRAPPER;
      wrapper.style.cssText = `
        position: relative;
        display: inline-block;
        width: 100%;
      `;

      emailField.parentNode.insertBefore(wrapper, emailField);
      wrapper.appendChild(emailField);
    }
    return wrapper;
  }

  createIcon(emailField) {
    const icon = document.createElement('div');
    icon.className = CONFIG.CSS_CLASSES.ICON;
    icon.innerHTML = CONFIG.ICON.MAIL_GLYPH;
    icon.title = 'Generate catch-all email';

    this.styleIcon(icon);
    this.setupIconEventListeners(icon, emailField);

    return icon;
  }

  styleIcon(icon) {
    icon.style.cssText = `
      position: absolute;
      right: ${CONFIG.ICON.PADDING}px;
      top: 50%;
      transform: translateY(-50%);
      width: ${CONFIG.ICON.SIZE}px;
      height: ${CONFIG.ICON.SIZE}px;
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
  }

  setupIconEventListeners(icon, emailField) {
    icon.addEventListener('mouseenter', () => {
      icon.style.background = '#e0e0e0';
      icon.style.transform = 'translateY(-50%) scale(1.1)';
    });

    icon.addEventListener('mouseleave', () => {
      icon.style.background = '#f0f0f0';
      icon.style.transform = 'translateY(-50%) scale(1)';
    });

    icon.addEventListener('click', (e) => this.handleIconClick(e, icon, emailField));
  }

  async handleIconClick(e, icon, emailField) {
    e.preventDefault();
    e.stopPropagation();

    try {
      const { [CONFIG.STORAGE_KEYS.CATCH_ALL_DOMAIN]: catchAllDomain } =
        await StorageUtils.get(CONFIG.STORAGE_KEYS.CATCH_ALL_DOMAIN);

      if (!catchAllDomain) {
        UIUtils.showNotification('No catch-all domain configured. Please set one in the extension settings.', true);
        return;
      }

      const generatedEmail = await EmailGenerator.generate(catchAllDomain);

      this.fillEmailField(emailField, generatedEmail);

      const domain = window.location.hostname;
      await UsageLogger.log(domain, generatedEmail);

      UIUtils.showNotification(`Generated email: ${generatedEmail}`);
      this.showSuccessFeedback(icon);

    } catch (error) {
      console.error('Error generating email:', error);
      UIUtils.showNotification('Error generating email', true);
    }
  }

  fillEmailField(emailField, email) {
    emailField.value = email;
    emailField.focus();

    // Trigger events for form validation
    emailField.dispatchEvent(new Event('input', { bubbles: true }));
    emailField.dispatchEvent(new Event('change', { bubbles: true }));
  }

  showSuccessFeedback(icon) {
    const originalBg = icon.style.background;
    const originalContent = icon.innerHTML;

    icon.style.background = '#4CAF50';
    icon.innerHTML = CONFIG.ICON.SUCCESS_GLYPH;

    setTimeout(() => {
      icon.style.background = originalBg;
      icon.innerHTML = originalContent;
    }, CONFIG.ANIMATION.SUCCESS_FEEDBACK_DURATION);
  }

  adjustFieldPadding(emailField) {
    const currentPaddingRight = window.getComputedStyle(emailField).paddingRight;
    const paddingValue = parseInt(currentPaddingRight) || 0;
    emailField.style.paddingRight = `${Math.max(paddingValue, CONFIG.ICON.SIZE + CONFIG.ICON.PADDING * 2)}px`;
  }

  setupFieldEventListeners(emailField, icon, wrapper) {
    emailField.addEventListener('focus', () => {
      icon.style.opacity = '1';
    });

    emailField.addEventListener('blur', () => {
      if (!emailField.value && !wrapper.matches(':hover')) {
        icon.style.opacity = '0.7';
      }
    });

    // Set initial opacity
    icon.style.opacity = emailField.value ? '1' : '0.7';
  }
}

// Initialize the processor
new EmailFieldProcessor();