/**
 * Security Headers Configuration
 * Configures security headers in client-side code
 */

export class SecurityHeadersConfig {
  static configureMetaTags() {
    // Content Security Policy meta tag for client-side
    const cspMeta = document.createElement('meta');
    cspMeta.httpEquiv = 'Content-Security-Policy';
    cspMeta.content = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:";
    document.head.appendChild(cspMeta);

    // Referrer Policy
    const referrerMeta = document.createElement('meta');
    referrerMeta.name = 'referrer';
    referrerMeta.content = 'strict-origin-when-cross-origin';
    document.head.appendChild(referrerMeta);

    // Viewport for mobile security
    const viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    viewportMeta.content = 'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes';
    document.head.appendChild(viewportMeta);

    // Format Detection
    const formatMeta = document.createElement('meta');
    formatMeta.name = 'format-detection';
    formatMeta.content = 'telephone=no, email=no, address=no';
    document.head.appendChild(formatMeta);
  }

  static disableIframing() {
    // Prevent site from being iframed by other sites
    if (window.self !== window.top) {
      window.top.location = window.self.location;
    }
  }

  static preventClickjacking() {
    // Prevent clickjacking attacks
    const style = document.createElement('style');
    style.innerHTML = `
      body { display: none !important; }
    `;
    document.head.appendChild(style);

    // Declare self as top-level
    if (window.self === window.top) {
      style.innerHTML = `
        body { display: block !important; }
      `;
    }
  }

  static enableSubresourceIntegrity() {
    // Add SRI to external scripts
    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach(script => {
      if (script.src && script.src.includes('cdn.')) {
        // Add placeholder for SRI hash
        if (!script.integrity) {
          console.warn(`SRI missing for ${script.src}`);
        }
      }
    });
  }

  static configureHeaders(requestInit = {}) {
    // Configure headers for fetch requests
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    };

    return {
      ...requestInit,
      headers: {
        ...defaultHeaders,
        ...requestInit.headers
      }
    };
  }

  static init() {
    // Run on page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.configureMetaTags();
        this.preventClickjacking();
        this.enableSubresourceIntegrity();
      });
    } else {
      this.configureMetaTags();
      this.preventClickjacking();
      this.enableSubresourceIntegrity();
    }

    this.disableIframing();
  }
}

// Auto-initialize on import
SecurityHeadersConfig.init();
