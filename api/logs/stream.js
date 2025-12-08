/**
 * Log Stream API - Edge Function with Server-Sent Events
 * Provides real-time log streaming for the terminal
 */

export const config = {
    runtime: 'edge'
};

// Log message templates
const LOG_TEMPLATES = [
    { type: 'system', msg: 'Health check completed: all services operational' },
    { type: 'system', msg: 'Memory utilization: {mem}% | CPU: {cpu}%' },
    { type: 'system', msg: 'Connection pool: {pool}/50 active connections' },
    { type: 'deploy', msg: 'Container deployed to {region}: SUCCESS' },
    { type: 'deploy', msg: 'Rolling update: {service} v{version}' },
    { type: 'deploy', msg: 'Scaling event: +{n} instances ({region})' },
    { type: 'deploy', msg: 'Image built: kaizen/{service}:latest [{size}MB]' },
    { type: 'api', msg: 'Request processed: {method} {path} [{status}] {latency}ms' },
    { type: 'api', msg: 'WebSocket connection: {event} (client_{id})' },
    { type: 'api', msg: 'Cache {action}: {ratio}% hit ratio' },
    { type: 'api', msg: 'Rate limit: {used}/{limit} requests' },
    { type: 'api', msg: 'GraphQL: {operation} resolved [{latency}ms]' },
    { type: 'metrics', msg: 'Revenue processed: +${amount} ({source})' },
    { type: 'metrics', msg: 'Conversion rate: {rate}% (↑{delta}%)' },
    { type: 'security', msg: 'Auth: JWT validated for {user}' },
    { type: 'security', msg: 'SSL certificate: {days} days remaining' },
    { type: 'security', msg: 'Security scan: {result}' }
];

const REGIONS = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-northeast-1'];
const SERVICES = ['kaizen-api', 'kaizen-worker', 'kaizen-cdn', 'kaizen-auth'];
const METHODS = ['GET', 'POST', 'PUT', 'DELETE'];
const PATHS = ['/api/stats', '/api/deploy', '/api/users', '/api/metrics', '/graphql'];

function generateLog() {
    const template = LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)];
    let msg = template.msg;

    // Replace placeholders with random values
    msg = msg.replace('{mem}', Math.round(35 + Math.random() * 25));
    msg = msg.replace('{cpu}', Math.round(10 + Math.random() * 20));
    msg = msg.replace('{pool}', Math.round(8 + Math.random() * 15));
    msg = msg.replace('{region}', REGIONS[Math.floor(Math.random() * REGIONS.length)]);
    msg = msg.replace('{service}', SERVICES[Math.floor(Math.random() * SERVICES.length)]);
    msg = msg.replace('{version}', `2.${Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 10)}`);
    msg = msg.replace('{n}', Math.floor(Math.random() * 3) + 1);
    msg = msg.replace('{size}', Math.round(150 + Math.random() * 100));
    msg = msg.replace('{method}', METHODS[Math.floor(Math.random() * METHODS.length)]);
    msg = msg.replace('{path}', PATHS[Math.floor(Math.random() * PATHS.length)]);
    msg = msg.replace('{status}', Math.random() > 0.02 ? '200' : '500');
    msg = msg.replace('{latency}', Math.round(5 + Math.random() * 50));
    msg = msg.replace('{event}', Math.random() > 0.5 ? 'connected' : 'message');
    msg = msg.replace('{id}', Math.floor(Math.random() * 10000));
    msg = msg.replace('{action}', Math.random() > 0.3 ? 'HIT' : 'MISS');
    msg = msg.replace('{ratio}', Math.round(90 + Math.random() * 8));
    msg = msg.replace('{used}', Math.round(Math.random() * 1000));
    msg = msg.replace('{limit}', '10000');
    msg = msg.replace('{operation}', ['getStats', 'getDeployments', 'getUser'][Math.floor(Math.random() * 3)]);
    msg = msg.replace('{amount}', Math.round(100 + Math.random() * 500).toLocaleString());
    msg = msg.replace('{source}', ['stripe', 'paypal', 'wire'][Math.floor(Math.random() * 3)]);
    msg = msg.replace('{rate}', (2 + Math.random() * 3).toFixed(1));
    msg = msg.replace('{delta}', (Math.random() * 0.5).toFixed(2));
    msg = msg.replace('{user}', `user_${Math.floor(Math.random() * 10000)}`);
    msg = msg.replace('{days}', Math.round(30 + Math.random() * 60));
    msg = msg.replace('{result}', Math.random() > 0.01 ? 'PASSED (0 vulnerabilities)' : 'WARNING (1 advisory)');

    return {
        type: template.type,
        msg,
        ts: new Date().toISOString()
    };
}

export default async function handler(req) {
    // Check for SSE support
    const accept = req.headers.get('accept');

    if (accept && accept.includes('text/event-stream')) {
        // Server-Sent Events stream
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                // Send initial connection message
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'system',
                    msg: 'Connected to live log stream',
                    ts: new Date().toISOString()
                })}\n\n`));

                // Send logs at random intervals
                let isRunning = true;
                let count = 0;

                const sendLog = () => {
                    if (!isRunning || count > 100) {
                        controller.close();
                        return;
                    }

                    const log = generateLog();
                    try {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(log)}\n\n`));
                        count++;
                    } catch (e) {
                        isRunning = false;
                        return;
                    }

                    // Random interval between 1-4 seconds
                    const delay = 1000 + Math.random() * 3000;
                    setTimeout(sendLog, delay);
                };

                // Start sending logs after a short delay
                setTimeout(sendLog, 1000);

                // Heartbeat every 30 seconds
                const heartbeat = setInterval(() => {
                    if (!isRunning) {
                        clearInterval(heartbeat);
                        return;
                    }
                    try {
                        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
                    } catch (e) {
                        isRunning = false;
                        clearInterval(heartbeat);
                    }
                }, 30000);
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }

    // Regular JSON response with batch of logs
    const logs = Array.from({ length: 10 }, () => generateLog());

    return new Response(JSON.stringify({ logs }), {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*'
        }
    });
}
