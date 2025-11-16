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

