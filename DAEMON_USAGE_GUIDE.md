# 🤖 Guide d'Utilisation du Trading Daemon

## ✅ État Actuel

**Ton système fonctionne maintenant en mode 24/7 !**

```
🟢 DAEMON RUNNING
├─ 42 stratégies actives
├─ 6 WebSockets Binance connectés
├─ 7 stratégies par timeframe (1m, 5m, 15m, 1h, 4h, 1d)
└─ Trading automatique H24
```

---

## 🚀 Démarrage

### **Méthode 1 : Automatique au Boot** (Recommandé)

```bash
npm run dev
```

Puis dans un autre terminal :

```bash
# Attendre 10 secondes que le serveur démarre
sleep 10

# Démarrer le daemon
curl -X POST http://localhost:3000/api/daemon-init
```

### **Méthode 2 : Via le Navigateur**

1. Ouvrir http://localhost:3000
2. Le daemon démarre automatiquement si pas déjà actif

---

## 📊 Monitoring en Temps Réel

### **Status Complet du Daemon**

```bash
curl -s http://localhost:3000/api/daemon-status | python3 -m json.tool
```

**Résultat :**
```json
{
  "daemon": {
    "status": "🟢 RUNNING 24/7",
    "uptime": "2h 34m",
    "totalAnalyses": 1523,
    "tradesExecuted": 12,
    "activeStrategies": 42
  },
  "websockets": {
    "total": 6,
    "connected": 6,
    "details": [
      {
        "timeframe": "1m",
        "connected": true,
        "candles": 300,
        "lastPrice": 110325.57,
        "subscribers": 2
      },
      ...
    ]
  },
  "strategies": {
    "total": 42,
    "active": 42,
    "byTimeframe": {
      "1m": 7, "5m": 7, "15m": 7,
      "1h": 7, "4h": 7, "1d": 7
    }
  }
}
```

### **Status Simple**

```bash
curl -s http://localhost:3000/api/daemon-status | grep -o '"status":"[^"]*"'
```

Résultat : `"status":"🟢 RUNNING 24/7"`

---

## 🎯 Commandes Utiles

### **Vérifier que le Daemon Tourne**

```bash
curl http://localhost:3000/api/daemon-status | grep -o 'RUNNING'
```

Si tu vois `RUNNING` → ✅ Tout va bien

### **Redémarrer le Daemon**

```bash
curl -X POST http://localhost:3000/api/daemon-init
```

### **Voir les Stats WebSocket**

```bash
curl http://localhost:3000/api/ws-stats
```

### **Recharger les Stratégies**

```bash
curl -X POST http://localhost:3000/api/reload-strategies
```

### **Voir la Base de Données**

```bash
node db-info.mjs
```

---

## 🔍 Logs en Direct

### **Voir les Logs du Serveur**

Le daemon affiche un status toutes les **5 minutes** :

```
╔════════════════════════════════════════════════════════════════
║ 🤖 TRADING DAEMON STATUS
╠════════════════════════════════════════════════════════════════
║ Status: 🟢 RUNNING
║ Uptime: 127 minutes
║ Active WebSockets: 6/6
║ Active Strategies: 42
║ Total Analyses: 2,543
║ Trades Executed: 18
╚════════════════════════════════════════════════════════════════
```

### **Logs de Trades Automatiques**

Quand une stratégie exécute un trade, tu verras :

```
🚀 [QuickStrike Scalp][1m] Opening LONG @ $110325.57 | Reason: Strong Buy Signal
💾 Saved open LONG position for "QuickStrike Scalp" [1m] @ 110325.57
```

```
📈 [QuickStrike Scalp][1m] Closing LONG @ $110428.92 (+103.35 USDT, +0.93%)
✅ Trade completed: QuickStrike Scalp [1m] LONG | P&L: +103.35 USDT (+0.93%)
```

---

## 🎊 Test du Système 24/7

