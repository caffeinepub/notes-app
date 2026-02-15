import type { Note } from '../backend';

export function filterNotes(notes: Note[], query: string): Note[] {
  if (!query.trim()) {
    return notes;
  }

  const normalizedQuery = query.toLowerCase().trim();

  return notes.filter((note) => {
    const titleMatch = note.title.toLowerCase().includes(normalizedQuery);
    const contentMatch = note.content.toLowerCase().includes(normalizedQuery);
    return titleMatch || contentMatch;
  });
}
