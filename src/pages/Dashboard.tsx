import { useState, useEffect, useCallback } from "react";

import { Loader2, RefreshCw, Globe, ExternalLink } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

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
import { scanIndependentRepos } from "@/lib/autoscanV3";
import { pullGitRepo } from "@/lib/autoscan";
import { loadProjectsV3, updateProjectV3 } from "@/lib/projectManager";

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
  const [isScanning, setIsScanning] = useState(false);
  const { stats, isLoading } = useSystemStats();
  const { toast } = useToast();
  const [pullingAll, setPullingAll] = useState(false);

  const scanProjects = async (showToast = true) => {
    setIsScanning(true);
    try {
      const cascadePath = "~/CascadeProjects";
      const detectedProjects = await scanIndependentRepos(cascadePath);
      
      if (detectedProjects.length > 0) {
        // ⚠️ RÈGLE FONDAMENTALE: Auto-scan ne crée JAMAIS de projets
        // Il retourne uniquement des suggestions à l'utilisateur
        // L'utilisateur doit créer les projets via Project Manager ou gmdev
        
        if (showToast) {
          toast({
            title: "Suggestions détectées",
            description: `${detectedProjects.length} dépôt(s) détecté(s). Allez dans Configuration → Project Manager pour créer un projet.`,
            duration: 6000,
          });
        }
      } else {
        if (showToast) {
          toast({
            title: "Aucun dépôt détecté",
            description: "Aucun repo Payload ou Next.js trouvé dans ~/CascadeProjects",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("Scan error:", errorMsg);
      if (showToast) {
        toast({
          title: "Erreur de scan",
          description: `Impossible de scanner les dépôts: ${errorMsg}`,
          variant: "destructive",
        });
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handlePullAllGit = async () => {
    setPullingAll(true);
    try {
      let successCount = 0;
      let errorCount = 0;
      const results: string[] = [];

      for (const project of projects) {
        // Essayer d'abord le rootPath, puis backendPath, puis frontendPath
        const pathsToTry = [
          project.rootPath,
          project.backendPath,
          project.frontendPath,
        ].filter(Boolean);

        let projectUpdated = false;

        for (const path of pathsToTry) {
          if (!path) continue;
          try {
            const result = await pullGitRepo(path);
            results.push(`✅ ${project.name}: ${result || "Mis à jour"}`);
            successCount++;
            projectUpdated = true;
            break;
          } catch (error) {
            // Si ce n'est pas un repo Git, essayer le suivant
            continue;
          }
        }

        if (!projectUpdated) {
          results.push(`⚠️ ${project.name}: Aucun dépôt Git trouvé`);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: `✅ ${successCount} projet(s) mis à jour`,
          description: results.slice(0, 3).join("\n") + (results.length > 3 ? `\n... et ${results.length - 3} autre(s)` : ""),
          duration: 5000,
        });
      } else {
        toast({
          title: "⚠️ Aucun dépôt Git mis à jour",
          description: "Aucun projet n'a de dépôt Git valide",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de mettre à jour les dépôts",
        variant: "destructive",
      });
    } finally {
      setPullingAll(false);
    }
  };

  const loadProjects = useCallback(async () => {
    try {
      // ⚠️ RÈGLE FONDAMENTALE: Charger UNIQUEMENT depuis projects-v3.json
      // gmdev est la source de vérité, DevCenter ne crée jamais de projet
      const config = await loadProjectsV3();
      const projectList = config.projects || [];
      
      setProjects(projectList);
      if (projectList.length > 0) {
        // Sélectionner le projet actif ou le premier
        const activeProject = projectList.find(p => p.enabled) || projectList[0];
        setActive(activeProject);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
      // Si le fichier n'existe pas ou est vide, on affiche une liste vide
      // L'utilisateur devra créer des projets via gmdev ou Project Manager
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Fonction pour activer/désactiver un projet
  const handleToggleEnabled = async (project: ProjectV3) => {
    try {
      const config = await loadProjectsV3();
      const projectList = config.projects || [];
      
      if (project.enabled) {
        // Désactiver ce projet
        const updatedProject = { ...project, enabled: false };
        await updateProjectV3(updatedProject);
        
        // Arrêter tous les services de ce projet
        if (project.backendPath && project.backendPath.trim() !== "") {
          try {
            await stopServiceV3(project.id, "backend");
            await stopServiceV3(project.id, "tunnel");
          } catch (e) {
            console.warn("Erreur lors de l'arrêt du backend/tunnel:", e);
          }
        }
        try {
          await stopServiceV3(project.id, "frontend");
        } catch (e) {
          console.warn("Erreur lors de l'arrêt du frontend:", e);
        }
        
        toast({
          title: "Projet désactivé",
          description: `Le projet "${project.name}" a été désactivé et ses services arrêtés.`,
        });
      } else {
        // Activer ce projet (désactiver les autres)
        // 1. Désactiver tous les autres projets
        for (const p of projectList) {
          if (p.id !== project.id && p.enabled) {
            const updatedOther = { ...p, enabled: false };
            await updateProjectV3(updatedOther);
            
            // Arrêter les services des autres projets
            if (p.backendPath && p.backendPath.trim() !== "") {
              try {
                await stopServiceV3(p.id, "backend");
                await stopServiceV3(p.id, "tunnel");
              } catch (e) {
                console.warn(`Erreur lors de l'arrêt du backend/tunnel de ${p.name}:`, e);
              }
            }
            try {
              await stopServiceV3(p.id, "frontend");
            } catch (e) {
              console.warn(`Erreur lors de l'arrêt du frontend de ${p.name}:`, e);
            }
          }
        }
        
        // 2. Activer ce projet
        const updatedProject = { ...project, enabled: true };
        await updateProjectV3(updatedProject);
        setActive(updatedProject);
        
        toast({
          title: "Projet activé",
          description: `Le projet "${project.name}" est maintenant actif. Les autres projets ont été désactivés.`,
        });
      }
      
      // Recharger la liste des projets
      await loadProjects();
    } catch (error) {
      toast({
        title: "Erreur",
        description: `Impossible de modifier l'état du projet: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 space-y-10">
      <SystemSection stats={stats} isLoading={isLoading} />

      {projects.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">Projets</h2>
            <button
              className="btn px-4 py-2 rounded bg-blue-700 text-white flex items-center gap-2 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handlePullAllGit}
              disabled={pullingAll || projects.length === 0}
              title="Mettre à jour tous les dépôts Git (git pull)"
            >
              {pullingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  🔄 Mettre à jour tous les Git
                </>
              )}
            </button>
          </div>
          <ProjectListSection
            projects={projects}
            active={active}
            onSelect={(p) => setActive(p)}
            onToggleEnabled={handleToggleEnabled}
          />
          {active && <ActiveProjectSection project={active} />}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center">
          <p className="text-gray-400 mb-4">
            Aucun projet configuré. Les projets doivent être créés via <strong>Configuration → Project Manager</strong> ou via <strong>gmdev</strong>.
          </p>
          <p className="text-gray-500 text-sm mb-4">
            ⚠️ <strong>Règle fondamentale:</strong> Un dépôt Git n'est PAS un projet. Seuls les projets définis dans <code>projects-v3.json</code> sont valides.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.href = "/configuration?tab=projects"}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
            >
              Créer un projet
            </button>
            <button
              onClick={() => scanProjects(true)}
              disabled={isScanning}
              className="px-4 py-2 rounded bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Scanner pour détecter des dépôts (suggestions uniquement)"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scan en cours...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Scanner les dépôts (suggestions)
                </>
              )}
            </button>
          </div>
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
  const [startingAll, setStartingAll] = useState(false);

  // Empêcher le démarrage si le projet n'est pas activé
  // true par défaut pour rétrocompatibilité (anciens projets sans champ enabled)
  const isProjectEnabled = project.enabled !== false;

  // Fonction pour ouvrir le frontend
  const handleOpenFrontend = async () => {
    try {
      await openUrl(`http://localhost:${project.ports.frontend}`);
    } catch (error) {
      toast({
        title: "Erreur",
        description: `Impossible d'ouvrir le frontend: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
        variant: "destructive",
      });
    }
  };

  // Fonction pour ouvrir le backend admin
  const handleOpenBackendAdmin = async () => {
    try {
      const adminPath = project.backendType === "directus" ? "/admin" : "/admin";
      await openUrl(`http://localhost:${project.ports.backend}${adminPath}`);
    } catch (error) {
      toast({
        title: "Erreur",
        description: `Impossible d'ouvrir l'admin backend: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
        variant: "destructive",
      });
    }
  };

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


  const handleStartAll = async () => {
    // Empêcher le démarrage si le projet n'est pas activé
    if (!isProjectEnabled) {
      toast({
        title: "Projet inactif",
        description: "Veuillez activer ce projet avant de démarrer ses services.",
        variant: "destructive",
      });
      return;
    }

    setStartingAll(true);
    try {
      // Démarrer dans l'ordre : tunnel → backend → frontend
      // ⚠️ RÈGLE MÉTIER: Tunnel uniquement si backend existe
      const services = [];
      if (project.backendPath && project.backendPath.trim() !== "") {
        services.push({ name: "tunnel", runner: () => startServiceV3(project.id, "tunnel") });
      }
      if (project.backendPath && project.backendPath.trim() !== "") {
        services.push({ name: "backend", runner: () => startServiceV3(project.id, "backend") });
      }
      services.push({ name: "frontend", runner: () => startServiceV3(project.id, "frontend") });

      for (const service of services) {
        try {
          const result = await service.runner();
          if (result.code !== 0 && !result.stdout.includes("démarré")) {
            console.warn(`${service.name} returned code ${result.code}`);
          }
          // Attendre un peu entre chaque démarrage
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          // Continuer même si un service échoue
          console.error(`Erreur lors du démarrage de ${service.name}:`, error);
        }
      }

      // Rafraîchir tous les statuts
      tunnelStatus.refresh();
      backendStatus.refresh();
      frontendStatus.refresh();

      toast({
        title: "Démarrage en cours",
        description: "Tous les services sont en cours de démarrage. Vérifiez leur statut dans quelques secondes.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors du démarrage des services",
        variant: "destructive",
      });
    } finally {
      setStartingAll(false);
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
      // Empêcher le démarrage si le projet n'est pas activé
      if (action === "start" && !isProjectEnabled) {
        toast({
          title: "Projet inactif",
          description: "Veuillez activer ce projet avant de démarrer ses services.",
          variant: "destructive",
        });
        return;
      }

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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Services – {project.name}</h2>
        <div className="flex items-center gap-2">
          {/* Badge activation */}
          {!isProjectEnabled && (
            <span className="px-2 py-1 text-xs rounded-full font-medium bg-red-600/20 text-red-300 border border-red-500/30">
              ⚠️ INACTIF
            </span>
          )}
          {/* Badge backend type */}
          {project.backendType && (
            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
              project.backendType === "payload" 
                ? "bg-purple-600/20 text-purple-300 border border-purple-500/30" 
                : "bg-blue-600/20 text-blue-300 border border-blue-500/30"
            }`}>
              {project.backendType === "payload" ? "Payload" : "Directus"}
            </span>
          )}
          {/* Badge Local/Remote */}
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
            project.backendPath && project.backendPath.trim() !== ""
              ? "bg-green-600/20 text-green-300 border border-green-500/30"
              : "bg-orange-600/20 text-orange-300 border border-orange-500/30"
          }`}>
            {project.backendPath && project.backendPath.trim() !== "" ? "LOCAL" : "REMOTE"}
          </span>
        </div>
      </div>

      {!isProjectEnabled && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-yellow-300 text-sm">
            ⚠️ Ce projet est inactif. Activez-le pour pouvoir démarrer ses services.
          </p>
        </div>
      )}

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
        {/* ⚠️ RÈGLE MÉTIER: Tunnel = service backend uniquement */}
        {/* N'afficher le tunnel que s'il y a un backend */}
        {project.backendPath && project.backendPath.trim() !== "" && (
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
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          className="btn px-4 py-2 rounded bg-green-700 text-white flex items-center gap-2 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleStartAll}
          disabled={!isProjectEnabled || startingAll || (
            (!project.backendPath || project.backendPath.trim() === "" || backendStatus.status === "running") &&
            frontendStatus.status === "running" &&
            (!project.backendPath || project.backendPath.trim() === "" || tunnelStatus.status === "running")
          )}
          title={!isProjectEnabled ? "Projet inactif - Activez-le d'abord" : "Démarrer automatiquement : Tunnel → Backend → Frontend"}
        >
          {startingAll ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Démarrage...
            </>
          ) : (
            "🚀 Démarrer tout"
          )}
        </button>
        
        {/* Boutons "Ouvrir dans le navigateur" */}
        {project.frontendPath && project.frontendPath.trim() !== "" && (
          <button
            className="btn px-4 py-2 rounded bg-blue-700 text-white flex items-center gap-2 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleOpenFrontend}
            disabled={frontendStatus.status !== "running"}
            title={`Ouvrir http://localhost:${project.ports.frontend}`}
          >
            <Globe className="w-4 h-4" />
            Ouvrir Frontend
          </button>
        )}
        
        {project.backendPath && project.backendPath.trim() !== "" && project.backendType && (
          <button
            className="btn px-4 py-2 rounded bg-purple-700 text-white flex items-center gap-2 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleOpenBackendAdmin}
            disabled={backendStatus.status !== "running"}
            title={`Ouvrir http://localhost:${project.ports.backend}/admin`}
          >
            <ExternalLink className="w-4 h-4" />
            {project.backendType === "payload" ? "Payload Admin" : "Directus Admin"}
          </button>
        )}
        
        <button className="btn px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700">
          Ouvrir dossier
        </button>
        <button className="btn px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700">
          VS Code
        </button>
        <button className="btn px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700">
          Logs
        </button>
        <button
          className="btn px-4 py-2 rounded bg-red-700 text-white flex items-center gap-2 hover:bg-red-600"
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
  onToggleEnabled,
}: {
  projects: ProjectV3[];
  active: ProjectV3 | null;
  onSelect: (p: ProjectV3) => void;
  onToggleEnabled: (project: ProjectV3) => Promise<void>;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {projects.map((project) => (
          <div key={project.id} className="flex items-center gap-2">
            <button
              className={`px-4 py-2 rounded-full border ${
                active?.id === project.id
                  ? "border-blue-500 bg-blue-600 text-white"
                  : "border-gray-600 text-gray-200"
              }`}
              onClick={() => onSelect(project)}
            >
              {project.name}
            </button>
            <button
              onClick={() => onToggleEnabled(project)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                project.enabled
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
              title={project.enabled ? "Désactiver ce projet" : "Activer ce projet"}
            >
              {project.enabled ? "✓ Actif" : "Inactif"}
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400">
        💡 Un seul projet peut être actif à la fois. Activer un projet arrête automatiquement les services des autres projets.
      </p>
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

