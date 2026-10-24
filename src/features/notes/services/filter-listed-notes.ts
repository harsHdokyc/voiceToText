import {
  noteMatchesCategoryFilter,
  type NoteCategoryFilter,
} from '@/features/notes/services/note-category';
import { noteMatchesSearch } from '@/features/notes/services/note-status';

export type ListNotesParams = {
  query?: string;
  category?: NoteCategoryFilter;
};

type ListedNote = {
  category: string;
  title: string | null;
  transcript: string | null;
  edited_transcript: string | null;
};

/** Client-side filter for a full notes list (search + category chips). */
export function filterListedNotes<T extends ListedNote>(
  rows: T[],
  params: ListNotesParams = {},
): T[] {
  const search = params.query?.trim();
  let out = rows;
  if (params.category && params.category !== 'All notes') {
    out = out.filter((row) => noteMatchesCategoryFilter(row, params.category!));
  }
  if (!search) return out;
  return out.filter((row) => noteMatchesSearch(row, search));
}
