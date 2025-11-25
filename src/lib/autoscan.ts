import { invoke } from "@tauri-apps/api/core";
import { ProjectScanResult } from "@/types/Project";

/**
 * Ouvre un dialogue pour choisir un dossier de projet
 */
export async function pickProjectFolder(): Promise<string> {
  try {
    return await invoke<string>("pick_project_folder");
  } catch (error) {
    throw new Error(`Failed to pick folder: ${error}`);
  }
}

/**
 * Analyse automatiquement un projet et retourne sa configuration
 */
export async function autoscanProject(path: string): Promise<ProjectScanResult> {
  try {
    return await invoke<ProjectScanResult>("autoscan_project", { rootPath: path });
  } catch (error) {
    throw new Error(`Failed to autoscan project: ${error}`);
  }
}

/**
 * Clone un dépôt Git dans ~/CascadeProjects/
 */
export async function cloneGitRepo(url: string, targetDir?: string): Promise<string> {
  try {
    return await invoke<string>("clone_git_repo", {
      url,
      targetDir,
    });
  } catch (error) {
    throw new Error(`Failed to clone repo: ${error}`);
  }
}

