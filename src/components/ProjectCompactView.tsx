import { useState } from "react";
import {
  Play,
  Square,
  FolderOpen,
  Code,
  Globe,
  Loader2,
  AlertCircle,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectWithStatus } from "@/lib/types";
import { useProjects } from "@/hooks/useProjects";
import {
  openProjectFolder,
  openInVSCode,
  openServiceUrl,
} from "@/lib/projects";
import { useToast } from "@/components/ui/use-toast";

function ProjectCard({ project }: { project: ProjectWithStatus }) {
  const { startService, stopService } = useProjects();
  const { toast } = useToast();
  const [loadingService, setLoadingService] = useState<string | null>(null);

  const handleStartService = async (
    serviceName: string,
    command: string
  ) => {
    setLoadingService(serviceName);
    try {
      await startService(project.path, serviceName, command);
      toast({
        title: "Succès",
        description: `Service ${serviceName} démarré`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: `Impossible de démarrer ${serviceName}: ${error}`,
        variant: "destructive",
      });
    } finally {
      setLoadingService(null);
    }
  };

  const handleStopService = async (serviceName: string, port: number) => {
    setLoadingService(serviceName);
    try {
      // Pour le tunnel, le port est 0, mais on doit quand même appeler stopService
      await stopService(project.path, serviceName, port);
      toast({
        title: "Succès",
        description: `Service ${serviceName} arrêté`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: `Impossible d'arrêter ${serviceName}: ${error}`,
        variant: "destructive",
      });
    } finally {
      setLoadingService(null);
    }
  };

  const handleOpenFolder = async () => {
    try {
      await openProjectFolder(project.path);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir le dossier",
        variant: "destructive",
      });
    }
  };

  const handleOpenVSCode = async () => {
    try {
      await openInVSCode(project.path);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir VS Code",
        variant: "destructive",
      });
    }
  };

  const handleOpenUrl = async (port: number) => {
    try {
      await openServiceUrl(port);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir l'URL",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-all hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg text-white mb-1 truncate">
              {project.name}
            </CardTitle>
            <p className="text-xs text-gray-400 font-mono truncate" title={project.path}>
              {project.path}
            </p>
          </div>
          <Badge variant="secondary" className="ml-2 shrink-0">
            {project.stack}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Services */}
        <div className="space-y-2">
          {/* Services standards : Tunnel, Backend, Frontend - TOUJOURS affichés */}
          {["tunnel", "backend", "frontend"].map((serviceName) => {
            // Trouver le statut du service
            const serviceStatus = project.servicesStatus.find(s => s.name === serviceName);
            // Trouver la configuration du service
            const service = project.services.find(s => s.name === serviceName);
            
            // Si le service n'a pas de statut, créer un statut par défaut
            const status = serviceStatus || {
              name: serviceName,
              port: serviceName === "tunnel" ? 0 : (serviceName === "backend" ? 3010 : 3000),
              status: "STOPPED" as const,
              pid: undefined,
            };
            
            // Si le service n'a pas de configuration, créer une configuration par défaut
            const serviceConfig = service || {
              name: serviceName,
              port: status.port,
              command: serviceName === "tunnel" 
                ? "tunnel-on.sh" 
                : serviceName === "backend" 
                ? "backend-on.sh" 
                : "frontend-on.sh",
            };
            
            const isRunning = status.status === "RUNNING";
            const isLoading = loadingService === serviceName;
            const isTunnel = serviceName === "tunnel";
            const isConfigured = !!service; // Le service est configuré s'il existe dans project.services
            
            // Labels pour les services
            const serviceLabels: Record<string, string> = {
              tunnel: "Tunnel SSH",
              backend: "Backend",
              frontend: "Frontend",
            };
            const serviceLabel = serviceLabels[serviceName] || serviceName;

            return (
              <div
                key={serviceName}
                className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                  isRunning
                    ? "bg-green-500/10 border-green-500/30"
                    : status.status === "ERROR"
                    ? "bg-red-500/10 border-red-500/30"
                    : "bg-gray-900/50 border-gray-700"
                }`}
              >
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isRunning
                        ? "bg-green-400 animate-pulse"
                        : status.status === "ERROR"
                        ? "bg-red-400"
                        : "bg-gray-500"
                    }`}
                  />
                  {isTunnel && (
                    <Lock className="w-3.5 h-3.5 text-gray-400" />
                  )}
                  <span className="text-sm text-gray-200 font-medium">
                    {serviceLabel}
                  </span>
                  {!isConfigured && (
                    <Badge variant="outline" className="text-xs text-gray-400">
                      Non configuré
                    </Badge>
                  )}
                  {isConfigured && (
                    <Badge
                      variant={
                        isRunning
                          ? "success"
                          : status.status === "ERROR"
                          ? "error"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {status.status}
                    </Badge>
                  )}
                  {!isTunnel && serviceConfig.port > 0 && (
                    <span className="text-xs text-gray-500">
                      :{serviceConfig.port}
                    </span>
                  )}
                  {isTunnel && (
                    <span className="text-xs text-gray-500 italic">
                      (Base de données)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {/* Bouton Start */}
                  <Button
                    onClick={() =>
                      handleStartService(serviceName, serviceConfig.command)
                    }
                    disabled={isLoading || isRunning || !isConfigured}
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 hover:bg-green-600/20 hover:text-green-400 disabled:opacity-50"
                    title={!isConfigured ? "Configurer le service d'abord" : "Démarrer"}
                  >
                    {isLoading && !isRunning ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                  </Button>

                  {/* Bouton Stop */}
                  <Button
                    onClick={() =>
                      handleStopService(serviceName, serviceConfig.port)
                    }
                    disabled={isLoading || !isRunning || !isConfigured}
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 hover:bg-red-600/20 hover:text-red-400 disabled:opacity-50"
                    title="Arrêter"
                  >
                    {isLoading && isRunning ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Square className="w-3 h-3" />
                    )}
                  </Button>

                  {/* Bouton Open URL (pas pour le tunnel) */}
                  {isRunning && !isTunnel && serviceConfig.port > 0 && (
                    <Button
                      onClick={() => handleOpenUrl(serviceConfig.port)}
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 hover:bg-blue-600/20 hover:text-blue-400"
                      title={`Ouvrir http://localhost:${serviceConfig.port}`}
                    >
                      <Globe className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions globales */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-700">
          <Button
            onClick={handleOpenFolder}
            size="sm"
            variant="ghost"
            className="flex-1 text-xs hover:bg-gray-700/50"
          >
            <FolderOpen className="w-3 h-3 mr-1.5" />
            Dossier
          </Button>
          <Button
            onClick={handleOpenVSCode}
            size="sm"
            variant="ghost"
            className="flex-1 text-xs hover:bg-gray-700/50"
          >
            <Code className="w-3 h-3 mr-1.5" />
            VS Code
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProjectCompactView() {
  const { projects, isLoading, error } = useProjects();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-400">Chargement des projets...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-900/20 border-red-500/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (projects.length === 0) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="pt-6">
          <p className="text-center text-gray-400">
            Aucun projet configuré. Utilisez l'onglet{" "}
            <span className="font-semibold text-blue-400">Configuration → Project Manager</span>{" "}
            pour ajouter des projets.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {projects.map((project) => (
        <ProjectCard key={project.path} project={project} />
      ))}
    </div>
  );
}

