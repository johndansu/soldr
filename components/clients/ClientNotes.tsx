'use client'

import { useState } from 'react'

interface Note {
  id: string
  content: string
  created_at: string
}

export function ClientNotes({ clientId, initialNotes }: { clientId: string; initialNotes: Note[] }) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [newNote, setNewNote] = useState('')
  const [adding, setAdding] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [catchingUp, setCatchingUp] = useState(false)
  const [catchUpError, setCatchUpError] = useState<string | null>(null)

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!newNote.trim()) return
    setAdding(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote }),
      })
      const data = await res.json()
      if (res.ok) { setNotes([data, ...notes]); setNewNote(''); setSummary(null) }
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(noteId: string) {
    await fetch(`/api/clients/${clientId}/notes`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteId }),
    })
    setNotes(notes.filter((n) => n.id !== noteId))
    setSummary(null)
  }

  async function handleCatchUp() {
    setCatchingUp(true)
    setCatchUpError(null)
    setSummary(null)
    try {
      const res = await fetch('/api/ai/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCatchUpError(data.error === 'NO_NOTES' ? 'Add some notes first.' : 'Could not generate summary.')
        return
      }
      setSummary(data.summary)
    } catch {
      setCatchUpError('Could not generate summary.')
    } finally {
      setCatchingUp(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Notes</p>
        {notes.length > 0 && (
          <button type="button" onClick={handleCatchUp} disabled={catchingUp}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {catchingUp ? 'Thinking...' : 'Catch me up'}
          </button>
        )}
      </div>

      {summary && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Pre-call briefing</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{summary}</p>
          <button type="button" onClick={() => setSummary(null)} className="mt-3 text-xs text-gray-400 hover:text-gray-600">
            Dismiss
          </button>
        </div>
      )}

      {catchUpError && <p className="text-sm text-red-600">{catchUpError}</p>}

      <form onSubmit={handleAddNote} className="flex gap-2">
        <input
          type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note — anything about this client worth remembering..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
        <button type="submit" disabled={!newNote.trim() || adding}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50">
          {adding ? '...' : 'Add'}
        </button>
      </form>

      {notes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center">
          <p className="text-sm text-gray-400">No notes yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white shadow-sm px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm text-gray-700">{note.content}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {new Date(note.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <button type="button" onClick={() => handleDelete(note.id)} className="shrink-0 text-xs text-gray-300 hover:text-red-500">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
