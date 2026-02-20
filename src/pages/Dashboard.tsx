import { useState, useEffect, useCallback } from "react";

import { Loader2, RefreshCw } from "lucide-react";

import { ProjectV3 } from "@/types/ProjectV3";
import { formatUptime } from "@/lib/system";
import { useToast } from "@/components/ui/use-toast";
import { scanIndependentRepos } from "@/lib/autoscanV3";
import { pullGitRepo } from "@/lib/autoscan";
import { loadProjectsV3 } from "@/lib/projectManager";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import { GmdLogs } from "@/components/GmdLogs";
import { SessionUI } from "@/components/SessionUI";
import { useRuntime } from "@/core/runtime/runtime.store";

const POLL_INTERVAL = 1500;

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
      const { invoke } = await import("@tauri-apps/api/core");
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

export default function Dashboard() {
  const [projects, setProjects] = useState<ProjectV3[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const { stats, isLoading } = useSystemStats();
  const { toast } = useToast();
  const [pullingAll, setPullingAll] = useState(false);
  const { refreshActiveStatus, state } = useRuntime();

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

  // Polling automatique du statut du projet actif uniquement
  // Ne poll que si un projet est actif (modèle mono-projet)
  useEffect(() => {
    if (!state.activeProjectId) return;

    const interval = setInterval(() => {
      refreshActiveStatus().catch(err => 
        console.warn("Failed to refresh active status:", err)
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [state.activeProjectId, refreshActiveStatus]);

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
          
          {/* Project Switcher : Liste simple avec bouton Start/Stop */}
          <ProjectSwitcher projects={projects} />
          
          {/* Logs gmdev en temps réel */}
          <GmdLogs />
          
          {/* Session UI : Front Repo + Back Repo */}
          <div className="border-t border-gray-700 pt-6">
            <h2 className="text-2xl font-semibold text-white mb-4">Session</h2>
            <SessionUI />
          </div>
          
          {/* Indication si une commande est en cours */}
          {state.commandInFlight && (
            <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-900/20">
              <p className="text-yellow-300 text-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Commande en cours...
              </p>
            </div>
          )}
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


function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="p-4 rounded-xl shadow bg-white text-sm text-gray-800">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}


