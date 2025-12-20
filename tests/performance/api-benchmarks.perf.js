/**
 * Performance Benchmarks for All APIs
 * Comprehensive performance testing for API endpoints
 * Metrics: Response time, throughput, resource usage
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5173/api';
const EDGE_BASE_URL = process.env.EDGE_BASE_URL || 'http://localhost:5173/api/edge';

/**
 * Performance metrics collector
 */
class PerformanceMetrics {
    constructor() {
        this.measurements = [];
    }

    record(name, duration, metadata = {}) {
        this.measurements.push({
            name,
            duration,
            timestamp: Date.now(),
            ...metadata
        });
    }

    getStats(name) {
        const filtered = name
            ? this.measurements.filter(m => m.name === name)
            : this.measurements;

        if (filtered.length === 0) {
            return null;
        }

        const durations = filtered.map(m => m.duration);
        durations.sort((a, b) => a - b);

        return {
            count: filtered.length,
            min: durations[0],
            max: durations[durations.length - 1],
            mean: durations.reduce((a, b) => a + b, 0) / durations.length,
            median: durations[Math.floor(durations.length / 2)],
            p95: durations[Math.floor(durations.length * 0.95)],
            p99: durations[Math.floor(durations.length * 0.99)]
        };
    }

    printStats(name) {
        const stats = this.getStats(name);
        if (!stats) {
            console.log(`No measurements for: ${name}`);
            return;
        }

        console.log(`\nPerformance Stats - ${name || 'All'}:`);
        console.log(`  Count: ${stats.count}`);
        console.log(`  Min: ${stats.min.toFixed(2)}ms`);
        console.log(`  Max: ${stats.max.toFixed(2)}ms`);
        console.log(`  Mean: ${stats.mean.toFixed(2)}ms`);
        console.log(`  Median: ${stats.median.toFixed(2)}ms`);
        console.log(`  P95: ${stats.p95.toFixed(2)}ms`);
        console.log(`  P99: ${stats.p99.toFixed(2)}ms`);
    }

    clear() {
        this.measurements = [];
    }
}

/**
 * Benchmark runner
 */
async function benchmark(name, fn, iterations = 100, metrics) {
    const durations = [];

    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await fn(i);
        const duration = performance.now() - start;

        durations.push(duration);
        metrics.record(name, duration);
    }

    return metrics.getStats(name);
}

test.describe('Performance Benchmarks - Core API Endpoints', () => {
    let metrics;

    test.beforeEach(() => {
        metrics = new PerformanceMetrics();
    });

    test('should benchmark /api/health endpoint', async ({ request }) => {
        const stats = await benchmark(
            'health',
            async () => {
                const response = await request.get(`${API_BASE_URL}/health`);
                expect(response.ok()).toBeTruthy();
            },
            100,
            metrics
        );

        metrics.printStats('health');

        // Performance assertions
        expect(stats.mean).toBeLessThan(500); // < 500ms average
        expect(stats.p95).toBeLessThan(1000); // < 1s for 95th percentile
        expect(stats.p99).toBeLessThan(2000); // < 2s for 99th percentile
    });

    test('should benchmark /api/stats endpoint', async ({ request }) => {
        const stats = await benchmark(
            'stats',
            async () => {
                const response = await request.get(`${API_BASE_URL}/stats`);
                expect(response.ok()).toBeTruthy();
            },
            100,
            metrics
        );

        metrics.printStats('stats');

        expect(stats.mean).toBeLessThan(1000);
        expect(stats.p95).toBeLessThan(2000);
    });

    test('should benchmark /api/visitors endpoint', async ({ request }) => {
        const stats = await benchmark(
            'visitors',
            async () => {
                const response = await request.get(`${API_BASE_URL}/visitors`);
                expect(response.ok()).toBeTruthy();
            },
            100,
            metrics
        );

        metrics.printStats('visitors');

        expect(stats.mean).toBeLessThan(1000);
        expect(stats.p95).toBeLessThan(2000);
    });

    test('should benchmark /api/contact endpoint', async ({ request }) => {
        const stats = await benchmark(
            'contact',
            async (i) => {
                const response = await request.post(`${API_BASE_URL}/contact`, {
                    data: {
                        name: `Test User ${i}`,
                        email: `test${i}@example.com`,
                        message: 'Performance test message'
                    }
                });
                expect(response.ok()).toBeTruthy();
            },
            50, // Fewer iterations for POST
            metrics
        );

        metrics.printStats('contact');

        expect(stats.mean).toBeLessThan(2000);
        expect(stats.p95).toBeLessThan(3000);
    });
});

