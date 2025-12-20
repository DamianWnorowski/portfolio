/**
 * LiveMetricsTicker (Refactored)
 * Subscribes to metrics stream via MetricsStateManager
 * Only renders when state is 'fresh' (I1 invariant enforced)
 */

import { realtimeService } from '../services/RealtimeService.js';
import { MetricsStateManager } from '../services/MetricsStateManager';
import type { MetricState } from '../types/metrics';

export class LiveMetricsTicker {
  private connectionName = 'metrics';
  private isDev = import.meta.env?.DEV ?? false;

  private stateManager: MetricsStateManager;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.stateManager = new MetricsStateManager();
    this.subscribeToState();
    this.connect();
  }

  private subscribeToState(): void {
    // I1: Only fresh state can trigger render
    this.unsubscribe = this.stateManager.subscribe((state: MetricState) => {
      this.renderState(state);
    });
  }

  private connect(): void {
    this.stateManager.setConnecting();

    realtimeService.connect(this.connectionName, '/api/metrics/stream', {
      onMessage: (payload) => {
        // I3: Atomic update from single message
        this.stateManager.updateSnapshot(payload?.metrics);
      },
      onError: (error) => {
        // I2: No silent failure
        if (this.isDev) console.warn('[LiveMetricsTicker] Stream error:', error);
        this.stateManager.setConnectionError(error?.message || 'Unknown error');
      },
    });

    this.stateManager.setConnected();
  }

  // I1: Render only for fresh state (stale shows warning, error shows message)
  private renderState(state: MetricState): void {
    switch (state.status) {
      case 'fresh':
        this.renderMetrics(state.data);
        break;
      case 'stale':
        this.renderStaleWarning(state.age);
        break;
      case 'error':
        this.renderError(state.reason);
        break;
      case 'connecting':
        this.renderLoading();
        break;
      case 'disconnected':
        this.renderDisconnected();
        break;
    }
  }

  private renderMetrics(data: any): void {
    // Render only if revenue is set
    if (data.revenue) {
      const el = document.getElementById('chip-roi');
      if (el) {
        el.textContent = this.formatRevenue(data.revenue.value);
        el.classList.remove('stale', 'error');
        el.title = '✓ Current';
      }
    }

    // Render only if velocity is set
    if (data.velocity) {
      const el = document.getElementById('chip-velocity');
      if (el) {
        el.textContent = `${Math.round(data.velocity.value)}/s`;
        el.classList.remove('stale', 'error');
        el.title = '✓ Current';
      }
    }

    // Render only if code velocity is set
    if (data.codeVelocity) {
      const el = document.getElementById('chip-oss');
      if (el) {
        el.textContent = `${Math.round(data.codeVelocity.value)}/wk`;
        el.classList.remove('stale', 'error');
        el.title = '✓ Current';
      }
    }

    // Render metric value
    if (data.revenue) {
      const el = document.getElementById('metric-value');
      if (el) {
        el.textContent = this.formatRevenue(data.revenue.value);
        el.classList.remove('stale', 'error');
      }
    }

    // Render metric velocity
    if (data.codeVelocity) {
      const el = document.getElementById('metric-velocity');
      if (el) {
        const baseline = 400;
        const pct = Math.round((data.codeVelocity.value / baseline) * 100);
        el.textContent = `${pct}%`;
        el.classList.remove('stale', 'error');
      }
    }
  }

  private renderStaleWarning(age: number): void {
    const elements = [
      'chip-roi',
      'chip-velocity',
      'chip-oss',
      'metric-value',
      'metric-velocity',
    ];

    elements.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('stale');
        el.title = `⚠ Stale (${Math.round(age / 1000)}s old)`;
      }
    });
  }

  private renderError(reason: string): void {
    const elements = [
      'chip-roi',
      'chip-velocity',
      'chip-oss',
      'metric-value',
      'metric-velocity',
    ];

    elements.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('error');
        el.title = `✗ ${reason}`;
      }
    });
  }

  private renderLoading(): void {
    const elements = [
      'chip-roi',
      'chip-velocity',
      'chip-oss',
      'metric-value',
      'metric-velocity',
    ];

    elements.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = '…';
        el.classList.remove('stale', 'error');
      }
    });
  }

  private renderDisconnected(): void {
    const elements = [
      'chip-roi',
      'chip-velocity',
      'chip-oss',
      'metric-value',
      'metric-velocity',
    ];

    elements.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = '—';
        el.classList.add('error');
        el.title = '✗ Disconnected';
      }
    });
  }

  private formatRevenue(value: number): string {
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    return `$${Math.round(value / 1000)}K`;
  }

  // I7: Cleanup guarantee
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    realtimeService.disconnect(this.connectionName);
    this.stateManager.destroy();
  }
}

// Auto-initialize
export const liveMetricsTicker = new LiveMetricsTicker();
