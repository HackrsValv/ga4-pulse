const WINDOWS = {
  '1h': { startDate: 'today', endDate: 'today', label: 'last hour' },
  '24h': { startDate: 'yesterday', endDate: 'yesterday' },
  '48h': { startDate: '2daysAgo', endDate: 'yesterday' },
  '72h': { startDate: '3daysAgo', endDate: 'yesterday' },
  '7d': { startDate: '7daysAgo', endDate: 'yesterday' },
  '30d': { startDate: '30daysAgo', endDate: 'yesterday' },
};

export function windowToDateRange(window, timezone) {
  const base = WINDOWS[window];
  if (!base) {
    throw new Error(`Unknown window '${window}'. Choose: ${Object.keys(WINDOWS).join(', ')}`);
  }
  const label = base.label || labelForRange(base, timezone);
  return { startDate: base.startDate, endDate: base.endDate, label };
}

function labelForRange(range, timezone) {
  if (range.startDate === 'yesterday' && range.endDate === 'yesterday') {
    return yesterdayLabel(timezone);
  }
  return `${range.startDate} → ${range.endDate}`;
}

export function yesterdayLabel(timezone) {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return formatDate(yesterday, timezone);
}

export function formatDate(date, timezone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
