# Plan : Migration vers "Single Active Project"

## 🎯 Objectif Final

**Modèle** : Catalogue multi-projets + Runtime mono-projet
- **Catalogue** : Liste de tous les projets (lecture seule, pas d'état runtime)
- **Runtime** : Un seul projet actif (`activeProjectId`, `status`, `logs`, `commandInFlight`)
- **Switch** : Stop projet A → Start projet B automatiquement
- **UI** : Status, logs, boutons concernent uniquement le projet actif

---

## 📋 Plan en 3 PRs

### PR 1 : Fusionner Stores + Simplifier Types

**Objectif** : Un seul store runtime mono-projet (fusionner `GmdState` et `RuntimeState`)

#### Fichiers à Modifier

**1. `src/core/runtime/runtime.types.ts`**

```typescript
// AVANT
export interface RuntimeState {
  activeProjectId: string | null;
  projects: Record<string, ProjectRuntime>; // ❌ Supprimer
  switching: boolean;
}

// APRÈS
export interface RuntimeState {
  activeProjectId: string | null;
  activeProjectPath: string | null; // ✅ Ajouter
  status: ProjectStatus | null; // ✅ Projet actif uniquement
  logs: string[]; // ✅ Logs du projet actif uniquement
  commandInFlight: boolean; // ✅ Renommer depuis switching
}

export interface RuntimeContextValue {
  state: RuntimeState;
  switchProject: (projectId: string) => Promise<void>;
  refreshActiveStatus: () => Promise<void>; // ✅ Sans paramètre
  runGmd: (args: string[], options?: { cwd?: string }) => Promise<GmdResult>; // ✅ Ajouter
  clearLogs: () => void; // ✅ Ajouter
}
```

**2. `src/core/runtime/runtime.store.tsx`**

```typescript
// AVANT
const [state, setState] = useState<RuntimeState>({
  activeProjectId: null,
  projects: {}, // ❌ Supprimer
  switching: false,
});

// APRÈS
const [state, setState] = useState<RuntimeState>({
  activeProjectId: null,
  activeProjectPath: null, // ✅ Ajouter
  status: null, // ✅ Projet actif uniquement
  logs: [], // ✅ Logs isolés
  commandInFlight: false, // ✅ Renommer
});

// AVANT
const refreshStatus = useCallback(async (projectId: string) => {
  // Poller le statut réel des services
  const [backend, frontend, tunnel] = await Promise.all([
    getServiceStatusV3(projectId, "backend").catch(() => "STOPPED"),
    getServiceStatusV3(projectId, "frontend").catch(() => "STOPPED"),
    getServiceStatusV3(projectId, "tunnel").catch(() => "STOPPED"),
  ]);
  
  setState(prev => ({
    ...prev,
    projects: {
      ...prev.projects,
      [projectId]: { status, ... }
    }
  }));
}, [projects]);

// APRÈS
const refreshActiveStatus = useCallback(async () => {
  if (!state.activeProjectId || !state.activeProjectPath) {
    setState(prev => ({ ...prev, status: null }));
    return;
  }
  
  const project = projects.find(p => p.id === state.activeProjectId);
  if (!project) return;
  
  try {
    // Utiliser gmdev status au lieu de getServiceStatusV3
    const result = await runGmdCommand(["status"], undefined, project.rootPath);
    
    // Parser le résultat (simplifié)
    const isRunning = result.stdout.toLowerCase().includes("running") || 
                      result.stdout.toLowerCase().includes("active");
    const status: ProjectStatus = isRunning ? "RUNNING" : "STOPPED";
    
    setState(prev => ({ ...prev, status }));
  } catch (error) {
    setState(prev => ({ ...prev, status: "ERROR" }));
  }
}, [state.activeProjectId, state.activeProjectPath, projects]);

// Supprimer getProjectStatus(projectId) - Remplacé par state.status

// Ajouter runGmd (fusionné depuis GmdProvider)
const runGmd = useCallback(async (
  args: string[],
  options?: { cwd?: string }
): Promise<GmdResult> => {
  if (state.commandInFlight) {
    throw new Error("Une commande est déjà en cours d'exécution");
  }
  
  setState(prev => ({ ...prev, commandInFlight: true }));
  
  try {
    const cwd = options?.cwd || state.activeProjectPath || undefined;
    const projectId = state.activeProjectId || undefined;
    
    const result = await invoke<GmdResult>("run_gmd_command", {
      args,
      projectId,
      cwd,
    });
    
    // Ajouter aux logs
    setState(prev => ({
      ...prev,
      logs: [
        ...prev.logs,
        `[${new Date().toLocaleTimeString()}] gmdev ${args.join(" ")}`,
        result.stdout,
        result.stderr,
      ]
        .filter(Boolean)
        .slice(-100),
    }));
    
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    setState(prev => ({
      ...prev,
      logs: [
        ...prev.logs,
        `[${new Date().toLocaleTimeString()}] ERREUR: ${errorMsg}`,
      ].slice(-100),
    }));
    throw error;
  } finally {
    setState(prev => ({ ...prev, commandInFlight: false }));
  }
}, [state.activeProjectId, state.activeProjectPath, state.commandInFlight]);

const clearLogs = useCallback(() => {
  setState(prev => ({ ...prev, logs: [] }));
}, []);
```

**3. `src/App.tsx`**

```typescript
// AVANT
<ProjectProvider>
  <GmdProvider>
    <RuntimeProvider projects={projects}>
      ...
    </RuntimeProvider>
  </GmdProvider>
</ProjectProvider>

// APRÈS
<ProjectProvider>
  <RuntimeProvider projects={projects}>
    ...
  </RuntimeProvider>
</ProjectProvider>
```

**4. Supprimer `src/core/gmd/gmd.store.tsx`** (fusionné dans RuntimeProvider)

**5. Modifier `src/components/GmdLogs.tsx`**

```typescript
// AVANT
import { useGmd } from "@/core/gmd/gmd.store";

// APRÈS
import { useRuntime } from "@/core/runtime/runtime.store";

// Remplacer useGmd() par useRuntime()
const { state, clearLogs } = useRuntime();
```

---

### PR 2 : Neutraliser Polling Multi-Projets

**Objectif** : Polling uniquement sur le projet actif

#### Fichiers à Modifier

**1. `src/pages/Dashboard.tsx`**

```typescript
// AVANT
const { refreshStatus, state } = useRuntime();

// Polling automatique des statuts toutes les 3 secondes
useEffect(() => {
  if (projects.length === 0) return;
  
  const interval = setInterval(() => {
    projects.forEach(project => {  // ❌ Supprimer
      refreshStatus(project.id).catch(err => 
        console.warn(`Failed to refresh status for ${project.id}:`, err)
      );
    });
  }, 3000);
  
  return () => clearInterval(interval);
}, [projects, refreshStatus]);

// APRÈS
const { refreshActiveStatus, state } = useRuntime();

// Polling uniquement sur le projet actif
useEffect(() => {
  if (!state.activeProjectId) return;
  
  const interval = setInterval(() => {
    refreshActiveStatus().catch(err => 
      console.warn("Failed to refresh active status:", err)
    );
  }, 3000);
  
  return () => clearInterval(interval);
}, [state.activeProjectId, refreshActiveStatus]);
```

**2. `src/components/ProjectSwitcher.tsx`**

```typescript
// AVANT
const { state, switchProject, getProjectStatus } = useRuntime();

{projects.map(project => {
  const status = getProjectStatus(project.id); // ❌ Supprimer
  const isActive = state.activeProjectId === project.id;
  // ...
})}

// APRÈS
const { state, switchProject } = useRuntime();

{projects.map(project => {
  const isActive = state.activeProjectId === project.id;
  const status = isActive 
    ? (state.status || "STOPPED") // ✅ Statut uniquement pour projet actif
    : "STOPPED"; // ✅ Par défaut STOPPED pour projets non actifs
  const isLoading = isActive && (status === "STARTING" || status === "STOPPING");
  const isRunning = isActive && status === "RUNNING";
  const isError = isActive && status === "ERROR";
  // ...
})}

// Supprimer l'affichage de lastError depuis state.projects[project.id]
// Remplacer par state.status === "ERROR" si isActive
```

---

### PR 3 : Implémenter `switchProject` Optimisé

**Objectif** : Switch automatique stop A → start B avec logs isolés

#### Fichiers à Modifier

**1. `src/core/runtime/switchProject.ts`**

```typescript
// AVANT
export async function switchProject(
  targetProjectId: string,
  currentState: RuntimeState,
  setState: React.Dispatch<React.SetStateAction<RuntimeState>>,
  projects: ProjectV3[]
): Promise<void> {
  const targetProject = projects.find(p => p.id === targetProjectId);
  if (!targetProject) {
    throw new Error(`Project ${targetProjectId} not found`);
  }

  const currentStatus = currentState.projects[targetProjectId]?.status || "STOPPED";
  const activeProjectId = currentState.activeProjectId;
  
  // Cas 1 : Le projet cible est déjà RUNNING et actif → Stop
  if (currentStatus === "RUNNING" && activeProjectId === targetProjectId) {
    await stopProject(targetProjectId, targetProject, setState);
    setState(prev => ({ ...prev, activeProjectId: null }));
    return;
  }
  
  // Cas 2 : Un autre projet est actif → Stop A puis Start B
  if (activeProjectId && activeProjectId !== targetProjectId) {
    // ...
  }
  
  // Cas 3 : Démarrer le projet cible
  await startProject(targetProjectId, targetProject, setState);
  setState(prev => ({ ...prev, activeProjectId: targetProjectId }));
}

// APRÈS
import { runGmdCommand } from "@/lib/commands";

export async function switchProject(
  targetProjectId: string,
  currentState: RuntimeState,
  setState: React.Dispatch<React.SetStateAction<RuntimeState>>,
  projects: ProjectV3[]
): Promise<void> {
  const targetProject = projects.find(p => p.id === targetProjectId);
  if (!targetProject) {
    throw new Error(`Project ${targetProjectId} not found`);
  }

  const currentActiveId = currentState.activeProjectId;
  const currentActivePath = currentState.activeProjectPath;
  
  // Cas 1 : Toggle stop si projet déjà actif
  if (currentActiveId === targetProjectId) {
    // Stop le projet actif
    setState(prev => ({ ...prev, status: "STOPPING" }));
    
    try {
      await runGmdCommand(["down"], undefined, currentActivePath || undefined);
      setState(prev => ({ 
        ...prev, 
        activeProjectId: null,
        activeProjectPath: null,
        status: null,
        logs: [], // ✅ Isoler logs : vider lors du stop
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        status: "ERROR",
        logs: [
          ...prev.logs,
          `[${new Date().toLocaleTimeString()}] ERREUR: ${error instanceof Error ? error.message : String(error)}`,
        ].slice(-100),
      }));
      throw error;
    }
    return;
  }
  
  // Cas 2 : Un autre projet est actif → Stop A puis Start B
  if (currentActiveId && currentActiveId !== targetProjectId) {
    const activeProject = projects.find(p => p.id === currentActiveId);
    if (activeProject) {
      // Stop projet actif
      setState(prev => ({ ...prev, status: "STOPPING" }));
      
      try {
        await runGmdCommand(["down"], undefined, currentActivePath || undefined);
      } catch (error) {
        console.warn("Failed to stop active project:", error);
        // Continuer même si stop échoue
      }
      
      // Vider les logs avant de démarrer le nouveau projet
      setState(prev => ({ 
        ...prev, 
        activeProjectId: null,
        activeProjectPath: null,
        status: null,
        logs: [], // ✅ Isoler logs : vider lors du switch
      }));
    }
  }
  
  // Cas 3 : Démarrer le projet cible
  setState(prev => ({ 
    ...prev, 
    activeProjectId: targetProjectId,
    activeProjectPath: targetProject.rootPath,
    status: "STARTING",
  }));
  
  try {
    await runGmdCommand(["up"], undefined, targetProject.rootPath);
    
    setState(prev => ({ 
      ...prev, 
      status: "RUNNING",
    }));
  } catch (error) {
    setState(prev => ({ 
      ...prev, 
      status: "ERROR",
      logs: [
        ...prev.logs,
        `[${new Date().toLocaleTimeString()}] ERREUR: ${error instanceof Error ? error.message : String(error)}`,
      ].slice(-100),
    }));
    throw error;
  }
}
```

**2. `src/components/ProjectSwitcher.tsx`**

```typescript
// Modifier l'affichage des erreurs
{isError && isActive && state.status === "ERROR" && (
  <div className="mt-2 p-2 rounded bg-red-900/20 border border-red-500/30">
    <p className="text-xs text-red-300">
      Erreur lors du démarrage/arrêt du projet
    </p>
  </div>
)}
```

---

## 🔧 Patch Minimal (2 Boutons)

### Bouton 1 : Status (Projet Actif)

**Fichier** : `src/components/ProjectSwitcher.tsx`

```typescript
// Ligne 21
const isActive = state.activeProjectId === project.id;
const status = isActive 
  ? (state.status || "STOPPED")  // ✅ Statut uniquement pour projet actif
  : "STOPPED"; // ✅ Par défaut STOPPED pour projets non actifs
```

### Bouton 2 : Remote Up (Switch)

**Fichier** : `src/core/runtime/switchProject.ts`

```typescript
// Logique complète dans switchProject() (voir PR 3 ci-dessus)
// Utilise runGmdCommand(["down"], cwd) puis runGmdCommand(["up"], cwd)
// Isolé par projet via cwd
```

### Logs Live

**Fichier** : `src/components/GmdLogs.tsx`

```typescript
// Les logs sont déjà isolés dans state.logs (projet actif uniquement)
// Afficher uniquement si activeProjectId !== null
if (!state.activeProjectId || state.logs.length === 0) {
  return null;
}
```

---

## ✅ Checklist de Migration

### PR 1 : Fusion Stores
- [ ] Supprimer `projects: Record<string, ProjectRuntime>` de `RuntimeState`
- [ ] Ajouter `status: ProjectStatus | null` à `RuntimeState`
- [ ] Ajouter `logs: string[]` à `RuntimeState`
- [ ] Ajouter `activeProjectPath: string | null` à `RuntimeState`
- [ ] Renommer `switching` → `commandInFlight`
- [ ] Supprimer `refreshStatus(projectId)`
- [ ] Supprimer `getProjectStatus(projectId)`
- [ ] Ajouter `refreshActiveStatus()` (sans paramètre)
- [ ] Ajouter `runGmd()` dans RuntimeProvider
- [ ] Ajouter `clearLogs()` dans RuntimeProvider
- [ ] Supprimer `GmdProvider` de `App.tsx`
- [ ] Supprimer `src/core/gmd/gmd.store.tsx`
- [ ] Modifier `GmdLogs.tsx` pour utiliser `useRuntime()`

### PR 2 : Neutraliser Polling
- [ ] Supprimer `projects.forEach(project => refreshStatus(project.id))` dans Dashboard
- [ ] Polling uniquement si `activeProjectId !== null`
- [ ] Appeler `refreshActiveStatus()` au lieu de `refreshStatus(projectId)`
- [ ] Modifier `ProjectSwitcher` pour n'afficher le statut que du projet actif
- [ ] Supprimer affichage de `state.projects[project.id]?.lastError`

### PR 3 : Switch Optimisé
- [ ] Modifier `switchProject` pour utiliser uniquement `activeProjectId`
- [ ] Implémenter logique stop A → start B avec `runGmdCommand(["down"], cwd)` puis `runGmdCommand(["up"], cwd)`
- [ ] Vider `logs` lors du stop/switch pour isoler par projet
- [ ] Tester switch entre projets
- [ ] Vérifier que les logs sont isolés (pas de mélange)

---

## 🎯 Résultat Attendu

**Avant** :
- ❌ État runtime pour chaque projet (`state.projects[projectId]`)
- ❌ Polling sur tous les projets toutes les 3 secondes
- ❌ Logs mélangés entre projets
- ❌ UI affiche le statut de tous les projets

**Après** :
- ✅ État runtime uniquement pour le projet actif (`state.status`, `state.logs`)
- ✅ Polling uniquement sur le projet actif
- ✅ Logs isolés par projet (vidés lors du switch)
- ✅ UI affiche le statut uniquement du projet actif
- ✅ Switch automatique : stop A → start B
- ✅ Mutex : une commande à la fois (`commandInFlight`)

---

**Statut** : ✅ Plan terminé - Prêt pour implémentation
