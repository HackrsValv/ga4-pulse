import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import yaml from 'js-yaml';
import { configSchema, rejectSecretsInConfig } from './schema.mjs';

const DEFAULT_PATHS = ['pulse.config.yaml', 'pulse.config.yml'];

export async function loadConfig(explicitPath) {
  const path = explicitPath ? resolve(process.cwd(), explicitPath) : await resolveDefault();
  const raw = await readFile(path, 'utf8');
  const parsed = yaml.load(raw);
  rejectSecretsInConfig(parsed);
  const merged = applyEnvOverrides(parsed);
  return configSchema.parse(merged);
}

async function resolveDefault() {
  for (const p of DEFAULT_PATHS) {
    try {
      const full = resolve(process.cwd(), p);
      await readFile(full, 'utf8');
      return full;
    } catch {
      // try next
    }
  }
  throw new Error(`No pulse.config.yaml found in ${process.cwd()}. Run \`ga4-pulse setup\` to scaffold one.`);
}

function applyEnvOverrides(cfg) {
  const out = { ...cfg };
  if (process.env.GA4_PROPERTY_ID) {
    out.ga4 = { ...out.ga4, property_id: process.env.GA4_PROPERTY_ID };
  }
  if (process.env.PULSE_WINDOW) out.window = process.env.PULSE_WINDOW;
  if (process.env.PULSE_TIMEZONE) out.timezone = process.env.PULSE_TIMEZONE;
  if (process.env.PULSE_TO && out.sender) {
    out.sender = { ...out.sender, to: process.env.PULSE_TO };
  }
  if (process.env.PULSE_FROM && out.sender) {
    out.sender = { ...out.sender, from: process.env.PULSE_FROM };
  }
  return out;
}
