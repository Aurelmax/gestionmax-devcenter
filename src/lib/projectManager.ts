import { invoke } from "@tauri-apps/api/core";
import {
  Project,
  ProjectCommand,
  ProjectConfig,
  ProjectScanResult,
} from "@/types/Project";

/**
 * Charge la configuration des projets
 */
export async function loadProjects(): Promise<ProjectConfig> {
  try {
    return await invoke<ProjectConfig>("load_projects");
  } catch (error) {
    throw new Error(`Failed to load projects: ${error}`);
  }
}

/**
 * Sauvegarde la configuration des projets
 */
export async function saveProjects(config: ProjectConfig): Promise<void> {
  try {
    await invoke("save_projects", { config });
  } catch (error) {
    throw new Error(`Failed to save projects: ${error}`);
  }
}

/**
 * Ajoute un nouveau projet
 */
export async function addProject(project: Project): Promise<void> {
  try {
    await invoke("add_project", { project });
  } catch (error) {
    throw new Error(`Failed to add project: ${error}`);
  }
}

/**
 * Met à jour un projet existant
 */
export async function updateProject(project: Project): Promise<void> {
  try {
    await invoke("update_project", { project });
  } catch (error) {
    throw new Error(`Failed to update project: ${error}`);
  }
}

/**
 * Supprime un projet
 */
export async function deleteProject(projectName: string): Promise<void> {
  try {
    await invoke("delete_project", { projectName });
  } catch (error) {
    throw new Error(`Failed to delete project: ${error}`);
  }
}

function safeCommand(
  script: ProjectScanResult["scripts"]["backend"],
  fallbackStart: string,
  fallbackStop?: string | null,
  port?: number | null
): ProjectCommand {
  return {
    start: script?.start || fallbackStart,
    stop: script?.stop ?? fallbackStop,
    port: port ?? undefined,
  };
}

export async function addProjectFromScan(
  scan: ProjectScanResult,
  rootPath: string
): Promise<void> {
  const backendPath = scan.backend_path ?? rootPath;
  const frontendPath = scan.frontend_path ?? rootPath;
  const scriptsPath =
    scan.scripts_path ?? `${rootPath.replace(/\/+$/, "")}/scripts`;

  const services: Project["services"] = {
    // Tunnel SSH : service de projet (chaque projet a son propre tunnel pour sa DB)
    tunnel: scan.scripts.tunnel
      ? {
          start: scan.scripts.tunnel.start,
          stop: scan.scripts.tunnel.stop,
        }
      : null,
    // Backend : service de projet
    backend:
      scan.backend_path || scan.scripts.backend
        ? safeCommand(
            scan.scripts.backend,
            scan.backend_start || "backend-on.sh",
            scan.backend_stop,
            scan.backend_port ?? 3010
          )
        : null,
    // Frontend : service de projet
    frontend:
      scan.frontend_path || scan.scripts.frontend
        ? safeCommand(
            scan.scripts.frontend,
            scan.frontend_start || "frontend-on.sh",
            scan.frontend_stop,
            scan.frontend_port ?? 3000
          )
        : null,
    // Netdata : NE PAS inclure dans les projets (service global uniquement)
    netdata: null,
  };

  const project: Project = {
    name: scan.name,
    backend_path: backendPath,
    frontend_path: frontendPath,
    scripts_path: scriptsPath,
    services,
  };

  await addProject(project);
}

