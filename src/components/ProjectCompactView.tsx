import { useState } from "react";
import {
  Play,
  Square,
  FolderOpen,
  Code,
  Globe,
  Loader2,
  AlertCircle,
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
    } finally {
      setLoadingService(null);
    }
  };

  const handleStopService = async (serviceName: string, port: number) => {
    setLoadingService(serviceName);
    try {
      await stopService(project.path, serviceName, port);
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
    <Card className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg text-white mb-1">
              {project.name}
            </CardTitle>
            <p className="text-xs text-gray-400 font-mono truncate">
              {project.path}
            </p>
          </div>
          <Badge variant="secondary" className="ml-2">
            {project.stack}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Services */}
        <div className="space-y-2">
          {project.servicesStatus.map((serviceStatus) => {
            // Trouver le service correspondant par nom
            const service = project.services.find(s => s.name === serviceStatus.name);
            if (!service) return null;
            
            const isRunning = serviceStatus.status === "RUNNING";
            const isLoading = loadingService === service.name;

            return (
              <div
                key={service.name}
                className="flex items-center justify-between p-2 bg-gray-900/50 rounded-lg border border-gray-700"
              >
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isRunning
                        ? "bg-green-400 animate-pulse"
                        : serviceStatus.status === "ERROR"
                        ? "bg-red-400"
                        : "bg-gray-500"
                    }`}
                  />
                  <span className="text-sm text-gray-200 font-medium">
                    {service.name}
                  </span>
                  <Badge
                    variant={
                      isRunning
                        ? "success"
                        : serviceStatus.status === "ERROR"
                        ? "error"
                        : "secondary"
                    }
                    className="text-xs"
                  >
                    {serviceStatus.status}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    :{service.port}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {/* Bouton Start */}
                  <Button
                    onClick={() =>
                      handleStartService(service.name, service.command)
                    }
                    disabled={isLoading || isRunning}
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 hover:bg-green-600/20 hover:text-green-400"
                    title="Démarrer"
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
                      handleStopService(service.name, service.port)
                    }
                    disabled={isLoading || !isRunning}
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 hover:bg-red-600/20 hover:text-red-400"
                    title="Arrêter"
                  >
                    {isLoading && isRunning ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Square className="w-3 h-3" />
                    )}
                  </Button>

                  {/* Bouton Open URL */}
                  {isRunning && (
                    <Button
                      onClick={() => handleOpenUrl(service.port)}
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 hover:bg-blue-600/20 hover:text-blue-400"
                      title={`Ouvrir http://localhost:${service.port}`}
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
        <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
          <Button
            onClick={handleOpenFolder}
            size="sm"
            variant="ghost"
            className="flex-1 text-xs"
          >
            <FolderOpen className="w-3 h-3 mr-1" />
            Dossier
          </Button>
          <Button
            onClick={handleOpenVSCode}
            size="sm"
            variant="ghost"
            className="flex-1 text-xs"
          >
            <Code className="w-3 h-3 mr-1" />
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <ProjectCard key={project.path} project={project} />
      ))}
    </div>
  );
}

