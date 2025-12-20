// Metrics Aggregator Edge Function
// Combines data from multiple sources (GitHub, WakaTime, Spotify, etc.)

const CACHE_TTL = 180; // 3 minutes cache
const RATE_LIMIT_MAX = 200;
const RATE_LIMIT_WINDOW = 60000;

const rateLimitStore = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const userLimit = rateLimitStore.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  
  if (now > userLimit.resetAt) {
    userLimit.count = 0;
    userLimit.resetAt = now + RATE_LIMIT_WINDOW;
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX) {
    return { allowed: false, resetAt: userLimit.resetAt };
  }
  
  userLimit.count++;
  rateLimitStore.set(ip, userLimit);
  return { allowed: true, remaining: RATE_LIMIT_MAX - userLimit.count };
}

async function fetchGitHubStats(username, token) {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Kaizen-Elite-Portfolio',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const [userRes, reposRes] = await Promise.all([
    fetch(`https://api.github.com/users/${username}`, { headers }),
    fetch(`https://api.github.com/users/${username}/repos?per_page=100`, { headers }),
  ]);

  const user = await userRes.json();
  const repos = await reposRes.json();

  const totalStars = repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
  const totalForks = repos.reduce((sum, repo) => sum + (repo.forks_count || 0), 0);
  const languages = repos.reduce((acc, repo) => {
    if (repo.language) {
      acc[repo.language] = (acc[repo.language] || 0) + 1;
    }
    return acc;
  }, {});

  return {
    followers: user.followers || 0,
    public_repos: user.public_repos || 0,
    total_stars: totalStars,
    total_forks: totalForks,
    languages: Object.entries(languages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count })),
  };
}

async function fetchWakaTimeStats(apiKey) {
  if (!apiKey) return null;

  try {
    const response = await fetch('https://wakatime.com/api/v1/users/current/stats/last_7_days', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      total_seconds: data.data?.total_seconds || 0,
      daily_average: data.data?.daily_average || 0,
      languages: (data.data?.languages || []).slice(0, 5).map(lang => ({
        name: lang.name,
        percent: lang.percent,
        total_seconds: lang.total_seconds,
      })),
    };
  } catch {
    return null;
  }
}

export default async function handler(req) {
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = checkRateLimit(clientIP);
  
  if (!rateLimitResult.allowed) {
    return new Response(JSON.stringify({
      error: 'Rate limit exceeded',
      resetAt: new Date(rateLimitResult.resetAt).toISOString(),
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString(),
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    const { searchParams } = new URL(req.url);
    const sources = searchParams.get('sources')?.split(',') || ['github'];
    
    const metrics = {
      timestamp: new Date().toISOString(),
      sources: {},
    };

    // Fetch GitHub stats
    if (sources.includes('github')) {
      const username = process.env.GITHUB_USERNAME || 'ouroboros';
      const token = process.env.GITHUB_TOKEN;
      metrics.sources.github = await fetchGitHubStats(username, token);
    }

    // Fetch WakaTime stats
    if (sources.includes('wakatime')) {
      const apiKey = process.env.WAKATIME_API_KEY;
      const wakaStats = await fetchWakaTimeStats(apiKey);
      if (wakaStats) {
        metrics.sources.wakatime = wakaStats;
      }
    }

    const responseTime = Date.now() - startTime;

    return new Response(JSON.stringify({
      success: true,
      data: metrics,
      meta: {
        response_time_ms: responseTime,
        cached: false,
        sources_requested: sources,
        sources_available: Object.keys(metrics.sources),
      },
      rate_limit: {
        remaining: rateLimitResult.remaining,
        limit: RATE_LIMIT_MAX,
      },
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, s-maxage=${CACHE_TTL}, stale-while-revalidate`,
        'Access-Control-Allow-Origin': '*',
        'X-Response-Time': `${responseTime}ms`,
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString(),
      },
    });

  } catch (error) {
    console.error('[Metrics API Error]', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

export const config = {
  runtime: 'edge',
  regions: ['iad1', 'sfo1', 'cdg1'],
};
