import { useState, useEffect, useRef } from 'react';
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
import { Edit2, Trash2, Lock, Unlock, ImageIcon } from 'lucide-react';
import { useDeleteNote } from '../hooks/useNotes';
import { toast } from 'sonner';
import FullScreenImageModal from './FullScreenImageModal';
import { decryptContent, decryptImage } from '../utils/cryptoNotes';
import type { Note } from '../backend';
import { formatDistanceToNow } from 'date-fns';

interface NoteDetailModalProps {
  note: Note;
  onClose: () => void;
  onEdit: (decryptedContent?: string, decryptedImages?: Uint8Array<ArrayBuffer>[], decryptPassword?: string) => void;
}

export default function NoteDetailModal({ note, onClose, onEdit }: NoteDetailModalProps) {
  const deleteNoteMutation = useDeleteNote();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [decryptPassword, setDecryptPassword] = useState('');
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [decryptedImages, setDecryptedImages] = useState<Uint8Array<ArrayBuffer>[] | null>(null);
  const [decryptedImageUrls, setDecryptedImageUrls] = useState<string[]>([]);
  const [decryptError, setDecryptError] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Track object URLs for cleanup
  const objectUrlsRef = useRef<string[]>([]);

  // Cleanup object URLs when component unmounts
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

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

    setIsDecrypting(true);
    setDecryptError('');

    try {
      // Decrypt text content
      const decrypted = await decryptContent(note.content, decryptPassword);

      // Decrypt all images using the same password
      const decryptedImgBytes: Uint8Array<ArrayBuffer>[] = [];
      const newObjectUrls: string[] = [];

      for (const imageRef of note.imageRefs) {
        const encryptedBytes = await imageRef.getBytes();
        const decryptedBytes = await decryptImage(encryptedBytes, decryptPassword);
        decryptedImgBytes.push(decryptedBytes);

        // Detect image type from magic bytes (default to jpeg)
        let mimeType = 'image/jpeg';
        if (decryptedBytes[0] === 0x89 && decryptedBytes[1] === 0x50) mimeType = 'image/png';
        else if (decryptedBytes[0] === 0x47 && decryptedBytes[1] === 0x49) mimeType = 'image/gif';
        else if (decryptedBytes[0] === 0x52 && decryptedBytes[1] === 0x49) mimeType = 'image/webp';

        // decryptedBytes is Uint8Array<ArrayBuffer> — safe for Blob constructor
        const blob = new Blob([decryptedBytes], { type: mimeType });
        const url = URL.createObjectURL(blob);
        newObjectUrls.push(url);
      }

      // Revoke old URLs before setting new ones
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = newObjectUrls;

      setDecryptedContent(decrypted);
      setDecryptedImages(decryptedImgBytes);
      setDecryptedImageUrls(newObjectUrls);
      setDecryptError('');
    } catch (error) {
      setDecryptError('Incorrect password');
      setDecryptedContent(null);
      setDecryptedImages(null);
      setDecryptedImageUrls([]);
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    // Only allow closing the dialog if the fullscreen preview is not open
    if (!open && !selectedImage) {
      onClose();
    }
  };

  const handleEditClick = () => {
    if (note.encrypted && decryptedContent !== null) {
      // Pass decrypted content, images, and password to the edit handler
      onEdit(decryptedContent, decryptedImages ?? [], decryptPassword);
    } else {
      onEdit();
    }
  };

  const timestamp = new Date(Number(note.timestamp) / 1000000);

  // For non-encrypted notes, use direct URLs
  const plainImageUrls = note.imageRefs.map((ref) => ref.getDirectURL());

  return (
    <>
      <Dialog open onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className={`max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border ${
            selectedImage ? 'pointer-events-none' : ''
          }`}
        >
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

                {/* Hidden images indicator */}
                {note.imageRefs.length > 0 && decryptedImageUrls.length === 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-md border border-border">
                    <ImageIcon className="h-4 w-4 shrink-0" />
                    <span>
                      {note.imageRefs.length} encrypted image{note.imageRefs.length > 1 ? 's' : ''} — decrypt to reveal
                    </span>
                  </div>
                )}

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
                        disabled={isDecrypting}
                      />
                      <Button onClick={handleDecrypt} disabled={isDecrypting}>
                        {isDecrypting ? (
                          <>
                            <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Decrypting...
                          </>
                        ) : (
                          <>
                            <Unlock className="h-4 w-4 mr-2" />
                            Decrypt
                          </>
                        )}
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

                {/* Decrypted images */}
                {decryptedImageUrls.length > 0 && (
                  <div className="space-y-3">
                    <Label>
                      Decrypted Images ({decryptedImageUrls.length})
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {decryptedImageUrls.map((url, index) => (
                        <div
                          key={index}
                          className="relative aspect-square rounded-md overflow-hidden border border-border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedImage(url)}
                        >
                          <img
                            src={url}
                            alt={`Attachment ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="prose prose-invert max-w-none">
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              </div>
            )}

            {/* Plain (non-encrypted) images */}
            {!note.encrypted && note.imageRefs.length > 0 && (
              <div className="space-y-3">
                <Label>Attached Images ({note.imageRefs.length})</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {plainImageUrls.map((url, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-md overflow-hidden border border-border cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedImage(url)}
                    >
                      <img
                        src={url}
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
              <Button onClick={handleEditClick}>
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
