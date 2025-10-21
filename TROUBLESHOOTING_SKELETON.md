# 🔧 Résoudre le Problème des Skeletons

## 🎯 Symptôme

Tu vois **3 skeletons** à la place de tes stratégies sur http://localhost:3000

---

## 🔍 Diagnostic

### **Étape 1 : Vérifie que le Daemon Tourne**

```bash
curl -s http://localhost:3000/api/daemon-status | grep -E "(status|activeStrategies)"
```

**✅ Résultat Attendu :**
```
"status": "🟢 RUNNING 24/7",
"activeStrategies": 42,
```

**❌ Si tu vois `STOPPED` :**
```bash
curl -X POST http://localhost:3000/api/daemon-init
```

---

### **Étape 2 : Vérifie les Logs du Serveur**

Dans ton terminal où `npm run dev` tourne, cherche :

**✅ Ce que tu DOIS voir :**
```
🚀 StrategyManager: Created singleton instance
✅ StrategyManager ready with 42 strategies
✅ [USER xxx] Waiting for strategies to load... (1/20)
✅ [USER xxx] StrategyManager ready with 42 strategies
📊 [USER xxx] Sending 42 strategies to frontend
```

**❌ Ce qui indique un problème :**
```
⚠️  [USER xxx] No StrategyManager available
❌ [USER xxx] No strategies loaded after 10 seconds!
```

---

### **Étape 3 : Test de Connexion SSE**

```bash
# Dans un nouveau terminal
curl -N 'http://localhost:3000/api/trading-shared?action=start&timeframe=1m' | head -1
```

**✅ Tu dois voir :** Un gros JSON avec `"strategyPerformances":[...]`

**❌ Si `"strategyPerformances":[]` est vide :**
Le `StrategyManager` n'est pas encore chargé

---

## 🛠️ SOLUTIONS

### **Solution 1 : Recharge la Page** (Le Plus Simple)

1. Ouvre http://localhost:3000
2. Attends **15 secondes** (timeout automatique)
3. Rafraîchis la page (F5 ou Cmd+R)
4. Les stratégies devraient apparaître

### **Solution 2 : Redémarre le Daemon**

```bash
# Redémarre le daemon
curl -X POST http://localhost:3000/api/daemon-init

# Attends 5 secondes
sleep 5

# Ouvre l'application
open http://localhost:3000
```

### **Solution 3 : Redémarre le Serveur** (Clean Slate)

```bash
# Terminal 1: Arrête le serveur
# Ctrl+C ou :
lsof -ti:3000 | xargs kill -9

# Relance
npm run dev

# Attends 15 secondes pour que le serveur démarre

# Terminal 2: Démarre le daemon
curl -X POST http://localhost:3000/api/daemon-init

# Vérifie
curl -s http://localhost:3000/api/daemon-status | grep activeStrategies

# Ouvre l'app
open http://localhost:3000
```

### **Solution 4 : Force Reload** (Nuclear Option)

```bash
# Clear le cache StrategyManager
curl -X POST http://localhost:3000/api/reload-strategies

# Redémarre le daemon
curl -X POST http://localhost:3000/api/daemon-init

# Rafraîchis le navigateur
```

---

## 🐛 DEBUG MODE

### **Voir les Logs en Direct**

Ouvre la console du navigateur (F12 → Console) et cherche :

**Messages à chercher :**
```javascript
✅ StrategyManager ready with 42 strategies
📊 Sending 42 strategies to frontend
SSE Connected
Data received: { strategyPerformances: [...] }
```

**Si tu vois :**
```javascript
Error parsing SSE data
Connection timeout
```

→ Problème réseau ou serveur pas prêt

---

## 📈 TIMING NORMAL

Voici les temps normaux pour chaque étape :

| Étape | Temps Normal |
|-------|--------------|
| Serveur démarre | 5-8 secondes |
| Daemon initialise | 2-5 secondes |
| Stratégies chargent | 3-8 secondes (DB distante) |
| Frontend se connecte | 1-2 secondes |
| Stratégies affichées | 2-5 secondes |
| **TOTAL** | **10-20 secondes** |

---

## ✅ CHECKLIST

Avant de dire que ça ne marche pas, vérifie :

- [ ] Le serveur est démarré (`npm run dev`)
- [ ] Le daemon est actif (`curl http://localhost:3000/api/daemon-status`)
- [ ] Les WebSockets sont connectés (6/6)
- [ ] Le StrategyManager a chargé les stratégies (42)
- [ ] J'ai attendu au moins 15 secondes
- [ ] J'ai essayé de rafraîchir la page (F5)
- [ ] J'ai regardé les logs serveur
- [ ] J'ai regardé la console navigateur (F12)

---

## 🎉 UNE FOIS QUE ÇA MARCHE

Une fois que tu vois tes stratégies :

1. **Teste le changement de timeframe**
   - Clique sur 5m, 15m, etc.
   - Les stratégies correspondantes s'affichent

2. **Teste le toggle**
   - Active/Désactive une stratégie
   - Ça marche en temps réel

3. **Ferme le navigateur**
   - Attend 5 minutes
   - Rouvre l'application
   - Le trading a continué !

4. **Check les trades**
   - Si des conditions sont remplies, tu verras de nouveaux trades
   - Dans l'historique en bas de page

---

## 🚀 C'EST PRÊT !

**Une fois que tes stratégies s'affichent, tout fonctionne parfaitement !**

Le problème du skeleton initial est **normal** car :
- La DB est distante (latence réseau)
- 42 stratégies à charger
- Indicateurs à calculer
- Positions à restaurer

**Après le premier chargement, tout est instantané ! 🎯**