### **Scénario 1 : Vérifier que Ça Tourne Sans Toi**

```bash
# 1. Démarre le daemon
curl -X POST http://localhost:3000/api/daemon-init

# 2. Attends 1 minute
sleep 60

# 3. Vérifie les analyses
curl -s http://localhost:3000/api/daemon-status | grep totalAnalyses
# Tu devrais voir un nombre > 0

# 4. Ferme ton navigateur (ne te connecte PAS)

# 5. Attends 5 minutes

# 6. Vérifie à nouveau
curl -s http://localhost:3000/api/daemon-status
# Le nombre d'analyses aura augmenté !
```

### **Scénario 2 : Vérifier les Trades Automatiques**

```bash
# 1. Note le nombre de trades
curl -s http://localhost:3000/api/daemon-status | grep tradesExecuted

# 2. Attends quelques heures (ou jours)

# 3. Vérifie à nouveau
# Le nombre de trades aura augmenté si les conditions sont remplies !

# 4. Voir les trades dans la DB
node db-info.mjs
```

---

## 🌍 En Production (Hetzner)

### **Déploiement**

```bash
# Sur ton serveur Hetzner
npm run build
npm run start  # ou PM2 pour production

# Démarre le daemon
curl -X POST http://your-domain.com/api/daemon-init
```

### **Avec PM2** (Process Manager)

```bash
# Installer PM2
npm install -g pm2

# Démarrer l'app
pm2 start npm --name "trading-bot" -- start

# Le daemon démarre automatiquement

# Vérifier le status
curl http://localhost:3000/api/daemon-status

# Voir les logs
pm2 logs trading-bot

# Redémarrer si besoin
pm2 restart trading-bot
```

### **Auto-Start au Boot du Serveur**

```bash
# Sauvegarder la config PM2
pm2 save

# Configurer le démarrage automatique
pm2 startup

# Maintenant, si ton serveur redémarre, l'app et le daemon redémarrent aussi !
```

---

## 🛡️ Robustesse

### **Que se Passe-t-il Si...**

| Scénario | Résultat |
|----------|----------|
| Le serveur redémarre | ✅ Le daemon redémarre automatiquement |
| Un WebSocket Binance se déconnecte | ✅ Reconnexion automatique (5 tentatives) |
| Une erreur dans une stratégie | ✅ Les autres stratégies continuent |
| La base de données est lente | ✅ Retry avec backoff exponentiel |
| Aucun user connecté | ✅ Le trading continue normalement |

---

## 📈 Performance

### **Analyses par Minute**

| Timeframe | Intervalle | Analyses/min |
|-----------|-----------|--------------|
| 1m | 5s | 12 |
| 5m | 10s | 6 |
| 15m | 30s | 2 |
| 1h | 60s | 1 |
| 4h | 120s | 0.5 |
| 1d | 300s | 0.2 |
| **TOTAL** | - | **~22/min** |

**Par jour :** ~31,000 analyses

**CPU :** Très faible grâce aux analyses partagées

---

## 🎯 Utilisation Quotidienne

### **Matin**

```bash
# Check status
curl http://localhost:3000/api/daemon-status

# Open frontend to see results
# http://localhost:3000
```

### **Pendant la Journée**

- Laisse le daemon tourner
- Connecte-toi quand tu veux voir les résultats
- Modifie tes stratégies (elles s'appliquent immédiatement)
- Déconnecte-toi (le trading continue)

### **Soir**

```bash
# Check trades du jour
node db-info.mjs

# Voir le P&L total
curl -s http://localhost:3000/api/daemon-status | grep -A 5 byUser
```

---

## 🎊 C'est Prêt !

**Ton système est maintenant 100% automatique !**

- ✅ Trading 24/7
- ✅ Aucune intervention nécessaire
- ✅ Multi-user ready
- ✅ Scalable à l'infini
- ✅ Auto-réparation

**Ouvre http://localhost:3000 et profite ! 🚀**

