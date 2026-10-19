import { describe, expect, it } from 'vitest';

import { cn } from '@/lib/cn';

describe('cn', () => {
  it('joins truthy class fragments', () => {
    expect(cn('flex-1', 'bg-paper', 'text-ink')).toBe('flex-1 bg-paper text-ink');
  });

  it('drops falsy fragments so conditionals stay clean', () => {
    expect(cn('base', false && 'hidden', null, undefined, 'end')).toBe(
      'base end',
    );
  });
});
