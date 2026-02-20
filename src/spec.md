# Specification

## Summary
**Goal:** Make the fullscreen attached-image preview overlay reliably dismissible and correctly layered over the NoteDetailModal.

**Planned changes:**
- Fix the fullscreen image preview so clicking the close (X) button always closes the preview immediately.
- Fix the fullscreen image preview so clicking the darkened backdrop/outside the image always closes the preview immediately.
- Ensure the fullscreen image preview is the topmost interactive layer while open so underlying dialogs/overlays do not intercept clicks.
- Verify and preserve correct Escape-key behavior: Escape closes only the fullscreen preview (not the underlying NoteDetailModal).

**User-visible outcome:** When viewing an attached image in fullscreen from the NoteDetailModal, users can consistently close the fullscreen preview with the X button, by clicking the backdrop, or by pressing Escape—without closing the NoteDetailModal or needing multiple clicks.
