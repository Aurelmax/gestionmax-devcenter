import { useState, useEffect, useCallback } from "react";

import { Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

import { ProjectV3 } from "@/types/ProjectV3";
import { formatUptime } from "@/lib/system";
import { useToast } from "@/components/ui/use-toast";
import {
  ServiceName,
  startServiceV3,
  stopServiceV3,
  getServiceStatusV3,
  ScriptResult,
  killZombiesV3,
} from "@/lib/commands";

const POLL_INTERVAL = 1500;

type ServiceState = "running" | "stopped";

interface SystemStats {
  cpu: number;
  ram: number;
  disk: number;
  uptime: number;
}

const useSystemStats = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const current = await invoke<SystemStats>("get_system_stats_v3");
      setStats(current);
    } catch {
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    const handle = setInterval(loadStats, POLL_INTERVAL);
    return () => clearInterval(handle);
  }, [loadStats]);

  return { stats, isLoading };
};

const useServiceStatus = (projectId: string, service: ServiceName) => {
  const [status, setStatus] = useState<ServiceState>("stopped");

  const refresh = useCallback(async () => {
    try {
      const result = await getServiceStatusV3(projectId, service);
      setStatus(result === "RUNNING" ? "running" : "stopped");
    } catch {
      setStatus("stopped");
    }
  }, [projectId, service]);

  useEffect(() => {
    refresh();
    const handle = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(handle);
  }, [refresh]);

  return { status, refresh };
};

export default function Dashboard() {
  const [projects, setProjects] = useState<ProjectV3[]>([]);
  const [active, setActive] = useState<ProjectV3 | null>(null);
  const { stats, isLoading } = useSystemStats();

  useEffect(() => {
    invoke("load_projects_v3").then((cfg: any) => {
      const list = (cfg.projects as ProjectV3[]) || [];
      setProjects(list);
      if (list.length > 0) setActive(list[0]);
    });
  }, []);

  return (
    <div className="p-6 space-y-10">
      <SystemSection stats={stats} isLoading={isLoading} />

      {projects.length > 0 ? (
        <div className="space-y-6">
          <ProjectListSection
            projects={projects}
            active={active}
            onSelect={(p) => setActive(p)}
          />
          {active && <ActiveProjectSection project={active} />}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center text-gray-400">
          Aucun projet détecté. Utilisez Auto-Scan pour ajouter un projet.
        </div>
      )}
    </div>
  );
}

function SystemSection({
  stats,
  isLoading,
}: {
  stats: SystemStats | null;
  isLoading: boolean;
}) {
  const formatPercent = (value?: number) =>
    value === undefined || value === null ? "…" : `${value.toFixed(1)}%`;

  return (
    <section className="grid grid-cols-5 gap-4">
      <Card title="CPU" value={isLoading ? "…" : formatPercent(stats?.cpu)} />
      <Card title="RAM" value={isLoading ? "…" : formatPercent(stats?.ram)} />
      <Card title="Disk" value={isLoading ? "…" : formatPercent(stats?.disk)} />
      <Card
        title="Uptime"
        value={isLoading || !stats ? "…" : formatUptime(stats.uptime)}
      />
      <div className="flex items-center justify-end">
        <button
          className="btn px-4 py-2 rounded bg-blue-600 text-white"
          onClick={() => window.open("http://localhost:19999", "_blank")}
        >
          Netstat
        </button>
      </div>
    </section>
  );
}

