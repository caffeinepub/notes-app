import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit2, Trash2, Lock, Unlock } from 'lucide-react';
import { useDeleteNote } from '../hooks/useNotes';
import { toast } from 'sonner';
import FullScreenImageModal from './FullScreenImageModal';
import { decryptContent } from '../utils/cryptoNotes';
import type { Note } from '../backend';
import { formatDistanceToNow } from 'date-fns';

interface NoteDetailModalProps {
  note: Note;
  onClose: () => void;
  onEdit: () => void;
}

export default function NoteDetailModal({ note, onClose, onEdit }: NoteDetailModalProps) {
  const deleteNoteMutation = useDeleteNote();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [decryptPassword, setDecryptPassword] = useState('');
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [decryptError, setDecryptError] = useState('');

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteNoteMutation.mutateAsync(note.id);
        toast.success('Note deleted successfully');
        onClose();
      } catch (error) {
        toast.error('Failed to delete note');
      }
    }
  };

  const handleDecrypt = async () => {
    if (!decryptPassword) {
      setDecryptError('Please enter a password');
      return;
    }

    try {
      const decrypted = await decryptContent(note.content, decryptPassword);
      setDecryptedContent(decrypted);
      setDecryptError('');
    } catch (error) {
      setDecryptError('Incorrect password');
      setDecryptedContent(null);
    }
  };

  const timestamp = new Date(Number(note.timestamp) / 1000000);

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl pr-8">{note.title}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(timestamp, { addSuffix: true })}
            </p>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {note.encrypted ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  <span>This note is encrypted</span>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">ENCRYPTED CONTENT:</Label>
                  <div className="p-4 bg-muted/50 rounded-md border border-border">
                    <p className="text-sm font-mono break-all text-muted-foreground">
                      {note.content}
                    </p>
                  </div>
                </div>

                {!decryptedContent && (
                  <div className="space-y-3 pt-2">
                    <Label htmlFor="decrypt-password">Enter password to decrypt</Label>
                    <div className="flex gap-2">
                      <Input
                        id="decrypt-password"
                        type="password"
                        value={decryptPassword}
                        onChange={(e) => {
                          setDecryptPassword(e.target.value);
                          setDecryptError('');
                        }}
                        placeholder="Password"
                        onKeyDown={(e) => e.key === 'Enter' && handleDecrypt()}
                      />
                      <Button onClick={handleDecrypt}>
                        <Unlock className="h-4 w-4 mr-2" />
                        Decrypt
                      </Button>
                    </div>
                    {decryptError && (
                      <p className="text-sm text-destructive">{decryptError}</p>
                    )}
                  </div>
                )}

                {decryptedContent && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">DECRYPTED CONTENT:</Label>
                    <div className="p-4 bg-accent/30 rounded-md border border-primary/20">
                      <p className="text-sm whitespace-pre-wrap">{decryptedContent}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="prose prose-invert max-w-none">
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              </div>
            )}

            {note.imageRefs.length > 0 && (
              <div className="space-y-3">
                <Label>Attached Images ({note.imageRefs.length})</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {note.imageRefs.map((imageRef, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-md overflow-hidden border border-border cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedImage(imageRef.getDirectURL())}
                    >
                      <img
                        src={imageRef.getDirectURL()}
                        alt={`Attachment ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-row justify-between sm:justify-between">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteNoteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={onEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedImage && (
        <FullScreenImageModal
          imageUrl={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </>
  );
}
