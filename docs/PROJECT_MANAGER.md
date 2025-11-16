# Project Manager — Guide d'utilisation

Le module **Project Manager** permet de gérer vos projets de développement locaux dans GestionMax DevCenter.

---

## 📋 Vue d'ensemble

Le Project Manager offre deux méthodes pour ajouter des projets :

1. **Project Manager** : Ajout manuel via formulaire
2. **Auto-Scan** : Détection automatique de la structure

---

## 🎯 Project Manager (Manuel)

### Accès

**Configuration → Project Manager**

### Fonctionnalités

- ✅ **Ajouter un projet** : Formulaire complet avec tous les champs
- ✅ **Modifier un projet** : Édition des projets existants
- ✅ **Supprimer un projet** : Suppression avec confirmation
- ✅ **Actualiser** : Recharger la liste des projets

### Utilisation

1. Cliquer sur **"Ajouter un projet"**
2. Remplir le formulaire :
   - **Nom du projet** : Identifiant unique
   - **Backend Path** : Chemin vers le dossier backend
   - **Frontend Path** : Chemin vers le dossier frontend
   - **Scripts Path** : Chemin vers le dossier des scripts
   - **Services** : Configurer chaque service (Tunnel, Backend, Frontend, Netdata)
3. Cliquer sur **"Enregistrer"**

Le projet apparaît immédiatement dans le Dashboard.

---

## 🔍 Auto-Scan (Automatique)

### Accès

**Configuration → Auto-Scan**

### Fonctionnalités

- ✅ **Détection automatique** : Analyse complète de la structure
- ✅ **Aucune saisie** : Tout est détecté automatiquement
- ✅ **Configuration Netdata** : Ajouté automatiquement (port 19999)

### Utilisation

1. Cliquer sur **"Choisir un dossier"**
2. Sélectionner le dossier racine du projet
3. Attendre la fin du scan (quelques secondes)
4. Vérifier le résumé affiché
5. Cliquer sur **"Ajouter automatiquement"**

### Détection automatique

#### Backend Payload

Le scanner recherche dans :
- `backend/`, `back/`, `api/`, `server/`

Vérifie :
- Présence de `package.json`
- Présence de `payload.config.ts` ou dépendance `payload` dans `package.json`

Détecte le port depuis :
1. `.env` → `PORT=` ou `BACKEND_PORT=`
2. `payload.config.ts` → `serverURL: "http://localhost:PORT"`
3. `package.json` → `"dev": "payload ... --port PORT"`
4. **Défaut** : `3010`

Scripts recherchés :
- `start-dev.sh backend`
- `start-backend.sh`
- `start-payload.sh`
- **Défaut** : `npm run dev`

#### Frontend Next.js

Le scanner recherche dans :
- `frontend/`, `front/`, `web/`, `app/`, `client/`

Vérifie :
- Présence de `package.json`
- Dépendance `next` dans `package.json`

Détecte le port depuis :
1. `.env.local` → `PORT=`
2. `next.config.js` → `port: PORT`
3. `package.json` → `"dev": "next dev -p PORT"`
4. **Défaut** : `3000`

Scripts recherchés :
- `start-dev.sh frontend`
- `start-frontend.sh`
- **Défaut** : `next dev`

#### Tunnel SSH

Le scanner recherche dans le dossier `scripts/` :
- `tunnel.sh`
- `ssh-tunnel.sh`
- `dev-tunnel.sh`
- `tunnel-on.sh`

Script stop recherché :
- `tunnel-off.sh`
- `tunnel-stop.sh`
- `ssh-tunnel-off.sh`

#### Netdata

**Toujours configuré automatiquement** :
- Start : `netdata-on.sh`
- Stop : `netdata-off.sh`
- Port : `19999` (fixe)

---

## 📁 Format du fichier projects.json

Le fichier de configuration est situé à :

```
~/.gestionmax-devcenter/projects.json
```

### Structure

```json
{
  "projects": [
    {
      "name": "GestionMax OPS",
      "backend_path": "/home/user/projects/gestionmax-ops/backend",
      "frontend_path": "/home/user/projects/gestionmax-ops/frontend",
      "scripts_path": "/home/user/scripts/dev-tools",
      "services": {
        "tunnel": {
          "start": "tunnel.sh",
          "stop": "tunnel-off.sh"
        },
        "backend": {
          "start": "start-dev.sh backend",
          "stop": null,
          "port": 3010
        },
        "frontend": {
          "start": "start-dev.sh frontend",
          "stop": null,
          "port": 3000
        },
        "netdata": {
          "start": "netdata-on.sh",
          "stop": "netdata-off.sh",
          "port": 19999
        }
      }
    }
  ]
}
```

### Champs

- **name** : Nom unique du projet (obligatoire)
- **backend_path** : Chemin absolu vers le dossier backend (obligatoire)
- **frontend_path** : Chemin absolu vers le dossier frontend (obligatoire)
- **scripts_path** : Chemin absolu vers le dossier des scripts (obligatoire)
- **services** : Configuration des services
  - **tunnel** : Optionnel, configuration du tunnel SSH
  - **backend** : Optionnel, configuration du backend
  - **frontend** : Optionnel, configuration du frontend
  - **netdata** : Toujours présent, configuration de Netdata

### Services

Chaque service peut contenir :
- **start** : Commande ou script de démarrage (obligatoire)
- **stop** : Commande ou script d'arrêt (optionnel)
- **port** : Port du service (optionnel, sauf pour netdata)

---

## 🔄 Synchronisation avec le Dashboard

Les projets ajoutés via Project Manager ou Auto-Scan apparaissent automatiquement dans :

- **Dashboard → Section "Projets"** : Vue compacte avec statut en temps réel
- **Configuration → Project Manager** : Liste complète avec actions (éditer, supprimer)

Le Dashboard se met à jour automatiquement toutes les 2 secondes pour afficher le statut des services.

---

## ⚠️ Notes importantes

### Chemins

- Utilisez des **chemins absolus** pour éviter les erreurs
- Les chemins relatifs sont supportés mais peuvent causer des problèmes

### Scripts

- Les scripts doivent être **exécutables** (`chmod +x script.sh`)
- Les chemins relatifs dans les scripts sont résolus depuis `scripts_path`

### Ports

- Les ports sont **détectés automatiquement** lors du scan
- Vous pouvez les modifier manuellement dans Project Manager
- Le port de Netdata est **toujours 19999** (non modifiable)

### Nom du projet

- Le nom doit être **unique**
- Si vous essayez d'ajouter un projet avec un nom existant, une erreur sera affichée
- Utilisez **"Modifier"** pour mettre à jour un projet existant

---

## 🐛 Dépannage

### Le projet n'apparaît pas dans le Dashboard

1. Vérifier que le fichier `projects.json` existe
2. Vérifier le format JSON (valide)
3. Actualiser le Dashboard (F5 ou recharger l'app)

### Erreur "Project not found"

- Vérifier que les chemins (backend_path, frontend_path) existent
- Vérifier les permissions d'accès aux dossiers

### Erreur lors du scan

- Vérifier que zenity est installé : `sudo apt install zenity`
- Vérifier que le dossier sélectionné contient bien un projet
- Vérifier les logs dans la console

### Services non détectés

- Vérifier que les fichiers de configuration existent (package.json, payload.config.ts, etc.)
- Vérifier que les scripts sont dans le bon dossier
- Utiliser Project Manager pour ajouter manuellement les services manquants

