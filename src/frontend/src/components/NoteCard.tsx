import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Lock } from 'lucide-react';
import { useDeleteNote } from '../hooks/useNotes';
import { toast } from 'sonner';
import type { Note } from '../backend';
import { formatDistanceToNow } from 'date-fns';

interface NoteCardProps {
  note: Note;
  onClick: () => void;
  onEdit: () => void;
}

export default function NoteCard({ note, onClick, onEdit }: NoteCardProps) {
  const deleteNoteMutation = useDeleteNote();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteNoteMutation.mutateAsync(note.id);
        toast.success('Note deleted successfully');
      } catch (error) {
        toast.error('Failed to delete note');
      }
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  };

  const contentPreview = note.content.slice(0, 150);
  const timestamp = new Date(Number(note.timestamp) / 1000000);

  return (
    <Card
      className="cursor-pointer hover:bg-accent/50 transition-colors group"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg text-foreground flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
            {note.title}
          </h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            {note.encrypted && (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleteNoteMutation.isPending}
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {note.encrypted ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">ENCRYPTED CONTENT:</p>
            <p className="text-sm text-muted-foreground font-mono break-all line-clamp-3">
              {contentPreview}...
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {contentPreview}
            {note.content.length > 150 && '...'}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
          <span>{formatDistanceToNow(timestamp, { addSuffix: true })}</span>
          {note.imageRefs.length > 0 && (
            <span>{note.imageRefs.length} image{note.imageRefs.length > 1 ? 's' : ''}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
