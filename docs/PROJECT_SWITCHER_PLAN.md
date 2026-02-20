# Plan de Refactorisation : Project Switcher Simple

## 🎯 Objectif UX

**Interaction ultra simple** : "J'appuie sur un bouton, je change de projet"

- Liste de projets avec bouton Start/Stop par projet
- 1 seul projet RUNNING à la fois
- Switch automatique : Stop A → Start B
- Indication claire du projet actif
- Logs de la session active

---

## 📊 Audit du Code Actuel

### Problèmes Identifiés

#### 1. **État Mélangé dans Dashboard.tsx**
```typescript
// Ligne 79-80 : État local non synchronisé
const [projects, setProjects] = useState<ProjectV3[]>([]);
const [active, setActive] = useState<ProjectV3 | null>(null);

// Ligne 199 : Logique de sélection du projet actif
const activeProject = projectList.find(p => p.enabled) || projectList[0];
```

**Problème** : `enabled` dans ProjectV3 + `active` dans Dashboard = état dupliqué

#### 2. **Logique Complexe dans handleToggleEnabled**
```typescript
// Ligne 215-289 : 70+ lignes de logique mélangée
const handleToggleEnabled = async (project: ProjectV3) => {
  // Désactiver tous les autres projets
  // Arrêter leurs services
  // Activer ce projet
  // Gérer les erreurs
  // ...
}
```

**Problème** : Pas atomique, pas de verrou, logique dispersée

#### 3. **ProjectContext Existant mais Non Utilisé**
- `ProjectContext` existe déjà (`src/core/projects/project.context.tsx`)
- Dashboard ne l'utilise pas encore
- Logique d'activation/désactivation déjà implémentée mais complexe

#### 4. **Pas de Verrou (Mutex)**
- Rien n'empêche les doubles clics
- Rien n'empêche les races (switch pendant qu'un autre est en cours)

---

## 🏗️ Architecture Cible

### Modèle Simple

```typescript
// RuntimeState global
interface RuntimeState {
  activeProjectId: string | null;
  projects: Record<string, {
    status: "STOPPED" | "STARTING" | "RUNNING" | "STOPPING" | "ERROR";
    lastError?: string;
    logs?: string[];
  }>;
  switching: boolean; // Verrou pour empêcher les races
}

// Fonction atomique
async function switchProject(targetProjectId: string): Promise<void> {
  // 1. Vérifier le verrou
  // 2. Si activeProjectId != null et != targetProjectId:
  //    - Stop activeProjectId
  //    - Start targetProjectId
  // 3. Sinon:
  //    - Start/Stop selon état actuel
  // 4. Libérer le verrou
}
```

---

## 📝 Plan en 3 Étapes

### Étape 1 : RuntimeState + switchProject Atomique

**Objectif** : Créer le modèle simple et la fonction atomique

**Fichiers à créer** :
- `src/core/runtime/runtime.types.ts` - Types pour RuntimeState
- `src/core/runtime/runtime.store.ts` - Store simple avec useState + Context
- `src/core/runtime/switchProject.ts` - Fonction atomique avec verrou

**Fichiers à modifier** :
- Aucun (ajout seulement)

**Tests** :
- ✅ Compilation TypeScript
- ✅ Fonction switchProject isolée testable

---

### Étape 2 : Intégrer dans Dashboard

**Objectif** : Remplacer la logique complexe par switchProject

**Fichiers à modifier** :
- `src/pages/Dashboard.tsx`
  - Remplacer `handleToggleEnabled` par `switchProject`
  - Utiliser RuntimeState pour afficher les statuts
  - Simplifier l'affichage : liste + bouton Start/Stop

**Fichiers à créer** :
- `src/components/ProjectSwitcher.tsx` - Composant liste de projets avec boutons

**Tests** :
- ✅ Switch entre projets fonctionne
- ✅ Stop A → Start B automatique
- ✅ Verrou empêche les doubles clics

---

### Étape 3 : Nettoyer et Neutraliser

**Objectif** : Supprimer/neutraliser la complexité multi-projets

