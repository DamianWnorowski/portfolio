#!/usr/bin/env node

/**
 * Hyperlist Validator
 * CI gate that verifies all changed features have RIF = 0
 *
 * Usage: node scripts/hyperlist-validator.js [--fail-on-missing] [--verbose]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HYPERLIST_PATTERN = /HYPERLIST[_\-][\w]+\.md/;
const RIF_PATTERN = /^-\s*\*\*RIF\s*=\s*(\d+)\*\*/m;
const STRUCTURALITY_PATTERN = /\*\*Structurality Score:\s*([\d.]+)%\*\*/;

function findHyperlists() {
  const hyperlists = [];
  const scanDir = (dir) => {
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          if (!fullPath.includes('node_modules') && !fullPath.includes('.git')) {
            scanDir(fullPath);
          }
        } else if (HYPERLIST_PATTERN.test(file)) {
          hyperlists.push(fullPath);
        }
      });
    } catch (e) {
      // Skip
    }
  };

  scanDir(path.join(__dirname, '..'));
  return hyperlists;
}

function validateHyperlist(filePath) {
  const errors = [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract RIF
    const rifMatch = content.match(RIF_PATTERN);
    const rif = rifMatch ? parseInt(rifMatch[1], 10) : -1;

    if (rif === -1) {
      errors.push('Missing RIF value');
    }

    // Extract Structurality
    const structMatch = content.match(STRUCTURALITY_PATTERN);
    const structurality = structMatch ? parseFloat(structMatch[1]) : -1;

    if (structurality === -1) {
      errors.push('Missing Structurality Score');
    }

    // Verify RIF = 0
    if (rif > 0) {
      errors.push(`RIF = ${rif} (must be 0)`);
    }

    // Verify Structurality >= 80
    if (structurality < 80) {
      errors.push(`Structurality = ${structurality}% (must be ≥80%)`);
    }

    return {
      path: filePath,
      rif: rif >= 0 ? rif : -1,
      structurality: structurality >= 0 ? structurality : -1,
      valid: errors.length === 0 && rif === 0 && structurality >= 80,
      errors,
    };
  } catch (error) {
    return {
      path: filePath,
      rif: -1,
      structurality: -1,
      valid: false,
      errors: [`Failed to read: ${error.message}`],
    };
  }
}

function main() {
  const args = process.argv.slice(2);
  const failOnMissing = args.includes('--fail-on-missing');
  const verbose = args.includes('--verbose');

  console.log('[hyperlist-validator] Starting validation...\n');

  const hyperlists = findHyperlists();

  if (hyperlists.length === 0) {
    console.warn('[hyperlist-validator] No HYPERLIST files found');
    if (failOnMissing) {
      console.error('✗ No hyperlists found (--fail-on-missing enabled)');
      process.exit(1);
    }
    return;
  }

  console.log(`[hyperlist-validator] Found ${hyperlists.length} hyperlist(s)\n`);

  const results = hyperlists.map(validateHyperlist);
  const validCount = results.filter(r => r.valid).length;
  const totalCount = results.length;

  // Print results
  results.forEach(result => {
    const status = result.valid ? '✓' : '✗';
    console.log(`${status} ${result.path}`);

    if (!result.valid) {
      result.errors.forEach(err => {
        console.log(`    ↳ ${err}`);
      });
    }

    if (verbose) {
      console.log(`    RIF: ${result.rif}, Structurality: ${result.structurality}%`);
    }
  });

  console.log(`\n[hyperlist-validator] ${validCount}/${totalCount} valid\n`);

  // Exit code
  if (validCount < totalCount) {
    console.error('✗ HYPERLIST VALIDATION FAILED');
    console.error('  - Fix RIF values (must be 0)');
    console.error('  - Improve structurality (must be ≥80%)');
    console.error('  - All invariants must be met before merge\n');
    process.exit(1);
  }

  console.log('✓ HYPERLIST VALIDATION PASSED');
  console.log('  All features have RIF = 0');
  console.log('  All features meet structurality threshold\n');
  process.exit(0);
}

main();
