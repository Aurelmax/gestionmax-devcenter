use serde::{Deserialize, Serialize};

use std::{fs, path::PathBuf};

use tauri::command;

use crate::autoscan::ProjectV3;

const FILE_NAME: &str = "projects-v3.json";

// Resolve ~/.gestionmax-devcenter/projects-v3.json
fn config_file_path() -> PathBuf {
    let mut path = dirs::home_dir().unwrap();
    path.push(".gestionmax-devcenter");
    fs::create_dir_all(&path).ok();
    path.push(FILE_NAME);
    path
}

#[derive(Serialize, Deserialize, Default)]
pub struct ProjectConfigV3 {
    pub projects: Vec<ProjectV3>,
}

#[command]
pub async fn load_projects_v3() -> Result<ProjectConfigV3, String> {
    let path = config_file_path();

    if !path.exists() {
        return Ok(ProjectConfigV3::default());
    }

    let text = fs::read_to_string(&path).map_err(|e| format!("Failed to read V3 config: {e}"))?;

    let cfg: ProjectConfigV3 =
        serde_json::from_str(&text).map_err(|e| format!("Invalid V3 JSON: {e}"))?;

    Ok(cfg)
}

#[command]
pub async fn save_projects_v3(config: ProjectConfigV3) -> Result<(), String> {
    let path = config_file_path();

    let text = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize V3 JSON: {e}"))?;

    fs::write(&path, text).map_err(|e| format!("Failed to write V3 config: {e}"))?;

    Ok(())
}
