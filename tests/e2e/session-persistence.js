/**
 * KAIZEN Elite Portfolio - Session Persistence System
 * Unique session signatures for continuability across test runs
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createHash, randomBytes } from 'crypto';

const SESSION_DIR = join(process.cwd(), 'test-results', 'sessions');
const SIGNATURE_LENGTH = 32;

/**
 * Generate unique session signature
 * Combines timestamp, random bytes, and environment data
 */
export function generateSessionSignature() {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(8).toString('hex');
    const envHash = createHash('sha256')
        .update(JSON.stringify({
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            cwd: process.cwd(),
        }))
        .digest('hex')
        .substring(0, 8);

    return `kaizen-${timestamp}-${random}-${envHash}`;
}

/**
 * Session state manager
 */
export class SessionManager {
    constructor(sessionId = null) {
        this.sessionId = sessionId || generateSessionSignature();
        this.sessionPath = join(SESSION_DIR, `${this.sessionId}.json`);
        this.state = this.load();
    }

    /**
     * Ensure session directory exists
     */
    ensureDir() {
        if (!existsSync(SESSION_DIR)) {
            mkdirSync(SESSION_DIR, { recursive: true });
        }
    }

    /**
     * Load existing session or create new
     */
    load() {
        this.ensureDir();

        if (existsSync(this.sessionPath)) {
            try {
                const data = readFileSync(this.sessionPath, 'utf-8');
                return JSON.parse(data);
            } catch (e) {
                console.warn(`Failed to load session ${this.sessionId}:`, e.message);
            }
        }

        return this.createNew();
    }

    /**
     * Create new session state
     */
    createNew() {
        return {
            id: this.sessionId,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            version: '1.0.0',
            status: 'active',
            progress: {
                completedTests: [],
                failedTests: [],
                pendingTests: [],
                currentTest: null,
            },
            metrics: {
                totalRuns: 0,
                passCount: 0,
                failCount: 0,
                skipCount: 0,
                duration: 0,
            },
            snapshots: {
                baseline: null,
                current: null,
                diffs: [],
            },
            checkpoints: [],
            config: {
                profile: 'standard',
                viewports: [],
                maxRetries: 3,
            },
            logs: [],
        };
    }

    /**
     * Save session state
     */
    save() {
        this.ensureDir();
        this.state.updated = new Date().toISOString();

        try {
            writeFileSync(this.sessionPath, JSON.stringify(this.state, null, 2));
            return true;
        } catch (e) {
            console.error(`Failed to save session:`, e.message);
            return false;
        }
    }

    /**
     * Create checkpoint for continuability
     */
    checkpoint(name, data = {}) {
        const checkpoint = {
            name,
            timestamp: new Date().toISOString(),
            progress: { ...this.state.progress },
            metrics: { ...this.state.metrics },
            data,
        };

        this.state.checkpoints.push(checkpoint);
        this.save();

        return checkpoint;
    }

    /**
     * Resume from last checkpoint
     */
    resumeFromCheckpoint(checkpointName = null) {
        if (this.state.checkpoints.length === 0) {
            return null;
        }

        const checkpoint = checkpointName
            ? this.state.checkpoints.find(c => c.name === checkpointName)
            : this.state.checkpoints[this.state.checkpoints.length - 1];

        if (checkpoint) {
            this.state.progress = { ...checkpoint.progress };
            this.log('info', `Resumed from checkpoint: ${checkpoint.name}`);
        }

        return checkpoint;
    }

    /**
     * Mark test as started
     */
    startTest(testName) {
        this.state.progress.currentTest = {
            name: testName,
            started: new Date().toISOString(),
        };
        this.state.metrics.totalRuns++;
        this.save();
    }

    /**
     * Mark test as completed
     */
    completeTest(testName, status, duration = 0, details = {}) {
        const testRecord = {
            name: testName,
            status,
            duration,
            timestamp: new Date().toISOString(),
            ...details,
        };

        if (status === 'pass') {
            this.state.progress.completedTests.push(testRecord);
            this.state.metrics.passCount++;
        } else if (status === 'fail') {
            this.state.progress.failedTests.push(testRecord);
            this.state.metrics.failCount++;
        } else {
            this.state.metrics.skipCount++;
        }

        this.state.metrics.duration += duration;
        this.state.progress.currentTest = null;

        // Remove from pending if exists
        const pendingIdx = this.state.progress.pendingTests.indexOf(testName);
        if (pendingIdx > -1) {
            this.state.progress.pendingTests.splice(pendingIdx, 1);
        }

        this.save();
    }

