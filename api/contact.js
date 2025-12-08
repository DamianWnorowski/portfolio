/**
 * Contact Form API - Edge Function
 * Handles contact form submissions via Resend/SendGrid
 */

export const config = {
    runtime: 'edge'
};

// Rate limiting storage (in-memory for demo, use KV in production)
const rateLimitMap = new Map();

export default async function handler(req) {
    // Only accept POST
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await req.json();
        const { name, email, message, company, type } = body;

        // Validation
        if (!name || !email || !message) {
            return new Response(JSON.stringify({
                error: 'Missing required fields',
                fields: ['name', 'email', 'message']
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return new Response(JSON.stringify({
                error: 'Invalid email format'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Rate limiting (5 requests per hour per IP)
        const ip = req.headers.get('x-forwarded-for') || 'unknown';
        const rateKey = `rate:${ip}`;
        const now = Date.now();
        const hourAgo = now - 3600000;

        let requests = rateLimitMap.get(rateKey) || [];
        requests = requests.filter(t => t > hourAgo);

        if (requests.length >= 5) {
            return new Response(JSON.stringify({
                error: 'Rate limit exceeded. Please try again later.'
            }), {
                status: 429,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        requests.push(now);
        rateLimitMap.set(rateKey, requests);

        // Send email via Resend (or other provider)
        let emailSent = false;

        if (process.env.RESEND_API_KEY) {
            emailSent = await sendViaResend({ name, email, message, company, type });
        } else if (process.env.SENDGRID_API_KEY) {
            emailSent = await sendViaSendGrid({ name, email, message, company, type });
        } else {
            // Fallback: Log to console (for demo)
            console.log('[Contact Form Submission]', { name, email, message, company, type });
            emailSent = true;
        }

        if (emailSent) {
            return new Response(JSON.stringify({
                success: true,
                message: 'Message sent successfully. I\'ll respond within 24 hours.'
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        } else {
            throw new Error('Failed to send email');
        }

    } catch (error) {
        console.error('[Contact API Error]', error);

        return new Response(JSON.stringify({
            error: 'Failed to send message. Please try again or email directly.'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function sendViaResend({ name, email, message, company, type }) {
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: 'KAIZEN Portfolio <portfolio@kaizen.dev>',
            to: process.env.CONTACT_EMAIL || 'damian@kaizen.dev',
            reply_to: email,
            subject: `[Portfolio] New inquiry from ${name}${company ? ` (${company})` : ''}`,
            html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
                ${type ? `<p><strong>Type:</strong> ${type}</p>` : ''}
                <hr>
                <h3>Message:</h3>
                <p>${message.replace(/\n/g, '<br>')}</p>
                <hr>
                <p style="color: #666; font-size: 12px;">
                    Sent from KAIZEN Executive Terminal v13
                </p>
            `
        })
    });

    return response.ok;
}

async function sendViaSendGrid({ name, email, message, company, type }) {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            personalizations: [{
                to: [{ email: process.env.CONTACT_EMAIL || 'damian@kaizen.dev' }]
            }],
            from: { email: 'portfolio@kaizen.dev', name: 'KAIZEN Portfolio' },
            reply_to: { email },
            subject: `[Portfolio] New inquiry from ${name}`,
            content: [{
                type: 'text/html',
                value: `
                    <h2>New Contact Form Submission</h2>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
                    <hr>
                    <p>${message.replace(/\n/g, '<br>')}</p>
                `
            }]
        })
    });

    return response.ok;
}
