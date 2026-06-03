import { z } from 'zod';

const senderBase = z.object({
  from: z.string().email().optional(),
  to: z.union([z.string(), z.array(z.string())]),
  subject_prefix: z.string().optional(),
});

const senderSchema = z.discriminatedUnion('type', [
  senderBase.extend({
    type: z.literal('mailgun'),
    region: z.enum(['us', 'eu']).default('us'),
  }),
  senderBase.extend({ type: z.literal('resend') }),
  senderBase.extend({ type: z.literal('sendgrid') }),
  senderBase.extend({ type: z.literal('smtp') }),
  senderBase.extend({ type: z.literal('slack-webhook') }).omit({ from: true }),
]);

const sourceSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('ga4'),
    property_id: z.string().min(1),
    hostname_regex: z.string().optional(),
  }),
  z.object({
    type: z.literal('openpanel'),
    project_id: z.string().min(1).optional(),
    client_id: z.string().optional(),
    api_url: z.string().url().optional(),
    hostname_regex: z.string().optional(),
    endpoints: z
      .object({
        metrics: z.string().optional(),
        charts: z.string().optional(),
        events: z.string().optional(),
      })
      .optional(),
    range_map: z
      .object({
        '1h': z.string().optional(),
        '24h': z.string().optional(),
        '48h': z.string().optional(),
        '72h': z.string().optional(),
        '7d': z.string().optional(),
        '30d': z.string().optional(),
      })
      .optional(),
    skip_charts: z.boolean().optional(),
    charts_from_events: z.boolean().optional(),
    skip_insights: z.boolean().optional(),
    chart_event: z.string().optional(),
    pageview_event: z.string().optional(),
    events_max_pages: z.number().int().positive().optional(),
  }),
]);

const legacyGa4 = z.object({
  property_id: z.string().min(1),
  hostname_regex: z.string().optional(),
});

const reportSchema = z
  .object({
    sections: z.array(z.enum(['headlines', 'usage', 'system', 'followups'])).optional(),
    deadline: z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        label: z.string().optional(),
      })
      .optional(),
    bot_signature_threshold: z.number().min(0).max(1).optional(),
    conversion_events: z.array(z.string()).optional(),
    funnel_events: z.array(z.string()).optional(),
  })
  .optional();

export const configSchema = z
  .object({
    source: sourceSchema.optional(),
    ga4: legacyGa4.optional(),
    window: z.enum(['1h', '24h', '48h', '72h', '7d', '30d']).default('24h'),
    timezone: z.string().default('UTC'),
    subject_property_label: z.string().optional(),
    report: reportSchema,
    sender: senderSchema,
  })
  .refine((cfg) => cfg.source || cfg.ga4, {
    message: 'Either `source` (typed) or legacy `ga4` block is required.',
    path: ['source'],
  })
  .transform((cfg) => {
    // Back-compat: if user provided legacy `ga4` block but no `source`, materialize a ga4 source.
    if (!cfg.source && cfg.ga4) {
      cfg.source = { type: 'ga4', property_id: cfg.ga4.property_id, hostname_regex: cfg.ga4.hostname_regex };
    }
    return cfg;
  });

export function rejectSecretsInConfig(raw) {
  const forbidden = new Set(['api_key', 'apikey', 'password', 'token', 'secret', 'client_secret']);
  walk(raw, '');
  function walk(node, path) {
    if (node && typeof node === 'object' && !Array.isArray(node)) {
      for (const [k, v] of Object.entries(node)) {
        if (forbidden.has(k.toLowerCase())) {
          throw new Error(
            `pulse.config.yaml: refusing to read secret-looking key '${path}${k}'. Move it to an env var / GitHub secret.`,
          );
        }
        walk(v, `${path}${k}.`);
      }
    }
  }
}
