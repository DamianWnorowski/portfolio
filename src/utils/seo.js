/**
 * SEO Utilities
 * Structured data, meta tags, and Open Graph
 */

export function injectStructuredData() {
    // Person schema
    const personSchema = {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": "Damian Norowski",
        "alternateName": "KAIZEN",
        "url": "https://kaizen.dev",
        "image": "https://kaizen.dev/images/profile.jpg",
        "jobTitle": "Senior Software Engineer",
        "worksFor": {
            "@type": "Organization",
            "name": "Independent Consultant"
        },
        "sameAs": [
            "https://github.com/damianwnorowski",
            "https://linkedin.com/in/damianwnorowski",
            "https://twitter.com/damianwnorowski"
        ],
        "knowsAbout": [
            "Software Engineering",
            "Full Stack Development",
            "AI/ML Engineering",
            "System Architecture",
            "Cloud Infrastructure",
            "TypeScript",
            "Python",
            "Rust",
            "React",
            "Node.js"
        ],
        "description": "Elite software engineer specializing in high-performance systems, AI integration, and scalable architecture. Building tomorrow's infrastructure today."
    };

    // WebSite schema
    const websiteSchema = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "KAIZEN | Executive Terminal",
        "alternateName": "Damian Norowski Portfolio",
        "url": "https://kaizen.dev",
        "description": "Elite software engineering portfolio showcasing cutting-edge projects and technical expertise.",
        "author": {
            "@type": "Person",
            "name": "Damian Norowski"
        },
        "potentialAction": {
            "@type": "SearchAction",
            "target": "https://kaizen.dev/?q={search_term_string}",
            "query-input": "required name=search_term_string"
        }
    };

    // CreativeWork schema for projects
    const projectsSchema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Featured Projects",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "item": {
                    "@type": "SoftwareApplication",
                    "name": "KAIZEN AI Platform",
                    "applicationCategory": "AI/ML Platform",
                    "description": "Autonomous AI agents for enterprise automation",
                    "operatingSystem": "Cloud-based",
                    "offers": {
                        "@type": "Offer",
                        "price": "0",
                        "priceCurrency": "USD"
                    }
                }
            },
            {
                "@type": "ListItem",
                "position": 2,
                "item": {
                    "@type": "SoftwareApplication",
                    "name": "Neural Nexus",
                    "applicationCategory": "Developer Tools",
                    "description": "AI-powered code analysis and generation",
                    "operatingSystem": "Cross-platform"
                }
            },
            {
                "@type": "ListItem",
                "position": 3,
                "item": {
                    "@type": "SoftwareApplication",
                    "name": "Fleet Commander",
                    "applicationCategory": "Logistics",
                    "description": "Real-time fleet management and optimization",
                    "operatingSystem": "Web-based"
                }
            }
        ]
    };

    // Inject schemas
    injectSchema('person-schema', personSchema);
    injectSchema('website-schema', websiteSchema);
    injectSchema('projects-schema', projectsSchema);

    // Update meta tags
    updateMetaTags();
}

function injectSchema(id, schema) {
    // Remove existing if present
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
}

function updateMetaTags() {
    const meta = {
        // Basic
        'description': 'Elite software engineer specializing in high-performance systems, AI integration, and scalable architecture. View projects, skills, and contact information.',
        'author': 'Damian Norowski',
        'keywords': 'software engineer, full stack developer, AI engineer, TypeScript, React, Node.js, Python, Rust, portfolio',

        // Open Graph
        'og:type': 'website',
        'og:title': 'KAIZEN | Executive Terminal - Damian Norowski',
        'og:description': 'Elite software engineering portfolio showcasing cutting-edge projects and technical expertise.',
        'og:image': 'https://kaizen.dev/images/og-image.png',
        'og:url': 'https://kaizen.dev',
        'og:site_name': 'KAIZEN Elite',

        // Twitter
        'twitter:card': 'summary_large_image',
        'twitter:site': '@damianwnorowski',
        'twitter:creator': '@damianwnorowski',
        'twitter:title': 'KAIZEN | Executive Terminal',
        'twitter:description': 'Elite software engineering portfolio',
        'twitter:image': 'https://kaizen.dev/images/twitter-card.png',

        // Additional
        'theme-color': '#0a0c10',
        'msapplication-TileColor': '#c9a227',
        'robots': 'index, follow',
        'googlebot': 'index, follow'
    };

    Object.entries(meta).forEach(([name, content]) => {
        let selector = `meta[name="${name}"]`;
        if (name.startsWith('og:')) {
            selector = `meta[property="${name}"]`;
        }

        let element = document.querySelector(selector);

        if (!element) {
            element = document.createElement('meta');
            if (name.startsWith('og:')) {
                element.setAttribute('property', name);
            } else {
                element.setAttribute('name', name);
            }
            document.head.appendChild(element);
        }

        element.setAttribute('content', content);
    });

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', 'https://kaizen.dev');
}

// Export for use
export const seo = {
    init: injectStructuredData,
    updateMeta: updateMetaTags
};
