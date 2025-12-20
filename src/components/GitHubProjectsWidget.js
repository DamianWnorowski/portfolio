/**
 * GitHubProjectsWidget
 * Renders allowlisted (optionally private) GitHub projects from `/api/github/projects`.
 */

import { realtimeService } from '../services/RealtimeService.js';

export class GitHubProjectsWidget {
    constructor(listId = 'github-projects-list', statusId = 'github-projects-status') {
        this.list = document.getElementById(listId);
        this.status = document.getElementById(statusId);
        this.connectionName = 'github_projects';
        this.isDev = import.meta.env?.DEV ?? false;

        if (!this.list) return;
        this.init();
    }

    async init() {
        this.setStatus('CONNECTING');
        await this.fetchOnce();
        this.connectStream();
    }

    setStatus(text, tone = 'info') {
        if (!this.status) return;
        this.status.textContent = text;
        if (tone === 'ok') this.status.style.color = 'var(--success)';
        else if (tone === 'warn') this.status.style.color = 'var(--warning)';
        else if (tone === 'err') this.status.style.color = 'var(--danger)';
        else this.status.style.color = 'var(--accent-blue)';
    }

    async fetchOnce() {
        try {
            const res = await fetch('/api/github/projects');
            if (!res.ok) throw new Error('projects_fetch_failed');
            const payload = await res.json();
            this.handlePayload(payload);
        } catch (e) {
            if (this.isDev) console.warn('[GitHubProjectsWidget] fetchOnce failed', e);
            this.setStatus('OFFLINE', 'warn');
            this.renderEmpty('No GitHub projects available (missing token/allowlist).');
        }
    }

    connectStream() {
        realtimeService.connect(this.connectionName, '/api/github/projects/stream', {
            onMessage: (payload) => this.handlePayload(payload),
            onError: () => this.setStatus('RECONNECTING', 'warn'),
        });
    }

    handlePayload(payload) {
        const projects = payload?.projects;
        if (!Array.isArray(projects)) {
            this.setStatus('OFFLINE', 'warn');
            return;
        }

        if (projects.length === 0) {
            this.setStatus('EMPTY', 'warn');
            this.renderEmpty('Add `GITHUB_PROJECT_ALLOWLIST` to show private repos.');
            return;
        }

        this.setStatus((payload?.source || 'LIVE').toString().toUpperCase(), 'ok');
        this.renderProjects(projects);
    }

    renderEmpty(message) {
        if (!this.list) return;
        this.list.innerHTML = '';

        const card = document.createElement('div');
        card.className = 'github-project-card';

        const top = document.createElement('div');
        top.className = 'github-project-top';

        const name = document.createElement('span');
        name.className = 'github-project-name';
        name.textContent = 'No projects';

        const badge = document.createElement('span');
        badge.className = 'github-project-badge private';
        badge.textContent = 'LOCKED';

        top.appendChild(name);
        top.appendChild(badge);

        const desc = document.createElement('div');
        desc.className = 'github-project-desc';
        desc.textContent = message;

        card.appendChild(top);
        card.appendChild(desc);
        this.list.appendChild(card);
    }

    renderProjects(projects) {
        if (!this.list) return;
        this.list.innerHTML = '';

        for (const p of projects.slice(0, 12)) {
            const card = document.createElement('div');
            card.className = 'github-project-card';
            card.tabIndex = 0;

            const top = document.createElement('div');
            top.className = 'github-project-top';

            const name = document.createElement('span');
            name.className = 'github-project-name';
            name.textContent = p.fullName || p.name || 'Untitled';

            const badge = document.createElement('span');
            const visibility = (p.visibility || 'PRIVATE').toString().toUpperCase();
            badge.className = `github-project-badge ${visibility === 'PRIVATE' ? 'private' : ''}`;
            badge.textContent = visibility;

            top.appendChild(name);
            top.appendChild(badge);

            const desc = document.createElement('div');
            desc.className = 'github-project-desc';

            const tagline = p.meta?.tagline ? String(p.meta.tagline) : '';
            const baseDesc = p.description ? String(p.description) : '';
            desc.textContent = (tagline || baseDesc || 'No description.').slice(0, 160);

            const meta = document.createElement('div');
            meta.className = 'github-project-meta';

            // Primary language
            if (p.primaryLanguage?.name) {
                const chip = document.createElement('span');
                chip.className = 'github-project-chip strong';
                chip.textContent = p.primaryLanguage.name;
                if (p.primaryLanguage.color) {
                    chip.style.borderLeft = `3px solid ${p.primaryLanguage.color}`;
                    chip.style.paddingLeft = '8px';
                }
                meta.appendChild(chip);
            }

            // Stars / forks
            meta.appendChild(this.makeChip(`★ ${Number(p.stars || 0).toLocaleString()}`));
            meta.appendChild(this.makeChip(`⑂ ${Number(p.forks || 0).toLocaleString()}`));

            // Status
            if (p.meta?.status) meta.appendChild(this.makeChip(String(p.meta.status).toUpperCase()));

            // Stack highlights
            if (Array.isArray(p.meta?.stack)) {
                for (const t of p.meta.stack.slice(0, 4)) meta.appendChild(this.makeChip(String(t)));
            } else if (Array.isArray(p.topics)) {
                for (const t of p.topics.slice(0, 4)) meta.appendChild(this.makeChip(String(t)));
            }

            card.appendChild(top);
            card.appendChild(desc);
            card.appendChild(meta);

            const clickUrl = p.meta?.demoUrl || p.homepageUrl || p.repoUrl;
            if (clickUrl) {
                card.style.cursor = 'pointer';
                card.addEventListener('click', () => window.open(clickUrl, '_blank', 'noopener'));
                card.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        window.open(clickUrl, '_blank', 'noopener');
                    }
                });
            }

            this.list.appendChild(card);
        }
    }

    makeChip(text) {
        const chip = document.createElement('span');
        chip.className = 'github-project-chip';
        chip.textContent = String(text);
        return chip;
    }

    destroy() {
        realtimeService.disconnect(this.connectionName);
    }
}
