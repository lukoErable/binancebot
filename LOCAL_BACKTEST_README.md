# Système de Backtesting Local - Time to be Rich

## 🎯 Vue d'ensemble

Le système de backtesting local utilise des fichiers CSV locaux pour tester vos stratégies de trading sans dépendre de l'API Binance. Cela permet des backtests instantanés sans limitations de rate limiting.

## 🚀 Fonctionnalités

### ✅ Backtesting Instantané
- **Données locales** : Fichiers CSV stockés localement
- **Pas de rate limiting** : Accès instantané aux données
- **Simulation réaliste** : Prise en compte des frais de trading (0.1%)
- **Gestion des positions** : Support des positions LONG et SHORT

### 📊 Métriques de Performance
- **Retour total** : P&L absolu et en pourcentage
- **Taux de réussite** : Pourcentage de trades gagnants
- **Profit Factor** : Ratio gains/pertes
- **Drawdown maximum** : Perte maximale subie
- **Sharpe Ratio** : Mesure du rendement ajusté du risque
- **Retours mensuels** : Performance par mois

### 📈 Visualisations
- **Equity Curve** : Graphique de l'évolution du capital
- **Table des trades** : Détails de chaque transaction
- **Métriques détaillées** : Statistiques complètes

## 🛠️ Configuration

### 1. Structure des Données

Les fichiers CSV doivent être placés dans le répertoire `data/historical/` avec le format suivant :

```
data/
└── historical/
    ├── BTCUSDT_1m_2024-01-01_2024-01-07.csv
    ├── BTCUSDT_5m_2024-01-01_2024-01-31.csv
    ├── ETHUSDT_1m_2024-01-01_2024-01-07.csv
    └── ADAUSDT_1m_2024-01-01_2024-01-07.csv
```

### 2. Format des Fichiers CSV

**Nom de fichier** : `SYMBOL_TIMEFRAME_STARTDATE_ENDDATE.csv`

**Contenu CSV** :
```csv
timestamp,open,high,low,close,volume
1704067200000,42000.00,42100.00,41900.00,42050.00,1000.50
1704067260000,42050.00,42150.00,42000.00,42100.00,1200.75
...
```

**Colonnes requises** :
- `timestamp` : Timestamp Unix en millisecondes
- `open` : Prix d'ouverture
- `high` : Prix le plus haut
- `low` : Prix le plus bas
- `close` : Prix de fermeture
- `volume` : Volume échangé

## 📥 Génération des Données

### Option 1 : Données d'Exemple (Recommandé pour les tests)

```bash
# Générer des données d'exemple
node scripts/generate-sample-data.mjs
```

Cela créera des fichiers CSV avec des données simulées pour tester le système.

### Option 2 : Données Réelles depuis Binance

```bash
# Télécharger des données réelles depuis Binance
node scripts/download-historical-data.mjs
```

⚠️ **Note** : Cette option peut être limitée par le rate limiting de Binance.

### Option 3 : Données Personnalisées

Vous pouvez créer vos propres fichiers CSV en respectant le format requis.

## 🎮 Utilisation

### 1. Accès au Backtesting Local
- Cliquez sur le bouton **🧪** (icône bécher) à côté de votre stratégie
- Disponible uniquement pour les stratégies CUSTOM

### 2. Sélection des Données
- Le système affiche automatiquement les datasets disponibles
- Cliquez sur un dataset pour le sélectionner
- Les paramètres se remplissent automatiquement

### 3. Configuration du Backtest
- **Capital initial** : Montant de départ (défaut : $10,000)
- **Taille de position** : Pourcentage du capital par trade (défaut : 10%)
- **Période** : Automatiquement définie par le dataset sélectionné

### 4. Exécution
- Cliquez sur **"Run Local Backtest"**
- Le backtest s'exécute instantanément
- Affichage des résultats détaillés

## 📋 Résultats du Backtest

### Métriques Principales
```
📊 Performance Summary
├── Total Return: +15.2% ($1,520)
├── Win Rate: 68.5% (37/54 trades)
├── Profit Factor: 1.85
└── Max Drawdown: -8.3% (-$830)
```