test.describe('Performance Benchmarks - Edge Functions', () => {
    let metrics;

    test.beforeEach(() => {
        metrics = new PerformanceMetrics();
    });

    test('should benchmark edge auth-validation', async ({ request }) => {
        // First, login to get token
        const loginResponse = await request.post(`${EDGE_BASE_URL}/auth-validation/login`, {
            data: { username: 'perftest', password: 'perftest' }
        });
        const { token } = await loginResponse.json();

        const stats = await benchmark(
            'auth-verify',
            async () => {
                const response = await request.post(`${EDGE_BASE_URL}/auth-validation/verify`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    data: {}
                });
                expect(response.ok()).toBeTruthy();
            },
            100,
            metrics
        );

        metrics.printStats('auth-verify');

        // Edge functions should be very fast
        expect(stats.mean).toBeLessThan(200);
        expect(stats.p95).toBeLessThan(500);
    });

    test('should benchmark edge rate-limit-middleware', async ({ request }) => {
        const stats = await benchmark(
            'rate-limit',
            async () => {
                const response = await request.get(`${EDGE_BASE_URL}/rate-limit-middleware/status`);
                expect(response.ok()).toBeTruthy();
            },
            100,
            metrics
        );

        metrics.printStats('rate-limit');

        expect(stats.mean).toBeLessThan(200);
        expect(stats.p95).toBeLessThan(500);
    });

    test('should benchmark edge geo-routing', async ({ request }) => {
        const stats = await benchmark(
            'geo-routing',
            async () => {
                const response = await request.get(`${EDGE_BASE_URL}/geo-routing/route`);
                expect(response.ok()).toBeTruthy();
            },
            100,
            metrics
        );

        metrics.printStats('geo-routing');

        expect(stats.mean).toBeLessThan(200);
        expect(stats.p95).toBeLessThan(500);
    });

    test('should benchmark edge request-signing', async ({ request }) => {
        const stats = await benchmark(
            'request-signing',
            async (i) => {
                const response = await request.post(`${EDGE_BASE_URL}/request-signing/sign`, {
                    data: {
                        method: 'POST',
                        path: '/test',
                        body: JSON.stringify({ index: i })
                    }
                });
                expect(response.ok()).toBeTruthy();
            },
            100,
            metrics
        );

        metrics.printStats('request-signing');

        expect(stats.mean).toBeLessThan(300);
        expect(stats.p95).toBeLessThan(600);
    });

    test('should benchmark edge response-optimization', async ({ request }) => {
        const stats = await benchmark(
            'response-optimization',
            async (i) => {
                const response = await request.post(`${EDGE_BASE_URL}/response-optimization/optimize`, {
                    data: {
                        content: { data: `test-${i}`, value: i },
                        cacheStrategy: 'api',
                        minify: true
                    }
                });
                expect(response.ok()).toBeTruthy();
            },
            100,
            metrics
        );

        metrics.printStats('response-optimization');

        expect(stats.mean).toBeLessThan(300);
        expect(stats.p95).toBeLessThan(600);
    });
});

