import { Project as NewProject, ProjectConfig } from "@/types/Project";
import { Project as OldProject, ProjectService } from "./types";

/**
 * Convertit le nouveau format de projet vers l'ancien format pour la compatibilité
 */
export function convertToOldFormat(newProject: NewProject): OldProject {
  const services: ProjectService[] = [];

  // Convertir les services du nouveau format vers l'ancien
  if (newProject.services.tunnel) {
    services.push({
      name: "tunnel",
      port: 0, // Tunnel n'a pas de port
      command: newProject.services.tunnel.start,
    });
  }

  if (newProject.services.backend) {
    services.push({
      name: "backend",
      port: newProject.services.backend.port || 3010,
      command: newProject.services.backend.start,
    });
  }

  if (newProject.services.frontend) {
    services.push({
      name: "frontend",
      port: newProject.services.frontend.port || 3000,
      command: newProject.services.frontend.start,
    });
  }

  if (newProject.services.netdata) {
    services.push({
      name: "netdata",
      port: newProject.services.netdata.port || 19999,
      command: newProject.services.netdata.start,
    });
  }

  return {
    name: newProject.name,
    path: newProject.backend_path, // Utiliser backend_path comme path principal
    stack: "Custom", // Stack par défaut
    services,
  };
}

/**
 * Convertit une liste de nouveaux projets vers l'ancien format
 */
export function convertProjectsToOldFormat(config: ProjectConfig): OldProject[] {
  return config.projects.map(convertToOldFormat);
}