### Détails des Trades
- **Type** : LONG/SHORT
- **Dates** : Entrée et sortie
- **Prix** : Prix d'entrée et de sortie
- **P&L** : Profit/Loss absolu et en %
- **Durée** : Temps en position
- **Raison** : Motif de sortie (TP/SL/Signal)

## 🔧 Architecture Technique

### Composants
- **`LocalDataLoader`** : Chargeur de données locales
- **`LocalBacktestEngine`** : Moteur de simulation local
- **`LocalBacktestModal`** : Interface utilisateur
- **`/api/local-backtest`** : API pour le backtesting local

### API Endpoints
- **`GET /api/local-backtest`** : Liste les datasets disponibles
- **`POST /api/local-backtest`** : Exécute le backtest local

### Types
```typescript
interface HistoricalDataInfo {
  symbol: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  totalCandles: number;
  fileSize: string;
  lastUpdated: string;
}

interface AvailableDataSets {
  datasets: HistoricalDataInfo[];
  totalSize: string;
}
```

## ⚙️ Configuration Avancée

### Limites
- **Taille de fichier** : Jusqu'à 100MB par fichier
- **Format supporté** : CSV uniquement
- **Timeframes** : 1m, 5m, 15m, 1h, 4h, 1d
- **Symboles** : BTCUSDT, ETHUSDT, ADAUSDT, BNBUSDT

### Optimisations
- **Cache des données** : Les données sont chargées une seule fois
- **Parsing optimisé** : Utilisation de `csv-parse` pour un parsing rapide
- **Gestion mémoire** : Chargement séquentiel des bougies

## 🎯 Bonnes Pratiques

### 1. Organisation des Données
- Utilisez des noms de fichiers cohérents
- Groupez les données par symbole et timeframe
- Gardez les fichiers de taille raisonnable (< 100MB)

### 2. Qualité des Données
- Vérifiez l'intégrité des timestamps
- Assurez-vous que les prix sont cohérents (high >= low, etc.)
- Évitez les gaps trop importants dans les données

### 3. Performance
- Utilisez des timeframes appropriés (1m pour scalping, 1h pour swing)
- Limitez la période de backtest à ce qui est nécessaire
- Surveillez l'utilisation mémoire

## 🚨 Limitations

### Données Locales
- Dépend de la qualité des fichiers CSV
- Pas de données en temps réel
- Nécessite une gestion manuelle des données

### Performance
- Limité par la taille des fichiers
- Chargement initial peut être lent pour de gros fichiers
- Pas de compression des données

## 🔮 Améliorations Futures

- [ ] Support des fichiers ZIP compressés
- [ ] Cache intelligent des données
- [ ] Support de plus de formats (JSON, Parquet)
- [ ] Compression automatique des données
- [ ] Synchronisation avec des sources externes
- [ ] Interface de gestion des datasets
- [ ] Validation automatique des données
- [ ] Métriques de qualité des données

## 📞 Support

### Problèmes Courants

1. **"No local data found"**
   - Vérifiez que les fichiers CSV sont dans `data/historical/`
   - Vérifiez le format du nom de fichier
   - Vérifiez le format du contenu CSV

2. **"Data file not found"**
   - Vérifiez que le fichier existe
   - Vérifiez les permissions de lecture
   - Vérifiez le chemin du fichier

3. **"Invalid CSV format"**
   - Vérifiez les en-têtes de colonnes
   - Vérifiez le format des données
   - Vérifiez les séparateurs (virgules)

### Debugging

```bash
# Vérifier la structure des données
ls -la data/historical/

# Vérifier le contenu d'un fichier
head -5 data/historical/BTCUSDT_1m_2024-01-01_2024-01-07.csv

# Vérifier la taille des fichiers
du -h data/historical/*
```

---

**Note** : Le backtesting local est un outil puissant pour tester vos stratégies sans dépendre d'APIs externes. Assurez-vous d'avoir des données de qualité pour des résultats fiables.
