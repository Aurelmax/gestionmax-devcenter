# Plan de Refactorisation Multi-Projets - GMDF

## 📋 Analyse de l'Architecture Actuelle

### ✅ Points Forts
- Types bien définis (`ProjectV3`)
- Structure de données claire
- Composants UI séparés
- API Tauri fonctionnelle

### ⚠️ Problèmes Identifiés

#### 1. **État Global Mélangé**
- `Dashboard.tsx` gère directement `projects` et `active` avec `useState`
- Pas de contexte isolé pour le projet actif
- Logique métier dispersée dans les composants

#### 2. **Dépendances Implicites**
- Les services dépendent du projet actif mais ce n'est pas explicite
- `handleToggleEnabled` fait trop de choses (arrêt services, activation, etc.)
- Pas de séparation claire entre config, état runtime et logique métier

#### 3. **Hooks Multiples et Incohérents**
- `useProjects` (ancien format)
- `useServiceStatus` dans Dashboard
- Pas de hook centralisé pour le projet actif

#### 4. **Code Smell**
- Duplication de logique d'activation/désactivation
- Vérifications répétées `project.enabled !== false`
- Logique métier dans les composants UI

---

## 🎯 Architecture Cible

### Structure Proposée

```
src/
├── core/
│   ├── projects/
│   │   ├── project.types.ts          # Types étendus
│   │   ├── project.context.tsx       # Context React pour projet actif
│   │   ├── project.store.ts          # Store simple (useState + Context)
│   │   └── project.selectors.ts      # Sélecteurs pour accès aux données
│   ├── services/
│   │   ├── service.manager.ts         # Gestion des services par projet
│   │   └── tunnel.manager.ts         # Gestion des tunnels
│   └── state/
│       └── app.store.ts               # État global minimal (si nécessaire)
```

### Principes

1. **Un seul projet actif** à un instant T
2. **Services contextualisés** au projet actif
3. **Config isolée** par projet
4. **Logique métier** extraite dans des hooks/services

---

## 📝 Plan de Refactorisation Incrémentale

### Phase 1 : Créer l'Abstraction ProjectContext (Sans Casser)

**Objectif** : Introduire le contexte sans modifier les composants existants.

#### Étape 1.1 : Créer les types étendus

**Fichier** : `src/core/projects/project.types.ts`

```typescript
import { ProjectV3 } from "@/types/ProjectV3";

/**
 * État d'un service pour un projet
 */
export type ServiceState = "running" | "stopped" | "starting" | "stopping" | "error";

/**
 * État des services d'un projet
 */
export interface ProjectServicesState {
  backend: ServiceState;
  frontend: ServiceState;
  tunnel: ServiceState;
}

/**
 * Projet avec son état runtime
 */
export interface ProjectWithRuntime extends ProjectV3 {
  servicesState?: ProjectServicesState;
  lastUpdated?: number;
}

/**
 * Contexte du projet actif
 */
export interface ProjectContextValue {
  // Projet actif (un seul à la fois)
  activeProject: ProjectV3 | null;
  
  // Liste de tous les projets
  projects: ProjectV3[];
  
  // État de chargement
  isLoading: boolean;
  
  // Actions
  setActiveProject: (project: ProjectV3 | null) => void;
  activateProject: (projectId: string) => Promise<void>;
  deactivateProject: (projectId: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
  
  // Services du projet actif
  startService: (service: ServiceName) => Promise<void>;
  stopService: (service: ServiceName) => Promise<void>;
  getServiceStatus: (service: ServiceName) => ServiceState;
}
```

#### Étape 1.2 : Créer le Context et Provider

**Fichier** : `src/core/projects/project.context.tsx`

