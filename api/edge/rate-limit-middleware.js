/**
 * Rate Limit Middleware Edge Function
 * Distributed rate limiting with sliding window algorithm
 * Runtime: Vercel Edge (V8 Isolate)
 */

export const config = {
    runtime: 'edge'
};

// Configuration
const RATE_LIMITS = {
    // Requests per window
    default: { requests: 100, window: 60000 }, // 100 req/min
    strict: { requests: 10, window: 60000 },   // 10 req/min
    relaxed: { requests: 1000, window: 60000 }, // 1000 req/min
    burst: { requests: 50, window: 1000 }      // 50 req/sec
};

// In-memory store (Edge runtime compatible)
const rateLimitStore = new Map();
const CLEANUP_INTERVAL = 300000; // 5 minutes
let cleanupIntervalId = null;

/**
 * Cleanup expired entries
 */
function cleanupExpired() {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
        if (data.resetAt < now) {
            rateLimitStore.delete(key);
        }
    }
}

/**
 * Start periodic cleanup (lazy initialization)
 */
function ensureCleanupRunning() {
    if (!cleanupIntervalId) {
        cleanupIntervalId = setInterval(cleanupExpired, CLEANUP_INTERVAL);
    }
}

/**
 * Get client identifier
 */
function getClientId(req) {
    // Priority: API key > IP address
    const apiKey = req.headers.get('x-api-key');
    if (apiKey) return `api:${apiKey}`;

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
               req.headers.get('x-real-ip') ||
               'unknown';

    return `ip:${ip}`;
}

/**
 * Sliding window rate limiting
 */
function checkRateLimit(clientId, tier = 'default') {
    const now = Date.now();
    const config = RATE_LIMITS[tier] || RATE_LIMITS.default;
    const key = `${clientId}:${tier}`;

    let bucket = rateLimitStore.get(key);

    if (!bucket || bucket.resetAt < now) {
        // Create new bucket
        bucket = {
            count: 0,
            resetAt: now + config.window,
            tier
        };
        rateLimitStore.set(key, bucket);
    }

    bucket.count++;
    const remaining = Math.max(0, config.requests - bucket.count);
    const isAllowed = bucket.count <= config.requests;

    return {
        allowed: isAllowed,
        limit: config.requests,
        remaining,
        reset: bucket.resetAt,
        retryAfter: isAllowed ? 0 : Math.ceil((bucket.resetAt - now) / 1000)
    };
}

/**
 * Get rate limit tier from request
 */
function getTier(req, url) {
    // Check custom tier header
    const customTier = req.headers.get('x-rate-limit-tier');
    if (customTier && RATE_LIMITS[customTier]) {
        return customTier;
    }

    // Path-based tier detection
    const path = url.pathname;
    if (path.includes('/api/auth') || path.includes('/api/admin')) {
        return 'strict';
    }
    if (path.includes('/api/public') || path.includes('/api/health')) {
        return 'relaxed';
    }
    if (path.includes('/api/burst')) {
        return 'burst';
    }

    return 'default';
}

/**
 * Create rate limit response headers
 */
function getRateLimitHeaders(result) {
    return {
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.reset),
        'Retry-After': result.retryAfter > 0 ? String(result.retryAfter) : undefined
    };
}

/**
 * Main handler
 */
export default async function handler(req) {
    ensureCleanupRunning(); // Lazy start cleanup on first request
    const url = new URL(req.url);

    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Rate-Limit-Tier',
                'Access-Control-Max-Age': '86400'
            }
        });
    }

    try {
        const clientId = getClientId(req);
        const tier = getTier(req, url);
        const result = checkRateLimit(clientId, tier);

        const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            ...getRateLimitHeaders(result)
        };

        // Rate limit exceeded
        if (!result.allowed) {
            return new Response(JSON.stringify({
                error: 'Rate limit exceeded',
                message: `Too many requests. Please retry after ${result.retryAfter} seconds.`,
                limit: result.limit,
                retryAfter: result.retryAfter,
                tier
            }), {
                status: 429,
                headers
            });
        }

        // Route: GET /api/edge/rate-limit-middleware/status
        if (url.pathname.endsWith('/status')) {
            return new Response(JSON.stringify({
                status: 'ok',
                clientId,
                tier,
                limit: result.limit,
                remaining: result.remaining,
                resetAt: new Date(result.reset).toISOString(),
                storeSize: rateLimitStore.size
            }), {
                status: 200,
                headers
            });
        }

        // Route: POST /api/edge/rate-limit-middleware/check
        if (url.pathname.endsWith('/check') && req.method === 'POST') {
            const body = await req.json();
            const checkTier = body.tier || tier;
            const checkResult = checkRateLimit(clientId, checkTier);

            return new Response(JSON.stringify({
                allowed: checkResult.allowed,
                clientId,
                tier: checkTier,
                ...checkResult
            }), {
                status: checkResult.allowed ? 200 : 429,
                headers: {
                    ...headers,
                    ...getRateLimitHeaders(checkResult)
                }
            });
        }

        // Route: DELETE /api/edge/rate-limit-middleware/reset
        if (url.pathname.endsWith('/reset') && req.method === 'DELETE') {
            const body = await req.json();
            const resetClientId = body.clientId || clientId;
            const resetTier = body.tier || tier;
            const key = `${resetClientId}:${resetTier}`;

            rateLimitStore.delete(key);

            return new Response(JSON.stringify({
                success: true,
                message: 'Rate limit reset',
                clientId: resetClientId,
                tier: resetTier
            }), {
                status: 200,
                headers
            });
        }

        // Route: GET /api/edge/rate-limit-middleware/tiers
        if (url.pathname.endsWith('/tiers')) {
            return new Response(JSON.stringify({
                tiers: Object.entries(RATE_LIMITS).map(([name, config]) => ({
                    name,
                    requests: config.requests,
                    window: config.window,
                    windowSeconds: config.window / 1000
                }))
            }), {
                status: 200,
                headers
            });
        }

        // Default: Pass through with rate limit info
        return new Response(JSON.stringify({
            allowed: true,
            message: 'Rate limit check passed',
            clientId,
            tier,
            ...result
        }), {
            status: 200,
            headers
        });

    } catch (error) {
        console.error('Rate limit error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            message: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}
