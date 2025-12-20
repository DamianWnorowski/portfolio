/**
 * Geographic Routing Edge Function
 * Multi-region routing with latency optimization
 * Runtime: Vercel Edge (V8 Isolate)
 */

export const config = {
    runtime: 'edge'
};

// Regional endpoints configuration
const REGIONAL_ENDPOINTS = {
    'us-east': {
        primary: 'https://api-us-east.example.com',
        fallback: 'https://api-us-west.example.com',
        regions: ['US', 'CA', 'MX'],
        timezone: 'America/New_York'
    },
    'us-west': {
        primary: 'https://api-us-west.example.com',
        fallback: 'https://api-us-east.example.com',
        regions: ['US', 'CA'],
        timezone: 'America/Los_Angeles'
    },
    'eu-central': {
        primary: 'https://api-eu-central.example.com',
        fallback: 'https://api-eu-west.example.com',
        regions: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'PL'],
        timezone: 'Europe/Berlin'
    },
    'eu-west': {
        primary: 'https://api-eu-west.example.com',
        fallback: 'https://api-eu-central.example.com',
        regions: ['GB', 'IE'],
        timezone: 'Europe/London'
    },
    'asia-pacific': {
        primary: 'https://api-asia-pacific.example.com',
        fallback: 'https://api-asia-east.example.com',
        regions: ['SG', 'IN', 'AU', 'NZ', 'MY', 'TH', 'ID', 'PH'],
        timezone: 'Asia/Singapore'
    },
    'asia-east': {
        primary: 'https://api-asia-east.example.com',
        fallback: 'https://api-asia-pacific.example.com',
        regions: ['JP', 'KR', 'TW', 'HK'],
        timezone: 'Asia/Tokyo'
    }
};

// Default fallback
const DEFAULT_REGION = 'us-east';

/**
 * Get geographic info from request headers
 */
function getGeoInfo(req) {
    return {
        country: req.headers.get('x-vercel-ip-country') || 'US',
        region: req.headers.get('x-vercel-ip-country-region') || '',
        city: req.headers.get('x-vercel-ip-city') || '',
        latitude: req.headers.get('x-vercel-ip-latitude') || '',
        longitude: req.headers.get('x-vercel-ip-longitude') || '',
        timezone: req.headers.get('x-vercel-ip-timezone') || 'UTC'
    };
}

/**
 * Determine optimal region based on geo info
 */
