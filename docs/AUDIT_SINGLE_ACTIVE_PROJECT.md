# Audit : Migration vers "Single Active Project"

## 🎯 Objectif

Passer d'un modèle **multi-projets runtime** à un modèle **catalogue multi-projets + runtime mono-projet** :
- **Catalogue** : Liste de tous les projets (lecture seule)
- **Runtime** : Un seul projet actif à la fois (status, logs, commandes)
- **Switch** : Stop projet A → Start projet B automatiquement

---

## ⚠️ Problèmes Actuels Identifiés

### 1. États Globaux Non Scopés par Projet

#### A. `RuntimeState.projects: Record<string, ProjectRuntime>`
**Fichier** : `src/core/runtime/runtime.types.ts:24`
```typescript
export interface RuntimeState {
  activeProjectId: string | null;
  projects: Record<string, ProjectRuntime>; // ❌ État par projet
  switching: boolean;
}
```

**Problème** : Stocke un état runtime pour chaque projet, permettant la gestion simultanée.

**Impact** : 
- `getProjectStatus(projectId)` peut retourner le statut de n'importe quel projet
- `refreshStatus(projectId)` met à jour n'importe quel projet
- UI peut afficher le statut de plusieurs projets en même temps

---

#### B. Polling Multi-Projets
**Fichier** : `src/pages/Dashboard.tsx:179-192`
```typescript
// Polling automatique des statuts toutes les 3 secondes
useEffect(() => {
  if (projects.length === 0) return;
  
  const interval = setInterval(() => {
    projects.forEach(project => {  // ❌ Polling sur TOUS les projets
      refreshStatus(project.id).catch(err => 
        console.warn(`Failed to refresh status for ${project.id}:`, err)
      );
    });
  }, 3000);
  
  return () => clearInterval(interval);
}, [projects, refreshStatus]);
```

**Problème** : Polling actif sur tous les projets toutes les 3 secondes.

**Impact** :
- Appels API multiples inutiles
- Mélange de statuts multi-projets
- Pas de focalisation sur le projet actif

---

#### C. `refreshStatus(projectId: string)`
**Fichier** : `src/core/runtime/runtime.store.tsx:58-101`
```typescript
const refreshStatus = useCallback(async (projectId: string) => {
  // Poller le statut réel des services
  const [backend, frontend, tunnel] = await Promise.all([
    getServiceStatusV3(projectId, "backend").catch(() => "STOPPED"),
    getServiceStatusV3(projectId, "frontend").catch(() => "STOPPED"),
    getServiceStatusV3(projectId, "tunnel").catch(() => "STOPPED"),
  ]);
  
  // Mise à jour dans state.projects[projectId]  // ❌ État multi-projets
  setState(prev => ({
    ...prev,
    projects: {
      ...prev.projects,
      [projectId]: { ... }
    }
  }));
}, [projects]);
```

**Problème** : Accepte n'importe quel `projectId` et met à jour l'état correspondant.

**Impact** : Permet de gérer plusieurs projets simultanément.

---

#### D. `getProjectStatus(projectId: string)`
**Fichier** : `src/core/runtime/runtime.store.tsx:106-108`
```typescript
const getProjectStatus = useCallback((projectId: string): ProjectStatus => {
  return state.projects[projectId]?.status || "STOPPED";  // ❌ Retourne n'importe quel projet
}, [state]);
```

**Problème** : Retourne le statut de n'importe quel projet depuis `state.projects`.

**Impact** : UI peut afficher le statut de plusieurs projets.

---

#### E. `ProjectSwitcher` Affiche Tous les Statuts
**Fichier** : `src/components/ProjectSwitcher.tsx:21`
```typescript
{projects.map(project => {
  const status = getProjectStatus(project.id);  // ❌ Statut pour chaque projet
  const isActive = state.activeProjectId === project.id;
  // ...
})}
```

**Problème** : Affiche le statut de chaque projet dans la liste.

**Impact** : UI montre des statuts pour des projets non actifs.

---

