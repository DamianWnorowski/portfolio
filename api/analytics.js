/**
 * Analytics API Endpoint
 * Receives and stores analytics events
 */

export const config = {
    runtime: 'edge',
};

export default async function handler(request) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers });
    }

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers
        });
    }

    try {
        const body = await request.json();

        // Validate event structure
        if (!body.event || typeof body.event !== 'string') {
            return new Response(JSON.stringify({ error: 'Invalid event' }), {
                status: 400,
                headers
            });
        }

        // Extract client info
        const forwarded = request.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
        const userAgent = request.headers.get('user-agent') || '';
        const country = request.headers.get('x-vercel-ip-country') || 'unknown';

        // Anonymize IP (keep only first two octets)
        const anonymizedIp = ip.split('.').slice(0, 2).join('.') + '.x.x';

        const event = {
            type: body.event,
            data: body.data || {},
            timestamp: body.timestamp || Date.now(),
            client: {
                ip: anonymizedIp,
                userAgent: userAgent.slice(0, 200),
                country
            }
        };

        // Store event (use Redis if available, otherwise log only)
        const redisUrl = process.env.UPSTASH_REDIS_URL;
        const redisToken = process.env.UPSTASH_REDIS_TOKEN;

        if (redisUrl && redisToken) {
            await storeInRedis(redisUrl, redisToken, event);
        } else {
            // Just log for now
            console.log('[Analytics]', JSON.stringify(event));
        }

        return new Response(JSON.stringify({ success: true }), { headers });

    } catch (error) {
        console.error('[Analytics API] Error:', error);

        return new Response(JSON.stringify({ error: 'Internal error' }), {
            status: 500,
            headers
        });
    }
}

async function storeInRedis(url, token, event) {
    const today = new Date().toISOString().split('T')[0];
    const key = `analytics:${today}`;

    // Store as list with 7-day retention
    await fetch(`${url}/lpush/${key}/${encodeURIComponent(JSON.stringify(event))}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
    });

    // Set expiry (7 days)
    await fetch(`${url}/expire/${key}/604800`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
    });

    // Increment event type counter
    const counterKey = `analytics:count:${event.type}`;
    await fetch(`${url}/incr/${counterKey}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
    });
}
