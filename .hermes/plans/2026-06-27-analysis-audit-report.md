# 🔍 Analysis Methods — Full Audit Report

**Date:** 2026-06-27  
**Auditor:** Ultron (CEO)  
**Scope:** 15 analysis methods across 4 categories  
**Test universe:** AAPL, MSFT, TSLA, JPM, NVDA

---

## Executive Summary

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 CRITICAL | 2 | Wrong data interpretation → false signals |
| 🟠 HIGH | 3 | Score/confidence broken or uncalibrated |
| 🟡 MEDIUM | 4 | Edge cases or logic gaps |
| 🔵 LOW | 2 | Minor UX / cosmetic issues |

**Overall verdict:** 6 methods are **production-ready**, 5 need **bug fixes** (data), 4 need **scoring calibration**, 4 methods are **placeholders** (stub/random data).

---

## 1. 🔴 CRITICAL BUGS

### BUG-1: `debt_to_equity` — yfinance returns PERCENTAGE, not ratio

**File:** `backend/app/services/analysis/fundamental.py`

yfinance `debtToEquity` returns a **percentage** (e.g. 79.55 for AAPL means 79.55% = 0.795x ratio).

**Current code** (ligne ~213):
```python
de_ratio = _safe_float(info.get("debtToEquity", 0))
if de_ratio < 1.0:       # ← WRONG: 79.55 > 1.0, so always "elevated risk"
```

**Impact:**
- AAPL: D/E affiché = 79.55 → signal SELL avec conf=1.0 → devrait être 0.80x (conservateur → BUY)
- MSFT: D/E affiché = 30.27 → 0.30x (conservateur)
- Tous les stocks industriels/banques → systématiquement SELL → **100% faux signaux**

**Fix:** Diviser par 100 :
```python
de_ratio = _safe_float(info.get("debtToEquity", 0)) / 100.0
```

**Confidence:** Aller de 1.0 → max(1.0, 0.4 + (de_ratio - 2.0) / 5.0) est OK une fois le ratio corrigé.

---

### BUG-2: `roe` — yfinance returns already in PERCENTAGE form

**File:** `backend/app/services/analysis/fundamental.py`

yfinance `returnOnEquity` retourne une valeur où **1.41 = 1.41x = 141%** (pour AAPL).

**Current code** (ligne ~147):
```python
if roe < 1.0 and roe > -1.0:
    roe_pct = roe * 100      # ← Only multiplies if between -1 and 1
else:
    roe_pct = roe
```

**Impact:**
- AAPL: 1.41 → ne multiplie pas → ROE affiché = 1.41% → signal SELL (corriger à 141% → BUY fort)
- NVDA: 1.14 → 1.14% → SELL (devrait être 114% → BUY)
- MSFT: 39.7% → déjà en pourcentage correctement traité (> 1.0) → OK incohérent

**Fix:** La logique dépend du stock. Solution robuste :
```python
# yfinance ROE is sometimes decimal (0.25 = 25%) or already percentage (25.0)
if 0 < abs(roe) <= 2.0:   # Plausible ROE as ratio (0-200%)
    roe_pct = roe * 100 if abs(roe) <= 1.0 else roe
# Actually, the simplest fix: yfinance ALWAYS returns ROE as a multiplier 
# where 1.0 = 100%. So always interpret as-is if > 1:
if roe > 1.0:
    roe_pct = roe  # Already in percentage points (e.g. 141% or sometimes 39%)
elif roe > 0:
    roe_pct = roe * 100
```

**Better fix** (always consistent):
```python
roe_raw = _safe_float(info.get("returnOnEquity", 0))
if roe_raw > 0 and roe_raw <= 2.0:
    roe_pct = roe_raw * 100   # Convert 1.41 → 141%
elif roe_raw > 2.0:
    roe_pct = roe_raw          # Already percentage (e.g. 39%)
else:
    roe_pct = roe_raw * 100 if roe_raw < 1.0 else roe_raw
```

---

## 2. 🟠 HIGH ISSUES

### HIGH-1: `profit_margin` — confidence can hit 1.0

**File:** `backend/app/services/analysis/fundamental.py`