    /**
     * Add pending tests
     */
    queueTests(testNames) {
        this.state.progress.pendingTests = [
            ...new Set([...this.state.progress.pendingTests, ...testNames])
        ];
        this.save();
    }

    /**
     * Get next pending test
     */
    getNextTest() {
        return this.state.progress.pendingTests[0] || null;
    }

    /**
     * Check if test was already completed
     */
    isCompleted(testName) {
        return this.state.progress.completedTests.some(t => t.name === testName);
    }

    /**
     * Check if test failed (for retry logic)
     */
    getFailureCount(testName) {
        return this.state.progress.failedTests.filter(t => t.name === testName).length;
    }

    /**
     * Add log entry
     */
    log(level, message, data = {}) {
        this.state.logs.push({
            level,
            message,
            timestamp: new Date().toISOString(),
            ...data,
        });

        // Keep only last 1000 logs
        if (this.state.logs.length > 1000) {
            this.state.logs = this.state.logs.slice(-1000);
        }
    }

    /**
     * Store snapshot reference
     */
    setSnapshot(type, path) {
        this.state.snapshots[type] = {
            path,
            timestamp: new Date().toISOString(),
        };
        this.save();
    }

    /**
     * Add diff record
     */
    addDiff(testName, baselinePath, currentPath, diffPath, diffPercent) {
        this.state.snapshots.diffs.push({
            testName,
            baselinePath,
            currentPath,
            diffPath,
            diffPercent,
            timestamp: new Date().toISOString(),
        });
        this.save();
    }

    /**
     * Get session summary
     */
    getSummary() {
        const { metrics, progress } = this.state;
        const total = metrics.passCount + metrics.failCount + metrics.skipCount;

        return {
            sessionId: this.sessionId,
            status: this.state.status,
            total,
            passed: metrics.passCount,
            failed: metrics.failCount,
            skipped: metrics.skipCount,
            passRate: total > 0 ? ((metrics.passCount / total) * 100).toFixed(1) : 0,
            duration: metrics.duration,
            pending: progress.pendingTests.length,
            checkpoints: this.state.checkpoints.length,
            lastUpdated: this.state.updated,
        };
    }

    /**
     * Mark session as complete
     */
    complete() {
        this.state.status = 'completed';
        this.checkpoint('session_complete');
        this.save();
    }

    /**
     * Mark session as failed
     */
    fail(error) {
        this.state.status = 'failed';
        this.log('error', error.message || String(error));
        this.save();
    }
}

/**
 * Get latest incomplete session for continuation
 */
export function findResumableSession() {
    if (!existsSync(SESSION_DIR)) {
        return null;
    }

    const files = readdirSync(SESSION_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => {
            const data = JSON.parse(readFileSync(join(SESSION_DIR, f), 'utf-8'));
            return data;
        })
        .filter(s => s.status === 'active')
        .sort((a, b) => new Date(b.updated) - new Date(a.updated));

    return files[0]?.id || null;
}

/**
 * List all sessions
 */
export function listSessions() {
    if (!existsSync(SESSION_DIR)) {
        return [];
    }

    return readdirSync(SESSION_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => {
            try {
                const data = JSON.parse(readFileSync(join(SESSION_DIR, f), 'utf-8'));
                return {
                    id: data.id,
                    status: data.status,
                    created: data.created,
                    updated: data.updated,
                    passRate: data.metrics.totalRuns > 0
                        ? ((data.metrics.passCount / data.metrics.totalRuns) * 100).toFixed(1)
                        : 0,
                };
            } catch {
                return null;
            }
        })
        .filter(Boolean);
}

/**
 * Playwright test fixture integration
 */
export function createSessionFixture() {
    return {
        session: async ({}, use) => {
            const sessionId = process.env.KAIZEN_SESSION_ID || generateSessionSignature();
            const session = new SessionManager(sessionId);

            console.log(`\n[Session] ID: ${sessionId}`);
            console.log(`[Session] Status: ${session.state.status}`);

            await use(session);

            session.save();
        },
    };
}

export default {
    generateSessionSignature,
    SessionManager,
    findResumableSession,
    listSessions,
    createSessionFixture,
};
