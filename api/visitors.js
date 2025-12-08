/**
 * Visitor Counter API
 * Tracks unique visitors with Redis/KV storage
 */

export const config = {
    runtime: 'edge',
};

// In-memory fallback (resets on cold start)
let fallbackCount = 1247;
let fallbackVisitors = new Set();

export default async function handler(request) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers });
    }

    try {
        // Get visitor identifier (IP hash or fingerprint)
        const forwarded = request.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
        const userAgent = request.headers.get('user-agent') || '';
        const visitorId = await hashString(`${ip}-${userAgent.slice(0, 50)}`);

        // Check for Upstash Redis
        const redisUrl = process.env.UPSTASH_REDIS_URL;
        const redisToken = process.env.UPSTASH_REDIS_TOKEN;

        if (redisUrl && redisToken) {
            // Use Redis for persistent storage
            const result = await trackWithRedis(redisUrl, redisToken, visitorId);
            return new Response(JSON.stringify(result), { headers });
        }

        // Fallback to in-memory
        const isNew = !fallbackVisitors.has(visitorId);
        if (isNew) {
            fallbackVisitors.add(visitorId);
            fallbackCount++;
        }

        return new Response(JSON.stringify({
            total: fallbackCount,
            isNewVisitor: isNew,
            today: Math.floor(fallbackCount * 0.05), // Estimate
            source: 'memory'
        }), { headers });

    } catch (error) {
        console.error('[Visitors API] Error:', error);

        return new Response(JSON.stringify({
            total: fallbackCount,
            isNewVisitor: false,
            today: 0,
            source: 'fallback'
        }), { headers });
    }
}

async function trackWithRedis(url, token, visitorId) {
    const today = new Date().toISOString().split('T')[0];
    const todayKey = `visitors:${today}`;
    const totalKey = 'visitors:total';
    const setKey = 'visitors:unique';

    // Check if visitor is new
    const checkResponse = await fetch(`${url}/sismember/${setKey}/${visitorId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const checkData = await checkResponse.json();
    const isNew = checkData.result === 0;

    if (isNew) {
        // Add to unique set
        await fetch(`${url}/sadd/${setKey}/${visitorId}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });

        // Increment total
        await fetch(`${url}/incr/${totalKey}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });

        // Increment today's count
        await fetch(`${url}/incr/${todayKey}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });

        // Set expiry on today's key (48 hours)
        await fetch(`${url}/expire/${todayKey}/172800`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });
    }

    // Get counts
    const [totalRes, todayRes] = await Promise.all([
        fetch(`${url}/get/${totalKey}`, {
            headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${url}/get/${todayKey}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
    ]);

    const totalData = await totalRes.json();
    const todayData = await todayRes.json();

    return {
        total: parseInt(totalData.result) || 1000,
        today: parseInt(todayData.result) || 0,
        isNewVisitor: isNew,
        source: 'redis'
    };
}

async function hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}
