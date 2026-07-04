# Analysis Consensus Report — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** When user clicks "Run All Analysis", execute all 13 analysis methods and generate a synthetic consensus report that produces a clear BUY/SELL/HOLD recommendation with supporting evidence from all categories.

**Architecture:** The frontend already receives all 13 results from `GET /api/analysis/{symbol}/all`. We will create a `ConsensusReport` component that aggregates results by category, computes a weighted score (-100 to +100), and displays a visual report with: overall verdict, per-category breakdown, conflicting signals, and actionable insights. No backend changes needed — the API already returns everything.

**Tech Stack:** React + TypeScript, Framer Motion, Recharts (already installed)

---

## Current State

- `GET /api/analysis/{symbol}/all` returns flat list of 13 `AnalysisResult` objects
- Each result has: `signal` (buy/sell/hold/neutral), `confidence` (0-1), `category`, `method_name`, `explanation`, `result`
- `EmbeddedAnalysis.tsx` already calls `runAllAnalysis(symbol, "all")` and stores in `results` state
- Currently just displays results as cards via `AnalysisCard`
- Categories: `technical` (7 methods), `fundamental` (4 methods), `sentiment` (2 methods), `ml` (2 methods)

---

## Task 1: Create ConsensusReport Component

**Objective:** Build the core consensus engine + visual report UI

**Files:**
- Create: `frontend/src/components/ConsensusReport.tsx`

**Step 1: Create the file with consensus logic**

