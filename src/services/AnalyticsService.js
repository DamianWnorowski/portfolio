/**
 * Analytics Service
 * Privacy-respecting analytics with multiple provider support
 */

export class AnalyticsService {
    constructor() {
        this.initialized = false;
        this.provider = null;
        this.sessionId = this.generateSessionId();
        this.queue = [];

        // Check for Do Not Track
        this.respectsDNT = navigator.doNotTrack === '1' ||
                          window.doNotTrack === '1';

        if (this.respectsDNT) {
            console.log('[Analytics] Do Not Track respected - analytics disabled');
            return;
        }

        this.init();
    }

    init() {
        // Detect available providers
        if (typeof window.va !== 'undefined') {
            this.provider = 'vercel';
            console.log('[Analytics] Using Vercel Analytics');
        } else if (typeof window.plausible !== 'undefined') {
            this.provider = 'plausible';
            console.log('[Analytics] Using Plausible');
        } else if (typeof window.umami !== 'undefined') {
            this.provider = 'umami';
            console.log('[Analytics] Using Umami');
        } else {
            this.provider = 'internal';
            console.log('[Analytics] Using internal analytics');
        }

        this.initialized = true;

        // Process queued events
        this.queue.forEach(event => this.track(event.name, event.data));
        this.queue = [];

        // Track page view
        this.trackPageView();

        // Track web vitals
        this.trackWebVitals();

        // Track scroll depth
        this.trackScrollDepth();

        // Track time on page
        this.trackTimeOnPage();
    }

    generateSessionId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    track(eventName, data = {}) {
        if (this.respectsDNT) return;

        if (!this.initialized) {
            this.queue.push({ name: eventName, data });
            return;
        }

        const eventData = {
            ...data,
            sessionId: this.sessionId,
            timestamp: Date.now(),
            url: window.location.pathname,
            referrer: document.referrer || 'direct'
        };

        switch (this.provider) {
            case 'vercel':
                window.va?.track(eventName, eventData);
                break;

            case 'plausible':
                window.plausible?.(eventName, { props: eventData });
                break;

            case 'umami':
                window.umami?.trackEvent(eventName, eventData);
                break;

            case 'internal':
                this.trackInternal(eventName, eventData);
                break;
        }

        console.log('[Analytics] Event:', eventName, eventData);
    }

    async trackInternal(eventName, data) {
        // Send to our own endpoint
        try {
            await fetch('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: eventName,
                    data,
                    timestamp: Date.now()
                })
            });
        } catch (error) {
            // Silently fail - analytics shouldn't break the site
        }
    }

    trackPageView() {
        this.track('page_view', {
            title: document.title,
            path: window.location.pathname,
            screen: `${window.innerWidth}x${window.innerHeight}`,
            devicePixelRatio: window.devicePixelRatio
        });

        // Track navigation changes (SPA)
        let lastPath = window.location.pathname;
        const observer = new MutationObserver(() => {
            if (window.location.pathname !== lastPath) {
                lastPath = window.location.pathname;
                this.track('page_view', {
                    title: document.title,
                    path: lastPath
                });
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    trackWebVitals() {
        // Core Web Vitals tracking
        if ('PerformanceObserver' in window) {
            // Largest Contentful Paint
            try {
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    this.track('web_vital', {
                        metric: 'LCP',
                        value: Math.round(lastEntry.startTime),
                        rating: lastEntry.startTime < 2500 ? 'good' :
                                lastEntry.startTime < 4000 ? 'needs-improvement' : 'poor'
                    });
                });
                lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
            } catch (e) {}

            // First Input Delay
            try {
                const fidObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        this.track('web_vital', {
                            metric: 'FID',
                            value: Math.round(entry.processingStart - entry.startTime),
                            rating: entry.processingStart - entry.startTime < 100 ? 'good' :
                                    entry.processingStart - entry.startTime < 300 ? 'needs-improvement' : 'poor'
                        });
                    });
                });
                fidObserver.observe({ type: 'first-input', buffered: true });
            } catch (e) {}

            // Cumulative Layout Shift
            try {
                let clsValue = 0;
                const clsObserver = new PerformanceObserver((list) => {
                    list.getEntries().forEach(entry => {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                        }
                    });
                });
                clsObserver.observe({ type: 'layout-shift', buffered: true });

                // Report CLS on page hide
                document.addEventListener('visibilitychange', () => {
                    if (document.visibilityState === 'hidden') {
                        this.track('web_vital', {
                            metric: 'CLS',
                            value: Math.round(clsValue * 1000) / 1000,
                            rating: clsValue < 0.1 ? 'good' :
                                    clsValue < 0.25 ? 'needs-improvement' : 'poor'
                        });
                    }
                });
            } catch (e) {}
        }
    }

    trackScrollDepth() {
        let maxScroll = 0;
        const milestones = [25, 50, 75, 100];
        const reached = new Set();

        const checkScroll = () => {
            const scrollPercent = Math.round(
                (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
            );

            if (scrollPercent > maxScroll) {
                maxScroll = scrollPercent;

                milestones.forEach(milestone => {
                    if (scrollPercent >= milestone && !reached.has(milestone)) {
                        reached.add(milestone);
                        this.track('scroll_depth', { depth: milestone });
                    }
                });
            }
        };

        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    checkScroll();
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    trackTimeOnPage() {
        const startTime = Date.now();
        const intervals = [30, 60, 120, 300]; // seconds
        const reported = new Set();

        const check = () => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);

            intervals.forEach(interval => {
                if (elapsed >= interval && !reported.has(interval)) {
                    reported.add(interval);
                    this.track('time_on_page', { seconds: interval });
                }
            });
        };

        setInterval(check, 10000);

        // Final time on unload
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                const totalTime = Math.floor((Date.now() - startTime) / 1000);
                this.track('session_end', { totalSeconds: totalTime });
            }
        });
    }

    // Public tracking methods
    trackClick(elementId, label) {
        this.track('click', { elementId, label });
    }

    trackFormSubmit(formId, success) {
        this.track('form_submit', { formId, success });
    }

    trackError(error, context) {
        this.track('error', {
            message: error.message || String(error),
            context,
            stack: error.stack?.slice(0, 500)
        });
    }

    trackSearch(query, results) {
        this.track('search', { query, resultCount: results });
    }

    trackOutboundLink(url) {
        this.track('outbound_link', { url });
    }

    trackFeatureUse(feature) {
        this.track('feature_use', { feature });
    }

    trackModalOpen(modalId) {
        this.track('modal_open', { modalId });
    }

    trackProjectView(projectId) {
        this.track('project_view', { projectId });
    }

    trackEasterEgg(eggId) {
        this.track('easter_egg', { eggId });
    }
}

// Singleton
export const analytics = new AnalyticsService();
