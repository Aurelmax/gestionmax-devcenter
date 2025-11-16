import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Project } from "@/types/Project";

interface AutoScanSummaryProps {
  project: Project;
}

export default function AutoScanSummary({ project }: AutoScanSummaryProps) {
  const hasBackend = !!project.services.backend;
  const hasFrontend = !!project.services.frontend;
  const hasTunnel = !!project.services.tunnel;
  const hasNetdata = !!project.services.netdata;

  const StatusIcon = ({ detected }: { detected: boolean }) => {
    if (detected) {
      return <CheckCircle2 className="w-5 h-5 text-green-400" />;
    }
    return <XCircle className="w-5 h-5 text-gray-500" />;
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-xl">Résumé de la détection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Nom du projet */}
        <div className="pb-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Nom du projet :</span>
            <span className="text-lg font-semibold text-white">{project.name}</span>
          </div>
        </div>

        {/* Chemins */}
        <div className="space-y-2">
          <div>
            <span className="text-sm text-gray-400">Backend Path:</span>
            <p className="text-xs font-mono text-gray-300 mt-1">{project.backend_path}</p>
          </div>
          <div>
            <span className="text-sm text-gray-400">Frontend Path:</span>
            <p className="text-xs font-mono text-gray-300 mt-1">{project.frontend_path}</p>
          </div>
          <div>
            <span className="text-sm text-gray-400">Scripts Path:</span>
            <p className="text-xs font-mono text-gray-300 mt-1">{project.scripts_path}</p>
          </div>
        </div>

        {/* Services détectés */}
        <div className="space-y-3 pt-3 border-t border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300">Services détectés</h3>
          
          {/* Backend */}
          <div className="flex items-center justify-between p-2 bg-gray-900/50 rounded-lg">
            <div className="flex items-center gap-2">
              <StatusIcon detected={hasBackend} />
              <span className="text-sm text-gray-200">Backend Payload</span>
            </div>
            {hasBackend && (
              <div className="flex items-center gap-2">
                {project.services.backend?.port && (
                  <Badge variant="secondary" className="text-xs">
                    Port: {project.services.backend.port}
                  </Badge>
                )}
                <span className="text-xs text-gray-400 font-mono">
                  {project.services.backend?.start}
                </span>
              </div>
            )}
          </div>

          {/* Frontend */}
          <div className="flex items-center justify-between p-2 bg-gray-900/50 rounded-lg">
            <div className="flex items-center gap-2">
              <StatusIcon detected={hasFrontend} />
              <span className="text-sm text-gray-200">Frontend Next.js</span>
            </div>
            {hasFrontend && (
              <div className="flex items-center gap-2">
                {project.services.frontend?.port && (
                  <Badge variant="secondary" className="text-xs">
                    Port: {project.services.frontend.port}
                  </Badge>
                )}
                <span className="text-xs text-gray-400 font-mono">
                  {project.services.frontend?.start}
                </span>
              </div>
            )}
          </div>

          {/* Tunnel SSH */}
          <div className="flex items-center justify-between p-2 bg-gray-900/50 rounded-lg">
            <div className="flex items-center gap-2">
              <StatusIcon detected={hasTunnel} />
              <span className="text-sm text-gray-200">Tunnel SSH</span>
            </div>
            {hasTunnel && (
              <span className="text-xs text-gray-400 font-mono">
                {project.services.tunnel?.start}
                {project.services.tunnel?.stop && ` / ${project.services.tunnel.stop}`}
              </span>
            )}
          </div>

          {/* Netdata */}
          <div className="flex items-center justify-between p-2 bg-gray-900/50 rounded-lg">
            <div className="flex items-center gap-2">
              <StatusIcon detected={hasNetdata} />
              <span className="text-sm text-gray-200">Netdata</span>
            </div>
            {hasNetdata && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  Port: {project.services.netdata?.port}
                </Badge>
                <span className="text-xs text-gray-400 font-mono">
                  {project.services.netdata?.start}
                  {project.services.netdata?.stop && ` / ${project.services.netdata.stop}`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Avertissement si services manquants */}
        {(!hasBackend || !hasFrontend) && (
          <div className="flex items-start gap-2 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-yellow-300 font-medium">Services manquants</p>
              <p className="text-xs text-yellow-400/80 mt-1">
                {!hasBackend && "Backend Payload non détecté. "}
                {!hasFrontend && "Frontend Next.js non détecté. "}
                Le projet sera ajouté avec les services détectés uniquement.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

