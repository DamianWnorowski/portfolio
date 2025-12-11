/**
 * KAIZEN Elite Portfolio - Test Runner Configuration
 * Centralized configuration for auto-chain testing loops
 */

export const TEST_PROFILES = {
    // Quick smoke test - minimal coverage, fast execution
    smoke: {
        viewports: [
            { width: 1920, height: 1080, name: 'desktop' },
            { width: 390, height: 844, name: 'mobile' },
        ],
        iterations: 5,
        maxRetries: 1,
        screenshotOnFailure: false,
        sections: ['hero', 'navigation'],
    },

    // Standard regression - balanced coverage
    standard: {
        viewports: [
            { width: 1920, height: 1080, name: 'desktop' },
            { width: 1024, height: 768, name: 'tablet' },
            { width: 390, height: 844, name: 'mobile' },
        ],
        iterations: 20,
        maxRetries: 3,
        screenshotOnFailure: true,
        sections: ['hero', 'about', 'projects', 'skills', 'contact'],
    },

    // Full regression - comprehensive coverage
    full: {
        viewports: [
            { width: 3840, height: 2160, name: '4k' },
            { width: 1920, height: 1080, name: 'desktop' },
            { width: 1600, height: 900, name: 'desktop-large' },
            { width: 1280, height: 800, name: 'desktop-medium' },
            { width: 1024, height: 768, name: 'tablet-landscape' },
            { width: 768, height: 1024, name: 'tablet-portrait' },
            { width: 428, height: 926, name: 'phone-large' },
            { width: 390, height: 844, name: 'phone-standard' },
            { width: 320, height: 568, name: 'phone-small' },
        ],
        iterations: 50,
        maxRetries: 3,
        screenshotOnFailure: true,
        sections: ['hero', 'navigation', 'about', 'projects', 'skills', 'contact', 'footer', 'modal'],
    },

    // Stress test - high iteration chaos testing
    stress: {
        viewports: [
            { width: 1920, height: 1080, name: 'desktop' },
            { width: 768, height: 1024, name: 'tablet' },
            { width: 390, height: 844, name: 'mobile' },
        ],
        iterations: 100,
        maxRetries: 1,
        screenshotOnFailure: false,
        randomize: true,
        actions: ['scroll', 'click', 'hover', 'resize', 'navigate', 'form'],
    },

    // Accessibility focused
    a11y: {
        viewports: [
            { width: 1920, height: 1080, name: 'desktop' },
            { width: 390, height: 844, name: 'mobile' },
        ],
        iterations: 30,
        maxRetries: 2,
        screenshotOnFailure: true,
        focusAreas: ['keyboard-navigation', 'focus-indicators', 'contrast', 'aria-labels'],
    },
};

export const SECTION_SELECTORS = {
    hero: '.hero, [class*="hero"], #hero, section:first-of-type',
    navigation: 'nav, .nav, [class*="nav"], .top-bar',
    about: '.about, [class*="about"], #about',
    projects: '.projects, [class*="project"], #projects, .assets',
    skills: '.skills, [class*="skill"], #skills',
    contact: '.contact, [class*="contact"], #contact',
    footer: 'footer, .footer, [class*="footer"]',
    modal: '.modal, [class*="modal"], dialog',
};

export const INTERACTION_WEIGHTS = {
    // Higher weight = more likely to be selected in random tests
    scroll: 30,
    click: 25,
    hover: 20,
    resize: 15,
    form: 5,
    navigate: 5,
};

export const PERFORMANCE_THRESHOLDS = {
    pageLoad: 5000,      // ms
    firstPaint: 1500,    // ms
    interactive: 3000,   // ms
    layoutShift: 0.1,    // CLS score
};

export const ACCESSIBILITY_STANDARDS = {
    minContrast: 4.5,       // WCAG AA
    minTouchTarget: 44,     // px
    maxTabCount: 100,       // reasonable tab limit
    requiredLandmarks: ['main', 'navigation'],
};

/**
 * Generate test matrix for given profile
 */
export function generateTestMatrix(profileName) {
    const profile = TEST_PROFILES[profileName] || TEST_PROFILES.standard;
    const matrix = [];

    for (const viewport of profile.viewports) {
        for (const section of profile.sections || Object.keys(SECTION_SELECTORS)) {
            matrix.push({
                viewport,
                section,
                selector: SECTION_SELECTORS[section],
                iterations: Math.ceil(profile.iterations / profile.viewports.length),
            });
        }
    }

    return matrix;
}

/**
 * Select random action based on weights
 */
export function selectWeightedAction() {
    const total = Object.values(INTERACTION_WEIGHTS).reduce((a, b) => a + b, 0);
    let random = Math.random() * total;

    for (const [action, weight] of Object.entries(INTERACTION_WEIGHTS)) {
        random -= weight;
        if (random <= 0) return action;
    }

    return 'click';
}

export default {
    TEST_PROFILES,
    SECTION_SELECTORS,
    INTERACTION_WEIGHTS,
    PERFORMANCE_THRESHOLDS,
    ACCESSIBILITY_STANDARDS,
    generateTestMatrix,
    selectWeightedAction,
};
