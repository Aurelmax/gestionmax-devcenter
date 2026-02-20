# Audit : Migration GMDF vers `gmdev` CLI

## 📊 1. Cartographie Rapide

### Stack Technique

- **Frontend** : React 19 + TypeScript + TailwindCSS + Vite
- **Backend** : Tauri v2 (Rust)
- **Communication** : IPC Tauri (`invoke()`)
- **CLI Cible** : `gmdev` (script bash dans `/home/gestionmax-aur-lien/CascadeProjects/gestionmax-devcenter/gmdev`)

### Commandes `gmdev` Disponibles

D'après le script `gmdev` (lignes 1185-1307) :

```bash
gmdev status [project_id]              # Statut des services
gmdev start <service> [project_id]     # tunnel|back|front
gmdev stop <service> [project_id]      # tunnel|back|front
gmdev restart <service> [project_id]   # tunnel|back|front
gmdev up [project_id]                 # Démarre tous les services
gmdev down [project_id]                # Arrête tous les services
gmdev activate [project_id]            # Active un projet
gmdev deactivate [project_id]          # Désactive un projet
gmdev doctor [project_id]              # Diagnostic système
gmdev logs <service> [--tail N] [project_id]  # Logs d'un service
gmdev kill-zombies                     # Tue les processus zombies
```

**Note** : `gmdev` accepte `project_id` comme argument optionnel. Si non fourni, il détecte automatiquement depuis le `cwd`.

### Exécution de Commandes Actuelle

**Méthode** : `std::process::Command` dans Rust (synchrone)

```rust
// src-tauri/src/commands.rs:67-86
fn run_gmdev_command(args: &[&str], cwd: Option<PathBuf>) -> ScriptResult {
    let mut cmd = Command::new("gmdev");
    cmd.args(args);
    if let Some(dir) = cwd {
        cmd.current_dir(dir);
    }
    match cmd.output() { ... } // ⚠️ output() = synchrone, bloque jusqu'à la fin
}
```

**Problèmes** :
- ⚠️ `cmd.output()` est synchrone → pas de streaming pour logs live
- ⚠️ Pas de gestion d'erreur fine (juste code de retour)
- ⚠️ Pas de verrou mutex pour séquentialiser les commandes

### Configuration Projets

**Fichier** : `~/.gestionmax-devcenter/projects-v3.json`

**Chargement** : `load_projects_v3()` dans `src-tauri/src/projects_v3.rs`

**Structure** :
```typescript
interface ProjectV3 {
  id: string;
  name: string;
  rootPath: string;        // ← Utilisé comme cwd pour gmdev
  backendPath: string;
  frontendPath: string;
  ports: { backend: number; frontend: number };
  commands?: { backend?: string; frontend?: string };
  tunnel?: TunnelConfig;
  enabled?: boolean;
}
```

### État Global Actuel

#### A. Rust (Backend)

**`AppState`** : `src-tauri/src/state.rs`
- Stocke les PIDs des services (HashMap<String, u32>)
- ⚠️ **OBSOLÈTE** : Les PIDs sont maintenant gérés par `gmdev` (fichiers PID dans `~/.local/state/gmdev/pids/`)

#### B. React (Frontend)

**`RuntimeState`** : `src/core/runtime/runtime.store.tsx`
- ✅ `activeProjectId: string | null` - Projet actif
- ✅ `projects: Record<string, ProjectRuntime>` - Statuts par projet
- ✅ `switching: boolean` - Verrou mutex pour switch
- ✅ **BON** : État centralisé pour le projet actif

**`ProjectContext`** : `src/core/projects/project.context.tsx`
- Liste des projets
- Projet actif
- ⚠️ **PARTIELLEMENT OBSOLÈTE** : Logique d'activation/désactivation dupliquée avec RuntimeState

### Logs/Streams Actuels

**Actuellement** :
- `get_gmdev_logs()` : Lit les logs via `gmdev logs --tail N`
- ⚠️ **Pas de streaming** : Lecture synchrone via `cmd.output()`
- ⚠️ **Pas de WebSocket/Event** : Pas de mécanisme pour recevoir les logs en temps réel
- ⚠️ **Logs dans fichiers** : `gmdev` écrit dans `~/.local/state/gmdev/logs/<project>.<service>.log`