```tsx
import { useMemo } from "react";
import { motion } from "framer-motion";
import type { AnalysisResult } from "../api/types";

interface ConsensusReportProps {
  symbol: string;
  results: AnalysisResult[];
}

interface CategorySummary {
  category: string;
  buyCount: number;
  sellCount: number;
  holdCount: number;
  neutralCount: number;
  avgConfidence: number;
  weightedSignal: number; // -100 to +100
  methods: AnalysisResult[];
}

function computeConsensus(results: AnalysisResult[]) {
  // Group by category
  const byCategory = new Map<string, AnalysisResult[]>();
  for (const r of results) {
    const list = byCategory.get(r.category) || [];
    list.push(r);
    byCategory.set(r.category, list);
  }

  // Compute per-category summaries
  const categories: CategorySummary[] = [];
  let totalBuy = 0, totalSell = 0, totalHold = 0, totalNeutral = 0;
  let globalWeightedSignal = 0;
  let totalWeight = 0;

  for (const [category, methods] of byCategory) {
    let buy = 0, sell = 0, hold = 0, neutral = 0;
    let catWeighted = 0, catWeight = 0;

    for (const m of methods) {
      const weight = m.confidence;
      switch (m.signal) {
        case "buy": buy++; totalBuy++; catWeighted += weight * 100; catWeight += weight; break;
        case "sell": sell++; totalSell++; catWeighted += weight * -100; catWeight += weight; break;
        case "hold": hold++; totalHold++; catWeighted += weight * 20; catWeight += weight; break;
        case "neutral": neutral++; totalNeutral++; break;
      }
    }

    const avgConf = methods.reduce((s, m) => s + m.confidence, 0) / methods.length;
    const weighted = catWeight > 0 ? catWeighted / catWeight : 0;

    categories.push({
      category, buyCount: buy, sellCount: sell, holdCount: hold, neutralCount: neutral,
      avgConfidence: avgConf, weightedSignal: weighted, methods,
    });

    globalWeightedSignal += weighted * catWeight;
    totalWeight += catWeight;
  }

  const overallScore = totalWeight > 0 ? globalWeightedSignal / totalWeight : 0;

  // Determine verdict
  let verdict: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
  if (overallScore >= 60) verdict = "STRONG_BUY";
  else if (overallScore >= 25) verdict = "BUY";
  else if (overallScore >= -25) verdict = "HOLD";
  else if (overallScore >= -60) verdict = "SELL";
  else verdict = "STRONG_SELL";

  // Detect conflicts
  const conflicts: string[] = [];
  const techCat = categories.find(c => c.category === "technical");
  const fundCat = categories.find(c => c.category === "fundamental");
  if (techCat && fundCat) {
    if (techCat.weightedSignal > 30 && fundCat.weightedSignal < -30)
      conflicts.push("Technical signals bullish but fundamentals bearish — trend may be unsustainable");
    if (techCat.weightedSignal < -30 && fundCat.weightedSignal > 30)
      conflicts.push("Fundamentals strong but technicals weak — possible buying opportunity on dip");
  }

  // Key insights
  const insights: string[] = [];
  const topBuy = [...results].sort((a, b) => (b.confidence === "buy" ? b.confidence : 0) - (a.confidence === "buy" ? a.confidence : 0)).filter(r => r.signal === "buy").slice(0, 3);
  const topSell = [...results].filter(r => r.signal === "sell").sort((a, b) => b.confidence - a.confidence).slice(0, 3);

  if (topBuy.length > 0) insights.push(`Strongest buy signals: ${topBuy.map(m => m.method_name).join(", ")}`);
  if (topSell.length > 0) insights.push(`Strongest sell signals: ${topSell.map(m => m.method_name).join(", ")}`);

  return { categories, overallScore, verdict, conflicts, insights, totalMethods: results.length };
}

export default function ConsensusReport({ symbol, results }: ConsensusReportProps) {
  const report = useMemo(() => computeConsensus(results), [results]);

  const verdictColors: Record<string, string> = {
    STRONG_BUY: "#10b981",
    BUY: "#34d399",
    HOLD: "#fbbf24",
    SELL: "#f87171",
    STRONG_SELL: "#ef4444",
  };

  const verdictLabels: Record<string, string> = {
    STRONG_BUY: "🟢 STRONG BUY",
    BUY: "🟢 BUY",
    HOLD: "🟡 HOLD",
    SELL: "🔴 SELL",
    STRONG_SELL: "🔴 STRONG SELL",
  };

  const categoryLabels: Record<string, string> = {
    technical: "Technical Analysis",
    fundamental: "Fundamental Analysis",
    sentiment: "Sentiment Analysis",
    ml: "Machine Learning",
  };

  return (
    <motion.div
      className="consensus-report"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Verdict Header */}
      <div className="consensus-verdict" style={{ borderColor: verdictColors[report.verdict] }}>
        <div className="consensus-verdict-header">
          <h2 style={{ color: verdictColors[report.verdict] }}>
            {verdictLabels[report.verdict]}
          </h2>
          <span className="consensus-score">
            Score: {Math.round(report.overallScore)}
          </span>
        </div>
        <div className="consensus-meter">
          <div
            className="consensus-meter-fill"
            style={{
              width: `${Math.abs(report.overallScore)}%`,
              backgroundColor: verdictColors[report.verdict],
              marginLeft: report.overallScore < 0 ? `${50 + report.overallScore / 2}%` : "50%",
            }}
          />
          <div className="consensus-meter-center" />
        </div>
        <div className="consensus-meter-labels">
          <span>← Sell</span>
          <span>Neutral</span>
          <span>Buy →</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="consensus-stats">
        <div className="consensus-stat">
          <span className="consensus-stat-value">{report.totalMethods}</span>
          <span className="consensus-stat-label">Methods</span>
        </div>
        <div className="consensus-stat">
          <span className="consensus-stat-value" style={{ color: "#10b981" }}>
            {results.filter(r => r.signal === "buy").length}
          </span>
          <span className="consensus-stat-label">Buy</span>
        </div>
        <div className="consensus-stat">
          <span className="consensus-stat-value" style={{ color: "#ef4444" }}>
            {results.filter(r => r.signal === "sell").length}
          </span>
          <span className="consensus-stat-label">Sell</span>
        </div>
        <div className="consensus-stat">
          <span className="consensus-stat-value" style={{ color: "#fbbf24" }}>
            {results.filter(r => r.signal === "hold" || r.signal === "neutral").length}
          </span>
          <span className="consensus-stat-label">Hold/Neutral</span>
        </div>
      </div>

      {/* Per-Category Breakdown */}
      <div className="consensus-categories">
        <h3>Category Breakdown</h3>
        {report.categories.map(cat => (
          <div key={cat.category} className="consensus-category">
            <div className="consensus-category-header">
              <span className="consensus-category-name">
                {categoryLabels[cat.category] || cat.category}
              </span>
              <span
                className="consensus-category-signal"
                style={{ color: cat.weightedSignal > 20 ? "#10b981" : cat.weightedSignal < -20 ? "#ef4444" : "#fbbf24" }}
              >
                {cat.weightedSignal > 20 ? "▲ Bullish" : cat.weightedSignal < -20 ? "▼ Bearish" : "● Neutral"}
                {" "}({Math.round(cat.weightedSignal)})
              </span>
            </div>
            <div className="consensus-category-bar">
              <div
                style={{
                  width: `${Math.abs(cat.weightedSignal)}%`,
                  backgroundColor: cat.weightedSignal > 0 ? "#10b981" : "#ef4444",
                  marginLeft: cat.weightedSignal < 0 ? `${50 + cat.weightedSignal / 2}%` : "50%",
                  height: "100%",
                  borderRadius: "4px",
                  transition: "width 0.3s ease",
                }}
              />
              <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: "2px", background: "var(--border)", }} />
            </div>
            <div className="consensus-category-methods">
              {cat.methods.map(m => (
                <span
                  key={m.method_id}
                  className={`consensus-method-tag ${m.signal}`}
                  title={m.explanation}
                >
                  {m.method_name} ({m.signal}, {Math.round(m.confidence * 100)}%)
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Conflicts */}
      {report.conflicts.length > 0 && (
        <div className="consensus-conflicts">
          <h3>⚠️ Conflicts Detected</h3>
          {report.conflicts.map((c, i) => (
            <div key={i} className="consensus-conflict">{c}</div>
          ))}
        </div>
      )}

      {/* Key Insights */}
      {report.insights.length > 0 && (
        <div className="consensus-insights">
          <h3>💡 Key Insights</h3>
          <ul>
            {report.insights.map((insight, i) => (
              <li key={i}>{insight}</li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd /home/opc/ultron-trading/frontend && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
cd /home/opc/ultron-trading
git add frontend/src/components/ConsensusReport.tsx
git commit -m "feat: add ConsensusReport component with weighted scoring engine"
```

