# Specification

## Summary
**Goal:** Encrypt images attached to notes alongside the note text, keeping them fully hidden until the note is decrypted with the correct password.

**Planned changes:**
- Extend `cryptoNotes.ts` to support encrypting and decrypting image data using the same PBKDF2/AES-GCM approach used for note text.
- When saving a note with a password, encrypt all attached images before storing them on the backend.
- In `NoteCard.tsx`, hide all image thumbnails and image count indicators when a note is encrypted; optionally show a lock icon hinting at hidden media.
- In `NoteDetailModal.tsx`, hide all images before decryption; after successful decryption, decrypt and render all images as clickable thumbnails; keep images hidden and show an error if decryption fails.
- In `NoteFormModal.tsx`, when editing a decrypted note, show existing images as previews and allow adding/removing images; re-encrypt all images (including new ones) on save with a password.

**User-visible outcome:** Images attached to encrypted notes are completely hidden until the correct password is entered. Once decrypted, images appear as normal thumbnails and can be opened full-screen. When saving, all images are encrypted together with the note text.
