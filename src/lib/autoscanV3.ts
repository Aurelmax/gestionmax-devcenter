import { invoke } from "@tauri-apps/api/core";

import { ProjectScanResultV3 } from "@/types/ProjectV3";

export async function pickProjectFolderV3(): Promise<string> {
  return await invoke<string>("pick_project_folder");
}

export async function autoscanProjectV3(rootPath: string): Promise<ProjectScanResultV3> {
  return await invoke<ProjectScanResultV3>("autoscan_project_v3", { rootPath });
}

