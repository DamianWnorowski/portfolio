/**
 * Auth Validation Edge Function
 * JWT validation, session management, and role-based access control
 * Runtime: Vercel Edge (V8 Isolate)
 */

export const config = {
    runtime: 'edge'
};

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const MAX_REFRESH_COUNT = 5;

// Role hierarchy
const ROLES = {
    ADMIN: 100,
    USER: 50,
    GUEST: 10,
    ANONYMOUS: 0
};

/**
 * Simple JWT verification (Edge-compatible)
 */
async function verifyJWT(token) {
    try {
        const [headerB64, payloadB64, signatureB64] = token.split('.');

        if (!headerB64 || !payloadB64 || !signatureB64) {
            return { valid: false, error: 'Invalid token format' };
        }

        // Decode payload
        const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));

        // Verify expiration
        if (payload.exp && payload.exp * 1000 < Date.now()) {
            return { valid: false, error: 'Token expired', expired: true };
        }

        // Verify signature using Web Crypto API
        const encoder = new TextEncoder();
        const data = encoder.encode(`${headerB64}.${payloadB64}`);
        const secretKey = encoder.encode(JWT_SECRET);

        const key = await crypto.subtle.importKey(
            'raw',
            secretKey,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign', 'verify']
        );

        const signature = Uint8Array.from(
            atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
            c => c.charCodeAt(0)
        );

        const valid = await crypto.subtle.verify('HMAC', key, signature, data);

        if (!valid) {
            return { valid: false, error: 'Invalid signature' };
        }

        return { valid: true, payload };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

/**
 * Create JWT token
 */
async function createJWT(payload, expiresIn = SESSION_DURATION) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);

    const claims = {
        ...payload,
        iat: now,
        exp: now + Math.floor(expiresIn / 1000)
    };

    const headerB64 = btoa(JSON.stringify(header))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const payloadB64 = btoa(JSON.stringify(claims))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    const encoder = new TextEncoder();
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const secretKey = encoder.encode(JWT_SECRET);

    const key = await crypto.subtle.importKey(
        'raw',
        secretKey,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, data);
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    return `${headerB64}.${payloadB64}.${signatureB64}`;
}

/**
 * Extract token from request
 */
function extractToken(req) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // Check cookie
    const cookies = req.headers.get('cookie');
    if (cookies) {
        const match = cookies.match(/auth_token=([^;]+)/);
        if (match) return match[1];
    }

    return null;
}

/**
 * Check role permissions
 */
function hasPermission(userRole, requiredRole) {
    return ROLES[userRole] >= ROLES[requiredRole];
}

/**
 * Main handler
 */
export default async function handler(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '86400'
            }
        });
    }

    try {
        // Route: POST /api/edge/auth-validation/login
        if (path.endsWith('/login') && req.method === 'POST') {
            const body = await req.json();
            const { username, password } = body;

            // Demo authentication (replace with real auth)
            if (username && password) {
                const token = await createJWT({
                    sub: username,
                    role: username === 'admin' ? 'ADMIN' : 'USER',
                    refreshCount: 0
                });

                return new Response(JSON.stringify({
                    success: true,
                    token,
                    expiresIn: SESSION_DURATION
                }), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }

            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid credentials'
            }), { status: 401 });
        }

        // Route: POST /api/edge/auth-validation/verify
        if (path.endsWith('/verify') && req.method === 'POST') {
            const token = extractToken(req);

            if (!token) {
                return new Response(JSON.stringify({
                    valid: false,
                    error: 'No token provided'
                }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const result = await verifyJWT(token);

            return new Response(JSON.stringify(result), {
                status: result.valid ? 200 : 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // Route: POST /api/edge/auth-validation/refresh
        if (path.endsWith('/refresh') && req.method === 'POST') {
            const token = extractToken(req);

            if (!token) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'No token provided'
                }), { status: 401 });
            }

            const result = await verifyJWT(token);

            if (!result.valid && !result.expired) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Invalid token'
                }), { status: 401 });
            }

            // Check refresh limit
            const refreshCount = result.payload?.refreshCount || 0;
            if (refreshCount >= MAX_REFRESH_COUNT) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Max refresh count exceeded. Please login again.'
                }), { status: 401 });
            }

            // Create new token
            const newToken = await createJWT({
                ...result.payload,
                refreshCount: refreshCount + 1
            });

            return new Response(JSON.stringify({
                success: true,
                token: newToken,
                expiresIn: SESSION_DURATION
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // Route: POST /api/edge/auth-validation/check-permission
        if (path.endsWith('/check-permission') && req.method === 'POST') {
            const token = extractToken(req);
            const body = await req.json();
            const { requiredRole = 'USER' } = body;

            if (!token) {
                return new Response(JSON.stringify({
                    hasPermission: false,
                    error: 'No token provided'
                }), { status: 401 });
            }

            const result = await verifyJWT(token);

            if (!result.valid) {
                return new Response(JSON.stringify({
                    hasPermission: false,
                    error: result.error
                }), { status: 401 });
            }

            const userRole = result.payload.role || 'GUEST';
            const permitted = hasPermission(userRole, requiredRole);

            return new Response(JSON.stringify({
                hasPermission: permitted,
                userRole,
                requiredRole
            }), {
                status: permitted ? 200 : 403,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // Default: Invalid endpoint
        return new Response(JSON.stringify({
            error: 'Invalid endpoint',
            availableEndpoints: ['/login', '/verify', '/refresh', '/check-permission']
        }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Auth validation error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
