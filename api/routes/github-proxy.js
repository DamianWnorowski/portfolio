// GitHub Proxy API Route
// Serverless proxy for GitHub API with caching and rate limiting

const CACHE_DURATION = 300;
const cache = new Map();

function getCacheKey(url, params) {
  const paramStr = Object.keys(params).sort().map(k => k + '=' + params[k]).join('&');
  return url + ':' + paramStr;
}

function getCachedData(key) {
  const cached = cache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > CACHE_DURATION * 1000) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
}

function setCachedData(key, data) {
  cache.set(key, {
    data: data,
    timestamp: Date.now(),
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const endpoint = req.query.endpoint;
    const params = Object.assign({}, req.query);
    delete params.endpoint;
    
    if (!endpoint) {
      return res.status(400).json({ error: 'Missing endpoint parameter' });
    }

    const cacheKey = getCacheKey(endpoint, params);
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json({
        success: true,
        data: cachedData,
        cached: true,
      });
    }

    const githubUrl = new URL('https://api.github.com/' + endpoint);
    Object.entries(params).forEach(function(entry) {
      const key = entry[0];
      const value = entry[1];
      if (value) githubUrl.searchParams.append(key, value);
    });

    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Kaizen-Elite-Portfolio',
    };

    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = 'Bearer ' + process.env.GITHUB_TOKEN;
    }

    const response = await fetch(githubUrl.toString(), { headers: headers });

    if (!response.ok) {
      throw new Error('GitHub API error: ' + response.status + ' ' + response.statusText);
    }

    const data = await response.json();

    setCachedData(cacheKey, data);
    
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 'public, s-maxage=' + CACHE_DURATION + ', stale-while-revalidate');
    
    return res.status(200).json({
      success: true,
      data: data,
      cached: false,
    });

  } catch (error) {
    console.error('[GitHub Proxy Error]', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
