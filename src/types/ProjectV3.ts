export interface ServiceConfig {
  start?: string;
  stop?: string;
  port?: number;
}

export interface TunnelConfig {
  start?: string;
  stop?: string;
  host?: string;
  user?: string;
  ssh_key?: string;
  local_port?: number;
  remote_port?: number;
  type?: string;
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

