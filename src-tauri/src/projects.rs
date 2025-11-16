use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectConfig {
    pub projects: Vec<Project>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub name: String,
    pub backend_path: String,
    pub frontend_path: String,
    pub scripts_path: String,
    pub services: ProjectServices,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectServices {
    pub tunnel: Option<ProjectCommand>,
    pub backend: Option<ProjectCommand>,
    pub frontend: Option<ProjectCommand>,
    pub netdata: Option<ProjectCommand>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectCommand {
    pub start: String,
    pub stop: Option<String>,
    pub port: Option<u16>,
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

/// Charge la configuration des projets depuis le fichier JSON
#[tauri::command]
pub async fn load_projects() -> Result<ProjectConfig, String> {
    let config_path = get_projects_config_path()?;
    
    // Si le fichier n'existe pas, créer un fichier vide
    if !config_path.exists() {
        let empty_config = ProjectConfig {
            projects: Vec::new(),
        };
        let json = serde_json::to_string_pretty(&empty_config)
            .map_err(|e| format!("Failed to serialize empty config: {}", e))?;
        fs::write(&config_path, json)
            .map_err(|e| format!("Failed to create projects.json: {}", e))?;
        return Ok(empty_config);
    }
    
    // Lire le fichier
    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read projects.json: {}", e))?;
    
    // Vérifier si le fichier est vide ou ne contient que des espaces
    let trimmed = content.trim();
    if trimmed.is_empty() {
        // Fichier vide, créer une configuration vide
        let empty_config = ProjectConfig {
            projects: Vec::new(),
        };
        let json = serde_json::to_string_pretty(&empty_config)
            .map_err(|e| format!("Failed to serialize empty config: {}", e))?;
        fs::write(&config_path, json)
            .map_err(|e| format!("Failed to write projects.json: {}", e))?;
        return Ok(empty_config);
    }
    
    // Parser le JSON
    let config: ProjectConfig = match serde_json::from_str(&content) {
        Ok(config) => config,
        Err(e) => {
            // Si le parsing échoue, vérifier si c'est un ancien format (tableau vide)
            if trimmed == "[]" {
                // Ancien format, migrer vers le nouveau format
                let empty_config = ProjectConfig {
                    projects: Vec::new(),
                };
                let json = serde_json::to_string_pretty(&empty_config)
                    .map_err(|e| format!("Failed to serialize empty config: {}", e))?;
                fs::write(&config_path, json)
                    .map_err(|e| format!("Failed to write projects.json: {}", e))?;
                return Ok(empty_config);
            }
            return Err(format!("Failed to parse projects.json: {}. File content: {}", e, content));
        }
    };
    
    Ok(config)
}

/// Sauvegarde la configuration des projets dans le fichier JSON
#[tauri::command]
pub async fn save_projects(config: ProjectConfig) -> Result<(), String> {
    let config_path = get_projects_config_path()?;
    
    // Sérialiser en JSON avec indentation
    let json = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    
    // Écrire dans le fichier
    fs::write(&config_path, json)
        .map_err(|e| format!("Failed to write projects.json: {}", e))?;
    
    Ok(())
}

/// Ajoute un nouveau projet à la configuration
#[tauri::command]
pub async fn add_project(project: Project) -> Result<(), String> {
    let mut config = load_projects().await?;
    
    // Vérifier si un projet avec le même nom existe déjà
    if config.projects.iter().any(|p| p.name == project.name) {
        return Err(format!("A project with the name '{}' already exists", project.name));
    }
    
    config.projects.push(project);
    save_projects(config).await
}

/// Met à jour un projet existant
#[tauri::command]
pub async fn update_project(project: Project) -> Result<(), String> {
    let mut config = load_projects().await?;
    
    // Trouver l'index du projet
    let index = config.projects
        .iter()
        .position(|p| p.name == project.name)
        .ok_or_else(|| format!("Project '{}' not found", project.name))?;
    
    config.projects[index] = project;
    save_projects(config).await
}

/// Supprime un projet de la configuration
#[tauri::command]
pub async fn delete_project(project_name: String) -> Result<(), String> {
    let mut config = load_projects().await?;
    
    // Trouver l'index du projet
    let index = config.projects
        .iter()
        .position(|p| p.name == project_name)
        .ok_or_else(|| format!("Project '{}' not found", project_name))?;
    
    config.projects.remove(index);
    save_projects(config).await
}

