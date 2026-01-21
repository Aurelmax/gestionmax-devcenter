# Architecture officielle — gmdev comme runtime unique

**Version:** 2.0  
**Date:** Janvier 2025  
**Statut:** ✅ Production

---

## 🎯 Vue d'ensemble

Le DevCenter a migré vers une architecture stricte où **gmdev** est le **seul runtime officiel** pour toutes les opérations d'exécution. Le DevCenter (Tauri) agit désormais exclusivement comme une **interface graphique** qui délègue toutes les opérations runtime à `gmdev`.

---

## 🏗️ Architecture officielle

```
┌─────────────────────────────────────────────────────────┐
│                    DevCenter (Tauri)                     │
│              Interface graphique uniquement               │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Boutons Start/Stop/Status                        │  │
│  │  Affichage des états                              │  │
│  │  Gestion des projets                               │  │
│  └───────────────┬───────────────────────────────────┘  │
│                  │ invoke()                              │
│                  ▼                                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Commandes Tauri (Rust)                           │  │
│  │  - start_service_v3                               │  │
│  │  - stop_service_v3                                │  │
│  │  - status_service_v3                              │  │
│  │  - kill_zombies_v3                                 │  │
│  └───────────────┬───────────────────────────────────┘  │
│                  │ Command::new("gmdev")                 │
│                  ▼                                       │
└──────────────────┼───────────────────────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │   gmdev (CLI)       │
         │   Runtime officiel  │
         │   Seule source de   │
         │   vérité            │
         └─────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │   Services          │
         │   - Tunnel SSH      │
         │   - Backend Payload │
         │   - Frontend Next.js│
         └─────────────────────┘
```

---

## 📋 Rôles et responsabilités

### gmdev (CLI) — Runtime officiel

**Responsabilités :**
- ✅ Démarre / arrête les services
- ✅ Gère les PID des processus
- ✅ Ouvre / ferme les tunnels SSH
- ✅ Tue les processus zombies
- ✅ Expose le statut des services
- ✅ Fournit les logs des services
- ✅ Gère les variables d'environnement
- ✅ Valide la configuration (.env)

**gmdev est la SEULE source de vérité pour toutes les opérations runtime.**

### DevCenter (Tauri) — Interface graphique

**Responsabilités :**
- ✅ Affiche l'interface utilisateur
- ✅ Appelle `gmdev` via les commandes Tauri
- ✅ Affiche les états retournés par `gmdev`
- ✅ Gère la configuration des projets
- ✅ Détecte automatiquement les projets
- ✅ Permet l'édition des projets

**Le DevCenter N'EXÉCUTE JAMAIS directement les services.**

### Coolify — Infrastructure distante

**Responsabilités :**
- ✅ Héberge les conteneurs backend en production
- ✅ Reçoit uniquement des variables d'environnement
- ✅ Aucun fichier `.env` n'est utilisé en prod

---

## 🔄 Migration depuis l'ancienne architecture

### Avant (v1.x)

```
DevCenter → Scripts shell (tunnel-on.sh, backend-on.sh, etc.)
```

**Problèmes :**
- Logique dupliquée entre scripts et DevCenter
- Difficile à maintenir
- Pas de point unique de vérité
- Variables d'environnement gérées dans plusieurs endroits

### Après (v2.0)

```
DevCenter → gmdev (CLI) → Services
```

**Avantages :**
- ✅ Point unique de vérité : `gmdev`
- ✅ Logique centralisée dans `gmdev`
- ✅ Facile à maintenir et tester
- ✅ Interface graphique et CLI utilisent la même logique
- ✅ Variables d'environnement gérées par `gmdev`

---

## 📝 Mapping des commandes

### Anciens scripts → gmdev

| Ancien script          | Commande gmdev              | Description                    |
|------------------------|-----------------------------|--------------------------------|
| `tunnel-on.sh`         | `gmdev start tunnel`        | Démarre le tunnel SSH          |
| `tunnel-off.sh`        | `gmdev stop tunnel`         | Arrête le tunnel SSH           |
| `backend-on.sh`        | `gmdev start back`          | Démarre le backend Payload     |
| `backend-off.sh`       | `gmdev stop back`           | Arrête le backend Payload      |
| `frontend-on.sh`       | `gmdev start front`         | Démarre le frontend Next.js    |
| `frontend-off.sh`      | `gmdev stop front`          | Arrête le frontend Next.js     |
| `kill-zombies.sh`      | `gmdev kill-zombies`        | Tue les processus zombies      |

### Commandes Tauri → gmdev

| Commande Tauri              | Appelle gmdev                    | Description                    |
|-----------------------------|----------------------------------|--------------------------------|
| `start_service_v3`          | `gmdev start <service>`          | Démarre un service             |
| `stop_service_v3`           | `gmdev stop <service>`           | Arrête un service              |
| `restart_service_v3`        | `gmdev restart <service>`       | Redémarre un service           |
| `status_service_v3`         | `gmdev status`                   | Obtient le statut des services |
| `kill_zombies_v3`           | `gmdev kill-zombies`             | Tue les zombies                |
| `get_gmdev_status`          | `gmdev status`                   | Statut détaillé                |
| `get_gmdev_logs`            | `gmdev logs <service> --tail N`  | Logs d'un service              |

---

## 🛠️ Commandes gmdev disponibles

### Statut

```bash
gmdev status
```

