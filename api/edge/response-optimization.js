/**
 * Response Optimization Edge Function
 * Compression, caching, and content optimization
 * Runtime: Vercel Edge (V8 Isolate)
 */

export const config = {
    runtime: 'edge'
};

// Configuration
const CACHE_STRATEGIES = {
    static: {
        maxAge: 31536000, // 1 year
        sMaxAge: 31536000,
        staleWhileRevalidate: 86400,
        staleIfError: 604800
    },
    api: {
        maxAge: 60, // 1 minute
        sMaxAge: 300,
        staleWhileRevalidate: 600,
        staleIfError: 3600
    },
    dynamic: {
        maxAge: 0,
        sMaxAge: 0,
        staleWhileRevalidate: 60,
        staleIfError: 300
    },
    immutable: {
        maxAge: 31536000,
        immutable: true
    }
};

const COMPRESSION_THRESHOLD = 1024; // 1KB

/**
 * Detect content type from response
 */
function getContentType(headers, body) {
    const existing = headers.get('content-type');
    if (existing) return existing;

    // Auto-detect from body
    if (typeof body === 'string') {
        if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
            return 'application/json';
        }
        if (body.trim().startsWith('<')) {
            return 'text/html';
        }
        return 'text/plain';
    }

    return 'application/octet-stream';
}

/**
 * Determine if content should be compressed
 */
function shouldCompress(contentType, contentLength) {
    if (contentLength < COMPRESSION_THRESHOLD) {
        return false;
    }

    const compressibleTypes = [
        'text/',
        'application/json',
        'application/javascript',
        'application/xml',
        'application/xhtml+xml',
        'image/svg+xml'
    ];

    return compressibleTypes.some(type => contentType.includes(type));
}

/**
 * Check if client accepts compression
 */
function clientAcceptsCompression(req, encoding) {
    const acceptEncoding = req.headers.get('accept-encoding') || '';
    return acceptEncoding.includes(encoding);
}

/**
 * Build cache control header
 */
function buildCacheControl(strategy, options = {}) {
    const config = CACHE_STRATEGIES[strategy] || CACHE_STRATEGIES.dynamic;
    const parts = [];

    if (config.maxAge !== undefined) {
        parts.push(`max-age=${config.maxAge}`);
    }

    if (config.sMaxAge !== undefined) {
        parts.push(`s-maxage=${config.sMaxAge}`);
    }

    if (config.staleWhileRevalidate !== undefined) {
        parts.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
    }

    if (config.staleIfError !== undefined) {
        parts.push(`stale-if-error=${config.staleIfError}`);
    }

    if (config.immutable) {
        parts.push('immutable');
    }

    if (options.public) {
        parts.push('public');
    } else if (options.private) {
        parts.push('private');
    }

    if (options.noCache) {
        parts.push('no-cache');
    }

    if (options.noStore) {
        parts.push('no-store');
    }

    if (options.mustRevalidate) {
        parts.push('must-revalidate');
    }

    return parts.join(', ');
}

/**
 * Generate ETag for content
 */
async function generateETag(content) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `"${hashHex.substring(0, 32)}"`;
}

/**
 * Check if cached content is still valid
 */
function checkIfNoneMatch(req, etag) {
    const ifNoneMatch = req.headers.get('if-none-match');
    if (!ifNoneMatch) return false;

    const clientETags = ifNoneMatch.split(',').map(e => e.trim());
    return clientETags.includes(etag) || clientETags.includes('*');
}

/**
 * Optimize response headers
 */
