import { test } from 'node:test';
import assert from 'node:assert';
import { escapeHtml } from '../src/util/html-escape.mjs';

test('escapes HTML metacharacters', () => {
  assert.equal(escapeHtml('<a href="x">&y</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;y&lt;/a&gt;');
});

test('handles null and undefined', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
});
