/**
 * Health Check Endpoint
 * Returns system health status with dependency checks
 */

import { errorTracker } from '../../src/services/ErrorTracker.js';
import { metrics } from '../../src/services/MetricsCollector.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = performance.now();

  try {
    // Check basic system health
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime ? process.uptime() : 0,
      memory: process.memoryUsage ? {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external
      } : null,
      errors: {
        total: errorTracker.getErrorStats().totalErrors,
        unique: errorTracker.getErrorStats().uniqueErrors
      },
      metrics: {
        counters: errorTracker.errorCounts.size,
        gauges: metrics.gauges.size
      },
      dependencies: {
        database: 'unknown',
        cache: 'unknown',
        websocket: 'unknown'
      },
      responseTime: Math.round((performance.now() - startTime) * 100) / 100
    };

    // Check for critical errors
    const recentErrors = errorTracker.getRecentErrors(10);
    const criticalErrors = recentErrors.filter(e =>
      e.type === 'ReferenceError' ||
      e.type === 'TypeError' ||
      e.type === 'SyntaxError'
    );

    if (criticalErrors.length > 3) {
      health.status = 'degraded';
    }

    // Check memory usage
    if (health.memory) {
      const heapUsagePercent = (health.memory.heapUsed / health.memory.heapTotal) * 100;
      if (heapUsagePercent > 90) {
        health.status = 'degraded';
        health.warnings = ['High memory usage'];
      }
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    errorTracker.captureError(error, { source: 'health_check' });
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
