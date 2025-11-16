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

