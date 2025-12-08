/**
 * GitHub Contributions API - Edge Function
 * Fetches contribution data for the 3D terrain visualization
 */

export const config = {
    runtime: 'edge'
};

export default async function handler(req) {
    const url = new URL(req.url);
    const username = url.searchParams.get('username') || 'damianwnorowski';

    try {
        const contributions = await fetchContributions(username);

        return new Response(JSON.stringify(contributions), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        console.error('Contributions API error:', error);

        // Return simulated data
        return new Response(JSON.stringify(generateSimulatedContributions()), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, s-maxage=300',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}

async function fetchContributions(username) {
    // GitHub GraphQL API for contributions
    const query = `
        query($username: String!) {
            user(login: $username) {
                contributionsCollection {
                    contributionCalendar {
                        totalContributions
                        weeks {
                            contributionDays {
                                contributionCount
                                date
                                weekday
                            }
                        }
                    }
                }
            }
        }
    `;

    if (!process.env.GITHUB_TOKEN) {
        return generateSimulatedContributions();
    }

    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            'Authorization': `bearer ${process.env.GITHUB_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query, variables: { username } })
    });

    if (!response.ok) {
        throw new Error('GitHub GraphQL error');
    }

    const data = await response.json();

    if (data.errors) {
        throw new Error(data.errors[0].message);
    }

    const calendar = data.data.user.contributionsCollection.contributionCalendar;

    return {
        total: calendar.totalContributions,
        weeks: calendar.weeks,
        streak: calculateStreak(calendar.weeks),
        averagePerDay: (calendar.totalContributions / 365).toFixed(1),
        maxDay: findMaxDay(calendar.weeks)
    };
}

function generateSimulatedContributions() {
    const weeks = [];
    const today = new Date();

    for (let w = 52; w >= 0; w--) {
        const week = { contributionDays: [] };

        for (let d = 0; d < 7; d++) {
            const date = new Date(today);
            date.setDate(date.getDate() - (w * 7 + (6 - d)));

            // Generate realistic contribution pattern
            let count = 0;
            const dayOfWeek = date.getDay();
            const isWeekday = dayOfWeek > 0 && dayOfWeek < 6;

            if (isWeekday) {
                // Higher chance of contributions on weekdays
                if (Math.random() > 0.2) {
                    count = Math.floor(Math.random() * 15) + 1;
                }
            } else {
                // Lower chance on weekends
                if (Math.random() > 0.6) {
                    count = Math.floor(Math.random() * 8) + 1;
                }
            }

            // Occasional high-activity days
            if (Math.random() > 0.95) {
                count = Math.floor(Math.random() * 20) + 15;
            }

            week.contributionDays.push({
                contributionCount: count,
                date: date.toISOString().split('T')[0],
                weekday: dayOfWeek
            });
        }

        weeks.push(week);
    }

    const total = weeks.reduce((sum, week) =>
        sum + week.contributionDays.reduce((s, d) => s + d.contributionCount, 0), 0);

    return {
        total,
        weeks,
        streak: calculateStreak(weeks),
        averagePerDay: (total / 365).toFixed(1),
        maxDay: findMaxDay(weeks)
    };
}

function calculateStreak(weeks) {
    let currentStreak = 0;
    let longestStreak = 0;

    // Flatten and reverse to start from today
    const days = weeks.flatMap(w => w.contributionDays).reverse();

    for (const day of days) {
        if (day.contributionCount > 0) {
            currentStreak++;
            longestStreak = Math.max(longestStreak, currentStreak);
        } else {
            // Only break streak if we've started counting
            if (currentStreak > 0) {
                break;
            }
        }
    }

    return { current: currentStreak, longest: longestStreak };
}

function findMaxDay(weeks) {
    let max = { count: 0, date: null };

    weeks.forEach(week => {
        week.contributionDays.forEach(day => {
            if (day.contributionCount > max.count) {
                max = { count: day.contributionCount, date: day.date };
            }
        });
    });

    return max;
}
