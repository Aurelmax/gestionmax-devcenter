# Créer un utilisateur admin pour MyTechGear

## Problème

Erreur 401 (Unauthorized) lors de la connexion à l'API Payload. Aucun utilisateur n'existe ou les identifiants sont incorrects.

## Solutions

### Solution 1 : Créer un utilisateur via l'API Payload (Recommandé)

```bash
# Créer un utilisateur admin via l'API REST
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mytechgear.eu",
    "password": "VotreMotDePasseSecurise123!",
    "roles": ["admin"]
  }'
```

### Solution 2 : Créer un utilisateur via MongoDB (si l'API ne fonctionne pas)

⚠️ **Note** : Payload hash les mots de passe avec bcrypt. Il est préférable d'utiliser l'API Payload.

Si vous devez créer un utilisateur directement dans MongoDB :

```bash
# Se connecter à MongoDB
mongosh "mongodb://root:4Z8bYgt1taQD3d1mKB7eOu4HuV9ZSktudotju4emGd7YdNLMhHqMCEqNi3XhyY3V@127.0.0.1:27017/mytechgear?authSource=admin"

# Dans mongosh :
use mytechgear

# Générer un hash bcrypt pour le mot de passe
# (nécessite Node.js ou un outil externe)
# Exemple avec Node.js :
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('VotreMotDePasse', 10))"

# Insérer l'utilisateur (remplacer HASH_BCRYPT par le hash généré)
db.users.insertOne({
  email: "admin@mytechgear.eu",
  password: "HASH_BCRYPT",
  roles: ["admin"],
  createdAt: new Date(),
  updatedAt: new Date()
})
```

### Solution 3 : Utiliser un script Node.js pour créer l'utilisateur

Créer un fichier `create-user.js` dans le dossier backend :

```javascript
const bcrypt = require('bcryptjs');
const { getPayload } = require('payload');
const config = require('./src/payload.config');

async function createUser() {
  const payload = await getPayload({ config });
  
  try {
    const user = await payload.create({
      collection: 'users',
      data: {
        email: 'admin@mytechgear.eu',
        password: 'VotreMotDePasseSecurise123!',
        roles: ['admin'],
      },
    });
    
    console.log('✅ Utilisateur créé:', user.email);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

createUser();
```

Exécuter :
```bash
cd /home/gestionmax-aur-lien/CascadeProjects/mytechgear-workspace/mytechgear-backend
node create-user.js
```

### Solution 4 : Vérifier les utilisateurs existants

```bash
# Se connecter à MongoDB
mongosh "mongodb://root:4Z8bYgt1taQD3d1mKB7eOu4HuV9ZSktudotju4emGd7YdNLMhHqMCEqNi3XhyY3V@127.0.0.1:27017/mytechgear?authSource=admin"

# Lister les utilisateurs
use mytechgear
db.users.find({}, {email: 1, roles: 1, createdAt: 1}).pretty()
```

## Vérification

Après avoir créé l'utilisateur, tester la connexion :

```bash
# Test de login via l'API
curl -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mytechgear.eu",
    "password": "VotreMotDePasseSecurise123!"
  }'
```

Si la connexion réussit, vous devriez recevoir un token JWT.

## Notes importantes

1. **Admin Payload désactivé** : L'interface admin Payload native est désactivée. Utilisez le frontend custom à http://localhost:3200

2. **Sécurité** : Utilisez un mot de passe fort pour l'utilisateur admin

3. **Rôles** : Assurez-vous que l'utilisateur a le rôle `admin` pour accéder à toutes les fonctionnalités

4. **Base de données** : Vérifiez que MongoDB est accessible via le tunnel SSH avant de créer l'utilisateur
