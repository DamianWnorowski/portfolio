/**
 * Metrics Type System
 * Enforces invariants at compile-time via branded types and state machine
 */

// I4: Value bounds (Revenue, Velocity are typed ranges)
export type Revenue = { readonly __brand: 'Revenue'; readonly value: number };
export type Velocity = { readonly __brand: 'Velocity'; readonly value: number };
export type CodeVelocity = { readonly __brand: 'CodeVelocity'; readonly value: number };

export function Revenue(n: number): Revenue | null {
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000_000) return null;
  return { __brand: 'Revenue', value: n } as Revenue;
}

export function Velocity(n: number): Velocity | null {
  if (!Number.isFinite(n) || n < 0 || n > 10_000) return null;
  return { __brand: 'Velocity', value: n } as Velocity;
}

export function CodeVelocity(n: number): CodeVelocity | null {
  if (!Number.isFinite(n) || n < 0 || n > 10_000) return null;
  return { __brand: 'CodeVelocity', value: n } as CodeVelocity;
}

// I3: Atomic snapshot (all values from same message)
export type MetricSnapshot = Readonly<{
  revenue: Revenue | null;
  velocity: Velocity | null;
  codeVelocity: CodeVelocity | null;
  timestamp: number; // milliseconds since epoch
}>;

// I1: Freshness state machine (only Fresh renders)
export type MetricState =
  | { readonly status: 'disconnected' }
  | { readonly status: 'connecting' }
  | {
      readonly status: 'fresh';
      readonly data: MetricSnapshot;
      readonly age: number; // milliseconds since snapshot
    }
  | {
      readonly status: 'stale';
      readonly data: MetricSnapshot;
      readonly age: number;
    }
  | { readonly status: 'error'; readonly reason: string };

// State constructor (ensures invariant: only Fresh/Stale can have data)
export const MetricState = {
  disconnected: (): MetricState => ({ status: 'disconnected' }),
  connecting: (): MetricState => ({ status: 'connecting' }),
  fresh: (data: MetricSnapshot, age: number): MetricState => ({
    status: 'fresh',
    data,
    age,
  }),
  stale: (data: MetricSnapshot, age: number): MetricState => ({
    status: 'stale',
    data,
    age,
  }),
  error: (reason: string): MetricState => ({ status: 'error', reason }),
};

// I2: Explicit error state prevents silent failures
export type ConnectionState = 'alive' | 'dead';

export const FRESHNESS_THRESHOLD_MS = 5000; // I1: max age before stale
