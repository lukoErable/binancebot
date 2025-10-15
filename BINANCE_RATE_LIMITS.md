# 🚦 Limites API Binance et Rate Limits

## 📊 Votre utilisation actuelle

### ✅ Utilisation REST API (Public)
**Appels effectués par votre bot:**
- **1 seul appel** au démarrage : `/api/v3/klines` pour récupérer 200 bougies historiques
- **Poids de la requête** : 2 (car limit=200, entre 100 et 1000)
- **Fréquence** : Une seule fois au lancement du bot

### ✅ Utilisation WebSocket
**Après l'initialisation:**
- Connexion WebSocket persistante à `wss://stream.binance.com:9443/ws/btcusdt@kline_1m`
- **Pas de rate limit** sur les WebSockets
- Flux continu de données en temps réel
- Aucun appel REST supplémentaire

## 🔢 Limites officielles Binance

### API REST - Endpoints publics (sans authentification)

#### Limite par poids (Request Weight)
```
Limite : 6000 poids par minute (window de 1 minute)
Reset : Rolling window (fenêtre glissante)
```

**Poids des endpoints courants:**
- `/api/v3/klines` avec limit ≤ 100 : **1 poids**
- `/api/v3/klines` avec 100 < limit ≤ 500 : **2 poids**
- `/api/v3/klines` avec 500 < limit ≤ 1000 : **5 poids**
- `/api/v3/ticker/price` : **2 poids**
- `/api/v3/depth` : **1 à 50 poids** selon limit

#### Limite par IP
```
Limite : 6000 requêtes par minute par IP
```

### API REST - Endpoints privés (avec authentification)

#### Ordres (Trading)
```
Limite : 50 nouveaux ordres par 10 secondes
Limite : 160 000 ordres par 24 heures
```

### WebSocket

```
✅ Pas de rate limit sur les connexions établies
✅ Limite : 5 messages par seconde lors de la souscription
✅ Maximum : 300 connexions simultanées par IP
✅ Maximum : 1024 streams combinés par connexion
```

## 📈 Analyse de votre consommation

### Scénario actuel (Mode Simulation)

**Au démarrage du bot:**
```
1 appel REST : /api/v3/klines?symbol=BTCUSDT&interval=1m&limit=200
Poids consommé : 2
Consommation : 0.033% de la limite (2/6000)
```

**Après le démarrage:**
```
WebSocket actif : Aucune consommation de rate limit REST
Données reçues : ~60 bougies par heure (1 par minute)
Coût : 0 appels REST
```

**Si vous redémarrez le bot 100 fois en 1 minute** (cas extrême):
```
100 redémarrages × 2 poids = 200 poids
Consommation : 3.3% de la limite (200/6000)
Verdict : ✅ Toujours OK !
```

### Comparaison avec d'autres approches

#### ❌ Approche REST uniquement (mauvaise)
Sans WebSocket, en polling toutes les 5 secondes:
```
12 appels/minute × 2 poids = 24 poids/minute
1440 poids/heure
Risque : Moyen (24% de la limite par minute)
```

#### ✅ Votre approche WebSocket (excellente)
```
2 poids au démarrage + WebSocket
~2 poids/24h (si on ne redémarre jamais)
Risque : Aucun
```

## 🎯 Bonnes pratiques que vous suivez déjà

### ✅ Ce que votre bot fait bien

1. **WebSocket pour le temps réel**
   - Connexion unique et persistante
   - Pas de polling REST
   - Latence minimale

2. **Un seul fetch initial**
   - Récupération des données historiques une seule fois
   - Ensuite tout vient du WebSocket

3. **Reconnexion intelligente**
   - Maximum 5 tentatives
   - Délai de 3 secondes entre tentatives
   - Pas de spam en cas d'erreur

4. **Pas d'ordres en mode simulation**
   - Aucune consommation de la limite d'ordres
   - Parfait pour tester

## ⚠️ Cas où vous devriez surveiller

### Scénario à éviter : Redémarrages fréquents

Si vous redémarrez le bot très fréquemment:
```typescript
// Configuration actuelle dans websocket-manager.ts
maxReconnectAttempts = 5;
reconnectDelay = 3000; // 3 secondes

// Pire cas : 5 reconnexions × 2 poids = 10 poids
// Même en redémarrant 100 fois : 1000 poids (16% de la limite)
```

**Verdict : Toujours largement en dessous de la limite !**

## 🚀 Quand vous passerez en trading réel (Phase 2)

### Limites à respecter pour les ordres