---

## ⚠️ 2. Problèmes Actuels

### 2.1 Points de "Bordel Multi-Projets"

#### A. État Dupliqué
- **`ProjectContext`** : Gère `activeProject` avec logique d'activation (`activateProject`, `deactivateProject`)
- **`RuntimeState`** : Gère `activeProjectId` avec logique de switch (`switchProject`)
- **Problème** : Deux sources de vérité pour le projet actif

#### B. Logique de Services Dispersée
- **`startServiceV3()`** : Appelle `gmdev start <service> <project_id>`
- **`switchProject()`** : Appelle `startServiceV3()` plusieurs fois (tunnel → backend → frontend)
- **Problème** : Pas de fonction unique `runGmd()` centralisée. Chaque fonction refait le chargement de projet.

#### C. Dépendances Implicites au Workspace
- `run_gmdev_command()` utilise `cwd: Option<PathBuf>` (rootPath du projet)
- `gmdev` détecte automatiquement le projet depuis le `cwd` si `project_id` non fourni
- **Problème** : Si `gmdev` change sa détection, le code casse. Mieux vaut toujours passer `project_id` explicitement.

### 2.2 Doublons de Logique

#### A. Mapping Service → gmdev (Répété 3x)
```rust
// Répété dans start_service_v3, stop_service_v3, status_service_v3
let gmdev_service = match service.as_str() {
    "backend" => "back",
    "frontend" => "front",
    "tunnel" => "tunnel",
    _ => return Err(...),
};
```

#### B. Vérification gmdev Disponible (Répétée 5x+)
```rust
// Répété dans chaque fonction
if !is_gmdev_available() {
    return Err("gmdev n'est pas disponible...");
}
```

#### C. Chargement Projet (Répété 5x+)
```rust
// Répété dans chaque fonction
let cfg = load_projects_v3().await?;
let project = get_project_by_id(&cfg, &project_id)?;
let cwd = Some(PathBuf::from(&project.root_path));
```

### 2.3 Actions Concurrentes

#### A. Pas de Verrou Global
- `RuntimeState.switching` existe mais seulement pour `switchProject()`
- `startServiceV3()` et `stopServiceV3()` n'ont pas de verrou
- **Problème** : Double clic possible sur Start/Stop → plusieurs `gmdev` en parallèle

