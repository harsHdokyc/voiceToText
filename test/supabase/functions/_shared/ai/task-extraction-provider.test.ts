import { describe, expect, it } from 'vitest';
import { z } from 'zod';

// Replicate the schema for testing (vitest can't resolve npm: imports)
const TaskSuggestionSchema = z.object({
  title: z.string().min(1).max(200),
  details: z.string().max(1000).nullable(),
  kind: z.enum(["task", "reminder", "idea", "question", "follow_up"]),
  due_at: z.string().nullable(),
  priority: z.enum(["low", "normal", "high"]).nullable(),
  source_quote: z.string().min(1).max(500),
  confidence: z.enum(["high", "medium", "low"]),
});

describe('task-extraction-provider (schema validation)', () => {
  describe('TaskSuggestionSchema', () => {
    it('validates a complete suggestion', () => {
      const valid = {
        title: 'Buy milk',
        details: 'Get 2% milk from the store',
        kind: 'task',
        due_at: '2024-12-31T23:59:59Z',
        priority: 'normal',
        source_quote: 'I need to buy milk',
        confidence: 'high',
      };

      const result = TaskSuggestionSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(valid);
      }
    });

    it('validates suggestion with nullable fields', () => {
      const valid = {
        title: 'Call mom',
        details: null,
        kind: 'reminder',
        due_at: null,
        priority: null,
        source_quote: 'Call mom tomorrow',
        confidence: 'medium',
      };

      const result = TaskSuggestionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects missing required title', () => {
      const invalid = {
        title: '',
        kind: 'task',
        source_quote: 'test',
        confidence: 'high',
      };

      const result = TaskSuggestionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects invalid kind', () => {
      const invalid = {
        title: 'Test',
        kind: 'invalid_kind',
        source_quote: 'test',
        confidence: 'high',
      };

      const result = TaskSuggestionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects invalid priority', () => {
      const invalid = {
        title: 'Test',
        kind: 'task',
        priority: 'urgent',
        source_quote: 'test',
        confidence: 'high',
      };

      const result = TaskSuggestionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects invalid confidence', () => {
      const invalid = {
        title: 'Test',
        kind: 'task',
        source_quote: 'test',
        confidence: 'very_high',
      };

      const result = TaskSuggestionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects title exceeding max length', () => {
      const invalid = {
        title: 'a'.repeat(201),
        kind: 'task',
        source_quote: 'test',
        confidence: 'high',
      };

      const result = TaskSuggestionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects details exceeding max length', () => {
      const invalid = {
        title: 'Test',
        details: 'a'.repeat(1001),
        kind: 'task',
        source_quote: 'test',
        confidence: 'high',
      };

      const result = TaskSuggestionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects source_quote exceeding max length', () => {
      const invalid = {
        title: 'Test',
        kind: 'task',
        source_quote: 'a'.repeat(501),
        confidence: 'high',
      };

      const result = TaskSuggestionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('validates empty task array', () => {
      const valid = {
        tasks: [],
      };

      const result = TaskSuggestionSchema.array().safeParse(valid.tasks);
      expect(result.success).toBe(true);
    });
  });
});
