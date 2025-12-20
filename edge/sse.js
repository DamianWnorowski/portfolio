export function createSseStream({ onStart }) {
    const encoder = new TextEncoder();
    return new ReadableStream({
        start(controller) {
            const send = (data, { event } = {}) => {
                const payload = typeof data === 'string' ? data : JSON.stringify(data);
                const prefix = event ? `event: ${event}\n` : '';
                controller.enqueue(encoder.encode(`${prefix}data: ${payload}\n\n`));
            };

            const comment = (text) => {
                controller.enqueue(encoder.encode(`: ${text}\n\n`));
            };

            const close = () => controller.close();

            onStart?.({ send, comment, close });
        }
    });
}

export function sseHeaders(request) {
    const origin = request?.headers?.get?.('origin') || '*';
    return {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': origin === 'null' ? '*' : origin,
        'Vary': 'Origin',
    };
}

