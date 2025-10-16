# 📊 Analyse de la Structure de la Base de Données

Date: 16/10/2025

## 📋 Vue d'ensemble des tables

| Table | Rôle | Statut |
|-------|------|--------|
| `strategies` | Configuration et état des stratégies | ✅ Bien configurée |
| `trades` | Journal de tous les signaux | ⚠️ Besoin d'optimisation |
| `completed_trades` | Historique des trades complets | ✅ Bien configurée |
| `market_snapshots` | Snapshots du marché | ❓ À vérifier l'utilisation |
| `strategy_performances` | Performances des stratégies | ❓ Non utilisée actuellement |

---

## 1️⃣ Table `strategies` ✅

**Rôle:** Référentiel central des stratégies

### Structure
```
- id (PK, autoincrement)
- name (UNIQUE, NOT NULL) ← Utilisé comme référence
- type (NOT NULL)
- is_active (boolean, default false)
- config (jsonb, NOT NULL)
- created_at, updated_at (timestamps)
```

### Index
- ✅ Primary Key sur `id`
- ✅ Unique constraint sur `name`

### Foreign Keys
- ✅ Referenced by `trades`, `completed_trades`, `strategy_performances`

**Verdict:** ✅ **Excellente structure**
- Bonnes contraintes d'intégrité
- Index appropriés
- Cascade ON DELETE protège les données

---

## 2️⃣ Table `trades` ⚠️

**Rôle:** Journal de TOUS les signaux (BUY, SELL, CLOSE_LONG, CLOSE_SHORT)

### Structure actuelle (27 colonnes!)
```
CORE:
- id, strategy_name, strategy_type, signal_type
- price, quantity, timestamp
- reason, metadata

TECHNICAL INDICATORS (optionnels):
- rsi, ema12, ema26, ema50, ema200

POSITION INFO (❌ problématique):
- position_type, entry_price, entry_time
- unrealized_pnl, unrealized_pnl_percent
- total_pnl, total_pnl_percent
- current_capital

TRADE CLOSURE (❌ problématique):
- exit_price, pnl, pnl_percent, fees
```

### Index
- ✅ Primary Key sur `id`
- ✅ Index sur `strategy_name`
- ✅ Index sur `signal_type`
- ✅ Index sur `timestamp DESC` (bon pour les requêtes récentes)

### ⚠️ Problèmes identifiés

#### 1. **Mélange de concepts**
La table mélange 3 concepts différents :
- ✅ Signaux individuels (BUY, SELL) → OK
- ❌ État des positions en cours → Devrait être en mémoire ou table séparée
- ❌ Résultats de trades → Déjà dans `completed_trades`

#### 2. **Redondance**
Les colonnes suivantes sont **redondantes** car déjà dans `completed_trades` :
```
- pnl
- pnl_percent
- exit_price
- fees (pour les trades fermés)
```

#### 3. **Colonnes inutiles pour les signaux d'ouverture**
Quand tu enregistres un signal `BUY` :
- `exit_price` = NULL
- `pnl` = NULL
- `unrealized_pnl` = NULL (calculé en temps réel)
- `total_pnl` = NULL

→ Beaucoup de valeurs NULL inutiles

#### 4. **Confusion entre unrealized et realized PnL**
```
unrealized_pnl         ← P&L de la position en cours (change en temps réel)
pnl                    ← P&L final d'un trade fermé
total_pnl              ← P&L cumulé de la stratégie
```

Ces 3 concepts ne devraient pas être dans la même table !

---

## 3️⃣ Table `completed_trades` ✅

**Rôle:** Historique des trades complets (entry → exit)

### Structure
```
CORE:
- id, strategy_name, strategy_type
- position_type (LONG/SHORT)

ENTRY:
- entry_price, entry_time, entry_reason

EXIT:
- exit_price, exit_time, exit_reason

RESULTS:
- pnl, pnl_percent, fees
- quantity, duration
- is_win (boolean)
```

### Index
- ✅ Primary Key sur `id`
- ✅ Index composite `(strategy_name, exit_time DESC)` → Excellent pour les requêtes
- ✅ Index sur `(strategy_name, is_win)` → Bon pour les stats de winrate
- ✅ Index sur `exit_time DESC` → Bon pour l'historique récent

### Constraints
- ✅ Check constraint : `position_type IN ('LONG', 'SHORT')`
- ✅ Foreign Key vers `strategies` avec CASCADE

**Verdict:** ✅ **Structure PARFAITE**
- Séparation claire des responsabilités
- Index optimisés pour les requêtes typiques
- Contraintes appropriées
- Pas de redondance

---

## 🎯 Recommandations

### 🔴 URGENT: Simplifier la table `trades`

#### Option A: Minimaliste (Recommandé)
Garder seulement les colonnes essentielles pour le journal de signaux :

