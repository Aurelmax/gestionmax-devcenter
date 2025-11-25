use serde::{Deserialize, Serialize};
use std::{
    path::PathBuf,
    process::{Command, Stdio},
};
use sysinfo::System;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager};

use crate::autoscan::ProjectV3;
use crate::projects_v3::{load_projects_v3, ProjectConfigV3};

#[derive(Serialize)]
pub struct ScriptResult {
    pub stdout: String,
    pub stderr: String,
    pub code: i32,
}

fn get_script_path(app_handle: &AppHandle, script_name: &str) -> Result<PathBuf, String> {
    if let Ok(p) = app_handle
        .path()
        .resolve(&format!("scripts/{script_name}"), BaseDirectory::Resource)
    {
        if p.exists() {
            return Ok(p);
        }
    }

    if let Ok(dev) = app_handle.path().resource_dir() {
        let candidate = dev.join("scripts").join(script_name);
        if candidate.exists() {
            return Ok(candidate);
        }
    }

    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join("scripts")
        .join(script_name);
    if manifest.exists() {
        return Ok(manifest);
    }

    Err(format!("Script not found: {}", script_name))
}

fn resolve_script(service: &str, action: &str) -> Option<&'static str> {
    match (service, action) {
        ("backend", "start") => Some("backend-on.sh"),
        ("backend", "stop") => Some("backend-off.sh"),
        ("frontend", "start") => Some("frontend-on.sh"),
        ("frontend", "stop") => Some("frontend-off.sh"),
        ("tunnel", "start") => Some("tunnel-on.sh"),
        ("tunnel", "stop") => Some("tunnel-off.sh"),
        ("netdata", "start") => Some("netdata-on.sh"),
        ("netdata", "stop") => Some("netdata-off.sh"),
        ("zombies", "kill") => Some("kill-zombies.sh"),
        _ => None,
    }
}

fn run_embedded_script(
    app_handle: &AppHandle,
    script_name: &str,
    cwd: Option<PathBuf>,
    envs: Vec<(String, String)>,
) -> ScriptResult {
    let script_path = match get_script_path(app_handle, script_name) {
        Ok(path) => path,
        Err(err) => {
            return ScriptResult {
                stdout: String::new(),
                stderr: err.to_string(),
                code: 127,
            }
        }
    };

    let mut cmd = Command::new("bash");
    cmd.arg(script_path.to_string_lossy().to_string());
    if let Some(dir) = cwd {
        cmd.current_dir(dir);
    }

    for (key, value) in envs {
        cmd.env(key, value);
    }

    match cmd.output() {
        Ok(output) => ScriptResult {
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            code: output.status.code().unwrap_or(-1),
        },
        Err(err) => ScriptResult {
            stdout: String::new(),
            stderr: err.to_string(),
            code: -1,
        },
    }
}

fn build_envs(project: &ProjectV3, service: &str) -> Vec<(String, String)> {
    let mut envs = vec![(
        "PROJECT_ROOT_PATH".to_string(),
        project.root_path.clone(),
    )];

    match service {
        "backend" => {
            envs.push(("PROJECT_BACKEND_PATH".to_string(), project.backend_path.clone()));
            envs.push(("PROJECT_BACKEND_PORT".to_string(), project.ports.backend.to_string()));
            if let Some(commands) = &project.commands {
                if let Some(cmd) = &commands.backend {
                    envs.push(("PROJECT_BACKEND_COMMAND".to_string(), cmd.clone()));
                }
            }
        }
        "frontend" => {
            envs.push(("PROJECT_FRONTEND_PATH".to_string(), project.frontend_path.clone()));
            envs.push(("PROJECT_FRONTEND_PORT".to_string(), project.ports.frontend.to_string()));
            if let Some(commands) = &project.commands {
                if let Some(cmd) = &commands.frontend {
                    envs.push(("PROJECT_FRONTEND_COMMAND".to_string(), cmd.clone()));
                }
            }
        }
        "tunnel" => {
            if let Some(tunnel) = &project.tunnel {
                envs.push(("PROJECT_TUNNEL_HOST".to_string(), tunnel.host.clone()));
                envs.push(("PROJECT_TUNNEL_USER".to_string(), tunnel.user.clone()));
                envs.push(("PROJECT_TUNNEL_PORT".to_string(), tunnel.port.to_string()));
                envs.push(("PROJECT_LOCAL_MONGO".to_string(), tunnel.local_mongo.to_string()));
                envs.push(("PROJECT_REMOTE_MONGO".to_string(), tunnel.remote_mongo.to_string()));
                envs.push(("PROJECT_TUNNEL_KEY".to_string(), tunnel.private_key.clone()));
                if let Some(commands) = &project.commands {
                    if let Some(cmd) = &commands.tunnel {
                        envs.push(("PROJECT_TUNNEL_COMMAND".to_string(), cmd.clone()));
                    }
                }
            }
        }
        "netdata" => {
            envs.push(("PROJECT_NETDATA_PORT".to_string(), "19999".to_string()));
            if let Some(commands) = &project.commands {
                if let Some(cmd) = &commands.netdata {
                    envs.push(("PROJECT_NETDATA_COMMAND".to_string(), cmd.clone()));
                }
            }
        }
        _ => {}
    }

    envs
}

