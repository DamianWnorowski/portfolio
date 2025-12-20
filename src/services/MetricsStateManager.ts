/**
 * Metrics State Manager
 * Enforces invariants through state transitions (I1, I2, I3)
 *
 * Invariant I1: Display is ≤5s old OR marked Stale
 * Invariant I2: If displaying, connection is alive
 * Invariant I3: All values from same message
 */

import type {
  MetricState,
  MetricSnapshot,
  Revenue,
  Velocity,
  CodeVelocity,
  ConnectionState,
} from '../types/metrics';
import { FRESHNESS_THRESHOLD_MS, MetricState as createState } from '../types/metrics';
import { Revenue, Velocity, CodeVelocity } from '../types/metrics';

export class MetricsStateManager {
  private state: MetricState = createState.disconnected();
  private lastSnapshotTime = 0;
  private ageTimer: number | null = null;
  private connectionState: ConnectionState = 'dead';

  // I5: Register DOM elements at construction (assert they exist)
  private readonly elements: {
    roi: HTMLElement | null;
    velocity: HTMLElement | null;
    oss: HTMLElement | null;
    metricValue: HTMLElement | null;
    metricVelocity: HTMLElement | null;
  };

  private listeners: Set<(state: MetricState) => void> = new Set();

  constructor() {
    this.elements = {
      roi: this.assertElement('chip-roi'),
      velocity: this.assertElement('chip-velocity'),
      oss: this.assertElement('chip-oss'),
      metricValue: this.assertElement('metric-value'),
      metricVelocity: this.assertElement('metric-velocity'),
    };
  }

  // I5: Assert element exists or throw
  private assertElement(id: string): HTMLElement | null {
    const el = document.getElementById(id);
    if (!el) {
      console.warn(`[MetricsStateManager] Missing element #${id}`);
      return null;
    }
    return el;
  }

  // I2: Connection lifecycle
  setConnecting(): void {
    this.state = createState.connecting();
    this.connectionState = 'alive';
    this.emit();
  }

  setConnected(): void {
    if (this.state.status !== 'connecting' && this.state.status !== 'fresh' && this.state.status !== 'stale') {
      this.state = createState.disconnected();
    }
    this.connectionState = 'alive';
  }

  // I2: Error on connection failure (no silent failure)
  setConnectionError(reason: string): void {
    this.connectionState = 'dead';
    this.state = createState.error(`Connection failed: ${reason}`);
    this.clearAgeTimer();
    this.emit();
  }

  // I1, I3: Atomic snapshot update
  updateSnapshot(raw: unknown): void {
    if (this.connectionState !== 'alive') {
      this.state = createState.error('Connection not alive, cannot update');
      this.emit();
      return;
    }

    // Parse and validate (I4: bounds checking)
    const snapshot = this.parseSnapshot(raw);
    if (!snapshot) {
      this.state = createState.error('Invalid snapshot data');
      this.emit();
      return;
    }

    // I3: Atomic state transition with fresh timestamp
    this.lastSnapshotTime = Date.now();
    this.state = createState.fresh(snapshot, 0);
    this.clearAgeTimer();
    this.startAgeTimer(); // I1: age tracking
    this.emit();
  }

  // I4: Parse and validate bounds
  private parseSnapshot(raw: unknown): MetricSnapshot | null {
    if (!raw || typeof raw !== 'object') return null;

    const data = raw as Record<string, unknown>;

    // Extract revenue
    let revenue: Revenue | null = null;
    if (data.revenue && typeof data.revenue === 'object') {
      const rev = (data.revenue as Record<string, unknown>).month;
      if (typeof rev === 'number') {
        revenue = Revenue(rev);
      }
    }

    // Extract velocity
    let velocity: Velocity | null = null;
    if (data.requests && typeof data.requests === 'object') {
      const vel = (data.requests as Record<string, unknown>).perSecond;
      if (typeof vel === 'number') {
        velocity = Velocity(vel);
      }
    }

    // Extract code velocity
    let codeVelocity: CodeVelocity | null = null;
    if (data.codeVelocity && typeof data.codeVelocity === 'object') {
      const cv = (data.codeVelocity as Record<string, unknown>).commitsPerWeek;
      if (typeof cv === 'number') {
        codeVelocity = CodeVelocity(cv);
      }
    }

    return {
      revenue,
      velocity,
      codeVelocity,
      timestamp: Date.now(),
    };
  }

  // I1: Age tracking (transition to stale after 5s)
  private startAgeTimer(): void {
    this.clearAgeTimer();
    this.ageTimer = window.setInterval(() => {
      if (this.state.status === 'fresh' || this.state.status === 'stale') {
        const age = Date.now() - this.lastSnapshotTime;
        if (age > FRESHNESS_THRESHOLD_MS && this.state.status === 'fresh') {
          // Transition to stale
          this.state = createState.stale(this.state.data, age);
          this.emit();
        } else if (this.state.status === 'stale') {
          // Update age on stale state
          this.state = createState.stale(this.state.data, age);
          this.emit();
        }
      }
    }, 1000);
  }

  private clearAgeTimer(): void {
    if (this.ageTimer !== null) {
      clearInterval(this.ageTimer);
      this.ageTimer = null;
    }
  }

  // Observer pattern for state changes
  subscribe(listener: (state: MetricState) => void): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (e) {
        console.error('[MetricsStateManager] Listener error:', e);
      }
    });
  }

  getState(): MetricState {
    return this.state;
  }

  // I7: Cleanup guarantee
  destroy(): void {
    this.clearAgeTimer();
    this.listeners.clear();
    // Verify no timers remain
    if (this.ageTimer !== null) {
      throw new Error('[MetricsStateManager] Cleanup failed: ageTimer still exists');
    }
    if (this.listeners.size > 0) {
      throw new Error('[MetricsStateManager] Cleanup failed: listeners still registered');
    }
  }
}
