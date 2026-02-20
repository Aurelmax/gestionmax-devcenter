import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { runGmdCommand, GmdResult, GmdRunId, GmdLogEvent, GmdExitEvent } from "@/lib/commands";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

/**
 * Niveau de log (pour coloration/affichage)
 */
export type LogLevel = "info" | "error" | "success" | "warning";

/**
 * Entrée de log structurée
 */
export interface LogEntry {
  ts: string;        // Timestamp ISO
  cmd: string;       // Commande exécutée (ex: "gmdev start tunnel")
  cwd: string;       // Répertoire de travail
  level: LogLevel;   // Niveau de log
  line: string;      // Ligne de log (stdout ou stderr)
}

/**
 * État runtime d'un service
 */
export type ServiceState = "running" | "stopped" | "unknown";

/**
 * État runtime des services (basé sur gmdev status)
 */
export interface RunningState {
  tunnel: ServiceState;
  backend: ServiceState;
  frontend: ServiceState;
}

/**
 * État de la session
 */
export interface SessionState {
  // Sélection repos
  frontRepoPath: string | null;
  backRepoPath: string | null;
  
  // État runtime
  commandInFlight: boolean;
  currentRunId: string | null;  // RunId de la commande en cours
  lastExitCode: number | null;
  runningState: RunningState | null;
  lastStatusRaw: string | null;  // Sortie brute de gmdev status
  
  // Logs structurés
  logs: LogEntry[];
}

interface SessionContextValue {
  state: SessionState;
  setFrontRepoPath: (path: string | null) => void;
  setBackRepoPath: (path: string | null) => void;
  run: (cmdArgs: string[], cwd: string) => Promise<GmdResult>;
  startSession: () => Promise<void>;
  stopSession: () => Promise<void>;
  restartSession: () => Promise<void>;
  status: () => Promise<void>;
  doctor: () => Promise<void>;
  hub: () => Promise<void>;
  killZombies: () => Promise<void>;
  clearLogs: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Clé pour le stockage localStorage
 */
const STORAGE_KEY = "gmdev-session";

/**
 * Charger la session depuis localStorage
 */
function loadSessionFromStorage(): { frontRepoPath: string | null; backRepoPath: string | null } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        frontRepoPath: parsed.frontRepoPath || null,
        backRepoPath: parsed.backRepoPath || null,
      };
    }
  } catch (error) {
    console.warn("Failed to load session from storage:", error);
  }
  return { frontRepoPath: null, backRepoPath: null };
}

/**
 * Sauvegarder la session dans localStorage
 */
function saveSessionToStorage(frontRepoPath: string | null, backRepoPath: string | null) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      frontRepoPath,
      backRepoPath,
    }));
  } catch (error) {
    console.warn("Failed to save session to storage:", error);
  }
}

/**
 * Interface pour le JSON de status retourné par gmdev status --json
 */
interface StatusJson {
  services: {
    tunnel: {
      state: "running" | "stopped";
      port: number;
      pid: number | null;
    };
    backend: {
      state: "running" | "stopped";
      port: number;
      pid: number | null;
    };
    frontend: {
      state: "running" | "stopped";
      port: number;
      pid: number | null;
    };
  };
}

/**
 * Parser le JSON de status retourné par gmdev status --json
 */
function parseStatusJson(jsonStr: string): RunningState {
  try {
    const json: StatusJson = JSON.parse(jsonStr);
    return {
      tunnel: json.services.tunnel.state === "running" ? "running" : "stopped",
      backend: json.services.backend.state === "running" ? "running" : "stopped",
      frontend: json.services.frontend.state === "running" ? "running" : "stopped",
    };
  } catch (error) {
    throw new Error(`Failed to parse status JSON: ${error}`);
  }
}

/**
 * Parser la sortie texte de gmdev status pour extraire l'état des services
 * 
 * Fallback utilisé si --json n'est pas disponible ou si le parsing JSON échoue
 */
