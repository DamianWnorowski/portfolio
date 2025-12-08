/**
 * AnalyticsService Unit Tests
 * Tests for privacy-respecting analytics service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('AnalyticsService', () => {
    let AnalyticsService;
    let service;

    beforeEach(async () => {
        vi.resetModules();
        vi.useFakeTimers();

        // Reset navigator DNT
        Object.defineProperty(navigator, 'doNotTrack', {
            value: null,
            configurable: true
        });
        delete window.doNotTrack;

        // Mock fetch
        global.fetch = vi.fn().mockResolvedValue({ ok: true });

        // Clear any analytics providers
        delete window.va;
        delete window.plausible;
        delete window.umami;

        // Mock PerformanceObserver
        global.PerformanceObserver = vi.fn().mockImplementation(() => ({
            observe: vi.fn(),
            disconnect: vi.fn()
        }));

        // Mock MutationObserver
        global.MutationObserver = vi.fn().mockImplementation(() => ({
            observe: vi.fn(),
            disconnect: vi.fn()
        }));

        // Mock requestAnimationFrame
        global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 16));

        const module = await import('../../src/services/AnalyticsService.js');
        AnalyticsService = module.AnalyticsService;
        service = new AnalyticsService();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('generates session ID', () => {
            expect(service.sessionId).toBeDefined();
            expect(service.sessionId.length).toBeGreaterThan(10);
        });

        it('initializes with internal provider by default', () => {
            expect(service.provider).toBe('internal');
        });

        it('sets initialized to true', () => {
            expect(service.initialized).toBe(true);
        });

        it('creates empty queue', () => {
            expect(service.queue).toEqual([]);
        });
    });

    describe('Do Not Track', () => {
        it('respects navigator.doNotTrack', async () => {
            vi.resetModules();
            Object.defineProperty(navigator, 'doNotTrack', {
                value: '1',
                configurable: true
            });

            const module = await import('../../src/services/AnalyticsService.js');
            const dntService = new module.AnalyticsService();

            expect(dntService.respectsDNT).toBe(true);
        });

        it('respects window.doNotTrack', async () => {
            vi.resetModules();
            window.doNotTrack = '1';

            const module = await import('../../src/services/AnalyticsService.js');
            const dntService = new module.AnalyticsService();

            expect(dntService.respectsDNT).toBe(true);
        });

        it('does not track when DNT is enabled', async () => {
            vi.resetModules();
            Object.defineProperty(navigator, 'doNotTrack', {
                value: '1',
                configurable: true
            });

            const module = await import('../../src/services/AnalyticsService.js');
            const dntService = new module.AnalyticsService();

            dntService.track('test_event');

            expect(fetch).not.toHaveBeenCalled();
        });
    });

    describe('Provider Detection', () => {
        it('detects Vercel Analytics', async () => {
            vi.resetModules();
            window.va = { track: vi.fn() };

            const module = await import('../../src/services/AnalyticsService.js');
            const vaService = new module.AnalyticsService();

            expect(vaService.provider).toBe('vercel');
        });

        it('detects Plausible', async () => {
            vi.resetModules();
            window.plausible = vi.fn();

            const module = await import('../../src/services/AnalyticsService.js');
            const plausibleService = new module.AnalyticsService();

            expect(plausibleService.provider).toBe('plausible');
        });

        it('detects Umami', async () => {
            vi.resetModules();
            window.umami = { trackEvent: vi.fn() };

            const module = await import('../../src/services/AnalyticsService.js');
            const umamiService = new module.AnalyticsService();

            expect(umamiService.provider).toBe('umami');
        });

        it('falls back to internal provider', () => {
            expect(service.provider).toBe('internal');
        });
    });

    describe('Event Tracking', () => {
        it('tracks events with event data', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            service.track('test_event', { key: 'value' });

            expect(consoleSpy).toHaveBeenCalledWith(
                '[Analytics] Event:',
                'test_event',
                expect.objectContaining({
                    key: 'value',
                    sessionId: service.sessionId,
                    timestamp: expect.any(Number)
                })
            );
        });

        it('includes session ID in events', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            service.track('test_event');

            expect(consoleSpy).toHaveBeenCalledWith(
                '[Analytics] Event:',
                'test_event',
                expect.objectContaining({
                    sessionId: service.sessionId
                })
            );
        });

        it('includes timestamp in events', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            service.track('test_event');

            expect(consoleSpy).toHaveBeenCalledWith(
                '[Analytics] Event:',
                'test_event',
                expect.objectContaining({
                    timestamp: expect.any(Number)
                })
            );
        });

        it('includes URL in events', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            service.track('test_event');

            expect(consoleSpy).toHaveBeenCalledWith(
                '[Analytics] Event:',
                'test_event',
                expect.objectContaining({
                    url: expect.any(String)
                })
            );
        });

        it('queues events before initialization', async () => {
            vi.resetModules();

            const module = await import('../../src/services/AnalyticsService.js');
            const uninitialized = new module.AnalyticsService();
            uninitialized.initialized = false;
            uninitialized.queue = [];

            uninitialized.track('queued_event');

            expect(uninitialized.queue.length).toBe(1);
            expect(uninitialized.queue[0].name).toBe('queued_event');
        });
    });

    describe('Internal Tracking', () => {
        it('sends POST request to /api/analytics', async () => {
            await service.trackInternal('test_event', { key: 'value' });

            expect(fetch).toHaveBeenCalledWith('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: expect.any(String)
            });
        });

        it('includes event data in request body', async () => {
            await service.trackInternal('test_event', { key: 'value' });

            const body = JSON.parse(fetch.mock.calls[0][1].body);
            expect(body.event).toBe('test_event');
            expect(body.data.key).toBe('value');
        });

        it('handles fetch errors gracefully', async () => {
            fetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(service.trackInternal('test_event', {})).resolves.not.toThrow();
        });
    });

    describe('Provider-Specific Tracking', () => {
        it('calls Vercel Analytics', async () => {
            vi.resetModules();
            window.va = { track: vi.fn() };

            const module = await import('../../src/services/AnalyticsService.js');
            const vaService = new module.AnalyticsService();

            vaService.track('test_event');

            expect(window.va.track).toHaveBeenCalled();
        });

        it('calls Plausible', async () => {
            vi.resetModules();
            window.plausible = vi.fn();

            const module = await import('../../src/services/AnalyticsService.js');
            const plausibleService = new module.AnalyticsService();

            plausibleService.track('test_event');

            expect(window.plausible).toHaveBeenCalled();
        });

        it('calls Umami', async () => {
            vi.resetModules();
            window.umami = { trackEvent: vi.fn() };

            const module = await import('../../src/services/AnalyticsService.js');
            const umamiService = new module.AnalyticsService();

            umamiService.track('test_event');

            expect(window.umami.trackEvent).toHaveBeenCalled();
        });
    });

    describe('Public Tracking Methods', () => {
        beforeEach(() => {
            vi.spyOn(service, 'track');
        });

        it('trackClick sends click event', () => {
            service.trackClick('btn-submit', 'Submit Button');

            expect(service.track).toHaveBeenCalledWith('click', {
                elementId: 'btn-submit',
                label: 'Submit Button'
            });
        });

        it('trackFormSubmit sends form_submit event', () => {
            service.trackFormSubmit('contact-form', true);

            expect(service.track).toHaveBeenCalledWith('form_submit', {
                formId: 'contact-form',
                success: true
            });
        });

        it('trackError sends error event', () => {
            const error = new Error('Test error');
            service.trackError(error, 'test context');

            expect(service.track).toHaveBeenCalledWith('error', {
                message: 'Test error',
                context: 'test context',
                stack: expect.any(String)
            });
        });

        it('trackSearch sends search event', () => {
            service.trackSearch('test query', 5);

            expect(service.track).toHaveBeenCalledWith('search', {
                query: 'test query',
                resultCount: 5
            });
        });

        it('trackOutboundLink sends outbound_link event', () => {
            service.trackOutboundLink('https://example.com');

            expect(service.track).toHaveBeenCalledWith('outbound_link', {
                url: 'https://example.com'
            });
        });

        it('trackFeatureUse sends feature_use event', () => {
            service.trackFeatureUse('dark-mode');

            expect(service.track).toHaveBeenCalledWith('feature_use', {
                feature: 'dark-mode'
            });
        });

        it('trackModalOpen sends modal_open event', () => {
            service.trackModalOpen('project-modal');

            expect(service.track).toHaveBeenCalledWith('modal_open', {
                modalId: 'project-modal'
            });
        });

        it('trackProjectView sends project_view event', () => {
            service.trackProjectView('kaizen-os');

            expect(service.track).toHaveBeenCalledWith('project_view', {
                projectId: 'kaizen-os'
            });
        });

        it('trackEasterEgg sends easter_egg event', () => {
            service.trackEasterEgg('konami');

            expect(service.track).toHaveBeenCalledWith('easter_egg', {
                eggId: 'konami'
            });
        });
    });

    describe('Page View Tracking', () => {
        it('tracks initial page view', () => {
            const trackSpy = vi.spyOn(service, 'track');

            service.trackPageView();

            expect(trackSpy).toHaveBeenCalledWith('page_view', expect.objectContaining({
                title: expect.any(String),
                path: expect.any(String),
                screen: expect.any(String)
            }));
        });

        it('sets up MutationObserver for SPA navigation', () => {
            service.trackPageView();

            expect(MutationObserver).toHaveBeenCalled();
        });
    });

    describe('Scroll Depth Tracking', () => {
        it('tracks scroll milestones', () => {
            const trackSpy = vi.spyOn(service, 'track');
            service.trackScrollDepth();

            // Simulate scroll to bottom
            Object.defineProperty(document.body, 'scrollHeight', { value: 2000 });
            Object.defineProperty(window, 'innerHeight', { value: 1000 });
            Object.defineProperty(window, 'scrollY', { value: 1000, configurable: true });

            window.dispatchEvent(new Event('scroll'));
            vi.advanceTimersByTime(100);

            expect(trackSpy).toHaveBeenCalledWith('scroll_depth', expect.objectContaining({
                depth: expect.any(Number)
            }));
        });
    });

    describe('Time on Page Tracking', () => {
        it('tracks time intervals', () => {
            const trackSpy = vi.spyOn(service, 'track');
            service.trackTimeOnPage();

            // Advance 30 seconds
            vi.advanceTimersByTime(30000);

            expect(trackSpy).toHaveBeenCalledWith('time_on_page', { seconds: 30 });
        });

        it('tracks session end on visibility change', () => {
            const trackSpy = vi.spyOn(service, 'track');
            service.trackTimeOnPage();

            // Advance some time
            vi.advanceTimersByTime(15000);

            // Simulate page hide
            Object.defineProperty(document, 'visibilityState', {
                value: 'hidden',
                configurable: true
            });
            document.dispatchEvent(new Event('visibilitychange'));

            expect(trackSpy).toHaveBeenCalledWith('session_end', expect.objectContaining({
                totalSeconds: expect.any(Number)
            }));
        });
    });

    describe('Web Vitals Tracking', () => {
        it('sets up LCP observer', () => {
            service.trackWebVitals();

            expect(PerformanceObserver).toHaveBeenCalled();
        });

        it('handles PerformanceObserver errors gracefully', () => {
            global.PerformanceObserver = vi.fn().mockImplementation(() => {
                throw new Error('Not supported');
            });

            expect(() => service.trackWebVitals()).not.toThrow();
        });
    });

    describe('Session ID Generation', () => {
        it('generates unique session IDs', () => {
            const id1 = service.generateSessionId();
            const id2 = service.generateSessionId();

            expect(id1).not.toBe(id2);
        });

        it('includes timestamp in session ID', () => {
            const id = service.generateSessionId();
            const timestamp = id.split('-')[0];

            expect(parseInt(timestamp)).toBeGreaterThan(0);
        });
    });

    describe('Singleton Export', () => {
        it('exports singleton instance', async () => {
            const module = await import('../../src/services/AnalyticsService.js');
            expect(module.analytics).toBeDefined();
            expect(module.analytics).toBeInstanceOf(module.AnalyticsService);
        });
    });
});
