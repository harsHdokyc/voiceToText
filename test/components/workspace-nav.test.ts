import { describe, expect, it } from 'vitest';
import {
  hrefForWorkspaceNav,
  WORKSPACE_NAV_GAP,
  WORKSPACE_NAV_ITEM_H,
  workspaceNavIndex,
  workspaceNavPillOffset,
  workspaceSectionFromPath,
} from '@/components/workspace-nav';

describe('workspaceSectionFromPath', () => {
  it('maps primary destinations', () => {
    expect(workspaceSectionFromPath('/')).toBe('Overview');
    expect(workspaceSectionFromPath('/(app)')).toBe('Overview');
    expect(workspaceSectionFromPath('/(app)/notes')).toBe('Voice notes');
    expect(workspaceSectionFromPath('/(app)/notes/abc')).toBe('Voice notes');
    expect(workspaceSectionFromPath('/(app)/suggestions')).toBe('Suggestions');
    expect(workspaceSectionFromPath('/(app)/tasks')).toBe('Tasks');
    expect(workspaceSectionFromPath('/(app)/tasks/xyz')).toBe('Tasks');
    expect(workspaceSectionFromPath('/(app)/settings')).toBe('Settings');
    expect(workspaceSectionFromPath('/(app)/record')).toBe('Capture');
  });
});

describe('hrefForWorkspaceNav', () => {
  it('returns routes for each nav item', () => {
    expect(hrefForWorkspaceNav('Overview')).toBe('/(app)');
    expect(hrefForWorkspaceNav('Voice notes')).toBe('/(app)/notes');
    expect(hrefForWorkspaceNav('Suggestions')).toBe('/(app)/suggestions');
    expect(hrefForWorkspaceNav('Tasks')).toBe('/(app)/tasks');
  });
});

describe('workspaceNavIndex', () => {
  it('returns nav slot or -1 for chrome-only sections', () => {
    expect(workspaceNavIndex('Overview')).toBe(0);
    expect(workspaceNavIndex('Tasks')).toBe(3);
    expect(workspaceNavIndex('Settings')).toBe(-1);
    expect(workspaceNavIndex('Capture')).toBe(-1);
  });
});

describe('workspaceNavPillOffset', () => {
  it('stacks rows by fixed height + gap', () => {
    expect(workspaceNavPillOffset(0)).toBe(0);
    expect(workspaceNavPillOffset(1)).toBe(WORKSPACE_NAV_ITEM_H + WORKSPACE_NAV_GAP);
    expect(workspaceNavPillOffset(2)).toBe(2 * (WORKSPACE_NAV_ITEM_H + WORKSPACE_NAV_GAP));
    expect(workspaceNavPillOffset(-1)).toBe(0);
  });
});
