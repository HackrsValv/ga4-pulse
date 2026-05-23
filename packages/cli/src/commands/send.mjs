import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadConfig } from '../config/load.mjs';
import { resolveSource } from '../sources/index.mjs';
import { renderHtml } from '../compose/html.mjs';
import { renderMarkdown } from '../compose/markdown.mjs';
import { buildSubject } from '../compose/subject.mjs';
import { senders } from '../senders/index.mjs';

export async function sendCommand({ config: configPath, dryRun }) {
  const config = await loadConfig(configPath);

  const source = resolveSource(config);
  const reports = await source.runReports(config);
  const data = source.aggregate(reports, config);

  const subject = buildSubject(config, data);
  const html = renderHtml(data, config, subject);
  const markdown = renderMarkdown(data, config, subject);

  if (dryRun) {
    const htmlPath = resolve(process.cwd(), 'pulse-report.html');
    const mdPath = resolve(process.cwd(), 'pulse-report.md');
    await writeFile(htmlPath, html, 'utf8');
    await writeFile(mdPath, markdown, 'utf8');
    console.log(
      `Wrote dry-run pulse ${htmlPath} (source=${source.type}, sessions=${data.totals.sessions}, users=${data.totals.users}, conversions=${data.totals.conversions})`,
    );
    return;
  }

  const senderName = config.sender.type;
  const sender = senders[senderName];
  if (!sender) {
    throw new Error(`Unknown sender '${senderName}'. Choose one of: ${Object.keys(senders).join(', ')}`);
  }

  const result = await sender.send({
    subject,
    html,
    markdown,
    from: config.sender.from,
    to: config.sender.to,
    config: config.sender,
  });

  console.log(
    `Sent pulse for ${data.window.label} (source=${source.type}, sessions=${data.totals.sessions}, users=${data.totals.users}, conversions=${data.totals.conversions}) → ${formatRecipient(config.sender.to)}${result?.id ? ` [${result.id}]` : ''}`,
  );
}

function formatRecipient(to) {
  return Array.isArray(to) ? to.join(', ') : to;
}
