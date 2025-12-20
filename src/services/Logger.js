/**
 * Production Logger Service
 * Centralized logging with structured output, log levels, and correlation IDs
 * Supports console, file, and external service logging
 */

export class Logger {
  constructor(serviceName = 'kaizen', config = {}) {
    this.serviceName = serviceName;
    this.config = {
      level: config.level || 'info', // debug, info, warn, error
      enableConsole: config.enableConsole !== false,
      enableFile: config.enableFile || false,
      enableRemote: config.enableRemote || false,
      remoteEndpoint: config.remoteEndpoint || 'https://logs.example.com/api/logs',
      batchSize: config.batchSize || 50,
      flushInterval: config.flushInterval || 5000,
      correlationIdHeader: 'x-correlation-id',
      ...config
    };

    this.logLevels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      critical: 4
    };

    this.currentLevel = this.logLevels[this.config.level] || this.logLevels.info;
    this.batch = [];
    this.correlationId = this.generateCorrelationId();

    if (this.config.enableRemote) {
      this.startBatchFlush();
    }
  }

  generateCorrelationId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  setCorrelationId(id) {
    this.correlationId = id;
  }

  shouldLog(level) {
    return this.logLevels[level] >= this.currentLevel;
  }

  formatTimestamp() {
    return new Date().toISOString();
  }

  formatLog(level, message, data = {}) {
    return {
      timestamp: this.formatTimestamp(),
      level,
      service: this.serviceName,
      correlationId: this.correlationId,
      message,
      data,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    };
}

  log(level, message, data = {}) {
    if (!this.shouldLog(level)) return;

    const logEntry = this.formatLog(level, message, data);

    // Console output
    if (this.config.enableConsole) {
      const consoleLevel = level === 'critical' ? 'error' : level;
      console[consoleLevel](`[${logEntry.timestamp}] [${level.toUpperCase()}] ${message}`, logEntry.data);
    }

    // Batch for remote sending
    if (this.config.enableRemote) {
      this.batch.push(logEntry);
      if (this.batch.length >= this.config.batchSize) {
        this.flush();
      }
    }
  }

  debug(message, data) {
    this.log('debug', message, data);
  }

  info(message, data) {
    this.log('info', message, data);
  }

  warn(message, data) {
    this.log('warn', message, data);
  }

  error(message, error, data = {}) {
    const errorData = {
      ...data,
      errorMessage: error?.message || String(error),
      errorStack: error?.stack || undefined
    };
    this.log('error', message, errorData);
  }

  critical(message, error, data = {}) {
    const errorData = {
      ...data,
      errorMessage: error?.message || String(error),
      errorStack: error?.stack || undefined
    };
    this.log('critical', message, errorData);
  }

  async flush() {
    if (this.batch.length === 0) return;

    const logsToSend = [...this.batch];
    this.batch = [];

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [this.config.correlationIdHeader]: this.correlationId
        },
        body: JSON.stringify({ logs: logsToSend })
      });
    } catch (err) {
      // Fallback: log locally if remote logging fails
      console.error('Failed to send logs remotely:', err);
    }
  }

  startBatchFlush() {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  stopBatchFlush() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
  }

  createChild(childServiceName) {
    const child = new Logger(childServiceName, this.config);
    child.correlationId = this.correlationId;
    return child;
  }

  destroy() {
    this.stopBatchFlush();
    this.flush();
  }
}

// Global logger instance
export const logger = new Logger('kaizen', {
  level: process.env.LOG_LEVEL || 'info',
  enableConsole: true,
  enableRemote: process.env.ENABLE_REMOTE_LOGGING === 'true',
  remoteEndpoint: process.env.LOG_ENDPOINT || 'https://logs.example.com/api/logs'
});