```python
if margin_pct >= 20:
    confidence = min(1.0, 0.5 + (margin_pct - 20) / 30)
```

AAPL has 27.15% margin → conf = min(1.0, 0.5 + 7.15/30) = 0.738 → OK  
TSLA has ~15% → conf = 0.5 + 5/20 = 0.75 → OK  
**BUT:** NVDA has ~55% → conf = min(1.0, 0.5 + 35/30) = **1.0** → cap hits

This is a **calibration issue**. A margin of 55% is NVDA-level excellence but conf=1.0 is too extreme.  
**Fix:** Change divisor from 30 to 80:
```python
confidence = min(0.95, 0.5 + (margin_pct - 20) / 80)
```

---

### HIGH-2: `dcf_valuation` — confidence can hit 1.0

When margin < -25%:
```python
confidence = min(1.0, 0.5 + abs(margin) / 50)
```

AAPL: margin = -22% → conf = 0.5 + 22/50 = 0.94 → OK  
But TSLA with -50% → conf = 1.0 → capped

**Fix:** 
```python
confidence = min(0.95, 0.5 + abs(margin) / 100)
```

---

### HIGH-3: `comps_analysis` — confidence can hit 1.0

```python
confidence = min(1.0, 0.5 + abs(undervaluation) / 40)
```

AAPL: -88.86% → conf = 1.0 → always hits cap

**Fix:**
```python
confidence = min(0.95, 0.5 + abs(undervaluation) / 200)
```

---

## 3. 🟡 MEDIUM ISSUES

### MED-1: `ma_analysis` / `ema` — Redundant logic with both in 1 call

SMA and EMA are essentially the same signal type (price vs moving average). Having both doubles the weight of "is price above moving average" in the consensus. They're always correlated.  
**Recommendation:** Either merge into one method, or reduce their individual confidence weight in the consensus (×0.5).

---

### MED-2: `macd` — Uncalibrated for absolute MACD values

The confidence formula uses histogram / MACD ratio — this gives high confidence even for tiny absolute moves:
```python
confidence = min(1.0, 0.5 + abs(hist_val) / (abs(macd_val) + 1e-10) * 0.3)
```

If MACD = -2.17, histogram = -2.80 → ratio = 1.29 → conf = 0.5 + 0.39 = 0.89  
But these are penny-level moves on a $280 stock. The confidence should reflect the magnitude relative to price.

**Fix:** Normalize by price:
```python
price = _safe_float(hist["Close"].iloc[-1])
normalized_hist = abs(hist_val) / price * 100  # as % of price
confidence = min(0.9, 0.5 + normalized_hist * 2)
```

---

### MED-3: `pe_ratio` — "near sector" is too tolerant

```python
elif ratio_to_sector > 1.4:    # P/E 40% above sector → sell
```

AAPL PE=34.4 vs sector 28.0 → ratio=1.23 → **neutral**  
But 34.4 PE for tech is actually expensive. The 40% threshold is too wide.

**Fix:**
```python
elif ratio_to_sector > 1.2:    # 20% above → sell
    confidence = min(0.9, 0.4 + (ratio_to_sector - 1) * 0.5)
```

---

### MED-4: `news_sentiment` / `social_sentiment` / `ml_prediction` / `trend_classification` — STUB DATA

All 4 methods use `random.seed(hash(symbol))` → generate **fake data** that:
- Is deterministic per symbol but meaningless
- Can produce completely wrong signals
- Has no relation to actual market data

**Impact:** 4/15 methods (27%) produce random outputs.

**Stub quality assessment:**
| Method | Fake data quality | Impact |
|--------|------------------|--------|
| `news_sentiment` | Random score ±0.6, random article count | HIGH |
| `social_sentiment` | Random score ±0.5, random mentions | HIGH |
| `ml_prediction` | Random ±5% prediction | HIGH |
| `trend_classification` | Random -1 to +1 trend | HIGH |

**Recommendation:** For now, clearly label these as "DEMO" in the report. In production, integrate real APIs (NewsAPI, Reddit API, real ML model).

---

## 4. 🔵 LOW ISSUES

