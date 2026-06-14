import { useState, useRef, useEffect, useCallback } from 'react'
import { searchStocks } from '../api/market'
import type { SearchResult } from '../api/types'

interface Props {
  onSelect: (symbol: string) => void
  loading: boolean
  onSearchChange?: (query: string) => void
}

export default function AutocompleteSearch({ onSelect, loading, onSearchChange }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults([])
      setIsOpen(false)
      return
    }
    setSearching(true)
    try {
      const res = await searchStocks(q)
      setResults(res)
      setIsOpen(res.length > 0)
      setHighlighted(-1)
    } catch {
      setResults([])
      setIsOpen(false)
    } finally {
      setSearching(false)
    }
  }, [])

  function handleChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      doSearch(value)
      onSearchChange?.(value)
    }, 300)
  }

  function handleSelect(result: SearchResult) {
    setQuery(result.symbol)
    setIsOpen(false)
    onSelect(result.symbol)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault()
      handleSelect(results[highlighted])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div style={{ position: 'relative', minWidth: 280 }}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (results.length > 0) {
            handleSelect(results[Math.max(0, highlighted)])
          } else if (query.trim()) {
            onSelect(query.trim().toUpperCase())
          }
        }}
        style={{ display: 'flex', gap: '0.5rem' }}
      >
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setIsOpen(true)}
            placeholder="Search company or symbol..."
            autoComplete="off"
            style={{
              width: '100%',
              padding: '0.6rem 1rem',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {searching && (
            <span style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}>⋯</span>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '10px',
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            opacity: loading ? 0.6 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? '...' : 'Search'}
        </button>
      </form>

      {isOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            maxHeight: 320,
            overflowY: 'auto',
            zIndex: 100,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {results.map((r, i) => (
            <div
              key={r.symbol}
              onClick={() => handleSelect(r)}
              onMouseEnter={() => setHighlighted(i)}
              style={{
                padding: '0.6rem 1rem',
                cursor: 'pointer',
                background: i === highlighted ? 'var(--bg-hover, #1e1e3a)' : 'transparent',
                borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{r.symbol}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                  {r.shortname.length > 40 ? r.shortname.slice(0, 40) + '…' : r.shortname}
                </span>
              </div>
              <span style={{
                fontSize: '0.7rem',
                color: 'var(--text-secondary)',
                background: 'var(--bg-primary)',
                padding: '2px 6px',
                borderRadius: 4,
              }}>
                {r.exchange} · {r.quoteType.slice(0, 3).toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