Retourne l'état complet :
- Tunnel (running/stopped) + port + PID
- Frontend (running/stopped) + port + PID
- Backend (running/stopped) + port + PID
- Derniers logs

### Démarrage / Arrêt / Redémarrage

```bash
gmdev start tunnel
gmdev start back
gmdev start front

gmdev stop tunnel
gmdev stop back
gmdev stop front

gmdev restart tunnel
gmdev restart back
gmdev restart front
```

### Gestion des zombies

```bash
gmdev kill-zombies
```

Tue les processus orphelins connus (ports utilisés / PID sans parent).

### Logs

```bash
gmdev logs front --tail 200
gmdev logs back --tail 200
gmdev logs tunnel --tail 200
```

---

## 🔒 Règles absolues

### ✅ Ce que le DevCenter PEUT faire

- ✅ Modifier l'UI du DevCenter
- ✅ Ajouter de nouveaux boutons
- ✅ Ajouter de nouveaux services gmdev
- ✅ Améliorer les logs ou le status
- ✅ Ajouter un bouton "doctor" ou "health"
- ✅ Lire les outputs gmdev
- ✅ Ajouter de la documentation
- ✅ Gérer la configuration des projets (projects-v3.json)

### ❌ Ce que le DevCenter NE DOIT JAMAIS faire

- ❌ Exécuter directement les services (npm run dev, pnpm dev, etc.)
- ❌ Créer docker-compose
- ❌ Créer devcontainer.json
- ❌ Créer de nouveaux scripts de lancement
- ❌ Gérer les ports en dur (hors gmdev)
- ❌ Créer des environnements parallèles
- ❌ Fallback vers les scripts shell si gmdev n'est pas disponible
- ❌ Dupliquer la logique start/stop
- ❌ Remplacer gmdev

**Toute action runtime = appel gmdev. Aucune exception.**

---

## 🚀 Utilisation

### Pour le développeur

1. **Ouvrir le DevCenter**
2. **Sélectionner un projet**
3. **Cliquer sur "Start" ou "Stop"**

C'est tout. Le reste appartient à `gmdev`.

### Workflow typique

```bash
# Le développeur n'a qu'à :
1. Ouvrir DevCenter
2. Cliquer "Démarrer tout" (tunnel → backend → frontend)
3. Développer

# gmdev gère :
- Le démarrage des services
- La gestion des PID
- Les variables d'environnement
- Les logs
- Le nettoyage des zombies
```

---

## 🔧 Configuration backend Payload

Le backend utilise Payload CMS et nécessite un fichier `.env` local (DEV uniquement).

### Variables minimales requises

```env
PAYLOAD_SECRET=<secret>
PAYLOAD_CSRF_SECRET=<secret>
MONGODB_URI=mongodb://localhost:27017/your-db
PORT=3000
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000
```

### Validation automatique

Un validateur automatique est en place :
- `scripts/check-env.mjs`
- Exécuté automatiquement via `predev` et `prestart`

Si une variable manque :
- ❌ Le backend ne démarre pas
- ❌ Exit code 1
- ✅ Message explicite affiché

---

## 🐛 Dépannage

### Erreur : "gmdev n'est pas disponible"

**Cause :** `gmdev` n'est pas installé ou n'est pas dans le PATH.

**Solution :**
1. Installer `gmdev`
2. Vérifier qu'il est dans le PATH : `which gmdev`
3. Redémarrer le DevCenter

### Erreur : "Service inconnu"

**Cause :** Le service demandé n'existe pas dans gmdev.

**Services valides :**
- `tunnel`
- `back` (backend)
- `front` (frontend)

### Erreur : "Project not found"

**Cause :** Le projet n'existe pas dans `projects-v3.json`.

**Solution :**
1. Utiliser "Scanner mes projets" dans le DevCenter
2. Ou ajouter manuellement via Project Manager

---

## 📚 Références

- [Architecture générale](./ARCHITECTURE.md)
- [Commandes disponibles](./COMMANDS.md)
- [Workflow de développement](./DEV_WORKFLOW.md)
- [Gestion des projets](./PROJECT_MANAGER.md)

---

## 🔄 Historique des versions

### v2.0 (Janvier 2025) — Migration vers gmdev

- ✅ Suppression de tous les fallbacks vers les scripts shell
- ✅ Toutes les commandes passent par `gmdev`
- ✅ `gmdev` est la seule source de vérité
- ✅ Messages d'erreur clairs si `gmdev` n'est pas disponible
- ✅ Ajout de `restart_service_v3`
- ✅ Ajout de `get_gmdev_status` et `get_gmdev_logs`

### v1.x (Avant)

- Utilisation de scripts shell (`tunnel-on.sh`, `backend-on.sh`, etc.)
- Logique dupliquée entre scripts et DevCenter
- Pas de point unique de vérité

---

## 📝 Notes importantes

1. **Les scripts shell sont obsolètes** : Ils ne sont plus utilisés par le DevCenter. Ils peuvent être supprimés ou conservés pour référence historique uniquement.

2. **gmdev est obligatoire** : Le DevCenter ne fonctionnera pas sans `gmdev`. Aucun fallback n'est prévu.

3. **Point unique de vérité** : Toute la logique runtime est dans `gmdev`. Le DevCenter ne fait que l'appeler.

4. **Interface graphique et CLI** : Les deux utilisent la même logique (`gmdev`), garantissant la cohérence.

---

**Dernière mise à jour :** Janvier 2025  
**Maintenu par :** Équipe GestionMax DevCenter


