"""
Analysis Method Metadata — detailed explanations, pros/cons, interpretation guides.
"""

ANALYSIS_METADATA: dict[str, dict] = {
    "rsi": {
        "how_it_works": (
            "Le RSI (Relative Strength Index) est un oscillateur de momentum qui mesure la vitesse "
            "et l'ampleur des mouvements de prix récents sur une échelle de 0 à 100. "
            "Il est calculé en comparant la moyenne des gains et la moyenne des pertes "
            "sur une période donnée (généralement 14 jours). "
            "Un RSI élevé indique que les gains récents ont été importants (momentum haussier), "
            "tandis qu'un RSI bas indique des pertes significatives (momentum baissier)."
        ),
        "pros": [
            "Indicateur efficace pour détecter les situations de surachat (>70) et de survente (<30)",
            "Simple à interpréter avec des niveaux clairs et universels",
            "Fonctionne bien dans des marchés sans tendance forte (range-bound)",
            "Permet d'anticiper les retournements de tendance",
        ],
        "cons": [
            "Peut rester en zone de surachat/survente longtemps lors de tendances fortes",
            "Produit de faux signaux dans les marchés très volatils",
            "Ne donne pas de points d'entrée/sortie précis — confirme seulement la force du momentum",
            "Moins efficace sur les actions à faible volume",
        ],
        "interpretation_guide": {
            "buy_signal": "RSI < 30 et qui remonte = potentiel retournement haussier (survente)",
            "sell_signal": "RSI > 70 et qui redescend = potentiel retournement baissier (surachat)",
            "hold_signal": "RSI entre 30 et 70 = pas de signal clair, maintenir la position",
            "confidence_meaning": "Mesure la force du signal. >70% = signal fiable, <40% = faible fiabilité",
        },
        "example_scenarios": [
            {
                "scenario": "RSI à 25 après une chute de 15% en une semaine",
                "outcome": "Signal d'achat potentiel — l'action est survendue, rebond technique probable",
            },
            {
                "scenario": "RSI à 80 après une hausse de 30% sans correction",
                "outcome": "Signal de vente potentiel — l'action est surachetée, correction probable",
            },
            {
                "scenario": "RSI à 45 dans un marché stable",
                "outcome": "Pas de signal — le momentum est neutre, attendre une confirmation",
            },
        ],
    },
    "macd": {
        "how_it_works": (
            "Le MACD (Moving Average Convergence Divergence) est un indicateur de momentum "
            "suivant la tendance qui montre la relation entre deux moyennes mobiles exponentielles "
            "(EMA) du prix. Il se compose de 3 éléments : la ligne MACD (différence entre EMA 12 et EMA 26), "
            "la ligne signal (EMA 9 du MACD), et l'histogramme (différence entre MACD et signal). "
            "Les croisements entre ces lignes génèrent des signaux d'achat/vente."
        ),
        "pros": [
            "Combine momentum et tendance — deux indicateurs en un",
            "Les croisements MACD/signal sont des signaux clairs et actionnables",
            "L'histogramme montre visuellement la force du momentum",
            "Fonctionne bien sur les marchés en tendance",
        ],
        "cons": [
            "Indicateur retardé (lagging) — signaux après le mouvement",
            "Faux signaux fréquents en marché latéral (range)",
            "Moins efficace pour les mouvements courts et brutaux",
            "Nécessite une confirmation par d'autres indicateurs",
        ],
        "interpretation_guide": {
            "buy_signal": "MACD croise au-dessus de l'EMA 9 = momentum haussier",
            "sell_signal": "MACD croise en dessous de l'EMA 9 = momentum baissier",
            "hold_signal": "MACD proche de zéro sans direction claire = consolider",
            "confidence_meaning": "Basée sur l'amplitude de l'histogramme. Plus il est grand, plus le signal est fiable",
        },
        "example_scenarios": [
            {
                "scenario": "MACD croise au-dessus du signal après une période de consolidation",
                "outcome": "Signal d'achat — début probable d'une tendance haussière",
            },
            {
                "scenario": "MACD et signal convergent vers zéro",
                "outcome": "Perte de momentum — prendre des profits ou attendre",
            },
        ],
    },
    "bollinger": {
        "how_it_works": (
            "Les Bandes de Bollinger sont un indicateur de volatilité composé de trois lignes : "
            "une moyenne mobile simple (SMA 20) au centre, et deux bandes supérieure et inférieure "
            "situées à 2 écarts-types de la SMA. Les bandes s'élargissent quand la volatilité augmente "
            "et se resserrent quand elle diminue. Le prix touchant ou dépassant les bandes "
            "peut signaler des conditions extrêmes."
        ),
        "pros": [
            "S'adapte automatiquement à la volatilité du marché",
            "Identifie les périodes de compression (squeeze) avant les mouvements importants",
            "Permet de détecter les conditions de surachat/survente relatives",
            "Utile pour identifier les breakouts",
        ],
        "cons": [
            "Les bandes ne prédisent pas la direction, seulement la volatilité",
            "Le prix peut 'coller' à une bande longtemps en tendance forte",
            "Faux breakouts fréquents — le prix traverse la bande puis revient",
            "Moins efficace sur les marchés avec gaps fréquents",
        ],
        "interpretation_guide": {
            "buy_signal": "Prix touche ou passe sous la bande inférieure = potentiel rebond",
            "sell_signal": "Prix touche ou passe au-dessus de la bande supérieure = potentiel repli",
            "hold_signal": "Prix entre les bandes = pas de signal extrême",
            "confidence_meaning": "Basée sur la distance par rapport à la bande. Plus le dépassement est grand, plus le signal est fiable",
        },
        "example_scenarios": [
            {
                "scenario": "Prix touche la bande inférieure après un gap baissier",
                "outcome": "Signal d'achat — rebond technique probable vers la moyenne",
            },
            {
                "scenario": "Bandes très resserrement (squeeze) suivi d'un breakout",
                "outcome": "Mouvement directionnel fort à venir — se positionner dans la direction du breakout",
            },
        ],
    },
    "sma": {
        "how_it_works": (
            "La SMA (Simple Moving Average) est la moyenne arithmétique des prix de clôture "
            "sur une période donnée. Elle lisse les fluctuations de prix pour révéler la tendance "
            "sous-jacente. Les traders utilisent souvent deux SMA (courte et longue) "
            "dont les croisements génèrent des signaux. Un prix au-dessus de la SMA = tendance haussière, "
            "en dessous = tendance baissière."
        ),
        "pros": [
            "Très simple à comprendre et à calculer",
            "Efficace pour identifier la direction de la tendance",
            "Les croisements SMA courte/longue sont des signaux classiques éprouvés",
            "Filtre le bruit de court terme",
        ],
        "cons": [
            "Indicateur très retardé — réagit après le mouvement",
            "Inutile en marché latéral (faux signaux de croisement)",
            "Donne le même poids à toutes les périodes (les prix anciens comptent autant que les récents)",
            "Ne fonctionne pas bien avec les gaps de marché",
        ],
        "interpretation_guide": {
            "buy_signal": "Prix croise au-dessus de la SMA ou SMA courte croise au-dessus de la longue",
            "sell_signal": "Prix croise en dessous de la SMA ou SMA courte croise en dessous de la longue",
            "hold_signal": "Prix proche de la SMA sans croisement = tendance indécise",
            "confidence_meaning": "Basée sur l'angle de la SMA et la distance du prix. Plus l'angle est fort, plus la tendance est fiable",
        },
        "example_scenarios": [
            {
                "scenario": "SMA 50 croise au-dessus de la SMA 200 (Golden Cross)",
                "outcome": "Signal d'achat fort — début d'une tendance haussière de long terme",
            },
            {
                "scenario": "Prix oscille autour de la SMA 20 sans direction",
                "outcome": "Marché latéral — éviter de trader sur les signaux SMA",
            },
        ],
    },
    "ema": {
        "how_it_works": (
            "L'EMA (Exponential Moving Average) est similaire à la SMA mais accorde plus de poids "
            "aux prix récents grâce à un facteur de lissage exponentiel. Cela la rend plus réactive "
            "aux changements de prix que la SMA. L'EMA réagit plus rapidement aux nouvelles "
            "informations, ce qui permet de détecter les retournements plus tôt."
        ),
        "pros": [
            "Plus réactive que la SMA — détecte les changements de tendance plus tôt",
            "Donne plus de poids aux données récentes (plus pertinent)",
            "Efficace pour le trading de court terme",
            "Les croisements EMA génèrent des signaux plus rapides que les SMA",
        ],
        "cons": [
            "Plus sensible au bruit de court terme — faux signaux plus fréquents",
            "Peut réagir trop fortement aux gaps ou aux flash crashes",
            "Plus complexe à calculer mentalement que la SMA",
            "Moins lissante que la SMA — plus de 'whipsaws' en marché latéral",
        ],
        "interpretation_guide": {
            "buy_signal": "Prix croise au-dessus de l'EMA ou EMA courte croise au-dessus de la longue",
            "sell_signal": "Prix croise en dessous de l'EMA ou EMA courte croise en dessous de la longue",
            "hold_signal": "Prix proche de l'EMA = tendance indécise",
            "confidence_meaning": "Basée sur l'angle de l'EMA et l'écart avec le prix. Plus l'écart est grand, plus la tendance est forte",
        },
        "example_scenarios": [
            {
                "scenario": "EMA 12 croise au-dessus de l'EMA 26 sur un volume croissant",
                "outcome": "Signal d'achat confirmé — momentum haussier avec participation",
            },
            {
                "scenario": "Prix rebondit sur l'EMA 50 qui sert de support",
                "outcome": "Support dynamique valide — opportunité d'achat sur le pullback",
            },
        ],
    },
    "pe_ratio": {
        "how_it_works": (
            "Le ratio P/E (Price-to-Earnings) compare le cours de l'action au bénéfice par action (EPS). "
            "Un P/E élevé signifie que les investisseurs paient plus pour chaque euro de bénéfice, "
            "ce qui peut indiquer des attentes de croissance élevée. Un P/E bas peut signaler "
            "une sous-évaluation ou des problèmes fondamentaux. "
            "Le ratio est comparé à la moyenne du secteur pour évaluer la valorisation relative."
        ),
        "pros": [
            "Permet de comparer rapidement la valorisation entre entreprises du même secteur",
            "Indicateur largement utilisé et compris par les investisseurs",
            "Utile pour identifier les actions potentiellement sous-évaluées",
            "Reflète les attentes du marché sur la croissance future",
        ],
        "cons": [
            "Inutile pour les entreprises sans bénéfices (P/E négatif ou infini)",
            "Ne tient pas compte de la dette ni de la croissance future",
            "Peut être trompé par des gains/ponctions non récurrents",
            "Les P/E sectoriels varient énormément — comparaison difficile entre industries",
        ],
        "interpretation_guide": {
            "buy_signal": "P/E inférieur à la moyenne du secteur = potentielle sous-évaluation",
            "sell_signal": "P/E très supérieur à la moyenne du secteur = potentielle surévaluation",
            "hold_signal": "P/E proche de la moyenne du secteur = valorisation juste",
            "confidence_meaning": "Basée sur l'écart avec la moyenne sectorielle. Plus l'écart est grand, plus le signal est fiable",
        },
        "example_scenarios": [
            {
                "scenario": "P/E de 12 alors que la moyenne du secteur est 25",
                "outcome": "Action potentiellement sous-évaluée — opportunité d'achat si les fondamentaux sont sains",
            },
            {
                "scenario": "P/E de 80 sur une tech avec croissance de 5%",
                "outcome": "Surévaluation probable — le prix intègre des attentes de croissance irréalistes",
            },
        ],
    },
    "roe": {
        "how_it_works": (
            "Le ROE (Return on Equity) mesure la rentabilité par rapport aux capitaux propres. "
            "Il indique combien de bénéfices l'entreprise génère pour chaque euro investi par les actionnaires. "
            "Un ROE élevé et stable indique une entreprise efficace qui crée de la valeur. "
            "Un ROE bas ou en baisse peut signaler des problèmes opérationnels ou une concurrence accrue."
        ),
        "pros": [
            "Mesure directe de l'efficacité de la gestion à créer de la valeur",
            "Permet de comparer la rentabilité entre entreprises de tailles différentes",
            "Un ROE élevé et stable est un signe d'avantage compétitif",
            "Utile pour évaluer la qualité de la gestion",
        ],
        "cons": [
            "Peut être artificiellement gonflé par un endettement élevé (levier)",
            "Ne tient pas compte du risque associé aux capitaux propres",
            "Varie considérablement selon les secteurs — comparaison intersectorielle difficile",
            "Un ROE très élevé n'est pas toujours durable",
        ],
        "interpretation_guide": {
            "buy_signal": "ROE > 15% et stable ou croissant = gestion efficace, création de valeur",
            "sell_signal": "ROE < 5% ou en baisse = problèmes de rentabilité",
            "hold_signal": "ROE entre 5% et 15% = rentabilité correcte mais pas exceptionnelle",
            "confidence_meaning": "Basée sur la stabilité et la tendance du ROE sur plusieurs trimestres",
        },
        "example_scenarios": [
            {
                "scenario": "ROE de 25% stable sur 5 ans",
                "outcome": "Excellente gestion — avantage compétitif probable, action de qualité",
            },
            {
                "scenario": "ROE qui passe de 20% à 5% en 2 ans",
                "outcome": "Détérioration de la rentabilité — investiguer les causes avant d'investir",
            },
        ],
    },
    "debt_to_equity": {
        "how_it_works": (
            "Le ratio Dette/Capitaux Propres (Debt-to-Equity) mesure la proportion de la dette "
            "par rapport aux capitaux propres. Un ratio élevé signifie que l'entreprise finance "
            "sa croissance par l'emprunt, ce qui augmente le risque financier. "
            "Un ratio bas indique une entreprise plus conservatrice financièrement."
        ),
        "pros": [
            "Mesure claire du risque financier de l'entreprise",
            "Permet d'évaluer la structure du capital",
            "Utile pour comparer le levier entre entreprises du même secteur",
            "Un ratio bas = plus de résilience en cas de crise",
        ],
        "cons": [
            "Les ratios 'sains' varient énormément selon les secteurs",
            "Ne distingue pas la dette court terme vs long terme",
            "Une dette élevée n'est pas toujours mauvaise (effet de levier)",
            "Ne tient pas compte de la capacité de remboursement (cash-flows)",
        ],
        "interpretation_guide": {
            "buy_signal": "D/E bas (<0.5) et cash-flows solides = entreprise financièrement saine",
            "sell_signal": "D/E très élevé (>2) avec cash-flows faibles = risque de défaut",
            "hold_signal": "D/E modéré (0.5-2) = structure de capital équilibrée",
            "confidence_meaning": "Basée sur la tendance du ratio et la couverture par les cash-flows",
        },
        "example_scenarios": [
            {
                "scenario": "D/E de 0.2 avec des cash-flows en croissance",
                "outcome": "Entreprise très solvable — peut investir ou racheter des actions",
            },
            {
                "scenario": "D/E de 3.5 avec des intérêts qui consomment 80% du résultat",
                "outcome": "Risque financier élevé — éviter ou réduire la position",
            },
        ],
    },
    "profit_margin": {
        "how_it_works": (
            "La marge nette (Profit Margin) mesure le pourcentage de chaque euro de chiffre d'affaires "
            "qui se transforme en bénéfice net. Une marge élevée indique un fort pouvoir de fixation "
            "des prix, un contrôle des coûts efficace, ou un avantage compétitif. "
            "Une marge faible peut signaler une concurrence intense ou des problèmes de coûts."
        ),
        "pros": [
            "Mesure directe de l'efficacité opérationnelle",
            "Permet de comparer la rentabilité entre entreprises",
            "Une marge élevée = pricing power et avantage compétitif",
            "Tendance de la marge sur plusieurs années = indicateur de qualité",
        ],
        "cons": [
            "Les marges varient énormément selon les secteurs",
            "Une marge très élevée peut attirer la concurrence",
            "Ne tient pas compte de la croissance du chiffre d'affaires",
            "Peut être ponctuellement gonflé par des éléments non récurrents",
        ],
        "interpretation_guide": {
            "buy_signal": "Marge nette > 15% et en hausse = forte rentabilité et amélioration",
            "sell_signal": "Marge nette < 5% ou en baisse = pression concurrentielle ou problèmes",
            "hold_signal": "Marge nette entre 5% et 15% = rentabilité correcte",
            "confidence_meaning": "Basée sur la stabilité et la tendance de la marge sur plusieurs trimestres",
        },
        "example_scenarios": [
            {
                "scenario": "Marge nette de 25% en hausse depuis 3 ans",
                "outcome": "Avantage compétitif fort — l'entreprise a un pricing power",
            },
            {
                "scenario": "Marge qui passe de 15% à 3% en 1 an",
                "outcome": "Détérioration grave — concurrence ou explosion des coûts",
            },
        ],
    },
    "news_sentiment": {
        "how_it_works": (
            "L'analyse de sentiment des news évalue le ton des articles de presse récents "
            "concernant l'entreprise. Un sentiment positif indique une couverture médiatique "
            "favorable, tandis qu'un sentiment négatif peut signaler des problèmes. "
            "Le score est basé sur 8 critères financiers (impact fondamental, position concurrentielle, "
            "perspectives de croissance, profil de risque, qualité de gestion, sentiment de marché, "
            "sentiment des titres, signal de momentum) pondérés et agrégés via un LLM. "
            "Le LLM fournit aussi une explication textuelle (llm_explanation) justifiant le score global."
        ),
        "pros": [
            "Capture l'humeur du marché en temps réel",
            "Peut anticiper les mouvements de prix basés sur l'actualité",
            "Utile pour détecter les changements de narrative",
            "Complète l'analyse technique avec une dimension qualitative",
            "Explication LLM détaillée justifiant le score (critères + articles)"
        ],
        "cons": [
            "Le sentiment peut être retardé par rapport au prix",
            "Les titres sarcastiques ou ambigus sont mal interprétés",
            "Ne distingue pas les nouvelles importantes des anecdotes",
            "Peut être manipulé par des relations publiques agressives",
            "Dépend de la disponibilité et qualité de l'API LLM (fallback mots-clés)"
        ],
        "interpretation_guide": {
            "buy_signal": "Sentiment positif dominant (>60%) = couverture favorable",
            "sell_signal": "Sentiment négatif dominant (<40%) = couverture défavorable",
            "hold_signal": "Sentiment neutre (40-60%) = pas de tendance claire",
            "confidence_meaning": "Basée sur le nombre d'articles analysés et la cohérence du sentiment",
            "llm_explanation": "Explication textuelle du LLM justifiant le score overall_sentiment (2-3 phrases citant les critères clés et articles)"
        },
        "example_scenarios": [
            {
                "scenario": "Sentiment à 80% positif après des résultats supérieurs aux attentes",
                "outcome": "Momentum médiatique favorable — peut soutenir le prix à court terme",
            },
            {
                "scenario": "Sentiment à 20% après un scandale comptable",
                "outcome": "Couverture très négative — le prix peut continuer à baisser",
            },
        ],
    },
    "social_sentiment": {
        "how_it_works": (
            "L'analyse de sentiment des médias sociaux (Twitter, Reddit, StockTwits) "
            "mesure l'opinion des investisseurs particuliers en temps réel. "
            "Un sentiment positif indique un optimisme, un signal négatif indique de la peur. "
            "Les pics de sentiment extrême peuvent signaler des retournements contrariens."
        ),
        "pros": [
            "Données en temps réel sur l'humeur des investisseurs",
            "Les extrêmes de sentiment sont des indicateurs contrariens",
            "Peut détecter les tendances virales avant les médias traditionnels",
            "Utile pour le trading de court terme",
        ],
        "cons": [
            "Très bruité — beaucoup de spam et de bots",
            "Le sentiment social ne reflète pas toujours l'actionnariat réel",
            "Peut être manipulé par des campagnes coordonnées",
            "Corrélation faible avec le prix sur le long terme",
        ],
        "interpretation_guide": {
            "buy_signal": "Sentiment très négatif (<20%) = possible retournement contrarian",
            "sell_signal": "Sentiment très positif (>80%) = euphorie, possible retournement",
            "hold_signal": "Sentiment modéré = pas de signal contrarian",
            "confidence_meaning": "Basée sur le volume de posts analysés et la cohérence",
        },
        "example_scenarios": [
            {
                "scenario": "Sentiment à 90% positif sur Reddit",
                "outcome": "Euphorie — risque de correction brutale (FOMO inversé)",
            },
            {
                "scenario": "Sentiment à 15% après un faux scandale",
                "outcome": "Peur irrationnelle — opportunité d'achat si les fondamentaux sont intacts",
            },
        ],
    },
    "ml_prediction": {
        "how_it_works": (
            "La prédiction par Machine Learning utilise des modèles entraînés sur les données "
            "historiques de prix et de volume pour prédire la direction future du prix. "
            "Le modèle combine plusieurs features (momentum, volatilité, tendances) "
            "pour générer une prédiction avec un intervalle de confiance."
        ),
        "pros": [
            "Analyse multifactorielle — combine plusieurs signaux en un",
            "S'améliore avec plus de données (apprentissage continu)",
            "Peut détecter des patterns non évidents pour un humain",
            "Génère des prédictions quantifiées avec confiance",
        ],
        "cons": [
            "Risque de sur-apprentissage (overfitting) sur les données historiques",
            "Performances dégradées en marché non stationnaire (crises, ruptures)",
            "Boîte noire — difficile de comprendre pourquoi le modèle prédit ceci",
            "Nécessite beaucoup de données pour être fiable",
        ],
        "interpretation_guide": {
            "buy_signal": "Prédiction haussière avec confiance >60% = tendance attendue à la hausse",
            "sell_signal": "Prédiction baissière avec confiance >60% = tendance attendue à la baisse",
            "hold_signal": "Prédiction neutre ou confiance <60% = pas de direction claire",
            "confidence_meaning": "Probabilité que la prédiction soit correcte. >70% = fiable, <50% = peu fiable",
        },
        "example_scenarios": [
            {
                "scenario": "Prédiction haussière à 75% après une phase de consolidation",
                "outcome": "Le modèle anticipe un breakout — confirmer avec l'analyse technique",
            },
            {
                "scenario": "Prédiction neutre à 45% en plein crash",
                "outcome": "Le modèle est incertain — éviter de trader dans ces conditions",
            },
        ],
    },
    "dcf_valuation": {
        "how_it_works": (
            "Le DCF (Discounted Cash Flow) estune méthode de valorisation qui estime la valeur intrinsèque "
            "d'une entreprise en actualisant les flux de trésorerie libres (FCF) futurs à leur valeur actuelle. "
            "Le modèle projette les FCF sur 5 ans, calcule la valeur terminale (croissance perpétuelle), "
            "et soustrait la dette pour obtenir la valeur des capitaux propres par action. "
            "La différence entre la valeur intrinsèque et le prix actuel donne la marge de sécurité."
        ),
        "pros": [
            "Basé sur les fondamentaux réels (cash-flows, pas de multiples de marché)",
            "Indépendant des fluctuations émotionnelles du marché",
            "Fournit une marge de sécurité chiffrée (Graham/Buffett)",
            "Prend en compte la croissance future et la structure du capital",
        ],
        "cons": [
            "Très sensible aux hypothèses de croissance et de taux d'actualisation",
            "Ne fonctionne pas pour les entreprises sans FCF positif",
            "Suppose que les FCF futurs sont prévisibles (pas de disruption)",
            "Les données yfinance peuvent être incomplètes pour certains marchés",
        ],
        "interpretation_guide": {
            "buy_signal": "Marge de sécurité > 5% — le prix est inférieur à la valeur intrinsèque",
            "sell_signal": "Marge de sécurité < -10% — le prix dépasse la valeur intrinsèque",
            "hold_signal": "Marge de sécurité entre -10% et 5% — correctement valorisé",
            "confidence_meaning": "Basée sur la qualité des données FCF et la stabilité des fondamentaux",
        },
        "example_scenarios": [
            {
                "scenario": "DCF value $150, prix actuel $120 (marge 20%)",
                "outcome": "Action sous-évaluée — opportunité d'achat si les fondamentaux sont stables",
            },
            {
                "scenario": "DCF value $80, prix actuel $120 (marge -50%)",
                "outcome": "Action surévaluée — le prix intègre des attentes de croissance irréalistes",
            },
        ],
    },
    "comps_analysis": {
        "how_it_works": (
            "L'analyse par comparables (Comps) compare les multiples de valorisation d'une action "
            "(PE, PB, PS, EV/EBITDA) aux moyennes de son secteur. Si les multiples sont inférieurs "
            "à la moyenne sectorielle, l'action peut être sous-évaluée. Si ils sont supérieurs, "
            "elle peut être surévaluée. La valeur implicite est dérivée des multiples sectoriels "
            "appliqués aux métriques de l'entreprise."
        ),
        "pros": [
            "Basé sur des données de marché réelles (multiples observés)",
            "Permet une comparaison rapide avec les pairs du secteur",
            "Fournit une valeur implicite chiffrée",
            "Utile pour identifier les anomalies de valorisation dans un secteur",
        ],
        "cons": [
            "Suppose que le secteur est correctement valorisé (peut ne pas l'être en bulle)",
            "Les multiples varient selon les modèles de croissance — comparaison imparfaite",
            "Ne tient pas compte des avantages compétitifs uniques (moat)",
            "Les données sectorielles sont des moyennes qui masquent les extrêmes",
        ],
        "interpretation_guide": {
            "buy_signal": "Sous-évaluation > 15% vs pairs du secteur — anomalie de valorisation",
            "sell_signal": "Sur-évaluation > 10% vs pairs du secteur — prime injustifiée",
            "hold_signal": "Valorisation dans ±10% du secteur — correctement valorisé",
            "confidence_meaning": "Basée sur le nombre de multiples disponibles et la cohérence du secteur",
        },
        "example_scenarios": [
            {
                "scenario": "PE de 12 alors que le secteur est à 25 (implied value 2x le prix)",
                "outcome": "Sous-évaluation majeure — investiguer si c'est un piège de valeur ou une opportunité",
            },
            {
                "scenario": "PE de 80 alors que le secteur est à 20",
                "outcome": "Surévaluation significative — le prix suppose une croissance exceptionnelle",
            },
        ],
    },
    "trend_classification": {
        "how_it_works": (
            "La classification de tendance utilise des algorithmes de Machine Learning "
            "pour déterminer si l'action est en tendance haussière, baissière ou latérale. "
            "Le modèle analyse les patterns de prix, le volume et la volatilité "
            "pour classifier la tendance actuelle et sa force."
        ),
        "pros": [
            "Classification objective de la tendance (pas d'interprétation humaine)",
            "Fonctionne sur toutes les échelles de temps",
            "Peut détecter les changements de tendance plus tôt que les moyennes mobiles",
            "Utile pour filtrer les trades dans la direction de la tendance",
        ],
        "cons": [
            "Peut être en retard lors des retournements brutaux",
            "Performances réduites en marché très volatil",
            "Ne prédit pas l'amplitude du mouvement, seulement la direction",
            "Nécessite un ré-entraînement périodique pour rester pertinent",
        ],
        "interpretation_guide": {
            "buy_signal": "Tendance haussière forte = privilégier les positions longues",
            "sell_signal": "Tendance baissière forte = privilégier les positions courtes ou sortir",
            "hold_signal": "Tendance latérale = éviter directionnel, privilégier le range trading",
            "confidence_meaning": "Force de la classification. >70% = tendance claire, <50% = transition",
        },
        "example_scenarios": [
            {
                "scenario": "Classification 'haussière forte' avec confiance 80%",
                "outcome": "Suivre la tendance — chercher des points d'achat sur les pullbacks",
            },
            {
                "scenario": "Classification 'latérale' après une longue hausse",
                "outcome": "La tendance haussière s'essouffle — prendre des profits",
            },
            ],
            },
            "markowitz": {
            "how_it_works": (
             "La méthode de Markowitz (optimisation moyenne-variance) calcule les poids optimaux d'un portefeuille "
             "pour maximiser le rendement attendu pour un niveau de risque donné, ou minimiser le risque pour un "
             "rendement attendu donné. Elle utilise la matrice de covariance des rendements historiques et le "
             "rendement attendu de chaque actif pour trouver la frontière efficace."
            ),
            "pros": [
             "Formalise mathématiquement le compromis rendement/risque",
             "Identifie les portefeuilles efficaces (frontière efficiente)",
             "Permet la diversification optimale basée sur les corrélations",
             "Fondement théorique de la théorie moderne du portefeuille"
            ],
            "cons": [
             "Sensible aux erreurs d'estimation des entrées (rendements, covariance)",
             "Suppose que les rendements suivent une distribution normale",
             "Peut produire des portefeuilles concentrés en cas d'estimations biaisées",
             "Ne tient pas compte des coûts de transaction ni des contraintes de liquidité"
            ],
            "interpretation_guide": {
             "buy_signal": "Ratio de Sharpe > 1 = portefeuille efficace avec bon rendement ajusté au risque",
             "sell_signal": "Ratio de Sharpe < 0 = performance inférieure au taux sans risque",
             "hold_signal": "Ratio de Sharpe entre 0 et 1 = efficacité modérée à améliorer",
             "confidence_meaning": "Basée sur la stabilité de la frontière efficace et la qualité des données d'entrée"
            },
            "example_scenarios": [
             {
                 "scenario": "Deux actifs avec rendement annuel de 8% et 12%, volatilité de 15% et 25%, corrélation de 0.3",
                 "outcome": "Portefeuille optimal avec ~60% dans l'actif le plus risqué pour maximiser le ratio de Sharpe"
             },
             {
                 "scenario": "Actifs fortement corrélés (corrélation > 0.8) avec rendements similaires",
                 "outcome": "Diversification limitée bénéfice - les poids se rapprochent de la répartition égale"
             }
            ]
            },
            "capm": {
            "how_it_works": (
             "Le Modèle d'Évaluation des Actifs Financiers (CAPM) estime le rendement attendu d'un actif en fonction "
             "de son risque systématique (beta) par rapport au marché. La formule est : E(R) = Rf + β × (Rm - Rf), "
             "où Rf est le taux sans risque, β mesure la sensibilité aux mouvements du marché, et (Rm - Rf) est la "
             "prime de risque du marché."
            ),
            "pros": [
             "Fournit une théorie économique du risque et du rendement",
             "Sépare le risque systématique (non diversifiable) du risque spécifique",
             "Utilisé comme référence pour l'évaluation de la performance des gestionnaires",
             "Simple à mettre en œuvre avec des données publiques"
            ],
            "cons": [
             "Suppose des marchés efficaces et des investisseurs rationnels",
             "Le beta historique peut ne pas prédire le beta futur",
             "Ne prend pas en compte d'autres facteurs de risque (taille, valeur, momentum)",
             "Le taux sans risque et la prime de risque du marché sont difficiles à estimer précisément"
            ],
            "interpretation_guide": {
             "buy_signal": "Alpha positif et significatif = surperformance après ajustement pour le risque de marché",
             "sell_signal": "Alpha négatif et significatif = sous-performance après ajustement pour le risque de marché",
             "hold_signal": "Alpha non significatif = performance conforme au CAPM",
             "confidence_meaning": "Basée sur la significativité statistique de l'alpha et la qualité de l'ajustement du modèle"
            },
            "example_scenarios": [
             {
                 "scenario": "Action avec beta de 1.2, taux sans risque de 2%, rendement du marché de 8%",
                 "outcome": "Rendement attendu selon CAPM = 2% + 1.2 × (8% - 2%) = 9.2%"
             },
             {
                 "scenario": "Action avec rendement réel de 12% et rendement attendu CAPM de 9%",
                 "outcome": "Alpha positif de 3% = surperformance après ajustement pour le risque de marché"
             }
            ]
            },
            "binomial_tree": {
            "how_it_works": (
             "Le modèle binomial évalue les options en modélisant l'évolution du prix de l'actif sous-jacent sur un "
             "arbre binomial où à chaque période, le prix peut monter ou descendre de facteurs déterminés. La valeur "
             "de l'obtention est calculée par induction rétrograde depuis l'expiration jusqu'à aujourd'hui, en "
             "prenant en compte la possibilité d'exercice anticipé pour les options américaines."
            ),
            "pros": [
             "Flexible - peut modéliser diverses structures de paiement et conditions d'exercice",
             "Intuitif et facile à comprendre conceptuellement",
             "Peut gérer les options américaines (exercice anticipé)",
             "Converge vers le modèle de Black-Scholes lorsque le nombre de pas augmente"
            ],
            "cons": [
             "Computationnellement intensif pour un grand nombre de pas",
             "Less précis que les méthodes de diffusion pour certaines structures de paiement",
             "Require des estimations de volatilité et de taux d'intérêt sans risque",
             "La précision dépend du nombre de pas dans l'arbre"
            ],
            "interpretation_guide": {
             "buy_signal": "Prix de l'option théorique < prix de marché = option potentiellement sous-évaluée",
             "sell_signal": "Prix de l'option théorique > prix de marché = option potentiellement surévaluée",
             "hold_signal": "Prix théorique ≈ prix de marché = option correctement évaluée",
             "confidence_meaning": "Augmente avec le nombre de pas dans l'arbre (plus de pas = plus de précision)"
            },
            "example_scenarios": [
             {
                 "scenario": "Option d'achat européenne: S=100, K=100, T=1 an, r=5%, σ=20%, 100 pas",
                 "outcome": "Prix de l'option ≈ 7.96 (proche de la valeur de Black-Scholes de 7.96)"
             },
             {
                 "scenario": "Option de put américaine identique, permettant l'exercice anticipé",
                 "outcome": "Prix légèrement supérieur à l'option européenne en raison de la prime d'exercice anticipé"
             }
            ]
            },
            "vasicek": {
            "how_it_works": (
             "Le modèle de Vasicek décrit l'évolution des taux d'intérêt par un processus de retour à la moyenne "
             "Ornstein-Uhlenbeck : dr = a(b - r)dt + σ dW, où 'a' est la vitesse de retour à la moyenne, 'b' est "
             "le niveau moyen à long terme, 'σ' est la volatilité, et dW est un mouvement brownien. Il permet de "
             "calculer le prix des obligations zéro-coupon sous la formule fermée."
            ),
            "pros": [
             "Modèle analytiquement tractable avec formule fermée pour les prix des obligations",
             "Capture le retour à la moyenne des taux d'intérêt",
             "Peut générer des simulations de trajectoires de taux d'intérêt",
             "Foundation for more advanced interest rate models"
            ],
            "cons": [
             "Permet des taux d'intérêt négatifs (peu réaliste dans certains régimes)",
             "Volatilité constante indépendamment du niveau des taux",
             "La courbe des termes générée peut être trop plate ou trop inclinée",
             "Supporte une dynamique linéaire qui peut ne pas capturer toutes les complexités du marché"
            ],
            "interpretation_guide": {
             "buy_signal": "Prix de l'obligation théorique > prix de marché = obligation potentiellement sous-évaluée",
             "sell_signal": "Prix de l'obligation théorique < prix de marché = obligation potentiellement surévaluée",
             "hold_signal": "Prix théorique ≈ prix de marché = obligation correctement évaluée",
             "confidence_meaning": "Basée sur la stabilité des paramètres estimés et l'ajustement à la courbe des termes observée"
            },
            "example_scenarios": [
             {
                 "scenario": "Paramètres: a=0.1, b=0.05, σ=0.01, r0=0.03, T=10 ans",
                 "outcome": "Prix de l'obligation zéro-coupon ≈ 0.48 (48% de la valeur nominale)"
             },
             {
                 "scenario": "Augmentation de la vitesse de retour à la moyenne 'a'",
                 "outcome": "Les taux reviennent plus rapidement à leur moyenne à long terme, réduisant la volatilité à long terme"
             }
            ]
            },
            "hull_white": {
            "how_it_works": (
             "Le modèle de Hull-White étend le modèle de Vasicek en rendant les paramètres dépendants du temps, "
             "spécifiquement le niveau moyen à long terme 'b(t)', permettant une adaptation parfaite à la courbe "
             "des termes initiale. L'équation différentielle est : dr = [θ(t) - a·r]dt + σ dW, où θ(t) est choisi "
             "pour ajuster exactement la courbe des termes zéro-coupon observée."
            ),
            "pros": [
             "S'ajuste exactement à la courbe des termes initiale (calibration parfaite)",
             "Conserve la traction analytique du modèle de Vasicek pour de nombreux calculs",
             "Permet une volatilité constante tout en s'ajustant à la structure des termes",
             "Large utilisation dans la pratique pour la tarification des dérivés de taux d'intérêt"
            ],
            "cons": [
             "Suppose toujours une volatilité constante (pas de sourire de volatilité des taux)",
             "Les paramètres dépendants du temps rendent l'interprétation économique moins intuitive",
             "Peut nécessiter une recalibration fréquente lorsque la courbe des termes évolue",
             "Comme Vasicek, permet des taux négatifs"
            ],
            "interpretation_guide": {
             "buy_signal": "Prix de l'obligation théorique > prix de marché = obligation potentiellement sous-évaluée",
             "sell_signal": "Prix de l'obligation théorique < prix de marché = obligation potentiellement surévaluée",
             "hold_signal": "Prix théorique ≈ prix de marché = obligation correctement évaluée",
             "confidence_meaning": "Basée sur la qualité de l'ajustement à la courbe des termes initiale et la stabilité des paramètres"
            },
            "example_scenarios": [
             {
                 "scenario": "Calibrage à une courbe des termes horizontale à 5%",
                 "outcome": "Le modèle reproduira exactement les prix zéro-coupon de 5% pour toutes les échéances"
             },
             {
                 "scenario": "Paramètres: a=0.1, σ=0.01, courbe des termes initiale: 3% à 1an, 5% à 10ans",
                 "outcome": "θ(t) sera ajusté pour produire exactement ces rendements à zéro-coupon"
             }
            ]
            },
            "heston": {
            "how_it_works": (
             "Le modèle de Heston modélise à la fois le prix de l'actif et sa volatilité comme des processus "
             "stochastiques corrélés. La volatilité suit un processus de Cox-Ingersoll-Ross (CIR) : dv = κ(θ - v)dt + "
             "σ√v dWv, tandis que le prix de l'actif suit : dS = rS dt + √v S dWs, avec une corrélation ρ entre "
             "les deux mouvements browniens. Les prix d'options sont obtenus par intégration numérique de la "
             "fonction caractéristique."
            ),
            "pros": [
             "Capture le sourire/la biseau de volatilité observé sur les marchés d'options",
             "Modélise la volatilité comme un processus aléatoire moyen-révérent (plus réaliste)",
             "Peut produire des prix d'options qui correspondent aux données de marché",
             "Framework largement utilisé dans l'industrie financière pour la tarification des options"
            ],
            "cons": [
             "Complexité computationnelle debido à l'intégration numérique nécessaire",
             "Calibration des paramètres peut être difficile et non unique",
             "Suppose des dynamics de volatilité spécifiques qui peuvent ne pas capturer tous les comportements de marché",
             "Requiert des paramètres supplémentaires par rapport à Black-Scholes"
            ],
            "interpretation_guide": {
             "buy_signal": "Prix de l'option théorique < prix de marché = option potentiellement sous-évaluée",
             "sell_signal": "Prix de l'option théorique > prix de marché = option potentiellement surévaluée",
             "hold_signal": "Prix théorique ≈ prix de marché = option correctement évaluée",
             "confidence_meaning": "Basée sur la qualité de la calibration aux prix d'options de marché et la stabilité des paramètres"
            },
            "example_scenarios": [
             {
                 "scenario": "Paramètres typiques: v0=0.04, κ=2.0, θ=0.04, σ=0.3, ρ=-0.7, r=0.05, T=1, S0=K=100",
                 "outcome": "Prix de l'option d'appel européen ≈ 7.90 (varie selon l'implémentation de l'intégration)"
             },
             {
                 "scenario": "Augmentation de la volatilité de la volatilité 'σ'",
                 "outcome": "Augmente généralement le prix des options hors de la monnaie et diminue celui des options dans la monnaie (augmente le sourire)"
             }
            ]
            },
            "merton_credit": {
            "how_it_works": (
             "Le modèle de crédit de Merton traite la valeur des capitaux propres d'une entreprise comme une option "
             "d'achat sur la valeur de ses actifs, avec un prix d'exercice égal à la valeur nominale de sa dette. "
             "Le défaut se produit lorsque la valeur des actifs tombe en dessous de la valeur de la dette à l'échéance. "
             "Le modèle utilise la formule de Black-Scholes pour estimer la probabilité de défaut et la valeur de la dette."
            ),
            "pros": [
             "Fournit un fondement théorique basé sur les options pour le risque de crédit",
             "Lie le risque de crédit à la valeur des actifs et à la volatilité de l'entreprise",
             "Permet de calculer à la fois la probabilité de défaut et la perte en cas de défaut",
             "Intuitivement compréhensible : les capitaux propres sont une option d'achat sur les actifs de l'entreprise"
            ],
            "cons": [
             "Suppose que la valeur des actifs suit un processus brownien géométrique (peut ne pas être réaliste)",
             "Le défaut ne peut se produire qu'à l'échéance (pas de défaut intermédiaire)",
             "Require des estimations de la valeur des actifs et de leur volatilité (non directement observables)",
             "Ne tient pas compte de la structure de la dette ni des évents de défaut complexes"
            ],
            "interpretation_guide": {
             "buy_signal": "Probabilité de défaut faible (<5%) et distance au défaut élevée (>3) = qualité de crédit élevée",
             "sell_signal": "Probabilité de défaut élevée (>20%) ou distance au défaut faible (<1) = risque de crédit significatif",
             "hold_signal": "Probabilité de défaut modérée (5-20%) = risque de crédit modéré à surveiller",
             "confidence_meaning": "Basée sur la qualité des estimations de la valeur des actifs et de leur volatilité"
            },
            "example_scenarios": [
             {
                 "scenario": "Entreprise: V=100 (actifs), D=50 (dette), σ=0.2 (volatilité des actifs), T=1 an, r=0.03",
                 "outcome": "Distance au défaut ≈ 3.09, Probabilité de défaut ≈ 0.10%"
             },
             {
                 "scenario": "Même entreprise mais avec volatilité des actifs augmentée à σ=0.4",
                 "outcome": "Distance au défaut ≈ 1.55, Probabilité de défaut ≈ 6.06% (augmentation significative du risque)"
             }
            ]
            },
            "var": {
            "how_it_works": (
             "La Valeur à Risque (VaR) estime la perte maximale potentielle d'un portefeuille sur un horizon de "
             "temps donné et pour un niveau de confiance donné. Elle peut être calculée par trois méthodes principales : "
             "(1) historique (simulation), (2) paramétrique (variance-covariance), et (3) Monte Carlo. Elle répond à la "
             "question : 'Avec un niveau de confiance X%, quelle est la pire perte que nous pouvons attendre ?'"
            ),
            "pros": [
             "Mesure agrégée et synthétique du risque de portefeuille",
             "Facile à communiquer aux décideurs et aux régulateurs",
             "Permet la comparaison du risque entre différents portefeuilles ou stratégies",
             "Standard de l'industrie pour la mesure et le reporting du risque"
            ],
            "cons": [
             "Ne fournit pas d'information sur la magnitude des pertes au-delà du seuil de VaR (risque de queue)",
             "Peut donner un faux sentiment de sécurité si la distribution des pertes a des queues épaisses",
             "Méthodologiquement dépendante du choix de la méthode et des paramètres",
             "Pas sous-additive dans sa forme de base (la VaR d'un portefeuille combiné peut être supérieure à la somme des VaR individuelles)"
            ],
            "interpretation_guide": {
             "buy_signal": "VaR faible en pourcentage de la valeur du portefeuille (<2% journalière) = risque relatif faible",
             "sell_signal": "VaR élevée en pourcentage de la valeur du portefeuille (>5% journalière) = risque relatif élevé",
             "hold_signal": "VaR modérée (2-5% journalière) = risque modéré nécessitant une surveillance",
             "confidence_meaning": "Basée sur la stabilité de l'estimation dans le temps et l'adéquation de la méthode choisie"
            },
            "example_scenarios": [
             {
                 "scenario": "Portefeuille de 1 000 000 €, rendements journaliers historiques, horizon 1 jour, confiance 95%",
                 "outcome": "VaR ≈ 20 000 € = perte maximale attendue de 2% sur un jour avec 95% de confiance"
             },
             {
                 "scenario": "Même portefeuille mais avec horizon étendu à 10 jours",
                 "outcome": "VaR ≈ 63 000 € (environ √10 fois la VaR journalière pour des rendements i.i.d.)"
             }
            ]
            },
            "monte_carlo": {
            "how_it_works": (
             "La simulation de Monte Carlo génère de nombreux chemins possibles futurs pour les variables "
             "aléatoires (prix d'actifs, taux d'intérêt, volatilité, etc.) en utilisant des tirage aléatoires "
             "à partir de distributions de probabilité spécifiées. Pour chaque chemin, le résultat financier est "
             "calculé, et la distribution des résultats fournit une estimation du prix, du dérivé ou du portefeuille "
             "en prenant la moyenne actualisée des paiements."
            ),
            "pros": [
             "Extremement flexible - peut modéliser pratiquement tout produit financier dérivé",
             "Peut gérer des caractéristiques complexes : dépendance au chemin, barrières, options asiatiques, etc.",
             "Fournit non seulement un prix mais aussi une distribution complète des résultats possibles",
             "Bien établi et largement utilisé dans l'industrie financière pour la valorisation des dérivés complexes"
            ],
            "cons": [
             "Intensif en calcul - nécessite de nombreux tirages pour une précision adéquate",
             "Erreur d'estimation qui diminue lentement avec la racine carrée du nombre de simulations",
             "Require la spécification correcte des processus stochastiques sous-jacents",
             "La qualité des résultats dépend fortement du générateur de nombres aléatoires et de la variance des techniques utilisées"
            ],
            "interpretation_guide": {
             "buy_signal": "Prix théorique < prix de marché = instrument potentiellement sous-évalué",
             "sell_signal": "Prix théorique > prix de marché = instrument potentiellement surévalué",
             "hold_signal": "Prix théorique ≈ prix de marché = instrument correctement évalué",
             "confidence_meaning": "Augmente avec le nombre de chemins de simulation et diminue avec l'erreur standard du prix estimé"
            },
            "example_scenarios": [
             {
                 "scenario": "Option d'achat européenne: S0=100, K=100, T=1, r=0.05, σ=0.2, 100 000 chemins, GBM",
                 "outcome": "Prix ≈ 7.96 ± 0.02 (intervalle de confiance à 95%)"
             },
             {
                 "scenario": "Même option mais avec modèle de volatilité stochastique Heston",
                 "outcome": "Prix dépend des paramètres Heston, mais converge vers la vraie valeur avec suffisamment de chemins"
             }
            ]
            }
            }
