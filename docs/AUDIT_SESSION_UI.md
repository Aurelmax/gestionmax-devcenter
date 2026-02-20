# Audit : UI Orientée "Session" (Front Repo + Back Repo)

## 🎯 Objectif

Passer d'une UI multi-projets à une UI orientée "session" :
- Sélecteur Front repo (chemin local)
- Sélecteur Back repo (chemin local)
- Boutons : Start, Down, Restart, Status, Doctor, Hub, Kill zombies
- Logs live avec historique
- Running state basé sur `gmd status`

---

## 📊 1. Où est exécutée la CLI actuellement ?

### Backend (Rust/Tauri)

**Point d'entrée** : `src-tauri/src/gmd.rs` → `run_gmd()`

```rust
// src-tauri/src/gmd.rs:37
pub fn run_gmd(cmd: GmdCommand) -> Result<GmdResult, String> {
    let mut process = Command::new("gmdev");  // ⚠️ Utilise "gmdev" (pas "gmd")
    // Note: L'utilisateur demande "gmd" mais le script existe sous "gmdev"
    // À vérifier: existe-t-il un alias/symlink "gmd" → "gmdev" ?
    process.args(&cmd.args);
    if let Some(cwd) = &cmd.cwd {
        process.current_dir(cwd);
    }
    match process.output() { ... }  // ⚠️ Synchrone, pas de streaming
}
```

**Commande Tauri** : `src-tauri/src/commands.rs` → `run_gmd_command()`

```rust
#[tauri::command]
pub async fn run_gmd_command(
    args: Vec<String>,
    project_id: Option<String>,
    cwd: Option<String>,
) -> Result<GmdResult, String> {
    let cwd_path = cwd.map(PathBuf::from);
    let cmd = GmdCommand {
        args,
        cwd: cwd_path,
        project_id,
    };
    run_gmd(cmd)
}
```

