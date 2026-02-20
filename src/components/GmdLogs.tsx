import { useEffect, useRef } from "react";
import { useRuntime } from "@/core/runtime/runtime.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

/**
 * Composant pour afficher les logs gmdev en temps réel
 * 
 * Affiche les logs du projet actif uniquement (isolés par projet)
 * Les logs sont vidés automatiquement lors du switch de projet
 */
export function GmdLogs() {
  const { state, clearLogs } = useRuntime();
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll vers le bas quand de nouveaux logs arrivent
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [state.logs]);

  // Ne rien afficher si aucun projet actif ou aucun log
  if (!state.activeProjectId || state.logs.length === 0) {
    return null;
  }

  return (
    <Card className="w-full border-gray-700 bg-gray-900">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <span>📋</span>
            <span>Logs gmdev</span>
            {state.commandInFlight && (
              <span className="text-xs text-yellow-400 font-normal">(en cours...)</span>
            )}
          </CardTitle>
          <Button
            onClick={clearLogs}
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs text-gray-400 hover:text-gray-200"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto bg-black p-4 font-mono text-xs">
          <div className="space-y-1">
            {state.logs.map((log, i) => {
              // Détecter les lignes d'erreur pour les colorer différemment
              const isError = log.toLowerCase().includes("erreur") || 
                             log.toLowerCase().includes("error") ||
                             log.toLowerCase().includes("failed");
              const isSuccess = log.includes("✅") || log.toLowerCase().includes("success");
              
              return (
                <div
                  key={i}
                  className={`whitespace-pre-wrap wrap-break-word ${
                    isError
                      ? "text-red-400"
                      : isSuccess
                      ? "text-green-400"
                      : log.startsWith("[")
                      ? "text-gray-400"
                      : "text-[#00FF9D]"
                  }`}
                >
                  {log}
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
