# Patch Minimal : UI Orientée "Session"

## 🎯 Objectif

Créer une UI "session" minimale avec sélecteurs Front/Back repo et boutons Start/Status avec logs live.

**Contraintes** :
- Refactor minimal : conserver l'UI existante
- Un seul point d'exécution : `runGmd(args, {cwd})` (déjà existant)
- Mutex : `commandInFlight` (déjà en place)
- Pas de réécriture complète

---

## 📋 Patch Minimal (2 Fichiers)

### Fichier 1 : `src/core/session/session.store.tsx` (CRÉER)

**Store simple pour la session** :

```typescript
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { runGmdCommand, GmdResult } from "@/lib/commands";

interface RunningState {
  tunnel: "running" | "stopped" | "unknown";
  backend: "running" | "stopped" | "unknown";
  frontend: "running" | "stopped" | "unknown";
}

interface LogEntry {
  timestamp: string;
  command: string;
  stdout: string;
  stderr: string;
  code: number;
}

interface SessionState {
  frontRepoPath: string | null;
  backRepoPath: string | null;
  runningState: RunningState | null;
  logs: LogEntry[];
  commandInFlight: boolean;
}

interface SessionContextValue {
  state: SessionState;
  setFrontRepo: (path: string | null) => void;
  setBackRepo: (path: string | null) => void;
  startSession: () => Promise<void>;
  stopSession: () => Promise<void>;
  restartSession: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  runDoctor: () => Promise<void>;
  runHub: () => Promise<void>;
  killZombies: () => Promise<void>;
  clearLogs: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({
    frontRepoPath: null,
    backRepoPath: null,
    runningState: null,
    logs: [],
    commandInFlight: false,
  });

  const addLogEntry = useCallback((entry: LogEntry) => {
    setState(prev => ({
      ...prev,
      logs: [...prev.logs, entry].slice(-1000), // Garder 1000 dernières lignes
    }));
  }, []);

  const runGmd = useCallback(async (
    args: string[],
    cwd: string
  ): Promise<GmdResult> => {
    // Verrou mutex
    if (state.commandInFlight) {
      throw new Error("Une commande est déjà en cours d'exécution");
    }

    setState(prev => ({ ...prev, commandInFlight: true }));

    try {
      const result = await runGmdCommand(args, undefined, cwd);
      
      // Ajouter aux logs
      addLogEntry({
        timestamp: new Date().toISOString(),
        command: `gmdev ${args.join(" ")}`,  // Utiliser "gmdev" (script réel)
        stdout: result.stdout,
        stderr: result.stderr,
        code: result.code,
      });

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      addLogEntry({
        timestamp: new Date().toISOString(),
        command: `gmdev ${args.join(" ")}`,  // Utiliser "gmdev" (script réel)
        stdout: "",
        stderr: errorMsg,
        code: -1,
      });
      throw error;
    } finally {
      setState(prev => ({ ...prev, commandInFlight: false }));
    }
  }, [state.commandInFlight, addLogEntry]);

  const setFrontRepo = useCallback((path: string | null) => {
    setState(prev => ({ ...prev, frontRepoPath: path }));
  }, []);

  const setBackRepo = useCallback((path: string | null) => {
    setState(prev => ({ ...prev, backRepoPath: path }));
  }, []);

  const startSession = useCallback(async () => {
    if (!state.backRepoPath || !state.frontRepoPath) {
      throw new Error("Front et Back repo requis");
    }

    try {
      // 1) (back cwd) gmdev start tunnel
      await runGmd(["start", "tunnel"], state.backRepoPath);
      
      // 2) (back cwd) gmdev start back
      await runGmd(["start", "back"], state.backRepoPath);
      
      // 3) (front cwd) gmdev start front
      await runGmd(["start", "front"], state.frontRepoPath);
      
      // 4) (back cwd) gmdev status
      await refreshStatus();
    } catch (error) {
      console.error("Failed to start session:", error);
      throw error;
    }
  }, [state.backRepoPath, state.frontRepoPath, runGmd]);

  const stopSession = useCallback(async () => {
    if (!state.backRepoPath || !state.frontRepoPath) {
      throw new Error("Front et Back repo requis");
    }

    try {
      // 1) (front cwd) gmdev stop front
      await runGmd(["stop", "front"], state.frontRepoPath);
      
      // 2) (back cwd) gmdev stop back
      await runGmd(["stop", "back"], state.backRepoPath);
      
      // 3) (back cwd) gmdev stop tunnel
      await runGmd(["stop", "tunnel"], state.backRepoPath);
      
      // 4) (optionnel) gmdev kill-zombies
      await runGmd(["kill-zombies"], state.backRepoPath);
      
      // Réinitialiser runningState
      setState(prev => ({ ...prev, runningState: null }));
    } catch (error) {
      console.error("Failed to stop session:", error);
      throw error;
    }
  }, [state.backRepoPath, state.frontRepoPath, runGmd]);

  const restartSession = useCallback(async () => {
    await stopSession();
    await startSession();
  }, [stopSession, startSession]);

  const refreshStatus = useCallback(async () => {
    if (!state.backRepoPath) {
      return;
    }

    try {
      // Essayer d'abord avec --json si disponible
      let result: GmdResult;
      try {
        result = await runGmd(["status", "--json"], state.backRepoPath);
        // Parser JSON si disponible
        // TODO: Implémenter parsing JSON
      } catch {
        // Fallback sur format texte
        result = await runGmd(["status"], state.backRepoPath);
      }

      // Parser le résultat pour extraire l'état
      const output = result.stdout.toLowerCase();
      const runningState: RunningState = {
        tunnel: output.includes("tunnel") && (output.includes("running") || output.includes("active")) 
          ? "running" 
          : output.includes("tunnel") && output.includes("stopped")
          ? "stopped"
          : "unknown",
        backend: output.includes("back") && (output.includes("running") || output.includes("active"))
          ? "running"
          : output.includes("back") && output.includes("stopped")
          ? "stopped"
          : "unknown",
        frontend: output.includes("front") && (output.includes("running") || output.includes("active"))
          ? "running"
          : output.includes("front") && output.includes("stopped")
          ? "stopped"
          : "unknown",
      };

      setState(prev => ({ ...prev, runningState }));
    } catch (error) {
      console.error("Failed to refresh status:", error);
    }
  }, [state.backRepoPath, runGmd]);

  const runDoctor = useCallback(async () => {
    if (!state.backRepoPath) {
      throw new Error("Back repo requis");
    }
    await runGmd(["doctor"], state.backRepoPath);
  }, [state.backRepoPath, runGmd]);

  const runHub = useCallback(async () => {
    if (!state.backRepoPath) {
      throw new Error("Back repo requis");
    }
    await runGmd(["hub"], state.backRepoPath);
  }, [state.backRepoPath, runGmd]);

  const killZombies = useCallback(async () => {
    if (!state.backRepoPath) {
      throw new Error("Back repo requis");
    }
    await runGmd(["kill-zombies"], state.backRepoPath);
  }, [state.backRepoPath, runGmd]);

  const clearLogs = useCallback(() => {
    setState(prev => ({ ...prev, logs: [] }));
  }, []);

  return (
    <SessionContext.Provider
      value={{
        state,
        setFrontRepo,
        setBackRepo,
        startSession,
        stopSession,
        restartSession,
        refreshStatus,
        runDoctor,
        runHub,
        killZombies,
        clearLogs,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}
```

