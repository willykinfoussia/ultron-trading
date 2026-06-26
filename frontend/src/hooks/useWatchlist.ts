import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "ultron-watchlist";

export interface WatchlistItem {
  symbol: string;
  added_at: string;
  note: string;
}

export interface WatchlistAPI {
  items: WatchlistItem[];
  add: (symbol: string) => void;
  remove: (symbol: string) => void;
  toggle: (symbol: string) => void;
  isWatched: (symbol: string) => boolean;
  updateNote: (symbol: string, note: string) => void;
  clear: () => void;
  symbols: string[];
}

function loadFromStorage(): WatchlistItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function saveToStorage(items: WatchlistItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export default function useWatchlist(): WatchlistAPI {
  const [items, setItems] = useState<WatchlistItem[]>(() => loadFromStorage());

  useEffect(() => {
    saveToStorage(items);
  }, [items]);

  const add = useCallback((symbol: string) => {
    setItems((prev) => {
      if (prev.some((i) => i.symbol === symbol)) return prev;
      return [
        ...prev,
        { symbol: symbol.toUpperCase(), added_at: new Date().toISOString(), note: "" },
      ];
    });
  }, []);

  const remove = useCallback((symbol: string) => {
    setItems((prev) => prev.filter((i) => i.symbol !== symbol));
  }, []);

  const toggle = useCallback((symbol: string) => {
    setItems((prev) => {
      if (prev.some((i) => i.symbol === symbol)) {
        return prev.filter((i) => i.symbol !== symbol);
      }
      return [
        ...prev,
        { symbol: symbol.toUpperCase(), added_at: new Date().toISOString(), note: "" },
      ];
    });
  }, []);

  const isWatched = useCallback(
    (symbol: string) => items.some((i) => i.symbol === symbol),
    [items]
  );

  const updateNote = useCallback((symbol: string, note: string) => {
    setItems((prev) =>
      prev.map((i) => (i.symbol === symbol ? { ...i, note } : i))
    );
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const symbols = items.map((i) => i.symbol);

  return { items, add, remove, toggle, isWatched, updateNote, clear, symbols };
}
