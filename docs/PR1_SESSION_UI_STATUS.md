# PR 1 : Patch Minimal Session UI - STATUS ✅

## ✅ Objectif

Créer une UI orientée "session" (Front Repo + Back Repo) avec sélecteurs et boutons pour piloter `gmdev` CLI.

**Contraintes respectées** :
- ✅ Conserve Projects-V3 existant (non cassé)
- ✅ Ne touche pas à l'orchestrateur Rust
- ✅ Utilise les commandes EXACTES : `gmdev start|stop tunnel/back/front`, `gmdev status/doctor/hub/kill-zombies`

---

## ✅ Fichiers Créés

### 1. `src/core/session/session.store.tsx` ✅

**État** :
- ✅ `frontRepoPath: string | null`
- ✅ `backRepoPath: string | null`
- ✅ `commandInFlight: boolean` (mutex)
- ✅ `lastExitCode: number | null`
- ✅ `runningState: RunningState | null` (tunnel/backend/frontend)
- ✅ `lastStatusRaw: string | null`
- ✅ `logs: LogEntry[]` (structurés avec `{ts, cmd, cwd, level, line}`)

**Actions** :
- ✅ `setFrontRepoPath(path)` - Définit le repo frontend
- ✅ `setBackRepoPath(path)` - Définit le repo backend
- ✅ `run(cmdArgs, cwd)` - Exécute une commande gmdev (utilise `runGmdCommand()` existant)
- ✅ `startSession()` - Séquence : `gmdev start tunnel` → `start back` → `start front` → `status`
- ✅ `stopSession()` - Séquence : `gmdev stop front` → `stop back` → `stop tunnel`
- ✅ `restartSession()` - Stop puis Start
- ✅ `status()` - `gmdev status` avec parsing
- ✅ `doctor()` - `gmdev doctor`
- ✅ `hub()` - `gmdev hub`
- ✅ `killZombies()` - `gmdev kill-zombies`
- ✅ `clearLogs()` - Efface les logs

**Stockage** :
- ✅ Persistance dans `localStorage` (clé `gmdev-session`)
- ✅ Sauvegarde uniquement `frontRepoPath` et `backRepoPath`
- ✅ Chargement automatique au démarrage

**Logs structurés** :
- ✅ Entrées avec `{ts, cmd, cwd, level, line}`
- ✅ Séparation stdout/stderr (level: "info" vs "error")
- ✅ Historique de 1000 dernières lignes
- ✅ Ajout automatique lors de chaque commande

---

### 2. `src/components/SessionUI.tsx` ✅

**Sélecteurs** :
- ✅ Input pour Front Repo (chemin local)
- ✅ Input pour Back Repo (chemin local)
- ✅ Sauvegarde automatique au blur

**Boutons** :
- ✅ Start (séquence complète)
- ✅ Down (séquence complète)
- ✅ Restart (stop puis start)
- ✅ Status (gmdev status)
- ✅ Doctor (gmdev doctor)
- ✅ Hub (gmdev hub)
- ✅ Kill Zombies (gmdev kill-zombies)

**Affichage** :
- ✅ `commandInFlight` avec indicateur visuel
- ✅ Dernier code de sortie (`lastExitCode`)
- ✅ Running State (tunnel/backend/frontend avec badges colorés)
- ✅ Logs live groupés par commande
- ✅ Auto-scroll vers le bas
- ✅ Bouton Clear pour effacer les logs

---

## ✅ Fichiers Modifiés

### 1. `src/App.tsx` ✅

**Changements** :
- ✅ Ajout de `<SessionProvider>` autour de `<RuntimeProvider>`
- ✅ Projects-V3 conservé (non cassé)

**Structure** :
```typescript
<ProjectProvider>
  <SessionProvider>  // ✅ Nouveau
    <RuntimeProvider projects={projects}>
      ...
    </RuntimeProvider>
  </SessionProvider>
</ProjectProvider>
```

---

### 2. `src/pages/Dashboard.tsx` ✅

**Changements** :
- ✅ Ajout de `<SessionUI />` après `<ProjectSwitcher />`
- ✅ Projects-V3 conservé (ProjectSwitcher toujours présent)

**Structure** :
```typescript
<ProjectSwitcher projects={projects} />  // ✅ Conservé
<GmdLogs />  // ✅ Conservé
<SessionUI />  // ✅ Nouveau
```

---

## ✅ Commandes Utilisées (EXACTES)

### Start Session
1. `gmdev start tunnel` (cwd: backRepoPath)
2. `gmdev start back` (cwd: backRepoPath)
3. `gmdev start front` (cwd: frontRepoPath)
4. `gmdev status` (cwd: backRepoPath)

