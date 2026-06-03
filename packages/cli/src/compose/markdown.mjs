export function renderMarkdown(data, config, subject) {
  const sections = config.report?.sections || ['headlines', 'usage', 'system', 'followups'];
  const parts = [`# ${subject}`, ''];

  if (sections.includes('headlines')) {
    parts.push('## Headlines');
    parts.push(`- **${data.totals.sessions}** sessions, **${data.totals.users}** users, **${data.totals.pageviews}** pageviews`);
    const top = data.pages[0];
    if (top) parts.push(`- Top page: \`${top.path}\` — ${top.pageviews} pageviews`);
    parts.push(`- **${data.totals.conversions}** conversion events`);
    parts.push('');
  }

  if (sections.includes('usage')) {
    parts.push('## Usage');
    if (data.totals.sessions === 0) {
      parts.push('No data for window.');
    } else {
      parts.push('### Pages (top 10)');
      parts.push('| Path | PV | Users |');
      parts.push('|---|---|---|');
      for (const p of data.pages.slice(0, 10)) {
        parts.push(`| \`${p.path}\` | ${p.pageviews} | ${p.users} |`);
      }
      parts.push('');
      parts.push('### Traffic (top 10)');
      parts.push('| Source / Medium | Sessions | Engaged |');
      parts.push('|---|---|---|');
      for (const t of data.traffic.slice(0, 10)) {
        parts.push(`| ${t.source} / ${t.medium} | ${t.sessions} | ${t.engagedSessions} |`);
      }
      parts.push('');
      const funnel = (config.report?.funnel_events || ['page_view', 'cta_click', 'form_start', 'form_field_error'])
        .map((n) => `${n}=${data.eventMap[n]?.count || 0}`)
        .join(' · ');
      parts.push(`**Event funnel**: ${funnel}`);
    }
    parts.push('');
  }

  if (sections.includes('system')) {
    parts.push('## System performance');
    parts.push('Static marketing site — no application errors to query.');
    parts.push('');
  }

  if (sections.includes('followups')) {
    parts.push('## Followups');
    const items = collectFollowups(data, config);
    for (const item of items) parts.push(`- ${item}`);
    parts.push('');
  }

  return parts.join('\n');
}

function collectFollowups(data, config) {
  const items = [];
  const sourceType = config.source?.type || 'ga4';
  if (sourceType === 'ga4' && data.totals.keyEvents === 0 && data.events.length > 0) {
    items.push('keyEvents is 0 — flag conversion events in GA4 Admin.');
  }
  const direct = data.traffic.find((t) => t.source === '(direct)' && t.medium === '(none)');
  const threshold = config.report?.bot_signature_threshold ?? 0.6;
  if (direct && data.totals.sessions > 0 && direct.sessions / data.totals.sessions > threshold) {
    items.push(
      `(direct)/(none) = ${Math.round((direct.sessions / data.totals.sessions) * 100)}% — bot signature suspect.`,
    );
  }
  if (config.report?.deadline) {
    const days = daysUntil(config.report.deadline.date);
    items.push(`**${config.report.deadline.label || 'Deadline'}**: ${days} days remaining (${config.report.deadline.date}).`);
  }
  for (const w of data.warnings || []) {
    items.push(`**Warning**: ${w}`);
  }
  if (items.length === 0) items.push('No automatic flags this window.');
  return items;
}

function daysUntil(isoDate) {
  return Math.ceil((Date.parse(`${isoDate}T00:00:00Z`) - Date.now()) / 86400000);
}
