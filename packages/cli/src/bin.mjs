#!/usr/bin/env node
import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { authCommand } from './commands/auth.mjs';
import { sendCommand } from './commands/send.mjs';
import { setupCommand } from './commands/setup.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(await readFile(resolve(__dirname, '../package.json'), 'utf8'));

const program = new Command();
program
  .name('ga4-pulse')
  .description('Daily GA4 pulse digests, delivered.')
  .version(pkg.version);

program
  .command('auth')
  .description('One-time OAuth flow: produces a refresh token for GA4 read access')
  .option('--client-id <id>', 'OAuth client ID (or env GA4_OAUTH_CLIENT_ID)')
  .option('--client-secret <secret>', 'OAuth client secret (or env GA4_OAUTH_CLIENT_SECRET)')
  .option('--client-secret-file <path>', 'Path to downloaded client_secret.json')
  .option('--no-browser', 'Print URL instead of opening browser')
  .action(authCommand);

program
  .command('send')
  .description('Query GA4, render the pulse, and send via configured sender')
  .option('-c, --config <path>', 'Path to pulse.config.yaml (default: ./pulse.config.yaml)')
  .action((opts) => sendCommand({ ...opts, dryRun: false }));

program
  .command('dry-run')
  .description('Same as `send` but writes ./pulse-report.{html,md} instead of sending')
  .option('-c, --config <path>', 'Path to pulse.config.yaml (default: ./pulse.config.yaml)')
  .action((opts) => sendCommand({ ...opts, dryRun: true }));

program
  .command('setup')
  .description('Scaffold workflow + pulse.config.yaml into the current directory')
  .option('--force', 'Overwrite existing files')
  .action(setupCommand);

program.parseAsync(process.argv).catch((err) => {
  console.error(`ga4-pulse: ${err.message}`);
  if (process.env.GA4_PULSE_DEBUG) console.error(err.stack);
  process.exit(1);
});
