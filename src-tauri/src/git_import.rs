use std::path::PathBuf;
use std::process::Command;

/// Clone un dépôt Git dans le dossier cible
#[tauri::command]
pub async fn clone_git_repo(url: String, target_dir: Option<String>) -> Result<String, String> {
    // Déterminer le dossier cible
    let target = if let Some(dir) = target_dir {
        PathBuf::from(dir)
    } else {
        // Par défaut : ~/CascadeProjects/
        let home = std::env::var("HOME").map_err(|_| "HOME environment variable not set")?;
        PathBuf::from(home).join("CascadeProjects")
    };

    // Créer le dossier s'il n'existe pas
    if !target.exists() {
        std::fs::create_dir_all(&target)
            .map_err(|e| format!("Failed to create target directory: {}", e))?;
    }

    // Nettoyer l'URL (supprimer les espaces avant/après et normaliser)
    let mut cleaned_url = url.trim().to_string();
    
    // Supprimer les espaces multiples et s'assurer qu'il n'y a pas d'espace avant le protocole
    cleaned_url = cleaned_url.replace(" https://", "https://")
        .replace(" http://", "http://")
        .replace(" git@", "git@")
        .replace(" ssh://", "ssh://");
    cleaned_url = cleaned_url.trim().to_string();
    
    // Vérifier que l'URL est valide
    if cleaned_url.is_empty() {
        return Err("URL Git vide".to_string());
    }
    
    // Vérifier que l'URL commence par un protocole valide
    if !cleaned_url.starts_with("https://") 
        && !cleaned_url.starts_with("http://")
        && !cleaned_url.starts_with("git@")
        && !cleaned_url.starts_with("ssh://") {
        return Err(format!("URL Git invalide: doit commencer par https://, http://, git@ ou ssh://. Reçu: '{}'", cleaned_url));
    }

    // Extraire le nom du projet depuis l'URL Git
    let project_name = extract_project_name_from_url(&cleaned_url)?;
    let project_path = target.join(&project_name);

    // Vérifier si le projet existe déjà
    if project_path.exists() {
        return Err(format!(
            "Project '{}' already exists at {}",
            project_name,
            project_path.display()
        ));
    }

    // Cloner le dépôt avec depth=1 (shallow clone)
    let output = Command::new("git")
        .arg("clone")
        .arg("--depth")
        .arg("1")
        .arg(&cleaned_url)
        .arg(&project_path)
        .output()
        .map_err(|e| {
            format!(
                "Failed to execute git clone: {}. Make sure git is installed.",
                e
            )
        })?;

    if !output.status.success() {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Git clone failed: {}", error_msg));
    }

    Ok(project_path.to_string_lossy().to_string())
}

/// Met à jour un dépôt Git existant (git pull)
#[tauri::command]
pub async fn pull_git_repo(project_path: String) -> Result<String, String> {
    let path = PathBuf::from(&project_path);
    
    // Vérifier que le répertoire existe
    if !path.exists() {
        return Err(format!("Répertoire introuvable: {}", project_path));
    }
    
    // Vérifier que c'est un dépôt Git
    let git_dir = path.join(".git");
    if !git_dir.exists() {
        return Err(format!("Ce n'est pas un dépôt Git: {}", project_path));
    }
    
    // Exécuter git pull
    let output = Command::new("git")
        .arg("pull")
        .current_dir(&path)
        .output()
        .map_err(|e| {
            format!(
                "Failed to execute git pull: {}. Make sure git is installed.",
                e
            )
        })?;
    
    if !output.status.success() {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Git pull failed: {}", error_msg));
    }
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(stdout.to_string())
}

/// Extrait le nom du projet depuis une URL Git
fn extract_project_name_from_url(url: &str) -> Result<String, String> {
    let mut url = url.trim().to_string();

    // Supprimer les protocoles (https://, http://, git@, ssh://)
    if url.starts_with("https://") {
        url = url[8..].to_string();
    } else if url.starts_with("http://") {
        url = url[7..].to_string();
    } else if url.starts_with("git@") {
        // Format: git@github.com:user/repo.git
        if let Some(colon_pos) = url.find(':') {
            url = url[colon_pos + 1..].to_string();
        } else {
            return Err("Invalid Git URL format (git@)".to_string());
        }
    } else if url.starts_with("ssh://") {
        url = url[6..].to_string();
    }

    // Supprimer le domaine et le chemin jusqu'au dernier /
    let parts: Vec<&str> = url.split('/').collect();
    if parts.is_empty() {
        return Err("Invalid Git URL format".to_string());
    }

    // Prendre la dernière partie (nom du repo)
    let repo_name = parts.last().unwrap().trim_end_matches(".git");

    if repo_name.is_empty() {
        return Err("Invalid Git URL format: empty repository name".to_string());
    }

    // Formater le nom : gestionmaxops -> "GestionMax Ops"
    let formatted_name = format_project_name(repo_name);

    Ok(formatted_name)
}

/// Formate un nom de projet (ex: "gestionmaxops" -> "GestionMax Ops")
fn format_project_name(name: &str) -> String {
    // Remplacer les tirets et underscores par des espaces
    let name = name.replace("-", " ").replace("_", " ");

    // Capitaliser chaque mot
    name.split_whitespace()
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_project_name() {
        assert_eq!(
            extract_project_name_from_url("https://github.com/user/gestionmaxops.git").unwrap(),
            "Gestionmaxops"
        );
        assert_eq!(
            extract_project_name_from_url("git@github.com:user/gestionmax-ops.git").unwrap(),
            "Gestionmax Ops"
        );
    }
}
