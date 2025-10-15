# 🚀 Quick Start Guide

Guide rapide pour lancer votre bot de trading BTC/USDT en 5 minutes.

## 📦 Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer le serveur de développement
npm run dev
```

## 🎮 Utilisation

1. **Ouvrir le navigateur**
   - Aller sur http://localhost:3000

2. **Démarrer le bot**
   - Cliquer sur le bouton "🚀 Démarrer le Bot"

3. **Observer les données**
   - Le bot va se connecter à Binance WebSocket
   - Charger 200 bougies historiques
   - Afficher le prix BTC/USDT en temps réel
   - Calculer RSI, EMA50, EMA200

4. **Attendre les signaux**
   - À chaque minute, une nouvelle bougie est fermée
   - Le bot analyse les conditions de marché
   - Si les conditions sont remplies → Signal BUY/SELL
   - Les signaux apparaissent dans le dashboard et la console

## 📊 Comprendre les signaux

### 🟢 Signal BUY (Achat)
- **Condition 1**: EMA50 > EMA200 (tendance haussière)
- **Condition 2**: RSI < 30 (survente)
- **Action**: Opportunité d'achat potentielle

### 🔴 Signal SELL (Vente)
- **Condition 1**: EMA50 < EMA200 (tendance baissière)
- **Condition 2**: RSI > 70 (surachat)
- **Action**: Opportunité de vente potentielle

### ⚪ Signal HOLD (Neutre)
- Aucune condition n'est remplie
- Pas d'action recommandée

## 🎯 Ce que vous verrez

### Dashboard principal
```
┌─────────────────────────────────────────┐
│ Prix BTC/USDT    │ 67,234.56 $          │
│ RSI (14)         │ 45.32 (Neutre)       │
│ EMA 50           │ 67,100.00 $          │
│ EMA 200          │ 66,800.00 $          │
├─────────────────────────────────────────┤
│ Tendance: 🚀 Haussière (EMA50 > EMA200) │
├─────────────────────────────────────────┤
│ Dernier Signal: HOLD                     │
│ Raison: RSI neutre (45.32)              │
└─────────────────────────────────────────┘
```

### Console serveur
```
✅ Connected to Binance WebSocket
📊 Fetching historical candles from Binance...
✅ Loaded 200 historical candles
📈 New candle closed: 67234.56 USDT
🔔 [SIMULATION] BUY signal at 67234.56
   RSI: 28.43 | EMA50: 67100.23 | EMA200: 66800.45
   Reason: RSI oversold (28.43) and uptrend (EMA50 > EMA200)
```

## ⚠️ Mode Simulation

Par défaut, le bot est en **mode SIMULATION**:
- ✅ Analyse le marché en temps réel
- ✅ Génère des signaux réels
- ✅ Affiche tout dans le dashboard
- ❌ **N'exécute AUCUN ordre sur Binance**

C'est parfait pour:
- Apprendre le trading algorithmique
- Tester la stratégie RSI + EMA
- Valider la logique avant trading réel
- Observer le comportement du marché

## 🔍 Monitoring

### Indicateurs à surveiller

1. **RSI < 30** → Zone de survente (potentiel d'achat)
2. **RSI > 70** → Zone de surachat (potentiel de vente)
3. **EMA50 > EMA200** → Tendance haussière (bullish)
4. **EMA50 < EMA200** → Tendance baissière (bearish)

### Logs importants

Dans la console serveur:
```bash
✅ Connected to Binance WebSocket    # Connexion OK
📈 New candle closed                 # Nouvelle analyse
🔔 [SIMULATION] BUY signal           # Signal généré
```

Dans la console navigateur (F12):
- État de connexion
- Mises à jour en temps réel
- Erreurs éventuelles

## 🛠️ Commandes utiles

```bash
# Développement avec hot-reload
npm run dev

# Build production
npm run build

# Lancer en production
npm start

# Vérifier le code
npm run lint
```

## 📈 Exemple de session

```
00:00 - Démarrage du bot
00:01 - Connexion WebSocket OK
00:02 - Chargement 200 bougies historiques
00:03 - Premier calcul: RSI=45, EMA50=67100, EMA200=66800
00:04 - Signal HOLD (conditions non remplies)
...
02:34 - RSI=28 (survente détectée!)
02:35 - EMA50 > EMA200 (tendance haussière confirmée!)
02:36 - 🟢 SIGNAL BUY généré à 67,234.56 $
02:36 - Cooldown activé (5 minutes)
```

## ❓ FAQ

**Q: Combien de temps avant le premier signal?**
A: Ça dépend du marché. Peut prendre quelques minutes à plusieurs heures.

**Q: Puis-je modifier les paramètres?**
A: Oui! Voir CONFIGURATION.md pour tous les réglages.

**Q: Le bot passe des ordres réels?**
A: Non, par défaut c'est 100% simulation.

**Q: Comment passer en mode réel?**
A: Voir README.md section "Configuration pour Trading Réel" (Phase 2).

**Q: Quelle est la fréquence d'analyse?**
A: Toutes les 1 minute (à chaque nouvelle bougie fermée).

**Q: Combien de capital nécessaire?**
A: Aucun en mode simulation. Pour le réel, voir Phase 2.

## 🎓 Apprendre plus

1. **Comprendre RSI**: https://www.investopedia.com/terms/r/rsi.asp
2. **Comprendre EMA**: https://www.investopedia.com/terms/e/ema.asp
3. **API Binance**: https://binance-docs.github.io/apidocs/spot/en/

## 🆘 Problèmes courants

### Le bot ne se connecte pas
- Vérifier votre connexion internet
- Binance peut être bloqué dans certains pays (utiliser VPN)

### Pas de signaux
- C'est normal! La stratégie attend les bonnes conditions
- Le marché peut être neutre pendant des heures
- Essayer de modifier les seuils RSI (voir CONFIGURATION.md)

### Erreur "Failed to fetch"
- Vérifier que le serveur Next.js tourne (npm run dev)
- Ouvrir http://localhost:3000

## 🎉 Félicitations!

Votre bot de trading est maintenant opérationnel! 

Laissez-le tourner pendant 24-48h pour observer son comportement et collecter des statistiques avant d'envisager le passage en mode réel.

---

**Note**: Le trading comporte des risques. Ce bot est éducatif. Utilisez-le à vos propres risques.

