export interface ProjectService {
  name: string;
  port: number;
  command: string;
}

export interface Project {
  name: string;
  path: string;
  stack: string;
  services: ProjectService[];
}

export interface ServiceStatus {
  name: string;
  port: number;
  status: "RUNNING" | "STOPPED" | "ERROR";
  pid?: number;
}

export interface ProjectWithStatus extends Project {
  servicesStatus: ServiceStatus[];
}

