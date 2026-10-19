import { describe, expect, it } from 'vitest';

import { layout, space, workspacePageContentStyle } from '@/theme-tokens';

describe('workspacePageContentStyle', () => {
  it('uses mobile gutters matching prototype px-5 py-6', () => {
    expect(workspacePageContentStyle(false)).toMatchObject({
      maxWidth: layout.contentMaxWidth,
      paddingHorizontal: space[5],
      paddingTop: space[6],
      paddingBottom: space[10],
      alignSelf: 'center',
    });
  });

  it('uses desktop gutters matching prototype md:px-10 md:py-10', () => {
    expect(workspacePageContentStyle(true)).toMatchObject({
      paddingHorizontal: space[10],
      paddingTop: space[10],
      paddingBottom: space[10],
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

