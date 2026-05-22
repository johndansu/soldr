'use client'

import { useState } from 'react'

export function ApiKeyForm({ initialKeySet }: { initialKeySet: boolean }) {
  const [keySet, setKeySet] = useState(initialKeySet)
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!apiKey.trim()) return
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/settings/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error === 'INVALID_KEY_FORMAT'
          ? 'Key must start with sk-ant-. Check you copied it correctly.'
          : 'Could not save key. Try again.')
        return
      }
      setKeySet(true)
      setApiKey('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Could not save key. Try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    setError(null)
    try {
      await fetch('/api/settings/api-key', { method: 'DELETE' })
      setKeySet(false)
      setSuccess(false)
    } catch {
      setError('Could not remove key. Try again.')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Anthropic API Key</h2>
        <p className="mt-1 text-sm text-gray-500">
          Your key is encrypted with AES-256-GCM and never exposed to the browser.
          Get yours at{' '}
          <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-900">
            console.anthropic.com
          </a>.
        </p>
      </div>

      {keySet && (
        <div className="flex items-center justify-between rounded-md bg-green-50 border border-green-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-green-600 text-sm font-medium">✓ API key saved</span>
            <span className="text-green-500 text-xs">sk-ant-••••••••••••••••</span>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
          >
            {removing ? 'Removing...' : 'Remove'}
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {keySet ? 'Replace key' : 'Add key'}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-api03-..."
            autoComplete="off"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">Key saved successfully.</p>}
        <button
          type="submit"
          disabled={!apiKey.trim() || saving}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : keySet ? 'Replace key' : 'Save key'}
        </button>
      </form>
    </div>
  )
}
