# Specification

## Summary
**Goal:** Build a private, per-user notes app gated by Internet Identity, supporting note CRUD, image attachments, .txt import, search, and optional frontend-only password encryption.

**Planned changes:**
- Add an Internet Identity login screen and authentication gate; ensure sign-out returns to login and clears private data from view.
- Implement backend per-caller storage for notes and associated image blobs with strict user isolation.
- Build end-to-end note CRUD: list notes as clickable cards, view details in a modal, create/edit via forms, and delete notes (including associated images).
- Add image attachments (JPEG/PNG/GIF) with immediate thumbnail previews, backend persistence, display in note detail, and edit-time image keep/add/delete behavior.
- Add full-screen image viewer from the note detail modal with close controls and return to the note detail state.
- Add .txt import option for note content during creation, populating editable content on the frontend and rejecting non-.txt files.
- Add optional password-based frontend encryption: store ciphertext + encryption status only, show labeled ciphertext on note cards and in detail, prompt for password to decrypt, and block all editing unless the correct password is provided.
- Implement real-time frontend search filtering by title and by content/ciphertext with a clear-search control.
- Apply a consistent dark-theme-only UI with responsive card layout and title truncation that never obscures edit/delete controls.

**User-visible outcome:** Users sign in with Internet Identity to access a dark-themed notes dashboard where they can create, import, search, view, edit, and delete private notes; attach and view images (including full-screen viewing); and optionally encrypt note contents client-side with password-protected viewing and editing.