test.describe('Performance Benchmarks - Throughput', () => {
    test('should measure concurrent request throughput', async ({ request }) => {
        const concurrency = 50;
        const requestsPerClient = 20;
        const metrics = new PerformanceMetrics();

        const start = Date.now();

        // Create concurrent clients
        const clients = Array.from({ length: concurrency }, async (_, i) => {
            for (let j = 0; j < requestsPerClient; j++) {
                const reqStart = performance.now();

                await request.get(`${API_BASE_URL}/health`);

                const duration = performance.now() - reqStart;
                metrics.record('concurrent-health', duration, { client: i, request: j });
            }
        });

        await Promise.all(clients);

        const totalTime = (Date.now() - start) / 1000; // seconds
        const totalRequests = concurrency * requestsPerClient;
        const throughput = totalRequests / totalTime;

        console.log(`\nThroughput Test:`);
        console.log(`  Total requests: ${totalRequests}`);
        console.log(`  Total time: ${totalTime.toFixed(2)}s`);
        console.log(`  Throughput: ${throughput.toFixed(2)} req/sec`);

        metrics.printStats('concurrent-health');

        // Should handle good throughput
        expect(throughput).toBeGreaterThan(50); // > 50 req/sec
    });

    test('should measure sustained throughput over time', async ({ request }) => {
        const duration = 30000; // 30 seconds
        const metrics = new PerformanceMetrics();
        const checkpoints = [];

        const startTime = Date.now();
        let requestCount = 0;

        while (Date.now() - startTime < duration) {
            const reqStart = performance.now();

            await request.get(`${API_BASE_URL}/health`);

            const reqDuration = performance.now() - reqStart;
            metrics.record('sustained', reqDuration);
            requestCount++;

            // Record checkpoint every 5 seconds
            const elapsed = Date.now() - startTime;
            if (elapsed % 5000 < 100 && checkpoints.length < 6) {
                const stats = metrics.getStats('sustained');
                checkpoints.push({
                    elapsed,
                    count: requestCount,
                    avgLatency: stats.mean
                });
            }
        }

        const totalTime = (Date.now() - startTime) / 1000;
        const avgThroughput = requestCount / totalTime;

        console.log(`\nSustained Throughput Test:`);
        console.log(`  Duration: ${totalTime.toFixed(2)}s`);
        console.log(`  Total requests: ${requestCount}`);
        console.log(`  Avg throughput: ${avgThroughput.toFixed(2)} req/sec`);
        console.log(`  Checkpoints:`, checkpoints);

        // Performance should be consistent
        if (checkpoints.length >= 2) {
            const firstAvg = checkpoints[0].avgLatency;
            const lastAvg = checkpoints[checkpoints.length - 1].avgLatency;
            const degradation = ((lastAvg - firstAvg) / firstAvg) * 100;

            console.log(`  Degradation: ${degradation.toFixed(2)}%`);

            expect(degradation).toBeLessThan(50); // < 50% degradation
        }
    }, 60000);
});

test.describe('Performance Benchmarks - Payload Size', () => {
    test('should benchmark different payload sizes', async ({ request }) => {
        const metrics = new PerformanceMetrics();
        const sizes = [
            { name: 'tiny', size: 100 },
            { name: 'small', size: 1024 },
            { name: 'medium', size: 10240 },
            { name: 'large', size: 102400 }
        ];

        for (const { name, size } of sizes) {
            const payload = 'x'.repeat(size);

            const stats = await benchmark(
                `payload-${name}`,
                async () => {
                    const response = await request.post(`${API_BASE_URL}/contact`, {
                        data: {
                            name: 'Perf Test',
                            email: 'perf@example.com',
                            message: payload
                        }
                    });
                    expect(response.ok()).toBeTruthy();
                },
                20,
                metrics
            );

            console.log(`\nPayload size: ${name} (${size} bytes)`);
            metrics.printStats(`payload-${name}`);
        }

        // Verify scaling
        const tinyStats = metrics.getStats('payload-tiny');
        const largeStats = metrics.getStats('payload-large');

        // Large payload shouldn't be 100x slower than tiny
        const ratio = largeStats.mean / tinyStats.mean;
        expect(ratio).toBeLessThan(10);
    });
});

test.describe('Performance Benchmarks - Cache Performance', () => {
    test('should measure cache hit vs cache miss performance', async ({ request }) => {
        const metrics = new PerformanceMetrics();

        // First request (cache miss)
        const missStart = performance.now();
        const missResponse = await request.post(`${EDGE_BASE_URL}/response-optimization/optimize`, {
            data: {
                content: { cached: 'data', timestamp: Date.now() },
                cacheStrategy: 'static'
            }
        });
        const missDuration = performance.now() - missStart;
        const etag = missResponse.headers()['etag'];

        metrics.record('cache-miss', missDuration);

        // Subsequent requests (cache hit)
        for (let i = 0; i < 10; i++) {
            const hitStart = performance.now();

            const hitResponse = await request.post(`${EDGE_BASE_URL}/response-optimization/optimize`, {
                headers: { 'If-None-Match': etag },
                data: {
                    content: { cached: 'data', timestamp: Date.now() },
                    cacheStrategy: 'static'
                }
            });

            const hitDuration = performance.now() - hitStart;
            metrics.record('cache-hit', hitDuration);

            expect(hitResponse.status()).toBe(304);
        }

        const missStats = metrics.getStats('cache-miss');
        const hitStats = metrics.getStats('cache-hit');

        console.log(`\nCache Performance:`);
        console.log(`  Cache miss: ${missStats.mean.toFixed(2)}ms`);
        console.log(`  Cache hit: ${hitStats.mean.toFixed(2)}ms`);
        console.log(`  Speedup: ${(missStats.mean / hitStats.mean).toFixed(2)}x`);

        // Cache hits should be significantly faster
        expect(hitStats.mean).toBeLessThan(missStats.mean * 0.8);
    });
});

