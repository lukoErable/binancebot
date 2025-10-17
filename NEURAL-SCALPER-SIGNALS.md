# 🟢🟠⚪ Système de Signaux Neural Scalper

**Date:** 17 Octobre 2025  
**Statut:** ✅ CONFIGURÉ

---

## 🎯 Système de Points - Légende

Le système de points vous indique l'état de chaque critère en temps réel :

| Couleur | État | Signification |
|---------|------|---------------|
| 🟢 **VERT** | **Validé** | Le critère est rempli |
| 🟠 **ORANGE** | **Proche** | Le critère est proche d'être validé |
| ⚪ **GRIS** | **Non validé** | Le critère n'est pas rempli |

---

## 🟢 Signal LONG (Buy the Dip)

### Conditions VERTES ✅

| Critère | Condition Verte | Valeur Requise |
|---------|-----------------|----------------|
| **Accel↘** | `acceleration < 0` | Prix chute rapidement |
| **Vel↘** | `velocity < 0` | Momentum baissier confirmé |
| **📊Vol** | `volumeSpike ∨ volatilityHigh` | Forte activité détectée |
| **P<VWAP** | `price < VWAP` | Prix en dessous de la moyenne |
| **RSI-M↘** | `rsiMomentum < -1.5` | Survente extrême |

### Conditions ORANGES 🟠

| Critère | Condition Orange | Zone de Proximité |
|---------|------------------|-------------------|
| **Accel↘** | `-0.5 < acceleration < 0` | Commence à ralentir mais pas encore négatif |
| **Vel↘** | `-0.5 < velocity < 0` | Commence à ralentir mais pas encore négatif |
| **📊Vol** | N/A | Binaire (spike ou pas) |
| **P<VWAP** | `prix > VWAP && distance < 0.2%` | Prix à moins de 0.2% au-dessus du VWAP |
| **RSI-M↘** | `-2.0 ≤ rsiMomentum < -1.5` | RSI proche du seuil de survente |

### Exemple Visuel LONG

```
Scénario 1: Signal Imminent (4 verts, 1 orange)
🟢 Accel↘    (-0.02)     ✓ Prix chute
🟢 Vel↘      (-0.15)     ✓ Momentum baissier
🟢 📊Vol     (spike)     ✓ Volume élevé
🟠 P<VWAP    (+0.1%)     ⚠️ Prix juste au-dessus du VWAP
🟢 RSI-M↘    (-1.8)      ✓ Survente

→ Attention ! Signal peut se déclencher bientôt si prix descend de 0.1%
```

```
Scénario 2: Signal Déclenché (5 verts)
🟢 Accel↘    (-0.03)     ✓ Prix chute
🟢 Vel↘      (-0.18)     ✓ Momentum baissier
🟢 📊Vol     (spike)     ✓ Volume élevé
🟢 P<VWAP    (-0.05%)    ✓ Prix en dessous du VWAP
🟢 RSI-M↘    (-1.9)      ✓ Survente

→ SIGNAL LONG DÉCLENCHÉ ! 🚀
```

---

## 🔴 Signal SHORT (Sell the Rip)

### Conditions VERTES ✅

| Critère | Condition Verte | Valeur Requise |
|---------|-----------------|----------------|
| **Accel↗** | `acceleration > 0` | Prix monte rapidement |
| **Vel↗** | `velocity > 0` | Momentum haussier confirmé |
| **📊Vol** | `volumeSpike ∨ volatilityHigh` | Forte activité détectée |
| **P>VWAP** | `price > VWAP` | Prix au-dessus de la moyenne |
| **RSI-M↗** | `rsiMomentum > 1.5` | Surachat extrême |

### Conditions ORANGES 🟠

| Critère | Condition Orange | Zone de Proximité |
|---------|------------------|-------------------|
| **Accel↗** | `0 < acceleration < 0.5` | Commence à accélérer mais pas assez |
| **Vel↗** | `0 < velocity < 0.5` | Commence à accélérer mais pas assez |
| **📊Vol** | N/A | Binaire (spike ou pas) |
| **P>VWAP** | `prix < VWAP && distance < 0.2%` | Prix à moins de 0.2% en dessous du VWAP |
| **RSI-M↗** | `1.5 < rsiMomentum ≤ 2.0` | RSI proche du seuil de surachat |

### Exemple Visuel SHORT

