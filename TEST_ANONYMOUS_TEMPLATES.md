# 🧪 Test des Templates pour Utilisateurs Anonymes

Date: 21 Octobre 2025  
Status: ✅ Corrections appliquées - Prêt à tester

---

## 🔧 Corrections Appliquées

### **1. Import Obsolète Corrigé** (shared-multi-websocket-manager.ts)
```typescript
// ❌ AVANT
import { getGlobalStrategyManager } from './websocket-manager';

// ✅ APRÈS  
import { StrategyManager } from './strategy-manager';
```

### **2. Fallback Corrigé** (5 occurrences)
```typescript
// ❌ AVANT
const strategyManager = getGlobalStrategyManager();

// ✅ APRÈS
const strategyManager = StrategyManager.getGlobalInstance();
```

### **3. Logs Debug Ajoutés** (Dashboard.tsx)
```typescript
// Ligne 80 - Vérifier l'état d'initialisation
console.log(`🔍 [SSE Effect] status=${status}, isFirstLoad=${isFirstLoad}, session=${session ? 'exists' : 'null'}`);

// Ligne 152 - Vérifier les données reçues pour anonymes
if (!session || status !== 'authenticated') {
  console.log(`📦 [ANONYMOUS] Received data from SSE:`, {
    count: data.strategyPerformances?.length || 0,
    strategies: data.strategyPerformances?.map(p => p.strategyName) || []
  });
}
```

---

## 🧪 Comment Tester

### **Étape 1 : Ouvrir en Navigation Privée**
```bash
# Chrome/Brave
Cmd + Shift + N

# Safari
Cmd + Shift + N

# Puis visite : http://localhost:3000
```

---

### **Étape 2 : Logs à Vérifier**

#### **Console Navigateur (F12 → Console)**

Tu devrais voir :

```javascript
🔍 [SSE Effect] status=unauthenticated, isFirstLoad=true, session=null
⏳ Waiting for localStorage to load...

🔍 [SSE Effect] status=unauthenticated, isFirstLoad=false, session=null
🔄 Auth status: unauthenticated, starting SSE with timeframe: 1m...
🚀 Starting SSE stream on 1m...

📦 [ANONYMOUS] Received data from SSE: {
  hasStrategyPerformances: true,
  count: 3,
  strategies: ['EMA Crossover', 'RSI Momentum', 'Trend Following']
}
```

#### **Terminal Serveur (Backend)**

Tu devrais voir :

```
✅ [USER anonymous] StrategyManager ready with 68 strategies
📊 [USER anonymous] Active strategies on: 1m, 1h, 15m, 1d, 5m
📊 [USER anonymous] (anonymous) Sending 3 strategies to frontend (filtered from 68 total)
✅ [USER anonymous] Multi-timeframe system initialized
✅ [USER anonymous] SSE stream started
```

---

### **Étape 3 : Ce Que Tu Dois Voir dans le Frontend**

✅ **3 cartes de stratégies** :
1. EMA Crossover
2. RSI Momentum  
3. Trend Following

✅ **Toutes désactivées** :
- Toggle switch en position OFF
- Couleur grise/neutre
- Pas de position active

✅ **Indicateurs visibles** :
- RSI, EMA, Prix, etc.
- Graphique Binance
- Pas de trades (0 trades, 0 P&L)

✅ **Interaction** :
- Click sur toggle → Popup "Sign in with Google"
- Pas de boutons edit/delete visibles (ou désactivés)

---

## ❌ Si les Templates N'Apparaissent PAS

### **Logs à Checker**

1. **Console Navigateur** :
   ```javascript
   // Cherche ce log
   📦 [ANONYMOUS] Received data from SSE: { count: 0, ... }
   // Si count = 0 → Problème backend
   // Si pas de log du tout → SSE ne démarre pas
   ```

2. **Terminal Serveur** :
   ```
   // Cherche ces logs
   [USER anonymous] Initializing...
   // Si absent → SSE ne se connecte pas
   
   Sending 0 strategies to frontend
   // Si 0 strategies → Problème de filtrage
   ```

---

## 🐛 Debugging Guide

### **Scénario A : Aucun Log dans Console Navigateur**

**Problème** : SSE ne démarre pas

**Solution** :
```javascript
// Dans console navigateur, vérifie :
console.log('Status:', status);
console.log('isFirstLoad:', isFirstLoad);

// Si isFirstLoad = true pendant plus de 2 secondes → Bug d'initialisation
```

---

### **Scénario B : Log dit "count: 0"**

**Problème** : Backend ne trouve pas les templates

**Vérification** :
```bash
# Vérifier DB
node db-info.mjs | grep "template@system"

# Devrait voir 3 lignes :
# 70 │ template@system │ EMA Crossover  │ 1m
# 71 │ template@system │ RSI Momentum   │ 1m
# 72 │ template@system │ Trend Following│ 1m
```

---

### **Scénario C : Log dit "count: 3" mais pas de cartes**

**Problème** : Problème de rendering React

**Vérification** :
```javascript
// Dans console navigateur
document.querySelectorAll('[data-strategy]').length
// Devrait retourner 3

// Ou chercher
strategyPerformances.length
```

---

## 🔍 Commandes de Debug Utiles

### **1. Vérifier DB Templates**
```bash
node db-info.mjs | grep -A 3 "template@system"
```

### **2. Vérifier Logs SSE Backend**
```bash
# Chercher dans les logs serveur :
grep "USER anonymous" | tail -20
```

### **3. Forcer Reload StrategyManager**
```bash
curl -X POST http://localhost:3000/api/reload-strategies
```

---

## 📝 Prochaine Étape

**Ouvre en navigation privée et teste maintenant !**

Puis donne-moi :
1. ✅ Les logs de la **console navigateur** (F12 → Console)
2. ✅ Les logs du **terminal serveur** avec `[USER anonymous]`

Je pourrai alors identifier exactement où est le problème ! 🔍

