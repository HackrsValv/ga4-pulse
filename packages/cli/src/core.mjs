import { loadConfig } from './config/load.mjs';
import { runReports } from './ga4/queries.mjs';
import { aggregate } from './ga4/aggregate.mjs';
import { renderHtml } from './compose/html.mjs';
import { renderMarkdown } from './compose/markdown.mjs';
import { buildSubject } from './compose/subject.mjs';
import { senders } from './senders/index.mjs';

export async function runPulse({ configPath, dryRun = false } = {}) {
  const config = await loadConfig(configPath);
  const reports = await runReports(config);
  const data = aggregate(reports, config);
  const subject = buildSubject(config, data);
  const html = renderHtml(data, config, subject);
  const markdown = renderMarkdown(data, config, subject);
  if (dryRun) return { config, data, subject, html, markdown };

  const sender = senders[config.sender.type];
  if (!sender) throw new Error(`Unknown sender '${config.sender.type}'`);
  const result = await sender.send({
    subject,
    html,
    markdown,
    from: config.sender.from,
    to: config.sender.to,
    config: config.sender,
  });
  return { config, data, subject, html, markdown, result };
}
