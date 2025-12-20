/**
 * Production Error Tracker
 * Tracks, deduplicates, and reports errors with context and stack traces
 */

export class ErrorTracker {
  constructor(config = {}) {
    this.config = {
      maxErrorsInMemory: config.maxErrorsInMemory || 1000,
      enableConsole: config.enableConsole !== false,
      enableRemote: config.enableRemote || false,
      remoteEndpoint: config.remoteEndpoint || 'https://errors.example.com/api/errors',
      ...config
    };

    this.errors = [];
    this.errorCounts = new Map();
    this.errorGroups = new Map();
  }

  captureError(error, context = {}) {
    const errorInfo = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      message: error?.message || String(error),
      stack: error?.stack || undefined,
      type: error?.constructor?.name || 'Error',
      context: {
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        ...context
      },
      fingerprint: this.generateFingerprint(error)
    };

    // Track error frequency
    const fingerprint = errorInfo.fingerprint;
    const count = (this.errorCounts.get(fingerprint) || 0) + 1;
    this.errorCounts.set(fingerprint, count);

    // Group related errors
    if (!this.errorGroups.has(fingerprint)) {
      this.errorGroups.set(fingerprint, {
        firstSeen: errorInfo.timestamp,
        count: 0,
        lastSeen: errorInfo.timestamp,
        examples: []
      });
    }

    const group = this.errorGroups.get(fingerprint);
    group.count++;
    group.lastSeen = errorInfo.timestamp;
    if (group.examples.length < 5) {
      group.examples.push(errorInfo);
    }

    // Store error
    if (this.errors.length >= this.config.maxErrorsInMemory) {
      this.errors.shift();
    }
    this.errors.push(errorInfo);

    // Console output
    if (this.config.enableConsole) {
      console.error(`[ErrorTracker] ${errorInfo.message}`, {
        type: errorInfo.type,
        fingerprint,
        occurrences: count,
        context: errorInfo.context
      });
    }

    // Send to remote
    if (this.config.enableRemote) {
      this.sendError(errorInfo);
    }

    return errorInfo.id;
  }

  captureException(exception, context = {}) {
    return this.captureError(exception, {
      ...context,
      source: 'exception'
    });
  }

  captureUnhandledPromiseRejection(reason, context = {}) {
    return this.captureError(
      reason instanceof Error ? reason : new Error(String(reason)),
      {
        ...context,
        source: 'unhandledPromiseRejection'
      }
    );
  }

  generateErrorId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateFingerprint(error) {
    // Create a fingerprint based on error message and stack
    const message = error?.message || '';
    const stack = error?.stack || '';
    const firstStackLine = stack.split('\n')[1] || '';

    return `${message}:${firstStackLine}`.replace(/:\d+/g, ':N').slice(0, 100);
  }

  async sendError(errorInfo) {
    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorInfo)
      });
    } catch (err) {
      console.error('Failed to send error to remote:', err);
    }
  }

  getErrorStats() {
    return {
      totalErrors: this.errors.length,
      uniqueErrors: this.errorCounts.size,
      errorGroups: Array.from(this.errorGroups.entries()).map(([fingerprint, group]) => ({
        fingerprint,
        ...group
      }))
    };
  }

  getErrorsByType(type) {
    return this.errors.filter(e => e.type === type);
  }

  getErrorsByContext(contextKey, contextValue) {
    return this.errors.filter(e => e.context[contextKey] === contextValue);
  }

  getRecentErrors(limit = 10) {
    return this.errors.slice(-limit).reverse();
  }

  clear() {
    this.errors = [];
    this.errorCounts.clear();
    this.errorGroups.clear();
  }

  getReport() {
    const stats = this.getErrorStats();
    return {
      generatedAt: new Date().toISOString(),
      ...stats,
      recent: this.getRecentErrors(5),
      topErrors: Array.from(this.errorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([fingerprint, count]) => ({
          fingerprint,
          count,
          group: this.errorGroups.get(fingerprint)
        }))
    };
  }
}

// Global error tracker instance
export const errorTracker = new ErrorTracker({
  enableConsole: true,
  enableRemote: process.env.ENABLE_REMOTE_ERROR_TRACKING === 'true',
  remoteEndpoint: process.env.ERROR_TRACKING_ENDPOINT || 'https://errors.example.com/api/errors'
});

// Set up global error handlers
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    errorTracker.captureError(event.error || new Error(event.message), {
      source: 'uncaughtError',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorTracker.captureUnhandledPromiseRejection(event.reason, {
      source: 'unhandledPromiseRejection'
    });
  });
}
