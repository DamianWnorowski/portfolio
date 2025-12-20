// GitHub Projects Edge Function
// Serverless API endpoint for fetching GitHub project data

const CACHE_TTL = 300; // 5 minutes cache
const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_WINDOW = 60000; // 1 minute

// In-memory rate limiting (Edge Runtime compatible)
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

export default async function handler(req) {
  const startTime = Date.now();
  
  // CORS headers
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

  // Rate limiting
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
    const username = searchParams.get('username') || process.env.GITHUB_USERNAME || 'ouroboros';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = Math.min(parseInt(searchParams.get('per_page') || '10', 10), 100);

    // GitHub API request
    const githubToken = process.env.GITHUB_TOKEN;
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Kaizen-Elite-Portfolio',
    };
    
    if (githubToken) {
      headers['Authorization'] = `Bearer ${githubToken}`;
    }

    const response = await fetch(
      `https://api.github.com/users/${username}/repos?sort=updated&page=${page}&per_page=${perPage}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const repos = await response.json();
    
    // Transform data for frontend
    const projects = repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      html_url: repo.html_url,
      homepage: repo.homepage,
      stargazers_count: repo.stargazers_count,
      forks_count: repo.forks_count,
      language: repo.language,
      topics: repo.topics || [],
      created_at: repo.created_at,
      updated_at: repo.updated_at,
      pushed_at: repo.pushed_at,
      size: repo.size,
      default_branch: repo.default_branch,
      open_issues_count: repo.open_issues_count,
      is_template: repo.is_template,
      has_issues: repo.has_issues,
      has_projects: repo.has_projects,
      has_wiki: repo.has_wiki,
      archived: repo.archived,
      disabled: repo.disabled,
      visibility: repo.visibility,
      license: repo.license ? {
        key: repo.license.key,
        name: repo.license.name,
        spdx_id: repo.license.spdx_id,
      } : null,
    }));

    const responseTime = Date.now() - startTime;

    return new Response(JSON.stringify({
      success: true,
      data: projects,
      meta: {
        page,
        per_page: perPage,
        total: projects.length,
        username,
        response_time_ms: responseTime,
        cached: false,
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
    console.error('[GitHub Projects API Error]', error);
    
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
