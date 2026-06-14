import { useState } from 'react'

interface Props {
  onSearch: (symbol: string) => void
  loading: boolean
}

export default function SearchBar({ onSearch, loading }: Props) {
  const [value, setValue] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (value.trim()) {
      onSearch(value.trim().toUpperCase())
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search stock (e.g. AAPL)"
        style={{
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          fontSize: '0.9rem',
          width: '200px',
        }}
      />
      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          border: 'none',
          background: 'var(--accent)',
          color: '#fff',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? '...' : 'Search'}
      </button>
    </form>
  )
}
