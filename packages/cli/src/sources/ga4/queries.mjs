import { buildAnalyticsDataClient } from './auth.mjs';
import { windowToDateRange } from '../../util/date.mjs';

export async function runReports(config) {
  const client = buildAnalyticsDataClient();
  const source = config.source;
  const property = `properties/${source.property_id}`;
  const dateRange = windowToDateRange(config.window, config.timezone);

  const dimensionFilter = source.hostname_regex
    ? {
        filter: {
          fieldName: 'hostName',
          stringFilter: {
            matchType: 'PARTIAL_REGEXP',
            value: source.hostname_regex,
          },
        },
      }
    : undefined;

  const requests = [
    {
      property,
      dateRanges: [dateRange],
      dimensions: [{ name: 'hostName' }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'engagedSessions' },
        { name: 'userEngagementDuration' },
        { name: 'bounceRate' },
        { name: 'keyEvents' },
      ],
      dimensionFilter,
    },
    {
      property,
      dateRanges: [dateRange],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
      dimensionFilter,
      limit: 50,
    },
    {
      property,
      dateRanges: [dateRange],
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
        { name: 'userEngagementDuration' },
      ],
      dimensionFilter,
      limit: 15,
    },
    {
      property,
      dateRanges: [dateRange],
      dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
      metrics: [{ name: 'sessions' }, { name: 'engagedSessions' }, { name: 'keyEvents' }],
      dimensionFilter,
      limit: 15,
    },
  ];

  const [overall, events, pages, traffic] = await Promise.all(
    requests.map((req) =>
      client.properties
        .runReport({ property, requestBody: req })
        .then((res) => res.data),
    ),
  );

  return { overall, events, pages, traffic, dateRange };
}
