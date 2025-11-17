use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use regex::Regex;

use crate::projects::{Project, ProjectCommand, ProjectServices};

/// Liste des dossiers à ignorer lors du scan
const IGNORE_DIRS: &[&str] = &[
    "_archive",
    "archive",
    "docs",
    "documentation",
    "frontend-backup",
    "backend-backup",
    ".git",
    ".vscode",
    ".idea",
    "__tests__",
    "dist",
    "node_modules",
];

/// Vérifie si un dossier doit être ignoré
fn should_ignore_dir(dir_name: &str) -> bool {
    IGNORE_DIRS.iter().any(|&ignore| dir_name == ignore || dir_name.starts_with(ignore))
}

/// Ouvre un dialogue pour choisir un dossier de projet
#[tauri::command]
pub async fn pick_project_folder() -> Result<String, String> {
    // Utiliser zenity ou un autre dialogue système pour choisir un dossier
    let output = Command::new("zenity")
        .arg("--file-selection")
        .arg("--directory")
        .arg("--title=Choisir le dossier du projet")
        .output()
        .map_err(|e| format!("Failed to open file picker: {}. Install zenity: sudo apt install zenity", e))?;
    
    if !output.status.success() {
        return Err("File picker cancelled".to_string());
    }
    
    let path = String::from_utf8(output.stdout)
        .map_err(|e| format!("Failed to parse path: {}", e))?;
    
    Ok(path.trim().to_string())
}

/// Détecte automatiquement la structure d'un projet (AutoScan v2 - Monorepo)
#[tauri::command]
pub async fn autoscan_project(root_path: String) -> Result<Project, String> {
    let root = PathBuf::from(&root_path);
    
    if !root.exists() {
        return Err(format!("Path does not exist: {}", root_path));
    }
    
    // Détecter le nom du projet depuis le nom du dossier
    let project_name = root
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown Project")
        .to_string();
    
    // Détecter backend (recherche récursive avec ignore list)
    let backend_path = detect_backend_v2(&root, 0)?;
    
    // Détecter frontend (recherche récursive avec ignore list)
    let frontend_path = detect_frontend_v2(&root, 0)?;
    
    // Détecter scripts (recherche récursive avec ignore list)
    let scripts_path = detect_scripts_v2(&root, 0)?;
    
    // Détecter les services
    let services = detect_services(&root, &backend_path, &frontend_path, &scripts_path)?;
    
    Ok(Project {
        name: project_name,
        backend_path: backend_path.unwrap_or_else(|| root_path.clone()),
        frontend_path: frontend_path.unwrap_or_else(|| root_path.clone()),
        scripts_path: scripts_path.unwrap_or_else(|| root.join("scripts").to_string_lossy().to_string()),
        services,
    })
}

/// Détecte le dossier backend Payload (v2 - avec ignore list et recherche récursive)
fn detect_backend_v2(root: &Path, depth: u32) -> Result<Option<String>, String> {
    // Limiter à 2 niveaux de profondeur
    if depth > 2 {
        return Ok(None);
    }
    
    // Vérifier si le root lui-même est un backend Payload
    let package_json = root.join("package.json");
    let payload_config = root.join("payload.config.ts");
    let src_dir = root.join("src");
    
    if package_json.exists() && (payload_config.exists() || src_dir.exists()) {
        // Vérifier si c'est vraiment Payload
        if payload_config.exists() {
            return Ok(Some(root.to_string_lossy().to_string()));
        }
        
        // Vérifier dans package.json
        if let Ok(content) = fs::read_to_string(&package_json) {
            if content.contains("payload") || content.contains("@payloadcms") {
                return Ok(Some(root.to_string_lossy().to_string()));
            }
        }
    }
    
    // Rechercher récursivement dans les sous-dossiers
    if let Ok(entries) = fs::read_dir(root) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                
                if path.is_dir() {
                    let dir_name = path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("");
                    
                    // Ignorer les dossiers parasites
                    if should_ignore_dir(dir_name) {
                        continue;
                    }
                    
                    // Rechercher récursivement
                    if let Ok(Some(backend_path)) = detect_backend_v2(&path, depth + 1) {
                        return Ok(Some(backend_path));
                    }
                }
            }
        }
    }
    
    Ok(None)
}