function ActiveProjectSection({ project }: { project: ProjectV3 }) {
  const backendStatus = useServiceStatus(project.id, "backend");
  const frontendStatus = useServiceStatus(project.id, "frontend");
  const tunnelStatus = useServiceStatus(project.id, "tunnel");
  const { toast } = useToast();
  const [loadingService, setLoadingService] = useState<string | null>(null);

  const [killing, setKilling] = useState(false);

  const handleKillZombies = async () => {
    setKilling(true);
    try {
      const result = await killZombiesV3();
      toast({
        title: "Kill Zombies",
        description: result.stdout || result.stderr || `Code ${result.code}`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de tuer les zombies",
        variant: "destructive",
      });
    } finally {
      setKilling(false);
    }
  };

  const handleAction =
    (
      service: ServiceName,
      action: "start" | "stop",
      refresh: () => void,
      runner: () => Promise<ScriptResult>
    ) =>
    async () => {
      setLoadingService(`${service}-${action}`);
      try {
        const result = await runner();
        toast({
          title: action === "start" ? `Démarrage ${service}` : `Arrêt ${service}`,
          description:
            result.stdout ||
            result.stderr ||
            `Code ${result.code}`,
        });
        refresh();
      } catch (error) {
        toast({
          title: "Erreur",
          description:
            error instanceof Error ? error.message : "Action échouée",
          variant: "destructive",
        });
      } finally {
        setLoadingService(null);
      }
    };

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Services – {project.name}</h2>

      <div className="space-y-3">
        <ServiceRow
          label="Backend"
          status={backendStatus.status}
          port={project.ports.backend}
          onStart={handleAction(
            "backend",
            "start",
            backendStatus.refresh,
            () => startServiceV3(project.id, "backend")
          )}
          onStop={handleAction(
            "backend",
            "stop",
            backendStatus.refresh,
            () => stopServiceV3(project.id, "backend")
          )}
          startLoading={loadingService === "backend-start"}
          stopLoading={loadingService === "backend-stop"}
        />
        <ServiceRow
          label="Frontend"
          status={frontendStatus.status}
          port={project.ports.frontend}
          onStart={handleAction(
            "frontend",
            "start",
            frontendStatus.refresh,
            () => startServiceV3(project.id, "frontend")
          )}
          onStop={handleAction(
            "frontend",
            "stop",
            frontendStatus.refresh,
            () => stopServiceV3(project.id, "frontend")
          )}
          startLoading={loadingService === "frontend-start"}
          stopLoading={loadingService === "frontend-stop"}
        />
        <ServiceRow
          label="Tunnel SSH"
          status={tunnelStatus.status}
          onStart={handleAction(
            "tunnel",
            "start",
            tunnelStatus.refresh,
            () => startServiceV3(project.id, "tunnel")
          )}
          onStop={handleAction(
            "tunnel",
            "stop",
            tunnelStatus.refresh,
            () => stopServiceV3(project.id, "tunnel")
          )}
          startLoading={loadingService === "tunnel-start"}
          stopLoading={loadingService === "tunnel-stop"}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button className="btn px-4 py-2 rounded bg-gray-800 text-white">
          Ouvrir dossier
        </button>
        <button className="btn px-4 py-2 rounded bg-gray-800 text-white">
          VS Code
        </button>
        <button className="btn px-4 py-2 rounded bg-gray-800 text-white">
          Logs
        </button>
        <button
          className="btn px-4 py-2 rounded bg-red-700 text-white flex items-center gap-2"
          onClick={handleKillZombies}
          disabled={killing}
        >
          {killing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kill Zombies"}
        </button>
      </div>
    </section>
  );
}

function ProjectListSection({
  projects,
  active,
  onSelect,
}: {
  projects: ProjectV3[];
  active: ProjectV3 | null;
  onSelect: (p: ProjectV3) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {projects.map((project) => (
        <button
          key={project.id}
          className={`px-4 py-2 rounded-full border ${
            active?.id === project.id
              ? "border-blue-500 bg-blue-600 text-white"
              : "border-gray-600 text-gray-200"
          }`}
          onClick={() => onSelect(project)}
        >
          {project.name}
        </button>
      ))}
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="p-4 rounded-xl shadow bg-white text-sm text-gray-800">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function ServiceRow({
  label,
  port,
  onStart,
  onStop,
  status,
  startLoading = false,
  stopLoading = false,
}: {
  label: string;
  port?: number;
  status: ServiceState;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
  startLoading?: boolean;
  stopLoading?: boolean;
}) {
  const badgeColor =
    status === "running" ? "bg-green-500 text-white" : "bg-gray-700 text-white";

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-700 p-3 bg-gray-900">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-white">{label}</span>
        {port && <span className="text-xs text-gray-400">:{port}</span>}
        <span className={`px-2 py-0.5 text-xs rounded-full ${badgeColor}`}>
          {status === "running" ? "RUNNING" : "STOPPED"}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          className="px-3 py-1 rounded border border-green-500 text-green-500 text-xs flex items-center justify-center gap-1"
          onClick={onStart}
          disabled={startLoading}
        >
          {startLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Start"}
        </button>
        <button
          className="px-3 py-1 rounded border border-red-500 text-red-500 text-xs flex items-center justify-center gap-1"
          onClick={onStop}
          disabled={stopLoading}
        >
          {stopLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Stop"}
        </button>
      </div>
    </div>
  );
}

