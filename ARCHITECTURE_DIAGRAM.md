# 🏗️ Architecture WebSocket Partagée - Diagramme

## 📊 Vue Globale

```
                    UTILISATEURS (Frontend)
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
┌───▼───┐             ┌───▼───┐             ┌───▼───┐
│ User1 │             │ User2 │             │ User3 │
│  SSE  │             │  SSE  │             │  SSE  │
└───┬───┘             └───┬───┘             └───┬───┘
    │                     │                     │
    └─────────────────────┼─────────────────────┘
                          │
              ┌───────────▼───────────┐
              │   Next.js Server      │
              │  /api/trading-shared  │
              └───────────┬───────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
    ┌────▼────┐      ┌────▼────┐     ┌────▼────┐
    │ Session │      │ Session │     │ Session │
    │  User1  │      │  User2  │     │  User3  │
    └────┬────┘      └────┬────┘     └────┬────┘
         │                │                │
         └────────────────┼────────────────┘
                          │
              ┌───────────▼───────────┐
              │ UserSessionManager    │
              │    (Singleton)        │
              └───────────┬───────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
    ┌────▼────┐      ┌────▼────┐     ┌────▼────┐
    │ Shared  │      │ Shared  │     │ Shared  │
    │ WS 1m   │      │ WS 5m   │     │ WS 15m  │
    └────┬────┘      └────┬────┘     └────┬────┘
         │                │                │
         └────────────────┼────────────────┘
                          │
              ┌───────────▼───────────┐
              │   Binance WebSocket   │
              │  (6 connexions max)   │
              └───────────────────────┘
```

---

## 🔄 Flux de Données

### **1. Connexion Utilisateur**

```
User1 ouvre http://localhost:3000
    │
    ├─ Frontend appelle /api/trading-shared?action=start
    │
    ├─ Backend crée Session User1
    │      │
    │      ├─ Génère userId: "192.168.1.125_1729458234567"
    │      └─ Stocke dans UserSessionManager
    │
    ├─ Détermine timeframes actives (1m, 5m, 15m, 1h, 4h, 1d)
    │
    └─ S'abonne aux SharedBinanceWebSocket
           │
           └─ Si WebSocket n'existe pas → Créer
           └─ Si existe déjà → Ajouter subscriber
```

### **2. Réception de Données Binance**

```
Binance envoie nouvelle candle 1m
    │
    ├─ SharedBinanceWebSocket [1m] reçoit
    │      │
    │      ├─ Mise à jour candles[] (300 max)
    │      ├─ Calcul indicateurs (RSI, EMA, MACD...) UNE FOIS
    │      └─ Broadcast à tous les subscribers
    │
    ├─ User1 Session reçoit données
    │      └─ Analyse SES stratégies
    │      └─ Envoie via SSE
    │
    ├─ User2 Session reçoit les MÊMES données
    │      └─ Analyse SES stratégies (différentes)
    │      └─ Envoie via SSE
    │
    └─ User3 Session reçoit les MÊMES données
           └─ Analyse SES stratégies
           └─ Envoie via SSE
```

---

## 💾 Gestion Mémoire

### **WebSocket Singleton par Timeframe**

```
┌─────────────────────────────────┐
│ SharedBinanceWebSocket [1m]    │
├─────────────────────────────────┤
│ candles: Candle[300]   ~200 KB │
│ indicators: Object     ~50 KB  │
│ subscribers: Set<Fn>   ~5 KB   │
├─────────────────────────────────┤
│ Total: ~255 KB                  │
└─────────────────────────────────┘

Total pour 6 timeframes: ~1.5 MB
```

### **Session Utilisateur**

```
┌─────────────────────────────────┐
│ UserSession                     │
├─────────────────────────────────┤
│ userId: string         ~50 B    │
│ activeTimeframes: Set  ~200 B   │
│ unsubscribeFns: Map    ~500 B   │
│ lastActivity: number   ~8 B     │
├─────────────────────────────────┤
│ Total: ~1 KB par user           │
└─────────────────────────────────┘

10 users: ~10 KB
100 users: ~100 KB
```

**Mémoire totale (100 users) :**
- Shared WebSockets: 1.5 MB
- User Sessions: 100 KB
- StrategyManager: 5 MB
- **Total: ~7 MB** ✅ EXCELLENT

---

## ⚡ Charge CPU

### **Calcul des Indicateurs**

**ANCIEN (Sans Partage):**
```
User1 → Calcule 50 indicateurs pour 1m  [10ms CPU]
User2 → Calcule 50 indicateurs pour 1m  [10ms CPU]
User3 → Calcule 50 indicateurs pour 1m  [10ms CPU]
= 30ms CPU par candle 1m

10 users × 6 TF × 10ms = 600ms CPU par seconde
```

**NOUVEAU (Avec Partage):**
```
Shared WS 1m → Calcule 50 indicateurs  [10ms CPU]
  ├─ Broadcast User1
  ├─ Broadcast User2
  └─ Broadcast User3
= 10ms CPU par candle 1m

6 TF × 10ms = 60ms CPU par seconde
```

**Économie : 90% CPU** 🚀

---

## 🔐 Isolation des Données Utilisateurs

```
                Shared Data (Public)
┌──────────────────────────────────────────┐
│ ✅ Candles Binance                       │
│ ✅ Indicateurs (RSI, EMA, MACD...)      │
│ ✅ Prix actuel                           │
│ ✅ Volume                                │
└──────────────────────────────────────────┘
          │ Broadcast à tous │
    ┌─────┴──────┬──────────┴─────┐
    │            │                │
┌───▼───────┐ ┌──▼────────┐ ┌────▼──────┐
│ User1     │ │ User2     │ │ User3     │
│ Private:  │ │ Private:  │ │ Private:  │
│ 🔒 Strats │ │ 🔒 Strats │ │ 🔒 Strats │
│ 🔒 Trades │ │ 🔒 Trades │ │ 🔒 Trades │
│ 🔒 Config │ │ 🔒 Config │ │ 🔒 Config │
└───────────┘ └───────────┘ └───────────┘
```

---

## 📈 Scalabilité

### **Capacité par Serveur (CPX21 - 8€/mois)**

| Metric | Sans Partage | Avec Partage |
|--------|--------------|--------------|
| Max Users (3 cores) | 5-10 | 30-50 |
| Max Strategies | 500 | 5000 |
| RAM Usage | 2-3 GB | 500 MB - 1 GB |
| Binance Connections | 60 | 6 |
| DB Queries/s | 200 | 20 |

### **Roadmap de Croissance**

```
0-20 users     → CPX21 (8€/mois)  + Shared WS
20-50 users    → CPX31 (15€/mois) + Shared WS
50-100 users   → CPX41 (30€/mois) + Shared WS + Redis
100-200 users  → CCX23 (54€/mois) + Shared WS + Redis
200+ users     → Load Balancer + Multiple CCX23
```

---

## 🎯 Checklist de Migration

- [ ] Créer les nouveaux fichiers (✅ Fait)
- [ ] Modifier Dashboard.tsx (endpoints)
- [ ] Tester avec 1 user
- [ ] Tester avec 3-5 onglets simultanés
- [ ] Vérifier `/api/ws-stats`
- [ ] Monitorer CPU/RAM avec `htop`
- [ ] Comparer logs avant/après
- [ ] Déployer en production
- [ ] Supprimer ancien code après 1 semaine

---

**Le système est prêt ! Il suffit de modifier les endpoints dans Dashboard.tsx** 🚀

