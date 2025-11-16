use serde::{Deserialize, Serialize};
use std::fs;
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

/// Retourne le chemin du fichier de configuration des projets
fn get_projects_config_path() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "HOME environment variable not set")?;
    let config_dir = PathBuf::from(home).join(".gestionmax-devcenter");
    
    // Créer le dossier s'il n'existe pas
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }
    
    Ok(config_dir.join("projects.json"))
}

/// Liste tous les projets depuis le fichier JSON
#[tauri::command]
pub async fn list_projects() -> Result<Vec<Project>, String> {
    let config_path = get_projects_config_path()?;
    
    // Si le fichier n'existe pas, créer un fichier vide
    if !config_path.exists() {
        let empty: Vec<Project> = Vec::new();
        let json = serde_json::to_string_pretty(&empty)
            .map_err(|e| format!("Failed to serialize empty projects: {}", e))?;
        fs::write(&config_path, json)
            .map_err(|e| format!("Failed to create projects.json: {}", e))?;
        return Ok(empty);
    }
    
    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read projects.json: {}", e))?;
    
    let projects: Vec<Project> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse projects.json: {}", e))?;
    
    Ok(projects)
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
    let config_path = get_projects_config_path()?;
    
    if !config_path.exists() {
        return Ok(Vec::new());
    }
    
    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read projects.json: {}", e))?;
    
    let projects: Vec<Project> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse projects.json: {}", e))?;
    
    // Trouver le projet correspondant
    let project = projects
        .iter()
        .find(|p| p.path == project_path)
        .ok_or_else(|| "Project not found".to_string())?;
    
    let mut statuses = Vec::new();
    
    for service in &project.services {
        let port_open = is_port_open(service.port);
        let pid = if port_open { find_pid_by_port(service.port) } else { None };
        
        let status = if port_open {
            "RUNNING".to_string()
        } else {
            "STOPPED".to_string()
        };
        
        statuses.push(ServiceStatus {
            name: service.name.clone(),
            port: service.port,
            status,
            pid,
        });
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
    // Vérifier que le dossier du projet existe
    let path = PathBuf::from(&project_path);
    if !path.exists() {
        return Err(format!("Project path does not exist: {}", project_path));
    }
    
    // Séparer la commande en parties (ex: "pnpm dev:backend" -> ["pnpm", "dev:backend"])
    let parts: Vec<&str> = command.split_whitespace().collect();
    if parts.is_empty() {
        return Err("Command is empty".to_string());
    }
    
    let program = parts[0];
    let args = &parts[1..];
    
    // Démarrer le processus en arrière-plan
    let mut cmd = Command::new(program);
    cmd.args(args);
    cmd.current_dir(&project_path);
    cmd.stdout(Stdio::null());
    cmd.stderr(Stdio::null());
    
    // Démarrer le processus
    match cmd.spawn() {
        Ok(_) => Ok(format!("Service {} started", service_name)),
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
pub async fn start_service(service: String) -> Result<String, String> {
    // TODO: Implémenter le démarrage des services
    // Exemple:
    // - tunnel: exécuter le script de tunnel SSH
    // - backend: démarrer Payload
    // - frontend: démarrer Next.js
    // - netdata: démarrer Netdata
    Ok(format!("Service {} started", service))
}

/// Arrête un service
#[tauri::command]
pub async fn stop_service(service: String) -> Result<String, String> {
    // TODO: Implémenter l'arrêt des services
    // Exemple: trouver le processus et le tuer
    Ok(format!("Service {} stopped", service))
}

/// Arrête tous les services
#[tauri::command]
pub async fn stop_all_services() -> Result<String, String> {
    // TODO: Implémenter l'arrêt de tous les services
    Ok("All services stopped".to_string())
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
pub async fn check_status() -> Result<SystemStatus, String> {
    // TODO: Implémenter la récupération du statut système réel
    // - CPU: utiliser sysinfo ou /proc/stat
    // - RAM: utiliser sysinfo ou /proc/meminfo
    // - Disk: utiliser sysinfo ou df
    // - Uptime: utiliser /proc/uptime
    // - Services: vérifier si les processus sont en cours d'exécution
    
    // Pour l'instant, retourner des valeurs dummy
    Ok(SystemStatus {
        cpu: 25.5,
        ram: 45.2,
        disk: 60.0,
        uptime: 3600, // 1 heure en secondes
        services: ServicesStatus {
            tunnel: false,
            backend: false,
            frontend: false,
            netdata: false,
        },
    })
}

/// Lit les logs en temps réel
#[tauri::command]
pub async fn read_logs() -> Result<String, String> {
    // TODO: Implémenter la lecture des logs
    // Exemple: lire depuis un fichier de log ou capturer stdout/stderr des processus
    Ok("Logs will be displayed here...\n".to_string())
}
