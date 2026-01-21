# Utilisation de gmdev depuis le Terminal Linux

## Où utiliser les commandes ?

**Oui, depuis votre terminal Linux** (GNOME Terminal, Konsole, ou n'importe quel terminal).

## Commandes de base

### 1. Activer un projet

```bash
# Option 1 : Détection automatique (si vous êtes dans le dossier du projet)
cd /home/gestionmax-aur-lien/CascadeProjects/gestionmax
gmdev activate

# Option 2 : Spécifier explicitement le projet (depuis n'importe où)
gmdev activate gestionmax
```

### 2. Désactiver un projet

```bash
# Depuis n'importe quel dossier
gmdev deactivate gestionmax
```

### 3. Voir le statut

```bash
gmdev status
```

### 4. Démarrer tous les services

```bash
gmdev up
```

### 5. Arrêter tous les services

```bash
gmdev down
```

## Exemples concrets depuis votre terminal

### Scénario 1 : Vous êtes dans le dossier du projet

```bash
# Ouvrez votre terminal Linux
# Naviguez vers le projet
cd /home/gestionmax-aur-lien/CascadeProjects/gestionmax

# Activez le projet (détection automatique)
gmdev activate

# Démarrez tous les services
gmdev up

# Vérifiez le statut
gmdev status
```

### Scénario 2 : Vous êtes ailleurs (Documents, Bureau, etc.)

```bash
# Vous êtes dans n'importe quel dossier
cd ~/Documents
# ou
cd ~/Bureau

# Activez explicitement le projet "gestionmax"
gmdev activate gestionmax

# Démarrez les services
gmdev up
```

### Scénario 3 : Basculer entre deux projets

```bash
# Activer le projet "gestionmax"
gmdev activate gestionmax
gmdev up

# Plus tard, activer un autre projet (désactive automatiquement "gestionmax")
gmdev activate mytechgear-workspace
gmdev up
```

## Vérifier que gmdev est installé

```bash
# Vérifier l'emplacement
which gmdev
# → /home/gestionmax-aur-lien/.local/bin/gmdev

# Vérifier la version
gmdev --version
# → gmdev v2.0.0

# Voir l'aide
gmdev help
```

## Liste des projets disponibles

Pour voir tous vos projets configurés :

```bash
cat ~/.gestionmax-devcenter/projects-v3.json | jq '.projects[] | {id, name, enabled}'
```

## Commandes complètes disponibles

```bash
gmdev status                    # Statut des services
gmdev start <service>          # Démarre un service (tunnel|back|front)
gmdev stop <service>           # Arrête un service
gmdev restart <service>        # Redémarre un service
gmdev up [project_id]          # Démarre tous les services
gmdev down [project_id]        # Arrête tous les services
gmdev activate [project_id]    # Active un projet
gmdev deactivate [project_id]  # Désactive un projet
gmdev doctor                   # Diagnostic système
gmdev logs <service>           # Affiche les logs
gmdev kill-zombies             # Tue les processus zombies
```

## Astuce : Alias dans votre .bashrc

Vous pouvez créer un alias pour simplifier :

```bash
# Ajouter dans ~/.bashrc
alias gma='gmdev activate'
alias gmu='gmdev up'
alias gmd='gmdev down'
alias gms='gmdev status'

# Puis utiliser simplement :
gma gestionmax
gmu
gms
```
