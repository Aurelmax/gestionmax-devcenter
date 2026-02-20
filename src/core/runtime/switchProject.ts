import { RuntimeState, ProjectStatus } from "./runtime.types";
import { ProjectV3 } from "@/types/ProjectV3";
import { runGmdCommand } from "@/lib/commands";

/**
 * Fonction atomique pour switcher de projet
 * 
 * Règle : 1 seul projet RUNNING à la fois
 * - Si un projet est actif et différent : Stop A → Start B
 * - Si le projet cible est déjà RUNNING : Stop
 * - Sinon : Start le projet cible
 * 
 * @param targetProjectId - ID du projet cible
 * @param currentState - État actuel du runtime
 * @param setState - Fonction pour mettre à jour l'état
 * @param projects - Liste de tous les projets
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
        logs: [], // Isoler logs : vider lors du stop
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
        logs: [], // Isoler logs : vider lors du switch
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

