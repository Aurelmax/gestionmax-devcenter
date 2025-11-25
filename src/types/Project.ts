export interface ProjectCommand {
  start: string;
  stop?: string | null;
  port?: number | null;
}

export interface ProjectServices {
  tunnel?: ProjectCommand | null;
  backend?: ProjectCommand | null;
  frontend?: ProjectCommand | null;
  netdata?: ProjectCommand | null;
}

export interface Project {
  name: string;
  backend_path: string;
  frontend_path: string;
  scripts_path: string;
  services: ProjectServices;
}

export interface ProjectConfig {
  projects: Project[];
}

export interface ProjectScanScript {
  start: string;
  stop?: string | null;
}

export interface ProjectScanScripts {
  tunnel?: ProjectScanScript | null;
  backend?: ProjectScanScript | null;
  frontend?: ProjectScanScript | null;
  netdata: (ProjectScanScript & { port: number });
}

export interface ProjectScanResult {
  name: string;
  backend_path: string | null;
  backend_port: number | null;
  backend_start: string | null;
  backend_stop: string | null;

  frontend_path: string | null;
  frontend_port: number | null;
  frontend_start: string | null;
  frontend_stop: string | null;

  scripts_path: string | null;
  scripts: ProjectScanScripts;
  warnings: string[];
}