/// Détecte le dossier frontend Next.js (v2 - avec ignore list et recherche récursive)
fn detect_frontend_v2(root: &Path, depth: u32) -> Result<Option<String>, String> {
    // Limiter à 2 niveaux de profondeur
    if depth > 2 {
        return Ok(None);
    }
    
    // Vérifier si le root lui-même est un frontend Next.js
    let package_json = root.join("package.json");
    let next_config = root.join("next.config.js");
    
    if package_json.exists() {
        if let Ok(content) = fs::read_to_string(&package_json) {
            if content.contains("\"next\"") || content.contains("nextjs") {
                // Ignorer les backups
                let dir_name = root.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("");
                
                if !should_ignore_dir(dir_name) {
                    return Ok(Some(root.to_string_lossy().to_string()));
                }
            }
        }
    }
    
    // Vérifier next.config.js
    if next_config.exists() {
        let package_json = root.join("package.json");
        if package_json.exists() {
            if let Ok(content) = fs::read_to_string(&package_json) {
                if content.contains("\"next\"") {
                    let dir_name = root.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("");
                    
                    if !should_ignore_dir(dir_name) {
                        return Ok(Some(root.to_string_lossy().to_string()));
                    }
                }
            }
        }
    }
    
    // Rechercher récursivement dans les sous-dossiers
    if let Ok(entries) = fs::read_dir(root) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                
                if path.is_dir() {
                    let dir_name = path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("");
                    
                    // Ignorer les dossiers parasites
                    if should_ignore_dir(dir_name) {
                        continue;
                    }
                    
                    // Rechercher récursivement
                    if let Ok(Some(frontend_path)) = detect_frontend_v2(&path, depth + 1) {
                        return Ok(Some(frontend_path));
                    }
                }
            }
        }
    }
    
    Ok(None)
}

/// Détecte le dossier scripts (v2 - avec ignore list et recherche récursive)
fn detect_scripts_v2(root: &Path, depth: u32) -> Result<Option<String>, String> {
    // Limiter à 2 niveaux de profondeur
    if depth > 2 {
        return Ok(None);
    }
    
    // Priorité des dossiers scripts
    let scripts_paths = vec!["scripts", "scripts/dev-tools", "tools", "dev"];
    
    // Vérifier dans le root
    for dir_name in &scripts_paths {
        let scripts_path = root.join(dir_name);
        if scripts_path.exists() && scripts_path.is_dir() {
            // Vérifier qu'il contient des fichiers .sh
            if has_shell_scripts(&scripts_path) {
                return Ok(Some(scripts_path.to_string_lossy().to_string()));
            }
        }
    }
    
    // Rechercher récursivement dans les sous-dossiers
    if let Ok(entries) = fs::read_dir(root) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                
                if path.is_dir() {
                    let dir_name = path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("");
                    
                    // Ignorer les dossiers parasites
                    if should_ignore_dir(dir_name) {
                        continue;
                    }
                    
                    // Vérifier si c'est un dossier scripts
                    if scripts_paths.iter().any(|&s| dir_name == s || dir_name.contains(s)) {
                        if has_shell_scripts(&path) {
                            return Ok(Some(path.to_string_lossy().to_string()));
                        }
                    }
                    
                    // Rechercher récursivement
                    if let Ok(Some(scripts_path)) = detect_scripts_v2(&path, depth + 1) {
                        return Ok(Some(scripts_path));
                    }
                }
            }
        }
    }
    
    // Chercher dans le home directory en dernier recours
    if depth == 0 {
        if let Ok(home) = std::env::var("HOME") {
            let home_scripts = PathBuf::from(home).join("scripts").join("dev-tools");
            if home_scripts.exists() && has_shell_scripts(&home_scripts) {
                return Ok(Some(home_scripts.to_string_lossy().to_string()));
            }
        }
    }
    
    Ok(None)
}

/// Vérifie si un dossier contient des scripts shell (.sh)
fn has_shell_scripts(path: &Path) -> bool {
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if path.is_file() {
                    if let Some(ext) = path.extension() {
                        if ext == "sh" {
                            return true;
                        }
                    }
                }
            }
        }
    }
    false
}

