# 🤖 TradingBot-BTC-RSI-EMA-WS

Bot de trading automatique en temps réel sur BTC/USDT utilisant une stratégie RSI + EMA avec WebSocket Binance.

## 📋 Vue d'ensemble

Ce bot de trading analyse en temps réel le marché BTC/USDT sur Binance et génère des signaux d'achat/vente basés sur:
- **RSI (14)**: Relative Strength Index
- **EMA 50**: Moyenne mobile exponentielle rapide
- **EMA 200**: Moyenne mobile exponentielle lente

### 🎯 Stratégie de trading

**Signal d'ACHAT (Haussier):**
- EMA50 > EMA200 (tendance haussière)
- RSI < 30 (survente)

**Signal de VENTE (Baissier):**
- EMA50 < EMA200 (tendance baissière)
- RSI > 70 (surachat)

**Protection:**
- Cooldown de 5 minutes entre chaque trade pour éviter les faux signaux
- Mode simulation par défaut (pas d'ordres réels)

## 🚀 Installation

### Prérequis
- Node.js 18+ 
- npm ou yarn

### Installation des dépendances

```bash
npm install
```

### Configuration

Créez un fichier `.env.local` à la racine du projet (optionnel):

```bash
SIMULATION_MODE=true
```

## 🏃 Démarrage

### Mode développement

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

### Mode production

```bash
npm run build
npm start
```

## 📊 Utilisation

1. **Démarrer le bot**: Cliquez sur "🚀 Démarrer le Bot"
2. **Connexion**: Le bot se connecte automatiquement au WebSocket Binance
3. **Chargement des données**: 200 bougies historiques sont récupérées pour calculer les EMA
4. **Analyse en temps réel**: À chaque nouvelle bougie (1 minute), le bot analyse le marché
5. **Signaux**: Les signaux BUY/SELL sont affichés en temps réel et loggés

### Dashboard

Le dashboard affiche:
- 💰 **Prix BTC/USDT en temps réel**
- 📈 **RSI actuel** avec indication survente/surachat
- 📊 **EMA 50 et EMA 200**
- 📈 **Graphiques interactifs en temps réel** :
  - Prix BTC avec EMAs superposées
  - RSI avec zones de surachat/survente
  - Volume de trading
- 🎯 **Dernier signal** avec détails complets
- 📜 **Historique des 20 derniers signaux**
- 📊 **Analyse de tendance** (haussière/baissière)

## 🏗️ Architecture

```
src/
├── app/
│   ├── api/
│   │   └── trading/
│   │       └── route.ts          # API Route pour WebSocket SSE
│   ├── layout.tsx                # Layout principal
│   └── page.tsx                  # Page d'accueil
├── components/
│   └── Dashboard.tsx             # Dashboard temps réel
├── lib/
│   ├── strategy.ts               # Logique RSI + EMA
│   └── websocket-manager.ts     # Gestionnaire WebSocket Binance
└── types/
    └── trading.ts                # Types TypeScript
```

### Composants principaux

#### 1. **WebSocket Manager** (`websocket-manager.ts`)
- Connexion au WebSocket Binance
- Récupération des bougies historiques via REST API
- Mise à jour en temps réel des données
- Gestion automatique de la reconnexion

#### 2. **Trading Strategy** (`strategy.ts`)
- Calcul des indicateurs RSI et EMA
- Analyse des conditions de marché
- Génération des signaux d'achat/vente
- Système de cooldown

#### 3. **Dashboard** (`Dashboard.tsx`)
- Interface utilisateur temps réel
- Affichage des métriques et signaux
- Contrôles start/stop
- Historique des trades

#### 4. **API Route** (`api/trading/route.ts`)
- Server-Sent Events (SSE) pour streaming temps réel
- Gestion du cycle de vie du WebSocket
- Actions: start, stop, status

## 🔧 Technologies utilisées

- **Next.js 14**: Framework React avec App Router
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling moderne
- **ccxt**: Librairie pour exchanges crypto
- **technicalindicators**: Calcul RSI + EMA
- **ws**: WebSocket client
- **recharts**: Graphiques interactifs React
- **Server-Sent Events**: Streaming temps réel vers le client

## ⚠️ Mode Simulation

Par défaut, le bot fonctionne en **mode simulation**. Aucun ordre réel n'est passé sur Binance.

Les signaux sont:
- ✅ Calculés en temps réel
- ✅ Affichés dans le dashboard
- ✅ Loggés dans la console
- ❌ Pas exécutés sur Binance

## 🔐 Configuration pour Trading Réel (Phase 2)

Pour passer en mode trading réel (à vos risques et périls):

1. Créer une clé API sur Binance avec permissions Spot Trading
2. Ajouter les clés dans `.env.local`:
```bash
SIMULATION_MODE=false
BINANCE_API_KEY=your_api_key
BINANCE_SECRET_KEY=your_secret_key
```

3. Modifier `strategy.ts` pour implémenter les ordres via ccxt

⚠️ **ATTENTION**: Le trading automatique comporte des risques. Testez toujours en simulation d'abord!

## 📈 Fonctionnalités

### Actuelles (Phase 1 - Validation)
- ✅ Connexion WebSocket Binance temps réel
- ✅ Calcul RSI + EMA
- ✅ Génération de signaux
- ✅ Dashboard interactif
- ✅ **Graphiques en temps réel** (Prix, RSI, Volume)
- ✅ Historique des signaux
- ✅ Mode simulation
- ✅ Système de cooldown
- ✅ Reconnexion automatique

### Futures (Phase 2)
- 🔜 Exécution d'ordres réels via ccxt
- 🔜 Support Binance Futures
- 🔜 Backtesting sur données historiques
- 🔜 Gestion du capital et position sizing
- 🔜 Stop loss / Take profit
- 🔜 Notifications (Telegram, Email)
- 🔜 Statistiques de performance
- 🔜 Multi-timeframes
- 🔜 Autres stratégies (MACD, Bollinger)

## 🐛 Debug

Les logs sont disponibles:
- **Console navigateur**: État du front-end
- **Console serveur**: Logs WebSocket, calculs, signaux

Pour plus de détails, activez les logs dans le code:
```typescript
console.log('Debug info:', data);
```

## 📝 Notes importantes

1. **Données historiques**: Le bot charge 200 bougies au démarrage pour calculer EMA200
2. **Timeframe**: 1 minute par défaut (modifiable via WebSocket URL)
3. **Latence**: Connexion directe WebSocket = latence minimale
4. **Stabilité**: Reconnexion automatique en cas de déconnexion

## 🤝 Contribution

Ce projet est en phase de validation. Les contributions sont les bienvenues pour:
- Améliorer la stratégie
- Ajouter d'autres indicateurs
- Optimiser les performances
- Améliorer l'UI/UX

## 📄 Licence

MIT

## ⚠️ Disclaimer

Ce bot est fourni à des fins éducatives uniquement. Le trading de crypto-monnaies comporte des risques financiers importants. Utilisez ce bot à vos propres risques. Les auteurs ne sont pas responsables des pertes financières.

---

Made with ❤️ for crypto traders