**Fichiers à modifier** :
- `src/core/projects/project.context.tsx` - Simplifier ou neutraliser
- `src/pages/Dashboard.tsx` - Supprimer code obsolète
- `src/types/ProjectV3.ts` - Optionnel : rendre `enabled` optionnel (non utilisé)

**Tests** :
- ✅ Aucune régression
- ✅ Code plus simple et maintenable

---

## 🔧 Implémentation Détaillée

### Étape 1 : RuntimeState + switchProject

#### Fichier : `src/core/runtime/runtime.types.ts`

```typescript
export type ProjectStatus = "STOPPED" | "STARTING" | "RUNNING" | "STOPPING" | "ERROR";

export interface ProjectRuntime {
  status: ProjectStatus;
  lastError?: string;
  logs?: string[];
  lastUpdated?: number;
}

export interface RuntimeState {
  activeProjectId: string | null;
  projects: Record<string, ProjectRuntime>;
  switching: boolean; // Verrou mutex
}

export interface RuntimeContextValue {
  state: RuntimeState;
  switchProject: (projectId: string) => Promise<void>;
  refreshStatus: (projectId: string) => Promise<void>;
  getProjectStatus: (projectId: string) => ProjectStatus;
}
```

#### Fichier : `src/core/runtime/runtime.store.ts`

```typescript
import { createContext, useContext, useState, useCallback } from "react";
import { RuntimeState, RuntimeContextValue, ProjectStatus } from "./runtime.types";
import { switchProject as switchProjectImpl } from "./switchProject";
import { getServiceStatusV3 } from "@/lib/commands";
import { ProjectV3 } from "@/types/ProjectV3";

const RuntimeContext = createContext<RuntimeContextValue | null>(null);

export function RuntimeProvider({ 
  children,
  projects 
}: { 
  children: React.ReactNode;
  projects: ProjectV3[];
}) {
  const [state, setState] = useState<RuntimeState>({
    activeProjectId: null,
    projects: {},
    switching: false,
  });

  const switchProject = useCallback(async (projectId: string) => {
    if (state.switching) {
      console.warn("Switch already in progress, ignoring");
      return;
    }

    setState(prev => ({ ...prev, switching: true }));

    try {
      await switchProjectImpl(projectId, state, setState, projects);
    } finally {
      setState(prev => ({ ...prev, switching: false }));
    }
  }, [state, projects]);

  const refreshStatus = useCallback(async (projectId: string) => {
    // Poller le statut réel des services
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    try {
      const [backend, frontend, tunnel] = await Promise.all([
        getServiceStatusV3(projectId, "backend").catch(() => "STOPPED"),
        getServiceStatusV3(projectId, "frontend").catch(() => "STOPPED"),
        getServiceStatusV3(projectId, "tunnel").catch(() => "STOPPED"),
      ]);

      const isRunning = backend === "RUNNING" || frontend === "RUNNING" || tunnel === "RUNNING";
      const status: ProjectStatus = isRunning ? "RUNNING" : "STOPPED";

      setState(prev => ({
        ...prev,
        projects: {
          ...prev.projects,
          [projectId]: {
            ...prev.projects[projectId],
            status,
            lastUpdated: Date.now(),
          },
        },
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        projects: {
          ...prev.projects,
          [projectId]: {
            status: "ERROR",
            lastError: error instanceof Error ? error.message : String(error),
            lastUpdated: Date.now(),
          },
        },
      }));
    }
  }, [projects]);

  const getProjectStatus = useCallback((projectId: string): ProjectStatus => {
    return state.projects[projectId]?.status || "STOPPED";
  }, [state]);

  const value: RuntimeContextValue = {
    state,
    switchProject,
    refreshStatus,
    getProjectStatus,
  };

  return (
    <RuntimeContext.Provider value={value}>
      {children}
    </RuntimeContext.Provider>
  );
}

export function useRuntime() {
  const context = useContext(RuntimeContext);
  if (!context) {
    throw new Error("useRuntime must be used within RuntimeProvider");
  }
  return context;
}
```

