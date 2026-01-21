# Détection Automatique de Projet dans gmdev

## Comment ça fonctionne ?

Quand vous lancez `gmdev activate` (ou toute autre commande) **sans spécifier de projet**, `gmdev` détecte automatiquement le projet en fonction du **répertoire courant** (`pwd`).

## Logique de détection

`gmdev` cherche dans `projects-v3.json` un projet dont l'un de ces chemins correspond au répertoire courant :

1. **`rootPath`** : Le répertoire racine du projet
2. **`backendPath`** : Le répertoire du backend
3. **`frontendPath`** : Le répertoire du frontend

La correspondance fonctionne dans **les deux sens** :
- Le répertoire courant **commence par** un de ces chemins
- OU un de ces chemins **commence par** le répertoire courant

## Exemples concrets

### Exemple 1 : Depuis le rootPath

```bash
# Vous êtes dans le répertoire racine du projet
cd /home/gestionmax-aur-lien/CascadeProjects/gestionmax

# gmdev détecte automatiquement "gestionmax" car :
# - rootPath = "/home/gestionmax-aur-lien/CascadeProjects/gestionmax"
# - Le répertoire courant correspond exactement
gmdev activate
# → Active le projet "gestionmax"
```

### Exemple 2 : Depuis le backendPath

```bash
# Vous êtes dans le dossier backend
cd /home/gestionmax-aur-lien/CascadeProjects/gestionmax/gestionmaxbackpayload

# gmdev détecte automatiquement "gestionmax" car :
# - backendPath = "/home/gestionmax-aur-lien/CascadeProjects/gestionmax/gestionmaxbackpayload"
# - Le répertoire courant correspond exactement
gmdev activate
# → Active le projet "gestionmax"
```

### Exemple 3 : Depuis le frontendPath

```bash
# Vous êtes dans le dossier frontend
cd /home/gestionmax-aur-lien/CascadeProjects/gestionmax/gestionmaxfront

# gmdev détecte automatiquement "gestionmax" car :
# - frontendPath = "/home/gestionmax-aur-lien/CascadeProjects/gestionmax/gestionmaxfront"
# - Le répertoire courant correspond exactement
gmdev activate
# → Active le projet "gestionmax"
```

### Exemple 4 : Depuis un sous-dossier

```bash
# Vous êtes dans un sous-dossier du backend
cd /home/gestionmax-aur-lien/CascadeProjects/gestionmax/gestionmaxbackpayload/src

# gmdev détecte automatiquement "gestionmax" car :
# - Le répertoire courant commence par backendPath
# - "/home/.../gestionmaxbackpayload/src" commence par "/home/.../gestionmaxbackpayload"
gmdev activate
# → Active le projet "gestionmax"
```

## Spécifier explicitement un projet

Si vous voulez **forcer** un projet spécifique, indiquez son ID :

```bash
# Depuis n'importe quel répertoire
cd ~/Documents
gmdev activate gestionmax
# → Active toujours "gestionmax", peu importe où vous êtes
```

## Tester la détection

Pour voir quel projet serait détecté depuis votre répertoire courant :

```bash
# Voir le projet détecté (sans l'activer)
cd /votre/dossier
gmdev status
# → Affiche le statut du projet détecté automatiquement
```

## Cas où la détection échoue

Si `gmdev` ne trouve aucun projet correspondant :

1. **Fallback** : Il utilise le nom du répertoire courant (en minuscules, avec des tirets)
2. **Erreur** : Si ce projet n'existe pas dans `projects-v3.json`, la commande échouera

**Solution** : Spécifiez explicitement le projet :
```bash
gmdev activate gestionmax
```

## Configuration actuelle

D'après votre `projects-v3.json`, le projet "gestionmax" sera détecté depuis :

- ✅ `/home/gestionmax-aur-lien/CascadeProjects/gestionmax` (rootPath)
- ✅ `/home/gestionmax-aur-lien/CascadeProjects/gestionmax/gestionmaxbackpayload` (backendPath)
- ✅ `/home/gestionmax-aur-lien/CascadeProjects/gestionmax/gestionmaxfront` (frontendPath)
- ✅ N'importe quel sous-dossier de ces chemins

## Astuce : Variable d'environnement

Vous pouvez aussi forcer le répertoire de projet avec une variable d'environnement :

```bash
GMDEV_PROJECT_ROOT=/home/gestionmax-aur-lien/CascadeProjects/gestionmax gmdev activate
```

Mais généralement, il suffit de faire `cd` dans le bon dossier avant de lancer la commande.
