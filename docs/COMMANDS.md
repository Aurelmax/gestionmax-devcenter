# Commandes Rust disponibles via Tauri

Liste des commandes actuellement implémentées (ou prêtes à implémenter).

---

## 🔌 1. toggle_tunnel  

Active / désactive le tunnel SSH local.

### Appel depuis React

```typescript
await invoke("toggle_tunnel");
```

---

## 🟣 2. toggle_backend

Démarre ou arrête le backend Payload local (via pnpm dev).

### Appel depuis React

```typescript
await invoke("toggle_backend");
```

---

## 🌐 3. toggle_frontend

Démarre ou arrête le frontend Next.js.

### Appel depuis React

```typescript
await invoke("toggle_frontend");
```

---

## 📊 4. system_stats

Retourne les statistiques systèmes :

- CPU usage
- RAM usage
- Disk usage
- Uptime

### Appel depuis React

```typescript
const stats = await invoke<SystemStatus>("system_stats");
```

### Retour

```typescript
interface SystemStatus {
  cpu: number;
  ram: number;
  disk: number;
  uptime: number;
}
```

---

## 🧟 5. kill_zombies

Tue les process orphelins (Node, pnpm, Tauri, etc.)

### Appel depuis React

```typescript
await invoke("kill_zombies");
```

---

## 📁 6. list_projects

Lit le fichier `~/.gestionmax-devcenter/projects.json` et renvoie :

- nom du projet
- chemin
- port
- état (running/stopped)

### Appel depuis React

```typescript
const projects = await invoke<Project[]>("list_projects");
```

### Retour

```typescript
interface Project {
  name: string;
  path: string;
  stack: string;
  services: ProjectService[];
}
```

---

## ▶️ 7. start_project_service

Démarre un service d'un projet spécifique.

### Appel depuis React

```typescript
await invoke("start_project_service", {
  projectPath: "/path/to/project",
  serviceName: "backend",
  command: "pnpm dev:backend"
});
```

---

## ⏹️ 8. stop_project_service

Arrête un service d'un projet spécifique.

### Appel depuis React

```typescript
await invoke("stop_project_service", {
  projectPath: "/path/to/project",
  serviceName: "backend",
  port: 3010
});
```

---

## 🔍 9. check_project_status

Vérifie le statut de tous les services d'un projet.

### Appel depuis React

```typescript
const statuses = await invoke<ServiceStatus[]>("check_project_status", {
  projectPath: "/path/to/project"
});
```

### Retour

```typescript
interface ServiceStatus {
  name: string;
  port: number;
  status: "RUNNING" | "STOPPED" | "ERROR";
  pid?: number;
}
```

---

## 🖥️ 10. open_in_vscode

Ouvre un projet dans VS Code.

### Appel depuis React

```typescript
await invoke("open_in_vscode", {
  path: "/path/to/project"
});
```

---

## 📝 11. read_logs

Lit les logs système en temps réel. Utilise `journalctl` (systemd) ou lit depuis `/var/log/syslog` ou `/var/log/messages` en fallback.

### Appel depuis React

```typescript
const logs = await invoke<string>("read_logs");
```

### Retour

Retourne les 100 dernières lignes de logs système (depuis les 5 dernières minutes).

---

## 🔧 11.5. check_status

Vérifie le statut complet du système avec des métriques réelles :
- **CPU** : Utilisation CPU en pourcentage (lu depuis `/proc/stat`)
- **RAM** : Utilisation mémoire en pourcentage (lu depuis `/proc/meminfo`)
- **Disk** : Utilisation disque en pourcentage (lu via `df`)
- **Uptime** : Temps de fonctionnement en secondes (lu depuis `/proc/uptime`)
- **Services** : Statut des services (tunnel, backend, frontend, netdata)

### Appel depuis React

```typescript
const status = await invoke<SystemStatus>("check_status");
```

### Retour

```typescript
interface SystemStatus {
  cpu: number;        // Pourcentage d'utilisation CPU (0-100)
  ram: number;        // Pourcentage d'utilisation RAM (0-100)
  disk: number;       // Pourcentage d'utilisation disque (0-100)
  uptime: number;     // Uptime en secondes
  services: {
    tunnel: boolean;
    backend: boolean;
    frontend: boolean;
    netdata: boolean;
  };
}
```

---

## ⚡ 11.6. run_command

Exécute une commande système générique de manière sécurisée.

⚠️ **Sécurité** : Les commandes dangereuses sont bloquées (`rm -rf`, `sudo`, `shutdown`, etc.)

### Appel depuis React

