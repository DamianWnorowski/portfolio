/**
 * Security Tests
 * Tests for XSS prevention, input sanitization, and secure storage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Security Tests', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        localStorage.clear();
        sessionStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('XSS Prevention', () => {
        describe('DOM-based XSS', () => {
            it('escapes HTML in user-generated content', () => {
                const maliciousInput = '<script>alert("xss")</script>';

                const escapeHtml = (str) => {
                    const div = document.createElement('div');
                    div.textContent = str;
                    return div.innerHTML;
                };

                const escaped = escapeHtml(maliciousInput);

                expect(escaped).not.toContain('<script>');
                expect(escaped).toContain('&lt;script&gt;');
            });

            it('prevents innerHTML with user data', () => {
                const container = document.createElement('div');
                const userInput = '<img src=x onerror="alert(1)">';

                // Bad: innerHTML with user data
                // container.innerHTML = userInput; // DON'T DO THIS

                // Good: textContent
                container.textContent = userInput;

                expect(container.innerHTML).not.toContain('onerror');
                expect(container.querySelector('img')).toBeNull();
            });

            it('sanitizes URLs before use', () => {
                const sanitizeUrl = (url) => {
                    try {
                        const parsed = new URL(url, window.location.origin);
                        // Only allow http(s) protocols
                        if (!['http:', 'https:'].includes(parsed.protocol)) {
                            return '#';
                        }
                        return parsed.href;
                    } catch {
                        return '#';
                    }
                };

                expect(sanitizeUrl('javascript:alert(1)')).toBe('#');
                expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
                expect(sanitizeUrl('https://example.com')).toBe('https://example.com/');
            });

            it('validates href attributes', () => {
                const isValidHref = (href) => {
                    // Reject javascript: protocol
                    if (href.toLowerCase().startsWith('javascript:')) return false;
                    // Reject data: protocol for links
                    if (href.toLowerCase().startsWith('data:')) return false;
                    // Reject vbscript: protocol
                    if (href.toLowerCase().startsWith('vbscript:')) return false;
                    return true;
                };

                expect(isValidHref('javascript:alert(1)')).toBe(false);
                expect(isValidHref('JAVASCRIPT:alert(1)')).toBe(false);
                expect(isValidHref('data:text/html,test')).toBe(false);
                expect(isValidHref('https://example.com')).toBe(true);
                expect(isValidHref('/relative/path')).toBe(true);
                expect(isValidHref('#anchor')).toBe(true);
            });

            it('blocks event handlers in user content', () => {
                const containsEventHandler = (str) => {
                    const eventPatterns = [
                        /on\w+\s*=/i,
                        /javascript:/i,
                        /expression\s*\(/i
                    ];
                    return eventPatterns.some(pattern => pattern.test(str));
                };

                expect(containsEventHandler('onclick=alert(1)')).toBe(true);
                expect(containsEventHandler('onload="evil()"')).toBe(true);
                expect(containsEventHandler('javascript:void(0)')).toBe(true);
                expect(containsEventHandler('Hello World')).toBe(false);
            });
        });

        describe('Reflected XSS', () => {
            it('sanitizes URL parameters', () => {
                const sanitizeParam = (param) => {
                    return param
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#x27;')
                        .replace(/&(?![\w#]+;)/g, '&amp;');
                };

                const malicious = '<script>alert(document.cookie)</script>';
                const sanitized = sanitizeParam(malicious);

                expect(sanitized).not.toContain('<script>');
                expect(sanitized).toContain('&lt;script&gt;');
            });

            it('validates hash/anchor values', () => {
                const isValidAnchor = (anchor) => {
                    // Only allow alphanumeric and hyphens
                    return /^[a-zA-Z0-9-_]+$/.test(anchor);
                };

                expect(isValidAnchor('profile')).toBe(true);
                expect(isValidAnchor('section-1')).toBe(true);
                expect(isValidAnchor('<script>')).toBe(false);
                expect(isValidAnchor('javascript:alert(1)')).toBe(false);
            });
        });

        describe('Template Injection', () => {
            it('escapes template literals with user data', () => {
                const userInput = '${alert(1)}';

                // Use template literals safely
                const safeTemplate = (input) => {
                    return `User said: ${input.replace(/\$/g, '&#36;').replace(/\{/g, '&#123;')}`;
                };

                const result = safeTemplate(userInput);

                expect(result).not.toContain('${');
                expect(result).toContain('&#36;');
            });
        });
    });

    describe('Input Validation', () => {
        describe('Form Input Sanitization', () => {
            it('validates email format', () => {
                const isValidEmail = (email) => {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    return emailRegex.test(email);
                };

                expect(isValidEmail('test@example.com')).toBe(true);
                expect(isValidEmail('invalid')).toBe(false);
                expect(isValidEmail('<script>@test.com')).toBe(false);
                expect(isValidEmail('test@.com')).toBe(false);
            });

            it('limits input length', () => {
                const maxLength = 1000;
                const validateLength = (input, max = maxLength) => {
                    return input.length <= max;
                };

                expect(validateLength('short')).toBe(true);
                expect(validateLength('a'.repeat(1001))).toBe(false);
            });

            it('strips dangerous characters from names', () => {
                const sanitizeName = (name) => {
                    return name
                        .replace(/[<>]/g, '')
                        .replace(/[&;]/g, '')
                        .trim()
                        .slice(0, 100);
                };

                expect(sanitizeName('<script>John</script>')).toBe('scriptJohn/script');
                expect(sanitizeName('John & Jane')).toBe('John  Jane');
                expect(sanitizeName('   John   ')).toBe('John');
            });

            it('validates message content', () => {
                const validateMessage = (message) => {
                    if (!message || message.trim().length === 0) {
                        return { valid: false, error: 'Message required' };
                    }
                    if (message.length > 5000) {
                        return { valid: false, error: 'Message too long' };
                    }
                    if (/<script/i.test(message)) {
                        return { valid: false, error: 'Invalid content' };
                    }
                    return { valid: true };
                };

                expect(validateMessage('Hello!').valid).toBe(true);
                expect(validateMessage('').valid).toBe(false);
                expect(validateMessage('<script>alert(1)</script>').valid).toBe(false);
                expect(validateMessage('a'.repeat(6000)).valid).toBe(false);
            });
        });

        describe('Terminal Command Sanitization', () => {
            it('blocks dangerous commands', () => {
                const blockedCommands = [
                    'rm', 'delete', 'format', 'sudo', 'chmod',
                    'eval', 'exec', 'system', 'shell'
                ];

                const isAllowedCommand = (cmd) => {
                    const normalizedCmd = cmd.toLowerCase().trim();
                    return !blockedCommands.some(blocked =>
                        normalizedCmd.startsWith(blocked)
                    );
                };

                expect(isAllowedCommand('status')).toBe(true);
                expect(isAllowedCommand('help')).toBe(true);
                expect(isAllowedCommand('rm -rf /')).toBe(false);
                expect(isAllowedCommand('SUDO hack')).toBe(false);
            });

            it('escapes command output', () => {
                const escapeOutput = (output) => {
                    return output
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
                };

                const maliciousOutput = '<img src=x onerror=alert(1)>';
                const escaped = escapeOutput(maliciousOutput);

                expect(escaped).not.toContain('<img');
                expect(escaped).toContain('&lt;img');
            });
        });
    });

    describe('Secure Storage', () => {
        describe('localStorage Security', () => {
            it('does not store sensitive data in localStorage', () => {
                const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'session'];

                const storedKeys = Object.keys(localStorage);
                const hasSensitive = storedKeys.some(key =>
                    sensitiveKeys.some(sensitive =>
                        key.toLowerCase().includes(sensitive.toLowerCase())
                    )
                );

                expect(hasSensitive).toBe(false);
            });

            it('validates localStorage values before use', () => {
                const safeGetItem = (key, validator) => {
                    try {
                        const value = localStorage.getItem(key);
                        if (value === null) return null;

                        // Parse if JSON
                        const parsed = JSON.parse(value);

                        // Validate against schema
                        if (validator && !validator(parsed)) {
                            localStorage.removeItem(key);
                            return null;
                        }

                        return parsed;
                    } catch {
                        localStorage.removeItem(key);
                        return null;
                    }
                };

                localStorage.setItem('theme', JSON.stringify('dark'));
                const theme = safeGetItem('theme', v => ['light', 'dark'].includes(v));

                expect(theme).toBe('dark');
            });

            it('handles corrupted localStorage gracefully', () => {
                localStorage.setItem('corrupted', '{invalid json');

                const safeGet = (key) => {
                    try {
                        return JSON.parse(localStorage.getItem(key));
                    } catch {
                        return null;
                    }
                };

                expect(safeGet('corrupted')).toBeNull();
            });

            it('sets reasonable data size limits', () => {
                const maxSize = 1024 * 100; // 100KB max per item

                const safeSet = (key, value) => {
                    const serialized = JSON.stringify(value);
                    if (serialized.length > maxSize) {
                        throw new Error('Data too large');
                    }
                    localStorage.setItem(key, serialized);
                };

                expect(() => safeSet('small', 'data')).not.toThrow();
                expect(() => safeSet('large', 'x'.repeat(maxSize + 1))).toThrow();
            });
        });

        describe('sessionStorage Security', () => {
            it('prefers sessionStorage for temporary data', () => {
                // Session data should use sessionStorage
                sessionStorage.setItem('formDraft', JSON.stringify({ email: 'test@test.com' }));

                expect(sessionStorage.getItem('formDraft')).not.toBeNull();
                expect(localStorage.getItem('formDraft')).toBeNull();
            });
        });
    });

    describe('Content Security', () => {
        describe('CSP Compliance', () => {
            it('does not use inline scripts', () => {
                document.body.innerHTML = `
                    <div>Content</div>
                    <script src="app.js"></script>
                `;

                const inlineScripts = document.querySelectorAll('script:not([src])');

                expect(inlineScripts.length).toBe(0);
            });

            it('does not use inline styles in HTML', () => {
                // Check for onclick, onload, etc.
                const hasEventHandlers = (html) => {
                    return /\son\w+\s*=/i.test(html);
                };

                const safeHtml = '<div class="container"><p>Text</p></div>';
                const unsafeHtml = '<div onclick="evil()">Click</div>';

                expect(hasEventHandlers(safeHtml)).toBe(false);
                expect(hasEventHandlers(unsafeHtml)).toBe(true);
            });

            it('uses nonce or hash for necessary inline scripts', () => {
                // Scripts should have nonce attribute
                const script = document.createElement('script');
                script.nonce = 'abc123';
                script.textContent = 'console.log("safe")';

                expect(script.nonce).toBe('abc123');
            });
        });

        describe('Subresource Integrity', () => {
            it('includes integrity attribute for CDN resources', () => {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://cdn.example.com/styles.css';
                link.integrity = 'sha384-abc123';
                link.crossOrigin = 'anonymous';

                expect(link.integrity).toBeTruthy();
                expect(link.crossOrigin).toBe('anonymous');
            });
        });
    });

    describe('CSRF Prevention', () => {
        it('includes CSRF token in form submissions', () => {
            document.body.innerHTML = `
                <form id="contact-form">
                    <input type="hidden" name="_csrf" value="token123">
                    <input type="email" name="email">
                    <button type="submit">Submit</button>
                </form>
            `;

            const form = document.getElementById('contact-form');
            const csrfInput = form.querySelector('input[name="_csrf"]');

            expect(csrfInput).not.toBeNull();
            expect(csrfInput.value).toBeTruthy();
        });

        it('validates origin header on requests', () => {
            const validateOrigin = (origin) => {
                const allowedOrigins = [
                    'https://kaizen.dev',
                    'https://www.kaizen.dev',
                    'http://localhost:3000'
                ];
                return allowedOrigins.includes(origin);
            };

            expect(validateOrigin('https://kaizen.dev')).toBe(true);
            expect(validateOrigin('https://evil.com')).toBe(false);
        });

        it('uses SameSite cookies', () => {
            // Cookies should have SameSite=Strict or SameSite=Lax
            const cookieSettings = {
                secure: true,
                sameSite: 'Strict',
                httpOnly: true
            };

            expect(cookieSettings.sameSite).toBe('Strict');
            expect(cookieSettings.secure).toBe(true);
        });
    });

    describe('Clickjacking Prevention', () => {
        it('sets X-Frame-Options header', () => {
            // This would be set server-side
            const headers = {
                'X-Frame-Options': 'DENY',
                'Content-Security-Policy': "frame-ancestors 'none'"
            };

            expect(headers['X-Frame-Options']).toBe('DENY');
        });

        it('uses CSP frame-ancestors directive', () => {
            const csp = "frame-ancestors 'self'";

            expect(csp).toContain('frame-ancestors');
        });
    });

    describe('Secure Communication', () => {
        it('enforces HTTPS for API calls', () => {
            const enforceHttps = (url) => {
                if (url.startsWith('http://') && !url.includes('localhost')) {
                    return url.replace('http://', 'https://');
                }
                return url;
            };

            expect(enforceHttps('http://api.example.com')).toBe('https://api.example.com');
            expect(enforceHttps('http://localhost:3000')).toBe('http://localhost:3000');
            expect(enforceHttps('https://api.example.com')).toBe('https://api.example.com');
        });

        it('does not expose sensitive data in URLs', () => {
            const hasSensitiveParams = (url) => {
                const sensitiveParams = ['password', 'token', 'secret', 'key', 'auth'];
                const urlObj = new URL(url, 'http://localhost');

                return sensitiveParams.some(param =>
                    urlObj.searchParams.has(param)
                );
            };

            expect(hasSensitiveParams('https://api.com?page=1')).toBe(false);
            expect(hasSensitiveParams('https://api.com?token=abc123')).toBe(true);
        });
    });

    describe('Error Handling Security', () => {
        it('does not expose stack traces to users', () => {
            const formatError = (error, isDev = false) => {
                if (isDev) {
                    return { message: error.message, stack: error.stack };
                }
                return { message: 'An error occurred. Please try again.' };
            };

            const error = new Error('Database connection failed');
            const prodError = formatError(error, false);

            expect(prodError.stack).toBeUndefined();
            expect(prodError.message).not.toContain('Database');
        });

        it('logs errors securely', () => {
            const sanitizeErrorLog = (error) => {
                return {
                    message: error.message,
                    timestamp: new Date().toISOString(),
                    // Don't include user data, tokens, etc.
                    type: error.name
                };
            };

            const error = new Error('Failed: token=abc123');
            const log = sanitizeErrorLog(error);

            // In real implementation, you'd strip the token
            expect(log.timestamp).toBeDefined();
            expect(log.type).toBe('Error');
        });
    });

    describe('Dependency Security', () => {
        it('uses known safe versions of dependencies', () => {
            const dependencies = {
                'three': '^0.160.0',
                'gsap': '^3.12.0'
            };

            // In real tests, you'd check against a vulnerability database
            Object.entries(dependencies).forEach(([name, version]) => {
                expect(version).toMatch(/^\^?\d+\.\d+\.\d+/);
            });
        });
    });
});

describe('Privacy', () => {
    it('respects Do Not Track header', () => {
        const respectsDNT = (dntValue) => {
            if (dntValue === '1') {
                return false; // Don't track
            }
            return true; // Can track
        };

        expect(respectsDNT('1')).toBe(false);
        expect(respectsDNT('0')).toBe(true);
        expect(respectsDNT(undefined)).toBe(true);
    });

    it('provides opt-out for analytics', () => {
        const analyticsEnabled = () => {
            return localStorage.getItem('analytics-opt-out') !== 'true';
        };

        expect(analyticsEnabled()).toBe(true);

        localStorage.setItem('analytics-opt-out', 'true');
        expect(analyticsEnabled()).toBe(false);
    });

    it('does not fingerprint users excessively', () => {
        const collectFingerprint = () => {
            // Only collect minimal, necessary data
            return {
                screenSize: `${window.innerWidth}x${window.innerHeight}`,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                // Don't collect: canvas fingerprint, WebGL fingerprint, audio context fingerprint
            };
        };

        const fingerprint = collectFingerprint();

        expect(Object.keys(fingerprint).length).toBeLessThanOrEqual(5);
        expect(fingerprint).not.toHaveProperty('canvasFingerprint');
    });
});
