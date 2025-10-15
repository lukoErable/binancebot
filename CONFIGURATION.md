# ⚙️ Configuration du Trading Bot

## 📊 Paramètres de la stratégie

Les paramètres par défaut sont définis dans `src/lib/strategy.ts`:

```typescript
export const defaultStrategyConfig: StrategyConfig = {
  rsiPeriod: 14,              // Période RSI
  ema50Period: 50,            // Période EMA rapide
  ema200Period: 200,          // Période EMA lente
  rsiBuyThreshold: 30,        // Seuil RSI pour achat
  rsiSellThreshold: 70,       // Seuil RSI pour vente
  cooldownPeriod: 5 * 60 * 1000,  // 5 minutes entre trades
  simulationMode: true        // Mode simulation activé
};
```

## 🔧 Personnalisation des paramètres

### Modifier les seuils RSI

Pour des signaux plus ou moins agressifs:

```typescript
// Stratégie conservative (moins de signaux)
rsiBuyThreshold: 20,
rsiSellThreshold: 80,

// Stratégie aggressive (plus de signaux)
rsiBuyThreshold: 40,
rsiSellThreshold: 60,
```

### Modifier les périodes EMA

Pour différentes sensibilités de tendance:

```typescript
// Tendances court terme
ema50Period: 20,
ema200Period: 100,

// Tendances long terme (plus stable)
ema50Period: 100,
ema200Period: 300,
```

### Cooldown entre trades

Pour éviter le sur-trading:

```typescript
// 1 minute
cooldownPeriod: 1 * 60 * 1000,

// 15 minutes
cooldownPeriod: 15 * 60 * 1000,

// 1 heure
cooldownPeriod: 60 * 60 * 1000,
```

## 🕐 Timeframe

Le timeframe par défaut est de 1 minute. Pour le modifier:

Dans `src/lib/websocket-manager.ts`, ligne 37:

```typescript
// 1 minute (défaut)
const wsUrl = 'wss://stream.binance.com:9443/ws/btcusdt@kline_1m';

// 5 minutes
const wsUrl = 'wss://stream.binance.com:9443/ws/btcusdt@kline_5m';

// 15 minutes
const wsUrl = 'wss://stream.binance.com:9443/ws/btcusdt@kline_15m';

// 1 heure
const wsUrl = 'wss://stream.binance.com:9443/ws/btcusdt@kline_1h';
```

⚠️ **Important**: Ajustez aussi la limite de bougies historiques en fonction:
- 1m: 200 bougies = ~3 heures
- 5m: 200 bougies = ~16 heures
- 15m: 200 bougies = ~2 jours
- 1h: 200 bougies = ~8 jours

## 💱 Paires de trading

Pour changer la paire de trading:

Dans `src/lib/websocket-manager.ts`:

```typescript
// BTC/USDT (défaut)
const wsUrl = 'wss://stream.binance.com:9443/ws/btcusdt@kline_1m';
const apiUrl = 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=200';

// ETH/USDT
const wsUrl = 'wss://stream.binance.com:9443/ws/ethusdt@kline_1m';
const apiUrl = 'https://api.binance.com/api/v3/klines?symbol=ETHUSDT&interval=1m&limit=200';

// BNB/USDT
const wsUrl = 'wss://stream.binance.com:9443/ws/bnbusdt@kline_1m';
const apiUrl = 'https://api.binance.com/api/v3/klines?symbol=BNBUSDT&interval=1m&limit=200';
```

## 🎯 Variables d'environnement

Créez un fichier `.env.local` à la racine:

```bash
# Mode de trading
SIMULATION_MODE=true

# API Binance (pour trading réel - Phase 2)
BINANCE_API_KEY=your_api_key_here
BINANCE_SECRET_KEY=your_secret_key_here

# Options avancées
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## 📝 Logs et Debug

### Activer les logs détaillés

Dans `src/lib/websocket-manager.ts`, décommentez ou ajoutez:

```typescript
console.log('Candle data:', newCandle);
console.log('Current RSI:', rsi);
console.log('Current EMA50:', ema50);
console.log('Current EMA200:', ema200);
```

### Console navigateur

Ouvrez les DevTools (F12) pour voir:
- État de connexion WebSocket
- Signaux générés
- Données en temps réel

### Console serveur

Dans le terminal où tourne `npm run dev`:
- Messages WebSocket
- Calculs d'indicateurs
- Signaux de trading

## 🔒 Sécurité

### Mode Simulation
- ✅ Aucune clé API nécessaire
- ✅ Aucun ordre réel
- ✅ Données temps réel uniquement

### Mode Trading Réel
- ⚠️ Clés API requises
- ⚠️ Permissions Spot Trading
- ⚠️ **Ne jamais** commit les clés dans Git
- ⚠️ Utiliser `.env.local` (ignoré par Git)

## 📊 Optimisation des performances

### Nombre de bougies historiques

Plus de bougies = calculs plus précis mais plus lent au démarrage:

```typescript
// Minimum pour EMA200
const response = await fetch('...&limit=200');

// Pour plus de précision
const response = await fetch('...&limit=500');
```

### Fréquence des updates UI

Pour réduire la charge sur le front-end:

Dans `src/lib/websocket-manager.ts`:

```typescript
// Update seulement sur nouvelles bougies fermées (défaut)
if (kline.x) {
  this.analyzeAndExecute();
}

// Update aussi sur prix en temps réel
this.state.currentPrice = parseFloat(kline.c);
this.notifyStateUpdate();
```

## 🧪 Tests et validation

### Backtesting manuel

1. Téléchargez des données historiques de Binance
2. Créez un script de test dans `src/scripts/backtest.ts`
3. Utilisez la même logique de `strategy.ts`
4. Calculez le taux de réussite

### Vérification de la stratégie

Avant de passer en mode réel:
1. ✅ Lancer le bot en simulation pendant 24-48h
2. ✅ Vérifier la cohérence des signaux
3. ✅ Analyser le taux de faux positifs
4. ✅ Optimiser les paramètres si nécessaire

## 🚀 Optimisations avancées

### Multi-timeframes

Combiner plusieurs timeframes pour confirmer les signaux:

```typescript
// Vérifier la tendance sur 1h avant de trader sur 1m
const trend1h = await checkTrend('1h');
const signal1m = this.analyzeMarket(candles);

if (trend1h === 'UP' && signal1m.type === 'BUY') {
  // Signal confirmé
}
```

### Filtres supplémentaires

Ajouter des conditions pour réduire les faux signaux:

```typescript
// Volume minimum
if (candle.volume < minVolume) return;

// Volatilité
const atr = calculateATR(candles);
if (atr < minATR) return;

// Distance prix/EMA200
const distancePercent = (price - ema200) / ema200 * 100;
if (Math.abs(distancePercent) > 5) return; // Trop éloigné
```

---

Pour toute question, consultez le README.md ou les commentaires dans le code.

