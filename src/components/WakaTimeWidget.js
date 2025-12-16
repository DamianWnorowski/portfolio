/**
 * WakaTime Coding Stats Widget
 * Real-time display of coding activity and language breakdown
 */

import { eventBus, Events } from '../core/EventBus.js';
import { escapeHtml } from '../utils/security.js';

export class WakaTimeWidget {
    constructor(container) {
        this.container = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
        
        this.data = null;
        this.pollInterval = null;
        
        if (this.container) {
            this.init();
        }
    }
    
    async init() {
        this.render();
        await this.fetchData();
        this.startPolling();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="wakatime-widget">
                <div class="wakatime-header">
                    <svg class="wakatime-icon" viewBox="0 0 24 24" width="18" height="18">
                        <path fill="currentColor" d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.4a9.6 9.6 0 110 19.2 9.6 9.6 0 010-19.2zm-.6 3.6v6.6l5.4 3.24.6-.96-4.8-2.88V6h-1.2z"/>
                    </svg>
                    <span class="wakatime-title">Coding Activity</span>
                    <span class="wakatime-period">Last 7 days</span>
                </div>
                
                <div class="wakatime-content">
                    <div class="wakatime-loading">
                        <div class="loading-bars">
                            <div class="bar"></div>
                            <div class="bar"></div>
                            <div class="bar"></div>
                            <div class="bar"></div>
                        </div>
                        <span>Loading stats...</span>
                    </div>
                </div>
            </div>
        `;
        
        this.addStyles();
    }
    
    addStyles() {
        if (document.getElementById('wakatime-widget-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'wakatime-widget-styles';
        style.textContent = `
            .wakatime-widget {
                background: var(--bg-tertiary, #1a1d23);
                border: 1px solid var(--border-color, #2a2f3a);
                border-radius: 12px;
                padding: 16px;
            }
            
            .wakatime-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 16px;
                padding-bottom: 12px;
                border-bottom: 1px solid var(--border-color, #2a2f3a);
            }
            
            .wakatime-icon {
                color: var(--accent-primary, #7c3aed);
            }
            
            .wakatime-title {
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--text-secondary, #8b949e);
                flex: 1;
            }
            
            .wakatime-period {
                font-size: 10px;
                color: var(--text-muted, #6e7681);
                background: var(--bg-secondary, #161b22);
                padding: 2px 8px;
                border-radius: 10px;
            }
            
            .wakatime-loading {
                display: flex;
                align-items: center;
                gap: 12px;
                color: var(--text-muted, #6e7681);
                font-size: 13px;
                padding: 20px 0;
            }
            
            .loading-bars {
                display: flex;
                gap: 3px;
                align-items: flex-end;
                height: 20px;
            }
            
            .loading-bars .bar {
                width: 4px;
                background: var(--accent-primary, #7c3aed);
                border-radius: 2px;
                animation: loading-bar 1s ease-in-out infinite;
            }
            
            .loading-bars .bar:nth-child(1) { height: 8px; animation-delay: 0s; }
            .loading-bars .bar:nth-child(2) { height: 16px; animation-delay: 0.1s; }
            .loading-bars .bar:nth-child(3) { height: 12px; animation-delay: 0.2s; }
            .loading-bars .bar:nth-child(4) { height: 20px; animation-delay: 0.3s; }
            
            @keyframes loading-bar {
                0%, 100% { opacity: 0.4; }
                50% { opacity: 1; }
            }
            
            .wakatime-stats {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
                margin-bottom: 16px;
            }
            
            .wakatime-stat {
                text-align: center;
                padding: 12px;
                background: var(--bg-secondary, #161b22);
                border-radius: 8px;
            }
            
            .wakatime-stat-value {
                font-size: 24px;
                font-weight: 700;
                color: var(--text-primary, #f0f6fc);
                line-height: 1;
            }
            
            .wakatime-stat-value span {
                font-size: 14px;
                font-weight: 400;
                color: var(--text-muted, #6e7681);
            }
            
            .wakatime-stat-label {
                font-size: 11px;
                color: var(--text-muted, #6e7681);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-top: 4px;
            }
            
            .wakatime-languages {
                margin-top: 16px;
            }
            
            .wakatime-languages-title {
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--text-muted, #6e7681);
                margin-bottom: 8px;
            }
            
            .wakatime-language {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }
            
            .wakatime-language-name {
                width: 80px;
                font-size: 12px;
                color: var(--text-secondary, #8b949e);
            }
            
            .wakatime-language-bar {
                flex: 1;
                height: 6px;
                background: var(--bg-secondary, #161b22);
                border-radius: 3px;
                overflow: hidden;
            }
            
            .wakatime-language-fill {
                height: 100%;
                border-radius: 3px;
                transition: width 0.5s ease;
            }
            
            .wakatime-language-percent {
                width: 40px;
                text-align: right;
                font-size: 11px;
                color: var(--text-muted, #6e7681);
            }
            
            .wakatime-editors {
                display: flex;
                gap: 8px;
                margin-top: 12px;
                flex-wrap: wrap;
            }
            
            .wakatime-editor {
                font-size: 11px;
                padding: 4px 8px;
                background: var(--bg-secondary, #161b22);
                border-radius: 12px;
                color: var(--text-secondary, #8b949e);
            }
        `;
        document.head.appendChild(style);
    }
    
    async fetchData() {
        try {
            const response = await fetch('/api/wakatime');
            if (!response.ok) throw new Error('Failed to fetch');

            this.data = await response.json();
            this.updateUI();

        } catch (error) {
            this.showError();
        }
    }
    
    updateUI() {
        const content = this.container.querySelector('.wakatime-content');
        
        if (!this.data) {
            this.showError();
            return;
        }
        
        const languageColors = {
            'Python': '#3572A5',
            'TypeScript': '#3178c6',
            'JavaScript': '#f1e05a',
            'Rust': '#dea584',
            'Go': '#00ADD8',
            'GLSL': '#5686a5',
            'HTML': '#e34c26',
            'CSS': '#563d7c',
            'JSON': '#292929',
            'Markdown': '#083fa1'
        };
        
        // Clear content first
        content.innerHTML = '';

        // Create stats section
        const statsDiv = document.createElement('div');
        statsDiv.className = 'wakatime-stats';

        const totalStat = document.createElement('div');
        totalStat.className = 'wakatime-stat';
        const totalValue = document.createElement('div');
        totalValue.className = 'wakatime-stat-value';
        totalValue.textContent = escapeHtml(String(this.data.totalHours));
        const totalSpan = document.createElement('span');
        totalSpan.textContent = 'h';
        totalValue.appendChild(totalSpan);
        const totalLabel = document.createElement('div');
        totalLabel.className = 'wakatime-stat-label';
        totalLabel.textContent = 'Total Time';
        totalStat.appendChild(totalValue);
        totalStat.appendChild(totalLabel);

        const dailyStat = document.createElement('div');
        dailyStat.className = 'wakatime-stat';
        const dailyValue = document.createElement('div');
        dailyValue.className = 'wakatime-stat-value';
        dailyValue.textContent = escapeHtml(String(this.data.dailyAverageHours));
        const dailySpan = document.createElement('span');
        dailySpan.textContent = 'h';
        dailyValue.appendChild(dailySpan);
        const dailyLabel = document.createElement('div');
        dailyLabel.className = 'wakatime-stat-label';
        dailyLabel.textContent = 'Daily Average';
        dailyStat.appendChild(dailyValue);
        dailyStat.appendChild(dailyLabel);

        statsDiv.appendChild(totalStat);
        statsDiv.appendChild(dailyStat);
        content.appendChild(statsDiv);

        // Create languages section
        const langsDiv = document.createElement('div');
        langsDiv.className = 'wakatime-languages';

        const langsTitle = document.createElement('div');
        langsTitle.className = 'wakatime-languages-title';
        langsTitle.textContent = 'Languages';
        langsDiv.appendChild(langsTitle);

        this.data.languages.slice(0, 5).forEach(lang => {
            const langDiv = document.createElement('div');
            langDiv.className = 'wakatime-language';

            const langName = document.createElement('span');
            langName.className = 'wakatime-language-name';
            langName.textContent = escapeHtml(lang.name);

            const langBar = document.createElement('div');
            langBar.className = 'wakatime-language-bar';

            const langFill = document.createElement('div');
            langFill.className = 'wakatime-language-fill';
            langFill.style.width = `${parseFloat(lang.percent)}%`;
            langFill.style.background = languageColors[lang.name] || '#6e7681';

            langBar.appendChild(langFill);

            const langPercent = document.createElement('span');
            langPercent.className = 'wakatime-language-percent';
            langPercent.textContent = `${escapeHtml(String(lang.percent))}%`;

            langDiv.appendChild(langName);
            langDiv.appendChild(langBar);
            langDiv.appendChild(langPercent);
            langsDiv.appendChild(langDiv);
        });

        content.appendChild(langsDiv);

        // Create editors section if available
        if (this.data.editors) {
            const editorsDiv = document.createElement('div');
            editorsDiv.className = 'wakatime-editors';

            this.data.editors.forEach(e => {
                const editorSpan = document.createElement('span');
                editorSpan.className = 'wakatime-editor';
                editorSpan.textContent = `${escapeHtml(e.name)} ${escapeHtml(String(e.percent))}%`;
                editorsDiv.appendChild(editorSpan);
            });

            content.appendChild(editorsDiv);
        }
        
        eventBus.emit(Events.DATA_LOADED, { type: 'wakatime', data: this.data });
    }
    
    showError() {
        const content = this.container.querySelector('.wakatime-content');
        content.innerHTML = `
            <div class="wakatime-loading">
                <span>⚡ Coding stats unavailable</span>
            </div>
        `;
    }
    
    startPolling() {
        // Poll every 30 minutes
        this.pollInterval = setInterval(() => {
            this.fetchData();
        }, 30 * 60 * 1000);
    }
    
    destroy() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
    }
}

// Auto-init
export const wakatimeWidget = typeof document !== 'undefined' 
    ? null // Will be initialized when container is ready
    : null;