#### B. Pas de Séquentialisation
- Plusieurs appels `gmdev` peuvent être lancés en parallèle
- **Problème** : Race conditions possibles (ex: `gmdev up` pendant qu'un `gmdev down` est en cours)

### 2.4 Parsing Fragile

#### A. Parsing Texte de `gmdev status`
```rust
// src-tauri/src/commands.rs:948
let output = result.stdout.to_lowercase();
if output.contains(gmdev_service) && (output.contains("running") || output.contains("active")) {
    return Ok("RUNNING".into());
}
```
**Problème** : Parsing fragile, dépend du format texte de `gmdev`. Si le format change, ça casse.

**Solution** : Vérifier si `gmdev status --json` existe, sinon améliorer le parsing.

### 2.5 Logs Non Live

#### A. Pas de Streaming
- `cmd.output()` bloque jusqu'à la fin de la commande
- **Problème** : Pour `gmdev up`, l'utilisateur ne voit rien pendant 10-30 secondes

**Solution** : Utiliser `cmd.spawn()` + lire `stdout` ligne par ligne avec un thread.

---

## ✅ 3. Proposition d'Évolution MINIMALE

### 3.1 Module Unique `runGmd`

**Créer** : `src-tauri/src/gmd.rs`

```rust
use std::path::PathBuf;
use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct GmdCommand {
    pub args: Vec<String>,
    pub cwd: Option<PathBuf>,
    pub project_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GmdResult {
    pub stdout: String,
    pub stderr: String,
    pub code: i32,
}

/// Exécute une commande gmdev de manière centralisée
pub fn run_gmd(cmd: GmdCommand) -> Result<GmdResult, String> {
    // Vérifier que gmdev est disponible (une seule fois)
    if !is_gmd_available() {
        return Err("gmdev n'est pas disponible. Installez-le et ajoutez-le à votre PATH.".to_string());
    }
    
    let mut process = Command::new("gmdev");
    process.args(&cmd.args);
    
    // Ajouter project_id comme dernier argument si fourni
    // gmdev accepte project_id comme argument optionnel
    if let Some(project_id) = &cmd.project_id {
        // Vérifier si la commande accepte déjà un project_id
        // Sinon, l'ajouter à la fin
        process.arg(project_id);
    }
    
    // Définir le cwd si fourni (pour détection auto si project_id non fourni)
    if let Some(cwd) = &cmd.cwd {
        process.current_dir(cwd);
    }
    
    // Exécuter
    match process.output() {
        Ok(output) => Ok(GmdResult {
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            code: output.status.code().unwrap_or(-1),
        }),
        Err(e) => Err(format!("Erreur lors de l'exécution de gmdev: {}", e)),
    }
}

fn is_gmd_available() -> bool {
    Command::new("gmdev")
        .arg("--version")
        .output()
        .is_ok()
}
```

### 3.2 Store Simple avec Verrou

**Créer** : `src/core/gmd/gmd.store.tsx`

```typescript
import { createContext, useContext, useState, useCallback } from "react";

interface GmdState {
  activeProjectId: string | null;
  activeProjectPath: string | null;
  commandInFlight: boolean; // Verrou mutex
  logs: string[];
  lastStatus: Record<string, any> | null;
}

interface GmdContextValue {
  state: GmdState;
  runGmd: (args: string[], options?: { projectId?: string }) => Promise<any>;
  clearLogs: () => void;
}

const GmdContext = createContext<GmdContextValue | null>(null);

export function GmdProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GmdState>({
    activeProjectId: null,
    activeProjectPath: null,
    commandInFlight: false,
    logs: [],
    lastStatus: null,
  });

  const runGmd = useCallback(async (
    args: string[],
    options?: { projectId?: string }
  ) => {
    // Verrou mutex
    if (state.commandInFlight) {
      throw new Error("Une commande est déjà en cours d'exécution");
    }

    setState(prev => ({ ...prev, commandInFlight: true }));

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke("run_gmd", {
        args,
        projectId: options?.projectId || state.activeProjectId,
        cwd: state.activeProjectPath,
      });

      // Ajouter aux logs
      setState(prev => ({
        ...prev,
        logs: [...prev.logs, result.stdout, result.stderr].filter(Boolean),
      }));

      return result;
    } finally {
      setState(prev => ({ ...prev, commandInFlight: false }));
    }
  }, [state]);

  const clearLogs = useCallback(() => {
    setState(prev => ({ ...prev, logs: [] }));
  }, []);

  return (
    <GmdContext.Provider value={{ state, runGmd, clearLogs }}>
      {children}
    </GmdContext.Provider>
  );
}

export function useGmd() {
  const context = useContext(GmdContext);
  if (!context) {
    throw new Error("useGmd must be used within GmdProvider");
  }
  return context;
}
```

### 3.3 Wiring des Boutons

**Modifier** : `src/components/ProjectSwitcher.tsx`

```typescript
// AVANT
import { useRuntime } from "@/core/runtime/runtime.store";
const { switchProject } = useRuntime();

// APRÈS
import { useGmd } from "@/core/gmd/gmd.store";
import { useRuntime } from "@/core/runtime/runtime.store";

const { runGmd, state } = useGmd();
const { activeProjectId } = useRuntime();

const handleStart = async (projectId: string) => {
  // Si un autre projet est actif, le stopper d'abord
  if (activeProjectId && activeProjectId !== projectId) {
    await runGmd(["down"], { projectId: activeProjectId });
  }
  // Démarrer le projet cible
  await runGmd(["up"], { projectId });
};

const handleStop = async (projectId: string) => {
  await runGmd(["down"], { projectId });
};

const handleStatus = async (projectId: string) => {
  const result = await runGmd(["status"], { projectId });
  // Parser le résultat et mettre à jour le statut
  console.log("Status:", result.stdout);
};

<button 
  onClick={() => isRunning ? handleStop(project.id) : handleStart(project.id)}
  disabled={state.commandInFlight}
>
  {state.commandInFlight ? "..." : (isRunning ? "Stop" : "Start")}
</button>
```

### 3.4 Affichage Logs Live (Optionnel PR3)

**Créer** : `src/components/GmdLogs.tsx`

```typescript
import { useGmd } from "@/core/gmd/gmd.store";
import { useEffect, useRef } from "react";

export function GmdLogs() {
  const { state } = useGmd();
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.logs]);

  if (state.logs.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-900 p-4 rounded-lg font-mono text-sm border border-gray-700">
      <div className="text-gray-400 mb-2 text-xs font-semibold">
        📋 Logs gmdev {state.commandInFlight && "(en cours...)"}
      </div>
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {state.logs.map((log, i) => (
          <div key={i} className="text-gray-300 text-xs whitespace-pre-wrap">
            {log}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
```

---

## 📋 Plan en 3 PRs

### PR 1 : Module `runGmd` Centralisé

**Objectif** : Créer le module unique pour exécuter `gmdev`

**Fichiers** :
- ✅ Créer `src-tauri/src/gmd.rs`
- ✅ Créer commande Tauri `run_gmd` dans `src-tauri/src/commands.rs`
- ✅ Modifier `src-tauri/src/lib.rs` (ajouter module + commande)

**Changements** :
```rust
// src-tauri/src/gmd.rs (NOUVEAU)
pub fn run_gmd(cmd: GmdCommand) -> Result<GmdResult, String> { ... }

// src-tauri/src/commands.rs (MODIFIER)
// Remplacer run_gmdev_command() par run_gmd() depuis gmd.rs
// Supprimer les vérifications répétées is_gmdev_available()
```

**Tests** :
- ✅ `run_gmd(["status"])` fonctionne
- ✅ `run_gmd(["up"], { projectId })` fonctionne
- ✅ Vérification gmdev disponible centralisée

**Impact** : Aucun changement visible, infrastructure seulement

---

### PR 2 : Wiring des Boutons Existants

**Objectif** : Router les actions UI vers `runGmd`

**Fichiers** :
- ✅ Créer `src/core/gmd/gmd.store.tsx`
- ✅ Modifier `src/core/runtime/switchProject.ts` : Utiliser `runGmd(["up"])` et `runGmd(["down"])`
- ✅ Modifier `src/components/ProjectSwitcher.tsx` : Utiliser `runGmd` directement
- ✅ Modifier `src/App.tsx` : Ajouter `GmdProvider`

**Changements** :
```typescript
// AVANT
await startServiceV3(projectId, "tunnel");
await startServiceV3(projectId, "backend");
await startServiceV3(projectId, "frontend");

// APRÈS
await runGmd(["up"], { projectId });
```

**Tests** :
- ✅ Bouton Start appelle `gmdev up <project_id>`
- ✅ Bouton Stop appelle `gmdev down <project_id>`
- ✅ Switch A → B appelle `gmdev down <A>` puis `gmdev up <B>`
- ✅ Verrou empêche les doubles clics

**Impact** : Les boutons fonctionnent via `gmdev` au lieu de logique interne

---

### PR 3 : Logs Live + Status JSON

**Objectif** : Afficher les logs en temps réel et améliorer le parsing

**Fichiers** :
- ✅ Modifier `src-tauri/src/gmd.rs` : Ajouter `run_gmd_stream()` avec spawn()
- ✅ Créer `src/components/GmdLogs.tsx` : Composant pour afficher les logs
- ✅ Modifier `src/pages/Dashboard.tsx` : Ajouter `<GmdLogs />`
- ✅ Améliorer parsing status : Vérifier si `gmdev status --json` existe

**Tests** :
- ✅ Logs s'affichent en temps réel pendant `gmdev up`
- ✅ Status JSON parsé correctement (si disponible)
- ✅ Fallback sur parsing texte si `--json` non disponible

**Impact** : Logs visibles en temps réel, status plus fiable

---

## 📝 Liste des Fichiers (Par Priorité)

### Priorité 1 : Infrastructure (PR 1)

1. **`src-tauri/src/gmd.rs`** - **CRÉER**
   - Fonction `run_gmd()` centralisée
   - Fonction `is_gmd_available()`
   - Structures `GmdCommand` et `GmdResult`

2. **`src-tauri/src/commands.rs`** - **MODIFIER**
   - Remplacer `run_gmdev_command()` par `run_gmd()` depuis `gmd.rs`
   - Supprimer les vérifications répétées `is_gmdev_available()`
   - Centraliser le chargement de projet dans une fonction helper

3. **`src-tauri/src/lib.rs`** - **MODIFIER**
   - Ajouter `mod gmd;`
   - Exporter la nouvelle commande Tauri `run_gmd`

### Priorité 2 : Store + Wiring (PR 2)

4. **`src/core/gmd/gmd.store.tsx`** - **CRÉER**
   - Store simple avec verrou mutex
   - Fonction `runGmd()` wrapper

5. **`src/core/runtime/switchProject.ts`** - **MODIFIER**
   - Remplacer `startServiceV3()` par `runGmd(["up"])`
   - Remplacer `stopServiceV3()` par `runGmd(["down"])`

6. **`src/components/ProjectSwitcher.tsx`** - **MODIFIER**
   - Utiliser `useGmd()` au lieu de `useRuntime()` pour les actions
   - Simplifier les handlers Start/Stop

7. **`src/App.tsx`** - **MODIFIER**
   - Ajouter `<GmdProvider>` autour de l'app

### Priorité 3 : Logs + Status (PR 3)

8. **`src/components/GmdLogs.tsx`** - **CRÉER**
   - Composant pour afficher les logs live

9. **`src/pages/Dashboard.tsx`** - **MODIFIER**
   - Ajouter `<GmdLogs />` dans l'UI

10. **`src-tauri/src/gmd.rs`** - **MODIFIER**
    - Ajouter `run_gmd_stream()` pour logs live (spawn + thread)

---

## 🔧 Patch Minimal (Pseudo-Diff)

### A) Création de `runGmd`

**Fichier** : `src-tauri/src/gmd.rs` (NOUVEAU)

```rust
use std::path::PathBuf;
use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct GmdCommand {
    pub args: Vec<String>,
    pub cwd: Option<PathBuf>,
    pub project_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GmdResult {
    pub stdout: String,
    pub stderr: String,
    pub code: i32,
}

/// Exécute une commande gmdev de manière centralisée
pub fn run_gmd(cmd: GmdCommand) -> Result<GmdResult, String> {
    if !is_gmd_available() {
        return Err("gmdev n'est pas disponible. Installez-le et ajoutez-le à votre PATH.".to_string());
    }
    
    let mut process = Command::new("gmdev");
    process.args(&cmd.args);
    
    // Ajouter project_id comme dernier argument si fourni
    // Format: gmdev <command> [args...] [project_id]
    if let Some(project_id) = &cmd.project_id {
        process.arg(project_id);
    }
    
    // Définir le cwd si fourni (pour détection auto si project_id non fourni)
    if let Some(cwd) = &cmd.cwd {
        process.current_dir(cwd);
    }
    
    match process.output() {
        Ok(output) => Ok(GmdResult {
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            code: output.status.code().unwrap_or(-1),
        }),
        Err(e) => Err(format!("Erreur lors de l'exécution de gmdev: {}", e)),
    }
}

fn is_gmd_available() -> bool {
    Command::new("gmdev")
        .arg("--version")
        .output()
        .is_ok()
}
```

**Fichier** : `src-tauri/src/commands.rs` (MODIFIER)

```rust
// Ajouter en haut
use crate::gmd::{run_gmd, GmdCommand, GmdResult};

// Remplacer run_gmdev_command() par :
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

### B) Wiring de 2 Boutons (Status + Up)

**Fichier** : `src/components/ProjectSwitcher.tsx` (MODIFIER)

```typescript
// AVANT
import { useRuntime } from "@/core/runtime/runtime.store";
const { switchProject } = useRuntime();

<button onClick={() => switchProject(project.id)}>
  {isRunning ? "Stop" : "Start"}
</button>

// APRÈS
import { useGmd } from "@/core/gmd/gmd.store";
import { useRuntime } from "@/core/runtime/runtime.store";

const { runGmd, state } = useGmd();
const { activeProjectId } = useRuntime();

const handleStart = async (projectId: string) => {
  // Si un autre projet est actif, le stopper d'abord
  if (activeProjectId && activeProjectId !== projectId) {
    await runGmd(["down"], { projectId: activeProjectId });
  }
  // Démarrer le projet cible
  await runGmd(["up"], { projectId });
};

const handleStop = async (projectId: string) => {
  await runGmd(["down"], { projectId });
};

const handleStatus = async (projectId: string) => {
  const result = await runGmd(["status"], { projectId });
  console.log("Status:", result.stdout);
  // TODO: Parser et mettre à jour le statut
};

<button 
  onClick={() => isRunning ? handleStop(project.id) : handleStart(project.id)}
  disabled={state.commandInFlight}
>
  {state.commandInFlight ? "..." : (isRunning ? "Stop" : "Start")}
</button>

<button onClick={() => handleStatus(project.id)} disabled={state.commandInFlight}>
  Status
</button>
```

### C) Affichage Logs Live

**Fichier** : `src/components/GmdLogs.tsx` (NOUVEAU)

```typescript
import { useGmd } from "@/core/gmd/gmd.store";
import { useEffect, useRef } from "react";

export function GmdLogs() {
  const { state } = useGmd();
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.logs]);

  if (state.logs.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-900 p-4 rounded-lg font-mono text-sm border border-gray-700">
      <div className="text-gray-400 mb-2 text-xs font-semibold">
        📋 Logs gmdev {state.commandInFlight && "(en cours...)"}
      </div>
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {state.logs.map((log, i) => (
          <div key={i} className="text-gray-300 text-xs whitespace-pre-wrap">
            {log}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
```

**Fichier** : `src/pages/Dashboard.tsx` (MODIFIER)

```typescript
// Ajouter après ProjectSwitcher
import { GmdLogs } from "@/components/GmdLogs";

<ProjectSwitcher projects={projects} />
<GmdLogs />
```

---

## ✅ Checklist de Migration

### PR 1 : Module runGmd
- [ ] Créer `src-tauri/src/gmd.rs`
- [ ] Créer commande Tauri `run_gmd_command`
- [ ] Modifier `src-tauri/src/lib.rs` (ajouter module)
- [ ] Tester `run_gmd(["status"])`
- [ ] Tester `run_gmd(["up"], { projectId })`

### PR 2 : Wiring Boutons
- [ ] Créer `src/core/gmd/gmd.store.tsx`
- [ ] Modifier `switchProject.ts` pour utiliser `runGmd`
- [ ] Modifier `ProjectSwitcher.tsx` pour utiliser `runGmd`
- [ ] Ajouter `GmdProvider` dans `App.tsx`
- [ ] Tester Start/Stop via `gmdev`

### PR 3 : Logs Live
- [ ] Ajouter `run_gmd_stream()` dans `gmd.rs`
- [ ] Créer `GmdLogs.tsx`
- [ ] Intégrer dans Dashboard
- [ ] Tester logs en temps réel

---

## 🎯 Résultat Attendu

**Avant** :
- Logique dispersée dans plusieurs fonctions
- Parsing fragile du texte
- Pas de logs live
- Pas de verrou global
- Vérifications répétées

**Après** :
- Module unique `runGmd()` centralisé
- Toutes les actions passent par `gmdev`
- Logs visibles en temps réel
- Verrou mutex pour séquentialiser
- Parsing JSON si disponible, fallback texte

---

**Statut** : ✅ Audit terminé - Prêt pour implémentation