```typescript
// Limite : 50 ordres par 10 secondes
// Avec votre cooldown actuel de 5 minutes :
cooldownPeriod: 5 * 60 * 1000 // 5 minutes

// Maximum possible : 2 ordres par 10 minutes
// = 0.033 ordres par 10 secondes
// Consommation : 0.066% de la limite (0.033/50)
```

**Vous êtes 1500x en dessous de la limite !**

### Recommandations pour le trading réel

```typescript
// Ajouter un compteur d'ordres
private orderCount = 0;
private orderWindow = Date.now();

private checkOrderLimit(): boolean {
  const now = Date.now();
  
  // Reset tous les 10 secondes
  if (now - this.orderWindow >= 10000) {
    this.orderCount = 0;
    this.orderWindow = now;
  }
  
  // Max 40 ordres par fenêtre (marge de sécurité)
  return this.orderCount < 40;
}
```

## 📊 Monitoring en temps réel

### Headers de réponse Binance

Chaque réponse REST contient ces headers:
```
X-MBX-USED-WEIGHT-1M: 2        // Poids utilisé
X-MBX-ORDER-COUNT-10S: 0       // Ordres dans fenêtre 10s
```

### Code pour logger les limites

Ajoutez dans `websocket-manager.ts`:

```typescript
async initialize(): Promise<void> {
  // ... code existant ...
  
  const response = await fetch('...');
  
  // Logger les limites
  const usedWeight = response.headers.get('X-MBX-USED-WEIGHT-1M');
  console.log(`📊 API Weight utilisé: ${usedWeight}/6000`);
  
  // ... reste du code ...
}
```

## 🔍 Cas d'usage et consommation

### Utilisation typique sur 24h

```
Démarrage du bot : 2 poids
Fonctionnement : 0 poids (WebSocket)
Arrêt/Redémarrage occasionnel : 2 poids

Total 24h : 4-10 poids
Pourcentage de la limite : 0.07%
```

### Bot tournant 24/7 pendant 1 mois

```
1 démarrage au début : 2 poids
WebSocket actif en continu : 0 poids REST
Total sur 1 mois : 2 poids

Pourcentage de la limite : 0.00003%
```

### Multi-bots (10 bots simultanés)

```
10 bots × 2 poids = 20 poids au démarrage
Ensuite : 10 WebSockets (0 poids REST)
Total : 20 poids

Pourcentage : 0.33% de la limite
```

## ✅ Verdict final

### Votre situation actuelle

| Métrique | Votre usage | Limite | % utilisé |
|----------|-------------|--------|-----------|
| Weight au démarrage | 2 | 6000/min | 0.033% |
| Appels REST/minute | ~0 | 6000 | 0% |
| Ordres/10s (simulation) | 0 | 50 | 0% |
| WebSocket connections | 1 | 300 | 0.33% |

### 🎉 Conclusion

**Vous n'avez AUCUN risque de rate limit avec votre implémentation actuelle !**

Raisons:
1. ✅ Vous utilisez WebSocket (pas de rate limit)
2. ✅ Un seul appel REST au démarrage
3. ✅ Cooldown de 5 minutes entre trades
4. ✅ Mode simulation (pas d'ordres réels)

Vous pourriez redémarrer votre bot **1000 fois par minute** avant d'avoir un problème !

## 📚 Ressources

- [Documentation officielle Binance Rate Limits](https://binance-docs.github.io/apidocs/spot/en/#limits)
- [WebSocket Limits](https://binance-docs.github.io/apidocs/spot/en/#websocket-limits)
- [Best Practices](https://binance-docs.github.io/apidocs/spot/en/#general-api-information)

## 🛠️ Outils de monitoring (optionnels)

Pour surveiller votre consommation en temps réel, vous pouvez ajouter:

```typescript
// src/lib/rate-limit-monitor.ts
export class RateLimitMonitor {
  private requests: number[] = [];
  
  logRequest(weight: number = 1) {
    const now = Date.now();
    this.requests.push(now);
    
    // Garder seulement la dernière minute
    this.requests = this.requests.filter(t => now - t < 60000);
    
    const totalWeight = this.requests.length * weight;
    console.log(`📊 Weight utilisé (1min): ${totalWeight}/6000`);
    
    if (totalWeight > 5000) {
      console.warn('⚠️ Attention: Proche de la limite!');
    }
  }
}
```

---

**TL;DR**: Avec 1 seul appel REST au démarrage et WebSocket pour le reste, vous êtes à **0.033% de la limite**. Vous pouvez dormir tranquille ! 😴

