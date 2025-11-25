# Workflow de développement — GestionMax DevCenter

---

## 1. Lancer l'app en mode développement

```bash
npm install
npm run tauri dev
```

L'application se lancera avec le hot-reload activé pour React et la recompilation automatique pour Rust.

---

## 2. Modifier l'UI

Les fichiers principaux :

- `src/App.tsx` : Point d'entrée avec routing
- `src/pages/Dashboard.tsx` : Page principale
- `src/components/*` : Composants réutilisables
- `src/tailwind.css` : Styles globaux
- `tailwind.config.js` : Configuration Tailwind

Hot reload automatique pour React.

---

## 3. Ajouter une commande Rust

1. Ouvrir `src-tauri/src/commands.rs` (ou créer un nouveau module comme `autoscan.rs`)

2. Ajouter ta fonction Rust :

```rust
#[tauri::command]
pub async fn ma_commande(param: String) -> Result<String, String> {
    // Logique ici
    Ok("Succès".to_string())
}
```

3. Si c'est un nouveau module, l'ajouter dans `src-tauri/src/lib.rs` :

```rust
mod ma_module;

use ma_module::*;
```

4. L'enregistrer dans `src-tauri/src/lib.rs` :

```rust
tauri::generate_handler![
    // ... autres commandes
    ma_commande,
]
```

5. L'appeler côté React :

```typescript
import { invoke } from "@tauri-apps/api/core";

await invoke("ma_commande", { param: "valeur" });
```

### Modules Rust existants

- `commands.rs` : Commandes système (start/stop services, kill zombies, etc.)
- `projects.rs` : Gestion des projets (load, save, add, update, delete)
- `autoscan.rs` : Auto-détection de la structure des projets
- `state.rs` : Gestion de l'état global (PIDs des services)

---

## 4. Scripts embarqués

Les scripts de gestion des services sont maintenant embarqués dans le bundle Tauri et se trouvent dans `src-tauri/resources/scripts/` :

- `tunnel-on.sh` / `tunnel-off.sh` : Gestion du tunnel SSH
- `backend-on.sh` / `backend-off.sh` : Gestion du backend Payload
- `frontend-on.sh` / `frontend-off.sh` : Gestion du frontend Next.js
- `netdata-on.sh` / `netdata-off.sh` : Gestion de Netdata
- `kill-zombies.sh` : Nettoyage des processus zombies

**Important** : Plus besoin de scripts externes dans `~/scripts/dev-tools/`. Tous les scripts sont maintenant autonomes et embarqués dans l'application.

Pour modifier un script :
1. Éditer le fichier dans `src-tauri/resources/scripts/`
2. S'assurer qu'il est exécutable (`chmod +x`)
3. Rebuild l'application

### 4.1. Migration V3 & nouvelles commandes

La V3 interagit avec les services via des commandes Rust dédiées :

| Commande | Action | Retour visible dans le dashboard |
| --- | --- | --- |
| `start_service_v3(projectId, service)` | Démarre backend, frontend, tunnel ou Netdata en injectant les `PROJECT_*` variables | objet `{ stdout, stderr, code }` affiché dans les toasts |
| `stop_service_v3(projectId, service)` | Arrête avec le script OFF associé | objet `{ stdout, stderr, code }` |
| `status_service_v3(projectId, service)` | Interroge `sysinfo` pour détecter `pnpm/node`, `ssh -N -L …` ou `netdata` | `"RUNNING"` / `"STOPPED"` pour le badge |
| `kill_zombies_v3()` | Lance `kill-zombies.sh` et tue les processus orphelins | objet `{ stdout, stderr, code }` |

Les scripts doivent toujours faire un `echo` clair (succès ou erreur). Le tunnel repose sur un seul couple `tunnel-on.sh` / `tunnel-off.sh` capable de gérer toutes les commandes SSH, en utilisant les variables `PROJECT_TUNNEL_HOST`, `PROJECT_TUNNEL_USER`, `PROJECT_TUNNEL_PORT`, `PROJECT_LOCAL_MONGO`, `PROJECT_REMOTE_MONGO` et `PROJECT_TUNNEL_KEY`.

Les projets V3 supportent maintenant un objet `commands` pour préciser une commande personnalisée (ex. `pnpm dev:backend`). Lorsque tu sauvegardes un projet dans le Project Manager, veille à remplir la section Tunnel (host/user/ports/key) pour que `start_service_v3` injecte les bons `PROJECT_*`.

Chaque bouton Start/Stop rafraîchit automatiquement le statut (polling 1,5 s) et affiche les logs du script dans les toasts (par exemple `vite ELIFECYCLE` en cas d’échec). Si tu veux un log plus complet, copie le `stderr` affiché ou lance la commande à la main (`pnpm dev`) dans le dossier concerné.

## 5. Ajouter un service dans le dashboard

1. Ajouter le type dans `src/lib/commands.ts` :

```typescript
export type ServiceName = "tunnel" | "backend" | "frontend" | "netdata" | "nouveau_service";
```

2. Ajouter le label dans `src/lib/system.ts` :

