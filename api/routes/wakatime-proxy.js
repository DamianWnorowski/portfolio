// WakaTime Proxy API Route
// Serverless proxy for WakaTime API with caching

const CACHE_DURATION = 600;
const cache = new Map();

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
    const range = req.query.range || 'last_7_days';
    const cacheKey = 'wakatime:stats:' + range;
    
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json({
        success: true,
        data: cachedData,
        cached: true,
      });
    }

    if (!process.env.WAKATIME_API_KEY) {
      return res.status(503).json({
        success: false,
        error: 'WakaTime API key not configured',
      });
    }

    const wakatimeUrl = 'https://wakatime.com/api/v1/users/current/stats/' + range;
    const response = await fetch(wakatimeUrl, {
      headers: {
        'Authorization': 'Bearer ' + process.env.WAKATIME_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error('WakaTime API error: ' + response.status + ' ' + response.statusText);
    }

    const data = await response.json();

    const stats = {
      total_seconds: data.data.total_seconds || 0,
      daily_average: data.data.daily_average || 0,
      human_readable_total: data.data.human_readable_total || '0 hrs',
      human_readable_daily_average: data.data.human_readable_daily_average || '0 hrs',
      languages: (data.data.languages || []).slice(0, 5).map(function(lang) {
        return {
          name: lang.name,
          percent: lang.percent,
          total_seconds: lang.total_seconds,
          text: lang.text,
        };
      }),
      editors: (data.data.editors || []).slice(0, 3).map(function(editor) {
        return {
          name: editor.name,
          percent: editor.percent,
          total_seconds: editor.total_seconds,
        };
      }),
      operating_systems: (data.data.operating_systems || []).slice(0, 3).map(function(os) {
        return {
          name: os.name,
          percent: os.percent,
          total_seconds: os.total_seconds,
        };
      }),
    };

    setCachedData(cacheKey, stats);
    
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 'public, s-maxage=' + CACHE_DURATION + ', stale-while-revalidate');
    
    return res.status(200).json({
      success: true,
      data: stats,
      cached: false,
    });

  } catch (error) {
    console.error('[WakaTime Proxy Error]', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
