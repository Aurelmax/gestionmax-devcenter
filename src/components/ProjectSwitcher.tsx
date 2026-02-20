import { ProjectV3 } from "@/types/ProjectV3";
import { useRuntime } from "@/core/runtime/runtime.store";
import { Loader2 } from "lucide-react";

interface ProjectSwitcherProps {
  projects: ProjectV3[];
}

/**
 * Composant simple pour switcher entre projets
 * 
 * UX : Liste de projets avec bouton Start/Stop
 * Règle : 1 seul projet RUNNING à la fois
 */
export function ProjectSwitcher({ projects }: ProjectSwitcherProps) {
  const { state, switchProject } = useRuntime();

  return (
    <div className="space-y-3">
      {projects.map(project => {
        const isActive = state.activeProjectId === project.id;
        // Statut uniquement pour le projet actif, sinon STOPPED par défaut
        const status = isActive ? (state.status || "STOPPED") : "STOPPED";
        const isLoading = isActive && (status === "STARTING" || status === "STOPPING");
        const isRunning = isActive && status === "RUNNING";
        const isError = isActive && status === "ERROR";

        return (
          <div
            key={project.id}
            className={`p-4 rounded-lg border transition-colors ${
              isActive
                ? "border-blue-500 bg-blue-900/20"
                : "border-gray-700 bg-gray-900 hover:border-gray-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white">{project.name}</h3>
                  {isActive && (
                    <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-blue-600 text-white">
                      ACTIF
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 truncate">{project.rootPath}</p>
                {project.backendType && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded bg-gray-700 text-gray-300">
                    {project.backendType === "payload" ? "Payload" : "Directus"}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-3 ml-4">
                {/* Badge de statut */}
                <span
                  className={`px-3 py-1 text-xs rounded-full font-medium ${
                    status === "RUNNING"
                      ? "bg-green-600 text-white"
                      : status === "STARTING" || status === "STOPPING"
                      ? "bg-yellow-600 text-white"
                      : status === "ERROR"
                      ? "bg-red-600 text-white"
                      : "bg-gray-600 text-gray-300"
                  }`}
                >
                  {status}
                </span>

                {/* Bouton Start/Stop */}
                <button
                  onClick={() => switchProject(project.id)}
                  disabled={isLoading || state.commandInFlight}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    isRunning
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  } disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
                  title={
                    isLoading
                      ? status === "STARTING"
                        ? "Démarrage en cours..."
                        : "Arrêt en cours..."
                      : state.commandInFlight
                      ? "Commande en cours..."
                      : isRunning
                      ? "Arrêter ce projet"
                      : "Démarrer ce projet"
                  }
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

            {/* Message d'erreur si présent (uniquement pour projet actif) */}
            {isError && isActive && (
              <div className="mt-2 p-2 rounded bg-red-900/20 border border-red-500/30">
                <p className="text-xs text-red-300">
                  Erreur lors du démarrage/arrêt du projet
                </p>
              </div>
            )}
          </div>
        );
      })}
      
      {projects.length === 0 && (
        <div className="p-8 text-center rounded-lg border border-dashed border-gray-700">
          <p className="text-gray-400">
            Aucun projet configuré. Créez un projet via <strong>Configuration → Project Manager</strong>
          </p>
        </div>
      )}
    </div>
  );
}