```typescript
export function getServiceLabel(service: ServiceName): string {
  const labels: Record<ServiceName, string> = {
    // ...
    nouveau_service: "Nouveau Service",
  };
  return labels[service];
}
```

3. Ajouter l'icône dans `src/components/StatusCard.tsx`

4. Implémenter la commande Rust dans `src-tauri/src/commands.rs`

5. Ajouter le service dans le dashboard (`src/pages/Dashboard.tsx`)

---

## 5. Gérer les projets

### 5.1. Via Project Manager (manuel)

1. Ouvrir l'onglet **Configuration → Project Manager**
2. Cliquer sur **"Ajouter un projet"**
3. Remplir le formulaire :
   - Nom du projet
   - Chemins (backend, frontend, scripts)
   - Services (Tunnel, Backend, Frontend, Netdata)
4. Enregistrer

Le projet est automatiquement ajouté dans `~/.gestionmax-devcenter/projects.json`.

### 5.2. Via Auto-Scan (automatique)

1. Ouvrir l'onglet **Configuration → Auto-Scan**
2. Cliquer sur **"Choisir un dossier"**
3. Sélectionner le dossier racine du projet
4. Le scanner détecte automatiquement :
   - Backend Payload
   - Frontend Next.js
   - Scripts disponibles
   - Ports configurés
5. Vérifier le résumé
6. Cliquer sur **"Ajouter automatiquement"**

Le projet est automatiquement configuré et enregistré.

### 5.3. Format du fichier projects.json

Le fichier `~/.gestionmax-devcenter/projects.json` utilise le format suivant :

```json
{
  "projects": [
    {
      "name": "GestionMax OPS",
      "backend_path": "/path/to/backend",
      "frontend_path": "/path/to/frontend",
      "scripts_path": "/path/to/scripts",
      "services": {
        "tunnel": {
          "start": "tunnel.sh",
          "stop": "tunnel-off.sh"
        },
        "backend": {
          "start": "start-dev.sh backend",
          "port": 3010
        },
        "frontend": {
          "start": "start-dev.sh frontend",
          "port": 3000
        },
        "netdata": {
          "start": "netdata-on.sh",
          "stop": "netdata-off.sh",
          "port": 19999
        }
      }
    }
  ]
}
```

Le fichier est créé automatiquement s'il n'existe pas.

---

## 6. Build version desktop

```bash
npm run tauri build
```

L'exécutable sera généré dans `src-tauri/target/release/`.

Formats disponibles :
- **Linux** : `.AppImage`, `.deb`, `.rpm`
- **Windows** : `.exe`, `.msi`
- **macOS** : `.app`, `.dmg`

---

## 7. Tests

### Tester une commande Rust

```bash
cd src-tauri
cargo test
```

### Tester le frontend

```bash
npm run dev  # Sans Tauri, juste Vite
```

### Vérifier TypeScript

```bash
npx tsc --noEmit
```

### Vérifier Rust

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

---

## 8. Debugging

### Logs Rust

Les logs Rust apparaissent dans le terminal où vous lancez `npm run tauri dev`.

### Logs React

Ouvrez les DevTools du navigateur (F12) ou utilisez `console.log()`.

### Debug VS Code

1. Installer l'extension "Tauri" pour VS Code
2. Créer un fichier `.vscode/launch.json` :

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "tauri",
      "request": "launch",
      "name": "Tauri: Debug",
      "cargo": {
        "args": ["build", "--manifest-path=./src-tauri/Cargo.toml"]
      },
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

---

## 9. Git Workflow

### Commit

```bash
git add .
git commit -m "feat: description"
git push
```

### Structure des commits

- `feat:` : Nouvelle fonctionnalité
- `fix:` : Correction de bug
- `docs:` : Documentation
- `refactor:` : Refactorisation
- `style:` : Formatage
- `test:` : Tests

---

## 10. Dépendances

### Ajouter une dépendance Node.js

```bash
npm install package-name
```

### Ajouter une dépendance Rust

Éditer `src-tauri/Cargo.toml` :

```toml
[dependencies]
nouveau-package = "1.0.0"
```

Puis :

```bash
cd src-tauri
cargo build
```

---

## 11. Configuration

### Tauri

Fichier : `src-tauri/tauri.conf.json`

- Fenêtre : taille, titre, etc.
- Permissions : accès système
- Build : configuration de compilation

### Vite

Fichier : `vite.config.ts`

- Alias de chemins (`@/`)
- Plugins
- Configuration du serveur de dev

### Tailwind

Fichier : `tailwind.config.js`

- Thème personnalisé
- Couleurs
- Extensions

---

## 12. Problèmes courants

### L'app ne démarre pas

- Vérifier que Rust est installé : `rustc --version`
- Vérifier que Node.js est installé : `node --version`
- Supprimer `node_modules` et réinstaller

### Erreurs de compilation Rust

- Vérifier `src-tauri/Cargo.toml`
- Exécuter `cargo clean` puis `cargo build`

### Erreurs TypeScript

- Vérifier `tsconfig.json`
- Exécuter `npx tsc --noEmit` pour voir les erreurs

### Hot reload ne fonctionne pas

- Redémarrer le serveur de dev
- Vider le cache : `rm -rf node_modules/.vite`

