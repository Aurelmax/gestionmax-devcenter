import React, { createContext, useContext, useState, useCallback } from "react";
import { RuntimeState, RuntimeContextValue, ProjectStatus, GmdResult } from "./runtime.types";
import { switchProject as switchProjectImpl } from "./switchProject";
import { runGmdCommand } from "@/lib/commands";
import { invoke } from "@tauri-apps/api/core";
import { ProjectV3 } from "@/types/ProjectV3";

const RuntimeContext = createContext<RuntimeContextValue | null>(null);

interface RuntimeProviderProps {
  children: React.ReactNode;
  projects: ProjectV3[];
}

/**
 * Provider pour gérer l'état runtime (mono-projet)
 * 
 * Modèle "Single Active Project" :
 * - Un seul projet actif à la fois
 * - Status, logs, commandes concernent uniquement le projet actif
 * - Verrou mutex pour empêcher les commandes concurrentes
 */
export function RuntimeProvider({ children, projects }: RuntimeProviderProps) {
  const [state, setState] = useState<RuntimeState>({
    activeProjectId: null,
    activeProjectPath: null,
    status: null,
    logs: [],
    commandInFlight: false,
  });

  /**
   * Fonction atomique pour switcher de projet
   * 
   * Règle : 1 seul projet RUNNING à la fois
   * - Si un projet est actif : Stop A → Start B
   * - Sinon : Start/Stop selon état
   */
  const switchProject = useCallback(async (projectId: string) => {
    // Vérifier le verrou mutex
    if (state.commandInFlight) {
      console.warn("Command already in progress, ignoring");
      return;
    }

    setState(prev => ({ ...prev, commandInFlight: true }));

    try {
      await switchProjectImpl(projectId, state, setState, projects);
    } catch (error) {
      console.error("Failed to switch project:", error);
      throw error;
    } finally {
      setState(prev => ({ ...prev, commandInFlight: false }));
    }
  }, [state, projects]);

  /**
   * Rafraîchir le statut du projet actif uniquement
   * 
   * Utilise gmdev status pour obtenir le statut réel du projet actif
   */
  const refreshActiveStatus = useCallback(async () => {
    if (!state.activeProjectId || !state.activeProjectPath) {
      setState(prev => ({ ...prev, status: null }));
      return;
    }

    const project = projects.find(p => p.id === state.activeProjectId);
    if (!project) {
      setState(prev => ({ ...prev, status: null }));
      return;
    }

    try {
      // Utiliser gmdev status au lieu de getServiceStatusV3
      const result = await runGmdCommand(["status"], undefined, project.rootPath);
      
      // Parser le résultat (simplifié)
      const output = result.stdout.toLowerCase();
      const isRunning = output.includes("running") || output.includes("active");
      const status: ProjectStatus = isRunning ? "RUNNING" : "STOPPED";
      
      setState(prev => ({ ...prev, status }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        status: "ERROR",
        logs: [
          ...prev.logs,
          `[${new Date().toLocaleTimeString()}] ERREUR refresh: ${error instanceof Error ? error.message : String(error)}`,
        ].slice(-100),
      }));
    }
  }, [state.activeProjectId, state.activeProjectPath, projects]);

  /**
   * Exécuter une commande gmdev
   * 
   * Centralise l'exécution des commandes gmdev avec :
   * - Verrou mutex pour éviter les commandes concurrentes
   * - Gestion des logs (isolés par projet actif)
   * - Utilisation du cwd du projet actif si non spécifié
   */
  const runGmd = useCallback(async (
    args: string[],
    options?: { cwd?: string }
  ): Promise<GmdResult> => {
    // Verrou mutex : empêcher les commandes concurrentes
    if (state.commandInFlight) {
      throw new Error("Une commande est déjà en cours d'exécution");
    }

    setState(prev => ({ ...prev, commandInFlight: true }));

    try {
      // Utiliser cwd depuis options ou depuis le state (projet actif)
      const cwd = options?.cwd || state.activeProjectPath || undefined;
      const projectId = state.activeProjectId || undefined;

      // Appeler la commande Tauri
      const result = await invoke<GmdResult>("run_gmd_command", {
        args,
        projectId,
        cwd,
      });

      // Ajouter aux logs (isolés par projet actif)
      setState(prev => ({
        ...prev,
        logs: [
          ...prev.logs,
          `[${new Date().toLocaleTimeString()}] gmdev ${args.join(" ")}${projectId ? ` ${projectId}` : ""}`,
          result.stdout,
          result.stderr,
        ]
          .filter(Boolean)
          .slice(-100), // Garder seulement les 100 dernières lignes
      }));

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Ajouter l'erreur aux logs
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

  /**
   * Effacer les logs du projet actif
   */
  const clearLogs = useCallback(() => {
    setState(prev => ({ ...prev, logs: [] }));
  }, []);

  const value: RuntimeContextValue = {
    state,
    switchProject,
    refreshActiveStatus,
    runGmd,
    clearLogs,
  };

  return (
    <RuntimeContext.Provider value={value}>
      {children}
    </RuntimeContext.Provider>
  );
}

/**
 * Hook pour utiliser le contexte runtime
 * 
 * @throws {Error} Si utilisé en dehors d'un RuntimeProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { switchProject, state } = useRuntime();
 *   const status = state.status; // Statut du projet actif uniquement
 *   return <button onClick={() => switchProject('my-project')}>Switch</button>;
 * }
 * ```
 */
export function useRuntime() {
  const context = useContext(RuntimeContext);
  if (!context) {
    throw new Error("useRuntime must be used within RuntimeProvider");
  }
  return context;
}