#### Fichier : `src/core/runtime/switchProject.ts`

```typescript
import { RuntimeState } from "./runtime.types";
import { ProjectV3 } from "@/types/ProjectV3";
import { startServiceV3, stopServiceV3 } from "@/lib/commands";

/**
 * Fonction atomique pour switcher de projet
 * 
 * Règle : 1 seul projet RUNNING à la fois
 * - Si un projet est actif et différent : Stop A → Start B
 * - Sinon : Start/Stop selon état actuel
 */
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

  // Cas 1 : Le projet cible est déjà RUNNING → Stop
  if (currentStatus === "RUNNING" && activeProjectId === targetProjectId) {
    await stopProject(targetProjectId, targetProject, setState);
    setState(prev => ({ ...prev, activeProjectId: null }));
    return;
  }

  // Cas 2 : Un autre projet est actif → Stop A puis Start B
  if (activeProjectId && activeProjectId !== targetProjectId) {
    const activeProject = projects.find(p => p.id === activeProjectId);
    if (activeProject) {
      // Mettre à jour le statut
      setState(prev => ({
        ...prev,
        projects: {
          ...prev.projects,
          [activeProjectId]: {
            ...prev.projects[activeProjectId],
            status: "STOPPING",
          },
        },
      }));

      // Arrêter le projet actif
      await stopProject(activeProjectId, activeProject, setState);
    }
  }

  // Cas 3 : Démarrer le projet cible
  await startProject(targetProjectId, targetProject, setState);
  setState(prev => ({ ...prev, activeProjectId: targetProjectId }));
}

async function startProject(
  projectId: string,
  project: ProjectV3,
  setState: React.Dispatch<React.SetStateAction<RuntimeState>>
): Promise<void> {
  setState(prev => ({
    ...prev,
    projects: {
      ...prev.projects,
      [projectId]: {
        status: "STARTING",
        lastUpdated: Date.now(),
      },
    },
  }));

  try {
    const services: Array<{ name: string; runner: () => Promise<any> }> = [];

    // Tunnel uniquement si backend existe
    if (project.backendPath?.trim()) {
      services.push({
        name: "tunnel",
        runner: () => startServiceV3(projectId, "tunnel"),
      });
    }

    // Backend uniquement si configuré
    if (project.backendPath?.trim()) {
      services.push({
        name: "backend",
        runner: () => startServiceV3(projectId, "backend"),
      });
    }

    // Frontend toujours
    services.push({
      name: "frontend",
      runner: () => startServiceV3(projectId, "frontend"),
    });

    // Démarrer séquentiellement
    for (const service of services) {
      try {
        await service.runner();
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to start ${service.name}:`, error);
      }
    }

    setState(prev => ({
      ...prev,
      projects: {
        ...prev.projects,
        [projectId]: {
          status: "RUNNING",
          lastUpdated: Date.now(),
        },
      },
    }));
  } catch (error) {
    setState(prev => ({
      ...prev,
      projects: {
        ...prev.projects,
        [projectId]: {
          status: "ERROR",
          lastError: error instanceof Error ? error.message : String(error),
          lastUpdated: Date.now(),
        },
      },
    }));
    throw error;
  }
}

async function stopProject(
  projectId: string,
  project: ProjectV3,
  setState: React.Dispatch<React.SetStateAction<RuntimeState>>
): Promise<void> {
  setState(prev => ({
    ...prev,
    projects: {
      ...prev.projects,
      [projectId]: {
        status: "STOPPING",
        lastUpdated: Date.now(),
      },
    },
  }));

  try {
    const services: string[] = ["frontend"];
    if (project.backendPath?.trim()) {
      services.push("backend", "tunnel");
    }

    await Promise.all(
      services.map(service =>
        stopServiceV3(projectId, service as any).catch(err =>
          console.warn(`Failed to stop ${service}:`, err)
        )
      )
    );

    setState(prev => ({
      ...prev,
      projects: {
        ...prev.projects,
        [projectId]: {
          status: "STOPPED",
          lastUpdated: Date.now(),
        },
      },
    }));
  } catch (error) {
    setState(prev => ({
      ...prev,
      projects: {
        ...prev.projects,
        [projectId]: {
          status: "ERROR",
          lastError: error instanceof Error ? error.message : String(error),
          lastUpdated: Date.now(),
        },
      },
    }));
  }
}
```

---

### Étape 2 : Intégrer dans Dashboard

#### Composant : `src/components/ProjectSwitcher.tsx`

```typescript
import { ProjectV3 } from "@/types/ProjectV3";
import { useRuntime } from "@/core/runtime/runtime.store";
import { Loader2 } from "lucide-react";

