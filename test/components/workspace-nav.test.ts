import { describe, expect, it } from 'vitest';
import {
  hrefForWorkspaceNav,
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
