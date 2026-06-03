import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../src/compose/markdown.mjs';
import { renderHtml } from '../src/compose/html.mjs';

const data = {
  totals: { sessions: 5, users: 4, pageviews: 9, conversions: 0 },
  pages: [{ path: '/', pageviews: 9, users: 4 }],
  traffic: [],
  eventMap: { screen_view: { count: 9 }, link_out: { count: 2 }, page_view: { count: 0 } },
};

test('markdown uses default funnel events when config is absent', () => {
  const config = { report: { sections: ['usage'] } };
  const output = renderMarkdown(data, config, 'Pulse');

  assert.match(output, /page_view=0/);
  assert.match(output, /cta_click=0/);
});

test('markdown uses configured funnel events', () => {
  const config = { report: { sections: ['usage'], funnel_events: ['screen_view', 'link_out'] } };
  const output = renderMarkdown(data, config, 'Pulse');

  assert.match(output, /screen_view=9 · link_out=2/);
  assert.doesNotMatch(output, /cta_click/);
});

test('html uses configured funnel events', () => {
  const config = { report: { sections: ['usage'], funnel_events: ['screen_view', 'link_out'] } };
  const output = renderHtml(data, config, 'Pulse');

  assert.match(output, /screen_view=9/);
  assert.match(output, /link_out=2/);
});
