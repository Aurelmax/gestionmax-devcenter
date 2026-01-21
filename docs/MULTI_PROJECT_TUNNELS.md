# 🔐 Configuration de plusieurs tunnels SSH pour différentes bases MongoDB

## 🎯 Objectif

Gérer plusieurs projets simultanément, chacun avec sa propre base MongoDB hébergée sur Coolify, via des tunnels SSH séparés.

## ✅ Avantages

- ✅ **Pas de base locale** - Tout est distant via Coolify
- ✅ **Isolation par projet** - Chaque projet a son propre tunnel et port local
- ✅ **Développement simultané** - Plusieurs projets peuvent tourner en même temps
- ✅ **Configuration simple** - Tout dans `projects-v3.json`

## 📋 Configuration

### Exemple : 3 projets avec 3 tunnels différents

```json
{
  "projects": [
    {
      "id": "projet-1",
      "name": "Projet Production",
      "rootPath": "/path/to/projet-1",
      "backendPath": "/path/to/projet-1/backend",
      "frontendPath": "/path/to/projet-1/frontend",
      "ports": {
        "backend": 3010,
        "frontend": 3000
      },
      "tunnel": {
        "enabled": true,
        "host": "91.99.22.54",
        "user": "root",
        "port": 22,
        "privateKey": "/home/user/.ssh/id_ed25519_hetzner",
        "localMongo": 27017,    // ← Port local unique
        "remoteMongo": 27017    // ← Port distant (généralement 27017)
      }
    },
    {
      "id": "projet-2",
      "name": "Projet Staging",
      "rootPath": "/path/to/projet-2",
      "backendPath": "/path/to/projet-2/backend",
      "frontendPath": "/path/to/projet-2/frontend",
      "ports": {
        "backend": 3011,        // ← Port backend différent
        "frontend": 3001        // ← Port frontend différent
      },
      "tunnel": {
        "enabled": true,
        "host": "91.99.22.54",
        "user": "root",
        "port": 22,
        "privateKey": "/home/user/.ssh/id_ed25519_hetzner",
        "localMongo": 27018,    // ← Port local différent (important !)
        "remoteMongo": 27017
      }
    },
    {
      "id": "projet-3",
      "name": "Autre Projet",
      "rootPath": "/path/to/projet-3",
      "backendPath": "/path/to/projet-3/backend",
      "frontendPath": "/path/to/projet-3/frontend",
      "ports": {
        "backend": 3012,
        "frontend": 3002
      },
      "tunnel": {
        "enabled": true,
        "host": "staging.example.com",  // ← Serveur différent possible
        "user": "deploy",
        "port": 22,
        "privateKey": "/home/user/.ssh/id_ed25519_staging",  // ← Clé différente possible
        "localMongo": 27019,    // ← Port local différent
        "remoteMongo": 27017
      }
    }
  ]
}
```

## 🔑 Points importants

### 1. Ports locaux MongoDB uniques

**⚠️ CRUCIAL** : Chaque projet doit avoir un `localMongo` différent pour éviter les conflits :

- Projet 1 : `localMongo: 27017`
- Projet 2 : `localMongo: 27018`
- Projet 3 : `localMongo: 27019`
- etc.

### 2. Configuration Payload

Dans le `.env` de chaque backend Payload, utilise le port local correspondant :

**Projet 1** (`backend/.env`) :
```env
MONGODB_URI=mongodb://localhost:27017/your-database
```

**Projet 2** (`backend/.env`) :
```env
MONGODB_URI=mongodb://localhost:27018/your-database
```

**Projet 3** (`backend/.env`) :
```env
MONGODB_URI=mongodb://localhost:27019/your-database
```

### 3. Ports backend/frontend uniques

Chaque projet doit aussi avoir des ports backend/frontend différents pour éviter les conflits :

- Projet 1 : backend `3010`, frontend `3000`
- Projet 2 : backend `3011`, frontend `3001`
- Projet 3 : backend `3012`, frontend `3002`

## 🚀 Utilisation

1. **Ouvrir DevCenter** → Tous tes projets apparaissent dans le dashboard
2. **Sélectionner un projet** → Cliquer sur le nom du projet
3. **Démarrer le tunnel** → Click "Start" sur Tunnel SSH
4. **Démarrer backend** → Click "Start" sur Backend (se connecte automatiquement à `localhost:PORT_LOCAL`)
5. **Démarrer frontend** → Click "Start" sur Frontend
6. **Développer** → Tout fonctionne avec la base distante !

## 🔍 Vérification

Pour vérifier qu'un tunnel est actif :

```bash
# Voir les tunnels SSH actifs
ps aux | grep "ssh.*-L.*2701"

# Voir les ports en écoute
lsof -i -P -n | grep LISTEN | grep 2701
```

## 🛠️ Dépannage

### Erreur : "Port already in use"

Un autre projet utilise déjà ce port local. Change `localMongo` dans la config.

### Erreur : "Tunnel SSH failed"

- Vérifie que la clé SSH existe : `ls -la $PROJECT_TUNNEL_KEY`
- Vérifie les permissions : `chmod 600 $PROJECT_TUNNEL_KEY`
- Teste la connexion manuelle : `ssh -i $PROJECT_TUNNEL_KEY user@host`

### Le backend ne se connecte pas à MongoDB

- Vérifie que le tunnel est RUNNING dans le dashboard
- Vérifie que le `.env` du backend utilise le bon port local
- Teste la connexion : `mongosh mongodb://localhost:PORT_LOCAL`



