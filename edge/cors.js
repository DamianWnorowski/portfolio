export function withCors(headers = {}, request) {
    const origin = request?.headers?.get?.('origin') || '*';
    return {
        ...headers,
        'Access-Control-Allow-Origin': origin === 'null' ? '*' : origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Vary': 'Origin',
    };
}

export function handleOptions(request) {
    if (request.method !== 'OPTIONS') return null;
    return new Response(null, { headers: withCors({}, request) });
}

