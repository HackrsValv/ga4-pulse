import { mkdir, copyFile, access } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_ROOT = resolve(__dirname, '../../../../template');

const FILES = [
  { src: '.github/workflows/pulse-email.yml', dest: '.github/workflows/pulse-email.yml' },
  { src: 'pulse.config.example.yaml', dest: 'pulse.config.yaml' },
  { src: 'README.md', dest: 'docs/ga4-pulse-setup.md' },
];

export async function setupCommand({ force }) {
  const cwd = process.cwd();
  console.log(`Scaffolding ga4-pulse into ${cwd}`);

  for (const file of FILES) {
    const src = join(TEMPLATE_ROOT, file.src);
    const dest = join(cwd, file.dest);
    const exists = await fileExists(dest);
    if (exists && !force) {
      console.log(`  skip ${file.dest} (exists; pass --force to overwrite)`);
      continue;
    }
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(src, dest);
    console.log(`  wrote ${file.dest}`);
  }

  console.log('');
  console.log('Next steps:');
  console.log('  1. Edit pulse.config.yaml — set property_id, hostname_regex, sender, recipients.');
  console.log('  2. Run `ga4-pulse auth` to mint a refresh token.');
  console.log('  3. Add GitHub secrets (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, plus sender secrets).');
  console.log('  4. `gh workflow run pulse-email.yml -f dry_run=true` to smoke-test.');
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
