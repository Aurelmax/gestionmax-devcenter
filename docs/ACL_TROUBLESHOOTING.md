# Dépannage des ACLs - Problèmes d'accès admin

## Problème : Accès refusé à l'interface admin malgré une authentification réussie

### Symptômes

- ✅ Connexion réussie (token JWT reçu)
- ✅ Cookie `payload-token` défini
- ❌ Accès à `/payload-admin` refusé
- ❌ Redirection vers `/payload-admin/login`

### Cause

**Les ACLs (Access Control Lists) vérifient le rôle utilisateur**, pas seulement l'authentification.

Même si l'authentification réussit, l'accès est refusé si :
- Le rôle utilisateur n'est pas `'admin'`
- Le rôle est `'user'` ou `'editor'`

### Vérifications des ACLs

L'application effectue **deux vérifications** :

1. **Middleware (edge runtime)** : `verifyAdminAuth()`
   ```typescript
   const isAdmin = user.role === 'admin';
   return isAdmin;
   ```

2. **Server Component** : `requireAdminServer()`
   ```typescript
   if (user.role !== 'admin') {
     redirect('/payload-admin/login?error=insufficient_permissions');
   }
   ```

### Solution

#### 1. Vérifier le rôle dans MongoDB

```bash
# Se connecter à MongoDB
mongosh "mongodb://root:PASSWORD@127.0.0.1:27017/mytechgear?authSource=admin"

# Vérifier le rôle
db.users.find({email: "votre-email@example.com"}, {email: 1, role: 1})
```

#### 2. Mettre à jour le rôle en admin

```bash
# Via MongoDB
db.users.updateOne(
  {email: "votre-email@example.com"},
  {$set: {role: "admin"}}
)
```

#### 3. Vérifier via l'API Payload

```bash
# Obtenir le token
TOKEN=$(curl -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"votre-email@example.com","password":"votre-mot-de-passe"}' \
  | jq -r '.token')

# Vérifier le rôle
curl http://localhost:3001/api/users/me \
  -H "Authorization: JWT $TOKEN" \
  | jq '.user.role'
```

Le résultat doit être `"admin"`.

### Prévention

#### Protection contre l'escalade de privilèges

Le champ `role` est protégé par :
- **Field-level access** : `hasRoleFieldAccess(['admin'])`
- **Hook de protection** : `protectRole`

Les utilisateurs non-admin **ne peuvent pas** :
- Voir leur propre rôle
- Modifier leur propre rôle
- S'auto-promouvoir en admin

#### Créer un utilisateur admin

```bash
# Via l'API Payload (nécessite d'être déjà admin)
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: JWT $ADMIN_TOKEN" \
  -d '{
    "email": "nouveau-admin@example.com",
    "password": "MotDePasseSecurise123!",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }'
```

### Logs de débogage

Les logs indiquent pourquoi l'accès est refusé :

```
🔍 Middleware: Utilisateur: user@example.com role: user isAdmin: false
🚨 Middleware: Accès admin refusé pour /payload-admin
```

```
🔍 getServerUser: Utilisateur trouvé: user@example.com role: user
🚨 SÉCURITÉ: Tentative d'accès admin bloquée User: user@example.com (role: user)
```

### Tableau des rôles et permissions

| Rôle | Accès `/payload-admin` | Création contenu | Suppression | Gestion users |
|------|------------------------|------------------|-------------|---------------|
| `admin` | ✅ | ✅ | ✅ | ✅ |
| `editor` | ❌ | ✅ | ❌ | ❌ |
| `user` | ❌ | ❌ | ❌ | ❌ (self only) |

### Références

- **Documentation ACL complète** : `docs/ACL_MANAGEMENT.md`
- **Fichiers sources** :
  - `src/middleware.ts` : Vérification edge
  - `src/lib/server-auth.ts` : Vérification serveur
  - `src/access/checkRole.ts` : Helpers de vérification