### Stop Session
1. `gmdev stop front` (cwd: frontRepoPath)
2. `gmdev stop back` (cwd: backRepoPath)
3. `gmdev stop tunnel` (cwd: backRepoPath)

### Autres
- `gmdev status` (avec tentative `--json`)
- `gmdev doctor`
- `gmdev hub`
- `gmdev kill-zombies`

---

## ✅ Fonctionnalités Implémentées

### 1. Stockage Persistant ✅
- ✅ `frontRepoPath` et `backRepoPath` sauvegardés dans `localStorage`
- ✅ Chargement automatique au démarrage
- ✅ Sauvegarde automatique lors du changement

### 2. Mutex ✅
- ✅ `commandInFlight` vérifié avant chaque commande
- ✅ Empêche les commandes concurrentes
- ✅ Indicateur visuel dans l'UI

### 3. Logs Structurés ✅
- ✅ Entrées avec timestamp, commande, cwd, level, ligne
- ✅ Séparation stdout/stderr (level différent)
- ✅ Groupement par commande dans l'affichage
- ✅ Historique de 1000 lignes

### 4. Parsing Status ✅
- ✅ Tentative `gmdev status --json` d'abord
- ✅ Fallback sur format texte
- ✅ Parsing pour détecter tunnel/backend/frontend
- ✅ État "running" / "stopped" / "unknown"

---

## ✅ Checklist PR 1

- [x] Créer `src/core/session/session.store.tsx`
- [x] Définir état : frontRepoPath, backRepoPath, commandInFlight, lastExitCode, runningState, logs
- [x] Implémenter `setFrontRepoPath()`, `setBackRepoPath()`
- [x] Implémenter `run()` (utilise `runGmdCommand()` existant)
- [x] Implémenter `startSession()` (séquence tunnel → back → front → status)
- [x] Implémenter `stopSession()` (séquence front → back → tunnel)
- [x] Implémenter `restartSession()`, `status()`, `doctor()`, `hub()`, `killZombies()`
- [x] Implémenter stockage localStorage (frontRepoPath/backRepoPath uniquement)
- [x] Créer `src/components/SessionUI.tsx`
- [x] Ajouter sélecteurs Front/Back repo
- [x] Ajouter boutons : Start, Down, Restart, Status, Doctor, Hub, Kill zombies
- [x] Ajouter affichage commandInFlight + lastExitCode
- [x] Ajouter affichage Running State
- [x] Ajouter affichage logs groupés par commande
- [x] Intégrer dans Dashboard (conserve Projects-V3)
- [x] Ajouter SessionProvider dans App.tsx

---

## 🎯 Résultat

### Avant
- ❌ UI orientée multi-projets (Projects-V3)
- ❌ Pas de sélection simple Front/Back repo
- ❌ Logs mélangés, pas structurés

### Après
- ✅ UI orientée "session" (Front Repo + Back Repo)
- ✅ Sélecteurs simples pour chemins locaux
- ✅ Boutons fonctionnels avec séquences correctes
- ✅ Logs structurés avec historique
- ✅ Running state basé sur `gmdev status`
- ✅ Projects-V3 conservé (non cassé)

---

## 📊 Architecture

```
App.tsx
├── ProjectProvider (Projects-V3 - conservé)
├── SessionProvider (Session UI - nouveau)
│   └── RuntimeProvider (Projects-V3 - conservé)
│       └── Dashboard
│           ├── ProjectSwitcher (Projects-V3 - conservé)
│           └── SessionUI (Session UI - nouveau)
```

**Cohabitation** :
- Projects-V3 : Gestion multi-projets (conservé)
- Session UI : Gestion session Front/Back repo (nouveau)
- Les deux coexistent sans conflit

---

## ⚠️ Notes Importantes

1. **Commandes CLI** : Utilise `gmdev` (script existant), pas `gmd`. Si `gmd` existe comme alias/script séparé, adapter.

2. **Format Commandes** : Utilise `gmdev start tunnel` (pas `gmdev tunnel up`). Format conforme au script `gmdev` existant.

3. **Parsing Status** : Parsing texte fragile (recherche "running"/"active"). Amélioration future : parser JSON si `gmdev status --json` existe.

4. **Logs Live** : Pas de streaming pour l'instant. Logs collectés après la fin de chaque commande. Structure prête pour streaming futur.

5. **Stockage** : Minimal (frontRepoPath/backRepoPath uniquement). Pas de sauvegarde de l'état runtime (runningState, logs).

---

**Statut** : ✅ PR 1 terminée - Prêt pour tests
