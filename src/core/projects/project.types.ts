import { ProjectV3 } from "@/types/ProjectV3";
import { ServiceName } from "@/lib/commands";

/**
 * État d'un service pour un projet
 */
export type ServiceState = "running" | "stopped" | "starting" | "stopping" | "error";

/**
 * État des services d'un projet
 */
export interface ProjectServicesState {
  backend: ServiceState;
  frontend: ServiceState;
  tunnel: ServiceState;
}

/**
 * Projet avec son état runtime
 */
export interface ProjectWithRuntime extends ProjectV3 {
  servicesState?: ProjectServicesState;
  lastUpdated?: number;
}

/**
 * Contexte du projet actif
 */
export interface ProjectContextValue {
  // Projet actif (un seul à la fois)
  activeProject: ProjectV3 | null;
  
  // Liste de tous les projets
  projects: ProjectV3[];
  
  // État de chargement
  isLoading: boolean;
  
  // Actions
  setActiveProject: (project: ProjectV3 | null) => void;
  activateProject: (projectId: string) => Promise<void>;
  deactivateProject: (projectId: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
  
  // Services du projet actif
  startService: (service: ServiceName) => Promise<any>;
  stopService: (service: ServiceName) => Promise<any>;
  getServiceStatus: (service: ServiceName) => Promise<ServiceState>;
  
  // Actions groupées
  startAllServices?: () => Promise<void>;
  stopAllServices?: () => Promise<void>;
}
