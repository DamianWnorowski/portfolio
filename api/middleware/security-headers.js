/**
 * Security Headers Middleware
 * Enforces CORS, CSP, and other security headers
 */

const corsConfig = {
  allowedOrigins: [
    'https://kaizen-elite.vercel.app',
    'https://kaizen-elite-staging.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Correlation-ID'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'ETag'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

const cspRules = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'connect-src': ["'self'", 'https:', 'wss:'],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"]
};

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
};

function generateCSP() {
  return Object.entries(cspRules)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}

function isCorsAllowed(origin) {
  return corsConfig.allowedOrigins.includes(origin) ||
         corsConfig.allowedOrigins.some(allowed => {
           if (allowed === '*') return true;
           if (allowed.includes('*')) {
             const pattern = allowed.replace(/\*/g, '.*');
             return new RegExp(`^${pattern}$`).test(origin);
           }
           return allowed === origin;
         });
}

export function applyCorsHeaders(req, res) {
  const origin = req.headers.origin || req.headers.referer?.split('/')[2];

  if (origin && isCorsAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', corsConfig.credentials);
    res.setHeader('Access-Control-Allow-Methods', corsConfig.allowedMethods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', corsConfig.allowedHeaders.join(', '));
    res.setHeader('Access-Control-Expose-Headers', corsConfig.exposedHeaders.join(', '));
    res.setHeader('Access-Control-Max-Age', corsConfig.maxAge);
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }

  return false;
}

export function applySecurityHeaders(res) {
  // Apply CSP
  res.setHeader('Content-Security-Policy', generateCSP());

  // Apply other security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
}

export function securityHeadersMiddleware(req, res, next) {
  // Apply CORS headers
  if (applyCorsHeaders(req, res)) {
    return;
  }

  // Apply security headers
  applySecurityHeaders(res);

  // Add request ID for tracking
  const requestId = req.headers['x-correlation-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', requestId);

  // Add timestamp
  res.setHeader('X-Timestamp', new Date().toISOString());

  next?.();
}

export default securityHeadersMiddleware;