/// Détecte tous les services (tunnel, backend, frontend, netdata)
fn detect_services(
    root: &Path,
    backend_path: &Option<String>,
    frontend_path: &Option<String>,
    scripts_path: &Option<String>,
) -> Result<ProjectServices, String> {
    let scripts = scripts_path.as_ref()
        .map(|p| PathBuf::from(p))
        .unwrap_or_else(|| root.join("scripts"));
    
    // Détecter Tunnel SSH
    let tunnel = detect_tunnel(&scripts)?;
    
    // Détecter Backend
    let backend = if let Some(ref bp) = backend_path {
        detect_backend_service(&PathBuf::from(bp), &scripts)?
    } else {
        None
    };
    
    // Détecter Frontend
    let frontend = if let Some(ref fp) = frontend_path {
        detect_frontend_service(&PathBuf::from(fp), &scripts)?
    } else {
        None
    };
    
    // Netdata est toujours fixe
    let netdata = Some(ProjectCommand {
        start: "netdata-on.sh".to_string(),
        stop: Some("netdata-off.sh".to_string()),
        port: Some(19999),
    });
    
    Ok(ProjectServices {
        tunnel,
        backend,
        frontend,
        netdata,
    })
}

/// Détecte le service Tunnel SSH (v2 - recherche par nom contenant tunnel/ssh)
fn detect_tunnel(scripts_path: &Path) -> Result<Option<ProjectCommand>, String> {
    // Rechercher tous les fichiers .sh dans le dossier scripts
    if let Ok(entries) = fs::read_dir(scripts_path) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                
                if path.is_file() {
                    if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                        let file_name_lower = file_name.to_lowercase();
                        
                        // Un script est tunnel si le nom contient tunnel, ssh, ou dev-tunnel
                        if file_name_lower.contains("tunnel") || 
                           file_name_lower.contains("ssh") ||
                           file_name_lower.contains("dev-tunnel") {
                            
                            // Chercher un script stop correspondant
                            let stop = find_stop_script(scripts_path, file_name);
                            
                            return Ok(Some(ProjectCommand {
                                start: file_name.to_string(),
                                stop,
                                port: None,
                            }));
                        }
                    }
                }
            }
        }
    }
    
    Ok(None)
}

/// Trouve un script stop correspondant à un script start
fn find_stop_script(scripts_path: &Path, start_script: &str) -> Option<String> {
    let start_lower = start_script.to_lowercase();
    
    // Patterns de scripts stop
    let stop_patterns = vec![
        start_lower.replace(".sh", "-off.sh"),
        start_lower.replace(".sh", "-stop.sh"),
        start_lower.replace("tunnel", "tunnel-off"),
        start_lower.replace("ssh", "ssh-off"),
    ];
    
    if let Ok(entries) = fs::read_dir(scripts_path) {
        for entry in entries {
            if let Ok(entry) = entry {
                if let Some(file_name) = entry.path().file_name().and_then(|n| n.to_str()) {
                    let file_name_lower = file_name.to_lowercase();
                    
                    for pattern in &stop_patterns {
                        if file_name_lower.contains(pattern) || file_name_lower == *pattern {
                            return Some(file_name.to_string());
                        }
                    }
                }
            }
        }
    }
    
    None
}

/// Détecte le service Backend avec son port et script
fn detect_backend_service(backend_path: &Path, scripts_path: &Path) -> Result<Option<ProjectCommand>, String> {
    // Détecter le script de démarrage
    let start_scripts = vec![
        "start-dev.sh backend",
        "start-backend.sh",
        "start-payload.sh",
        "dev-backend.sh",
    ];
    
    let mut start_command = None;
    for script in &start_scripts {
        let script_path = scripts_path.join(script.split_whitespace().next().unwrap());
        if script_path.exists() {
            start_command = Some(script.to_string());
            break;
        }
    }
    
    // Si aucun script trouvé, utiliser npm run dev
    let start = start_command.unwrap_or_else(|| "npm run dev".to_string());
    
    // Détecter le port
    let port = detect_backend_port(backend_path)?;
    
    Ok(Some(ProjectCommand {
        start,
        stop: None,
        port,
    }))
}