---

## Task 2: Integrate ConsensusReport into EmbeddedAnalysis

**Objective:** Show the consensus report after "Run All Analysis" completes

**Files:**
- Modify: `frontend/src/components/EmbeddedAnalysis.tsx`

**Step 1: Import ConsensusReport**

Add at top:
```tsx
import ConsensusReport from "./ConsensusReport";
```

**Step 2: Render ConsensusReport when results are available**

Replace the current results rendering (lines 142-161) with:

```tsx
{results.length > 0 && !running && (
  <ConsensusReport symbol={symbol} results={results} />
)}
```

**Step 3: Commit**

```bash
cd /home/opc/ultron-trading
git add frontend/src/components/EmbeddedAnalysis.tsx
git commit -m "feat: integrate ConsensusReport into EmbeddedAnalysis results view"
```

---

## Task 3: Add CSS Styles for ConsensusReport

**Objective:** Style the consensus report to match the existing dark theme

**Files:**
- Modify: `frontend/src/styles.css`

**Step 1: Add CSS after `.analysis-results` section**

```css
/* === Consensus Report === */
.consensus-report {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  margin-top: var(--sp-4);
}

.consensus-verdict {
  background: var(--card);
  border: 2px solid var(--border);
  border-radius: 12px;
  padding: var(--sp-5);
  text-align: center;
}

.consensus-verdict-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--sp-4);
}

.consensus-verdict-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.consensus-score {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-2);
  font-family: var(--font-mono);
}

.consensus-meter {
  position: relative;
  height: 12px;
  background: var(--surface-2);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: var(--sp-2);
}

.consensus-meter-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 6px;
  transition: width 0.5s ease;
}

.consensus-meter-center {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--text-2);
  opacity: 0.5;
}

.consensus-meter-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-3);
}

.consensus-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--sp-3);
}

.consensus-stat {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: var(--sp-3);
  text-align: center;
}

.consensus-stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  font-family: var(--font-mono);
}

.consensus-stat-label {
  font-size: 0.75rem;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.consensus-categories {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: var(--sp-4);
}

.consensus-categories h3 {
  margin: 0 0 var(--sp-4) 0;
  font-size: 1rem;
  color: var(--text-1);
}

.consensus-category {
  margin-bottom: var(--sp-4);
}

.consensus-category:last-child {
  margin-bottom: 0;
}

.consensus-category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--sp-2);
}

.consensus-category-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-1);
}

.consensus-category-signal {
  font-size: 0.85rem;
  font-weight: 600;
  font-family: var(--font-mono);
}

.consensus-category-bar {
  position: relative;
  height: 8px;
  background: var(--surface-2);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: var(--sp-2);
}

.consensus-category-methods {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-1);
}

.consensus-method-tag {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--surface-2);
  color: var(--text-2);
  cursor: help;
}

.consensus-method-tag.buy {
  border-left: 3px solid #10b981;
}

.consensus-method-tag.sell {
  border-left: 3px solid #ef4444;
}

.consensus-method-tag.hold,
.consensus-method-tag.neutral {
  border-left: 3px solid #fbbf24;
}

.consensus-conflicts {
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: 12px;
  padding: var(--sp-4);
}

.consensus-conflicts h3 {
  margin: 0 0 var(--sp-3) 0;
  color: #fbbf24;
  font-size: 0.95rem;
}

.consensus-conflict {
  padding: var(--sp-2) var(--sp-3);
  margin-bottom: var(--sp-2);
  background: rgba(251, 191, 36, 0.05);
  border-radius: 6px;
  font-size: 0.85rem;
  color: var(--text-2);
}

.consensus-conflict:last-child {
  margin-bottom: 0;
}

.consensus-insights {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: var(--sp-4);
}

.consensus-insights h3 {
  margin: 0 0 var(--sp-3) 0;
  font-size: 0.95rem;
  color: var(--text-1);
}

.consensus-insights ul {
  margin: 0;
  padding-left: var(--sp-5);
}

.consensus-insights li {
  margin-bottom: var(--sp-2);
  font-size: 0.85rem;
  color: var(--text-2);
  line-height: 1.5;
}

.consensus-insights li:last-child {
  margin-bottom: 0;
}

@media (max-width: 768px) {
  .consensus-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  .consensus-verdict-header {
    flex-direction: column;
    gap: var(--sp-2);
  }
}
```