---

### Fichier 2 : `src/components/SessionUI.tsx` (CRÉER)

**Composant UI pour la session** :

```typescript
import { useState } from "react";
import { useSession } from "@/core/session/session.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Play, Square, RotateCw, RefreshCw, Stethoscope, Hub, Skull } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export function SessionUI() {
  const { state, setFrontRepo, setBackRepo, startSession, stopSession, restartSession, refreshStatus, runDoctor, runHub, killZombies, clearLogs } = useSession();
  const { toast } = useToast();
  const [frontPathInput, setFrontPathInput] = useState(state.frontRepoPath || "");
  const [backPathInput, setBackPathInput] = useState(state.backRepoPath || "");

  const handleStart = async () => {
    try {
      setFrontRepo(frontPathInput || null);
      setBackRepo(backPathInput || null);
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
      await refreshStatus();
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
      await runDoctor();
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
      await runHub();
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
              placeholder="/home/user/CascadeProjects/myproject/frontend"
              disabled={state.commandInFlight}
            />
          </div>
          <div>
            <Label htmlFor="back-repo">Back Repo (chemin local)</Label>
            <Input
              id="back-repo"
              value={backPathInput}
              onChange={(e) => setBackPathInput(e.target.value)}
              placeholder="/home/user/CascadeProjects/myproject/backend"
              disabled={state.commandInFlight}
            />
          </div>
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
          {state.commandInFlight && (
            <div className="mt-4 flex items-center gap-2 text-yellow-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Commande en cours...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Running State */}
      {state.runningState && (
        <Card>
          <CardHeader>
            <CardTitle>État des Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Tunnel</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  state.runningState.tunnel === "running" ? "bg-green-600" :
                  state.runningState.tunnel === "stopped" ? "bg-gray-600" :
                  "bg-yellow-600"
                }`}>
                  {state.runningState.tunnel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Backend</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  state.runningState.backend === "running" ? "bg-green-600" :
                  state.runningState.backend === "stopped" ? "bg-gray-600" :
                  "bg-yellow-600"
                }`}>
                  {state.runningState.backend}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Frontend</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  state.runningState.frontend === "running" ? "bg-green-600" :
                  state.runningState.frontend === "stopped" ? "bg-gray-600" :
                  "bg-yellow-600"
                }`}>
                  {state.runningState.frontend}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs Live */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Logs Live</CardTitle>
            <Button onClick={clearLogs} variant="ghost" size="sm">
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto bg-black p-4 font-mono text-xs">
            <div className="space-y-1">
              {state.logs.map((log, i) => (
                <div key={i} className="space-y-1">
                  <div className="text-gray-400 text-xs">
                    [{new Date(log.timestamp).toLocaleTimeString()}] {log.command}
                  </div>
                  {log.stdout && (
                    <div className="text-[#00FF9D] whitespace-pre-wrap">{log.stdout}</div>
                  )}
                  {log.stderr && (
                    <div className="text-red-400 whitespace-pre-wrap">{log.stderr}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 🔧 Intégration dans Dashboard

**Modifier `src/pages/Dashboard.tsx`** :

```typescript
// Ajouter import
import { SessionProvider } from "@/core/session/session.store";
import { SessionUI } from "@/components/SessionUI";

// Dans le return, ajouter SessionUI (à côté ou à la place de ProjectSwitcher)
<SessionProvider>
  <SessionUI />
</SessionProvider>
```

**Ou modifier `src/App.tsx`** :

```typescript
// Ajouter SessionProvider au niveau global
<ProjectProvider>
  <SessionProvider>
    <RuntimeProvider projects={projects}>
      ...
    </RuntimeProvider>
  </SessionProvider>
</ProjectProvider>
```

---

## ⚠️ Notes Importantes

### 1. Commande CLI : `gmd` vs `gmdev`

**Problème** : Le code actuel utilise `gmdev` mais l'utilisateur demande `gmd`.

**Note** : D'après `docs/USAGE_TERMINAL.md`, il existe un alias `gmd='gmdev down'` mais pas de commande `gmd` complète.

**Solution** :
- **Option A** : Utiliser `gmdev` (comme actuellement) et adapter les commandes
- **Option B** : Vérifier si `gmd` existe comme script/alias complet
- **Option C** : Créer un wrapper `gmd` qui appelle `gmdev`

**À vérifier** :
```bash
which gmd
which gmdev
type gmd  # Vérifier si c'est un alias
```

**Recommandation** : Utiliser `gmdev` pour l'instant (script existant) et adapter les commandes selon le format réel.

---

### 2. Format des Commandes

**Format demandé par l'utilisateur** :
- `gmd tunnel up` (séquence individuelle)
- `gmd back up`
- `gmd front up`

**Format actuel de `gmdev`** (d'après le script) :
- `gmdev start <service>` (tunnel|back|front)
- `gmdev stop <service>`
- `gmdev up` (démarre tous les services en séquence)
- `gmdev down` (arrête tous les services)

**Solution** :
- **Option A** : Utiliser `gmdev start tunnel`, `gmdev start back`, `gmdev start front` (format actuel)
- **Option B** : Si `gmd` existe avec format `up/down`, utiliser ce format
- **Option C** : Créer wrapper qui traduit `gmd tunnel up` → `gmdev start tunnel`

**Recommandation** : Utiliser le format actuel de `gmdev` (`start/stop`) pour l'instant, puis adapter si `gmd` existe avec un format différent.

---

### 3. Parsing Status

**Actuellement** : Parsing texte fragile (recherche "running"/"active")

**Amélioration** :
- Vérifier si `gmd status --json` existe
- Si oui : parser JSON pour obtenir état détaillé
- Si non : améliorer parsing texte pour détecter tunnel/back/front séparément

---

## ✅ Checklist Patch Minimal

### Phase 1 : Store Session
- [ ] Créer `src/core/session/session.store.tsx`
- [ ] Implémenter `setFrontRepo()`, `setBackRepo()`
- [ ] Implémenter `runGmd()` wrapper (utilise `runGmdCommand()`)
- [ ] Implémenter `startSession()` (séquence tunnel → back → front → status)
- [ ] Implémenter `stopSession()` (séquence front → back → tunnel → kill-zombies)
- [ ] Implémenter `restartSession()`, `refreshStatus()`, `runDoctor()`, `runHub()`, `killZombies()`

### Phase 2 : UI Session
- [ ] Créer `src/components/SessionUI.tsx`
- [ ] Ajouter sélecteurs Front/Back repo
- [ ] Ajouter boutons : Start, Down, Restart, Status, Doctor, Hub, Kill zombies
- [ ] Ajouter affichage Running State
- [ ] Ajouter affichage Logs Live avec historique
- [ ] Intégrer dans Dashboard

### Phase 3 : Vérifications
- [ ] Vérifier si `gmd` existe ou utiliser `gmdev`
- [ ] Vérifier format des commandes (`up/down` vs `start/stop`)
- [ ] Vérifier si `gmd status --json` existe
- [ ] Tester séquence Start (tunnel → back → front → status)
- [ ] Tester séquence Down (front → back → tunnel → kill-zombies)

---

**Statut** : ✅ Patch minimal proposé - Prêt pour implémentation
