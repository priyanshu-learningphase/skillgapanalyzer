import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeNext } from '../src/lib/redirect.js';

test('keeps in-app paths, including query and hash', () => {
  assert.equal(safeNext('/gap'), '/gap');
  assert.equal(safeNext('/onboarding?role=frontend-developer'), '/onboarding?role=frontend-developer');
  assert.equal(safeNext('/jobs?q=data analyst#top'), '/jobs?q=data analyst#top');
});

test('falls back for missing or non-path values', () => {
  assert.equal(safeNext(null), '/dashboard');
  assert.equal(safeNext(undefined, '/onboarding'), '/onboarding');
  assert.equal(safeNext(''), '/dashboard');
  assert.equal(safeNext('gap'), '/dashboard');
  assert.equal(safeNext(42), '/dashboard');
});

test('rejects links that leave the site', () => {
  for (const value of [
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/\\/evil.example',
    '/\t/evil.example',
    '/\n/evil.example',
    '/\r/evil.example',
    'javascript:alert(1)',
  ]) {
    assert.equal(safeNext(value), '/dashboard', JSON.stringify(value));
  }
});

test('an encoded backslash is caught once the query string is decoded', () => {
  const next = new URLSearchParams('next=%2F%5Cevil.example').get('next');
  assert.equal(safeNext(next), '/dashboard');
});
