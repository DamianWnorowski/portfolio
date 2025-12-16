/**
 * Security Utilities
 * XSS prevention and input sanitization
 */

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for innerHTML
 */
export function escapeHtml(str) {
    if (typeof str !== 'string') {
        return String(str);
    }

    const htmlEscapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;'
    };

    return str.replace(/[&<>"'\/]/g, (char) => htmlEscapeMap[char]);
}

/**
 * Sanitize HTML by removing script tags and dangerous attributes
 * Use this when you need to preserve some HTML structure but remove dangerous content
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(html) {
    if (typeof html !== 'string') {
        return String(html);
    }

    // Remove script tags and their content
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove event handlers (onclick, onerror, etc.)
    html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    html = html.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

    // Remove javascript: protocol
    html = html.replace(/javascript:/gi, '');

    // Remove data: protocol (can be used for XSS)
    html = html.replace(/data:text\/html/gi, '');

    return html;
}

/**
 * Create a text node safely (always safe, no HTML parsing)
 * @param {string} text - Text content
 * @returns {Text} Text node
 */
export function createTextNode(text) {
    return document.createTextNode(String(text));
}

/**
 * Set text content safely (no HTML parsing)
 * @param {Element} element - DOM element
 * @param {string} text - Text content
 */
export function setTextContent(element, text) {
    if (element && element.textContent !== undefined) {
        element.textContent = String(text);
    }
}

/**
 * Create an element with safe text content
 * @param {string} tagName - Element tag name
 * @param {string} textContent - Text content
 * @param {Object} attributes - Attributes to set
 * @returns {Element} Created element
 */
export function createElement(tagName, textContent = '', attributes = {}) {
    const element = document.createElement(tagName);

    if (textContent) {
        element.textContent = String(textContent);
    }

    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'class' || key === 'className') {
            element.className = String(value);
        } else if (key.startsWith('data-')) {
            element.setAttribute(key, String(value));
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else {
            element.setAttribute(key, String(value));
        }
    });

    return element;
}

/**
 * Safely append HTML content by creating elements programmatically
 * This is safer than innerHTML for dynamic content
 * @param {Element} parent - Parent element
 * @param {string} html - HTML string (will be sanitized)
 */
export function appendSafeHtml(parent, html) {
    const sanitized = sanitizeHtml(html);
    const temp = document.createElement('div');
    temp.innerHTML = sanitized;

    while (temp.firstChild) {
        parent.appendChild(temp.firstChild);
    }
}