#### F. `GmdState` Dupliqué avec `RuntimeState`
**Fichier** : `src/core/gmd/gmd.store.tsx:10-16`
```typescript
interface GmdState {
  activeProjectId: string | null;  // ⚠️ Dupliqué avec RuntimeState
  activeProjectPath: string | null;
  commandInFlight: boolean;
  logs: string[];  // ⚠️ Logs globaux, pas scopés par projet
  lastStatus: Record<string, any> | null;  // ⚠️ Status multi-projets
}
```

**Problème** : 
- `activeProjectId` dupliqué avec `RuntimeState.activeProjectId`
- `logs` globaux, pas isolés par projet
- `lastStatus` peut stocker plusieurs projets

**Impact** : Deux sources de vérité pour le projet actif, logs mélangés.

---

### 2. Logique de Switch Non Optimale

#### A. `switchProject` Utilise `state.projects`
**Fichier** : `src/core/runtime/switchProject.ts:29`
```typescript
const currentStatus = currentState.projects[targetProjectId]?.status || "STOPPED";
```

**Problème** : Lit depuis `state.projects` au lieu de vérifier uniquement `activeProjectId`.

**Impact** : Logique basée sur l'état multi-projets.

---

## ✅ Solution Proposée (Minimale)

### Modèle Cible

```
┌─────────────────────────────────────────────────────────┐
│                    CATALOGUE (Lecture seule)              │
│  - Liste de tous les projets (projects-v3.json)          │
│  - Pas d'état runtime                                    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                    RUNTIME (Mono-projet)                 │
│  - activeProjectId: string | null                       │
│  - activeProjectPath: string | null                      │
│  - status: ProjectStatus (du projet actif uniquement)    │
│  - logs: string[] (du projet actif uniquement)          │
│  - commandInFlight: boolean (mutex)                      │
└─────────────────────────────────────────────────────────┘
```

### Changements Minimaux

1. **Supprimer `RuntimeState.projects`** → Remplacer par `status: ProjectStatus | null`
2. **Supprimer `refreshStatus(projectId)`** → Remplacer par `refreshActiveStatus()` (sans paramètre)
3. **Supprimer `getProjectStatus(projectId)`** → Remplacer par `state.status` (projet actif uniquement)
4. **Supprimer polling multi-projets** → Polling uniquement sur `activeProjectId`
5. **Fusionner `GmdState` et `RuntimeState`** → Un seul store runtime mono-projet
6. **Modifier `switchProject`** → Logique basée uniquement sur `activeProjectId`

---

## 📋 Plan en 3 PRs

### PR 1 : Fusionner Stores + Simplifier Types

**Objectif** : Fusionner `GmdState` et `RuntimeState` en un seul store runtime mono-projet.

**Fichiers** :
- ✅ Modifier `src/core/runtime/runtime.types.ts` :
  - Supprimer `projects: Record<string, ProjectRuntime>`
  - Ajouter `status: ProjectStatus | null` (projet actif uniquement)
  - Ajouter `logs: string[]` (projet actif uniquement)
  - Ajouter `activeProjectPath: string | null`
- ✅ Modifier `src/core/runtime/runtime.store.tsx` :
  - Supprimer `refreshStatus(projectId)`
  - Supprimer `getProjectStatus(projectId)`
  - Ajouter `refreshActiveStatus()` (sans paramètre, utilise `activeProjectId`)
  - Fusionner avec `GmdProvider` (ou supprimer `GmdProvider` et tout mettre dans `RuntimeProvider`)
- ✅ Supprimer `src/core/gmd/gmd.store.tsx` (fusionné dans RuntimeProvider)

**Résultat** : Un seul store runtime avec état mono-projet.

---

### PR 2 : Neutraliser Polling Multi-Projets

**Objectif** : Polling uniquement sur le projet actif.

**Fichiers** :
- ✅ Modifier `src/pages/Dashboard.tsx` :
  - Supprimer `projects.forEach(project => refreshStatus(project.id))`
  - Remplacer par polling uniquement si `activeProjectId !== null`
  - Appeler `refreshActiveStatus()` au lieu de `refreshStatus(projectId)`
- ✅ Modifier `src/components/ProjectSwitcher.tsx` :
  - Supprimer `getProjectStatus(project.id)` pour chaque projet
  - Afficher uniquement "ACTIF" si `project.id === activeProjectId`
  - Statut "STOPPED" par défaut pour les projets non actifs