/// Détecte le port du backend
fn detect_backend_port(backend_path: &Path) -> Result<Option<u16>, String> {
    // 1. Chercher dans .env
    let env_file = backend_path.join(".env");
    if env_file.exists() {
        if let Ok(content) = fs::read_to_string(&env_file) {
            if let Some(port) = extract_port_from_env(&content, vec!["PORT", "BACKEND_PORT", "PAYLOAD_PORT"]) {
                return Ok(Some(port));
            }
        }
    }
    
    // 2. Chercher dans payload.config.ts
    let config_file = backend_path.join("payload.config.ts");
    if config_file.exists() {
        if let Ok(content) = fs::read_to_string(&config_file) {
            if let Some(port) = extract_port_from_regex(&content, r"serverURL.*:(\d+)") {
                return Ok(Some(port));
            }
        }
    }
    
    // 3. Chercher dans package.json
    let package_json = backend_path.join("package.json");
    if package_json.exists() {
        if let Ok(content) = fs::read_to_string(&package_json) {
            if let Some(port) = extract_port_from_regex(&content, r#""dev":\s*"payload[^"]*--port\s+(\d+)"#) {
                return Ok(Some(port));
            }
        }
    }
    
    // Port par défaut pour Payload
    Ok(Some(3010))
}

/// Détecte le service Frontend avec son port et script
fn detect_frontend_service(frontend_path: &Path, scripts_path: &Path) -> Result<Option<ProjectCommand>, String> {
    // Détecter le script de démarrage
    let start_scripts = vec![
        "start-dev.sh frontend",
        "start-frontend.sh",
        "dev-frontend.sh",
    ];
    
    let mut start_command = None;
    for script in &start_scripts {
        let script_path = scripts_path.join(script.split_whitespace().next().unwrap());
        if script_path.exists() {
            start_command = Some(script.to_string());
            break;
        }
    }
    
    // Si aucun script trouvé, utiliser next dev
    let start = start_command.unwrap_or_else(|| "next dev".to_string());
    
    // Détecter le port
    let port = detect_frontend_port(frontend_path)?;
    
    Ok(Some(ProjectCommand {
        start,
        stop: None,
        port,
    }))
}

/// Détecte le port du frontend
fn detect_frontend_port(frontend_path: &Path) -> Result<Option<u16>, String> {
    // 1. Chercher dans .env.local
    let env_file = frontend_path.join(".env.local");
    if env_file.exists() {
        if let Ok(content) = fs::read_to_string(&env_file) {
            if let Some(port) = extract_port_from_env(&content, vec!["PORT", "NEXT_PORT"]) {
                return Ok(Some(port));
            }
        }
    }
    
    // 2. Chercher dans next.config.js
    let config_file = frontend_path.join("next.config.js");
    if config_file.exists() {
        if let Ok(content) = fs::read_to_string(&config_file) {
            if let Some(port) = extract_port_from_regex(&content, r"port:\s*(\d+)") {
                return Ok(Some(port));
            }
        }
    }
    
    // 3. Chercher dans package.json
    let package_json = frontend_path.join("package.json");
    if package_json.exists() {
        if let Ok(content) = fs::read_to_string(&package_json) {
            if let Some(port) = extract_port_from_regex(&content, r#""dev":\s*"next dev[^"]*-p\s+(\d+)"#) {
                return Ok(Some(port));
            }
        }
    }
    
    // Port par défaut pour Next.js
    Ok(Some(3000))
}

/// Extrait un port depuis un fichier .env
fn extract_port_from_env(content: &str, keys: Vec<&str>) -> Option<u16> {
    for line in content.lines() {
        for key in &keys {
            if let Some(pos) = line.find(&format!("{}=", key)) {
                let value = &line[pos + key.len() + 1..];
                let value = value.trim().split('#').next().unwrap_or(value).trim();
                if let Ok(port) = value.parse::<u16>() {
                    return Some(port);
                }
            }
        }
    }
    None
}

/// Extrait un port depuis une regex
fn extract_port_from_regex(content: &str, pattern: &str) -> Option<u16> {
    let re = Regex::new(pattern).ok()?;
    if let Some(captures) = re.captures(content) {
        if let Some(port_str) = captures.get(1) {
            return port_str.as_str().parse::<u16>().ok();
        }
    }
    None
}

