# Guide d'utilisation pour le projet MyTechGear

## Configuration du projet

- **ID** : `mytechgear-workspace`
- **Nom** : `mytechgear`
- **Backend** : Payload CMS
- **Ports** :
  - Backend : `3001`
  - Frontend : `3200`
  - Tunnel MongoDB : `27017`

## Commandes depuis votre terminal Linux

### 1. Activer le projet

```bash
# Depuis n'importe quel dossier
gmdev activate mytechgear-workspace
```

**Ce que ça fait :**
- Active le projet "mytechgear-workspace"
- Désactive automatiquement les autres projets (comme "gestionmax")
- Arrête les services des autres projets actifs

### 2. Démarrer tous les services

```bash
# Démarrer tunnel → backend → frontend
gmdev up mytechgear-workspace
```

**Ou si vous êtes dans le dossier du projet :**
```bash
cd /home/gestionmax-aur-lien/CascadeProjects/mytechgear-workspace
gmdev up
```

### 3. Voir le statut

```bash
gmdev status mytechgear-workspace
```

Affiche :
- État du tunnel SSH (RUNNING/STOPPED)
- État du backend (RUNNING/STOPPED) sur le port 3001
- État du frontend (RUNNING/STOPPED) sur le port 3200

### 4. Démarrer un service spécifique

```bash
# Démarrer uniquement le tunnel
gmdev start tunnel mytechgear-workspace

# Démarrer uniquement le backend
gmdev start back mytechgear-workspace

# Démarrer uniquement le frontend
gmdev start front mytechgear-workspace
```

### 5. Arrêter tous les services

```bash
gmdev down mytechgear-workspace
```

### 6. Arrêter un service spécifique

```bash
# Arrêter le frontend
gmdev stop front mytechgear-workspace

# Arrêter le backend
gmdev stop back mytechgear-workspace

# Arrêter le tunnel
gmdev stop tunnel mytechgear-workspace
```

### 7. Voir les logs

```bash
# Logs du backend
gmdev logs back mytechgear-workspace

# Logs du frontend
gmdev logs front mytechgear-workspace

# Logs avec plus de lignes
gmdev logs back mytechgear-workspace --tail 500
```

### 8. Désactiver le projet

```bash
gmdev deactivate mytechgear-workspace
```

**Ce que ça fait :**
- Désactive le projet
- Arrête automatiquement tous ses services

## Workflow complet

### Scénario : Basculer de "gestionmax" vers "mytechgear"

```bash
# 1. Activer mytechgear (désactive automatiquement gestionmax)
gmdev activate mytechgear-workspace

# 2. Démarrer tous les services
gmdev up mytechgear-workspace

# 3. Vérifier que tout fonctionne
gmdev status mytechgear-workspace

# 4. Accéder aux services
# Backend Admin : http://localhost:3001/admin
# Frontend : http://localhost:3200
```

### Scénario : Travailler uniquement sur mytechgear

```bash
# 1. Aller dans le dossier du projet
cd /home/gestionmax-aur-lien/CascadeProjects/mytechgear-workspace

# 2. Activer (détection automatique du projet)
gmdev activate

# 3. Démarrer les services
gmdev up

# 4. Travailler...

# 5. Arrêter quand vous avez fini
gmdev down
```

## Détection automatique

Si vous êtes dans un des dossiers du projet, vous pouvez omettre l'ID :

```bash
# Depuis le rootPath
cd /home/gestionmax-aur-lien/CascadeProjects/mytechgear-workspace
gmdev activate  # → Détecte automatiquement "mytechgear-workspace"

# Depuis le backendPath
cd /home/gestionmax-aur-lien/CascadeProjects/mytechgear-workspace/mytechgear-backend
gmdev activate  # → Détecte automatiquement "mytechgear-workspace"

# Depuis le frontendPath
cd /home/gestionmax-aur-lien/CascadeProjects/mytechgear-workspace/mytechgear-frontend
gmdev activate  # → Détecte automatiquement "mytechgear-workspace"
```

## URLs d'accès

Une fois les services démarrés :

- **Backend Admin (Payload)** : http://localhost:3001/admin
- **Frontend** : http://localhost:3200
- **Tunnel MongoDB** : localhost:27017 (connexion locale vers MongoDB distant)

## Diagnostic

Si quelque chose ne fonctionne pas :

```bash
# Diagnostic complet
gmdev doctor mytechgear-workspace

# Vérifier les processus zombies
gmdev kill-zombies

# Vérifier les ports utilisés
lsof -i :3001  # Backend
lsof -i :3200  # Frontend
lsof -i :27017 # Tunnel MongoDB
```

## Notes importantes

1. **Ports différents** : MyTechGear utilise des ports différents de Gestionmax :
   - Backend : `3001` (au lieu de `3010`)
   - Frontend : `3200` (au lieu de `3000`)

2. **Tunnel SSH** : Le tunnel pointe vers `78.47.79.58` (différent de Gestionmax)

3. **Activation unique** : Seul un projet peut être actif à la fois. Activer mytechgear désactive automatiquement gestionmax.
