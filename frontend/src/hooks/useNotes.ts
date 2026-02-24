import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Note, NoteData, NoteId } from '../backend';

export function useListNotes() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Note[]>({
    queryKey: ['notes'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listNotes();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetNote(noteId: NoteId) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Note>({
    queryKey: ['note', noteId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getNote(noteId);
    },
    enabled: !!actor && !actorFetching && !!noteId,
  });
}

export function useCreateNote() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: NoteData) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createNote(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: (error) => {
      // Log mutation-level errors for diagnostics
      console.error('Create note mutation error:', error);
    },
  });
}

export function useUpdateNote() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, data }: { noteId: NoteId; data: NoteData }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateNote(noteId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: (error) => {
      // Log mutation-level errors for diagnostics
      console.error('Update note mutation error:', error);
    },
  });
}

export function useDeleteNote() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: NoteId) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteNote(noteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: (error) => {
      // Log mutation-level errors for diagnostics
      console.error('Delete note mutation error:', error);
    },
  });
}