interface ProjectSwitcherProps {
  projects: ProjectV3[];
}

export function ProjectSwitcher({ projects }: ProjectSwitcherProps) {
  const { state, switchProject, getProjectStatus } = useRuntime();

  return (
    <div className="space-y-3">
      {projects.map(project => {
        const status = getProjectStatus(project.id);
        const isActive = state.activeProjectId === project.id;
        const isLoading = status === "STARTING" || status === "STOPPING";
        const isRunning = status === "RUNNING";

        return (
          <div
            key={project.id}
            className={`p-4 rounded-lg border ${
              isActive ? "border-blue-500 bg-blue-900/20" : "border-gray-700 bg-gray-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">{project.name}</h3>
                <p className="text-sm text-gray-400">{project.rootPath}</p>
              </div>
              <div className="flex items-center gap-3">
                {isActive && (
                  <span className="px-2 py-1 text-xs rounded-full bg-green-600 text-white">
                    ACTIF
                  </span>
                )}
                <span className={`px-2 py-1 text-xs rounded-full ${
                  status === "RUNNING" ? "bg-green-600" :
                  status === "STARTING" || status === "STOPPING" ? "bg-yellow-600" :
                  status === "ERROR" ? "bg-red-600" :
                  "bg-gray-600"
                } text-white`}>
                  {status}
                </span>
                <button
                  onClick={() => switchProject(project.id)}
                  disabled={isLoading || state.switching}
                  className={`px-4 py-2 rounded font-medium ${
                    isRunning
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  } disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {status === "STARTING" ? "Démarrage..." : "Arrêt..."}
                    </>
                  ) : (
                    isRunning ? "Stop" : "Start"
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

#### Modifier Dashboard.tsx

```typescript
// Remplacer handleToggleEnabled par :
const { switchProject } = useRuntime();

// Simplifier l'affichage :
<ProjectSwitcher projects={projects} />
```

---

### Étape 3 : Nettoyer

- Supprimer `handleToggleEnabled` dans Dashboard
- Neutraliser `ProjectContext` (ou le garder pour compatibilité)
- Optionnel : Rendre `enabled` optionnel dans ProjectV3

---

## ✅ Checklist de Validation

### Étape 1
- [ ] Types créés
- [ ] RuntimeStore créé
- [ ] switchProject implémenté avec verrou
- [ ] Compilation TypeScript OK

### Étape 2
- [ ] ProjectSwitcher créé
- [ ] Dashboard utilise switchProject
- [ ] Switch A → B fonctionne
- [ ] Verrou empêche doubles clics
- [ ] UI claire (bouton Start/Stop)

### Étape 3
- [ ] Code obsolète supprimé
- [ ] Aucune régression
- [ ] Tests manuels OK

---

## 📊 Résultat Attendu

**Avant** :
- Dashboard.tsx : ~830 lignes
- Logique complexe dispersée
- Pas de verrou
- État dupliqué

**Après** :
- Dashboard.tsx : ~400 lignes (-50%)
- Fonction atomique `switchProject`
- Verrou mutex
- État centralisé dans RuntimeState

---

## 🚀 Prochaine Action

**Créer les fichiers de l'Étape 1** :
1. `src/core/runtime/runtime.types.ts`
2. `src/core/runtime/runtime.store.ts`
3. `src/core/runtime/switchProject.ts`

Ensuite intégrer dans `App.tsx` et tester.
