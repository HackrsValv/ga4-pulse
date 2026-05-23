import { yesterdayLabel } from '../util/date.mjs';

export function buildSubject(config, data) {
  const prefix = config.sender?.subject_prefix || '';
  const source = config.source || {};
  const hostHint = source.hostname_regex || config.ga4?.hostname_regex;
  const idHint =
    source.type === 'openpanel'
      ? `project ${source.project_id}`
      : `property ${source.property_id || config.ga4?.property_id || ''}`;
  const property = config.subject_property_label || hostHint || idHint;
  const dateLabel = data.window.label || yesterdayLabel(config.timezone);
  const window = config.window;
  return `${prefix}${prefix ? ' ' : ''}${stripRegexSuffix(property)} pulse — ${dateLabel} (${window})`;
}

function stripRegexSuffix(value) {
  return String(value).replace(/\\\./g, '.').replace(/\$$/, '');
}
