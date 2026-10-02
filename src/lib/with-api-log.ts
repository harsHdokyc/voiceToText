import { describeError } from '@/lib/api-error';
import { logger, type LogFields } from '@/lib/logger';

/**
 * Log start → ok/fail for one API/backend operation with duration + error code/reason.
 */
export async function withApiLog<T>(
  scope: string,
  fields: LogFields,
  fn: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  logger.info(scope, { event: 'start', ...fields });
  try {
    const result = await fn();
    logger.info(scope, {
      event: 'ok',
      ...fields,
      durationMs: Date.now() - started,
    });
    return result;
  } catch (error) {
    const { code, reason } = describeError(error);
    logger.error(scope, {
      event: 'fail',
      code,
      reason,
      ...fields,
      durationMs: Date.now() - started,
    });
    throw error;
  }
}
