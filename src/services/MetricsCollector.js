/**
 * Production Metrics Collector
 * Tracks performance metrics, business metrics, and system health
 * Supports histograms, counters, gauges, and summaries
 */

export class MetricsCollector {
  constructor(serviceName = 'kaizen') {
    this.serviceName = serviceName;
    this.metrics = new Map();
    this.timers = new Map();
    this.histograms = new Map();
    this.counters = new Map();
    this.gauges = new Map();
    this.summaries = new Map();
  }

  // Counters - monotonically increasing values
  incrementCounter(name, amount = 1, labels = {}) {
    const key = this.createLabelKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + amount);
  }

  // Gauges - arbitrary point-in-time values
  setGauge(name, value, labels = {}) {
    const key = this.createLabelKey(name, labels);
    this.gauges.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  // Histograms - track distribution of values
  recordHistogram(name, value, labels = {}) {
    const key = this.createLabelKey(name, labels);
    if (!this.histograms.has(key)) {
      this.histograms.set(key, []);
    }
    this.histograms.get(key).push(value);
  }

  // Summaries - track aggregated metrics
  recordSummary(name, value, labels = {}) {
    const key = this.createLabelKey(name, labels);
    if (!this.summaries.has(key)) {
      this.summaries.set(key, {
        count: 0,
        sum: 0,
        min: Infinity,
        max: -Infinity,
        values: []
      });
    }
    const summary = this.summaries.get(key);
    summary.count++;
    summary.sum += value;
    summary.min = Math.min(summary.min, value);
    summary.max = Math.max(summary.max, value);
    summary.values.push(value);
  }

  // Timer - measure duration
  startTimer(name) {
    const timerId = `${name}-${Date.now()}-${Math.random()}`;
    this.timers.set(timerId, {
      name,
      startTime: performance.now()
    });
    return timerId;
  }

  endTimer(timerId, labels = {}) {
    const timer = this.timers.get(timerId);
    if (!timer) {
      console.warn(`Timer ${timerId} not found`);
      return null;
    }

    const duration = performance.now() - timer.startTime;
    this.recordHistogram(timer.name, duration, labels);
    this.recordSummary(`${timer.name}_summary`, duration, labels);
    this.timers.delete(timerId);
    return duration;
  }

  // Async timer wrapper
  async measureAsync(name, fn, labels = {}) {
    const timerId = this.startTimer(name);
    try {
      const result = await fn();
      this.endTimer(timerId, { ...labels, status: 'success' });
      return result;
    } catch (error) {
      this.endTimer(timerId, { ...labels, status: 'error' });
      throw error;
    }
  }

  // Sync timer wrapper
  measureSync(name, fn, labels = {}) {
    const timerId = this.startTimer(name);
    try {
      const result = fn();
      this.endTimer(timerId, { ...labels, status: 'success' });
      return result;
    } catch (error) {
      this.endTimer(timerId, { ...labels, status: 'error' });
      throw error;
    }
  }

  // Get histogram statistics
  getHistogramStats(name, labels = {}) {
    const key = this.createLabelKey(name, labels);
    const values = this.histograms.get(key) || [];

    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  // Get all metrics as Prometheus format
  getMetricsAsPrometheus() {
    let output = '';

    // Counters
    for (const [key, value] of this.counters.entries()) {
      const { name, labels } = this.parseKey(key);
      const labelStr = this.formatLabels(labels);
      output += `# HELP ${name} Counter metric\n`;
      output += `# TYPE ${name} counter\n`;
      output += `${name}${labelStr} ${value}\n\n`;
    }

    // Gauges
    for (const [key, { value }] of this.gauges.entries()) {
      const { name, labels } = this.parseKey(key);
      const labelStr = this.formatLabels(labels);
      output += `# HELP ${name} Gauge metric\n`;
      output += `# TYPE ${name} gauge\n`;
      output += `${name}${labelStr} ${value}\n\n`;
    }

    // Histograms
    for (const [key] of this.histograms.entries()) {
      const { name, labels } = this.parseKey(key);
      const stats = this.getHistogramStats(name, labels);
      if (stats) {
        const labelStr = this.formatLabels(labels);
        output += `# HELP ${name} Histogram metric\n`;
        output += `# TYPE ${name} histogram\n`;
        output += `${name}_bucket{le="0.1",${this.formatLabels(labels, false)}} ${stats.count}\n`;
        output += `${name}_bucket{le="1",${this.formatLabels(labels, false)}} ${stats.count}\n`;
        output += `${name}_bucket{le="10",${this.formatLabels(labels, false)}} ${stats.count}\n`;
        output += `${name}_sum${labelStr} ${stats.mean * stats.count}\n`;
        output += `${name}_count${labelStr} ${stats.count}\n\n`;
      }
    }

    return output;
  }

  // Get summary JSON
  getMetricsAsJSON() {
    return {
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      summaries: Object.fromEntries(
        Array.from(this.summaries.entries()).map(([key, summary]) => {
          const { mean, median, min, max, count } = summary;
          return [key, { mean, median, min, max, count }];
        })
      )
    };
  }

  createLabelKey(name, labels) {
    const sortedLabels = Object.keys(labels)
      .sort()
      .map(k => `${k}=${labels[k]}`)
      .join(',');
    return sortedLabels ? `${name}{${sortedLabels}}` : name;
  }

  parseKey(key) {
    const match = key.match(/^([^{]+)(?:\{(.+)\})?$/);
    if (!match) return { name: key, labels: {} };

    const name = match[1];
    const labelsStr = match[2] || '';
    const labels = {};

    if (labelsStr) {
      labelsStr.split(',').forEach(pair => {
        const [k, v] = pair.split('=');
        labels[k] = v;
      });
    }

    return { name, labels };
  }

  formatLabels(labels, includeBraces = true) {
    if (Object.keys(labels).length === 0) return includeBraces ? '' : '';
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return includeBraces ? `{${labelStr}}` : labelStr;
  }

  reset(name) {
    Array.from(this.counters.keys()).forEach(key => {
      if (key.startsWith(name)) this.counters.delete(key);
    });
    Array.from(this.gauges.keys()).forEach(key => {
      if (key.startsWith(name)) this.gauges.delete(key);
    });
    Array.from(this.histograms.keys()).forEach(key => {
      if (key.startsWith(name)) this.histograms.delete(key);
    });
  }

  clear() {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.summaries.clear();
  }
}

// Global metrics instance
export const metrics = new MetricsCollector('kaizen');