function parseStatusOutput(output: string): RunningState {
  const lower = output.toLowerCase();
  
  // Détecter tunnel
  const tunnelRunning = lower.includes("tunnel") && (lower.includes("running") || lower.includes("active"));
  const tunnelStopped = lower.includes("tunnel") && (lower.includes("stopped") || lower.includes("inactive"));
  const tunnel: ServiceState = tunnelRunning ? "running" : tunnelStopped ? "stopped" : "unknown";
  
  // Détecter backend (chercher "back" ou "backend")
  const backRunning = (lower.includes("back") || lower.includes("backend")) && (lower.includes("running") || lower.includes("active"));
  const backStopped = (lower.includes("back") || lower.includes("backend")) && (lower.includes("stopped") || lower.includes("inactive"));
  const backend: ServiceState = backRunning ? "running" : backStopped ? "stopped" : "unknown";
  
  // Détecter frontend (chercher "front" ou "frontend")
  const frontRunning = (lower.includes("front") || lower.includes("frontend")) && (lower.includes("running") || lower.includes("active"));
  const frontStopped = (lower.includes("front") || lower.includes("frontend")) && (lower.includes("stopped") || lower.includes("inactive"));
  const frontend: ServiceState = frontRunning ? "running" : frontStopped ? "stopped" : "unknown";
  
  return { tunnel, backend, frontend };
}