fn status_for_backend(project: &ProjectV3) -> bool {
    let mut system = System::new_all();
    system.refresh_all();
    let port = project.ports.backend.to_string();
    system.processes().values().any(|process| {
        let name = process.name().to_ascii_lowercase();
        let cmd = process.cmd().join(" ").to_ascii_lowercase();
        (name.contains("node") || name.contains("pnpm"))
            && cmd.contains(&project.backend_path.to_ascii_lowercase())
            && cmd.contains(&port)
    })
}

fn status_for_frontend(project: &ProjectV3) -> bool {
    let mut system = System::new_all();
    system.refresh_all();
    let port = project.ports.frontend.to_string();
    system.processes().values().any(|process| {
        let name = process.name().to_ascii_lowercase();
        let cmd = process.cmd().join(" ").to_ascii_lowercase();
        (name.contains("node") || name.contains("pnpm"))
            && cmd.contains(&project.frontend_path.to_ascii_lowercase())
            && cmd.contains(&port)
    })
}

fn status_for_tunnel(project: &ProjectV3) -> bool {
    if let Some(tunnel) = &project.tunnel {
        let pattern = format!(
            "{}:127.0.0.1:{}",
            tunnel.local_mongo, tunnel.remote_mongo
        );
        let mut system = System::new_all();
        system.refresh_all();
        system.processes().values().any(|process| {
            let name = process.name().to_ascii_lowercase();
            let cmd = process.cmd().join(" ").to_ascii_lowercase();
            name.contains("ssh") && cmd.contains(&pattern)
        })
    } else {
        false
    }
}

fn status_for_netdata() -> bool {
    let mut system = System::new_all();
    system.refresh_all();
    system.processes().values().any(|process| process.name().to_ascii_lowercase().contains("netdata"))
}

fn get_project_by_id<'a>(cfg: &'a ProjectConfigV3, id: &str) -> Option<&'a ProjectV3> {
    cfg.projects.iter().find(|p| p.id == id)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemStatus {
    pub cpu: f64,
    pub ram: f64,
    pub disk: f64,
    pub uptime: u64,
    pub services: ServicesStatus,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize)]