```sql
CREATE TABLE trades (
  id SERIAL PRIMARY KEY,
  strategy_name VARCHAR(100) NOT NULL REFERENCES strategies(name) ON DELETE CASCADE,
  strategy_type VARCHAR(50) NOT NULL,
  
  -- Signal info
  signal_type VARCHAR(20) NOT NULL, -- BUY, SELL, CLOSE_LONG, CLOSE_SHORT, HOLD
  price NUMERIC(20,8) NOT NULL,
  timestamp BIGINT NOT NULL,
  reason TEXT,
  
  -- Technical indicators (optionnel, pour debug/analyse)
  indicators JSONB, -- Flexible: {rsi: 45.2, ema12: 108000, ...}
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Index
  INDEX idx_trades_strategy (strategy_name),
  INDEX idx_trades_timestamp (timestamp DESC),
  INDEX idx_trades_signal_type (signal_type)
);
```

**Avantages:**
- ✅ Pas de colonnes NULL inutiles
- ✅ Stockage optimisé (moins d'espace disque)
- ✅ Requêtes plus rapides
- ✅ Séparation claire : signaux vs trades

**À supprimer:**
```
❌ position_type, entry_price, entry_time
❌ unrealized_pnl, unrealized_pnl_percent
❌ total_pnl, total_pnl_percent, current_capital
❌ exit_price, pnl, pnl_percent, fees
❌ rsi, ema12, ema26, ema50, ema200 (remplacer par jsonb)
```

#### Option B: Conservatrice
Garder la structure actuelle mais :
1. Documenter clairement que certaines colonnes ne sont remplies que pour certains signal_type
2. Ajouter des commentaires sur les colonnes
3. Créer une vue pour simplifier les requêtes courantes

---

### 🟡 MOYEN: Utiliser ou supprimer les tables inutilisées

#### `strategy_performances`
- Actuellement vide (0 rows)
- Semble redondante avec les calculs depuis `completed_trades`
- **Recommandation:** Supprimer ou clarifier son usage

#### `market_snapshots`
- Usage inconnu
- **Recommandation:** Vérifier si utilisée, sinon supprimer

---

### 🟢 BON: Structure globale

#### Points forts
1. ✅ Séparation `trades` (signaux) et `completed_trades` (résultats)
2. ✅ Table `strategies` centrale avec contraintes d'intégrité
3. ✅ Index bien placés pour les requêtes courantes
4. ✅ Foreign Keys avec CASCADE pour la cohérence

#### Architecture proposée

```
┌─────────────────┐
│   strategies    │  ← Configuration centrale
│  (name: UNIQUE) │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌───────────────────┐
│     trades      │  │ completed_trades  │
│   (signaux)     │  │  (trades finis)   │
│                 │  │                   │
│ BUY @ 108000    │  │ LONG: 108000→110000 │
│ CLOSE_LONG      │  │ PnL: +2000 (WIN)  │
└─────────────────┘  └───────────────────┘
     Journal              Résultats
```

---

## 📈 Statistiques actuelles

```
Strategies: 6
Trades (signaux): 16
Completed Trades: 0 (aucun trade fermé encore)
```

---

## 🔧 Script de migration proposé

Si tu veux nettoyer la table `trades`, voici un script :

```sql
-- 1. Créer une nouvelle table simplifiée
CREATE TABLE trades_new (
  id SERIAL PRIMARY KEY,
  strategy_name VARCHAR(100) NOT NULL REFERENCES strategies(name) ON DELETE CASCADE,
  strategy_type VARCHAR(50) NOT NULL,
  signal_type VARCHAR(20) NOT NULL,
  price NUMERIC(20,8) NOT NULL,
  timestamp BIGINT NOT NULL,
  reason TEXT,
  indicators JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Migrer les données
INSERT INTO trades_new (strategy_name, strategy_type, signal_type, price, timestamp, reason, indicators, created_at)
SELECT 
  strategy_name,
  strategy_type,
  signal_type,
  price,
  timestamp,
  reason,
  jsonb_build_object(
    'rsi', rsi,
    'ema12', ema12,
    'ema26', ema26,
    'ema50', ema50,
    'ema200', ema200,
    'metadata', metadata
  ) as indicators,
  created_at
FROM trades;

-- 3. Créer les index
CREATE INDEX idx_trades_new_strategy ON trades_new(strategy_name);
CREATE INDEX idx_trades_new_timestamp ON trades_new(timestamp DESC);
CREATE INDEX idx_trades_new_signal_type ON trades_new(signal_type);

-- 4. Renommer (après backup!)
-- ALTER TABLE trades RENAME TO trades_old;
-- ALTER TABLE trades_new RENAME TO trades;
```

---

## ✅ Verdict Final

| Aspect | Note | Commentaire |
|--------|------|-------------|
| Architecture globale | 8/10 | Bonne séparation signaux/trades |
| Table `strategies` | 10/10 | Parfait |
| Table `completed_trades` | 10/10 | Parfait |
| Table `trades` | 5/10 | Trop de colonnes, concepts mélangés |
| Index | 9/10 | Bien placés |
| Foreign Keys | 10/10 | Intégrité référentielle assurée |
| **TOTAL** | **7.5/10** | Bon mais peut être optimisé |

---

## 🎯 Action immédiate recommandée

**Court terme:** Continue avec la structure actuelle, elle fonctionne.

**Moyen terme:** Planifie une migration pour simplifier `trades` quand tu auras plus de données et pourras tester.

**Long terme:** Documente clairement l'usage de chaque colonne pour les futurs développeurs.