function optimizeHeaders(headers, options = {}) {
    const optimized = new Headers(headers);

    // Security headers
    if (options.security !== false) {
        optimized.set('X-Content-Type-Options', 'nosniff');
        optimized.set('X-Frame-Options', 'DENY');
        optimized.set('X-XSS-Protection', '1; mode=block');
        optimized.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    // Performance headers
    optimized.set('X-DNS-Prefetch-Control', 'on');

    // Remove unnecessary headers
    optimized.delete('x-powered-by');

    return optimized;
}

/**
 * Minify JSON
 */
function minifyJSON(json) {
    try {
        const parsed = typeof json === 'string' ? JSON.parse(json) : json;
        return JSON.stringify(parsed);
    } catch {
        return json;
    }
}

/**
 * Main handler
 */
export default async function handler(req) {
    const url = new URL(req.url);

    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, If-None-Match',
                'Access-Control-Max-Age': '86400'
            }
        });
    }

    try {
        // Route: POST /api/edge/response-optimization/optimize
        if (url.pathname.endsWith('/optimize') && req.method === 'POST') {
            const body = await req.text();
            const data = JSON.parse(body);

            const {
                content,
                cacheStrategy = 'dynamic',
                minify = true,
                compress = true,
                security = true
            } = data;

            // Minify if requested
            let optimizedContent = content;
            if (minify && typeof content === 'object') {
                optimizedContent = minifyJSON(content);
            } else if (typeof content === 'object') {
                optimizedContent = JSON.stringify(content);
            }

            // Generate ETag
            const etag = await generateETag(optimizedContent);

            // Check if client has cached version
            if (checkIfNoneMatch(req, etag)) {
                return new Response(null, {
                    status: 304,
                    headers: {
                        'ETag': etag,
                        'Cache-Control': buildCacheControl(cacheStrategy, { public: true })
                    }
                });
            }

            // Build headers
            let headers = new Headers({
                'Content-Type': 'application/json',
                'ETag': etag,
                'Cache-Control': buildCacheControl(cacheStrategy, { public: true }),
                'Vary': 'Accept-Encoding'
            });

            // Optimize headers
            headers = optimizeHeaders(headers, { security });

            // CORS
            headers.set('Access-Control-Allow-Origin', '*');

            const contentLength = new TextEncoder().encode(optimizedContent).length;
            headers.set('Content-Length', String(contentLength));

            // Note: Edge runtime doesn't support compression streams yet
            // In production, this would be handled by Vercel's CDN

            return new Response(optimizedContent, {
                status: 200,
                headers
            });
        }

        // Route: GET /api/edge/response-optimization/strategies
        if (url.pathname.endsWith('/strategies')) {
            return new Response(JSON.stringify({
                strategies: Object.entries(CACHE_STRATEGIES).map(([name, config]) => ({
                    name,
                    ...config
                })),
                compression: {
                    threshold: COMPRESSION_THRESHOLD,
                    thresholdKB: COMPRESSION_THRESHOLD / 1024
                }
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': buildCacheControl('api', { public: true })
                }
            });
        }

        // Route: POST /api/edge/response-optimization/cache-control
        if (url.pathname.endsWith('/cache-control') && req.method === 'POST') {
            const body = await req.json();
            const { strategy = 'dynamic', options = {} } = body;

            const cacheControl = buildCacheControl(strategy, options);

            return new Response(JSON.stringify({
                cacheControl,
                strategy,
                options,
                config: CACHE_STRATEGIES[strategy] || CACHE_STRATEGIES.dynamic
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': cacheControl
                }
            });
        }

        // Route: POST /api/edge/response-optimization/etag
        if (url.pathname.endsWith('/etag') && req.method === 'POST') {
            const body = await req.text();
            const etag = await generateETag(body);

            return new Response(JSON.stringify({
                etag,
                algorithm: 'SHA-256',
                length: etag.length
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // Route: GET /api/edge/response-optimization/headers-example
        if (url.pathname.endsWith('/headers-example')) {
            const exampleHeaders = optimizeHeaders(new Headers({
                'Content-Type': 'application/json'
            }), { security: true });

            const headersObj = {};
            exampleHeaders.forEach((value, key) => {
                headersObj[key] = value;
            });

            return new Response(JSON.stringify({
                headers: headersObj,
                description: 'Optimized security and performance headers'
            }), {
                status: 200,
                headers: {
                    ...headersObj,
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // Default: Service info
        return new Response(JSON.stringify({
            message: 'Response optimization service',
            features: [
                'Cache-Control header generation',
                'ETag generation and validation',
                'Content minification',
                'Security headers optimization',
                'Compression detection'
            ],
            endpoints: [
                '/optimize',
                '/strategies',
                '/cache-control',
                '/etag',
                '/headers-example'
            ],
            compressionThreshold: COMPRESSION_THRESHOLD
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': buildCacheControl('api', { public: true })
            }
        });

    } catch (error) {
        console.error('Response optimization error:', error);
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