function determineRegion(geoInfo) {
    const country = geoInfo.country;

    // Find matching region
    for (const [regionKey, config] of Object.entries(REGIONAL_ENDPOINTS)) {
        if (config.regions.includes(country)) {
            return regionKey;
        }
    }

    // Fallback based on continent heuristics
    if (['US', 'CA', 'MX', 'BR', 'AR', 'CL'].includes(country)) {
        return 'us-east';
    }
    if (['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'PL', 'SE', 'NO', 'DK', 'FI'].includes(country)) {
        return 'eu-central';
    }
    if (['JP', 'KR', 'CN', 'TW', 'HK', 'SG', 'IN', 'AU', 'NZ'].includes(country)) {
        return 'asia-pacific';
    }

    return DEFAULT_REGION;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Estimate latency based on distance (simple heuristic)
 */
function estimateLatency(distance) {
    // Rough estimate: 1ms per 100km + base latency
    const propagationDelay = distance / 100;
    const baseLatency = 10;
    return Math.round(baseLatency + propagationDelay);
}

/**
 * Get routing decision
 */
function getRoutingDecision(req, geoInfo) {
    const region = determineRegion(geoInfo);
    const config = REGIONAL_ENDPOINTS[region] || REGIONAL_ENDPOINTS[DEFAULT_REGION];

    // Check for custom routing preferences
    const preferredRegion = req.headers.get('x-preferred-region');
    if (preferredRegion && REGIONAL_ENDPOINTS[preferredRegion]) {
        return {
            region: preferredRegion,
            ...REGIONAL_ENDPOINTS[preferredRegion],
            reason: 'user-preference'
        };
    }

    return {
        region,
        ...config,
        reason: 'geo-optimal'
    };
}

/**
 * Health check for endpoint
 */
async function checkEndpointHealth(endpoint, timeout = 3000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const start = performance.now();
        const response = await fetch(`${endpoint}/health`, {
            method: 'HEAD',
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        return {
            healthy: response.ok,
            latency: Math.round(performance.now() - start),
            status: response.status
        };
    } catch (error) {
        clearTimeout(timeoutId);
        return {
            healthy: false,
            latency: timeout,
            error: error.message
        };
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
                'Access-Control-Allow-Headers': 'Content-Type, X-Preferred-Region',
                'Access-Control-Max-Age': '86400'
            }
        });
    }

    try {
        const geoInfo = getGeoInfo(req);
        const routing = getRoutingDecision(req, geoInfo);

        const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'X-Routed-Region': routing.region,
            'X-Geo-Country': geoInfo.country,
            'X-Geo-City': geoInfo.city
        };

        // Route: GET /api/edge/geo-routing/route
        if (url.pathname.endsWith('/route')) {
            return new Response(JSON.stringify({
                region: routing.region,
                primary: routing.primary,
                fallback: routing.fallback,
                timezone: routing.timezone,
                reason: routing.reason,
                geoInfo
            }), {
                status: 200,
                headers
            });
        }

        // Route: GET /api/edge/geo-routing/regions
        if (url.pathname.endsWith('/regions')) {
            const regions = Object.entries(REGIONAL_ENDPOINTS).map(([key, config]) => ({
                key,
                primary: config.primary,
                fallback: config.fallback,
                countries: config.regions,
                timezone: config.timezone
            }));

            return new Response(JSON.stringify({
                regions,
                total: regions.length,
                currentRegion: routing.region
            }), {
                status: 200,
                headers
            });
        }

        // Route: POST /api/edge/geo-routing/health-check
        if (url.pathname.endsWith('/health-check') && req.method === 'POST') {
            const body = await req.json();
            const targetRegion = body.region || routing.region;
            const config = REGIONAL_ENDPOINTS[targetRegion];

            if (!config) {
                return new Response(JSON.stringify({
                    error: 'Invalid region',
                    region: targetRegion
                }), { status: 400, headers });
            }

            // Check both primary and fallback
            const [primaryHealth, fallbackHealth] = await Promise.all([
                checkEndpointHealth(config.primary),
                checkEndpointHealth(config.fallback)
            ]);

            return new Response(JSON.stringify({
                region: targetRegion,
                primary: {
                    endpoint: config.primary,
                    ...primaryHealth
                },
                fallback: {
                    endpoint: config.fallback,
                    ...fallbackHealth
                },
                recommendation: primaryHealth.healthy ? 'primary' :
                               fallbackHealth.healthy ? 'fallback' : 'degraded'
            }), {
                status: 200,
                headers
            });
        }

        // Route: POST /api/edge/geo-routing/latency-estimate
        if (url.pathname.endsWith('/latency-estimate') && req.method === 'POST') {
            const body = await req.json();
            const { targetLat, targetLon } = body;

            if (!targetLat || !targetLon || !geoInfo.latitude || !geoInfo.longitude) {
                return new Response(JSON.stringify({
                    error: 'Missing coordinates',
                    geoInfo
                }), { status: 400, headers });
            }

            const distance = calculateDistance(
                parseFloat(geoInfo.latitude),
                parseFloat(geoInfo.longitude),
                parseFloat(targetLat),
                parseFloat(targetLon)
            );

            const estimatedLatency = estimateLatency(distance);

            return new Response(JSON.stringify({
                distance: Math.round(distance),
                estimatedLatency,
                unit: 'ms',
                from: {
                    lat: geoInfo.latitude,
                    lon: geoInfo.longitude,
                    city: geoInfo.city
                },
                to: {
                    lat: targetLat,
                    lon: targetLon
                }
            }), {
                status: 200,
                headers
            });
        }

        // Default: Return routing info
        return new Response(JSON.stringify({
            message: 'Geographic routing service',
            routing: {
                region: routing.region,
                primary: routing.primary,
                fallback: routing.fallback,
                reason: routing.reason
            },
            geoInfo,
            endpoints: ['/route', '/regions', '/health-check', '/latency-estimate']
        }), {
            status: 200,
            headers
        });

    } catch (error) {
        console.error('Geo routing error:', error);
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