**Résultat** : Plus de polling multi-projets, uniquement sur le projet actif.

---

### PR 3 : Implémenter `switchProject` Optimisé

**Objectif** : Switch automatique stop A → start B.

**Fichiers** :
- ✅ Modifier `src/core/runtime/switchProject.ts` :
  - Logique basée uniquement sur `activeProjectId` (pas `state.projects`)
  - Si `activeProjectId !== null && activeProjectId !== targetId` :
    - `runGmd(["down"], { cwd: activeProjectPath })`
    - Attendre fin
    - `runGmd(["up"], { cwd: targetProjectPath })`
  - Sinon (toggle start/stop) :
    - Si actif : `runGmd(["down"])`
    - Sinon : `runGmd(["up"])`
- ✅ Modifier `src/components/ProjectSwitcher.tsx` :
  - Bouton "Start" si projet non actif
  - Bouton "Stop" si projet actif
  - Logs et status affichés uniquement pour le projet actif

**Résultat** : Switch automatique fonctionnel avec logs isolés.

---

## 🔧 Patch Minimal (2 Boutons)

### Bouton 1 : Status (Projet Actif)

**Fichier** : `src/components/ProjectSwitcher.tsx`

```typescript
// AVANT
const status = getProjectStatus(project.id);

// APRÈS
const status = project.id === state.activeProjectId 
  ? state.status || "STOPPED"
  : "STOPPED";
```

### Bouton 2 : Remote Up (Switch)

**Fichier** : `src/core/runtime/switchProject.ts`

```typescript
// AVANT
const currentStatus = currentState.projects[targetProjectId]?.status || "STOPPED";

// APRÈS
const currentActiveId = currentState.activeProjectId;
const targetProject = projects.find(p => p.id === targetProjectId);
if (!targetProject) throw new Error(`Project ${targetProjectId} not found`);

// Si un autre projet est actif, le stopper d'abord
if (currentActiveId && currentActiveId !== targetProjectId) {
  const activeProject = projects.find(p => p.id === currentActiveId);
  if (activeProject) {
    await runGmdCommand(["down"], undefined, activeProject.rootPath);
  }
}

// Toggle start/stop du projet cible
if (currentActiveId === targetProjectId) {
  // Stop
  await runGmdCommand(["down"], undefined, targetProject.rootPath);
  setState(prev => ({ ...prev, activeProjectId: null, status: null }));
} else {
  // Start
  await runGmdCommand(["up"], undefined, targetProject.rootPath);
  setState(prev => ({ 
    ...prev, 
    activeProjectId: targetProjectId,
    activeProjectPath: targetProject.rootPath,
    status: "RUNNING"
  }));
}
```

---

## ✅ Checklist de Migration

### PR 1 : Fusion Stores
- [ ] Supprimer `projects: Record<string, ProjectRuntime>` de `RuntimeState`
- [ ] Ajouter `status: ProjectStatus | null` à `RuntimeState`
- [ ] Ajouter `logs: string[]` à `RuntimeState`
- [ ] Ajouter `activeProjectPath: string | null` à `RuntimeState`
- [ ] Supprimer `refreshStatus(projectId)`
- [ ] Supprimer `getProjectStatus(projectId)`
- [ ] Ajouter `refreshActiveStatus()` (sans paramètre)
- [ ] Fusionner `GmdProvider` dans `RuntimeProvider` (ou supprimer GmdProvider)

### PR 2 : Neutraliser Polling
- [ ] Supprimer `projects.forEach(project => refreshStatus(project.id))` dans Dashboard
- [ ] Polling uniquement si `activeProjectId !== null`
- [ ] Appeler `refreshActiveStatus()` au lieu de `refreshStatus(projectId)`
- [ ] Modifier `ProjectSwitcher` pour n'afficher le statut que du projet actif

### PR 3 : Switch Optimisé
- [ ] Modifier `switchProject` pour utiliser uniquement `activeProjectId`
- [ ] Implémenter logique stop A → start B
- [ ] Isoler logs par projet actif
- [ ] Tester switch entre projets

---

**Statut** : ✅ Audit terminé - Prêt pour implémentation
