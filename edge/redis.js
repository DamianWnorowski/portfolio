function getUpstashConfig() {
    const url = process.env.UPSTASH_REDIS_URL;
    const token = process.env.UPSTASH_REDIS_TOKEN;
    if (!url || !token) return null;
    return { url, token };
}

async function upstashFetch(path, { method = 'GET', signal } = {}) {
    const cfg = getUpstashConfig();
    if (!cfg) return null;

    const res = await fetch(`${cfg.url}${path}`, {
        method,
        headers: { Authorization: `Bearer ${cfg.token}` },
        signal,
    });

    if (!res.ok) return null;
    return res.json();
}

async function upstashPipeline(commands, { signal } = {}) {
    const cfg = getUpstashConfig();
    if (!cfg) return null;

    const res = await fetch(`${cfg.url}/pipeline`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${cfg.token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(commands),
        signal,
    });

    if (!res.ok) return null;
    return res.json();
}

export async function redisGet(key, { signal } = {}) {
    const data = await upstashFetch(`/get/${encodeURIComponent(key)}`, { signal });
    return data?.result ?? null;
}

export async function redisGetJson(key, { signal } = {}) {
    const raw = await redisGet(key, { signal });
    if (raw == null) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export async function redisSet(key, value, { exSeconds, signal } = {}) {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    const commands = [['set', key, str]];
    if (exSeconds && Number.isFinite(exSeconds) && exSeconds > 0) {
        commands.push(['expire', key, Math.floor(exSeconds)]);
    }

    const result = await upstashPipeline(commands, { signal });
    return Array.isArray(result) && result.length > 0;
}

