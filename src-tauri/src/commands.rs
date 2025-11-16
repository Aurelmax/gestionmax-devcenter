use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::{Command, Stdio};

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemStatus {
    pub cpu: f64,
    pub ram: f64,
    pub disk: f64,
    pub uptime: u64,
    pub services: ServicesStatus,
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
    let old_projects: Vec<Project> = config.projects.into_iter().map(|new_p| {
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
        
        if let Some(netdata) = new_p.services.netdata {
            services.push(ProjectService {
                name: "netdata".to_string(),
                port: netdata.port.unwrap_or(19999),
                command: netdata.start,
            });
        }
        
        Project {
            name: new_p.name,
            path: new_p.backend_path,
            stack: "Custom".to_string(),
            services,
        }
    }).collect();
    
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
        let output = Command::new("ss")
            .arg("-tlnp")
            .output()
            .ok()?;
        
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
    let project = config.projects
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
            let pid = if port_open { find_pid_by_port(port) } else { None };
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
            let pid = if port_open { find_pid_by_port(port) } else { None };
            statuses.push(ServiceStatus {
                name: "frontend".to_string(),
                port,
                status: if port_open { "RUNNING" } else { "STOPPED" }.to_string(),
                pid,
            });
        }
    }
    
    if let Some(netdata) = &project.services.netdata {
        if let Some(port) = netdata.port {
            let port_open = is_port_open(port);
            let pid = if port_open { find_pid_by_port(port) } else { None };
            statuses.push(ServiceStatus {
                name: "netdata".to_string(),
                port,
                status: if port_open { "RUNNING" } else { "STOPPED" }.to_string(),
                pid,
            });
        }
    }
    
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
    let project = config.projects
        .iter()
        .find(|p| p.backend_path == project_path || p.frontend_path == project_path)
        .ok_or_else(|| "Project not found".to_string())?;
    
    // Déterminer le chemin de travail selon le service
    let work_dir = match service_name.as_str() {
        "backend" => &project.backend_path,
        "frontend" => &project.frontend_path,
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
    _project_path: String,
    service_name: String,
    port: u16,
) -> Result<String, String> {
    // Trouver le PID par le port
    if let Some(pid) = find_pid_by_port(port) {
        // Tuer le processus
        let output = Command::new("kill")
            .arg("-9")
            .arg(pid.to_string())
            .output()
            .map_err(|e| format!("Failed to execute kill: {}", e))?;
        
        if output.status.success() {
            Ok(format!("Service {} stopped (PID: {})", service_name, pid))
        } else {
            Err(format!("Failed to kill process {}", pid))
        }
    } else {
        // Essayer de trouver par nom de processus
        let output = Command::new("pkill")
            .arg("-f")
            .arg(&service_name)
            .output()
            .map_err(|e| format!("Failed to execute pkill: {}", e))?;
        
        if output.status.success() {
            Ok(format!("Service {} stopped", service_name))
        } else {
            Err(format!("Service {} not found or already stopped", service_name))
        }
    }
}

/// Ouvre un projet dans VS Code
#[tauri::command]
pub async fn open_in_vscode(path: String) -> Result<String, String> {
    let output = Command::new("code")
        .arg(&path)
        .output()
        .map_err(|e| format!("Failed to open VS Code: {}. Make sure 'code' is in your PATH.", e))?;
    
    if output.status.success() {
        Ok("VS Code opened".to_string())
    } else {
        Err("Failed to open VS Code".to_string())
    }
}

/// Exécute une commande système générique
#[tauri::command]
pub async fn run_command(cmd: String) -> Result<String, String> {
    // TODO: Implémenter l'exécution de commandes système
    // Exemple: utiliser std::process::Command pour exécuter des scripts bash
    Ok(format!("Command executed: {}", cmd))
}

