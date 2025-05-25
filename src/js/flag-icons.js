const FlagIcons = {
    flags: {
        US: `<svg viewBox="0 0 640 480" class="flag-icon"><defs><clipPath id="a"><path fill-opacity=".7" d="M0 0h640v480H0z"/></clipPath></defs><g fill-rule="evenodd" clip-path="url(#a)"><g stroke-width="1pt"><path fill="#bd3d44" d="M0 0h640v37H0zm0 74h640v37H0zm0 73h640v37H0zm0 74h640v36H0zm0 73h640v37H0zm0 74h640v36H0zm0 74h640v37H0z"/><path fill="#fff" d="M0 37h640v37H0zm0 74h640v36H0zm0 73h640v37H0zm0 74h640v37H0zm0 73h640v37H0zm0 74h640v36H0z"/></g><path fill="#192f5d" d="M0 0h364v258H0z"/><g fill="#fff"><g transform="scale(36)"><path d="M.5 0L.6.5 0 .2h1l-.6.3z"/></g></g></g></svg>`,
        DE: `<svg viewBox="0 0 640 480" class="flag-icon"><path fill="#ffce00" d="M0 320h640v160H0z"/><path d="M0 0h640v160H0z"/><path fill="#d00" d="M0 160h640v160H0z"/></svg>`,
        ES: `<svg viewBox="0 0 640 480" class="flag-icon"><path fill="#aa151b" d="M0 0h640v160H0z"/><path fill="#f1bf00" d="M0 160h640v160H0z"/><path fill="#aa151b" d="M0 320h640v160H0z"/></svg>`,
        FI: `<svg viewBox="0 0 640 480" class="flag-icon"><path fill="#fff" d="M0 0h640v480H0z"/><path fill="#003580" d="M0 174h640v132H0z"/><path fill="#003580" d="M175 0h130v480H175z"/></svg>`,
        FR: `<svg viewBox="0 0 640 480" class="flag-icon"><path fill="#fff" d="M213.3 0h213.4v480H213.3z"/><path fill="#002654" d="M0 0h213.3v480H0z"/><path fill="#ce1126" d="M426.7 0H640v480H426.7z"/></svg>`,
        SE: `<svg viewBox="0 0 640 480" class="flag-icon"><path fill="#006aa7" d="M0 0h640v480H0z"/><path fill="#fecc00" d="M176 0h64v480h-64z"/><path fill="#fecc00" d="M0 208h640v64H0z"/></svg>`
    },

    getFlag(countryCode) {
        return this.flags[countryCode] || `<span class="flag-fallback">${countryCode}</span>`;
    },

    createFlagElement(countryCode, size = '20px') {
        const wrapper = document.createElement('span');
        wrapper.className = 'flag-wrapper';
        wrapper.style.cssText = `
      display: inline-block;
      width: ${size};
      height: ${size};
      margin-right: 8px;
      vertical-align: middle;
    `;

        const flagHtml = this.getFlag(countryCode);
        wrapper.innerHTML = flagHtml;

        // Style the SVG
        const svg = wrapper.querySelector('svg');
        if (svg) {
            svg.style.cssText = `
        width: 100%;
        height: 100%;
        border-radius: 2px;
        border: 1px solid rgba(0,0,0,0.1);
      `;
        }

        return wrapper;
    }
};

// Add CSS for flag icons
const flagStyles = `
  .flag-icon {
    width: 100%;
    height: 100%;
    border-radius: 2px;
    border: 1px solid rgba(0,0,0,0.1);
  }
  
  .flag-fallback {
    font-size: 12px;
    background: #f0f0f0;
    padding: 2px 4px;
    border-radius: 2px;
    color: #666;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = flagStyles;
    document.head.appendChild(style);
}

// Export for use in extension
if (typeof window !== 'undefined') {
    window.FlagIcons = FlagIcons;
}