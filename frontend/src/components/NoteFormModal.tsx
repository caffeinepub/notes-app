import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Loader2, X, Lock, Unlock, ImagePlus, Clipboard } from 'lucide-react';
import { useCreateNote, useUpdateNote } from '../hooks/useNotes';
import { useActor } from '../hooks/useActor';
import { toast } from 'sonner';
import { ExternalBlob } from '../backend';
import { validateImageFile, createImagePreview } from '../utils/imageAttachments';
import { readTextFile } from '../utils/txtImport';
import { encryptContent, decryptContent, encryptImage, decryptImage } from '../utils/cryptoNotes';
import { safeErrorReason } from '../utils/safeErrorReason';
import type { Note } from '../backend';

interface NoteFormModalProps {
  note?: Note | null;
  onClose: () => void;
  /** Pre-decrypted text content (passed when editing an already-decrypted encrypted note) */
  decryptedContent?: string;
  /** Pre-decrypted image bytes (passed when editing an already-decrypted encrypted note) */
  decryptedImages?: Uint8Array<ArrayBuffer>[];
  /** The password used to decrypt (pre-filled for re-encryption on save) */
  decryptedPassword?: string;
}

export default function NoteFormModal({
  note,
  onClose,
  decryptedContent: initialDecryptedContent,
  decryptedImages: initialDecryptedImages,
  decryptedPassword: initialDecryptedPassword,
}: NoteFormModalProps) {
  const isEditing = !!note;
  const createNoteMutation = useCreateNote();
  const updateNoteMutation = useUpdateNote();
  const { actor } = useActor();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // existingImages: ExternalBlob refs for non-encrypted notes
  const [existingImages, setExistingImages] = useState<ExternalBlob[]>([]);

  // decryptedExistingImages: raw bytes for images from a decrypted encrypted note
  // Typed as Uint8Array<ArrayBuffer> to satisfy Blob constructor and ExternalBlob.fromBytes
  const [decryptedExistingImages, setDecryptedExistingImages] = useState<Uint8Array<ArrayBuffer>[]>([]);
  const [decryptedExistingPreviews, setDecryptedExistingPreviews] = useState<string[]>([]);

  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [useTextImport, setUseTextImport] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [decryptPassword, setDecryptPassword] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const decryptedPreviewUrlsRef = useRef<string[]>([]);

  // Cleanup decrypted preview object URLs on unmount
  useEffect(() => {
    return () => {
      decryptedPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setIsEncrypted(note.encrypted);

      if (note.encrypted && initialDecryptedContent !== undefined) {
        // Note was already decrypted in the detail modal — use pre-decrypted data
        setContent(initialDecryptedContent);
        setIsDecrypted(true);
        setPassword(initialDecryptedPassword ?? '');
        setConfirmPassword(initialDecryptedPassword ?? '');

        // Build preview URLs for the pre-decrypted images
        if (initialDecryptedImages && initialDecryptedImages.length > 0) {
          const urls: string[] = [];
          for (const bytes of initialDecryptedImages) {
            let mimeType = 'image/jpeg';
            if (bytes[0] === 0x89 && bytes[1] === 0x50) mimeType = 'image/png';
            else if (bytes[0] === 0x47 && bytes[1] === 0x49) mimeType = 'image/gif';
            else if (bytes[0] === 0x52 && bytes[1] === 0x49) mimeType = 'image/webp';
            // bytes is Uint8Array<ArrayBuffer> — safe for Blob constructor
            const blob = new Blob([bytes], { type: mimeType });
            urls.push(URL.createObjectURL(blob));
          }
          decryptedPreviewUrlsRef.current = urls;
          setDecryptedExistingImages(initialDecryptedImages);
          setDecryptedExistingPreviews(urls);
        }
      } else if (!note.encrypted) {
        // Plain note — use ExternalBlob refs directly
        setContent(note.content);
        setExistingImages(note.imageRefs);
      } else {
        // Encrypted note opened directly (not via detail modal) — show decrypt step
        setContent(note.content);
      }
    }
  }, [note]);

  // Clipboard paste handler for images
  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageItems = Array.from(items).filter((item) => item.type.startsWith('image/'));
      if (imageItems.length === 0) return;

      const validFiles: File[] = [];
      const previews: string[] = [];

      for (const item of imageItems) {
        const file = item.getAsFile();
        if (!file) continue;

        const namedFile = new File([file], `pasted-image-${Date.now()}.${file.type.split('/')[1] || 'png'}`, {
          type: file.type,
        });

        const validation = validateImageFile(namedFile);
        if (!validation.valid) {
          toast.error(validation.error);
          continue;
        }

        validFiles.push(namedFile);
        const preview = await createImagePreview(namedFile);
        previews.push(preview);
      }

      if (validFiles.length > 0) {
        setNewImageFiles((prev) => [...prev, ...validFiles]);
        setNewImagePreviews((prev) => [...prev, ...previews]);
        toast.success(`${validFiles.length} image${validFiles.length > 1 ? 's' : ''} pasted`);
      }
    },
    []
  );

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

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

      // Decrypt images for editing
      if (note!.imageRefs.length > 0) {
        const decryptedBytes: Uint8Array<ArrayBuffer>[] = [];
        const urls: string[] = [];

        for (const imageRef of note!.imageRefs) {
          const encryptedBytes = await imageRef.getBytes();
          const bytes = await decryptImage(encryptedBytes, decryptPassword);
          decryptedBytes.push(bytes);

          let mimeType = 'image/jpeg';
          if (bytes[0] === 0x89 && bytes[1] === 0x50) mimeType = 'image/png';
          else if (bytes[0] === 0x47 && bytes[1] === 0x49) mimeType = 'image/gif';
          else if (bytes[0] === 0x52 && bytes[1] === 0x49) mimeType = 'image/webp';

          // bytes is Uint8Array<ArrayBuffer> — safe for Blob constructor
          const blob = new Blob([bytes], { type: mimeType });
          urls.push(URL.createObjectURL(blob));
        }

        // Revoke old preview URLs
        decryptedPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        decryptedPreviewUrlsRef.current = urls;

        setDecryptedExistingImages(decryptedBytes);
        setDecryptedExistingPreviews(urls);
      }

      setErrors({});
    } catch {
      setErrors({ decrypt: 'Incorrect password' });
    }
  };

  const processImageFiles = async (files: File[]) => {
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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processImageFiles(files);
    e.target.value = '';
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

  const handleRemoveDecryptedExistingImage = (index: number) => {
    setDecryptedExistingImages((prev) => prev.filter((_, i) => i !== index));
    setDecryptedExistingPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
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

    if (!actor) {
      toast.error('System is not ready yet, please wait a moment and try again');
      return;
    }

    try {
      let finalContent = content;

      if (isEncrypted && password) {
        finalContent = await encryptContent(content, password);
      }

      // Build the final image list
      let allImageBlobs: ExternalBlob[] = [];

      if (isEncrypted && password) {
        // Encrypt all images (decrypted existing + new files)
        const encryptedDecryptedExisting = await Promise.all(
          decryptedExistingImages.map(async (bytes) => {
            // bytes is Uint8Array<ArrayBuffer>, encryptImage returns Uint8Array<ArrayBuffer>
            const encryptedBytes = await encryptImage(bytes, password);
            return ExternalBlob.fromBytes(encryptedBytes);
          })
        );

        const encryptedNewImages = await Promise.all(
          newImageFiles.map(async (file, index) => {
            const arrayBuffer = await file.arrayBuffer();
            // arrayBuffer() returns ArrayBuffer, so new Uint8Array(arrayBuffer) is Uint8Array<ArrayBuffer>
            const uint8Array = new Uint8Array(arrayBuffer) as Uint8Array<ArrayBuffer>;
            const encryptedBytes = await encryptImage(uint8Array, password);
            return ExternalBlob.fromBytes(encryptedBytes).withUploadProgress((percentage) => {
              setUploadProgress((prev) => ({ ...prev, [index]: percentage }));
            });
          })
        );

        allImageBlobs = [...encryptedDecryptedExisting, ...encryptedNewImages];
      } else {
        // Non-encrypted: use existing ExternalBlob refs + upload new files as-is
        const newImageBlobs = await Promise.all(
          newImageFiles.map(async (file, index) => {
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer) as Uint8Array<ArrayBuffer>;
            return ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage) => {
              setUploadProgress((prev) => ({ ...prev, [index]: percentage }));
            });
          })
        );

        allImageBlobs = [...existingImages, ...newImageBlobs];
      }

      const noteData = {
        title: title.trim(),
        content: finalContent,
        encrypted: isEncrypted,
        imageRefs: allImageBlobs,
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
      console.error(isEditing ? 'Update note error:' : 'Create note error:', error);
      const reason = safeErrorReason(error);
      const baseMessage = isEditing ? 'Failed to update note' : 'Failed to create note';
      toast.error(reason ? `${baseMessage}: ${reason}` : baseMessage);
    }
  };

  const isSubmitting = createNoteMutation.isPending || updateNoteMutation.isPending;
  const showDecryptStep = isEditing && note?.encrypted && !isDecrypted;
  const submitDisabled = isSubmitting || !actor;

  // Determine which "existing" images to show in the form
  const isEditingDecryptedNote = isEditing && note?.encrypted && isDecrypted;

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

            {/* Image Attachments */}
            <div className="space-y-3">
              <Label>Images</Label>

              {/* Plain existing images (non-encrypted notes) */}
              {!isEditingDecryptedNote && existingImages.length > 0 && (
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

              {/* Decrypted existing images (encrypted notes that have been decrypted) */}
              {isEditingDecryptedNote && decryptedExistingPreviews.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Current images (decrypted):</p>
                  <div className="grid grid-cols-3 gap-2">
                    {decryptedExistingPreviews.map((previewUrl, index) => (
                      <div key={index} className="relative aspect-square rounded-md overflow-hidden border border-border">
                        <img
                          src={previewUrl}
                          alt={`Existing ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveDecryptedExistingImage(index)}
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

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                onChange={handleImageSelect}
                className="hidden"
                aria-hidden="true"
              />

              {/* Attach Image button */}
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2 border-dashed"
                >
                  <ImagePlus className="h-4 w-4" />
                  Attach Image
                </Button>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clipboard className="h-3 w-3 shrink-0" />
                  You can also paste an image directly with{' '}
                  <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px] border border-border">
                    Ctrl+V
                  </kbd>{' '}
                  /{' '}
                  <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px] border border-border">
                    ⌘V
                  </kbd>
                  . Max 10MB · JPG, PNG, GIF
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
                    Protect your note and images with a password
                  </p>
                </div>
                <Switch
                  id="encrypt-toggle"
                  checked={isEncrypted}
                  onCheckedChange={setIsEncrypted}
                />
              </div>

              {isEncrypted && !isEditing && (
                <div className="space-y-3">
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
                      placeholder="Enter encryption password"
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
                      placeholder="Confirm encryption password"
                    />
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              )}

              {isEncrypted && isEditing && isDecrypted && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    <span>Note and images will be re-encrypted with the same password on save.</span>
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
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditing ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                isEditing ? 'Save Changes' : 'Create Note'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
