import { invoke } from "@tauri-apps/api/core";
import { Project, ProjectConfig } from "@/types/Project";

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

