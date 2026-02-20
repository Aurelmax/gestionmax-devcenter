import { invoke } from "@tauri-apps/api/core";
import {
  Project,
  ProjectCommand,
  ProjectConfig,
  ProjectScanResult,
} from "@/types/Project";
import { ProjectV3 } from "@/types/ProjectV3";

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

// ─────────────────────────────────────────────
//   V3 Project Manager Functions
// ─────────────────────────────────────────────

export interface ProjectConfigV3 {
  projects: ProjectV3[];
}

/**
 * Charge la configuration des projets V3
 */
export async function loadProjectsV3(): Promise<ProjectConfigV3> {
  try {
    return await invoke<ProjectConfigV3>("load_projects_v3");
  } catch (error) {
    throw new Error(`Failed to load projects V3: ${error}`);
  }
}

/**
 * Sauvegarde la configuration des projets V3
 */
export async function saveProjectsV3(config: ProjectConfigV3): Promise<void> {
  try {
    // Tauri v2: parameter name must match Rust exactly
    await invoke("save_projects_v3", { config });
  } catch (error) {
    throw new Error(`Failed to save projects V3: ${error}`);
  }
}

/**
 * Ajoute un nouveau projet V3
 */
export async function addProjectV3(project: ProjectV3): Promise<void> {
  try {
    const config = await loadProjectsV3();
    
    // Vérifier si un projet avec le même ID existe déjà
    const existing = config.projects.find((p) => p.id === project.id);
    if (existing) {
      throw new Error(`Un projet avec le nom "${existing.name}" existe déjà. Modifiez-le dans Project Manager.`);
    }
    
    config.projects.push(project);
    await saveProjectsV3(config);
  } catch (error) {
    throw new Error(`Failed to add project V3: ${error}`);
  }
}

/**
 * Met à jour un projet V3 existant
 */
export async function updateProjectV3(project: ProjectV3): Promise<void> {
  try {
    const config = await loadProjectsV3();
    
    const index = config.projects.findIndex((p) => p.id === project.id);
    if (index === -1) {
      throw new Error(`Project with ID '${project.id}' not found`);
    }
    
    config.projects[index] = project;
    await saveProjectsV3(config);
  } catch (error) {
    throw new Error(`Failed to update project V3: ${error}`);
  }
}

/**
 * Supprime un projet V3
 */
export async function deleteProjectV3(projectId: string): Promise<void> {
  try {
    const config = await loadProjectsV3();
    
    const index = config.projects.findIndex((p) => p.id === projectId);
    if (index === -1) {
      throw new Error(`Project with ID '${projectId}' not found`);
    }
    
    config.projects.splice(index, 1);
    await saveProjectsV3(config);
  } catch (error) {
    throw new Error(`Failed to delete project V3: ${error}`);
  }
}