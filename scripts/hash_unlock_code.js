#!/usr/bin/env node
/**
 * Hashes a one-time unlock code so it can be stored safely inside
 * docs/license-keys.js. Usage:
 *
 *   node scripts/hash_unlock_code.js "YOUR-CODE-HERE"
 */

const { createHash } = require('crypto');

const SALT = 'cert-study-suite::license-v1';
const [, , rawInput] = process.argv;

if (!rawInput) {
  console.error('Usage: node scripts/hash_unlock_code.js "YOUR-CODE-HERE"');
  process.exit(1);
}

const normalized = rawInput.trim().toLowerCase();
if (!normalized) {
  console.error('Unlock code cannot be empty.');
  process.exit(1);
}

const digest = createHash('sha256')
  .update(`${normalized}::${SALT}`)
  .digest('hex');

console.log(digest);
