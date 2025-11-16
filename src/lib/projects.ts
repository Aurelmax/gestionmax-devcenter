import { invoke } from "@tauri-apps/api/core";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import { Project, ServiceStatus } from "./types";

/**
 * Liste tous les projets depuis le fichier JSON
 */
export async function listProjects(): Promise<Project[]> {
  try {
    return await invoke<Project[]>("list_projects");
  } catch (error) {
    throw new Error(`Failed to list projects: ${error}`);
  }
}

/**
 * Vérifie le statut de tous les services d'un projet
 */
export async function checkProjectStatus(projectPath: string): Promise<ServiceStatus[]> {
  try {
    return await invoke<ServiceStatus[]>("check_project_status", { projectPath });
  } catch (error) {
    throw new Error(`Failed to check project status: ${error}`);
  }
}

/**
 * Démarre un service d'un projet
 */
export async function startProjectService(
  projectPath: string,
  serviceName: string,
  command: string
): Promise<string> {
  try {
    return await invoke<string>("start_project_service", {
      projectPath,
      serviceName,
      command,
    });
  } catch (error) {
    throw new Error(`Failed to start service: ${error}`);
  }
}

/**
 * Arrête un service d'un projet
 */
export async function stopProjectService(
  projectPath: string,
  serviceName: string,
  port: number
): Promise<string> {
  try {
    return await invoke<string>("stop_project_service", {
      projectPath,
      serviceName,
      port,
    });
  } catch (error) {
    throw new Error(`Failed to stop service: ${error}`);
  }
}

/**
 * Ouvre le dossier du projet dans l'explorateur de fichiers
 */
export async function openProjectFolder(path: string): Promise<void> {
  try {
    await openPath(path);
  } catch (error) {
    throw new Error(`Failed to open folder: ${error}`);
  }
}

/**
 * Ouvre le projet dans VS Code
 */
export async function openInVSCode(path: string): Promise<void> {
  try {
    await invoke("open_in_vscode", { path });
  } catch (error) {
    throw new Error(`Failed to open in VS Code: ${error}`);
  }
}

/**
 * Ouvre l'URL d'un service dans le navigateur
 */
export async function openServiceUrl(port: number): Promise<void> {
  try {
    await openUrl(`http://localhost:${port}`);
  } catch (error) {
    throw new Error(`Failed to open URL: ${error}`);
  }
}

