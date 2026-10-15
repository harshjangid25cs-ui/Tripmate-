#!/usr/bin/env node
/**
 * check-gradients.js
 * Enforces the strict rule from AGENTS.md §4 and DESIGN.md:
 * "No gradients. No gradient backgrounds, borders, shadows, or text. Solid colors only."
 *
 * Scans src/ for:
 * 1. CSS gradient functions: linear-gradient, radial-gradient, conic-gradient, etc.
 * 2. Tailwind gradient utility classes: bg-gradient-*, from-*, via-*, to-* (gradient stops)
 */

const fs = require('fs');
const path = require('path');

const TARGET_DIRS = [
  path.resolve(__dirname, '../src'),
  path.resolve(__dirname, '../frontend'),
  path.resolve(__dirname, '../backend'),
];

// Regex patterns to detect gradients
const BANNED_PATTERNS = [
  { name: 'CSS linear-gradient', regex: /linear-gradient\s*\(/i },
  { name: 'CSS radial-gradient', regex: /radial-gradient\s*\(/i },
  { name: 'CSS conic-gradient', regex: /conic-gradient\s*\(/i },
  { name: 'Tailwind bg-gradient', regex: /\bbg-gradient-(?:to-[trbl]{1,2}|none)\b/i },
  { name: 'Tailwind gradient stops', regex: /\b(?:from|via|to)-(?:[a-z]+|\#[0-9a-f]+|rgba?\([^)]+\))/i },
  { name: 'Gradient text clip', regex: /\bbg-clip-text\b/i },
];

function scanDirectory(dir, issues = []) {
  if (!fs.existsSync(dir)) return issues;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        scanDirectory(fullPath, issues);
      }
    } else if (/\.(tsx?|jsx?|css|scss|html)$/i.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Skip comment lines in scripts or tests that mention banned names
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
          return;
        }

        for (const pattern of BANNED_PATTERNS) {
          if (pattern.regex.test(line)) {
            issues.push({
              file: path.relative(process.cwd(), fullPath),
              line: index + 1,
              rule: pattern.name,
              preview: line.trim(),
            });
          }
        }
      });
    }
  }
  return issues;
}

console.log('🔍 Checking for prohibited gradient classes and CSS in src/, frontend/, and backend/...');
const violations = [];
TARGET_DIRS.forEach((dir) => {
  scanDirectory(dir, violations);
});

if (violations.length > 0) {
  console.error('\n❌ GRADIENT CHECK FAILED: Found prohibited gradient usage in codebase!\n');
  violations.forEach((v) => {
    console.error(`  - ${v.file}:${v.line} [${v.rule}]`);
    console.error(`    "${v.preview}"\n`);
  });
  console.error('AGENTS.md Rule §4: "No gradients. Solid colors only."');
  process.exit(1);
} else {
  console.log('✅ PASS: Zero gradients detected (100% flat solid design compliant).');
  process.exit(0);
}
