import { escapeHtml } from '../util/html-escape.mjs';

export function renderHtml(data, config, subject) {
  const sections = config.report?.sections || ['headlines', 'usage', 'system', 'followups'];
  const parts = [];

  parts.push(`<!doctype html><html><body style="font-family:system-ui,sans-serif;max-width:680px;margin:0 auto">`);
  parts.push(`<h1 style="font-size:20px">${escapeHtml(subject)}</h1>`);

  if (sections.includes('headlines')) parts.push(renderHeadlines(data));
  if (sections.includes('usage')) parts.push(renderUsage(data));
  if (sections.includes('system')) parts.push(renderSystem());
  if (sections.includes('followups')) parts.push(renderFollowups(data, config));

  parts.push(`</body></html>`);
  return parts.join('\n');
}

function renderHeadlines(data) {
  const { sessions, users, pageviews, conversions } = data.totals;
  const topPage = data.pages[0];
  return `
<h2>Headlines</h2>
<ul>
  <li><strong>${sessions}</strong> sessions, <strong>${users}</strong> active users, <strong>${pageviews}</strong> pageviews</li>
  ${topPage ? `<li>Top page: <code>${escapeHtml(topPage.path)}</code> — ${topPage.pageviews} pageviews</li>` : ''}
  <li><strong>${conversions}</strong> conversion events</li>
</ul>`.trim();
}

function renderUsage(data) {
  if (data.totals.sessions === 0) {
    return '<h2>Usage</h2><p>No data for window.</p>';
  }
  const pages = data.pages
    .slice(0, 10)
    .map((p) => `  ${pad(p.pageviews, 5)}  ${pad(p.users, 4)}  ${escapeHtml(p.path)}`)
    .join('\n');
  const traffic = data.traffic
    .slice(0, 10)
    .map(
      (t) =>
        `  ${pad(t.sessions, 5)}  ${pad(t.engagedSessions, 5)}  ${escapeHtml(t.source)} / ${escapeHtml(t.medium)}`,
    )
    .join('\n');
  const funnel = ['page_view', 'cta_click', 'form_start', 'form_field_error']
    .map((name) => `${name}=${data.eventMap[name]?.count || 0}`)
    .join(' · ');
  return `
<h2>Usage</h2>
<p><strong>Pages</strong> (top 10 by pageviews)</p>
<pre style="background:#f6f8fa;padding:8px;font-size:12px;line-height:1.4">
   PV  Users  Path
${pages}
</pre>
<p><strong>Traffic</strong> (top 10 by sessions)</p>
<pre style="background:#f6f8fa;padding:8px;font-size:12px;line-height:1.4">
   S    Eng  Source / Medium
${traffic}
</pre>
<p><strong>Event funnel</strong>: ${escapeHtml(funnel)}</p>`.trim();
}

function renderSystem() {
  return '<h2>System performance</h2><p>Static marketing site — no application errors to query.</p>';
}

function renderFollowups(data, config) {
  const items = [];
  if (data.totals.keyEvents === 0 && data.events.length > 0) {
    items.push('keyEvents is 0 — GA4 Admin → Events → toggle "Mark as key event" on your conversion events.');
  }
  const direct = data.traffic.find((t) => t.source === '(direct)' && t.medium === '(none)');
  const threshold = config.report?.bot_signature_threshold ?? 0.6;
  if (direct && data.totals.sessions > 0 && direct.sessions / data.totals.sessions > threshold) {
    items.push(
      `(direct)/(none) = ${Math.round((direct.sessions / data.totals.sessions) * 100)}% of sessions — suspect bot traffic; drill with browser + OS dimensions.`,
    );
  }
  if (config.report?.deadline) {
    const deadline = config.report.deadline;
    const daysLeft = daysUntil(deadline.date);
    items.push(`<strong>${escapeHtml(deadline.label || 'Deadline')}</strong>: ${daysLeft} days remaining (${escapeHtml(deadline.date)}).`);
  }
  for (const w of data.warnings || []) {
    items.push(`<strong>Warning</strong>: ${escapeHtml(w)}`);
  }
  if (items.length === 0) items.push('No automatic flags this window.');
  return `<h2>Followups</h2><ol>${items.map((i) => `<li>${i}</li>`).join('')}</ol>`;
}

function pad(value, width) {
  return String(value).padStart(width, ' ');
}

function daysUntil(isoDate) {
  const now = Date.now();
  const target = Date.parse(`${isoDate}T00:00:00Z`);
  return Math.ceil((target - now) / 86400000);
}
