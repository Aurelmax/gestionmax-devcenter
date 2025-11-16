import { SystemStatus, ServiceName } from "./commands";

/**
 * Calcule le statut global basé sur les services
 * @returns "healthy" | "warning" | "error"
 */
export function getGlobalStatus(status: SystemStatus): "healthy" | "warning" | "error" {
  const services = Object.values(status.services);
  const runningCount = services.filter(Boolean).length;
  const totalCount = services.length;

  if (runningCount === totalCount) return "healthy";
  if (runningCount > 0) return "warning";
  return "error";
}

/**
 * Retourne la couleur associée au statut
 */
export function getStatusColor(status: "healthy" | "warning" | "error"): string {
  switch (status) {
    case "healthy":
      return "text-green-400 bg-green-400/10 border-green-400/20";
    case "warning":
      return "text-orange-400 bg-orange-400/10 border-orange-400/20";
    case "error":
      return "text-red-400 bg-red-400/10 border-red-400/20";
  }
}

/**
 * Formate l'uptime en format lisible
 */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Formate les bytes en format lisible
 */
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Retourne le label d'un service
 */
export function getServiceLabel(service: ServiceName): string {
  const labels: Record<ServiceName, string> = {
    tunnel: "Tunnel SSH",
    backend: "Backend Payload",
    frontend: "Frontend Next.js",
    netdata: "Netdata",
  };
  return labels[service];
}

/**
 * Retourne l'icône d'un service
 */
export function getServiceIcon(service: ServiceName): string {
  const icons: Record<ServiceName, string> = {
    tunnel: "Network",
    backend: "Server",
    frontend: "Globe",
    netdata: "Activity",
  };
  return icons[service];
}

