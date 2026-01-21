# Correction du problème de redirection vers l'interface admin

## Problème

Après la connexion, la redirection vers l'interface d'administration échoue.

## Causes identifiées

### 1. Configuration Payload incorrecte

**Problème** : `PAYLOAD_PUBLIC_SERVER_URL` pointait vers la production (`https://api.mytechgear.eu`) au lieu de `http://localhost:3001` en développement local.

**Solution** : ✅ Corrigé dans `.env` du backend
```env
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3001
```

### 2. Cookie payload-token non accessible

**Problème** : Le middleware Next.js vérifie l'authentification via le cookie `payload-token`, mais ce cookie peut ne pas être correctement stocké ou accessible à cause de :
- Configuration CORS
- Attributs du cookie (SameSite, Secure, Domain)
- Différence entre localStorage et cookies

**Vérification** :
- Payload envoie le cookie `payload-token` dans la réponse HTTP
- Le frontend doit recevoir ce cookie avec `credentials: 'include'`
- Le middleware Next.js doit pouvoir lire ce cookie

## Solutions

### Solution 1 : Vérifier les cookies dans le navigateur

1. Ouvrez les DevTools (F12)
2. Allez dans l'onglet "Application" (Chrome) ou "Stockage" (Firefox)
3. Vérifiez les cookies pour `http://localhost:3200`
4. Cherchez le cookie `payload-token`

Si le cookie n'existe pas :
- Vérifiez la configuration CORS dans Payload
- Vérifiez que `credentials: 'include'` est utilisé dans les requêtes fetch

### Solution 2 : Vérifier la configuration CORS

Dans `payload.config.ts`, assurez-vous que :
```typescript
cors: [
  'http://localhost:3200',  // Frontend local
  'http://localhost:3000',
  // ... autres URLs
],
```

### Solution 3 : Vérifier les attributs du cookie

Le cookie `payload-token` doit avoir :
- `Path=/` (accessible sur tout le site)
- `SameSite=Lax` ou `SameSite=None; Secure` (selon votre configuration)
- `HttpOnly` (pour la sécurité)

### Solution 4 : Utiliser la redirection explicite

Si le problème persiste, redirigez explicitement vers `/payload-admin` après login :

```typescript
// Dans auth-context.tsx ou auth/page.tsx
if (success) {
  router.push('/payload-admin');  // Au lieu de router.push(redirect)
}
```

## Test de diagnostic

### 1. Vérifier que le cookie est reçu

```bash
# Test avec curl
curl -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin-1769011922-ae5ef6f2@mytechgear.eu","password":"Admin123!@#"}' \
  -c /tmp/cookies.txt -v

# Vérifier le cookie
cat /tmp/cookies.txt | grep payload-token
```

### 2. Vérifier l'endpoint /api/users/me

```bash
# Avec le token
TOKEN="votre-token"
curl http://localhost:3001/api/users/me \
  -H "Authorization: JWT $TOKEN"
```

### 3. Vérifier la route admin

```bash
# Tester l'accès à l'admin
curl http://localhost:3200/payload-admin \
  -H "Cookie: payload-token=votre-token"
```

## Workflow de connexion attendu

1. **Login** : `POST /api/users/login`
   - Payload retourne le token + cookie `payload-token`
   - Le navigateur stocke automatiquement le cookie

2. **Redirection** : Vers `/payload-admin` (ou `redirect` param)

3. **Middleware Next.js** : Vérifie le cookie `payload-token`
   - Si présent et valide → autorise l'accès
   - Si absent ou invalide → redirige vers `/payload-admin/login?redirect=/payload-admin`

4. **Page admin** : `requireAdminServer()` vérifie le rôle admin
   - Si admin → affiche la page
   - Si non admin → redirige vers login

## Dépannage

### Erreur : "Redirection vers l'interface d'administration..."

**Causes possibles** :
1. Cookie `payload-token` non reçu
2. Cookie non accessible (CORS, SameSite)
3. Token invalide ou expiré
4. Rôle utilisateur n'est pas "admin"

**Solutions** :
1. Vérifier les cookies dans DevTools
2. Vérifier la configuration CORS
3. Vérifier le rôle dans MongoDB
4. Vérifier les logs backend pour les erreurs

### Erreur : Boucle de redirection

Si vous êtes redirigé en boucle entre login et admin :
- Le cookie est reçu mais le middleware ne peut pas le lire
- Vérifier la configuration du domaine/path du cookie
- Vérifier que `NEXT_PUBLIC_PAYLOAD_API_URL` est correct

## Commandes utiles

```bash
# Vérifier le statut des services
gmdev status mytechgear-workspace

# Voir les logs backend
gmdev logs back mytechgear-workspace

# Redémarrer le backend
gmdev restart back mytechgear-workspace

# Vérifier les utilisateurs
curl http://localhost:3001/api/users?limit=10
```
