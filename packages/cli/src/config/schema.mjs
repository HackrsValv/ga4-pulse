import { z } from 'zod';

const senderBase = z.object({
  from: z.string().email().optional(),
  to: z.union([z.string(), z.array(z.string())]),
  subject_prefix: z.string().optional(),
});

export const configSchema = z.object({
  ga4: z.object({
    property_id: z.string().min(1),
    hostname_regex: z.string().optional(),
  }),
  window: z.enum(['1h', '24h', '48h', '72h', '7d', '30d']).default('24h'),
  timezone: z.string().default('UTC'),
  subject_property_label: z.string().optional(),
  report: z
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
    })
    .optional(),
  sender: z.discriminatedUnion('type', [
    senderBase.extend({
      type: z.literal('mailgun'),
      region: z.enum(['us', 'eu']).default('us'),
    }),
    senderBase.extend({ type: z.literal('resend') }),
    senderBase.extend({ type: z.literal('sendgrid') }),
    senderBase.extend({ type: z.literal('smtp') }),
    senderBase.extend({ type: z.literal('slack-webhook') }).omit({ from: true }),
  ]),
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
