# Plan — Analyse complète dans la page Stock

## Contexte
La page Stock onglet "Analysis" utilise un composant `EmbeddedAnalysis` avec une liste hardcodée de 5 méthodes techniques (rsi, macd, bollinger, sma, ema). Le backend a pourtant **13 méthodes** dans 4 catégories (technical, fundamental, sentiment, ml). Il faut exposer toutes les méthodes dans l'onglet Analysis de la page Stock.

## Objectif
- Remplacer la liste statique par un chargement dynamique depuis `/api/analysis/`
- Permettre de lancer une méthode individuellement ou toutes les méthodes
- Afficher les résultats avec signaux (buy/sell/hold) et barre de confiance
- Permettre d'aller vers la page de détail pour chaque méthode

## Tâches

### 1. Refactoriser EmbeddedAnalysis (frontend)
- **Fichier** : `frontend/src/components/EmbeddedAnalysis.tsx`
- Remplacer `AVAILABLE_METHODS` statique par un fetch depuis `/api/analysis/`
- Ajouter un sélecteur de catégorie (tabs : All / Technical / Fundamental / Sentiment / ML)
- Ajouter un bouton "Run All" qui appelle `/api/analysis/{symbol}/all`
- Garder le reste de l'affichage (AnalysisCard, résultats, loading, errors)

### 2. Mettre à jour AnalysisCard pour navigation (frontend)
- **Fichier** : `frontend/src/components/analysis/AnalysisCard.tsx`
- Ajouter un bouton "View Full Analysis" qui navigue vers `/analysis/{symbol}/{method_id}`
- Garder le expand/collapse existant

### 3. Ajouter route AnalysisDetail dans App (frontend)
- **Fichier** : `frontend/src/App.tsx` (ou routeur existant)
- Route : `/analysis/:symbol/:methodId` → composant `AnalysisDetailPage`
- La page de détail existe déjà (`pages/AnalysisDetail.tsx`), il faut juste la router correctement

### 4. Bump version
- `0.12.3` → `0.13.0`

### 5. Build + Deploy
- `npm run build` frontend
- `chmod -R o+rX dist/`
- Restart backend
- Reload nginx
