import { useState, useRef, useEffect, useCallback } from "react";
import { searchStocks } from "../api/market";
import type { SearchResult } from "../api/types";

interface Props {
  onSelect: (symbol: string) => void;
  loading?: boolean;
  onSearchChange?: (query: string) => void;
  placeholder?: string;
}

export default function AutocompleteSearch({ onSelect, loading, onSearchChange, placeholder = "Search company or symbol…" }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setSearching(true);
    try {
      const res = await searchStocks(q);
      setResults(res);
      setIsOpen(res.length > 0);
      setHighlighted(-1);
    } catch {
      setResults([]);
      setIsOpen(false);
    } finally {
      setSearching(false);
    }
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(value);
      onSearchChange?.(value);
    }, 300);
  }

  function handleSelect(result: SearchResult) {
    setQuery(result.symbol);
    setIsOpen(false);
    onSelect(result.symbol);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      handleSelect(results[highlighted]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="search-wrap">
      <form
        className="search-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (results.length > 0) {
            handleSelect(results[Math.max(0, highlighted)]);
          } else if (query.trim()) {
            onSelect(query.trim().toUpperCase());
          }
        }}
      >
        <div className="search-input-wrap">
          <span className="search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setIsOpen(true)}
            placeholder={placeholder}
            autoComplete="off"
          />
          {searching && <span className="search-spinner">⋯</span>}
        </div>
        <button type="submit" disabled={loading} className="primary">
          {loading ? "…" : "Search"}
        </button>
      </form>

      {isOpen && (
        <div ref={dropdownRef} className="search-dropdown">
          {results.map((r, i) => (
            <div
              key={r.symbol}
              className={`search-item${i === highlighted ? " highlighted" : ""}`}
              onClick={() => handleSelect(r)}
              onMouseEnter={() => setHighlighted(i)}
              role="option"
              aria-selected={i === highlighted}
            >
              <div>
                <span className="search-item-symbol">{r.symbol}</span>
                <span className="search-item-name">
                  {r.shortname.length > 40 ? r.shortname.slice(0, 40) + "…" : r.shortname}
                </span>
              </div>
              <span className="search-item-badge">
                {r.exchange} · {r.quoteType.slice(0, 3).toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
