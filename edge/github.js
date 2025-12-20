function parseAllowlist(raw) {
    if (!raw) return [];
    return raw
        .split(/[,\n]/g)
        .map(s => s.trim())
        .filter(Boolean)
        .filter(s => s.includes('/'))
        .slice(0, 25); // safety cap
}

function buildMultiRepoQuery(repos) {
    const fields = `
        name
        nameWithOwner
        isPrivate
        description
        homepageUrl
        url
        stargazerCount
        forkCount
        updatedAt
        pushedAt
        primaryLanguage { name color }
        repositoryTopics(first: 10) { nodes { topic { name } } }
        defaultBranchRef {
            name
            target {
                ... on Commit {
                    oid
                    committedDate
                    messageHeadline
                    url
                }
            }
        }
    `;

    const repoBlocks = repos.map((full, i) => {
        const [owner, name] = full.split('/');
        const alias = `r${i}`;
        return `${alias}: repository(owner: "${owner}", name: "${name}") { ${fields} }`;
    }).join('\n');

    return `query { ${repoBlocks} }`;
}

function sanitizeProject(repo, { privateLinkMode = 'hide' } = {}) {
    if (!repo) return null;
    const topics = repo.repositoryTopics?.nodes?.map(n => n?.topic?.name).filter(Boolean) ?? [];

    const isPrivate = !!repo.isPrivate;
    const url = (isPrivate && privateLinkMode === 'hide') ? null : repo.url;

    return {
        id: repo.nameWithOwner,
        name: repo.name,
        fullName: repo.nameWithOwner,
        visibility: isPrivate ? 'PRIVATE' : 'PUBLIC',
        description: repo.description ?? '',
        homepageUrl: repo.homepageUrl ?? null,
        repoUrl: url,
        stars: repo.stargazerCount ?? 0,
        forks: repo.forkCount ?? 0,
        updatedAt: repo.updatedAt ?? null,
        pushedAt: repo.pushedAt ?? null,
        primaryLanguage: repo.primaryLanguage ? { name: repo.primaryLanguage.name, color: repo.primaryLanguage.color } : null,
        topics,
        defaultBranch: repo.defaultBranchRef?.name ?? null,
        lastCommit: repo.defaultBranchRef?.target ? {
            oid: repo.defaultBranchRef.target.oid,
            committedDate: repo.defaultBranchRef.target.committedDate,
            message: repo.defaultBranchRef.target.messageHeadline,
            url: (isPrivate && privateLinkMode === 'hide') ? null : repo.defaultBranchRef.target.url,
        } : null,
    };
}

export async function fetchAllowlistedProjects({ allowlist, signal } = {}) {
    const token = process.env.GITHUB_TOKEN;
    const repos = parseAllowlist(allowlist ?? process.env.GITHUB_PROJECT_ALLOWLIST);
    if (!token || repos.length === 0) return [];

    const privateLinkMode = (process.env.GITHUB_PRIVATE_LINK_MODE || 'hide').toLowerCase();
    const query = buildMultiRepoQuery(repos);

    const res = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            Authorization: `bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Kaizen-Portfolio',
        },
        body: JSON.stringify({ query }),
        signal,
    });

    if (!res.ok) return [];
    const json = await res.json();
    if (json.errors) return [];

    const nodes = Object.values(json.data ?? {});
    const projects = nodes
        .map(repo => sanitizeProject(repo, { privateLinkMode }))
        .filter(Boolean);

    // Sort: newest pushed first
    projects.sort((a, b) => {
        const ta = Date.parse(a.pushedAt || a.updatedAt || 0) || 0;
        const tb = Date.parse(b.pushedAt || b.updatedAt || 0) || 0;
        return tb - ta;
    });

    return projects;
}