```typescript
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { ProjectV3 } from "@/types/ProjectV3";
import { loadProjectsV3, updateProjectV3 } from "@/lib/projectManager";
import { ProjectContextValue, ProjectWithRuntime } from "./project.types";
import { ServiceName } from "@/lib/commands";
import { startServiceV3, stopServiceV3, getServiceStatusV3 } from "@/lib/commands";
import { useToast } from "@/components/ui/use-toast";

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<ProjectV3[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectV3 | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Charger les projets depuis la config
  const refreshProjects = useCallback(async () => {
    try {
      const config = await loadProjectsV3();
      const projectList = config.projects || [];
      setProjects(projectList);
      
      // Trouver le projet actif
      const enabled = projectList.find(p => p.enabled) || projectList[0] || null;
      setActiveProject(enabled);
    } catch (error) {
      console.error("Failed to load projects:", error);
      setProjects([]);
      setActiveProject(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Charger au montage
  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  // Activer un projet (désactive les autres)
  const activateProject = useCallback(async (projectId: string) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      // 1. Désactiver tous les autres projets et arrêter leurs services
      for (const p of projects) {
        if (p.id !== projectId && p.enabled) {
          const updated = { ...p, enabled: false };
          await updateProjectV3(updated);
          
          // Arrêter les services
          if (p.backendPath?.trim()) {
            try {
              await stopServiceV3(p.id, "backend");
              await stopServiceV3(p.id, "tunnel");
            } catch (e) {
              console.warn(`Failed to stop services for ${p.name}:`, e);
            }
          }
          try {
            await stopServiceV3(p.id, "frontend");
          } catch (e) {
            console.warn(`Failed to stop frontend for ${p.name}:`, e);
          }
        }
      }

      // 2. Activer ce projet
      const updated = { ...project, enabled: true };
      await updateProjectV3(updated);
      setActiveProject(updated);
      
      // Rafraîchir la liste
      await refreshProjects();
      
      toast({
        title: "Projet activé",
        description: `Le projet "${project.name}" est maintenant actif.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'activer le projet",
        variant: "destructive",
      });
    }
  }, [projects, refreshProjects, toast]);

  // Désactiver un projet
  const deactivateProject = useCallback(async (projectId: string) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const updated = { ...project, enabled: false };
      await updateProjectV3(updated);
      
      // Arrêter les services
      if (project.backendPath?.trim()) {
        try {
          await stopServiceV3(project.id, "backend");
          await stopServiceV3(project.id, "tunnel");
        } catch (e) {
          console.warn(`Failed to stop services:`, e);
        }
      }
      try {
        await stopServiceV3(project.id, "frontend");
      } catch (e) {
        console.warn(`Failed to stop frontend:`, e);
      }

      // Si c'était le projet actif, le retirer
      if (activeProject?.id === projectId) {
        setActiveProject(null);
      }

      await refreshProjects();
      
      toast({
        title: "Projet désactivé",
        description: `Le projet "${project.name}" a été désactivé.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de désactiver le projet",
        variant: "destructive",
      });
    }
  }, [projects, activeProject, refreshProjects, toast]);

  // Démarrer un service du projet actif
  const startService = useCallback(async (service: ServiceName) => {
    if (!activeProject) {
      throw new Error("No active project");
    }
    if (!activeProject.enabled) {
      throw new Error("Active project is not enabled");
    }
    return startServiceV3(activeProject.id, service);
  }, [activeProject]);

  // Arrêter un service du projet actif
  const stopService = useCallback(async (service: ServiceName) => {
    if (!activeProject) {
      throw new Error("No active project");
    }
    return stopServiceV3(activeProject.id, service);
  }, [activeProject]);

  // Obtenir le statut d'un service
  const getServiceStatus = useCallback(async (service: ServiceName): Promise<"RUNNING" | "STOPPED"> => {
    if (!activeProject) {
      return "STOPPED";
    }
    return getServiceStatusV3(activeProject.id, service);
  }, [activeProject]);

  const value: ProjectContextValue = {
    activeProject,
    projects,
    isLoading,
    setActiveProject,
    activateProject,
    deactivateProject,
    refreshProjects,
    startService,
    stopService,
    getServiceStatus: async (service) => {
      const status = await getServiceStatus(service);
      return status === "RUNNING" ? "running" : "stopped";
    },
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

// Hook pour utiliser le contexte
export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjectContext must be used within ProjectProvider");
  }
  return context;
}
```

#### Étape 1.3 : Envelopper l'App avec le Provider

**Fichier** : `src/App.tsx` (modification minimale)

```typescript
// Ajouter l'import
import { ProjectProvider } from "./core/projects/project.context";

// Envelopper le contenu existant
function App() {
  return (
    <ProjectProvider>
      {/* Contenu existant inchangé */}
      <Router>
        {/* ... */}
      </Router>
    </ProjectProvider>
  );
}
```

**✅ Résultat Phase 1** : Le contexte existe mais n'est pas encore utilisé. Aucun breaking change.

---

### Phase 2 : Migrer Progressivement les Composants

#### Étape 2.1 : Créer un Hook pour le Projet Actif

**Fichier** : `src/core/projects/useActiveProject.ts`

```typescript
import { useProjectContext } from "./project.context";
import { ProjectV3 } from "@/types/ProjectV3";

/**
 * Hook simplifié pour accéder au projet actif
 */
export function useActiveProject() {
  const { activeProject, isLoading } = useProjectContext();
  return { project: activeProject, isLoading };
}

/**
 * Hook pour vérifier si un projet est actif
 */
export function useIsProjectActive(projectId: string): boolean {
  const { activeProject } = useProjectContext();
  return activeProject?.id === projectId;
}
```

#### Étape 2.2 : Créer un Hook pour les Services

**Fichier** : `src/core/services/useProjectServices.ts`

```typescript
import { useState, useEffect, useCallback } from "react";
import { useProjectContext } from "../projects/project.context";
import { ServiceName } from "@/lib/commands";
import { getServiceStatusV3 } from "@/lib/commands";
import { ServiceState } from "../projects/project.types";

const POLL_INTERVAL = 1500;

/**
 * Hook pour gérer les services d'un projet spécifique
 */
export function useProjectServices(projectId: string) {
  const [servicesState, setServicesState] = useState<Record<ServiceName, ServiceState>>({
    backend: "stopped",
    frontend: "stopped",
    tunnel: "stopped",
  });

  const refresh = useCallback(async () => {
    try {
      const [backend, frontend, tunnel] = await Promise.all([
        getServiceStatusV3(projectId, "backend"),
        getServiceStatusV3(projectId, "frontend"),
        getServiceStatusV3(projectId, "tunnel"),
      ]);

      setServicesState({
        backend: backend === "RUNNING" ? "running" : "stopped",
        frontend: frontend === "RUNNING" ? "running" : "stopped",
        tunnel: tunnel === "RUNNING" ? "running" : "stopped",
      });
    } catch (error) {
      console.error("Failed to refresh services:", error);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [refresh]);

  return { servicesState, refresh };
}

/**
 * Hook pour gérer les services du projet actif
 */
export function useActiveProjectServices() {
  const { activeProject, startService, stopService, getServiceStatus } = useProjectContext();
  
  const { servicesState, refresh } = useProjectServices(activeProject?.id || "");

  const handleStart = useCallback(async (service: ServiceName) => {
    if (!activeProject) return;
    await startService(service);
    setTimeout(refresh, 1000);
  }, [activeProject, startService, refresh]);

  const handleStop = useCallback(async (service: ServiceName) => {
    if (!activeProject) return;
    await stopService(service);
    setTimeout(refresh, 1000);
  }, [activeProject, stopService, refresh]);

  return {
    servicesState,
    startService: handleStart,
    stopService: handleStop,
    refresh,
  };
}
```

#### Étape 2.3 : Migrer Dashboard.tsx (Progressivement)

**Stratégie** : Remplacer progressivement les `useState` par le contexte.

**Fichier** : `src/pages/Dashboard.tsx` (modifications incrémentales)

```typescript
// AVANT (ligne 78-80)
const [projects, setProjects] = useState<ProjectV3[]>([]);
const [active, setActive] = useState<ProjectV3 | null>(null);

// APRÈS (remplacer par)
import { useProjectContext } from "@/core/projects/project.context";
const { projects, activeProject: active, refreshProjects: loadProjects } = useProjectContext();

// AVANT (ligne 189-212)
const loadProjects = useCallback(async () => {
  // ... logique existante
}, []);

// APRÈS (supprimer cette fonction, déjà dans le contexte)

// AVANT (ligne 215-289)
const handleToggleEnabled = async (project: ProjectV3) => {
  // ... logique complexe
};

// APRÈS (remplacer par)
import { useProjectContext } from "@/core/projects/project.context";
const { activateProject, deactivateProject } = useProjectContext();

const handleToggleEnabled = async (project: ProjectV3) => {
  if (project.enabled) {
    await deactivateProject(project.id);
  } else {
    await activateProject(project.id);
  }
};
```

**✅ Résultat Phase 2** : Dashboard utilise le contexte, code plus propre.

---

### Phase 3 : Extraire la Logique Métier

#### Étape 3.1 : Créer un Service Manager

**Fichier** : `src/core/services/service.manager.ts`

```typescript
import { ProjectV3 } from "@/types/ProjectV3";
import { ServiceName } from "@/lib/commands";
import { startServiceV3, stopServiceV3 } from "@/lib/commands";

/**
 * Gestionnaire de services pour un projet
 */
export class ServiceManager {
  constructor(private project: ProjectV3) {}

  /**
   * Démarrer tous les services applicables dans l'ordre
   */
  async startAll(): Promise<void> {
    const services: Array<{ name: ServiceName; runner: () => Promise<any> }> = [];
    
    // Tunnel uniquement si backend existe
    if (this.project.backendPath?.trim()) {
      services.push({
        name: "tunnel",
        runner: () => startServiceV3(this.project.id, "tunnel"),
      });
    }
    
    // Backend uniquement si configuré
    if (this.project.backendPath?.trim()) {
      services.push({
        name: "backend",
        runner: () => startServiceV3(this.project.id, "backend"),
      });
    }
    
    // Frontend toujours
    services.push({
      name: "frontend",
      runner: () => startServiceV3(this.project.id, "frontend"),
    });

    // Démarrer séquentiellement avec délai
    for (const service of services) {
      try {
        await service.runner();
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to start ${service.name}:`, error);
        // Continuer même si un service échoue
      }
    }
  }

  /**
   * Arrêter tous les services
   */
  async stopAll(): Promise<void> {
    const services: ServiceName[] = ["frontend"];
    
    if (this.project.backendPath?.trim()) {
      services.push("backend", "tunnel");
    }

    await Promise.all(
      services.map(service => 
        stopServiceV3(this.project.id, service).catch(err => 
          console.warn(`Failed to stop ${service}:`, err)
        )
      )
    );
  }

  /**
   * Démarrer un service spécifique
   */
  async start(service: ServiceName): Promise<void> {
    if (!this.project.enabled) {
      throw new Error("Project is not enabled");
    }
    await startServiceV3(this.project.id, service);
  }

  /**
   * Arrêter un service spécifique
   */
  async stop(service: ServiceName): Promise<void> {
    await stopServiceV3(this.project.id, service);
  }
}
```

#### Étape 3.2 : Utiliser le Service Manager dans le Contexte

**Modifier** : `src/core/projects/project.context.tsx`

```typescript
import { ServiceManager } from "../services/service.manager";

