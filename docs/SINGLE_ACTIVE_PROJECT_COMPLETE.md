# Migration "Single Active Project" - COMPLÈTE ✅

## 🎯 Objectif Atteint

Migration complète vers un modèle **"Single Active Project"** :
- ✅ Catalogue multi-projets (liste de projets, lecture seule)
- ✅ Runtime mono-projet (un seul projet actif à la fois)
- ✅ UI focalisée sur le projet actif uniquement
- ✅ Switch automatique : stop A → start B

---

## 📋 Résumé des 3 PRs

### PR 1 : Fusionner Stores + Simplifier Types ✅

**Objectif** : Un seul store runtime mono-projet

**Changements** :
- ✅ Supprimé `projects: Record<string, ProjectRuntime>` (état multi-projets)
- ✅ Ajouté `status: ProjectStatus | null` (projet actif uniquement)
- ✅ Ajouté `logs: string[]` (logs isolés par projet)
- ✅ Ajouté `activeProjectPath: string | null` (pour cwd)
- ✅ Fusionné `GmdProvider` dans `RuntimeProvider`
- ✅ Supprimé `refreshStatus(projectId)` → `refreshActiveStatus()` (sans paramètre)
- ✅ Supprimé `getProjectStatus(projectId)` → `state.status`

**Résultat** : Un seul store avec état mono-projet

---

### PR 2 : Neutraliser Polling Multi-Projets ✅

**Objectif** : Polling uniquement sur le projet actif

**Changements** :
- ✅ Supprimé `projects.forEach(project => refreshStatus(project.id))`
- ✅ Polling uniquement si `activeProjectId !== null`
- ✅ `ProjectSwitcher` affiche statut uniquement pour projet actif
- ✅ Projets non actifs affichent "STOPPED" par défaut

**Résultat** : Réduction de 80% des appels API (si 5 projets)

---

### PR 3 : Implémenter `switchProject` Optimisé ✅

**Objectif** : Switch automatique stop A → start B avec logs isolés

**Changements** :
- ✅ Logique basée uniquement sur `activeProjectId`
- ✅ Switch automatique : `gmd down` (ancien) → `gmd up` (nouveau)
- ✅ Logs vidés lors du stop/switch (isolation)
- ✅ Gestion d'erreurs robuste
- ✅ Verrou mutex pour séquentialiser

**Résultat** : Switch automatique fonctionnel avec logs isolés

---

## 📊 Architecture Finale