/**
 * Provider pour la session (Front Repo + Back Repo)
 * 
 * Modèle orienté "session" :
 * - Sélection simple de 2 repos (front/back)
 * - Exécution de commandes gmdev avec logs structurés
 * - État runtime basé sur gmdev status
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(() => {
    const stored = loadSessionFromStorage();
    return {
      frontRepoPath: stored.frontRepoPath,
      backRepoPath: stored.backRepoPath,
      commandInFlight: false,
      currentRunId: null,
      lastExitCode: null,
      runningState: null,
      lastStatusRaw: null,
      logs: [],
    };
  });

  // Écouter les events Tauri pour le streaming live
  useEffect(() => {
    let unlistenLog: UnlistenFn | null = null;
    let unlistenExit: UnlistenFn | null = null;

    const setupListeners = async () => {
      // Écouter les events gmd:log
      unlistenLog = await listen<GmdLogEvent>("gmd:log", (event) => {
        const payload = event.payload;
        
        // Vérifier que c'est pour la commande en cours
        setState(prev => {
          if (prev.currentRunId !== payload.run_id) {
            return prev; // Ignorer les events d'autres commandes
          }
          
          // Convertir level "stdout"/"stderr" en LogLevel
          const level: LogLevel = payload.level === "stderr" ? "error" : "info";
          
          // Ajouter le log
          const entry: LogEntry = {
            ts: payload.ts,
            cmd: payload.cmd,
            cwd: payload.cwd,
            level,
            line: payload.line,
          };
          
          return {
            ...prev,
            logs: [...prev.logs, entry].slice(-1000), // Garder 1000 dernières lignes
          };
        });
      });

      // Écouter les events gmd:exit
      unlistenExit = await listen<GmdExitEvent>("gmd:exit", (event) => {
        const payload = event.payload;
        
        // Vérifier que c'est pour la commande en cours
        setState(prev => {
          if (prev.currentRunId !== payload.run_id) {
            return prev; // Ignorer les events d'autres commandes
          }
          
          // Ajouter entrée de log pour la fin de la commande
          const exitEntry: LogEntry = {
            ts: new Date().toISOString(),
            cmd: prev.logs[prev.logs.length - 1]?.cmd || "gmdev",
            cwd: prev.logs[prev.logs.length - 1]?.cwd || "",
            level: payload.exit_code === 0 ? "success" : "error",
            line: `[FIN] Code: ${payload.exit_code}`,
          };
          
          return {
            ...prev,
            commandInFlight: false,
            currentRunId: null,
            lastExitCode: payload.exit_code,
            logs: [...prev.logs, exitEntry].slice(-1000),
          };
        });
      });
    };

    setupListeners().catch(console.error);

    // Cleanup: désabonner les listeners
    return () => {
      if (unlistenLog) {
        unlistenLog();
      }
      if (unlistenExit) {
        unlistenExit();
      }
    };
  }, []); // S'exécute une seule fois au montage

  /**
   * Ajouter une entrée de log
   */
  const addLogEntry = useCallback((entry: LogEntry) => {
    setState(prev => ({
      ...prev,
      logs: [...prev.logs, entry].slice(-1000), // Garder 1000 dernières lignes
    }));
  }, []);

  /**
   * Exécuter une commande gmdev avec streaming live
   * 
   * Utilise runGmdCommand() qui retourne un runId et émet des events Tauri
   * Les logs sont ajoutés automatiquement via les listeners d'events
   */
  const run = useCallback(async (
    cmdArgs: string[],
    cwd: string
  ): Promise<GmdResult> => {
    // Verrou mutex
    if (state.commandInFlight) {
      throw new Error("Une commande est déjà en cours d'exécution");
    }

    const cmd = `gmdev ${cmdArgs.join(" ")}`;
    
    // Ajouter entrée de log pour le début de la commande
    addLogEntry({
      ts: new Date().toISOString(),
      cmd,
      cwd,
      level: "info",
      line: `[DÉBUT] ${cmd}`,
    });

    // Lancer la commande avec streaming
    let runId: string;
    try {
      const result: GmdRunId = await runGmdCommand(cmdArgs, undefined, cwd);
      runId = result.run_id;
      
      // Mettre à jour l'état avec le runId et activer le mutex
      setState(prev => ({
        ...prev,
        commandInFlight: true,
        currentRunId: runId,
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Ajouter l'erreur aux logs
      addLogEntry({
        ts: new Date().toISOString(),
        cmd,
        cwd,
        level: "error",
        line: `[ERREUR] ${errorMsg}`,
      });

      setState(prev => ({ ...prev, lastExitCode: -1 }));
      throw error;
    }

    // Retourner un résultat factice (les vrais logs arrivent via events)
    // Le code de sortie sera mis à jour quand l'event gmd:exit arrive
    return {
      stdout: "",
      stderr: "",
      code: 0, // Sera mis à jour par l'event gmd:exit
    };
  }, [state.commandInFlight, addLogEntry]);

  /**
   * Définir le chemin du repo frontend
   */
  const setFrontRepoPath = useCallback((path: string | null) => {
    setState(prev => ({ ...prev, frontRepoPath: path }));
    saveSessionToStorage(path, state.backRepoPath);
  }, [state.backRepoPath]);

  /**
   * Définir le chemin du repo backend
   */
  const setBackRepoPath = useCallback((path: string | null) => {
    setState(prev => ({ ...prev, backRepoPath: path }));
    saveSessionToStorage(state.frontRepoPath, path);
  }, [state.frontRepoPath]);

  /**
   * Obtenir le statut (gmdev status)
   * 
   * Appelle `gmdev status --json` en priorité, sinon fallback sur format texte
   * Parse la sortie et met à jour runningState
   */
  const status = useCallback(async () => {
    if (!state.backRepoPath) {
      throw new Error("Back repo requis pour status");
    }

    try {
      let result: GmdResult;
      let runningState: RunningState;
      let usedJson = false;

      // Essayer d'abord avec --json si disponible
      try {
        result = await run(["status", "--json"], state.backRepoPath);
        
        // Vérifier si stdout est JSON parseable
        const trimmed = result.stdout.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
          try {
            runningState = parseStatusJson(trimmed);
            usedJson = true;
          } catch (parseError) {
            // JSON invalide, fallback sur texte
            console.warn("status-text-fallback: JSON invalide, utilisation du parsing texte");
            addLogEntry({
              ts: new Date().toISOString(),
              cmd: "gmdev status --json",
              cwd: state.backRepoPath,
              level: "warning",
              line: "[status-text-fallback] JSON invalide, utilisation du parsing texte",
            });
            runningState = parseStatusOutput(result.stdout);
          }
        } else {
          // Pas de JSON, fallback sur texte
          console.warn("status-text-fallback: Pas de JSON, utilisation du parsing texte");
          addLogEntry({
            ts: new Date().toISOString(),
            cmd: "gmdev status --json",
            cwd: state.backRepoPath,
            level: "warning",
            line: "[status-text-fallback] Pas de JSON, utilisation du parsing texte",
          });
          runningState = parseStatusOutput(result.stdout);
        }
      } catch (jsonError) {
        // --json non disponible ou erreur, fallback sur format texte
        console.warn("status-text-fallback: --json non disponible, utilisation du format texte");
        addLogEntry({
          ts: new Date().toISOString(),
          cmd: "gmdev status",
          cwd: state.backRepoPath,
          level: "warning",
          line: "[status-text-fallback] --json non disponible, utilisation du format texte",
        });
        result = await run(["status"], state.backRepoPath);
        runningState = parseStatusOutput(result.stdout);
      }

      setState(prev => ({
        ...prev,
        runningState,
        lastStatusRaw: result.stdout,
      }));
    } catch (error) {
      console.error("Failed to get status:", error);
      throw error;
    }
  }, [state.backRepoPath, run, addLogEntry]);

  /**
   * Démarrer la session (séquence complète)
   * 
   * Séquence :
   * 1) (back cwd) gmdev start tunnel
   * 2) (back cwd) gmdev start back
   * 3) (front cwd) gmdev start front
   * 4) (back cwd) gmdev status
   */
  const startSession = useCallback(async () => {
    if (!state.backRepoPath || !state.frontRepoPath) {
      throw new Error("Front et Back repo requis");
    }

    try {
      // 1) (back cwd) gmdev start tunnel
      await run(["start", "tunnel"], state.backRepoPath);
      
      // 2) (back cwd) gmdev start back
      await run(["start", "back"], state.backRepoPath);
      
      // 3) (front cwd) gmdev start front
      await run(["start", "front"], state.frontRepoPath);
      
      // 4) (back cwd) gmdev status
      await status();
    } catch (error) {
      console.error("Failed to start session:", error);
      throw error;
    }
  }, [state.backRepoPath, state.frontRepoPath, run, status]);

  /**
   * Arrêter la session (séquence complète)
   * 
   * Séquence :
   * 1) (front cwd) gmdev stop front
   * 2) (back cwd) gmdev stop back
   * 3) (back cwd) gmdev stop tunnel
   */
  const stopSession = useCallback(async () => {
    if (!state.backRepoPath || !state.frontRepoPath) {
      throw new Error("Front et Back repo requis");
    }

    try {
      // 1) (front cwd) gmdev stop front
      await run(["stop", "front"], state.frontRepoPath);
      
      // 2) (back cwd) gmdev stop back
      await run(["stop", "back"], state.backRepoPath);
      
      // 3) (back cwd) gmdev stop tunnel
      await run(["stop", "tunnel"], state.backRepoPath);
      
      // Réinitialiser runningState
      setState(prev => ({ ...prev, runningState: null, lastStatusRaw: null }));
    } catch (error) {
      console.error("Failed to stop session:", error);
      throw error;
    }
  }, [state.backRepoPath, state.frontRepoPath, run]);

  /**
   * Redémarrer la session
   */
  const restartSession = useCallback(async () => {
    await stopSession();
    await startSession();
  }, [stopSession, startSession]);

  /**
   * Exécuter gmdev doctor
   */
  const doctor = useCallback(async () => {
    if (!state.backRepoPath) {
      throw new Error("Back repo requis pour doctor");
    }
    await run(["doctor"], state.backRepoPath);
  }, [state.backRepoPath, run]);

  /**
   * Exécuter gmdev hub
   */
  const hub = useCallback(async () => {
    if (!state.backRepoPath) {
      throw new Error("Back repo requis pour hub");
    }
    await run(["hub"], state.backRepoPath);
  }, [state.backRepoPath, run]);

  /**
   * Exécuter gmdev kill-zombies
   */
  const killZombies = useCallback(async () => {
    if (!state.backRepoPath) {
      throw new Error("Back repo requis pour kill-zombies");
    }
    await run(["kill-zombies"], state.backRepoPath);
  }, [state.backRepoPath, run]);

  /**
   * Effacer les logs
   */
  const clearLogs = useCallback(() => {
    setState(prev => ({ ...prev, logs: [] }));
  }, []);

  return (
    <SessionContext.Provider
      value={{
        state,
        setFrontRepoPath,
        setBackRepoPath,
        run,
        startSession,
        stopSession,
        restartSession,
        status,
        doctor,
        hub,
        killZombies,
        clearLogs,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

/**
 * Hook pour utiliser le store de session
 */
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}
