# Configuration des Projets - GestionMax DevCenter

## 📋 Fichier de configuration

Le module "Vue compacte des projets" lit la configuration depuis :
```
~/.gestionmax-devcenter/projects.json
```

Ce fichier est créé automatiquement s'il n'existe pas (vide par défaut).

## 📝 Structure JSON

```json
[
  {
    "name": "gestionmax-opps",
    "path": "/home/gestionmax-aur-lien/CascadeProjects/gestionmaxopps",
    "stack": "Payload + Next.js",
    "services": [
      {
        "name": "backend",
        "port": 3010,
        "command": "pnpm dev:backend"
      },
      {
        "name": "frontend",
        "port": 3000,
        "command": "pnpm dev:frontend"
      }
    ]
  }
]
```

## 🔧 Champs requis

- **name** : Nom du projet (affiché dans l'interface)
- **path** : Chemin absolu vers le dossier du projet
- **stack** : Description de la stack technique
- **services** : Tableau des services du projet
  - **name** : Nom du service
  - **port** : Port sur lequel le service écoute
  - **command** : Commande pour démarrer le service (ex: `pnpm dev:backend`, `npm run dev`)

## 🚀 Fonctionnalités

### Détection automatique
- ✅ Détection des ports ouverts (vérification TCP)
- ✅ Mise à jour en temps réel toutes les 2 secondes
- ✅ Animation pulse sur les services RUNNING

### Actions disponibles
- ▶️ **Start** : Démarre un service (exécute la commande dans le dossier du projet)
- ⏹️ **Stop** : Arrête un service (kill par port ou PID)
- 📂 **Dossier** : Ouvre le dossier du projet dans l'explorateur
- 🖥️ **VS Code** : Ouvre le projet dans VS Code (nécessite `code` dans le PATH)
- 🌐 **Open URL** : Ouvre l'URL du service dans le navigateur (si RUNNING)

### Gestion des erreurs
- ✅ Création automatique du fichier JSON s'il n'existe pas
- ✅ Statut "STOPPED" si le port est inaccessible
- ✅ Statut "ERROR" si la commande échoue
- ✅ Toasts de notification (succès/erreur)

## 📦 Installation

1. Créez le fichier de configuration :
```bash
mkdir -p ~/.gestionmax-devcenter
cp projects.json.example ~/.gestionmax-devcenter/projects.json
```

2. Éditez le fichier avec vos projets :
```bash
nano ~/.gestionmax-devcenter/projects.json
```

3. Redémarrez l'application pour voir vos projets dans le Dashboard.

## 🧪 Tests rapides

### Vérifier que le fichier est lu
```bash
cat ~/.gestionmax-devcenter/projects.json
```

### Tester la détection de port
```bash
# Démarrer un service sur un port
python3 -m http.server 3000

# Dans l'app, le service devrait apparaître comme RUNNING
```

### Tester VS Code
```bash
# Vérifier que 'code' est dans le PATH
which code

# Si non, ajoutez VS Code au PATH ou utilisez le chemin complet
```

## 🔍 Dépannage

### Les projets n'apparaissent pas
- Vérifiez que le fichier JSON existe : `~/.gestionmax-devcenter/projects.json`
- Vérifiez la syntaxe JSON : `cat ~/.gestionmax-devcenter/projects.json | jq .`
- Vérifiez les logs de l'application

### Les services ne démarrent pas
- Vérifiez que les chemins des projets sont corrects
- Vérifiez que les commandes fonctionnent dans le terminal
- Vérifiez les permissions d'exécution

### Les ports ne sont pas détectés
- Vérifiez que les services écoutent bien sur les ports spécifiés
- Utilisez `lsof -i :PORT` ou `ss -tlnp | grep PORT` pour vérifier

### VS Code ne s'ouvre pas
- Installez VS Code
- Ajoutez `code` au PATH ou modifiez la commande dans `commands.rs`

