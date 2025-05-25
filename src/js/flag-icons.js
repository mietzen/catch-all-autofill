const FlagIcons = {
  // Available country codes from the flag-icons.css
  availableFlags: ['ad', 'ae', 'af', 'ag', 'ai', 'al', 'am', 'ao', 'aq', 'ar', 'arab', 'as', 'asean', 'at', 'au', 'aw', 'ax', 'az', 'ba', 'bb', 'bd', 'be', 'bf', 'bg', 'bh', 'bi', 'bj', 'bl', 'bm', 'bn', 'bo', 'bq', 'br', 'bs', 'bt', 'bv', 'bw', 'by', 'bz', 'ca', 'cc', 'cd', 'cefta', 'cf', 'cg', 'ch', 'ci', 'ck', 'cl', 'cm', 'cn', 'co', 'cp', 'cr', 'cu', 'cv', 'cw', 'cx', 'cy', 'cz', 'de', 'dg', 'dj', 'dk', 'dm', 'do', 'dz', 'eac', 'ec', 'ee', 'eg', 'eh', 'er', 'es-ct', 'es-ga', 'es-pv', 'es', 'et', 'eu', 'fi', 'fj', 'fk', 'fm', 'fo', 'fr', 'ga', 'gb-eng', 'gb-nir', 'gb-sct', 'gb-wls', 'gb', 'gd', 'ge', 'gf', 'gg', 'gh', 'gi', 'gl', 'gm', 'gn', 'gp', 'gq', 'gr', 'gs', 'gt', 'gu', 'gw', 'gy', 'hk', 'hm', 'hn', 'hr', 'ht', 'hu', 'ic', 'id', 'ie', 'il', 'im', 'in', 'io', 'iq', 'ir', 'is', 'it', 'je', 'jm', 'jo', 'jp', 'ke', 'kg', 'kh', 'ki', 'km', 'kn', 'kp', 'kr', 'kw', 'ky', 'kz', 'la', 'lb', 'lc', 'li', 'lk', 'lr', 'ls', 'lt', 'lu', 'lv', 'ly', 'ma', 'mc', 'md', 'me', 'mf', 'mg', 'mh', 'mk', 'ml', 'mm', 'mn', 'mo', 'mp', 'mq', 'mr', 'ms', 'mt', 'mu', 'mv', 'mw', 'mx', 'my', 'mz', 'na', 'nc', 'ne', 'nf', 'ng', 'ni', 'nl', 'no', 'np', 'nr', 'nu', 'nz', 'om', 'pa', 'pc', 'pe', 'pf', 'pg', 'ph', 'pk', 'pl', 'pm', 'pn', 'pr', 'ps', 'pt', 'pw', 'py', 'qa', 're', 'ro', 'rs', 'ru', 'rw', 'sa', 'sb', 'sc', 'sd', 'se', 'sg', 'sh-ac', 'sh-hl', 'sh-ta', 'sh', 'si', 'sj', 'sk', 'sl', 'sm', 'sn', 'so', 'sr', 'ss', 'st', 'sv', 'sx', 'sy', 'sz', 'tc', 'td', 'tf', 'tg', 'th', 'tj', 'tk', 'tl', 'tm', 'tn', 'to', 'tr', 'tt', 'tv', 'tw', 'tz', 'ua', 'ug', 'um', 'un', 'us', 'uy', 'uz', 'va', 'vc', 've', 'vg', 'vi', 'vn', 'vu', 'wf', 'ws', 'xk', 'xx', 'ye', 'yt', 'za', 'zm', 'zw'],

  getFlag(countryCode) {
    const code = countryCode.toLowerCase();
    if (this.availableFlags.includes(code)) {
      return `<span class="fi fi-${code}"></span>`;
    }
    return `<span class="flag-fallback">${countryCode}</span>`;
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

    const code = countryCode.toLowerCase();
    if (this.availableFlags.includes(code)) {
      const flagElement = document.createElement('span');
      flagElement.className = `fi fi-${code}`;
      flagElement.style.cssText = `
                width: 100%;
                height: 100%;
                display: block;
            `;
      wrapper.appendChild(flagElement);
    } else {
      const fallback = document.createElement('span');
      fallback.className = 'flag-fallback';
      fallback.textContent = countryCode;
      wrapper.appendChild(fallback);
    }

    return wrapper;
  }
};

// Export for use in extension
if (typeof window !== 'undefined') {
  window.FlagIcons = FlagIcons;
}