**Problèmes actuels** :
- ⚠️ Utilise `gmdev` au lieu de `gmd` (à vérifier avec l'utilisateur)
- ⚠️ `cmd.output()` est synchrone → pas de streaming pour logs live
- ⚠️ Pas de gestion d'historique des commandes

---

### Frontend (React/TypeScript)

**Point d'entrée** : `src/lib/commands.ts` → `runGmdCommand()`

```typescript
// src/lib/commands.ts:187
export async function runGmdCommand(
  args: string[],
  projectId?: string,
  cwd?: string
): Promise<GmdResult> {
  return await invoke<GmdResult>("run_gmd_command", {
    args,
    projectId,
    cwd,
  });
}
```

**Store** : `src/core/runtime/runtime.store.tsx` → `runGmd()`

```typescript
// src/core/runtime/runtime.store.tsx:105
const runGmd = useCallback(async (
  args: string[],
  options?: { cwd?: string }
): Promise<GmdResult> => {
  // Verrou mutex
  if (state.commandInFlight) {
    throw new Error("Une commande est déjà en cours d'exécution");
  }
  
  setState(prev => ({ ...prev, commandInFlight: true }));
  
  try {
    const cwd = options?.cwd || state.activeProjectPath || undefined;
    const result = await invoke<GmdResult>("run_gmd_command", { args, cwd });
    
    // Ajouter aux logs
    setState(prev => ({
      ...prev,
      logs: [...prev.logs, result.stdout, result.stderr].slice(-100),
    }));
    
    return result;
  } finally {
    setState(prev => ({ ...prev, commandInFlight: false }));
  }
}, [state.activeProjectId, state.activeProjectPath, state.commandInFlight]);
```

**Problèmes actuels** :
- ⚠️ Logs collectés après la fin de la commande (pas live)
- ⚠️ Historique limité à 100 lignes
- ⚠️ Pas de séparation entre stdout/stderr dans l'affichage

---

## 📊 2. Où est stockée la sélection repo/front/back ?

### Actuellement : Modèle Multi-Projets

**Stockage** : `~/.gestionmax-devcenter/projects-v3.json`

**Structure** :
```typescript
// src/types/ProjectV3.ts
interface ProjectV3 {
  id: string;
  name: string;
  rootPath: string;        // Chemin racine du projet
  backendPath: string;     // Chemin backend
  frontendPath: string;    // Chemin frontend
  ports: { backend: number; frontend: number };
  // ...
}
```

**Chargement** : `src/lib/projectManager.ts` → `loadProjectsV3()`

**Problèmes actuels** :
- ⚠️ Stockage dans fichier JSON (persistant)
- ⚠️ Modèle orienté "projet" avec ID, nom, etc.
- ⚠️ Pas de sélection simple Front/Back repo pour une session

---

### Nouveau modèle souhaité : Session

**Stockage souhaité** : État local (session) dans le store React

**Structure souhaitée** :
```typescript
interface SessionState {
  frontRepoPath: string | null;  // Chemin repo frontend
  backRepoPath: string | null;    // Chemin repo backend
  runningState: RunningState | null;  // État basé sur gmd status
  logs: LogEntry[];               // Historique des commandes
  commandHistory: CommandEntry[];  // Historique des actions
}
```

---

## 📊 3. Où sont gérés logs et status ?

### Logs Actuels

**Stockage** : `src/core/runtime/runtime.store.tsx` → `state.logs: string[]`

```typescript
// runtime.store.tsx:28
logs: string[],  // Logs du projet actif uniquement
```

**Affichage** : `src/components/GmdLogs.tsx`

```typescript
// GmdLogs.tsx:14
const { state, clearLogs } = useRuntime();
// Affiche state.logs avec coloration syntaxique
```

**Problèmes actuels** :
- ⚠️ Logs mélangés (stdout + stderr dans le même tableau)
- ⚠️ Pas de timestamp par ligne
- ⚠️ Pas de séparation par commande
- ⚠️ Pas de streaming live (collectés après la fin)

---

### Status Actuels

**Stockage** : `src/core/runtime/runtime.store.tsx` → `state.status: ProjectStatus | null`

```typescript
// runtime.store.tsx:27
status: ProjectStatus | null;  // "STOPPED" | "STARTING" | "RUNNING" | "STOPPING" | "ERROR"
```

**Rafraîchissement** : `refreshActiveStatus()` dans `runtime.store.tsx`

```typescript
// runtime.store.tsx:63
const refreshActiveStatus = useCallback(async () => {
  const result = await runGmdCommand(["status"], undefined, project.rootPath);
  const output = result.stdout.toLowerCase();
  const isRunning = output.includes("running") || output.includes("active");
  const status: ProjectStatus = isRunning ? "RUNNING" : "STOPPED";
  setState(prev => ({ ...prev, status }));
}, [state.activeProjectId, state.activeProjectPath, projects]);
```

**Problèmes actuels** :
- ⚠️ Parsing texte fragile (recherche "running" ou "active")
- ⚠️ Pas de support pour `gmd status --json` (si disponible)
- ⚠️ Status simplifié (RUNNING/STOPPED) sans détails par service

---

## 🔧 Patch Minimal Proposé

### Objectif

Créer une UI "session" minimale avec :
1. Sélecteurs Front/Back repo
2. Boutons Start/Status avec logs live
3. Utiliser `runGmd()` existant (point d'exécution unique)
4. Mutex déjà en place (`commandInFlight`)

---

### Fichiers à Créer/Modifier

#### 1. Créer `src/core/session/session.store.tsx`

**Nouveau store pour la session** :

```typescript
interface SessionState {
  frontRepoPath: string | null;
  backRepoPath: string | null;
  runningState: {
    tunnel: "running" | "stopped" | "unknown";
    backend: "running" | "stopped" | "unknown";
    frontend: "running" | "stopped" | "unknown";
  } | null;
  logs: LogEntry[];
  commandHistory: CommandEntry[];
  commandInFlight: boolean;
}

interface LogEntry {
  timestamp: string;
  command: string;
  stdout: string;
  stderr: string;
  code: number;
}

interface CommandEntry {
  timestamp: string;
  command: string;
  args: string[];
  cwd: string;
  success: boolean;
}
```

**Fonctions** :
- `setFrontRepo(path: string | null)`
- `setBackRepo(path: string | null)`
- `runGmd(args: string[], options?: { cwd?: string })` (wrapper vers runtime.store)
- `startSession()` (séquence : tunnel → back → front → status)
- `stopSession()` (séquence : front → back → tunnel → kill-zombies)
- `refreshStatus()` (gmd status avec parsing)

---

#### 2. Créer `src/components/SessionUI.tsx`

**Composant principal pour la session** :

```typescript
export function SessionUI() {
  const { state, setFrontRepo, setBackRepo, startSession, stopSession, refreshStatus } = useSession();
  
  return (
    <div>
      {/* Sélecteurs */}
      <RepoSelector 
        label="Front Repo"
        value={state.frontRepoPath}
        onChange={setFrontRepo}
      />
      <RepoSelector 
        label="Back Repo"
        value={state.backRepoPath}
        onChange={setBackRepo}
      />
      
      {/* Boutons */}
      <div className="flex gap-2">
        <Button onClick={startSession} disabled={state.commandInFlight}>
          Start
        </Button>
        <Button onClick={stopSession} disabled={state.commandInFlight}>
          Down
        </Button>
        <Button onClick={refreshStatus} disabled={state.commandInFlight}>
          Status
        </Button>
        {/* Restart, Doctor, Hub, Kill zombies */}
      </div>
      
      {/* Running State */}
      <RunningStateDisplay state={state.runningState} />
      
      {/* Logs Live */}
      <SessionLogs logs={state.logs} />
    </div>
  );
}
```

---

#### 3. Modifier `src/core/runtime/runtime.store.tsx`

**Ajouter fonction helper pour logs avec historique** :

```typescript
// Ajouter dans RuntimeProvider
const addLogEntry = useCallback((entry: LogEntry) => {
  setState(prev => ({
    ...prev,
    logs: [...prev.logs, entry].slice(-1000), // Garder plus d'historique
    commandHistory: [...prev.commandHistory, {
      timestamp: entry.timestamp,
      command: entry.command,
      args: entry.command.split(" "),
      cwd: state.activeProjectPath || "",
      success: entry.code === 0,
    }].slice(-50), // Garder 50 dernières commandes
  }));
}, [state.activeProjectPath]);
```

---

#### 4. Modifier `src-tauri/src/gmd.rs` (Optionnel pour streaming)

**Pour logs live, ajouter fonction de streaming** :

```rust
// Optionnel : pour logs live
pub fn run_gmd_stream(cmd: GmdCommand) -> impl Stream<Item = String> {
    // Utiliser Command::spawn() au lieu de output()
    // Lire stdout ligne par ligne
    // Émettre chaque ligne via un channel
}
```

**Note** : Pour l'instant, on peut garder `run_gmd()` synchrone et collecter les logs après. Le streaming peut être ajouté plus tard.

---

### Séquence Start (Implémentation)

```typescript
// src/core/session/session.store.tsx
const startSession = useCallback(async () => {
  if (!state.backRepoPath || !state.frontRepoPath) {
    throw new Error("Front et Back repo requis");
  }
  
  if (state.commandInFlight) {
    throw new Error("Une commande est déjà en cours");
  }
  
  setState(prev => ({ ...prev, commandInFlight: true }));
  
  try {
    // 1) (back cwd) gmd tunnel up
    await runGmd(["tunnel", "up"], { cwd: state.backRepoPath });
    
    // 2) (back cwd) gmd back up
    await runGmd(["back", "up"], { cwd: state.backRepoPath });
    
    // 3) (front cwd) gmd front up
    await runGmd(["front", "up"], { cwd: state.frontRepoPath });
    
    // 4) (back cwd) gmd status
    const statusResult = await runGmd(["status"], { cwd: state.backRepoPath });
    // Parser statusResult et mettre à jour runningState
    
  } catch (error) {
    // Gérer erreur
  } finally {
    setState(prev => ({ ...prev, commandInFlight: false }));
  }
}, [state.backRepoPath, state.frontRepoPath, state.commandInFlight]);
```

---

### Séquence Down (Implémentation)

```typescript
const stopSession = useCallback(async () => {
  if (!state.backRepoPath || !state.frontRepoPath) {
    throw new Error("Front et Back repo requis");
  }
  
  if (state.commandInFlight) {
    throw new Error("Une commande est déjà en cours");
  }
  
  setState(prev => ({ ...prev, commandInFlight: true }));
  
  try {
    // 1) (front cwd) gmd front down
    await runGmd(["front", "down"], { cwd: state.frontRepoPath });
    
    // 2) (back cwd) gmd back down
    await runGmd(["back", "down"], { cwd: state.backRepoPath });
    
    // 3) (back cwd) gmd tunnel down
    await runGmd(["tunnel", "down"], { cwd: state.backRepoPath });
    
    // 4) (optionnel) gmd kill-zombies
    await runGmd(["kill-zombies"], { cwd: state.backRepoPath });
    
    // Réinitialiser runningState
    setState(prev => ({ ...prev, runningState: null }));
    
  } catch (error) {
    // Gérer erreur
  } finally {
    setState(prev => ({ ...prev, commandInFlight: false }));
  }
}, [state.backRepoPath, state.frontRepoPath, state.commandInFlight]);
```

---

## ✅ Checklist Patch Minimal

### Phase 1 : Store Session
- [ ] Créer `src/core/session/session.store.tsx`
- [ ] Définir `SessionState` avec `frontRepoPath`, `backRepoPath`, `runningState`, `logs`, `commandHistory`
- [ ] Implémenter `setFrontRepo()`, `setBackRepo()`
- [ ] Implémenter `runGmd()` wrapper (utilise `runGmd()` de runtime.store)
- [ ] Implémenter `startSession()` (séquence tunnel → back → front → status)
- [ ] Implémenter `stopSession()` (séquence front → back → tunnel → kill-zombies)
- [ ] Implémenter `refreshStatus()` avec parsing `gmd status` (ou `--json` si disponible)

### Phase 2 : UI Session
- [ ] Créer `src/components/SessionUI.tsx`
- [ ] Créer `src/components/RepoSelector.tsx` (sélecteur de chemin)
- [ ] Créer `src/components/RunningStateDisplay.tsx` (affichage état)
- [ ] Créer `src/components/SessionLogs.tsx` (logs avec historique)
- [ ] Ajouter boutons : Start, Down, Restart, Status, Doctor, Hub, Kill zombies
- [ ] Intégrer dans Dashboard (remplacer ou à côté de ProjectSwitcher)

### Phase 3 : Parsing Status
- [ ] Vérifier si `gmd status --json` existe
- [ ] Si oui : parser JSON et afficher état détaillé
- [ ] Si non : améliorer parsing texte pour détecter tunnel/back/front

---

## 🎯 Résultat Attendu

**UI Session** :
- Sélecteurs Front/Back repo (chemins locaux)
- Boutons fonctionnels avec séquences correctes
- Logs live avec historique des commandes
- Running state basé sur `gmd status`
- Mutex fonctionnel (une action à la fois)

---

**Statut** : ✅ Audit terminé - Prêt pour implémentation du patch minimal
