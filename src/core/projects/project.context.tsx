import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { ProjectV3 } from "@/types/ProjectV3";
import { loadProjectsV3, updateProjectV3 } from "@/lib/projectManager";
import { ProjectContextValue, ServiceState } from "./project.types";
import { ServiceName } from "@/lib/commands";
import { startServiceV3, stopServiceV3, getServiceStatusV3 } from "@/lib/commands";
import { useToast } from "@/components/ui/use-toast";

const ProjectContext = createContext<ProjectContextValue | null>(null);

/**
 * Provider pour gérer l'état des projets et le projet actif
 */
export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<ProjectV3[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectV3 | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Charger les projets depuis la config
  const refreshProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const config = await loadProjectsV3();
      const projectList = config.projects || [];
      setProjects(projectList);
      
      // Trouver le projet actif (celui avec enabled=true ou le premier)
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

  // Activer un projet (désactive automatiquement les autres)
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
          
          // Arrêter les services de ce projet
          if (p.backendPath?.trim()) {
            try {
              await stopServiceV3(p.id, "backend");
              await stopServiceV3(p.id, "tunnel");
            } catch (e) {
              console.warn(`Failed to stop backend/tunnel for ${p.name}:`, e);
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
      
      // Rafraîchir la liste pour avoir les données à jour
      await refreshProjects();
      
      toast({
        title: "Projet activé",
        description: `Le projet "${project.name}" est maintenant actif. Les autres projets ont été désactivés.`,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Erreur",
        description: `Impossible d'activer le projet: ${errorMsg}`,
        variant: "destructive",
      });
      throw error;
    }
  }, [projects, refreshProjects, toast]);

  // Désactiver un projet
  const deactivateProject = useCallback(async (projectId: string) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const updated = { ...project, enabled: false };
      await updateProjectV3(updated);
      
      // Arrêter les services de ce projet
      if (project.backendPath?.trim()) {
        try {
          await stopServiceV3(project.id, "backend");
          await stopServiceV3(project.id, "tunnel");
        } catch (e) {
          console.warn(`Failed to stop backend/tunnel:`, e);
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
        description: `Le projet "${project.name}" a été désactivé et ses services arrêtés.`,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Erreur",
        description: `Impossible de désactiver le projet: ${errorMsg}`,
        variant: "destructive",
      });
      throw error;
    }
  }, [projects, activeProject, refreshProjects, toast]);

  // Démarrer un service du projet actif
  const startService = useCallback(async (service: ServiceName) => {
    if (!activeProject) {
      throw new Error("No active project");
    }
    if (activeProject.enabled !== true) {
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
  const getServiceStatus = useCallback(async (service: ServiceName): Promise<ServiceState> => {
    if (!activeProject) {
      return "stopped";
    }
    try {
      const status = await getServiceStatusV3(activeProject.id, service);
      return status === "RUNNING" ? "running" : "stopped";
    } catch (error) {
      console.error(`Failed to get status for ${service}:`, error);
      return "error";
    }
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
    getServiceStatus,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

/**
 * Hook pour utiliser le contexte des projets
 * 
 * @throws {Error} Si utilisé en dehors d'un ProjectProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { activeProject, activateProject } = useProjectContext();
 *   return <button onClick={() => activateProject('my-project')}>Activer</button>;
 * }
 * ```
 */
export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjectContext must be used within ProjectProvider");
  }
  return context;
}
