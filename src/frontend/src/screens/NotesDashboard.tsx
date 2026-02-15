import { useState } from 'react';
import { useListNotes } from '../hooks/useNotes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, X, LogOut, Loader2 } from 'lucide-react';
import NoteCard from '../components/NoteCard';
import NoteDetailModal from '../components/NoteDetailModal';
import NoteFormModal from '../components/NoteFormModal';
import { filterNotes } from '../utils/noteSearch';
import type { Note } from '../backend';

interface NotesDashboardProps {
  onLogout: () => void;
  userName: string;
}

export default function NotesDashboard({ onLogout, userName }: NotesDashboardProps) {
  const { data: notes = [], isLoading } = useListNotes();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const filteredNotes = filterNotes(notes, searchQuery);

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
  };

  const handleCloseDetail = () => {
    setSelectedNote(null);
  };

  const handleEdit = (note: Note) => {
    setSelectedNote(null);
    setEditingNote(note);
  };

  const handleCloseForm = () => {
    setIsCreating(false);
    setEditingNote(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/assets/generated/notes-logo.dim_512x512.png"
                alt="Notes"
                className="w-10 h-10"
              />
              <div>
                <h1 className="text-xl font-bold text-foreground">Notes</h1>
                <p className="text-sm text-muted-foreground">Welcome, {userName}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search and Create */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search notes by title or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button onClick={() => setIsCreating(true)} size="default">
            <Plus className="h-4 w-4 mr-2" />
            New Note
          </Button>
        </div>

        {/* Notes Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-20">
            {searchQuery ? (
              <div className="space-y-4">
                <p className="text-muted-foreground text-lg">No notes found matching "{searchQuery}"</p>
                <Button variant="outline" onClick={handleClearSearch}>
                  Clear Search
                </Button>
              </div>
            ) : notes.length === 0 ? (
              <div className="space-y-6 max-w-md mx-auto">
                <img
                  src="/assets/generated/empty-state-illustration.dim_1200x600.png"
                  alt="No notes yet"
                  className="w-full opacity-80"
                />
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-foreground">No notes yet</h2>
                  <p className="text-muted-foreground">
                    Create your first note to get started
                  </p>
                </div>
                <Button onClick={() => setIsCreating(true)} size="lg">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Note
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onClick={() => handleNoteClick(note)}
                onEdit={() => handleEdit(note)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-20 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} • Built with ❤️ using{' '}
            <a
              href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
                window.location.hostname
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>

      {/* Modals */}
      {selectedNote && (
        <NoteDetailModal
          note={selectedNote}
          onClose={handleCloseDetail}
          onEdit={() => handleEdit(selectedNote)}
        />
      )}

      {(isCreating || editingNote) && (
        <NoteFormModal
          note={editingNote}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
