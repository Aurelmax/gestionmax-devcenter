import { invoke } from "@tauri-apps/api/core";
import { Project } from "@/types/Project";

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
export async function autoscanProject(path: string): Promise<Project> {
  try {
    return await invoke<Project>("autoscan_project", { root_path: path });
  } catch (error) {
    throw new Error(`Failed to autoscan project: ${error}`);
  }
}

