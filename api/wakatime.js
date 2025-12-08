/**
 * WakaTime API - Edge Function
 * Fetches coding activity stats
 */

export const config = {
    runtime: 'edge'
};

export default async function handler(req) {
    try {
        if (!process.env.WAKATIME_API_KEY) {
            return new Response(JSON.stringify(getSimulatedStats()), {
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, s-maxage=300'
                }
            });
        }

        const [statsRes, languagesRes] = await Promise.all([
            fetch('https://wakatime.com/api/v1/users/current/stats/last_7_days', {
                headers: {
                    'Authorization': `Basic ${btoa(process.env.WAKATIME_API_KEY)}`
                }
            }),
            fetch('https://wakatime.com/api/v1/users/current/stats/last_30_days', {
                headers: {
                    'Authorization': `Basic ${btoa(process.env.WAKATIME_API_KEY)}`
                }
            })
        ]);

        if (!statsRes.ok) {
            throw new Error('WakaTime API error');
        }

        const stats = await statsRes.json();
        const languages = await languagesRes.json();

        const response = {
            totalSeconds: stats.data.total_seconds,
            totalHours: Math.round(stats.data.total_seconds / 3600 * 10) / 10,
            dailyAverage: stats.data.daily_average_including_other_language,
            dailyAverageHours: Math.round(stats.data.daily_average_including_other_language / 3600 * 10) / 10,
            bestDay: stats.data.best_day,
            languages: stats.data.languages.slice(0, 5).map(l => ({
                name: l.name,
                percent: l.percent,
                hours: Math.round(l.total_seconds / 3600 * 10) / 10
            })),
            editors: stats.data.editors.slice(0, 3).map(e => ({
                name: e.name,
                percent: e.percent
            })),
            projects: stats.data.projects.slice(0, 5).map(p => ({
                name: p.name,
                hours: Math.round(p.total_seconds / 3600 * 10) / 10
            })),
            range: {
                start: stats.data.start,
                end: stats.data.end
            }
        };

        return new Response(JSON.stringify(response), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, s-maxage=1800',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        console.error('WakaTime API error:', error);

        return new Response(JSON.stringify(getSimulatedStats()), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, s-maxage=300',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}

function getSimulatedStats() {
    return {
        totalHours: 42.5,
        dailyAverageHours: 6.1,
        bestDay: {
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            total_seconds: 32400
        },
        languages: [
            { name: 'Python', percent: 35, hours: 14.9 },
            { name: 'TypeScript', percent: 28, hours: 11.9 },
            { name: 'JavaScript', percent: 18, hours: 7.7 },
            { name: 'Rust', percent: 12, hours: 5.1 },
            { name: 'GLSL', percent: 7, hours: 3.0 }
        ],
        editors: [
            { name: 'VS Code', percent: 85 },
            { name: 'Neovim', percent: 12 },
            { name: 'WebStorm', percent: 3 }
        ],
        projects: [
            { name: 'kaizen-elite', hours: 12.4 },
            { name: 'hive-agent', hours: 10.2 },
            { name: 'titan-search', hours: 8.7 },
            { name: 'sentient-core', hours: 6.3 },
            { name: 'claude-tools', hours: 4.9 }
        ],
        isSimulated: true
    };
}
