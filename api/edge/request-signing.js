/**
 * Request Signing Edge Function
 * HMAC signature verification and request integrity validation
 * Runtime: Vercel Edge (V8 Isolate)
 */

export const config = {
    runtime: 'edge'
};

// Configuration
const SIGNING_SECRET = process.env.SIGNING_SECRET || 'dev-signing-secret-change-in-production';
const SIGNATURE_ALGORITHM = 'SHA-256';
const TIMESTAMP_TOLERANCE = 300; // 5 minutes in seconds
const NONCE_CACHE_SIZE = 10000;

// In-memory nonce tracking for replay prevention
const nonceCache = new Set();

/**
 * Generate HMAC signature
 */
async function generateSignature(payload, secret = SIGNING_SECRET) {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const keyData = encoder.encode(secret);

    const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: SIGNATURE_ALGORITHM },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, data);
    return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Verify HMAC signature
 */
async function verifySignature(payload, signature, secret = SIGNING_SECRET) {
    const expectedSignature = await generateSignature(payload, secret);
    return signature === expectedSignature;
}

/**
 * Generate cryptographic nonce
 */
function generateNonce() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Create canonical request string
 */
function createCanonicalRequest(method, path, headers, body, timestamp, nonce) {
    const sortedHeaders = Object.keys(headers)
        .sort()
        .map(key => `${key.toLowerCase()}:${headers[key]}`)
        .join('\n');

    return [
        method.toUpperCase(),
        path,
        sortedHeaders,
        body || '',
        timestamp,
        nonce
    ].join('\n');
}

/**
 * Check if timestamp is within tolerance
 */
function isTimestampValid(timestamp) {
    const now = Math.floor(Date.now() / 1000);
    const diff = Math.abs(now - timestamp);
    return diff <= TIMESTAMP_TOLERANCE;
}

/**
 * Check and record nonce to prevent replay attacks
 */
function checkNonce(nonce) {
    if (nonceCache.has(nonce)) {
        return false; // Replay detected
    }

    // Add to cache
    nonceCache.add(nonce);

    // Evict old nonces if cache is too large
    if (nonceCache.size > NONCE_CACHE_SIZE) {
        const iterator = nonceCache.values();
        nonceCache.delete(iterator.next().value);
    }

    return true;
}

/**
 * Extract and validate signature from request
 */
async function validateRequest(req, body) {
    const signature = req.headers.get('x-signature');
    const timestamp = req.headers.get('x-timestamp');
    const nonce = req.headers.get('x-nonce');

    if (!signature || !timestamp || !nonce) {
        return {
            valid: false,
            error: 'Missing required headers: x-signature, x-timestamp, x-nonce'
        };
    }

    // Validate timestamp
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts) || !isTimestampValid(ts)) {
        return {
            valid: false,
            error: 'Invalid or expired timestamp'
        };
    }

    // Check for replay attack
    if (!checkNonce(nonce)) {
        return {
            valid: false,
            error: 'Nonce already used (replay attack detected)'
        };
    }

    // Create canonical request
    const url = new URL(req.url);
    const headers = {
        'content-type': req.headers.get('content-type') || '',
        'x-api-key': req.headers.get('x-api-key') || ''
    };

    const canonical = createCanonicalRequest(
        req.method,
        url.pathname,
        headers,
        body,
        timestamp,
        nonce
    );

    // Verify signature
    const valid = await verifySignature(canonical, signature);

    if (!valid) {
        return {
            valid: false,
            error: 'Invalid signature'
        };
    }

    return {
        valid: true,
        timestamp: ts,
        nonce
    };
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
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Signature, X-Timestamp, X-Nonce, X-API-Key',
                'Access-Control-Max-Age': '86400'
            }
        });
    }

    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

    try {
        // Route: POST /api/edge/request-signing/sign
        if (url.pathname.endsWith('/sign') && req.method === 'POST') {
            const body = await req.text();
            const bodyObj = JSON.parse(body);

            const timestamp = Math.floor(Date.now() / 1000);
            const nonce = generateNonce();

            const requestHeaders = bodyObj.headers || {};
            const canonical = createCanonicalRequest(
                bodyObj.method || 'POST',
                bodyObj.path || '/',
                requestHeaders,
                bodyObj.body || '',
                timestamp,
                nonce
            );

            const signature = await generateSignature(canonical);

            return new Response(JSON.stringify({
                signature,
                timestamp,
                nonce,
                expiresAt: timestamp + TIMESTAMP_TOLERANCE,
                headers: {
                    'X-Signature': signature,
                    'X-Timestamp': String(timestamp),
                    'X-Nonce': nonce
                }
            }), {
                status: 200,
                headers
            });
        }

        // Route: POST /api/edge/request-signing/verify
        if (url.pathname.endsWith('/verify') && req.method === 'POST') {
            const body = await req.text();
            const result = await validateRequest(req, body);

            return new Response(JSON.stringify({
                valid: result.valid,
                error: result.error,
                timestamp: result.timestamp,
                nonce: result.nonce
            }), {
                status: result.valid ? 200 : 401,
                headers
            });
        }

        // Route: POST /api/edge/request-signing/protected
        // Example of a protected endpoint
        if (url.pathname.endsWith('/protected') && req.method === 'POST') {
            const body = await req.text();
            const result = await validateRequest(req, body);

            if (!result.valid) {
                return new Response(JSON.stringify({
                    error: 'Unauthorized',
                    message: result.error
                }), {
                    status: 401,
                    headers
                });
            }

            // Process the validated request
            const data = body ? JSON.parse(body) : {};

            return new Response(JSON.stringify({
                success: true,
                message: 'Request validated and processed',
                data,
                validatedAt: new Date(result.timestamp * 1000).toISOString()
            }), {
                status: 200,
                headers
            });
        }

        // Route: GET /api/edge/request-signing/info
        if (url.pathname.endsWith('/info')) {
            return new Response(JSON.stringify({
                algorithm: SIGNATURE_ALGORITHM,
                timestampTolerance: TIMESTAMP_TOLERANCE,
                timestampToleranceMinutes: TIMESTAMP_TOLERANCE / 60,
                nonceCacheSize: nonceCache.size,
                maxNonceCache: NONCE_CACHE_SIZE,
                requiredHeaders: ['X-Signature', 'X-Timestamp', 'X-Nonce'],
                endpoints: ['/sign', '/verify', '/protected', '/info']
            }), {
                status: 200,
                headers
            });
        }

        // Route: DELETE /api/edge/request-signing/nonce-cache
        if (url.pathname.endsWith('/nonce-cache') && req.method === 'DELETE') {
            const sizeBefore = nonceCache.size;
            nonceCache.clear();

            return new Response(JSON.stringify({
                success: true,
                message: 'Nonce cache cleared',
                clearedCount: sizeBefore
            }), {
                status: 200,
                headers
            });
        }

        // Default: Documentation
        return new Response(JSON.stringify({
            message: 'Request signing service',
            description: 'HMAC-based request signing and verification',
            algorithm: SIGNATURE_ALGORITHM,
            endpoints: [
                {
                    path: '/sign',
                    method: 'POST',
                    description: 'Generate signature for request'
                },
                {
                    path: '/verify',
                    method: 'POST',
                    description: 'Verify request signature'
                },
                {
                    path: '/protected',
                    method: 'POST',
                    description: 'Example protected endpoint'
                },
                {
                    path: '/info',
                    method: 'GET',
                    description: 'Service information'
                }
            ]
        }), {
            status: 200,
            headers
        });

    } catch (error) {
        console.error('Request signing error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            message: error.message
        }), {
            status: 500,
            headers
        });
    }
}
