import { describe, expect, it } from 'vitest';

import {
  layout,
  space,
  workspacePageContentClassName,
  workspacePageContentStyle,
} from '@/theme-tokens';

describe('workspacePageContentClassName', () => {
  it('uses mobile gutters matching prototype px-5 py-6', () => {
    expect(workspacePageContentClassName(false)).toBe(
      'w-full max-w-content self-center px-page-x pt-page-y pb-10',
    );
  });

  it('uses desktop gutters matching prototype md:px-10 md:py-10', () => {
    expect(workspacePageContentClassName(true)).toBe(
      'w-full max-w-content self-center px-page-x-desktop pt-page-y-desktop pb-10',
    );
  });
});

describe('workspacePageContentStyle', () => {
  it('keeps numeric gutters for style overrides', () => {
    expect(workspacePageContentStyle(false)).toMatchObject({
      maxWidth: layout.contentMaxWidth,
      paddingHorizontal: space[5],
      paddingTop: space[6],
      paddingBottom: space[10],
      alignSelf: 'center',
    });
  });

  it('applies optional gap and maxWidth overrides', () => {
    expect(
      workspacePageContentStyle(true, { gap: 12, maxWidth: 560 }),
    ).toMatchObject({
      paddingHorizontal: space[10],
      gap: 12,
      maxWidth: 560,
    });
  });
});
