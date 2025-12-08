/**
 * SEO Utilities Unit Tests
 * Tests for structured data, meta tags, and Open Graph
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('SEO Utilities', () => {
    let seo;
    let injectStructuredData;

    beforeEach(async () => {
        vi.resetModules();

        document.head.innerHTML = '';
        document.body.innerHTML = '';

        const module = await import('../../src/utils/seo.js');
        seo = module.seo;
        injectStructuredData = module.injectStructuredData;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('injectStructuredData', () => {
        it('injects person schema', () => {
            injectStructuredData();

            const script = document.getElementById('person-schema');
            expect(script).not.toBeNull();
            expect(script.type).toBe('application/ld+json');
        });

        it('injects website schema', () => {
            injectStructuredData();

            const script = document.getElementById('website-schema');
            expect(script).not.toBeNull();
            expect(script.type).toBe('application/ld+json');
        });

        it('injects projects schema', () => {
            injectStructuredData();

            const script = document.getElementById('projects-schema');
            expect(script).not.toBeNull();
            expect(script.type).toBe('application/ld+json');
        });

        it('person schema contains correct data', () => {
            injectStructuredData();

            const script = document.getElementById('person-schema');
            const data = JSON.parse(script.textContent);

            expect(data['@type']).toBe('Person');
            expect(data.name).toBe('Damian Norowski');
            expect(data.alternateName).toBe('KAIZEN');
            expect(data.jobTitle).toBe('Senior Software Engineer');
        });

        it('person schema includes social links', () => {
            injectStructuredData();

            const script = document.getElementById('person-schema');
            const data = JSON.parse(script.textContent);

            expect(data.sameAs).toContain('https://github.com/damianwnorowski');
            expect(data.sameAs).toContain('https://linkedin.com/in/damianwnorowski');
        });

        it('person schema includes skills', () => {
            injectStructuredData();

            const script = document.getElementById('person-schema');
            const data = JSON.parse(script.textContent);

            expect(data.knowsAbout).toContain('TypeScript');
            expect(data.knowsAbout).toContain('Python');
            expect(data.knowsAbout).toContain('React');
        });

        it('website schema contains correct data', () => {
            injectStructuredData();

            const script = document.getElementById('website-schema');
            const data = JSON.parse(script.textContent);

            expect(data['@type']).toBe('WebSite');
            expect(data.name).toBe('KAIZEN | Executive Terminal');
            expect(data.url).toBe('https://kaizen.dev');
        });

        it('website schema includes search action', () => {
            injectStructuredData();

            const script = document.getElementById('website-schema');
            const data = JSON.parse(script.textContent);

            expect(data.potentialAction['@type']).toBe('SearchAction');
            expect(data.potentialAction.target).toContain('search_term_string');
        });

        it('projects schema is ItemList type', () => {
            injectStructuredData();

            const script = document.getElementById('projects-schema');
            const data = JSON.parse(script.textContent);

            expect(data['@type']).toBe('ItemList');
            expect(data.itemListElement.length).toBeGreaterThan(0);
        });

        it('projects schema items are numbered', () => {
            injectStructuredData();

            const script = document.getElementById('projects-schema');
            const data = JSON.parse(script.textContent);

            expect(data.itemListElement[0].position).toBe(1);
            expect(data.itemListElement[1].position).toBe(2);
        });

        it('replaces existing schemas', () => {
            // Inject first time
            injectStructuredData();

            // Inject second time
            injectStructuredData();

            const scripts = document.querySelectorAll('#person-schema');
            expect(scripts.length).toBe(1);
        });
    });

    describe('Meta Tags', () => {
        beforeEach(() => {
            injectStructuredData();
        });

        it('sets description meta tag', () => {
            const meta = document.querySelector('meta[name="description"]');
            expect(meta).not.toBeNull();
            expect(meta.content).toContain('software engineer');
        });

        it('sets author meta tag', () => {
            const meta = document.querySelector('meta[name="author"]');
            expect(meta).not.toBeNull();
            expect(meta.content).toBe('Damian Norowski');
        });

        it('sets keywords meta tag', () => {
            const meta = document.querySelector('meta[name="keywords"]');
            expect(meta).not.toBeNull();
            expect(meta.content).toContain('software engineer');
            expect(meta.content).toContain('TypeScript');
        });

        it('sets robots meta tag', () => {
            const meta = document.querySelector('meta[name="robots"]');
            expect(meta).not.toBeNull();
            expect(meta.content).toBe('index, follow');
        });

        it('sets theme-color meta tag', () => {
            const meta = document.querySelector('meta[name="theme-color"]');
            expect(meta).not.toBeNull();
            expect(meta.content).toBe('#0a0c10');
        });
    });

    describe('Open Graph Tags', () => {
        beforeEach(() => {
            injectStructuredData();
        });

        it('sets og:type', () => {
            const meta = document.querySelector('meta[property="og:type"]');
            expect(meta).not.toBeNull();
            expect(meta.content).toBe('website');
        });

        it('sets og:title', () => {
            const meta = document.querySelector('meta[property="og:title"]');
            expect(meta).not.toBeNull();
            expect(meta.content).toContain('KAIZEN');
        });

        it('sets og:description', () => {
            const meta = document.querySelector('meta[property="og:description"]');
            expect(meta).not.toBeNull();
            expect(meta.content).toContain('portfolio');
        });

        it('sets og:image', () => {
            const meta = document.querySelector('meta[property="og:image"]');
            expect(meta).not.toBeNull();
            expect(meta.content).toContain('og-image');
        });

        it('sets og:url', () => {
            const meta = document.querySelector('meta[property="og:url"]');
            expect(meta).not.toBeNull();
            expect(meta.content).toBe('https://kaizen.dev');
        });

        it('sets og:site_name', () => {
            const meta = document.querySelector('meta[property="og:site_name"]');
            expect(meta).not.toBeNull();
            expect(meta.content).toBe('KAIZEN Elite');
        });
    });

    describe('Twitter Tags', () => {
        beforeEach(() => {
            injectStructuredData();
        });

        it('sets twitter:card', () => {
            const meta = document.querySelector('meta[name="twitter:card"]');
            expect(meta).not.toBeNull();
            expect(meta.content).toBe('summary_large_image');
        });

        it('sets twitter:site', () => {
            const meta = document.querySelector('meta[name="twitter:site"]');
            expect(meta).not.toBeNull();
            expect(meta.content).toBe('@damianwnorowski');
        });

        it('sets twitter:creator', () => {
            const meta = document.querySelector('meta[name="twitter:creator"]');
            expect(meta).not.toBeNull();
            expect(meta.content).toBe('@damianwnorowski');
        });

        it('sets twitter:title', () => {
            const meta = document.querySelector('meta[name="twitter:title"]');
            expect(meta).not.toBeNull();
            expect(meta.content).toContain('KAIZEN');
        });

        it('sets twitter:description', () => {
            const meta = document.querySelector('meta[name="twitter:description"]');
            expect(meta).not.toBeNull();
        });

        it('sets twitter:image', () => {
            const meta = document.querySelector('meta[name="twitter:image"]');
            expect(meta).not.toBeNull();
            expect(meta.content).toContain('twitter-card');
        });
    });

    describe('Canonical URL', () => {
        it('adds canonical link', () => {
            injectStructuredData();

            const canonical = document.querySelector('link[rel="canonical"]');
            expect(canonical).not.toBeNull();
            expect(canonical.href).toBe('https://kaizen.dev/');
        });

        it('updates existing canonical', () => {
            // Add existing canonical
            const existing = document.createElement('link');
            existing.rel = 'canonical';
            existing.href = 'https://old-url.com';
            document.head.appendChild(existing);

            injectStructuredData();

            const canonicals = document.querySelectorAll('link[rel="canonical"]');
            expect(canonicals.length).toBe(1);
            expect(canonicals[0].href).toBe('https://kaizen.dev/');
        });
    });

    describe('SEO Object Export', () => {
        it('exports init function', () => {
            expect(seo.init).toBeDefined();
            expect(typeof seo.init).toBe('function');
        });

        it('exports updateMeta function', () => {
            expect(seo.updateMeta).toBeDefined();
            expect(typeof seo.updateMeta).toBe('function');
        });

        it('init function works correctly', () => {
            seo.init();

            expect(document.getElementById('person-schema')).not.toBeNull();
        });

        it('updateMeta function works correctly', () => {
            seo.updateMeta();

            expect(document.querySelector('meta[name="description"]')).not.toBeNull();
        });
    });

    describe('Meta Tag Updates', () => {
        it('updates existing meta tags', () => {
            // Create existing meta
            const existing = document.createElement('meta');
            existing.name = 'description';
            existing.content = 'Old description';
            document.head.appendChild(existing);

            injectStructuredData();

            const meta = document.querySelector('meta[name="description"]');
            expect(meta.content).not.toBe('Old description');
        });

        it('does not duplicate meta tags', () => {
            injectStructuredData();
            injectStructuredData();

            const metas = document.querySelectorAll('meta[name="description"]');
            expect(metas.length).toBe(1);
        });
    });

    describe('Schema.org Context', () => {
        it('all schemas have @context', () => {
            injectStructuredData();

            const person = JSON.parse(document.getElementById('person-schema').textContent);
            const website = JSON.parse(document.getElementById('website-schema').textContent);
            const projects = JSON.parse(document.getElementById('projects-schema').textContent);

            expect(person['@context']).toBe('https://schema.org');
            expect(website['@context']).toBe('https://schema.org');
            expect(projects['@context']).toBe('https://schema.org');
        });

        it('all schemas have @type', () => {
            injectStructuredData();

            const person = JSON.parse(document.getElementById('person-schema').textContent);
            const website = JSON.parse(document.getElementById('website-schema').textContent);
            const projects = JSON.parse(document.getElementById('projects-schema').textContent);

            expect(person['@type']).toBe('Person');
            expect(website['@type']).toBe('WebSite');
            expect(projects['@type']).toBe('ItemList');
        });
    });

    describe('Project Items', () => {
        it('project items are SoftwareApplication type', () => {
            injectStructuredData();

            const projects = JSON.parse(document.getElementById('projects-schema').textContent);
            const firstItem = projects.itemListElement[0].item;

            expect(firstItem['@type']).toBe('SoftwareApplication');
        });

        it('project items have required properties', () => {
            injectStructuredData();

            const projects = JSON.parse(document.getElementById('projects-schema').textContent);
            const firstItem = projects.itemListElement[0].item;

            expect(firstItem.name).toBeDefined();
            expect(firstItem.applicationCategory).toBeDefined();
            expect(firstItem.description).toBeDefined();
        });
    });
});
