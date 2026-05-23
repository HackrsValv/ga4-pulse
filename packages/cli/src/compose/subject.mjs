import { yesterdayLabel } from '../util/date.mjs';

export function buildSubject(config, data) {
  const prefix = config.sender?.subject_prefix || '';
  const property = config.subject_property_label || config.ga4?.hostname_regex || `property ${config.ga4.property_id}`;
  const dateLabel = data.window.label || yesterdayLabel(config.timezone);
  const window = config.window;
  return `${prefix}${prefix ? ' ' : ''}${stripRegexSuffix(property)} pulse — ${dateLabel} (${window})`;
}

function stripRegexSuffix(value) {
  return String(value).replace(/\\\./g, '.').replace(/\$$/, '');
}