pub struct SystemStats {
    pub cpu: f64,
    pub ram: f64,
    pub disk: f64,
    pub uptime: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ServicesStatus {
    pub tunnel: bool,
    pub backend: bool,
    pub frontend: bool,
    pub netdata: bool,
}

// Types pour les projets
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectService {
    pub name: String,
    pub port: u16,
    pub command: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub name: String,
    pub path: String,
    pub stack: String,
    pub services: Vec<ProjectService>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ServiceStatus {
    pub name: String,
    pub port: u16,
    pub status: String, // "RUNNING" | "STOPPED" | "ERROR"
    pub pid: Option<u32>,
}

/// Liste tous les projets depuis le fichier JSON (ancien format pour compatibilité)
#[tauri::command]
pub async fn list_projects() -> Result<Vec<Project>, String> {
    // Utiliser le nouveau module projects pour charger
    use crate::projects::load_projects;

    let config = load_projects().await?;

    // Convertir le nouveau format vers l'ancien format pour la compatibilité
    let old_projects: Vec<Project> = config
        .projects
        .into_iter()
        .map(|new_p| {
            let mut services = Vec::new();

            if let Some(tunnel) = new_p.services.tunnel {
                services.push(ProjectService {
                    name: "tunnel".to_string(),
                    port: 0,
                    command: tunnel.start,
                });
            }

            if let Some(backend) = new_p.services.backend {
                services.push(ProjectService {
                    name: "backend".to_string(),
                    port: backend.port.unwrap_or(3010),
                    command: backend.start,
                });
            }

            if let Some(frontend) = new_p.services.frontend {
                services.push(ProjectService {
                    name: "frontend".to_string(),
                    port: frontend.port.unwrap_or(3000),
                    command: frontend.start,
                });
            }

            // Netdata n'est plus inclus dans les projets (service global uniquement)

            Project {
                name: new_p.name,
                path: new_p.backend_path,
                stack: "Custom".to_string(),
                services,
            }
        })
        .collect();

    Ok(old_projects)
}

/// Vérifie si un port est ouvert
fn is_port_open(port: u16) -> bool {
    use std::net::TcpStream;
    TcpStream::connect(format!("127.0.0.1:{}", port)).is_ok()
}

/// Trouve le PID d'un processus utilisant un port
fn find_pid_by_port(port: u16) -> Option<u32> {
    // Utiliser lsof ou ss pour trouver le PID
    let output = Command::new("lsof")
        .arg("-ti")
        .arg(format!(":{}", port))
        .output()
        .ok()?;

    if output.status.success() {
        let pid_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
        pid_str.parse::<u32>().ok()
    } else {
        // Essayer avec ss si lsof n'est pas disponible
        let output = Command::new("ss").arg("-tlnp").output().ok()?;

        let output_str = String::from_utf8_lossy(&output.stdout);
        for line in output_str.lines() {
            if line.contains(&format!(":{}", port)) {
                // Extraire le PID depuis la ligne ss
                // Format: LISTEN 0 128 0.0.0.0:3000 0.0.0.0:* users:(("node",pid=12345,fd=3))
                if let Some(pid_start) = line.find("pid=") {
                    let pid_end = line[pid_start + 4..]
                        .find(',')
                        .unwrap_or(line[pid_start + 4..].len());
                    if let Ok(pid) = line[pid_start + 4..pid_start + 4 + pid_end].parse::<u32>() {
                        return Some(pid);
                    }
                }
            }
        }
        None
    }
}

/// Vérifie le statut de tous les services d'un projet
#[tauri::command]
pub async fn check_project_status(project_path: String) -> Result<Vec<ServiceStatus>, String> {
    use crate::projects::load_projects;

    let config = load_projects().await?;

    // Trouver le projet correspondant (chercher par backend_path ou frontend_path)
    let project = config
        .projects
        .iter()
        .find(|p| p.backend_path == project_path || p.frontend_path == project_path)
        .ok_or_else(|| "Project not found".to_string())?;

    let mut statuses = Vec::new();

    // Vérifier chaque service configuré
    if project.services.tunnel.is_some() {
        // Tunnel n'a pas de port, on vérifie par processus
        let pid = find_process_by_name("ssh");
        let status = if pid.is_some() { "RUNNING" } else { "STOPPED" };
        statuses.push(ServiceStatus {
            name: "tunnel".to_string(),
            port: 0,
            status: status.to_string(),
            pid,
        });
    }

    if let Some(backend) = &project.services.backend {
        if let Some(port) = backend.port {
            let port_open = is_port_open(port);
            let pid = if port_open {
                find_pid_by_port(port)
            } else {
                None
            };
            statuses.push(ServiceStatus {
                name: "backend".to_string(),
                port,
                status: if port_open { "RUNNING" } else { "STOPPED" }.to_string(),
                pid,
            });
        }
    }

    if let Some(frontend) = &project.services.frontend {
        if let Some(port) = frontend.port {
            let port_open = is_port_open(port);
            let pid = if port_open {
                find_pid_by_port(port)
            } else {
                None
            };
            statuses.push(ServiceStatus {
                name: "frontend".to_string(),
                port,
                status: if port_open { "RUNNING" } else { "STOPPED" }.to_string(),
                pid,
            });
        }
    }

    // Netdata n'est plus vérifié ici (service global uniquement)

    Ok(statuses)
}

/// Démarre un service d'un projet
#[tauri::command]
pub async fn start_project_service(
    project_path: String,
    service_name: String,
    command: String,
) -> Result<String, String> {
    use crate::projects::load_projects;

    // Charger les projets pour trouver le bon chemin et script
    let config = load_projects().await?;
    let project = config
        .projects
        .iter()
        .find(|p| p.backend_path == project_path || p.frontend_path == project_path)
        .ok_or_else(|| "Project not found".to_string())?;

    // Déterminer le chemin de travail selon le service
    let work_dir = match service_name.as_str() {
        "backend" => &project.backend_path,
        "frontend" => &project.frontend_path,
        "tunnel" => &project.backend_path, // Tunnel utilise backend_path
        _ => &project.backend_path,
    };

    // Vérifier que le dossier existe
    let path = PathBuf::from(work_dir);
    if !path.exists() {
        return Err(format!("Project path does not exist: {}", work_dir));
    }

    // Construire la commande complète avec le chemin des scripts
    let scripts_path = PathBuf::from(&project.scripts_path);
    let full_command = if command.starts_with('/') || command.starts_with("~/") {
        // Chemin absolu
        command
    } else {
        // Chemin relatif depuis scripts_path
        scripts_path.join(&command).to_string_lossy().to_string()
    };

    // Séparer la commande en parties
    let parts: Vec<&str> = full_command.split_whitespace().collect();
    if parts.is_empty() {
        return Err("Command is empty".to_string());
    }

    let program = parts[0];
    let args = &parts[1..];

    // Démarrer le processus en arrière-plan
    let mut cmd = Command::new(program);
    cmd.args(args);
    cmd.current_dir(work_dir);
    cmd.stdout(Stdio::null());
    cmd.stderr(Stdio::null());

    // Démarrer le processus et enregistrer le PID
    match cmd.spawn() {
        Ok(child) => {
            let pid = child.id();
            Ok(format!("Service {} started (PID: {})", service_name, pid))
        }
        Err(e) => Err(format!("Failed to start service: {}", e)),
    }
}

/// Arrête un service d'un projet
#[tauri::command]
pub async fn stop_project_service(
    project_path: String,
    service_name: String,
    port: u16,
) -> Result<String, String> {
    use crate::projects::load_projects;

    // Gérer le tunnel SSH spécialement (port 0)
    if service_name == "tunnel" {
        // Charger les projets pour trouver le script stop du tunnel
        let config = load_projects().await?;
        let project = config
            .projects
            .iter()
            .find(|p| p.backend_path == project_path || p.frontend_path == project_path)
            .ok_or_else(|| "Project not found".to_string())?;

        // Si un script stop est configuré, l'utiliser
        if let Some(tunnel) = &project.services.tunnel {
            if let Some(stop_script) = &tunnel.stop {
                let scripts_path = PathBuf::from(&project.scripts_path);
                let full_command = if stop_script.starts_with('/') || stop_script.starts_with("~/")
                {
                    stop_script.clone()
                } else {
                    scripts_path.join(stop_script).to_string_lossy().to_string()
                };

                // Exécuter le script stop
                let parts: Vec<&str> = full_command.split_whitespace().collect();
                if !parts.is_empty() {
                    let program = parts[0];
                    let args = &parts[1..];

                    let output = Command::new(program)
                        .args(args)
                        .current_dir(&project.backend_path)
                        .output()
                        .map_err(|e| format!("Failed to execute stop script: {}", e))?;

                    if output.status.success() {
                        return Ok("Tunnel SSH stopped".to_string());
                    }
                }
            }
        }

        // Sinon, essayer de trouver et arrêter les processus SSH liés au projet
        // Utiliser pkill pour arrêter les tunnels SSH
        let output = Command::new("pkill")
            .arg("-f")
            .arg("ssh.*-L") // Chercher les tunnels SSH avec port forwarding
            .output();

        if let Ok(cmd_output) = output {
            if cmd_output.status.success() || cmd_output.status.code() == Some(1) {
                // Code 1 signifie qu'aucun processus n'a été trouvé (déjà arrêté)
                return Ok("Tunnel SSH stopped or was not running".to_string());
            }
        }

        // Si on arrive ici, considérer que c'est un succès (tunnel peut ne pas être en cours)
        return Ok("Tunnel SSH was not running".to_string());
    }

    // Pour les autres services, trouver le PID par le port
    if port > 0 {
        if let Some(pid) = find_pid_by_port(port) {
            // Tuer le processus
            let output = Command::new("kill")
                .arg("-9")
                .arg(pid.to_string())
                .output()
                .map_err(|e| format!("Failed to execute kill: {}", e))?;

            if output.status.success() {
                return Ok(format!("Service {} stopped (PID: {})", service_name, pid));
            } else {
                return Err(format!("Failed to kill process {}", pid));
            }
        }
    }

    // Si le port est 0 ou si on n'a pas trouvé de processus par port
    {
        // Essayer de trouver par nom de processus
        // Pour Netdata, essayer d'abord avec systemctl
        if service_name == "netdata" {
            if let Ok(output) = Command::new("systemctl")
                .arg("is-active")
                .arg("netdata")
                .output()
            {
                if output.status.success() {
                    // Netdata est actif via systemctl, l'arrêter
                    if let Ok(stop_output) = Command::new("systemctl")
                        .arg("stop")
                        .arg("netdata")
                        .output()
                    {
                        if stop_output.status.success() {
                            return Ok("Service netdata stopped via systemctl".to_string());
                        }
                    }
                }
            }

            // Essayer avec pkill pour les processus Netdata
            let pkill_output = Command::new("pkill").arg("-x").arg("netdata").output();

            if let Ok(output) = pkill_output {
                if output.status.success() {
                    return Ok("Service netdata stopped".to_string());
                }
            }

            // Si on arrive ici, Netdata n'était probablement pas en cours d'exécution
            // C'est considéré comme un succès car l'objectif (arrêter) est atteint
            return Ok("Service netdata was not running".to_string());
        }

        // Pour les autres services, essayer avec pkill
        let output = Command::new("pkill")
            .arg("-f")
            .arg(&service_name)
            .output()
            .map_err(|e| format!("Failed to execute pkill: {}", e))?;

        if output.status.success() {
            Ok(format!("Service {} stopped", service_name))
        } else {
            // Le service n'était probablement pas en cours d'exécution
            // C'est considéré comme un succès
            Ok(format!("Service {} was not running", service_name))
        }
    }
}

/// Ouvre un projet dans VS Code
#[tauri::command]
pub async fn open_in_vscode(path: String) -> Result<String, String> {
    let output = Command::new("code").arg(&path).output().map_err(|e| {
        format!(
            "Failed to open VS Code: {}. Make sure 'code' is in your PATH.",
            e
        )
    })?;

    if output.status.success() {
        Ok("VS Code opened".to_string())
    } else {
        Err("Failed to open VS Code".to_string())
    }
}

/// Exécute une commande système générique
///
/// ⚠️ Sécurité: Cette fonction exécute des commandes shell.
/// Elle devrait être utilisée uniquement pour des commandes sûres.
#[tauri::command]
pub async fn run_command(cmd: String) -> Result<String, String> {
    // Liste des commandes potentiellement dangereuses à bloquer
    let dangerous_commands = [
        "rm -rf", "rm -r", "rm -f", "dd if=", "mkfs", "fdisk", "shutdown", "reboot", "halt",
        "sudo", "su ", "passwd",
    ];

    let cmd_lower = cmd.to_lowercase();
    for dangerous in &dangerous_commands {
        if cmd_lower.contains(dangerous) {
            return Err(format!("Commande dangereuse bloquée: {}", dangerous));
        }
    }

    // Exécuter la commande via sh -c
    let output = Command::new("sh")
        .arg("-c")
        .arg(&cmd)
        .output()
        .map_err(|e| format!("Failed to execute command: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(stdout.to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Command failed: {}", stderr))
    }
}

/// Démarre un service
#[tauri::command]
pub async fn start_service(
    service: String,
    app: AppHandle,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<String, String> {
    use std::process::{Command, Stdio};

    // Vérifier si le service est déjà en cours d'exécution
    if let Some(pid) = state.get_pid(&service) {
        // Vérifier si le processus existe encore
        let check_cmd = Command::new("ps").arg("-p").arg(pid.to_string()).output();

        if let Ok(output) = check_cmd {
            if output.status.success() {
                return Err(format!(
                    "Service {} is already running (PID: {})",
                    service, pid
                ));
            }
        }
        // Le processus n'existe plus, on peut le retirer
        state.remove_pid(&service);
    }

    // Obtenir le chemin du script embarqué
    let script_name = match service.as_str() {
        "tunnel" => "tunnel-on.sh",
        "backend" => "backend-on.sh",
        "frontend" => "frontend-on.sh",
        "netdata" => "netdata-on.sh",
        _ => return Err(format!("Unknown service: {}", service)),
    };

    let script_path = get_script_path(&app, script_name)?;

    // Lancer le script
    let mut cmd = Command::new("bash");
    cmd.arg(&script_path);
    cmd.stdout(Stdio::null());
    cmd.stderr(Stdio::null());
    cmd.stdin(Stdio::null());

    match cmd.spawn() {
        Ok(child) => {
            let pid = child.id();
            state.register_pid(service.clone(), pid);
            Ok(format!("Service {} started (PID: {})", service, pid))
        }
        Err(e) => Err(format!("Failed to start service {}: {}", service, e)),
    }
}

/// Arrête un service
#[tauri::command]
pub async fn stop_service(
    service: String,
    app: AppHandle,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<String, String> {
    use std::process::Command;

    // Obtenir le chemin du script OFF embarqué
    let script_name = match service.as_str() {
        "tunnel" => "tunnel-off.sh",
        "backend" => "backend-off.sh",
        "frontend" => "frontend-off.sh",
        "netdata" => "netdata-off.sh",
        _ => {
            // Pour les services inconnus, essayer de tuer par PID
            if let Some(pid) = state.get_pid(&service) {
                kill_process(pid)?;
                state.remove_pid(&service);
                return Ok(format!("Service {} stopped (PID: {})", service, pid));
            }
            return Err(format!("Unknown service: {}", service));
        }
    };

    // Exécuter le script OFF
    let script_path = get_script_path(&app, script_name)?;
    let output = Command::new("bash")
        .arg(&script_path)
        .output()
        .map_err(|e| format!("Failed to execute stop script: {}", e))?;

    // Retirer le PID de l'état même si le script a échoué
    if state.get_pid(&service).is_some() {
        state.remove_pid(&service);
    }

    // Pour Netdata, le script peut retourner un message même si le service n'était pas actif
    // C'est considéré comme un succès car l'objectif (arrêter) est atteint
    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let message = stdout.trim();
        if message.is_empty() {
            Ok(format!("Service {} stopped", service))
        } else {
            Ok(message.to_string())
        }
    } else {
        // Le script a échoué, mais on a retiré le PID quand même
        let error_msg = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);

        // Si le message stdout indique que le service n'était pas actif, c'est OK
        if stdout.contains("n'était pas en cours d'exécution")
            || stdout.contains("was not running")
            || stdout.contains("not found")
        {
            Ok(stdout.trim().to_string())
        } else {
            // Vraie erreur
            Err(format!("Failed to stop service {}: {}", service, error_msg))
        }
    }
}

#[tauri::command]
pub async fn start_service_v3(
    app_handle: AppHandle,
    project_id: String,
    service: String,
) -> Result<ScriptResult, String> {
    let cfg = load_projects_v3().await.map_err(|e| e)?;
    let project =
        get_project_by_id(&cfg, &project_id).ok_or_else(|| "Project not found".to_string())?;
    let script = resolve_script(&service, "start").ok_or_else(|| "Unknown service".to_string())?;
    let cwd = Some(PathBuf::from(&project.root_path));
    let envs = build_envs(project, &service);
    Ok(run_embedded_script(&app_handle, script, cwd, envs))
}

#[tauri::command]
pub async fn status_service_v3(project_id: String, service: String) -> Result<String, String> {
    let cfg = load_projects_v3().await.map_err(|e| e)?;
    let project =
        get_project_by_id(&cfg, &project_id).ok_or_else(|| "Project not found".to_string())?;
    let running = match service.as_str() {
        "backend" => status_for_backend(project),
        "frontend" => status_for_frontend(project),
        "tunnel" => status_for_tunnel(project),
        "netdata" => status_for_netdata(),
        _ => return Err(format!("Unknown service: {}", service)),
    };

    Ok(if running { "RUNNING".into() } else { "STOPPED".into() })
}

#[tauri::command]
pub async fn stop_service_v3(
    app_handle: AppHandle,
    project_id: String,
    service: String,
) -> Result<ScriptResult, String> {
    let cfg = load_projects_v3().await.map_err(|e| e)?;
    let project =
        get_project_by_id(&cfg, &project_id).ok_or_else(|| "Project not found".to_string())?;
    let script = resolve_script(&service, "stop").ok_or_else(|| "Unknown service".to_string())?;
    let cwd = Some(PathBuf::from(&project.root_path));
    let envs = build_envs(project, &service);
    Ok(run_embedded_script(&app_handle, script, cwd, envs))
}
#[tauri::command]
pub async fn kill_zombies_v3(app_handle: AppHandle) -> Result<ScriptResult, String> {
    let script =
        resolve_script("zombies", "kill").ok_or_else(|| "Missing kill script".to_string())?;
    Ok(run_embedded_script(&app_handle, script, None, Vec::new()))
}

/// Tue un processus par son PID
fn kill_process(pid: u32) -> Result<(), String> {
    use std::process::Command;

    // Essayer d'abord avec SIGTERM (arrêt propre)
    let term_output = Command::new("kill")
        .arg("-TERM")
        .arg(pid.to_string())
        .output()
        .map_err(|e| format!("Failed to execute kill: {}", e))?;

    if term_output.status.success() {
        // Attendre un peu pour que le processus se termine proprement
        std::thread::sleep(std::time::Duration::from_millis(500));

        // Vérifier si le processus existe encore
        let check_output = Command::new("ps")
            .arg("-p")
            .arg(pid.to_string())
            .output()
            .ok();

        if let Some(output) = check_output {
            if output.status.success() {
                // Le processus existe encore, utiliser SIGKILL
                let kill_output = Command::new("kill")
                    .arg("-9")
                    .arg(pid.to_string())
                    .output()
                    .map_err(|e| format!("Failed to execute kill -9: {}", e))?;

                if !kill_output.status.success() {
                    return Err(format!("Failed to kill process {}", pid));
                }
            }
        }
        Ok(())
    } else {
        // SIGTERM a échoué, essayer SIGKILL directement
        let kill_output = Command::new("kill")
            .arg("-9")
            .arg(pid.to_string())
            .output()
            .map_err(|e| format!("Failed to execute kill -9: {}", e))?;

        if kill_output.status.success() {
            Ok(())
        } else {
            Err(format!("Failed to kill process {}", pid))
        }
    }
}

/// Trouve un processus par son nom
fn find_process_by_name(service: &str) -> Option<u32> {
    use std::process::Command;

    // Mapping des noms de services vers les noms de processus
    let process_name = match service {
        "tunnel" => "ssh",
        "backend" => "node",
        "frontend" => "node",
        "netdata" => "netdata",
        _ => return None,
    };

    // Utiliser pgrep pour trouver le PID
    let output = Command::new("pgrep")
        .arg("-f")
        .arg(process_name)
        .output()
        .ok()?;

    if output.status.success() {
        let pid_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if let Some(first_pid) = pid_str.lines().next() {
            first_pid.parse::<u32>().ok()
        } else {
            None
        }
    } else {
        None
    }
}

/// Arrête tous les services
#[tauri::command]
pub async fn stop_all_services(
    app: AppHandle,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<String, String> {
    let services = vec!["tunnel", "backend", "frontend", "netdata"];
    let mut stopped = Vec::new();
    let mut errors = Vec::new();

    // Arrêter tous les services avec leurs scripts OFF
    for service in &services {
        match stop_service(service.to_string(), app.clone(), state.clone()).await {
            Ok(msg) => stopped.push(format!("{}: {}", service, msg)),
            Err(e) => errors.push(format!("{}: {}", service, e)),
        }
    }

    // Appeler kill-zombies pour nettoyer les processus restants
    match kill_zombies(app.clone()).await {
        Ok(msg) => stopped.push(format!("kill-zombies: {}", msg)),
        Err(e) => errors.push(format!("kill-zombies: {}", e)),
    }

    if errors.is_empty() {
        Ok(format!(
            "All services stopped successfully.\n{}",
            stopped.join("\n")
        ))
    } else {
        Err(format!(
            "Some services failed to stop.\nStopped:\n{}\n\nErrors:\n{}",
            stopped.join("\n"),
            errors.join("\n")
        ))
    }
}

/// Tue les processus zombies
#[tauri::command]
pub async fn kill_zombies(app: AppHandle) -> Result<String, String> {
    use std::process::Command;

    // Obtenir le chemin du script kill-zombies embarqué
    let script_path = get_script_path(&app, "kill-zombies.sh")?;

    // Exécuter le script
    let output = Command::new("bash")
        .arg(&script_path)
        .output()
        .map_err(|e| format!("Failed to execute kill-zombies script: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(stdout.to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to kill zombies: {}", stderr))
    }
}

/// Lit l'utilisation CPU depuis /proc/stat
fn get_cpu_usage() -> Result<f64, String> {
    let stat_content = std::fs::read_to_string("/proc/stat")
        .map_err(|e| format!("Failed to read /proc/stat: {}", e))?;

    let first_line = stat_content.lines().next().ok_or("Empty /proc/stat")?;

    let parts: Vec<&str> = first_line.split_whitespace().collect();
    if parts.len() < 8 {
        return Err("Invalid /proc/stat format".to_string());
    }

    // user, nice, system, idle, iowait, irq, softirq, steal
    let user: u64 = parts[1].parse().unwrap_or(0);
    let nice: u64 = parts[2].parse().unwrap_or(0);
    let system: u64 = parts[3].parse().unwrap_or(0);
    let idle: u64 = parts[4].parse().unwrap_or(0);
    let iowait: u64 = parts[5].parse().unwrap_or(0);
    let irq: u64 = parts[6].parse().unwrap_or(0);
    let softirq: u64 = parts[7].parse().unwrap_or(0);
    let steal: u64 = if parts.len() > 8 {
        parts[8].parse().unwrap_or(0)
    } else {
        0
    };

    let total_idle = idle + iowait;
    let total_non_idle = user + nice + system + irq + softirq + steal;
    let total = total_idle + total_non_idle;

    if total == 0 {
        return Ok(0.0);
    }

    // Calcul simple: (non_idle / total) * 100
    let usage = (total_non_idle as f64 / total as f64) * 100.0;
    Ok(usage.min(100.0).max(0.0))
}

/// Lit l'utilisation RAM depuis /proc/meminfo
fn get_ram_usage() -> Result<f64, String> {
    let meminfo = std::fs::read_to_string("/proc/meminfo")
        .map_err(|e| format!("Failed to read /proc/meminfo: {}", e))?;

    let mut mem_total = 0u64;
    let mut mem_available = 0u64;

    for line in meminfo.lines() {
        if line.starts_with("MemTotal:") {
            if let Some(value) = line.split_whitespace().nth(1) {
                mem_total = value.parse().unwrap_or(0);
            }
        } else if line.starts_with("MemAvailable:") {
            if let Some(value) = line.split_whitespace().nth(1) {
                mem_available = value.parse().unwrap_or(0);
            }
        }
    }

    if mem_total == 0 {
        return Err("Could not determine total memory".to_string());
    }

    let used = mem_total.saturating_sub(mem_available);
    let usage = (used as f64 / mem_total as f64) * 100.0;
    Ok(usage.min(100.0).max(0.0))
}

/// Lit l'utilisation disque depuis df
fn get_disk_usage() -> Result<f64, String> {
    let output = Command::new("df")
        .arg("-h")
        .arg("/")
        .output()
        .map_err(|e| format!("Failed to execute df: {}", e))?;

    if !output.status.success() {
        return Err("df command failed".to_string());
    }

    let output_str = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = output_str.lines().collect();

    if lines.len() < 2 {
        return Err("Invalid df output".to_string());
    }

    // Parser la ligne de données (ligne 1, après l'en-tête)
    let data_line = lines[1];
    let parts: Vec<&str> = data_line.split_whitespace().collect();

    if parts.len() < 5 {
        return Err("Invalid df output format".to_string());
    }

    // Format: Filesystem Size Used Avail Use% Mounted
    // On cherche le pourcentage (avant-dernier champ généralement)
    for part in parts.iter().rev() {
        if part.ends_with('%') {
            let percent_str = part.trim_end_matches('%');
            if let Ok(percent) = percent_str.parse::<f64>() {
                return Ok(percent.min(100.0).max(0.0));
            }
        }
    }

    Err("Could not parse disk usage percentage".to_string())
}

/// Lit l'uptime depuis /proc/uptime
fn get_uptime() -> Result<u64, String> {
    let uptime_content = std::fs::read_to_string("/proc/uptime")
        .map_err(|e| format!("Failed to read /proc/uptime: {}", e))?;

    let parts: Vec<&str> = uptime_content.split_whitespace().collect();
    if parts.is_empty() {
        return Err("Empty /proc/uptime".to_string());
    }

    let uptime_seconds: f64 = parts[0]
        .parse()
        .map_err(|_| "Invalid uptime format".to_string())?;

    Ok(uptime_seconds as u64)
}

/// Vérifie le statut du système
#[tauri::command]
pub async fn check_status(
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<SystemStatus, String> {
    // Vérifier le statut des services depuis l'AppState
    let all_pids = state.get_all_pids();

    // Vérifier si les processus existent encore
    let mut services_status = ServicesStatus {
        tunnel: false,
        backend: false,
        frontend: false,
        netdata: false,
    };

    for (service, pid) in all_pids.iter() {
        // Vérifier si le processus existe
        let check_cmd = std::process::Command::new("ps")
            .arg("-p")
            .arg(pid.to_string())
            .output();

        if let Ok(output) = check_cmd {
            if output.status.success() {
                match service.as_str() {
                    "tunnel" => services_status.tunnel = true,
                    "backend" => services_status.backend = true,
                    "frontend" => services_status.frontend = true,
                    "netdata" => services_status.netdata = true,
                    _ => {}
                }
            } else {
                // Le processus n'existe plus, le retirer
                state.remove_pid(service);
            }
        }
    }

    // Récupérer les métriques système réelles
    let cpu = get_cpu_usage().unwrap_or(0.0);
    let ram = get_ram_usage().unwrap_or(0.0);
    let disk = get_disk_usage().unwrap_or(0.0);
    let uptime = get_uptime().unwrap_or(0);

    Ok(SystemStatus {
        cpu,
        ram,
        disk,
        uptime,
        services: services_status,
    })
}

#[allow(dead_code)]
#[tauri::command]
pub async fn get_system_stats_v3() -> Result<SystemStats, String> {
    let cpu = get_cpu_usage().unwrap_or(0.0);
    let ram = get_ram_usage().unwrap_or(0.0);
    let disk = get_disk_usage().unwrap_or(0.0);
    let uptime = get_uptime().unwrap_or(0);

    Ok(SystemStats {
        cpu,
        ram,
        disk,
        uptime,
    })
}

/// Lit les logs en temps réel
#[tauri::command]
pub async fn read_logs() -> Result<String, String> {
    // Essayer d'abord journalctl (systèmes modernes avec systemd)
    let journalctl_output = Command::new("journalctl")
        .arg("--no-pager")
        .arg("-n")
        .arg("100") // Dernières 100 lignes
        .arg("--since")
        .arg("5 minutes ago")
        .arg("--output")
        .arg("short")
        .output();

    if let Ok(output) = journalctl_output {
        if output.status.success() {
            let logs = String::from_utf8_lossy(&output.stdout);
            if !logs.trim().is_empty() {
                return Ok(logs.to_string());
            }
        }
    }

    // Fallback: essayer /var/log/syslog
    if let Ok(syslog_content) = std::fs::read_to_string("/var/log/syslog") {
        let lines: Vec<&str> = syslog_content.lines().collect();
        let last_lines: Vec<&str> = lines.iter().rev().take(100).rev().copied().collect();
        if !last_lines.is_empty() {
            return Ok(last_lines.join("\n") + "\n");
        }
    }

    // Fallback: essayer /var/log/messages
    if let Ok(messages_content) = std::fs::read_to_string("/var/log/messages") {
        let lines: Vec<&str> = messages_content.lines().collect();
        let last_lines: Vec<&str> = lines.iter().rev().take(100).rev().copied().collect();
        if !last_lines.is_empty() {
            return Ok(last_lines.join("\n") + "\n");
        }
    }

    // Si aucun log n'est disponible, retourner un message informatif
    Ok(
        "Aucun log système disponible.\nEssayez d'exécuter avec les permissions appropriées.\n"
            .to_string(),
    )
}
