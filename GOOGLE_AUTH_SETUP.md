# 🔐 Configuration Google OAuth

## Étape 1 : Créer les Credentials Google

### **1. Aller sur Google Cloud Console**
https://console.cloud.google.com/apis/credentials

### **2. Créer un Projet (si pas déjà fait)**
- Nom du projet : "Trading Bot BTC"

### **3. Créer OAuth 2.0 Client ID**
1. Cliquer sur **"Create Credentials"**
2. Sélectionner **"OAuth client ID"**
3. Application type : **"Web application"**
4. Name : "Trading Bot - Web"

### **4. Ajouter les Authorized redirect URIs**

**Development :**
```
http://localhost:3000/api/auth/callback/google
```

**Production :**
```
https://yourdomain.com/api/auth/callback/google
```

### **5. Copier les Credentials**
- ✅ Client ID
- ✅ Client secret

---

## Étape 2 : Configurer .env.local

Créez le fichier `.env.local` à la racine du projet :

```bash
# Database
DATABASE_URL=postgresql://tradingbot_user:Tradingbot2024!@91.99.163.156:5432/tradingbot_db

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generated-secret-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### **Générer NEXTAUTH_SECRET :**
```bash
openssl rand -base64 32
```

---

## Étape 3 : Vérifier que ça Fonctionne

**Redémarrer l'app :**
```bash
npm run dev
```

**Tester la connexion :**
1. Aller sur http://localhost:3000
2. Cliquer sur "Sign In" (si affiché)
3. Choisir Google
4. Autoriser l'application
5. Vous devriez être redirigé vers le dashboard

**Vérifier dans les logs :**
```
✅ User logged in: lucasfabregoule@gmail.com
```

Ou pour un nouvel utilisateur :
```
✅ New user created: newemail@gmail.com (ID: 2)
🎯 Creating default strategies for newemail@gmail.com...
  ✅ QuickStrike Scalp created on all timeframes
  ✅ Trend Follower AI created on all timeframes
  ✅ ConservativeTrendTrader created on all timeframes
✅ Default strategies created for newemail@gmail.com
```

---

## État Actuel de la Base de Données

✅ **Table `users` créée**
```sql
SELECT * FROM users;
-- 1 | lucasfabregoule@gmail.com | Lucas Fabre-Goule
```

✅ **42 stratégies assignées à user_id = 1**
```sql
SELECT user_id, COUNT(*) FROM strategies GROUP BY user_id;
-- 1 | 42
```

✅ **24 trades assignés à user_id = 1**
✅ **7 positions assignées à user_id = 1**

---

## Prochaines Étapes

Une fois `.env.local` configuré :
1. Les nouveaux utilisateurs verront **3 stratégies par défaut**
2. Chaque utilisateur verra **uniquement SES stratégies**
3. Les trades et positions sont **isolés par utilisateur**

**Le système multi-tenant est prêt ! 🎉**
