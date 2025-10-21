# 🚀 Démarrage Rapide - Authentification Google

## 🎯 Bouton de Connexion Ajouté !

Le bouton "Sign in with Google" est maintenant visible en haut à droite, juste avant le monitoring ! 🎊

---

## ⚡ Configuration Express (5 minutes)

### **Étape 1 : Créer `.env.local`**

Créez le fichier `.env.local` à la racine du projet avec :

```bash
# Database
DATABASE_URL=postgresql://tradingbot_user:Tradingbot2024!@91.99.163.156:5432/tradingbot_db

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=YOUR_SECRET_HERE

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### **Étape 2 : Générer `NEXTAUTH_SECRET`**

```bash
openssl rand -base64 32
```

Copiez le résultat dans `.env.local`

### **Étape 3 : Obtenir Google OAuth Credentials**

1. **Aller sur** https://console.cloud.google.com/apis/credentials
2. **Cliquer** "Create Credentials" → "OAuth client ID"
3. **Type:** Web application
4. **Authorized redirect URIs:**
   ```
   http://localhost:3000/api/auth/callback/google
   ```
5. **Copier** Client ID et Client Secret dans `.env.local`

### **Étape 4 : Redémarrer l'App**

```bash
# Arrêter l'app (Ctrl+C)
npm run dev
```

---

## 🎨 Ce Que Vous Verrez

### **❌ Sans Google OAuth Configuré**
- Bouton blanc "Sign in with Google" visible
- Clique dessus → Page d'erreur (credentials manquants)

### **✅ Avec Google OAuth Configuré**

**Avant connexion :**
- Bouton blanc "Sign in with Google"

**Après connexion :**
- Votre photo Google (avatar rond)
- Votre nom à côté de la photo
- Bordure cyan/sky élégante
- Dropdown au clic :
  - Votre nom complet
  - Votre email
  - Bouton "Déconnexion"

---

## 🔍 Vérification

**Le bouton est bien visible** en haut à droite :
```
┌──────────────────────────────────────────────────────────┐
│ Fluxion | BTC/USDT   [Timeframes]   [👤 Sign in] [🟢 MONITORING] │
└──────────────────────────────────────────────────────────┘
```

Une fois connecté :
```
┌──────────────────────────────────────────────────────────┐
│ Fluxion | BTC/USDT   [Timeframes]   [🖼️ Lucas F.] [🟢 MONITORING] │
└──────────────────────────────────────────────────────────┘
```

---

## 💡 Mode Dev (Sans OAuth)

**Si tu ne configures PAS Google OAuth :**
- Le bouton "Sign in with Google" s'affiche quand même
- Tu peux utiliser l'app normalement
- Toutes tes stratégies sont visibles (user_id = 1 par défaut)
- **L'authentification n'est PAS obligatoire en dev !**

---

## 🎉 C'est Prêt !

L'interface est maintenant **complète** avec :
- ✅ Bouton de connexion Google visible
- ✅ Avatar utilisateur une fois connecté
- ✅ Dropdown avec déconnexion
- ✅ Design élégant et cohérent

**Teste-le maintenant sur http://localhost:3000** 🚀

