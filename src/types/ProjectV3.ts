export interface ProjectV3 {
  id: string;
  name: string;

  rootPath: string;
  backendPath: string;
  frontendPath: string;

  ports: {
    backend: number;
    frontend: number;
  };

  tunnel?: {
    enabled: boolean;
    host: string;
    user: string;
    port: number;
    privateKey: string;
    localMongo: number;
    remoteMongo: number;
  };

  commands?: {
    backend?: string;
    frontend?: string;
    tunnel?: string;
    netdata?: string;
  };

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

