/**
 * LiveMetricsTicker
 * Subscribes to `/api/metrics/stream` (SSE) and updates header/globe metric readouts.
 */

import { realtimeService } from '../services/RealtimeService.js';

export class LiveMetricsTicker {
    constructor() {
        this.connectionName = 'metrics';
        this.isDev = import.meta.env?.DEV ?? false;

        this.elRoi = document.getElementById('chip-roi');
        this.elVel = document.getElementById('chip-velocity');
        this.elOss = document.getElementById('chip-oss');

        this.elMetricValue = document.getElementById('metric-value');
        this.elMetricVelocity = document.getElementById('metric-velocity');

        if (!this.elRoi && !this.elVel && !this.elOss && !this.elMetricValue && !this.elMetricVelocity) {
            return;
        }

        this.connect();
    }

    connect() {
        realtimeService.connect(this.connectionName, '/api/metrics/stream', {
            onMessage: (payload) => {
                const metrics = payload?.metrics;
                if (!metrics) return;
                this.update(metrics);
            },
            onError: () => {
                if (this.isDev) console.warn('[LiveMetricsTicker] stream error');
            },
        });
    }

    update(metrics) {
        // Header chips
        if (this.elVel && metrics.requests?.perSecond != null) {
            this.elVel.textContent = `${Math.round(metrics.requests.perSecond)}/s`;
        }

        if (this.elRoi && metrics.revenue?.growth != null) {
            const g = Number(metrics.revenue.growth);
            if (Number.isFinite(g)) this.elRoi.textContent = `${g >= 0 ? '+' : ''}${g.toFixed(1)}%`;
        }

        if (this.elOss && metrics.codeVelocity?.commitsPerWeek != null) {
            const c = Number(metrics.codeVelocity.commitsPerWeek);
            if (Number.isFinite(c)) this.elOss.textContent = `${Math.round(c)}/wk`;
        }

        // Globe overlay: map revenue + velocity into existing readouts
        if (this.elMetricValue && metrics.revenue?.month != null) {
            const m = Number(metrics.revenue.month);
            if (Number.isFinite(m)) {
                const display = m >= 1_000_000 ? `$${(m / 1_000_000).toFixed(1)}M` : `$${Math.round(m / 1000)}K`;
                this.elMetricValue.textContent = display;
            }
        }

        if (this.elMetricVelocity && metrics.codeVelocity?.linesPerDay != null) {
            const l = Number(metrics.codeVelocity.linesPerDay);
            if (Number.isFinite(l)) {
                const baseline = 400; // "industry baseline" for percent mapping
                const pct = Math.round((l / baseline) * 100);
                this.elMetricVelocity.textContent = `${pct}%`;
            }
        }
    }

    destroy() {
        realtimeService.disconnect(this.connectionName);
    }
}