/// Démarre un service
#[tauri::command]
pub async fn start_service(
    service: String,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<String, String> {
    use std::process::{Command, Stdio};
    
    // Vérifier si le service est déjà en cours d'exécution
    if let Some(pid) = state.get_pid(&service) {
        // Vérifier si le processus existe encore
        let check_cmd = Command::new("ps")
            .arg("-p")
            .arg(pid.to_string())
            .output();
        
        if let Ok(output) = check_cmd {
            if output.status.success() {
                return Err(format!("Service {} is already running (PID: {})", service, pid));
            }
        }
        // Le processus n'existe plus, on peut le retirer
        state.remove_pid(&service);
    }
    
    // Déterminer la commande selon le service
    let home = std::env::var("HOME").map_err(|_| "HOME not set")?;
    
    let (program, args_vec) = match service.as_str() {
        "tunnel" => {
            let script = format!("{}/scripts/dev-tools/tunnel.sh", home);
            let script_path_buf = std::path::PathBuf::from(&script);
            if !script_path_buf.exists() {
                return Err(format!("Script not found: {}", script));
            }
            (String::from("bash"), vec![script])
        }
        "backend" => {
            let script = format!("{}/scripts/dev-tools/start-dev.sh", home);
            let script_path_buf = std::path::PathBuf::from(&script);
            if !script_path_buf.exists() {
                return Err(format!("Script not found: {}", script));
            }
            (String::from("bash"), vec![script, String::from("backend")])
        }
        "frontend" => {
            let script = format!("{}/scripts/dev-tools/start-dev.sh", home);
            let script_path_buf = std::path::PathBuf::from(&script);
            if !script_path_buf.exists() {
                return Err(format!("Script not found: {}", script));
            }
            (String::from("bash"), vec![script, String::from("frontend")])
        }
        "netdata" => {
            let script = format!("{}/scripts/dev-tools/netdata-on.sh", home);
            let script_path_buf = std::path::PathBuf::from(&script);
            if script_path_buf.exists() {
                (String::from("bash"), vec![script])
            } else {
                (String::from("netdata"), vec![])
            }
        }
        _ => return Err(format!("Unknown service: {}", service)),
    };
    
    // Lancer le processus
    let mut cmd = Command::new(&program);
    for arg in &args_vec {
        cmd.arg(arg);
    }
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
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<String, String> {
    
    // Récupérer le PID depuis l'état
    let pid = match state.get_pid(&service) {
        Some(pid) => pid,
        None => {
            // Essayer de trouver le processus par nom
            return match find_process_by_name(&service) {
                Some(pid) => {
                    kill_process(pid)?;
                    state.remove_pid(&service);
                    Ok(format!("Service {} stopped (PID: {})", service, pid))
                }
                None => Err(format!("Service {} is not running", service)),
            };
        }
    };
    
    // Tuer le processus
    kill_process(pid)?;
    
    // Retirer le PID de l'état
    state.remove_pid(&service);
    
    Ok(format!("Service {} stopped (PID: {})", service, pid))
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
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<String, String> {
    let all_pids = state.get_all_pids();
    
    if all_pids.is_empty() {
        return Ok("No services to stop".to_string());
    }
    
    let mut stopped = Vec::new();
    let mut errors = Vec::new();
    
    // Arrêter tous les services enregistrés
    for (service, pid) in all_pids.iter() {
        match kill_process(*pid) {
            Ok(_) => {
                state.remove_pid(service);
                stopped.push(format!("{} (PID: {})", service, pid));
            }
            Err(e) => {
                errors.push(format!("{}: {}", service, e));
            }
        }
    }
    
    // Arrêter aussi les services qui pourraient tourner sans être enregistrés
    let services = vec!["tunnel", "backend", "frontend", "netdata"];
    for service in services {
        if let Some(pid) = find_process_by_name(service) {
            // Vérifier qu'on ne l'a pas déjà arrêté
            if !all_pids.contains_key(service) {
                match kill_process(pid) {
                    Ok(_) => {
                        stopped.push(format!("{} (PID: {})", service, pid));
                    }
                    Err(e) => {
                        errors.push(format!("{}: {}", service, e));
                    }
                }
            }
        }
    }
    
    if errors.is_empty() {
        Ok(format!("All services stopped: {}", stopped.join(", ")))
    } else {
        Err(format!(
            "Some services failed to stop. Stopped: {}. Errors: {}",
            stopped.join(", "),
            errors.join(", ")
        ))
    }
}

/// Tue les processus zombies
#[tauri::command]
pub async fn kill_zombies() -> Result<String, String> {
    // TODO: Implémenter la détection et l'élimination des processus zombies
    // Exemple: utiliser ps pour trouver les zombies et les tuer
    Ok("Zombie processes killed".to_string())
}

/// Vérifie le statut du système
#[tauri::command]
pub async fn check_status(
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<SystemStatus, String> {
    // TODO: Implémenter la récupération du statut système réel
    // - CPU: utiliser sysinfo ou /proc/stat
    // - RAM: utiliser sysinfo ou /proc/meminfo
    // - Disk: utiliser sysinfo ou df
    // - Uptime: utiliser /proc/uptime
    
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
    
    // Pour l'instant, retourner des valeurs dummy pour les métriques système
    Ok(SystemStatus {
        cpu: 25.5,
        ram: 45.2,
        disk: 60.0,
        uptime: 3600, // 1 heure en secondes
        services: services_status,
    })
}

/// Lit les logs en temps réel
#[tauri::command]
pub async fn read_logs() -> Result<String, String> {
    // TODO: Implémenter la lecture des logs
    // Exemple: lire depuis un fichier de log ou capturer stdout/stderr des processus
    Ok("Logs will be displayed here...\n".to_string())
}