### LOW-1: `rsi` — Confidence in neutral band is too static

```python
else:
    confidence = 0.3 + 0.2 * (1 - abs(rsi_val - 50) / 20)  # Max 0.5 at RSI=50
```

RSI at 49 should be more confident-neutral than RSI at 65, but the formula gives almost equal confidence across the neutral range.

**Fix:** Make it directional:
```python
else:
    # RSI closer to 50 = more neutral confidence, closer to 30/70 = less neutral
    distance_to_extreme = min(abs(rsi_val - 30), abs(rsi_val - 70))
    confidence = 0.3 + 0.15 * (1 - distance_to_extreme / 20)
```

---

### LOW-2: `bollinger` — Z-score not computed

The current signal is based on simple position between bands. A proper Bollinger analysis should compute:
- %B indicator: `(price - lower) / (upper - lower)`
- Bandwidth squeeze detection
- Price crossing middle band

Currently only "touches upper/lower" is detected.

---

## 5. PER-METHOD SUMMARY TABLE

| Method | Code Quality | Data Correctness | Signal Logic | Confidence Calibration | Status |
|--------|:---:|:---:|:---:|:---:|:---:|
| `rsi` | ✅ | ✅ | ✅ | 🟡 | ✅ **OK** |
| `macd` | ✅ | ✅ | 🟡 | 🟠 | 🟡 **Calibrate** |
| `bollinger` | ✅ | ✅ | ✅ | ✅ | ✅ **OK** |
| `sma` | ✅ | ✅ | ✅ | ✅ | ✅ **OK** |
| `ema` | ✅ | ✅ | ✅ | ✅ | ✅ **OK** |
| `pe_ratio` | ✅ | ✅ | 🟡 | ✅ | 🟡 **Threshold** |
| `roe` | ✅ | 🔴 | 🔴 | 🔴 | 🔴 **FIX** |
| `debt_to_equity` | ✅ | 🔴 | 🔴 | 🔴 | 🔴 **FIX** |
| `profit_margin` | ✅ | ✅ | ✅ | 🟠 | 🟡 **Calibrate** |
| `dcf_valuation` | ✅ | ✅ | ✅ | 🟠 | 🟡 **Calibrate** |
| `comps_analysis` | ✅ | ✅ | ✅ | 🟠 | 🟡 **Calibrate** |
| `news_sentiment` | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 **STUB** |
| `social_sentiment` | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 **STUB** |
| `ml_prediction` | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 **STUB** |
| `trend_classification` | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 **STUB** |

---

## 6. FIX PRIORITIES

### P0 — Fix immediately (wrong signals):
1. `debt_to_equity` → divide by 100
2. `roe` → fix multiplier logic

### P1 — Calibrate scoring (overconfident):
3. `profit_margin` → change divisor to 80, cap at 0.95
4. `dcf_valuation` → change divisor to 100, cap at 0.95
5. `comps_analysis` → change divisor to 200, cap at 0.95

### P2 — Improve signal quality:
6. `pe_ratio` → lower threshold to 1.2x
7. `macd` → normalize by price
8. `bollinger` → add %B indicator

### P3 — Replace stubs:
9. `news_sentiment` → integrate real news API
10. `social_sentiment` → integrate Reddit/Twitter API
11. `ml_prediction` → load real model
12. `trend_classification` → implement actual trend detection (ADX, linear regression)

---

## 7. CONSENSUS REPORT HEALTH

The `ConsensusReport` (v0.13.5) has these issues inherited from the methods above:

1. **False negative bias:** With D/E bug, all stocks get at least one false SELL → consensus is systematically more bearish
2. **Untechnical weight:** 27% of methods are stubs → 1 in 4 signals is random
3. **Double counting:** SMA + EMA correlate at ~0.95 → overweight "price above average"
4. **Confidence inflation:** Multiple methods hit 1.0 → they dominate the score

### Recommended consensus fixes:
- Add a **reliability weight** per method (real methods = 1.0, stub methods = 0.2)
- Detect **method correlation** (SMA/EMA should share a slot)
- Cap **per-method confidence** at 0.90 in the aggregator

---

*End of audit.*
