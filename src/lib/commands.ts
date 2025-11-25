import { invoke } from "@tauri-apps/api/core";

export type ServiceName = "tunnel" | "backend" | "frontend" | "netdata";

export interface SystemStatus {
  cpu: number;
  ram: number;
  disk: number;
  uptime: number;
  services: {
    tunnel: boolean;
    backend: boolean;
    frontend: boolean;
    netdata: boolean;
  };
}

export interface SystemStats {
  cpu: number;
  ram: number;
  disk: number;
  uptime: number;
}

export interface SystemStats {
  cpu: number;
  ram: number;
  disk: number;
  uptime: number;
}

/**
 * Exécute une commande système via Tauri
 */
export async function runCommand(cmd: string): Promise<string> {
  try {
    return await invoke<string>("run_command", { cmd });
  } catch (error) {
    throw new Error(`Command failed: ${error}`);
  }
}

/**
 * Active un service (ON)
 */
export async function startService(service: ServiceName): Promise<string> {
  try {
    return await invoke<string>("start_service", { service });
  } catch (error) {
    throw new Error(`Failed to start ${service}: ${error}`);
  }
}

/**
 * Désactive un service (OFF)
 */
export async function stopService(service: ServiceName): Promise<string> {
  try {
    return await invoke<string>("stop_service", { service });
  } catch (error) {
    throw new Error(`Failed to stop ${service}: ${error}`);
  }
}

/**
 * Arrête tous les services
 */
export async function stopAllServices(): Promise<string> {
  try {
    return await invoke<string>("stop_all_services");
  } catch (error) {
    throw new Error(`Failed to stop all services: ${error}`);
  }
}

/**
 * Tue les processus zombies
 */
export async function killZombies(): Promise<string> {
  try {
    return await invoke<string>("kill_zombies");
  } catch (error) {
    throw new Error(`Failed to kill zombies: ${error}`);
  }
}

/**
 * Récupère le statut système complet
 */
export async function getSystemStatus(): Promise<SystemStatus> {
  try {
    return await invoke<SystemStatus>("check_status");
  } catch (error) {
    throw new Error(`Failed to get system status: ${error}`);
  }
}

export interface ScriptResult {
  stdout: string;
  stderr: string;
  code: number;
}

export type ServiceStatus = "RUNNING" | "STOPPED";

export async function startServiceV3(
  projectId: string,
  service: ServiceName
): Promise<ScriptResult> {
  try {
    return await invoke<ScriptResult>("start_service_v3", { projectId, service });
  } catch (error) {
    throw new Error(`Failed to start ${service}: ${error}`);
  }
}

export async function stopServiceV3(
  projectId: string,
  service: ServiceName
): Promise<ScriptResult> {
  try {
    return await invoke<ScriptResult>("stop_service_v3", { projectId, service });
  } catch (error) {
    throw new Error(`Failed to stop ${service}: ${error}`);
  }
}

export async function getServiceStatusV3(
  projectId: string,
  service: ServiceName
): Promise<ServiceStatus> {
  try {
    return await invoke<ServiceStatus>("status_service_v3", { projectId, service });
  } catch (error) {
    throw new Error(`Failed to get status for ${service}: ${error}`);
  }
}

export async function killZombiesV3(): Promise<ScriptResult> {
  try {
    return await invoke<ScriptResult>("kill_zombies_v3");
  } catch (error) {
    throw new Error(`Failed to kill zombies: ${error}`);
  }
}

export async function getSystemStatsV3(): Promise<SystemStats> {
  try {
    return await invoke<SystemStats>("get_system_stats_v3");
  } catch (error) {
    throw new Error(`Failed to get system stats: ${error}`);
  }
}

/**
 * Lit les logs en temps réel
 */
export async function readLogs(): Promise<string> {
  try {
    return await invoke<string>("read_logs");
  } catch (error) {
    throw new Error(`Failed to read logs: ${error}`);
  }
}

