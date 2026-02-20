import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Upload, X, FileText, Lock, Unlock } from 'lucide-react';
import { useCreateNote, useUpdateNote } from '../hooks/useNotes';
import { useActor } from '../hooks/useActor';
import { toast } from 'sonner';
import { ExternalBlob } from '../backend';
import { validateImageFile, createImagePreview } from '../utils/imageAttachments';
import { readTextFile } from '../utils/txtImport';
import { encryptContent, decryptContent } from '../utils/cryptoNotes';
import { safeErrorReason } from '../utils/safeErrorReason';
import type { Note } from '../backend';

interface NoteFormModalProps {
  note?: Note | null;
  onClose: () => void;
}

export default function NoteFormModal({ note, onClose }: NoteFormModalProps) {
  const isEditing = !!note;
  const createNoteMutation = useCreateNote();
  const updateNoteMutation = useUpdateNote();
  const { actor, isFetching: actorFetching } = useActor();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [existingImages, setExistingImages] = useState<ExternalBlob[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [useTextImport, setUseTextImport] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [decryptPassword, setDecryptPassword] = useState('');

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setIsEncrypted(note.encrypted);
      setExistingImages(note.imageRefs);
    }
  }, [note]);

  const handleDecryptForEdit = async () => {
    if (!decryptPassword) {
      setErrors({ decrypt: 'Please enter a password' });
      return;
    }

    try {
      const decrypted = await decryptContent(note!.content, decryptPassword);
      setContent(decrypted);
      setIsDecrypted(true);
      setPassword(decryptPassword);
      setConfirmPassword(decryptPassword);
      setErrors({});
    } catch (error) {
      setErrors({ decrypt: 'Incorrect password' });
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    const previews: string[] = [];

    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast.error(validation.error);
        continue;
      }

      validFiles.push(file);
      const preview = await createImagePreview(file);
      previews.push(preview);
    }

    setNewImageFiles((prev) => [...prev, ...validFiles]);
    setNewImagePreviews((prev) => [...prev, ...previews]);
  };

  const handleRemoveNewImage = (index: number) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleRemoveExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTextFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await readTextFile(file);
      setContent(text);
      toast.success('Text file imported successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import text file');
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!content.trim()) {
      newErrors.content = 'Content is required';
    }

    if (isEncrypted && !isEditing) {
      if (!password) {
        newErrors.password = 'Password is required for encryption';
      }
      if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    if (isEditing && note?.encrypted && !isDecrypted) {
      newErrors.decrypt = 'You must decrypt the note before editing';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Gate submission on actor readiness
    if (!actor) {
      console.error('Submit attempted but actor not available');
      toast.error('System is still initializing, please wait a moment');
      return;
    }

    try {
      let finalContent = content;

      // Encrypt if needed
      if (isEncrypted && password) {
        finalContent = await encryptContent(content, password);
      }

      // Convert new image files to ExternalBlob
      const newImageBlobs = await Promise.all(
        newImageFiles.map(async (file, index) => {
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          return ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage) => {
            setUploadProgress((prev) => ({ ...prev, [index]: percentage }));
          });
        })
      );

      const allImages = [...existingImages, ...newImageBlobs];

      const noteData = {
        title: title.trim(),
        content: finalContent,
        encrypted: isEncrypted,
        imageRefs: allImages,
      };

      if (isEditing) {
        await updateNoteMutation.mutateAsync({ noteId: note!.id, data: noteData });
        toast.success('Note updated successfully');
      } else {
        await createNoteMutation.mutateAsync(noteData);
        toast.success('Note created successfully');
      }

      onClose();
    } catch (error) {
      // Log full error to console for diagnostics
      console.error(isEditing ? 'Update note error:' : 'Create note error:', error);
      
      // Show user-friendly error with reason
      const reason = safeErrorReason(error);
      const baseMessage = isEditing ? 'Failed to update note' : 'Failed to create note';
      toast.error(reason ? `${baseMessage}: ${reason}` : baseMessage);
    }
  };

  const isSubmitting = createNoteMutation.isPending || updateNoteMutation.isPending;
  const showDecryptStep = isEditing && note?.encrypted && !isDecrypted;
  
  // Compute actor readiness - disable submit while actor is initializing
  const actorReady = !!actor && !actorFetching;
  const submitDisabled = isSubmitting || !actorReady;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border" style={{ isolation: 'isolate' }}>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Note' : 'Create New Note'}</DialogTitle>
        </DialogHeader>

        {showDecryptStep ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>This note is encrypted. Enter password to edit.</span>
            </div>

            <div className="space-y-3">
              <Label htmlFor="decrypt-password">Password</Label>
              <div className="flex gap-2">
                <Input
                  id="decrypt-password"
                  type="password"
                  value={decryptPassword}
                  onChange={(e) => {
                    setDecryptPassword(e.target.value);
                    setErrors({});
                  }}
                  placeholder="Enter password"
                  onKeyDown={(e) => e.key === 'Enter' && handleDecryptForEdit()}
                />
                <Button onClick={handleDecryptForEdit}>
                  <Unlock className="h-4 w-4 mr-2" />
                  Decrypt
                </Button>
              </div>
              {errors.decrypt && (
                <p className="text-sm text-destructive">{errors.decrypt}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {!actorReady && (
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Initializing system...</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setErrors((prev) => ({ ...prev, title: '' }));
                }}
                placeholder="Enter note title"
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="content">Content</Label>
                {!isEditing && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="text-import" className="text-xs text-muted-foreground cursor-pointer">
                      Import .txt file
                    </Label>
                    <Switch
                      id="text-import"
                      checked={useTextImport}
                      onCheckedChange={setUseTextImport}
                    />
                  </div>
                )}
              </div>

              {useTextImport && !isEditing ? (
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept=".txt"
                    onChange={handleTextFileImport}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    Select a .txt file to import its contents
                  </p>
                </div>
              ) : null}

              <Textarea
                id="content"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  setErrors((prev) => ({ ...prev, content: '' }));
                }}
                placeholder="Enter note content"
                rows={8}
                className="resize-none"
              />
              {errors.content && (
                <p className="text-sm text-destructive">{errors.content}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label>Images</Label>

              {existingImages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Current images:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {existingImages.map((imageRef, index) => (
                      <div key={index} className="relative aspect-square rounded-md overflow-hidden border border-border">
                        <img
                          src={imageRef.getDirectURL()}
                          alt={`Existing ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingImage(index)}
                          className="absolute top-1 right-1 p-1 bg-destructive/90 hover:bg-destructive rounded-full transition-colors"
                        >
                          <X className="h-3 w-3 text-destructive-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {newImagePreviews.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">New images to upload:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {newImagePreviews.map((preview, index) => (
                      <div key={index} className="relative aspect-square rounded-md overflow-hidden border border-border">
                        <img
                          src={preview}
                          alt={`New ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveNewImage(index)}
                          className="absolute top-1 right-1 p-1 bg-destructive/90 hover:bg-destructive rounded-full transition-colors"
                        >
                          <X className="h-3 w-3 text-destructive-foreground" />
                        </button>
                        {uploadProgress[index] !== undefined && uploadProgress[index] < 100 && (
                          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <div className="text-xs font-medium">{uploadProgress[index]}%</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="cursor-pointer"
                  id="image-upload"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Max 5MB per image. Supported: JPG, PNG, GIF, WebP
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="encrypt-toggle" className="text-sm font-medium">
                    Encrypt this note
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Protect your note with a password
                  </p>
                </div>
                <Switch
                  id="encrypt-toggle"
                  checked={isEncrypted}
                  onCheckedChange={setIsEncrypted}
                  disabled={isEditing}
                />
              </div>

              {isEncrypted && !isEditing && (
                <div className="space-y-3 pl-4 border-l-2 border-primary/30">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, password: '' }));
                      }}
                      placeholder="Enter password"
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                      }}
                      placeholder="Confirm password"
                    />
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          {!showDecryptStep && (
            <Button onClick={handleSubmit} disabled={submitDisabled}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {!actorReady && !isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update Note' : 'Create Note'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