```typescript
const output = await invoke<string>("run_command", { cmd: "ls -la" });
```

### Retour

Retourne la sortie stdout de la commande, ou une erreur si la commande échoue.

---

## 🛑 12. stop_all_services

Arrête tous les services système (tunnel, backend, frontend, netdata).

### Appel depuis React

```typescript
await invoke("stop_all_services");
```

---

## 📦 13. load_projects

Charge la configuration des projets depuis `~/.gestionmax-devcenter/projects.json`.

### Appel depuis React

```typescript
const config = await invoke<ProjectConfig>("load_projects");
```

### Retour

```typescript
interface ProjectConfig {
  projects: Project[];
}

interface Project {
  name: string;
  backend_path: string;
  frontend_path: string;
  scripts_path: string;
  services: ProjectServices;
}
```

---

## 💾 14. save_projects

Sauvegarde la configuration des projets dans le fichier JSON.

### Appel depuis React

```typescript
await invoke("save_projects", { config });
```

---

## ➕ 15. add_project

Ajoute un nouveau projet à la configuration.

### Appel depuis React

```typescript
await invoke("add_project", { project });
```

---

## ✏️ 16. update_project

Met à jour un projet existant.

### Appel depuis React

```typescript
await invoke("update_project", { project });
```

---

## 🗑️ 17. delete_project

Supprime un projet de la configuration.

### Appel depuis React

```typescript
await invoke("delete_project", { projectName: "Mon Projet" });
```

---

## 📂 18. pick_project_folder

Ouvre un dialogue système pour choisir un dossier de projet.

### Appel depuis React

```typescript
const folderPath = await invoke<string>("pick_project_folder");
```

### Retour

Le chemin absolu du dossier sélectionné, ou une erreur si annulé.

---

## 🔍 19. autoscan_project

Analyse automatiquement la structure d'un projet et retourne sa configuration complète.

### Appel depuis React

```typescript
const project = await invoke<Project>("autoscan_project", {
  root_path: "/path/to/project"
});
```

### Fonctionnalités

- Détecte automatiquement le Backend Payload
- Détecte automatiquement le Frontend Next.js
- Détecte les scripts (tunnel.sh, start-dev.sh, etc.)
- Détecte les ports depuis `.env`, `payload.config.ts`, `next.config.js`, etc.
- Configure automatiquement Netdata (port 19999 fixe)
- Retourne un objet `Project` complet prêt à être enregistré

---

## 📋 Liste complète des commandes

| Commande | Description | Status |
|----------|-------------|--------|
| `start_service` | Démarre un service système | ✅ Implémenté |
| `stop_service` | Arrête un service système | ✅ Implémenté |
| `stop_all_services` | Arrête tous les services | ✅ Implémenté |
| `kill_zombies` | Tue les processus zombies | ✅ Implémenté |
| `check_status` | Vérifie le statut système | ✅ Implémenté |
| `read_logs` | Lit les logs | ✅ Implémenté |
| `list_projects` | Liste les projets (ancien format) | ✅ Implémenté |
| `check_project_status` | Vérifie le statut d'un projet | ✅ Implémenté |
| `start_project_service` | Démarre un service de projet | ✅ Implémenté |
| `stop_project_service` | Arrête un service de projet | ✅ Implémenté |
| `open_in_vscode` | Ouvre VS Code | ✅ Implémenté |
| `load_projects` | Charge la configuration des projets | ✅ Implémenté |
| `save_projects` | Sauvegarde la configuration | ✅ Implémenté |
| `add_project` | Ajoute un projet | ✅ Implémenté |
| `update_project` | Met à jour un projet | ✅ Implémenté |
| `delete_project` | Supprime un projet | ✅ Implémenté |
| `pick_project_folder` | Ouvre un dialogue de sélection | ✅ Implémenté |
| `autoscan_project` | Analyse automatique d'un projet | ✅ Implémenté |
| `run_command` | Exécute une commande générique | ✅ Implémenté |

---

## 🔧 Implémentation Rust

Toutes les commandes sont définies dans `src-tauri/src/commands.rs` et enregistrées dans `src-tauri/src/lib.rs` :

```rust
.invoke_handler(tauri::generate_handler![
    start_service,
    stop_service,
    stop_all_services,
    kill_zombies,
    check_status,
    read_logs,
    list_projects,
    check_project_status,
    start_project_service,
    stop_project_service,
    open_in_vscode,
    load_projects,
    save_projects,
    add_project,
    update_project,
    delete_project,
    pick_project_folder,
    autoscan_project
])
```

