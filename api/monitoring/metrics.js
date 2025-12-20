/**
 * Metrics Endpoint
 * Exposes Prometheus-compatible metrics for monitoring
 */

import { metrics } from '../../src/services/MetricsCollector.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return metrics in Prometheus format
  const prometheusMetrics = metrics.getMetricsAsPrometheus();

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.status(200).send(prometheusMetrics);
}
