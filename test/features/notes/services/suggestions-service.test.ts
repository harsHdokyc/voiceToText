import {
    approveSuggestion,
    buildSuggestionEdits,
    getSuggestions,
    isPendingSuggestion,
    rejectSuggestion,
} from '@/features/notes/services/suggestions-service';
import { ApiError } from '@/lib/api-error';
import { supabase } from '@/lib/supabase';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('isPendingSuggestion', () => {
  it('is true only for pending', () => {
    expect(isPendingSuggestion('pending')).toBe(true);
    expect(isPendingSuggestion('approved')).toBe(false);
    expect(isPendingSuggestion('rejected')).toBe(false);
  });
});

describe('buildSuggestionEdits', () => {
  it('returns undefined when draft matches original', () => {
    expect(
      buildSuggestionEdits(
        { title: 'Buy milk', details: null },
        { title: 'Buy milk', details: '' },
      ),
    ).toBeUndefined();
  });

  it('includes only changed fields', () => {
    expect(
      buildSuggestionEdits(
        { title: 'Buy milk', details: '2%' },
        { title: 'Get milk', details: '2%' },
      ),
    ).toEqual({ title: 'Get milk' });

    expect(
      buildSuggestionEdits(
        { title: 'Buy milk', details: '2%' },
        { title: 'Buy milk', details: '' },
      ),
    ).toEqual({ details: '' });
  });

  it('rejects blank titles', () => {
    expect(() =>
      buildSuggestionEdits(
        { title: 'Buy milk', details: null },
        { title: '   ', details: '' },
      ),
    ).toThrow(ApiError);
  });
});

describe('suggestions-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSuggestions', () => {
    it('returns suggestions for a note', async () => {
      const mockSuggestions = [
        {
          id: 's1',
          note_id: 'n1',
          title: 'Buy milk',
          details: null,
          kind: 'task',
          due_at: null,
          priority: null,
          source_quote: 'Buy milk',
          confidence: 'high',
          status: 'pending',
          created_task_id: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockSuggestions,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as never);
      mockSelect.mockReturnValue({
        eq: mockEq,
      } as never);
      mockEq.mockReturnValue({
        order: mockOrder,
      } as never);

      const result = await getSuggestions('n1');

      expect(result).toEqual(mockSuggestions);
      expect(supabase.from).toHaveBeenCalledWith('task_suggestions');
      expect(mockSelect).toHaveBeenCalledWith(
        'id, note_id, title, details, kind, due_at, priority, source_quote, confidence, status, created_task_id, created_at, updated_at',
      );
      expect(mockEq).toHaveBeenCalledWith('note_id', 'n1');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: true });
    });

    it('throws on database error', async () => {
      const mockError = new Error('Database error');
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as never);
      mockSelect.mockReturnValue({
        eq: mockEq,
      } as never);
      mockEq.mockReturnValue({
        order: mockOrder,
      } as never);

      await expect(getSuggestions('n1')).rejects.toThrow(mockError);
    });
  });

  describe('approveSuggestion', () => {
    it('approves suggestion without edits', async () => {
      const mockResponse = {
        ok: true,
        taskId: 't1',
        suggestionId: 's1',
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await approveSuggestion('s1');

      expect(result).toEqual(mockResponse);
      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'approve-suggestion',
        {
          body: { suggestionId: 's1', edits: undefined },
        },
      );
    });

    it('approves suggestion with edits', async () => {
      const mockResponse = {
        ok: true,
        taskId: 't1',
        suggestionId: 's1',
      };

      const edits = {
        title: 'Updated title',
        priority: 'high' as const,
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await approveSuggestion('s1', edits);

      expect(result).toEqual(mockResponse);
      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'approve-suggestion',
        {
          body: { suggestionId: 's1', edits },
        },
      );
    });

    it('throws ApiError on edge function error', async () => {
      const mockError = new Error('Edge function failed');
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(approveSuggestion('s1')).rejects.toThrow(ApiError);
      await expect(approveSuggestion('s1')).rejects.toThrow('Edge function failed');
    });

    it('throws ApiError on ok:false response', async () => {
      const mockResponse = {
        ok: false,
        error: 'not_pending',
        reason: 'Suggestion is not pending',
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      await expect(approveSuggestion('s1')).rejects.toThrow(ApiError);
      await expect(approveSuggestion('s1')).rejects.toThrow('Suggestion is not pending');
    });

    it('throws ApiError on empty response', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(approveSuggestion('s1')).rejects.toThrow(ApiError);
      await expect(approveSuggestion('s1')).rejects.toThrow('approve-suggestion returned an empty body');
    });
  });

  describe('rejectSuggestion', () => {
    it('rejects suggestion', async () => {
      const mockResponse = {
        ok: true,
        suggestionId: 's1',
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await rejectSuggestion('s1');

      expect(result).toEqual(mockResponse);
      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'reject-suggestion',
        {
          body: { suggestionId: 's1' },
        },
      );
    });

    it('throws ApiError on edge function error', async () => {
      const mockError = new Error('Edge function failed');
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(rejectSuggestion('s1')).rejects.toThrow(ApiError);
      await expect(rejectSuggestion('s1')).rejects.toThrow('Edge function failed');
    });

    it('throws ApiError on ok:false response', async () => {
      const mockResponse = {
        ok: false,
        error: 'suggestion_not_found',
        reason: 'Suggestion not found',
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      await expect(rejectSuggestion('s1')).rejects.toThrow(ApiError);
      await expect(rejectSuggestion('s1')).rejects.toThrow('Suggestion not found');
    });

    it('throws ApiError on empty response', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(rejectSuggestion('s1')).rejects.toThrow(ApiError);
      await expect(rejectSuggestion('s1')).rejects.toThrow('reject-suggestion returned an empty body');
    });
  });
});
