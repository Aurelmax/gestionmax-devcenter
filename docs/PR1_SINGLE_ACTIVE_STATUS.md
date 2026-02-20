# PR 1 : Fusionner Stores + Simplifier Types - STATUS ✅

## ✅ Objectif

Fusionner `GmdState` et `RuntimeState` en un seul store runtime mono-projet.

**Modèle cible** : Catalogue multi-projets + Runtime mono-projet
- Un seul projet actif à la fois
- Status, logs, commandes concernent uniquement le projet actif

---

## ✅ Fichiers Modifiés

### 1. `src/core/runtime/runtime.types.ts` ✅

**Changements** :
- ❌ Supprimé `projects: Record<string, ProjectRuntime>` (état multi-projets)
- ❌ Supprimé interface `ProjectRuntime` (plus nécessaire)
- ✅ Ajouté `activeProjectPath: string | null` (pour cwd des commandes)
- ✅ Ajouté `status: ProjectStatus | null` (projet actif uniquement)
- ✅ Ajouté `logs: string[]` (logs isolés par projet actif)
- ✅ Renommé `switching` → `commandInFlight` (verrou mutex)
- ✅ Ajouté interface `GmdResult` (exportée depuis types)
- ✅ Modifié `RuntimeContextValue` :
  - ❌ Supprimé `refreshStatus(projectId)`
  - ❌ Supprimé `getProjectStatus(projectId)`
  - ✅ Ajouté `refreshActiveStatus()` (sans paramètre)
  - ✅ Ajouté `runGmd()` (fusionné depuis GmdProvider)
  - ✅ Ajouté `clearLogs()`

---

### 2. `src/core/runtime/runtime.store.tsx` ✅

**Changements** :
- ✅ Modifié état initial : supprimé `projects: {}`, ajouté `status`, `logs`, `activeProjectPath`
- ✅ Renommé `switching` → `commandInFlight`
- ❌ Supprimé `refreshStatus(projectId)` → Remplacé par `refreshActiveStatus()` (sans paramètre)
- ❌ Supprimé `getProjectStatus(projectId)` → Remplacé par `state.status` (projet actif uniquement)
- ✅ Ajouté `runGmd()` (fusionné depuis GmdProvider) :
  - Verrou mutex (`commandInFlight`)
  - Gestion des logs (isolés par projet actif)
  - Utilisation du `cwd` du projet actif si non spécifié
- ✅ Ajouté `clearLogs()` pour effacer les logs du projet actif
- ✅ Modifié `refreshActiveStatus()` :
  - Utilise `gmdev status` au lieu de `getServiceStatusV3`
  - Ne fonctionne que si `activeProjectId !== null`
  - Met à jour uniquement `state.status` (pas de `state.projects`)

---

### 3. `src/core/runtime/switchProject.ts` ✅

**Changements** :
- ❌ Supprimé fonctions `startProject()` et `stopProject()` (logique intégrée dans `switchProject`)
- ✅ Refactorisé `switchProject()` pour utiliser le modèle mono-projet :
  - Utilise uniquement `activeProjectId` et `activeProjectPath` (pas `state.projects`)
  - Cas 1 : Toggle stop si projet déjà actif → `gmd down` puis vider logs
  - Cas 2 : Un autre projet actif → `gmd down` (ancien) puis vider logs puis `gmd up` (nouveau)
  - Cas 3 : Démarrer projet cible → `gmd up` puis mettre à jour `activeProjectId`, `activeProjectPath`, `status`
  - Logs vidés lors du stop/switch pour isoler par projet

---

### 4. `src/components/ProjectSwitcher.tsx` ✅

**Changements** :
- ❌ Supprimé `getProjectStatus(project.id)` pour chaque projet
- ✅ Statut uniquement pour projet actif : `status = isActive ? state.status : "STOPPED"`
- ✅ Renommé `state.switching` → `state.commandInFlight`
- ❌ Supprimé affichage de `state.projects[project.id]?.lastError`
- ✅ Affichage d'erreur uniquement si `isActive && status === "ERROR"`

---

### 5. `src/components/GmdLogs.tsx` ✅

**Changements** :
- ❌ Supprimé `import { useGmd } from "@/core/gmd/gmd.store"`
- ✅ Ajouté `import { useRuntime } from "@/core/runtime/runtime.store"`
- ✅ Remplacé `useGmd()` par `useRuntime()`
- ✅ Affichage uniquement si `activeProjectId !== null` (logs isolés par projet)

---

### 6. `src/pages/Dashboard.tsx` ✅

**Changements** :
- ❌ Supprimé `refreshStatus` → Remplacé par `refreshActiveStatus`
- ✅ Polling modifié temporairement (sera optimisé en PR 2) :
  - Ne poll que si `activeProjectId !== null`
  - Appelle `refreshActiveStatus()` au lieu de `refreshStatus(project.id)`
- ✅ Renommé `state.switching` → `state.commandInFlight`

---

### 7. `src/App.tsx` ✅

**Changements** :
- ❌ Supprimé `import { GmdProvider } from "./core/gmd/gmd.store"`
- ❌ Supprimé `<GmdProvider>` wrapper (fusionné dans RuntimeProvider)

---

### 8. `src/core/gmd/gmd.store.tsx` ❌ SUPPRIMÉ

**Raison** : Fonctionnalité fusionnée dans `RuntimeProvider`

---

## ✅ Résultat

### Avant
- ❌ Deux stores séparés (`GmdProvider` + `RuntimeProvider`)
- ❌ État runtime pour chaque projet (`state.projects[projectId]`)
- ❌ `refreshStatus(projectId)` accepte n'importe quel projet
- ❌ `getProjectStatus(projectId)` retourne n'importe quel projet
- ❌ Logs globaux (pas isolés par projet)

### Après
- ✅ Un seul store runtime (`RuntimeProvider`)
- ✅ État runtime uniquement pour le projet actif (`state.status`, `state.logs`)
- ✅ `refreshActiveStatus()` sans paramètre (projet actif uniquement)
- ✅ `state.status` pour le statut du projet actif
- ✅ Logs isolés par projet (vidés lors du switch)
- ✅ `runGmd()` centralisé avec verrou mutex

---

## ✅ Checklist PR 1

- [x] Supprimer `projects: Record<string, ProjectRuntime>` de `RuntimeState`
- [x] Ajouter `status: ProjectStatus | null` à `RuntimeState`
- [x] Ajouter `logs: string[]` à `RuntimeState`
- [x] Ajouter `activeProjectPath: string | null` à `RuntimeState`
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

---

## 🔄 Prochaines Étapes (PR 2)

- [ ] Optimiser polling dans Dashboard (déjà fait partiellement, à finaliser)
- [ ] Vérifier que tous les usages de l'ancien modèle sont supprimés
- [ ] Tester le switch entre projets
- [ ] Vérifier l'isolation des logs

---

**Statut** : ✅ PR 1 terminée - Prêt pour PR 2
