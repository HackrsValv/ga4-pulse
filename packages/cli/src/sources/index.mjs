import * as ga4 from './ga4/index.mjs';
import * as openpanel from './openpanel/index.mjs';

export const sources = {
  ga4,
  openpanel,
};

export function resolveSource(config) {
  const type = config.source?.type || 'ga4';
  const source = sources[type];
  if (!source) {
    throw new Error(`Unknown analytics source '${type}'. Choose: ${Object.keys(sources).join(', ')}`);
  }
  return { type, runReports: source.runReports, aggregate: source.aggregate };
}
