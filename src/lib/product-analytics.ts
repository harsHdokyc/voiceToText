/**
 * Content-free product analytics (PRD). Never pass transcript/audio/prompts.
 * Persists only as structured [vtw] logs for now (no content table).
 */
import { logger } from '@/lib/logger';

export const PRODUCT_EVENTS = [
  'recording_started',
  'recording_completed',
  'upload_succeeded',
  'upload_failed',
  'transcription_succeeded',
  'transcription_failed',
  'extraction_succeeded',
  'extraction_failed',
  'suggestion_approved',
  'suggestion_rejected',
  'task_completed',
  'reminder_created',
] as const;

export type ProductEvent = (typeof PRODUCT_EVENTS)[number];

const FORBIDDEN = new Set([
  'transcript',
  'edited_transcript',
  'audio',
  'prompt',
  'password',
  'token',
  'authorization',
]);

export function assertSafeAnalyticsFields(fields: Record<string, unknown>) {
  for (const key of Object.keys(fields)) {
    if (FORBIDDEN.has(key.toLowerCase())) {
      throw new Error(`Analytics field forbidden: ${key}`);
    }
  }
}

export function trackProductEvent(
  event: ProductEvent,
  fields: Record<string, unknown> = {},
) {
  assertSafeAnalyticsFields(fields);
  logger.info('analytics.product', { event, ...fields });
}
