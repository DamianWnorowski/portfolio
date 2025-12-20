/**
 * Edge Functions E2E Tests
 * Comprehensive testing for all edge function endpoints
 * Tests: Auth, rate limiting, geo-routing, signing, optimization
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const EDGE_BASE = `${BASE_URL}/api/edge`;

test.describe('Edge Functions - Auth Validation', () => {
    test('should create and verify JWT token', async ({ request }) => {
        // Login and get token
        const loginResponse = await request.post(`${EDGE_BASE}/auth-validation/login`, {
            data: {
                username: 'testuser',
                password: 'testpass'
            }
        });

        expect(loginResponse.ok()).toBeTruthy();
        const loginData = await loginResponse.json();
        expect(loginData.success).toBe(true);
        expect(loginData.token).toBeDefined();
        expect(loginData.expiresIn).toBeDefined();

        const token = loginData.token;

        // Verify token
        const verifyResponse = await request.post(`${EDGE_BASE}/auth-validation/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            data: {}
        });

        expect(verifyResponse.ok()).toBeTruthy();
        const verifyData = await verifyResponse.json();
        expect(verifyData.valid).toBe(true);
        expect(verifyData.payload).toBeDefined();
        expect(verifyData.payload.sub).toBe('testuser');
    });

    test('should reject invalid token', async ({ request }) => {
        const verifyResponse = await request.post(`${EDGE_BASE}/auth-validation/verify`, {
            headers: {
                'Authorization': 'Bearer invalid.token.here'
            },
            data: {}
        });

        expect(verifyResponse.status()).toBe(401);
        const data = await verifyResponse.json();
        expect(data.valid).toBe(false);
        expect(data.error).toBeDefined();
    });

    test('should refresh expired token', async ({ request }) => {
        // Login
        const loginResponse = await request.post(`${EDGE_BASE}/auth-validation/login`, {
            data: {
                username: 'testuser',
                password: 'testpass'
            }
        });

        const loginData = await loginResponse.json();
        const token = loginData.token;

        // Refresh token
        const refreshResponse = await request.post(`${EDGE_BASE}/auth-validation/refresh`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            data: {}
        });

        expect(refreshResponse.ok()).toBeTruthy();
        const refreshData = await refreshResponse.json();
        expect(refreshData.success).toBe(true);
        expect(refreshData.token).toBeDefined();
        expect(refreshData.token).not.toBe(token); // New token should be different
    });

    test('should check role permissions', async ({ request }) => {
        // Login as admin
        const loginResponse = await request.post(`${EDGE_BASE}/auth-validation/login`, {
            data: {
                username: 'admin',
                password: 'adminpass'
            }
        });

        const loginData = await loginResponse.json();
        const token = loginData.token;

        // Check admin permission
        const permissionResponse = await request.post(`${EDGE_BASE}/auth-validation/check-permission`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            data: {
                requiredRole: 'ADMIN'
            }
        });

        expect(permissionResponse.ok()).toBeTruthy();
        const permissionData = await permissionResponse.json();
        expect(permissionData.hasPermission).toBe(true);
        expect(permissionData.userRole).toBe('ADMIN');
    });

    test('should enforce max refresh count', async ({ request }) => {
        // Login
        const loginResponse = await request.post(`${EDGE_BASE}/auth-validation/login`, {
            data: {
                username: 'testuser',
                password: 'testpass'
            }
        });

        let token = (await loginResponse.json()).token;

        // Refresh token 5 times (max limit)
        for (let i = 0; i < 5; i++) {
            const refreshResponse = await request.post(`${EDGE_BASE}/auth-validation/refresh`, {
                headers: { 'Authorization': `Bearer ${token}` },
                data: {}
            });
            token = (await refreshResponse.json()).token;
        }

        // 6th refresh should fail
        const finalRefresh = await request.post(`${EDGE_BASE}/auth-validation/refresh`, {
            headers: { 'Authorization': `Bearer ${token}` },
            data: {}
        });

        expect(finalRefresh.status()).toBe(401);
        const data = await finalRefresh.json();
        expect(data.error).toContain('Max refresh count exceeded');
    });
});

test.describe('Edge Functions - Rate Limiting', () => {
    test('should allow requests within rate limit', async ({ request }) => {
        const response = await request.get(`${EDGE_BASE}/rate-limit-middleware/status`);

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.status).toBe('ok');
        expect(data.limit).toBeDefined();
        expect(data.remaining).toBeDefined();

        // Check rate limit headers
        const headers = response.headers();
        expect(headers['x-ratelimit-limit']).toBeDefined();
        expect(headers['x-ratelimit-remaining']).toBeDefined();
    });

    test('should enforce rate limits and return 429', async ({ request }) => {
        // Get current rate limit tier
        const tiersResponse = await request.get(`${EDGE_BASE}/rate-limit-middleware/tiers`);
        const tiersData = await tiersResponse.json();
        const strictTier = tiersData.tiers.find(t => t.name === 'strict');
        const limit = strictTier.requests;

        // Make requests up to limit
        for (let i = 0; i < limit; i++) {
            await request.post(`${EDGE_BASE}/rate-limit-middleware/check`, {
                data: { tier: 'strict' }
            });
        }

        // Next request should be rate limited
        const limitedResponse = await request.post(`${EDGE_BASE}/rate-limit-middleware/check`, {
            data: { tier: 'strict' }
        });

        expect(limitedResponse.status()).toBe(429);
        const data = await limitedResponse.json();
        expect(data.error).toContain('Rate limit exceeded');
        expect(data.retryAfter).toBeGreaterThan(0);
    });

    test('should reset rate limit', async ({ request }) => {
        // Make some requests
        await request.get(`${EDGE_BASE}/rate-limit-middleware/status`);

        // Reset rate limit
        const resetResponse = await request.delete(`${EDGE_BASE}/rate-limit-middleware/reset`, {
            data: { tier: 'default' }
        });

        expect(resetResponse.ok()).toBeTruthy();
        const data = await resetResponse.json();
        expect(data.success).toBe(true);
    });

    test('should support different rate limit tiers', async ({ request }) => {
        const tiersResponse = await request.get(`${EDGE_BASE}/rate-limit-middleware/tiers`);

        expect(tiersResponse.ok()).toBeTruthy();
        const data = await tiersResponse.json();
        expect(data.tiers).toBeDefined();
        expect(data.tiers.length).toBeGreaterThan(0);

        // Verify tier structure
        data.tiers.forEach(tier => {
            expect(tier.name).toBeDefined();
            expect(tier.requests).toBeGreaterThan(0);
            expect(tier.window).toBeGreaterThan(0);
        });
    });

    test('should include rate limit info in headers', async ({ request }) => {
        const response = await request.get(`${EDGE_BASE}/rate-limit-middleware/status`);

        const headers = response.headers();
        expect(headers['x-ratelimit-limit']).toBeDefined();
        expect(headers['x-ratelimit-remaining']).toBeDefined();
        expect(headers['x-ratelimit-reset']).toBeDefined();

        const limit = parseInt(headers['x-ratelimit-limit']);
        const remaining = parseInt(headers['x-ratelimit-remaining']);
        expect(remaining).toBeLessThanOrEqual(limit);
    });
});

test.describe('Edge Functions - Geographic Routing', () => {
    test('should determine optimal region based on geo info', async ({ request }) => {
        const response = await request.get(`${EDGE_BASE}/geo-routing/route`);

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.region).toBeDefined();
        expect(data.primary).toBeDefined();
        expect(data.fallback).toBeDefined();
        expect(data.timezone).toBeDefined();
        expect(data.geoInfo).toBeDefined();

        // Check geo headers
        const headers = response.headers();
        expect(headers['x-routed-region']).toBeDefined();
    });

    test('should list all available regions', async ({ request }) => {
        const response = await request.get(`${EDGE_BASE}/geo-routing/regions`);

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.regions).toBeDefined();
        expect(data.total).toBeGreaterThan(0);
        expect(data.currentRegion).toBeDefined();

        // Verify region structure
        data.regions.forEach(region => {
            expect(region.key).toBeDefined();
            expect(region.primary).toBeDefined();
            expect(region.fallback).toBeDefined();
            expect(region.countries).toBeDefined();
            expect(region.timezone).toBeDefined();
        });
    });

    test('should perform health check on regional endpoints', async ({ request }) => {
        const response = await request.post(`${EDGE_BASE}/geo-routing/health-check`, {
            data: { region: 'us-east' }
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.region).toBe('us-east');
        expect(data.primary).toBeDefined();
        expect(data.fallback).toBeDefined();
        expect(data.recommendation).toBeDefined();
    });

    test('should estimate latency based on coordinates', async ({ request }) => {
        const response = await request.post(`${EDGE_BASE}/geo-routing/latency-estimate`, {
            data: {
                targetLat: 37.7749,
                targetLon: -122.4194
            }
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.distance).toBeGreaterThanOrEqual(0);
        expect(data.estimatedLatency).toBeGreaterThan(0);
        expect(data.unit).toBe('ms');
        expect(data.from).toBeDefined();
        expect(data.to).toBeDefined();
    });

    test('should honor preferred region header', async ({ request }) => {
        const response = await request.get(`${EDGE_BASE}/geo-routing/route`, {
            headers: {
                'X-Preferred-Region': 'eu-central'
            }
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.region).toBe('eu-central');
        expect(data.reason).toBe('user-preference');
    });
});

test.describe('Edge Functions - Request Signing', () => {
    test('should generate valid request signature', async ({ request }) => {
        const response = await request.post(`${EDGE_BASE}/request-signing/sign`, {
            data: {
                method: 'POST',
                path: '/api/test',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ test: 'data' })
            }
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.signature).toBeDefined();
        expect(data.timestamp).toBeDefined();
        expect(data.nonce).toBeDefined();
        expect(data.headers).toBeDefined();
        expect(data.headers['X-Signature']).toBe(data.signature);
    });

    test('should verify valid signature', async ({ request }) => {
        // First, sign a request
        const signResponse = await request.post(`${EDGE_BASE}/request-signing/sign`, {
            data: {
                method: 'POST',
                path: '/verify',
                body: JSON.stringify({ test: 'verify' })
            }
        });

        const signData = await signResponse.json();

        // Then verify it
        const verifyResponse = await request.post(`${EDGE_BASE}/request-signing/verify`, {
            headers: {
                'X-Signature': signData.signature,
                'X-Timestamp': String(signData.timestamp),
                'X-Nonce': signData.nonce
            },
            data: { test: 'verify' }
        });

        expect(verifyResponse.ok()).toBeTruthy();
        const verifyData = await verifyResponse.json();
        expect(verifyData.valid).toBe(true);
    });

    test('should reject invalid signature', async ({ request }) => {
        const response = await request.post(`${EDGE_BASE}/request-signing/verify`, {
            headers: {
                'X-Signature': 'invalid-signature',
                'X-Timestamp': String(Math.floor(Date.now() / 1000)),
                'X-Nonce': 'test-nonce-123'
            },
            data: { test: 'data' }
        });

        expect(response.status()).toBe(401);
        const data = await response.json();
        expect(data.valid).toBe(false);
        expect(data.error).toBeDefined();
    });

    test('should reject expired timestamp', async ({ request }) => {
        const expiredTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago

        const response = await request.post(`${EDGE_BASE}/request-signing/verify`, {
            headers: {
                'X-Signature': 'some-signature',
                'X-Timestamp': String(expiredTimestamp),
                'X-Nonce': 'test-nonce'
            },
            data: {}
        });

        expect(response.status()).toBe(401);
        const data = await response.json();
        expect(data.error).toContain('timestamp');
    });

    test('should detect replay attacks with duplicate nonce', async ({ request }) => {
        // Sign a request
        const signResponse = await request.post(`${EDGE_BASE}/request-signing/sign`, {
            data: { method: 'POST', path: '/test', body: JSON.stringify({ test: 'replay' }) }
        });

        const signData = await signResponse.json();

        // First verification should succeed
        const firstVerify = await request.post(`${EDGE_BASE}/request-signing/verify`, {
            headers: {
                'X-Signature': signData.signature,
                'X-Timestamp': String(signData.timestamp),
                'X-Nonce': signData.nonce
            },
            data: { test: 'replay' }
        });

        expect(firstVerify.ok()).toBeTruthy();

        // Second verification with same nonce should fail (replay attack)
        const secondVerify = await request.post(`${EDGE_BASE}/request-signing/verify`, {
            headers: {
                'X-Signature': signData.signature,
                'X-Timestamp': String(signData.timestamp),
                'X-Nonce': signData.nonce
            },
            data: { test: 'replay' }
        });

        expect(secondVerify.status()).toBe(401);
        const data = await secondVerify.json();
        expect(data.error).toContain('replay');
    });

    test('should provide service information', async ({ request }) => {
        const response = await request.get(`${EDGE_BASE}/request-signing/info`);

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.algorithm).toBeDefined();
        expect(data.timestampTolerance).toBeDefined();
        expect(data.requiredHeaders).toContain('X-Signature');
        expect(data.requiredHeaders).toContain('X-Timestamp');
        expect(data.requiredHeaders).toContain('X-Nonce');
    });
});

test.describe('Edge Functions - Response Optimization', () => {
    test('should optimize response with caching headers', async ({ request }) => {
        const response = await request.post(`${EDGE_BASE}/response-optimization/optimize`, {
            data: {
                content: { data: 'test', value: 123 },
                cacheStrategy: 'api',
                minify: true
            }
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();

        // Check optimization headers
        const headers = response.headers();
        expect(headers['etag']).toBeDefined();
        expect(headers['cache-control']).toBeDefined();
        expect(headers['cache-control']).toContain('max-age');
    });

    test('should return 304 for cached content', async ({ request }) => {
        // First request to get ETag
        const firstResponse = await request.post(`${EDGE_BASE}/response-optimization/optimize`, {
            data: {
                content: { test: 'cache' },
                cacheStrategy: 'static'
            }
        });

        const etag = firstResponse.headers()['etag'];

        // Second request with If-None-Match should return 304
        const secondResponse = await request.post(`${EDGE_BASE}/response-optimization/optimize`, {
            headers: {
                'If-None-Match': etag
            },
            data: {
                content: { test: 'cache' },
                cacheStrategy: 'static'
            }
        });

        expect(secondResponse.status()).toBe(304);
    });

    test('should list available cache strategies', async ({ request }) => {
        const response = await request.get(`${EDGE_BASE}/response-optimization/strategies`);

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.strategies).toBeDefined();
        expect(data.strategies.length).toBeGreaterThan(0);

        // Verify strategies
        const strategyNames = data.strategies.map(s => s.name);
        expect(strategyNames).toContain('static');
        expect(strategyNames).toContain('api');
        expect(strategyNames).toContain('dynamic');
    });

    test('should generate cache-control header for strategy', async ({ request }) => {
        const response = await request.post(`${EDGE_BASE}/response-optimization/cache-control`, {
            data: {
                strategy: 'static',
                options: { public: true, immutable: true }
            }
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.cacheControl).toBeDefined();
        expect(data.cacheControl).toContain('public');
        expect(data.cacheControl).toContain('max-age');
    });

    test('should generate ETag for content', async ({ request }) => {
        const content = { test: 'etag', timestamp: Date.now() };

        const response = await request.post(`${EDGE_BASE}/response-optimization/etag`, {
            data: content
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.etag).toBeDefined();
        expect(data.algorithm).toBe('SHA-256');
        expect(data.etag).toMatch(/^"[a-f0-9]{32}"$/);
    });

    test('should include security headers in optimized response', async ({ request }) => {
        const response = await request.get(`${EDGE_BASE}/response-optimization/headers-example`);

        expect(response.ok()).toBeTruthy();
        const headers = response.headers();

        // Security headers
        expect(headers['x-content-type-options']).toBe('nosniff');
        expect(headers['x-frame-options']).toBe('DENY');
        expect(headers['x-xss-protection']).toBe('1; mode=block');
        expect(headers['referrer-policy']).toBeDefined();
    });

    test('should minify JSON content', async ({ request }) => {
        const response = await request.post(`${EDGE_BASE}/response-optimization/optimize`, {
            data: {
                content: {
                    key1: 'value1',
                    key2: 'value2',
                    nested: { a: 1, b: 2 }
                },
                minify: true
            }
        });

        expect(response.ok()).toBeTruthy();
        const responseText = await response.text();

        // Minified JSON should have no extra whitespace
        expect(responseText).not.toContain('\n');
        expect(responseText).not.toContain('  ');
    });
});

test.describe('Edge Functions - CORS Support', () => {
    test('should handle OPTIONS preflight for all edge functions', async ({ request }) => {
        const endpoints = [
            '/auth-validation/login',
            '/rate-limit-middleware/status',
            '/geo-routing/route',
            '/request-signing/sign',
            '/response-optimization/optimize'
        ];

        for (const endpoint of endpoints) {
            const response = await request.fetch(`${EDGE_BASE}${endpoint}`, {
                method: 'OPTIONS'
            });

            expect(response.ok()).toBeTruthy();
            const headers = response.headers();
            expect(headers['access-control-allow-origin']).toBe('*');
            expect(headers['access-control-allow-methods']).toBeDefined();
            expect(headers['access-control-allow-headers']).toBeDefined();
        }
    });

    test('should include CORS headers in responses', async ({ request }) => {
        const response = await request.get(`${EDGE_BASE}/rate-limit-middleware/status`);

        const headers = response.headers();
        expect(headers['access-control-allow-origin']).toBe('*');
    });
});
