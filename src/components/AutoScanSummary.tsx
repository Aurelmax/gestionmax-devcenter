import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProjectScanResult } from "@/types/Project";

interface AutoScanSummaryProps {
  scan: ProjectScanResult;
}

export default function AutoScanSummary({ scan }: AutoScanSummaryProps) {
  const hasBackend = !!scan.backend_path;
  const hasFrontend = !!scan.frontend_path;
  const hasTunnel = !!scan.scripts.tunnel;
  const hasNetdata = !!scan.scripts.netdata;

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
            <span className="text-lg font-semibold text-white">{scan.name}</span>
          </div>
        </div>

        {/* Chemins */}
        <div className="space-y-2">
          <div>
            <span className="text-sm text-gray-400">Backend Path:</span>
            <p className="text-xs font-mono text-gray-300 mt-1">
              {scan.backend_path ?? "Non détecté"}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-400">Frontend Path:</span>
            <p className="text-xs font-mono text-gray-300 mt-1">
              {scan.frontend_path ?? "Non détecté"}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-400">Scripts Path:</span>
            <p className="text-xs font-mono text-gray-300 mt-1">
              {scan.scripts_path ?? "Non détecté"}
            </p>
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
                <Badge variant="secondary" className="text-xs">
                  Port: {scan.backend_port ?? 3010}
                </Badge>
                {scan.backend_start && (
                  <span className="text-xs text-gray-400 font-mono">
                    {scan.backend_start}
                  </span>
                )}
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
                <Badge variant="secondary" className="text-xs">
                  Port: {scan.frontend_port ?? 3000}
                </Badge>
                {scan.frontend_start && (
                  <span className="text-xs text-gray-400 font-mono">
                    {scan.frontend_start}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Tunnel SSH */}
          <div className="flex items-center justify-between p-2 bg-gray-900/50 rounded-lg">
            <div className="flex items-center gap-2">
              <StatusIcon detected={hasTunnel} />
              <span className="text-sm text-gray-200">Tunnel SSH</span>
            </div>
            {hasTunnel && scan.scripts.tunnel && (
              <span className="text-xs text-gray-400 font-mono">
                {scan.scripts.tunnel.start}
                {scan.scripts.tunnel.stop && ` / ${scan.scripts.tunnel.stop}`}
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
                  Port: {scan.scripts.netdata.port}
                </Badge>
                <span className="text-xs text-gray-400 font-mono">
                  {scan.scripts.netdata.start}
                  {scan.scripts.netdata.stop && ` / ${scan.scripts.netdata.stop}`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Avertissement si services manquants */}
        {(!hasBackend || !hasFrontend || scan.warnings.length > 0) && (
          <div className="flex items-start gap-2 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-yellow-300 font-medium">Services manquants</p>
              <div className="space-y-2 mt-1">
                <p className="text-xs text-yellow-400/80">
                  {!hasBackend && "Backend Payload non détecté. "}
                  {!hasFrontend && "Frontend Next.js non détecté. "}
                  Le projet sera ajouté avec les services détectés uniquement.
                </p>
                {scan.warnings.length > 0 && (
                  <ul className="list-disc list-inside text-xs text-yellow-400/80 space-y-1">
                    {scan.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