**Step 2: Commit**

```bash
cd /home/opc/ultron-trading
git add frontend/src/styles.css
git commit -m "style: add ConsensusReport component styles"
```

---

## Task 4: Build, Bump Version, Deploy

**Objective:** Build frontend, bump version, deploy to production

**Step 1: Bump VERSION**

```bash
cd /home/opc/ultron-trading
# Current: 0.13.4 → bump to 0.13.5
echo "0.13.5" > VERSION
```

**Step 2: Build frontend**

```bash
cd frontend && npm run build
```

**Step 3: Set permissions**

```bash
chmod -R o+rX dist/
```

**Step 4: Commit + Push + Deploy**

```bash
cd /home/opc/ultron-trading
git add VERSION frontend/dist frontend/src/components/ConsensusReport.tsx frontend/src/components/EmbeddedAnalysis.tsx frontend/src/styles.css
git commit -m "feat: consensus report with weighted scoring and conflict detection"
git push
sudo systemctl restart ultron-trading
sudo systemctl restart nginx
```

**Step 5: Verify**

1. Navigate to `https://trading.auracopilot.com/stocks/TTWO` (or any stock)
2. Click "Run All Analysis"
3. Wait for results
4. Verify: consensus report appears with verdict, category breakdown, conflicts, insights
5. Ctrl+Shift+R if cached

---

## Verification Checklist

- [ ] `GET /api/analysis/{symbol}/all` returns 13 results
- [ ] ConsensusReport renders after "Run All Analysis"
- [ ] Verdict is consistent with signals (all buy → STRONG_BUY, all sell → STRONG_SELL)
- [ ] Category breakdown shows correct counts
- [ ] Conflicts detected when technical vs fundamental diverge
- [ ] Insights mention top buy/sell methods
- [ ] Mobile responsive (stats grid → 2 columns)
- [ ] Version bumped before commit+push

---

## Risks / Notes

- **Weighted scoring**: Using `confidence * signal_value` where buy=+100, sell=-100, hold=+20, neutral=0. This means high-confidence buy signals dominate. May need tuning.
- **No backend change**: Everything is frontend-only, so the fix for the run-all bug (already deployed) + the new report are independent.
- **Performance**: 13 analyses run in parallel, consensus computation is O(n) — negligible.
- **Existing endpoint**: `GET /api/analysis/{symbol}/all` already exists and works. We just consume it better.
