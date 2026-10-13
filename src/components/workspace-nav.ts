export const WORKSPACE_NAV = [
  'Overview',
  'Voice notes',
  'Suggestions',
  'Tasks',
] as const;

export type WorkspaceNavItem = (typeof WORKSPACE_NAV)[number];
export type WorkspaceSection = WorkspaceNavItem | 'Settings' | 'Capture';

/** Map Expo Router pathname → workspace section label for header/nav chrome. */
export function workspaceSectionFromPath(pathname: string): WorkspaceSection {
  const path = pathname.toLowerCase();
  if (path.includes('/record')) return 'Capture';
  if (path.includes('/settings')) return 'Settings';
  if (path.includes('/suggestions')) return 'Suggestions';
  if (path.includes('/tasks')) return 'Tasks';
  if (path.includes('/notes')) return 'Voice notes';
  return 'Overview';
}

export function hrefForWorkspaceNav(item: WorkspaceNavItem): string {
  switch (item) {
    case 'Overview':
      return '/(app)';
    case 'Voice notes':
      return '/(app)/notes';
    case 'Suggestions':
      return '/(app)/suggestions';
    case 'Tasks':
      return '/(app)/tasks';
  }
}
