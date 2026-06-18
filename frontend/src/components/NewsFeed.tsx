import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getCompanyNews } from "../api/stocks";
import type { NewsItem } from "../api/types";

interface Props {
  symbol: string;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(diffMs) || diffMs < 0) return "";
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  } catch {
    return "";
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function NewsItemCard({ item, index }: { item: NewsItem; index: number }) {
  const ago = timeAgo(item.providerPublishTime);
  const dateFormatted = formatDate(item.providerPublishTime);

  return (
    <motion.a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="news-item"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        delay: index * 0.04,
        ease: [0.16, 1, 0.3, 1] as const,
      }}
    >
      <div className="news-item-header">
        <span className="news-item-publisher">{item.publisher || "Unknown"}</span>
        <span className="news-item-date">
          {ago ? ago : dateFormatted}
          {ago && dateFormatted && (
            <span className="news-item-date-full"> · {dateFormatted}</span>
          )}
        </span>
      </div>
      <h3 className="news-item-title">{item.title}</h3>
      {item.summary && <p className="news-item-summary">{item.summary}</p>}
      <div className="news-item-link">
        Read more →
      </div>
    </motion.a>
  );
}

function NewsSkeleton() {
  return (
    <div className="news-feed">
      {[1, 2, 3].map((n) => (
        <div key={n} className="news-item">
          <div
            className="skeleton"
            style={{ height: 12, width: "30%", marginBottom: 8 }}
          />
          <div
            className="skeleton"
            style={{ height: 16, width: "85%", marginBottom: 6 }}
          />
          <div
            className="skeleton"
            style={{ height: 12, width: "100%", marginBottom: 4 }}
          />
          <div
            className="skeleton"
            style={{ height: 12, width: "90%", marginBottom: 4 }}
          />
          <div
            className="skeleton"
            style={{ height: 11, width: "45%", marginTop: 6 }}
          />
        </div>
      ))}
    </div>
  );
}

export default function NewsFeed({ symbol }: Props) {
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = () => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCompanyNews(symbol)
      .then((data) => {
        if (!cancelled) {
          setNews(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(String(err));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    const cleanup = fetchNews();
    return cleanup;
  }, [symbol]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <NewsSkeleton />
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="card"
        style={{ borderColor: "var(--danger-border)" }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="error-state">
          <span className="error-state-icon">📰</span>
          <span className="error-state-title">Failed to load news</span>
          <span className="error-state-desc">
            {error.includes("429") || error.includes("rate")
              ? "API rate limit reached. Please wait a moment and try again."
              : `Could not load news for ${symbol}. ${error}`}
          </span>
          <div className="error-state-actions">
            <button className="btn-retry" onClick={fetchNews}>
              ↻ Retry
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!news || news.length === 0) {
    return (
      <motion.div
        className="empty-state"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <span className="empty-state-icon">📰</span>
        <span className="empty-state-title">No news yet</span>
        <span className="empty-state-desc">
          No recent articles found for {symbol}. Check back later.
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="news-feed"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {news.map((item, i) => (
        <NewsItemCard key={`${item.link}-${i}`} item={item} index={i} />
      ))}
    </motion.div>
  );
}