```
Scénario 1: Signal se Construit (2 verts, 3 oranges)
🟠 Accel↗    (+0.01)     ⚠️ Commence à accélérer
🟠 Vel↗      (+0.03)     ⚠️ Commence à monter
🟢 📊Vol     (volatilité) ✓ Marché volatil
🟢 P>VWAP    (+0.3%)     ✓ Prix au-dessus du VWAP
🟠 RSI-M↗    (+1.7)      ⚠️ RSI proche du seuil

→ Signal en construction, surveiller l'évolution
```

```
Scénario 2: Signal Déclenché (5 verts)
🟢 Accel↗    (+0.04)     ✓ Prix monte rapidement
🟢 Vel↗      (+0.22)     ✓ Momentum haussier
🟢 📊Vol     (spike)     ✓ Volume explosif
🟢 P>VWAP    (+0.6%)     ✓ Prix bien au-dessus du VWAP
🟢 RSI-M↗    (+2.1)      ✓ Surachat

→ SIGNAL SHORT DÉCLENCHÉ ! 📉
```

---

## 📊 Tableau Récapitulatif des Seuils

### LONG (Buy the Dip)

| Critère | ⚪ Gris | 🟠 Orange | 🟢 Vert |
|---------|---------|-----------|---------|
| **Acceleration** | `accel ≥ 0` | `-0.5 < accel < 0` | `accel < 0` |
| **Velocity** | `vel ≥ 0` | `-0.5 < vel < 0` | `vel < 0` |
| **Volume/Volatilité** | Aucun | N/A | Spike OU Volatilité |
| **Prix vs VWAP** | `prix > VWAP + 0.2%` | `VWAP < prix < VWAP + 0.2%` | `prix < VWAP` |
| **RSI Momentum** | `rsiM ≥ -1.5` | `-2.0 ≤ rsiM < -1.5` | `rsiM < -1.5` |

### SHORT (Sell the Rip)

| Critère | ⚪ Gris | 🟠 Orange | 🟢 Vert |
|---------|---------|-----------|---------|
| **Acceleration** | `accel ≤ 0` | `0 < accel < 0.5` | `accel > 0` |
| **Velocity** | `vel ≤ 0` | `0 < vel < 0.5` | `vel > 0` |
| **Volume/Volatilité** | Aucun | N/A | Spike OU Volatilité |
| **Prix vs VWAP** | `prix < VWAP - 0.2%` | `VWAP - 0.2% < prix < VWAP` | `prix > VWAP` |
| **RSI Momentum** | `rsiM ≤ 1.5` | `1.5 < rsiM ≤ 2.0` | `rsiM > 1.5` |

---

## 🎯 Quand le Signal se Déclenche ?

### Conditions Requises pour Signal READY

Un signal LONG ou SHORT se déclenche quand **TOUS** les critères suivants sont remplis :

#### Critères de Marché (5 points verts)
1. ✅ **Acceleration** : Verte
2. ✅ **Velocity** : Verte
3. ✅ **Volume/Volatilité** : Verte
4. ✅ **Prix vs VWAP** : Verte
5. ✅ **RSI Momentum** : Verte

#### Critères de Position
6. ✅ **Pas de position active** : `type === 'NONE'`
7. ✅ **Cooldown passé** : 30 secondes depuis le dernier trade

### Affichage Visuel

```
TOUS LES POINTS VERTS + Pas de position + Cooldown OK
↓
🟢🟢🟢🟢🟢 + [NONE] + ⏱️✅
↓
SIGNAL READY - Pulsation verte intense
↓
Trade exécuté automatiquement
```

---

## 🔄 Cycle de Vie d'un Signal

### Phase 1 : Construction (Points Oranges)
```
⚪⚪🟠🟠🟢  → Signal se construit
              2 critères proches, 1 validé, 2 non validés
```

### Phase 2 : Presque Prêt (Majorité Orange/Vert)
```
🟠🟢🟢🟢🟢  → Signal presque prêt
              1 critère proche, 4 validés
```

### Phase 3 : READY (Tous Verts)
```
🟢🟢🟢🟢🟢  → SIGNAL READY
              Tous les critères validés
              Pulsation verte intense
```

### Phase 4 : Exécution
```
🚀 Trade exécuté
Position ouverte (LONG ou SHORT)
Cooldown activé (30s)
```

### Phase 5 : En Position
```
⚪⚪⚪⚪⚪  → Points gris (pas de nouveau signal)
Badge LONG/SHORT affiché
P&L mis à jour en temps réel
```

