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
            "Le score est basé sur la fréquence des mots positifs vs négatifs dans les titres et résumés."
        ),
        "pros": [
            "Capture l'humeur du marché en temps réel",
            "Peut anticiper les mouvements de prix basés sur l'actualité",
            "Utile pour détecter les changements de narrative",
            "Complète l'analyse technique avec une dimension qualitative",
        ],
        "cons": [
            "Le sentiment peut être retardé par rapport au prix",
            "Les titres sarcastiques ou ambigus sont mal interprétés",
            "Ne distingue pas les nouvelles importantes des anecdotes",
            "Peut être manipulé par des relations publiques agressives",
        ],
        "interpretation_guide": {
            "buy_signal": "Sentiment positif dominant (>60%) = couverture favorable",
            "sell_signal": "Sentiment négatif dominant (<40%) = couverture défavorable",
            "hold_signal": "Sentiment neutre (40-60%) = pas de tendance claire",
            "confidence_meaning": "Basée sur le nombre d'articles analysés et la cohérence du sentiment",
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
}
