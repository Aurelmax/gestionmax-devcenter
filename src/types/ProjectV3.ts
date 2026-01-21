export interface ServiceConfig {
  start?: string;
  stop?: string;
  port?: number;
}

export interface TunnelConfig {
  enabled?: boolean;
  host?: string;
  user?: string;
  port?: number;
  privateKey?: string;
  localMongo?: number;
  remoteMongo?: number;
}

export interface ProjectEnvironment {
  backend_env?: Record<string, string>;
  frontend_env?: Record<string, string>;
}

export interface ProjectCommands {
  backend?: string;
  frontend?: string;
  tunnel?: string;
  netdata?: string;
}

export interface ProjectV3 {
  id: string;
  name: string;

  rootPath: string;
  backendPath: string;
  frontendPath: string;
  scriptsPath?: string;

  // Type de backend pour l'UX (badges, boutons, commandes par défaut)
  backendType?: "payload" | "directus";

  ports: {
    backend: number;
    frontend: number;
  };

  environment?: ProjectEnvironment;

  backend?: ServiceConfig;
  frontend?: ServiceConfig;
  tunnel?: TunnelConfig;

  commands?: ProjectCommands;

  createdAt: string;
  
  // Activation du projet (un seul projet peut être actif à la fois)
  enabled?: boolean;
}

export interface ProjectScanResultV3 {
  id: string;
  name: string;

  rootPath: string;
  backendPath: string | null;
  frontendPath: string | null;

  backendPort: number | null;
  frontendPort: number | null;

  warnings: string[];
}

