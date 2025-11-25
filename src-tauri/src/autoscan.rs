#![allow(dead_code)]
#![allow(non_snake_case)]

use chrono::Utc;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

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
    IGNORE_DIRS
        .iter()
        .any(|&ignore| dir_name == ignore || dir_name.starts_with(ignore))
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScanScript {
    pub start: String,
    pub stop: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NetdataScript {
    pub start: String,
    pub stop: Option<String>,
    pub port: u16,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectScanScripts {
    pub tunnel: Option<ScanScript>,
    pub backend: Option<ScanScript>,
    pub frontend: Option<ScanScript>,
    pub netdata: NetdataScript,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Ports {
    pub backend: u16,
    pub frontend: u16,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct ProjectEnvironment {
    #[serde(default)]
    pub backend_env: BTreeMap<String, String>,
    #[serde(default)]
    pub frontend_env: BTreeMap<String, String>,
}

#[allow(dead_code, non_snake_case)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tunnel {
    pub enabled: bool,
    pub host: String,
    pub user: String,
    pub port: u16,
    #[serde(rename = "privateKey")]
    pub private_key: String,
    #[serde(rename = "localMongo")]
    pub local_mongo: u16,
    #[serde(rename = "remoteMongo")]
    pub remote_mongo: u16,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectCommands {
    pub backend: Option<String>,
    pub frontend: Option<String>,
    pub tunnel: Option<String>,
    pub netdata: Option<String>,
}

#[allow(dead_code, non_snake_case)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectServiceConfig {
    pub start: Option<String>,
    pub stop: Option<String>,
    pub port: Option<u16>,
}

#[allow(dead_code, non_snake_case)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectV3 {
    pub id: String,
    pub name: String,

    #[serde(rename = "rootPath")]
    pub root_path: String,
    #[serde(rename = "backendPath")]
    pub backend_path: String,
    #[serde(rename = "frontendPath")]
    pub frontend_path: String,

    pub ports: Ports,

    #[serde(default)]
    pub environment: Option<ProjectEnvironment>,

    pub tunnel: Option<Tunnel>,

    #[serde(default)]
    pub backend: Option<ProjectServiceConfig>,

    #[serde(default)]
    pub frontend: Option<ProjectServiceConfig>,

    #[serde(rename = "commands")]
    #[serde(default)]
    pub commands: Option<ProjectCommands>,

    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectScanResult {
    pub name: String,
    pub backend_path: Option<String>,
    pub backend_port: Option<u16>,
    pub backend_start: Option<String>,
    pub backend_stop: Option<String>,
    pub frontend_path: Option<String>,
    pub frontend_port: Option<u16>,
    pub frontend_start: Option<String>,
    pub frontend_stop: Option<String>,
    pub scripts_path: Option<String>,
    pub scripts: ProjectScanScripts,
    pub warnings: Vec<String>,
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
        .map_err(|e| {
            format!(
                "Failed to open file picker: {}. Install zenity: sudo apt install zenity",
                e
            )
        })?;

    if !output.status.success() {
        return Err("File picker cancelled".to_string());
    }

    let path =
        String::from_utf8(output.stdout).map_err(|e| format!("Failed to parse path: {}", e))?;

    Ok(path.trim().to_string())
}

/// Détecte automatiquement la structure d'un projet (AutoScan v2 - Monorepo)
#[tauri::command]
pub async fn autoscan_project(root_path: String) -> Result<ProjectScanResult, String> {
    let root = PathBuf::from(&root_path);

    if !root.exists() {
        return Err(format!("Path does not exist: {}", root_path));
    }

    let mut warnings = Vec::new();

    let project_name = format_project_name(
        root.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Projet"),
    );

    let backend_path = detect_backend_v2(&root, 0)?;
    if backend_path.is_none() {
        warnings.push("Backend Payload non détecté".to_string());
    }
    let backend_port = match backend_path.as_ref() {
        Some(path) => detect_backend_port(Path::new(path))?.or(Some(3010)),
        None => None,
    };

    let frontend_path = detect_frontend_v2(&root, 0)?;
    if frontend_path.is_none() {
        warnings.push("Frontend Next.js non détecté".to_string());
    }
    let frontend_port = match frontend_path.as_ref() {
        Some(path) => detect_frontend_port(Path::new(path))?.or(Some(3000)),
        None => None,
    };

    let scripts_detection = detect_scripts_info(&root)?;
    if scripts_detection.path.is_none() {
        warnings.push("Dossier scripts non détecté (scripts/)".to_string());
    }
    warnings.extend(scripts_detection.warnings.clone());

    let backend_start = scripts_detection
        .scripts
        .backend
        .as_ref()
        .map(|s| s.start.clone());
    let backend_stop = scripts_detection
        .scripts
        .backend
        .as_ref()
        .and_then(|s| s.stop.clone());
    let frontend_start = scripts_detection
        .scripts
        .frontend
        .as_ref()
        .map(|s| s.start.clone());
    let frontend_stop = scripts_detection
        .scripts
        .frontend
        .as_ref()
        .and_then(|s| s.stop.clone());

    Ok(ProjectScanResult {
        name: project_name,
        backend_path,
        backend_port,
        backend_start,
        backend_stop,
        frontend_path,
        frontend_port,
        frontend_start,
        frontend_stop,
        scripts_path: scripts_detection.path,
        scripts: scripts_detection.scripts,
        warnings,
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
                    let dir_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");

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
                let dir_name = root.file_name().and_then(|n| n.to_str()).unwrap_or("");

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
                    let dir_name = root.file_name().and_then(|n| n.to_str()).unwrap_or("");

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
                    let dir_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");

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
    let scripts_paths = vec!["scripts", "tools", "dev"];

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
                    let dir_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");

                    // Ignorer les dossiers parasites
                    if should_ignore_dir(dir_name) {
                        continue;
                    }

                    // Vérifier si c'est un dossier scripts
                    if scripts_paths
                        .iter()
                        .any(|&s| dir_name == s || dir_name.contains(s))
                    {
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

struct ScriptsDetection {
    path: Option<String>,
    scripts: ProjectScanScripts,
    warnings: Vec<String>,
}

const TUNNEL_START_CANDIDATES: &[&str] = &[
    "tunnel-on.sh",
    "tunnel.sh",
    "ssh-tunnel.sh",
    "dev-tunnel.sh",
];
const TUNNEL_STOP_CANDIDATES: &[&str] = &["tunnel-off.sh", "tunnel-stop.sh", "ssh-tunnel-off.sh"];
const BACKEND_START_CANDIDATES: &[&str] = &[
    "backend-on.sh",
    "start-backend.sh",
    "start-payload.sh",
    "start-dev-backend.sh",
];
const BACKEND_STOP_CANDIDATES: &[&str] = &["backend-off.sh", "stop-backend.sh"];
const FRONTEND_START_CANDIDATES: &[&str] = &[
    "frontend-on.sh",
    "start-frontend.sh",
    "start-web.sh",
    "start-dev-frontend.sh",
];
const FRONTEND_STOP_CANDIDATES: &[&str] = &["frontend-off.sh", "stop-frontend.sh"];

fn detect_scripts_info(root: &Path) -> Result<ScriptsDetection, String> {
    let scripts_path = detect_scripts_v2(root, 0)?;
    let mut warnings = Vec::new();

    let tunnel = scripts_path.as_ref().and_then(|path| {
        detect_script_pair(
            Path::new(path),
            TUNNEL_START_CANDIDATES,
            TUNNEL_STOP_CANDIDATES,
        )
    });
    if tunnel.is_none() {
        warnings.push("Scripts tunnel (tunnel-on/off.sh) non détectés".to_string());
    }

    let backend = scripts_path.as_ref().and_then(|path| {
        detect_script_pair(
            Path::new(path),
            BACKEND_START_CANDIDATES,
            BACKEND_STOP_CANDIDATES,
        )
    });
    if backend.is_none() {
        warnings.push("Scripts backend (backend-on/off.sh) non détectés".to_string());
    }

    let frontend = scripts_path.as_ref().and_then(|path| {
        detect_script_pair(
            Path::new(path),
            FRONTEND_START_CANDIDATES,
            FRONTEND_STOP_CANDIDATES,
        )
    });
    if frontend.is_none() {
        warnings.push("Scripts frontend (frontend-on/off.sh) non détectés".to_string());
    }

    let scripts = ProjectScanScripts {
        tunnel,
        backend,
        frontend,
        netdata: NetdataScript {
            start: "netdata-on.sh".to_string(),
            stop: Some("netdata-off.sh".to_string()),
            port: 19999,
        },
    };

    Ok(ScriptsDetection {
        path: scripts_path,
        scripts,
        warnings,
    })
}

fn detect_script_pair(
    dir: &Path,
    start_candidates: &[&str],
    stop_candidates: &[&str],
) -> Option<ScanScript> {
    if !dir.exists() {
        return None;
    }

    let start = find_script(dir, start_candidates)?;
    let stop = find_script(dir, stop_candidates);

    Some(ScanScript { start, stop })
}

fn find_script(dir: &Path, candidates: &[&str]) -> Option<String> {
    let mut files = Vec::new();
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            if let Some(name) = entry.file_name().to_str() {
                if entry.path().is_file() && name.ends_with(".sh") {
                    files.push(name.to_string());
                }
            }
        }
    }

    if files.is_empty() {
        return None;
    }

    for candidate in candidates {
        if let Some(found) = files
            .iter()
            .find(|name| name.eq_ignore_ascii_case(candidate))
        {
            return Some(found.clone());
        }
    }

    let lower_candidates: Vec<String> = candidates.iter().map(|c| c.to_lowercase()).collect();
    for name in &files {
        let lower = name.to_lowercase();
        if lower_candidates.iter().any(|cand| lower.contains(cand)) {
            return Some(name.clone());
        }
    }

    None
}

/// Détecte le port du backend
fn detect_backend_port(backend_path: &Path) -> Result<Option<u16>, String> {
    // 1. Chercher dans .env
    let env_file = backend_path.join(".env");
    if env_file.exists() {
        if let Ok(content) = fs::read_to_string(&env_file) {
            if let Some(port) =
                extract_port_from_env(&content, vec!["PORT", "BACKEND_PORT", "PAYLOAD_PORT"])
            {
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
            if let Some(port) =
                extract_port_from_regex(&content, r#""dev":\s*"payload[^"]*--port\s+(\d+)"#)
            {
                return Ok(Some(port));
            }
        }
    }

    // Port par défaut pour Payload
    Ok(Some(3010))
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
            if let Some(port) =
                extract_port_from_regex(&content, r#""dev":\s*"next dev[^"]*-p\s+(\d+)"#)
            {
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

fn format_project_name(name: &str) -> String {
    let normalized = name.replace(['-', '_'], " ");
    normalized
        .split_whitespace()
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

// ─────────────────────────────────────────────
//   V3 Project Autoscan
// ─────────────────────────────────────────────

#[allow(dead_code)]
#[tauri::command]
pub async fn autoscan_project_v3(root_path: String) -> Result<ProjectV3, String> {
    let root = PathBuf::from(&root_path);

    if !root.exists() {
        return Err("Root path does not exist".into());
    }

    let name = root
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Project")
        .to_string();

    let backend = ["backend", "back", "api"]
        .iter()
        .map(|d| root.join(d))
        .find(|p| p.exists());

    let frontend = ["frontend", "front", "web", "app"]
        .iter()
        .map(|d| root.join(d))
        .find(|p| p.exists());

    let _warnings = {
        let mut w = Vec::new();
        if backend.is_none() {
            w.push("Backend not found".to_string());
        }
        if frontend.is_none() {
            w.push("Frontend not found".to_string());
        }
        w
    };

    Ok(ProjectV3 {
        id: name.clone(),
        name,
        root_path,
        backend_path: backend
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default(),
        frontend_path: frontend
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default(),
        ports: Ports {
            backend: 3010,
            frontend: 3000,
        },
        tunnel: None,
        environment: None,
        backend: None,
        frontend: None,
        commands: None,
        created_at: Utc::now().to_rfc3339(),
    })
}
