import { describe, expect, it } from 'vitest';

import { WORKSPACE_REFRESH } from '@/lib/query-client';

describe('WORKSPACE_REFRESH', () => {
  it('scopes suggestion decisions to suggestions, tasks, and reminders', () => {
    expect([...WORKSPACE_REFRESH.suggestionDecided]).toEqual([
      'suggestions',
      'tasks',
      'reminders',
    ]);
  });

  it('scopes task edits to tasks and reminders only', () => {
    expect([...WORKSPACE_REFRESH.taskChanged]).toEqual(['tasks', 'reminders']);
  });

  it('scopes note delete without refreshing reminders', () => {
    expect([...WORKSPACE_REFRESH.noteDeleted]).toEqual([
      'notes',
      'suggestions',
      'tasks',
    ]);
  });

  it('scopes reminder cancel to reminders only', () => {
    expect([...WORKSPACE_REFRESH.reminderChanged]).toEqual(['reminders']);
  });

  it('scopes capture and processing to notes + suggestions', () => {
    expect([...WORKSPACE_REFRESH.captureCompleted]).toEqual([
      'notes',
      'suggestions',
    ]);
    expect([...WORKSPACE_REFRESH.noteProcessing]).toEqual([
      'notes',
      'suggestions',
    ]);
  });
});
