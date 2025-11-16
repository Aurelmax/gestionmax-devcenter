import { useState, useEffect, useCallback } from "react";
import {
  listProjects,
  checkProjectStatus,
  startProjectService,
  stopProjectService,
} from "@/lib/projects";
import { ProjectWithStatus } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";

const POLL_INTERVAL = 2000; // 2 secondes

export function useProjects() {
  const [projects, setProjects] = useState<ProjectWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProjects = useCallback(async () => {
    try {
      const projectsList = await listProjects();
      const projectsWithStatus: ProjectWithStatus[] = await Promise.all(
        projectsList.map(async (project) => {
          const servicesStatus = await checkProjectStatus(project.path);
          return {
            ...project,
            servicesStatus,
          };
        })
      );
      setProjects(projectsWithStatus);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      toast({
        title: "Erreur",
        description: `Impossible de charger les projets: ${errorMsg}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProjects();
    const interval = setInterval(fetchProjects, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchProjects]);

  const startService = useCallback(
    async (projectPath: string, serviceName: string, command: string) => {
      try {
        await startProjectService(projectPath, serviceName, command);
        toast({
          title: "Service démarré",
          description: `Le service ${serviceName} a été démarré avec succès.`,
        });
        // Rafraîchir après un court délai
        setTimeout(fetchProjects, 1000);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        toast({
          title: "Erreur",
          description: `Impossible de démarrer le service: ${errorMsg}`,
          variant: "destructive",
        });
      }
    },
    [fetchProjects, toast]
  );

  const stopService = useCallback(
    async (projectPath: string, serviceName: string, port: number) => {
      try {
        await stopProjectService(projectPath, serviceName, port);
        toast({
          title: "Service arrêté",
          description: `Le service ${serviceName} a été arrêté avec succès.`,
        });
        // Rafraîchir après un court délai
        setTimeout(fetchProjects, 1000);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        toast({
          title: "Erreur",
          description: `Impossible d'arrêter le service: ${errorMsg}`,
          variant: "destructive",
        });
      }
    },
    [fetchProjects, toast]
  );

  return {
    projects,
    isLoading,
    error,
    refetch: fetchProjects,
    startService,
    stopService,
  };
}

