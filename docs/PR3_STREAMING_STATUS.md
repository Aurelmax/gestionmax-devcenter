# PR3: Streaming live des logs gmdev via Tauri

## Objectif

Implémenter le streaming live des logs `gmdev` via Tauri pour permettre l'affichage en temps réel des sorties stdout/stderr dans l'interface GMDF.

## Modifications

### 1. Côté Rust (`src-tauri/src/gmd.rs`)

#### Ajout de types pour le streaming

**Nouveaux types**:
- `GmdRunId`: Structure pour retourner un `run_id` unique
- `GmdLogEvent`: Payload pour l'event `gmd:log` avec `{ runId, ts, level, line, cmd, cwd }`
- `GmdExitEvent`: Payload pour l'event `gmd:exit` avec `{ runId, exitCode }`

#### Nouvelle fonction `run_gmd_streaming()`

**Fichier**: `src-tauri/src/gmd.rs`

**Fonctionnalités**:
- Utilise `Command::spawn()` avec `Stdio::piped()` pour capturer stdout/stderr
- Lance 3 threads séparés :
  1. Thread pour lire stdout ligne par ligne et émettre `gmd:log` avec `level: "stdout"`
  2. Thread pour lire stderr ligne par ligne et émettre `gmd:log` avec `level: "stderr"`
  3. Thread pour attendre la fin du processus et émettre `gmd:exit` avec le code de sortie
- Utilise `chrono::Utc::now().to_rfc3339()` pour les timestamps
- Émet les events via `app.emit_all("gmd:log", &event)` et `app.emit_all("gmd:exit", &event)`

**Dépendances ajoutées**:
- `uuid` (v1.0) pour générer des `runId` uniques
- `std::io::{BufRead, BufReader}` pour lire ligne par ligne
- `std::thread` pour les threads de lecture

#### Conservation de `run_gmd()` (mode non-streaming)

- La fonction `run_gmd()` originale est conservée pour la compatibilité
- Elle utilise toujours `process.output()` pour les cas où le streaming n'est pas nécessaire

### 2. Côté Rust (`src-tauri/src/commands.rs`)

#### Modification de `run_gmd_command()`

**Fichier**: `src-tauri/src/commands.rs`

**Modifications**:
- Signature modifiée pour accepter `app: AppHandle` en paramètre
- Retourne maintenant `GmdRunId` au lieu de `GmdResult`
- Génère un `runId` unique avec `uuid::Uuid::new_v4()`
- Appelle `run_gmd_streaming()` au lieu de `run_gmd()`
- Retourne immédiatement `{ run_id }` sans attendre la fin de la commande

**Exemple d'utilisation**:
```rust
let run_id = format!("gmd-{}", uuid::Uuid::new_v4().to_string());
run_gmd_streaming(cmd, app, run_id.clone())?;
Ok(GmdRunId { run_id })
```

### 3. Côté Frontend (`src/lib/commands.ts`)

#### Mise à jour des interfaces TypeScript

**Nouveaux types**:
- `GmdRunId`: `{ run_id: string }`
- `GmdLogEvent`: `{ run_id, ts, level: "stdout" | "stderr", line, cmd, cwd }`
- `GmdExitEvent`: `{ run_id, exit_code }`

#### Modification de `runGmdCommand()`

**Fichier**: `src/lib/commands.ts`

**Modifications**:
- Retourne maintenant `Promise<GmdRunId>` au lieu de `Promise<GmdResult>`
- Documentation mise à jour pour expliquer le mode streaming
- Exemple d'utilisation avec `listen()` pour écouter les events

### 4. Côté Frontend (`src/core/session/session.store.tsx`)

#### Ajout de `currentRunId` dans l'état

**Modification de `SessionState`**:
```typescript
export interface SessionState {
  // ...
  currentRunId: string | null;  // RunId de la commande en cours
  // ...
}
```

#### Ajout des listeners d'events Tauri

**Nouveau `useEffect`**:
- Écoute `gmd:log` et ajoute les logs au state si `run_id` correspond à `currentRunId`
- Écoute `gmd:exit` et met à jour `commandInFlight`, `currentRunId`, `lastExitCode` si `run_id` correspond
- Convertit `level: "stdout"` → `LogLevel: "info"` et `level: "stderr"` → `LogLevel: "error"`
- Cleanup automatique des listeners au démontage

#### Modification de `run()`

**Modifications**:
- Appelle `runGmdCommand()` qui retourne maintenant `GmdRunId`
- Met à jour `currentRunId` et `commandInFlight` immédiatement après l'appel
- Retourne un `GmdResult` factice (les vrais logs arrivent via events)
- Les logs sont ajoutés automatiquement par les listeners d'events

**Gestion du mutex**:
- Le mutex est géré via `commandInFlight` et `currentRunId`
- Seuls les events avec `run_id === currentRunId` sont traités
- Le mutex est libéré quand l'event `gmd:exit` arrive

## Compatibilité

- ✅ **Mode non-streaming conservé**: La fonction `run_gmd()` originale reste disponible pour les cas où le streaming n'est pas nécessaire
- ✅ **Rétrocompatibilité**: Les autres commandes Tauri qui utilisent `run_gmd()` continuent de fonctionner
- ✅ **Isolation des logs**: Les logs sont filtrés par `runId` pour éviter les mélanges entre commandes

## Tests Recommandés

### Test 1: Streaming stdout/stderr
1. Lancer une commande `gmdev start tunnel` via le bouton "Start"
2. Vérifier que les logs apparaissent en temps réel dans l'interface
3. Vérifier que les lignes stdout sont affichées avec le niveau "info"
4. Vérifier que les lignes stderr sont affichées avec le niveau "error"

### Test 2: Event gmd:exit
1. Lancer une commande `gmdev status`
2. Vérifier que l'event `gmd:exit` arrive à la fin
3. Vérifier que `commandInFlight` passe à `false`
4. Vérifier que `lastExitCode` est mis à jour avec le bon code

### Test 3: Mutex et isolation
1. Lancer une commande longue (ex: `gmdev start tunnel`)
2. Essayer de lancer une autre commande pendant l'exécution
3. Vérifier qu'une erreur "Une commande est déjà en cours d'exécution" est levée
4. Vérifier que les logs de la première commande ne sont pas mélangés avec d'autres

### Test 4: Génération de runId
1. Lancer plusieurs commandes en séquence
2. Vérifier que chaque commande a un `runId` unique
3. Vérifier que les logs sont bien associés au bon `runId`

### Test 5: Cleanup des listeners
1. Ouvrir l'application
2. Fermer l'application
3. Vérifier qu'aucune erreur de listener n'apparaît dans la console

## Notes

- Le streaming fonctionne uniquement pour les commandes exécutées via `runGmdCommand()` dans `session.store.tsx`
- Les autres commandes Tauri qui utilisent `run_gmd()` directement continuent d'utiliser le mode non-streaming
- Les logs sont limités à 1000 lignes pour éviter une consommation excessive de mémoire
- Les timestamps sont générés côté Rust avec `chrono::Utc::now().to_rfc3339()`
