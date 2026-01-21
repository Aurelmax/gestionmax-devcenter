import { invoke } from "@tauri-apps/api/core";

import { ProjectScanResultV3, ProjectV3 } from "@/types/ProjectV3";

export async function pickProjectFolderV3(): Promise<string> {
  return await invoke<string>("pick_project_folder");
}

export async function autoscanProjectV3(rootPath: string): Promise<ProjectScanResultV3> {
  return await invoke<ProjectScanResultV3>("autoscan_project_v3", { rootPath });
}

/**
 * Scanne un dossier parent et détecte automatiquement tous les repos indépendants
 * (backends et frontends séparés) et les associe par nom
 */
export async function scanIndependentRepos(parentPath: string): Promise<ProjectV3[]> {
  try {
    return await invoke<ProjectV3[]>("scan_independent_repos", { parentPath });
  } catch (error) {
    throw new Error(`Failed to scan independent repos: ${error}`);
  }
}