```
┌─────────────────────────────────────────────────────────┐
│                    CATALOGUE (Lecture seule)            │
│  - Liste de tous les projets (projects-v3.json)         │
│  - Pas d'état runtime                                   │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                    RUNTIME (Mono-projet)                 │
│  - activeProjectId: string | null                       │
│  - activeProjectPath: string | null                      │
│  - status: ProjectStatus | null (projet actif uniquement)│
│  - logs: string[] (projet actif uniquement)             │
│  - commandInFlight: boolean (mutex)                      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                    UI (Focalisée sur projet actif)      │
│  - ProjectSwitcher : Liste avec badge ACTIF             │
│  - Status : Uniquement pour projet actif                 │
│  - Logs : Uniquement pour projet actif                   │
│  - Boutons : Start/Stop selon projet actif              │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Fonctionnalités Clés

### 1. Switch Automatique ✅

**Scénario** : Projet A actif → Utilisateur clique "Start" sur Projet B

**Flux** :
1. Détecter A actif ≠ B cible
2. `gmd down` avec cwd de A
3. Vider logs (isolation)
4. `gmd up` avec cwd de B
5. B devient actif

**Résultat** : ✅ Switch automatique sans intervention utilisateur

---

### 2. Isolation des Logs ✅

**Mécanisme** :
- Logs vidés lors du stop : `logs: []`
- Logs vidés lors du switch : `logs: []`
- Logs collectés uniquement pour le projet actif

**Résultat** : ✅ Pas de mélange de logs entre projets

---

### 3. Polling Optimisé ✅

**Avant** :
- Polling sur tous les projets toutes les 3 secondes
- 5 projets = 100 appels/minute

**Après** :
- Polling uniquement sur projet actif
- 1 projet = 20 appels/minute

**Résultat** : ✅ Réduction de 80% des appels API

---

### 4. Verrou Mutex ✅

**Mécanisme** :
- `commandInFlight` vérifié avant chaque commande
- Empêche les commandes concurrentes

**Résultat** : ✅ Une seule commande à la fois

---

## 📁 Fichiers Modifiés

### Créés
- `docs/AUDIT_SINGLE_ACTIVE_PROJECT.md`
- `docs/PLAN_SINGLE_ACTIVE_PROJECT.md`
- `docs/PR1_SINGLE_ACTIVE_STATUS.md`
- `docs/PR2_SINGLE_ACTIVE_STATUS.md`
- `docs/PR3_SINGLE_ACTIVE_STATUS.md`
- `docs/SINGLE_ACTIVE_PROJECT_COMPLETE.md` (ce fichier)

### Modifiés
- `src/core/runtime/runtime.types.ts`
- `src/core/runtime/runtime.store.tsx`
- `src/core/runtime/switchProject.ts`
- `src/components/ProjectSwitcher.tsx`
- `src/components/GmdLogs.tsx`
- `src/pages/Dashboard.tsx`
- `src/App.tsx`

### Supprimés
- `src/core/gmd/gmd.store.tsx` (fusionné dans RuntimeProvider)

---

## ✅ Checklist Complète

### PR 1 : Fusion Stores
- [x] Supprimer `projects: Record<string, ProjectRuntime>`
- [x] Ajouter `status: ProjectStatus | null`
- [x] Ajouter `logs: string[]`
- [x] Ajouter `activeProjectPath: string | null`
- [x] Renommer `switching` → `commandInFlight`
- [x] Supprimer `refreshStatus(projectId)`
- [x] Supprimer `getProjectStatus(projectId)`
- [x] Ajouter `refreshActiveStatus()` (sans paramètre)
- [x] Ajouter `runGmd()` dans RuntimeProvider
- [x] Ajouter `clearLogs()` dans RuntimeProvider
- [x] Supprimer `GmdProvider` de `App.tsx`
- [x] Supprimer `src/core/gmd/gmd.store.tsx`
- [x] Modifier `GmdLogs.tsx` pour utiliser `useRuntime()`
- [x] Modifier `ProjectSwitcher.tsx` pour utiliser `state.status`
- [x] Modifier `switchProject.ts` pour utiliser modèle mono-projet
- [x] Modifier `Dashboard.tsx` pour utiliser `refreshActiveStatus()`

### PR 2 : Neutraliser Polling
- [x] Supprimer `projects.forEach(project => refreshStatus(project.id))`
- [x] Polling uniquement si `activeProjectId !== null`
- [x] Appeler `refreshActiveStatus()` au lieu de `refreshStatus(projectId)`
- [x] Modifier `ProjectSwitcher` pour n'afficher le statut que du projet actif
- [x] Supprimer affichage de `state.projects[project.id]?.lastError`

### PR 3 : Switch Optimisé
- [x] Modifier `switchProject` pour utiliser uniquement `activeProjectId`
- [x] Implémenter logique stop A → start B avec `gmd down` puis `gmd up`
- [x] Vider `logs` lors du stop/switch pour isoler par projet
- [x] Gérer les erreurs avec try/catch
- [x] Continuer même si stop échoue (robustesse)
- [x] Mettre à jour état correctement
- [x] Modifier `ProjectSwitcher` pour afficher erreur uniquement si projet actif
- [x] Vérifier que le verrou mutex fonctionne

---

## 🎯 Résultat Final

### Avant
- ❌ État runtime pour chaque projet (`state.projects[projectId]`)
- ❌ Polling sur tous les projets toutes les 3 secondes
- ❌ Logs mélangés entre projets
- ❌ UI affiche le statut de tous les projets
- ❌ Pas de switch automatique

### Après
- ✅ État runtime uniquement pour le projet actif (`state.status`, `state.logs`)
- ✅ Polling uniquement sur le projet actif
- ✅ Logs isolés par projet (vidés lors du switch)
- ✅ UI affiche le statut uniquement du projet actif
- ✅ Switch automatique : stop A → start B
- ✅ Verrou mutex pour séquentialiser
- ✅ Réduction de 80% des appels API

---

## 🧪 Tests Recommandés

### Test 1 : Switch A → B
1. Démarrer Projet A
2. Cliquer "Start" sur Projet B
3. ✅ Vérifier que A s'arrête
4. ✅ Vérifier que B démarre
5. ✅ Vérifier que logs de A sont vidés
6. ✅ Vérifier que logs de B s'affichent

### Test 2 : Toggle Stop
1. Démarrer Projet A
2. Cliquer "Stop" sur Projet A
3. ✅ Vérifier que A s'arrête
4. ✅ Vérifier que logs sont vidés
5. ✅ Vérifier que `activeProjectId === null`

### Test 3 : Verrou Mutex
1. Démarrer Projet A (commande en cours)
2. Essayer de démarrer Projet B immédiatement
3. ✅ Vérifier que B est ignoré (verrou actif)

### Test 4 : Polling Optimisé
1. Avoir 5 projets configurés
2. Démarrer 1 projet
3. ✅ Vérifier que seul ce projet est pollé (pas les 4 autres)

### Test 5 : Isolation Logs
1. Démarrer Projet A (générer des logs)
2. Switch vers Projet B
3. ✅ Vérifier que logs de A sont vidés
4. ✅ Vérifier que seuls les logs de B s'affichent

---

## 📝 Notes Importantes

1. **Modèle "Single Active Project"** : Un seul projet peut être RUNNING à la fois. Les autres projets affichent "STOPPED" par défaut.

2. **Isolation des Logs** : Les logs sont vidés lors du stop/switch pour éviter le mélange entre projets.

3. **Polling Optimisé** : Le polling ne se fait que sur le projet actif, réduisant significativement les appels API.

4. **Verrou Mutex** : `commandInFlight` empêche les commandes concurrentes pour éviter les conflits.

5. **Switch Automatique** : Lors du switch A → B, A est automatiquement arrêté avant que B ne démarre.

---

**Statut** : ✅ Migration complète - Prêt pour tests et déploiement

**Date de complétion** : 2026-01-28
