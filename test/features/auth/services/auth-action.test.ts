import { describe, expect, it } from 'vitest';

import { settleAuthAction } from '@/features/auth/services/auth-action';

describe('settleAuthAction', () => {
  it('returns null message on success when no success copy is given', async () => {
    const result = await settleAuthAction(async () => undefined);
    expect(result).toEqual({ message: null });
  });

  it('returns the success message when the action completes', async () => {
    const result = await settleAuthAction(async () => undefined, 'Code sent');
    expect(result).toEqual({ message: 'Code sent' });
  });

  it('maps thrown Errors to message and does not rethrow', async () => {
    const result = await settleAuthAction(async () => {
      throw new Error('Invalid login');
    });
    expect(result).toEqual({ message: 'Invalid login' });
  });

  it('surfaces string throws as the reason', async () => {
    const result = await settleAuthAction(async () => {
      throw 'nope';
    });
    expect(result).toEqual({ message: 'nope' });
  });

  it('uses the default fallback for empty unknown throws', async () => {
    const result = await settleAuthAction(async () => {
      throw null;
    });
    expect(result).toEqual({ message: 'Something went wrong' });
  });
});