// Dans ProjectContextValue, ajouter :
startAllServices: () => Promise<void>;
stopAllServices: () => Promise<void>;

// Dans le Provider :
const startAllServices = useCallback(async () => {
  if (!activeProject) return;
  const manager = new ServiceManager(activeProject);
  await manager.startAll();
  await refreshProjects();
}, [activeProject, refreshProjects]);

const stopAllServices = useCallback(async () => {
  if (!activeProject) return;
  const manager = new ServiceManager(activeProject);
  await manager.stopAll();
  await refreshProjects();
}, [activeProject, refreshProjects]);
```

---

### Phase 4 : Nettoyer et Optimiser

#### Étape 4.1 : Supprimer le Code Dupliqué

- Supprimer `useProjects` (ancien format) si non utilisé
- Supprimer les `useState` dupliqués dans Dashboard
- Centraliser la logique d'activation/désactivation

#### Étape 4.2 : Ajouter des Sélecteurs

**Fichier** : `src/core/projects/project.selectors.ts`

```typescript
import { ProjectV3 } from "@/types/ProjectV3";

/**
 * Sélecteurs pour accéder aux données des projets
 */
export const projectSelectors = {
  /**
   * Obtenir un projet par ID
   */
  getById: (projects: ProjectV3[], id: string): ProjectV3 | undefined => {
    return projects.find(p => p.id === id);
  },

  /**
   * Obtenir le projet actif
   */
  getActive: (projects: ProjectV3[]): ProjectV3 | undefined => {
    return projects.find(p => p.enabled);
  },

  /**
   * Vérifier si un projet est actif
   */
  isActive: (project: ProjectV3): boolean => {
    return project.enabled === true;
  },

  /**
   * Obtenir les projets inactifs
   */
  getInactive: (projects: ProjectV3[]): ProjectV3[] => {
    return projects.filter(p => !p.enabled);
  },
};
```

---

## 📊 Checklist de Migration

### Phase 1 : Infrastructure ✅
- [ ] Créer `src/core/projects/project.types.ts`
- [ ] Créer `src/core/projects/project.context.tsx`
- [ ] Envelopper `App.tsx` avec `ProjectProvider`
- [ ] Tester que l'app fonctionne toujours (aucun changement visible)

### Phase 2 : Migration Composants
- [ ] Créer `src/core/projects/useActiveProject.ts`
- [ ] Créer `src/core/services/useProjectServices.ts`
- [ ] Migrer `Dashboard.tsx` pour utiliser le contexte
- [ ] Tester que Dashboard fonctionne toujours

### Phase 3 : Logique Métier
- [ ] Créer `src/core/services/service.manager.ts`
- [ ] Intégrer ServiceManager dans le contexte
- [ ] Migrer la logique de démarrage/arrêt dans Dashboard
- [ ] Tester les actions Start/Stop

### Phase 4 : Nettoyage
- [ ] Supprimer code dupliqué
- [ ] Créer `src/core/projects/project.selectors.ts`
- [ ] Optimiser les re-renders
- [ ] Documentation

---

## 🎯 Résultat Attendu

### Avant
```typescript
// Dashboard.tsx - État dispersé
const [projects, setProjects] = useState<ProjectV3[]>([]);
const [active, setActive] = useState<ProjectV3 | null>(null);
// Logique métier dans le composant
const handleToggleEnabled = async (project) => {
  // 50+ lignes de logique complexe
};
```

### Après
```typescript
// Dashboard.tsx - Utilise le contexte
const { projects, activeProject, activateProject, deactivateProject } = useProjectContext();
const handleToggleEnabled = async (project) => {
  if (project.enabled) {
    await deactivateProject(project.id);
  } else {
    await activateProject(project.id);
  }
};
```

---

## ⚠️ Points d'Attention

1. **Migration Progressive** : Ne pas tout changer d'un coup
2. **Tests à Chaque Étape** : Vérifier que l'UI fonctionne toujours
3. **Rétrocompatibilité** : Garder l'ancien code jusqu'à ce que le nouveau soit validé
4. **Pas de Breaking Changes** : L'API publique reste la même

---

## 📝 Notes Techniques

- **Pas de Zustand/Redux** : On utilise React Context + useState (simple et suffisant)
- **Polling Conservé** : Les hooks existants continuent de poller
- **Types Stricts** : TypeScript pour éviter les erreurs
- **Hooks Réutilisables** : `useActiveProject`, `useProjectServices` peuvent être utilisés partout

---

## 🚀 Prochaines Étapes

1. Commencer par Phase 1 (infrastructure)
2. Tester que tout fonctionne
3. Migrer progressivement les composants
4. Nettoyer le code obsolète