---

## 💡 Conseils d'Utilisation

### 🟢 Signaux Verts
- **Action** : Le critère est validé, aucune action nécessaire
- **Interprétation** : Conditions favorables pour ce critère

### 🟠 Signaux Oranges
- **Action** : Surveiller attentivement, signal peut se déclencher bientôt
- **Interprétation** : Le marché approche des conditions de trading
- **Exemple** : Prix à 0.15% du VWAP → peut franchir à tout moment

### ⚪ Signaux Gris
- **Action** : Attendre, conditions non favorables
- **Interprétation** : Le critère est loin d'être validé

---

## 📈 Exemples Réels

### Exemple 1 : Chute Brutale (LONG)

```
Prix BTC: $98,500 → $98,200 en 20 secondes
VWAP: $98,400

T+0s:  ⚪⚪⚪⚪⚪  (Marché stable)
T+5s:  🟠🟠⚪⚪⚪  (Commence à chuter)
T+10s: 🟢🟢🟠⚪⚪  (Chute confirmée)
T+15s: 🟢🟢🟢🟢🟠  (Signal presque prêt)
T+20s: 🟢🟢🟢🟢🟢  (SIGNAL LONG! Buy the dip @ $98,200)

→ Position LONG ouverte
→ TP: $98,677 (+1.5%)
→ SL: $97,414 (-0.8%)
→ Max time: 2 minutes
```

### Exemple 2 : Montée Brutale (SHORT)

```
Prix BTC: $98,100 → $98,450 en 25 secondes
VWAP: $98,250

T+0s:  ⚪⚪⚪⚪⚪  (Marché stable)
T+5s:  ⚪🟠⚪🟠⚪  (Commence à monter)
T+10s: 🟠🟢🟠🟢⚪  (Montée confirmée)
T+15s: 🟢🟢🟢🟢🟠  (Signal presque prêt)
T+25s: 🟢🟢🟢🟢🟢  (SIGNAL SHORT! Sell the rip @ $98,450)

→ Position SHORT ouverte
→ TP: $96,973 (-1.5%)
→ SL: $99,238 (+0.8%)
→ Max time: 2 minutes
```

---

## 🎯 Points Clés à Retenir

1. **🟢 Vert = Validé** : Le critère est rempli
2. **🟠 Orange = Proche** : Le critère est à quelques % ou unités d'être validé
3. **⚪ Gris = Loin** : Le critère n'est pas proche d'être validé

4. **Signal READY** : Tous les points verts + pas de position + cooldown OK
5. **Pulsation intense** : Indique qu'un signal va se déclencher immédiatement
6. **Badge Position** : Remplace les points quand une position est active

---

## 🔧 Configuration Technique

### Seuils de Proximité (Orange)

| Paramètre | Seuil Orange | Modifiable |
|-----------|--------------|------------|
| Acceleration | ±0.5 | ❌ Non (code) |
| Velocity | ±0.5 | ❌ Non (code) |
| Distance VWAP | 0.2% | ❌ Non (code) |
| RSI Momentum | ±0.5 autour du seuil | ❌ Non (code) |

### Paramètres de Trading

| Paramètre | Valeur | Modifiable |
|-----------|--------|------------|
| Take Profit | +1.5% | ✅ Oui (UI) |
| Stop Loss | -0.8% | ✅ Oui (UI) |
| Max Position Time | 2 minutes | ✅ Oui (UI) |
| Cooldown | 30 secondes | ❌ Non (code) |

---

## 📊 Monitoring en Temps Réel

### Dans le Dashboard

Vous verrez en temps réel :
- **Ligne LONG** : 🟢🟢🟠🟠⚪ + Labels (Accel↘, Vel↘, etc.)
- **Ligne SHORT** : 🟠🟢⚪⚪⚪ + Labels (Accel↗, Vel↗, etc.)
- **Cooldown** : ⏱️ 15s restant (si applicable)
- **Position** : Badge LONG/SHORT avec P&L en temps réel

### Tooltips Informatifs

Survolez un point pour voir :
- **Nom du critère**
- **Valeur actuelle** (ex: "Accélération: -0.0234")
- **Seuil requis** (ex: "Doit être < 0")

---

**Statut :** ✅ Système de signaux configuré et synchronisé  
**Dernière mise à jour :** 17 Octobre 2025

