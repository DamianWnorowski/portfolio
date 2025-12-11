/**
 * Contact Form API - Ultra-Elite Edge Function
 * Secure contact form handler with rate limiting, validation, and multi-channel delivery
 */

export const config = {
    runtime: 'edge'
};

// In-memory rate limiting (per edge instance)
const rateLimitStore = new Map();
const RATE_LIMIT = {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5
};

// Input validation patterns
const VALIDATION = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    name: /^[\p{L}\s'-]{2,100}$/u,
    message: { min: 10, max: 5000 },
    honeypot: 'website_url' // Hidden field to catch bots
};

// Sanitize input
function sanitize(str) {
    if (!str) return '';
    return String(str)
        .replace(/[<>]/g, '')
        .trim()
        .slice(0, 10000);
}

// Check rate limit
function checkRateLimit(ip) {
    const now = Date.now();
    const record = rateLimitStore.get(ip);
    
    if (!record) {
        rateLimitStore.set(ip, { count: 1, firstRequest: now });
        return { allowed: true, remaining: RATE_LIMIT.maxRequests - 1 };
    }
    
    // Reset if window expired
    if (now - record.firstRequest > RATE_LIMIT.windowMs) {
        rateLimitStore.set(ip, { count: 1, firstRequest: now });
        return { allowed: true, remaining: RATE_LIMIT.maxRequests - 1 };
    }
    
    // Increment and check
    record.count++;
    const remaining = RATE_LIMIT.maxRequests - record.count;
    
    return {
        allowed: record.count <= RATE_LIMIT.maxRequests,
        remaining: Math.max(0, remaining),
        resetAt: record.firstRequest + RATE_LIMIT.windowMs
    };
}

// Validate form data
function validateForm(data) {
    const errors = [];
    
    // Check honeypot (bot detection)
    if (data[VALIDATION.honeypot]) {
        return { valid: false, errors: ['Invalid submission'], isBot: true };
    }
    
    // Name validation
    if (!data.name || !VALIDATION.name.test(data.name)) {
        errors.push('Invalid name (2-100 characters, letters only)');
    }
    
    // Email validation
    if (!data.email || !VALIDATION.email.test(data.email)) {
        errors.push('Invalid email address');
    }
    
    // Message validation
    if (!data.message) {
        errors.push('Message is required');
    } else if (data.message.length < VALIDATION.message.min) {
        errors.push(`Message must be at least ${VALIDATION.message.min} characters`);
    } else if (data.message.length > VALIDATION.message.max) {
        errors.push(`Message must be less than ${VALIDATION.message.max} characters`);
    }
    
    return { valid: errors.length === 0, errors };
}

// Send notification (Discord webhook, email, etc.)
async function sendNotification(data, metadata) {
    const notifications = [];
    
    // Discord webhook
    if (process.env.DISCORD_WEBHOOK_URL) {
        notifications.push(
            fetch(process.env.DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [{
                        title: '📬 New Contact Form Submission',
                        color: 0x00ff88,
                        fields: [
                            { name: 'Name', value: data.name, inline: true },
                            { name: 'Email', value: data.email, inline: true },
                            { name: 'Subject', value: data.subject || 'General Inquiry', inline: true },
                            { name: 'Message', value: data.message.slice(0, 1024) },
                            { name: 'Source', value: metadata.source || 'Website', inline: true },
                            { name: 'IP', value: metadata.ip || 'Unknown', inline: true }
                        ],
                        timestamp: new Date().toISOString()
                    }]
                })
            }).catch(e => ({ error: 'Discord notification failed' }))
        );
    }
    
    // Slack webhook
    if (process.env.SLACK_WEBHOOK_URL) {
        notifications.push(
            fetch(process.env.SLACK_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: `📬 *New Contact*\n*From:* ${data.name} (${data.email})\n*Message:* ${data.message.slice(0, 500)}`
                })
            }).catch(e => ({ error: 'Slack notification failed' }))
        );
    }
    
    // Email via Resend
    if (process.env.RESEND_API_KEY) {
        notifications.push(
            fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'contact@kaizen.dev',
                    to: process.env.CONTACT_EMAIL || 'damian@kaizen.dev',
                    subject: `[Contact] ${data.subject || 'New Message'} from ${data.name}`,
                    html: `
                        <h2>New Contact Form Submission</h2>
                        <p><strong>Name:</strong> ${data.name}</p>
                        <p><strong>Email:</strong> ${data.email}</p>
                        <p><strong>Subject:</strong> ${data.subject || 'General Inquiry'}</p>
                        <p><strong>Message:</strong></p>
                        <blockquote>${data.message}</blockquote>
                        <hr>
                        <p><small>Sent from ${metadata.source} | IP: ${metadata.ip}</small></p>
                    `
                })
            }).catch(e => ({ error: 'Email notification failed' }))
        );
    }
    
    return Promise.allSettled(notifications);
}

export default async function handler(req) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            }
        });
    }
    
    // Only accept POST
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: {
                'Content-Type': 'application/json',
                'Allow': 'POST, OPTIONS'
            }
        });
    }
    
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') || 
               'unknown';
    
    // Rate limit check
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
        return new Response(JSON.stringify({
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
        }), {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
                'X-RateLimit-Limit': String(RATE_LIMIT.maxRequests),
                'X-RateLimit-Remaining': '0',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
    
    try {
        // Parse body
        const body = await req.json();
        
        // Sanitize inputs
        const data = {
            name: sanitize(body.name),
            email: sanitize(body.email),
            subject: sanitize(body.subject),
            message: sanitize(body.message),
            [VALIDATION.honeypot]: body[VALIDATION.honeypot]
        };
        
        // Validate
        const validation = validateForm(data);
        
        if (validation.isBot) {
            // Silently reject bots
            return new Response(JSON.stringify({ success: true }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        
        if (!validation.valid) {
            return new Response(JSON.stringify({
                error: 'Validation failed',
                details: validation.errors
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'X-RateLimit-Remaining': String(rateLimit.remaining),
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        
        // Send notifications
        const metadata = {
            ip,
            source: req.headers.get('referer') || 'Direct',
            userAgent: req.headers.get('user-agent'),
            timestamp: new Date().toISOString()
        };
        
        await sendNotification(data, metadata);
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Message sent successfully! I\'ll get back to you soon.'
        }), {
            headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Limit': String(RATE_LIMIT.maxRequests),
                'X-RateLimit-Remaining': String(rateLimit.remaining),
                'Access-Control-Allow-Origin': '*'
            }
        });
        
    } catch (error) {
        console.error('Contact form error:', error);
        
        return new Response(JSON.stringify({
            error: 'Failed to process message',
            details: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}
