# Dépannage : Erreurs d'authentification

## Erreur 1 : "Email ou mot de passe incorrect" (Payload CMS)

### Symptôme
```
AuthenticationError: The email or password provided is incorrect.
```

### Causes possibles

1. **Identifiants incorrects** : L'email ou le mot de passe saisis sont erronés
2. **Utilisateur inexistant** : L'utilisateur n'existe pas dans la base de données
3. **Base de données vide** : Aucun utilisateur n'a été créé dans Payload

### Solutions

#### Solution 1 : Vérifier les identifiants

Assurez-vous d'utiliser les bons identifiants :
- Email : celui utilisé lors de la création du premier utilisateur Payload
- Mot de passe : le mot de passe défini pour cet utilisateur

#### Solution 2 : Créer un utilisateur admin (si la base est vide)

Si c'est une nouvelle installation ou si la base est vide, créez un utilisateur admin :

```bash
# Aller dans le dossier backend
cd /home/gestionmax-aur-lien/CascadeProjects/gestionmax/gestionmaxbackpayload

# Créer un utilisateur via le script Payload (si disponible)
# Ou via l'interface d'administration lors du premier démarrage
```

**Via l'interface Payload :**
1. Accéder à http://localhost:3010/admin
2. Si c'est la première fois, Payload vous proposera de créer un utilisateur admin
3. Sinon, utilisez les identifiants existants

#### Solution 3 : Réinitialiser le mot de passe (si vous l'avez oublié)

Si vous avez accès à MongoDB :

```bash
# Se connecter à MongoDB via le tunnel
mongosh mongodb://localhost:27017/your-database-name

# Trouver l'utilisateur
use your-database-name
db.users.find({ email: "votre-email@example.com" })

# Réinitialiser le mot de passe (nécessite de connaître le hash ou de le régénérer)
```

**⚠️ Note** : Payload hash les mots de passe. Il est préférable de :
- Utiliser l'interface Payload pour réinitialiser
- Ou créer un nouvel utilisateur admin

#### Solution 4 : Vérifier la connexion MongoDB

Si MongoDB n'est pas accessible, Payload ne peut pas vérifier les utilisateurs :

```bash
# Vérifier que le tunnel SSH est démarré
gmdev status gestionmax

# Si le tunnel est STOPPED, le démarrer
gmdev start tunnel gestionmax

# Vérifier la connexion MongoDB
mongosh mongodb://localhost:27017/your-database-name
```

---

## Erreur 2 : "Command find requires authentication" (MongoDB)

### Symptôme
```
MongoServerError: Command find requires authentication
```

### Causes possibles

1. **Tunnel SSH non démarré** : Le tunnel vers MongoDB distant n'est pas actif
2. **MongoDB nécessite une authentification** : La base MongoDB distante nécessite un utilisateur/mot de passe
3. **URI MongoDB incorrecte** : L'URI dans `.env` ne contient pas les credentials

### Solutions

#### Solution 1 : Démarrer le tunnel SSH

```bash
# Vérifier le statut
gmdev status mytechgear-workspace

# Démarrer le tunnel si STOPPED
gmdev start tunnel mytechgear-workspace

# Ou démarrer tous les services
gmdev up mytechgear-workspace
```

#### Solution 2 : Vérifier la configuration MongoDB dans `.env`

Le fichier `.env` du backend doit contenir une URI MongoDB valide :

**Si MongoDB nécessite une authentification :**
```env
MONGODB_URI=mongodb://username:password@localhost:27017/your-database-name
```

**Si MongoDB n'a pas d'authentification (développement) :**
```env
MONGODB_URI=mongodb://localhost:27017/your-database-name
```

**Exemple pour mytechgear :**
```env
# Dans /home/gestionmax-aur-lien/CascadeProjects/mytechgear-workspace/mytechgear-backend/.env
MONGODB_URI=mongodb://localhost:27017/mytechgear
```

#### Solution 3 : Vérifier les credentials MongoDB sur le serveur distant

Si MongoDB distant nécessite une authentification :

1. **Se connecter au serveur distant** :
   ```bash
   ssh -i ~/.ssh/id_ed25519 root@78.47.79.58
   ```

2. **Vérifier les utilisateurs MongoDB** :
   ```bash
   mongosh
   use admin
   db.getUsers()
   ```

3. **Créer un utilisateur si nécessaire** :
   ```bash
   use admin
   db.createUser({
     user: "devuser",
     pwd: "devpassword",
     roles: [{ role: "readWrite", db: "mytechgear" }]
   })
   ```

4. **Mettre à jour `.env` local** :
   ```env
   MONGODB_URI=mongodb://devuser:devpassword@localhost:27017/mytechgear
   ```

#### Solution 4 : Vérifier que le tunnel fonctionne

```bash
# Tester la connexion MongoDB locale (via tunnel)
mongosh mongodb://localhost:27017/your-database-name

# Si ça fonctionne, le tunnel est OK
# Si ça échoue, vérifier :
# 1. Le tunnel est démarré : gmdev status
# 2. Le port local est correct : lsof -i :27017
# 3. Les logs du tunnel : gmdev logs tunnel
```

---

## Checklist de dépannage

### Pour "Email ou mot de passe incorrect" :

- [ ] Vérifier que le backend est RUNNING : `gmdev status`
- [ ] Vérifier que le tunnel est RUNNING (si MongoDB est distant) : `gmdev status`
- [ ] Vérifier que MongoDB est accessible : `mongosh mongodb://localhost:27017/your-db`
- [ ] Vérifier les identifiants dans l'interface Payload : http://localhost:3010/admin
- [ ] Vérifier que des utilisateurs existent dans la base : `db.users.find()` dans mongosh
- [ ] Si aucun utilisateur, créer un admin via l'interface Payload

### Pour "Command find requires authentication" :

- [ ] Vérifier que le tunnel SSH est RUNNING : `gmdev status`
- [ ] Démarrer le tunnel si nécessaire : `gmdev start tunnel`
- [ ] Vérifier la URI MongoDB dans `.env` du backend
- [ ] Vérifier que l'URI contient les credentials si MongoDB les nécessite
- [ ] Tester la connexion MongoDB : `mongosh mongodb://localhost:27017/your-db`
- [ ] Vérifier les logs backend : `gmdev logs back`

---

## Commandes utiles

```bash
# Voir le statut complet
gmdev status

# Voir les logs backend
gmdev logs back

# Voir les logs du tunnel
gmdev logs tunnel

# Redémarrer le backend
gmdev restart back

# Diagnostic complet
gmdev doctor
```
