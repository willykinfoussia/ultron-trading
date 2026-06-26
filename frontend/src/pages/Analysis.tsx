import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAnalysisMethods, getAnalysisCategories } from "../api/analysis";
import type { AnalysisMethod } from "../api/types";
import AnalysisDetailPage from "./AnalysisDetailPage";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";

const STAGGER = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const },
};

const CATEGORY_ORDER = ["all", "technical", "fundamental", "sentiment", "ml"];

interface Props {
  symbol?: string;
}

export default function Analysis({ symbol = "AAPL" }: Props) {
  const [methods, setMethods] = useState<AnalysisMethod[]>([]);
  const [categories, setCategories] = useState<string[]>(["all"]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMethods = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meths, cats] = await Promise.all([
        getAnalysisMethods(),
        getAnalysisCategories(),
      ]);
      setMethods(meths);
      const catNames = ["all", ...cats.map((c) => c.category.toLowerCase())];
      const ordered = CATEGORY_ORDER.filter((c) => catNames.includes(c));
      const rest = catNames.filter((c) => !CATEGORY_ORDER.includes(c));
      setCategories([...ordered, ...rest]);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  const filteredMethods =
    activeCategory === "all"
      ? methods
      : methods.filter(
          (m) => m.category.toLowerCase() === activeCategory.toLowerCase()
        );

  // Detail view
  if (selectedMethodId) {
  return (
  <AnalysisDetailPage
    symbol={symbol}
    methodId={selectedMethodId}
    onBack={() => setSelectedMethodId(null)}
  />
  );
  }

  // Overview
  return (
    <div className="page page-stagger">
      <motion.div {...STAGGER}>
        <PageHeader
          title="Analysis"
          meta={`${symbol} — ${methods.length} methods available`}
        />
      </motion.div>

      {error && (
        <motion.div {...STAGGER} className="card" style={{ borderColor: "var(--danger-border)" }}>
          <div className="card-body text-danger">Error: {error}</div>
        </motion.div>
      )}

      {loading && (
        <div className="card">
          <div className="card-body">
            <div className="loading-center" style={{ padding: "var(--sp-6)" }}>
              <Spinner size="lg" />
              <p style={{ color: "var(--text-2)", marginTop: "var(--sp-3)" }}>
                Loading analysis methods...
              </p>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Category filter */}
          <motion.div {...STAGGER} transition={{ ...STAGGER.transition, delay: 0.05 }}>
            <div className="analysis-category-filter">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={"chip " + (activeCategory === cat ? "active" : "")}
                  style={{ textTransform: "capitalize" }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Method cards grid */}
          <motion.div {...STAGGER} transition={{ ...STAGGER.transition, delay: 0.07 }}>
            <div className="analysis-grid">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCategory}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="analysis-grid-inner"
                >
                  {filteredMethods.map((method, i) => (
                    <motion.div
                      key={method.method_id}
                      className="analysis-card"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.03 }}
                      whileHover={{ y: -2 }}
                    >
                      <div className="analysis-card-header">
                        <div>
                          <h4 className="analysis-card-title">{method.method_name}</h4>
                          <span className="analysis-card-category">{method.category}</span>
                        </div>
                      </div>
                      <p className="analysis-card-desc">{method.description}</p>
                      <div className="analysis-card-footer">
                        <span className="analysis-card-pros-count">
                          ✅ {method.pros.length} pros
                        </span>
                        <button
                          className="btn-view-details"
                          onClick={() => setSelectedMethodId(method.method_id)}
                        >
                          View Details →
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
