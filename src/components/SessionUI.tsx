import { useState } from "react";
import { useSession } from "@/core/session/session.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Square, RotateCw, RefreshCw, Stethoscope, Hub, Skull, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useEffect, useRef } from "react";

/**
 * Composant UI pour la session (Front Repo + Back Repo)
 * 
 * UX orientée "session" :
 * - Sélecteurs Front/Back repo
 * - Boutons pour actions gmdev
 * - Affichage état runtime
 * - Logs live avec historique
 */
export function SessionUI() {
  const { state, setFrontRepoPath, setBackRepoPath, startSession, stopSession, restartSession, status, doctor, hub, killZombies, clearLogs } = useSession();
  const { toast } = useToast();
  const [frontPathInput, setFrontPathInput] = useState(state.frontRepoPath || "");
  const [backPathInput, setBackPathInput] = useState(state.backRepoPath || "");
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Synchroniser les inputs avec le state (si changé depuis localStorage)
  useEffect(() => {
    setFrontPathInput(state.frontRepoPath || "");
    setBackPathInput(state.backRepoPath || "");
  }, [state.frontRepoPath, state.backRepoPath]);

  // Auto-scroll vers le bas quand de nouveaux logs arrivent
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [state.logs]);

  const handleStart = async () => {
    try {
      setFrontRepoPath(frontPathInput || null);
      setBackRepoPath(backPathInput || null);
      await startSession();
      toast({ title: "Session démarrée", description: "Tous les services sont en cours de démarrage" });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Échec du démarrage",
        variant: "destructive",
      });
    }
  };

  const handleStop = async () => {
    try {
      await stopSession();
      toast({ title: "Session arrêtée", description: "Tous les services sont arrêtés" });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Échec de l'arrêt",
        variant: "destructive",
      });
    }
  };

  const handleRestart = async () => {
    try {
      await restartSession();
      toast({ title: "Session redémarrée", description: "Tous les services ont été redémarrés" });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Échec du redémarrage",
        variant: "destructive",
      });
    }
  };

  const handleStatus = async () => {
    try {
      await status();
      toast({ title: "Statut actualisé" });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Échec de l'actualisation",
        variant: "destructive",
      });
    }
  };

  const handleDoctor = async () => {
    try {
      await doctor();
      toast({ title: "Diagnostic terminé", description: "Vérifiez les logs pour les détails" });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Échec du diagnostic",
        variant: "destructive",
      });
    }
  };

  const handleHub = async () => {
    try {
      await hub();
      toast({ title: "Hub exécuté", description: "Vérifiez les logs pour les détails" });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Échec de l'exécution",
        variant: "destructive",
      });
    }
  };

  const handleKillZombies = async () => {
    try {
      await killZombies();
      toast({ title: "Processus zombies tués" });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Échec",
        variant: "destructive",
      });
    }
  };

  // Grouper les logs par commande pour un affichage plus clair
  const groupedLogs = state.logs.reduce((acc, log) => {
    const key = `${log.cmd}-${log.ts}`;
    if (!acc[key]) {
      acc[key] = {
        cmd: log.cmd,
        cwd: log.cwd,
        ts: log.ts,
        lines: [],
      };
    }
    acc[key].lines.push(log);
    return acc;
  }, {} as Record<string, { cmd: string; cwd: string; ts: string; lines: typeof state.logs }>);

  const logGroups = Object.values(groupedLogs);

  return (
    <div className="space-y-6">
      {/* Sélecteurs Repo */}
      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="front-repo">Front Repo (chemin local)</Label>
            <Input
              id="front-repo"
              value={frontPathInput}
              onChange={(e) => setFrontPathInput(e.target.value)}
              onBlur={() => setFrontRepoPath(frontPathInput || null)}
              placeholder="/home/user/CascadeProjects/myproject/frontend"
              disabled={state.commandInFlight}
              className="font-mono text-sm"
            />
          </div>
          <div>
            <Label htmlFor="back-repo">Back Repo (chemin local)</Label>
            <Input
              id="back-repo"
              value={backPathInput}
              onChange={(e) => setBackPathInput(e.target.value)}
              onBlur={() => setBackRepoPath(backPathInput || null)}
              placeholder="/home/user/CascadeProjects/myproject/backend"
              disabled={state.commandInFlight}
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* État Runtime */}
      <Card>
        <CardHeader>
          <CardTitle>État Runtime</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Commande en cours</span>
            {state.commandInFlight ? (
              <Badge variant="outline" className="bg-yellow-900/20 border-yellow-600">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                En cours...
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-gray-900/20">Inactif</Badge>
            )}
          </div>
          {state.lastExitCode !== null && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Dernier code de sortie</span>
              <Badge variant={state.lastExitCode === 0 ? "default" : "destructive"}>
                {state.lastExitCode}
              </Badge>
            </div>
          )}
          {state.runningState && (
            <div className="space-y-2 pt-2 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm">Tunnel</span>
                <Badge
                  variant={
                    state.runningState.tunnel === "running" ? "default" :
                    state.runningState.tunnel === "stopped" ? "secondary" :
                    "outline"
                  }
                  className={
                    state.runningState.tunnel === "running" ? "bg-green-600" :
                    state.runningState.tunnel === "stopped" ? "bg-gray-600" :
                    "bg-yellow-600"
                  }
                >
                  {state.runningState.tunnel}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Backend</span>
                <Badge
                  variant={
                    state.runningState.backend === "running" ? "default" :
                    state.runningState.backend === "stopped" ? "secondary" :
                    "outline"
                  }
                  className={
                    state.runningState.backend === "running" ? "bg-green-600" :
                    state.runningState.backend === "stopped" ? "bg-gray-600" :
                    "bg-yellow-600"
                  }
                >
                  {state.runningState.backend}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Frontend</span>
                <Badge
                  variant={
                    state.runningState.frontend === "running" ? "default" :
                    state.runningState.frontend === "stopped" ? "secondary" :
                    "outline"
                  }
                  className={
                    state.runningState.frontend === "running" ? "bg-green-600" :
                    state.runningState.frontend === "stopped" ? "bg-gray-600" :
                    "bg-yellow-600"
                  }
                >
                  {state.runningState.frontend}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Boutons Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleStart}
              disabled={state.commandInFlight || !frontPathInput || !backPathInput}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4 mr-2" />
              Start
            </Button>
            <Button
              onClick={handleStop}
              disabled={state.commandInFlight || !frontPathInput || !backPathInput}
              className="bg-red-600 hover:bg-red-700"
            >
              <Square className="w-4 h-4 mr-2" />
              Down
            </Button>
            <Button
              onClick={handleRestart}
              disabled={state.commandInFlight || !frontPathInput || !backPathInput}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RotateCw className="w-4 h-4 mr-2" />
              Restart
            </Button>
            <Button
              onClick={handleStatus}
              disabled={state.commandInFlight || !backPathInput}
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Status
            </Button>
            <Button
              onClick={handleDoctor}
              disabled={state.commandInFlight || !backPathInput}
              variant="outline"
            >
              <Stethoscope className="w-4 h-4 mr-2" />
              Doctor
            </Button>
            <Button
              onClick={handleHub}
              disabled={state.commandInFlight || !backPathInput}
              variant="outline"
            >
              <Hub className="w-4 h-4 mr-2" />
              Hub
            </Button>
            <Button
              onClick={handleKillZombies}
              disabled={state.commandInFlight || !backPathInput}
              variant="outline"
            >
              <Skull className="w-4 h-4 mr-2" />
              Kill Zombies
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Live */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Logs Live</CardTitle>
            <Button onClick={clearLogs} variant="ghost" size="sm">
              <Trash2 className="w-3 h-3 mr-1" />
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto bg-black p-4 font-mono text-xs rounded">
            {state.logs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                Aucun log pour le moment. Exécutez une commande pour voir les logs.
              </div>
            ) : (
              <div className="space-y-3">
                {logGroups.map((group, groupIdx) => (
                  <div key={groupIdx} className="space-y-1 border-l-2 border-gray-700 pl-2">
                    <div className="text-gray-400 text-xs mb-1">
                      [{new Date(group.ts).toLocaleTimeString()}] {group.cmd}
                      <span className="text-gray-600 ml-2">({group.cwd})</span>
                    </div>
                    <div className="space-y-0.5">
                      {group.lines.map((log, lineIdx) => {
                        // Ignorer les lignes [DÉBUT] et [FIN] dans l'affichage groupé
                        if (log.line.startsWith("[DÉBUT]") || log.line.startsWith("[FIN]")) {
                          return null;
                        }
                        
                        return (
                          <div
                            key={lineIdx}
                            className={`whitespace-pre-wrap wrap-break-word ${
                              log.level === "error"
                                ? "text-red-400"
                                : log.level === "success"
                                ? "text-green-400"
                                : log.level === "warning"
                                ? "text-yellow-400"
                                : "text-[#00FF9D]"
                            }`}
                          >
                            {log.line}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