test.describe('Performance Benchmarks - Resource Usage', () => {
    test('should measure memory efficiency with multiple requests', async ({ request }) => {
        const iterations = 500;
        const batchSize = 50;
        const metrics = new PerformanceMetrics();

        for (let batch = 0; batch < iterations / batchSize; batch++) {
            const batchPromises = [];

            for (let i = 0; i < batchSize; i++) {
                const promise = (async () => {
                    const start = performance.now();
                    await request.get(`${API_BASE_URL}/health`);
                    const duration = performance.now() - start;
                    metrics.record('memory-test', duration);
                })();

                batchPromises.push(promise);
            }

            await Promise.all(batchPromises);

            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const stats = metrics.getStats('memory-test');
        metrics.printStats('memory-test');

        // Performance should remain consistent across batches
        expect(stats.p95).toBeLessThan(2000);
        expect(stats.count).toBe(iterations);
    }, 120000);
});

test.describe('Performance Benchmarks - Edge Cold Start', () => {
    test('should measure edge function cold start latency', async ({ request }) => {
        // Wait to ensure cold start
        await new Promise(resolve => setTimeout(resolve, 5000));

        const coldStart = performance.now();
        const response = await request.get(`${EDGE_BASE_URL}/geo-routing/route`);
        const coldDuration = performance.now() - coldStart;

        expect(response.ok()).toBeTruthy();

        console.log(`\nEdge Cold Start: ${coldDuration.toFixed(2)}ms`);

        // Subsequent warm requests
        const warmDurations = [];
        for (let i = 0; i < 10; i++) {
            const warmStart = performance.now();
            await request.get(`${EDGE_BASE_URL}/geo-routing/route`);
            warmDurations.push(performance.now() - warmStart);
        }

        const avgWarm = warmDurations.reduce((a, b) => a + b, 0) / warmDurations.length;

        console.log(`Avg Warm Request: ${avgWarm.toFixed(2)}ms`);
        console.log(`Cold vs Warm Ratio: ${(coldDuration / avgWarm).toFixed(2)}x`);

        // Cold start should be reasonable
        expect(coldDuration).toBeLessThan(5000); // < 5s cold start
        expect(avgWarm).toBeLessThan(500); // < 500ms warm
    });
});

test.describe('Performance Benchmarks - Summary Report', () => {
    test('should generate comprehensive performance report', async ({ request }) => {
        const metrics = new PerformanceMetrics();
        const endpoints = [
            { name: 'health', url: `${API_BASE_URL}/health`, method: 'GET' },
            { name: 'stats', url: `${API_BASE_URL}/stats`, method: 'GET' },
            { name: 'visitors', url: `${API_BASE_URL}/visitors`, method: 'GET' },
            { name: 'edge-auth', url: `${EDGE_BASE_URL}/auth-validation/login`, method: 'POST', data: { username: 'test', password: 'test' } },
            { name: 'edge-rate', url: `${EDGE_BASE_URL}/rate-limit-middleware/status`, method: 'GET' },
            { name: 'edge-geo', url: `${EDGE_BASE_URL}/geo-routing/route`, method: 'GET' }
        ];

        const report = {
            timestamp: new Date().toISOString(),
            endpoints: []
        };

        for (const endpoint of endpoints) {
            const stats = await benchmark(
                endpoint.name,
                async () => {
                    const response = endpoint.method === 'GET'
                        ? await request.get(endpoint.url)
                        : await request.post(endpoint.url, { data: endpoint.data || {} });

                    expect(response.ok()).toBeTruthy();
                },
                50,
                metrics
            );

            report.endpoints.push({
                name: endpoint.name,
                url: endpoint.url,
                ...stats
            });
        }

        console.log('\n=== PERFORMANCE REPORT ===');
        console.log(JSON.stringify(report, null, 2));

        // All endpoints should meet performance targets
        report.endpoints.forEach(ep => {
            expect(ep.p95).toBeLessThan(2000); // < 2s for 95th percentile
        });
    });
});
